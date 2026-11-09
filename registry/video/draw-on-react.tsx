/** Draws a draw-on scene at one frame. See `draw-on.ts` for the timing, the checks and the research. */
import { forwardRef } from "react";
import type { ComponentPropsWithoutRef, CSSProperties } from "react";
import { drawLayout, drawOnFrame } from "./draw-on";
import type { DrawOnPlan, DrawPoint } from "./draw-on";

export interface DrawOnProps extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  plan: DrawOnPlan;
  frame: number;
  width: number;
  height: number;
  /** The output's safe area, as fractions of the frame: the drawing, its labels and its title stay inside it. */
  safeInset?: { left: number; right: number; top: number; bottom: number };
  reducedMotion?: boolean;
}
const FONT = "var(--km-font-display, var(--km-font-body, Inter, ui-sans-serif, system-ui, sans-serif))";
const SURFACES = {
  paper: { ground: "radial-gradient(120% 100% at 40% 30%, #f8f4ea 0%, #f1ebde 60%, #e7dfcf 100%)", ink: "#1f2a36", label: "#1f2a36", pen: "#2b3038", shadow: "rgba(60,45,25,.22)" },
  board: { ground: "radial-gradient(120% 100% at 40% 30%, #26353a 0%, #1c292d 60%, #152024 100%)", ink: "#f1efe8", label: "#f4f2ec", pen: "#d9d4c8", shadow: "rgba(0,0,0,.35)" },
} as const;

export const DrawOn = forwardRef<HTMLDivElement, DrawOnProps>(function DrawOn({ plan, frame, width, height, safeInset, reducedMotion = false, style, ...props }, ref) {
  const { content } = plan, state = drawOnFrame(plan, frame, reducedMotion), surface = SURFACES[content.surface ?? "paper"], ink = content.ink ?? surface.ink;
  const layout = drawLayout(content, width, height, safeInset), { u } = layout, { left, right, top } = layout.safe, s = layout.scale, ox = layout.x, oy = layout.y;
  const toScreen = ([x, y]: DrawPoint) => [ox + x * s, oy + y * s] as const;
  const weight = (content.weight ?? Math.max(content.canvas.width, content.canvas.height) / 220) * s;
  const uid = `km-draw-${(content.label.length * 31 + plan.durationFrames).toString(36)}`;
  const pen = state.pen && (() => { const [px, py] = toScreen(state.pen.at), lift = state.pen.down ? 0 : 1; return { px, py, lift, opacity: state.pen.opacity }; })();
  return <div {...props} ref={ref} role="img" aria-label={content.label} data-km-draw-on=""
    style={{ position: "relative", width, height, overflow: "hidden", background: surface.ground, ...style }}>
    {content.title && <div style={{ position: "absolute", left, right: width - right, top, font: `720 ${4.6 * u}px/1.15 ${FONT}`, color: surface.label, letterSpacing: "var(--km-title-tracking, -.015em)",
      textWrap: "balance" } as CSSProperties}>{content.title}</div>}
    <svg width={width} height={height} style={{ position: "absolute", inset: 0 }} aria-hidden="true" data-km-illustration-region="art">
      <defs>{state.strokes.filter(item => item.stroke.dashed).map(({ stroke }) => <mask key={stroke.id} id={`${uid}-${stroke.id}`} maskUnits="userSpaceOnUse" x={0} y={0} width={content.canvas.width} height={content.canvas.height}>
        {/* The mask is in the user space of the path that uses it, which is already the canvas's: no transform here. */}
        <path d={stroke.path} fill="none" stroke="#fff" strokeWidth={(stroke.weight ? stroke.weight * s : weight) * 3 / s} strokeLinecap="round" pathLength={1} strokeDasharray="1 2" strokeDashoffset={1 - (state.strokes.find(item => item.stroke.id === stroke.id)?.drawn ?? 0)} />
      </mask>)}</defs>
      {/* Washes first, under every line: pigment pools a little at the edge, as watercolour does. */}
      {state.strokes.filter(item => item.stroke.fill && item.wash > 0).map(({ stroke, wash }) => <g key={`wash-${stroke.id}`} transform={`translate(${ox} ${oy}) scale(${s})`} opacity={wash}>
        <path d={stroke.path} fill={stroke.fill} fillOpacity={.34} />
        <path d={stroke.path} fill="none" stroke={stroke.fill} strokeOpacity={.32} strokeWidth={weight * 2.4 / s} strokeLinejoin="round" />
      </g>)}
      {state.strokes.map(({ stroke, drawn }) => {
        const w = (stroke.weight ? stroke.weight * s : weight) / s, color = stroke.color ?? ink;
        const reveal = stroke.dashed ? { mask: `url(#${uid}-${stroke.id})`, strokeDasharray: `${w * 2.4} ${w * 2.2}` } : { pathLength: 1, strokeDasharray: "1 2", strokeDashoffset: 1 - drawn };
        return <g key={stroke.id} transform={`translate(${ox} ${oy}) scale(${s})`}>
          {/* A faint bleed round the line, where the ink soaks into the paper. */}
          <path d={stroke.path} fill="none" stroke={color} strokeOpacity={.12} strokeWidth={w * 2} strokeLinecap="round" strokeLinejoin="round" {...stroke.dashed ? { mask: reveal.mask } : { pathLength: 1, strokeDasharray: "1 2", strokeDashoffset: 1 - drawn }} />
          <path d={stroke.path} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" {...reveal} />
        </g>;
      })}
      {/* The pen: its tip on the end of the line, its barrel leaning up and to the right, and its shadow on the paper. Lifted between
          strokes, it rises and its shadow moves away. */}
      {pen && <g opacity={pen.opacity} transform={`translate(${pen.px} ${pen.py})`}>
        <ellipse cx={1.6 * u + pen.lift * 1.4 * u} cy={1.4 * u + pen.lift * 1.6 * u} rx={5.4 * u} ry={1.1 * u} fill={surface.shadow} transform={`rotate(-38 ${1.6 * u} ${1.4 * u})`} opacity={.9 - pen.lift * .35} />
        <g transform={`translate(${-pen.lift * .5 * u} ${-pen.lift * 1.4 * u}) rotate(-52)`}>
          <path d={`M0,0 L${1.1 * u},${-.55 * u} L${1.1 * u},${.55 * u} Z`} fill={surface.pen} />
          <rect x={1.1 * u} y={-.75 * u} width={1.4 * u} height={1.5 * u} rx={.2 * u} fill="#9aa1ab" />
          <rect x={2.5 * u} y={-.9 * u} width={8.2 * u} height={1.8 * u} rx={.9 * u} fill={surface.pen} />
          <rect x={2.9 * u} y={-.62 * u} width={7.2 * u} height={.34 * u} rx={.17 * u} fill="#fff" opacity={.18} />
        </g>
      </g>}
    </svg>
    {state.strokes.filter(item => item.stroke.label && item.label > 0).map(({ stroke, label }) => {
      const [lx, ly] = toScreen(stroke.label!.at), align = stroke.label!.align ?? "start";
      return <div key={`label-${stroke.id}`} data-km-draw-label={stroke.id} {...label < 1 ? { "data-km-text-entering": "" } : {}}
        style={{ position: "absolute", left: lx, top: ly, transform: `translate(${align === "start" ? 0 : align === "middle" ? -50 : -100}%, -50%) translateY(${(1 - label) * .8 * u}px)`,
          opacity: label, font: `620 ${layout.labelFont}px/1.2 ${FONT}`, color: surface.label, whiteSpace: "nowrap" }}>{stroke.label!.text}</div>;
    })}
  </div>;
});
