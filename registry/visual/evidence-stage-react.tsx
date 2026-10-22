import { Fragment, forwardRef, useEffect, useId, useMemo, useRef, useState } from "react";
import type { CSSProperties, ComponentPropsWithoutRef, ReactNode } from "react";
import { createCanvasMeasurer } from "../media/text-layout";
import type { MeasureText } from "../media/text-layout";
import MediaFrame from "../media/media-frame";
import type { MediaLoadState } from "../media/media-frame";
import { regionCrop, resolveClipDraw } from "../video/frame-clip";
import type { ClipDraw } from "../video/frame-clip";
import { createInspectableAsset } from "./inspectable-asset";
import { layoutCallouts } from "./semantic-callouts";
import type { CalloutLayout } from "./semantic-callouts";
import { SemanticCalloutOverlay } from "./semantic-callouts-react";
import { evaluateEvidence, layoutEvidenceBox, layoutEvidenceSources, validateEvidenceStage } from "./evidence-stage";
import type { EvidenceBeat, EvidenceBoxLayout, EvidenceDiagnostic, EvidenceSource, EvidenceStageSpec, EvidenceSurface } from "./evidence-stage";
import type { Rect } from "../motion/types";
import { useOptionalShortSafeFrame } from "./short-safe-frame";

export interface EvidenceStageProps extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  spec: EvidenceStageSpec;
  /** Absolute frame. The stage owns no clock. */
  frame: number;
  /** Output box in px; framing is computed for this box. */
  width: number;
  height: number;
  /** Real font measurer for text sources. Default: canvas measurement of each source's font. */
  measure?: MeasureText;
  /** Normalized safe rect for lanes and framing. Default: the enclosing ShortSafeFrame content area, else a 3.5% inset. */
  safe?: Rect;
  onDiagnostics?: (diagnostics: EvidenceDiagnostic[]) => void;
}

const KIND_LABEL: Record<EvidenceSource["kind"], string> = { image: "Photo", text: "Document", table: "Data" };
const C = {
  page: "var(--km-evidence-page, #f7f4ec)", ink: "var(--km-evidence-ink, #1b1f27)", muted: "var(--km-evidence-muted, #5a6271)",
  rule: "var(--km-evidence-rule, #d9d3c4)", mark: "var(--km-evidence-mark, #ffd166)", markInk: "var(--km-evidence-mark-ink, #1b1405)",
  card: "var(--km-evidence-card, rgba(12, 17, 27, 0.9))", cardInk: "var(--km-evidence-card-ink, #f4f7fb)", cardMuted: "var(--km-evidence-card-muted, #a9b6c9)",
};

