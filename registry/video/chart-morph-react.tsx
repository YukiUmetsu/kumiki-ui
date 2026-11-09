/** Draws a chart morph at one frame. See `chart-morph.ts` for the staging, the checks and the research behind them. */
import { forwardRef } from "react";
import type { ComponentPropsWithoutRef, CSSProperties } from "react";
import { chartMorphFrame, formatValue } from "./chart-morph";
import type { ChartMorphForm, ChartMorphPlan } from "./chart-morph";

export interface ChartMorphProps extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  plan: ChartMorphPlan;
  frame: number;
  width: number;
  height: number;
  safeInset?: { left: number; right: number; top: number; bottom: number };
  /** @default "dark" */
  appearance?: "dark" | "light";
  /** The highlighted category's colour. @default warm amber */
  accent?: string;
  reducedMotion?: boolean;
}
const FONT = "var(--km-font-display, Inter, ui-sans-serif, system-ui, sans-serif)";
const dotted = (form: ChartMorphForm) => form !== "bar";

export const ChartMorph = forwardRef<HTMLDivElement, ChartMorphProps>(function ChartMorph({ plan, frame, width, height, safeInset, appearance = "dark", accent = "#F2B53A", reducedMotion = false, style, ...props }, ref) {
  const { content } = plan, state = chartMorphFrame(plan, frame, reducedMotion);
  const dark = appearance === "dark", ink = dark ? "#e9eef5" : "#18212c", muted = dark ? "rgba(233,238,245,.58)" : "rgba(24,33,44,.6)", grid = dark ? "rgba(233,238,245,.08)" : "rgba(24,33,44,.09)";
  const base = dark ? "#5f7d9c" : "#8aa0b6";
  const safe = { left: Math.max(.05, safeInset?.left ?? 0), right: Math.max(.04, safeInset?.right ?? 0), top: Math.max(.05, safeInset?.top ?? 0), bottom: Math.max(.05, safeInset?.bottom ?? 0) };
  const unit = height / 100, n = content.categories.length, rows = !content.ordered;
  const left = width * safe.left, right = width * (1 - safe.right), top = height * safe.top + unit * 12, bottom = height * (1 - safe.bottom) - unit * 15;
  // Rows: labels on the left, values grow to the right. Columns: categories along the bottom, values grow up.
  const labelW = rows ? Math.max(...content.categories.map(item => item.label.length)) * unit * 1.45 + unit * 2 : 0;
  const plot = rows ? { x0: left + labelW, x1: right - unit * 8, y0: top, y1: bottom - unit * 4 } : { x0: left + unit * 7, x1: right - unit * 2, y0: top, y1: bottom - unit * 5 };
  const [d0, d1] = state.domain, t = (v: number) => (v - d0) / Math.max(1e-9, d1 - d0);
  const along = (v: number) => rows ? plot.x0 + t(v) * (plot.x1 - plot.x0) : plot.y1 - t(v) * (plot.y1 - plot.y0);
  const band = (rows ? plot.y1 - plot.y0 : plot.x1 - plot.x0) / n, slot = (s: number) => (rows ? plot.y0 : plot.x0) + (s + .5) * band;
  // Bar to dot: the bar thins to a stem as the dot grows at its end, so one object turns into the other.
  const fromDot = dotted(state.form.from), toDot = dotted(state.form.to), mix = state.form.mix;
  const dotness = (fromDot ? 1 - mix : 0) + (toDot ? mix : 0), barness = 1 - dotness;
  const lineShown = (state.form.from === "line" ? 1 - mix : 0) + (state.form.to === "line" ? mix : 0);
  const thick = band * .62, stem = Math.max(unit * .18, thick * (.06 + .94 * barness)), r = band * .2 * dotness;
  const ticks = (() => { const raw = (d1 - d0) / 5, m = 10 ** Math.floor(Math.log10(raw)), step = [1, 2, 2.5, 5, 10].map(k => k * m).find(k => k >= raw)!; const out: number[] = []; for (let v = Math.ceil(d0 / step) * step; v <= d1 + 1e-9; v += step) out.push(+v.toFixed(8)); return out; })();
  const text = (size: number, weight = 500, extra: CSSProperties = {}): CSSProperties => ({ font: `${weight} ${size * unit}px/1.2 ${FONT}`, color: ink, ...extra });
  const svgText = (size: number, weight: number, fill: string): CSSProperties => ({ font: `${weight} ${size * unit}px ${FONT}`, fill, color: fill, fontVariantNumeric: "tabular-nums" });
  const items = [...state.items].sort((a, b) => (a.id === content.highlight ? 1 : 0) - (b.id === content.highlight ? 1 : 0));
  const points = [...state.items].sort((a, b) => a.slot - b.slot).map(item => rows ? [along(item.value), slot(item.slot)] : [slot(item.slot), along(item.value)]);
  return <div {...props} ref={ref} role="img" aria-label={content.label} data-km-chart-morph=""
    style={{ position: "relative", width, height, overflow: "hidden", background: dark ? "radial-gradient(120% 90% at 30% 20%, #142236 0%, #0b1220 60%, #080d17 100%)" : "radial-gradient(120% 90% at 30% 20%, #ffffff 0%, #f4f1ea 70%, #ebe6dc 100%)", ...style }}>
    <svg width={width} height={height} style={{ position: "absolute", inset: 0 }} aria-hidden="true">
      {ticks.map(v => { const p = along(v), shown = Math.min(1, Math.max(0, 1 - Math.abs(t(v) - .5) * 2 + .6)) * (t(v) >= -.001 && t(v) <= 1.001 ? 1 : 0);
        return <g key={v} opacity={shown * state.items[0].enter}>
          {rows ? <line x1={p} x2={p} y1={plot.y0} y2={plot.y1} stroke={grid} /> : <line x1={plot.x0} x2={plot.x1} y1={p} y2={p} stroke={grid} />}
          <text x={rows ? p : plot.x0 - unit * 1.2} y={rows ? plot.y1 + unit * 3.8 : p + unit * .9} textAnchor={rows ? "middle" : "end"} style={svgText(2.5, 500, muted)}>{formatValue(content, v)}</text>
        </g>; })}
      <line x1={rows ? plot.x0 : plot.x0} x2={rows ? plot.x0 : plot.x1} y1={rows ? plot.y0 : plot.y1} y2={plot.y1} stroke={dark ? "rgba(233,238,245,.25)" : "rgba(24,33,44,.28)"} strokeWidth={1.2} />
      {lineShown > 0 && <polyline points={points.map(p => p.join(",")).join(" ")} fill="none" stroke={base} strokeWidth={unit * .3} strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - lineShown} />}
      {items.map(item => {
        const hi = item.id === content.highlight, c = hi ? accent : base, at = slot(item.slot), end = along(item.value * item.enter + d0 * (1 - item.enter)), zero = along(Math.max(d0, 0));
        const cmp = item.compare !== undefined ? along(item.compare) : undefined, value = formatValue(content, item.value);
        return <g key={item.id}>
          {/* The dumbbell's start: a faint dot where the category began, joined to where it is now. */}
          {cmp !== undefined && item.compareShown > 0 && <g opacity={item.compareShown}>
            {rows ? <line x1={cmp} x2={end} y1={at} y2={at} stroke={c} strokeOpacity={hi ? .85 : .6} strokeWidth={unit * .75} strokeLinecap="round" /> : <line x1={at} x2={at} y1={cmp} y2={end} stroke={c} strokeOpacity={hi ? .85 : .6} strokeWidth={unit * .75} strokeLinecap="round" />}
            <circle cx={rows ? cmp : at} cy={rows ? at : cmp} r={band * .17} fill={dark ? "#0b1220" : "#f4f1ea"} stroke={c} strokeWidth={unit * .38} />
          </g>}
          {/* A dumbbell runs from its start to its value, so the stem from zero gives way as the start dot arrives. */}
          {stem > 0 && (1 - (cmp !== undefined ? item.compareShown : 0)) > .01 && (rows ? <rect x={Math.min(zero, end)} y={at - stem / 2} width={Math.abs(end - zero)} height={stem} rx={Math.min(stem / 2, unit * .5)} fill={c} fillOpacity={(hi ? .95 : .78) * (1 - (cmp !== undefined ? item.compareShown : 0))} />
            : <rect x={at - stem / 2} y={Math.min(zero, end)} width={stem} height={Math.abs(end - zero)} rx={Math.min(stem / 2, unit * .5)} fill={c} fillOpacity={(hi ? .95 : .78) * (1 - (cmp !== undefined ? item.compareShown : 0))} />)}
          {r > 0 && <circle cx={rows ? end : at} cy={rows ? at : end} r={r} fill={c} stroke={dark ? "#0b1220" : "#fff"} strokeWidth={unit * .2} />}
          {/* The value, just past the end of the mark. */}
          <text x={rows ? end + Math.max(r, unit * .4) + unit * 1.2 : at} y={rows ? at + unit * .9 : end - Math.max(r, unit * .4) - unit * 1.2} textAnchor={rows ? "start" : "middle"}
            opacity={item.enter * (hi ? 1 : 1 - .85 * item.moving)} style={svgText(hi ? 2.8 : 2.5, hi ? 720 : 560, hi ? ink : muted)}>{value}</text>
          {/* The category's name, which follows its row when the order changes. */}
          {/* While rows swap places their names pass each other, so a moving row's name fades to faint and lands crisp; the story's row
              stays legible throughout. */}
          <text data-km-text-tracks="" x={rows ? plot.x0 - unit * 1.6 : at} y={rows ? at + unit * .95 : plot.y1 + unit * 3.8} textAnchor={rows ? "end" : "middle"}
            opacity={hi ? 1 : 1 - .85 * item.moving} style={svgText(hi ? 2.8 : 2.6, hi ? 720 : 520, hi ? ink : muted)}>{item.label}</text>
        </g>;
      })}
    </svg>
    <div style={{ position: "absolute", left, right: width * safe.right, top: height * safe.top, display: "grid", gap: unit * .6, opacity: state.items[0].enter }}>
      <div style={text(3.8, 680)}>{content.title}</div>
      <div style={text(2.4, 500, { color: muted })}>{content.source}</div>
    </div>
    {/* The caption band: what the state shows, said as its change begins, and still while it is read. */}
    <div style={{ position: "absolute", left, right: width * safe.right, bottom: height * safe.bottom + unit * 2.4, display: "flex", alignItems: "center", gap: unit * 1.6, minHeight: unit * 6 }}>
      <span style={{ width: unit * .55, alignSelf: "stretch", borderRadius: unit, background: accent, opacity: state.caption.opacity }} />
      <span style={text(3.6, 600, { opacity: state.caption.opacity, maxWidth: "82%", textWrap: "balance" } as CSSProperties)}>{state.caption.text}</span>
    </div>
  </div>;
});
