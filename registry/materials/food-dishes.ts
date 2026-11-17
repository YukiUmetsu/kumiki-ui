/**
 * FOOD1 still-life kit, cooked food: breads and pastries, cakes and sweets, bowls of broth and stew, plated mains,
 * dumplings, sushi, skewers, piles of grain and spice, jars and drinks. Builders return parts sized in mm and placed
 * on a vessel's floor; the cooking physics (`food-physics.ts`) colours steak slices, boiled eggs and toast.
 */
import { fbm, fbm3, worley, worley3 } from "../anatomy/foundation-raster";
import { blade, box, displace, ellipsoid, lathe, merge, paramSurface, reseed, rng, slab, sweep, transform, warp } from "./food-mesh";
import type { Mesh, Placement, V3 } from "./food-mesh";
import { cookEgg, cookSteak, crustColour, eggColours, meatColour, toastBrowning } from "./food-physics";
import type { Part, SurfaceFn } from "./food-scene";
import { liquidIn, mound, profile } from "./food-stage";
import type { Vessel } from "./food-stage";
import { C, chocolate, clamp01, cream, crumb, crust, crystal, fishFlesh, fishSkin, fried, fromSolid, froth, glazeMeat, grains, laminated, layered, leaf, mixInto, noodle, nori, powder, rawMeat, rawPoultry, riceSurface, roastSkin, scaleInto, seared, setMix, smooth, sponge, sst, syrup } from "./food-surfaces";
import { batterSolid, crustColour as crustTex, flatbreadSolid, injeraSolid } from "./food-textures";
import { grainCoat, grouped, leafMesh, part, sprinkle, surfaceScatter } from "./food-kit";

// ---- Outlines --------------------------------------------------------------------------------------------------------------------

/** A polygon (x, z points, star-shaped about its centroid) as a slab outline, and the centroid it is centred on. */
export function polyOutline(poly: readonly (readonly [number, number])[]): { outline: (t: number) => number; centre: [number, number] } {
  let cx = 0, cz = 0;
  for (const p of poly) { cx += p[0]; cz += p[1]; }
  cx /= poly.length; cz /= poly.length;
  const P = poly.map(p => [p[0] - cx, p[1] - cz]);
  return {
    centre: [cx, cz],
    outline: t => {
      const dx = Math.cos(t), dz = Math.sin(t);
      let best = 0;
      for (let i = 0; i < P.length; i++) {
        const a = P[i], b = P[(i + 1) % P.length], ex = b[0] - a[0], ez = b[1] - a[1], den = dx * ez - dz * ex;
        if (Math.abs(den) < 1e-9) continue;
        const s = (a[0] * ez - a[1] * ex) / den, u = (a[0] * dz - a[1] * dx) / den;
        if (s > 0 && u >= -1e-6 && u <= 1 + 1e-6) best = Math.max(best, s);
      }
      return best;
    },
  };
}
const rect = (w: number, d: number): [number, number][] => [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]];
const sector = (R: number, deg: number, n = 24): [number, number][] => { const a = (deg * Math.PI) / 180, pts: [number, number][] = [[0, 0]]; for (let i = 0; i <= n; i++) { const t = -a / 2 + (a * i) / n; pts.push([Math.cos(t) * R, Math.sin(t) * R]); } return pts; };
export { sector };

/** Lowest point of a mesh moved to `y`. */
function seat(m: Mesh, y: number): Mesh { let minY = Infinity; for (let i = 1; i < m.pos.length; i += 3) minY = Math.min(minY, m.pos[i]); for (let i = 1; i < m.pos.length; i += 3) m.pos[i] += y - minY; return m; }
export { seat };

// ---- Breads ------------------------------------------------------------------------------------------------------------------------

export type ScorePattern = "cross" | "ear" | "square" | "wheat" | "none";
/** A round loaf (boule) of radius R and height H: domed, floured in the scores, an ear lifting along one cut. */
export function boule(R: number, H: number, sp: { bake?: number; flour?: number; blisters?: number; score?: ScorePattern; seeds?: "sesame" | "poppy" | "salt" | "nigella" | "none"; dough?: string; at?: V3; seed?: number; turn?: number } = {}): Part[] {
  const seed = sp.seed ?? 1, sc = sp.score ?? "cross";
  const scoreAt = (p: V3): number => {
    if (sc === "none" || p[1] < H * 0.45) return 0;
    const x = p[0], z = p[2], w = R * 0.07;
    if (sc === "cross") return Math.max(1 - sst(0, w, Math.abs(x + Math.sin(z / 30) * 2)), 1 - sst(0, w, Math.abs(z + Math.sin(x / 30) * 2))) * sst(H * 0.45, H * 0.7, p[1]);
    if (sc === "square") { const s = R * 0.42; return Math.max(...[x - s, x + s, z - s, z + s].map((d, i) => (1 - sst(0, w * 0.8, Math.abs(d))) * (Math.abs(i < 2 ? z : x) < s * 1.15 ? 1 : 0))) * sst(H * 0.4, H * 0.6, p[1]); }
    if (sc === "wheat") { let v = 0; for (let k = -3; k <= 3; k++) { const zz = z - k * R * 0.2, d = Math.abs(zz - Math.abs(x) * 0.5); v = Math.max(v, (1 - sst(0, w * 0.6, d)) * (Math.abs(x) < R * 0.35 ? 1 : 0)); } return v * sst(H * 0.5, H * 0.7, p[1]); }
    return (1 - sst(0, w * 1.3, Math.abs(z - x * 0.25 - R * 0.05))) * (Math.abs(x) < R * 0.75 ? 1 : 0) * sst(H * 0.4, H * 0.7, p[1]);
  };
  let m = lathe(profile([[0, 0], [R * 0.7, 0], [R * 0.92, H * 0.08], [R, H * 0.3], [R * 0.93, H * 0.62], [R * 0.68, H * 0.9], [R * 0.32, H], [0, H * 1.01]]), { nu: 120, nv: 64, modulate: th => 1 + 0.025 * Math.sin(th * 3 + seed) });
  // the scores open: a groove, its lip raised and curling (the ear)
  m = displace(m, (o, _p, n) => { if (n[1] < 0.1) return 0; const s = scoreAt(o); const lip = sc === "ear" ? sst(0, R * 0.12, o[2] - o[0] * 0.25 - R * 0.05) * (1 - sst(R * 0.12, R * 0.22, o[2] - o[0] * 0.25 - R * 0.05)) * (Math.abs(o[0]) < R * 0.7 ? 1 : 0) : 0; return -s * H * 0.08 + lip * H * 0.07 + fbm3(seed, o[0] / 25, o[1] / 25, o[2] / 25, 3) * 1.5; });
  return [part("loaf", transform(m, { ry: sp.turn ?? 0, at: sp.at ?? [0, 0, 0] }), crust({ bake: sp.bake ?? 0.62, flour: sp.flour ?? 0.6, blisters: sp.blisters ?? 0.4, score: scoreAt, seeds: sp.seeds, dough: sp.dough, seed }))];
}

/** A long loaf (baguette, bâtard, ficelle): a flattened sweep with slanted scores, each opening into an ear. */
export function longLoaf(len: number, R: number, sp: { bake?: number; scores?: number; flour?: number; seeds?: "sesame" | "poppy" | "salt" | "nigella" | "none"; at?: V3; turn?: number; seed?: number; blisters?: number; shine?: number; dough?: string; flat?: number } = {}): Part[] {
  const seed = sp.seed ?? 1, n = sp.scores ?? 5, flat = sp.flat ?? 0.82;
  const scoreAt = (p: V3) => {
    if (!n || p[1] < R * flat * 1.1) return 0;
    const t = (p[0] + len / 2) / len, k = t * (n + 0.6) - 0.3, f = k - Math.floor(k), ok = k > 0.15 && k < n + 0.15;
    return ok ? (1 - sst(0, 0.16, Math.abs(f - 0.5 + (p[2] / R) * 0.35))) * (1 - sst(R * 0.5, R * 0.75, Math.abs(p[2]))) : 0;
  };
  let m = sweep([[-len / 2, R * flat, 0], [0, R * flat + 1, 2], [len / 2, R * flat, 0]], { radius: t => R * Math.pow(Math.sin(Math.PI * Math.min(1, t * 0.98 + 0.01)), 0.18), flatten: 1, nu: 36, nv: 90 });
  m = warp(m, p => [p[0], p[1] < R * flat * 0.5 ? R * flat * 0.5 - (R * flat * 0.5 - p[1]) * 0.35 : p[1], p[2]]);
  m = seat(displace(m, (o, _p, nn) => (nn[1] > 0.2 ? -scoreAt(o) * R * 0.18 : 0) + fbm3(seed, o[0] / 20, o[1] / 20, o[2] / 20, 2) * 1.2), 0);
  return [part("loaf", transform(m, { ry: sp.turn ?? 0, at: sp.at ?? [0, 0, 0] }), crust({ bake: sp.bake ?? 0.6, flour: sp.flour ?? 0.15, blisters: sp.blisters ?? 0.5, score: scoreAt, seeds: sp.seeds, seed, shine: sp.shine, dough: sp.dough }))];
}

/** A slice of bread lying flat: crumb on top (open or tight), the crust round its edge, toast-browned by seconds. */
export function breadSlice(w: number, hgt: number, th: number, sp: { open?: number; colour?: string; crust?: string; toast?: number; at?: V3; turn?: number; tilt?: number; dome?: number; seed?: number; swirl?: string } = {}): Part[] {
  const seed = sp.seed ?? 1, dome = sp.dome ?? 0.35;
  const outline = (t: number) => { const c = Math.cos(t), s = Math.sin(t); const a = w / 2, b = hgt / 2, p = s < 0 ? 2.2 : 4.5; return 1 / Math.pow(Math.pow(Math.abs(c) / a, p) + Math.pow(Math.abs(s) / (b * (s < 0 ? 1 + dome : 1)), p), 1 / p); };
  const m = slab({ outline, top: () => th, bevel: 1.2, nu: 96, nv: 30 });
  const b = sp.toast !== undefined ? toastBrowning(sp.toast) : 0, crumbC = sp.toast !== undefined ? crustColourHex(b * 0.9, sp.colour ?? "#ecd9b2") : sp.colour;
  const surf = crumb({ open: sp.open ?? 0.5, colour: crumbC, crustColour: sp.crust ?? "#6e3d1d", crustWidth: 3, outline: p => outline(Math.atan2(p[2], p[0])) - Math.hypot(p[0], p[2]), seed, swirl: sp.swirl });
  return [part("slice", transform(m, { rx: sp.tilt ?? 0, ry: sp.turn ?? 0, at: sp.at ?? [0, 0, 0] }), surf)];
}
const crustColourHex = (b: number, base: string) => { const c = crustColour(b, C(base)); return `#${c.map(v => Math.round(Math.min(1, Math.pow(Math.max(0, v), 1 / 2.2)) * 255).toString(16).padStart(2, "0")).join("")}`; };

