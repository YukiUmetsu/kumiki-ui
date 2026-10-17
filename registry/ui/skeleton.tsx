import { forwardRef, useInsertionEffect } from "react";
import type { CSSProperties, HTMLAttributes } from "react";

function joinClasses(...values: Array<string | undefined | false>): string {
  return values.filter(Boolean).join(" ");
}

/** Available placeholder silhouettes. */
export type SkeletonShape = "text" | "rect" | "circle";

const SHIMMER_STYLE_ID = "km-skeleton-styles";

/**
 * The sweep is decorative: the muted fill and dimensions alone communicate the
 * placeholder. The rule is scoped to this component's data attributes and the
 * motion is switched off entirely when the user asks for reduced motion.
 */
const SHIMMER_CSS = `
@keyframes km-skeleton-shimmer {
  from { background-position: 150% 0; }
  to { background-position: -50% 0; }
}

[data-km-skeleton][data-shape="rect"],
[data-km-skeleton][data-shape="circle"],
[data-km-skeleton] [data-part="line"] {
  background-image: linear-gradient(
    90deg,
    transparent 0%,
    var(--km-surface-elevated) 50%,
    transparent 100%
  );
  background-repeat: no-repeat;
  background-size: 200% 100%;
  animation: km-skeleton-shimmer calc(var(--km-duration-long) * 4) var(--km-ease-continuity) infinite;
}

@media (prefers-reduced-motion: reduce) {
  [data-km-skeleton][data-shape="rect"],
  [data-km-skeleton][data-shape="circle"],
  [data-km-skeleton] [data-part="line"] {
    animation: none;
    background-image: none;
  }
}
`;

/**
 * Inject the component-scoped keyframes once per document. Using an insertion
 * effect keeps the component self-contained (no global stylesheet edit) while
 * avoiding an extra `<style>` element per placeholder.
 */
function useShimmerStyles(): void {
  useInsertionEffect(() => {
    if (document.getElementById(SHIMMER_STYLE_ID)) return;
    const node = document.createElement("style");
    node.id = SHIMMER_STYLE_ID;
    node.textContent = SHIMMER_CSS;
    document.head.appendChild(node);
  }, []);
}

// The silhouettes use the track surface token, not `--km-surface-subtle`: in the
// light theme `subtle` sits ~1.08:1 from the default surface and `inset` equals the
// dark canvas, so the placeholder reads as blank in one theme or the other.
// `--km-surface-track` stays perceptible against both the page canvas and a card in
// every theme, and the shimmer highlight (`--km-surface-elevated`) is lighter than it
// in the light theme, so the sweep stays visible instead of disappearing into the surface.
const SHAPE_CLASSES: Record<SkeletonShape, string> = {
  text: "flex w-full flex-col gap-2",
  rect: "h-20 w-full rounded-control bg-track",
  circle: "size-12 rounded-full bg-track",
};

const LINE_CLASSES =
  "h-4 w-full rounded-control bg-track";

function normalizeLineCount(lines: number): number {
  if (!Number.isFinite(lines)) return 1;
  return Math.max(1, Math.floor(lines));
}

/**
 * The box size for a non-text shape. A circle mirrors a single numeric
 * dimension so it never silently turns into an ellipse; rect keeps its other
 * default dimension.
 */
function boxStyle(
  shape: SkeletonShape,
  width: number | string | undefined,
  height: number | string | undefined
): CSSProperties {
  const box: CSSProperties = {};
  if (width != null) box.width = width;
  if (height != null) box.height = height;

  if (shape === "circle") {
    if (width != null && height == null) box.height = width;
    if (height != null && width == null) box.width = height;
  }

  return box;
}

export interface SkeletonProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /**
   * Placeholder silhouette. `text` renders one bar per requested line, `rect`
   * fills the available width at a media-sized height and `circle` renders a
   * round avatar-sized block.
   * @default "text"
   */
  shape?: SkeletonShape;
  /**
   * Explicit width. Numbers are treated as pixels; strings pass through as CSS
   * lengths. For `text`, the width sizes the line container and every bar fills
   * it.
   */
  width?: number | string;
  /**
   * Explicit height. Numbers are treated as pixels; strings pass through as CSS
   * lengths. For `text`, the height applies to each bar.
   */
  height?: number | string;
  /**
   * Number of stacked bars for `shape="text"`. Values below 1 or non-finite
   * values render a single line. Ignored by the other shapes. @default 1
   */
  lines?: number;
  /** Extra classes merged onto the root element. */
  className?: string;
}

/**
 * Decorative loading placeholder with text, rectangle and circle silhouettes.
 *
 * The root is `aria-hidden="true"` so assistive technology never reads an empty
 * box, and there is no focus target, handler or pressed state: a placeholder is
 * honestly inert. Meaning lives in the surrounding loading status or label,
 * never in the shimmer. The sweep is a tokenized CSS animation layered over a
 * `bg-track` fill; under `prefers-reduced-motion: reduce` the sweep is
 * removed and the static placeholder remains fully legible.
 *
 * `width`/`height` accept numbers (pixels) or CSS length strings. A circle with
 * one numeric dimension mirrors it to stay round. `ref`, arbitrary div props and
 * `className` are forwarded to the root.
 */
const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(function Skeleton(
  { shape = "text", width, height, lines = 1, className, style, ...props },
  ref
) {
  useShimmerStyles();

  const isText = shape === "text";
  const lineCount = isText ? normalizeLineCount(lines) : 1;

  const rootStyle: CSSProperties = isText
    ? width != null
      ? { width }
      : {}
    : boxStyle(shape, width, height);

  const lineStyle: CSSProperties | undefined =
    isText && height != null ? { height } : undefined;

  return (
    <div
      ref={ref}
      data-km-skeleton=""
      data-shape={shape}
      data-lines={lineCount}
      aria-hidden="true"
      className={joinClasses(SHAPE_CLASSES[shape], className)}
      style={{ ...rootStyle, ...style }}
      {...props}
    >
      {isText
        ? Array.from({ length: lineCount }, (_, index) => (
            <div
              key={`line-${index}`}
              data-part="line"
              className={LINE_CLASSES}
              style={lineStyle}
            />
          ))
        : null}
    </div>
  );
});

Skeleton.displayName = "Skeleton";

export { Skeleton };
export default Skeleton;
