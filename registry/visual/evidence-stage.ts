/** EvidenceStage core: authorized sources (image, text, table) with exact anchors, readable provenance,
 * focus beats that keep the cited target and its context in view, and a conclusion whose citations link
 * back to anchors. Pure: layout takes an injected font measurer, evaluation is a function of the frame.
 * It verifies what can be verified — quotes match their offsets, cells hold the cited value, regions lie
 * inside the image, every source carries rights and provenance — not whether the source is true.
 */
import type { MeasureText } from "../media/text-layout";
import type { ImageAsset } from "../media/document";
import { evaluateEasing } from "../motion/easing";
import type { Diagnostic, RationalFps, Rect } from "../motion/types";
import { interpolateCrop, regionCrop, resolveClipDraw } from "../video/frame-clip";
import type { ClipDraw } from "../video/frame-clip";
import { layoutCaptionLines } from "./caption-track";
import type { CaptionLine } from "./caption-track";
import { readableCaptionFrames } from "./explainer-principles";

export interface EvidenceProvenance {
  title: string;
  author?: string;
  publisher?: string;
  /** Publication or capture date, as the source states it. */
  date: string;
  /** Where in the source: page, section, timestamp, cell range. */
  locator: string;
  url?: string;
  accessed?: string;
  /** Authorization to show it. `fair-use-claimed` is the author's claim, not a verdict. */
  rights: { status: "owned" | "licensed" | "public-domain" | "permission" | "fair-use-claimed"; reference: string };
  /** Shown with the source, e.g. "Fictional sample". */
  note?: string;
}
interface SourceBase { id: string; provenance: EvidenceProvenance }
export interface ImageEvidence extends SourceBase {
  kind: "image";
  asset: ImageAsset & { width: number; height: number };
  alt: string;
  anchors: readonly { id: string; rect: Rect; label?: string }[];
}
export interface TextEvidence extends SourceBase {
  kind: "text";
  text: string;
  lang?: string;
  /** `quote` must equal the text at `start` (or its `occurrence`-th match when `start` is omitted). */
  anchors: readonly { id: string; quote: string; start?: number; occurrence?: number; label?: string }[];
  /** Character ranges shown as blocks; anchors may not cite redacted text. */
  redactions?: readonly { start: number; end: number }[];
  /** Surface width in px (default 900), concrete font stack (default serif 34px), line height multiplier. */
  width?: number;
  font?: string;
  fontSizePx?: number;
  lineHeight?: number;
}
export interface TableEvidence extends SourceBase {
  kind: "table";
  columns: readonly { id: string; label: string; width: number; align?: "start" | "end" }[];
  rows: readonly { id: string; cells: Readonly<Record<string, string>> }[];
  /** A cell (`columnId`) or a whole row. `expect` must equal the cell's displayed value. */
  anchors: readonly { id: string; rowId: string; columnId?: string; expect?: string; label?: string }[];
  font?: string;
  fontSizePx?: number;
  rowHeight?: number;
}
export type EvidenceSource = ImageEvidence | TextEvidence | TableEvidence;
export interface EvidenceBeat {
  id: string;
  kind: "establish" | "focus" | "conclude";
  sourceId?: string;
  durationFrames: number;
  /** Focus: anchors framed together (their union). */
  anchorIds?: readonly string[];
  callouts?: readonly { anchorId: string; title: string; detail?: string }[];
  /** Focus: context around the target as a fraction of its size. Default 0.6. */
  context?: number;
}
export interface EvidenceStageSpec {
  id: string;
  fps: RationalFps;
  sources: readonly EvidenceSource[];
  beats: readonly EvidenceBeat[];
  /** `text` contains every citation marker, e.g. "[1]". */
  conclusion?: { text: string; citations: readonly { marker: string; sourceId: string; anchorId: string }[] };
  /** Frames a camera move takes when consecutive beats show the same source. Default 18. */
  moveFrames?: number;
}
export interface EvidenceSurface {
  sourceId: string;
  kind: EvidenceSource["kind"];
  width: number;
  height: number;
  /** Union rect per anchor (surface px). */
  anchors: Readonly<Record<string, Rect>>;
  /** What must stay visible with each anchor to be understood (table cell: its row label and column header). */
  context: Readonly<Record<string, Rect>>;
  /** Per-line rects per anchor (text), for highlights. */
  anchorParts: Readonly<Record<string, readonly Rect[]>>;
  /** Text: laid-out lines (offsets into the displayed text) and its metrics. */
  text?: { display: string; lines: (CaptionLine & { y: number })[]; font: string; fontSizePx: number; lineHeightPx: number; padding: number };
  /** Table: column x offsets, header height, row height. */
  table?: { x: number[]; headerHeight: number; rowHeight: number; padding: number; font: string; fontSizePx: number };
}
export interface EvidenceDiagnostic extends Diagnostic { sourceId?: string; anchorId?: string }

