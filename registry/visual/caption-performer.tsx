import { forwardRef, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ComponentPropsWithoutRef } from "react";
import type { Rect } from "../motion/types";
import { captionWrapSpans, evaluateCaptionTrack, layoutCaptionLines, placeCaptionBlocks, resolveCaptionWordRanges, validateCaptionTrack } from "./caption-track";
import type { CaptionCue, CaptionDiagnostic, CaptionEmphasis, CaptionLine, CaptionTrack, CaptionValidationOptions, CaptionWordState } from "./caption-track";
import { measureDOMTypography } from "./dom-text-measure";
import { useOptionalShortSafeFrame } from "./short-safe-frame";

export interface CaptionPerformerProps extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  track: CaptionTrack;
  /** Absolute frame. The performer owns no clock. */
  frame: number;
  /** `word` follows supplied word timings; cues without them render as phrases. */
  highlight?: "word" | "phrase";
  anchor?: "bottom" | "top";
  /** Normalized lane. Defaults to the enclosing ShortSafeFrame content area, else a 6% inset. */
  lane?: Rect;
  /** Extra regions captions must avoid (protected subjects, graphics). Safe-frame interior UI is added automatically. */
  avoidRegions?: readonly Rect[];
  maxLines?: number;
  /** Fraction of the lane width a caption block may use. Default 0.9. */
  maxWidth?: number;
  showSpeakers?: "change" | "always" | "never";
  enterFrames?: number;
  exitFrames?: number;
  /** `auto` follows prefers-reduced-motion: no movement, cues cut in and out. */
  reducedMotion?: boolean | "auto";
  onDiagnostics?: (diagnostics: CaptionDiagnostic[]) => void;
  /** Reading-time and confidence thresholds for validation (see `validateCaptionTrack`). */
  validation?: Pick<CaptionValidationOptions, "reading" | "minConfidence">;
}

const DEFAULT_LANE: Rect = { x: 0.06, y: 0.06, width: 0.88, height: 0.88 };
interface CueVariant { lines: CaptionLine[]; widthPx: number; heightPx: number; span: { x: number; width: number } }
interface CueLayout { variants: CueVariant[]; label?: string; ranges?: { start: number; end: number }[] }
interface Measured { viewport: { width: number; height: number }; padX: number; padY: number; labelHeight: number; cues: Record<string, CueLayout>; errors: CaptionDiagnostic[] }

const textStyle: CSSProperties = {
  fontFamily: "var(--km-caption-font, var(--km-font-body, system-ui, sans-serif))",
  fontSize: "var(--km-caption-font-size, 4.8cqw)", fontWeight: 600, lineHeight: 1.3, letterSpacing: 0,
  whiteSpace: "pre", margin: 0, padding: 0, border: 0,
};
const labelStyle: CSSProperties = {
  fontFamily: "var(--km-caption-font, var(--km-font-body, system-ui, sans-serif))",
  fontSize: "0.62em", fontWeight: 600, lineHeight: 1.3, letterSpacing: "0.04em", textTransform: "uppercase", whiteSpace: "pre",
};
const INK: Record<CaptionWordState, string> = {
  upcoming: "var(--km-caption-ink-upcoming, rgba(255, 255, 255, 0.5))",
  active: "var(--km-caption-ink, #ffffff)",
  spoken: "var(--km-caption-ink, #ffffff)",
};
const EMPHASIS: Record<CaptionEmphasis, string> = {
  strong: "var(--km-caption-strong, #ffd166)",
  accent: "var(--km-caption-accent, #8fc8ff)",
};

function speakerLabels(track: CaptionTrack, mode: CaptionPerformerProps["showSpeakers"]): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  let previous: string | undefined;
  for (const cue of [...track.cues].sort((a, b) => a.startFrame - b.startFrame)) {
    const label = cue.speakerId ? track.speakers?.[cue.speakerId]?.label : undefined;
    out[cue.id] = mode === "never" || !label ? undefined : mode === "always" || cue.speakerId !== previous ? label : undefined;
    previous = cue.speakerId;
  }
  return out;
}

/** Spans of one line, each owned by the word it belongs to (punctuation joins the preceding word). */
function lineSpans(line: CaptionLine, cue: CaptionCue, ranges: { start: number; end: number }[] | undefined, states: CaptionWordState[] | undefined) {
  if (!ranges?.length || !states) return [{ key: `${line.start}`, text: line.text, state: "spoken" as CaptionWordState, emphasis: undefined, word: -1 }];
  const owner = (i: number) => { let w = 0; for (let k = 0; k < ranges.length; k += 1) if (ranges[k].start <= i) w = k; return w; };
  const spans: { key: string; text: string; state: CaptionWordState; emphasis?: CaptionEmphasis; word: number }[] = [];
  // Whitespace gets its own span (word -2) so the active-word highlight never covers a gap.
  for (let i = line.start; i < line.end; i += 1) {
    const space = /\s/u.test(cue.text[i]), word = space ? -2 : owner(i), last = spans[spans.length - 1];
    if (last && last.word === word) last.text += cue.text[i];
    else spans.push({ key: `${i}`, text: cue.text[i], state: space ? "spoken" : states[word], emphasis: space ? undefined : cue.words?.[word]?.emphasis, word });
  }
  return spans;
}

