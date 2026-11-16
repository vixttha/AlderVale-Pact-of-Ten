"""Validate README HQ archives and navigation against the checkout and its Git history."""

import argparse
import hashlib
import http.client
import ipaddress
import json
import os
import re
import shutil
import socket
import ssl
import subprocess
import tempfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.parse import quote, unquote, urljoin, urlsplit, urlunsplit

ROOT = Path(__file__).resolve().parents[1]
REPO_PREFIX = "/vixttha/AlderVale-Pact-of-Ten/"
VERSION_ROW_RE = re.compile(r"^\|\s*(v\d+\.\d+\.\d+)\s*\|", re.MULTILINE)
WORKSPACE_ROW_RE = re.compile(
    r"^\|\s*(v\d+\.\d+\.\d+)\s*\|\s*([^|]+?)\s*\|\s*\[[^\]]+\]\(([^)]+)\)\s*\|$",
    re.MULTILINE,
)
LINK_RE = re.compile(r"!?\[[^\]]*\]\(([^)\s]+)(?:\s+[^)]*)?\)")
REFERENCE_LINK_RE = re.compile(r"^\s{0,3}\[[^\]]+\]:\s*(?:<([^>]+)>|(\S+))", re.MULTILINE)
AUTOLINK_RE = re.compile(r"<(https?://[^>\s]+)>", re.IGNORECASE)
HTML_URL_ATTR_RE = re.compile(r"""\b(?:href|src|poster|action)\s*=\s*(['"])(.*?)\1""", re.IGNORECASE)
BARE_URL_RE = re.compile(r"(?i)(?<![\w\"'=])https?://[^\s<>\x60\[\]()]+")
MAX_EXTERNAL_LINKS = 200
MAX_REDIRECTS = 5
EXTERNAL_TIMEOUT_SECONDS = 8
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



def markdown_links(markdown):
    """Extract clickable Markdown, reference, autolink and HTML href destinations."""
    markdown = re.sub(
        r"(?ms)^ {0,3}(?:\x60{3,}|~{3,})[^\n]*\n.*?^ {0,3}(?:\x60{3,}|~{3,})[^\n]*(?:\n|$)",
        "",
        markdown,
    )
    markdown = re.sub(r"\x60+[^ \n]*?\x60+", "", markdown)
    values = [match.group(1) for match in LINK_RE.finditer(markdown)]
    values.extend(
        match.group(1) or match.group(2)
        for match in REFERENCE_LINK_RE.finditer(markdown)
    )
    values.extend(match.group(1) for match in AUTOLINK_RE.finditer(markdown))
    values.extend(match.group(2) for match in HTML_URL_ATTR_RE.finditer(markdown))
    values.extend(match.group(0) for match in BARE_URL_RE.finditer(markdown))

    result = []
    seen = set()
    for value in values:
        value = value.strip().strip("<>")
        while value and value[-1] in ".,;:!?":
            value = value[:-1]
        while value.endswith(")") and value.count(")") > value.count("("):
            value = value[:-1]
        if value and value not in seen:
            seen.add(value)
            result.append(value)
    return result

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



def parse_link_url(href, label):
    try:
        return urlsplit(href)
    except ValueError as error:
        raise ValidationError(f"{label} has a malformed URL {href}: {error}") from error

def links_to(root, file, relative_path):
    expected = root / relative_path
    for href in markdown_links(read(file)):
        url = parse_link_url(href, file.relative_to(root))
        target = workspace_target(root, file, url, github_target(url))
        if target is not None and target.resolve() == expected:
            return True
    return False


def check_links(root, repo, main_ref, file):
    label = file.relative_to(root)
    for href in markdown_links(read(file)):
        url = parse_link_url(href, label)
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



def is_loopback_host(host):
    if not host:
        return False
    normalized = host.strip("[]").lower().rstrip(".")
    if normalized == "localhost" or normalized.endswith(".localhost"):
        return True
    try:
        return ipaddress.ip_address(normalized.split("%", 1)[0]).is_loopback
    except ValueError:
        return False


