#!/usr/bin/env python3
"""Looks at the frames that storybook-qa.mjs took of a painted film, with its trace.

  python scripts/storybook-qa.py dir     reads dir/trace.json and dir/frames/*.png, writes dir/report.json and dir/worst.png

order   a frame that was drawn twice, in another order, has to be the same picture (largest difference, SSIM)
pops    a picture that is unlike both its neighbours, which are like each other: a part that jumps, a hole, a wrong drawing for one frame
feet    the paint round a foot that is down may not move against the ground (pyramidal Lucas-Kanade, less what the camera did)
mouths  how dark the inside of the painted mouth is, against how far the recording says that it is open (correlation, lag)
"""
import json, sys
from pathlib import Path
import cv2
import numpy as np

root = Path(sys.argv[1]); T = json.loads((root / "trace.json").read_text()); F = T["frames"]; first = T["first"]
pictures = {}
def frame(n):
    if n not in pictures:
        if len(pictures) > 6: pictures.pop(next(iter(pictures)))
        pictures[n] = cv2.imread(str(root / "frames" / f"{n:05d}.png")).astype(np.float32)
    return pictures[n]
grey = lambda n: cv2.cvtColor(frame(n), cv2.COLOR_BGR2GRAY)
k = frame(first).shape[1] / T["size"]["width"]; H, W = frame(first).shape[:2]; faults, out = [], {}


def ssim(a, b):
    g = lambda x: cv2.GaussianBlur(x, (0, 0), 1.5); ma, mb = g(a), g(b); va, vb, c = g(a * a) - ma * ma, g(b * b) - mb * mb, g(a * b) - ma * mb
    return float((((2 * ma * mb + 6.5) * (2 * c + 58.5)) / ((ma * ma + mb * mb + 6.5) * (va + vb + 58.5))).mean())


# ---- order
out["order"] = []
for p in sorted((root / "frames").glob("again-*.png")):
    n = int(p.stem[6:]); a = cv2.imread(str(p)).astype(np.float32); d = float(np.abs(a - frame(n)).max()); s = ssim(cv2.cvtColor(a, cv2.COLOR_BGR2GRAY), grey(n)); out["order"].append({"frame": n, "max": d, "ssim": round(s, 5)})
    if d > 2: faults.append(f"frame {n} depends on the frames drawn before it (a pixel differs by {d:.0f}).")

# ---- pops
NEAR = np.ones((2 * max(2, round(12 * k)) + 1,) * 2, np.uint8)  # paint may move this far in a frame (12 px of a 1920 picture)
beyond = lambda m, other: np.maximum(np.maximum(cv2.erode(other, NEAR) - m, m - cv2.dilate(other, NEAR)), 0)
pops = []
for i in range(1, len(F) - 1):
    a, b, c = F[i - 1], F[i], F[i + 1]
    if a["shot"] != c["shot"] or a["joined"] or b["joined"] or c["joined"]: continue
    soft = lambda n: cv2.GaussianBlur(grey(n), (0, 0), 1.2); A, B, C = soft(a["n"]), soft(b["n"]), soft(c["n"])
    odd = np.minimum(beyond(B, A), beyond(B, C)) - np.abs(A - C); bad = (odd > 22).astype(np.uint8); bad[int(H * 0.84):] = 0  # subtitles change as they should
    bad = cv2.morphologyEx(bad, cv2.MORPH_OPEN, np.ones((2, 2), np.uint8)); share = float(bad.mean())
    if share > 0:
        ys, xs = np.nonzero(bad); pops.append({"frame": b["n"], "shot": b["shot"], "share": round(share * 100, 3), "box": [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())]})
pops.sort(key=lambda p: -p["share"]); out["pops"] = pops[:24]
if pops and pops[0]["share"] > 0.6: faults += [f"frame {p['frame']} ({p['shot']}) is unlike its neighbours in {p['share']:.2f}% of the picture, at {p['box']}." for p in pops[:6] if p["share"] > 0.6]

# ---- feet
feet = []
for i in range(len(F) - 1):
    a, b = F[i], F[i + 1]
    if a["shot"] != b["shot"] or a["joined"] or b["joined"]: continue
    for p in a["feet"]:
        q = next((q for q in b["feet"] if q["id"] == p["id"]), None)
        if not q or not p["down"] or not q["down"]: continue
        x, y = p["at"][0] * k, p["at"][1] * k; r = max(7, 5 * a["scale"] * k)
        if not (r < x < W - r and r < y < H * 0.84 - r): continue
        g0, g1 = grey(a["n"]).clip(0, 255).astype(np.uint8), grey(b["n"]).clip(0, 255).astype(np.uint8); mask = np.zeros_like(g0); cv2.circle(mask, (int(x), int(y)), int(r), 255, -1)
        pts = cv2.goodFeaturesToTrack(g0, 12, 0.05, 3, mask=mask)
        if pts is None: continue
        new, ok, _ = cv2.calcOpticalFlowPyrLK(g0, g1, pts, None, winSize=(11, 11)); back, ok2, _ = cv2.calcOpticalFlowPyrLK(g1, g0, new, None, winSize=(11, 11)); good = (ok[:, 0] == 1) & (ok2[:, 0] == 1) & (np.abs(back - pts).max((1, 2)) < 0.4)
        if good.sum() < 3: continue
        move = np.median((new - pts)[good, 0], 0); camera = [(q["at"][j] - p["at"][j]) * k for j in (0, 1)]; feet.append((abs(float(move[0]) - camera[0]) / (a["scale"] * k), a["n"], p["id"]))
