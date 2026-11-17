/**
 * FOOD1 still-life kit, produce: fruit, vegetables, herbs, mushrooms, grains and nuts as meshes with their surfaces,
 * built from silhouette profiles traced from reference photographs (widths and heights in proportion, sizes in mm).
 *
 * Every builder is seeded, so a fruit's asymmetry, a bruise or the lean of a stem is the same every time, and
 * different seeds give different, natural-looking individuals.
 */
import { blade, displace, ellipsoid, emptyMesh, lathe, merge, reseed, rng, slab, sweep, transform, warp } from "./food-mesh";
import type { Mesh, Placement, V3 } from "./food-mesh";
import type { Part, SurfaceFn } from "./food-scene";
import { RestingSurface, dewOn, profile } from "./food-stage";
import type { Vessel } from "./food-stage";
import { C, cutFace, leaf, mixInto, paperSkin, skin, sst, stalk } from "./food-surfaces";
import { bananaSolid } from "./food-textures";
import type { CutSpec, SkinSpec } from "./food-surfaces";
import { fbm3 } from "../anatomy/foundation-raster";

export const part = (name: string, mesh: Mesh, surface: SurfaceFn, o: Partial<Part> = {}): Part => ({ name, mesh, surface, ...o });
let groupIds = 0;
/** Mark parts as one piece (they settle together). */
export const grouped = (parts: Part[]): Part[] => { const g = ++groupIds; return parts.map(p => ({ ...p, group: g })); };

// ---- Fruit silhouettes (radius 1 = half the widest width; y from the resting point) ---------------------------------------------

export type FruitShape = "pepper" | "apple" | "pear" | "round" | "oblate" | "lemon" | "lime" | "fig" | "strawberry" | "tomato" | "pumpkin" | "onion" | "garlic" | "egg" | "avocado" | "peach" | "plum" | "persimmon" | "pomegranate" | "kiwi" | "mango" | "cherry" | "aubergine" | "potato" | "beet" | "radish" | "turnip" | "melon" | "coconut" | "passion" | "lychee" | "citrus-large";
const SHAPES: Record<FruitShape, readonly (readonly [number, number])[]> = {
  pepper: [[0, 0.14], [0.3, 0.03], [0.55, 0.08], [0.8, 0.02], [0.97, 0.3], [1, 0.8], [0.96, 1.25], [0.82, 1.52], [0.42, 1.6], [0.14, 1.52], [0, 1.48]],
  apple: [[0, 0.17], [0.15, 0.1], [0.32, 0.03], [0.5, 0], [0.72, 0.1], [0.9, 0.38], [1, 0.78], [0.985, 1.12], [0.87, 1.46], [0.64, 1.66], [0.4, 1.7], [0.2, 1.58], [0.07, 1.45], [0, 1.42]],
  pear: [[0, 0.1], [0.22, 0.03], [0.5, 0], [0.8, 0.12], [0.97, 0.42], [1, 0.78], [0.9, 1.12], [0.66, 1.42], [0.52, 1.72], [0.46, 2.0], [0.36, 2.25], [0.16, 2.38], [0, 2.38]],
  round: [[0, 0.03], [0.35, 0.05], [0.72, 0.28], [0.95, 0.68], [1, 1.0], [0.95, 1.32], [0.72, 1.72], [0.35, 1.95], [0.08, 1.98], [0, 1.96]],
  oblate: [[0, 0.05], [0.38, 0.04], [0.76, 0.22], [0.97, 0.55], [1, 0.82], [0.94, 1.12], [0.72, 1.42], [0.36, 1.6], [0.08, 1.6], [0, 1.58]],
  lemon: [[0, 0], [0.13, 0.05], [0.26, 0.18], [0.6, 0.42], [0.9, 0.82], [1, 1.28], [0.9, 1.74], [0.6, 2.14], [0.26, 2.38], [0.13, 2.5], [0, 2.56]],
  lime: [[0, 0.02], [0.3, 0.06], [0.7, 0.28], [0.96, 0.72], [1, 1.04], [0.94, 1.4], [0.68, 1.78], [0.3, 1.98], [0.1, 2.04], [0, 2.06]],
  fig: [[0, 0.06], [0.42, 0.02], [0.8, 0.2], [1, 0.56], [0.96, 0.92], [0.72, 1.28], [0.42, 1.58], [0.22, 1.82], [0.12, 2.0], [0, 2.04]],
  strawberry: [[0, 0], [0.22, 0.12], [0.52, 0.42], [0.84, 0.88], [1, 1.28], [0.96, 1.6], [0.72, 1.8], [0.32, 1.86], [0, 1.82]],
  tomato: [[0, 0.1], [0.4, 0.02], [0.76, 0.12], [0.97, 0.4], [1, 0.62], [0.93, 0.94], [0.66, 1.14], [0.3, 1.18], [0.1, 1.1], [0, 1.08]],
  pumpkin: [[0, 0.16], [0.3, 0.05], [0.7, 0.1], [0.95, 0.34], [1, 0.56], [0.92, 0.84], [0.62, 1.02], [0.26, 1.0], [0.1, 0.92], [0, 0.9]],
  onion: [[0, 0.03], [0.3, 0.04], [0.7, 0.2], [0.95, 0.5], [1, 0.78], [0.86, 1.12], [0.5, 1.42], [0.2, 1.64], [0.08, 1.86], [0.04, 2.0], [0, 2.02]],
  garlic: [[0, 0.08], [0.3, 0.02], [0.72, 0.14], [0.96, 0.42], [1, 0.66], [0.84, 0.98], [0.5, 1.22], [0.22, 1.42], [0.1, 1.62], [0, 1.66]],
  egg: [[0, 0], [0.5, 0.06], [0.85, 0.3], [1, 0.62], [0.96, 0.98], [0.76, 1.28], [0.42, 1.48], [0, 1.52]],
  avocado: [[0, 0.05], [0.5, 0], [0.9, 0.24], [1, 0.6], [0.9, 1.0], [0.66, 1.34], [0.46, 1.6], [0.26, 1.76], [0, 1.82]],
  peach: [[0, 0.06], [0.4, 0.04], [0.8, 0.24], [0.99, 0.66], [1, 1.0], [0.9, 1.4], [0.6, 1.74], [0.28, 1.88], [0.06, 1.86], [0, 1.82]],
  plum: [[0, 0.04], [0.36, 0.04], [0.74, 0.24], [0.97, 0.66], [1, 1.06], [0.9, 1.5], [0.6, 1.86], [0.26, 2.02], [0.06, 2.0], [0, 1.98]],
  persimmon: [[0, 0.12], [0.36, 0.03], [0.76, 0.1], [0.98, 0.36], [1, 0.62], [0.95, 0.88], [0.78, 1.06], [0.42, 1.14], [0.12, 1.1], [0, 1.08]],
  pomegranate: [[0, 0.06], [0.36, 0.04], [0.76, 0.22], [0.98, 0.66], [1, 1.02], [0.88, 1.42], [0.54, 1.72], [0.28, 1.86], [0.24, 2.0], [0, 2.0]],
  kiwi: [[0, 0.02], [0.4, 0.06], [0.82, 0.38], [1, 0.9], [1, 1.5], [0.84, 2.0], [0.42, 2.3], [0.08, 2.36], [0, 2.36]],
  mango: [[0, 0.02], [0.36, 0.06], [0.76, 0.3], [0.98, 0.8], [1, 1.2], [0.86, 1.72], [0.56, 2.08], [0.2, 2.24], [0, 2.24]],
  cherry: [[0, 0.05], [0.4, 0.04], [0.8, 0.26], [1, 0.74], [0.98, 1.12], [0.78, 1.5], [0.42, 1.74], [0.12, 1.7], [0, 1.6]],
  aubergine: [[0, 0.05], [0.5, 0.03], [0.9, 0.3], [1, 0.75], [0.92, 1.4], [0.7, 2.1], [0.55, 2.8], [0.4, 3.3], [0.18, 3.5], [0, 3.52]],
  potato: [[0, 0.06], [0.5, 0.02], [0.9, 0.3], [1, 0.7], [0.96, 1.06], [0.6, 1.36], [0, 1.4]],
  beet: [[0, -0.6], [0.05, -0.2], [0.24, 0.12], [0.7, 0.38], [0.98, 0.8], [1, 1.12], [0.86, 1.46], [0.5, 1.68], [0.2, 1.72], [0, 1.72]],
  radish: [[0, -0.9], [0.04, -0.4], [0.3, 0.12], [0.8, 0.5], [1, 0.92], [0.9, 1.34], [0.5, 1.6], [0.15, 1.66], [0, 1.66]],
  turnip: [[0, -0.7], [0.05, -0.3], [0.36, 0.06], [0.84, 0.36], [1, 0.74], [0.98, 1.0], [0.7, 1.16], [0.3, 1.22], [0, 1.24]],
  melon: [[0, 0.03], [0.4, 0.06], [0.82, 0.32], [1, 0.84], [1, 1.24], [0.84, 1.72], [0.42, 2.0], [0, 2.04]],
  coconut: [[0, 0.04], [0.42, 0.03], [0.84, 0.3], [1, 0.8], [0.96, 1.24], [0.72, 1.62], [0.36, 1.84], [0, 1.88]],
  passion: [[0, 0.03], [0.4, 0.05], [0.82, 0.32], [1, 0.84], [0.98, 1.3], [0.74, 1.72], [0.34, 1.92], [0, 1.94]],
  lychee: [[0, 0.04], [0.4, 0.05], [0.82, 0.3], [1, 0.84], [0.96, 1.3], [0.7, 1.68], [0.32, 1.84], [0, 1.86]],
  "citrus-large": [[0, 0.04], [0.4, 0.04], [0.8, 0.22], [0.99, 0.6], [1, 0.92], [0.94, 1.28], [0.72, 1.6], [0.36, 1.78], [0.08, 1.8], [0, 1.78]],
};
const PROFILE_CACHE = new Map<FruitShape, (v: number) => readonly [number, number]>();
const shapeProfile = (s: FruitShape) => { let p = PROFILE_CACHE.get(s); if (!p) { p = profile(SHAPES[s]); PROFILE_CACHE.set(s, p); } return p; };
/** The top of a fruit shape (y at the stem end, in radii). */
export const shapeTop = (s: FruitShape) => SHAPES[s][SHAPES[s].length - 1][1];
export const shapeHeight = (s: FruitShape) => Math.max(...SHAPES[s].map(p => p[1])) - Math.min(...SHAPES[s].map(p => p[1]));

