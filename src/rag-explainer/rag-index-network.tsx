/** A visually navigable vector index using Kumiki's connected DiagramStage.
 * The graph is explicitly a simplified example of ANN neighbor exploration.
 * Nodes are source-linked chunk records; animated packets represent traversal.
 */
import { DiagramStage } from "../../registry/motion/diagram-stage-react";
import { createDiagramTimeline } from "../../registry/motion/diagram-stage";
import type { DiagramPacket, DiagramNodeSample, DiagramPacketSample } from "../../registry/motion/diagram-stage";
import type { DiagramSpec } from "../../registry/infographic/types";
import { RAG_CHUNKS, RAG_EXAMPLE_TRACE, RAG_TOY_NEIGHBORS } from "./rag-domain";

type Mode = "build" | "retrieve";
const positions: Record<string, [number, number]> = {
  C01: [730, 172], C02: [444, 94], C03: [83, 340],
  C04: [288, 238], C05: [574, 327], C06: [355, 413],
};
const edges = Object.entries(RAG_TOY_NEIGHBORS).flatMap(([from, neighbors]) =>
  neighbors.filter(to => from < to).map(to => ({
    id: from + "-" + to, from, to, directed: false,
  })));
const graph: DiagramSpec = {
  direction: "horizontal",
  nodes: RAG_CHUNKS.map(chunk => ({
    id: chunk.id, label: chunk.id, description: chunk.text,
  })),
  edges,
};
const boxes = Object.fromEntries(Object.entries(positions).map(([id, [x, y]]) =>
  [id, { x, y, width: 150, height: 90 }]));
const timeline = createDiagramTimeline({
  id: "rag-vector-db-inner", graph, fps: { num: 30, den: 1 }, durationFrames: 420,
  layouts: [{ frame: 0, bounds: boxes }, { frame: 419, bounds: boxes }],
});
const palette = {
  surface: "transparent", node: "#11293b", ink: "#eaf4fc",
  mutedInk: "#82a4b8", edge: "#4e7089", accent: "#79e4d6",
  packet: "#facd90", reversePacket: "#facd90",
  fontFamily: "'Geist Variable', Inter, sans-serif",
  fontSize: 21, radius: 16, strokeWidth: 2,
};
const buildPackets: DiagramPacket[] = [
  { id: "build-01", edgeId: "C01-C02", range: { startFrame: 31, endFrame: 88 } },
  { id: "build-02", edgeId: "C02-C06", range: { startFrame: 87, endFrame: 143 } },
  { id: "build-03", edgeId: "C03-C04", range: { startFrame: 137, endFrame: 192 } },
];
const searchPackets: DiagramPacket[] = [
  { id: "hop-01", edgeId: "C03-C04", range: { startFrame: 65, endFrame: 116 } },
  { id: "hop-02", edgeId: "C04-C05", range: { startFrame: 123, endFrame: 173 } },
  { id: "hop-03", edgeId: "C01-C05", direction: "reverse",
    range: { startFrame: 180, endFrame: 231 } },
  { id: "candidate-02", edgeId: "C01-C02", range: { startFrame: 239, endFrame: 281 } },
];
const COLORS = { ink: "#eaf6fc", soft: "#8eacbf", blue: "#83baff", violet: "#b4a6ff",
  gold: "#ffcc8c", mint: "#79e4d6" };
