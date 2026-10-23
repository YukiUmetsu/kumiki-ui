import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import type { ComponentPropsWithoutRef } from "react";
import { createCanvasMeasurer } from "../media/text-layout";
import type { Rect } from "../motion/types";
import {
  evaluateCodeStage, layoutCodeStage, tokenBox, validateCodeStage,
} from "./code-stage";
import type { CodeStageDiagnostic, CodeStageSpec } from "./code-stage";

export interface CodeStageViewProps extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  spec: CodeStageSpec;
  /** Absolute frame. The view owns no clock. */
  frame: number;
  width: number;
  height: number;
  /** Normalized safe rect for the listing. Default: 6% horizontal, 5% vertical inset. */
  safe?: Rect;
  /** Largest and smallest code font in px. Defaults scale with the short side (5% and 2.4%); below 3.2% a warning is raised. */
  maxFontPx?: number;
  minFontPx?: number;
  /** CSS font family for code. Pass the same family to every stage so widths match. */
  family?: string;
  onDiagnostics?: (diagnostics: CodeStageDiagnostic[]) => void;
}

/** Colours by token role. Every role has a token, with a fallback for standalone use. */
const KIND_COLOUR: Record<string, [string, string]> = {
  keyword: ["--km-code-keyword", "#7b3fb0"],
  string: ["--km-code-string", "#1f7a4d"],
  number: ["--km-code-number", "#a4530f"],
  comment: ["--km-code-comment", "#7a828e"],
  function: ["--km-code-function", "#1d5fb8"],
  plain: ["--km-code-plain", "#1d232b"],
};
const colourOf = (kind: string) => {
  const [token, fallback] = KIND_COLOUR[kind] ?? KIND_COLOUR.plain;
  return `var(${token}, ${fallback})`;
};

/** Measured, frame-addressed code: lines reveal, focus dims the rest, a token ring marks one occurrence. */
export const CodeStageView = forwardRef<HTMLDivElement, CodeStageViewProps>(function CodeStageView({
  spec, frame, width, height, safe, maxFontPx, minFontPx, family, onDiagnostics, style, ...props
}, ref) {
  const short = Math.min(width, height);
  const box = useMemo<Rect>(() => safe
    ? { x: safe.x * width, y: safe.y * height, width: safe.width * width, height: safe.height * height }
    : { x: width * .06, y: height * .05, width: width * .88, height: height * .9 }, [safe, width, height]);
  // Text is measured with the real face: re-measure once web fonts load, and report `pending` until then.
  const [fontEpoch, setFontEpoch] = useState(0);
  const [fontsReady, setFontsReady] = useState(() => typeof document === "undefined" || !document.fonts);
  const css = family ?? 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace';
  useEffect(() => {
    const fonts = typeof document !== "undefined" ? document.fonts : undefined;
    if (!fonts) return;
    let live = true;
    const bump = () => { if (!live) return; setFontEpoch(n => n + 1); setFontsReady(fonts.check(`400 32px ${css}`)); };
    void fonts.load(`400 32px ${css}`).then(bump, bump);
    fonts.addEventListener("loadingdone", bump);
    return () => { live = false; fonts.removeEventListener("loadingdone", bump); };
  }, [css]);
  const measure = useMemo(() => { void fontEpoch; return createCanvasMeasurer({}); }, [fontEpoch]);
  const layout = useMemo(() => layoutCodeStage(spec, box, {
    measure, family: css, maxFontPx: maxFontPx ?? Math.round(short * .05), minFontPx: minFontPx ?? Math.round(short * .024),
    readablePx: Math.round(short * .032),
  }), [spec, box, measure, css, maxFontPx, minFontPx, short]);
  const diagnostics = useMemo(() => validateCodeStage(spec, layout), [spec, layout]);
  const notify = useRef(onDiagnostics), latest = useRef(diagnostics);
  notify.current = onDiagnostics; latest.current = diagnostics;
  const signature = JSON.stringify(diagnostics);
  useEffect(() => { notify.current?.(latest.current); }, [signature]);

  const state = evaluateCodeStage(spec, frame);
  const focusToken = state.focus?.beat.kind === "token" ? state.focus.beat : undefined;
  const ring = focusToken ? tokenBox(layout, focusToken.lineId, focusToken.token, focusToken.occurrence ?? 0, measure) : undefined;
  const size = layout.font.size, digitsGap = size * .6;
  const status = diagnostics.some(d => d.severity === "error") ? "error" : fontsReady ? "ready" : "pending";
  return <div {...props} ref={ref} data-km-code-stage="" data-code-stage-beat={state.beat.id} data-code-stage-status={status}
    style={{ position: "relative", width: "100%", aspectRatio: `${width} / ${height}`, ...style }}>
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Code listing, ${spec.source.language}, ${spec.source.lines.length} lines`}
      style={{ display: "block", width: "100%", height: "100%", background: "var(--km-code-surface, #f7f8fa)" }}>
      {state.focus && state.focus.lines.length && state.focus.beat.kind === "focus" ? (() => {
        const first = layout.byId.get(state.focus!.lines[0]), last = layout.byId.get(state.focus!.lines[state.focus!.lines.length - 1]);
        return first && last ? <rect x={box.x - size * .3} y={first.y - size * .15} width={box.width + size * .6}
          height={last.y + size * layout.font.lineHeight - first.y + size * .3} rx={size * .2}
          fill="var(--km-code-focus, #2f5f8a)" opacity={.1 * state.focus!.amount} /> : null;
      })() : null}
      {layout.lines.map(line => {
        const opacity = state.lineOpacity[line.id] ?? 0;
        return <g key={line.id} opacity={opacity} data-code-line={line.id}>
          <text x={layout.gutter.x + layout.gutter.width - digitsGap} y={line.y + size * .95} textAnchor="end"
            fill="var(--km-code-gutter, #8a93a1)" style={{ font: layout.font.css }}>{line.number}</text>
          <text x={line.x} y={line.y + size * .95} fill="var(--km-code-plain, #1d232b)" style={{ font: layout.font.css, whiteSpace: "pre" }}>
            {line.tokens.map((t, i) => <tspan key={i} fill={colourOf(t.kind)}>{t.text}</tspan>)}
          </text>
        </g>;
      })}
      {ring ? <rect x={ring.x - size * .12} y={ring.y + size * .08} width={ring.width + size * .24} height={size * 1.3} rx={size * .2}
        fill="none" stroke="var(--km-code-focus, #2f5f8a)" strokeWidth={Math.max(2, short * .003)} opacity={state.focus?.amount ?? 0} /> : null}
    </svg>
  </div>;
});
