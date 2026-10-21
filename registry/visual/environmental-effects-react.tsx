/** SVG renderer for `EnvironmentalEffects` frames through any 2D projection (sections, plans,
 * diagrams): rain as short strokes, snow and dust as dots, drips and condensation as droplets,
 * stains as a projected patch.
 */
import { forwardRef } from "react";
import type { SVGProps } from "react";
import type { EffectFrame } from "./environmental-effects";

export interface EnvironmentalEffectsSvgProps extends Omit<SVGProps<SVGGElement>, "ref"> {
  frames: readonly EffectFrame[];
  /** World → SVG point. */
  project: (p: readonly number[]) => readonly [number, number];
  /** SVG units per asset unit (for particle sizes). */
  unitScale: number;
  colors?: Partial<Record<EffectFrame["kind"], string>>;
  /** Minimum drop radius in SVG units, so drips stay legible at small scales. @default 3.5 */
  minDrop?: number;
}

const COLORS: Record<EffectFrame["kind"], string> = { rain: "#7da7c9", snow: "#ffffff", dust: "#c9b48a", drips: "#3f8fd2", condensation: "#78b6e6", stain: "#6b5136" };

export const EnvironmentalEffectsSvg = forwardRef<SVGGElement, EnvironmentalEffectsSvgProps>(function EnvironmentalEffectsSvg({ frames, project, unitScale, colors, minDrop = 3.5, ...props }, ref) {
  const c = { ...COLORS, ...colors };
  return <g ref={ref} data-km-effects="" pointerEvents="none" {...props}>
    {frames.filter(f => f.opacity > 0.01).map(f => {
      const col = c[f.kind];
      if (f.kind === "stain" && f.stain) {
        const { center, radius, surface } = f.stain;
        const pts = Array.from({ length: 28 }, (_, i) => {
          const a = (i / 28) * Math.PI * 2, r = radius * (1 + Math.sin(a * 5) * .06);
          return project([0, 1, 2].map(k => center[k] + surface.u[k] * Math.cos(a) * r + surface.v[k] * Math.sin(a) * r));
        });
        if (radius <= 1e-3) return null;
        const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
        const bw = Math.max(...xs) - Math.min(...xs), bh = Math.max(...ys) - Math.min(...ys);
        // Seen edge-on (e.g. a ceiling in a section): a soaked band along the surface instead of a zero-area patch.
        if (Math.min(bw, bh) < 3) {
          const horizontal = bw >= bh, a0 = horizontal ? [Math.min(...xs), ys[0]] : [xs[0], Math.min(...ys)], a1 = horizontal ? [Math.max(...xs), ys[0]] : [xs[0], Math.max(...ys)];
          return <g key={f.id} data-km-effect={f.id} opacity={f.opacity}>
            <line x1={a0[0]} y1={a0[1]} x2={a1[0]} y2={a1[1]} stroke={col} strokeOpacity={.35} strokeWidth={14} strokeLinecap="round" />
            <line x1={a0[0]} y1={a0[1]} x2={a1[0]} y2={a1[1]} stroke={col} strokeOpacity={.85} strokeWidth={5} strokeLinecap="round" />
          </g>;
        }
        return <polygon key={f.id} data-km-effect={f.id} points={pts.map(p => p.join(",")).join(" ")} fill={col} fillOpacity={.55 * f.opacity} stroke={col} strokeOpacity={.8 * f.opacity} strokeWidth={1.5} />;
      }
      const items = [];
      for (let i = 0; i < f.count; i++) {
        const a = f.alphas[i] * f.opacity;
        if (a < .02 || f.sizes[i] <= 0) continue;
        const p = [f.positions[i * 3], f.positions[i * 3 + 1], f.positions[i * 3 + 2]], [x, y] = project(p);
        if (f.kind === "rain" && f.tails) {
          const [x2, y2] = project([p[0] + f.tails[i * 3], p[1] + f.tails[i * 3 + 1], p[2] + f.tails[i * 3 + 2]]);
          items.push(<line key={i} x1={x} y1={y} x2={x2} y2={y2} stroke={col} strokeOpacity={a} strokeWidth={1} />);
        } else if (f.kind === "drips") {
          // Drops are drawn at a legible minimum size (illustrative), elongated while falling.
          const r = Math.max(minDrop, f.sizes[i] * unitScale);
          items.push(<ellipse key={i} cx={x} cy={y} rx={r} ry={r * (f.tails?.[i] ?? 1)} fill={col} fillOpacity={a} />);
        } else items.push(<circle key={i} cx={x} cy={y} r={Math.max(f.kind === "condensation" ? minDrop * .6 : .8, f.sizes[i] * unitScale)} fill={col} fillOpacity={a} />);
      }
      return <g key={f.id} data-km-effect={f.id}>{items}</g>;
    })}
  </g>;
});
