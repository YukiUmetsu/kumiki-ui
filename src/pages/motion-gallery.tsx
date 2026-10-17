import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { MotionConfig } from "motion/react";
import { CameraDemo } from "../motion/camera-demo";

import { Button } from "../ui/button";
import { Select } from "../ui/select";
import { Slider } from "../ui/slider";
import { Surface } from "../ui/surface-card";
import { Switch } from "../ui/switch";

import {
  GraphicComposition,
  KineticText,
  MaskRevealView,
  MotionBox,
  MotionScrubber,
  MotionStage,
  ShapeMorphView,
  usePrefersReducedMotion,
  VectorDraw,
} from "../motion/react";

import type {
  EasingSpec,
  EvaluationResult,
  FrameRange,
  MotionTimeline,
  RationalFps,
} from "../../registry/motion/types";
import { DEFAULT_FPS } from "../../registry/motion/constants";
import { evaluateTimeline } from "../../registry/motion/timeline";
import {
  angleOnPath,
  createMotionPath,
  pathToSvgD,
  pointOnPath,
} from "../../registry/motion/paths";
import type { ContourShape } from "../../registry/motion/morph";
import type { MaskSpecLocal } from "../../registry/motion/masks";
import { maskCapability } from "../../registry/motion/masks";
import { evaluateEasing } from "../../registry/motion/easing";
import {
  listPresets,
  materializePreset,
  MOTION_PRESETS,
  presetDefaults,
  resolveTiming,
} from "../../registry/motion/presets";
import type { MotionPreset } from "../../registry/motion/presets";
import {
  evaluateSharedElement,
  createSharedElement,
} from "../../registry/motion/shared-element";
import type { SharedElementSpec } from "../../registry/motion/shared-element";
import {
  springSettleFrames,
  springValue,
  SPRING_PRESETS,
} from "../../registry/motion/springs";
import {
  STORYBOARD_SCHEMA_VERSION,
  storyboardSummary,
  validateStoryboard,
  handoffChain,
  shotAt,
  toStoryboardClips,
} from "../../registry/motion/storyboard";
import type { Storyboard, StoryboardShot } from "../../registry/motion/storyboard";
import {
  STORYBOARD_FIXTURES,
  NEGATIVE_STORYBOARDS,
} from "../motion/storyboard-fixtures";
import type { KineticTextSpec, KineticGranularity } from "../../registry/motion/kinetic-text";
import {
  MOTION_FIXTURES,
  MOTION_FIXTURE_FRAMES,
  MOTION_FIXTURE_DIGESTS,
  fixtureById,
  sampleFixture,
} from "../motion/motion-fixtures";

/* -------------------------------------------------------------------------- */
/* Shared helpers                                                             */
/* -------------------------------------------------------------------------- */

function cx(...classes: Array<string | false | undefined | null>): string {
  return classes.filter(Boolean).join(" ");
}

function fmt(n: number): string {
  if (!Number.isFinite(n)) return "0";
  const r = Math.round(n * 1000) / 1000;
  return Object.is(r, -0) ? "0" : String(r);
}

function formatSeconds(frames: number, fps: RationalFps): string {
  const seconds = (frames * fps.den) / fps.num;
  return `${seconds.toFixed(2)}s`;
}

function formatFrame(frame: number, durationFrames: number, fps: RationalFps): string {
  return `${frame} / ${Math.max(0, durationFrames - 1)} · ${formatSeconds(frame, fps)}`;
}

function jsonDigest(value: unknown): string {
  const str = JSON.stringify(value);
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    const code = str.charCodeAt(i);
    hash = (hash << 5) - hash + code;
    hash |= 0;
  }
  return String(hash);
}

/** Section shell header: serif heading + muted description. */
function PatternSection({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section data-pattern-section={id} className="flex min-w-0 flex-col">
      <header className="mb-8 flex flex-col gap-1">
        <h2 className="font-serif text-heading font-normal tracking-heading text-foreground">
          {title}
        </h2>
        <p className="max-w-prose font-sans text-body text-muted-foreground">{description}</p>
      </header>
      {children}
    </section>
  );
}

/** A small, neutral metadata chip. */
function MetaChip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-control border border-border bg-surface px-2 py-1 text-caption text-foreground">
      {children}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Reduced motion context                                                     */
/* -------------------------------------------------------------------------- */

const ReducedMotionContext = createContext<boolean>(false);

function useReducedMotionFlag(): boolean {
  return useContext(ReducedMotionContext);
}

/* -------------------------------------------------------------------------- */
/* 1. Header                                                                  */
/* -------------------------------------------------------------------------- */

