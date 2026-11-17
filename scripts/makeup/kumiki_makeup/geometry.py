"""Facial geometry from the 468-point mesh: the rest frame, a triangle rasteriser and facial architecture.

Rest frame: millimetres, +x the face's own left, +y up, +z forward (ANAT1's convention). A photo's landmarks are fitted
to the canonical MediaPipe mesh by a similarity transform (Umeyama 1991), so the person's own shape is kept, frontal and
at canonical scale. Every pixel inside the mesh gets a triangle and barycentric weights, so any per-vertex quantity
(rest position, canonical position, normal) can be read per pixel: this is the mesh (UV) mapping of the face.
"""

from __future__ import annotations

import json
import math
from functools import lru_cache

import numpy as np

from . import DATA

# Vertices that move little with expression (forehead, brows, nose, eye corners, cheekbones): used for the pose fit.
STABLE = [10, 151, 9, 8, 168, 6, 197, 195, 5, 4, 1, 33, 133, 263, 362, 130, 359, 243, 463, 116, 345, 117, 346, 118, 347,
          50, 280, 123, 352, 108, 337, 69, 299, 104, 333, 105, 334, 66, 296, 107, 336, 55, 285]
# Triangles over the eye openings and the mouth opening (all three vertices on the lid or inner-lip loops).
EYE_LOOPS = {"R": [33, 246, 161, 160, 159, 158, 157, 173, 133, 7, 163, 144, 145, 153, 154, 155],
             "L": [263, 466, 388, 387, 386, 385, 384, 398, 362, 249, 390, 373, 374, 380, 381, 382]}
INNER_LIPS = [78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308, 95, 88, 178, 87, 14, 317, 402, 318, 324]


@lru_cache(maxsize=1)
def canonical() -> tuple[np.ndarray, np.ndarray]:
    """The canonical face (468 x 3, mm) and its triangles (898 x 3), from the file ANAT1 already ships."""
    d = json.loads((DATA / "face-mesh-mediapipe.json").read_text())
    return np.array(d["vertices"], dtype=np.float64), np.array(d["triangles"], dtype=np.int32)


@lru_cache(maxsize=1)
def mirror_map() -> np.ndarray:
    """Each vertex's partner across the midline: the nearest reflected neighbour (as face-beauty.ts does)."""
    V, _ = canonical()
    R = V * np.array([-1, 1, 1])
    d = ((V[:, None, :] - R[None, :, :]) ** 2).sum(-1)
    return d.argmin(axis=0).astype(np.int32)


@lru_cache(maxsize=1)
def opening_triangles() -> np.ndarray:
    """A boolean per triangle: True over an eye opening or the mouth opening (not skin)."""
    _, T = canonical()
    sets = [set(EYE_LOOPS["R"]), set(EYE_LOOPS["L"]), set(INNER_LIPS)]
    return np.array([any(all(int(v) in s for v in t) for s in sets) for t in T])


def camera_points(lm: np.ndarray, width: int, height: int) -> np.ndarray:
    """MediaPipe normalised landmarks -> camera frame in pixels: +x right, +y up, +z toward the viewer.
    (MediaPipe's z is scaled like x and grows away from the camera.)"""
    lm = np.asarray(lm, dtype=np.float64)
    return np.stack([lm[:, 0] * width, -lm[:, 1] * height, -lm[:, 2] * width], axis=1)


def umeyama(src: np.ndarray, dst: np.ndarray) -> tuple[float, np.ndarray, np.ndarray]:
    """Least-squares similarity (scale s, rotation R, translation t) with s*R@src + t ~ dst (Umeyama 1991)."""
    ms, md = src.mean(0), dst.mean(0)
    a, b = src - ms, dst - md
    cov = b.T @ a / len(src)
    U, S, Vt = np.linalg.svd(cov)
    D = np.eye(3)
    if np.linalg.det(U) * np.linalg.det(Vt) < 0:
        D[2, 2] = -1
    R = U @ D @ Vt
    s = float(np.trace(np.diag(S) @ D) / (a ** 2).sum(axis=1).mean())
    return s, R, md - s * R @ ms


