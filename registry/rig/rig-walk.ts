/**
 * Steps on a floor that is seen in perspective, for a RIG1 person drawn from the front or from behind, and legs bent in depth.
 * A foot that is down stays at its place of the floor, so it does not slide however the way is eased. A way has a first step and
 * a last step. The same legs sit down.
 *
 * Own space of a figure: x across, y up is negative, the floor is 0, z comes toward the viewer.
 */
export type FloorPoint = readonly [number, number];
export type DepthPoint = readonly [number, number, number];
type Foot = "f" | "b";

/** How a picture shows its floor: where it vanishes, and how far the camera is from y = 0, where things have their own size. */
export interface GroundView { horizon: FloorPoint; distance: number }
export interface Floor {
  /** Size of what stands at this y of the picture. */ scale(y: number): number;
  /** The place of the floor that the picture has at a point: across, toward the viewer. */ place(x: number, y: number): [number, number];
  /** Where the picture has a point in space, and its size there. */ show(p: DepthPoint): [number, number, number];
}
export function floorOf({ horizon: [hx, hy], distance }: GroundView): Floor {
  return {
    scale: y => (y - hy) / -hy,
    place: (x, y) => { const s = (y - hy) / -hy; return [(x - hx) / s, distance - distance / s]; },
    show: ([x, y, z]) => { const s = distance / (distance - z); return [hx + x * s, hy + (y - hy) * s, s]; },
  };
}

const smooth = (t: number) => { const u = Math.min(1, Math.max(0, t)); return u * u * (3 - 2 * u); };

/** One foot from one place of the way to the next, while the body goes from `a` to `b` (all along the way). */
export interface Step { foot: Foot; from: number; to: number; a: number; b: number }
export interface Steps { length: number; /** Between two steps. */ step: number; first: Foot; list: readonly Step[] }
/** The steps of a way: as many as fit the stride, a half one to start and one that closes the feet. */
export function stepsOf(length: number, height: number, o: { /** Body heights. */ step?: number; first?: Foot } = {}): Steps {
  const n = Math.max(1, Math.round(length / ((o.step ?? 0.3) * height))), step = length / n, first = o.first ?? "f", other: Foot = first === "f" ? "b" : "f", list: Step[] = [];
  for (let k = 1; k <= n + 1; k++) { const mid = (k - 1) * step; list.push({ foot: k % 2 ? first : other, from: Math.max(0, k - 2) * step, to: Math.min(k, n) * step, a: k === 1 ? 0 : k === n + 1 ? length - 0.55 * step : mid - 0.4 * step, b: k === 1 ? 0.55 * step : k === n + 1 ? length : mid + 0.4 * step }); }
  return { length, step, first, list };
}
export interface Walking { /** Each foot: how far it is along the way, 0–1 how far it is off the floor, 0–1 how far its heel is up. */ feet: Record<Foot, { along: number; lift: number; heel: number; /** 0–1: how far in it stands, nearer to the middle than when the body stands still. */ close: number }>; /** 0–1: the body goes down with both feet on the floor. */ sink: number; /** −1..1: over which foot the weight is; f is positive. */ over: number; /** How much of a walk it is: 0 at both ends. */ much: number }
/** The feet and the weight when the body is this far along. */
export function walkAt(s: Steps, along: number): Walking {
  const l = Math.min(s.length, Math.max(0, along)), feet: Walking["feet"] = { f: { along: 0, lift: 0, heel: 0, close: 0 }, b: { along: 0, lift: 0, heel: 0, close: 0 } };
  for (const q of s.list) if (l > q.a) { const u = Math.min(1, (l - q.a) / Math.max(1e-6, q.b - q.a)); feet[q.foot] = { along: q.from + (q.to - q.from) * (u - Math.sin(2 * Math.PI * u) / (2 * Math.PI)), lift: u < 1 ? Math.sin(Math.PI * u) : 0, heel: 0, close: 0 }; }
  const walks = (at: number) => smooth(at / (0.6 * s.step)) * smooth((s.length - at) / (0.6 * s.step));
  for (const k of ["f", "b"] as const) { const q = feet[k]; if (!q.lift) q.heel = smooth((l - q.along - 0.28 * s.step) / (0.36 * s.step)); q.close = walks(q.along); }
  const much = walks(l), phase = (Math.PI * l) / s.step;
  return { feet, sink: (much * (1 - Math.cos(2 * phase))) / 2, over: -much * Math.cos(phase) * (s.first === "f" ? 1 : -1), much };
}

/** Legs that stand somewhere: where the ankles are and which way the knees go. */
export interface LegStance {
  ankle: Readonly<Record<Foot, DepthPoint>>; /** Across, toward the viewer. */ knee: FloorPoint;
  /** Moves the hips, and turns them in the picture, degrees. */ hips: { x: number; y: number; z?: number; roll: number };
  /** Degrees that each arm swings forward. */ arms?: Readonly<Record<Foot, number>>;
  /** Own space → the picture, in the figure's own units. */ show(p: DepthPoint): [number, number, number];
}
/** A floor before a figure that has none of its own. */
export function ownFloor(height: number): LegStance["show"] { const f = floorOf({ horizon: [0, -0.72 * height], distance: 2.2 * height }); return f.show; }

/** The knee between a hip and an ankle, and the ankle where the leg can have it. */
export function bendLeg(hip: DepthPoint, ankle: DepthPoint, upper: number, lower: number, way: FloorPoint): { knee: DepthPoint; ankle: DepthPoint } {
  let d: DepthPoint = [ankle[0] - hip[0], ankle[1] - hip[1], ankle[2] - hip[2]], far = Math.hypot(...d) || 1e-6; const most = 0.998 * (upper + lower), k = Math.min(1, most / far); d = [d[0] * k, d[1] * k, d[2] * k]; far *= k;
  const a = (upper * upper - lower * lower + far * far) / (2 * far), off = Math.sqrt(Math.max(0, upper * upper - a * a)), u: DepthPoint = [d[0] / far, d[1] / far, d[2] / far];
  // the knee goes the way it is told, at a right angle to the leg
  const w: DepthPoint = [way[0], 0, way[1]], dot = w[0] * u[0] + w[2] * u[2], v: DepthPoint = [w[0] - dot * u[0], -dot * u[1], w[2] - dot * u[2]], n = Math.hypot(...v) || 1e-6;
  return { knee: [hip[0] + u[0] * a + (v[0] / n) * off, hip[1] + u[1] * a + (v[1] / n) * off, hip[2] + u[2] * a + (v[2] / n) * off], ankle: [hip[0] + d[0], hip[1] + d[1], hip[2] + d[2]] };
}
