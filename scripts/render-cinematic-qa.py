#!/usr/bin/env python3
"""Render a playable motion-direction QA reel without a browser or network service.

This is an offline 2.5D motion proof using the same original scene plates, timings,
content and visual beats as cinematic-templates-react.tsx. It is NOT a pixel-faithful
capture of the React component; use `npm run video:export` for that when Chromium is
available. Requires Pillow and FFmpeg. No reference MP4s are embedded or copied.
"""

from __future__ import annotations

import argparse
import math
from pathlib import Path
import subprocess
import sys

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "src/video/assets/cinematic-templates"
FPS = 30
W, H = 1280, 720
SCENES = [
    ("nature-logo", 300),
    ("liquid-glass", 300),
    ("history-timeline", 420),
    ("epic-book", 360),
    ("fly-around-earth", 330),
    ("walk-on-earth", 360),
]
SANS = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
SANS_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
SERIF = "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf"
SERIF_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"
FONTS: dict[tuple[str, int], ImageFont.FreeTypeFont] = {}


def font(size: int, serif: bool = False, bold: bool = False):
    path = (SERIF_BOLD if bold else SERIF) if serif else (SANS_BOLD if bold else SANS)
    key = (path, size)
    if key not in FONTS:
        FONTS[key] = ImageFont.truetype(path, size)
    return FONTS[key]


def clamp(v: float):
    return max(0.0, min(1.0, v))


def span(f: int, begin: int, end: int):
    t = clamp((f - begin) / max(1, end - begin))
    return t * t * (3 - 2 * t)


def text(draw: ImageDraw.ImageDraw, xy, msg: str, size: int, fill="white", *, anchor="mm", serif=False, bold=False, stroke=0):
    draw.text(xy, msg, font=font(size, serif, bold), fill=fill, anchor=anchor,
              stroke_width=stroke, stroke_fill=(0, 0, 0, 170) if stroke else None)


def cover(img: Image.Image, zoom: float, dx=0.0, dy=0.0):
    # A small smooth dolly, with subpixel interpolation at export resolution.
    scale = max(W / img.width, H / img.height) * zoom
    sw, sh = math.ceil(img.width * scale), math.ceil(img.height * scale)
    scaled = img.resize((sw, sh), Image.Resampling.BICUBIC)
    left = (sw - W) / 2 + dx * (sw - W) * .5
    top = (sh - H) / 2 + dy * (sh - H) * .5
    return scaled.crop((round(left), round(top), round(left) + W, round(top) + H)).convert("RGB")


def shade(im: Image.Image, strength: int = 70, color=(8, 10, 16)):
    im.paste(color, (0, 0, W, H), Image.new("L", (W, H), strength))


def vignette(im: Image.Image, strength=.4):
    # Precomputed radial mask; alpha compositing keeps color in the photographic image.
    if strength <= 0:
        return
    mask = Image.new("L", (W, H), 0)
    pix = mask.load()
    for y in range(0, H, 4):
        for x in range(0, W, 4):
            d = math.sqrt(((x - W / 2) / (W * .61)) ** 2 + ((y - H / 2) / (H * .63)) ** 2)
            a = int(clamp((d - .3) * 1.25) * strength * 255)
            ImageDraw.Draw(mask).rectangle((x, y, x + 3, y + 3), fill=a)
    mask = mask.filter(ImageFilter.GaussianBlur(16))
    im.paste((0, 0, 0), (0, 0, W, H), mask)


def matte(im: Image.Image, opacity: float, rgb=(0, 0, 0)):
    a = int(255 * clamp(opacity))
    if a:
        im.paste(rgb, (0, 0, W, H), Image.new("L", (W, H), a))


def particles(draw, f: int, n: int, fill, scale=1.0):
    for i in range(n):
        x = ((i * 241 + 113) % W) + math.sin(f * .011 + i) * 14
        y = (((i * 151 + 43) % 760) + 760 - f * (.11 + (i % 5) * .045)) % 760 - 20
        r = (i % 4 + 1) * .95 * scale
        light = clamp(.2 + .65 * (.5 + .5 * math.sin(f * .047 + i * 1.6)))
        color = tuple(int(v * light) for v in fill)
        draw.ellipse((x - r, y - r, x + r, y + r), fill=color)


