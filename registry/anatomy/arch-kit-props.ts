/**
 * ARCH1 props for working interiors: the tools and goods of a trade at real size, so a bakery, forge, apothecary,
 * workshop, scriptorium, tavern or clockmaker's reads as worked in. Each prop is built at its own origin (front toward
 * +z, standing on y = 0) and places itself at (x, z), turned by `yaw` degrees and raised by `y`.
 */
import type { Node, SculptPrim } from "./arch-sdf";
import { leaf, sculpt, union } from "./arch-sdf";
import type { SceneBuilder } from "./arch-kit";
import { boxAt, capsule, coneY, cut, cylX, cylY, cylZ, ellipsoid, repeatAround, repeatX, revolve, sphere } from "./arch-kit";
import type { SurfaceSpec } from "./arch-surface";

const M = {
  oak: { kind: "oak", colour: "#6a4c32", age: 0.4 } as SurfaceSpec,
  dark: { kind: "oak", colour: "#3e2c1e", age: 0.5 } as SurfaceSpec,
  pale: { kind: "oak", colour: "#a8865c", age: 0.3 } as SurfaceSpec,
  iron: { kind: "iron", colour: "#1e1c1a", age: 0.35 } as SurfaceSpec,
  brass: { kind: "brass", colour: "#c09a4e" } as SurfaceSpec,
  pewter: { kind: "zinc", colour: "#8c8c88" } as SurfaceSpec,
  bread: { kind: "bread" } as SurfaceSpec,
  burlap: { kind: "jute", colour: "#c2ad84", unit: 0.008 } as SurfaceSpec,
  leather: { kind: "leather", colour: "#4a2e1e" } as SurfaceSpec,
  wax: { kind: "plain", colour: "#efe6cf" } as SurfaceSpec,
  flame: { kind: "flame", emit: 12 } as SurfaceSpec,
};
const place = (b: SceneBuilder, x: number, z: number, yaw = 0, y = 0) => b.place({ x, z, yaw, y });

