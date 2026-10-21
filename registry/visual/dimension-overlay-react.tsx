/** SVG renderer for `layoutDimensions` output: dimension and extension lines, architectural
 * ticks, area fills, angle arcs, person/bar references and upright labels on a readable plate.
 * Draw it over a 3D canvas (same viewport size) or inside a 2D SVG.
 */
import { forwardRef } from "react";
import type { SVGProps } from "react";
import type { LaidDimension } from "./dimension-overlay";

export interface DimensionOverlaySvgProps extends Omit<SVGProps<SVGGElement>, "ref"> {
  dimensions: readonly LaidDimension[];
  fontSize?: number;
  fontFamily?: string;
  colors?: Partial<{ line: string; extension: string; text: string; plate: string; area: string; warn: string }>;
}

export const DimensionOverlaySvg = forwardRef<SVGGElement, DimensionOverlaySvgProps>(function DimensionOverlaySvg(
  { dimensions, fontSize = 15, fontFamily = "var(--km-font-sans, Geist, Inter, system-ui, sans-serif)", colors, ...props }, ref) {
  const c = { line: "var(--km-dimension, #f2a33a)", extension: "var(--km-dimension-muted, rgba(242,163,58,.7))", text: "var(--km-ink-inverse, #ffffff)", plate: "rgba(17,20,25,.82)", area: "rgba(242,163,58,.16)", warn: "#ffcc66", ...colors };
  return <g ref={ref} data-km-dimensions="" fontFamily={fontFamily} {...props}>
    {dimensions.filter(d => d.status !== "hidden" && d.progress > 0).map(d => <g key={d.id} data-km-dimension={d.id} data-km-dimension-status={d.status}>
      {d.polygon ? <polygon points={d.polygon.map(p => p.join(",")).join(" ")} fill={c.area} stroke={c.line} strokeWidth={1.5} strokeDasharray="5 4" opacity={Math.min(1, d.progress * 1.5)} /> : null}
      {d.lines.map((l, i) => <line key={i} x1={l.a[0]} y1={l.a[1]} x2={l.b[0]} y2={l.b[1]}
        stroke={l.role === "extension" ? c.extension : c.line} strokeWidth={l.role === "dimension" || l.role === "figure" ? 2 : l.role === "tick" ? 2.2 : 1.2}
        strokeDasharray={l.role === "extension" ? "3 3" : undefined} strokeLinecap="round" />)}
      {d.labels.map(lab => <g key={lab.id} opacity={lab.opacity}>
        {lab.leader ? <polyline points={lab.leader.map(p => p.join(",")).join(" ")} fill="none" stroke={c.extension} strokeWidth={1.2} /> : null}
        <g transform={`translate(${lab.x} ${lab.y}) rotate(${lab.angle * 180 / Math.PI})`}>
          <rect x={-lab.width / 2} y={-lab.height / 2} width={lab.width} height={lab.height} rx={5} fill={c.plate} />
          <text x={0} y={fontSize * .36} textAnchor="middle" fontSize={fontSize} fontWeight={600} fill={d.status === "foreshortened" ? c.warn : c.text} style={{ fontVariantNumeric: "tabular-nums" }}>{lab.text}</text>
        </g>
      </g>)}
    </g>)}
  </g>;
});