export interface BodyOptions {
  /** Lobes or ribs round the fruit: count and depth (tomato 5–8, pumpkin 10–14, garlic cloves 8), deepest mid-body
   *  (`"middle"`) or at the shoulders and the base (`"ends"`, bell peppers). */
  ribs?: number; ribDepth?: number; ribProfile?: "middle" | "ends";
  /** A suture crease down one side (peaches, plums, cherries, mangoes) 0…1. */
  suture?: number;
  /** Natural asymmetry, mm. */
  wobble?: number;
  /** Lumps (potatoes, ginger) mm. */
  lumps?: number;
  /** Squash the body front to back (mangoes, kiwis). */
  squash?: number;
  /** Bend the top sideways (mangoes, bananas), radii. */
  lean?: number;
  seed?: number;
  nu?: number; nv?: number;
}
/** A fruit or vegetable body of a given half-width R (mm), standing on its base at the origin. */
export function fruitBody(shape: FruitShape, R: number, o: BodyOptions = {}): Mesh {
  const prof = shapeProfile(shape), seed = o.seed ?? 1, ribs = o.ribs ?? 0, rd = o.ribDepth ?? 0.06, sut = o.suture ?? 0;
  let m = lathe(v => { const [r, y] = prof(v); return [r * R, y * R]; }, {
    nu: o.nu ?? 72, nv: o.nv ?? 56, squash: o.squash,
    modulate: (th, v) => {
      let k = 1;
      if (ribs) k *= 1 - rd * (1 - Math.pow(Math.abs(Math.cos((th * ribs) / 2)), 0.6)) * (o.ribProfile === "ends" ? 0.35 + 0.65 * Math.max(Math.exp(-((v - 0.08) ** 2) / 0.012), Math.exp(-((v - 0.85) ** 2) / 0.02)) : Math.sin(Math.min(1, v * 1.1) * Math.PI));
      if (sut) { const d = Math.atan2(Math.sin(th), Math.cos(th)); k *= 1 - sut * 0.05 * Math.exp(-(d * d) / 0.02) * Math.sin(v * Math.PI); }
      return k;
    },
  });
  if (o.wobble || o.lumps) m = displace(m, (ob) => (o.wobble ?? 0) * fbm3(seed, ob[0] / (R * 1.2), ob[1] / (R * 1.2), ob[2] / (R * 1.2), 2) + (o.lumps ?? 0) * fbm3(seed + 7, ob[0] / (R * 0.45), ob[1] / (R * 0.45), ob[2] / (R * 0.45), 3));
  if (o.lean) { const top = shapeTop(shape) * R; m = warp(m, p => [p[0] + (o.lean ?? 0) * R * Math.pow(Math.max(0, p[1]) / top, 2), p[1], p[2]]); }
  // re-seat it so its lowest point touches y = 0
  let minY = Infinity;
  for (let i = 1; i < m.pos.length; i += 3) minY = Math.min(minY, m.pos[i]);
  for (let i = 1; i < m.pos.length; i += 3) m.pos[i] -= minY;
  return m;
}

/** A short woody stem leaving the top of a fruit (`top` mm high), leaning. */
export function stem(top: number, len: number, thick: number, seed = 1, curl = 0.3): Mesh {
  const r = rng(seed), lx = (r() - 0.5) * len * curl, lz = (r() - 0.5) * len * curl;
  return sweep([[0, top - len * 0.35, 0], [lx * 0.3, top + len * 0.35, lz * 0.3], [lx, top + len * 0.75, lz]], { radius: t => thick * (1.25 - 0.45 * t) * (t > 0.96 ? 0.7 : 1), nu: 10, nv: 16 });
}
/** A simple leaf blade: length, width ratio, droop and a twist. */
export function leafMesh(len: number, widthRatio = 0.4, droop = 0.25, seed = 1, shape: "oval" | "lance" | "heart" | "round" = "oval"): Mesh {
  const r = rng(seed), w = len * widthRatio;
  const hw = (s: number) => {
    if (shape === "lance") return w * 0.5 * Math.pow(Math.sin(Math.PI * Math.min(1, s)), 0.9) * (1 - 0.4 * s);
    if (shape === "heart") return w * 0.5 * Math.pow(Math.sin(Math.PI * Math.min(1, s * 0.92 + 0.08)), 0.7) * (1.1 - 0.5 * s);
    if (shape === "round") return w * 0.5 * Math.pow(Math.sin(Math.PI * Math.min(1, s)), 0.55);
    return w * 0.5 * Math.pow(Math.sin(Math.PI * Math.min(1, s)), 0.75) * (1 - 0.25 * s);
  };
  const tw = (r() - 0.5) * 0.6;
  return blade({ length: len, halfWidth: hw, lift: (s, ww) => ww * ww * w * 0.25 + Math.sin(s * 7 + ww * 2 + seed) * len * 0.012 + ww * tw * s * w * 0.4, bend: s => -droop * len * s * s, nu: 10, nv: 20 });
}
/** A calyx or crown of `n` pointed sepals radiating from the top (strawberry, tomato, persimmon, aubergine, pomegranate). */
export function calyx(n: number, len: number, width: number, top: number, droop = 0.4, seed = 1, rise = 0): Mesh {
  const r = rng(seed), ms: Mesh[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 360 + (r() - 0.5) * 18, L = len * (0.8 + r() * 0.4);
    const sep = blade({ length: L, halfWidth: s => width * 0.5 * Math.pow(Math.sin(Math.PI * Math.min(1, s * 0.9 + 0.1)), 0.7) * (1 - 0.65 * s), lift: (_s, w) => w * w * width * 0.2, bend: s => (rise - droop) * L * s * s + Math.sin(s * 5 + i) * L * 0.03, nu: 6, nv: 12 });
    ms.push(transform(sep, { ry: a, at: [0, top, 0] }));
  }
  return merge(ms);
}