PLATES = {p.stem: Image.open(p).convert("RGBA") for p in ART.glob("*.webp")}
VIGNETTE = Image.new("L", (W, H), 0)
_v = ImageDraw.Draw(VIGNETTE)
for _y in range(0, H, 8):
    for _x in range(0, W, 8):
        _d = math.sqrt(((_x - W / 2) / (W * .63)) ** 2 + ((_y - H / 2) / (H * .65)) ** 2)
        _a = int(clamp((_d - .33) * 1.3) * 180)
        _v.rectangle((_x, _y, _x + 7, _y + 7), fill=_a)
VIGNETTE = VIGNETTE.filter(ImageFilter.GaussianBlur(19))


def base(name: str, zoom: float, x=0.0, y=0.0, dim=0):
    im = cover(PLATES[name], zoom, x, y)
    if dim:
        shade(im, dim)
    return im


def fade_ends(im: Image.Image, f: int, frames: int, fade_in=9, fade_out=20, color=(4, 6, 11)):
    fade = max(1 - span(f, 0, fade_in), span(f, frames - fade_out, frames - 1))
    matte(im, fade, color)


def nature(f: int, duration: int):
    approach = span(f, 0, 176)
    im = base("nature", 1.32 - .20 * approach, -.2 + approach * .34, .12 - .26 * approach, 38)
    im.paste((0, 9, 4), (0, 0, W, H), VIGNETTE)
    draw = ImageDraw.Draw(im)
    particles(draw, f, 37, (255, 211, 122))
    reveal = span(f, 108, 202) * (1 - span(f, 260, 288))
    if reveal > 0:
        layer = Image.new("RGBA", (W, H))
        d = ImageDraw.Draw(layer)
        d.ellipse((615, 227, 665, 277), fill=(240, 224, 146, int(200 * reveal)))
        text(d, (W / 2, 356), "VERDANT", 112, fill=(250, 250, 239, int(255 * reveal)), bold=True, stroke=2)
        text(d, (W / 2, 425), "A  W O R L D  W O R T H  E X P L O R I N G", 20,
             fill=(255, 250, 233, int(220 * reveal)))
        im = Image.alpha_composite(im.convert("RGBA"), layer).convert("RGB")
    fade_ends(im, f, duration, 12, 32, (2, 17, 10))
    return im


CHAPTERS = [
    ("1918", "A NEW HORIZON", "THE AGE OF FLIGHT"),
    ("1925", "CITIES IN MOTION", "STREETS TRANSFORM"),
    ("1944", "THE MACHINE AGE", "WORK & INDUSTRY"),
    ("1957", "A SIGNAL FORWARD", "COMPUTING BEGINS"),
    ("1964", "NEW MONUMENTS", "FORM & FUTURE"),
    ("1972", "BEYOND THE EARTH", "EXPLORATION"),
]


