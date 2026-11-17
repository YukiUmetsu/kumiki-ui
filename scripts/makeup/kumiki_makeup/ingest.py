"""Phase 1: ingest reference photographs.

For each record: licence gate -> read -> landmarks and segmentation -> quality checks -> similarity alignment to a
512 x 512 crop with the eyes level and a fixed distance between the pupils -> files and one manifest line.

Output folder:
  manifest.jsonl          one line per record (kept or rejected, with the reasons and every measurement)
  aligned/<id>.png        the aligned face, sRGB as photographed (no colour change unless --white-balance)
  landmarks/<id>.json     478 landmarks in aligned pixels (x, y; z scaled like x), the pose, blendshapes
  masks/<id>.png          segmentation in aligned pixels (0 background, 1 hair, 2 body skin, 3 face skin, 4 clothes, 5 other)
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import cv2
import numpy as np

from .geometry import camera_points, canonical, opening_triangles, rasterize, rest_frame
from .landmarks import FaceAnalyzer
from .sources import Record, gate

SIZE = 512
EYE_MID = (0.5, 0.40)  # where the midpoint between the pupils lands, as a fraction of the crop
IPD_FRAC = 0.26  # distance between the pupils as a fraction of the crop width (133 px at 512)

QUALITY = {"min_ipd_px": 60, "max_yaw": 20.0, "max_pitch": 20.0, "max_roll": 25.0, "min_sharpness": 6.0,
           "max_clipped": 0.05, "min_skin_cover": 0.55, "max_blink": 0.55, "max_jaw_open": 0.3}


def pupils(lm_px: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Pupil centres (subject's right, left) in pixels: the iris centres 468 and 473 when present."""
    if len(lm_px) >= 478:
        return lm_px[468, :2], lm_px[473, :2]
    return (lm_px[33, :2] + lm_px[133, :2]) / 2, (lm_px[263, :2] + lm_px[362, :2]) / 2


def alignment(lm_px: np.ndarray) -> np.ndarray:
    """2 x 3 similarity that levels the pupils and puts them IPD_FRAC * SIZE apart around EYE_MID."""
    r, l = pupils(lm_px)
    mid = (r + l) / 2
    d = l - r
    ang = np.arctan2(d[1], d[0])
    scale = IPD_FRAC * SIZE / max(1e-6, np.hypot(*d))
    c, s = np.cos(-ang) * scale, np.sin(-ang) * scale
    M = np.array([[c, -s, 0.0], [s, c, 0.0]])
    M[:, 2] = np.array([EYE_MID[0] * SIZE, EYE_MID[1] * SIZE]) - M[:, :2] @ mid
    return M


def skin_cover(lm_px: np.ndarray, seg: np.ndarray) -> float:
    """Share of the face mesh (without eye and mouth openings) that the segmenter calls face skin."""
    V, T = canonical()
    h, w = seg.shape
    tri, _ = rasterize(lm_px[:468, :2], -lm_px[:468, 2], T, w, h, skip=opening_triangles())
    m = tri >= 0
    return float((seg[m] == 3).mean()) if m.any() else 0.0


def assess(det, rgb: np.ndarray) -> dict:
    """Measurements and the failed checks for one detection."""
    q: dict = {"faces": det.faces}
    fails: list[str] = []
    if det.faces == 0 or det.landmarks is None:
        return {**q, "fails": ["no face found"]}
    if det.faces > 1:
        q["note"] = "several faces: the largest was used"
    h, w = rgb.shape[:2]
    lm_px = det.landmarks * np.array([w, h, w])
    r, l = pupils(lm_px)
    q["ipd_px"] = round(float(np.hypot(*(l - r))), 1)
    rf = rest_frame(camera_points(det.landmarks, w, h))
    q["pose"] = {k: round(v, 2) for k, v in rf["pose"].items()}
    q["fit_residual_mm"] = round(rf["residual_mm"], 2)
    q["blink"] = round(max(det.blendshapes.get("eyeBlinkLeft", 0), det.blendshapes.get("eyeBlinkRight", 0)), 3)
    q["jaw_open"] = round(det.blendshapes.get("jawOpen", 0), 3)
    q["smile"] = round((det.blendshapes.get("mouthSmileLeft", 0) + det.blendshapes.get("mouthSmileRight", 0)) / 2, 3)
    if q["ipd_px"] < QUALITY["min_ipd_px"]:
        fails.append(f"face too small (pupils {q['ipd_px']} px apart, need {QUALITY['min_ipd_px']})")
    for k in ("yaw", "pitch", "roll"):
        if abs(q["pose"][k]) > QUALITY[f"max_{k}"]:
            fails.append(f"head {k} {q['pose'][k]:.0f} deg beyond {QUALITY[f'max_{k}']:.0f}")
    if q["blink"] > QUALITY["max_blink"]:
        fails.append("eyes closed")
    if q["jaw_open"] > QUALITY["max_jaw_open"]:
        fails.append("mouth open")
    if det.segmentation is not None:
        q["skin_cover"] = round(skin_cover(lm_px, det.segmentation), 3)
        if q["skin_cover"] < QUALITY["min_skin_cover"]:
            fails.append(f"face covered (only {q['skin_cover']:.0%} of the mesh is skin: hair, hands, glasses or a mask)")
    q["fails"] = fails
    return q


def image_quality(aligned: np.ndarray, mask: np.ndarray) -> dict:
    """Sharpness (variance of the Laplacian on face skin at the aligned scale) and clipped pixels on the face."""
    grey = cv2.cvtColor(aligned, cv2.COLOR_RGB2GRAY).astype(np.float64)
    lap = cv2.Laplacian(grey, cv2.CV_64F, ksize=3)
    skin = mask == 3
    if skin.sum() < 500:
        return {"sharpness": 0.0, "clipped": 0.0}
    face = aligned[skin]
    return {"sharpness": round(float(lap[skin].var()), 2), "clipped": round(float(((face >= 250).any(1) | (face <= 6).all(1)).mean()), 4)}