// ---- Whole fruit ----------------------------------------------------------------------------------------------------------------

export interface FruitSpec {
  shape: FruitShape; R: number; skin: SkinSpec; body?: BodyOptions;
  /** A surface to use instead of `skin` (a MATL1 food texture: `citrusPeel`, `tomatoSkin`, `pepperSkin` …). */
  surface?: SurfaceFn;
  stem?: { len: number; thick: number; colour?: string; green?: string; curl?: number } | null;
  leaves?: { count: number; len: number; colour?: string; shape?: "oval" | "lance" | "heart" | "round" } | null;
  calyx?: { n: number; len: number; width: number; colour?: string; droop?: number; rise?: number; dried?: boolean } | null;
  dew?: number;
  /** Lie the fruit on its side (degrees about Z) and turn it about Y. */
  lie?: number; turn?: number;
  at?: V3;
  seed?: number;
  /** A pale crown of seeds on the skin (strawberries). */
  achenes?: boolean;
}
/** A whole fruit or vegetable with its stem, leaves, calyx and dew, as parts. */
export function fruit(sp: FruitSpec): Part[] {
  const seed = sp.seed ?? 1, R = sp.R, top = shapeTop(sp.shape) * R, out: Part[] = [];
  const body = fruitBody(sp.shape, R, { seed, ...sp.body });
  const pl: Placement = { rz: sp.lie ?? 0, ry: sp.turn ?? 0, at: sp.at ?? [0, 0, 0] };
  // a lying fruit is re-seated on the surface; its stem, leaves and calyx move with it
  const bodyM = transform(body, pl);
  let dy = 0;
  if (sp.lie) { let minY = Infinity; for (let i = 1; i < bodyM.pos.length; i += 3) minY = Math.min(minY, bodyM.pos[i]); dy = (sp.at?.[1] ?? 0) - minY; for (let i = 1; i < bodyM.pos.length; i += 3) bodyM.pos[i] += dy; }
  const attach = (m: Mesh) => { const mm = transform(m, pl); for (let i = 1; i < mm.pos.length; i += 3) mm.pos[i] += dy; return mm; };
  const skinFn = sp.surface ?? skin({ ...sp.skin, seed: (sp.skin.seed ?? 0) + seed });
  out.push(part(`${sp.shape}`, bodyM, sp.achenes ? achenes(skinFn) : skinFn, { k: {} }));
  if (sp.stem) out.push(part("stem", attach(stem(top, sp.stem.len, sp.stem.thick, seed + 3, sp.stem.curl ?? 0.3)), stalk(sp.stem.colour, sp.stem.green)));
  if (sp.calyx) out.push(part("calyx", attach(calyx(sp.calyx.n, sp.calyx.len, sp.calyx.width, top - 0.5, sp.calyx.droop ?? 0.4, seed + 5, sp.calyx.rise ?? 0)), sp.calyx.dried ? stalk("#5b4a2c", "#6e6a3a") : leaf(sp.calyx.colour ?? "#4d7a2a", { veins: 2, gloss: 0.3 })));
  if (sp.leaves) for (let i = 0; i < sp.leaves.count; i++) {
    const r = rng(seed + 11 + i), lm = leafMesh(sp.leaves.len * (0.8 + r() * 0.35), 0.42, 0.25, seed + i, sp.leaves.shape ?? "oval");
    out.push(part("leaf", attach(transform(lm, { rz: 10 + r() * 25, ry: i * 140 + r() * 40, at: [0, top + (sp.stem?.len ?? 4) * 0.5, 0] })), leaf(sp.leaves.colour ?? "#4a7a2c", { seed: seed + i })));
  }
  if (sp.dew) out.push(dewOn(bodyM, sp.dew, seed + 17));
  return grouped(out);
}
/** Strawberry achenes: little yellow seeds in pits over a skin surface. */
function achenes(under: SurfaceFn): SurfaceFn {
  return (s, o) => {
    under(s, o);
    const p = s.o, ang = Math.atan2(p[2], p[0]), row = p[1] / 3.2, col = ang * 7 + (Math.floor(row) % 2) * 0.5, fr = Math.abs(row - Math.round(row)), fc = Math.abs(col - Math.round(col)), d = Math.hypot(fr, fc * 0.8);
    if (d < 0.22) { o.height -= (0.22 - d) * 2.2; if (d < 0.11) { o.albedo[0] = 0.75; o.albedo[1] = 0.55; o.albedo[2] = 0.12; o.height += 0.15; o.coat = 0.2; } else o.occl = 0.7; }
  };
}

/** Half of a fruit cut across its axis, lying cut-face up: a lower shell and the cut face (`cutFace`). */
export function halfFruit(shape: FruitShape, R: number, skinSp: SkinSpec, cut: Omit<CutSpec, "radius">, o: { at?: V3; turn?: number; tilt?: number; seed?: number; cutAt?: number; surface?: SurfaceFn } = {}): Part[] {
  const prof = shapeProfile(shape), seed = o.seed ?? 1, H = shapeHeight(shape), yc = (o.cutAt ?? 0.5) * H;
  // the shell below the cut
  let vCut = 0;
  for (let k = 0; k <= 200; k++) { if (prof(k / 200)[1] >= yc) { vCut = k / 200; break; } }
  const shell = lathe(v => { const [r, y] = prof(v * vCut); return [r * R, y * R]; }, { nu: 72, nv: 36 });
  const rc = prof(vCut)[0] * R * 0.985, face = slab({ outline: t => rc * (1 + 0.01 * Math.sin(t * 3 + seed)), top: (x, z) => yc * R + 0.3 * Math.pow(Math.hypot(x, z) / rc, 2), bottom: yc * R - 1, bevel: 0.6, nu: 72, nv: 30, noSide: true });
  const pl: Placement = { rx: o.tilt ?? 0, ry: o.turn ?? 0, at: o.at ?? [0, 0, 0] };
  return grouped([part("half", transform(shell, pl), o.surface ?? skin({ ...skinSp, seed: seed + (skinSp.seed ?? 0) })), part("cut face", transform(face, pl), cutFace({ ...cut, radius: rc, seed }))]);
}

/** Round slices (lemon wheels, tomato, cucumber coins, kiwi): `n` overlapping discs fanned along a line. */
export function slices(n: number, R: number, th: number, cut: Omit<CutSpec, "radius">, o: { at?: V3; spread?: number; tilt?: number; seed?: number; ry?: number } = {}): Part[] {
  const r = rng(o.seed ?? 1), ms: Mesh[] = [], at = o.at ?? [0, 0, 0];
  for (let i = 0; i < n; i++) {
    const s = slab({ outline: t => R * (1 + 0.02 * Math.sin(t * 5 + i)), top: () => th, bevel: Math.min(th * 0.4, 1.2), nu: 64, nv: 24 });
    ms.push(reseed(transform(s, { rx: o.tilt ?? 12, ry: (r() - 0.5) * 30, at: [at[0] + (i - (n - 1) / 2) * R * (o.spread ?? 0.75), at[1] + i * th * 0.55, at[2] + (r() - 0.5) * 4] }), [i * 50, 0, 0]));
  }
  const mesh = transform(merge(ms), { ry: o.ry ?? 0 });
  return [part("slices", mesh, cutFace({ ...cut, radius: R }))];
}

