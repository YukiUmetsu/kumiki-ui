#!/usr/bin/env python3
"""Cuts paintings into rig-ready art for the RIG1 painted look (registry/rig/rig-look-painted.ts).

  python scripts/storybook-art.py recipe.json [more.json ...] --src paintings --out src/video/storybook/assets

A recipe is data: which paintings, which outline each layer has, what lies hidden under it, where the joints are. The
painting is never redrawn: a layer is the painting, cut out with its own ink edge. Writes <out>/<id>/*.webp and
<out>/<id>/art.json ({ art, joints, place }), and prints what the layers put back together differ by from the base painting.

Recipe (all points are pixels of the painting they belong to; "base" is the painting that gives the figure its size):
  id, height           figure name, and its height in centimetres (crown to sole)
  joints               PersonJoints in base pixels
  sources.<name>       { file, mirror?, paper?: [seed points of enclosed paper], gaps?: [polygons whose enclosed paper is open], erase?: [polygons], sharp?: "file at a whole multiple of the size",
                         mix?: { file, sharp?, amount: 0-1 of this second painting of the same drawing, keep?: [polygons of the first] },
                         place?: { pin: [[x,y],[X,Y]], scale, rotate } }   pin: this point lands on that base point
  layers[]             { id, source, poly, z, bind, soft?, steps?: [...], density?, grid?, turns?, tint?, keepReading?, skip?: [polygons] }
                       steps, before the cut:  { clone: poly, by: [dx,dy], soft? } { inpaint: poly } { paint: poly, rgb, soft? }
                         { ink: polyline, width, rgb? } { text, at, size, font: a font file, face?: number in it, vertical?, lead?, rough?: px, rotate? or quad: [corners of the panel] with panel: [w, h] for at and size } { wash: poly, by, soft? } { glaze: poly, by: [r, g, b] times what is there, soft? } { lean: poly, from: y, to: y, by: px } { take: file, poly, soft? }
                         { picture: another painting, of: [x0, y0, x1, y1] of it, into: [its four corners here], soft? }: a photograph on a phone, a poster
                         { fold: [x, y] it turns about, from: [a, b], to: [a, b] degrees from straight up, clockwise: what is between two angles comes between two others, what is outside turns with its side (a fan that is half shut), past?: px from the point, of?: poly, the only paint that stays }
                       bind uses base pixels too and is written out in centimetres
  hands.<layer>.<name> { source, poly?, wrist: [x,y], knuckle: [x,y], length?: cm from wrist to knuckle (else its own size), front?: poly, over?: how far it comes in front of its own cuff, mirror?, cuff?: degrees that the forearm is turned from the hand in a drawing of a hand alone (0) }
  sockets.<name>       { bone, hand?: variant it was measured on, at: point of that source or of the base, to?: a point that the top of a held thing goes toward }
  body, walk           how it stands and walks (story-figure.ts), copied as they are
  face                 { layer, source, round, eyes, brows, regions: {name: polygon}, patches: {name: {file, region, marks?, steps?, squeeze?: { at, by: [sx, sy], radius }}},
                         looks, lookFor?, lids, mouths, mouthFor, sync?: max pixels a patch may be off }

A recipe with pieces and no joints is a set or a tray of props:
  px                   painting pixels in a centimetre (a source may have its own "px")
  sources.<name>       as above, and { opaque?: the whole rectangle is paint, origin?: the pixel that is 0, 0 }
  pieces[]             { id, source, poly?, soft?, skip?, steps?, density?, grip?: [x,y] held here, foot?: [x,y] stands here }
Writes art.json: { pieces: { <id>: { image, x, y, width, height, grip?, foot? } } } with places in centimetres from the origin.
"""
import argparse, json, math, sys
from types import SimpleNamespace
from pathlib import Path
import cv2
import numpy as np

PAPER = np.array([254, 254, 254], np.float32)


def load(path):
    im = cv2.imread(str(path), cv2.IMREAD_COLOR)
    if im is None: raise SystemExit(f"There is no painting {path}.")
    return im[:, :, ::-1].astype(np.float32)


def polygon(shape, pts, k=1.0, soft=0.0):
    m = np.zeros(shape[:2], np.uint8)
    cv2.fillPoly(m, [np.round(np.array(pts, np.float64) * k * 16).astype(np.int32)], 255, cv2.LINE_AA, 4)
    m = m.astype(np.float32) / 255
    return cv2.GaussianBlur(m, (0, 0), soft * k / 2) if soft else m


