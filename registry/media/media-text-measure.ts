/**
 * Deterministic text layout for the Kumiki media foundation.
 *
 * Text is **never** laid out by the browser's automatic wrapping alone: the
 * same pure function computes lines for the on-screen preview and for SVG/PNG
 * export, so the two cannot drift. The only injected variable is a
 * {@link TextMeasurer} — real canvas glyph advances when a canvas is available,
 * a documented deterministic approximation otherwise.
 *
 * Honesty rule: when the approximation is used, the resulting
 * {@link TextLayout.approximate} flag is `true` and callers are expected to
 * surface it (export preview does). Wrapping then may differ from the browser's
 * shaping, so exact-fidelity export must be refused rather than silently
 * misreported (docs/11 "explicit fidelity").
 *
 * Breaking rules:
 * - `\n` always forces a line break.
 * - Word boundaries come from `Intl.Segmenter` (word granularity) when
 *   available, so CJK ideographs and other scripts without spaces break
 *   correctly; otherwise a deterministic fallback breaks on whitespace and
 *   between CJK characters.
 * - A single token wider than the box is broken between graphemes, so long URLs
 *   never overflow horizontally.
 */

import type { TextLayerData, TextSpan } from "./media-document";
import type { Size } from "./media-geometry";

/**
 * Measures the advance width of `text` at `fontSize` (design px) for the styling
 * carried by `span`. Implementations must be pure for a given input.
 */
export interface TextMeasurer {
  (text: string, fontSize: number, span: TextSpan): number;
}

/** One positioned run of text inside a line. */
export interface MeasuredRun {
  /** Index into `TextLayerData.spans`. */
  spanIndex: number;
  text: string;
  /** Offset from the text box's left edge, in design px. */
  x: number;
  width: number;
}

/** One laid-out line of text. */
export interface TextLine {
  runs: MeasuredRun[];
  /** Top of the line relative to the text box, in design px. */
  y: number;
  /** Baseline relative to the text box, in design px. */
  baseline: number;
  /** Horizontal offset of the line inside the box, from `align`. */
  offsetX: number;
  width: number;
  /** Inclusive character offset into the layer's plain text. */
  start: number;
  /** Exclusive character offset into the layer's plain text. */
  end: number;
}

/** Result of laying out a text layer inside a box. */
export interface TextLayout {
  lines: TextLine[];
  /** Effective font size after any shrink, in design px. */
  fontSize: number;
  /** Absolute line height, in design px. */
  lineHeight: number;
  /** Height of the laid-out text, in design px. */
  height: number;
  /** Vertical overflow past the box, in design px (`0` when it fits). */
  overflow: number;
  /** True when content was dropped (`fit: "clip"`/`"shrink"` with `maxLines`). */
  clipped: boolean;
  /** True when the layout used the deterministic approximation, not real glyph metrics. */
  approximate: boolean;
}

const ASCENT_RATIO = 0.8;
const DEFAULT_FALLBACK = 0.5;

/** Advance width ratios (of `fontSize`) used by {@link createApproximateMeasurer}. */
const RATIO_RANGES: Array<{ test: (code: number) => boolean; ratio: number }> = [
  { test: (code) => code === 32, ratio: 0.28 },
  { test: (code) => code >= 48 && code <= 57, ratio: 0.56 },
  { test: (code) => code >= 65 && code <= 90, ratio: 0.62 },
  { test: (code) => code >= 97 && code <= 122, ratio: 0.52 },
  { test: (code) => ".,:;'|!il`".includes(String.fromCharCode(code)), ratio: 0.26 },
  { test: (code) => "mwMW@%".includes(String.fromCharCode(code)), ratio: 0.85 },
  { test: (code) => code >= 0x2e80 && code <= 0x9fff, ratio: 1 },
  { test: (code) => code >= 0xac00 && code <= 0xd7af, ratio: 1 },
  { test: (code) => code >= 0xff00 && code <= 0xff60, ratio: 1 },
  { test: (code) => code >= 0x3000 && code <= 0x30ff, ratio: 1 },
  { test: (code) => code >= 0x1f000, ratio: 1.1 },
];

/**
 * Deterministic, dependency-free advance estimator. Used when no canvas is
 * available (jsdom, export workers) so wrapping is reproducible; it is
 * intentionally coarse for latin text, which is why callers must surface
 * {@link TextLayout.approximate}.
 */
