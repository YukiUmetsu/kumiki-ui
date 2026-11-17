"""
Measure iris colour zone by zone in eye photographs (ANAT1 eye-detail research, 2026-11-16).

Usage (needs numpy and opencv-python; not part of the build):
  python scripts/anatomy/measure-iris-colour.py out.json assets/photos/anatomy-references/eye-*.jpg

The pupil is the darkest round blob; the iris edge is where the sclera's brightness begins, traced along the left and
right sectors (least covered by lids and lashes). Rings skip highlights and lashes; colours are averaged in linear
light. MANUAL holds hand-placed centres and radii for photographs where the search fails, read off a coordinate grid
on the original Commons files at 1200 px (the Reference board copies are 900 px: scale them by 0.75).
"""
import sys, json, math
import numpy as np, cv2
def lin(c): c = c / 255.0; return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
def lab_of(rgb):
    M = np.array([[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]])
    xyz = rgb @ M.T / np.array([0.95047, 1.0, 1.08883])
    f = np.where(xyz > 216 / 24389, np.cbrt(xyz), (24389 / 27 * xyz + 16) / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], -1)
def hexof(m): return "#%02x%02x%02x" % tuple(int(round(255 * min(1, (v / 12.92 if v <= 0.0031308 else 1.055 * v ** (1 / 2.4) - 0.055)))) for v in m)
# hand-placed centre (x, y) and pupil and iris radii, as fractions of the image width (x, radii) and height (y), where
# the blob search fails (read off a coordinate grid on the original Commons files); keyed by EYE_REFERENCES id
MANUAL = {"eye-amber-light": (0.5257, 0.4369, 0.0489, 0.163), "eye-grey": (0.445, 0.4738, 0.0554, 0.1459), "eye-blue-green": (0.2621, 0.6343, 0.0125, 0.0576),
          "eye-blue-grey": (0.505, 0.4617, 0.0791, 0.3451), "eye-green-hazel": (0.4917, 0.4636, 0.0662, 0.1639)}
out = {}
for path in sys.argv[2:]:
    name = path.split("/")[-1].rsplit(".", 1)[0]
    if not name.startswith("eye-"): name = "eye-" + name
    img = cv2.imread(path); h, w = img.shape[:2]
    L = lab_of(lin(img[..., ::-1].astype(np.float64)))[..., 0]; LIN = lin(img[..., ::-1].astype(np.float64))
    Lb = cv2.GaussianBlur(L.astype(np.float32), (0, 0), max(1.0, min(h, w) / 250))
    best = None
    for pc in (1.0, 2.0, 3.5, 5.0):
        thr = np.percentile(Lb[int(h * 0.1):int(h * 0.9), int(w * 0.05):int(w * 0.95)], pc)
        m = ((Lb < thr + 2) * 255).astype(np.uint8)
        m = cv2.morphologyEx(m, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))
        n, lab, st, cen = cv2.connectedComponentsWithStats(m)
        for k in range(1, n):
            x0, y0, ww, hh, area = st[k]
            if area < min(h, w) ** 2 * 0.0008 or ww > w * 0.4 or hh > h * 0.6: continue
            circ = area / (math.pi * (max(ww, hh) / 2) ** 2)
            aspect = min(ww, hh) / max(ww, hh)
            if circ < 0.55 or aspect < 0.6: continue
            score = circ * aspect * math.sqrt(area) - 0.002 * abs(cen[k][0] - w / 2) * (1 if "het" not in name and "green" not in name else 0)
            if best is None or score > best[0]: best = (score, cen[k][0], cen[k][1], max(ww, hh) / 2)
        if best: break
    if name in MANUAL: fx, fy, fp, fi = MANUAL[name]; best = (0, fx * w, fy * h, fp * w)
    if not best: print(name, "no pupil"); continue
    _, cx, cy, Rp = best
    edges = []
    for a in list(np.radians(np.arange(-25, 26, 2.5))) + list(np.radians(np.arange(155, 206, 2.5))):
        rs = np.arange(Rp * 1.4, Rp * 7, max(0.5, Rp / 40))
        xs = (cx + rs * math.cos(a)).astype(int); ys = (cy + rs * math.sin(a)).astype(int)
        ok = (xs >= 0) & (xs < w) & (ys >= 0) & (ys < h)
        if ok.sum() < 15: continue
        prof = Lb[ys[ok], xs[ok]]; rr = rs[ok]; d = np.gradient(prof)
        k = int(np.argmax(d)); edges.append(rr[k])
    Ri = float(MANUAL[name][3] * w) if name in MANUAL else float(np.median(edges))
    yy, xx = np.mgrid[0:h, 0:w]; rad = np.hypot(xx - cx, yy - cy); ang = np.degrees(np.arctan2(yy - cy, xx - cx))
    side = (np.abs(ang) < 40) | (np.abs(ang) > 140)
    t = (rad - Rp) / max(1, Ri - Rp)
    res = {"pupil_px": round(Rp, 1), "iris_px": round(Ri, 1), "pupil_ratio": round(Rp / Ri, 3)}
    for zn, (a0, b0) in {"pupillary": (0.05, 0.3), "middle": (0.3, 0.65), "outer": (0.65, 0.88), "limbal": (0.88, 1.0)}.items():
        m = side & (t >= a0) & (t < b0) & (L > 5) & (L < 90)
        if m.sum() < 30: continue
        mean = LIN[m].mean(0); lb = lab_of(mean[None])[0]
        res[zn] = {"srgb": hexof(mean), "lab": [round(float(x), 1) for x in lb], "Lsd": round(float(L[m].std()), 1)}
    out[name] = res
    print(name, json.dumps(res))
json.dump(out, open(sys.argv[1], "w"), indent=1)
