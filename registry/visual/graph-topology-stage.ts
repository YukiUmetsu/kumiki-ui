/** GraphTopologyStage core: typed nodes and edges with deterministic layouts (layered for acyclic hierarchies,
 * seeded fixed-iteration force layout otherwise), identity-preserving transitions keyed by node and edge id,
 * BFS/DFS traversal revealed in visit order, declared clusters and weight-proportional strokes.
 * Every result is a pure function of the spec, the options and the frame; there is no clock.
 *
 * Refusals are real checks: unknown endpoints, duplicate ids, identity changes, undeclared node-set changes,
 * negative weights, missing cluster assignments and cycles in a layered layout are errors. Legibility problems
 * (label or node overlap, small labels, unreached nodes) are warnings. Labels are measured with the injected
 * `measure`; text is wrapped, never truncated.
 */
import type { MeasureText } from "../media/text-layout";
import { evaluateEasing } from "../motion/easing";
import type { Diagnostic, RationalFps, Rect, Vec2 } from "../motion/types";

export type GraphLayoutKind = "layered" | "force";

export interface GraphNode {
  id: string;
  label: string;
  type: string;
  /** Required on every node when the topology declares `clusters`. */
  cluster?: string;
}
export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  type: string;
  /** Non-negative and finite. Stroke width is proportional to it across the whole spec. */
  weight?: number;
  /** @default true */
  directed?: boolean;
}
export interface GraphCluster { id: string; label: string }
export interface GraphTopology {
  id: string;
  nodes: readonly GraphNode[];
  edges: readonly GraphEdge[];
  clusters?: readonly GraphCluster[];
}
export interface GraphTraversal { algorithm: "bfs" | "dfs"; root: string }
export interface GraphBeat {
  id: string;
  topologyId: string;
  layout: GraphLayoutKind;
  durationFrames: number;
  caption?: string;
  /** Node ids new relative to the previous beat. They fade in; any other new node is an error. */
  appear?: readonly string[];
  /** Node ids removed relative to the previous beat. They fade out; any other removed node is an error. */
  disappear?: readonly string[];
  /** Visited nodes and edges reveal in visit order; unvisited ones stay dim. */
  traversal?: GraphTraversal;
  /** Colour nodes by declared cluster and draw cluster hulls. Requires the topology to declare clusters. */
  groups?: boolean;
  /** Show the exact weight of every weighted edge. */
  weightLabels?: boolean;
}
export interface GraphStageSpec {
  id: string;
  fps: RationalFps;
  topologies: readonly GraphTopology[];
  beats: readonly GraphBeat[];
  /** Unit shown beside weights, e.g. "km". Shown as given; never converted. */
  weightUnit?: string;
  /** Transition length for beats after the first. Default 24. */
  moveFrames?: number;
}

export interface GraphStageDiagnostic extends Diagnostic {
  beatId?: string;
  topologyId?: string;
  nodeId?: string;
  edgeId?: string;
}

export interface GraphStageOptions {
  width: number;
  height: number;
  /** Measures text with the same font the view renders. Use createCanvasMeasurer in the browser. */
  measure: MeasureText;
  /** CSS font family for labels; must match what the view renders. */
  family?: string;
  /** Normalized safe rect of the output. Default: 6% horizontal, 5% vertical inset. */
  safe?: Rect;
  fontPx?: number;
  /** Below this label size a warning is raised. Default: 3% of the short side. */
  readablePx?: number;
  nodeRadiusPx?: number;
  baseStrokePx?: number;
  /** Stroke width of the largest weight in the spec. */
  maxStrokePx?: number;
}

export interface GraphStageLegend {
  types: readonly { id: string; colour: number }[];
  clusters: readonly { id: string; label: string; colour: number }[];
  weight?: { maxWeight: number; unit: string; maxStrokePx: number; unitPx: number };
}

export interface GraphNodeFrame {
  id: string; type: string; cluster?: string; label: string; lines: readonly string[];
  x: number; y: number; radius: number; opacity: number; colour: number;
  /** Where the label sits relative to the node; `start` aligns it to the right of the circle. */
  labelAlign: "middle" | "start";
  /** 1-based visit number once a traversal has reached the node. */
  visit?: number;
  labelBox: Rect;
}
export interface GraphEdgeFrame {
  id: string; type: string; from: string; to: string; directed: boolean;
  /** Endpoints trimmed to the node circles (and the arrow gap); the view draws straight segments. */
  x1: number; y1: number; x2: number; y2: number;
  strokePx: number; opacity: number;
  weight?: number; weightText?: string; labelAt: Vec2; labelOpacity: number;
}
/** A declared group as a convex hull around its drawn nodes, labelled above its top edge. */
export interface GraphClusterFrame { id: string; label: string; points: readonly Vec2[]; opacity: number; labelAt: Vec2; labelOpacity: number }
export interface GraphStageFrame {
  status: "ready" | "error";
  beatIndex: number; beatId: string;
  /** Frames since the current beat started. */
  local: number;
  caption: readonly string[];
  nodes: readonly GraphNodeFrame[];
  edges: readonly GraphEdgeFrame[];
  clusters: readonly GraphClusterFrame[];
  visited: number;
  total: number;
  legend: GraphStageLegend;
  summary: string;
}

export interface GraphLegendSwatch { kind: "type" | "cluster"; id: string; label: string; colour: number; x: number; y: number; labelX: number }
export interface GraphLegendWeightSample { value: number; strokePx: number; x: number; y: number; length: number; label: string; labelX: number }
export interface GraphLegendLayout {
  font: string;
  dotRadius: number;
  swatches: readonly GraphLegendSwatch[];
  weight?: { samples: readonly GraphLegendWeightSample[]; caption: string; captionX: number; y: number };
}

export interface PreparedGraphStage {
  status: "ready" | "error";
  diagnostics: GraphStageDiagnostic[];
  durationFrames: number;
  bands: { caption?: Rect; graph: Rect; legend: Rect };
  legend: GraphStageLegend;
  legendLayout: GraphLegendLayout;
  plans: readonly (BeatPlan | undefined)[];
  starts: readonly number[];
  nodeRadius: number;
  fontPx: number;
  placement: GraphLabelPlacement;
}

interface PlanNode {
  node: GraphNode; pos: Vec2; lines: readonly string[]; labelWidth: number; labelHeight: number;
  startOp: number; endOp: number; visitStart?: number; visit?: number;
}
interface PlanEdge { edge: GraphEdge; start: number; end: number; visitStart?: number; offset: number; strokePx: number; labelT: number }
interface BeatPlan {
  index: number; beat: GraphBeat; topology: GraphTopology; move: number; duration: number; span: number;
  nodes: Map<string, PlanNode>; edges: Map<string, PlanEdge>; caption?: readonly string[];
  groups: boolean; weightLabels: boolean; visited: number; total: number; traversal: boolean;
}

const DEFAULT_MOVE = 24;
const FORCE_ITERATIONS = 300;
const DIM_NODE = 0.22;
const DIM_EDGE = 0.1;
const BASE_STROKE_RATIO = 0.0025;
const COLOURS = 8;
/** Label font family the core measures with; the view must render with the same value. */
export const GRAPH_LABEL_FAMILY = 'system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif';
const LABEL_WEIGHT = 500;
const LINE_HEIGHT = 1.2;
const MAX_LABEL_LINES = 3;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
const easeMove = (t: number) => evaluateEasing("ease-in-out", clamp01(t));

