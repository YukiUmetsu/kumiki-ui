/** ShotBake v1: every frame of one shot, resolved, for an offline renderer.
 *
 * Joins InteractionPlan, the character evaluator and CC1 into one JSON document.
 * The renderer applies these values and decides no timing, so preview and final
 * output share one clock. Space is Y-up metres, angles on parts are degrees.
 * CC1 uses Three.js math, so run this offline, not in a video export bundle.
 */
import { evaluateCharacter } from "../character/evaluate";
import type { CharacterCue, CharacterDefinition, CharacterInstance, CharacterPartState } from "../character/definition";
import { createCameraTargetRegistry } from "./camera-targets";
import { evaluateCameraPose3D } from "./camera-pose-3d";
import { compileCinematicCamera } from "./cinematic-camera-director";
import type { CameraBounds3D, CameraDiagnostic, CameraSequenceSpec, CameraTarget, CameraVector3 } from "./cinematic-camera-types";
import { evaluateInteraction } from "./interaction-choreography";
import type { InteractionContact, InteractionPlan, Vec3 } from "./interaction-choreography";
import type { RationalFps } from "./types";

export type BakedPartState = Omit<CharacterPartState, "variantFrom" | "variantMix"> & { yaw?: number; pitch?: number };
export interface ShotBakeV1 {
  schema_version: 1;
  fps: RationalFps;
  duration_frames: number;
  camera: { position: Vec3[]; orientation: (readonly [number, number, number, number])[]; fov: number[]; focus_distance: number[] };
  objects: Record<string, { position: Vec3[]; orientation: (readonly [number, number, number, number])[]; bend: number[] }>;
  actors: Record<string, {
    root: { position: Vec3[]; yaw: number[] };
    parts: Record<string, BakedPartState>[];
    effectors: Record<string, { position: Vec3[]; influence: number[] }>;
  }>;
  lights: Record<string, number[]>;
  contacts: InteractionContact[];
}
export interface ShotBakeActor {
  id: string;
  definition: CharacterDefinition;
  instance: CharacterInstance;
  cues: readonly CharacterCue[];
  /** Part that takes the 3D head turn. */
  headPart?: string;
}
export interface LightKey { frame: number; level: number }
export interface ShotBakeInput {
  id: string;
  width: number;
  height: number;
  interaction: InteractionPlan;
  actors: readonly ShotBakeActor[];
  camera: CameraSequenceSpec;
  /** Extra camera subjects, for example a printed number on a page. */
  targets?: readonly CameraTarget[];
  lights?: Record<string, readonly LightKey[]>;
}
export type ShotBakeDiagnostic = { severity: "error"; code: string; message: string } | CameraDiagnostic;
export type ShotBakeResult = { ok: true; bake: ShotBakeV1; diagnostics: ShotBakeDiagnostic[] } | { ok: false; diagnostics: ShotBakeDiagnostic[] };

const box = (center: Vec3, half: Vec3): CameraBounds3D => ({
  min: [center[0] - half[0], center[1] - half[1], center[2] - half[2]],
  max: [center[0] + half[0], center[1] + half[1], center[2] + half[2]],
});

/** Moving camera subjects for each actor, object and held object, one sample per frame. */
export function interactionCameraTargets(plan: InteractionPlan, objectRadius = .05): CameraTarget[] {
  const frames = plan.frames;
  const targets: CameraTarget[] = plan.spec.objects.map(object => ({
    id: object.id,
    frames: frames.map((state, frame) => ({ frame, bounds: box(state.objects[object.id].position, [objectRadius, objectRadius, objectRadius]) })),
  }));
  for (const actor of plan.spec.actors) {
    const half = actor.height / 2;
    targets.push({
      id: actor.id,
      frames: frames.map((state, frame) => {
        const [x, y, z] = state.actors[actor.id].position;
        const center: CameraVector3 = [x, y + half, z];
        return { frame, bounds: box(center, [half * .6, half, half * .4]) };
      }),
    });
  }
  return targets;
}

function quaternion(yaw: number, pitch: number): readonly [number, number, number, number] {
  const cy = Math.cos(yaw / 2), sy = Math.sin(yaw / 2), cp = Math.cos(pitch / 2), sp = Math.sin(pitch / 2);
  return [cy * sp, sy * cp, -sy * sp, cy * cp];
}

