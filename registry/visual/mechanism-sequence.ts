/** V08 `MechanismSequence` — coordinated operations on an assembly's moving parts.
 *
 * Joints are semantic parts with a motion:
 * - `rotate` / `slide`: an explicit axis and range (radians / asset units);
 * - `declared`: the part's own declared motion (e.g. `userData.motion` on home-kit
 *   doors and drawers), driven 0 → 1;
 * - `spin`: continuous rotation at an authored rpm, with spin-up and spin-down ramps;
 * - `toggle`: an on/off state (indicator lights, flames) eased between 0 and 1.
 *
 * Operations target joints at frames or `after` other operations. Unknown joints
 * and dependency cycles throw. Targets beyond a joint's limits are clamped and
 * reported (`joint-limit`), and overlapping operations on one joint are errors.
 * Spin phase is integrated in closed form, so any frame (in any seek order)
 * gives the same angle. Real rpm is kept separate from the visual rpm: a scaled
 * spin is reported (`spin-scaled`). No forces, torques or physics.
 */
import { evaluateEasing } from "../motion/easing";
import type { EasingSpec } from "../motion/types";

export type MechanismMotion =
  | { type: "rotate"; axis: readonly [number, number, number]; range: readonly [number, number] }
  | { type: "slide"; axis: readonly [number, number, number]; range: readonly [number, number] }
  | { type: "declared" }
  | { type: "spin"; axis: readonly [number, number, number]; rpm: number; /** Visual speed factor (aliasing). @default 1 */ visualScale?: number; spinUp?: number; spinDown?: number }
  | { type: "toggle" };

export interface MechanismJoint {
  /** Semantic part id of the moving pivot. */
  id: string;
  label?: string;
  motion: MechanismMotion;
  /** Rest value (rotate/slide in their units; declared/toggle 0..1). @default range[0] or 0 */
  rest?: number;
}

export interface MechanismOperation {
  id: string;
  joint: string;
  /** Absolute start frame (or omit and use `after`). */
  at?: number;
  /** Start when these operations end (plus `delay`). */
  after?: string | string[];
  delay?: number;
  /** Frames the move takes. @default 24 (spin: its spin-up/down) */
  duration?: number;
  /** Target: a value, or "on"/"off" for spin and toggle joints, "open"/"close" for declared joints. */
  to: number | "on" | "off" | "open" | "close";
  easing?: EasingSpec;
  label?: string;
}

export interface MechanismSpec { id: string; joints: MechanismJoint[]; operations: MechanismOperation[]; fps?: number }

export interface ResolvedOperation extends MechanismOperation { start: number; end: number; from: number; target: number }

export interface MechanismPlan {
  id: string;
  fps: number;
  joints: ReadonlyMap<string, MechanismJoint>;
  operations: ResolvedOperation[];
  durationFrames: number;
  diagnostics: { code: string; severity: "error" | "warning" | "info"; message: string; operation?: string }[];
}

export interface JointState {
  /** rotate: radians; slide: units; declared/toggle: 0..1; spin: phase in radians. */
  value: number;
  /** For spin joints: the current real rpm (not the visual rate). */
  rpm?: number;
  moving: boolean;
}

export interface MechanismFrame {
  joints: Record<string, JointState>;
  /** Operations in progress at this frame. */
  active: string[];
  /** Labels of active operations (or of the last finished one). */
  labels: string[];
}

const rangeOf = (j: MechanismJoint): [number, number] => (j.motion.type === "rotate" || j.motion.type === "slide" ? [j.motion.range[0], j.motion.range[1]] : [0, 1]);

