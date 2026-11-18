/**
 * Paper transitions (registry item `material-transitions`). The outgoing scene is a printed page; the incoming scene is
 * the page under it.
 *
 * - **peel**: the page curls back from a corner around a cylinder whose radius grows as more of the page lifts (the
 *   standard cylinder page-curl, as in Hong et al. 2006), and lies back over itself. Seen from above, the curl and the
 *   flap show the page's back: paper, with the print showing through faintly, mirrored (thin stock passes about a tenth
 *   of the light, Kubelka–Munk). The curl is shaded as a cylinder lit from the upper left, the flap casts a soft shadow
 *   on the page, and the lifted curl shades the page beneath.
 * - **tear**: the page is ripped in two. The tear runs from the top edge to the bottom along a rough, self-affine path
 *   (rupture lines in paper have a roughness exponent near 0.65; Kertész, Horváth & Weber 1993; Santucci et al.), faster
 *   as it goes. Behind the tip the halves open into a V, hinged at the tip; once it reaches the bottom they are pulled
 *   apart and away. One torn edge shows the paper's white core and loose fibres (torn toward the viewer); both halves cast
 *   soft shadows on the page beneath.
 */
import { clamp01, clipHalfPlane, clipToFrame, densify, eachCellInRing, frameRing, hash, positive, smooth } from "./material-kit";
import type { MaterialFrame, MaterialVector } from "./material-kit";
import type { MaterialDirection } from "./material-glass";

export type PaperKind = "peel" | "tear";

export interface PaperPlan {
  material: PaperKind;
  cols: number;
  rows: number;
  aspect: number;
  seed: number;
  direction: MaterialDirection;
  /** The paper's back (peel) or its core (tear). */
  color: string;
  /** tear: the rough path from the top edge to the bottom, [x0, y0, …], with arc length (0..1) at each point. */
  path: number[];
  along: number[];
  /** tear: how far each half travels once free, so it leaves the frame by the end. */
  away: [number, number];
}

export const PAPER_FRAMES: Readonly<Record<PaperKind, number>> = { peel: 36, tear: 42 };
const DEFAULT_COLOR: Record<PaperKind, string> = { peel: "#f3efe6", tear: "#fbfaf5" };
/** Light from the upper left, in the frame's plane, and its height. */
const LIGHT = { x: -0.55, y: -0.72, z: 0.85 };
/** Magazine stock passes about this much light, so the print shows through its back. */
const SHOW_THROUGH = 0.12;

export function planPaper(material: PaperKind, opts: { cols: number; rows: number; aspect: number; seed: number; direction?: MaterialDirection; color?: string }): PaperPlan {
  const { cols, rows, aspect, seed } = opts;
  const base: PaperPlan = { material, cols, rows, aspect, seed, direction: opts.direction ?? (material === "peel" ? "left" : "down"), color: opts.color ?? DEFAULT_COLOR[material], path: [], along: [], away: [0, 0] };
  if (material === "peel") return base;
  // A self-affine tear path (Hurst exponent 0.65) by midpoint displacement, from just above the frame to just below.
  const H = 0.65, levels = 8, count = 2 ** levels + 1, ys = Array.from({ length: count }, (_, i) => -0.02 + (1.04 * i) / (count - 1));
  const xs = new Array<number>(count).fill(0);
  xs[0] = aspect * (0.5 + 0.1 * (hash(1, 0, seed) - 0.5));
  xs[count - 1] = aspect * (0.5 + 0.1 * (hash(2, 0, seed) - 0.5));
  for (let level = 0, step = count - 1; step > 1; level++, step /= 2) {
    const sigma = 0.11 * (step / (count - 1)) ** H;
    for (let i = step / 2; i < count; i += step) xs[i] = (xs[i - step / 2] + xs[i + step / 2]) / 2 + sigma * 2 * (hash(i, level, seed + 5) - 0.5);
  }
  const path: number[] = [], along: number[] = [0];
  for (let i = 0; i < count; i++) path.push(xs[i], ys[i]);
  let total = 0;
  for (let i = 1; i < count; i++) { total += Math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1]); along.push(total); }
  const plan = { ...base, path, along: along.map((v) => v / total) };
  // Each half travels far enough to leave the frame by the last frame.
  const reach = (side: number) => {
    const { rings } = tearHalves(plan, 1, side === 0 ? [0, 0] : [0, 0]);
    let far = 0;
    for (let i = 0; i < rings[side].length; i += 2) far = Math.max(far, side === 0 ? rings[side][i] : aspect - rings[side][i]);
    return far + 0.06;
  };
  plan.away = [reach(0), reach(1)];
  return plan;
}

