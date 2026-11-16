/**
 * SKY1 cloud shapes: the ten genera as layered path data for any style to paint, built from what each looks like in
 * the 1896 International Cloud Atlas plates and the genus descriptions (sky-data.ts).
 *
 * - Heaps (cumulus): a flat base on the condensation level and a domed top of bubbles of mixed sizes, whose cusps make
 *   the cauliflower edge; lit on the sun's side, a grey base.
 * - Tower (cumulonimbus): a column of heaps reaching the tropopause, where the top spreads into a flat anvil that
 *   thins to fibres downwind; a very dark flat base, often with a rain shaft.
 * - Wisps (cirrus): thin curved strands, hooked or tufted at one end, fibrous.
 * - Ripples (cirrocumulus): small white grains in rows, no shading.
 * - Puffs (altocumulus): rounded masses in rows, larger than ripples, shaded underneath, blue between.
 * - Veil (cirrostratus) and sheet (altostratus): thin and thicker layers; the sun shows through.
 * - Rain layer (nimbostratus): thick and dark with a ragged base and veils of rain.
 * - Lumpy layer (stratocumulus): rolls of grey masses with lighter gaps.
 * - Layer (stratus): a low flat grey band with ragged edges.
 *
 * Units: the cloud's width is `width` (default 1), y up, the base at 0, x centred. Each layer names a tone the
 * renderer colours from the genus (`lit`, `mid` between lit and shade, `shade`, `base`, `rain`); `outline` is the whole
 * cloud, for clipping.
 */
import type { FPoint } from "../anatomy/foundation-shapes";
import { ellipsePoints, seeded, smoothClosedPath, smoothTube } from "../anatomy/foundation-shapes";
import type { CloudGenus } from "./sky-data";
import { CLOUD_GENERA, ELEMENT_WIDTH_DEG } from "./sky-data";

export type CloudTone = "lit" | "mid" | "shade" | "base" | "rain";
export interface CloudLayer { d: string; tone: CloudTone; opacity: number; /** Clip to the cloud's outline. */ clip?: boolean; /** How far to mix toward the horizon colour (0 near, 1 lost in haze). */ fade?: number }
export interface CloudShape {
  genus: CloudGenus;
  width: number; height: number;
  outline: string;
  layers: readonly CloudLayer[];
  /** Extent [minX, minY, maxX, maxY]. */
  bounds: readonly [number, number, number, number];
}
export interface CloudOptions {
  width?: number;
  seed?: number;
  /** Cumulus only: humilis (flat, wider than tall), mediocris, congestus (towering). */
  species?: "humilis" | "mediocris" | "congestus";
  /** The sun's side: −1 from the left, +1 from the right. */
  sun?: -1 | 1;
  /** Downwind side for anvils and rain shafts: −1 left, +1 right. */
  wind?: -1 | 1;
}

/** Height ÷ width for cumulus species (estimated from the atlas plate and the species descriptions: humilis flattened, congestus taller than wide). */
export const CUMULUS_ASPECT = { humilis: .38, mediocris: .7, congestus: 1.35 } as const;

interface Bubble { c: FPoint; r: number }
const circle = (b: Bubble, n = 20) => smoothClosedPath(ellipsePoints({ cx: b.c[0], cy: b.c[1], rx: b.r, ry: b.r, angle: 0 }, n));
/** A polygon (not smoothed: the cusps between bubbles are the point) as path data. */
const poly = (pts: readonly FPoint[]) => `M${pts.map(p => `${p[0].toFixed(4)} ${p[1].toFixed(4)}`).join("L")}Z`;

/**
 * The outline of a union of discs seen from `origin` (inside it), cut by a flat base at `baseY`: for each direction the
 * farthest disc edge, or the base if nearer. Cusps where lobes meet stay sharp.
 */
function discUnion(discs: readonly Bubble[], origin: FPoint, baseY?: number, steps = 360): FPoint[] {
  const pts: FPoint[] = [];
  for (let i = 0; i < steps; i++) {
    const a = i / steps * Math.PI * 2, ux = Math.cos(a), uy = Math.sin(a);
    let t = 0;
    for (const b of discs) {
      const dx = b.c[0] - origin[0], dy = b.c[1] - origin[1], p = ux * dx + uy * dy, q = p * p - (dx * dx + dy * dy) + b.r * b.r;
      if (q >= 0) t = Math.max(t, p + Math.sqrt(q));
    }
    if (baseY !== undefined && uy < 0) t = Math.min(t, (origin[1] - baseY) / -uy);
    pts.push([origin[0] + ux * t, origin[1] + uy * t]);
  }
  return pts;
}

