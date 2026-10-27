/**
 * Pipkin Sprig (Pip): registered sprite fixture imported from the user-provided
 * Pip Animated Rig v1.6 Complete/Rebuilt ZIP. Storybook-only, not a registry preset.
 *
 * The ZIP's `rig.json` supplies a 1440×900 stage, shared landmark pivots and
 * back-to-front ordering. This fixture uniformly halves those design coordinates
 * (the presenter uses a 768×576 viewBox); its 25 mouth sprites stay registered
 * to the same unchanging head image. Both arm variant families are technically
 * padded to a shared 500px shoulder frame by scripts/assemble-pip-v1-6-assets.mjs.
 * No source illustrations are redrawn by the importer.
 *
 * IMPORTANT: Artwork usage rights must be confirmed by its owner before
 * distributing these demonstration assets in a published library package.
 */
import type { CharacterDefinition, CharacterImageAsset, CharacterProvenance } from "../../../registry/character/definition";
import { CHARACTER_SCHEMA_VERSION } from "../../../registry/character/definition";

const PROVENANCE: CharacterProvenance = {
  license: "user-supplied Pip pre-rig art and edited v1.6 drawings; external illustration rights must be confirmed by the owner",
  source: "Pip Animated Rig v1.6 Complete/Rebuilt ZIP, rig.json and registered assets/pip",
};

type Sprite = { filename: string; width: number; height: number };
const sprites: Record<string, Sprite> = {
  torso: { filename: "torso", width: 225, height: 175 },
  tail: { filename: "tail", width: 295, height: 285 },
  "leg-left": { filename: "leg_left", width: 65.5, height: 82.5 },
  "leg-right": { filename: "leg_right", width: 65.5, height: 82.5 },
  "head-blank": { filename: "head_blank", width: 285, height: 148 },
  scarf: { filename: "scarf", width: 280, height: 89 },
  "satchel-shoulderstrap": { filename: "satchel_shoulderstrap", width: 210, height: 131.5 },
};

// These are exactly the 7 registered major mouth stages and the 18 inbetweens
// from the v1.6 ZIP, ordered from closed to fully open. All are mouth-only PNGs.
const mouthFrameNames = [
  "mouth_stage_0",
  ...Array.from({ length: 6 }, (_, index) => [
    ...Array.from({ length: 3 }, (_, offset) => `mouth_inbetween_${index}_${index + 1}_${offset + 1}`),
    `mouth_stage_${index + 1}`,
  ]).flat(),
];
for (const [index, filename] of mouthFrameNames.entries()) {
  sprites[`mouth-${index}`] = { filename, width: 285, height: 148 };
}

for (const side of ["left", "right"] as const) {
  for (const variant of ["relaxed", "point", "wave", "open", "ask"] as const) {
    sprites[`arm-${variant}-${side}`] = { filename: `arm_${variant}_${side}`, width: 250, height: 250 };
  }
}

function image(key: string): CharacterImageAsset {
  const sprite = sprites[key];
  if (!sprite) throw new Error(`Pip v1.6 has no registered sprite '${key}'.`);
  return {
    kind: "image", uri: `pip/${key}`, mediaType: "image/png",
    width: sprite.width, height: sprite.height, provenance: PROVENANCE,
  };
}

/** Logical asset URI → imported fixture PNG, resolved by Storybook's glob. */
export const pipAssetFiles: Record<string, string> = Object.fromEntries(
  Object.entries(sprites).map(([key, sprite]) => [`pip/${key}`, `pip-assets-v1-6/${sprite.filename}.png`]),
);

const mouthVariants = Object.fromEntries(mouthFrameNames.map((_, index) => [`stage-${index}`, `mouth-${index}`]));

