import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import type { ComponentPropsWithoutRef } from "react";
import { createCanvasMeasurer } from "../media/text-layout";
import type { Rect } from "../motion/types";
import {
  evaluateGraphStage, GRAPH_LABEL_FAMILY, prepareGraphStage, wrapGraphText,
} from "./graph-topology-stage";
import type { GraphStageDiagnostic, GraphStageSpec } from "./graph-topology-stage";

export interface GraphTopologyStageViewProps extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  spec: GraphStageSpec;
  /** Absolute frame. The view owns no clock. */
  frame: number;
  width: number;
  height: number;
  /** Normalized safe rect of the output. Default: 6% horizontal, 5% vertical inset. */
  safe?: Rect;
  /** Label size in px. Default: 3.4% of the short side. */
  fontPx?: number;
  /** CSS font family for labels. Pass the same value to every stage so measurements match. */
  family?: string;
  onDiagnostics?: (diagnostics: GraphStageDiagnostic[]) => void;
}

const PALETTE = ["#2f5f8a", "#b4572b", "#2e7d5b", "#7b4fa3", "#a8862a", "#3a7f8f", "#a33f6b", "#5d6b3a"];
const colourOf = (index: number) => `var(--km-graph-${(index % PALETTE.length) + 1}, ${PALETTE[index % PALETTE.length]})`;
const INK = "var(--km-text-primary, #1f2937)";
const MUTED = "var(--km-text-muted, #5b6472)";
const EDGE = "var(--km-graph-edge, #7a8594)";
const GROUP = "var(--km-graph-group, #64748b)";
const SURFACE = "var(--km-surface-canvas, #f6f7f9)";
const HALO = "var(--km-surface-canvas, #f6f7f9)";

const hull = (points: readonly { x: number; y: number }[]) =>
  points.length ? `M ${points.map(p => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" L ")} Z` : "";

/** Directed links get an arrowhead at their trimmed end. Sized from the stroke so thin and thick links read alike. */
function arrowhead(x1: number, y1: number, x2: number, y2: number, strokePx: number) {
  const dx = x2 - x1, dy = y2 - y1, length = Math.hypot(dx, dy);
  if (length < 1e-6) return "";
  const ux = dx / length, uy = dy / length, nx = -uy, ny = ux;
  const size = Math.max(12, strokePx * 2.6), half = size * 0.5;
  const bx = x2 - ux * size, by = y2 - uy * size;
  return `${x2.toFixed(2)},${y2.toFixed(2)} ${(bx + nx * half).toFixed(2)},${(by + ny * half).toFixed(2)} ${(bx - nx * half).toFixed(2)},${(by - ny * half).toFixed(2)}`;
}

/** Measured, frame-addressed topology: layouts are computed once per spec, transitions move nodes by id,
 * traversals reveal in visit order, and the legend shows colours, groups and the weight scale. */