/**
 * Bubbles for a heaped cloud: lobes set just inside a superellipse dome (flat base, bulging sides, a rounded crown),
 * larger toward the crown, a second smaller generation on the upper lobes (the cauliflower), and fillers inside.
 */
function heapBubbles(rnd: () => number, w: number, h: number, flare = 0): { lobes: Bubble[]; all: Bubble[] } {
  const out: Bubble[] = [], n = 2.6, prof = (phi: number): FPoint => {
    const c = Math.cos(phi), s = Math.sin(phi);
    return [w / 2 * Math.sign(c) * Math.abs(c) ** (2 / n), h * Math.abs(s) ** (2 / n)];
  };
  const N = Math.round(9 + 5 * h / w);
  for (let i = 0; i <= N; i++) {
    const phi = Math.PI * (1 - i / N) + (rnd() - .5) * .08, p = prof(phi), up = Math.sin(phi);
    const r = w * (.085 + .085 * up) * (.8 + rnd() * .45) * Math.max(1, Math.sqrt(h / w) * .9);
    // Set the lobe inside the profile by most of its radius; side lobes near the base hang down to it.
    // Low side lobes tuck in, so the corners round into the flat base.
    const cx = p[0] - Math.cos(phi) * r * (.75 + .45 * (1 - up) ** 2), cy = Math.max(r * .15, p[1] - up * r * .8);
    out.push({ c: [cx, cy], r });
  }
  // Lobes on the cloud's face, in rows, so the middle is billows too, not a flat fill.
  const halfAt = (y: number) => w / 2 * Math.max(0, 1 - (y / h) ** n) ** (1 / n);
  for (let y = h * .22; y < h * .85; y += w * .17) {
    const hw = halfAt(y) * .72, r0 = w * (.1 + .05 * y / h);
    for (let x = -hw + r0 * .6; x < hw; x += r0 * 1.5) out.push({ c: [x + (rnd() - .5) * r0 * .5, y + (rnd() - .5) * r0 * .4], r: r0 * (.85 + rnd() * .3) });
  }
  // A tower widens upward into its anvil.
  if (flare) for (const b of out) b.c = [b.c[0] * (1 - flare * .5 + flare * b.c[1] / h), b.c[1]];
  // The cauliflower: small lobes on the upper lobes' outer edges.
  for (const b of out.slice(0, N + 1)) {
    if (b.c[1] < h * .35) continue;
    for (let k = 0; k < 2; k++) {
      const out0 = Math.atan2(b.c[1] - h * .3, b.c[0]), a = out0 + (rnd() - .5) * 1.4, r = b.r * (.32 + rnd() * .2);
      out.push({ c: [b.c[0] + Math.cos(a) * b.r * .82, b.c[1] + Math.sin(a) * b.r * .82], r });
    }
  }
  // Fillers down the middle (outline only), so every ray from inside meets a disc.
  const fill: Bubble[] = [];
  for (let y = 0; y < h * .8; y += w * .16) fill.push({ c: [(rnd() - .5) * w * .2, Math.max(w * .05, y)], r: w * (.22 + rnd() * .05) });
  return { lobes: out, all: [...out, ...fill] };
}

/**
 * Light and shade for heaped lobes: painted from the top down, so each lower (nearer) lobe's bright crown stands in
 * front of the shaded underside of the one above (the cauliflower read). Each lobe's lit disc sits inside it, tangent
 * on the sun's side, larger near the crown and small near the base, where the cloud is in its own shadow.
 */
function lobeLayers(bubbles: readonly Bubble[], h: number, sun: number, litFrom = .32): CloudLayer[] {
  const layers: CloudLayer[] = [], ux = sun * .5, uy = .87;
  for (const b of [...bubbles].sort((p, q) => q.c[1] - p.c[1])) {
    // Upper lobes are mostly lit with a thin crease beneath; low lobes mostly in the cloud's shadow.
    const hh = Math.min(1, Math.max(0, b.c[1] / h)), litR = b.r * (.5 + .42 * hh), off = (b.r - litR) * .96;
    layers.push({ d: circle(b), tone: hh > .45 ? "mid" : "shade", opacity: 1, clip: true });
    if (hh > litFrom * (litFrom > .4 ? .9 : .55)) layers.push({ d: circle({ c: [b.c[0] + ux * off, b.c[1] + uy * off], r: litR }), tone: hh > litFrom ? "lit" : "mid", opacity: 1, clip: true });
  }
  return layers;
}

