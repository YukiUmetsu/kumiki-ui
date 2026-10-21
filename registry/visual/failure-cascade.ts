/** R02 `FailureCascade` — a user-authored chain of defects, effects and consequences.
 *
 * Kumiki never infers that one thing causes another. The author supplies
 * nodes (defect → mechanism → damage → consequence) and directed edges, with
 * evidence ids and optional cost impacts that carry their own source. The
 * plan:
 * - validates ids, edge endpoints, evidence references, asset state ids and
 *   semantic part ids (errors);
 * - detects cycles and reports the cycle path (error, so no stage order is
 *   invented);
 * - flags nodes or edges without evidence as unsupported claims (warning);
 * - requires a source for every cost (error) and never fabricates downstream
 *   costs: the running total sums only revealed nodes' authored values, as a
 *   low–high range;
 * - stages nodes by longest path from the roots, ordering each stage by
 *   authored `order`, so the reveal respects the authored edge order.
 *
 * Evaluation is pure per frame: which stages are revealed, edge draw progress,
 * the current asset state and focus part, and the running cost range.
 */

export type CascadeKind = "defect" | "mechanism" | "damage" | "consequence" | "repair";

export interface CascadeNode {
  id: string;
  label: string;
  kind: CascadeKind;
  /** Semantic part this node is about (for focus and highlights). */
  subject?: string;
  /** Asset state that shows this stage (e.g. "damaged"). */
  state?: string;
  /** Evidence ids supporting the claim. */
  evidence?: string[];
  /** Authored cost impact with its source; ranges allowed. */
  cost?: { low: number; high?: number; currency: string; source: string };
  note?: string;
  /** Order within a stage (authored). */
  order?: number;
}

export interface CascadeEdge { from: string; to: string; label?: string; evidence?: string[] }

export interface FailureCascadeSpec {
  id: string;
  title: string;
  nodes: CascadeNode[];
  edges: CascadeEdge[];
  evidence?: Record<string, { label: string; source: string }>;
  /** States and parts the linked asset actually has (validated when given). */
  availableStates?: string[];
  availableParts?: string[];
  /** Frames per stage and the first stage's start. @default 60, 0 */
  timing?: { framesPerStage?: number; start?: number };
}

export interface CascadePlan {
  spec: FailureCascadeSpec;
  /** Stage index per node (−1 when a cycle prevents staging). */
  stage: Record<string, number>;
  stages: string[][];
  durationFrames: number;
  ok: boolean;
  diagnostics: { code: string; severity: "error" | "warning" | "info"; message: string; target?: string }[];
}

export interface CascadeFrame {
  /** Number of fully or partially revealed stages. */
  revealed: number;
  nodes: Record<string, { progress: number; current: boolean }>;
  edges: { from: string; to: string; progress: number }[];
  /** State/focus of the newest revealed node that declares one. */
  state: string | null;
  focus: string | null;
  /** Running authored cost range of revealed nodes, per currency. */
  costs: Record<string, { low: number; high: number; count: number }>;
}

