from pathlib import Path
import tempfile
import unittest
from validate_obj import read_obj

TRIANGLE = "v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n"


class ObjContracts(unittest.TestCase):
    def parse(self, text):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "mesh.obj"
            path.write_text(text, encoding="ascii")
            return read_obj(path)

    def test_triangle(self):
        v, f, bounds = self.parse(TRIANGLE)
        self.assertEqual(f, [(0, 1, 2)])
        self.assertEqual(bounds, [[0, 0, 0], [1, 1, 0]])

    def test_missing_faces(self):
        with self.assertRaisesRegex(ValueError, "empty geometry"):
            self.parse(TRIANGLE.split("f ")[0])

    def test_nonfinite_vertex(self):
        with self.assertRaisesRegex(ValueError, "non-finite"):
            self.parse(TRIANGLE.replace("v 0 0 0", "v nan 0 0"))

    def test_bad_index(self):
        with self.assertRaisesRegex(ValueError, "index outside"):
            self.parse(TRIANGLE.replace("f 1 2 3", "f 1 2 4"))

    def test_zero_index(self):
        with self.assertRaisesRegex(ValueError, "index outside"):
            self.parse(TRIANGLE.replace("f 1 2 3", "f 0 2 3"))

    def test_repeated_index(self):
        with self.assertRaisesRegex(ValueError, "repeated"):
            self.parse(TRIANGLE.replace("f 1 2 3", "f 1 2 2"))

    def test_no_materials(self):
        with self.assertRaises(ValueError):
            self.parse(TRIANGLE + "mtllib other.mtl\n")
