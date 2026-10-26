import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { GraphTopologyStageView } from "../../registry/visual/graph-topology-stage-react";
import { prepareGraphStage, graphStageDuration } from "../../registry/visual/graph-topology-stage";
import type { GraphStageDiagnostic, GraphStageSpec, GraphTopology } from "../../registry/visual/graph-topology-stage";
import { createCanvasMeasurer } from "../../registry/media/text-layout";

/* Three unrelated, fictional domains; one component. Nothing here is a real network, person or measured value.
 * The neural network shows structure only: no weights, no training, no accuracy. Route lengths are invented
 * for the demo and labelled as fictional on screen. */

const fps = { num: 30, den: 1 };
const edge = (from: string, to: string, type: string, extra: Record<string, unknown> = {}) => ({ id: `${from}-${to}`, from, to, type, ...extra });

const layers = (inputs: string[], hidden: string[], outputs: string[]): GraphTopology => ({
  id: "net",
  nodes: [
    ...inputs.map((id, i) => ({ id, label: `Input ${i + 1}`, type: "input" })),
    ...hidden.map((id, i) => ({ id, label: `Hidden ${i + 1}`, type: "hidden" })),
    ...outputs.map((id, i) => ({ id, label: `Output ${i + 1}`, type: "output" })),
  ],
  edges: [
    ...inputs.flatMap(i => hidden.map(h => edge(i, h, "feeds"))),
    ...hidden.flatMap(h => outputs.map(o => edge(h, o, "feeds"))),
  ],
});
const NET = layers(["in1", "in2", "in3"], ["h1", "h2", "h3", "h4"], ["o1", "o2"]);
const NET_SPEC: GraphStageSpec = { id: "fictional-net", fps, topologies: [NET], beats: [
  { id: "structure", topologyId: "net", layout: "layered", durationFrames: 60,
    caption: "Feed-forward structure: 3 inputs, 4 hidden, 2 outputs. Shape only, not a trained model." },
  { id: "signal", topologyId: "net", layout: "layered", durationFrames: 150,
    traversal: { algorithm: "bfs", root: "in1" }, caption: "Visit order from Input 1 through the hidden layer" },
  { id: "relayout", topologyId: "net", layout: "force", durationFrames: 90,
    caption: "Same nodes and links, force layout: positions change, identities do not" },
] };

const DEPOT: GraphTopology = {
  id: "depot",
  nodes: [
    { id: "depot", label: "Depot", type: "depot" },
    { id: "north", label: "North hub", type: "hub" },
    { id: "south", label: "South hub", type: "hub" },
    ...["a", "b", "c", "d", "e"].map((id, i) => ({ id, label: `Stop ${"ABCDE"[i]}`, type: "stop" })),
  ],
  edges: [
    edge("depot", "north", "route", { weight: 9, directed: false }),
    edge("depot", "south", "route", { weight: 7, directed: false }),
    edge("north", "a", "route", { weight: 4, directed: false }),
    edge("north", "b", "route", { weight: 6, directed: false }),
    edge("south", "c", "route", { weight: 5, directed: false }),
    edge("south", "d", "route", { weight: 8, directed: false }),
    edge("a", "b", "route", { weight: 3, directed: false }),
    edge("c", "d", "route", { weight: 2, directed: false }),
    edge("b", "e", "route", { weight: 5, directed: false }),
    edge("d", "e", "route", { weight: 6, directed: false }),
  ],
};
const DEPOT_SPEC: GraphStageSpec = { id: "fictional-depot", fps, topologies: [DEPOT], weightUnit: "km", beats: [
  { id: "network", topologyId: "depot", layout: "force", durationFrames: 60, caption: "Depot network with fictional route lengths in km" },
  { id: "tour", topologyId: "depot", layout: "force", durationFrames: 180, weightLabels: true,
    traversal: { algorithm: "dfs", root: "depot" }, caption: "Delivery tour from the depot: visit order with exact route lengths" },
  { id: "totals", topologyId: "depot", layout: "force", durationFrames: 60, weightLabels: true,
    caption: "Routes are two-way: each length is shared by both of its ends" },
] };