/** A ring (bagel, doughnut): a torus of ring radius Rr and tube radius r, flattened underneath. */
export function ring(Rr: number, r: number, surface: SurfaceFn, at: V3 = [0, 0, 0], name = "ring", squash = 0.78): Part {
  const pts: V3[] = Array.from({ length: 12 }, (_, i) => [Math.cos((i / 12) * Math.PI * 2) * Rr, r * squash, Math.sin((i / 12) * Math.PI * 2) * Rr]);
  const m = sweep(pts, { radius: () => r, flatten: 1, closed: true, nu: 28, nv: 64, up: [0, 1, 0] });
  return part(name, seat(transform(warp(m, p => [p[0], p[1] * squash + r * (1 - squash) * 0.2, p[2]]), { at }), at[1]), surface);
}
/** A pretzel: a knot of rope, salted, lye-dark and glossy. */
export function pretzel(size: number, at: V3 = [0, 0, 0], seed = 1): Part {
  const s = size / 2, pts: V3[] = [[0, 6, s * 0.95], [s * 0.75, 6, s * 0.75], [s, 6, 0], [s * 0.7, 6, -s * 0.55], [s * 0.15, 8, -s * 0.15], [-s * 0.25, 10, s * 0.45], [-s * 0.05, 7, s * 0.6], [s * 0.25, 10, s * 0.45], [-s * 0.15, 8, -s * 0.15], [-s * 0.7, 6, -s * 0.55], [-s, 6, 0], [-s * 0.75, 6, s * 0.75]];
  const m = sweep(pts, { radius: t => s * 0.16 * (0.75 + 0.35 * Math.sin(t * Math.PI * 2 - 1.2) ** 2), closed: true, nu: 20, nv: 120 });
  return part("pretzel", seat(transform(m, { at }), at[1]), crust({ bake: 0.92, dough: "#b06a32", shine: 0.7, seeds: "salt", blisters: 0, seed }));
}
/** A crescent of laminated pastry (croissant): rolled layers bulging in steps along an arc. */
export function croissant(len: number, R: number, at: V3 = [0, 0, 0], turn = 0, seed = 1, bake = 0.6): Part {
  const curve: V3[] = [[-len / 2, R * 0.45, len * 0.18], [-len * 0.3, R * 0.85, -len * 0.02], [0, R, -len * 0.1], [len * 0.3, R * 0.85, -len * 0.02], [len / 2, R * 0.45, len * 0.18]];
  const steps = 7, m = sweep(curve, { radius: (t, th) => R * Math.pow(Math.sin(Math.PI * Math.min(1, t * 0.96 + 0.02)), 0.75) * (0.86 + 0.14 * Math.pow(Math.abs(Math.sin(t * steps * Math.PI)), 0.5)) * (1 - 0.04 * Math.sin(th * 2)), flatten: 0.78, nu: 30, nv: 110 });
  return part("croissant", seat(transform(m, { ry: turn, at }), at[1]), laminated({ bake, shine: 0.7, seed }));
}
/** A flatbread (naan, pita, tortilla, injera, focaccia, lavash): an irregular disc, bubbled or dimpled, charred spots. */
export function flatbread(kind: "naan" | "pita" | "tortilla" | "injera" | "focaccia" | "lavash" | "chapati" | "pancake" | "crepe", size: number, at: V3 = [0, 0, 0], seed = 1, turn = 0): Part[] {
  const r = rng(seed), long = kind === "naan" ? 1.45 : kind === "focaccia" ? 1.3 : 1, th = kind === "focaccia" ? 28 : kind === "injera" ? 6 : kind === "naan" ? 9 : kind === "pita" ? 11 : kind === "pancake" ? 10 : 2.5;
  const outline = (t: number) => { const c = Math.cos(t), s = Math.sin(t); const base = 1 / Math.hypot(c / long, s); return (size / 2) * base * (1 + 0.04 * Math.sin(t * 3 + r() * 0) + 0.025 * Math.sin(t * 7 + seed)) * (kind === "naan" ? 1 - 0.18 * Math.max(0, c) * Math.max(0, c) : 1); };
  // naan puffs in fewer, bigger bubbles than pita or chapati
  const bubbleMm = kind === "naan" ? 21 : 9, bubbleCut = kind === "naan" ? 0.7 : 0.45;
  const top = (x: number, z: number) => {
    const rr = Math.hypot(x / long, z) / (size / 2), base = th * (kind === "pita" ? 0.9 + 0.3 * (1 - rr * rr) : kind === "pancake" ? 0.85 + 0.15 * (1 - rr ** 4) : 1 - 0.25 * rr ** 3);
    if (kind === "naan" || kind === "pita" || kind === "chapati") { const d = worley(seed, x / bubbleMm, z / bubbleMm, 1); return base + Math.sqrt(Math.max(0, 1 - Math.min(1, d.f1 / (0.35 + 0.25 * d.id)))) * (kind === "naan" ? 6 : 2.5) * (d.id > bubbleCut ? 1 : 0.15); }
    if (kind === "focaccia") { const d = worley(seed, x / 13, z / 13, 0.6); return base - (1 - sst(0.05, 0.28, d.f1)) * 5 + fbm(seed + 3, x / 30, z / 30, 2) * 2; }
    return base + fbm(seed, x / 25, z / 25, 3) * 0.6;
  };
  const m = slab({ outline, top, bevel: Math.min(th * 0.45, 5), nu: 120, nv: 56 });
  const pl: Placement = { ry: turn, at };
  if (kind === "injera") return [part("injera", transform(m, pl), fromSolid(injeraSolid(seed), { coat: 0.1, coatRough: 0.3 }))];
  if (kind === "focaccia") {
    // golden crust on the high ground; olive oil pooled glossy in each finger dimple (the same pattern as the dimples)
    const fsurf: SurfaceFn = (s, o) => {
      crust({ bake: 0.52, blisters: 0.3, seed, dough: "#e8cf8e" })(s, o);
      const d = worley(seed, s.o[0] / 13, s.o[2] / 13, 0.6), pool = 1 - sst(0.04, 0.2, d.f1), film = sst(0.1, 0.6, fbm3(seed + 9, s.o[0] / 9, s.o[1] / 9, s.o[2] / 9, 3));
      mixInto(o.albedo, C("#b8781e"), pool * 0.45 + film * 0.15); o.coat = Math.max(o.coat, Math.max(pool, film * 0.7)); o.coatRough = 0.03; o.rough = Math.min(o.rough, 0.6 - pool * 0.4); o.height *= 1 - pool * 0.8;
    };
    const out = [part("focaccia", transform(m, pl), fsurf)];
    const rose: Mesh[] = [];
    for (let i = 0; i < 16; i++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()) * size * 0.4, x = Math.cos(a) * d * long, z = Math.sin(a) * d; rose.push(transform(leafMesh(16, 0.12, 0.05, seed + i, "lance"), { ry: r() * 360, at: [x, top(x, z) + 0.6, z] })); }
    out.push(part("rosemary", transform(merge(rose), pl), leaf("#3f5434", { veins: 1, gloss: 0.5 })));
    out.push(part("salt", transform(sprinkle("salt-flakes", 30, size * 0.4, top, seed + 2), pl), crystal()));
    return out;
  }
  if (kind === "pancake" || kind === "crepe") return [part(kind, transform(m, pl), crust({ bake: kind === "pancake" ? 0.48 : 0.42, blisters: 0, seed, dough: "#f0d9a0" }))];
  // leopard-charred dough (MATL1 flatbread), the bubbles' tops scorched hardest; naan glossed with ghee
  const fb = flatbreadSolid({ dough: kind === "tortilla" ? "#ead6a0" : "#e8d0a0", char: kind === "naan" ? 0.75 : kind === "chapati" ? 0.6 : kind === "tortilla" ? 0.45 : 0.32, toast: kind === "naan" ? 0.4 : kind === "pita" ? 0.22 : 0.26, flour: kind === "tortilla" ? 0.35 : 0.2, seed });
  const charred: SurfaceFn = (s, o) => {
    const t = fb(s.o[0], s.o[1], s.o[2]);
    o.albedo[0] = t.a[0]; o.albedo[1] = t.a[1]; o.albedo[2] = t.a[2]; o.height = t.h; o.rough = t.r; o.spec = 0.035; o.mfp[0] = 0.8; o.mfp[1] = 0.6; o.mfp[2] = 0.3;
    if (kind === "naan" || kind === "pita" || kind === "chapati") {
      const d = worley(seed, s.o[0] / bubbleMm, s.o[2] / bubbleMm, 1), bub = Math.sqrt(Math.max(0, 1 - Math.min(1, d.f1 / (0.35 + 0.25 * d.id)))) * (d.id > bubbleCut ? 1 : 0.15);
      mixInto(o.albedo, crustTex(0.62, C("#e8d0a0")), sst(0.3, 0.8, bub) * 0.6); mixInto(o.albedo, [0.03, 0.018, 0.01], sst(0.75, 0.98, bub) * (kind === "naan" ? 0.85 : 0.5));
    }
    if (kind === "naan") { o.coat = 0.6; o.coatRough = 0.12; }
  };
  return [part(kind, transform(m, pl), charred)];
}
/** A braided loaf (challah): three ropes plaited, egg-washed, seeded. */
export function braid(len: number, R: number, at: V3 = [0, 0, 0], turn = 0, seed = 1): Part {
  const ropes: Mesh[] = [];
  for (let k = 0; k < 3; k++) {
    const pts: V3[] = [];
    for (let i = 0; i <= 24; i++) { const t = i / 24, x = -len / 2 + t * len, ph = t * Math.PI * 6 + (k * Math.PI * 2) / 3, taper = Math.pow(Math.sin(Math.PI * Math.min(1, t * 0.96 + 0.02)), 0.5); pts.push([x, R * 0.9 * taper + Math.cos(ph) * R * 0.35 * taper, Math.sin(ph) * R * 0.75 * taper]); }
    ropes.push(sweep(pts, { radius: t => R * 0.55 * Math.pow(Math.sin(Math.PI * Math.min(1, t * 0.97 + 0.015)), 0.4), nu: 20, nv: 100 }));
  }
  return part("braid", seat(transform(merge(ropes), { ry: turn, at }), at[1]), crust({ bake: 0.72, shine: 0.85, seeds: "sesame", dough: "#f0cf86", blisters: 0, seed }));
}

// ---- Cakes, pastries and sweets ----------------------------------------------------------------------------------------------------

export interface CakeLayer { h: number; surface: SurfaceFn }
/** A wedge of layered cake (or a slab of anything layered): radius R, angle, layers from the bottom, a frosted or dusted top. */
export function cakeSlice(R: number, deg: number, layers: readonly CakeLayer[], top: SurfaceFn, sides: SurfaceFn | null, at: V3 = [0, 0, 0], turn = 0, topBump = 0.6): Part[] {
  const { outline, centre } = polyOutline(sector(R, deg));
  const H = layers.reduce((a, l) => a + l.h, 0);
  const m = slab({ outline, top: (x, z) => H + fbm(7, x / 12, z / 12, 2) * topBump, bevel: 1.5, nu: 120, nv: 48 });
  let y = 0;
  const stack = layers.map(l => { y += l.h; return [y, l.surface] as const; });
  const apex = [-centre[0], -centre[1]];
  const surf: SurfaceFn = (s, o) => {
    if (s.n[1] > 0.6 && s.o[1] > H - 1.5) return top(s, o);
    const d = Math.hypot(s.o[0] - apex[0], s.o[2] - apex[1]);
    if (sides && d > R - 2) return sides(s, o);
    layered(stack)(s, o);
  };
  return [part("cake", transform(m, { ry: turn, at }), surf)];
}
/** A rectangular layered slab (tiramisu, lasagne, brownie, baklava, sandwich half): w × d with layers. */
export function layeredBlock(w: number, d: number, layers: readonly CakeLayer[], top: SurfaceFn, at: V3 = [0, 0, 0], turn = 0, shape: "rect" | "diamond" | "triangle" = "rect", topBump = 0.8, bevel = 1.5): Part[] {
  const poly = shape === "diamond" ? [[-w / 2, 0], [0, -d / 2], [w / 2, 0], [0, d / 2]] as [number, number][] : shape === "triangle" ? [[-w / 2, d / 2], [w / 2, d / 2], [0, -d / 2]] as [number, number][] : rect(w, d);
  const { outline } = polyOutline(poly);
  const H = layers.reduce((a, l) => a + l.h, 0);
  const m = slab({ outline, top: (x, z) => H + fbm(11, x / 10, z / 10, 2) * topBump, bevel, nu: 112, nv: 44 });
  let y = 0;
  const stack = layers.map(l => { y += l.h; return [y, l.surface] as const; });
  const surf: SurfaceFn = (s, o) => (s.n[1] > 0.6 && s.o[1] > H - 1.6 ? top(s, o) : layered(stack)(s, o));
  return [part("block", transform(m, { ry: turn, at }), surf)];
}
/** A round cake or tart body: radius R, height H, a top surface and a side surface, optionally a fluted edge. */
export function roundCake(R: number, H: number, top: SurfaceFn, side: SurfaceFn, at: V3 = [0, 0, 0], flutes = 0, rim = 0, topFn?: (x: number, z: number) => number): Part {
  const m = slab({ outline: t => R * (1 + (flutes ? 0.025 * Math.abs(Math.sin((t * flutes) / 2)) : 0)), top: topFn ?? ((x, z) => H + (rim ? rim * sst(R * 0.75, R * 0.95, Math.hypot(x, z)) : 0)), bevel: Math.min(H * 0.3, 3), nu: 160, nv: 48 });
  const surf: SurfaceFn = (s, o) => (s.n[1] > 0.55 ? top(s, o) : side(s, o));
  return part("cake", transform(m, { at }), surf);
}
/** A dome (bun, bao, mochi, truffle, dumpling body, meatball, gulab jamun), squashed by `flat`. */
export function dome(R: number, H: number, surface: SurfaceFn, at: V3 = [0, 0, 0], seed = 1, lumps = 0, name = "dome"): Part {
  let m = lathe(profile([[0, 0], [R * 0.75, 0], [R * 0.97, H * 0.18], [R, H * 0.42], [R * 0.85, H * 0.8], [R * 0.45, H * 0.98], [0, H]]), { nu: 56, nv: 36 });
  if (lumps) m = displace(m, o => fbm3(seed, o[0] / (R * 0.4), o[1] / (R * 0.4), o[2] / (R * 0.4), 3) * lumps);
  return part(name, seat(transform(reseed(m, [seed * 17, 0, seed * 5]), { ry: seed * 37, at }), at[1]), surface);
}
/** A ball (truffle, meatball, dango, gulab jamun, grape-sized things), sitting on its base. */
export const ball = (r: number, surface: SurfaceFn, at: V3, seed = 1, lumps = 0, name = "ball"): Part => {
  let m = ellipsoid(r, r * 0.94, r, 32, 22);
  if (lumps) m = displace(m, o => fbm3(seed, o[0] / (r * 0.5), o[1] / (r * 0.5), o[2] / (r * 0.5), 3) * lumps);
  return part(name, seat(transform(reseed(m, [seed * 13, seed * 3, 0]), { ry: seed * 41, at }), at[1]), surface);
};
/** A swirl of piped cream or frosting: a cone of turns, ridged like a star nozzle. */
export function piped(R: number, H: number, surface: SurfaceFn, at: V3, turns = 3, ridges = 8, seed = 1): Part {
  const pts: V3[] = [];
  const N = turns * 16;
  for (let i = 0; i <= N; i++) { const t = i / N, a = t * turns * Math.PI * 2 + seed, rr = R * (1 - t * 0.85); pts.push([Math.cos(a) * rr, H * 0.12 + t * H * 0.8, Math.sin(a) * rr]); }
  const m = sweep(pts, { radius: (t, th) => R * 0.32 * (1 - t * 0.6) * (1 - 0.12 * Math.pow(Math.abs(Math.cos((th * ridges) / 2)), 2)) * (t > 0.97 ? (1 - t) * 30 : 1), nu: 24, nv: N * 4 });
  return part("piped", transform(m, { at }), surface);
}
/** A cupcake or muffin: a pleated paper case and a domed or piped top. */
export function cupcake(R: number, at: V3, top: "muffin" | "frosting", seed = 1, frost = "#f6e2e6"): Part[] {
  const caseM = lathe(profile([[0, 0], [R * 0.78, 0], [R * 0.8, 1], [R, R * 0.9], [R * 0.97, R * 0.92]]), { nu: 120, nv: 20, modulate: th => 1 + 0.03 * Math.abs(Math.sin(th * 16)) });
  const out: Part[] = [part("case", transform(caseM, { at }), (s, o) => { const a = Math.atan2(s.o[2], s.o[0]); setMix(o.albedo, C("#c9a46c"), C("#e7d4b2"), Math.abs(Math.sin(a * 16))); o.rough = 0.6; o.trans = 0.3; o.mfp[0] = o.mfp[1] = o.mfp[2] = 0.5; })];
  if (top === "muffin") out.push(dome(R * 1.15, R * 0.8, crust({ bake: 0.55, blisters: 0, seed, dough: "#e3c189" }), [at[0], at[1] + R * 0.86, at[2]], seed, R * 0.06, "muffin top"));
  else { out.push(dome(R * 1.02, R * 0.25, sponge("#e6c98f"), [at[0], at[1] + R * 0.86, at[2]], seed, 0, "cake top")); out.push(piped(R * 0.95, R * 1.3, cream(frost, { gloss: 0.3 }), [at[0], at[1] + R * 0.95, at[2]], 3, 8, seed)); }
  return grouped(out);
}
/** A macaron: two domed shells with ruffled feet and a filling. */
export function macaron(R: number, colour: string, filling: string, at: V3, seed = 1, tilt = 0): Part[] {
  const shell = (flip: boolean) => lathe(profile(flip ? [[0, 0], [R * 0.9, 0], [R, R * 0.12], [R * 0.95, R * 0.3], [R * 0.6, R * 0.5], [0, R * 0.55]] : [[0, R * 0.55], [R * 0.6, R * 0.5], [R * 0.95, R * 0.3], [R, R * 0.12], [R * 0.9, 0], [0, 0]]), { nu: 48, nv: 24, modulate: (th, v) => 1 + (v > 0.15 && v < 0.45 ? 0.03 * Math.sin(th * 23 + seed) : 0) });
  const shellS = smooth(colour, { rough: 0.55, scatter: 0.05, seed, vary: 0.04 });
  const pl = (y: number): Placement => ({ rx: tilt, at: [at[0], at[1] + y, at[2]] });
  return grouped([part("shell", transform(shell(true), pl(0)), shellS), part("filling", transform(slab({ outline: () => R * 0.86, top: () => R * 0.28, bevel: R * 0.12, nu: 48, nv: 16 }), pl(R * 0.5)), cream(filling, { gloss: 0.4 })), part("shell", transform(shell(false), pl(R * 0.78)), shellS)]);
}
/** A cookie: a flat, cracked disc with chips or nuts. */
export function cookie(R: number, at: V3, seed = 1, chips = true, tilt = 0): Part {
  const top = (x: number, z: number) => { const rr = Math.hypot(x, z) / R, cr = Math.abs(fbm(seed, x / 9, z / 9, 3)); return 6 * (1 - 0.35 * rr * rr) - (cr < 0.04 ? 1.2 : 0) + fbm(seed + 1, x / 4, z / 4, 2) * 0.5; };
  const m = slab({ outline: t => R * (1 + 0.04 * Math.sin(t * 5 + seed)), top, bevel: 2.5, nu: 80, nv: 36 });
  const base = crust({ bake: 0.55, blisters: 0, dough: "#e2c08a", seed });
  const surf: SurfaceFn = chips ? (s, o) => { base(s, o); const d = worley(seed + 3, s.o[0] / 7, s.o[2] / 7, 0.9); if (d.f1 < 0.2 && d.id > 0.35) { chocolate({ gloss: 0.5 })(s, o); o.height += 0.5; } } : base;
  return part("cookie", transform(m, { rx: tilt, ry: seed * 30, at }), surf);
}
/** A tart or pie shell with a fluted, golden rim and a filling surface; optional lattice. */
export function tart(R: number, H: number, filling: SurfaceFn, at: V3, sp: { lattice?: boolean; bake?: number; fillTop?: (x: number, z: number) => number; seed?: number; flutes?: number } = {}): Part[] {
  const seed = sp.seed ?? 1, bake = sp.bake ?? 0.55, wall = 5;
  const shell = lathe(profile([[0, 0], [R - 2, 0], [R, 2], [R, H], [R - wall * 0.5, H + 1.5], [R - wall, H], [R - wall, 3.5], [0, 3.5]]), { nu: 160, nv: 40, modulate: (th, v) => (v > 0.15 && v < 0.65 ? 1 + 0.02 * Math.abs(Math.sin((th * (sp.flutes ?? 22)) / 2)) : 1) });
  const pastry = crust({ bake, blisters: 0, dough: "#efd6a0", seed });
  const fill = slab({ outline: () => R - wall + 0.5, top: sp.fillTop ?? (() => H - 2), bottom: 3, bevel: 1, nu: 120, nv: 40, noSide: true });
  const out = [part("tart shell", transform(shell, { at }), pastry), part("filling", transform(fill, { at }), filling)];
  if (sp.lattice) {
    const strips: Mesh[] = [];
    for (const dir of [0, 1]) for (let k = -3; k <= 3; k++) {
      const off = k * R * 0.26, half = Math.sqrt(Math.max(0, (R - wall) ** 2 - off * off));
      const pts: V3[] = [];
      for (let i = 0; i <= 12; i++) { const t = -half + (2 * half * i) / 12, wv = Math.sin(((t / (R * 0.26)) + k + dir) * Math.PI) * 1.4; pts.push(dir ? [off, H + 1 + wv, t] : [t, H + 1 - wv, off]); }
      strips.push(sweep(pts, { radius: () => 5, flatten: 0.35, nu: 12, nv: 24 }));
    }
    out.push(part("lattice", transform(merge(strips), { at }), crust({ bake: bake + 0.08, blisters: 0, shine: 0.6, dough: "#efd6a0", seeds: "none", seed: seed + 3 })));
  }
  return grouped(out);
}

