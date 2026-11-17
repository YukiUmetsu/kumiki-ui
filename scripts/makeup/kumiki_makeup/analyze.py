"""Phase 2: read a reference face's makeup as a blueprint (theory made measurable).

1. Facial architecture: thirds, fifths, canthal tilt, lip ratio, brow map, cheekbone apex, face shape (geometry.py),
   and where each zone's light or shadow actually sits relative to its anchors (centroid, angle, spread in eye widths).
2. Chiaroscuro: a robust spherical-harmonic fit separates the face's own light and shadow from albedo (shading.py);
   each zone's albedo is compared with the bare skin in CIELAB (dL*, da*, db*).
3. Colour theory: skin lightness and ITA, hue-angle undertone, evenness; k-means palettes of lips, lids and cheeks;
   facial contrast of brows, eyes and lips (Porcheron et al. 2013; Jones et al. 2015).
4. Texture and finish: specular share, peak, sharpness and sparkle points in the highlight zones -> matte, satin, dewy,
   shimmer or glitter.

A bare-skin prior (learn.py) turns 'observed' zone colour into the makeup's 'effect': observed minus what bare faces
show in the same zone under the same analysis (redder cheeks and darker lids are natural, not makeup).
"""

from __future__ import annotations

from dataclasses import dataclass

import cv2
import numpy as np

from . import color as C
from .geometry import canonical, eye_width, face_metrics, interpolate, opening_triangles, rasterize, rest_frame, vertex_normals
from .shading import fit_light, light_model, occlusion, visibility
from .zones import atlas, resolve, weight

LUMA = np.array([0.2126, 0.7152, 0.0722])
SKIN_ZONES = ("under-eye", "cheek-contour", "temple-contour", "jaw-contour", "nose-contour", "cheekbone-highlight", "nose-highlight",
              "forehead-highlight", "chin-highlight", "blush-apples")
FEATURE_ZONES = ("lips", "brow", "lid", "crease", "outer-v", "lower-lash", "liner")
# the effect each zone is expected to show, for placement fitting: (channel, sign)
EFFECT = {"cheek-contour": ("L", -1), "temple-contour": ("L", -1), "jaw-contour": ("L", -1), "nose-contour": ("L", -1),
          "cheekbone-highlight": ("L", 1), "nose-highlight": ("L", 1), "forehead-highlight": ("L", 1), "chin-highlight": ("L", 1),
          "under-eye": ("L", 1), "blush-apples": ("a", 1), "crease": ("L", -1), "outer-v": ("L", -1)}


@dataclass
class Face:
    rgb: np.ndarray
    lin: np.ndarray
    lm: np.ndarray  # 478 x 3 image pixels (y down, z scaled like x, growing away)
    mask: np.ndarray
    rest: np.ndarray  # 478 x 3 mm
    pose: dict
    tri: np.ndarray
    X: np.ndarray  # H x W x 3 rest positions (NaN off the mesh)
    U: np.ndarray  # H x W x 3 canonical positions
    N: np.ndarray  # H x W x 3 camera normals
    eyes: np.ndarray  # H x W bool: eye openings
    mouth: np.ndarray  # H x W bool: mouth opening
    bar: np.ndarray  # H x W x 3 barycentric weights
    cam: np.ndarray  # 478 x 3 camera frame (pixels; +y up, +z toward the viewer)
    Nv: np.ndarray  # 468 x 3 vertex normals, camera frame
    AO: np.ndarray  # H x W ambient occlusion of the face mesh


