/**
 * INTERIOR1 construction: each furniture type in `furn-data.ts` built at its measured size from the ARCH1 signed-distance
 * kit, front toward +z, standing on y = 0, so any scene can place it (`buildFurniture(b, id)` then `b.place(...)`).
 *
 * The parts are made the way joiners make them: turned legs with beads and vases, cabriole legs that swell at the knee
 * and narrow at the ankle onto a pad or a ball and claw, vase-shaped and pierced splats, a Windsor's saddled seat with
 * a spindle back and steam-bent bow, Thonet's bent hoops, the Ming horseshoe rail flowing into the back, framed and
 * panelled carcases, drawers with brass or iron fittings, buttoned leather, caned seats.
 */
import type { Node, SculptPrim } from "./arch-sdf";
import { leaf, sculpt } from "./arch-sdf";
import type { SceneBuilder } from "./arch-kit";
import { beam, boxAt, capsule, cut, cylX, cylY, cylZ, dome, ellipsoid, opening, repeatAround, repeatX, revolve, sphere } from "./arch-kit";
import type { SurfaceSpec } from "./arch-surface";
import { findFurnitureType } from "./furn-data";

export const FM = {
  oak: { kind: "oak", colour: "#6b4e33", age: 0.4 } as SurfaceSpec,
  darkOak: { kind: "oak", colour: "#3f2c1e", age: 0.5 } as SurfaceSpec,
  walnut: { kind: "oak", colour: "#5a3a26", age: 0.2 } as SurfaceSpec,
  mahogany: { kind: "oak", colour: "#5e2a1a", age: 0.15 } as SurfaceSpec,
  maple: { kind: "oak", colour: "#b98a55", age: 0.2 } as SurfaceSpec,
  elm: { kind: "oak", colour: "#7a5536", age: 0.3 } as SurfaceSpec,
  beech: { kind: "oak", colour: "#6e3f22", age: 0.1 } as SurfaceSpec,
  huanghuali: { kind: "veneer", colour: "#9a5e2e" } as SurfaceSpec,
  teak: { kind: "veneer", colour: "#8a5530" } as SurfaceSpec,
  keyaki: { kind: "oak", colour: "#8a5a32", age: 0.2 } as SurfaceSpec,
  pine: { kind: "boards", colour: "#b9935e", age: 0.3 } as SurfaceSpec,
  cane: { kind: "cane" } as SurfaceSpec,
  leather: { kind: "leather", colour: "#5e2a1c", pattern: "diamond", unit: 0.18 } as SurfaceSpec,
  smoothLeather: { kind: "leather", colour: "#3a2a22" } as SurfaceSpec,
  velvet: { kind: "velvet", colour: "#4a2a3a" } as SurfaceSpec,
  wool: { kind: "fabric", colour: "#6a2a28", colour2: "#5a2422" } as SurfaceSpec,
  cotton: { kind: "fabric", colour: "#e6dcc8", colour2: "#dcd0b8" } as SurfaceSpec,
  tape: { kind: "fabric", colour: "#3a4a5a", colour2: "#c8b88a" } as SurfaceSpec,
  brass: { kind: "brass", colour: "#c4a050" } as SurfaceSpec,
  iron: { kind: "iron", age: 0.3 } as SurfaceSpec,
  chrome: { kind: "steel" } as SurfaceSpec,
  glass: { kind: "glass" } as SurfaceSpec,
  candle: { kind: "plain", colour: "#efe6cf" } as SurfaceSpec,
  flame: { kind: "flame", emit: 12 } as SurfaceSpec,
  lacquer: { kind: "painted-wood", colour: "#2a1a14", flake: 0.02 } as SurfaceSpec,
  plates: { kind: "jars", colour: "#e8e2d6" } as SurfaceSpec,
  books: { kind: "books" } as SurfaceSpec,
  tiles: { kind: "glazed-tile", colour: "#2f6a5a", colour2: "#3a7a68", unit: 0.22 } as SurfaceSpec,
};

// ---- Joiner's parts -------------------------------------------------------------------------------------------------------

