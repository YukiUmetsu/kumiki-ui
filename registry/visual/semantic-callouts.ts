/** SemanticCalloutLayer (V03): labels attached to moving semantic parts.
 *
 * Renderer-neutral: anchors come from an `InspectableAsset` at an absolute
 * frame, positions from the caller's camera projection, text sizes from the
 * caller's real font measurer (`MeasureText`, e.g. `createCanvasMeasurer`).
 * Placement reuses SL1 (`layoutSemanticLabels`): greedy by priority, never
 * covering another anchor, a protected region or a protected part's
 * projected bounds, and widening the leader in steps before giving up.
 *
 * Every callout reports an honest status — visible, occluded, outside,
 * unplaceable or inactive — and failures are diagnostics, never silent
 * clipping or truncation. Occlusion is only claimed when the caller supplies
 * a depth test; otherwise a single "occlusion-unknown" note is emitted.
 * Output is a pure function of the inputs and the frame (any seek order).
 */
import type { Rect } from "../motion/types";
import { segmentText } from "../media/text-layout";
import type { MeasureText } from "../media/text-layout";
import { layoutSemanticLabels } from "./semantic-labels";
import type { LabelSide } from "./semantic-labels";
import type { InspectableAsset } from "./inspectable-asset";

export interface CalloutSpec {
  id: string;
  /** Anchor on the asset (preferred); otherwise the center of `partId`'s bounds. */
  anchorId?: string;
  partId?: string;
  title: string;
  detail?: string;
  priority?: number;
  preferred?: readonly LabelSide[];
  /** Visible frames [startFrame, endFrame); fades in/out over `fadeFrames`. */
  window?: { startFrame: number; endFrame: number };
  /** Callouts with the same group and title collapse into one with a count. */
  group?: string;
}
export interface CalloutTypography {
  /** CSS font shorthand used for measuring and drawing titles, e.g. "600 22px Geist". */
  titleFont: string;
  titleSizePx: number;
  detailFont?: string;
  detailSizePx?: number;
  /** Line height multiplier (default 1.22). */
  lineHeight?: number;
  /** Maximum box width including padding. */
  maxWidthPx: number;
  /** Horizontal / vertical padding (defaults 18 / 9; smaller values are raised to these minimums). */
  paddingX?: number;
  paddingY?: number;
  measure: MeasureText;
  language?: string;
  /** Soft line limits; exceeding them is reported, never truncated. */
  maxTitleLines?: number;
  maxDetailLines?: number;
}
export interface CalloutProjection { x: number; y: number; /** In front of the camera and inside the frustum. */ inView: boolean }
export interface CalloutLayerInput {
  asset: InspectableAsset;
  callouts: readonly CalloutSpec[];
  frame: number;
  viewport: { width: number; height: number };
  project(point: readonly number[]): CalloutProjection;
  /** Depth-aware test: true when the anchor is hidden behind other geometry. Omit when unknown. */
  occluded?(point: readonly number[], partId: string): boolean;
  /** Screen rects labels must not cover (caption bands, critical UI). */
  protectedRegions?: readonly Rect[];
  /** Parts whose projected bounds labels must not cover. */
  protectedParts?: readonly string[];
  typography: CalloutTypography;
  safeInset?: number;
  /** Leader lengths tried in order (px). */
  leaders?: readonly number[];
  fadeFrames?: number;
}
export type CalloutStatus = "visible" | "occluded" | "outside" | "unplaceable" | "inactive";
export interface PlacedCallout {
  id: string;
  status: CalloutStatus;
  /** 0–1 entrance/exit opacity (0 unless visible). */
  opacity: number;
  anchor?: { x: number; y: number };
  box?: Rect;
  side?: LabelSide;
  /** Leader polyline from the anchor to the box edge. */
  leader?: ReadonlyArray<readonly [number, number]>;
  title: string[];
  detail: string[];
  /** Number of collapsed callouts this label stands for. */
  count: number;
  metrics: { paddingX: number; paddingY: number; titleLineHeight: number; detailLineHeight: number; titleSizePx: number; detailSizePx: number; titleFont: string; detailFont: string };
}
export interface CalloutDiagnostic {
  code: "unknown-anchor" | "unknown-part" | "duplicate-id" | "invalid" | "unplaceable" | "occlusion-unknown" | "text-overflow";
  calloutId?: string;
  severity: "error" | "warning" | "info";
  message: string;
}
export interface CalloutLayout { callouts: PlacedCallout[]; diagnostics: CalloutDiagnostic[] }

