/**
 * INK-RISO1 工筆 gōngbǐ: a face painted in fine, layered tints over white (粉), where `paintInkFace` leaves the skin to the paper.
 *
 * Every form is given in the frame portraits are measured in: the irises level, 1 = the distance between them, +x toward the near side,
 * y down (`InkHead.level`). A lid, a lip or a brow is a pair of edges; its colour is a tone at a place between them, so edges can be
 * crisp in one place and lost in another, as wet paint is. The outline of the face, the ear and the hairline still come from `poseInkHead`.
 */
import { inkMarkHit, inkMarkStart, inkNoise2, inkRgb, inkSpline } from "./ink-riso-press";
import type { InkRisoPlateSpec } from "./ink-riso-press";
import type { InkRisoPen, PenPoint } from "./ink-riso-pen";
import { inkBloom } from "./ink-riso-wet";
import type { InkHead } from "./ink-riso-face";

/** Plates by what they are for. `white` and `cool` may be left out. */
export interface GongbiPlates { ink: string; warm: string; earth: string; cool?: string; white?: string }
/** How much of each plate: the share of light it takes there, 0–1, so two mixes can be added and a colour can be worked back to its mix. */
export interface GongbiMix { ink?: number; warm?: number; earth?: number; cool?: number; white?: number }
/** The skin at one place: what is laid there, and how far it speaks for. Between places it runs from one into the next. */
export interface GongbiPlace { at: PenPoint; mix: GongbiMix; /** Default 0.2. */ reach?: number }
/** A place and half a width. */
export type GongbiNode = readonly [x: number, y: number, half: number];

/** Colour let into the skin: a soft patch, or a plane with edges of its own. */
export interface GongbiTint extends GongbiMix {
  /** A patch: its middle, its reach along and across, and the way it lies in degrees. */
  at?: PenPoint; size?: PenPoint; turn?: number;
  /** A patch along a path instead, as where a cheek rounds away at its outline: its tone falls off on both sides over `soft`, and `fade` ends it. Cut off at the shape's edge. */
  path?: readonly PenPoint[];
  /** A plane: its outline, how soft it is (default 0.04), and where its tone goes to nothing (directions: from, to). */
  plane?: readonly PenPoint[]; soft?: number; fade?: readonly (readonly [from: PenPoint, to: PenPoint])[];
  /** A light instead: how much of the skin is let out there, 0–1. */
  light?: number;
  /** Of a plane on a lid: how much of the lid's way it goes as the eye shuts, 0–1 (default 0). */
  follow?: number;
}
export interface GongbiEye {
  /** The two edges of the opening, from the inner corner to the outer. */
  upper: readonly PenPoint[]; lower: readonly PenPoint[];
  /** The line on the upper lid, from the tear corner to the end of the wing, and the fold over it. */
  line: readonly GongbiNode[]; fold: readonly GongbiNode[];
  /** The iris: its middle and its reach; the pupil's share of it; lights on it, the first the brightest. */
  iris: readonly [x: number, y: number, rx: number, ry: number]; pupil?: number; lights: readonly (readonly [x: number, y: number, rx: number, ry: number, strength: number])[];
  /** Lashes: root and tip on the page, half a width at the root, and a place a curved one bends through (left out, it is straight, and pales toward its tip). */
  lashes?: readonly (readonly [from: PenPoint, to: PenPoint, half: number, through?: PenPoint])[];
  /** The line under the eye: its ink from the inner corner to the outer, or along the way between them (0–1), and half its width (default 0.0045). */
  under?: readonly [number, number] | ((t: number) => number); foot?: number;
  /** Softness of the lid's line (default 0.011), of the fold (default 0.013) and of the line under the eye (default 0.015). */
  softness?: number; foldSoftness?: number; footSoftness?: number;
  /** Skin let out between the fold and the lid's line, 0–1: the light on the rim of the lid (default 0). */
  gleam?: number;
  /** How much of its tone the lid's line keeps at the end of the wing (default 0.38). */
  wing?: number;
  /** Where the lid's line lies when the eye is shut, from the tear corner to the end of the wing. Left out, it comes down on the lower edge and the wing stays. */
  shut?: readonly PenPoint[];
}
export interface GongbiBrow { top: readonly PenPoint[]; bottom: readonly PenPoint[]; /** Tone, and how it lies along the brow (0 the head, 1 the tail; default 1). */ tone: number; along?: (t: number) => number; /** Softness of its edges (default 0.016; its head is softer above), and how clearly its hairs are seen, 0–1 (default 0.3). */ soft?: number; hairs?: number; /** Tone along its upper edge (default 0.8) and its lower one (default 1). */ upper?: number; lower?: number; /** Hairs that stand off its head. */ loose?: readonly (readonly [PenPoint, PenPoint, number])[] }
export interface GongbiMouth {
  /** Edges from the near corner to the far one: the upper lip's, the line between the lips, the lower lip's. */
  upper: readonly PenPoint[]; parting: readonly GongbiNode[]; lower: readonly PenPoint[];
  /** How full the colour is (1), and how far it is let out into the skin at the edges (default 0.02) toward the near corner (share of the width, default 0.2) and the far one (0.1). */
  tone?: number; soft?: number; near?: number; far?: number;
  /** How dark the line between the lips stays in its middle (default 0.62; its ends are full), and how much the lower lip pales toward its edge (default 0.12). */
  line?: number; fall?: number;
  /** How full the upper lip is (default 0.82). */
  above?: number;
  /** Colour laid under the red, how much of the skin is let out there first (default 0.8), and how far in from the lower lip's edge that begins (default 0). */
  earth?: number; ink?: number; bare?: number; inset?: number;
  /** Lights on the lower lip: where, reach, turn, strength. */
  lights?: readonly (readonly [x: number, y: number, rx: number, ry: number, turn: number, strength: number])[];
}
export interface GongbiLine { nodes: readonly GongbiNode[]; tone: GongbiMix; /** Default 0.006. */ soft?: number; along?: (t: number) => number }
export interface GongbiFace {
  plates: GongbiPlates;
  /** The skin, place by place. */
  skin: readonly GongbiPlace[];
  tints: readonly GongbiTint[];
  /** Tints that lie on the lids and move with them. */
  lids?: { near: readonly GongbiTint[]; far: readonly GongbiTint[] };
  brows: { near: GongbiBrow; far: GongbiBrow };
  eyes: { near: GongbiEye; far: GongbiEye };
  /** Ink of the irises, how brown they are, how blue where the light comes through, how much of the ink is left there, and how far down the lashes' shadow reaches. */
  iris: { ink: number; earth: number; cool: number; foot: number; lash: number; /** How clearly its rays show (default 0.3), how dark its rim is (default 0) and how soft its edge, share of its reach (default 0.11). */ rays?: number; rim?: number; edge?: number };
  /** What the whites of the eyes take besides the shade of the lid, how far the warmth of the tear corner runs into them (share of the eye, default 0.16), and how deep the shade in the outer corner is (default 1) and round the iris (default 0.14). */
  whites?: { tone: GongbiMix; corner?: number; outer?: number; halo?: number };
  /** The colour of the brows, of the lids' lines, of the folds and of the warmth round them, and of the line under the eye. */
  browLine: GongbiMix; lidLine: GongbiMix; foldLine: GongbiMix; foldGlow: GongbiMix; underLine: GongbiMix;
  mouth: GongbiMouth; mouthLine: GongbiMix;
  /** Lines of the nose, a chin, a throat. */
  lines: readonly GongbiLine[];
  /** The outline: its colour, its half width, its pressure from the far temple to the chin and from the chin to the lobe, 0–1, and the warmth within it along the jaw. */
  outline: { tone: GongbiMix; half: number; far: (t: number) => number; jaw: (t: number) => number; glow?: GongbiMix };
  /** How far the skin goes on under the hair, as a share of the way out from between the eyes (default 0.16): hair with a lost edge needs skin under it. */
  under?: number;
  seed?: number;
}

