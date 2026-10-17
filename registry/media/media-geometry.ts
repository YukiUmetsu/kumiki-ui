/**
 * Pure geometry for the Kumiki media foundation: rectangles, artboard aspect
 * presets, safe regions, snapping and authoring viewport math.
 *
 * Coordinate system: artboard **design pixels**, origin top-left, `+x` right and
 * `+y` down (see docs/07 media foundation, "Coordinates"). Layout decisions are
 * made in design pixels; display scaling is applied afterwards and must never
 * change them.
 *
 * Every function is pure and returns new objects — nothing mutates its inputs —
 * so a document can be evaluated repeatedly and in any order without changing
 * the result.
 */

/** Width/height pair in design pixels. */
export interface Size {
  width: number;
  height: number;
}

/** A point in design pixels. */
export interface Point {
  x: number;
  y: number;
}

/** Axis-aligned rectangle: top-left origin plus size, in design pixels. */
export interface Rect extends Size {
  x: number;
  y: number;
}

/** Per-side insets in design pixels. */
export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** A single alignment guide in artboard space. */
export interface GuideLine {
  /** `x` is a vertical guide (a constant x); `y` is horizontal. */
  axis: "x" | "y";
  /** Position along the axis, in design pixels. */
  position: number;
  /** Where the guide came from. */
  kind: "edge" | "center" | "grid" | "safe";
}

/** Result of snapping one scalar to a set of candidate positions. */
export interface SnapResult {
  /** The possibly-adjusted value. */
  value: number;
  /** The guide that captured the value, when a target was within threshold. */
  guide?: GuideLine;
}

/** Result of snapping a whole rectangle on both axes. */
export interface RectSnapResult {
  rect: Rect;
  guides: GuideLine[];
}

/**
 * A named output aspect ratio. Dimensions are the default authoring size for the
 * ratio; the *ratio* is what responsive reflow keys on, not the pixel size.
 */
export interface AspectPreset {
  /** Stable id, also the aspect label, e.g. `"16:9"`. */
  id: string;
  /** Reference width in design pixels. */
  width: number;
  /** Reference height in design pixels. */
  height: number;
  /** width / height. */
  ratio: number;
}

/**
 * Reflow keys used when one document is authored for several aspects (see
 * `Layer.layouts`). These are neutral identifiers, not platform names.
 */
export const ASPECT_PRESETS: Record<string, AspectPreset> = {
  "16:9": { id: "16:9", width: 1280, height: 720, ratio: 16 / 9 },
  "9:16": { id: "9:16", width: 1080, height: 1920, ratio: 9 / 16 },
  "1:1": { id: "1:1", width: 1080, height: 1080, ratio: 1 },
  "4:5": { id: "4:5", width: 1080, height: 1350, ratio: 4 / 5 },
  "3:2": { id: "3:2", width: 1500, height: 1000, ratio: 3 / 2 },
  "2:3": { id: "2:3", width: 1000, height: 1500, ratio: 2 / 3 },
};

/** Aspect-preset id, one of the keys of {@link ASPECT_PRESETS}. */
export type AspectPresetId = keyof typeof ASPECT_PRESETS;

/** Look up a preset by id. Returns `undefined` for an unknown id. */
export function getAspectPreset(id: string): AspectPreset | undefined {
  return Object.prototype.hasOwnProperty.call(ASPECT_PRESETS, id)
    ? ASPECT_PRESETS[id]
    : undefined;
}

/**
 * Find the preset whose ratio matches `ratio` within `tolerance` (relative).
 * Used to label an arbitrary authoring canvas with its nearest aspect id.
 */
export function matchAspectPreset(ratio: number, tolerance = 0.01): AspectPreset | undefined {
  let best: AspectPreset | undefined;
  let bestDelta = Number.POSITIVE_INFINITY;
  for (const preset of Object.values(ASPECT_PRESETS)) {
    const delta = Math.abs(preset.ratio - ratio) / preset.ratio;
    if (delta <= tolerance && delta < bestDelta) {
      best = preset;
      bestDelta = delta;
    }
  }
  return best;
}

/** The artboard rectangle for a size: origin at `(0, 0)`. */
export function rectOf(size: Size): Rect {
  return { x: 0, y: 0, width: size.width, height: size.height };
}

