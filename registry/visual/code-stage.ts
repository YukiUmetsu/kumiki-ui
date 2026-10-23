/** CodeStage core: measured, pre-tokenized source code that reveals line by line, focuses a line range or one
 * token occurrence, and never reflows. Layout takes an injected font measurer and sizes the type so every
 * line fits the box — code is never truncated; if it cannot fit above the minimum size, that is an error.
 * Evaluation is a pure function of the frame, so seeks are exact.
 *
 * Tokenization is supplied by the caller (`tokens` per line id). No grammar ships with the library: tokens
 * must concatenate exactly to their line, which is checked. Typed edits, diffs and terminal output are not in
 * this slice; the commands a stage displays are never executed.
 */
import type { MeasureText } from "../media/text-layout";
import { evaluateEasing } from "../motion/easing";
import type { Diagnostic, RationalFps, Rect } from "../motion/types";

export interface CodeLine {
  /** Stable identity. Beats and anchors refer to lines by this id, never by number. */
  id: string;
  text: string;
}
export interface CodeToken {
  text: string;
  /** Role name the renderer colours, e.g. "keyword", "string", "comment", "plain". */
  kind: string;
}
export interface CodeSource {
  id: string;
  language: string;
  lines: readonly CodeLine[];
  /** Tokens per line id. For each line, the token texts must concatenate exactly to the line's text. */
  tokens: Readonly<Record<string, readonly CodeToken[]>>;
}

export type CodeStageBeat =
  /** The whole listing is visible and nothing is focused. */
  | { id: string; kind: "establish"; durationFrames: number }
  /** Lines appear one after another across the beat; lines not yet revealed stay laid out but invisible. */
  | { id: string; kind: "reveal"; lineIds: readonly string[]; durationFrames: number }
  /** Lines from `from` to `to` (inclusive, in source order) stay bright; the rest dim. */
  | { id: string; kind: "focus"; from: string; to: string; durationFrames: number }
  /** One occurrence of `token` in `lineId` is ringed; its line stays bright, the rest dim. */
  | { id: string; kind: "token"; lineId: string; token: string; occurrence?: number; durationFrames: number };

export interface CodeStageSpec {
  id: string;
  fps: RationalFps;
  source: CodeSource;
  beats: readonly CodeStageBeat[];
  /** Frames for focus to dim in and out. Default 18. */
  moveFrames?: number;
}

export interface CodeStageOptions {
  measure: MeasureText;
  /** Font size limits in px. The layout uses the largest size that fits, never above `maxFontPx`. */
  maxFontPx: number;
  minFontPx: number;
  /** Below this the layout warns `code-stage-text-small`: legal, but too small to read comfortably on a phone. */
  readablePx?: number;
  /** CSS font family for code. Must be the same family the view renders with, or widths will be wrong. */
  family?: string;
  /** Line height as a multiple of the font size. Default 1.5. */
  lineHeight?: number;
  weight?: number;
}

export interface CodeStageDiagnostic extends Diagnostic { lineId?: string; beatId?: string }

export interface CodeLayoutLine {
  id: string;
  /** 1-based number, shown in the gutter. */
  number: number;
  /** Top of the line's box. */
  y: number;
  /** Where the text starts (after the gutter). */
  x: number;
  text: string;
  tokens: ReadonlyArray<{ text: string; kind: string; x: number; width: number }>;
}

export interface CodeStageLayout {
  font: { size: number; family: string; weight: number; lineHeight: number; css: string };
  box: Rect;
  gutter: { x: number; width: number; digits: number };
  lines: readonly CodeLayoutLine[];
  byId: ReadonlyMap<string, CodeLayoutLine>;
  diagnostics: CodeStageDiagnostic[];
}

const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace';
const css = (size: number, weight: number, family: string) => `${weight} ${size}px ${family}`;