def rest_frame(cam: np.ndarray) -> dict:
    """Fit a face (camera-frame points) to the canonical mesh. Returns the rest-frame points (mm) and the transform."""
    V, _ = canonical()
    s, R, t = umeyama(cam[STABLE], V[STABLE])
    rest = (s * (R @ cam.T)).T + t
    head = R.T  # canonical -> camera rotation, the head pose
    yaw = math.degrees(math.atan2(head[0, 2], head[2, 2]))
    pitch = math.degrees(math.asin(max(-1.0, min(1.0, -head[1, 2]))))
    roll = math.degrees(math.atan2(head[1, 0], head[1, 1]))
    resid = float(np.sqrt(((rest[:468] - V) ** 2).sum(1).mean()))
    return {"rest": rest, "scale": s, "R": R, "t": t, "pose": {"yaw": yaw, "pitch": pitch, "roll": roll}, "residual_mm": resid}


def vertex_normals(P: np.ndarray, T: np.ndarray) -> np.ndarray:
    """Area-weighted vertex normals, oriented toward +z (the viewer, or the front in the rest frame)."""
    a, b, c = P[T[:, 0]], P[T[:, 1]], P[T[:, 2]]
    fn = np.cross(b - a, c - a)
    n = np.zeros_like(P)
    for k in range(3):
        np.add.at(n, T[:, k], fn)
    if n[:, 2].sum() < 0:
        n = -n
    return n / np.maximum(1e-9, np.linalg.norm(n, axis=1, keepdims=True))


def rasterize(xy: np.ndarray, depth: np.ndarray, T: np.ndarray, width: int, height: int, skip: np.ndarray | None = None):
    """Rasterise triangles given in pixel coordinates (y down). Nearest surface wins (larger depth = closer).
    Returns tri (H x W, -1 outside) and barycentric weights (H x W x 3)."""
    tri = np.full((height, width), -1, dtype=np.int32)
    bar = np.zeros((height, width, 3), dtype=np.float32)
    zbuf = np.full((height, width), -np.inf, dtype=np.float64)
    for k, (i0, i1, i2) in enumerate(T):
        if skip is not None and skip[k]:
            continue
        p0, p1, p2 = xy[i0], xy[i1], xy[i2]
        x0, x1 = int(max(0, math.floor(min(p0[0], p1[0], p2[0])))), int(min(width - 1, math.ceil(max(p0[0], p1[0], p2[0]))))
        y0, y1 = int(max(0, math.floor(min(p0[1], p1[1], p2[1])))), int(min(height - 1, math.ceil(max(p0[1], p1[1], p2[1]))))
        if x1 < x0 or y1 < y0:
            continue
        den = (p1[1] - p2[1]) * (p0[0] - p2[0]) + (p2[0] - p1[0]) * (p0[1] - p2[1])
        if abs(den) < 1e-9:
            continue
        gx, gy = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
        w0 = ((p1[1] - p2[1]) * (gx - p2[0]) + (p2[0] - p1[0]) * (gy - p2[1])) / den
        w1 = ((p2[1] - p0[1]) * (gx - p2[0]) + (p0[0] - p2[0]) * (gy - p2[1])) / den
        w2 = 1 - w0 - w1
        inside = (w0 >= -1e-6) & (w1 >= -1e-6) & (w2 >= -1e-6)
        if not inside.any():
            continue
        z = w0 * depth[i0] + w1 * depth[i1] + w2 * depth[i2]
        sub = zbuf[y0:y1 + 1, x0:x1 + 1]
        win = inside & (z > sub)
        sub[win] = z[win]
        tri[y0:y1 + 1, x0:x1 + 1][win] = k
        bar[y0:y1 + 1, x0:x1 + 1][win] = np.stack([w0, w1, w2], -1)[win]
    return tri, bar


