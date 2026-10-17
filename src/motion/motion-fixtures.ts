/**
 * Golden motion fixtures — the renderer-neutral 2D motion system (docs/08 §12, MG1).
 *
 * These are *data*, not library code: no registry item imports this module. The
 * tests and the showcase build from here, so a fixture that stops validating or
 * stops round-tripping fails the suite instead of quietly describing a different
 * video. `examples/motion/*.json` is generated output, never hand-edited; the
 * sanctioned refresh command lives in `tests/motion-fixtures.test.ts`.
 *
 * Rules held throughout (docs/08 §1, docs/11):
 *
 * 1. **Deterministic and JSON-safe.** Every value is a plain number, string,
 *    array or object. There is no `Date`, no `Math.random`, no wall clock and no
 *    function anywhere — spring responses are sampled from the analytic
 *    `springValue`, path samples come from `pointOnPath`/`pathTransformPoint`, and
 *    every keyframe is an integer frame.
 * 2. **Geometry travels as data.** A motion timeline has no field for a path,
 *    contour or mask, so those live in the timeline as `discrete`-valued "carrier"
 *    tracks (`graphic-path.data`, `graphic-morph.from`, …). They are ordinary
 *    keyframes, so the data round-trips through JSON and the tests can read it
 *    back out of the serialized document rather than out of a private constant.
 * 3. **Anonymous copy.** Nothing here names a customer, platform or industry; the
 *    kinetic title is a neutral phrase and the labels are generic.
 *
 * The three timelines below are 2D, 30 fps and authored in a 1920×1080 design-px
 * space (docs/07 shared contracts). {@link MOTION_FIXTURE_FRAMES} records the
 * docs/11 §6 frame coverage for each one.
 */

import type {
  AffineMatrix,
  AnimationTrack,
  ContourShape,
  EvalContext,
  HoldNode,
  Keyframe,
  MaskSpecLocal,
  MotionCue,
  MotionNode,
  MotionOffset,
  MotionPath,
  MotionTimeline,
  MotionValue,
  MotionValueType,
  ParallelNode,
  PathTrimSpec,
  RationalFps,
  RepeatNode,
  SequenceNode,
  TrackNode,
} from "../../registry/motion";
import {
  applyInterruption,
  buildKineticTextTimeline,
  composeMatrix,
  evaluateTimeline,
  materializePreset,
  nodeDuration,
  offsetFrames,
  pathTransformPoint,
  resolveCueFrames,
  springValue,
  staggerStartFrames,
  timelineHash,
  translationMatrix,
} from "../../registry/motion";
import { STORYBOARD_FIXTURES } from "./storyboard-fixtures";

const FPS_30: RationalFps = { num: 30, den: 1 };

/* ------------------------------------------------------------------ *
 * Node builders (thin, so the fixtures read as timing, not boilerplate)
 * ------------------------------------------------------------------ */

function trackNode(
  id: string,
  targetId: string,
  property: string,
  valueType: MotionValueType,
  keyframes: Keyframe[],
  offset?: MotionOffset,
): TrackNode {
  const node: TrackNode = {
    kind: "track",
    id,
    track: { id, targetId, property, valueType, keyframes },
  };
  if (offset !== undefined) node.offset = offset;
  return node;
}

/**
 * A `discrete`-valued carrier track. `valueType: "discrete"` never interpolates —
 * it holds the value for the whole timeline — so a path, contour or mask spec
 * survives serialization byte-for-byte and the tests read the data back out of
 * the evaluated timeline instead of a private constant.
 */
function dataTrack(id: string, targetId: string, property: string, value: unknown): TrackNode {
  return {
    kind: "track",
    id,
    track: {
      id,
      targetId,
      property,
      valueType: "discrete",
      keyframes: [{ frame: 0, value: value as MotionValue }],
    },
  };
}

function parallelNode(id: string, children: MotionNode[], offset?: MotionOffset): ParallelNode {
  const node: ParallelNode = { kind: "parallel", id, children };
  if (offset !== undefined) node.offset = offset;
  return node;
}