/** Structural preflight: unknown semantic IDs, duplicates, empty text, invalid windows. */
export function preflightCallouts(asset: InspectableAsset, callouts: readonly CalloutSpec[]): CalloutDiagnostic[] {
  const out: CalloutDiagnostic[] = [];
  const anchors = new Set(asset.anchors.map(a => a.id)), parts = new Set(asset.parts.map(p => p.id)), seen = new Set<string>();
  for (const c of callouts) {
    if (!c.id?.trim() || seen.has(c.id)) out.push({ code: "duplicate-id", calloutId: c.id, severity: "error", message: `Callout ID "${c.id}" is empty or duplicated.` });
    seen.add(c.id);
    if (!c.title?.trim()) out.push({ code: "invalid", calloutId: c.id, severity: "error", message: `Callout "${c.id}" needs a title.` });
    if (c.anchorId && !anchors.has(c.anchorId)) out.push({ code: "unknown-anchor", calloutId: c.id, severity: "error", message: `Callout "${c.id}" references unknown anchor "${c.anchorId}" on "${asset.id}".` });
    if (!c.anchorId && (!c.partId || !parts.has(c.partId))) out.push({ code: "unknown-part", calloutId: c.id, severity: "error", message: `Callout "${c.id}" needs a known anchorId or partId (got ${JSON.stringify(c.partId)}).` });
    if (c.window && !(Number.isSafeInteger(c.window.startFrame) && Number.isSafeInteger(c.window.endFrame) && c.window.endFrame > c.window.startFrame && c.window.startFrame >= 0))
      out.push({ code: "invalid", calloutId: c.id, severity: "error", message: `Callout "${c.id}" has an invalid frame window.` });
  }
  return out;
}

/** Greedy line wrapping on Intl segments with real measurements (CJK-safe). */
export function wrapCalloutText(text: string, font: string, maxWidth: number, measure: MeasureText, language?: string): string[] {
  const lines: string[] = [];
  let line = "";
  const push = () => { if (line.trim()) lines.push(line.trim()); line = ""; };
  for (const segment of segmentText(text, language)) {
    const candidate = line + segment;
    if (!line || measure(font, candidate.trim()) <= maxWidth) { line = candidate; continue; }
    push();
    if (measure(font, segment.trim()) <= maxWidth) { line = segment.trimStart(); continue; }
    // A single unbreakable run wider than the box: break by grapheme rather than overflow.
    for (const ch of Array.from(segment.trim())) {
      if (line && measure(font, line + ch) > maxWidth) push();
      line += ch;
    }
  }
  push();
  return lines;
}

