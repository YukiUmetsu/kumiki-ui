/**
 * RIG1 painted look: hand-painted cut-outs bent by a rig, as textured meshes for a film stage (`paint-stage.ts`).
 *
 * The painting is never redrawn. Each layer is one painting with a place in the rig's rest pose; a bind says how bones move
 * it: rigid (a head, a hand), limb (one sleeve bent round a joint without creasing) or skin (a torso, loose hair, a hem).
 * Faces are painted too: patches cut from paintings of the same head replace the eyes or the mouth, and two mouths are
 * joined by moving marks on their lips. Nothing here knows who the character is. Pure: no DOM, no state.
 */
import type { AffineMatrix } from "../motion/types";
import { evaluateRig } from "./rig-evaluate";
import type { RigFrame } from "./rig-evaluate";
import { FACE_LOOKS, browUnits, expressWarp, faceRelief } from "./rig-face";
import type { FacePoints, FaceUnits } from "./rig-face";
import type { HandView } from "./rig-comfort";
import type { RigBone, RigSpec } from "./rig-spec";

export type PaintedPoint = readonly [number, number];
export interface PaintedImage { src: string; width: number; height: number }
/** Where a painting lies: rig units in the rest pose, or in its bone's space when the layer says `space: "bone"`. */
export interface PaintedPlace { image: string; x: number; y: number; width: number; height: number; /** Degrees, about the bone's joint (bone space only). */ rotate?: number; /** A hand with a piece of its forearm (bone space only): how far that piece is turned from the hand in the painting, degrees. It stays in line with the arm. */ wrist?: number }
export type PaintedBind =
  | { kind: "rigid"; bone: string }
  /** One painting over two bones: it bends smoothly over `soft` rig units on each side of the joint and keeps its width. */
  | { kind: "limb"; upper: string; lower: string; soft: number; /** Where the painted limb has its two edges: along the bones, and off them on each side, rig units. Cloth that hangs in its folds has no straight edges: with them the limb is drawn in a line of its own (`outlined`) as it leaves the pose of the painting. */ sides?: readonly (readonly [number, number, number])[]; /** Round its first joint it hands over to what it grows from (a shoulder to the chest), over `soft` rig units on each side. With `hole`, a line of points in the rest pose (the seam of a sleeve, from the top of the shoulder to the armpit), it stays sewn to that line, and is all limb `soft` away from it: each point goes round the joint as far as it is the limb's, so a raised arm keeps its shoulder. */ root?: { bone: string; soft: number; hole?: readonly PaintedPoint[] }; slack?: PaintedSlack }
  /** Follows `bone`; each pull hands over to another bone from `from` (none) to `to` (all), inside a round patch if given. */
  | { kind: "skin"; bone: string; pulls: readonly { bone: string; from: PaintedPoint; to: PaintedPoint; within?: { at: PaintedPoint; radius: number } }[]; slack?: PaintedSlack };
/** Cloth that hangs from an arm on one side, as a wide sleeve does. While the joint of `lower` bends to that side, what is farther than `past` from the bone line is drawn in, and so is what hangs beyond `cuff` along the lower bone: without it the cloth would stand up at the elbow. `side`: 1 when the cloth is on the left of somebody who walks along the bone in the picture (y down), else -1. */
export interface PaintedSlack { upper: string; lower: string; side: 1 | -1; past: number; cuff?: number }
export interface PaintedLayer extends PaintedPlace {
  id: string; z: number; bind: PaintedBind; space?: "bone";
  /** Cells across and down. */ grid?: readonly [number, number];
  /** Other drawings for the same place (hands, feet). `front` is drawn over what the hand holds; `over` is added to the order: a fist that points at the viewer is in front of its own cuff; `rest` lies in the rest pose, as a layer does, and bends like it. `shows`: the side of the hand that is seen; with `as` it is another view of that drawing. */
  variants?: Readonly<Record<string, PaintedPlace & { front?: PaintedPlace; over?: number; rest?: boolean; shows?: HandView; as?: string }>>;
  /** Multiplies the paint: a limb on the far side. */ tint?: readonly [number, number, number];
  /** It turns in depth: with the face (a head, its back hair) or with the trunk (a chest, a collar). */ turns?: boolean | "trunk";
  /** Lettering: it is turned back when the whole figure is mirrored. */ keepReading?: boolean;
}
export interface PaintedPatch extends PaintedPlace { /** Left corner, right corner, inner edge of the upper lip, inner edge of the lower lip, then more: the same list for every mouth. */ marks?: readonly PaintedPoint[]; /** Where the marks go: one painted mouth gives several. */ shape?: readonly PaintedPoint[] }
export interface PaintedLook { patches?: readonly string[]; mouth?: string; /** How far that mouth is open. */ strength?: number; shut?: boolean; units?: FaceUnits }
export interface PaintedFace {
  /** Layer that the face is painted on. */ layer: string;
  /** Round of the head, for turning it a little in depth. */ round: { at: PaintedPoint; radius: PaintedPoint };
  eyes: readonly { at: PaintedPoint; radius: PaintedPoint }[];
  brows?: readonly { at: PaintedPoint; radius: PaintedPoint }[];
  /** The chin goes down by `drop` when the mouth is as open as it gets. */ jaw?: { at: PaintedPoint; radius: PaintedPoint; drop: number };
  patches: Readonly<Record<string, PaintedPatch>>;
  /** 468 points of the face, measured on the painting: action units and depth move it, and each look of `rig-face` is there without a painting of its own. */
  mesh?: FacePoints; /** How much this face shows (1). */ shows?: number;
  /** Expressions: patches over the neutral painting, the mouth to rest in, and action units. `shut`: the eyes are closed, so they never blink. */
  looks: Readonly<Record<string, PaintedLook>>;
  /** The look between lines and acts, when it is not the one of the painting (a painting that laughs). */ idle?: string;
  /** Looks that stand in for looks that were not painted. */
  lookFor?: Readonly<Record<string, string>>;
  /** Half closed and closed. */ lids: readonly string[];
  /** Mouth name → patch. `rest` must exist. */
  mouths: Readonly<Record<string, string>>;
  /** Stand-ins for mouths that are not painted. */ mouthFor?: Readonly<Record<string, string>>;
}
export interface PaintedArt {
  id: string; images: Readonly<Record<string, PaintedImage>>; layers: readonly PaintedLayer[]; face?: PaintedFace;
  /** Round of the trunk, for turning it a little in depth. */ trunk?: PaintedFace["round"];
  /** Turn of each joint in the painting, when it is not the rig's rest pose (an A-pose, a stride). */ pose?: Readonly<Record<string, number>>;
  /** Places to hold things by, in a bone's space, or between two such places (a tray in both hands). `layer` is the hand that they lie in. */
  sockets?: Readonly<Record<string, ({ bone: string; at: PaintedPoint; angle?: number } | { between: readonly [string, string] }) & { layer?: string }>>;
}
export interface PaintedMouth { from: string; to: string; mix: number; fromStrength?: number; toStrength?: number; /** 0 leaves the look's own mouth, 1 is all speech. */ weight?: number }
export interface PaintedFaceState {
  look?: string; /** The look before, while it changes. */ from?: string; /** 0 is all `from`. */ mix?: number;
  /** 0 open, 1 closed. */ blink?: number; /** −1..1 of the eye. */ gaze?: PaintedPoint;
  /** −1 down, 1 up. */ brow?: number; /** Action units over the look (a face mesh only). */ units?: FaceUnits; /** Turn of the head in depth, degrees: yaw (+ to the right of the painting) and pitch (+ down). */ turn?: PaintedPoint; mouth?: PaintedMouth;
}
export interface PaintedState { face?: PaintedFaceState; /** Turn of the trunk in depth, degrees, + to the right of the painting. */ trunk?: number; /** Layer → variant. */ hands?: Readonly<Record<string, string>>; /** Added to the z of a layer: an arm that comes in front of the head. */ lift?: Readonly<Record<string, number>>; /** Layers that are not drawn. */ hidden?: readonly string[]; opacity?: number; tint?: readonly [number, number, number] }