/** Splits text into lines with stable ids (`${prefix}1`, `${prefix}2`, …). */
export function codeLines(text: string, prefix = "l"): CodeLine[] {
  return text.split("\n").map((line, i) => ({ id: `${prefix}${i + 1}`, text: line }));
}

/** Largest integer font size at which every line and the gutter fit the box and the height, within limits. */
function fitFontSize(lines: readonly CodeLine[], box: Rect, options: CodeStageOptions, weight: number, family: string, lineHeight: number) {
  const digits = String(lines.length).length;
  const at100 = (text: string) => options.measure(css(100, weight, family), text) / 100;
  const widest = Math.max(0, ...lines.map(l => at100(l.text)));
  // Gutter = digits plus a fixed gap of 1.2 em, so it scales with the font too.
  const gutterPerEm = at100("0".repeat(digits)) + 1.2;
  const widthFit = widest + gutterPerEm > 0 ? box.width / (widest + gutterPerEm) : Infinity;
  const heightFit = lines.length > 0 ? box.height / (lineHeight * lines.length) : Infinity;
  const size = Math.floor(Math.min(options.maxFontPx, widthFit, heightFit));
  return { size, gutterPerEm, digits };
}

/**
 * Lays the source out in `box`. Font size is the largest integer that fits the width (with the gutter) and the
 * height. Lines are top-aligned so the listing never shifts. Each token's x comes from measuring its exact
 * prefix, so highlight rings land on the real glyphs.
 */
export function layoutCodeStage(spec: CodeStageSpec, box: Rect, options: CodeStageOptions): CodeStageLayout {
  const family = options.family ?? MONO, weight = options.weight ?? 400, lineHeight = options.lineHeight ?? 1.5;
  const diagnostics: CodeStageDiagnostic[] = [];
  const { lines } = spec.source;
  const fit = fitFontSize(lines, box, options, weight, family, lineHeight);
  const size = Math.max(1, fit.size);
  const font = { size, family, weight, lineHeight, css: css(size, weight, family) };
  if (options.readablePx !== undefined && size >= options.minFontPx && size < options.readablePx)
    diagnostics.push({ code: "code-stage-text-small", severity: "warning",
      message: `The code is ${size} px, under the ${options.readablePx} px comfortable size for this output; use shorter lines or fewer of them.` });
  if (size < options.minFontPx)
    diagnostics.push({ code: "code-stage-font-small", severity: "error",
      message: `The code fits only at ${size} px in a ${Math.round(box.width)}×${Math.round(box.height)} box; the minimum is ${options.minFontPx} px. Use a larger frame or fewer lines.` });
  const gutterWidth = Math.ceil(options.measure(font.css, "0".repeat(fit.digits)) + size * 1.2);
  const lineStep = size * lineHeight;
  const laid: CodeLayoutLine[] = [];
  const seen = new Set<string>();
  lines.forEach((line, index) => {
    if (seen.has(line.id)) diagnostics.push({ code: "code-stage-line-duplicate", severity: "error", lineId: line.id, message: `Line id "${line.id}" appears twice.` });
    seen.add(line.id);
    let tokens = spec.source.tokens[line.id];
    if (!tokens) {
      diagnostics.push({ code: "code-stage-tokens-missing", severity: "warning", lineId: line.id, message: `Line "${line.id}" has no tokens; it is drawn as plain text.` });
      tokens = [{ text: line.text, kind: "plain" }];
    }
    if (tokens.map(t => t.text).join("") !== line.text)
      diagnostics.push({ code: "code-stage-token-mismatch", severity: "error", lineId: line.id, message: `The tokens of line "${line.id}" do not concatenate to its text; the highlight would change the code.` });
    const x0 = box.x + gutterWidth;
    let prefix = "";
    const placed = tokens.map(token => {
      const x = x0 + options.measure(font.css, prefix);
      prefix += token.text;
      return { text: token.text, kind: token.kind, x, width: options.measure(font.css, token.text) };
    });
    laid.push({ id: line.id, number: index + 1, y: box.y + index * lineStep, x: x0, text: line.text, tokens: placed });
  });
  return {
    font, box,
    gutter: { x: box.x, width: gutterWidth, digits: fit.digits },
    lines: laid,
    byId: new Map(laid.map(l => [l.id, l])),
    diagnostics,
  };
}

