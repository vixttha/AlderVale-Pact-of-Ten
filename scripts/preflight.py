"""Stdlib intake validation only; no model execution."""
import argparse
import hashlib
import json
from pathlib import Path
import re

KEYS = {"schema", "asset_id", "reference", "additional_views", "anatomy", "owner_scope", "model", "budgets"}
PNG = b"\x89PNG\r\n\x1a\n"
def require(condition, message):
    if not condition:
        raise ValueError(message)

def checked_image(root, obj):
    require(isinstance(obj, dict) and set(obj) == {"path", "sha256"}, "image fields")
    raw, digest = obj["path"], obj["sha256"]
    require(isinstance(raw, str) and bool(raw) and "\\" not in raw, "image path")
    p = Path(raw)
    require(not p.is_absolute() and ".." not in p.parts and p.suffix.lower() == ".png", "unsafe image path")
    require(isinstance(digest, str) and re.fullmatch(r"[0-9a-f]{64}", digest) is not None, "digest")
    current = root
    for part in p.parts:
        current = current / part
        require(not current.is_symlink(), "symlink rejected")
    require(current.is_file() and current.resolve().is_relative_to(root.resolve()), "missing image")
    with current.open("rb") as stream:
        require(stream.read(8) == PNG, "not PNG signature")
        stream.seek(0)
        require(hashlib.file_digest(stream, "sha256").hexdigest() == digest, "digest mismatch")

def validate(data, root, template=False):
    require(isinstance(data, dict) and set(data) == KEYS and type(data["schema"]) is int and data["schema"] == 1, "schema")
    require(isinstance(data["additional_views"], list), "views")
    if template:
        require(data["additional_views"] == [] and all(data[k] is None for k in KEYS - {"schema", "additional_views"}), "template must be blank")
        return
    require(isinstance(data["asset_id"], str) and re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", data["asset_id"]) is not None, "asset id")
    for key in ("anatomy", "owner_scope"):
        require(isinstance(data[key], str) and bool(data[key].strip()), key)
    require(data["model"] in ("spar3d", "sf3d"), "model")
    checked_image(root, data["reference"])
    for view in data["additional_views"]:
        checked_image(root, view)
    b = data["budgets"]
    require(isinstance(b, dict) and set(b) == {"runtime_triangles", "texture_px", "max_minutes"}, "budgets")
    for key, cap in (("runtime_triangles", 500000), ("texture_px", 4096), ("max_minutes", 240)):
        require(type(b[key]) is int and 0 < b[key] <= cap, key)

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("manifest", type=Path)
    parser.add_argument("--template", action="store_true")
    args = parser.parse_args()
    validate(json.loads(args.manifest.read_text()), Path.cwd(), args.template)
    print("PASS: blank template structure" if args.template else "PASS: intake signature/digest only; generation NOT RUN")

if __name__ == "__main__":
    main()
