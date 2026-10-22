/** CaptionPerformer core: supplied timed captions, honest validation, frame evaluation and lane layout.
 * Captions and word timings are INPUTS (transcript, forced alignment, ASR or an authored script).
 * Nothing here transcribes audio or invents word timings: without supplied words a cue is
 * shown as one phrase. Evaluation is a pure function of the frame, so any seek is exact.
 */
import { segmentText } from "../media/text-layout";
import type { MeasureText } from "../media/text-layout";
import type { Diagnostic, RationalFps, Rect } from "../motion/types";
import { readableCaptionFrames } from "./explainer-principles";

export type CaptionEmphasis = "strong" | "accent";
export interface CaptionWord {
  /** Verbatim substring of the cue text, in order. */
  text: string;
  startFrame: number;
  endFrame: number;
  /** Alignment confidence in [0,1] when the aligner provides one. */
  confidence?: number;
  emphasis?: CaptionEmphasis;
}
export interface CaptionCue {
  id: string;
  startFrame: number;
  /** End-exclusive. */
  endFrame: number;
  /** Exactly what is displayed. */
  text: string;
  speakerId?: string;
  words?: readonly CaptionWord[];
  lang?: string;
  dir?: "ltr" | "rtl" | "auto";
}
export interface CaptionTrack {
  id: string;
  fps: RationalFps;
  cues: readonly CaptionCue[];
  /** Where the timings came from. `script-estimate` may not carry word timings. */
  timing: { source: "forced-alignment" | "asr" | "manual" | "script-estimate"; reference?: string };
  speakers?: Readonly<Record<string, { label: string }>>;
}
export interface CaptionDiagnostic extends Diagnostic { cueId?: string }

export interface CaptionValidationOptions {
  /** Production length; cues past it are errors. */
  durationFrames?: number;
  /** Words below this confidence warn. Default 0.6. */
  minConfidence?: number;
  reading?: { wordsPerSecond?: number; cjkCharsPerSecond?: number; minHoldSeconds?: number };
}

const LETTER = /[\p{L}\p{N}]/u;
const integer = (n: number) => Number.isSafeInteger(n);

/** Character ranges of each supplied word inside the cue text, or the first mismatch. */
export function resolveCaptionWordRanges(cue: CaptionCue):
  | { ok: true; ranges: { start: number; end: number }[] }
  | { ok: false; wordIndex: number; message: string } {
  const ranges: { start: number; end: number }[] = [];
  let cursor = 0;
  for (const [index, word] of (cue.words ?? []).entries()) {
    const start = word.text ? cue.text.indexOf(word.text, cursor) : -1;
    if (start < 0) return { ok: false, wordIndex: index, message: `Word "${word.text}" is not in the remaining text of cue "${cue.id}".` };
    if (LETTER.test(cue.text.slice(cursor, start)))
      return { ok: false, wordIndex: index, message: `Cue "${cue.id}" shows "${cue.text.slice(cursor, start).trim()}" with no word timing before "${word.text}".` };
    ranges.push({ start, end: start + word.text.length });
    cursor = start + word.text.length;
  }
  if (cue.words?.length && LETTER.test(cue.text.slice(cursor)))
    return { ok: false, wordIndex: cue.words.length, message: `Cue "${cue.id}" ends with untimed text "${cue.text.slice(cursor).trim()}".` };
  return { ok: true, ranges };
}

