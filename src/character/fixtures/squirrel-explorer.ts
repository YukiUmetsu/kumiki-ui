/**
 * Squirrel explorer — a DEMO FIXTURE for the 2.5D character performance system.
 *
 * Not part of the installable registry: it exercises the portable character contract
 * (registry/character/definition.ts) with RASTER parts — a nested pivot rig, whole-face
 * variants, lip sync, blink, expressions, actions, idle motion, params and anchors — built
 * from user-supplied artwork.
 *
 * Art: body parts cropped from a user-supplied squirrel parts sheet, and twelve faces cropped
 * from a user-supplied face sheet (alpha untouched, neighbour pixels removed), composed to match
 * a user-supplied full-body reference. The licence of that artwork is UNCONFIRMED: the owner
 * must confirm it before this fixture or its PNGs are distributed. The PNGs live in
 * `./squirrel-assets/`; hosts resolve each logical `squirrel/<name>` uri through
 * `squirrelExplorerAssetFiles`.
 *
 * Faces: the head is ONE part whose variants are whole painted faces (ears included). The faces
 * share one canvas, registered to the neutral face by head silhouette; the speech faces (open,
 * o, grin) are nudged a further half of their eye offset, so a swap moves the eyes by at most
 * a few design px. Honest limits that follow:
 * - Lip sync swaps the WHOLE face, not a mouth layer: four mouth classes (closed, open, wide,
 *   round), hard cuts with no cross-fade (blending two faces would ghost the eyes), and while
 *   speech plays its faces replace the expression face and blinking pauses.
 * - Blink swaps to the closed-eyes face for six frames; its mouth is a gentle smile, so a blink
 *   during "sad" or "smug" briefly shows that smile.
 * - The neutral expression names the neutral face explicitly; without an expression variant on
 *   the mouth part, the evaluator shows the speech rest face and would hide the blink.
 * - No gaze (pupils are painted in), no separate ears (each face paints its own), no brows
 *   beyond what each face paints, no held props (the satchel is a child of the torso).
 * - No palette skins: raster pixels cannot be recoloured through palette keys (`skins: {}`).
 * - The laugh, giggle and content faces are available as variants but not mapped by default.
 *
 * Arm and tail poses come from a user-supplied pose atlas (pointing, open paw and fist side poses;
 * paws-together, paw-to-chin, fists-up and paws-up chest poses; curl, S and sweep tails). Side
 * poses are variants of `arm-left` / `arm-right`; chest poses must draw in front of the scarf, so
 * they live on `arm-left-front` / `arm-right-front` (empty by default; set the back arm to
 * `hidden` alongside). The right fist is the left fist mirrored. Actions select them through
 * phase variants: point shows the pointing arm, wave alternates open paw and fist, cheer runs
 * paws-together → fist pumps → open paws, and tail-flick shows the S tail at its apex. Drawing
 * swaps are hard cuts at phase boundaries; the tail swap visibly changes the silhouette.
 *
 * Conventions
 * - Design canvas 768 × 512. Every part is drawn at the size declared on its asset (design px,
 *   same aspect as its PNG); body parts are at half the sheet's pixel size, the faces at 0.54,
 *   the tail at 0.7 and the scarf at 0.38 to match the reference proportions. Placement was
 *   tuned by eye against rendered frames.
 * - A part's `rest` x/y is the offset of its top-left corner in its parent's asset pixels, and
 *   its `pivot` is in its own asset pixels (see `partLocalMatrix` in registry/character/evaluate).
 * - "left" / "right" in part ids are SCREEN sides. Rotation is degrees, clockwise on screen.
 */

import type { CharacterDefinition, CharacterImageAsset, CharacterProvenance } from "../../../registry/character/definition";
import { CHARACTER_SCHEMA_VERSION } from "../../../registry/character/definition";

const PROVENANCE: CharacterProvenance = {
  license: "user-supplied reference artwork; licence to be confirmed by the owner before distribution",
  source: "user-supplied squirrel parts sheet, face sheet and full-body reference",
};

/** Face names; each is asset `face-<name>` and head variant `<name>`. */
const FACES = ["neutral", "open", "o", "grin", "blink", "delighted", "quizzical", "smug", "sad", "laugh", "giggle", "content"] as const;
/** All faces share one registered 506 × 295 px canvas, drawn at 0.54. */
const FACE_SIZE = [273.24, 159.3] as const;

