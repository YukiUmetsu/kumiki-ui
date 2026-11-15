/**
 * ANAT1 measurement: slice the body like a tape measure and report ANSUR-named dimensions.
 *
 * Girths are convex-hull perimeters of a horizontal (or limb-perpendicular) section, which is what a tape spans.
 * Heights come from named landmarks; breadths and depths from section extents. Values are metres.
 */
import type { HumanBody, Vec3 } from "./anatomy-body";
import { humanJoints, humanLandmarks } from "./anatomy-body";

export type Loop = [number, number][];

/** All closed loops where the plane y = h cuts the body surface, as (x, z) polygons. */
export function sliceBodyAtHeight(body: Pick<HumanBody, "points" | "faces" | "model">, h: number, pts: ArrayLike<number> = body.points): Loop[] {
  return slicePlane(body, pts, [0, 1, 0], h, p => [p[0], p[2]]);
}

/**
 * Loops cut by any plane n·p = d (n normalised), mapped to 2D by `to2d`. Only body faces are cut (not the eyes).
 */
export function slicePlane(body: Pick<HumanBody, "faces" | "model">, pts: ArrayLike<number>, n: Vec3, d: number, to2d: (p: Vec3) => [number, number]): Loop[] {
  const F = body.faces, nf = body.model.header.counts.bodyFaces;
  const side = (i: number) => pts[i * 3] * n[0] + pts[i * 3 + 1] * n[1] + pts[i * 3 + 2] * n[2] - d;
  const key = (a: number, b: number) => (a < b ? a * 65536 + b : b * 65536 + a);
  const cross = (a: number, b: number): Vec3 => {
    const sa = side(a), sb = side(b), t = sa / (sa - sb);
    return [pts[a * 3] + (pts[b * 3] - pts[a * 3]) * t, pts[a * 3 + 1] + (pts[b * 3 + 1] - pts[a * 3 + 1]) * t, pts[a * 3 + 2] + (pts[b * 3 + 2] - pts[a * 3 + 2]) * t];
  };
  const adj = new Map<number, number[]>();
  const link = (a: number, b: number) => { (adj.get(a) ?? adj.set(a, []).get(a)!).push(b); };
  const where = new Map<number, [number, number]>();
  for (let f = 0; f < nf; f++) {
    const v = [F[f * 3], F[f * 3 + 1], F[f * 3 + 2]];
    const s = v.map(side);
    const hits: number[] = [];
    for (let e = 0; e < 3; e++) {
      const a = v[e], b = v[(e + 1) % 3];
      if ((s[e] < 0) !== (s[(e + 1) % 3] < 0)) {
        const k = key(a, b);
        if (!where.has(k)) where.set(k, to2d(cross(a, b)));
        hits.push(k);
      }
    }
    if (hits.length === 2) { link(hits[0], hits[1]); link(hits[1], hits[0]); }
  }
  // chain segments into loops (orientation-agnostic walk over the edge graph)
  const seen = new Set<number>(); const loops: Loop[] = [];
  for (const start of adj.keys()) {
    if (seen.has(start)) continue;
    const loop: Loop = []; let prev = -1, cur = start;
    while (cur !== undefined && !seen.has(cur)) {
      seen.add(cur); loop.push(where.get(cur)!);
      const nb: number[] = adj.get(cur) ?? [];
      const nx = nb.find(x => x !== prev && !seen.has(x));
      prev = cur; cur = nx as number;
    }
    if (loop.length >= 3) loops.push(loop);
  }
  return loops;
}