const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ss = (a: number, b: number, v: number) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const KEYS = ["white", "earth", "warm", "cool", "ink"] as const;

/**
 * Colours as mixes: gives, for an sRGB colour, what each plate must take on this paper to show it, so that skin, lines and lips can be given
 * as the colours they should have. `white` is how much chalk lies under it (left out, plenty, less where the paper's own colour is wanted). With `on` there is
 * colour there already, and the mix is what turns that one into this. A plate left out takes no part: without `warm`, greys beside one another are
 * never one from the black and one from blue against red, which would show as a red patch between them.
 */
export function gongbiColours(specs: readonly InkRisoPlateSpec[], plates: Partial<GongbiPlates>, paper: string): (colour: string, white?: number, on?: string) => GongbiMix {
  const enc = (v: number) => 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055), ground = inkRgb(paper), inkOf = (id?: string) => { const p = id ? specs.find(q => q.id === id) : undefined; return p ? inkRgb(p.ink) : undefined; };
  const chalk = inkOf(plates.white), inks = (["earth", "warm", "cool", "ink"] as const).map(key => [key, inkOf(plates[key])] as const).filter(q => q[1]), memo = new Map<string, GongbiMix>();
  // a grey comes from the black rather than from blue against red, and from as little of either as will do
  const dear = inks.map(([q]) => (q === "cool" ? 60 : q === "ink" ? 10 : q === "warm" ? 8 : 0));
  const solve = (target: readonly number[], base: readonly number[]): [number[], number] => {
    const error = (v: readonly number[]) => { let s = 0; for (let k = 0; k < 3; k++) { let c = base[k]; inks.forEach(([, ink], i) => { c *= 1 - v[i] * (1 - ink![k]); }); s += (enc(c) - target[k]) ** 2; } inks.forEach((_, i) => { s += dear[i] * v[i]; }); return s; };
    let v = inks.map(() => 0.1), best = error(v);
    for (const lead of inks.keys()) {
      let q = inks.map((_, i): number => (i === lead ? 0.4 : 0.06)), e = error(q);
      for (let step = 0.16; step > 0.002; step *= 0.5) for (let moved = true; moved; ) {
        moved = false;
        for (let i = 0; i < q.length; i++) for (let j = -1; j < q.length; j++) for (const d of [step, -step]) { if (j === i) continue; const to = [...q]; to[i] = clamp(to[i] + d); if (j >= 0) to[j] = clamp(to[j] - d); const w = error(to); if (w < e - 1e-6) { e = w; q = to; moved = true; } }
      }
      if (e < best) { best = e; v = q; }
    }
    return [v, best];
  };
  return (colour, white, on) => {
    const key = `${colour}/${white}/${on}`, was = memo.get(key);
    if (was) return was;
    const target = inkRgb(colour).map(enc), tries = on || !chalk ? [0] : white === undefined ? [0.75, 0.6, 0.45, 0.3, 0.15, 0, 0.9] : [white];
    let best: [number[], number] | undefined, laid = 0;
    for (const w of tries) { const got = solve(target, on ? inkRgb(on) : ground.map((p, k) => (chalk ? p * (1 + w * (chalk[k] / p - 1)) : p))); if (!best || got[1] < best[1] - 1.2) { best = got; laid = w; } }
    const mix: GongbiMix = { white: laid }; inks.forEach(([q], i) => { if (best![0][i] > 0.004) (mix as Record<string, number>)[q] = best![0][i]; });
    memo.set(key, mix); return mix;
  };
}
/** How a wash lies: softness of its edge (one, or by place), unevenness and the size of its clouds, how far the edge wanders, how much pigment is carried to it. Level units. */
export interface GongbiWash { soft?: number | ((x: number, y: number) => number); mottle?: number; cloud?: number; wander?: number; wave?: number; rim?: number; rimWidth?: number; /** One seed for all its plates: their edges and clouds then fall together. */ seed?: number }
/** A brush on the levelled frame of a posed head. */
export interface GongbiHand {
  /** One level unit in page units. */
  readonly unit: number;
  /** Level place to the pen's own units. */
  at(x: number, y: number): PenPoint;
  /** A smooth closed shape through level places, in sheet units. */
  shape(points: readonly PenPoint[]): number[][];
  /** A rectangle of the level frame, in sheet units. */
  box(x0: number, y0: number, x1: number, y1: number): number[][];
  /** A tone at a level place, laid on a plate within a shape (sheet units). */
  lay(key: keyof GongbiMix, shape: readonly (readonly number[])[], tone: (x: number, y: number) => number, o?: GongbiWash): void;
  /** What lies within a shape is let out of every plate, 0–1, with the edge a wash of the same kind has. */
  clear(shape: readonly (readonly number[])[], amount: number, o?: GongbiWash): void;
  /** A wash that takes the place of what lies there, as far as `cover` says: one colour runs into the other along a soft edge, with no pale seam. */
  melt(shape: readonly (readonly number[])[], field: (key: keyof GongbiMix) => ((x: number, y: number) => number) | undefined, cover?: number, o?: GongbiWash): void;
  /** One plate's pigment let out of a shape, as far as a tone there says. */
  wipe(key: keyof GongbiMix, shape: readonly (readonly number[])[], tone: (x: number, y: number) => number, o?: GongbiWash): void;
  /** A swollen line. */
  stroke(line: GongbiLine): void;
  /** Ink wiped off along a line, 0–1: a light. */
  lift(line: Pick<GongbiLine, "nodes" | "soft" | "along">, amount: number, plates: readonly (keyof GongbiMix)[]): void;
}
export function gongbiHand(f: InkRisoPen, head: InkHead, plates: GongbiPlates, seed = 1): GongbiHand {
  const o = head.level(0, 0), ax = head.level(1, 0), U = Math.hypot(ax[0] - o[0], ax[1] - o[1]), p0 = f.at(0, 0), p1 = f.at(1, 0), page = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), unit = U * page;
  const level = (x: number, y: number): PenPoint => head.fromLevel([x, y]);
  let s = 3000 + seed * 300;
  const plain = (pts: readonly PenPoint[]): number[][] => pts.map(p => { const q = head.level(p[0], p[1]); return f.at(q[0], q[1]); });
  const here = (X: number, Y: number): PenPoint => { const [x, y] = f.local(X, Y); return level(x, y); };
  const edges = (q: GongbiWash) => { const soft = q.soft; return { soft: typeof soft === "function" ? (X: number, Y: number) => { const l = here(X, Y); return Math.min(58, soft(l[0], l[1]) * unit); } : (soft ?? 0.008) * unit, wander: (q.wander ?? 0) * unit, wave: (q.wave ?? 0.3) * unit, fringe: (q.wander ?? 0) * unit * 0.3 }; };
  const lay: GongbiHand["lay"] = (key, shape, tone, q = {}) => {
    const plate = plates[key]; if (!plate) return;
    inkBloom(f, plate, shape, { tone: (X, Y) => { const l = here(X, Y); return 1 - Math.sqrt(1 - clamp(tone(l[0], l[1]))); }, ...edges(q), rim: q.rim ?? 0, rimWidth: (q.rimWidth ?? 0.03) * unit, mottle: q.mottle ?? 0, cloud: (q.cloud ?? 0.2) * unit, seed: q.seed ?? s++ });
  };
  const clear: GongbiHand["clear"] = (shape, amount, q = {}) => {
    const edge = edges(q), seed = q.seed ?? s++, ids = Object.keys(f.sheet.plates);
    ids.forEach((id, i) => inkBloom(f, id, shape, { ...edge, tone: amount, mode: "lift", hide: i === ids.length - 1, rim: 0, rimWidth: 0.4, mottle: 0, seed }));
  };
  const dims = KEYS.filter(key => key !== "white" && plates[key]).map(key => { const [r, g, b] = inkRgb(f.sheet.plates[plates[key]!].spec.ink); return [key, 1 - (0.21 * r + 0.72 * g + 0.07 * b)] as const; });
  const melt: GongbiHand["melt"] = (shape, field, cover = 1, q = {}) => {
    const edge = edges(q), seed = q.seed ?? s++, tones = dims.map(([key, dim]) => [field(key), dim] as const);
    const light = (X: number, Y: number) => { const l = here(X, Y); let t = 1; for (const [tone, dim] of tones) if (tone) t *= 1 - dim * clamp(tone(l[0], l[1])); return Math.sqrt(t); };
    Object.keys(f.sheet.plates).forEach((id, i) => {
      const key = KEYS.find(k => plates[k] === id), tone = key && field(key);
      inkBloom(f, id, shape, { ...edge, tone: tone ? (X, Y) => { const l = here(X, Y); return 1 - Math.sqrt(1 - clamp(tone(l[0], l[1]))); } : 0, mode: "melt", cover, hide: i === 0, light, rim: q.rim ?? 0, rimWidth: (q.rimWidth ?? 0.03) * unit, mottle: key === "white" ? 0 : q.mottle ?? 0.1, cloud: (q.cloud ?? 0.26) * unit, seed });
    });
  };
  const wipe: GongbiHand["wipe"] = (key, shape, tone, q = {}) => { const plate = plates[key]; if (plate) inkBloom(f, plate, shape, { tone: (X, Y) => { const l = here(X, Y); return clamp(tone(l[0], l[1])); }, ...edges({ soft: 0.002, ...q }), mode: "lift", rim: 0, rimWidth: 0.4, mottle: 0, seed: q.seed ?? s++ }); };
  // a line is rubbed on pixel by pixel as far as its edge reaches: a hair finer than the sheet's own grain still comes out as a pale hair
  const rub = (line: Pick<GongbiLine, "nodes" | "soft" | "along">, mark: (q: number, cover: number, t: number) => void) => {
    const sheet = f.sheet, S = sheet.spec.scale, P = inkSpline(line.nodes.map(p => [p[0], p[1], Math.max(0, p[2])]), 0.012).map(p => { const q = head.level(p[0], p[1]), v = f.at(q[0], q[1]); return [v[0] * S, v[1] * S, Math.max(0, p[2]) * unit * S] as const; }), n = P.length;
    const soft = Math.max(0.55, (line.soft ?? 0.006) * unit * S), cover = new Map<number, number>(), when = new Map<number, number>();
    for (let i = 0; i + 1 < n; i++) {
      const [ax, ay, ar] = P[i], [bx, by, br] = P[i + 1], R = Math.max(ar, br) + soft + 1, dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy || 1;
      for (let y = Math.max(0, Math.floor(Math.min(ay, by) - R)); y <= Math.min(sheet.h - 1, Math.max(ay, by) + R); y++) for (let x = Math.max(0, Math.floor(Math.min(ax, bx) - R)); x <= Math.min(sheet.w - 1, Math.max(ax, bx) + R); x++) {
        const k = clamp(((x + 0.5 - ax) * dx + (y + 0.5 - ay) * dy) / l), r = lerp(ar, br, k), d = Math.hypot(x + 0.5 - ax - dx * k, y + 0.5 - ay - dy * k) - r;
        if (d >= soft) continue;
        const t = (i + k) / (n - 1), c = ss(soft, -soft, d) * clamp((r + soft * 0.5) / soft) * (line.along ? line.along(t) : 1), q = y * sheet.w + x;
        if (c > (cover.get(q) ?? 0)) { cover.set(q, c); when.set(q, t); }
      }
    }
    for (const [q, c] of cover) mark(q, c, when.get(q)!);
  };
  const inks = (mix: GongbiMix) => KEYS.filter(key => mix[key] && plates[key]).map(key => [f.sheet.plates[plates[key]!].tone, mix[key]!] as const);
  const stroke: GongbiHand["stroke"] = line => {
    const on = inks(line.tone), layer = f.sheet.layer, w = f.sheet.w; let length = 0;
    for (let i = 1; i < line.nodes.length; i++) length += Math.hypot(line.nodes[i][0] - line.nodes[i - 1][0], line.nodes[i][1] - line.nodes[i - 1][1]);
    const mark = layer ? inkMarkStart(f.sheet, length * unit) : 0;
    rub(line, (q, c, t) => { const g = 1 + 0.3 * (inkNoise2(f.sheet.spec.seed + 12, (q % w) / 2.2, ((q / w) | 0) / 2.2) - 0.5) * (1 - c); for (const [tone, v] of on) { const was = tone[q]; tone[q] = 1 - (1 - was) * (1 - clamp(v * c * g)); if (layer) inkMarkHit(layer, q, mark + 0.999 * t, tone[q] - was); } });
  };
  const lift: GongbiHand["lift"] = (line, amount, keys) => { const on = keys.filter(key => plates[key]).map(key => f.sheet.plates[plates[key]!]); rub(line, (q, c) => { for (const p of on) { p.tone[q] *= 1 - amount * c; p.solid[q] *= 1 - amount * c; } }); };
  return { unit, at: (x, y) => head.level(x, y), shape: pts => f.shape(inkSpline(pts.map(p => head.level(p[0], p[1])), U * 0.01, true).map(p => [p[0], p[1]] as const), false), box: (x0, y0, x1, y1) => plain([[x0, y0], [x1, y0], [x1, y1], [x0, y1]]), lay, clear, melt, wipe, stroke, lift };
}
/** An edge as a height over each x: smooth through its points, held beyond its ends. Lids, brows and lips are read left to right this way. */
export function gongbiEdge(points: readonly PenPoint[]): (x: number) => number {
  const P = inkSpline(points, 0.004).map(p => [p[0], p[1]] as const), up = P[0][0] < P[P.length - 1][0] ? P : [...P].reverse(), n = up.length, x0 = up[0][0], x1 = up[n - 1][0], N = 256, T = new Float64Array(N + 1);
  let j = 0;
  for (let i = 0; i <= N; i++) { const x = lerp(x0, x1, i / N); while (j < n - 2 && up[j + 1][0] < x) j++; const a = up[j], b = up[j + 1]; T[i] = lerp(a[1], b[1], clamp((x - a[0]) / (b[0] - a[0] || 1))); }
  return x => { const k = clamp((x - x0) / (x1 - x0)) * N, i = Math.min(N - 1, k | 0); return lerp(T[i], T[i + 1], k - i); };
}
const tintTone = (t: GongbiTint) => {
  if (t.at && t.size) { const r = ((t.turn ?? 0) * Math.PI) / 180, c = Math.cos(r), n = Math.sin(r), [ax, ay] = t.at, [sx, sy] = t.size; return (x: number, y: number) => { const u = ((x - ax) * c + (y - ay) * n) / sx, v = (-(x - ax) * n + (y - ay) * c) / sy; return Math.exp(-(u * u + v * v)); }; }
  const ways = (t.fade ?? []).map(([a, b]) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy; return (x: number, y: number) => 1 - ss(0, 1, ((x - a[0]) * dx + (y - a[1]) * dy) / l); });
  const faded = (x: number, y: number) => ways.reduce((v, way) => v * way(x, y), 1);
  if (t.path) {
    const P = t.path, s = t.soft ?? 0.04, R = s * 2.6, xs = P.map(p => p[0]), ys = P.map(p => p[1]), [x0, x1, y0, y1] = [Math.min(...xs) - R, Math.max(...xs) + R, Math.min(...ys) - R, Math.max(...ys) + R];
    return (x: number, y: number) => {
      if (x < x0 || x > x1 || y < y0 || y > y1) return 0;
      let d = Infinity;
      for (let i = 1; i < P.length; i++) { const [ax, ay] = P[i - 1], dx = P[i][0] - ax, dy = P[i][1] - ay, k = clamp(((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)); d = Math.min(d, (x - ax - dx * k) ** 2 + (y - ay - dy * k) ** 2); }
      return Math.exp(-d / (s * s)) * faded(x, y);
    };
  }
  return ways.length ? faded : () => 1;
};
/** The mix at a place, between the places given. */
export function gongbiField(places: readonly GongbiPlace[]): (key: keyof GongbiMix) => ((x: number, y: number) => number) | undefined {
  const xs = places.map(p => p.at[0]), ys = places.map(p => p.at[1]), x0 = Math.min(...xs) - 0.5, x1 = Math.max(...xs) + 0.5, y0 = Math.min(...ys) - 0.5, y1 = Math.max(...ys) + 0.5, N = 72;
  return key => {
    if (!places.some(p => p.mix[key])) return undefined;
    const grid = new Float32Array((N + 1) * (N + 1));
    for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) {
      const x = lerp(x0, x1, i / N), y = lerp(y0, y1, j / N); let sum = 0, total = 0;
      for (const p of places) { const r = p.reach ?? 0.2, d = ((x - p.at[0]) ** 2 + (y - p.at[1]) ** 2) / (r * r), w = Math.exp(-d) + 0.002 / (1 + d); sum += w * (p.mix[key] ?? 0); total += w; }
      grid[j * (N + 1) + i] = sum / total;
    }
    return (x, y) => { const u = clamp((x - x0) / (x1 - x0)) * N, v = clamp((y - y0) / (y1 - y0)) * N, i = Math.min(N - 1, u | 0), j = Math.min(N - 1, v | 0), q = j * (N + 1) + i; return lerp(lerp(grid[q], grid[q + 1], u - i), lerp(grid[q + N + 1], grid[q + N + 2], u - i), v - j); };
  };
}
/** A wash that goes through every place's own mix: the skin of a face, of a neck, of an ear, or a lock of hair. */
export function gongbiSkin(h: GongbiHand, within: readonly (readonly number[])[], places: readonly GongbiPlace[], o: GongbiWash = {}): void {
  const field = gongbiField(places);
  for (const key of KEYS) { const tone = field(key); if (tone) h.lay(key, within, tone, { ...o, soft: o.soft ?? 0.01, mottle: key === "white" ? 0 : o.mottle ?? 0.1, cloud: o.cloud ?? 0.26 }); }
}
/** Tints laid within a shape: patches first, as one wash to each plate, then the planes. */
export function gongbiTints(h: GongbiHand, within: readonly (readonly number[])[], tints: readonly GongbiTint[], o: { soft?: number; mottle?: number } = {}): void {
  const patches = tints.filter(t => !t.plane).map(t => [t, tintTone(t)] as const);
  for (const key of KEYS) { const q = patches.filter(([t]) => t[key]); if (q.length) lay(h, key, within, q, o); }
  for (const t of tints) if (t.plane) {
    const tone = tintTone(t), body = h.shape(t.plane), soft = t.soft ?? 0.04;
    for (const key of KEYS) { const v = t[key]; if (v) h.lay(key, body, (x, y) => v * tone(x, y), { soft, mottle: 0.12 }); }
    if (t.light) for (const key of KEYS) if (key !== "white") h.wipe(key, body, (x, y) => t.light! * tone(x, y), { soft, seed: 61 });
  }
}
const lay = (h: GongbiHand, key: keyof GongbiMix, within: readonly (readonly number[])[], q: readonly (readonly [GongbiTint, (x: number, y: number) => number])[], o: { soft?: number; mottle?: number }) =>
  h.lay(key, within, (x, y) => { let s = 0; for (const [t, tone] of q) s += t[key]! * tone(x, y); return s; }, { soft: o.soft ?? 0.01, mottle: o.mottle ?? 0.1, cloud: 0.24 });