def matte(rgb, seeds=(), tol=15.0, gaps=(), rim=3):
    """Alpha of a painting on white paper: paper is what the border reaches; the ink edge keeps its own softness.
    `rim` is the window, in pixels, of what counts as an edge: 3 for an inked outline, 5 for loose hairs whose rim is pale."""
    paper = np.median(np.concatenate([rgb[:6].reshape(-1, 3), rgb[-6:].reshape(-1, 3), rgb[:, :6].reshape(-1, 3), rgb[:, -6:].reshape(-1, 3)]), 0)
    blur = cv2.GaussianBlur(rgb, (0, 0), 0.8)
    near = (np.abs(blur - paper).max(2) < tol).astype(np.uint8)
    n, lab, stats, _ = cv2.connectedComponentsWithStats(near, connectivity=4)
    keep = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    for x, y in seeds:
        l = lab[int(y), int(x)]
        if l == 0: print(f"    seed {x},{y} is not on paper", file=sys.stderr)
        else: keep.add(l)
    for poly in gaps:
        inside = polygon(near.shape, poly) > 0.5; ids, n_in = np.unique(lab[inside & (lab > 0)], return_counts=True)
        keep |= {i for i, c in zip(ids, n_in) if c > 0.6 * stats[i, cv2.CC_STAT_AREA] and stats[i, cv2.CC_STAT_AREA] > 10}
    # a blank of the edge's width between the paper and the paint: those pixels are part paint, part paper
    bg = np.isin(lab, list(keep)).astype(np.uint8)
    specks, sl, ss, _ = cv2.connectedComponentsWithStats(1 - bg, connectivity=8)
    for i in range(1, specks):
        if ss[i, cv2.CC_STAT_AREA] < 90: bg[sl == i] = 1
    band = cv2.dilate(bg, np.ones((5, 5), np.uint8)) & cv2.dilate(1 - bg, np.ones((5, 5), np.uint8))
    lum = rgb.mean(2)
    inkL = cv2.erode(np.where(bg > 0, 255, lum).astype(np.float32), np.ones((7, 7), np.uint8))
    plum = paper.mean()
    soft = np.clip((plum - lum) / np.maximum(plum - inkL, 12), 0, 1)
    a = np.where(band > 0, np.where(bg > 0, soft * 0.9, np.maximum(soft, 0.0)), 1.0 - bg)
    inner = cv2.erode(1 - bg, np.ones((rim, rim), np.uint8))
    a = np.maximum(a, inner).astype(np.float32)
    a[a < 0.06] = 0
    # the paint without the paper that shines through it
    col = np.where(a[..., None] > 0.02, (rgb - (1 - a[..., None]) * paper) / np.maximum(a[..., None], 0.15), rgb)
    return np.clip(col, 0, 255), a


def bleed(rgb, a):
    """Colour under transparent pixels: the nearest paint, so that filtering never mixes paper in."""
    solid = (a > 0.5).astype(np.uint8)
    if solid.sum() == 0: return rgb
    _, lab = cv2.distanceTransformWithLabels(1 - solid, cv2.DIST_L2, 5, labelType=cv2.DIST_LABEL_PIXEL)
    ys, xs = np.nonzero(solid); table = np.zeros((lab.max() + 1, 3), np.float32); table[lab[ys, xs]] = rgb[ys, xs]
    near = table[lab]
    return np.where(a[..., None] > 0.6, rgb, near)


def reskin(rgb, old, new, calm=0.0):
    """Painted skin in another tone: the lit tone goes from `old` to `new`, shadows and ink keep their distance from it. `calm` (0-1) takes red out of the shading, for hands that are painted warmer than the figure that gets them."""
    lab = lambda c: cv2.cvtColor((np.asarray(c, np.float32).reshape(1, -1, 3) / 255), cv2.COLOR_RGB2LAB)[0]
    (L0, *c0), (L1, *c1) = lab(old)[0], lab(new)[0]; q = cv2.cvtColor((np.clip(rgb, 0, 255) / 255).astype(np.float32), cv2.COLOR_RGB2LAB); L = q[..., 0]
    q[..., 0] = np.where(L < L0, L * L1 / L0, L1 + (L - L0) * min(1.0, (99 - L1) / max(1.0, 100 - L0))); w = np.clip(L / L0, 0, 1) ** 0.7
    t = calm * np.clip((L / L0 - 0.4) / 0.25, 0, 1); q[..., 0] += 0.4 * t * np.maximum(0, L1 - q[..., 0])
    for i in (0, 1): q[..., i + 1] += (c1[i] - c0[i]) * w - t * (q[..., i + 1] - c0[i])
    return np.clip(cv2.cvtColor(q, cv2.COLOR_LAB2RGB) * 255, 0, 255)


class Source:
    def __init__(self, spec, root, base=None):
        self.spec, self.root = spec, root
        rgb = load(root / spec["file"]); self.w, self.h = rgb.shape[1], rgb.shape[0]; self.k = 1
        if spec.get("sharp"):
            rgb = load(root / spec["sharp"]); self.k = rgb.shape[1] / self.w
        mix = spec.get("mix")
        if mix:
            other = load(root / mix["sharp" if spec.get("sharp") else "file"])
            if other.shape != rgb.shape: raise SystemExit(f"{mix['file']} is not the size of {spec['file']}.")
            much = np.full(rgb.shape[:2], mix["amount"], np.float32)
            for poly in mix.get("keep", []): much *= 1 - polygon(rgb.shape, poly, self.k, 2 * self.k)
            rgb = rgb + (other - rgb) * much[..., None]
        if spec.get("mirror"): rgb = rgb[:, ::-1].copy()
        tone = spec.get("tone")
        if tone: rgb = np.clip((rgb - 255) * np.array(tone, np.float32) + 255, 0, 255)
        if spec.get("opaque"): self.rgb, self.a = rgb, np.ones(rgb.shape[:2], np.float32)
        else: self.rgb, self.a = matte(rgb, [(x * self.k, y * self.k) for x, y in spec.get("paper", [])], spec.get("tol", 15.0), [[(x * self.k, y * self.k) for x, y in g] for g in spec.get("gaps", [])], spec.get("rim", 3))
        for poly in spec.get("erase", []): self.a *= 1 - polygon(self.a.shape, poly, self.k)
        if spec.get("skin"): self.rgb = reskin(self.rgb, *spec["skin"])
        self.raw = rgb
        p = spec.get("place")
        if p:
            c, s = math.cos(math.radians(p.get("rotate", 0))) * p["scale"], math.sin(math.radians(p.get("rotate", 0))) * p["scale"]
            (x, y), (X, Y) = p["pin"]
            self.M = np.array([[c, -s, X - c * x + s * y], [s, c, Y - s * x - c * y]], np.float64)
        else: self.M = np.array([[1, 0, 0], [0, 1, 0]], np.float64)

    def to_base(self, p): return tuple(self.M @ np.array([p[0], p[1], 1.0]))

    def extra(self, name):
        rgb = load(self.root / name)
        if self.spec.get("mirror"): rgb = rgb[:, ::-1].copy()
        if rgb.shape[:2] != self.rgb.shape[:2]: rgb = cv2.resize(rgb, (self.rgb.shape[1], self.rgb.shape[0]), interpolation=cv2.INTER_CUBIC)
        return rgb