function sequenceNode(id: string, children: MotionNode[], offset?: MotionOffset): SequenceNode {
  const node: SequenceNode = { kind: "sequence", id, children };
  if (offset !== undefined) node.offset = offset;
  return node;
}

function holdNode(id: string, durationFrames: number, child?: MotionNode, offset?: MotionOffset): HoldNode {
  const node: HoldNode = { kind: "hold", id, durationFrames };
  if (child) node.child = child;
  if (offset !== undefined) node.offset = offset;
  return node;
}

function repeatNode(id: string, count: number, child: MotionNode, offset?: MotionOffset): RepeatNode {
  const node: RepeatNode = { kind: "repeat", id, count, child };
  if (offset !== undefined) node.offset = offset;
  return node;
}

/* ------------------------------------------------------------------ *
 * Fixture 1 — kinetic-title-30s (900 frames)
 *
 * Beat plan (docs/08 §1 "rhythm"): kinetic-type title → supporting line →
 * cross-fade shared-element handoff. The sequence's beats are contiguous, so
 * `240 + 120 + 144 = 504` frames are covered with no hole.
 * ------------------------------------------------------------------ */

/**
 * The title beat: `buildKineticTextTimeline` segments "Compose once" into two
 * words, animates each with the `rise-reveal` preset and places the whole run in
 * one `stagger` node. `durationFrames` is the *outer* timeline length (900), so
 * the overrun check is measured against the real composition, not the beat.
 */
const KINETIC_TITLE = buildKineticTextTimeline({
  id: "title",
  text: "Compose once",
  granularity: "word",
  startFrame: 0,
  durationFrames: 900,
  stagger: 3,
  timing: 24,
});

/** Cue `cue-handoff` carries the shared element's durable `semanticId`. */
const TITLE_CUES: MotionCue[] = [
  { id: "cue-title", frame: 0, kind: "beat", targetId: "title" },
  { id: "cue-handoff", frame: 456, kind: "shared-element", targetId: "focus-mark" },
  { id: "cue-outro", frame: 700, kind: "beat", targetId: "accent-rule" },
];

const TITLE_MARK_MATRIX: AffineMatrix = translationMatrix(320, 220);
const DIAGRAM_MARK_MATRIX: AffineMatrix = translationMatrix(1120, 560);

const titleBeat = holdNode("beat-title", 240, KINETIC_TITLE.timeline.nodes[0], { cue: "cue-title" });

/** A `parallel` coordinating two property tracks on the *same* target. */
const supportBeat = parallelNode("beat-support", [
  trackNode("support-line-position", "support-line", "position", "vec2", [
    { frame: 0, value: { x: -64, y: 0 } },
    { frame: 120, value: { x: 0, y: 0 }, easing: "ease-out-cubic" },
  ]),
  trackNode("support-line-opacity", "support-line", "opacity", "opacity", [
    { frame: 0, value: 0 },
    { frame: 120, value: 1, easing: "ease-out-cubic" },
  ]),
]);

/**
 * The handoff beat owns the *first* representation of the shared element. Its
 * opacity reaches `0` exactly at the handoff end (frame 504) while the second
 * representation fades in over the same window — a cross-fade, never a morph.
 */
const handoffBeat = holdNode(
  "beat-handoff",
  144,
  parallelNode("focus-mark-a-beat", [
    trackNode("focus-mark-a-transform", "focus-mark-a", "transform", "transform", [
      { frame: 0, value: TITLE_MARK_MATRIX },
      { frame: 143, value: translationMatrix(300, 200) },
    ]),
    trackNode("focus-mark-a-opacity", "focus-mark-a", "opacity", "opacity", [
      { frame: 0, value: 1 },
      { frame: 96, value: 1 },
      { frame: 144, value: 0, easing: "ease-in-out-cubic" },
    ]),
  ]),
);

const titleShot = sequenceNode("shot-title", [titleBeat, supportBeat, handoffBeat]);

