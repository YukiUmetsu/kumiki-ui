"""Phase 3: paint makeup onto a photographed face without painting over the skin.

The face is split into what light did and what the skin is (shading.py), and the skin into a smooth colour layer and
its fine detail (pores, fine lines, micro-shadows) by frequency separation. Products act on the smooth colour layer
as pigment films (makeup-zones.json 'film'): a stain multiplies (transparent dye), a paint replaces (opaque pigment),
most products are between. The detail layer is put back on top, attenuated only as much as the film hides (opaque
foundation hides some fine colour detail; micro-shadows stay because they are relief, not colour). The face's own
light is then put back, and the finish changes the shine: matte removes some, dewy and glossy add a sheen where the
key light lands, shimmer adds sparkle points fixed to the skin.

Where makeup goes:
  plan                atlas zones on the target's own landmarks (the zones follow its bone structure), with each
                      layer's adjustments (shift, rotate, scale) from the look;
  blueprint, atlas    (default) the reference's measured zones become a plan: effect as colour, measured placement
                      as a shift, measured finish;
  blueprint, mesh     the reference's per-pixel effect carried through the shared mesh (piecewise affine: the
                      468-point mesh is the UV map), denoised and gated to zones with a clear effect;
  blueprint, tps      the same through a thin-plate spline fitted on 86 landmarks (Bookstein 1989).
"""

from __future__ import annotations

import json
import math
from pathlib import Path

import cv2
import numpy as np

from . import color as C
from .analyze import LUMA, Face, prepare, zone_maps
from .geometry import canonical, interpolate
from .shading import fit_light, light_model, visibility
from .zones import atlas, weight

BLEND_MODES = ("film", "multiply", "normal", "screen", "soft-light")
TPS_POINTS = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234,
              127, 162, 21, 54, 103, 67, 109, 70, 63, 105, 66, 107, 336, 296, 334, 293, 300, 33, 160, 158, 133, 153, 144, 362, 385, 387, 263, 373, 380,
              168, 6, 197, 195, 5, 4, 1, 2, 98, 327, 61, 40, 37, 0, 267, 270, 291, 321, 314, 17, 84, 91, 50, 280, 205, 425, 187, 411]


# ---- Light and layers ----------------------------------------------------------------------------------------------

def decompose(face: Face, detail_ew: float = 0.06) -> dict:
    """Shading S, the smooth albedo (as the skin's apparent colour, linear RGB) and the detail ratio D."""
    H, W = face.tri.shape
    on = face.tri >= 0
    zm = zone_maps(face, ("lips", "brow", "lid", "liner"))
    feat = np.maximum.reduce(list(zm.values()))
    skin = on & (face.mask == 3) & (feat < 0.15)
    Y = face.lin @ LUMA
    _, T = canonical()
    vm: dict = {}

    def vis_at(light):
        vm["m"] = np.nan_to_num(interpolate(visibility(face.cam[:468], T, face.Nv, light)[:, None], face.tri, face.bar, T)[..., 0], nan=1.0)
        return vm["m"][skin]
    coeff, light = fit_light(Y[skin], face.N[skin], face.AO[skin], vis_at)
    S = np.ones((H, W))
    s_on = light_model(face.N[on], face.AO[on], vm["m"][on], light) @ coeff
    S[on] = np.maximum(s_on, 0.05 * max(1e-6, float(np.percentile(s_on, 95))))
    # the key light's own lit term, for placing a sheen
    key = np.zeros((H, W))
    key[on] = vm["m"][on] * np.maximum(0, face.N[on] @ light)
    A = face.lin / S[..., None]
    base = np.median(A[skin], axis=0)
    s_mid = float(np.median(S[skin]))
    alb = A * s_mid  # albedo expressed as the skin's colour under the face's typical light
    ew_px = float((np.linalg.norm(face.lm[33, :2] - face.lm[133, :2]) + np.linalg.norm(face.lm[263, :2] - face.lm[362, :2])) / 2)
    sigma = max(0.8, detail_ew * ew_px)
    # smooth colour layer: blur within the face only (normalised convolution keeps the edge from going dark)
    m = on.astype(np.float64)
    low = cv2.GaussianBlur(alb * m[..., None], (0, 0), sigma) / np.maximum(1e-6, cv2.GaussianBlur(m, (0, 0), sigma))[..., None]
    low = np.where(on[..., None], low, alb)
    D = np.where(on[..., None], alb / np.maximum(1e-6, low), 1.0)
    return {"S": S, "s_mid": s_mid, "alb": alb, "low": low, "D": D, "skin": skin, "skin_lin": base * s_mid, "key": key, "light": light, "ew_px": ew_px}


