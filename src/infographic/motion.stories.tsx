import type { Meta, StoryObj } from "@storybook/react-vite";
import { useMemo, useState } from "react";
import { MotionConfig } from "motion/react";

import {
  buildInfographic,
  primitiveBounds,
  type InfographicLayout,
  type InfographicPrimitive,
  type RectInfo,
} from "../infographic";
import { PrimitiveShape } from "../infographic/react";
import { RAG_EXPLAINER } from "../infographic/fixtures";
import {
  MotionScrubber,
  ProgressiveReveal,
  RevealLayer,
} from "../motion/react";
import { createRevealTimeline } from "../../registry/motion/progressive-reveal";
import { Surface } from "../ui/surface-card";

const meta = {
  title: "Infographic/Motion",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const HEADER_ROLES = new Set([
  "infographic-title",
  "infographic-subtitle",
  "infographic-thesis",
]);

function rectCenter(rect: RectInfo): { x: number; y: number } {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

function pointInRect(point: { x: number; y: number }, rect: RectInfo): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

interface PrimitiveGroup {
  id: string;
  label: string;
  primitives: InfographicPrimitive[];
}

function groupBySection(layout: InfographicLayout): PrimitiveGroup[] {
  const groups: PrimitiveGroup[] = [];
  const header: InfographicPrimitive[] = [];
  const sectionBuckets = new Map<string, InfographicPrimitive[]>();

  for (const section of layout.sections) {
    sectionBuckets.set(section.id, []);
  }

  for (const primitive of layout.primitives) {
    if (primitive.role === "infographic-background") continue;
    if (primitive.role && HEADER_ROLES.has(primitive.role)) {
      header.push(primitive);
      continue;
    }

    const bounds = primitiveBounds(primitive);
    if (!bounds) continue;
    const center = rectCenter(bounds);

    let placed = false;
    for (const section of layout.sections) {
      if (pointInRect(center, section)) {
        sectionBuckets.get(section.id)?.push(primitive);
        placed = true;
        break;
      }
    }

    if (!placed) {
      let nearest: { id: string; distance: number } | null = null;
      for (const section of layout.sections) {
        const sc = rectCenter(section);
        const distance = Math.hypot(center.x - sc.x, center.y - sc.y);
        if (!nearest || distance < nearest.distance) {
          nearest = { id: section.id, distance };
        }
      }
      if (nearest) {
        sectionBuckets.get(nearest.id)?.push(primitive);
      }
    }
  }

  if (header.length > 0) {
    groups.push({ id: "header", label: "Header", primitives: header });
  }

  for (const section of layout.sections) {
    const primitives = sectionBuckets.get(section.id) ?? [];
    if (primitives.length > 0) {
      groups.push({
        id: section.id,
        label: section.title,
        primitives,
      });
    }
  }

  return groups;
}

function buildTimeline(groups: PrimitiveGroup[]) {
  const cues = groups.map((group, index) => ({
    id: group.id,
    frame: index * 35,
  }));
  const durationFrames = cues.length * 35 + 40;
  return createRevealTimeline({
    id: "infographic-reveal",
    fps: { num: 30, den: 1 },
    durationFrames,
    cues,
    steps: groups.map((group, index) => ({
      id: group.id,
      at: { cue: group.id },
      durationFrames: 30,
      effect: index === 0 ? "fade" : "rise",
      distance: 24,
    })),
  });
}

function ProgressiveInfographic({ layout }: { layout: InfographicLayout }) {
  const groups = useMemo(() => groupBySection(layout), [layout]);
  const timeline = useMemo(() => buildTimeline(groups), [groups]);
  const [frame, setFrame] = useState(timeline.durationFrames - 1);

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <ProgressiveReveal timeline={timeline} frame={frame}>
        <svg
          role="img"
          aria-label={`Progressive reveal of ${layout.metadata?.title ?? layout.sourceId}`}
          viewBox={`0 0 ${layout.canvas.width} ${layout.canvas.height}`}
          className="w-full rounded-surface border border-border bg-canvas"
          style={{ display: "block" }}
        >
          <rect
            x={0}
            y={0}
            width={layout.canvas.width}
            height={layout.canvas.height}
            fill={layout.canvas.background}
          />
          {groups.map((group) => (
            <RevealLayer key={group.id} targetId={group.id}>
              <g data-km-reveal-group={group.id}>
                {group.primitives.map((primitive) => (
                  <PrimitiveShape key={primitive.id} primitive={primitive} />
                ))}
              </g>
            </RevealLayer>
          ))}
        </svg>
      </ProgressiveReveal>
      <MotionScrubber
        timeline={timeline}
        frame={frame}
        onFrame={setFrame}
        label="Reveal frame"
      />
      <div className="flex flex-wrap gap-2">
        {groups.map((group) => (
          <span
            key={group.id}
            className="rounded-control border border-border bg-surface px-2 py-1 text-caption text-foreground"
          >
            {group.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export const ProgressiveRevealShowcase: Story = {
  render: () => {
    const layout = useMemo(
      () =>
        buildInfographic(RAG_EXPLAINER, {
          template: "process-journey",
          artDirection: "editorial",
          profile: "youtube-landscape",
        }),
      []
    );

    return (
      <MotionConfig reducedMotion="user">
        <div className="min-h-screen bg-canvas p-4 py-8 md:p-8 md:py-10">
          <div className="mx-auto flex max-w-5xl flex-col gap-6">
            <header className="flex min-w-0 flex-col gap-1">
              <h1 className="font-serif text-heading font-normal tracking-heading text-foreground break-words">
                Infographic motion
              </h1>
              <p className="max-w-prose text-body text-muted-foreground">
                A showcase adapter: the resolved primitives are grouped by
                section frame, then revealed through the existing{" "}
                <code className="text-caption">ProgressiveReveal</code>{" "}
                primitive. The static frame opens fully revealed; use the
                scrubber to watch the staged entrance.
              </p>
            </header>
            <Surface>
              <div className="flex min-w-0 flex-col gap-3">
                <ProgressiveInfographic layout={layout} />
              </div>
            </Surface>
          </div>
        </div>
      </MotionConfig>
    );
  },
};