/** A shadow with a soft edge: nested ellipses, each faint, toward the side away from the sun. */
const softShadow = (cx: number, cy: number, rx: number, ry: number): CloudLayer[] =>
  [1, .82, .64].map(k => ({ d: smoothClosedPath(ellipsePoints({ cx: cx - Math.sign(cx) * rx * (1 - k) * .6, cy, rx: rx * k, ry: ry * (.9 + .1 * k), angle: 0 }, 28)), tone: "shade" as const, opacity: .14, clip: true }));

function heaps(o: { width: number; sun: number }, rnd: () => number, aspect: number) {
  const w = o.width, h = w * aspect, { lobes, all } = heapBubbles(rnd, w, h);
  const pts = discUnion(all, [0, Math.min(h * .3, w * .12)], 0), outline = poly(pts);
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  // The side away from the sun and the flat base lie in the cloud's own shadow.
  const away = softShadow(-o.sun * w * .45, h * .3, w * .4, h * .75);
  const baseBand = smoothClosedPath([[-w, -.01], [w, -.01], [w, h * .07], [w * .2, h * .1], [-w * .25, h * .085], [-w, h * .06]]);
  return { outline, h, bounds: [Math.min(...xs), 0, Math.max(...xs), Math.max(...ys)] as const,
    layers: [{ d: outline, tone: "shade" as const, opacity: 1 }, ...lobeLayers(lobes, h, o.sun), ...away, { d: baseBand, tone: "base" as const, opacity: .75, clip: true }] };
}

function tower(o: { width: number; sun: number; wind: number }, rnd: () => number) {
  // A heaped body about as tall as it is wide whose crown spreads into the anvil: flat on top, its underside sloping
  // down from the downwind tip into the body, thinning to fibres downwind (drawn compressed: the real cloud is 10 km
  // tall and its anvil can spread over 100 km; proportions estimated from the atlas plate and photographs).
  const w = o.width, body = w * 1.3, wind = o.wind, aTop = w * 1.42;
  const { lobes, all } = heapBubbles(rnd, w, body, .3);
  const bodyPts = discUnion(all, [0, w * .2], 0);
  const X = (x: number) => x * wind;
  // The anvil: its underside flares out of the body's upper flanks and thins to the downwind tip.
  const anvil: FPoint[] = [[X(-.56 * w), aTop - w * .055], [X(-.4 * w), aTop - w * .005], [X(.35 * w), aTop + w * .008], [X(1.05 * w), aTop - w * .004], [X(1.35 * w), aTop - w * .03],
    [X(1.1 * w), aTop - w * .065], [X(.8 * w), aTop - w * .13], [X(.52 * w), body * .76], [X(0), body * .82], [X(-.46 * w), body * .78], [X(-.53 * w), aTop - w * .12]];
  const anvilD = smoothClosedPath(anvil), outline = `${poly(bodyPts)}${anvilD}`;
  const anvilTop = smoothClosedPath([[X(-.52 * w), aTop - w * .045], [X(-.4 * w), aTop - w * .005], [X(.35 * w), aTop + w * .008], [X(1.05 * w), aTop - w * .004], [X(1.3 * w), aTop - w * .03], [X(.95 * w), aTop - w * .045], [X(.3 * w), aTop - w * .055]]);
  const fibres = Array.from({ length: 8 }, (_, i) => {
    const y = aTop - w * (.01 + i * .01), x0 = X(w * (.9 + rnd() * .2)), x1 = X(w * (1.4 + rnd() * .25));
    return smoothTube([[x0, y], [(x0 + x1) / 2, y - w * .01], [x1, y - w * .03]], [w * .018, w * .012, w * .002]);
  }).join("");
  const away = softShadow(-o.sun * w * .45, body * .4, w * .42, body * .7);
  const baseBand = smoothClosedPath([[-w, -.01], [w, -.01], [w, body * .1], [0, body * .13], [-w, body * .09]]);
  // Rain: streaks in a curtain under the downwind part of the base, fading toward the ground.
  const rain: CloudLayer[] = [];
  for (let i = 0; i < 18; i++) {
    const x = X(w * (-.15 + i * .028 + (rnd() - .5) * .02)), d = body * (.25 + rnd() * .15), s = X(w * .06);
    rain.push({ d: poly([[x - w * .008, 0], [x + w * .008, 0], [x + s + w * .004, -d], [x + s - w * .004, -d]]), tone: "rain", opacity: .25 });
  }
  const xs = [...bodyPts.map(p => p[0]), ...anvil.map(p => p[0]), X(w * 1.68)];
  return { outline, h: aTop, bounds: [Math.min(...xs), -body * .42, Math.max(...xs), aTop + w * .03] as const,
    layers: [...rain, { d: poly(bodyPts), tone: "shade" as const, opacity: 1 }, ...lobeLayers(lobes, body, o.sun, .42),
      ...away, { d: baseBand, tone: "base" as const, opacity: .9, clip: true },
      { d: anvilD, tone: "mid" as const, opacity: 1 }, { d: anvilTop, tone: "lit" as const, opacity: .95 }, { d: fibres, tone: "lit" as const, opacity: .6 }] };
}