/** Clamp `value` into `[min, max]`. Returns `min` when the range is empty. */
export function clamp(value: number, min: number, max: number): number {
  if (max < min) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/** Clamp `value` into `[0, 1]`. */
export function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

/** True when every field of `rect` is a finite number. */
export function isFiniteRect(rect: Rect): boolean {
  return (
    Number.isFinite(rect.x) &&
    Number.isFinite(rect.y) &&
    Number.isFinite(rect.width) &&
    Number.isFinite(rect.height)
  );
}

/** True when `rect` has a positive width and height. */
export function isPositiveRect(rect: Rect): boolean {
  return isFiniteRect(rect) && rect.width > 0 && rect.height > 0;
}

/** Translate a rectangle without changing its size. */
export function translateRect(rect: Rect, dx: number, dy: number): Rect {
  return { x: rect.x + dx, y: rect.y + dy, width: rect.width, height: rect.height };
}

/** Scale a rectangle about its own top-left corner. */
export function scaleRect(rect: Rect, factor: number): Rect {
  return {
    x: rect.x,
    y: rect.y,
    width: rect.width * factor,
    height: rect.height * factor,
  };
}

/** Scale a rectangle about an explicit anchor point. */
export function scaleRectAbout(rect: Rect, anchor: Point, factor: number): Rect {
  return {
    x: anchor.x + (rect.x - anchor.x) * factor,
    y: anchor.y + (rect.y - anchor.y) * factor,
    width: rect.width * factor,
    height: rect.height * factor,
  };
}

/** Center point of a rectangle. */
export function centerOf(rect: Rect): Point {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

/** The four corners of a rectangle, clockwise from top-left. */
export function cornersOf(rect: Rect): [Point, Point, Point, Point] {
  return [
    { x: rect.x, y: rect.y },
    { x: rect.x + rect.width, y: rect.y },
    { x: rect.x + rect.width, y: rect.y + rect.height },
    { x: rect.x, y: rect.y + rect.height },
  ];
}

/** True when `point` lies inside `rect` (edges inclusive). */
export function containsPoint(rect: Rect, point: Point): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

/** Shrink a rectangle by per-side insets. Insets larger than the rect are clamped. */
export function insetRect(rect: Rect, insets: Insets): Rect {
  const left = clamp(insets.left, 0, rect.width);
  const right = clamp(insets.right, 0, rect.width - left);
  const top = clamp(insets.top, 0, rect.height);
  const bottom = clamp(insets.bottom, 0, rect.height - top);
  return {
    x: rect.x + left,
    y: rect.y + top,
    width: rect.width - left - right,
    height: rect.height - top - bottom,
  };
}

/** Grow a rectangle by per-side insets (negative insets shrink). */
export function outsetRect(rect: Rect, insets: Insets): Rect {
  return {
    x: rect.x - insets.left,
    y: rect.y - insets.top,
    width: rect.width + insets.left + insets.right,
    height: rect.height + insets.top + insets.bottom,
  };
}

/** True when two rectangles share any area (touching edges count as overlap). */
export function rectsIntersect(a: Rect, b: Rect): boolean {
  return (
    a.x <= b.x + b.width &&
    b.x <= a.x + a.width &&
    a.y <= b.y + b.height &&
    b.y <= a.y + a.height
  );
}

/** Overlapping area of two rectangles; `0` when they do not overlap. */
export function intersectionArea(a: Rect, b: Rect): number {
  const width = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const height = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  if (width <= 0 || height <= 0) return 0;
  return width * height;
}

/**
 * Smallest rectangle containing every input. Returns `null` for an empty list,
 * which keeps "no selection" distinct from "empty selection at the origin".
 */
export function boundsOf(rects: readonly Rect[]): Rect | null {
  if (rects.length === 0) return null;
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const rect of rects) {
    if (!isFiniteRect(rect)) continue;
    minX = Math.min(minX, rect.x);
    minY = Math.min(minY, rect.y);
    maxX = Math.max(maxX, rect.x + rect.width);
    maxY = Math.max(maxY, rect.y + rect.height);
  }
  if (!Number.isFinite(minX) || !Number.isFinite(minY)) return null;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/**
 * Area of `rect` that falls outside `bounds` (negative when fully inside).
 * Used by export preview to report accidental cropping.
 */
export function overflowAmount(rect: Rect, bounds: Rect): number {
  const dx = Math.max(bounds.x - rect.x, 0) + Math.max(rect.x + rect.width - (bounds.x + bounds.width), 0);
  const dy = Math.max(bounds.y - rect.y, 0) + Math.max(rect.y + rect.height - (bounds.y + bounds.height), 0);
  return Math.max(dx, dy);
}

/**
 * Round a rectangle's geometry to `precision` decimals, removing float noise
 * before serialization so a round-trip is byte-stable.
 */
export function roundRect(rect: Rect, precision = 3): Rect {
  const factor = 10 ** precision;
  const round = (value: number) => Math.round(value * factor) / factor;
  return {
    x: round(rect.x),
    y: round(rect.y),
    width: round(rect.width),
    height: round(rect.height),
  };
}

/**
 * Snap one scalar to the nearest target within `threshold`. Returns the value
 * unchanged (with no guide) when nothing is close enough.
 */
export function snapValue(value: number, targets: readonly number[], threshold: number): SnapResult {
  let best: number | undefined;
  let bestDelta = threshold;
  for (const target of targets) {
    const delta = Math.abs(target - value);
    if (delta <= bestDelta) {
      best = target;
      bestDelta = delta;
    }
  }
  if (best === undefined) return { value };
  return { value: best, guide: { axis: "x", position: best, kind: "edge" } };
}

/** Snap a scalar onto the nearest multiple of `gridSize`. */
export function snapToGrid(value: number, gridSize: number): number {
  if (!Number.isFinite(gridSize) || gridSize <= 0) return value;
  return Math.round(value / gridSize) * gridSize;
}

/**
 * Snap a moving rectangle to alignment targets on both axes. Each axis checks
 * the rect's leading edge, center and trailing edge against the targets and
 * keeps the smallest adjustment within `threshold`.
 */
export function snapRect(
  rect: Rect,
  targets: { x: readonly number[]; y: readonly number[] },
  threshold: number
): RectSnapResult {
  const guides: GuideLine[] = [];

  const axisSnap = (
    axis: "x" | "y",
    size: number,
    origin: number,
    candidates: readonly number[]
  ): number => {
    const edges: Array<{ offset: number; kind: GuideLine["kind"] }> = [
      { offset: 0, kind: "edge" },
      { offset: size / 2, kind: "center" },
      { offset: size, kind: "edge" },
    ];
    let bestDelta: number | undefined;
    let bestTarget: number | undefined;
    let bestKind: GuideLine["kind"] = "edge";
    for (const edge of edges) {
      const point = origin + edge.offset;
      for (const target of candidates) {
        const delta = target - point;
        if (Math.abs(delta) <= threshold && (bestDelta === undefined || Math.abs(delta) < Math.abs(bestDelta))) {
          bestDelta = delta;
          bestTarget = target;
          bestKind = edge.kind;
        }
      }
    }
    if (bestDelta === undefined || bestTarget === undefined) return origin;
    guides.push({ axis, position: bestTarget, kind: bestKind });
    return origin + bestDelta;
  };

  const x = axisSnap("x", rect.width, rect.x, targets.x);
  const y = axisSnap("y", rect.height, rect.y, targets.y);
  return { rect: { x, y, width: rect.width, height: rect.height }, guides };
}

/** Standard guide targets for an artboard: edges, centers and grid steps. */
export function artboardGuideTargets(size: Size, gridSize?: number): { x: number[]; y: number[] } {
  const x = [0, size.width / 2, size.width];
  const y = [0, size.height / 2, size.height];
  if (gridSize && gridSize > 0) {
    for (let value = gridSize; value < size.width; value += gridSize) x.push(value);
    for (let value = gridSize; value < size.height; value += gridSize) y.push(value);
  }
  return { x, y };
}

/**
 * Safe region for a size: an inset rectangle sized by `insetRatio` of the
 * shorter edge. This is a **configurable heuristic**, not a platform guarantee.
 */
export function safeRegion(size: Size, insetRatio = 0.05): Rect {
  const inset = Math.min(size.width, size.height) * clamp01(insetRatio);
  const insets: Insets = { top: inset, right: inset, bottom: inset, left: inset };
  return insetRect(rectOf(size), insets);
}

/** Symmetric bleed box outside the trim rectangle. */
export function bleedRect(size: Size, bleed: number): Rect {
  const insets: Insets = { top: bleed, right: bleed, bottom: bleed, left: bleed };
  return outsetRect(rectOf(size), insets);
}

/**
 * Make an id safe for use in an SVG `id`/`url(#...)` reference. React's `useId`
 * returns ids containing colons, which are invalid inside a `url()` reference,
 * so every generated `<clipPath>`/`<mask>` id must pass through here. The
 * mapping is deterministic, which keeps markup stable across renders.
 */
export function svgIdSafe(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]/g, "");
}