/** A three-legged stool. */
export function stool(b: SceneBuilder, x: number, z: number, yaw = 0, h = 0.46) {
  const m = b.mat(M.oak);
  b.add(cylY(0, 0, h - 0.045, h, 0.17, m));
  for (let k = 0; k < 3; k++) { const a = (k * 2 * Math.PI) / 3, c = Math.cos(a), s = Math.sin(a); b.add(capsule(c * 0.1, h - 0.04, s * 0.1, c * 0.21, 0, s * 0.21, 0.02, m), capsule(c * 0.165, 0.16, s * 0.165, Math.cos(a + 2.09) * 0.165, 0.16, Math.sin(a + 2.09) * 0.165, 0.011, m)); }
  place(b, x, z, yaw);
}
/** A candle in a pewter stick, lit. */
export function candlestick(b: SceneBuilder, x: number, y: number, z: number, power = 0.05) {
  const pw = b.mat(M.pewter);
  b.add(cylY(x, z, y, y + 0.012, 0.055, pw), cylY(x, z, y + 0.012, y + 0.05, 0.012, pw), cylY(x, z, y + 0.05, y + 0.065, 0.03, pw), cylY(x, z, y + 0.065, y + 0.2, 0.012, b.mat(M.wax)), ellipsoid(x, y + 0.225, z, 0.007, 0.02, 0.007, b.mat(M.flame)));
  b.light({ x, y: y + 0.23, z, kelvin: 1850, power });
  b.place();
}
/** A hanging iron lantern with glass panes and a candle, lit, on a chain from `yTop`. */
export function hangingLantern(b: SceneBuilder, x: number, y: number, z: number, yTop: number, power = 0.08) {
  const ir = b.mat(M.iron), gl = b.mat({ kind: "glass", colour: "#e8d8a8", clear: 0.7 });
  b.add(boxAt(x - 0.1, y, z - 0.1, x + 0.1, y + 0.02, z + 0.1, ir), boxAt(x - 0.09, y + 0.02, z - 0.09, x + 0.09, y + 0.26, z + 0.09, gl), coneY(x, z, y + 0.26, y + 0.36, 0.13, 0.02, ir), capsule(x, y + 0.36, z, x, yTop, z, 0.006, ir));
  for (const [dx, dz] of [[-0.09, -0.09], [0.09, -0.09], [-0.09, 0.09], [0.09, 0.09]]) b.add(boxAt(x + dx - 0.008, y, z + dz - 0.008, x + dx + 0.008, y + 0.27, z + dz + 0.008, ir));
  b.add(cylY(x, z, y + 0.02, y + 0.1, 0.02, b.mat(M.wax)), ellipsoid(x, y + 0.12, z, 0.007, 0.02, 0.007, b.mat(M.flame)));
  b.light({ x, y: y + 0.13, z, kelvin: 1900, power });
  b.place();
}
/** A pewter tankard with its handle. */
export function tankard(b: SceneBuilder, x: number, y: number, z: number, turn = 0) {
  const pw = b.mat(M.pewter), c = Math.cos(turn), s = Math.sin(turn);
  b.add(revolve(x, z, y, y + 0.14, t => 0.045 - 0.006 * t + (t < 0.08 ? 0.006 : 0), 0.052, pw, 0, 1));
  b.add(capsule(x + c * 0.045, y + 0.12, z + s * 0.045, x + c * 0.08, y + 0.1, z + s * 0.08, 0.007, pw), capsule(x + c * 0.08, y + 0.1, z + s * 0.08, x + c * 0.075, y + 0.04, z + s * 0.075, 0.007, pw), capsule(x + c * 0.075, y + 0.04, z + s * 0.075, x + c * 0.045, y + 0.025, z + s * 0.045, 0.007, pw));
  b.place();
}
/** A joiner's workbench: a thick top on a framed base, a front vice, a plane, a mallet, chisels and shavings; a tool board behind. */
export function workbench(b: SceneBuilder, x: number, z: number, yaw = 0, w = 2.2, board = true) {
  const oak = b.mat(M.pale), dk = b.mat(M.dark), ir = b.mat(M.iron), shav = b.mat({ kind: "oak", colour: "#d8b882", age: 0 });
  b.add(boxAt(-w / 2, 0.82, -0.35, w / 2, 0.9, 0.35, oak, 0, 0.01));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.add(boxAt(sx * (w / 2 - 0.16) - 0.045, 0, sz * 0.27 - 0.045, sx * (w / 2 - 0.16) + 0.045, 0.82, sz * 0.27 + 0.045, oak));
  b.add(boxAt(-w / 2 + 0.12, 0.15, -0.3, w / 2 - 0.12, 0.2, 0.3, oak), boxAt(-w / 2 + 0.12, 0.2, -0.28, w / 2 - 0.12, 0.22, 0.28, oak));
  // the front vice: a wooden jaw, its screw and tommy bar
  b.add(boxAt(-w / 2 + 0.08, 0.58, 0.35, -w / 2 + 0.5, 0.9, 0.42, oak, 0, 0.01), cylZ(-w / 2 + 0.29, 0.72, 0.42, 0.52, 0.03, dk), capsule(-w / 2 + 0.17, 0.72, 0.5, -w / 2 + 0.41, 0.72, 0.5, 0.012, dk));
  // on the bench: a plane, a mallet, chisels, a half-turned leg, curls of shavings
  b.add(boxAt(0.1, 0.9, 0.0, 0.36, 0.96, 0.07, dk, 0, 0.01), sphere(0.31, 0.985, 0.035, 0.02, dk), boxAt(0.12, 0.96, 0.025, 0.17, 1.0, 0.045, dk));
  b.add(cylX(0.93, -0.15, -0.55, -0.4, 0.045, dk), capsule(-0.475, 0.93, -0.15, -0.475, 0.93, 0.15, 0.014, oak));
  for (let k = 0; k < 4; k++) b.add(capsule(0.55 + k * 0.05, 0.915, -0.2, 0.6 + k * 0.05, 0.915, 0.0, 0.006, ir), capsule(0.6 + k * 0.05, 0.915, 0.0, 0.615 + k * 0.05, 0.915, 0.1, 0.014, dk));
  b.add(leaf((px, py, pz) => { const t = (px + 0.15) / 0.5; return Math.max(Math.hypot(py - 0.93, pz + 0.22) - (0.025 + 0.012 * Math.sin(t * 12)), -t, t - 1); }, [-0.16, 0.88, -0.27], [0.36, 0.98, -0.17], oak));
  for (let k = 0; k < 9; k++) { const sx = -0.6 + k * 0.17 + 0.05 * Math.sin(k * 2.3), sz = 0.1 + 0.15 * Math.sin(k * 1.7); b.add(leaf((px, py, pz) => Math.abs(Math.hypot(px - sx, py - 0.925) - 0.02) - 0.002 + Math.max(0, Math.abs(pz - sz) - 0.015), [sx - 0.03, 0.9, sz - 0.02], [sx + 0.03, 0.95, sz + 0.02], shav)); }
  for (let k = 0; k < 12; k++) b.add(ellipsoid(-w / 2 + 0.3 + k * 0.17, 0.008, 0.45 + 0.2 * Math.sin(k * 2.1), 0.05, 0.008, 0.035, shav));
  if (board) {
    // the tool board on the wall behind: saws, a square, hammers, a row of chisels in a rack
    const bd = b.mat({ kind: "boards", colour: "#7a5a3a", course: 0.2, age: 0.3 });
    b.add(boxAt(-w / 2, 1.05, -0.48, w / 2, 1.95, -0.45, bd));
    for (const [sx, l] of [[-0.75, 0.55], [-0.4, 0.45]] as const) b.add(boxAt(sx - 0.07, 1.85 - l, -0.45, sx + 0.07, 1.85, -0.44, b.mat({ kind: "steel" })), boxAt(sx - 0.06, 1.78, -0.45, sx + 0.06, 1.92, -0.42, dk));
    b.add(boxAt(0.0, 1.3, -0.45, 0.03, 1.8, -0.43, ir), boxAt(0.0, 1.77, -0.45, 0.25, 1.8, -0.43, ir));
    for (const hx of [0.45, 0.6]) b.add(capsule(hx, 1.25, -0.43, hx, 1.6, -0.43, 0.012, dk), boxAt(hx - 0.06, 1.6, -0.45, hx + 0.06, 1.66, -0.41, ir));
    b.add(boxAt(0.8, 1.5, -0.45, 1.05, 1.54, -0.38, dk)); for (let k = 0; k < 6; k++) b.add(capsule(0.82 + k * 0.04, 1.56, -0.41, 0.82 + k * 0.04, 1.42, -0.41, 0.008, k % 2 ? ir : dk));
  }
  place(b, x, z, yaw);
}
/** A London-pattern anvil on an oak stump: feet, waist, body with a hardened face, the horn tapering to a point, the heel. */
export function anvil(b: SceneBuilder, x: number, z: number, yaw = 0) {
  const ir = b.mat({ kind: "iron", colour: "#26231f", age: 0.2 }), face = b.mat({ kind: "steel" }), st = b.mat({ kind: "oak", colour: "#4a3624", age: 0.7 });
  b.add(revolve(0, 0, 0, 0.5, t => 0.3 + 0.02 * Math.sin(t * 9), 0.33, st, 0, 0.5), cylY(0, 0, 0.47, 0.5, 0.3, b.mat({ kind: "oak", colour: "#6a5034" })));
  b.add(boxAt(-0.24, 0.5, -0.15, 0.24, 0.57, 0.15, ir, 0, 0.02), boxAt(-0.11, 0.57, -0.07, 0.11, 0.72, 0.07, ir, 0, 0.02), boxAt(-0.32, 0.72, -0.09, 0.2, 0.86, 0.09, ir, 0, 0.015), boxAt(-0.32, 0.86, -0.088, 0.2, 0.872, 0.088, face, 0, 0.004));
  b.add(sculpt([{ a: [0.2, 0.81, 0], b: [0.52, 0.85, 0], r1: 0.075, r2: 0.008 }], 0.02, ir), cut(boxAt(-0.42, 0.8, -0.06, -0.32, 0.87, 0.06, ir, 0, 0.01), [boxAt(-0.39, 0.82, -0.02, -0.35, 0.9, 0.02, 0)]));
  b.add(capsule(0.05, 0.875, -0.04, 0.4, 0.88, 0.25, 0.012, ir), capsule(0.05, 0.875, -0.01, 0.4, 0.88, 0.28, 0.012, ir), boxAt(-0.22, 0.872, -0.05, -0.02, 0.9, 0.03, b.mat({ kind: "fire", emit: 1.4 }), 0, 0.01));
  place(b, x, z, yaw);
}
/** A smith's forge: a brick hearth at working height with a firepot of glowing coals, a hood and chimney, leather bellows on a rocker, a quench tub. */
export function forge(b: SceneBuilder, x: number, z: number, yaw = 0, w = 1.4, ceiling = 3.4) {
  const br = b.mat({ kind: "brick", colour: "#6a3a2a", age: 0.9, soot: 1.4 }), coal = b.mat({ kind: "rock", colour: "#1a1816" }), hot = b.mat({ kind: "fire", emit: 2.4 }), le = b.mat(M.leather), dk = b.mat(M.dark), ir = b.mat(M.iron);
  b.add(cut(boxAt(-w / 2, 0, -0.55, w / 2, 0.78, 0.45, br), [cylY(0, -0.05, 0.6, 0.9, 0.24, 0)]));
  for (let k = 0; k < 14; k++) { const a = k * 2.4, r = 0.05 + 0.17 * ((k * 0.618) % 1); b.add(sphere(Math.cos(a) * r, 0.66 + 0.02 * (k % 3), -0.05 + Math.sin(a) * r, 0.045, r < 0.12 ? hot : coal)); }
  b.add(ellipsoid(0, 0.72, -0.05, 0.13, 0.05, 0.13, hot));
  b.add(leaf((px, py, pz) => { const t = Math.min(1, Math.max(0, (py - 1.65) / 0.95)), hx = (w / 2 + 0.1) * (1 - t) + 0.3 * t, hz = 0.55 * (1 - t) + 0.25 * t, zc = -0.05 - 0.25 * t; return Math.max(Math.abs(px) - hx, Math.abs(pz - zc) - hz, 1.65 - py, py - 2.6) * 0.8; }, [-w / 2 - 0.12, 1.65, -0.62], [w / 2 + 0.12, 2.6, 0.52], br));
  b.add(boxAt(-0.3, 2.6, -0.55, 0.3, ceiling + 0.2, -0.05, br));
  // the bellows: a leather wedge between boards, hinged at the nozzle, worked by a pole on a rocker
  const bx = w / 2 + 0.55;
  b.add(sculpt([{ a: [bx, 0.95, -0.25], e: [0.32, 0.12, 0.4] }, { a: [bx, 0.95, 0.15], b: [bx - 0.1, 0.92, 0.35], r1: 0.1, r2: 0.04 }], 0.06, le), boxAt(bx - 0.34, 1.06, -0.65, bx + 0.34, 1.09, 0.2, dk), boxAt(bx - 0.34, 0.8, -0.65, bx + 0.34, 0.83, 0.2, dk));
  b.add(capsule(bx - 0.12, 0.93, 0.33, w / 2 - 0.02, 0.7, 0.05, 0.025, ir), capsule(bx, 1.09, -0.5, bx, 1.75, -0.6, 0.02, dk), capsule(bx, 1.75, -0.6, bx + 0.6, 1.9, -0.2, 0.02, dk), boxAt(bx - 0.04, 0, -0.75, bx + 0.04, 0.8, -0.67, dk));
  // the quench tub: a half barrel of dark water
  b.add(revolve(-w / 2 - 0.45, 0.2, 0, 0.55, t => 0.3 + 0.03 * Math.sin(Math.PI * t), 0.33, b.mat({ kind: "boards", colour: "#4a3624", course: 0.09, age: 0.8 })), cylY(-w / 2 - 0.45, 0.2, 0.47, 0.5, 0.29, b.mat({ kind: "water", colour: "#1a2224" })));
  b.light({ x: 0, y: 0.95, z: 0.1, kelvin: 1600, power: 0.3, shadow: true });
  place(b, x, z, yaw);
}
/** Slatted bread racks against a wall, `w` wide: round boules on the lower shelves, baguettes standing in baskets on the top. */
export function breadRack(b: SceneBuilder, x: number, z: number, yaw = 0, w = 2.4, h = 2.0) {
  const oak = b.mat(M.oak), bread = b.mat(M.bread), wicker = b.mat({ kind: "cane", colour: "#a8824e" });
  for (const ux of [-w / 2, w / 2 - 0.05]) b.add(boxAt(ux, 0, -0.4, ux + 0.05, h, 0, oak));
  const shelves = 4;
  for (let s = 0; s < shelves; s++) {
    const y = 0.35 + s * ((h - 0.45) / shelves);
    b.add(repeatX(boxAt(-w / 2 + 0.05, y - 0.02, -0.38, -w / 2 + 0.11, y, -0.02, oak), 0.1, Math.floor((w - 0.1) / 0.1)));
    if (s < shelves - 1) for (let k = 0; k < Math.floor(w / 0.26); k++) { const bx = -w / 2 + 0.2 + k * 0.26, rr = 0.1 + 0.015 * Math.sin(k * 3.7 + s); b.add(ellipsoid(bx, y + rr * 0.55, -0.2 + 0.03 * Math.sin(k * 1.9), rr, rr * 0.6, rr * 0.95, bread)); }
    else for (let k = 0; k < 3; k++) { const bx = -w / 2 + 0.35 + k * ((w - 0.7) / 2); b.add(cut(cylY(bx, -0.2, y, y + 0.25, 0.14, wicker), [cylY(bx, -0.2, y + 0.03, y + 0.4, 0.12, 0)])); for (let j = 0; j < 5; j++) { const a = j * 1.26; b.add(capsule(bx + Math.cos(a) * 0.06, y + 0.03, -0.2 + Math.sin(a) * 0.06, bx + Math.cos(a) * 0.11, y + 0.62, -0.2 + Math.sin(a) * 0.09, 0.028, bread)); } }
  }
  place(b, x, z, yaw);
}
/** A sack of flour, slumped and tied at the neck. */
export function flourSack(b: SceneBuilder, x: number, z: number, yaw = 0, s = 1) {
  b.add(sculpt([{ a: [0, 0.26 * s, 0], e: [0.27 * s, 0.27 * s, 0.2 * s] }, { a: [0, 0.48 * s, 0], b: [0, 0.62 * s, 0], r1: 0.13 * s, r2: 0.05 * s }, { a: [0.03 * s, 0.66 * s, 0], e: [0.07 * s, 0.05 * s, 0.05 * s] }], 0.1 * s, b.mat(M.burlap)), cylY(0, 0, 0.6 * s, 0.63 * s, 0.055 * s, b.mat({ kind: "hay", colour: "#8a7048" })));
  place(b, x, z, yaw);
}
/** A bread peel leaning against a wall: a long ash handle and a thin flat blade. */
export function peel(b: SceneBuilder, x: number, z: number, yaw = 0) {
  const ash = b.mat(M.pale);
  b.add(capsule(0, 0.42, 0.02, 0, 2.2, -0.12, 0.018, ash), ellipsoid(0, 0.22, 0.04, 0.17, 0.22, 0.012, ash));
  place(b, x, z, yaw);
}
/** A row of faience albarelli (waisted pharmacy jars, white with a blue band and a label) on a shelf, from x0 to x1 at height y. */
export function jarRow(b: SceneBuilder, x0: number, x1: number, y: number, z: number, tall = 0.22) {
  const n = Math.max(1, Math.floor((x1 - x0) / 0.16)), white = b.mat({ kind: "enamel", colour: "#e6e0cf" }), blue = b.mat({ kind: "enamel", colour: "#2a4a8a" }), label = b.mat({ kind: "parchment" });
  const jar = union([revolve(x0 + 0.08, z, y, y + tall, t => 0.06 - 0.012 * Math.sin(Math.PI * t) + (t > 0.9 ? -0.015 : 0), 0.065, white, 0, 1), cylY(x0 + 0.08, z, y + tall * 0.25, y + tall * 0.33, 0.055, blue), cylY(x0 + 0.08, z, y + tall * 0.7, y + tall * 0.75, 0.053, blue), boxAt(x0 + 0.04, y + tall * 0.42, z + 0.045, x0 + 0.12, y + tall * 0.6, z + 0.058, label)]);
  b.add(repeatX(jar, 0.16, n)); b.place();
}
/** A brass balance: a turned column, a beam and two pans each hung on three chains. */
export function balance(b: SceneBuilder, x: number, y: number, z: number) {
  const br = b.mat(M.brass);
  b.add(cylY(0, 0, 0, 0.02, 0.09, br), revolve(0, 0, 0.02, 0.42, t => 0.012 + 0.012 * Math.exp(-((t - 0.1) ** 2) / 0.004), 0.03, br), capsule(-0.22, 0.42, 0, 0.22, 0.42, 0, 0.007, br), sphere(0, 0.44, 0, 0.018, br));
  for (const s of [-1, 1]) { b.add(cut(sphere(s * 0.22, 0.2, 0, 0.09, br), [sphere(s * 0.22, 0.2, 0, 0.085, 0), boxAt(s * 0.22 - 0.1, 0.17, -0.1, s * 0.22 + 0.1, 0.4, 0.1, 0)])); for (let k = 0; k < 3; k++) { const a = (k * 2 * Math.PI) / 3; b.add(capsule(s * 0.22, 0.42, 0, s * 0.22 + Math.cos(a) * 0.075, 0.17, Math.sin(a) * 0.075, 0.0025, br)); } }
  place(b, x, z, 0, y);
}
/** A bunch of herbs hung head down from a beam on a string. */
export function herbBunch(b: SceneBuilder, x: number, yTop: number, z: number, colour = "#6a7040") {
  const leaves = b.mat({ kind: "foliage", colour }), twine = b.mat({ kind: "hay", colour: "#8a7048" });
  b.add(capsule(x, yTop, z, x, yTop - 0.14, z, 0.003, twine), coneY(x, z, yTop - 0.24, yTop - 0.13, 0.03, 0.012, b.mat({ kind: "hay", colour: "#7a6a40" })), sculpt([{ a: [x, yTop - 0.36, z], e: [0.09, 0.15, 0.08] }, { a: [x + 0.04, yTop - 0.42, z + 0.02], e: [0.06, 0.08, 0.05] }], 0.03, leaves));
  b.place();
}
/** A scriptorium desk: trestles, a steep writing slope with an open manuscript, an ink horn and a quill, a lectern above for the exemplar, a bench. */
export function writingDesk(b: SceneBuilder, x: number, z: number, yaw = 0) {
  const oak = b.mat(M.oak), dk = b.mat(M.dark), horn = b.mat({ kind: "enamel", colour: "#3a2a1c" }), quill = b.mat({ kind: "plain", colour: "#efe8d8" });
  for (const sx of [-0.45, 0.45]) b.add(boxAt(sx - 0.04, 0, -0.3, sx + 0.04, 0.95, -0.22, oak), boxAt(sx - 0.04, 0, 0.0, sx + 0.04, 0.75, 0.08, oak), boxAt(sx - 0.04, 0.05, -0.3, sx + 0.04, 0.12, 0.08, oak));
  // a sloping board: distances along y shrink by the slope's cosine to stay safe for marching
  const slope = (y0: number, z0: number, depth: number, rise: number, n0: number, n1: number) => (px: number, py: number, pz: number) => { const t = (pz - z0) / depth, yc = y0 + rise * (1 - t); return Math.max((Math.abs(py - yc - (n0 + n1) / 2) - (n1 - n0) / 2) * 0.8, -t * depth * 0.8, (t - 1) * depth * 0.8, Math.abs(px) - 0.55); };
  b.add(leaf(slope(0.78, -0.32, 0.42, 0.28, 0, 0.025), [-0.56, 0.75, -0.33], [0.56, 1.1, 0.11], oak), boxAt(-0.55, 0.76, 0.08, 0.55, 0.83, 0.11, oak));
  // the manuscript: two pages on the slope, text in two columns, a red and blue initial
  for (const [s, px] of [[-1, -0.18], [1, 0.18]] as const) b.add(leaf((qx, py, pz) => { const t = (pz + 0.28) / 0.34, yc = 0.79 + 0.28 * 0.42 / 0.42 * (1 - (pz + 0.32) / 0.42) + 0.025 + 0.004 * Math.sin((qx - px) * 6) * s; return Math.max((Math.abs(py - yc) - 0.003) * 0.8, -t * 0.27, (t - 1) * 0.27, Math.abs(qx - px) - 0.17); }, [px - 0.18, 0.78, -0.3], [px + 0.18, 1.12, 0.08], b.mat({ kind: "parchment", pattern: "text", unit: 0.34, course: 0.34, offset: [-px, 0] })));
  b.add(capsule(0.48, 0.86, -0.05, 0.47, 0.98, -0.05, 0.022, horn), capsule(0.4, 0.93, -0.05, 0.55, 1.22, -0.12, 0.003, quill), ellipsoid(0.52, 1.16, -0.1, 0.012, 0.07, 0.006, quill));
  // the lectern holding the exemplar above the desk
  b.add(boxAt(-0.03, 0.95, -0.3, 0.03, 1.3, -0.25, dk), leaf(slope(1.24, -0.42, 0.2, 0.18, 0, 0.02), [-0.56, 1.2, -0.43], [0.56, 1.45, -0.21], dk), boxAt(-0.25, 1.3, -0.38, 0.25, 1.4, -0.33, b.mat({ kind: "parchment", pattern: "text", unit: 0.5, course: 0.3 })));
  b.add(boxAt(-0.5, 0.42, 0.42, 0.5, 0.47, 0.72, oak), boxAt(-0.45, 0, 0.45, -0.39, 0.42, 0.69, oak), boxAt(0.39, 0, 0.45, 0.45, 0.42, 0.69, oak));
  place(b, x, z, yaw);
}
/** A wall clock on a wall facing +z at zWall: "round" (a dial in a turned bezel), "regulator" (a tall glazed case with its pendulum) or "cuckoo" (a carved house with pine-cone weights). */
export function wallClock(b: SceneBuilder, x: number, y: number, zWall: number, style: "round" | "regulator" | "cuckoo", wood: SurfaceSpec = M.dark) {
  const wd = b.mat(wood), dial = b.mat({ kind: "plain", colour: "#efe6cf" }), ink = b.mat({ kind: "iron", colour: "#1a1816", age: 0 }), br = b.mat(M.brass), z = zWall;
  const face = (cy: number, r: number, zf: number): Node[] => [cylZ(x, cy, zf, zf + 0.012, r, dial), repeatAround2(boxAt(x + r * 0.78, cy - 0.004, zf + 0.012, x + r * 0.92, cy + 0.004, zf + 0.015, ink), x, cy, 12, r), capsule(x, cy, zf + 0.016, x + r * 0.35, cy + r * 0.3, zf + 0.016, 0.006, ink), capsule(x, cy, zf + 0.018, x - r * 0.15, cy + r * 0.62, zf + 0.018, 0.004, ink)];
  if (style === "round") b.add(cylZ(x, y, z, z + 0.05, 0.2, wd), cylZ(x, y, z + 0.05, z + 0.06, 0.19, br), ...face(y, 0.17, z + 0.058));
  else if (style === "regulator") {
    b.add(boxAt(x - 0.18, y - 0.75, z, x + 0.18, y + 0.2, z + 0.13, wd, 0, 0.01), boxAt(x - 0.2, y + 0.2, z, x + 0.2, y + 0.28, z + 0.15, wd), boxAt(x - 0.14, y - 0.7, z + 0.13, x + 0.14, y - 0.12, z + 0.135, b.mat({ kind: "glass", colour: "#4a4a44", clear: 0.7 })));
    b.add(...face(y + 0.02, 0.14, z + 0.13), capsule(x, y - 0.12, z + 0.06, x, y - 0.55, z + 0.06, 0.004, br), cylZ(x, y - 0.58, z + 0.05, z + 0.07, 0.05, br));
  } else {
    b.add(boxAt(x - 0.16, y - 0.2, z, x + 0.16, y + 0.12, z + 0.12, wd), leaf((px, py, pz) => Math.max(py - (y + 0.3 - Math.abs(px - x) * 0.9), y + 0.1 - py, Math.abs(px - x) - 0.22, pz - z - 0.14, z - pz), [x - 0.23, y + 0.1, z], [x + 0.23, y + 0.31, z + 0.14], wd), ...face(y - 0.04, 0.09, z + 0.12));
    for (const dx of [-0.06, 0.06]) b.add(capsule(x + dx, y - 0.2, z + 0.06, x + dx, y - 0.75 + (dx > 0 ? 0.15 : 0), z + 0.06, 0.002, br), sculpt([{ a: [x + dx, y - 0.82 + (dx > 0 ? 0.15 : 0), z + 0.06], e: [0.025, 0.07, 0.025] }], 0.01, br));
    b.add(sphere(x, y + 0.33, z + 0.12, 0.03, wd), ellipsoid(x, y + 0.2, z + 0.12, 0.05, 0.03, 0.01, b.mat({ kind: "foliage", colour: "#4a5a30" })));
  }
  b.place();
}
/** A watchmaker's magnifier lamp: a weighted foot, an arm and a ring lens, lit. */
export function magnifierLamp(b: SceneBuilder, x: number, y: number, z: number) {
  const br = b.mat(M.brass), gl = b.mat({ kind: "glass", colour: "#9aa8a8", clear: 0.85 });
  b.add(cylY(0, 0, 0, 0.03, 0.08, br), capsule(0, 0.03, 0, 0.02, 0.35, -0.05, 0.008, br), capsule(0.02, 0.35, -0.05, 0.18, 0.3, 0.12, 0.008, br), cut(cylY(0.18, 0.12, 0.28, 0.3, 0.07, br), [cylY(0.18, 0.12, 0.2, 0.4, 0.06, 0)]), cylY(0.18, 0.12, 0.285, 0.295, 0.06, gl));
  b.light({ x: 0.18, y: 0.33, z: 0.12, kelvin: 2800, power: 0.05 });
  place(b, x, z, 0, y);
}
/** Small clock parts on a bench: wheels with their teeth, a movement in its plates. */
export function clockParts(b: SceneBuilder, x: number, y: number, z: number) {
  const br = b.mat(M.brass), st = b.mat({ kind: "steel" });
  for (const [dx, dz, r] of [[0, 0, 0.035], [0.08, 0.03, 0.022], [-0.07, 0.05, 0.028], [0.03, -0.07, 0.018]] as const) b.add(cut(cylY(dx, dz, 0, 0.003, r, br), [cylY(dx, dz, -0.01, 0.01, r * 0.75, 0)]), repeatAround(boxAt(dx + r - 0.002, 0, dz - 0.002, dx + r + 0.004, 0.003, dz + 0.002, br), dx, dz, Math.round(r * 900), r + 0.005), cylY(dx, dz, 0, 0.012, 0.003, st));
  b.add(boxAt(0.12, 0, -0.08, 0.2, 0.002, 0.0, br), boxAt(0.12, 0.03, -0.08, 0.2, 0.032, 0.0, br), ...[[0.13, -0.07], [0.19, -0.07], [0.13, -0.01], [0.19, -0.01]].map(([px, pz]) => cylY(px, pz, 0, 0.03, 0.003, st)));
  place(b, x, z, 0, y);
}
/** Repeat a node round a horizontal axis along z at (cx, cy) (dial ticks). */
function repeatAround2(n: Node, cx: number, cy: number, count: number, R: number): Node {
  const step = (Math.PI * 2) / count;
  return { lo: [cx - R, cy - R, n.lo[2]], hi: [cx + R, cy + R, n.hi[2]], f: (x, y, z) => { const px = x - cx, py = y - cy, a = Math.atan2(py, px), k = Math.round(a / step) * step, c = Math.cos(-k), s = Math.sin(-k); return n.f(cx + px * c - py * s, cy + px * s + py * c, z); } };
}
/** A sleeping cat, curled nose to tail (a living thing on a sill or a hearth). */
export function sleepingCat(b: SceneBuilder, x: number, y: number, z: number, yaw = 0, colour = "#6a5a4a") {
  const fur = b.mat({ kind: "velvet", colour }), prims: SculptPrim[] = [
    { a: [0, 0.07, 0], e: [0.17, 0.08, 0.12] }, { a: [0.13, 0.08, 0.06], e: [0.065, 0.06, 0.06] },
    { a: [0.16, 0.13, 0.04], b: [0.17, 0.165, 0.035], r1: 0.018, r2: 0.003 }, { a: [0.16, 0.13, 0.09], b: [0.17, 0.165, 0.1], r1: 0.018, r2: 0.003 },
    { a: [-0.15, 0.04, 0.0], b: [-0.05, 0.03, 0.13], r1: 0.025, r2: 0.022 }, { a: [-0.05, 0.03, 0.13], b: [0.08, 0.03, 0.13], r1: 0.022, r2: 0.016 },
  ];
  b.add(sculpt(prims, 0.03, fur));
  place(b, x, z, yaw, y);
}

