/** Three.js rig for `MechanismSequence`: applies joint values to an asset's pivot objects.
 *
 * Rest transforms are captured at creation. Rotations, spins and slides act about
 * or along the pivot's local axis over that rest. `declared` joints read the
 * pivot's own `userData.motion` ({ type, axis: "x"|"y"|"z", amount }), the
 * home-kit convention for doors and drawers. Toggles show or hide the pivot, or
 * scale the emissive intensity of its materials (`userData.onIntensity`, default 1).
 * Missing pivots throw at creation, listing what is available.
 */
import { Quaternion, Vector3 } from "three";
import type { Material, Mesh, Object3D } from "three";
import { evaluateMechanism } from "./mechanism-sequence";
import type { MechanismFrame, MechanismPlan } from "./mechanism-sequence";

export interface MechanismRig {
  apply(frame: number): MechanismFrame;
  /** Restore every pivot's rest transform, visibility and emissive levels. */
  reset(): void;
}

type Emissive = Material & { emissiveIntensity?: number };

export function createMechanismRig(parts: ReadonlyMap<string, Object3D>, plan: MechanismPlan, options: { toggles?: Record<string, "visible" | "emissive"> } = {}): MechanismRig {
  const missing = [...plan.joints.keys()].filter((id) => !parts.has(id));
  if (missing.length) throw new Error(`Mechanism "${plan.id}": no pivot for ${missing.join(", ")}. Parts include: ${[...parts.keys()].slice(0, 24).join(", ")}${parts.size > 24 ? "…" : ""}.`);
  const rest = new Map<string, { position: Vector3; quaternion: Quaternion; visible: boolean }>();
  const emissive = new Map<string, { material: Emissive; on: number; off: number }[]>();
  for (const [id, j] of plan.joints) {
    const o = parts.get(id)!;
    rest.set(id, { position: o.position.clone(), quaternion: o.quaternion.clone(), visible: o.visible });
    if (j.motion.type === "declared" && !o.userData.motion) throw new Error(`Mechanism "${plan.id}": "${id}" has no declared userData.motion.`);
    if (j.motion.type === "toggle" && (options.toggles?.[id] ?? "emissive") === "emissive") {
      const list: { material: Emissive; on: number; off: number }[] = [];
      o.traverse((c) => {
        const mats = (c as Mesh).isMesh ? ([] as Material[]).concat((c as Mesh).material) : [];
        for (const m of mats as Emissive[]) if (m.emissiveIntensity !== undefined) list.push({ material: m, on: (m.userData.onIntensity as number | undefined) ?? Math.max(1, m.emissiveIntensity), off: m.emissiveIntensity });
      });
      emissive.set(id, list);
    }
  }
  const axisOf = (a: readonly [number, number, number] | "x" | "y" | "z") => (typeof a === "string" ? new Vector3(a === "x" ? 1 : 0, a === "y" ? 1 : 0, a === "z" ? 1 : 0) : new Vector3(...a).normalize());
  const q = new Quaternion();
  return {
    apply(frame: number) {
      const f = evaluateMechanism(plan, frame);
      for (const [id, j] of plan.joints) {
        const o = parts.get(id)!, r = rest.get(id)!, v = f.joints[id].value;
        o.position.copy(r.position); o.quaternion.copy(r.quaternion);
        const m = j.motion;
        if (m.type === "rotate" || m.type === "spin") o.quaternion.multiply(q.setFromAxisAngle(axisOf(m.axis), v));
        else if (m.type === "slide") o.position.addScaledVector(axisOf(m.axis).applyQuaternion(r.quaternion), v);
        else if (m.type === "declared") {
          const d = o.userData.motion as { type: "rotate" | "slide"; axis: "x" | "y" | "z"; amount: number };
          if (d.type === "rotate") o.quaternion.multiply(q.setFromAxisAngle(axisOf(d.axis), d.amount * v));
          else o.position.addScaledVector(axisOf(d.axis).applyQuaternion(r.quaternion), d.amount * v);
        } else if (m.type === "toggle") {
          if ((options.toggles?.[id] ?? "emissive") === "visible") o.visible = v > 0.5;
          else for (const e of emissive.get(id) ?? []) e.material.emissiveIntensity = e.off + (e.on - e.off) * v;
        }
      }
      return f;
    },
    reset() {
      for (const [id, r] of rest) { const o = parts.get(id)!; o.position.copy(r.position); o.quaternion.copy(r.quaternion); o.visible = r.visible; }
      for (const list of emissive.values()) for (const e of list) e.material.emissiveIntensity = e.off;
    },
  };
}
