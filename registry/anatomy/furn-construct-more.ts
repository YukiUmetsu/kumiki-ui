/**
 * INTERIOR1 construction, second set: church furnishings (rush-seated chairs in rows, a carved oak pew, a pulpit under
 * its sounding board, an altar with a gilded reredos, a font with a spired cover, an eagle lectern, a corona of candles,
 * a votive stand), Japanese pieces (andon, hibachi with kettle, kotatsu, gold byobu) and contemporary ones. Each is
 * built front toward +z, standing on y = 0, from the ARCH1 signed-distance kit; `furn-construct.ts` dispatches to them.
 */
import type { Node, SculptPrim } from "./arch-sdf";
import { leaf, sculpt } from "./arch-sdf";
import type { SceneBuilder } from "./arch-kit";
import { boxAt, capsule, clump, coneY, cut, cylX, cylY, cylZ, ellipsoid, opening, repeatAround, repeatX, revolve, sphere, spire } from "./arch-kit";
import type { SurfaceSpec } from "./arch-surface";
import { churchChairNodes } from "./arch-kit-civic";

const W = {
  oak: { kind: "oak", colour: "#5a4029", age: 0.45 } as SurfaceSpec,
  darkOak: { kind: "oak", colour: "#3a281b", age: 0.5 } as SurfaceSpec,
  limestone: { kind: "ashlar", colour: "#cbbd9e", course: 0.3, age: 0.35 } as SurfaceSpec,
  brass: { kind: "brass", colour: "#c9a24e" } as SurfaceSpec,
  gilt: { kind: "gold" } as SurfaceSpec,
  iron: { kind: "iron", colour: "#1c1a18", age: 0.15 } as SurfaceSpec,
  wax: { kind: "plain", colour: "#f0e7cf" } as SurfaceSpec,
  flame: { kind: "flame", emit: 12 } as SurfaceSpec,
};
type Builder = (b: SceneBuilder) => void;

/** Distance to an octagonal prism's sides (apothem r). */
const octD = (x: number, z: number, r: number) => { const ax = Math.abs(x), az = Math.abs(z); return Math.max(ax, az, (ax + az) * Math.SQRT1_2) - r; };
/** An octagonal prism, tapering from apothem r0 at y0 to r1 at y1. */
export function octPrism(cx: number, cz: number, y0: number, y1: number, r0: number, mat: number, r1 = r0): Node {
  const h = y1 - y0, k = 1 / Math.sqrt(1 + ((r1 - r0) / h) ** 2), R = Math.max(r0, r1) * 1.09;
  return leaf((x, y, z) => Math.max(octD(x - cx, z - cz, r0 + ((r1 - r0) * Math.min(1, Math.max(0, (y - y0) / h)))) * k, y0 - y, y - y1), [cx - R, y0, cz - R], [cx + R, y1, cz + R], mat);
}
/** A candle with its flame and light. */
function lit(b: SceneBuilder, x: number, y: number, z: number, h: number, r: number, power: number, light = true) {
  b.add(cylY(x, z, y, y + h, r, b.mat(W.wax)), ellipsoid(x, y + h + 0.03, z, r * 0.45, 0.028, r * 0.45, b.mat(W.flame)), cylY(x, z, y + h, y + h + 0.012, 0.002, b.mat(W.iron)));
  if (light) b.light({ x, y: y + h + 0.04, z, kelvin: 1850, power });
}
/**
 * A carved standing saint after Gothic portal figures, facing +z, `h` tall from its feet at y: seven heads high, a slight
 * sway (contrapposto), a robe falling in vertical folds to a broken hem, a mantle drawn across the body, one hand holding
 * a book to the chest and the other raised in blessing, a veiled head with brow and nose, a halo with a raised rim.
 */
function statuette(x: number, y: number, z: number, h: number, robe: number, skin: number, halo: number, hair = robe, beard = false): Node[] {
  const P = (px: number, py: number, pz: number): [number, number, number] => [x + px * h, y + py * h, z + pz * h];
  const body: SculptPrim[] = [
    { a: P(0, 0.035, 0.01), e: [0.15 * h, 0.04 * h, 0.11 * h] },
    { a: P(0, 0.05, 0), b: P(0.025, 0.46, 0.005), r1: 0.135 * h, r2: 0.098 * h },
    { a: P(0.025, 0.46, 0.005), b: P(0, 0.73, 0), r1: 0.098 * h, r2: 0.085 * h },
    { a: P(0, 0.775, -0.005), e: [0.125 * h, 0.04 * h, 0.07 * h] },
    { a: P(0, 0.78, 0), b: P(0, 0.84, 0.005), r1: 0.035 * h, r2: 0.03 * h },
    // a hood or veil falling from the head to the shoulders
    { a: P(0, 0.9, -0.03), b: P(0, 0.76, -0.045), r1: 0.06 * h, r2: 0.09 * h },
    // the mantle drawn across from the left shoulder to the right hip, and its edge falling at the side
    { a: P(-0.1, 0.74, 0.055), b: P(0.1, 0.4, 0.095), r1: 0.035 * h, r2: 0.03 * h, k: 0.02 * h }, { a: P(0.1, 0.4, 0.095), b: P(0.12, 0.08, 0.07), r1: 0.03 * h, r2: 0.035 * h, k: 0.02 * h },
    // arms: the left holds the book at the chest, the right is raised in blessing
    { a: P(-0.105, 0.765, 0), b: P(-0.12, 0.585, 0.035), r1: 0.034 * h, r2: 0.03 * h }, { a: P(-0.12, 0.585, 0.035), b: P(-0.03, 0.6, 0.1), r1: 0.03 * h, r2: 0.026 * h },
    { a: P(0.105, 0.765, 0), b: P(0.135, 0.61, 0.04), r1: 0.034 * h, r2: 0.03 * h }, { a: P(0.135, 0.61, 0.04), b: P(0.11, 0.73, 0.085), r1: 0.03 * h, r2: 0.026 * h },
  ];
  // vertical folds: grooves cut down the front of the robe and ridges between them, wider toward the hem; a broken hem line
  for (let k = 0; k < 5; k++) {
    const fx = -0.09 + k * 0.045;
    body.push({ a: P(fx * 1.25, 0.06, 0.125 - Math.abs(fx) * 0.25), b: P(fx * 0.7 + 0.02, 0.4, 0.088), r1: 0.011 * h, r2: 0.006 * h, sub: true, k: 0.008 * h });
    body.push({ a: P(fx * 1.25 + 0.022, 0.05, 0.13 - Math.abs(fx) * 0.25), b: P(fx * 0.7 + 0.04, 0.38, 0.092), r1: 0.012 * h, r2: 0.006 * h, k: 0.01 * h });
  }
  // the face, carved: an oval skull, the brow ridge, eye sockets with the eyeballs in them, cheekbones, a straight nose,
  // a closed mouth and a rounded chin; the hands
  const head: SculptPrim[] = [
    { a: P(0, 0.895, 0.004), e: [0.05 * h, 0.066 * h, 0.055 * h] }, { a: P(0, 0.862, 0.03), e: [0.034 * h, 0.03 * h, 0.03 * h] },
    { a: P(0, 0.917, 0.046), e: [0.03 * h, 0.008 * h, 0.012 * h] },
    { a: P(-0.019, 0.906, 0.056), r1: 0.011 * h, sub: true, k: 0.004 * h }, { a: P(0.019, 0.906, 0.056), r1: 0.011 * h, sub: true, k: 0.004 * h },
    { a: P(-0.019, 0.905, 0.05), r1: 0.0075 * h }, { a: P(0.019, 0.905, 0.05), r1: 0.0075 * h },
    { a: P(-0.025, 0.889, 0.044), e: [0.009 * h, 0.008 * h, 0.009 * h] }, { a: P(0.025, 0.889, 0.044), e: [0.009 * h, 0.008 * h, 0.009 * h] },
    { a: P(0, 0.908, 0.058), b: P(0, 0.88, 0.07), r1: 0.006 * h, r2: 0.01 * h, k: 0.004 * h },
    { a: P(-0.011, 0.866, 0.058), b: P(0.011, 0.866, 0.058), r1: 0.0025 * h, r2: 0.0025 * h, sub: true, k: 0.002 * h },
    { a: P(0, 0.85, 0.052), e: [0.014 * h, 0.01 * h, 0.01 * h] },
    { a: P(-0.03, 0.6, 0.11), r1: 0.018 * h }, { a: P(0.11, 0.745, 0.09), b: P(0.108, 0.78, 0.092), r1: 0.014 * h, r2: 0.01 * h },
  ];
  // hair and beard for an apostle (a beard falling to the chest in locks); a veil over the head for a woman saint
  const crown: SculptPrim[] = beard
    ? [{ a: P(0, 0.925, -0.01), e: [0.056 * h, 0.05 * h, 0.06 * h] }, { a: P(-0.045, 0.89, -0.01), e: [0.016 * h, 0.04 * h, 0.04 * h] }, { a: P(0.045, 0.89, -0.01), e: [0.016 * h, 0.04 * h, 0.04 * h] },
      { a: P(0, 0.855, 0.042), b: P(0, 0.815, 0.05), r1: 0.026 * h, r2: 0.01 * h }, { a: P(-0.018, 0.86, 0.045), b: P(-0.01, 0.825, 0.052), r1: 0.009 * h, r2: 0.004 * h }, { a: P(0.018, 0.86, 0.045), b: P(0.01, 0.825, 0.052), r1: 0.009 * h, r2: 0.004 * h },
      { a: P(-0.016, 0.874, 0.058), b: P(0.016, 0.874, 0.058), r1: 0.006 * h, r2: 0.006 * h }]
    : [{ a: P(0, 0.915, -0.008), e: [0.064 * h, 0.07 * h, 0.064 * h] }, { a: P(0, 0.935, 0.025), b: P(0, 0.935, -0.03), r1: 0.06 * h, r2: 0.066 * h }, { a: P(-0.045, 0.88, 0.0), b: P(-0.06, 0.78, -0.01), r1: 0.018 * h, r2: 0.026 * h }, { a: P(0.045, 0.88, 0.0), b: P(0.06, 0.78, -0.01), r1: 0.018 * h, r2: 0.026 * h },
      { a: P(0, 0.9, 0.06), e: [0.046 * h, 0.06 * h, 0.03 * h], sub: true, k: 0.008 * h }];
  const ox = x, oy = y + 0.915 * h, oz = z - 0.055 * h, R = 0.105 * h;
  return [
    sculpt(body, 0.025 * h, robe), sculpt(head, 0.006 * h, skin), sculpt(crown, 0.01 * h, beard ? hair : robe),
    // the book, closed, its cover and gilt clasp
    boxAt(x - 0.08 * h, y + 0.56 * h, z + 0.085 * h, x + 0.0 * h, y + 0.66 * h, z + 0.115 * h, robe, 0, 0.004 * h), boxAt(x - 0.082 * h, y + 0.6 * h, z + 0.112 * h, x - 0.06 * h, y + 0.62 * h, z + 0.118 * h, halo),
    cylZ(ox, oy, oz - 0.006 * h, oz + 0.006 * h, R, halo), cut(cylZ(ox, oy, oz + 0.004 * h, oz + 0.016 * h, R, halo), [cylZ(ox, oy, oz, oz + 0.03 * h, R - 0.012 * h, 0)]),
  ];
}

