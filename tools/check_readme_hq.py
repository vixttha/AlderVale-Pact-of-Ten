"""Validate README HQ archives and navigation against the checkout and its Git history."""

import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
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
COMMIT_RE = re.compile(r"[0-9a-f]{40}")
ARCHIVES = {"public_readme": "versions", "readme_hq": "readme-hq/versions"}
MANIFEST_PATH = "tools/readme_hq_baselines.json"


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


def git(repo, *args):
    return subprocess.run(["git", "-C", repo, *args], capture_output=True, check=False)


def git_blob(repo, commit, path):
    result = git(repo, "cat-file", "blob", f"{commit}:{path}")
    return result.stdout if result.returncode == 0 else None


def read_manifest(root):
    manifest = json.loads(read(root / MANIFEST_PATH))
    require(manifest.get("schema_version") == 1, "README HQ baseline manifest schema is unsupported")
    for archive in ARCHIVES:
        require(isinstance(manifest.get(archive), dict), f"{archive} baseline manifest is missing")
    return manifest


def check_frozen_history(root, repo, baseline, manifest):
    data = git_blob(repo, baseline, MANIFEST_PATH)
    require(data is not None, "The baseline manifest is missing from the trusted checkout")
    previous_manifest = json.loads(data)
    for archive, directory in ARCHIVES.items():
        for version, record in previous_manifest[archive].items():
            require(
                manifest[archive].get(version) == record,
                f"{archive} {version} frozen baseline record changed",
            )
            changelog = f"{directory}/{version}/CHANGELOG.md"
            current = root / changelog
            require(
                current.is_file() and current.read_bytes() == git_blob(repo, baseline, changelog),
                f"{changelog} frozen changelog changed",
            )