export function validateCaptionTrack(track: CaptionTrack, options: CaptionValidationOptions = {}): CaptionDiagnostic[] {
  const out: CaptionDiagnostic[] = [];
  const report = (severity: "error" | "warning", code: string, message: string, extra: Partial<CaptionDiagnostic> = {}) =>
    out.push({ code, severity, message, ...extra });
  const { fps } = track;
  if (!integer(fps.num) || !integer(fps.den) || fps.num <= 0 || fps.den <= 0) {
    report("error", "caption-fps-invalid", `Track "${track.id}" needs a rational FPS of positive integers.`);
    return out;
  }
  const ids = new Set<string>();
  const minConfidence = options.minConfidence ?? 0.6;
  for (const [index, cue] of track.cues.entries()) {
    const at = { cueId: cue.id, path: `cues[${index}]`, frame: cue.startFrame };
    if (!cue.id.trim() || ids.has(cue.id) || !cue.text.trim() || !integer(cue.startFrame) || !integer(cue.endFrame) ||
      cue.startFrame < 0 || cue.endFrame <= cue.startFrame) {
      report("error", "caption-cue-invalid", `Cue "${cue.id}" needs a unique ID, text and an integer interval with end after start.`, at);
      continue;
    }
    ids.add(cue.id);
    if (options.durationFrames !== undefined && cue.endFrame > options.durationFrames)
      report("error", "caption-out-of-range", `Cue "${cue.id}" ends at ${cue.endFrame}, after the production ends at ${options.durationFrames}.`, at);
    if (cue.speakerId && !track.speakers?.[cue.speakerId])
      report("error", "caption-speaker-unknown", `Cue "${cue.id}" names speaker "${cue.speakerId}", which the track does not declare.`, at);
    const need = readableCaptionFrames(cue.text, fps, options.reading);
    if (cue.endFrame - cue.startFrame < need)
      report("warning", "caption-hold-short", `Cue "${cue.id}" shows for ${cue.endFrame - cue.startFrame} frames; reading needs about ${need}.`, at);
    if (!cue.words?.length) continue;
    if (track.timing.source === "script-estimate") {
      report("error", "caption-word-timing-unsupported", `Cue "${cue.id}" has word timings, but the track's timings are script estimates. Supply an alignment or drop the words.`, at);
      continue;
    }
    const ranges = resolveCaptionWordRanges(cue);
    if (!ranges.ok) report("error", "caption-words-mismatch-text", ranges.message, { ...at, path: `${at.path}.words[${ranges.wordIndex}]` });
    let previousEnd = cue.startFrame;
    for (const [wordIndex, word] of cue.words.entries()) {
      const where = { ...at, path: `${at.path}.words[${wordIndex}]`, frame: word.startFrame };
      if (!integer(word.startFrame) || !integer(word.endFrame) || word.endFrame <= word.startFrame) {
        report("error", "caption-word-invalid", `Word "${word.text}" in "${cue.id}" needs an integer interval with end after start.`, where);
        continue;
      }
      if (word.startFrame < cue.startFrame || word.endFrame > cue.endFrame)
        report("error", "caption-word-outside-cue", `Word "${word.text}" (${word.startFrame}–${word.endFrame}) falls outside cue "${cue.id}" (${cue.startFrame}–${cue.endFrame}); the cue is late or early for its audio.`, where);
      if (word.startFrame < previousEnd && wordIndex > 0)
        report("error", "caption-word-order", `Word "${word.text}" in "${cue.id}" starts before the previous word ends.`, where);
      previousEnd = Math.max(previousEnd, word.endFrame);
      if (word.confidence !== undefined && word.confidence < minConfidence)
        report("warning", "caption-low-confidence", `Word "${word.text}" in "${cue.id}" has alignment confidence ${word.confidence}; check it against the audio.`, where);
    }
  }
  const sorted = track.cues.filter(cue => ids.has(cue.id)).sort((a, b) => a.startFrame - b.startFrame);
  for (let i = 0; i < sorted.length; i += 1) for (let j = i + 1; j < sorted.length && sorted[j].startFrame < sorted[i].endFrame; j += 1) {
    const a = sorted[i], b = sorted[j], sameSpeaker = (a.speakerId ?? "") === (b.speakerId ?? "");
    report(sameSpeaker ? "error" : "warning", "caption-cue-overlap",
      `Cues "${a.id}" and "${b.id}" overlap from frame ${b.startFrame}${sameSpeaker ? " for the same speaker" : "; both will be stacked"}.`,
      { cueId: b.id, frame: b.startFrame });
  }
  return out;
}