def pigment_for(apparent_lin: np.ndarray, skin_lin: np.ndarray, hide: float) -> np.ndarray:
    """The pigment (colour over white) whose film at full strength turns skin_lin into apparent_lin:
    apparent = m * (hide + (1 - hide) * skin)  ->  m = apparent / (hide + (1 - hide) * skin), clamped to [0, 1]."""
    return np.clip(apparent_lin / np.maximum(1e-4, hide + (1 - hide) * skin_lin), 0, 1)


def film(low: np.ndarray, layers: list[tuple[np.ndarray, np.ndarray, float, str, np.ndarray]]) -> tuple[np.ndarray, np.ndarray]:
    """Composite pigment films over the smooth albedo. Each layer: (strength per pixel, pigment, hide, blend, form).
    What a film lets through keeps the skin's own relief. What it hides becomes its pigment, lit by 'form' (the relief
    under it). Returns the new smooth albedo and the hiding share per pixel (for the detail layer)."""
    out = low.copy()
    hid = np.zeros(low.shape[:-1])
    for w, m, h, blend, form in layers:
        w3 = w[..., None]
        if blend in ("film", "multiply", "normal"):
            hh = 0.0 if blend == "multiply" else 1.0 if blend == "normal" else h
            out = out * ((1 - w3) + w3 * (1 - hh) * m) + w3 * hh * m * form[..., None]
            hid = 1 - (1 - hid) * (1 - w * hh)
        elif blend == "screen":
            out = 1 - (1 - out) * (1 - w3 * m)
        elif blend == "soft-light":
            # W3C compositing soft light, on gamma-encoded values (as designers expect it to look)
            cb, cs = C.linear_to_srgb(np.clip(out, 0, 1)), C.linear_to_srgb(m)
            d = np.where(cb <= 0.25, ((16 * cb - 12) * cb + 4) * cb, np.sqrt(cb))
            res = np.where(cs <= 0.5, cb - (1 - 2 * cs) * cb * (1 - cb), cb + (2 * cs - 1) * (d - cb))
            out = out + w3 * (C.srgb_to_linear(res) - out)
    return out, hid


def finish_change(dec: dict, wmap: np.ndarray, finish: str, coverage: float, seed_xy: np.ndarray | None = None) -> np.ndarray:
    """Linear-light change of shine for one finish over a zone: matte takes shine away, dewy and glossy add a sheen
    where the key light lands, shimmer and glitter add sparkle points (seeded by canonical position, so they stay on
    the skin)."""
    spec = atlas()["finishes"].get(finish, {})
    k = wmap * coverage
    lum = dec["low"] @ LUMA
    sheen = np.clip(dec["key"], 0, 1) ** (6.0 if finish == "glossy" else 3.0)
    out = np.zeros(dec["alb"].shape)
    mult = spec.get("specular", 0.85)
    if mult < 0.85:
        # matte: pull pixels brighter than their smooth colour (shine) back toward it
        shine = np.maximum(0, (dec["alb"] - dec["low"]) @ LUMA)
        out -= (k * (1 - mult) * shine)[..., None] * np.ones(3)
    elif mult > 0.85:
        out += (k * (mult - 0.85) * 0.22 * sheen * np.maximum(0.25, lum))[..., None] * np.ones(3)
    if spec.get("sparkle", 0) > 0 and seed_xy is not None:
        h = np.sin(seed_xy[..., 0] * 12.9898 + seed_xy[..., 1] * 78.233) * 43758.5453
        h = h - np.floor(h)
        pts = (h > 1 - 0.02 * spec["sparkle"]).astype(np.float64)
        out += (k * pts * (0.25 + sheen) * 0.6)[..., None] * np.ones(3)
    return out


