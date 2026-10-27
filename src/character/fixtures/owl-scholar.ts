/**
 * Owl scholar — a raster 2.5D puppet character used as a DEMO FIXTURE.
 *
 * Built from user-supplied artwork, not redrawn:
 * - a parts sheet (polka-dot bow tie, teal coat over a quilted waistcoat, two feathered wings with
 *   coat cuffs, a tail fan). Each PNG is an alpha-exact crop of one part; pixels nearer to a
 *   neighbouring part are cleared;
 * - the full-body reference, for the two legs and feet;
 * - a sheet of 12 face drawings (head with tufts, painted eyes, spectacles and beak). The faces
 *   touch, so they were split by growing each face from its grid centre through the alpha mask.
 *   The sheet draws the faces at different sizes, so each face was registered to the neutral
 *   face (scale + translation) and resampled into one shared 424 × 408 frame. A variant swap
 *   therefore keeps the head in place; the art itself still differs a little between faces.
 * - a sheet of 8 wing poses (4 mirrored pairs: hanging, raised, folded, cupped), used as variants
 *   of both wing parts. Each wing part's drawings share one frame aligned on the coat cuff. The
 *   default wing is only padded; each pose is turned by the inverse of the part's rest rotation
 *   (the raised pair 15 degrees further toward vertical, the hanging pair 12 degrees closer to
 *   the body), scaled to 0.92 (the pose sheet draws
 *   longer wings) and resampled, so it displays as drawn.
 *
 * This file is a demo fixture only. It is NOT part of the installable registry, and the artwork
 * licence must be confirmed by its owner before any distribution.
 *
 * What the art can and cannot express:
 * - The head is ONE part. Expressions, blink and lip-sync all swap the whole face drawing.
 *   Lip-sync is a whole-face swap: neutral (closed), open, wide and round beaks. While the owl
 *   speaks, the speech face replaces the expression face, and blink waits until speech ends.
 * - Eyes are painted, so there is no gaze.
 * - The faces already wear the spectacles, so there is no separate glasses part.
 * - There are no props, so there is no `present` action and no palette skin.
 * - `point` swaps the right wing to its raised drawing during act and hold (phase variants) and
 *   only adds a small rotation, because the drawing already carries the lift. The swap is a
 *   drawing change at the phase boundary, not a tween. `held-object` marks the raised wing's tip.
 * - Expressions show the other wing poses (`sleepy` hangs the wings, `worried` folds them, `happy`
 *   cups them). Expression variants are applied after action variants, so during those three
 *   expressions `point` lifts the expression's wing drawing instead of the raised one.
 * - The neutral expression names the `neutral` face explicitly. With the head as the speech mouth
 *   part, the evaluator only lets blink through when an expression sets the head variant.
 * - The coat ends in open sleeves; each wing drawing carries its own cuff, which is laid over the
 *   sleeve end, and the wing pivots at that cuff so rotations keep it on the sleeve.
 * - The parts sheet's torso also carries a single leg column; the crop stops above it. The two
 *   legs are cut from the full-body reference instead (each foot is its own alpha component;
 *   above the toes only the leg column is kept, with coat and wing pixels cleared). Their cut
 *   tops tuck under the torso, and each leg pivots at its hip.
 * - `walk` is one 24-frame step cycle in place, seen from the front: a step lifts the foot and
 *   brings it slightly toward the viewer (larger). `bob` dips the body on each step; it is
 *   additive and the legs are children of the body, so the whole figure dips by 4 px. The body
 *   pivots at the ground line, so idle breathing does not move the planted feet.
 *
 * Sides: part names follow the file names, which follow the parts-sheet layout. The wing drawn on
 * the sheet's left fits the viewer's right sleeve, so `wing-left` hangs on the viewer's right
 * (the owl's own left) and `wing-right` on the viewer's left. Raising `wing-right` is therefore a
 * positive (clockwise) rotation.
 *
 * Coordinates: design canvas 760 × 736. Every asset is drawn at its own design size; a child's
 * `rest` places its top-left in the parent's asset pixels. Part scales differ because the sheets
 * draw the head, coat and wings at different scales from the full-body reference.
 */

