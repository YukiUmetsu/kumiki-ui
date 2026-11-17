"""The MAKEUP1 zone atlas (registry/anatomy/data/makeup-zones.json) evaluated on a face.

A zone is a stroke (a polyline with a radius at each point, measured in 3D) or a polygon (seen from the front), anchored
to mesh vertices and sized in eye widths. Weights are 1 in the core and fall to 0 across the zone's blend width.
registry/anatomy/makeup-zones.ts evaluates the same file; keep the two in step.
"""

from __future__ import annotations

import json
import math
from dataclasses import dataclass
from functools import lru_cache

import numpy as np

from . import DATA
from .geometry import canonical, eye_width, mirror_map


@dataclass
class Part:
    kind: str
    pts: np.ndarray  # n x 3, mm
    r: np.ndarray  # n, mm (strokes)
    soft: float  # mm
    grow: float  # mm (polygons)


@lru_cache(maxsize=1)
def atlas() -> dict:
    doc = json.loads((DATA / "makeup-zones.json").read_text())
    doc["by_id"] = {z["id"]: z for z in doc["zones"]}
    return doc


def _smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def point(spec: dict, P: np.ndarray, ew: float, mirrored: bool) -> np.ndarray:
    """Resolve a point spec on a face (rest frame, mm). Mirrored points use the vertex's partner and flip x offsets."""
    mm = mirror_map()
    idx = (lambda i: int(mm[i])) if mirrored else (lambda i: int(i))
    if "v" in spec:
        p = P[idx(spec["v"])].copy()
    elif "mix" in spec:
        ws = np.array([w for _, w in spec["mix"]], dtype=np.float64)
        p = (np.stack([P[idx(i)] for i, _ in spec["mix"]]) * ws[:, None]).sum(0) / ws.sum()
    elif "lerp" in spec:
        a, b, t = spec["lerp"]
        pa, pb = point(a, P, ew, mirrored), point(b, P, ew, mirrored)
        p = pa + (pb - pa) * float(t)
    elif "a" in spec:
        p = point(atlas()["anchors"][spec["a"]], P, ew, mirrored)
    else:
        raise ValueError(f"unknown point spec {spec}")
    off = spec.get("off")
    if off:
        p = p + np.array([-off[0] if mirrored else off[0], off[1], off[2]]) * ew
    if spec.get("surface"):
        z = _skin_depth(P, float(p[0]), float(p[1]))
        if z is not None:
            p = np.array([p[0], p[1], z])
    return p


def _skin_depth(P: np.ndarray, x: float, y: float) -> float | None:
    """The face's front surface under (x, y): the depth of the nearest mesh triangle that covers it, seen from the front
    (makeup-zones.ts skinDepth does the same)."""
    T = canonical()[1]
    A, B, C = P[T[:, 0]], P[T[:, 1]], P[T[:, 2]]
    d = (B[:, 1] - C[:, 1]) * (A[:, 0] - C[:, 0]) + (C[:, 0] - B[:, 0]) * (A[:, 1] - C[:, 1])
    ok = np.abs(d) >= 1e-9
    dd = np.where(ok, d, 1.0)
    w1 = ((B[:, 1] - C[:, 1]) * (x - C[:, 0]) + (C[:, 0] - B[:, 0]) * (y - C[:, 1])) / dd
    w2 = ((C[:, 1] - A[:, 1]) * (x - C[:, 0]) + (A[:, 0] - C[:, 0]) * (y - C[:, 1])) / dd
    w3 = 1 - w1 - w2
    inside = ok & (w1 >= 0) & (w2 >= 0) & (w3 >= 0)
    if not inside.any():
        return None
    return float((w1 * A[:, 2] + w2 * B[:, 2] + w3 * C[:, 2])[inside].max())