// ---- Eggs (FOOD1 physics) -----------------------------------------------------------------------------------------------------------

/** A boiled egg halved lengthwise, cut face up, coloured from `cookEgg(minutes)`: runny, jammy or set, green ring if overcooked. */
export function eggHalf(minutes: number, at: V3, turn = 0, seed = 1, marinated = false): Part[] {
  const res = cookEgg({ minutes }), a = 21.5, b = a * 1.3;
  const shell = lathe(v => { const t = -Math.PI / 2 + v * Math.PI, y = Math.sin(t) * b * (t > 0 ? 1.06 : 0.94); return [Math.cos(t) * a * (1 - 0.06 * (y / b)), y]; }, { nu: 48, nv: 32 });
  // lay it on its side and keep the half below the cut (y ≤ 0 after turning)
  const half = warp(transform(shell, { rz: 90 }), p => [p[0], Math.min(p[1], 0), p[2]]);
  const face = transform(slab({ outline: t => { const c = Math.cos(t), s = Math.sin(t); const bb = c > 0 ? b * 1.06 : b * 0.94; return 1 / Math.hypot(c / bb, s / a); }, top: (x, z) => { const ry = Math.hypot((x + b * 0.05) / (res.yolkRadius * a * 1.1), z / (res.yolkRadius * a)); return 0.2 + (ry < 1 && res.label !== "hard-boiled" ? Math.sqrt(1 - ry * ry) * (res.yolkRadius * a * 0.18) : 0); }, bottom: -1, bevel: 0.5, nu: 72, nv: 30, noSide: true }), {});
  const peakAt = (rf: number) => { const k = Math.min(res.peak.length - 1, Math.max(3, rf * (res.peak.length - 1))), k0 = Math.floor(k); return res.peak[k0] + (res.peak[Math.min(res.peak.length - 1, k0 + 1)] - res.peak[k0]) * (k - k0); };
  const yolkR = res.yolkRadius * a;
  const faceS: SurfaceFn = (s, o) => {
    const x = s.o[0] + b * 0.05, z = s.o[2], dy = Math.hypot(x / 1.1, z) / yolkR, e = Math.hypot(s.o[0] / b, z / a);
    const inYolk = dy < 1, rf = inYolk ? dy * res.yolkRadius : res.yolkRadius + (1 - res.yolkRadius) * clamp01((e - res.yolkRadius) / (1 - res.yolkRadius));
    const ec = eggColours(peakAt(rf), inYolk);
    o.albedo[0] = ec.colour[0]; o.albedo[1] = ec.colour[1]; o.albedo[2] = ec.colour[2];
    if (inYolk) {
      const runny = 1 - ec.set;
      o.rough = 0.15 + ec.set * 0.6; o.coat = runny * 0.9; o.coatRough = 0.04; o.mfp[0] = 2; o.mfp[1] = 1.2; o.mfp[2] = 0.3; o.trans = 0.2;
      if (ec.set > 0.6) { const w = worley(seed, x / 1.1, z / 1.1, 1); o.height = Math.min(1, w.f1 * 1.6) * 0.15; scaleInto(o.albedo, 0.88 + 0.12 * Math.min(1, w.f1 * 1.6)); }
      if (res.greenRing && dy > 0.86) mixInto(o.albedo, C("#7a7d55"), sst(0.86, 0.97, dy) * 0.85);
    } else {
      o.rough = 0.3; o.coat = 0.3; o.coatRough = 0.1; o.mfp[0] = o.mfp[1] = o.mfp[2] = 1.4; o.trans = 0.3; o.height = fbm(seed, s.o[0] / 2, z / 2, 2) * 0.03;
      if (marinated) mixInto(o.albedo, C("#b07a3a"), (1 - sst(0.88, 0.97, e)) * 0 + sst(0.9, 1, e) * 0.8);
    }
  };
  const white: SurfaceFn = marinated ? smooth("#b9844a", { rough: 0.25, gloss: 0.5, scatter: 0.12, seed }) : smooth("#f7f5ee", { rough: 0.25, gloss: 0.4, scatter: 0.12, seed });
  const pl: Placement = { ry: turn, at: [at[0], at[1] + a * 0.98, at[2]] };
  return grouped([part("egg white", transform(half, pl), white), part("egg cut", transform(face, pl), faceS)]);
}
/** A fried egg: a lacy, crisp-edged white (browned by the hot oil) and a domed glossy yolk. */
export function friedEgg(at: V3, seed = 1, crisp = 0.6, turn = 0): Part[] {
  const R = 52, outline = (t: number) => R * (0.82 + 0.12 * fbm(seed, Math.cos(t) * 1.5, Math.sin(t) * 1.5, 3) + 0.05 * Math.sin(t * 7 + seed));
  const top = (x: number, z: number) => 2.5 + 3 * Math.exp(-((x + 6) ** 2 + (z - 4) ** 2) / 500) + fbm(seed + 1, x / 6, z / 6, 3) * 0.6;
  const white = slab({ outline, top, bevel: 1.2, nu: 120, nv: 40 });
  const whiteS: SurfaceFn = (s, o) => {
    const e = Math.hypot(s.o[0], s.o[2]) / outline(Math.atan2(s.o[2], s.o[0])), edge = sst(0.75, 0.98, e + fbm(seed + 2, s.o[0] / 4, s.o[2] / 4, 2) * 0.12);
    o.albedo[0] = 0.92; o.albedo[1] = 0.91; o.albedo[2] = 0.86; o.rough = 0.25; o.coat = 0.5; o.coatRough = 0.08; o.mfp[0] = o.mfp[1] = o.mfp[2] = 1.2; o.trans = 0.3;
    if (crisp > 0 && edge > 0) { const c = crustColour(clamp01(edge * crisp * 1.1), C("#efe6cf")); mixInto(o.albedo, c, edge); o.height = edge * fbm(seed + 3, s.o[0] / 1.5, s.o[2] / 1.5, 3) * 0.6; o.coat = 0.3; o.rough = 0.4; }
    else o.height = fbm(seed + 4, s.o[0] / 3, s.o[2] / 3, 2) * 0.1;
  };
  const yolk = lathe(profile([[0, 0], [12.5, 0], [13.5, 2], [12, 7], [7, 10.5], [0, 11.5]]), { nu: 48, nv: 24 });
  const pl: Placement = { ry: turn, at };
  return grouped([part("egg white", transform(white, pl), whiteS), part("yolk", transform(yolk, { ry: turn, at: [at[0] - 6, at[1] + 3, at[2] + 4] }), (s, o) => { o.albedo[0] = 0.92; o.albedo[1] = 0.42; o.albedo[2] = 0.04; o.rough = 0.12; o.coat = 1; o.coatRough = 0.03; o.mfp[0] = 3; o.mfp[1] = 1.4; o.mfp[2] = 0.3; o.trans = 0.3; o.height = fbm(seed, s.o[0], s.o[2], 2) * 0.02; })]);
}

// ---- Meat and fish ----------------------------------------------------------------------------------------------------------------

/** A steak seared by `cookSteak`: the uncut piece and slices lying flat, cut face up, crust → grey band → pink centre. */
export function steakSliced(thickness: number, perSide: number, at: V3, n = 4, turn = 0, seed = 1): Part[] {
  const res = cookSteak({ thickness, perSide }), T = thickness, L = 110, sliceW = 15;
  const rounded = (a: number, b: number, p = 5) => (t: number) => { const c = Math.cos(t), sn = Math.sin(t); return 1 / Math.pow(Math.pow(Math.abs(c) / a, p) + Math.pow(Math.abs(sn) / b, p), 1 / p); };
  const pl: Placement = { ry: turn, at };
  const r = rng(seed), ragged = (f: (t: number) => number, k: number, sd: number) => (t: number) => f(t) * (1 + k * fbm(sd, Math.cos(t) * 2, Math.sin(t) * 2, 3));
  const whole = transform(slab({ outline: ragged(rounded(L / 2, 38, 3.2), 0.07, seed), top: (x, z) => T * (1 + 0.1 * fbm(seed + 1, x / 30, z / 30, 2)) + fbm(seed, x / 18, z / 18, 2) * 1.5, bevel: 6, nu: 120, nv: 30 }), { at: [-30, 0, -34] });
  // slices cut by hand: each a little thicker or thinner, wedge-shaped, its outline its own
  const slicesM: Mesh[] = [];
  for (let i = 0; i < n; i++) { const th = sliceW * (0.82 + r() * 0.36), wedge = (r() - 0.5) * 0.25; slicesM.push(transform(slab({ outline: ragged(rounded(L / 2 * (0.94 + r() * 0.1), T / 2), 0.06, seed + i * 5), top: (x) => th * (1 + wedge * x / (L / 2)) + fbm(seed + i, x / 10, 0.5, 2) * 0.6, bevel: 2.5, nu: 96, nv: 26 }), { rx: -4 + (r() - 0.5) * 6, ry: 6 - i * 5 + (r() - 0.5) * 8, at: [20 + i * 4 + (r() - 0.5) * 4, i * 4.2, 18 + i * 12] })); }
  const crustS = seared({ bake: 0.7 + 0.25 * Math.max(res.crust[0], res.crust[1]), base: "#9a5a3a", gloss: 0.5, seed });
  const faceS: SurfaceFn = (s, o) => {
    // a slice's top is the cut face: depth through the steak runs across it (object z, −T/2 … T/2)
    if (s.n[1] < 0.55) { crustS(s, o); return; }
    const d = clamp01((s.o[2] + T / 2) / T), k = Math.min(res.peak.length - 1, Math.max(0, d * (res.peak.length - 1))), k0 = Math.floor(k), f = k - k0;
    const peak = res.peak[k0] * (1 - f) + res.peak[Math.min(res.peak.length - 1, k0 + 1)] * f, c = meatColour(peak);
    const edge = Math.min(T / 2 - Math.abs(s.o[2]), L / 2 - Math.abs(s.o[0])), crustK = 1 - sst(0.5, 2.4, edge + fbm(seed, s.o[0] / 2, s.o[2], 2) * 0.5);
    o.albedo[0] = c[0]; o.albedo[1] = c[1]; o.albedo[2] = c[2];
    const fib = fbm(seed + 1, s.o[0] / 6, s.o[2] / 0.5, 3), grain = worley3(seed + 2, s.o[0] / 1.3, s.o[1] / 12, s.o[2] / 1.3), wall = 1 - sst(0, 0.1, grain.f2 - grain.f1);
    scaleInto(o.albedo, (0.88 + 0.14 * fib) * (0.95 + 0.08 * grain.id) * (1 + 0.06 * wall));
    // juice beading on the cut, and the knife's drag
    const bead = worley3(seed + 3, s.o[0] / 2.5, s.o[1] / 2.5, s.o[2] / 2.5), drop = bead.f1 < 0.16 && bead.id < 0.3 ? 1 - bead.f1 / 0.16 : 0;
    if (crustK > 0) mixInto(o.albedo, crustColour(0.85, C("#8a4a26")), crustK);
    o.rough = 0.25; o.coat = Math.max(0.7 * (1 - sst(60, 75, peak)), drop); o.coatRough = 0.04; o.spec = 0.035; o.height = fib * 0.05 - wall * 0.03 + drop * 0.25 + 0.02 * Math.sin(s.o[0] * 1.8 + fib * 3); o.mfp[0] = 1.2; o.mfp[1] = 0.4; o.mfp[2] = 0.3;
  };
  return grouped([part("steak", seat(transform(whole, pl), at[1]), crustS), part("slices", seat(transform(merge(slicesM), pl), at[1]), faceS)]);
}
/** A roast bird (chicken, poussin, duck): body, breast ridge, legs, folded wings; golden blistered skin. */
export function roastBird(size: number, at: V3, sp: { bake?: number; turn?: number; seed?: number; raw?: boolean; herbs?: number; glaze?: string } = {}): Part[] {
  const s = size / 100, seed = sp.seed ?? 1;
  // the body: an egg lying along X (legs towards +X), flat underneath, a ridge along the breastbone
  let body = ellipsoid(50 * s, 30 * s, 38 * s, 64, 40);
  body = warp(body, p => {
    const y = p[1] < -14 * s ? -14 * s + (p[1] + 14 * s) * 0.45 : p[1];
    const ridge = 7 * s * Math.exp(-(p[2] * p[2]) / ((12 * s) ** 2)) * sst(0, 26 * s, p[1]) * (1 - sst(20 * s, 48 * s, Math.abs(p[0])));
    return [p[0] * (1 + 0.08 * Math.max(0, -p[0] / (50 * s))), y + ridge, p[2]];
  });
  const limbs: Mesh[] = [];
  for (const side of [-1, 1]) {
    // thigh, plump against the body; drumstick crossing forward to a knuckle, trussed near its partner
    limbs.push(transform(ellipsoid(26 * s, 19 * s, 17 * s, 32, 20), { ry: side * 20, at: [22 * s, 4 * s, side * 30 * s] }));
    limbs.push(sweep([[30 * s, 6 * s, side * 32 * s], [46 * s, 12 * s, side * 26 * s], [60 * s, 16 * s, side * 14 * s], [70 * s, 18 * s, side * 6 * s]], { radius: t => (t < 0.6 ? 12.5 * s * (1 - t * 0.55) : 5 * s) + (t > 0.88 ? 2.6 * s * Math.sin((t - 0.88) / 0.12 * Math.PI) : 0), nu: 20, nv: 30 }));
    limbs.push(transform(ellipsoid(22 * s, 7 * s, 11 * s, 24, 12), { ry: side * -15, rz: -12, at: [-28 * s, 10 * s, side * 33 * s] }));
  }
  const m = seat(transform(merge([body, ...limbs]), { ry: sp.turn ?? 0, at }), at[1]);
  const surf: SurfaceFn = sp.raw ? rawPoultry(seed) : sp.glaze ? glazeMeat({ colour: sp.glaze, char: 0.35, seed }) : roastSkin({ bake: sp.bake ?? 0.62, seed, herbs: sp.herbs });
  return [part("bird", m, surf)];
}
/** A whole fish lying on its side (mackerel, sea bream, trout): fusiform body, forked tail, dorsal, pectoral, pelvic
 *  and anal fins with rays, a gill cover, an eye with pupil, iris and cornea; scaled skin and grill marks. */
