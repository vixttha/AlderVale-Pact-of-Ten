import tempfile,unittest
from pathlib import Path
from unittest.mock import patch
import hashlib
import reference
class InputContract(unittest.TestCase):
    def test_missing(self):
        with tempfile.TemporaryDirectory() as d:
            with self.assertRaises(ValueError):reference.verify_reference(Path(d)/"missing.png")
    def test_wrong_bytes_same_size(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)/"fake.png";p.write_bytes(b"x"*reference.SIZE)
            with self.assertRaisesRegex(ValueError,"SHA-256"):reference.verify_reference(p)
    def test_valid_bytes_and_symlink(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)/"input.png";data=b"test fixture";p.write_bytes(data)
            with patch.object(reference,"SIZE",len(data)),patch.object(reference,"EXPECTED",hashlib.sha256(data).hexdigest()):
                self.assertEqual(reference.verify_reference(p),p)
                link=Path(d)/"link.png";link.symlink_to(p)
                with self.assertRaises(ValueError):reference.verify_reference(link)
    @unittest.skipUnless(reference.INPUT.is_file(),"owner file not uploaded")
    def test_actual_input(self):
        self.assertEqual(reference.verify_reference(reference.INPUT),reference.INPUT)
