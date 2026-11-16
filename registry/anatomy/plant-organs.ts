/**
 * FLORA1 organs: leaves, flowers, fruit and bark as style-neutral shapes, so a pencil cherry and a woodblock cherry
 * have the same notched petals and the same ringed bark.
 *
 * Units:
 * - a leaf runs from its base at (0, 0) to its tip at (0, 1), y up; its width is a share of its length;
 * - a flower is seen face on, radius 1, centred at the origin; racemes and plumes hang or stand from the origin;
 * - bark marks fill a w × h rectangle from (0, 0).
 *
 * Shapes are outlines (closed point lists) and marks (open polylines).
 */
import { add, circlePoints, dir, ellipsePoints, rotate, seeded } from "./foundation-shapes";
import type { FPoint } from "./foundation-shapes";

export type LeafShape = "needle-pair" | "awl" | "scale-spray" | "ovate" | "lanceolate" | "palmate" | "fan" | "cordate" | "blade" | "sword" | "peltate" | "pinnate" | "lobed";
export type LeafMargin = "entire" | "serrate" | "double-serrate" | "wavy";
export interface LeafSpec {
  shape: LeafShape;
  /** Width ÷ length. */
  width: number;
  margin?: LeafMargin;
  /** Palmate lobes (maple 5–9, paulownia 3–5) and how deep they cut (0–1); pinnate leaflet pairs. */
  lobes?: number; depth?: number;
  /** Where the leaf is widest (share of its length from the base). */
  widest?: number;
}
export interface OrganShape { outlines: FPoint[][]; marks: FPoint[][] }

/** Half-width along the midrib for an ovate or lanceolate blade widest at `widest`, with an acuminate tip. */
function bladeProfile(t: number, width: number, widest: number): number {
  const a = Math.log(.5) / Math.log(Math.min(.9, Math.max(.1, widest)));
  return width / 2 * Math.sin(Math.PI * Math.pow(t, a)) ** .85 * (1 - Math.pow(t, 9) * .3);
}
function teeth(t: number, margin: LeafMargin | undefined, n: number): number {
  if (!margin || margin === "entire") return 0;
  if (margin === "wavy") return Math.sin(t * n * Math.PI) * .02;
  const saw = (t * n) % 1, tooth = saw < .75 ? saw / .75 : (1 - saw) / .25;
  return (margin === "double-serrate" ? tooth * .7 + ((t * n * 2) % 1) * .3 : tooth) * .018 * (t > .05 && t < .97 ? 1 : 0);
}
function bladeOutline(width: number, widest: number, margin: LeafMargin | undefined, n = 40, toothCount = 18, lobe?: { n: number; depth: number }): FPoint[] {
  const left: FPoint[] = [], right: FPoint[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    let w = bladeProfile(t, width, widest) + teeth(t, margin, toothCount);
    if (lobe) w *= 1 - lobe.depth * Math.max(0, Math.sin(t * lobe.n * Math.PI)) ** 6 * (t > .15 && t < .85 ? 1 : 0);
    left.push([-w, t]); right.push([w, t]);
  }
  return [...left, ...right.reverse()];
}
/** Polar outline from the leaf base: the max over lobes of each lobe's spoke. */
function radialOutline(lobes: readonly { angle: number; length: number; width: number }[], floor: number, margin: LeafMargin | undefined, n = 160, from = -180, to = 180): FPoint[] {
  const pts: FPoint[] = [];
  for (let i = 0; i <= n; i++) {
    const th = from + (to - from) * i / n;
    let r = floor;
    for (const l of lobes) { const d = Math.abs(((th - l.angle + 540) % 360) - 180); r = Math.max(r, l.length * Math.max(0, 1 - (d / l.width) ** 2) ** .6); }
    r += r > floor * 1.2 ? teeth((i / n * 7) % 1, margin, 4) * 2 : 0;
    pts.push([r * Math.cos(th * Math.PI / 180), r * Math.sin(th * Math.PI / 180)]);
  }
  return pts;
}