def samepaint(new, base, steady):
    """Another painting of the same face in the colours of the first one: how the colours differ where nothing has changed."""
    ys, xs = np.nonzero(steady > 0.5); pick = np.random.default_rng(3).permutation(len(ys))[:40000]; soft = lambda q: cv2.GaussianBlur(q, (0, 0), 2)[ys[pick], xs[pick]]; A, B = np.c_[soft(new), np.ones(len(pick))], soft(base); keep = np.ones(len(pick), bool)
    if len(pick) < 2000: return new
    for limit in (60, 30):
        fit = np.linalg.lstsq(np.r_[A[keep], np.c_[60 * np.eye(3), np.zeros(3)]], np.r_[B[keep], 60 * np.eye(3)], rcond=None)[0]; keep = np.abs(A @ fit - B).max(1) < limit
        if keep.sum() < 1000: return new
    return (np.c_[new.reshape(-1, 3), np.ones(new.shape[0] * new.shape[1])] @ fit).reshape(new.shape).astype(np.float32)


def register(moving, fixed, where, limit):
    """Small affine that lays an edited painting over its base, measured where the edit may not have changed anything."""
    f, m = fixed.mean(2).astype(np.float32), moving.mean(2).astype(np.float32); M = np.eye(2, 3, dtype=np.float32)
    try: _, M = cv2.findTransformECC(f, m, M, cv2.MOTION_AFFINE, (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 80, 1e-6), (where * 255).astype(np.uint8), 5)
    except cv2.error: return moving, 99.0
    h, w = f.shape; pts = np.array([[0, 0, 1], [w, 0, 1], [0, h, 1], [w, h, 1]], np.float32).T; off = float(np.abs(M @ pts - pts[:2]).max())
    if off > limit * 4: return moving, off
    return cv2.warpAffine(moving, M, (w, h), flags=cv2.INTER_CUBIC | cv2.WARP_INVERSE_MAP, borderMode=cv2.BORDER_REPLICATE), off


def squeeze(rgb, q, k):
    """Makes what lies round a point narrower or lower. Nothing from outside the radius comes in: the paint between is stretched."""
    (ax, ay), (sx, sy), (rx, ry) = [np.array(q[n], np.float32) for n in ("at", "by", "radius")]; y, x = (g / k for g in np.mgrid[0:rgb.shape[0], 0:rgb.shape[1]].astype(np.float32))
    r = np.clip(np.hypot((x - ax) / rx, (y - ay) / ry), 1e-4, 1); s = min(sx, sy, 0.98); far = ((r / s) ** -6 + (0.7 + 0.3 * r) ** -6) ** (-1 / 6)
    w = np.clip((far / r - 1) / (1 / s - 1), 0, 1); u, v = 1 + (1 / sx - 1) * w, 1 + (1 / sy - 1) * w
    return cv2.remap(rgb, (ax + (x - ax) * u) * k, (ay + (y - ay) * v) * k, cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)


def lettering(st, shape, k, root):
    """The mask of a `text` step. Words lie on a flat panel; a panel that is seen at an angle has its four corners in `quad`."""
    from PIL import Image, ImageDraw, ImageFont
    size, lines = st["size"], list(st["text"]) if st.get("vertical") else [st["text"]]; lead = st.get("lead", 1.04) * size
    if "quad" in st: (pw, ph), (x, y), quad = st["panel"], st["at"], np.array(st["quad"], np.float64)
    else:
        pw = ph = size * (2 + max(len(lines), len(st["text"])) * 1.2); x, y = pw / 2, ph / 2; c, si = math.cos(math.radians(st.get("rotate", 0))), math.sin(math.radians(st.get("rotate", 0)))
        quad = np.array([[-1, -1], [1, -1], [1, 1], [-1, 1]], np.float64) * pw / 2 @ np.array([[c, si], [-si, c]]) + st["at"]
    fine = max(1.0, 2 * k * np.linalg.norm(quad[1] - quad[0]) / pw); im = Image.new("L", (math.ceil(pw * fine), math.ceil(ph * fine))); font = ImageFont.truetype(str(root / st["font"]), max(1, round(size * fine)), index=st.get("face", 0))
    for i, line in enumerate(lines): ImageDraw.Draw(im).text((x * fine, (y + (i - (len(lines) - 1) / 2) * lead) * fine), line, font=font, fill=255, anchor="mm")
    flat = cv2.GaussianBlur(np.asarray(im).astype(np.float32) / 255, (0, 0), 0.6); H = cv2.getPerspectiveTransform(np.array([[0, 0], [im.width, 0], [im.width, im.height], [0, im.height]], np.float32), (quad * k).astype(np.float32))
    m = cv2.warpPerspective(flat, H, (shape[1], shape[0]), flags=cv2.INTER_LINEAR); rough = st.get("rough", 0) * k
    if rough:
        # a brush, not a printer: the edge wanders and the paint is not the same everywhere
        rng = np.random.default_rng(23); wander = lambda q: (lambda f: f / f.std())(cv2.GaussianBlur(rng.normal(0, 1, shape).astype(np.float32), (0, 0), q * k)); yy, xx = np.mgrid[0:shape[0], 0:shape[1]].astype(np.float32)
        m = cv2.remap(m, xx + rough * wander(3), yy + rough * wander(3), cv2.INTER_LINEAR) * np.clip(0.9 + 0.1 * wander(0.8), 0.5, 1)
    return m * st.get("strength", 1.0)