/** A mesh in the scene; `z` sorts it inside the figure. */
export interface PaintedMesh { id: string; image: string; positions: Float32Array; uvs: Float32Array; indices: Uint16Array; opacity: number; tint?: readonly [number, number, number]; z: number; /** A limb: where each point lies on it, 0 at its first joint, 1 at its middle joint, 2 at its end. */ along?: Float32Array }

const mul = (p: AffineMatrix, q: AffineMatrix): AffineMatrix => ({ a: p.a * q.a + p.c * q.b, b: p.b * q.a + p.d * q.b, c: p.a * q.c + p.c * q.d, d: p.b * q.c + p.d * q.d, e: p.a * q.e + p.c * q.f + p.e, f: p.b * q.e + p.d * q.f + p.f });
const inv = (m: AffineMatrix): AffineMatrix => { const k = m.a * m.d - m.b * m.c || 1e-9; return { a: m.d / k, b: -m.b / k, c: -m.c / k, d: m.a / k, e: (m.c * m.f - m.d * m.e) / k, f: (m.b * m.e - m.a * m.f) / k }; };
const put = (m: AffineMatrix, x: number, y: number): [number, number] => [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f];
const smooth = (t: number) => { const u = Math.min(1, Math.max(0, t)); return u * u * (3 - 2 * u); };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** An angle between half a turn back and half a turn on. */
const wrapped = (a: number) => a - 2 * Math.PI * Math.round(a / (2 * Math.PI));

const rests = new WeakMap<RigSpec["bones"], WeakMap<object, RigFrame>>(), UNTURNED = {};
/** The pose that the paintings were cut in. */
export function paintedRest(art: Pick<PaintedArt, "pose">, spec: RigSpec): RigFrame {
  const key = art.pose ?? UNTURNED; let m = rests.get(spec.bones); if (!m) rests.set(spec.bones, (m = new WeakMap()));
  let r = m.get(key);
  if (!r) m.set(key, (r = evaluateRig({ ...spec, drivers: [], root: [], tracks: Object.fromEntries(Object.entries(art.pose ?? {}).map(([j, rotate]) => [j, [{ frame: 0, rotate }]])) }, 0)));
  return r;
}

type Warp = (x: number, y: number) => [number, number];
const same: Warp = (x, y) => [x, y];
interface Cell { positions: Float32Array; uvs: Float32Array; indices: Uint16Array }
/** A grid over a place; `at` puts each point (place space) in the scene. */
function gridOf(p: PaintedPlace, [nx, ny]: readonly [number, number], at: Warp): Cell {
  const vx = nx + 1, positions = new Float32Array(vx * (ny + 1) * 2), uvs = new Float32Array(vx * (ny + 1) * 2), indices = new Uint16Array(nx * ny * 6);
  for (let j = 0, k = 0; j <= ny; j++) for (let i = 0; i <= nx; i++, k += 2) { const u = i / nx, v = j / ny, [x, y] = at(p.x + u * p.width, p.y + v * p.height); positions[k] = x; positions[k + 1] = y; uvs[k] = u; uvs[k + 1] = v; }
  for (let j = 0, k = 0; j < ny; j++) for (let i = 0; i < nx; i++, k += 6) { const a = j * vx + i; indices.set([a, a + 1, a + vx, a + 1, a + vx + 1, a + vx], k); }
  return { positions, uvs, indices };
}

/** Cells of a place that bends over `soft` on each side of a joint: small enough to draw the bend round. A coarse cell cuts the corner, and the outline with it. */
const gridFor = ([nx, ny]: readonly [number, number], p: PaintedPlace, soft: number): readonly [number, number] => [Math.max(nx, Math.ceil((p.width * 6) / soft)), Math.max(ny, Math.ceil((p.height * 6) / soft))];

