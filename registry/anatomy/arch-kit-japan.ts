/**
 * Japanese rooms built from the ken module, as carpenters lay them out:
 *
 * - **Tatami** of the Kyōma size (95.5 × 191 cm) or Edoma (88 × 176 cm), laid so that no four corners meet
 *   (`TATAMI_LAYOUTS`, found by search), each with cloth borders (heri) on its long edges only and rush wales along it.
 * - **Posts and rails**: chamfered hashira, the grooved kamoi lintel at about 1.76 m, the nageshi tie beam above it, earth
 *   walls set back from the posts (shinkabe), a saobuchi ceiling of boards on battens that run parallel to the alcove.
 * - **Shoji** (kumiko lattice and glowing washi over a wooden kick panel) and **fusuma** (one ink landscape carried across
 *   the panels, lacquered frames, recessed hikite), openwork **ranma** above them.
 * - The **tokonoma** (a raised alcove with a lacquered front rail, a natural tokobashira, a drop wall, a hanging scroll and a
 *   flower) beside the **chigaidana** (staggered shelves between cupboards).
 * - An **engawa** under the eaves onto a garden with a stone lantern, pruned shrubs and a maple.
 */
import type { Node } from "./arch-sdf";
import { leaf, sculpt } from "./arch-sdf";
import type { SceneBuilder } from "./arch-kit";
import { boxAt, capsule, coneY, cut, cylY, ellipsoid, ground, repeatX, repeatZ, revolve, sphere, tree } from "./arch-kit";
import type { SurfaceSpec } from "./arch-surface";

/** Tatami sizes, metres (short side; the long side is twice it). */
export const KYOMA = 0.955, EDOMA = 0.88;
/** Tatami layouts in cells of half a mat's length: [x, z, w, h]; no four corners meet (searched exhaustively). */
export const TATAMI_LAYOUTS: Readonly<Record<string, readonly (readonly [number, number, number, number])[]>> = {
  "4.5": [[0, 0, 2, 1], [2, 0, 1, 2], [0, 1, 1, 2], [1, 1, 1, 1], [1, 2, 2, 1]],
  "6": [[0, 0, 2, 1], [2, 0, 1, 2], [0, 1, 2, 1], [0, 2, 1, 2], [1, 2, 2, 1], [1, 3, 2, 1]],
  "8": [[0, 0, 2, 1], [2, 0, 2, 1], [0, 1, 1, 2], [1, 1, 2, 1], [3, 1, 1, 2], [1, 2, 2, 1], [0, 3, 2, 1], [2, 3, 2, 1]],
};
export const JP = {
  cedar: { kind: "oak", colour: "#a07a52", age: 0.15 } as SurfaceSpec,
  hinoki: { kind: "oak", colour: "#c9a477", age: 0.1 } as SurfaceSpec,
  smoked: { kind: "oak", colour: "#2a1c14", age: 0.6 } as SurfaceSpec,
  lacquer: { kind: "painted-wood", colour: "#14100e", flake: 0.0 } as SurfaceSpec,
  earth: { kind: "earth", colour: "#b59f72" } as SurfaceSpec,
  paper: { kind: "washi", colour: "#f1ead8", emit: 0.32 } as SurfaceSpec,
  heri: { kind: "fabric", colour: "#1d2027", colour2: "#262a33", pattern: "plain" } as SurfaceSpec,
};

/** Lay tatami from (x0, z0) toward +x and +z in cells of `M` (a mat is 2 × 1 cells). */
export function tatami(b: SceneBuilder, x0: number, z0: number, M: number, layout: readonly (readonly [number, number, number, number])[], heri: SurfaceSpec = JP.heri) {
  const face = b.mat({ kind: "tatami-mat", pattern: "plain" }), faceT = b.mat({ kind: "tatami-mat", pattern: "plain", turn: true }), hm = b.mat(heri);
  for (const [cx, cz, w, h] of layout) {
    const xa = x0 + cx * M, xb = xa + w * M, za = z0 + cz * M, zb = za + h * M, long = w > h;
    b.add(boxAt(xa + 0.002, -0.055, za + 0.002, xb - 0.002, 0, zb - 0.002, long ? faceT : face, 0, 0.004));
    if (w === h) continue;
    // the heri: a dark cloth band on each long edge, sewn a little proud of the rush
    if (long) b.add(boxAt(xa + 0.002, -0.05, za + 0.002, xb - 0.002, 0.002, za + 0.034, hm), boxAt(xa + 0.002, -0.05, zb - 0.034, xb - 0.002, 0.002, zb - 0.002, hm));
    else b.add(boxAt(xa + 0.002, -0.05, za + 0.002, xa + 0.034, 0.002, zb - 0.002, hm), boxAt(xb - 0.034, -0.05, za + 0.002, xb - 0.002, 0.002, zb - 0.002, hm));
  }
}
/** A chamfered post. */
export const hashira = (x: number, z: number, y0: number, y1: number, s: number, mat: number) => boxAt(x - s / 2, y0, z - s / 2, x + s / 2, y1, z + s / 2, mat, 0, 0.008);