/** The second shot: the same semantic element, a new representation. */
const diagramShot = holdNode(
  "shot-diagram",
  444,
  parallelNode("focus-mark-b-beat", [
    trackNode("focus-mark-b-transform", "focus-mark-b", "transform", "transform", [
      { frame: 0, value: DIAGRAM_MARK_MATRIX },
      { frame: 443, value: DIAGRAM_MARK_MATRIX },
    ]),
    trackNode("focus-mark-b-opacity", "focus-mark-b", "opacity", "opacity", [
      { frame: 0, value: 0 },
      { frame: 48, value: 1, easing: "ease-in-out-cubic" },
      { frame: 443, value: 1 },
    ]),
  ]),
  { cue: "cue-handoff" },
);

const accentPulse = repeatNode(
  "accent-pulse",
  3,
  trackNode("accent-rule-opacity", "accent-rule", "opacity", "opacity", [
    { frame: 0, value: 0.25 },
    { frame: 10, value: 1 },
    { frame: 20, value: 0.25 },
  ]),
  { cue: "cue-outro" },
);

/** A deliberately discrete `step-end` jump, declared as a cut in the tests. */
const stepMarker = trackNode("step-marker-value", "step-marker", "value", "number", [
  { frame: 0, value: 0 },
  { frame: 456, value: 100, easing: "step-end" },
]);

/** The `look-at` constraint reads this vec2, so the angle is always defined. */
const trackerMove = trackNode("tracker-move", "tracker", "position", "vec2", [
  { frame: 0, value: { x: 200, y: 300 } },
  { frame: 899, value: { x: 900, y: 300 } },
]);

const kineticTitle: MotionTimeline = {
  schemaVersion: 1,
  id: "kinetic-title-30s",
  fps: FPS_30,
  durationFrames: 900,
  cues: TITLE_CUES,
  nodes: [trackerMove, stepMarker, titleShot, diagramShot, accentPulse],
  constraints: [
    {
      kind: "look-at",
      id: "constraint-look",
      targetId: "tracker",
      property: "angle",
      towards: { x: 960, y: 540 },
    },
  ],
  transforms: [
    { id: "stage-root", local: translationMatrix(0, 0) },
    { id: "badge-anchor", parentId: "stage-root", local: translationMatrix(960, 540), pivot: { x: 0, y: 0 } },
  ],
};

/* ------------------------------------------------------------------ *
 * Fixture 2 — graphic-composition (600 frames)
 *
 * A path-driven packet, a vector-draw reveal, a shape morph and a mask reveal,
 * each backed by the geometry it is drawn from (stored as carrier data).
 * ------------------------------------------------------------------ */

const GRAPHIC_PATH: MotionPath = {
  id: "graphic-route",
  closed: false,
  kind: "cubic",
  anchors: [
    { x: 160, y: 540, out: { x: 360, y: 540 } },
    { x: 640, y: 300, in: { x: 440, y: 300 }, out: { x: 840, y: 300 } },
    { x: 1120, y: 700, in: { x: 920, y: 700 }, out: { x: 1320, y: 700 } },
    { x: 1760, y: 460, in: { x: 1560, y: 460 } },
  ],
};

/** Local→world conversion used by `pathTransformPoint` (a slight vertical squash). */
const GRAPHIC_PATH_MATRIX: AffineMatrix = composeMatrix({
  scale: { x: 1, y: 0.9 },
  origin: { x: 960, y: 540 },
});

const GRAPHIC_TRIM: PathTrimSpec = { start: 0, end: 1, offset: 0, direction: "forward" };

/** Two compatible closed contours: same count, winding, closedness and no holes. */
const MORPH_SQUARE: ContourShape = {
  contours: [{ points: [{ x: 0, y: 0 }, { x: 240, y: 0 }, { x: 240, y: 240 }, { x: 0, y: 240 }], closed: true }],
};

const MORPH_DIAMOND: ContourShape = {
  contours: [{ points: [{ x: 120, y: 0 }, { x: 240, y: 120 }, { x: 120, y: 240 }, { x: 0, y: 120 }], closed: true }],
};

