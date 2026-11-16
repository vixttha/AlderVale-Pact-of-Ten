use crate::accessor::unsigned;
use crate::glb::{array, at, field, uint};
use crate::{Check, Glb};
use serde_json::Value;
use std::collections::BTreeSet;

fn optional_array<'a>(value: &'a Value, name: &str) -> Check<&'a [Value]> {
    if value.get(name).is_some() {
        array(value, name)
    } else {
        Ok(&[])
    }
}

impl Glb<'_> {
    pub fn check_vertex_joint_indices(&self) -> Check<usize> {
        let mut checked = 0;
        for (node_index, node) in optional_array(&self.json, "nodes")?.iter().enumerate() {
            let Some(skin) = node.get("skin") else { continue };
            let skin = at(&self.json, "skins", uint(skin)?)?;
            let joint_count = array(skin, "joints")?.len();
            if joint_count == 0 {
                return Err(format!("nodes[{node_index}] references a skin without joints"));
            }
            let mesh = at(&self.json, "meshes", field(node, "mesh")?)?;
            for (primitive_index, primitive) in array(mesh, "primitives")?.iter().enumerate() {
                self.check_primitive_joints(primitive, joint_count)
                    .map_err(|err| format!("nodes[{node_index}].mesh.primitives[{primitive_index}]: {err}"))?;
                checked += 1;
            }
        }
        Ok(checked)
    }

    fn check_primitive_joints(&self, primitive: &Value, joint_count: usize) -> Check {
        let attributes = primitive["attributes"].as_object().ok_or("expected mesh attributes")?;
        if !attributes.contains_key("JOINTS_0") {
            return Err("skinned primitive is missing JOINTS_0".into());
        }

        for (name, index) in attributes {
            let Some(set) = name.strip_prefix("JOINTS_") else { continue };
            let joints = self.accessor(uint(index)?)?;
            if joints.shape != "VEC4" || joints.normalized || !matches!(joints.component, 5121 | 5123) {
                return Err(format!("{name}: expected unnormalized unsigned VEC4"));
            }
            let weights = self.accessor(uint(attributes.get(&format!("WEIGHTS_{set}"))
                .ok_or_else(|| format!("{name}: missing corresponding weights"))?)?)?;
            if joints.count != weights.count || weights.shape != "VEC4" {
                return Err(format!("{name}: weights do not match joint vectors"));
            }
            let width = if joints.component == 5121 { 1 } else { 2 };
            for (vertex, element) in joints.elements().enumerate() {
                for component in element.chunks_exact(width).take(4) {
                    let joint = unsigned(component, joints.component)? as usize;
                    if joint >= joint_count {
                        return Err(format!("{name} vertex {vertex}: joint {joint} is outside skin with {joint_count} joints"));
                    }
                }
            }
        }
        Ok(())
    }

    pub fn check_inverse_bind_matrices(&self) -> Check<usize> {
        let mut checked = 0;
        for (index, skin) in optional_array(&self.json, "skins")?.iter().enumerate() {
            let joints = array(skin, "joints")?;
            let joint_nodes: BTreeSet<_> = joints.iter().map(uint).collect::<Check<_>>()?;
            if joints.is_empty() || joint_nodes.len() != joints.len() {
                return Err(format!("skins[{index}]: expected nonempty, unique joint nodes"));
            }
            for joint in joint_nodes {
                at(&self.json, "nodes", joint)?;
            }
            let Some(inverse_bind) = skin.get("inverseBindMatrices") else { continue };
            let accessor = self.accessor(uint(inverse_bind)?)?;
            // glTF permits extra matrices, and uses identity when the field is absent.
            if accessor.shape != "MAT4" || accessor.component != 5126 || accessor.normalized
                || accessor.count < joints.len()
            {
                return Err(format!("skins[{index}]: expected a float MAT4 for each joint"));
            }
            if !accessor.floats().all(f32::is_finite) {
                return Err(format!("skins[{index}]: non-finite inverse bind matrix"));
            }
            checked += 1;
        }
        Ok(checked)
    }

    pub fn check_animation_samplers(&self) -> Check<usize> {
        let mut checked = 0;
        for (animation_index, animation) in optional_array(&self.json, "animations")?.iter().enumerate() {
            let samplers = array(animation, "samplers")?;
            let channels = array(animation, "channels")?;
            if samplers.is_empty() || channels.is_empty() {
                return Err(format!("animations[{animation_index}]: missing samplers or channels"));
            }
            for (channel_index, channel) in channels.iter().enumerate() {
                let sampler = samplers.get(field(channel, "sampler")?).ok_or("invalid animation sampler reference")?;
                self.check_sampler(channel, sampler).map_err(|err| {
                    format!("animations[{animation_index}].channels[{channel_index}]: {err}")
                })?;
                checked += 1;
            }
        }
        Ok(checked)
    }

    fn check_sampler(&self, channel: &Value, sampler: &Value) -> Check {
        let target = &channel["target"];
        let node = at(&self.json, "nodes", field(target, "node")?)?;
        let (shape, weights) = match target["path"].as_str() {
            Some("translation" | "scale") => ("VEC3", 1),
            Some("rotation") => ("VEC4", 1),
            Some("weights") => {
                let mesh = at(&self.json, "meshes", field(node, "mesh")?)?;
                let primitives = array(mesh, "primitives")?;
                let mut counts = primitives.iter().map(|p| array(p, "targets").map(|targets| targets.len()));
                let first = counts.next().ok_or("missing morph primitives")??;
                if first == 0 || !counts.all(|count| count == Ok(first)) {
                    return Err("inconsistent morph target count".into());
                }
                ("SCALAR", first)
            }
            _ => return Err("unsupported animation target path".into()),
        };
        let input = self.accessor(field(sampler, "input")?)?;
        let output = self.accessor(field(sampler, "output")?)?;
        if input.shape != "SCALAR" || input.component != 5126 || input.normalized {
            return Err("animation sampler input must be float SCALAR".into());
        }
        let mut previous = None;
        for time in input.floats() {
            if !time.is_finite() || time < 0.0 || previous.is_some_and(|last| time <= last) {
                return Err("animation timestamps must be finite and strictly increasing from a nonnegative value".into());
            }
            previous = Some(time);
        }
        let multiplier = match sampler.get("interpolation").map(|value| value.as_str()) {
            None | Some(Some("LINEAR" | "STEP")) => 1,
            Some(Some("CUBICSPLINE")) if input.count >= 2 => 3,
            Some(Some("CUBICSPLINE")) => return Err("CUBICSPLINE needs at least two keyframes".into()),
            _ => return Err("invalid animation interpolation".into()),
        };
        let count = input.count.checked_mul(multiplier).and_then(|n| n.checked_mul(weights))
            .ok_or("animation output count overflow")?;
        let float_output = output.component == 5126 && !output.normalized;
        let normalized_output = matches!(target["path"].as_str(), Some("rotation" | "weights"))
            && output.normalized && matches!(output.component, 5120 | 5121 | 5122 | 5123);
        if output.shape != shape || output.count != count || !(float_output || normalized_output) {
            return Err("animation output shape, component encoding, or count does not match its target and interpolation".into());
        }
        if float_output && !output.floats().all(f32::is_finite) {
            return Err("animation output contains a non-finite value".into());
        }
        Ok(())
    }
}