const TEXT_FONT = (size: number) => `400 ${size}px Georgia, "Times New Roman", serif`;
const TABLE_FONT = (size: number) => `500 ${size}px system-ui, -apple-system, "Segoe UI", sans-serif`;
const union = (rects: readonly Rect[]): Rect => {
  const x = Math.min(...rects.map(r => r.x)), y = Math.min(...rects.map(r => r.y));
  return { x, y, width: Math.max(...rects.map(r => r.x + r.width)) - x, height: Math.max(...rects.map(r => r.y + r.height)) - y };
};
/** Resolve a text anchor's character range, or explain why it cannot be. */
export function textAnchorRange(source: TextEvidence, anchor: TextEvidence["anchors"][number]): { start: number; end: number } | { error: string } {
  if (!anchor.quote) return { error: `Anchor "${anchor.id}" needs the exact quoted text.` };
  if (anchor.start !== undefined) {
    const actual = source.text.slice(anchor.start, anchor.start + anchor.quote.length);
    return actual === anchor.quote ? { start: anchor.start, end: anchor.start + anchor.quote.length }
      : { error: `Anchor "${anchor.id}" quotes "${anchor.quote}" but the text at ${anchor.start} reads "${actual}".` };
  }
  const hits: number[] = [];
  for (let i = source.text.indexOf(anchor.quote); i >= 0; i = source.text.indexOf(anchor.quote, i + 1)) hits.push(i);
  if (!hits.length) return { error: `Anchor "${anchor.id}": "${anchor.quote}" does not occur in the source.` };
  if (hits.length > 1 && anchor.occurrence === undefined) return { error: `Anchor "${anchor.id}": "${anchor.quote}" occurs ${hits.length} times; set start or occurrence.` };
  const at = hits[anchor.occurrence ?? 0];
  return at === undefined ? { error: `Anchor "${anchor.id}" occurrence ${anchor.occurrence} does not exist.` } : { start: at, end: at + anchor.quote.length };
}

