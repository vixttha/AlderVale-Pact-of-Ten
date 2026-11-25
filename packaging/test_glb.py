import json
import struct
import unittest
from validate_glb import parse_glb

def sample():
    raw=json.dumps({"asset":{"version":"2.0"}}).encode()
    raw+=b" "*((-len(raw))%4)
    chunks=struct.pack("<I4s",len(raw),b"JSON")+raw+struct.pack("<I4s",4,b"BIN\x00")+b"1234"
    return struct.pack("<4sII",b"glTF",2,12+len(chunks))+chunks

class Contract(unittest.TestCase):
    def test_valid_framing(self):
        self.assertEqual(parse_glb(sample())[1],b"1234")
    def test_bad_magic(self):
        with self.assertRaises(ValueError): parse_glb(b"OBJ!"+sample()[4:])
    def test_bad_version(self):
        with self.assertRaises(ValueError): parse_glb(sample()[:4]+struct.pack("<I",1)+sample()[8:])
    def test_truncation(self):
        with self.assertRaises(ValueError): parse_glb(sample()[:-1])
    def test_bad_chunk(self):
        with self.assertRaises(ValueError): parse_glb(sample()[:12]+struct.pack("<I",3)+sample()[16:])