/** A leaf's outlines and veins (base at the origin, tip at (0, 1)). */
export function leafShape(spec: LeafSpec, seed = 1): OrganShape {
  const W = spec.width, rnd = seeded(seed);
  switch (spec.shape) {
    case "needle-pair": return { outlines: [-1, 1].map(s => [[0, 0], [s * .03, .5], [s * .06 + s * .01, 1], [s * .05, 1], [s * .015, .5]] as FPoint[]), marks: [[[0, 0], [0, .06]]] };
    case "awl": return { outlines: [[[-.08, 0], [-.12, .5], [0, 1], [.06, .55], [.08, 0]]], marks: [] };
    case "scale-spray": {
      // A flattened spray: a central axis with alternate side shoots, each a string of overlapping scales.
      const out: FPoint[][] = [], marks: FPoint[][] = [[[0, 0], [0, 1]]];
      for (let i = 0; i < 7; i++) { const t = .12 + i * .12, s = i % 2 ? 1 : -1, L = W * (1 - t * .6), base: FPoint = [0, t], tip = add(base, dir(90 - s * 55), L);
        out.push([base, add(base, [s * L * .1, .03]), tip, add(base, [s * L * .5, -.01])]); marks.push([base, tip]); }
      out.push([[-.04, 0], [-.05, .6], [0, 1], [.05, .6], [.04, 0]]);
      return { outlines: out, marks };
    }
    case "ovate": case "lanceolate": return { outlines: [bladeOutline(W, spec.widest ?? (spec.shape === "lanceolate" ? .3 : .4), spec.margin)], marks: veins(W, 7) };
    case "lobed": return { outlines: [bladeOutline(W, spec.widest ?? .55, spec.margin, 60, 26, { n: (spec.lobes ?? 3) * 2 + 1, depth: spec.depth ?? .5 })], marks: veins(W, 5) };
    case "palmate": {
      const n = spec.lobes ?? 5, depth = spec.depth ?? .6, spread = n >= 7 ? 135 : 115, lobes = Array.from({ length: n }, (_, i) => {
        const u = n === 1 ? 0 : i / (n - 1) - .5, angle = 90 + u * 2 * spread * .5 * 2;
        return { angle, length: 1 - Math.abs(u) * .55, width: 180 / n * (1.1 - depth * .35) };
      });
      return { outlines: [radialOutline(lobes, (1 - depth) * .45, spec.margin)], marks: lobes.map(l => [[0, 0], [l.length * .9 * Math.cos(l.angle * Math.PI / 180), l.length * .9 * Math.sin(l.angle * Math.PI / 180)]] as FPoint[]) };
    }
    case "fan": {
      // Ginkgo: a wedge opening into a fan, notched at the middle of its wavy top; veins fork and radiate.
      const pts: FPoint[] = [[0, 0]];
      for (let i = 0; i <= 40; i++) { const th = 45 + 90 * i / 40, notch = .22 * Math.exp(-(((th - 90) / 5) ** 2)), r = (1 - notch) * (1 + .02 * Math.sin(i * 1.3)); pts.push([r * Math.cos(th * Math.PI / 180) * W * 1.3, .25 + r * Math.sin(th * Math.PI / 180) * .75]); }
      return { outlines: [pts], marks: Array.from({ length: 9 }, (_, i) => { const th = 50 + i * 10; return [[0, .05], [Math.cos(th * Math.PI / 180) * W * 1.2, .25 + Math.sin(th * Math.PI / 180) * .7]] as FPoint[]; }) };
    }
    case "cordate": {
      // Heart-shaped: a pointed blade over two rounded basal lobes either side of the stalk (three-lobed when lobes = 3).
      const lobes = [{ angle: 90, length: .85, width: 95 }, { angle: 200, length: .42, width: 55 }, { angle: -20, length: .42, width: 55 }];
      if ((spec.lobes ?? 1) >= 3) lobes.push({ angle: 145, length: .62, width: 38 }, { angle: 35, length: .62, width: 38 });
      return { outlines: [radialOutline(lobes, .04, spec.margin, 160, -70, 250).map(([x, y]) => [x * W * 1.05, y + .15] as FPoint)], marks: veins(W, 5) };
    }
    case "blade": return { outlines: [[[-W / 2, 0], [-W / 2, .7], [-W * .2, .97], [0, 1], [W * .2, .97], [W / 2, .7], [W / 2, 0]]], marks: [[[0, 0], [0, .95]]] };
    case "sword": return { outlines: [[[-W / 2, 0], [-W * .55, .5], [-W * .3, .9], [0, 1], [W * .25, .9], [W * .5, .5], [W / 2, 0]]], marks: [[[0, 0], [0, .9]]] };
    case "peltate": {
      // Lotus: a round shield on a central stalk, the edge rippled, veins radiating from the centre.
      const pts = Array.from({ length: 48 }, (_, i) => { const a = i / 48 * Math.PI * 2, r = .5 * (1 + .03 * Math.sin(a * 7 + rnd())); return [r * Math.cos(a), .5 + r * Math.sin(a)] as FPoint; });
      return { outlines: [pts], marks: Array.from({ length: 16 }, (_, i) => { const a = i / 16 * Math.PI * 2; return [[0, .5], [.47 * Math.cos(a), .5 + .47 * Math.sin(a)]] as FPoint[]; }) };
    }
    case "pinnate": {
      const pairs = spec.lobes ?? 6, out: FPoint[][] = [], marks: FPoint[][] = [[[0, 0], [0, 1]]];
      for (let i = 0; i < pairs; i++) for (const s of [-1, 1]) {
        const t = .15 + i * .8 / pairs, leaflet = bladeOutline(.4, .45, "entire", 16).map(([x, y]) => [x * .22, y * .22] as FPoint);
        out.push(leaflet.map(p => add(rotate(p, -s * 70, [0, 0]), [0, t])));
      }
      out.push(bladeOutline(.4, .45, "entire", 16).map(([x, y]) => [x * .22, .92 + y * .22] as FPoint));
      return { outlines: out, marks };
    }
  }
}
function veins(width: number, pairs: number): FPoint[][] {
  const v: FPoint[][] = [[[0, 0], [0, .97]]];
  for (let i = 1; i <= pairs; i++) { const t = i / (pairs + 1); for (const s of [-1, 1]) v.push([[0, t * .9], [s * bladeProfile(t, width, .4) * .85, t * .9 + .12]]); }
  return v;
}

