/** SVG view of a `FailureCascade`: stages as columns (landscape) or rows (portrait), cards per
 * node with a kind stripe, evidence count and authored cost, curved links with labels, the
 * running authored cost range, and dashed "unsupported" styling for claims without evidence.
 */
import { forwardRef } from "react";
import type { SVGProps } from "react";
import { evaluateFailureCascade } from "./failure-cascade";
import type { CascadeKind, CascadePlan } from "./failure-cascade";

export interface FailureCascadeSvgProps extends Omit<SVGProps<SVGSVGElement>, "ref"> {
  plan: CascadePlan;
  frame: number;
  width: number;
  height: number;
  colors?: Partial<Record<CascadeKind | "ink" | "sub" | "card" | "bg" | "link", string>>;
  fontFamily?: string;
}

const KIND: Record<CascadeKind, { color: string; label: string }> = {
  defect: { color: "#d9822b", label: "Defect" }, mechanism: { color: "#3b82c4", label: "Mechanism" }, damage: { color: "#b23b3b", label: "Damage" },
  consequence: { color: "#7a4fb5", label: "Consequence" }, repair: { color: "#2f8f5b", label: "Repair" },
};

const money = (v: number, cur: string, compact = v >= 10000) => { try { return new Intl.NumberFormat("en", { style: "currency", currency: cur, maximumFractionDigits: compact ? 1 : 0, notation: compact ? "compact" : "standard" }).format(v); } catch { return `${Math.round(v)} ${cur}`; } };
/** A range in one consistent notation (compact when either end is large). */
const range = (lo: number, hi: number, cur: string) => { const k = Math.max(lo, hi) >= 10000; return hi !== lo ? `${money(lo, cur, k)}–${money(hi, cur, k)}` : money(lo, cur, k); };

