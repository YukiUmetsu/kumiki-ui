import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import type { ComponentPropsWithoutRef } from "react";
import { createCanvasMeasurer } from "../media/text-layout";
import {
  CAUSAL_FONT_FAMILY, evaluateCausalSystem, layoutCausalStage, validateCausalSystem,
} from "./causal-system-stage";
import type {
  CausalDiagnostic, CausalDiagram, CausalFrame, CausalLegendItem, CausalMetrics, CausalStageLayout, CausalSystemSpec,
  CausalTag, CausalTextLine, EffectKind,
} from "./causal-system-stage";

export interface CausalSystemStageViewProps extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  spec: CausalSystemSpec;
  /** Absolute frame. The view owns no clock. */
  frame: number;
  /** Output raster. Portrait stacks counterfactual panels; landscape places them side by side. */
  width: number;
  height: number;
  /** CSS family for measuring and rendering. Pass the same family everywhere, or widths will not match. */
  family?: string;
  onDiagnostics?: (diagnostics: CausalDiagnostic[]) => void;
}

const colour = (token: string, fallback: string) => `var(${token}, ${fallback})`;
const INK = colour("--km-causal-ink", "#1d232b");
const MUTED = colour("--km-causal-muted", "#5b6472");
const FAINT = colour("--km-causal-faint", "#9aa3b0");
const ACCENT = colour("--km-causal-accent", "#2f5f8a");
const SURFACE = colour("--km-causal-surface", "#ffffff");
const CANVAS = colour("--km-causal-canvas", "#f4f5f7");
const RULE = colour("--km-causal-rule", "#d5dbe3");
const RISE = colour("--km-causal-rise", "#1f7a4d");
const FALL = colour("--km-causal-fall", "#a4530f");
const AMBIGUOUS = colour("--km-causal-ambiguous", "#7b3fb0");

const CHIP: Partial<Record<EffectKind, { glyph: string; fill: string }>> = {
  increase: { glyph: "↑", fill: RISE },
  decrease: { glyph: "↓", fill: FALL },
  ambiguous: { glyph: "?", fill: AMBIGUOUS },
  unknown: { glyph: "?", fill: AMBIGUOUS },
};

/** Verb chips use words, never +/− symbols: "raises", "reduces", "moves with", "moves against", "unsigned". */
const VERB_TONE: Record<"raises" | "reduces" | "association" | "unsigned", string> = {
  raises: RISE, reduces: FALL, association: MUTED, unsigned: AMBIGUOUS,
};

interface DiagramLayerProps {
  diagram: CausalDiagram;
  m: CausalMetrics;
  frame: CausalFrame;
  visible: Readonly<Record<string, number>>;
  cut: Readonly<Record<string, number>>;
  intervention?: CausalFrame["intervention"];
  tag?: CausalTag;
  testId: string;
}

