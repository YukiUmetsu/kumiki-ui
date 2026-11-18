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
 * - **fold**: the page is folded like a letter. The right half lifts about a crease and, in perspective, swings over onto
 *   the left, showing its back (paper, the print faintly through it, mirrored); then the bottom half of the folded page
 *   swings up onto the top; then the quarter-size packet is tossed away. Each flap is lit by its tilt (Lambert, light
 *   from the upper left), casts a soft shadow that widens with its height, and its crease catches a line of light.
 */
import { clamp01, clipHalfPlane, clipToFrame, densify, eachCellInRing, frameRing, hash, positive, smooth } from "./material-kit";
import type { MaterialFrame, MaterialVector } from "./material-kit";
import type { MaterialDirection } from "./material-glass";

export type PaperKind = "peel" | "tear" | "fold";

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

export const PAPER_FRAMES: Readonly<Record<PaperKind, number>> = { peel: 36, tear: 42, fold: 48 };
const DEFAULT_COLOR: Record<PaperKind, string> = { peel: "#f3efe6", tear: "#fbfaf5", fold: "#f3efe6" };
/** Light from the upper left, in the frame's plane, and its height. */
const LIGHT = { x: -0.55, y: -0.72, z: 0.85 };
/** Magazine stock passes about this much light, so the print shows through its back. */
const SHOW_THROUGH = 0.12;

export function planPaper(material: PaperKind, opts: { cols: number; rows: number; aspect: number; seed: number; direction?: MaterialDirection; color?: string }): PaperPlan {
  const { cols, rows, aspect, seed } = opts;
  const base: PaperPlan = { material, cols, rows, aspect, seed, direction: opts.direction ?? (material === "peel" ? "left" : "down"), color: opts.color ?? DEFAULT_COLOR[material], path: [], along: [], away: [0, 0] };
  if (material === "peel" || material === "fold") return base;
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
  const p = clamp01(progress);
  return plan.material === "peel" ? peelFrame(plan, p) : plan.material === "fold" ? foldFrame(plan, p) : tearFrame(plan, p);
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
 * Fold
 * ------------------------------------------------------------------ */

/** An affine map of 3D space: x' = A·x + t, stored row-major as [a00 a01 a02 t0, a10 a11 a12 t1, a20 a21 a22 t2]. */
type Affine = number[];
const IDENTITY: Affine = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0];
const compose = (m: Affine, n: Affine): Affine => {
  // m ∘ n: apply n first.
  const out = new Array<number>(12);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) out[r * 4 + c] = m[r * 4] * n[c] + m[r * 4 + 1] * n[4 + c] + m[r * 4 + 2] * n[8 + c];
    out[r * 4 + 3] = m[r * 4] * n[3] + m[r * 4 + 1] * n[7] + m[r * 4 + 2] * n[11] + m[r * 4 + 3];
  }
  return out;
};
const apply = (m: Affine, x: number, y: number, z: number): [number, number, number] =>
  [m[0] * x + m[1] * y + m[2] * z + m[3], m[4] * x + m[5] * y + m[6] * z + m[7], m[8] * x + m[9] * y + m[10] * z + m[11]];
/** A turn by θ about the line through (cx, ·, cz) along y: +x swings toward the camera (+z), then over to −x. */
const turnAboutY = (theta: number, cx: number, cz: number): Affine => {
  const c = Math.cos(theta), s = Math.sin(theta);
  return [c, 0, -s, cx - c * cx + s * cz, 0, 1, 0, 0, s, 0, c, cz - s * cx - c * cz];
};
/** A turn by θ about the line through (·, cy, cz) along x: +y (down the frame) swings toward the camera, then over to −y. */
const turnAboutX = (theta: number, cy: number, cz: number): Affine => {
  const c = Math.cos(theta), s = Math.sin(theta);
  return [1, 0, 0, 0, 0, c, -s, cy - c * cy + s * cz, 0, s, c, cz - s * cy - c * cz];
};
/** The camera's distance from the page, frame heights: a normal lens, so a lifted flap grows a little toward the lens. */
const CAMERA_Z = 2.4;
/** One sheet's thickness, frame heights: folded layers lie this far apart, so they never share a plane. */
const PLY = 0.0016;
const easeFold = (t: number) => { const v = clamp01(t); return v < 0.5 ? 4 * v * v * v : 1 - (-2 * v + 2) ** 3 / 2; };

