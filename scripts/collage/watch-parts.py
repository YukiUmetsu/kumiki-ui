"""Take the pocket-watch photo apart into a plate and moving parts for the COLLAGE1 photo rig.

usage: python3 -I scripts/collage/watch-parts.py src/video/assets/collage/pocket-watch-cutout.webp src/video/assets/collage \
         --font <Newsreader .ttf> [--preview <png>]
(The font is @fontsource-variable/newsreader's latin opsz woff2 converted to TTF with fontTools; OFL 1.1.)

Writes pocket-watch-{plate,minute,hour,seconds,cap,subcap,bow}.webp and prints each layer's box.
- Plate: hands removed. Tick rings and the collet are restored by copying the same ring from a symmetric angle
  (ticks repeat every 6 degrees, long ticks every 60); bare enamel by region-aware normalized convolution. The subdial
  numerals "10" (hidden under the hour hand) and the "2" of "20" (crossed by the seconds hand) are rebuilt from the
  dial's own "0" plus a Newsreader digit at the measured size, ink tone and angle.
- Hands: stems are clean anti-aliased bars from measured outlines coloured by the photo's own gilt; the hour leaf
  and the seconds hand use a difference matte against the plate. Caps are separate top layers.
- Bow: the ring band minus the crown, with the museum's clear mount retouched off.
Geometry (arbors, outlines) was measured from this specific photograph; another photo needs its own numbers."""
import json, math, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

src, out = sys.argv[1], sys.argv[2]
preview = sys.argv[sys.argv.index("--preview") + 1] if "--preview" in sys.argv else None
im = Image.open(src).convert("RGBA")
W, H = im.size

CENTER = (366.5, 676.0)      # main arbor
SUB = (366.0, 835.5)         # seconds arbor
CAP = 19.5                   # radius of the arbor cap; it becomes its own top layer so the hands turn under it
SUB_CAP = 7.5

def hand(start, tip, profile, tail=None, offset=lambda t: 0.0):
    """Outline along start→tip; profile(t) gives the half-width at fraction t, offset(t) shifts the centre line."""
    dx, dy = tip[0] - start[0], tip[1] - start[1]
    L = math.hypot(dx, dy); ux, uy = dx / L, dy / L; nx, ny = -uy, ux
    left, right = [], []
    steps = 60
    t0 = -(tail / L) if tail else 0
    for k in range(steps + 1):
        t = t0 + (1 - t0) * k / steps
        w = profile(t)
        px, py = start[0] + dx * t + nx * offset(t), start[1] + dy * t + ny * offset(t)
        left.append((px + nx * w, py + ny * w)); right.append((px - nx * w, py - ny * w))
    return left + right[::-1]

def minute_profile(t):
    # Measured: a ~3.5 px blade with a slight spade at two-thirds, tapering to a fine dark tip.
    if t < .56: return 1.75
    if t < .74: return 1.75 + 1.6 * math.sin((t - .56) / .18 * math.pi)
    return max(.35, 1.75 * (1 - (t - .74) / .27))

def minute_offset(t):
    return -1.5

def hour_profile(t):
    # Measured from the photo: a ~5 px stem, the leaf swelling from 66% to ~23 px wide at 79%, tapering to the tip.
    if t < .66: return 2.7
    if t < .73: return 2.7 + 8.8 * math.sin((t - .66) / .07 * math.pi / 2)
    if t < .81: return 11.5
    return max(0.4, 11.5 * max(0.0, 1 - (t - .81) / .155) ** 1.15)

def hour_offset(t):
    return 1.3 if t < .66 else 1.3 * max(0, 1 - (t - .66) / .1) - .6 * min(1, max(0, (t - .7) / .1))

def seconds_profile(t):
    if t < 0: return 4.6 if t < -.28 else 1.6
    return 1.7 - .9 * t