def relief(face: Face, dec: dict, cover: np.ndarray, broad_ew: float = 0.35) -> np.ndarray:
    """Luminance relief of the smooth layer within a film's cover (the lips' volume, light on the cheek apples): form
    the coarse shading model misses. Paint follows form, so a film keeps it. The broad average is taken over the
    cover only: the darkness of lips or brows against the skin around them is their colour, not relief."""
    wgt = (face.tri >= 0) * cover
    y = dec["low"] @ LUMA
    sig = max(1.0, broad_ew * dec["ew_px"])
    broad = cv2.GaussianBlur(y * wgt, (0, 0), sig) / np.maximum(1e-6, cv2.GaussianBlur(wgt, (0, 0), sig))
    return np.where(wgt > 1e-3, np.clip(y / np.maximum(1e-6, broad), 0.6, 1.5), 1.0)


def recompose(face: Face, dec: dict, low_new: np.ndarray, hidden: np.ndarray, shine: np.ndarray) -> np.ndarray:
    """New sRGB image: smooth albedo x detail (thinned by what the film hides) x the face's own light + shine."""
    on = face.tri >= 0
    keep = 1 - 0.55 * hidden  # opaque film thins fine colour detail; relief stays
    D = dec["D"] ** keep[..., None]
    alb_new = low_new * D
    lin_new = alb_new / dec["s_mid"] * dec["S"][..., None] + shine
    out = face.lin.copy()
    out[on] = lin_new[on]
    return np.clip(np.round(C.linear_to_srgb(np.clip(out, 0, 1)) * 255), 0, 255).astype(np.uint8)


# ---- Plans (atlas zones) ---------------------------------------------------------------------------------------------

def resolve_colour(layer: dict, skin_lin: np.ndarray, hide: float) -> np.ndarray:
    """A layer's pigment. 'lab' or 'hex' is the product's colour over white; 'relative' {dL, da, db} is how the
    product should look at full strength against the skin (or, with "to": "zone", against the zone's own colour,
    which apply_plan passes in as skin_lin: lips, brows). 'over' {dL, da, db}, against the skin, is the colour that
    the 'relative' look was laid over (a blueprint's bare prior): the pigment is solved over it, so the film lays the
    same product over the target's own colour."""
    c = layer.get("colour", {})
    if "pigment" in c:
        return np.clip(np.array(c["pigment"], dtype=np.float64), 0, 1)
    if "lab" in c:
        return np.clip(C.lab_to_linear(np.array(c["lab"], dtype=np.float64)), 0, 1)
    if "hex" in c:
        h = c["hex"].lstrip("#")
        return C.srgb_to_linear(np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)]) / 255.0)
    rel, over = c.get("relative", {}), c.get("over", {})
    skin_lab = C.linear_to_lab(skin_lin)
    lab = skin_lab + np.array([rel.get("dL", 0), rel.get("da", 0), rel.get("db", 0)])
    under = np.clip(C.lab_to_linear(skin_lab + np.array([over.get("dL", 0), over.get("da", 0), over.get("db", 0)])), 0, 1)
    return pigment_for(np.clip(C.lab_to_linear(lab), 0, 1), under, hide)


def apply_plan(face: Face, plan: dict, strength: float = 1.0) -> np.ndarray:
    dec = decompose(face)
    on = face.tri >= 0
    products = atlas()["products"]
    layers, shine = [], np.zeros(face.lin.shape)
    pts = face.X[on]
    usable = on & ~face.eyes & ~face.mouth & (face.mask != 1)  # not over hair, eye or mouth openings
    for L in plan["layers"]:
        prod = products.get(L.get("product", ""), {})
        hide = float(L.get("hide", prod.get("hide", 0.5)))
        w = np.zeros(on.shape)
        w[on] = weight(L["zone"], pts, face.rest, L.get("adjust"))
        w *= usable * float(L.get("coverage", 1.0)) * strength
        base = dec["skin_lin"]
        if L.get("colour", {}).get("to") == "zone":
            core = (w > 0.5 * max(1e-6, float(w.max()))) & on
            if core.sum() > 20:
                base = np.median(dec["low"][core], axis=0)
        m = resolve_colour(L, base, hide)
        # 85% of the relief under the film lights its pigment: foundation evens colour more than it flattens form,
        # and lipstick keeps the lips' volume
        layers.append((w, m, hide, L.get("blend", "film"), relief(face, dec, w) ** 0.85))
        fin = L.get("finish", prod.get("finish"))
        if fin:
            shine += finish_change(dec, w, fin, 1.0, np.nan_to_num(face.U[..., :2]))
    low_new, hidden = film(dec["low"], layers)
    return recompose(face, dec, low_new, hidden, shine)


# ---- Blueprints (dense transfer from a reference) ---------------------------------------------------------------------