export type CaptionWordState = "upcoming" | "active" | "spoken";
export interface ActiveCaption {
  cue: CaptionCue;
  /** 0→1 over the entrance, 1 while held. */
  enter: number;
  /** 1 while held, 1→0 over the exit. */
  exit: number;
  /** Per supplied word; absent when the cue has no word timings. */
  wordStates?: CaptionWordState[];
}
/** Captions visible at `frame`, in start order. Pure: the same frame always yields the same result. */
export function evaluateCaptionTrack(track: CaptionTrack, frame: number, options: { enterFrames?: number; exitFrames?: number } = {}): ActiveCaption[] {
  const enterFrames = Math.max(0, options.enterFrames ?? 5), exitFrames = Math.max(0, options.exitFrames ?? 3);
  return track.cues.filter(cue => frame >= cue.startFrame && frame < cue.endFrame)
    .sort((a, b) => a.startFrame - b.startFrame || a.id.localeCompare(b.id))
    .map(cue => ({
      cue,
      enter: enterFrames ? Math.min(1, (frame - cue.startFrame + 1) / enterFrames) : 1,
      exit: exitFrames ? Math.min(1, (cue.endFrame - frame) / exitFrames) : 1,
      wordStates: cue.words?.length && track.timing.source !== "script-estimate"
        ? cue.words.map(word => frame < word.startFrame ? "upcoming" : frame < word.endFrame ? "active" : "spoken") : undefined,
    }));
}

export interface CaptionLine { start: number; end: number; text: string; width: number }
export interface CaptionLayoutRequest {
  text: string;
  language?: string;
  measure: MeasureText;
  font: string;
  lineHeightPx: number;
  /** Max text width in px, excluding padding. */
  maxWidthPx: number;
  maxLines: number;
  /** Character ranges that must not break internally, e.g. supplied aligned words (CJK phrase units). */
  units?: readonly { start: number; end: number }[];
}
/** Wrap at locale-aware break opportunities, keeping character offsets for per-word styling. Never truncates.
 * With `units`, breaks fall only between units, so aligned words such as ルーターへ stay whole.
 */
export function layoutCaptionLines(request: CaptionLayoutRequest):
  | { ok: true; lines: CaptionLine[]; width: number; height: number }
  | { ok: false; code: "layout-impossible" | "text-measurer-unavailable"; message: string } {
  const { text, measure, font, maxWidthPx } = request;
  if (!(maxWidthPx > 0) || !(request.lineHeightPx > 0) || !integer(request.maxLines) || request.maxLines < 1)
    return { ok: false, code: "layout-impossible", message: "Caption needs a positive width, line height and line budget." };
  const probe = measure(font, text.trim().slice(0, 1) || "M");
  if (!Number.isFinite(probe) || probe <= 0)
    return { ok: false, code: "text-measurer-unavailable", message: "Load the caption font and supply a real text measurer." };
  const lines: CaptionLine[] = [];
  let offset = 0;
  for (const paragraph of text.split("\n")) {
    const parts = request.units?.length ? unitSegments(paragraph, offset, request.units) : segmentText(paragraph, request.language);
    const segments = parts.join("") === paragraph ? parts : [...paragraph];
    let lineStart = -1, lineEnd = -1, cursor = offset;
    const flush = () => {
      if (lineStart < 0) return;
      const value = text.slice(lineStart, lineEnd);
      lines.push({ start: lineStart, end: lineEnd, text: value, width: measure(font, value) });
      lineStart = lineEnd = -1;
    };
    for (const segment of segments) {
      const start = cursor, end = cursor + segment.length;
      cursor = end;
      if (!segment.trim()) continue;
      if (lineStart >= 0 && measure(font, text.slice(lineStart, end)) <= maxWidthPx + 1e-6) { lineEnd = end; continue; }
      flush();
      if (measure(font, segment) > maxWidthPx + 1e-6)
        return { ok: false, code: "layout-impossible", message: `"${segment}" is wider than the caption lane. Widen the lane, reduce the type size or shorten the cue.` };
      lineStart = start; lineEnd = end;
    }
    flush();
    offset += paragraph.length + 1;
  }
  if (lines.length > request.maxLines)
    return { ok: false, code: "layout-impossible", message: `Caption needs ${lines.length} lines; the budget is ${request.maxLines}. Split the cue rather than truncating it.` };
  return { ok: true, lines, width: Math.max(...lines.map(line => line.width)), height: lines.length * request.lineHeightPx };
}

/** Split a paragraph at unit edges only; text between units (spaces, punctuation) joins the neighbouring unit. */
function unitSegments(paragraph: string, offset: number, units: readonly { start: number; end: number }[]): string[] {
  const cuts = new Set<number>([0, paragraph.length]);
  for (const unit of units) {
    const start = unit.start - offset;
    if (start > 0 && start < paragraph.length) cuts.add(start);
  }
  const edges = [...cuts].sort((a, b) => a - b), out: string[] = [];
  for (let i = 0; i < edges.length - 1; i += 1) {
    const piece = paragraph.slice(edges[i], edges[i + 1]), lead = piece.match(/^\s+/u)?.[0] ?? "";
    if (lead) out.push(lead);
    if (piece.length > lead.length) out.push(piece.slice(lead.length));
  }
  return out;
}

