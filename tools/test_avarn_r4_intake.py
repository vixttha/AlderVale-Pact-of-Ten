import hashlib
import unittest
from unittest.mock import patch
from avarn_r4_intake import verify_bytes, screen

class R4IntakeTests(unittest.TestCase):
    def test_same_size_wrong_digest(self):
        with patch("avarn_r4_intake.SOURCE_SIZE", 3), patch("avarn_r4_intake.SOURCE_SHA", hashlib.sha256(b"abc").hexdigest()):
            verify_bytes(b"abc")
            with self.assertRaisesRegex(ValueError, "SHA-256"):
                verify_bytes(b"abd")
            with self.assertRaisesRegex(ValueError, "size"):
                verify_bytes(b"ab")

    def fixture(self):
        points = [(-1,-1,0), (-1,-1,.1), (1,-1,0), (1,-1,.1), (0,0,0)]
        faces = [(0,1,4),(2,3,4)]
        anchors = {"left":(-1,.05),"right":(1,.05)}
        return points, faces, anchors

    def test_separate_then_join(self):
        p,f,a = self.fixture()
        r=screen(p,f,a,levels=(-.5,0),minimum=2)
        self.assertEqual([v["significant_components"] for v in r["snapshots"]],[2,1])
        self.assertEqual(r["status"],"GEOMETRY_SCREEN_PASS_REVIEW_REQUIRED")

    def test_premature_merge_rejected(self):
        p,f,a = self.fixture()
        with self.assertRaisesRegex(ValueError,"component count"):
            screen(p,f+[(0,1,2)],a,levels=(-.5,0),minimum=2)

    def test_missing_attachment_rejected(self):
        p,f,a = self.fixture()
        with self.assertRaisesRegex(ValueError,"component count"):
            screen(p,[(0,1,4),(2,3,3)],a,levels=(-.5,0),minimum=2)

    def test_missing_anchor_rejected(self):
        p,f,a = self.fixture()
        a["right"]=(8,8)
        with self.assertRaisesRegex(ValueError,"missing region"):
            screen(p,f,a,levels=(-.5,0),minimum=2)

if __name__ == "__main__":
    unittest.main()