def validate_external_target(url):
    """Resolve only public HTTP(S) destinations and return pinned public addresses."""
    parsed = urlsplit(url)
    scheme = parsed.scheme.lower()
    require(scheme in {"http", "https"}, "only HTTP and HTTPS external links are allowed")
    require(parsed.hostname is not None, "external link has no hostname")
    require(parsed.username is None and parsed.password is None, "credentials in external URLs are not allowed")
    host = parsed.hostname.rstrip(".")
    require(not is_loopback_host(host), "external link or redirect targets loopback")
    require(
        not host.endswith((".local", ".internal", ".test", ".invalid")),
        "external link targets a reserved local hostname",
    )
    try:
        port = parsed.port
    except ValueError as error:
        raise ValidationError("external link has an invalid port") from error
    expected_port = 443 if scheme == "https" else 80
    require(port is None or port == expected_port, "external links may use only standard HTTP(S) ports")
    port = port or expected_port
    try:
        ascii_host = host.encode("idna").decode("ascii")
    except UnicodeError as error:
        raise ValidationError("external link has an invalid hostname") from error

    try:
        literal = ipaddress.ip_address(ascii_host.split("%", 1)[0])
    except ValueError:
        records = socket.getaddrinfo(ascii_host, port, type=socket.SOCK_STREAM)
        addresses = []
        for record in records:
            address = record[4][0].split("%", 1)[0]
            try:
                parsed_address = ipaddress.ip_address(address)
            except ValueError:
                continue
            if parsed_address.is_global and address not in addresses:
                addresses.append(address)
    else:
        addresses = [ascii_host] if literal.is_global else []

    require(addresses, "external hostname does not resolve to a public IP address")
    return ascii_host, port, addresses


class PinnedConnectionMixin:
    """Connect to a previously validated public IP while preserving the URL host."""

    def __init__(self, host, address, port, timeout, **kwargs):
        self._pinned_address = address
        super().__init__(host, port, timeout=timeout, **kwargs)

    def connect(self):
        raw = socket.create_connection((self._pinned_address, self.port), self.timeout)
        if self._secure:
            try:
                self.sock = self._context.wrap_socket(raw, server_hostname=self.host)
            except Exception:
                raw.close()
                raise
        else:
            self.sock = raw

    def putrequest(self, method, url, skip_host=False, skip_accept_encoding=False):
        super().putrequest(method, url, skip_host=True, skip_accept_encoding=skip_accept_encoding)
        host_header = f"[{self.host}]" if ":" in self.host else self.host
        default_port = 443 if self._secure else 80
        if self.port != default_port:
            host_header = f"{host_header}:{self.port}"
        self.putheader("Host", host_header)


class PinnedHTTPConnection(PinnedConnectionMixin, http.client.HTTPConnection):
    _secure = False


class PinnedHTTPSConnection(PinnedConnectionMixin, http.client.HTTPSConnection):
    _secure = True



def request_public_url(url, method):
    host, port, addresses = validate_external_target(url)
    parsed = urlsplit(url)
    path = quote(parsed.path or "/", safe="/:@-._~")
    if parsed.query:
        path += "?" + quote(parsed.query, safe="=&%/:?@-._~+")
    last_error = None
    for address in addresses[:4]:
        connection = None
        try:
            if parsed.scheme.lower() == "https":
                connection = PinnedHTTPSConnection(
                    host, address, port, EXTERNAL_TIMEOUT_SECONDS, context=ssl.create_default_context()
                )
            else:
                connection = PinnedHTTPConnection(host, address, port, EXTERNAL_TIMEOUT_SECONDS)
            headers = {
                "User-Agent": "AlderVale-README-HQ-Link-Checker/1.0",
                "Accept": "*/*",
                "Connection": "close",
            }
            if method == "GET":
                headers["Range"] = "bytes=0-0"
            connection.request(method, path, headers=headers)
            response = connection.getresponse()
            result = response.status, {key.lower(): value for key, value in response.getheaders()}
            if method == "GET":
                response.read(1)
            return result
        except ssl.SSLCertVerificationError:
            raise
        except (OSError, http.client.HTTPException) as error:
            last_error = error
        finally:
            if connection is not None:
                connection.close()
    if last_error is not None:
        raise last_error
    raise OSError("No public address could be reached")


