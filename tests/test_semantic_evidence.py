"""Reject invalid retained semantic evidence without invoking a model."""
import hashlib
import json
import unittest
from pathlib import Path
import test_versioning as fixtures

maps = fixtures.maps


class SemanticContracts(unittest.TestCase):
    git = fixtures.VersionContracts.git
    commit = fixtures.VersionContracts.commit
    write_manifest = fixtures.VersionContracts.write_manifest

    def setUp(self):
        fixtures.VersionContracts.setUp(self)
        self.record["semantic_artifact"] = "tools/semantic.json"
        self.target = self.root / self.record["semantic_artifact"]
        self.target.parent.mkdir()
        self.sources = maps.read_archive("v0.0.1", self.record)
        self.data = {
            "source_commit": self.record["source_commit"],
            "source_files": {"workspace/v0.0.1/README.md": hashlib.sha256(self.file.read_bytes()).hexdigest()},
            "extraction": {"nodes": [{"id": "fixture_doc", "label": "Fixture", "file_type": "document",
                                     "source_file": "workspace/v0.0.1/README.md", "source_location": "L1"}],
                           "edges": [], "hyperedges": []}}
        self.save()

    def save(self):
        self.target.write_text(json.dumps(self.data), encoding="utf-8")

    def test_retained_evidence_matches_real_source(self):
        maps.semantic_maps.retained_extraction(self.root, self.record, self.sources)

    def test_retained_corpus_tampering_rejected(self):
        self.data["source_files"]["workspace/v0.0.1/README.md"] = "0" * 64
        self.save()
        with self.assertRaisesRegex(ValueError, "pinned corpus"):
            maps.semantic_maps.retained_extraction(self.root, self.record, self.sources)

    def test_out_of_range_source_location_rejected(self):
        self.data["extraction"]["nodes"][0]["source_location"] = "L999"
        self.save()
        with self.assertRaisesRegex(ValueError, "outside source"):
            maps.semantic_maps.retained_extraction(self.root, self.record, self.sources)

    def test_unknown_semantic_endpoint_rejected(self):
        self.data["extraction"]["edges"] = [
            {"source": "fixture_doc", "target": "missing", "relation": "references",
             "confidence": "EXTRACTED", "confidence_score": 1.0,
             "source_file": "workspace/v0.0.1/README.md", "source_location": "L1"}]
        self.save()
        with self.assertRaisesRegex(ValueError, "unknown endpoint"):
            maps.semantic_maps.retained_extraction(self.root, self.record, self.sources)