export type FlowerShape = "rosaceous" | "camellia" | "composite" | "funnel" | "iris" | "lotus" | "raceme" | "plume" | "panicle" | "tubular" | "catkin" | "none";
export interface FlowerSpec {
  shape: FlowerShape;
  petals: number;
  /** Notch at the petal tip (cherry 0.15–0.25; plum 0), and pointedness (peach). */
  notch?: number; point?: number;
  /** Rings of petals (doubles, chrysanthemum rays). */
  rings?: number;
}

/** A petal from the centre out along +y, length 1: an obovate blade, notched or pointed at the tip. */
function petal(width: number, notch = 0, point = 0): FPoint[] {
  const pts: FPoint[] = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24, a = -Math.PI / 2 + Math.PI * t, x = Math.sin(a), y = Math.cos(a);
    const r = 1 - notch * Math.exp(-((x / .18) ** 2)) + point * Math.max(0, 1 - Math.abs(x) * 3) * .25;
    pts.push([x * width / 2, .35 + .65 * y * r]);
  }
  return [[0, 0], ...pts];
}

/** A flower seen face on (radius 1), or a hanging raceme, standing plume or panicle (length 1 along −y or +y). */
export function flowerShape(spec: FlowerSpec, seed = 1): OrganShape {
  const rnd = seeded(seed), n = Math.max(1, spec.petals), outlines: FPoint[][] = [], marks: FPoint[][] = [];
  const ring = (count: number, len: number, width: number, phase: number, notch = 0, point = 0) => {
    for (let i = 0; i < count; i++) { const ang = phase + i * 360 / count; outlines.push(petal(width, notch, point).map(p => rotate([p[0] * len, p[1] * len], ang - 90, [0, 0]))); }
  };
  switch (spec.shape) {
    case "rosaceous":
      ring(n, 1, .9, 90, spec.notch ?? 0, spec.point ?? 0);
      for (let i = 0; i < 20; i++) { const a = i / 20 * 360 + rnd() * 9; marks.push([[0, 0], add([0, 0], dir(a), .42 + rnd() * .08)]); }
      outlines.push(circlePoints([0, 0], .1, 10));
      break;
    case "camellia":
      ring(n, 1, 1.05, 90, .05); ring(n, .72, .95, 90 + 180 / n, .05);
      outlines.push(circlePoints([0, 0], .28, 16));
      break;
    case "composite":
      for (let r = 0; r < (spec.rings ?? 3); r++) ring(n, 1 - r * .2, .22, r * 7);
      outlines.push(circlePoints([0, 0], .2, 16));
      break;
    case "funnel": {
      outlines.push(circlePoints([0, 0], 1, 40));
      for (let i = 0; i < 5; i++) marks.push([[0, 0], dir(90 + i * 72)]);
      outlines.push(circlePoints([0, 0], .28, 16));
      break;
    }
    case "iris":
      ring(3, 1, 1.0, 270); ring(3, .7, .45, 90);
      for (let i = 0; i < 3; i++) marks.push([[0, 0], add([0, 0], dir(270 + i * 120), .5)]);
      break;
    case "lotus":
      ring(8, 1, .75, 90, 0, .6); ring(8, .78, .7, 112, 0, .6);
      outlines.push(circlePoints([0, 0], .25, 16));
      break;
    case "raceme": {
      // Hanging: many small pea flowers along a falling axis, largest and open at the top.
      for (let i = 0; i < 26; i++) { const t = i / 26, y = -t, r = .09 * (1 - t * .6), x = (rnd() - .5) * .16 * (1 - t); outlines.push(circlePoints([x, y], r, 8)); }
      marks.push([[0, 0], [0, -1]]);
      break;
    }
    case "plume": case "panicle": {
      // Standing: a stem with feathery branches (susuki) or dense spikelets (reed, rice; droops when ripe).
      marks.push([[0, 0], [0, 1]]);
      for (let i = 0; i < 18; i++) { const t = .2 + i * .045, s = i % 2 ? 1 : -1, l = (spec.shape === "plume" ? .35 : .18) * (1 - (t - .2) * .9); marks.push([[0, t], [s * l * .7, t + l * .5], [s * l, t + l * .9]]); }
      break;
    }
    case "tubular": case "catkin":
      outlines.push(ellipsePoints({ cx: 0, cy: .5, rx: .22, ry: .5, angle: 0 }, 20));
      break;
    case "none": break;
  }
  return { outlines, marks };
}

