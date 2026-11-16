/**
 * ANIM1 fur: the direction the hair lies at any point of a posed four-legged animal, and strands of hair laid along it,
 * for any style that draws fur stroke by stroke (pencil, ink, the woodblock's carved hairlines).
 *
 * After Walter Kidd, *The Direction of Hair in Animals and Man* (1903, public domain, Internet Archive
 * `cu31924003075425`):
 * - "The slope was from the tip of the snout to the caudal extremity of the animal, along the head, neck and trunk, and
 *   on the limbs from the proximal to the distal ends", the type kept by most mammals.
 * - On the flank "the general backward and downward direction of hair" (the pull of gravity on the slope as the body
 *   deepens).
 * - "In nearly all CARNIVORES and UNGULATES an area of reversed hair, where the 'knee' of the animal rests in flexion,
 *   during lying and sitting, against the flank."
 *
 * Strand length comes from the coat type (sleek, dense, shaggy, bristly) and is longer in the species' long-coated
 * regions (`coat.long`); the amounts are estimated.
 */
import type { AnimalRegion } from "./animal-plans";
import type { AnimalEllipse, AnimalPoint, AnimalSkeleton } from "./animal-construct";
import { add, len, lerpP, seeded, sub } from "./foundation-shapes";

const norm = (v: AnimalPoint): AnimalPoint => { const l = len(v) || 1; return [v[0] / l, v[1] / l]; };
const dot = (a: AnimalPoint, b: AnimalPoint) => a[0] * b[0] + a[1] * b[1];

