import { useMemo, useState } from "react";

import { toContourShape } from "../../registry/motion/advanced-morph";
import type { MorphTopologyStrategy } from "../../registry/motion/advanced-morph";
import { parseColor } from "../../registry/motion/interpolate";
import { translationMatrix } from "../../registry/motion/matrix";
import type { MotionTimeline, Rect } from "../../registry/motion/types";
import { compileVisualTransformation } from "../../registry/motion/visual-transformation";
import { VisualTransformation } from "../../registry/motion/visual-transformation-react";
import type { VisualElement, VisualTransformationSpec } from "../../registry/motion/visual-transformation-types";
import { Button } from "../ui/button";
import { MORPH_DEMO_SHAPES } from "./advanced-shape-morph-shapes";
import type { MorphDemoShapeId } from "./advanced-shape-morph-shapes";
import { STRATEGIES } from "./advanced-shape-morph-demo";
import { MotionScrubber, usePrefersReducedMotion } from "./react";
import { TRANSFORMATION_REFERENCE_THEMES } from "./visual-transformation-reference";

const WIDTH = 1280;
const HEIGHT = 720;
const FPS = { num: 30, den: 1 };
const DURATION = 120;
const RANGE = { startFrame: 15, endFrame: 105 };

/** Three identities whose contours change topology: parts split, a hole closes, a hole appears. */
const SUBJECTS: { id: string; from: MorphDemoShapeId; to: MorphDemoShapeId; label: string; x: number }[] = [
  { id: "parts", from: "disc", to: "dots", label: "One part becomes three", x: 110 },
  { id: "holes", from: "ring", to: "square", label: "A hole closes", x: 490 },
  { id: "counters", from: "gear", to: "capsule", label: "One hole becomes two", x: 870 },
];

function topologySpec(themeId: keyof typeof TRANSFORMATION_REFERENCE_THEMES, strategy: MorphTopologyStrategy): VisualTransformationSpec {
  const theme = TRANSFORMATION_REFERENCE_THEMES[themeId];
  const accents = [theme.accent, theme.secondary, theme.ink].map((hex) => parseColor(hex));
  const ink = parseColor(theme.ink);
  const muted = parseColor(theme.muted);
  const rect = (x: number, y: number, width: number, height = width): Rect => ({ x, y, width, height });
  const text = (id: string, value: string, bounds: Rect, fontSize: number, fill = ink): VisualElement => ({
    id, semanticId: id, layout: bounds, fill,
    content: { kind: "text", bounds: rect(0, 0, bounds.width, bounds.height), text: value, fontSize, fontFamily: '"Geist Variable", Arial, sans-serif' },
  });
  const subject = (index: number, side: "from" | "to"): VisualElement => {
    const item = SUBJECTS[index];
    const shape = toContourShape(MORPH_DEMO_SHAPES[item[side]].input).shape;
    return {
      id: `${item.id}-${side}`, semanticId: item.id, layout: rect(item.x, 196, 300),
      transform: translationMatrix(0, side === "to" ? 24 : 0),
      fill: accents[(index + (side === "to" ? 1 : 0)) % accents.length],
      content: { kind: "shape", bounds: rect(0, 0, 240), shape },
    };
  };
  const labels = SUBJECTS.map((item) => text(`label-${item.id}`, item.label, rect(item.x + 30, 574, 300, 40), 28, muted));
  const heading = [
    text("title", "Topology morph", rect(56, 44, WIDTH - 112, 60), 52),
    text("caption", "VisualTransformation selects AdvancedShapeMorph when contours differ", rect(58, 114, WIDTH - 116, 36), 24, muted),
  ];
  return {
    schemaVersion: 1, id: "topology-morph", fps: FPS, durationFrames: DURATION, range: RANGE, easing: "ease-in-out-cubic",
    morph: { topologyStrategy: strategy },
    from: { id: "before", elements: [...heading, ...SUBJECTS.map((_, index) => subject(index, "from")), ...labels] },
    to: { id: "after", elements: [...heading, ...SUBJECTS.map((_, index) => subject(index, "to")), ...labels] },
  };
}

export interface VisualTransformationTopologyDemoProps {
  initialFrame?: number;
  reducedMotion?: boolean;
}