export type FruitShape = "drupe" | "pome-flat" | "cone" | "seed-pod" | "nut" | "none";
/** A fruit seen from the side (radius 1). */
export function fruitShape(shape: FruitShape, seed = 1): OrganShape {
  const rnd = seeded(seed);
  switch (shape) {
    case "drupe": return { outlines: [ellipsePoints({ cx: 0, cy: 0, rx: 1, ry: 1.02, angle: 0 }, 32)], marks: [[[0, 1], [.08, .2]]] };
    case "pome-flat": return { outlines: [ellipsePoints({ cx: 0, cy: 0, rx: 1, ry: .82, angle: 0 }, 32), [[-.4, .82], [0, .65], [.4, .82], [0, 1.0]]], marks: [] };
    case "cone": {
      const marks: FPoint[][] = [];
      for (let i = 0; i < 6; i++) { const y = -1.3 + i * .45; marks.push([[-.7, y], [0, y + .25], [.7, y]]); }
      return { outlines: [ellipsePoints({ cx: 0, cy: 0, rx: .75, ry: 1.4, angle: 0 }, 32)], marks };
    }
    case "seed-pod": return { outlines: [[[-1, .5], [1, .5], [.6, -.6], [-.6, -.6]]], marks: Array.from({ length: 7 }, (_, i) => circlePoints([(i % 4 - 1.5) * .4 + rnd() * .05, i < 4 ? .3 : .05], .1, 8)) };
    case "nut": return { outlines: [ellipsePoints({ cx: 0, cy: 0, rx: .8, ry: 1, angle: 0 }, 24)], marks: [] };
    case "none": return { outlines: [], marks: [] };
  }
}