parts = {
    "minute": hand(CENTER, (91.0, 582.0), minute_profile, offset=minute_offset),
    "hour": hand(CENTER, (469.5, 831.0), hour_profile, offset=hour_offset),
    "seconds": hand(SUB, (466.0, 899.0), seconds_profile, tail=52),
}

# Mask everything the hands cover plus their soft shadows (cast down-right), except the arbor caps.
mask = Image.new("L", (W, H), 0)
d = ImageDraw.Draw(mask)
for name in ("minute", "hour"):
    poly = parts[name]
    d.polygon(poly, fill=255)
    d.polygon([(x + 3, y + 4) for x, y in poly], fill=255)
    d.polygon([(x + 5, y + 7) for x, y in poly], fill=255)
mask = mask.filter(ImageFilter.MaxFilter(13))
# The seconds hand is hair-thin with almost no shadow: a tight mask keeps the numerals it crosses.
thin = Image.new("L", (W, H), 0)
ImageDraw.Draw(thin).polygon(parts["seconds"], fill=255)
ImageDraw.Draw(thin).polygon([(x + 1, y + 2) for x, y in parts["seconds"]], fill=255)
thin = thin.filter(ImageFilter.MaxFilter(7))
mask = Image.fromarray(np.maximum(np.asarray(mask), np.asarray(thin)))

rgb = np.asarray(im.convert("RGB"), dtype=np.float64)
m = np.asarray(mask) > 0
fill = rgb.copy()

def bilinear(img, x, y):
    x0 = np.clip(np.floor(x).astype(int), 0, W - 2); y0 = np.clip(np.floor(y).astype(int), 0, H - 2)
    fx = (x - x0)[:, None]; fy = (y - y0)[:, None]
    return (img[y0, x0] * (1 - fx) * (1 - fy) + img[y0, x0 + 1] * fx * (1 - fy) + img[y0 + 1, x0] * (1 - fx) * fy + img[y0 + 1, x0 + 1] * fx * fy)

# Rotational symmetry: tick rings repeat every 6 degrees (and their long marks every 30), so pixels of a ring under a
# hand are copied from the same ring 30 degrees away, where nothing covers it.
ys, xs = np.nonzero(m)
done = np.zeros(len(xs), bool)
for (cx, cy), r0, r1 in ((CENTER, 264.0, 299.0), (SUB, 98.5, 128.0)):
    r = np.hypot(xs - cx, ys - cy)
    band = (r >= r0) & (r <= r1) & ~done
    if (cx, cy) == SUB:
        # Long five-second ticks (30 + 60k degrees) only repeat every 60 degrees: copy those from 60 degrees away.
        ang_t = (np.degrees(np.arctan2(xs - cx, -(ys - cy))) + 360) % 360
        on_spoke = np.abs(((ang_t - 30) % 60 + 30) % 60 - 30) < 6
        for delta in (60, -60, 120, -120, 180):
            sel = band & on_spoke
            if not sel.any(): break
            a_ = np.radians(delta)
            sx = cx + (xs - cx) * np.cos(a_) - (ys - cy) * np.sin(a_)
            sy = cy + (xs - cx) * np.sin(a_) + (ys - cy) * np.cos(a_)
            ok = sel & ~m[np.clip(sy.round().astype(int), 0, H - 1), np.clip(sx.round().astype(int), 0, W - 1)]
            fill[ys[ok], xs[ok]] = bilinear(rgb, sx[ok], sy[ok])
            done |= ok; band &= ~ok
    for delta in (30, -30, 60, -60, 90, -90, 120, -120, 150, -150):
        if not band.any(): break
        a = np.radians(delta)
        sx = cx + (xs - cx) * np.cos(a) - (ys - cy) * np.sin(a)
        sy = cy + (xs - cx) * np.sin(a) + (ys - cy) * np.cos(a)
        ok = band & ~m[np.clip(sy.round().astype(int), 0, H - 1), np.clip(sx.round().astype(int), 0, W - 1)]
        if (cx, cy) == SUB:
            # Near the inner ring line the subdial numerals (every 60 degrees) reach in: never sample next to one.
            src_angle = (np.degrees(np.arctan2(sx - cx, -(sy - cy))) + 360) % 360
            near_numeral = np.abs(((src_angle + 30) % 60) - 30) < 18
            ok &= ~((r < 106) & near_numeral)
        fill[ys[ok], xs[ok]] = bilinear(rgb, sx[ok], sy[ok])
        done |= ok; band &= ~ok