/** Index of the `occurrence`th (0-based) match of `token` in `text`, or -1. */
export function tokenOccurrenceIndex(text: string, token: string, occurrence = 0): number {
  if (!token) return -1;
  let from = 0, found = -1;
  for (let i = 0; i <= occurrence; i++) {
    found = text.indexOf(token, from);
    if (found < 0) return -1;
    from = found + token.length;
  }
  return found;
}

/** Where one occurrence of `token` sits in a laid-out line, in the same px space. Undefined if it is not there. */
export function tokenBox(layout: CodeStageLayout, lineId: string, token: string, occurrence = 0, measure: MeasureText): Rect | undefined {
  const line = layout.byId.get(lineId);
  const found = line ? tokenOccurrenceIndex(line.text, token, occurrence) : -1;
  if (!line || found < 0) return undefined;
  return {
    x: line.x + measure(layout.font.css, line.text.slice(0, found)), y: line.y,
    width: measure(layout.font.css, token), height: layout.font.size * layout.font.lineHeight,
  };
}

/** Every beat in order, and the frame each one starts at. */
export function codeStageDuration(spec: CodeStageSpec): number {
  return spec.beats.reduce((n, b) => n + b.durationFrames, 0);
}

function focusLines(spec: CodeStageSpec, beat: Extract<CodeStageBeat, { kind: "focus" | "token" }>): string[] {
  const ids = spec.source.lines.map(l => l.id);
  if (beat.kind === "token") return [beat.lineId];
  const a = ids.indexOf(beat.from), b = ids.indexOf(beat.to);
  return a < 0 || b < 0 || a > b ? [] : ids.slice(a, b + 1);
}

/** Validates the story and, given a layout, the on-screen result. Refuses references to lines that do not exist. */
export function validateCodeStage(spec: CodeStageSpec, layout?: CodeStageLayout): CodeStageDiagnostic[] {
  const out: CodeStageDiagnostic[] = [...(layout?.diagnostics ?? [])];
  const report = (severity: "error" | "warning", code: string, message: string, extra: Partial<CodeStageDiagnostic> = {}) =>
    out.push({ code, severity, message, ...extra });
  const ids = new Set(spec.source.lines.map(l => l.id));
  if (ids.size !== spec.source.lines.length) report("error", "code-stage-line-duplicate", "Two lines share an id.");
  const moveFrames = spec.moveFrames ?? 18;
  for (const beat of spec.beats) {
    if (!Number.isSafeInteger(beat.durationFrames) || beat.durationFrames < 1)
      report("error", "code-stage-beat-invalid", `Beat "${beat.id}" needs a positive integer duration.`, { beatId: beat.id });
    if (beat.kind === "reveal") for (const id of beat.lineIds) if (!ids.has(id)) report("error", "code-stage-line-unknown", `Beat "${beat.id}" reveals unknown line "${id}".`, { beatId: beat.id, lineId: id });
    if (beat.kind === "focus") {
      for (const id of [beat.from, beat.to]) if (!ids.has(id)) report("error", "code-stage-line-unknown", `Beat "${beat.id}" focuses unknown line "${id}".`, { beatId: beat.id, lineId: id });
      if (ids.has(beat.from) && ids.has(beat.to) && focusLines(spec, beat).length === 0)
        report("error", "code-stage-range-invalid", `Beat "${beat.id}" starts after it ends.`, { beatId: beat.id });
    }
    if (beat.kind === "token") {
      const line = spec.source.lines.find(l => l.id === beat.lineId);
      if (!line) report("error", "code-stage-line-unknown", `Beat "${beat.id}" points at unknown line "${beat.lineId}".`, { beatId: beat.id, lineId: beat.lineId });
      else if (!beat.token || !line.text.includes(beat.token))
        report("error", "code-stage-token-missing", `Beat "${beat.id}" highlights "${beat.token}", which line "${beat.lineId}" does not contain.`, { beatId: beat.id, lineId: beat.lineId });
      else if (tokenOccurrenceIndex(line.text, beat.token, beat.occurrence ?? 0) < 0)
        report("error", "code-stage-token-missing", `Beat "${beat.id}" asks for occurrence ${beat.occurrence} of "${beat.token}", but line "${beat.lineId}" has fewer.`, { beatId: beat.id, lineId: beat.lineId });
    }
    if ((beat.kind === "focus" || beat.kind === "token") && beat.durationFrames < moveFrames * 2)
      report("warning", "code-stage-beat-short", `Beat "${beat.id}" ends before the focus settles and is read; hold it for at least ${moveFrames * 2} frames.`, { beatId: beat.id });
  }
  return out;
}