function Header({
  reducedMotion,
  systemReducedMotion,
  onReducedMotionChange,
}: {
  reducedMotion: boolean;
  systemReducedMotion: boolean;
  onReducedMotionChange: (value: boolean) => void;
}) {
  return (
    <header className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="font-serif text-heading font-normal tracking-heading text-foreground">
          Motion gallery
        </h1>
        <p className="max-w-prose text-body text-muted-foreground">
          A renderer-neutral 2D motion system where every frame is an explicit
          integer, evaluated deterministically.
        </p>
      </div>

      <div className="flex flex-col gap-4 rounded-surface border border-border bg-surface p-4">
        <p className="text-body-sm text-muted-foreground">
          MG1 covers timelines, typography, paths, masks, shared elements,
          presets and storyboards. This showcase renders with DOM/SVG; the same
          data can drive a canvas or video encoder.
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <Switch
            label="Reduce motion"
            description={systemReducedMotion
              ? "Your system requests reduced motion. Demos hold their final frame."
              : "Jump every demo to its final frame and ignore playback."}
            disabled={systemReducedMotion}
            checked={reducedMotion}
            onCheckedChange={onReducedMotionChange}
          />
        </div>
      </div>
    </header>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. Timelines & determinism                                                 */
/* -------------------------------------------------------------------------- */

const DETERMINISM_FPS: RationalFps = { num: 30, den: 1 };
const DETERMINISM_DURATION = 90;

const DETERMINISM_TIMELINE: MotionTimeline = {
  schemaVersion: 1,
  id: "determinism-demo",
  fps: DETERMINISM_FPS,
  durationFrames: DETERMINISM_DURATION,
  nodes: [
    {
      kind: "track",
      id: "box-transform",
      track: {
        id: "box-transform-track",
        targetId: "box",
        property: "transform",
        valueType: "transform",
        keyframes: [
          { frame: 0, value: { a: 1, b: 0, c: 0, d: 1, e: 16, f: 56 } },
          {
            frame: 60,
            value: { a: 1.25, b: 0, c: 0, d: 1.25, e: 200, f: 56 },
            easing: "ease-in-out-cubic",
          },
          { frame: 75, value: { a: 1, b: 0, c: 0, d: 1, e: 200, f: 56 } },
        ],
      },
    },
    {
      kind: "track",
      id: "box-opacity",
      track: {
        id: "box-opacity-track",
        targetId: "box",
        property: "opacity",
        valueType: "opacity",
        keyframes: [
          { frame: 0, value: 0 },
          { frame: 20, value: 1, easing: "ease-out-cubic" },
          { frame: 60, value: 1 },
          { frame: 75, value: 0.25, easing: "ease-in-cubic" },
        ],
      },
    },
  ],
};

function SampleTable({ evaluation }: { evaluation: EvaluationResult | null }) {
  if (!evaluation) return null;
  const entries = Object.values(evaluation.samples);
  return (
    <div
      className="overflow-x-auto rounded-surface border border-border bg-surface"
      tabIndex={0}
      aria-label="Evaluated samples"
    >
      <table className="w-full text-left text-body-sm">
        <thead className="border-b border-border bg-surface-subtle">
          <tr>
            <th className="px-3 py-2 font-medium text-foreground">Target</th>
            <th className="px-3 py-2 font-medium text-foreground">Property</th>
            <th className="px-3 py-2 font-medium text-foreground">Type</th>
            <th className="px-3 py-2 font-medium text-foreground">Value</th>
          </tr>
        </thead>
        <tbody>
          {entries.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-3 py-4 text-muted-foreground">
                No samples at this frame.
              </td>
            </tr>
          ) : (
            entries.map((sample) => (
              <tr key={`${sample.targetId}.${sample.property}`} className="border-b border-border last:border-0">
                <td className="px-3 py-2 font-mono text-caption">{sample.targetId}</td>
                <td className="px-3 py-2 font-mono text-caption">{sample.property}</td>
                <td className="px-3 py-2 text-caption">{sample.valueType}</td>
                <td className="px-3 py-2 font-mono text-caption">
                  {typeof sample.value === "object" && sample.value !== null
                    ? JSON.stringify(sample.value)
                    : String(sample.value)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function SeekOrderCheck({ timeline }: { timeline: MotionTimeline }) {
  const seekFrames = useMemo(() => [0, 23, 45, 67, 89], []);
  const orders = useMemo(
    () => ({
      authored: seekFrames,
      reversed: [...seekFrames].reverse(),
      shuffled: [45, 0, 89, 23, 67],
    }),
    [seekFrames]
  );

  const result = useMemo(() => {
    const perOrder: Record<string, Record<number, string>> = {};
    for (const [name, frames] of Object.entries(orders)) {
      const map: Record<number, string> = {};
      for (const frame of frames) {
        map[frame] = jsonDigest(evaluateTimeline(timeline, frame).samples);
      }
      perOrder[name] = map;
    }

    let matched = true;
    for (const frame of seekFrames) {
      if (
        perOrder.authored[frame] !== perOrder.reversed[frame] ||
        perOrder.authored[frame] !== perOrder.shuffled[frame]
      ) {
        matched = false;
        break;
      }
    }

    return { perOrder, matched };
  }, [orders, seekFrames, timeline]);

  return (
    <div className="flex flex-col gap-3 rounded-surface border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="font-serif text-subheading font-normal tracking-subheading text-foreground">
          Seek order check
        </h3>
        <span
          className={cx(
            "rounded-full px-2 py-0.5 text-caption font-medium",
            result.matched
              ? "border border-status-success/30 bg-status-success/10 text-status-success"
              : "border border-status-danger/30 bg-status-danger/10 text-status-danger"
          )}
        >
          {result.matched ? "Matched" : "Mismatch"}
        </span>
      </div>
      <p className="text-body-sm text-muted-foreground">
        The same frames evaluated in authored, reversed and shuffled order must
        produce identical sample digests.
      </p>
      <dl className="grid grid-cols-1 gap-2 text-body-sm sm:grid-cols-3">
        {Object.entries(result.perOrder).map(([name, map]) => (
          <div key={name} className="rounded-control bg-canvas px-3 py-2">
            <dt className="text-caption text-muted-foreground">{name}</dt>
            <dd className="font-mono text-caption">
              {jsonDigest(Object.values(map).join(""))}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function TimelinesSection() {
  const reducedMotion = useReducedMotionFlag();
  const [frame, setFrame] = useState(0);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);

  return (
    <PatternSection
      id="timelines"
      title="Timelines & determinism"
      description="Every value is a pure function of the current integer frame. Seek forward, backward or jump around: the same frame always yields the same samples."
    >
      <div className="flex min-w-0 flex-col gap-4">
        <div className="w-full max-w-full overflow-hidden rounded-surface border border-border bg-canvas">
          <MotionStage
            timeline={DETERMINISM_TIMELINE}
            frame={frame}
            width={320}
            height={180}
            ariaLabel="Deterministic motion stage"
            reducedMotion={reducedMotion}
            onEvaluation={setEvaluation}
          >
            <MotionBox targetId="box" className="size-12 rounded-md bg-primary" />
          </MotionStage>
        </div>

        <MotionScrubber
          timeline={DETERMINISM_TIMELINE}
          frame={frame}
          onFrame={setFrame}
          label="Timeline frame"
        />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SampleTable evaluation={evaluation} />
          <SeekOrderCheck timeline={DETERMINISM_TIMELINE} />
        </div>
      </div>
    </PatternSection>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. Kinetic typography                                                      */
/* -------------------------------------------------------------------------- */

const GRANULARITY_OPTIONS: { value: KineticGranularity; label: string }[] = [
  { value: "grapheme", label: "Grapheme" },
  { value: "word", label: "Word" },
  { value: "line", label: "Line" },
];

const DIRECTION_OPTIONS: { value: KineticTextSpec["direction"]; label: string }[] = [
  { value: "forward", label: "Forward" },
  { value: "reverse", label: "Reverse" },
  { value: "from-center", label: "From center" },
  { value: "from-edges", label: "From edges" },
];

const KINETIC_PRESET_OPTIONS = [
  { value: "rise-reveal", label: "Rise reveal" },
  { value: "fade-reveal", label: "Fade reveal" },
  { value: "scale-pop", label: "Scale pop" },
  { value: "track-in", label: "Track in" },
  { value: "slide-exit", label: "Slide exit" },
];

function KineticTextDemo({
  label,
  text,
  frame,
  granularity,
  stagger,
  direction,
  preset,
}: {
  label: string;
  text: string;
  frame: number;
  granularity: KineticGranularity;
  stagger: number;
  direction: KineticTextSpec["direction"];
  preset: string;
}) {
  const reducedMotion = useReducedMotionFlag();
  const spec = useMemo<KineticTextSpec>(
    () => ({
      id: `kinetic-${label.toLowerCase().replace(/\s+/g, "-")}`,
      text,
      granularity,
      startFrame: 0,
      durationFrames: 120,
      stagger,
      direction,
      preset,
      intensity: 0.8,
    }),
    [label, text, granularity, stagger, direction, preset]
  );

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <p className="text-caption text-muted-foreground">{label}</p>
      <div className="min-h-[4.5rem] rounded-surface border border-border bg-surface p-4">
        <KineticText
          spec={spec}
          frame={frame}
          as="p"
          className="font-serif text-body-lg text-foreground"
          ariaLabel={label}
          reducedMotion={reducedMotion}
        />
      </div>
    </div>
  );
}

function KineticSection() {
  const [frame, setFrame] = useState(0);
  const [granularity, setGranularity] = useState<KineticGranularity>("grapheme");
  const [stagger, setStagger] = useState(2);
  const [direction, setDirection] = useState<KineticTextSpec["direction"]>("forward");
  const [preset, setPreset] = useState("rise-reveal");

  const timeline = useMemo<MotionTimeline>(
    () => ({
      schemaVersion: 1,
      id: "kinetic-scrubber",
      fps: DEFAULT_FPS,
      durationFrames: 120,
      nodes: [],
    }),
    []
  );

  return (
    <PatternSection
      id="kinetic"
      title="Kinetic typography"
      description="Text splits into graphemes, words or lines, then animates through a shared stagger pipeline. The same spec works for Latin and CJK runs."
    >
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-wrap items-end gap-4">
          <Select
            label="Granularity"
            options={GRANULARITY_OPTIONS}
            value={granularity}
            onValueChange={(value) => setGranularity(value ?? "grapheme")}
            className="w-36"
          />
          <Select
            label="Direction"
            options={DIRECTION_OPTIONS}
            value={direction}
            onValueChange={(value) => setDirection(value ?? "forward")}
            className="w-40"
          />
          <Select
            label="Preset"
            options={KINETIC_PRESET_OPTIONS}
            value={preset}
            onValueChange={(value) => setPreset(value ?? "rise-reveal")}
            className="w-40"
          />
          <div className="w-48">
            <Slider
              label="Stagger"
              value={stagger}
              min={0}
              max={12}
              step={1}
              showValue
              onValueChange={(next) => setStagger(Array.isArray(next) ? next[0] ?? 0 : next)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <KineticTextDemo
            label="CJK sample"
            text="動きのタイポグラフィ"
            frame={frame}
            granularity={granularity}
            stagger={stagger}
            direction={direction}
            preset={preset}
          />
          <KineticTextDemo
            label="Long line sample"
            text="This is a deliberately long sentence that must wrap inside the container without clipping or breaking the layout rhythm."
            frame={frame}
            granularity={granularity}
            stagger={stagger}
            direction={direction}
            preset={preset}
          />
        </div>

        <MotionScrubber
          timeline={timeline}
          frame={frame}
          onFrame={setFrame}
          label="Kinetic frame"
        />
      </div>
    </PatternSection>
  );
}

/* -------------------------------------------------------------------------- */
/* 4. Coordinated transitions & shared elements                               */
/* -------------------------------------------------------------------------- */

const SHARED_FPS: RationalFps = { num: 30, den: 1 };
const SHARED_DURATION = 120;

const SHARED_ELEMENT_SPEC: SharedElementSpec = createSharedElement({
  semanticId: "shared-card",
  from: {
    transform: { a: 1, b: 0, c: 0, d: 1, e: 24, f: 24 },
    opacity: 1,
    range: { startFrame: 0, endFrame: 50 },
  },
  to: {
    transform: { a: 1, b: 0, c: 0, d: 1, e: 220, f: 48 },
    opacity: 1,
    range: { startFrame: 70, endFrame: 120 },
  },
  handoff: { startFrame: 50, endFrame: 70 },
  collision: "cross-fade",
});

function SharedElementSection() {
  const [frame, setFrame] = useState(0);
  const sample = useMemo(
    () => evaluateSharedElement(SHARED_ELEMENT_SPEC, frame),
    [frame]
  );

  const timeline = useMemo<MotionTimeline>(
    () => ({
      schemaVersion: 1,
      id: "shared-element-scrubber",
      fps: SHARED_FPS,
      durationFrames: SHARED_DURATION,
      nodes: [],
    }),
    []
  );

  const boxStyle: CSSProperties = {
    transform: `matrix(${fmt(sample.transform.a)}, ${fmt(sample.transform.b)}, ${fmt(
      sample.transform.c
    )}, ${fmt(sample.transform.d)}, ${fmt(sample.transform.e)}, ${fmt(sample.transform.f)})`,
    opacity: sample.opacity,
  };

  return (
    <PatternSection
      id="shared-elements"
      title="Coordinated transitions & shared elements"
      description="A semantic identity survives the cut. The handoff window interpolates from the source transform to the target transform; the collision policy decides how both representations share the screen."
    >
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <MetaChip>Phase: {sample.phase}</MetaChip>
          <MetaChip>Owner: {sample.owner}</MetaChip>
          <MetaChip>Collision: {SHARED_ELEMENT_SPEC.collision ?? "cross-fade"}</MetaChip>
        </div>

        <div className="relative h-48 w-full overflow-hidden rounded-surface border border-border bg-canvas">
          <div className="absolute left-4 top-4 rounded-control bg-surface-subtle px-2 py-1 text-caption text-muted-foreground">
            Source shot
          </div>
          <div className="absolute right-4 top-4 rounded-control bg-surface-subtle px-2 py-1 text-caption text-muted-foreground">
            Target shot
          </div>
          <div
            className="absolute left-0 top-0 size-16 rounded-lg border-2 border-primary bg-primary/20"
            style={boxStyle}
            role="img"
            aria-label="Shared element"
          />
        </div>

        <MotionScrubber
          timeline={timeline}
          frame={frame}
          onFrame={setFrame}
          label="Shared element frame"
        />
      </div>
    </PatternSection>
  );
}

/* -------------------------------------------------------------------------- */
/* 5. Vector draw / path trim                                                 */
/* -------------------------------------------------------------------------- */

const DEMO_PATH = createMotionPath({
  id: "signature-curve",
  kind: "cubic",
  anchors: [
    { x: 10, y: 90, out: { x: 60, y: 10 } },
    { x: 150, y: 10, in: { x: 100, y: 90 }, out: { x: 200, y: -40 } },
    { x: 290, y: 90, in: { x: 240, y: 160 } },
  ],
});

const VECTOR_RANGE: FrameRange = { startFrame: 0, endFrame: 90 };

const EASING_OPTIONS: { value: EasingSpec; label: string }[] = [
  { value: "linear", label: "Linear" },
  { value: "ease-in-out", label: "Ease in-out" },
  { value: "ease-out-cubic", label: "Ease out cubic" },
  { value: "ease-in-cubic", label: "Ease in cubic" },
  { value: "ease-in-out-back", label: "Ease in-out back" },
];

function VectorDrawSection() {
  const reducedMotion = useReducedMotionFlag();
  const [frame, setFrame] = useState(0);
  const [easing, setEasing] = useState<EasingSpec>("ease-in-out-cubic");

  const timeline = useMemo<MotionTimeline>(
    () => ({
      schemaVersion: 1,
      id: "vector-scrubber",
      fps: DEFAULT_FPS,
      durationFrames: VECTOR_RANGE.endFrame,
      nodes: [],
    }),
    []
  );

  return (
    <PatternSection
      id="vector-draw"
      title="Vector draw / path trim"
      description="A real cubic curve is revealed by slicing its polyline at the current frame. The source path is never mutated; the trimmed geometry is what gets stroked."
    >
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-wrap items-end gap-4">
          <Select
            label="Easing"
            options={EASING_OPTIONS}
            value={easing}
            onValueChange={(value) => setEasing(value ?? "linear")}
            className="w-44"
          />
        </div>

        <div className="h-40 w-full rounded-surface border border-border bg-canvas p-4">
          <VectorDraw
            path={DEMO_PATH}
            frame={frame}
            range={VECTOR_RANGE}
            easing={easing}
            stroke="var(--km-action-primary)"
            strokeWidth={3}
            ariaLabel="Vector drawing of a cubic curve"
            reducedMotion={reducedMotion}
          />
        </div>

        <MotionScrubber
          timeline={timeline}
          frame={frame}
          onFrame={setFrame}
          label="Draw frame"
        />
      </div>
    </PatternSection>
  );
}

/* -------------------------------------------------------------------------- */
/* 6. Shape morphing                                                          */
/* -------------------------------------------------------------------------- */

const SQUARE_SHAPE: ContourShape = {
  contours: [
    {
      points: [
        { x: 10, y: 10 },
        { x: 90, y: 10 },
        { x: 90, y: 90 },
        { x: 10, y: 90 },
      ],
      closed: true,
    },
  ],
};

const CIRCLE_LIKE_SHAPE: ContourShape = {
  contours: [
    {
      points: [
        { x: 50, y: 5 },
        { x: 85, y: 20 },
        { x: 95, y: 50 },
        { x: 85, y: 80 },
        { x: 50, y: 95 },
        { x: 15, y: 80 },
        { x: 5, y: 50 },
        { x: 15, y: 20 },
      ],
      closed: true,
    },
  ],
};

const DIAMOND_SHAPE: ContourShape = {
  contours: [
    {
      points: [
        { x: 50, y: 5 },
        { x: 95, y: 50 },
        { x: 50, y: 95 },
        { x: 5, y: 50 },
      ],
      closed: true,
    },
  ],
};

const TWO_CIRCLES_SHAPE: ContourShape = {
  contours: [
    {
      points: [
        { x: 25, y: 5 },
        { x: 45, y: 25 },
        { x: 25, y: 45 },
        { x: 5, y: 25 },
      ],
      closed: true,
    },
    {
      points: [
        { x: 75, y: 5 },
        { x: 95, y: 25 },
        { x: 75, y: 45 },
        { x: 55, y: 25 },
      ],
      closed: true,
    },
  ],
};

const MORPH_RANGE: FrameRange = { startFrame: 0, endFrame: 90 };

function MorphPair({
  label,
  from,
  to,
  frame,
}: {
  label: string;
  from: ContourShape;
  to: ContourShape;
  frame: number;
}) {
  const reducedMotion = useReducedMotionFlag();
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <p className="text-caption text-muted-foreground">{label}</p>
      <div className="h-40 rounded-surface border border-border bg-canvas p-4">
        <ShapeMorphView
          from={from}
          to={to}
          frame={frame}
          range={MORPH_RANGE}
          fill="var(--km-action-primary)"
          stroke="var(--km-action-primary)"
          ariaLabel={label}
          reducedMotion={reducedMotion}
        />
      </div>
    </div>
  );
}

function ShapeMorphSection() {
  const [frame, setFrame] = useState(0);

  const timeline = useMemo<MotionTimeline>(
    () => ({
      schemaVersion: 1,
      id: "morph-scrubber",
      fps: DEFAULT_FPS,
      durationFrames: MORPH_RANGE.endFrame,
      nodes: [],
    }),
    []
  );

  return (
    <PatternSection
      id="shape-morph"
      title="Shape morphing"
      description="Compatible topologies morph point-wise; incompatible pairs fall back to an explicit dissolve or cut so the failure is never silent."
    >
      <div className="flex min-w-0 flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <MorphPair label="Compatible: square to circle" from={SQUARE_SHAPE} to={CIRCLE_LIKE_SHAPE} frame={frame} />
          <MorphPair label="Incompatible: diamond to two circles" from={DIAMOND_SHAPE} to={TWO_CIRCLES_SHAPE} frame={frame} />
        </div>

        <MotionScrubber
          timeline={timeline}
          frame={frame}
          onFrame={setFrame}
          label="Morph frame"
        />
      </div>
    </PatternSection>
  );
}

/* -------------------------------------------------------------------------- */
/* 7. Masks & reveals                                                         */
/* -------------------------------------------------------------------------- */

const MASK_RECT = { x: 0, y: 0, width: 256, height: 128 };

const MASK_SPECS: { kind: "clip" | "alpha" | "luma"; label: string; spec: MaskSpecLocal }[] = [
  {
    kind: "clip",
    label: "Clip reveal",
    spec: { id: "mask-clip", kind: "clip", rect: MASK_RECT, axis: "left-to-right" },
  },
  {
    kind: "alpha",
    label: "Alpha matte",
    spec: { id: "mask-alpha", kind: "alpha", rect: MASK_RECT, axis: "radial" },
  },
  {
    kind: "luma",
    label: "Luma matte",
    spec: { id: "mask-luma", kind: "luma", rect: MASK_RECT, axis: "top-to-bottom" },
  },
];

function MaskCard({
  label,
  spec,
  progress,
}: {
  label: string;
  spec: MaskSpecLocal;
  progress: number;
}) {
  const reducedMotion = useReducedMotionFlag();
  const { capability, fallback } = maskCapability(spec);
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-caption text-muted-foreground">{label}</p>
        <MetaChip>{capability}</MetaChip>
        <MetaChip>fallback: {fallback}</MetaChip>
      </div>
      <div className="h-32 rounded-surface border border-border bg-canvas p-4">
        <MaskRevealView
          spec={spec}
          progress={progress}
          className="h-full w-full"
          reducedMotion={reducedMotion}
        >
          <div className="flex h-full w-full items-center justify-center rounded-md bg-gradient-to-br from-primary to-secondary text-center text-inverse-foreground">
            <span className="px-4 font-serif text-subheading">Revealed content</span>
          </div>
        </MaskRevealView>
      </div>
    </div>
  );
}

function MasksSection() {
  const [frame, setFrame] = useState(0);
  const progress = frame / 89;

  const timeline = useMemo<MotionTimeline>(
    () => ({
      schemaVersion: 1,
      id: "mask-scrubber",
      fps: DEFAULT_FPS,
      durationFrames: 90,
      nodes: [],
    }),
    []
  );

  return (
    <PatternSection
      id="masks"
      title="Masks & reveals"
      description="Clip, alpha and luma mattes share one geometric sweep. Each declares its capability and fallback so a renderer that cannot honour luma degrades gracefully."
    >
      <div className="flex min-w-0 flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MASK_SPECS.map((entry) => (
            <MaskCard key={entry.kind} label={entry.label} spec={entry.spec} progress={progress} />
          ))}
        </div>

        <MotionScrubber
          timeline={timeline}
          frame={frame}
          onFrame={setFrame}
          label="Reveal progress frame"
        />
      </div>
    </PatternSection>
  );
}

/* -------------------------------------------------------------------------- */
/* 8. Motion paths                                                            */
/* -------------------------------------------------------------------------- */

const MOTION_PATH = createMotionPath({
  id: "loop-path",
  kind: "cubic",
  anchors: [
    { x: 20, y: 120, out: { x: 80, y: 20 } },
    { x: 160, y: 20, in: { x: 120, y: 120 }, out: { x: 200, y: -40 } },
    { x: 300, y: 120, in: { x: 260, y: 200 }, out: { x: 340, y: 60 } },
    { x: 420, y: 60, in: { x: 380, y: 160 } },
  ],
});

function MotionPathSection() {
  const [frame, setFrame] = useState(0);
  const [arcLength, setArcLength] = useState(true);
  const [orient, setOrient] = useState(true);

  const t = frame / 119;
  const point = pointOnPath(MOTION_PATH, t, { arcLength });
  const angle = orient ? angleOnPath(MOTION_PATH, t, { arcLength }) : 0;

  const timeline = useMemo<MotionTimeline>(
    () => ({
      schemaVersion: 1,
      id: "path-scrubber",
      fps: DEFAULT_FPS,
      durationFrames: 120,
      nodes: [],
    }),
    []
  );

  return (
    <PatternSection
      id="motion-paths"
      title="Motion paths"
      description="A target follows a cubic path. Toggle arc-length parameterisation for even travel, and orient-to-tangent so the target aligns with the curve."
    >
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <Switch label="Arc length" checked={arcLength} onCheckedChange={setArcLength} />
          <Switch label="Orient to tangent" checked={orient} onCheckedChange={setOrient} />
        </div>

        <div className="relative h-48 w-full overflow-hidden rounded-surface border border-border bg-canvas">
          <svg
            className="absolute inset-0 h-full w-full"
            viewBox="0 0 440 160"
            preserveAspectRatio="xMidYMid meet"
            aria-label="Motion path"
          >
            <path
              d={pathToSvgD(MOTION_PATH)}
              fill="none"
              stroke="var(--km-border-subtle)"
              strokeWidth={2}
              strokeDasharray="4 4"
            />
          </svg>
          <div
            className="absolute size-6 rounded-full border-2 border-primary bg-primary/80"
            style={{
              left: `${fmt(point.x)}px`,
              top: `${fmt(point.y)}px`,
              transform: `translate(-50%, -50%) rotate(${fmt(angle)}rad)`,
            }}
            role="img"
            aria-label="Moving target"
          />
        </div>

        <MotionScrubber
          timeline={timeline}
          frame={frame}
          onFrame={setFrame}
          label="Path frame"
        />
      </div>
    </PatternSection>
  );
}

/* -------------------------------------------------------------------------- */
/* 9. Easing & springs                                                        */
/* -------------------------------------------------------------------------- */

const PLOT_FRAMES = 60;
const PLOT_FPS: RationalFps = { num: 30, den: 1 };

function EasingPlot({ name, samples }: { name: string; samples: number[] }) {
  const width = 120;
  const height = 48;
  const points = samples
    .map((value, index) => {
      const x = (index / (samples.length - 1)) * width;
      const y = height - value * height;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <p className="text-caption text-muted-foreground">{name}</p>
      <svg
        className="w-full rounded-control border border-border bg-canvas"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        aria-label={`${name} curve`}
      >
        <polyline
          fill="none"
          stroke="var(--km-action-primary)"
          strokeWidth={2}
          points={points}
        />
      </svg>
    </div>
  );
}

function EasingSpringsSection() {
  const [frame, setFrame] = useState(0);

  const easingSamples = useMemo(() => {
    const names: EasingSpec[] = [
      "linear",
      "ease-in-out",
      "ease-out-cubic",
      "ease-in-back",
      "ease-out-back",
    ];
    return names.map((name) => ({
      name: String(name),
      samples: Array.from({ length: PLOT_FRAMES + 1 }, (_, f) =>
        evaluateEasing(name, f / PLOT_FRAMES)
      ),
    }));
  }, []);

  const springSamples = useMemo(() => {
    return Object.entries(SPRING_PRESETS).map(([name, preset]) => {
      const settle = springSettleFrames(preset.params, PLOT_FPS);
      const samples = Array.from({ length: PLOT_FRAMES + 1 }, (_, f) => {
        const t = f / PLOT_FPS.num;
        return springValue(t, preset.params);
      });
      return { name, params: preset.params, settle, samples };
    });
  }, []);

  const timeline = useMemo<MotionTimeline>(
    () => ({
      schemaVersion: 1,
      id: "easing-scrubber",
      fps: PLOT_FPS,
      durationFrames: PLOT_FRAMES,
      nodes: [],
    }),
    []
  );

  return (
    <PatternSection
      id="easing-springs"
      title="Easing & springs"
      description="Named easings and analytic spring presets are evaluated at explicit frames. Springs are closed-form: no integration, no wall clock, identical results in any order."
    >
      <div className="flex min-w-0 flex-col gap-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {easingSamples.map((entry) => (
            <EasingPlot key={entry.name} name={entry.name} samples={entry.samples} />
          ))}
        </div>

        <div
          className="overflow-x-auto rounded-surface border border-border bg-surface"
          tabIndex={0}
          aria-label="Spring preset values"
        >
          <table className="w-full text-left text-body-sm">
            <thead className="border-b border-border bg-surface-subtle">
              <tr>
                <th className="px-3 py-2 font-medium text-foreground">Spring</th>
                <th className="px-3 py-2 font-medium text-foreground">Mass</th>
                <th className="px-3 py-2 font-medium text-foreground">Stiffness</th>
                <th className="px-3 py-2 font-medium text-foreground">Damping</th>
                <th className="px-3 py-2 font-medium text-foreground">Settle frames</th>
                <th className="px-3 py-2 font-medium text-foreground">Value at {frame}f</th>
              </tr>
            </thead>
            <tbody>
              {springSamples.map((entry) => {
                const t = frame / PLOT_FPS.num;
                const value = springValue(t, entry.params);
                return (
                  <tr key={entry.name} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 font-medium text-foreground">{entry.name}</td>
                    <td className="px-3 py-2 font-mono text-caption">{entry.params.mass}</td>
                    <td className="px-3 py-2 font-mono text-caption">{entry.params.stiffness}</td>
                    <td className="px-3 py-2 font-mono text-caption">{entry.params.damping}</td>
                    <td className="px-3 py-2 font-mono text-caption">{entry.settle}</td>
                    <td className="px-3 py-2 font-mono text-caption">{fmt(value)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <MotionScrubber
          timeline={timeline}
          frame={frame}
          onFrame={setFrame}
          label="Easing frame"
        />
      </div>
    </PatternSection>
  );
}

/* -------------------------------------------------------------------------- */
/* 10. Presets                                                                */
/* -------------------------------------------------------------------------- */

function PresetCard({
  preset,
  state,
  onChange,
  reducedMotion,
}: {
  preset: MotionPreset;
  state: { frame: number; timing: number; intensity: number };
  onChange: (next: Partial<{ frame: number; timing: number; intensity: number }>) => void;
  reducedMotion: boolean;
}) {
  const nodes = useMemo(
    () =>
      materializePreset({
        preset: preset.name,
        targetId: `preset-${preset.name}`,
        startFrame: 0,
        timing: state.timing,
        intensity: state.intensity,
      }).nodes,
    [preset.name, state.timing, state.intensity]
  );

  const timeline = useMemo<MotionTimeline>(
    () => ({
      schemaVersion: 1,
      id: `preset-${preset.name}`,
      fps: DEFAULT_FPS,
      durationFrames: state.timing + 1,
      nodes,
    }),
    [preset.name, state.timing, nodes]
  );

  const durationParam = preset.params.find((p) => p.name === "durationFrames");
  const otherParams = preset.params.filter((p) => p.name !== "durationFrames");

  return (
    <Surface className="min-w-0">
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-serif text-subheading font-normal tracking-subheading text-foreground">
            {preset.name}
          </h3>
          <MetaChip>{preset.role}</MetaChip>
        </div>
        <p className="text-body-sm text-muted-foreground">{preset.description}</p>

        <div className="h-24 rounded-surface border border-border bg-canvas">
          <MotionStage
            timeline={timeline}
            frame={state.frame}
            width={240}
            height={96}
            ariaLabel={`${preset.name} preview`}
            reducedMotion={reducedMotion}
          >
            <MotionBox targetId={`preset-${preset.name}`} className="size-8 rounded-md bg-primary" />
          </MotionStage>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Slider
              label="Timing"
              value={state.timing}
              min={resolveTiming(undefined, { ...preset, defaults: presetDefaults(preset) })}
              max={Math.max(60, durationParam?.max ?? 60)}
              step={1}
              showValue
              formatValue={(value) => `${value}f`}
              onValueChange={(next) =>
                onChange({
                  timing: Array.isArray(next) ? next[0] ?? state.timing : next,
                  frame: 0,
                })
              }
            />
            <Slider
              label="Intensity"
              value={state.intensity}
              min={0}
              max={1}
              step={0.05}
              showValue
              onValueChange={(next) =>
                onChange({ intensity: Array.isArray(next) ? next[0] ?? state.intensity : next })
              }
            />
          </div>
          {otherParams.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {otherParams.map((param) => (
                <MetaChip key={param.name}>
                  {param.name}: {param.default}
                  {param.unit ? param.unit : ""}
                </MetaChip>
              ))}
            </div>
          ) : null}
        </div>

        <MotionScrubber
          timeline={timeline}
          frame={state.frame}
          onFrame={(frame) => onChange({ frame })}
          label={`${preset.name} frame`}
        />
      </div>
    </Surface>
  );
}

function PresetsSection() {
  const reducedMotion = useReducedMotionFlag();
  const presets = useMemo(() => listPresets().map((preset) => MOTION_PRESETS[preset.name]), []);
  const [states, setStates] = useState<Record<string, { frame: number; timing: number; intensity: number }>>(() => {
    const initial: Record<string, { frame: number; timing: number; intensity: number }> = {};
    for (const preset of listPresets()) {
      const full = MOTION_PRESETS[preset.name];
      initial[preset.name] = {
        frame: 0,
        timing: resolveTiming(undefined, full),
        intensity: 1,
      };
    }
    return initial;
  });

  const updateState = useCallback(
    (name: string, next: Partial<{ frame: number; timing: number; intensity: number }>) => {
      setStates((current) => ({
        ...current,
        [name]: { ...current[name], ...next },
      }));
    },
    []
  );

  return (
    <PatternSection
      id="presets"
      title="Presets"
      description="Every preset is built from the same serialisable instance. Timing controls duration; intensity scales amplitude. The two are independent."
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {presets.map((preset) => (
          <PresetCard
            key={preset.name}
            preset={preset}
            state={states[preset.name]}
            onChange={(next) => updateState(preset.name, next)}
            reducedMotion={reducedMotion}
          />
        ))}
      </div>
    </PatternSection>
  );
}

/* -------------------------------------------------------------------------- */
/* 11. Storyboard                                                             */
/* -------------------------------------------------------------------------- */

function ShotRow({ shot, index }: { shot: StoryboardShot; index: number }) {
  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-3 py-2 font-mono text-caption">{index + 1}</td>
      <td className="px-3 py-2 text-body-sm font-medium text-foreground">{shot.id}</td>
      <td className="px-3 py-2 text-caption text-muted-foreground">{shot.sceneRef}</td>
      <td className="px-3 py-2 font-mono text-caption">
        {shot.startFrame}–{shot.startFrame + shot.durationFrames - 1}
      </td>
      <td className="px-3 py-2 text-body-sm">{shot.claim}</td>
      <td className="px-3 py-2 text-caption text-muted-foreground">{shot.focusTarget}</td>
      <td className="px-3 py-2 text-caption text-muted-foreground">
        {shot.narrationCue ?? "—"}
      </td>
      <td className="px-3 py-2 text-caption text-muted-foreground">
        {shot.onScreenLabels.join(", ")}
      </td>
      <td className="px-3 py-2 text-caption text-muted-foreground">
        {shot.exitHandoff
          ? `${shot.exitHandoff.semanticId} → ${shot.exitHandoff.targetSceneRef}`
          : "—"}
      </td>
      <td className="px-3 py-2 text-caption text-muted-foreground">
        {shot.staticFallback ?? "—"}
      </td>
    </tr>
  );
}

function TimelineStrip({
  board,
  frame,
  onFrameChange,
}: {
  board: Storyboard;
  frame: number;
  onFrameChange: (frame: number) => void;
}) {
  const total = board.durationFrames;
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="relative h-10 w-full rounded-surface border border-border bg-surface">
        {board.shots.map((shot) => {
          const left = (shot.startFrame / total) * 100;
          const width = (shot.durationFrames / total) * 100;
          const active = frame >= shot.startFrame && frame < shot.startFrame + shot.durationFrames;
          return (
            <button
              key={shot.id}
              type="button"
              onClick={() => onFrameChange(shot.startFrame)}
              className={cx(
                "absolute top-1 bottom-1 rounded-sm border text-caption",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-surface-subtle text-foreground hover:bg-surface-elevated"
              )}
              style={{ left: `${left}%`, width: `${width}%` }}
              aria-label={`Jump to shot ${shot.id}`}
            >
              {shot.id}
            </button>
          );
        })}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-primary"
          style={{ left: `${(frame / total) * 100}%` }}
          aria-hidden="true"
        />
      </div>
      <p className="text-caption text-muted-foreground">
        {formatFrame(frame, board.durationFrames, board.fps)} · shot: {shotAt(board, frame)?.id ?? "none"}
      </p>
    </div>
  );
}

function StoryboardDiagnostics({ diagnostics }: { diagnostics: { code: string; severity: string; message: string }[] }) {
  if (diagnostics.length === 0) {
    return (
      <p className="rounded-control border border-status-success/30 bg-status-success/10 px-3 py-2 text-body-sm text-status-success">
        No diagnostics.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {diagnostics.map((diagnostic, index) => (
        <li
          key={index}
          className={cx(
            "rounded-control border px-3 py-2 text-body-sm",
            diagnostic.severity === "error"
              ? "border-status-danger/30 bg-status-danger/10 text-status-danger"
              : "border-status-warning/30 bg-status-warning/10 text-status-warning"
          )}
        >
          <code className="rounded-sm bg-surface px-1 text-caption">{diagnostic.code}</code>{" "}
          {diagnostic.message}
        </li>
      ))}
    </ul>
  );
}

function StoryboardCard({
  board,
}: {
  board: Storyboard;
}) {
  const [frame, setFrame] = useState(0);
  const diagnostics = useMemo(() => validateStoryboard(board), [board]);
  const summary = useMemo(() => storyboardSummary(board), [board]);
  const chain = useMemo(() => handoffChain(board), [board]);
  const clips = useMemo(() => toStoryboardClips(board), [board]);

  return (
    <Surface className="min-w-0">
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-serif text-subheading font-normal tracking-subheading text-foreground">
              {board.title}
            </h3>
            <p className="text-caption text-muted-foreground">
              {summary.shots} shots · {summary.durationFrames} frames · {summary.totalSeconds.toFixed(1)}s ·{" "}
              {summary.handoffs} handoffs
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {summary.identities.map((identity) => (
              <MetaChip key={identity}>{identity}</MetaChip>
            ))}
          </div>
        </div>

        <TimelineStrip board={board} frame={frame} onFrameChange={setFrame} />

        <div
          className="overflow-x-auto rounded-surface border border-border bg-surface"
          tabIndex={0}
          aria-label="Shot list"
        >
          <table className="w-full text-left text-body-sm">
            <thead className="border-b border-border bg-surface-subtle">
              <tr>
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">ID</th>
                <th className="px-3 py-2">Scene</th>
                <th className="px-3 py-2">Range</th>
                <th className="px-3 py-2">Claim</th>
                <th className="px-3 py-2">Focus</th>
                <th className="px-3 py-2">Cue</th>
                <th className="px-3 py-2">Labels</th>
                <th className="px-3 py-2">Exit handoff</th>
                <th className="px-3 py-2">Fallback</th>
              </tr>
            </thead>
            <tbody>
              {board.shots.map((shot, index) => (
                <ShotRow key={shot.id} shot={shot} index={index} />
              ))}
            </tbody>
          </table>
        </div>

        {chain.length > 0 ? (
          <div className="flex flex-col gap-2">
            <h3 className="text-body-sm font-medium text-foreground">Handoff chain</h3>
            <ul className="flex flex-col gap-1 text-body-sm">
              {chain.map((handoff, index) => (
                <li key={index} className="text-muted-foreground">
                  <span className="font-medium text-foreground">{handoff.semanticId}</span> from{" "}
                  {handoff.fromShotId} → {handoff.toShotId ? handoff.toShotId : "unresolved"} (
                  {handoff.toSceneRef})
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="flex flex-col gap-2">
          <h3 className="text-body-sm font-medium text-foreground">Clips</h3>
          <div className="flex flex-wrap gap-2">
            {clips.map((clip) => (
              <MetaChip key={clip.id}>
                {clip.sceneRef}: {clip.startFrame}–{clip.startFrame + clip.durationFrames - 1}
              </MetaChip>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-body-sm font-medium text-foreground">Validation</h3>
          <StoryboardDiagnostics diagnostics={diagnostics} />
        </div>
      </div>
    </Surface>
  );
}

function StoryboardSection() {
  const negativeFixture = NEGATIVE_STORYBOARDS[0];
  const negativeDiagnostics = useMemo(
    () => (negativeFixture ? validateStoryboard(negativeFixture.board) : []),
    [negativeFixture]
  );

  return (
    <PatternSection
      id="storyboard"
      title="Storyboard"
      description="Storyboards are plain data: shots tile the timeline, each carries a claim and a static fallback, and handoffs carry semantic identities across cuts."
    >
      <div className="flex min-w-0 flex-col gap-6">
        <div className="flex flex-wrap items-center gap-2">
          <MetaChip>schema version {STORYBOARD_SCHEMA_VERSION}</MetaChip>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {STORYBOARD_FIXTURES.slice(0, 2).map((fixture) => (
            <StoryboardCard key={fixture.id} board={fixture.board} />
          ))}
        </div>

        {negativeFixture ? (
          <Surface className="min-w-0">
            <div className="flex min-w-0 flex-col gap-3">
              <h3 className="font-serif text-subheading font-normal tracking-subheading text-foreground">
                Teaching example: {negativeFixture.id}
              </h3>
              <p className="text-body-sm text-muted-foreground">
                A deliberately broken board that isolates one diagnostic. Expected codes:{" "}
                {negativeFixture.expectedCodes.join(", ")}.
              </p>
              <StoryboardDiagnostics diagnostics={negativeDiagnostics} />
            </div>
          </Surface>
        ) : null}
      </div>
    </PatternSection>
  );
}

/* -------------------------------------------------------------------------- */
/* 12. Golden fixtures                                                        */
/* -------------------------------------------------------------------------- */

function GoldenFixturesSection() {
  const reducedMotion = useReducedMotionFlag();
  const [selectedId, setSelectedId] = useState(MOTION_FIXTURES[0]?.id ?? "");
  const [frame, setFrame] = useState(0);

  const fixture = useMemo(() => fixtureById(selectedId), [selectedId]);
  const frames = useMemo(() => MOTION_FIXTURE_FRAMES[selectedId] ?? [], [selectedId]);
  const digest = MOTION_FIXTURE_DIGESTS[selectedId];
  const sampleList = useMemo(
    () => (fixture ? sampleFixture(fixture, [frame]) : []),
    [fixture, frame]
  );
  const sample = sampleList[0];

  const options = useMemo(
    () => MOTION_FIXTURES.map((f: { id: string }) => ({ value: f.id, label: f.id })),
    []
  );

  const sampleTarget = useMemo(() => {
    if (!sample) return null;
    const keys = Object.keys(sample.values);
    return keys.length > 0 ? { targetId: keys[0].split(".")[0] ?? keys[0] } : null;
  }, [sample]);

  if (MOTION_FIXTURES.length === 0) {
    return (
      <PatternSection
        id="golden-fixtures"
        title="Golden fixtures"
        description="Deterministic fixtures with pinned coverage frames and digests."
      >
        <p className="text-body-sm text-muted-foreground">No golden fixtures available.</p>
      </PatternSection>
    );
  }

  return (
    <PatternSection
      id="golden-fixtures"
      title="Golden fixtures"
      description="Deterministic fixtures with pinned coverage frames and digests. Selecting any fixture evaluates it at a coverage frame; the stored digest stays stable across runs."
    >
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-wrap items-end gap-4">
          <Select
            label="Fixture"
            options={options}
            value={selectedId}
            onValueChange={(value) => {
              setSelectedId(value ?? options[0].value);
              setFrame(0);
            }}
            className="w-56"
          />
          {fixture ? (
            <div className="flex flex-wrap gap-2">
              <MetaChip>{fixture.description}</MetaChip>
              <MetaChip>digest: {digest ?? "—"}</MetaChip>
            </div>
          ) : null}
        </div>

        {fixture ? (
          <>
            <div className="flex flex-wrap gap-2">
              <span className="text-body-sm text-muted-foreground">
                {frames.length} coverage frames:
              </span>
              {frames.slice(0, 24).map((f: number) => (
                <Button
                  key={f}
                  size="sm"
                  variant={frame === f ? "primary" : "outline"}
                  onClick={() => setFrame(f)}
                >
                  {f}
                </Button>
              ))}
              {frames.length > 24 ? (
                <MetaChip>+{frames.length - 24} more</MetaChip>
              ) : null}
            </div>

            <div className="h-48 w-full max-w-full overflow-hidden rounded-surface border border-border bg-canvas">
              <MotionStage
                timeline={fixture.timeline}
                frame={frame}
                width={640}
                height={192}
                ariaLabel={`Golden fixture ${fixture.id}`}
                reducedMotion={reducedMotion}
                onEvaluation={() => {}}
              >
                {sampleTarget ? (
                  <MotionBox targetId={sampleTarget.targetId} className="size-8 rounded-md bg-primary" />
                ) : null}
              </MotionStage>
            </div>

            <div className="rounded-surface border border-border bg-surface p-4">
              <h3 className="text-body-sm font-medium text-foreground">Current sample</h3>
              {sample ? (
                <pre className="mt-2 overflow-x-auto font-mono text-caption text-muted-foreground">
                  {JSON.stringify(sample.values, null, 2)}
                </pre>
              ) : (
                <p className="text-body-sm text-muted-foreground">No sample at this frame.</p>
              )}
            </div>
          </>
        ) : null}
      </div>
    </PatternSection>
  );
}

/* -------------------------------------------------------------------------- */
/* 13. Graphic composition                                                   */
/* -------------------------------------------------------------------------- */

const GRAPHIC_FIXTURE = fixtureById("graphic-composition");

function GraphicCompositionSection() {
  const reducedMotion = useReducedMotionFlag();
  const fixture = GRAPHIC_FIXTURE;
  // Frame 0 is an honest opening beat (the route plan and scaffolding only), so
  // the section opens on a representative frame and reads as a finished
  // composition on first sight.
  const [frame, setFrame] = useState(() =>
    Math.round(Math.max(1, fixture?.timeline.durationFrames ?? 1) * 0.72),
  );

  if (!fixture) {
    return (
      <PatternSection
        id="graphic-composition"
        title="Graphic composition"
        description="A coordinated, frame-driven SVG scene built from the same deterministic primitives."
      >
        <p className="text-body-sm text-muted-foreground">Graphic composition fixture is not available.</p>
      </PatternSection>
    );
  }

  return (
    <PatternSection
      id="graphic-composition"
      title="Graphic composition"
      description="A coordinated SVG scene: a path-driven route, staggered stations, a traveling packet, a masked detail panel and a live shape morph, all driven by one deterministic timeline."
    >
      <div className="flex min-w-0 flex-col gap-4">
        <div className="aspect-video w-full overflow-hidden rounded-surface border border-border bg-canvas">
          <GraphicComposition
            timeline={fixture.timeline}
            frame={frame}
            reducedMotion={reducedMotion}
            ariaLabel="Graphic composition scene"
            className="h-full w-full"
          />
        </div>
        <MotionScrubber
          timeline={fixture.timeline}
          frame={frame}
          onFrame={setFrame}
          label="Composition frame"
        />
      </div>
    </PatternSection>
  );
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Showcase page for the MG1 2D motion system. Every animated value is a pure
 * function of an explicit integer frame; only MotionScrubber advances frames.
 */
export function MotionGalleryPage() {
  const [previewReducedMotion, setReducedMotion] = useState(false);
  const systemReducedMotion = usePrefersReducedMotion();
  const reducedMotion = systemReducedMotion || previewReducedMotion;

  return (
    <MotionConfig reducedMotion="user">
      <ReducedMotionContext.Provider value={reducedMotion}>
        <div className="min-h-screen bg-canvas p-4 py-8 md:p-8 md:py-10">
          <div className="mx-auto flex max-w-5xl flex-col gap-16">
            <Header
              reducedMotion={reducedMotion}
              systemReducedMotion={systemReducedMotion}
              onReducedMotionChange={setReducedMotion}
            />
            <PatternSection id="camera-stage" title="Camera stage" description="One scene, multiple output formats. Establish the composition, move into a detail, cut to a second subject, track across the scene, then pull back. Screen-space titles stay fixed.">
              <a href="#/storyboard/camera" className="mb-4 w-fit text-body-sm text-foreground underline underline-offset-4">Open camera storyboard — 2D and 3D</a>
              <CameraDemo reducedMotion={reducedMotion} />
            </PatternSection>
            <TimelinesSection />
            <KineticSection />
            <SharedElementSection />
            <VectorDrawSection />
            <ShapeMorphSection />
            <MasksSection />
            <MotionPathSection />
            <EasingSpringsSection />
            <PresetsSection />
            <StoryboardSection />
            <GraphicCompositionSection />
            <GoldenFixturesSection />
          </div>
        </div>
      </ReducedMotionContext.Provider>
    </MotionConfig>
  );
}

export default MotionGalleryPage;