// ---- Clusters ---------------------------------------------------------------------------------------------------------------------

/** A bunch of grapes: berries packed round a branching stalk, narrowing to a point, lying on its side. */
export function grapeBunch(colour: SkinSpec, berryR = 9, count = 34, seed = 1, at: V3 = [0, 0, 0]): Part[] {
  const r = rng(seed), berries: Mesh[] = [], L = berryR * 9.5, stalks: Mesh[] = [];
  for (let i = 0; i < count; i++) {
    const t = Math.pow(r(), 0.8), radius = (1 - t * 0.75) * berryR * 2.6, a = r() * Math.PI * 2, x = -L / 2 + t * L, y = Math.sin(a) * radius * 0.55 + radius * 0.55, z = Math.cos(a) * radius;
    const rr = berryR * (0.85 + r() * 0.25), b = transform(ellipsoid(rr, rr * 1.08, rr, 22, 16), { rz: 90 + (r() - 0.5) * 50, ry: r() * 360, at: [x, y + rr * 0.9, z] });
    berries.push(reseed(b, [i * 31, i * 7, 0]));
    stalks.push(sweep([[x, y + rr * 0.9, z], [x * 0.9 - 4, (y + rr) * 0.7 + 4, z * 0.5], [-L / 2 + t * L * 0.6, berryR * 1.6, 0]], { radius: () => 0.9, nu: 6, nv: 6 }));
  }
  stalks.push(sweep([[-L / 2 - 4, berryR * 1.6, 0], [-L / 2 - 14, berryR * 1.9, 2], [-L / 2 - 24, berryR * 2.6, 6]], { radius: t => 2.2 - t * 0.6, nu: 8, nv: 10 }));
  const pl: Placement = { ry: (r() - 0.5) * 40, at };
  // berries sit on the table: drop the bunch so its lowest berry touches
  const bm = transform(merge(berries), pl), sm = transform(merge(stalks), pl);
  let minY = Infinity; for (let i = 1; i < bm.pos.length; i += 3) minY = Math.min(minY, bm.pos[i]);
  for (const m of [bm, sm]) for (let i = 1; i < m.pos.length; i += 3) m.pos[i] += at[1] - minY;
  return grouped([part("grapes", bm, skin({ ...colour, seed })), part("stalk", sm, stalk("#6a5a34", "#7d7f3e"))]);
}

/**
 * Small things heaped in a vessel or on a board (berries, olives, nuts, dumplings, potatoes): each piece is dropped
 * from above, at a spot within `areaR` of the centre, onto the floor and the pieces already there, and kept inside
 * the vessel's wall (`settle`'s resting surface).
 */
export function heap(make: (i: number, r: () => number) => Mesh, count: number, pieceR: number, areaR: number, baseY: number, seed = 1, v: Vessel | null = null): Mesh {
  const r = rng(seed), out: Mesh[] = [], field = new RestingSurface(v ?? { parts: [], floorY: baseY, rimY: baseY, rimR: areaR + pieceR * 2, innerR: () => areaR + pieceR * 2, frame: 0 }, (v ? v.rimR : areaR) * 1.2 + 120, 1.2);
  for (let i = 0; i < count; i++) {
    const piece = reseed(transform(make(i, r), { ry: r() * 360, rx: (r() - 0.5) * 30 }), [i * 37, 0, i * 11]);
    // dropped at a few spots, it rolls to the lowest it can reach (no towers)
    let best: Mesh | null = null, bestY = Infinity;
    for (let t = 0; t < 8; t++) {
      const a = r() * Math.PI * 2, d = Math.sqrt(r()) * areaR;
      let m = transform(piece, { at: [Math.cos(a) * d, baseY + 200, Math.sin(a) * d] });
      for (let k = 0; k < 5; k++) {
        const e = field.outside(m);
        if (e > 0) { let cx = 0, cz = 0; for (let q = 0; q < m.pos.length; q += 3) { cx += m.pos[q]; cz += m.pos[q + 2]; } const n = m.pos.length / 3, dd = Math.hypot(cx / n, cz / n) || 1; m = transform(m, { at: [(-cx / n / dd) * (e + 0.3), 0, (-cz / n / dd) * (e + 0.3)] }); }
        m = transform(m, { at: [0, field.lift(m), 0] });
        if (field.outside(m) <= 0) break;
      }
      let cy = 0; for (let q = 1; q < m.pos.length; q += 3) cy += m.pos[q];
      cy /= m.pos.length / 3;
      if (field.outside(m) <= 0.5 && cy < bestY) { bestY = cy; best = m; }
    }
    const m = best ?? transform(piece, { at: [0, field.lift(piece), 0] });
    field.add(m);
    out.push(m);
  }
  return merge(out);
}

// ---- Elongated produce ------------------------------------------------------------------------------------------------------------

/** A banana: a curved finger with five soft ridges, its skin from MATL1 (`bananaSolid`: striations, sugar spots),
 *  greener at the neck, the blossom tip dark. Built along +x, the stalk end at +x. */