function foldFrame(plan: PaperPlan, p: number): MaterialFrame {
  const { cols, rows, aspect } = plan, n = cols * rows, A = aspect, cx = A / 2, cy = 0.5;
  // Three moves: fold the right half over, fold the bottom half up, toss the packet away.
  const t1 = easeFold((p - 0.03) / 0.35), t2 = easeFold((p - 0.42) / 0.28), t3 = clamp01((p - 0.74) / 0.26);
  const fold1 = turnAboutY(Math.PI * t1, cx, PLY / 2), folded1 = turnAboutY(Math.PI, cx, PLY / 2);
  const fold2 = turnAboutX(Math.PI * t2, cy, 1.5 * PLY);
  // The toss: lifted toward the lens, turned and thrown off to the lower left, faster and faster.
  const go = t3 * t3, lift = 0.2 * Math.sin(Math.PI * Math.min(1, t3 * 1.2)) * (1 - 0.4 * t3);
  const psi = -0.75 * go, cp = Math.cos(psi), sp = Math.sin(psi), px = A / 4, py = 0.25;
  const toss: Affine = [cp, -sp, 0, px - cp * px + sp * py - (A * 0.62) * go, sp, cp, 0, py - sp * px - cp * py + 1.05 * go, 0, 0, 1, lift];
  const quarter = (x0: number, y0: number, x1: number, y1: number) => [x0, y0, x1, y0, x1, y1, x0, y1];
  type Face = { rest: number[]; m: Affine };
  const faces: Face[] = t2 <= 0 && t3 <= 0
    ? [{ rest: quarter(0, 0, cx, 1), m: IDENTITY }, { rest: quarter(cx, 0, A, 1), m: fold1 }]
    : [
      { rest: quarter(0, 0, cx, cy), m: compose(toss, IDENTITY) },
      { rest: quarter(cx, 0, A, cy), m: compose(toss, folded1) },
      { rest: quarter(0, cy, cx, 1), m: compose(toss, fold2) },
      { rest: quarter(cx, cy, A, 1), m: compose(toss, compose(fold2, folded1)) },
    ];
  const light = [-0.45, -0.6, 0.66], ll = Math.hypot(light[0], light[1], light[2]);
  const C = { x: A / 2, y: 0.5 };
  const project = (w: [number, number, number]): [number, number] => { const k = CAMERA_Z / (CAMERA_Z - w[2]); return [C.x + (w[0] - C.x) * k, C.y + (w[1] - C.y) * k]; };
  const drawn = faces.map((face) => {
    const ring = densify(face.rest, 0.05), world: [number, number, number][] = [], screen: number[] = [];
    for (let i = 0; i < ring.length; i += 2) { const w = apply(face.m, ring[i], ring[i + 1], 0); world.push(w); screen.push(...project(w)); }
    // The face's normal, and which side faces the lens at its middle.
    const m = face.m, nx = m[4] * m[9] - m[8] * m[5], ny = m[8] * m[1] - m[0] * m[9], nz = m[0] * m[5] - m[4] * m[1];
    const mid = world.reduce((a, w) => [a[0] + w[0] / world.length, a[1] + w[1] / world.length, a[2] + w[2] / world.length], [0, 0, 0]);
    const front = nx * (C.x - mid[0]) + ny * (C.y - mid[1]) + nz * (CAMERA_Z - mid[2]) > 0, sign = front ? 1 : -1;
    const lambert = Math.max(0, (sign * (nx * light[0] + ny * light[1] + nz * light[2])) / ll) / (light[2] / ll);
    // The rest-plane-to-screen map is a homography; its inverse takes each pixel back to the page.
    const H = [CAMERA_Z * m[0] - C.x * m[8], CAMERA_Z * m[1] - C.x * m[9], CAMERA_Z * m[3] - C.x * m[11],
      CAMERA_Z * m[4] - C.y * m[8], CAMERA_Z * m[5] - C.y * m[9], CAMERA_Z * m[7] - C.y * m[11], -m[8], -m[9], CAMERA_Z - m[11]];
    return { face, world, screen: positive(screen), front, light: Math.min(1.12, 0.62 + 0.38 * lambert), depth: mid[2], inverse: invert3(H), height: Math.max(...world.map((w) => w[2])) };
  });
  // Far to near, so a flap above covers what lies under it.
  const order = drawn.map((_, i) => i).sort((a, b) => drawn[a].depth - drawn[b].depth);
  const owner = new Int16Array(n).fill(-1), dx = new Float32Array(n), dy = new Float32Array(n);
  for (const i of order) {
    const { inverse: h, screen, face } = drawn[i];
    const [x0, y0, x1, y1] = [face.rest[0], face.rest[1], face.rest[4], face.rest[5]];
    eachCellInRing(screen, cols, rows, aspect, (k) => {
      const x = (((k % cols) + 0.5) / cols) * aspect, y = (Math.floor(k / cols) + 0.5) / rows;
      const w = h[6] * x + h[7] * y + h[8], rx = (h[0] * x + h[1] * y + h[2]) / w, ry = (h[3] * x + h[4] * y + h[5]) / w;
      owner[k] = i;
      dx[k] = Math.min(x1 - 0.001, Math.max(x0 + 0.001, rx)) - x;
      dy[k] = Math.min(y1 - 0.001, Math.max(y0 + 0.001, ry)) - y;
    });
  }
  const vectors: MaterialVector[] = [];
  // A lifted flap's shadow on what lies flat below: its corners carried down along the light, softer the higher it is.
  for (const i of order) {
    const d = drawn[i];
    if (d.height < 0.004) continue;
    const shadow: number[] = [];
    for (const w of d.world) shadow.push(w[0] - (light[0] / light[2]) * w[2], w[1] - (light[1] / light[2]) * w[2]);
    const above = order.slice(order.indexOf(i)).map((j) => drawn[j].screen);
    vectors.push({ id: `fold-shadow-${i}`, rings: [shadow], closed: true, fill: "#141210", alpha: 0.34 * (1 - smooth(0.15, 0.45, d.height)) * (1 - t3), blend: "multiply", blur: 5 + 120 * d.height, outside: above });
  }
  // Each face: the page's back is paper with the print faintly through it; a tilted front darkens as it turns away.
  for (const i of order) {
    const d = drawn[i];
    if (!d.front) vectors.push({ id: `fold-back-${i}`, rings: [d.screen], closed: true, fill: shade(plan.color, d.light), alpha: 1 - SHOW_THROUGH, blend: "normal" });
    else if (d.light < 0.995) vectors.push({ id: `fold-tilt-${i}`, rings: [d.screen], closed: true, fill: "#000000", alpha: Math.min(0.55, 0.9 * (1 - d.light)), blend: "multiply" });
    else if (d.light > 1.005) vectors.push({ id: `fold-tilt-${i}`, rings: [d.screen], closed: true, fill: "#ffffff", alpha: 0.6 * (d.light - 1), blend: "screen" });
  }
  // Creases: a folded edge is a tight round bend that catches a line of light.
  const crease = (a: [number, number, number], b: [number, number, number]) => [...project(a), ...project(b)];
  const creases: number[][] = [];
  if (t1 > 0.02) creases.push(crease(apply(faces.length === 2 ? IDENTITY : faces[0].m, cx, 0, 0), apply(faces.length === 2 ? IDENTITY : faces[2].m, cx, 1, 0)));
  if (t2 > 0.02) creases.push(crease(apply(faces[2].m, 0, cy, 0), apply(faces[2].m, cx, cy, 0)));
  if (creases.length) {
    vectors.push({ id: "fold-crease-shade", rings: creases, closed: false, stroke: "#2a2620", width: 2.6, alpha: 0.3, blend: "multiply" });
    vectors.push({ id: "fold-crease-light", rings: creases, closed: false, stroke: "#ffffff", width: 1.1, alpha: 0.55, blend: "screen" });
  }
  return { reveal: new Uint8ClampedArray(n).fill(255), layers: [], vectors, warpOut: { dx, dy, owner }, outClip: drawn.map((d) => d.screen), incomingBelow: true };
}

/** The inverse of a 3×3 matrix, row-major. */
function invert3(m: number[]): number[] {
  const [a, b, c, d, e, f, g, h, i] = m, A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g, det = a * A + b * B + c * C;
  return [A / det, -(b * i - c * h) / det, (b * f - c * e) / det, B / det, (a * i - c * g) / det, -(a * f - c * d) / det, C / det, -(a * h - b * g) / det, (a * e - b * d) / det];
}

/** A colour lit by `k` (1 unchanged). */
function shade(color: string, k: number): string {
  return "#" + [1, 3, 5].map((i) => Math.round(Math.min(255, parseInt(color.slice(i, i + 2), 16) * k)).toString(16).padStart(2, "0")).join("");
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