export function convexHull(points: Loop): Loop {
  const p = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const cr = (o: number[], a: number[], b: number[]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo: Loop = [], up: Loop = [];
  for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
export const perimeter = (l: Loop) => l.reduce((s, p, i) => { const q = l[(i + 1) % l.length]; return s + Math.hypot(q[0] - p[0], q[1] - p[1]); }, 0);
export const extent = (l: Loop) => {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const [x, y] of l) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return { x0, x1, y0, y1, width: x1 - x0, depth: y1 - y0 };
};

/** The torso section at a height: the loop that straddles the midline (arms and legs excluded). */
export function torsoSection(body: HumanBody, h: number, pts: ArrayLike<number> = body.points): Loop | null {
  const loops = sliceBodyAtHeight(body, h, pts).filter(l => { const e = extent(l); return e.x0 < 0 && e.x1 > 0; });
  if (!loops.length) return null;
  return loops.reduce((a, b) => (extent(a).width * extent(a).depth > extent(b).width * extent(b).depth ? a : b));
}

/** A limb section perpendicular to a bone at fraction `t` from head to tail; the loop closest to the axis. */
export function limbSection(body: HumanBody, boneId: string, t: number, pts: ArrayLike<number> = body.points): Loop | null {
  const j = humanJoints(body, pts)[boneId];
  if (!j) return null;
  const axis = norm(sub(j.tail, j.head)), c: Vec3 = add(j.head, scale(sub(j.tail, j.head), t));
  const u = norm(cross(axis, Math.abs(axis[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0])), v = cross(axis, u);
  const loops = slicePlane(body, pts, axis, dot(axis, c), p => { const r = sub(p, c); return [dot(r, u), dot(r, v)]; });
  if (!loops.length) return null;
  const inside = loops.filter(l => pointInLoop(l, 0, 0));
  const pool = inside.length ? inside : loops;
  const near = (l: Loop) => Math.min(...l.map(([x, y]) => Math.hypot(x, y)));
  // the smallest loop around the bone axis (a plane near the hip can also cut the other leg or the trunk)
  return pool.reduce((a, b) => (inside.length ? (perimeter(a) <= perimeter(b) ? a : b) : (near(a) <= near(b) ? a : b)));
}

export function pointInLoop(l: Loop, x: number, y: number): boolean {
  let inside = false;
  for (let i = 0, j = l.length - 1; i < l.length; j = i++) {
    const [xi, yi] = l[i], [xj, yj] = l[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export interface HumanMeasures {
  stature: number; headHeight: number; headsTall: number;
  eyeHeight: number; cervicaleHeight: number; suprasternaleHeight: number; acromialHeight: number; chestHeight: number;
  waistHeight: number; iliocristaleHeight: number; trochanterionHeight: number; crotchHeight: number; kneeHeight: number; lateralMalleolusHeight: number;
  biacromialBreadth: number; chestBreadth: number; chestDepth: number; chestCircumference: number;
  waistBreadth: number; waistDepth: number; waistCircumference: number;
  hipBreadth: number; buttockDepth: number; buttockCircumference: number; neckCircumference: number;
  headLength: number; headBreadth: number; headCircumference: number; bizygomaticBreadth: number; mentonSellionLength: number; interpupillaryBreadth: number;
  upperArmLength: number; forearmLength: number; handLength: number; footLength: number; thighLength: number; shinLength: number;
  span: number; thighCircumference: number; calfCircumference: number; bicepsCircumference: number;
  /** Closed-surface volume (m³) and mass at 1,010 kg/m³ (average whole-body density). Estimate only. */
  volume: number; massKg: number; bmi: number;
}

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a: Vec3) => Math.hypot(a[0], a[1], a[2]);
const norm = (a: Vec3): Vec3 => scale(a, 1 / (len(a) || 1));
const dist = (a: Vec3, b: Vec3) => len(sub(a, b));

/** Closed-mesh volume of the body surface (m³). */
export function bodyVolume(body: HumanBody, pts: ArrayLike<number> = body.points): number {
  const F = body.faces, nf = body.model.header.counts.bodyFaces;
  let v = 0;
  for (let f = 0; f < nf; f++) {
    const a = F[f * 3] * 3, b = F[f * 3 + 1] * 3, c = F[f * 3 + 2] * 3;
    v += (pts[a] * (pts[b + 1] * pts[c + 2] - pts[b + 2] * pts[c + 1]) - pts[a + 1] * (pts[b] * pts[c + 2] - pts[b + 2] * pts[c]) + pts[a + 2] * (pts[b] * pts[c + 1] - pts[b + 1] * pts[c])) / 6;
  }
  return Math.abs(v);
}

/** Measure a rest-pose body with ANSUR-style definitions. */
export function measureHumanBody(body: HumanBody): HumanMeasures {
  const L = humanLandmarks(body, body.points), J = humanJoints(body, body.points);
  const mid = (a: string) => (L[`${a}.L`][1] + L[`${a}.R`][1]) / 2;
  const sec = (h: number) => { const l = torsoSection(body, h); return l ? { ...extent(l), girth: perimeter(convexHull(l)) } : { width: 0, depth: 0, girth: 0 }; };
  const chestY = mid("thelion"), waistY = L.omphalion[1];
  const chest = sec(chestY), waist = sec(waistY);
  let hip = { width: 0, depth: 0, girth: 0 };
  for (let y = L.crotch[1] + 0.01; y < mid("iliocristale"); y += 0.005) { const s = sec(y); if (s.width > hip.width) hip = s; }
  const butt = sec(mid("buttock"));
  // head: widest section above the ears (ANSUR head breadth excludes them); circumference just above the brow ridge
  let headBreadth = 0;
  for (let y = mid("tragion") + 0.03; y < L.vertex[1] - 0.01; y += 0.004) { const l = torsoSection(body, y); if (l) headBreadth = Math.max(headBreadth, extent(l).width); }
  let headCircumference = 0;
  for (let y = L.glabella[1]; y < L.glabella[1] + 0.035; y += 0.005) { const l = torsoSection(body, y); if (l) headCircumference = Math.max(headCircumference, perimeter(convexHull(l))); }
  const eyeL = J["eye.L"].head, eyeR = J["eye.R"].head;
  const limb = (id: string, t: number) => { const l = limbSection(body, id, t); return l ? perimeter(convexHull(l)) : 0; };
  // thigh just below the buttock fold; a plane higher up also cuts the trunk
  let thigh = 0; for (let t = 0.2; t <= 0.4; t += 0.05) thigh = Math.max(thigh, limb("thigh.L", t));
  const neck = limb("neck02", 0.5);
  let calf = 0; for (let t = 0.15; t <= 0.5; t += 0.05) calf = Math.max(calf, limb("shin.L", t));
  let biceps = 0; for (let t = 0.3; t <= 0.7; t += 0.1) biceps = Math.max(biceps, limb("upperarm.L", t));
  const upperArm = dist(L["acromion.L"], J["forearm.L"].head), forearm = dist(J["forearm.L"].head, J["wrist.L"].head), hand = dist(L["stylion.L"], L["dactylion.L"]);
  const volume = bodyVolume(body), massKg = volume * 1010;
  const headHeight = L.vertex[1] - L.menton[1];
  return {
    stature: body.stature, headHeight, headsTall: body.stature / headHeight,
    eyeHeight: (eyeL[1] + eyeR[1]) / 2, cervicaleHeight: L.cervicale[1], suprasternaleHeight: L.suprasternale[1], acromialHeight: mid("acromion"), chestHeight: chestY,
    waistHeight: waistY, iliocristaleHeight: mid("iliocristale"), trochanterionHeight: mid("trochanterion"), crotchHeight: L.crotch[1], kneeHeight: mid("patella"), lateralMalleolusHeight: mid("lateral-malleolus"),
    biacromialBreadth: Math.abs(L["acromion.L"][0] - L["acromion.R"][0]),
    chestBreadth: chest.width, chestDepth: chest.depth, chestCircumference: chest.girth,
    waistBreadth: waist.width, waistDepth: waist.depth, waistCircumference: waist.girth,
    hipBreadth: hip.width, buttockDepth: butt.depth, buttockCircumference: butt.girth, neckCircumference: neck,
    headLength: Math.abs(L.glabella[2] - L.opisthocranion[2]), headBreadth, headCircumference,
    bizygomaticBreadth: Math.abs(L["zygion.L"][0] - L["zygion.R"][0]), mentonSellionLength: dist(L.sellion, L.menton), interpupillaryBreadth: dist(eyeL, eyeR),
    upperArmLength: upperArm, forearmLength: forearm, handLength: hand, footLength: dist(L["pternion.L"], L["acropodion.L"]),
    thighLength: dist(J["thigh.L"].head, J["shin.L"].head), shinLength: dist(J["shin.L"].head, J["foot.L"].head),
    span: Math.abs(L["acromion.L"][0] - L["acromion.R"][0]) + 2 * (upperArm + forearm + hand),
    thighCircumference: thigh, calfCircumference: calf, bicepsCircumference: biceps,
    volume, massKg, bmi: massKg / (body.stature * body.stature),
  };
}

/** ANSUR II measurement name for each comparable ANAT1 measure. */
export const ANSUR_KEYS: Partial<Record<keyof HumanMeasures, string>> = {
  stature: "stature", cervicaleHeight: "cervicaleheight", suprasternaleHeight: "suprasternaleheight", acromialHeight: "acromialheight",
  chestHeight: "chestheight", waistHeight: "waistheightomphalion", iliocristaleHeight: "iliocristaleheight", trochanterionHeight: "trochanterionheight",
  crotchHeight: "crotchheight", kneeHeight: "kneeheightmidpatella", lateralMalleolusHeight: "lateralmalleolusheight",
  biacromialBreadth: "biacromialbreadth", chestBreadth: "chestbreadth", chestDepth: "chestdepth", chestCircumference: "chestcircumference",
  waistBreadth: "waistbreadth", waistDepth: "waistdepth", waistCircumference: "waistcircumference", hipBreadth: "hipbreadth",
  buttockDepth: "buttockdepth", buttockCircumference: "buttockcircumference", neckCircumference: "neckcircumference",
  headLength: "headlength", headBreadth: "headbreadth", headCircumference: "headcircumference", bizygomaticBreadth: "bizygomaticbreadth",
  mentonSellionLength: "mentonsellionlength", interpupillaryBreadth: "interpupillarybreadth", upperArmLength: "acromionradialelength",
  forearmLength: "radialestylionlength", handLength: "handlength", footLength: "footlength", span: "span",
  thighCircumference: "thighcircumference", calfCircumference: "calfcircumference", bicepsCircumference: "bicepscircumferenceflexed",
};
