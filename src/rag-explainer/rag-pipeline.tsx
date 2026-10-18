/** A reusable Kumiki DiagramStage is the final RAG recap, rather than
 * hand-positioned slide cards. The same semantic nodes own attached arrows and
 * data packets as diagram geometry changes or frames are sought directly.
 */
import { DiagramStage } from "../../registry/motion/diagram-stage-react";
import { createDiagramTimeline } from "../../registry/motion/diagram-stage";
import type { DiagramEdgePorts, DiagramPacket } from "../../registry/motion/diagram-stage";
import type { DiagramSpec } from "../../registry/infographic/types";
import { RAG_FPS } from "./rag-production";

const GRAPH: DiagramSpec = {
  direction: "horizontal",
  nodes: [
    { id: "documents", label: "Documents", description: "Original policy documents" },
    { id: "chunks", label: "Text chunks", description: "Source text split into indexed passages" },
    { id: "embeddings", label: "Embed", description: "Convert passages to numerical vectors" },
    { id: "index", label: "Vector index", description: "Store vectors with text IDs and source references" },
    { id: "query", label: "Question", description: "The user asks about the policy" },
    { id: "query-vector", label: "Embed query", description: "Use the same embedding space" },
    { id: "topk", label: "Retrieve top 2", description: "Rank vector similarity and load original passages" },
    { id: "prompt", label: "Context + LLM", description: "Insert passages into the prompt and generate an answer" },
  ],
  edges: [
    { id: "d-c", from: "documents", to: "chunks" },
    { id: "c-e", from: "chunks", to: "embeddings" },
    { id: "e-i", from: "embeddings", to: "index" },
    { id: "q-v", from: "query", to: "query-vector" },
    { id: "v-k", from: "query-vector", to: "topk" },
    { id: "i-k", from: "index", to: "topk" },
    { id: "k-p", from: "topk", to: "prompt" },
  ],
};
const BOUNDS: Record<string, { x: number; y: number; width: number; height: number }> =
  Object.fromEntries([
    ["documents", 30, 172], ["chunks", 281, 172], ["embeddings", 532, 172], ["index", 783, 172],
    ["query", 30, 435], ["query-vector", 281, 435], ["topk", 532, 435], ["prompt", 783, 435],
  ].map(([id, x, y]) => [id, { x: Number(x), y: Number(y), width: 213, height: 91 }]));
const TIMELINE = createDiagramTimeline({
  id: "rag-two-lane-recap", graph: GRAPH, fps: RAG_FPS, durationFrames: 180,
  layouts: [{ frame: 0, bounds: BOUNDS }, { frame: 179, bounds: BOUNDS }],
});
const PORTS: Record<string, DiagramEdgePorts> = {
  "i-k": { from: { side: "bottom", offset: .5 }, to: { side: "top", offset: .5 }, curvature: .35 },
};
const PACKETS: DiagramPacket[] = [
  { id: "split", edgeId: "d-c", range: { startFrame: 7, endFrame: 34 } },
  { id: "embed", edgeId: "c-e", range: { startFrame: 34, endFrame: 61 } },
  { id: "index", edgeId: "e-i", range: { startFrame: 61, endFrame: 88 } },
  { id: "query", edgeId: "q-v", range: { startFrame: 36, endFrame: 63 } },
  { id: "lookup", edgeId: "v-k", range: { startFrame: 63, endFrame: 93 } },
  { id: "context", edgeId: "i-k", range: { startFrame: 100, endFrame: 130 } },
  { id: "generate", edgeId: "k-p", range: { startFrame: 135, endFrame: 169 } },
];
const THEME = {
  surface: "transparent", node: "#182e40", ink: "#edf6fc", mutedInk: "#a6c5d1",
  edge: "#7194a5", accent: "#74e4d4", packet: "#7cecd9",
  fontFamily: "'Geist Variable', Inter, system-ui, sans-serif",
  fontSize: 21, radius: 15, strokeWidth: 2.5,
};
export function RagPipelineDiagram({ frame }: { frame: number }) {
  return <DiagramStage graph={GRAPH} timeline={TIMELINE}
    frame={frame} width={1050} height={680} theme={THEME}
    packets={PACKETS} ports={PORTS} reducedMotion={false}
    focusedNodeIds={frame < 86 ? ["documents", "chunks", "embeddings", "index"] :
      frame < 133 ? ["query", "query-vector", "topk", "index"] : ["topk", "prompt"]}
    ariaLabel="How RAG works: offline document chunking, embedding and indexing feed query-time embedding, retrieval of original passages and a source-grounded language model answer."
    overlay={<>
      <text x="38" y="130" fill="#b6a9f5" fontSize="22" fontWeight="650">
        BEFORE THE QUESTION · INDEX ONCE
      </text>
      <text x="38" y="395" fill="#f4c889" fontSize="22" fontWeight="650">
        WHEN A QUESTION ARRIVES · SEARCH AND ANSWER
      </text>
      <text x="35" y="612" fill="#80e8d7" fontSize="21">
        Same embedding space · selected source text enters the prompt · no retraining
      </text>
    </>}
  />;
}
