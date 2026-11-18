"""Verify pinned template provenance and deterministic consumer instruction output."""
import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import subprocess

from jsonschema import Draft202012Validator

TOKEN = re.compile(r"\{\{([A-Z_]+)\}\}")


def git(root, *args):
    return subprocess.check_output(["git", "-C", str(root), *args], stderr=subprocess.PIPE)


def ensure_commit(root, sha, repository, allow_fetch):
    if not re.fullmatch(r"[0-9a-f]{40}", sha):
        raise ValueError("Expected full template commit")
    if not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", repository):
        raise ValueError("Invalid public source repository")
    result = subprocess.run(["git", "-C", str(root), "cat-file", "-e", f"{sha}^{{commit}}"],
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    if result.returncode:
        if not allow_fetch:
            raise ValueError("Pinned template commit unavailable")
        subprocess.run(["git", "-C", str(root), "fetch", "--no-tags", "--no-recurse-submodules",
                        "--depth=1", f"https://github.com/{repository}.git", sha],
                       env={**os.environ, "GIT_TERMINAL_PROMPT": "0"},
                       timeout=90, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)


def render(text, bindings):
    used = set(TOKEN.findall(text))
    if not used <= bindings.keys():
        raise ValueError("Missing template binding")
    result = TOKEN.sub(lambda m: bindings[m[1]], text)
    if "{{" in result or "}}" in result:
        raise ValueError("Unresolved template token")
    return result


def entrypoints(relative):
    """Controlled declarations; checking bytes does not prove host obedience."""
    return {
        "AGENTS.md": (
            "# AlderVale-Launcher active worker instructions\n\n"
            f"Read and follow [bound template instructions]({relative}/AGENTS.md),\n"
            f"[project-specific instructions]({relative}/PROJECT_INSTRUCTIONS.md),\n"
            f"[the binding record]({relative}/binding.json), and PROJECT_RULES.md\n"
            "before work. The solo owner's current instructions prevail.\n"
            "Template adoption grants no new spending, runtime, release or background authority.\n"
        ),
        "agents/aldergate/IDENTITY.md": (
            "# AlderGate active identity\n\n"
            f"Read [the bound identity](../../{relative}/IDENTITY.md) and\n"
            f"[the retained project identity](../../{relative}/PROJECT_IDENTITY.md).\n"
            "This is a host-executed worker role, not a deployed service or independent reviewer.\n"
        ),
    }


def verify(root, binding_path, allow_fetch=True):
    root = root.resolve()
    path = (root / binding_path).resolve()
    if not path.is_relative_to(root):
        raise ValueError("Adoption record escapes project")
    data = json.loads(path.read_text(encoding="utf-8"))
    if data.get("schema_version") != 1:
        raise ValueError("Unsupported adoption schema")
    template, bindings = data["template"], data["bindings"]
    source = template["source_path"]
    if source.startswith("/") or "\\" in source or ".." in PurePosixPath(source).parts or ":" in source:
        raise ValueError("Unsafe template source path")
    for sha in (template["home_commit"], template["source_commit"]):
        ensure_commit(root, sha, template["repository"], allow_fetch)
    registry = json.loads(git(root, "show", f"{template['home_commit']}:versions/manifest.json"))
    version = template["version"]
    record = registry["versions"][version]
    if (record["source_commit"] != template["source_commit"] or
        record["source_path"] + "/template" != source or record["status"] != template["status"]):
        raise ValueError("Template version/provenance disagrees with pinned home")
    if record["status"] == "draft" and data.get("adoption_status") != "development":
        raise ValueError("Draft template must be marked development")
    receipt_bytes = git(root, "show", f"{template['home_commit']}:Graphify HQ/{version}/receipt.json")
    if hashlib.sha256(receipt_bytes).hexdigest() != template["graph_receipt_sha256"]:
        raise ValueError("Pinned template graph receipt changed")
    receipt = json.loads(receipt_bytes)
    if receipt["source_commit"] != template["source_commit"]:
        raise ValueError("Template graph source mismatch")
    inventory = git(root, "ls-tree", "-r", "-z", f"{template['source_commit']}:{source}")
    original = {}
    for entry in inventory.split(b"\0"):
        if entry:
            meta, name = entry.decode().split("\t", 1)
            mode, kind, blob = meta.split()
            if mode not in {"100644", "100755"} or kind != "blob":
                raise ValueError("Unsupported template source entry")
            original[name] = git(root, "cat-file", "blob", blob)
    actual_hashes = {name: hashlib.sha256(value).hexdigest() for name, value in original.items()}
    if not original or template["files"] != actual_hashes:
        raise ValueError("Template file hashes/inventory differ from source")
    folder = path.parent
    vendor = folder / "template"
    installed = {p.relative_to(vendor).as_posix(): p for p in vendor.rglob("*") if p.is_file()}
    if installed.keys() != original.keys():
        raise ValueError("Vendored template inventory mismatch")
    for name, value in original.items():
        p = installed[name]
        if p.is_symlink() or p.read_bytes() != value:
            raise ValueError(f"Vendored template bytes changed: {name}")
        if "template/" + name not in receipt["sources"]:
            raise ValueError("Template map omits adopted source file")
    schema = json.loads(original["bindings.schema.json"])
    Draft202012Validator(schema).validate(bindings)
    for incoming, outgoing in (("AGENTS.template.md", "AGENTS.md"), ("IDENTITY.template.md", "IDENTITY.md")):
        expected = render(original[incoming].decode("utf-8"), bindings).encode("utf-8")
        output = folder / outgoing
        if output.is_symlink() or output.read_bytes() != expected:
            raise ValueError(f"Rendered instruction bytes differ: {outgoing}")
    relative = folder.relative_to(root).as_posix()
    for name, expected in entrypoints(relative).items():
        output = root / name
        if output.is_symlink() or output.read_bytes() != expected.encode("utf-8"):
            raise ValueError(f"Entrypoints do not activate bound instructions: {name}")
    print(f"Template {version}: source inventory, graph receipt, bindings and rendered instructions verified.")
    return data


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("binding", type=Path)
    args = parser.parse_args()
    verify(Path.cwd(), args.binding)
