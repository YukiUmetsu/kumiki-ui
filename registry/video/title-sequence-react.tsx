/** Draws a title sequence at one frame. See `title-sequence.ts` for the timing, the checks and the research. */
import { forwardRef } from "react";
import type { ComponentPropsWithoutRef, CSSProperties } from "react";
import { titleFont, titleFrame, titleLayout } from "./title-sequence";
import type { TitlePlan, TitleText } from "./title-sequence";

export interface TitleSequenceProps extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  plan: TitlePlan;
  frame: number;
  width: number;
  height: number;
  reducedMotion?: boolean;
}
const FONT = "var(--km-font-display, var(--km-font-body, Inter, ui-sans-serif, system-ui, sans-serif))";

export const TitleSequence = forwardRef<HTMLDivElement, TitleSequenceProps>(function TitleSequence({ plan, frame, width, height, reducedMotion = false, style, ...props }, ref) {
  const { content } = plan, state = titleFrame(plan, frame, reducedMotion), { scale, x: ox, y: oy } = titleLayout(content, width, height);
  const ground = content.ground ?? "#efe6d2", u = Math.min(width, height) / 100, uid = `km-title-${(content.label.length * 37 + plan.durationFrames).toString(36)}`;
  const line = (item: TitleText, count: number, isTitle: boolean, key: string) => {
    const words = item.text.split(/\s+/).filter(Boolean), align = item.align ?? "start";
    // Every word is laid out from the start and shown as it lands, so the words already down never move.
    return <div key={key} data-km-title-line={key} {...count < words.length ? { "data-km-text-entering": "" } : {}}
      style={{ position: "absolute", left: ox + item.box.x * scale, top: oy + item.box.y * scale, width: item.box.width * scale, height: item.box.height * scale, display: "flex", alignItems: "center",
        justifyContent: align === "start" ? "flex-start" : align === "middle" ? "center" : "flex-end", textAlign: align === "start" ? "left" : align === "middle" ? "center" : "right",
        font: `${isTitle ? 820 : 620} ${titleFont(item, scale, isTitle)}px/1 ${FONT}`, letterSpacing: isTitle ? "var(--km-title-tracking, .01em)" : ".04em", color: item.color ?? "#1b1a17", whiteSpace: "nowrap" } as CSSProperties}>
      <span>{words.map((word, i) => <span key={i} style={{ visibility: i < count ? "visible" : "hidden" }}>{i ? " " : ""}{word}</span>)}</span>
    </div>;
  };
  return <div {...props} ref={ref} role="img" aria-label={content.label} data-km-title-sequence=""
    style={{ position: "relative", width, height, overflow: "hidden", background: `radial-gradient(130% 110% at 45% 40%, ${ground} 0%, ${ground} 55%, color-mix(in srgb, ${ground} 86%, #5a4a32) 100%)`, ...style }}>
    <svg width={width} height={height} style={{ position: "absolute", inset: 0 }} aria-hidden="true" data-km-illustration-region="art">
      <defs>
        {/* Paper: a fine grain over the ground and every piece, so it reads as cut card on a table, not flat vector. */}
        <filter id={`${uid}-grain`} x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves={2} seed={3} /><feColorMatrix values="0 0 0 0 .3  0 0 0 0 .25  0 0 0 0 .18  0 0 0 .55 0" /></filter>
        <filter id={`${uid}-shadow`} x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation={.45 * u} /></filter>
      </defs>
      {state.pieces.map(({ shape, dx, dy, turn, scale: grow, lifted }) => {
        const cx = shape.points.reduce((sum, p) => sum + p[0], 0) / shape.points.length, cy = shape.points.reduce((sum, p) => sum + p[1], 0) / shape.points.length;
        const points = shape.edge.map(p => `${(p[0] * scale).toFixed(1)},${(p[1] * scale).toFixed(1)}`).join(" ");
        const place = `translate(${ox + dx * scale} ${oy + dy * scale}) rotate(${turn} ${cx * scale} ${cy * scale}) translate(${cx * scale} ${cy * scale}) scale(${grow}) translate(${-cx * scale} ${-cy * scale})`;
        // The shadow falls further while the piece is still in the air.
        const fall = (.35 + 1.4 * lifted) * u;
        return <g key={shape.id} transform={place}>
          <polygon points={points} fill="rgba(52,36,18,.32)" filter={`url(#${uid}-shadow)`} transform={`translate(${fall * .6} ${fall})`} />
          <polygon points={points} fill={shape.color} />
        </g>;
      })}
      <rect width={width} height={height} filter={`url(#${uid}-grain)`} opacity={.35} style={{ mixBlendMode: "multiply" }} />
    </svg>
    {line(content.title, state.title, true, "title")}
    {(content.credits ?? []).map((credit, i) => line(credit, state.credits[i], false, `credit-${i + 1}`))}
  </div>;
});