/** Shoji panels along a wall: kumiko lattice (3 bars across, rows about 27 cm) and washi over a wooden kick panel. */
export function shoji(b: SceneBuilder, axis: "x" | "z", at: number, a0: number, a1: number, h: number, paper: SurfaceSpec = JP.paper, wood: SurfaceSpec = JP.hinoki) {
  const w = b.mat(wood), p = b.mat(paper), pw = a1 - a0, t = 0.03;
  const B = (u0: number, y0: number, u1: number, y1: number, n0: number, n1: number, m: number) => axis === "x" ? boxAt(u0, y0, at + n0, u1, y1, at + n1, m) : boxAt(at + n0, y0, u0, at + n1, y1, u1, m);
  b.add(B(a0, 0, a0 + 0.03, h, -t / 2, t / 2, w), B(a1 - 0.03, 0, a1, h, -t / 2, t / 2, w), B(a0, h - 0.035, a1, h, -t / 2, t / 2, w), B(a0, 0, a1, 0.3, -t / 2, t / 2, w), B(a0, 0.3, a1, 0.33, -t / 2, t / 2, w));
  b.add(B(a0 + 0.03, 0.33, a1 - 0.03, h - 0.035, -0.002, 0.002, p));
  const cols = 4, rows = Math.max(3, Math.round((h - 0.37) / 0.27));
  for (let k = 1; k < cols; k++) { const u = a0 + 0.03 + ((pw - 0.06) * k) / cols; b.add(B(u - 0.006, 0.33, u + 0.006, h - 0.035, -0.012, 0.012, w)); }
  for (let k = 1; k < rows; k++) { const y = 0.33 + ((h - 0.37) * k) / rows; b.add(B(a0 + 0.03, y - 0.006, a1 - 0.03, y + 0.006, -0.012, 0.012, w)); }
}
/** Fusuma panels: one ink landscape across all of them (`picture` = [u0, total width] along the wall), lacquered frames, a hikite. */
export function fusuma(b: SceneBuilder, axis: "x" | "z", at: number, a0: number, a1: number, h: number, picture: readonly [number, number], hikiteAt: number, face = 1) {
  const lq = b.mat(JP.lacquer), p = b.mat({ kind: "washi", colour: "#e9e0c9", pattern: "fusuma", unit: picture[1], course: h, offset: [-picture[0], 0] }), metal = b.mat({ kind: "brass", colour: "#3a3228" });
  const B = (u0: number, y0: number, u1: number, y1: number, n0: number, n1: number, m: number) => axis === "x" ? boxAt(u0, y0, at + n0, u1, y1, at + n1, m) : boxAt(at + n0, y0, u0, at + n1, y1, u1, m);
  b.add(B(a0, 0, a1, h, -0.009, 0.009, p), B(a0, 0, a0 + 0.02, h, -0.012, 0.012, lq), B(a1 - 0.02, 0, a1, h, -0.012, 0.012, lq), B(a0, h - 0.02, a1, h, -0.012, 0.012, lq), B(a0, 0, a1, 0.02, -0.012, 0.012, lq));
  const n = face * 0.012;
  b.add(axis === "x" ? cut(boxAt(hikiteAt - 0.04, 0.76, at + n - 0.004, hikiteAt + 0.04, 0.84, at + n + 0.004, metal), [boxAt(hikiteAt - 0.03, 0.77, at + n - 0.01, hikiteAt + 0.03, 0.83, at + n + 0.01, 0)]) : cut(boxAt(at + n - 0.004, 0.76, hikiteAt - 0.04, at + n + 0.004, 0.84, hikiteAt + 0.04, metal), [boxAt(at + n - 0.01, 0.77, hikiteAt - 0.03, at + n + 0.01, 0.83, hikiteAt + 0.03, 0)]));
}
/** An openwork ranma: a shippō lattice (overlapping circles) in a frame. */
export function ranma(b: SceneBuilder, axis: "x" | "z", at: number, a0: number, a1: number, y0: number, y1: number, wood: SurfaceSpec = JP.cedar) {
  const w = b.mat(wood), P = (y1 - y0) / 2, R = P * 0.7071;
  const f = (x: number, y: number, z: number) => {
    const u = axis === "x" ? x : z, n = axis === "x" ? z - at : x - at, lu = u - a0, ly = y - y0;
    const gu = Math.round(lu / P) * P, gy = Math.round(ly / P) * P;
    let d = 1e9;
    for (const [du, dy] of [[0, 0], [P, 0], [-P, 0], [0, P], [0, -P]]) d = Math.min(d, Math.abs(Math.hypot(lu - gu - du, ly - gy - dy) - R));
    const frameD = Math.min(lu, a1 - a0 - lu, ly, y1 - y0 - ly);
    return Math.max(Math.min(d - 0.008, frameD - 0.03), -frameD, Math.abs(n) - 0.012);
  };
  b.add(leaf(f, axis === "x" ? [a0, y0, at - 0.015] : [at - 0.015, y0, a0], axis === "x" ? [a1, y1, at + 0.015] : [at + 0.015, y1, a1], w));
}
/** A hanging scroll (kakejiku): brocade mounting, gold ichimonji strips, an ink painting, a roller with knobs, hung on a cord. */
export function kakejiku(b: SceneBuilder, x: number, zWall: number, yTop: number, w = 0.46, h = 1.45) {
  const silk = b.mat({ kind: "fabric", colour: "#5b6b55", colour2: "#53624d", pattern: "plain" }), gold = b.mat({ kind: "fabric", colour: "#b8954a", pattern: "plain" });
  const paint = b.mat({ kind: "washi", colour: "#e6dcc2", pattern: "fusuma", unit: w * 0.72, course: h * 0.55, offset: [w * 0.36 - x, -(yTop - h * 0.8)] }), lq = b.mat(JP.lacquer), ivory = b.mat({ kind: "plain", colour: "#e8e0cc" });
  const z = zWall + 0.012, y0 = yTop - h;
  b.add(boxAt(x - w / 2, y0, z - 0.004, x + w / 2, yTop, z + 0.004, silk), boxAt(x - w * 0.36, y0 + h * 0.25, z, x + w * 0.36, y0 + h * 0.8, z + 0.007, paint));
  for (const y of [y0 + h * 0.23, y0 + h * 0.8]) b.add(boxAt(x - w * 0.36, y, z, x + w * 0.36, y + 0.025, z + 0.008, gold));
  b.add(boxAt(x - w / 2 - 0.01, yTop - 0.02, z - 0.006, x + w / 2 + 0.01, yTop, z + 0.01, lq), capsule(x - w / 2 - 0.03, y0, z + 0.015, x + w / 2 + 0.03, y0, z + 0.015, 0.014, lq));
  b.add(cylY(x - w / 2 - 0.035, z + 0.015, y0 - 0.012, y0 + 0.012, 0.02, ivory), cylY(x + w / 2 + 0.035, z + 0.015, y0 - 0.012, y0 + 0.012, 0.02, ivory));
  b.add(capsule(x - w * 0.2, yTop, z + 0.004, x, yTop + 0.12, z + 0.004, 0.003, lq), capsule(x + w * 0.2, yTop, z + 0.004, x, yTop + 0.12, z + 0.004, 0.003, lq));
}
/** A chabana arrangement: a dark glazed vase, a bending branch with leaves and a camellia. */
export function chabana(b: SceneBuilder, x: number, y: number, z: number, s = 1) {
  const vase = b.mat({ kind: "enamel", colour: "#3a3430" }), stem = b.mat({ kind: "oak", colour: "#3a2a1e" }), leafM = b.mat({ kind: "foliage", colour: "#2f4a2a" }), bloom = b.mat({ kind: "velvet", colour: "#b0202a" });
  b.add(revolve(x, z, y, y + 0.26 * s, t => (0.05 + 0.05 * Math.sin(Math.PI * Math.min(1, t * 1.3)) - 0.02 * t) * s, 0.1 * s, vase, 0, 2));
  const pts: [number, number, number][] = [[x, y + 0.2 * s, z], [x - 0.03 * s, y + 0.38 * s, z + 0.01 * s], [x + 0.03 * s, y + 0.52 * s, z + 0.02 * s], [x + 0.14 * s, y + 0.6 * s, z + 0.03 * s]];
  for (let k = 0; k < 3; k++) b.add(capsule(...pts[k], ...pts[k + 1], 0.006 * s, stem));
  for (const [lx, ly, lz, a] of [[-0.05, 0.4, 0.02, 0.6], [0.08, 0.5, 0.03, -0.5], [0.16, 0.58, 0.04, -0.2], [0.02, 0.32, -0.02, 0.9]] as const) b.add(ellipsoid(x + lx * s, y + ly * s, z + lz * s, 0.035 * s * Math.cos(a) + 0.01 * s, 0.035 * s * Math.abs(Math.sin(a)) + 0.008 * s, 0.012 * s, leafM));
  b.add(sphere(x + 0.15 * s, y + 0.62 * s, z + 0.03 * s, 0.03 * s, bloom), sphere(x + 0.15 * s, y + 0.635 * s, z + 0.04 * s, 0.012 * s, b.mat({ kind: "plain", colour: "#e8c040" })));
}
/** A Kasuga stone lantern: hexagonal base, round post, platform, firebox with windows, roof with curled corners, jewel. */
export function stoneLantern(b: SceneBuilder, x: number, z: number, y = 0, h = 1.9) {
  const st = b.mat({ kind: "rock", colour: "#8c8a80", moss: 0.5 }), k = h / 1.9;
  b.add(cylY(x, z, y, y + 0.18 * k, 0.32 * k, st), revolve(x, z, y + 0.18 * k, y + 0.85 * k, t => (0.1 + 0.03 * Math.exp(-t * 6) + 0.03 * Math.exp(-(1 - t) * 6)) * k, 0.17 * k, st), cylY(x, z, y + 0.85 * k, y + 1.0 * k, 0.26 * k, st));
  b.add(cut(boxAt(x - 0.2 * k, y + 1.0 * k, z - 0.2 * k, x + 0.2 * k, y + 1.35 * k, z + 0.2 * k, st), [boxAt(x - 0.12 * k, y + 1.08 * k, z - 0.3 * k, x + 0.12 * k, y + 1.28 * k, z + 0.3 * k, 0), boxAt(x - 0.3 * k, y + 1.08 * k, z - 0.12 * k, x + 0.3 * k, y + 1.28 * k, z + 0.12 * k, 0)]));
  b.add(coneY(x, z, y + 1.35 * k, y + 1.62 * k, 0.42 * k, 0.08 * k, st), cylY(x, z, y + 1.62 * k, y + 1.7 * k, 0.09 * k, st), sphere(x, y + 1.78 * k, z, 0.09 * k, st));
  b.add(...[0, 1, 2, 3].map(i => { const a = (i / 4) * Math.PI * 2 + Math.PI / 4; return sphere(x + Math.cos(a) * 0.4 * k, y + 1.4 * k, z + Math.sin(a) * 0.4 * k, 0.045 * k, st); }));
}

