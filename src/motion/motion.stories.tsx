import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import {
  GraphicComposition,
  KineticText,
  MaskRevealView,
  MotionBox,
  MotionScrubber,
  MotionStage,
  ShapeMorphView,
  VectorDraw,
} from "./react";
import type {
  FrameRange,
  MotionTimeline,
  RationalFps,
} from "../../registry/motion/types";
import type { MotionPath } from "../../registry/motion/paths";
import { createMotionPath } from "../../registry/motion/paths";
import type { ContourShape } from "../../registry/motion/morph";
import { fixtureById } from "./motion-fixtures";
import { CameraDemo } from "./camera-demo";
import { RevealDemo } from "./reveal-demo";
import { DiagramDemo } from "./diagram-demo";

const FPS_30: RationalFps = { num: 30, den: 1 };

const meta = {
  title: "Motion/React",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const CameraChoreography: Story = {
  render: () => <div className="min-h-screen bg-canvas p-6 text-foreground"><CameraDemo /></div>,
};

export const ProgressiveExplanation: Story = {
  render: () => <div className="min-h-screen bg-canvas p-6 text-foreground"><RevealDemo /></div>,
};

export const DiagramReflow: Story = {
  render: () => <div className="min-h-screen bg-canvas p-6 text-foreground"><DiagramDemo /></div>,
};

/* -------------------------------------------------------------------------- */
/* Shared helpers                                                             */
/* -------------------------------------------------------------------------- */

function slideTimeline(): MotionTimeline {
  return {
    schemaVersion: 1,
    id: "slide-demo",
    fps: FPS_30,
    durationFrames: 60,
    nodes: [
      {
        kind: "track",
        id: "box-transform",
        track: {
          id: "box-transform",
          targetId: "box",
          property: "transform",
          valueType: "transform",
          keyframes: [
            { frame: 0, value: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 } },
            {
              frame: 59,
              value: { a: 1, b: 0, c: 0, d: 1, e: 180, f: 0 },
              easing: "ease-out-cubic",
            },
          ],
        },
      },
      {
        kind: "track",
        id: "box-opacity",
        track: {
          id: "box-opacity",
          targetId: "box",
          property: "opacity",
          valueType: "opacity",
          keyframes: [
            { frame: 0, value: 0 },
            { frame: 59, value: 1, easing: "ease-out-cubic" },
          ],
        },
      },
    ],
  };
}

function samplePath(): MotionPath {
  return createMotionPath({
    id: "signature",
    kind: "cubic",
    anchors: [
      { x: 10, y: 90, out: { x: 30, y: 20 } },
      { x: 50, y: 50, in: { x: 40, y: 80 }, out: { x: 70, y: 20 } },
      { x: 90, y: 90, in: { x: 80, y: 50 } },
    ],
    closed: false,
  });
}

const WIPE_RANGE: FrameRange = { startFrame: 0, endFrame: 60 };

function squareShape(): ContourShape {
  return {
    contours: [
      {
        points: [
          { x: 20, y: 20 },
          { x: 80, y: 20 },
          { x: 80, y: 80 },
          { x: 20, y: 80 },
        ],
        closed: true,
      },
    ],
  };
}

