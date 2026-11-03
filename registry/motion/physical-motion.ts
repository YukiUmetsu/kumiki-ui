/**
 * PM1: deterministic, unit-aware physical motion for authored video shots.
 * Analytic, frame-independent paths (not a general rigid-body simulator):
 * gravity/contact/restitution, damped springs, small-angle pendulums, drag,
 * flat-surface Coulomb sliding and ideal no-slip rolling.
 * All positions are meters, time is seconds, rotations are local radians.
 */
import { springValue } from "./springs";

export type PhysicalVec3 = readonly [number, number, number];
export type PhysicalTarget = string | readonly string[];
export type PhysicalPivot = PhysicalVec3 | string;
export interface PhysicalCommon { target: PhysicalTarget; startFrame?: number }
export type PhysicalMotion =
  | (PhysicalCommon & { kind: "drop"; height: number; gravity?: number; restitution?: number; settleSpeed?: number })
  | (PhysicalCommon & { kind: "spring"; offset: PhysicalVec3; mass?: number; stiffness?: number; damping?: number })
  | (PhysicalCommon & { kind: "pendulum"; axis: PhysicalVec3; pivot?: PhysicalPivot; angleDeg: number;
      lengthMeters: number; gravity?: number; dampingRatio?: number })
  | (PhysicalCommon & { kind: "spin"; axis: PhysicalVec3; pivot?: PhysicalPivot;
      angularVelocityDegPerSec: number; drag?: number })
  | (PhysicalCommon & { kind: "slide"; direction: PhysicalVec3; speedMps: number;
      frictionCoefficient?: number; gravity?: number })
  | (PhysicalCommon & { kind: "roll"; direction: PhysicalVec3; speedMps: number;
      radiusMeters: number; rollingResistance?: number; gravity?: number });

export interface PhysicalActionSpec {
  schemaVersion: 1;
  id: string;
  label?: string;
  /** Reference frames at 30 fps, like HeroActionSpec. One-shots hold their last frame. */
  durationFrames: number;
  /** Optional imported glTF clip played before applying the physical offsets. */
  sourceActionId?: string;
  motions: readonly PhysicalMotion[];
}

export interface PhysicalMotionSample {
  /** World-space displacement, meters; preserves Blender's Y-up convention. */
  translation: PhysicalVec3;
  /** Rotation about a normalized local axis, or a shared world pivot if supplied. */
  angleRad: number;
}

export interface PhysicalImpactEvent {
  kind: "impact";
  target: PhysicalTarget;
  timeSeconds: number;
  /** Fractional timeline frame, useful for precise SFX sync. */
  frame: number;
  speedMps: number;
}

const referenceRate = 30;
const idPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,100}$/;
function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  return value as Record<string, unknown>;
}
function number(value: unknown, name: string, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max)
    throw new Error(`${name} must be finite between ${min} and ${max}.`);
  return value;
}
function optional(value: unknown, name: string, fallback: number, min: number, max: number): number {
  return value === undefined ? fallback : number(value, name, min, max);
}
function identifier(value: unknown, name: string): string {
  if (typeof value !== "string" || !idPattern.test(value)) throw new Error(`${name} must be a safe part/action identifier.`);
  return value;
}
function vector(value: unknown, name: string, limit = 100): PhysicalVec3 {
  if (!Array.isArray(value) || value.length !== 3) throw new Error(`${name} must be a 3D vector.`);
  return [number(value[0], `${name}[0]`, -limit, limit), number(value[1], `${name}[1]`, -limit, limit),
    number(value[2], `${name}[2]`, -limit, limit)];
}
function axis(value: unknown, name: string): PhysicalVec3 {
  const v = vector(value, name, 1e3), magnitude = Math.hypot(...v);
  if (magnitude < 1e-6) throw new Error(`${name} must not be zero.`);
  return [v[0] / magnitude, v[1] / magnitude, v[2] / magnitude];
}
/** Unit horizontal travel vector in the canonical Y-up scene. */
function groundDirection(value: unknown, name: string): PhysicalVec3 {
  const v = vector(value, name, 1e3);
  if (Math.abs(v[1]) > 1e-6) throw new Error(`${name} must lie on the horizontal XZ plane (Y-up).`);
  const magnitude = Math.hypot(v[0], v[2]);
  if (magnitude < 1e-6) throw new Error(`${name} must not be zero.`);
  return [v[0] / magnitude, 0, v[2] / magnitude];
}
function target(value: unknown, name: string): PhysicalTarget {
  if (typeof value === "string") return identifier(value, name);
  if (!Array.isArray(value) || value.length === 0 || value.length > 64) throw new Error(`${name} requires 1–64 part IDs/roles.`);
  const ids = value.map((v, i) => identifier(v, `${name}[${i}]`));
  if (new Set(ids).size !== ids.length) throw new Error(`${name} has duplicate roles/IDs.`);
  return ids;
}

