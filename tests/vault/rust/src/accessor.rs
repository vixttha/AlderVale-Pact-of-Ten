use crate::glb::{array, at, checked_span, field, offset, uint};
use crate::{Check, Glb};
use serde_json::Value;

pub(crate) struct Accessor<'a> {
    data: &'a [u8],
    stride: usize,
    pub count: usize,
    pub component: usize,
    pub shape: &'a str,
    pub lanes: usize,
    pub normalized: bool,
}

fn layout(shape: &str, width: usize) -> Check<(usize, usize, usize)> {
    let (columns, rows) = match shape {
        "SCALAR" => (1_usize, 1_usize),
        "VEC2" => (1, 2),
        "VEC3" => (1, 3),
        "VEC4" => (1, 4),
        "MAT2" => (2, 2),
        "MAT3" => (3, 3),
        "MAT4" => (4, 4),
        _ => return Err(format!("unknown accessor type {shape}")),
    };
    let column_bytes = rows * width;
    let column_stride = if columns > 1 {
        column_bytes.next_multiple_of(4)
    } else {
        column_bytes
    };
    Ok((
        columns * rows,
        columns * column_stride,
        (columns - 1) * column_stride + column_bytes,
    ))
}

impl<'a> Glb<'a> {
    pub(crate) fn accessor(&self, index: usize) -> Check<Accessor<'_>> {
        self.read_accessor(index)
            .map_err(|err| format!("accessors[{index}]: {err}"))
    }

    fn read_accessor(&self, index: usize) -> Check<Accessor<'_>> {
        let value = at(&self.json, "accessors", index)?;
        if value.get("sparse").is_some() {
            return Err("sparse data is outside the embedded accessor profile".into());
        }
        let view_index = field(value, "bufferView")?;
        let (view, view_stride) = self.view(view_index)?;
        let component = field(value, "componentType")?;
        let width = match component {
            5120 | 5121 => 1,
            5122 | 5123 => 2,
            5125 | 5126 => 4,
            _ => return Err(format!("unknown componentType {component}")),
        };
        let shape = value["type"].as_str().ok_or("expected an accessor type")?;
        let (lanes, packed_stride, last_size) = layout(shape, width)?;
        let stride = view_stride.unwrap_or(packed_stride);
        let count = field(value, "count")?;
        let start = offset(value)?;
        let view_offset = offset(at(&self.json, "bufferViews", view_index)?)?;
        let absolute = view_offset.checked_add(start).ok_or("accessor offset overflow")?;
        if start % width != 0 || absolute % width != 0 || stride % width != 0 {
            return Err("accessor data is not aligned to its component width".into());
        }
        if shape.starts_with("MAT") && absolute % 4 != 0 {
            return Err("matrix data is not aligned to four bytes".into());
        }
        if stride < packed_stride {
            return Err("byteStride is smaller than one accessor element".into());
        }
        checked_span(start, count, stride, last_size, view.len())?;
        let normalized = value.get("normalized").map_or(Ok(false), |v| {
            v.as_bool().ok_or("normalized must be a boolean")
        })?;
        Ok(Accessor { data: &view[start..], stride, count, component, shape, lanes, normalized })
    }

    pub fn check_mesh_accessors(&self) -> Check {
        for (mesh_index, mesh) in array(&self.json, "meshes")?.iter().enumerate() {
            for (primitive_index, primitive) in array(mesh, "primitives")?.iter().enumerate() {
                check_primitive(self, primitive).map_err(|err| {
                    format!("meshes[{mesh_index}].primitives[{primitive_index}]: {err}")
                })?;
            }
        }
        Ok(())
    }
}

fn check_attributes(asset: &Glb<'_>, attributes: &Value, vertex_count: usize) -> Check {
    let attributes = attributes.as_object().ok_or("expected an attribute object")?;
    for (name, value) in attributes {
        let accessor = asset.accessor(uint(value)?)?;
        if accessor.count != vertex_count {
            return Err(format!("{name}: count differs from POSITION"));
        }
    }
    Ok(())
}

fn check_primitive(asset: &Glb<'_>, primitive: &Value) -> Check {
    let position = asset.accessor(field(&primitive["attributes"], "POSITION")?)?;
    check_attributes(asset, &primitive["attributes"], position.count)?;
    if let Some(targets) = primitive.get("targets") {
        for target in targets.as_array().ok_or("expected morph targets array")? {
            check_attributes(asset, target, position.count)?;
        }
    }
    if let Some(index) = primitive.get("indices") {
        let accessor = asset.accessor(uint(index)?)?;
        if accessor.shape != "SCALAR" || accessor.normalized
            || !matches!(accessor.component, 5121 | 5123 | 5125)
        {
            return Err("indices must be unsigned, unnormalized scalars".into());
        }
        for (i, element) in accessor.elements().enumerate() {
            if unsigned(element, accessor.component)? as u64 >= position.count as u64 {
                return Err(format!("indices[{i}] refers beyond POSITION"));
            }
        }
    }
    Ok(())
}

impl Accessor<'_> {
    pub fn elements(&self) -> impl Iterator<Item = &[u8]> {
        self.data.chunks(self.stride).take(self.count)
    }

    pub fn floats(&self) -> impl Iterator<Item = f32> {
        self.elements().flat_map(move |element| {
            element.chunks_exact(4).take(self.lanes)
                .map(|bytes| f32::from_le_bytes([bytes[0], bytes[1], bytes[2], bytes[3]]))
        })
    }
}

pub(crate) fn unsigned(bytes: &[u8], component: usize) -> Check<u32> {
    match (component, bytes) {
        (5121, [a, ..]) => Ok(u32::from(*a)),
        (5123, [a, b, ..]) => Ok(u32::from(u16::from_le_bytes([*a, *b]))),
        (5125, [a, b, c, d, ..]) => Ok(u32::from_le_bytes([*a, *b, *c, *d])),
        _ => Err("invalid unsigned component".into()),
    }
}