const SOCIAL_NODES = ["A", "B", "C", "D", "E", "F", "G"].map(id => ({ id, label: id, type: id === "C" || id === "E" ? "connector" : "member" }));
const SOCIAL_CLUSTERS = [{ id: "g1", label: "Group 1" }, { id: "g2", label: "Group 2" }];
const groupOf = (id: string) => (["A", "B", "C", "D"].includes(id) ? "g1" : "g2");
const SOCIAL_BEFORE: GraphTopology = {
  id: "before", clusters: SOCIAL_CLUSTERS,
  nodes: SOCIAL_NODES.map(n => ({ ...n, cluster: groupOf(n.id) })),
  edges: [
    edge("A", "B", "knows", { directed: false }), edge("B", "C", "knows", { directed: false }),
    edge("C", "D", "knows", { directed: false }), edge("D", "A", "knows", { directed: false }),
    edge("C", "E", "follows"), edge("E", "F", "knows", { directed: false }),
    edge("F", "G", "knows", { directed: false }), edge("G", "E", "follows"),
  ],
};
const SOCIAL_JOINED: GraphTopology = {
  id: "joined", clusters: SOCIAL_CLUSTERS,
  nodes: [...SOCIAL_BEFORE.nodes, { id: "H", label: "H", type: "member", cluster: "g2" }],
  edges: [...SOCIAL_BEFORE.edges, edge("F", "H", "knows", { directed: false }), edge("H", "G", "follows")],
};
const SOCIAL_SPEC: GraphStageSpec = { id: "fictional-social", fps, topologies: [SOCIAL_BEFORE, SOCIAL_JOINED], beats: [
  { id: "groups", topologyId: "before", layout: "force", durationFrames: 60, groups: true,
    caption: "Two fictional groups; clusters are declared in the data, not detected" },
  { id: "joins", topologyId: "joined", layout: "force", durationFrames: 75, groups: true, appear: ["H"],
    caption: "H joins Group 2; existing members keep their identity" },
  { id: "walk", topologyId: "joined", layout: "force", durationFrames: 150, groups: true,
    traversal: { algorithm: "bfs", root: "A" }, caption: "Visit order from A along knows and follows links" },
] };

const DOMAINS: Array<{ id: string; label: string; spec: GraphStageSpec }> = [
  { id: "network", label: "Neural network: structure", spec: NET_SPEC },
  { id: "depot", label: "Logistics: delivery tour", spec: DEPOT_SPEC },
  { id: "social", label: "Social: groups and reach", spec: SOCIAL_SPEC },
];
const OUTPUTS = [{ id: "portrait", width: 1080, height: 1920, max: 300 }, { id: "landscape", width: 1920, height: 1080, max: 560 }];

const note: CSSProperties = { margin: 0, font: "400 13px/1.5 var(--km-font-body, system-ui, sans-serif)", color: "var(--km-text-muted, #5b6472)" };
const tone = (d: GraphStageDiagnostic) => d.severity === "error" ? "var(--km-text-danger, #b91c1c)" : "var(--km-status-warning, #b45309)";
const button = (active: boolean): CSSProperties => ({ padding: "8px 14px", borderRadius: 8, font: "600 14px/1 var(--km-font-body, system-ui)",
  border: "1px solid var(--km-rule, #cfd5dd)", background: active ? "var(--km-accent, #2f5f8a)" : "var(--km-surface, #ffffff)", color: active ? "#ffffff" : "inherit" });