function bananaFinger(len: number, R: number, seed: number, ripe: number): { body: Mesh; neck: Mesh; surface: SurfaceFn } {
  const r = rng(seed), arc = 0.06 + r() * 0.04;
  const curve: V3[] = [[-len / 2, R * 1.3, 0], [-len / 4, R * 0.55, len * arc], [0, R, len * (arc + 0.03)], [len / 4, R * 1.4, len * arc], [len / 2, R * 2.6, -len * 0.02]];
  const body = sweep(curve, { radius: (t, th) => R * (0.94 + r() * 0) * Math.pow(Math.sin(Math.PI * Math.min(1, t * 0.97 + 0.02)), 0.42) * (1 - 0.07 * Math.pow(Math.abs(Math.cos((th * 5) / 2)), 3)) * (t > 0.92 ? 1 - (t - 0.92) * 6 : 1), nu: 30, nv: 72 });
  const neck = sweep([[len / 2 - 4, R * 2.5, -len * 0.02], [len / 2 + 10, R * 3.1, -len * 0.035], [len / 2 + 22, R * 3.3, -len * 0.04]], { radius: t => R * (0.3 - 0.06 * t), flatten: 0.8, nu: 10, nv: 10 });
  const tex = bananaSolid({ ripe, seed }), green = C("#8f9a34"), tip = C("#2a1e10");
  const surface: SurfaceFn = (s, o) => {
    const t = tex(s.o[0], s.o[1], s.o[2]);
    o.albedo[0] = t.a[0]; o.albedo[1] = t.a[1]; o.albedo[2] = t.a[2];
    mixInto(o.albedo, green, sst(0.82, 0.98, s.uv[1]) * 0.7 + (1 - ripe) * 0.3);
    mixInto(o.albedo, tip, sst(0.06, 0.0, s.uv[1]) * 0.9);
    o.height = t.h; o.rough = t.r; o.spec = 0.04; o.coat = 0.25; o.coatRough = 0.2; o.mfp[0] = 1.2; o.mfp[1] = 1; o.mfp[2] = 0.3; o.trans = 0.1;
  };
  return { body, neck, surface };
}
/** One banana lying on its side. */
export function banana(len = 190, R = 18, seed = 1, at: V3 = [0, 0, 0], turn = 0, ripeness = 0.6): Part[] {
  const f = bananaFinger(len, R, seed, ripeness), pl: Placement = { ry: turn, at };
  return grouped([part("banana", transform(f.body, pl), f.surface), part("stalk", transform(f.neck, pl), stalk("#6b6430", "#8c9a3a"))]);
}
/** A hand of bananas: `n` fingers fanned from one crown (their stalks meet in a cut, dried crown), lying on the table. */
export function bananaHand(n: number, len: number, R: number, at: V3, turn = 0, seed = 1, ripeness = 0.7): Part[] {
  const crown: V3 = [len / 2 + 22, R * 3.3, -len * 0.04], necks: Mesh[] = [], r = rng(seed);
  const parts: Part[] = [];
  for (let i = 0; i < n; i++) {
    const f = bananaFinger(len * (0.92 + r() * 0.14), R * (0.95 + r() * 0.1), seed + i * 7, ripeness);
    // each finger turned about the crown, the hand's two rows a little apart in height
    const ang = (i - (n - 1) / 2) * 17, lift = (i % 2) * R * 0.9;
    const about = (m: Mesh) => transform(transform(transform(m, { at: [-crown[0], -crown[1], -crown[2]] }), { ry: ang, rz: (i % 2) * 6 }), { at: [crown[0], crown[1] + lift, crown[2]] });
    necks.push(about(f.neck));
    parts.push(part("banana", about(f.body), f.surface));
  }
  // the crown: a short, thick, ridged stub where the hand was cut from the bunch, its cut end dark and dry
  const crownM = sweep([[crown[0] - 4, crown[1] + R * 0.3, crown[2]], [crown[0] + 8, crown[1] + R * 0.5, crown[2]], [crown[0] + 16, crown[1] + R * 0.6, crown[2]]], { radius: (t, th) => R * 0.75 * (1 - 0.1 * Math.abs(Math.sin(th * 3))) * (t > 0.95 ? 0.85 : 1), flatten: 1.6, nu: 18, nv: 8 });
  const pl: Placement = { ry: turn, at };
  const placed = [...parts.map(p => ({ ...p, mesh: transform(p.mesh, pl) })), part("stalks", transform(merge(necks), pl), stalk("#6b6430", "#8c9a3a")), part("crown", transform(crownM, pl), (s, o) => { stalk("#5a4a28", "#7a7a38")(s, o); if (s.o[0] > crown[0] + 14) { mixInto(o.albedo, C("#3a2a18"), 1); o.rough = 0.8; } })];
  return grouped(placed);
}

/** A tapered root (carrot, parsnip, daikon, radish tail) along +X with feathery or leafy tops. */
export function taperRoot(len: number, R: number, skinFn: SurfaceFn, seed = 1, at: V3 = [0, 0, 0], turn = 0, tops: "feathery" | "leafy" | "none" = "feathery"): Part[] {
  const r = rng(seed), bend = (r() - 0.5) * len * 0.12;
  const body = sweep([[0, R, 0], [len * 0.35, R * 0.8, bend * 0.5], [len * 0.7, R * 0.5, bend], [len, R * 0.25, bend * 1.4]], { radius: t => R * Math.pow(Math.max(0, 1 - t), 0.7) * (t < 0.04 ? 0.6 + t * 10 : 1) + 0.3, nu: 22, nv: 50 });
  const out: Part[] = [part("root", transform(body, { ry: turn, at }), skinFn, { k: { tipAt: 0.85 } })];
  // fine lateral root hairs in rows along the root
  const hairs: Mesh[] = [];
  for (let i = 0; i < 46; i++) { const t = 0.12 + r() * 0.8, a = r() * Math.PI * 2, x = len * t, rad = R * Math.pow(Math.max(0, 1 - t), 0.7) + 0.3, cz = bend * Math.min(1, t * 1.4), cy = R * (1 - 0.75 * t), l = 2.5 + r() * 5; hairs.push(sweep([[x, cy + Math.sin(a) * rad * 0.95, cz + Math.cos(a) * rad * 0.95], [x + l * 0.5, cy + Math.sin(a) * (rad + l * 0.6), cz + Math.cos(a) * (rad + l * 0.6)], [x + l, cy + Math.sin(a) * (rad + l) - l * 0.3, cz + Math.cos(a) * (rad + l)]], { radius: q => 0.22 * (1 - q * 0.7), nu: 4, nv: 4 })); }
  out.push(part("root hairs", transform(merge(hairs), { ry: turn, at }), stalk("#d9b48a", "#c8a07a")));
  if (tops !== "none") {
    const stalks: Mesh[] = [], leaves: Mesh[] = [];
    for (let i = 0; i < 7; i++) {
      const a = (r() - 0.5) * 1.2, L = len * (0.5 + r() * 0.4), end: V3 = [-L, R * 1.4 + r() * 10, Math.sin(a) * L * 0.5];
      stalks.push(sweep([[2, R * 1.2, 0], [end[0] * 0.5, end[1] * 0.9 + 4, end[2] * 0.5], end], { radius: () => 1.2, nu: 6, nv: 12 }));
      if (tops === "feathery") for (let k = 0; k < 6; k++) { const t = 0.35 + k * 0.11; leaves.push(transform(leafMesh(L * 0.22, 0.18, 0.1, seed + i * 9 + k, "lance"), { ry: 180 + (k % 2 ? 40 : -40) + a * 30, rz: 15, at: [end[0] * t, R * 1.4 + (end[1] - R * 1.4) * t + 2, end[2] * t] })); }
      else leaves.push(transform(leafMesh(L * 0.6, 0.45, 0.2, seed + i, "oval"), { ry: 180 + a * 40, at: [end[0] * 0.5, end[1] * 0.8, end[2] * 0.5] }));
    }
    out.push(part("tops", transform(merge(stalks), { ry: turn, at }), stalk("#5d7a2c", "#6d8f34")));
    out.push(part("leaves", transform(merge(leaves), { ry: turn, at }), leaf("#4f7f2d", { veins: 3, seed })));
  }
  return grouped(out);
}

/** A pepper or chilli: a sweep with three or four lobes, a green calyx and stalk. */
export function chilli(len: number, R: number, colour: string, seed = 1, at: V3 = [0, 0, 0], turn = 0, curl = 0.25, lobes = 3): Part[] {
  const r = rng(seed), c = curl * len;
  const body = sweep([[0, R, 0], [len * 0.4, R * 0.95, c * 0.3], [len * 0.8, R * 0.8 + c * 0.2, c * 0.9], [len, R * 0.6 + c * 0.35, c * 1.3]], { radius: (t, th) => R * Math.pow(Math.max(0, 1 - t), 0.55) * (1 - 0.08 * Math.pow(Math.abs(Math.sin((th * lobes) / 2)), 2)) * (t < 0.05 ? 0.7 + t * 6 : 1) + 0.2, nu: 24, nv: 40 });
  const cap = sweep([[2, R, 0], [-4, R * 1.05, 0], [-10 - r() * 6, R * 1.4, (r() - 0.5) * 6]], { radius: t => (t < 0.3 ? R * 0.75 * (1 - t) : R * 0.2), nu: 12, nv: 10 });
  const pl: Placement = { ry: turn, at };
  return grouped([part("chilli", transform(body, pl), skin({ base: colour, rough: 0.12, wax: 0.9, seed, trans: 0.45, scatter: 0.2 })), part("calyx", transform(cap, pl), stalk("#4e6a24", "#6b8a30"))]);
}