/** Where a point of the rest pose lies along a limb. */
function alongLimb(bind: Extract<PaintedBind, { kind: "limb" }>, rest: RigFrame): (x: number, y: number) => number {
  const u = rest.bones.get(bind.upper)!.world, l = rest.bones.get(bind.lower)!, [tx, ty] = put(l.world, 0, l.length || 1), on = (x: number, y: number, ax: number, ay: number, bx: number, by: number) => ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2 || 1);
  return (x, y) => { const s = on(x, y, u.e, u.f, l.world.e, l.world.f); return s < 1 ? s : 1 + Math.max(0, on(x, y, l.world.e, l.world.f, tx, ty)); };
}
/** Where slack cloth goes in the rest pose, before the bones move it. Nothing while the arm is as it was painted. */
function slackWarp(s: PaintedSlack, rest: RigFrame, now: RigFrame): { at: Warp; in: number } | undefined {
  const bend = (f: RigFrame) => { const u = f.bones.get(s.upper)!.world, l = f.bones.get(s.lower)!.world; return Math.atan2(u.c * l.d - u.d * l.c, u.c * l.c + u.d * l.d) * (u.a * u.d - u.b * u.c < 0 ? -1 : 1); };
  const turn = ((bend(now) - bend(rest) + 3 * Math.PI) % (2 * Math.PI)) - Math.PI, side = s.side, k = 0.9 * smooth((turn * side - 0.1) / 0.8);
  if (k <= 0) return undefined;
  const u = rest.bones.get(s.upper)!, l = rest.bones.get(s.lower)!, [sx, sy] = put(u.world, 0, 0), [ex, ey] = put(l.world, 0, 0), [tx, ty] = put(l.world, 0, l.length || 1);
  const L1 = Math.hypot(ex - sx, ey - sy) || 1, L2 = Math.hypot(tx - ex, ty - ey) || 1, d1 = [(ex - sx) / L1, (ey - sy) / L1], d2 = [(tx - ex) / L2, (ty - ey) / L2];
  return { in: k, at: (x, y) => {
    const s1 = (x - sx) * d1[0] + (y - sy) * d1[1], s2 = (x - ex) * d2[0] + (y - ey) * d2[1], q = smooth((s2 / L1 + 0.2) / 0.4), nx = lerp(-d1[1], -d2[1], q), ny = lerp(d1[0], d2[0], q);
    const n = lerp(-(x - sx) * d1[1] + (y - sy) * d1[0], -(x - ex) * d2[1] + (y - ey) * d2[0], q), over = Math.max(0, n * side - s.past) * side * k * smooth(s1 / L1), up = s.cuff === undefined ? 0 : Math.max(0, s2 - s.cuff) * k * smooth((n * side) / s.past);
    return [x - nx * over - d2[0] * up, y - ny * over - d2[1] * up];
  } };
}
/** How a bind moves a point of the rest pose. */
function binder(bind: PaintedBind, rest: RigFrame, now: RigFrame): Warp {
  const slack = bind.kind !== "rigid" && bind.slack ? slackWarp(bind.slack, rest, now) : undefined, move = bound(bind, rest, now, 1 - (slack?.in ?? 0));
  return slack ? (x, y) => move(...slack.at(x, y)) : move;
}
/** Keeps a limb sewn to a line on what it grows from. `turn` of a point is cut short near the line, and its distance from the joint goes over to what it is on the body. */
function sewing(hole: readonly PaintedPoint[], soft: number, base: AffineMatrix, limb: AffineMatrix, joint: PaintedPoint, along: readonly number[]): (x: number, y: number, X: number, Y: number) => [number, number] {
  const [bx, by] = put(base, ...joint), [lx, ly] = put(limb, ...joint), dir = (m: AffineMatrix) => Math.atan2(m.b * along[0] + m.d * along[1], m.a * along[0] + m.c * along[1]), full = ((dir(limb) - dir(base) + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;
  const gap = (x: number, y: number) => { let best = Infinity; for (let i = 1; i < hole.length; i++) { const [ax, ay] = hole[i - 1], dx = hole[i][0] - ax, dy = hole[i][1] - ay, t = Math.min(1, Math.max(0, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1))); best = Math.min(best, Math.hypot(x - ax - dx * t, y - ay - dy * t)); } return best; };
  return (x, y, X, Y) => {
    const g = smooth(gap(x, y) / soft); if (g >= 1) return [X, Y];
    const [rx, ry] = put(base, x, y), a = Math.atan2(ry - by, rx - bx); let d = Math.atan2(Y - ly, X - lx) - a; d -= 2 * Math.PI * Math.round((d - full) / (2 * Math.PI));
    const r = lerp(Math.hypot(rx - bx, ry - by), Math.hypot(X - lx, Y - ly), g), to = a + d * g;
    return [lerp(bx, lx, g) + Math.cos(to) * r, lerp(by, ly, g) + Math.sin(to) * r];
  };
}
/** The line round a limb that has left the pose of its painting. Cloth on an arm that is up or bent does not lie in the folds of an arm that hangs: those make a line like a hose. Here both edges are straight from the armhole to the elbow and from the elbow to the hand, the limb is as wide at its root as the armhole, and the elbow has a corner on its outside and a crease on its inside. The hand end stays as it was painted. */
function outlined(bind: Extract<PaintedBind, { kind: "limb" }>, rest: RigFrame, now: RigFrame): { in: number; at: (s: number, n: number) => PaintedPoint } | undefined {
  const sides = bind.sides; if (!sides) return undefined;
  const move = (bone: string) => mul(now.bones.get(bone)!.world, inv(rest.bones.get(bone)!.world)), u = rest.bones.get(bind.upper)!, l = rest.bones.get(bind.lower)!;
  const S = put(u.world, 0, 0), E0 = put(l.world, 0, 0), T = put(l.world, 0, l.length || 1), L1 = Math.hypot(E0[0] - S[0], E0[1] - S[1]) || 1, L2 = Math.hypot(T[0] - E0[0], T[1] - E0[1]) || 1, d1 = [(E0[0] - S[0]) / L1, (E0[1] - S[1]) / L1], d2 = [(T[0] - E0[0]) / L2, (T[1] - E0[1]) / L2];
  const mu = move(bind.upper), ml = move(bind.lower), base = bind.root && move(bind.root.bone), far = (m: AffineMatrix, d: number[]): PaintedPoint => [m.a * d[0] + m.c * d[1], m.b * d[0] + m.d * d[1]], f1 = far(mu, d1), f2 = far(ml, d2), k1 = Math.hypot(...f1) || 1e-6, k2 = Math.hypot(...f2) || 1e-6;
  const mirror = mu.a * mu.d - mu.b * mu.c < 0 ? -1 : 1, a1 = Math.atan2(f1[1], f1[0]), turn = wrapped(Math.atan2(f2[1], f2[0]) - a1), root = far(base ?? mu, d1), up = Math.abs(wrapped(a1 - Math.atan2(root[1], root[0])));
  const gone = smooth((Math.max(up, Math.abs(turn - mirror * wrapped(Math.atan2(d2[1], d2[0]) - Math.atan2(d1[1], d1[0])))) - 0.2) / 0.6); if (gone <= 0) return undefined;
  const scale = Math.hypot(mu.a, mu.b), u1 = [f1[0] / k1, f1[1] / k1], u2 = [f2[0] / k2, f2[1] / k2], n1 = [-u1[1], u1[0]], n2 = [-u2[1], u2[0]], E = put(ml, ...E0), l1 = k1 * L1, l2 = k2 * L2;
  // the painting: where its edges are, and how wide it is on the whole
  const row = (s: number, j: 1 | 2) => { let i = 1; while (i < sides.length - 1 && sides[i][0] < s) i++; return lerp(sides[i - 1][j], sides[i][j], Math.min(1, Math.max(0, (s - sides[i - 1][0]) / (sides[i][0] - sides[i - 1][0] || 1)))); };
  const calm = (c: number, over: number, read: (r: readonly [number, number, number]) => number) => { let sum = 0, w = 0; for (const r of sides) { const g = Math.exp(-(((r[0] - c) / over) ** 2)); sum += read(r) * g; w += g; } return sum / (w || 1); };
  const paint = (s: number, n: number): PaintedPoint => (s < L1 ? [S[0] + d1[0] * s - d1[1] * n, S[1] + d1[1] * s + d1[0] * n] : [E0[0] + d2[0] * (s - L1) - d2[1] * n, E0[1] + d2[1] * (s - L1) + d2[0] * n]);
  const wide = (s: number) => calm(s, 0.07 * (L1 + L2), r => r[2] - r[1]), he = (calm(L1, 0.14 * (L1 + L2), r => r[2] - r[1]) * scale) / 2;
  const hole = bind.root?.hole, pit = hole && hole[hole.length - 1], inner = pit ? Math.sign(-(pit[0] - S[0]) * d1[1] + (pit[1] - S[1]) * d1[0]) || 1 : 0, first = sides[0][0], at0 = pit ? Math.min(0.8 * L1, (pit[0] - S[0]) * d1[0] + (pit[1] - S[1]) * d1[1]) : first;
  // the joint: a corner outside, a crease inside, both where the edges of the two parts meet
  const half = Math.abs(turn) / 2, sum = [n1[0] + n2[0], n1[1] + n2[1]], len = Math.hypot(...sum) || 1e-6, mid = [sum[0] / len, sum[1] / len], inside = Math.sign(turn) || 1, crease = Math.min(he / Math.max(0.05, Math.cos(half)), (0.55 * Math.min(l1, l2)) / Math.max(1e-3, Math.sin(half))), tip = Math.min(0.24, 0.45 * (1 / Math.max(0.3, Math.cos(half)) - 1)), d = Math.min((he / scale) * half, 0.3 * Math.min(L1, L2));
  const J: PaintedPoint = [E[0] + mid[0] * inside * crease, E[1] + mid[1] * inside * crease], c = crease * Math.sin(half), low = crease * Math.cos(half);
  const corner = (x: number): PaintedPoint => { const a = half * x * inside, r = -inside * he * (1 + tip * (1 - x * x) ** 2), vx = mid[0] * Math.cos(a) - mid[1] * Math.sin(a), vy = mid[0] * Math.sin(a) + mid[1] * Math.cos(a); return [E[0] + vx * r, E[1] + vy * r]; };
  // the root: the armhole on the body, its top carried along by the shoulder
  const on = (q: PaintedPoint): PaintedPoint => put(base ?? mu, ...q), Sn = put(mu, ...S), Sb = on(S), shift = [Sn[0] - Sb[0], Sn[1] - Sb[1]], carried = (q: PaintedPoint, w: number): PaintedPoint => { const r = on(q); return [r[0] + shift[0] * w, r[1] + shift[1] * w]; };
  const armpit = pit && carried(paint(at0, row(at0, inner < 0 ? 1 : 2)), 0.3), q0 = inner * mirror;
  const rootOf = (j: 1 | 2): PaintedPoint => {
    if (inner && (j === 1) === inner < 0) return armpit!;
    const r = inner ? carried(paint(first, row(first, j)), 1) : put(mu, ...paint(first, row(first, j))); if (!armpit) return r;
    // an arm that is up has its shoulder up with it: the root is not narrower than the arm
    const more = Math.max(0, 2.3 * he - ((armpit[0] - r[0]) * n1[0] + (armpit[1] - r[1]) * n1[1]) * q0) * smooth((up - 1.15) / 0.8);
    return [r[0] - n1[0] * q0 * more, r[1] - n1[1] * q0 * more];
  };
  const edges = ([1, 2] as const).map(j => {
    const q = (j === 1 ? -1 : 1) * mirror, bent = q === inside, R = rootOf(j), from = inner && (j === 1) === inner < 0 ? at0 : first, chordA = row(from, j), chordB = row(L1, j), P1: PaintedPoint = bent ? J : corner(-1);
    // the round of the shoulder stays on the outside
    const round = (s: number) => (inner && (j === 1) !== inner < 0 ? Math.max(0, Math.min(0.07 * L1, (calm(s, 0.1 * (L1 + L2), r => r[j]) - lerp(chordA, chordB, (s - from) / (L1 - from))) * (j === 1 ? -1 : 1))) * Math.sin(Math.PI * Math.min(1, (s - from) / (L1 - from))) * scale : 0);
    return (s: number): PaintedPoint => {
      if (s < from) return inner && (j === 1) === inner < 0 ? carried(paint(s, row(s, j)), lerp(1, 0.3, Math.max(0, s / at0))) : R;
      if (s <= L1 - (bent ? 0 : d)) { const f = (s - from) / (L1 - (bent ? 0 : d) - from || 1), b = round(s) * q; return [lerp(R[0], P1[0], f) + n1[0] * b, lerp(R[1], P1[1], f) + n1[1] * b]; }
      const v = s - L1; if (!bent && v < d) return corner(v / (d || 1));
      const a = bent ? v * k2 + c * Math.max(0, 1 - v / (0.7 * L2)) : ((v - d) / (L2 - d || 1)) * l2, h = lerp(bent ? low : he, (wide(s) * scale) / 2, smooth(v / (0.35 * L2))), X = E[0] + u2[0] * a + n2[0] * q * h, Y = E[1] + u2[1] * a + n2[1] * q * h, w = smooth((v - 0.72 * L2) / (0.22 * L2)); if (w <= 0) return [X, Y];
      const r = put(ml, ...paint(s, row(s, j))); return [lerp(X, r[0], w), lerp(Y, r[1], w)];
    };
  });
  // both edges on rows near enough to each other, once for a picture
  const N = 72, span = L1 + L2, rows = Array.from({ length: N + 1 }, (_, i) => { const s = first + ((span - first) * i) / N; return [edges[0](s), edges[1](s)] as const; });
  return { in: gone, at: (s, n) => {
    const x = Math.min(N - 1e-6, Math.max(0, ((s - first) / (span - first)) * N)), i = Math.floor(x), f = x - i, [A, B] = rows[i], [C, D] = rows[i + 1], lo = row(s, 1), hi = row(s, 2), t = (n - lo) / (hi - lo || 1);
    const ax = lerp(A[0], C[0], f), ay = lerp(A[1], C[1], f), back = Math.min(0, s - first), on = Math.max(0, s - span);
    return [ax + (lerp(B[0], D[0], f) - ax) * t + root[0] * back + f2[0] * on, ay + (lerp(B[1], D[1], f) - ay) * t + root[1] * back + f2[1] * on];
  } };
}
/** `loose`: how far the pulls of a skin act: cloth that is drawn in no longer hangs. */
function bound(bind: PaintedBind, rest: RigFrame, now: RigFrame, loose = 1): Warp {
  const move = (bone: string) => mul(now.bones.get(bone)!.world, inv(rest.bones.get(bone)!.world));
  if (bind.kind === "rigid") { const m = move(bind.bone); return (x, y) => put(m, x, y); }
  if (bind.kind === "skin") {
    const base = move(bind.bone), pulls = bind.pulls.map(p => ({ ...p, m: move(p.bone), dx: p.to[0] - p.from[0], dy: p.to[1] - p.from[1] }));
    return (x, y) => {
      let [X, Y] = put(base, x, y);
      for (const p of pulls) {
        let w = loose * smooth(((x - p.from[0]) * p.dx + (y - p.from[1]) * p.dy) / (p.dx * p.dx + p.dy * p.dy || 1e-9));
        if (p.within) w *= 1 - smooth((Math.hypot(x - p.within.at[0], y - p.within.at[1]) / p.within.radius - 0.6) / 0.4);
        if (w <= 0) continue;
        const [a, b] = put(p.m, x, y); X = lerp(X, a, w); Y = lerp(Y, b, w);
      }
      return [X, Y];
    };
  }
  // A limb: each point keeps its distance from the bone line and its place along it; only the line bends.
  const u = rest.bones.get(bind.upper)!, l = rest.bones.get(bind.lower)!, [sx, sy] = put(u.world, 0, 0), [ex, ey] = put(l.world, 0, 0), [tx, ty] = put(l.world, 0, l.length || 1);
  const L1 = Math.hypot(ex - sx, ey - sy) || 1, L2 = Math.hypot(tx - ex, ty - ey) || 1, d1 = [(ex - sx) / L1, (ey - sy) / L1], d2 = [(tx - ex) / L2, (ty - ey) / L2], mu = move(bind.upper), ml = move(bind.lower), soft = bind.soft;
  const dirU = (m: AffineMatrix, d: number[]) => Math.atan2(m.b * d[0] + m.d * d[1], m.a * d[0] + m.c * d[1]), a1 = dirU(mu, d1);
  let a2 = dirU(ml, d2); while (a2 - a1 > Math.PI) a2 -= 2 * Math.PI; while (a2 - a1 < -Math.PI) a2 += 2 * Math.PI;
  const scale = Math.hypot(mu.a, mu.b), mirror = mu.a * mu.d - mu.b * mu.c < 0 ? -1 : 1, base = bind.root && move(bind.root.bone), grow = bind.root?.soft ?? 1, sewn = base && bind.root!.hole && sewing(bind.root!.hole, grow, base, mu, [sx, sy], d1), line = outlined(bind, rest, now), tuck = 0.5 * smooth((Math.abs(a2 - a1) - 1.5) / 1.1), tight = 0.2 * smooth((Math.abs(a2 - a1) - 1.8) / 0.9), firm = 1 + 1.6 * smooth((Math.abs(a2 - a1) - 0.35) / 1.1);
  const p0 = put(mu, ex - d1[0] * soft, ey - d1[1] * soft), elbow = put(ml, ex, ey), p2 = put(ml, ex + d2[0] * soft, ey + d2[1] * soft);
  return (x, y) => {
    const s1 = (x - sx) * d1[0] + (y - sy) * d1[1], s2 = L1 + (x - ex) * d2[0] + (y - ey) * d2[1];
    // which bone a point belongs to changes over the joint, not at it
    const k = smooth((s1 - (L1 - soft)) / (2 * soft)), n1 = -(x - sx) * d1[1] + (y - sy) * d1[0], n2 = -(x - ex) * d2[1] + (y - ey) * d2[0], s = lerp(s1, s2, k), n = lerp(n1, n2, k);
    // Round the joint the line is a curve that leaves one bone and comes into the other: what goes over from one straight line to the other would swing out before the joint and after it, and the limb would look like a hose. The more it bends, the nearer the line comes to the joint (`firm`): an elbow has a bone at its point.
    const w = Math.min(1, Math.max(0, (s - L1 + soft) / (2 * soft))), v = 1 - w, round = w > 0 && w < 1, f = 2 * v * w * firm, q = v * v + f + w * w, [cx, cy] = round ? [(v * v * p0[0] + f * elbow[0] + w * w * p2[0]) / q, (v * v * p0[1] + f * elbow[1] + w * w * p2[1]) / q] : w ? put(ml, ex + d2[0] * (s - L1), ey + d2[1] * (s - L1)) : put(mu, sx + d1[0] * s, sy + d1[1] * s);
    const along = (i: 0 | 1) => firm * v * v * (elbow[i] - p0[i]) + v * w * (p2[i] - p0[i]) + firm * w * w * (p2[i] - elbow[i]), ang = round ? Math.atan2(along(1), along(0)) : w ? a2 : a1;
    // the inside of a tight bend folds in: at its full width it would come out on the other side of the limb. The cloth is tight over the point of the elbow
    const fold = n * (a2 - a1) * mirror > 0 ? tuck * Math.max(0, 1 - ((s - L1) / (2.2 * soft)) ** 2) ** 2 : tight * Math.max(0, 1 - ((s - L1) / (3 * soft)) ** 2) ** 2, m = n * (1 - fold) * scale * mirror;
    const X = cx - Math.sin(ang) * m, Y = cy + Math.cos(ang) * m;
    const to: PaintedPoint = line ? line.at(s, n) : [X, Y], mixed = (px: number, py: number): [number, number] => (line ? [lerp(px, to[0], line.in), lerp(py, to[1], line.in)] : [px, py]);
    if (sewn) return mixed(...sewn(x, y, X, Y));
    const [ox, oy] = mixed(X, Y); if (!base || s1 >= grow) return [ox, oy];
    const [rx, ry] = put(base, x, y), g = smooth((s1 + grow) / (2 * grow));
    return [lerp(rx, ox, g), lerp(ry, oy, g)];
  };
}

/** A hand bends at its wrist: what is painted beyond it, in the bone's space, goes with the bone before it. */
function wristWarp(drawn: number, soft: number, own: RigBone, now: RigFrame): Warp {
  const arm = own.parent && now.bones.get(own.parent)?.world; if (!arm) return same;
  const h = inv(now.bones.get(own.id)!.world), vx = h.a * arm.c + h.c * arm.d, vy = h.b * arm.c + h.d * arm.d, turn = Math.atan2(-vx, vy) - (drawn * Math.PI) / 180;
  return (x, y) => { const a = turn * smooth((soft - y) / (2 * soft)), c = Math.cos(a), s = Math.sin(a); return [x * c - y * s, x * s + y * c]; };
}

/** Where marks went pulls the paint round them along; the edge of the patch does not move. */
function pulled(p: PaintedPatch, to: readonly PaintedPoint[]): Warp {
  const from = p.marks!;
  return (x, y) => {
    let wx = 0, wy = 0, sum = 1e-9;
    for (let i = 0; i < from.length; i++) { const d2 = (x - from[i][0]) ** 2 + (y - from[i][1]) ** 2, w = 1 / (d2 + (p.width * 0.02) ** 2) ** 1.5; wx += w * (to[i][0] - from[i][0]); wy += w * (to[i][1] - from[i][1]); sum += w; }
    const u = (x - p.x) / p.width, v = (y - p.y) / p.height, edge = smooth(Math.min(u, 1 - u) / 0.2) * smooth(Math.min(v, 1 - v) / 0.2);
    return [x + (wx / sum) * edge, y + (wy / sum) * edge];
  };
}

/** How far a painted head turns in depth, degrees: to a side, up, down. One flat painting has no more of the side of a face than was painted, so past this the ears stand still while the face slides off them. Eyes, chest and a tilt of the head carry the rest, or another view does. */
export const PAINTED_TURN = { side: 15, up: 5, down: 7 } as const;
/** Straight up to 0.6 of `most`, then ever slower, and never over it. */
const eased = (v: number, most: number) => { const u = Math.abs(v) / most; return u <= 0.6 ? v : Math.sign(v) * most * (0.6 + 0.4 * Math.tanh((u - 0.6) / 0.4)); };
/** The turn that a painted head shows when `turn` is asked of it. */
export const paintedTurn = (turn: PaintedPoint): PaintedPoint => [eased(turn[0], PAINTED_TURN.side), eased(turn[1], turn[1] < 0 ? PAINTED_TURN.up : PAINTED_TURN.down)];

/** Turn of a round head: what is nearest to the viewer moves most, and its outline stays. Up and down, the face goes as one across its width, so that a tilt does not slant the brows. `relief` is what stands out from the round (a nose). */
function turnWarp(round: PaintedFace["round"], turn: PaintedPoint | undefined, relief?: (x: number, y: number) => number): Warp {
  if (!turn || (Math.abs(turn[0]) < 0.05 && Math.abs(turn[1]) < 0.05)) return same;
  const [cx, cy] = round.at, [rx, ry] = round.radius, qx = Math.sin((turn[0] * Math.PI) / 180), qy = Math.sin((turn[1] * Math.PI) / 180), sx = qx * rx, sy = qy * ry;
  // the far side may be squeezed, never folded: the round gets flatter as the turn gets larger
  const full = 0.6 * Math.min(1, Math.max(0, 1.5 - 4.2 * Math.max(Math.abs(qx), Math.abs(qy)))), deep = (z2: number) => (z2 <= 0 ? 0 : z2 * (1 + full * (1 - z2)));
  return (x, y) => { const d = (x - cx) / rx, e = (y - cy) / ry, v = 1 - e * e, u = v > 0 ? (d * d) / v : 1, out = relief ? relief(x, y) : 0; return [x + sx * deep(v - d * d) + qx * out, y + sy * deep(v) * (u < 1 ? 1 - u ** 3 : 0) + qy * out * 0.5]; };
}

/** A look, or the one that stands in for it; a face on a mesh has the looks of `rig-face` too. */
function lookOf(face: PaintedFace, name: string | undefined): PaintedLook | undefined {
  if (name === undefined) return undefined;
  const own = face.looks[name], shared = face.mesh ? FACE_LOOKS[name] : undefined;
  return own ? (shared && !own.units && !own.shut ? { ...own, units: shared.units } : own) : shared ? { ...shared, patches: face.looks.neutral?.patches } : face.looks[face.lookFor?.[name] ?? ""];
}
/** Every look that a face can show. */
export const paintedLooks = (face: PaintedFace): string[] => [...new Set([...Object.keys(face.looks), ...Object.keys(face.lookFor ?? {}), ...(face.mesh ? Object.keys(FACE_LOOKS) : [])])];
/** Patch of a mouth, or of the one that stands in for it; the name of a patch is itself. */
const mouthPatch = (face: PaintedFace, name: string) => face.mouths[name] ?? face.mouths[face.mouthFor?.[name] ?? ""] ?? (face.patches[name] ? name : face.mouths.rest);
/** The jaw goes down as far as the painted mouth is open. */
function jawWarp(face: PaintedFace, fs: PaintedFaceState): Warp {
  const jaw = face.jaw, m = fs.mouth, look = lookOf(face, (fs.mix ?? 1) > 0.5 ? fs.look : (fs.from ?? fs.look)), own = look?.mouth;
  if (!jaw || (!m && !own)) return same;
  const gap = (id: string | undefined) => { const p = id ? face.patches[id] : undefined, k = p && (p.shape ?? p.marks); return k && k.length > 3 ? Math.max(0, k[3][1] - k[2][1]) : 0; };
  const most = Math.max(1e-6, ...Object.values(face.mouths).map(gap)), w = m ? (m.weight ?? 1) : 0, said = m ? lerp(gap(mouthPatch(face, m.from)) * (m.fromStrength ?? 1), gap(mouthPatch(face, m.to)) * (m.toStrength ?? 1), m.mix) : 0;
  const down = (lerp(gap(own && mouthPatch(face, own)) * (look?.strength ?? 1), said, w) / most) * jaw.drop;
  return down < 1e-3 ? same : (x, y) => [x, y + down * bump(x, y, jaw.at, jaw.radius)];
}

const bump = (x: number, y: number, at: PaintedPoint, r: PaintedPoint) => { const d = ((x - at[0]) / r[0]) ** 2 + ((y - at[1]) / r[1]) ** 2; return d >= 1 ? 0 : (1 - d) ** 2; };

/** The figure at a frame of its rig: meshes back to front. `rest` is the rig without acting (the pose that was painted). */
export function paintedMeshes(art: PaintedArt, spec: RigSpec, now: RigFrame, state: PaintedState = {}): PaintedMesh[] {
  const rest = paintedRest(art, spec), out: PaintedMesh[] = [], hidden = new Set(state.hidden), face = art.face, fs = state.face ?? {}, alpha = state.opacity ?? 1, mirrored = now.root.facing < 0;
  const turn = face ? turnWarp(face.round, fs.turn && paintedTurn(fs.turn), face.mesh && faceRelief(face.mesh)) : same, jaw = face ? jawWarp(face, fs) : same, trunk = art.trunk && state.trunk ? turnWarp(art.trunk, [state.trunk, 0]) : same;
  const shows = face?.shows ?? 1, mixed = fs.look ? (fs.mix ?? 1) : 1, acts = face?.mesh ? expressWarp(face.mesh, [[lookOf(face, fs.look)?.units ?? {}, mixed * shows], [(fs.from !== undefined && lookOf(face, fs.from)?.units) || {}, (1 - mixed) * shows], [fs.units ?? {}, shows], [browUnits(fs.brow ?? 0), shows]]) : null;
  const shade = (t?: readonly [number, number, number]): readonly [number, number, number] | undefined => (state.tint && t ? [t[0] * state.tint[0], t[1] * state.tint[1], t[2] * state.tint[2]] : (t ?? state.tint));
  const drawnOf = (l: PaintedLayer) => { const name = state.hands?.[l.id], variant = name ? l.variants?.[name] : undefined; return { variant, order: l.z + (state.lift?.[l.id] ?? 0) + (variant?.over ?? 0) }; };
  // what is over a held thing is over it in both hands, and over the sleeves
  const armOf = (l: PaintedLayer) => { const parent = l.bind.kind === "rigid" ? spec.bones.find(b => b.id === (l.bind as { bone: string }).bone)?.parent : undefined, arm = art.layers.find(q => q.bind.kind === "limb" && q.bind.lower === parent); return arm ? drawnOf(arm).order : -Infinity; };
  const over = Math.max(...art.layers.map(l => { const { variant, order } = drawnOf(l); return variant?.front ? Math.max(order, armOf(l)) : -Infinity; })) + 0.06;
  for (const layer of art.layers) {
    if (hidden.has(layer.id)) continue;
    const bone = layer.bind.kind === "limb" ? layer.bind.upper : layer.bind.bone, shown = alpha * (now.bones.get(bone)?.opacity ?? 1);
    if (shown <= 0.002) continue;
    const { variant, order } = drawnOf(layer);
    const joint = spec.bones.find(b => b.id === bone)!, bend = layer.bind.kind === "limb" ? layer.bind.soft : (variant ?? layer).wrist !== undefined ? 0.22 * (joint.length || 1) : Infinity;
    const draw = (p: PaintedPlace, id: string, z: number, at: Warp) => out.push({ id, image: p.image, ...gridOf(p, gridFor(layer.grid ?? [1, 1], p, bend), at), opacity: shown, tint: shade(layer.tint), z });
    const turned = (variant ?? layer).wrist, wrist = turned === undefined ? same : wristWarp(turned, bend, joint, now), inBone = (p: PaintedPlace): Warp => { const m = now.bones.get(bone)!.world, r = ((p.rotate ?? 0) * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r); return (x, y) => put(m, ...wrist(x * c - y * s, x * s + y * c)); };
    if (layer.space === "bone" || (variant && !variant.rest)) {
      const p = variant ?? layer;
      draw(p, layer.id, order, inBone(p));
      if (variant?.front) draw(variant.front, `${layer.id}/front`, over, inBone(variant.front));
      continue;
    }
    const bound = binder(layer.bind, rest, now), cx = layer.x + layer.width / 2, read: Warp = layer.keepReading && mirrored ? (x, y) => [2 * cx - x, y] : same, shaped: Warp = layer.turns === "trunk" ? trunk : face?.layer !== layer.id ? turn : acts ? (x, y) => turn(...jaw(...acts(x, y))) : (x, y) => turn(...jaw(x, y)), bent: Warp = layer.turns ? (x, y) => bound(...shaped(x, y)) : bound;
    const drawn = variant ?? layer; draw(drawn, layer.id, order, (x, y) => bent(...read(x, y)));
    if (layer.bind.kind === "limb") { const m = out[out.length - 1], at = alongLimb(layer.bind, rest); m.along = Float32Array.from({ length: m.uvs.length / 2 }, (_, i) => at(drawn.x + m.uvs[2 * i] * drawn.width, drawn.y + m.uvs[2 * i + 1] * drawn.height)); }
    if (!face || face.layer !== layer.id) continue;

    // ---- the face on this layer
    const browUp: Warp = fs.brow && !face.mesh ? (x, y) => { let Y = y; for (const b of face.brows ?? []) Y -= fs.brow! * b.radius[1] * 0.42 * bump(x, y, b.at, b.radius); return [x, Y]; } : same;
    const onHead = (w: Warp = same): Warp => (x, y) => bent(...w(...browUp(x, y)));
    let z = order + 0.001, top = layer as PaintedPlace;
    const patch = (id: string, opacity: number, w: Warp = same, grid: readonly [number, number] = face.mesh ? [22, 20] : [10, 10]) => {
      const p = face.patches[id]; if (!p || opacity <= 0.002) return;
      out.push({ id: `${layer.id}/${id}`, image: p.image, ...gridOf(p, grid, onHead(w)), opacity: shown * opacity, tint: shade(layer.tint), z }); z += 0.0005;
      if (opacity > 0.5) top = p;
    };
    const look = lookOf(face, fs.look), before = lookOf(face, fs.from), mix = fs.look ? (fs.mix ?? 1) : 1, blink = fs.blink ?? 0, shut = !!(mix > 0.5 ? look?.shut : before?.shut);
    // eyebrows alone: a small sheet of the same painting, dense enough to bend
    if (fs.brow && !face.mesh) for (const b of face.brows ?? []) { const q = crop(layer, b.at, [b.radius[0], b.radius[1]]); out.push({ id: `${layer.id}/brow`, image: layer.image, ...subGrid(layer, q, [12, 12], onHead()), opacity: shown, tint: shade(layer.tint), z }); z += 0.0005; }
    if (before && mix < 1) for (const id of before.patches ?? []) patch(id, 1);
    if (look) for (const id of look.patches ?? []) patch(id, before && look.patches?.every(q => before.patches?.includes(q)) ? 1 : mix);
    if (fs.gaze && !shut && blink < 0.3 && (Math.abs(fs.gaze[0]) > 0.02 || Math.abs(fs.gaze[1]) > 0.02)) for (const e of face.eyes) {
      const src = inside(top, e.at) ? top : layer, q = crop(src, e.at, e.radius), g = fs.gaze;
      out.push({ id: `${layer.id}/eye`, image: src.image, ...subGrid(src, q, [14, 12], onHead((x, y) => { const b = bump(x, y, e.at, e.radius); return [x + g[0] * e.radius[0] * 0.3 * b, y + g[1] * e.radius[1] * 0.26 * b]; })), opacity: shown, tint: shade(layer.tint), z }); z += 0.0005;
    }
    if (!shut && face.lids.length) { const half = face.lids[0], closed = face.lids[face.lids.length - 1]; if (blink > 0.62) patch(closed, 1); else if (blink > 0.24) patch(half, 1); }
    const own = (mix > 0.5 ? look : before)?.mouth, m = fs.mouth, w = m ? (m.weight ?? 1) : 0;
    const rested = face.patches[face.mouths.rest]?.marks, reach = (p: PaintedPatch, s: number) => (p.shape ?? p.marks!).map(([x, y], i): PaintedPoint => [lerp(rested![i][0], x, s), lerp(rested![i][1], y, s)]);
    if (own && w < 1) { const id = mouthPatch(face, own), p = face.patches[id], s = (mix > 0.5 ? look : before)?.strength ?? 1; patch(id, 1, p?.marks && rested && (p.shape || s < 1) ? pulled(p, reach(p, s)) : same, [16, 16]); }
    if (m && w > 0) {
      const a = mouthPatch(face, m.from), b = mouthPatch(face, m.to), pa = face.patches[a], pb = face.patches[b];
      if (pa?.marks && pb?.marks && rested) {
        const ra = reach(pa, m.fromStrength ?? 1), rb = reach(pb, m.toStrength ?? 1), to = ra.map(([x, y], i): PaintedPoint => [lerp(x, rb[i][0], m.mix), lerp(y, rb[i][1], m.mix)]);
        patch(a, w, pulled(pa, to), [16, 16]);
        if (b !== a) patch(b, w * smooth((m.mix - 0.2) / 0.6), pulled(pb, to), [16, 16]);
      } else { patch(a, w); if (b !== a) patch(b, w * smooth(m.mix)); }
    }
  }
  return out.sort((a, b) => a.z - b.z);
}

const inside = (p: PaintedPlace, [x, y]: PaintedPoint) => x > p.x && y > p.y && x < p.x + p.width && y < p.y + p.height;
function crop(p: PaintedPlace, at: PaintedPoint, r: PaintedPoint) { const x0 = Math.max(p.x, at[0] - r[0]), y0 = Math.max(p.y, at[1] - r[1]), x1 = Math.min(p.x + p.width, at[0] + r[0]), y1 = Math.min(p.y + p.height, at[1] + r[1]); return { x: x0, y: y0, width: Math.max(0, x1 - x0), height: Math.max(0, y1 - y0) }; }
/** A grid over a part of a painting. */
function subGrid(p: PaintedPlace, q: { x: number; y: number; width: number; height: number }, grid: readonly [number, number], at: Warp): Cell {
  const g = gridOf({ ...p, ...q }, grid, at);
  for (let i = 0; i < g.uvs.length; i += 2) { g.uvs[i] = (q.x + g.uvs[i] * q.width - p.x) / p.width; g.uvs[i + 1] = (q.y + g.uvs[i + 1] * q.height - p.y) / p.height; }
  return g;
}

/** Where a socket is in the scene. */
export function paintedSocket(art: PaintedArt, now: RigFrame, name: string): { at: PaintedPoint; angle: number; scale: number } | null {
  const s = art.sockets?.[name]; if (!s) return null;
  if ("between" in s) { const [p, q] = s.between.map(n => paintedSocket(art, now, n)); return p && q ? { at: [(p.at[0] + q.at[0]) / 2, (p.at[1] + q.at[1]) / 2], angle: (Math.atan2(q.at[1] - p.at[1], q.at[0] - p.at[0]) * 180) / Math.PI, scale: p.scale } : null; }
  const b = now.bones.get(s.bone); if (!b) return null;
  const m = b.world;
  return { at: put(m, s.at[0], s.at[1]), angle: (Math.atan2(m.b, m.a) * 180) / Math.PI + (s.angle ?? 0), scale: Math.hypot(m.a, m.b) };
}

/** What is wrong with painted art for a rig: names that do not exist, places with no size, a face without a mouth to rest in. */
export function inspectPainted(art: PaintedArt, spec: RigSpec): string[] {
  const wrong: string[] = [], bones = new Set(spec.bones.map(b => b.id)), ids = new Set<string>();
  const place = (p: PaintedPlace, who: string) => { if (!art.images[p.image]) wrong.push(`${who} uses the image "${p.image}", which does not exist.`); if (!(p.width > 0 && p.height > 0)) wrong.push(`${who} has no size.`); };
  for (const l of art.layers) {
    const who = `Layer "${l.id}"`;
    if (ids.has(l.id)) wrong.push(`${who} is there twice.`); ids.add(l.id);
    place(l, who);
    for (const [n, v] of Object.entries(l.variants ?? {})) { place(v, `${who}, drawing "${n}"`); if (v.front) place(v.front, `${who}, front of "${n}"`); }
    const b = l.bind;
    for (const id of b.kind === "limb" ? [b.upper, b.lower] : b.kind === "skin" ? [b.bone, ...b.pulls.map(p => p.bone)] : [b.bone]) if (!bones.has(id)) wrong.push(`${who} is bound to the bone "${id}", which does not exist.`);
    if (b.kind !== "rigid" && b.slack) for (const id of [b.slack.upper, b.slack.lower]) if (!bones.has(id)) wrong.push(`${who} hangs from the bone "${id}", which does not exist.`);
    if (b.kind === "limb" && !(b.soft > 0)) wrong.push(`${who} has no soft length at its joint.`);
    if (b.kind === "limb" && b.root?.hole && (b.root.hole.length < 2 || !(b.root.soft > 0))) wrong.push(`${who} is sewn to a hole of less than two points, or with no soft length.`);
  }
  const f = art.face;
  if (f) {
    if (!ids.has(f.layer)) wrong.push(`The face is on the layer "${f.layer}", which does not exist.`);
    for (const [n, p] of Object.entries(f.patches)) place(p, `Patch "${n}"`);
    const has = (n: string, who: string) => { if (!f.patches[n]) wrong.push(`${who} uses the patch "${n}", which does not exist.`); };
    for (const [n, to] of Object.entries(f.lookFor ?? {})) if (!f.looks[to]) wrong.push(`Look "${n}" is stood in for by "${to}", which is not there.`);
    for (const [n, l] of Object.entries(f.looks)) { (l.patches ?? []).forEach(p => has(p, `Look "${n}"`)); if (l.mouth && !f.mouths[l.mouth]) has(l.mouth, `Look "${n}"`); }
    if (f.mesh && f.mesh.length < 468) wrong.push("The face mesh does not have 468 points.");
    f.lids.forEach(p => has(p, "Lids")); Object.entries(f.mouths).forEach(([n, p]) => has(p, `Mouth "${n}"`));
    if (!f.mouths.rest) wrong.push("The face has no mouth at rest.");
    const counts = new Set(Object.values(f.mouths).map(p => f.patches[p]?.marks?.length ?? 0)); if (counts.size > 1) wrong.push("The mouths do not have the same number of marks.");
  }
  for (const [n, s] of Object.entries(art.sockets ?? {})) if ("between" in s) s.between.forEach(q => { if (!art.sockets![q]) wrong.push(`Socket "${n}" is between "${q}" and another one, and there is no "${q}".`); }); else if (!bones.has(s.bone)) wrong.push(`Socket "${n}" is on the bone "${s.bone}", which does not exist.`);
  return wrong;
}