/** Lay out one source as a surface with exact anchor rects. Text uses the injected (real) font measurer. */
export function layoutEvidenceSource(source: EvidenceSource, measure: MeasureText): { surface?: EvidenceSurface; diagnostics: EvidenceDiagnostic[] } {
  const diagnostics: EvidenceDiagnostic[] = [];
  const error = (code: string, message: string, anchorId?: string) => diagnostics.push({ code, severity: "error", message, sourceId: source.id, anchorId });
  const anchors: Record<string, Rect> = {}, parts: Record<string, Rect[]> = {}, context: Record<string, Rect> = {};
  if (source.kind === "image") {
    const { width, height } = source.asset;
    if (!(width > 0 && height > 0)) { error("evidence-source-invalid", `Image "${source.id}" needs intrinsic width and height.`); return { diagnostics }; }
    for (const a of source.anchors) {
      const r = a.rect;
      if (!(r.width > 0 && r.height > 0) || r.x < 0 || r.y < 0 || r.x + r.width > width || r.y + r.height > height) error("evidence-anchor-outside", `Region "${a.id}" lies outside the ${width}×${height} image.`, a.id);
      else { anchors[a.id] = r; parts[a.id] = [r]; context[a.id] = r; }
    }
    return { surface: { sourceId: source.id, kind: "image", width, height, anchors, context, anchorParts: parts }, diagnostics };
  }
  if (source.kind === "table") {
    const size = source.fontSizePx ?? 28, font = source.font ?? TABLE_FONT(size), rowHeight = source.rowHeight ?? Math.round(size * 2.1), headerHeight = rowHeight, padding = 24;
    const x: number[] = []; let cursor = padding;
    for (const c of source.columns) { x.push(cursor); cursor += c.width; }
    const width = cursor + padding, height = padding * 2 + headerHeight + rowHeight * source.rows.length;
    for (const a of source.anchors) {
      const rowIndex = source.rows.findIndex(r => r.id === a.rowId), colIndex = a.columnId ? source.columns.findIndex(c => c.id === a.columnId) : -1;
      if (rowIndex < 0 || (a.columnId && colIndex < 0)) { error("evidence-anchor-unknown", `Anchor "${a.id}" names a missing row or column.`, a.id); continue; }
      if (a.columnId && a.expect !== undefined && source.rows[rowIndex].cells[a.columnId] !== a.expect)
        error("evidence-value-mismatch", `Anchor "${a.id}" expects "${a.expect}" but the cell shows "${source.rows[rowIndex].cells[a.columnId] ?? ""}".`, a.id);
      const y = padding + headerHeight + rowIndex * rowHeight;
      const r = colIndex >= 0 ? { x: x[colIndex], y, width: source.columns[colIndex].width, height: rowHeight } : { x: padding, y, width: cursor - padding, height: rowHeight };
      anchors[a.id] = r; parts[a.id] = [r];
      // A cell is only meaningful with its row label (first column) and its column header.
      context[a.id] = union([r, { x: x[0], y, width: source.columns[0].width, height: rowHeight }, ...(colIndex >= 0 ? [{ x: x[colIndex], y: padding, width: source.columns[colIndex].width, height: headerHeight }] : [])]);
    }
    return { surface: { sourceId: source.id, kind: "table", width, height, anchors, context, anchorParts: parts, table: { x, headerHeight, rowHeight, padding, font, fontSizePx: size } }, diagnostics };
  }
  const size = source.fontSizePx ?? 34, font = source.font ?? TEXT_FONT(size), lineHeightPx = Math.round(size * (source.lineHeight ?? 1.5)), padding = 48, width = source.width ?? 900;
  // Redacted characters are replaced one-for-one, so every offset stays valid and the hidden text never renders.
  let display = source.text;
  for (const r of source.redactions ?? []) {
    if (!(r.start >= 0 && r.end <= source.text.length && r.end > r.start)) { error("evidence-redaction-invalid", `Redaction ${r.start}–${r.end} is outside the text.`); continue; }
    display = display.slice(0, r.start) + display.slice(r.start, r.end).replace(/\S/g, "█") + display.slice(r.end);
  }
  const layout = layoutCaptionLines({ text: display, language: source.lang, measure, font, lineHeightPx, maxWidthPx: width - padding * 2, maxLines: 10000 });
  if (!layout.ok) { error("evidence-text-layout", layout.message); return { diagnostics }; }
  const lines = layout.lines.map((line, i) => ({ ...line, y: padding + i * lineHeightPx }));
  for (const a of source.anchors) {
    const range = textAnchorRange(source, a);
    if ("error" in range) { error("evidence-quote-mismatch", range.error, a.id); continue; }
    if ((source.redactions ?? []).some(r => r.start < range.end && range.start < r.end)) { error("evidence-anchor-redacted", `Anchor "${a.id}" cites redacted text.`, a.id); continue; }
    const rects = lines.filter(l => l.start < range.end && range.start < l.end).map(l => {
      const from = Math.max(range.start, l.start), to = Math.min(range.end, l.end);
      const x0 = padding + measure(font, display.slice(l.start, from)), x1 = padding + measure(font, display.slice(l.start, to));
      return { x: x0, y: l.y, width: Math.max(1, x1 - x0), height: lineHeightPx };
    });
    if (rects.length) { anchors[a.id] = union(rects); parts[a.id] = rects; context[a.id] = union(rects); }
  }
  return { surface: { sourceId: source.id, kind: "text", width, height: padding * 2 + lines.length * lineHeightPx, anchors, context, anchorParts: parts,
    text: { display, lines, font, fontSizePx: size, lineHeightPx, padding } }, diagnostics };
}
export function layoutEvidenceSources(spec: EvidenceStageSpec, measure: MeasureText) {
  const surfaces: Record<string, EvidenceSurface> = {}, diagnostics: EvidenceDiagnostic[] = [];
  for (const source of spec.sources) {
    const result = layoutEvidenceSource(source, measure);
    diagnostics.push(...result.diagnostics);
    if (result.surface) surfaces[source.id] = result.surface;
  }
  return { surfaces, diagnostics };
}

