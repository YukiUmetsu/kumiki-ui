#!/usr/bin/env python3
"""Compare a drawing with one reference picture, part by part. Method: docs/reference-match.md

  python3 -I scripts/reference-match.py zoom    <picture> --box 400,300,900,700 --out z.png     # read the anchors, in pixels
  python3 -I scripts/reference-match.py side    pair.json --box=-1.3,-2,2,1.6 --grid 0.1 --out side.png
  python3 -I scripts/reference-match.py overlap pair.json --box=-1.3,-2.6,2.3,-0.4 --out over.png
  python3 -I scripts/reference-match.py values  pair.json --box crown=0.1,-2,1.1,-1.6 --box side=0.1,-1.5,1.3,-1
  python3 -I scripts/reference-match.py trace   pair.json --path=-0.25,1.45:0.1,1.49:0.5,1.31:0.85,1.06 --step 0.05
  python3 -I scripts/reference-match.py swap    pair.json --part eyes=-0.8,-0.2:0.8,-0.2:0.8,0.2:-0.8,0.2 --out swap.png

pair.json: {"reference": {"image": "ref.png", "a": [x, y], "b": [x, y]}, "drawing": {"image": "ours.png", "a": …, "b": …}}

`a` and `b` are the same two points in both pictures, in pixels, left one first. On a face they are the middles of the irises.
Every other number is in the levelled frame: the origin is the middle between a and b, their distance is 1, a to b is level,
and y points down. The measuring commands first reduce both pictures to the coarser one's resolution, so a sharp drawing
is not called busy because the reference is a small file. Needs Pillow and numpy.

Every picture this writes holds a part of the reference, so it does not write inside a Git work tree.
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

SIDES = ("reference", "drawing")


def opened(path: Path) -> Image.Image:
    rgba = Image.open(path).convert("RGBA")
    return Image.alpha_composite(Image.new("RGBA", rgba.size, "white"), rgba).convert("RGB")


class Pair:
    def __init__(self, file: str):
        spec = json.loads(Path(file).read_text())
        self.image, self.anchors, self.unit = {}, {}, {}
        for name in SIDES:
            side = spec[name]
            self.image[name] = opened(Path(file).parent / side["image"])
            self.anchors[name] = [tuple(map(float, side[k])) for k in ("a", "b")]
            self.unit[name] = math.dist(*self.anchors[name])
            if self.unit[name] < 8:
                sys.exit(f"{name}: a and b are {self.unit[name]:.1f} px apart. Read them again on a zoom.")
        self.common = min(self.unit.values())

    def level(self, name: str, box, scale: float, fair: bool) -> Image.Image:
        """The picture in the levelled frame, `scale` pixels per unit. `fair` holds it to the coarser picture's resolution."""
        im, unit, (a, b) = self.image[name], self.unit[name], self.anchors[name]
        shrink = min(1, (self.common if fair else scale) / unit)
        if shrink < 1:
            small = (max(1, round(im.width * shrink)), max(1, round(im.height * shrink)))
            sx, sy = small[0] / im.width, small[1] / im.height
            im = im.resize(small, Image.LANCZOS)
            a, b = ((p[0] * sx, p[1] * sy) for p in (a, b))
        dx, dy = (b[0] - a[0]) / scale, (b[1] - a[1]) / scale
        ox, oy, mx, my = box[0] * scale, box[1] * scale, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
        size = round((box[2] - box[0]) * scale), round((box[3] - box[1]) * scale)
        matrix = (dx, -dy, mx + dx * ox - dy * oy, dy, dx, my + dy * ox + dx * oy)
        return im.transform(size, Image.AFFINE, matrix, Image.BICUBIC, fillcolor="white")

    def light(self, name: str, box, scale: float) -> np.ndarray:
        return np.asarray(self.level(name, box, scale, True)).astype(float) @ [0.299, 0.587, 0.114]