export type BarkKind = "plated" | "strips" | "lenticels" | "smooth" | "patches" | "fissured" | "culm" | "green";
/** Marks for a piece of bark w × h (x across the trunk, y up it). */
export function barkMarks(kind: BarkKind, w: number, h: number, seed = 1): OrganShape {
  const rnd = seeded(seed), marks: FPoint[][] = [], outlines: FPoint[][] = [];
  switch (kind) {
    case "plated": {
      // Pine: irregular plates in staggered rows, separated by dark fissures.
      const rowH = w * .28;
      for (let y = 0, r = 0; y < h; y += rowH * (.8 + rnd() * .5), r++) {
        for (let x = (r % 2) * w * .2 - w * .1; x < w; x += w * (.3 + rnd() * .2)) {
          const pw = w * (.22 + rnd() * .12), ph = rowH * (.75 + rnd() * .3);
          outlines.push([[x, y], [x + pw * .1, y + ph], [x + pw * .95, y + ph * (.9 + rnd() * .2)], [x + pw, y + ph * .1]]);
        }
      }
      break;
    }
    case "strips":
      for (let x = rnd() * w * .1; x < w; x += w * (.08 + rnd() * .06)) { const pts: FPoint[] = []; for (let y = 0; y <= h; y += h / 12) pts.push([x + Math.sin(y / h * 6 + x * 9) * w * .025, y]); marks.push(pts); }
      break;
    case "lenticels":
      // Cherry, plum, peach: short horizontal dashes in loose rings round the trunk.
      for (let y = h * .03; y < h; y += w * (.12 + rnd() * .12)) for (let x = rnd() * w * .2; x < w; x += w * (.25 + rnd() * .25)) { const l = w * (.08 + rnd() * .14); marks.push([[x, y], [x + l, y + (rnd() - .5) * w * .01]]); }
      break;
    case "smooth":
      for (let i = 0; i < 4; i++) { const x = rnd() * w; marks.push([[x, rnd() * h * .3], [x + (rnd() - .5) * w * .05, h * (.5 + rnd() * .5)]]); }
      break;
    case "patches":
      for (let i = 0; i < Math.round(h / w * 5); i++) outlines.push(ellipsePoints({ cx: rnd() * w, cy: rnd() * h, rx: w * (.08 + rnd() * .12), ry: w * (.12 + rnd() * .18), angle: rnd() * 30 - 15 }, 12));
      break;
    case "fissured":
      // Interlacing furrows: long ridges that meet and part, a diamond network.
      for (let x = 0; x < w; x += w * .16) { const pts: FPoint[] = []; for (let y = 0; y <= h; y += h / 16) pts.push([x + Math.sin(y / (w * .7) + x * 3) * w * .07, y]); marks.push(pts); }
      break;
    case "culm":
      for (let y = h * .2; y < h; y += h * .3) marks.push([[0, y], [w, y]], [[0, y + w * .03], [w, y + w * .03]]);
      break;
    case "green": break;
  }
  return { outlines, marks };
}