def prepare(rgb: np.ndarray, lm_px: np.ndarray, mask: np.ndarray) -> Face:
    """Mesh-map a face: per pixel its rest position, canonical position and normal; the eye and mouth openings."""
    H, W = rgb.shape[:2]
    V, T = canonical()
    cam = np.column_stack([lm_px[:, 0], -lm_px[:, 1], -lm_px[:, 2]])
    rf = rest_frame(cam)
    skip = opening_triangles()
    tri, bar = rasterize(lm_px[:468, :2], -lm_px[:468, 2], T, W, H, skip=skip)
    otri, _ = rasterize(lm_px[:468, :2], -lm_px[:468, 2], T, W, H, skip=~skip)
    from .geometry import EYE_LOOPS
    eye_set = set(EYE_LOOPS["R"]) | set(EYE_LOOPS["L"])
    is_eye = np.array([all(int(v) in eye_set for v in t) for t in T])
    eyes = (otri >= 0) & is_eye[np.maximum(otri, 0)]
    mouth = (otri >= 0) & ~is_eye[np.maximum(otri, 0)]
    X = interpolate(rf["rest"][:468], tri, bar, T)
    U = interpolate(V, tri, bar, T)
    Nv = vertex_normals(cam[:468], T)
    N = interpolate(Nv, tri, bar, T)
    N = N / np.maximum(1e-9, np.linalg.norm(N, axis=-1, keepdims=True))
    ao = interpolate(occlusion(cam[:468], T, Nv)[:, None], tri, bar, T)[..., 0]
    lin = C.srgb_to_linear(rgb.astype(np.float64) / 255.0)
    return Face(rgb, lin, lm_px, mask, rf["rest"], {k: round(v, 2) for k, v in rf["pose"].items()}, tri, X, U, N, eyes, mouth, bar, cam, Nv, np.nan_to_num(ao, nan=1.0))


def zone_maps(face: Face, ids) -> dict[str, np.ndarray]:
    m = face.tri >= 0
    pts = face.X[m]
    out = {}
    for z in ids:
        w = np.zeros(face.tri.shape)
        w[m] = weight(z, pts, face.rest)
        out[z] = w
    return out


def _lab_of_ratio(skin_lin: np.ndarray, ratio: np.ndarray) -> np.ndarray:
    return C.linear_to_lab(np.clip(skin_lin * ratio, 0, 4))


def _placement(face: Face, zid: str, dmap: np.ndarray, valid: np.ndarray) -> dict | None:
    """Where the zone's effect actually sits: the effect-weighted centroid (relative to the zone's own centre), the
    principal angle and the spread, in eye widths, per side, in a search area larger than the zone."""
    ch, sign = EFFECT[zid]
    ew = eye_width(face.rest)
    m = (face.tri >= 0) & valid
    pts = face.X[m]
    out = {}
    for part, side in zip(resolve(zid, face.rest, {"radius": 1.6, "soft": 2.0}), ("R", "L")):
        from .zones import part_weight
        search = part_weight(pts, part)
        e = np.maximum(0, sign * dmap[m]) * search
        if e.sum() < 1e-6 or (e > 0).sum() < 30:
            continue
        cen = (pts * e[:, None]).sum(0) / e.sum()
        ref = resolve(zid, face.rest)[0 if side == "R" else -1].pts.mean(0)
        d = (pts[:, :2] - cen[:2]) * np.sqrt(e[:, None] / e.sum())
        cov = d.T @ d
        evals, evecs = np.linalg.eigh(cov)
        major = evecs[:, 1]
        sx = -1.0 if side == "L" else 1.0  # report the left side in the right side's frame
        ang = np.degrees(np.arctan2(major[1], major[0] * sx))
        ang = (ang + 90) % 180 - 90
        out[side] = {"centroid_ew": [round(float((cen[0] - ref[0]) * sx / ew), 3), round(float((cen[1] - ref[1]) / ew), 3)],
                     "angle_deg": round(float(ang), 1), "spread_ew": [round(float(np.sqrt(max(evals[1], 0)) / ew), 3), round(float(np.sqrt(max(evals[0], 0)) / ew), 3)]}
    return out or None


