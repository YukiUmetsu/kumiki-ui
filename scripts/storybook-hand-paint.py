"""Paints the shape of a hand (storybook-hand.mjs) in the look of the kit of hands: ink round what lies before something else, and a
warm wash that is pale where the light falls. The count of the fingers and their joints are those of the measured hand.

  python scripts/storybook-hand-paint.py shape.png out.png [--ink 4.2] [--nails x,y,angle,length ...]
"""
import argparse
import numpy as np, cv2

a = argparse.ArgumentParser(); a.add_argument("shape"); a.add_argument("out"); a.add_argument("--ink", type=float, default=4.2); a.add_argument("--nails", nargs="*", default=[]); a.add_argument("--seed", type=int, default=3); a.add_argument("--lines", type=float, default=0.02)
o = a.parse_args(); K = 2
im = cv2.imread(o.shape)[:, :, ::-1].astype(np.float32); h, w = im.shape[:2]
on = (im.max(2) - im.min(2) > 14).astype(np.float32); on = cv2.morphologyEx(on, cv2.MORPH_OPEN, np.ones((5, 5)));
blur = lambda x, s: cv2.GaussianBlur(x, (0, 0), s)
lum = im.mean(2) / 255
# the shading of the shape alone, without its edge: what is outside takes the tone of what is near
near = lambda x, s: blur(x * on, s) / np.maximum(blur(on, s), 1e-3)
rng = np.random.default_rng(o.seed); noise = lambda s: (lambda n: (n - n.mean()) / n.std())(blur(rng.normal(size=(h, w)).astype(np.float32), s))
tone = near(lum, 4); inside = near(lum, 60); form = tone - inside
# wash: three layers with wet edges; the lower side and the ends of the fingers are warmer
dist = cv2.distanceTransform(on.astype(np.uint8), cv2.DIST_L2, 5)
ys = np.arange(h, dtype=np.float32)[:, None] * np.ones((1, w), np.float32); top = np.where(on > 0, ys, 1e9).min(0); bot = np.where(on > 0, ys, -1).max(0); u = np.clip((ys - top) / np.maximum(1, bot - top), 0, 1)
shade = -form * 9 + 0.55 * (u - 0.5) + 0.12 * noise(26) + 0.05 * noise(7); ss = lambda e0, e1, x: (lambda t: t * t * (3 - 2 * t))(np.clip((x - e0) / (e1 - e0), 0, 1))
paper, pale, mid, deep = (np.array(c, np.float32) for c in ((254, 240, 214), (253, 224, 182), (250, 204, 156), (233, 158, 122)))
xs = np.arange(w, dtype=np.float32)[None, :] * np.ones((h, 1), np.float32); tips = ss(560, 760, xs)
col = paper + (pale - paper) * ss(-0.34, -0.02, shade)[..., None]
col = col + (mid - col) * (0.85 * ss(0.04, 0.16, shade))[..., None]
col = col + (deep - col) * (0.72 * ss(0.3, 0.44, shade + 0.1 * tips))[..., None]
col = col + (deep - col) * (0.22 * tips * ss(0.0, 0.5, 1 - dist / 60))[..., None]
col += (noise(1.1) * 2.2 + noise(3) * 1.6)[..., None]
# ink: the outside, and the valleys where one finger lies beside another
def line(mask_dist, width): return np.clip(width / 2 + 0.6 - mask_dist, 0, 1)
out_d = np.abs(cv2.distanceTransform(on.astype(np.uint8), cv2.DIST_L2, 5) - cv2.distanceTransform((1 - on).astype(np.uint8), cv2.DIST_L2, 5))
pressure = 1 + 0.16 * noise(18)
ink = line(out_d, o.ink * pressure)
flat = np.where(on > 0, lum, inside); valley = blur(flat, 5.5) - blur(flat, 1.6); core = (dist > 5) & (on > 0)
v = ss(o.lines, o.lines * 2.2, np.where(core, valley, 0)) * (1 - 0.0 * tips)
ink = np.maximum(ink, v * 0.95)
for n in o.nails:
    x, y, ang, L = map(float, n.split(",")); t = np.deg2rad(ang); W = L * 0.62
    X, Y = xs - x, ys - y; p, q = X * np.cos(t) + Y * np.sin(t), -X * np.sin(t) + Y * np.cos(t)
    # a nail: straight at its sides, round at its foot, and its tip is the outside of the finger
    f = np.maximum(np.abs(q) / (W / 2), (np.clip(-(p + L * 0.12), 0, None) / (L * 0.42))) ; f = np.where(p < -L * 0.12, np.hypot(np.abs(q) / (W / 2), np.clip(-(p + L * 0.12), 0, None) / (L * 0.42)), np.abs(q) / (W / 2)); f = np.maximum(f, p / (L * 0.5))
    m = np.clip((1 - f) * W / 2 + 0.5, 0, 1) * (on > 0); col = col + (np.array((255, 228, 206), np.float32) - col) * (0.75 * m)[..., None]
    ink = np.maximum(ink, np.clip(1.5 - np.abs(1 - f) * W / 2, 0, 1) * (on > 0) * (p < L * 0.46) * 0.8)
rgb = np.where(on[..., None] > 0, col, 255); grain = np.clip(0.94 + 0.05 * noise(1.4), 0.75, 1)
rgb = rgb + (np.array((62, 34, 26), np.float32) - rgb) * (np.clip(ink, 0, 1) * grain)[..., None]
cv2.imwrite(o.out, np.clip(rgb, 0, 255).astype(np.uint8)[:, :, ::-1])
