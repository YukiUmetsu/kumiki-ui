/**
 * Pip ("Pipkin Sprig") — a DEMO FIXTURE for the 2.5D character performance system.
 *
 * Not part of the installable registry. A puppet-2.5d raster rig built from the user-supplied
 * "Pip & Doc Quill" pre-rig art kit (`rig_parts/pip/`), placed by overlay against the kit's
 * full-body master (`rig_source/pip_master.png`). The licence of that artwork is UNCONFIRMED: the
 * owner must confirm it before this fixture or its PNGs are distributed. Hosts resolve each
 * logical `pip/<name>` uri through `pipAssetFiles` (PNGs in `./pip-assets/`).
 *
 * Art processing (copies only; the kit is untouched)
 * - Atlas neighbours removed: every connected alpha island that touches the crop edge and is not
 *   the part itself (bits of other sprites in the torso, satchel, scarf, legs, tails and faces).
 * - Edge halo: the inked drawings (all gesture arms, the three alternate tails, all twelve faces)
 *   had a light ring outside their ink line; that outermost ring is made transparent (isolated
 *   whisker lines are kept). The fur parts, satchel and scarf had no halo and keep their edges.
 * - Variant families are registered to one shared pivot by transparent padding (lossless).
 *   `arm-left-hold-up` is also mirrored (lossless) so its fist points outward from the left shoulder.
 * - Resampled once: the two default arms (mirrored and rotated so the elbow hangs below the
 *   shoulder-to-paw line, as in the master's open-arms pose) and the three alternate tails
 *   (rotated to the default tail's direction; `tail-swept` is also mirrored so it sweeps left).
 *
 * What is NOT done (honest limits)
 * - No separate ears or pupils: every face is a full-head replacement with baked eyes and ears, so
 *   the kit's ear and eyelid parts would duplicate features and are not used. No gaze.
 * - Speech swaps the whole face (four mouth classes: closed = neutral, open = talk, wide = grin,
 *   round = ah). Faces are registered halfway between silhouette and nose alignment because some
 *   kit faces are drawn slightly turned; a swap still moves the eyes/ears by a few design px, and
 *   the 2-frame cross-fade can ghost the eyes briefly. Blink pauses while speech plays.
 * - The kit's mouth overlays are not registered to any face and are not used.
 * - Pivots and placement are by overlay against the master only (no mesh, no skin weights). The
 *   kit's default arms are bent hanging arms, so the master's straight sleeves are matched at the
 *   shoulder and paw, not the elbow. The faces are front views on a 3/4 master head (eyes matched,
 *   head tilted 14°). The default tail is the kit's curl, not the master's tall plume.
 * - Gesture arms are forearm-and-paw drawings at a smaller scale than the default arms; their
 *   upper-arm stub tucks behind the torso's shoulder. Raised paws pass behind the scarf.
 * - No palette skins: raster pixels cannot be recoloured through palette keys (`skins: {}`).
 *
 * Conventions: design canvas 768 × 576 = master px × 0.5 + (20, 18). A part's `rest` x/y is the
 * offset of its top-left corner in its parent's asset px; `pivot` is in its own asset px (see
 * `partLocalMatrix`). "left"/"right" are SCREEN sides. Rotation is degrees, clockwise on screen.
 */

import type { CharacterDefinition, CharacterImageAsset, CharacterProvenance } from "../../../registry/character/definition";
import { CHARACTER_SCHEMA_VERSION } from "../../../registry/character/definition";

const PROVENANCE: CharacterProvenance = {
  license: "user-supplied pre-rig art kit; licence to be confirmed by the owner before distribution",
  source: "Pip & Doc Quill pre-rig art kit (rig_parts/pip), placed against rig_source/pip_master.png",
};

/** Face names; each is asset `face-<name>` and head variant `<name>`. */
const FACES = ["neutral", "talk", "surprise", "laugh", "ah", "grin", "blink", "sleepy", "smile", "skeptical", "happy", "worried"] as const;