# The subdial's long five-second ticks reach inward past the ring; they sit every 60 degrees (30, 90, 150, ...),
# so pixels on those spokes are copied from another long tick a multiple of 60 degrees away.
cx, cy = SUB
r = np.hypot(xs - cx, ys - cy)
ang = (np.degrees(np.arctan2(xs - cx, -(ys - cy))) + 360) % 360
spoke = (r >= 55) & (r < 128) & (np.abs(((ang - 30) % 60 + 30) % 60 - 30) < 7) & ~done
for delta in (60, -60, 120, -120, 180):
    if not spoke.any(): break
    a = np.radians(delta)
    sx = cx + (xs - cx) * np.cos(a) - (ys - cy) * np.sin(a)
    sy = cy + (xs - cx) * np.sin(a) + (ys - cy) * np.cos(a)
    ok = spoke & ~m[np.clip(sy.round().astype(int), 0, H - 1), np.clip(sx.round().astype(int), 0, W - 1)]
    fill[ys[ok], xs[ok]] = bilinear(rgb, sx[ok], sy[ok])
    done |= ok; spoke &= ~ok

# The dark collet ring around the main cap is rotationally symmetric: restore it from 45..135 degrees away.
r_c = np.hypot(xs - CENTER[0], ys - CENTER[1])
coll = (r_c >= CAP - 1) & (r_c < CAP + 8) & ~done
for delta in (60, -60, 100, -100, 140, -140, 180):
    if not coll.any(): break
    a_ = np.radians(delta)
    sx = CENTER[0] + (xs - CENTER[0]) * np.cos(a_) - (ys - CENTER[1]) * np.sin(a_)
    sy = CENTER[1] + (xs - CENTER[0]) * np.sin(a_) + (ys - CENTER[1]) * np.cos(a_)
    ok = coll & ~m[np.clip(sy.round().astype(int), 0, H - 1), np.clip(sx.round().astype(int), 0, W - 1)]
    fill[ys[ok], xs[ok]] = bilinear(rgb, sx[ok], sy[ok])
    done |= ok; coll &= ~ok

# Everything else under the hands is plain enamel: normalized convolution of the surrounding enamel only (ink, hands
# and their shadows excluded), which keeps the dial's soft lighting gradient without smearing grey ink into the patch.
rest = np.zeros_like(m); rest[ys[~done], xs[~done]] = True
lum = rgb @ np.array([.299, .587, .114])
valid = (~m) & (lum > 175) & (np.asarray(im)[:, :, 3] > 250)
def gblur(arr, sigma):
    img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8)) if arr.ndim == 2 else None
    return np.asarray(img.filter(ImageFilter.GaussianBlur(sigma)), dtype=np.float64)
# Region-aware: the subdial is sunk and slightly darker than the main dial, so each region fills from itself only.
gx0, gy0 = np.meshgrid(np.arange(W), np.arange(H))
rsub = np.hypot(gx0 - SUB[0], gy0 - SUB[1])
regions = [rsub < 97, (rsub >= 97) & (rsub < 131), rsub >= 131]
def enamel(region_mask):
    # Clean enamel = within 22 levels of the region's own median brightness (ink, hands and shadows excluded).
    base = (~m) & region_mask & (np.asarray(im)[:, :, 3] > 250)
    med = np.median(lum[base])
    v = base & (lum > med - 22)
    # Local (sigma 7) where enough clean enamel is near, a wide (sigma 22) estimate deep inside large holes.
    out_ = np.zeros_like(rgb)
    w7 = gblur(v.astype(np.float64) * 255, 7) / 255
    w22 = gblur(v.astype(np.float64) * 255, 22) / 255
    k = np.clip((w7 - .03) / .12, 0, 1)[:, :, None]
    for c in range(3):
        s7 = gblur(rgb[:, :, c] * v, 7) / np.maximum(w7, 1e-3)
        s22 = gblur(rgb[:, :, c] * v, 22) / np.maximum(w22, 1e-3)
        out_[:, :, c] = s7
        out_[:, :, c] = s7 * k[:, :, 0] + s22 * (1 - k[:, :, 0])
    return out_