function wisps(w: number, rnd: () => number) {
  // Strands rising from a hooked or tufted head and trailing off in fibres that fan out (mares' tails).
  const strands: string[] = [], fibres: string[] = [], h = w * .35;
  for (let i = 0; i < 6; i++) {
    const y0 = h * (.1 + rnd() * .8), x0 = -w * (.45 - rnd() * .2), len = w * (.45 + rnd() * .45), rise = h * (.12 + rnd() * .3);
    const pts: FPoint[] = Array.from({ length: 10 }, (_, k) => { const t = k / 9; return [x0 + len * t, y0 + rise * t * t - h * .05 * Math.sin(t * Math.PI)] as FPoint; });
    const hook: FPoint[] = [[x0 - w * .02, y0 - h * .1], [x0 - w * .03, y0 - h * .035]];
    const all = [...hook, ...pts];
    strands.push(smoothTube(all, all.map((_, k) => w * (k < 2 ? .007 : .016 * Math.sin(Math.PI * Math.min(1, k / (all.length - 1) * 1.05 + .06)) + .0015))));
    for (let f = 0; f < 5; f++) {
      const off = (f - 2) * h * .02, start = 1 + f % 3, part = pts.slice(start);
      fibres.push(smoothTube(part.map(([x, y], k) => [x, y + off * (.3 + k / part.length * 1.6)] as FPoint), part.map((_, k, a) => w * .0045 * (1 - k / a.length) + .0006)));
    }
  }
  const d = strands.join("");
  return { outline: d, h, bounds: [-w * .55, -h * .1, w * .55, h * 1.25] as const, layers: [{ d, tone: "lit" as const, opacity: .7 }, { d: fibres.join(""), tone: "lit" as const, opacity: .5 }] };
}

function ripples(w: number, rnd: () => number) {
  const grains: string[] = [], rows = 9, cols = 24, h = w * .3;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const u = (c + .5) / cols, x = -w / 2 + u * w + (rnd() - .5) * w * .015 + (r % 2) * w / cols * .5, y = h * (r + .5) / rows + Math.sin(u * 6 + r * .7) * h * .04;
    const edge = Math.min(u, 1 - u, (r + .5) / rows, 1 - (r + .5) / rows) * 4;
    if (rnd() > Math.min(1, edge + .15)) continue;
    grains.push(smoothClosedPath(ellipsePoints({ cx: x, cy: y, rx: w * (.011 + rnd() * .006), ry: w * (.006 + rnd() * .003), angle: (rnd() - .5) * 30 }, 10)));
  }
  const d = grains.join("");
  return { outline: d, h, bounds: [-w * .55, 0, w * .55, h] as const, layers: [{ d, tone: "lit" as const, opacity: .9 }] };
}

