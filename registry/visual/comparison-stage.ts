/** E04 `ComparisonStage` — fair side-by-side comparisons of 2D or 3D subjects.
 *
 * The planner is renderer-neutral: it takes each subject's real-world extent in
 * meters and a view direction, and lays out slots so subjects are either at
 * one **shared** scale (`equal`, a single px-per-meter for every slot, standing
 * on a shared ground line) or explicitly **fitted** to their own slot
 * (`fit-each`, captioned "not to scale" with per-slot scale bars). Cameras never
 * silently exaggerate size: {@link comparisonCamera} turns a slot's
 * px-per-meter into a matched camera pose for `HeroAssetViewer` (same fov and
 * view angle for every slot).
 *
 * The output is geometry and diagnostics only; `ComparisonStageView`
 * (comparison-stage-react) draws labels, ground lines and scale bars around any
 * 2D or 3D slot content.
 */

export type ComparisonScale = "equal" | "fit-each";
export type ComparisonDimension = "height" | "width" | "depth" | "footprint" | "volume" | "none";

export interface ComparisonSubject {
  id: string;
  label: string;
  /** Real-world extent in meters: [width (x), height (y), depth (z)]. */
  size: readonly [number, number, number];
  /** Short secondary line, e.g. "40-gallon tank". */
  caption?: string;
  /** World bounds and units of a 3D asset, used to aim the matched camera. */
  hero?: { bounds: { min: readonly number[]; max: readonly number[] }; metersPerUnit: number };
}

export interface ComparisonStageSpec {
  id: string;
  subjects: ComparisonSubject[];
  scale: ComparisonScale;
  /** @default "auto" (row on wide stages up to 5, column on tall stages up to 3, otherwise a grid) */
  layout?: "auto" | "row" | "column" | "grid";
  /** The quantity being compared; printed for every subject from `size`. @default "height" */
  dimension?: ComparisonDimension;
  /** View direction in degrees (HeroView convention). Top view: `{ azimuth: 0, elevation: 90 }`. @default front `{ 0, 0 }` */
  view?: { azimuth: number; elevation: number };
  /** @default "metric" */
  units?: "metric" | "imperial";
}

export interface ComparisonLayoutOptions {
  /** Design-px stage. */
  width: number;
  height: number;
  /** @default 5% of the shorter edge */
  padding?: number;
  /** Space under each slot for label + measurement lines. @default 76 */
  labelHeight?: number;
  /** Space reserved at the bottom for the scale caption. @default 40 */
  captionHeight?: number;
  /** Gap between slots. @default 24 */
  gap?: number;
  /** Subjects smaller than this many px (largest projected side) are reported. @default 18 */
  minSubjectPx?: number;
}

export interface Rect { x: number; y: number; width: number; height: number }

export interface ComparisonSlot {
  id: string;
  label: string;
  caption?: string;
  /** Whole slot (subject area), in stage px. */
  rect: Rect;
  /** Where the subject's projected extent sits inside the slot (ground-aligned). */
  subjectRect: Rect;
  labelRect: Rect;
  pxPerMeter: number;
  /** Projected extent in meters for the view: [horizontal, vertical]. */
  extent: [number, number];
  /** "Height 1.52 m" style lines for the declared dimension. */
  measurement: string;
  /** pxPerMeter relative to the largest scale in use (1 = largest drawn scale). */
  relativeScale: number;
}

export interface ScaleBar { slotId: string | null; meters: number; px: number; label: string; x: number; y: number }

export interface ComparisonStagePlan {
  id: string;
  scale: ComparisonScale;
  layout: "row" | "column" | "grid";
  slots: ComparisonSlot[];
  /** Single px-per-meter for `equal`, null for `fit-each`. */
  pxPerMeter: number | null;
  /** One shared bar (equal) or one per slot (fit-each). */
  scaleBars: ScaleBar[];
  /** Ground line y per row (equal scale shares it across the row). */
  groundLines: { y: number; x0: number; x1: number }[];
  /** Printed under the stage: the scale policy in words. */
  caption: string;
  /** Reserved strip for the shared scale bar and caption. */
  captionRect: Rect;
  notToScale: boolean;
  diagnostics: { code: string; severity: "error" | "warning" | "info"; message: string; targetId?: string }[];
}

const rad = (d: number) => (d * Math.PI) / 180;