smooth = np.zeros_like(rgb)
for rm in regions:
    smooth[rm] = enamel(rm)[rm]
fill[rest] = smooth[rest]
rng = np.random.default_rng(4)
fill[rest] += rng.normal(0, 1.4, size=(rest.sum(), 3))
# ---- Rebuild the subdial numerals "10" (hidden under the hour hand) and "20" (crossed by the seconds hand) ----
# The dial's own "30" gives the "0" and the ink tone; the tens digit is set in Newsreader (OFL) at the measured size.
from PIL import ImageFont
FONT = sys.argv[sys.argv.index("--font") + 1]
lumw = np.array([.299, .587, .114])
ink_px = rgb[905:940, 345:385].reshape(-1, 3)
ink_rgb = ink_px[(ink_px @ lumw) < 110].mean(axis=0)
src30 = rgb[906:942, 342:388]                       # "30" upright at the bottom of the subdial
lum30 = src30 @ lumw
paper_l = np.median(lum30[lum30 > 150])
a30 = np.clip((paper_l - lum30) / (paper_l - 55), 0, 1)
split = 365 - 342                                   # column between "3" and "0"
zero = a30.copy(); zero[:, :split] = 0
three = a30[:, :split]
ys3 = np.nonzero(three.max(axis=1) > .5)[0]; xs3 = np.nonzero(three.max(axis=0) > .5)[0]
digit_h, digit_w = ys3[-1] - ys3[0] + 1, xs3[-1] - xs3[0] + 1
print("digit", digit_h, digit_w, "ink", ink_rgb.round(), file=sys.stderr)
for digit, angle, rot in (("1", 60, 60), ("2", 120, -60)):
    big = 8
    font = ImageFont.truetype(FONT, int(digit_h * big * 1.38))
    try: font.set_variation_by_axes([330, 36])
    except Exception as e: print("variation", e, file=sys.stderr)
    g = Image.new("L", (digit_h * big * 3, digit_h * big * 3), 0)
    ImageDraw.Draw(g).text((digit_h * big, 0), digit, font=font, fill=255)
    g = g.crop(g.getbbox())
    g = g.resize((max(1, round(g.width * digit_h / g.height)), digit_h), Image.LANCZOS)
    patch = zero.copy()
    gx_ = xs3[0] + (digit_w - g.width) // 2 + (2 if digit == "1" else 0)
    garr = np.asarray(g, dtype=np.float64) / 255
    sub_ = patch[ys3[0]:ys3[0] + g.height, gx_:gx_ + g.width]
    patch[ys3[0]:ys3[0] + g.height, gx_:gx_ + g.width] = np.maximum(sub_, garr[:sub_.shape[0], :sub_.shape[1]])
    pim = Image.fromarray((np.clip(patch, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(.35))
    pim = pim.rotate(-rot, resample=Image.BICUBIC, expand=True)
    cxn = SUB[0] + 89 * math.sin(math.radians(angle)); cyn = SUB[1] - 89 * math.cos(math.radians(angle))
    x0, y0 = round(cxn - pim.width / 2), round(cyn - pim.height / 2)
    clear = (np.hypot(gx0 - cxn, gy0 - cyn) < 21) & (rsub < 97)
    fill[clear] = smooth[clear] + np.random.default_rng(9).normal(0, 1.2, size=(int(clear.sum()), 3))
    pa = np.asarray(pim, dtype=np.float64)[:, :, None] / 255
    region_ = fill[y0:y0 + pim.height, x0:x0 + pim.width]
    fill[y0:y0 + pim.height, x0:x0 + pim.width] = region_ * (1 - pa) + ink_rgb * pa
plate = np.clip(fill, 0, 255).astype(np.uint8)
alpha = np.asarray(im)[:, :, 3]
Image.fromarray(np.dstack([plate, alpha]), "RGBA").save(f"{out}/pocket-watch-plate.webp", quality=90, method=6)

def path(poly):
    return "M" + "L".join(f"{x:.1f} {y:.1f}" for x, y in poly) + "Z"
print(json.dumps({"size": [W, H], "center": CENTER, "sub": SUB, "cap": CAP, "paths": {k: path(v) for k, v in parts.items()}}, indent=1))

if preview:
    pv = Image.new("RGBA", (W, H), (60, 60, 60, 255)); pv.alpha_composite(im)
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0)); od = ImageDraw.Draw(ov)
    for poly in parts.values(): od.polygon(poly, outline=(255, 0, 0, 255))
    pv.alpha_composite(ov)
    plate_img = Image.new("RGBA", (W, H), (60, 60, 60, 255)); plate_img.alpha_composite(Image.open(f"{out}/pocket-watch-plate.webp").convert("RGBA"))
    sheet = Image.new("RGB", (2 * 360, 420), "white")
    sheet.paste(pv.crop((60, 540, 520, 940)).convert("RGB").resize((360, 313)), (0, 0))
    sheet.paste(plate_img.crop((60, 540, 520, 940)).convert("RGB").resize((360, 313)), (360, 0))
    sheet = sheet.resize((1440, 840))
    sheet.save(preview)

