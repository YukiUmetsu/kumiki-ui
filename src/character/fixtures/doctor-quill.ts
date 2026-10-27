/**
 * Dr. Orin Quill ("doctor-quill") — a raster 2.5D puppet built from the Pip & Doc Quill pre-rig
 * art kit. DEMO FIXTURE ONLY: not part of the installable registry. The kit's art licence is
 * UNCONFIRMED; its owner must confirm commercial and redistribution rights before this file or
 * `./doctor-quill-assets/` is distributed.
 *
 * Source parts (kit `rig_parts/doctor_quill/`), copied into `./doctor-quill-assets/`:
 * - `corrections/torso_clean.png` (torso, with the bow tie and open sleeve cuffs painted in),
 *   `leg_screen_left_clean.png`, `leg_screen_right_clean.png`, `back_tail_feathers_clean.png`;
 * - `base_parts/wing_screen_left.png`, `wing_screen_right.png`, `bow_tie.png`;
 * - `gestures/wing_02_down_right`, `wing_08_think_right` (screen-left wing) and `wing_03_up_left`,
 *   `wing_05_curl_left` (screen-right wing). Gesture file names use the OWL'S OWN sides, the
 *   opposite of the screen-named base wings: a `_left` gesture has its sleeve on the image's left
 *   and only reads as an outward pose on the viewer's right;
 * - `expressions/face_01, 03, 04, 05, 06, 07, 08, 10` (full-head replacements with spectacles);
 * - corrected v1.3 clean-head art and registered full-beak `mouth_stages/` sprites.
 * Not used: the `_TEMP` merged faces and torso, `isolated_foot` (superseded by the clean legs),
 * `head.png` (eyes baked; superseded by the faces), `spectacles`/`eyelid_*` (already painted into
 * every face), and the original `beak_open`/`beak_closed` (replaced by registered full-beak
 * sprites). `empty.png` (1 × 1 transparent) backs the bow tie's and beak's `hidden` variants.
 *
 * Clean-up applied to the copies (the kit's guide warns of edge halos and stray fragments):
 * - torso, legs, tail, bow tie and all wing drawings: a light 1 px fringe sat outside the dark
 *   ink outline (outer ring mean luma 89 vs 40 on the outline for the torso). That outermost
 *   ring was made transparent; the interior is untouched. Specks of 1–3 px were removed.
 * - faces: no halo (soft fur edge, outer ring as dark as the next), so only stray fragments were
 *   removed (up to 151 px on brows-up). Each face was registered to the neutral face (similarity
 *   fit of the whole head, then for the speech and eye faces a shift so the two iris centres
 *   match) and resampled into one shared 424 × 410 frame. Neutral, surprised and exclaim keep
 *   both iris centres within about 1.5 px of each other; brows-up, half-lid,
 *   wide-eyes and skeptical are drawn with different eye spacing, so their eyes move 3–20 px.
 * - wing poses: each pose is resampled into its wing part's frame, pinned on the coat sleeve
 *   (teal centroid) and turned by the inverse of the part's rest rotation, so a variant swap
 *   keeps the sleeve on the coat cuff and shows the pose roughly as drawn.
 *
 * Placement: every part was placed by overlay against `rig_source/doctor_quill_master.png`
 * (1145 × 1374). Torso and bow tie were fitted by an automatic colour registration against the
 * master; the head by laying the neutral face's iris centres on the master's; legs by their foot
 * centres and claw line; tail and wings by eye (the kit's wing drawings are not the master's
 * wings, so only position, angle and mass match).
 * The design canvas is the master's pixel space offset by (70, 100) on a 1345 × 1574 canvas.
 *
 * What the art cannot express yet (honest limits):
 * - Expressions and blink swap the whole head; pupils, lids and brows are painted, so there is
 *   no independent gaze. Speech temporarily selects a clean head with no painted beak and uses
 *   one registered child beak part with seven open stages and 18 in-betweens. This prevents
 *   double beaks and head-size flashing; the speaking head suppresses blink and expression art
 *   while keeping the head's animated transform. Those return when speech stops.
 * - Expression faces other than surprised differ in tuft shape and eye spacing (brows-up and
 *   exclaim have taller tufts; skeptical's squinting eye moves about 20 px), so expression
 *   changes visibly redraw the head.
 * - No palette skins: raster pixels cannot be recoloured through palette keys (`skins: {}`).
 * - Rigid images only: no mesh deformation, so wings and legs rotate as cards. The `walk` cycle
 *   is a step in place seen from the front; there is no foot-contact IK.
 * - The bow tie is also painted on the torso; the separate bow tie part covers it exactly.
 *
 * Sides: part names follow the kit's file names, which are SCREEN sides: `wing-left` and
 * `leg-left` are on the viewer's left. A positive rotation is clockwise.
 */

