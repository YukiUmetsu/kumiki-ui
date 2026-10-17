import { forwardRef, useId, useMemo } from "react";
import type { CSSProperties, HTMLAttributes } from "react";

import { baselineOffset } from "./measure";
import { round } from "./primitives";
import type {
  DashPattern,
  EllipsePrimitive,
  InfographicLayout,
  InfographicPrimitive,
  LinePrimitive,
  PathPrimitive,
  PolylinePrimitive,
  RectPrimitive,
  TextPrimitive,
} from "./types";

function joinClasses(...values: Array<string | undefined | false>): string {
  return values.filter(Boolean).join(" ");
}

/**
 * Convert a dash token into an SVG stroke-dasharray value.
 *
 * The dashes scale with the stroke width so that a hairline rule and a heavy
 * connector read as the same rhythm instead of a dense/loose mismatch. This is
 * intentionally the same rule as the static exporter so preview and export
 * cannot drift apart.
 */
function dashArray(dash: DashPattern | undefined, strokeWidth: number): string | undefined {
  const width = Math.max(strokeWidth, 0.5);
  if (dash === undefined || dash === "solid") return undefined;
  if (dash === "dotted") return `${round(width * 1.4)} ${round(width * 2)}`;
  return `${round(width * 5)} ${round(width * 3)}`;
}

/** Shared paint attributes for stroked primitives. */
function strokeProps(
  primitive: { stroke?: string; strokeWidth?: number; dash?: DashPattern; opacity?: number },
): Record<string, string | number | undefined> {
  const width = primitive.strokeWidth ?? 1;
  return {
    stroke: primitive.stroke ?? "none",
    strokeWidth: width,
    strokeDasharray: dashArray(primitive.dash, width),
    strokeLinecap: primitive.dash === "dotted" ? "round" : "butt",
    opacity: primitive.opacity,
  };
}

function RectShape({ primitive }: { primitive: RectPrimitive }) {
  return (
    <rect
      x={primitive.x}
      y={primitive.y}
      width={Math.max(primitive.width, 0)}
      height={Math.max(primitive.height, 0)}
      rx={primitive.radius}
      ry={primitive.radius}
      fill={primitive.fill ?? "none"}
      {...strokeProps(primitive)}
    />
  );
}

function EllipseShape({ primitive }: { primitive: EllipsePrimitive }) {
  return (
    <ellipse
      cx={primitive.x + primitive.width / 2}
      cy={primitive.y + primitive.height / 2}
      rx={Math.max(primitive.width / 2, 0)}
      ry={Math.max(primitive.height / 2, 0)}
      fill={primitive.fill ?? "none"}
      {...strokeProps(primitive)}
    />
  );
}

function LineShape({ primitive }: { primitive: LinePrimitive }) {
  return (
    <line
      x1={primitive.x1}
      y1={primitive.y1}
      x2={primitive.x2}
      y2={primitive.y2}
      fill="none"
      {...strokeProps({
        stroke: primitive.stroke,
        strokeWidth: primitive.strokeWidth,
        dash: primitive.dash,
        opacity: primitive.opacity,
      })}
    />
  );
}

function PolylineShape({ primitive }: { primitive: PolylinePrimitive }) {
  const points = primitive.points.map(([x, y]) => `${x},${y}`).join(" ");
  return (
    <polyline
      points={points}
      fill={primitive.fill ?? "none"}
      {...strokeProps({
        stroke: primitive.stroke,
        strokeWidth: primitive.strokeWidth,
        dash: primitive.dash,
        opacity: primitive.opacity,
      })}
    />
  );
}

function PathShape({ primitive }: { primitive: PathPrimitive }) {
  return (
    <path
      d={primitive.d}
      fill={primitive.fill ?? "none"}
      {...strokeProps({
        stroke: primitive.stroke,
        strokeWidth: primitive.strokeWidth,
        dash: primitive.dash,
        opacity: primitive.opacity,
      })}
    />
  );
}

function TextShape({ primitive }: { primitive: TextPrimitive }) {
  const anchor = primitive.align === "center" ? "middle" : primitive.align === "end" ? "end" : "start";
  const x = primitive.align === "center" ? primitive.x + primitive.width / 2 : primitive.align === "end" ? primitive.x + primitive.width : primitive.x;
  return (
    <text
      x={x}
      y={primitive.y}
      fill={primitive.color}
      fontFamily={primitive.family}
      fontSize={primitive.fontSize}
      fontWeight={primitive.weight}
      fontStyle={primitive.italic ? "italic" : undefined}
      letterSpacing={primitive.letterSpacing}
      textAnchor={anchor}
      opacity={primitive.opacity}
      style={{ whiteSpace: "pre" }}
    >
      {primitive.lines.map((line, index) => (
        <tspan
          key={`line-${index}`}
          x={x}
          y={round(primitive.y + baselineOffset(index, primitive.fontSize, primitive.lineHeight))}
        >
          {line}
        </tspan>
      ))}
    </text>
  );
}