export function wholeFish(len: number, at: V3, sp: { back?: string; belly?: string; crisp?: number; bars?: boolean; turn?: number; seed?: number; grill?: number } = {}): Part[] {
  const seed = sp.seed ?? 1, H = len * 0.24, T = len * 0.1, nose = -len / 2;
  const body = lathe(profile([[0, 0], [H * 0.18, len * 0.02], [H * 0.42, len * 0.12], [H * 0.5, len * 0.32], [H * 0.38, len * 0.58], [H * 0.17, len * 0.79], [H * 0.09, len * 0.86], [0, len * 0.87]]), { nu: 56, nv: 72, squash: T / (H * 0.5) });
  const fish = transform(body, { rz: -90, at: [nose, 0, 0] });
  // fins: thin blades, their rays running from the root out to the edge
  const fin = (length: number, width: (s: number) => number, pl: Placement, droop = 0) => transform(blade({ length, halfWidth: width, lift: (s, w) => Math.sin(w * 3 + s * 2) * length * 0.015 - droop * s * s * length, nu: 14, nv: 14 }), pl);
  const tailX = nose + len * 0.84, midY = 0;
  const fins = [
    fin(len * 0.2, s => H * 0.36 * (0.2 + s) * (1 - 0.55 * Math.exp(-((s - 1) ** 2) / 0.02)), { rx: 90, at: [tailX, midY, 0] }),
    fin(len * 0.3, s => H * 0.12 * Math.sin(Math.PI * Math.min(1, s * 1.05)), { rx: 90, rz: 4, at: [nose + len * 0.32, midY + H * 0.44, 0] }),
    fin(len * 0.13, s => H * 0.06 * Math.sin(Math.PI * Math.min(1, s * 1.1)) * (1.2 - s), { ry: -14, rz: -12, at: [nose + len * 0.26, midY - H * 0.08, T * 0.92] }, 0.2),
    fin(len * 0.08, s => H * 0.05 * Math.sin(Math.PI * s), { rx: 90, rz: 170, at: [nose + len * 0.42, midY - H * 0.42, 0] }),
    fin(len * 0.14, s => H * 0.08 * Math.sin(Math.PI * s), { rx: 90, rz: 176, at: [nose + len * 0.7, midY - H * 0.32, 0] }),
  ];
  const eyeR = H * 0.085, eye = ellipsoid(eyeR, eyeR, eyeR * 0.55, 20, 14);
  const pl: Placement = { ry: sp.turn ?? 0, at };
  const skinS = fishSkin({ back: sp.back, belly: sp.belly, crisp: sp.crisp ?? 0.4, bars: sp.bars, seed });
  const grill = sp.grill ?? 0, gillY = len * 0.21;
  const surf: SurfaceFn = (smp, o) => {
    // the scales want (along the body, belly → back, across): the lathe's own axes are (height, along, across)
    const ox = smp.o[0], oy = smp.o[1];
    smp.o[0] = oy; smp.o[1] = ox; skinS(smp, o); smp.o[0] = ox; smp.o[1] = oy;
    // the gill cover's edge, an arc behind the eye
    const g = Math.abs(smp.o[1] - gillY - 0.04 * len * (smp.o[0] / H) ** 2);
    if (g < 1.2) { mixInto(o.albedo, C("#2a2622"), (1 - g / 1.2) * 0.6); o.height += (1 - g / 1.2) * 0.25; }
    if (smp.o[1] < gillY) o.rough = Math.max(0.12, o.rough - 0.06);
    if (grill) { const t = (smp.p[0] * 0.8 + smp.p[2] * 0.6) / 16, bar = 1 - sst(0.06, 0.14, Math.abs(t - Math.round(t)) + fbm(seed + 3, smp.p[0] / 4, smp.p[2] / 4, 2) * 0.04); if (smp.n[1] > 0.4 && bar > 0) mixInto(o.albedo, C("#1a0e08"), bar * grill); }
  };
  const finS: SurfaceFn = (smp, o) => { const ray = Math.pow(Math.abs(Math.sin(smp.uv[0] * Math.PI * 14)), 0.6); setMix(o.albedo, C(sp.crisp ? "#7a5a3a" : "#8a8e8c"), C(sp.crisp ? "#3a2416" : "#4a5254"), ray * 0.6 + smp.uv[1] * 0.25); o.height = ray * 0.06; o.rough = 0.35; o.coat = 0.3; o.trans = 0.6; o.mfp[0] = 0.6; o.mfp[1] = 0.6; o.mfp[2] = 0.5; };
  const eyeS: SurfaceFn = (smp, o) => { const r = Math.hypot(smp.o[0], smp.o[1]) / eyeR; if (r < 0.48) { o.albedo[0] = 0.01; o.albedo[1] = 0.01; o.albedo[2] = 0.012; } else { setMix(o.albedo, C(sp.crisp ? "#d8d0b8" : "#c8a24a"), C("#e8e4d8"), sst(0.6, 0.95, r)); } o.rough = 0.05; o.coat = 1; o.coatRough = 0.02; o.spec = 0.05; };
  // built standing with its side to +z, then laid on that side's opposite: the eye side faces up, the fins lie flat
  const lay = (m: Mesh) => transform(transform(m, { rx: -90 }), pl);
  const bodyM = lay(fish), finM = lay(merge(fins)), eyeM = lay(transform(eye, { at: [nose + len * 0.11, H * 0.06, T * 0.82] }));
  let minY = Infinity;
  for (let k = 1; k < bodyM.pos.length; k += 3) minY = Math.min(minY, bodyM.pos[k]);
  const lift = (m: Mesh) => transform(m, { at: [0, at[1] - minY, 0] });
  // fins flop onto the plate: keep them just above it
  const fl = lift(finM);
  for (let k = 1; k < fl.pos.length; k += 3) fl.pos[k] = Math.max(at[1] + 0.4, fl.pos[k]);
  return grouped([part("fish", lift(bodyM), surf), part("fins", fl, finS), part("eye", lift(eyeM), eyeS)]);
}
/** A fillet or slab (salmon, tuna, pork belly, tofu, cheese, butter): w × d × h with rounded edges and a surface. */
export function slabPiece(w: number, d: number, h: number, surface: SurfaceFn, at: V3, turn = 0, sp: { bevel?: number; taper?: number; bump?: number; seed?: number; tilt?: number; name?: string; irregular?: number } = {}): Part {
  // nothing cut by hand is exact: the outline wanders, the thickness varies, the edges sag a little
  const seed = sp.seed ?? 1, irr = sp.irregular ?? 0.06;
  const outline = (t: number) => { const c = Math.cos(t), s = Math.sin(t); return (1 / Math.pow(Math.pow(Math.abs(c) / (w / 2), 6) + Math.pow(Math.abs(s) / (d / 2), 6), 1 / 6)) * (1 + irr * fbm(seed + 3, c * 1.6, s * 1.6, 3) + irr * 0.3 * fbm(seed + 4, c * 6, s * 6, 2)); };
  const top = (x: number, z: number) => { const e = Math.max(Math.abs(x) / (w / 2), Math.abs(z) / (d / 2)); return h * (1 - (sp.taper ?? 0) * Math.pow(Math.max(0, x / (w / 2)), 2)) * (1 + irr * 1.2 * fbm(seed + 5, x / 30, z / 30, 2)) * (1 - irr * 0.8 * Math.pow(e, 4)) + fbm(seed, x / 15, z / 15, 2) * (sp.bump ?? 0.5); };
  const m = slab({ outline, top, bevel: (sp.bevel ?? Math.min(h * 0.35, 4)), nu: 120, nv: 40 });
  return part(sp.name ?? "piece", transform(reseed(m, [seed * 23, 0, 0]), { rx: sp.tilt ?? 0, ry: turn, at }), surface);
}
/** A steak cut lying flat (raw or seared): a ribeye's rounded, lopsided outline with its fat cap on one side, or a
 *  plain sirloin with a fat strip along one edge; uneven thickness; the face shows the fibres end-on. */
export function steakCut(kind: "ribeye" | "sirloin", at: V3, sp: { thickness?: number; marbling?: number; seared?: number; turn?: number; seed?: number; colour?: string } = {}): Part {
  const seed = sp.seed ?? 1, T = sp.thickness ?? 30, W = kind === "ribeye" ? 150 : 170, D = kind === "ribeye" ? 110 : 80;
  const outline = (t: number) => {
    const c = Math.cos(t), s = Math.sin(t), base = 1 / Math.hypot(c / (W / 2), s / (D / 2));
    // a ribeye bulges where the cap sits and flattens along its fat side; a sirloin is a long rounded oblong
    return base * (kind === "ribeye" ? 1 + 0.1 * Math.cos(t - 0.7) - 0.08 * Math.max(0, Math.cos(t - Math.PI)) : 1 + 0.05 * Math.cos(2 * t)) * (1 + 0.08 * fbm(seed, c * 1.5, s * 1.5, 3) + 0.02 * fbm(seed + 1, c * 6, s * 6, 2));
  };
  // raw meat slumps: domed a little, its sides rounded and soft
  const top = (x: number, z: number) => T * (1 + 0.12 * fbm(seed + 2, x / 35, z / 35, 2)) * (1.08 - 0.22 * Math.pow(Math.hypot(x / (W / 2), z / (D / 2)), 2.5));
  const m = slab({ outline, top, bevel: Math.min(13, T * 0.5), nu: 160, nv: 44 });
  // the fat cap: a band inside the outline along the far-left side (ribeye) or the top edge (sirloin)
  const fatSide = (p: V3) => { const t = Math.atan2(p[2], p[0]), inside = outline(t) - Math.hypot(p[0], p[2]); const side = kind === "ribeye" ? sst(0.1, 0.6, -Math.cos(t - 0.2)) : sst(0.2, 0.7, -Math.sin(t)); return (1 - sst(6, 12 + 4 * fbm(seed + 7, p[0] / 10, p[1] / 10, p[2] / 10, 2), inside)) * side; };
  const raw = rawMeat({ axis: "y", marbling: sp.marbling ?? 0.4, ribeye: kind === "ribeye" ? { w: W * 0.95, d: D * 0.95 } : undefined, knife: 0.7, seed, colour: sp.colour, fatCap: p => (p[1] > T * 0.5 || Math.abs(p[1] - T / 2) < T ? fatSide(p) : 0) });
  const sear = sp.seared ? seared({ bake: sp.seared, base: "#9a5a3a", gloss: 0.5, seed }) : null;
  const surf: SurfaceFn = sear ? (smp, o) => { sear(smp, o); const cap = fatSide(smp.o); if (cap > 0.5) { mixInto(o.albedo, crustColour(0.55, C("#e8d0a0")), cap * 0.8); o.coat = 0.8; } } : raw;
  return part(kind, transform(m, { ry: sp.turn ?? 0, at }), surf);
}
/** A side of salmon (or trout): a fillet's outline tapering to the tail, thick along the back, thin at the belly with
 *  its white fat stripe; the myomeres run across it; skin silver at the edges. */