def probe_external_url(url, transport=None, target_validator=None):
    """Return PASS, FAIL or UNVERIFIED; validate every redirect before connecting."""
    transport = transport or request_public_url
    target_validator = target_validator or validate_external_target
    current = url
    method = "HEAD"
    seen = set()

    for redirect_count in range(MAX_REDIRECTS + 1):
        key = (urlunsplit(urlsplit(current)._replace(fragment="")), method)
        if key in seen:
            return "FAIL", "redirect loop detected"
        seen.add(key)
        try:
            target_validator(current)
            status, headers = transport(current, method)
        except socket.gaierror:
            return "FAIL", "DNS lookup failed"
        except ssl.SSLCertVerificationError:
            return "FAIL", "TLS certificate verification failed"
        except ValidationError as error:
            return "FAIL", str(error)
        except (TimeoutError, socket.timeout):
            return "UNVERIFIED", "connection timed out"
        except (OSError, http.client.HTTPException):
            return "UNVERIFIED", "network or HTTP protocol error"

        location = headers.get("location") or headers.get("Location")
        if status in {301, 302, 303, 307, 308} and location:
            if redirect_count >= MAX_REDIRECTS:
                return "FAIL", "too many redirects"
            current = urljoin(current, location)
            method = "HEAD"
            continue

        if method == "HEAD" and status in {403, 405, 501}:
            method = "GET"
            continue
        if 200 <= status < 300 or status == 304:
            return "PASS", f"HTTP {status}"
        if status in {401, 403, 408, 425, 429} or 500 <= status < 600:
            return "UNVERIFIED", f"HTTP {status} did not permit a reliable automated check"
        if status in {404, 410}:
            return "FAIL", f"HTTP {status}"
        if 300 <= status < 400:
            return "UNVERIFIED", f"HTTP {status} returned no usable redirect"
        if 400 <= status < 500:
            return "FAIL", f"HTTP {status}"
        return "UNVERIFIED", f"unexpected HTTP {status}"

    return "FAIL", "too many redirects"


def safe_external_display(url):
    parsed = urlsplit(url)
    return urlunsplit((parsed.scheme, parsed.netloc, parsed.path, "", ""))


def collect_external_links(root):
    """Collect unique public HTTP(S) URLs, excluding links checked against Git refs."""
    links = {}
    skipped_loopback = 0
    unsupported = []
    markdown_files = (
        file for file in root.rglob("*.md") if ".git" not in file.parts and "__pycache__" not in file.parts
    )
    for file in sorted(markdown_files):
        relative = file.relative_to(root).as_posix()
        for href in markdown_links(read(file)):
            try:
                parsed = urlsplit(href)
            except ValueError:
                unsupported.append(f"{relative}: malformed URL")
                continue
            scheme = parsed.scheme.lower()
            if not scheme and parsed.netloc:
                scheme = "https"
            elif scheme in {"mailto", "tel"}:
                continue
            elif not scheme:
                continue
            if scheme not in {"http", "https"}:
                unsupported.append(f"{relative}: unsupported URL scheme {scheme}")
                continue
            github = github_target(parsed)
            if github and github[1] in {"main", "readme-hq"}:
                continue
            if is_loopback_host(parsed.hostname):
                skipped_loopback += 1
                continue
            normalized = urlunsplit((scheme, parsed.netloc, parsed.path, parsed.query, ""))
            if len(normalized) > 2048:
                unsupported.append(f"{relative}: URL exceeds 2048 characters")
                continue
            links.setdefault(normalized, set()).add(relative)

    require(not unsupported, "Unsupported Markdown URL(s): " + "; ".join(unsupported[:10]))
    require(len(links) <= MAX_EXTERNAL_LINKS, f"External URL count exceeds the safety limit of {MAX_EXTERNAL_LINKS}")
    return links, skipped_loopback