export function createApproximateMeasurer(): TextMeasurer {
  return (text, fontSize, span) => {
    const weightFactor = (span.fontWeight ?? 400) >= 600 ? 1.06 : 1;
    const italicFactor = span.italic ? 1.02 : 1;
    let ratio = 0;
    for (const character of text) {
      const code = character.codePointAt(0) ?? 0;
      const match = RATIO_RANGES.find((range) => range.test(code));
      ratio += match ? match.ratio : DEFAULT_FALLBACK;
    }
    return ratio * fontSize * weightFactor * italicFactor;
  };
}

let sharedCanvasContext: CanvasRenderingContext2D | null | undefined;

function defaultCanvasContext(): CanvasRenderingContext2D | null {
  if (sharedCanvasContext !== undefined) return sharedCanvasContext;
  if (typeof document === "undefined") {
    sharedCanvasContext = null;
    return null;
  }
  try {
    sharedCanvasContext = document.createElement("canvas").getContext("2d");
  } catch {
    sharedCanvasContext = null;
  }
  return sharedCanvasContext;
}

/**
 * Build a measurer that uses real glyph advances. Returns `undefined` when no
 * 2D canvas context is available (jsdom, environments without canvas), which
 * lets callers fall back to {@link createApproximateMeasurer}.
 *
 * @param familyFallback CSS font stack appended after the span family.
 */
export function createCanvasMeasurer(
  familyFallback = "var(--km-font-cjk), system-ui, sans-serif",
  context: CanvasRenderingContext2D | null = defaultCanvasContext()
): TextMeasurer | undefined {
  if (!context) return undefined;
  return (text, fontSize, span) => {
    const weight = span.fontWeight ?? 400;
    const style = span.italic ? "italic " : "";
    const family = span.fontFamily ?? familyFallback;
    context.font = `${style}${weight} ${fontSize}px ${family}`;
    return context.measureText(text).width;
  };
}

/** Plain text of a layer: spans concatenated in order. */
export function plainText(data: TextLayerData): string {
  return data.spans.map((span) => span.text).join("");
}

interface SegmentLike {
  segment: string;
  index: number;
  isWordLike?: boolean;
}

interface SegmenterLike {
  segment(input: string): Iterable<SegmentLike>;
}

type SegmenterConstructor = new (
  locale?: string | string[],
  options?: { granularity?: "grapheme" | "word" | "sentence" }
) => SegmenterLike;

function segmenter(locale: string | undefined, granularity: "grapheme" | "word"): SegmenterLike | undefined {
  const ctor = (Intl as unknown as { Segmenter?: SegmenterConstructor }).Segmenter;
  if (!ctor) return undefined;
  try {
    return new ctor(locale, { granularity });
  } catch {
    return undefined;
  }
}

const CJK_CHAR = /[\u2e80-\u9fff\uac00-\ud7af\uff00-\uff60\u3000-\u30ff]/;

/** Break a run of text into graphemes, or code points when no segmenter exists. */
function graphemes(text: string, locale: string | undefined): string[] {
  const instance = segmenter(locale, "grapheme");
  if (instance) return Array.from(instance.segment(text), (item) => item.segment);
  return Array.from(text);
}

interface Atom {
  text: string;
  spanIndex: number;
  /** A line break is permitted before this atom. */
  breakBefore: boolean;
  /** A `\n` (or the start of a paragraph) forces a break before this atom. */
  hardBreakBefore: boolean;
  /**
   * Plain-text characters consumed by the forced break before this atom (the
   * `\n` itself). Carried so {@link TextLine.start}/`end` stay aligned with the
   * layer's plain text, which includes the newline even though it is never
   * painted.
   */
  breakChars?: number;
}

