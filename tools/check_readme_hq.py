"""Validate the two README archives and navigation within README HQ."""

import re
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
BRANCH_PREFIX = "/vixttha/AlderVale-Pact-of-Ten/blob/readme-hq/"


def require(condition, message):
    if not condition:
        raise SystemExit(message)


def read(path):
    return path.read_text(encoding="utf-8")


def check_archive(base):
    versions = base / "versions"
    index = read(versions / "README.md")
    rows = re.findall(r"^\| (v\d+\.\d+\.\d+) \|", index, re.MULTILINE)
    folders = {item.name for item in versions.iterdir() if item.is_dir()}
    require(rows and len(rows) == len(folders) and set(rows) == folders,
            f"{versions.relative_to(ROOT)} must list each version exactly once")
    require(rows == sorted(rows, key=lambda v: tuple(map(int, v[1:].split("."))), reverse=True),
            f"{versions.relative_to(ROOT)} must list newest versions first")
    for version in rows:
        for filename in ("README.md", "CHANGELOG.md"):
            require((versions / version / filename).is_file(),
                    f"{versions.relative_to(ROOT)}/{version}/{filename} is missing")
            require(f"]({version}/{filename})" in index,
                    f"{versions.relative_to(ROOT)} does not link to {version}/{filename}")
        require((base / "workspace" / version / "README.md").is_file(),
                f"{base.relative_to(ROOT)}/workspace/{version}/README.md is missing")
    return versions / rows[0] / "README.md", rows[0]


def check_links(file):
    for href in re.findall(r"\]\(([^)\s]+)\)", read(file)):
        url = urlsplit(href)
        if url.netloc == "github.com" and url.path.startswith(BRANCH_PREFIX):
            target = ROOT / unquote(url.path.removeprefix(BRANCH_PREFIX))
        elif not url.scheme and not url.netloc:
            target = file.parent / unquote(url.path) if url.path else file
        else:
            continue
        require(target.resolve().is_relative_to(ROOT) and target.is_file(),
                f"{file.relative_to(ROOT)} has a broken link to {href}")
        if url.fragment:
            headings = re.findall(r"^#{1,6} (.+)$", read(target), re.MULTILINE)
            slugs = {re.sub(r"[^\w -]", "", h.lower()).replace(" ", "-") for h in headings}
            require(unquote(url.fragment) in slugs,
                    f"{file.relative_to(ROOT)} has a broken heading link to {href}")


_, public_version = check_archive(ROOT)
hq = ROOT / "readme-hq"
hq_snapshot, hq_version = check_archive(hq)
require((ROOT / "README.md").read_bytes() == hq_snapshot.read_bytes(),
        "The HQ front page differs from the latest HQ snapshot")
require(f"**Current HQ version:** `{hq_version}`" in read(hq / "README.md"),
        "The current HQ version pointer does not match the latest snapshot")
for file in (*ROOT.glob("**/README.md"), *ROOT.glob("**/CHANGELOG.md")):
    check_links(file)

print(f"PASS: public README {public_version} and README HQ {hq_version} archives, workspace records, snapshot parity, and internal navigation.")