import type { CharacterAsset, CharacterDefinition, CharacterImageAsset, CharacterPoseDelta, CharacterVec2 } from "../../../registry/character/definition";

/**
 * Master pixels → design pixels: the 1145 × 1374 master sits at (70, 100) on a 1345 × 1574 canvas.
 * The figure leans right (head tilt, right wing), so the canvas leaves more room on the right.
 */
const ORIGIN: CharacterVec2 = { x: 70, y: 100 };
const DESIGN_WIDTH = 1345;
const DESIGN_HEIGHT = 1574;

const PROVENANCE = {
  license: "user-supplied pre-rig art kit; licence unconfirmed, owner must confirm before distribution",
  source: "Pip & Doc Quill pre-rig art kit (rig_parts/doctor_quill), cleaned and registered copies",
} as const;

const MOUTH_STAGE_NAMES = [
  "closed", "open_1", "open_2", "open_3", "open_4", "open_5", "open_6",
  ...Array.from({ length: 6 }, (_, index) => [25, 50, 75].map(step => `between_${index}_${index + 1}_${step}`)).flat(),
];

/** Pixel size of every PNG in `doctor-quill-assets/` (faces and wings are padded shared frames). */
const SIZES = {
  torso: [693, 598],
  "leg-left": [359, 589],
  "leg-right": [326, 591],
  tail: [427, 514],
  bowtie: [264, 138],
  "wing-left": [582, 456],
  "wing-left-down": [582, 456],
  "wing-left-think": [582, 456],
  "wing-right": [733, 565],
  "wing-right-up": [733, 565],
  "wing-right-curl": [733, 565],
  "face-neutral": [424, 410],
  "face-neutral-beakless": [424, 410],
  "face-surprised": [424, 410],
  "face-blink": [424, 410],
  "face-half-lid": [424, 410],
  "face-wide-eyes": [424, 410],
  "face-brows-up": [424, 410],
  "face-skeptical": [424, 410],
  "face-exclaim": [424, 410],
  ...Object.fromEntries(MOUTH_STAGE_NAMES.map(name => [`mouth_stages/${name}`, [424, 410] as const])),
  empty: [1, 1],
} as const satisfies Record<string, readonly [number, number]>;

type AssetName = keyof typeof SIZES;

function image(name: AssetName): CharacterImageAsset {
  const [width, height] = SIZES[name];
  return { kind: "image", uri: `doctor-quill/${name}`, mediaType: "image/png", width, height, provenance: { ...PROVENANCE } };
}

const assets: Record<string, CharacterAsset> = Object.fromEntries(
  (Object.keys(SIZES) as AssetName[]).map((name) => [name, image(name)]),
);

/** Logical asset URI → file next to this module. Hosts resolve these into `assetUrls`. */
export const doctorQuillAssetFiles: Record<string, string> = Object.fromEntries(
  (Object.keys(SIZES) as AssetName[]).map((name) => [`doctor-quill/${name}`, `doctor-quill-assets/${name}.png`]),
);

// ---------------------------------------------------------------------------------------------
// Placement against the master. A placement says: drawing pixel `pin`, scaled by `scale` and
// turned by `rotation` degrees, sits on master pixel `at`.
// ---------------------------------------------------------------------------------------------

interface Placement {
  scale: number;
  rotation: number;
  pin: CharacterVec2;
  at: CharacterVec2;
}