/** A source drawn in its own surface coordinates (SVG). */
function SurfaceContent({ source, surface, highlight, markers, onImageState }: {
  source: EvidenceSource; surface: EvidenceSurface; highlight: readonly { anchorId: string; amount: number }[];
  markers: readonly { marker: string; anchorId: string }[]; onImageState?: (state: MediaLoadState) => void;
}) {
  const marks = highlight.flatMap(h => (surface.anchorParts[h.anchorId] ?? []).map((r, i) => ({ key: `${h.anchorId}-${i}`, r, amount: h.amount })));
  const markLayer = marks.map(({ key, r, amount }) => <rect key={key} x={r.x - 6} y={r.y + 4} width={r.width + 12} height={r.height - 8} rx={8}
    fill={C.mark} opacity={0.45 * amount} stroke={C.mark} strokeOpacity={amount} strokeWidth={4} />);
  let body: ReactNode;
  if (source.kind === "image") {
    body = <foreignObject width={surface.width} height={surface.height}>
      <MediaFrame media={{ assetId: source.asset.id, fit: "fill", focalPoint: { x: 0.5, y: 0.5 }, mask: { kind: "none" } }} asset={source.asset} alt={source.alt}
        loading="eager" onLoadStateChange={onImageState} style={{ width: surface.width, height: surface.height }} />
    </foreignObject>;
  } else if (source.kind === "text" && surface.text) {
    const t = surface.text;
    body = <>
      <rect width={surface.width} height={surface.height} fill={C.page} rx={18} />
      {markLayer}
      {t.lines.map(line => <text key={line.start} x={t.padding} y={line.y + t.lineHeightPx * 0.68} fill={C.ink} lang={source.lang} style={{ font: t.font, whiteSpace: "pre" }}>{line.text}</text>)}
    </>;
  } else if (source.kind === "table" && surface.table) {
    const t = surface.table;
    body = <>
      <rect width={surface.width} height={surface.height} fill={C.page} rx={18} />
      <rect x={t.padding} y={t.padding} width={surface.width - t.padding * 2} height={t.headerHeight} fill={C.rule} rx={8} />
      {source.rows.map((row, i) => i % 2 ? <rect key={row.id} x={t.padding} y={t.padding + t.headerHeight + i * t.rowHeight} width={surface.width - t.padding * 2} height={t.rowHeight} fill={C.rule} opacity={0.35} /> : null)}
      {markLayer}
      {source.columns.map((col, c) => {
        const x = col.align === "end" ? t.x[c] + col.width - 18 : t.x[c] + 18, anchor = col.align === "end" ? "end" : "start";
        return <Fragment key={col.id}>
          <text x={x} y={t.padding + t.headerHeight * 0.64} textAnchor={anchor} fill={C.ink} style={{ font: t.font.replace(/^\d+/, "700") }}>{col.label}</text>
          {source.rows.map((row, r) => <text key={row.id} x={x} y={t.padding + t.headerHeight + r * t.rowHeight + t.rowHeight * 0.64} textAnchor={anchor} fill={C.ink} style={{ font: t.font }}>{row.cells[col.id] ?? ""}</text>)}
        </Fragment>;
      })}
    </>;
  }
  return <g data-evidence-source={source.id}>
    {body}
    {source.kind === "image" ? markLayer : null}
    {markers.map(m => { const r = surface.anchors[m.anchorId]; if (!r) return null; const size = Math.max(36, Math.min(surface.width, surface.height) * 0.045);
      return <g key={m.marker} transform={`translate(${r.x - size * 0.4} ${r.y - size * 0.6})`}>
        <circle r={size / 2} cx={size / 2} cy={size / 2} fill={C.mark} stroke={C.markInk} strokeWidth={size * 0.06} />
        <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central" fill={C.markInk} style={{ font: `800 ${size * 0.5}px system-ui, sans-serif` }}>{m.marker.replace(/[[\]]/g, "")}</text>
      </g>; })}
  </g>;
}
const transformOf = (d: ClipDraw) => `translate(${d.dx - d.sx * d.scale} ${d.dy - d.sy * d.scale}) scale(${d.scale})`;
const fontStack = "system-ui, -apple-system, 'Segoe UI', sans-serif";

