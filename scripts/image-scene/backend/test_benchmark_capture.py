import hashlib
import tempfile
import unittest
import zipfile
from pathlib import Path

from benchmark_capture import prepare_benchmark_capture


class BenchmarkCaptureTests(unittest.TestCase):
    def setUp(self):
        self.workspace = tempfile.TemporaryDirectory()
        self.addCleanup(self.workspace.cleanup)
        self.root = Path(self.workspace.name)
        self.archive = self.root / 'photos.zip'

    def write_archive(self, names):
        with zipfile.ZipFile(self.archive, 'w') as archive:
            for index, name in enumerate(names):
                archive.writestr(name, f'photo-{index}'.encode())
        return hashlib.sha256(self.archive.read_bytes()).hexdigest()

    def test_split_is_deterministic_and_exclusions_never_train(self):
        digest = self.write_archive(['photos/chart.jpg'] + [f'photos/{i:03}.JPG' for i in range(20)])
        first = prepare_benchmark_capture(self.archive, self.root / 'a', digest, ['chart.jpg'])
        second = prepare_benchmark_capture(self.archive, self.root / 'b', digest, ['chart.jpg'])
        self.assertEqual(first, second)
        self.assertEqual(len(first['views']), 20)
        self.assertEqual(len([v for v in first['views'] if v['split'] == 'held-out']), 2)
        self.assertFalse((self.root / 'a/train/chart.jpg').exists())
        self.assertFalse(set(p.name for p in (self.root / 'a/train').iterdir()) &
                         set(p.name for p in (self.root / 'a/held-out').iterdir()))
        for view in first['views']:
            self.assertEqual(hashlib.sha256((self.root / 'a' / view['split'] / view['file']).read_bytes()).hexdigest(), view['sha256'])

    def test_digest_mismatch_leaves_no_output(self):
        self.write_archive(['a.jpg', 'b.jpg'])
        with self.assertRaisesRegex(ValueError, 'SHA-256'):
            prepare_benchmark_capture(self.archive, self.root / 'out', '0' * 64)
        self.assertFalse((self.root / 'out').exists())

    def test_unsafe_paths_and_duplicate_basenames_are_rejected(self):
        for names in [['../a.jpg', 'b.jpg'], ['first/a.jpg', 'second/a.jpg']]:
            with self.subTest(names=names):
                digest = self.write_archive(names)
                with self.assertRaisesRegex(ValueError, 'path|filename'):
                    prepare_benchmark_capture(self.archive, self.root / 'out', digest)
                self.assertFalse((self.root / 'out').exists())

    def test_existing_output_is_not_modified(self):
        digest = self.write_archive(['a.jpg', 'b.jpg'])
        output = self.root / 'out'
        output.mkdir()
        (output / 'keep').write_text('consumer data')
        with self.assertRaises(FileExistsError):
            prepare_benchmark_capture(self.archive, output, digest)
        self.assertEqual((output / 'keep').read_text(), 'consumer data')

    def test_unknown_exclusion_is_actionable(self):
        digest = self.write_archive(['a.jpg', 'b.jpg'])
        with self.assertRaisesRegex(ValueError, 'missing.jpg'):
            prepare_benchmark_capture(self.archive, self.root / 'out', digest, ['missing.jpg'])

    def test_duplicate_photo_content_and_too_few_views_are_rejected(self):
        digest = self.write_archive(['a.jpg'])
        with self.assertRaisesRegex(ValueError, 'two'):
            prepare_benchmark_capture(self.archive, self.root / 'out', digest)
        with zipfile.ZipFile(self.archive, 'w') as archive:
            archive.writestr('a.jpg', b'same'); archive.writestr('b.jpg', b'same')
        digest = hashlib.sha256(self.archive.read_bytes()).hexdigest()
        with self.assertRaisesRegex(ValueError, 'Duplicate photo'):
            prepare_benchmark_capture(self.archive, self.root / 'out', digest)


if __name__ == '__main__':
    unittest.main()