export function salmonFillet(len: number, at: V3, sp: { turn?: number; seed?: number; cooked?: number; seared?: number } = {}): Part {
  const seed = sp.seed ?? 1, L = len / 2, Wd = len * 0.2;
  const poly: [number, number][] = [[-L, -Wd * 0.85], [-L * 0.5, -Wd], [L * 0.35, -Wd * 0.9], [L * 0.85, -Wd * 0.4], [L, -Wd * 0.12], [L * 1.02, Wd * 0.05], [L * 0.85, Wd * 0.38], [L * 0.35, Wd * 0.85], [-L * 0.5, Wd * 0.95], [-L, Wd * 0.8]];
  const { outline } = polyOutline(poly);
  const rough = (t: number) => outline(t) * (1 + 0.025 * fbm(seed, Math.cos(t) * 3, Math.sin(t) * 3, 3));
  const top = (x: number, z: number) => { const along = Math.min(1, Math.max(0, (x + L) / (2 * L))), across = z / Wd; return len * 0.12 * (1 - 0.7 * Math.pow(along, 1.6)) * (1 - 0.45 * Math.max(0, across) * Math.max(0, across)) * (1 - 0.25 * Math.max(0, -across) ** 2) * (1 + 0.06 * fbm(seed + 2, x / 25, z / 25, 2)); };
  const m = slab({ outline: rough, top, bevel: 4, nu: 160, nv: 40 });
  const flesh = fishFlesh({ colour: "#ee7240", bands: 9, cooked: sp.cooked ?? 0, seed });
  const sear = sp.seared ? seared({ bake: sp.seared, base: "#f0a070", gloss: 0.6, seed }) : null;
  const surf: SurfaceFn = (smp, o) => {
    if (sear && smp.n[1] > 0.6) { sear(smp, o); return; }
    flesh(smp, o);
    // the belly's fat stripe and the silver skin under the edges
    const across = smp.o[2] / Wd, belly = sst(0.55, 0.8, across) * (1 - sst(0.95, 1.1, across));
    mixInto(o.albedo, C("#fbe6d8"), belly * 0.55);
    if (smp.o[1] < 3 && smp.n[1] < 0.2) { mixInto(o.albedo, C("#b8c0c4"), 0.8 * (1 - sst(1, 3, smp.o[1]))); o.coat = 0.6; }
  };
  return part("fillet", transform(reseed(m, [seed * 13, 0, 0]), { ry: sp.turn ?? 0, at }), surf);
}
/** Chunks (stew meat, potatoes, tofu, paneer, croutons, fruit pieces): lumpy rounded cubes scattered at a height. */
export function chunks(count: number, size: number, areaR: number, y: (x: number, z: number) => number, surface: SurfaceFn, seed = 1, sink = 0.35, centre: V3 = [0, 0, 0], round = 4): Part {
  const r = rng(seed), ms: Mesh[] = [], placed: [number, number][] = [];
  let tries = 0;
  while (ms.length < count && tries++ < count * 50) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * areaR, x = centre[0] + Math.cos(a) * d, z = centre[2] + Math.sin(a) * d;
    if (placed.some(p => Math.hypot(p[0] - x, p[1] - z) < size * 0.9)) continue;
    placed.push([x, z]);
    const sz = size * (0.75 + r() * 0.5), b = displace(box(sz, sz * (0.7 + r() * 0.3), sz * (0.8 + r() * 0.3), round, 14, 10), o => fbm3(seed + ms.length, o[0] / (sz * 0.4), o[1] / (sz * 0.4), o[2] / (sz * 0.4), 2) * sz * 0.08);
    ms.push(reseed(transform(b, { rx: (r() - 0.5) * 50, rz: (r() - 0.5) * 50, ry: r() * 360, at: [x, y(x, z) + sz * (0.5 - sink), z] }), [ms.length * 29, 0, ms.length * 7]));
  }
  return part("chunks", merge(ms), surface);
}
/** Prawns: curled, segmented, tail fan; raw grey or cooked coral. */
export function prawn(len: number, cooked: boolean, at: V3, turn = 0): Part {
  const pts: V3[] = [];
  for (let i = 0; i <= 10; i++) { const a = (i / 10) * Math.PI * 1.15; pts.push([Math.cos(a) * len * 0.32, len * 0.12, Math.sin(a) * len * 0.32]); }
  const m = sweep(pts, { radius: (t, th) => len * 0.11 * (1 - t * 0.65) * (0.93 + 0.07 * Math.abs(Math.sin(t * 6 * Math.PI))) * (1 - 0.15 * Math.max(0, -Math.sin(th))), flatten: 0.85, nu: 18, nv: 40 });
  const surf: SurfaceFn = (s, o) => { const seg = Math.abs(Math.sin(Math.atan2(s.o[2], s.o[0]) * 7)); setMix(o.albedo, C(cooked ? "#f08a5a" : "#a9a69a"), C(cooked ? "#fbe0cc" : "#d8d2c4"), clamp01(0.3 + 0.5 * (1 - s.n[1]) + 0.2 * seg)); o.rough = 0.25; o.coat = 0.6; o.coatRough = 0.06; o.mfp[0] = 1.2; o.mfp[1] = 0.6; o.mfp[2] = 0.4; o.trans = 0.4; o.height = seg * 0.1; };
  return part("prawn", seat(transform(m, { ry: turn, at }), at[1]), surf);
}
/** Bivalve shells (mussels, clams, oysters): a ribbed or smooth lens, open with its meat when cooked. */
export function shell(kind: "mussel" | "clam" | "oyster" | "scallop", size: number, at: V3, turn = 0, seed = 1): Part[] {
  const outline = kind === "mussel" ? (t: number) => size * 0.5 / Math.hypot(Math.cos(t) * 1, Math.sin(t) * 1.9) * (1 + 0.15 * Math.cos(t)) : kind === "oyster" ? (t: number) => size * 0.5 * (1 + 0.12 * fbm(seed, Math.cos(t) * 2, Math.sin(t) * 2, 3)) / Math.hypot(Math.cos(t), Math.sin(t) * 1.4) : () => size * 0.5;
  const m = slab({ outline, top: (x, z) => { const rr = Math.hypot(x, z) / (size * 0.5); return 3 + (1 - rr * rr) * size * 0.08 + (kind === "scallop" || kind === "clam" ? Math.abs(Math.sin(Math.atan2(z, x) * 14)) * 0.6 : 0); }, bevel: 1.5, nu: 72, nv: 30 });
  const shellS: SurfaceFn = kind === "mussel" ? (s, o) => { setMix(o.albedo, C("#141826"), C("#3b4a66"), clamp01(0.3 + fbm3(seed, s.o[0] / 5, s.o[1] / 5, s.o[2] / 5, 3))); o.rough = 0.2; o.coat = 0.7; o.coatRough = 0.06; o.height = Math.abs(Math.sin(Math.hypot(s.o[0], s.o[2]) * 1.4)) * 0.1; } : kind === "oyster" ? (s, o) => { const ly = Math.abs(Math.sin(Math.hypot(s.o[0], s.o[2]) * 0.9 + fbm(seed, s.o[0] / 6, s.o[2] / 6, 3) * 3)); setMix(o.albedo, C("#7b7466"), C("#d6cfc2"), ly); o.rough = 0.75; o.height = ly * 0.5; } : (s, o) => { setMix(o.albedo, C("#d8c2a2"), C("#f0e2cc"), Math.abs(Math.sin(Math.atan2(s.o[2], s.o[0]) * 14))); o.rough = 0.45; };
  const pl: Placement = { ry: turn, at };
  const out = [part(kind, transform(m, pl), shellS)];
  if (kind === "oyster") out.push(part("oyster meat", transform(slab({ outline: t => outline(t) * 0.68, top: (x, z) => 6 + (1 - Math.hypot(x, z) / (size * 0.34)) * 3 + fbm(seed, x / 4, z / 4, 3) * 1.2, bottom: 4, bevel: 2, nu: 64, nv: 24 }), pl), (s, o) => { const frill = sst(0.75, 0.95, Math.hypot(s.o[0], s.o[2]) / (size * 0.32)); setMix(o.albedo, C("#cfc6b4"), C("#4f4a42"), frill * 0.8); o.rough = 0.1; o.coat = 1; o.coatRough = 0.02; o.mfp[0] = 2; o.mfp[1] = 2; o.mfp[2] = 1.8; o.trans = 0.4; }));
  return grouped(out);
}

// ---- Dumplings, sushi, skewers, wraps --------------------------------------------------------------------------------------------

/** Dumplings: gyoza (pleated crescents, crisp bottoms), xiaolongbao and baozi (pleated tops), har gow (translucent), momo, pierogi, empanadas. */
export function dumpling(kind: "gyoza" | "xiaolongbao" | "baozi" | "har-gow" | "momo" | "pierogi" | "empanada" | "wonton" | "mandu", at: V3, turn = 0, seed = 1): Part {
  if (kind === "xiaolongbao" || kind === "baozi" || kind === "momo") {
    const R = kind === "baozi" ? 36 : kind === "momo" ? 22 : 20, H = R * (kind === "baozi" ? 0.95 : 0.85), pleats = kind === "baozi" ? 16 : 14;
    let m = lathe(profile([[0, 0], [R * 0.8, 0], [R, H * 0.25], [R * 0.9, H * 0.6], [R * 0.45, H * 0.88], [R * 0.12, H * 1.02], [0, H * 1.05]]), { nu: 96, nv: 40, modulate: (th, v) => 1 + (v > 0.55 ? 0.07 * Math.sin(th * pleats + v * 8) * (v - 0.55) * 2 : 0) });
    m = displace(m, o => fbm3(seed, o[0] / 8, o[1] / 8, o[2] / 8, 2) * 0.6);
    const surf = kind === "baozi" ? smooth("#f6f1e6", { rough: 0.55, scatter: 0.2, seed, vary: 0.03 }) : smooth(kind === "momo" ? "#efe6d2" : "#efe6d6", { rough: 0.3, gloss: 0.4, scatter: 0.35, trans: 0.5, seed });
    return part(kind, seat(transform(m, { ry: turn, at }), at[1]), surf);
  }
  if (kind === "har-gow") {
    const m = displace(lathe(profile([[0, 0], [16, 0], [19, 6], [15, 15], [6, 20], [0, 20]]), { nu: 64, nv: 30, squash: 0.85, modulate: (th, v) => 1 + (v > 0.4 ? 0.05 * Math.sin(th * 10) * v : 0) }), o => fbm3(seed, o[0] / 6, o[1] / 6, o[2] / 6, 2) * 0.4);
    return part(kind, seat(transform(m, { ry: turn, at }), at[1]), (s, o) => { setMix(o.albedo, C("#efe7dc"), C("#f2a68a"), 0.25 + 0.2 * fbm3(seed, s.o[0] / 4, s.o[1] / 4, s.o[2] / 4, 2)); o.rough = 0.15; o.coat = 0.8; o.coatRough = 0.05; o.mfp[0] = 3; o.mfp[1] = 2.5; o.mfp[2] = 2; o.trans = 0.75; });
  }
  // half-moon dumplings: a folded disc with crimped or pleated edge
  const R = kind === "empanada" ? 52 : kind === "pierogi" ? 34 : kind === "wonton" ? 26 : kind === "mandu" ? 34 : 34, H = kind === "empanada" ? 22 : 15;
  const outline = (t: number) => { const s = Math.sin(t); return s < 0 ? R * 0.98 / Math.hypot(Math.cos(t), s * 2.3) : R / Math.hypot(Math.cos(t), s * 1.15); };
  const top = (x: number, z: number) => { const e = Math.hypot(x / R, (z + R * 0.1) / (R * 0.45)); const crimp = kind === "gyoza" ? Math.max(0, Math.sin(x / 4.5)) * 2.2 * sst(0.55, 0.9, e) : kind === "empanada" || kind === "pierogi" ? Math.abs(Math.sin(Math.atan2(z, x) * 16)) * 1.4 * sst(0.75, 0.95, e) : 0; return H * Math.pow(Math.max(0, 1 - e * e), 0.55) + 2 + crimp; };
  const m = slab({ outline, top, bevel: 2, nu: 96, nv: 40 });
  const surf: SurfaceFn = kind === "empanada" ? crust({ bake: 0.6, shine: 0.6, blisters: 0, seed, dough: "#ecd09a" }) : kind === "gyoza" ? (s, o) => { smooth("#f0e6d0", { rough: 0.35, gloss: 0.3, scatter: 0.25, trans: 0.4, seed })(s, o); const fry = 1 - sst(1.5, 5, s.o[1]); if (fry > 0) { const c = crustColour(0.72, C("#e7cf9a")); mixInto(o.albedo, c, fry); o.rough = 0.3; o.coat = 0.6; } } : kind === "pierogi" ? (s, o) => { smooth("#f1e3c4", { rough: 0.35, gloss: 0.4, scatter: 0.2, seed })(s, o); const b = sst(0.3, 0.8, fbm3(seed, s.o[0] / 8, s.o[1] / 8, s.o[2] / 8, 3)); mixInto(o.albedo, C("#c48a3c"), b * 0.5); } : smooth("#efe3cb", { rough: 0.3, gloss: 0.4, scatter: 0.3, trans: 0.5, seed });
  return part(kind, transform(m, { ry: turn, at }), surf);
}
/** One cooked rice grain: pearly, glossy, light passing through it. */
const riceGrain: SurfaceFn = (s, o) => { const k = 0.93 + 0.07 * fbm3(3, s.o[0], s.o[1] * 2, s.o[2], 2); o.albedo[0] = 0.92 * k; o.albedo[1] = 0.9 * k; o.albedo[2] = 0.84 * k; o.rough = 0.22; o.spec = 0.04; o.coat = 0.55; o.coatRough = 0.06; o.mfp[0] = 1.6; o.mfp[1] = 1.5; o.mfp[2] = 1.3; o.trans = 0.55; o.height = fbm3(5, s.o[0] * 3, s.o[1] * 3, s.o[2] * 3, 2) * 0.01; };

/** An onigiri: a soft rounded triangle of rice about 80 mm across, coated grain by grain, a band of nori over its
 *  base. Standing on its flat bottom edge, its face to +z. */
export function onigiri(at: V3, sp: { turn?: number; seed?: number; size?: number } = {}): Part[] {
  const seed = sp.seed ?? 1, r0 = (sp.size ?? 80) * 0.46, T = (sp.size ?? 80) * 0.38;
  const R = (th: number) => r0 * (1 + 0.15 * Math.cos(3 * (th - Math.PI / 2))) * (1 + 0.02 * fbm(seed, Math.cos(th) * 2, Math.sin(th) * 2, 2));
  // a closed pillow: v runs from the front centre over the rim to the back centre
  let body = paramSurface(96, 48, true, (u, v) => { const th = u * Math.PI * 2, ph = v * Math.PI, rho = Math.pow(Math.sin(ph), 0.32), rr = R(th) * rho; return [Math.cos(th) * rr, Math.sin(th) * rr, (T / 2) * Math.cos(ph) * (1 - 0.15 * rho * rho)]; });
  body = displace(body, o => fbm3(seed + 1, o[0] / 12, o[1] / 12, o[2] / 12, 2) * 1.6);
  // seat it on its flat bottom edge
  let minY = Infinity; for (let k = 1; k < body.pos.length; k += 3) minY = Math.min(minY, body.pos[k]);
  const noriH = r0 * 0.75, isNori = (o: V3) => o[1] - minY < noriH && Math.abs(o[0]) < r0 * 0.55;
  const noriBody = displace(body, o => (isNori(o) ? 1.4 : 0));
  const grains = grainCoat(body, 950, { seed: seed + 3, keep: o => !isNori(o) });
  const pl: Placement = { ry: sp.turn ?? 0, at: [at[0], at[1] - minY, at[2]] };
  const bodyS: SurfaceFn = (s, o) => { if (isNori(s.o)) { nori(seed)(s, o); const crease = Math.abs(Math.sin(s.o[0] * 0.9 + fbm(seed, s.o[1] / 8, s.o[2] / 8, 2) * 2)); o.height += crease * 0.05; return; } riceSurface(seed)(s, o); scaleInto(o.albedo, 0.62); };
  return grouped([part("rice ball", transform(noriBody, pl), bodyS), part("rice grains", transform(grains, pl), riceGrain)]);
}