def steps(src, layer):
    rgb, a, k = src.rgb.copy(), src.a.copy(), src.k
    for st in layer.get("steps", []):
        if "clone" in st:
            m = polygon(a.shape, st["clone"], k, st.get("soft", 3)); dx, dy = st["by"]
            T = np.array([[1, 0, dx * k], [0, 1, dy * k]], np.float32)
            moved = cv2.warpAffine(bleed(rgb, a), T, (a.shape[1], a.shape[0]), borderMode=cv2.BORDER_REPLICATE); m = m * cv2.warpAffine(a, T, (a.shape[1], a.shape[0]))
            # paint goes over paint; where there was none, the copy brings its own edge
            na = np.maximum(a, m) if st.get("solid", True) else a; rgb = np.where(a[..., None] > 0.02, rgb * (1 - m[..., None]) + moved * m[..., None], moved); a = na
        elif "inpaint" in st:
            m = polygon(a.shape, st["inpaint"], k); hole = (m > 0.4).astype(np.uint8)
            small = cv2.inpaint(np.clip(rgb, 0, 255).astype(np.uint8), hole, 6 * k, cv2.INPAINT_TELEA).astype(np.float32)
            # paper-like tooth, so that the fill is not a smooth smear
            g = np.random.default_rng(7).normal(0, st.get("tooth", 4), a.shape).astype(np.float32); g = cv2.GaussianBlur(g, (0, 0), 0.9 * k) * 1.8
            rgb = np.where(hole[..., None] > 0, small + g[..., None], rgb); a = np.maximum(a, m)
        elif "paint" in st:
            m = polygon(a.shape, st["paint"], k, st.get("soft", 0)) * st.get("strength", 1.0); g = cv2.GaussianBlur(np.random.default_rng(11).normal(0, 1, a.shape).astype(np.float32), (0, 0), 1.1 * k) * k * 2.2 * st.get("tooth", 3); rgb = rgb * (1 - m[..., None]) + (np.array(st["rgb"], np.float32) + g[..., None]) * m[..., None]; a = np.maximum(a, m) if st.get("solid", True) else a
        elif "ink" in st:
            m = np.zeros(a.shape, np.uint8); pts = np.round(np.array(st["ink"], np.float64) * k * 16).astype(np.int32)
            cv2.polylines(m, [pts], False, 255, max(1, round(st.get("width", 2) * k)), cv2.LINE_AA, 4); m = cv2.GaussianBlur(m.astype(np.float32) / 255, (0, 0), 0.5 * k)
            rgb = rgb * (1 - m[..., None]) + np.array(st.get("rgb", [44, 34, 34]), np.float32) * m[..., None]; a = np.maximum(a, m)
        elif "text" in st:
            m = lettering(st, a.shape, k, src.root)[..., None]; rgb = rgb * (1 - m) + np.array(st.get("rgb", [44, 34, 34]), np.float32) * m
        elif "picture" in st:
            x0, y0, x1, y1 = st["of"]; to = np.float32(st["into"]) * k; pic = load(src.root / st["picture"])[y0:y1, x0:x1].astype(np.float32); f = np.hypot(*(to[1] - to[0])) / pic.shape[1]
            if f < 1: pic = cv2.resize(pic, (max(1, round(pic.shape[1] * f)), max(1, round(pic.shape[0] * f))), interpolation=cv2.INTER_AREA)
            h, w = pic.shape[:2]; m = polygon(a.shape, st["into"], k, st.get("soft", 1))[..., None]
            rgb = rgb * (1 - m) + cv2.warpPerspective(pic, cv2.getPerspectiveTransform(np.float32([[0, 0], [w, 0], [w, h], [0, h]]), to), (a.shape[1], a.shape[0]), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE) * m
        elif "glaze" in st:
            # a thin colour over the paint: ink and texture stay
            m = polygon(a.shape, st["glaze"], k, st.get("soft", 4))[..., None]; rgb = np.clip(rgb * (1 + m * (np.array(st["by"], np.float32) - 1)), 0, 255)
        elif "wash" in st:
            # the colours of a part run into one another, as on wet paper
            m = polygon(a.shape, st["wash"], k, st.get("soft", 4))[..., None]; rgb = rgb * (1 - m) + cv2.GaussianBlur(rgb, (0, 0), st["by"] * k) * m
        elif "lean" in st:
            # a part on bare paper bends over: not at all at the height `from`, by `by` at the height `to`
            m = polygon(a.shape, st["lean"], k)[..., None]; y, x = np.mgrid[0:a.shape[0], 0:a.shape[1]].astype(np.float32); u = np.clip((st["from"] * k - y) / ((st["from"] - st["to"]) * k), 0, 1); u = u * u * (3 - 2 * u)
            part = cv2.remap(np.dstack([np.where(m > 0.5, rgb, 255), (a * m[..., 0])]).astype(np.float32), x - st["by"] * k * u, y, cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE); pa = np.clip(part[..., 3], 0, 1)
            a = a * (1 - m[..., 0]); rgb = np.where(a[..., None] > 0.02, rgb, 255.0); rgb = rgb * (1 - pa[..., None]) + part[..., :3] * pa[..., None]; a = np.maximum(a, pa)
        elif "fold" in st:
            if st.get("of"): a = a * polygon(a.shape, st["of"], k)
            (cx, cy), (a0, a1), (b0, b1) = np.array(st["fold"], float) * k, st["from"], st["to"]; y, x = np.mgrid[0:a.shape[0], 0:a.shape[1]].astype(np.float32); dx, dy = x - cx, y - cy; r, t = np.hypot(dx, dy), np.degrees(np.arctan2(dx, -dy))
            was = np.where(t < b0, t - b0 + a0, np.where(t > b1, t - b1 + a1, a0 + (t - b0) / (b1 - b0) * (a1 - a0))); w = np.clip((r - st.get("past", 0) * k) / (8 * k), 0, 1); was = np.radians(t + (was - t) * w)
            part = cv2.remap(np.dstack([bleed(rgb, a), a]).astype(np.float32), (cx + r * np.sin(was)).astype(np.float32), (cy - r * np.cos(was)).astype(np.float32), cv2.INTER_AREA if abs(b1 - b0) < abs(a1 - a0) else cv2.INTER_CUBIC, borderMode=cv2.BORDER_CONSTANT); rgb, a = part[..., :3], np.clip(part[..., 3], 0, 1) * (np.abs(was) < np.pi)
        elif "take" in st:
            m = polygon(a.shape, st["poly"], k, st.get("soft", 4)); new = src.extra(st["take"]); ring = np.clip(cv2.dilate(m, np.ones((int(24 * k) | 1,) * 2)) - (m > 0).astype(np.float32), 0, 1) * src.a
            if st.get("match", True) and ring.sum() > 50: new = new + ((src.raw - new) * ring[..., None]).sum((0, 1)) / ring.sum()
            nrgb, na = matte(np.clip(new, 0, 255)); rgb = rgb * (1 - m[..., None]) + nrgb * m[..., None]; a = np.maximum(a * (1 - m), na * m) if st.get("edge") else np.maximum(a, na * m)
    return rgb, a