/** Deliberately incompatible (one contour → two): the declared-fallback case. */
const MORPH_INCOMPATIBLE: ContourShape = {
  contours: [
    { points: [{ x: 0, y: 0 }, { x: 240, y: 0 }, { x: 240, y: 240 }, { x: 0, y: 240 }], closed: true },
    { points: [{ x: 40, y: 40 }, { x: 80, y: 40 }, { x: 80, y: 80 }, { x: 40, y: 80 }], closed: true },
  ],
};

const MASK_CLIP: MaskSpecLocal = {
  id: "mask-clip",
  kind: "clip",
  rect: { x: 120, y: 140, width: 1680, height: 800 },
  feather: 0,
  order: 0,
  axis: "left-to-right",
};

const MASK_ALPHA: MaskSpecLocal = {
  id: "mask-alpha",
  kind: "alpha",
  rect: { x: 240, y: 200, width: 1440, height: 680 },
  feather: 24,
  order: 1,
  axis: "top-to-bottom",
};

const PACKET_START = 60;
const PACKET_END = 540;

/** Baked `pathTransformPoint` samples: the vec2 track *is* the path's motion. */
const packetKeyframes: Keyframe[] = [];
for (let frame = PACKET_START; frame <= PACKET_END; frame += 4) {
  const t = (frame - PACKET_START) / (PACKET_END - PACKET_START);
  packetKeyframes.push({
    frame,
    value: pathTransformPoint(GRAPHIC_PATH, t, GRAPHIC_PATH_MATRIX, { arcLength: true }),
  });
}

/** The `wipe-reveal` preset drives a normalized 0→1 `length` consumed by `trimPath`. */
const revealNode = materializePreset({
  preset: "wipe-reveal",
  targetId: "reveal-length",
  startFrame: 120,
  timing: 264,
}).nodes[0];

const graphicComposition: MotionTimeline = {
  schemaVersion: 1,
  id: "graphic-composition",
  fps: FPS_30,
  durationFrames: 600,
  nodes: [
    dataTrack("graphic-path-data", "graphic-path", "data", GRAPHIC_PATH),
    dataTrack("graphic-trim-data", "graphic-trim", "data", GRAPHIC_TRIM),
    dataTrack("graphic-morph-from", "graphic-morph", "from", MORPH_SQUARE),
    dataTrack("graphic-morph-to", "graphic-morph", "to", MORPH_DIAMOND),
    dataTrack("graphic-morph-bad-from", "graphic-morph-bad", "from", MORPH_SQUARE),
    dataTrack("graphic-morph-bad-to", "graphic-morph-bad", "to", MORPH_INCOMPATIBLE),
    dataTrack("graphic-mask-clip", "graphic-mask", "clip", MASK_CLIP),
    dataTrack("graphic-mask-alpha", "graphic-mask", "alpha", MASK_ALPHA),
    trackNode("packet-move", "packet", "position", "vec2", packetKeyframes),
    revealNode,
    trackNode("morph-progress", "morph", "progress", "number", [
      { frame: 240, value: 0 },
      { frame: 480, value: 1, easing: "ease-in-out-cubic" },
    ]),
    trackNode("mask-progress", "mask", "progress", "number", [
      { frame: 0, value: 0 },
      { frame: 240, value: 1, easing: "ease-out-cubic" },
    ]),
    repeatNode(
      "graphic-pulse",
      4,
      trackNode("accent-dot-opacity", "accent-dot", "opacity", "opacity", [
        { frame: 0, value: 0.25 },
        { frame: 12, value: 1 },
        { frame: 24, value: 0.25 },
      ]),
      500,
    ),
  ],
};

/* ------------------------------------------------------------------ *
 * Fixture 3 — interruption-base / interruption-demo (480 frames)
 *
 * A spring-sampled vec2 emphasis plus an opacity fade, then the same base with a
 * mid-flight interruption at frame 240. The interruption spawns a continuation
 * target (`packet-echo`) whose first keyframe is seeded with the value read from
 * `packet.position` at the interrupt frame, so the value does not jump.
 * ------------------------------------------------------------------ */