export interface WashitsuSpec {
  /** Mat size (Kyōma 0.955 or Edoma 0.88). */
  M?: number;
  /** Ceiling height, m. */
  ceiling?: number;
  /** Include the tokonoma and chigaidana on the back wall. */
  alcove?: boolean;
  /** The shoji side opens onto an engawa and a garden. */
  garden?: boolean;
  /** Walls (earth plaster colour). */
  wall?: SurfaceSpec;
}
/** Levels of a built washitsu, for furnishing and framing it. */
export interface WashitsuLevels { half: number; ceiling: number; kamoi: number; garden: number; interiorBox: { lo: [number, number, number]; hi: [number, number, number] } }
/**
 * An eight-mat shoin room: tatami, posts, earth walls, kamoi and nageshi, a saobuchi ceiling; the tokonoma (left) and
 * chigaidana (right) on the back wall (−z); fusuma under a ranma on the left wall; shoji on the right wall, the middle two
 * slid open onto an engawa and a garden (+x). Centred on the origin, floor (tatami) at y = 0.
 */
export function washitsu(b: SceneBuilder, o: WashitsuSpec = {}): WashitsuLevels {
  const M = o.M ?? KYOMA, H = 2 * M, Hc = o.ceiling ?? 2.55, kam = 1.76, P = 0.12, D = 0.82;
  const post = b.mat(JP.hinoki), wall = b.mat(o.wall ?? JP.earth), lq = b.mat(JP.lacquer), cedar = b.mat(JP.cedar), board = b.mat({ kind: "boards", colour: "#c9a272", course: 0.32, age: 0.02 });
  // under-floor and the floor itself
  b.add(boxAt(-H - 1, -0.6, -H - D - 0.5, H + 1.35, -0.055, H + 1, b.mat({ kind: "plaster", colour: "#6a5a48" })));
  tatami(b, -H, -H, M, TATAMI_LAYOUTS["8"]);
  // posts at the corners and every ken, rails, walls between
  for (const [x, z] of [[-H, -H], [H, -H], [-H, H], [H, H], [0, -H], [-H, 0], [H, 0], [0, H]] as const) b.add(hashira(x + Math.sign(x) * P / 2, z + Math.sign(z) * P / 2, -0.06, Hc, P, post));
  for (const [x0, z0, x1, z1] of [[-H, -H - P, H, -H], [-H, H, H, H + P], [-H - P, -H, -H, H], [H, -H, H + P, H]] as const) {
    b.add(boxAt(x0, kam, z0, x1, kam + 0.045, z1, post), boxAt(x0 - (x1 - x0 < 0.2 ? 0.03 : 0), kam + 0.06, z0 - (z1 - z0 < 0.2 ? 0.03 : 0), x1 + (x1 - x0 < 0.2 ? 0.03 : 0), kam + 0.17, z1 + (z1 - z0 < 0.2 ? 0.03 : 0), post));
    b.add(boxAt(x0, -0.06, z0, x1, 0.0, z1, post));
  }
  // the ceiling: boards on battens running parallel to the alcove, a cornice round the edge
  b.add(boxAt(-H - P, Hc, -H - D - P, H + P, Hc + 0.03, H + P, board), repeatZ(boxAt(-H, Hc - 0.022, -H + 0.2, H, Hc, -H + 0.218, cedar), 0.455, Math.floor((2 * H) / 0.455)));
  for (const [x0, z0, x1, z1] of [[-H, -H - 0.06, H, -H], [-H, H, H, H + 0.06], [-H - 0.06, -H, -H, H], [H, -H, H + 0.06, H]] as const) b.add(boxAt(x0, Hc - 0.07, z0, x1, Hc, z1, cedar));
  // left wall: four fusuma under a shippō ranma; front wall (behind the viewer): fusuma
  fusuma(b, "z", -H - 0.02, -H, -M, kam, [-H, 2 * H], -M - 0.06); fusuma(b, "z", -H - 0.05, -M, 0, kam, [-H, 2 * H], -M + 0.06);
  fusuma(b, "z", -H - 0.02, 0, M, kam, [-H, 2 * H], M - 0.06); fusuma(b, "z", -H - 0.05, M, H, kam, [-H, 2 * H], M + 0.06);
  ranma(b, "z", -H - 0.03, -H, H, kam + 0.17, Hc - 0.2); b.add(boxAt(-H - 0.09, Hc - 0.2, -H, -H - 0.02, Hc, H, wall));
  fusuma(b, "x", H + 0.03, -H, 0, kam, [-H, 2 * H], -0.06, -1); fusuma(b, "x", H + 0.03, 0, H, kam, [-H, 2 * H], 0.06, -1); b.add(boxAt(-H, kam + 0.17, H + 0.02, H, Hc, H + 0.09, wall));
  // right wall: shoji, the middle pair slid behind the outer ones to open the room to the engawa
  shoji(b, "z", H + 0.02, -H, -M, kam); shoji(b, "z", H + 0.06, -H + 0.05, -M + 0.05, kam); shoji(b, "z", H + 0.02, M, H, kam); shoji(b, "z", H + 0.06, M - 0.05, H - 0.05, kam);
  b.add(boxAt(H + 0.01, kam + 0.17, -H, H + 0.09, Hc, H, wall));
  b.portals.push({ x: H + 0.04, y: kam / 2, z: -H + M / 2, axis: "x", hw: M / 2, hh: kam / 2, tint: "paper" }, { x: H + 0.04, y: kam / 2, z: H - M / 2, axis: "x", hw: M / 2, hh: kam / 2, tint: "paper" }, { x: H + 0.04, y: kam / 2, z: 0, axis: "x", hw: M - 0.06, hh: kam / 2, tint: "clear" });
  if (o.alcove !== false) {
    // tokonoma: a raised floor behind a black-lacquered rail, the natural tokobashira, the drop wall, a scroll and a flower
    const zb = -H - D;
    b.add(boxAt(-H, -0.06, zb, 0, 0.1, -H, b.mat({ kind: "oak", colour: "#6a4a2e", age: 0.05 })), boxAt(-H, 0, -H - 0.07, 0, 0.11, -H, lq));
    b.add(boxAt(-H - P, -0.06, zb - P, -H, Hc, -H, wall), boxAt(-H, -0.06, zb - 0.09, H, Hc, zb, wall), boxAt(-H, 1.98, -H - 0.06, 0, Hc, -H + 0.02, wall), boxAt(-H, 1.94, -H - 0.07, 0, 1.99, -H + 0.01, post));
    b.add(revolve(0, -H + 0.035, -0.06, Hc, t => 0.065 + 0.003 * Math.sin(t * 17) + 0.002 * Math.sin(t * 41 + 1) - 0.006 * t, 0.075, b.mat({ kind: "oak", colour: "#8a6a4a", age: 0.2 }), 0, 0.5));
    kakejiku(b, -M, zb, 1.92); chabana(b, -M + 0.35, 0.1, zb + 0.32, 1.1);
    b.add(revolve(-M - 0.45, zb + 0.3, 0.1, 0.2, t => 0.05 * Math.sin(Math.PI * (0.25 + t * 0.7)) + 0.01, 0.06, b.mat({ kind: "brass", colour: "#4a3a24" })));
    // chigaidana: a cupboard above (tenbukuro), one below (jibukuro), two staggered shelves joined by a small post
    const pin = b.mat({ kind: "oak", colour: "#7a5636", age: 0.05 }), gold = b.mat({ kind: "gold-leaf" });
    b.add(boxAt(0, -0.06, zb, H, 0.1, -H, pin), boxAt(0, 0.1, zb, H, 0.5, zb + 0.45, pin), boxAt(0, 1.5, zb, H, 1.94, zb + 0.4, pin), boxAt(0, 1.94, -H - 0.07, H, 1.99, -H + 0.01, post), boxAt(0, 1.98, -H - 0.06, H, Hc, -H + 0.02, wall));
    for (const [x0, x1, y0, y1, z] of [[0.04, M - 0.01, 0.13, 0.47, zb + 0.452], [M + 0.01, H - 0.04, 0.13, 0.47, zb + 0.452], [0.04, M - 0.01, 1.53, 1.91, zb + 0.402], [M + 0.01, H - 0.04, 1.53, 1.91, zb + 0.402]] as const) b.add(boxAt(x0, y0, z - 0.002, x1, y1, z + 0.004, gold), boxAt(x0, y0, z - 0.001, x0 + 0.015, y1, z + 0.006, lq), boxAt(x1 - 0.015, y0, z - 0.001, x1, y1, z + 0.006, lq));
    b.add(boxAt(0.05, 1.1, zb, M + 0.15, 1.13, zb + 0.34, pin), boxAt(M - 0.15, 0.86, zb, H - 0.05, 0.89, zb + 0.34, pin), boxAt(M - 0.02, 0.89, zb + 0.17, M + 0.02, 1.1, zb + 0.21, pin), boxAt(0.05, 1.13, zb + 0.3, 0.07, 1.17, zb + 0.34, pin));
  }
  let garden = -0.55;
  if (o.garden !== false) {
    // the engawa under the eaves: boards along its length, posts, exposed rafters; then a garden lower down
    const ex = H + P, ew = 1.2, eave = b.mat({ kind: "oak", colour: "#6e5236", age: 0.3 });
    b.add(boxAt(ex, -0.6, -H - P, ex + ew, -0.03, H + P, b.mat({ kind: "floorboards", colour: "#8a6844" })));
    for (const z of [-H - P / 2, 0, H + P / 2]) b.add(hashira(ex + ew - 0.06, z, -0.6, Hc + 0.1, 0.11, post));
    b.add(boxAt(ex, Hc + 0.1, -H - 0.6, ex + ew + 0.7, Hc + 0.2, H + 0.6, eave), repeatZ(boxAt(ex, Hc + 0.02, -H - 0.5, ex + ew + 0.7, Hc + 0.1, -H - 0.44, eave), 0.3, Math.floor((2 * H + 1) / 0.3)));
    b.add(ellipsoid(ex + ew + 0.35, -0.42, 0, 0.32, 0.12, 0.45, b.mat({ kind: "rock", colour: "#9a958a" })));
    b.place();
    ground(b, ex + ew - 0.1, ex + 30, -30, 30, { kind: "grass", colour: "#4b5a33", moss: 0.6 }, garden);
    stoneLantern(b, ex + ew + 2.6, -1.4, garden, 1.8);
    for (const [x, z, r] of [[ex + ew + 1.4, 1.6, 0.6], [ex + ew + 3.6, 1.0, 0.8], [ex + ew + 1.9, -2.6, 0.5], [ex + ew + 4.5, -2.4, 0.9]] as const) b.add(ellipsoid(x, garden + r * 0.35, z, r, r * 0.6, r * 0.85, b.mat({ kind: "foliage", colour: "#3c5a2c" })));
    for (let k = 0; k < 4; k++) b.add(ellipsoid(ex + ew + 0.9 + k * 0.75, garden + 0.02, 0.3 * Math.sin(k * 1.7), 0.26, 0.05, 0.22, b.mat({ kind: "rock", colour: "#8c877b" })));
    b.place();
    tree(b, ex + ew + 4.2, 0.8, 5.5, 2.4, { kind: "foliage", colour: "#b8471f" }); tree(b, ex + ew + 6.5, -3.5, 7, 2.8, { kind: "foliage", colour: "#3f5a2e" });
    b.add(boxAt(ex + ew + 8, garden, -30, ex + ew + 8.5, garden + 2.2, 30, b.mat({ kind: "earth", colour: "#c7ab78" })), boxAt(ex + ew + 7.85, garden + 2.2, -30, ex + ew + 8.65, garden + 2.4, 30, b.mat({ kind: "plain-tile", colour: "#3a3d40" })));
  } else garden = 0;
  b.place();
  return { half: H, ceiling: Hc, kamoi: kam, garden, interiorBox: { lo: [-H - P - 0.2, -0.7, -H - D - P - 0.2], hi: [H + 0.1, Hc + 0.1, H + P + 0.2] } };
}