import type { CharacterAsset, CharacterDefinition, CharacterImageAsset } from "../../../registry/character/definition";

const DESIGN_WIDTH = 760;
const DESIGN_HEIGHT = 736;

const PROVENANCE = {
  license: "user-supplied reference artwork; licence to be confirmed by the owner before distribution",
  source: "user-supplied owl parts sheet, face sheet and full-body reference",
} as const;

/** Face drawings, keyed by what each shows. All share the 424 × 408 registered frame. */
const FACES = [
  "neutral",
  "open",
  "wide",
  "round",
  "blink",
  "sleepy",
  "wide-eyed",
  "glance",
  "skeptical",
  "worried",
  "happy",
  "excited",
] as const;
const FACE_FRAME = [424, 408] as const;

/** Wing poses from the wing-pose sheet, drawn as variants of both wing parts. */
const WING_POSES = ["hanging", "raised", "folded", "cupped"] as const;

/**
 * Cropped PNG sizes in sheet pixels (see `owl-assets/`). Each wing part's drawings (the default
 * plus its poses) share one frame aligned on the cuff, so a pose swap keeps the cuff on the sleeve.
 */
const CROPS = {
  bowtie: [276, 150],
  torso: [534, 362],
  "wing-left": [597, 663],
  "wing-right": [553, 674],
  /** Cut from the full-body reference; both crops start at the same reference row (y = 1120). */
  "foot-left": [304, 230],
  "foot-right": [291, 249],
  tail: [382, 246],
} as const;

type CropName = keyof typeof CROPS | "face";

/** Design px per sheet px, per drawing. Chosen by rendering against the full-body reference. */
const SCALE: Record<CropName, number> = {
  face: 0.86,
  bowtie: 0.26,
  torso: 0.76,
  "wing-left": 0.5,
  "wing-right": 0.5,
  "foot-left": 0.55,
  "foot-right": 0.55,
  tail: 0.56,
};

const r1 = (value: number) => Math.round(value * 10) / 10;
/** A sheet-pixel point of one drawing in that drawing's design pixels. */
const at = (name: CropName, x: number, y: number) => ({ x: r1(x * SCALE[name]), y: r1(y * SCALE[name]) });

function image(key: string, scale: CropName, [w, h]: readonly [number, number]): CharacterImageAsset {
  return {
    kind: "image",
    uri: `owl/${key}`,
    mediaType: "image/png",
    width: r1(w * SCALE[scale]),
    height: r1(h * SCALE[scale]),
    provenance: { ...PROVENANCE },
  };
}

const assets: Record<string, CharacterAsset> = {
  ...Object.fromEntries(FACES.map((face) => [`face-${face}`, image(`face-${face}`, "face", FACE_FRAME)])),
  ...Object.fromEntries((Object.keys(CROPS) as (keyof typeof CROPS)[]).map((name) => [name, image(name, name, CROPS[name])])),
  ...Object.fromEntries(
    (["wing-left", "wing-right"] as const).flatMap((wing) =>
      WING_POSES.map((pose) => [`${wing}-${pose}`, image(`${wing}-${pose}`, wing, CROPS[wing])]),
    ),
  ),
};

/** Logical asset URI → file name next to this module. Hosts resolve these into `assetUrls`. */
export const owlScholarAssetFiles: Record<string, string> = Object.fromEntries(
  Object.keys(assets).map((key) => [`owl/${key}`, `owl-assets/${key}.png`]),
);

// ---------------------------------------------------------------------------------------------
// Landmarks, in each drawing's own pixels (measured on the crops).
// ---------------------------------------------------------------------------------------------