def history(f: int, duration: int):
    index = min(5, f // 70)
    local = f - index * 70
    photo = PLATES[f"history-{index}"].convert("RGB")
    photo = ImageEnhance.Contrast(ImageOps.grayscale(photo)).enhance(1.45).convert("RGB")
    im = cover(photo, 1.23 + local * .0016, (index % 2 * 2 - 1) * local * .0025, -local * .001)
    shade(im, 72, (4, 5, 10))
    im.paste((2, 3, 6), (0, 0, W, H), VIGNETTE)
    draw = ImageDraw.Draw(im)
    text(draw, (75, 58), "ARCHIVE  /  FIELD NOTES", 16, anchor="la")
    text(draw, (75, 84), "VOL. 01  —  THE MODERN WORLD", 15, anchor="la")
    draw.line((75, 107, 424, 107), fill=(195, 193, 190), width=1)
    text(draw, (1204, 63), f"CHAPTER {index + 1:02d} / 06", 15, anchor="ra")
    visible = span(local, 0, 14) * (1 - span(local, 61, 70))
    if visible:
        layer = Image.new("RGBA", (W, H))
        d = ImageDraw.Draw(layer)
        year, heading, subtitle = CHAPTERS[index]
        bbox = d.textbbox((0, 0), heading, font=font(53, bold=True))
        bx, by = 75, 465
        d.rectangle((bx, by, bx + bbox[2] + 33, by + 75), fill=(245, 62, 55, round(245 * visible)))
        text(d, (bx + 15, by + 34), heading, 53, anchor="lm", bold=True,
             fill=(255, 255, 255, round(255 * visible)))
        text(d, (bx, 565), subtitle, 18, anchor="la", fill=(255, 255, 255, round(235 * visible)))
        im = Image.alpha_composite(im.convert("RGBA"), layer).convert("RGB")
    draw = ImageDraw.Draw(im)
    text(draw, (1185, 594), CHAPTERS[index][0], 55, bold=True, anchor="rd", stroke=1)
    draw.rectangle((75, 639, 1205, 643), fill="#c8cacc")
    draw.rectangle((75, 639, round(75 + 1130 * (index + local / 70) / 6), 643), fill="#ee483c")
    for i in range(6):
        x = round(75 + 1130 * i / 5)
        draw.ellipse((x - 6, 635, x + 6, 647), fill="#ef483c" if i <= index else "#c5c5c5", outline="#1a1b20", width=2)
    # Hard archival cuts are intentional; each chapter has its own photo and year.
    fade_ends(im, f, duration, 10, 16)
    return im


def book(f: int, duration: int):
    arrive = span(f, 0, 60)
    im = base("book", 1.12 - .07 * arrive, -.06 + f * .00023, -.04, 23)
    im.paste((15, 8, 2), (0, 0, W, H), VIGNETTE.point(lambda v: round(v * .65)))
    d = ImageDraw.Draw(im)
    flip = span(f, 216, 287)
    ink = span(f, 70, 150) * (1 - flip)
    if ink > 0:
        engraving = PLATES["history-0"].convert("RGB")
        engraving = ImageOps.colorize(ImageOps.grayscale(engraving), "#573620", "#e7ca8c").resize((385, 300))
        mask = Image.new("L", (385, 300))
        md = ImageDraw.Draw(mask)
        md.ellipse((0, -30, 380, 340), fill=round(150 * ink))
        mask = mask.filter(ImageFilter.GaussianBlur(25))
        im.paste(engraving, (626, 183), mask)
    title_alpha = span(f, 34, 105)
    if title_alpha > 0:
        layer = Image.new("RGBA", (W, H))
        ld = ImageDraw.Draw(layer)
        text(ld, (364, 341), "THE CHRONICLES", 39, fill=(88, 45, 23, round(246 * title_alpha)), serif=True, bold=True)
        text(ld, (364, 396), "Stories preserved in time", 21, fill=(103, 61, 36, round(220 * title_alpha)), serif=True)
        im = Image.alpha_composite(im.convert("RGBA"), layer).convert("RGB")
    if 0 < flip < 1:
        # A textured page bends around the central book hinge; the leading edge
        # crosses the gutter and changes from the recto to the verso surface.
        a = math.sin(flip * math.pi)
        leading = 626 + 402 * math.cos(flip * math.pi)
        top = 157 + 22 * a
        bottom = 555 - 16 * a
        quad = [(626, 157), (leading, top), (leading, bottom), (626, 552)]
        page_mask = Image.new("L", (W, H))
        ImageDraw.Draw(page_mask).polygon(quad, fill=245)
        parchment = im.copy()
        # Tint the page while retaining actual paper fibers and age marks.
        tint = Image.new("RGB", (W, H), (217, 179, 121) if flip < .5 else (230, 200, 150))
        parchment = Image.blend(parchment, tint, .63)
        im.paste(parchment, (0, 0), page_mask)
        d = ImageDraw.Draw(im, "RGBA")
        d.line([(leading, top), (leading, bottom)], fill=(255, 241, 201, round(110 + 120 * a)), width=6)
        d.line([(626, 157), (626, 552)], fill=(75, 42, 24, 180), width=4)
        d.line([(626, 157), (leading, top)], fill=(93, 52, 29, 140), width=2)
        d.line([(626, 552), (leading, bottom)], fill=(83, 47, 26, 160), width=4)
    after = span(f, 281, 316)
    if after > 0:
        engraving = PLATES["history-5"].convert("RGB")
        engraving = ImageOps.colorize(ImageOps.grayscale(engraving), "#624022", "#e7c58e").resize((385, 300))
        mask = Image.new("L", (385, 300))
        ImageDraw.Draw(mask).ellipse((0, -30, 380, 340), fill=round(155 * after))
        im.paste(engraving, (626, 183), mask.filter(ImageFilter.GaussianBlur(24)))
    particles(ImageDraw.Draw(im), f, 25, (181, 126, 68))
    fade_ends(im, f, duration, 8, 16, (19, 8, 4))
    return im


def glass(f: int, duration: int):
    im = base("glass", 1.13, math.sin(f * .008) * .2, math.cos(f * .011) * .18)
    rise = span(f, 16, 88)
    show = span(f, 66, 150)
    morph = span(f, 200, 272)
    d = ImageDraw.Draw(im)
    text(d, (W // 2, 101), "L I Q U I D   G L A S S", 29, fill="#415267", bold=True)
    if rise:
        x, y = 290, round(180 + (1 - rise) * 110)
        w, h = 700, 400
        bg = im.crop((x, max(0, y), x + w, min(H, y + h))).filter(ImageFilter.GaussianBlur(25))
        glass = Image.new("RGBA", (w, h), (244, 250, 255, 0))
        gd = ImageDraw.Draw(glass)
        gd.rounded_rectangle((3, 3, w - 3, h - 3), 43,
                             fill=(254, 254, 255, round(72 * rise)),
                             outline=(255, 255, 255, round(235 * rise)), width=4)
        # Soft frosted contents are revealed under the translucent glass surface.
        if bg.size == (w, h):
            bg_rgba = Image.blend(bg.convert("RGBA"), Image.new("RGBA", (w, h), (244, 248, 255, 255)), .43)
            bg_rgba.putalpha(Image.new("L", (w, h), round(165 * rise)))
            im.paste(bg_rgba, (x, y), bg_rgba)
        if morph < 1:
            gd.text((60, 48), "An illustrative week", fill=(54, 74, 92, round(255 * show * (1 - morph))), font=font(21))
            bars = [.42, .67, .85, .58, .77, .94, .72]
            for i, val in enumerate(bars):
                height = round(val * 215 * span(f, 86 + 10 * i, 156 + 6 * i))
                bx = 70 + i * 83
                gd.rounded_rectangle((bx, 321 - height, bx + 51, 321), 14,
                                     fill=(254, 254, 255, round(210 * show * (1 - morph))))
                gd.text((bx + 23, 339), ["M", "T", "W", "T", "F", "S", "S"][i],
                        anchor="mm", font=font(17), fill=(96, 115, 132, round(230 * show * (1 - morph))))
        if morph:
            text(gd, (w / 2, 190), "Clear by design.", 54, fill=(51, 72, 90, round(245 * morph)), bold=True)
            text(gd, (w / 2, 250), "Light  ·  depth  ·  movement", 22,
                 fill=(70, 93, 111, round(245 * morph)))
        im = Image.alpha_composite(im.convert("RGBA"),
                                   Image.new("RGBA", (W, H), (0, 0, 0, 0))).convert("RGB")
        im.paste(glass, (x, y), glass)
        ImageDraw.Draw(im).arc((x + 20, y + 11, x + w - 18, y + h - 14), 195, 260, fill="#f8ffff", width=3)
    fade_ends(im, f, duration, 11, 18, (235, 213, 206))
    return im


def plane(f: int):
    progress = span(f, 5, 238)
    x = -180 + progress * 1510
    y = 220 - 127 * math.sin(math.pi * progress)
    size = .68 + .35 * math.sin(math.pi * progress)
    plane_img = Image.new("RGBA", (270, 132))
    d = ImageDraw.Draw(plane_img)
    d.polygon([(18, 76), (112, 51), (220, 69), (257, 87), (207, 100), (52, 101)],
              fill="#daa045", outline="#885a24", width=3)
    d.polygon([(75, 46), (219, 41), (250, 56), (90, 63)], fill="#f4d37e", outline="#8d592d")
    d.polygon([(66, 91), (215, 84), (239, 103), (77, 108)], fill="#d88836", outline="#8d592d")
    d.line((131, 49, 139, 98), fill="#674a2a", width=6)
    d.line((203, 46, 209, 93), fill="#674a2a", width=6)
    d.ellipse((147, 61, 169, 83), fill="#35536d", outline="#f5d988", width=3)
    d.line((257, 60, 264, 120), fill="#554738", width=4)
    d.line((248, 86, 269, 90), fill="#554738", width=4)
    d.ellipse((88, 110, 108, 130), fill="#41372b")
    d.ellipse((195, 107, 215, 127), fill="#41372b")
    plane_img = plane_img.resize((int(270 * size), int(132 * size)), Image.Resampling.LANCZOS)
    return plane_img, int(x), int(y)


def earth(f: int, duration: int):
    approach = span(f, 0, 145)
    im = base("earth", 1.24 - .12 * approach, -.12 + .25 * approach, .0)
    overlay, x, y = plane(f)
    if -overlay.width < x < W and -overlay.height < y < H:
        im.paste(overlay, (x, y), overlay)
    banner = span(f, 214, 275)
    if banner:
        layer = Image.new("RGBA", (W, H))
        d = ImageDraw.Draw(layer)
        y0 = round(222 - (1 - banner) * 100)
        d.polygon([(226, y0 + 12), (360, y0 + 4), (640, y0 + 13), (949, y0 + 3),
                   (1050, y0 + 11), (1043, y0 + 303), (720, y0 + 312),
                   (445, y0 + 305), (230, y0 + 309)], fill=(249, 248, 235, round(252 * banner)))
        text(d, (W / 2, y0 + 145), "WANDER", 108, fill=(22, 129, 132, round(255 * banner)), bold=True)
        text(d, (W / 2, y0 + 228), "Time to discover", 43, fill=(170, 107, 38, round(248 * banner)), serif=True)
        im = Image.alpha_composite(im.convert("RGBA"), layer).convert("RGB")
    fade_ends(im, f, duration, 8, 20, (166, 230, 250))
    return im


def walk(f: int, duration: int):
    motion = span(f, 0, 280)
    im = base("walk", 1.20 - .1 * motion, -.15 + motion * .23, .03 - .16 * motion, 28)
    im.paste((14, 10, 25), (0, 0, W, H), VIGNETTE.point(lambda v: round(v * .42)))
    d = ImageDraw.Draw(im)
    stride = math.sin(f * .38)
    p = span(f, 25, 310)
    x = 540 + 295 * p
    y = 243 - 26 * math.sin(math.pi * p) - 3 * abs(stride)
    explorer = PLATES["walker"].copy()
    explorer.thumbnail((92, 160), Image.Resampling.LANCZOS)
    explorer = explorer.rotate(-((p - .5) * 4 + stride * 1.3), resample=Image.Resampling.BICUBIC, expand=True)
    im.paste(explorer, (round(x), round(y)), explorer)
    reveal = span(f, 38, 135)
    if reveal:
        layer = Image.new("RGBA", (W, H))
        ld = ImageDraw.Draw(layer)
        text(ld, (82, 130), "A WORLD IN MOTION", 59, anchor="la", serif=True, bold=True,
             fill=(255, 252, 239, round(254 * reveal)), stroke=1)
        text(ld, (85, 194), "EVERY STEP IS A STORY", 21, anchor="la",
             fill=(255, 240, 217, round(235 * reveal)))
        im = Image.alpha_composite(im.convert("RGBA"), layer).convert("RGB")
    particles(ImageDraw.Draw(im), f, 12, (242, 210, 166))
    fade_ends(im, f, duration, 8, 22, (20, 18, 31))
    return im


RENDERERS = {
    "nature-logo": nature,
    "liquid-glass": glass,
    "history-timeline": history,
    "epic-book": book,
    "fly-around-earth": earth,
    "walk-on-earth": walk,
}


def render_stills(out: Path):
    out.mkdir(parents=True, exist_ok=True)
    for name, length in SCENES:
        for frac in (.2, .55, .8):
            frame = round(length * frac)
            path = out / f"{name}-{frame:03d}.jpg"
            RENDERERS[name](frame, length).save(path, quality=88)
            print(path)


def render_video(out: Path, selected: str, crf: int):
    out.parent.mkdir(parents=True, exist_ok=True)
    scenes = [item for item in SCENES if selected in ("all", item[0])]
    nframes = sum(length for _, length in scenes)
    command = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-f", "rawvideo",
               "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
               "-c:v", "libx264", "-preset", "veryfast", "-crf", str(crf), "-pix_fmt", "yuv420p",
               "-movflags", "+faststart", str(out)]
    print(f"Rendering {len(scenes)} scene(s), {nframes} frames / {nframes / FPS:.1f}s -> {out}", flush=True)
    process = subprocess.Popen(command, stdin=subprocess.PIPE)
    try:
        done = 0
        for name, length in scenes:
            for f in range(length):
                frame = RENDERERS[name](f, length)
                process.stdin.write(frame.tobytes())
                done += 1
                if done % 150 == 0:
                    print(f"  {done}/{nframes} frames ({done / nframes:.0%})", flush=True)
        process.stdin.close()
        if process.wait() != 0:
            raise RuntimeError("FFmpeg failed to encode the QA video")
    except Exception:
        process.kill()
        process.wait()
        raise
    print(f"Created {out} ({out.stat().st_size / 1024 / 1024:.1f} MiB)", flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=ROOT / "dist/qa/cinematic-motion-reel.mp4")
    parser.add_argument("--scene", choices=["all", *[name for name, _ in SCENES]], default="all")
    parser.add_argument("--stills", action="store_true", help="write 3 representative frames per scene for visual QA")
    parser.add_argument("--crf", type=int, default=19)
    opts = parser.parse_args()
    if opts.stills:
        render_stills(ROOT / "dist/qa/stills")
    else:
        render_video(opts.output, opts.scene, opts.crf)