const overlaps = (a: Rect, b: Rect) => Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) > 1e-6 &&
  Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) > 1e-6;

/** Wrap spans to measure each cue at: the preferred width, then the free span beside each obstacle
 * that cuts into the lane (e.g. an action column), widest first. Normalized; spans under 30% are dropped.
 */
export function captionWrapSpans(lane: Rect, avoidRegions: readonly Rect[], maxWidth: number, gap: number): { x: number; width: number }[] {
  const spans = [{ x: lane.x + lane.width * (1 - maxWidth) / 2, width: lane.width * maxWidth }];
  for (const o of avoidRegions) {
    if (o.x >= lane.x + lane.width || o.x + o.width <= lane.x) continue;
    spans.push({ x: lane.x, width: o.x - gap - lane.x }, { x: o.x + o.width + gap, width: lane.x + lane.width - o.x - o.width - gap });
  }
  const seen = new Set<string>();
  return spans.filter(s => s.width >= lane.width * 0.3 && !seen.has(s.width.toFixed(3)) && seen.add(s.width.toFixed(3)))
    .sort((a, b) => b.width - a.width);
}

export interface CaptionBlockVariant { widthPx: number; heightPx: number; span?: { x: number; width: number } }
/** Stack measured caption blocks inside a lane, nearest the anchor first, stepping past obstacles.
 * Vertical candidates: the anchor edge, then each obstacle's far edge. At each, every measured variant
 * is tried (widest first), centred in its span, then lane-centred, then at the lane start and end.
 */
export function placeCaptionBlocks(blocks: readonly { id: string; variants: readonly CaptionBlockVariant[] }[], options: {
  viewport: { width: number; height: number };
  lane: Rect;
  avoidRegions?: readonly Rect[];
  anchor?: "bottom" | "top";
  gapPx?: number;
}): { ok: true; rects: Record<string, Rect>; variants: Record<string, number> } | { ok: false; blockId: string; message: string } {
  const { viewport, lane } = options, anchor = options.anchor ?? "bottom";
  const gapY = (options.gapPx ?? 12) / viewport.height, gapX = (options.gapPx ?? 12) / viewport.width;
  const placed: Rect[] = [], rects: Record<string, Rect> = {}, variants: Record<string, number> = {};
  const obstacles = [...(options.avoidRegions ?? [])];
  const order = anchor === "bottom" ? [...blocks].reverse() : [...blocks];
  for (const block of order) {
    const blockers = [...obstacles, ...placed];
    const edges = anchor === "bottom"
      ? [lane.y + lane.height, ...blockers.map(r => r.y - gapY)].filter(y => y <= lane.y + lane.height + 1e-9).sort((a, b) => b - a)
      : [lane.y, ...blockers.map(r => r.y + r.height + gapY)].filter(y => y >= lane.y - 1e-9).sort((a, b) => a - b);
    let found: Rect | undefined, chosen = -1;
    search: for (const edge of edges) for (const [index, variant] of block.variants.entries()) {
      const width = variant.widthPx / viewport.width, height = variant.heightPx / viewport.height;
      const y = anchor === "bottom" ? edge - height : edge;
      if (width > lane.width + 1e-6 || y < lane.y - 1e-9 || y + height > lane.y + lane.height + 1e-9) continue;
      const xs = [...(variant.span ? [variant.span.x + (variant.span.width - width) / 2] : []),
        lane.x + (lane.width - width) / 2, lane.x, lane.x + lane.width - width];
      found = xs.map(x => ({ x, y, width, height })).find(rect =>
        !blockers.some(r => overlaps({ x: rect.x - gapX, y: rect.y, width: rect.width + 2 * gapX, height: rect.height }, r)));
      if (found) { chosen = index; break search; }
    }
    if (!found) return { ok: false, blockId: block.id, message: `Caption "${block.id}" has no room in its lane clear of reserved regions and other captions.` };
    placed.push(found);
    rects[block.id] = found;
    variants[block.id] = chosen;
  }
  return { ok: true, rects, variants };
}