/**
 * Render a single infographic primitive as SVG.
 *
 * Kept structurally parallel to the static exporter so that the on-screen
 * preview and the exported file cannot render different geometry. Any primitive
 * kind added to the IR must be handled here as well.
 */
export function PrimitiveShape({ primitive }: { primitive: InfographicPrimitive }) {
  switch (primitive.kind) {
    case "rect":
      return <RectShape primitive={primitive} />;
    case "ellipse":
      return <EllipseShape primitive={primitive} />;
    case "line":
      return <LineShape primitive={primitive} />;
    case "polyline":
      return <PolylineShape primitive={primitive} />;
    case "path":
      return <PathShape primitive={primitive} />;
    case "text":
      return <TextShape primitive={primitive} />;
    default:
      return null;
  }
}

export type InfographicFit = "none" | "contain" | "width";

export interface InfographicViewProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /**
   * The resolved layout produced by `buildInfographic`. Rendering takes a
   * layout rather than a source so that authors can inspect and diff exactly
   * what was laid out instead of silently re-solving during render.
   */
  layout: InfographicLayout;
  /** `contain` scales the artboard to the container, `width` fills the width, `none` uses design pixels. @default "contain" */
  fit?: InfographicFit;
  /** Additional multiplier applied on top of `fit`. @default 1 */
  zoom?: number;
  /** Render the accessible title/description. @default true */
  accessible?: boolean;
  /** Draw the artboard background rectangle. @default true */
  includeBackground?: boolean;
}

/**
 * Deterministic, dependency-free preview of an infographic layout.
 *
 * The component is a thin renderer: it owns no layout logic, no measurement and
 * no art direction. Everything it draws comes from the layout document, which is
 * what makes the preview safe to use inside a composition, a print sheet or an
 * export pipeline without visual drift.
 */
export const InfographicView = forwardRef<HTMLDivElement, InfographicViewProps>(function InfographicView(
  { layout, fit = "contain", zoom = 1, accessible = true, includeBackground = true, className, style, ...rest },
  ref,
) {
  const generatedId = useId();
  const titleId = `${generatedId}-title`;
  const descId = `${generatedId}-desc`;

  const primitives = useMemo(() => {
    if (includeBackground) return layout.primitives;
    return layout.primitives.filter((primitive) => !(primitive.kind === "rect" && primitive.role === "infographic-background"));
  }, [includeBackground, layout.primitives]);

  // `layout.summary` already carries the page marker for paginated profiles, so
  // it is used verbatim as the description rather than re-assembled here.
  const description = layout.summary;

  const widthAttr = fit === "none" ? round(layout.canvas.width * zoom) : "100%";
  const heightAttr = fit === "none" ? round(layout.canvas.height * zoom) : "auto";

  const containerStyle: CSSProperties = {
    ...style,
  };

  return (
    <div
      ref={ref}
      data-km-infographic="view"
      data-km-infographic-fit={fit}
      data-km-infographic-zoom={zoom}
      className={joinClasses(
        "relative w-full",
        fit === "none" ? "overflow-auto" : "overflow-hidden",
        className,
      )}
      style={containerStyle}
      {...rest}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-labelledby={accessible ? `${titleId} ${descId}` : undefined}
        aria-hidden={accessible ? undefined : true}
        viewBox={`0 0 ${layout.canvas.width} ${layout.canvas.height}`}
        preserveAspectRatio="xMidYMid meet"
        width={widthAttr}
        height={heightAttr}
        style={{
          display: "block",
          width: fit === "none" ? round(layout.canvas.width * zoom) : `${round(zoom * 100)}%`,
          height: "auto",
          background: includeBackground ? undefined : layout.canvas.background,
        }}
        data-km-infographic-template={layout.template}
        data-km-infographic-art-direction={layout.artDirection}
      >
        {accessible ? (
          <>
            <title id={titleId}>{layout.metadata?.title ?? layout.sourceId}</title>
            <desc id={descId}>{description}</desc>
          </>
        ) : null}
        {primitives.map((primitive) => (
          <g
            key={primitive.id}
            id={primitive.id}
            data-km-primitive={primitive.kind}
            data-km-role={primitive.role}
            data-km-semantic-id={primitive.semanticId}
          >
            <PrimitiveShape primitive={primitive} />
          </g>
        ))}
      </svg>
    </div>
  );
});

InfographicView.displayName = "InfographicView";

export default InfographicView;
