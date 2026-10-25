/** CodeStage core: measured, pre-tokenized source code that reveals line by line, focuses a line range or one
 * token occurrence, edits between complete revisions, and shows captured terminal output. It never reflows: every
 * line identity has one fixed slot across all revisions. Layout takes an injected font measurer and sizes the type
 * so every line fits the box — code is never truncated; if it cannot fit above the minimum size, that is an error.
 * Evaluation is a pure function of the frame, so seeks are exact.
 *
 * Tokenization is supplied by the caller (`tokens` per line id). No grammar ships with the library: tokens must
 * concatenate exactly to their line, which is checked. Terminal lines are text the caller supplies; the commands
 * they show are never executed, and no shell, code or network is touched here.
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
/** A complete later version of the listing. Lines keep their ids across revisions; the id is the diff identity. */
export interface CodeRevision {
  id: string;
  lines: readonly CodeLine[];
  tokens: Readonly<Record<string, readonly CodeToken[]>>;
}
/** `command` is what was typed (shown with `$`), `stdout` and `stderr` are what it printed, `status` and `label` are
 * explanatory text in the terminal panel. */
export type TerminalKind = "command" | "stdout" | "stderr" | "status" | "label";
export interface TerminalLine {
  kind: TerminalKind;
  text: string;
}

export type CodeStageBeat =
  /** The whole listing is visible and nothing is focused. */
  | { id: string; kind: "establish"; durationFrames: number }
  /** Lines appear one after another across the beat; lines not yet revealed stay laid out but invisible. */
  | { id: string; kind: "reveal"; lineIds: readonly string[]; durationFrames: number }
  /** Lines from `from` to `to` (inclusive, in source order) stay bright; the rest dim. */
  | { id: string; kind: "focus"; from: string; to: string; durationFrames: number }
  /** One occurrence of `token` in `lineId` is ringed; its line stays bright, the rest dim. */
  | { id: string; kind: "token"; lineId: string; token: string; occurrence?: number; durationFrames: number }
  /** Changes the listing into revision `to`. Removed lines fade out, added lines fade in, and changed tokens are marked. */
  | { id: string; kind: "edit"; to: string; durationFrames: number }
  /** Shows captured terminal lines in the panel below the listing, one after another. `exitCode` adds a status line. */
  | { id: string; kind: "output"; lines: readonly TerminalLine[]; exitCode?: number; durationFrames: number };