/** Body asset key → [design width, design height]. Each aspect equals its PNG's pixel aspect. */
const BODY_SIZES = {
  torso: [184, 170],
  // Arm and tail drawings are pivot-registered canvases: every arm drawing has its shoulder at
  // (150, 150) and every tail drawing its base at (500, 450), so variants swap in place. Side
  // poses are pre-rotated against their part's rest rotation so they read as drawn at rest;
  // chest poses (front parts, rest rotation 0) carry their elbow offset inside the canvas.
  "arm-left": [188, 260.5],
  "arm-left-point": [187.2, 250.4],
  "arm-left-open": [183.2, 234.8],
  "arm-left-fist": [186, 226.8],
  "arm-left-face": [196.8, 196.8],
  "arm-left-fist-up": [210.8, 207.2],
  "arm-left-paw-up": [202, 205.6],
  "arm-right": [212.5, 272],
  "arm-right-point": [191.2, 246],
  "arm-right-open": [221.6, 240.8],
  "arm-right-fist": [197.6, 224.4],
  "arm-right-together": [153.6, 242.8],
  "arm-right-fist-up": [157.2, 206],
  "arm-right-paw-up": [165.6, 205.6],
  tail: [683.2, 467.6],
  "tail-curl": [809.1, 519.3],
  "tail-s": [785.7, 520.2],
  "tail-sweep": [608, 476.8],
  empty: [1, 1],
  "foot-left": [81.5, 99],
  "foot-right": [78.5, 102.5],
  scarf: [247.38, 81.32],
  satchel: [210.5, 134.5],
} as const satisfies Record<string, readonly [number, number]>;

const SIZES: Record<string, readonly [number, number]> = {
  ...BODY_SIZES,
  ...Object.fromEntries(FACES.map((face) => [`face-${face}`, FACE_SIZE])),
};

function image(key: string): CharacterImageAsset {
  const [width, height] = SIZES[key];
  return { kind: "image", uri: `squirrel/${key}`, mediaType: "image/png", width, height, provenance: PROVENANCE };
}

const ASSET_KEYS = Object.keys(SIZES);

/** Logical uri → PNG file name relative to this module. Hosts turn these into URLs. */
export const squirrelExplorerAssetFiles: Record<string, string> = Object.fromEntries(
  ASSET_KEYS.map((key) => [`squirrel/${key}`, `squirrel-assets/${key}.png`]),
);

