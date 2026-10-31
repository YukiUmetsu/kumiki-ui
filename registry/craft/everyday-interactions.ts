/** Pure, frame-addressable physical handoffs for craft/scene compositions.
 * World units are the caller's declared 3D units; no wall-clock or deltas.
 */
import type { Vec3 } from "./sdf-sculpt";
import { smooth } from "./hero-action";

export interface EverydayInteraction {
  from: readonly [number, number, number];
  to: readonly [number, number, number];
  startFrame: number;
  endFrame: number;
  /** Extra vertical clearance at mid-flight, in the same units as positions. */
  clearance?: number;
  /** An authored yaw change, radians. */
  fromYaw?: number;
  toYaw?: number;
}

export interface EverydayInteractionPose {
  position: Vec3;
  yaw: number;
  progress: number;
}

export function evaluateEverydayInteraction(spec: EverydayInteraction, frame: number): EverydayInteractionPose {
  if (!Number.isFinite(frame)) throw new Error("Everyday interaction requires a finite frame.");
  if (!Number.isFinite(spec.startFrame) || !Number.isFinite(spec.endFrame) ||
      spec.endFrame <= spec.startFrame) throw new Error("endFrame must be after a finite startFrame.");
  for (const value of [...spec.from, ...spec.to, spec.clearance ?? 0, spec.fromYaw ?? 0, spec.toYaw ?? 0]) {
    if (!Number.isFinite(value)) throw new Error("Everyday interaction positions and rotations must be finite.");
  }
  if ((spec.clearance ?? 0) < 0) throw new Error("clearance cannot be negative.");
  const t = smooth((frame - spec.startFrame) / (spec.endFrame - spec.startFrame));
  const arch = t <= 0 || t >= 1 ? 0 : Math.sin(Math.PI * t) * (spec.clearance ?? 0);
  return {
    position: [
      spec.from[0] + (spec.to[0] - spec.from[0]) * t,
      spec.from[1] + (spec.to[1] - spec.from[1]) * t + arch,
      spec.from[2] + (spec.to[2] - spec.from[2]) * t,
    ],
    yaw: (spec.fromYaw ?? 0) + ((spec.toYaw ?? 0) - (spec.fromYaw ?? 0)) * t,
    progress: t,
  };
}
