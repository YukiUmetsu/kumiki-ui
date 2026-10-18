import { useMemo, useState } from "react";
import { CameraStage } from "../../registry/motion/camera-stage";
import { MotionDirector } from "../../registry/motion/motion-director-react";
import { StoryboardShots } from "../../registry/motion/storyboard-shots";
import { VisualGeometry, VisualTransformation } from "../../registry/motion/visual-transformation-react";
import type { DirectorFrame, MotionPersonality } from "../../registry/motion/director-types";
import type { Vec2 } from "../../registry/motion/types";
import { MotionScrubber } from "./react";
import { Button } from "../ui/button";
import { createDirectorReference, DIRECTOR_BEATS, DIRECTOR_THEMES } from "./director-reference";

export interface MotionDirectorDemoProps {
  initialAspect?: "landscape" | "portrait";
  initialTheme?: keyof typeof DIRECTOR_THEMES;
  initialFrame?: number;
  reducedMotion?: boolean;
}
type Film = ReturnType<typeof createDirectorReference>;

function ReferenceStage({ state, film }: { state: DirectorFrame; film: Film }) {
  const { director, evaluation, shot } = state;
  const { width, height, theme } = film;
  const index = Number(shot?.id.replace("shot-", "") ?? 0);
  const beat = DIRECTOR_BEATS[index];
  const transition = director.transformations.find(t => t.id === `handoff-${Math.min(index, 4)}`)!;
  const scalar = (id: string, property: string, fallback = 0) => {
    const value = evaluation.samples[`${id}.${property}`]?.value;
    return typeof value === "number" ? value : fallback;
  };
  const portrait = height > width;
  return <CameraStage timeline={director.timeline} frame={evaluation.frame} evaluation={evaluation} reducedMotion={false}
    width={width} height={height} background={theme.surface} ariaLabel={`${beat.title} ${beat.detail}`}
    overlay={<g fontFamily={'"Geist Variable", Arial, sans-serif'} fill={theme.ink}>
      <text x={56} y={60} fontSize={16} fill={theme.muted} letterSpacing={2}>MOTION STUDY / {String(index + 1).padStart(2, "0")}</text>
      <text x={54} y={portrait ? 142 : 138} fontSize={portrait ? 48 : 60} fontWeight={500} letterSpacing={-2}>{beat.title}</text>
      <text x={56} y={portrait ? 194 : 183} fontSize={portrait ? 20 : 22} fill={theme.muted}>{beat.claim}</text>
      <path d={`M56,${height - 120} H${width - 56}`} stroke={theme.line} />
      <text x={56} y={height - 75} fontSize={portrait ? 20 : 22}>{beat.caption}</text>
      <text x={width - 56} y={height - 35} fontSize={15} textAnchor="end" fill={theme.muted} style={{ fontVariantNumeric: "tabular-nums" }}>
        {(evaluation.frame * director.timeline.fps.den / director.timeline.fps.num).toFixed(1)} / {(director.timeline.durationFrames * director.timeline.fps.den / director.timeline.fps.num).toFixed(0)} s
      </text>
      {DIRECTOR_BEATS.map((_, i) => <rect key={i} x={56 + i * 34} y={height - 46} width={24} height={3} fill={i === index ? theme.accent : theme.line} />)}
    </g>}>
    <VisualTransformation transformation={transition.compiled} frame={evaluation.frame} evaluation={evaluation} reducedMotion={false}
      width={width} height={height} label="Thirty-six persistent objects form a system" aria-hidden="true"
      style={{ width, height, maxWidth: "none", overflow: "visible" }}
      renderLayer={layer => {
        const id = layer.semanticId;
        const offset = evaluation.samples[`${id}.offset`]?.value as Vec2 | undefined;
        const emphasis = scalar(id, "emphasis");
        const rotation = scalar(id, "rotation") * 180 / Math.PI;
        const scale = scalar(id, "scale", 1) + emphasis * 0.25;
        return <g data-director-subject={id} opacity={scalar(id, "opacity", 1)}
          transform={`translate(${offset?.x ?? 0} ${offset?.y ?? 0}) rotate(${rotation}) scale(${scale})`}>
          {emphasis > 0 && layer.content.kind === "shape" ? <circle r={23} fill="none" stroke={theme.accent} opacity={emphasis} strokeWidth={1.5} /> : null}
          <VisualGeometry layer={layer} />
        </g>;
      }} />
    {index === 3 ? director.transformations.filter(t => t.id.startsWith("synchronized-shapes/")).map(t => <VisualTransformation key={t.id}
      transformation={t.compiled} frame={evaluation.frame} evaluation={evaluation} reducedMotion={false}
      width={width} height={height} label="Synchronized shape change" aria-hidden="true" style={{ width, height, maxWidth: "none" }} />) : null}
  </CameraStage>;
}