def _finish(face: Face, ratio_y: np.ndarray, chroma_drop: np.ndarray, sel: np.ndarray, ew_px: float, thresholds: dict | None = None) -> dict:
    """Specular share (shine over a broad area), peak (how bright the sheen gets) and sparkle (isolated, colourless
    bright points per square eye width) of a zone. Classes come from thresholds learned on bare faces (learn.py:
    matte below bare skin's 20th percentile of sheen, dewy above its 90th, shimmer and glitter above its sparkle range);
    without them, fixed estimates (grade E)."""
    r = ratio_y[sel]
    if len(r) < 40:
        return {}
    spec = (r > 1.25) & (chroma_drop[sel] > 0.08)
    peak = float(np.percentile(r, 98))
    g = np.zeros(face.tri.shape, np.float32)
    g[sel] = np.clip(ratio_y[sel], 0, 4)
    top = g - cv2.morphologyEx(g, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))
    pts = (top > 0.3) & sel & (chroma_drop > 0.1)
    n, _, stats, _ = cv2.connectedComponentsWithStats(pts.astype(np.uint8))
    small = int(((stats[1:, cv2.CC_STAT_AREA] >= 1) & (stats[1:, cv2.CC_STAT_AREA] <= 6)).sum()) if n > 1 else 0
    sparkle = small / max(1e-6, sel.sum() / ew_px ** 2)
    share = float(spec.mean())
    t = thresholds or {"matte_peak": 1.1, "dewy_peak": 1.45, "dewy_share": 0.04, "shimmer": 2.5, "glitter": 6.0}
    cls = ("glitter" if sparkle > t["glitter"] else "shimmer" if sparkle > t["shimmer"] else "dewy" if (peak > t["dewy_peak"] and share > t["dewy_share"])
           else "matte" if peak < t["matte_peak"] else "satin")
    return {"specular_share": round(share, 4), "peak": round(peak, 3), "sparkle_per_ew2": round(float(sparkle), 2), "class": cls}