export interface CodeStageSpec {
  id: string;
  fps: RationalFps;
  source: CodeSource;
  /** Later revisions, referenced by `edit` beats. The base listing is `source`. */
  revisions?: readonly CodeRevision[];
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

/** One identity's slot in the stage. Its text and number differ per revision, its slot never moves. */
export interface CodeLayoutRow {
  key: string;
  lineId: string;
  y: number;
  versions: Readonly<Record<string, CodeLayoutLine>>;
}

export interface CodeStageLayout {
  font: { size: number; family: string; weight: number; lineHeight: number; css: string };
  box: Rect;
  gutter: { x: number; width: number; digits: number };
  /** The base revision's lines, in order. */
  lines: readonly CodeLayoutLine[];
  byId: ReadonlyMap<string, CodeLayoutLine>;
  rows: readonly CodeLayoutRow[];
  /** Panel for captured terminal output, below the listing. Undefined when the spec has no output beat. */
  terminal?: { rect: Rect; lineStep: number; lines: number };
  diagnostics: CodeStageDiagnostic[];
}

const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace';
const css = (size: number, weight: number, family: string) => `${weight} ${size}px ${family}`;

/** Splits text into lines with stable ids (`${prefix}1`, `${prefix}2`, …). */
export function codeLines(text: string, prefix = "l"): CodeLine[] {
  return text.split("\n").map((line, i) => ({ id: `${prefix}${i + 1}`, text: line }));
}

const revisionsOf = (spec: CodeStageSpec) => new Map<string, { id: string; lines: readonly CodeLine[]; tokens: Readonly<Record<string, readonly CodeToken[]>> }>([
  [spec.source.id, { id: spec.source.id, lines: spec.source.lines, tokens: spec.source.tokens }],
  ...(spec.revisions ?? []).map(r => [r.id, r] as const),
]);

/** Revision order: the base first, then each revision the edit beats reach, in beat order. */
export function codeStageRevisionOrder(spec: CodeStageSpec): string[] {
  const known = revisionsOf(spec);
  const order = [spec.source.id];
  for (const beat of spec.beats) if (beat.kind === "edit" && known.has(beat.to) && !order.includes(beat.to)) order.push(beat.to);
  return order;
}

/** Union of line identities across the revision order, merged with an LCS on ids. A line that moves appears as a
 * removed row and an added row with a new key, so no motion is implied that the diff did not record. */
interface MutableRow { key: string; lineId: string; presentIn: string[] }
function mergeRows(previous: MutableRow[], ids: readonly string[], revisionId: string): MutableRow[] {
  const a = previous.map(r => r.lineId), b = ids;
  const n = a.length, m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i -= 1) for (let j = m - 1; j >= 0; j -= 1)
    dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const used = new Set(previous.map(r => r.key));
  const out: MutableRow[] = [];
  let i = 0, j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j] && dp[i][j] === dp[i + 1][j + 1] + 1) {
      out.push({ ...previous[i], presentIn: [...previous[i].presentIn, revisionId] });
      i += 1; j += 1;
    } else if (i < n && (j >= m || dp[i + 1][j] >= dp[i][j + 1])) {
      out.push(previous[i]);
      i += 1;
    } else {
      const key = used.has(b[j]) ? `${b[j]}#${revisionId}` : b[j];
      used.add(key);
      out.push({ key, lineId: b[j], presentIn: [revisionId] });
      j += 1;
    }
  }
  return out;
}

const rowCache = new WeakMap<CodeStageSpec, readonly CodeStageRow[]>();
export interface CodeStageRow { key: string; lineId: string; presentIn: readonly string[] }

/** One row per line identity, in display order. For a spec with no edits these are the base lines, keyed by id. */
export function codeStageRows(spec: CodeStageSpec): readonly CodeStageRow[] {
  const cached = rowCache.get(spec);
  if (cached) return cached;
  const known = revisionsOf(spec);
  const order = codeStageRevisionOrder(spec);
  let rows: MutableRow[] = [];
  spec.source.lines.forEach(line => { if (!rows.some(r => r.key === line.id)) rows.push({ key: line.id, lineId: line.id, presentIn: [spec.source.id] }); });
  for (const revisionId of order.slice(1)) {
    const revision = known.get(revisionId);
    if (revision) rows = mergeRows(rows, [...new Set(revision.lines.map(l => l.id))], revisionId);
  }
  const result = rows.map(r => ({ key: r.key, lineId: r.lineId, presentIn: r.presentIn }));
  rowCache.set(spec, result);
  return result;
}

/** Token range that differs between two versions of one line, by common prefix and suffix. Undefined when equal. */
export function changedTokenSpan(before: readonly CodeToken[], after: readonly CodeToken[]): { from: [number, number]; to: [number, number] } | undefined {
  const same = (x: CodeToken, y: CodeToken) => x.text === y.text && x.kind === y.kind;
  let start = 0;
  while (start < before.length && start < after.length && same(before[start], after[start])) start += 1;
  let endBefore = before.length, endAfter = after.length;
  while (endBefore > start && endAfter > start && same(before[endBefore - 1], after[endAfter - 1])) { endBefore -= 1; endAfter -= 1; }
  if (start === before.length && start === after.length) return undefined;
  return { from: [start, endBefore], to: [start, endAfter] };
}

