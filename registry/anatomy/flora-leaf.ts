/**
 * FLORA2 leaf blades. The outline is an implicit function in the leaf plane (x across, y along the midrib from the
 * petiole junction): the half-width curve, cordate lobes and sinus, serration, and fenestration (pinnatifid splits and
 * hole rows) laid out in the coordinates of the lateral veins, so cuts run between the veins as on a Monstera leaf. A
 * grid is cut by the outline with marching triangles: the boundary is exact to the grid, the inside stays a regular
 * grid that bends well. The blade is then folded, pleated, ruffled, twisted and bent along its midrib by the heavy
 * elastica. Fleshy leaves get a top and a bottom sheet that meet at the margin.
 *
 * Leaf frame: the junction at the origin, the midrib along +y, the upper (adaxial) side facing +z.
 */
import { seeded } from "./foundation-shapes";
import type { BladeSpec } from "./flora-profile";
import { DEG, MeshBuffer, clamp, drawRange, heavyElastica, lerp, smooth } from "./flora-math";
import type { MeshData, V3 } from "./flora-math";

export interface BladeOptions {
  seed: number;
  /** Cells across the blade width. */
  resolution: number;
  /** Most triangles for an uncut blade (rows are cut back to fit). */
  triangles?: number;
  /** 0 juvenile → 1 adult. Fenestration starts at `fenestration.onset`. */
  maturity: number;
  /** Hole rows the fidelity level allows. */
  holeRows: number;
  /** Lamina length (m). Default: the typical length. */
  length?: number;
  /** 0 shade → 1 full sun: picks the hole-area fraction between its measured min and max. */
  light?: number;
  /** Linear-RGB colour at s from the base (0) to the tip (1), and a from the midrib (0) to the margin (1). */
  colour: (s: number, a: number) => V3;
}

export interface BladeStats { area: number; holeArea: number; holes: number; splits: number; triangles: number }
export interface BladeMesh { mesh: MeshData; stats: BladeStats; layout: BladeLayout }

/** The blade's outline and vein coordinates, shared by the mesh and its vein texture. */
export interface BladeLayout {
  /** Lamina length, max half-width, and the y of the base and the apex (m). */
  L: number; W: number; yBase: number; yApex: number;
  halfWidth(y: number): number;
  /** Lateral-vein coordinate: k is an integer on a lateral vein; alpha the vein angle from the midrib (rad). */
  veinAt(x: number, y: number): { k: number; alpha: number };
  /** Distance along the midrib between lateral origins (m), the number of laterals per side, the first origin. */
  spacing: number; laterals: number; first: number;
  parallel: boolean;
}

/** Outline and vein layout of a blade of length L. */
export function bladeLayout(spec: BladeSpec, L: number): BladeLayout {
  const W = spec.width * L / 2, lobe = spec.lobe ?? 0, yBase = -lobe * L, yApex = (1 - lobe) * L;
  const m = clamp(spec.widestAt, 0.05, 0.95), a = spec.baseShape, b = spec.apexShape;
  const margin = spec.margin;
  const halfWidth = (y: number) => {
    const s = (y - yBase) / L;
    if (s <= 0 || s >= 1) return 0;
    let w = s <= m ? Math.sin(Math.PI / 2 * s / m) ** a : Math.sin(Math.PI / 2 * (1 - s) / (1 - m)) ** b;
    if (spec.waist) w *= 1 - spec.waist.depth * Math.exp(-(((s - spec.waist.at) / 0.16) ** 2));
    if (spec.mucro && 1 - s < spec.mucro * 2.5) w *= Math.min(1, ((1 - s) / (spec.mucro * 2.5)) ** 0.85 * 1.15);
    if (margin?.kind === "serrate") { const f = (s * margin.count) % 1, tooth = f < 0.75 ? f / 0.75 : (1 - f) / 0.25; w *= 1 - margin.depth * (1 - tooth) * smooth(s * 6) * smooth((1 - s) * 8); }
    else if (margin?.kind === "undulate") w *= 1 + margin.depth * Math.sin(2 * Math.PI * margin.count * s);
    else if (margin?.kind === "lobed") w *= 1 - margin.depth * (0.5 + 0.5 * Math.cos(2 * Math.PI * ((s * margin.count) % 1))) ** 2 * smooth(s * 5) * smooth((1 - s) * 5);
    return W * w;
  };
  const n = Math.max(1, spec.veins.laterals), first = lobe > 0 ? 0.01 * L : 0.05 * yApex, last = 0.9 * yApex;
  const spacing = n > 1 ? (last - first) / (n - 1) : last - first;
  const tip = spec.veins.angle * DEG, base = (spec.veins.baseAngle ?? spec.veins.angle + 12) * DEG, curve = spec.veins.curve ?? 0.3;
  const alphaAt = (y0: number) => clamp(lerp(base, tip, smooth((y0 - first) / (last - first || 1)) ** 0.6), 12 * DEG, 168 * DEG);
  const veinAt = (x: number, y: number) => {
    const ax = Math.abs(x);
    let y0 = y - ax / Math.tan(tip);
    for (let i = 0; i < 7; i++) y0 = lerp(y0, y - ax / Math.tan(alphaAt(y0)) - curve * ax * ax / W, 0.7);
    return { k: (y0 - first) / spacing, alpha: alphaAt(y0) };
  };
  return { L, W, yBase, yApex, halfWidth, veinAt, spacing, laterals: n, first, parallel: spec.veins.style === "parallel" };
}