/** A VT1 fragment in which `auto` picks `topology-morph` for three identities whose contour topology changes. */
export function VisualTransformationTopologyDemo({ initialFrame = 60, reducedMotion: reducedOverride }: VisualTransformationTopologyDemoProps) {
  const [frame, setFrame] = useState(initialFrame);
  const [themeId, setThemeId] = useState<keyof typeof TRANSFORMATION_REFERENCE_THEMES>("theme-a");
  const [strategy, setStrategy] = useState<MorphTopologyStrategy>("split-merge");
  const prefersReducedMotion = usePrefersReducedMotion();
  const reducedMotion = reducedOverride ?? prefersReducedMotion;
  const compiled = useMemo(() => compileVisualTransformation(topologySpec(themeId, strategy)), [themeId, strategy]);
  const timeline = useMemo<MotionTimeline>(() => ({ schemaVersion: 1, id: "topology-morph-playback", fps: FPS, durationFrames: DURATION, nodes: [] }), []);
  const morphDecisions = compiled.decisions.filter((decision) => SUBJECTS.some((item) => decision.mappingId.startsWith(`match-${item.id}`)));

  return (
    <div className="mx-auto flex max-w-6xl min-w-0 flex-col gap-6 [overflow-wrap:anywhere]">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <fieldset className="min-w-0 space-y-2">
          <legend className="text-body-sm text-muted-foreground">Topology strategy (mapping <code>morph</code> option)</legend>
          <div className="flex flex-wrap gap-2">
            {STRATEGIES.map((option) => (
              <Button key={option.id} size="sm" variant={option.id === strategy ? "primary" : "outline"} aria-pressed={option.id === strategy} onClick={() => setStrategy(option.id)}>
                {option.label}
              </Button>
            ))}
          </div>
        </fieldset>
        <fieldset className="min-w-0 space-y-2">
          <legend className="text-body-sm text-muted-foreground">Color roles</legend>
          <div className="flex flex-wrap gap-2">
            {(["theme-a", "theme-b"] as const).map((value, index) => (
              <Button key={value} size="sm" variant={themeId === value ? "primary" : "outline"} aria-pressed={themeId === value} onClick={() => setThemeId(value)}>
                Theme {index === 0 ? "A" : "B"}
              </Button>
            ))}
          </div>
        </fieldset>
      </div>
      <figure className="m-0 flex min-w-0 flex-col gap-3">
        <div className="w-full overflow-hidden rounded-surface border border-border" style={{ background: TRANSFORMATION_REFERENCE_THEMES[themeId].surface }}>
          <VisualTransformation transformation={compiled} frame={frame} reducedMotion={reducedMotion} width={WIDTH} height={HEIGHT}
            label="Three shapes change topology: a disc splits into three dots, a ring closes into a rounded square, a gear with one hole becomes a capsule with two holes"
            style={{ display: "block", width: "100%", height: "auto" }} />
        </div>
        <figcaption className="text-body-sm text-muted-foreground">
          Position and color come from VT1 tracks; the contours come from AdvancedShapeMorph. {reducedMotion ? "Reduced motion is on; the final frame is shown." : "Play or scrub to inspect any frame."}
        </figcaption>
      </figure>
      <MotionScrubber timeline={timeline} frame={frame} onFrame={setFrame} label="Transformation frame" />
      <section aria-labelledby="topology-decisions-title" className="space-y-3 border-t border-border pt-6">
        <h2 id="topology-decisions-title" className="text-title font-medium">Compiler decisions</h2>
        <ul className="space-y-3 text-body-sm">
          {morphDecisions.map((decision) => (
            <li key={decision.mappingId} className="break-words">
              <span className="font-medium">{decision.mappingId}: {decision.requested} → {decision.selected}</span>
              <p className="text-muted-foreground">{decision.reason}</p>
            </li>
          ))}
        </ul>
        {compiled.diagnostics.length > 0 ? (
          <ul className="space-y-2 text-body-sm">
            {compiled.diagnostics.map((diagnostic, index) => (
              <li key={`${diagnostic.code}-${index}`}><span className="font-mono text-caption text-muted-foreground">{diagnostic.code}</span> {diagnostic.message}</li>
            ))}
          </ul>
        ) : <p className="text-body-sm text-muted-foreground">No warnings.</p>}
      </section>
    </div>
  );
}
