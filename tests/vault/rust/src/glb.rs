use serde_json::Value;

pub type Check<T = ()> = Result<T, String>;

const JSON_CHUNK: u32 = 0x4e4f_534a;
const BIN_CHUNK: u32 = 0x004e_4942;

pub struct Glb<'a> {
    pub(crate) json: Value,
    pub(crate) bin: &'a [u8],
}

pub(crate) fn checked_span(
    offset: usize,
    count: usize,
    stride: usize,
    last_size: usize,
    limit: usize,
) -> Check {
    let last = count
        .checked_sub(1)
        .and_then(|last| last.checked_mul(stride))
        .and_then(|length| offset.checked_add(length))
        .and_then(|start| start.checked_add(last_size))
        .ok_or_else(|| "empty or overflowing byte range".to_owned())?;
    if last > limit {
        return Err(format!("byte range ends at {last}, beyond {limit}"));
    }
    Ok(())
}

pub(crate) fn uint(value: &Value) -> Check<usize> {
    value
        .as_u64()
        .and_then(|n| usize::try_from(n).ok())
        .ok_or_else(|| "expected an unsigned integer in range".to_owned())
}

pub(crate) fn field(value: &Value, name: &str) -> Check<usize> {
    uint(&value[name]).map_err(|err| format!("{name}: {err}"))
}

pub(crate) fn offset(value: &Value) -> Check<usize> {
    value.get("byteOffset").map_or(Ok(0), uint)
}

pub(crate) fn array<'a>(value: &'a Value, name: &str) -> Check<&'a [Value]> {
    value[name]
        .as_array()
        .map(Vec::as_slice)
        .ok_or_else(|| format!("{name}: expected an array"))
}

pub(crate) fn at<'a>(value: &'a Value, name: &str, index: usize) -> Check<&'a Value> {
    array(value, name)?
        .get(index)
        .ok_or_else(|| format!("{name}[{index}]: reference does not exist"))
}

fn word(bytes: &[u8], offset: usize) -> Check<u32> {
    let end = offset
        .checked_add(4)
        .ok_or_else(|| "GLB word offset overflow".to_owned())?;
    bytes
        .get(offset..end)
        .and_then(|value| value.try_into().ok())
        .map(u32::from_le_bytes)
        .ok_or_else(|| format!("truncated GLB word at byte {offset}"))
}

impl<'a> Glb<'a> {
    pub fn parse(bytes: &'a [u8]) -> Check<Self> {
        if bytes.get(..4) != Some(b"glTF") || word(bytes, 4)? != 2 {
            return Err("expected a glTF 2 GLB header".into());
        }
        if word(bytes, 8)? as usize != bytes.len() {
            return Err("GLB header length does not match file length".into());
        }

        let mut cursor = 12;
        let mut json = None;
        let mut bin = None;
        while cursor < bytes.len() {
            let length = word(bytes, cursor)? as usize;
            let kind_offset = cursor
                .checked_add(4)
                .ok_or_else(|| "GLB chunk header offset overflow".to_owned())?;
            let kind = word(bytes, kind_offset)?;
            let start = kind_offset
                .checked_add(4)
                .ok_or_else(|| "GLB chunk offset overflow".to_owned())?;
            let end = start
                .checked_add(length)
                .ok_or_else(|| "GLB chunk length overflow".to_owned())?;
            let chunk = bytes
                .get(start..end)
                .filter(|_| length.is_multiple_of(4))
                .ok_or_else(|| format!("invalid GLB chunk range at byte {cursor}"))?;
            match kind {
                JSON_CHUNK if cursor == 12 => {
                    json = Some(serde_json::from_slice::<Value>(chunk)
                        .map_err(|err| format!("GLB JSON: {err}"))?);
                }
                JSON_CHUNK => return Err("GLB JSON chunk must appear once, first".into()),
                BIN_CHUNK if json.is_some() && bin.is_none() => bin = Some(chunk),
                BIN_CHUNK => return Err("GLB BIN chunk must appear once, after JSON".into()),
                _ if cursor != 12 => {}
                _ => return Err("GLB first chunk must contain JSON".into()),
            }
            cursor = end;
        }

        let json = json.ok_or_else(|| "missing GLB JSON chunk".to_owned())?;
        if json["asset"]["version"].as_str() != Some("2.0") {
            return Err("expected glTF asset.version 2.0".into());
        }
        if json.get("extensionsRequired").is_some_and(|extensions| {
            extensions
                .as_array()
                .is_none_or(|required| !required.is_empty())
        }) {
            return Err("required glTF extensions are outside the embedded asset profile".into());
        }
        let bin = bin.ok_or_else(|| "missing GLB BIN chunk".to_owned())?;
        Ok(Self { json, bin })
    }

    fn buffer_length(&self) -> Check<usize> {
        let buffers = array(&self.json, "buffers")?;
        if buffers.len() != 1 || buffers[0].get("uri").is_some() {
            return Err("expected one embedded GLB buffer".into());
        }
        let declared = field(&buffers[0], "byteLength")?;
        if declared == 0 || self.bin.len().checked_sub(declared).is_none_or(|pad| pad > 3) {
            return Err("embedded buffer length does not match the BIN chunk".into());
        }
        if self.bin[declared..].iter().any(|&byte| byte != 0) {
            return Err("GLB BIN padding must contain zero bytes".into());
        }
        Ok(declared)
    }

    pub(crate) fn view(&self, index: usize) -> Check<(&'a [u8], Option<usize>)> {
        let limit = self.buffer_length()?;
        let view = at(&self.json, "bufferViews", index)?;
        if field(view, "buffer")? != 0 {
            return Err("buffer view must reference the embedded buffer".into());
        }
        let start = offset(view)?;
        let len = field(view, "byteLength")?;
        checked_span(start, 1, len, len, limit)?;
        if len == 0 {
            return Err("buffer view must be nonempty".into());
        }
        let stride = view.get("byteStride").map(uint).transpose()?;
        if stride.is_some_and(|n| !(4..=252).contains(&n) || n % 4 != 0) {
            return Err("invalid vertex byteStride".into());
        }
        Ok((&self.bin[start..start + len], stride))
    }

    pub fn check_buffer_views(&self) -> Check {
        self.buffer_length()?;
        for index in 0..array(&self.json, "bufferViews")?.len() {
            self.view(index)
                .map_err(|err| format!("bufferViews[{index}]: {err}"))?;
        }
        Ok(())
    }
}