/** Distance from p to segment ab, and where along it (0–1). */
function toSegment(p: AnimalPoint, a: AnimalPoint, b: AnimalPoint): { d: number; u: number } {
  const ab = sub(b, a), l2 = dot(ab, ab) || 1e-9, u = Math.max(0, Math.min(1, dot(sub(p, a), ab) / l2));
  return { d: len(sub(p, lerpP(a, b, u))), u };
}
/** The nearest point on a polyline: its distance, and the unit tangent there (in the polyline's direction). */
function nearestOn(p: AnimalPoint, line: readonly AnimalPoint[]): { d: number; t: AnimalPoint; at: number } {
  let best = { d: Infinity, t: [1, 0] as AnimalPoint, at: 0 };
  for (let i = 0; i < line.length - 1; i++) {
    const s = toSegment(p, line[i], line[i + 1]);
    if (s.d < best.d) best = { d: s.d, t: norm(sub(line[i + 1], line[i])), at: (i + s.u) / (line.length - 1) };
  }
  return best;
}
/** Whether p is inside a closed polygon (even-odd). */
function inPolygon(p: AnimalPoint, poly: readonly AnimalPoint[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}
/** Polygon area (absolute). */
const polyArea = (q: readonly AnimalPoint[]) => Math.abs(q.reduce((a, p, i) => { const n = q[(i + 1) % q.length]; return a + p[0] * n[1] - n[0] * p[1]; }, 0) / 2);
const inEllipse = (p: AnimalPoint, e: AnimalEllipse, grow = 1) => {
  const c = Math.cos(-e.angle * Math.PI / 180), s = Math.sin(-e.angle * Math.PI / 180), x = p[0] - e.cx, y = p[1] - e.cy;
  const u = (x * c - y * s) / (e.rx * grow), v = (x * s + y * c) / (e.ry * grow);
  return u * u + v * v <= 1;
};

/** Which part of the body a point belongs to, for direction and length. */
export type FurPart = "head" | "neck" | "trunk" | "limb" | "tail";

/**
 * The direction the hair lies at `p` (a unit vector, model units, y up) on a posed four-legged animal, and the part it
 * is on. Head, neck and trunk: from the snout toward the tail, turning down the flank as the body deepens. Limbs: from
 * the top joint down to the foot. Tail: toward its tip. The reversed patch at the stifle (carnivores and ungulates):
 * forward and up.
 */
export function furDirection(s: AnimalSkeleton, p: AnimalPoint): { dir: AnimalPoint; part: FurPart } {
  const h = s.head, D = s.c.chestDepth;
  // Tail and limbs first: they lie over the body.
  const tail = nearestOn(p, s.tail.points), tailW = Math.max(...s.tail.widths, .02);
  if (s.tail.points.length > 1 && tail.d < tailW * .6 && tail.at > .04) return { dir: tail.t, part: "tail" };
  for (const l of s.limbs) {
    const below = nearestOn(p, l.points);
    if (below.d < (l.widths[Math.min(l.widths.length - 1, Math.round(below.at * (l.widths.length - 1)))] ?? .03) * .55 && below.at > .12)
      return { dir: below.t, part: "limb" };
  }
  // The head: from the nose back over the skull (the snout-to-tail slope runs nose → occiput).
  if (s.outline.head ? inPolygon(p, s.outline.head) : inEllipse(p, h.cranium, 1.15))
    return { dir: norm(sub([h.cranium.cx, h.cranium.cy], h.nose)), part: "head" };
  // Neck: from the nape back to the withers, along the neck toward the body.
  if (s.neck.points.length > 1) {
    const n = nearestOn(p, s.neck.points.slice().reverse());
    if (n.d < Math.max(...s.neck.widths) * .55) return { dir: n.t, part: "neck" };
  }
  // Trunk: along the spine toward the tail, turning backward and downward with depth below the back.
  const spine = s.topLine.slice().reverse();   // nape → croup → tail root
  const sp = nearestOn(p, spine), back = sp.t, depth = Math.max(0, Math.min(1, sp.d / Math.max(.05, D)));
  const downward: AnimalPoint = [back[0] * .35, -1];
  let v = norm(add(back, norm(downward), depth * .85));
  // The reversed area on the flank where the flexed knee rests (carnivores and ungulates): hair forward and up.
  const stifle = s.joints.stifle, plan = s.c.plan.id;
  if (stifle && ["canid", "felid", "ursid", "ruminant", "equid", "suid", "mustelid"].includes(plan)) {
    const c = add(stifle, [D * .25, D * .12]), r = D * .32, d = len(sub(p, c));
    if (d < r) { const k = 1 - d / r; v = norm(add(v, [ .6, .8], 2.2 * k * k)); }
  }
  return { dir: v, part: "trunk" };
}

export interface FurStrand { points: AnimalPoint[]; width: number; part: FurPart; long: boolean }
export interface FurOptions {
  /** Strands per unit area (shoulder heights²); default 900. */
  density?: number;
  seed?: number;
  /** Strand length × (default 1). */
  length?: number;
  /** Long-coated regions (default: the species' `coat.long`). */
  long?: readonly AnimalRegion[];
}

/** Base strand length (shoulder heights) by coat type. */
const COAT_LENGTH: Record<string, number> = { sleek: .022, dense: .04, shaggy: .065, bristly: .045 };

/**
 * Strands of hair over a posed four-legged animal: seeded inside its masses, neck, head, limbs and tail, each laid along
 * `furDirection` in three short steps (a slight curve), long in the species' long-coated regions. Deterministic for a
 * seed. Birds (feathers) and fish (scales) return none.
 */
export function furStrands(s: AnimalSkeleton, o: FurOptions = {}): FurStrand[] {
  if (s.kind !== "quadruped") return [];
  const sp = s.c.species, rand = seeded(o.seed ?? 7), out: FurStrand[] = [];
  const base = (COAT_LENGTH[sp?.coat.type ?? "dense"] ?? .035) * (o.length ?? 1);
  const longRegions = new Set<AnimalRegion>(o.long ?? sp?.coat.long ?? []);
  const regionOf = (part: FurPart, p: AnimalPoint): AnimalRegion => {
    if (part === "tail") return "tail";
    if (part === "head") return "head";
    if (part === "neck") return p[1] < (s.joints.neckRoot?.[1] ?? 0) ? "throat" : "neck";
    if (part === "limb") return p[0] > (s.joints.withers?.[0] ?? 0) - .1 ? "fore-leg" : "hind-leg";
    const below = (s.joints.brisket?.[1] ?? 0) + s.c.chestDepth * .25;
    return p[1] < below ? (p[0] > (s.joints.withers?.[0] ?? 0) - .05 ? "chest" : "belly") : "back";
  };
  // Seeds: uniform inside the trunk's and the head's outlines (rejection sampling), and along each tube (limbs, neck,
  // tail), by area.
  const seeds: AnimalPoint[] = [];
  const area = (n: number) => Math.max(1, Math.round(n * (o.density ?? 900)));
  const fill = (poly: readonly AnimalPoint[] | undefined, dense = 1) => {
    if (!poly || poly.length < 3) return;
    const xs = poly.map(p => p[0]), ys = poly.map(p => p[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const n = area(polyArea(poly) * dense);
    for (let i = 0, tries = 0; i < n && tries < n * 20; tries++) {
      const p: AnimalPoint = [x0 + rand() * (x1 - x0), y0 + rand() * (y1 - y0)];
      if (inPolygon(p, poly)) { seeds.push(p); i++; }
    }
  };
  fill(s.outline.trunk);
  // The head is small: seed it a little more densely so the face reads.
  fill(s.outline.head, 1.6);
  const tube = (pts: readonly AnimalPoint[], widths: readonly number[], scale = .9) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const w = ((widths[i] ?? widths[0]) + (widths[i + 1] ?? widths[i] ?? widths[0])) / 2, L = len(sub(pts[i + 1], pts[i]));
      const n = area(L * w), t = norm(sub(pts[i + 1], pts[i])), nrm: AnimalPoint = [-t[1], t[0]];
      for (let k = 0; k < n; k++) seeds.push(add(lerpP(pts[i], pts[i + 1], rand()), nrm, (rand() - .5) * w * scale));
    }
  };
  for (const l of s.limbs.filter(x => !x.far)) tube(l.points, l.widths);
  tube(s.neck.points, s.neck.widths);
  tube(s.tail.points, s.tail.widths);
  for (const p of seeds) {
    const f0 = furDirection(s, p), region = regionOf(f0.part, p), long = longRegions.has(region) || (f0.part === "head" ? false : longRegions.has(f0.part === "trunk" ? "back" : region));
    const L = base * (long ? 2.2 : 1) * (f0.part === "head" ? .55 : f0.part === "limb" ? .7 : 1) * (.75 + rand() * .5);
    // Three steps along the field: a strand that follows the coat's flow and curves with it.
    const pts: AnimalPoint[] = [p];
    for (let k = 0; k < 3; k++) {
      const f = k === 0 ? f0 : furDirection(s, pts[k]), curl = (rand() - .5) * (sp?.coat.type === "bristly" ? .05 : .35);
      const d = norm(add(f.dir, [-f.dir[1], f.dir[0]], curl));
      pts.push(add(pts[k], d, L / 3));
    }
    out.push({ points: pts, width: base * (long ? .16 : .12), part: f0.part, long });
  }
  return out;
}

/**
 * A few streamlines of the hair's direction for a four-legged animal (for flow arrows on a sheet): from behind the ears
 * along the back, down the shoulder and the flank, down each near leg and along the tail, each traced through
 * `furDirection` until it leaves that part of the body.
 */
export function furStreamlines(s: AnimalSkeleton, step = .035, steps = 40): AnimalPoint[][] {
  if (s.kind !== "quadruped") return [];
  const D = s.c.chestDepth, j = s.joints, out: AnimalPoint[][] = [];
  // A line stops where it would leave the body (the trunk's outline, or its own limb or tail).
  const inside = (p: AnimalPoint, part: FurPart) => {
    if (part === "trunk") return s.outline.trunk ? inPolygon(p, s.outline.trunk) : true;
    if (part === "tail") return nearestOn(p, s.tail.points).d < Math.max(...s.tail.widths, .02) * .6;
    return s.limbs.some(l => nearestOn(p, l.points).d < Math.max(...l.widths) * .6);
  };
  const trace = (p0: AnimalPoint, part: FurPart) => {
    const line: AnimalPoint[] = [p0];
    for (let k = 0; k < steps; k++) {
      const f = furDirection(s, line[line.length - 1]), next = add(line[line.length - 1], f.dir, step);
      if ((f.part !== part && k > 1) || !inside(next, part)) break;
      line.push(next);
    }
    if (line.length > 3) out.push(line);
  };
  const withers = j.withers ?? [0, 1];
  for (const k of [.18, .5, .8]) trace([withers[0] + .02, withers[1] - D * k], "trunk");
  for (const l of s.limbs.filter(x => !x.far)) trace(lerpP(l.points[0], l.points[1], .35), "limb");
  if (s.tail.points.length > 2) trace(lerpP(s.tail.points[0], s.tail.points[1], .6), "tail");
  return out;
}

