/** Storybook-only choreography. The library presenter itself remains clock-free. */
import type { CharacterCue, CharacterDefinition } from "../../registry/character/definition";

export const DEMO_FPS = 30;
export const DEMO_LOOP_FRAMES = 264;

export type DemoCharacter = "quill" | "pip";

export const QUILL_BEAK_STAGES = [
  "closed",
  ...Array.from({ length: 6 }, (_, index) => [
    `between_${index}_${index + 1}_25`,
    `between_${index}_${index + 1}_50`,
    `between_${index}_${index + 1}_75`,
    `open_${index + 1}`,
  ]).flat(),
] as const;

/** Pip v1.6 head stays fixed; 25 separate transparent mouth overlays open in 1/4 steps. */
export const PIP_MOUTH_STAGES = Array.from({ length: 25 }, (_, index) => `stage-${index}`);

export function pipMouthSweep(instanceId: string, from = 0, framesPerStep = 2): CharacterCue[] {
  const path = [...PIP_MOUTH_STAGES, ...PIP_MOUTH_STAGES.slice(0, -1).reverse()];
  return path.map((viseme, index) => ({
    id: `${instanceId}-mouth-${from}-${index}`,
    instanceId, kind: "viseme", startFrame: from + index * framesPerStep,
    endFrame: from + (index + 1) * framesPerStep,
    viseme, precision: "exact",
  }));
}

/** Includes every authored beak stage on the way up and back down. No audio alignment claimed. */
export function quillBeakSweep(instanceId: string, from = 0, framesPerStep = 2): CharacterCue[] {
  const path = [...QUILL_BEAK_STAGES, ...QUILL_BEAK_STAGES.slice(0, -1).reverse()];
  return path.map((viseme, index) => ({
    id: `${instanceId}-beak-${from}-${index}`,
    instanceId,
    kind: "viseme",
    startFrame: from + index * framesPerStep,
    endFrame: from + (index + 1) * framesPerStep,
    viseme,
    precision: "exact",
  }));
}

export function actionFrames(definition: CharacterDefinition, name: string): number {
  return definition.actions[name]?.phases.reduce((total, phase) => total + Math.max(1, phase.frames), 0) ?? 0;
}

export function repeatAction(definition: CharacterDefinition, instanceId: string, name: string, from: number, cycles: number): CharacterCue[] {
  const duration = actionFrames(definition, name);
  if (!duration) return [];
  return Array.from({ length: cycles }, (_, index) => ({
    id: `${instanceId}-${name}-${from}-${index}`,
    instanceId,
    kind: "action" as const,
    startFrame: from + duration * index,
    name,
  }));
}

/** The fixture has two walk tracks: legs and a matched body bob, both 24 frames. */
export function forwardWalkCues(definition: CharacterDefinition, instanceId: string, from: number, cycles: number): CharacterCue[] {
  if (!actionFrames(definition, "walk") || actionFrames(definition, "walk") !== actionFrames(definition, "bob")) {
    throw new Error(`Walk and bob durations must match for ${definition.characterId}.`);
  }
  return [
    ...repeatAction(definition, instanceId, "walk", from, cycles),
    ...repeatAction(definition, instanceId, "bob", from, cycles),
  ];
}

const QUILL_WALK = { start: 60, end: 132 };
const PIP_WALK = { start: 0, end: 72 };

/** Frontal art: apparent approach uses depth/scale, never a sideways screen-space slide. */
export function approachScale(character: DemoCharacter, frame: number, start?: number, end?: number): number {
  const walk = character === "quill" ? QUILL_WALK : PIP_WALK;
  const from = start ?? walk.start;
  const to = end ?? walk.end;
  if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) return 1;
  const progress = Math.max(0, Math.min(1, (frame - from) / (to - from)));
  const eased = progress * progress * (3 - 2 * progress);
  return 0.82 + 0.18 * eased;
}

/** Conceals the camera reset between repeated, front-facing approach demonstrations. */
export function loopOpacity(frame: number): number {
  if (frame < 10) return frame / 10;
  if (frame >= DEMO_LOOP_FRAMES - 12) return Math.max(0, (DEMO_LOOP_FRAMES - frame) / 12);
  return 1;
}

export function demoActivity(character: DemoCharacter, frame: number): string {
  if (character === "quill") {
    if (frame < 60) return "Speaking · articulated beak";
    if (frame < 132) return "Walking toward the viewer";
    if (frame < 184) return "Pointing with one wing";
    if (frame < 190) return "Settling";
    if (frame < 212) return "Nodding";
    return "Resting";
  }
  if (frame < 72) return "Walking toward the viewer";
  if (frame < 78) return "Settling";
  if (frame < 138) return "Speaking · approximate mouth cues";
  if (frame < 142) return "Listening";
  if (frame < 186) return "Asking a question · one paw raised";
  if (frame < 192) return "Settling";
  if (frame < 230) return "Cheering";
  return "Resting";
}

export function showcaseCues(definition: CharacterDefinition, character: DemoCharacter): CharacterCue[] {
  const instanceId = character === "quill" ? "owl" : "squirrel";
  if (character === "quill") return [
    { id: "quill-speaking", instanceId, kind: "speech", startFrame: 0, endFrame: 60, precision: "approximate" },
    ...forwardWalkCues(definition, instanceId, 60, 3),
    { id: "quill-point", instanceId, kind: "action", startFrame: 132, name: "point" },
    { id: "quill-nod", instanceId, kind: "action", startFrame: 190, name: "nod" },
    { id: "quill-curious", instanceId, kind: "expression", startFrame: 132, name: "curious" },
    { id: "quill-neutral", instanceId, kind: "expression", startFrame: 238, name: "neutral" },
  ];
  return [
    ...forwardWalkCues(definition, instanceId, 0, 3),
    { id: "pip-speaking", instanceId, kind: "speech", startFrame: 78, endFrame: 138, precision: "approximate" },
    { id: "pip-question", instanceId, kind: "action", startFrame: 142, name: "question" },
    { id: "pip-cheer", instanceId, kind: "action", startFrame: 192, name: "cheer" },
    { id: "pip-curious", instanceId, kind: "expression", startFrame: 142, name: "curious" },
    { id: "pip-delighted", instanceId, kind: "expression", startFrame: 192, name: "delighted" },
    { id: "pip-neutral", instanceId, kind: "expression", startFrame: 238, name: "neutral" },
  ];
}