def analyze(face: Face, prior: dict | None = None, labels: dict | None = None, finish_thresholds: dict | None = None, shape_reference: dict | None = None) -> dict:
    """The blueprint of one face. With a bare-skin prior, each zone also gets its makeup effect."""
    H, W = face.tri.shape
    on = face.tri >= 0
    ew = eye_width(face.rest)
    # pixels per mm at this image: the mean scale of the eye-corner distances in the image
    ew_px = float((np.linalg.norm(face.lm[33, :2] - face.lm[133, :2]) + np.linalg.norm(face.lm[263, :2] - face.lm[362, :2])) / 2)
    zmap = zone_maps(face, tuple(z["id"] for z in atlas()["zones"] if z.get("measure")) + ("foundation", "tear-trough", "inner-corner"))
    skin_seg = face.mask == 3
    feature_w = np.maximum.reduce([zmap[z] for z in FEATURE_ZONES])
    makeup_w = np.maximum.reduce([zmap[z] for z in SKIN_ZONES])
    # 1. light: a robust fit over skin that is not a feature, with the mesh's own occlusion and the key's cast shadow
    Y = face.lin @ LUMA
    fit_sel = on & skin_seg & (feature_w < 0.15)
    _, T = canonical()
    vis_map: dict = {}

    def vis_at(light):
        vis_map["m"] = np.nan_to_num(interpolate(visibility(face.cam[:468], T, face.Nv, light)[:, None], face.tri, face.bar, T)[..., 0], nan=1.0)
        return vis_map["m"][fit_sel]
    coeff, light_dir = fit_light(Y[fit_sel], face.N[fit_sel], face.AO[fit_sel], vis_at)
    S = np.ones((H, W))
    s_on = light_model(face.N[on], face.AO[on], vis_map["m"][on], light_dir) @ coeff
    S[on] = np.maximum(s_on, 0.05 * max(1e-6, float(np.percentile(s_on, 95))))
    A = face.lin / S[..., None]
    # 2. bare skin: clean (no feature, little makeup) and well lit
    clean = fit_sel & (makeup_w < 0.2)
    if clean.sum() < 200:
        clean = fit_sel
    base_A = np.median(A[clean], axis=0)
    ratio = A / base_A
    ratio_y = (A @ LUMA) / float(base_A @ LUMA)
    # the skin's local colour in light, as a painter samples it: lit mid-tones (shading between its 40th and 85th
    # percentile), without specular points; the brightest pixels of dark skin are mostly shine
    s_lo, s_hi = np.percentile(S[clean], [40, 85])
    local = clean & (S >= s_lo) & (S <= s_hi) & (ratio_y <= 1.2)
    if local.sum() < 100:
        local = clean
    skin_lin = np.median(face.lin[local], axis=0)
    skin_lab = C.linear_to_lab(skin_lin)
    ita = C.ita_degrees(skin_lab)
    lab_alb = np.full((H, W, 3), np.nan)
    lab_alb[on] = _lab_of_ratio(skin_lin, ratio[on])
    dL = lab_alb[..., 0] - skin_lab[0]
    da = lab_alb[..., 1] - skin_lab[1]
    # chroma drop of a pixel against skin (specular light is the illuminant's colour, so it lowers saturation)
    sat = lambda c: (c.max(-1) - c.min(-1)) / np.maximum(1e-6, c.max(-1))
    chroma_drop = np.zeros((H, W))
    chroma_drop[on] = sat(base_A[None, :]) - sat(A[on])
    evenness_L = float(np.nanstd(dL[clean]))
    evenness_a = float(np.nanstd(da[clean]))

    zones: dict = {}
    for zid, w in zmap.items():
        if zid in ("foundation", "tear-trough", "inner-corner"):
            continue
        sel = on & (w > 0.6)
        if zid in SKIN_ZONES:
            sel &= skin_seg
        if zid == "lips":
            sel &= ~face.mouth
        n = int(sel.sum())
        if n < 25:
            zones[zid] = {"pixels": n}
            continue
        rz = np.median(ratio[sel], axis=0)
        lab_z = _lab_of_ratio(skin_lin, rz)
        obs = {"dL": round(float(lab_z[0] - skin_lab[0]), 2), "da": round(float(lab_z[1] - skin_lab[1]), 2), "db": round(float(lab_z[2] - skin_lab[2]), 2)}
        z = {"pixels": n, "observed": obs, "lab": [round(float(v), 2) for v in lab_z], "hex": C.hex_of_lab(lab_z)}
        if prior and zid in prior:
            p = prior[zid]
            z["effect"] = {k: round(obs[k] - p[k], 2) for k in ("dL", "da", "db")}
        if zid in EFFECT:
            ch = EFFECT[zid][0]
            dmap = dL if ch == "L" else da
            if prior and zid in prior:
                dmap = dmap - prior[zid]["dL" if ch == "L" else "da"]
            z["placement"] = _placement(face, zid, np.nan_to_num(dmap), skin_seg if zid in SKIN_ZONES else np.ones_like(skin_seg))
        zones[zid] = z

    # 3. palettes (albedo-corrected colours, as the product looks on this skin under even light)
    def palette(ids, k=3, extra=None):
        sel = on & (np.maximum.reduce([zmap[i] for i in ids]) > 0.6) & ~face.mouth
        if extra is not None:
            sel &= extra
        px = lab_alb[sel]
        px = px[~np.isnan(px).any(1)]
        return C.kmeans_lab(px, k)
    palettes = {"lips": palette(["lips"]), "lids": palette(["lid", "crease", "outer-v"], extra=face.mask != 1), "cheeks": palette(["blush-apples"], k=2, extra=skin_seg)}

    # 4. facial contrast on the image as photographed (the published method)
    lab_img = C.linear_to_lab(face.lin)
    def ring(feature: np.ndarray, radius_ew: float, exclude: np.ndarray) -> np.ndarray:
        k = max(3, int(radius_ew * ew_px) | 1)
        grown = cv2.dilate(feature.astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k))) > 0
        return grown & ~feature & ~exclude
    brow_f = on & (zmap["brow"] > 0.5)
    eye_f = face.eyes | (on & (zmap["liner"] > 0.3))
    lip_f = on & (zmap["lips"] > 0.5) & ~face.mouth
    contrast = {}
    for name, feat, rad, excl in (("brows", brow_f, 0.7, eye_f | (face.mask == 1)), ("eyes", eye_f, 1.0, brow_f | (face.mask == 1)), ("lips", lip_f, 0.9, face.mouth)):
        sur = ring(feat, rad, excl) & ((on & skin_seg) | ~on) & (face.mask == 3)
        if feat.sum() > 20 and sur.sum() > 50:
            contrast[name] = C.michelson_contrast(np.median(lab_img[sur], 0), np.median(lab_img[feat], 0))

    # 5. finish
    finish = {}
    for zid in ("cheekbone-highlight", "nose-highlight", "forehead-highlight"):
        sel = on & skin_seg & (zmap[zid] > 0.5)
        f = _finish(face, ratio_y, chroma_drop, sel, ew_px, finish_thresholds)
        if f:
            finish[zid] = f
    allskin = on & skin_seg & (feature_w < 0.2)
    finish["overall"] = _finish(face, ratio_y, chroma_drop, allskin, ew_px, finish_thresholds)

    return {
        "schema": "kumiki.makeup.blueprint/1",
        "pose": face.pose,
        "geometry": face_metrics(face.rest, shape_reference),
        "skin": {"lab": [round(float(v), 2) for v in skin_lab], "hex": C.hex_of_lab(skin_lab), "ita": round(ita, 2), "ita_category": C.ita_category(ita),
                 "undertone": C.undertone(skin_lab), "evenness": {"sd_L": round(evenness_L, 3), "sd_a": round(evenness_a, 3)}},
        "light": {"model": "AO * SH9 + key * shadow * max(0, n.l)", "coefficients": [round(float(c), 5) for c in coeff],
                  "direction": [round(float(v), 3) for v in light_dir], "shadowed_share": round(float(1 - vis_map["m"][fit_sel].mean()), 3)},
        "zones": zones,
        "palettes": palettes,
        "contrast": contrast,
        "finish": finish,
        "labels": labels or {},
        "scale": {"eye_width_mm": round(ew, 2), "eye_width_px": round(ew_px, 2)},
    }