/** Body axis: the waistcoat's centre line on the torso drawing. */
const TORSO_AXIS = 300;
const TORSO_BOTTOM = 362;
const TORSO_SLEEVE_LEFT = { x: 55, y: 200 };
const TORSO_SLEEVE_RIGHT = { x: 505, y: 210 };
const TORSO_COLLAR = { x: 300, y: 62 };
/** Face frame: the bottom of the chin ruff under the beak (the neck). */
const FACE_NECK = { x: 218, y: 372 };
/** Wing cuffs: the centre of the teal coat cuff in each wing frame; it sits over the sleeve end. */
const WING_LEFT_CUFF = { x: 234.1, y: 375 };
const WING_RIGHT_CUFF = { x: 363.5, y: 375 };
/** Tip of the raised right wing's longest feather (in the shared wing frame), relative to its cuff. */
const WING_RIGHT_RAISED_TIP = { x: WING_RIGHT_CUFF.x - 83.5, y: WING_RIGHT_CUFF.y - 366 };
/** Legs: the hip (top of the leg column) in each crop. The reference legs stand 204 px apart. */
const HIP_LEFT = { x: 85, y: 24 };
const HIP_RIGHT = { x: 167, y: 24 };
const HIP_SPACING = 204;
/** How far the legs' cut tops reach up under the torso drawing, in design px. */
const LEG_TUCK = 40;
const TAIL_ROOT = { x: 190, y: 30 };

/** Offset that puts `childPoint` (child design px) on `parentPoint` (parent design px). */
const place = (parentPoint: { x: number; y: number }, childPoint: { x: number; y: number }, dx = 0, dy = 0) => ({
  x: r1(parentPoint.x - childPoint.x + dx),
  y: r1(parentPoint.y - childPoint.y + dy),
});

const AXIS_X = 380;
const BODY_TOP = 304;
const torsoAxis = at("torso", TORSO_AXIS, 0).x;
const torsoBottom = at("torso", TORSO_AXIS, TORSO_BOTTOM);
const hipY = r1(torsoBottom.y - LEG_TUCK + at("foot-left", 0, HIP_LEFT.y).y);
const hipHalf = (HIP_SPACING * SCALE["foot-left"]) / 2;
/** Ground line under the body, in torso design px: the lower talon tips of the two legs. */
const groundY = r1(hipY - at("foot-right", 0, HIP_RIGHT.y).y + at("foot-right", 0, 243).y);

/** Expression name → face drawing, plus wing poses where the pose sheet has a fitting one. */
const EXPRESSIONS: Record<string, { face: (typeof FACES)[number]; wings?: (typeof WING_POSES)[number] }> = {
  neutral: { face: "neutral" },
  curious: { face: "wide-eyed" },
  delighted: { face: "excited" },
  focused: { face: "glance" },
  sleepy: { face: "sleepy", wings: "hanging" },
  skeptical: { face: "skeptical" },
  worried: { face: "worried", wings: "folded" },
  happy: { face: "happy", wings: "cupped" },
};

function expressionVariants({ face, wings }: (typeof EXPRESSIONS)[string]): Record<string, string> {
  return { head: face, ...(wings ? { "wing-left": wings, "wing-right": wings } : {}) };
}