/** A bulb of garlic or an onion with its papery skin, roots and a dry neck. */
export function bulb(kind: "onion" | "red-onion" | "garlic" | "shallot", R: number, seed = 1, at: V3 = [0, 0, 0], lie = 0): Part[] {
  const shape: FruitShape = kind === "garlic" ? "garlic" : "onion", top = shapeTop(shape) * R;
  const body = fruitBody(shape, R, { ribs: kind === "garlic" ? 9 : 0, ribDepth: 0.07, wobble: R * 0.04, seed });
  const r = rng(seed), roots: Mesh[] = [];
  for (let i = 0; i < 14; i++) { const a = r() * Math.PI * 2, l = R * (0.2 + r() * 0.25); roots.push(sweep([[0, R * 0.04, 0], [Math.cos(a) * l * 0.5, -0.5, Math.sin(a) * l * 0.5], [Math.cos(a) * l, 0.3, Math.sin(a) * l]], { radius: () => 0.35, nu: 4, nv: 5 })); }
  const pl: Placement = { rz: lie, at };
  const colour = kind === "red-onion" ? "#7a2a3c" : kind === "garlic" ? "#e9dfcf" : kind === "shallot" ? "#a8604a" : "#b9773f";
  return grouped([part(kind, transform(body, pl), paperSkin(colour, seed)), part("neck", transform(stem(top, R * 0.5, R * 0.1, seed, 0.6), pl), paperSkin(colour, seed + 1)), part("roots", transform(merge(roots), pl), stalk("#c8b490", "#a89870"))]);
}

/** A mushroom: cap and stem, gills below the cap (button, porcini, shiitake, chanterelle). */
export function mushroomMesh(kind: "button" | "porcini" | "shiitake" | "chanterelle", size: number, seed = 1): { cap: Mesh; stem: Mesh } {
  const r = rng(seed), lean = (r() - 0.5) * 0.3;
  if (kind === "chanterelle") {
    const body = lathe(profile([[0, 0], [size * 0.12, 0.5], [size * 0.16, size * 0.4], [size * 0.3, size * 0.75], [size * 0.5, size * 0.92], [size * 0.48, size * 0.98], [size * 0.3, size * 0.9], [0, size * 0.85]]), { nu: 48, nv: 36, modulate: (th, v) => 1 + 0.14 * Math.sin(th * 5 + seed) * v });
    return { cap: body, stem: lathe(profile([[0, 0], [0.1, 0]]), { nu: 4, nv: 2 }) };
  }
  const capR = kind === "porcini" ? size * 0.5 : kind === "shiitake" ? size * 0.5 : size * 0.45, stemR = kind === "porcini" ? size * 0.24 : size * 0.13, stemH = kind === "porcini" ? size * 0.55 : size * 0.45;
  const capProf = kind === "shiitake" ? [[0, -1], [capR * 0.2, -0.5], [capR * 0.95, 0], [capR, 2], [capR * 0.8, capR * 0.3], [capR * 0.4, capR * 0.42], [0, capR * 0.44]] as [number, number][] : [[0, 0], [capR * 0.3, -1], [capR * 0.92, 0], [capR, capR * 0.25], [capR * 0.85, capR * 0.62], [capR * 0.45, capR * 0.85], [0, capR * 0.9]] as [number, number][];
  const cap = transform(lathe(profile(capProf), { nu: 56, nv: 32, modulate: th => 1 + 0.03 * Math.sin(th * 3 + seed) }), { rz: lean * 40, at: [0, stemH, 0] });
  const st = lathe(profile([[0, 0], [stemR * (kind === "porcini" ? 1.25 : 1.05), 0.5], [stemR * (kind === "porcini" ? 1.3 : 1), stemH * 0.4], [stemR * 0.85, stemH * 0.95], [0, stemH]]), { nu: 32, nv: 20 });
  return { cap, stem: st };
}

/** One herb leaf along +x from its base: ovate or lance, `cup` (edges curling down, so the blade domes), a `fold` along
 *  the midrib, serrated (`teeth`) or lobed (`lobes`), drooping at the tip. */
export function herbLeaf(o: { len: number; width: number; shape?: "ovate" | "lance" | "round" | "needle"; cup?: number; fold?: number; teeth?: number; lobes?: number; droop?: number; seed?: number }): Mesh {
  const r = rng(o.seed ?? 1), L = o.len, W = o.width, tw = (r() - 0.5) * 0.5;
  const outline = (sv: number) => {
    const base = o.shape === "needle" ? Math.pow(Math.sin(Math.PI * Math.min(1, sv * 0.95 + 0.05)), 0.3) * (1 - 0.3 * sv)
      : o.shape === "lance" ? Math.pow(Math.sin(Math.PI * Math.min(1, sv)), 0.85) * (1 - 0.35 * sv)
      : o.shape === "round" ? Math.pow(Math.sin(Math.PI * Math.min(1, sv)), 0.5)
      : Math.pow(Math.sin(Math.PI * Math.min(1, sv * 0.97 + 0.03)), 0.62) * (1 - 0.22 * sv);
    const teeth = o.teeth ? 1 + 0.07 * Math.abs(Math.sin(sv * Math.PI * o.teeth)) - 0.035 : 1, lobes = o.lobes ? 1 - 0.28 * Math.pow(Math.abs(Math.sin(sv * Math.PI * o.lobes)), 3) * (sv > 0.25 ? 1 : 0) : 1;
    return (W / 2) * base * teeth * lobes;
  };
  return blade({ length: L, halfWidth: outline, nu: o.teeth || o.lobes ? 16 : 10, nv: o.teeth || o.lobes ? 40 : 20,
    lift: (sv, w) => -(o.cup ?? 0.2) * W * 0.25 * w * w * Math.sin(Math.PI * sv) + (o.fold ?? 0) * W * 0.18 * Math.abs(w) + w * tw * sv * W * 0.3 + Math.sin(sv * 9 + w * 3 + (o.seed ?? 1)) * L * 0.006,
    bend: sv => -(o.droop ?? 0.2) * L * sv * sv });
}
export type HerbKind = "basil" | "mint" | "parsley" | "cilantro" | "thyme" | "rosemary" | "dill" | "bay" | "shiso";
/**
 * A herb sprig along +x: basil, mint and shiso with opposite leaf pairs at nodes (each pair turned 90° from the last),
 * on short petioles, largest low down, a bud of young leaves at the tip; parsley and coriander as fans of lobed
 * leaflets on long stalks; dill as thread fronds; thyme and rosemary as tiny leaves or needles on woody stems; bay as
 * leathery alternate leaves.
 */