/** Atoms for one span, with `\n` producing forced breaks. */
function atomsForSpan(text: string, spanIndex: number, locale: string | undefined): Atom[] {
  const paragraphs = text.split("\n");
  const atoms: Atom[] = [];
  paragraphs.forEach((paragraph, paragraphIndex) => {
    const push = (atom: Atom) => atoms.push(atom);
    const instance = segmenter(locale, "word");
    if (instance) {
      for (const item of instance.segment(paragraph)) {
        const isWord = item.isWordLike ?? !/^\s+$/.test(item.segment);
        if (isWord) {
          push({
            text: item.segment,
            spanIndex,
            breakBefore: atoms.length > 0,
            hardBreakBefore: false,
          });
        } else if (atoms.length > 0) {
          atoms[atoms.length - 1].text += item.segment;
        } else if (item.segment.length > 0) {
          push({ text: item.segment, spanIndex, breakBefore: false, hardBreakBefore: false });
        }
      }
    } else {
      const chunks = paragraph.split(/(\s+)/).filter((chunk) => chunk.length > 0);
      for (const chunk of chunks) {
        if (/^\s+$/.test(chunk)) {
          if (atoms.length > 0) atoms[atoms.length - 1].text += chunk;
          else push({ text: chunk, spanIndex, breakBefore: false, hardBreakBefore: false });
          continue;
        }
        // Split CJK runs into per-character atoms so they can break without spaces.
        const pieces = Array.from(chunk);
        let buffer = "";
        for (const piece of pieces) {
          if (CJK_CHAR.test(piece)) {
            if (buffer.length > 0) {
              push({ text: buffer, spanIndex, breakBefore: atoms.length > 0, hardBreakBefore: false });
              buffer = "";
            }
            push({ text: piece, spanIndex, breakBefore: atoms.length > 0, hardBreakBefore: false });
          } else {
            buffer += piece;
          }
        }
        if (buffer.length > 0) {
          push({ text: buffer, spanIndex, breakBefore: atoms.length > 0, hardBreakBefore: false });
        }
      }
    }
    if (paragraphIndex < paragraphs.length - 1) {
      push({ text: "", spanIndex, breakBefore: true, hardBreakBefore: true, breakChars: 1 });
    }
  });
  return atoms;
}

function collectAtoms(data: TextLayerData): Atom[] {
  const atoms: Atom[] = [];
  data.spans.forEach((span, spanIndex) => {
    const spanAtoms = atomsForSpan(span.text, spanIndex, data.locale);
    spanAtoms.forEach((atom, index) => {
      if (atoms.length > 0 && index === 0) atom.breakBefore = true;
      atoms.push(atom);
    });
  });
  return atoms;
}