/** A deliberately slow, underdamped emphasis spring (settles well past frame 300). */
const EMPHASIS_SPRING = { mass: 1, stiffness: 2, damping: 2.4 };
const SPRING_START = 200;

const packetPositionKeyframes: Keyframe[] = [];
for (let frame = 0; frame <= 479; frame += 2) {
  const progress = frame < SPRING_START ? 0 : springValue((frame - SPRING_START) / 30, EMPHASIS_SPRING);
  packetPositionKeyframes.push({ frame, value: { x: 400 + 480 * progress, y: 540 } });
}

const interruptionBase: MotionTimeline = {
  schemaVersion: 1,
  id: "interruption-base",
  fps: FPS_30,
  durationFrames: 480,
  nodes: [
    trackNode("packet-position", "packet", "position", "vec2", packetPositionKeyframes),
    trackNode("packet-opacity", "packet", "opacity", "opacity", [
      { frame: 0, value: 0 },
      { frame: 24, value: 1, easing: "ease-out-cubic" },
    ]),
  ],
};

const INTERRUPT_FRAME = 240;

/**
 * The response track. Its own keyframes start *after* the interrupt frame, so
 * `applyInterruption` can prepend the seed without creating a duplicate frame.
 */
const echoTrack: AnimationTrack = {
  id: "packet-echo-track",
  targetId: "packet-echo",
  property: "position",
  valueType: "vec2",
  keyframes: [
    { frame: 300, value: { x: 1200, y: 540 } },
    { frame: 420, value: { x: 1400, y: 540 }, easing: "ease-out-cubic" },
  ],
};

const interruptionDemo = applyInterruption(interruptionBase, {
  frame: INTERRUPT_FRAME,
  targetId: "packet",
  property: "position",
  track: echoTrack,
}).timeline;

/* ------------------------------------------------------------------ *
 * Frame coverage (docs/11 §6)
 * ------------------------------------------------------------------ */

/** Global frames every keyframe lands on, mirroring node timing exactly. */
function collectGlobalKeyframeFrames(timeline: MotionTimeline): number[] {
  const ctx: EvalContext = {
    fps: timeline.fps,
    cueFrames: resolveCueFrames(timeline.cues).frames,
    diagnostics: [],
  };
  const out: number[] = [];

  const walk = (node: MotionNode, base: number): void => {
    const start = base + offsetFrames(node.offset, ctx);
    switch (node.kind) {
      case "track":
        for (const keyframe of node.track.keyframes) out.push(start + keyframe.frame);
        return;
      case "sequence": {
        let cursor = 0;
        for (const child of node.children) {
          walk(child, start + cursor);
          cursor += offsetFrames(child.offset, ctx) + nodeDuration(child, ctx);
        }
        return;
      }
      case "parallel":
        for (const child of node.children) walk(child, start);
        return;
      case "hold":
        if (node.child) walk(node.child, start);
        return;
      case "repeat": {
        const childDuration = nodeDuration(node.child, ctx);
        for (let i = 0; i < node.count; i += 1) walk(node.child, start + i * childDuration);
        return;
      }
      case "stagger": {
        const starts = staggerStartFrames(node.items, node.intervalFrames, node.direction, node.groupSpacingFrames);
        for (let i = 0; i < node.items.length; i += 1) walk(node.items[i].node, start + starts[i]);
        return;
      }
    }
  };

  for (const node of timeline.nodes) walk(node, 0);
  return out;
}

/**
 * The docs/11 §6 coverage: first and last frame, every keyframe, every cue, the
 * declared boundaries in `extras`, a fixed-stride tween sample and the midpoints
 * between all of them (representative tween / extrema probes). Sorted ascending,
 * de-duplicated and filtered to `[0, durationFrames)`.
 */