const intensity = (t: number, at: number, duration = 20) => {
  const n = Math.max(0, Math.min(1, (t - at) / duration));
  return n * n * (3 - 2 * n);
};
const chunkById = new Map<string, typeof RAG_CHUNKS[number]>(RAG_CHUNKS.map(c => [c.id, c]));
const walk = RAG_EXAMPLE_TRACE.traversed;
function VectorNode({ node, bounds, focused, f, mode }: DiagramNodeSample & {
  focused: boolean; f: number; mode: Mode;
}) {
  const chunk = chunkById.get(node.id);
  if (!chunk) return null;
  const step = walk.indexOf(chunk.id);
  const visitedAt = step < 0 ? 999 : 65 + step * 58;
  const discovered = mode === "build" ? intensity(f, 7 + RAG_CHUNKS.indexOf(chunk) * 22)
    : intensity(f, visitedAt, 18);
  const selected = mode === "retrieve" && f > 282 &&
    RAG_EXAMPLE_TRACE.hits.some(item => item.chunk.id === chunk.id);
  const highlight = selected ? COLORS.mint : mode === "retrieve" && discovered > 0 ? COLORS.gold :
    focused ? COLORS.mint : COLORS.violet;
  const bright = Math.max(discovered, focused ? .55 : 0, selected ? 1 : 0);
  return <g opacity={mode === "build" ? .35 + discovered * .65 : .48 + bright * .52}>
    <rect x="-11" y="-11" width={bounds.width + 22} height={bounds.height + 22}
      rx="22" fill={highlight} fillOpacity={.018 + bright * .055}
      stroke={highlight} strokeOpacity={.18 + bright * .53} strokeWidth={2} />
    <rect width={bounds.width} height={bounds.height} rx="17"
      fill="#132c3f" stroke={highlight} strokeOpacity={.38 + bright * .58}
      strokeWidth={1.7 + bright * 1.4} />
    <path d="M 14 20 H 136" stroke={highlight} strokeOpacity={.38 + bright * .55} strokeWidth="2" />
    <circle cx="25" cy="48" r="9" fill={highlight} opacity={.42 + bright * .58} />
    <text x="43" y="55" fontSize="25" fontWeight="720" fill={COLORS.ink}
      fontFamily="'Geist Variable',sans-serif">{chunk.id}</text>
    <text x="19" y="80" fontSize="16" fontFamily="ui-monospace,monospace"
      fill={COLORS.soft}>{chunk.embedding.map(v => v.toFixed(2)).join("  ")}</text>
    {selected && <g>
      <circle cx="150" cy="3" r="14" fill="#16453d" stroke={COLORS.mint} strokeWidth="2" />
      <path d="M 143 -1 l 5 5 9 -11" stroke={COLORS.mint} strokeWidth="2.6"
        strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </g>}
  </g>;
}
function FlowPacket({ sample, color }: { sample: DiagramPacketSample; color: string }) {
  return <g>
    <circle r="23" fill={color} fillOpacity=".075" stroke={color} strokeOpacity=".23" />
    <circle r="11" fill={color} fillOpacity=".22" />
    <circle r="5.5" fill={color} />
    <path d="M -13 0 H -27 M 13 0 H 27" stroke={color} strokeOpacity=".4" />
    <title>{sample.packet.id}</title>
  </g>;
}
export function RagIndexNetwork({ frame, mode = "build" }: {
  frame: number; mode?: Mode;
}) {
  const clamped = Math.max(0, Math.min(419, frame));
  const showTraversal = mode === "retrieve";
  const stepIndex = walk.reduce((last, _id, index) => clamped >= 65 + index * 58 ? index : last, -1);
  const visited = showTraversal ? walk.slice(0, Math.max(0, stepIndex + 1)) : [];
  const focused = mode === "build" ? ["C01"] : clamped > 282 ? ["C01", "C02"] : visited;
  return <div style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden" }}>
    <DiagramStage graph={graph} timeline={timeline} frame={clamped}
      width={1000} height={560}
      packets={mode === "build" ? buildPackets : searchPackets}
      focusedNodeIds={focused} theme={palette} reducedMotion={false}
      ariaLabel={mode === "build"
        ? "Illustrative vector index. Six numerical embeddings stored with their document chunk IDs. Graph links represent candidate-neighbor navigation, not the embedding coordinates."
        : "A query explores a simplified approximate-neighbor graph from C03 through C04 and C05 to C01, comparing similarity and selecting C01 and C02 for source-text retrieval."}
      renderNode={sample => <VectorNode {...sample} f={clamped} mode={mode} />}
      renderPacket={sample => <FlowPacket sample={sample}
        color={mode === "build" ? COLORS.violet : COLORS.gold} />}
      overlay={<>
        <defs>
          <radialGradient id="rag-vector-sheen"><stop stopColor="#4db7b9" stopOpacity=".13" />
            <stop offset="1" stopColor="#4db7b9" stopOpacity="0" /></radialGradient>
        </defs>
        <ellipse cx="530" cy="250" rx="510" ry="270" fill="url(#rag-vector-sheen)"
          style={{ pointerEvents: "none" }} />
        <text x="22" y="53" fill={COLORS.soft} fontSize="19"
          letterSpacing="2.2" fontFamily="ui-monospace,monospace">
          {mode === "build" ? "INDEX / CHUNK → VECTOR + SOURCE ID" : "GRAPH / CANDIDATE EXPLORATION"}
        </text>
        {mode === "retrieve" && clamped > 65 && <g>
          <text x="25" y="528" fill={COLORS.gold} fontSize="18" fontFamily="ui-monospace,monospace">
            {clamped < 283 ? "TRAVERSAL  C03  →  C04  →  C05  →  C01" :
              "RANKED RESULTS  →  C01 + C02"}
          </text>
        </g>}
      </>}
      style={{ width: "100%", height: "100%", maxWidth: "100%",
        background: "transparent" }} />
    {showTraversal && clamped > 283 && <div aria-hidden="true" style={{
      position: "absolute", top: "9%", right: "4%", font: "600 12px ui-monospace,monospace",
      color: COLORS.mint, letterSpacing: ".1em",
    }}>top-k = 2 · C01 / C02</div>}
  </div>;
}