/** Resolve dependencies, rest values, limits and per-joint ordering. */
export function compileMechanism(spec: MechanismSpec): MechanismPlan {
  const diagnostics: MechanismPlan["diagnostics"] = [];
  const joints = new Map<string, MechanismJoint>();
  for (const j of spec.joints) {
    if (joints.has(j.id)) throw new Error(`Mechanism "${spec.id}": joint "${j.id}" is declared twice.`);
    joints.set(j.id, j);
    if (j.motion.type === "spin" && (j.motion.visualScale ?? 1) !== 1) {
      diagnostics.push({ code: "spin-scaled", severity: "info", message: `"${j.label ?? j.id}" spins at ${Math.round((j.motion.visualScale ?? 1) * 100)}% of its real ${j.motion.rpm} rpm on screen (to avoid strobing); the real rate is reported.` });
    }
  }
  const ops = new Map<string, MechanismOperation>();
  for (const o of spec.operations) {
    if (ops.has(o.id)) throw new Error(`Mechanism "${spec.id}": operation "${o.id}" is declared twice.`);
    if (!joints.has(o.joint)) throw new Error(`Mechanism "${spec.id}": operation "${o.id}" targets unknown joint "${o.joint}". Joints: ${[...joints.keys()].join(", ")}.`);
    ops.set(o.id, o);
  }
  // Start frames: explicit `at`, or the latest end of `after` dependencies (cycle-checked).
  const startOf = new Map<string, number>(), endOf = new Map<string, number>(), visiting = new Set<string>();
  const durationOf = (o: MechanismOperation) => {
    const j = joints.get(o.joint)!;
    if (j.motion.type === "spin") return o.duration ?? (o.to === "off" ? j.motion.spinDown ?? 30 : j.motion.spinUp ?? 30);
    return Math.max(0, o.duration ?? 24);
  };
  const resolve = (id: string): number => {
    if (endOf.has(id)) return endOf.get(id)!;
    if (visiting.has(id)) throw new Error(`Mechanism "${spec.id}": operation dependency cycle through "${id}".`);
    visiting.add(id);
    const o = ops.get(id);
    if (!o) throw new Error(`Mechanism "${spec.id}": unknown operation "${id}" in after.`);
    const deps = o.after === undefined ? [] : Array.isArray(o.after) ? o.after : [o.after];
    const s = deps.length ? Math.max(...deps.map(resolve)) + (o.delay ?? 0) : (o.at ?? 0) + (o.delay ?? 0);
    if (!deps.length && o.at === undefined) diagnostics.push({ code: "operation-unscheduled", severity: "warning", operation: id, message: `"${id}" has neither at nor after; it starts at frame 0.` });
    startOf.set(id, s);
    endOf.set(id, s + durationOf(o));
    visiting.delete(id);
    return endOf.get(id)!;
  };
  for (const id of ops.keys()) resolve(id);
  // Per joint, in time order: from-values chain and limits.
  const resolved: ResolvedOperation[] = [];
  const byJoint = new Map<string, MechanismOperation[]>();
  for (const o of ops.values()) byJoint.set(o.joint, [...(byJoint.get(o.joint) ?? []), o]);
  for (const [jid, list] of byJoint) {
    const j = joints.get(jid)!, [lo, hi] = rangeOf(j);
    list.sort((a, b) => startOf.get(a.id)! - startOf.get(b.id)!);
    let cur = j.rest ?? (j.motion.type === "rotate" || j.motion.type === "slide" ? lo : 0), prevEnd = -Infinity;
    for (const o of list) {
      const start = startOf.get(o.id)!, end = endOf.get(o.id)!;
      if (start < prevEnd) diagnostics.push({ code: "operation-overlap", severity: "error", operation: o.id, message: `"${o.id}" starts at ${start} while another operation on "${jid}" runs until ${prevEnd}; the later one wins.` });
      let target: number;
      if (o.to === "on" || o.to === "open") target = 1;
      else if (o.to === "off" || o.to === "close") target = 0;
      else target = o.to;
      if ((o.to === "open" || o.to === "close") && j.motion.type !== "declared") diagnostics.push({ code: "operation-kind", severity: "warning", operation: o.id, message: `"${o.id}" uses ${o.to} on a ${j.motion.type} joint; treated as ${target}.` });
      if (target < lo - 1e-9 || target > hi + 1e-9) {
        diagnostics.push({ code: "joint-limit", severity: "error", operation: o.id, message: `"${o.id}" asks "${jid}" for ${target}, outside its range [${lo}, ${hi}]; clamped.` });
        target = Math.max(lo, Math.min(hi, target));
      }
      resolved.push({ ...o, start, end, from: cur, target });
      cur = target; prevEnd = end;
    }
  }
  resolved.sort((a, b) => a.start - b.start || a.id.localeCompare(b.id));
  return { id: spec.id, fps: spec.fps ?? 30, joints, operations: resolved, durationFrames: Math.max(0, ...resolved.map((o) => o.end)), diagnostics };
}

/** Integral of a spin joint's angular speed (rad/frame, visual) from frame 0 to `frame`, plus the current rpm. */
function spinPhase(plan: MechanismPlan, j: MechanismJoint & { motion: { type: "spin" } }, ops: ResolvedOperation[], frame: number) {
  const radPerFramePerRpm = (2 * Math.PI) / 60 / plan.fps * (j.motion.visualScale ?? 1);
  // Piecewise-linear rpm: constant between operations, linear ramps during them; integrate exactly.
  let phase = 0, rpm = (j.rest ?? 0) > 0.5 ? j.motion.rpm : 0, t = 0;
  for (const o of ops) {
    const a = Math.min(frame, Math.max(t, o.start));
    phase += rpm * (a - t) * radPerFramePerRpm;
    t = a;
    if (frame <= o.start) return { phase, rpm };
    const target = o.target > 0.5 ? j.motion.rpm : 0, span = Math.max(1e-9, o.end - o.start);
    const e = Math.min(frame, o.end), from = rpm;
    const rE = from + (target - from) * ((e - t) / span);
    phase += ((from + rE) / 2) * (e - t) * radPerFramePerRpm;
    t = e;
    if (frame < o.end) return { phase, rpm: rE };
    rpm = target;
  }
  phase += rpm * Math.max(0, frame - t) * radPerFramePerRpm;
  return { phase, rpm };
}

/** Joint values at an absolute frame. Pure. */
export function evaluateMechanism(plan: MechanismPlan, frame: number): MechanismFrame {
  const joints: Record<string, JointState> = {};
  const active: string[] = [];
  let lastLabel: string | undefined;
  for (const o of plan.operations) {
    if (frame >= o.start && frame < o.end) active.push(o.id);
    if (frame >= o.end && o.label) lastLabel = o.label;
  }
  for (const [id, j] of plan.joints) {
    const ops = plan.operations.filter((o) => o.joint === id);
    if (j.motion.type === "spin") {
      const { phase, rpm } = spinPhase(plan, j as MechanismJoint & { motion: { type: "spin" } }, ops, frame);
      joints[id] = { value: phase, rpm, moving: rpm > 0.5 };
      continue;
    }
    const [lo] = rangeOf(j);
    let value = j.rest ?? (j.motion.type === "rotate" || j.motion.type === "slide" ? lo : 0), moving = false;
    for (const o of ops) {
      if (frame < o.start) break;
      if (frame >= o.end) { value = o.target; continue; }
      const t = (frame - o.start) / Math.max(1e-9, o.end - o.start);
      value = o.from + (o.target - o.from) * evaluateEasing(o.easing ?? "ease-in-out-cubic", t);
      moving = true;
      break;
    }
    joints[id] = { value, moving };
  }
  const labels = plan.operations.filter((o) => active.includes(o.id) && o.label).map((o) => o.label!);
  return { joints, active, labels: labels.length ? labels : lastLabel ? [lastLabel] : [] };
}
