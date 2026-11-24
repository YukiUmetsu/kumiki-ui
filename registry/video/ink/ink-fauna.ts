/**
 * INK-FAUNA1: birds, fish and butterflies of Chinese ink painting, as subjects for any ink film.
 *
 * Birds are drawn from a small model in space: the bones of a wing, the quills that hang on them, and a pose (how far each bone is
 * lifted and swept, how far the hand is spread). A beat is a list of poses: spread and pushed down, then folded and drawn up, with the
 * body rising on the push. So one bird can be seen from above, level or below, turned, and facing either way. x forward, y up, z near.
 *
 *   inkCrane      鶴  flying 1100 × 1000, standing 700 × 1000   six wing poses as a cycle, or a glide; standing, it breathes
 *   inkGoose      雁  300 × 290    a few marks, five poses; give each bird of a line its own `phase`
 *   inkSwallow    燕  480 × 480    four poses: two quick beats, then a slide
 *   inkKoi        鯉  760 × 760    from above; one wave runs from head to tail, fins and tail lag behind
 *   inkButterfly  蝶  400 × 400    four poses of the wings about the body
 *
 * To fly a bird across a picture, move the subject itself; nothing here travels.
 */
import { inkNoise2 } from "../ink-riso-press";
import { inkBloomed, inkClamp, inkClear, inkDice, inkDot, inkEase, inkLerp, inkLine, inkMarksPart, inkRound, inkStep, inkStroke, inkWipe } from "./ink-brush-kit";
import type { InkDice, InkMark } from "./ink-brush-kit";
import type { InkPart, InkSubject } from "./ink-cel";
import type { InkMotion } from "./ink-motion";
import { inkPlates } from "./ink-pigments";

const K = "ink", WHITE = "#FDFBF5";
// ---- wings ---------------------------------------------------------------------------------------------------------------------
type V3 = readonly [number, number, number];
const add = (a: V3, b: V3, k = 1): V3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k], dot3 = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], unit = (a: V3): V3 => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }, mix3 = (a: V3, b: V3, t: number): V3 => [inkLerp(a[0], b[0], t), inkLerp(a[1], b[1], t), inkLerp(a[2], b[2], t)], rad = Math.PI / 180;
/** How a wing is held: each bone's lift and forward sweep in degrees, how far the hand's feathers are fanned, how the tips bend. */
interface WingPose { lift: V3; sweep: V3; fan: number; flex: number; pitch: number; /** How far the inner and outer quills of the hand stand off it, degrees, instead of what the fan gives. */ quills?: readonly [number, number] }
/** Lengths of a wing, body units: the bones, then how long and wide its feathers are. */
interface WingForm { bones: V3; primaries: number; primary: number; secondaries: number; secondary: number; tertials: number; tertial: number; width: number; /** Length of the hand's inmost quill, as a share of the longest; left out, all nearly as long. */ inner?: number; seed?: number }
interface Feather { kind: "primary" | "secondary" | "tertial"; i: number; n: number; spine: V3[]; across: V3; width: number }
interface Wing { shoulder: V3; elbow: V3; wrist: V3; end: V3; feathers: Feather[]; normal: V3 }
/** A wing as bones and quills. x is forward, y up, z out on the near side; `side` −1 is the far wing. */
function wingOf(form: WingForm, pose: WingPose, shoulder: V3, side: 1 | -1): Wing {
  const dir = (k: 0 | 1 | 2): V3 => { const e = pose.lift[k] * rad, s = pose.sweep[k] * rad; return [Math.sin(s), Math.sin(e) * Math.cos(s), Math.cos(e) * Math.cos(s) * side]; };
  const d0 = dir(0), d1 = dir(1), d2 = dir(2), elbow = add(shoulder, d0, form.bones[0]), wrist = add(elbow, d1, form.bones[1]), end = add(wrist, d2, form.bones[2]);
  // the trailing side of a bone: backward, square to it, then pitched about it
  const back = (f: V3, pitch: number): V3 => { const b: V3 = [-1, 0, 0], k = dot3(b, f), q = unit(add(b, f, -k)), up = cross(f, q), u: V3 = up[1] < 0 ? [-up[0], -up[1], -up[2]] : up, a = pitch * rad; return unit([q[0] * Math.cos(a) + u[0] * Math.sin(a), q[1] * Math.cos(a) + u[1] * Math.sin(a), q[2] * Math.cos(a) + u[2] * Math.sin(a)]); };
  const feathers: Feather[] = [], dice = inkDice(form.seed ?? 5), quill = (kind: Feather["kind"], i: number, n: number, base: V3, d: V3, bone: V3, L: number, w: number, flex: number) => { const nrm = unit(cross(bone, d)), up: V3 = nrm[1] < 0 ? [-nrm[0], -nrm[1], -nrm[2]] : nrm, steps = 7, spine = Array.from({ length: steps }, (_, j) => { const t = j / (steps - 1); return add(add(base, d, L * t), up, L * flex * t * t); }); feathers.push({ kind, i, n, spine, across: unit(cross(up, d)), width: w }); };
  const b2 = back(d2, pose.pitch), b1 = back(d1, pose.pitch), b0 = back(d0, pose.pitch - 4);
  for (let i = 0; i < form.primaries; i++) { const t = i / (form.primaries - 1), a = (inkLerp(pose.quills?.[0] ?? 90 - 8 * pose.fan, pose.quills?.[1] ?? 90 - 78 * pose.fan, Math.pow(t, 0.92)) + dice.near(0, 2.4)) * rad, d = unit(add([b2[0] * Math.sin(a), b2[1] * Math.sin(a), b2[2] * Math.sin(a)], d2, Math.cos(a))); quill("primary", i, form.primaries, mix3(wrist, end, Math.min(1, t * 1.04)), d, d2, form.primary * dice.range(0.96, 1.04) * (form.inner ? inkLerp(form.inner, 1, Math.pow(t, 1.15)) : 0.8 + 0.2 * Math.sin(Math.PI * Math.min(1, 0.15 + t * 0.72))), form.width * dice.range(0.92, 1.08), pose.flex * (0.5 + 0.5 * t)); }
  for (let i = 0; i < form.secondaries; i++) { const t = (i + 0.4) / form.secondaries, d = unit(add(add(b1, d1, 0.16 * (1 - t) * pose.fan), b0, 0.25 * t)); quill("secondary", i, form.secondaries, mix3(wrist, elbow, t), d, d1, form.secondary * (0.94 + 0.14 * t), form.width * 1.05, pose.flex * 0.4); }
  for (let i = 0; i < form.tertials; i++) { const t = i / Math.max(1, form.tertials - 1), d = unit(add(b0, [-0.35, -0.1 - 0.12 * t, 0], 1)); quill("tertial", i, form.tertials, mix3(elbow, shoulder, 0.05 + t * 0.62), d, d0, form.tertial * (1 - 0.16 * t), form.width * 1.15, -0.08); }
  return { shoulder, elbow, wrist, end, feathers, normal: unit(cross(d1, b1)) };
}
/** How the subject is looked at: turned toward us, seen from above, where its middle falls on the page and how big. */
interface View3 { yaw: number; pitch: number; roll: number; x: number; y: number; scale: number; flip: boolean }
const viewer = (v: View3) => { const cy = Math.cos(v.yaw * rad), sy = Math.sin(v.yaw * rad), cp = Math.cos(v.pitch * rad), sp = Math.sin(v.pitch * rad), cr = Math.cos(v.roll * rad), sr = Math.sin(v.roll * rad); return (p: V3): [number, number] => { const x = p[0] * cy - p[2] * sy, z = p[0] * sy + p[2] * cy, y = p[1] * cp - z * sp, X = x * cr - y * sr, Y = x * sr + y * cr; return [v.x + (v.flip ? -X : X) * v.scale, v.y - Y * v.scale]; }; };