/* ------------------------------------------------------------------ *
 * Structure: validation
 * ------------------------------------------------------------------ */

export function isDirected(edge: GraphEdge): boolean {
  return edge.directed !== false;
}

/** Edges whose endpoints exist and that join two distinct nodes; the only edges a layout or traversal uses. */
function drawableEdges(topology: GraphTopology): GraphEdge[] {
  const ids = new Set(topology.nodes.map(n => n.id));
  return topology.edges.filter(e => ids.has(e.from) && ids.has(e.to) && e.from !== e.to);
}

/** Structural checks on one topology. Pure; needs no measurer. */
export function validateGraphTopology(topology: GraphTopology): GraphStageDiagnostic[] {
  const out: GraphStageDiagnostic[] = [];
  const topologyId = topology.id;
  const clusters = topology.clusters;
  const clusterIds = new Set<string>();
  for (const cluster of clusters ?? []) {
    if (clusterIds.has(cluster.id)) out.push({ code: "graph-cluster-duplicate", severity: "error", topologyId, message: `Cluster "${cluster.id}" is declared twice.` });
    clusterIds.add(cluster.id);
  }
  const nodeIds = new Set<string>();
  for (const node of topology.nodes) {
    if (nodeIds.has(node.id)) out.push({ code: "graph-node-duplicate", severity: "error", topologyId, nodeId: node.id, message: `Node id "${node.id}" appears twice in "${topologyId}".` });
    nodeIds.add(node.id);
    if (!node.label.trim()) out.push({ code: "graph-node-label-empty", severity: "error", topologyId, nodeId: node.id, message: `Node "${node.id}" has no label.` });
    if (clusters) {
      if (node.cluster === undefined) out.push({ code: "graph-cluster-missing", severity: "error", topologyId, nodeId: node.id,
        message: `Node "${node.label}" has no cluster, but "${topologyId}" declares clusters. Every node needs one.` });
      else if (!clusterIds.has(node.cluster)) out.push({ code: "graph-cluster-unknown", severity: "error", topologyId, nodeId: node.id,
        message: `Node "${node.label}" is in cluster "${node.cluster}", which "${topologyId}" does not declare.` });
    }
  }
  const edgeIds = new Set<string>();
  for (const edge of topology.edges) {
    if (edgeIds.has(edge.id)) out.push({ code: "graph-edge-duplicate", severity: "error", topologyId, edgeId: edge.id, message: `Edge id "${edge.id}" appears twice.` });
    edgeIds.add(edge.id);
    for (const endpoint of [edge.from, edge.to]) {
      if (!nodeIds.has(endpoint)) out.push({ code: "graph-edge-unknown-endpoint", severity: "error", topologyId, edgeId: edge.id,
        message: `Edge "${edge.id}" points at node "${endpoint}", which "${topologyId}" does not contain.` });
    }
    if (edge.from === edge.to && nodeIds.has(edge.from)) out.push({ code: "graph-self-loop", severity: "warning", topologyId, edgeId: edge.id,
      message: `Edge "${edge.id}" joins "${edge.from}" to itself; self-loops are not drawn in this slice.` });
    if (edge.weight !== undefined && (!Number.isFinite(edge.weight) || edge.weight < 0)) out.push({ code: "graph-weight-invalid", severity: "error", topologyId, edgeId: edge.id,
      message: `Edge "${edge.id}" has weight ${String(edge.weight)}; weights must be finite and zero or positive.` });
  }
  return out;
}

/** Visit order of a traversal over drawable edges. Directed edges are followed from `from` to `to`. */
export function traverseGraph(topology: GraphTopology, traversal: GraphTraversal): {
  order: { nodeId: string; visit: number; viaEdgeId?: string }[]; unreached: string[];
} {
  const out = new Map<string, { to: string; edgeId: string }[]>();
  for (const node of topology.nodes) out.set(node.id, []);
  for (const edge of drawableEdges(topology)) {
    out.get(edge.from)!.push({ to: edge.to, edgeId: edge.id });
    if (!isDirected(edge)) out.get(edge.to)!.push({ to: edge.from, edgeId: edge.id });
  }
  const seen = new Set<string>([traversal.root]);
  const order: { nodeId: string; visit: number; viaEdgeId?: string }[] = [{ nodeId: traversal.root, visit: 1 }];
  if (traversal.algorithm === "bfs") {
    for (let head = 0; head < order.length; head++) {
      for (const step of out.get(order[head].nodeId) ?? []) {
        if (seen.has(step.to)) continue;
        seen.add(step.to);
        order.push({ nodeId: step.to, visit: order.length + 1, viaEdgeId: step.edgeId });
      }
    }
  } else {
    const stack: { nodeId: string; next: number }[] = [{ nodeId: traversal.root, next: 0 }];
    while (stack.length) {
      const top = stack[stack.length - 1];
      const steps = out.get(top.nodeId) ?? [];
      if (top.next >= steps.length) { stack.pop(); continue; }
      const step = steps[top.next++];
      if (seen.has(step.to)) continue;
      seen.add(step.to);
      order.push({ nodeId: step.to, visit: order.length + 1, viaEdgeId: step.edgeId });
      stack.push({ nodeId: step.to, next: 0 });
    }
  }
  const unreached = topology.nodes.map(n => n.id).filter(id => !seen.has(id));
  return { order, unreached };
}

/** Structural checks on the whole spec: references, identity across transitions, traversal and beat timing. */
export function validateGraphStage(spec: GraphStageSpec): GraphStageDiagnostic[] {
  const out: GraphStageDiagnostic[] = [];
  const topologies = new Map<string, GraphTopology>();
  for (const topology of spec.topologies) {
    if (topologies.has(topology.id)) out.push({ code: "graph-topology-duplicate", severity: "error", topologyId: topology.id, message: `Topology "${topology.id}" is declared twice.` });
    topologies.set(topology.id, topology);
    out.push(...validateGraphTopology(topology));
  }
  if (!spec.beats.length) out.push({ code: "graph-beat-invalid", severity: "error", message: "The stage needs at least one beat." });
  const moveFrames = spec.moveFrames ?? DEFAULT_MOVE;
  spec.beats.forEach((beat, index) => {
    const beatId = beat.id;
    if (!Number.isSafeInteger(beat.durationFrames) || beat.durationFrames < 1)
      out.push({ code: "graph-beat-invalid", severity: "error", beatId, message: `Beat "${beatId}" needs a positive integer duration.` });
    const topology = topologies.get(beat.topologyId);
    if (!topology) {
      out.push({ code: "graph-topology-unknown", severity: "error", beatId, topologyId: beat.topologyId, message: `Beat "${beatId}" uses topology "${beat.topologyId}", which the spec does not declare.` });
      return;
    }
    if (beat.groups && !topology.clusters)
      out.push({ code: "graph-groups-undeclared", severity: "error", beatId, topologyId: topology.id, message: `Beat "${beatId}" groups nodes, but "${topology.id}" declares no clusters.` });
    const previous = index > 0 ? topologies.get(spec.beats[index - 1].topologyId) : undefined;
    if (index === 0 && (beat.appear?.length || beat.disappear?.length))
      out.push({ code: "graph-beat-invalid", severity: "error", beatId, message: `Beat "${beatId}" is first, so nothing can appear or disappear relative to it.` });
    if (previous) out.push(...checkTransition(previous, topology, beat));
    if (beat.traversal) {
      if (!topology.nodes.some(n => n.id === beat.traversal!.root)) {
        out.push({ code: "graph-root-unknown", severity: "error", beatId, topologyId: topology.id, nodeId: beat.traversal.root,
          message: `Beat "${beatId}" starts a traversal at "${beat.traversal.root}", which "${topology.id}" does not contain.` });
      } else {
        const { order, unreached } = traverseGraph(topology, beat.traversal);
        if (unreached.length) out.push({ code: "graph-traversal-unreached", severity: "warning", beatId, topologyId: topology.id,
          message: `${unreached.length} node(s) cannot be reached from "${beat.traversal.root}" in "${beatId}" and stay dim: ${unreached.join(", ")}.` });
        const move = index === 0 ? 0 : Math.min(moveFrames, Math.floor(beat.durationFrames / 2));
        const slot = (beat.durationFrames - move) / Math.max(1, order.length);
        if (slot < 6) out.push({ code: "graph-beat-short", severity: "warning", beatId,
          message: `Beat "${beatId}" reveals ${order.length} nodes in ${beat.durationFrames} frames; hold a traversal beat for at least ${Math.ceil(6 * order.length + move)} frames.` });
      }
    }
  });
  return out;
}