def interpolate(attr: np.ndarray, tri: np.ndarray, bar: np.ndarray, T: np.ndarray) -> np.ndarray:
    """Per-pixel interpolation of a per-vertex attribute (N x k); NaN outside the mesh."""
    out = np.full(tri.shape + (attr.shape[1],), np.nan, dtype=np.float64)
    m = tri >= 0
    idx = T[tri[m]]
    b = bar[m].astype(np.float64)
    out[m] = (attr[idx[:, 0]] * b[:, :1] + attr[idx[:, 1]] * b[:, 1:2] + attr[idx[:, 2]] * b[:, 2:3])
    return out


# ---- Facial architecture -------------------------------------------------------------------------------------------

def eye_width(P: np.ndarray) -> float:
    return float((np.linalg.norm(P[33] - P[133]) + np.linalg.norm(P[263] - P[362])) / 2)


def _shape_features(P: np.ndarray) -> dict:
    cheek = abs(P[454, 0] - P[234, 0])
    return {"length_width": (P[10, 1] - P[152, 1]) / cheek, "forehead_cheek": abs(P[284, 0] - P[54, 0]) / cheek,
            "jaw_cheek": abs(P[397, 0] - P[172, 0]) / cheek, "chin_jaw": abs(P[378, 0] - P[149, 0]) / abs(P[397, 0] - P[172, 0])}


# Face-shape prototypes as changes from the canonical (average) mask, which cosmetology's "oval" ideal matches; the
# conventions are makeup-artist practice, the percentages are estimates (grade E), the spread a typical SD of 4%.
FACE_SHAPES = {
    "oval": {}, "round": {"length_width": -0.08, "jaw_cheek": 0.04, "chin_jaw": 0.08}, "square": {"length_width": -0.06, "jaw_cheek": 0.1, "chin_jaw": 0.1},
    "oblong": {"length_width": 0.1}, "heart": {"forehead_cheek": 0.06, "jaw_cheek": -0.08, "chin_jaw": -0.12},
    "diamond": {"forehead_cheek": -0.09, "jaw_cheek": -0.07, "chin_jaw": -0.05}, "triangle": {"forehead_cheek": -0.08, "jaw_cheek": 0.1},
}


def face_shape(P: np.ndarray, reference: dict | None = None) -> dict:
    """Nearest face-shape prototype. 'reference' is the average face's features in the same measurement (learn.py
    stores the bare references' mean): photo landmarks and the canonical mesh differ systematically (a photo's
    outline points sit on the visible cheek, the mesh's behind it), so each source needs its own average."""
    V, _ = canonical()
    f = _shape_features(P)
    f0 = reference or _shape_features(V)
    scores = {}
    for name, d in FACE_SHAPES.items():
        dist = sum(((f[k] / f0[k] - 1) - d.get(k, 0)) ** 2 for k in f) / 0.04 ** 2
        scores[name] = math.exp(-0.5 * dist)
    tot = sum(scores.values()) or 1
    probs = {k: round(v / tot, 3) for k, v in sorted(scores.items(), key=lambda kv: -kv[1])}
    return {"class": next(iter(probs)), "probabilities": probs, "features": {k: round(v, 4) for k, v in f.items()}}