/** An irregular rounded mass: an ellipse whose radius wanders with two low harmonics; `flatBottom` squashes its underside. */
function blob(rnd: () => number, cx: number, cy: number, rx: number, ry: number, flatBottom = 1, n = 18): FPoint[] {
  const p1 = rnd() * 6.28, p2 = rnd() * 6.28, a1 = .1 + rnd() * .08, a2 = rnd() * .07;
  return Array.from({ length: n }, (_, i) => {
    const t = i / n * Math.PI * 2, k = 1 + a1 * Math.sin(2 * t + p1) + a2 * Math.sin(3 * t + p2), s = Math.sin(t);
    return [cx + rx * k * Math.cos(t), cy + ry * k * s * (s < 0 ? flatBottom : 1)] as FPoint;
  });
}
const scaleAbout = (pts: readonly FPoint[], c: FPoint, kx: number, ky: number, dx: number, dy: number) => pts.map(([x, y]) => [c[0] + (x - c[0]) * kx + dx, c[1] + (y - c[1]) * ky + dy] as FPoint);

function puffs(w: number, rnd: () => number, sun: number) {
  // Rounded masses in rows that run at a slant (the atlas plate's bands), varied in size, shaded beneath.
  // Rows nearer the viewer (higher overhead) are larger; the farthest, near the horizon, smallest and flattest.
  const shade: string[] = [], lit: string[] = [], rows = 5, per = 7, h = w * .45, tilt = -.18;
  for (let r = 0; r < rows; r++) for (let c = 0; c < per; c++) {
    if (rnd() < .08) continue;
    const near = .62 + .38 * r / (rows - 1), u = (c + .5 + (r % 2) * .45) / per, rx = w / per * (.46 + rnd() * .14) * near, ry = rx * (.5 + rnd() * .15) * (.8 + .2 * near);
    const cx = -w / 2 + u * w + (rnd() - .5) * w * .02, cy = h * ((r + .5) / rows) ** 1.25 + (u - .5) * w * tilt + (rnd() - .5) * h * .03;
    const pts = blob(rnd, cx, cy, rx, ry, .7);
    shade.push(smoothClosedPath(pts));
    lit.push(smoothClosedPath(scaleAbout(pts, [cx, cy], .84, .72, sun * rx * .07, ry * .22)));
  }
  const d = shade.join("");
  return { outline: d, h, bounds: [-w * .58, -w * .12, w * .62, h + w * .1] as const, layers: [{ d, tone: "shade" as const, opacity: 1 }, { d: lit.join(""), tone: "lit" as const, opacity: 1, clip: true }] };
}

/** A band with wavy top and bottom edges (layers): `ragged` adds downward scallops on the base. */
function band(w: number, rnd: () => number, thick: number, ragged: number) {
  const n = 22, top: FPoint[] = [], bottom: FPoint[] = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, x = -w / 2 + u * w, taper = Math.sin(Math.PI * u) ** .35;
    top.push([x, thick * (.5 + .5 * taper) + (rnd() - .5) * thick * .15]);
    bottom.push([x, thick * (.5 - .5 * taper) - (ragged ? rnd() * ragged * thick : 0)]);
  }
  return [...bottom, ...top.reverse()];
}

