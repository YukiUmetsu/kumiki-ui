"""MediaPipe model files: download once into a local cache and check each file's SHA-256 before use.

The models are not committed. They are Google's published MediaPipe Tasks models (Apache-2.0).
"""

from __future__ import annotations

import hashlib
import os
import urllib.request
from pathlib import Path

from . import ROOT

MODELS = {
    "face_landmarker.task": {
        "url": "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
        "sha256": "64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff",
        "note": "478 landmarks (468 mesh + 10 iris), 52 blendshapes, facial transformation matrix.",
    },
    "selfie_multiclass_256x256.tflite": {
        "url": "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite",
        "sha256": "c6748b1253a99067ef71f7e26ca71096cd449baefa8f101900ea23016507e0e0",
        "note": "Classes: background, hair, body-skin, face-skin, clothes, others.",
    },
}


def models_dir(override: str | None = None) -> Path:
    """The cache folder: --models, then $KUMIKI_MAKEUP_MODELS, then local-assets/makeup/models (git-ignored)."""
    d = Path(override or os.environ.get("KUMIKI_MAKEUP_MODELS") or ROOT / "local-assets" / "makeup" / "models")
    d.mkdir(parents=True, exist_ok=True)
    return d


def sha256_of(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def ensure_models(override: str | None = None) -> Path:
    """Download missing models and verify every file. A wrong hash stops the run (the file may be tampered or changed)."""
    d = models_dir(override)
    for name, spec in MODELS.items():
        path = d / name
        if not path.exists():
            tmp = path.with_suffix(path.suffix + ".part")
            req = urllib.request.Request(spec["url"], headers={"User-Agent": "kumiki-makeup/1.0"})
            with urllib.request.urlopen(req, timeout=120) as r, open(tmp, "wb") as f:
                f.write(r.read())
            tmp.replace(path)
        got = sha256_of(path)
        if got != spec["sha256"]:
            raise RuntimeError(f"{name}: SHA-256 {got} does not match the pinned {spec['sha256']}; delete it and check the source")
    return d
