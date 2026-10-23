import { forwardRef, useEffect, useId, useMemo, useRef, useState } from "react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { createCanvasMeasurer } from "../media/text-layout";
import type { Rect } from "../motion/types";
import {
  evaluateScaleComparison, layoutScaleComparison, scaleRatioReadout, validateScaleComparison,
} from "./scale-comparison-stage";
import type { ScaleComparisonSpec, ScaleDiagnostic, ScaleLayoutItem, ScaleTextBlock } from "./scale-comparison-stage";

export interface ScaleComparisonStageViewProps extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  spec: ScaleComparisonSpec;
  /** Absolute frame. The view owns no clock. */
  frame: number;
  width: number;
  height: number;
  /** Normalized rect the stage is laid out in. Default: the whole output. */
  safe?: Rect;
  /** Largest and smallest label font in px. Defaults scale with the short side (4.5% and 2.3%). */
  maxFontPx?: number;
  minFontPx?: number;
  /** CSS font family. The layout measures with it, so every stage should pass the same one. */
  family?: string;
  onDiagnostics?: (diagnostics: ScaleDiagnostic[]) => void;
}

const token = (name: string, fallback: string) => `var(${name}, ${fallback})`;
const C = {
  surface: token("--km-scale-surface", "#f6f5f1"),
  card: token("--km-scale-card", "#ffffff"),
  rule: token("--km-scale-rule", "#e3e0d8"),
  grid: token("--km-scale-grid", "#e8e5dd"),
  baseline: token("--km-scale-baseline", "#a7abb5"),
  ink: token("--km-scale-ink", "#151922"),
  muted: token("--km-scale-muted", "#666d7a"),
  mark: token("--km-scale-mark", "#3451d1"),
  markSoft: token("--km-scale-mark-soft", "#7b8ff0"),
  tile: token("--km-scale-tile", "#ee9a2e"),
  tileSoft: token("--km-scale-tile-soft", "#f6c06f"),
};
const TEXT_COLOUR: Partial<Record<ScaleTextBlock["role"], string>> = {
  eyebrow: C.muted, badge: C.mark, tick: C.muted, meta: C.muted, rule: C.muted, arithmetic: C.muted, footnote: C.muted,
  ratio: C.mark, result: C.mark,
};
/** The most tiles or beads a compare beat draws; beyond this the readout alone carries the ratio. */
const MAX_TILES = 400;
/** Circles smaller than this get a locator ring, so a true-to-scale speck can still be found. */
const LOCATOR_RADIUS = 9;