export const pipCharacter: CharacterDefinition = {
  schemaVersion: CHARACTER_SCHEMA_VERSION,
  characterId: "pip",
  revision: "r1",
  mode: "puppet-2.5d",
  design: { width: 768, height: 576 },
  channels: ["body", "head", "arms", "legs", "tail"],
  palette: {},
  assets: Object.fromEntries(Object.keys(sprites).map(key => [key, image(key)])),
  parts: [
    // Renderer registration: torso_center (900,630), origin (225,160), region (450,350).
    { id: "body", channel: "body", asset: "torso", pivot: { x: 112.5, y: 80 }, rest: { x: 337.5, y: 235 }, z: 10 },
    // v1.6 tail_base.x=838 includes the approved +120px move; do not mirror the tail.
    { id: "tail", parent: "body", channel: "tail", asset: "tail", pivot: { x: 239.5, y: 242.5 },
      rest: { x: -158, y: -125, rotation: -7 }, z: 1, depth: 0.3 },
    { id: "leg-left", parent: "body", channel: "legs", asset: "leg-left", pivot: { x: 33, y: 4.5 },
      rest: { x: 19.5, y: 120.5 }, z: 2 },
    { id: "leg-right", parent: "body", channel: "legs", asset: "leg-right", pivot: { x: 33, y: 4.5 },
      rest: { x: 129.5, y: 120.5 }, z: 2 },
    // (250,250) on all normalized arms = proximal shoulder; sleeves hide behind torso.
    { id: "arm-left", parent: "body", channel: "arms", asset: "arm-relaxed-left",
      variants: { point: "arm-point-left", wave: "arm-wave-left", open: "arm-open-left", question: "arm-ask-left" },
      pivot: { x: 125, y: 125 }, rest: { x: -97.5, y: -62 }, z: 4 },
    { id: "arm-right", parent: "body", channel: "arms", asset: "arm-relaxed-right",
      variants: { point: "arm-point-right", wave: "arm-wave-right", open: "arm-open-right", question: "arm-ask-right" },
      pivot: { x: 125, y: 125 }, rest: { x: 81.5, y: -62 }, z: 4 },
    { id: "satchel", parent: "body", channel: "body", asset: "satchel-shoulderstrap",
      pivot: { x: 0, y: 0 }, rest: { x: -73, y: 54 }, z: 12 },
    { id: "head", parent: "body", channel: "head", asset: "head-blank", pivot: { x: 142.5, y: 130 },
      rest: { x: -29, y: -118.5 }, z: 20 },
    // Mouth and face are co-registered to the neck; head motion carries both.
    { id: "mouth", parent: "head", channel: "head", asset: "mouth-0", variants: mouthVariants,
      pivot: { x: 142.5, y: 130 }, rest: { x: 0, y: 0 }, z: 21 },
    { id: "scarf", parent: "body", channel: "body", asset: "scarf", pivot: { x: 140, y: 37 },
      rest: { x: -26.5, y: 4.5 }, z: 22 },
  ],
  anchors: {
    "focus-up": { at: { x: 445, y: 85 } },
    "held-object": { part: "arm-right", at: { x: 150, y: 140 } },
    "satchel-strap": { part: "satchel", at: { x: 0, y: 0 } },
  },
  poses: { neutral: {} },
  basePose: "neutral",
  actions: {
    // Outward swing feet: left and right never cross one another's positions.
    walk: { channel: "legs", blend: "override", priority: 1, takeover: "cut", phases: [
      { name: "act", frames: 6, pose: { "leg-left": { x: -5, y: -14, rotation: -3 } }, easing: "ease-out-cubic" },
      { name: "act", frames: 6, pose: { "leg-left": { x: 0, y: 0 } }, easing: "ease-in-cubic" },
      { name: "act", frames: 6, pose: { "leg-right": { x: 5, y: -14, rotation: 3 } }, easing: "ease-out-cubic" },
      { name: "recover", frames: 6, pose: {}, easing: "ease-in-cubic" },
    ] },
    bob: { channel: "body", blend: "additive", priority: 1, takeover: "cut", phases: [
      { name: "act", frames: 6, pose: { body: { y: -2 } } },
      { name: "act", frames: 6, pose: { body: { y: 2 } } },
      { name: "act", frames: 6, pose: { body: { y: -2 } } },
      { name: "recover", frames: 6, pose: {} },
    ] },
    point: { channel: "arms", blend: "override", priority: 2, takeover: "blend-out", blendOutFrames: 6, phases: [
      { name: "prepare", frames: 8, pose: { "arm-right": { rotation: 8 } } },
      { name: "act", frames: 8, pose: { "arm-right": { rotation: 3 } }, variants: { "arm-right": "point" }, easing: "ease-out-cubic" },
      { name: "hold", frames: 22, pose: { "arm-right": { rotation: 3 } }, variants: { "arm-right": "point" } },
      { name: "recover", frames: 10, pose: { "arm-right": { rotation: 68 } }, variants: { "arm-right": "point" } },
    ] },
    wave: { channel: "arms", blend: "override", priority: 2, takeover: "cut", phases: [
      { name: "prepare", frames: 7, pose: { "arm-right": { rotation: 67 } }, variants: { "arm-right": "wave" } },
      { name: "act", frames: 7, pose: { "arm-right": { rotation: 12 } }, variants: { "arm-right": "wave" } },
      { name: "act", frames: 7, pose: { "arm-right": { rotation: -8 } }, variants: { "arm-right": "wave" } },
      { name: "hold", frames: 7, pose: { "arm-right": { rotation: 8 } }, variants: { "arm-right": "wave" } },
      { name: "recover", frames: 10, pose: { "arm-right": { rotation: 68 } }, variants: { "arm-right": "wave" } },
    ] },
    question: { channel: "arms", blend: "override", priority: 2, takeover: "blend-out", blendOutFrames: 6, phases: [
      { name: "prepare", frames: 8, pose: { "arm-right": { rotation: 5 } } },
      { name: "act", frames: 8, pose: { "arm-right": { rotation: 1 } }, variants: { "arm-right": "question" }, easing: "ease-out-cubic" },
      { name: "hold", frames: 20, pose: { "arm-right": { rotation: 2 } }, variants: { "arm-right": "question" } },
      { name: "recover", frames: 8, pose: { "arm-right": { rotation: 65 } }, variants: { "arm-right": "question" } },
    ] },
    cheer: { channel: "arms", blend: "override", priority: 2, takeover: "blend-out", blendOutFrames: 8, phases: [
      { name: "prepare", frames: 6, pose: { "arm-left": { rotation: -40 }, "arm-right": { rotation: 40 } }, variants: { "arm-left": "open", "arm-right": "open" } },
      { name: "act", frames: 6, pose: { "arm-left": { rotation: 0 }, "arm-right": { rotation: 0 } }, variants: { "arm-left": "open", "arm-right": "open" }, easing: "ease-out-cubic" },
      { name: "hold", frames: 18, pose: { "arm-left": { rotation: -3 }, "arm-right": { rotation: 3 } }, variants: { "arm-left": "open", "arm-right": "open" } },
      { name: "recover", frames: 8, pose: { "arm-left": { rotation: -70 }, "arm-right": { rotation: 70 } }, variants: { "arm-left": "open", "arm-right": "open" } },
    ] },
    "tail-flick": { channel: "tail", blend: "additive", priority: 1, takeover: "cut", phases: [
      { name: "act", frames: 6, pose: { tail: { rotation: 4 } } },
      { name: "hold", frames: 4, pose: { tail: { rotation: 4 } } },
      { name: "act", frames: 6, pose: { tail: { rotation: -4 } } },
      { name: "recover", frames: 6, pose: {} },
    ] },
  },
  expressions: {
    default: "neutral",
    sets: {
      neutral: {}, curious: { pose: { head: { rotation: 2 } } },
      delighted: { pose: { head: { rotation: -2 } } },
      sleepy: { pose: { head: { rotation: 1 } } },
      happy: { pose: { head: { rotation: -1 } } },
      sad: { pose: { head: { rotation: 3 } } },
    },
  },
  speech: {
    mouthPart: "mouth", rest: "stage-0",
    visemes: Object.fromEntries(mouthFrameNames.map((_, index) => [`stage-${index}`, `stage-${index}`]).concat([
      ["closed", "stage-0"], ["open", "stage-12"], ["wide", "stage-24"], ["round", "stage-16"],
    ])),
    // Authored rhythm for this Storybook demo, not timing aligned to a narration track.
    approximateCycle: [
      "stage-0", "stage-2", "stage-6", "stage-10", "stage-6", "stage-1", "stage-0",
      "stage-3", "stage-9", "stage-16", "stage-23", "stage-13", "stage-5", "stage-0",
    ],
    transitionFrames: 1, approximateStepFrames: 2,
  },
  idle: {
    parts: {
      body: { property: "scaleY", amplitude: 0.004, periodFrames: 100 },
      tail: { property: "rotation", amplitude: 3.2, periodFrames: 130 },
      head: { property: "rotation", amplitude: 1.2, periodFrames: 110 },
    },
  },
  params: {
    tailSize: { min: 0.92, max: 1.12, default: 1, targets: [{ part: "tail", property: "scale", weight: 0.6 }] },
    headTilt: { min: -6, max: 6, default: 0, targets: [{ part: "head", property: "rotation", weight: 1 }] },
  },
  skins: {},
  capabilities: [
    "puppet-2.5d", "nested-pivots", "variants", "expressions", "actions",
    "speech-visemes", "idle", "params", "anchors", "raster-assets", "walk-cycle",
  ],
};