function coverageFrames(timeline: MotionTimeline, extras: number[]): number[] {
  const duration = timeline.durationFrames;
  const frames = new Set<number>();
  const add = (frame: number): void => {
    if (Number.isInteger(frame) && frame >= 0 && frame < duration) frames.add(frame);
  };

  add(0);
  add(duration - 1);
  for (const frame of collectGlobalKeyframeFrames(timeline)) add(frame);
  for (const cue of timeline.cues ?? []) add(cue.frame);
  for (const frame of extras) add(frame);
  for (let frame = 0; frame < duration; frame += 30) add(frame);

  const sorted = [...frames].sort((a, b) => a - b);
  for (let i = 1; i < sorted.length; i += 1) add(Math.floor((sorted[i - 1] + sorted[i]) / 2));

  return [...frames].sort((a, b) => a - b);
}

/** Transition / handoff / loop-seam boundaries the walker cannot infer. */
const COVERAGE_EXTRAS: Record<string, number[]> = {
  "kinetic-title-30s": [455, 456, 457, 503, 504, 505, 699, 700, 701, 759, 760],
  "graphic-composition": [59, 60, 61, 119, 120, 121, 239, 240, 241, 383, 384, 385, 479, 480, 481, 499, 500, 501, 595],
  "interruption-base": [239, 240, 241],
  "interruption-demo": [239, 240, 241, 299, 300, 301, 419, 420, 421],
};

/* ------------------------------------------------------------------ *
 * Public surface
 * ------------------------------------------------------------------ */

export interface MotionFixture {
  id: string;
  description: string;
  timeline: MotionTimeline;
}

export const MOTION_FIXTURES: MotionFixture[] = [
  {
    id: "kinetic-title-30s",
    description:
      "900-frame 30 fps title: a kinetic-type title beat, a supporting line and a cross-fade shared-element handoff, with named cues, a hold, a repeat, a transform hierarchy and a look-at constraint.",
    timeline: kineticTitle,
  },
  {
    id: "graphic-composition",
    description:
      "600-frame 30 fps graphic: path-driven motion, a wipe-reveal vector draw, a shape morph and a clip/alpha mask reveal, each backed by the JSON-safe geometry it is drawn from.",
    timeline: graphicComposition,
  },
  {
    id: "interruption-base",
    description:
      "480-frame 30 fps base: a spring-sampled vec2 emphasis and an opacity fade, before any interruption.",
    timeline: interruptionBase,
  },
  {
    id: "interruption-demo",
    description:
      "The base timeline plus a mid-flight interruption at frame 240; the spawned continuation is seeded with the pre-interruption value so it does not jump.",
    timeline: interruptionDemo,
  },
];

export const MOTION_FIXTURE_FRAMES: Record<string, number[]> = Object.fromEntries(
  MOTION_FIXTURES.map((fixture) => [
    fixture.id,
    coverageFrames(fixture.timeline, COVERAGE_EXTRAS[fixture.id] ?? []),
  ]),
);

/** Re-exported so a consumer has one motion-fixture entry point. */
export const STORYBOARD_EXAMPLES = STORYBOARD_FIXTURES;

export function fixtureById(id: string): MotionFixture | null {
  return MOTION_FIXTURES.find((fixture) => fixture.id === id) ?? null;
}

/**
 * Evaluate `fixture` at each coverage frame (or the supplied `frames`) and
 * flatten `evaluateTimeline(...).samples` into `{ [outputKey]: value }`.
 */
export function sampleFixture(
  fixture: MotionFixture,
  frames?: number[],
): Array<{ frame: number; values: Record<string, MotionValue> }> {
  const list = frames ?? MOTION_FIXTURE_FRAMES[fixture.id] ?? [];
  return list.map((frame) => {
    const result = evaluateTimeline(fixture.timeline, frame);
    const values: Record<string, MotionValue> = {};
    for (const key of Object.keys(result.samples)) values[key] = result.samples[key].value;
    return { frame, values };
  });
}

export function fixtureDigest(fixture: MotionFixture): string {
  return timelineHash(fixture.timeline);
}

export const MOTION_FIXTURE_DIGESTS: Record<string, string> = Object.fromEntries(
  MOTION_FIXTURES.map((fixture) => [fixture.id, fixtureDigest(fixture)]),
);

/* ------------------------------------------------------------------ *
 * Negative timelines — one documented diagnostic each
 *
 * Every entry fails `validateTimeline` with *exactly* its `expectedCodes`, so a
 * detector that stops firing (or starts over-firing) is caught by data.
 * ------------------------------------------------------------------ */