export function paperFrame(plan: PaperPlan, progress: number): MaterialFrame {
  return plan.material === "peel" ? peelFrame(plan, clamp01(progress)) : tearFrame(plan, clamp01(progress));
}

/* ------------------------------------------------------------------ *
 * Peel
 * ------------------------------------------------------------------ */

function peelFrame(plan: PaperPlan, p: number): MaterialFrame {
  const { cols, rows, aspect } = plan, n = cols * rows;
  // The page lifts from a corner; n points from that corner across the page, the fold line runs across it.
  const [cx, cy, ax, ay] = ({ left: [aspect, 1, -1, -0.42], right: [0, 1, 1, -0.42], up: [aspect, 1, -0.36, -1], down: [aspect, 0, -0.36, 1] } as const)[plan.direction];
  const len = Math.hypot(ax, ay), nx = ax / len, ny = ay / len;
  const u = (x: number, y: number) => (x - cx) * nx + (y - cy) * ny;
  const U = Math.max(...[[0, 0], [aspect, 0], [0, 1], [aspect, 1]].map(([x, y]) => u(x, y)));
  // The curl loosens as more of the page comes up.
  const r = 0.026 + 0.05 * smooth(0, 1, p), rEnd = 0.076;
  const ease = p * p * (3 - 2 * p), fold = -0.012 + (U + rEnd + 0.03) * ease;
  const inside = (x: number, y: number) => x >= -1e-4 && y >= -1e-4 && x <= aspect + 1e-4 && y <= 1 + 1e-4;
  const owner = new Int16Array(n).fill(-1), dx = new Float32Array(n), dy = new Float32Array(n);
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const k = i + j * cols, x = ((i + 0.5) / cols) * aspect, y = (j + 0.5) / rows, us = u(x, y);
    const at = (ur: number) => [x + nx * (ur - us), y + ny * (ur - us)] as const;
    if (us >= fold) {
      // On top: the flap, the page's back lying over itself, mirrored about the cylinder's top.
      const [fx, fy] = at(2 * fold - Math.PI * r - us);
      if (inside(fx, fy)) { owner[k] = 1; dx[k] = fx - x; dy[k] = fy - y; } else owner[k] = 0;
    } else if (us >= fold - r) {
      const s = (fold - us) / r;
      const [bx, by] = at(fold - r * (Math.PI - Math.asin(s)));
      if (inside(bx, by)) { owner[k] = 2; dx[k] = bx - x; dy[k] = by - y; continue; }
      // Where the upper half of the curl has no paper, its lower half shows the front, curving away.
      const [lx, ly] = at(fold - r * Math.asin(s));
      if (inside(lx, ly)) { owner[k] = 3; dx[k] = lx - x; dy[k] = ly - y; }
    }
  }
  // The same regions as exact outlines: the flat page, the flap and the two halves of the curl.
  const frame = frameRing(aspect), c0 = cx * nx + cy * ny;
  const strip = (lo: number, hi: number) => { const a = clipHalfPlane(frame, nx, ny, c0 + lo); return a.length ? clipHalfPlane(a, -nx, -ny, -(c0 + hi)) : []; };
  const map = (ring: number[], f: (ur: number) => number) => {
    const out: number[] = [];
    for (let i = 0; i < ring.length; i += 2) { const ur = u(ring[i], ring[i + 1]), us = f(ur); out.push(ring[i] + nx * (us - ur), ring[i + 1] + ny * (us - ur)); }
    return out.length >= 6 ? positive(out) : [];
  };
  const flat = strip(fold, 99);
  const flap = map(strip(-99, fold - Math.PI * r), (ur) => 2 * fold - Math.PI * r - ur);
  const curlUp = map(densify(strip(fold - Math.PI * r, fold - (Math.PI * r) / 2), 0.004), (ur) => fold - r * Math.sin((fold - ur) / r));
  const curlDown = map(densify(strip(fold - (Math.PI * r) / 2, fold), 0.004), (ur) => fold - r * Math.sin((fold - ur) / r));
  const paper = [flat, flap, curlUp, curlDown].filter((ring) => ring.length);
  const vectors: MaterialVector[] = [];
  const lifted = smooth(0, 0.05, p) * (1 - smooth(0.95, 1, p));
  // The lifted curl shades the page beneath it, darkest at the curl.
  const shade = 0.05 + 1.4 * r, edge = fold - r;
  const under = strip(edge - shade, edge);
  if (under.length) vectors.push({ id: "peel-shadow", rings: [under], closed: true, alpha: lifted, blend: "multiply", outside: paper,
    gradient: { x1: cx + nx * edge, y1: cy + ny * edge, x2: cx + nx * (edge - shade), y2: cy + ny * (edge - shade), stops: [[0, "#1d1a16", 0.55], [0.35, "#1d1a16", 0.22], [1, "#1d1a16", 0]] } });
  // The flap lies just off the page: a soft shadow away from the light.
  if (flap.length) {
    const off = 0.006 + 0.08 * r, shadow: number[] = [];
    for (let i = 0; i < flap.length; i += 2) shadow.push(flap[i] - LIGHT.x * off, flap[i + 1] - LIGHT.y * off);
    vectors.push({ id: "flap-shadow", rings: [shadow], closed: true, fill: "#141210", alpha: 0.32 * lifted, blend: "multiply", blur: 5 + 60 * r, outside: [flap, curlUp] });
  }
  // The back of the page: paper over the mirrored print, which shows through faintly.
  const back = plan.color;
  if (flap.length) vectors.push({ id: "flap", rings: [flap], closed: true, alpha: 1 - SHOW_THROUGH, blend: "normal",
    gradient: { x1: cx + nx * fold, y1: cy + ny * fold, x2: cx + nx * (fold + 0.6), y2: cy + ny * (fold + 0.6), stops: [[0, back, 1], [1, mix(back, "#cfc8bb", 0.35), 1]] } });
  if (curlUp.length) {
    // A cylinder lit from the upper left: the back faces outward; at the top of the curl it faces the light.
    const stops: [number, string, number][] = [];
    const lu = LIGHT.x * nx + LIGHT.y * ny, ll = Math.hypot(lu, LIGHT.z);
    for (let q = 0; q <= 8; q++) {
      const phi = Math.PI / 2 + (q / 8) * (Math.PI / 2), nu = -Math.sin(phi), nz = -Math.cos(phi);
      const diffuse = Math.max(0, (nu * lu + nz * LIGHT.z) / ll), spec = Math.max(0, (nu * lu + nz * (LIGHT.z + 1)) / Math.hypot(lu, LIGHT.z + 1)) ** 24;
      // Offset 0 is at the curl's outer edge (u = fold − r), 1 at its top (u = fold).
      stops.push([1 - Math.sin(phi), mix(mix("#6f685d", back, 0.35 + 0.65 * diffuse), "#ffffff", 0.35 * spec), 1]);
    }
    stops.sort((a, b) => a[0] - b[0]);
    vectors.push({ id: "curl", rings: [curlUp], closed: true, alpha: 1 - SHOW_THROUGH, blend: "normal",
      gradient: { x1: cx + nx * (fold - r), y1: cy + ny * (fold - r), x2: cx + nx * fold, y2: cy + ny * fold, stops } });
  }
  if (curlDown.length) vectors.push({ id: "curl-front", rings: [curlDown], closed: true, alpha: 0.6, blend: "multiply",
    gradient: { x1: cx + nx * (fold - r), y1: cy + ny * (fold - r), x2: cx + nx * fold, y2: cy + ny * fold, stops: [[0, "#3a352e", 1], [1, "#ffffff", 1]] } });
  return { reveal: new Uint8ClampedArray(n).fill(255), layers: [], vectors, warpOut: { dx, dy, owner }, outClip: paper, incomingBelow: true };
}