def tps_fit(src: np.ndarray, dst: np.ndarray, reg: float = 1e-3) -> tuple[np.ndarray, np.ndarray]:
    """Thin-plate spline from src (n x 2) to dst (n x 2) (Bookstein 1989). Returns (weights, control points)."""
    n = len(src)
    d = np.linalg.norm(src[:, None] - src[None], axis=-1)
    K = np.where(d > 0, d * d * np.log(np.maximum(d, 1e-12)), 0.0) + reg * np.eye(n)
    P = np.column_stack([np.ones(n), src])
    L = np.zeros((n + 3, n + 3))
    L[:n, :n], L[:n, n:], L[n:, :n] = K, P, P.T
    Y = np.zeros((n + 3, 2))
    Y[:n] = dst
    return np.linalg.solve(L, Y), src


def tps_eval(model: tuple[np.ndarray, np.ndarray], x: np.ndarray) -> np.ndarray:
    Wt, ctl = model
    n = len(ctl)
    out = np.empty((len(x), 2))
    for s in range(0, len(x), 20000):
        xs = x[s:s + 20000]
        d = np.linalg.norm(xs[:, None] - ctl[None], axis=-1)
        U = np.where(d > 0, d * d * np.log(np.maximum(d, 1e-12)), 0.0)
        out[s:s + 20000] = U @ Wt[:n] + Wt[n] + xs @ Wt[n + 1:]
    return out


def effect_maps(ref: Face, prior: dict | None) -> tuple[np.ndarray, np.ndarray]:
    """A reference's makeup as a per-pixel change of colour (dL*, da*, db* against its own skin, minus what bare faces
    show in the same zones) and where it applies (zone weights)."""
    dec = decompose(ref)
    on = ref.tri >= 0
    ids = [z["id"] for z in atlas()["zones"] if z.get("measure")]
    zm = zone_maps(ref, ids)
    skin_lab = C.linear_to_lab(dec["skin_lin"])
    lab = np.full(ref.lin.shape, np.nan)
    lab[on] = C.linear_to_lab(np.clip(dec["low"][on], 0, 4))
    delta = lab - skin_lab
    if prior:
        num = np.zeros(ref.lin.shape)
        den = np.zeros(on.shape)
        for z in ids:
            if z in prior:
                num += zm[z][..., None] * np.array([prior[z]["dL"], prior[z]["da"], prior[z]["db"]])
                den += zm[z]
        delta = delta - np.where(den[..., None] > 1e-6, num / np.maximum(1e-6, den)[..., None], 0)
    where = np.clip(np.maximum.reduce([zm[z] for z in ids]), 0, 1) * (ref.mask != 1) * ~ref.eyes * ~ref.mouth
    sig = max(0.8, 0.05 * dec["ew_px"])
    delta = np.nan_to_num(delta) * where[..., None]
    delta = cv2.GaussianBlur(delta, (0, 0), sig) / np.maximum(1e-6, cv2.GaussianBlur(where, (0, 0), sig))[..., None]
    return np.nan_to_num(delta) * (where > 0.02)[..., None], where


# What each product must do to the skin it covers. A measured 'effect' that breaks its product's physics is the photo's
# light or colour grading, not makeup, and is not transferred (one photo cannot separate them fully).
def _plausible(product: str, e: dict) -> bool:
    dE = math.sqrt(e["dL"] ** 2 + e["da"] ** 2 + e["db"] ** 2)
    if product in ("contour", "bronzer"):
        return e["dL"] <= -2 and abs(e["dL"]) >= 0.5 * dE
    if product in ("highlight", "concealer"):
        return e["dL"] >= 1.5 and e["dL"] >= 0.5 * dE
    if product == "blush":
        return e["da"] >= 2 and e["da"] >= 0.4 * dE
    return True


