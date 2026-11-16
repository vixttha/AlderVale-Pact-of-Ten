"""Validate README HQ archives, workspaces, frozen snapshots and Markdown navigation."""

import hashlib
import json
import re
import shutil
import tempfile
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
REPO_PREFIX = "/vixttha/AlderVale-Pact-of-Ten/"
VERSION_ROW_RE = re.compile(r"^\|\s*(v\d+\.\d+\.\d+)\s*\|", re.MULTILINE)
WORKSPACE_ROW_RE = re.compile(
    r"^\|\s*(v\d+\.\d+\.\d+)\s*\|\s*([^|]+?)\s*\|\s*\[[^\]]+\]\(([^)]+)\)\s*\|$",
    re.MULTILINE,
)
LINK_RE = re.compile(r"!?\[[^\]]*\]\(([^)\s]+)(?:\s+[^)]*)?\)")


class ValidationError(Exception):
    pass


def require(condition, message):
    if not condition:
        raise ValidationError(message)


def read(path):
    return path.read_text(encoding="utf-8")


def version_key(version):
    return tuple(int(part) for part in version[1:].split("."))


def git_blob_sha1(data):
    # Git blob object IDs provide stable content-parity checks for frozen files.
    header = b"blob " + str(len(data)).encode("ascii") + b"\0"
    return hashlib.sha1(header + data).hexdigest()


def check_archive(root, base, filenames, manifest_entries, label):
    versions_dir = base / "versions"
    index_path = versions_dir / "README.md"
    index = read(index_path)
    rows = VERSION_ROW_RE.findall(index)
    folders = {item.name for item in versions_dir.iterdir() if item.is_dir()}
    index_label = index_path.relative_to(root).as_posix()

    require(
        rows and len(rows) == len(folders) and set(rows) == folders,
        f"{index_label} must list each version exactly once",
    )
    require(
        set(manifest_entries) == set(rows),
        f"{label} baseline manifest must match every archived version",
    )

    snapshot_files = tuple(name for name in filenames if name != "CHANGELOG.md")
    for version in rows:
        version_dir = versions_dir / version
        for filename in filenames:
            archived_file = version_dir / filename
            require(archived_file.is_file(), f"{label} {version}/{filename} is missing")
            require(
                f"]({version}/{filename})" in index,
                f"{index_label} does not link to {version}/{filename}",
            )

        workspace_record = base / "workspace" / version / "README.md"
        require(
            workspace_record.is_file(),
            f"{label} workspace record for {version} is missing",
        )

        record = manifest_entries[version]
        require(isinstance(record, dict), f"{label} {version} baseline record is invalid")
        snapshots = record.get("snapshots")
        source_commits = record.get("source_commits")
        source_paths = record.get("source_paths")
        require(isinstance(snapshots, dict), f"{label} {version} snapshot map is missing")
        require(isinstance(source_commits, dict), f"{label} {version} source commits are missing")
        require(isinstance(source_paths, dict), f"{label} {version} source paths are missing")
        require(
            set(snapshots) == set(snapshot_files)
            and set(source_commits) == set(snapshot_files)
            and set(source_paths) == set(snapshot_files),
            f"{label} {version} baseline must cover every frozen snapshot exactly once",
        )

        for filename in snapshot_files:
            expected_blob = snapshots[filename]
            source_commit = source_commits[filename]
            source_path = source_paths[filename]
            require(
                isinstance(expected_blob, str) and re.fullmatch(r"[0-9a-f]{40}", expected_blob),
                f"{label} {version}/{filename} has an invalid Git blob SHA-1",
            )
            require(
                isinstance(source_commit, str) and re.fullmatch(r"[0-9a-f]{40}", source_commit),
                f"{label} {version}/{filename} has an invalid source commit",
            )
            require(
                isinstance(source_path, str)
                and source_path
                and not Path(source_path).is_absolute()
                and ".." not in Path(source_path).parts,
                f"{label} {version}/{filename} has an unsafe source path",
            )
            actual_blob = git_blob_sha1((version_dir / filename).read_bytes())
            require(
                actual_blob == expected_blob,
                f"{label} {version}/{filename} frozen snapshot checksum mismatch",
            )

    latest_version = max(rows, key=version_key)
    return versions_dir / latest_version, latest_version