/** Nigiri: a hand-pressed rice block with a draped slice of fish (or tamago, eel), optional nori band. */
export function nigiri(topping: "salmon" | "tuna" | "eel" | "tamago" | "shrimp" | "sea-bream", at: V3, turn = 0, seed = 1): Part[] {
  const rice = displace(box(52, 20, 24, 3, 28, 18), o => fbm3(seed, o[0] / 5, o[1] / 5, o[2] / 5, 2) * 0.9);
  const pl: Placement = { ry: turn, at: [at[0], at[1] + 10, at[2]] };
  const riceM = seat(transform(rice, pl), at[1]);
  const grainsM = grainCoat(riceM, 260, { seed: seed + 5, keep: (_o, n) => n[1] < 0.85 });
  const out = [part("rice", riceM, (s, o) => { riceSurface(seed)(s, o); scaleInto(o.albedo, 0.75); }), part("rice grains", grainsM, riceGrain)];
  const top = slab({ outline: t => 1 / Math.pow(Math.pow(Math.abs(Math.cos(t)) / 33, 4) + Math.pow(Math.abs(Math.sin(t)) / 15, 4), 0.25), top: (x) => 4 + (topping === "tamago" ? 8 : 0) - Math.pow(x / 33, 2) * 7, bevel: 1.2, nu: 72, nv: 24 });
  const topS: SurfaceFn = topping === "salmon" ? fishFlesh({ colour: "#f07a45", fat: "#fbe3d0", bands: 6, seed }) : topping === "tuna" ? fishFlesh({ colour: "#a1202c", tuna: true, seed }) : topping === "sea-bream" ? fishFlesh({ colour: "#f1e3dc", fat: "#f2b8b0", bands: 6, seed }) : topping === "eel" ? glazeMeat({ colour: "#4a2414", char: 0.3, seed, sesame: 0.3 }) : topping === "shrimp" ? (s, o) => { const b = Math.abs(Math.sin(s.o[0] * 0.35)); setMix(o.albedo, C("#f6eee6"), C("#f0703c"), sst(0.4, 0.9, b)); o.rough = 0.3; o.coat = 0.5; o.mfp[0] = 1.5; o.mfp[1] = 1; o.mfp[2] = 0.8; } : (s, o) => { crust({ bake: 0.2, blisters: 0, dough: "#f6d66a", seed })(s, o); if (s.n[1] < 0.6) { const l = Math.abs(Math.sin(s.o[1] * 1.6)); mixInto(o.albedo, C("#f4dc7a"), l * 0.4); } };
  out.push(part(topping, transform(top, { ry: turn, at: [at[0], at[1] + 17, at[2]] }), topS));
  if (topping === "tamago" || topping === "eel") out.push(part("nori", transform(slab({ outline: t => 1 / Math.pow(Math.pow(Math.abs(Math.cos(t)) / 6, 6) + Math.pow(Math.abs(Math.sin(t)) / 17, 6), 1 / 6), top: () => 30, bottom: 0, bevel: 0.6, nu: 48, nv: 24 }), { ry: turn, at: [at[0], at[1] - 0.4, at[2]] }), nori()));
  return grouped(out);
}
/** Maki slices: a nori ring round rice and a coloured filling, cut faces up. */
export function makiSlices(n: number, at: V3, filling: string, turn = 0, seed = 1): Part[] {
  const R = 16, ms: Mesh[] = [];
  for (let i = 0; i < n; i++) ms.push(reseed(slab({ outline: t => R * (1 + 0.04 * Math.sin(t * 3 + i)), top: () => 20 + Math.sin(i) * 0.5, bevel: 1, nu: 64, nv: 28 }), [i * 40, 0, 0]));
  const placed = merge(ms.map((m, i) => transform(m, { at: [(i - (n - 1) / 2) * R * 2.1, 0, (i % 2) * 4] })));
  const fc = C(filling);
  const surf: SurfaceFn = (s, o) => {
    // each slice's object x was offset by 40 mm × its index (reseed), so its centre is the nearest multiple of 40
    const r0 = Math.hypot(s.o[0] - Math.round((s.o[0]) / 40) * 40, s.o[2]);
    if (s.n[1] < 0.6 || r0 > R - 1.2) { nori(seed)(s, o); return; }
    if (r0 < R * 0.38) { o.albedo[0] = fc[0]; o.albedo[1] = fc[1]; o.albedo[2] = fc[2]; o.rough = 0.2; o.coat = 0.6; o.mfp[0] = 1; o.mfp[1] = 0.6; o.mfp[2] = 0.4; o.height = fbm(seed, s.o[0], s.o[2], 2) * 0.1; return; }
    grains({ colour: "#f3efe6", size: 0.8, cooked: 0.8, seed })(s, o);
  };
  return [part("maki", seat(transform(placed, { ry: turn, at }), at[1]), surf)];
}
/** A skewer: a bamboo stick through pieces (yakitori, kebab, satay, souvlaki, dango, anticucho). */
export function skewer(len: number, pieces: number, pieceSize: number, surface: SurfaceFn, at: V3, turn = 0, seed = 1, shape: "chunk" | "ball" | "cube" = "chunk"): Part[] {
  const stickM = sweep([[-len / 2, pieceSize * 0.5, 0], [len / 2, pieceSize * 0.5, 0]], { radius: t => (t > 0.97 ? 1.6 * (1 - t) * 30 : 1.7), nu: 8, nv: 8 });
  const r = rng(seed), ms: Mesh[] = [];
  for (let i = 0; i < pieces; i++) {
    const x = -len / 2 + len * 0.14 + i * pieceSize * 1.02, sz = pieceSize * (0.88 + r() * 0.2);
    const b = shape === "ball" ? ellipsoid(sz / 2, sz / 2, sz / 2, 24, 16) : displace(box(sz, sz * 0.9, sz, shape === "cube" ? 6 : 3.5, 16, 12), o => fbm3(seed + i, o[0] / (sz * 0.35), o[1] / (sz * 0.35), o[2] / (sz * 0.35), 3) * sz * 0.1);
    ms.push(reseed(transform(b, { rx: r() * 40, at: [x, pieceSize * 0.5, 0] }), [i * 21, 0, 0]));
  }
  const pl: Placement = { ry: turn, at };
  const pieceM = transform(merge(ms), pl), stick = transform(stickM, pl);
  let minY = Infinity; for (let i = 1; i < pieceM.pos.length; i += 3) minY = Math.min(minY, pieceM.pos[i]);
  for (const m of [pieceM, stick]) for (let i = 1; i < m.pos.length; i += 3) m.pos[i] += at[1] - minY;
  return grouped([part("pieces", pieceM, surface), part("skewer", stick, (s, o) => { setMix(o.albedo, C("#d9bf8c"), C("#5a3a1a"), sst(0.3, 0.9, fbm3(seed, s.o[0] / 6, s.o[1], s.o[2], 2) + (Math.abs(s.o[0]) > len * 0.38 ? 0 : 0.3))); o.rough = 0.6; o.height = fbm3(seed + 1, s.o[0] / 0.3, s.o[1] * 4, s.o[2] * 4, 2) * 0.03; })]);
}
/** A taco: a folded corn tortilla shell holding fillings, standing on its fold. */
export function taco(at: V3, filling: SurfaceFn, turn = 0, seed = 1): Part[] {
  const R = 72, shellM = blade({ length: 2 * R * 0.95, halfWidth: s => R * 0.55 * Math.pow(Math.sin(Math.PI * Math.min(1, s)), 0.5), lift: (_s, w) => (1 - Math.cos(w * Math.PI * 0.5)) * R * 0.55, nu: 24, nv: 40 });
  const shell = transform(shellM, { rx: 0, at: [-R * 0.95, 1, 0] });
  const fill = displace(transform(ellipsoid(R * 0.75, R * 0.22, R * 0.2, 40, 20), { at: [0, R * 0.28, 0] }), o => fbm3(seed, o[0] / 6, o[1] / 6, o[2] / 6, 3) * 5);
  const pl: Placement = { ry: turn, at };
  const tort: SurfaceFn = (s, o) => { crust({ bake: 0.3, blisters: 0, seed, dough: "#e9cf86" })(s, o); const d = worley(seed + 2, s.o[0] / 7, s.o[2] / 7, 1); if (d.f1 < 0.2 && d.id > 0.5) mixInto(o.albedo, C("#3a2310"), (1 - d.f1 / 0.2) * 0.7); };
  return grouped([part("tortilla", transform(shell, pl), tort), part("filling", transform(fill, pl), filling)]);
}
/** A stack of discs (burger, pancakes, mille-crêpe): each `[radius, height, surface, bulge]` from the bottom. */
export function stack(layers: readonly (readonly [number, number, SurfaceFn, number?])[], at: V3, seed = 1): Part[] {
  let y = at[1];
  return grouped(layers.map(([R, h, s, bulge], i) => {
    const m = slab({ outline: t => R * (1 + 0.025 * Math.sin(t * 3 + i + seed) + (bulge ?? 0) * 0.08 * fbm(seed + i, Math.cos(t) * 2, Math.sin(t) * 2, 2)), top: (x, z) => h * (1 + (bulge ?? 0) * (1 - (Math.hypot(x, z) / R) ** 2)), bevel: Math.min(h * 0.45, 5), nu: 96, nv: 32 });
    const p = part(`layer ${i}`, transform(m, { at: [at[0], y, at[2]] }), s);
    y += h * (1 + (bulge ?? 0)) - 0.6;
    return p;
  }));
}

// ---- Bowls -------------------------------------------------------------------------------------------------------------------------

/** Noodles in a bowl: wavy strands (ramen, udon, pho, soba), partly above a liquid at `level`, lifted in a nest. */
export function noodles(v: Vessel, level: number, kind: "ramen" | "udon" | "rice" | "soba" | "spaghetti", count = 30, seed = 1, centre: V3 = [0, 0, 0], nest = 0.6): Part {
  const r = rng(seed), ms: Mesh[] = [], R = v.innerR(level) * 0.72, rad = kind === "udon" ? 2.4 : kind === "ramen" ? 0.9 : kind === "spaghetti" ? 1 : kind === "soba" ? 0.8 : 0.7;
  for (let i = 0; i < count; i++) {
    const pts: V3[] = [], a0 = r() * Math.PI * 2, wav = kind === "ramen" ? 2.5 : 0.8, freq = kind === "ramen" ? 0.6 : 0.2;
    for (let k = 0; k <= 16; k++) {
      const t = k / 16, a = a0 + t * (1.6 + r() * 0.4), d = R * (0.2 + 0.75 * Math.abs(Math.sin(t * Math.PI + i))), y = level + (nest * 10 * Math.sin(t * Math.PI) - 2) + Math.sin(t * 40 * freq + i) * wav * 0.4;
      pts.push([centre[0] + Math.cos(a) * d + Math.sin(t * 30 * freq + i) * wav, y, centre[2] + Math.sin(a) * d]);
    }
    ms.push(sweep(pts, { radius: () => rad, nu: 6, nv: 60 }));
  }
  const col = kind === "ramen" ? "#f0d590" : kind === "udon" ? "#f4ecd8" : kind === "soba" ? "#8a7a62" : kind === "spaghetti" ? "#ecc87a" : "#f2efe8";
  return part("noodles", merge(ms), noodle(col, { gloss: 0.6, seed }));
}
/** A spaghetti nest twirled on a plate. */
export function pastaNest(R: number, H: number, at: V3, seed = 1, colour = "#ecc87a", sauce?: SurfaceFn): Part {
  // a twirl: strands spiralling out and down from the crown, so the nest reads as a dome of loops
  const r = rng(seed), ms: Mesh[] = [];
  for (let i = 0; i < 110; i++) {
    const pts: V3[] = [], turns = 1.2 + r() * 1.1, a0 = r() * Math.PI * 2, r0 = r() * 0.35, r1 = 0.75 + r() * 0.3, hk = 0.82 + r() * 0.2;
    for (let k = 0; k <= 36; k++) { const t = k / 36, a = a0 + t * turns * Math.PI * 2, rr = R * (r0 + (r1 - r0) * Math.pow(t, 0.8)), y = H * hk * (1 - Math.pow(rr / R, 1.7)) + 1.2 + Math.sin(a * 2 + i) * 1.4; pts.push([Math.cos(a) * rr, Math.max(1.1, y), Math.sin(a) * rr]); }
    ms.push(reseed(sweep(pts, { radius: () => 1.05, nu: 6, nv: 72 }), [i * 3, 0, 0]));
  }
  const base = noodle(colour, { gloss: 0.7, seed });
  const surf: SurfaceFn = sauce ? (s, o) => { const k = sst(0.45, 0.75, s.p[1] / (at[1] + H) + fbm3(seed + 3, s.o[0] / 9, s.o[1] / 9, s.o[2] / 9, 3) * 0.3); if (k > 0.5) sauce(s, o); else base(s, o); } : base;
  return part("pasta", transform(merge(ms), { at }), surf);
}
/** A thick surface inside a vessel (stew, curry, dal, porridge, risotto, hummus): a lumpy slab at `fill`. */
export function thickFill(v: Vessel, fill: number, surface: SurfaceFn, seed = 1, lump = 2.5, dome = 0, swirl = 0): Part {
  const y = v.floorY + (v.rimY - v.floorY) * fill, R = v.innerR(y) - 0.5;
  const m = slab({ outline: () => R, top: (x, z) => { const rr = Math.hypot(x, z) / R; return y + lump * fbm(seed, x / 14, z / 14, 3) + dome * (1 - rr * rr) + (swirl ? Math.sin(rr * 18 - Math.atan2(z, x) * 1) * swirl * (1 - rr) : 0) + 1.2 * Math.pow(rr, 6); }, bottom: v.floorY, bevel: 1.5, nu: 120, nv: 48, noSide: true });
  return part("fill", m, surface);
}