function lightLevel(keys: readonly LightKey[], frame: number): number {
  const sorted = [...keys].sort((a, b) => a.frame - b.frame);
  if (frame <= sorted[0].frame) return sorted[0].level;
  const next = sorted.findIndex(key => key.frame >= frame);
  if (next < 0) return sorted[sorted.length - 1].level;
  const from = sorted[next - 1], to = sorted[next];
  const t = (frame - from.frame) / (to.frame - from.frame);
  return from.level + (to.level - from.level) * t;
}

export function bakeShot(input: ShotBakeInput): ShotBakeResult {
  const { interaction } = input;
  const frames = interaction.spec.durationFrames;
  const fail = (code: string, message: string): ShotBakeResult => ({ ok: false, diagnostics: [{ severity: "error", code, message }] });
  if (input.camera.durationFrames !== frames)
    return fail("duration-mismatch", `Camera has ${input.camera.durationFrames} frames, shot has ${frames}.`);
  const known = new Set(interaction.spec.actors.map(actor => actor.id));
  for (const actor of input.actors) if (!known.has(actor.id)) return fail("unknown-actor", `Actor ${actor.id} is not in the interaction.`);
  const registry = createCameraTargetRegistry({
    revision: input.id, targets: [...interactionCameraTargets(interaction), ...(input.targets ?? [])],
  });
  const compiled = compileCinematicCamera(input.camera, registry);
  if (!compiled.ok) return { ok: false, diagnostics: compiled.diagnostics };
  const cameraId = input.camera.cameraId ?? "camera3d";
  const bake: ShotBakeV1 = {
    schema_version: 1, fps: interaction.spec.fps, duration_frames: frames,
    camera: { position: [], orientation: [], fov: [], focus_distance: [] },
    objects: Object.fromEntries(interaction.spec.objects.map(object => [object.id, { position: [], orientation: [], bend: [] }])),
    actors: Object.fromEntries(input.actors.map(actor => [actor.id, {
      root: { position: [], yaw: [] }, parts: [],
      effectors: Object.fromEntries(Object.keys(interaction.spec.actors.find(item => item.id === actor.id)!.effectors)
        .map(name => [name, { position: [], influence: [] }])),
    }])),
    lights: Object.fromEntries(Object.entries(input.lights ?? {}).map(([name, keys]) =>
      [name, Array.from({ length: frames }, (_, frame) => lightLevel(keys, frame))])),
    contacts: [...interaction.contacts],
  };
  for (let frame = 0; frame < frames; frame++) {
    const state = evaluateInteraction(interaction, frame);
    const pose = evaluateCameraPose3D(compiled.plan.timeline, frame, cameraId);
    if (pose.projection.kind !== "perspective") return fail("projection", "ShotBake v1 needs a perspective camera.");
    bake.camera.position.push(pose.position);
    bake.camera.orientation.push(pose.orientation);
    bake.camera.fov.push(pose.projection.fov);
    bake.camera.focus_distance.push(pose.focusDistance);
    for (const [id, object] of Object.entries(state.objects)) {
      const channel = bake.objects[id];
      channel.position.push(object.position);
      channel.orientation.push(quaternion(object.yaw, object.pitch));
      channel.bend.push(object.bend);
    }
    for (const actor of input.actors) {
      const channel = bake.actors[actor.id];
      const placed = state.actors[actor.id];
      channel.root.position.push(placed.position);
      channel.root.yaw.push(placed.yaw);
      const evaluated = evaluateCharacter(actor.definition, actor.instance, actor.cues, frame);
      const parts: Record<string, BakedPartState> = {};
      for (const [partId, part] of Object.entries(evaluated.parts)) {
        const { x, y, rotation, scaleX, scaleY, variant } = part;
        parts[partId] = { x, y, rotation, scaleX, scaleY, ...(variant ? { variant } : {}) };
      }
      if (actor.headPart && parts[actor.headPart])
        parts[actor.headPart] = { ...parts[actor.headPart], yaw: placed.turn.yaw, pitch: placed.turn.pitch };
      channel.parts.push(parts);
      for (const [name, track] of Object.entries(channel.effectors)) {
        const effector = state.effectors[`${actor.id}.${name}`];
        track.position.push(effector.position);
        track.influence.push(effector.influence);
      }
    }
  }
  return { ok: true, bake, diagnostics: compiled.diagnostics };
}

export function serializeShotBake(bake: ShotBakeV1): string {
  return JSON.stringify(bake);
}

export function parseShotBake(json: string): ShotBakeV1 {
  const parsed = JSON.parse(json) as ShotBakeV1;
  if (parsed.schema_version !== 1) throw new Error("Only ShotBake schema_version 1 is supported.");
  return parsed;
}
