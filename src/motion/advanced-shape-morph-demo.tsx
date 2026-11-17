import { useEffect, useMemo, useRef, useState } from "react";
import type { MutableRefObject, ReactNode } from "react";

import {
  AdvancedShapeMorph, morphFrameToSvgPaths, resolveMorphEasing, traceMorphFrame,
} from "../../registry/motion/advanced-morph";
import type {
  AdvancedShapeMorphConfig, AdvancedShapeMorphOptions, MorphEasing, MorphPlanSummary, MorphShapeInput,
  MorphTopologyStrategy, MorphTrackKind,
} from "../../registry/motion/advanced-morph";
import { traceTextOutline } from "../../registry/motion/advanced-morph-text";
import type { Diagnostic, MotionTimeline } from "../../registry/motion/types";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Slider } from "../ui/slider";
import { MotionScrubber } from "./react";
import { MORPH_DEMO_PRESETS, MORPH_DEMO_SHAPES } from "./advanced-shape-morph-shapes";
import type { MorphDemoPreset } from "./advanced-shape-morph-shapes";

const DESIGN = 240;
const PAD = 14;
export const MORPH_DEMO_FRAMES = 120;

export const STRATEGIES: { id: MorphTopologyStrategy; label: string; hint: string }[] = [
  { id: "partition", label: "Partition", hint: "Cut into pieces with straight, area-balanced cuts." },
  { id: "split-merge", label: "Split / merge", hint: "Extra parts leave or join a copy of the nearest part." },
  { id: "emerge", label: "Emerge", hint: "Extra parts grow from, or shrink into, a point." },
  { id: "cross-dissolve", label: "Cross-dissolve", hint: "Extra parts fade and shrink in place." },
];

export const EASINGS: { id: string; label: string; easing: MorphEasing }[] = [
  { id: "cubic", label: "Ease in-out (cubic)", easing: "ease-in-out-cubic" },
  { id: "linear", label: "Linear", easing: "linear" },
  { id: "bezier", label: "Cubic bezier (0.7, 0, 0.2, 1)", easing: { cubicBezier: [0.7, 0, 0.2, 1] } },
  { id: "elastic", label: "Elastic out", easing: { elastic: { amplitude: 1, period: 0.45, direction: "out" } } },
  { id: "smootherstep", label: "Custom: smootherstep", easing: (t: number) => t * t * t * (t * (t * 6 - 15) + 10) },
];

const KIND_LABELS: Record<MorphTrackKind, string> = {
  morph: "morph", split: "split", merge: "merge", partition: "piece",
  emerge: "emerge", vanish: "vanish", "fade-in": "fade in", "fade-out": "fade out",
};

export const selectClass = "min-h-11 w-full rounded-control border border-border bg-surface px-3 text-body-sm text-foreground";

export interface MorphView {
  x: number;
  y: number;
  width: number;
  height: number;
}

const SHAPE_VIEW: MorphView = { x: -PAD, y: -PAD, width: DESIGN + 2 * PAD, height: DESIGN + 2 * PAD };

/* ------------------------------------------------------------------ *
 * Shared pieces
 * ------------------------------------------------------------------ */

export interface MorphInfo {
  summary: MorphPlanSummary;
  diagnostics: readonly Diagnostic[];
  /** Mean `update(t)` time in this browser. */
  micros: number;
}

/** Browsers coarsen `performance.now()`, so time a burst of updates long enough to measure. */
export function measureUpdate(morph: AdvancedShapeMorph): number {
  let runs = 0;
  const started = performance.now();
  while (performance.now() - started < 12 && runs < 50_000) morph.update((runs++ % 64) / 63);
  return ((performance.now() - started) / runs) * 1000;
}

/**
 * Own one morph for the inputs. The morph lives in a ref so a disposed instance is never drawn (also under
 * Strict Mode); `info` changes whenever a new plan exists.
 */