def points(text: str) -> list[tuple[float, float]]:
    return [tuple(map(float, p.split(","))) for p in text.split(":")]


def box_of(text: str) -> tuple[float, ...]:
    box = tuple(map(float, text.split(",")))
    if len(box) != 4 or box[2] <= box[0] or box[3] <= box[1]:
        raise argparse.ArgumentTypeError("a box is x0,y0,x1,y1 with x1 > x0 and y1 > y0")
    return box


def named(text: str, read) -> tuple[str, object]:
    name, _, rest = text.partition("=")
    if not rest:
        raise argparse.ArgumentTypeError("write it as name=numbers")
    return name, read(rest)


def ruled(im: Image.Image, box, scale: float, step: float) -> Image.Image:
    pen = ImageDraw.Draw(im, "RGBA")
    for axis, low, high in ((0, box[0], box[2]), (1, box[1], box[3])):
        for k in range(math.ceil(low / step), math.floor(high / step) + 1):
            at, major = (k * step - low) * scale, k % 5 == 0
            pen.line([(at, 0), (at, im.height)] if axis == 0 else [(0, at), (im.width, at)], fill=(0, 90, 255, 150 if major else 60))
            if major or step * scale >= 34:
                pen.text((at + 2, 2) if axis == 0 else (2, at + 1), f"{k * step:g}", fill=(0, 60, 255, 255))
    return im


def save(im: Image.Image, out: str) -> None:
    file = Path(out).resolve()
    if any((folder / ".git").exists() for folder in file.parents):
        sys.exit(f"{file} is inside a Git work tree. The picture holds a part of the reference: write it to a scratch folder.")
    im.save(file)
    print(f"{file}  {im.width} x {im.height}")


def row(pictures) -> Image.Image:
    sheet = Image.new("RGB", (sum(p.width for p in pictures) + 10 * (len(pictures) - 1), max(p.height for p in pictures)), "white")
    x = 0
    for p in pictures:
        sheet.paste(p, (x, 0))
        x += p.width + 10
    return sheet


def zoom(args) -> None:
    im, box = opened(Path(args.picture)), args.box
    scale = args.width / (box[2] - box[0])
    part = im.resize((args.width, round((box[3] - box[1]) * scale)), Image.LANCZOS, box=box)
    save(ruled(part, box, scale, args.grid or 10 ** math.floor(math.log10((box[2] - box[0]) / 4))), args.out)


def side(args) -> None:
    pair = Pair(args.pair)
    parts = [pair.level(name, args.box, args.scale, False) for name in SIDES]
    if args.grid:
        for part in parts:
            pen = ImageDraw.Draw(ruled(part, args.box, args.scale, args.grid))
            for x in (-0.5, 0.5):  # the anchors
                at, up = (x - args.box[0]) * args.scale, -args.box[1] * args.scale
                pen.line([(at - 9, up), (at + 9, up)], fill="red")
                pen.line([(at, up - 9), (at, up + 9)], fill="red")
    for name in SIDES:
        (ax, ay), (bx, by) = pair.anchors[name]
        print(f"{name}: {pair.unit[name]:.1f} px per unit, turned {math.degrees(math.atan2(by - ay, bx - ax)):+.1f} degrees")
    save(row(parts), args.out)


def overlap(args) -> None:
    pair = Pair(args.pair)
    ref, ours = (pair.light(name, args.box, args.scale) < args.dark for name in SIDES)
    both, either = (ref & ours).sum(), (ref | ours).sum()
    if not both:
        sys.exit("No dark area in common. Check the anchors and the box.")
    print(f"overlap {both / either:.3f} (shared / joint)   reference covered {both / ref.sum():.3f}   drawing inside reference {both / ours.sum():.3f}")
    if args.out:
        sheet = np.full((*ref.shape, 3), 255, np.uint8)
        for mask, colour in ((ref & ours, (70, 70, 70)), (ref & ~ours, (30, 110, 230)), (ours & ~ref, (235, 120, 30))):
            sheet[mask] = colour
        print("grey: both   blue: only in the reference   orange: only in the drawing")
        save(ruled(Image.fromarray(sheet), args.box, args.scale, 0.1), args.out)