// ---- crane ---------------------------------------------------------------------------------------------------------------------
export interface InkCraneOptions {
  seed?: number;
  form?: "flying" | "standing";
  /** The way it faces. */
  facing?: "left" | "right";
  /** Flying: seen from above, level or from below; turned toward us (1) or away (−1). */
  view?: "above" | "level" | "below"; turn?: number;
  /** Flying: wings beat, or are held. Seconds for one beat. */
  flight?: "beat" | "glide"; seconds?: number;
  /** Standing: at rest, with a foot lifted, or calling at the sky. */
  stance?: "still" | "step" | "call";
  /** Colour of the crown. */
  crown?: "cinnabar" | "vermilion" | "rouge";
}
const CRANE: WingForm = { bones: [25, 30, 17], primaries: 10, primary: 46, secondaries: 12, secondary: 27, tertials: 5, tertial: 36, width: 5.4 };
/** One beat: up and open, down with the tips bent by the air, low and forward; then the wrist leads, the hand hangs shut behind it and is thrown open at the top. */
export const INK_CRANE_BEAT: readonly (WingPose & { id: string })[] = [
  { id: "up", lift: [46, 56, 62], sweep: [-12, 16, 2], fan: 1, flex: 0.06, pitch: -6 },
  { id: "down", lift: [14, 14, 26], sweep: [-10, 16, 8], fan: 1.04, flex: 0.16, pitch: -10 },
  { id: "low", lift: [-16, -30, -26], sweep: [-6, 22, 18], fan: 0.96, flex: 0.12, pitch: -4 },
  { id: "lift", lift: [10, 0, -44], sweep: [-24, 34, -26], fan: 0.62, flex: -0.1, pitch: 14 },
  { id: "fold", lift: [36, 34, -14], sweep: [-34, 38, -38], fan: 0.56, flex: -0.12, pitch: 16 },
  { id: "throw", lift: [50, 60, 34], sweep: [-24, 26, -14], fan: 0.82, flex: -0.06, pitch: 6 },
];
/** The outline of a quill as it is seen, root to tip and back. */
function quillShape(f: Feather, P: (p: V3) => [number, number], profile: readonly number[], thin: number) {
  const mid = f.spine.map(P), n = mid.length, L: [number, number][] = [], R: [number, number][] = [];
  for (const [i, p] of mid.entries()) { const q = P(add(f.spine[i], f.across, f.width / 2)), a = mid[Math.max(0, i - 1)], b = mid[Math.min(n - 1, i + 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / l, ny = (b[0] - a[0]) / l, s = (q[0] - p[0]) * nx + (q[1] - p[1]) * ny, w = Math.sign(s || 1) * Math.max(Math.abs(s), thin) * profile[i]; L.push([p[0] + nx * w, p[1] + ny * w]); R.push([p[0] - nx * w, p[1] - ny * w]); }
  return { mid, L, R, shape: [...L, ...[...R].reverse()] as [number, number][], wide: Math.max(...L.map((p, i) => Math.hypot(p[0] - R[i][0], p[1] - R[i][1]))) };
}
/** A crane's wing: white quills with grey in their folds, black inner quills, then the white of the arm laid over their roots. */
function craneWing(d: InkDice, wing: Wing, P: (p: V3) => [number, number], k: number, far: boolean): InkMark[] {
  const out: InkMark[] = [], dim = far ? 0.8 : 1, line = 1.9 * k, order = [...wing.feathers.filter((f) => f.kind === "primary").reverse(), ...wing.feathers.filter((f) => f.kind === "secondary"), ...wing.feathers.filter((f) => f.kind === "tertial")];
  const inner = (f: Feather) => f.kind === "tertial" || (f.kind === "secondary" && f.i > 0), dark = (f: Feather) => quillShape(f, P, f.kind === "tertial" ? [0.6, 1, 1.1, 1.06, 0.9, 0.6, 0.1] : [0.7, 1, 1.16, 1.2, 1.12, 0.86, 0.2], 1.1 * k);
  let covered = false;
  for (const f of order) {
    const black = inner(f), q = black ? dark(f) : quillShape(f, P, [0.5, 0.8, 1, 1, 0.9, 0.62, 0.1], 1.1 * k);
    if (black) {
      if (!covered) { covered = true; for (const g of order) if (inner(g)) out.push(inkClear(dark(g).shape)); }
      // laid wet beside one another: most run together, now and then a thread of paper stays between two
      if (d.chance(0.34)) out.push(inkClear(q.shape));
      const reach = d.range(0.9, 1.06), taper = f.kind === "tertial" ? [0.6, 0.95, 1, 1, 0.86, 0.56, 0.06] : [0.7, 0.95, 1, 1, 0.96, 0.72, 0.14];
      out.push(inkStroke(K, q.mid.map(([x, y], i) => [inkLerp(q.mid[0][0], x, reach), inkLerp(q.mid[0][1], y, reach), taper[i]] as const), q.wide * 0.98, { tip: 0.98 * dim, belly: 0.7 * dim, side: d.sign(), head: 0.1, rim: 0.3, dry: 0, dryEnd: q.wide > 12 ? 0.3 : 0.02, bristles: 7, bleed: 0.5, grain: 0.3, seed: d.seed() }));
      continue;
    }
    out.push(inkClear(q.shape));
    out.push(inkStroke(K, q.mid.map(([x, y], i) => [x, y, [0.6, 0.9, 1, 1, 0.9, 0.6, 0.1][i]] as const), q.wide * 0.96, { tip: 0.27 * dim, belly: 0.015, side: 1, head: 0.1, rim: 0.1, dry: 0, dryEnd: 0.1, bristles: 8, bleed: 0.5, grain: 0.2, seed: d.seed() }));
    for (const [e, s] of [[q.L, 1], [q.R, 0.8]] as const) out.push(inkLine(K, [...e].reverse().map(([x, y], i) => [x, y, [0.7, 1, 0.8, 0.7, 0.6, 0.5, 0.3][i] * s] as const), line, { ink: 0.85 * dim, inkEnd: 0.36 * dim, seed: d.seed() }));
    out.push(inkLine(K, [q.mid[1], q.mid[3], q.mid[5]].map(([x, y], i) => [x, y, [0.7, 0.6, 0.1][i]] as const), line * 0.8, { ink: 0.3 * dim, seed: d.seed() }));
  }
  // the arm: from the skin that spans shoulder and wrist back over the roots of the quills
  const s = P(wing.shoulder), w = P(wing.wrist), e = P(wing.end), fold = P(mix3(mix3(wing.shoulder, wing.wrist, 0.52), wing.elbow, 0.22)), prim = order.filter((f) => f.kind === "primary").reverse(), sec = order.filter((f) => f.kind === "secondary"), ter = order.filter((f) => f.kind === "tertial");
  const at = (f: Feather, t: number) => { const v = t * (f.spine.length - 1), i = Math.min(f.spine.length - 2, Math.floor(v)); return P(mix3(f.spine[i], f.spine[i + 1], v - i)); };
  const rows = [...[...prim].reverse().filter((_, i) => i % 2 === 0).map((f) => [f, 0.3] as const), ...sec.map((f) => [f, 0.4] as const), ...ter.map((f, i) => [f, 0.4 - 0.1 * i] as const)];
  const lead: [number, number][] = [s, fold, w, [inkLerp(w[0], e[0], 0.55), inkLerp(w[1], e[1], 0.55)], e, at(prim[prim.length - 1], 0.34)], trail = rows.map(([f, t]) => at(f, t)), arm = [...lead, ...trail.slice(1)];
  out.push(inkClear(arm));
  return [...out, ...craneCoverts(d, rows, at, lead, k, dim)];
}
function craneCoverts(d: InkDice, rows: readonly (readonly [Feather, number])[], at: (f: Feather, t: number) => [number, number], lead: readonly [number, number][], k: number, dim: number): InkMark[] {
  const out: InkMark[] = [];
  for (const [row, share] of [[0, 1], [1, 0.62], [2, 0.3]] as const) for (let i = 0; i < rows.length - 1; i++) {
    if (row === 2 && d.chance(0.45)) continue;
    const [f, t] = rows[i], [g, u] = rows[i + 1], a = at(f, t * share), b = at(g, u * share), far = at(f, t * share + 0.13), far2 = at(g, u * share + 0.13), dx = (far[0] - a[0] + far2[0] - b[0]) / 2, dy = (far[1] - a[1] + far2[1] - b[1]) / 2, h = d.range(0.8, 1.15) * (row === 0 ? 1 : 0.8);
    // each covert ends in a round, the far side of it lost
    out.push(inkLine(K, [0.04, 0.2, 0.5, 0.78, d.range(0.86, 0.98)].map((v, n) => { const deep = Math.sqrt(Math.max(0, 1 - (2 * v - 1) ** 2)) * h; return [inkLerp(a[0], b[0], v) + dx * deep, inkLerp(a[1], b[1], v) + dy * deep, [0.2, 0.9, 1.1, 0.7, 0.1][n]] as const; }), 1.5 * k, { ink: (row === 0 ? 0.62 : 0.34) * dim, seed: d.seed() }));
    if (row === 0 && d.chance(0.75)) { const c = at(f, t * 0.5), e = [inkLerp(a[0], b[0], 0.3) + dx * 0.8, inkLerp(a[1], b[1], 0.3) + dy * 0.8] as const; out.push(inkStroke(K, [[...c, 0.2], [inkLerp(c[0], e[0], 0.6), inkLerp(c[1], e[1], 0.6), 1], [...e, 0.3]], 8 * k, { tip: 0.2 * dim, belly: 0.01, side: 1, dry: 0, dryEnd: 0.1, bleed: 0.8, seed: d.seed() })); }
  }
  out.push(inkLine(K, lead.map(([x, y], i) => [x, y, [0.4, 0.8, 1.5, 1.1, 0.8, 0.2][i]] as const), 3.4 * k, { ink: 0.95 * dim, inkEnd: 0.5 * dim, tremor: 0.8, seed: d.seed() }));
  return out;
}
/** Body, neck, head, tail and legs of a crane on the wing, in body units: x forward, y up. */
function craneBody(d: InkDice, P: (p: V3) => [number, number], k: number, C: string): InkMark[] {
  const out: InkMark[] = [], at = (x: number, y: number, z = 0): [number, number] => P([x, y, z]), pts = (list: readonly (readonly [number, number, number?])[]) => list.map(([x, y, z]) => at(x, y, z ?? 0));
  // legs, trailed together, one a little lower
  for (const [z, drop, tone] of [[-3, 0, 0.8], [3, -2.4, 1]] as const) {
    const hip = at(-22, -5 + drop * 0.3, z), knee = at(-47, -8 + drop, z), ankle = at(-72, -8.5 + drop * 1.4, z);
    out.push(inkLine(K, [[...hip, 1.6], [...at(-32, -6.4 + drop * 0.6, z), 1.15], [...knee, 1.0]], 3.1 * k, { ink: 0.92 * tone, seed: d.seed() }), inkDot(K, knee[0], knee[1], 2.1 * k, { tone: 0.95 * tone, long: 1.5, seed: d.seed() }), inkLine(K, [[...knee, 1], [...at(-60, -8.4 + drop * 1.2, z), 0.8], [...ankle, 0.9]], 2.7 * k, { ink: 0.92 * tone, seed: d.seed() }));
    for (const [a, l] of [[-4, 13], [3, 12], [10, 10]] as const) out.push(inkLine(K, [[...ankle, 1], [...at(-72 - l * 0.55, -8.5 + drop * 1.4 - a * 0.1, z), 0.9], [...at(-72 - l, -8.8 + drop * 1.4 - a * 0.28, z), 0.15]], 2.4 * k, { ink: 0.9 * tone, seed: d.seed() }));
  }
  // tail
  for (const [y, l, z] of [[4, 20, -4], [2.6, 23, 0], [0.6, 22, 4], [-1.6, 18, 5]] as const) { const a = at(-20, y * 0.5, z * 0.4), b = at(-20 - l, y - 1, z), m = at(-20 - l * 0.6, y * 0.9 + 0.6, z * 0.8), n = at(-20 - l * 0.6, y * 0.9 - 3.4, z * 0.8); out.push(inkClear([a, m, b, n]), inkStroke(K, [[...a, 0.4], [(m[0] + n[0]) / 2, (m[1] + n[1]) / 2, 1], [...b, 0.2]], 3.6 * k * 4.4 * 0.5, { tip: 0.16, belly: 0.02, side: 1, dry: 0, dryEnd: 0.2, bleed: 0.6, seed: d.seed() }), inkLine(K, [[...b, 0.8], [...m, 0.9], [...a, 0.3]], 1.4 * k, { ink: 0.6, seed: d.seed() }), inkLine(K, [[...b, 0.8], [...n, 0.9], [...a, 0.3]], 1.4 * k, { ink: 0.6, seed: d.seed() })); }
  const back = pts([[74, 12.4], [66, 12.6], [52, 11.6], [40, 10.8], [30, 11.4], [22, 12.2], [8, 12.2], [-8, 9], [-22, 4.4]]), belly = pts([[-22, 0], [-12, -7.6], [2, -11.6], [14, -11], [24, -5], [32, 1.6], [42, 5.2], [54, 7.4], [66, 8.4], [74, 8.6]]);
  out.push(inkClear([...back, ...belly]));
  // the neck: black under, white above and at its root
  const neck = pts([[70, 9.6], [60, 8.9], [50, 8.1], [40, 7], [32, 5.4], [26, 2.4]]);
  out.push(inkStroke(K, neck.map(([x, y], i) => [x, y, [0.62, 0.8, 0.9, 1, 0.9, 0.1][i]] as const), 4.9 * 4.4 * k, { tip: 1, belly: 0.82, side: -1, head: 0.2, rim: 0.2, dry: 0, dryEnd: 0.16, bristles: 8, bleed: 0.7, grain: 0.3, seed: d.seed() }));
  // pale grey in the belly's turn and under the wing
  out.push(inkStroke(K, pts([[-16, -4.6], [-4, -8], [8, -8.6], [18, -6], [24, -1]]).map(([x, y], i) => [x, y, [0.2, 0.9, 1, 0.8, 0.1][i]] as const), 7 * 4.4 * k, { tip: 0.3, belly: 0.015, side: -1, dry: 0, dryEnd: 0.2, bleed: 1.2, grain: 0.2, seed: d.seed() }));
  out.push(inkLine(K, pts([[46, 11.2], [38, 10.9], [30, 11.6], [20, 12.4], [8, 12.2], [-8, 9], [-20, 4.8]]).map(([x, y], i) => [x, y, [0.2, 0.7, 1.1, 1.3, 0.8, 1, 0.2][i]] as const), 3.2 * k, { ink: 0.9, tremor: 0.8, seed: d.seed() }), inkLine(K, pts([[32, 1.4], [24, -5], [14, -11], [2, -11.6], [-12, -7.6], [-21, -1]]).map(([x, y], i) => [x, y, [0.3, 1, 1.4, 0.8, 1.1, 0.3][i]] as const), 3.2 * k, { ink: 0.9, tremor: 0.8, seed: d.seed() }));
  for (let i = 0; i < 9; i++) { const x = d.range(-8, 20), y = d.range(-8.4, -1); out.push(inkLine(K, [[...at(x, y), 0.8], [...at(x - 2.4, y - 0.7), 0.7], [...at(x - 4.6, y - 0.6), 0.1]], 1.2 * k, { ink: 0.36, seed: d.seed() })); }
  return [...out, ...craneHead(d, (x, y) => at(x, y), k, C)];
}
/** The head, in the same units (its middle is near 76, 11.5). `open` parts the bill, degrees. */
function craneHead(d: InkDice, at: (x: number, y: number) => [number, number], k: number, C: string, open = 0, upright = false): InkMark[] {
  const out: InkMark[] = [], pts = (list: readonly (readonly [number, number])[]) => list.map(([x, y]) => at(x, y)), gape = Math.tan(open * rad);
  if (!upright) out.push(inkClear(pts([[70, 13], [75, 14.4], [79.4, 13.4], [81.4, 11.4], [80, 9.2], [75, 8.2], [70, 8.6]])));
  // black from the bill under the eye and down the throat (with `upright` the neck's own stroke brings it); white behind it
  if (!upright) out.push(inkStroke(K, pts([[67, 9], [72, 9.1], [76, 9.3], [79, 9.8], [81, 11]]).map(([x, y], i) => [x, y, [0.8, 1, 1, 0.8, 0.4][i]] as const), 2.6 * 4.4 * k, { tip: 1, belly: 0.86, side: 0, head: 0.1, rim: 0.1, dry: 0, dryEnd: 0.1, bleed: 0.4, seed: d.seed() }));
  out.push(inkBloomed(C, pts([[73.2, 14], [76.2, 15], [79.6, 13.9], [81.4, 12], [79, 12.5], [75.6, 13.1]]), { tone: 0.95, soft: 0.8, wander: 0.6, fringe: 0.5, rim: 0.2, rimWidth: 2, mottle: 0.2, cloud: 10, seed: d.seed() }));
  out.push(inkLine(K, pts(upright ? [[69.2, 9], [70, 12], [73.4, 14.4], [78.6, 14.2]] : [[68, 12.9], [72, 13.8], [75.6, 14.7], [79, 13.8]]).map(([x, y], i) => [x, y, [0.3, 0.8, 0.8, 0.2][i]] as const), 1.5 * k, { ink: 0.75, seed: d.seed() }));
  // the bill: two lines that close on a point, the lower one let down when it calls
  const tip = at(97, 9.4 + gape * 6), low = (x: number, y: number) => at(x, y - gape * Math.max(0, x - 80)), lower = low(96, 9.2), root = at(80.6, 11.2);
  out.push(inkClear([at(80, 11.8), tip, at(80, 10)]), inkClear([low(80, 10.6), lower, low(80, 9)]), inkStroke(K, [[...at(80, 10.6), 1], [...at(88, 10.3 + gape * 3), 0.7], [...tip, 0.1]], 2.2 * 4.4 * k, { tip: 0.6, belly: 0.2, side: -1, dry: 0, dryEnd: 0.1, bleed: 0.3, seed: d.seed() }));
  if (open) out.push(inkStroke(K, [[...low(80, 9.8), 1], [...low(88, 9.6), 0.8], [...lower, 0.1]], 1.6 * 4.4 * k, { tip: 0.55, belly: 0.2, side: 1, dry: 0, dryEnd: 0.1, bleed: 0.3, seed: d.seed() }));
  out.push(inkLine(K, [[...root, 0.8], [...at(88, 11 + gape * 3), 1], [...tip, 0.5]], 1.7 * k, { ink: 0.95, seed: d.seed() }), inkLine(K, [[...low(80.4, 9.4), 0.7], [...low(88, 9.4), 0.8], [...lower, 0.5]], 1.5 * k, { ink: 0.9, seed: d.seed() }), inkLine(K, [[...at(80.6, 10.2), 0.8], [...at(90, 10.1 + gape * 3.4), 0.5], [...at(95.4, 9.5 + gape * 5.6), 0.1]], 1.2 * k, { ink: 0.95, seed: d.seed() }));
  out.push(inkDot(K, ...at(77.5, 11.8), 1.6 * k, { tone: 1, seed: d.seed() }));
  return out;
}
/** A crane on the ground, facing right, 700 by 1000: body an egg on its slant, the black inner quills hanging over the tail. */
function craneStanding(d: InkDice, C: string, stance: "still" | "step" | "call", mx: (x: number) => number): { id: string; marks: InkMark[]; group?: string; motion?: readonly InkMotion[] }[] {
  const p = (x: number, y: number, w = 1): [number, number, number] => [mx(x), y, w], q = (x: number, y: number): [number, number] => [mx(x), y], flip = mx(1) < mx(0), sg = flip ? -1 : 1, S = (s: 1 | -1) => (s * sg) as 1 | -1;
  // legs: thigh, the joint, shank, three toes before and one behind
  const legs: InkMark[] = [], leg = (hip: readonly [number, number], joint: readonly [number, number], foot: readonly [number, number], tone: number, down = true) => {
    legs.push(inkLine(K, [p(hip[0], hip[1], 2.2), p(inkLerp(hip[0], joint[0], 0.4), inkLerp(hip[1], joint[1], 0.4), 1.3), p(joint[0], joint[1], 1)], 6, { ink: tone, seed: d.seed() }), inkDot(K, ...q(joint[0], joint[1]), 4.6, { tone, angle: 90, long: 1.8, seed: d.seed() }), inkLine(K, [p(joint[0], joint[1], 1), p(inkLerp(joint[0], foot[0], 0.5) + 2, inkLerp(joint[1], foot[1], 0.5), 0.8), p(foot[0], foot[1], 1)], 6, { ink: tone, seed: d.seed() }));
    for (let t = 0.1; t < 0.92; t += d.range(0.05, 0.09)) legs.push(inkLine(K, [p(inkLerp(joint[0], foot[0], t) - 3, inkLerp(joint[1], foot[1], t) - 1, 0.5), p(inkLerp(joint[0], foot[0], t) + 3, inkLerp(joint[1], foot[1], t) + 1, 0.8)], 1.6, { ink: 0.95, seed: d.seed() }));
    for (const [dx, dy, w] of down ? [[62, 10, 1], [44, 24, 1], [12, 26, 0.9], [-20, 6, 0.7]] as const : [[18, 46, 1], [0, 50, 1], [-14, 42, 0.9], [-12, 12, 0.6]] as const) legs.push(inkLine(K, [p(foot[0], foot[1], 1), p(foot[0] + dx * 0.55, foot[1] + dy * 0.36, w), p(foot[0] + dx, foot[1] + dy, 0.25)], 5.2, { ink: tone, seed: d.seed() }));
  };
  if (stance === "step") { leg([330, 590], [392, 694], [336, 800], 0.8, false); leg([286, 596], [280, 752], [296, 930], 0.95); } else { leg([326, 592], [346, 746], [330, 918], 0.72); leg([282, 596], [272, 754], [290, 936], 0.95); }
  // tail and body
  const body: InkMark[] = [], tail = [[-0.1, 112], [0.06, 122], [0.2, 118], [0.34, 100]] as const;
  for (const [a, l] of tail) { const e: [number, number] = [172 - Math.cos(0.62 - a) * l * 0.9, 566 + Math.sin(0.62 - a) * l * 0.62]; body.push(inkClear([q(196, 540), q(e[0] + 18, e[1] - 12), q(e[0], e[1]), q(e[0] + 34, e[1] + 12), q(206, 590)]), inkLine(K, [p(e[0], e[1], 0.8), p(e[0] + 30, e[1] - 16, 0.9), p(190, 548, 0.2)], 2, { ink: 0.6, seed: d.seed() }), inkLine(K, [p(e[0], e[1], 0.8), p(e[0] + 34, e[1] + 10, 0.9), p(206, 586, 0.2)], 2, { ink: 0.6, seed: d.seed() })); }
  const shape = [q(400, 384), q(352, 380), q(290, 392), q(230, 430), q(180, 486), q(150, 552), q(190, 594), q(256, 616), q(330, 612), q(396, 572), q(432, 506), q(436, 440), q(424, 400)];
  body.push(inkClear(shape));
  body.push(inkStroke(K, [p(196, 588, 0.2), p(250, 604, 0.8), p(322, 600, 1), p(386, 566, 0.8), p(418, 510, 0.2)], 46, { tip: 0.34, belly: 0.01, side: S(1), dry: 0, dryEnd: 0.2, bleed: 1.6, grain: 0.2, seed: d.seed() }));
  // thighs: white feather down to a third of the way
  for (const [hx, hy, jx, jy] of (stance === "step" ? [[330, 590, 392, 694], [286, 596, 280, 752]] : [[326, 592, 346, 746], [282, 596, 272, 754]]) as readonly (readonly [number, number, number, number])[]) { const at = (t: number, o: number) => p(inkLerp(hx, jx, t) + o, inkLerp(hy, jy, t)), L = [at(-0.22, -34), at(0.04, -30), at(0.26, -15), at(0.5, -6)], R = [at(-0.22, 32), at(0.04, 27), at(0.26, 13), at(0.5, 5)]; body.push(inkClear([...L, ...[...R].reverse()].map(([x, y]) => [x, y] as const)), inkStroke(K, [at(0, 14), at(0.2, 9), at(0.42, 3)].map(([x, y], i) => [x, y, [0.3, 1, 0.2][i]] as const), 14, { tip: 0.22, belly: 0.01, side: S(-1), dry: 0, dryEnd: 0.2, bleed: 1, seed: d.seed() })); for (const l of [L, R]) body.push(inkLine(K, l.slice(1).map(([x, y], i) => [x, y, [0.2, 1, 0.5][i]] as const), 2.4, { ink: 0.7, seed: d.seed() })); for (let i = 0; i < 4; i++) { const t = d.range(0.36, 0.52); body.push(inkLine(K, [[...at(t, d.near(0, 5)).slice(0, 2), 0.8] as [number, number, number], [...at(t + 0.1, d.near(0, 5)).slice(0, 2), 0.1] as [number, number, number]], 2, { ink: 0.6, seed: d.seed() })); } }
  body.push(inkLine(K, [p(432, 424, 0.3), p(440, 470, 1), p(426, 524, 1.5), p(392, 572, 1), p(346, 600, 0.3)], 4, { ink: 0.9, tremor: 1, seed: d.seed() }), inkLine(K, [p(262, 612, 0.3), p(220, 602, 1), p(184, 584, 0.4)], 3.4, { ink: 0.75, seed: d.seed() }), inkLine(K, [p(372, 382, 0.2), p(330, 381, 0.9), p(280, 398, 1.2), p(232, 430, 0.8), p(200, 464, 0.2)], 4, { ink: 0.9, tremor: 1, seed: d.seed() }));
  for (let i = 0; i < 12; i++) { const x = d.range(376, 424), y = d.range(440, 540); body.push(inkLine(K, [p(x, y, 0.9), p(x - 5, y + 9, 0.7), p(x - 14, y + 15, 0.1)], 1.8, { ink: 0.34, seed: d.seed() })); }
  // the shut wing: rows of coverts, the long quills under them, then the black plumes
  const wing: InkMark[] = [], plumes: InkMark[] = [], edge = [[398, 432], [410, 470], [392, 516], [346, 556], [280, 576], [214, 578]] as const;
  wing.push(inkStroke(K, edge.map(([x, y], i) => p(x, y + 8, [0.1, 0.5, 0.9, 1, 0.8, 0.2][i])), 26, { tip: 0.02, belly: 0.3, side: S(-1), dry: 0, dryEnd: 0.3, bleed: 1.4, grain: 0.2, seed: d.seed() }), inkLine(K, edge.map(([x, y], i) => p(x, y, [0.2, 0.9, 1.1, 1.3, 0.9, 0.2][i])), 3.4, { ink: 0.85, tremor: 1, seed: d.seed() }));
  for (const [row, n, r, ink] of [[0, 8, 22, 0.6], [1, 8, 19, 0.46], [2, 7, 16, 0.36], [3, 5, 13, 0.28]] as const) for (let i = 0; i < n; i++) { if (d.chance([0.06, 0.16, 0.34, 0.5][row])) continue; const z = d.range(0.82, 1.2); const t = (i + 0.5 + (row % 2) * 0.4) / (n + 0.6), x = inkLerp(400, 232, t) - row * 3 + d.near(0, 4), y = inkLerp(498 - row * 26, 548 - row * 30, Math.pow(t, 0.7)) + 30 * Math.sin(Math.PI * t) * (1 - row * 0.2) + d.near(0, 3); wing.push(inkLine(K, [p(x + r * 0.9 * z, y - r * 0.8 * z, 0.2), p(x + r * 0.5 * z, y + r * 0.1, 0.9), p(x - r * 0.4, y + r * 0.5 * z, 1.2), p(x - r * 1.1 * z, y + r * 0.2, 0.7), p(x - r * 1.3 * z, y - r * 0.4, 0.1)], 2.2, { ink, seed: d.seed() })); }
  const fan = [[232, 436, 30, 128], [246, 452, 40, 150], [222, 452, 46, 176], [250, 478, 34, 168], [214, 474, 54, 190], [238, 504, 38, 178], [206, 494, 64, 196], [226, 526, 46, 172], [204, 520, 70, 168], [216, 546, 56, 130]] as const;
  for (const [x, y, a, l] of fan) { const A = 180 - a + d.near(0, 5), L = l * d.range(0.92, 1.08), bend = d.range(-26, -12), pts: [number, number, number][] = []; let X = x, Y = y; for (let i = 0; i <= 7; i++) { pts.push(p(X, Y, [0.5, 0.85, 1, 1, 0.94, 0.78, 0.46, 0.04][i])); const b = (A + bend * (i / 7)) * rad; X += (Math.cos(b) * L) / 7; Y += (Math.sin(b) * L) / 7; } plumes.push(inkStroke(K, pts, d.range(19, 25), { tip: 1, belly: 0.66, side: S(d.sign()), head: 0.2, rim: 0.3, dry: 0, dryEnd: 0.55, bristles: 9, bleed: 0.7, grain: 0.5, seed: d.seed() })); }
  // neck and head
  const call = stance === "call", spine: readonly (readonly [number, number, number])[] = call ? [[404, 428, 84], [430, 372, 58], [442, 306, 38], [440, 236, 30], [438, 178, 27], [446, 134, 25]] : [[402, 430, 86], [444, 378, 58], [460, 312, 38], [446, 248, 31], [424, 194, 28], [424, 146, 27]], across = (i: number, k: number): [number, number] => { const [x, y, w] = spine[i], a = spine[Math.max(0, i - 1)], b = spine[Math.min(5, i + 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]); return [x - ((b[1] - a[1]) / l) * k * w, y + ((b[0] - a[0]) / l) * k * w]; }, neck: InkMark[] = [];
  const A = (call ? -50 : 4) * rad, u = 4.5, top = spine[5], raw = (x: number, y: number): [number, number] => { const X = (x - (call ? 72.6 : 72.4)) * u, Y = -(y - (call ? 8.4 : 5.4)) * u; return [top[0] + X * Math.cos(A) - Y * Math.sin(A), top[1] + X * Math.sin(A) + Y * Math.cos(A)]; }, at = (x: number, y: number): [number, number] => { const [X, Y] = raw(x, y); return q(X, Y); };
  // neck and head are one skin; the black runs in one stroke from the bill under the eye and down the throat to a point
  const skin: [number, number][] = [...[0, 1, 2, 3, 4].map((i) => across(i, 0.5)), raw(75.4, 6.4), raw(80, 9), raw(81.6, 11.4), raw(79.6, 13.6), raw(75, 14.6), raw(70.6, 12.8), raw(69.2, 8.6), ...[4, 3, 2, 1, 0].map((i) => across(i, -0.5))];
  neck.push(inkClear(skin.map(([x, y]) => q(x, y))));
  const throat = call ? [raw(81, 10.8), raw(77.6, 9.6), raw(74, 8.6)] : [raw(81, 10.8), raw(77.4, 9.8), raw(74.6, 8.4), raw(73.6, 5.4)], black = [...throat, across(4, 0.12), across(3, 0.14), across(2, 0.18), across(1, 0.3)], press = call ? [0.3, 0.62, 0.8, 0.86, 0.94, 1, 0.05] : [0.3, 0.6, 0.78, 0.82, 0.88, 0.94, 1, 0.05];
  neck.push(inkStroke(K, black.map(([x, y], i) => p(x, y, press[i])), 25, { tip: 1, belly: 0.84, side: S(-1), head: 0.1, rim: 0.2, dry: 0, dryEnd: 0.16, bristles: 9, bleed: 0.8, grain: 0.3, seed: d.seed() }));
  neck.push(inkLine(K, [raw(69.3, 8.6), ...[4, 3, 2, 1, 0].map((i) => across(i, -0.5))].map(([x, y], i) => p(x, y, [0.5, 0.6, 0.8, 1, 1.1, 0.2][i])), 3, { ink: 0.78, seed: d.seed() }), inkLine(K, [2, 1, 0].map((i, n) => p(...across(i, 0.5), [0.2, 1, 0.5][n])), 3.4, { ink: 0.85, seed: d.seed() }));
  neck.push(...craneHead(d, at, 1.3, C, call ? 9 : 0, true));
  const pivot = q(404, 420);
  return [{ id: "legs", marks: legs }, { id: "body", marks: body, motion: [{ kind: "breathe", at: q(300, 600), amount: 0.012, seconds: 4.4 }] }, { id: "plumes", marks: plumes, motion: [{ kind: "sway", from: q(250, 470), to: q(90, 620), amount: 4, seconds: 4.2 }] }, { id: "wing", marks: wing, motion: [{ kind: "breathe", at: q(300, 600), amount: 0.012, seconds: 4.4 }] }, { id: "neck", marks: neck, motion: [{ kind: "sway", from: pivot, to: q(top[0], top[1] - 40), amount: call ? 4 : 8, seconds: 6.2, power: 1.5, lag: 0.08 }] }];
}
/** 鶴 */
export function inkCrane(o: InkCraneOptions = {}): InkSubject {
  const seed = o.seed ?? 1, C = "crown", crown = o.crown ?? "cinnabar", flip = (o.facing ?? "right") === "left";
  if (o.form === "standing") {
    const page = { width: 700, height: 1000 }, d = inkDice(seed + 1300), mx = (x: number) => (flip ? page.width - x - 20 : x + 20);
    return { id: `crane-${o.stance ?? "still"}-${seed}`, label: "A red-crowned crane standing", page, plates: inkPlates({ [C]: crown, [K]: "ink" }), seed: 11 + seed, parts: craneStanding(d, C, o.stance ?? "still", mx).map((p) => inkMarksPart(p.id, p.marks, page, { body: WHITE, ...(p.motion ? { motion: p.motion } : {}) })) };
  }
  const d = inkDice(seed + 1200), page = { width: 1100, height: 1000 }, k = 1, scale = 4.4, v: View3 = { yaw: inkClamp(o.turn ?? 0.5, -1, 1) * 34, pitch: { above: 24, level: 7, below: -20 }[o.view ?? "level"], roll: d.near(4, 3), x: 530, y: 560, scale, flip }, P = viewer(v), seconds = o.seconds ?? 1.3, beat = o.flight !== "glide", glide = { id: "glide", lift: [16, 12, 10] as V3, sweep: [-12, 16, 2] as V3, fan: 1, flex: 0.12, pitch: -6 };
  const list = beat ? INK_CRANE_BEAT : [glide], poses = beat ? { kind: "cycle" as const, order: list.map((p) => p.id), seconds } : undefined;
  const groups: Record<string, readonly InkMotion[]> = { bird: beat ? [{ kind: "drift", by: [0, -16], back: seconds / 2 }] : [{ kind: "turn", at: [v.x, v.y], degrees: 2.4, seconds: 5.4 }] };
  const wing = (id: string, side: 1 | -1): InkPart => {
    const shoulder: V3 = [13, 8, 6 * side], marks = new Map(list.map((p, i) => [p.id, craneWing(d.fork((side > 0 ? 10 : 20) + i), wingOf({ ...CRANE, seed: seed * 7 + (side > 0 ? 3 : 4) }, p, shoulder, side), P, k, side < 0)])), all = [...marks.values()].flat(), base = inkMarksPart(id, all, page, { group: "bird", body: WHITE, ...(poses ? { poses } : {}) });
    return { ...base, draw: (c) => { for (const m of marks.get(c.pose || list[0].id) ?? []) m.draw(c.page, c); } };
  };
  return { id: `crane-${seed}`, label: "A red-crowned crane on the wing", page, plates: inkPlates({ [C]: crown, [K]: "ink" }), seed: 11 + seed, parts: [wing("far-wing", -1), inkMarksPart("body", craneBody(d.fork(1), P, k, C), page, { group: "bird", body: WHITE }), wing("near-wing", 1)], groups };
}

// ---- goose and swallow ---------------------------------------------------------------------------------------------------------
interface PlainWing { /** Tones: the hand's quills, the arm's, the coverts. */ hand: number; arm: number; coverts: number; line: number; thin: number; k: number }
/** A small wing: every quill one touch, the coverts a wash over their roots, the leading edge one line. */
function plainWing(d: InkDice, wing: Wing, P: (p: V3) => [number, number], plate: string, o: PlainWing): InkMark[] {
  const out: InkMark[] = [], of = (k: Feather["kind"]) => wing.feathers.filter((f) => f.kind === k), prim = of("primary"), sec = of("secondary"), ter = of("tertial"), s = P(wing.shoulder), w = P(wing.wrist), e = P(wing.end), m = P(mix3(mix3(wing.shoulder, wing.wrist, 0.5), wing.elbow, 0.2)), at = (f: Feather, t: number) => { const v = t * (f.spine.length - 1), i = Math.min(f.spine.length - 2, Math.floor(v)); return P(mix3(f.spine[i], f.spine[i + 1], v - i)); }, order = [...[...prim].reverse(), ...sec, ...ter];
  out.push(inkClear([s, m, w, e, at(prim[prim.length - 1], 0.6), ...[...prim].reverse().filter((_, i) => i % 2 === 0).map((f) => at(f, 0.7)), ...sec.filter((_, i) => i % 2 === 0).map((f) => at(f, 0.85)), ...ter.map((f) => at(f, 0.85))]));
  for (const f of order) { const q = quillShape(f, P, [0.6, 1, 1, 1, 1, 0.8, 0.1], o.thin), tone = (f.kind === "primary" ? o.hand : o.arm) * d.range(0.84, 1.08); out.push(q.wide < 5 * o.k ? inkLine(plate, q.mid.map(([x, y], i) => [x, y, [0.6, 0.9, 1, 1, 0.9, 0.6, 0.05][i]] as const), q.wide * 1.1, { ink: tone, seed: d.seed() }) : inkStroke(plate, q.mid.map(([x, y], i) => [x, y, [0.6, 0.9, 1, 1, 0.94, 0.7, 0.08][i]] as const), q.wide * 1.05, { tip: tone, belly: tone * 0.6, side: 1, head: 0, rim: 0.3, dry: 0, dryEnd: 0.04, bristles: 5, bleed: 0.3, grain: 0.3, seed: d.seed() })); }
  const back = [...[...prim].reverse().filter((_, i) => i % 2 === 0).map((f) => at(f, 0.3)), ...sec.map((f) => at(f, 0.42)), ...ter.map((f, i) => at(f, 0.36 - 0.1 * i))], arm: [number, number][] = [s, m, w, [inkLerp(w[0], e[0], 0.6), inkLerp(w[1], e[1], 0.6)], e, ...back];
  out.push(inkBloomed(plate, arm, { tone: o.coverts, soft: 0.7, wander: 0.8, wave: 8, fringe: 0.5, tooth: 1.6, rim: 0.4, rimWidth: 2, mottle: 0.3, cloud: 12, seed: d.seed() }));
  out.push(inkLine(plate, [s, m, w, e, at(prim[prim.length - 1], 0.5)].map(([x, y], i) => [x, y, [0.3, 0.8, 1.3, 1, 0.1][i]] as const), o.line, { ink: o.hand, seed: d.seed() }));
  return out;
}
/** Wings painted once per pose, hung on the bird. */
function wingPart(id: string, page: { width: number; height: number }, list: readonly { id: string }[], poses: InkPart["poses"], paint: (i: number) => InkMark[], rest: Omit<InkPart, "id" | "draw" | "box">): InkPart {
  const marks = new Map(list.map((p, i) => [p.id, paint(i)]));
  return { ...inkMarksPart(id, [...marks.values()].flat(), page, { ...rest, ...(poses ? { poses } : {}) }), draw: (c) => { for (const m of marks.get(c.pose || list[0].id) ?? []) m.draw(c.page, c); } };
}
export interface InkGooseOptions { seed?: number; facing?: "left" | "right"; view?: "above" | "level" | "below"; turn?: number; flight?: "beat" | "glide"; seconds?: number; /** Where in its beat it starts, 0–1: give the birds of one line different ones. */ phase?: number; pigment?: "ink" | "umber" }
const GOOSE: WingForm = { bones: [10, 13, 9], primaries: 8, primary: 23, secondaries: 8, secondary: 13, tertials: 3, tertial: 14, width: 3 };
const SMALL_BEAT: readonly (WingPose & { id: string })[] = INK_CRANE_BEAT.filter((p) => p.id !== "throw").map((p) => (p.id === "down" ? { ...p, lift: [-2, -5, -9] as V3 } : p)); // no pose with the near wing edge on
/** 雁: a wild goose in a few marks, for a far line of them. */
export function inkGoose(o: InkGooseOptions = {}): InkSubject {
  const seed = o.seed ?? 1, d = inkDice(seed + 3100), page = { width: 300, height: 290 }, flip = (o.facing ?? "right") === "left", v: View3 = { yaw: inkClamp(o.turn ?? 0.5, -1, 1) * 34, pitch: { above: 24, level: 8, below: -20 }[o.view ?? "above"], roll: d.near(3, 4), x: 146, y: 160, scale: 2.3, flip }, P = viewer(v), ink = o.pigment ?? "ink", seconds = o.seconds ?? 0.8, beat = o.flight !== "glide", glide = { id: "glide", lift: [10, 8, 8] as V3, sweep: [-12, 16, 0] as V3, fan: 1, flex: 0.12, pitch: -6 }, list = beat ? SMALL_BEAT : [glide], poses = beat ? { kind: "cycle" as const, order: list.map((p) => p.id), seconds, phase: o.phase ?? 0 } : undefined, at = (x: number, y: number, z = 0) => P([x, y, z]);
  const groups: Record<string, readonly InkMotion[]> = { bird: beat ? [{ kind: "drift", by: [0, -4], back: seconds / 2, phase: (o.phase ?? 0) * Math.PI * 2 }] : [{ kind: "turn", at: [v.x, v.y], degrees: 3, seconds: 4 }] }, flat = (side: 1 | -1) => (i: number) => plainWing(d.fork(i + (side > 0 ? 10 : 30)), wingOf({ ...GOOSE, seed: seed * 5 + side + 2 }, list[i], [6, 3, 3.4 * side], side), P, ink, { hand: side > 0 ? 0.98 : 0.66, arm: side > 0 ? 0.74 : 0.5, coverts: side > 0 ? 0.36 : 0.26, line: 3, thin: 0.9, k: 1 });
  const b = d.fork(1), body: InkMark[] = [];
  for (const z of [-2, 2]) body.push(inkLine(ink, [[...at(-13, 0.4, z * 0.4), 1], [...at(-25, 0.5, z), 1], [...at(-31, 0.2, z * 1.6), 0.1]], 5, { ink: 0.95, seed: b.seed() }));
  body.push(inkClear([at(-22, 1), at(-14, -4), at(-2, -6.4), at(10, -5), at(18, 0.4), at(26, 4), at(26, 6.4), at(16, 5.6), at(4, 6), at(-10, 4.4)]));
  const up = (flip ? -1 : 1) as 1 | -1;
  body.push(inkStroke(ink, [[...at(-22, 1.4), 0.1], [...at(-12, 2), 0.8], [...at(2, 2.4), 1], [...at(13, 2.6), 0.7], [...at(20, 4), 0.2]], 15, { tip: 0.7, belly: 0.16, side: -up as 1 | -1, dry: 0, dryEnd: 0.2, bristles: 7, bleed: 0.4, grain: 0.6, seed: b.seed() }));
  body.push(inkStroke(ink, [[...at(-12, -3), 0.1], [...at(-2, -4.6), 1], [...at(10, -3), 0.2]], 9, { tip: 0.34, belly: 0.02, side: up, dry: 0, dryEnd: 0.3, bleed: 0.6, grain: 0.4, seed: b.seed() }));
  for (let k = 0; k < 6; k++) { const x = b.range(-10, 8); body.push(inkLine(ink, [[...at(x, -1.4), 0.6], [...at(x - 1.6, -3.4), 0.9], [...at(x - 3.4, -4.2), 0.1]], 1.6, { ink: 0.4, seed: b.seed() })); }
  body.push(inkStroke(ink, [[...at(12, 2.2), 0.3], [...at(19, 3.8), 1], [...at(27, 5.4), 0.8], [...at(33, 6.8), 0.8], [...at(36.4, 7.4), 1], [...at(39, 6.8), 0.5], [...at(42.6, 5.6), 0.04]], 8.4, { tip: 0.95, belly: 0.5, side: flip ? -1 : 1, dry: 0, dryEnd: 0.05, bleed: 0.4, seed: b.seed() }));
  body.push(inkLine(ink, [[...at(-19, -1.4), 0.1], [...at(-12, -4.6), 0.8], [...at(0, -6.6), 1.1], [...at(10, -5), 0.8], [...at(17, 0), 0.2]], 2, { ink: 0.7, seed: b.seed() }));
  return { id: `goose-${seed}`, label: "A wild goose on the wing", page, plates: inkPlates(ink === "ink" ? [K] : { [ink]: ink, [K]: "ink" }), seed: 11 + seed, parts: [wingPart("far-wing", page, list, poses, flat(-1), { group: "bird" }), inkMarksPart("body", body, page, { group: "bird", body: WHITE }), wingPart("near-wing", page, list, poses, flat(1), { group: "bird" })], groups };
}
export interface InkSwallowOptions { seed?: number; facing?: "left" | "right"; view?: "above" | "level" | "below"; turn?: number; flight?: "beat" | "glide"; seconds?: number; /** Climbing (positive) or stooping, degrees. */ climb?: number; throat?: "cinnabar" | "rouge" | "ochre" }
const SWALLOW: WingForm = { bones: [4.6, 6.4, 6], primaries: 9, primary: 27, secondaries: 7, secondary: 8, tertials: 3, tertial: 9, width: 3.1, inner: 0.36 };
/** Quick beats, then wings held while it slides on. */
const SWALLOW_BEAT: readonly (WingPose & { id: string })[] = [
  { id: "up", lift: [50, 50, 48], sweep: [16, 20, -18], fan: 0.8, flex: 0.02, pitch: -6, quills: [66, 4] },
  { id: "flat", lift: [12, 10, 6], sweep: [14, 20, -20], fan: 0.8, flex: 0.06, pitch: -6, quills: [66, 3] },
  { id: "low", lift: [-30, -36, -40], sweep: [16, 24, -14], fan: 0.8, flex: 0.06, pitch: 0, quills: [64, 4] },
  { id: "shut", lift: [22, 8, -6], sweep: [-10, 22, -50], fan: 0.6, flex: 0.02, pitch: 14, quills: [46, 3] },
];
/** 燕 */
export function inkSwallow(o: InkSwallowOptions = {}): InkSubject {
  const seed = o.seed ?? 1, d = inkDice(seed + 3300), page = { width: 480, height: 480 }, flip = (o.facing ?? "right") === "left", v: View3 = { yaw: inkClamp(o.turn ?? -0.5, -1, 1) * 34, pitch: { above: 30, level: 10, below: -22 }[o.view ?? "above"], roll: o.climb ?? 12, x: 252, y: 250, scale: 4.9, flip }, P = viewer(v), T = "throat", seconds = o.seconds ?? 1.5, beat = o.flight !== "glide", list = beat ? SWALLOW_BEAT : [SWALLOW_BEAT[1]], poses = beat ? { kind: "cycle" as const, order: ["up", "flat", "low", "shut", "up", "flat", "low", "shut", "flat", "flat", "flat", "flat"], seconds } : undefined, at = (x: number, y: number, z = 0) => P([x, y, z]);
  const groups: Record<string, readonly InkMotion[]> = { bird: [{ kind: "turn", at: [v.x, v.y], degrees: 3, seconds: 3.1 }] }, flat = (side: 1 | -1) => (i: number) => plainWing(d.fork(i + (side > 0 ? 10 : 30)), wingOf({ ...SWALLOW, seed: seed * 5 + side + 2 }, list[i], [5, 2.4, 2 * side], side), P, K, { hand: side > 0 ? 1 : 0.8, arm: side > 0 ? 0.94 : 0.74, coverts: side > 0 ? 0.92 : 0.7, line: 4, thin: 1.6, k: 1 });
  const b = d.fork(1), body: InkMark[] = [], S = (flip ? -1 : 1) as 1 | -1;
  // the fork of the tail, long outer streamers
  for (const [z, k] of [[-1, 0.85], [1, 1]] as const) { body.push(inkLine(K, [[...at(-9, 0, z * 0.4), 1], [...at(-16, -0.2, z * 1.6), 0.8], [...at(-24, -0.6, z * 3.4), 0.42], [...at(-32, -0.6, z * 4.6), 0.05]], 8, { ink: 0.96 * k, seed: b.seed() }), inkLine(K, [[...at(-9, 0, z * 0.2), 1], [...at(-14, -0.2, z * 0.9), 0.9], [...at(-18.4, -0.4, z * 1.9), 0.08]], 8, { ink: 0.9 * k, seed: b.seed() })); }
  body.push(inkClear([at(-12, 0.4), at(-7, -2.6), at(0, -4.2), at(7, -3.6), at(11.4, -1), at(13.4, 1.4), at(11, 3.4), at(4, 3.6), at(-5, 2.4)]));
  body.push(inkStroke(K, [[...at(-8, -1.4), 0.1], [...at(-1, -2.6), 1], [...at(6, -2.2), 0.2]], 13, { tip: 0.2, belly: 0.01, side: S, dry: 0, dryEnd: 0.2, bleed: 0.8, seed: b.seed() }));
  body.push(inkStroke(K, [[...at(-13, 0.2), 0.14], [...at(-6, 1.2), 0.7], [...at(1, 1.9), 1], [...at(7, 1.9), 0.9], [...at(11, 1.9), 0.8], [...at(13.2, 1.2), 0.5], [...at(15.6, 0.7), 0.04]], 19, { tip: 1, belly: 0.8, side: -S as 1 | -1, head: 0.1, rim: 0.3, dry: 0, dryEnd: 0.05, bristles: 8, bleed: 0.5, grain: 0.4, seed: b.seed() }));
  body.push(inkBloomed(T, [at(12.8, 0.6), at(10.6, 0.4), at(7.4, -1.4), at(8.4, -2.8), at(11, -1.6)], { tone: 0.85, soft: 1, wander: 0.6, fringe: 0.5, rim: 0.2, rimWidth: 2, mottle: 0.2, cloud: 10, seed: b.seed() }));
  body.push(inkLine(K, [[...at(7.4, -3.2), 0.2], [...at(1, -4.3), 1], [...at(-6, -2.8), 0.7], [...at(-10, -0.8), 0.2]], 2.4, { ink: 0.75, seed: b.seed() }));
  const eye = at(11.6, 1.6); body.push(inkClear(inkRound(eye[0], eye[1], 2.3, 2, { seed: 3, n: 8 })), inkDot(K, eye[0], eye[1], 1.2, { tone: 1, seed: b.seed() }));
  return { id: `swallow-${seed}`, label: "A swallow on the wing", page, plates: inkPlates({ [T]: o.throat ?? "cinnabar", [K]: "ink" }), seed: 11 + seed, parts: [wingPart("far-wing", page, list, poses, flat(-1), { group: "bird" }), inkMarksPart("body", body, page, { group: "bird", body: WHITE }), wingPart("near-wing", page, list, poses, flat(1), { group: "bird" })], groups };
}

// ---- koi -----------------------------------------------------------------------------------------------------------------------
export interface InkKoiOptions {
  seed?: number;
  /** Red patches on white, black and red on white, a black carp, or all red. */
  pattern?: "red" | "both" | "ink" | "gold";
  /** Where it swims: degrees, 0 right, 90 down the page. */
  heading?: number;
  /** How it is bent as it is painted, −1 to 1. */
  bend?: number;
  /** Seconds for one stroke of the tail. */
  seconds?: number;
  pigment?: "cinnabar" | "vermilion" | "ochre" | "gamboge";
}
/** 鯉, from above: one body that bends from the head back, soft fins that lag behind it. */
export function inkKoi(o: InkKoiOptions = {}): InkSubject {
  const seed = o.seed ?? 1, d = inkDice(seed + 3500), page = { width: 760, height: 760 }, pattern = o.pattern ?? "both", R = "red", red = o.pigment ?? "cinnabar", head = o.heading ?? -38, bend = (o.bend ?? 0.75) * 92, seconds = o.seconds ?? 2.2, B = 430, W = 57;
  // the spine from the nose back, turning more toward the tail
  const spine: [number, number, number][] = [], steps = 46, long = B + 250;
  // it bends one way behind the head and the other way at the tail: the S a fish swims in
  { let [x, y] = inkStep(380, 380, head, 280), a = head + 180 + bend * 0.3; for (let i = 0; i <= steps; i++) { const u = ((i / steps) * long) / B; spine.push([x, y, a]); a += bend * (-0.2 + 2.1 * Math.exp(-(((u - 0.5) / 0.24) ** 2)) - 2.7 * Math.exp(-(((u - 1.16) / 0.26) ** 2))) * (long / B / steps); [x, y] = inkStep(x, y, a, long / steps); } }
  const mid = spine.reduce((p, q) => [p[0] + q[0] / spine.length, p[1] + q[1] / spine.length], [0, 0]), sx = 380 - mid[0], sy = 380 - mid[1];
  for (const p of spine) { p[0] += sx; p[1] += sy; }
  /** u along the body from the nose (0) to the root of the tail (1) and beyond, v across it. */
  const at = (u: number, v: number): [number, number] => { const k = inkClamp((u * B) / long, 0, 1) * steps, i = Math.min(steps - 1, Math.floor(k)), f = k - i, x = inkLerp(spine[i][0], spine[i + 1][0], f), y = inkLerp(spine[i][1], spine[i + 1][1], f), a = inkLerp(spine[i][2], spine[i + 1][2], f); return inkStep(x, y, a - 90, v); };
  const half = (u: number) => { const P: readonly (readonly [number, number])[] = [[0, 0.2], [0.04, 0.46], [0.1, 0.68], [0.18, 0.86], [0.3, 1], [0.44, 0.98], [0.6, 0.8], [0.76, 0.54], [0.9, 0.31], [1, 0.22], [1.1, 0.2]]; let i = 0; while (i < P.length - 2 && P[i + 1][0] < u) i++; return W * inkLerp(P[i][1], P[i + 1][1], inkEase(P[i][0], P[i + 1][0], u)); };
  const side = (k: 1 | -1, us: readonly number[], s = 1) => us.map((u) => at(u, k * half(u) * s)), US = [0, 0.04, 0.1, 0.18, 0.3, 0.44, 0.6, 0.76, 0.9, 1], nose = at(-0.012, 0), shape = [nose, ...side(1, US), at(1.05, 5), at(1.1, 0), at(1.05, -5), ...side(-1, [...US].reverse())], black = pattern === "ink", n = d.seed();
  const local = (x: number, y: number): [number, number] => { let best = 0, bd = Infinity; for (let i = 0; i <= steps; i++) { const q = (x - spine[i][0]) ** 2 + (y - spine[i][1]) ** 2; if (q < bd) { bd = q; best = i; } } const [X, Y, a] = spine[best], r = a * rad, dx = x - X, dy = y - Y; return [((best + (dx * Math.cos(r) + dy * Math.sin(r)) / (long / steps)) / steps) * (long / B), dx * Math.sin(r) - dy * Math.cos(r)]; };
  // tail: two soft lobes, rays spread from the root
  const rays = (plate: string, root: (t: number) => [number, number], tip: (t: number) => [number, number], m: number, w: number, tone: number, g: InkDice): InkMark[] => { const out: InkMark[] = [], edge = Array.from({ length: 9 }, (_, i) => tip(i / 8)), base = [root(1), root(0.5), root(0)], web = [...edge, ...base], c = root(0.5), far = Math.max(...edge.map(([x, y]) => Math.hypot(x - c[0], y - c[1]))), ns = g.seed(); out.push(inkBloomed(plate, web, { tone: (x, y) => { const q = Math.hypot(x - c[0], y - c[1]) / far; return inkClamp(tone * (0.62 - 0.4 * q + 0.5 * (inkNoise2(ns, Math.atan2(y - c[1], x - c[0]) * 9, q * 2) - 0.5))); }, soft: (x, y) => 1 + 7 * inkClamp(Math.hypot(x - c[0], y - c[1]) / far), wander: 3, wave: 16, fringe: 1.2, rim: 0.16, rimWidth: 4, mottle: 0.2, cloud: 24, seed: g.seed() })); for (let i = 0; i <= m; i++) { const t = (i + g.near(0, 0.25)) / m, a = root(0.5 + (t - 0.5) * 0.7), b = tip(inkClamp(t)), q = g.range(0.72, 0.98); out.push(inkLine(plate, [[...a, 0.5], [inkLerp(a[0], b[0], q * 0.5), inkLerp(a[1], b[1], q * 0.5), 1], [inkLerp(a[0], b[0], q), inkLerp(a[1], b[1], q), 0.05]], w, { ink: Math.min(1, tone * g.range(0.8, 1.3)), inkEnd: tone * 0.2, seed: g.seed() })); } return out; };
  const finTone = black ? 0.6 : 0.34, finPlate = black ? K : pattern === "gold" ? R : K, g = d.fork(3);
  // two lobes of silk, the near one longer and laid over the other
  const lobe = (k: 1 | -1, len: number, wide: number) => rays(finPlate, (t) => at(0.93 + 0.1 * (1 - t), k * (1 + 10 * t)), (t) => at(1.06 + len * (0.24 + 0.76 * Math.sin(Math.PI * (0.1 + 0.72 * Math.pow(t, 0.8)))) * (1 - 0.1 * t), k * (4 + wide * Math.pow(t, 0.9)) + 6 * Math.sin(t * 7 + k)), 9, 2.6, finTone, g);
  const tail = [...rays(finPlate, (t) => at(1.02, 9 - 18 * t), (t) => at(1.19 + 0.04 * Math.sin(t * 9), 30 - 60 * t), 7, 2.2, finTone * 0.8, g), ...lobe(bend > 0 ? -1 : 1, 0.34 * d.range(0.92, 1.1), 58), ...lobe(bend > 0 ? 1 : -1, 0.46 * d.range(0.94, 1.06), 68)];
  const fin = (k: 1 | -1, u: number, len: number, back: number, wide: number) => rays(finPlate, (t) => at(u + 0.05 * t, k * half(u) * 0.92), (t) => { const A = back + wide * t, c = at(u + 0.02, k * half(u) * 0.9), e = at(u + 0.16, k * half(u) * 0.9), a0 = Math.atan2(e[1] - c[1], e[0] - c[0]) / rad, L = len * (0.66 + 0.34 * Math.sin(Math.PI * (0.22 + 0.6 * (1 - t)))); return inkStep(c[0], c[1], a0 - k * (90 - A), L); }, 6, 2.6, finTone * 0.95, g);
  const lean = bend > 0 ? 1 : -1, dorsal: InkMark[] = [...rays(finPlate, (t) => at(0.35 + 0.29 * t, 0), (t) => at(0.4 + 0.33 * t, lean * (5 + 17 * Math.sin(Math.PI * Math.min(1, 0.3 + t * 0.62)))), 9, 1.8, black ? 1 : 0.5, g), inkLine(finPlate, [[...at(0.34, 0), 0.3], [...at(0.4, lean), 1], [...at(0.52, lean), 0.8], [...at(0.64, 0), 0.3], [...at(0.71, 0), 0.05]], 3.2, { ink: black ? 1 : 0.6, seed: g.seed() }), inkLine(finPlate, [[...at(0.345, 0), 0.8], [...at(0.385, lean * 10), 1], [...at(0.42, lean * 20), 0.1]], 2.4, { ink: black ? 1 : 0.6, seed: g.seed() })];
  // the body: paper, a grey turn along both flanks, the coat
  const body: InkMark[] = [inkClear(shape)];
  /** A coat of patches: each [along, across, half length, half width], their coasts wandering, one wash from head to tail. */
  const coat = (plate: string, at: readonly (readonly [number, number, number, number])[], tone: number, gg: InkDice, wild = 1) => { const ns = gg.seed(); body.push(inkBloomed(plate, shape, { tone: (x, y) => { const [u, v] = local(x, y), q = v / half(inkClamp(u)); let f = -1; for (const [pu, pv, ru, rv] of at) f = Math.max(f, 1 - Math.hypot((u - pu) / ru, (q - pv) / rv)); f += wild * (0.62 * (inkNoise2(ns, u * 11, q * 2.2) - 0.5) + 0.3 * (inkNoise2(ns + 9, u * 34, q * 6) - 0.5)); const in_ = inkEase(0.14, 0.2, f); return inkClamp(in_ * tone * (0.78 + 0.5 * (inkNoise2(ns + 5, x / 30, y / 30) - 0.5) + 0.2 * inkEase(0.5, 0.18, f)) * (1 - 0.3 * q * q)); }, soft: 1, wander: 0.4, fringe: 0.6, rim: 0.1, rimWidth: 3, mottle: 0.2, cloud: 22, seed: gg.seed() })); };
  body.push(inkBloomed(K, shape, { tone: (x, y) => { const [u, v] = local(x, y), q = Math.abs(v) / half(inkClamp(u)), lit = v * bend > 0 ? 1.15 : 0.85; return black ? inkClamp((0.94 - 0.62 * q * q) * (0.86 + 0.4 * (inkNoise2(n, x / 30, y / 30) - 0.5))) : inkClamp((0.3 * Math.pow(q, 2.6) * lit + 0.05 * inkNoise2(n, x / 40, y / 40)) * inkEase(1.06, 0.9, u)); }, soft: 1.2, wander: 0.6, fringe: 0.8, rim: 0.14, rimWidth: 4, mottle: 0.2, cloud: 30, seed: d.seed() }));
  const p = d.fork(5);
  const at2 = (u: number, v: number, ru: number, rv: number) => [u + p.near(0, 0.02), v + p.near(0, 0.12), ru * p.range(0.86, 1.16), rv * p.range(0.86, 1.14)] as const;
  if (pattern === "gold") coat(R, [[0.5, 0, 2, 6]], 0.8, p);
  if (pattern === "red" || pattern === "both") coat(R, [at2(0.1, 0, 0.1, 0.8), at2(0.3, -0.3, 0.13, 1.1), at2(0.42, 0.35, 0.12, 0.9), at2(0.66, p.chance(0.5) ? 0.4 : -0.4, 0.12, 1.2), ...(p.chance(0.7) ? [at2(0.87, 0, 0.07, 1.3)] : [])], 1.1, p);
  if (pattern === "both") coat(K, [at2(0.25, 0.6, 0.08, 0.36), at2(0.31, 0.34, 0.06, 0.24), at2(0.54, -0.66, 0.11, 0.42), at2(0.5, -0.3, 0.05, 0.24), at2(0.78, 0.4, 0.08, 0.6), ...(p.chance(0.5) ? [at2(0.07, -0.5, 0.05, 0.22)] : [])], 1.1, p, 1.5);
  // scales: rows of half rounds along the back, found and lost toward the flanks
  for (let u = 0.25, row = 0; u < 0.93; u += 0.036, row++) for (let v = -0.72 + (row % 2) * 0.12; v <= 0.74; v += 0.24) { if (d.chance(0.3 + 0.4 * Math.abs(v))) continue; const w = half(u), r = 0.12; body.push(inkLine(black ? K : K, [[...at(u - 0.01, (v - r) * w), 0.2], [...at(u + 0.018, (v - r * 0.5) * w), 0.9], [...at(u + 0.026, v * w), 1], [...at(u + 0.018, (v + r * 0.5) * w), 0.8], [...at(u - 0.01, (v + r) * w), 0.1]], 1.7, { ink: black ? 0.95 : 0.3, seed: d.seed() })); }
  if (black) for (let u = 0.25, row = 0; u < 0.9; u += 0.036, row++) for (let v = -0.6 + (row % 2) * 0.12; v <= 0.62; v += 0.24) if (d.chance(0.5)) body.push(inkWipe([K], [[...at(u + 0.03, (v - 0.08) * half(u)), 0.3], [...at(u + 0.038, v * half(u)), 1], [...at(u + 0.03, (v + 0.08) * half(u)), 0.3]], 3, { ink: 0.45, seed: d.seed() }));
  // outline in two broken lines, gills, nostrils, whiskers, eyes that stand out at the sides
  for (const k of [1, -1] as const) { body.push(inkLine(K, side(k, [0.12, 0.18, 0.3, 0.44]).map(([x, y], i) => [x, y, [0.3, 1, 1.1, 0.2][i]] as const), 2.8, { ink: 0.85, tremor: 0.8, seed: d.seed() }), inkLine(K, side(k, [0.5, 0.6, 0.76, 0.9, 1]).map(([x, y], i) => [x, y, [0.2, 0.8, 1, 0.8, 0.3][i]] as const), 2.6, { ink: 0.75, tremor: 0.8, seed: d.seed() }), inkLine(K, [...side(k, [0.1, 0.04, 0.005])].map(([x, y], i) => [x, y, [0.6, 1.1, 0.8][i]] as const), 2.6, { ink: 0.85, seed: d.seed() })); body.push(inkLine(K, [[...at(0.12, k * half(0.12) * 0.72), 0.2], [...at(0.18, k * half(0.18) * 0.64), 1], [...at(0.205, k * half(0.2) * 0.3), 0.3]], 2.4, { ink: black ? 0.98 : 0.6, seed: d.seed() })); const e = at(0.088, k * half(0.088) * 0.86); body.push(inkClear(inkRound(e[0], e[1], 5, 4, { seed: 4 + k, n: 9 })), inkDot(K, e[0], e[1], 4.2, { tone: 1, seed: d.seed() })); const w0 = at(0.01, k * 13), w1 = at(-0.02, k * 30), w2 = at(0.02, k * 44); body.push(inkLine(K, [[...w0, 1], [...w1, 0.8], [...w2, 0.1]], 2.2, { ink: 0.8, seed: d.seed() }), inkDot(K, ...at(0.035, k * 8), 1.4, { tone: 0.8, seed: d.seed() })); }
  body.push(inkLine(K, [[...at(0.01, 13), 0.4], [...nose, 1], [...at(0.01, -13), 0.4]], 2.6, { ink: 0.85, seed: d.seed() }));
  const from = at(0.06, 0), to = at(1.28, 0), groups: Record<string, readonly InkMotion[]> = { fish: [{ kind: "sway", from, to, amount: 66, seconds, lag: 0.42, power: 1.6, gust: 0 }] }, flap = (k: 1 | -1, u: number): readonly InkMotion[] => [{ kind: "turn", at: at(u, k * half(u) * 0.9), degrees: 9 * k, seconds: seconds * 1.3, phase: k }];
  return { id: `koi-${pattern}-${seed}`, label: "A koi seen from above", page, plates: inkPlates({ [R]: red, [K]: "ink" }), seed: 11 + seed, parts: [...([1, -1] as const).flatMap((k) => [inkMarksPart(k > 0 ? "fin-left" : "fin-right", fin(k, 0.24, 112, 34, 58), page, { group: "fish", motion: flap(k, 0.24) }), inkMarksPart(k > 0 ? "belly-fin-left" : "belly-fin-right", fin(k, 0.54, 70, 26, 50), page, { group: "fish", motion: flap(k, 0.54) })]), inkMarksPart("body", body, page, { group: "fish", body: WHITE }), inkMarksPart("tail", tail, page, { group: "fish", motion: [{ kind: "sway", from: at(1, 0), to: at(1.34, 0), amount: 16, seconds: seconds * 0.97, phase: -1.6 }] }), inkMarksPart("back-fin", dorsal, page, { group: "fish" })], groups };
}

// ---- butterfly -----------------------------------------------------------------------------------------------------------------
export interface InkButterflyOptions {
  seed?: number;
  /** A black swallowtail, or a wash of colour edged with ink. */
  pattern?: "swallowtail" | "plain";
  pigment?: "gamboge" | "peach" | "indigo" | "azurite" | "cinnabar" | "ochre";
  /** Seconds for one beat, and where it is heading: degrees, 0 right, 90 down. */
  seconds?: number; heading?: number;
}
/** How far the wings are lifted, degrees from flat. */
const FLAP = [["open", 8], ["raised", 46], ["shut", 78], ["pressed", 24]] as const;
/** 蝶 */
export function inkButterfly(o: InkButterflyOptions = {}): InkSubject {
  const seed = o.seed ?? 1, d = inkDice(seed + 3700), page = { width: 400, height: 400 }, tailed = (o.pattern ?? "swallowtail") === "swallowtail", C = "wash", seconds = o.seconds ?? 0.6, v: View3 = { yaw: 0, pitch: 52, roll: 0, x: 200, y: 214, scale: 2.9, flip: false }, head = (o.heading ?? -50) * rad, look = viewer(v);
  // x runs to the head, z out along a wing, y is up off the back
  const wing = (side: 1 | -1, lift: number) => (x: number, z: number): [number, number] => { const a = lift * rad, p: V3 = [x, z * Math.sin(a), z * Math.cos(a) * side], c = Math.cos(head), s = Math.sin(head); return look([p[0] * c - p[2] * s, p[1], p[0] * s + p[2] * c]); };
  const j = d.near(0, 2), fore: readonly (readonly [number, number])[] = [[6, 1.4], [13, 6], [23, 17], [32, 30 + j], [37, 41], [36.5, 44], [33, 43], [27, 38], [19, 35], [11, 31], [3, 25], [-1, 12], [0, 2]], hind: readonly (readonly [number, number])[] = tailed ? [[2, 1.6], [5, 12], [4, 23], [-2, 29], [-9, 30], [-15, 27], [-21, 27], [-25, 23], [-33, 24], [-40, 23], [-42, 20.6], [-36, 18.6], [-28, 17], [-27, 12], [-18, 5], [-4, 1]] : [[2, 1.6], [5, 13], [3, 25], [-5, 31], [-15, 31], [-23, 25], [-26, 15], [-20, 6], [-6, 1]];
  // wet ink runs in from the rim, the middle keeps its colour; veins in one line each; blank dabs along the margin, smaller to the tail
  const paint = (side: 1 | -1, lift: number, g: InkDice): InkMark[] => {
    const W = wing(side, lift), out: InkMark[] = [], map = (l: readonly (readonly [number, number])[]) => l.map(([x, z]) => W(x, z)), dim = side > 0 ? 1 : 0.86;
    for (const [shape, isFore] of [[hind, false], [fore, true]] as const) {
      const pts = map(shape), root = W(2, 1), ns = g.seed(), mid = isFore ? W(15, 18) : W(-6, 14), reach = Math.max(...pts.map(([x, y]) => Math.hypot(x - mid[0], y - mid[1]))), edge = (x: number, y: number) => { let m = Infinity; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length], dx = b[0] - a[0], dy = b[1] - a[1], t = inkClamp(((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy || 1)); m = Math.min(m, Math.hypot(x - a[0] - dx * t, y - a[1] - dy * t)); } return m; }, far = Math.hypot(root[0] - mid[0], root[1] - mid[1]) || 1, out_ = (x: number, y: number) => inkClamp(Math.hypot(x - root[0], y - root[1]) / (far * 2));
      out.push(inkClear(pts));
      out.push(inkBloomed(C, pts, { tone: (x, y) => { const q = out_(x, y); return inkClamp((isFore && tailed ? 0.5 : 0.95) * (0.95 - 0.3 * q) * (0.66 + 0.7 * inkNoise2(ns, x / 12, y / 12))); }, soft: 0.8, wander: 0.8, fringe: 0.6, rim: 0.2, rimWidth: 3, mottle: 0.2, cloud: 16, seed: g.seed() }));
      out.push(inkBloomed(K, pts, { tone: (x, y) => { const q = out_(x, y), e = edge(x, y) / (reach * 0.5), n = inkNoise2(ns + 1, x / 9, y / 9) - 0.5; return inkClamp(dim * (tailed ? (isFore ? 0.4 : 0.1) + 0.8 * inkEase(0.62, 0.16, e + 0.22 * n) * inkEase(0.1, 0.5, q) + 0.5 * inkEase(0.36, 0.06, q + 0.1 * n) : 0.04 + 0.9 * inkEase(0.36, 0.08, e + 0.16 * n) * inkEase(0.42, 0.8, q) + 0.35 * inkEase(0.26, 0.06, q))); }, soft: 0.8, wander: 0.8, fringe: 0.7, tooth: 1.8, rim: 0.2, rimWidth: 3, mottle: 0.2, cloud: 16, seed: g.seed() }));
      const ends = isFore ? [[33, 31], [36, 41], [28, 38], [19, 34], [11, 30], [4, 24]] : [[4, 23], [-4, 29], [-13, 28], [-22, 25], [-27, 14]];
      for (const [i, [x, z]] of ends.entries()) { const b = W(x * 0.3 + 3, z * 0.3), e = W(x * 0.96, z * 0.96), m = W(x * 0.66 + 1, z * 0.64); out.push(inkLine(K, [[...root, 0.9], [...b, 1], [...m, 0.8], [...e, 0.4]], 1.7, { ink: 0.95 * dim, seed: g.seed() })); if (i < 1 || i >= ends.length - 1) continue; const a = ends[i], n = ends[i + 1], px = (a[0] + n[0]) / 2, pz = (a[1] + n[1]) / 2, c0 = W(px * 0.94, pz * 0.94), c1 = W(px * (isFore ? 0.87 - 0.03 * i : 0.84), pz * (isFore ? 0.87 - 0.03 * i : 0.84)), w = Math.hypot(W(a[0], a[1])[0] - W(n[0], n[1])[0], W(a[0], a[1])[1] - W(n[0], n[1])[1]); if (w > 6 && tailed) out.push(inkWipe([K, ...(isFore ? [C] : [])], [[...c0, 1], [inkLerp(c0[0], c1[0], 0.5), inkLerp(c0[1], c1[1], 0.5), 0.7], [...c1, 0.1]], Math.min(isFore ? 4.4 : 7, w * 0.4) * g.range(0.7, 1.1), { ink: (isFore ? 0.8 : 0.9) * g.range(0.75, 1), seed: g.seed() })); }
      if (!isFore && tailed) { const c = W(-20, 13); out.push(inkWipe([K, C], [[c[0] - 2, c[1], 1], [c[0] + 2, c[1] + 1, 1]], 6, { ink: 1, seed: g.seed() })); }
      out.push(inkLine(K, (isFore ? pts.slice(0, 6) : pts.slice(1, 5)).map(([x, y], i) => [x, y, [0.5, 1.1, 1.3, 1, 0.7, 0.3][i]] as const), 2.2, { ink: 0.98 * dim, seed: g.seed() }));
    }
    return out;
  };
  const list = FLAP.map(([id]) => ({ id })), poses = { kind: "cycle" as const, order: ["open", "pressed", "raised", "shut", "raised", "open"], seconds }, marks = (side: 1 | -1) => (i: number) => paint(side, FLAP[i][1], d.fork(side > 0 ? 11 : 31)), B = wing(1, 90), body: InkMark[] = [], g = d.fork(2);
  body.push(inkStroke(K, [[...B(-19, 0), 0.1], [...B(-12, 0.4), 0.7], [...B(-4, 0.8), 0.8], [...B(3, 1.4), 1], [...B(9, 1.2), 0.9], [...B(12.6, 1), 0.6], [...B(14.6, 0.8), 0.3]], 11, { tip: 1, belly: 0.86, side: 1, head: 0.1, rim: 0.3, dry: 0, dryEnd: 0.05, bristles: 5, bleed: 0.5, grain: 0.3, seed: g.seed() }));
  for (const k of [1, -1]) { const W = wing(k as 1 | -1, 22); body.push(inkLine(K, [[...W(13.6, 0.8), 0.7], [...W(22, 5), 0.5], [...W(31, 11), 0.5], [...W(33, 13), 1]], 1.7, { ink: 0.9, seed: g.seed() }), inkDot(K, ...W(33.2, 13), 1.7, { tone: 1, seed: g.seed() })); }
  return { id: `butterfly-${seed}`, label: "A butterfly", page, plates: inkPlates({ [C]: o.pigment ?? (tailed ? "azurite" : "gamboge"), [K]: "ink" }), seed: 11 + seed, parts: [wingPart("far-wings", page, list, poses, marks(-1), { group: "bird", body: WHITE }), inkMarksPart("body", body, page, { group: "bird" }), wingPart("near-wings", page, list, poses, marks(1), { group: "bird", body: WHITE })], groups: { bird: [{ kind: "drift", by: [0, -7], back: seconds / 2 }] } };
}