function checkTransition(prev: GraphTopology, next: GraphTopology, beat: GraphBeat): GraphStageDiagnostic[] {
  const out: GraphStageDiagnostic[] = [];
  const beatId = beat.id, topologyId = next.id;
  const before = new Map(prev.nodes.map(n => [n.id, n] as const));
  const after = new Map(next.nodes.map(n => [n.id, n] as const));
  const appear = new Set(beat.appear ?? []), disappear = new Set(beat.disappear ?? []);
  for (const [id, node] of after) {
    const old = before.get(id);
    if (!old && !appear.has(id)) out.push({ code: "graph-node-set-undeclared", severity: "error", beatId, topologyId, nodeId: id,
      message: `Node "${id}" appears in beat "${beatId}" but is not declared in appear, so its fade-in is unplanned.` });
    if (old && (old.label !== node.label || old.type !== node.type)) out.push({ code: "graph-identity-lost", severity: "error", beatId, topologyId, nodeId: id,
      message: `Node "${id}" keeps its id but changes its label or type in "${beatId}". Identity is id, label and type; use a new id and declare it in appear and disappear.` });
  }
  for (const id of before.keys()) if (!after.has(id) && !disappear.has(id))
    out.push({ code: "graph-node-set-undeclared", severity: "error", beatId, topologyId, nodeId: id,
      message: `Node "${id}" disappears in beat "${beatId}" but is not declared in disappear, so its fade-out is unplanned.` });
  for (const id of appear) {
    if (before.has(id)) out.push({ code: "graph-identity-lost", severity: "error", beatId, topologyId, nodeId: id,
      message: `Node "${id}" is declared as appearing in "${beatId}" but already exists before it; a fade would break its identity.` });
    else if (!after.has(id)) out.push({ code: "graph-declared-unknown", severity: "error", beatId, topologyId, nodeId: id,
      message: `Beat "${beatId}" declares "${id}" as appearing, but "${topologyId}" does not contain it.` });
  }
  for (const id of disappear) {
    if (after.has(id)) out.push({ code: "graph-identity-lost", severity: "error", beatId, topologyId, nodeId: id,
      message: `Node "${id}" is declared as disappearing in "${beatId}" but is still in the topology; it would be lost, not moved.` });
    else if (!before.has(id)) out.push({ code: "graph-declared-unknown", severity: "error", beatId, topologyId, nodeId: id,
      message: `Beat "${beatId}" declares "${id}" as disappearing, but the previous state does not contain it.` });
  }
  const previousEdges = new Map(prev.edges.map(e => [e.id, e] as const));
  for (const edge of next.edges) {
    const old = previousEdges.get(edge.id);
    if (old && (old.from !== edge.from || old.to !== edge.to))
      out.push({ code: "graph-identity-lost", severity: "error", beatId, topologyId, edgeId: edge.id,
        message: `Edge "${edge.id}" keeps its id but joins different nodes in "${beatId}"; its identity would be lost.` });
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Layout (both deterministic)
 * ------------------------------------------------------------------ */

export interface LayoutResult { positions: Map<string, Vec2>; layers?: Map<string, number>; diagnostics: GraphStageDiagnostic[] }

/** Longest-path layering for acyclic graphs; undirected edges are ordered from `from` to `to` and reported. */
export function layeredLayout(topology: GraphTopology, box: Rect): LayoutResult {
  const diagnostics: GraphStageDiagnostic[] = [];
  const ids = topology.nodes.map(n => n.id);
  const index = new Map(ids.map((id, i) => [id, i] as const));
  const succ: number[][] = ids.map(() => []), pred: number[][] = ids.map(() => []);
  for (const edge of drawableEdges(topology)) {
    if (!isDirected(edge)) diagnostics.push({ code: "graph-layered-undirected", severity: "warning", topologyId: topology.id, edgeId: edge.id,
      message: `Edge "${edge.id}" is undirected; the layered layout orders it from "${edge.from}" to "${edge.to}".` });
    const a = index.get(edge.from)!, b = index.get(edge.to)!;
    succ[a].push(b); pred[b].push(a);
  }
  const indegree = pred.map(p => p.length);
  const layer = ids.map(() => 0);
  const queue = ids.map((_, i) => i).filter(i => indegree[i] === 0);
  for (let head = 0; head < queue.length; head++) {
    const u = queue[head];
    for (const v of succ[u]) {
      layer[v] = Math.max(layer[v], layer[u] + 1);
      if (--indegree[v] === 0) queue.push(v);
    }
  }
  if (queue.length < ids.length) {
    const cycle = findCycle(ids, pred, indegree);
    const labels = cycle.map(i => topology.nodes[i].label);
    diagnostics.push({ code: "graph-cycle-layered", severity: "error", topologyId: topology.id, nodeId: ids[cycle[0]],
      message: `The layered layout cannot place a cycle: ${[...labels, labels[0]].join(" → ")}. Use the force layout, or remove an edge from the cycle.` });
    return { positions: new Map(), diagnostics };
  }
  const layers = Math.max(0, ...layer) + 1;
  const rows: number[][] = Array.from({ length: layers }, () => []);
  ids.forEach((_, i) => rows[layer[i]].push(i));
  const position = new Array<number>(ids.length).fill(0);
  rows.forEach(row => row.forEach((node, k) => { position[node] = k; }));
  const reorder = (row: number[], neighbours: (i: number) => number[]) => {
    const keyed = row.map(node => {
      const around = neighbours(node);
      const key = around.length ? around.reduce((sum, n) => sum + position[n], 0) / around.length : position[node];
      return { node, key };
    });
    keyed.sort((x, y) => x.key - y.key || x.node - y.node);
    keyed.forEach((item, k) => { row.splice(k, 1, item.node); position[item.node] = k; });
  };
  for (let sweep = 0; sweep < 2; sweep++) {
    for (let l = 1; l < layers; l++) reorder(rows[l], i => pred[i]);
    for (let l = layers - 2; l >= 0; l--) reorder(rows[l], i => succ[i]);
  }
  const positions = new Map<string, Vec2>();
  rows.forEach((row, l) => row.forEach((node, k) => {
    positions.set(ids[node], {
      x: box.x + (k + 0.5) * box.width / row.length,
      y: box.y + (l + 0.5) * box.height / layers,
    });
  }));
  return { positions, layers: new Map(ids.map((id, i) => [id, layer[i]] as const)), diagnostics };
}

/** A cycle among the nodes Kahn's algorithm could not place, returned in forward order. */
function findCycle(ids: string[], pred: number[][], indegree: number[]): number[] {
  const start = ids.map((_, i) => i).find(i => indegree[i] > 0)!;
  const walk: number[] = [];
  const seenAt = new Map<number, number>();
  let current = start;
  while (!seenAt.has(current)) {
    seenAt.set(current, walk.length);
    walk.push(current);
    current = pred[current].find(p => indegree[p] > 0)!;
  }
  return walk.slice(seenAt.get(current)!).reverse();
}

/** Parallel links between the same two nodes are fanned out symmetrically; a single link is not offset. */
function pairOffsets(topology: GraphTopology, spacing: number): Map<string, number> {
  const groups = new Map<string, string[]>();
  for (const edge of drawableEdges(topology)) {
    const key = [edge.from, edge.to].sort().join("\u0000");
    groups.set(key, [...(groups.get(key) ?? []), edge.id]);
  }
  const offsets = new Map<string, number>();
  for (const group of groups.values()) group.forEach((id, k) => offsets.set(id, group.length > 1 ? (k - (group.length - 1) / 2) * spacing : 0));
  return offsets;
}

function weightText(weight: number, unit: string): string {
  return `${String(weight)}${unit ? ` ${unit}` : ""}`;
}

function fnv1a(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { hash ^= text.charCodeAt(i); hash = Math.imul(hash, 0x01000193) >>> 0; }
  return hash >>> 0;
}

function mulberry32(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fruchterman–Reingold with a fixed iteration count, seeded from the topology id, stretched into `box` per axis.
 * Topology carries no metric, so the layout is free to fill the output; overlaps are resolved by `separateFootprints`. */
export function forceLayout(topology: GraphTopology, box: Rect): Map<string, Vec2> {
  const ids = topology.nodes.map(n => n.id);
  const n = ids.length;
  const positions = new Map<string, Vec2>();
  if (n === 0) return positions;
  const index = new Map(ids.map((id, i) => [id, i] as const));
  const random = mulberry32(fnv1a(topology.id));
  const x = ids.map(() => random() * 2 - 1), y = ids.map(() => random() * 2 - 1);
  const pairs = drawableEdges(topology).map(e => [index.get(e.from)!, index.get(e.to)!] as const);
  const k = Math.sqrt(4 / n);
  for (let iteration = 0; iteration < FORCE_ITERATIONS; iteration++) {
    const temperature = 0.12 * (1 - iteration / FORCE_ITERATIONS) + 0.002;
    const dx = new Array<number>(n).fill(0), dy = new Array<number>(n).fill(0);
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const ox = x[i] - x[j], oy = y[i] - y[j];
      const d = Math.max(Math.hypot(ox, oy), 1e-6);
      const force = (k * k) / d;
      dx[i] += ox / d * force; dy[i] += oy / d * force;
      dx[j] -= ox / d * force; dy[j] -= oy / d * force;
    }
    for (const [a, b] of pairs) {
      const ox = x[a] - x[b], oy = y[a] - y[b];
      const d = Math.max(Math.hypot(ox, oy), 1e-6);
      const force = (d * d) / k;
      dx[a] -= ox / d * force; dy[a] -= oy / d * force;
      dx[b] += ox / d * force; dy[b] += oy / d * force;
    }
    for (let i = 0; i < n; i++) {
      const length = Math.hypot(dx[i], dy[i]);
      if (length === 0) continue;
      const step = Math.min(length, temperature) / length;
      x[i] += dx[i] * step; y[i] += dy[i] * step;
    }
  }
  const minX = Math.min(...x), maxX = Math.max(...x), minY = Math.min(...y), maxY = Math.max(...y);
  const spanX = maxX - minX, spanY = maxY - minY;
  ids.forEach((id, i) => positions.set(id, {
    x: spanX > 1e-9 ? box.x + (x[i] - minX) / spanX * box.width : box.x + box.width / 2,
    y: spanY > 1e-9 ? box.y + (y[i] - minY) / spanY * box.height : box.y + box.height / 2,
  }));
  return positions;
}

interface Footprint { left: number; right: number; up: number; down: number }
export type GraphLabelPlacement = "below" | "right";

/** Deterministic pairwise separation of node footprints (circle plus label). Each pass moves a clashing pair apart
 * along its least-overlap axis, then keeps every footprint inside the box. Stops when nothing overlaps. */
interface EdgeLabelObstacle { from: string; to: string; offset: number; width: number; height: number }

function separateFootprints(positions: Map<string, Vec2>, footprints: Map<string, Footprint>, box: Rect, pad: number,
  labels: readonly EdgeLabelObstacle[] = []) {
  const ids = [...positions.keys()];
  for (let pass = 0; pass < 200; pass++) {
    let moved = false;
    for (const label of labels) {
      const a = positions.get(label.from), b = positions.get(label.to);
      if (!a || !b) continue;
      const length = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const cx = (a.x + b.x) / 2 - (b.y - a.y) / length * label.offset, cy = (a.y + b.y) / 2 + (b.x - a.x) / length * label.offset;
      for (const id of ids) {
        const p = positions.get(id)!, f = footprints.get(id)!;
        const ox = Math.min(p.x + f.right, cx + label.width / 2 + pad) - Math.max(p.x - f.left, cx - label.width / 2 - pad);
        const oy = Math.min(p.y + f.down, cy + label.height / 2 + pad) - Math.max(p.y - f.up, cy - label.height / 2 - pad);
        if (ox <= 0 || oy <= 0) continue;
        moved = true;
        if (ox < oy) p.x += (p.x >= cx ? 1 : -1) * ox;
        else p.y += (p.y >= cy ? 1 : -1) * oy;
      }
    }
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
      const a = positions.get(ids[i])!, b = positions.get(ids[j])!;
      const fa = footprints.get(ids[i])!, fb = footprints.get(ids[j])!;
      const ox = Math.min(a.x + fa.right, b.x + fb.right) - Math.max(a.x - fa.left, b.x - fb.left) + pad;
      const oy = Math.min(a.y + fa.down, b.y + fb.down) - Math.max(a.y - fa.up, b.y - fb.up) + pad;
      if (ox <= 0 || oy <= 0) continue;
      moved = true;
      if (ox < oy) {
        const sign = a.x <= b.x ? -1 : 1;
        a.x += sign * ox / 2; b.x -= sign * ox / 2;
      } else {
        const sign = a.y <= b.y ? -1 : 1;
        a.y += sign * oy / 2; b.y -= sign * oy / 2;
      }
    }
    for (const id of ids) {
      const p = positions.get(id)!, f = footprints.get(id)!;
      const x = Math.max(box.x + f.left, Math.min(box.x + box.width - f.right, p.x));
      const y = Math.max(box.y + f.up, Math.min(box.y + box.height - f.down, p.y));
      if (x !== p.x || y !== p.y) { moved = true; p.x = x; p.y = y; }
    }
    if (!moved) break;
  }
}

/* ------------------------------------------------------------------ *
 * Text
 * ------------------------------------------------------------------ */

/** Greedy word wrap with per-character breaks for words and CJK runs that are too long. Never truncates. */
export function wrapGraphText(text: string, maxWidth: number, font: string, measure: MeasureText): string[] {
  const words = text.split(/\s+/u).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (measure(font, candidate) <= maxWidth) { current = candidate; continue; }
    if (current) { lines.push(current); current = ""; }
    let piece = "";
    for (const ch of Array.from(word)) {
      if (piece && measure(font, piece + ch) > maxWidth) { lines.push(piece); piece = ch; }
      else piece += ch;
    }
    current = piece;
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

/* ------------------------------------------------------------------ *
 * Preparation: layouts, visit timing, identity plans and geometry checks
 * ------------------------------------------------------------------ */

function convexHull(points: Vec2[]): Vec2[] {
  const pts = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  if (pts.length < 3) return pts;
  const cross = (o: Vec2, a: Vec2, b: Vec2) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower: Vec2[] = [], upper: Vec2[] = [];
  for (const p of pts) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop(); lower.push(p); }
  for (const p of [...pts].reverse()) { while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop(); upper.push(p); }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

function rectsOverlap(a: Rect, b: Rect) {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

/** Opacity of a node or edge at a local frame inside a settled (post-transition) beat. */
function settledOpacity(start: number, end: number, visitStart: number | undefined, span: number, local: number): number {
  if (visitStart === undefined || local < visitStart) return start;
  return lerp(start, end, easeMove((local - visitStart) / span));
}

/** Compiles a spec: validates it, lays out every beat, times traversals and checks geometry. Pure. */
export function prepareGraphStage(spec: GraphStageSpec, options: GraphStageOptions): PreparedGraphStage {
  const { width: W, height: H } = options;
  const short = Math.min(W, H);
  const diagnostics: GraphStageDiagnostic[] = [...validateGraphStage(spec)];
  const fontPx = options.fontPx ?? Math.round(short * 0.034);
  const readablePx = options.readablePx ?? Math.round(short * 0.03);
  const nodeRadius = options.nodeRadiusPx ?? Math.round(short * 0.028);
  const baseStrokePx = options.baseStrokePx ?? Math.max(1, Math.round(short * BASE_STROKE_RATIO));
  const maxStrokePx = options.maxStrokePx ?? Math.round(short * 0.012);
  const family = options.family ?? GRAPH_LABEL_FAMILY;
  const labelFont = `${LABEL_WEIGHT} ${fontPx}px ${family}`;
  const captionFont = `400 ${Math.round(fontPx * 0.8)}px ${family}`;
  if (fontPx < readablePx) diagnostics.push({ code: "graph-label-small", severity: "warning",
    message: `Labels are ${fontPx} px, under the ${readablePx} px comfortable size for this output; shorten labels or use a larger frame.` });

  const safe = options.safe ?? { x: 0.06, y: 0.05, width: 0.88, height: 0.9 };
  const types = [...new Set(spec.topologies.flatMap(t => t.nodes.map(n => n.type)))].sort();
  const clusterDecl = new Map<string, GraphCluster>();
  for (const topology of spec.topologies) for (const cluster of topology.clusters ?? []) if (!clusterDecl.has(cluster.id)) clusterDecl.set(cluster.id, cluster);
  const clusterIds = [...clusterDecl.keys()].sort();
  const weights = spec.topologies.flatMap(t => drawableEdges(t)).map(e => e.weight).filter((w): w is number => w !== undefined && Number.isFinite(w));
  const maxWeight = weights.length ? Math.max(...weights) : 0;
  const hasCaptions = spec.beats.some(b => b.caption !== undefined);
  const legend: GraphStageLegend = {
    types: types.map((id, i) => ({ id, colour: i % COLOURS })),
    clusters: clusterIds.map((id, i) => ({ id, label: clusterDecl.get(id)!.label, colour: i % COLOURS })),
    ...(maxWeight > 0 ? { weight: { maxWeight, unit: spec.weightUnit ?? "", maxStrokePx, unitPx: maxStrokePx / maxWeight } } : {}),
  };
  const captionBand = hasCaptions ? Math.round(2 * fontPx * 0.8 * LINE_HEIGHT + short * 0.04) : 0;
  const legendPx = Math.round(fontPx * 0.8);
  const legendFont = `400 ${legendPx}px ${family}`;
  const legendRowHeight = legendPx * 2.2;
  const legendPad = Math.round(short * 0.02);
  const legendRows = (types.length ? 1 : 0) + (clusterIds.length ? 1 : 0) + (maxWeight > 0 ? 1 : 0);
  const legendBand = legendRows ? legendRows * legendRowHeight + legendPad * 2 : 0;
  const bottom = (safe.y + safe.height) * H;
  const graph: Rect = {
    x: safe.x * W, y: safe.y * H + captionBand,
    width: safe.width * W, height: bottom - legendBand - (safe.y * H + captionBand),
  };
  const bands = {
    caption: hasCaptions ? { x: safe.x * W, y: safe.y * H, width: safe.width * W, height: captionBand } : undefined,
    graph,
    legend: { x: safe.x * W, y: bottom - legendBand, width: safe.width * W, height: legendBand },
  };
  const legendLayout = layoutLegend(legend, { font: legendFont, px: legendPx, rowHeight: legendRowHeight, pad: legendPad,
    left: safe.x * W, right: (safe.x + safe.width) * W, top: bands.legend.y, measure: options.measure, weightUnit: spec.weightUnit ?? "" }, diagnostics);
  const maxLabelWidth = Math.round(0.2 * W);
  const labelBandHeight = MAX_LABEL_LINES * fontPx * LINE_HEIGHT + fontPx * 0.3;
  const placement: GraphLabelPlacement = W > H ? "right" : "below";
  const inset = placement === "right"
    ? { x: nodeRadius * 2, y: nodeRadius * 2 }
    : { x: Math.max(nodeRadius * 2, maxLabelWidth / 2), y: nodeRadius * 2 };
  const layoutBox: Rect = {
    x: graph.x + inset.x, y: graph.y + inset.y,
    width: graph.width - 2 * inset.x,
    height: graph.height - inset.y - (placement === "right" ? nodeRadius * 2 : nodeRadius * 2 + labelBandHeight),
  };
  if (layoutBox.width <= 0 || layoutBox.height <= 0)
    diagnostics.push({ code: "graph-box-too-small", severity: "error", message: `The graph area is ${Math.round(graph.width)}×${Math.round(graph.height)} px after bands and insets; enlarge the output.` });

  const labelCache = new Map<string, { lines: string[]; width: number }>();
  const wrapLabel = (text: string) => {
    const cached = labelCache.get(text);
    if (cached) return cached;
    const lines = wrapGraphText(text, maxLabelWidth, labelFont, options.measure);
    const width = Math.max(...lines.map(line => options.measure(labelFont, line)));
    const entry = { lines, width };
    labelCache.set(text, entry);
    return entry;
  };
  const topologies = new Map(spec.topologies.map(t => [t.id, t] as const));
  const moveFrames = spec.moveFrames ?? DEFAULT_MOVE;
  const plans: (BeatPlan | undefined)[] = [];
  const starts: number[] = [];
  let cursor = 0;
  // A spec with structural errors is refused as a whole: layout and geometry would only report noise on it.
  const structural = diagnostics.some(d => d.severity === "error");
  spec.beats.forEach((beat, index) => {
    starts.push(cursor);
    cursor += beat.durationFrames;
    const topology = topologies.get(beat.topologyId);
    if (structural || !topology || !Number.isSafeInteger(beat.durationFrames) || beat.durationFrames < 1) { plans.push(undefined); return; }
    const move = index === 0 ? 0 : Math.min(moveFrames, Math.floor(beat.durationFrames / 2));
    const offsets = pairOffsets(topology, nodeRadius * 1.1);
    const layout = beat.layout === "layered" ? layeredLayout(topology, layoutBox) : { positions: forceLayout(topology, layoutBox), diagnostics: [] as GraphStageDiagnostic[] };
    diagnostics.push(...layout.diagnostics.map(d => ({ ...d, beatId: beat.id })));
    if (layout.positions.size) {
      const footprints = new Map(topology.nodes.map(n => {
        const label = wrapLabel(n.label);
        return [n.id, footprintOf({ width: label.width, height: label.lines.length * fontPx * LINE_HEIGHT, lines: label.lines.length }, nodeRadius, fontPx, placement)] as const;
      }));
      const labels: EdgeLabelObstacle[] = beat.weightLabels ? drawableEdges(topology).filter(e => e.weight !== undefined).map(e => ({
        from: e.from, to: e.to, offset: offsets.get(e.id) ?? 0,
        width: options.measure(labelFont, weightText(e.weight!, spec.weightUnit ?? "")), height: fontPx * LINE_HEIGHT,
      })) : [];
      separateFootprints(layout.positions, footprints, layoutBox, fontPx * 0.25, labels);
    }
    const traversal = beat.traversal && topology.nodes.some(n => n.id === beat.traversal!.root) ? traverseGraph(topology, beat.traversal) : undefined;
    const total = traversal?.order.length ?? 0;
    const slot = total ? (beat.durationFrames - move) / total : 0;
    const span = Math.max(1, Math.min(slot * 0.6, moveFrames));
    const visitStart = new Map<string, number>();
    const visitNumber = new Map<string, number>();
    traversal?.order.forEach(step => {
      visitStart.set(step.nodeId, move + Math.floor((step.visit - 1) * slot));
      visitNumber.set(step.nodeId, step.visit);
    });
    const nodes = new Map<string, PlanNode>();
    for (const node of topology.nodes) {
      const wrapped = wrapLabel(node.label);
      const traversed = traversal !== undefined;
      const visited = visitStart.has(node.id);
      nodes.set(node.id, {
        node, pos: layout.positions.get(node.id) ?? { x: layoutBox.x, y: layoutBox.y },
        lines: wrapped.lines, labelWidth: wrapped.width, labelHeight: wrapped.lines.length * fontPx * LINE_HEIGHT,
        startOp: traversed ? DIM_NODE : 1, endOp: traversed ? (visited ? 1 : DIM_NODE) : 1,
        visitStart: visited ? visitStart.get(node.id) : undefined,
        visit: visited ? visitNumber.get(node.id) : undefined,
      });
    }
    const edges = new Map<string, PlanEdge>();
    for (const edge of drawableEdges(topology)) {
      const offset = offsets.get(edge.id) ?? 0;
      const traversed = traversal !== undefined;
      const bothVisited = visitStart.has(edge.from) && visitStart.has(edge.to);
      const edgeVisit = bothVisited ? Math.max(visitStart.get(edge.from)!, visitStart.get(edge.to)!) : undefined;
      edges.set(edge.id, {
        edge, offset, strokePx: edge.weight !== undefined && Number.isFinite(edge.weight) && edge.weight >= 0 && maxWeight > 0 ? edge.weight * (maxStrokePx / maxWeight) : baseStrokePx,
        start: traversed ? DIM_EDGE : 1, end: traversed ? (bothVisited ? 1 : DIM_EDGE) : 1, visitStart: edgeVisit, labelT: 0.5,
      });
    }
    plans.push({
      index, beat, topology, move, duration: beat.durationFrames, span, nodes, edges,
      caption: beat.caption !== undefined ? wrapGraphText(beat.caption, safe.width * W, captionFont, options.measure) : undefined,
      groups: beat.groups === true, weightLabels: beat.weightLabels === true,
      visited: total, total: topology.nodes.length, traversal: traversal !== undefined,
    });
    const plan = plans[plans.length - 1]!;
    if (plan.caption && plan.caption.length > 2) diagnostics.push({ code: "graph-caption-overflow", severity: "error", beatId: beat.id,
      message: `The caption of "${beat.id}" needs ${plan.caption.length} lines; the caption band holds 2. Shorten it.` });
    placeWeightLabels(plan, nodeRadius, fontPx, placement, options.measure, labelFont, spec.weightUnit ?? "");
    checkSettledGeometry(plan, nodeRadius, fontPx, W, H, placement, options.measure, labelFont, spec.weightUnit ?? "", diagnostics);
  });
  const error = diagnostics.some(d => d.severity === "error");
  return {
    status: error ? "error" : "ready", diagnostics, durationFrames: cursor, bands, legend, legendLayout,
    plans, starts, nodeRadius, fontPx, placement,
  };
}

/** Legend rows: one for types, one for clusters when declared, one for the weight scale. Measured, never truncated. */
function layoutLegend(legend: GraphStageLegend, ctx: {
  font: string; px: number; rowHeight: number; pad: number; left: number; right: number; top: number;
  measure: MeasureText; weightUnit: string;
}, out: GraphStageDiagnostic[]): GraphLegendLayout {
  const dotRadius = ctx.px * 0.45, gap = ctx.px * 0.5, itemGap = ctx.px * 1.6;
  const swatches: GraphLegendSwatch[] = [];
  let row = 0;
  const rowY = () => ctx.top + ctx.pad + row * ctx.rowHeight + ctx.rowHeight / 2;
  const place = (kind: "type" | "cluster", entries: readonly { id: string; label: string; colour: number }[]) => {
    let x = ctx.left;
    const y = rowY();
    for (const entry of entries) {
      const labelX = x + dotRadius * 2 + gap;
      swatches.push({ kind, id: entry.id, label: entry.label, colour: entry.colour, x, y, labelX });
      x = labelX + ctx.measure(ctx.font, entry.label) + itemGap;
    }
    if (entries.length && x - itemGap > ctx.right) out.push({ code: "graph-legend-overflow", severity: "warning",
      message: `The ${kind} legend is wider than the output (${Math.round(x - itemGap - ctx.left)} px of ${Math.round(ctx.right - ctx.left)} px); shorten the labels.` });
    row++;
  };
  if (legend.types.length) place("type", legend.types.map(t => ({ id: t.id, label: t.id, colour: t.colour })));
  if (legend.clusters.length) place("cluster", legend.clusters);
  let weight: GraphLegendLayout["weight"];
  if (legend.weight) {
    const y = rowY();
    let x = ctx.left;
    const samples = [legend.weight.maxWeight, legend.weight.maxWeight / 2].map(value => {
      const length = ctx.px * 2.4;
      const label = `${String(value)}${ctx.weightUnit ? ` ${ctx.weightUnit}` : ""}`;
      const sample = { value, strokePx: value * legend.weight!.unitPx, x, y, length, label, labelX: x + length + gap };
      x = sample.labelX + ctx.measure(ctx.font, label) + itemGap;
      return sample;
    });
    const caption = "line width ∝ weight";
    const captionX = x;
    if (captionX + ctx.measure(ctx.font, caption) > ctx.right) out.push({ code: "graph-legend-overflow", severity: "warning",
      message: "The weight legend is wider than the output; shorten the unit or enlarge the output." });
    weight = { samples, caption, captionX, y };
    row++;
  }
  return { font: ctx.font, dotRadius, swatches, weight };
}

function circleBox(center: Vec2, radius: number): Rect {
  return { x: center.x - radius, y: center.y - radius, width: radius * 2, height: radius * 2 };
}

/** Labels sit centred under their node, or to its right on wide outputs where vertical room is the scarce resource. */
function labelBoxAt(center: Vec2, label: { width: number; height: number }, radius: number, fontPx: number, placement: GraphLabelPlacement): Rect {
  const gap = fontPx * 0.3;
  return placement === "right"
    ? { x: center.x + radius + gap, y: center.y - label.height / 2, width: label.width, height: label.height }
    : { x: center.x - label.width / 2, y: center.y + radius + gap, width: label.width, height: label.height };
}

function footprintOf(label: { width: number; height: number; lines: number }, radius: number, fontPx: number, placement: GraphLabelPlacement): Footprint {
  const gap = fontPx * 0.3;
  return placement === "right"
    ? { left: radius, right: radius + gap + label.width, up: Math.max(radius, label.height / 2), down: Math.max(radius, label.height / 2) }
    : { left: Math.max(radius, label.width / 2), right: Math.max(radius, label.width / 2), up: radius, down: radius + gap + label.height };
}

/** Node overlaps, label overlaps and labels outside the output, measured at the beat's final positions. */
const LABEL_T_CANDIDATES = [0.5, 0.4, 0.6, 0.3, 0.7, 0.2, 0.8];

/** Weight label rect for an edge at fraction `t` along it, pushed `offset` px to the side of the line. */
function weightLabelRect(a: Vec2, b: Vec2, t: number, offset: number, width: number, height: number): Rect {
  const length = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const cx = a.x + (b.x - a.x) * t - (b.y - a.y) / length * offset;
  const cy = a.y + (b.y - a.y) * t + (b.x - a.x) / length * offset;
  return { x: cx - width / 2, y: cy - height / 2, width, height };
}

/** Each weight label takes the first clear position along its edge; if none is clear it stays at the midpoint and the
 * geometry check reports the overlap. Deterministic: candidates in fixed order, edges in declaration order. */
function placeWeightLabels(plan: BeatPlan, radius: number, fontPx: number, placement: GraphLabelPlacement,
  measure: MeasureText, labelFont: string, unit: string) {
  if (!plan.weightLabels) return;
  const blocked: Rect[] = [...plan.nodes.values()].flatMap(p => [
    labelBoxAt(p.pos, { width: p.labelWidth, height: p.labelHeight }, radius, fontPx, placement), circleBox(p.pos, radius)]);
  for (const e of plan.edges.values()) {
    if (e.edge.weight === undefined) continue;
    const a = plan.nodes.get(e.edge.from)!.pos, b = plan.nodes.get(e.edge.to)!.pos;
    const text = weightText(e.edge.weight, unit);
    const width = measure(labelFont, text), height = fontPx * LINE_HEIGHT;
    const clear = LABEL_T_CANDIDATES.find(t => {
      const rect = weightLabelRect(a, b, t, e.offset, width, height);
      return !blocked.some(r => rectsOverlap(rect, r));
    }) ?? 0.5;
    e.labelT = clear;
    blocked.push(weightLabelRect(a, b, clear, e.offset, width, height));
  }
}

function checkSettledGeometry(plan: BeatPlan, radius: number, fontPx: number, W: number, H: number, placement: GraphLabelPlacement,
  measure: MeasureText, labelFont: string, unit: string, out: GraphStageDiagnostic[]) {
  const beatId = plan.beat.id;
  const placed = [...plan.nodes.values()].map(p => ({ id: p.node.id, label: p.node.label, centre: p.pos,
    rect: labelBoxAt(p.pos, { width: p.labelWidth, height: p.labelHeight }, radius, fontPx, placement) }));
  if (plan.weightLabels) {
    const weighted = [...plan.edges.values()].filter(e => e.edge.weight !== undefined).map(e => {
      const a = plan.nodes.get(e.edge.from)!.pos, b = plan.nodes.get(e.edge.to)!.pos;
      const text = weightText(e.edge.weight!, unit);
      return { id: e.edge.id, label: text, rect: weightLabelRect(a, b, e.labelT, e.offset, measure(labelFont, text), fontPx * LINE_HEIGHT) };
    });
    for (let i = 0; i < weighted.length; i++) {
      for (let j = i + 1; j < weighted.length; j++) if (rectsOverlap(weighted[i].rect, weighted[j].rect))
        out.push({ code: "graph-edge-label-overlap", severity: "warning", beatId, edgeId: weighted[i].id,
          message: `Weight labels "${weighted[i].label}" and "${weighted[j].label}" overlap in "${beatId}".` });
      for (const p of placed) if (rectsOverlap(weighted[i].rect, p.rect))
        out.push({ code: "graph-edge-label-overlap", severity: "warning", beatId, edgeId: weighted[i].id,
          message: `The weight label "${weighted[i].label}" covers the label of "${p.label}" in "${beatId}".` });
    }
  }
  for (let i = 0; i < placed.length; i++) for (let j = i + 1; j < placed.length; j++) {
    const a = placed[i], b = placed[j];
    if (Math.hypot(a.centre.x - b.centre.x, a.centre.y - b.centre.y) < radius * 2)
      out.push({ code: "graph-node-overlap", severity: "warning", beatId, nodeId: a.id,
        message: `Nodes "${a.label}" and "${b.label}" overlap in "${beatId}".` });
  }
  for (let i = 0; i < placed.length; i++) {
    const label = placed[i];
    if (label.rect.x < 0 || label.rect.y < 0 || label.rect.x + label.rect.width > W || label.rect.y + label.rect.height > H)
      out.push({ code: "graph-label-outside", severity: "warning", beatId, nodeId: label.id,
        message: `The label of "${label.label}" falls outside the output in "${beatId}".` });
    for (let j = i + 1; j < placed.length; j++) if (rectsOverlap(label.rect, placed[j].rect))
      out.push({ code: "graph-label-overlap", severity: "warning", beatId, nodeId: label.id,
        message: `Labels "${label.label}" and "${placed[j].label}" overlap in "${beatId}".` });
    for (const other of placed) if (other.id !== label.id && rectsOverlap(label.rect, circleBox(other.centre, radius)))
      out.push({ code: "graph-label-overlap", severity: "warning", beatId, nodeId: label.id,
        message: `The label of "${label.label}" covers node "${other.label}" in "${beatId}".` });
  }
}

/** Total frames of the spec. */
export function graphStageDuration(spec: GraphStageSpec): number {
  return spec.beats.reduce((n, b) => n + b.durationFrames, 0);
}

/* ------------------------------------------------------------------ *
 * Evaluation
 * ------------------------------------------------------------------ */

/** The stage at one absolute frame. Refused stages (any error) return no nodes, edges or clusters. */
export function evaluateGraphStage(prepared: PreparedGraphStage, frame: number): GraphStageFrame {
  const t = Math.max(0, Math.min(prepared.durationFrames - 1, Math.floor(frame)));
  let beatIndex = prepared.starts.length - 1;
  for (let i = 0; i < prepared.starts.length; i++) if (t >= prepared.starts[i] && t < prepared.starts[i] + (prepared.plans[i]?.duration ?? 0)) { beatIndex = i; break; }
  const plan = prepared.plans[beatIndex];
  const local = t - prepared.starts[beatIndex];
  const beatId = plan?.beat.id ?? "";
  if (prepared.status === "error" || !plan) {
    return { status: "error", beatIndex, beatId, local, caption: [], nodes: [], edges: [], clusters: [], visited: 0, total: 0,
      legend: prepared.legend, summary: `Refused: ${prepared.diagnostics.filter(d => d.severity === "error").map(d => d.code).join(", ")}` };
  }
  const prev = beatIndex > 0 ? prepared.plans[beatIndex - 1] : undefined;
  const transitioning = prev !== undefined && plan.move > 0 && local < plan.move;
  const e = transitioning ? easeMove(local / plan.move) : 1;
  const colourOfType = new Map(prepared.legend.types.map(t => [t.id, t.colour] as const));
  const groupsAmount = transitioning ? lerp(prev!.groups ? 1 : 0, plan.groups ? 1 : 0, e) : plan.groups ? 1 : 0;
  const labelsAmount = transitioning ? lerp(prev!.weightLabels ? 1 : 0, plan.weightLabels ? 1 : 0, e) : plan.weightLabels ? 1 : 0;

  const nodeIds = plan.topology.nodes.map(n => n.id);
  if (transitioning) for (const id of prev!.nodes.keys()) if (!plan.nodes.has(id)) nodeIds.push(id);
  const drawn = new Map<string, { x: number; y: number; opacity: number; node: GraphNode; owner: PlanNode; visit?: number }>();
  for (const id of nodeIds) {
    const next = plan.nodes.get(id), before = prev?.nodes.get(id);
    let pos: Vec2, opacity: number, owner: PlanNode, visit: number | undefined;
    if (transitioning && next && before) {
      pos = { x: lerp(before.pos.x, next.pos.x, e), y: lerp(before.pos.y, next.pos.y, e) };
      opacity = before.endOp * (1 - e) + next.startOp * e; owner = next;
    } else if (transitioning && next) {
      pos = next.pos; opacity = next.startOp * e; owner = next;
    } else if (transitioning && before) {
      pos = before.pos; opacity = before.endOp * (1 - e); owner = before;
    } else if (next) {
      pos = next.pos; owner = next;
      opacity = settledOpacity(next.startOp, next.endOp, next.visitStart, plan.span, local);
      visit = next.visit !== undefined && next.visitStart !== undefined && local >= next.visitStart ? next.visit : undefined;
    } else continue;
    drawn.set(id, { x: pos.x, y: pos.y, opacity, node: owner.node, owner, visit });
  }

  const nodes: GraphNodeFrame[] = [];
  for (const [id, d] of drawn) {
    const cluster = d.node.cluster;
    const colour = colourOfType.get(d.node.type) ?? 0;
    const labelBox = labelBoxAt({ x: d.x, y: d.y }, { width: d.owner.labelWidth, height: d.owner.labelHeight }, prepared.nodeRadius, prepared.fontPx, prepared.placement);
    nodes.push({ id, type: d.node.type, cluster, label: d.node.label, lines: d.owner.lines, x: d.x, y: d.y,
      radius: prepared.nodeRadius, opacity: d.opacity, colour, labelAlign: prepared.placement === "right" ? "start" : "middle", visit: d.visit, labelBox });
  }

  const edgeIds = plan.topology.edges.map(ed => ed.id);
  if (transitioning) for (const id of prev!.edges.keys()) if (!plan.edges.has(id)) edgeIds.push(id);
  const edges: GraphEdgeFrame[] = [];
  for (const id of edgeIds) {
    const next = plan.edges.get(id), before = prev?.edges.get(id);
    const owner = next ?? before;
    if (!owner) continue;
    const from = drawn.get(owner.edge.from), to = drawn.get(owner.edge.to);
    if (!from || !to) continue;
    let opacity: number, strokePx: number;
    if (transitioning && next && before) {
      opacity = before.end * (1 - e) + next.start * e; strokePx = lerp(before.strokePx, next.strokePx, e);
    } else if (transitioning && next) {
      opacity = next.start * e; strokePx = next.strokePx;
    } else if (transitioning && before) {
      opacity = before.end * (1 - e); strokePx = before.strokePx;
    } else if (next) {
      opacity = settledOpacity(next.start, next.end, next.visitStart, plan.span, local); strokePx = next.strokePx;
    } else continue;
    const offset = next ? next.offset : before!.offset;
    const dx = to.x - from.x, dy = to.y - from.y, length = Math.hypot(dx, dy);
    if (length < 1e-6) continue;
    const ux = dx / length, uy = dy / length, nx = -uy, ny = ux;
    const ox = nx * offset, oy = ny * offset;
    const directed = isDirected(owner.edge);
    const trimStart = prepared.nodeRadius, trimEnd = prepared.nodeRadius + (directed ? 3 : 0);
    const weight = owner.edge.weight;
    const weightLabelOn = weight !== undefined && labelsAmount > 0;
    edges.push({
      id, type: owner.edge.type, from: owner.edge.from, to: owner.edge.to, directed,
      x1: from.x + ox + ux * trimStart, y1: from.y + oy + uy * trimStart,
      x2: to.x + ox - ux * trimEnd, y2: to.y + oy - uy * trimEnd,
      strokePx, opacity, weight,
      weightText: weightLabelOn ? weightText(weight!, prepared.legend.weight?.unit ?? "") : undefined,
      labelAt: { x: from.x + (to.x - from.x) * owner.labelT + ox, y: from.y + (to.y - from.y) * owner.labelT + oy },
      labelOpacity: weightLabelOn ? opacity * labelsAmount : 0,
    });
  }

  const clusters: GraphClusterFrame[] = [];
  if (groupsAmount > 0 && plan.topology.clusters) {
    for (const cluster of plan.topology.clusters) {
      const points: Vec2[] = [];
      for (const d of drawn.values()) {
        if (d.node.cluster !== cluster.id || d.opacity < 0.05) continue;
        for (let k = 0; k < 12; k++) {
          const angle = (k / 12) * Math.PI * 2;
          points.push({ x: d.x + Math.cos(angle) * prepared.nodeRadius * 2.2, y: d.y + Math.sin(angle) * prepared.nodeRadius * 2.2 });
        }
      }
      if (points.length) {
        const shape = convexHull(points);
        const top = shape.reduce((best, p) => (p.y < best.y ? p : best), shape[0]);
        clusters.push({ id: cluster.id, label: cluster.label, points: shape, opacity: groupsAmount * 0.12,
          labelAt: { x: top.x, y: top.y - prepared.fontPx * 0.5 }, labelOpacity: groupsAmount });
      }
    }
  }

  const visited = nodes.filter(n => n.visit !== undefined).length;
  const total = nodes.length;
  const summary = `${plan.beat.caption ?? plan.beat.id}: ${total} nodes, ${edges.length} edges, ${plan.beat.layout} layout` +
    (plan.traversal ? `, ${visited} of ${plan.visited} visited` : "");
  return {
    status: "ready", beatIndex, beatId, local,
    caption: plan.caption ?? [],
    nodes, edges, clusters, visited, total, legend: prepared.legend, summary,
  };
}