/** Authorized evidence on screen: provenance, exact highlights, callouts and a cited conclusion. Owns no clock. */
export const EvidenceStage = forwardRef<HTMLDivElement, EvidenceStageProps>(function EvidenceStage({
  spec, frame, width, height, measure: measureProp, safe: safeProp, onDiagnostics, style, ...props
}, ref) {
  const measure = useMemo(() => measureProp ?? createCanvasMeasurer({}), [measureProp]);
  const box = useMemo(() => ({ width, height }), [width, height]);
  const frameSafe = useOptionalShortSafeFrame()?.contentRect;
  const safeKey = JSON.stringify(safeProp ?? frameSafe ?? null);
  const safe = useMemo<Rect | undefined>(() => JSON.parse(safeKey) ?? undefined, [safeKey]);
  const layout = useMemo(() => layoutEvidenceSources(spec, measure), [spec, measure]);
  // Lanes depend only on the beat, the box and the fonts: compute once per beat.
  const lanes = useMemo(() => new Map<string, EvidenceBoxLayout>(spec.beats.map(b => [b.id, layoutEvidenceBox(spec, b, box, measure, { safe, fontStack })])), [spec, box, measure, safe]);
  const viewportOf = useMemo(() => (b: EvidenceBeat) => lanes.get(b.id)!.viewport, [lanes]);
  const diagnostics = useMemo(() => [...layout.diagnostics, ...validateEvidenceStage(spec, layout.surfaces, [box], { measure, safe })], [layout, spec, box, measure, safe]);
  const [images, setImages] = useState<Record<string, MediaLoadState>>({});
  const clipId = useId().replace(/:/g, "");
  const state = evaluateEvidence(spec, layout.surfaces, frame, box, viewportOf), lane = lanes.get(state.beat.id)!;
  const source = spec.sources.find(s => s.id === state.sourceId), surface = state.sourceId ? layout.surfaces[state.sourceId] : undefined;

  // Callouts: anchors become an InspectableAsset in surface px, projected through the current crop.
  const callouts: CalloutLayout = useMemo(() => {
    if (!surface || !state.draw || !state.callouts.length) return { callouts: [], diagnostics: [] };
    const ids = Object.keys(surface.anchors), d = state.draw;
    const asset = createInspectableAsset({ id: `evidence-${surface.sourceId}`.replace(/[^A-Za-z0-9._:-]/g, "-"), dimension: 2, revision: "1",
      parts: ids.map(id => ({ id })), anchors: ids.map(id => ({ id: `${id}.label`, partId: id, kind: "label" as const })),
      capabilities: { sectioning: "none", explodable: false, canGhost: false, flowPorts: false, stateful: false } }, {
      bounds: id => { const r = surface.anchors[id]; return { min: [r.x, r.y], max: [r.x + r.width, r.y + r.height] }; },
      anchor: id => { const r = surface.anchors[id.replace(/\.label$/, "")]; return { position: [r.x + r.width / 2, r.y + r.height / 2] }; },
    });
    const size = Math.round(Math.min(width, height) * 0.032);
    const toBox = (r: Rect) => ({ x: d.dx + (r.x - d.sx) * d.scale, y: d.dy + (r.y - d.sy) * d.scale, width: r.width * d.scale, height: r.height * d.scale });
    // Documents and tables are never covered: the whole visible page is protected, so labels use the note lane.
    // Photos protect the cited regions and their context only.
    const vp = lane.viewport, page = toBox({ x: 0, y: 0, width: surface.width, height: surface.height });
    const visiblePage = { x: Math.max(vp.x, page.x), y: Math.max(vp.y, page.y), width: Math.min(vp.x + vp.width, page.x + page.width) - Math.max(vp.x, page.x), height: Math.min(vp.y + vp.height, page.y + page.height) - Math.max(vp.y, page.y) };
    const protectedRegions = [...(surface.kind === "image" ? state.highlight.map(h => surface.context[h.anchorId]).filter(Boolean).map(toBox) : [visiblePage]), ...(lane.provenance ? [lane.provenance.rect] : [])];
    return layoutCallouts({ asset, frame: state.local, viewport: box, occluded: () => false, protectedRegions, leaders: [28, 64, 120, 200, 320, 480, 640],
      callouts: state.callouts.map((c, i) => ({ id: `${state.beat.id}-${i}`, anchorId: `${c.anchorId}.label`, title: c.title, detail: c.detail, window: { startFrame: 0, endFrame: Number.MAX_SAFE_INTEGER } })),
      project: ([x, y]) => ({ x: d.dx + (x - d.sx) * d.scale, y: d.dy + (y - d.sy) * d.scale, inView: true }),
      typography: { titleFont: `700 ${size}px ${fontStack}`, titleSizePx: size, detailFont: `500 ${Math.round(size * 0.8)}px ${fontStack}`, detailSizePx: Math.round(size * 0.8), maxWidthPx: Math.round(width * 0.46), measure } });
  }, [surface, state.draw, state.callouts, state.highlight, state.beat.id, state.local, box, width, height, measure, lane]);

  // Callouts that cannot be placed are reported, never silently dropped.
  const reported = useMemo(() => [...diagnostics, ...callouts.diagnostics.filter(d => d.severity !== "info").map(d => ({
    code: d.code === "unplaceable" ? "evidence-callout-unplaceable" : `evidence-callout-${d.code}`, severity: "warning" as const,
    message: `Beat "${state.beat.id}" in ${width}×${height}: ${d.message}`, sourceId: state.sourceId }))], [diagnostics, callouts, state.beat.id, state.sourceId, width, height]);
  const notify = useRef(onDiagnostics), latest = useRef(reported);
  notify.current = onDiagnostics; latest.current = reported;
  const signature = JSON.stringify(reported);
  useEffect(() => { notify.current?.(latest.current); }, [signature]);
  const imageState = source?.kind === "image" ? images[source.id] ?? "loading" : "loaded";
  const status = diagnostics.some(d => d.severity === "error") || imageState === "error" ? "error" : imageState !== "loaded" ? "pending" : "ready";
  const card: CSSProperties = { position: "absolute", background: C.card, color: C.cardInk, borderRadius: "1.2cqmin", boxSizing: "border-box", fontFamily: fontStack };
  const conclusion = spec.conclusion;
  return <div {...props} ref={ref} data-km-evidence-stage="" data-evidence-beat={state.beat.id} data-evidence-status={status}
    style={{ position: "relative", width: "100%", aspectRatio: `${width} / ${height}`, containerType: "size", overflow: "hidden", background: "var(--km-evidence-bg, #0f1726)", ...style }}>
    <svg viewBox={`0 0 ${width} ${height}`} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} role="img"
      aria-label={source ? `${KIND_LABEL[source.kind]}: ${source.provenance.title}${source.kind === "image" ? `. ${source.alt}` : ""}` : "Conclusion"}>
      <defs><clipPath id={`${clipId}-vp`}><rect {...lane.viewport} /></clipPath></defs>
      {source && surface && state.draw ? <g clipPath={`url(#${clipId}-vp)`}><g transform={transformOf(state.draw)}>
        <SurfaceContent source={source} surface={surface} highlight={state.highlight} markers={state.markers}
          onImageState={s => setImages(prev => prev[source.id] === s ? prev : { ...prev, [source.id]: s })} />
      </g></g> : null}
      {lane.provenance ? <g data-evidence-provenance="">
        <rect {...lane.provenance.rect} rx={lane.provenance.padding * 0.8} fill={C.card} />
        {(() => { let y = lane.provenance.rect.y + lane.provenance.padding;
          return lane.provenance.lines.map((l, i) => { const baseline = y + l.lineHeightPx * 0.76; y += l.lineHeightPx;
            return <text key={i} x={lane.provenance!.rect.x + lane.provenance!.padding} y={baseline} fill={l.tone === "title" ? C.cardInk : C.cardMuted} style={{ font: l.font, whiteSpace: "pre" }}>{l.text}</text>; }); })()}
      </g> : null}
    </svg>
    <SemanticCalloutOverlay layout={callouts} width={width} height={height} />
    {conclusion && state.conclusion > 0 ? <div data-evidence-conclusion="" style={{ ...card, inset: state.sourceId ? "auto 4cqw 3cqh 4cqw" : "8cqh 4cqw", opacity: state.conclusion,
      padding: "2.4cqmin", display: "grid", gap: "2cqmin", alignContent: "center" }}>
      <div style={{ font: `700 min(3.6cqw, 3.6cqh)/1.3 ${fontStack}` }}>
        {conclusion.text.split(/(\[[^\]]+\])/g).map((part, i) => /^\[[^\]]+\]$/.test(part)
          ? <span key={i} style={{ display: "inline-block", minWidth: "1.4em", textAlign: "center", margin: "0 0.12em", borderRadius: "0.6em", background: C.mark, color: C.markInk, font: `800 0.7em/1.5 ${fontStack}`, verticalAlign: "0.25em" }}>{part.replace(/[[\]]/g, "")}</span>
          : <Fragment key={i}>{part}</Fragment>)}
      </div>
      {state.sourceId ? null : <div style={{ display: "grid", gridTemplateColumns: `repeat(${width > height ? Math.min(3, conclusion.citations.length) : 1}, 1fr)`, gap: "1.6cqmin" }}>
        {conclusion.citations.map(c => {
          const s = spec.sources.find(x => x.id === c.sourceId), surf = layout.surfaces[c.sourceId], r = surf?.context[c.anchorId];
          if (!s || !surf || !r) return null;
          const thumb = width > height ? { width: 400, height: 260 } : { width: 800, height: 340 }, draw = resolveClipDraw(surf, thumb, { crop: regionCrop(surf, thumb, r, 0.5), fit: "contain" });
          return <figure key={c.marker} style={{ margin: 0, display: "grid", gap: "0.8cqmin" }}>
            <svg viewBox={`0 0 ${thumb.width} ${thumb.height}`} style={{ width: "100%", borderRadius: "1cqmin", background: "#0b111c" }} aria-hidden="true">
              <g transform={transformOf(draw)}><SurfaceContent source={s} surface={surf} highlight={[{ anchorId: c.anchorId, amount: 1 }]} markers={[{ marker: c.marker, anchorId: c.anchorId }]}
                onImageState={st => setImages(prev => prev[s.id] === st ? prev : { ...prev, [s.id]: st })} /></g>
            </svg>
            <figcaption style={{ font: `500 min(1.8cqw, 1.8cqh)/1.3 ${fontStack}`, color: C.cardMuted }}>{c.marker} {s.provenance.title} · {s.provenance.locator}</figcaption>
          </figure>;
        })}
      </div>}
    </div> : null}
  </div>;
});