/** Mix two #rrggbb colours. */
function mix(a: string, b: string, t: number): string {
  const ca = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16)), cb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return "#" + ca.map((v, i) => Math.round(v + (cb[i] - v) * clamp01(t)).toString(16).padStart(2, "0")).join("");
}

/* ------------------------------------------------------------------ *
 * Tear
 * ------------------------------------------------------------------ */

/** Tear progress: the tip runs from top to bottom by 0.5, faster as it goes; then the halves are free. */
const tipAt = (p: number) => clamp01((p - 0.04) / 0.46) ** 1.35;
const freeAt = (p: number) => clamp01((p - 0.5) / 0.5);

/** The point at arc length s (0..1) along the tear path. */
function pathPoint(plan: PaperPlan, s: number): [number, number] {
  const { path, along } = plan;
  let lo = 0, hi = along.length - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (along[mid] <= s) lo = mid; else hi = mid; }
  const t = clamp01((s - along[lo]) / Math.max(1e-9, along[hi] - along[lo]));
  return [path[2 * lo] + (path[2 * hi] - path[2 * lo]) * t, path[2 * lo + 1] + (path[2 * hi + 1] - path[2 * lo + 1]) * t];
}

/**
 * Each half's motion at progress p: while the tear runs, a turn about the tip that fades out below it (the halves are
 * still joined there); once free, the whole half turns and travels away. Returns a forward map (rest → frame).
 */