/** Largest integer font size at which every line and the gutter fit the box and the height, within limits. */
function fitFontSize(widestEm: number, digits: number, rowCount: number, box: Rect, options: CodeStageOptions, weight: number, family: string, lineHeight: number) {
  const at100 = (text: string) => options.measure(css(100, weight, family), text) / 100;
  // Gutter = digits plus a fixed gap of 1.2 em, so it scales with the font too.
  const gutterPerEm = at100("0".repeat(digits)) + 1.2;
  const widthFit = widestEm + gutterPerEm > 0 ? box.width / (widestEm + gutterPerEm) : Infinity;
  const heightFit = rowCount > 0 ? box.height / (lineHeight * rowCount) : Infinity;
  const size = Math.floor(Math.min(options.maxFontPx, widthFit, heightFit));
  return { size, gutterPerEm, digits };
}

/**
 * Lays the source out in `box`. Font size is the largest integer that fits the width (with the gutter) and the
 * height, across every revision, so the size never changes between revisions. Lines are top-aligned by slot.
 * Each token's x comes from measuring its exact prefix, so highlight rings land on the real glyphs.
 */
export function layoutCodeStage(spec: CodeStageSpec, box: Rect, options: CodeStageOptions): CodeStageLayout {
  const family = options.family ?? MONO, weight = options.weight ?? 400, lineHeight = options.lineHeight ?? 1.5;
  const diagnostics: CodeStageDiagnostic[] = [];
  const known = revisionsOf(spec);
  const rows = codeStageRows(spec);
  const order = codeStageRevisionOrder(spec);
  const at100 = (text: string) => options.measure(css(100, weight, family), text) / 100;
  const outputs = spec.beats.filter((b): b is Extract<CodeStageBeat, { kind: "output" }> => b.kind === "output");
  const terminalLines = Math.max(0, ...outputs.map(b => b.lines.length + (b.exitCode === undefined ? 0 : 1)));
  const terminalWidestEm = Math.max(0, ...outputs.flatMap(b => [...b.lines.map(l => `$ ${l.text}`), ...(b.exitCode === undefined ? [] : [`exit ${b.exitCode}`])]).map(at100));
  let widestEm = terminalWidestEm;
  let maxLines = 1;
  for (const revisionId of order) {
    const revision = known.get(revisionId);
    if (!revision) continue;
    maxLines = Math.max(maxLines, revision.lines.length);
    for (const line of revision.lines) widestEm = Math.max(widestEm, at100(line.text));
  }
  const digits = String(maxLines).length;
  // Reserve the terminal panel from a first-pass size, then fit the listing above it.
  let codeBox: Rect = box, panel: Rect | undefined;
  const lineStep0 = lineHeight;
  if (terminalLines > 0) {
    const guess = Math.max(1, fitFontSize(widestEm, digits, rows.length, box, options, weight, family, lineHeight).size);
    const height = Math.ceil((terminalLines + 1) * guess * lineStep0 + guess * 1.2);
    const gap = guess * .8;
    codeBox = { ...box, height: Math.max(1, box.height - height - gap) };
    panel = { x: box.x, y: box.y + box.height - height, width: box.width, height };
  }
  const fit = fitFontSize(widestEm, digits, rows.length, codeBox, options, weight, family, lineHeight);
  const size = Math.max(1, fit.size);
  const font = { size, family, weight, lineHeight, css: css(size, weight, family) };
  if (options.readablePx !== undefined && size >= options.minFontPx && size < options.readablePx)
    diagnostics.push({ code: "code-stage-text-small", severity: "warning",
      message: `The code is ${size} px, under the ${options.readablePx} px comfortable size for this output; use shorter lines or fewer of them.` });
  if (size < options.minFontPx)
    diagnostics.push({ code: "code-stage-font-small", severity: "error",
      message: `The code fits only at ${size} px in a ${Math.round(box.width)}×${Math.round(box.height)} box; the minimum is ${options.minFontPx} px. Use a larger frame or fewer lines.` });
  if (panel) {
    const widest = terminalWidestEm * size;
    if (widest > panel.width - size * 1.2)
      diagnostics.push({ code: "code-stage-terminal-clipped", severity: "error",
        message: `A terminal line is ${Math.ceil(widest)} px wide at ${size} px, wider than the panel. Shorten the line or use a larger frame.` });
  }
  const gutterWidth = Math.ceil(options.measure(font.css, "0".repeat(fit.digits)) + size * 1.2);
  const lineStep = size * lineHeight;
  // Tokens and gutter numbers are per revision; the row's slot is shared.
  const layoutRows: CodeLayoutRow[] = rows.map((row, index) => {
    const versions: Record<string, CodeLayoutLine> = {};
    for (const revisionId of row.presentIn) {
      const revision = known.get(revisionId);
      const line = revision?.lines.find(l => l.id === row.lineId);
      if (!revision || !line) continue;
      let tokens = revision.tokens[line.id];
      if (!tokens) {
        diagnostics.push({ code: "code-stage-tokens-missing", severity: "warning", lineId: line.id, message: `Line "${line.id}" has no tokens; it is drawn as plain text.` });
        tokens = [{ text: line.text, kind: "plain" }];
      }
      if (tokens.map(t => t.text).join("") !== line.text)
        diagnostics.push({ code: "code-stage-token-mismatch", severity: "error", lineId: line.id,
          message: `The tokens of line "${line.id}"${revisionId === spec.source.id ? "" : ` in revision "${revisionId}"`} do not concatenate to its text; the highlight would change the code.` });
      const x0 = box.x + gutterWidth;
      let prefix = "";
      const placed = tokens.map(token => {
        const x = x0 + options.measure(font.css, prefix);
        prefix += token.text;
        return { text: token.text, kind: token.kind, x, width: options.measure(font.css, token.text) };
      });
      const number = rows.slice(0, index + 1).filter(r => r.presentIn.includes(revisionId)).length;
      versions[revisionId] = { id: line.id, number, y: codeBox.y + index * lineStep, x: x0, text: line.text, tokens: placed };
    }
    return { key: row.key, lineId: row.lineId, y: codeBox.y + index * lineStep, versions };
  });
  const baseRows = layoutRows.filter(r => r.versions[spec.source.id]);
  const lines = baseRows.map(r => r.versions[spec.source.id]);
  const seen = new Set<string>();
  for (const line of spec.source.lines) {
    if (seen.has(line.id)) diagnostics.push({ code: "code-stage-line-duplicate", severity: "error", lineId: line.id, message: `Line id "${line.id}" appears twice.` });
    seen.add(line.id);
  }
  return {
    font, box,
    gutter: { x: box.x, width: gutterWidth, digits: fit.digits },
    lines,
    byId: new Map(lines.map(l => [l.id, l])),
    rows: layoutRows,
    terminal: panel ? { rect: panel, lineStep: size * lineHeight, lines: terminalLines } : undefined,
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
  const rows = codeStageRows(spec).map(r => r.key);
  if (beat.kind === "token") return rows.filter(k => k === beat.lineId || k.startsWith(`${beat.lineId}#`));
  const a = rows.indexOf(beat.from), b = rows.indexOf(beat.to);
  return a < 0 || b < 0 || a > b ? [] : rows.slice(a, b + 1);
}

/** Validates the story and, given a layout, the on-screen result. Refuses references to lines that do not exist. */
export function validateCodeStage(spec: CodeStageSpec, layout?: CodeStageLayout): CodeStageDiagnostic[] {
  const out: CodeStageDiagnostic[] = [...(layout?.diagnostics ?? [])];
  const report = (severity: "error" | "warning", code: string, message: string, extra: Partial<CodeStageDiagnostic> = {}) =>
    out.push({ code, severity, message, ...extra });
  const known = revisionsOf(spec);
  const ids = new Set(spec.source.lines.map(l => l.id));
  if (ids.size !== spec.source.lines.length) report("error", "code-stage-line-duplicate", "Two lines share an id.");
  const revisionIds = new Set<string>();
  for (const revision of spec.revisions ?? []) {
    if (revision.id === spec.source.id || revisionIds.has(revision.id))
      report("error", "code-stage-revision-duplicate", `Revision id "${revision.id}" is used more than once.`);
    revisionIds.add(revision.id);
  }
  const moveFrames = spec.moveFrames ?? 18;
  let current = spec.source.id;
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
    if (beat.kind === "edit") {
      const target = known.get(beat.to);
      if (!target) report("error", "code-stage-revision-unknown", `Beat "${beat.id}" edits to revision "${beat.to}", which is not defined.`, { beatId: beat.id });
      else {
        const before = known.get(current);
        const same = before && before.lines.length === target.lines.length && before.lines.every((l, i) => l.id === target.lines[i].id && l.text === target.lines[i].text);
        if (same) report("warning", "code-stage-edit-empty", `Beat "${beat.id}" changes nothing: revision "${beat.to}" matches the one before it.`, { beatId: beat.id });
        current = beat.to;
      }
    }
    if (beat.kind === "output") {
      if (beat.lines.length === 0 && beat.exitCode === undefined)
        report("error", "code-stage-output-empty", `Output beat "${beat.id}" has no lines and no exit status.`, { beatId: beat.id });
      for (const line of beat.lines) if (line.text.includes("\n"))
        report("error", "code-stage-terminal-line-invalid", `A terminal line in "${beat.id}" spans several lines; split it into one entry per line.`, { beatId: beat.id });
    }
    if ((beat.kind === "focus" || beat.kind === "token" || beat.kind === "edit") && beat.durationFrames < moveFrames * 2)
      report("warning", "code-stage-beat-short", `Beat "${beat.id}" ends before the change settles and is read; hold it for at least ${moveFrames * 2} frames.`, { beatId: beat.id });
  }
  for (const revisionId of revisionIds) {
    const revision = known.get(revisionId);
    if (!revision) continue;
    const lineIds = new Set(revision.lines.map(l => l.id));
    if (lineIds.size !== revision.lines.length) report("error", "code-stage-line-duplicate", `Revision "${revisionId}" has two lines with the same id.`);
    for (const line of revision.lines) {
      const tokens = revision.tokens[line.id];
      if (tokens && tokens.map(t => t.text).join("") !== line.text)
        report("error", "code-stage-token-mismatch", `The tokens of line "${line.id}" in revision "${revisionId}" do not concatenate to its text.`, { lineId: line.id });
    }
  }
  return out;
}

