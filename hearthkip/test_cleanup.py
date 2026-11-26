import unittest
from cleanup import clean_mesh
class CleanupContract(unittest.TestCase):
    def fixture(self):
        # 400 distinct, valid triangles; separate vertices avoid accidental duplicate faces.
        v=[];f=[]
        for i in range(400):
            n=len(v);v.extend([(i,0,0),(i+0.4,0,0),(i,0.4,1)]);f.append((n,n+1,n+2))
        return v,f
    def test_clean_unchanged(self):
        v,f=self.fixture();a,b,r=clean_mesh(v,f)
        self.assertEqual((a,b),(v,f));self.assertEqual(sum(r["removed_faces"].values()),0)
    def test_repeated_index_and_unused_vertex(self):
        v,f=self.fixture();v.append((0,0,9));a,b,r=clean_mesh(v,f+[(0,0,len(v)-1)])
        self.assertEqual((a,b),(v[:-1],f));self.assertEqual(r["removed_faces"]["repeated_index"],1);self.assertEqual(r["removed_vertices"],1)
    def test_collinear_duplicate_and_tiny(self):
        v,f=self.fixture();n=len(v);v.extend([(0,0,0),(1,1,1),(2,2,2),(1e-14,0,0)])
        a,b,r=clean_mesh(v,f+[(n,n+1,n+2),(2,1,0),(0,1,n+3)])
        self.assertEqual((a,b),(v[:n],f));self.assertEqual(r["removed_faces"],{"repeated_index":0,"zero_or_tiny_area":2,"duplicate_face":1})
    def test_remap_preserves_order_and_orientation(self):
        v,f=self.fixture();v=[(99,99,99)]+v;shifted=[tuple(i+1 for i in t) for t in f]
        a,b,r=clean_mesh(v,shifted);self.assertEqual(a,v[1:]);self.assertEqual(b,f)
    def test_reject_bad_index(self):
        v,f=self.fixture()
        for t in ((-1,1,2),(0,1,len(v))):
            with self.assertRaises(ValueError):clean_mesh(v,f+[t])
    def test_reject_nonfinite(self):
        v,f=self.fixture();v[0]=(float("nan"),0,0)
        with self.assertRaises(ValueError):clean_mesh(v,f)
    def test_reject_excessive_removal(self):
        v,f=self.fixture()
        with self.assertRaisesRegex(ValueError,"1%"):clean_mesh(v,f+[(0,0,1)]*5)
    def test_reject_no_surface(self):
        with self.assertRaises(ValueError):clean_mesh([(0,0,0)],[(0,0,0)])