export const GraphTopologyStageView = forwardRef<HTMLDivElement, GraphTopologyStageViewProps>(function GraphTopologyStageView({
  spec, frame, width, height, safe, fontPx, family, onDiagnostics, style, ...props
}, ref) {
  // Text is measured with the real face: re-measure once web fonts load, and report `pending` until then.
  const [fontEpoch, setFontEpoch] = useState(0);
  const [fontsReady, setFontsReady] = useState(() => typeof document === "undefined" || !document.fonts);
  const css = family ?? GRAPH_LABEL_FAMILY;
  useEffect(() => {
    const fonts = typeof document !== "undefined" ? document.fonts : undefined;
    if (!fonts) return;
    let live = true;
    const bump = () => { if (!live) return; setFontEpoch(n => n + 1); setFontsReady(fonts.check(`500 32px ${css}`)); };
    void fonts.load(`500 32px ${css}`).then(bump, bump);
    fonts.addEventListener("loadingdone", bump);
    return () => { live = false; fonts.removeEventListener("loadingdone", bump); };
  }, [css]);
  const measure = useMemo(() => { void fontEpoch; return createCanvasMeasurer({}); }, [fontEpoch]);
  const prepared = useMemo(() => prepareGraphStage(spec, {
    width, height, measure, family: css, safe, fontPx,
  }), [spec, width, height, measure, css, safe, fontPx]);
  const diagnostics = prepared.diagnostics;
  const notify = useRef(onDiagnostics), latest = useRef(diagnostics);
  notify.current = onDiagnostics; latest.current = diagnostics;
  const signature = JSON.stringify(diagnostics);
  useEffect(() => { notify.current?.(latest.current); }, [signature]);

  const state = evaluateGraphStage(prepared, frame);
  const px = prepared.fontPx;
  const status = prepared.status === "error" ? "error" : fontsReady ? "ready" : "pending";
  const labelFont = `500 ${px}px ${css}`;
  const captionFontPx = Math.round(px * 0.8);
  const lineStep = px * 1.2;
  const caption = prepared.bands.caption;
  const refusal = state.status === "error" ? wrapGraphText(state.summary, width * .8, `500 ${Math.round(px * .8)}px ${css}`, measure) : [];

  return <div {...props} ref={ref} data-km-graph-topology="" data-graph-topology-beat={state.beatId} data-graph-topology-status={status}
    style={{ position: "relative", width: "100%", aspectRatio: `${width} / ${height}`, ...style }}>
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Graph topology. ${state.summary}`}
      style={{ display: "block", width: "100%", height: "100%", background: SURFACE }}>
      <rect x={0} y={0} width={width} height={height} style={{ fill: SURFACE }} />
      {caption && state.caption.length ? <text style={{ font: `400 ${captionFontPx}px ${css}`, fill: INK }}>
        {state.caption.map((line, i) => <tspan key={i} x={caption.x} y={caption.y + captionFontPx * 1.1 + i * captionFontPx * 1.25}>{line}</tspan>)}
      </text> : null}
      {refusal.length ? <text style={{ font: `500 ${Math.round(px * .8)}px ${css}`, fill: "var(--km-text-danger, #b91c1c)" }}>
        {refusal.map((line, i) => <tspan key={i} x={width * .1} y={height * .3 + i * px * 1.3}>{line}</tspan>)}
      </text> : null}
      {state.clusters.map(cluster => <g key={cluster.id}>
        <path d={hull(cluster.points)} strokeDasharray={`${px * .4} ${px * .3}`} strokeLinejoin="round"
          style={{ fill: GROUP, opacity: cluster.opacity, stroke: GROUP, strokeWidth: 2, strokeOpacity: Math.min(1, cluster.labelOpacity) }} />
        <text x={cluster.labelAt.x} y={cluster.labelAt.y} textAnchor="middle" opacity={cluster.labelOpacity}
          style={{ font: `600 ${Math.round(px * .8)}px ${css}`, fill: MUTED, stroke: HALO, strokeWidth: px * .18, paintOrder: "stroke" }}>{cluster.label}</text>
      </g>)}
      {state.edges.map(edge => <g key={edge.id} opacity={edge.opacity}>
        <line x1={edge.x1} y1={edge.y1} x2={edge.x2} y2={edge.y2} strokeLinecap="round"
          style={{ stroke: EDGE }} strokeWidth={edge.strokePx} />
        {edge.directed ? <polygon points={arrowhead(edge.x1, edge.y1, edge.x2, edge.y2, edge.strokePx)} style={{ fill: EDGE }} /> : null}
      </g>)}
      {state.edges.map(edge => edge.weightText ? <text key={`${edge.id}-weight`} x={edge.labelAt.x} y={edge.labelAt.y}
        textAnchor="middle" dominantBaseline="central" opacity={edge.labelOpacity}
        style={{ font: labelFont, fill: INK, stroke: HALO, strokeWidth: px * .2, paintOrder: "stroke", strokeLinejoin: "round" }}>{edge.weightText}</text> : null)}
      {state.nodes.map(node => <g key={node.id} opacity={node.opacity}>
        <circle cx={node.x} cy={node.y} r={node.radius} style={{ fill: colourOf(node.colour), stroke: HALO, strokeWidth: 3 }} />
        <text x={node.labelAlign === "start" ? node.labelBox.x : node.x} y={node.labelBox.y + px * .95}
          textAnchor={node.labelAlign === "start" ? "start" : "middle"}
          style={{ font: labelFont, fill: INK, stroke: HALO, strokeWidth: px * .2, paintOrder: "stroke", strokeLinejoin: "round" }}>
          {node.lines.map((line, i) => <tspan key={i} x={node.labelAlign === "start" ? node.labelBox.x : node.x} dy={i === 0 ? 0 : lineStep}>{line}</tspan>)}
        </text>
        {node.visit !== undefined ? (() => {
          const side = node.labelAlign === "start" ? -1 : 1;
          const bx = node.x + side * node.radius * .9, by = node.y - node.radius * .9;
          return <g>
            <circle cx={bx} cy={by} r={px * .55} style={{ fill: INK, stroke: HALO, strokeWidth: 2 }} />
            <text x={bx} y={by} textAnchor="middle" dominantBaseline="central" style={{ font: `700 ${Math.round(px * .7)}px ${css}`, fill: HALO }}>{node.visit}</text>
          </g>;
        })() : null}
      </g>)}
      {prepared.legendLayout.swatches.map(swatch => <g key={`${swatch.kind}-${swatch.id}`}>
        {swatch.kind === "type"
          ? <circle cx={swatch.x + prepared.legendLayout.dotRadius} cy={swatch.y} r={prepared.legendLayout.dotRadius} style={{ fill: colourOf(swatch.colour) }} />
          : <circle cx={swatch.x + prepared.legendLayout.dotRadius} cy={swatch.y} r={prepared.legendLayout.dotRadius * 1.3} fill="none"
              strokeDasharray={`${px * .15} ${px * .12}`} style={{ stroke: GROUP, strokeWidth: 2 }} />}
        <text x={swatch.labelX} y={swatch.y} dominantBaseline="central" style={{ font: prepared.legendLayout.font, fill: MUTED }}>{swatch.label}</text>
      </g>)}
      {prepared.legendLayout.weight ? <g>
        {prepared.legendLayout.weight.samples.map((sample, i) => <g key={i}>
          <line x1={sample.x} y1={sample.y} x2={sample.x + sample.length} y2={sample.y} strokeLinecap="round" strokeWidth={sample.strokePx} style={{ stroke: EDGE }} />
          <text x={sample.labelX} y={sample.y} dominantBaseline="central" style={{ font: prepared.legendLayout.font, fill: MUTED }}>{sample.label}</text>
        </g>)}
        <text x={prepared.legendLayout.weight.captionX} y={prepared.legendLayout.weight.y} dominantBaseline="central"
          style={{ font: prepared.legendLayout.font, fill: MUTED }}>{prepared.legendLayout.weight.caption}</text>
      </g> : null}
    </svg>
  </div>;
});
