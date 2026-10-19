/** Deterministic illustrative index graph.
 * Reuses Kumiki's DiagramStage for attached links, stable IDs and packets.
 * This is a toy neighbor graph, not a real HNSW implementation.
 */
import { DiagramStage } from "../../registry/motion/diagram-stage-react";
import { createDiagramTimeline } from "../../registry/motion/diagram-stage";
import type { DiagramPacket, DiagramNodeSample } from "../../registry/motion/diagram-stage";
import type { DiagramSpec } from "../../registry/infographic/types";
import { RAG_CHUNKS, RAG_TOY_NEIGHBORS } from "./rag-domain";

const positions: Record<string, [number, number]> = {
  C01: [720, 102], C02: [440, 94], C03: [120, 304],
  C04: [290, 220], C05: [580, 313], C06: [360, 394],
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
  [id, { x, y, width: 110, height: 72 }]));
const timeline = createDiagramTimeline({
  id: "rag-ingest-index", graph, fps: { num: 30, den: 1 }, durationFrames: 210,
  layouts: [{ frame: 0, bounds: boxes }, { frame: 209, bounds: boxes }],
});
const packets: DiagramPacket[] = [
  { id: "index-C01", edgeId: "C01-C02", range: { startFrame: 35, endFrame: 92 } },
  { id: "index-C02", edgeId: "C02-C06", range: { startFrame: 85, endFrame: 142 } },
  { id: "index-C03", edgeId: "C03-C04", range: { startFrame: 137, endFrame: 191 } },
];
const palette = {
  surface: "transparent", node: "#132d40", ink: "#eaf4fc",
  mutedInk: "#8facbd", edge: "#496780", accent: "#7ee1d5",
  packet: "#a9a0fa", reversePacket: "#ffc77d",
  fontFamily: "'Geist Variable', Inter, sans-serif",
  fontSize: 23, radius: 19, strokeWidth: 2.1,
};
function ChunkNode({ bounds, node, focused }: DiagramNodeSample & { focused: boolean }) {
  const bright = focused || node.id === "C01";
  return <g>
    <rect width={bounds.width} height={bounds.height} rx={18}
      fill={bright ? "#1b4654" : "#193243"}
      stroke={bright ? "#7ce2d5" : "#628398"}
      strokeWidth={bright ? 2.7 : 1.4} />
    <circle cx="20" cy="35" r="5.5" fill={bright ? "#7ce2d5" : "#a6b4f7"} />
    <text x="36" y="45" fontSize="25" fontFamily="'Geist Variable',sans-serif"
      fontWeight="700" fill="#eaf7ff">{node.id}</text>
  </g>;
}
export function RagIndexNetwork({ frame }: { frame: number }) {
  return <DiagramStage graph={graph} timeline={timeline} frame={frame}
    width={1000} height={520} packets={packets} theme={palette}
    ariaLabel="Illustrative vector index with six labeled source chunks and linked neighbor nodes; animated packets follow connected index edges."
    reducedMotion={false}
    focusedNodeIds={frame > 70 ? ["C01", "C02"] : []}
    renderNode={sample => <ChunkNode {...sample} />}
    overlay={<>
      <text x="60" y="70" fontSize="24" fontWeight="650"
        fontFamily="'Geist Variable', sans-serif" fill="#aabdd2">
        INDEXED VECTORS · LINKED TO SOURCE TEXT
      </text>
      <text x="60" y="490" fontSize="19" fill="#7e9bae"
        fontFamily="'Geist Variable', sans-serif">
        Example neighbor graph · actual index structure varies by database
      </text>
    </>}
    style={{ background: "transparent", width: "100%", height: "100%", maxWidth: "100%" }} />;
}