/** Measured, frame-addressed scale: items rise on one shared scale; compare beats stack the smaller item inside the larger. */
export const ScaleComparisonStageView = forwardRef<HTMLDivElement, ScaleComparisonStageViewProps>(function ScaleComparisonStageView({
  spec, frame, width, height, safe, maxFontPx, minFontPx, family, onDiagnostics, style, ...props
}, ref) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const short = Math.min(width, height);
  const box = useMemo<Rect>(() => safe
    ? { x: safe.x * width, y: safe.y * height, width: safe.width * width, height: safe.height * height }
    : { x: 0, y: 0, width, height }, [safe, width, height]);
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
  const layout = useMemo(() => layoutScaleComparison(spec, box, {
    measure, family: css, maxFontPx: maxFontPx ?? Math.round(short * .045), minFontPx: minFontPx ?? Math.round(short * .023),
    readablePx: Math.round(short * .032),
  }), [spec, box, measure, css, maxFontPx, minFontPx, short]);
  const diagnostics = useMemo(() => validateScaleComparison(spec, layout), [spec, layout]);
  const notify = useRef(onDiagnostics), latest = useRef(diagnostics);
  notify.current = onDiagnostics; latest.current = diagnostics;
  const signature = JSON.stringify(diagnostics);
  useEffect(() => { notify.current?.(latest.current); }, [signature]);

  const state = evaluateScaleComparison(spec, frame);
  const emphasis = state.emphasis;
  const isFocus = (id: string) => !emphasis || emphasis.itemIds.includes(id);
  const dim = (id: string) => isFocus(id) ? 1 : 1 - 0.7 * (emphasis?.amount ?? 0);
  const status = diagnostics.some(d => d.severity === "error") ? "error" : fontsReady ? "ready" : "pending";
  const stroke = Math.max(2, short * .0022);
  const byId = new Map(layout.items.map(item => [item.id, item]));

  const renderBlock = (block: ScaleTextBlock, key: string, opacity = 1, dy = 0, colour?: string) => {
    const x = block.align === "middle" ? block.rect.x + block.rect.width / 2 : block.align === "end" ? block.rect.x + block.rect.width : block.rect.x;
    const anchor = block.align === "middle" ? "middle" : block.align === "end" ? "end" : "start";
    return <g key={key} opacity={opacity} data-scale-text={block.id}>
      {block.lines.map((line, i) => <text key={i} x={x} y={block.rect.y + dy + block.fontPx * 0.92 + i * block.lineStep} textAnchor={anchor}
        fontSize={block.fontPx} fontWeight={block.weight} fontFamily={layout.font.family} fill={colour ?? TEXT_COLOUR[block.role] ?? C.ink}>{line}</text>)}
    </g>;
  };

  /* Compare beat: the smaller item stacked inside the larger one, as many times as the ratio says. */
  const compare = state.beat.kind === "compare" && emphasis ? (() => {
    const beat = state.beat;
    const a = byId.get(beat.a), b = byId.get(beat.b);
    const ratio = scaleRatioReadout(spec, beat.a, beat.b)?.ratio;
    if (!a || !b || !ratio || !Number.isFinite(ratio) || ratio <= 0) return null;
    const [big, small] = ratio >= 1 ? [a, b] : [b, a];
    const times = ratio >= 1 ? ratio : 1 / ratio;
    if (times > MAX_TILES) return null;
    const shown = times * emphasis.amount;
    const pieces: ReactNode[] = [];
    if (big.mark.kind === "bar" && small.mark.kind === "bar" && small.mark.rect.height > 0) {
      const unit = small.mark.rect.height, base = big.mark.rect.y + big.mark.rect.height, inset = big.mark.rect.width * .1;
      for (let k = 0; k < Math.ceil(times) && k < shown; k++) {
        const top = Math.max(big.mark.rect.y, base - (k + 1) * unit), bottom = base - k * unit;
        pieces.push(<rect key={k} x={big.mark.rect.x + inset} y={top + stroke} width={big.mark.rect.width - inset * 2} height={Math.max(0, bottom - top - stroke * 2)}
          rx={Math.min(6, unit * .2)} fill={k % 2 ? C.tileSoft : C.tile} opacity={Math.min(1, shown - k)} />);
      }
    } else if (big.mark.kind === "circle" && small.mark.kind === "circle" && small.mark.r > 0) {
      const r = small.mark.r, left = big.mark.cx - big.mark.r, cy = big.mark.cy;
      const bead = (k: number, key: string, map: (x: number, y: number) => [number, number], scale: number) => {
        const [x, y] = map(left + r * (2 * k + 1), cy);
        return <circle key={key} cx={x} cy={y} r={Math.max(.6, r * .92 * scale)} fill={k % 2 ? C.tileSoft : C.tile} opacity={Math.min(1, shown - k)} />;
      };
      for (let k = 0; k < Math.floor(times) && k < shown; k++) pieces.push(bead(k, `b${k}`, (x, y) => [x, y], 1));
      /* True-scale beads too small to see get a labelled magnifier: same geometry, enlarged by a stated whole factor. */
      if (r * 2 < LOCATOR_RADIUS * 1.4) {
        const lensR = big.mark.r * .42, zoom = Math.max(2, Math.floor(lensR / (7 * r)));
        const focusX = left + r * 4;
        // The lens sits in the free space up and to the left of the large circle, clamped inside the stage.
        const lensX = Math.max(layout.stage.x + lensR + stroke * 2, left - lensR * 1.3), lensY = cy - big.mark.r * .58;
        const map = (x: number, y: number): [number, number] => [lensX + (x - focusX) * zoom, lensY + (y - cy) * zoom];
        const [sx, sy] = map(big.mark.cx, cy);
        const tag = `×${zoom}`, tagSize = layout.font.size * .62, clip = `${uid}-lens`;
        const towardFocus = Math.atan2(cy - lensY, focusX - lensX);
        pieces.push(<g key="lens" opacity={emphasis.amount} data-scale-lens={zoom}>
          <clipPath id={clip}><circle cx={lensX} cy={lensY} r={lensR} /></clipPath>
          <line x1={lensX + Math.cos(towardFocus) * lensR} y1={lensY + Math.sin(towardFocus) * lensR} x2={focusX} y2={cy}
            stroke={C.ink} strokeWidth={stroke * .8} opacity={.45} />
          <circle cx={focusX} cy={cy} r={stroke * 2.2} fill="none" stroke={C.ink} strokeWidth={stroke * .8} opacity={.6} />
          <circle cx={lensX} cy={lensY} r={lensR} fill={C.surface} filter={`url(#${uid}-card)`} />
          <g clipPath={`url(#${clip})`}>
            <circle cx={sx} cy={sy} r={big.mark.r * zoom} fill={`url(#${uid}-mark-radial)`} />
            {Array.from({ length: Math.min(Math.floor(times), 12) }, (_, k) => k < shown ? bead(k, `m${k}`, map, zoom) : null)}
          </g>
          <circle cx={lensX} cy={lensY} r={lensR} fill="none" stroke={C.card} strokeWidth={stroke * 2} />
          <rect x={lensX + lensR * .5} y={lensY - lensR * .98} width={tagSize * 2.6} height={tagSize * 1.5} rx={tagSize * .75} fill={C.ink} />
          <text x={lensX + lensR * .5 + tagSize * 1.3} y={lensY - lensR * .98 + tagSize * 1.08} textAnchor="middle" fontSize={tagSize} fontWeight={700}
            fontFamily={layout.font.family} fill={C.card}>{tag}</text>
        </g>);
      }
    }
    return <g data-scale-compare="">{pieces}</g>;
  })() : null;
  const compareSmall = state.beat.kind === "compare" && emphasis ? (() => {
    const ratio = scaleRatioReadout(spec, state.beat.a, state.beat.b)?.ratio ?? 1;
    return ratio >= 1 ? state.beat.b : state.beat.a;
  })() : undefined;

  const markFill = (item: ScaleLayoutItem) => item.id === compareSmall ? `url(#${uid}-tile)` : `url(#${uid}-mark-${item.mark.kind === "circle" ? "radial" : "linear"})`;
  const panel = layout.panel.byBeat[state.beat.id] ?? [];
  const panelFade = Math.min(1, state.local / 10);
  const badge = layout.badge, ruler = layout.ruler;

  return <div {...props} ref={ref} data-km-scale-comparison="" data-scale-comparison-beat={state.beat.id} data-scale-comparison-status={status}
    style={{ position: "relative", width: "100%", aspectRatio: `${width} / ${height}`, ...style }}>
    <svg viewBox={`0 0 ${width} ${height}`} role="img"
      aria-label={`${spec.title ?? spec.id}. ${spec.items.length} items on one ${spec.scale} scale.`}
      style={{ display: "block", width: "100%", height: "100%", background: C.surface }}>
      <defs>
        <linearGradient id={`${uid}-mark-linear`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: C.markSoft }} /><stop offset="1" style={{ stopColor: C.mark }} />
        </linearGradient>
        <radialGradient id={`${uid}-mark-radial`} cx=".38" cy=".34" r=".75">
          <stop offset="0" style={{ stopColor: C.markSoft }} /><stop offset="1" style={{ stopColor: C.mark }} />
        </radialGradient>
        <linearGradient id={`${uid}-tile`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: C.tileSoft }} /><stop offset="1" style={{ stopColor: C.tile }} />
        </linearGradient>
        <filter id={`${uid}-card`} x="-10%" y="-10%" width="120%" height="130%">
          <feDropShadow dx="0" dy={short * .004} stdDeviation={short * .008} floodColor="#1b2030" floodOpacity=".08" />
        </filter>
      </defs>
      <rect x={0} y={0} width={width} height={height} fill={C.surface} />

      {layout.texts.filter(b => b.role === "eyebrow" || b.role === "title").map(b => renderBlock(b, b.id))}
      {badge ? <g data-scale-badge="">
        <rect x={badge.rect.x - badge.fontPx * .7} y={badge.rect.y - badge.fontPx * .32} width={badge.rect.width + badge.fontPx * 1.4}
          height={badge.rect.height + badge.fontPx * .64} rx={(badge.rect.height + badge.fontPx * .64) / 2} fill={C.mark} opacity={.1} />
        {renderBlock(badge, "badge")}
      </g> : null}

      {layout.scale.ticks.length && layout.items[0]?.mark.kind === "bar" ? layout.scale.ticks.map(t =>
        <line key={`grid-${t.value}`} x1={layout.axis.x0} x2={layout.axis.x1} y1={t.y} y2={t.y} stroke={C.grid} strokeWidth={stroke} />) : null}
      {layout.items[0]?.mark.kind === "dot" ? <>
        <line x1={layout.axis.x0} x2={layout.axis.x1} y1={layout.axis.y} y2={layout.axis.y} stroke={C.baseline} strokeWidth={stroke} strokeLinecap="round" />
        {layout.scale.ticks.map(t => <line key={`tick-${t.value}`} x1={t.x} x2={t.x} y1={layout.axis.y - layout.font.size * .25} y2={layout.axis.y + layout.font.size * .25}
          stroke={C.baseline} strokeWidth={stroke} />)}
      </> : null}
      {layout.scale.ticks.map(t => renderBlock(t.label, `tick-text-${t.value}`))}

      {layout.items.map(item => {
        const reveal = state.reveal[item.id] ?? 0, k = dim(item.id);
        const mark = item.mark;
        let shape: ReactNode, rise = 0;
        if (mark.kind === "bar") {
          const h = mark.rect.height * reveal, r = Math.min(mark.rect.width * .14, 16, h / 2), x = mark.rect.x, w = mark.rect.width, base = mark.rect.y + mark.rect.height;
          rise = mark.rect.height * (1 - reveal);
          shape = h > 0 ? <path d={`M${x} ${base} V${base - h + r} Q${x} ${base - h} ${x + r} ${base - h} H${x + w - r} Q${x + w} ${base - h} ${x + w} ${base - h + r} V${base} Z`}
            fill={markFill(item)} opacity={k} /> : null;
        } else if (mark.kind === "circle") {
          const r = mark.r * reveal, cy = mark.cy + mark.r - r;
          rise = 2 * mark.r * (1 - reveal);
          shape = <>
            {r > 0 ? <circle cx={mark.cx} cy={cy} r={r} fill={markFill(item)} opacity={k} /> : null}
            {mark.r < LOCATOR_RADIUS && reveal > 0 ? <circle cx={mark.cx} cy={mark.cy} r={LOCATOR_RADIUS * 1.8} fill="none" stroke={C.mark}
              strokeWidth={stroke * .8} strokeDasharray={`${stroke * 2} ${stroke * 2}`} opacity={reveal * k * .7} /> : null}
          </>;
        } else {
          shape = <circle cx={mark.cx} cy={mark.cy} r={mark.r * (.4 + .6 * reveal)} fill={item.id === compareSmall ? C.tile : C.mark}
            stroke={C.surface} strokeWidth={stroke * 1.5} opacity={reveal * k} />;
        }
        return <g key={item.id} data-scale-item={item.id}>
          {shape}
          {item.texts.map(block => renderBlock(block, `${item.id}-${block.id}`, reveal * k, block.role === "value" ? rise : 0))}
        </g>;
      })}
      {compare}

      {layout.items.some(i => i.mark.kind !== "dot") ? <line x1={layout.axis.x0 - layout.font.size * .4} x2={layout.axis.x1 + layout.font.size * .4}
        y1={layout.axis.y} y2={layout.axis.y} stroke={C.baseline} strokeWidth={stroke * 1.2} strokeLinecap="round" /> : null}
      {ruler ? <g data-scale-ruler="">
        <line x1={ruler.x0} x2={ruler.x1} y1={ruler.y} y2={ruler.y} stroke={C.ink} strokeWidth={stroke} />
        {[ruler.x0, ruler.x1].map((x, i) => <line key={i} x1={x} x2={x} y1={ruler.y - layout.font.size * .22} y2={ruler.y + layout.font.size * .22} stroke={C.ink} strokeWidth={stroke} />)}
        {renderBlock(ruler.label, "ruler", 1, 0, C.ink)}
      </g> : null}

      {layout.panel.rect.height > 0 && panel.length ? <g data-scale-panel="" opacity={panelFade}>
        <rect {...layout.panel.rect} rx={layout.panel.padding * .7} fill={C.card} stroke={C.rule} strokeWidth={stroke * .6} filter={`url(#${uid}-card)`} />
        {panel.map(block => renderBlock(block, `panel-${block.id}`))}
      </g> : null}
      {layout.footnote ? renderBlock(layout.footnote, "footnote") : null}
    </svg>
  </div>;
});