/** Timed captions rendered at an absolute frame inside a safe lane. Each cue is measured once with the
 * loaded DOM font; seeking never re-measures. Layout problems are reported, never truncated.
 */
export const CaptionPerformer = forwardRef<HTMLDivElement, CaptionPerformerProps>(function CaptionPerformer({
  track, frame, highlight = "word", anchor = "bottom", lane: laneProp, avoidRegions, maxLines = 2, maxWidth = 0.9,
  showSpeakers = "change", enterFrames = 5, exitFrames = 3, reducedMotion = "auto", onDiagnostics, validation: validationOptions, style, ...props
}, forwardedRef) {
  const frameContext = useOptionalShortSafeFrame();
  const laneKey = JSON.stringify(laneProp ?? frameContext?.contentRect ?? DEFAULT_LANE);
  const lane = useMemo<Rect>(() => JSON.parse(laneKey), [laneKey]);
  const avoid = useMemo(() => [...(frameContext?.text.avoidRegions ?? []), ...(avoidRegions ?? [])],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by value; callers pass inline arrays
    [JSON.stringify([frameContext?.text.avoidRegions, avoidRegions])]);
  const root = useRef<HTMLDivElement | null>(null), lineProbe = useRef<HTMLParagraphElement>(null), labelProbe = useRef<HTMLSpanElement>(null);
  const [measured, setMeasured] = useState<Measured | null>(null);
  const validationKey = JSON.stringify(validationOptions ?? {});
  // eslint-disable-next-line react-hooks/exhaustive-deps -- options are keyed by value
  const validation = useMemo(() => validateCaptionTrack(track, validationOptions), [track, validationKey]);
  const labels = useMemo(() => speakerLabels(track, showSpeakers), [track, showSpeakers]);
  const layoutKey = JSON.stringify([track.cues.map(c => [c.id, c.text, c.lang, c.dir]), labels, lane, maxLines, maxWidth]);

  // Measure every cue before paint, and again when size or fonts change.
  useLayoutEffect(() => {
    const element = root.current, probe = lineProbe.current, label = labelProbe.current;
    if (!element || !probe || !label) return;
    let active = true;
    const measureAll = () => {
      if (!active) return;
      const box = element.getBoundingClientRect();
      if (!box.width || !box.height) return;
      const errors: CaptionDiagnostic[] = [], cues: Record<string, CueLayout> = {};
      const fontSize = Number.parseFloat(getComputedStyle(probe).fontSize);
      const padX = fontSize * 0.45, padY = fontSize * 0.2;
      const labelType = measureDOMTypography(label), labelHeight = labelType.lineHeightPx + fontSize * 0.15;
      const spans = captionWrapSpans(lane, avoid, maxWidth, padX / box.width);
      for (const cue of track.cues) {
        probe.lang = cue.lang ?? ""; probe.dir = cue.dir ?? "auto";
        const type = measureDOMTypography(probe);
        const text = labels[cue.id], labelWidth = text ? labelType.measure(labelType.font, text) : 0;
        const ranges = resolveCaptionWordRanges(cue), units = ranges.ok && ranges.ranges.length ? ranges.ranges : undefined;
        const variants: CueVariant[] = [];
        let failure: { code: string; message: string } | undefined;
        for (const span of spans) {
          const result = layoutCaptionLines({ text: cue.text, language: cue.lang, measure: type.measure, font: type.font,
            lineHeightPx: type.lineHeightPx, maxWidthPx: span.width * box.width - 2 * padX, maxLines, units });
          if (!result.ok) { failure ??= result; continue; }
          variants.push({ lines: result.lines, span, widthPx: Math.max(result.width, labelWidth) + 2 * padX,
            heightPx: result.height + 2 * padY + (text ? labelHeight : 0) });
        }
        if (!variants.length) { errors.push({ code: failure?.code ?? "layout-impossible", severity: "error", message: `Cue "${cue.id}": ${failure?.message}`, cueId: cue.id, frame: cue.startFrame }); continue; }
        cues[cue.id] = { variants, label: text, ranges: units };
      }
      const next = { viewport: { width: box.width, height: box.height }, padX, padY, labelHeight, cues, errors };
      setMeasured(previous => previous && JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
    };
    const compose = () => {
      const font = getComputedStyle(probe).font, sample = track.cues.map(c => c.text).join(" ");
      if (document.fonts && font && !document.fonts.check(font, sample)) {
        setMeasured(null);
        void document.fonts.load(font, sample).then(measureAll, measureAll);
      } else measureAll();
    };
    compose();
    const observer = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(compose);
    observer?.observe(element);
    document.fonts?.addEventListener("loadingdone", compose);
    return () => { active = false; observer?.disconnect(); document.fonts?.removeEventListener("loadingdone", compose); };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- layoutKey captures every input by value
  }, [layoutKey, track, avoid]);

  const visible = useMemo(() => evaluateCaptionTrack(track, frame, { enterFrames, exitFrames }), [track, frame, enterFrames, exitFrames]);
  const placement = useMemo(() => {
    if (!measured) return undefined;
    const blocks = visible.flatMap(item => { const layout = measured.cues[item.cue.id]; return layout ? [{ id: item.cue.id, variants: layout.variants }] : []; });
    return placeCaptionBlocks(blocks, { viewport: measured.viewport, lane, avoidRegions: avoid, anchor, gapPx: measured.padX });
  }, [measured, visible, lane, avoid, anchor]);

  const diagnostics = useMemo(() => [...validation, ...(measured?.errors ?? []),
    ...(placement && !placement.ok ? [{ code: "caption-no-room", severity: "error" as const, message: placement.message, cueId: placement.blockId, frame }] : [])],
  [validation, measured, placement, frame]);
  const signature = JSON.stringify(diagnostics), notify = useRef(onDiagnostics), latest = useRef(diagnostics);
  notify.current = onDiagnostics; latest.current = diagnostics;
  useLayoutEffect(() => { notify.current?.(latest.current); }, [signature]);

  const reduce = reducedMotion === "auto" ? typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches : reducedMotion;
  const status = !measured ? "pending" : diagnostics.some(d => d.severity === "error") ? "error" : "ready";
  return <div {...props} ref={node => { root.current = node; if (typeof forwardedRef === "function") forwardedRef(node); else if (forwardedRef) forwardedRef.current = node; }}
    data-km-caption-performer="" data-caption-status={status} data-caption-warnings={diagnostics.filter(d => d.severity === "warning").length}
    style={{ position: "absolute", inset: 0, pointerEvents: "none", ...style }}>
    <p ref={lineProbe} aria-hidden="true" style={{ ...textStyle, position: "absolute", visibility: "hidden", left: 0, top: 0 }} />
    <span aria-hidden="true" style={{ ...textStyle, position: "absolute", visibility: "hidden", left: 0, top: 0 }}>
      <span ref={labelProbe} style={labelStyle} />
    </span>
    {measured && placement?.ok ? visible.map(item => {
      const layout = measured.cues[item.cue.id], rect = placement.rects[item.cue.id];
      const variant = layout?.variants[placement.variants[item.cue.id]];
      if (!layout || !rect || !variant) return null;
      const amount = Math.min(item.enter, item.exit), states = highlight === "word" ? item.wordStates : undefined;
      return <div key={item.cue.id} data-caption-cue={item.cue.id} lang={item.cue.lang} dir={item.cue.dir ?? "auto"}
        style={{ ...textStyle, position: "absolute", left: `${rect.x * 100}%`, top: `${rect.y * 100}%`, width: `${rect.width * 100}%`, height: `${rect.height * 100}%`,
          boxSizing: "border-box", padding: `${measured.padY}px ${measured.padX}px`, borderRadius: "0.3em", textAlign: "center",
          background: "var(--km-caption-backdrop, rgba(8, 12, 20, 0.72))", color: INK.spoken,
          opacity: reduce ? 1 : amount * amount * (3 - 2 * amount),
          transform: reduce ? undefined : `translateY(${(1 - Math.min(1, item.enter)) * 0.25}em)` }}>
        {layout.label ? <div style={{ ...labelStyle, fontSize: "0.62em", height: measured.labelHeight, color: "var(--km-caption-label, rgba(255, 255, 255, 0.72))" }}>{layout.label}</div> : null}
        {variant.lines.map(line => <div key={line.start}>
          {lineSpans(line, item.cue, layout.ranges, states).map(span => <span key={span.key} data-state={span.state}
            style={{ color: span.state === "upcoming" ? INK.upcoming : span.emphasis ? EMPHASIS[span.emphasis] : INK[span.state],
              ...(span.state === "active" ? { background: "var(--km-caption-active-bg, rgba(255, 209, 102, 0.3))", borderRadius: "0.15em",
                boxShadow: "0 0 0 0.08em var(--km-caption-active-bg, rgba(255, 209, 102, 0.3))" } : null) }}>{span.text}</span>)}
        </div>)}
      </div>;
    }) : null}
  </div>;
});

export type CaptionStageProps = Omit<CaptionPerformerProps, "highlight" | "enterFrames" | "exitFrames" | "reducedMotion">;
/** Static mode: whole phrases, no entrance or exit motion. */
export const CaptionStage = forwardRef<HTMLDivElement, CaptionStageProps>(function CaptionStage(props, ref) {
  return <CaptionPerformer {...props} ref={ref} highlight="phrase" enterFrames={0} exitFrames={0} reducedMotion />;
});