/** Uniform scale factor that fits `content` inside `viewport`. */
export function fitScale(
  content: Size,
  viewport: Size,
  mode: "contain" | "cover" = "contain"
): number {
  if (content.width <= 0 || content.height <= 0) return 1;
  const sx = viewport.width / content.width;
  const sy = viewport.height / content.height;
  return mode === "cover" ? Math.max(sx, sy) : Math.min(sx, sy);
}

/**
 * Authoring viewport transform for zoom/pan. `translate` is applied in view
 * pixels; `scale` maps design pixels to view pixels.
 */
export interface ViewportTransform {
  scale: number;
  translate: Point;
}

/** A viewport that centers `content` inside `viewport` at `zoom` (1 = fit). */
export function fitViewport(
  content: Size,
  viewport: Size,
  zoom = 1,
  mode: "contain" | "cover" = "contain"
): ViewportTransform {
  const scale = fitScale(content, viewport, mode) * zoom;
  return {
    scale,
    translate: {
      x: (viewport.width - content.width * scale) / 2,
      y: (viewport.height - content.height * scale) / 2,
    },
  };
}

/** Map a point from design space to view space. */
export function viewToPoint(view: ViewportTransform, point: Point): Point {
  return {
    x: point.x * view.scale + view.translate.x,
    y: point.y * view.scale + view.translate.y,
  };
}