function layered(genus: CloudGenus, w: number, rnd: () => number, sun: number, wind: number) {
  if (genus === "cirrostratus") {
    const h = w * .12, veil = smoothClosedPath(band(w, rnd, h, 0));
    const streaks = Array.from({ length: 7 }, (_, i) => smoothTube([[-w * .45, h * (.15 + i * .11)], [0, h * (.2 + i * .11) + (rnd() - .5) * h * .1], [w * .45, h * (.1 + i * .11)]], [w * .002, w * .008, w * .002])).join("");
    return { outline: veil, h, bounds: [-w * .52, -h * .1, w * .52, h * 1.2] as const, layers: [{ d: veil, tone: "lit" as const, opacity: .38 }, { d: streaks, tone: "lit" as const, opacity: .45 }] };
  }
  if (genus === "altostratus") {
    const h = w * .2, sheet = smoothClosedPath(band(w, rnd, h, .1));
    return { outline: sheet, h, bounds: [-w * .52, -h * .2, w * .52, h * 1.1] as const, layers: [{ d: sheet, tone: "lit" as const, opacity: .9 }, { d: smoothClosedPath(band(w * .96, rnd, h * .35, .25)), tone: "shade" as const, opacity: .5, clip: true }] };
  }
  if (genus === "nimbostratus") {
    // A thick dark layer; veils of rain fade toward the ground (stacked bands, each shorter), ragged scud beneath.
    const h = w * .26, mass = smoothClosedPath(band(w, rnd, h, .18)), veils: CloudLayer[] = [];
    for (let i = 0; i < 5; i++) {
      const x0 = -w * .4 + i * w * .2 + (rnd() - .5) * w * .06, s = wind * w * .05;
      for (let k = 0; k < 14; k++) {
        const x = x0 + (k - 7) * w * .009, d = h * (.8 + rnd() * .9);
        veils.push({ d: poly([[x - w * .004, h * .1], [x + w * .004, h * .1], [x + s + w * .002, -d], [x + s - w * .002, -d]]), tone: "rain", opacity: .22 });
      }
    }
    return { outline: mass, h, bounds: [-w * .52, -h * 1.8, w * .6, h * 1.1] as const,
      layers: [...veils, { d: mass, tone: "shade" as const, opacity: 1 }, { d: smoothClosedPath(band(w * .9, rnd, h * .45, 0).map(([x, y]) => [x, y + h * .55] as FPoint)), tone: "lit" as const, opacity: .3, clip: true }] };
  }
  if (genus === "stratocumulus") {
    // Rows of large grey rolls merging into each other, brighter on top, with lighter gaps between rows.
    const h = w * .3, parts: string[] = [], lit: string[] = [];
    for (let r = 0; r < 3; r++) {
      let x = -w / 2 + rnd() * w * .04;
      const ry0 = h * (.11 + r * .045), cy = h * (.12 + r * .3);
      while (x < w / 2) {
        const rx = w * (.07 + rnd() * .05) * (.72 + r * .14), ry = ry0 * (1.05 + rnd() * .35), cx = x + rx;
        const pts = blob(rnd, cx, cy + (rnd() - .5) * ry * .3, rx, ry, .75);
        parts.push(smoothClosedPath(pts)); lit.push(smoothClosedPath(scaleAbout(pts, [cx, cy], .82, .55, sun * rx * .06, ry * .36)));
        x += rx * (1.2 + rnd() * .35) + (rnd() < .15 ? rx * .45 : 0);
      }
    }
    const d = parts.join("");
    return { outline: d, h, bounds: [-w * .55, -h * .05, w * .62, h * 1.05] as const, layers: [{ d, tone: "shade" as const, opacity: 1 }, { d: lit.join(""), tone: "mid" as const, opacity: .8, clip: true }] };
  }
  // stratus
  const h = w * .07, layer = smoothClosedPath(band(w, rnd, h, .35));
  const streaks = Array.from({ length: 3 }, (_, i) => smoothTube([[-w * (.48 - i * .1), h * (1.4 + i * .5)], [w * (.05 * i), h * (1.6 + i * .5)], [w * (.3 + i * .05), h * (1.45 + i * .45)]], [w * .002, w * .012, w * .002])).join("");
  return { outline: layer, h, bounds: [-w * .52, -h * .5, w * .52, h * 3] as const, layers: [{ d: layer, tone: "shade" as const, opacity: .95 }, { d: streaks, tone: "lit" as const, opacity: .7 }] };
}

/** A genus's shape, seeded: the same seed draws the same cloud. */
export function cloudShape(genus: CloudGenus, opts: CloudOptions = {}): CloudShape {
  const o = { width: opts.width ?? 1, seed: opts.seed ?? 1, sun: opts.sun ?? -1, wind: opts.wind ?? 1, species: opts.species };
  const rnd = seeded(o.seed * 7919 + genus.length * 31);
  const form = CLOUD_GENERA[genus].form;
  const s = form === "heaps" ? heaps(o, rnd, CUMULUS_ASPECT[o.species ?? "mediocris"])
    : form === "tower" ? tower(o, rnd)
    : form === "wisps" ? wisps(o.width, rnd)
    : form === "ripples" ? ripples(o.width, rnd)
    : form === "puffs" ? puffs(o.width, rnd, o.sun)
    : layered(genus, o.width, rnd, o.sun, o.wind);
  return { genus, width: o.width, height: s.h, outline: s.outline, layers: s.layers, bounds: s.bounds };
}

// ---- A cloud deck in perspective ---------------------------------------------------------------------------------------