/** Atomically validate portable, JSON-serializable action plans before touching Three.js. */
export function validatePhysicalActionSpecs(value: unknown): PhysicalActionSpec[] {
  if (!Array.isArray(value) || value.length > 32) throw new Error("Physical actions must be an array of at most 32 actions.");
  const ids = new Set<string>();
  return value.map((raw, i) => {
    const p = record(raw, `actions[${i}]`), id = identifier(p.id, `actions[${i}].id`);
    if (p.schemaVersion !== 1) throw new Error(`Physical action "${id}" requires schemaVersion 1.`);
    if (ids.has(id)) throw new Error(`Duplicate physical action ID "${id}".`);
    ids.add(id);
    const durationFrames = number(p.durationFrames, `${id}.durationFrames`, 1, 3600);
    if (!Number.isInteger(durationFrames)) throw new Error(`${id}.durationFrames must be an integer frame count.`);
    if (!Array.isArray(p.motions) || p.motions.length === 0 || p.motions.length > 32)
      throw new Error(`${id}.motions requires 1–32 physical tracks.`);
    const motions = p.motions.map((entry, index): PhysicalMotion => {
      const m = record(entry, `${id}.motions[${index}]`), kind = m.kind;
      const label = `${id}.motions[${index}]`;
      const common = { target: target(m.target, `${label}.target`), startFrame: optional(m.startFrame, `${label}.startFrame`, 0, 0, durationFrames) };
      if (!Number.isInteger(common.startFrame)) throw new Error(`${label}.startFrame must be an integer frame.`);
      if (kind === "drop") return { kind, ...common,
        height: number(m.height, `${label}.height`, 0.001, 20),
        gravity: optional(m.gravity, `${label}.gravity`, 9.81, 0.1, 100),
        restitution: optional(m.restitution, `${label}.restitution`, .35, 0, .95),
        settleSpeed: optional(m.settleSpeed, `${label}.settleSpeed`, .04, .001, 5),
      };
      if (kind === "spring") return { kind, ...common,
        offset: vector(m.offset, `${label}.offset`, 10),
        mass: optional(m.mass, `${label}.mass`, 1, .01, 2000),
        stiffness: optional(m.stiffness, `${label}.stiffness`, 140, .01, 100_000),
        damping: optional(m.damping, `${label}.damping`, 20, 0, 100_000),
      };
      if (kind === "slide") return { kind, ...common,
        direction: groundDirection(m.direction, `${label}.direction`),
        speedMps: number(m.speedMps, `${label}.speedMps`, .001, 50),
        frictionCoefficient: optional(m.frictionCoefficient, `${label}.frictionCoefficient`, .35, 0, 2),
        gravity: optional(m.gravity, `${label}.gravity`, 9.81, .1, 100),
      };
      if (kind === "roll") return { kind, ...common,
        direction: groundDirection(m.direction, `${label}.direction`),
        speedMps: number(m.speedMps, `${label}.speedMps`, .001, 50),
        radiusMeters: number(m.radiusMeters, `${label}.radiusMeters`, .001, 100),
        rollingResistance: optional(m.rollingResistance, `${label}.rollingResistance`, .025, 0, 2),
        gravity: optional(m.gravity, `${label}.gravity`, 9.81, .1, 100),
      };
      const pivot = m.pivot === undefined ? undefined : typeof m.pivot === "string"
        ? identifier(m.pivot, `${label}.pivot`) : vector(m.pivot, `${label}.pivot`, 1000);
      if (kind === "pendulum") return { kind, ...common, pivot, axis: axis(m.axis, `${label}.axis`),
        angleDeg: number(m.angleDeg, `${label}.angleDeg`, -30, 30),
        lengthMeters: number(m.lengthMeters, `${label}.lengthMeters`, .01, 100),
        gravity: optional(m.gravity, `${label}.gravity`, 9.81, .1, 100),
        dampingRatio: optional(m.dampingRatio, `${label}.dampingRatio`, .15, 0, 3),
      };
      if (kind === "spin") return { kind, ...common, pivot, axis: axis(m.axis, `${label}.axis`),
        angularVelocityDegPerSec: number(m.angularVelocityDegPerSec, `${label}.angularVelocityDegPerSec`, -3600, 3600),
        drag: optional(m.drag, `${label}.drag`, 1.5, 0, 100),
      };
      throw new Error(`${label}.kind must be drop, spring, pendulum, spin, slide, or roll.`);
    });
    if (p.label !== undefined && (typeof p.label !== "string" || !p.label.trim() || p.label.length > 100))
      throw new Error(`${id}.label must be short nonempty text.`);
    return { schemaVersion: 1, id, durationFrames, motions,
      ...(p.sourceActionId === undefined ? {} : { sourceActionId: identifier(p.sourceActionId, `${id}.sourceActionId`) }),
      ...(p.label === undefined ? {} : { label: p.label as string }),
    };
  });
}