def resolve(zone_id: str, P: np.ndarray, adjust: dict | None = None) -> list[Part]:
    """The zone's parts on this face: one per side ('both') or one ('center'), after an optional adjustment
    {shift: [dx, dy] ew, rotate: deg, scale, radius: x, soft: x, grow: ew} (rotation and scale about the first point;
    on the mirrored side the shift's x and the rotation flip)."""
    z = atlas()["by_id"][zone_id]
    ew = eye_width(P)
    sh = z["shape"]
    adj = adjust or {}
    parts = []
    for mirrored in ((False, True) if z.get("side", "both") == "both" else (False,)):
        pts = np.stack([point(p, P, ew, mirrored) for p in sh["points"]])
        r = np.array([p.get("r", 0.0) for p in sh["points"]], dtype=np.float64) * ew * adj.get("radius", 1.0)
        sx = -1.0 if mirrored else 1.0
        if adj.get("scale") or adj.get("rotate"):
            piv = pts[0].copy()
            k = adj.get("scale", 1.0)
            ang = math.radians(adj.get("rotate", 0.0)) * sx
            c, s = math.cos(ang), math.sin(ang)
            d = pts - piv
            pts = piv + np.stack([(d[:, 0] * c - d[:, 1] * s) * k, (d[:, 0] * s + d[:, 1] * c) * k, d[:, 2] * k], axis=1)
        if adj.get("shift"):
            dx, dy = adj["shift"][:2]
            pts = pts + np.array([dx * sx, dy, 0.0]) * ew
        parts.append(Part(sh["kind"], pts, r, sh.get("soft", 0.3) * ew * adj.get("soft", 1.0), (sh.get("grow", 0.0) + adj.get("grow", 0.0)) * ew))
    return parts


def _stroke_distance(X: np.ndarray, part: Part) -> np.ndarray:
    best = np.full(len(X), np.inf)
    Q, R = part.pts, part.r
    if len(Q) == 1:
        return np.linalg.norm(X - Q[0], axis=1) - R[0]
    for a, b, ra, rb in zip(Q[:-1], Q[1:], R[:-1], R[1:]):
        ab = b - a
        L2 = float(ab @ ab)
        t = np.clip(((X - a) @ ab) / L2, 0, 1) if L2 > 1e-12 else np.zeros(len(X))
        d = np.linalg.norm(X - (a + t[:, None] * ab), axis=1) - (ra + (rb - ra) * t)
        best = np.minimum(best, d)
    return best


def _polygon_distance(X: np.ndarray, part: Part) -> np.ndarray:
    """Signed distance in the frontal (x, y) plane: negative inside."""
    x, y = X[:, 0], X[:, 1]
    Q = part.pts[:, :2]
    inside = np.zeros(len(X), dtype=bool)
    dist = np.full(len(X), np.inf)
    for (ax, ay), (bx, by) in zip(Q, np.roll(Q, -1, axis=0)):
        crosses = ((ay > y) != (by > y)) & (x < (bx - ax) * (y - ay) / ((by - ay) if by != ay else 1e-12) + ax)
        inside ^= crosses
        vx, vy = bx - ax, by - ay
        L2 = vx * vx + vy * vy
        t = np.clip(((x - ax) * vx + (y - ay) * vy) / (L2 if L2 > 0 else 1), 0, 1)
        dist = np.minimum(dist, np.hypot(x - ax - vx * t, y - ay - vy * t))
    return np.where(inside, -dist, dist) - part.grow


def part_weight(X: np.ndarray, part: Part) -> np.ndarray:
    d = _stroke_distance(X, part) if part.kind == "stroke" else _polygon_distance(X, part)
    h = max(1e-6, part.soft / 2)
    return 1 - _smoothstep(-h, h, d)


def weight(zone_id: str, X: np.ndarray, P: np.ndarray, adjust: dict | None = None) -> np.ndarray:
    """Zone weight (0-1) at rest-frame points X (M x 3) of the face P (468+ x 3)."""
    w = np.zeros(len(X))
    for part in resolve(zone_id, P, adjust):
        w = np.maximum(w, part_weight(X, part))
    for other in atlas()["by_id"][zone_id].get("minus", []):
        w = w * (1 - weight(other, X, P))
    return w