def cut(src, layer):
    rgb, a = steps(src, layer); m = polygon(a.shape, layer["poly"], src.k, layer.get("soft", 0)) if layer.get("poly") else np.ones_like(a)
    for s in layer.get("skip", []): m *= 1 - polygon(a.shape, s, src.k, layer.get("skipSoft", 1))
    return rgb, a * m


def place(rgb, a, M, k, px_per_base):
    """Resamples a cut into base space at `px_per_base` and crops it; returns image and place in base pixels."""
    ys, xs = np.nonzero(a > 0.01)
    if len(xs) == 0: raise SystemExit("A layer is empty.")
    corners = np.array([[xs.min(), ys.min()], [xs.max() + 1, ys.min()], [xs.min(), ys.max() + 1], [xs.max() + 1, ys.max() + 1]], np.float64) / k
    at = (M[:, :2] @ corners.T + M[:, 2:]).T; x0, y0 = np.floor(at.min(0) - 2); x1, y1 = np.ceil(at.max(0) + 2)
    W, H = int(round((x1 - x0) * px_per_base)), int(round((y1 - y0) * px_per_base))
    A = np.zeros((2, 3)); A[:, :2] = M[:, :2] / k * px_per_base; A[:, 2] = (M[:, 2] - np.array([x0, y0])) * px_per_base
    shrink = math.sqrt(abs(np.linalg.det(A[:, :2]))); pre = np.concatenate([bleed(rgb, a), a[..., None] * 255], 2)
    if shrink < 0.75: pre = cv2.GaussianBlur(pre, (0, 0), 0.42 / shrink)
    out = cv2.warpAffine(pre, A, (W, H), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE if False else cv2.BORDER_CONSTANT)
    oa = np.clip(out[..., 3] / 255, 0, 1); orgb = np.clip(out[..., :3], 0, 255); orgb = bleed(orgb, oa)
    return np.dstack([orgb, oa * 255]).round().astype(np.uint8), (x0, y0, W / px_per_base, H / px_per_base)


def save(path, rgba, quality=91):
    from PIL import Image
    Image.fromarray(rgba, "RGBA").save(path, "WEBP", quality=quality, alpha_quality=100, method=6, exact=True)


def pieces(recipe, root, out):
    rid = recipe["id"]; dest = out / rid; dest.mkdir(parents=True, exist_ok=True); sources = {n: Source(s, root) for n, s in recipe["sources"].items()}; done = {}
    for q in recipe["pieces"]:
        s = sources[q["source"]]; cm = 1 / s.spec.get("px", recipe.get("px", 1)); ox, oy = s.spec.get("origin", (0, 0)); rgb, a = cut(s, q)
        rgba, (x, y, w, h) = place(rgb, a, s.M, s.k, q.get("density", recipe.get("density", 12)) * cm); save(dest / f"{q['id']}.webp", rgba, q.get("quality", 88))
        at = lambda v: [round((v[0] - x) / w, 4), round((v[1] - y) / h, 4)]
        done[q["id"]] = {"image": {"src": f"{q['id']}.webp", "width": int(rgba.shape[1]), "height": int(rgba.shape[0])}, "x": round((x - ox) * cm, 3), "y": round((y - oy) * cm, 3), "width": round(w * cm, 3), "height": round(h * cm, 3), **{k: at(q[k]) for k in ("grip", "foot") if k in q}}
    (dest / "art.json").write_text(json.dumps({"pieces": done, "provenance": recipe.get("provenance", "")}, ensure_ascii=False, indent=1) + "\n")
    print(f"  {rid}: {len(done)} pieces, {sum((dest / i['image']['src']).stat().st_size for i in done.values()) / 1e6:.2f} MB")