// ---- Farm and yard ----------------------------------------------------------------------------------------------------------

/** A two-wheeled farm cart: spoked wheels with iron tyres, a plank bed with raves, shafts resting on the ground; `load` heaps hay or sacks on it. */
export function cart(b: SceneBuilder, x: number, z: number, yaw = 0, load: "hay" | "sacks" | "none" = "none") {
  const wd = b.mat({ kind: "oak", colour: "#7a6046", age: 0.7 }), ir = b.mat(M.iron), R = 0.65;
  for (const s of [-1, 1]) {
    const wx = s * 0.78;
    b.add(cut(cylX(R, 0, wx - 0.05, wx + 0.05, R, wd), [cylX(R, 0, wx - 0.1, wx + 0.1, R - 0.07, 0)]), cut(cylX(R, 0, wx - 0.055, wx + 0.055, R + 0.012, ir), [cylX(R, 0, wx - 0.1, wx + 0.1, R - 0.005, 0)]));
    b.add(cylX(R, 0, wx - 0.12, wx + 0.12, 0.1, wd));
    for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; b.add(capsule(wx, R, 0, wx, R + Math.sin(a) * (R - 0.06), Math.cos(a) * (R - 0.06), 0.02, wd)); }
  }
  b.add(cylX(R, 0, -0.9, 0.9, 0.04, ir), boxAt(-0.65, R + 0.12, -1.2, 0.65, R + 0.18, 1.0, wd), boxAt(-0.68, R + 0.18, -1.2, -0.62, R + 0.55, 1.0, wd), boxAt(0.62, R + 0.18, -1.2, 0.68, R + 0.55, 1.0, wd));
  for (const s of [-1, 1]) b.add(capsule(s * 0.45, R + 0.15, 0.9, s * 0.4, 0.06, 2.9, 0.035, wd));
  if (load === "hay") b.add(sculpt([{ a: [0, R + 0.7, -0.1], e: [0.75, 0.5, 1.2] }, { a: [0.1, R + 1.05, 0.1], e: [0.5, 0.35, 0.8] }], 0.2, b.mat({ kind: "hay", colour: "#c8a85a" })));
  if (load === "sacks") for (const [sx, sz] of [[-0.3, -0.6], [0.3, -0.6], [-0.3, 0.1], [0.3, 0.1], [0, -0.25]] as const) b.add(sculpt([{ a: [sx, R + 0.36 + (sz === -0.25 ? 0.3 : 0), sz], e: [0.27, 0.18, 0.32] }], 0.08, b.mat(M.burlap)));
  place(b, x, z, yaw);
}
/** A haycock: a rounded stack of hay on a stone or wooden base, raked down its sides, a thatched cap and a rope weighted with stones. */
export function haystack(b: SceneBuilder, x: number, z: number, r = 2.2, h = 4.2) {
  const hay = b.mat({ kind: "hay", colour: "#bfa05a" }), rope = b.mat({ kind: "hay", colour: "#6a5a3a" }), stone = b.mat({ kind: "rock", colour: "#8a857a" });
  b.add(revolve(0, 0, 0, h, t => r * (t < 0.55 ? 0.92 + 0.08 * Math.sin((t / 0.55) * Math.PI * 0.5) : Math.sqrt(Math.max(0, 1 - ((t - 0.55) / 0.45) ** 2)) * (1 - 0.05 * (t - 0.55))), r * 1.02, hay, 0, 3));
  // ropes over the dome: bands lying on its surface, crossing at the top
  const ry = h * 0.45, mr = Math.min(r, ry);
  for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI, ca = Math.cos(a), sa = Math.sin(a); b.add(leaf((px, py, pz) => { const across = -px * sa + pz * ca, shell = (Math.hypot(px / r, (py - h * 0.55) / ry, pz / r) - 1) * mr; return Math.max(Math.abs(across) - 0.03, Math.abs(shell) - 0.03, h * 0.55 - py); }, [-r - 0.1, h * 0.5, -r - 0.1], [r + 0.1, h + 0.1, r + 0.1], rope)); }
  for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; b.add(sphere(Math.cos(a) * r * 0.98, h * 0.5, Math.sin(a) * r * 0.98, 0.14, stone)); }
  place(b, x, z, 0);
}
/** A post-and-rail fence along a list of points: split posts every ~2.4 m, two rails, a little out of true. */
export function fence(b: SceneBuilder, pts: readonly (readonly [number, number])[], h = 1.15) {
  const wd = b.mat({ kind: "oak", colour: "#7a6a52", age: 0.85 });
  for (let i = 0; i + 1 < pts.length; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1], L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(L / 2.4));
    for (let k = 0; k <= n; k++) { const t = k / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t, lean = b.r(-0.05, 0.05); b.add(capsule(x, 0, z, x + lean, h + b.r(-0.05, 0.08), z + lean * 0.5, 0.055, wd)); }
    for (const y of [h * 0.45, h * 0.85]) b.add(capsule(ax, y + b.r(-0.04, 0.04), az, bx, y + b.r(-0.04, 0.04), bz, 0.04, wd));
  }
  b.place();
}
/** A stone water trough fed by a spout, a little moss on its rim. */
export function trough(b: SceneBuilder, x: number, z: number, yaw = 0) {
  const st = b.mat({ kind: "ashlar", colour: "#9a958a", course: 0.6, moss: 0.4 }), wat = b.mat({ kind: "water", colour: "#3a5a5a" });
  b.add(cut(boxAt(-1.0, 0, -0.35, 1.0, 0.6, 0.35, st, 0, 0.03), [boxAt(-0.88, 0.15, -0.24, 0.88, 0.8, 0.24, 0)]), boxAt(-0.88, 0.15, -0.24, 0.88, 0.5, 0.24, wat));
  place(b, x, z, yaw);
}
/** A wicker basket heaped with apples. */
export function appleBasket(b: SceneBuilder, x: number, z: number, red = "#b8342a") {
  const wicker = b.mat({ kind: "cane", colour: "#a8824e" }), apple = b.mat({ kind: "velvet", colour: red });
  b.add(cut(revolve(0, 0, 0, 0.32, t => 0.22 + 0.06 * t, 0.29, wicker), [cylY(0, 0, 0.04, 0.5, 0.25, 0)]));
  for (let k = 0; k < 9; k++) { const a = k * 2.4, r = 0.06 + 0.12 * ((k * 0.618) % 1); b.add(sphere(Math.cos(a) * r, 0.3 + 0.03 * (k % 3), Math.sin(a) * r, 0.045, apple)); }
  place(b, x, z, 0);
}
