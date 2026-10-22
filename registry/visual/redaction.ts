/** Redaction ranges over plain text: normalisation and segmentation, independent of any renderer.
 *
 * Ranges are UTF-16 offsets into the text, half-open `[start, end)`. Normalisation never drops
 * covered text silently: an out-of-bounds range is clamped (it covers more, never less), and
 * overlapping ranges are merged. Empty and non-integer ranges are dropped and reported.
 */

/** `redacted`: covered text is removed and replaced by a bar. `revealed`: the full text shows with
 * the covered ranges highlighted. `overlay-only`: a bar is painted over text that stays in the DOM. */
export type RedactionMode = "redacted" | "revealed" | "overlay-only";

export interface RedactionRange {
  start: number;
  end: number;
  /** Category for assistive tech, e.g. "email address". Shown in the bar's accessible name. */
  label?: string;
}

export type RedactionDiagnosticCode = "clamped" | "merged" | "empty" | "not-integer";

export interface RedactionDiagnostic {
  code: RedactionDiagnosticCode;
  range: RedactionRange;
}

export type RedactionSegment =
  | { kind: "text"; text: string }
  /** Carries offsets, not the covered text, so a `redacted` render never holds the secret. */
  | { kind: "redaction"; start: number; end: number; label?: string; widthEm: number };

const WIDE = /\p{Script=Han}|\p{Script=Hiragana}|\p{Script=Katakana}|\p{Script=Hangul}|\p{Extended_Pictographic}|[＀-￯]/u;

/** Width of a redaction bar in `em`: wide glyphs (CJK, emoji, full-width forms) take one em,
 * Latin characters about half. An approximation: the bar matches the text's length, not its exact glyph widths. */
export function redactionWidthEm(text: string): number {
  let width = 0;
  for (const char of text) width += WIDE.test(char) ? 1 : 0.55;
  return width;
}

export function normalizeRedactions(text: string, ranges: readonly RedactionRange[]): { ranges: RedactionRange[]; diagnostics: RedactionDiagnostic[] } {
  const diagnostics: RedactionDiagnostic[] = [];
  const kept: RedactionRange[] = [];
  for (const range of ranges) {
    if (!Number.isInteger(range.start) || !Number.isInteger(range.end)) {
      diagnostics.push({ code: "not-integer", range });
      continue;
    }
    const start = Math.max(0, range.start), end = Math.min(text.length, range.end);
    if (start !== range.start || end !== range.end) diagnostics.push({ code: "clamped", range });
    if (start >= end) {
      diagnostics.push({ code: "empty", range });
      continue;
    }
    kept.push({ start, end, label: range.label });
  }
  kept.sort((a, b) => a.start - b.start || a.end - b.end);
  const merged: RedactionRange[] = [];
  for (const range of kept) {
    const last = merged[merged.length - 1];
    if (last && range.start < last.end) {
      diagnostics.push({ code: "merged", range });
      last.end = Math.max(last.end, range.end);
      last.label ??= range.label;
      continue;
    }
    merged.push({ ...range });
  }
  return { ranges: merged, diagnostics };
}

export function redactionSegments(text: string, ranges: readonly RedactionRange[]): RedactionSegment[] {
  const segments: RedactionSegment[] = [];
  let cursor = 0;
  for (const range of normalizeRedactions(text, ranges).ranges) {
    if (range.start > cursor) segments.push({ kind: "text", text: text.slice(cursor, range.start) });
    segments.push({ kind: "redaction", start: range.start, end: range.end, label: range.label, widthEm: redactionWidthEm(text.slice(range.start, range.end)) });
    cursor = range.end;
  }
  if (cursor < text.length) segments.push({ kind: "text", text: text.slice(cursor) });
  return segments;
}