export interface DeckCamera {
  /** Frame size and horizon height in screen units (y down); focal length in the same units. */
  width: number; height: number; horizonY: number; focal: number;
  eyeHeight?: number; seed?: number; sun?: -1 | 1;
  /** Share of the sky covered, 0–1. */
  cover?: number;
  /** Visibility, km: farther clouds fade toward the horizon colour (default 30). */
  visibility?: number;
}
/** One cloud, row of elements or slice of a layer, placed on screen: draw `shape` at `translate(x y) scale(scale −scale)`. */
export interface DeckItem { shape: CloudShape; x: number; y: number; scale: number; fade: number; distance: number }

/**
 * Haze lies mostly in the lowest air (the boundary layer, about 1.5 km deep; estimated), so a sight line up to a cloud
 * crosses only the part of its length below that: the fraction 1.5 km ÷ the cloud's height.
 */
export const HAZE_TOP = 1500;
const fadeAt = (km: number, vis: number, height = 0) => 1 - Math.exp(-3.912 * km * Math.min(1, HAZE_TOP / Math.max(1, height)) / Math.max(.05, vis));

/**
 * A genus as a cloud deck seen by a level camera: every base lies on one plane at the genus's base height, so rows
 * converge on the horizon, nearer clouds sit higher and larger, and distant ones flatten and fade. Heaps are separate
 * clouds scattered on the plane; patterned genera (cirrocumulus, altocumulus, stratocumulus) are rows of elements at
 * their WMO apparent widths; layers are a sheet whose ragged edge recedes to the horizon. Items run far to near.
 */