const r2 = (value: number) => Math.round(value * 100) / 100;
const rotate = (v: CharacterVec2, degrees: number): CharacterVec2 => {
  const c = Math.cos((degrees * Math.PI) / 180), s = Math.sin((degrees * Math.PI) / 180);
  return { x: c * v.x - s * v.y, y: s * v.x + c * v.y };
};
/** Master-space position of drawing pixel `u` under a placement. */
const toMaster = (p: Placement, u: CharacterVec2): CharacterVec2 => {
  const v = rotate({ x: (u.x - p.pin.x) * p.scale, y: (u.y - p.pin.y) * p.scale }, p.rotation);
  return { x: p.at.x + v.x, y: p.at.y + v.y };
};
/** Drawing pixel of master point `m` under a placement (the inverse of `toMaster`). */
const fromMaster = (p: Placement, m: CharacterVec2): CharacterVec2 => {
  const v = rotate({ x: (m.x - p.at.x) / p.scale, y: (m.y - p.at.y) / p.scale }, -p.rotation);
  return { x: p.pin.x + v.x, y: p.pin.y + v.y };
};

/**
 * Rest transform that reproduces `child` inside `parent` (or on the canvas for the root), for a
 * part pivoting at `pivot`. The evaluator's local matrix maps u to `pivot + (x, y) + S·R(u − pivot)`.
 */
function rest(child: Placement, pivot: CharacterVec2, parent?: Placement): CharacterPoseDelta {
  const pivotInMaster = toMaster(child, pivot);
  const pivotInParent = parent
    ? fromMaster(parent, pivotInMaster)
    : { x: pivotInMaster.x + ORIGIN.x, y: pivotInMaster.y + ORIGIN.y };
  const scale = parent ? child.scale / parent.scale : child.scale;
  return {
    x: r2(pivotInParent.x - pivot.x),
    y: r2(pivotInParent.y - pivot.y),
    rotation: r2(child.rotation - (parent?.rotation ?? 0)),
    scaleX: Math.round(scale * 10000) / 10000,
    scaleY: Math.round(scale * 10000) / 10000,
  };
}

/** Torso: colour-registered on the master (vest, lapels, hem and painted bow tie line up). */
const TORSO: Placement = { scale: 1.268, rotation: 0, pin: { x: 0, y: 0 }, at: { x: 113.5, y: 372.5 } };
/**
 * Legs: foot centres and claw line on the master's feet. The thighs reach up under the coat,
 * whose hem overlaps their tops; both legs draw behind the torso.
 */
// Quill v1.3 corrected the left/right sprite assignment and widened the stance
// so the large owl talons no longer cross in the front-facing step cycle.
const LEG_LEFT: Placement = { scale: 0.88, rotation: 0, pin: { x: 110, y: 520 }, at: { x: 395, y: 1275 } };
const LEG_RIGHT: Placement = { scale: 0.88, rotation: 0, pin: { x: 185, y: 520 }, at: { x: 725, y: 1270 } };
/**
 * Back plumage: colour registration put it under the left wing, where it never shows; it is moved
 * by eye so its dark tips show below the coat between the left wing and left leg, as on the master.
 */
const TAIL: Placement = { scale: 0.862, rotation: 20, pin: { x: 0, y: 0 }, at: { x: 195, y: 742 } };
const BOWTIE: Placement = { scale: 0.602, rotation: 1.8, pin: { x: 0, y: 0 }, at: { x: 551, y: 460 } };
/**
 * Head: the neutral face's two iris centres laid on the master's (527, 290) and (675, 318), so
 * the head carries the master's 10.7 degree tilt. The master's ruff is fuller than the faces'.
 */
const HEAD: Placement = { scale: 1.457, rotation: 10.7, pin: { x: 215.9, y: 238.4 }, at: { x: 601, y: 304 } };
/**
 * Wings hang from the coat cuffs; each wing drawing's own sleeve is laid over the torso's open
 * cuff. `pin` is the sleeve centre in the wing frame.
 */
const WING_LEFT: Placement = { scale: 1.35, rotation: 65, pin: { x: 201, y: 159 }, at: { x: 220, y: 740 } };
const WING_RIGHT: Placement = { scale: 1.35, rotation: -70, pin: { x: 332.5, y: 232.1 }, at: { x: 965, y: 745 } };