/** A turned leg or post: a vase, beads and rings along its length (`style` sets the profile). */
export function turned(x: number, z: number, y0: number, y1: number, r: number, mat: number, style: "vase" | "bobbin" | "taper" | "bulb" = "vase"): Node {
  const prof = (t: number) => {
    if (style === "taper") return r * (1 - 0.45 * t);
    if (style === "bobbin") return r * (0.75 + 0.25 * Math.abs(Math.sin(t * Math.PI * 7)));
    if (style === "bulb") return r * (0.6 + 0.9 * Math.exp(-((t - 0.45) ** 2) / 0.02) + 0.2 * Math.exp(-((t - 0.85) ** 2) / 0.001));
    return r * (0.65 + 0.45 * Math.exp(-((t - 0.3) ** 2) / 0.012) + 0.25 * Math.exp(-((t - 0.62) ** 2) / 0.0006) + 0.25 * Math.exp(-((t - 0.08) ** 2) / 0.0006));
  };
  return revolve(x, z, y0, y1, prof, r * 1.6, mat, 0, 4);
}
/** A cabriole leg: swelling outward at the knee, narrowing at the ankle, ending in a pad or a ball and claw; `out` points outward (unit x, z). */
export function cabriole(x: number, z: number, h: number, r: number, out: [number, number], mat: number, foot: "pad" | "claw"): Node {
  const [ox, oz] = out, P = (k: number, y: number): [number, number, number] => [x + ox * k, y, z + oz * k];
  const prims: SculptPrim[] = [
    { a: P(0, h), b: P(r * 1.4, h * 0.82), r1: r * 1.15, r2: r * 1.25 }, { a: P(r * 1.4, h * 0.82), b: P(r * 0.2, h * 0.42), r1: r * 1.2, r2: r * 0.8 },
    { a: P(r * 0.2, h * 0.42), b: P(-r * 0.25, h * 0.14), r1: r * 0.8, r2: r * 0.55 }, { a: P(-r * 0.25, h * 0.14), b: P(r * 0.3, r * 0.6), r1: r * 0.55, r2: r * 0.7 },
  ];
  if (foot === "pad") prims.push({ a: P(r * 0.55, r * 0.35), e: [r * 1.3, r * 0.4, r * 1.3] });
  else { prims.push({ a: P(r * 0.5, r * 0.75), r1: r * 1.05 }); for (let i = -1; i <= 1; i++) { const sx = -oz * i * r * 0.75, sz = ox * i * r * 0.75; prims.push({ a: [x + ox * r * 0.6 + sx, r * 1.5, z + oz * r * 0.6 + sz], b: [x + ox * r * 1.45 + sx * 1.1, r * 0.15, z + oz * r * 1.45 + sz * 1.1], r1: r * 0.32, r2: r * 0.18, k: r * 0.3 }); } }
  return sculpt(prims, r * 0.5, mat);
}
/** A flat splat or slat in the back, its width varying with height (`w(t)`), leaning back by `lean` per metre. */
function splat(cx: number, y0: number, y1: number, z: number, wOf: (t: number) => number, t: number, lean: number, mat: number, pierce = 0): Node {
  const h = y1 - y0;
  return leaf((x, y, zz) => {
    const tt = (y - y0) / h, zc = z - (y - y0) * lean, half = Math.max(0, wOf(Math.min(1, Math.max(0, tt)))) / 2;
    let d = Math.max(Math.abs(x - cx) - half, Math.abs(zz - zc) - t / 2, y0 - y, y - y1);
    if (pierce) { const holes = Math.sin(((x - cx) / (half + 1e-3)) * pierce * Math.PI) * Math.sin(tt * pierce * 2 * Math.PI); if (half > 0.03 && tt > 0.15 && tt < 0.85) d = Math.max(d, -(holes - 0.55) * 0.02); }
    return d * 0.8;
  }, [cx - 0.3, y0, z - h * Math.abs(lean) - t - 0.05], [cx + 0.3, y1, z + t + 0.05], mat);
}
/** A drawer front with a pair of handles. */
function drawer(b: SceneBuilder, x0: number, y0: number, x1: number, y1: number, z: number, wood: number, handle: number, ring = false) {
  b.add(boxAt(x0 + 0.01, y0 + 0.01, z, x1 - 0.01, y1 - 0.01, z + 0.012, wood));
  const cy = (y0 + y1) / 2, w = x1 - x0;
  for (const hx of w > 0.5 ? [x0 + w * 0.25, x1 - w * 0.25] : [(x0 + x1) / 2]) b.add(ring ? cut(cylZ(hx, cy - 0.02, z + 0.012, z + 0.02, 0.035, handle), [cylZ(hx, cy - 0.02, z, z + 0.04, 0.026, 0)]) : sphere(hx, cy, z + 0.025, 0.018, handle), boxAt(hx - 0.03, cy - 0.02, z + 0.012, hx + 0.03, cy + 0.025, z + 0.016, handle));
}

// ---- The pieces -----------------------------------------------------------------------------------------------------------