export const FailureCascadeSvg = forwardRef<SVGSVGElement, FailureCascadeSvgProps>(function FailureCascadeSvg({ plan, frame, width, height, colors, fontFamily = "Geist, Inter, system-ui, sans-serif", ...props }, ref) {
  const c = { ink: "#16191e", sub: "#5b6470", card: "#ffffff", bg: "#f4f5f7", link: "#8a94a2", ...Object.fromEntries(Object.entries(KIND).map(([k, v]) => [k, v.color])), ...colors } as Record<string, string>;
  const f = evaluateFailureCascade(plan, frame), sp = plan.spec;
  const portrait = height > width * 1.1, pad = 28, header = 64, footer = 70;
  const stages = plan.stages.length ? plan.stages : [sp.nodes.map(n => n.id)];
  const S = stages.length, maxPer = Math.max(...stages.map(s => s.length));
  const areaW = width - pad * 2, areaH = height - header - footer - pad;
  const cw = portrait ? Math.min(areaW / maxPer - 16, 360) : Math.min(areaW / S - 64, 300), chh = portrait ? Math.min(areaH / S - 34, 128) : Math.min(areaH / maxPer - 16, 128);
  const pos: Record<string, { x: number; y: number }> = {};
  stages.forEach((ids, s) => ids.forEach((id, i) => {
    pos[id] = portrait
      ? { x: pad + (areaW - (ids.length * (cw + 16) - 16)) / 2 + i * (cw + 16), y: header + s * (areaH / S) + (areaH / S - chh) / 2 }
      : { x: pad + s * (areaW / S) + (areaW / S - cw) / 2, y: header + (areaH - (ids.length * (chh + 16) - 16)) / 2 + i * (chh + 16) };
  }));
  const unsupported = new Set(plan.diagnostics.filter(d => d.code === "claim-unsupported" && d.target).map(d => d.target!));
  const cur = Object.entries(f.costs)[0];
  return <svg ref={ref} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${sp.title}: ${plan.stages.flat().map(id => sp.nodes.find(n => n.id === id)?.label).join(", then ")}`} style={{ display: "block", width: "100%", height: "auto", background: c.bg }} fontFamily={fontFamily} {...props}>
    <defs><marker id={`${sp.id}-arrow`} viewBox="0 0 10 10" refX={9} refY={5} markerWidth={7} markerHeight={7} orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill={c.link} /></marker></defs>
    <text x={pad} y={38} fontSize={24} fontWeight={700} fill={c.ink}>{sp.title}</text>
    <text x={pad} y={58} fontSize={13} fill={c.sub}>Authored cause → effect chain; links are claims backed by the cited evidence, not inferred.</text>
    {sp.edges.map((e, i) => {
      const a = pos[e.from], b = pos[e.to], p = f.edges.find(x => x.from === e.from && x.to === e.to)?.progress ?? 0;
      if (!a || !b || p <= 0) return null;
      const [x1, y1, x2, y2] = portrait ? [a.x + cw / 2, a.y + chh, b.x + cw / 2, b.y] : [a.x + cw, a.y + chh / 2, b.x, b.y + chh / 2];
      const d = portrait ? `M${x1} ${y1} C${x1} ${(y1 + y2) / 2} ${x2} ${(y1 + y2) / 2} ${x2} ${y2}` : `M${x1} ${y1} C${(x1 + x2) / 2} ${y1} ${(x1 + x2) / 2} ${y2} ${x2} ${y2}`;
      const len = Math.hypot(x2 - x1, y2 - y1) * 1.25, dashed = unsupported.has(`${e.from}->${e.to}`);
      return <g key={i}>
        <path d={d} fill="none" stroke={c.link} strokeWidth={2.2} strokeDasharray={dashed ? "6 5" : `${len} ${len}`} strokeDashoffset={dashed ? 0 : len * (1 - p)} opacity={dashed ? p : 1} markerEnd={p >= 1 ? `url(#${sp.id}-arrow)` : undefined} />
      </g>;
    })}
    {sp.nodes.map(n => {
      const p = pos[n.id], st = f.nodes[n.id];
      if (!p || !st || st.progress <= 0) return null;
      const k = KIND[n.kind], dashed = unsupported.has(n.id);
      return <g key={n.id} transform={`translate(${p.x} ${p.y + (1 - st.progress) * 12})`} opacity={st.progress} data-km-cascade-node={n.id}>
        <rect width={cw} height={chh} rx={12} fill={c.card} stroke={st.current ? c[n.kind] : "#d5d9df"} strokeWidth={st.current ? 2.5 : 1.2} strokeDasharray={dashed ? "6 4" : undefined} />
        <rect width={6} height={chh} rx={3} fill={c[n.kind]} />
        <text x={18} y={24} fontSize={11.5} fontWeight={700} fill={c[n.kind]} letterSpacing={.6}>{k.label.toUpperCase()}</text>
        <foreignObject x={16} y={30} width={cw - 26} height={chh - 54}><div style={{ fontSize: 15, fontWeight: 600, color: c.ink, lineHeight: 1.25, fontFamily }}>{n.label}</div></foreignObject>
        <text x={18} y={chh - 12} fontSize={12} fill={c.sub}>{n.evidence?.length ? `${n.evidence.length} source${n.evidence.length > 1 ? "s" : ""}` : "no evidence cited"}</text>
        {n.cost ? (n.cost.source?.trim()
          ? <text x={cw - 12} y={chh - 12} fontSize={13} fontWeight={700} fill={c.ink} textAnchor="end">{range(n.cost.low, n.cost.high ?? n.cost.low, n.cost.currency)}</text>
          : <text x={cw - 12} y={chh - 12} fontSize={12} fill="#b23b3b" textAnchor="end">cost hidden: no source</text>) : null}
      </g>;
    })}
    {sp.edges.map((e, i) => {
      const a = pos[e.from], b = pos[e.to], p = f.edges.find(x => x.from === e.from && x.to === e.to)?.progress ?? 0;
      if (!a || !b || !e.label || p < 1) return null;
      const [x, y] = portrait ? [(a.x + b.x + cw) / 2, (a.y + chh + b.y) / 2] : [(a.x + cw + b.x) / 2, (a.y + b.y + chh) / 2];
      const w = e.label.length * 6.6 + 14;
      return <g key={`l${i}`} transform={`translate(${x} ${y})`}>
        <rect x={-w / 2} y={-10} width={w} height={20} rx={10} fill={c.bg} stroke="#cfd5dc" />
        <text y={4} fontSize={11.5} textAnchor="middle" fill={c.sub}>{e.label}</text>
      </g>;
    })}
    <g transform={`translate(${pad} ${height - footer + 14})`}>
      <rect width={width - pad * 2} height={footer - 28} rx={10} fill={c.card} stroke="#d5d9df" />
      <text x={16} y={(footer - 28) / 2 + 5} fontSize={14} fill={c.ink}>
        {plan.ok ? (cur ? <><tspan fontWeight={700}>{range(cur[1].low, cur[1].high, cur[0])}</tspan><tspan fill={c.sub}>{`  authored costs of the ${cur[1].count} stage${cur[1].count > 1 ? "s" : ""} shown so far (each with its own source; nothing estimated)`}</tspan></> : <tspan fill={c.sub}>No cost shown yet: only authored, sourced costs are summed.</tspan>)
          : <tspan fill="#b23b3b" fontWeight={600}>{plan.diagnostics.filter(d => d.severity === "error").map(d => d.message).slice(0, 1).join(" ")}</tspan>}
      </text>
    </g>
  </svg>;
});