/** The lids at `open` (1 open, 0 shut): the upper edge, its line and its fold come down on the lower edge. */
function lidded(e: GongbiEye, open: number) {
  const lo = gongbiEdge(e.lower), shutAt = (x: number) => lo(x) - 0.012, xs = e.lower.map(p => p[0]), x0 = Math.min(...xs), x1 = Math.max(...xs), mid = (x0 + x1) / 2;
  const inside = (x: number) => clamp(1 - Math.max(0, Math.abs(x - mid) - (x1 - x0) / 2) / 0.1), k = 1 - open;
  const from = e.shut && gongbiEdge(e.line.map(n => [n[0], n[1]] as const)), to = e.shut && gongbiEdge(e.shut), way = (x: number) => (from && to ? to(x) - from(x) : inside(x) * (shutAt(x) - gongbiUpperAt(e, x)));
  const drop = (p: PenPoint, share = 1): number => p[1] + k * share * way(p[0]);
  return { open, upper: e.upper.map(p => [p[0], drop(p)] as const), line: e.line.map(n => [n[0], drop([n[0], n[1]]), n[2] * (1 - 0.2 * k)] as const), fold: e.fold.map(n => [n[0], drop([n[0], n[1]], 0.5), n[2] * (1 - 0.4 * k)] as const), move: (p: PenPoint, share: number): PenPoint => [p[0], drop(p, share)] };
}
const uppers = new WeakMap<GongbiEye, (x: number) => number>();
const gongbiUpperAt = (e: GongbiEye, x: number): number => { let q = uppers.get(e); if (!q) uppers.set(e, (q = gongbiEdge(e.upper))); return q(x); };

