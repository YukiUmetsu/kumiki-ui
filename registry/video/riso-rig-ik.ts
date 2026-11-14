/**
 * RISO3 — deterministic, bounded two-bone IK and planted-foot target tracks.
 * Positions are in authored character-stage coordinates, not browser pixels.
 * No integration / mutable simulation state; shuffled seeks return exact poses.
 */
import type { RisoMatrix, RisoJoint } from "./riso-character";

export interface RisoPoint { x: number; y: number }
export interface RisoIKKey extends RisoPoint {
  frame: number;
  easing?: "linear" | "ease" | "hold";
}
export interface RisoIKKeyTarget {
  kind: "keys";
  keys: readonly RisoIKKey[];
}
export interface RisoWalkTarget {
  kind: "walk";
  startFrame: number;
  endFrame: number;
  initialX: number;
  groundY: number;
  /** One stride by this foot per cycle (not the distance between alternating feet). */
  stride: number;
  cycleFrames: number;
  stanceFrames: number;
  /** Offsets the other foot by half a cycle, without introducing an extra clock. */
  phaseFrames?: number;
  lift: number;
}
export type RisoIKTarget = RisoIKKeyTarget | RisoWalkTarget;
export interface RisoTwoBoneIK {
  id: string;
  root: string;
  mid: string;
  end: string;
  bend: -1 | 1;
  target: RisoIKTarget;
  /** Keep the shoe/hand's visible orientation independent of the shin or forearm. */
  endRotation?: number;
}
export interface RisoIKSolution {
  hip: RisoPoint;
  knee: RisoPoint;
  ankle: RisoPoint;
  requested: RisoPoint;
  /** True only when requested target is within reachable two-bone bounds. */
  reachable: boolean;
  error: number;
}
export interface RisoIKDiagnostic extends RisoIKSolution { id: string }
const smooth = (p: number) => { const t = Math.max(0, Math.min(1, p)); return t * t * (3 - 2 * t); };
const interpolate = (a: number, b: number, t: number) => a + (b - a) * t;
const point = (m: RisoMatrix): RisoPoint => ({ x: m.e, y: m.f });
const distance = (a: RisoPoint, b: RisoPoint) => Math.hypot(a.x - b.x, a.y - b.y);
const direction = (a: RisoPoint, b: RisoPoint) => Math.atan2(b.y - a.y, b.x - a.x);
const normal = (v: number) => Math.round(v * 1e7) / 1e7;

/** Author-position target sampler. 'hold' keys and grounded walk stance never drift. */
export function sampleRisoIKTarget(target: RisoIKTarget, frame: number): RisoPoint {
  if (!Number.isSafeInteger(frame) || frame < 0) throw new RangeError("IK frame must be a nonnegative integer.");
  if (target.kind === "keys") {
    const keys = target.keys;
    if (keys.length === 0) throw new RangeError("IK key target requires at least one key.");
    if (frame <= keys[0].frame) return { x: keys[0].x, y: keys[0].y };
    let i = 0;
    while (i + 1 < keys.length && keys[i + 1].frame <= frame) i++;
    const k = keys[i], next = keys[i + 1];
    if (!next || k.easing === "hold") return { x: k.x, y: k.y };
    const t = Math.max(0, Math.min(1, (frame - k.frame) / (next.frame - k.frame)));
    const p = k.easing === "ease" ? smooth(t) : t;
    return { x: interpolate(k.x, next.x, p), y: interpolate(k.y, next.y, p) };
  }
  if (target.kind !== "walk") throw new RangeError("Unsupported IK target type.");
  const time = Math.max(0, Math.min(frame, target.endFrame) - target.startFrame);
  if (frame < target.startFrame) return { x: target.initialX, y: target.groundY };
  const phase = time + (target.phaseFrames ?? 0);
  const cycle = Math.floor(phase / target.cycleFrames), local = phase - cycle * target.cycleFrames;
  const x = target.initialX + cycle * target.stride;
  if (local <= target.stanceFrames) return { x, y: target.groundY };
  const p = (local - target.stanceFrames) / (target.cycleFrames - target.stanceFrames);
  const lift = Math.sin(Math.PI * p);
  return { x: x + target.stride * smooth(p), y: target.groundY - target.lift * lift };
}