export function MotionDirectorDemo({ initialAspect = "landscape", initialTheme = "theme-a", initialFrame = 145, reducedMotion }: MotionDirectorDemoProps) {
  const [aspect, setAspect] = useState(initialAspect);
  const [theme, setTheme] = useState(initialTheme);
  const [frame, setFrame] = useState(initialFrame);
  const [intensity, setIntensity] = useState(1);
  const [pacing, setPacing] = useState(1);
  const [personality, setPersonality] = useState<MotionPersonality>("precise");
  const film = useMemo(() => createDirectorReference({ aspect, theme, profile: { intensity, pacing, personality } }), [aspect, theme, intensity, pacing, personality]);
  const director = film.director;
  const safeFrame = Math.min(frame, director.timeline.durationFrames - 1);
  const overview = useMemo(() => director.schedule.filter(entry => entry.recipe && entry.kind !== "animation" && !entry.parentId), [director]);
  return <div className="mx-auto flex max-w-7xl min-w-0 flex-col gap-6 p-4 text-foreground sm:p-8" data-director-demo="">
    <header className="flex flex-wrap items-end justify-between gap-6">
      <div className="max-w-prose space-y-2">
        <p className="text-body-sm text-muted-foreground">MotionDirector / Reference production</p>
        <h1 className="text-heading-lg font-medium tracking-tight">From signals to a system</h1>
        <p className="text-body text-muted-foreground">36 independent subjects, six connected sequences, one frame clock.</p>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Composition format">
        {(["landscape", "portrait"] as const).map(value => <Button key={value} size="sm" variant={aspect === value ? "primary" : "outline"}
          aria-pressed={aspect === value} onClick={() => setAspect(value)}>{value === "landscape" ? "16:9" : "9:16"}</Button>)}
        <Button size="sm" variant="outline" onClick={() => setTheme(theme === "theme-a" ? "theme-b" : "theme-a")}>Theme {theme === "theme-a" ? "A" : "B"}</Button>
      </div>
    </header>
    <MotionDirector director={director} frame={safeFrame} reducedMotion={reducedMotion}>
      {state => <figure className="m-0 space-y-3">
        <div className="mx-auto overflow-hidden rounded-surface border border-border" style={{ maxWidth: aspect === "portrait" ? 460 : undefined }}>
          <ReferenceStage state={state} film={film} />
        </div>
        <figcaption className="text-body-sm text-muted-foreground">{state.shot?.visualObjective} {state.evaluation.frame !== safeFrame ? "Reduced motion: final composition shown." : ""}</figcaption>
      </figure>}
    </MotionDirector>
    <MotionScrubber timeline={director.timeline} frame={safeFrame} onFrame={setFrame} label="Director frame" />
    <div className="flex flex-wrap items-center gap-4">
      <Button variant="outline" size="sm" onClick={() => setFrame(0)}>Return to opening</Button>
      <label className="flex min-h-11 items-center gap-3 text-body-sm">Intensity
        <input aria-label="Motion intensity" type="range" min={0} max={1} step={0.1} value={intensity} onChange={event => setIntensity(Number(event.target.value))} className="w-28 accent-current" />
        <output className="w-8 tabular-nums">{Math.round(intensity * 100)}%</output>
      </label>
      <label className="flex items-center gap-3 text-body-sm">Pacing
        <select aria-label="Motion pacing" className="min-h-11 rounded-control border border-border bg-surface px-3" value={pacing} onChange={event => {
          const next = Number(event.target.value); setFrame(Math.round(safeFrame / pacing * next)); setPacing(next);
        }}><option value={0.8}>Brisk</option><option value={1}>Measured</option><option value={1.2}>Unhurried</option></select>
      </label>
      <label className="flex items-center gap-3 text-body-sm">Personality
        <select aria-label="Motion personality" className="min-h-11 rounded-control border border-border bg-surface px-3" value={personality} onChange={event => setPersonality(event.target.value as MotionPersonality)}>
          <option value="precise">Precise</option><option value="gentle">Gentle</option><option value="expressive">Expressive</option>
        </select>
      </label>
    </div>
    <StoryboardShots storyboard={director.storyboard} frame={safeFrame} onFrameChange={setFrame} label="Director storyboard" />
    <details className="space-y-4 border-t border-border pt-5">
      <summary className="min-h-11 cursor-pointer text-body font-medium">Inspect choreography and cues</summary>
      <p className="max-w-prose text-body-sm text-muted-foreground">The lanes below come from the compiled schedule. Narration and speech markers are authored metadata; this study has no recorded audio.</p>
      <div className="space-y-3" aria-label="Compiled recipe schedule">
        {overview.map(entry => <div key={entry.id} className="grid min-w-0 grid-cols-[minmax(0,1fr)_2fr] items-center gap-4 text-body-sm">
          <span className="truncate" title={entry.recipe?.id}>{entry.id}</span>
          <div className="relative h-3 rounded-control bg-surface-inset"><div className="absolute h-full rounded-control bg-primary" style={{ left: `${entry.startFrame / director.timeline.durationFrames * 100}%`, width: `${(entry.endFrame - entry.startFrame) / director.timeline.durationFrames * 100}%` }} /></div>
        </div>)}
      </div>
      <div className="max-h-72 overflow-auto rounded-control border border-border p-4">
        <table className="w-full text-left text-body-sm"><caption className="pb-3 text-left font-medium">Named narration and speech markers</caption>
          <thead><tr><th scope="col">Cue</th><th scope="col">Frame</th><th scope="col">Kind</th></tr></thead>
          <tbody>{director.cues.map(cue => <tr key={cue.id} className="border-t border-border"><th scope="row" className="py-2 font-normal"><button type="button" className="min-h-11 underline underline-offset-4" onClick={() => setFrame(cue.frame)}>{cue.id}</button></th><td className="tabular-nums">{cue.frame}</td><td>{cue.payload.kind}</td></tr>)}</tbody>
        </table>
      </div>
      <p className="text-body-sm text-muted-foreground">{director.schedule.length} authored nodes · {Object.keys(director.sourceMap).length} compiled channels · {director.diagnostics.length} diagnostics</p>
      {director.diagnostics.length ? <ul className="max-h-56 space-y-2 overflow-auto text-body-sm">{director.diagnostics.map((d, i) => <li key={i}>{d.code}: {d.message}</li>)}</ul> : null}
    </details>
  </div>;
}