/**
 * A four-and-a-half-mat tea room (sukiya): mats round a centre half mat with the sunken hearth (ro) holding an iron
 * kettle over charcoal; rough earth walls with a paper wainscot (koshibari); windows cut through the earth to show their
 * bamboo lattice (shitaji-mado) with shoji behind; a low ceiling partly sloping over exposed bamboo rafters; a small
 * tokonoma with a bent natural post, a scroll and a flower; the crawl-in door (nijiriguchi) about 66 × 60 cm. Centred on
 * the origin, the host's side toward −z.
 */
export function chashitsu(b: SceneBuilder, M = KYOMA): WashitsuLevels {
  const H = 1.5 * M, Hc = 2.0, D = 0.62;
  const post = b.mat({ kind: "oak", colour: "#7a5a3a", age: 0.3 }), wall = b.mat({ kind: "earth", colour: "#a08354" }), paper = b.mat({ kind: "washi", colour: "#ede4cc" }), glowP = b.mat({ ...JP.paper, emit: 0.55 }), bam = b.mat({ kind: "cane", colour: "#9a8a5a" }), reed = b.mat({ kind: "hay", colour: "#a08a58" });
  const lq = b.mat(JP.lacquer), iron = b.mat({ kind: "iron", colour: "#1e1c1a", age: 0.3 }), ash = b.mat({ kind: "plaster", colour: "#b2ada4", flake: 0 });
  b.add(boxAt(-H - 0.6, -0.6, -H - D - 0.5, H + 0.6, -0.055, H + 0.6, b.mat({ kind: "plaster", colour: "#5a4a3a" })));
  // the mats, leaving the hearth (42.4 cm square) cut into the centre half mat
  tatami(b, -H, -H, M, TATAMI_LAYOUTS["4.5"].filter(m => !(m[2] === 1 && m[3] === 1)));
  const ro = 0.212, hm = M / 2;
  b.add(cut(boxAt(-hm + 0.002, -0.055, -hm + 0.002, hm - 0.002, 0, hm - 0.002, b.mat({ kind: "tatami-mat", pattern: "plain" })), [boxAt(-ro - 0.045, -0.2, -ro - 0.045, ro + 0.045, 0.1, ro + 0.045, 0)]));
  b.add(cut(boxAt(-ro - 0.045, -0.05, -ro - 0.045, ro + 0.045, 0.004, ro + 0.045, lq), [boxAt(-ro, -0.3, -ro, ro, 0.1, ro, 0)]), boxAt(-ro, -0.32, -ro, ro, -0.2, ro, ash));
  b.add(ellipsoid(0.04, -0.2, 0.03, 0.05, 0.03, 0.04, b.mat({ kind: "fire", emit: 1.4 })), ellipsoid(-0.05, -0.2, -0.02, 0.045, 0.025, 0.04, b.mat({ kind: "fire", emit: 1.0 })));
  b.add(revolve(0, 0, -0.17, 0.09, t => 0.12 + 0.03 * Math.sin(Math.PI * t) - (t > 0.85 ? (t - 0.85) * 0.5 : 0), 0.155, iron, 0, 1), cylY(0, 0, 0.09, 0.1, 0.055, iron), sphere(0, 0.105, 0, 0.012, iron));
  for (const s of [-1, 1]) b.add(cut(cylY(s * 0.15, 0, 0.0, 0.04, 0.025, iron), [cylY(s * 0.15, 0, -0.1, 0.1, 0.017, 0)]));
  b.light({ x: 0, y: -0.1, z: 0, kelvin: 1700, power: 0.022 });
  // walls with a paper wainscot, cut for the alcove, the windows and the crawl-in door
  // windows as [wall axis, wall position, centre along the wall, sill, width, height]: one low beside the alcove, two on the garden side
  const wins: readonly (readonly ["x" | "z", number, number, number, number, number])[] = [["x", -H, 0.25, 0.42, 0.6, 0.58], ["x", H, -0.55, 0.45, 0.62, 0.55], ["x", H, 0.15, 1.25, 0.5, 0.42], ["z", H, -0.4, 0.55, 0.7, 0.6]];
  const winCut = (axis: "x" | "z", at: number, c: number, y0: number, w: number, h: number) => axis === "x" ? boxAt(at - 0.3, y0, c - w / 2, at + 0.3, y0 + h, c + w / 2, 0) : boxAt(c - w / 2, y0, at - 0.3, c + w / 2, y0 + h, at + 0.3, 0);
  const on = (axis: "x" | "z", at: number) => wins.filter(w => w[0] === axis && w[1] === at).map(w => winCut(...w));
  const walls: readonly (readonly [number, number, number, number, Node[]])[] = [
    [-H - 0.12, -H - 0.12, H + 0.12, -H, [boxAt(-H, 0, -H - 0.3, -0.1, 1.72, -H + 0.1, 0)]],
    [-H - 0.12, H, H + 0.12, H + 0.12, on("z", H)],
    [-H - 0.12, -H, -H, H, on("x", -H)],
    [H, -H, H + 0.12, H, [...on("x", H), boxAt(H - 0.2, 0, 0.6, H + 0.3, 0.66, 1.06, 0)]],
  ];
  for (const [x0, z0, x1, z1, cuts] of walls) {
    b.add(cut(boxAt(x0, -0.06, z0, x1, Hc + 0.3, z1, wall), cuts));
    const inX = Math.abs(x1 - x0) < 0.2, f = inX ? (x0 < 0 ? x1 + 0.002 : x0 - 0.004) : (z0 < 0 ? z1 + 0.002 : z0 - 0.004);
    b.add(cut(inX ? boxAt(f, 0, z0, f + 0.002, 0.32, z1, paper) : boxAt(x0, 0, f, x1, 0.32, f + 0.002, paper), cuts));
  }
  for (const [x, z] of [[-H, -H], [H, -H], [-H, H], [H, H]] as const) b.add(revolve(x, z, -0.06, Hc, t => 0.05 + 0.004 * Math.sin(t * 9 + x), 0.06, post, 0, 0.3));
  b.add(boxAt(-H, Hc, -H, 0.2, Hc + 0.03, H, b.mat({ kind: "jute", colour: "#a68e60", unit: 0.012 })), repeatZ(capsule(-H, Hc - 0.01, -H + 0.2, 0.2, Hc - 0.01, -H + 0.2, 0.012, bam), 0.42, 7));
  b.add(leaf((x, y, z) => Math.max(Math.abs(y - (Hc - (x - 0.2) * 0.32)) - 0.02, 0.2 - x, x - H, Math.abs(z) - H), [0.2, Hc - (H - 0.2) * 0.32 - 0.05, -H], [H, Hc + 0.05, H], reed));
  b.add(repeatZ(leaf((x, y, z) => Math.max(Math.hypot(y - (Hc - (x - 0.2) * 0.32) + 0.035, z + H - 0.15) - 0.016, 0.2 - x, x - H), [0.2, Hc - (H - 0.2) * 0.32 - 0.06, -H + 0.12], [H, Hc + 0.02, -H + 0.18], bam), 0.3, 10));
  b.add(capsule(0.2, Hc - 0.01, -H, 0.2, Hc - 0.01, H, 0.03, post));
  // the tokonoma on the back wall: a raised board, a bent post, a scroll and a hanging flower
  const zb = -H - D;
  b.add(boxAt(-H, -0.06, zb - 0.1, 0.1, Hc + 0.3, zb, wall), boxAt(-H - 0.12, -0.06, zb, -H, Hc + 0.3, -H, wall), boxAt(-0.1, -0.06, zb, 0.12, Hc + 0.3, -H, wall));
  b.add(boxAt(-H, -0.06, zb, -0.1, 0.08, -H, b.mat({ kind: "tatami-mat", pattern: "plain", turn: true })), boxAt(-H, 0, -H - 0.06, -0.1, 0.085, -H, lq), boxAt(-H, 1.72, -H - 0.05, -0.1, Hc + 0.3, -H + 0.02, wall), capsule(-H, 1.72, -H + 0.0, -0.1, 1.72, -H + 0.0, 0.02, bam));
  b.add(sculptPost(-0.1, -H + 0.03, Hc, post));
  kakejiku(b, -0.75, zb, 1.62, 0.36, 1.15);
  b.add(cylY(-0.12, -H + 0.08, 1.0, 1.32, 0.04, bam)); chabana(b, -0.12, 1.0, -H + 0.08, 0.45);
  // shitaji-mado: the cut earth shows its bamboo and reed lattice, shoji glowing behind
  for (const [axis, at0, c, y0, w, h] of wins) {
    const o = Math.sign(at0), at = at0, pp = at + o * 0.1, lb = at + o * 0.05, lr = at + o * 0.06;
    b.add(axis === "x" ? boxAt(pp, y0, c - w / 2, pp + o * 0.01, y0 + h, c + w / 2, glowP) : boxAt(c - w / 2, y0, pp, c + w / 2, y0 + h, pp + o * 0.01, glowP));
    // reeds and split bamboo tied in an uneven lattice, as the wall's own core shows when the plaster is left off
    for (const [k, f] of [0.17, 0.41, 0.58, 0.83].entries()) { const u = -w / 2 + w * f + 0.02 * Math.sin(k * 3.1 + c), lean = 0.025 * Math.sin(k * 1.7 + c); b.add(axis === "x" ? capsule(lb, y0, c + u - lean, lb, y0 + h, c + u + lean, k % 2 ? 0.005 : 0.007, k % 2 ? reed : bam) : capsule(c + u - lean, y0, lb, c + u + lean, y0 + h, lb, k % 2 ? 0.005 : 0.007, k % 2 ? reed : bam)); }
    for (const [k, f] of [0.3, 0.62].entries()) { const v = h * f + 0.03 * Math.sin(k * 2.3 + c), tilt = 0.02 * Math.sin(k * 4.1 + c); b.add(axis === "x" ? capsule(lr, y0 + v - tilt, c - w / 2, lr, y0 + v + tilt, c + w / 2, 0.005, reed) : capsule(c - w / 2, y0 + v - tilt, lr, c + w / 2, y0 + v + tilt, lr, 0.005, reed)); }
    b.portals.push(axis === "x" ? { x: pp, y: y0 + h / 2, z: c, axis: "x", hw: w / 2, hh: h / 2, tint: "paper" } : { x: c, y: y0 + h / 2, z: pp, axis: "z", hw: w / 2, hh: h / 2, tint: "paper" });
  }
  // the host's utensils: a water jar, a lacquered tea caddy and a black raku bowl, a bamboo ladle on its lid rest
  const ceramic = b.mat({ kind: "enamel", colour: "#5e4c3a" }), raku = b.mat({ kind: "enamel", colour: "#1e1816" });
  b.add(revolve(-0.3, -0.66, 0, 0.19, t => 0.085 + 0.012 * Math.sin(t * 9) - 0.01 * t, 0.1, ceramic, 0, 1.5), cylY(-0.3, -0.66, 0.19, 0.2, 0.088, lq), sphere(-0.3, 0.205, -0.66, 0.012, lq));
  b.add(revolve(0.02, -0.48, 0, 0.075, t => 0.035 + 0.006 * Math.sin(Math.PI * t), 0.045, lq), cut(revolve(0.17, -0.45, 0, 0.08, t => 0.052 + 0.012 * t, 0.068, raku, 0, 1), [cylY(0.17, -0.45, 0.014, 0.1, 0.048, 0)]));
  b.add(cylY(0.42, -0.6, 0, 0.05, 0.024, bam), capsule(0.42, 0.05, -0.6, 0.66, 0.03, -0.58, 0.006, bam), cut(cylY(0.68, -0.58, 0.015, 0.06, 0.03, bam), [cylY(0.68, -0.58, 0.03, 0.08, 0.025, 0)]));
  // the nijiriguchi: a small plank door near the floor, slid a hand's width open
  b.portals.push({ x: H + 0.06, y: 0.33, z: 0.9, axis: "x", hw: 0.08, hh: 0.33, tint: "clear" });
  b.add(boxAt(H - 0.01, 0, 0.6, H + 0.02, 0.66, 1.06, b.mat({ kind: "boards", colour: "#6a5034", course: 0.12, age: 0.4 })));
  b.place();
  return { half: H, ceiling: Hc, kamoi: 1.72, garden: 0, interiorBox: { lo: [-H - 1, -0.7, -H - D - 1], hi: [H + 1, Hc + 1, H + 1] } };
}
/** A bent natural post (a tokobashira of an unpeeled or peeled log), leaning and swelling a little along its height. */
function sculptPost(x: number, z: number, h: number, mat: number) {
  return leaf((px, py, pz) => { const t = Math.min(1, Math.max(0, py / h)), cx = x + 0.035 * Math.sin(t * 2.6), cz = z + 0.015 * Math.sin(t * 4.1 + 1); return Math.max(Math.hypot(px - cx, pz - cz) - (0.055 + 0.006 * Math.sin(t * 11) - 0.012 * t), -py - 0.06, py - h) * 0.85; }, [x - 0.12, -0.06, z - 0.1], [x + 0.12, h, z + 0.1], mat);
}