def values(args) -> None:
    pair = Pair(args.pair)
    print(f"dark: luminance under {args.dark:g} of 255, at {pair.common:.0f} px per unit\n{'':14}{'':11}  mean  spread  covered")
    for name, box in args.box:
        for who in SIDES:
            light = pair.light(who, box, pair.common)
            dark = light[light < args.dark]
            print(f"{name:14}{who:11}" + (f"{dark.mean():6.1f}{dark.std():8.1f}{dark.size / light.size:9.3f}" if dark.size else "  no dark pixels"))


def found(light: np.ndarray, guess: float, reach: float, low: float, scale: float):
    """Where the darkest line near `guess` lies along one scan, its thickness at half its darkness, and its darkness."""
    start = max(0, round((guess - reach - low) * scale))
    scan = light[start:start + round(2 * reach * scale)]
    if scan.size < 4:
        return None
    depth = np.clip(np.percentile(scan, 85) - scan, 0, None)
    peak = int(depth.argmax())
    if depth[peak] < 8:
        return None
    first = last = peak
    while first and depth[first] > depth[peak] / 2:
        first -= 1
    while last < len(depth) - 1 and depth[last] > depth[peak] / 2:
        last += 1
    return (start + (first + last) / 2) / scale + low, (last - first) / scale, depth[peak]


def trace(args) -> None:
    pair, scale = Pair(args.pair), 1000
    along = 0 if args.by == "x" else 1
    path = {"reference": args.path, "drawing": args.path_drawing or args.path}
    every = [p for side_path in path.values() for p in side_path]
    reach = args.reach + 0.05
    box = (min(p[0] for p in every) - reach, min(p[1] for p in every) - reach, max(p[0] for p in every) + reach, max(p[1] for p in every) + reach)
    light = {name: pair.light(name, box, scale) for name in SIDES}
    start, stop = (pick(path["reference"][0][along], path["reference"][-1][along]) for pick in (min, max))
    print(f"gap: drawing minus reference, plus is {'down' if along == 0 else 'to the right'}")
    print(f"{args.by:>6}   reference: at  thick  dark    drawing: at  thick  dark      gap")
    gaps = []
    for at in np.arange(start, stop + 1e-6, args.step):
        hits = []
        for name in SIDES:
            p = sorted(path[name], key=lambda q: q[along])
            guess = np.interp(at, [q[along] for q in p], [q[1 - along] for q in p])
            k = round((at - box[along]) * scale)
            band = light[name][:, k - 3:k + 4].mean(1) if along == 0 else light[name][k - 3:k + 4].mean(0)
            hits.append(found(band, guess, args.reach, box[1 - along], scale))
        cells = [f"{h[0]:13.3f}{h[1]:7.3f}{h[2]:6.0f}" if h else f"{'none':>13}{'':13}" for h in hits]
        gap = hits[1][0] - hits[0][0] if all(hits) else None
        gaps += [] if gap is None else [gap]
        print(f"{at:6.2f}{cells[0]}  {cells[1]}" + ("" if gap is None else f"{gap:+10.3f}"))
    if gaps:
        print(f"largest gap {max(gaps, key=abs):+.3f}   mean of the gaps' sizes {np.mean(np.abs(gaps)):.3f}   at {len(gaps)} places")