export const squirrelExplorerCharacter: CharacterDefinition = {
  schemaVersion: CHARACTER_SCHEMA_VERSION,
  characterId: "squirrel-explorer",
  revision: "r2",
  mode: "puppet-2.5d",
  design: { width: 768, height: 512 },
  channels: ["body", "head", "arms", "legs", "tail"],
  // Raster art has no palette-driven fills.
  palette: {},
  assets: Object.fromEntries(ASSET_KEYS.map((key) => [key, image(key)])),
  parts: [
    // Torso: root. Pivot at the bottom centre so idle breathing squashes from the feet.
    { id: "body", channel: "body", asset: "torso", pivot: { x: 92, y: 165 }, rest: { x: 385, y: 248 }, z: 10 },
    // Behind the torso: plume tail (parallax), feet, arms (shoulders tuck under the vest).
    {
      id: "tail", parent: "body", channel: "tail", asset: "tail",
      variants: { curl: "tail-curl", s: "tail-s", sweep: "tail-sweep" },
      pivot: { x: 500, y: 450 }, rest: { x: -475, y: -260, rotation: -21 }, z: 1, depth: 0.3,
    },
    { id: "foot-left", parent: "body", channel: "legs", asset: "foot-left", pivot: { x: 40, y: 10 }, rest: { x: 25, y: 130 }, z: 3 },
    { id: "foot-right", parent: "body", channel: "legs", asset: "foot-right", pivot: { x: 40, y: 10 }, rest: { x: 100, y: 128 }, z: 3 },
    {
      id: "arm-left", parent: "body", channel: "arms", asset: "arm-left",
      // Side poses. `hidden` while the matching front part draws a chest pose.
      variants: { point: "arm-left-point", open: "arm-left-open", fist: "arm-left-fist", hidden: "empty" },
      pivot: { x: 150, y: 150 }, rest: { x: -143, y: -118.5, rotation: 95, scaleX: 0.76, scaleY: 0.76 }, z: 5,
    },
    {
      id: "arm-right", parent: "body", channel: "arms", asset: "arm-right",
      variants: { point: "arm-right-point", open: "arm-right-open", fist: "arm-right-fist", hidden: "empty" },
      pivot: { x: 150, y: 150 }, rest: { x: -9, y: -95.3, rotation: -82, scaleX: 0.76, scaleY: 0.76 }, z: 5,
    },
    // In front of the torso: satchel on the left hip, scarf at the neck, chest poses, then the head.
    { id: "satchel", parent: "body", channel: "body", asset: "satchel", pivot: { x: 62, y: 40 }, rest: { x: -78, y: 50 }, z: 12 },
    { id: "scarf", parent: "body", channel: "body", asset: "scarf", pivot: { x: 124, y: 20 }, rest: { x: -32, y: -5 }, z: 14 },
    // Chest poses drawn in front of the scarf; empty by default so the rest pose is unchanged.
    // Same shoulder pivots as the arms. `together` is one drawing of both paws, on the right part.
    {
      id: "arm-left-front", parent: "body", channel: "arms", asset: "empty",
      variants: { face: "arm-left-face", "fist-up": "arm-left-fist-up", "paw-up": "arm-left-paw-up" },
      pivot: { x: 150, y: 150 }, rest: { x: -120, y: -105 }, z: 15,
    },
    {
      id: "arm-right-front", parent: "body", channel: "arms", asset: "empty",
      variants: { together: "arm-right-together", "fist-up": "arm-right-fist-up", "paw-up": "arm-right-paw-up" },
      pivot: { x: 150, y: 150 }, rest: { x: 8, y: -105 }, z: 15,
    },
    // Head: one part, whole-face variants. Pivot at the chin so tilts turn on the neck.
    {
      id: "head", parent: "body", channel: "head", asset: "face-neutral",
      variants: Object.fromEntries(FACES.map((face) => [face, `face-${face}`])),
      pivot: { x: 138.8, y: 150 }, rest: { x: -43.8, y: -131.4 }, z: 20,
    },
  ],
  anchors: {
    "focus-up": { at: { x: 480, y: 48 } },
    "held-object": { part: "arm-right", at: { x: 148, y: 252 } },
    "satchel-strap": { part: "satchel", at: { x: 125, y: 8 } },
  },
  poses: { neutral: {} },
  basePose: "neutral",
  actions: {
    // Arm drawings are pre-rotated for rest, so a variant shows as drawn at rotation 0 and the
    // phase rotations below are small swings around it. Variants swap at phase boundaries.
    point: {
      channel: "arms", blend: "override", priority: 2, takeover: "blend-out", blendOutFrames: 8,
      phases: [
        { name: "prepare", frames: 6, pose: { "arm-right": { rotation: 8 } } },
        { name: "act", frames: 10, pose: { "arm-right": { rotation: -4 } }, variants: { "arm-right": "point" }, easing: "ease-out-cubic" },
        { name: "hold", frames: 24, pose: { "arm-right": { rotation: -5 } }, variants: { "arm-right": "point" } },
        { name: "recover", frames: 12, pose: {} },
      ],
    },
    // Open paw and fist alternate while the raised forearm sways.
    wave: {
      channel: "arms", blend: "override", priority: 2, takeover: "cut",
      phases: [
        { name: "prepare", frames: 6, pose: { "arm-left": { rotation: 10 } }, variants: { "arm-left": "open" } },
        { name: "act", frames: 6, pose: { "arm-left": { rotation: -8 } }, variants: { "arm-left": "open" } },
        { name: "act", frames: 6, pose: { "arm-left": { rotation: 6 } }, variants: { "arm-left": "fist" } },
        { name: "act", frames: 6, pose: { "arm-left": { rotation: -8 } }, variants: { "arm-left": "open" } },
        { name: "act", frames: 6, pose: { "arm-left": { rotation: 6 } }, variants: { "arm-left": "fist" } },
        { name: "hold", frames: 8, pose: { "arm-left": { rotation: 0 } }, variants: { "arm-left": "open" } },
        { name: "recover", frames: 10, pose: {} },
      ],
    },
    // Paws clasped in anticipation, two fist pumps, then open paws. Chest poses draw on the
    // front parts while both side arms hide.
    cheer: {
      channel: "arms", blend: "override", priority: 2, takeover: "blend-out", blendOutFrames: 8,
      phases: [
        {
          name: "prepare", frames: 8, pose: { "arm-right-front": { y: 4 } },
          variants: { "arm-left": "hidden", "arm-right": "hidden", "arm-right-front": "together" },
        },
        {
          name: "act", frames: 6, pose: { "arm-left-front": { y: -8 }, "arm-right-front": { y: -8 } }, easing: "ease-out-back",
          variants: { "arm-left": "hidden", "arm-right": "hidden", "arm-left-front": "fist-up", "arm-right-front": "fist-up" },
        },
        {
          name: "act", frames: 5, pose: { "arm-left-front": { y: 0 }, "arm-right-front": { y: 0 } },
          variants: { "arm-left": "hidden", "arm-right": "hidden", "arm-left-front": "fist-up", "arm-right-front": "fist-up" },
        },
        {
          name: "act", frames: 6, pose: { "arm-left-front": { y: -8 }, "arm-right-front": { y: -8 } }, easing: "ease-out-back",
          variants: { "arm-left": "hidden", "arm-right": "hidden", "arm-left-front": "fist-up", "arm-right-front": "fist-up" },
        },
        {
          name: "hold", frames: 18, pose: { "arm-left-front": { y: -4 }, "arm-right-front": { y: -4 } },
          variants: { "arm-left": "hidden", "arm-right": "hidden", "arm-left-front": "paw-up", "arm-right-front": "paw-up" },
        },
        { name: "recover", frames: 10, pose: {} },
      ],
    },
    // One in-place step cycle (24 frames): each foot moves only in its own phases and slides back
    // to rest while the other foot steps. Cue it every 24 frames to keep walking; cue `bob` too.
    walk: {
      channel: "legs", blend: "override", priority: 1, takeover: "cut",
      phases: [
        { name: "act", frames: 6, pose: { "foot-left": { x: 3, y: -12, rotation: -6 } }, easing: "ease-out-quad" },
        { name: "act", frames: 6, pose: { "foot-left": { x: 2, y: 0 } }, easing: "ease-in-quad" },
        { name: "act", frames: 6, pose: { "foot-right": { x: 3, y: -12, rotation: 6 } }, easing: "ease-out-quad" },
        { name: "recover", frames: 6, pose: {}, easing: "ease-in-quad" },
      ],
    },
    // Additive body bob matched to `walk`: the body rises as a foot lifts and dips as it plants.
    bob: {
      channel: "body", blend: "additive", priority: 1, takeover: "cut",
      phases: [
        { name: "act", frames: 6, pose: { body: { y: -2 } } },
        { name: "act", frames: 4, pose: { body: { y: 1.5 } } },
        { name: "act", frames: 2, pose: { body: { y: 0 } } },
        { name: "act", frames: 6, pose: { body: { y: -2 } } },
        { name: "act", frames: 4, pose: { body: { y: 1.5 } } },
        { name: "recover", frames: 2, pose: {} },
      ],
    },
    // Override (not additive) because only override actions may swap variants: the S-shaped
    // tail shows at the apex. During the flick it replaces the idle tail sway.
    "tail-flick": {
      channel: "tail", blend: "additive", priority: 1, takeover: "cut",
      phases: [
        { name: "act", frames: 5, pose: { tail: { rotation: 4 } } },
        { name: "hold", frames: 4, pose: { tail: { rotation: 4 } }, variants: { tail: "s" } },
        { name: "act", frames: 6, pose: { tail: { rotation: -4 } } },
        { name: "recover", frames: 6, pose: {} },
      ],
    },
  },
  expressions: {
    default: "neutral",
    sets: {
      // Explicit so the blink face can show while silent (see the header).
      neutral: { variants: { head: "neutral" } },
      curious: { variants: { head: "quizzical" } },
      delighted: { variants: { head: "delighted" } },
      smug: { variants: { head: "smug" } },
      sad: { variants: { head: "sad" } },
    },
  },
  speech: {
    mouthPart: "head",
    rest: "neutral",
    // Whole-face mouth classes. Hard cuts: cross-fading two painted faces would ghost the eyes.
    visemes: { closed: "neutral", open: "open", wide: "grin", round: "o" },
    approximateCycle: ["open", "o", "neutral", "grin", "open", "neutral"],
    transitionFrames: 0,
    approximateStepFrames: 4,
  },
  blink: { parts: ["head"], variant: "blink", intervalFrames: { min: 80, max: 180 }, durationFrames: 6 },
  idle: {
    parts: {
      body: { property: "scaleY", amplitude: 0.014, periodFrames: 100 },
      tail: { property: "rotation", amplitude: 1.5, periodFrames: 130 },
    },
  },
  params: {
    tailSize: { min: 0.92, max: 1.12, default: 1, targets: [{ part: "tail", property: "scale", weight: 0.6 }] },
    headTilt: { min: -6, max: 6, default: 0, targets: [{ part: "head", property: "rotation", weight: 1 }] },
  },
  // Raster parts cannot be recoloured through palette keys, so no skins are offered.
  skins: {},
  capabilities: ["puppet-2.5d", "nested-pivots", "variants", "expressions", "actions", "speech-visemes", "blink", "idle", "params", "anchors", "raster-assets"],
};