function halfMotion(plan: PaperPlan, p: number, side: number, away: readonly [number, number]) {
  const s = tipAt(p), free = freeAt(p), [tx, ty] = pathPoint(plan, s), sign = side === 0 ? -1 : 1;
  const open = 0.1 * s + 0.32 * free * free, lift = 1 + 0.03 * s + 0.05 * free;
  const go = away[side] * free ** 2.1, drop = 0.18 * free * free;
  return (x: number, y: number): [number, number] => {
    // Joined below the tip: the turn fades in over a quarter of the frame above it, and is whole once free.
    const w = Math.max(smooth(ty, ty - 0.28, y), smooth(0, 0.25, free));
    const a = sign * open * w, ca = Math.cos(a), sa = Math.sin(a), px = (x - tx) * lift, py = (y - ty) * lift;
    return [tx + px * ca - py * sa + sign * go, ty + px * sa + py * ca + drop];
  };
}

/** The two halves' outlines at progress p: the frame either side of the tear path, moved. */
function tearHalves(plan: PaperPlan, p: number, away: readonly [number, number]) {
  const { path, aspect } = plan;
  const left = clipToFrame([-0.05, -0.05, ...path, -0.05, 1.05], aspect);
  const reversed: number[] = [];
  for (let i = path.length - 2; i >= 0; i -= 2) reversed.push(path[i], path[i + 1]);
  const right = clipToFrame([aspect + 0.05, -0.05, aspect + 0.05, 1.05, ...reversed], aspect);
  const rest = [densify(left, 0.01), densify(right, 0.01)];
  const motions = [halfMotion(plan, p, 0, away), halfMotion(plan, p, 1, away)];
  const rings = rest.map((ring, side) => {
    const out: number[] = [];
    for (let i = 0; i < ring.length; i += 2) out.push(...motions[side](ring[i], ring[i + 1]));
    return positive(out);
  });
  return { rings, rest, motions };
}