export function layoutCallouts(input: CalloutLayerInput): CalloutLayout {
  const { asset, frame, viewport, typography: t } = input;
  if (!Number.isSafeInteger(frame) || frame < 0) throw new Error("Callout layout needs a nonnegative integer frame.");
  if (!(viewport.width > 0 && viewport.height > 0)) throw new Error("Callout layout needs a positive viewport.");
  const pre = preflightCallouts(asset, input.callouts);
  if (pre.some(d => d.severity === "error")) throw new Error(`Callout preflight failed: ${pre.map(d => d.message).join(" ")}`);
  const diagnostics: CalloutDiagnostic[] = [];
  const padX = Math.max(18, t.paddingX ?? 18), padY = Math.max(8, t.paddingY ?? 9);
  const lh = t.lineHeight ?? 1.22, detailSize = t.detailSizePx ?? Math.round(t.titleSizePx * .78);
  const detailFont = t.detailFont ?? t.titleFont.replace(/\b\d+(\.\d+)?px\b/, `${detailSize}px`).replace(/^\s*(\d{3}|bold)\s+/, "400 ");
  const metrics = { paddingX: padX, paddingY: padY, titleLineHeight: t.titleSizePx * lh, detailLineHeight: detailSize * lh, titleSizePx: t.titleSizePx, detailSizePx: detailSize, titleFont: t.titleFont, detailFont };
  const fade = Math.max(1, input.fadeFrames ?? 8), inset = input.safeInset ?? 16;
  const leaders = input.leaders ?? [28, 64, 120, 200];

  // Collapse repeated labels (same group + title): the highest priority one stands for all.
  const groups = new Map<string, CalloutSpec[]>();
  for (const c of input.callouts) { const key = c.group ? `${c.group}\u0000${c.title}` : `\u0001${c.id}`; groups.set(key, [...(groups.get(key) ?? []), c]); }
  const leadersOf = new Map<string, number>();
  for (const list of groups.values()) {
    const sorted = [...list].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
    leadersOf.set(sorted[0].id, list.length);
  }

  const results = new Map<string, PlacedCallout>();
  const visible: Array<{ spec: CalloutSpec; anchor: { x: number; y: number }; width: number; height: number; title: string[]; detail: string[] }> = [];
  let occlusionNoted = false;
  for (const spec of input.callouts) {
    const count = leadersOf.get(spec.id);
    const textWidth = t.maxWidthPx - padX * 2;
    const title = wrapCalloutText(spec.title, t.titleFont, textWidth, t.measure, t.language);
    const detailText = spec.detail ? (count && count > 1 ? `${spec.detail} · ×${count}` : spec.detail) : count && count > 1 ? `×${count}` : "";
    const detail = detailText ? wrapCalloutText(detailText, detailFont, textWidth, t.measure, t.language) : [];
    const base: PlacedCallout = { id: spec.id, status: "inactive", opacity: 0, title, detail, count: count ?? 0, metrics };
    if (!count) { results.set(spec.id, base); continue; } // collapsed into its group leader
    if (title.length > (t.maxTitleLines ?? 2) || detail.length > (t.maxDetailLines ?? 2))
      diagnostics.push({ code: "text-overflow", calloutId: spec.id, severity: "warning", message: `Callout "${spec.id}" needs ${title.length}+${detail.length} lines; shorten it or widen maxWidthPx (text is kept, not truncated).` });
    const w = spec.window;
    if (w && (frame < w.startFrame || frame >= w.endFrame)) { results.set(spec.id, base); continue; }
    const opacity = w ? Math.min(1, (frame - w.startFrame + 1) / fade, (w.endFrame - frame) / fade) : 1;
    let point: readonly number[], partId: string;
    if (spec.anchorId) { point = asset.getAnchor(spec.anchorId, frame).position; partId = asset.anchors.find(a => a.id === spec.anchorId)!.partId; }
    else { const b = asset.getBounds(spec.partId!, frame); point = b.min.map((v, i) => (v + b.max[i]) / 2); partId = spec.partId!; }
    const p = input.project(point);
    const anchor = { x: p.x, y: p.y };
    if (!p.inView || p.x < inset || p.y < inset || p.x > viewport.width - inset || p.y > viewport.height - inset) { results.set(spec.id, { ...base, status: "outside", anchor }); continue; }
    if (input.occluded) {
      if (input.occluded(point, partId)) { results.set(spec.id, { ...base, status: "occluded", anchor }); continue; }
    } else if (!occlusionNoted) {
      occlusionNoted = true;
      diagnostics.push({ code: "occlusion-unknown", severity: "info", message: "No depth test supplied: anchors behind geometry are reported visible." });
    }
    const textW = Math.max(0, ...title.map(l => t.measure(t.titleFont, l)), ...detail.map(l => t.measure(detailFont, l)));
    const width = Math.ceil(textW + padX * 2), height = Math.ceil(title.length * metrics.titleLineHeight + detail.length * metrics.detailLineHeight + padY * 2);
    results.set(spec.id, { ...base, status: "visible", opacity, anchor });
    visible.push({ spec, anchor, width, height, title, detail });
  }

  // Obstacles: every visible anchor, protected regions and protected parts' projected bounds.
  const obstacles: Array<{ id: string; bounds: Rect }> = [];
  (input.protectedRegions ?? []).forEach((r, i) => obstacles.push({ id: `\u0000region-${i}`, bounds: r }));
  for (const id of input.protectedParts ?? []) {
    const b = asset.getBounds(id, frame);
    const corners: number[][] = [];
    for (let mask = 0; mask < 1 << b.min.length; mask++) corners.push(b.min.map((v, i) => (mask >> i) & 1 ? b.max[i] : v));
    const pts = corners.map(c => input.project(c)).filter(q => q.inView);
    if (!pts.length) continue;
    const x0 = Math.min(...pts.map(q => q.x)), y0 = Math.min(...pts.map(q => q.y)), x1 = Math.max(...pts.map(q => q.x)), y1 = Math.max(...pts.map(q => q.y));
    if (x1 - x0 > 0 && y1 - y0 > 0) obstacles.push({ id: `\u0000part-${id}`, bounds: { x: x0, y: y0, width: x1 - x0, height: y1 - y0 } });
  }
  const anchorRect = (a: { x: number; y: number }): Rect => ({ x: a.x - 4, y: a.y - 4, width: 8, height: 8 });
  const placed = new Map<string, { side: LabelSide; bounds: Rect }>();
  let pending = [...visible].sort((a, b) => (b.spec.priority ?? 0) - (a.spec.priority ?? 0));
  for (const gap of leaders) {
    if (!pending.length) break;
    const subjects = [...obstacles, ...visible.map(v => ({ id: v.spec.id, bounds: anchorRect(v.anchor) })),
      ...[...placed].map(([id, p]) => ({ id: `\u0000label-${id}`, bounds: p.bounds }))];
    const result = layoutSemanticLabels({
      viewport, safeInset: inset, subjects,
      labels: pending.map(v => ({
        id: v.spec.id, targetId: v.spec.id, width: v.width, height: v.height, priority: v.spec.priority, gap,
        // Side-stable: anchors on the left half prefer the left (and vice versa), so labels only swap sides when their anchor crosses the center.
        preferred: v.spec.preferred?.length ? v.spec.preferred : v.anchor.x < viewport.width / 2 ? ["left", "above", "below", "right"] : ["right", "above", "below", "left"],
      })),
    });
    for (const p of result.placed) placed.set(p.id, { side: p.side, bounds: p.bounds });
    pending = pending.filter(v => !placed.has(v.spec.id));
  }
  for (const v of visible) {
    const r = results.get(v.spec.id)!;
    const p = placed.get(v.spec.id);
    if (!p) {
      results.set(v.spec.id, { ...r, status: "unplaceable", opacity: 0 });
      diagnostics.push({ code: "unplaceable", calloutId: v.spec.id, severity: "warning", message: `No free space for "${v.spec.id}" (${v.width}×${v.height}px) within ${leaders[leaders.length - 1]}px of its anchor without covering a protected subject or another label.` });
      continue;
    }
    const b = p.bounds, a = v.anchor;
    const end: [number, number] = p.side === "right" ? [b.x, b.y + b.height / 2] : p.side === "left" ? [b.x + b.width, b.y + b.height / 2]
      : p.side === "above" ? [b.x + b.width / 2, b.y + b.height] : [b.x + b.width / 2, b.y];
    results.set(v.spec.id, { ...r, box: b, side: p.side, leader: [[a.x, a.y], end] });
  }
  return { callouts: input.callouts.map(c => results.get(c.id)!), diagnostics: [...pre, ...diagnostics] };
}

export type { LabelSide };