def plan_from_blueprint(bp: dict, adapt: str = "relative", min_delta: float = 2.0, max_shift: float = 0.25) -> dict:
    """A reference's blueprint as a plan: one layer per zone whose measured effect is clear (CIE76 >= min_delta), the
    measured finish, and the zone moved toward where the reference's makeup actually sat (clamped to max_shift eye
    widths). Each layer is a film: the reference's made-up colour, laid over what bare faces show in that zone (the
    prior), gives the product's pigment. The film puts it over the target's own colour with the product's hide, so an
    opaque lipstick covers the target's lips and a stain tints them. 'relative' solves the pigment on the target's
    skin, 'pigment' on the reference's skin."""
    products = atlas()["products"]
    skin_lab = np.array(bp["skin"]["lab"], dtype=np.float64)
    prior = bp.get("prior_used") or {}
    left_out = set(bp.get("labels", {}).get("exclude_zones", []))  # the visual review's zones to leave out (glasses, hair)
    layers = []
    for zid, z in bp["zones"].items():
        eff = z.get("effect")
        if not eff or zid not in atlas()["by_id"] or zid in left_out:
            continue
        if math.sqrt(eff["dL"] ** 2 + eff["da"] ** 2 + eff["db"] ** 2) < min_delta:
            continue
        prod = atlas()["by_id"][zid]["product"]
        if not _plausible(prod, eff):
            continue
        hide = products.get(prod, {}).get("hide", 0.5)
        made = {k: z["observed"][k] for k in ("dL", "da", "db")}
        bare = {k: prior[zid][k] for k in ("dL", "da", "db")} if zid in prior else {"dL": 0, "da": 0, "db": 0}
        if adapt == "pigment":
            app = np.clip(C.lab_to_linear(skin_lab + np.array(list(made.values()))), 0, 1)
            under = np.clip(C.lab_to_linear(skin_lab + np.array(list(bare.values()))), 0, 1)
            colour = {"pigment": [round(float(v), 5) for v in pigment_for(app, under, hide)]}
        else:
            colour = {"relative": made, "over": bare}
        layer = {"zone": zid, "product": prod, "colour": colour, "coverage": 1.0}
        sides = list((z.get("placement") or {}).values())
        if sides:
            dx = float(np.clip(np.mean([s["centroid_ew"][0] for s in sides]), -max_shift, max_shift))
            dy = float(np.clip(np.mean([s["centroid_ew"][1] for s in sides]), -max_shift, max_shift))
            layer["adjust"] = {"shift": [round(dx, 3), round(dy, 3)]}
        fin = bp.get("finish", {}).get(zid, {}).get("class")
        if fin:
            layer["finish"] = fin
        layers.append(layer)
    return {"schema": "kumiki.makeup.plan/1", "from_blueprint": bp.get("source", {}).get("id"), "adapt": adapt, "layers": layers}


def apply_blueprint(face: Face, ref: Face, bp: dict, prior: dict | None, warp: str = "mesh", adapt: str = "relative", strength: float = 1.0,
                    min_delta: float = 2.0, denoise: float = 4.0) -> np.ndarray:
    """Dense transfer: the reference's per-pixel effect carried through the mesh or a thin-plate spline. One photo
    cannot fully separate makeup from its light and colour grading, so the map is soft-thresholded (changes smaller
    than 'denoise' CIE76 units vanish) and kept only in zones whose measured effect is clear."""
    delta, where = effect_maps(ref, prior)
    mag = np.linalg.norm(delta, axis=-1)
    delta = delta * np.clip(1 - denoise / np.maximum(1e-6, mag), 0, 1)[..., None]
    left_out = set(bp.get("labels", {}).get("exclude_zones", []))
    clear = [zid for zid, z in bp["zones"].items() if z.get("effect") and math.sqrt(sum(v * v for v in z["effect"].values())) >= min_delta
             and zid in atlas()["by_id"] and zid not in left_out and _plausible(atlas()["by_id"][zid]["product"], z["effect"])]
    if clear:
        gate = np.maximum.reduce(list(zone_maps(ref, clear).values()))
        where = where * gate
    else:
        where = where * 0
    on = face.tri >= 0
    _, T = canonical()
    if warp == "tps":
        model = tps_fit(face.lm[TPS_POINTS, :2], ref.lm[TPS_POINTS, :2])
        ys, xs = np.nonzero(on)
        src = tps_eval(model, np.column_stack([xs + 0.5, ys + 0.5]))
    else:
        # the shared mesh: a target pixel's triangle and barycentric weights name the same place on the reference
        src = interpolate(ref.lm[:468, :2], face.tri, face.bar, T)[on]
        ys, xs = np.nonzero(on)
    mapx = np.full(on.shape, -1, np.float32)
    mapy = np.full(on.shape, -1, np.float32)
    mapx[ys, xs], mapy[ys, xs] = src[:, 0] - 0.5, src[:, 1] - 0.5
    d_t = np.stack([cv2.remap(delta[..., k].astype(np.float32), mapx, mapy, cv2.INTER_LINEAR, borderValue=0) for k in range(3)], -1)
    w_t = cv2.remap(where.astype(np.float32), mapx, mapy, cv2.INTER_LINEAR, borderValue=0)
    dec = decompose(face)
    usable = on & ~face.eyes & ~face.mouth & (face.mask != 1)
    w_t = w_t * usable * strength
    if adapt == "relative":
        # the same perceptual change on the target's own colour, pixel by pixel
        lab_t = C.linear_to_lab(np.clip(dec["low"], 0, 4))
        target = C.lab_to_linear(lab_t + d_t * w_t[..., None])
        low_new = np.where(on[..., None], np.clip(target, 0, 4), dec["low"])
        hidden = np.clip(w_t * 0.5, 0, 1)
    else:
        # the same product: invert each pixel's film on the reference's skin, lay that pigment on the target
        ref_dec = decompose(ref)
        ref_skin = ref_dec["skin_lin"]
        app = np.clip(C.lab_to_linear(C.linear_to_lab(ref_skin) + d_t), 0, 4)
        hide = 0.5
        m = np.clip(app / np.maximum(1e-4, hide + (1 - hide) * ref_skin), 0, 1)
        w3 = w_t[..., None]
        low_new = dec["low"] * ((1 - w3) + w3 * (1 - hide) * m) + w3 * hide * m * (relief(face, dec, w_t) ** 0.85)[..., None]
        hidden = w_t * hide
    shine = np.zeros(face.lin.shape)
    for zid, f in bp.get("finish", {}).items():
        if zid != "overall" and f.get("class") in ("dewy", "glossy", "shimmer", "glitter", "matte"):
            wz = np.zeros(on.shape)
            wz[on] = weight(zid, face.X[on], face.rest)
            shine += finish_change(dec, wz * usable * strength, f["class"], 0.8, np.nan_to_num(face.U[..., :2]))
    return recompose(face, dec, low_new, hidden, shine)


