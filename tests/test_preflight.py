import hashlib
import json
from pathlib import Path
import tempfile
import unittest
from scripts.preflight import PNG, validate

class IntakeTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        # Signature-only fixture, deliberately not a decoded PNG.
        content = PNG + b"synthetic-signature-fixture"
        (self.root / "ref.png").write_bytes(content)
        self.data = {"schema":1,"asset_id":"test-creature","reference":{"path":"ref.png","sha256":hashlib.sha256(content).hexdigest()},"additional_views":[],"anatomy":"synthetic","owner_scope":"fixture only","model":"spar3d","budgets":{"runtime_triangles":30000,"texture_px":2048,"max_minutes":120}}
    def test_valid_intake(self):
        validate(self.data,self.root)
    def test_blank_template(self):
        blank=json.loads(Path("templates/asset.json").read_text())
        validate(blank,self.root,True)
        with self.assertRaises(ValueError):
            validate(blank,self.root)
    def test_missing_file(self):
        (self.root/"ref.png").unlink()
        with self.assertRaises(ValueError):
            validate(self.data,self.root)
    def test_bad_hash(self):
        self.data["reference"]["sha256"]="0"*64
        with self.assertRaises(ValueError):
            validate(self.data,self.root)
    def test_traversal(self):
        self.data["reference"]["path"]="../ref.png"
        with self.assertRaises(ValueError):
            validate(self.data,self.root)
    def test_symlink(self):
        (self.root/"link.png").symlink_to(self.root/"ref.png")
        self.data["reference"]["path"]="link.png"
        with self.assertRaises(ValueError):
            validate(self.data,self.root)
    def test_wrong_signature(self):
        (self.root/"ref.png").write_bytes(b"bad")
        self.data["reference"]["sha256"]=hashlib.sha256(b"bad").hexdigest()
        with self.assertRaises(ValueError):
            validate(self.data,self.root)
    def test_wrong_model(self):
        self.data["model"]="cuda-only"
        with self.assertRaises(ValueError):
            validate(self.data,self.root)
    def test_budget(self):
        self.data["budgets"]["max_minutes"]=241
        with self.assertRaises(ValueError):
            validate(self.data,self.root)
    def test_extra_fields(self):
        self.data["command"]="untrusted"
        with self.assertRaises(ValueError):
            validate(self.data,self.root)
    def test_extra_view_mismatch(self):
        self.data["additional_views"]=[{"path":"ref.png","sha256":"0"*64}]
        with self.assertRaises(ValueError):
            validate(self.data,self.root)
