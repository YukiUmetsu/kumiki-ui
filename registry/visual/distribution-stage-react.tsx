import { forwardRef, useEffect, useId, useMemo, useRef, useState } from "react";
import type { ComponentPropsWithoutRef, ReactElement } from "react";
import { createCanvasMeasurer } from "../media/text-layout";
import {
  evaluateDistributionStage, layoutDistributionStage, wrapDistributionText,
} from "./distribution-stage";
import type { DistributionDiagnostic, DistributionStageSpec, DistributionTextBlock } from "./distribution-stage";

export interface DistributionStageViewProps extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  spec: DistributionStageSpec;
  /** Absolute frame. The view owns no clock. */
  frame: number;
  width: number;
  height: number;
  /** Safe-area insets as fractions of width and height. Default 7% horizontal, 5% vertical. */
  safe?: { x: number; y: number };
  /** Label size in px; every other size scales with it. Default 2.8% of the short side. */
  baseFontPx?: number;
  /** The smallest text may not go below this. Default 2.3% of the short side. */
  minFontPx?: number;
  /** CSS font family for every label. Pass the same family to every stage so widths match. */
  family?: string;
  onDiagnostics?: (diagnostics: DistributionDiagnostic[]) => void;
}

const token = (name: string, fallback: string) => `var(${name}, ${fallback})`;
const C = {
  surface: token("--km-dist-surface", "#f6f5f1"),
  card: token("--km-dist-card", "#ffffff"),
  rule: token("--km-dist-rule", "#e3e0d8"),
  grid: token("--km-dist-grid", "#e8e5dd"),
  baseline: token("--km-dist-baseline", "#a7abb5"),
  ink: token("--km-dist-ink", "#151922"),
  muted: token("--km-dist-muted", "#666d7a"),
  mark: token("--km-dist-mark", "#3451d1"),
  markSoft: token("--km-dist-mark-soft", "#8b9cf2"),
  accent: token("--km-dist-accent", "#e0612b"),
  accentSoft: token("--km-dist-accent-soft", "#f4a574"),
  interval: token("--km-dist-interval", "#0f7b6c"),
  refusal: token("--km-dist-refusal", "#b91c1c"),
};
const TONE = { mark: C.mark, accent: C.accent, interval: C.interval } as const;
const ROLE_COLOUR: Partial<Record<DistributionTextBlock["role"], string>> = {
  eyebrow: C.muted, tick: C.muted, axis: C.ink, key: C.muted, footnote: C.muted, source: C.muted, rule: C.muted, badge: C.mark,
};
/** Samples revealed within this many places of the newest one carry a fading highlight. */
const HIGHLIGHT_TRAIL = 5;

