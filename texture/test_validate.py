import tempfile
from pathlib import Path
import unittest
from validate import parse

VALID="mtllib material.mtl\nv 0 0 0\nv 1 0 0\nv 0 1 0\nvt 0 0\nvt 1 0\nvt 0 1\nusemtl baked\nf 1/1 2/2 3/3\n"
class Contracts(unittest.TestCase):
    def check(self,s):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)/"mesh.obj";p.write_text(s);return parse(p)
    def test_valid(self):
        self.assertEqual(len(self.check(VALID)[2]),1)
    def test_bad_uv(self):
        with self.assertRaises(ValueError): self.check(VALID.replace("vt 1 0","vt 2 0"))
    def test_bad_index(self):
        with self.assertRaises(ValueError): self.check(VALID.replace("3/3","3/4"))
    def test_path_escape(self):
        with self.assertRaises(ValueError): self.check(VALID.replace("material.mtl","../material.mtl"))
    def test_nonfinite(self):
        with self.assertRaises(ValueError): self.check(VALID.replace("vt 0 0","vt nan 0"))
