/** SVG renderer and legend for `ScalarFieldOverlay`.
 * `ScalarFieldSvg` draws the field through any 2D projection as small projected cells (missing
 * samples hatched) with contours; `ScalarFieldLegend` shows the ramp, unit, scale policy and notes.
 */
import { forwardRef, useId } from "react";
import type { HTMLAttributes, SVGProps } from "react";
import { evaluateScalarField, fieldContours, fieldPoint, rampColor, sampleField } from "./scalar-field";
import type { FieldFrame, FieldPlan } from "./scalar-field";

export interface ScalarFieldSvgProps extends Omit<SVGProps<SVGGElement>, "ref"> {
  plan: FieldPlan;
  frame: number;
  project: (p: readonly number[]) => readonly [number, number];
  /** Cells along u (v follows the aspect). @default 56 */
  resolution?: number;
  opacity?: number;
  /** Contour stroke and hatch size in SVG units (scale them for meter-based SVGs). @default 1.4 / 8 */
  contourWidth?: number;
  hatchSize?: number;
}

export const ScalarFieldSvg = forwardRef<SVGGElement, ScalarFieldSvgProps>(function ScalarFieldSvg({ plan, frame, project, resolution = 56, opacity = .82, contourWidth = 1.4, hatchSize = 8, ...props }, ref) {
  const id = useId().replace(/:/g, "");
  const f = evaluateScalarField(plan, frame), sp = plan.spec;
  const nu = resolution, nv = Math.max(4, Math.round(resolution * sp.surface.size[1] / sp.surface.size[0]));
  const cells = [];
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const s0 = i / nu, s1 = (i + 1) / nu, t0 = j / nv, t1 = (j + 1) / nv;
    const v = sampleField(plan, f, (s0 + s1) / 2, (t0 + t1) / 2);
    const pts = [[s0, t0], [s1, t0], [s1, t1], [s0, t1]].map(([s, t]) => project(fieldPoint(sp, s, t)).join(",")).join(" ");
    const fill = v === null ? `url(#${id}-hatch)` : `rgb(${rampColor(sp.ramp, (v - f.domain[0]) / (f.domain[1] - f.domain[0])).join(",")})`;
    cells.push(<polygon key={`${i}-${j}`} points={pts} fill={fill} stroke={fill} strokeWidth={contourWidth * .4} />);
  }
  const contours = (sp.contours ?? []).flatMap((level, li) => fieldContours(plan, f, level).map((seg, k) => {
    const [a, b] = seg.map(([s, t]) => project(fieldPoint(sp, s, t)));
    return <line key={`${li}-${k}`} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="#111418" strokeWidth={contourWidth} strokeOpacity={.8} />;
  }));
  return <g ref={ref} data-km-field={sp.id} {...props}>
    <defs><pattern id={`${id}-hatch`} width={hatchSize} height={hatchSize} patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width={hatchSize} height={hatchSize} fill="#d5d5d5" /><line x1={0} y1={0} x2={0} y2={hatchSize} stroke="#8a8a8a" strokeWidth={hatchSize * .3} /></pattern></defs>
    <g opacity={opacity}>{cells}</g>{contours}
  </g>;
});

export interface ScalarFieldLegendProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> { plan: FieldPlan; frame: number; frameData?: FieldFrame }

export function ScalarFieldLegend({ plan, frame, frameData, style, ...rest }: ScalarFieldLegendProps) {
  const f = frameData ?? evaluateScalarField(plan, frame), sp = plan.spec, [d0, d1] = f.domain;
  const stops = Array.from({ length: 9 }, (_, i) => `rgb(${rampColor(sp.ramp, i / 8).join(",")}) ${i * 12.5}%`).join(", ");
  const ticks = [0, .25, .5, .75, 1].map(t => d0 + (d1 - d0) * t);
  const fmt = (v: number) => (Math.abs(d1 - d0) >= 20 ? Math.round(v) : Math.round(v * 10) / 10).toString();
  return <div role="group" aria-label={`${sp.label} legend, ${fmt(d0)} to ${fmt(d1)} ${sp.unit}`} style={{ display: "grid", gap: 6, fontSize: 13, ...style }} {...rest}>
    <div style={{ fontWeight: 650 }}>{`${sp.label} (${sp.unit})`}{f.label ? <span style={{ fontWeight: 400, opacity: .75 }}>{` · ${f.label}`}</span> : null}</div>
    <div style={{ height: 14, borderRadius: 4, background: `linear-gradient(90deg, ${stops})`, position: "relative" }}>
      {f.clipped.below > 0 ? <span style={{ position: "absolute", left: -14, top: -2 }}>◀</span> : null}
      {f.clipped.above > 0 ? <span style={{ position: "absolute", right: -14, top: -2 }}>▶</span> : null}
    </div>
    <div style={{ display: "flex", justifyContent: "space-between", fontVariantNumeric: "tabular-nums", opacity: .85 }}>{ticks.map((t, i) => <span key={i}>{fmt(t)}</span>)}</div>
    {(sp.bands ?? []).map((b, i) => <div key={i} style={{ opacity: .85 }}>{`${b.above !== undefined ? `≥ ${b.above}` : `≤ ${b.below}`} ${sp.unit}: ${b.label}`}</div>)}
    {f.missing ? <div style={{ display: "flex", gap: 6, alignItems: "center" }}><span style={{ width: 14, height: 10, background: "repeating-linear-gradient(45deg,#8a8a8a 0 2px,#d5d5d5 2px 6px)" }} />No data (not zero)</div> : null}
    <ul style={{ margin: 0, paddingLeft: 16, opacity: .8, fontSize: 12, lineHeight: 1.45 }}>{plan.notes.map((n, i) => <li key={i}>{n}</li>)}</ul>
  </div>;
}