/** Pivots, in each drawing's pixels. */
const PIVOT = {
  /** Body: ground line between the feet, so breathing and the walk bob keep the feet planted. */
  body: fromMaster(TORSO, { x: 560, y: 1340 }),
  /** Hips: the top centre of each thigh, under the coat. */
  "leg-left": { x: 110, y: 40 },
  "leg-right": { x: 185, y: 40 },
  /** Tail root, against the lower back. */
  tail: { x: 200, y: 40 },
  /** Bow tie knot. */
  bowtie: { x: 132, y: 69 },
  /** Neck base: the bottom of the chin ruff in the face frame. */
  head: { x: 215, y: 372 },
  /** Shoulders: inside each wing drawing's sleeve, near its open end. */
  "wing-left": { x: 165, y: 177 },
  "wing-right": { x: 357, y: 252 },
} satisfies Record<string, CharacterVec2>;

/** Expression name → face. Every set names its face, so blink can show through any of them. */
const EXPRESSIONS: Record<string, { face: string; tilt?: number }> = {
  neutral: { face: "neutral" },
  curious: { face: "brows-up", tilt: -4 },
  surprised: { face: "surprised" },
  skeptical: { face: "skeptical" },
  focused: { face: "half-lid" },
  happy: { face: "wide-eyes" },
  exclaim: { face: "exclaim" },
};
const FACES = ["neutral", "surprised", "blink", "half-lid", "wide-eyes", "brows-up", "skeptical", "exclaim"] as const;

/**
 * Foot lift per step, in body pixels (about 15 design px). An 8 px lift was tried first and
 * did not read at strip or phone size.
 */
const STEP_LIFT = -12;
/** Body dip per step in design px; the legs carry the opposite dip in body pixels to stay planted. */
const BOB = 3;
const LEG_COUNTER_BOB = r2(-BOB / TORSO.scale);