feet.sort(reverse=True); out["feet"] = {"tracked": len(feet), "worst": [{"cm": round(v, 2), "frame": n, "id": i} for v, n, i in feet[:5]], "median": round(float(np.median([v for v, _, _ in feet])), 3) if feet else None}
if feet and feet[min(len(feet) - 1, 3)][0] > 1.2: faults.append(f"the paint of {feet[0][2]} moves {feet[0][0]:.1f} cm against the ground (frame {feet[0][1]}).")

# ---- mouths
lines, small = {}, set()
for f in F:
    for m in f["mouths"]:
        quad = np.float32(m["quad"]) * k; (x0, y0), (x1, y1) = quad.min(0), quad.max(0)
        if f["joined"] or x0 < 0 or y0 < 0 or x1 > W or y1 > H * 0.86: continue
        w, h = np.linalg.norm(quad[1] - quad[0]), np.linalg.norm(quad[3] - quad[0])
        if w < 22: small.add(m["line"]); continue
        size = (96, max(16, int(round(96 * h / w)))); flat = cv2.warpPerspective(frame(f["n"]), cv2.getPerspectiveTransform(quad, np.float32([[0, 0], [size[0], 0], [size[0], size[1]], [0, size[1]]])), size, flags=cv2.INTER_AREA)
        lab = cv2.cvtColor(flat / 255, cv2.COLOR_BGR2LAB); e = size[0] // 8; edge = np.ones(lab.shape[:2], bool); edge[e:-e, e:-e] = False
        dark = np.median(lab[edge][:, 0]) - lab[..., 0]  # the rim of the lips is skin
        lines.setdefault((m["line"], f["shot"]), []).append((f["n"], m["open"], float(np.clip(dark - 12, 0, None)[e:-e, e:-e].mean())))
for line in sorted(small): print(f"line {line}: the mouth is too small to measure. Use a greater --width.")
out["mouths"] = []
for (line, shot), v in lines.items():
    v = np.array(v); o, s = v[:, 1], v[:, 2]
    if len(v) < 14 or s.std() < 1e-3 or o.std() < 1e-3: continue
    like = lambda lag: float(np.corrcoef(o[max(0, -lag):len(o) - max(0, lag)], s[max(0, lag):len(s) - max(0, -lag)])[0, 1]); lags = {d: like(d) for d in range(-4, 5)}; best = max(lags, key=lags.get)
    out["mouths"].append({"line": line, "shot": shot, "frames": len(v), "like": round(lags[0], 2), "lag": best})
    if lags[0] < 0.35: faults.append(f"line {line} in {shot}: the painted mouth does not move with the voice (correlation {lags[0]:.2f}).")
    if abs(best) > 2: faults.append(f"line {line} in {shot}: the painted mouth is {best} frames off.")

# ---- what to look at
rows = []
for p in pops[:4]:
    n = p["frame"]; x0, y0, x1, y1 = p["box"]; c = [(x0 + x1) // 2, (y0 + y1) // 2]; r = max(60, (x1 - x0) // 2 + 16, (y1 - y0) // 2 + 16); a, b = max(0, c[1] - r), max(0, c[0] - r)
    rows.append(np.hstack([cv2.resize(frame(m)[a:a + 2 * r, b:b + 2 * r], (300, 300), interpolation=cv2.INTER_CUBIC).clip(0, 255).astype(np.uint8) for m in (n - 1, n, n + 1)]))
if rows: cv2.imwrite(str(root / "worst.png"), np.vstack(rows))
out["faults"] = faults; (root / "report.json").write_text(json.dumps(out, indent=1))
print("order ", "; ".join(f"frame {q['frame']}: max {q['max']:.0f}/255, SSIM {q['ssim']}" for q in out["order"]))
print("pops  ", "; ".join(f"{p['frame']} {p['shot']} {p['share']}%" for p in pops[:8]) or "none")
print("feet  ", f"{out['feet']['tracked']} tracked, median {out['feet']['median']} cm a frame, worst", "; ".join(f"{q['cm']} cm {q['id']} @{q['frame']}" for q in out["feet"]["worst"][:3]))
print("mouths", "; ".join(f"{m['line']} {m['like']} lag {m['lag']}" for m in out["mouths"]))
for f in faults: print("FAULT", f)
sys.exit(1 if faults else 0)