/** A distribution with stacked samples, bin heights or a normal curve; shaded probability areas; stated intervals; and a readout card with one exact number. */
export const DistributionStageView = forwardRef<HTMLDivElement, DistributionStageViewProps>(function DistributionStageView({
  spec, frame, width, height, safe, baseFontPx, minFontPx, family, onDiagnostics, style, ...props
}, ref) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const short = Math.min(width, height);
  const safeX = safe?.x, safeY = safe?.y;
  // Text is measured with the real face: re-measure once web fonts load, and report `pending` until then.
  const [fontEpoch, setFontEpoch] = useState(0);
  const [fontsReady, setFontsReady] = useState(() => typeof document === "undefined" || !document.fonts);
  const css = family ?? 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  useEffect(() => {
    const fonts = typeof document !== "undefined" ? document.fonts : undefined;
    if (!fonts) return;
    let live = true;
    const bump = () => { if (!live) return; setFontEpoch(n => n + 1); setFontsReady(fonts.check(`600 32px ${css}`)); };
    void fonts.load(`600 32px ${css}`).then(bump, bump);
    fonts.addEventListener("loadingdone", bump);
    return () => { live = false; fonts.removeEventListener("loadingdone", bump); };
  }, [css]);
  const measure = useMemo(() => { void fontEpoch; return createCanvasMeasurer({}); }, [fontEpoch]);
  const result = useMemo(() => layoutDistributionStage(spec,
    { width, height, safe: safeX !== undefined && safeY !== undefined ? { x: safeX, y: safeY } : undefined },
    { measure, family: css, baseFontPx, minFontPx }),
  [spec, width, height, safeX, safeY, measure, css, baseFontPx, minFontPx]);
  const diagnostics = result.diagnostics;
  const notify = useRef(onDiagnostics), latest = useRef(diagnostics);
  notify.current = onDiagnostics; latest.current = diagnostics;
  const signature = JSON.stringify(diagnostics);
  useEffect(() => { notify.current?.(latest.current); }, [signature]);

  const state = evaluateDistributionStage(spec, frame);
  const hasError = diagnostics.some(d => d.severity === "error");
  const status = hasError ? "error" : fontsReady ? "ready" : "pending";
  const layout = hasError ? undefined : result.layout;
  const stroke = Math.max(2, short * .0022);

  const renderBlock = (block: DistributionTextBlock, key: string, opts: { colour?: string; opacity?: number; text?: string } = {}) => {
    const x = block.align === "middle" ? block.rect.x + block.rect.width / 2 : block.align === "end" ? block.rect.x + block.rect.width : block.rect.x;
    const lines = opts.text !== undefined ? [opts.text] : block.lines;
    return <g key={key} opacity={opts.opacity ?? 1}>
      {lines.map((line, i) => <text key={i} x={x} y={block.rect.y + block.fontPx * .92 + i * block.lineStep} textAnchor={block.align}
        fontSize={block.fontPx} fontWeight={block.weight} fontFamily={layout?.family ?? css} data-distribution-text={block.role}
        fill={opts.colour ?? ROLE_COLOUR[block.role] ?? C.ink}>{line}</text>)}
    </g>;
  };

  if (!layout) {
    const size = Math.max(12, Math.round(short * .028));
    const rows: { key: string; text: string; y: number; weight: number }[] = [];
    let y = height * .08;
    const push = (text: string, weight: number, key: string) => {
      for (const [i, line] of (wrapDistributionText(measure, `${weight} ${size}px ${css}`, text, width * .86) ?? [text]).entries()) {
        y += size * 1.3; rows.push({ key: `${key}-${i}`, text: line, y, weight });
      }
    };
    push(spec.title, 700, "t");
    y += size * .6;
    diagnostics.filter(d => d.severity === "error").forEach((d, i) => { push(`${d.code}: ${d.message}`, 450, `e${i}`); y += size * .4; });
    return <div {...props} ref={ref} data-km-distribution-stage="" data-distribution-beat={state.beatId} data-distribution-status={status}
      style={{ position: "relative", width: "100%", aspectRatio: `${width} / ${height}`, ...style }}>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${spec.title}. Refused: ${diagnostics.filter(d => d.severity === "error").length} errors.`}
        style={{ display: "block", width: "100%", height: "100%", background: C.surface }}>
        {rows.map(r => <text key={r.key} x={width * .07} y={r.y} fontSize={size} fontWeight={r.weight} fontFamily={css} fill={C.refusal}>{r.text}</text>)}
      </svg>
    </div>;
  }

  const { model, plot } = layout;
  const plotBottom = plot.y + plot.height;
  const { min: dmin, max: dmax } = model.domain;
  const clampX = (v: number) => layout.x(Math.min(dmax, Math.max(dmin, v)));
  const shownAreas = model.areas.filter(a => (state.areaAmount[a.id] ?? 0) > 0);
  const values = spec.source.kind === "samples" ? spec.source.values : [];
  const inArea = (v: number, a: { low?: number; high?: number }) => (a.low === undefined || v >= a.low) && (a.high === undefined || v < a.high);
  const readout = layout.card.readouts[state.readoutKey] ?? layout.card.readouts.reveal;
  const curveClip = `${uid}-reveal`;

  /* Samples: one rounded block per revealed sample, stacked in reveal order; blocks inside a shown area turn accent. */
  const sampleBlocks: ReactElement[] = [];
  if (model.kind === "samples") {
    const stacks = model.bins.map(() => [] as number[]);
    for (let pos = 0; pos < state.revealed; pos += 1) stacks[model.sampleBin[model.order[pos]]].push(pos);
    model.bins.forEach(bin => {
      const unit = bin.unit ?? 0, x0 = layout.x(bin.left), binPx = layout.x(bin.right) - x0;
      const gapX = Math.max(1.5, binPx * .06);
      stacks[bin.index].forEach((pos, j) => {
        const bottom = layout.y(j * unit), top = layout.y((j + 1) * unit), pitch = bottom - top;
        const gapY = Math.min(pitch * .2, short * .0018);
        const r = Math.min(pitch * .35, binPx * .12, short * .004);
        const rect = { x: x0 + gapX, y: top + gapY / 2, width: binPx - gapX * 2, height: Math.max(.5, pitch - gapY) };
        const sample = model.order[pos];
        const area = shownAreas.find(a => inArea(values[sample], a));
        const age = state.revealed - 1 - pos;
        const glow = state.reveal < 1 && age < HIGHLIGHT_TRAIL ? 1 - age / HIGHLIGHT_TRAIL : 0;
        sampleBlocks.push(<g key={pos}>
          <rect {...rect} rx={r} fill={C.mark} />
          {area ? <rect {...rect} rx={r} fill={C.accent} opacity={state.areaAmount[area.id]} /> : null}
          {glow > 0 ? <rect {...rect} rx={r} fill={C.markSoft} opacity={glow} /> : null}
        </g>);
      });
    });
  }

  /* Normal: the area under the curve between the bounds, shaded with the accent gradient. */
  const curvePoints = model.curve.map(p => `${layout.x(p.x)},${layout.y(p.y)}`).join(" ");
  const areaUnderCurve = (low: number | undefined, high: number | undefined) => {
    const lo = Math.max(dmin, low ?? dmin), hi = Math.min(dmax, high ?? dmax);
    const pts = model.curve.filter(p => p.x > lo && p.x < hi);
    const yAt = (v: number) => {
      const i = model.curve.findIndex(p => p.x >= v);
      if (i <= 0) return model.curve[Math.max(0, i)].y;
      const a = model.curve[i - 1], b = model.curve[i];
      return a.y + (b.y - a.y) * (v - a.x) / (b.x - a.x);
    };
    return [[lo, 0], [lo, yAt(lo)], ...pts.map(p => [p.x, p.y]), [hi, yAt(hi)], [hi, 0]].map(([vx, vy]) => `${layout.x(vx)},${layout.y(vy)}`).join(" ");
  };

  const pillById = new Map(layout.pills.map(p => [p.id, p]));
  const summary = `${readout.live ? state.revealed : readout.big} ${readout.statement}`;
  return <div {...props} ref={ref} data-km-distribution-stage="" data-distribution-beat={state.beatId} data-distribution-status={status}
    style={{ position: "relative", width: "100%", aspectRatio: `${width} / ${height}`, ...style }}>
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${spec.title}. ${summary}. ${spec.provenance}`}
      style={{ display: "block", width: "100%", height: "100%", background: C.surface }}>
      <defs>
        <linearGradient id={`${uid}-area`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: C.accentSoft, stopOpacity: .55 }} /><stop offset="1" style={{ stopColor: C.accent, stopOpacity: .3 }} />
        </linearGradient>
        <linearGradient id={`${uid}-band`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: C.accentSoft, stopOpacity: .28 }} /><stop offset="1" style={{ stopColor: C.accentSoft, stopOpacity: .06 }} />
        </linearGradient>
        <linearGradient id={`${uid}-body`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: C.markSoft, stopOpacity: .22 }} /><stop offset="1" style={{ stopColor: C.markSoft, stopOpacity: .04 }} />
        </linearGradient>
        <linearGradient id={`${uid}-bar`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: C.markSoft }} /><stop offset="1" style={{ stopColor: C.mark }} />
        </linearGradient>
        <filter id={`${uid}-card`} x="-10%" y="-10%" width="120%" height="130%">
          <feDropShadow dx="0" dy={short * .004} stdDeviation={short * .008} floodColor="#1b2030" floodOpacity=".08" />
        </filter>
        <clipPath id={curveClip}><rect x={plot.x} y={0} width={plot.width * state.reveal} height={height} /></clipPath>
      </defs>
      <rect x={0} y={0} width={width} height={height} fill={C.surface} />

      {layout.texts.filter(b => b.role === "eyebrow" || b.role === "title").map(b => renderBlock(b, b.id))}
      {layout.badge ? <g>
        <rect {...layout.badge.rect} rx={layout.badge.rect.height / 2} fill={C.mark} opacity={.1} data-distribution-badge="" />
        {renderBlock(layout.badge.text, "badge")}
      </g> : null}

      {layout.yTicks.filter(t => t.value > 0).map(t => <line key={`g${t.value}`} x1={plot.x} x2={plot.x + plot.width} y1={t.py} y2={t.py}
        stroke={C.grid} strokeWidth={stroke * .8} />)}

      {model.kind !== "normal" ? shownAreas.map(a => <rect key={`band${a.id}`} x={clampX(a.low ?? dmin)} y={plot.y}
        width={Math.max(0, clampX(a.high ?? dmax) - clampX(a.low ?? dmin))} height={plot.height} fill={`url(#${uid}-band)`}
        opacity={state.areaAmount[a.id]} data-distribution-area={a.id} />) : null}

      {sampleBlocks.length ? <g data-distribution-samples={state.revealed}>{sampleBlocks}</g> : null}

      {model.kind === "bin-counts" || model.kind === "bin-density" ? model.bins.map(bin => {
        const h = plotBottom - layout.y(bin.value * (state.binFill[bin.index] ?? 0));
        const x0 = layout.x(bin.left) + stroke, w = layout.x(bin.right) - layout.x(bin.left) - stroke * 2, r = Math.min(w * .14, 14, h / 2);
        if (h <= 0) return null;
        const d = `M${x0} ${plotBottom} V${plotBottom - h + r} Q${x0} ${plotBottom - h} ${x0 + r} ${plotBottom - h} H${x0 + w - r} Q${x0 + w} ${plotBottom - h} ${x0 + w} ${plotBottom - h + r} V${plotBottom} Z`;
        const area = shownAreas.find(a => (a.low === undefined || bin.left >= a.low) && (a.high === undefined || bin.right <= a.high));
        return <g key={`b${bin.index}`} data-distribution-bin={bin.index}>
          <path d={d} fill={`url(#${uid}-bar)`} />
          {area ? <path d={d} fill={C.accent} opacity={state.areaAmount[area.id]} /> : null}
        </g>;
      }) : null}

      {model.kind === "normal" ? <g clipPath={`url(#${curveClip})`}>
        <polygon points={`${layout.x(dmin)},${plotBottom} ${curvePoints} ${layout.x(dmax)},${plotBottom}`} fill={`url(#${uid}-body)`} />
        {shownAreas.map(a => <polygon key={`u${a.id}`} points={areaUnderCurve(a.low, a.high)} fill={`url(#${uid}-area)`}
          opacity={state.areaAmount[a.id]} data-distribution-area={a.id} />)}
        <polyline fill="none" stroke={C.ink} strokeWidth={Math.max(3, short * .004)} strokeLinejoin="round" strokeLinecap="round" points={curvePoints} />
      </g> : null}

      <line x1={plot.x - layout.sizes.tick * .3} x2={plot.x + plot.width + layout.sizes.tick * .3} y1={plotBottom} y2={plotBottom}
        stroke={C.baseline} strokeWidth={stroke * 1.2} strokeLinecap="round" />
      {layout.xTicks.map(t => <line key={`xt${t.value}`} x1={t.px} x2={t.px} y1={plotBottom} y2={plotBottom + layout.sizes.tick * .3}
        stroke={C.baseline} strokeWidth={stroke} />)}
      {layout.texts.filter(b => b.role === "tick" || b.role === "axis").map(b => renderBlock(b, b.id))}

      {layout.pills.filter(p => p.kind === "threshold").map(p => {
        const amount = state.areaAmount[p.targetId] ?? 0;
        if (amount <= 0 || p.value === undefined) return null;
        const lx = layout.x(p.value);
        return <g key={p.id} opacity={amount} data-distribution-threshold={p.targetId}>
          <line x1={lx} x2={lx} y1={p.rect.y + p.rect.height} y2={plotBottom} stroke={C.accent} strokeWidth={Math.max(2, short * .003)} />
          <rect {...p.rect} rx={p.rect.height / 2} fill={C.accent} data-distribution-pill={p.id} />
          {renderBlock(p.text, `${p.id}-t`, { colour: "#ffffff" })}
        </g>;
      })}

      {model.intervals.map(interval => {
        const amount = state.intervalAmount[interval.id] ?? 0;
        const pill = pillById.get(`interval:${interval.id}`);
        const cy = layout.intervalLanes[interval.id];
        if (amount <= 0 || !pill || cy === undefined) return null;
        const cap = pill.rect.height * .32, x0 = layout.x(interval.low), x1 = layout.x(interval.high), w = Math.max(3, short * .0045);
        return <g key={`i${interval.id}`} opacity={amount} data-distribution-interval={interval.id}>
          <line x1={x0} x2={x1} y1={cy} y2={cy} stroke={C.interval} strokeWidth={w} strokeLinecap="round" />
          <line x1={x0} x2={x0} y1={cy - cap} y2={cy + cap} stroke={C.interval} strokeWidth={w} strokeLinecap="round" />
          <line x1={x1} x2={x1} y1={cy - cap} y2={cy + cap} stroke={C.interval} strokeWidth={w} strokeLinecap="round" />
          <circle cx={layout.x(interval.estimate)} cy={cy} r={cap * .62} fill={C.interval} stroke={C.card} strokeWidth={stroke} />
          <rect {...pill.rect} rx={pill.rect.height / 2} fill={C.interval} fillOpacity={.12} data-distribution-pill={pill.id} />
          {renderBlock(pill.text, `${pill.id}-t`, { colour: C.interval })}
        </g>;
      })}

      {layout.key ? <g>
        <rect {...layout.key.swatch} rx={layout.key.swatch.height * .22} fill={C.mark} />
        {renderBlock(layout.key.text, "key")}
      </g> : null}
      {layout.texts.filter(b => b.role === "footnote").map(b => renderBlock(b, b.id))}

      <g data-distribution-readout={readout.key}>
        <rect {...layout.card.rect} rx={layout.card.padding * .7} fill={C.card} stroke={C.rule} strokeWidth={stroke * .6}
          filter={`url(#${uid}-card)`} data-distribution-card="" />
        <g opacity={state.readoutAmount}>
          {readout.blocks.map(b => renderBlock(b, b.id, {
            colour: b.role === "big" ? TONE[readout.tone] : b.role === "statement" ? C.ink : C.muted,
            text: b.role === "big" && readout.live ? String(state.revealed) : undefined,
          }))}
        </g>
      </g>
    </svg>
  </div>;
});