export const doctorQuillCharacter: CharacterDefinition = {
  schemaVersion: 1,
  characterId: "doctor-quill",
  revision: "r2",
  mode: "puppet-2.5d",
  design: { width: DESIGN_WIDTH, height: DESIGN_HEIGHT },
  channels: ["body", "head", "arms", "legs", "tail"],
  palette: {},
  assets,
  parts: [
    {
      id: "body",
      channel: "body",
      asset: "torso",
      pivot: { x: r2(PIVOT.body.x), y: r2(PIVOT.body.y) },
      rest: rest(TORSO, PIVOT.body),
      z: 1,
    },
    {
      id: "tail",
      parent: "body",
      channel: "tail",
      asset: "tail",
      pivot: PIVOT.tail,
      rest: rest(TAIL, PIVOT.tail, TORSO),
      z: 0,
      depth: 0.3,
    },
    // Both legs draw behind the torso (lower z): the coat hem overlaps the thighs.
    {
      id: "leg-left",
      parent: "body",
      channel: "legs",
      asset: "leg-right",
      pivot: PIVOT["leg-left"],
      rest: rest(LEG_LEFT, PIVOT["leg-left"], TORSO),
      z: 0.5,
    },
    {
      id: "leg-right",
      parent: "body",
      channel: "legs",
      asset: "leg-left",
      pivot: PIVOT["leg-right"],
      rest: rest(LEG_RIGHT, PIVOT["leg-right"], TORSO),
      z: 0.5,
    },
    {
      id: "head",
      parent: "body",
      channel: "head",
      asset: "face-neutral",
      variants: { ...Object.fromEntries(FACES.map((face) => [face, `face-${face}`])), beakless: "face-neutral-beakless" },
      pivot: PIVOT.head,
      rest: rest(HEAD, PIVOT.head, TORSO),
      z: 2,
    },
    // The default is transparent because the closed beak is painted on the
    // normal expression heads. Speech switches to a clean head and draws only
    // one full-beak shape, aligned in head-local canvas pixels.
    {
      id: "beak",
      parent: "head",
      channel: "head",
      asset: "empty",
      variants: {
        hidden: "empty",
        ...Object.fromEntries(MOUTH_STAGE_NAMES.map(name => [name, `mouth_stages/${name}`])),
      },
      pivot: PIVOT.head,
      z: 3,
    },
    {
      id: "bowtie",
      parent: "body",
      channel: "body",
      asset: "bowtie",
      variants: { hidden: "empty" },
      pivot: PIVOT.bowtie,
      rest: rest(BOWTIE, PIVOT.bowtie, TORSO),
      z: 3,
    },
    {
      id: "wing-left",
      parent: "body",
      channel: "arms",
      asset: "wing-left",
      variants: { down: "wing-left-down", think: "wing-left-think" },
      pivot: PIVOT["wing-left"],
      rest: rest(WING_LEFT, PIVOT["wing-left"], TORSO),
      z: 4,
    },
    {
      id: "wing-right",
      parent: "body",
      channel: "arms",
      asset: "wing-right",
      variants: { up: "wing-right-up", curl: "wing-right-curl" },
      pivot: PIVOT["wing-right"],
      rest: rest(WING_RIGHT, PIVOT["wing-right"], TORSO),
      z: 4,
    },
  ],
  anchors: {
    "focus-up": { at: { x: 1060, y: 60 } },
    /** Tip of the raised wing drawing (`up`) in the wing-right frame: the pixel farthest from the sleeve. */
    "held-object": { part: "wing-right", at: { x: 727, y: 251 } },
  },
  poses: { neutral: {} },
  basePose: "neutral",
  actions: {
    // One step cycle in place (24 frames; cue it every 24 frames to keep walking). The left leg
    // lifts and comes a little toward the viewer, plants, then the right leg does the same.
    walk: {
      channel: "legs",
      blend: "override",
      priority: 1,
      takeover: "cut",
      phases: [
        { name: "prepare", frames: 6, pose: { "leg-left": { y: STEP_LIFT, rotation: -3, scaleX: 1.03, scaleY: 1.03 } }, easing: "ease-out-cubic" },
        { name: "act", frames: 6, pose: {}, easing: "ease-in-cubic" },
        { name: "hold", frames: 6, pose: { "leg-right": { y: STEP_LIFT, rotation: 3, scaleX: 1.03, scaleY: 1.03 } }, easing: "ease-out-cubic" },
        { name: "recover", frames: 6, pose: {}, easing: "ease-in-cubic" },
      ],
    },
    // Body dip on each step, timed with `walk`: down as each foot plants, level at 0 and 24 so
    // chained cycles join. The legs carry the opposite dip so the planted foot does not sink.
    bob: {
      channel: "body",
      blend: "additive",
      priority: 1,
      takeover: "cut",
      phases: [
        { name: "prepare", frames: 9, pose: { body: { y: BOB }, "leg-left": { y: LEG_COUNTER_BOB }, "leg-right": { y: LEG_COUNTER_BOB } }, easing: "ease-in-out-cubic" },
        { name: "act", frames: 6, pose: {}, easing: "ease-in-out-cubic" },
        { name: "hold", frames: 6, pose: { body: { y: BOB }, "leg-left": { y: LEG_COUNTER_BOB }, "leg-right": { y: LEG_COUNTER_BOB } }, easing: "ease-in-out-cubic" },
        { name: "recover", frames: 3, pose: {}, easing: "ease-in-out-cubic" },
      ],
    },
    // Prepare swings the hanging wing out; act and hold show the raised drawing (a drawing swap
    // at the phase boundary, not a tween); recover lowers it back.
    point: {
      channel: "arms",
      blend: "override",
      priority: 2,
      takeover: "blend-out",
      blendOutFrames: 8,
      phases: [
        { name: "prepare", frames: 6, pose: { "wing-right": { rotation: -12 } }, easing: "ease-in-out-cubic" },
        { name: "act", frames: 10, pose: { "wing-right": { rotation: 0 } }, variants: { "wing-right": "up" }, easing: "ease-out-cubic" },
        { name: "hold", frames: 24, pose: { "wing-right": { rotation: 0 } }, variants: { "wing-right": "up" } },
        { name: "recover", frames: 12, pose: {}, easing: "ease-in-out-cubic" },
      ],
    },
    // Wing open/settle: the left wing swings out, shows the lowered drawing, then settles.
    "wing-open": {
      channel: "arms",
      blend: "override",
      priority: 1,
      takeover: "cut",
      phases: [
        { name: "prepare", frames: 6, pose: { "wing-left": { rotation: 6 } }, easing: "ease-in-out-cubic" },
        { name: "act", frames: 8, pose: { "wing-left": { rotation: 0 } }, variants: { "wing-left": "down" }, easing: "ease-out-cubic" },
        { name: "hold", frames: 16, pose: { "wing-left": { rotation: 0 } }, variants: { "wing-left": "down" } },
        { name: "recover", frames: 10, pose: {}, easing: "ease-in-out-cubic" },
      ],
    },
    // Think: the left wing lifts into the kit's "think" drawing. The sleeve stays on the cuff,
    // so the wing curls up beside the body; it does not reach the chin.
    think: {
      channel: "arms",
      blend: "override",
      priority: 1,
      takeover: "blend-out",
      blendOutFrames: 6,
      phases: [
        { name: "prepare", frames: 6, pose: { "wing-left": { rotation: -12 } }, easing: "ease-in-out-cubic" },
        { name: "act", frames: 8, pose: {}, variants: { "wing-left": "think" }, easing: "ease-out-cubic" },
        { name: "hold", frames: 30, pose: {}, variants: { "wing-left": "think" } },
        { name: "recover", frames: 10, pose: {}, easing: "ease-in-out-cubic" },
      ],
    },
    // Curl: the right wing curls in and hangs at the side (the kit's curl drawing).
    "wing-curl": {
      channel: "arms",
      blend: "override",
      priority: 1,
      takeover: "blend-out",
      blendOutFrames: 6,
      phases: [
        { name: "prepare", frames: 6, pose: { "wing-right": { rotation: -6 } }, easing: "ease-in-out-cubic" },
        { name: "act", frames: 8, pose: {}, variants: { "wing-right": "curl" }, easing: "ease-out-cubic" },
        { name: "hold", frames: 24, pose: {}, variants: { "wing-right": "curl" } },
        { name: "recover", frames: 10, pose: {}, easing: "ease-in-out-cubic" },
      ],
    },
    nod: {
      channel: "head",
      blend: "additive",
      priority: 1,
      takeover: "cut",
      phases: [
        { name: "prepare", frames: 4, pose: { head: { rotation: -2 } } },
        { name: "act", frames: 6, pose: { head: { rotation: 3, y: 3 } }, easing: "ease-out-cubic" },
        { name: "hold", frames: 4, pose: { head: { rotation: -3, y: 1 } } },
        { name: "recover", frames: 8, pose: {}, easing: "ease-in-out-cubic" },
      ],
    },
  },
  expressions: {
    default: "neutral",
    sets: Object.fromEntries(
      Object.entries(EXPRESSIONS).map(([name, { face, tilt }]) => [
        name,
        tilt === undefined ? { variants: { head: face } } : { variants: { head: face }, pose: { head: { rotation: tilt } } },
      ]),
    ),
  },
  speech: {
    mouthPart: "beak",
    rest: "hidden",
    activeVariants: { head: "beakless" },
    visemes: {
      closed: "closed", M: "closed", B: "closed", P: "closed", open: "open_3", wide: "open_6", round: "open_2",
      A: "open_5", E: "open_3", I: "open_2", O: "open_4", U: "open_1",
      // Directly address every registered stage for authored mouth sweeps and offline cue tracks.
      ...Object.fromEntries(MOUTH_STAGE_NAMES.map(name => [name, name])),
    },
    approximateCycle: ["closed", "between_0_1_50", "open_2", "between_2_3_50", "open_4", "between_4_5_50", "open_6", "open_3", "open_1"],
    transitionFrames: 0,
    approximateStepFrames: 3,
  },
  blink: { parts: ["head"], variant: "blink", intervalFrames: { min: 90, max: 200 }, durationFrames: 6 },
  idle: {
    parts: {
      body: { property: "scaleY", amplitude: 0.012, periodFrames: 110 },
      tail: { property: "rotation", amplitude: 1.0, periodFrames: 150 },
    },
  },
  params: {
    wingSpread: {
      min: 0.92,
      max: 1.1,
      default: 1,
      targets: [
        { part: "wing-left", property: "scale", weight: 1 },
        { part: "wing-right", property: "scale", weight: 1 },
      ],
    },
    headTilt: { min: -6, max: 6, default: 0, targets: [{ part: "head", property: "rotation", weight: 1 }] },
  },
  // No skins: the raster art has no palette-filled shapes and no alternative outfit drawings.
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
    "walk-cycle",
  ],
};
