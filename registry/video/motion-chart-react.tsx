/** Draws a guided motion chart at one frame. See `motion-chart.ts` for the timeline, the guidance rule and the checks. */
import { forwardRef, useId } from "react";
import type { ComponentPropsWithoutRef, CSSProperties } from "react";
import { axisTicks, entityAt, motionChartState, tickText } from "./motion-chart";
import type { MotionChartPlan } from "./motion-chart";

export interface MotionChartProps extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  plan: MotionChartPlan;
  frame: number;
  width: number;
  height: number;
  /** Normalized platform safe area; text stays inside it. */
  safeInset?: { left: number; right: number; top: number; bottom: number };
  /** @default "dark" */
  appearance?: "dark" | "light";
  reducedMotion?: boolean;
}

/** Colour-blind-safe defaults for up to eight groups, used where a group names no colour. */
export const MOTION_CHART_PALETTE = ["#E5534B", "#4C9BE8", "#E8A33C", "#4CC38A", "#A07BE8", "#E87BB8", "#3DBFC9", "#B8C24C"] as const;
const FONT = "var(--km-font-display, Inter, ui-sans-serif, system-ui, sans-serif)";

export const MotionChart = forwardRef<HTMLDivElement, MotionChartProps>(function MotionChart({ plan, frame, width, height, safeInset, appearance = "dark", reducedMotion = false, style, ...props }, ref) {
  const id = useId().replace(/:/g, "");
  const { content, domains } = plan, state = motionChartState(plan, frame, reducedMotion);
  const dark = appearance === "dark", ink = dark ? "#e9eef5" : "#18212c", muted = dark ? "rgba(233,238,245,.56)" : "rgba(24,33,44,.58)";
  const grid = dark ? "rgba(233,238,245,.075)" : "rgba(24,33,44,.08)";
  const safe = { left: Math.max(.05, safeInset?.left ?? 0), right: Math.max(.04, safeInset?.right ?? 0), top: Math.max(.05, safeInset?.top ?? 0), bottom: Math.max(.05, safeInset?.bottom ?? 0) };
  const unit = height / 100;
  // Bands: title and legend on top, the caption band under the plot, axis labels between.
  const plot = { left: width * safe.left + unit * 10.5, right: width * (1 - safe.right) - unit * 1.5, top: height * safe.top + unit * 13, bottom: height * (1 - safe.bottom) - unit * 19 };
  const pw = plot.right - plot.left, ph = plot.bottom - plot.top;
  const scale = (value: number, domain: readonly [number, number], log?: boolean) => {
    const m = (v: number) => log ? Math.log10(v) : v;
    return (m(value) - m(domain[0])) / (m(domain[1]) - m(domain[0]));
  };
  const px = (v: number) => plot.left + scale(v, domains.x, content.x.scale === "log") * pw, py = (v: number) => plot.bottom - scale(v, domains.y, content.y.scale === "log") * ph;
  const rMax = Math.min(pw, ph) * .085, radius = (size: number) => content.size ? Math.max(unit * .45, rMax * Math.sqrt(size / domains.size)) : unit * 1.1;
  const color = (group: string) => { const i = content.groups.findIndex(item => item.id === group); return content.groups[i]?.color ?? MOTION_CHART_PALETTE[i % MOTION_CHART_PALETTE.length]; };
  const focus = state.focus, focusIndex = focus ? content.entities.findIndex(entity => entity.id === focus.event.entity) : -1, dim = focus?.amount ?? 0;
  const labelled = new Set(content.labelled ?? []);
  // Bubbles drawn largest first, so small ones stay visible; the watched one last of all.
  const bubbles = content.entities.map((entity, index) => ({ entity, index, at: entityAt(plan, index, state.time) }))
    .filter(item => item.at).sort((a, b) => (a.index === focusIndex ? 1 : 0) - (b.index === focusIndex ? 1 : 0) || b.at![2] - a.at![2]);
  // The watched bubble's trail: a dot at each data time it has passed in the event, older ones fainter, and a thin line through them.
  const trail = focus && focusIndex >= 0 ? content.times.filter(t => t >= focus.trailFrom && t <= state.time).map(t => entityAt(plan, focusIndex, t)).filter(Boolean) as Array<readonly [number, number, number]> : [];
  const year = Math.round(state.time), ticksX = axisTicks(content.x, domains.x), ticksY = axisTicks(content.y, domains.y);
  const enter = state.enter, stagger = (i: number) => reducedMotion ? 1 : Math.min(1, Math.max(0, enter * 1.6 - (i / Math.max(1, content.entities.length)) * .6));
  const text = (size: number, weight = 500, extra: CSSProperties = {}): CSSProperties => ({ font: `${weight} ${size * unit}px/1.2 ${FONT}`, color: ink, letterSpacing: size > 3 ? "-.01em" : 0, ...extra });
  const captionColor = focus ? color(content.entities[focusIndex]?.group) : ink;
  return <div {...props} ref={ref} role="img" aria-label={content.label} data-km-motion-chart=""
    style={{ position: "relative", width, height, overflow: "hidden", background: dark ? "radial-gradient(120% 90% at 30% 20%, #142236 0%, #0b1220 60%, #080d17 100%)" : "radial-gradient(120% 90% at 30% 20%, #ffffff 0%, #f4f1ea 70%, #ebe6dc 100%)", ...style }}>
    <svg width={width} height={height} style={{ position: "absolute", inset: 0 }} aria-hidden="true">
      <defs>
        <filter id={`${id}-glow`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation={unit * .9} /></filter>
        <clipPath id={`${id}-plot`}><rect x={plot.left} y={plot.top - rMax} width={pw + rMax} height={ph + rMax} /></clipPath>
      </defs>
      {/* The year, large and quiet, behind everything. */}
      {/* Marked as artwork: the text audit skips it, as it is a backdrop, not copy to read. */}
      <text data-km-illustration-region="art" x={plot.right - unit * 1.5} y={plot.bottom - unit * 2} textAnchor="end" style={{ font: `700 ${ph * .34}px/1 ${FONT}`, fill: dark ? "rgba(233,238,245,.06)" : "rgba(24,33,44,.07)", letterSpacing: "-.03em", fontVariantNumeric: "tabular-nums" }} opacity={enter}>{year}</text>
      <g opacity={enter}>
        {ticksX.map(t => <g key={"x" + t}><line x1={px(t)} x2={px(t)} y1={plot.top} y2={plot.bottom} stroke={grid} strokeWidth={1} />
          <text x={px(t)} y={plot.bottom + unit * 3.6} textAnchor="middle" style={{ font: `500 ${unit * 2.5}px ${FONT}`, fill: muted, color: muted, fontVariantNumeric: "tabular-nums" }}>{tickText(t)}</text></g>)}
        {ticksY.map(t => <g key={"y" + t}><line x1={plot.left} x2={plot.right} y1={py(t)} y2={py(t)} stroke={grid} strokeWidth={1} />
          <text x={plot.left - unit * 1.2} y={py(t) + unit * .85} textAnchor="end" style={{ font: `500 ${unit * 2.5}px ${FONT}`, fill: muted, color: muted, fontVariantNumeric: "tabular-nums" }}>{tickText(t)}</text></g>)}
        <line x1={plot.left} x2={plot.right} y1={plot.bottom} y2={plot.bottom} stroke={dark ? "rgba(233,238,245,.22)" : "rgba(24,33,44,.25)"} strokeWidth={1.2} />
      </g>
      <g clipPath={`url(#${id}-plot)`}>
        {trail.length > 1 && <polyline points={trail.map(p => `${px(p[0])},${py(p[1])}`).join(" ")} fill="none" stroke={captionColor} strokeOpacity={.45 * dim} strokeWidth={unit * .22} strokeLinejoin="round" />}
        {trail.slice(0, -1).map((p, i) => <circle key={i} cx={px(p[0])} cy={py(p[1])} r={radius(p[2]) * .55} fill={captionColor} fillOpacity={(.12 + .4 * (i + 1) / trail.length) * dim} />)}
        {bubbles.map(({ entity, index, at }) => {
          const watched = index === focusIndex, fade = watched ? 1 : 1 - .78 * dim, r = radius(at![2]) * stagger(index), c = color(entity.group);
          return <g key={entity.id} opacity={fade}>
            {watched && dim > 0 && <circle cx={px(at![0])} cy={py(at![1])} r={r + unit * 1.2} fill={c} opacity={.55 * dim} filter={`url(#${id}-glow)`} />}
            <circle cx={px(at![0])} cy={py(at![1])} r={r} fill={dim && !watched ? (dark ? "#55606e" : "#b3b9c2") : c} fillOpacity={watched ? .96 : .84}
              stroke={dark ? "rgba(8,13,23,.55)" : "rgba(255,255,255,.7)"} strokeWidth={unit * .14} />
            {watched && dim > 0 && <circle cx={px(at![0])} cy={py(at![1])} r={r + unit * .75} fill="none" stroke={dark ? "#ffffff" : "#18212c"} strokeWidth={unit * .28} opacity={dim} />}
          </g>;
        })}
      </g>
      {/* Labels: the watched entity, and the few the story names. They follow their bubbles, so the moving-text audit leaves them out. */}
      {(() => {
        // Labels: the watched entity first, then the few the story names. Each tries four places round its bubble and takes the first
        // that stays in the safe area, clear of labels already placed and of the big bubbles; one that fits nowhere waits.
        type Box = { x0: number; x1: number; y0: number; y1: number };
        const placed: Box[] = [], hits = (a: Box, b: Box) => !(a.x1 < b.x0 || a.x0 > b.x1 || a.y1 < b.y0 || a.y0 > b.y1);
        const big = bubbles.filter(item => radius(item.at![2]) > unit * 2.2).map(item => ({ cx: px(item.at![0]), cy: py(item.at![1]), r: radius(item.at![2]), index: item.index }));
        const overBubble = (box: Box, own: number) => big.some(c => c.index !== own && Math.hypot(Math.max(box.x0, Math.min(c.cx, box.x1)) - c.cx, Math.max(box.y0, Math.min(c.cy, box.y1)) - c.cy) < c.r);
        const order = bubbles.filter(({ entity, index }) => index === focusIndex ? dim > 0 : labelled.has(entity.id)).sort((p, q) => (q.index === focusIndex ? 1 : 0) - (p.index === focusIndex ? 1 : 0));
        return order.map(({ entity, index, at }) => {
          const watched = index === focusIndex, size = watched ? 3 : 2.5, w = entity.label.length * size * unit * .56, h = size * unit;
          const r = radius(at![2]), cx = px(at![0]), cy = py(at![1]), d = r * .72 + unit * .7;
          const spots = [[cx + d, cy - d], [cx - d - w, cy - d], [cx + d, cy + d + h * .8], [cx - d - w, cy + d + h * .8]].map(([x, y]) => ({ x, y, box: { x0: x - unit * .4, x1: x + w + unit * .4, y0: y - h, y1: y + h * .25 } }));
          const inside = (box: Box) => box.x0 >= width * safe.left && box.x1 <= width * (1 - safe.right) && box.y0 >= plot.top && box.y1 <= plot.bottom;
          const spot = spots.find(item => inside(item.box) && !placed.some(other => hits(other, item.box)) && (watched || !overBubble(item.box, index)));
          if (!spot) return null;
          placed.push(spot.box);
          return <text key={"l" + entity.id} data-km-text-tracks="" x={spot.x} y={spot.y}
          opacity={watched ? dim : (1 - .3 * dim) * enter} style={{ font: `${watched ? 700 : 600} ${unit * size}px ${FONT}`, fill: ink, color: ink, paintOrder: "stroke", stroke: dark ? "rgba(8,13,23,.85)" : "rgba(255,255,255,.9)", strokeWidth: unit * .5, strokeLinejoin: "round" }}>{entity.label}</text>;
        });
      })()}
      <text x={plot.left + pw / 2} y={plot.bottom + unit * 7.6} textAnchor="middle" style={{ font: `600 ${unit * 2.5}px ${FONT}`, fill: muted, color: muted }} opacity={enter}>{content.x.label}{content.x.unit ? ` (${content.x.unit})` : ""}</text>
      <text transform={`translate(${plot.left - unit * 7.6},${plot.top + ph / 2}) rotate(-90)`} textAnchor="middle" style={{ font: `600 ${unit * 2.5}px ${FONT}`, fill: muted, color: muted }} opacity={enter}>{content.y.label}{content.y.unit ? ` (${content.y.unit})` : ""}</text>
    </svg>
    {/* Title and legend: a top band that does not move. */}
    <div style={{ position: "absolute", left: width * safe.left, right: width * safe.right, top: height * safe.top, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: unit * 3, opacity: enter }}>
      <div style={{ display: "grid", gap: unit * .6, maxWidth: "62%" }}>
        <div style={text(3.8, 680)}>{content.title}</div>
        {/* Under the title: what the bubbles' size means, and where the data comes from. The bottom band is kept for the cue. */}
        <div style={text(2.4, 500, { color: muted })}>{content.size ? `Bubble size: ${content.size.label}${content.size.unit ? ` (${content.size.unit})` : ""} · ` : ""}{content.source}</div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-end", gap: `${unit * .8}px ${unit * 2.2}px`, maxWidth: "36%", paddingTop: unit * .8 }}>
        {content.groups.map(group => <span key={group.id} style={{ ...text(2.4, 560, { color: muted }), display: "inline-flex", alignItems: "center", gap: unit * .8 }}>
          <span style={{ width: unit * 1.5, height: unit * 1.5, borderRadius: "50%", background: color(group.id), opacity: 1 - .6 * dim }} />{group.label}</span>)}
      </div>
    </div>
    {/* The caption band: the cue before a change and the note after it, in one place, never moving while it is read. */}
    <div style={{ position: "absolute", left: width * safe.left, right: width * safe.right, bottom: height * safe.bottom + unit * 2.4, display: "flex", alignItems: "center", gap: unit * 1.6, minHeight: unit * 6 }}>
      {state.caption && <>
        <span style={{ width: unit * .55, alignSelf: "stretch", borderRadius: unit, background: state.caption.kind === "cue" ? captionColor : muted, opacity: state.caption.opacity }} />
        <span style={text(state.caption.kind === "cue" ? 4.4 : 3.4, state.caption.kind === "cue" ? 680 : 520, { opacity: state.caption.opacity, maxWidth: "78%", textWrap: "balance" } as CSSProperties)}>{state.caption.text}</span>
      </>}
    </div>
  </div>;
});
