/** An IP packet is not a physical capsule. This cue represents a short burst
 * of encoded signal propagating through an illustrated network link.
 * The camera target remains "hero-packet" for existing CC1/MG1 consumers.
 */
import { AdditiveBlending, Group, Mesh, MeshBasicMaterial, SphereGeometry, Vector3 } from "three";
import type { BufferGeometry, Material } from "three";
import { evaluateTimeline, outputKey } from "../../registry/motion/timeline";
import type { MotionTimeline, Vec2 } from "../../registry/motion/types";
import { JOURNEY_POINTS } from "./journey-content";

export interface JourneySignalPulse {
  root: Group;
  update(frame: number): void;
}

export function createJourneySignalPulse(
  timeline: MotionTimeline,
  geometry: <T extends BufferGeometry>(value: T) => T,
  registerMaterial: <T extends Material>(value: T) => T,
): JourneySignalPulse {
  const root = new Group();
  root.name = "hero-packet"; // Semantic target is a signal, not a fictional object.
  const bodyGeometry = geometry(new SphereGeometry(1, 20, 12));
  const core = registerMaterial(new MeshBasicMaterial({ color: "#f1fcf7", toneMapped: false }));
  const amber = registerMaterial(new MeshBasicMaterial({ color: "#e9a665", transparent: true,
    opacity: .78, depthWrite: false, blending: AdditiveBlending, toneMapped: false }));
  const halo = registerMaterial(new MeshBasicMaterial({ color: "#69e5db", transparent: true,
    opacity: .14, depthWrite: false, blending: AdditiveBlending, toneMapped: false }));
  const make = (material: Material, scale: number) => {
    const mesh = new Mesh(bodyGeometry, material);
    mesh.scale.setScalar(scale);
    root.add(mesh);
    return mesh;
  };
  const bright = make(core, .082);
  const highlight = make(amber, .124);
  const ambience = make(halo, .19);
  const trails = Array.from({ length: 5 }, (_, i) => {
    const transparency = registerMaterial(new MeshBasicMaterial({ color: i % 2 ? "#79dfdc" : "#edbd83",
      transparent: true, opacity: .26 * (1 - i / 5), depthWrite: false, blending: AdditiveBlending,
      toneMapped: false }));
    return make(transparency, .086 - i * .011);
  });
  const location = (frame: number) => {
    const sample = evaluateTimeline(timeline, Math.max(0, frame));
    const offset = sample.samples[outputKey("hero-packet", "offset")]?.value as Vec2 | undefined;
    const z = sample.samples[outputKey("hero-packet", "depth")]?.value;
    return new Vector3(offset?.x ?? JOURNEY_POINTS.sender[0], offset?.y ?? JOURNEY_POINTS.sender[1],
      typeof z === "number" ? z : JOURNEY_POINTS.sender[2]);
  };
  function update(frame: number) {
    const at = location(frame);
    // Relative offsets are calculated by random-access frame evaluation, never from
    // the previous browser render. Scrubbing backward gives identical results.
    const behind = location(Math.max(0, frame - 10));
    const tangent = at.clone().sub(behind);
    if (tangent.lengthSq() < 1e-7) tangent.set(1, 0, 0);
    tangent.normalize();
    const orientation = new Vector3(0, 0, 1).angleTo(tangent);
    const tilt = new Vector3().crossVectors(new Vector3(0, 0, 1), tangent);
    const quaternion = tilt.lengthSq() > 1e-7
      ? root.quaternion.clone().setFromAxisAngle(tilt.normalize(), orientation)
      : root.quaternion.clone().identity();
    // The viewport positions the root from its MG1 samples. Trails stay local.
    root.quaternion.copy(quaternion);
    bright.position.set(0, 0, 0);
    highlight.position.set(0, 0, 0);
    ambience.position.set(0, 0, 0);
    for (let i = 0; i < trails.length; i++) {
      const point = location(Math.max(0, frame - (i + 1) * 3));
      // world-space history converted into pulse-local coordinates
      trails[i].position.copy(point.sub(at).applyQuaternion(quaternion.clone().invert()));
    }
  }
  return { root, update };
}
