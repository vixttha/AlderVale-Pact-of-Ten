use aldervale_glb_checks::{Check, Glb};
use serde_json::{Value, json};
use std::{fs, path::Path};

const MODEL_DIRECTORY: &str = "../../../public/models";
const FIXTURE_JOINTS: usize = 32;
const FIXTURE_MATRICES: usize = 72;
const FIXTURE_TIMES: usize = 136;

fn with_game_asset(name: &str, check: impl FnOnce(&Glb<'_>) -> Check) -> Check {
    let path = Path::new(env!("CARGO_MANIFEST_DIR"))
        .join(MODEL_DIRECTORY)
        .join(name);
    let bytes = fs::read(&path).map_err(|err| format!("{}: {err}", path.display()))?;
    let asset = Glb::parse(&bytes).map_err(|err| format!("{name}: {err}"))?;
    check(&asset).map_err(|err| format!("{name}: {err}"))
}

fn positive_count(count: usize, label: &str) -> Check {
    if count == 0 {
        return Err(format!("expected the asset to exercise {label}"));
    }
    Ok(())
}

// Small skinned mesh with interleaved vertex positions and a cubic translation.
// Each test changes one input and checks the diagnostic from the same code used for Rowan.
fn fixture() -> (Value, Vec<u8>) {
    let json = json!({
        "asset": {"version": "2.0"},
        "scene": 0,
        "scenes": [{"nodes": [0, 1]}],
        "buffers": [{"byteLength": 216}],
        "bufferViews": [
            {"buffer": 0, "byteLength": 32, "byteStride": 16},
            {"buffer": 0, "byteOffset": 32, "byteLength": 8},
            {"buffer": 0, "byteOffset": 40, "byteLength": 32},
            {"buffer": 0, "byteOffset": 72, "byteLength": 64},
            {"buffer": 0, "byteOffset": 136, "byteLength": 8},
            {"buffer": 0, "byteOffset": 144, "byteLength": 72}
        ],
        "accessors": [
            {"bufferView": 0, "componentType": 5126, "type": "VEC3", "count": 2, "min": [0, 0, 0], "max": [1, 0, 0]},
            {"bufferView": 1, "componentType": 5121, "type": "VEC4", "count": 2},
            {"bufferView": 2, "componentType": 5126, "type": "VEC4", "count": 2},
            {"bufferView": 3, "componentType": 5126, "type": "MAT4", "count": 1},
            {"bufferView": 4, "componentType": 5126, "type": "SCALAR", "count": 2, "min": [0], "max": [1]},
            {"bufferView": 5, "componentType": 5126, "type": "VEC3", "count": 6}
        ],
        "meshes": [{"primitives": [{
            "mode": 0,
            "attributes": {"POSITION": 0, "JOINTS_0": 1, "WEIGHTS_0": 2}
        }]}],
        "nodes": [{"mesh": 0, "skin": 0}, {}],
        "skins": [{"joints": [1], "inverseBindMatrices": 3}],
        "animations": [{
            "samplers": [{"input": 4, "output": 5, "interpolation": "CUBICSPLINE"}],
            "channels": [{"sampler": 0, "target": {"node": 1, "path": "translation"}}]
        }]
    });
    let mut binary = vec![0; 216];
    float_at(&mut binary, 16, 1.0);
    for i in [40, 56, FIXTURE_TIMES + 4] {
        float_at(&mut binary, i, 1.0);
    }
    for i in 0..4 {
        float_at(&mut binary, FIXTURE_MATRICES + i * 20, 1.0);
    }
    (json, binary)
}

fn float_at(binary: &mut [u8], offset: usize, value: f32) {
    binary[offset..offset + 4].copy_from_slice(&value.to_le_bytes());
}

fn fixture_glb(json: &Value, binary: &[u8]) -> Vec<u8> {
    let mut json = serde_json::to_vec(json).expect("fixture JSON");
    json.resize(json.len().next_multiple_of(4), b' ');
    let mut binary = binary.to_vec();
    binary.resize(binary.len().next_multiple_of(4), 0);
    let length = 12 + 8 + json.len() + 8 + binary.len();
    let mut bytes = Vec::with_capacity(length);
    bytes.extend_from_slice(b"glTF");
    bytes.extend_from_slice(&2_u32.to_le_bytes());
    bytes.extend_from_slice(&(length as u32).to_le_bytes());
    for (tag, chunk) in [(b"JSON", json), (b"BIN\0", binary)] {
        bytes.extend_from_slice(&(chunk.len() as u32).to_le_bytes());
        bytes.extend_from_slice(tag);
        bytes.extend_from_slice(&chunk);
    }
    bytes
}

fn rejects<T>(outcome: Check<T>, message: &str) {
    match outcome {
        Ok(_) => panic!("corrupted fixture passed. Expected {message:?}"),
        Err(actual) => assert!(actual.contains(message), "expected {message:?}, got {actual:?}"),
    }
}

#[test]
fn g21_003_buffer_views_stay_inside_the_declared_bin() -> Check {
    for name in ["exported-model.glb", "rowan-prototype.glb"] {
        with_game_asset(name, |asset| asset.check_buffer_views())?;
    }
    let (mut json, binary) = fixture();
    let good = fixture_glb(&json, &binary);
    Glb::parse(&good)?.check_buffer_views()?;
    rejects(Glb::parse(&good[..good.len() - 1]), "file length");

    json["bufferViews"][0]["byteOffset"] = json!(214);
    let broken = fixture_glb(&json, &binary);
    rejects(Glb::parse(&broken)?.check_buffer_views(), "beyond 216");

    json["bufferViews"][0]["byteOffset"] = json!(u64::MAX);
    let overflow = fixture_glb(&json, &binary);
    rejects(Glb::parse(&overflow)?.check_buffer_views(), "overflowing byte range");
    Ok(())
}

#[test]
fn g21_004_mesh_accessors_use_their_declared_stride_and_bounds() -> Check {
    for name in ["exported-model.glb", "rowan-prototype.glb"] {
        with_game_asset(name, |asset| asset.check_mesh_accessors())?;
    }
    let (mut json, binary) = fixture();
    let good = fixture_glb(&json, &binary);
    Glb::parse(&good)?.check_mesh_accessors()?;

    json["bufferViews"][0]["byteLength"] = json!(27);
    let broken = fixture_glb(&json, &binary);
    rejects(Glb::parse(&broken)?.check_mesh_accessors(), "byte range ends at 28");

    json["bufferViews"][0]["byteLength"] = json!(32);
    json["bufferViews"][0]["byteStride"] = json!(8);
    let invalid_stride = fixture_glb(&json, &binary);
    rejects(Glb::parse(&invalid_stride)?.check_mesh_accessors(), "smaller than one accessor element");
    Ok(())
}

#[test]
fn g21_005_vertex_joint_indices_reference_the_assigned_skin() -> Check {
    with_game_asset("exported-model.glb", |asset| {
        positive_count(asset.check_vertex_joint_indices()?, "skinned primitives")
    })?;
    let (json, mut binary) = fixture();
    let good = fixture_glb(&json, &binary);
    assert_eq!(Glb::parse(&good)?.check_vertex_joint_indices()?, 1);

    binary[FIXTURE_JOINTS] = 1;
    let broken = fixture_glb(&json, &binary);
    rejects(Glb::parse(&broken)?.check_vertex_joint_indices(), "vertex 0: joint 1");
    Ok(())
}

#[test]
fn g21_006_inverse_bind_matrices_cover_the_rig_and_are_finite() -> Check {
    with_game_asset("exported-model.glb", |asset| {
        positive_count(asset.check_inverse_bind_matrices()?, "inverse bind matrices")
    })?;
    let (mut json, mut binary) = fixture();
    let good = fixture_glb(&json, &binary);
    assert_eq!(Glb::parse(&good)?.check_inverse_bind_matrices()?, 1);

    json["skins"][0]["joints"] = json!([0, 1]);
    let short = fixture_glb(&json, &binary);
    rejects(Glb::parse(&short)?.check_inverse_bind_matrices(), "MAT4 for each joint");

    json["skins"][0]["joints"] = json!([1]);
    float_at(&mut binary, FIXTURE_MATRICES, f32::INFINITY);
    let nonfinite = fixture_glb(&json, &binary);
    rejects(Glb::parse(&nonfinite)?.check_inverse_bind_matrices(), "non-finite inverse bind");
    Ok(())
}

#[test]
fn g21_007_animation_samplers_enforce_time_order_and_interpolation_shape() -> Check {
    with_game_asset("exported-model.glb", |asset| {
        positive_count(asset.check_animation_samplers()?, "animation channels")
    })?;
    let (mut json, mut binary) = fixture();
    let good = fixture_glb(&json, &binary);
    assert_eq!(Glb::parse(&good)?.check_animation_samplers()?, 1);

    json["accessors"][5]["count"] = json!(5);
    let short = fixture_glb(&json, &binary);
    rejects(Glb::parse(&short)?.check_animation_samplers(), "count does not match");

    json["accessors"][5]["count"] = json!(6);
    float_at(&mut binary, FIXTURE_TIMES + 4, 0.0);
    let duplicate = fixture_glb(&json, &binary);
    rejects(Glb::parse(&duplicate)?.check_animation_samplers(), "strictly increasing");
    Ok(())
}