export interface EvidenceBoxLayout {
  /** Where the surface is framed (output px), after the lanes are reserved. */
  viewport: Rect;
  /** Callout lane above the viewport during focus beats with callouts. */
  noteLane?: Rect;
  /** Provenance card: measured lines and its rect. */
  provenance?: { rect: Rect; padding: number; lines: { text: string; font: string; sizePx: number; lineHeightPx: number; tone: "title" | "meta" }[] };
}
/** Reserve a provenance lane (measured, wraps, never truncates) and a callout lane, inside the safe rect. */
export function layoutEvidenceBox(spec: EvidenceStageSpec, beat: EvidenceBeat, box: { width: number; height: number }, measure: MeasureText,
  options: { safe?: Rect; fontStack?: string } = {}): EvidenceBoxLayout {
  const unit = Math.min(box.width, box.height), margin = Math.round(unit * 0.035);
  const safe = options.safe ? { x: options.safe.x * box.width, y: options.safe.y * box.height, width: options.safe.width * box.width, height: options.safe.height * box.height }
    : { x: margin, y: margin, width: box.width - 2 * margin, height: box.height - 2 * margin };
  const stack = options.fontStack ?? "system-ui, -apple-system, 'Segoe UI', sans-serif";
  const source = beat.kind !== "conclude" && beat.sourceId ? spec.sources.find(s => s.id === beat.sourceId) : undefined;
  let bottom = safe.y + safe.height, top = safe.y;
  let provenance: EvidenceBoxLayout["provenance"];
  if (source) {
    const pad = Math.round(unit * 0.024), width = safe.width - 2 * pad, p = source.provenance;
    const rows: [string, number, "title" | "meta", number][] = [
      [`${KIND_LABEL[source.kind]} · ${p.title}`, Math.round(unit * 0.03), "title", 700],
      [provenanceLine({ ...p, title: "" }), Math.round(unit * 0.023), "meta", 500],
      [`Rights: ${p.rights.status} — ${p.rights.reference}${p.note ? ` · ${p.note}` : ""}`, Math.round(unit * 0.021), "meta", 500],
    ];
    const lines: NonNullable<EvidenceBoxLayout["provenance"]>["lines"] = [];
    for (const [text, size, tone, weight] of rows) {
      const font = `${weight} ${size}px ${stack}`, lineHeightPx = Math.round(size * 1.3);
      const wrapped = layoutCaptionLines({ text, measure, font, lineHeightPx, maxWidthPx: width, maxLines: 6 });
      for (const line of wrapped.ok ? wrapped.lines : [{ text }]) lines.push({ text: line.text, font, sizePx: size, lineHeightPx, tone });
    }
    const height = pad * 2 + lines.reduce((n, l) => n + l.lineHeightPx, 0);
    provenance = { rect: { x: safe.x, y: bottom - height, width: safe.width, height }, padding: pad, lines };
    bottom -= height + margin;
  }
  let noteLane: Rect | undefined;
  if (beat.kind === "focus" && beat.callouts?.length) {
    noteLane = { x: safe.x, y: top, width: safe.width, height: Math.round(unit * 0.17) };
    top += noteLane.height;
  }
  return { viewport: { x: safe.x, y: top, width: safe.width, height: Math.max(1, bottom - top) }, noteLane, provenance };
}
const KIND_LABEL: Record<EvidenceSource["kind"], string> = { image: "Photo", text: "Document", table: "Data" };