/** Orthographic projected extent [horizontal, vertical] of a box seen from (azimuth, elevation). */
export function projectedExtent(size: readonly [number, number, number], view = { azimuth: 0, elevation: 0 }): [number, number] {
  const [w, h, d] = size, a = rad(view.azimuth), e = rad(view.elevation);
  const horizontal = w * Math.abs(Math.cos(a)) + d * Math.abs(Math.sin(a));
  const across = w * Math.abs(Math.sin(a)) + d * Math.abs(Math.cos(a));
  return [horizontal, h * Math.abs(Math.cos(e)) + across * Math.abs(Math.sin(e))];
}

function niceMeters(target: number) {
  const steps = [0.01, 0.02, 0.05, 0.1, 0.2, 0.25, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500];
  return steps.reduce((best, s) => (Math.abs(Math.log(s / target)) < Math.abs(Math.log(best / target)) ? s : best), steps[0]);
}
function niceFeet(targetM: number) {
  const ft = targetM / 0.3048;
  const steps = [0.25, 0.5, 1, 2, 5, 10, 20, 50, 100, 200];
  return steps.reduce((best, s) => (Math.abs(Math.log(s / ft)) < Math.abs(Math.log(best / ft)) ? s : best), steps[0]) * 0.3048;
}

/** Length text in the declared units, e.g. "1.52 m" / "4 ft 11 in". */
export function formatLength(m: number, units: "metric" | "imperial" = "metric"): string {
  if (units === "imperial") {
    const inches = m / 0.0254;
    if (inches < 24) return `${Math.round(inches * 10) / 10} in`;
    const ft = Math.floor(inches / 12), inch = Math.round(inches - ft * 12);
    return inch === 12 ? `${ft + 1} ft` : inch ? `${ft} ft ${inch} in` : `${ft} ft`;
  }
  if (m < 1) return `${Math.round(m * 100)} cm`;
  return `${m < 10 ? Math.round(m * 100) / 100 : Math.round(m * 10) / 10} m`;
}

function measurement(s: ComparisonSubject, dim: ComparisonDimension, units: "metric" | "imperial") {
  const [w, h, d] = s.size;
  switch (dim) {
    case "none": return "";
    case "width": return `Width ${formatLength(w, units)}`;
    case "depth": return `Depth ${formatLength(d, units)}`;
    case "footprint": {
      const a = w * d;
      return `Footprint ${formatLength(w, units)} × ${formatLength(d, units)} · ${units === "imperial" ? `${Math.round(a / 0.092903)} ft²` : `${a < 10 ? Math.round(a * 100) / 100 : Math.round(a)} m²`}`;
    }
    case "volume": {
      const v = w * h * d;
      return `Envelope ${units === "imperial" ? `${Math.round(v / 0.0283168)} ft³` : `${v < 10 ? Math.round(v * 1000) / 1000 : Math.round(v)} m³`}`;
    }
    default: return `Height ${formatLength(h, units)}`;
  }
}