/** Map a point from view space back to design space. */
export function pointToView(view: ViewportTransform, point: Point): Point {
  const scale = view.scale === 0 ? 1 : view.scale;
  return {
    x: (point.x - view.translate.x) / scale,
    y: (point.y - view.translate.y) / scale,
  };
}

/** Map a rectangle from design space to view space. */
export function viewToRect(view: ViewportTransform, rect: Rect): Rect {
  const origin = viewToPoint(view, { x: rect.x, y: rect.y });
  return {
    x: origin.x,
    y: origin.y,
    width: rect.width * view.scale,
    height: rect.height * view.scale,
  };
}

/**
 * Object-fit geometry for a `media-frame`: where a source of `source` size is
 * drawn inside a frame of `frame` size. `focalPoint` is normalized `0..1` and
 * only affects `cover`. Source dimensions are never mutated.
 */
export function fitMedia(
  source: Size,
  frame: Size,
  fit: "cover" | "contain" | "fill" | "none",
  focalPoint: Point = { x: 0.5, y: 0.5 }
): { rect: Rect; clipped: boolean } {
  if (fit === "fill") {
    return { rect: rectOf(frame), clipped: false };
  }
  if (fit === "none") {
    const rect: Rect = {
      x: (frame.width - source.width) / 2,
      y: (frame.height - source.height) / 2,
      width: source.width,
      height: source.height,
    };
    return { rect, clipped: source.width > frame.width || source.height > frame.height };
  }
  const scale = fitScale(source, frame, fit);
  const width = source.width * scale;
  const height = source.height * scale;
  const focus = { x: clamp01(focalPoint.x), y: clamp01(focalPoint.y) };
  // `0 * n` yields `-0`; normalize so serialized geometry and equality checks
  // never see a negative zero.
  const zeroed = (value: number) => (value === 0 ? 0 : value);
  const rect: Rect = {
    x: zeroed((frame.width - width) * focus.x),
    y: zeroed((frame.height - height) * focus.y),
    width,
    height,
  };
  const clipped = fit === "cover" && (width > frame.width + 0.001 || height > frame.height + 0.001);
  return { rect, clipped };
}
