import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { MotionConfig } from "motion/react";

import { RevealDemo } from "./reveal-demo";
import { MotionScrubber } from "./react";
import { createRevealTimeline } from "../../registry/motion/progressive-reveal";
import {
  ProgressiveReveal,
  RevealItem,
  RevealLayer,
} from "../../registry/motion/progressive-reveal-react";

const meta = {
  title: "Motion/Progressive Reveal",
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <MotionConfig reducedMotion="user">
        <Story />
      </MotionConfig>
    ),
  ],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/* -------------------------------------------------------------------------- */
/* Shared scene                                                               */
/* -------------------------------------------------------------------------- */

const DEMO_TIMELINE = createRevealTimeline({
  id: "progressive-reveal-story",
  fps: { num: 30, den: 1 },
  durationFrames: 150,
  cues: [
    { id: "title", frame: 0 },
    { id: "first", frame: 30 },
    { id: "second", frame: 75 },
    { id: "third", frame: 120 },
  ],
  steps: [
    { id: "title", at: { cue: "title" }, effect: "fade" },
    { id: "first", at: { cue: "first" }, effect: "rise", distance: 28 },
    { id: "second", at: { cue: "second" }, effect: "rise", distance: 28 },
    { id: "third", at: { cue: "third" }, effect: "fade" },
    { id: "summary", at: { cue: "third" }, effect: "fade" },
  ],
});

function Scene({
  frame,
  reducedMotion,
}: {
  frame: number;
  reducedMotion?: boolean;
}) {
  return (
    <ProgressiveReveal
      timeline={DEMO_TIMELINE}
      frame={frame}
      reducedMotion={reducedMotion}
      className="flex min-w-0 flex-col gap-5"
    >
      <svg
        viewBox="0 0 800 320"
        role="img"
        aria-label="Three elements introduced in sequence, followed by a summary"
        className="w-full rounded-surface border border-border bg-surface"
        style={{ color: "var(--km-text-primary)" }}
      >
        <RevealLayer targetId="title">
          <text
            x="40"
            y="60"
            fontFamily="inherit"
            fontSize="28"
            fill="currentColor"
          >
            Build the explanation one step at a time.
          </text>
        </RevealLayer>
        <RevealLayer targetId="first">
          <g transform="translate(180 180)">
            <rect
              x="-60"
              y="-60"
              width="120"
              height="120"
              rx="20"
              fill="var(--km-surface-subtle)"
              stroke="var(--km-border-strong)"
              strokeWidth="2"
            />
            <text
              y="90"
              textAnchor="middle"
              fontFamily="inherit"
              fontSize="22"
              fill="currentColor"
            >
              First
            </text>
          </g>
        </RevealLayer>
        <RevealLayer targetId="second">
          <g transform="translate(400 180)">
            <circle r="60" fill="var(--km-action-primary)" />
            <text
              y="90"
              textAnchor="middle"
              fontFamily="inherit"
              fontSize="22"
              fill="currentColor"
            >
              Second
            </text>
          </g>
        </RevealLayer>
        <RevealLayer targetId="third">
          <g transform="translate(620 180)">
            <rect
              x="-60"
              y="-60"
              width="120"
              height="120"
              rx="20"
              fill="var(--km-surface-subtle)"
              stroke="var(--km-action-primary)"
              strokeWidth="4"
            />
            <path
              d="M -30 0 L -5 25 L 35 -25"
              fill="none"
              stroke="var(--km-action-primary)"
              strokeWidth="10"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <text
              y="90"
              textAnchor="middle"
              fontFamily="inherit"
              fontSize="22"
              fill="currentColor"
            >
              Third
            </text>
          </g>
        </RevealLayer>
        <RevealLayer targetId="summary">
          <text
            x="400"
            y="290"
            textAnchor="middle"
            fontFamily="inherit"
            fontSize="20"
            fill="currentColor"
          >
            Each entrance is tied to a named cue or an absolute frame.
          </text>
        </RevealLayer>
      </svg>

      <div className="grid gap-3 md:grid-cols-3">
        {[
          [
            "first",
            "Cue-driven",
            "Steps can start at named cues so the timeline stays readable.",
          ],
          [
            "second",
            "Frame-driven",
            "Authors can also pin entrances to exact frame numbers.",
          ],
          [
            "third",
            "Stable layout",
            "Elements reserve their final position before they appear.",
          ],
        ].map(([id, title, copy]) => (
          <RevealItem
            key={id}
            targetId={id}
            className="rounded-surface border border-border bg-surface p-4"
          >
            <h3 className="mb-2 text-body font-medium text-foreground">
              {title}
            </h3>
            <p className="text-body-sm text-muted-foreground">{copy}</p>
          </RevealItem>
        ))}
      </div>
    </ProgressiveReveal>
  );
}

function Page({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-canvas px-4 py-8 text-foreground md:px-8 md:py-12">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="max-w-prose space-y-3">
          <h1 className="font-serif text-heading font-normal break-words">
            Progressive reveal
          </h1>
          <p className="text-body text-muted-foreground">
            Stage DOM and SVG content with frame or cue-driven entrances,
            readable holds, and reduced-motion support.
          </p>
        </header>
        {children}
      </div>
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/* Stories                                                                    */
/* -------------------------------------------------------------------------- */

export const CueDrivenSequence: Story = {
  render: () => (
    <Page>
      <section className="space-y-4">
        <h2 className="font-serif text-heading-sm font-normal break-words">
          Cue-driven sequence
        </h2>
        <p className="text-body-sm text-muted-foreground">
          The full staged explanation from the storyboard page. Scrub through
          the frames to see how cues trigger each entrance.
        </p>
        <RevealDemo />
      </section>
    </Page>
  ),
};

export const FrameSnapshots: Story = {
  render: () => (
    <Page>
      <section className="space-y-4">
        <h2 className="font-serif text-heading-sm font-normal break-words">
          Frame-driven snapshots
        </h2>
        <p className="text-body-sm text-muted-foreground">
          The same timeline evaluated at three different frames. No animation
          runtime is required to render a deterministic still.
        </p>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {[0, 60, 149].map((frame) => (
            <div key={frame} className="flex min-w-0 flex-col gap-2">
              <p className="text-body-sm text-muted-foreground">
                Frame {frame}
              </p>
              <div className="rounded-surface border border-border bg-surface p-3">
                <Scene frame={frame} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </Page>
  ),
};

export const ReducedMotion: Story = {
  render: () => {
    const [frame, setFrame] = useState(0);
    return (
      <Page>
        <section className="space-y-4">
          <h2 className="font-serif text-heading-sm font-normal break-words">
            Reduced motion
          </h2>
          <p className="text-body-sm text-muted-foreground">
            With reduced motion enabled, the scene resolves to its final state
            so the content is available without entrance animation.
          </p>
          <Scene frame={frame} reducedMotion />
          <MotionScrubber
            timeline={DEMO_TIMELINE}
            frame={frame}
            onFrame={setFrame}
            label="Reveal frame"
          />
        </section>
      </Page>
    );
  },
};