export const MORE: Record<string, Builder> = {
  "church-chair": b => { b.add(...churchChairNodes(b)); },
  "pew": b => {
    // an oak pew: thick bench ends with poppyhead finials and blind tracery, a sloped back, a book ledge and kneeler behind
    const oak = b.mat(W.oak), hass = b.mat({ kind: "velvet", colour: "#6a1f22" }), book = b.mat({ kind: "leather", colour: "#2a1f1a" });
    for (const s of [-1, 1]) {
      const x = s * 1.47, end = cut(leaf((px, y, z) => Math.max(Math.abs(px - x) - 0.035, -y, y - 0.98, Math.abs(z + 0.02) - 0.3, y > 0.72 ? z - (-0.05 + (0.98 - y) * 0.5) : -1), [x - 0.04, 0, -0.33], [x + 0.04, 0.98, 0.29], oak),
        [opening(-0.02, 0.2, 0.36, 0.3, "pointed", x + s * 0.02, x + s * 0.06, "x"), opening(-0.02, 0.2, 0.36, 0.3, "pointed", x - s * 0.06, x - s * 0.02, "x")]);
      b.add(end, sculpt([{ a: [x, 0.98, -0.15], b: [x, 1.07, -0.15], r1: 0.035, r2: 0.05 }, { a: [x, 1.12, -0.15], e: [0.035, 0.06, 0.05] }, { a: [x, 1.1, -0.08], e: [0.03, 0.035, 0.04] }, { a: [x, 1.1, -0.22], e: [0.03, 0.035, 0.04] }], 0.02, oak));
    }
    b.add(boxAt(-1.44, 0.41, -0.22, 1.44, 0.445, 0.2, oak, 0, 0.012), capsule(-1.44, 0.43, 0.2, 1.44, 0.43, 0.2, 0.018, oak));
    b.add(leaf((x, y, z) => Math.max(Math.abs(x) - 1.44, Math.abs(y - 0.68) - 0.24, Math.abs(z - (-0.25 - (y - 0.45) * 0.12)) - 0.012), [-1.45, 0.44, -0.33], [1.45, 0.93, -0.22], oak), capsule(-1.44, 0.93, -0.31, 1.44, 0.93, -0.31, 0.025, oak));
    b.add(boxAt(-1.44, 0.8, -0.44, 1.44, 0.82, -0.3, oak), boxAt(-1.44, 0.82, -0.445, 1.44, 0.85, -0.43, oak), boxAt(-1.44, 0.1, -0.62, 1.44, 0.15, -0.5, oak));
    for (const hx of [-0.9, 0.1, 1.0]) b.add(boxAt(hx - 0.17, 0.0, -0.75, hx + 0.17, 0.09, -0.52, hass, 0, 0.03));
    for (const hx of [-1.1, -0.6, 0.4, 0.95]) b.add(boxAt(hx - 0.07, 0.82, -0.42, hx + 0.07, 0.86, -0.32, book, 0, 0.004));
  },
  "pulpit": b => {
    // an octagonal oak pulpit on a stem, panels of blind tracery, a stair with a rail, a sounding board (tester) above
    const oak = b.mat(W.oak), dk = b.mat(W.darkOak), stone = b.mat(W.limestone), cloth = b.mat({ kind: "velvet", colour: "#5a1a22" }), gilt = b.mat(W.gilt);
    const tracery = repeatAround(opening(0, 1.62, 0.36, 0.48, "pointed", 0.66, 0.8, "x"), 0, 0, 8, 0.9);
    b.add(octPrism(0, 0, 0, 0.18, 0.5, stone), octPrism(0, 0, 0.18, 0.95, 0.18, stone), octPrism(0, 0, 0.95, 1.4, 0.24, oak, 0.68));
    b.add(cut(octPrism(0, 0, 1.4, 2.45, 0.7, oak), [octPrism(0, 0, 1.5, 2.6, 0.62, 0), tracery, boxAt(-1, 1.5, -0.25, -0.5, 2.6, 0.25, 0)]));
    b.add(octPrism(0, 0, 1.36, 1.48, 0.74, dk), octPrism(0, 0, 2.43, 2.52, 0.76, dk), octPrism(0, 0, 1.4, 1.5, 0.64, oak));
    b.add(leaf((x, y, z) => Math.max(Math.abs(x) - 0.25, Math.abs(z - 0.7 - (y - 2.42) * 0.6) - 0.012, Math.abs(y - 2.47) - 0.08), [-0.26, 2.35, 0.6], [0.26, 2.6, 0.85], dk), boxAt(-0.22, 2.42, 0.68, 0.22, 2.7, 0.7, cloth));
    // the stair up the left side
    for (let k = 0; k < 7; k++) b.add(boxAt(-2.1 + k * 0.2, 0, -0.27, -1.9 + k * 0.2, 0.2 * (k + 1), 0.27, oak));
    b.add(capsule(-2.1, 1.0, 0.3, -0.75, 2.4, 0.3, 0.025, dk), cylY(-2.1, 0.3, 0.2, 1.0, 0.035, dk), sphere(-2.1, 1.03, 0.3, 0.05, dk));
    for (let k = 1; k < 7; k++) b.add(cylY(-2.1 + k * 0.2, 0.3, 0.2 * (k + 1), 1.0 + k * 0.2, 0.012, dk));
    // the back board rising to the tester, the tester's cornice, cresting and a crocketed spire
    b.add(boxAt(-0.45, 1.4, -0.82, 0.45, 3.9, -0.74, dk), boxAt(-0.4, 1.6, -0.75, 0.4, 3.3, -0.73, cloth), octPrism(0, 0, 3.75, 3.95, 0.9, dk), octPrism(0, 0, 3.7, 3.76, 0.82, oak));
    b.add(repeatAround(cylY(0.86, 0, 3.55, 3.72, 0.03, gilt), 0, 0, 8, 0.9), repeatAround(sphere(0.86, 3.53, 0, 0.04, gilt), 0, 0, 8, 0.9));
    b.add(spire(0, 0, 3.95, 4.9, 0.55, 8, dk), repeatAround(sphere(0.3, 4.3, 0, 0.035, gilt), 0, 0, 8, 0.32), sphere(0, 4.95, 0, 0.06, gilt));
    b.add(cylY(0, 0, 3.69, 3.71, 0.3, b.mat({ kind: "gold" })));
  },
  "altar-reredos": b => {
    // a high altar on three steps: a stone mensa with a velvet frontal and gold orphreys, linen, six candles and a cross on
    // the gradine, before a gilded reredos of three tiers of niches with saints, crocketed canopies and pinnacles
    const stone = b.mat(W.limestone), marble = b.mat({ kind: "marble", colour: "#ddd5c6" }), vel = b.mat({ kind: "velvet", colour: "#7a1420" }), gilt = b.mat(W.gilt), brass = b.mat(W.brass);
    const lin = b.mat({ kind: "fabric", colour: "#f1ece0", colour2: "#e9e3d4", pattern: "plain" }), blue = b.mat({ kind: "painted-wood", colour: "#1d2f66", flake: 0.01 }), robe = b.mat({ kind: "painted-wood", colour: "#8c2a24", flake: 0.03 }), robe2 = b.mat({ kind: "painted-wood", colour: "#2c4f7a", flake: 0.03 }), skin = b.mat({ kind: "plain", colour: "#d8b090" }), hair = b.mat({ kind: "painted-wood", colour: "#4a3424", flake: 0.03 });
    for (let k = 0; k < 3; k++) b.add(boxAt(-2.3 + k * 0.25, k * 0.16, -1.4, 2.3 - k * 0.25, (k + 1) * 0.16, 1.3 - k * 0.35, marble));
    const y0 = 0.48;
    b.add(boxAt(-1.3, y0, -0.55, 1.3, y0 + 0.92, 0.38, stone), boxAt(-1.38, y0 + 0.92, -0.6, 1.38, y0 + 1.0, 0.44, marble));
    b.add(boxAt(-1.28, y0 + 0.02, 0.38, 1.28, y0 + 0.9, 0.4, vel), boxAt(-1.3, y0 + 0.76, 0.395, 1.3, y0 + 0.9, 0.41, gilt));
    for (const ox of [-0.7, 0.7]) b.add(boxAt(ox - 0.08, y0 + 0.02, 0.395, ox + 0.08, y0 + 0.76, 0.408, gilt));
    b.add(repeatX(cylY(-1.28, 0.405, y0 + 0.7, y0 + 0.76, 0.006, gilt), 0.025, 103));
    b.add(boxAt(-1.42, y0 + 0.995, -0.62, 1.42, y0 + 1.012, 0.47, lin), boxAt(-1.43, y0 + 0.62, -0.62, -1.41, y0 + 1.012, 0.47, lin), boxAt(1.41, y0 + 0.62, -0.62, 1.43, y0 + 1.012, 0.47, lin));
    const yt = y0 + 1.012;
    b.add(boxAt(-1.3, yt, -0.62, 1.3, yt + 0.16, -0.36, gilt), boxAt(-1.0, yt + 0.16, -0.62, 1.0, yt + 0.3, -0.45, gilt));
    for (const cx of [-0.95, -0.62, -0.3, 0.3, 0.62, 0.95]) {
      const h = 0.62 - Math.abs(cx) * 0.12, base = Math.abs(cx) > 0.8 ? yt + 0.16 : yt + 0.3;
      b.add(revolve(cx, -0.5, base, base + h, t => 0.05 * Math.exp(-(t * t) / 0.006) + 0.012 + 0.02 * Math.exp(-((t - 0.4) ** 2) / 0.004) + 0.012 * Math.exp(-((t - 0.7) ** 2) / 0.001) + 0.03 * Math.exp(-((t - 0.97) ** 2) / 0.0015), 0.065, brass, 0, 5));
      lit(b, cx, -0.5, base + h, 0.3, 0.017, 0.035, Math.abs(cx) > 0.5);
    }
    b.add(boxAt(-0.04, yt + 0.3, -0.56, 0.04, yt + 1.25, -0.5, brass), boxAt(-0.25, yt + 0.92, -0.56, 0.25, yt + 1.0, -0.5, brass), sphere(0, yt + 1.28, -0.53, 0.04, brass), revolve(0, -0.53, yt + 0.3, yt + 0.45, t => 0.1 - 0.06 * t, 0.1, brass));
    // the reredos: a gilded frame of three bays, the middle one taller, each with stacked niches
    const rz = -0.95, base = yt;
    const bays: readonly (readonly [number, number, number])[] = [[-1.4, 1.1, 2.9], [0, 1.25, 3.7], [1.4, 1.1, 2.9]];
    const cuts: Node[] = [];
    for (const [bx, bw, top] of bays) for (let r = 0; r < 2; r++) { const ny = base + 0.25 + r * 1.35, nh = r === 1 ? top - 1.6 - 0.75 : 0.85; for (const nx of bw > 1.2 ? [bx] : [bx - 0.27, bx + 0.27]) cuts.push(opening(nx, ny, bw > 1.2 && r === 1 ? 0.9 : 0.42, nh, "pointed", rz - 0.18, rz + 0.1)); }
    b.add(cut(boxAt(-2.1, base, rz - 0.3, 2.1, base + 3.2, rz + 0.04, gilt), cuts));
    // a moulded frame round each tier and a band of cresting along the top
    for (const y of [base, base + 1.3, base + 2.95]) b.add(boxAt(-2.15, y, rz + 0.02, 2.15, y + 0.1, rz + 0.1, gilt));
    b.add(repeatX(sculpt([{ a: [-2.05, base + 3.08, rz + 0.06], e: [0.035, 0.07, 0.025] }, { a: [-2.05, base + 3.17, rz + 0.06], r1: 0.025 }], 0.02, gilt), 0.1, 42));
    for (const [bx, bw, top] of bays) {
      for (let r = 0; r < 2; r++) {
        const ny = base + 0.25 + r * 1.35, nh = r === 1 ? top - 1.6 - 0.75 : 0.85;
        for (const [k, nx] of (bw > 1.2 ? [bx] : [bx - 0.27, bx + 0.27]).entries()) {
          const nw = bw > 1.2 && r === 1 ? 0.9 : 0.42;
          b.add(boxAt(nx - nw / 2, ny, rz - 0.2, nx + nw / 2, ny + nh + nw * 0.87, rz - 0.18, blue), repeatAround(sphere(nx + nw * 0.3, ny + nh * 0.75, rz - 0.18, 0.008, gilt), nx, rz - 0.18, 5, nw * 0.32));
          b.add(boxAt(nx - nw / 2 - 0.02, ny - 0.04, rz - 0.2, nx + nw / 2 + 0.02, ny, rz + 0.08, gilt));
          b.add(...statuette(nx, ny, rz - 0.11, Math.min(nh + nw * 0.4, bw > 1.2 && r === 1 ? 1.6 : 0.95) * 0.82, (k + r) % 2 ? robe : robe2, skin, gilt, hair, (k + r + Math.round(nx)) % 2 === 0));
          // a crocketed gable over each niche with a finial
          b.add(leaf((x, y, z) => { const dx = Math.abs(x - nx), g = ny + nh + nw * 0.87 + 0.1 + (nw / 2 + 0.06 - dx) * 1.4; return Math.max(y - g, ny + nh + nw * 0.6 - y, dx - nw / 2 - 0.06, Math.abs(z - rz - 0.07) - 0.03); }, [nx - nw / 2 - 0.07, ny + nh, rz + 0.03], [nx + nw / 2 + 0.07, ny + nh + nw * 1.8 + 0.2, rz + 0.11], gilt), sphere(nx, ny + nh + nw * 0.87 + 0.1 + (nw / 2 + 0.06) * 1.4 + 0.04, rz + 0.07, 0.035, gilt));
        }
      }
      // the bay's crowning pinnacle, crockets up its edges
      b.add(spire(bx, rz - 0.05, base + top, base + top + (bw > 1.2 ? 1.3 : 0.9), 0.16, 4, gilt), repeatAround(sphere(bx + 0.1, base + top + 0.35, rz - 0.05, 0.025, gilt), bx, rz - 0.05, 4, 0.12), sphere(bx, base + top + (bw > 1.2 ? 1.33 : 0.93), rz - 0.05, 0.04, gilt));
      b.add(leaf((x, y, z) => { const dx = Math.abs(x - bx); return Math.max(y - (base + top + 0.2 - dx * 0.6), base + 3.0 - y, dx - bw / 2 - 0.1, Math.abs(z - rz + 0.05) - 0.18); }, [bx - bw / 2 - 0.1, base + 2.9, rz - 0.25], [bx + bw / 2 + 0.1, base + top + 0.2, rz + 0.15], gilt));
    }
    for (const px of [-2.1, -0.7, 0.7, 2.1]) b.add(cylY(px, rz + 0.02, base, base + 3.3, 0.06, gilt), spire(px, rz + 0.02, base + 3.3, base + 4.0, 0.08, 4, gilt), sphere(px, base + 4.02, rz + 0.02, 0.03, gilt));
  },
  "font": b => {
    // an octagonal stone font: a carved bowl with quatrefoil panels on a stem and step, an oak cover with a crocketed spire
    const st = b.mat(W.limestone), oak = b.mat(W.darkOak), gilt = b.mat(W.gilt), water = b.mat({ kind: "water", colour: "#3a4a4a" });
    const qf = repeatAround(cylX(0.78, 0, 0.46, 0.52, 0.11, 0), 0, 0, 8, 0.55);
    b.add(octPrism(0, 0, 0, 0.16, 0.62, st), octPrism(0, 0, 0.16, 0.22, 0.5, st), octPrism(0, 0, 0.22, 0.58, 0.22, st, 0.2), octPrism(0, 0, 0.58, 0.66, 0.24, st, 0.48));
    b.add(cut(octPrism(0, 0, 0.66, 0.98, 0.5, st), [sphere(0, 0.98, 0, 0.42, 0), qf]), octPrism(0, 0, 0.95, 1.0, 0.53, st), cylY(0, 0, 0.84, 0.86, 0.4, water));
    b.add(octPrism(0, 0, 1.0, 1.1, 0.5, oak), spire(0, 0, 1.1, 1.95, 0.42, 8, oak), repeatAround(sphere(0.22, 1.45, 0, 0.025, gilt), 0, 0, 8, 0.24), repeatAround(sphere(0.12, 1.7, 0, 0.02, gilt), 0, 0, 8, 0.14), sphere(0, 1.99, 0, 0.045, gilt), cylY(0, 0, 1.95, 2.25, 0.006, b.mat(W.iron)));
  },
  "eagle-lectern": b => {
    // a brass eagle lectern: a turned column on lion feet, a globe, the eagle with spread wings carrying the open book
    const br = b.mat(W.brass), pg = b.mat({ kind: "plain", colour: "#ece2c8" }), red = b.mat({ kind: "fabric", colour: "#7a1a20", pattern: "plain" });
    b.add(revolve(0, 0, 0.08, 1.08, t => 0.035 + 0.07 * Math.exp(-(t * t) / 0.01) + 0.04 * Math.exp(-((t - 0.3) ** 2) / 0.003) + 0.03 * Math.exp(-((t - 0.62) ** 2) / 0.002) + 0.03 * Math.exp(-((t - 0.97) ** 2) / 0.002), 0.11, br, 0, 4));
    // three lion's paws under the column: a pad, four toes forward, a little ruff of fur where the leg meets it
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2 + 0.5, c = Math.cos(a), sn = Math.sin(a), x = c * 0.2, z = sn * 0.2, paw: SculptPrim[] = [{ a: [0, 0.1, 0], b: [x, 0.085, z], r1: 0.03, r2: 0.035 }, { a: [x, 0.05, z], e: [0.05, 0.045, 0.05] }, { a: [x * 0.92, 0.1, z * 0.92], e: [0.04, 0.03, 0.04] }];
      for (let t = -1.5; t <= 1.5; t++) { const ta = a + t * 0.32; paw.push({ a: [x + Math.cos(ta) * 0.05, 0.025, z + Math.sin(ta) * 0.05], e: [0.018, 0.022, 0.018] }); }
      b.add(sculpt(paw, 0.012, br));
    }
    b.add(sphere(0, 1.17, 0, 0.11, br));
    // the eagle facing the people (+z), wings spread level, primaries fanned at the tips, a hooked beak, a tail fan behind
    const eagle: SculptPrim[] = [
      // a full breast and back, the neck curving up to the head, a crest of feathers behind it, the hooked beak
      { a: [0, 1.33, 0.05], e: [0.075, 0.085, 0.07] }, { a: [0, 1.3, -0.08], b: [0, 1.29, -0.2], r1: 0.07, r2: 0.045 },
      // an eagle's head is long and flat-crowned, not round: a ruff of neck feathers, a heavy brow, a long hooked beak
      { a: [0, 1.38, 0.09], b: [0, 1.44, 0.145], r1: 0.05, r2: 0.04 }, { a: [0, 1.43, 0.14], e: [0.05, 0.03, 0.04] },
      { a: [0, 1.462, 0.17], e: [0.036, 0.03, 0.06] },
      { a: [0, 1.474, 0.13], b: [0, 1.466, 0.1], r1: 0.024, r2: 0.01 },
      { a: [0, 1.466, 0.215], b: [0, 1.458, 0.252], r1: 0.017, r2: 0.013 }, { a: [0, 1.458, 0.252], b: [0, 1.447, 0.278], r1: 0.013, r2: 0.008 },
      { a: [0, 1.447, 0.278], b: [0, 1.424, 0.281], r1: 0.008, r2: 0.003 }, { a: [0, 1.444, 0.22], b: [0, 1.44, 0.256], r1: 0.01, r2: 0.005 },
      // the cere where the beak meets the face, the eye sockets under an overhanging brow, the gape
      { a: [0, 1.47, 0.214], e: [0.019, 0.013, 0.01] },
      { a: [-0.026, 1.466, 0.196], r1: 0.007, sub: true, k: 0.003 }, { a: [0.026, 1.466, 0.196], r1: 0.007, sub: true, k: 0.003 },
      { a: [-0.024, 1.477, 0.196], e: [0.011, 0.006, 0.016] }, { a: [0.024, 1.477, 0.196], e: [0.011, 0.006, 0.016] },
      { a: [0, 1.449, 0.226], b: [0, 1.449, 0.262], r1: 0.0035, r2: 0.003, sub: true, k: 0.002 },
      // feathered thighs down to the globe, and the talons curled over it
      { a: [-0.05, 1.28, 0.03], b: [-0.05, 1.235, 0.04], r1: 0.035, r2: 0.025 }, { a: [0.05, 1.28, 0.03], b: [0.05, 1.235, 0.04], r1: 0.035, r2: 0.025 },
    ];
    for (const s2 of [-1, 1]) for (let t = 0; t < 4; t++) { const a = t === 3 ? Math.PI : -0.6 + t * 0.6, dx = Math.sin(a) * 0.05, dz = Math.cos(a) * 0.05; eagle.push({ a: [s2 * 0.05, 1.235, 0.04], b: [s2 * 0.05 + dx, 1.225, 0.04 + dz], r1: 0.011, r2: 0.008, k: 0.004 }, { a: [s2 * 0.05 + dx, 1.225, 0.04 + dz], b: [s2 * 0.05 + dx * 1.35, 1.2, 0.04 + dz * 1.35], r1: 0.008, r2: 0.003, k: 0.003 }); }
    // carved breast feathers: rows of scallops cut into the breast
    for (let r2 = 0; r2 < 4; r2++) for (let c2 = -2; c2 <= 2; c2++) { const yy = 1.39 - r2 * 0.035, xx = c2 * 0.022 + (r2 % 2) * 0.011; eagle.push({ a: [xx, yy, 0.118 - Math.abs(xx) * 0.6 - r2 * 0.004], e: [0.011, 0.006, 0.006], sub: true, k: 0.004 }); }
    for (let k = -2; k <= 2; k++) eagle.push({ a: [0, 1.29, -0.18], b: [k * 0.04, 1.27, -0.38], r1: 0.024, r2: 0.012, k: 0.01 });
    for (const s of [-1, 1]) {
      // the arm of the wing with rows of coverts, six primaries splayed from the wrist, five secondaries along the trailing edge
      eagle.push({ a: [s * 0.05, 1.37, 0.04], b: [s * 0.27, 1.46, 0.0], r1: 0.05, r2: 0.035 }, { a: [s * 0.17, 1.42, -0.07], e: [0.13, 0.026, 0.12] });
      for (let k = 0; k < 5; k++) eagle.push({ a: [s * (0.08 + k * 0.045), 1.425 + k * 0.012, -0.02 - k * 0.012], e: [0.028, 0.012, 0.05] });
      for (let k = 0; k < 6; k++) eagle.push({ a: [s * 0.26, 1.46, -0.02 - k * 0.03], b: [s * (0.47 - k * 0.035), 1.53 - k * 0.012, 0.07 - k * 0.075], r1: 0.032, r2: 0.012, k: 0.006 });
      for (let k = 0; k < 5; k++) eagle.push({ a: [s * (0.07 + k * 0.042), 1.39 + k * 0.012, -0.1], b: [s * (0.08 + k * 0.048), 1.36 + k * 0.014, -0.27 + k * 0.012], r1: 0.028, r2: 0.012, k: 0.006 });
    }
    b.add(sculpt(eagle, 0.02, br));
    // each wing a broad, slightly cambered blade from the shoulder, its trailing edge scalloped into feather ends
    for (const s2 of [-1, 1]) b.add(leaf((x, y, z) => {
      // raised in a shallow V so the wings read from in front; thick and rounded at the leading edge, thin at the feathers
      const ax = s2 * x, t = (ax - 0.05) / 0.4, tc = Math.min(1, Math.max(0, t)), yc = 1.395 + 0.13 * tc + 0.02 * Math.sin(Math.PI * tc) + (z + 0.05) * 0.12;
      const lead = 0.05 - 0.04 * tc, trail = -0.1 - 0.17 * tc + 0.022 * Math.abs(Math.sin(tc * Math.PI * 6)), chord = Math.max(1e-3, lead - trail), f = Math.min(1, Math.max(0, (lead - z) / chord));
      const plan = Math.max(-t * 0.4, (t - 1) * 0.4, z - lead, trail - z), thick = (0.026 * (1 - f) ** 0.6 + 0.006) * (1 - 0.45 * tc);
      return Math.max(plan, (Math.abs(y - yc) - thick) * 0.75);
    }, [s2 > 0 ? 0.04 : -0.46, 1.36, -0.32], [s2 > 0 ? 0.46 : -0.04, 1.6, 0.07], br));
    // the open Bible across its back, sloping down toward the reader behind, with a red ribbon
    for (const s of [-1, 1]) b.add(leaf((x, y, z) => { const lx = s * x; return Math.max(Math.abs(y - (1.47 + 0.02 * lx / 0.2) - (z + 0.08) * 0.45) - 0.012, -lx, lx - 0.22, Math.abs(z + 0.08) - 0.15); }, [s > 0 ? 0 : -0.23, 1.36, -0.24], [s > 0 ? 0.23 : 0, 1.6, 0.08], pg));
    b.add(boxAt(-0.006, 1.38, -0.22, 0.006, 1.5, -0.2, red));
  },
  "corona": b => {
    // a corona (crown chandelier) after the Romanesque wheels: a ring with gate towers between its candles, hung on chains
    const br = b.mat(W.brass), ir = b.mat(W.iron), R = 1.15, y = 0.35;
    b.add(leaf((x, yy, z) => Math.hypot(Math.hypot(x, z) - R, (yy - y) * 1.6) - 0.05, [-R - 0.06, y - 0.06, -R - 0.06], [R + 0.06, y + 0.06, R + 0.06], br));
    b.add(leaf((x, yy, z) => Math.max(Math.abs(Math.hypot(x, z) - R) - 0.012, Math.abs(yy - y + 0.08) - 0.06), [-R - 0.02, y - 0.15, -R - 0.02], [R + 0.02, y, R + 0.02], br));
    b.add(repeatAround(cylY(R, 0, y, y + 0.22, 0.06, br), 0, 0, 12, R + 0.08), repeatAround(coneY(R, 0, y + 0.22, y + 0.34, 0.075, 0.0, br), 0, 0, 12, R + 0.1), repeatAround(cylY(R, 0, y - 0.18, y, 0.03, br), 0, 0, 12, R + 0.05));
    for (let k = 0; k < 24; k++) { const a = ((k + 0.5) / 24) * Math.PI * 2, x = Math.cos(a) * R, z = Math.sin(a) * R; b.add(cylY(x, z, y + 0.04, y + 0.06, 0.03, br)); lit(b, x, y + 0.06, z, 0.18, 0.014, 0.05, k % 4 === 0); }
    for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2 + 0.3; b.add(capsule(Math.cos(a) * R, y + 0.02, Math.sin(a) * R, 0, 2.4, 0, 0.008, ir)); }
    b.add(sphere(0, 2.4, 0, 0.05, ir), cylY(0, 0, 2.4, 3.2, 0.01, ir));
  },
  "votive-stand": b => {
    // a black iron votive stand: three tiers of small candles in glass cups before a sand tray
    const ir = b.mat(W.iron), glass = b.mat({ kind: "stained", emit: 0.6, colour: "#8a2a2a" }), wax = b.mat(W.wax), fl = b.mat(W.flame);
    for (let t = 0; t < 3; t++) {
      const y = 0.7 + t * 0.18, z = 0.12 - t * 0.12;
      b.add(boxAt(-0.55, y - 0.02, z - 0.09, 0.55, y, z + 0.09, ir));
      for (let k = 0; k < 8; k++) { const x = -0.48 + k * 0.137 + (t % 2) * 0.03, on = (k * 7 + t * 3) % 5 !== 0; b.add(cylY(x, z, y, y + 0.06, 0.028, on ? glass : ir), cylY(x, z, y, y + 0.03, 0.024, wax)); if (on) b.add(ellipsoid(x, y + 0.05, z, 0.006, 0.016, 0.006, fl)); }
    }
    for (const sx of [-0.52, 0.52]) for (const sz of [-0.15, 0.2]) b.add(cylY(sx, sz, 0, 1.12, 0.014, ir));
    b.add(boxAt(-0.6, 0.62, -0.25, 0.6, 0.66, 0.28, ir), boxAt(-0.55, 0.4, -0.2, 0.55, 0.42, 0.24, ir));
    b.light({ x: 0, y: 0.95, z: 0.05, kelvin: 1900, power: 0.22 });
  },
  "andon": b => {
    // a standing paper lantern: a square frame on short legs, washi sides glowing round an oil dish, a carrying bow
    const wd = b.mat({ kind: "oak", colour: "#5a3a22", age: 0.2 }), paper = b.mat({ kind: "washi", colour: "#f3e6c4", emit: 1.1 }), dish = b.mat({ kind: "enamel", colour: "#4a3020" });
    for (const [x, z] of [[-0.15, -0.15], [0.15, -0.15], [-0.15, 0.15], [0.15, 0.15]] as const) b.add(boxAt(x - 0.012, 0, z - 0.012, x + 0.012, 0.86, z + 0.012, wd));
    b.add(boxAt(-0.17, 0.08, -0.17, 0.17, 0.1, 0.17, wd), boxAt(-0.16, 0.34, -0.16, 0.16, 0.355, 0.16, wd), boxAt(-0.16, 0.8, -0.16, 0.16, 0.82, 0.16, wd), boxAt(-0.16, 0.355, -0.16, 0.16, 0.8, 0.16, paper));
    for (const y of [0.5, 0.65]) b.add(boxAt(-0.162, y - 0.004, -0.162, 0.162, y + 0.004, 0.162, wd));
    b.add(cylY(0, 0, 0.355, 0.38, 0.06, dish), capsule(-0.13, 0.86, 0, -0.08, 1.0, 0, 0.008, wd), capsule(-0.08, 1.0, 0, 0.08, 1.0, 0, 0.008, wd), capsule(0.08, 1.0, 0, 0.13, 0.86, 0, 0.008, wd));
    b.light({ x: 0, y: 0.45, z: 0, kelvin: 1900, power: 0.16 });
  },
  "hibachi": b => {
    // a round zelkova hibachi with a copper liner, ash, glowing charcoal, an iron trivet and a cast-iron kettle (tetsubin)
    const kw = b.mat({ kind: "oak", colour: "#7a4e2c", age: 0.2 }), cu = b.mat({ kind: "brass", colour: "#a8603a" }), ash = b.mat({ kind: "plaster", colour: "#a8a49c", flake: 0 }), ir = b.mat({ kind: "iron", colour: "#1a1816", age: 0.25 }), coal = b.mat({ kind: "fire", emit: 1.6 });
    b.add(cut(revolve(0, 0, 0, 0.34, t => 0.2 + 0.05 * Math.sin(Math.PI * t) - 0.015 * t, 0.26, kw, 0, 1), [cylY(0, 0, 0.26, 0.4, 0.17, 0)]), cut(cylY(0, 0, 0.27, 0.35, 0.18, cu), [cylY(0, 0, 0.26, 0.4, 0.165, 0)]));
    b.add(cylY(0, 0, 0.2, 0.27, 0.17, ash));
    for (const [x, z] of [[0.03, 0.02], [-0.04, 0.0], [0.0, -0.04]] as const) b.add(ellipsoid(x, 0.285, z, 0.03, 0.022, 0.025, coal));
    b.add(cut(cylY(0, 0, 0.32, 0.33, 0.1, ir), [cylY(0, 0, 0.3, 0.35, 0.088, 0)]), ...[0, 1, 2].map(k => { const a = (k / 3) * Math.PI * 2; return capsule(Math.cos(a) * 0.095, 0.325, Math.sin(a) * 0.095, Math.cos(a) * 0.12, 0.27, Math.sin(a) * 0.12, 0.006, ir); }));
    const k0 = 0.33;
    b.add(revolve(0, 0, k0, k0 + 0.15, t => 0.095 * Math.sin(Math.PI * (0.18 + t * 0.7)) + 0.015, 0.11, b.mat({ kind: "iron", colour: "#22201c", age: 0.35 }), 0, 1.5));
    b.add(repeatAround(sphere(0.098, k0 + 0.07, 0, 0.007, ir), 0, 0, 28, 0.105), repeatAround(sphere(0.088, k0 + 0.105, 0, 0.007, ir), 0, 0, 24, 0.095));
    b.add(capsule(0.08, k0 + 0.06, 0, 0.16, k0 + 0.13, 0, 0.012, ir), cylY(0, 0, k0 + 0.15, k0 + 0.165, 0.045, ir), sphere(0, k0 + 0.175, 0, 0.012, ir));
    for (let k = 0; k < 8; k++) { const a0 = Math.PI * (k / 8), a1 = Math.PI * ((k + 1) / 8); b.add(capsule(-Math.cos(a0) * 0.08, k0 + 0.15 + Math.sin(a0) * 0.12, 0, -Math.cos(a1) * 0.08, k0 + 0.15 + Math.sin(a1) * 0.12, 0, 0.006, ir)); }
    b.light({ x: 0, y: 0.3, z: 0, kelvin: 1600, power: 0.04 });
  },
  "kotatsu": b => {
    // a kotatsu: a low frame under a thick quilt that falls to the floor in folds, a lacquered top, a basket of mikan
    const quilt = b.mat({ kind: "fabric", colour: "#7a2a2a", colour2: "#2a3550", pattern: "check", unit: 0.12 }), top = b.mat({ kind: "oak", colour: "#6a4428", age: 0.1 });
    b.add(leaf((x, y, z) => { const t = Math.min(1, Math.max(0, y / 0.37)), hw = 0.74 - 0.3 * t ** 0.7, ax = Math.abs(x), az = Math.abs(z), ang = Math.atan2(z, x), fold = 0.018 * Math.sin(ang * 22 + Math.sin(ang * 5) * 2) * (1 - t);
      const q = Math.hypot(Math.max(ax - hw + 0.08, 0), Math.max(az - hw + 0.08, 0)) - 0.08 - fold; return Math.max(q * 0.7, -y, y - 0.37); }, [-0.8, 0, -0.8], [0.8, 0.38, 0.8], quilt));
    b.add(boxAt(-0.44, 0.37, -0.44, 0.44, 0.395, 0.44, top, 0, 0.006));
    const basket = b.mat({ kind: "cane", colour: "#a8824e" }), mikan = b.mat({ kind: "velvet", colour: "#e07a1a" });
    b.add(cut(revolve(0.1, -0.05, 0.395, 0.45, t => 0.11 + 0.03 * t, 0.14, basket), [cylY(0.1, -0.05, 0.41, 0.5, 0.125, 0)]));
    for (const [x, z, y] of [[0.06, -0.08, 0.44], [0.15, -0.02, 0.44], [0.08, 0.02, 0.445], [0.13, -0.1, 0.44], [0.1, -0.04, 0.49]] as const) b.add(ellipsoid(x, y, z, 0.035, 0.03, 0.035, mikan));
  },
  "zataku": b => {
    // a low lacquered table with a tea tray: a pot and two cups
    const lq = b.mat({ kind: "painted-wood", colour: "#2a1410", flake: 0 }), pot = b.mat({ kind: "enamel", colour: "#6a5a48" }), cup = b.mat({ kind: "enamel", colour: "#d8d0bc" }), tray = b.mat({ kind: "oak", colour: "#5a3a22" });
    b.add(boxAt(-0.6, 0.3, -0.375, 0.6, 0.33, 0.375, lq, 0, 0.006), boxAt(-0.56, 0.25, -0.34, 0.56, 0.3, 0.34, lq));
    for (const [x, z] of [[-0.52, -0.3], [0.52, -0.3], [-0.52, 0.3], [0.52, 0.3]] as const) b.add(boxAt(x - 0.03, 0, z - 0.03, x + 0.03, 0.25, z + 0.03, lq));
    b.add(boxAt(-0.2, 0.33, -0.12, 0.2, 0.345, 0.12, tray), revolve(-0.08, 0, 0.345, 0.43, t => 0.05 * Math.sin(Math.PI * (0.25 + t * 0.6)) + 0.012, 0.06, pot), capsule(-0.03, 0.39, 0, 0.02, 0.41, 0.0, 0.006, pot));
    for (const x of [0.06, 0.14]) b.add(cut(revolve(x, 0.02, 0.345, 0.39, t => 0.028 + 0.006 * t, 0.035, cup), [cylY(x, 0.02, 0.355, 0.4, 0.026, 0)]));
  },
  "byobu": b => {
    // a six-panel gold screen: gold leaf in squares, a painted pine, hills, a stream and gold clouds carried across every fold
    const n = 6, pw = 0.6, H = 1.7, a = 0.5, lq = b.mat({ kind: "painted-wood", colour: "#14100e", flake: 0 }), back = b.mat({ kind: "fabric", colour: "#b8a37a", colour2: "#b09a70", pattern: "plain" });
    let px = -((n * pw * Math.cos(a)) / 2), pz = 0;
    for (let i = 0; i < n; i++) {
      const ai = i % 2 ? -a : a, dx = Math.cos(ai), dz = Math.sin(ai), x0 = px, z0 = pz, off = n * pw - i * pw + (x0 * dx + z0 * dz);
      const gold = b.mat({ kind: "gold-leaf", pattern: "byobu", unit: n * pw, course: H, offset: [off, -0.02] });
      const loc = (x: number, z: number): [number, number] => [(x - x0) * dx + (z - z0) * dz, -(x - x0) * dz + (z - z0) * dx];
      const lo: [number, number, number] = [Math.min(x0, x0 + dx * pw) - 0.05, 0, Math.min(z0, z0 + dz * pw) - 0.05], hi: [number, number, number] = [Math.max(x0, x0 + dx * pw) + 0.05, H + 0.04, Math.max(z0, z0 + dz * pw) + 0.05];
      b.add(leaf((x, y, z) => { const [s, n2] = loc(x, z); return Math.max(Math.abs(s - pw / 2) - pw / 2 + 0.02, Math.abs(y - H / 2 - 0.02) - H / 2 + 0.03, Math.abs(n2 - 0.004) - 0.004); }, lo, hi, gold));
      b.add(leaf((x, y, z) => { const [s, n2] = loc(x, z); return Math.max(Math.abs(s - pw / 2) - pw / 2, Math.abs(y - H / 2 - 0.02) - H / 2, Math.abs(n2 + 0.006) - 0.008); }, lo, hi, back));
      b.add(leaf((x, y, z) => { const [s, n2] = loc(x, z), inner = Math.max(Math.abs(s - pw / 2) - pw / 2 + 0.02, Math.abs(y - H / 2 - 0.02) - H / 2 + 0.03); return Math.max(Math.abs(s - pw / 2) - pw / 2, Math.abs(y - H / 2 - 0.02) - H / 2, Math.abs(n2) - 0.012, -inner); }, lo, hi, lq));
      px += dx * pw; pz += dz * pw;
    }
  },
  "platform-sofa": b => {
    // a low Japandi sofa: a solid oak platform, deep linen seat and back cushions, a folded throw
    const oak = b.mat({ kind: "oak", colour: "#b08a5e", age: 0.05 }), linen = b.mat({ kind: "fabric", colour: "#d8cfbf", colour2: "#d2c9b8", pattern: "plain" }), throw_ = b.mat({ kind: "fabric", colour: "#8a7a62", colour2: "#7e6e58", pattern: "plain" });
    b.add(boxAt(-1.1, 0.08, -0.45, 1.1, 0.24, 0.45, oak, 0, 0.01), boxAt(-1.06, 0, -0.41, -0.96, 0.08, 0.41, oak), boxAt(0.96, 0, -0.41, 1.06, 0.08, 0.41, oak));
    for (const x of [-0.53, 0.53]) b.add(boxAt(x - 0.52, 0.24, -0.3, x + 0.52, 0.42, 0.44, linen, 0, 0.06), boxAt(x - 0.5, 0.4, -0.45, x + 0.5, 0.78, -0.24, linen, 0, 0.09));
    b.add(boxAt(-1.1, 0.24, -0.45, -0.98, 0.58, 0.44, linen, 0, 0.05), boxAt(0.98, 0.24, -0.45, 1.1, 0.58, 0.44, linen, 0, 0.05));
    b.add(leaf((x, y, z) => Math.max(Math.abs(y - 0.43 - 0.01 * Math.sin(z * 30)) - 0.012, Math.abs(x - 0.75) - 0.3, Math.abs(z - 0.08) - 0.38) * 0.8, [0.44, 0.4, -0.31], [1.06, 0.46, 0.47], throw_), boxAt(0.5, 0.42, 0.25, 1.05, 0.48, 0.45, throw_, 0, 0.02));
  },
  "round-coffee-table": b => {
    // a low drum table of solid oak, a stoneware bowl and two books on it
    const oak = b.mat({ kind: "oak", colour: "#9a7350", age: 0.05 }), clay = b.mat({ kind: "enamel", colour: "#6e6458" }), bk = b.mat({ kind: "leather", colour: "#4a5a52" }), bk2 = b.mat({ kind: "leather", colour: "#c8b89a" });
    b.add(cylY(0, 0, 0.32, 0.36, 0.5, oak), cylY(0, 0, 0, 0.32, 0.36, oak));
    b.add(cut(revolve(-0.15, 0.08, 0.36, 0.45, t => 0.07 + 0.08 * t, 0.16, clay), [revolve(-0.15, 0.08, 0.375, 0.46, t => 0.06 + 0.08 * t, 0.15, 0)]), boxAt(0.05, 0.36, -0.2, 0.33, 0.39, 0.0, bk), boxAt(0.08, 0.39, -0.18, 0.31, 0.41, -0.02, bk2));
  },
  "paper-pendant": b => {
    // a paper globe pendant on a long cord: washi over a thin spiral of bamboo, lit from within
    const paper = b.mat({ kind: "washi", colour: "#f3e9d4", emit: 1.4 }), rib = b.mat({ kind: "cane", colour: "#d8c8a0" }), cord = b.mat({ kind: "fabric", colour: "#2a2622", pattern: "plain" });
    // the bamboo spiral shows through the paper as fine rings
    b.add(ellipsoid(0, 0.45, 0, 0.3, 0.27, 0.3, paper), leaf((x, y, z) => Math.max(Math.abs(Math.hypot(x / 0.303, (y - 0.45) / 0.273, z / 0.303) - 1) * 0.27 - 0.0025, (Math.abs((((y - 0.18) / 0.045) % 1 + 1) % 1 - 0.5) - 0.07) * 0.045), [-0.31, 0.17, -0.31], [0.31, 0.73, 0.31], rib));
    b.add(cylY(0, 0, 0.72, 2.0, 0.004, cord)); b.light({ x: 0, y: 0.45, z: 0, kelvin: 2700, power: 0.18 });
  },
  "wing-chair": b => {
    // a leather wing chair: deep-buttoned back with wings, rolled arms, turned front legs on castors
    const le = b.mat({ kind: "leather", colour: "#5a2a18", pattern: "diamond", unit: 0.14 }), sm = b.mat({ kind: "leather", colour: "#4e2414" }), wd = b.mat({ kind: "oak", colour: "#3a2216" }), br = b.mat({ kind: "brass", colour: "#b08a48" });
    b.add(boxAt(-0.38, 0.2, -0.36, 0.38, 0.42, 0.36, sm, 0, 0.05), boxAt(-0.31, 0.42, -0.3, 0.31, 0.5, 0.36, sm, 0, 0.05));
    b.add(leaf((x, y, z) => Math.max(Math.abs(x) - 0.38, Math.abs(z + 0.33 + (y - 0.4) * 0.12) - 0.07, 0.4 - y, y - 1.18 + 0.06 * (x / 0.38) ** 2) * 0.9, [-0.39, 0.4, -0.5], [0.39, 1.19, -0.24], le));
    for (const s of [-1, 1]) {
      b.add(leaf((x, y, z) => Math.max(Math.abs(x - s * 0.36) - 0.05, Math.abs(z + 0.12) - 0.24 + Math.max(0, y - 0.7) * 0.6, 0.42 - y, y - 1.08 + Math.max(0, z + 0.1) * 0.9), [s * 0.36 - 0.06, 0.42, -0.37], [s * 0.36 + 0.06, 1.09, 0.13], sm));
      b.add(capsule(s * 0.38, 0.66, -0.25, s * 0.38, 0.66, 0.34, 0.07, sm), boxAt(s * 0.38 - 0.07, 0.42, -0.25, s * 0.38 + 0.07, 0.66, 0.34, sm), revolve(s * 0.32, 0.3, 0, 0.2, t => 0.03 - 0.008 * t + 0.008 * Math.exp(-((t - 0.6) ** 2) / 0.01), 0.04, wd), sphere(s * 0.32, 0.025, 0.3, 0.025, br), boxAt(s * 0.33 - 0.025, 0, -0.33, s * 0.33 + 0.025, 0.2, -0.28, wd));
    }
  },
  "bankers-lamp": b => {
    // a banker's desk lamp: a brass stand and a half-tube shade of cased green glass over its white lining, lit
    const br = b.mat({ kind: "brass", colour: "#c9a24e" }), sh = b.mat({ kind: "enamel", colour: "#1f5a32" }), lin = b.mat({ kind: "plain", colour: "#f2ead2", emit: 0.6 });
    b.add(boxAt(-0.11, 0, -0.07, 0.11, 0.025, 0.07, br, 0, 0.01), cylY(0, -0.02, 0.025, 0.3, 0.012, br), capsule(-0.12, 0.33, -0.01, 0.12, 0.33, -0.01, 0.008, br));
    b.add(leaf((x, y, z) => Math.max(Math.abs(Math.hypot(y - 0.3, z - 0.02) - 0.08) - 0.005, 0.3 - y, Math.abs(x) - 0.17), [-0.18, 0.29, -0.07], [0.18, 0.39, 0.11], sh));
    b.add(leaf((x, y, z) => Math.max(Math.abs(Math.hypot(y - 0.3, z - 0.02) - 0.074) - 0.002, 0.3 - y, Math.abs(x) - 0.165), [-0.17, 0.29, -0.06], [0.17, 0.38, 0.1], lin));
    b.light({ x: 0, y: 0.27, z: 0.04, kelvin: 2600, power: 0.015 });
  },
  "globe": b => {
    // a library globe on a turned stand with a brass meridian ring
    const wd = b.mat({ kind: "oak", colour: "#4a2c18" }), br = b.mat({ kind: "brass", colour: "#b8954a" }), sea = b.mat({ kind: "canvas", pattern: "globe" });
    for (let k = 0; k < 3; k++) { const a = (k / 3) * Math.PI * 2; b.add(capsule(0, 0.42, 0, Math.cos(a) * 0.3, 0.02, Math.sin(a) * 0.3, 0.025, wd)); }
    b.add(revolve(0, 0, 0.35, 0.62, t => 0.04 + 0.03 * Math.exp(-((t - 0.5) ** 2) / 0.02), 0.08, wd), cylY(0, 0, 0.62, 0.66, 0.32, wd), sphere(0, 0.9, 0, 0.23, sea));
    b.add(leaf((x, y, z) => Math.max(Math.abs(Math.hypot(x, y - 0.9) - 0.26) - 0.008, Math.abs(z) - 0.012), [-0.27, 0.62, -0.02], [0.27, 1.17, 0.02], br));
  },
  "range-cooker": b => {
    // a cast-iron range cooker in cream enamel: two oven doors, chrome lids over the hotplates, a rail and a kettle
    const en = b.mat({ kind: "enamel", colour: "#ece2c8" }), ch = b.mat({ kind: "steel" }), blk = b.mat({ kind: "iron", colour: "#1a1816", age: 0.05 }), cu = b.mat({ kind: "brass", colour: "#b0663a" });
    b.add(boxAt(-0.5, 0.1, -0.33, 0.5, 0.86, 0.32, en, 0, 0.02), boxAt(-0.52, 0, -0.35, 0.52, 0.1, 0.33, blk), boxAt(-0.5, 0.86, -0.33, 0.5, 0.9, 0.32, blk));
    for (const [y0, y1] of [[0.14, 0.46], [0.5, 0.82]]) for (const x of [-0.25, 0.25]) b.add(boxAt(x - 0.21, y0, 0.32, x + 0.21, y1, 0.34, en, 0, 0.01), capsule(x - 0.12, y1 - 0.06, 0.37, x + 0.12, y1 - 0.06, 0.37, 0.012, ch));
    for (const x of [-0.25, 0.25]) b.add(revolve(x, -0.05, 0.9, 1.0, t => 0.19 * Math.sqrt(Math.max(0, 1 - t * t)), 0.2, ch), capsule(x - 0.1, 0.99, -0.05, x + 0.1, 0.99, -0.05, 0.01, ch));
    b.add(capsule(-0.5, 0.8, 0.42, 0.5, 0.8, 0.42, 0.012, ch), boxAt(-0.52, 0.86, -0.35, -0.48, 0.9, 0.4, ch), boxAt(0.48, 0.86, -0.35, 0.52, 0.9, 0.4, ch));
    b.add(revolve(0.25, -0.05, 1.0, 1.2, t => 0.1 * Math.sin(Math.PI * (0.25 + t * 0.6)) + 0.02, 0.12, cu), capsule(0.32, 1.12, -0.05, 0.42, 1.18, -0.05, 0.012, cu), capsule(0.17, 1.22, -0.05, 0.33, 1.22, -0.05, 0.01, blk));
  },
  "butler-sink": b => {
    // a deep fireclay Belfast sink on brick piers under an oak drainer board, a brass bridge tap
    const clay = b.mat({ kind: "enamel", colour: "#f2eee4" }), oak = b.mat({ kind: "oak", colour: "#8a6440", age: 0.3 }), br = b.mat({ kind: "brass", colour: "#c09a50" }), brick = b.mat({ kind: "brick", colour: "#a85a3a", age: 0.4 });
    b.add(cut(boxAt(-0.38, 0.66, -0.25, 0.38, 0.92, 0.25, clay, 0, 0.02), [boxAt(-0.33, 0.7, -0.2, 0.33, 1.0, 0.2, 0, 0, 0.03)]), boxAt(-0.42, 0, -0.27, -0.3, 0.66, 0.2, brick), boxAt(0.3, 0, -0.27, 0.42, 0.66, 0.2, brick));
    b.add(boxAt(-1.1, 0.88, -0.28, -0.38, 0.92, 0.27, oak), repeatX(boxAt(-1.05, 0.915, -0.2, -1.04, 0.925, 0.2, oak), 0.06, 11));
    b.add(cylY(-0.08, -0.27, 0.92, 1.12, 0.012, br), cylY(0.08, -0.27, 0.92, 1.12, 0.012, br), capsule(-0.08, 1.12, -0.27, 0.08, 1.12, -0.27, 0.012, br), capsule(0, 1.12, -0.27, 0, 1.18, -0.12, 0.012, br), capsule(0, 1.18, -0.12, 0, 1.08, -0.06, 0.01, br));
    for (const x of [-0.08, 0.08]) b.add(cylY(x, -0.27, 1.12, 1.16, 0.025, br));
  },
  "potted-olive": b => {
    // an olive tree in a terracotta pot: a twisting trunk, clumps of silver-green leaves
    const pot = b.mat({ kind: "enamel", colour: "#b0603a" }), bark = b.mat({ kind: "oak", colour: "#6a6050", age: 0.6 }), lf = b.mat({ kind: "foliage", colour: "#7c8a68" }), soil = b.mat({ kind: "dirt", colour: "#3a2e24" });
    b.add(revolve(0, 0, 0, 0.42, t => 0.18 + 0.06 * t + (t > 0.9 ? 0.02 : 0), 0.27, pot), cylY(0, 0, 0.38, 0.4, 0.22, soil));
    b.add(sculpt([{ a: [0, 0.38, 0], b: [0.05, 0.8, 0.02], r1: 0.04, r2: 0.032 }, { a: [0.05, 0.8, 0.02], b: [-0.03, 1.15, -0.02], r1: 0.032, r2: 0.025 }, { a: [-0.03, 1.15, -0.02], b: [0.1, 1.35, 0.03], r1: 0.022, r2: 0.014 }, { a: [-0.03, 1.15, -0.02], b: [-0.16, 1.32, 0.0], r1: 0.02, r2: 0.012 }], 0.03, bark));
    // a loose crown of many small leafy clumps, open enough to see the branches through
    for (let k = 0; k < 16; k++) { const a = k * 2.4, rr = 0.08 + 0.17 * ((k * 0.618) % 1), y = 1.22 + 0.36 * ((k * 0.382) % 1); b.add(clump(Math.cos(a) * rr, y, Math.sin(a) * rr * 0.8, 0.07 + 0.03 * ((k * 0.7) % 1), 0.05, 0.07, lf, 0, 0.5)); }
  },
};