# ---- Layers ---------------------------------------------------------------------------------------------------------------------
# Each hand: difference matte against the clean plate (in memory, before any lossy save) inside a generous polygon,
# colour un-premultiplied over the plate so anti-aliased edges and the hand's own soft shadow come along.
orig = np.asarray(im, dtype=np.float64)
plate_rgb = plate.astype(np.float64)
gx, gy = np.meshgrid(np.arange(W), np.arange(H))
layers = {}
for name, poly in parts.items():
    region = Image.new("L", (W, H), 0)
    ImageDraw.Draw(region).polygon(poly, fill=255)
    region = np.asarray(region.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(1)), dtype=np.float64) / 255
    diff = np.abs(orig[:, :, :3] - plate_rgb).max(axis=2)
    a = np.clip((diff - 8) / 60, 0, 1) * region
    col = np.clip(plate_rgb + (orig[:, :, :3] - plate_rgb) / np.maximum(a, 1e-3)[:, :, None], 0, 255)
    if name != "seconds":
        # Stems: clean anti-aliased bars from the measured outline, coloured by the photo's own pixels, with black
        # ink the stem crossed replaced by the stem's median gilt.
        stem_poly = hand(CENTER, (91.0, 582.0), minute_profile, offset=minute_offset) if name == "minute" else \
            hand(CENTER, (469.5, 831.0), lambda t: hour_profile(t) if t < .67 else 0, offset=hour_offset)
        bar = Image.new("L", (W, H), 0)
        ImageDraw.Draw(bar).polygon(stem_poly, fill=255)
        bar = np.asarray(bar.filter(ImageFilter.GaussianBlur(.55)), dtype=np.float64) / 255
        bar[np.hypot(gx - CENTER[0], gy - CENTER[1]) < CAP - .5] = 0
        lum_o = orig[:, :, :3] @ np.array([.299, .587, .114])
        warm = (orig[:, :, 0] - orig[:, :, 2]) > 16
        stem_px = (bar > .7) & warm
        gilt = np.median(orig[:, :, :3][stem_px], axis=0)
        stem_col = orig[:, :, :3].copy()
        ink = (bar > 0) & ((~warm & ((lum_o < 95) | (lum_o > 150))) | (np.hypot(gx - CENTER[0], gy - CENTER[1]) < CAP + 9))
        stem_col[ink] = gilt
        if name == "minute":
            a, col = bar, stem_col
        else:
            # Leaf: hybrid matte - opaque inside the eroded outline, difference matte only at the soft edge.
            leaf_poly = hand(CENTER, (469.5, 831.0), lambda t: hour_profile(t) if t >= .62 else 0, offset=hour_offset)
            leaf_in = Image.new("L", (W, H), 0)
            ImageDraw.Draw(leaf_in).polygon(leaf_poly, fill=255)
            leaf_region = np.asarray(leaf_in.filter(ImageFilter.MaxFilter(5)), dtype=np.float64) / 255
            leaf_in = np.asarray(leaf_in.filter(ImageFilter.MinFilter(5)).filter(ImageFilter.GaussianBlur(.6)), dtype=np.float64) / 255
            leaf_a = np.maximum(np.clip((diff - 8) / 60, 0, 1) * leaf_region * .85, leaf_in)
            leaf_col = orig[:, :, :3]
            a = np.maximum(bar, leaf_a)
            w_bar = (bar >= leaf_a)[:, :, None]
            col = np.where(w_bar, stem_col, leaf_col)
    if name == "seconds":
        a[np.hypot(gx - SUB[0], gy - SUB[1]) < SUB_CAP - .5] = 0
    img = Image.fromarray(np.dstack([col, a * 255]).astype(np.uint8), "RGBA")
    box = img.getbbox()
    img.crop(box).save(f"{out}/pocket-watch-{name}.webp", lossless=True, method=6)
    layers[name] = {"box": box}