function tearFrame(plan: PaperPlan, p: number): MaterialFrame {
  const { cols, rows, aspect } = plan, n = cols * rows;
  const { rings, motions } = tearHalves(plan, p, plan.away);
  const owner = new Int16Array(n).fill(-1), dx = new Float32Array(n), dy = new Float32Array(n);
  rings.forEach((ring, side) => eachCellInRing(ring, cols, rows, aspect, (k) => {
    const x = (((k % cols) + 0.5) / cols) * aspect, y = (Math.floor(k / cols) + 0.5) / rows;
    // Invert the half's map by fixed-point iteration (it contracts: the turn stays under half a radian).
    let rx = x, ry = y;
    for (let it = 0; it < 24; it++) {
      const [fx, fy] = motions[side](rx, ry);
      rx += x - fx; ry += y - fy;
    }
    if (rx < -0.002 || ry < -0.002 || rx > aspect + 0.002 || ry > 1.002) return;
    owner[k] = side; dx[k] = rx - x; dy[k] = ry - y;
  }));
  const s = tipAt(p), free = freeAt(p), torn = smooth(0, 0.03, s);
  const vectors: MaterialVector[] = [];
  // The halves are held off the page: soft shadows on the page beneath, growing as they lift.
  const lift = 0.004 + 0.012 * s + 0.02 * free;
  vectors.push({ id: "tear-shadow", rings: rings.map((ring) => { const o: number[] = []; for (let i = 0; i < ring.length; i += 2) o.push(ring[i] + lift * 0.6, ring[i + 1] + lift); return o; }),
    closed: true, fill: "#121010", alpha: 0.4 * torn, blend: "multiply", blur: 6 + 500 * lift, outside: rings });
  // The torn edges, as far as the tear has run.
  const { path, along } = plan;
  const edge: number[] = [];
  for (let i = 0; i < along.length && along[i] <= s; i++) edge.push(path[2 * i], path[2 * i + 1]);
  if (edge.length >= 4 && torn > 0) {
    const [tx, ty] = pathPoint(plan, s);
    edge.push(tx, ty);
    // The right half's edge shows the white core: a ragged band a millimetre or so wide, with loose fibres.
    const core: number[] = [], inner: number[] = [], fibres: number[][] = [];
    for (let i = 0; i < edge.length; i += 2) {
      const q = i / 2, x = edge[i], y = edge[i + 1], width = 0.0035 + 0.004 * hash(q, 3, plan.seed) ** 2;
      core.push(...motions[1](x - 0.0004, y));
      inner.push(...motions[1](x + width, y));
      if (hash(q, 5, plan.seed) < 0.55) {
        const len = 0.002 + 0.006 * hash(q, 6, plan.seed), ang = Math.PI + (hash(q, 7, plan.seed) - 0.5) * 1.6;
        fibres.push([...motions[1](x, y), ...motions[1](x + len * Math.cos(ang), y + len * Math.sin(ang))]);
      }
    }
    const band: number[] = [...core];
    for (let i = inner.length - 2; i >= 0; i -= 2) band.push(inner[i], inner[i + 1]);
    vectors.push({ id: "tear-core", rings: [band], closed: true, fill: plan.color, alpha: 0.95 * torn, blend: "normal" });
    vectors.push({ id: "tear-fibres", rings: fibres, closed: false, stroke: plan.color, width: 0.9, alpha: 0.85 * torn, blend: "normal" });
    // The left half's edge: the paper's thickness in shadow.
    const shade: number[] = [];
    for (let i = 0; i < edge.length; i += 2) shade.push(...motions[0](edge[i], edge[i + 1]));
    vectors.push({ id: "tear-edge", rings: [shade], closed: false, stroke: "#2b2723", width: 1.6, alpha: 0.45 * torn, blend: "multiply" });
  }
  return { reveal: new Uint8ClampedArray(n).fill(255), layers: [], vectors, warpOut: { dx, dy, owner }, outClip: rings, incomingBelow: true };
}