/** One diagram: links, verb chips, cards, effect chips, the do() tag and the active loop badge. */
function DiagramLayer({ diagram, m, frame, visible, cut, intervention, tag, testId }: DiagramLayerProps) {
  const loop = frame.activeLoop;
  const loopLinks = new Set(loop?.loop.linkIds ?? []), loopNodes = new Set(loop?.loop.nodeIds ?? []);
  const loopBadge = loop ? diagram.loops.get(loop.loop.id) : undefined;
  return <g data-causal-layer={testId}>
    {diagram.edges.map(edge => {
      const vis = visible[edge.id] ?? 0;
      if (vis < 0.01) return null;
      const cutAmount = cut[edge.id] ?? 0;
      const hot = Math.max(frame.linkEmphasis[edge.id] ?? 0, loopLinks.has(edge.id) ? loop?.amount ?? 0 : 0);
      const stroke = hot > 0.02 ? ACCENT : edge.style === "association" ? FAINT : INK;
      const width = m.edge + (m.edgeEmphasis - m.edge) * hot;
      const dash = edge.style === "association" ? `${m.edge * 4} ${m.edge * 3}` : edge.style === "assumed" ? `0.1 ${m.edge * 2.6}` : undefined;
      const cap = edge.style === "assumed" ? "round" : "butt";
      const tone = VERB_TONE[edge.verb.tone];
      return <g key={edge.id} data-causal-edge={edge.id} data-causal-style={edge.style} opacity={vis}>
        <path d={edge.d} fill="none" stroke={stroke} strokeWidth={width} strokeDasharray={dash} strokeLinecap={cap} strokeLinejoin="round" />
        {edge.arrow ? <polygon points={`${edge.arrow.tip.x},${edge.arrow.tip.y} ${edge.arrow.left.x},${edge.arrow.left.y} ${edge.arrow.right.x},${edge.arrow.right.y}`}
          fill={stroke} /> : null}
        {cutAmount > 0.01 ? <g opacity={cutAmount} stroke={MUTED} strokeWidth={m.edge * 1.6} strokeLinecap="round" data-causal-cut={edge.id}>
          {(() => {
            const a = edge.points[0], b = edge.points[edge.points.length - 1];
            const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
            const ux = (b.x - a.x) / len, uy = (b.y - a.y) / len, nx = -uy, ny = ux;
            const half = m.signR * .9, gap = m.edge * 2.6;
            return <>
              <line x1={edge.mid.x - ux * gap / 2 + nx * half} y1={edge.mid.y - uy * gap / 2 + ny * half}
                x2={edge.mid.x - ux * gap / 2 - nx * half} y2={edge.mid.y - uy * gap / 2 - ny * half} />
              <line x1={edge.mid.x + ux * gap / 2 + nx * half} y1={edge.mid.y + uy * gap / 2 + ny * half}
                x2={edge.mid.x + ux * gap / 2 - nx * half} y2={edge.mid.y + uy * gap / 2 - ny * half} />
            </>;
          })()}
        </g> : null}
        <g data-causal-verb={edge.id} data-causal-tone={edge.verb.tone}>
          <rect x={edge.verb.rect.x} y={edge.verb.rect.y} width={edge.verb.rect.width} height={edge.verb.rect.height}
            rx={edge.verb.rect.height / 2} fill={SURFACE} stroke={tone} strokeWidth={m.rule * 1.5} />
          <text data-causal-text="verb" x={edge.verb.center.x} y={edge.verb.center.y} textAnchor="middle" dominantBaseline="central"
            fill={tone} style={{ font: m.font.verb }}>{edge.verb.text}</text>
        </g>
      </g>;
    })}
    {diagram.nodes.map(node => {
      const fixed = intervention?.nodeId === node.id ? intervention.amount : 0;
      const outside = loop && !loopNodes.has(node.id) ? 1 - .5 * loop.amount : 1;
      const effect = intervention && node.id !== intervention.nodeId ? intervention.effects[node.id] : undefined;
      const chip = effect ? CHIP[effect] : undefined;
      const chipOpacity = intervention && effect ? intervention.amount : 0;
      const r = node.rect;
      return <g key={node.id} data-causal-node={node.id} data-causal-effect={effect ?? "none"} opacity={outside}>
        <rect x={r.x} y={r.y} width={r.width} height={r.height} rx={m.radius} fill={SURFACE} stroke={RULE} strokeWidth={m.rule} />
        {fixed > 0 ? <rect x={r.x} y={r.y} width={r.width} height={r.height} rx={m.radius} fill={ACCENT} opacity={fixed} /> : null}
        {node.lines.map((line, i) => <text key={i} data-causal-text="label" x={line.x} y={line.y} textAnchor="middle"
          fill={fixed > .5 ? "#ffffff" : INK} style={{ font: m.font.label }}>{line.text}</text>)}
        {chip && chipOpacity > 0.01 ? <g opacity={chipOpacity} data-causal-chip={node.id}>
          <circle cx={node.chip.center.x} cy={node.chip.center.y} r={node.chip.r} fill={chip.fill} stroke={SURFACE} strokeWidth={m.rule * 2} />
          <text data-causal-text="chip" x={node.chip.center.x} y={node.chip.center.y} textAnchor="middle" dominantBaseline="central"
            fill="#ffffff" style={{ font: m.font.chip }}>{chip.glyph}</text>
        </g> : null}
      </g>;
    })}
    {tag && intervention && intervention.amount > 0.01 ? <g opacity={intervention.amount} data-causal-tag={tag.nodeId}>
      <rect x={tag.rect.x} y={tag.rect.y} width={tag.rect.width} height={tag.rect.height} rx={tag.rect.height / 2} fill={ACCENT} />
      <text data-causal-text="tag" x={tag.textX} y={tag.textY} fill="#ffffff" style={{ font: m.font.tag }}>{tag.text}</text>
    </g> : null}
    {loopBadge && loop ? <g opacity={loop.amount} data-causal-loop={loopBadge.loopId}>
      <rect x={loopBadge.rect.x} y={loopBadge.rect.y} width={loopBadge.rect.width} height={loopBadge.rect.height} rx={loopBadge.rect.height / 2} fill={ACCENT} />
      <text data-causal-text="loop" x={loopBadge.textX} y={loopBadge.textY} textAnchor="middle" fill="#ffffff" style={{ font: m.font.loop }}>{loopBadge.text}</text>
    </g> : null}
  </g>;
}