/** Slices of braised pork belly (chashu): a rolled spiral of lean and fat, glazed edges. */
export function chashu(R: number, th: number, at: V3, tilt = 20, turn = 0, seed = 1): Part {
  const m = slab({ outline: t => R * (1 + 0.06 * Math.sin(t * 3 + seed)), top: () => th, bevel: 1.2, nu: 72, nv: 24 });
  const surf: SurfaceFn = (s, o) => {
    const rr = Math.hypot(s.o[0], s.o[2]), a = Math.atan2(s.o[2], s.o[0]), sp = Math.sin(rr * 0.75 - a + fbm(seed, s.o[0] / 6, s.o[2] / 6, 2));
    if (s.n[1] < 0.5 || rr > R - 2) { glazeMeat({ colour: "#6a3418", char: 0.3, seed })(s, o); return; }
    setMix(o.albedo, C("#c08a62"), C("#f2dcc0"), sst(0.2, 0.7, sp)); scaleInto(o.albedo, 0.9 + 0.12 * fbm(seed + 2, s.o[0], s.o[2], 2));
    o.rough = 0.3; o.coat = 0.6; o.coatRough = 0.08; o.mfp[0] = 1.5; o.mfp[1] = 0.8; o.mfp[2] = 0.5; o.trans = 0.2; o.height = fbm(seed + 3, s.o[0] / 0.8, s.o[2] / 0.8, 2) * 0.08;
  };
  return part("chashu", transform(m, { rx: tilt, ry: turn, at }), surf);
}
/** A sheet of nori (or a lettuce leaf, a corn husk) standing in a bowl or wrapped: a thin flat slab. */
export const sheet = (w: number, h: number, surface: SurfaceFn, pl: Placement, name = "sheet"): Part => part(name, transform(slab({ outline: t => 1 / Math.pow(Math.pow(Math.abs(Math.cos(t)) / (w / 2), 8) + Math.pow(Math.abs(Math.sin(t)) / (h / 2), 8), 1 / 8), top: () => 0.5, bevel: 0.2, nu: 48, nv: 12 }), pl), surface);

// ---- Piles, jars, drinks ---------------------------------------------------------------------------------------------------------

/** A pile of grains, spice or salt on a board or in a dish: a mound with loose pieces round it. */
export function pile(kind: "salt" | "pepper" | "rice" | "lentils" | "coffee" | "chickpeas" | "spice" | "sugar" | "beans" | "oats" | "nuts", R: number, H: number, at: V3, colour = "#c4442a", seed = 1, bowl?: Vessel): Part[] {
  // in a bowl: the heap fills it to `H` below the rim and domes up; on a flat dish: a free mound of radius R
  const level = bowl ? Math.max(bowl.floorY + 4, bowl.rimY - H) : 0, inR = bowl ? bowl.innerR(level) - 1 : R, dome = bowl ? H * 0.9 : H;
  if (bowl) R = inR;
  const top = (x: number, z: number) => { const d = Math.hypot(x - at[0], z - at[2]) / R; return bowl ? level + dome * Math.max(0, 1 - d * d) : at[1] + H * Math.pow(Math.max(0, 1 - d * d), 0.9); };
  const m = bowl ? slab({ outline: () => inR, top: (x, z) => top(x + at[0], z + at[2]) + 0.6 * Math.sin(x * 0.3 + seed) * Math.cos(z * 0.27), bottom: bowl.floorY, bevel: 1, nu: 96, nv: 48, noSide: true }) : transform(mound(R, H, 0, seed, 0.05), { at });
  if (kind === "spice") return [part("spice", m, powder(colour, seed))];
  if (kind === "sugar") return [part("sugar", m, grains({ colour: "#f4f1ea", size: 0.4, seed }))];
  if (kind === "oats") return [part("oats", m, grains({ colour: "#d9c39a", size: 2.2, seed, varied: "#bfa278" }))];
  if (kind === "rice") return [part("rice", m, grains({ colour: "#efe9da", size: 1.1, seed, varied: "#e2d9c4" }))];
  const r = rng(seed), pieces: Mesh[] = [];
  const make = (): Mesh => {
    if (kind === "salt") return transform(box(2 + r() * 3, 1.5 + r() * 2.5, 2 + r() * 3, 9, 8, 6), { rx: r() * 90, ry: r() * 90, rz: r() * 90 });
    if (kind === "pepper") return displace(ellipsoid(2.3, 2.2, 2.3, 12, 8), o => fbm3(seed + pieces.length, o[0], o[1], o[2], 2) * 0.4);
    if (kind === "coffee") return displace(ellipsoid(5.5, 3, 4, 16, 10), o => (Math.abs(o[2]) < 0.6 && o[1] > 0 ? -0.9 : 0));
    if (kind === "chickpeas") return displace(ellipsoid(4.5, 4.3, 4.5, 14, 10), o => fbm3(seed + pieces.length, o[0] / 2, o[1] / 2, o[2] / 2, 2) * 0.5 + (o[1] > 3.5 && Math.abs(o[0]) < 1 ? 0.6 : 0));
    if (kind === "lentils") return ellipsoid(2.6, 1.1, 2.6, 12, 6);
    if (kind === "beans") return ellipsoid(7, 4, 4.5, 16, 10);
    return displace(ellipsoid(9, 5, 7, 16, 10), o => fbm3(seed + pieces.length, o[0] / 2, o[1] / 2, o[2] / 2, 3) * 1.2);
  };
  const n = kind === "salt" ? 900 : kind === "lentils" ? 1100 : kind === "pepper" ? 700 : kind === "nuts" ? 70 : kind === "beans" ? 160 : kind === "chickpeas" ? 260 : 300;
  const pr = kind === "nuts" ? 7 : kind === "beans" ? 5 : kind === "coffee" ? 4.5 : kind === "chickpeas" ? 4 : kind === "lentils" ? 2.4 : 2.2;
  for (let i = 0; i < n; i++) { const a = r() * Math.PI * 2, d = Math.pow(r(), 0.6) * R * (bowl ? 0.92 : 1.12), x = at[0] + Math.cos(a) * d, z = at[2] + Math.sin(a) * d; pieces.push(reseed(transform(make(), { ry: r() * 360, rx: (r() - 0.5) * 40, at: [x, Math.max(at[1], top(x, z)) - pr * 0.35, z] }), [i * 7, 0, i * 3])); }
  const surf: SurfaceFn = kind === "salt" ? crystal() : kind === "pepper" ? (s, o) => { setMix(o.albedo, C("#1e1814"), C("#3e3024"), clamp01(0.5 + fbm3(seed, s.o[0], s.o[1], s.o[2], 2))); o.rough = 0.6; o.height = fbm3(seed + 1, s.o[0] * 2, s.o[1] * 2, s.o[2] * 2, 2) * 0.1; } : kind === "coffee" ? (s, o) => { setMix(o.albedo, C("#2a170d"), C("#4a2a16"), clamp01(0.5 + fbm3(seed, s.o[0] / 3, s.o[1] / 3, s.o[2] / 3, 2))); o.rough = 0.25; o.coat = 0.6; o.coatRough = 0.08; } : kind === "lentils" ? smooth(colour, { rough: 0.45, vary: 0.15, seed }) : kind === "nuts" ? (s, o) => { setMix(o.albedo, C("#8a5a32"), C("#c79a66"), clamp01(0.5 + fbm3(seed, s.o[0], s.o[1] / 3, s.o[2], 3))); o.rough = 0.6; o.height = Math.abs(fbm3(seed + 1, s.o[0] * 1.5, s.o[1] * 0.4, s.o[2] * 1.5, 2)) * 0.3; } : smooth(colour, { rough: 0.45, vary: 0.1, seed });
  const base: SurfaceFn = kind === "salt" ? crystal() : kind === "pepper" || kind === "coffee" || kind === "nuts" ? (_s, o) => { o.albedo[0] = 0.02; o.albedo[1] = 0.015; o.albedo[2] = 0.01; o.rough = 0.8; } : smooth(colour, { rough: 0.5, vary: 0.2, seed });
  return [part(`${kind} heap`, m, base), part(kind, merge(pieces), surf)];
}
/** A glass jar's contents: honey or jam (a coloured syrup), or pieces in brine. */
export function jarContents(v: Vessel, kind: "honey" | "jam" | "pickles" | "kimchi" | "olives" | "lemons", seed = 1): Part[] {
  const fill = kind === "honey" || kind === "jam" ? 0.78 : 0.86, y = v.floorY + (v.rimY - v.floorY) * fill, R = v.innerR(y) - 1;
  const body = lathe(profile([[0, v.floorY + 0.5], [R, v.floorY + 0.5], [R, y], [0, y]]), { nu: 72, nv: 24 });
  if (kind === "honey") return [part("honey", body, syrup("#c47a12"), { transparent: true })];
  if (kind === "jam") return [part("jam", body, (s, o) => { o.albedo[0] = 0.42; o.albedo[1] = 0.02; o.albedo[2] = 0.05; o.rough = 0.08; o.coat = 1; o.coatRough = 0.03; o.mfp[0] = 6; o.mfp[1] = 0.6; o.mfp[2] = 0.6; o.trans = 0.7; o.height = fbm3(seed, s.o[0] / 3, s.o[1] / 3, s.o[2] / 3, 2) * 0.3; })];
  const r = rng(seed), ms: Mesh[] = [];
  for (let i = 0; i < (kind === "pickles" ? 7 : kind === "lemons" ? 6 : 26); i++) {
    const a = r() * Math.PI * 2, d = r() * R * 0.6, yy = v.floorY + 4 + r() * (y - v.floorY - 10);
    const m = kind === "pickles" ? displace(transform(sweep([[0, -28, 0], [0, 0, 1], [0, 28, 0]], { radius: t => 9 * Math.pow(Math.sin(Math.PI * Math.min(1, t * 0.96 + 0.02)), 0.3), nu: 16, nv: 24 }), { rz: (r() - 0.5) * 20 }), o => Math.max(0, fbm3(seed + i, o[0] / 3, o[1] / 3, o[2] / 3, 2)) * 1.2) : kind === "olives" ? ellipsoid(8, 10, 8, 16, 12) : kind === "lemons" ? ellipsoid(16, 19, 16, 24, 16) : displace(box(18, 14, 10, 3, 10, 8), o => fbm3(seed + i, o[0] / 4, o[1] / 4, o[2] / 4, 2) * 2.5);
    ms.push(reseed(transform(m, { ry: r() * 360, at: [Math.cos(a) * d, yy, Math.sin(a) * d] }), [i * 30, 0, 0]));
  }
  const pieceS: SurfaceFn = kind === "pickles" ? (s, o) => { setMix(o.albedo, C("#4f6a2a"), C("#8a9a4a"), clamp01(0.5 + fbm3(seed, s.o[0] / 3, s.o[1] / 6, s.o[2] / 3, 3))); o.rough = 0.3; o.coat = 0.6; o.height = Math.max(0, fbm3(seed + 2, s.o[0] / 1.5, s.o[1] / 1.5, s.o[2] / 1.5, 2)) * 0.3; o.mfp[0] = 1; o.mfp[1] = 2; o.mfp[2] = 0.6; o.trans = 0.4; } : kind === "olives" ? (s, o) => { setMix(o.albedo, C("#3a3220"), C("#5e5a2a"), clamp01(0.5 + fbm3(seed, s.o[0] / 6, s.o[1] / 6, s.o[2] / 6, 2))); o.rough = 0.15; o.coat = 0.9; o.coatRough = 0.04; } : kind === "lemons" ? (s, o) => { setMix(o.albedo, C("#d9a12a"), C("#e9c24a"), 0.5); o.rough = 0.3; o.coat = 0.7; o.height = 0.1 * fbm3(seed, s.o[0], s.o[1], s.o[2], 2); } : (s, o) => { setMix(o.albedo, C("#c2341c"), C("#efe2c4"), sst(0.3, 0.8, fbm3(seed, s.o[0] / 4, s.o[1] / 4, s.o[2] / 4, 3))); o.rough = 0.3; o.coat = 0.5; o.height = fbm3(seed + 3, s.o[0] / 1, s.o[1] / 1, s.o[2] / 1, 2) * 0.15; o.mfp[0] = 2; o.mfp[1] = 0.6; o.mfp[2] = 0.4; };
  const brine: SurfaceFn = kind === "kimchi" ? syrup("#d0603a", { cloudy: 0.008, depth: 50 }) : kind === "olives" ? syrup("#c9b04a", { depth: 40 }) : syrup("#e6e0b0", { cloudy: 0.004, depth: 60 });
  return [part("pieces", merge(ms), pieceS), part("brine", body, brine, { transparent: true })];
}
/** A drink in a cup: coffee with crema, tea, matcha froth, hot chocolate, chai or a lassi. */
export function drink(v: Vessel, kind: "coffee" | "tea" | "matcha" | "cocoa" | "chai" | "lassi" | "mint-tea" | "milk", seed = 1): Part[] {
  const fill = 0.86, y = v.floorY + (v.rimY - v.floorY) * fill;
  const glassBody = v.parts.some(p => p.thin);
  if (kind === "tea" || kind === "mint-tea") {
    const tea: SurfaceFn = (s, o) => { syrup(kind === "tea" ? "#a8502a" : "#c8902a")(s, o); o.absorb[0] *= 0.12; o.absorb[1] *= 0.12; o.absorb[2] *= 0.12; o.height = s.n[1] > 0.8 ? fbm(seed, s.o[0] / 12, s.o[2] / 12, 2) * 0.08 : 0; };
    if (!glassBody) return [liquidIn(v, fill, tea, { name: kind })];
    return [part(kind, lathe(profile([[0, v.floorY + 0.4], [v.innerR(v.floorY) - 0.6, v.floorY + 0.4], [v.innerR(y) - 0.6, y], [0, y]]), { nu: 72, nv: 24 }), tea, { transparent: true })];
  }
  const top = glassBody ? lathe(profile([[0, v.floorY + 0.4], [v.innerR(v.floorY) - 0.6, v.floorY + 0.4], [v.innerR(y) - 0.6, y], [0, y]]), { nu: 72, nv: 24 }) : slab({ outline: () => v.innerR(y) - 0.4, top: (x, z) => y + 0.8 * Math.pow(Math.hypot(x, z) / v.innerR(y), 8), bottom: v.floorY, bevel: 1, nu: 96, nv: 40, noSide: true });
  const surf: SurfaceFn = kind === "coffee" ? (s, o) => { const rr = Math.hypot(s.o[0], s.o[2]) / v.innerR(y), d = worley(seed, s.o[0] / 0.6, s.o[2] / 0.6, 1); setMix(o.albedo, C("#c88a52"), C("#6a3a1a"), sst(0.6, 1, rr) * 0.8 + 0.15 * fbm(seed + 1, s.o[0] / 4, s.o[2] / 4, 3)); o.height = Math.sqrt(Math.max(0, 1 - d.f1 * 2)) * 0.03; o.rough = 0.3; o.coat = 0.4; o.mfp[0] = 0.6; o.mfp[1] = 0.4; o.mfp[2] = 0.3; }
    : kind === "matcha" ? froth("#7f9a3a", seed) : kind === "cocoa" ? (s, o) => { froth("#c9a68a", seed)(s, o); const dust = sst(0.2, 0.6, fbm(seed + 2, s.o[0] / 4, s.o[2] / 4, 3)); mixInto(o.albedo, C("#4a2a1a"), dust * 0.8); o.sheen = 0.5; } : kind === "chai" ? (s, o) => { froth("#c99a6a", seed)(s, o); const sp = worley(seed + 3, s.o[0] / 2, s.o[2] / 2, 1); if (sp.f1 < 0.12) mixInto(o.albedo, C("#5a3018"), 0.8); } : kind === "lassi" ? cream("#f4ead0") : cream("#fbf8f0", { gloss: 0.5 });
  return [part(kind, top, surf)];
}