type Builder = (b: SceneBuilder) => void;
const B: Record<string, Builder> = {
  "settle": b => { const m = b.mat(FM.darkOak), t = findFurnitureType("settle")!;
    b.add(cut(boxAt(-t.w / 2, 0, -0.27, t.w / 2, t.h, -0.2, m), [repeatX(boxAt(-t.w / 2 + 0.08, 0.6, -0.19, -t.w / 2 + 0.42, t.h - 0.12, -0.16, 0), 0.38, 4)]), boxAt(-t.w / 2, 0.41, -0.22, t.w / 2, 0.46, 0.27, m));
    for (const s of [-1, 1]) b.add(boxAt(s * t.w / 2 - 0.04, 0, -0.27, s * t.w / 2 + 0.04, 1.0, 0.28, m), boxAt(s * t.w / 2 - 0.05, 0.95, -0.27, s * t.w / 2 + 0.05, 1.02, 0.3, m));
    b.add(boxAt(-t.w / 2, 0.05, 0.22, t.w / 2, 0.41, 0.26, m)); },
  "windsor-chair": b => { const elm = b.mat(FM.elm), ash = b.mat({ ...FM.elm, colour: "#6a4a2e" });
    b.add(leaf((x, y, z) => { const sad = 0.015 * Math.cos(x * 6) * Math.cos((z - 0.02) * 6); return Math.max(Math.hypot(x / 1.0, (z + 0.02) / 0.9) - 0.25, Math.abs(y - 0.425 + sad) - 0.025) * 0.8; }, [-0.28, 0.38, -0.27], [0.28, 0.47, 0.25], elm));
    for (const [x, z] of [[-0.18, 0.16], [0.18, 0.16], [-0.17, -0.15], [0.17, -0.15]]) b.add(capsule(x * 1.25, 0, z * 1.3, x, 0.41, z, 0.02, ash), sphere(x * 1.16, 0.2, z * 1.2, 0.028, ash));
    b.add(capsule(-0.2, 0.2, 0.19, -0.19, 0.2, -0.18, 0.015, ash), capsule(0.2, 0.2, 0.19, 0.19, 0.2, -0.18, 0.015, ash), capsule(-0.2, 0.2, 0.0, 0.2, 0.2, 0.0, 0.015, ash));
    // the steam-bent bow and seven spindles
    b.add(leaf((x, y, z) => { const yy = y - 0.45, zz = z + 0.17 + yy * 0.12, R = 0.24, d = Math.hypot(x / 0.9, yy - 0.28) - R; return Math.max(Math.hypot(d, zz) - 0.016, -yy); }, [-0.3, 0.44, -0.3], [0.3, 1.0, -0.1], ash));
    for (let i = -3; i <= 3; i++) { const x = i * 0.06, top = 0.45 + 0.28 + Math.sqrt(Math.max(0, 0.24 ** 2 - (x / 0.9) ** 2)) - 0.01; b.add(capsule(x, 0.44, -0.16, x, top, -0.17 - (top - 0.45) * 0.12, 0.009, ash)); } },
  "ladder-back": b => { const mp = b.mat(FM.maple), tape = b.mat(FM.tape);
    for (const [x, z, h] of [[-0.21, 0.19, 0.5], [0.21, 0.19, 0.5], [-0.19, -0.19, 1.05], [0.19, -0.19, 1.05]]) b.add(turned(x, z, 0, h, 0.018, mp, "taper"), sphere(x, h + 0.02, z, 0.024, mp));
    b.add(boxAt(-0.21, 0.4, -0.19, 0.21, 0.43, 0.19, tape)); for (const y of [0.15, 0.27]) b.add(cylX(y, 0.19, -0.21, 0.21, 0.01, mp), cylX(y, -0.19, -0.19, 0.19, 0.01, mp));
    for (const y of [0.62, 0.76, 0.9]) b.add(leaf((x, yy, z) => Math.max(Math.abs(x) - 0.19, Math.abs(yy - y - 0.02 * Math.cos(x * 8)) - 0.035, Math.abs(z + 0.19) - 0.008), [-0.2, y - 0.06, -0.2], [0.2, y + 0.06, -0.18], mp)); },
  "queen-anne-chair": b => chairWithCabriole(b, FM.walnut, "pad", t => 0.07 + 0.12 * Math.sin(Math.PI * Math.min(1, t * 1.15)) ** 1.6 - 0.04 * Math.exp(-((t - 0.75) ** 2) / 0.01), 0),
  "chippendale-chair": b => chairWithCabriole(b, FM.mahogany, "claw", t => 0.09 + 0.1 * Math.sin(Math.PI * t) - 0.03 * Math.cos(t * 9), 3),
  "thonet-14": b => { const bw = b.mat(FM.beech), cane = b.mat(FM.cane);
    b.add(cut(cylY(0, 0.02, 0.43, 0.46, 0.21, bw), [cylY(0, 0.02, 0, 1, 0.18, 0)]), cylY(0, 0.02, 0.435, 0.455, 0.185, cane));
    for (const [x, z] of [[-0.14, 0.15], [0.14, 0.15]]) b.add(capsule(x * 1.15, 0, z * 1.2, x, 0.44, z, 0.016, bw));
    // back legs run up into one bent hoop
    b.add(leaf((x, y, z) => { const zc = -0.15 - Math.max(0, y - 0.45) * 0.12 - (y < 0.45 ? (0.45 - y) * 0.15 : 0), xc = Math.abs(x); const legs = Math.max(Math.hypot(xc - (0.15 - Math.max(0, y - 0.45) * 0.02), z - zc) - 0.017, -y, y - 0.8); const hoopY = y - 0.8, hoop = Math.max(Math.hypot(Math.hypot(x / 1.0, hoopY) - 0.13, z - (zc)) - 0.016, -hoopY - 0.0); return Math.min(legs, hoop) * 0.85; }, [-0.2, 0, -0.32], [0.2, 0.95, -0.1], bw));
    b.add(cut(cylY(0, 0.0, 0.18, 0.2, 0.2, bw), [cylY(0, 0, 0, 1, 0.185, 0)]), leaf((x, y, z) => Math.max(Math.hypot(Math.hypot(x, y - 0.66) - 0.06, z + 0.21) - 0.012, -1), [-0.08, 0.58, -0.24], [0.08, 0.74, -0.18], bw)); },
  "ming-horseshoe": b => { const hw = b.mat(FM.huanghuali), mat = b.mat({ kind: "cane", colour: "#8a6a40" });
    b.add(boxAt(-0.29, 0.47, -0.22, 0.29, 0.51, 0.23, hw), boxAt(-0.27, 0.48, -0.2, 0.27, 0.512, 0.21, mat));
    for (const [x, z] of [[-0.27, 0.21], [0.27, 0.21], [-0.27, -0.2], [0.27, -0.2]]) b.add(cylY(x, z, 0, 0.47, 0.022, hw));
    b.add(boxAt(-0.29, 0.06, 0.2, 0.29, 0.1, 0.25, hw), cylX(0.12, -0.2, -0.27, 0.27, 0.012, hw), cylZ(-0.27, 0.15, -0.2, 0.2, 0.012, hw), cylZ(0.27, 0.15, -0.2, 0.2, 0.012, hw));
    // the horseshoe rail: one curve from the front posts round behind the back
    b.add(leaf((x, y, z) => { const zc = -0.05, ang = Math.atan2(z - zc, x), R = 0.28 + 0.02 * Math.cos(ang * 2), back = Math.max(0, -(z - zc)) / 0.25, ry = 0.72 + 0.12 * back ** 2; const d = Math.hypot(Math.hypot(x, (z - zc) * 1.15) - R, y - ry) - 0.017; return Math.max(d, zc - 0.25 - z, z - 0.23); }, [-0.32, 0.65, -0.33], [0.32, 0.88, 0.25], hw));
    for (const s of [-1, 1]) b.add(capsule(s * 0.27, 0.5, 0.21, s * 0.28, 0.71, 0.18, 0.015, hw), capsule(s * 0.27, 0.5, -0.2, s * 0.21, 0.84, -0.26, 0.017, hw));
    b.add(splat(0, 0.5, 0.86, -0.21, t => 0.12 + 0.03 * Math.sin(t * Math.PI), 0.015, -0.12, hw)); },
  "official-hat-chair": b => { const hw = b.mat(FM.huanghuali), mat = b.mat({ kind: "cane", colour: "#8a6a40" });
    b.add(boxAt(-0.28, 0.47, -0.21, 0.28, 0.51, 0.22, hw), boxAt(-0.26, 0.48, -0.19, 0.26, 0.512, 0.2, mat));
    for (const [x, z] of [[-0.26, 0.2], [0.26, 0.2]]) b.add(cylY(x * 1.04, z, 0, 0.47, 0.022, hw), capsule(x, 0.5, z, x * 1.05, 0.68, z - 0.03, 0.016, hw));
    for (const x of [-0.24, 0.24]) b.add(capsule(x * 1.06, 0, -0.2, x, 1.08, -0.27, 0.02, hw));
    b.add(leaf((x, y, z) => { const yc = 1.1 + 0.025 * Math.cos(x * 6); return Math.max(Math.hypot(y - yc, z + 0.27) - 0.02, Math.abs(x) - 0.36); }, [-0.37, 1.05, -0.3], [0.37, 1.15, -0.24], hw), sphere(-0.36, 1.12, -0.27, 0.022, hw), sphere(0.36, 1.12, -0.27, 0.022, hw));
    for (const s of [-1, 1]) b.add(leaf((x, y, z) => Math.max(Math.hypot(x - s * 0.28 * 1.02, y - 0.68 - 0.02 * Math.sin((z + 0.25) * 6)) - 0.016, Math.abs(z + 0.02) - 0.24), [s * 0.29 - 0.05, 0.62, -0.28], [s * 0.29 + 0.05, 0.74, 0.24], hw));
    b.add(splat(0, 0.5, 1.08, -0.21, t => 0.13 + 0.025 * Math.sin(t * Math.PI), 0.015, 0.1, hw), boxAt(-0.28, 0.06, 0.18, 0.28, 0.1, 0.24, hw)); },
  "wassily-chair": b => { const ch = b.mat(FM.chrome), st = b.mat(FM.smoothLeather);
    const tube = (pts: [number, number, number][]) => { for (let i = 1; i < pts.length; i++) b.add(capsule(...pts[i - 1], ...pts[i], 0.012, ch)); };
    for (const s of [-1, 1]) { const x = s * 0.36; tube([[x, 0, 0.32], [x, 0, -0.32], [x, 0.38, -0.32], [x, 0.72, -0.25], [x, 0.38, -0.1], [x, 0.38, 0.3], [x, 0.6, 0.3], [x, 0.6, -0.2]]); }
    tube([[-0.36, 0, 0.32], [0.36, 0, 0.32]]); tube([[-0.36, 0.38, 0.3], [0.36, 0.38, 0.3]]);
    b.add(beam(-0.34, 0.42, 0.28, 0.34, 0.42, 0.28, 0.01, st), boxAt(-0.34, 0.36, -0.15, 0.34, 0.38, 0.28, st), beam(0, 0.45, -0.3, 0, 0.68, -0.25, 0.01, st), boxAt(-0.34, 0.44, -0.31, 0.34, 0.66, -0.28, st), boxAt(0.35, 0.5, -0.15, 0.37, 0.58, 0.26, st), boxAt(-0.37, 0.5, -0.15, -0.35, 0.58, 0.26, st)); },
  "lounge-chair": b => { const ply = b.mat(FM.teak), le = b.mat({ kind: "leather", colour: "#1e1a18", pattern: "diamond", unit: 0.22 }), al = b.mat(FM.chrome);
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; b.add(capsule(0, 0.08, 0, Math.cos(a) * 0.38, 0.03, Math.sin(a) * 0.38, 0.018, al)); } b.add(cylY(0, 0, 0.05, 0.3, 0.04, al));
    b.add(ellipsoid(0, 0.33, 0.05, 0.4, 0.08, 0.36, ply), ellipsoid(0, 0.4, 0.06, 0.36, 0.08, 0.32, le));
    b.add(cut(ellipsoid(0, 0.62, -0.28, 0.42, 0.3, 0.12, ply), [ellipsoid(0, 0.66, -0.2, 0.36, 0.26, 0.1, 0)]), ellipsoid(0, 0.63, -0.22, 0.34, 0.24, 0.08, le), ellipsoid(0, 0.86, -0.32, 0.3, 0.12, 0.08, le));
    for (const s of [-1, 1]) b.add(ellipsoid(s * 0.38, 0.52, 0.02, 0.06, 0.04, 0.24, ply), ellipsoid(s * 0.38, 0.56, 0.02, 0.06, 0.035, 0.22, le)); },
  "chesterfield": b => { const le = b.mat(FM.leather), wood = b.mat(FM.mahogany), t = findFurnitureType("chesterfield")!;
    b.add(boxAt(-t.w / 2 + 0.25, 0.12, -0.3, t.w / 2 - 0.25, 0.43, 0.45, le, 0, 0.05), boxAt(-t.w / 2 + 0.05, 0.12, -0.47, t.w / 2 - 0.05, t.h, -0.25, le, 0, 0.08));
    for (const s of [-1, 1]) b.add(boxAt(s * t.w / 2 - 0.25, 0.12, -0.47, s * t.w / 2, t.h - 0.05, 0.47, le, 0, 0.06), cylZ(s * (t.w / 2 - 0.13), t.h - 0.06, -0.47, 0.48, 0.13, le));
    for (const [x, z] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) b.add(turned(x * (t.w / 2 - 0.1), z * 0.38, 0, 0.12, 0.035, wood, "bulb")); },
  "floor-cushions": b => { const sil = b.mat({ kind: "fabric", colour: "#8a2a2a", colour2: "#c8902a" }), za = b.mat({ kind: "fabric", colour: "#2a3a5a", colour2: "#26344f" });
    b.add(boxAt(-0.3, 0, -0.3, 0.3, 0.1, 0.3, za, 0, 0.04), boxAt(0.45, 0, -0.25, 1.0, 0.12, 0.3, sil, 0, 0.05), ellipsoid(0.72, 0.22, -0.32, 0.26, 0.14, 0.1, sil), ellipsoid(-0.05, 0.2, -0.38, 0.24, 0.13, 0.09, za)); },
  "refectory-table": b => { const m = b.mat(FM.darkOak), t = findFurnitureType("refectory-table")!;
    b.add(boxAt(-t.w / 2, t.h - 0.06, -t.d / 2, t.w / 2, t.h, t.d / 2, m), boxAt(-t.w / 2 + 0.1, t.h - 0.16, -t.d / 2 + 0.06, t.w / 2 - 0.1, t.h - 0.06, t.d / 2 - 0.06, m));
    for (const x of [-t.w / 2 + 0.15, 0, t.w / 2 - 0.15]) for (const z of [-t.d / 2 + 0.1, t.d / 2 - 0.1]) b.add(turned(x, z, 0.1, t.h - 0.16, 0.05, m, "bulb"), boxAt(x - 0.05, 0, z - 0.05, x + 0.05, 0.12, z + 0.05, m));
    b.add(boxAt(-t.w / 2 + 0.15, 0.02, -t.d / 2 + 0.07, t.w / 2 - 0.15, 0.1, -t.d / 2 + 0.13, m), boxAt(-t.w / 2 + 0.15, 0.02, t.d / 2 - 0.13, t.w / 2 - 0.15, 0.1, t.d / 2 - 0.07, m)); },
  "gateleg-table": b => { const m = b.mat(FM.oak);
    b.add(leaf((x, y, z) => Math.max(Math.hypot(x / 0.65, z / 0.6) - 1, Math.abs(y - 0.7) - 0.02) * 0.6, [-0.66, 0.68, -0.61], [0.66, 0.72, 0.61], m));
    for (const [x, z] of [[-0.25, -0.35], [0.25, -0.35], [-0.25, 0.35], [0.25, 0.35], [0, -0.55], [0, 0.55]]) b.add(turned(x, z, 0.05, 0.68, 0.025, m, "bobbin"));
    b.add(boxAt(-0.27, 0, -0.37, 0.27, 0.06, -0.33, m), boxAt(-0.27, 0, 0.33, 0.27, 0.06, 0.37, m), boxAt(-0.02, 0.05, -0.56, 0.02, 0.1, 0.56, m)); },
  "altar-table": b => { const hw = b.mat(FM.huanghuali), t = findFurnitureType("altar-table")!;
    b.add(leaf((x, y, z) => { const ex = Math.abs(x) - (t.w / 2 - 0.08), lift = ex > 0 ? Math.min(0.06, ex * ex * 8) : 0; return Math.max(Math.abs(y - t.h + 0.025 - lift / 2) - 0.025 - lift / 2, Math.abs(x) - t.w / 2, Math.abs(z) - t.d / 2); }, [-t.w / 2, t.h - 0.06, -t.d / 2], [t.w / 2, t.h + 0.08, t.d / 2], hw));
    for (const s of [-1, 1]) { const x = s * (t.w / 2 - 0.3); for (const z of [-0.16, 0.16]) b.add(boxAt(x - 0.025, 0.05, z - 0.025, x + 0.025, t.h - 0.05, z + 0.025, hw)); b.add(boxAt(x - 0.05, 0, -0.2, x + 0.05, 0.05, 0.2, hw), cut(boxAt(x - 0.012, 0.15, -0.16, x + 0.012, 0.7, 0.16, hw), [opening(0, 0.25, 0.22, 0.25, "round", x - 0.1, x + 0.1, "x")])); }
    b.add(boxAt(-t.w / 2 + 0.28, t.h - 0.12, 0.17, t.w / 2 - 0.28, t.h - 0.05, 0.2, hw)); },
  "chabudai": b => { const lq = b.mat({ kind: "painted-wood", colour: "#4a2618", flake: 0.03 }); b.add(cylY(0, 0, 0.3, 0.33, 0.45, lq)); for (const [x, z] of [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]]) b.add(boxAt(x - 0.025, 0, z - 0.025, x + 0.025, 0.3, z + 0.025, lq)); },
  "pedestal-desk": b => { const mh = b.mat(FM.mahogany), le = b.mat({ kind: "leather", colour: "#2a4a32" }), br = b.mat(FM.brass), t = findFurnitureType("pedestal-desk")!;
    b.add(boxAt(-t.w / 2, t.h - 0.04, -t.d / 2, t.w / 2, t.h, t.d / 2, mh), boxAt(-t.w / 2 + 0.06, t.h - 0.002, -t.d / 2 + 0.06, t.w / 2 - 0.06, t.h + 0.002, t.d / 2 - 0.06, le));
    for (const s of [-1, 1]) { const x0 = s > 0 ? t.w / 2 - 0.45 : -t.w / 2, x1 = x0 + 0.45; b.add(boxAt(x0, 0.06, -t.d / 2 + 0.02, x1, t.h - 0.04, t.d / 2 - 0.02, mh), boxAt(x0 - 0.01, 0, -t.d / 2 + 0.01, x1 + 0.01, 0.06, t.d / 2 - 0.01, mh)); for (let k = 0; k < 3; k++) drawer(b, x0 + 0.03, 0.1 + k * 0.2, x1 - 0.03, 0.28 + k * 0.2, t.d / 2 - 0.02, mh, br, true); }
    drawer(b, -0.33, t.h - 0.16, 0.33, t.h - 0.05, t.d / 2 - 0.02, mh, br, true); },
  "sideboard": b => { const tk = b.mat(FM.teak), t = findFurnitureType("sideboard")!;
    b.add(boxAt(-t.w / 2, 0.22, -t.d / 2, t.w / 2, t.h, t.d / 2, tk, 0, 0.01));
    for (const [x, z] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) b.add(capsule(x * (t.w / 2 - 0.12), 0, z * (t.d / 2 - 0.06), x * (t.w / 2 - 0.1), 0.23, z * (t.d / 2 - 0.08), 0.014, tk));
    for (let k = 0; k < 4; k++) b.add(boxAt(-t.w / 2 + 0.03 + k * 0.435, 0.25, t.d / 2, -t.w / 2 + 0.43 + k * 0.435, t.h - 0.03, t.d / 2 + 0.008, tk), boxAt(-t.w / 2 + 0.2 + k * 0.435, 0.45, t.d / 2, -t.w / 2 + 0.26 + k * 0.435, 0.55, t.d / 2 + 0.02, tk)); },
  "welsh-dresser": b => { const oak = b.mat(FM.oak), pl = b.mat({ kind: "jars", colour: "#e8e2d6", course: 0.3 }), br = b.mat(FM.brass);
    b.add(boxAt(-0.8, 0, -0.25, 0.8, 0.85, 0.25, oak), boxAt(-0.82, 0.85, -0.27, 0.82, 0.9, 0.27, oak)); for (const x of [-0.4, 0.4]) drawer(b, x - 0.37, 0.5, x + 0.37, 0.8, 0.25, oak, br); for (const x of [-0.4, 0.4]) b.add(boxAt(x - 0.37, 0.06, 0.25, x + 0.37, 0.47, 0.262, oak));
    b.add(boxAt(-0.78, 0.9, -0.24, 0.78, 2.0, -0.2, oak), boxAt(-0.8, 0.9, -0.24, -0.74, 2.0, 0.0, oak), boxAt(0.74, 0.9, -0.24, 0.8, 2.0, 0.0, oak), boxAt(-0.82, 1.95, -0.26, 0.82, 2.05, 0.04, oak));
    for (const y of [1.2, 1.5, 1.78]) b.add(boxAt(-0.74, y, -0.2, 0.74, y + 0.02, -0.02, oak));
    for (const [y, n] of [[1.22, 4], [1.52, 4], [1.8, 5]] as const) b.add(repeatX(cylZ(-0.6, y + 0.12, -0.17, -0.155, 0.11, pl), 1.2 / (n - 1), n)); },
  "bookcase": b => { const mh = b.mat(FM.mahogany), bk = b.mat({ kind: "books", course: 0.32 });
    b.add(boxAt(-0.8, 0, -0.18, 0.8, 0.12, 0.18, mh), boxAt(-0.82, 2.3, -0.2, 0.82, 2.42, 0.2, mh), boxAt(-0.8, 0.12, -0.17, -0.76, 2.3, 0.17, mh), boxAt(0.76, 0.12, -0.17, 0.8, 2.3, 0.17, mh), boxAt(-0.76, 0.12, -0.17, 0.76, 2.3, -0.14, mh), boxAt(-0.76, 0.12, -0.14, 0.76, 2.28, 0.1, bk)); },
  "tansu": b => { const kw = b.mat(FM.keyaki), ir = b.mat({ kind: "iron", colour: "#1a1816", age: 0.2 }); const steps = 4, W = 1.8, D = 0.45, H = 1.8, sw = W / steps;
    for (let k = 0; k < steps; k++) { const x0 = -W / 2 + k * sw, h = H * (steps - k) / steps; b.add(boxAt(x0, 0, -D / 2, x0 + sw, h, D / 2, kw)); const n = steps - k; for (let j = 0; j < n; j++) { const y0 = j * (h / n); if ((k + j) % 3 === 2) { b.add(boxAt(x0 + 0.02, y0 + 0.02, D / 2, x0 + sw - 0.02, y0 + h / n - 0.02, D / 2 + 0.01, kw), boxAt(x0 + sw / 2 - 0.004, y0 + 0.03, D / 2 + 0.01, x0 + sw / 2 + 0.004, y0 + h / n - 0.03, D / 2 + 0.014, ir)); } else drawer(b, x0 + 0.02, y0 + 0.02, x0 + sw - 0.02, y0 + h / n - 0.02, D / 2, kw, ir, true); }
      b.add(boxAt(x0 + sw / 2 - 0.05, h - 0.22, D / 2 + 0.012, x0 + sw / 2 + 0.05, h - 0.12, D / 2 + 0.016, ir)); } },
  "round-corner-cabinet": b => { const hw = b.mat(FM.huanghuali), br = b.mat({ kind: "brass", colour: "#d6c69a" });
    b.add(leaf((x, y, z) => { const t = y / 1.8, hw2 = 0.45 - 0.04 * t; return Math.max(Math.abs(x) - hw2, Math.abs(z) - 0.25, -y, y - 1.8) ; }, [-0.46, 0, -0.26], [0.46, 1.8, 0.26], hw), boxAt(-0.49, 1.78, -0.28, 0.49, 1.86, 0.28, hw, 0, 0.03));
    for (const s of [-1, 1]) b.add(boxAt(s > 0 ? 0.01 : -0.42, 0.15, 0.25, s > 0 ? 0.42 : -0.01, 1.7, 0.262, hw));
    b.add(boxAt(-0.07, 0.95, 0.262, 0.07, 1.2, 0.266, br), cylZ(-0.03, 1.02, 0.266, 0.29, 0.012, br), cylZ(0.03, 1.02, 0.266, 0.29, 0.012, br)); },
  "blanket-chest": b => { const oak = b.mat(FM.darkOak), ir = b.mat({ kind: "iron", age: 0.6 });
    b.add(boxAt(-0.6, 0.08, -0.27, 0.6, 0.6, 0.27, oak), boxAt(-0.63, 0.6, -0.3, 0.63, 0.66, 0.3, oak), boxAt(-0.62, 0, -0.29, 0.62, 0.08, 0.29, oak));
    for (const x of [-0.42, 0, 0.42]) b.add(boxAt(x - 0.035, 0.1, 0.27, x + 0.035, 0.66, 0.282, ir), boxAt(x - 0.035, 0.64, -0.3, x + 0.035, 0.67, 0.3, ir)); b.add(boxAt(-0.05, 0.42, 0.282, 0.05, 0.6, 0.29, ir)); },
  "four-poster": b => { const oak = b.mat(FM.darkOak), wool = b.mat({ kind: "fabric", colour: "#5a2a2a", colour2: "#4e2424" }), lin = b.mat(FM.cotton), t = findFurnitureType("four-poster")!;
    for (const [x, z] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) b.add(turned(x * t.w / 2, z * t.d / 2, 0, t.h, 0.06, oak, "vase"));
    b.add(boxAt(-t.w / 2 - 0.08, t.h, -t.d / 2 - 0.08, t.w / 2 + 0.08, t.h + 0.2, t.d / 2 + 0.08, oak), boxAt(-t.w / 2, 0.25, -t.d / 2, t.w / 2, 0.4, t.d / 2, oak), boxAt(-t.w / 2 + 0.05, 0.4, -t.d / 2 + 0.05, t.w / 2 - 0.05, 0.62, t.d / 2 - 0.05, lin, 0, 0.06), boxAt(-t.w / 2, 0.25, -t.d / 2 - 0.06, t.w / 2, 1.4, -t.d / 2, oak));
    for (const s of [-1, 1]) b.add(leaf((x, y, z) => { const fold = 0.04 * Math.sin(z * 26); return Math.max(Math.abs(x - s * (t.w / 2 + 0.04) - fold) - 0.02, y - t.h, 0.3 - y, Math.abs(z) - t.d / 2) * 0.7; }, [s * (t.w / 2 + 0.04) - 0.08, 0.3, -t.d / 2], [s * (t.w / 2 + 0.04) + 0.08, t.h, t.d / 2], wool));
    b.add(leaf((x, y, z) => { const fold = 0.03 * Math.sin(x * 30); return Math.max(Math.abs(z + t.d / 2 + 0.04 - fold) - 0.02, y - t.h, 0.3 - y, Math.abs(x) - t.w / 2) * 0.7; }, [-t.w / 2, 0.3, -t.d / 2 - 0.1], [t.w / 2, t.h, -t.d / 2 + 0.02], wool)); },
  "futon": b => { const mat = b.mat({ kind: "tatami-mat" }), co = b.mat({ kind: "fabric", colour: "#e9e2d2", colour2: "#e2dac8" }), quilt = b.mat({ kind: "fabric", colour: "#2a3a6a", colour2: "#e6dcc4" });
    b.add(boxAt(-0.95, 0, -1.0, 0.95, 0.05, 1.0, mat), boxAt(-0.5, 0.05, -1.0, 0.5, 0.13, 1.0, co, 0, 0.04), boxAt(-0.55, 0.13, -0.6, 0.55, 0.2, 1.0, quilt, 0, 0.05), ellipsoid(0, 0.18, -0.82, 0.25, 0.06, 0.13, co)); },
  "chandelier": b => { const br = b.mat(FM.brass), cd = b.mat(FM.candle), fl = b.mat(FM.flame);
    b.add(revolve(0, 0, 0.0, 0.9, t => 0.03 + 0.12 * Math.exp(-((t - 0.12) ** 2) / 0.006) + 0.05 * Math.exp(-((t - 0.5) ** 2) / 0.003) + 0.04 * Math.exp(-((t - 0.75) ** 2) / 0.002), 0.16, br, 0, 4), sphere(0, 0.12, 0, 0.13, br), cylY(0, 0, 0.9, 1.2, 0.008, br));
    b.add(repeatAround(leaf((x, y, z) => { const t = (x - 0.05) / 0.38, yc = 0.32 + 0.12 * Math.sin(t * Math.PI * 1.3) - 0.08 * t; return Math.max(Math.hypot(y - yc, z) - 0.012, -t, t - 1); }, [0.03, 0.15, -0.03], [0.45, 0.5, 0.03], br), 0, 0, 6, 0.46));
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2, x = Math.cos(a) * 0.43, z = Math.sin(a) * 0.43; b.add(cylY(x, z, 0.3, 0.33, 0.05, br), cylY(x, z, 0.33, 0.48, 0.016, cd), ellipsoid(x, 0.51, z, 0.01, 0.025, 0.01, fl)); b.light({ x, y: 0.52, z, kelvin: 1850, power: 0.04 }); } },
  "tiffany-lamp": b => { const bz = b.mat({ kind: "brass", colour: "#5a4428" }), sh = b.mat({ kind: "stained", emit: 1.4 });
    b.add(revolve(0, 0, 0, 0.42, t => 0.03 + 0.1 * Math.exp(-(t * t) / 0.01) + 0.012 * Math.sin(t * 30), 0.13, bz, 0, 3));
    b.add(cut(dome(0, 0.36, 0, 0.24, 0.2, sh), [dome(0, 0.36, 0, 0.225, 0.185, 0)]), cylY(0, 0, 0.6, 0.62, 0.03, bz)); b.light({ x: 0, y: 0.4, z: 0, kelvin: 2400, power: 0.2 }); },
  "longcase-clock": b => { const oak = b.mat(FM.mahogany), br = b.mat(FM.brass), face = b.mat({ kind: "plain", colour: "#efe6cf" });
    b.add(boxAt(-0.25, 0, -0.14, 0.25, 0.35, 0.14, oak), boxAt(-0.19, 0.35, -0.11, 0.19, 1.5, 0.11, oak), boxAt(-0.26, 1.5, -0.14, 0.26, 2.0, 0.15, oak), boxAt(-0.28, 2.0, -0.16, 0.28, 2.06, 0.17, oak));
    b.add(cylZ(0, 1.75, 0.15, 0.16, 0.17, br), cylZ(0, 1.75, 0.16, 0.165, 0.14, face), beam(0, 1.75, 0.168, 0.07, 1.82, 0.168, 0.008, b.mat(FM.iron)), beam(0, 1.75, 0.17, -0.02, 1.86, 0.17, 0.006, b.mat(FM.iron)), boxAt(-0.13, 0.5, 0.11, 0.13, 1.35, 0.12, oak), cylY(-0.22, 0.12, 2.06, 2.18, 0.03, br), cylY(0.22, 0.12, 2.06, 2.18, 0.03, br), sphere(0, 2.14, 0.14, 0.05, br)); },
  "fireplace": b => { const mar = b.mat({ kind: "marble", colour: "#ebe5da" }), ir = b.mat(FM.iron), fire = b.mat({ kind: "fire", emit: 4 });
    b.add(cut(boxAt(-0.9, 0, -0.35, 0.9, 1.25, 0.0, mar), [boxAt(-0.5, 0, -0.5, 0.5, 0.85, 0.2, 0)]), boxAt(-0.98, 1.25, -0.4, 0.98, 1.32, 0.12, mar), boxAt(-0.5, 0, -0.35, 0.5, 0.85, -0.3, b.mat({ kind: "brick", colour: "#3a2a22", soot: 0.9 })), boxAt(-1.0, 0, 0.0, 1.0, 0.04, 0.45, mar));
    b.add(boxAt(-0.3, 0.12, -0.25, 0.3, 0.16, -0.05, ir), repeatX(boxAt(-0.28, 0.16, -0.06, -0.26, 0.35, -0.04, ir), 0.08, 8), ellipsoid(0, 0.25, -0.17, 0.22, 0.1, 0.1, fire)); b.light({ x: 0, y: 0.35, z: 0.1, kelvin: 1700, power: 0.5 }); },
  "tiled-stove": b => { const tl = b.mat(FM.tiles), cr = b.mat({ kind: "plain", colour: "#efe8d8" }), oak = b.mat(FM.pine);
    b.add(boxAt(-0.6, 0.35, -0.4, 0.6, 1.5, 0.4, tl, 0, 0.02), boxAt(-0.66, 1.5, -0.46, 0.66, 1.62, 0.46, cr), boxAt(-0.45, 1.62, -0.3, 0.45, 2.15, 0.3, tl, 0, 0.02), boxAt(-0.5, 2.15, -0.35, 0.5, 2.25, 0.35, cr), boxAt(-0.62, 0, -0.42, 0.62, 0.35, 0.42, cr));
    b.add(boxAt(-1.2, 0.42, 0.42, 1.2, 0.47, 0.8, oak), boxAt(-1.2, 0, 0.45, -1.1, 0.42, 0.75, oak), boxAt(1.1, 0, 0.45, 1.2, 0.42, 0.75, oak)); },
  "folding-screen": b => { const lq = b.mat({ kind: "painted-wood", colour: "#2a1614", flake: 0.02 }), pane = b.mat({ kind: "plain", colour: "#e7dcc0" }), n = 4, pw = 0.6;
    for (let i = 0; i < n; i++) { const a = (i % 2 ? 1 : -1) * 0.35, x0 = -n * pw * 0.45 + i * pw * 0.92, c = Math.cos(a), s = Math.sin(a); const panel = (x: number, y: number, z: number) => { const lx = (x - x0) * c + z * s, lz = -(x - x0) * s + z * c; return [lx, y, lz] as const; };
      b.add(leaf((x, y, z) => { const [lx, ly, lz] = panel(x, y, z); return Math.max(Math.abs(lx - pw / 2) - pw / 2, Math.abs(ly - 0.85) - 0.85, Math.abs(lz) - 0.02); }, [x0 - 0.1, 0, -0.4], [x0 + pw + 0.1, 1.7, 0.4], lq));
      b.add(leaf((x, y, z) => { const [lx, ly, lz] = panel(x, y, z); return Math.max(Math.abs(lx - pw / 2) - pw / 2 + 0.05, Math.abs(ly - 0.95) - 0.65, Math.abs(lz) - 0.025); }, [x0 - 0.1, 0.3, -0.4], [x0 + pw + 0.1, 1.6, 0.4], pane)); } },
};
/** Chairs on cabriole legs: a slip seat, a splat whose width follows `splatW(t)` (pierced `pierce` times), a shaped crest rail. */
function chairWithCabriole(b: SceneBuilder, wood: SurfaceSpec, foot: "pad" | "claw", splatW: (t: number) => number, pierce: number) {
  const w = b.mat(wood), seat = b.mat({ kind: "velvet", colour: foot === "claw" ? "#6a2a22" : "#3a4a3a" });
  b.add(boxAt(-0.25, 0.34, -0.21, 0.25, 0.42, 0.23, w), boxAt(-0.23, 0.42, -0.19, 0.23, 0.46, 0.22, seat, 0, 0.02));
  for (const s of [-1, 1]) b.add(cabriole(s * 0.22, 0.2, 0.36, 0.028, [s * 0.5, 0.86], w, foot), capsule(s * 0.2, 0, -0.2, s * 0.21, 0.36, -0.18, 0.02, w), capsule(s * 0.21, 0.4, -0.19, s * 0.19, 1.0, -0.27, 0.02, w));
  b.add(splat(0, 0.44, 0.94, -0.2, splatW, 0.018, 0.12, w, pierce));
  b.add(leaf((x, y, z) => { const yc = 0.98 + 0.03 * Math.cos(x * 9) + 0.015 * Math.cos(x * 22); return Math.max(Math.hypot(y - yc, (z + 0.27) * 2) - 0.03, Math.abs(x) - 0.25); }, [-0.26, 0.92, -0.32], [0.26, 1.04, -0.22], w));
}

/** Build one furniture type into the builder (local metres, front toward +z, on the floor). */
export function buildFurniture(b: SceneBuilder, id: string) {
  const f = B[id];
  if (!f) throw new Error(`No construction for furniture ${id}`);
  f(b);
}
/** The furniture types that have a construction. */
export const BUILT_FURNITURE = Object.keys(B);