const timeline = (spec: EvidenceStageSpec) => {
  let cursor = 0;
  return spec.beats.map(beat => { const start = cursor; cursor += beat.durationFrames; return { beat, start, end: cursor }; });
};
export function evidenceDuration(spec: EvidenceStageSpec): number { return spec.beats.reduce((n, b) => n + b.durationFrames, 0); }
/** Provenance as one readable line. */
export function provenanceLine(p: EvidenceProvenance): string {
  return [p.author ?? p.publisher, p.title, p.date, p.locator].filter(Boolean).join(" · ");
}

export interface EvidenceFrame {
  beatIndex: number;
  beat: EvidenceBeat;
  /** Frame inside the beat. */
  local: number;
  sourceId?: string;
  /** Visible surface region and its mapping into the box (fit contain: the cited target is never cropped). */
  crop?: Rect;
  draw?: ClipDraw;
  /** Anchors highlighted now, with 0..1 strength. */
  highlight: { anchorId: string; amount: number }[];
  /** Citation markers drawn on the surface (conclusion). */
  markers: { marker: string; anchorId: string }[];
  /** 0..1 visibility of the conclusion card. */
  conclusion: number;
  /** Callouts eligible now (after the camera settles). */
  callouts: readonly { anchorId: string; title: string; detail?: string }[];
}
function targetCrop(beat: EvidenceBeat, surface: EvidenceSurface, viewport: { width: number; height: number }): Rect {
  const full = { x: 0, y: 0, width: surface.width, height: surface.height };
  if (beat.kind !== "focus" || !beat.anchorIds?.length) return full;
  const rects = beat.anchorIds.map(id => surface.context[id]).filter(Boolean);
  return rects.length ? regionCrop(surface, viewport, union(rects), beat.context ?? 0.6) : full;
}
/** State of one output box at one frame. Pure. `viewportOf` reserves lanes per beat (see layoutEvidenceBox); default: the whole box. */
export function evaluateEvidence(spec: EvidenceStageSpec, surfaces: Readonly<Record<string, EvidenceSurface>>, frame: number, box: { width: number; height: number },
  viewportOf: (beat: EvidenceBeat) => Rect = () => ({ x: 0, y: 0, width: box.width, height: box.height })): EvidenceFrame {
  const beats = timeline(spec), total = evidenceDuration(spec);
  const f = Math.max(0, Math.min(total - 1, frame));
  const index = Math.max(0, beats.findIndex(b => f >= b.start && f < b.end)), { beat, start } = beats[index], local = f - start;
  const move = spec.moveFrames ?? 18, surface = beat.sourceId ? surfaces[beat.sourceId] : undefined;
  const settle = Math.min(1, (local + 1) / Math.max(1, move));
  const markers = beat.kind === "conclude" && beat.sourceId ? (spec.conclusion?.citations ?? []).filter(c => c.sourceId === beat.sourceId).map(c => ({ marker: c.marker, anchorId: c.anchorId })) : [];
  const base: EvidenceFrame = { beatIndex: index, beat, local, sourceId: beat.sourceId, highlight: [], markers, callouts: [],
    conclusion: beat.kind === "conclude" ? evaluateEasing("ease-out-cubic", Math.min(1, (local + 1) / 12)) : 0 };
  if (!surface) return base;
  const viewport = viewportOf(beat), target = targetCrop(beat, surface, viewport);
  const previous = index > 0 ? beats[index - 1].beat : undefined;
  const from = previous && previous.sourceId === beat.sourceId && surfaces[previous.sourceId!] ? targetCrop(previous, surface, viewportOf(previous)) : target;
  const crop = interpolateCrop(from, target, evaluateEasing("ease-in-out-cubic", settle), surface);
  const fitted = resolveClipDraw(surface, viewport, { crop, fit: "contain" });
  const draw = { ...fitted, dx: fitted.dx + viewport.x, dy: fitted.dy + viewport.y };
  const focusIds = beat.kind === "focus" ? beat.anchorIds ?? [] : markers.map(m => m.anchorId);
  const amount = beat.kind === "focus" ? Math.max(0, Math.min(1, (local - move + 10) / 10)) : beat.kind === "conclude" ? base.conclusion : 0;
  return { ...base, crop, draw, highlight: focusIds.map(anchorId => ({ anchorId, amount })), callouts: local >= move ? beat.callouts ?? [] : [] };
}