# ---- Files ------------------------------------------------------------------------------------------------------------

def _face_from_image(path: str, models: str | None) -> Face:
    from .landmarks import FaceAnalyzer

    rgb = cv2.cvtColor(cv2.imread(path), cv2.COLOR_BGR2RGB)
    an = FaceAnalyzer(models)
    det = an.detect(rgb)
    an.close()
    if det.landmarks is None:
        raise SystemExit(f"{path}: no face found")
    h, w = rgb.shape[:2]
    return prepare(rgb, det.landmarks * np.array([w, h, w]), det.segmentation)


def apply_file(target: str, out: str, blueprint: str | None = None, plan: str | None = None, warp: str = "atlas", adapt: str = "relative",
               strength: float = 1.0, models: str | None = None, before_after: bool = False, prior: str | None = None) -> dict:
    face = _face_from_image(target, models)
    if plan:
        res = apply_plan(face, json.loads(Path(plan).read_text()), strength)
    elif blueprint:
        bp = json.loads(Path(blueprint).read_text())
        files = bp.get("files") or {}
        if not files:
            raise SystemExit("this blueprint has no reference files; re-run 'analyze' to record them")
        rgb = cv2.cvtColor(cv2.imread(files["aligned"]), cv2.COLOR_BGR2RGB)
        lm = np.array(json.loads(Path(files["landmarks"]).read_text())["points"], dtype=np.float64)
        mask = cv2.imread(files["masks"], cv2.IMREAD_GRAYSCALE)
        if warp == "atlas":
            res = apply_plan(face, plan_from_blueprint(bp, adapt), strength)
        else:
            ref = prepare(rgb, lm, mask)
            pri = json.loads(Path(prior).read_text())["prior"] if prior else bp.get("prior_used")
            res = apply_blueprint(face, ref, bp, pri, warp, adapt, strength)
    else:
        raise SystemExit("give --plan or --blueprint")
    img = np.hstack([face.rgb, res]) if before_after else res
    cv2.imwrite(out, cv2.cvtColor(img, cv2.COLOR_RGB2BGR))
    return {"out": out, "size": [int(img.shape[1]), int(img.shape[0])], "pose": face.pose}


__all__ = ["apply_plan", "apply_blueprint", "plan_from_blueprint", "apply_file", "film", "pigment_for", "tps_fit", "tps_eval", "BLEND_MODES"]
