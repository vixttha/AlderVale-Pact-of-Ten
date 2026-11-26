import struct
import json
import unittest
import hashlib
from unittest.mock import patch
from avarn_intake import load_glb, verify_source, guarded_region, contact_counts, PADS

class IntakeTests(unittest.TestCase):
    def test_glb_header(self):
        j=json.dumps({"asset":{"version":"2.0"}}).encode()
        j+=b" "*(-len(j)%4)
        body=struct.pack("<I4s",len(j),b"JSON")+j+struct.pack("<I4s",4,b"BIN\x00")+b"1234"
        raw=struct.pack("<4sII",b"glTF",2,12+len(body))+body
        self.assertEqual(bytes(load_glb(raw)[1]),b"1234")
        with self.assertRaisesRegex(ValueError,"header"):
            load_glb(raw[:-1])
        with self.assertRaisesRegex(ValueError,"SHA-256"):
            verify_source(raw)

    def test_same_size_wrong_digest_rejected_before_geometry(self):
        raw = b"same-size-source"
        digest = hashlib.sha256(b"wrong").hexdigest()
        with patch("avarn_intake.SOURCE_SIZE", len(raw)), patch("avarn_intake.SOURCE_SHA", digest), patch("avarn_intake.geometry") as decode:
            with self.assertRaisesRegex(ValueError, "SHA-256"):
                verify_source(raw)
            decode.assert_not_called()

    def test_same_size_matching_digest_reaches_geometry(self):
        raw = b"same-size-source"
        digest = hashlib.sha256(raw).hexdigest()
        with patch("avarn_intake.SOURCE_SIZE", len(raw)), patch("avarn_intake.SOURCE_SHA", digest), patch("avarn_intake.geometry", return_value=([(0, 0, 0)], [])) as decode:
            self.assertEqual(verify_source(raw), ([(0, 0, 0)], []))
            decode.assert_called_once_with(raw)

    def test_seven_and_six_contact_fixture(self):
        points=[(x,-.28,z) for x,z in PADS]
        self.assertEqual(contact_counts(points)[0],[1]*7)
        self.assertEqual(contact_counts(points[:-1])[0],[1]*6+[0])

    def test_guarded_cut_and_escape(self):
        # A connected narrow extra limb meets a protected body above the cut.
        points=[(.0956,-.2824,-.3897),(.12,-.20,-.36),(.10,-.12,-.30),
                (.11,-.139,-.26),(.22,-.1379,-.25),(.22,-.136,-.24)]
        faces=[(0,1,2),(1,2,3),(3,4,5)]
        report=guarded_region(points,faces)
        self.assertEqual(report["selected_positions"],2)
        self.assertEqual(report["boundary_crossing_triangles"],2)
        self.assertEqual(report["status"],"PREVIEW_ONLY")
        with self.assertRaisesRegex(ValueError,"escaped"):
            guarded_region(points,faces,cut=-.137)
        with self.assertRaisesRegex(ValueError,"missing cut seed"):
            guarded_region(points[1:],[])

if __name__=="__main__":
    unittest.main()