def check_external_links(root, probe=None):
    """Check all public HTTP(S) Markdown links; blocked sites remain explicitly unverified."""
    probe = probe or probe_external_url
    links, skipped_loopback = collect_external_links(root)
    if not links:
        return f"0 public HTTP(S) links; {skipped_loopback} local loopback examples skipped"

    def run_one(item):
        url, sources = item
        try:
            status, detail = probe(url)
        except Exception as error:
            status, detail = "UNVERIFIED", f"checker exception: {type(error).__name__}"
        return url, sources, status, detail

    with ThreadPoolExecutor(max_workers=min(8, len(links))) as executor:
        results = list(executor.map(run_one, sorted(links.items())))

    failures = []
    warnings = []
    passed = 0
    for url, sources, status, detail in results:
        source_list = ", ".join(sorted(sources))
        if status == "PASS":
            passed += 1
        elif status == "UNVERIFIED":
            warnings.append((url, source_list, detail))
        else:
            failures.append((url, source_list, detail))

    for url, sources, detail in warnings:
        print(f"WARNING: external URL unverified: {safe_external_display(url)} ({detail}); referenced by {sources}")
    require(
        not failures,
        "Broken or unsafe external URL(s): "
        + "; ".join(
            f"{safe_external_display(url)} ({detail}; {sources})"
            for url, sources, detail in failures[:10]
        ),
    )
    return (
        f"{len(links)} public HTTP(S) links checked: {passed} PASS, "
        f"{len(warnings)} UNVERIFIED, {skipped_loopback} local loopback examples skipped"
    )


