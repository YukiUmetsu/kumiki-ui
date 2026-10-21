/** `ComparisonStageView` — draws a `ComparisonStagePlan`: slot content (2D or 3D) at
 * the planned rects, plus labels, measurements, ground lines, scale bars and the
 * scale-policy caption as real text. The design-px stage scales to its container.
 */
import { forwardRef, useEffect, useRef, useState } from "react";
import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { localSlot } from "./comparison-stage";
import type { ComparisonSlot, ComparisonStagePlan } from "./comparison-stage";

export interface ComparisonStageViewProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  plan: ComparisonStagePlan;
  /** Design-px size the plan was laid out for. */
  width: number;
  height: number;
  /** Content for a slot, drawn inside `slot.rect`. The slot passed here is slot-local: `rect` starts at 0,0 and `subjectRect` is relative to it. */
  renderSlot: (slot: ComparisonSlot) => ReactNode;
  /** Semantic colors (defaults use Kumiki CSS variables with fallbacks). */
  colors?: Partial<{ ink: string; sub: string; rule: string; accent: string; warn: string; background: string }>;
  fontFamily?: string;
  /** Multiplies the default type sizes (label 22, measure 16, caption 15 design px). */
  typeScale?: number;
}

export const ComparisonStageView = forwardRef<HTMLDivElement, ComparisonStageViewProps>(function ComparisonStageView(
  { plan, width, height, renderSlot, colors, fontFamily = "var(--km-font-sans, Geist, Inter, system-ui, sans-serif)", typeScale = 1, style, ...rest }, ref) {
  const c = { ink: "var(--km-ink, #1a1d22)", sub: "var(--km-ink-muted, #5b6470)", rule: "var(--km-rule, #9aa3ad)", accent: "var(--km-accent, #2b59d1)", warn: "var(--km-warning, #b7791f)", background: "var(--km-surface, #f7f8fa)", ...colors };
  const outer = useRef<HTMLDivElement | null>(null);
  const [k, setK] = useState(1);
  useEffect(() => {
    const el = outer.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([entry]) => setK(Math.max(0.05, entry.contentRect.width / width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [width]);
  const t = (px: number) => px * typeScale;
  const box = (r: { x: number; y: number; width: number; height: number }): CSSProperties => ({ position: "absolute", left: r.x, top: r.y, width: r.width, height: r.height });
  return <div ref={node => { outer.current = node; if (typeof ref === "function") ref(node); else if (ref) ref.current = node; }}
    data-km-comparison-stage={plan.id} data-km-comparison-scale={plan.scale} role="group" aria-label={`Comparison: ${plan.slots.map(s => s.label).join(" vs ")}. ${plan.caption}`}
    style={{ position: "relative", width: "100%", aspectRatio: `${width} / ${height}`, overflow: "hidden", background: c.background, ...style }} {...rest}>
    <div style={{ position: "absolute", left: 0, top: 0, width, height, transform: `scale(${k})`, transformOrigin: "0 0", fontFamily, color: c.ink }}>
      {plan.slots.map(slot => <div key={slot.id} data-km-comparison-slot={slot.id} style={box(slot.rect)}>
        <div style={{ position: "absolute", inset: 0 }}>{renderSlot(localSlot(slot))}</div>
        {plan.notToScale ? <span style={{ position: "absolute", right: 8, top: 8, padding: "3px 8px", borderRadius: 999, fontSize: t(13), fontWeight: 600, color: c.warn, border: `1px solid ${c.warn}`, background: c.background }}>{`not to scale · ×${slot.relativeScale.toFixed(2)}`}</span> : null}
      </div>)}
      <svg width={width} height={height} style={{ position: "absolute", inset: 0, pointerEvents: "none" }} aria-hidden>
        {plan.groundLines.map((g, i) => plan.scale === "equal"
          ? <line key={i} x1={g.x0} x2={g.x1} y1={g.y} y2={g.y} stroke={c.rule} strokeWidth={1.5} strokeDasharray="6 5" />
          : null)}
        {plan.scaleBars.map((b, i) => <g key={i} transform={`translate(${b.x} ${b.y})`}>
          {b.slotId ? <rect x={-6} y={-2} width={b.px + 22 + b.label.length * t(15) * .58} height={24} rx={6} fill={c.background} opacity={.88} /> : null}
          <line x1={0} x2={b.px} y1={10} y2={10} stroke={c.ink} strokeWidth={2.5} />
          <line x1={0} x2={0} y1={4} y2={16} stroke={c.ink} strokeWidth={2} /><line x1={b.px} x2={b.px} y1={4} y2={16} stroke={c.ink} strokeWidth={2} />
          <text x={b.px + 10} y={15} fontSize={t(15)} fill={c.ink} fontFamily={fontFamily}>{b.label}</text>
        </g>)}
      </svg>
      {plan.slots.map(slot => <div key={slot.id} style={{ ...box(slot.labelRect), textAlign: "center", lineHeight: 1.25 }}>
        <div style={{ fontSize: t(22), fontWeight: 650 }}>{slot.label}</div>
        {slot.measurement ? <div style={{ fontSize: t(16), color: c.sub, fontVariantNumeric: "tabular-nums" }}>{slot.measurement}</div> : null}
        {slot.caption ? <div style={{ fontSize: t(14), color: c.sub }}>{slot.caption}</div> : null}
      </div>)}
      <div style={{ position: "absolute", top: plan.captionRect.y, left: plan.captionRect.x + (plan.scale === "equal" && plan.scaleBars[0] ? plan.scaleBars[0].px + 96 : 0), right: width - plan.captionRect.x - plan.captionRect.width,
        fontSize: t(15), lineHeight: 1.3, color: plan.notToScale ? c.warn : c.sub }}>{plan.caption}</div>
    </div>
  </div>;
});
