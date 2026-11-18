"""Formwright HQ template and version-integrity checks (public-runner safe)."""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[2]
HQ = ROOT / "character-forge"
REQUIRED = (
    "README.md", "AGENT_IDENTITY.md", "template/v0.0.1/README.md",
    "template/v0.0.1/AGENT_TEMPLATE.md", "template/v0.0.1/OPERATIONS.md",
    "workspace/v0.0.1/README.md", "workspace/v0.0.1/CHANGELOG.md",
    "workspace/v0.0.1/ADOPTION.md", "versions/README.md",
    "graphify/README.md", "design/ANATOMY_AND_FIT_CONTRACT.md",
    "validation/CI.md", "validation/TEST_VAULT_PLAN.md",
)
PORTABLE_FORBIDDEN = (
    "aldervale", "pact of ten", "vixttha", "character-forge-hq",
    "notion.com", "github.com/", "shared/wardrobe.ts", "src/engine/",
    "13 races",
)
ALLOWED_PATH = re.compile(r"^(character-forge/|\.github/workflows/formwright\.yml$)")
MARKDOWN_LINK = re.compile(r"\[[^\]]*\]\(([^)]+)\)")
SHA40 = re.compile(r"^[0-9a-f]{40}$")
VERSION = re.compile(r"^v\d+\.\d+\.\d+$")


class ValidationError(Exception):
    pass


def git(*args: str) -> str:
    proc = subprocess.run(("git",) + args, cwd=ROOT, capture_output=True, text=True)
    if proc.returncode:
        raise ValidationError(f"git {' '.join(args)}: {proc.stderr.strip()}")
    return proc.stdout.strip()


def is_allowed_path(path: str) -> bool:
    return bool(ALLOWED_PATH.match(path))


def portable_violations(text: str) -> list[str]:
    lower = text.lower()
    return [bad for bad in PORTABLE_FORBIDDEN if bad in lower]


def check_required(root: Path = HQ) -> list[str]:
    return [f"missing required file: {rel}" for rel in REQUIRED if not (root / rel).is_file()]


def check_markdown_links(file: Path, root: Path = ROOT) -> list[str]:
    errors = []
    content = file.read_text(encoding="utf-8")
    for match in MARKDOWN_LINK.finditer(content):
        url = match.group(1).strip().split(" ", 1)[0].strip("<>")
        if url.startswith(("https://", "http://", "mailto:", "#")):
            continue
        rel = unquote(url.split("#", 1)[0].split("?", 1)[0])
        if not rel:
            continue
        resolved = (file.parent / rel).resolve()
        if not resolved.is_relative_to(root.resolve()):
            errors.append(f"{file}: link escapes repository: {url}")
        elif not resolved.exists():
            errors.append(f"{file}: broken local link: {url}")
    return errors


def check_scope(base: str) -> list[str]:
    merge_base = git("merge-base", base, "HEAD")
    diff = git("diff", "--name-status", "--find-renames", merge_base, "HEAD")
    errors = []
    for line in diff.splitlines():
        fields = line.split("\t")
        status, paths = fields[0], fields[1:]
        for path in paths:
            if not is_allowed_path(path):
                errors.append(f"out-of-scope path {status}: {path}")
            if path.startswith("character-forge/versions/"):
                parts = Path(path).parts
                if len(parts) >= 3 and VERSION.fullmatch(parts[2]):
                    archived = git("ls-tree", "-r", "--name-only", merge_base, "--",
                                   f"character-forge/versions/{parts[2]}")
                    if archived:
                        errors.append(f"approved archive cannot change: {path}")
    return errors


def missing_archive_versions(historical: set[str], current: set[str]) -> list[str]:
    """Fail closed when an archived version disappears from the working tree."""
    return sorted(historical - current)


def check_archive_deletions(root: Path = HQ) -> list[str]:
    historical: set[str] = set()
    for revision in git("rev-list", "HEAD", "--", "character-forge/versions").splitlines():
        paths = git("ls-tree", "-r", "--name-only", revision, "--",
                    "character-forge/versions").splitlines()
        for path in paths:
            parts = Path(path).parts
            if len(parts) >= 4 and VERSION.fullmatch(parts[2]):
                historical.add(parts[2])
    folder = root / "versions"
    present = {path.name for path in folder.iterdir() if path.is_dir()
               and VERSION.fullmatch(path.name)}
    return [f"approved archive deleted from history: {name}"
            for name in missing_archive_versions(historical, present)]