def grey_world(rgb: np.ndarray, mask: np.ndarray) -> np.ndarray:
    """Optional white balance: scale channels so the non-skin background averages grey. Off by default: portrait
    backgrounds are often coloured, and a wrong correction shifts the measured undertone."""
    sel = (mask == 0)
    if sel.sum() < 1000:
        return rgb
    mean = rgb[sel].reshape(-1, 3).astype(np.float64).mean(0)
    gain = mean.mean() / np.maximum(1, mean)
    return np.clip(rgb.astype(np.float64) * gain, 0, 255).astype(np.uint8)


def ingest(records, out_dir: str, allow: tuple[str, ...], models: str | None = None, white_balance: str = "none", limit: int | None = None) -> dict:
    out = Path(out_dir)
    for sub in ("aligned", "landmarks", "masks"):
        (out / sub).mkdir(parents=True, exist_ok=True)
    analyzer = FaceAnalyzer(models)
    kept = rejected = 0
    with open(out / "manifest.jsonl", "a", encoding="utf-8") as man:
        for rec, reason in gate(records, allow):
            if limit is not None and kept >= limit:
                break
            line = {**rec.to_json()}
            if reason:
                line.update(status="rejected", fails=[reason])
                man.write(json.dumps(line) + "\n")
                rejected += 1
                continue
            raw = Path(rec.path).read_bytes()
            line["sha256"] = hashlib.sha256(raw).hexdigest()
            bgr = cv2.imdecode(np.frombuffer(raw, np.uint8), cv2.IMREAD_COLOR)
            if bgr is None:
                line.update(status="rejected", fails=["not a readable image"])
                man.write(json.dumps(line) + "\n")
                rejected += 1
                continue
            rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
            line["size"] = [int(rgb.shape[1]), int(rgb.shape[0])]
            det = analyzer.detect(rgb)
            q = assess(det, rgb)
            line["quality"] = q
            if q["fails"]:
                line.update(status="rejected", fails=q["fails"])
                man.write(json.dumps(line) + "\n")
                rejected += 1
                continue
            h, w = rgb.shape[:2]
            lm_px = det.landmarks * np.array([w, h, w])
            M = alignment(lm_px)
            aligned = cv2.warpAffine(rgb, M, (SIZE, SIZE), flags=cv2.INTER_AREA if M[0, 0] ** 2 + M[1, 0] ** 2 < 1 else cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT101)
            mask = cv2.warpAffine(det.segmentation, M, (SIZE, SIZE), flags=cv2.INTER_NEAREST, borderMode=cv2.BORDER_CONSTANT, borderValue=0)
            scale = float(np.hypot(M[0, 0], M[1, 0]))
            xy = (M[:, :2] @ lm_px[:, :2].T).T + M[:, 2]
            lm_al = np.column_stack([xy, lm_px[:, 2] * scale])
            iq = image_quality(aligned, mask)
            q.update(iq)
            fails = []
            if iq["sharpness"] < QUALITY["min_sharpness"]:
                fails.append(f"soft or blurred (sharpness {iq['sharpness']})")
            if iq["clipped"] > QUALITY["max_clipped"]:
                fails.append(f"exposure clipped on {iq['clipped']:.0%} of the face")
            if fails:
                line.update(status="rejected", fails=fails)
                man.write(json.dumps(line) + "\n")
                rejected += 1
                continue
            if white_balance == "grayworld":
                aligned = grey_world(aligned, mask)
            cv2.imwrite(str(out / "aligned" / f"{rec.id}.png"), cv2.cvtColor(aligned, cv2.COLOR_RGB2BGR))
            cv2.imwrite(str(out / "masks" / f"{rec.id}.png"), mask)
            (out / "landmarks" / f"{rec.id}.json").write_text(json.dumps({
                "schema": "kumiki.makeup.landmarks/1", "size": [SIZE, SIZE], "points": np.round(lm_al, 3).tolist(),
                "pose": q["pose"], "blendshapes": {k: round(v, 4) for k, v in det.blendshapes.items()}, "source_to_aligned": np.round(M, 6).tolist()}))
            line.update(status="kept", white_balance=white_balance, files={k: f"{k}/{rec.id}.{'json' if k == 'landmarks' else 'png'}" for k in ("aligned", "landmarks", "masks")})
            man.write(json.dumps(line) + "\n")
            kept += 1
    analyzer.close()
    return {"kept": kept, "rejected": rejected, "out": str(out)}


def load_kept(out_dir: str) -> list[dict]:
    """Kept manifest lines (the last line per id wins, so re-runs append safely)."""
    seen: dict[str, dict] = {}
    for line in open(Path(out_dir) / "manifest.jsonl", encoding="utf-8"):
        d = json.loads(line)
        seen[d["id"]] = d
    return [d for d in seen.values() if d.get("status") == "kept"]


def load_face(out_dir: str, rec: dict) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Aligned RGB image, aligned landmarks (478 x 3, pixels) and the mask of one kept record."""
    base = Path(out_dir)
    rgb = cv2.cvtColor(cv2.imread(str(base / rec["files"]["aligned"])), cv2.COLOR_BGR2RGB)
    lm = np.array(json.loads((base / rec["files"]["landmarks"]).read_text())["points"], dtype=np.float64)
    mask = cv2.imread(str(base / rec["files"]["masks"]), cv2.IMREAD_GRAYSCALE)
    return rgb, lm, mask


__all__ = ["ingest", "load_kept", "load_face", "Record", "QUALITY", "SIZE"]
