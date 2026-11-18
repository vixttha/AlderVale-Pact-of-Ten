"""Behavioral regressions for source provenance, registry and immutable history."""

import importlib.util
import json
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

MODULE = Path(__file__).resolve().parents[1] / "tools/graphify/version_maps.py"
spec = importlib.util.spec_from_file_location("launcher_maps", MODULE)
maps = importlib.util.module_from_spec(spec)
spec.loader.exec_module(maps)


class VersionContracts(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="launcher-version-fixture-")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.source = self.root / "workspace/v0.0.1"
        self.source.mkdir(parents=True)
        self.file = self.source / "README.md"
        self.file.write_text("# Fixture\n\n## Evidence\n", encoding="utf-8", newline="\n")
        self.archives = self.root / "versions"
        self.archives.mkdir()
        self.graphs = self.root / "Graphify HQ"
        self.graphs.mkdir()
        self.git("init", "--initial-branch=fixture")
        self.commit()
        sha = self.git("rev-parse", "HEAD").strip()
        self.record = {"status": "draft", "source_commit": sha,
                       "source_path": "workspace/v0.0.1", "snapshot_path": "workspace/v0.0.1"}
        self.manifest = {"schema_version": 1, "current_working": "v0.0.1",
                         "current_archived": None, "versions": {"v0.0.1": self.record}}
        self.write_manifest()
        self.addCleanup(patch.stopall)
        patch.object(maps, "ROOT", self.root).start()
        patch.object(maps, "ARCHIVE", self.archives).start()
        patch.object(maps, "MAPS", self.graphs).start()

    def git(self, *args):
        return subprocess.check_output(["git", "-C", str(self.root), *args],
                                       stderr=subprocess.DEVNULL).decode()

    def commit(self):
        self.git("add", "--all")
        self.git("-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid",
                 "-c", "core.hooksPath=__no_hooks__", "-c", "commit.gpgsign=false",
                 "-c", "core.autocrlf=false", "commit", "-m", "Synthetic version fixture")

    def write_manifest(self):
        (self.archives / "manifest.json").write_text(json.dumps(self.manifest), encoding="utf-8")

    def archive_fixture(self):
        shutil.copytree(self.source, self.archives / "v0.0.1")
        self.record.update(status="archived", snapshot_path="versions/v0.0.1")
        self.manifest.update(current_working=None, current_archived="v0.0.1")
        self.write_manifest()
        folder = self.graphs / "v0.0.1"
        folder.mkdir()
        (folder / "graph.json").write_text('{"fixture": true}\n', encoding="utf-8", newline="\n")
        self.commit()
        return self.git("rev-parse", "HEAD").strip()

    def test_valid_pinned_draft_and_archive(self):
        self.assertEqual(maps.load_manifest()["current_working"], "v0.0.1")
        self.assertEqual(set(maps.read_archive("v0.0.1", self.record)), {"README.md"})
        baseline = self.archive_fixture()
        self.assertEqual(maps.load_manifest()["current_archived"], "v0.0.1")
        maps.read_archive("v0.0.1", self.record)
        maps.check_frozen(baseline)

    def test_changed_source_bytes_rejected(self):
        self.file.write_text("# Tampered\n", encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "archived bytes differ"):
            maps.read_archive("v0.0.1", self.record)

    def test_missing_or_extra_source_file_rejected(self):
        self.file.unlink()
        with self.assertRaisesRegex(ValueError, "inventory differs"):
            maps.read_archive("v0.0.1", self.record)
        (self.source / "extra.md").write_text("# Extra\n", encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "inventory differs"):
            maps.read_archive("v0.0.1", self.record)

    def test_unindexed_version_rejected(self):
        (self.root / "workspace/v0.0.2").mkdir()
        with self.assertRaisesRegex(ValueError, "folders differ"):
            maps.load_manifest()

    def test_false_archive_status_rejected(self):
        self.record["status"] = "archived"
        self.write_manifest()
        with self.assertRaisesRegex(ValueError, "path/status mismatch"):
            maps.load_manifest()

    def test_short_sha_and_escaping_path_rejected(self):
        self.record["source_commit"] = "abc123"
        self.write_manifest()
        with self.assertRaisesRegex(ValueError, "full pinned source"):
            maps.load_manifest()
        self.record["source_commit"] = "a" * 40
        self.record["source_path"] = "../private"
        self.write_manifest()
        with self.assertRaisesRegex(ValueError, "Unsafe"):
            maps.load_manifest()

    def test_frozen_archive_bytes_rejected(self):
        baseline = self.archive_fixture()
        (self.archives / "v0.0.1/README.md").write_text("# Rewritten\n", encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "frozen bytes changed"):
            maps.check_frozen(baseline)

    def test_frozen_record_rewrite_rejected(self):
        baseline = self.archive_fixture()
        self.record["source_commit"] = "b" * 40
        self.write_manifest()
        with self.assertRaisesRegex(ValueError, "frozen archive record changed"):
            maps.check_frozen(baseline)

    def test_frozen_map_rewrite_rejected(self):
        baseline = self.archive_fixture()
        (self.graphs / "v0.0.1/graph.json").write_text("{}\n", encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "frozen bytes changed"):
            maps.check_frozen(baseline)

    def test_missing_and_altered_maps_rejected(self):
        generated = self.root / "expected"
        generated.mkdir()
        (generated / "receipt.json").write_text("expected", encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "missing="):
            maps.compare(generated)
        (self.graphs / "receipt.json").write_text("altered", encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "changed="):
            maps.compare(generated)

    def test_fake_missing_baseline_is_not_initial_setup(self):
        with self.assertRaises(subprocess.CalledProcessError):
            maps.check_frozen("f" * 40)


if __name__ == "__main__":
    unittest.main()