function circleShape(): ContourShape {
  const points: { x: number; y: number }[] = [];
  const cx = 50;
  const cy = 50;
  const r = 35;
  for (let i = 0; i < 24; i += 1) {
    const a = (i / 24) * Math.PI * 2;
    points.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  return { contours: [{ points, closed: true }] };
}

function triangleShape(): ContourShape {
  return {
    contours: [
      {
        points: [{ x: 50, y: 15 }, { x: 85, y: 85 }, { x: 15, y: 85 }],
        closed: true,
      },
    ],
  };
}

/* -------------------------------------------------------------------------- */
/* Kinetic text                                                               */
/* -------------------------------------------------------------------------- */

const englishSpec = {
  id: "kinetic-english",
  text: "Rise into place",
  granularity: "grapheme" as const,
  startFrame: 0,
  durationFrames: 60,
  fps: FPS_30,
  stagger: 2,
};

export const KineticTextDefault: Story = {
  render: () => (
    <div className="min-h-screen bg-canvas p-6 text-foreground">
      <div className="mx-auto max-w-3xl rounded-surface border border-border bg-surface p-6">
        <h2 className="font-serif text-heading-sm font-normal text-foreground">
          Kinetic text
        </h2>
        <p className="mb-4 text-body-sm text-muted-foreground">
          Frame 18 of a rise reveal. Full text is exposed to assistive tech via a
          visually hidden span.
        </p>
        <p className="font-sans text-body-lg">
          <KineticText spec={englishSpec} frame={18} />
        </p>
      </div>
    </div>
  ),
};

export const KineticTextCJK: Story = {
  render: () => (
    <div className="min-h-screen bg-canvas p-6 text-foreground">
      <div className="mx-auto max-w-3xl rounded-surface border border-border bg-surface p-6">
        <h2 className="font-serif text-heading-sm font-normal text-foreground">
          CJK kinetic text
        </h2>
        <p className="mb-4 text-body-sm text-muted-foreground">
          Grapheme segmentation never splits inside a cluster.
        </p>
        <p className="font-sans text-body-lg">
          <KineticText
            spec={{
              id: "kinetic-cjk",
              text: "動きのある文字",
              granularity: "grapheme",
              startFrame: 0,
              durationFrames: 60,
              fps: FPS_30,
              stagger: 2,
            }}
            frame={22}
          />
        </p>
      </div>
    </div>
  ),
};

export const KineticTextLong: Story = {
  render: () => (
    <div className="min-h-screen bg-canvas p-6 text-foreground">
      <div className="mx-auto max-w-md rounded-surface border border-border bg-surface p-6">
        <h2 className="font-serif text-heading-sm font-normal text-foreground">
          Long text wrapping
        </h2>
        <p className="mb-4 text-body-sm text-muted-foreground">
          Long text wraps between tokens without clipping or breaking inside a
          grapheme.
        </p>
        <p className="font-sans text-body">
          <KineticText
            spec={{
              id: "kinetic-long",
              text:
                "This sentence is deliberately long so it has to wrap across multiple lines while each grapheme animates independently.",
              granularity: "grapheme",
              startFrame: 0,
              durationFrames: 120,
              fps: FPS_30,
              stagger: 1,
            }}
            frame={45}
          />
        </p>
      </div>
    </div>
  ),
};

export const KineticTextRTL: Story = {
  render: () => (
    <div className="min-h-screen bg-canvas p-6 text-foreground">
      <div
        className="mx-auto max-w-3xl rounded-surface border border-border bg-surface p-6"
        dir="rtl"
      >
        <h2 className="font-serif text-heading-sm font-normal text-foreground">
          Right-to-left kinetic text
        </h2>
        <p className="mb-4 text-body-sm text-muted-foreground">
          Tokens flow in logical order; layout direction is inherited from the
          container.
        </p>
        <p className="font-sans text-body-lg">
          <KineticText
            spec={{
              id: "kinetic-rtl",
              text: "النص يتحرك",
              granularity: "grapheme",
              startFrame: 0,
              durationFrames: 60,
              fps: FPS_30,
              stagger: 2,
            }}
            frame={20}
          />
        </p>
      </div>
    </div>
  ),
};

/* -------------------------------------------------------------------------- */
/* Vector draw                                                                */
/* -------------------------------------------------------------------------- */

const vectorPath = samplePath();

function VectorStory({ frame }: { frame: number }) {
  return (
    <div className="h-48 w-96 rounded-surface border border-border bg-surface p-4">
      <VectorDraw
        path={vectorPath}
        frame={frame}
        range={WIPE_RANGE}
        stroke="var(--km-action-primary)"
        strokeWidth={3}
        ariaLabel="Signature stroke reveal"
      />
    </div>
  );
}

export const VectorDrawPartial: Story = {
  render: () => (
    <div className="min-h-screen bg-canvas p-6 text-foreground">
      <div className="mx-auto max-w-4xl rounded-surface border border-border bg-surface p-6">
        <h2 className="font-serif text-heading-sm font-normal text-foreground">
          Vector draw — partial reveal
        </h2>
        <p className="mb-4 text-body-sm text-muted-foreground">
          The SVG path is genuinely trimmed; no dashed-stroke clip trick.
        </p>
        <VectorStory frame={24} />
      </div>
    </div>
  ),
};

export const VectorDrawComplete: Story = {
  render: () => (
    <div className="min-h-screen bg-canvas p-6 text-foreground">
      <div className="mx-auto max-w-4xl rounded-surface border border-border bg-surface p-6">
        <h2 className="font-serif text-heading-sm font-normal text-foreground">
          Vector draw — complete
        </h2>
        <p className="mb-4 text-body-sm text-muted-foreground">
          At the end of the range the full polyline is exposed.
        </p>
        <VectorStory frame={60} />
      </div>
    </div>
  ),
};

/* -------------------------------------------------------------------------- */
/* Shape morph                                                                */
/* -------------------------------------------------------------------------- */

const MORPH_RANGE: FrameRange = { startFrame: 0, endFrame: 60 };

export const ShapeMorphCompatible: Story = {
  render: () => (
    <div className="min-h-screen bg-canvas p-6 text-foreground">
      <div className="mx-auto max-w-4xl rounded-surface border border-border bg-surface p-6">
        <h2 className="font-serif text-heading-sm font-normal text-foreground">
          Compatible morph
        </h2>
        <p className="mb-4 text-body-sm text-muted-foreground">
          Square and circle share one closed contour with the same winding.
        </p>
        <div className="h-64 w-64">
          <ShapeMorphView
            from={squareShape()}
            to={circleShape()}
            frame={30}
            range={MORPH_RANGE}
            fill="var(--km-action-subtle)"
            stroke="var(--km-action-primary)"
            ariaLabel="Square morphing into a circle"
          />
        </div>
      </div>
    </div>
  ),
};

export const ShapeMorphIncompatible: Story = {
  render: () => (
    <div className="min-h-screen bg-canvas p-6 text-foreground">
      <div className="mx-auto max-w-4xl rounded-surface border border-border bg-surface p-6">
        <h2 className="font-serif text-heading-sm font-normal text-foreground">
          Incompatible morph fallback
        </h2>
        <p className="mb-4 text-body-sm text-muted-foreground">
          A square (4 points) and a triangle (3 points) cannot morph point-wise, so
          the component cross-fades instead of rendering a broken path.
        </p>
        <div className="h-64 w-64">
          <ShapeMorphView
            from={squareShape()}
            to={triangleShape()}
            frame={30}
            range={MORPH_RANGE}
            fill="var(--km-action-subtle)"
            stroke="var(--km-action-primary)"
            ariaLabel="Square cross-fading to a triangle"
          />
        </div>
      </div>
    </div>
  ),
};

/* -------------------------------------------------------------------------- */
/* Mask reveal                                                                */
/* -------------------------------------------------------------------------- */

function MaskStory({
  kind,
  axis,
  progress,
  reduced,
}: {
  kind: "clip" | "alpha" | "luma";
  axis: "left-to-right" | "top-to-bottom" | "radial";
  progress: number;
  reduced?: boolean;
}) {
  const spec = {
    id: `mask-${kind}`,
    kind,
    axis,
    rect: { x: 0, y: 0, width: 320, height: 180 },
    feather: 0,
  };

  return (
    <div
      className="relative h-[180px] w-[320px] overflow-hidden rounded-surface border border-border bg-surface"
      style={{ width: 320, height: 180 }}
    >
      <MaskRevealView spec={spec} progress={progress} reducedMotion={reduced}>
        <div className="flex h-full w-full items-center justify-center bg-subtle">
          <span className="text-heading-sm font-medium text-foreground">
            Revealed content
          </span>
        </div>
      </MaskRevealView>
    </div>
  );
}

export const MaskRevealClip: Story = {
  render: () => (
    <div className="min-h-screen bg-canvas p-6 text-foreground">
      <div className="mx-auto max-w-4xl rounded-surface border border-border bg-surface p-6">
        <h2 className="font-serif text-heading-sm font-normal text-foreground">
          Clip mask reveal
        </h2>
        <p className="mb-4 text-body-sm text-muted-foreground">
          Uses CSS clip-path for a hard-edged geometric reveal.
        </p>
        <MaskStory kind="clip" axis="left-to-right" progress={0.6} />
      </div>
    </div>
  ),
};

export const MaskRevealAlpha: Story = {
  render: () => (
    <div className="min-h-screen bg-canvas p-6 text-foreground">
      <div className="mx-auto max-w-4xl rounded-surface border border-border bg-surface p-6">
        <h2 className="font-serif text-heading-sm font-normal text-foreground">
          Alpha matte reveal
        </h2>
        <p className="mb-4 text-body-sm text-muted-foreground">
          Uses an SVG mask with alpha compositing.
        </p>
        <MaskStory kind="alpha" axis="top-to-bottom" progress={0.75} />
      </div>
    </div>
  ),
};

export const MaskRevealLuma: Story = {
  render: () => (
    <div className="min-h-screen bg-canvas p-6 text-foreground">
      <div className="mx-auto max-w-4xl rounded-surface border border-border bg-surface p-6">
        <h2 className="font-serif text-heading-sm font-normal text-foreground">
          Luma matte reveal
        </h2>
        <p className="mb-4 text-body-sm text-muted-foreground">
          Uses an SVG mask with luminance compositing.
        </p>
        <MaskStory kind="luma" axis="radial" progress={0.5} />
      </div>
    </div>
  ),
};

export const MaskRevealReducedMotion: Story = {
  render: () => (
    <div className="min-h-screen bg-canvas p-6 text-foreground">
      <div className="mx-auto max-w-4xl rounded-surface border border-border bg-surface p-6">
        <h2 className="font-serif text-heading-sm font-normal text-foreground">
          Reduced motion mask
        </h2>
        <p className="mb-4 text-body-sm text-muted-foreground">
          With reduced motion the mask resolves to the fully revealed end state.
        </p>
        <MaskStory kind="clip" axis="left-to-right" progress={0.2} reduced />
      </div>
    </div>
  ),
};

export const MaskRevealTransformedFeather: Story = {
  render: () => (
    <div className="min-h-screen bg-canvas p-6 text-foreground">
      <div className="mx-auto max-w-3xl space-y-4">
        <h2 className="font-serif text-heading-sm font-normal">Transformed soft reveal</h2>
        <p className="text-body-sm text-muted-foreground">
          The authored rotation and soft edge share the same resolved geometry in DOM and SVG scenes.
        </p>
        <div className="relative h-60 w-full overflow-hidden rounded-surface border border-border bg-surface">
          <MaskRevealView
            spec={{
              id: "rotated-feather",
              kind: "clip",
              rect: { x: 40, y: 35, width: 240, height: 160 },
              transform: { a: 0.966, b: 0.259, c: -0.259, d: 0.966, e: 25, f: -25 },
              feather: 16,
            }}
            progress={0.8}
            reducedMotion={false}
            className="h-full w-full"
          >
            <div className="flex h-full items-center bg-primary px-16 text-primary-foreground">
              <span className="text-heading-sm">動きと形 / Motion</span>
            </div>
          </MaskRevealView>
        </div>
      </div>
    </div>
  ),
};

/* -------------------------------------------------------------------------- */
/* MotionBox inside MotionStage                                               */
/* -------------------------------------------------------------------------- */

function StageAtFrame({ frame, label }: { frame: number; label: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <p className="text-caption text-muted-foreground">{label}</p>
      <MotionStage
        timeline={slideTimeline()}
        frame={frame}
        width={240}
        height={120}
        background="var(--km-surface-subtle)"
        ariaLabel={`Motion stage at frame ${frame}`}
      >
        <MotionBox
          targetId="box"
          className="flex h-12 w-12 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-medium"
        >
          box
        </MotionBox>
      </MotionStage>
    </div>
  );
}

export const MotionBoxKeyframes: Story = {
  render: () => (
    <div className="min-h-screen bg-canvas p-6 text-foreground">
      <div className="mx-auto max-w-4xl rounded-surface border border-border bg-surface p-6">
        <h2 className="font-serif text-heading-sm font-normal text-foreground">
          MotionBox at keyframes
        </h2>
        <p className="mb-4 text-body-sm text-muted-foreground">
          Three deterministic snapshots of the same timeline at frames 0, 30 and
          59.
        </p>
        <div className="flex flex-wrap gap-4">
          <StageAtFrame frame={0} label="Frame 0" />
          <StageAtFrame frame={30} label="Frame 30" />
          <StageAtFrame frame={59} label="Frame 59" />
        </div>
      </div>
    </div>
  ),
};

/* -------------------------------------------------------------------------- */
/* MotionScrubber                                                             */
/* -------------------------------------------------------------------------- */

export const MotionScrubberPlayAndInterrupt: Story = {
  render: () => {
    const [frame, setFrame] = useState(0);
    return (
      <div className="min-h-screen bg-canvas p-6 text-foreground">
        <div className="mx-auto max-w-4xl rounded-surface border border-border bg-surface p-6">
          <h2 className="font-serif text-heading-sm font-normal text-foreground">
            Motion scrubber
          </h2>
          <p className="mb-4 text-body-sm text-muted-foreground">
            Play advances the integer frame by wall-clock delta; Restart seeks to
            frame 0 mid-flight.
          </p>
          <div className="mb-4">
            <MotionScrubber
              timeline={slideTimeline()}
              frame={frame}
              onFrame={setFrame}
              label="Timeline frame"
            />
          </div>
          <StageAtFrame frame={frame} label={`Live preview — frame ${frame}`} />
        </div>
      </div>
    );
  },
};

/* -------------------------------------------------------------------------- */
/* Light / dark and narrow width                                              */
/* -------------------------------------------------------------------------- */

export const LightDark: Story = {
  render: () => (
    <div data-km-appearance="dark" className="min-h-screen bg-canvas p-6 text-foreground">
      <div className="mx-auto max-w-4xl rounded-surface border border-border bg-surface p-6">
        <h2 className="font-serif text-heading-sm font-normal text-foreground">
          Dark appearance
        </h2>
        <p className="mb-4 text-body-sm text-muted-foreground">
          All motion components inherit the active Kumiki appearance tokens.
        </p>
        <div className="flex flex-wrap gap-4">
          <StageAtFrame frame={30} label="MotionBox" />
          <div className="h-48 w-96 rounded-surface border border-border bg-surface p-4">
            <VectorDraw
              path={vectorPath}
              frame={36}
              range={WIPE_RANGE}
              stroke="var(--km-action-primary)"
              strokeWidth={3}
            />
          </div>
        </div>
      </div>
    </div>
  ),
};

export const NarrowWidth: Story = {
  render: () => (
    <div className="min-h-screen bg-canvas p-6 text-foreground">
      <div className="mx-auto w-64 rounded-surface border border-border bg-surface p-4">
        <h2 className="font-serif text-heading-sm font-normal text-foreground">
          Narrow stage
        </h2>
        <p className="mb-4 text-body-sm text-muted-foreground">
          Content reflows without clipping inside a 240 px wide stage.
        </p>
        <MotionStage
          timeline={slideTimeline()}
          frame={30}
          width={224}
          height={160}
          background="var(--km-surface-subtle)"
          ariaLabel="Narrow motion stage"
        >
          <MotionBox
            targetId="box"
            className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-medium"
          >
            box
          </MotionBox>
        </MotionStage>
        <div className="mt-4">
          <p className="font-sans text-body-sm">
            <KineticText
              spec={{
                id: "kinetic-narrow",
                text:
                  "A longer sentence that must wrap inside this narrow card.",
                granularity: "word",
                startFrame: 0,
                durationFrames: 60,
                fps: FPS_30,
                stagger: 2,
              }}
              frame={30}
            />
          </p>
        </div>
      </div>
    </div>
  ),
};

/* -------------------------------------------------------------------------- */
/* GraphicComposition                                                         */
/* -------------------------------------------------------------------------- */

const GRAPHIC_COMPOSITION_FIXTURE = fixtureById("graphic-composition");
const GRAPHIC_COMPOSITION_TIMELINE = GRAPHIC_COMPOSITION_FIXTURE?.timeline ?? null;

/** The gallery's opening frame: a fully composed scene rather than frame 0. */
const GRAPHIC_COMPOSITION_OPENING_FRAME = Math.round(
  Math.max(1, GRAPHIC_COMPOSITION_TIMELINE?.durationFrames ?? 1) * 0.72,
);

export const GraphicCompositionScene: Story = {
  render: () => {
    const [frame, setFrame] = useState(GRAPHIC_COMPOSITION_OPENING_FRAME);
    return (
      <div className="min-h-screen bg-canvas p-6 text-foreground">
        <div className="mx-auto flex max-w-4xl flex-col gap-4">
          <h2 className="font-serif text-heading-sm font-normal text-foreground">
            Graphic composition
          </h2>
          <p className="text-body-sm text-muted-foreground">
            One deterministic timeline drives the route guide, the draw, the staggered stations, the
            traveling packet, the masked detail panel and the shape morph. Scrub to inspect any frame;
            the scene letterboxes inside the 16:9 stage.
          </p>
          {GRAPHIC_COMPOSITION_TIMELINE ? (
            <>
              <div className="aspect-video w-full overflow-hidden rounded-surface border border-border bg-canvas">
                <GraphicComposition
                  timeline={GRAPHIC_COMPOSITION_TIMELINE}
                  frame={frame}
                  className="h-full w-full"
                />
              </div>
              <MotionScrubber
                timeline={GRAPHIC_COMPOSITION_TIMELINE}
                frame={frame}
                onFrame={setFrame}
                label="Composition frame"
              />
            </>
          ) : (
            <p className="text-body-sm text-muted-foreground">
              Graphic composition fixture is not available.
            </p>
          )}
        </div>
      </div>
    );
  },
};

export const GraphicCompositionNarrowDark: Story = {
  render: () => (
    <div data-km-appearance="dark" className="min-h-screen bg-canvas p-6 text-foreground">
      <div className="mx-auto w-72 rounded-surface border border-border bg-surface p-4">
        <h2 className="font-serif text-heading-sm font-normal text-foreground">
          Narrow, dark appearance
        </h2>
        <p className="mb-4 text-body-sm text-muted-foreground">
          The scene scales with its container: at 240 px wide the route, stations, packet and detail
          panel stay legible and nothing clips.
        </p>
        {GRAPHIC_COMPOSITION_TIMELINE ? (
          <div className="aspect-video w-full overflow-hidden rounded-surface border border-border bg-canvas">
            <GraphicComposition
              timeline={GRAPHIC_COMPOSITION_TIMELINE}
              frame={480}
              ariaLabel="Graphic composition scene, narrow dark"
              className="h-full w-full"
            />
          </div>
        ) : (
          <p className="text-body-sm text-muted-foreground">
            Graphic composition fixture is not available.
          </p>
        )}
      </div>
    </div>
  ),
};