def overlay(face: Face, blueprint: dict) -> np.ndarray:
    """A debug picture: the aligned face with each measured zone's half-strength outline and its dL*."""
    img = cv2.cvtColor(face.rgb, cv2.COLOR_RGB2BGR).copy()
    zmap = zone_maps(face, [z for z in blueprint["zones"]])
    colours = {"contour": (60, 60, 200), "highlight": (60, 220, 240), "blush": (140, 80, 230), "eyeshadow": (200, 120, 60), "liner": (30, 30, 30),
               "brow": (40, 100, 160), "lipstick": (80, 40, 200), "concealer": (200, 200, 90)}
    for zid, w in zmap.items():
        prod = atlas()["by_id"][zid]["product"]
        cs, _ = cv2.findContours((w > 0.5).astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
        cv2.drawContours(img, cs, -1, colours.get(prod, (255, 255, 255)), 1, cv2.LINE_AA)
    sk = blueprint["skin"]
    cv2.putText(img, f"L*{sk['lab'][0]:.0f} ITA {sk['ita']:.0f} {sk['undertone']['class']}", (8, 20), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 2, cv2.LINE_AA)
    cv2.putText(img, f"L*{sk['lab'][0]:.0f} ITA {sk['ita']:.0f} {sk['undertone']['class']}", (8, 20), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (20, 20, 20), 1, cv2.LINE_AA)
    return img