function Legend({ items, m }: { items: readonly CausalLegendItem[]; m: CausalMetrics }) {
  return <g data-causal-legend="">
    {items.map(item => {
      const { x0, x1, y } = item.sample;
      const mid = (x0 + x1) / 2;
      const head = (from: { x: number; y: number }, tip: { x: number; y: number }, fill: string) => {
        const dx = tip.x - from.x, dy = tip.y - from.y, len = Math.hypot(dx, dy) || 1;
        const ux = dx / len, uy = dy / len, bx = tip.x - ux * m.arrowLength, by = tip.y - uy * m.arrowLength;
        return <polygon points={`${tip.x},${tip.y} ${bx - uy * m.arrowHalf},${by + ux * m.arrowHalf} ${bx + uy * m.arrowHalf},${by - ux * m.arrowHalf}`} fill={fill} stroke="none" />;
      };
      const sample = (() => {
        switch (item.key) {
          case "causal": return <g stroke={INK} strokeWidth={m.edge * 1.2}><line x1={x0} y1={y} x2={x1 - m.arrowLength * .6} y2={y} />
            <polygon points={`${x1},${y} ${x1 - m.arrowLength},${y - m.arrowHalf} ${x1 - m.arrowLength},${y + m.arrowHalf}`} fill={INK} stroke="none" /></g>;
          case "association": return <line x1={x0} y1={y} x2={x1} y2={y} stroke={FAINT} strokeWidth={m.edge * 1.2} strokeDasharray={`${m.edge * 4} ${m.edge * 3}`} />;
          case "assumed": return <g stroke={INK} strokeWidth={m.edge * 1.6} strokeLinecap="round"><line x1={x0} y1={y} x2={x1 - m.arrowLength * .6} y2={y} strokeDasharray={`0.1 ${m.edge * 2.6}`} />
            <polygon points={`${x1},${y} ${x1 - m.arrowLength},${y - m.arrowHalf} ${x1 - m.arrowLength},${y + m.arrowHalf}`} fill={INK} stroke="none" /></g>;
          case "raises": return <g stroke={RISE} strokeWidth={m.edge * 1.6} strokeLinecap="round">
            <line x1={x0} y1={y + m.arrowHalf} x2={x1 - m.arrowLength * .6} y2={y - m.arrowHalf + m.arrowLength * .6} />
            {head({ x: x0, y: y + m.arrowHalf }, { x: x1, y: y - m.arrowHalf }, RISE)}</g>;
          case "reduces": return <g stroke={FALL} strokeWidth={m.edge * 1.6} strokeLinecap="round">
            <line x1={x0} y1={y - m.arrowHalf} x2={x1 - m.arrowLength * .6} y2={y + m.arrowHalf - m.arrowLength * .6} />
            {head({ x: x0, y: y - m.arrowHalf }, { x: x1, y: y + m.arrowHalf }, FALL)}</g>;
          case "chip": return <g><circle cx={mid} cy={y} r={m.chipR * .85} fill={RISE} />
            <text x={mid} y={y} textAnchor="middle" dominantBaseline="central" fill="#ffffff" style={{ font: m.font.chip }}>{"↑"}</text></g>;
          case "cut": return <g stroke={MUTED} strokeWidth={m.edge * 1.2} strokeLinecap="round" opacity={.8}>
            <line x1={x0} y1={y} x2={x1} y2={y} strokeOpacity={.4} />
            <line x1={mid - m.edge * 1.5} y1={y - m.signR * .8} x2={mid - m.edge * 1.5} y2={y + m.signR * .8} />
            <line x1={mid + m.edge * 1.5} y1={y - m.signR * .8} x2={mid + m.edge * 1.5} y2={y + m.signR * .8} /></g>;
        }
      })();
      return <g key={item.key} data-causal-legend-item={item.key}>
        {sample}
        <text data-causal-text="legend" x={item.textX} y={item.y} fill={MUTED} style={{ font: m.font.legend }}>{item.text}</text>
      </g>;
    })}
  </g>;
}

function Lines({ lines, font, fill, testId, opacity = 1 }: { lines: readonly CausalTextLine[]; font: string; fill: string; testId: string; opacity?: number }) {
  return <>{lines.map((line, i) => <text key={i} data-causal-text={testId} x={line.x} y={line.y} fill={fill} opacity={opacity} style={{ font }}>{line.text}</text>)}</>;
}

/** Causal model rendered from measured layers: verb chips carry the direction in words, evidence sets the link style,
 * and interventions, counterfactual panels, readout and loop badges are drawn from the same frame state. */