function paintEye(f: InkRisoPen, h: GongbiHand, face: GongbiFace, e: GongbiEye, open: number): void {
  const lid = lidded(e, open), up = gongbiEdge(lid.upper), lo = gongbiEdge(e.lower), xs = e.lower.map(p => p[0]), x0 = Math.min(...xs), x1 = Math.max(...xs), inner = e.upper[0][0], outer = e.upper[e.upper.length - 1][0];
  const soft = 0.008, [cx, cy, rx, ry] = e.iris, at = (x: number) => (x - inner) / (outer - inner);
  if (open > 0.12) {
    // the opening goes on a little under the line of the lid: no skin may show between them
    const ring: PenPoint[] = [...lid.upper, ...[...e.lower].reverse()], hole = h.shape(ring), top = (x: number) => up(x) - 0.006 * open, mask = (x: number, y: number) => (x < x0 || x > x1 ? 0 : ss(-soft, soft, y - top(x)) * ss(-soft, soft, lo(x) - y));
    f.knock(hole);
    const y0 = Math.min(...lid.upper.map(p => p[1])) - 0.02, y1 = Math.max(...e.lower.map(p => p[1])) + 0.02, box = h.box(x0 - 0.02, y0, x1 + 0.02, y1);
    const r = (x: number, y: number) => Math.hypot((x - cx) / rx, (y - cy) / ry), rimSoft = face.iris.edge ?? 0.11, lightSoft = rimSoft * 5.2272727, iris = (x: number, y: number) => ss(0.99 + rimSoft, 0.99 - rimSoft, r(x, y)), P = e.pupil ?? 0.3;
    const lit = (x: number, y: number) => { let s = 0; for (const [a, b, u, v, k] of e.lights) if (b > up(a) - 0.01) { const q = Math.hypot((x - a) / u, (y - b) / v); s = Math.max(s, k * (k > 0.7 ? ss(0.925 + lightSoft, 0.925 - lightSoft, q) : Math.exp(-q * q))); } return s; };
    const shadow = (x: number, y: number) => Math.exp(-Math.max(0, y - up(x)) / 0.026), deep = face.whites?.corner ?? 0.16, far = face.whites?.outer ?? 1, corner = (x: number) => Math.exp(-((at(x) / deep) ** 2)), tone = (key: keyof GongbiMix) => face.whites?.tone[key] ?? 0, out = (x: number) => far * Math.exp(-(((1 - at(x)) / 0.16) ** 2));
    const ray = (x: number, y: number) => inkNoise2(71, (Math.atan2((y - cy) / ry, (x - cx) / rx) * 9) / Math.PI * 2.4, r(x, y) * 1.4) - 0.5, [lx, ly] = e.lights[0], lw = Math.hypot(lx - cx, ly - cy) || 1, ux = (lx - cx) / lw, uy = (ly - cy) / lw;
    // away from its first light the iris is lit through; the lashes' shadow takes its upper third
    const through = (x: number, y: number) => ss(-0.3, 0.95, -((x - cx) / rx) * ux - ((y - cy) / ry) * uy), lash = (x: number, y: number) => ss(face.iris.lash * 1.5, face.iris.lash * 0.35, y - up(x));
    const pupil = (x: number, y: number) => ss(P + 0.22, P - 0.16, Math.hypot((x - cx - 0.04 * rx * ux) / rx, (y - cy + 0.1 * ry) / ry));
    const inkAt = (x: number, y: number) => {
      const q = r(x, y), I = iris(x, y), thr = through(x, y), body = lerp(face.iris.ink, face.iris.ink * face.iris.foot, thr) * (1 + (face.iris.rays ?? 0.3) * ray(x, y) * ss(0.35, 0.7, q)) + 0.2 * ss(0.62, 0.96, q) * (1 - 0.5 * thr);
      const full = 1 - (1 - clamp(body)) * (1 - 0.84 * pupil(x, y)) * (1 - 0.95 * lash(x, y)) * (1 - (face.iris.rim ?? 0) * ss(0.76, 0.9, q));
      return (I * clamp(full, 0, 0.97) + (1 - I) * (0.055 + tone("ink") + 0.44 * shadow(x, y) + 0.06 * out(x) + 0.05 * corner(x) + (face.whites?.halo ?? 0.14) * Math.exp(-((Math.max(0, r(x, y) - 1) / 0.14) ** 2)))) * (1 - lit(x, y)) * mask(x, y);
    };
    h.lay("white", box, (x, y) => 0.96 * mask(x, y), { soft: 0.001 });
    h.lay("earth", box, (x, y) => (iris(x, y) * face.iris.earth * (1 - 0.5 * through(x, y)) + (1 - iris(x, y)) * (0.03 + tone("earth") + 0.16 * shadow(x, y) + 0.2 * out(x) + 0.42 * corner(x))) * (1 - lit(x, y)) * mask(x, y), { soft: 0.001 });
    h.lay("warm", box, (x, y) => ((1 - iris(x, y)) * (0.01 + tone("warm") + 0.05 * out(x) + 0.44 * corner(x)) + 0.05 * iris(x, y)) * (1 - lit(x, y)) * mask(x, y), { soft: 0.001 });
    h.lay("cool", box, (x, y) => ((1 - iris(x, y)) * (0.025 + tone("cool") + 0.06 * shadow(x, y)) + iris(x, y) * face.iris.cool * through(x, y)) * (1 - lit(x, y)) * mask(x, y), { soft: 0.001 });
    h.lay("ink", box, inkAt, { soft: 0.001 });
  }
  // under it: the lower lid's edge, found toward the outer corner
  const under = e.under ?? [0.35, 0.8], ink = typeof under === "function" ? under : (t: number) => lerp(under[0], under[1], ss(0.3, 0.8, t)), cut = e.shut && open < 1 ? gongbiEdge(lid.line.map(n => [n[0], n[1]] as const)) : null, foot = e.lower.filter(p => !cut || p[1] > cut(p[0])).map((p, i) => [p[0], p[1] + 0.007, (e.foot ?? 0.0045) * (0.5 + 0.5 * Math.sin((Math.PI * i) / (e.lower.length - 1)))] as const);
  if (foot.length > 2) h.stroke({ nodes: foot, tone: face.underLine, soft: e.footSoftness ?? 0.015, along: t => ink(t) * ss(0, 0.06, t) });
  // the fold, and the warmth that spreads from it
  h.stroke({ nodes: lid.fold.map(n => [n[0], n[1] - 0.002, n[2] * 2.6] as const), tone: face.foldGlow, soft: 0.034, along: t => ss(0, 0.2, t) * ss(1, 0.8, t) });
  if (e.gleam) h.lift({ nodes: lid.fold.map(n => [n[0], n[1] + n[2] + 0.011, 0.007] as const), soft: 0.012, along: t => ss(0, 0.2, t) * ss(1, 0.6, t) }, e.gleam * open, ["earth", "warm", "cool", "ink"]);
  h.stroke({ nodes: lid.fold, tone: face.foldLine, soft: e.foldSoftness ?? 0.013, along: t => ss(0, 0.14, t) * (1 - 0.45 * ss(0.6, 1, t)) * (0.4 + 0.6 * open) });
  h.stroke({ nodes: lid.line, tone: face.lidLine, soft: e.softness ?? 0.011, along: t => 1 - (1 - (e.wing ?? 0.38)) * ss(0.6, 0.95, t) });
  for (const [a, b, w, m] of e.lashes ?? []) { const p = lid.move(a, 1), dy = p[1] - a[1]; h.stroke({ nodes: [[p[0], p[1], w], [m ? m[0] : lerp(a[0], b[0], 0.55), (m ? m[1] : lerp(a[1], b[1], 0.5)) + dy * 0.9, w * 0.7], [b[0], b[1] + dy * 0.8, w * 0.1]], tone: face.lidLine, soft: 0.005, along: t => (m ? 1 : 0.9 - 0.3 * t) }); }
}
function paintBrow(h: GongbiHand, face: GongbiFace, b: GongbiBrow, seed: number): void {
  const top = gongbiEdge(b.top), bottom = gongbiEdge(b.bottom), h0 = b.top[0][0], h1 = b.top[b.top.length - 1][0], soft = b.soft ?? 0.016, along = b.along ?? (() => 1), hairs = b.hairs ?? 0.3, dir = Math.sign(h1 - h0);
  const ring = h.shape([...b.top, ...[...b.bottom].reverse()].map((p, i) => [p[0], p[1] + (i < b.top.length ? -soft * 2 : soft * 2)] as const));
  const tone = (x: number, y: number) => {
    const t = (x - h0) / (h1 - h0), a = top(x), c = bottom(x), th = Math.max(0.002, c - a), s = Math.min(soft, th * 0.6);
    const k = s * (1 + 0.9 * ss(0.5, 0, t)), edge = ss(-k * 0.6, k, y - a) * ss(-s * 0.6, s, c - y) * ss(-0.02, 0.1, t), v = (y - a) / th;
    // hairs: they leave the lower edge and lie over toward the tail
    const lean = x * dir - (0.05 + 0.2 * t) * (1 - v), n = inkNoise2(seed + 5, lean * 64, v * 1.2 + t * 2) * 0.6 + inkNoise2(seed + 6, lean * 130, v * 1.6 + 7) * 0.4;
    return b.tone * along(t) * edge * lerp(b.upper ?? 0.8, 1, ss(0, b.lower === undefined ? 0.8 : 0.3, v)) * lerp(1, b.lower ?? 1, ss(0.4, 1, v)) * (1 + hairs * (n - 0.5) * 2);
  };
  h.lay("ink", ring, (x, y) => tone(x, y) * (face.browLine.ink ?? 0), { soft: 0.004 });
  h.lay("earth", ring, (x, y) => tone(x, y) * (face.browLine.earth ?? 0), { soft: 0.004 });
  for (const [a, c, w] of b.loose ?? []) h.stroke({ nodes: [[a[0], a[1], w * 0.6], [lerp(a[0], c[0], 0.5), lerp(a[1], c[1], 0.5), w], [c[0], c[1], w * 0.1]], tone: face.browLine, soft: 0.005 });
}
function paintMouth(h: GongbiHand, face: GongbiFace, m: GongbiMouth, seed: number): void {
  const top = gongbiEdge(m.upper), mid = gongbiEdge(m.parting.map(n => [n[0], n[1]] as const)), low = gongbiEdge(m.lower), N = m.upper[0][0], F = m.upper[m.upper.length - 1][0], soft = m.soft ?? 0.02, tone = m.tone ?? 1, near = m.near ?? 0.2;
  const way = (x: number) => (x - N) / (F - N), ends = (x: number) => ss(0, near, way(x)) * ss(1, 1 - (m.far ?? 0.1), way(x));
  const ring = h.shape([...m.upper.map(p => [p[0], p[1] - soft] as const), ...[...m.lower].reverse().map(p => [p[0], p[1] + soft] as const)]);
  const lights = (x: number, y: number) => { let s = 0; for (const [a, b, u, v, turn, k] of m.lights ?? []) { const r = (turn * Math.PI) / 180, c = Math.cos(r), n = Math.sin(r), p = ((x - a) * c + (y - b) * n) / u, q = (-(x - a) * n + (y - b) * c) / v, g = inkNoise2(seed + 9, x * 26, y * 34); s = Math.max(s, k * Math.exp(-((p * p + q * q) ** 1.2)) * (0.6 + 0.4 * ss(0.3, 0.6, g))); } return s; };
  const red = (x: number, y: number) => {
    const a = top(x), c = mid(x), d = low(x), u = y < c, th = u ? c - a : d - c, v = th > 0.003 ? (u ? (c - y) / th : (y - c) / th) : 2;
    const edge = u ? ss(-soft * 0.5, soft * 1.1, y - a) * ss(0, near * 2.4, way(x)) : ss(-soft * 0.6, soft * 1.5, d - y);
    const line = Math.exp(-((y - c) ** 2) / (2 * (u ? 0.016 : 0.022) ** 2)), streak = inkNoise2(seed + 3, (x - 0.3 * (y - c)) * 50, y * 16) - 0.5;
    return tone * ends(x) * edge * clamp((u ? (m.above ?? 0.82) - 0.16 * clamp(v) : 0.88 - (m.fall ?? 0.12) * clamp(v)) + 0.2 * line + 0.05 * streak) * (1 - lights(x, y));
  };
  // the skin is let out from under the colour: a red over a beige is dull
  const bare = (x: number, y: number) => { const a = top(x), d = low(x); return ends(x) * ss(0, soft * 1.6, y - a) * ss(m.inset ?? 0, (m.inset ?? 0) + soft * 1.8, d - y) * (y < mid(x) ? ss(0, near * 2.4, way(x)) : 1); };
  for (const key of ["earth", "warm", "cool", "ink"] as const) h.wipe(key, ring, (x, y) => (m.bare ?? 0.8) * bare(x, y));
  h.lay("earth", ring, (x, y) => (m.earth ?? 0.1) * red(x, y), { soft: 0.004 });
  h.lay("warm", ring, red, { soft: 0.004 });
  h.lay("ink", ring, (x, y) => (m.ink ?? 0.1) * ends(x) * (Math.exp(-((y - mid(x)) ** 2) / (2 * 0.014 ** 2)) + 0.25 * ss(0.4, 0.1, way(x))) * ss(-0.004, 0.02, y - top(x)) * ss(-0.004, 0.02, low(x) - y), { soft: 0.004 });
  h.stroke({ nodes: m.parting, tone: face.mouthLine, soft: 0.006, along: t => lerp(m.line ?? 0.62, 1, Math.max(ss(0.16, 0, t), ss(0.84, 1, t))) });
}