/** A naturally curved log beam between two points, sagging or arching by `bow`, its radius wandering a little. */
function logBeam(a: readonly [number, number, number], c: readonly [number, number, number], r: number, bow: number, mat: number): Node[] {
  const out: Node[] = [], n = 8, P = (t: number): [number, number, number] => [a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t + bow * Math.sin(Math.PI * t), a[2] + (c[2] - a[2]) * t];
  for (let k = 0; k < n; k++) { const t0 = k / n, t1 = (k + 1) / n, p0 = P(t0), p1 = P(t1); out.push(sculpt([{ a: p0, b: p1, r1: r * (1 + 0.08 * Math.sin(k * 2.1)), r2: r * (1 + 0.08 * Math.sin((k + 1) * 2.1)) }], r * 0.1, mat)); }
  return out;
}
/**
 * A farmhouse living room (minka) round its irori: a sunken hearth of ash with logs burning; above it the jizai-kagi, a
 * bamboo tube whose hook is held by a carved carp, with an iron pot; river fish grilling on skewers in the ash; a smoke
 * shelf of bamboo; floors of wide boards polished black; curved log beams and bamboo rafters under the soot-dark thatch;
 * a kamidana shelf; one barred window letting a shaft of sun into the smoke. Centred on the hearth.
 */
