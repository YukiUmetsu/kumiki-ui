import { forwardRef, useEffect, useId, useMemo, useRef, useState } from "react";
import type { ComponentPropsWithoutRef } from "react";
import { createCanvasMeasurer } from "../media/text-layout";
import { evaluateMapStage, layoutMapStage } from "./map-stage";
import type { MapScreenPoint, MapStageDiagnostic, MapStageSpec } from "./map-stage";

export interface MapStageViewProps extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  spec: MapStageSpec;
  /** Absolute frame. The view owns no clock. */
  frame: number;
  width: number;
  height: number;
  /** CSS font family for labels, legend and attribution. Pass the same family everywhere, or widths will not match. */
  family?: string;
  onDiagnostics?: (diagnostics: MapStageDiagnostic[]) => void;
}

const TEXT_STACK = 'system-ui, -apple-system, "Segoe UI", sans-serif';

function pathOf(rings: readonly (readonly MapScreenPoint[])[], closed: boolean): string {
  return rings.map(ring => ring.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join("") + (closed ? "Z" : "")).join("");
}

/** Measured map: regions fill by legend key, routes draw by frame, pins carry measured labels, and the legend and attribution are always drawn. */
export const MapStageView = forwardRef<HTMLDivElement, MapStageViewProps>(function MapStageView({
  spec, frame, width, height, family, onDiagnostics, style, ...props
}, ref) {
  const short = Math.min(width, height);
  const css = family ?? TEXT_STACK;
  // Text is measured with the real face: re-measure once web fonts load, and report `pending` until then.
  const [fontEpoch, setFontEpoch] = useState(0);
  const [fontsReady, setFontsReady] = useState(() => typeof document === "undefined" || !document.fonts);
  useEffect(() => {
    const fonts = typeof document !== "undefined" ? document.fonts : undefined;
    if (!fonts) return;
    let live = true;
    const bump = () => { if (!live) return; setFontEpoch(n => n + 1); setFontsReady(fonts.check(`400 32px ${css}`)); };
    void fonts.load(`400 32px ${css}`).then(bump, bump);
    fonts.addEventListener("loadingdone", bump);
    return () => { live = false; fonts.removeEventListener("loadingdone", bump); };
  }, [css]);
  const measure = useMemo(() => { void fontEpoch; return createCanvasMeasurer({}); }, [fontEpoch]);
  const layout = useMemo(() => layoutMapStage(spec, { width, height }, {
    measure, family: css, labelPx: Math.round(short * .03), legendPx: Math.round(short * .026),
    attributionPx: Math.round(short * .024), readablePx: Math.round(short * .024),
  }), [spec, width, height, measure, css, short]);
  const diagnostics = layout.diagnostics;
  const notify = useRef(onDiagnostics), latest = useRef(diagnostics);
  notify.current = onDiagnostics; latest.current = diagnostics;
  const signature = JSON.stringify(diagnostics);
  useEffect(() => { notify.current?.(latest.current); }, [signature]);

  const errors = diagnostics.filter(d => d.severity === "error");
  const refused = errors.length > 0;
  const status = refused ? "error" : fontsReady ? "ready" : "pending";
  const state = refused ? undefined : evaluateMapStage(spec, layout, frame);
  const { label, legend, attribution, viewport } = layout;
  const clip = `km-map-viewport-${useId().replace(/:/g, "")}`;

  return <div {...props} ref={ref} data-km-map-stage="" data-map-stage-beat={state?.beat.id ?? ""} data-map-stage-status={status}
    style={{ position: "relative", width: "100%", aspectRatio: `${width} / ${height}`, ...style }}>
    {state ? <svg viewBox={`0 0 ${width} ${height}`} role="img"
      aria-label={`Map, ${spec.projection} projection, ${spec.collections.reduce((n, c) => n + c.features.length, 0)} features, beat ${state.beat.id}`}
      style={{ display: "block", width: "100%", height: "100%", background: "var(--km-map-surface, #f4f6f9)" }}>
      <rect x={0} y={0} width={width} height={height} fill="var(--km-map-surface, #f4f6f9)" />
      <clipPath id={clip}><rect x={viewport.x} y={viewport.y} width={viewport.width} height={viewport.height} /></clipPath>
      <g clipPath={`url(#${clip})`}>
      {state.features.filter(f => f.visible).map(f => <path key={f.id} data-map-feature={f.id} d={pathOf(f.rings, f.kind === "region")}
        fill={f.kind === "region" ? f.fill : "none"} fillRule="evenodd" strokeLinejoin="round" strokeLinecap="round"
        stroke={f.kind === "region" ? "var(--km-map-stroke, #334155)" : "var(--km-map-border, #7c2d12)"}
        strokeWidth={f.kind === "region" ? short * .0035 : short * .0085} />)}
      {state.routes.filter(r => r.points.length > 1).map(r => <g key={r.id} data-map-route={r.id}>
        <path d={pathOf([r.points], false)} fill="none" stroke={r.color} strokeWidth={short * .008} strokeLinecap="round" strokeLinejoin="round" />
        {r.head ? <circle cx={r.head[0]} cy={r.head[1]} r={short * .012} fill={r.color} stroke="#ffffff" strokeWidth={short * .003} /> : null}
      </g>)}
      {state.pins.filter(p => p.visible).map(p => <g key={p.id} data-map-pin={p.id}>
        <circle cx={p.x} cy={p.y} r={label.markerRadius} fill="var(--km-map-pin, #0f3d66)" stroke="#ffffff" strokeWidth={2} />
        <rect x={p.labelRect.x} y={p.labelRect.y} width={p.labelRect.width} height={p.labelRect.height} rx={label.height * .25}
          fill="var(--km-map-label-surface, #ffffff)" fillOpacity={.92} />
        <text x={p.labelRect.x + label.padX} y={p.labelRect.y + p.labelRect.height / 2} dominantBaseline="central"
          style={{ font: label.font, fill: "var(--km-map-label, #1d232b)", whiteSpace: "pre" }}>{p.text}</text>
      </g>)}
      </g>
      {legend.items.map(item => <g key={item.key} data-map-legend={item.key}>
        <rect x={item.rect.x} y={item.rect.y + (item.rect.height - legend.swatch) / 2} width={legend.swatch} height={legend.swatch} rx={legend.swatch * .2}
          fill={item.color} stroke="var(--km-map-stroke, #334155)" strokeWidth={1} />
        <text x={item.rect.x + legend.swatch + legend.gap} y={item.rect.y + item.rect.height / 2} dominantBaseline="central"
          style={{ font: legend.font, fill: "var(--km-map-label, #1d232b)", whiteSpace: "pre" }}>{item.label}</text>
      </g>)}
      {attribution.lines.map((line, i) => <text key={i} x={attribution.rect.x} dominantBaseline="central"
        y={attribution.rect.y + i * attribution.lineHeight + attribution.lineHeight / 2}
        style={{ font: attribution.font, fill: "var(--km-map-muted, #4b5563)", whiteSpace: "pre" }}>{line}</text>)}
    </svg> : <div role="alert" style={{ position: "absolute", inset: 0, overflow: "auto", padding: 16, boxSizing: "border-box",
      background: "var(--km-map-surface, #f4f6f9)", color: "var(--km-text-danger, #b91c1c)", font: "400 15px/1.5 system-ui, sans-serif" }}>
      <strong>Map refused. No geometry is drawn until these errors are fixed.</strong>
      <ul style={{ margin: "8px 0 0", paddingLeft: 20 }}>{errors.map((d, i) => <li key={i}><code>{d.code}</code> {d.message}</li>)}</ul>
    </div>}
  </div>;
});