/** Pure layout: slots, shared or per-slot scale, ground lines, scale bars and the scale caption. */
export function planComparisonStage(spec: ComparisonStageSpec, options: ComparisonLayoutOptions): ComparisonStagePlan {
  const diagnostics: ComparisonStagePlan["diagnostics"] = [];
  const n = spec.subjects.length;
  const units = spec.units ?? "metric", dim = spec.dimension ?? "height";
  const view = spec.view ?? { azimuth: 0, elevation: 0 };
  if (n < 2) diagnostics.push({ code: "comparison-needs-two", severity: "error", message: "A comparison needs at least two subjects." });
  const ids = new Set<string>();
  for (const s of spec.subjects) {
    if (ids.has(s.id)) diagnostics.push({ code: "duplicate-id", severity: "error", message: `Subject id "${s.id}" is used twice.`, targetId: s.id });
    ids.add(s.id);
    if (!s.size.every((v) => Number.isFinite(v) && v >= 0) || Math.max(...s.size) <= 0) diagnostics.push({ code: "subject-size-invalid", severity: "error", message: `"${s.label}" needs a positive real-world size in meters.`, targetId: s.id });
  }
  const pad = options.padding ?? Math.round(Math.min(options.width, options.height) * 0.05);
  const labelH = options.labelHeight ?? 76, captionH = options.captionHeight ?? 40, gap = options.gap ?? 24;
  const wide = options.width >= options.height * 1.2, tall = options.height >= options.width * 1.2;
  const layout = spec.layout && spec.layout !== "auto" ? spec.layout : wide && n <= 5 ? "row" : tall && n <= 3 ? "column" : n >= 3 ? "grid" : wide ? "row" : "column";
  const cols = layout === "row" ? n : layout === "column" ? 1 : Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / cols);
  const inner = { x: pad, y: pad, width: options.width - pad * 2, height: options.height - pad * 2 - captionH };
  const cellW = (inner.width - gap * (cols - 1)) / cols, cellH = (inner.height - gap * (rows - 1)) / rows;
  const slotH = Math.max(10, cellH - labelH);
  const extents = spec.subjects.map((s) => projectedExtent(s.size, view));
  const planView = Math.abs(view.elevation) > 60;
  const fits = extents.map(([ew, eh]) => Math.min((cellW * 0.92) / Math.max(ew, 1e-6), (slotH * 0.92) / Math.max(eh, 1e-6)));
  const shared = spec.scale === "equal" ? Math.min(...fits) : null;
  const scales = fits.map((f) => shared ?? f);
  const maxScale = Math.max(...scales);
  const slots: ComparisonSlot[] = spec.subjects.map((s, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const rect = { x: inner.x + col * (cellW + gap), y: inner.y + row * (cellH + gap), width: cellW, height: slotH };
    const k = scales[i], [ew, eh] = extents[i];
    const sw = ew * k, sh = eh * k;
    // Elevations stand on the slot's ground line; plan (top) views are centered instead.
    const ground = rect.y + rect.height - slotH * 0.04;
    const subjectRect = { x: rect.x + (rect.width - sw) / 2, y: planView ? rect.y + (rect.height - sh) / 2 : ground - sh, width: sw, height: sh };
    if (Math.max(sw, sh) < (options.minSubjectPx ?? 18)) {
      diagnostics.push({ code: "subject-tiny", severity: "warning", targetId: s.id,
        message: `"${s.label}" is ${Math.max(sw, sh).toFixed(0)} px at the shared scale: true relative size, but hard to see. Add a labeled inset or a fit-each view; do not enlarge it silently.` });
    }
    return { id: s.id, label: s.label, caption: s.caption, rect, subjectRect, labelRect: { x: rect.x, y: rect.y + rect.height + 8, width: rect.width, height: labelH - 8 },
      pxPerMeter: k, extent: [ew, eh], measurement: measurement(s, dim, units), relativeScale: k / maxScale };
  });
  const groundLines = planView ? [] : Array.from({ length: rows }, (_, r) => {
    const rowSlots = slots.filter((_, i) => Math.floor(i / cols) === r);
    const y = rowSlots[0] ? rowSlots[0].rect.y + rowSlots[0].rect.height - slotH * 0.04 : 0;
    return { y, x0: rowSlots[0]?.rect.x ?? 0, x1: rowSlots.length ? rowSlots[rowSlots.length - 1].rect.x + rowSlots[rowSlots.length - 1].rect.width : 0 };
  });
  const scaleBars: ScaleBar[] = [];
  const bar = (k: number, slotId: string | null, x: number, y: number, widthPx: number) => {
    const target = (widthPx * 0.22) / k;
    const meters = units === "imperial" ? niceFeet(target) : niceMeters(target);
    scaleBars.push({ slotId, meters, px: meters * k, label: formatLength(meters, units), x, y });
  };
  if (shared !== null) bar(shared, null, inner.x, options.height - pad - captionH + 8, inner.width / Math.max(1, cols));
  else slots.forEach((s) => bar(s.pxPerMeter, s.id, s.rect.x + 6, s.rect.y + 6, s.rect.width));
  const ratio = maxScale / Math.min(...scales);
  if (spec.scale === "fit-each" && ratio > 1.05) diagnostics.push({ code: "fit-each-scale", severity: "info", message: `Subjects are drawn at different scales (up to ×${ratio.toFixed(1)}); the stage is captioned not to scale and each slot has its own scale bar.` });
  const angleNote = view.azimuth === 0 && view.elevation === 0 ? "front view" : planView ? "top view" : `view ${Math.round(view.azimuth)}° / ${Math.round(view.elevation)}°`;
  const caption = spec.scale === "equal"
    ? `Equal scale: every subject is drawn at the same ${units === "imperial" ? "px per foot" : "px per meter"}${planView ? ", centered in its slot" : " and stands on a shared ground line"} (${angleNote}).`
    : `Not to scale: each subject is fitted to its slot (scales differ up to ×${ratio.toFixed(1)}); use the per-slot scale bars to compare sizes.`;
  const captionRect = { x: inner.x, y: options.height - pad - captionH + 8, width: inner.width, height: captionH - 8 };
  return { id: spec.id, scale: spec.scale, layout, slots, pxPerMeter: shared, scaleBars, groundLines, caption, captionRect, notToScale: spec.scale !== "equal" && ratio > 1.05, diagnostics };
}

