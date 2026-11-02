"""Native boundary smoke tests; actual reconstruction evidence is recorded separately."""
import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


@unittest.skipUnless(sys.platform == 'darwin' and shutil.which('swiftc'), 'macOS Swift SDK required')
class ObjectCaptureBoundaryTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.workspace = tempfile.TemporaryDirectory()
        cls.root = Path(cls.workspace.name)
        cls.binary = cls.root / 'object-capture'
        subprocess.run(['swiftc', '-parse-as-library', str(Path(__file__).with_name('object_capture.swift')), str(Path(__file__).with_name('capture_samples.swift')),
                        '-o', str(cls.binary)], check=True, capture_output=True, timeout=120)

    @classmethod
    def tearDownClass(cls):
        cls.workspace.cleanup()

    def run_capture(self, *args):
        return subprocess.run([str(self.binary), *args], capture_output=True, text=True, timeout=30)

    def test_probe_reports_actual_hardware_capability(self):
        result = self.run_capture('--probe')
        self.assertEqual(result.returncode, 0)
        self.assertIsInstance(json.loads(result.stdout)['supported'], bool)

    def test_missing_input_and_unknown_options_fail_before_reconstruction(self):
        for args in [(), ('--unknown', 'value'), ('--input', str(self.root / 'missing'), '--output', str(self.root / 'a.usdz'))]:
            with self.subTest(args=args):
                result = self.run_capture(*args)
                self.assertNotEqual(result.returncode, 0)
                self.assertIn('Object Capture:', result.stderr)
                self.assertFalse((self.root / 'a.usdz').exists())

    def test_prepared_views_validate_pixels_and_keep_metric_depth_values(self):
        doc = self.make_views('valid')
        result = self.run_capture('--validate-views', str(doc))
        self.assertEqual(result.returncode, 0, result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(report['schemaVersion'], 1)
        self.assertEqual([v['id'] for v in report['views']], ['front', 'side', 'back'])
        self.assertTrue(all(v['maskPresent'] for v in report['views']))
        self.assertTrue(all(v['maskPixelFormat'] == 'L008' for v in report['views']))
        self.assertEqual(report['views'][0]['depthPixelFormat'], 'fdep')
        self.assertTrue(report['views'][0]['depthPresent'])
        self.assertAlmostEqual(report['views'][0]['depthRangeMeters'][0], 2.5, places=4)
        self.assertAlmostEqual(report['views'][0]['depthRangeMeters'][1], 2.5, places=4)
        self.assertEqual(report['visualApproval'], 'pending')
        self.assertFalse((self.root / 'not-produced.usdz').exists())

    def test_prepared_views_reject_bad_masks_depth_and_unknown_calibration(self):
        for variant, message in [('missing-mask', 'mask'), ('wrong-size', 'pixel grid'), ('empty-mask', 'empty'), ('bad-depth', 'depth'), ('integer-depth', 'floating-point'), ('calibration', 'calibration'), ('duplicate', 'distinct')]:
            with self.subTest(variant=variant):
                doc = self.make_views(variant)
                result = self.run_capture('--validate-views', str(doc))
                self.assertNotEqual(result.returncode, 0)
                self.assertIn(message, result.stderr.lower())
                self.assertFalse((self.root / 'not-produced.usdz').exists())

    def test_prepared_views_schema_and_input_modes_are_explicit(self):
        doc = self.make_views('schema')
        data = json.loads(doc.read_text());data['schemaVersion'] = 2;doc.write_text(json.dumps(data))
        result = self.run_capture('--validate-views', str(doc))
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('schemaVersion', result.stderr)
        result = self.run_capture('--views', str(doc), '--input', str(self.root), '--output', str(self.root / 'not-produced.usdz'))
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('exactly one', result.stderr)

    def make_views(self, variant):
        fixture = self.root / 'pixels'
        fixture.mkdir(exist_ok=True)
        if not (fixture / 'mask.png').exists():
            script = fixture / 'pixels.swift'
            script.write_text('import Foundation\nimport CoreImage\nimport CoreGraphics\nlet root = URL(fileURLWithPath:CommandLine.arguments[1])\nlet context = CIContext()\nlet white = CIImage(color:CIColor(red:1,green:1,blue:1)).cropped(to:CGRect(x:0,y:0,width:1920,height:1280))\nlet black = CIImage(color:CIColor(red:0,green:0,blue:0)).cropped(to:white.extent)\ntry context.writePNGRepresentation(of:white,to:root.appendingPathComponent("mask.png"),format:.L8,colorSpace:CGColorSpaceCreateDeviceGray())\ntry context.writePNGRepresentation(of:black,to:root.appendingPathComponent("empty.png"),format:.L8,colorSpace:CGColorSpaceCreateDeviceGray())\ntry context.writePNGRepresentation(of:white.cropped(to:CGRect(x:0,y:0,width:32,height:32)),to:root.appendingPathComponent("small.png"),format:.L8,colorSpace:CGColorSpaceCreateDeviceGray())\nlet floats = [Float](repeating:2.5,count:1920*1280)\nlet bytes = floats.withUnsafeBytes { Data($0) }\nlet depth = CIImage(bitmapData:bytes,bytesPerRow:1920*4,size:CGSize(width:1920,height:1280),format:.Rf,colorSpace:nil)\ntry context.writeOpenEXRRepresentation(of:depth,to:root.appendingPathComponent("depth.exr"),options:[:])\n')
            subprocess.run(['swift', str(script), str(fixture)], capture_output=True, check=True, timeout=60)
        source = Path(__file__).resolve().parents[3] / 'src/craft/fixtures/image-scene/source-views'
        views = [{'id': name, 'image': str(source / f'{name}.jpg'), 'mask': str(fixture / 'mask.png')} for name in ['front','side','back']]
        views[0]['depth'] = {'path': str(fixture / 'depth.exr'), 'encoding': 'camera-z-meters-f32'}
        if variant == 'missing-mask': views[0]['mask'] = str(fixture / 'missing.png')
        if variant == 'wrong-size': views[0]['mask'] = str(fixture / 'small.png')
        if variant == 'empty-mask': views[0]['mask'] = str(fixture / 'empty.png')
        if variant == 'bad-depth': views[0]['depth'] = {'path': str(fixture / 'depth.exr'), 'encoding': 'brightness'}
        if variant == 'integer-depth': views[0]['depth'] = {'path': str(fixture / 'mask.png'), 'encoding': 'camera-z-meters-f32'}
        if variant == 'calibration': views[0]['calibration'] = {'fx': 1000}
        if variant == 'duplicate': views[1]['image'] = views[0]['image']
        doc = fixture / f'{variant}.json'
        doc.write_text(json.dumps({'schemaVersion': 1, 'mode': 'object-rotation', 'views': views}))
        return doc

    def test_unknown_detail_and_existing_output_reject_without_overwrite(self):
        source = self.root / 'photos'
        source.mkdir(exist_ok=True)
        output = self.root / 'keep.usdz'
        output.write_bytes(b'consumer file')
        for extra in [('--detail', 'invented'), ()]:
            result = self.run_capture('--input', str(source), '--output', str(output), *extra)
            self.assertNotEqual(result.returncode, 0)
            self.assertEqual(output.read_bytes(), b'consumer file')


if __name__ == '__main__':
    unittest.main()