export const owlScholarCharacter: CharacterDefinition = {
  schemaVersion: 1,
  characterId: "owl-scholar",
  revision: "r2",
  mode: "puppet-2.5d",
  design: { width: DESIGN_WIDTH, height: DESIGN_HEIGHT },
  channels: ["body", "head", "arms", "legs", "tail"],
  // The raster art has no palette-filled shapes. These are median colours sampled from torso.png
  // (coat, waistcoat, belly) so hosts can match surrounding UI; nothing in the art reads them.
  palette: { teal: "#446b6f", crimson: "#7f2e31", cream: "#d4a884" },
  assets,
  parts: [
    {
      id: "body",
      channel: "body",
      asset: "torso",
      // Breathing (idle scaleY) and nothing else scale the body; scaling from the ground line keeps
      // the planted feet still.
      pivot: { x: torsoBottom.x, y: groundY },
      rest: { x: r1(AXIS_X - torsoAxis), y: BODY_TOP },
      z: 1,
    },
    {
      id: "tail",
      parent: "body",
      channel: "tail",
      asset: "tail",
      pivot: at("tail", TAIL_ROOT.x, TAIL_ROOT.y),
      rest: place(at("torso", TORSO_AXIS, 215), at("tail", TAIL_ROOT.x, TAIL_ROOT.y)),
      z: 0,
      depth: 0.3,
    },
    // Legs hang from the hips under the torso (lower z than the body draws them behind it).
    // `foot-left` is the owl's own left, on the viewer's right, as with the wings.
    {
      id: "foot-left",
      parent: "body",
      channel: "legs",
      asset: "foot-left",
      pivot: at("foot-left", HIP_LEFT.x, HIP_LEFT.y),
      rest: place({ x: torsoAxis + hipHalf, y: hipY }, at("foot-left", HIP_LEFT.x, HIP_LEFT.y)),
      z: 0.5,
    },
    {
      id: "foot-right",
      parent: "body",
      channel: "legs",
      asset: "foot-right",
      pivot: at("foot-right", HIP_RIGHT.x, HIP_RIGHT.y),
      rest: place({ x: torsoAxis - hipHalf, y: hipY }, at("foot-right", HIP_RIGHT.x, HIP_RIGHT.y)),
      z: 0.5,
    },
    {
      id: "head",
      parent: "body",
      channel: "head",
      asset: "face-neutral",
      variants: Object.fromEntries(FACES.map((face) => [face, `face-${face}`])),
      pivot: at("face", FACE_NECK.x, FACE_NECK.y),
      rest: place(at("torso", TORSO_COLLAR.x, TORSO_COLLAR.y), at("face", FACE_NECK.x, FACE_NECK.y), 0, 6),
      z: 2,
    },
    {
      id: "bowtie",
      parent: "body",
      channel: "body",
      asset: "bowtie",
      pivot: at("bowtie", 138, 75),
      rest: place(at("torso", TORSO_COLLAR.x, TORSO_COLLAR.y), at("bowtie", 138, 75), 0, 4),
      z: 3,
    },
    {
      id: "wing-right",
      parent: "body",
      channel: "arms",
      asset: "wing-right",
      variants: Object.fromEntries(WING_POSES.map((pose) => [pose, `wing-right-${pose}`])),
      pivot: at("wing-right", WING_RIGHT_CUFF.x, WING_RIGHT_CUFF.y),
      rest: { ...place(at("torso", TORSO_SLEEVE_LEFT.x, TORSO_SLEEVE_LEFT.y), at("wing-right", WING_RIGHT_CUFF.x, WING_RIGHT_CUFF.y)), rotation: -30 },
      z: 4,
    },
    {
      id: "wing-left",
      parent: "body",
      channel: "arms",
      asset: "wing-left",
      variants: Object.fromEntries(WING_POSES.map((pose) => [pose, `wing-left-${pose}`])),
      pivot: at("wing-left", WING_LEFT_CUFF.x, WING_LEFT_CUFF.y),
      rest: { ...place(at("torso", TORSO_SLEEVE_RIGHT.x, TORSO_SLEEVE_RIGHT.y), at("wing-left", WING_LEFT_CUFF.x, WING_LEFT_CUFF.y)), rotation: 30 },
      z: 4,
    },
  ],
  anchors: {
    "focus-up": { at: { x: 600, y: 60 } },
    "held-object": { part: "wing-right", at: at("wing-right", WING_RIGHT_RAISED_TIP.x, WING_RIGHT_RAISED_TIP.y) },
  },
  poses: { neutral: {} },
  basePose: "neutral",
  actions: {
    // Prepare lifts the default wing; act and hold show the raised drawing, angled a little out.
    point: {
      channel: "arms",
      blend: "override",
      priority: 2,
      takeover: "blend-out",
      blendOutFrames: 8,
      phases: [
        { name: "prepare", frames: 6, pose: { "wing-right": { rotation: 25 } }, easing: "ease-in-out-cubic" },
        { name: "act", frames: 10, pose: { "wing-right": { rotation: 5 } }, variants: { "wing-right": "raised" }, easing: "ease-out-cubic" },
        { name: "hold", frames: 24, pose: { "wing-right": { rotation: 5 } }, variants: { "wing-right": "raised" } },
        { name: "recover", frames: 12, pose: {}, easing: "ease-in-out-cubic" },
      ],
    },
    nod: {
      channel: "head",
      blend: "additive",
      priority: 1,
      takeover: "cut",
      phases: [
        { name: "prepare", frames: 4, pose: { head: { rotation: -2 } } },
        { name: "act", frames: 6, pose: { head: { rotation: 4, y: 3 } }, easing: "ease-out-cubic" },
        { name: "hold", frames: 4, pose: { head: { rotation: -4, y: 1 } } },
        { name: "recover", frames: 8, pose: {}, easing: "ease-in-out-cubic" },
      ],
    },
    // One step cycle in place (24 frames; cue it every 24 frames to keep walking). The left foot
    // lifts and comes toward the viewer, plants, then the right foot does the same. Each foot is
    // listed only in its own lift phase; the following empty phase plants it (back to rest).
    walk: {
      channel: "legs",
      blend: "override",
      priority: 1,
      takeover: "cut",
      phases: [
        { name: "prepare", frames: 6, pose: { "foot-left": { y: -16, scaleX: 1.05, scaleY: 1.05, rotation: -3 } }, easing: "ease-out-cubic" },
        { name: "act", frames: 6, pose: {}, easing: "ease-in-cubic" },
        { name: "hold", frames: 6, pose: { "foot-right": { y: -16, scaleX: 1.05, scaleY: 1.05, rotation: 3 } }, easing: "ease-out-cubic" },
        { name: "recover", frames: 6, pose: {}, easing: "ease-in-cubic" },
      ],
    },
    // Body dip on each step, timed with `walk`: down as each foot comes down, level at 0 and 24
    // so back-to-back cycles join without a jump.
    bob: {
      channel: "body",
      blend: "additive",
      priority: 1,
      takeover: "cut",
      phases: [
        { name: "prepare", frames: 9, pose: { body: { y: 4 } }, easing: "ease-in-out-cubic" },
        { name: "act", frames: 6, pose: {}, easing: "ease-in-out-cubic" },
        { name: "hold", frames: 6, pose: { body: { y: 4 } }, easing: "ease-in-out-cubic" },
        { name: "recover", frames: 3, pose: {}, easing: "ease-in-out-cubic" },
      ],
    },
  },
  expressions: {
    default: "neutral",
    sets: Object.fromEntries(Object.entries(EXPRESSIONS).map(([name, spec]) => [name, { variants: expressionVariants(spec) }])),
  },
  speech: {
    mouthPart: "head",
    rest: "neutral",
    // Whole-face swap: each viseme shows the face drawn with that beak shape.
    visemes: { closed: "neutral", open: "open", wide: "wide", round: "round" },
    approximateCycle: ["open", "neutral", "round", "neutral"],
    transitionFrames: 2,
    approximateStepFrames: 4,
  },
  blink: { parts: ["head"], variant: "blink", intervalFrames: { min: 90, max: 200 }, durationFrames: 6 },
  idle: {
    parts: {
      body: { property: "scaleY", amplitude: 0.012, periodFrames: 110 },
      tail: { property: "rotation", amplitude: 1.2, periodFrames: 150 },
    },
  },
  params: {
    wingSpread: {
      min: 0.92,
      max: 1.1,
      default: 1,
      targets: [
        { part: "wing-left", property: "scale", weight: 0.5 },
        { part: "wing-right", property: "scale", weight: 0.5 },
      ],
    },
    headTilt: { min: -6, max: 6, default: 0, targets: [{ part: "head", property: "rotation", weight: 1 }] },
  },
  // No skins: the raster art has no palette-filled shapes, and there is no alternative artwork
  // to swap in, so a palette or asset skin would change nothing that is drawn.
  skins: {},
  capabilities: [
    "puppet-2.5d",
    "nested-pivots",
    "variants",
    "expressions",
    "actions",
    "speech-visemes",
    "blink",
    "idle",
    "params",
    "anchors",
    "raster-assets",
  ],
};