function Walkthrough({ startFrame }: { startFrame: number }) {
  const [domain, setDomain] = useState(0);
  const spec = DOMAINS[domain].spec;
  const total = graphStageDuration(spec);
  const [frame, setFrame] = useState(startFrame);
  const [playing, setPlaying] = useState(false);
  const [diagnostics, setDiagnostics] = useState<Record<string, GraphStageDiagnostic[]>>({});
  useEffect(() => {
    if (!playing) return;
    let raf = 0, origin: number | undefined; const from = frame >= total - 1 ? 0 : frame;
    const tick = (t: number) => { origin ??= t; const next = from + Math.floor((t - origin) * 30 / 1000);
      if (next >= total) { setFrame(total - 1); setPlaying(false); return; } setFrame(next); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]); // eslint-disable-line react-hooks/exhaustive-deps -- restart only on play/pause
  const all = [...new Map(Object.entries(diagnostics).flatMap(([id, list]) => list.map(d => [`${d.code}|${d.message}`, { ...d, message: `${d.message} (${id})` }] as const))).values()];
  return <section style={{ padding: 20, display: "grid", gap: 16, background: "var(--km-surface-canvas, #f6f7f9)", color: "var(--km-text-primary, #1f2937)", font: "400 14px/1.5 var(--km-font-body, system-ui, sans-serif)" }}>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {DOMAINS.map((d, i) => <button key={d.id} type="button" aria-pressed={i === domain} style={button(i === domain)}
        onClick={() => { setDomain(i); setFrame(0); setPlaying(false); }}>{d.label}</button>)}
    </div>
    <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
      <button type="button" onClick={() => setPlaying(p => !p)} style={button(false)}>{playing ? "Pause" : "Play"}</button>
      <input aria-label="Seek" type="range" min={0} max={total - 1} value={Math.min(frame, total - 1)} onChange={e => { setPlaying(false); setFrame(Number(e.target.value)); }} style={{ flex: "1 1 260px" }} />
      <span style={{ fontFamily: "var(--km-font-mono, ui-monospace, monospace)" }}>frame {Math.min(frame, total - 1)}</span>
    </div>
    <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
      {OUTPUTS.map(o => <figure key={o.id} style={{ margin: 0, width: "100%", maxWidth: o.max, display: "grid", gap: 6 }}>
        <GraphTopologyStageView spec={spec} frame={frame} width={o.width} height={o.height} style={{ borderRadius: 12, overflow: "hidden" }}
          onDiagnostics={d => setDiagnostics(prev => ({ ...prev, [o.id]: d }))} />
        <figcaption style={note}>{o.width}×{o.height}</figcaption>
      </figure>)}
    </div>
    {all.length ? <ul style={{ margin: 0, paddingLeft: 20 }}>{all.map((d, i) => <li key={i}><strong style={{ color: tone(d) }}>{d.code}</strong> — {d.message}</li>)}</ul>
      : <p style={{ ...note, color: "var(--km-status-success, #15803d)", fontWeight: 600 }}>Every identity holds, every route has a checked length, and no warnings are raised in either output.</p>}
    <p style={note}>Fictional sample networks in three domains. The neural network shows structure only, not a trained model or its accuracy. GraphTopologyStage checks layout and references; it does not run the networks.</p>
  </section>;
}

/* Deliberately broken specs, each expected to be refused with a stable code. */
const DEPOT_TOPOLOGY = DEPOT;
const BROKEN: Array<{ label: string; expect: string; spec: GraphStageSpec }> = [
  { label: "Edge to a node that does not exist", expect: "graph-edge-unknown-endpoint",
    spec: { ...DEPOT_SPEC, topologies: [{ ...DEPOT_TOPOLOGY, edges: [...DEPOT.edges, edge("e", "zone-9", "route", { weight: 2, directed: false })] }] } },
  { label: "Two nodes with the same id", expect: "graph-node-duplicate",
    spec: { ...DEPOT_SPEC, topologies: [{ ...DEPOT_TOPOLOGY, nodes: [...DEPOT.nodes, { id: "a", label: "Stop A again", type: "stop" }] }] } },
  { label: "Identity lost: the same id gets a new label in a later beat", expect: "graph-identity-lost",
    spec: { ...DEPOT_SPEC, topologies: [DEPOT, { ...DEPOT, id: "renamed", nodes: DEPOT.nodes.map(n => n.id === "a" ? { ...n, label: "Stop Alpha" } : n) }],
      beats: [{ id: "before", topologyId: "depot", layout: "force", durationFrames: 60 }, { id: "after", topologyId: "renamed", layout: "force", durationFrames: 60 }] } },
  { label: "A node appears without being declared in appear", expect: "graph-node-set-undeclared",
    spec: { ...NET_SPEC, topologies: [NET, { ...NET, id: "grown", nodes: [...NET.nodes, { id: "h5", label: "Hidden 5", type: "hidden" }] }],
      beats: [{ id: "one", topologyId: "net", layout: "layered", durationFrames: 60 }, { id: "two", topologyId: "grown", layout: "layered", durationFrames: 60 }] } },
  { label: "Negative route length", expect: "graph-weight-invalid",
    spec: { ...DEPOT_SPEC, topologies: [{ ...DEPOT_TOPOLOGY, edges: DEPOT.edges.map(e => e.id === "depot-north" ? { ...e, weight: -7 } : e) }] } },
  { label: "A node without its cluster while clusters are declared", expect: "graph-cluster-missing",
    spec: { ...SOCIAL_SPEC, topologies: [SOCIAL_BEFORE, SOCIAL_JOINED].map(t => ({ ...t, nodes: t.nodes.map(n => n.id === "B" ? { id: "B", label: "B", type: "member" } : n) })) } },
  { label: "A cycle in a layered layout", expect: "graph-cycle-layered",
    spec: { id: "cyclic", fps, topologies: [{ id: "loop", nodes: [{ id: "a", label: "Alpha", type: "step" }, { id: "b", label: "Beta", type: "step" }, { id: "c", label: "Gamma", type: "step" }],
      edges: [edge("a", "b", "next"), edge("b", "c", "next"), edge("c", "a", "next")] }],
      beats: [{ id: "layered", topologyId: "loop", layout: "layered", durationFrames: 60 }] } },
  { label: "A traversal from a root that is not in the graph", expect: "graph-root-unknown",
    spec: { ...NET_SPEC, beats: [{ id: "signal", topologyId: "net", layout: "layered", durationFrames: 150, traversal: { algorithm: "bfs", root: "in9" } }] } },
  { label: "A self-loop: legible warning, not drawn", expect: "graph-self-loop",
    spec: { ...DEPOT_SPEC, topologies: [{ ...DEPOT_TOPOLOGY, edges: [...DEPOT.edges, edge("north", "north", "route", { weight: 1, directed: false })] }] } },
];

function Refusals() {
  const rows = useMemo(() => {
    const measure = createCanvasMeasurer({});
    return BROKEN.map(item => {
      const prepared = prepareGraphStage(item.spec, { width: 1080, height: 1920, measure });
      const codes = prepared.diagnostics.map(d => d.code);
      return { label: item.label, expect: item.expect, refused: prepared.status === "error", codes, diagnostics: prepared.diagnostics };
    });
  }, []);
  return <section style={{ padding: 20, display: "grid", gap: 12, font: "400 14px/1.5 var(--km-font-body, system-ui, sans-serif)", color: "var(--km-text-primary, #1f2937)" }}>
    {rows.map((r, i) => <div key={i}>
      <strong>{r.label}</strong>{" "}
      <span style={{ color: r.codes.includes(r.expect) ? "var(--km-status-success, #15803d)" : "var(--km-text-danger, #b91c1c)" }}>
        {r.codes.includes(r.expect) ? "expected code found" : "expected code missing"}
      </span>{" "}
      <span style={{ color: "var(--km-text-muted, #5b6472)" }}>{r.refused ? "(refused)" : "(not refused: warnings only)"}</span>
      <ul style={{ margin: "4px 0 0", paddingLeft: 20 }}>{r.diagnostics.map((d, j) => <li key={j}><code>{d.code}</code> ({d.severity}) — {d.message}</li>)}</ul>
    </div>)}
    <p style={note}>Each spec is fictional and deliberately wrong. A refused stage draws no nodes or edges.</p>
  </section>;
}

const meta = { title: "Explainer scenes/Graph Topology Stage", id: "visual-graph-topology-stage", component: Walkthrough, parameters: { layout: "fullscreen" },
  argTypes: { startFrame: { control: { type: "number", min: 0, max: 299 } } }, args: { startFrame: 150 } } satisfies Meta<typeof Walkthrough>;
export default meta;
type Story = StoryObj<typeof meta>;
export const WalkthroughStory: Story = { name: "Walkthrough" };
export const RefusalsStory: Story = { name: "Refusals", render: () => <Refusals /> };