/** The whole face within its outline. `open` shuts the lids (1 open, 0 shut). */
export function paintGongbiFace(f: InkRisoPen, head: InkHead, face: GongbiFace, open = 1): void {
  const h = gongbiHand(f, head, face.plates, face.seed ?? 1), o0 = head.level(0, 0), under = face.under ?? 0.16, pick = (q: readonly PenPoint[], n: number) => Array.from({ length: n }, (_, i) => q[Math.round((i / (n - 1)) * (q.length - 1))]);
  const within = f.shape([...pick(head.contour, 30), ...pick(head.jaw, 18).slice(1), ...[...head.hairline].reverse().slice(1).map((q, i, all) => { const k = 1 + under * ss(0, 0.2, i / (all.length - 1)) * ss(1, 0.8, i / (all.length - 1)); return [o0[0] + (q[0] - o0[0]) * k, o0[1] + (q[1] - o0[1]) * k] as const; })].map(q => [q[0], q[1]] as const)), seed = 40 + (face.seed ?? 1) * 11;
  f.knock(within);
  gongbiSkin(h, within, face.skin);
  gongbiTints(h, within, face.tints);
  const lidTint = (e: GongbiEye, t: GongbiTint): GongbiTint => (open < 1 && t.at ? { ...t, at: [t.at[0], lidded(e, open).move(t.at, 0.4)[1]] } : open < 1 && t.plane && t.follow ? { ...t, plane: t.plane.map(p => lidded(e, open).move(p, t.follow!)) } : t);
  if (face.lids) for (const side of ["near", "far"] as const) gongbiTints(h, within, face.lids[side].map(t => lidTint(face.eyes[side], t)));
  paintBrow(h, face, face.brows.near, seed); paintBrow(h, face, face.brows.far, seed + 3);
  for (const line of face.lines) h.stroke(line);
  paintEye(f, h, face, face.eyes.near, open); paintEye(f, h, face, face.eyes.far, open);
  paintMouth(h, face, face.mouth, seed + 7);
  // the outline, one stroke from under the hair at the far temple over the chin, and on up to the lobe
  const run = (pts: readonly PenPoint[], n: number, w: (t: number) => number): GongbiNode[] => Array.from({ length: n }, (_, i) => { const q = head.fromLevel(pts[Math.round((i / (n - 1)) * (pts.length - 1))]); return [q[0], q[1], face.outline.half * w(i / (n - 1))] as const; });
  if (face.outline.glow) h.stroke({ nodes: run(head.jaw, 24, t => 2.6 * ss(0, 0.2, t) * ss(1, 0.8, t)).map(([x, y, w]) => [x, y - 1.4 * w, w] as const), tone: face.outline.glow, soft: 0.03 });
  h.stroke({ nodes: run([...head.contour, ...head.jaw.slice(1, 4)], 34, face.outline.far), tone: face.outline.tone, soft: 0.006 });
  h.stroke({ nodes: run(head.jaw, 34, face.outline.jaw), tone: face.outline.tone, soft: 0.006 });
}