/** Asset key → [design width, design height]; each aspect equals its PNG's pixel aspect. */
const SIZES = {
  torso: [231.4, 213.2],
  satchel: [175.87, 110.51],
  scarf: [303.52, 95.95],
  "leg-left": [90.6, 111.6],
  "leg-right": [87, 115.8],
  // Arm drawings share a pivot per side (the shoulder) through padding.
  "arm-left": [129.15, 130.05],
  "arm-left-point": [113.76, 89.28],
  "arm-left-wave": [114.48, 82.8],
  "arm-left-hold-up": [120.24, 78.48],
  "arm-left-spread": [118.44, 72],
  "arm-right": [122.46, 127.53],
  "arm-right-point": [119.52, 89.28],
  "arm-right-wave": [101.88, 80.64],
  "arm-right-spread": [65.88, 72],
  // Tail drawings share the tail base pivot.
  tail: [435, 464.25],
  "tail-curl-left": [452.55, 501.3],
  "tail-curl-right": [451.54, 494.05],
  "tail-swept": [429.39, 492.56],
  // Faces share the neck pivot.
  "face-neutral": [343.2, 198.77],
  "face-talk": [357.5, 200.2],
  "face-surprise": [351.07, 203.06],
  "face-laugh": [346.06, 204.49],
  "face-ah": [346.06, 203.77],
  "face-grin": [352.5, 200.2],
  "face-blink": [357.5, 193.05],
  "face-sleepy": [351.78, 190.91],
  "face-smile": [356.79, 193.05],
  "face-skeptical": [331.76, 189.48],
  "face-happy": [346.78, 196.63],
  "face-worried": [344.63, 190.91],
  empty: [1, 1],
} as const satisfies Record<string, readonly [number, number]>;

const ASSET_KEYS = Object.keys(SIZES) as (keyof typeof SIZES)[];

function image(key: keyof typeof SIZES): CharacterImageAsset {
  const [width, height] = SIZES[key];
  return { kind: "image", uri: `pip/${key}`, mediaType: "image/png", width, height, provenance: PROVENANCE };
}

/** Logical uri → PNG file name relative to this module. Hosts turn these into URLs. */
export const pipAssetFiles: Record<string, string> = Object.fromEntries(
  ASSET_KEYS.map((key) => [`pip/${key}`, `pip-assets/${key}.png`]),
);

