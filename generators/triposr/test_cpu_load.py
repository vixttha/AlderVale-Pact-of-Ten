import hashlib
from pathlib import Path
import tempfile
import unittest
from cpu_load import verify_digest, require


class ReceiptContracts(unittest.TestCase):
    def test_matching_digest(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "fixture"
            path.write_bytes(b"fixture")
            expected = hashlib.sha256(b"fixture").hexdigest()
            self.assertEqual(verify_digest(path, expected), expected)

    def test_corrupted_digest_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "fixture"
            path.write_bytes(b"corrupt")
            with self.assertRaisesRegex(ValueError, "SHA-256 mismatch"):
                verify_digest(path, hashlib.sha256(b"fixture").hexdigest())

    def test_missing_weights_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            with self.assertRaises(FileNotFoundError):
                verify_digest(Path(tmp) / "missing", "0" * 64)

    def test_failed_runtime_contract_rejected(self):
        with self.assertRaisesRegex(RuntimeError, "test"):
            require(False, "test")


if __name__ == "__main__":
    unittest.main()
