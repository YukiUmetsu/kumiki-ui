import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


@unittest.skipUnless(sys.platform == 'darwin' and shutil.which('swiftc'), 'macOS Swift SDK required')
class PreparePhotoTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.workspace = tempfile.TemporaryDirectory()
        cls.root = Path(cls.workspace.name)
        cls.binary = cls.root / 'prepare-photo'
        subprocess.run(['swiftc', str(Path(__file__).with_name('prepare_photo.swift')), '-o', str(cls.binary)], check=True, capture_output=True, timeout=120)
        cls.photo = Path(__file__).resolve().parents[3] / 'src/craft/fixtures/image-scene/source-views/front.jpg'

    @classmethod
    def tearDownClass(cls):
        cls.workspace.cleanup()

    def test_actual_photo_produces_aligned_mask_and_truthful_metadata(self):
        mask = self.root / 'front-mask.png'
        metadata = self.root / 'front.json'
        result = subprocess.run([str(self.binary), '--image', str(self.photo), '--mask', str(mask), '--metadata', str(metadata)], capture_output=True, text=True, timeout=90)
        self.assertEqual(result.returncode, 0, result.stderr)
        report = json.loads(metadata.read_text())
        self.assertEqual((report['width'], report['height']), (1920, 1280))
        self.assertEqual(report['maskMethod'], 'vision-largest-foreground-instance')
        self.assertGreater(report['foregroundFraction'], 0.01)
        self.assertLess(report['foregroundFraction'], 0.8)
        self.assertEqual(mask.read_bytes()[:8], b'\x89PNG\r\n\x1a\n')
        self.assertEqual(report['visualReview'], 'pending')

    def test_existing_outputs_are_not_overwritten(self):
        mask = self.root / 'preserve.png'
        metadata = self.root / 'preserve.json'
        mask.write_bytes(b'consumer-owned')
        result = subprocess.run([str(self.binary), '--image', str(self.photo), '--mask', str(mask), '--metadata', str(metadata)], capture_output=True, text=True, timeout=30)
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(mask.read_bytes(), b'consumer-owned')
        self.assertFalse(metadata.exists())

    def test_exif_rotation_is_normalized_once_and_retains_original(self):
        import hashlib
        rotated = self.root / 'rotated.jpg'
        script = self.root / 'rotate-tag.swift'
        script.write_text('import Foundation\nimport ImageIO\nimport UniformTypeIdentifiers\nlet source = CGImageSourceCreateWithURL(URL(fileURLWithPath:CommandLine.arguments[1]) as CFURL,nil)!\nlet destination = CGImageDestinationCreateWithURL(URL(fileURLWithPath:CommandLine.arguments[2]) as CFURL,UTType.jpeg.identifier as CFString,1,nil)!\nCGImageDestinationAddImageFromSource(destination,source,0,[kCGImagePropertyOrientation:6] as CFDictionary)\nif !CGImageDestinationFinalize(destination) { exit(1) }\n')
        subprocess.run(['swift', str(script), str(self.photo), str(rotated)], check=True, capture_output=True, timeout=60)
        before = hashlib.sha256(rotated.read_bytes()).hexdigest()
        normalized = self.root / 'oriented.png'
        for index, source in enumerate([rotated, normalized]):
            metadata = self.root / f'orientation-{index}.json'
            args = [str(self.binary), '--image', str(source), '--mask', str(self.root / f'orientation-{index}.png'), '--metadata', str(metadata)]
            if index == 0:
                args.extend(['--normalized', str(normalized)])
            result = subprocess.run(args, capture_output=True, text=True, timeout=90)
            self.assertEqual(result.returncode, 0, result.stderr)
            report = json.loads(metadata.read_text())
            self.assertEqual((report['width'], report['height']), (1280, 1920))
            self.assertEqual(report['sourceOrientation'], 6 if index == 0 else 1)
        self.assertEqual(hashlib.sha256(rotated.read_bytes()).hexdigest(), before)

    def test_manual_mask_framing_is_checked_before_writing_outputs(self):
        source = Path(__file__).resolve().parents[3] / 'docs/verification/image-scene/foreground-mask-preview.png'
        mask, metadata = self.root / 'mismatch.png', self.root / 'mismatch.json'
        result = subprocess.run([str(self.binary), '--image', str(self.photo), '--override', str(source), '--mask', str(mask), '--metadata', str(metadata)], capture_output=True, text=True, timeout=30)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('pixel grid', result.stderr)
        self.assertFalse(mask.exists())
        self.assertFalse(metadata.exists())

    def test_missing_photo_is_an_actionable_error(self):
        result = subprocess.run([str(self.binary), '--image', str(self.root / 'missing.jpg'), '--mask', str(self.root / 'absent.png'), '--metadata', str(self.root / 'absent.json')], capture_output=True, text=True, timeout=30)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('Photo preparation:', result.stderr)
        self.assertFalse((self.root / 'absent.json').exists())


if __name__ == '__main__':
    unittest.main()