interface Cut { kind: "split" | "hole"; a0: number; half: number; hl: number; hw: number; at: number; shift: number }

/** Builds a blade mesh in the leaf frame. */
export function buildBlade(spec: BladeSpec, o: BladeOptions): BladeMesh {
  const rng = seeded(o.seed);
  const L = o.length ?? spec.length.typical, lay = bladeLayout(spec, L), { W, yBase, yApex, halfWidth, veinAt, spacing, laterals } = lay;
  // Fenestration, laid out per side and per panel between two laterals.
  const fen = spec.fenestration && !lay.parallel ? spec.fenestration : undefined;
  const ripe = fen ? smooth((o.maturity - fen.onset) / Math.max(0.05, 1 - fen.onset)) : 0;
  const cuts: Cut[][][] = [[], []];
  let splitCount = 0, holeCount = 0;
  if (fen && ripe > 0) {
    for (let side = 0; side < 2; side++) {
      const panels = laterals - 1, want = fen.splits ? Math.round(drawRange(rng, fen.splits.perSide) * ripe) : 0;
      const splitAt = new Set<number>();
      for (let j = 0; j < Math.min(want, panels); j++) splitAt.add(Math.min(panels - 1, Math.floor((j + 0.5) * panels / Math.min(want, panels) + (rng() - 0.5) * 0.6)));
      for (let i = 0; i < panels; i++) {
        const list: Cut[] = [];
        let inner = 1;
        if (splitAt.has(i) && fen.splits) {
          const reach = lerp(fen.splits.reach[0], fen.splits.reach[1], rng()) * (0.45 + 0.55 * ripe);
          inner = 1 - reach;
          list.push({ kind: "split", a0: inner, half: fen.splits.gap / 2 * (0.75 + 0.5 * rng()), hl: 0, hw: 0, at: 0, shift: (rng() - 0.5) * 0.15 });
          splitCount++;
        }
        (fen.holes?.rows ?? []).slice(0, o.holeRows).forEach((row, r) => {
          if (ripe < r * 0.3 + 0.05 || rng() > row.chance) return;
          const len = row.length * (0.75 + 0.5 * rng()), at = row.at * (0.92 + 0.16 * rng());
          if (at + len * spacing / (2 * W) > inner - 0.07) return;
          list.push({ kind: "hole", a0: 0, half: 0, hl: len / 2, hw: row.width * (0.7 + 0.5 * rng()) / 2, at, shift: (rng() - 0.5) * 0.2 });
          holeCount++;
        });
        cuts[side][i] = list;
      }
    }
  }
  const sinus = (spec.sinus ?? 0) * W, lobeDepth = -yBase;
  let holeScale = 1;
  const field = (x: number, y: number, withHoles = true) => {
    const ax = Math.abs(x), w = halfWidth(y);
    let f = ax - w;
    if (sinus > 0 && y < 0) f = Math.max(f, sinus * (-y / lobeDepth) ** 0.8 - ax);
    if (f >= 0 || !fen || ripe <= 0) return f;
    const { k, alpha } = veinAt(x, y), i = Math.floor(k), list = cuts[x < 0 ? 0 : 1][i];
    if (!list) return f;
    const sa = Math.sin(alpha), across = spacing * sa, a = ax / Math.max(1e-6, w);
    for (const c of list) {
      const u = (k - (i + 0.5 + c.shift)) * across;
      if (c.kind === "split") {
        const end = 0.1 * c.half * across + 0.004 * W;
        const d = a <= c.a0 ? Math.hypot(u, (c.a0 - a) * w) - end : Math.abs(u) - (end + c.half * across * ((a - c.a0) / (1 - c.a0)) ** 0.9);
        f = Math.max(f, -d);
      } else if (withHoles) {
        const hl = c.hl * spacing * holeScale, hw = c.hw * across * holeScale, l = ax / sa, lc = c.at * w / sa;
        const d = (Math.hypot(u / hw, (l - lc) / hl) - 1) * Math.min(hw, hl);
        f = Math.max(f, -d);
      }
    }
    return f;
  };
  // Scale the holes so their area matches the measured fraction for this light.
  const target = fen?.holes?.areaFraction ? lerp(fen.holes.areaFraction.min, fen.holes.areaFraction.max, o.light ?? 0.8) : 0;
  const estimate = () => {
    let blade = 0, holes = 0;
    const N = 90;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const x = -W + (i + 0.5) / N * 2 * W, y = yBase + (j + 0.5) / N * (yApex - yBase);
      if (field(x, y, false) < 0) { blade++; if (field(x, y) >= 0) holes++; }
    }
    return { cell: (2 * W * (yApex - yBase)) / (N * N), blade, holes };
  };
  if (target > 0 && holeCount > 0) {
    const e = estimate(), ratio = e.holes / Math.max(1, e.blade - e.holes);
    if (ratio > 0) holeScale = clamp(Math.sqrt(target / ratio), 0.4, 2.2);
  }
  const pts: number[] = [], tris: number[] = [];
  if (!(fen && ripe > 0) && !(sinus > 0)) {
    // No cuts: a strip that follows the outline exactly (cheap for the thousands of small leaves on a tree).
    const sx = Math.max(2, Math.round(o.resolution)), sy = Math.max(3, Math.min(sx * 10, Math.round(sx * (yApex - yBase) / (2 * W) * 0.45) + 3, Math.round((o.triangles ?? Infinity) / (2 * sx)), Math.max(12, Math.round(o.resolution * 2.5))));
    for (let j = 0; j <= sy; j++) {
      const y = yBase + (yApex - yBase) * (j / sy), w = halfWidth(y);
      for (let i = 0; i <= sx; i++) pts.push((-1 + 2 * i / sx) * w, y);
    }
    for (let j = 0; j < sy; j++) for (let i = 0; i < sx; i++) {
      const a = j * (sx + 1) + i, c = a + sx + 2;
      tris.push(a, a + 1, c, a, c, a + sx + 1);
    }
  } else marchingTriangles();
  function marchingTriangles() {
  // Marching triangles over a regular grid.
  const nx = Math.max(4, Math.round(o.resolution)), hx = 2.04 * W / nx;
  const ny = Math.min(nx * 6, Math.max(nx, Math.round((yApex - yBase) / hx * 0.7))), hy = (yApex - yBase + 0.02 * L) / ny;
  const x0 = -1.02 * W, y0 = yBase - 0.01 * L, stride = nx + 1;
  const gx = (i: number) => x0 + i * hx, gy = (j: number) => y0 + j * hy;
  const F = new Float32Array(stride * (ny + 1));
  for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) F[j * stride + i] = field(gx(i), gy(j));
  const gridVert = new Map<number, number>(), edgeVert = new Map<number, number>();
  const at = (g: number) => {
    let v = gridVert.get(g);
    if (v === undefined) { v = pts.length / 2; pts.push(gx(g % stride), gy(Math.floor(g / stride))); gridVert.set(g, v); }
    return v;
  };
  const crossing = (ga: number, gb: number) => {
    const key = ga < gb ? ga * 4194304 + gb : gb * 4194304 + ga;
    let v = edgeVert.get(key);
    if (v !== undefined) return v;
    let ax = gx(ga % stride), ay = gy(Math.floor(ga / stride)), fa = F[ga], bx = gx(gb % stride), by = gy(Math.floor(gb / stride)), fb = F[gb];
    let x = ax, y = ay;
    for (let it = 0; it < 3; it++) {
      const t = clamp(fa / (fa - fb), 0.001, 0.999);
      x = lerp(ax, bx, t); y = lerp(ay, by, t);
      const fm = field(x, y);
      if (Math.abs(fm) < 1e-7) break;
      if ((fm < 0) === (fa < 0)) { ax = x; ay = y; fa = fm; } else { bx = x; by = y; fb = fm; }
    }
    v = pts.length / 2; pts.push(x, y); edgeVert.set(key, v);
    return v;
  };
  const clip = (a: number, b: number, c: number) => {
    const ia = F[a] < 0, ib = F[b] < 0, ic = F[c] < 0, count = +ia + +ib + +ic;
    if (count === 0) return;
    if (count === 3) { tris.push(at(a), at(b), at(c)); return; }
    // Rotate so the odd vertex comes first, keeping the winding.
    let [p, q, r] = [a, b, c];
    const odd = count === 1 ? (ia ? 0 : ib ? 1 : 2) : (!ia ? 0 : !ib ? 1 : 2);
    if (odd === 1) [p, q, r] = [b, c, a]; else if (odd === 2) [p, q, r] = [c, a, b];
    if (count === 1) tris.push(at(p), crossing(p, q), crossing(p, r));
    else { const pq = crossing(p, q), pr = crossing(p, r); tris.push(pq, at(q), at(r)); tris.push(pq, at(r), pr); }
  };
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const a = j * stride + i, b = a + 1, c = a + stride + 1, d = a + stride;
    if ((i + j) % 2 === 0) { clip(a, b, c); clip(a, c, d); } else { clip(a, b, d); clip(b, c, d); }
  }
  }
  let area = 0;
  for (let t = 0; t < tris.length; t += 3) {
    const [i, j, k] = [tris[t] * 2, tris[t + 1] * 2, tris[t + 2] * 2];
    area += ((pts[j] - pts[i]) * (pts[k + 1] - pts[i + 1]) - (pts[k] - pts[i]) * (pts[j + 1] - pts[i + 1])) / 2;
  }
  // Shape in 3D: fold, cup, pleats, ruffle, twist, thickness, then bend the midrib by the elastica.
  // A negative droop curls the blade toward its upper face: the mirrored elastica.
  const pitch = (spec.droopPitch ?? 20) * DEG, g = spec.droop ?? 0;
  const bend = g >= 0 ? heavyElastica(pitch, g, 32).map(t => t - pitch) : heavyElastica(-pitch, -g, 32).map(t => -t - pitch);
  const midrib: [number, number][] = [[0, 0]];
  for (let i = 1; i < bend.length; i++) {
    const t = (bend[i - 1] + bend[i]) / 2, [py, pz] = midrib[i - 1];
    midrib.push([py + Math.cos(t) * yApex / 32, pz + Math.sin(t) * yApex / 32]);
  }
  const fold = Math.tan((spec.fold ?? 0) * DEG), cup = spec.cup ?? 0, pleat = spec.corrugation ?? 0, ruffle = spec.ruffle ?? 0, twist = (spec.twist ?? 0) * DEG;
  const thick = spec.thickness ?? 0, fleshy = thick > 0.001, keel = spec.keel ?? 0, phase = rng() * Math.PI * 2;
  const shape = (x: number, y: number, side: number): V3 => {
    const w = Math.max(1e-6, halfWidth(y)), a = clamp(Math.abs(x) / w), s = (y - yBase) / L;
    let z = Math.abs(x) * fold + cup * W * a * a;
    if (pleat && !lay.parallel) { const { k } = veinAt(x, y); z += pleat * W * 0.5 * (1 - Math.cos(2 * Math.PI * k)) * a * (1 - a) * 4; }
    if (ruffle) z += ruffle * W * Math.sin(2 * Math.PI * y / (0.06 * L) + phase) * smooth((a - 0.55) / 0.45) * smooth(s * 4);
    if (fleshy) { const t = thick * Math.sqrt(Math.max(0, 1 - a * a)) * (1 - 0.45 * s); z += side > 0 ? t / 2 : -t / 2 - keel * t * (1 - a) ** 2; }
    const tw = twist * clamp(s), cx = x * Math.cos(tw) - z * Math.sin(tw), cz = x * Math.sin(tw) + z * Math.cos(tw);
    const u = clamp(y / yApex) * 32, i = Math.min(31, Math.floor(u)), f = u - i;
    const th = y < 0 ? 0 : lerp(bend[i], bend[i + 1], f);
    const my = y < 0 ? y : lerp(midrib[i][0], midrib[i + 1][0], f), mz = y < 0 ? 0 : lerp(midrib[i][1], midrib[i + 1][1], f);
    return [cx, my - cz * Math.sin(th), mz + cz * Math.cos(th)];
  };
  const out = new MeshBuffer(), sheets = fleshy ? [1, -1] : [1];
  for (const side of sheets) {
    const base = out.count;
    for (let i = 0; i < pts.length; i += 2) {
      const x = pts[i], y = pts[i + 1], v = (y - yBase) / (yApex - yBase);
      out.vertex(shape(x, y, side), 0.5 + x / (2 * W), v, o.colour(clamp(v), clamp(Math.abs(x) / Math.max(1e-6, halfWidth(y)))));
    }
    for (let t = 0; t < tris.length; t += 3) {
      if (side > 0) out.tri(base + tris[t], base + tris[t + 1], base + tris[t + 2]);
      else out.tri(base + tris[t], base + tris[t + 2], base + tris[t + 1]);
    }
  }
  const e = holeCount > 0 ? estimate() : undefined;
  const holeArea = e ? e.holes * e.cell : 0;
  return { mesh: out.build(), layout: lay, stats: { area, holeArea, holes: holeCount, splits: splitCount, triangles: out.idx.length / 3 } };
}