export function useAdvancedMorph(
  from: MorphShapeInput | null, to: MorphShapeInput | null, options: AdvancedShapeMorphOptions, key: string,
): { ref: MutableRefObject<AdvancedShapeMorph | null>; info: MorphInfo | null } {
  const ref = useRef<AdvancedShapeMorph | null>(null);
  const [info, setInfo] = useState<MorphInfo | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;
  useEffect(() => {
    if (from === null || to === null) return;
    const morph = new AdvancedShapeMorph(from, to, optionsRef.current);
    ref.current = morph;
    setInfo({ summary: morph.plan, diagnostics: morph.diagnostics, micros: measureUpdate(morph) });
    return () => {
      morph.dispose();
      if (ref.current === morph) ref.current = null;
    };
  }, [from, to, key]);
  return { ref, info };
}

/** Changes when the document's theme attributes change, so canvases that read CSS tokens can redraw. */
export function useThemeVersion(): number {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const observer = new MutationObserver(() => setVersion((value) => value + 1));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style", "data-theme", "data-km-appearance"] });
    return () => observer.disconnect();
  }, []);
  return version;
}

function token(element: Element, name: string, fallback: string): string {
  return getComputedStyle(element).getPropertyValue(name).trim() || fallback;
}

export interface Overlays {
  outlines: boolean;
  correspondence: boolean;
  samples: boolean;
}