def check_archives(root: Path = HQ) -> list[str]:
    errors: list[str] = []
    folder = root / "versions"
    for version_dir in sorted(folder.iterdir()):
        if not version_dir.is_dir():
            continue
        if not VERSION.fullmatch(version_dir.name):
            errors.append(f"unexpected archive directory: {version_dir.name}")
            continue
        # Detect an archive rewrite even when it exists only on this HQ branch.
        archive_path = f"character-forge/versions/{version_dir.name}"
        history = git("rev-list", "--reverse", "HEAD", "--", archive_path).splitlines()
        if history:
            first_tree = git("rev-parse", f"{history[0]}:{archive_path}")
            current_tree = git("rev-parse", f"HEAD:{archive_path}")
            if first_tree != current_tree:
                errors.append(f"{version_dir.name}: frozen archive differs from its first committed snapshot")
        required = ("README.md", "CHANGELOG.md", "MANIFEST.json")
        for name in required:
            if not (version_dir / name).is_file():
                errors.append(f"{version_dir}: missing {name}")
        if not (version_dir / "MANIFEST.json").is_file():
            continue
        try:
            manifest = json.loads((version_dir / "MANIFEST.json").read_text())
            if manifest.get("version") != version_dir.name or not manifest.get("files"):
                raise ValidationError("version mismatch or empty files manifest")
            seen = set()
            for entry in manifest["files"]:
                sha, blob, source, archived_path = (
                    entry["source_commit"], entry["source_blob_sha"],
                    entry["source_path"], entry["archived_path"]
                )
                if not SHA40.fullmatch(sha) or not SHA40.fullmatch(blob):
                    raise ValidationError("invalid 40-character source commit / blob SHA")
                if source.startswith("/") or ".." in Path(source).parts:
                    raise ValidationError("unsafe source path")
                if archived_path.startswith("/") or ".." in Path(archived_path).parts:
                    raise ValidationError("unsafe archive path")
                if not archived_path.startswith(f"character-forge/versions/{version_dir.name}/"):
                    raise ValidationError("archive file outside version directory")
                dest = root.parent / archived_path
                if not dest.is_file() or archived_path in seen:
                    raise ValidationError("missing or duplicate archived file")
                seen.add(archived_path)
                if git("rev-parse", f"{sha}:{source}") != blob:
                    raise ValidationError("recorded blob does not match source commit")
                data = subprocess.run(("git", "show", f"{sha}:{source}"),
                                      cwd=ROOT, capture_output=True, check=True).stdout
                if data != dest.read_bytes():
                    raise ValidationError("archive bytes differ from pinned source")
            expect = {str(p.relative_to(root.parent)) for p in version_dir.rglob("*") if p.is_file() and p.name != "MANIFEST.json"}
            if expect != seen:
                raise ValidationError("manifest does not cover every archived file")
        except (ValidationError, ValueError, TypeError, KeyError, subprocess.CalledProcessError) as exc:
            errors.append(f"{version_dir.name}: {exc}")
    return errors


def validate(base: str | None = None) -> list[str]:
    errors = check_required()
    for path in (HQ / "template" / "v0.0.1").rglob("*"):
        if path.is_file() and path.suffix == ".md":
            for bad in portable_violations(path.read_text(encoding="utf-8")):
                errors.append(f"portable template contains project-specific token {bad}: {path}")
    for path in HQ.rglob("*.md"):
        errors.extend(check_markdown_links(path))
    errors.extend(check_archives())
    errors.extend(check_archive_deletions())
    if base:
        errors.extend(check_scope(base))
    return errors


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", help="Compare changed paths and frozen archives against this ref")
    args = parser.parse_args()
    errors = validate(args.base)
    for error in errors:
        print(f"ERROR: {error}", file=sys.stderr)
    if errors:
        return 1
    print(f"Formwright v0.0.1 structure, portable template, link, archive and scope checks PASS at {git('rev-parse', 'HEAD')}")
    print("WARNING: 3D rig, clothing-fit, and owner acceptance are NOT validated by this tool.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