def likeness(canvas, cover, own, base, px):
    """How far the layers that were put back together are from the base painting, where they were cut from it: structure, colour, the outer outline (95 of 100 points are nearer), and how much of the figure that is."""
    size = canvas.shape[1::-1]; shrink = lambda m: cv2.resize(m, size, interpolation=cv2.INTER_AREA if base.k > px else cv2.INTER_LINEAR)
    want, there = shrink(base.raw * base.a[..., None] + 255 * (1 - base.a[..., None])), shrink(base.a) > 0.5; both = there & (own > 0.5); blur = lambda m: cv2.GaussianBlur(m, (0, 0), 3)
    x, y = (cv2.cvtColor(m.astype(np.float32), cv2.COLOR_RGB2GRAY) for m in (canvas, want)); mx, my = blur(x), blur(y); sx, sy, sxy = blur(x * x) - mx * mx, blur(y * y) - my * my, blur(x * y) - mx * my
    ssim = (2 * mx * my + 6.5) * (2 * sxy + 58.5) / ((mx * mx + my * my + 6.5) * (sx + sy + 58.5))
    ring = lambda m: cv2.drawContours(np.zeros(m.shape, np.uint8), cv2.findContours(m.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)[0], -1, 1, 1).astype(bool)
    far = cv2.distanceTransform((~ring(there)).astype(np.uint8), cv2.DIST_L2, 5); return float(ssim[both].mean()), float(np.abs(canvas - want).mean(2)[both].mean()), float(np.percentile(far[ring(cover > 0.5) & (own > 0.5)], 95)), float(both.sum() / (cover > 0.5).sum())


def resized(rgb, shape): return rgb if rgb.shape[:2] == shape[:2] else cv2.resize(rgb, (shape[1], shape[0]), interpolation=cv2.INTER_CUBIC)