export function compileFailureCascade(spec: FailureCascadeSpec): CascadePlan {
  const diagnostics: CascadePlan["diagnostics"] = [];
  const ids = new Map<string, CascadeNode>();
  for (const n of spec.nodes) {
    if (ids.has(n.id)) diagnostics.push({ code: "duplicate-id", severity: "error", message: `Node "${n.id}" is declared twice.`, target: n.id });
    ids.set(n.id, n);
  }
  const ev = spec.evidence ?? {};
  const checkEvidence = (list: string[] | undefined, what: string, target: string) => {
    if (!list?.length) { diagnostics.push({ code: "claim-unsupported", severity: "warning", message: `${what} has no evidence; it is drawn as an authored claim, not a verified link.`, target }); return; }
    for (const e of list) if (!ev[e]) diagnostics.push({ code: "evidence-unknown", severity: "error", message: `${what} cites unknown evidence "${e}".`, target });
  };
  for (const n of spec.nodes) {
    checkEvidence(n.evidence, `"${n.label}"`, n.id);
    if (n.state && spec.availableStates && !spec.availableStates.includes(n.state)) diagnostics.push({ code: "state-unknown", severity: "error", message: `"${n.label}" uses state "${n.state}", which the asset does not supply (${spec.availableStates.join(", ")}).`, target: n.id });
    if (n.subject && spec.availableParts && !spec.availableParts.includes(n.subject)) diagnostics.push({ code: "subject-unknown", severity: "error", message: `"${n.label}" points at part "${n.subject}", which the asset does not have.`, target: n.id });
    if (n.cost) {
      if (!n.cost.source?.trim()) diagnostics.push({ code: "cost-unsourced", severity: "error", message: `"${n.label}" has a cost without a source; costs are never shown without one.`, target: n.id });
      if (n.cost.high !== undefined && n.cost.high < n.cost.low) diagnostics.push({ code: "cost-range", severity: "error", message: `"${n.label}" cost range is inverted.`, target: n.id });
    }
  }
  const out = new Map<string, string[]>(), indeg = new Map<string, number>([...ids.keys()].map((k) => [k, 0]));
  for (const e of spec.edges) {
    if (!ids.has(e.from) || !ids.has(e.to)) { diagnostics.push({ code: "edge-unknown-node", severity: "error", message: `Edge ${e.from} → ${e.to} refers to a missing node.` }); continue; }
    checkEvidence(e.evidence, `Link "${ids.get(e.from)!.label}" → "${ids.get(e.to)!.label}"`, `${e.from}->${e.to}`);
    out.set(e.from, [...(out.get(e.from) ?? []), e.to]);
    indeg.set(e.to, (indeg.get(e.to) ?? 0) + 1);
  }
  // Cycle detection with the path, then longest-path staging (Kahn order).
  const color = new Map<string, 0 | 1 | 2>(), stack: string[] = [];
  let cycle: string[] | null = null;
  const dfs = (u: string) => {
    if (cycle) return;
    color.set(u, 1); stack.push(u);
    for (const v of out.get(u) ?? []) {
      if (color.get(v) === 1) { cycle = [...stack.slice(stack.indexOf(v)), v]; return; }
      if (!color.get(v)) dfs(v);
      if (cycle) return;
    }
    stack.pop(); color.set(u, 2);
  };
  for (const id of ids.keys()) if (!color.get(id)) dfs(id);
  const stage: Record<string, number> = {};
  let stages: string[][] = [];
  if (cycle) {
    diagnostics.push({ code: "cascade-cycle", severity: "error", message: `The graph has a cycle (${(cycle as string[]).map((c) => ids.get(c)?.label ?? c).join(" → ")}); a cascade must be acyclic, so no stage order is shown.` });
    for (const id of ids.keys()) stage[id] = -1;
  } else {
    const q = [...ids.keys()].filter((k) => indeg.get(k) === 0), deg = new Map(indeg);
    for (const k of ids.keys()) stage[k] = 0;
    while (q.length) {
      const u = q.shift()!;
      for (const v of out.get(u) ?? []) { stage[v] = Math.max(stage[v], stage[u] + 1); deg.set(v, deg.get(v)! - 1); if (deg.get(v) === 0) q.push(v); }
    }
    const n = Math.max(0, ...Object.values(stage)) + 1;
    stages = Array.from({ length: n }, (_, s) => [...ids.values()].filter((x) => stage[x.id] === s).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map((x) => x.id));
  }
  const fps = spec.timing?.framesPerStage ?? 60, start = spec.timing?.start ?? 0;
  const ok = !diagnostics.some((d) => d.severity === "error");
  return { spec, stage, stages, durationFrames: start + stages.length * fps, ok, diagnostics };
}

export function evaluateFailureCascade(plan: CascadePlan, frame: number): CascadeFrame {
  const fps = plan.spec.timing?.framesPerStage ?? 60, start = plan.spec.timing?.start ?? 0;
  const pos = (frame - start) / fps; // stage cursor
  const nodes: CascadeFrame["nodes"] = {};
  for (const n of plan.spec.nodes) {
    const s = plan.stage[n.id];
    const p = s < 0 ? 1 : Math.max(0, Math.min(1, (pos - s) / 0.35));
    nodes[n.id] = { progress: p, current: s >= 0 && pos >= s && pos < s + 1 };
  }
  const edges = plan.spec.edges.filter((e) => nodes[e.from] && nodes[e.to]).map((e) => {
    const s = plan.stage[e.to];
    return { from: e.from, to: e.to, progress: s < 0 ? 1 : Math.max(0, Math.min(1, (pos - (s - 0.35)) / 0.35)) };
  });
  const revealedNodes = plan.spec.nodes.filter((n) => nodes[n.id].progress >= 1 || (nodes[n.id].progress > 0 && plan.stage[n.id] < 0));
  const newest = [...revealedNodes].sort((a, b) => plan.stage[b.id] - plan.stage[a.id]);
  const costs: CascadeFrame["costs"] = {};
  for (const n of revealedNodes) if (n.cost?.source?.trim()) {
    const c = (costs[n.cost.currency] ??= { low: 0, high: 0, count: 0 });
    c.low += n.cost.low; c.high += n.cost.high ?? n.cost.low; c.count++;
  }
  return {
    revealed: plan.stages.filter((_, s) => pos >= s).length,
    nodes, edges,
    state: newest.find((n) => n.state)?.state ?? null,
    focus: newest.find((n) => n.subject)?.subject ?? null,
    costs,
  };
}