# Arbor caps: the original pixels inside each cap, soft-edged, drawn above the hands.
for name, (cx, cy), rad in (("cap", CENTER, CAP), ("subcap", SUB, SUB_CAP)):
    rr = np.hypot(gx - cx, gy - cy)
    a = np.clip((rad - rr) / 1.5, 0, 1)
    img = Image.fromarray(np.dstack([orig[:, :, :3], a * 255]).astype(np.uint8), "RGBA")
    box = img.getbbox()
    img.crop(box).save(f"{out}/pocket-watch-{name}.webp", lossless=True, method=6)
    layers[name] = {"box": box}

# Bow (ring): the ring band above the pendant, minus the crown in front of it; the clear museum mount is retouched off.
outer = ((gx - 371.5) / 151) ** 2 + ((gy - 117) / 115) ** 2 <= 1
inner = ((gx - 371.5) / 118) ** 2 + ((gy - 125) / 74) ** 2 < 1
crown = (gx > 306) & (gx < 436) & (gy > 140)
bow = outer & ~inner & ~crown & (gy < 236) & (orig[:, :, 3] > 8)
bow_rgba = orig.copy()
xl, xr = 352, 396
for y in range(0, 72):
    if orig[y, xl, 3] > 200 and orig[y, xr, 3] > 200:
        for x in range(xl + 1, xr):
            t = (x - xl) / (xr - xl)
            bow_rgba[y, x, :3] = orig[y, xl, :3] * (1 - t) + orig[y, xr, :3] * t
            bow_rgba[y, x, 3] = 255
            bow[y, x] = True
bow_img = Image.fromarray(np.dstack([bow_rgba[:, :, :3], np.where(bow, bow_rgba[:, :, 3], 0)]).astype(np.uint8), "RGBA")
bow_box = bow_img.getbbox()
bow_img.crop(bow_box).save(f"{out}/pocket-watch-bow.webp", quality=92, method=6)
layers["bow"] = {"box": bow_box}
final_alpha = alpha.copy()
final_alpha[bow] = 0
final_alpha[(gx > xl - 4) & (gx < xr + 4) & (gy < 72) & ~bow] = 0
Image.fromarray(np.dstack([plate, final_alpha]), "RGBA").save(f"{out}/pocket-watch-plate.webp", quality=90, method=6)
print(json.dumps(layers))
