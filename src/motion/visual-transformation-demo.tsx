import { useMemo, useState } from "react";
import { createVisualTransformationProgram } from "../../registry/motion/visual-transformation";
import { VisualTransformation } from "../../registry/motion/visual-transformation-react";
import { TRANSFORMATION_RECIPES } from "../../registry/motion/transformation-recipes";
import { StoryboardShots } from "../../registry/motion/storyboard-shots";
import type { MotionTimeline } from "../../registry/motion/types";
import { MotionScrubber, usePrefersReducedMotion } from "./react";
import { createVisualTransformationReference, TRANSFORMATION_REFERENCE_THEMES } from "./visual-transformation-reference";
import { Button } from "../ui/button";

export interface VisualTransformationDemoProps {
  initialAspect?: "landscape" | "portrait";
  initialTheme?: "theme-a" | "theme-b";
  initialFrame?: number;
  reducedMotion?: boolean;
  initialShapeStrategy?: "geometric-morph" | "mask-reveal" | "particle-handoff";
}

export function VisualTransformationDemo({
  initialAspect = "landscape", initialTheme = "theme-a", initialFrame = 0, reducedMotion: reducedMotionOverride,
  initialShapeStrategy = "geometric-morph",
}: VisualTransformationDemoProps) {
  const [frame, setFrame] = useState(initialFrame);
  const [aspect, setAspect] = useState(initialAspect);
  const [theme, setTheme] = useState(initialTheme);
  const [customAccent, setCustomAccent] = useState<string | undefined>();
  const [shapeStrategy, setShapeStrategy] = useState(initialShapeStrategy);
  const prefersReducedMotion = usePrefersReducedMotion();
  const reducedMotion = reducedMotionOverride ?? prefersReducedMotion;
  const film = useMemo(() => createVisualTransformationReference({ aspect,
    theme: { ...TRANSFORMATION_REFERENCE_THEMES[theme], ...(customAccent ? { accent: customAccent } : {}) },
  }), [aspect, theme, customAccent]);
  const program = useMemo(() => createVisualTransformationProgram(film.specs.map((spec, index) => index === 0
    ? { ...spec, mappings: spec.mappings?.map((mapping) => ["a", "b", "c"].includes(mapping.semanticId)
      ? { ...mapping, strategy: shapeStrategy, particles: { count: 64, seed: 42, radius: 2, arc: 18 } } : mapping) }
    : spec)), [film, shapeStrategy]);
  const scrubberTimeline = useMemo<MotionTimeline>(() => ({
    schemaVersion: 1, id: "visual-transformation-playback", fps: film.storyboard.fps,
    durationFrames: film.storyboard.durationFrames, nodes: [],
  }), [film]);
  const resolvedFrame = reducedMotion ? film.storyboard.durationFrames - 1 : frame;
  const activeSegment = [...program.segments].reverse().find((segment) => segment.startFrame <= resolvedFrame) ?? program.segments[0];
  return <div className="flex min-w-0 flex-col gap-6 [overflow-wrap:anywhere]">
    <div className="flex flex-wrap items-end justify-between gap-5">
      <fieldset className="min-w-0 space-y-2">
        <legend className="text-body-sm text-muted-foreground">Composition</legend>
        <div className="flex flex-wrap gap-2">
          {(["landscape", "portrait"] as const).map((value) => <Button key={value} size="sm"
            variant={aspect === value ? "primary" : "outline"} aria-pressed={aspect === value} onClick={() => setAspect(value)}>
            {value === "landscape" ? "Landscape" : "Portrait"}
          </Button>)}
        </div>
      </fieldset>
      <fieldset className="min-w-0 space-y-2">
        <legend className="text-body-sm text-muted-foreground">Color roles</legend>
        <div className="flex flex-wrap items-center gap-3">
          {(["theme-a", "theme-b"] as const).map((value, index) => <Button key={value} size="sm"
            variant={theme === value ? "primary" : "outline"} aria-pressed={theme === value}
            onClick={() => { setTheme(value); setCustomAccent(undefined); }}>Theme {index === 0 ? "A" : "B"}</Button>)}
          <label className="flex items-center gap-2 text-body-sm">Accent
            <input type="color" aria-label="Transformation accent color" className="h-10 w-12 cursor-pointer rounded-control border border-border bg-surface p-1"
              value={customAccent ?? TRANSFORMATION_REFERENCE_THEMES[theme].accent} onChange={(event) => setCustomAccent(event.target.value)} />
          </label>
        </div>
      </fieldset>
    </div>
    <label className="flex flex-wrap items-center gap-3 text-body-sm">First shape handoff
      <select className="min-h-11 max-w-full rounded-control border border-border bg-surface px-3 text-foreground"
        value={shapeStrategy} onChange={(event) => { setShapeStrategy(event.target.value as typeof shapeStrategy); setFrame(120); }}>
        <option value="geometric-morph">Geometric morph</option>
        <option value="mask-reveal">Mask reveal</option>
        <option value="particle-handoff">Seeded particles</option>
      </select>
    </label>
    <figure className="m-0 flex min-w-0 flex-col gap-3">
      <div className="mx-auto w-full overflow-hidden rounded-surface border border-border"
        style={{ maxWidth: aspect === "portrait" ? 560 : undefined, background: film.theme.surface }}>
        <VisualTransformation transformation={program} frame={resolvedFrame} reducedMotion={reducedMotion} width={film.width} height={film.height}
          label="An idea in motion: three persistent identities reshape, connect, become equation terms and code, assemble, separate and rearrange"
          style={{ display: "block", width: "100%", height: "auto" }} />
      </div>
      <figcaption className="text-body-sm text-muted-foreground">
        Seven connected handoffs. The same a, b and c persist throughout. {reducedMotion ? "Reduced motion is on; the final arrangement is shown." : "Play the study or scrub to inspect any frame."}
      </figcaption>
    </figure>
    <MotionScrubber timeline={scrubberTimeline} frame={frame} onFrame={setFrame} label="Transformation frame" />
    <StoryboardShots storyboard={film.storyboard} frame={resolvedFrame} onFrameChange={setFrame} label="Transformation storyboard" />
    <section aria-labelledby="transformation-recipes-title" className="space-y-4 border-t border-border pt-6">
      <div className="max-w-prose space-y-2">
        <h2 id="transformation-recipes-title" className="text-title font-medium">Explore the recipes</h2>
        <p className="text-body-sm text-muted-foreground">Each recipe authors correspondence and staging. Select one to inspect its handoff halfway through.</p>
      </div>
      <ul className="grid gap-x-8 gap-y-5 md:grid-cols-2">
        {TRANSFORMATION_RECIPES.map((recipe, index) => <li key={recipe.id} className="space-y-1">
          <button type="button" className="min-h-11 text-left text-body font-medium underline decoration-border underline-offset-4 hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current"
            onClick={() => setFrame(film.specs[index].range.startFrame + 30)}>{recipe.title}</button>
          <p className="max-w-prose text-body-sm text-muted-foreground">{recipe.description}</p>
        </li>)}
      </ul>
    </section>
    <details className="border-t border-border pt-5">
      <summary className="cursor-pointer text-body font-medium">Inspect the current correspondence</summary>
      <p className="mt-3 max-w-prose text-body-sm text-muted-foreground">These are the compiler’s actual strategy decisions for this handoff. They describe visual correspondence; they do not establish mathematical or program equivalence.</p>
      <ul className="mt-4 space-y-3 text-body-sm">
        {activeSegment?.transformation.decisions.map((decision) => <li key={decision.mappingId} className="break-words">
          <span className="font-medium">{decision.mappingId}: {decision.selected}</span>
          <p className="text-muted-foreground">{decision.reason}</p>
        </li>)}
      </ul>
    </details>
  </div>;
}