interface WrappedLine {
  atoms: Atom[];
  start: number;
  end: number;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Wrap atoms into lines at a fixed font size. */
function wrapAtoms(
  atoms: Atom[],
  boxWidth: number,
  fontSize: number,
  measure: TextMeasurer,
  spans: TextSpan[],
  maxLines: number | undefined
): WrappedLine[] {
  const lines: WrappedLine[] = [];
  let current: Atom[] = [];
  let cursor = 0;
  let currentWidth = 0;

  const flush = () => {
    lines.push({ atoms: current, start: cursor, end: cursor });
    current = [];
    currentWidth = 0;
  };

  for (const atom of atoms) {
    if (atom.hardBreakBefore && current.length > 0) {
      flush();
    }
    const full = atom.text;
    const graphemeList = full.length === 0 ? [] : graphemes(full, undefined);
    const atomWidth = measure(full, fontSize, spans[atom.spanIndex]);
    // Fits on the current line as-is.
    if (atomWidth <= boxWidth - currentWidth) {
      current.push({ ...atom });
      currentWidth += atomWidth;
      cursor += full.length;
      continue;
    }
    // Fits on a line of its own, so move to the next line first.
    if (atomWidth <= boxWidth) {
      if (current.length > 0) flush();
      current.push({ ...atom });
      currentWidth = atomWidth;
      cursor += full.length;
      continue;
    }
    // Wider than a whole line: break between graphemes so long URLs still fit.
    if (current.length > 0) flush();
    let buffer = "";
    for (const grapheme of graphemeList) {
      const candidate = buffer + grapheme;
      if (buffer.length > 0 && measure(candidate, fontSize, spans[atom.spanIndex]) > boxWidth) {
        current.push({ text: buffer, spanIndex: atom.spanIndex, breakBefore: true, hardBreakBefore: false });
        flush();
        buffer = grapheme;
      } else {
        buffer = candidate;
      }
    }
    if (buffer.length > 0) {
      current.push({ text: buffer, spanIndex: atom.spanIndex, breakBefore: current.length > 0, hardBreakBefore: false });
      currentWidth = measure(buffer, fontSize, spans[atom.spanIndex]);
    }
  }
  flush();

  // Fill in character ranges and apply the line cap. A forced break begins its
  // line, so the newline characters it consumed are skipped before the line's
  // own text — keeping `start`/`end` aligned with the layer's plain text.
  let offset = 0;
  const limited = typeof maxLines === "number" ? lines.slice(0, Math.max(0, maxLines)) : lines;
  return limited.map((line) => {
    const leadingBreak =
      line.atoms.length > 0 && line.atoms[0].hardBreakBefore ? line.atoms[0].breakChars ?? 0 : 0;
    offset += leadingBreak;
    const length = line.atoms.reduce((total, atom) => total + atom.text.length, 0);
    const start = offset;
    offset += length;
    return { atoms: line.atoms, start, end: start + length };
  });
}

function buildLayout(
  data: TextLayerData,
  box: Size,
  fontSize: number,
  measure: TextMeasurer,
  approximate: boolean
): TextLayout {
  const lineHeight = round2(data.lineHeight * fontSize);
  const wrapped = wrapAtoms(collectAtoms(data), box.width, fontSize, measure, data.spans, data.maxLines);
  const align = data.align ?? "start";

  const lines: TextLine[] = wrapped.map((line, index) => {
    const runs: MeasuredRun[] = [];
    let x = 0;
    for (const atom of line.atoms) {
      if (atom.text.length === 0) continue;
      const width = round2(measure(atom.text, fontSize, data.spans[atom.spanIndex]));
      const previous = runs[runs.length - 1];
      if (previous && previous.spanIndex === atom.spanIndex) {
        previous.text += atom.text;
        previous.width = round2(previous.width + width);
      } else {
        runs.push({ spanIndex: atom.spanIndex, text: atom.text, x: round2(x), width });
      }
      x += width;
    }
    // A break consumes the space that followed a word; it must not be painted
    // at the end of the line or it would shift right-aligned and centered runs.
    const lastRun = runs[runs.length - 1];
    if (lastRun) {
      const trimmed = lastRun.text.replace(/\s+$/, "");
      if (trimmed !== lastRun.text) {
        lastRun.text = trimmed;
        if (trimmed.length === 0) runs.pop();
        else lastRun.width = round2(measure(trimmed, fontSize, data.spans[lastRun.spanIndex]));
      }
    }
    const width = round2(runs.reduce((total, run) => total + run.width, 0));
    const offsetX =
      align === "center" ? round2((box.width - width) / 2) : align === "end" ? round2(box.width - width) : 0;
    const y = round2(index * lineHeight);
    return {
      runs,
      y,
      baseline: round2(y + lineHeight * ASCENT_RATIO),
      offsetX,
      width,
      start: line.start,
      end: line.end,
    };
  });

  const height = round2(lines.length * lineHeight);
  const overflow = round2(Math.max(0, height - box.height));
  const fit = data.fit ?? "wrap";
  return {
    lines,
    fontSize,
    lineHeight,
    height,
    overflow,
    clipped: fit === "clip" && overflow > 0,
    approximate,
  };
}

/**
 * Lay out a text layer inside `box`. Pure for a given `measure`: the same inputs
 * always produce the same lines, which is what keeps preview and export equal.
 */
export function layoutText(data: TextLayerData, box: Size, measure?: TextMeasurer): TextLayout {
  const canvasMeasurer = measure ?? createCanvasMeasurer();
  const approximate = canvasMeasurer === undefined;
  const measurer = canvasMeasurer ?? createApproximateMeasurer();
  const fit = data.fit ?? "wrap";
  const base = data.fontSize;

  if (fit === "shrink" && data.minFontSize !== undefined && data.minFontSize < base) {
    const floor = Math.max(1, data.minFontSize);
    let low = Math.floor(floor);
    let high = Math.floor(base);
    let best: TextLayout | null = null;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const candidate = buildLayout(data, box, mid, measurer, approximate);
      if (candidate.overflow <= 0) {
        best = candidate;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    if (best) return best;
    return buildLayout(data, box, Math.floor(floor), measurer, approximate);
  }

  return buildLayout(data, box, base, measurer, approximate);
}
