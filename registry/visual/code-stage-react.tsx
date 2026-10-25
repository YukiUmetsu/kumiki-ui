import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import type { ComponentPropsWithoutRef } from "react";
import { createCanvasMeasurer } from "../media/text-layout";
import type { Rect } from "../motion/types";
import {
  evaluateCodeStage, layoutCodeStage, tokenBox, validateCodeStage,
} from "./code-stage";
import type { CodeLayoutLine, CodeStageDiagnostic, CodeStageSpec, TerminalKind } from "./code-stage";

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

const TERMINAL_COLOUR: Record<TerminalKind, string> = {
  command: "var(--km-code-plain, #1d232b)",
  stdout: "var(--km-code-plain, #1d232b)",
  stderr: "var(--km-code-stderr, #a4530f)",
  status: "var(--km-code-plain, #1d232b)",
  label: "var(--km-code-muted, #5b6472)",
};
const STATUS_OK = "var(--km-status-success, #1f7a4d)", STATUS_FAIL = "var(--km-status-danger, #b42318)";

/** Measured, frame-addressed code: lines reveal, focus dims the rest, edits move between revisions, and captured
 * terminal output appears in a panel that is never executed. */
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
  const rowByKey = new Map(layout.rows.map(r => [r.key, r] as const));

  /** Each version of a row, with the opacity it is drawn at this frame. */
  const drawn = (rowKey: string): Array<{ version: CodeLayoutLine; opacity: number; revision: string; changed?: [number, number] }> => {
    const row = rowByKey.get(rowKey);
    if (!row) return [];
    const reveal = state.lineOpacity[rowKey] ?? 1;
    if (state.edit) {
      const e = state.edit.rows[rowKey];
      if (!e) return [];
      const out: Array<{ version: CodeLayoutLine; opacity: number; revision: string; changed?: [number, number] }> = [];
      const to = row.versions[state.edit.to], from = row.versions[state.edit.from];
      if (from && e.from > 0.001) out.push({ version: from, opacity: e.from * reveal, revision: state.edit.from });
      if (to && e.to > 0.001) out.push({ version: to, opacity: e.to * reveal, revision: state.edit.to, changed: e.changed?.to });
      return out;
    }
    const current = row.versions[state.revision];
    return current ? [{ version: current, opacity: reveal, revision: state.revision }] : [];
  };

  const term = state.terminal, panel = layout.terminal?.rect;
  const pad = size * .6;
  return <div {...props} ref={ref} data-km-code-stage="" data-code-stage-beat={state.beat.id} data-code-stage-status={status}
    data-code-stage-revision={state.revision} style={{ position: "relative", width: "100%", aspectRatio: `${width} / ${height}`, ...style }}>
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Code listing, ${spec.source.language}, ${spec.source.lines.length} lines`}
      style={{ display: "block", width: "100%", height: "100%", background: "var(--km-code-surface, #f7f8fa)" }}>
      {state.focus && state.focus.lines.length && state.focus.beat.kind === "focus" ? (() => {
        const first = rowByKey.get(state.focus!.lines[0]), last = rowByKey.get(state.focus!.lines[state.focus!.lines.length - 1]);
        return first && last ? <rect x={box.x - size * .3} y={first.y - size * .15} width={box.width + size * .6}
          height={last.y + size * layout.font.lineHeight - first.y + size * .3} rx={size * .2}
          fill="var(--km-code-focus, #2f5f8a)" opacity={.1 * state.focus!.amount} /> : null;
      })() : null}
      {layout.rows.map(row => drawn(row.key).map(({ version, opacity, revision, changed }) => <g key={`${row.key}@${revision}`} opacity={opacity}
        data-code-line={row.key} data-code-revision={revision}>
        {changed ? (() => {
          const [a, b] = changed;
          const start = version.tokens[a], end = version.tokens[b - 1];
          const x = start ? start.x : version.x + layout.font.size * .4;
          const right = end && b > a ? end.x + end.width : x + layout.font.size * .4;
          return <rect x={x - size * .1} y={version.y + size * .08} width={right - x + size * .2} height={size * 1.3} rx={size * .15}
            fill="var(--km-code-focus, #2f5f8a)" opacity={.18} data-code-change={row.key} />;
        })() : null}
        <text x={layout.gutter.x + layout.gutter.width - digitsGap} y={version.y + size * .95} textAnchor="end"
          fill="var(--km-code-gutter, #8a93a1)" style={{ font: layout.font.css }}>{version.number}</text>
        <text x={version.x} y={version.y + size * .95} fill="var(--km-code-plain, #1d232b)" style={{ font: layout.font.css, whiteSpace: "pre" }}>
          {version.tokens.map((t, i) => <tspan key={i} fill={colourOf(t.kind)}>{t.text}</tspan>)}
        </text>
      </g>))}
      {ring ? <rect x={ring.x - size * .12} y={ring.y + size * .08} width={ring.width + size * .24} height={size * 1.3} rx={size * .2}
        fill="none" stroke="var(--km-code-focus, #2f5f8a)" strokeWidth={Math.max(2, short * .003)} opacity={state.focus?.amount ?? 0} /> : null}
      {panel ? <g data-code-terminal="">
        <rect x={panel.x} y={panel.y} width={panel.width} height={panel.height} rx={size * .3}
          fill="var(--km-code-terminal, #eef1f5)" stroke="var(--km-code-rule, #d5dbe3)" strokeWidth={Math.max(1, short * .002)} />
        <text x={panel.x + pad} y={panel.y + pad + size * .95} fill="var(--km-code-muted, #5b6472)" style={{ font: layout.font.css }}
          data-code-terminal-header="">Captured output · not executed</text>
        {term ? term.lines.map((line, i) => {
          const y = panel.y + pad + (i + 1) * layout.terminal!.lineStep + size * .95;
          const prefix = line.kind === "command" ? "$ " : "";
          return <text key={i} x={panel.x + pad} y={y} opacity={line.opacity} data-code-terminal-line={line.kind}
            fill={TERMINAL_COLOUR[line.kind]} style={{ font: layout.font.css, whiteSpace: "pre" }}>{prefix}{line.text}</text>;
        }) : null}
        {term && term.exitCode !== undefined ? <text x={panel.x + pad}
          y={panel.y + pad + (term.lines.length + 1) * layout.terminal!.lineStep + size * .95} opacity={term.exitOpacity}
          fill={term.exitCode === 0 ? STATUS_OK : STATUS_FAIL} style={{ font: layout.font.css }} data-code-terminal-exit={term.exitCode}>
          {`exit ${term.exitCode}`}</text> : null}
      </g> : null}
    </svg>
  </div>;
});