export function cloudDeck(genus: CloudGenus, cam: DeckCamera): DeckItem[] {
  const g = CLOUD_GENERA[genus], rnd = seeded((cam.seed ?? 1) * 104729 + genus.length), eye = cam.eyeHeight ?? 1.6, vis = cam.visibility ?? 40;
  const base = (g.base[0] + g.base[1]) / 2 - eye, f = cam.focal, W = cam.width, H0 = cam.horizonY, cover = Math.min(1, Math.max(0, cam.cover ?? .5)), sun = cam.sun ?? -1;
  const yAt = (d: number) => H0 - f * base / d, items: DeckItem[] = [], fade = (d: number, height = base) => fadeAt(Math.hypot(d, height) / 1000, vis, height);
  // Distances from nearly overhead (top of frame) out to where the plane is within 2 px of the horizon.
  const dNear = Math.max(base * .35, f * base / Math.max(1, H0 + 40)), dFar = f * base / 2;
  if (g.form === "heaps" || g.form === "tower") {
    // Heaps from about 2 km out to 25 km (beyond, they merge into the haze); a storm tower far off, 50 km.
    const n = g.form === "tower" ? 1 : Math.round(3 + cover * 12), d0 = Math.max(dNear * 1.4, 2000), d1 = Math.max(d0 * 2, 25000);
    for (let i = 0; i < n; i++) {
      const wm = g.form === "tower" ? 9000 : 700 + rnd() * 900, r0 = rnd(), xr = rnd() - .5;
      const shape = cloudShape(genus, { width: wm, seed: (cam.seed ?? 1) * 31 + i, sun, species: cover > .7 && rnd() < .5 ? "congestus" : rnd() < .4 ? "humilis" : "mediocris" });
      // No nearer than keeps the whole cloud below the top of the frame.
      const d = Math.max(g.form === "tower" ? 50000 : d0 * (d1 / d0) ** (r0 ** 1.3), f * (base + shape.height) / Math.max(10, H0 - 4)), xm = xr * 2 * (W / 2 + 60) / f * d;
      items.push({ shape, x: g.form === "tower" ? W * .3 : W / 2 + xm * f / d, y: yAt(d), scale: f / d, fade: fade(d, base + shape.height * .4), distance: d });
    }
    return items.sort((a, b) => b.distance - a.distance);
  }
  if (g.form === "puffs" || g.form === "ripples" || g.form === "lumpy-layer") {
    // An element's width from its apparent width seen 30° up (the WMO criterion): 2 × slant range × tan(half the angle).
    const deg = ELEMENT_WIDTH_DEG[genus]!.typical, ew = 2 * (base / Math.sin(Math.PI / 6)) * Math.tan(deg / 2 * Math.PI / 180), rolls = genus === "stratocumulus";
    for (let d = dNear; d < dFar; d *= 1.16) {
      const y = yAt(d), rx0 = ew / 2 * f / d;
      if (rx0 < .6 || y > H0 - 1) break;
      const alpha = Math.atan2(base, d), flat = .22 + .6 * Math.sin(alpha), half = (W / 2 + rx0 * 3) / f * d, shade: string[] = [], lit: string[] = [];
      // Stratocumulus elements are rolls: wider, overlapping into each other.
      for (let xm = -half + rnd() * ew; xm < half; xm += ew * (rolls ? .95 + rnd() * .4 : 1.15 + rnd() * .5)) {
        if (rnd() > .35 + cover * .65) continue;
        const cx = W / 2 + xm * f / d, rx = rx0 * (.75 + rnd() * .5) * (rolls ? 1.25 : 1), ry = rx * flat * (.8 + rnd() * .4) * (rolls ? .85 : 1), cy = y + (rnd() - .5) * ry * .6;
        const pts = ellipsePoints({ cx, cy: -cy, rx, ry, angle: (rnd() - .5) * 10 }, 14);
        shade.push(smoothClosedPath(pts));
        // Overhead we see the shaded underside with a bright rim on the sun's side; toward the horizon, lit tops.
        lit.push(smoothClosedPath(ellipsePoints({ cx: cx + sun * rx * .18 * Math.sin(alpha), cy: -cy + ry * .32 * (1 - Math.sin(alpha) * .6), rx: rx * .78, ry: ry * .55, angle: 0 }, 12)));
      }
      if (!shade.length) continue;
      const outline = shade.join("");
      items.push({ shape: { genus, width: W, height: 0, outline, bounds: [0, -H0, W, 0], layers: [{ d: outline, tone: genus === "cirrocumulus" ? "lit" : "shade", opacity: genus === "cirrocumulus" ? .9 : 1 },
        ...(genus === "cirrocumulus" ? [] : [{ d: lit.join(""), tone: (genus === "stratocumulus" ? "mid" : "lit") as CloudTone, opacity: .9, clip: true }])] }, x: 0, y: 0, scale: 1, fade: fade(d), distance: d });
    }
    return items.sort((a, b) => b.distance - a.distance);
  }
  if (g.form === "wisps") {
    for (let i = 0; i < Math.round(1 + cover * 3); i++) {
      const d = dNear * (1.1 + rnd() * 1.6), wm = 4000 + rnd() * 4000, shape = cloudShape(genus, { width: wm, seed: (cam.seed ?? 1) + i });
      items.push({ shape, x: W * (.15 + rnd() * .7), y: yAt(d) - shape.height * f / d * .5, scale: f / d, fade: fade(d), distance: d });
    }
    return items.sort((a, b) => b.distance - a.distance);
  }
  // Layers: slices of the sheet from overhead to its far edge, each fading with its distance; the last slice ragged.
  const edge = Math.min(dFar, dNear * (genus === "cirrostratus" ? 6 : 14) * (.6 + cover * .6)), ragged = g.form === "rain-layer" || g.form === "layer" ? 1 : .4;
  const slices = 18, tone: CloudTone = g.form === "veil" ? "lit" : "shade", opacity = g.form === "veil" ? .45 : 1;
  for (let k = 0; k < slices; k++) {
    // Opaque layers overlap their slices by a hair to hide seams; a translucent veil must not, or the overlaps show as lines.
    const d0 = dNear * (edge / dNear) ** (k / slices), d1 = dNear * (edge / dNear) ** ((k + 1) / slices), y0 = k ? yAt(d0) - (opacity < 1 ? 0 : .8) : -2, y1 = yAt(d1);
    const bottom: FPoint[] = [];
    for (let i = 0; i <= 40; i++) {
      const x = -10 + (W + 20) * i / 40, wob = k === slices - 1 ? (rnd() - .3) * 14 * ragged * f / d1 * 40 / Math.max(40, f / 30) : 0;
      bottom.push([x, -(y1 + Math.max(-6, Math.min(10, wob)))]);
    }
    const pts: FPoint[] = [[-10, -y0], [W + 10, -y0], ...bottom.reverse()];
    const d = poly(pts);
    items.push({ shape: { genus, width: W, height: 0, outline: d, bounds: [-10, -y1, W + 10, -y0], layers: [{ d, tone, opacity }] }, x: 0, y: 0, scale: 1, fade: fade((d0 + d1) / 2), distance: (d0 + d1) / 2 });
  }
  return items.sort((a, b) => b.distance - a.distance);
}