def swap(args) -> None:
    pair, scale = Pair(args.pair), args.scale
    ref, ours = (pair.level(name, args.box, scale, False) for name in SIDES)
    paper = {id(im): np.percentile(np.asarray(im).reshape(-1, 3), 90, axis=0) for im in (ref, ours)}

    def with_part(base, source, polygons):
        mask = Image.new("L", base.size, 0)
        for polygon in polygons:
            ImageDraw.Draw(mask).polygon([((x - args.box[0]) * scale, (y - args.box[1]) * scale) for x, y in polygon], fill=255)
        gain = paper[id(base)] / np.maximum(paper[id(source)], 1)
        same_paper = Image.fromarray(np.clip(np.asarray(source) * gain, 0, 255).astype(np.uint8))
        return Image.composite(same_paper, base, mask.filter(ImageFilter.GaussianBlur(args.feather * scale)))

    parts: dict[str, list] = {}
    for name, polygon in args.part:
        parts.setdefault(name, []).append(polygon)
    columns = {"none": [], **parts, **({"all": [q for p in parts.values() for q in p]} if len(parts) > 1 else {})}
    rows = [[with_part(base, source, p) for p in columns.values()] for base, source in ((ours, ref), (ref, ours))]
    sheet = row([Image.new("RGB", (ours.width, 20), "white") for _ in columns])
    pen = ImageDraw.Draw(sheet)
    for k, name in enumerate(columns):
        pen.text((k * (ours.width + 10) + 4, 4), name, fill="black")
    strips = [sheet, *map(row, rows)]
    whole = Image.new("RGB", (sheet.width, sum(s.height for s in strips) + 20), "white")
    y = 0
    for strip in strips:
        whole.paste(strip, (0, y))
        y += strip.height + 10
    print("top row: the drawing with the reference's part   bottom row: the reference with the drawing's part")
    save(whole, args.out)


def main() -> None:
    cli = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    commands = cli.add_subparsers(required=True, metavar="command")

    def command(name, run, what, source="pair"):
        p = commands.add_parser(name, help=what)
        p.add_argument(source)
        p.set_defaults(run=run)
        return p

    p = command("zoom", zoom, "one picture enlarged with a pixel grid", "picture")
    p.add_argument("--box", type=box_of, required=True)
    p.add_argument("--width", type=int, default=1000)
    p.add_argument("--grid", type=float)
    p.add_argument("--out", required=True)
    p = command("side", side, "reference and drawing levelled, side by side")
    p.add_argument("--box", type=box_of, required=True)
    p.add_argument("--scale", type=float, default=260, help="pixels per unit")
    p.add_argument("--grid", type=float, help="grid step in units")
    p.add_argument("--out", required=True)
    p = command("overlap", overlap, "how far the dark shapes cover each other")
    p.add_argument("--box", type=box_of, required=True)
    p.add_argument("--dark", type=float, default=110)
    p.add_argument("--scale", type=float, default=240)
    p.add_argument("--out")
    p = command("values", values, "mean, spread and cover of the dark in named boxes")
    p.add_argument("--box", type=lambda t: named(t, box_of), action="append", required=True)
    p.add_argument("--dark", type=float, default=110)
    p = command("trace", trace, "a line's place, thickness and darkness at even steps")
    p.add_argument("--path", type=points, required=True, help="a rough guess of the line, x,y:x,y:…")
    p.add_argument("--path-drawing", type=points, help="a guess for the drawing, if its line lies elsewhere")
    p.add_argument("--by", choices=("x", "y"), default="x", help="step along x (a lying line) or y (a standing one)")
    p.add_argument("--step", type=float, default=0.05)
    p.add_argument("--reach", type=float, default=0.06, help="how far from the guess to look")
    p = command("swap", swap, "paste parts between the two, both ways")
    p.add_argument("--part", type=lambda t: named(t, points), action="append", required=True, help="name=x,y:x,y:x,y (repeat a name to add a shape)")
    p.add_argument("--box", type=box_of, default=(-1.5, -2.4, 2.2, 2))
    p.add_argument("--scale", type=float, default=150)
    p.add_argument("--feather", type=float, default=0.03)
    p.add_argument("--out", required=True)
    args = cli.parse_args()
    args.run(args)


if __name__ == "__main__":
    main()