export const NEGATIVE_TIMELINES: Array<{
  id: string;
  timeline: MotionTimeline;
  expectedCodes: string[];
}> = [
  {
    id: "duplicate-writer",
    timeline: {
      schemaVersion: 1,
      id: "duplicate-writer",
      fps: FPS_30,
      durationFrames: 120,
      nodes: [
        trackNode("dup-a", "box", "x", "number", [
          { frame: 0, value: 0 },
          { frame: 60, value: 10 },
        ]),
        trackNode("dup-b", "box", "x", "number", [
          { frame: 0, value: 5 },
          { frame: 60, value: 15 },
        ]),
      ],
    },
    expectedCodes: ["motion-duplicate-writer"],
  },
  {
    id: "cue-offset-missing",
    timeline: {
      schemaVersion: 1,
      id: "cue-offset-missing",
      fps: FPS_30,
      durationFrames: 120,
      nodes: [
        trackNode(
          "cued",
          "box",
          "x",
          "number",
          [
            { frame: 0, value: 0 },
            { frame: 60, value: 10 },
          ],
          { cue: "ghost" },
        ),
      ],
    },
    expectedCodes: ["motion-offset-cue-missing"],
  },
  {
    id: "unordered-keyframes",
    timeline: {
      schemaVersion: 1,
      id: "unordered-keyframes",
      fps: FPS_30,
      durationFrames: 120,
      nodes: [
        trackNode("unordered", "box", "x", "number", [
          { frame: 60, value: 10 },
          { frame: 0, value: 0 },
        ]),
      ],
    },
    expectedCodes: ["motion-keyframe-unordered"],
  },
  {
    id: "keyframe-out-of-range",
    timeline: {
      schemaVersion: 1,
      id: "keyframe-out-of-range",
      fps: FPS_30,
      durationFrames: 120,
      nodes: [
        trackNode("out-of-range", "box", "x", "number", [
          { frame: 0, value: 0 },
          { frame: 200, value: 1 },
        ]),
      ],
    },
    expectedCodes: ["motion-frame-out-of-range"],
  },
  {
    id: "repeat-count-invalid",
    timeline: {
      schemaVersion: 1,
      id: "repeat-count-invalid",
      fps: FPS_30,
      durationFrames: 120,
      nodes: [
        repeatNode(
          "bad-repeat",
          0,
          trackNode("repeat-child", "box", "x", "number", [
            { frame: 0, value: 0 },
            { frame: 10, value: 1 },
          ]),
        ),
      ],
    },
    expectedCodes: ["motion-repeat-count-invalid"],
  },
  {
    id: "empty-sequence",
    timeline: {
      schemaVersion: 1,
      id: "empty-sequence",
      fps: FPS_30,
      durationFrames: 120,
      nodes: [sequenceNode("empty-seq", [])],
    },
    expectedCodes: ["motion-node-empty"],
  },
  {
    id: "value-type-mismatch",
    timeline: {
      schemaVersion: 1,
      id: "value-type-mismatch",
      fps: FPS_30,
      durationFrames: 120,
      nodes: [
        trackNode("mismatch", "box", "x", "number", [{ frame: 0, value: "nope" as unknown as number }]),
      ],
    },
    expectedCodes: ["motion-value-type-mismatch"],
  },
  {
    id: "transform-parent-cycle",
    timeline: {
      schemaVersion: 1,
      id: "transform-parent-cycle",
      fps: FPS_30,
      durationFrames: 120,
      nodes: [
        trackNode("cycle-track", "box", "x", "number", [
          { frame: 0, value: 0 },
          { frame: 10, value: 1 },
        ]),
      ],
      transforms: [
        { id: "cycle-a", parentId: "cycle-b", local: translationMatrix(0, 0) },
        { id: "cycle-b", parentId: "cycle-a", local: translationMatrix(0, 0) },
      ],
    },
    expectedCodes: ["motion-transform-parent-cycle"],
  },
];
