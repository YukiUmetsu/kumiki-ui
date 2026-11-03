"""Prepare an auditable train/held-out split of a cleared real-photo archive.

No inference or image generation. Original encoded bytes are retained unchanged.
"""
import argparse
import hashlib
import json
import shutil
import zipfile
from pathlib import Path, PurePosixPath

MAX_VIEWS = 4096
MAX_PHOTO_BYTES = 128 * 1024 * 1024
MAX_TOTAL_BYTES = 4 * 1024 * 1024 * 1024


def prepare_benchmark_capture(archive_path, output_path, expected_sha256, exclusions=()):
    archive_path, output_path = Path(archive_path), Path(output_path)
    if output_path.exists():
        raise FileExistsError(f'Capture output already exists: {output_path}. Choose a new revision directory.')
    with archive_path.open('rb') as source:
        archive_hash = hashlib.sha256()
        for block in iter(lambda: source.read(1024 * 1024), b''):
            archive_hash.update(block)
        digest = archive_hash.hexdigest()
    if digest != expected_sha256:
        raise ValueError('Archive SHA-256 mismatch. Download the pinned original archive again.')
    with zipfile.ZipFile(archive_path) as archive:
        photos = []
        names = set()
        for entry in archive.infolist():
            path = PurePosixPath(entry.filename)
            if path.suffix.lower() not in ('.jpg', '.jpeg', '.png') or '__MACOSX' in path.parts:
                continue
            if path.is_absolute() or '..' in path.parts or '\\' in entry.filename:
                raise ValueError(f'Unsafe photo archive path: {entry.filename}')
            name = path.name
            if name.casefold() in names:
                raise ValueError(f'Duplicate photo filename: {name}. Preserve unique view names.')
            names.add(name.casefold())
            if entry.file_size > MAX_PHOTO_BYTES:
                raise ValueError(f'Photo exceeds {MAX_PHOTO_BYTES} bytes: {name}')
            photos.append(entry)
        if len(photos) > MAX_VIEWS or sum(p.file_size for p in photos) > MAX_TOTAL_BYTES:
            raise ValueError('Capture archive exceeds the benchmark view/byte budget.')
        photos.sort(key=lambda entry: entry.filename)
        unknown = set(exclusions) - {PurePosixPath(p.filename).name for p in photos}
        if unknown:
            raise ValueError(f'Excluded photos are absent from archive: {sorted(unknown)}')
        selected = [p for p in photos if PurePosixPath(p.filename).name not in exclusions]
        if len(selected) < 2:
            raise ValueError('Benchmark needs at least two distinct training photos and a held-out real view.')
        records, excluded, content_hashes = [], [], set()
        # Validate every byte before publishing the split. The bounded archive is
        # read twice to avoid holding all original photographs in memory.
        for selected_index, entry in enumerate(photos):
            name = PurePosixPath(entry.filename).name
            photo_hash = hashlib.sha256(archive.read(entry)).hexdigest()
            if name in exclusions:
                excluded.append({'file': name, 'sha256': photo_hash})
                continue
            if photo_hash in content_hashes:
                raise ValueError(f'Duplicate photo content: {name}. Each view must be a distinct observation.')
            content_hashes.add(photo_hash)
            split = 'held-out' if selected_index % 10 == 5 else 'train'
            records.append({'file': name, 'archivePath': entry.filename, 'split': split, 'sha256': photo_hash})
        if len(records) < 3:
            raise ValueError('Benchmark needs at least two training photos and one held-out real view.')
        if not any(v['split'] == 'held-out' for v in records):
            records[-1]['split'] = 'held-out'
        manifest = {'schemaVersion': 1, 'archiveSha256': digest,
                    'splitPolicy': 'sorted archive views; index % 10 == 5 held out; last view for small sets',
                    'excluded': excluded, 'views': records}
        output_path.mkdir(parents=True, exist_ok=False)
        try:
            (output_path / 'train').mkdir()
            (output_path / 'held-out').mkdir()
            for view in records:
                (output_path / view['split'] / view['file']).write_bytes(archive.read(view['archivePath']))
            (output_path / 'split.json').write_text(json.dumps(manifest, indent=2) + '\n')
        except BaseException:
            shutil.rmtree(output_path)
            raise
        return manifest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--archive', required=True)
    parser.add_argument('--output', required=True)
    parser.add_argument('--sha256', required=True)
    parser.add_argument('--exclude', action='append', default=[])
    args = parser.parse_args()
    manifest = prepare_benchmark_capture(args.archive, args.output, args.sha256, args.exclude)
    print(json.dumps({'train': sum(v['split'] == 'train' for v in manifest['views']),
                      'heldOut': sum(v['split'] == 'held-out' for v in manifest['views']),
                      'excluded': len(manifest['excluded'])}))


if __name__ == '__main__':
    main()