// ---- Tempura, gyoza, rice mounds (detailed) -------------------------------------------------------------------------------------

/** A shrimp in tempura: straightened under a lumpy, lacy batter with crisp frills; the coral tail fan bare. */
export function tempuraShrimp(len: number, at: V3, turn = 0, seed = 1): Part[] {
  const R = len * 0.1, r = rng(seed);
  let body = sweep([[-len / 2, R, 0], [-len * 0.1, R * 1.05, 1.5], [len * 0.25, R, -1], [len / 2 - 6, R * 0.8, 0]], { radius: t => R * Math.pow(Math.sin(Math.PI * Math.min(1, t * 0.88 + 0.12)), 0.35) * (1 - 0.4 * t) + 1, nu: 24, nv: 44 });
  body = displace(body, o => Math.max(0, fbm3(seed, o[0] / 5, o[1] / 5, o[2] / 5, 3)) * 3.5 + fbm3(seed + 1, o[0] / 2, o[1] / 2, o[2] / 2, 2) * 0.8);
  // frills: thin crisp shreds of batter standing off the coat, flattened
  const frills = surfaceScatter(body, 70, (_i, rr) => displace(ellipsoid(2 + rr() * 3, 0.9 + rr() * 0.8, 1.6 + rr() * 2, 10, 6), o => fbm3(seed + 3, o[0], o[1], o[2], 2) * 0.6), { seed: seed + 2, sink: 0.4, keep: (_o, n) => n[1] > -0.4 });
  const tail = merge([0, 1].map(k => transform(blade({ length: R * 1.9, halfWidth: sv => R * 0.75 * Math.sin(Math.PI * Math.min(1, sv * 0.85 + 0.15)) * (0.7 + sv * 0.5), lift: (sv, w) => w * w * 1.2 + sv * 2, nu: 10, nv: 10 }), { ry: k ? 18 : -18, rz: 12, at: [len / 2 - 8, R * 0.85, 0] })));
  const pl: Placement = { ry: turn + (r() - 0.5) * 6, at };
  const batter = fromSolid(batterSolid({ bake: 0.32, seed }), { coat: 0.35, coatRough: 0.1 });
  const frillS = fromSolid(batterSolid({ bake: 0.5, seed: seed + 1 }), { coat: 0.25, coatRough: 0.12 });
  const tailS: SurfaceFn = (s, o) => { setMix(o.albedo, C("#e8582a"), C("#5a1a0e"), sst(0.75, 1, s.uv[1])); scaleInto(o.albedo, 0.9 + 0.15 * Math.abs(Math.sin(s.uv[0] * 20))); o.rough = 0.25; o.coat = 0.7; o.coatRough = 0.06; o.trans = 0.5; o.mfp[0] = 1.2; o.mfp[1] = 0.5; o.mfp[2] = 0.3; };
  const bodyM = transform(body, pl);
  let minY = Infinity; for (let k = 1; k < bodyM.pos.length; k += 3) minY = Math.min(minY, bodyM.pos[k]);
  const lift = (m: Mesh) => transform(m, { at: [0, at[1] - minY, 0] });
  return grouped([part("tempura", lift(bodyM), batter), part("frills", lift(transform(frills, pl)), frillS), part("tail", lift(transform(tail, pl)), tailS)]);
}

/**
 * Pan-fried gyoza (hanetsuki): crescents with a pleated crest along the sealed seam, the pleats fanning down the
 * front; bottoms fried brown and crisp; a lace wing of fried starch joining them on the plate.
 */
export function gyozaPlate(n: number, at: V3, turn = 0, seed = 1): Part[] {
  const r = rng(seed), L = 66, D = 30, H = 20, pieces: Mesh[] = [];
  for (let i = 0; i < n; i++) {
    const outline = (t: number) => { const c = Math.cos(t), sn = Math.sin(t); return (sn < 0 ? 1 / Math.hypot(c / (L / 2), sn / (D * 0.42)) : 1 / Math.hypot(c / (L / 2), sn / (D * 0.58))) * (1 + 0.03 * fbm(seed + i, c * 2, sn * 2, 2)); };
    // a crest along z ≈ 0 rising from the flat base; pleats ripple down the front (+z) side, strongest at the crest
    const top = (x: number, z: number) => {
      const e = Math.abs(x) / (L / 2), crestZ = -2, dz = z - crestZ, body = H * Math.pow(Math.max(0, 1 - e * e), 0.5) * Math.exp(-(dz * dz) / (2 * (D * 0.26) ** 2));
      const pleat = dz > -2 ? Math.sin(x * 0.42 + i) * 2.2 * Math.exp(-((dz - 1) ** 2) / 40) * Math.max(0, 1 - e) : 0;
      return 1.5 + body + pleat;
    };
    const m = slab({ outline, top, bevel: 2, nu: 120, nv: 48 });
    pieces.push(reseed(transform(m, { ry: 90 + (i - (n - 1) / 2) * -5 + (r() - 0.5) * 4, at: [(i - (n - 1) / 2) * 30, 0, Math.abs(i - (n - 1) / 2) * 2] }), [i * 90, 0, 0]));
  }
  const skinS: SurfaceFn = (s, o) => {
    // the wrapper: thin, a little translucent, dusted; fried brown on the base and up its lower edge
    smooth("#ecdcbc", { rough: 0.4, gloss: 0.3, scatter: 0.3, trans: 0.45, seed })(s, o);
    const fry = 1 - sst(1.5, 5.5, s.o[1] + fbm(seed + 2, s.o[0] / 6, s.o[2] / 6, 2) * 1.2);
    if (fry > 0) { const c = crustTex(0.5 + 0.16 * fbm(seed + 3, s.o[0] / 5, s.o[2] / 5, 2), C("#e7cf9a")); mixInto(o.albedo, c, fry); o.rough = 0.3; o.coat = 0.7 * fry; o.coatRough = 0.06; o.trans *= 1 - fry; o.height += fry * fbm(seed + 4, s.o[0] / 1.2, s.o[2] / 1.2, 2) * 0.2; }
  };
  // served flipped from the pan: the browned bases face up, the lace wing of fried batter lies over and between them
  const flipped = transform(merge(pieces), { rx: 180 });
  let top = -Infinity, low = Infinity;
  for (let k = 1; k < flipped.pos.length; k += 3) { top = Math.max(top, flipped.pos[k]); low = Math.min(low, flipped.pos[k]); }
  const gy = transform(flipped, { at: [0, -low, 0] }), Ht = top - low;
  const wing = slab({ outline: t => (n * 30) / 2 * 1.08 / Math.hypot(Math.cos(t), Math.sin(t) * 1.7) * (1 + 0.08 * fbm(seed + 9, Math.cos(t) * 3, Math.sin(t) * 3, 3)), top: (x, z) => Ht - 1.2 - 0.6 * Math.pow(Math.hypot(x / ((n * 30) / 2), z / 30), 2) * 2, bottom: Ht - 2.4, bevel: 0.4, nu: 140, nv: 30, noSide: true });
  // the lace: a thin transparent layer — where the batter webbed it scatters golden light, its holes show the plate
  const wingS: SurfaceFn = (s, o) => { const d = worley(seed + 5, s.o[0] / 4.2, s.o[2] / 4.2, 1), hole = 1 - sst(0.3, 0.42, d.f1 * (0.75 + 0.5 * d.id)), web = 1 - hole, edge = sst(0.75, 1, Math.hypot(s.o[0] / ((n * 30) / 2), s.o[2] / 22)); const c = crustTex(0.32 + 0.2 * sst(0.4, 0.95, d.f2 - d.f1) + 0.2 * edge, C("#f0dcaa")); const k = web * (1 - edge * 0.6); o.absorb[0] = 3 * k; o.absorb[1] = 3 * k; o.absorb[2] = 3 * k; o.scatter[0] = c[0]; o.scatter[1] = c[1]; o.scatter[2] = c[2]; o.density = 6 * k; o.rough = 0.3; o.spec = 0.04 * k + 0.001; o.height = web * fbm(seed + 6, s.o[0] / 1.2, s.o[2] / 1.2, 2) * 0.2; };
  const pl: Placement = { ry: turn, at };
  return grouped([part("gyoza", transform(gy, pl), skinS), part("wing", transform(wing, pl), wingS, { transparent: true, thin: 1.2 })]);
}

export interface RiceMoundSpec {
  R: number; H: number;
  /** A dome (a plated mound) or flat (a pan or pot filled level). */
  shape?: "dome" | "flat";
  /** Grain size (mm), how many, and tints by weight (each grain draws one). */
  grain?: { len?: number; wid?: number; count?: number; tints: readonly (readonly [string, number])[] };
  /** Things tossed through it: egg curds, peas, carrot dice, scallion rings, charred bits, fried onion. */
  extras?: readonly { kind: "egg" | "peas" | "carrot" | "scallion" | "char" | "onion"; count: number }[];
  seed?: number;
}
/** A mound of cooked rice (fried rice, jollof, biryani): a heap coated grain by grain, each grain tinted on its own,
 *  with egg, peas, carrot, scallion or charred bits through it. */
export function riceMound(at: V3, sp: RiceMoundSpec): Part[] {
  const seed = sp.seed ?? 1, R = sp.R, H = sp.H, g = sp.grain ?? { tints: [["#f3efe6", 1]] };
  const base = slab({ outline: t => R * (1 + 0.06 * Math.sin(t * 4 + seed) + 0.04 * fbm(seed, Math.cos(t) * 2, Math.sin(t) * 2, 2)), top: (x, z) => (sp.shape === "flat" ? H * (1 - Math.pow(Math.hypot(x, z) / R, 10) * 0.3) : H * Math.pow(Math.max(0, 1 - (Math.hypot(x, z) / R) ** 2), 0.8)) + fbm(seed + 1, x / 9, z / 9, 3) * 2, bevel: 4, nu: 120, nv: 48 });
  const grainsM = grainCoat(base, g.count ?? 1800, { len: g.len ?? 5.2, wid: g.wid ?? 2.6, seed: seed + 2, light: true, keep: (_o, n) => n[1] > -0.2 });
  const tints = g.tints.map(([hex, w]) => [C(hex), w] as const), wsum = tints.reduce((a, [, w]) => a + w, 0);
  const grainS: SurfaceFn = (s, o) => {
    // each grain carries its index in its object x (grainCoat offsets them 17 mm apart): one tint per grain
    const id = Math.floor((s.o[0] + 8.5) / 17), h = ((id * 2654435761) >>> 0) / 4294967296;
    let acc = 0, col = tints[0][0];
    for (const [c, w] of tints) { acc += w / wsum; if (h < acc) { col = c; break; } }
    const k = 0.92 + 0.08 * fbm3(seed, s.o[0], s.o[1] * 2, s.o[2], 2);
    o.albedo[0] = col[0] * k; o.albedo[1] = col[1] * k; o.albedo[2] = col[2] * k; o.rough = 0.25; o.spec = 0.04; o.coat = 0.55; o.coatRough = 0.06; o.mfp[0] = 1.4; o.mfp[1] = 1.2; o.mfp[2] = 0.9; o.trans = 0.4;
  };
  const pl: Placement = { at };
  const bed = riceSurface(seed), bedTint = tints[0][0];
  const out: Part[] = [part("rice", transform(base, pl), (s, o) => { bed(s, o); o.albedo[0] *= bedTint[0] * 0.6; o.albedo[1] *= bedTint[1] * 0.6; o.albedo[2] *= bedTint[2] * 0.6; }), part("grains", transform(grainsM, pl), grainS)];
  for (const ex of sp.extras ?? []) {
    const make = (i: number, r: () => number): Mesh => ex.kind === "egg" ? displace(ellipsoid(4 + r() * 4, 1.6 + r(), 3 + r() * 3, 12, 8), o => fbm3(seed + i, o[0] / 2, o[1] / 2, o[2] / 2, 2) * 1.2)
      : ex.kind === "peas" ? ellipsoid(3.8, 3.6, 3.8, 12, 8)
      : ex.kind === "carrot" ? box(4.5, 4, 4.5, 6, 10, 8)
      : ex.kind === "scallion" ? transform(lathe(profile([[2.4, 0], [2.6, 0.3], [2.6, 1.6], [2.4, 1.9], [1.7, 1.9], [1.5, 1.6], [1.5, 0.3], [1.7, 0]]), { nu: 16, nv: 8 }), { rx: 80 })
      : ex.kind === "onion" ? displace(ellipsoid(4, 1, 2, 10, 6), o => fbm3(seed + i, o[0], o[1], o[2], 2) * 0.6)
      : displace(ellipsoid(3, 1.4, 2.4, 8, 6), o => fbm3(seed + i, o[0], o[1], o[2], 2) * 0.8);
    const surf: SurfaceFn = ex.kind === "egg" ? (s, o) => { setMix(o.albedo, C("#f2c53a"), C("#f6e6a0"), sst(-0.3, 0.5, fbm3(seed, s.o[0] / 3, s.o[1] / 3, s.o[2] / 3, 2))); o.rough = 0.35; o.coat = 0.4; o.mfp[0] = 1.5; o.mfp[1] = 1.2; o.mfp[2] = 0.4; o.height = fbm3(seed + 1, s.o[0], s.o[1], s.o[2], 2) * 0.15; }
      : ex.kind === "peas" ? smooth("#6aa83a", { rough: 0.2, gloss: 0.7, scatter: 0.3, trans: 0.3, seed })
      : ex.kind === "carrot" ? smooth("#e8701e", { rough: 0.3, gloss: 0.5, scatter: 0.2, seed })
      : ex.kind === "scallion" ? smooth("#7aa83a", { rough: 0.3, gloss: 0.4, scatter: 0.3, trans: 0.5, seed })
      : ex.kind === "onion" ? fried({ bake: 0.75, base: "#c8803a", seed })
      : (s, o) => { setMix(o.albedo, C("#2a140a"), C("#6a3416"), sst(-0.4, 0.5, fbm3(seed, s.o[0], s.o[1], s.o[2], 2))); o.rough = 0.5; };
    out.push(part(ex.kind, transform(surfaceScatter(base, ex.count, make, { seed: seed + ex.kind.length * 7, sink: 1, keep: (_o, n) => n[1] > 0 }), pl), surf));
  }
  return grouped(out);
}