/** Opacity of one row's old and new version during an edit, and the changed token ranges when its text differs. */
export interface EditRowState { from: number; to: number; changed?: { from: [number, number]; to: [number, number] } }

export interface CodeStageFrame {
  beatIndex: number;
  beat: CodeStageBeat;
  /** Frames since the current beat started. */
  local: number;
  /** Opacity per row key (the line id for base lines), including dimming. Rows not yet revealed are 0. */
  lineOpacity: Readonly<Record<string, number>>;
  /** The focus in effect, with its strength (0–1) while it dims in or out. Undefined when nothing is focused. */
  focus?: { beat: Extract<CodeStageBeat, { kind: "focus" | "token" }>; lines: readonly string[]; amount: number };
  /** The revision drawn outside an edit. During an edit, `edit.from` and `edit.to` apply. */
  revision: string;
  /** While an edit runs: the two revisions, progress, and the per-row opacity of each version. */
  edit?: { from: string; to: string; progress: number; rows: Readonly<Record<string, EditRowState>> };
  /** The captured terminal output in effect: its lines with reveal opacity. Undefined before the first output beat. */
  terminal?: { beatId: string; lines: ReadonlyArray<{ kind: TerminalKind; text: string; opacity: number }>; exitCode?: number; exitOpacity: number };
}

