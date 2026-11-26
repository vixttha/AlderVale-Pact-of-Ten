import json,tempfile,unittest,zipfile
from pathlib import Path
from package import verify,sha
class ZipContracts(unittest.TestCase):
    def run_case(self,data=b"glb",extra=None,manifest_data=b"glb"):
        manifest={"files":{"candidate.glb":{"bytes":len(manifest_data),"sha256":sha(manifest_data)}}}
        with tempfile.TemporaryDirectory() as tmp:
            p=Path(tmp)/"test.zip"
            with zipfile.ZipFile(p,"w") as z:
                z.writestr("candidate.glb",data);z.writestr("manifest.json",json.dumps(manifest))
                if extra: z.writestr(extra,b"x")
            verify(p,manifest)
    def test_valid(self): self.run_case()
    def test_changed(self):
        with self.assertRaisesRegex(ValueError,"digest"): self.run_case(b"bad")
    def test_traversal(self):
        with self.assertRaisesRegex(ValueError,"unexpected"): self.run_case(extra="../escape")
    def test_extra_file(self):
        with self.assertRaisesRegex(ValueError,"unexpected"): self.run_case(extra="other")