function drawMorph(canvas: HTMLCanvasElement, morph: AdvancedShapeMorph, overlays: Overlays, view: MorphView): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const scale = Math.min(canvas.width / view.width, canvas.height / view.height);
  const ox = (canvas.width - view.width * scale) / 2 - view.x * scale;
  const oy = (canvas.height - view.height * scale) / 2 - view.y * scale;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(scale, 0, 0, scale, ox, oy);
  const fill = token(canvas, "--km-action-primary", "#0b7a52");
  const muted = token(canvas, "--km-text-muted", "#777");
  const strong = token(canvas, "--km-text-primary", "#111");
  const cssPixel = devicePixelRatio / scale;
  const frame = morph.frame;
  const pairs = morph.correspondence();

  if (overlays.outlines) {
    ctx.save();
    ctx.lineWidth = 1.25 * cssPixel;
    ctx.strokeStyle = muted;
    ctx.globalAlpha = 0.55;
    for (const [key, dash] of [["from", [5, 4]], ["to", [1.5, 3.5]]] as const) {
      ctx.setLineDash(dash.map((d) => d * cssPixel));
      ctx.beginPath();
      for (const pair of pairs) {
        const ring = pair[key];
        if (ring.length < 6) continue;
        ctx.moveTo(ring[0], ring[1]);
        for (let i = 2; i < ring.length; i += 2) ctx.lineTo(ring[i], ring[i + 1]);
        ctx.closePath();
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  if (overlays.correspondence) {
    ctx.save();
    ctx.lineWidth = 0.75 * cssPixel;
    ctx.strokeStyle = muted;
    ctx.globalAlpha = 0.45;
    ctx.beginPath();
    for (const pair of pairs) {
      const count = pair.from.length >> 1;
      const step = Math.max(1, Math.floor(count / 40));
      for (let i = 0; i < count; i += step) {
        ctx.moveTo(pair.from[2 * i], pair.from[2 * i + 1]);
        ctx.lineTo(pair.to[2 * i], pair.to[2 * i + 1]);
      }
    }
    ctx.stroke();
    ctx.restore();
  }

  ctx.save();
  ctx.fillStyle = fill;
  ctx.beginPath();
  traceMorphFrame(ctx, frame, (component) => component.opacity >= 0.999);
  ctx.fill("nonzero");
  for (const component of frame.components) {
    if (component.opacity >= 0.999 || component.opacity <= 0.001) continue;
    ctx.globalAlpha = component.opacity;
    ctx.beginPath();
    traceMorphFrame(ctx, frame, (other) => other === component);
    ctx.fill("nonzero");
  }
  ctx.restore();

  if (overlays.samples) {
    ctx.save();
    ctx.fillStyle = strong;
    const r = 1.4 * cssPixel;
    for (const component of frame.components) {
      for (const ring of [component.outer, ...component.holes]) {
        for (let i = 0; i < ring.length; i += 2) ctx.fillRect(ring[i] - r, ring[i + 1] - r, 2 * r, 2 * r);
      }
    }
    ctx.restore();
  }
}

/** A canvas that draws the morph at `progress` and redraws on resize and theme changes of its inputs. */
function MorphStage({ morphRef, info, revision = 0, progress, overlays, view, label, className }: {
  morphRef: MutableRefObject<AdvancedShapeMorph | null>;
  info: MorphInfo | null;
  /** Bump to redraw after the morph changed in place (for example `configure({ easing })`). */
  revision?: number;
  progress: number;
  overlays: Overlays;
  view: MorphView;
  label: string;
  className: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const redraw = useRef<() => void>(() => undefined);
  redraw.current = () => {
    const morph = morphRef.current;
    const canvas = canvasRef.current;
    if (!morph || !canvas) return;
    morph.update(progress);
    drawMorph(canvas, morph, overlays, view);
  };
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(() => {
      const width = Math.round(canvas.clientWidth * devicePixelRatio);
      const height = Math.round(canvas.clientHeight * devicePixelRatio);
      if (width > 0 && height > 0 && (canvas.width !== width || canvas.height !== height)) {
        canvas.width = width;
        canvas.height = height;
      }
      redraw.current();
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);
  const theme = useThemeVersion();
  useEffect(() => redraw.current(), [info, revision, progress, overlays, view, theme]);
  return <canvas ref={canvasRef} role="img" aria-label={label} className={className} />;
}

export function StrategyPicker({ value, onChange }: { value: MorphTopologyStrategy; onChange: (value: MorphTopologyStrategy) => void }) {
  return (
    <fieldset className="min-w-0 space-y-2">
      <legend className="text-body-sm font-medium text-foreground">Topology strategy</legend>
      <div className="grid grid-cols-2 gap-2">
        {STRATEGIES.map((option) => (
          <Button key={option.id} size="sm" variant={option.id === value ? "primary" : "outline"} aria-pressed={option.id === value} onClick={() => onChange(option.id)}>
            {option.label}
          </Button>
        ))}
      </div>
      <p className="text-caption text-muted-foreground">{STRATEGIES.find((option) => option.id === value)?.hint}</p>
    </fieldset>
  );
}

export function EasingSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <label className="flex flex-col gap-1.5 text-body-sm text-foreground">Easing
      <select className={selectClass} value={value} onChange={(event) => onChange(event.target.value)}>
        {EASINGS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
      </select>
    </label>
  );
}

export function InterpolationSelect({ value, onChange }: {
  value: AdvancedShapeMorphConfig["interpolation"]; onChange: (value: AdvancedShapeMorphConfig["interpolation"]) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-body-sm text-foreground">Point paths
      <select className={selectClass} value={value} onChange={(event) => onChange(event.target.value as typeof value)}>
        <option value="auto">Auto (intrinsic if needed)</option>
        <option value="intrinsic">Intrinsic (edge lengths and angles)</option>
        <option value="linear">Linear</option>
      </select>
    </label>
  );
}

export function easingById(id: string): MorphEasing {
  return EASINGS.find((option) => option.id === id)?.easing ?? "ease-in-out-cubic";
}

export function PlanReadout({ info, extra }: { info: MorphInfo | null; extra?: ReactNode }) {
  if (!info) return null;
  const kinds = (Object.entries(info.summary.kinds) as [MorphTrackKind, number][]).filter(([, count]) => count > 0);
  return (
    <section aria-label="Morph plan" className="grid min-w-0 gap-6 border-t border-border pt-6 md:grid-cols-2">
      <div className="min-w-0 space-y-3">
        <h3 className="text-body font-medium text-foreground">Plan</h3>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-body-sm">
          <dt className="text-muted-foreground">Parts</dt>
          <dd className="tabular-nums">{info.summary.source.components} → {info.summary.target.components}</dd>
          <dt className="text-muted-foreground">Holes</dt>
          <dd className="tabular-nums">{info.summary.source.holes} → {info.summary.target.holes}</dd>
          <dt className="text-muted-foreground">Tracks</dt>
          <dd>{kinds.map(([kind, count]) => `${count} ${KIND_LABELS[kind]}`).join(" · ") || "none"}</dd>
          <dt className="text-muted-foreground">Samples</dt>
          <dd className="tabular-nums">{info.summary.points} points in {info.summary.rings} rings</dd>
          <dt className="text-muted-foreground">Setup</dt>
          <dd className="tabular-nums">{info.summary.setupMs.toFixed(1)} ms (once)</dd>
          <dt className="text-muted-foreground">Per frame</dt>
          <dd className="tabular-nums">{info.micros.toFixed(1)} µs for update(t), measured in this browser</dd>
          {extra}
        </dl>
      </div>
      <div className="min-w-0 space-y-3">
        <h3 className="text-body font-medium text-foreground">Diagnostics</h3>
        {info.diagnostics.length === 0 ? (
          <p className="text-body-sm text-muted-foreground">No warnings. No edge crossings at the sampled transit frames.</p>
        ) : (
          <ul className="space-y-2 text-body-sm">
            {info.diagnostics.map((diagnostic, index) => (
              <li key={`${diagnostic.code}-${index}`}>
                <span className="font-mono text-caption text-muted-foreground">{diagnostic.code}</span>
                <p>{diagnostic.message}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export function useMorphTimeline(): MotionTimeline {
  return useMemo<MotionTimeline>(() => ({ schemaVersion: 1, id: "advanced-shape-morph", fps: { num: 60, den: 1 }, durationFrames: MORPH_DEMO_FRAMES, nodes: [] }), []);
}

function OverlayControls({ value, onChange }: { value: Overlays; onChange: (value: Overlays) => void }) {
  return (
    <fieldset className="min-w-0 space-y-2">
      <legend className="text-body-sm font-medium text-foreground">Overlays</legend>
      <Checkbox label="Source and target outlines" checked={value.outlines} onCheckedChange={(checked) => onChange({ ...value, outlines: checked })} />
      <Checkbox label="Correspondence lines" checked={value.correspondence} onCheckedChange={(checked) => onChange({ ...value, correspondence: checked })} />
      <Checkbox label="Sample points" checked={value.samples} onCheckedChange={(checked) => onChange({ ...value, samples: checked })} />
    </fieldset>
  );
}

function ProgressHeading({ title, progress, easing }: { title: string; progress: number; easing: MorphEasing }) {
  const eased = useMemo(() => resolveMorphEasing(easing)(progress), [easing, progress]);
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
      <p className="text-body font-medium text-foreground">{title}</p>
      <p className="font-mono text-title tabular-nums text-foreground">
        t {progress.toFixed(2)} <span className="text-body-sm text-muted-foreground">eased {eased.toFixed(2)}</span>
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Shape lab
 * ------------------------------------------------------------------ */

function presetById(id: string): MorphDemoPreset {
  return MORPH_DEMO_PRESETS.find((preset) => preset.id === id) ?? MORPH_DEMO_PRESETS[0];
}

export interface AdvancedShapeMorphLabProps {
  initialPreset?: string;
  initialStrategy?: MorphTopologyStrategy;
  /** Progress shown first, 0–1. */
  initialProgress?: number;
}

/** Interactive lab for `AdvancedShapeMorph`: presets, every configuration knob, overlays and live timing. */
export function AdvancedShapeMorphLab({ initialPreset = "disc-dots", initialStrategy, initialProgress = 0.5 }: AdvancedShapeMorphLabProps) {
  const [presetId, setPresetId] = useState(initialPreset);
  const preset = presetById(presetId);
  const [strategy, setStrategy] = useState<MorphTopologyStrategy>(initialStrategy ?? preset.strategy);
  const [easingId, setEasingId] = useState("cubic");
  const [alignment, setAlignment] = useState<AdvancedShapeMorphConfig["alignment"]["mode"]>("centroid");
  const [rotation, setRotation] = useState<"auto" | "best-fit" | "none">("auto");
  const [holeTransport, setHoleTransport] = useState<AdvancedShapeMorphConfig["holeTransport"]>("auto");
  const [interpolation, setInterpolation] = useState<AdvancedShapeMorphConfig["interpolation"]>("auto");
  const [density, setDensity] = useState(128);
  const [overlays, setOverlays] = useState<Overlays>({ outlines: true, correspondence: false, samples: false });
  const [frameIndex, setFrameIndex] = useState(Math.round(Math.min(1, Math.max(0, initialProgress)) * (MORPH_DEMO_FRAMES - 1)));
  const easing = easingById(easingId);
  const { ref, info } = useAdvancedMorph(
    MORPH_DEMO_SHAPES[preset.from].input, MORPH_DEMO_SHAPES[preset.to].input,
    { topologyStrategy: strategy, resampleDensity: density, holeTransport, interpolation, alignment: { mode: alignment, rotation }, easing },
    [strategy, density, holeTransport, interpolation, alignment, rotation].join("|"),
  );
  const [easingVersion, setEasingVersion] = useState(0);
  useEffect(() => {
    ref.current?.configure({ easing });
    setEasingVersion((version) => version + 1);
  }, [easing, ref]);
  const timeline = useMorphTimeline();
  const progress = frameIndex / (MORPH_DEMO_FRAMES - 1);
  const fromLabel = MORPH_DEMO_SHAPES[preset.from].label;
  const toLabel = MORPH_DEMO_SHAPES[preset.to].label;

  return (
    <div className="mx-auto flex max-w-6xl min-w-0 flex-col gap-6 [overflow-wrap:anywhere]">
      <header className="max-w-prose space-y-2">
        <h2 className="font-serif text-heading-sm font-normal text-foreground">Advanced shape morph</h2>
        <p className="text-body-sm text-muted-foreground">
          Morph any two shapes: different vertex counts, several parts, and holes that appear or close. The plan is built once; each
          frame is plain arithmetic on typed arrays.
        </p>
      </header>

      <fieldset className="min-w-0 space-y-2">
        <legend className="text-body-sm text-muted-foreground">Shape pair</legend>
        <div className="flex flex-wrap gap-2">
          {MORPH_DEMO_PRESETS.map((option) => (
            <Button key={option.id} size="sm" variant={option.id === presetId ? "primary" : "outline"} aria-pressed={option.id === presetId}
              onClick={() => { setPresetId(option.id); setStrategy(option.strategy); }}>
              {option.label}
            </Button>
          ))}
        </div>
      </fieldset>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section aria-label="Morph stage" className="flex min-w-0 flex-col gap-4">
          <figure className="m-0 flex min-w-0 flex-col gap-3 rounded-surface border border-border bg-surface p-4">
            <ProgressHeading title={`${fromLabel} → ${toLabel}`} progress={progress} easing={easing} />
            <MorphStage morphRef={ref} info={info} revision={easingVersion} progress={progress} overlays={overlays} view={SHAPE_VIEW}
              className="mx-auto aspect-square w-full max-w-[34rem] rounded-control bg-surface-inset"
              label={`${fromLabel} morphing into ${toLabel} with the ${strategy} strategy, ${Math.round(progress * 100)} percent complete`} />
            <figcaption className="text-body-sm text-muted-foreground">{preset.note} Dashed: source. Dotted: target.</figcaption>
          </figure>
          <MotionScrubber timeline={timeline} frame={frameIndex} onFrame={setFrameIndex} label="Morph progress" />
        </section>

        <aside aria-label="Morph configuration" className="flex min-w-0 flex-col gap-5 rounded-surface border border-border bg-surface p-4">
          <StrategyPicker value={strategy} onChange={setStrategy} />
          <EasingSelect value={easingId} onChange={setEasingId} />
          <label className="flex flex-col gap-1.5 text-body-sm text-foreground">Alignment
            <select className={selectClass} value={alignment} onChange={(event) => setAlignment(event.target.value as typeof alignment)}>
              <option value="centroid">Centre of mass</option>
              <option value="bounds">Bounding box (scale normalized)</option>
              <option value="none">None (raw coordinates)</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-body-sm text-foreground">Rotation
            <select className={selectClass} value={rotation} onChange={(event) => setRotation(event.target.value as typeof rotation)}>
              <option value="auto">Auto (turn if needed)</option>
              <option value="best-fit">Best fit</option>
              <option value="none">None</option>
            </select>
          </label>
          <InterpolationSelect value={interpolation} onChange={setInterpolation} />
          <label className="flex flex-col gap-1.5 text-body-sm text-foreground">Hole transport
            <select className={selectClass} value={holeTransport} onChange={(event) => setHoleTransport(event.target.value as typeof holeTransport)}>
              <option value="auto">Auto</option>
              <option value="cage">Cage (mean value coordinates)</option>
              <option value="linear">Linear</option>
            </select>
          </label>
          <Slider label="Resample density" min={24} max={512} step={8} value={density} showValue
            formatValue={(value) => `${value} samples`} onValueChange={(value) => setDensity(Array.isArray(value) ? value[0] ?? 128 : value)} />
          <OverlayControls value={overlays} onChange={setOverlays} />
        </aside>
      </div>
      <PlanReadout info={info} />
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Text lab
 * ------------------------------------------------------------------ */

export const TEXT_PAIRS = [
  { id: "morph-shape", from: "Morph", to: "Shape" },
  { id: "kumiki", from: "Kumiki", to: "組木" },
  { id: "ab-8", from: "AB", to: "8" },
  { id: "year", from: "2026", to: "2027" },
] as const;

export const TEXT_FONTS = [
  { id: "sans", label: "Sans (Geist)", family: '"Geist Variable", "Hiragino Sans", "Noto Sans JP", sans-serif' },
  { id: "serif", label: "Serif (Newsreader)", family: '"Newsreader Variable", "Hiragino Mincho ProN", "Noto Serif JP", serif' },
] as const;

export interface TracedTextPair {
  from: [number, number][][];
  to: [number, number][][];
  view: MorphView;
  key: string;
}

/**
 * Trace both strings once their font has loaded. Each outline is centred on the origin, so the two words
 * share one centre and the view fits both.
 */
export function useTracedText(from: string, to: string, font: string): TracedTextPair | null {
  const [state, setState] = useState<TracedTextPair | null>(null);
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        await document.fonts.load(font, `${from}${to}`);
      } catch {
        // The browser draws a fallback face; the trace still works.
      }
      if (cancelled) return;
      const outlines = [from, to].map((text) => {
        const outline = traceTextOutline(text || " ", { font });
        const dx = outline.width / 2;
        const dy = outline.height / 2;
        return { rings: outline.rings.map((ring) => ring.map(([x, y]) => [x - dx, y - dy] as [number, number])), width: outline.width, height: outline.height };
      });
      const width = Math.max(outlines[0].width, outlines[1].width);
      const height = Math.max(outlines[0].height, outlines[1].height);
      setState({ from: outlines[0].rings, to: outlines[1].rings, view: { x: -width / 2, y: -height / 2, width, height }, key: `${from}|${to}|${font}` });
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [from, to, font]);
  return state;
}

export function TextPairControls({ from, to, onFrom, onTo, fontId, onFont }: {
  from: string; to: string; onFrom: (value: string) => void; onTo: (value: string) => void;
  fontId: string; onFont: (value: string) => void;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <fieldset className="min-w-0 space-y-2">
        <legend className="text-body-sm text-muted-foreground">Text pair</legend>
        <div className="flex flex-wrap gap-2">
          {TEXT_PAIRS.map((pair) => (
            <Button key={pair.id} size="sm" variant={pair.from === from && pair.to === to ? "primary" : "outline"}
              aria-pressed={pair.from === from && pair.to === to} onClick={() => { onFrom(pair.from); onTo(pair.to); }}>
              {pair.from} → {pair.to}
            </Button>
          ))}
        </div>
      </fieldset>
      <div className="grid min-w-0 gap-3 sm:grid-cols-3">
        <label className="flex min-w-0 flex-col gap-1.5 text-body-sm text-foreground">From
          <input className={selectClass} value={from} maxLength={24} onChange={(event) => onFrom(event.target.value)} />
        </label>
        <label className="flex min-w-0 flex-col gap-1.5 text-body-sm text-foreground">To
          <input className={selectClass} value={to} maxLength={24} onChange={(event) => onTo(event.target.value)} />
        </label>
        <label className="flex min-w-0 flex-col gap-1.5 text-body-sm text-foreground">Font
          <select className={selectClass} value={fontId} onChange={(event) => onFont(event.target.value)}>
            {TEXT_FONTS.map((font) => <option key={font.id} value={font.id}>{font.label}</option>)}
          </select>
        </label>
      </div>
    </div>
  );
}

export function textFont(fontId: string): string {
  const family = TEXT_FONTS.find((font) => font.id === fontId)?.family ?? TEXT_FONTS[0].family;
  return `600 160px ${family}`;
}

/** Text morphs: any two strings in any font the page can draw, traced into rings and morphed letter by letter. */
export function AdvancedShapeMorphTextLab({ initialProgress = 0.5 }: { initialProgress?: number }) {
  const [from, setFrom] = useState<string>(TEXT_PAIRS[0].from);
  const [to, setTo] = useState<string>(TEXT_PAIRS[0].to);
  const [fontId, setFontId] = useState("sans");
  const [strategy, setStrategy] = useState<MorphTopologyStrategy>("split-merge");
  const [easingId, setEasingId] = useState("cubic");
  const [interpolation, setInterpolation] = useState<AdvancedShapeMorphConfig["interpolation"]>("auto");
  const [overlays, setOverlays] = useState<Overlays>({ outlines: true, correspondence: false, samples: false });
  const [frameIndex, setFrameIndex] = useState(Math.round(Math.min(1, Math.max(0, initialProgress)) * (MORPH_DEMO_FRAMES - 1)));
  const text = useTracedText(from, to, textFont(fontId));
  const { ref, info } = useAdvancedMorph(text?.from ?? null, text?.to ?? null,
    { topologyStrategy: strategy, easing: easingById(easingId), interpolation, resampleDensity: { spacing: 3, min: 16, max: 512 } },
    `${text?.key}|${strategy}|${easingId}|${interpolation}`);
  const timeline = useMorphTimeline();
  const progress = frameIndex / (MORPH_DEMO_FRAMES - 1);
  const view = useMemo(() => {
    const v = text?.view ?? { x: -100, y: -50, width: 200, height: 100 };
    const pad = v.height * 0.12;
    return { x: v.x - pad, y: v.y - pad, width: v.width + 2 * pad, height: v.height + 2 * pad };
  }, [text]);

  return (
    <div className="mx-auto flex max-w-6xl min-w-0 flex-col gap-6 [overflow-wrap:anywhere]">
      <header className="max-w-prose space-y-2">
        <h2 className="font-serif text-heading-sm font-normal text-foreground">Text morph</h2>
        <p className="text-body-sm text-muted-foreground">
          The page draws each string with a real font; the tracer turns the glyph edges into rings with sub-pixel accuracy. Letters
          become parts, counters become holes, so words of different lengths and scripts morph with the same engine.
        </p>
      </header>
      <TextPairControls from={from} to={to} onFrom={setFrom} onTo={setTo} fontId={fontId} onFont={setFontId} />
      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section aria-label="Text morph stage" className="flex min-w-0 flex-col gap-4">
          <figure className="m-0 flex min-w-0 flex-col gap-3 rounded-surface border border-border bg-surface p-4">
            <ProgressHeading title={`${from || "(empty)"} → ${to || "(empty)"}`} progress={progress} easing={easingById(easingId)} />
            <MorphStage morphRef={ref} info={info} progress={progress} overlays={overlays} view={view}
              className="aspect-[16/7] w-full rounded-control bg-surface-inset"
              label={`The text ${from} morphing into ${to}, ${Math.round(progress * 100)} percent complete`} />
          </figure>
          <MotionScrubber timeline={timeline} frame={frameIndex} onFrame={setFrameIndex} label="Morph progress" />
        </section>
        <aside aria-label="Text morph configuration" className="flex min-w-0 flex-col gap-5 rounded-surface border border-border bg-surface p-4">
          <StrategyPicker value={strategy} onChange={setStrategy} />
          <EasingSelect value={easingId} onChange={setEasingId} />
          <InterpolationSelect value={interpolation} onChange={setInterpolation} />
          <OverlayControls value={overlays} onChange={setOverlays} />
        </aside>
      </div>
      <PlanReadout info={info} />
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Filmstrips
 * ------------------------------------------------------------------ */

const FILM_STEPS = [0, 0.25, 0.5, 0.75, 1];

function MorphFilmstrip({ preset, strategy }: { preset: MorphDemoPreset; strategy: MorphTopologyStrategy }) {
  const frames = useMemo(() => {
    const morph = new AdvancedShapeMorph(MORPH_DEMO_SHAPES[preset.from].input, MORPH_DEMO_SHAPES[preset.to].input, { topologyStrategy: strategy });
    const out = FILM_STEPS.map((t) => morphFrameToSvgPaths(morph.update(t)));
    morph.dispose();
    return out;
  }, [preset, strategy]);
  return (
    <li className="min-w-0 space-y-2">
      <p className="text-body-sm font-medium text-foreground">{preset.label}</p>
      <ol className="grid grid-cols-5 gap-2">
        {frames.map((paths, index) => (
          <li key={FILM_STEPS[index]} className="min-w-0">
            <svg viewBox={`${-PAD} ${-PAD} ${DESIGN + 2 * PAD} ${DESIGN + 2 * PAD}`} role="img"
              aria-label={`${preset.label} at ${Math.round(FILM_STEPS[index] * 100)} percent`}
              className="block aspect-square w-full rounded-control bg-surface-inset text-[var(--km-action-primary)]">
              {paths.map((path, k) => <path key={k} d={path.d} opacity={path.opacity} fill="currentColor" fillRule="nonzero" />)}
            </svg>
            <p className="mt-1 text-center font-mono text-caption tabular-nums text-muted-foreground">{FILM_STEPS[index].toFixed(2)}</p>
          </li>
        ))}
      </ol>
    </li>
  );
}

/** Every demo pair at five moments, for one strategy at a time. Rendered with the SVG adapter. */
export function AdvancedShapeMorphFilmstrips({ initialStrategy = "partition" }: { initialStrategy?: MorphTopologyStrategy }) {
  const [strategy, setStrategy] = useState<MorphTopologyStrategy>(initialStrategy);
  return (
    <div className="mx-auto flex max-w-6xl min-w-0 flex-col gap-6">
      <header className="max-w-prose space-y-2">
        <h2 className="font-serif text-heading-sm font-normal text-foreground">Topology strategies side by side</h2>
        <p className="text-body-sm text-muted-foreground">Each row is one shape pair at t = 0, 0.25, 0.5, 0.75 and 1. Choose a strategy to compare how parts and holes appear and disappear.</p>
      </header>
      <fieldset className="min-w-0 space-y-2">
        <legend className="text-body-sm text-muted-foreground">Topology strategy</legend>
        <div className="flex flex-wrap gap-2">
          {STRATEGIES.map((option) => (
            <Button key={option.id} size="sm" variant={option.id === strategy ? "primary" : "outline"} aria-pressed={option.id === strategy} onClick={() => setStrategy(option.id)}>
              {option.label}
            </Button>
          ))}
        </div>
      </fieldset>
      <ul className="grid min-w-0 gap-x-8 gap-y-6 xl:grid-cols-2">
        {MORPH_DEMO_PRESETS.map((preset) => <MorphFilmstrip key={preset.id} preset={preset} strategy={strategy} />)}
      </ul>
    </div>
  );
}