export interface CodeStageFrame {
  beatIndex: number;
  beat: CodeStageBeat;
  /** Frames since the current beat started. */
  local: number;
  /** Opacity per line id, including dimming. Lines not yet revealed are 0. */
  lineOpacity: Readonly<Record<string, number>>;
  /** The focus in effect, with its strength (0–1) while it dims in or out. Undefined when nothing is focused. */
  focus?: { beat: Extract<CodeStageBeat, { kind: "focus" | "token" }>; lines: readonly string[]; amount: number };
}

/** The frame's listing state: which lines are visible, how dim the rest is, and which focus is in effect. */
export function evaluateCodeStage(spec: CodeStageSpec, frame: number): CodeStageFrame {
  const moveFrames = spec.moveFrames ?? 18;
  const order = spec.source.lines.map(l => l.id);
  const lineOpacity: Record<string, number> = Object.fromEntries(order.map(id => [id, 0]));
  const last = spec.beats.length - 1;
  const t = Math.max(0, frame);
  let cursor = 0, beatIndex = last, local = spec.beats[last]?.durationFrames ?? 0;
  let lastFocus: { beat: Extract<CodeStageBeat, { kind: "focus" | "token" }>; start: number; end: number } | undefined;
  spec.beats.forEach((beat, i) => {
    const start = cursor, end = start + beat.durationFrames;
    if (t >= start && t < end) { beatIndex = i; local = t - start; }
    if (beat.kind === "focus" || beat.kind === "token") { if (t >= start) lastFocus = { beat, start, end }; }
    // Reveals accumulate: a line stays visible once its reveal has run; before that it stays at 0 (laid out, invisible).
    if (beat.kind === "reveal" && t >= start) {
      const slot = beat.durationFrames / Math.max(1, beat.lineIds.length);
      beat.lineIds.forEach((id, k) => {
        const progress = t >= end ? 1 : Math.max(0, Math.min(1, (t - start - k * slot) / (slot * .6)));
        lineOpacity[id] = Math.max(lineOpacity[id] ?? 0, evaluateEasing("ease-out", progress));
      });
    }
    cursor = end;
  });
  // Focus dims the other lines in over moveFrames and back out over moveFrames after its beat ends.
  let focus: CodeStageFrame["focus"];
  if (lastFocus) {
    const amount = t < lastFocus.end
      ? evaluateEasing("ease-in-out", Math.min(1, (t - lastFocus.start) / moveFrames))
      : 1 - evaluateEasing("ease-in-out", Math.min(1, (t - lastFocus.end) / moveFrames));
    if (amount > 0) {
      const lines = focusLines(spec, lastFocus.beat);
      focus = { beat: lastFocus.beat, lines, amount };
      for (const id of order) if (!lines.includes(id)) lineOpacity[id] *= 1 - 0.7 * amount;
    }
  }
  return { beatIndex, beat: spec.beats[beatIndex], local, lineOpacity, focus };
}