export const CausalSystemStageView = forwardRef<HTMLDivElement, CausalSystemStageViewProps>(function CausalSystemStageView({
  spec, frame, width, height, family, onDiagnostics, style, ...props
}, ref) {
  // Text is measured with the real face: re-measure when web fonts load, and report `pending` until then.
  const [fontEpoch, setFontEpoch] = useState(0);
  const [fontsReady, setFontsReady] = useState(() => typeof document === "undefined" || !document.fonts);
  const css = family ?? CAUSAL_FONT_FAMILY;
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
  const layout: CausalStageLayout = useMemo(() => layoutCausalStage(spec, { width, height }, { measure, family: css }),
    [spec, width, height, measure, css]);
  const diagnostics = useMemo(() => {
    const all = [...validateCausalSystem(spec), ...layout.diagnostics];
    const seen = new Set<string>();
    return all.filter(d => { const key = `${d.code}|${d.message}`; if (seen.has(key)) return false; seen.add(key); return true; });
  }, [spec, layout]);
  const notify = useRef(onDiagnostics), latest = useRef(diagnostics);
  notify.current = onDiagnostics; latest.current = diagnostics;
  const signature = JSON.stringify(diagnostics);
  useEffect(() => { notify.current?.(latest.current); }, [signature]);

  const state = evaluateCausalSystem(spec, frame);
  const m = layout.metrics;
  const status = diagnostics.some(d => d.severity === "error") ? "error" : fontsReady ? "ready" : "pending";
  const beatId = state.beat.id;
  const counter = state.beat.kind === "counterfactual";
  const readout = layout.readout.beats.get(beatId);
  const tag = layout.tags.get(beatId);
  const panelTag = counter ? tag : undefined;
  const fullTag = counter ? undefined : tag;
  const fullIntervention = counter ? undefined : state.intervention;
  const branchIntervention = counter ? state.intervention : undefined;
  const r = layout.readout.rect;
  return <div {...props} ref={ref} data-km-causal-system-stage="" data-causal-beat={beatId} data-causal-status={status}
    style={{ position: "relative", width: "100%", aspectRatio: `${width} / ${height}`, ...style }}>
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${spec.title}. ${spec.modelNote}.`}
      style={{ display: "block", width: "100%", height: "100%", background: CANVAS }}>
      <Lines lines={layout.eyebrow} font={m.font.eyebrow} fill={MUTED} testId="eyebrow" />
      <Lines lines={layout.title} font={m.font.title} fill={INK} testId="title" />
      <g data-causal-badge="">
        <rect x={layout.badge.rect.x} y={layout.badge.rect.y} width={layout.badge.rect.width} height={layout.badge.rect.height}
          rx={layout.badge.rect.height / 2} fill={SURFACE} stroke={RULE} strokeWidth={m.rule} />
        <text data-causal-text="badge" x={layout.badge.textX} y={layout.badge.textY} fill={MUTED} style={{ font: m.font.badge }}>{layout.badge.text}</text>
      </g>
      {counter ? <>
        {[{ key: "base", rect: layout.panels.base.rect, diagram: layout.panels.base.diagram, title: layout.panels.base.title, branch: false },
          { key: "branch", rect: layout.panels.branch.rect, diagram: layout.panels.branch.diagram, title: layout.counterfactualTitles.get(beatId) ?? [], branch: true }]
          .map(panel => <g key={panel.key} data-causal-panel={panel.key}>
            <rect x={panel.rect.x} y={panel.rect.y} width={panel.rect.width} height={panel.rect.height} rx={m.radius} fill={SURFACE} stroke={RULE} strokeWidth={m.rule} />
            <Lines lines={panel.title} font={m.font.panel} fill={panel.branch ? ACCENT : MUTED} testId="panel" />
            <DiagramLayer diagram={panel.diagram} m={m} frame={state}
              visible={panel.branch ? state.linkVisible : state.revealed}
              cut={panel.branch ? state.linkCut : {}}
              intervention={panel.branch ? branchIntervention : undefined}
              tag={panel.branch ? panelTag : undefined} testId={panel.key} />
          </g>)}
      </> : <DiagramLayer diagram={layout.diagram} m={m} frame={state} visible={state.linkVisible} cut={state.linkCut}
        intervention={fullIntervention} tag={fullTag} testId="full" />}
      {readout ? <g data-causal-readout={beatId}>
        <rect x={r.x} y={r.y} width={r.width} height={r.height} rx={layout.readout.radius} fill={SURFACE} stroke={RULE} strokeWidth={m.rule} />
        <Lines lines={readout.label} font={m.font.status} fill={MUTED} testId="readout-label" />
        <Lines lines={readout.statement} font={m.font.statement} fill={INK} testId="readout-statement" />
        <Lines lines={readout.detail} font={m.font.caption} fill={MUTED} testId="readout-detail" />
      </g> : null}
      <Lines lines={layout.notes} font={m.font.notes} fill={MUTED} testId="notes" />
      <Legend items={layout.legend} m={m} />
    </svg>
  </div>;
});
