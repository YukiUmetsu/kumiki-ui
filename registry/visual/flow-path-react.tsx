/** SVG renderer for a 2D `FlowPathFrame`: track, arrows, streaks, particles, ribbon or pulse.
 * Purely presentational: every position comes from the evaluated frame, so the
 * drawing is identical for any seek order. Colors are props (semantic tokens by default).
 */
import { forwardRef } from "react";
import type { SVGProps } from "react";
import type { FlowPathFrame } from "./flow-path";

export interface FlowPathSvgProps extends Omit<SVGProps<SVGGElement>, "ref"> {
  frame: FlowPathFrame;
  color?: string;
  /** Track stroke width (path units). */
  width?: number;
  /** Base track opacity (0 hides the track). */
  trackOpacity?: number;
  /** Marker size (path units). */
  size?: number;
}

const d = (pts: readonly (readonly number[])[]) => pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(" ");

export const FlowPathSvg = forwardRef<SVGGElement, FlowPathSvgProps>(function FlowPathSvg({ frame, color = "var(--km-accent, #2f8fd8)", width = 4, trackOpacity = .28, size = 8, ...props }, ref) {
  if (frame.dimension !== 2) throw new Error("FlowPathSvg renders 2D flow frames only.");
  if (!frame.opacity) return null;
  const [a, b] = frame.drawnRange;
  const dash = `${(b - a).toFixed(2)} ${(frame.length + 1).toFixed(2)}`;
  const offset = (-a).toFixed(2);
  const track = d(frame.points);
  return <g ref={ref} data-km-flow={frame.id} data-km-flow-style={frame.style} data-km-flow-semantics={frame.semantics} opacity={frame.opacity} {...props}>
    {trackOpacity > 0 ? <path d={track} fill="none" stroke={color} strokeOpacity={trackOpacity} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={dash} strokeDashoffset={offset} /> : null}
    {frame.style === "ribbon" ? <path d={track} fill="none" stroke={color} strokeWidth={width * .62} strokeLinecap="round" strokeLinejoin="round"
      strokeDasharray={`${size * 1.4} ${size * 1.2}`} strokeDashoffset={(frame.direction === "reverse" ? 1 : -1) * frame.phase} opacity={.95} /> : null}
    {frame.segments.map((s, i) => <g key={i} opacity={s.opacity}>
      {frame.style === "pulse" ? <path d={d(s.points)} fill="none" stroke={color} strokeOpacity={.35} strokeWidth={width * 2.6} strokeLinecap="round" strokeLinejoin="round" /> : null}
      <path d={d(s.points)} fill="none" stroke={color} strokeWidth={frame.style === "pulse" ? width * 1.2 : width * .7} strokeLinecap="round" strokeLinejoin="round" />
    </g>)}
    {frame.markers.map(m => {
      const [x, y] = m.position, angle = Math.atan2(m.tangent[1], m.tangent[0]) * 180 / Math.PI;
      if (frame.style === "particles") return <circle key={m.id} cx={x} cy={y} r={size * .42} fill={color} opacity={m.opacity} />;
      if (frame.style === "arrows") return <path key={m.id} d={`M${-size * .55} ${-size * .6} L${size * .55} 0 L${-size * .55} ${size * .6} L${-size * .2} 0 Z`}
        transform={`translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${angle.toFixed(2)})`} fill={color} opacity={m.opacity} />;
      if (frame.style === "pulse") return <circle key={m.id} cx={x} cy={y} r={size * .55} fill={color} opacity={m.opacity} />;
      return null;
    })}
  </g>;
});