/** A single physical path sampled at arbitrary time since action start (seconds). */
export function samplePhysicalMotion(motion: PhysicalMotion, timeSeconds: number): PhysicalMotionSample {
  if (!Number.isFinite(timeSeconds) || timeSeconds < 0) throw new Error("Physical motion time must be nonnegative and finite.");
  const t = Math.max(0, timeSeconds - (motion.startFrame ?? 0) / referenceRate);
  if (motion.kind === "slide" || motion.kind === "roll") {
    // Constant dry-friction deceleration from a specified initial surface
    // speed. Stop at zero velocity: there is no backwards acceleration or
    // numerical overshoot from varying the requested rendering frame rate.
    const mu = motion.kind === "slide" ? (motion.frictionCoefficient ?? .35)
      : (motion.rollingResistance ?? .025);
    const deceleration = mu * (motion.gravity ?? 9.81);
    const stopAt = deceleration > 0 ? motion.speedMps / deceleration : Infinity;
    const elapsed = Math.min(t, stopAt);
    const distance = Math.max(0, motion.speedMps * elapsed - .5 * deceleration * elapsed * elapsed);
    return { translation: motion.direction.map(v => v * distance) as unknown as PhysicalVec3,
      angleRad: motion.kind === "roll" ? distance / motion.radiusMeters : 0 };
  }
  if (motion.kind === "drop") {
    const height = motion.height, gravity = motion.gravity ?? 9.81;
    const restitution = motion.restitution ?? .35, stop = motion.settleSpeed ?? .04;
    const first = Math.sqrt(2 * height / gravity);
    let y = Math.max(0, height - gravity * t * t / 2);
    if (t >= first) {
      let at = first, speed = Math.sqrt(2 * gravity * height);
      y = 0;
      for (let impact = 0; impact < 128; impact++) {
        speed *= restitution;
        if (speed < stop) break;
        const duration = 2 * speed / gravity;
        if (t < at + duration) { const local = t - at; y = Math.max(0, speed * local - gravity * local * local / 2); break; }
        at += duration;
      }
    }
    return { translation: [0, y, 0], angleRad: 0 };
  }
  if (motion.kind === "spring") {
    const factor = 1 - springValue(t, { mass: motion.mass ?? 1,
      stiffness: motion.stiffness ?? 140, damping: motion.damping ?? 20 });
    return { translation: motion.offset.map(v => v * factor) as unknown as PhysicalVec3, angleRad: 0 };
  }
  if (motion.kind === "pendulum") {
    const omega = Math.sqrt((motion.gravity ?? 9.81) / motion.lengthMeters);
    const factor = 1 - springValue(t, { mass: 1, stiffness: omega * omega,
      damping: 2 * (motion.dampingRatio ?? .15) * omega });
    return { translation: [0, 0, 0], angleRad: motion.angleDeg * Math.PI / 180 * factor };
  }
  const radians = motion.angularVelocityDegPerSec * Math.PI / 180;
  const drag = motion.drag ?? 1.5;
  return { translation: [0, 0, 0], angleRad: drag === 0 ? radians * t : radians * -Math.expm1(-drag * t) / drag };
}

/** Deterministic impact schedule for shot SFX and contact visuals. */
export function impactEventsForPhysicalAction(action: PhysicalActionSpec, fps = referenceRate): PhysicalImpactEvent[] {
  if (!Number.isFinite(fps) || fps <= 0 || fps > 240) throw new Error("Impact event fps must be in (0, 240].");
  const events: PhysicalImpactEvent[] = [];
  for (const motion of action.motions) {
    if (motion.kind !== "drop") continue;
    const g = motion.gravity ?? 9.81, r = motion.restitution ?? .35, threshold = motion.settleSpeed ?? .04;
    const end = action.durationFrames / referenceRate;
    let at = (motion.startFrame ?? 0) / referenceRate + Math.sqrt(2 * motion.height / g);
    let speed = Math.sqrt(2 * motion.height * g);
    for (let i = 0; i < 128 && at <= end; i++) {
      events.push({ kind: "impact", target: motion.target, timeSeconds: at, frame: at * fps, speedMps: speed });
      speed *= r;
      if (speed < threshold) break;
      at += 2 * speed / g;
    }
  }
  return events.sort((a, b) => a.timeSeconds - b.timeSeconds);
}
