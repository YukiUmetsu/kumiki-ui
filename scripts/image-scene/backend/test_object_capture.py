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
        subprocess.run(['swiftc', '-parse-as-library', str(Path(__file__).with_name('object_capture.swift')),
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
