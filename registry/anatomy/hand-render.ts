/**
 * ANAT1 hand renderer: a posed hand (`hand-model.ts`) as a smooth surface, ray-marched on the CPU.
 *
 * The surface is a signed distance field:
 * - each phalanx is a rounded cone, with joint bulges (bigger on knuckly hands) and fleshy pads on the palmar side
 *   (fuller on children);
 * - the palm is built from the metacarpals, the thenar and hypothenar masses and the wrist;
 * - fingers join the palm smoothly (the webs) but not one another;
 * - nails are plates on the end segments: a cuticle arc, a lunula and a free edge, cut square, oval, round or almond;
 * - veins and tendons stand on the back of lean or old hands; dimples sit over a child's knuckles;
 * - a held object (cylinder, sphere, box).
 *
 * Shading:
 * - skin texture by region from `skin-texture.ts` (palm, fingertip pads, knuckles, the back of the hand);
 * - the palm's flexion creases and the creases at each finger joint;
 * - a lighter palm, soft key shadows from the field, occlusion;
 * - light scattered under the skin (red furthest), glossy nails.
 */
import type { Vec3 } from "./hand-model";
import type { PosedHand } from "./hand-model";
import { propDistance } from "./hand-model";
import { skinZoneColor } from "./anatomy-color";
import { createRaster, downsample, encodeSrgb, gaussianBlur, linearOf } from "./foundation-raster";
import { findSkinRegion, skinSurface, ageSpotsAt } from "./skin-texture";

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const sc = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a: Vec3) => Math.hypot(a[0], a[1], a[2]);
const nrm = (a: Vec3): Vec3 => sc(a, 1 / (len(a) || 1));
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const smooth = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const smin = (a: number, b: number, k: number) => { if (k <= 0) return Math.min(a, b); const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };

/** The rounded cone between a (radius ra) and b (radius rb): exact distance (after Inigo Quilez). */
function roundCone(p: Vec3, a: Vec3, b: Vec3, ra: number, rb: number): number {
  const ba = sub(b, a), l2 = dot(ba, ba), rr = ra - rb, a2 = l2 - rr * rr, il2 = 1 / l2, pa = sub(p, a), y = dot(pa, ba), z = y - l2;
  const xv = sub(sc(pa, l2), sc(ba, y)), x2 = dot(xv, xv), y2 = y * y * l2, z2 = z * z * l2, k = Math.sign(rr) * rr * rr * x2;
  if (Math.sign(z) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - rb;
  if (Math.sign(y) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - ra;
  return (Math.sqrt(x2 * a2 * il2) + y * rr) * il2 - ra;
}
/** An ellipsoid in a local frame (axes e1, e2, e3 with radii r): bound-correct approximation. */
function ellipsoid(p: Vec3, c: Vec3, e1: Vec3, e2: Vec3, e3: Vec3, r: Vec3): number {
  const d = sub(p, c), q: Vec3 = [dot(d, e1) / r[0], dot(d, e2) / r[1], dot(d, e3) / r[2]], k0 = len(q), q2: Vec3 = [q[0] / r[0], q[1] / r[1], q[2] / r[2]], k1 = len(q2);
  return k1 > 1e-9 ? (k0 * (k0 - 1)) / k1 : -Math.min(r[0], r[1], r[2]);
}
const capsule = (p: Vec3, a: Vec3, b: Vec3, r: number) => { const pa = sub(p, a), ba = sub(b, a), h = clamp(dot(pa, ba) / dot(ba, ba), 0, 1); return len(sub(pa, sc(ba, h))) - r; };

interface Ellip { c: Vec3; e1: Vec3; e2: Vec3; e3: Vec3; r: Vec3 }
interface FingerSDF { bones: { a: Vec3; b: Vec3; ra: number; rb: number; up: Vec3; side: Vec3; seg: number }[]; joints: { c: Vec3; r: number }[]; pads: Ellip[]; nail?: NailSDF; bc: Vec3; br: number; thumb: boolean }
interface NailSDF { a: Vec3; d: Vec3; up: Vec3; side: Vec3; L: number; ra: number; rb: number; half: number; free: number; shape: string }
interface Tube { a: Vec3; b: Vec3; r: number }

export interface HandRenderOptions {
  width?: number; height?: number; supersample?: number;
  /** The camera: the back of the hand, the palm, the thumb side, the little-finger side, or three-quarter; then turned (degrees). */
  view?: "back" | "palm" | "thumb-side" | "little-side" | "three-quarter";
  yaw?: number; pitch?: number; roll?: number;
  /** A close-up: the part to frame (a finger's end, or the palm) and how much closer than the whole hand. */
  focus?: "thumb" | "index" | "middle" | "ring" | "little" | "palm"; zoom?: number;
  /** Frame a fixed width of the world (mm) instead of fitting the hand, so hands of different sizes compare at one scale. */
  frameMm?: number;
  skin?: string; nailColour?: string; background?: string;
  keyAzimuth?: number; keyElevation?: number;
  /** 0 smooth … 1 full skin texture. */
  detail?: number;
  seed?: number;
  /** "draft" (for animation frames): no shadow map or skin texture, a lighter scattering blur. */
  quality?: "full" | "draft";
  /** Checking passes: surface normals, or the shading without shadows or without occlusion. */
  debug?: "normals" | "no-shadow" | "no-ao";
}
export interface HandRender { width: number; height: number; rgba: Uint8ClampedArray; ms: number }

/** Build the distance field of a posed hand. */
function buildScene(ph: PosedHand) {
  const h = ph.hand, t = h.type, P = h.palm, kn = t.knuckles, fat = t.fat;
  const fingers: FingerSDF[] = [];
  const W = ph.wristRot;
  for (const f of ["thumb", "index", "middle", "ring", "little"] as const) {
    const bs = ph.bones.filter(b => b.finger === f).sort((x, y) => x.seg - y.seg);
    const fsdf: FingerSDF = { bones: [], joints: [], pads: [], bc: [0, 0, 0], br: 0, thumb: f === "thumb" };
    for (const b of bs) {
      const isMeta = f === "thumb" && b.seg === 0;
      // the end segment stops one tip-radius short: the rounded tip reaches the measured fingertip
      const Lb = len(sub(b.b, b.a)), bEnd = b.seg === 2 ? add(b.a, sc(sub(b.b, b.a), (Lb - b.rb * 0.85) / Lb)) : b.b;
      fsdf.bones.push({ a: b.a, b: bEnd, ra: b.ra, rb: b.rb, up: b.up, side: b.side, seg: b.seg });
      // joints bulge a little, mostly toward the back (the knuckles)
      // (knobbly only on lean or old hands: soft tissue fills round a young joint)
      if (!isMeta) fsdf.joints.push({ c: add(b.a, sc(b.up, b.ra * (0.04 + 0.1 * kn))), r: b.ra * (0.82 + 0.16 * kn - 0.03 * fat) });
      // the fleshy pad on the palmar side of each phalanx (the fingertip's is the largest)
      const L = len(sub(b.b, b.a)), d = sc(sub(b.b, b.a), 1 / L), last = b.seg === 2;
      if (!isMeta) {
        const r = (b.ra + b.rb) / 2, c = add(add(b.a, sc(d, L * (last ? 0.6 : 0.5))), sc(b.up, -r * (last ? 0.22 : 0.3)));
        fsdf.pads.push({ c, e1: d, e2: b.side, e3: b.up, r: [L * (last ? 0.46 : 0.42), r * (last ? 0.98 : 0.86) * (1 + 0.12 * fat), r * (last ? 0.8 : 0.72) * (1 + 0.2 * fat)] });
      }
      if (last) {
        const nw = f === "thumb" ? h.fingers.thumb.nailWidth : h.fingers[f].nailWidth;
        fsdf.nail = { a: b.a, d, up: b.up, side: b.side, L, ra: b.ra, rb: b.rb, half: nw / 2, free: t.nail.free, shape: t.nail.shape };
      }
    }
    const pts = fsdf.bones.flatMap(b => [b.a, b.b]), c = sc(pts.reduce((a, b) => add(a, b), [0, 0, 0] as Vec3), 1 / pts.length);
    fsdf.bc = c; fsdf.br = Math.max(...fsdf.bones.flatMap(b => [len(sub(b.a, c)) + b.ra, len(sub(b.b, c)) + b.rb])) + 6;
    fingers.push(fsdf);
  }
  // the palm: the four metacarpals (squashed toward the palm's plane), the thenar and hypothenar, the wrist
  const metas: { a: Vec3; b: Vec3; ra: number; rb: number }[] = [];
  const fl = ["index", "middle", "ring", "little"] as const;
  fl.forEach((f, i) => {
    const k = h.knuckles[i], base: Vec3 = [k[0] * 0.55, 0.12 * t.length, 0];
    metas.push({ a: W(base), b: k, ra: (P.wristHalf / 4) * 1.15, rb: h.fingers[f].radii[0] * 1.08 });
  });
  const thumbMeta = fingers[0].bones[0], tm = sc(add(thumbMeta.a, thumbMeta.b), 0.5), tmd = nrm(sub(thumbMeta.b, thumbMeta.a));
  const pz = W([0, 0, 1]), py = W([0, 1, 0]), pxv = W([1, 0, 0]);
  const thenar: Ellip = { c: add(add(tm, sc(pz, -P.thick * 0.18)), sc(pxv, -t.breadth * 0.05)), e1: tmd, e2: nrm(cross(pz, tmd)), e3: pz, r: [len(sub(thumbMeta.b, thumbMeta.a)) * 0.62, t.breadth * (0.15 + 0.04 * t.muscle + 0.03 * fat), P.thick * (0.34 + 0.08 * t.muscle + 0.06 * fat)] };
  const hypo: Ellip = { c: W([-0.33 * t.breadth, 0.4 * P.mcpY, -P.thick * 0.12]), e1: py, e2: pxv, e3: pz, r: [P.mcpY * 0.36, t.breadth * (0.12 + 0.03 * t.muscle + 0.03 * fat), P.thick * (0.3 + 0.06 * t.muscle + 0.06 * fat)] };
  // the back of the hand's soft tissue over the metacarpals (fills the valleys between them; thin on lean, old hands)
  // (it ends below the knuckles and blends wide, so no ledge forms where it stops)
  const dorsal: Ellip = { c: W([0.0, 0.45 * P.mcpY, P.thick * (0.14 - 0.1 * kn)]), e1: py, e2: pxv, e3: pz, r: [P.mcpY * 0.42, P.mcpHalf * 0.84, P.thick * (0.28 + 0.08 * fat - 0.12 * kn)] };
  const palmCore: Ellip = { c: W([0.02 * t.breadth, 0.55 * P.mcpY, -P.thick * 0.08]), e1: py, e2: pxv, e3: pz, r: [P.mcpY * 0.5, P.mcpHalf * 0.92, P.thick * 0.42] };
  const wrist = { a: W([0, 0.16 * t.length, -P.thick * 0.05]), b: [0, -0.26 * t.length, 0] as Vec3, rx: P.wristHalf * 0.95, rz: P.wristThick * 0.48 };
  // dimples over a child's knuckles; tendons and veins on the back of lean or old hands
  const dimples = fat > 0.55 ? h.knuckles.map(k => W(add(k, [0, -2, P.thick * 0.1 + 2.5]))) : [];
  const tendons: Tube[] = [], veins: Tube[] = [];
  if (t.tendons > 0.05) fl.forEach((_, i) => { const k = h.knuckles[i]; tendons.push({ a: W([k[0] * 0.25, 0.05 * t.length, P.thick * 0.22]), b: W([k[0], k[1] - 4, P.thick * 0.24]), r: 0.5 + 1.4 * t.tendons }); });
  if (t.veins > 0.05) {
    const B = t.breadth, Ly = P.mcpY, zt = P.thick * 0.25, rv = 0.45 + 1.25 * t.veins;
    const path = (pts: [number, number][]) => { for (let i = 1; i < pts.length; i++) veins.push({ a: W([pts[i - 1][0] * B, pts[i - 1][1] * Ly, zt]), b: W([pts[i][0] * B, pts[i][1] * Ly, zt]), r: rv }); };
    path([[0.18, -0.05], [0.2, 0.25], [0.12, 0.5], [0.05, 0.7], [-0.02, 0.85]]);
    path([[-0.25, -0.05], [-0.22, 0.3], [-0.12, 0.55], [-0.02, 0.7]]);
    path([[0.12, 0.5], [0.24, 0.72], [0.32, 0.86]]);
    path([[-0.12, 0.55], [-0.24, 0.78], [-0.3, 0.9]]);
    path([[0.05, 0.7], [0.12, 0.92]]);
  }
  const allPts = [...ph.bones.flatMap(b => [b.a, b.b]), wrist.a, wrist.b];
  const bc = sc(allPts.reduce((a, b) => add(a, b), [0, 0, 0] as Vec3), 1 / allPts.length);
  const br = Math.max(...allPts.map(q => len(sub(q, bc)))) + 25;
  return { fingers, metas, thenar, hypo, palmCore, dorsal, wrist, dimples, tendons, veins, pz, bc, br, prop: ph.prop, fat, kn, t };
}
type Scene = ReturnType<typeof buildScene>;

/** The palm's distance (without the fingers). */
function palmSDF(s: Scene, p: Vec3): number {
  // the metacarpals as flattened cones: squash the depth toward the palm plane
  const pz = s.pz, dz = dot(sub(p, s.palmCore.c), pz), q = sub(p, sc(pz, dz * 0.28));
  let d = Infinity;
  // soft tissue blurs the metacarpals on young and padded hands; lean and old hands show them
  const kMeta = 9 + 9 * (1 - s.kn) * (0.6 + 0.4 * Math.min(1, s.fat * 2));
  for (const m of s.metas) d = smin(d, roundCone(q, m.a, m.b, m.ra, m.rb), kMeta);
  d = smin(d, ellipsoid(p, s.palmCore.c, s.palmCore.e1, s.palmCore.e2, s.palmCore.e3, s.palmCore.r), 8);
  d = smin(d, ellipsoid(p, s.dorsal.c, s.dorsal.e1, s.dorsal.e2, s.dorsal.e3, s.dorsal.r), 18);
  d = smin(d, ellipsoid(p, s.thenar.c, s.thenar.e1, s.thenar.e2, s.thenar.e3, s.thenar.r), 7);
  d = smin(d, ellipsoid(p, s.hypo.c, s.hypo.e1, s.hypo.e2, s.hypo.e3, s.hypo.r), 7);
  // the wrist: an elliptic round cone toward the forearm
  {
    const w = s.wrist, ax = nrm(sub(w.b, w.a)), rel = sub(p, w.a), along = dot(rel, ax), perp = sub(rel, sc(ax, along));
    const xz = dot(perp, nrm(cross(ax, pz))), zz = dot(perp, pz), rr = Math.hypot(xz / w.rx, zz / w.rz) * Math.min(w.rx, w.rz) - Math.min(w.rx, w.rz);
    // above its start the wrist narrows into the palm (half a millimetre per millimetre) and ends inside it: no cap edge
    const L = len(sub(w.b, w.a)), dw = Math.max(rr + Math.max(0, -along) * 0.5, along - L);
    d = smin(d, Math.max(dw, -along - 40), 14);
  }
  // tendons and veins lie under the skin: their ridges are blended wide unless the hand is lean or old
  for (const tdn of s.tendons) d = smin(d, capsule(p, tdn.a, tdn.b, tdn.r), 2.5 + 3 * (1 - s.t.tendons));
  for (const v of s.veins) d = smin(d, capsule(p, v.a, v.b, v.r), 1.8 + 2.5 * (1 - s.t.veins));
  for (const dm of s.dimples) d = Math.max(d, -(len(sub(p, dm)) - 3.2) * 0.6 + 0.0 * d);
  return d;
}
/** A finger's distance (bones, joints and pads blended). */
function fingerSDF(f: FingerSDF, p: Vec3): number {
  let d = Infinity;
  // consecutive phalanges share their radius at the joint, so a plain union is one smooth tube (a smooth minimum here
  // swelled every joint into a ring); the joints' own swelling comes from `joints`, by how knobbly the hand is
  for (const b of f.bones) d = Math.min(d, roundCone(p, b.a, b.b, b.ra, b.rb));
  for (const j of f.joints) d = smin(d, len(sub(p, j.c)) - j.r, 2.4);
  for (const e of f.pads) d = smin(d, ellipsoid(p, e.c, e.e1, e.e2, e.e3, e.r), 3.4);
  return d;
}
/** The nail plate's distance. */
function nailSDF(n: NailSDF, p: Vec3): number {
  const rel = sub(p, n.a), t = dot(rel, n.d), x = dot(rel, n.side), z = dot(rel, n.up), rho = Math.hypot(x, z);
  // the plate spans about four fifths of the fingertip's width (natural nails, Commons and CC0 reference photographs),
  // flatter than the finger: its sides sink under the lateral nail folds
  const r = n.ra + (n.rb - n.ra) * clamp(t / n.L, 0, 1), phiMax = Math.asin(0.8), phi = Math.atan2(x, z);
  const u = clamp(Math.abs(phi) / phiMax, 0, 1.5);
  // the proximal fold's edge is an arc, furthest back in the middle
  const t0 = n.L * 0.4 + n.L * 0.09 * u * u;
  let tEnd = n.L + n.free - 0.3;
  if (n.shape === "oval") tEnd -= (n.free + 1.2) * u * u * 0.6;
  else if (n.shape === "round") tEnd -= (n.free + 1.8) * u * u * 0.8;
  else if (n.shape === "almond") tEnd -= (n.free + 1.5) * Math.pow(u, 1.8) * 0.75;
  else tEnd -= 0.6 * Math.pow(u, 6);
  // the plate rides just proud of the blended skin (the joints and pads swell the surface by up to a millimetre)
  // over the rounded fingertip the plate follows the tip down (to about 60% of the radius), then runs straight on as
  // the free edge: a short nail does not stand out past the fingertip as a ring
  const tb = n.L - n.rb * 0.85, dt = Math.max(0, t - tb), skinR = Math.sqrt(Math.max(0, r * r - dt * dt));
  const lift = Math.max(skinR, r * 0.6);
  const shell = Math.abs(rho - (lift + 0.75 - 0.65 * u * u)) - 0.38, sector = (Math.abs(phi) - phiMax) * rho, along = Math.max(t0 - t, t - tEnd);
  return Math.max(shell, sector, along);
}

let LAST = 0; // 0 skin, 1 nail, 2 prop
let LAST_F = -1; // the finger (0 thumb … 4 little) or -1 for the palm
function sceneSDF(s: Scene, p: Vec3, wantId = false): number {
  const db = len(sub(p, s.bc)) - s.br;
  if (db > 4) { if (wantId) { LAST = 0; LAST_F = -1; } return db; }
  const palm = palmSDF(s, p);
  let d = palm, id = -1;
  for (let i = 0; i < s.fingers.length; i++) {
    const f = s.fingers[i], lb = len(sub(p, f.bc)) - f.br;
    if (lb > d + 12) continue;
    const df = fingerSDF(f, p), k = f.thumb ? 9 : 5.5;
    const joined = smin(palm, df, k);
    if (joined < d) { d = joined; if (df < palm) id = i; }
  }
  let mat = 0;
  for (const f of s.fingers) if (f.nail) { const lb = len(sub(p, add(f.nail.a, sc(f.nail.d, f.nail.L)))) - f.nail.L - 8; if (lb < d) { const dn = nailSDF(f.nail, p); if (dn < d) { d = dn; mat = 1; } } }
  if (s.prop.kind !== "none") { const dp = propDistance(p, s.prop); if (dp < d) { d = dp; mat = 2; } }
  if (wantId) { LAST = mat; LAST_F = id; }
  return d;
}

/** Render a posed hand. */
export function renderHand(ph: PosedHand, o: HandRenderOptions = {}): HandRender {
  const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
  const W = Math.round(o.width ?? 320), H = Math.round(o.height ?? 320), SS = Math.max(1, Math.round(o.supersample ?? 2)), w = W * SS, h = H * SS;
  const s = buildScene(ph), t = ph.hand.type, seed = o.seed ?? 3, detail = o.detail ?? 1;
  // the model is built as a left hand (x toward the thumb, y toward the fingers, z toward the back); a right hand is its mirror
  const mirror = ph.hand.side === "right" ? -1 : 1;
  // camera: look at the hand's centre from the chosen side, then turn
  const view = o.view ?? "back";
  // (views name the hand's sides, so a mirrored right hand is seen from its own thumb side)
  let fwd: Vec3 = view === "palm" ? [0, 0, 1] : view === "thumb-side" ? [-mirror, 0, 0] : view === "little-side" ? [mirror, 0, 0] : view === "three-quarter" ? nrm([-0.55 * mirror, -0.25, -0.8]) : [0, 0, -1];
  let up: Vec3 = [0, 1, 0];
  const turn = (v: Vec3, axis: Vec3, deg: number) => { const a = (deg * Math.PI) / 180, c = Math.cos(a), sn = Math.sin(a), dd = dot(axis, v); return add(add(sc(v, c), sc(cross(axis, v), sn)), sc(axis, dd * (1 - c))); };
  if (o.yaw) { fwd = turn(fwd, up, o.yaw); }
  if (o.pitch) { const r = nrm(cross(fwd, up)); fwd = turn(fwd, r, o.pitch); up = turn(up, r, o.pitch); }
  if (o.roll) up = turn(up, fwd, o.roll);
  fwd = nrm(fwd); const right = nrm(cross(fwd, up)); up = cross(right, fwd);
  const toWorld = (q: Vec3): Vec3 => (mirror < 0 ? [-q[0], q[1], q[2]] : q);
  let focusPt = s.bc;
  if (o.focus && o.focus !== "palm") { const b = ph.bones.find(q => q.finger === o.focus && q.seg === 2); if (b) focusPt = add(b.a, sc(sub(b.b, b.a), 0.45)); }
  else if (o.focus === "palm") focusPt = s.palmCore.c;
  const target = toWorld(focusPt), R = o.frameMm ? o.frameMm / 2 : (s.br * 0.82) / Math.max(1, o.zoom ?? 1), dist = (o.frameMm ? o.frameMm / 2 : s.br * 0.82) * 4.2, cam = sub(target, sc(fwd, dist)), fov = (2 * Math.atan(R / dist)) * 1.06, fpx = (h / 2) / Math.tan(fov / 2);
  const mmPerPx = (dist / fpx) * 1, footprint = mmPerPx * SS;
  // lights (toward the light), in world
  const kaz = ((o.keyAzimuth ?? -35) * Math.PI) / 180, kel = ((o.keyElevation ?? 40) * Math.PI) / 180;
  const Lk = nrm(add(add(sc(right, Math.sin(kaz) * Math.cos(kel)), sc(up, Math.sin(kel))), sc(fwd, -Math.cos(kaz) * Math.cos(kel))));
  const Lf = nrm(add(add(sc(right, 0.6), sc(up, -0.05)), sc(fwd, -0.8))), Lr = nrm(add(add(sc(right, 0.4), sc(up, 0.5)), sc(fwd, 0.75)));
  const keyI = [3.0, 2.86, 2.72], fillI = [0.34, 0.36, 0.4], rimI = [0.8, 0.8, 0.85], skyI = [0.22, 0.235, 0.27];
  const skin = linearOf(o.skin ?? t.skin), palmSkin = linearOf(skinZoneColor(o.skin ?? t.skin, "palms-soles")), knuckleTint = linearOf(skinZoneColor(o.skin ?? t.skin, "knuckles-elbows-knees"));
  // a natural nail shows the bed through the plate: the skin's colour a little pinker and lighter (low contrast in the
  // reference photographs); polish (`nailColour`) replaces it
  const polish = !!o.nailColour;
  const nailBed: Vec3 = polish ? linearOf(o.nailColour!) as Vec3 : [skin[0] * 0.97 + 0.035, skin[1] * 0.86 + 0.01, skin[2] * 0.88 + 0.012];
  const bgc = linearOf(o.background ?? "#8a8784");
  const S = (p: Vec3) => sceneSDF(s, mirror < 0 ? [-p[0], p[1], p[2]] : p);
  const SI = (p: Vec3) => sceneSDF(s, mirror < 0 ? [-p[0], p[1], p[2]] : p, true);
  const normalAt = (p: Vec3): Vec3 => { const e = 0.12; return nrm([S([p[0] + e, p[1], p[2]]) - S([p[0] - e, p[1], p[2]]), S([p[0], p[1] + e, p[2]]) - S([p[0], p[1] - e, p[2]]), S([p[0], p[1], p[2] + e]) - S([p[0], p[1], p[2] - e])]); };
  // The key's shadow: a depth map traced from the light by the same marcher as the camera's rays (robust where the field
  // is inexact), read with sixteen Poisson taps over about 1.2 mm: a softbox's soft edge.
  const draft = o.quality === "draft";
  const SMR = draft ? 0 : Math.min(384, Math.max(160, Math.round(Math.max(w, h) * 0.7 * Math.sqrt(Math.max(1, o.zoom ?? 1))))), lr = nrm(cross(Lk, Math.abs(Lk[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0])), lu = cross(lr, Lk);
  const smSpan = s.br * 1.05, smCell = (2 * smSpan) / Math.max(1, SMR), smOrigin = add(toWorld(s.bc), sc(Lk, s.br + 40)), smDepth = new Float32Array(SMR * SMR).fill(Infinity);
  for (let j = 0; j < SMR; j++) for (let k = 0; k < SMR; k++) {
    const o0 = add(add(smOrigin, sc(lr, -smSpan + (k + 0.5) * smCell)), sc(lu, -smSpan + (j + 0.5) * smCell)), dirL = sc(Lk, -1);
    let tt = 0, tPrev = 0, hitL = false;
    for (let it = 0; it < 220 && tt < 2 * (s.br + 40); it++) { const d = S(add(o0, sc(dirL, tt))); if (d < 0.04) { hitL = true; break; } tPrev = tt; tt += d * 0.7; }
    if (!hitL) continue;
    if (S(add(o0, sc(dirL, tt))) < 0) { let a = tPrev, b = tt; for (let it = 0; it < 8; it++) { const m = (a + b) / 2; if (S(add(o0, sc(dirL, m))) > 0) a = m; else b = m; } tt = a; }
    smDepth[j * SMR + k] = tt;
  }
  const POISSON: [number, number][] = [[-0.94, -0.4], [0.95, -0.77], [-0.09, -0.93], [0.34, 0.29], [-0.92, 0.46], [-0.82, 0.15], [0.97, 0.76], [0.44, -0.25], [0.53, 0.6], [-0.26, 0.6], [0.66, -0.44], [-0.48, -0.75], [0.2, -0.53], [-0.33, -0.05], [-0.06, 0.94], [0.27, 0.86]];
  const softShadow = (p: Vec3) => {
    if (draft) return 1;
    const rel = sub(p, smOrigin), uu = (dot(rel, lr) + smSpan) / smCell - 0.5, vv0 = (dot(rel, lu) + smSpan) / smCell - 0.5, dp = -dot(rel, Lk), pen = 1.2 / smCell;
    let lit = 0;
    for (const [a, b] of POISSON) {
      const xi = Math.round(uu + a * pen), yi = Math.round(vv0 + b * pen);
      if (xi < 0 || yi < 0 || xi >= SMR || yi >= SMR) { lit++; continue; }
      if (dp <= smDepth[yi * SMR + xi] + 1.2 + smCell * 0.8) lit++;
    }
    return lit / POISSON.length;
  };
  const aoAt = (p: Vec3, n: Vec3) => { let occ = 0, sca = 1; for (let i = 1; i <= 5; i++) { const hh = 1.2 * i * i * 0.5 + 0.5, d = S(add(p, sc(n, hh))); occ += (hh - d) * sca; sca *= 0.7; } return clamp(1 - occ * 0.06, 0, 1); };
  const E = new Float32Array(w * h * 3), Alb = new Float32Array(w * h * 3), Spec = new Float32Array(w * h * 3), mask = new Float32Array(w * h), hit = new Uint8Array(w * h);
  const out = createRaster(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, rr = Math.hypot((x - w * 0.45) / w, (y - h * 0.4) / h), kb = 1.1 - 0.7 * rr;
    out.rgb[i * 3] = bgc[0] * kb; out.rgb[i * 3 + 1] = bgc[1] * kb; out.rgb[i * 3 + 2] = bgc[2] * kb; out.alpha[i] = 1;
    const dir = nrm(add(add(fwd, sc(right, (x + 0.5 - w / 2) / fpx)), sc(up, -(y + 0.5 - h / 2) / fpx)));
    // march to the hand's bounding sphere, then sphere-trace
    const bcw = toWorld(s.bc), oc = sub(cam, bcw), bq = dot(oc, dir), cq = dot(oc, oc) - (s.br + 30) ** 2, disc = bq * bq - cq;
    if (disc < 0) continue;
    // (the field overestimates a little in places: step at 0.7 of it, then settle onto the surface by bisection)
    let tt = Math.max(0, -bq - Math.sqrt(disc)), found = false, tPrev = tt;
    const tmax = -bq + Math.sqrt(disc);
    for (let k = 0; k < 200 && tt < tmax; k++) { const d = S(add(cam, sc(dir, tt))); if (d < 0.04) { found = true; break; } tPrev = tt; tt += d * 0.7; }
    if (!found) continue;
    if (S(add(cam, sc(dir, tt))) < 0) { let a = tPrev, b = tt; for (let it = 0; it < 10; it++) { const m = (a + b) / 2; if (S(add(cam, sc(dir, m))) > 0) a = m; else b = m; } tt = a; }
    hit[i] = 1;
    const p = add(cam, sc(dir, tt));
    SI(p); const mat = LAST, fid = LAST_F;
    let n = normalAt(p);
    const v = sc(dir, -1), pl: Vec3 = mirror < 0 ? [-p[0], p[1], p[2]] : p;
    // what part of the hand: dorsal or palmar, which finger segment, for colour, texture and creases
    let palmar = 0, region = "back-of-hand", u = 0, vv = 0, joint = 0, segAlong = 0, nearestBone: Scene["fingers"][number]["bones"][number] | null = null;
    const nl: Vec3 = mirror < 0 ? [-n[0], n[1], n[2]] : n;
    if (fid >= 0) {
      const f = s.fingers[fid];
      let bd = Infinity;
      for (const b of f.bones) { const dd = capsule(pl, b.a, b.b, 0); if (dd < bd) { bd = dd; nearestBone = b; } }
      if (nearestBone) {
        const b = nearestBone, L = len(sub(b.b, b.a)), dd = sc(sub(b.b, b.a), 1 / L), rel = sub(pl, b.a);
        segAlong = dot(rel, dd) / L; palmar = smooth(-0.1, 0.4, -dot(nl, b.up));
        u = Math.atan2(dot(rel, b.side), dot(rel, b.up)) * ((b.ra + b.rb) / 2); vv = dot(rel, dd) + b.seg * 40;
        const nearJoint = Math.min(Math.abs(segAlong), Math.abs(1 - segAlong) * (b.seg === 2 ? 9 : 1));
        joint = b.seg === 0 && f.thumb ? 0 : 1 - smooth(0.06, 0.2, nearJoint * L / 40);
        region = palmar > 0.5 ? (b.seg === 2 && !f.thumb ? "fingertip" : "palm") : joint > 0.4 ? "knuckle" : "back-of-hand";
      }
    } else {
      palmar = smooth(-0.15, 0.35, -dot(nl, s.pz)); region = palmar > 0.5 ? "palm" : "back-of-hand";
      u = pl[0]; vv = pl[1];
    }
    // shading
    const occ = o.debug === "no-ao" ? 1 : aoAt(p, n), sh = o.debug === "no-shadow" ? 1 : softShadow(add(p, sc(n, 0.6)));
    if (o.debug === "normals") { for (let k = 0; k < 3; k++) { E[i * 3 + k] = 1; Alb[i * 3 + k] = n[k] * 0.5 + 0.5; } mask[i] = 0; continue; }
    let alb: Vec3 = [skin[0], skin[1], skin[2]], rough = 0.42, sstr = 0.7;
    if (mat === 0) {
      alb = [skin[0] + (palmSkin[0] - skin[0]) * palmar, skin[1] + (palmSkin[1] - skin[1]) * palmar, skin[2] + (palmSkin[2] - skin[2]) * palmar];
      // knuckles and fingertips a little redder
      const red = Math.max(joint * (1 - palmar) * 0.35, fid >= 0 && segAlong > 0.7 && nearestBone?.seg === 2 ? 0.3 : 0);
      alb = [alb[0] + (knuckleTint[0] - alb[0]) * red, alb[1] + (knuckleTint[1] - alb[1]) * red, alb[2] + (knuckleTint[2] - alb[2]) * red];
      // texture by region, faded by the pixel's size
      if (detail > 0 && !draft) {
        const reg = findSkinRegion(region), so = { age: t.skinAge, footprint, seed };
        const s0 = skinSurface(reg, u, vv, so), e2 = Math.max(0.05, footprint * 0.5);
        const gu = (skinSurface(reg, u + e2, vv, so).height - s0.height) / e2, gv = (skinSurface(reg, u, vv + e2, so).height - s0.height) / e2;
        const tu = nrm(cross(n, up)), tv = nrm(cross(tu, n));
        n = nrm(add(n, add(sc(tu, -gu * 0.7 * detail), sc(tv, -gv * 0.7 * detail))));
        const dk = s0.darken * detail;
        alb = [alb[0] * (1 - dk * 0.8), alb[1] * (1 - dk), alb[2] * (1 - dk * 1.05)];
        // age spots on the back of old hands
        const spot = palmar < 0.5 ? ageSpotsAt(pl[0] * 2, pl[1] * 2, t.skinAge, seed) * 1.3 : 0;
        alb = [alb[0] * (1 - spot * 0.3), alb[1] * (1 - spot * 0.42), alb[2] * (1 - spot * 0.52)];
      }
      // creases: the palm's flexion creases, and the creases at each finger joint (palmar side)
      let crease = 0;
      if (fid < 0 && palmar > 0.4) {
        const X = pl[0] / t.breadth, Y = pl[1] / ph.hand.palm.mcpY, line = (dd: number, wd: number) => Math.exp(-(dd * dd) / (wd * wd));
        // the distal palmar crease (heart line), the proximal (head line), the thenar crease (life line), the wrist creases
        crease = Math.max(line(Y - (0.88 - 0.1 * X - 0.08 * X * X), 0.012), line(Y - (0.72 + 0.12 * X), 0.012) * smooth(-0.45, -0.2, X),
          line(Math.hypot((X - 0.32) * 1.2, Y - 0.12) - 0.52, 0.012) * smooth(0.0, 0.1, Y) * smooth(0.8, 0.6, Y), line(pl[1] - 2, 0.9), line(pl[1] + 7, 0.9) * 0.7);
      } else if (fid >= 0 && palmar > 0.4 && nearestBone) {
        const b = nearestBone, L = len(sub(b.b, b.a)), mm = segAlong * L;
        const at = (q: number) => Math.exp(-((mm - q) ** 2) / 0.35);
        crease = b.seg === 0 && !s.fingers[fid].thumb ? Math.max(at(L * 0.38), at(L * 0.38 - 1.6) * 0.7) : b.seg === 1 ? Math.max(at(0.6), at(-0.9) * 0.7) : b.seg === 2 ? at(0.5) : 0;
        if (s.fingers[fid].thumb && b.seg === 1) crease = Math.max(at(0.8), at(-1) * 0.6);
      }
      if (crease > 0.01) alb = [alb[0] * (1 - 0.35 * crease), alb[1] * (1 - 0.42 * crease), alb[2] * (1 - 0.44 * crease)];
      rough = 0.42 - 0.08 * (1 - palmar); sstr = 0.6 * (1 - 0.5 * palmar);
    } else if (mat === 1) {
      // nail: the bed's pink through the plate, a white lunula at the cuticle, a white free edge beyond the tip
      const f = s.fingers.find(q => q.nail && nailSDF(q.nail, pl) < 0.6);
      if (f?.nail) {
        const nn = f.nail, rel = sub(pl, nn.a), tq = dot(rel, nn.d) / nn.L, x = dot(rel, nn.side), zz = dot(rel, nn.up);
        const r0 = nn.ra + (nn.rb - nn.ra) * clamp(tq, 0, 1), uq = clamp(Math.abs(Math.atan2(x, zz)) / Math.asin(0.8), 0, 1);
        const fi = s.fingers.indexOf(f), start = 0.4 + 0.09 * uq * uq;
        // the lunula: a pale arc at the base, plain on the thumb, faint on the index, rarely seen on the others
        const lunK = f.thumb ? 0.42 : fi === 1 ? 0.2 : 0.07, lunEdge = start + 0.13 * (1 - uq * uq);
        const lun = smooth(lunEdge + 0.02, lunEdge - 0.02, tq) * lunK;
        // the smile line: the bed ends in a curve (furthest forward in the middle); beyond it the free edge is ivory
        // and partly clear, so it takes some of the colour behind it
        const smile = 1 + (nn.free > 0 ? -0.02 : 0.02) - 0.06 * uq * uq, edge = polish ? 0 : smooth(smile - 0.015, smile + 0.015, tq);
        const ivory: Vec3 = [0.86, 0.82, 0.74], under: Vec3 = [bgc[0] * 0.6, bgc[1] * 0.6, bgc[2] * 0.6];
        const free: Vec3 = [ivory[0] * 0.9 + under[0] * 0.1, ivory[1] * 0.9 + under[1] * 0.1, ivory[2] * 0.9 + under[2] * 0.1];
        // just behind the smile line the bed is a shade pinker (the onychodermal band)
        const band = polish ? 0 : Math.exp(-((tq - (smile - 0.05)) ** 2) / 0.0012) * 0.5;
        let c: Vec3 = [nailBed[0] * (1 + 0.06 * band), nailBed[1] * (1 - 0.08 * band), nailBed[2] * (1 - 0.06 * band)];
        c = [c[0] + (0.86 - c[0]) * lun, c[1] + (0.82 - c[1]) * lun, c[2] + (0.8 - c[2]) * lun];
        c = [c[0] + (free[0] - c[0]) * edge, c[1] + (free[1] - c[1]) * edge, c[2] + (free[2] - c[2]) * edge];
        // the folds shade the plate where they overlap it: a soft dark rim at the cuticle and along the sides
        const fold = 1 - 0.22 * smooth(start + 0.06, start, tq) - 0.08 * smooth(0.85, 1, uq) * (1 - edge);
        // faint lengthwise ridges
        c = sc(c, fold * (0.975 + 0.025 * Math.sin(x * 6.5 + 0.7 * Math.sin(tq * 9))));
        alb = c;
        void r0;
      }
      rough = polish ? 0.07 : 0.2; sstr = polish ? 2.2 : 1.4;
    } else {
      alb = [0.55, 0.45, 0.33]; rough = 0.45; sstr = 0.5;
      if (s.prop.kind === "sphere") alb = [0.62, 0.2, 0.16];
      if (s.prop.kind === "box") alb = [0.7, 0.68, 0.62];
    }
    const nlK = dot(n, Lk), nlF = dot(n, Lf), nlR = dot(n, Lr), nlS = dot(n, up);
    const wrap = (q: number, k: number) => Math.max(0, (q + k) / (1 + k));
    const ggx = (L: Vec3, a: number) => { const hv = nrm(add(v, L)), nh = Math.max(0, dot(n, hv)), nL = Math.max(0, dot(n, L)), nv = Math.max(1e-3, dot(n, v)), a2 = a * a, dd = nh * nh * (a2 - 1) + 1, F = 0.028 + 0.972 * Math.pow(1 - Math.max(0, dot(v, hv)), 5); return ((a2 / (Math.PI * dd * dd)) * F * nL) / (4 * nv) * (nL / (nL * (1 - a / 2) + a / 2)); };
    for (let k = 0; k < 3; k++) {
      E[i * 3 + k] = keyI[k] * wrap(nlK, 0.1) * sh + fillI[k] * wrap(nlF, 0.25) * (0.5 + 0.5 * occ) + skyI[k] * occ * (0.6 + 0.4 * nlS) + rimI[k] * Math.max(0, nlR) * Math.pow(1 - Math.max(0, dot(n, v)), 1.6) * 1.2;
      E[i * 3 + k] *= 0.55 + 0.45 * occ;
      Alb[i * 3 + k] = alb[k];
      Spec[i * 3 + k] = (keyI[k] * ggx(Lk, rough) * sh + fillI[k] * ggx(Lf, rough + 0.1)) * sstr * (mat === 0 ? 0.6 : 1) + skyI[k] * 0.04 * occ * (mat === 1 ? 3 : 1);
    }
    mask[i] = mat === 0 ? 1 : 0;
  }
  // light scattered under the skin: red furthest (about 1.6 mm), green 0.7, blue 0.35 (estimated from the skin profile)
  const em = new Float32Array(w * h);
  const scattered = [1.6, 0.7, 0.35].map((mm, k) => {
    for (let i = 0; i < w * h; i++) em[i] = E[i * 3 + k] * mask[i];
    const bl = gaussianBlur(em, w, h, 1, mm / mmPerPx), bm = gaussianBlur(mask, w, h, 1, mm / mmPerPx);
    return bl.map((x, i) => (bm[i] > 1e-3 ? x / bm[i] : 0));
  });
  for (let i = 0; i < w * h; i++) {
    if (!hit[i]) continue;
    for (let k = 0; k < 3; k++) {
      const e = mask[i] ? scattered[k][i] * 0.6 + E[i * 3 + k] * 0.4 : E[i * 3 + k];
      out.rgb[i * 3 + k] = Alb[i * 3 + k] * e + Spec[i * 3 + k];
    }
  }
  const fin = downsample(out, SS), rgba = encodeSrgb(fin, { toneMap: "filmic", exposure: 0.85, white: 3.6 });
  return { width: W, height: H, rgba, ms: (typeof performance !== "undefined" ? performance.now() : Date.now()) - t0 };
}