export interface GongbiEar {
  plates: GongbiPlates;
  skin: readonly GongbiPlace[];
  /** The valley behind the rim, the bowl, its depth by the flap, and the outline. */
  valley: GongbiMix; bowl: GongbiMix; deep: GongbiMix; line: GongbiMix;
  /** Half a width of the outline (default 0.004), and how far round it goes: 1 goes on up the front of the lobe, less leaves the lobe to run into the cheek. */
  half?: number; front?: number;
  /** How full the lines inside it are (default 1). */
  fine?: number;
  /** What lies within the outline drawn by hand, level frame, instead of the rim, the valley and the bowl the head was posed with. */
  drawn?: { tints: readonly GongbiTint[]; lines: readonly GongbiLine[] };
  seed?: number;
}
/** The near ear of a head posed with `side`: a rim, a valley, a bowl. Returns the foot of its lobe, pen units. */
export function paintGongbiEar(f: InkRisoPen, head: InkHead, ear: GongbiEar): PenPoint {
  const lobe = head.ear.reduce((a, q) => (q[1] > a[1] ? q : a)), parts = head.earParts;
  if (!parts) return lobe;
  const fine = ear.fine ?? 1, h = gongbiHand(f, head, ear.plates, ear.seed ?? 9), lv = (q: readonly PenPoint[]) => q.map(p => head.fromLevel(p)), sample = (q: readonly PenPoint[], n: number) => Array.from({ length: n }, (_, i) => q[Math.round((i / (n - 1)) * (q.length - 1))]), shape = f.shape(sample(head.ear, 30));
  const path = (q: readonly PenPoint[], half: number, w: (t: number) => number): GongbiNode[] => sample(lv(q), 14).map((p, i) => [p[0], p[1], half * w(i / 13)] as const), leaf = (t: number) => Math.sin(Math.PI * t) ** 0.7, bowl = lv(parts.bowl), xs = bowl.map(p => p[0]), ys = bowl.map(p => p[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  h.melt(shape, gongbiField(ear.skin), 1, { soft: 0.01 });
  if (ear.drawn) {
    gongbiTints(h, shape, ear.drawn.tints);
    for (const line of ear.drawn.lines) h.stroke(line);
  } else {
    h.stroke({ nodes: path(parts.rim, 0.03, leaf), tone: ear.valley, soft: 0.04, along: t => 0.9 - 0.5 * t });
    h.stroke({ nodes: path(parts.rim, 0.004 * fine, leaf), tone: ear.valley, soft: 0.012, along: t => Math.min(1, 0.8 * fine) - 0.4 * t });
    // the bowl: open toward the top, its edge found where the fold turns in and down to the notch
    for (const key of KEYS) { const v = ear.bowl[key]; if (v) h.lay(key, h.shape(bowl), (x, y) => v * (0.35 + 0.65 * ss(x0 - 0.02, x1, x)) * ss(y0 - 0.06, y0 + 0.16, y), { soft: (_x, y) => lerp(0.07, 0.016, ss(y0, y1, y)), mottle: 0.14, cloud: 0.1 }); }
    h.stroke({ nodes: path(parts.flap, 0.01, leaf), tone: ear.deep, soft: 0.024, along: t => 0.6 * ss(0, 0.5, t) });
    // the notch: a bean, deepest by the flap, running up into the bowl
    const on = (u: number, v: number): PenPoint => [lerp(x0, x1, u), lerp(y0, y1, v)], bean = [on(0.1, 0.84), on(0.04, 0.74), on(0.16, 0.66), on(0.4, 0.6), on(0.72, 0.46), on(0.62, 0.62), on(0.4, 0.76), on(0.22, 0.86)], foot = on(0.2, 0.76);
    for (const key of KEYS) { const v = ear.deep[key]; if (v) h.lay(key, h.shape(bean), (x, y) => v * (0.45 + 0.55 * Math.exp(-(((x - foot[0]) / 0.12) ** 2) - ((y - foot[1]) / 0.1) ** 2)), { soft: 0.018, mottle: 0.2, cloud: 0.06, rim: 0.3, rimWidth: 0.014, seed: 77 }); }
    h.stroke({ nodes: path(parts.fold, 0.0035 * fine, leaf), tone: ear.valley, soft: 0.014, along: t => Math.min(1, 0.7 * fine) * ss(0, 0.2, t) * ss(1, 0.7, t) });
  }
  h.stroke({ nodes: path(head.ear, ear.half ?? 0.004, t => 0.4 + 0.5 * ss(0.1, 0.5, t) + 0.5 * Math.exp(-(((t - 0.82) / 0.1) ** 2)) - 0.5 * ss(0.94, 1, t)), tone: ear.line, soft: 0.007, along: t => ss(0.02, 0.2, t) * ss(ear.front ?? 1.2, (ear.front ?? 1.2) - 0.08, t) });
  return lobe;
}