export function herbSprig(kind: HerbKind, len: number, seed = 1): { stem: Mesh; leaves: Mesh } {
  const r = rng(seed), stems: Mesh[] = [], leaves: Mesh[] = [];
  const stemPt = (t: number): V3 => [len * t, 1.2 + t * 3 + Math.sin(t * 3 + seed) * 1.5, Math.sin(t * 2.3 + seed) * 3];
  const woody = kind === "rosemary" || kind === "thyme";
  stems.push(sweep([0, 0.33, 0.66, 1].map(stemPt), { radius: t => (woody ? 1.1 : kind === "dill" ? 0.6 : 0.95) * (1 - t * 0.55), nu: 6, nv: 16 }));
  const leafAt = (m: Mesh, t: number, yaw: number, pitch: number, roll = 0) => { const p = stemPt(t); leaves.push(transform(m, { rz: pitch, rx: roll, ry: yaw, at: p })); };
  if (kind === "basil" || kind === "mint" || kind === "shiso") {
    const nodes = 4, big = kind === "shiso" ? 40 : kind === "basil" ? 30 : 22;
    for (let k = 0; k < nodes; k++) {
      const t = 0.2 + (k / nodes) * 0.72, size = big * (1.1 - 0.55 * (k / nodes)) * (0.9 + r() * 0.2), phase = (k % 2) * 90;
      for (const side of [-1, 1]) {
        const lm = herbLeaf({ len: size, width: size * (kind === "mint" ? 0.55 : 0.62), shape: "ovate", cup: kind === "basil" ? 0.9 : 0.35, teeth: kind === "basil" ? 0 : kind === "mint" ? 14 : 18, droop: 0.22, seed: seed + k * 11 + (side > 0 ? 5 : 0) });
        // a short petiole, then the blade angled up and out from the stem
        const yaw = phase + (side > 0 ? 0 : 180) + (r() - 0.5) * 18;
        const pet = sweep([[0, 0, 0], [size * 0.12, size * 0.05, 0]], { radius: () => 0.55, nu: 5, nv: 4 });
        leafAt(merge([pet, transform(lm, { at: [size * 0.11, size * 0.05, 0] })]), t, yaw, 18 + r() * 12);
      }
    }
    // the tip: young leaves folded up round the bud
    for (let q = 0; q < 3; q++) leafAt(herbLeaf({ len: big * 0.32, width: big * 0.18, shape: "ovate", cup: 0.4, fold: 1.2, droop: -0.1, seed: seed + 50 + q }), 0.98, q * 120 + r() * 30, 52);
  } else if (kind === "parsley" || kind === "cilantro") {
    for (let k = 0; k < 4; k++) {
      const t = 0.35 + k * 0.17, yaw = (k % 2 ? 1 : -1) * (35 + r() * 25), stalkLen = len * 0.22;
      const fan: Mesh[] = [sweep([[0, 0, 0], [stalkLen * 0.6, 2, 0], [stalkLen, 3, 0]], { radius: () => 0.45, nu: 5, nv: 6 })];
      for (let q = 0; q < 3; q++) fan.push(transform(herbLeaf({ len: 13, width: 11, shape: "round", lobes: kind === "cilantro" ? 2 : 3, cup: 0.15, droop: 0.05, seed: seed + k * 7 + q }), { ry: (q - 1) * 40, at: [stalkLen, 3, 0] }));
      leafAt(merge(fan), t, yaw, 10);
    }
  } else if (kind === "dill") {
    for (let k = 0; k < 8; k++) {
      const t = 0.3 + k * 0.08, yaw = (r() - 0.5) * 140;
      for (let q = 0; q < 6; q++) { const a = (q / 6 - 0.5) * 1.6, l = 12 + r() * 10; leafAt(sweep([[0, 0, 0], [l * 0.5, l * 0.15, Math.sin(a) * l * 0.3], [l, l * 0.1, Math.sin(a) * l * 0.6]], { radius: () => 0.22, nu: 4, nv: 6 }), t, yaw, 8); }
    }
  } else if (woody) {
    const count = kind === "rosemary" ? 34 : 26, golden = 137.5;
    for (let k = 0; k < count; k++) {
      const t = 0.1 + (k / count) * 0.88, size = kind === "rosemary" ? 13 * (1 - 0.3 * t) : 4.2;
      leafAt(herbLeaf({ len: size, width: kind === "rosemary" ? 1.8 : 2.4, shape: kind === "rosemary" ? "needle" : "ovate", cup: kind === "rosemary" ? -0.6 : 0.2, droop: 0.05, seed: seed + k }), t, k * golden, 40 + r() * 15);
    }
  } else {
    for (let k = 0; k < 4; k++) leafAt(herbLeaf({ len: 46 - k * 4, width: 15, shape: "lance", cup: 0.1, fold: 0.4, droop: 0.06, seed: seed + k }), 0.25 + k * 0.22, (k % 2 ? 1 : -1) * 50, 12);
  }
  return { stem: merge(stems), leaves: merge(leaves) };
}
/** Herb leaves as parts at a placement. */
export function herbs(kind: HerbKind, len: number, pl: Placement, seed = 1, colour?: string): Part[] {
  const { stem: s, leaves: l } = herbSprig(kind, len, seed);
  const c = colour ?? (kind === "basil" ? "#3a7a26" : kind === "mint" ? "#4a8a36" : kind === "rosemary" ? "#4a5f3a" : kind === "thyme" ? "#5a6e40" : kind === "bay" ? "#56693a" : kind === "shiso" ? "#4a7a30" : kind === "dill" ? "#5a8a3a" : "#3f7d2c");
  const surf = leaf(c, { veins: kind === "basil" ? 6 : kind === "mint" ? 7 : 4, gloss: kind === "basil" || kind === "bay" ? 0.7 : kind === "rosemary" ? 0.4 : 0.3, rugose: kind === "mint" || kind === "shiso" ? 0.8 : 0, seed });
  return grouped([part(`${kind} leaves`, transform(l, pl), surf), part(`${kind} stem`, transform(s, pl), stalk(woodyColour(kind), "#6d8f34"))]);
}
const woodyColour = (k: HerbKind) => (k === "rosemary" || k === "thyme" ? "#6a5a3a" : "#5d7a2c");

/** Scattered small garnish pieces (scallion rings, chopped herbs, chilli flakes, sesame, peppercorns) over a surface. */
export function sprinkle(kind: "scallion" | "herb-bits" | "chilli" | "sesame" | "black-sesame" | "pepper" | "salt-flakes" | "nuts" | "pomegranate-seeds" | "parmesan", count: number, radius: number, y: (x: number, z: number) => number, seed = 1, centre: V3 = [0, 0, 0]): Mesh {
  const r = rng(seed), ms: Mesh[] = [];
  for (let i = 0; i < count; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * radius, x = centre[0] + Math.cos(a) * d, z = centre[2] + Math.sin(a) * d;
    let m: Mesh;
    if (kind === "scallion") m = transform(lathe(profile([[2.4, 0], [2.6, 0.3], [2.6, 1.6], [2.4, 1.9], [1.7, 1.9], [1.5, 1.6], [1.5, 0.3], [1.7, 0]]), { nu: 18, nv: 10 }), { rx: 70 + r() * 40, ry: r() * 360 });
    else if (kind === "sesame" || kind === "black-sesame") m = transform(ellipsoid(1.6, 0.5, 1.0, 8, 6), { ry: r() * 360, rz: (r() - 0.5) * 30 });
    else if (kind === "pepper") m = displace(ellipsoid(2.2, 2.1, 2.2, 10, 8), o => fbm3(i, o[0], o[1], o[2], 2) * 0.35);
    else if (kind === "salt-flakes") m = transform(slab({ outline: t => 2.2 + Math.sin(t * 3 + i) * 0.8, top: () => 0.6, bevel: 0.2, nu: 12, nv: 6 }), { rx: (r() - 0.5) * 50, ry: r() * 360 });
    else if (kind === "pomegranate-seeds") m = transform(ellipsoid(3.4, 4.3, 3.2, 12, 10), { rz: r() * 90, ry: r() * 360 });
    else if (kind === "nuts") m = displace(ellipsoid(5, 3, 3.5, 12, 8), o => fbm3(i, o[0] / 2, o[1] / 2, o[2] / 2, 2) * 0.8);
    else if (kind === "parmesan") m = transform(slab({ outline: t => 3 + Math.sin(t * 4 + i) * 1.2, top: () => 0.5, bevel: 0.2, nu: 10, nv: 6 }), { rx: (r() - 0.5) * 70, ry: r() * 360 });
    else if (kind === "chilli") m = transform(slab({ outline: t => 1.6 + Math.sin(t * 3 + i) * 0.6, top: () => 0.3, bevel: 0.1, nu: 10, nv: 6 }), { rx: (r() - 0.5) * 60, ry: r() * 360 });
    else m = transform(leafMesh(4 + r() * 3, 0.7, 0.1, i, "round"), { ry: r() * 360, rx: (r() - 0.5) * 40 });
    ms.push(reseed(transform(m, { at: [x, y(x, z) + 0.4, z] }), [i * 13, 0, i * 5]));
  }
  return merge(ms);
}