export function minkaIrori(b: SceneBuilder): WashitsuLevels {
  const X = 3.6, Z0 = -3.2, Z1 = 2.6, Hw = 2.7, ridge = 6.4;
  const smoked = b.mat({ kind: "oak", colour: "#2a1c12", age: 0.5 }), floor = b.mat({ kind: "floorboards", colour: "#3a2818" }), wall = b.mat({ kind: "earth", colour: "#7a6448" }), ash = b.mat({ kind: "plaster", colour: "#a29d94", flake: 0 });
  const bam = b.mat({ kind: "cane", colour: "#5a4428" }), thatch = b.mat({ kind: "hay", colour: "#3c2e1e" }), iron = b.mat({ kind: "iron", colour: "#1c1a18", age: 0.4 }), fire = b.mat({ kind: "fire", emit: 2.2 }), wood = b.mat({ kind: "firewood" });
  b.add(boxAt(-X - 0.3, -0.6, Z0 - 0.3, X + 0.3, 0, Z1, floor));
  // the irori: a frame of thick wood round a bed of ash, three logs meeting in the fire, embers
  b.add(cut(boxAt(-0.95, -0.05, -0.65, 0.95, 0.02, 0.65, smoked), [boxAt(-0.82, -0.3, -0.52, 0.82, 0.1, 0.52, 0)]), boxAt(-0.82, -0.32, -0.52, 0.82, -0.14, 0.52, ash));
  for (const [x, z, a] of [[0.38, 0.05, 0.1], [-0.36, 0.12, -0.25], [0.05, -0.36, 1.5]] as const) b.add(capsule(x, -0.1, z, x * 0.15, -0.09, z * 0.15, 0.045, wood), ellipsoid(x * 0.2, -0.08, z * 0.2, 0.06, 0.04, 0.06, fire), sphere(x * 0.45 + 0.01 * a, -0.1, z * 0.45, 0.03, fire));
  b.add(ellipsoid(0, -0.02, 0, 0.1, 0.12, 0.08, b.mat({ kind: "flame", emit: 6 })));
  b.light({ x: 0, y: 0.05, z: 0, kelvin: 1750, power: 0.16, shadow: true });
  // fish on skewers leaning in toward the fire
  for (let k = 0; k < 4; k++) { const a = -0.9 + k * 0.6, bx = Math.sin(a) * 0.55, bz = Math.cos(a) * 0.4 + 0.02, tx = bx * 0.75, tz = bz * 0.75; b.add(capsule(bx, -0.14, bz, tx, 0.42, tz, 0.004, bam), sculpt([{ a: [tx * 1.02, 0.28, tz * 1.02], e: [0.018, 0.075, 0.012] }, { a: [tx * 1.04, 0.19, tz * 1.04], b: [tx * 1.05, 0.17, tz * 1.05], r1: 0.012, r2: 0.016 }], 0.01, b.mat({ kind: "plain", colour: "#8a8070" }))); }
  // the jizai-kagi: a bamboo tube from the beam, the carp that locks it, an iron rod and hook, the pot
  b.add(cylY(0, 0, 1.2, Hw + 0.2, 0.035, b.mat({ kind: "oak", colour: "#4a3a22", age: 0.4 })), cylY(0, 0, 0.62, 1.2, 0.009, iron));
  b.add(sculpt([{ a: [0, 1.17, 0], e: [0.16, 0.05, 0.03] }, { a: [-0.17, 1.17, 0], b: [-0.26, 1.21, 0], r1: 0.02, r2: 0.005 }, { a: [-0.17, 1.17, 0], b: [-0.26, 1.12, 0], r1: 0.02, r2: 0.005 }, { a: [0.03, 1.22, 0], e: [0.04, 0.025, 0.01] }], 0.02, b.mat({ kind: "oak", colour: "#3a2414", age: 0.3 })));
  b.add(sphere(0.12, 1.18, 0.028, 0.01, iron), sphere(0.12, 1.18, -0.028, 0.01, iron));
  for (let k = 0; k < 8; k++) { const a0 = Math.PI * (k / 8), a1 = Math.PI * ((k + 1) / 8); b.add(capsule(-Math.cos(a0) * 0.17, 0.48 + Math.sin(a0) * 0.16, 0, -Math.cos(a1) * 0.17, 0.48 + Math.sin(a1) * 0.16, 0, 0.006, iron)); }
  b.add(revolve(0, 0, 0.3, 0.5, t => 0.13 + 0.05 * Math.sin(Math.PI * (0.2 + t * 0.5)), 0.19, iron, 0, 1.2), cylY(0, 0, 0.5, 0.52, 0.16, b.mat({ kind: "oak", colour: "#5a3a22" })), capsule(0, 0.52, 0, 0, 0.56, 0, 0.012, smoked));
  // the smoke shelf (hiderana) hung over the hearth
  b.add(repeatZ(capsule(-0.9, 2.05, -0.6, 0.9, 2.05, -0.6, 0.016, bam), 0.12, 11), capsule(-0.9, 2.08, -0.62, -0.9, 2.08, 0.62, 0.025, bam), capsule(0.9, 2.08, -0.62, 0.9, 2.08, 0.62, 0.025, bam));
  for (const [x, z] of [[-0.9, -0.6], [0.9, -0.6], [-0.9, 0.6], [0.9, 0.6]] as const) b.add(capsule(x, 2.08, z, x * 0.6, Hw + 0.05, z * 0.6, 0.006, b.mat({ kind: "hay", colour: "#6a5a3a" })));
  // posts, the great beams (naturally curved logs), rafters of bamboo under the thatch
  for (const [x, z, s2] of [[-X, Z0, 0.24], [X, Z0, 0.24], [-X, Z1, 0.24], [X, Z1, 0.24], [-1.8, Z0, 0.2], [1.8, Z0, 0.2], [-X, -0.3, 0.32], [X, -0.3, 0.24]] as const) b.add(hashira(x, z, 0, Hw + 0.4, s2, smoked));
  b.add(...logBeam([-X, Hw + 0.1, -0.3], [X, Hw + 0.1, -0.3], 0.2, 0.32, smoked), ...logBeam([-X, Hw + 0.35, Z0 + 1.4], [X, Hw + 0.35, Z0 + 1.4], 0.17, 0.25, smoked), ...logBeam([-1.0, Hw + 0.45, Z0], [-1.0, Hw + 0.5, Z1], 0.16, 0.18, smoked), ...logBeam([1.1, Hw + 0.5, Z0], [1.1, Hw + 0.45, Z1], 0.15, 0.2, smoked));
  for (const [x0, z0, x1, z1] of [[-X, Z0, X, Z0], [-X, Z1, X, Z1], [-X, Z0, -X, Z1], [X, Z0, X, Z1]] as const) b.add(boxAt(Math.min(x0, x1) - 0.12, Hw, Math.min(z0, z1) - 0.12, Math.max(x0, x1) + 0.12, Hw + 0.25, Math.max(z0, z1) + 0.12, smoked));
  for (const s of [-1, 1]) {
    b.add(leaf((x, y, z) => Math.max(Math.abs(y - (Hw + 0.25 + (X + 0.4 - s * x) * ((ridge - Hw) / (X + 0.4)))) * 0.6 - 0.15, -s * x - 0.05, Math.abs(z - (Z0 + Z1) / 2) - (Z1 - Z0) / 2 - 0.3), [s > 0 ? -0.1 : -X - 0.5, Hw, Z0 - 0.4], [s > 0 ? X + 0.5 : 0.1, ridge + 0.4, Z1 + 0.4], thatch));
    b.add(repeatZ(leaf((x, y, z) => { const yy = Hw + 0.25 + (X + 0.4 - s * x) * ((ridge - Hw) / (X + 0.4)) - 0.2; return Math.max(Math.hypot((y - yy) * 0.83, z - Z0 - 0.2) - 0.035, -s * x, s * x - X - 0.4); }, [s > 0 ? 0 : -X - 0.4, Hw, Z0 + 0.12], [s > 0 ? X + 0.4 : 0, ridge, Z0 + 0.28], bam), 0.45, 13));
    for (let k = 1; k < 6; k++) { const xx = s * (X + 0.4) * (1 - k / 6); b.add(capsule(xx, Hw + 0.25 + (X + 0.4 - s * xx) * ((ridge - Hw) / (X + 0.4)) - 0.27, Z0 - 0.3, xx, Hw + 0.25 + (X + 0.4 - s * xx) * ((ridge - Hw) / (X + 0.4)) - 0.27, Z1 + 0.3, 0.02, bam)); }
  }
  // walls: earth between the posts, a barred window in the back wall, board doors on the left, a kamidana high up
  b.add(cut(boxAt(-X, 0, Z0 - 0.15, X, Hw, Z0, wall), [boxAt(0.9, 1.0, Z0 - 0.4, 2.1, 1.85, Z0 + 0.2, 0)]), repeatX(boxAt(0.95, 1.0, Z0 - 0.1, 0.99, 1.85, Z0 - 0.04, smoked), 0.11, 11), boxAt(0.88, 0.95, Z0 - 0.15, 2.12, 1.0, Z0 + 0.02, smoked), boxAt(0.88, 1.85, Z0 - 0.15, 2.12, 1.9, Z0 + 0.02, smoked));
  b.portals.push({ x: 1.5, y: 1.42, z: Z0 - 0.07, axis: "z", hw: 0.6, hh: 0.42, tint: "clear" });
  b.add(boxAt(-X - 0.15, 0, Z0, -X, Hw, Z1, b.mat({ kind: "boards", colour: "#3e2c1c", course: 0.28, age: 0.5 })), repeatZ(boxAt(-X, 0.2, Z0 + 0.3, -X + 0.03, Hw - 0.2, Z0 + 0.36, smoked), 1.2, 5));
  b.add(boxAt(X, 0, Z0, X + 0.15, Hw, Z1, wall));
  // gable ends closed in boards and earth up to the ridge; a board wainscot and a tie rail along the back wall
  for (const z of [Z0 - 0.15, Z1]) b.add(leaf((x, y, zz) => Math.max(Math.abs(zz - z - 0.075) - 0.075, Hw - y, (y - Hw) - (ridge - Hw) * (1 - Math.abs(x) / (X + 0.4))), [-X - 0.4, Hw, z], [X + 0.4, ridge, z + 0.15], b.mat({ kind: "boards", colour: "#2e2218", course: 0.3, age: 0.6 })));
  b.add(cut(boxAt(-X, 0, Z0, X, 0.85, Z0 + 0.03, b.mat({ kind: "boards", colour: "#3a2a1c", course: 0.25, age: 0.4 })), [boxAt(0.88, 0.8, Z0 - 0.1, 2.12, 1.0, Z0 + 0.1, 0)]), boxAt(-X, 0.85, Z0, X, 0.9, Z0 + 0.05, smoked), boxAt(-X, 1.9, Z0, X, 2.0, Z0 + 0.06, smoked));
  b.add(boxAt(X - 0.03, 0, Z0, X, 0.85, Z1, b.mat({ kind: "boards", colour: "#3a2a1c", course: 0.25, age: 0.4 })), boxAt(X - 0.06, 1.9, Z0, X, 2.0, Z1, smoked));
  const white = b.mat({ kind: "washi", colour: "#f1ebdc" }), green = b.mat({ kind: "foliage", colour: "#2f4a2a" });
  b.add(boxAt(-X, 2.05, -1.6, -X + 0.42, 2.09, -0.2, smoked), boxAt(-X + 0.05, 2.09, -1.15, -X + 0.33, 2.38, -0.65, b.mat({ kind: "oak", colour: "#b8986a" })), boxAt(-X + 0.03, 2.38, -1.22, -X + 0.36, 2.44, -0.58, b.mat({ kind: "oak", colour: "#8a6a44" })));
  for (const z of [-1.4, -0.4]) b.add(cylY(-X + 0.2, z, 2.09, 2.17, 0.03, white), ellipsoid(-X + 0.2, 2.26, z, 0.07, 0.11, 0.07, green));
  b.add(capsule(-X + 0.44, 2.0, -1.65, -X + 0.44, 1.98, -0.15, 0.02, b.mat({ kind: "hay", colour: "#c8b078" })));
  for (const z of [-1.35, -0.9, -0.45]) for (let k = 0; k < 3; k++) b.add(boxAt(-X + 0.43, 1.88 - k * 0.07 - (k % 2) * 0.01, z - 0.03 + (k % 2) * 0.03, -X + 0.45, 1.95 - k * 0.07, z + 0.03 + (k % 2) * 0.03, white));
  // persimmons drying on strings from the beam, a couple of zabuton and rush mats by the hearth
  const kaki = b.mat({ kind: "velvet", colour: "#c8561c" }), cord = b.mat({ kind: "hay", colour: "#8a7048" });
  for (const x of [2.2, 2.45, 2.7]) { b.add(capsule(x, Hw - 0.05, Z0 + 0.5, x, Hw - 0.95, Z0 + 0.5, 0.004, cord)); for (let k = 0; k < 6; k++) b.add(ellipsoid(x + 0.01 * Math.sin(k * 2 + x * 5), Hw - 0.18 - k * 0.14, Z0 + 0.5, 0.032, 0.045, 0.032, kaki)); }
  b.add(boxAt(-2.0, 0.0, -1.0, -1.1, 0.012, 0.9, b.mat({ kind: "tatami-mat", pattern: "plain" })), boxAt(1.1, 0.0, -1.0, 2.0, 0.012, 0.9, b.mat({ kind: "tatami-mat", pattern: "plain" })));
  b.place();
  return { half: X, ceiling: Hw, kamoi: 1.8, garden: 0, interiorBox: { lo: [-X - 1, -1, Z0 - 0.1], hi: [X + 1, ridge + 1, Z1 + 3] } };
}