def build(recipe, root, out):
    """Paintings to layers. `storybook-rig.py` gives layers that are cut already: a `plate` of colour and alpha, `k` pixels for each base pixel."""
    rid = recipe["id"]; dest = out / rid; dest.mkdir(parents=True, exist_ok=True)
    sources = {n: Source(s, root) for n, s in recipe["sources"].items()}
    J = recipe["joints"]; top, ground = J["crown"][1], J["ground"]; cm = recipe["height"] / (ground - top)  # centimetres a base pixel
    over = J.get("over", (J["legF"]["end"][0] + J["legB"]["end"][0]) / 2)
    P = lambda p: [round((p[0] - over) * cm, 3), round((p[1] - ground) * cm, 3)]
    images, layers, plates = {}, [], {}; whole = np.array([[1, 0, 0], [0, 1, 0]], np.float64)
    top_plate = recipe.get("head")
    if top_plate: hk, (hx, hy) = top_plate["k"], top_plate["at"]; drawn = SimpleNamespace(rgb=top_plate["rgb"], raw=top_plate["rgb"], a=(top_plate["a"] * top_plate["cut"]).astype(np.float32), k=hk, M=np.array([[1, 0, hx], [0, 1, hy]], np.float64), root=root, spec={}, extra=lambda n: resized(load(root / n), top_plate["rgb"].shape))

    def image(name, rgba):
        save(dest / f"{name}.webp", rgba); images[name] = {"src": f"{name}.webp", "width": int(rgba.shape[1]), "height": int(rgba.shape[0])}; return name

    def placed(name, rgb, a, M, k, density):
        rgba, (x, y, w, h) = place(rgb, a, M, k, density * cm); plates[name] = (rgba, (x, y, w, h), density * cm)
        return {"image": image(name, rgba), "x": P((x, y))[0], "y": P((x, y))[1], "width": round(w * cm, 3), "height": round(h * cm, 3)}

    def bind(b):
        b = json.loads(json.dumps(b))
        if b["kind"] == "limb":
            b["soft"] = round(b["soft"] * cm, 3)
            if "root" in b: b["root"]["soft"] = round(b["root"]["soft"] * cm, 3)
            if "hole" in b.get("root", {}): b["root"]["hole"] = [P(p) for p in b["root"]["hole"]]
        if "slack" in b: b["slack"] = {k: round(v * cm, 3) if k in ("past", "cuff") else v for k, v in b["slack"].items()}
        for p in b.get("pulls", []):
            p["from"], p["to"] = P(p["from"]), P(p["to"])
            if "within" in p: p["within"] = {"at": P(p["within"]["at"]), "radius": round(p["within"]["radius"] * cm, 3)}
        return b

    hands = recipe.get("hands", {})
    def hand(layer, name, h):
        s = sources[h["source"]] if "source" in h else SimpleNamespace(M=whole, k=h["plate"]["k"]); w, n = np.array(h["wrist"], float), np.array(h["knuckle"], float); d = n - w; L = math.hypot(*d); scale = h["length"] / L if "length" in h else cm * math.sqrt(abs(np.linalg.det(s.M[:, :2])))
        # bone space: wrist at 0, knuckles on +y; a mirrored drawing is the other hand
        ang = math.atan2(d[0], d[1]); c, si = math.cos(ang), math.sin(ang); R = np.array([[c, -si], [si, c]]) * scale; fl = -1 if h.get("mirror") else 1; R = np.diag([fl * h.get("wide", 1), 1]) @ R
        M = np.zeros((2, 3)); M[:, :2] = R; M[:, 2] = -R @ w
        def one(spec, tag):
            rgb, a = cut(s, {**h, **spec}) if "source" in h else (h["plate"]["rgb"], h["plate"]["a"]); rgba, (x, y, ww, hh) = place(rgb, a, M, s.k, recipe.get("handDensity", 26))
            return {"image": image(f"{layer}-{tag}", rgba), "x": round(x, 3), "y": round(y, 3), "width": round(ww, 3), "height": round(hh, 3)}
        v = one({}, name); hand.M[(layer, name)] = M
        # how far the piece of forearm in the drawing is turned from the hand
        if "cuff" in h or "length" in h: v["wrist"] = h.get("cuff", 0)
        else: arm = recipe["joints"]["armF" if layer.endswith("-f") else "armB"]; f = R @ np.linalg.inv(s.M[:, :2]) @ (np.array(arm["end"], float) - arm["mid"]); v["wrist"] = round(math.degrees(math.atan2(-f[0], f[1])), 2)
        if h.get("front"): v["front"] = one({"poly": h["front"]}, f"{name}-front")
        if h.get("over"): v["over"] = h["over"]
        return v
    hand.M = {}

    for L in recipe["layers"]:
        o = {"id": L["id"], "z": L["z"], "bind": bind(L["bind"])}
        if "plate" in L: q = L["plate"]; o.update(placed(L["id"], q["rgb"], q["a"], whole, q["k"], L.get("density", recipe.get("density", 16))))
        elif L.get("head"): o.update(placed(L["id"], drawn.rgb, drawn.a, drawn.M, drawn.k, L.get("density", 25)))
        elif L.get("poly") or L.get("source"):
            s = sources[L["source"]]; rgb, a = cut(s, L); o.update(placed(L.get("image", L["id"]), rgb, a, s.M, s.k, L.get("density", recipe.get("density", 16))))
        for key in ("grid", "turns", "tint", "keepReading"):
            if key in L: o[key] = L[key]
        for n, q in L.get("alt", {}).items(): o.setdefault("variants", {})[n] = {**placed(f"{L['id']}-{n}", q["rgb"], q["a"], whole, q["k"], L.get("density", recipe.get("density", 16))), "rest": True}; plates.pop(f"{L['id']}-{n}")
        vs = hands.get(L["id"])
        if vs:
            o["variants"] = {**o.get("variants", {}), **{n: hand(L["id"], n, h) for n, h in vs.items()}}; first = L.get("rest", next(iter(vs)))
            if "image" not in o: o.update({k: v for k, v in o["variants"][first].items() if k != "front"}); o["space"] = "bone"
        layers.append(o)

    art = {"id": rid, "images": images, "layers": layers}
    if "trunk" in recipe: art["trunk"] = {"at": P(recipe["trunk"]["at"]), "radius": [round(v * cm, 3) for v in recipe["trunk"]["radius"]]}
    f = recipe.get("face")
    if f:
        s = drawn if top_plate else sources[f["source"]]; B = P if top_plate else (lambda p: P(s.to_base(p))); r = lambda q: round(q * cm * (1 if top_plate else math.sqrt(abs(np.linalg.det(s.M[:, :2])))), 3)
        # polygons of a drafted face are in base pixels, several to a region
        region = (lambda n: np.max([polygon(s.a.shape, [(x - hx, y - hy) for x, y in q], s.k, f.get("soft", 14)) for q in f["regions"][n]], 0)) if top_plate else (lambda n: polygon(s.a.shape, f["regions"][n], s.k, f.get("soft", 14)))
        rounds = lambda e: {"at": B(e["at"]), "radius": [r(e["radius"][0]), r(e["radius"][1])]}
        face = {"layer": f["layer"], "round": rounds(f["round"]), "eyes": [rounds(e) for e in f["eyes"]], "brows": [rounds(e) for e in f.get("brows", [])], "patches": {}, "looks": f["looks"], **({"lookFor": f["lookFor"]} if "lookFor" in f else {}), "lids": f["lids"], "mouths": f["mouths"], "mouthFor": f.get("mouthFor", {}), **({"jaw": {**rounds(f["jaw"]), "drop": r(f["jaw"]["drop"])}} if "jaw" in f else {})}
        if "mesh" in f: face["mesh"] = [[*P(q), round(q[2] * cm, 3)] for q in f["mesh"]]; face["shows"] = f.get("shows", 1)
        changed = sum((region(n) > 0.5).astype(np.float32) for n in f["regions"]); steady = ((changed < 0.01) & (s.a > 0.9)).astype(np.float32)
        for name, p in f["patches"].items():
            if "use" in p: face["patches"][name] = {**{k: v for k, v in face["patches"][p["use"]].items() if k not in ("marks", "shape")}, "marks": [B(q) for q in p["marks"]], "shape": [B(q) for q in p["shape"]]}; continue
            new = s.extra(p["file"]) if p["file"] else s.raw.copy(); tone = s.spec.get("tone")
            if tone: new = np.clip((new - 255) * np.array(tone, np.float32) + 255, 0, 255)
            new, off = register(new, s.raw, steady, f.get("sync", 6)); new = samepaint(new, s.raw, steady)
            if p.get("squeeze"): new = squeeze(new, p["squeeze"], s.k)
            if p.get("steps"): new = steps(SimpleNamespace(rgb=new, a=s.a, k=s.k, raw=s.raw, root=s.root, extra=s.extra), p)[0]
            m = region(p["region"])
            ring = ((m > 0.02) & (m < 0.5) & (s.a > 0.95)).astype(np.float32)
            # the paint round the patch has to be the same paint: one offset and one gain a channel, on the ring
            if ring.sum() > 100:
                w = ring / ring.sum(); mb, mn = (s.raw * w[..., None]).sum((0, 1)), (new * w[..., None]).sum((0, 1)); new = new + (mb - mn)
                # and what is left of the difference at the ring goes in smoothly, as light does; lines that are somewhere else do not count
                d = s.raw - new; same = ring * (np.abs(d).max(2) < 60); far = 0.02 * s.a.shape[1]; top = sum(cv2.GaussianBlur(d * same[..., None], (0, 0), f_) for f_ in (far, 3 * far)); under = sum(cv2.GaussianBlur(same, (0, 0), f_) for f_ in (far, 3 * far))
                new = new + top / np.maximum(under, 1e-5)[..., None] * np.clip(under * 400, 0, 1)[..., None]
            left = float((np.abs(new - s.raw).mean(2) * ring).sum() / max(1, ring.sum()))
            a = m * (s.a > 0.5); rgba = placed(f"face-{name}", np.clip(new, 0, 255), a.astype(np.float32), s.M, s.k, f.get("density", 24))
            face["patches"][name] = {**rgba, **({"marks": [B(q) for q in p["marks"]]} if p.get("marks") else {})}
            print(f"    patch {name:12s} registered {off:5.2f} px, ring differs {left:4.1f}/255")
        art["face"] = face
    sock = {}
    for n, q in recipe.get("sockets", {}).items():
        if q.get("hand"):
            lay = q["layer"]; M = hand.M[(lay, q["hand"])]; x, y = M @ np.array([*q["at"], 1.0]); up = M[:, :2] @ (np.array(q["to"], float) - q["at"]) if "to" in q else None; sock[n] = {"bone": q["bone"], "at": [round(x, 3), round(y, 3)], "layer": lay, **({"angle": round(math.degrees(math.atan2(up[0], -up[1])), 1)} if up is not None else {"angle": q["angle"]} if "angle" in q else {})}
        else: sock[n] = {"bone": q["bone"], "at": q["cm"], **({"angle": q["angle"]} if "angle" in q else {}), **({"layer": q["layer"]} if "layer" in q else {})}
    if sock: art["sockets"] = sock
    limb = lambda l: {k: P(v) for k, v in l.items()}
    joints = {k: (limb(v) if isinstance(v, dict) else P(v)) for k, v in J.items() if k not in ("ground", "over")}; joints["ground"] = 0; joints["over"] = 0
    extra = [{**e, "at": P(e["at"]), **({"to": P(e["to"])} if "to" in e else {})} for e in recipe.get("extra", [])]
    kept = {k: recipe[k] for k in ("body", "walk") if k in recipe}
    (dest / "art.json").write_text(json.dumps({"art": art, "joints": joints, "extra": extra, **kept, "provenance": recipe.get("provenance", "")}, ensure_ascii=False, indent=1) + "\n")

    # the layers, put back together where they were cut
    q = recipe.get("painting"); base = SimpleNamespace(raw=q["rgb"], a=q["a"], k=1, h=q["a"].shape[0], w=q["a"].shape[1]) if q else sources[recipe.get("base", next(iter(sources)))]; px = 2.0; H, W = int(base.h * px), int(base.w * px); canvas = np.full((H, W, 3), 255, np.float32); from_base = {l["id"] for l in recipe["layers"] if "plate" in l or l.get("head")} if q else {l["id"] for l in recipe["layers"] if l.get("source") and sources[l["source"]].spec["file"] == base.spec["file"] and not sources[l["source"]].spec.get("place")}; cover, own = np.zeros((2, H, W), np.float32)
    for L in sorted((l for l in layers if l.get("image") in plates and l.get("space") != "bone"), key=lambda l: l["z"]):  # hands lie in the space of their bone
        rgba, (x, y, w, h), d = plates[L["image"]]; A = np.array([[px / d, 0, x * px], [0, px / d, y * px]]); q = cv2.warpAffine(rgba.astype(np.float32), A, (W, H), flags=cv2.INTER_AREA if d > px else cv2.INTER_LINEAR)
        t = np.array(L.get("tint", [1, 1, 1]), np.float32); al = q[..., 3:] / 255; canvas = canvas * (1 - al) + q[..., :3] * t * al; al = al[..., 0]; cover = 1 - (1 - cover) * (1 - al); own = own * (1 - al) + (al if L["id"] in from_base else 0)
    cv2.imwrite(str(dest / "_assembled.png"), canvas[:, :, ::-1].round().astype(np.uint8))
    size = sum((dest / i["src"]).stat().st_size for i in images.values())
    print(f"  {rid}: {len(layers)} layers, {len(images)} images, {size / 1e6:.2f} MB, {cm:.4f} cm a pixel")
    same, colour, edge, share = likeness(canvas, cover, own, base, px)
    print(f"    put back together, the {share * 100:.0f}% that is the base painting itself: SSIM {same:.3f}, colour {colour:.1f}/255, outline {edge * cm / px:.2f} cm")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(); ap.add_argument("recipes", nargs="+"); ap.add_argument("--src", required=True); ap.add_argument("--out", required=True); o = ap.parse_args()
    for r in o.recipes: spec = json.loads(Path(r).read_text()); (build if "joints" in spec else pieces)(spec, Path(o.src), Path(o.out))