// ---- Grains on a surface ------------------------------------------------------------------------------------------------------

/**
 * Grains (cooked rice) over a mesh: `count` grains about `len` × `wid` mm, each lying in the surface along a random
 * direction, sunk about a third of its thickness, where `keep(objectPosition, normal)` allows. Sampled by area.
 */
export function grainCoat(m: Mesh, count: number, sp: { len?: number; wid?: number; seed?: number; keep?: (o: V3, n: V3) => boolean; light?: boolean } = {}): Mesh {
  const r = rng(sp.seed ?? 1), L = sp.len ?? 5.5, Wd = sp.wid ?? 2.8, tmpl = sp.light ? ellipsoid(L / 2, Wd * 0.46, Wd / 2, 8, 5) : ellipsoid(L / 2, Wd * 0.46, Wd / 2, 10, 7);
  const tris = m.tri.length / 3, cum = new Float64Array(tris);
  let total = 0;
  for (let t = 0; t < tris; t++) {
    const a = m.tri[t * 3] * 3, b = m.tri[t * 3 + 1] * 3, c = m.tri[t * 3 + 2] * 3;
    const ux = m.pos[b] - m.pos[a], uy = m.pos[b + 1] - m.pos[a + 1], uz = m.pos[b + 2] - m.pos[a + 2], vx = m.pos[c] - m.pos[a], vy = m.pos[c + 1] - m.pos[a + 1], vz = m.pos[c + 2] - m.pos[a + 2];
    total += Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) / 2; cum[t] = total;
  }
  const out = emptyMesh();
  for (let g = 0, tries = 0; g < count && tries < count * 4; tries++) {
    const pick = r() * total; let lo = 0, hi = tris - 1;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (cum[mid] < pick) lo = mid + 1; else hi = mid; }
    let b1 = r(), b2 = r(); if (b1 + b2 > 1) { b1 = 1 - b1; b2 = 1 - b2; }
    const ia = m.tri[lo * 3] * 3, ib = m.tri[lo * 3 + 1] * 3, ic = m.tri[lo * 3 + 2] * 3, b0 = 1 - b1 - b2;
    const at = (arr: number[], k: number) => arr[ia + k] * b0 + arr[ib + k] * b1 + arr[ic + k] * b2;
    const p: V3 = [at(m.pos, 0), at(m.pos, 1), at(m.pos, 2)], o: V3 = [at(m.obj, 0), at(m.obj, 1), at(m.obj, 2)];
    let n: V3 = [at(m.nrm, 0), at(m.nrm, 1), at(m.nrm, 2)]; const nl = Math.hypot(...n) || 1; n = [n[0] / nl, n[1] / nl, n[2] / nl];
    if (sp.keep && !sp.keep(o, n)) continue;
    // a frame in the surface: t along the grain, n out of the surface, b across
    const q: V3 = [r() - 0.5, r() - 0.5, r() - 0.5], d = q[0] * n[0] + q[1] * n[1] + q[2] * n[2];
    let t: V3 = [q[0] - n[0] * d, q[1] - n[1] * d, q[2] - n[2] * d]; const tl = Math.hypot(...t) || 1; t = [t[0] / tl, t[1] / tl, t[2] / tl];
    const bb: V3 = [n[1] * t[2] - n[2] * t[1], n[2] * t[0] - n[0] * t[2], n[0] * t[1] - n[1] * t[0]], k = 0.85 + r() * 0.3, sink = Wd * 0.16, tiltK = (r() - 0.5) * 0.5;
    const base = out.pos.length / 3;
    for (let v = 0; v < tmpl.pos.length; v += 3) {
      const gx = tmpl.pos[v] * k, gy = tmpl.pos[v + 1] * k + gx * tiltK, gz = tmpl.pos[v + 2] * k;
      out.pos.push(p[0] + t[0] * gx + n[0] * (gy - sink) + bb[0] * gz, p[1] + t[1] * gx + n[1] * (gy - sink) + bb[1] * gz, p[2] + t[2] * gx + n[2] * (gy - sink) + bb[2] * gz);
      const nx = tmpl.nrm[v], ny = tmpl.nrm[v + 1], nz = tmpl.nrm[v + 2];
      out.nrm.push(t[0] * nx + n[0] * ny + bb[0] * nz, t[1] * nx + n[1] * ny + bb[1] * nz, t[2] * nx + n[2] * ny + bb[2] * nz);
      out.obj.push(tmpl.obj[v] + g * 17, tmpl.obj[v + 1], tmpl.obj[v + 2] + g * 5);
    }
    for (let v = 0; v < tmpl.uv.length; v++) out.uv.push(tmpl.uv[v]);
    for (const ti of tmpl.tri) out.tri.push(ti + base);
    g++;
  }
  return out;
}

/**
 * Small pieces scattered over a mesh's surface (egg curds, peas, carrot dice, batter frills, char bits): `make(i, r)`
 * builds a piece round the origin with +y as its outward side; it is turned to the surface normal at an area-weighted
 * random point, spun about it, and sunk by `sink` mm.
 */
export function surfaceScatter(m: Mesh, count: number, make: (i: number, r: () => number) => Mesh, sp: { seed?: number; sink?: number; keep?: (o: V3, n: V3, p: V3) => boolean } = {}): Mesh {
  const r = rng(sp.seed ?? 1), tris = m.tri.length / 3, cum = new Float64Array(tris);
  let total = 0;
  for (let t = 0; t < tris; t++) {
    const a = m.tri[t * 3] * 3, b = m.tri[t * 3 + 1] * 3, c = m.tri[t * 3 + 2] * 3;
    const ux = m.pos[b] - m.pos[a], uy = m.pos[b + 1] - m.pos[a + 1], uz = m.pos[b + 2] - m.pos[a + 2], vx = m.pos[c] - m.pos[a], vy = m.pos[c + 1] - m.pos[a + 1], vz = m.pos[c + 2] - m.pos[a + 2];
    total += Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) / 2; cum[t] = total;
  }
  const out: Mesh[] = [];
  for (let k = 0, tries = 0; k < count && tries < count * 5; tries++) {
    const pick = r() * total; let lo = 0, hi = tris - 1;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (cum[mid] < pick) lo = mid + 1; else hi = mid; }
    let b1 = r(), b2 = r(); if (b1 + b2 > 1) { b1 = 1 - b1; b2 = 1 - b2; }
    const ia = m.tri[lo * 3] * 3, ib = m.tri[lo * 3 + 1] * 3, ic = m.tri[lo * 3 + 2] * 3, b0 = 1 - b1 - b2;
    const at = (arr: number[], q: number) => arr[ia + q] * b0 + arr[ib + q] * b1 + arr[ic + q] * b2;
    const p: V3 = [at(m.pos, 0), at(m.pos, 1), at(m.pos, 2)], o: V3 = [at(m.obj, 0), at(m.obj, 1), at(m.obj, 2)];
    let n: V3 = [at(m.nrm, 0), at(m.nrm, 1), at(m.nrm, 2)]; const nl = Math.hypot(...n) || 1; n = [n[0] / nl, n[1] / nl, n[2] / nl];
    if (sp.keep && !sp.keep(o, n, p)) continue;
    // turn +y to the normal: tilt about the axis perpendicular to both
    const tilt = (Math.acos(Math.max(-1, Math.min(1, n[1]))) * 180) / Math.PI, yaw = (Math.atan2(n[0], n[2]) * 180) / Math.PI, sink = sp.sink ?? 0;
    const piece = transform(transform(make(k, r), { ry: r() * 360, at: [0, -sink, 0] }), { rx: tilt, ry: yaw, at: p });
    out.push(reseed(piece, [k * 23, 0, k * 13]));
    k++;
  }
  return merge(out);
}