def check_workspace(root, base, label):
    index_path = base / "README.md"
    index = read(index_path)
    rows = WORKSPACE_ROW_RE.findall(index)
    folders = {item.name for item in base.iterdir() if item.is_dir()}
    versions = [row[0] for row in rows]
    index_label = index_path.relative_to(root).as_posix()

    require(
        rows and len(versions) == len(folders) and set(versions) == folders,
        f"{index_label} workspace index must list each version folder exactly once",
    )

    drafts = []
    for version, status, target in rows:
        require(
            target == f"{version}/README.md",
            f"{index_label} has an invalid workspace record link for {version}",
        )
        require(
            (base / target).is_file(),
            f"{index_label} links to a missing workspace record for {version}",
        )
        if "draft" in status.lower():
            require(
                (base / version / "DRAFT.md").is_file(),
                f"{label} draft workspace {version} has no DRAFT.md",
            )
            drafts.append(version)

    return sorted(drafts, key=version_key, reverse=True)


def heading_slugs(markdown):
    slugs = set()
    for heading in re.findall(r"^#{1,6}\s+(.+?)\s*#*\s*$", markdown, re.MULTILINE):
        heading = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", heading)
        slug = re.sub(r"[^\w -]", "", heading.lower())
        slug = re.sub(r"\s+", "-", slug.strip())
        base_slug = slug
        suffix = 0
        while slug in slugs:
            suffix += 1
            slug = f"{base_slug}-{suffix}"
        slugs.add(slug)
    return slugs


def check_links(root, file):
    for href in LINK_RE.findall(read(file)):
        url = urlsplit(href)
        target = None
        directory_link = False

        if url.netloc.lower() == "github.com" and url.path.startswith(REPO_PREFIX):
            parts = url.path[len(REPO_PREFIX):].split("/", 2)
            if len(parts) == 3 and parts[0] in {"blob", "tree"} and parts[1] == "readme-hq":
                target = root / unquote(parts[2])
                directory_link = parts[0] == "tree"
            else:
                continue
        elif not url.scheme and not url.netloc:
            relative_path = unquote(url.path)
            target = (file.parent / relative_path).resolve() if relative_path else file.resolve()
        else:
            continue

        resolved = target.resolve()
        require(
            resolved.is_relative_to(root.resolve()),
            f"{file.relative_to(root)} has a link that escapes the branch: {href}",
        )
        if directory_link:
            require(
                resolved.is_dir(),
                f"{file.relative_to(root)} has a broken directory link to {href}",
            )
        else:
            require(
                resolved.is_file(),
                f"{file.relative_to(root)} has a broken link to {href}",
            )

        if url.fragment:
            require(resolved.is_file(), f"{file.relative_to(root)} has a heading link to a non-file")
            require(
                unquote(url.fragment) in heading_slugs(read(resolved)),
                f"{file.relative_to(root)} has a broken heading link to {href}",
            )


def validate_repo(root):
    manifest = json.loads(read(root / "tools" / "readme_hq_baselines.json"))
    require(manifest.get("schema_version") == 1, "README HQ baseline manifest schema is unsupported")

    public_entries = manifest.get("public_readme")
    hq_entries = manifest.get("readme_hq")
    require(isinstance(public_entries, dict), "public README baseline manifest is missing")
    require(isinstance(hq_entries, dict), "README HQ baseline manifest is missing")

    public_snapshot, public_version = check_archive(
        root, root, ("README.md", "CHANGELOG.md"), public_entries, "public README"
    )
    public_drafts = check_workspace(root, root / "workspace", "public README")
    hq = root / "readme-hq"
    hq_snapshot, hq_version = check_archive(
        root, hq, ("README.md", "GUIDE.md", "CHANGELOG.md"), hq_entries, "README HQ"
    )
    hq_drafts = check_workspace(root, hq / "workspace", "README HQ")

    require(
        (root / "README.md").read_bytes() == (hq_snapshot / "README.md").read_bytes(),
        "The HQ front page differs from the latest HQ snapshot",
    )
    require(
        (hq / "README.md").read_bytes() == (hq_snapshot / "GUIDE.md").read_bytes(),
        "The HQ folder guide differs from the latest HQ snapshot",
    )
    tick = chr(96)
    require(
        f"**Current HQ version:** {tick}{hq_version}{tick}" in read(hq / "README.md"),
        "The current HQ version pointer does not match the latest snapshot",
    )

    front_page = read(root / "README.md")
    require(
        f"versions/{public_version}/README.md" in front_page,
        "HQ front page does not link to the latest approved public README",
    )
    require(public_drafts, "The public README workspace has no draft candidate")
    latest_public_draft = public_drafts[0]
    require(
        f"workspace/{latest_public_draft}/README.md" in front_page,
        "HQ front page does not link to the latest public README workspace",
    )

    require(hq_drafts, "README HQ workspace has no draft candidate")
    latest_hq_draft = hq_drafts[0]
    hq_candidate = read(hq / "workspace" / latest_hq_draft / "DRAFT.md")
    require(
        f"workspace/{latest_public_draft}/DRAFT.md" in hq_candidate,
        "Latest README HQ draft does not directly link to the current public README draft",
    )

    markdown_files = (
        file for file in root.rglob("*.md") if ".git" not in file.parts and "__pycache__" not in file.parts
    )
    for file in sorted(markdown_files):
        check_links(root, file)

    return (
        f"public README {public_version} and README HQ {hq_version} archives, "
        "both workspace indexes, frozen snapshot checksums, snapshot parity, "
        "draft pointers, and all Markdown links"
    )


