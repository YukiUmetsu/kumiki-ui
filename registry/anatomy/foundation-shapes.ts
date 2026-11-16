/**
 * Shared geometry for the art foundations (ANIM1 animals, FLORA1 plants): points, outlines wound one way, smooth
 * closed curves, tubes and ellipses as path data, and a person to show scale, outlined through ANAT1's measured
 * landmarks.
 *
 * Units are the caller's own; y is up. Every outline is wound counter-clockwise, so overlapping parts filled as one
 * path do not cut holes in each other.
 */
import modelTables from "./data/model-tables.json";

export type FPoint = readonly [number, number];

// ---- Shared record types ------------------------------------------------------------------------------------------------------------

export type Grade = "reported" | "measured" | "estimated";
/** A range with its typical value, its evidence grade and source. */
export interface Range { min: number; typical: number; max: number; grade: Grade; source?: string }
export const range = (min: number, typical: number, max: number, grade: Grade, source?: string): Range => ({ min, typical, max, grade, source });
/** A sound the subject makes or causes: a catalog id when a recording exists, a search term when not. */
export interface FoundationSound { kind: "vocal" | "foley" | "ambience"; label: string; catalog?: string; query?: string }
/** A public-domain or CC0 reference image. */
export interface FoundationReference { title: string; url: string; rights: "public-domain" | "CC0"; kind: "print" | "plate" | "photo" | "motion" | "painting" }
/** Where a subject is already drawn in this library, by style (the id it is drawn by there). */
export interface StyleImplementation { style: string; pack: string; id: string; note?: string }
/** A Wikimedia Commons file page. */
export const commons = (file: string): string => `https://commons.wikimedia.org/wiki/File:${file}`;
/** A Wikipedia article as a source. */
export const wikipedia = (page: string) => ({ title: `Wikipedia: ${page.replace(/_/g, " ")}`, url: `https://en.wikipedia.org/wiki/${page}` });
export interface FEllipse { cx: number; cy: number; rx: number; ry: number; angle: number }

export const RAD = Math.PI / 180;
export const add = (a: FPoint, b: FPoint, s = 1): FPoint => [a[0] + b[0] * s, a[1] + b[1] * s];
export const sub = (a: FPoint, b: FPoint): FPoint => [a[0] - b[0], a[1] - b[1]];
export const len = (a: FPoint) => Math.hypot(a[0], a[1]);
export const lerpP = (a: FPoint, b: FPoint, t: number): FPoint => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
/** Direction at `deg` counter-clockwise from +x. */
export const dir = (deg: number): FPoint => [Math.cos(deg * RAD), Math.sin(deg * RAD)];
export const rotate = (p: FPoint, deg: number, about: FPoint): FPoint => {
  const c = Math.cos(deg * RAD), s = Math.sin(deg * RAD), x = p[0] - about[0], y = p[1] - about[1];
  return [about[0] + x * c - y * s, about[1] + x * s + y * c];
};
export const smoothstep = (t: number) => { const u = Math.min(1, Math.max(0, t)); return u * u * (3 - 2 * u); };

