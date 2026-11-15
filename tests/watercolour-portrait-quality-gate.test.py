import importlib.util
import unittest
from tempfile import TemporaryDirectory
from pathlib import Path
import cv2
import numpy as np
from PIL import Image

spec=importlib.util.spec_from_file_location('gate',str(Path(__file__).resolve().parents[1]/'scripts'/'watercolour-portrait-quality-gate.py'))
gate=importlib.util.module_from_spec(spec)
spec.loader.exec_module(gate)

class PortraitQualityGateTests(unittest.TestCase):
    def setUp(self):
        self.temp=TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root=Path(self.temp.name)
        h,w=820,700
        yy,xx=np.mgrid[:h,:w]
        base=np.clip(np.stack([225-xx*.1+13*np.sin(yy/19),198-yy*.07+9*np.cos(xx/17),175+19*np.sin((xx+yy)/22)],axis=-1),0,255).astype(np.uint8)
        # Synthetic geometry is NOT a portrait fidelity benchmark. The tests
        # only exercise numerical tamper detection and fail-closed behavior.
        for center,axes,color in [((240,260),(45,18),(67,48,42)),((457,257),(37,20),(77,51,48)),((350,394),(50,33),(162,105,78)),((356,512),(70,19),(126,75,79))]:
            cv2.ellipse(base,center,axes,-5,0,360,color,-1)
        rng=np.random.default_rng(93)
        noise=rng.normal(0,2.8,(h,w,1))
        base=np.clip(base.astype(float)+noise,0,255).astype(np.uint8)
        self.src=base
        self.save('ref.png',base)
        self.save('out.png',np.clip(base.astype(np.int16)+1,0,255).astype(np.uint8))
        (self.root/'drawing.py').write_text('# deterministic procedural fixture\n'+'ink=0\n'*140)
        regions={"full-face":[140,120,580,720],"near-eye":[185,210,301,294],
          "far-eye":[408,210,512,298],"nose":[293,337,415,447],"mouth":[283,468,435,554],
          "hairline":[85,40,610,200],"jaw":[230,552,480,760]}
        t=dict(min_ssim=.84,min_edge_f1=.72,min_detail_ratio=.7,max_detail_ratio=1.3,max_color_mae=10)
        self.m=dict(schemaVersion=1,mode='same-subject-same-pose',rights='user-owned',
           reference='ref.png',candidate='out.png',sourceCode='drawing.py',
           regions=[dict(id=k,bbox=v,thresholds=t.copy()) for k,v in regions.items()])
    def save(self,name,a): Image.fromarray(a).save(self.root/name)
    def verify(self):return gate.audit(self.m,self.root)
    def test_near_source_passes_machine_but_never_auto_approves_art(self):
        r=self.verify()
        self.assertEqual([],r['failures'])
        self.assertTrue(r['machinePass'])
        self.assertFalse(r['releaseReady'])
        self.assertFalse(r['artistApproved'])
        self.assertEqual(7,len(r['regions']))
    def test_blur_and_cartoon_posterization_fail(self):
        for name,im in [('blur',cv2.GaussianBlur(self.src,(0,0),3)),
          ('posterize',self.src//32*32)]:
            self.save('out.png',im)
            with self.subTest(name=name):
                r=self.verify()
                self.assertFalse(r['machinePass'])
                self.assertTrue(any('ssim' in x or 'detail_ratio' in x for x in r['failures']))
    def test_reference_copy_rejected(self):
        self.save('out.png',self.src)
        with self.assertRaisesRegex(ValueError,'Identical copied'):
            self.verify()
    def test_unauthorized_source_rejected(self):
        self.m['rights']='unlicensed'
        with self.assertRaisesRegex(ValueError,'authorized'):
            self.verify()
    def test_missing_or_dishonest_crops_rejected(self):
        self.m['regions']=self.m['regions'][:-1]
        with self.assertRaisesRegex(ValueError,'Critical anatomy'):
            self.verify()
        self.m['regions']=self.m['regions']+[dict(id='jaw',bbox=[1,1,20,20],
          thresholds=self.m['regions'][0]['thresholds'])]
        with self.assertRaisesRegex(ValueError,'Crop too small'):
            self.verify()
    def test_translucent_hairline_rejected(self):
        alpha=np.full(self.src.shape[:2],255,dtype=np.uint8)
        alpha[50:90,100:240]=127
        rgba=np.dstack([np.clip(self.src.astype(np.int16)+1,0,255).astype(np.uint8),alpha])
        self.save('out.png',rgba)
        result=self.verify()
        self.assertIn('hairline:transparent_pixels',result['failures'])
    def test_unattributed_svg_or_code_rejected(self):
        (self.root/'drawing.py').write_text('hi')
        with self.assertRaisesRegex(ValueError,'source-code'):
            self.verify()

if __name__=='__main__':unittest.main()