def face_metrics(P: np.ndarray, shape_reference: dict | None = None) -> dict:
    """Facial architecture of a rest-frame face (mm). Works on photo landmarks and on ANAT1's own face alike."""
    ew = eye_width(P)
    tilt = {s: math.degrees(math.atan2(P[ex, 1] - P[en, 1], abs(P[ex, 0] - P[en, 0]))) for s, ex, en in (("R", 33, 133), ("L", 263, 362))}
    palp = {s: (P[u, 1] - P[d, 1]) / max(1e-6, abs(P[ex, 0] - P[en, 0])) for s, u, d, ex, en in (("R", 159, 145, 33, 133), ("L", 386, 374, 263, 362))}
    upper, lower = P[0, 1] - P[13, 1], P[14, 1] - P[17, 1]
    mid, low, top = P[9, 1] - P[2, 1], P[2, 1] - P[152, 1], P[10, 1] - P[9, 1]
    face_w = abs(P[454, 0] - P[234, 0])
    # brow map: arch = the highest point of the upper brow loop; tail measured against the alare -> exocanthion ray
    brow = {}
    for s, loop, en, ex, al in (("R", [70, 63, 105, 66, 107], 133, 33, 129), ("L", [300, 293, 334, 296, 336], 362, 263, 358)):
        # the peak of a parabola through the upper brow points (five landmarks would snap it to a vertex)
        xs, ys = P[loop, 0], P[loop, 1]
        a2, a1, _ = np.polyfit(xs, ys, 2)
        px = -a1 / (2 * a2) if a2 < 0 else xs[int(np.argmax(ys))]
        px = float(np.clip(px, min(xs), max(xs)))
        frac = (px - P[en, 0]) / (P[ex, 0] - P[en, 0])
        ray = P[ex, :2] - P[al, :2]
        tail = P[loop[0], :2]
        t = (tail[1] - P[al, 1]) / ray[1] if abs(ray[1]) > 1e-6 else 0
        brow[s] = {"peak_fraction_of_eye_width": round(float(frac), 3), "tail_off_alar_canthus_line_ew": round(float((tail[0] - (P[al, 0] + ray[0] * t)) / ew), 3),
                   "head_over_inner_canthus_ew": round(float((P[loop[-1], 0] - P[en, 0]) / ew), 3)}
    # cheekbone apex: the cheek vertex furthest along an oblique direction (forward and out), as light from a
    # three-quarter key finds it
    cheek_r = [50, 101, 36, 205, 117, 118, 116, 123, 147, 187, 119, 100, 111, 35]
    apex = {}
    for s, sign, cand, ex in (("R", -1, cheek_r, 33), ("L", 1, [int(mirror_map()[i]) for i in cheek_r], 263)):
        best = max(cand, key=lambda i: sign * P[i, 0] * 0.55 + P[i, 2] * 0.83)
        apex[s] = {"vertex": int(best), "from_exocanthion_ew": [round(float((P[best, 0] - P[ex, 0]) / ew), 3), round(float((P[best, 1] - P[ex, 1]) / ew), 3)]}
    # asymmetry: RMS distance between each vertex and its mirrored partner reflected across the midline
    mm = mirror_map()
    asym = float(np.sqrt(((P[:468] - P[mm] * np.array([-1, 1, 1])) ** 2).sum(1).mean()))
    return {
        "eye_width_mm": round(ew, 2),
        "asymmetry_mm": round(asym, 3),
        "canthal_tilt_deg": {k: round(v, 2) for k, v in tilt.items()},
        "palpebral_ratio": {k: round(float(v), 3) for k, v in palp.items()},
        "intercanthal_over_eye_width": round(float(abs(P[362, 0] - P[133, 0]) / ew), 3),
        "face_width_over_eye_width": round(float(face_w / ew), 3),
        "lips": {"upper_mm": round(float(upper), 2), "lower_mm": round(float(lower), 2), "lower_over_upper": round(float(lower / max(1e-6, upper)), 3),
                 "mouth_over_nose_width": round(float(abs(P[291, 0] - P[61, 0]) / max(1e-6, abs(P[358, 0] - P[129, 0]))), 3)},
        "thirds": {"mask_top_to_glabella_mm": round(float(top), 2), "glabella_to_subnasale_mm": round(float(mid), 2), "subnasale_to_menton_mm": round(float(low), 2),
                   "lower_over_middle": round(float(low / max(1e-6, mid)), 3)},
        "brow_map": brow,
        "cheekbone_apex": apex,
        "face_shape": face_shape(P, shape_reference),
    }