/**
 * Triangle solution with a deliberately chosen knee pole/bend.
 * Unreachable targets clamp to the closest physically attainable ankle.
 */
export function solveRisoTwoBone(
  hip: RisoPoint, currentKnee: RisoPoint, currentAnkle: RisoPoint,
  requested: RisoPoint, bend: -1 | 1,
): RisoIKSolution {
  const upper = distance(hip, currentKnee), lower = distance(currentKnee, currentAnkle);
  if (upper < 1e-5 || lower < 1e-5) throw new RangeError("IK bone lengths cannot be zero.");
  const dx = requested.x - hip.x, dy = requested.y - hip.y;
  const actual = Math.hypot(dx, dy);
  const ux = actual > 1e-8 ? dx / actual : 0;
  const uy = actual > 1e-8 ? dy / actual : 1;
  const minimum = Math.abs(upper - lower) + 1e-5;
  const maximum = upper + lower - 1e-5;
  const d = Math.max(minimum, Math.min(maximum, actual));
  const along = (upper * upper - lower * lower + d * d) / (2 * d);
  const height = Math.sqrt(Math.max(0, upper * upper - along * along));
  const knee = { x: hip.x + ux * along - bend * uy * height,
    y: hip.y + uy * along + bend * ux * height };
  const ankle = { x: hip.x + ux * d, y: hip.y + uy * d };
  return { hip, knee, ankle, requested, reachable: actual >= minimum && actual <= maximum,
    error: distance(ankle, requested) };
}
function rotateAbout(m: RisoMatrix, origin: RisoPoint, angle: number): RisoMatrix {
  const c = Math.cos(angle), s = Math.sin(angle);
  return {
    a: c * m.a - s * m.b, b: s * m.a + c * m.b,
    c: c * m.c - s * m.d, d: s * m.c + c * m.d,
    e: origin.x + c * (m.e - origin.x) - s * (m.f - origin.y),
    f: origin.y + s * (m.e - origin.x) + c * (m.f - origin.y),
  };
}
/** Applies joint-constrained rotations to world matrices and their entire child subtrees. */
export function applyRisoIK(
  joints: readonly RisoJoint[], world: Map<string, RisoMatrix>,
  constraints: readonly RisoTwoBoneIK[], frame: number,
): readonly RisoIKDiagnostic[] {
  const children = new Map<string, string[]>();
  for (const j of joints) if (j.parent) children.set(j.parent, [...(children.get(j.parent) ?? []), j.id]);
  const subtree = (id: string): string[] => {
    const ids = [id];
    for (const child of children.get(id) ?? []) ids.push(...subtree(child));
    return ids;
  };
  const diagnostics: RisoIKDiagnostic[] = [];
  for (const constraint of constraints) {
    const root = world.get(constraint.root)!,
      mid = world.get(constraint.mid)!, end = world.get(constraint.end)!;
    const H = point(root), M = point(mid), E = point(end);
    const requested = sampleRisoIKTarget(constraint.target, frame);
    const solution = solveRisoTwoBone(H, M, E, requested, constraint.bend);
    const first = direction(H, solution.knee) - direction(H, M);
    for (const id of subtree(constraint.root)) world.set(id, rotateAbout(world.get(id)!, H, first));
    const K = point(world.get(constraint.mid)!);
    const currentE = point(world.get(constraint.end)!);
    const second = direction(K, solution.ankle) - direction(K, currentE);
    for (const id of subtree(constraint.mid)) world.set(id, rotateAbout(world.get(id)!, K, second));
    if (constraint.endRotation !== undefined) {
      const ankle = point(world.get(constraint.end)!);
      const matrix = world.get(constraint.end)!;
      const delta = constraint.endRotation * Math.PI / 180 - Math.atan2(matrix.b, matrix.a);
      for (const id of subtree(constraint.end)) world.set(id, rotateAbout(world.get(id)!, ankle, delta));
    }
    const solvedAnkle = point(world.get(constraint.end)!);
    diagnostics.push({
      ...solution, id: constraint.id,
      hip: { x: normal(H.x), y: normal(H.y) },
      knee: point(world.get(constraint.mid)!),
      ankle: { x: normal(solvedAnkle.x), y: normal(solvedAnkle.y) },
      error: distance(solvedAnkle, requested),
    });
  }
  return diagnostics;
}
