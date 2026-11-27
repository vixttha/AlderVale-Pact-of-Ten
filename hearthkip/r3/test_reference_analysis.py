import copy, hashlib, json, unittest
from pathlib import Path
from reference_analysis import analyze, bounds, decode_png, encode_png, foreground, verify_spec
ROOT=Path(__file__).resolve().parents[2]
SPEC=json.loads((Path(__file__).parent/"reference.json").read_text())
class ReferenceTests(unittest.TestCase):
    def test_png_roundtrip(self):
        rows=[[(128,128,128),(128,128,128),(128,128,128)],[(128,128,128),(230,70,5),(128,128,128)],[(128,128,128)]*3]
        self.assertEqual(decode_png(encode_png(rows)),(3,3,rows))
        bg,mask=foreground(rows,12); self.assertEqual(bg,(128,128,128)); self.assertEqual(bounds(mask),([1,1,1,1],1))
    def test_png_crc_rejected(self):
        data=bytearray(encode_png([[(1,2,3)]])); data[20]^=1
        with self.assertRaisesRegex(ValueError,"CRC"): decode_png(data)
    def test_wrong_reference_rejected(self):
        with self.assertRaisesRegex(ValueError,"reference mismatch"): analyze(b"wrong",SPEC)
    def test_wrong_dimensions(self):
        with self.assertRaisesRegex(ValueError,"dimensions"): verify_spec(SPEC,511,512)
    def test_out_of_range_landmark(self):
        s=copy.deepcopy(SPEC); s["landmarks"][0]["x"]=512
        with self.assertRaisesRegex(ValueError,"landmark range"): verify_spec(s,512,512)
    def test_duplicate_landmark(self):
        s=copy.deepcopy(SPEC); s["landmarks"].append(s["landmarks"][0])
        with self.assertRaisesRegex(ValueError,"duplicate"): verify_spec(s,512,512)
    def test_no_fake_approval(self):
        s=copy.deepcopy(SPEC); s["approval"]["master"]=True
        with self.assertRaisesRegex(ValueError,"unapproved gate"): verify_spec(s,512,512)
    def test_actual_locked_reference(self):
        data=(ROOT/SPEC["reference"]["path"]).read_bytes(); r,overlay,mask=analyze(data,SPEC)
        self.assertEqual(r["reference_sha256"],hashlib.sha256(data).hexdigest())
        self.assertEqual(r["dimensions"],[512,512]); self.assertGreater(r["silhouette_proxy"]["pixels"],10000)
        self.assertLess(r["silhouette_proxy"]["pixels"],512*512*.75)
        self.assertEqual(len(r["landmarks"]),30)
        self.assertEqual(decode_png(overlay)[:2],(512,512)); self.assertEqual(decode_png(mask)[:2],(512,512))
        self.assertEqual(r["camera"]["status"],"unresolved")
        self.assertFalse(r["approval"]["reference_sheet"])
if __name__=="__main__": unittest.main()
