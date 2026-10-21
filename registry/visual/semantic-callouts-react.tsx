/** SVG overlay for a `CalloutLayout`: leaders, anchor dots and measured label boxes.
 * Draws exactly the lines the layout measured (no reflow, no foreignObject), so
 * the rendered text cannot disagree with collision checks. Theme via tokens.
 */
import { forwardRef } from "react";
import type { SVGProps } from "react";
import type { CalloutLayout } from "./semantic-callouts";

export interface CalloutTheme { surface: string; border: string; ink: string; muted: string; leader: string; dot: string; radius: number }
export interface SemanticCalloutOverlayProps extends Omit<SVGProps<SVGSVGElement>, "ref"> {
  layout: CalloutLayout;
  width: number;
  height: number;
  theme?: Partial<CalloutTheme>;
}

export const SemanticCalloutOverlay = forwardRef<SVGSVGElement, SemanticCalloutOverlayProps>(function SemanticCalloutOverlay({ layout, width, height, theme, style, ...props }, ref) {
  const t: CalloutTheme = {
    surface: "var(--km-surface-elevated, rgba(255,255,255,.94))", border: "var(--km-border-subtle, rgba(20,30,40,.14))",
    ink: "var(--km-text-primary, #17212b)", muted: "var(--km-text-secondary, #4c5a68)", leader: "var(--km-text-primary, #17212b)",
    dot: "var(--km-accent, #1f7a6a)", radius: 10, ...theme,
  };
  return <svg ref={ref} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" data-km-callouts=""
    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", overflow: "visible", ...style }} {...props}>
    {layout.callouts.map(c => {
      if (c.status !== "visible" || !c.box || !c.anchor || !c.leader) return null;
      const m = c.metrics, b = c.box;
      let y = b.y + m.paddingY;
      const lines = [
        ...c.title.map(text => { const line = { text, font: m.titleFont, color: t.ink, y: y + m.titleLineHeight * .5 }; y += m.titleLineHeight; return line; }),
        ...c.detail.map(text => { const line = { text, font: m.detailFont, color: t.muted, y: y + m.detailLineHeight * .5 }; y += m.detailLineHeight; return line; }),
      ];
      return <g key={c.id} data-km-callout={c.id} data-km-callout-side={c.side} opacity={c.opacity}>
        <polyline points={c.leader.map(p => p.join(",")).join(" ")} fill="none" stroke={t.leader} strokeOpacity={.7} strokeWidth={1.5} />
        <circle cx={c.anchor.x} cy={c.anchor.y} r={4.5} fill={t.dot} stroke={t.surface} strokeWidth={2} />
        <rect x={b.x} y={b.y} width={b.width} height={b.height} rx={t.radius} fill={t.surface} stroke={t.border} />
        {lines.map((l, i) => <text key={i} x={b.x + m.paddingX} y={l.y} dominantBaseline="central" style={{ font: l.font }} fill={l.color}>{l.text}</text>)}
      </g>;
    })}
  </svg>;
});