/**
 * A camera pose for one slot whose projected subject box lands on the planned
 * `subjectRect`, so the drawn size matches the slot's px-per-meter. Every slot
 * uses the same fov and view angles. Perspective enlarges near faces; instead
 * of calibrating at one plane, the distance and aim are solved so the
 * projected bounding box matches the plan, and the remaining mismatch is
 * returned as `residual` (fraction of the planned height).
 */
export function comparisonCamera(
  slot: ComparisonSlot,
  subject: ComparisonSubject,
  view = { azimuth: 0, elevation: 0 },
  fov = 10
): { position: [number, number, number]; target: [number, number, number]; fov: number; residual: number } {
  const mpu = subject.hero?.metersPerUnit ?? 1;
  const b = subject.hero?.bounds ?? { min: [-subject.size[0] / 2, 0, -subject.size[2] / 2], max: [subject.size[0] / 2, subject.size[1], subject.size[2] / 2] };
  const center = [(b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, (b.min[2] + b.max[2]) / 2];
  const a = rad(view.azimuth), e = rad(Math.max(-89, Math.min(89.5, view.elevation)));
  const forward = [-Math.sin(a) * Math.cos(e), -Math.sin(e), -Math.cos(a) * Math.cos(e)];
  const right = [Math.cos(a), 0, -Math.sin(a)];
  const up = [right[1] * forward[2] - right[2] * forward[1], right[2] * forward[0] - right[0] * forward[2], right[0] * forward[1] - right[1] * forward[0]];
  const dot = (u: number[], v: number[]) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
  const W = slot.rect.width, H = slot.rect.height, f = 1 / Math.tan(rad(fov) / 2);
  const corners: number[][] = [];
  for (const x of [b.min[0], b.max[0]]) for (const y of [b.min[1], b.max[1]]) for (const z of [b.min[2], b.max[2]]) corners.push([x, y, z]);
  const project = (target: number[], distance: number) => {
    const eye = [0, 1, 2].map((k) => target[k] - forward[k] * distance);
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const c of corners) {
      const v = [c[0] - eye[0], c[1] - eye[1], c[2] - eye[2]];
      const z = Math.max(1e-6, dot(v, forward));
      const px = W / 2 + (dot(v, right) / z) * f * (H / 2), py = H / 2 - (dot(v, up) / z) * f * (H / 2);
      x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py);
    }
    return { x0, x1, y0, y1 };
  };
  const worldPerPx = 1 / (slot.pxPerMeter * mpu);
  let distance = (H * worldPerPx) / (2 * Math.tan(rad(fov) / 2));
  let target = center.slice();
  const want = slot.subjectRect;
  for (let iter = 0; iter < 8; iter++) {
    const p = project(target, distance);
    const ph = p.y1 - p.y0, pw = p.x1 - p.x0;
    // Match the larger planned side; size scales ~1/distance.
    const ratio = want.height >= want.width ? ph / Math.max(1e-6, want.height) : pw / Math.max(1e-6, want.width);
    distance *= ratio;
    const q = project(target, distance);
    const ddx = (q.x0 + q.x1) / 2 - (want.x + want.width / 2), ddy = (q.y0 + q.y1) / 2 - (want.y + want.height / 2);
    const k = (distance * Math.tan(rad(fov) / 2) * 2) / H; // world per px at the target plane
    target = [0, 1, 2].map((i) => target[i] + (right[i] * ddx - up[i] * ddy) * k);
  }
  const fin = project(target, distance);
  const residual = Math.max(Math.abs((fin.y1 - fin.y0) - want.height), Math.abs((fin.x1 - fin.x0) - want.width)) / Math.max(1, want.height, want.width);
  const position = [0, 1, 2].map((k) => target[k] - forward[k] * distance) as [number, number, number];
  return { position, target: target as [number, number, number], fov, residual };
}

/** The slot in its own coordinates (rect at 0,0; subjectRect relative to it), as slot renderers and cameras use it. */
export function localSlot(slot: ComparisonSlot): ComparisonSlot {
  return { ...slot, rect: { ...slot.rect, x: 0, y: 0 }, subjectRect: { ...slot.subjectRect, x: slot.subjectRect.x - slot.rect.x, y: slot.subjectRect.y - slot.rect.y } };
}

/** A comparison subject from a built 3D hero asset: size from its authored bounds × metersPerUnit. */
export function subjectFromHero(id: string, label: string, asset: { bounds: { min: readonly number[]; max: readonly number[] }; metersPerUnit: number }, caption?: string): ComparisonSubject {
  const { min, max } = asset.bounds, k = asset.metersPerUnit;
  return { id, label, caption, size: [(max[0] - min[0]) * k, (max[1] - min[1]) * k, (max[2] - min[2]) * k], hero: { bounds: asset.bounds, metersPerUnit: k } };
}