def run_regression_tests(root):
    cases = []

    def add_case(name, expected_message, mutate):
        cases.append((name, expected_message, mutate))

    def change_public_snapshot(fixture):
        path = fixture / "versions" / "v0.0.1" / "README.md"
        path.write_text(read(path) + "\n<!-- regression mutation -->\n", encoding="utf-8")

    def change_hq_snapshot_and_live_guide(fixture):
        for relative in (
            Path("readme-hq/README.md"),
            Path("readme-hq/versions/v0.0.1/GUIDE.md"),
        ):
            path = fixture / relative
            path.write_text(read(path) + "\n<!-- regression mutation -->\n", encoding="utf-8")

    def remove_public_workspace_row(fixture):
        path = fixture / "workspace" / "README.md"
        lines = [line for line in read(path).splitlines() if not line.startswith("| v0.0.2 |")]
        path.write_text("\n".join(lines) + "\n", encoding="utf-8")

    def remove_hq_workspace_row(fixture):
        path = fixture / "readme-hq" / "workspace" / "README.md"
        lines = [line for line in read(path).splitlines() if not line.startswith("| v0.0.2 |")]
        path.write_text("\n".join(lines) + "\n", encoding="utf-8")

    def add_broken_draft_link(fixture):
        path = fixture / "workspace" / "v0.0.2" / "DRAFT.md"
        path.write_text(read(path) + "\n[Broken regression fixture](missing-target.md)\n", encoding="utf-8")

    def stale_public_workspace_pointer(fixture):
        path = fixture / "README.md"
        content = read(path)
        old = "workspace/v0.0.2/README.md"
        new = "workspace/v0.0.1/README.md"
        require(old in content, "Regression fixture could not find the public workspace pointer")
        path.write_text(content.replace(old, new, 1), encoding="utf-8")

    def stale_candidate_draft_pointer(fixture):
        path = fixture / "readme-hq" / "workspace" / "v0.0.2" / "DRAFT.md"
        content = read(path)
        old = "workspace/v0.0.2/DRAFT.md"
        new = "workspace/v0.0.2/README.md"
        require(old in content, "Regression fixture could not find the candidate draft pointer")
        path.write_text(content.replace(old, new, 1), encoding="utf-8")

    add_case("public frozen README drift", "snapshot checksum mismatch", change_public_snapshot)
    add_case("HQ guide and live guide drift together", "snapshot checksum mismatch", change_hq_snapshot_and_live_guide)
    add_case("public workspace index omission", "workspace index must list each version folder exactly once", remove_public_workspace_row)
    add_case("HQ workspace index omission", "workspace index must list each version folder exactly once", remove_hq_workspace_row)
    add_case("broken link inside DRAFT.md", "broken link to", add_broken_draft_link)
    add_case("stale public workspace pointer", "latest public README workspace", stale_public_workspace_pointer)
    add_case("stale HQ candidate draft pointer", "directly link to the current public README draft", stale_candidate_draft_pointer)

    for name, expected_message, mutate in cases:
        with tempfile.TemporaryDirectory(prefix="readme-hq-regression-") as temp_dir:
            fixture = Path(temp_dir) / "repo"
            shutil.copytree(root, fixture, ignore=shutil.ignore_patterns(".git", "__pycache__"))
            mutate(fixture)
            try:
                validate_repo(fixture)
            except ValidationError as error:
                require(
                    expected_message in str(error),
                    f"Regression test for {name} failed for an unexpected reason: {error}",
                )
            else:
                raise ValidationError(f"Regression test did not reject {name}")

    return len(cases)


def main():
    try:
        summary = validate_repo(ROOT)
        print(f"PASS: {summary}.")
        regression_count = run_regression_tests(ROOT)
        print(f"PASS: {regression_count} negative regression fixtures were rejected.")
    except ValidationError as error:
        raise SystemExit(str(error))


if __name__ == "__main__":
    main()