/** Structural, provenance, anchor and framing checks for every output box. */
export function validateEvidenceStage(spec: EvidenceStageSpec, surfaces: Readonly<Record<string, EvidenceSurface>>,
  boxes: readonly { width: number; height: number }[] = [],
  options: { minContextPx?: number; minTargetPx?: number; maxUpscale?: number; measure?: MeasureText; safe?: Rect } = {}): EvidenceDiagnostic[] {
  const out: EvidenceDiagnostic[] = [];
  const report = (severity: "error" | "warning", code: string, message: string, extra: Partial<EvidenceDiagnostic> = {}) => out.push({ code, severity, message, ...extra });
  const sources = new Map(spec.sources.map(s => [s.id, s]));
  if (sources.size !== spec.sources.length) report("error", "evidence-source-duplicate", "Every source needs a unique ID.");
  for (const s of spec.sources) {
    const p = s.provenance, at = { sourceId: s.id };
    if (!p?.title?.trim() || !(p.author?.trim() || p.publisher?.trim()) || !p.date?.trim() || !p.locator?.trim())
      report("error", "evidence-provenance-missing", `Source "${s.id}" needs a title, an author or publisher, a date and a locator.`, at);
    if (!p?.rights?.reference?.trim()) report("error", "evidence-rights-missing", `Source "${s.id}" has no rights reference; only authorized sources can be shown.`, at);
    if (p?.rights?.status === "fair-use-claimed") report("warning", "evidence-fair-use-claimed", `Source "${s.id}" relies on a fair-use claim; that is the author's judgement, not a licence.`, at);
    if (s.kind === "image" && !s.alt.trim()) report("error", "evidence-alt-missing", `Image "${s.id}" needs alternative text.`, at);
  }
  const beats = timeline(spec), focused = new Set<string>();
  for (const { beat, start } of beats) {
    const at = { path: `beats.${beat.id}`, frame: start };
    if (!Number.isSafeInteger(beat.durationFrames) || beat.durationFrames < 1) report("error", "evidence-beat-invalid", `Beat "${beat.id}" needs a positive integer duration.`, at);
    const source = beat.sourceId ? sources.get(beat.sourceId) : undefined;
    if (beat.kind !== "conclude" && !source) { report("error", "evidence-source-unknown", `Beat "${beat.id}" needs a known source.`, at); continue; }
    const surface = beat.sourceId ? surfaces[beat.sourceId] : undefined;
    for (const id of [...(beat.anchorIds ?? []), ...(beat.callouts ?? []).map(c => c.anchorId)])
      if (surface && !surface.anchors[id]) report("error", "evidence-anchor-unknown", `Beat "${beat.id}" cites anchor "${id}", which is not a valid anchor of "${beat.sourceId}".`, { ...at, anchorId: id });
    if (beat.kind === "focus") {
      if (!beat.anchorIds?.length) report("error", "evidence-focus-empty", `Focus beat "${beat.id}" names no anchors.`, at);
      for (const id of beat.anchorIds ?? []) focused.add(`${beat.sourceId}/${id}`);
      if (beat.durationFrames <= (spec.moveFrames ?? 18)) report("warning", "evidence-focus-short", `Focus beat "${beat.id}" ends before the camera settles.`, at);
    }
    if (beat.kind === "establish" && source) {
      const need = readableCaptionFrames(provenanceLine(source.provenance), spec.fps);
      if (beat.durationFrames < need) report("warning", "evidence-provenance-short", `Beat "${beat.id}" shows the provenance for ${beat.durationFrames} frames; reading needs about ${need}.`, at);
    }
    if (beat.kind === "focus" && surface) for (const box of boxes) {
      const viewportOf = (b: EvidenceBeat) => options.measure ? layoutEvidenceBox(spec, b, box, options.measure, { safe: options.safe }).viewport : { x: 0, y: 0, width: box.width, height: box.height };
      const vp = viewportOf(beat);
      const state = evaluateEvidence(spec, surfaces, start + beat.durationFrames - 1, box, viewportOf), d = state.draw!;
      const rects = (beat.anchorIds ?? []).map(id => surface.context[id]).filter(Boolean);
      if (!rects.length) continue;
      const t = union(rects), x = d.dx + (t.x - d.sx) * d.scale, y = d.dy + (t.y - d.sy) * d.scale, w = t.width * d.scale, h = t.height * d.scale;
      const margin = Math.min(x - vp.x, y - vp.y, vp.x + vp.width - x - w, vp.y + vp.height - y - h), name = `${box.width}×${box.height}`;
      if (margin < -0.5) report("error", "evidence-target-cropped", `In ${name}, focus "${beat.id}" cuts off its cited target or its context.`, at);
      else if (margin < (options.minContextPx ?? 24) && Math.min(w / vp.width, h / vp.height) > 0.6) report("warning", "evidence-context-lost", `In ${name}, focus "${beat.id}" leaves under ${options.minContextPx ?? 24}px of context around the target.`, at);
      const lineHeight = surface.text ? surface.text.lineHeightPx * d.scale : surface.table ? surface.table.rowHeight * d.scale : Infinity;
      if (lineHeight < (options.minTargetPx ?? 36)) report("warning", "evidence-target-small", `In ${name}, focus "${beat.id}" shows text ${lineHeight.toFixed(0)}px tall; push in further or enlarge the type.`, at);
      if (surface.kind === "image" && d.scale > (options.maxUpscale ?? 1.5)) report("warning", "evidence-upscaled", `In ${name}, focus "${beat.id}" enlarges image pixels ×${d.scale.toFixed(2)}; supply a higher-resolution source.`, at);
    }
  }
  if (spec.conclusion) {
    for (const c of spec.conclusion.citations) {
      if (!spec.conclusion.text.includes(c.marker)) report("error", "evidence-citation-unused", `Citation ${c.marker} does not appear in the conclusion.`);
      if (!surfaces[c.sourceId]?.anchors[c.anchorId]) report("error", "evidence-citation-unknown", `Citation ${c.marker} points to a missing anchor "${c.sourceId}/${c.anchorId}".`, { sourceId: c.sourceId, anchorId: c.anchorId });
      else if (!focused.has(`${c.sourceId}/${c.anchorId}`)) report("warning", "evidence-citation-unshown", `Citation ${c.marker} cites "${c.anchorId}", which no focus beat showed.`, { sourceId: c.sourceId, anchorId: c.anchorId });
    }
    for (const m of spec.conclusion.text.match(/\[[^\]]+\]/g) ?? [])
      if (!spec.conclusion.citations.some(c => c.marker === m)) report("error", "evidence-citation-dangling", `Conclusion marker ${m} has no citation.`);
    if (!spec.beats.some(b => b.kind === "conclude")) report("warning", "evidence-conclusion-unshown", "The conclusion is never shown; add a conclude beat.");
  }
  return out;
}
