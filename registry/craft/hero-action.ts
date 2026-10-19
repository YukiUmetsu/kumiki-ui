import { Euler, Quaternion, Vector3 } from "three";
import type { Object3D } from "three";

/** Deterministic, frame-addressed actions for hero assets.
 *
 * An action is a pure function of (action id, local frame, fps): no clocks,
 * no accumulated state, so any frame can be rendered in any order for export.
 * Durations are authored at a 30 fps reference and scale to other rates.
 */

export interface HeroActionSpec {
  id: string;
  label: string;
  /** Length at 30 fps; loops repeat with this period. */
  durationFrames: number;
  loop: boolean;
  /** What the viewer should understand from it (for agents choosing actions). */
  meaning: string;
}

export interface HeroActionState {
  /** Action id, or null for the rest pose. */
  id: string | null;
  /** Frames since the action started (may exceed duration; one-shots hold their end). */
  frame: number;
  fps?: number;
}

export const REFERENCE_FPS = 30;

/** Normalized time t ∈ [0, 1] (one-shot) or cycle phase (loop) for an action at a frame. */
export function actionTime(spec: HeroActionSpec, frame: number, fps = REFERENCE_FPS): number {
  if (!Number.isFinite(frame) || !(fps > 0)) throw new Error("Hero action needs a finite frame and positive fps.");
  const local = Math.max(0, frame) * REFERENCE_FPS / fps / spec.durationFrames;
  return spec.loop ? local - Math.floor(local) : Math.min(1, local);
}

export function findAction(actions: readonly HeroActionSpec[], id: string): HeroActionSpec {
  const spec = actions.find(a => a.id === id);
  if (!spec) throw new Error(`Unknown hero action "${id}". Available: ${actions.map(a => a.id).join(", ") || "none"}.`);
  return spec;
}

// ---------------------------------------------------------------- curves

export const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
export const smooth = (t: number) => { const x = clamp01(t); return x * x * (3 - 2 * x); };
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);
export const easeInCubic = (t: number) => Math.pow(clamp01(t), 3);
export const easeInOut = (t: number) => { const x = clamp01(t); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
/** Window: 0 before `a`, eased to 1 by `b`. */
export const window01 = (t: number, a: number, b: number) => smooth((t - a) / (b - a));
/** Rise over [a,b], hold, fall over [c,d]. */
export const pulse = (t: number, a: number, b: number, c: number, d: number) => window01(t, a, b) * (1 - window01(t, c, d));
/** Analytic damped spring response from 0 → 1 (overshoots then settles). */
export const spring = (t: number, frequency = 3, damping = .35) => {
  if (t <= 0) return 0;
  const w = frequency * Math.PI * 2;
  return 1 - Math.exp(-damping * w * t) * Math.cos(w * Math.sqrt(1 - damping * damping) * t);
};
/** Ballistic drop from height h landing at tLand, with a decaying bounce. */
export const dropBounce = (t: number, tLand: number, h: number, bounce = .22) => {
  if (t <= 0) return h;
  if (t < tLand) { const u = t / tLand; return h * (1 - u * u); }
  const u = (t - tLand) / Math.max(1e-6, 1 - tLand);
  return Math.abs(Math.sin(u * Math.PI * 2.5)) * h * bounce * Math.exp(-u * 5);
};
export const TAU = Math.PI * 2;

// ---------------------------------------------------------------- object poses

export interface RestPose {
  /** Restore every captured object to its rest transform and visibility. */
  restore(): void;
  /** Rest transform of an object (throws if it was not captured). */
  of(object: Object3D): { position: Vector3; quaternion: Quaternion; scale: Vector3; visible: boolean };
}

/** Snapshot transforms so pose functions can stay pure: restore, then apply this frame. */
export function captureRest(objects: readonly Object3D[]): RestPose {
  const snaps = new Map(objects.map(o => [o, {
    position: o.position.clone(), quaternion: o.quaternion.clone(), scale: o.scale.clone(), visible: o.visible,
  }]));
  return {
    restore() {
      for (const [o, s] of snaps) { o.position.copy(s.position); o.quaternion.copy(s.quaternion); o.scale.copy(s.scale); o.visible = s.visible; }
    },
    of(object) {
      const s = snaps.get(object);
      if (!s) throw new Error(`Object "${object.name}" has no captured rest pose.`);
      return s;
    },
  };
}

const scratchQ = new Quaternion(), scratchE = new Euler();
/** Apply a local (object-space) XYZ Euler rotation on top of a rest quaternion. */
export function rotateLocal(object: Object3D, rest: Quaternion, x: number, y: number, z: number) {
  object.quaternion.copy(rest).multiply(scratchQ.setFromEuler(scratchE.set(x, y, z)));
}