const f3 = (v: number) => (Math.round(v * 1000) / 1000).toString();
/** The outline wound counter-clockwise (y up). */
export const ccw = (pts: readonly FPoint[]) => (pts.reduce((a, p, i) => { const q = pts[(i + 1) % pts.length]; return a + p[0] * q[1] - q[0] * p[1]; }, 0) < 0 ? pts.slice().reverse() : pts);
/** A closed polygon as path data. */
export const polyPath = (pts0: readonly FPoint[]) => { const pts = ccw(pts0); return pts.length ? `M${pts.map(p => `${f3(p[0])} ${f3(p[1])}`).join("L")}Z` : ""; };
/** An open polyline as path data (for strokes). */
export const linePath = (pts: readonly FPoint[]) => (pts.length ? `M${pts.map(p => `${f3(p[0])} ${f3(p[1])}`).join("L")}` : "");
/** A closed Catmull-Rom curve through `pts`, as cubic Béziers. */
export function smoothClosedPath(pts0: readonly FPoint[]): string {
  const pts = ccw(pts0), n = pts.length;
  if (n < 3) return polyPath(pts);
  let d = `M${f3(pts[0][0])} ${f3(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const c1: FPoint = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2: FPoint = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${f3(c1[0])} ${f3(c1[1])} ${f3(c2[0])} ${f3(c2[1])} ${f3(p2[0])} ${f3(p2[1])}`;
  }
  return d + "Z";
}
export function ellipsePoints(e: FEllipse, n = 40): FPoint[] {
  const out: FPoint[] = [];
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; out.push(rotate([e.cx + e.rx * Math.cos(a), e.cy + e.ry * Math.sin(a)], e.angle, [e.cx, e.cy])); }
  return out;
}
export const circlePoints = (p: FPoint, r: number, n = 16) => ellipsePoints({ cx: p[0], cy: p[1], rx: r, ry: r, angle: 0 }, n);
/** A tube along a polyline with a width at each point, as one outline. */
export function tubePoints(pts: readonly FPoint[], widths: readonly number[]): FPoint[] {
  if (pts.length < 2) return [];
  const left: FPoint[] = [], right: FPoint[] = [];
  pts.forEach((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], v = sub(b, a), l = len(v) || 1, n: FPoint = [-v[1] / l, v[0] / l], w = widths[i] / 2;
    left.push(add(p, n, w)); right.push(add(p, n, -w));
  });
  return [...left, ...right.reverse()];
}
/** A smooth tube with rounded ends, as a closed curve. */
export const smoothTube = (pts: readonly FPoint[], widths: readonly number[]) => smoothClosedPath(tubePoints(pts, widths));

/** A seeded random stream (mulberry32): the same seed always draws the same plant or animal. */
export function seeded(seed: number): () => number {
  let a = (seed >>> 0) || 0x9e3779b9;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

type Preset = (typeof modelTables.presets)[number];
/** The person shown for scale: ANAT1's man, 25 years. */
export const SCALE_PERSON: Preset = modelTables.presets.find(p => p.id === "man-25") ?? modelTables.presets[0];
/** A person seen from the front, outlined through ANAT1 landmarks (metres; the A-pose arms swung down to hang). */
export function personOutline(): FPoint[] {
  const L = SCALE_PERSON.landmarks as Record<string, number[]>, P = (k: string, dx = 0, dy = 0): FPoint => [L[k][0] + dx, L[k][1] + dy];
  const raw = [P("acromion.L"), P("olecranon.L"), P("stylion.L"), P("dactylion.L")], aw = [.11, .085, .06, .03];
  const a0 = raw[0], swing = -Math.PI / 2 + .1 - Math.atan2(raw[3][1] - a0[1], raw[3][0] - a0[0]), cs = Math.cos(swing), sn = Math.sin(swing);
  const arm = raw.map(([x, y]) => [a0[0] + (x - a0[0]) * cs - (y - a0[1]) * sn, a0[1] + (x - a0[0]) * sn + (y - a0[1]) * cs] as FPoint);
  const side = arm.map((_, i) => { const a = arm[Math.max(0, i - 1)], b = arm[Math.min(3, i + 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [(b[1] - a[1]) / l, -(b[0] - a[0]) / l] as FPoint; });
  const off = (i: number, k: number): FPoint => [arm[i][0] + side[i][0] * aw[i] / 2 * k, arm[i][1] + side[i][1] * aw[i] / 2 * k];
  const half: FPoint[] = [P("vertex"), P("zygion.L", 0, .05), P("zygion.L"), P("gonion.L"), [L["gonion.L"][0] * .95, L["cervicale"][1] - .02], off(0, 1),
    off(1, 1), off(2, 1), arm[3], off(2, -1), off(1, -1), P("acromion.L", -.06, -.16), P("iliocristale.L", -.02, .1),
    P("iliocristale.L"), P("trochanterion.L"), P("femoral-epicondyle.L"), P("lateral-malleolus.L"), P("lateral-malleolus.L", .02, -.06), P("medial-malleolus.L", -.04, -.045),
    P("medial-malleolus.L"), P("patella.L", -.06), P("crotch")];
  return [...half, ...half.slice(1, -1).reverse().map(([x, y]) => [-x, y] as FPoint)];
}