def check_archive(root, repo, base, filenames, manifest_entries, label):
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
                isinstance(source_commit, str) and COMMIT_RE.fullmatch(source_commit),
                f"{label} {version}/{filename} has an invalid source commit",
            )
            require(
                isinstance(source_path, str)
                and source_path
                and not Path(source_path).is_absolute()
                and ".." not in Path(source_path).parts
                and all(char not in source_path for char in ("\\", "\0", "\n", "\r")),
                f"{label} {version}/{filename} has an unsafe source path",
            )
            actual_blob = git_blob_sha1((version_dir / filename).read_bytes())
            require(
                actual_blob == expected_blob,
                f"{label} {version}/{filename} frozen snapshot checksum mismatch",
            )
            source = None
            if git(repo, "cat-file", "-t", source_commit).stdout.strip() == b"commit":
                source = git_blob(repo, source_commit, source_path)
            require(source is not None, f"{label} {version}/{filename} recorded source is missing")
            require(
                git_blob_sha1(source) == expected_blob,
                f"{label} {version}/{filename} recorded source does not match the frozen snapshot",
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
        if status.casefold() == "draft":
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


def github_target(url):
    if url.netloc.lower() == "github.com" and url.path.startswith(REPO_PREFIX):
        parts = url.path[len(REPO_PREFIX):].split("/", 2)
        if len(parts) == 3 and parts[0] in {"blob", "tree"}:
            return parts
    return None


def workspace_target(root, file, url, github):
    if github and github[1] == "readme-hq":
        return root / unquote(github[2])
    if not url.scheme and not url.netloc:
        return file.parent / unquote(url.path) if url.path else file
    return None


def links_to(root, file, relative_path):
    expected = root / relative_path
    for href in LINK_RE.findall(read(file)):
        url = urlsplit(href)
        target = workspace_target(root, file, url, github_target(url))
        if target is not None and target.resolve() == expected:
            return True
    return False


def check_links(root, repo, main_ref, file):
    label = file.relative_to(root)
    for href in LINK_RE.findall(read(file)):
        url = urlsplit(href)
        github = github_target(url)
        if github and github[1] == "main":
            kind, _, path = github
            object_spec = f"{main_ref}:{unquote(path)}"
            expected = "tree" if kind == "tree" else "blob"
            actual = git(repo, "cat-file", "-t", object_spec)
            require(
                actual.returncode == 0 and actual.stdout.strip().decode() == expected,
                f"{label} has a broken main link to {href}",
            )
            if url.fragment:
                source = git_blob(repo, main_ref, unquote(path))
                require(
                    source is not None and unquote(url.fragment) in heading_slugs(source.decode("utf-8")),
                    f"{label} has a broken main heading link to {href}",
                )
            continue

        target = workspace_target(root, file, url, github)
        if target is None:
            continue
        directory_link = github is not None and github[0] == "tree"

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


def validate_repo(root, repo, main_ref, baseline=None):
    manifest = read_manifest(root)
    if baseline:
        check_frozen_history(root, repo, baseline, manifest)

    _, public_version = check_archive(
        root, repo, root, ("README.md", "CHANGELOG.md"), manifest["public_readme"], "public README"
    )
    public_drafts = check_workspace(root, root / "workspace", "public README")
    hq = root / "readme-hq"
    hq_snapshot, hq_version = check_archive(
        root, repo, hq, ("README.md", "GUIDE.md", "CHANGELOG.md"), manifest["readme_hq"], "README HQ"
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

    front_page = root / "README.md"
    require(
        links_to(root, front_page, "versions/README.md")
        and links_to(root, front_page, "workspace/README.md"),
        "HQ front page must link to the public README version and workspace indexes",
    )
    if public_drafts and hq_drafts:
        hq_candidate = hq / "workspace" / hq_drafts[0] / "DRAFT.md"
        require(
            links_to(root, hq_candidate, f"workspace/{public_drafts[0]}/DRAFT.md"),
            "Latest README HQ draft does not directly link to the current public README draft",
        )

    markdown_files = (
        file for file in root.rglob("*.md") if ".git" not in file.parts and "__pycache__" not in file.parts
    )
    for file in sorted(markdown_files):
        check_links(root, repo, main_ref, file)

    return (
        f"public README {public_version} and README HQ {hq_version} archives, "
        "both workspace indexes, frozen snapshot checksums and Git sources, snapshot parity, "
        "draft pointers, and branch-local and main Markdown links"
    )


def run_regression_tests(root, repo, main_ref, baseline):
    cases = []

    def add_case(name, expected_message, mutate, *, check_history=False):
        cases.append((name, expected_message, mutate, check_history))

    def add_draft(workspace):
        version = "v999999.0.0"
        folder = workspace / version
        folder.mkdir()
        for name in ("README.md", "DRAFT.md"):
            (folder / name).write_text("# Regression draft\n", encoding="utf-8")
        index = workspace / "README.md"
        row = f"| {version} | Draft | [Workspace]({version}/README.md) |"
        index.write_text(f"{read(index)}\n{row}\n", encoding="utf-8")
        return folder

    def change_public_snapshot(fixture):
        path = fixture / "versions" / "v0.0.1" / "README.md"
        path.write_text(read(path) + "\n<!-- regression mutation -->\n", encoding="utf-8")

    def change_hq_snapshot_and_live_guide(fixture):
        latest = max(read_manifest(fixture)["readme_hq"], key=version_key)
        for relative in (
            Path("readme-hq/README.md"),
            Path(f"readme-hq/versions/{latest}/GUIDE.md"),
        ):
            path = fixture / relative
            path.write_text(read(path) + "\n<!-- regression mutation -->\n", encoding="utf-8")

    def change_hq_front_page_only(fixture):
        path = fixture / "README.md"
        path.write_text(read(path) + "\n<!-- regression mutation -->\n", encoding="utf-8")

    def remove_workspace_row(fixture, relative_path):
        path = fixture / relative_path
        path.write_text(WORKSPACE_ROW_RE.sub("", read(path), count=1), encoding="utf-8")

    def add_broken_draft_link(fixture):
        path = add_draft(fixture / "workspace") / "DRAFT.md"
        path.write_text(read(path) + "\n[Broken regression fixture](missing-target.md)\n", encoding="utf-8")

    def stale_candidate_draft_pointer(fixture):
        add_draft(fixture / "workspace")
        add_draft(fixture / "readme-hq/workspace")

    def change_source(fixture, path):
        manifest = read_manifest(fixture)
        manifest["public_readme"]["v0.0.1"]["source_paths"]["README.md"] = path
        (fixture / MANIFEST_PATH).write_text(json.dumps(manifest), encoding="utf-8")

    def add_broken_main_link(fixture):
        path = add_draft(fixture / "workspace") / "DRAFT.md"
        link = f"https://github.com{REPO_PREFIX}blob/main/docs/readme-hq-missing-fixture.md"
        path.write_text(read(path) + f"\n[Missing main path]({link})\n", encoding="utf-8")

    def remove_active_draft_file(fixture):
        (add_draft(fixture / "workspace") / "DRAFT.md").unlink()

    def change_frozen_changelog(fixture):
        path = fixture / "versions/v0.0.1/CHANGELOG.md"
        path.write_text(read(path) + "\n<!-- regression mutation -->\n", encoding="utf-8")

    add_case("public frozen README drift", "snapshot checksum mismatch", change_public_snapshot)
    add_case("HQ guide and live guide drift together", "snapshot checksum mismatch", change_hq_snapshot_and_live_guide)
    add_case("HQ front page drift", "front page differs from the latest HQ snapshot", change_hq_front_page_only)
    add_case(
        "public workspace index omission",
        "workspace index must list each version folder exactly once",
        lambda fixture: remove_workspace_row(fixture, "workspace/README.md"),
    )
    add_case(
        "HQ workspace index omission",
        "workspace index must list each version folder exactly once",
        lambda fixture: remove_workspace_row(fixture, "readme-hq/workspace/README.md"),
    )
    add_case("broken link inside DRAFT.md", "broken link to", add_broken_draft_link)
    add_case("stale HQ candidate draft pointer", "directly link to the current public README draft", stale_candidate_draft_pointer)
    add_case("missing recorded source", "recorded source is missing", lambda fixture: change_source(fixture, "missing-source.md"))
    add_case("wrong recorded source", "recorded source does not match", lambda fixture: change_source(fixture, "docs/VALIDATION.md"))
    add_case("broken link to main", "broken main link", add_broken_main_link)
    add_case("missing active draft file", "has no DRAFT.md", remove_active_draft_file)
    add_case(
        "rewrite an existing baseline record",
        "frozen baseline record changed",
        lambda fixture: change_source(fixture, "missing-source.md"),
        check_history=True,
    )
    add_case(
        "rewrite a frozen changelog",
        "frozen changelog changed",
        change_frozen_changelog,
        check_history=True,
    )

    for name, expected_message, mutate, check_history in cases:
        with tempfile.TemporaryDirectory(prefix="readme-hq-regression-") as temp_dir:
            fixture = Path(temp_dir) / "repo"
            shutil.copytree(root, fixture, ignore=shutil.ignore_patterns(".git", "__pycache__"))
            mutate(fixture)
            try:
                trusted = baseline if check_history else None
                validate_repo(fixture, repo, main_ref, trusted)
            except ValidationError as error:
                require(
                    expected_message in str(error),
                    f"Regression test for {name} failed for an unexpected reason: {error}",
                )
            else:
                raise ValidationError(f"Regression test did not reject {name}")

    with tempfile.TemporaryDirectory(prefix="readme-hq-regression-") as temp_dir:
        fixture = Path(temp_dir) / "repo"
        shutil.copytree(root, fixture, ignore=shutil.ignore_patterns(".git", "__pycache__"))
        workspace = fixture / "readme-hq/workspace"
        index = workspace / "README.md"
        index.write_text(
            WORKSPACE_ROW_RE.sub(
                lambda row: row[0].replace(f"| {row[2]} |", "| Archived (source draft retained) |"),
                read(index),
            ),
            encoding="utf-8",
        )
        require(
            not check_workspace(fixture, workspace, "README HQ"),
            "An archived workspace was classified as an active draft",
        )
        validate_repo(fixture, repo, main_ref)
        add_draft(fixture / "workspace")
        validate_repo(fixture, repo, main_ref, baseline)

    return len(cases)


def fetch_validation_refs(root, baseline):
    manifest = read_manifest(root)
    sources = {
        source
        for archive in ARCHIVES
        for record in manifest[archive].values()
        for source in record["source_commits"].values()
    }
    require(
        all(isinstance(source, str) and COMMIT_RE.fullmatch(source) for source in sources),
        "The manifest contains an invalid source commit",
    )
    if baseline != "HEAD":
        sources.add(baseline)
    refs = ["+refs/heads/main:refs/remotes/origin/main"]
    refs.extend(
        source
        for source in sorted(sources)
        if git(root, "cat-file", "-e", f"{source}^{{commit}}").returncode
    )
    shallow = git(root, "rev-parse", "--is-shallow-repository").stdout.strip() == b"true"
    depth = ["--depth=1"] if shallow else []
    result = git(root, "fetch", "--no-tags", *depth, "origin", *refs)
    require(
        result.returncode == 0,
        "Could not fetch README HQ validation refs: " + result.stderr.decode().strip(),
    )


def actions_baseline():
    if os.environ.get("GITHUB_ACTIONS") != "true":
        return None
    event = json.loads(read(Path(os.environ["GITHUB_EVENT_PATH"])))
    baseline = event.get("pull_request", {}).get("base", {}).get("sha") or event.get("before")
    return baseline if baseline and baseline != "0" * 40 else "HEAD"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--fetch-refs", action="store_true", help="Fetch main and the exact recorded source commits")
    parser.add_argument("--baseline", help="Trusted prior checkout used to protect existing archive records")
    args = parser.parse_args()
    try:
        actions = actions_baseline()
        baseline_ref = args.baseline or actions or "HEAD"
        if args.fetch_refs or actions:
            require(
                baseline_ref == "HEAD" or COMMIT_RE.fullmatch(baseline_ref),
                "The CI baseline must be an exact commit SHA",
            )
            fetch_validation_refs(ROOT, baseline_ref)
        baseline = git(ROOT, "rev-parse", "--verify", f"{baseline_ref}^{{commit}}")
        require(baseline.returncode == 0, "The trusted baseline commit is unavailable")
        baseline = baseline.stdout.decode().strip()
        main_ref = git(ROOT, "rev-parse", "--verify", "refs/remotes/origin/main^{commit}")
        require(main_ref.returncode == 0, "Fetch origin/main or rerun with --fetch-refs")
        main_ref = main_ref.stdout.decode().strip()
        head = git(ROOT, "rev-parse", "HEAD").stdout.decode().strip()
        print(f"Checkout: {head}\nPrior archive baseline: {baseline}\nMain link target: {main_ref}")
        summary = validate_repo(ROOT, ROOT, main_ref, baseline)
        print(f"PASS: {summary}.")
        regression_count = run_regression_tests(ROOT, ROOT, main_ref, baseline)
        print(f"PASS: {regression_count} negative fixtures rejected and 2 valid workspace transitions accepted.")
    except (ValidationError, OSError, ValueError, KeyError, TypeError, AttributeError) as error:
        raise SystemExit(str(error))


if __name__ == "__main__":
    main()