/** The frame's listing state: visible rows, dimming, the revision on screen, any edit in progress, and terminal output. */
export function evaluateCodeStage(spec: CodeStageSpec, frame: number): CodeStageFrame {
  const moveFrames = spec.moveFrames ?? 18;
  const rows = codeStageRows(spec);
  const known = revisionsOf(spec);
  const order = rows.map(r => r.key);
  const lineOpacity: Record<string, number> = Object.fromEntries(spec.source.lines.map(l => [l.id, 0]));
  const last = spec.beats.length - 1;
  const t = Math.max(0, frame);
  let cursor = 0, beatIndex = last, local = spec.beats[last]?.durationFrames ?? 0;
  let lastFocus: { beat: Extract<CodeStageBeat, { kind: "focus" | "token" }>; start: number; end: number } | undefined;
  let revision = spec.source.id;
  let edit: CodeStageFrame["edit"];
  let terminal: CodeStageFrame["terminal"];
  const smooth = (x: number) => evaluateEasing("ease-in-out", Math.max(0, Math.min(1, x)));
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
    if (beat.kind === "edit" && t >= start && known.has(beat.to)) {
      const from = revision;
      if (t < end) {
        // Linear time drives the two fade windows; each window eases once. `progress` is the eased whole-beat value.
        const linear = Math.max(0, Math.min(1, (t - start) / beat.durationFrames));
        const progress = smooth(linear);
        const fadeOut = 1 - smooth(linear * 2), fadeIn = smooth((linear - 0.5) * 2);
        const state: Record<string, EditRowState> = {};
        for (const row of rows) {
          const inFrom = row.presentIn.includes(from), inTo = row.presentIn.includes(beat.to);
          const fromLine = known.get(from)?.lines.find(l => l.id === row.lineId);
          const toLine = known.get(beat.to)?.lines.find(l => l.id === row.lineId);
          const changedTokens = inFrom && inTo && fromLine && toLine && fromLine.text !== toLine.text
            ? changedTokenSpan(known.get(from)!.tokens[row.lineId] ?? [{ text: fromLine.text, kind: "plain" }],
              known.get(beat.to)!.tokens[row.lineId] ?? [{ text: toLine.text, kind: "plain" }]) : undefined;
          if (inFrom && inTo && !changedTokens) { state[row.key] = { from: 0, to: 1 }; continue; }
          if (inFrom && inTo) {
            state[row.key] = { from: fadeOut, to: fadeIn, changed: changedTokens };
          } else if (inFrom) {
            state[row.key] = { from: fadeOut, to: 0 };
          } else if (inTo) {
            state[row.key] = { from: 0, to: fadeIn };
          }
        }
        edit = { from, to: beat.to, progress, rows: state };
      }
      if (t >= end) revision = beat.to;
    }
    if (beat.kind === "output" && t >= start) {
      const slots = beat.lines.length + (beat.exitCode === undefined ? 0 : 1);
      const slot = beat.durationFrames / Math.max(1, slots);
      const reveal = (k: number) => t >= end ? 1 : evaluateEasing("ease-out", Math.max(0, Math.min(1, (t - start - k * slot) / (slot * .6))));
      terminal = {
        beatId: beat.id,
        lines: beat.lines.map((line, k) => ({ kind: line.kind, text: line.text, opacity: reveal(k) })),
        exitCode: beat.exitCode,
        exitOpacity: beat.exitCode === undefined ? 0 : reveal(beat.lines.length),
      };
    }
    cursor = end;
  });
  // Focus dims the other rows in over moveFrames and back out over moveFrames after its beat ends.
  let focus: CodeStageFrame["focus"];
  let dimmed: readonly string[] = [];
  if (lastFocus) {
    const amount = t < lastFocus.end
      ? evaluateEasing("ease-in-out", Math.min(1, (t - lastFocus.start) / moveFrames))
      : 1 - evaluateEasing("ease-in-out", Math.min(1, (t - lastFocus.end) / moveFrames));
    if (amount > 0) {
      const lines = focusLines(spec, lastFocus.beat);
      focus = { beat: lastFocus.beat, lines, amount };
      dimmed = order.filter(id => !lines.includes(id));
      for (const id of dimmed) if (id in lineOpacity) lineOpacity[id] *= 1 - 0.7 * amount;
    }
  }
  if (focus && edit) for (const key of dimmed) if (edit.rows[key]) {
    const factor = 1 - 0.7 * focus.amount;
    edit = { ...edit, rows: { ...edit.rows, [key]: { ...edit.rows[key], from: edit.rows[key].from * factor, to: edit.rows[key].to * factor } } };
  }
  return { beatIndex, beat: spec.beats[beatIndex], local, lineOpacity, focus, revision, edit, terminal };
}