def validate_repo(root, repo, main_ref, baseline=None, check_external=True):
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

    external_summary = check_external_links(root) if check_external else "external URL network checks skipped for fixtures"
    return (
        f"public README {public_version} and README HQ {hq_version} archives, "
        "both workspace indexes, frozen snapshot checksums and Git sources, snapshot parity, "
        "draft pointers, and branch-local and current-main Markdown links; "
        f"{external_summary}"
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
                validate_repo(fixture, repo, main_ref, trusted, check_external=False)
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
        validate_repo(fixture, repo, main_ref, check_external=False)
        add_draft(fixture / "workspace")
        validate_repo(fixture, repo, main_ref, baseline, check_external=False)

    return len(cases)



def run_external_link_regression_tests():
    cases = 0
    with tempfile.TemporaryDirectory(prefix="readme-hq-external-") as temp_dir:
        fixture = Path(temp_dir)
        (fixture / "README.md").write_text(
            "\n".join(
                [
                    "[Good](https://good.example/path)",
                    "[Good duplicate](https://good.example/path)",
                    "[Blocked](https://blocked.example/path)",
                    "[Broken](https://broken.example/missing)",
                    "[Local](http://localhost:3000)",
                    "[Email](mailto:help@example.com)",
                    "<https://autolink.example/path>",
                    "[reference]: https://reference.example/path",
                    '<a href="https://html.example/path">HTML link</a>',
                    '<img src="https://image.example/picture.png">',
                    "[Protocol relative](//relative.example/path)",
                    "Bare URL: https://bare.example/path.",
                ]
            ),
            encoding="utf-8",
        )
        links, skipped = collect_external_links(fixture)
        require(len(links) == 9, f"Markdown URL extraction expected 9 unique links, found {len(links)}")
        require(skipped == 1, "The localhost development example was not skipped")
        require("https://good.example/path" in links, "Inline Markdown links were not extracted")
        require("https://reference.example/path" in links, "Reference links were not extracted")
        require("https://autolink.example/path" in links, "Autolinks were not extracted")
        require("https://html.example/path" in links, "HTML href links were not extracted")
        require("https://image.example/picture.png" in links, "HTML src links were not extracted")
        require("https://relative.example/path" in links, "Protocol-relative links were not normalized")
        cases += 1

        def mixed_probe(url):
            if "blocked.example" in url:
                return "UNVERIFIED", "HTTP 403"
            return "PASS", "HTTP 200"

        summary = check_external_links(fixture, mixed_probe)
        require("9 public HTTP(S) links checked" in summary, "External link summary omitted checked URLs")
        require("1 UNVERIFIED" in summary and "1 local loopback" in summary, "External warning summary is incomplete")
        cases += 1

        def broken_probe(url):
            if "broken.example" in url:
                return "FAIL", "HTTP 404"
            return "PASS", "HTTP 200"

        try:
            check_external_links(fixture, broken_probe)
        except ValidationError as error:
            require("HTTP 404" in str(error), "Broken external link failed for the wrong reason")
        else:
            raise ValidationError("External link checker accepted a 404 URL")
        cases += 1

    calls = []

    def redirect_transport(url, method):
        calls.append((url, method))
        if url.endswith("/start"):
            return 302, {"location": "/final"}
        return 200, {}

    status, _ = probe_external_url(
        "https://public.example/start",
        transport=redirect_transport,
        target_validator=lambda url: None,
    )
    require(status == "PASS" and len(calls) == 2, "A valid public redirect was not followed")
    cases += 1

    private_calls = []

    def private_redirect_transport(url, method):
        private_calls.append(url)
        return 302, {"location": "http://127.0.0.1/private"}

    def reject_private_redirect(url):
        if "127.0.0.1" in url:
            raise ValidationError("loopback redirect blocked")

    status, detail = probe_external_url(
        "https://public.example/start",
        transport=private_redirect_transport,
        target_validator=reject_private_redirect,
    )
    require(status == "FAIL" and "loopback" in detail, "A redirect to loopback was not blocked")
    require(len(private_calls) == 1, "The checker attempted a request to the blocked redirect")
    cases += 1

    fallback_calls = []

    def fallback_transport(url, method):
        fallback_calls.append(method)
        return (405, {}) if method == "HEAD" else (206, {})

    status, _ = probe_external_url(
        "https://public.example/fallback",
        transport=fallback_transport,
        target_validator=lambda url: None,
    )
    require(status == "PASS" and fallback_calls == ["HEAD", "GET"], "HEAD-to-GET fallback failed")
    cases += 1

    blocked_calls = []

    def blocked_transport(url, method):
        blocked_calls.append(method)
        return 403, {}

    status, _ = probe_external_url(
        "https://public.example/blocked",
        transport=blocked_transport,
        target_validator=lambda url: None,
    )
    require(status == "UNVERIFIED" and blocked_calls == ["HEAD", "GET"], "403 was not classified as UNVERIFIED")
    cases += 1

    status, detail = probe_external_url(
        "https://public.example/missing",
        transport=lambda url, method: (404, {}),
        target_validator=lambda url: None,
    )
    require(status == "FAIL" and detail == "HTTP 404", "404 was not classified as a broken external link")
    cases += 1

    status, detail = probe_external_url(
        "https://public.example/loop",
        transport=lambda url, method: (302, {"location": "/loop"}),
        target_validator=lambda url: None,
    )
    require(status == "FAIL" and "loop" in detail, "Redirect loops were not rejected")
    cases += 1

    try:
        validate_external_target("http://127.0.0.1/private")
    except ValidationError:
        pass
    else:
        raise ValidationError("A private IP literal was accepted as an external destination")
    cases += 1

    try:
        parse_link_url("https://[malformed/path", "README.md")
    except ValidationError as error:
        require("README.md" in str(error) and "malformed URL" in str(error), "Malformed URL lacked a useful source diagnostic")
    else:
        raise ValidationError("A malformed IPv6-style URL was accepted")
    cases += 1

    return cases

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
    # Refresh origin/main at run time; the PR event base is only the frozen-archive baseline.
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
        external_regression_count = run_external_link_regression_tests()
        print(f"PASS: {external_regression_count} external-link regression cases.")
    except (ValidationError, OSError, ValueError, KeyError, TypeError, AttributeError) as error:
        raise SystemExit(str(error))


if __name__ == "__main__":
    main()