export const pipCharacter: CharacterDefinition = {
  schemaVersion: CHARACTER_SCHEMA_VERSION,
  characterId: "pip",
  revision: "r1",
  mode: "puppet-2.5d",
  design: { width: 768, height: 576 },
  channels: ["body", "head", "arms", "legs", "tail"],
  // Raster art has no palette-driven fills.
  palette: {},
  assets: Object.fromEntries(ASSET_KEYS.map((key) => [key, image(key)])),
  parts: [
    // Torso: root. Pivot at the bottom centre so idle breathing squashes from the feet.
    { id: "body", channel: "body", asset: "torso", pivot: { x: 117, y: 211.25 }, rest: { x: 389, y: 281.75 }, z: 10 },
    // Behind the torso: tail (pivot at its base against the lower back), legs, arms.
    {
      id: "tail", parent: "body", channel: "tail", asset: "tail",
      variants: { "curl-left": "tail-curl-left", "curl-right": "tail-curl-right", swept: "tail-swept" },
      pivot: { x: 264.07, y: 433.14 }, rest: { x: -236.59, y: -268.51, rotation: -28 }, z: 1, depth: 0.3,
    },
    // Legs sit under the body's outer edges; the thighs tuck behind the belly and vest hem.
    { id: "leg-left", parent: "body", channel: "legs", asset: "leg-left", pivot: { x: 42, y: 15 }, rest: { x: -25.5, y: 127.75 }, z: 2 },
    { id: "leg-right", parent: "body", channel: "legs", asset: "leg-right", pivot: { x: 45, y: 15 }, rest: { x: 89.5, y: 124.75 }, z: 2 },
    // Arms: pivot at the shoulder joint under the torso's shoulder fur (the master's arm joints).
    {
      id: "arm-left", parent: "body", channel: "arms", asset: "arm-left",
      variants: { point: "arm-left-point", wave: "arm-left-wave", "hold-up": "arm-left-hold-up", spread: "arm-left-spread", hidden: "empty" },
      pivot: { x: 98.2, y: 60.4 }, rest: { x: -64.7, y: -29.15 }, z: 4,
    },
    {
      id: "arm-right", parent: "body", channel: "arms", asset: "arm-right",
      variants: { point: "arm-right-point", wave: "arm-right-wave", spread: "arm-right-spread", hidden: "empty" },
      pivot: { x: 30.64, y: 60.4 }, rest: { x: 175.36, y: -15.15 }, z: 4,
    },
    // In front of the torso: satchel on the left hip (pivot at the strap top), head, then scarf.
    { id: "satchel", parent: "body", channel: "body", asset: "satchel", pivot: { x: 169.85, y: 6.45 }, rest: { x: -67.77, y: 57.6, rotation: 7.5 }, z: 12 },
    // Head: one part whose variants are whole faces. Pivot at the neck; tilted to the master's 3/4 head.
    {
      id: "head", parent: "body", channel: "head", asset: "face-neutral",
      variants: Object.fromEntries(FACES.map((face) => [face, `face-${face}`])),
      pivot: { x: 189.76, y: 194.77 }, rest: { x: -71, y: -214.32, rotation: 14 }, z: 20,
    },
    // Scarf on the body (not the head), drawn over the neck seam so head tilts stay hidden.
    { id: "scarf", parent: "body", channel: "body", asset: "scarf", pivot: { x: 190, y: 52.25 }, rest: { x: -100.49, y: -33.33, rotation: 10 }, z: 22 },
  ],
  anchors: {
    "focus-up": { at: { x: 520, y: 33 } },
    "held-object": { part: "arm-right", at: { x: 106.86, y: 78.2 } },
    "satchel-strap": { part: "satchel", at: { x: 169.85, y: 6.45 } },
  },
  poses: { neutral: {} },
  basePose: "neutral",
  actions: {
    // One step cycle: the left leg lifts and plants, then the right. Each leg is listed only in
    // its own phases, so it returns to rest (planted) in the others.
    walk: {
      channel: "legs", blend: "override", priority: 1, takeover: "cut",
      phases: [
        { name: "act", frames: 6, pose: { "leg-left": { x: 3, y: -8, rotation: -5 } }, easing: "ease-out-cubic" },
        { name: "act", frames: 6, pose: {}, easing: "ease-in-cubic" },
        { name: "act", frames: 6, pose: { "leg-right": { x: 3, y: -8, rotation: 5 } }, easing: "ease-out-cubic" },
        { name: "recover", frames: 6, pose: {}, easing: "ease-in-cubic" },
      ],
    },
    // Pairs with walk: the body rises while a foot is up and dips on the plant.
    bob: {
      channel: "body", blend: "additive", priority: 1, takeover: "cut",
      phases: [
        { name: "act", frames: 6, pose: { body: { y: -1 } } },
        { name: "act", frames: 6, pose: { body: { y: 3 } } },
        { name: "act", frames: 6, pose: { body: { y: -1 } } },
        { name: "recover", frames: 6, pose: {} },
      ],
    },
    point: {
      channel: "arms", blend: "override", priority: 2, takeover: "blend-out", blendOutFrames: 8,
      phases: [
        { name: "prepare", frames: 6, pose: { "arm-right": { rotation: 8 } } },
        { name: "act", frames: 8, pose: { "arm-right": { rotation: -14 } }, variants: { "arm-right": "point" }, easing: "ease-out-cubic" },
        { name: "hold", frames: 24, pose: { "arm-right": { rotation: -12 } }, variants: { "arm-right": "point" } },
        { name: "recover", frames: 10, pose: {} },
      ],
    },
    wave: {
      channel: "arms", blend: "override", priority: 2, takeover: "cut",
      phases: [
        // The raised paw swings below the scarf's flying end (it would pass behind it higher up).
        { name: "prepare", frames: 6, pose: { "arm-left": { rotation: -34 } }, variants: { "arm-left": "wave" } },
        { name: "act", frames: 6, pose: { "arm-left": { rotation: -46 } }, variants: { "arm-left": "wave" } },
        { name: "act", frames: 6, pose: { "arm-left": { rotation: -30 } }, variants: { "arm-left": "wave" } },
        { name: "act", frames: 6, pose: { "arm-left": { rotation: -46 } }, variants: { "arm-left": "wave" } },
        { name: "hold", frames: 6, pose: { "arm-left": { rotation: -38 } }, variants: { "arm-left": "wave" } },
        { name: "recover", frames: 8, pose: {} },
      ],
    },
    // Asking a question is a deliberate single-paw raise, with one digit extended.
    // The inward left fist would disappear behind the scarf at this angle, so use the
    // right-side pointing cutout instead and tip it gently upward.
    question: {
      channel: "arms", blend: "override", priority: 2, takeover: "blend-out", blendOutFrames: 6,
      phases: [
        { name: "prepare", frames: 8, pose: { "arm-right": { rotation: -12 } } },
        { name: "act", frames: 8, pose: { "arm-right": { rotation: -35 } }, variants: { "arm-right": "point" }, easing: "ease-out-cubic" },
        { name: "hold", frames: 20, pose: { "arm-right": { rotation: -32 } }, variants: { "arm-right": "point" } },
        { name: "recover", frames: 8, pose: {} },
      ],
    },
    // Both paws thrown up and out to the sides. They stay below the scarf: the arms hang behind the
    // torso at the shoulder, so a paw raised higher would pass behind the scarf and vanish.
    cheer: {
      channel: "arms", blend: "override", priority: 2, takeover: "blend-out", blendOutFrames: 8,
      phases: [
        {
          name: "prepare", frames: 6, pose: { "arm-left": { rotation: -20, y: 3 }, "arm-right": { rotation: 18, y: 3 } },
          variants: { "arm-left": "hold-up", "arm-right": "spread" },
        },
        {
          name: "act", frames: 6, pose: { "arm-left": { rotation: -44, y: -3 }, "arm-right": { rotation: 44, y: -3 } }, easing: "ease-out-back",
          variants: { "arm-left": "hold-up", "arm-right": "spread" },
        },
        {
          name: "hold", frames: 18, pose: { "arm-left": { rotation: -40, y: -2 }, "arm-right": { rotation: 40, y: -2 } },
          variants: { "arm-left": "hold-up", "arm-right": "spread" },
        },
        { name: "recover", frames: 8, pose: {} },
      ],
    },
    // Additive on the tail; the swept drawing shows at the apex.
    "tail-flick": {
      channel: "tail", blend: "additive", priority: 1, takeover: "cut",
      phases: [
        { name: "act", frames: 5, pose: { tail: { rotation: 4 } } },
        { name: "hold", frames: 4, pose: { tail: { rotation: 4 } }, variants: { tail: "swept" } },
        { name: "act", frames: 6, pose: { tail: { rotation: -4 } } },
        { name: "recover", frames: 6, pose: {} },
      ],
    },
  },
  expressions: {
    default: "neutral",
    sets: {
      // Explicit so the blink face can show while silent: without an expression variant on the
      // mouth part, the evaluator would show the speech rest face and hide the blink.
      neutral: { variants: { head: "neutral" } },
      curious: { variants: { head: "skeptical" } },
      delighted: { variants: { head: "grin" } },
      sleepy: { variants: { head: "sleepy" } },
      happy: { variants: { head: "happy" } },
      sad: { variants: { head: "worried" } },
    },
  },
  speech: {
    mouthPart: "head",
    rest: "neutral",
    visemes: { closed: "neutral", open: "talk", wide: "grin", round: "ah" },
    approximateCycle: ["talk", "neutral", "grin", "neutral"],
    transitionFrames: 2,
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
  capabilities: [
    "puppet-2.5d", "nested-pivots", "variants", "expressions", "actions", "speech-visemes", "blink", "idle",
    "params", "anchors", "raster-assets", "walk-cycle",
  ],
};
