/** Full PDF-first RAG recap rendered with Kumiki's semantic DiagramStage:
 * stable nodes, attached connector ports, deterministic traveling packets.
 * Layout designed for a 1400×402 video-safe area, not a slide deck.
 */
import { DiagramStage } from "../../registry/motion/diagram-stage-react";
import { createDiagramTimeline } from "../../registry/motion/diagram-stage";
import type { DiagramEdgePorts, DiagramPacket } from "../../registry/motion/diagram-stage";
import type { DiagramSpec } from "../../registry/infographic/types";
import { RAG_FPS } from "./rag-production";

const stages = [
  ["pdf", "PDF", "Original document"],
  ["extract", "Parse / OCR", "Extract page text"],
  ["chunks", "Chunks", "Source-linked passages"],
  ["embed-doc", "Embed", "Chunk vectors"],
  ["index", "Vector DB", "Vector + source IDs"],
  ["question", "Question", "What did user ask?"],
  ["embed-query", "Embed query", "Same vector space"],
  ["topk", "Top-k", "Similarity-ranked IDs"],
  ["passages", "Source text", "Recover original words"],
  ["prompt", "Prompt", "Question + context"],
  ["llm", "LLM", "Generate with context"],
  ["answer", "Answer", "Cited output"],
] as const;
const graph: DiagramSpec = {
  direction: "horizontal",
  nodes: stages.map(([id, label, description]) => ({ id, label, description })),
  edges: [
    { id: "pdf-to-extract", from: "pdf", to: "extract" },
    { id: "extract-to-chunks", from: "extract", to: "chunks" },
    { id: "chunks-to-embed", from: "chunks", to: "embed-doc" },
    { id: "embed-to-index", from: "embed-doc", to: "index" },
    { id: "question-to-embed", from: "question", to: "embed-query" },
    { id: "embed-to-topk", from: "embed-query", to: "topk" },
    { id: "index-to-topk", from: "index", to: "topk" },
    { id: "topk-to-passages", from: "topk", to: "passages" },
    { id: "passages-to-prompt", from: "passages", to: "prompt" },
    { id: "prompt-to-llm", from: "prompt", to: "llm" },
    { id: "llm-to-answer", from: "llm", to: "answer" },
  ],
};
const row = (index: number) => ({ x: 27 + index*200, width: 170, height: 67 });
const bounds = Object.fromEntries(
  stages.map(([id], index) => [id, {
    ...row(index < 5 ? index : index - 5),
    // Query and final answer use a shared horizontal axis, with distinct lanes.
    y: index < 5 ? 68 : 277,
  }]),
);
const timeline = createDiagramTimeline({
  id: "rag-full-pipeline", graph, fps: RAG_FPS, durationFrames: 240,
  layouts: [{ frame: 0, bounds }, { frame: 239, bounds }],
});
const ports: Record<string, DiagramEdgePorts> = {
  "index-to-topk": {
    from: { side: "bottom", offset: .5 },
    to: { side: "top", offset: .5 }, curvature: .27,
  },
};
const packets: DiagramPacket[] = [
  { id: "parse", edgeId: "pdf-to-extract", range: { startFrame: 8, endFrame: 36 } },
  { id: "split", edgeId: "extract-to-chunks", range: { startFrame: 36, endFrame: 64 } },
  { id: "vectorize", edgeId: "chunks-to-embed", range: { startFrame: 64, endFrame: 92 } },
  { id: "index", edgeId: "embed-to-index", range: { startFrame: 92, endFrame: 119 } },
  { id: "question", edgeId: "question-to-embed", range: { startFrame: 47, endFrame: 80 } },
  { id: "similarity", edgeId: "embed-to-topk", range: { startFrame: 96, endFrame: 122 } },
  { id: "index-lookup", edgeId: "index-to-topk", range: { startFrame: 128, endFrame: 159 } },
  { id: "fetch-text", edgeId: "topk-to-passages", range: { startFrame: 159, endFrame: 183 } },
  { id: "augment", edgeId: "passages-to-prompt", range: { startFrame: 183, endFrame: 204 } },
  { id: "generate", edgeId: "prompt-to-llm", range: { startFrame: 204, endFrame: 220 } },
  { id: "cite", edgeId: "llm-to-answer", range: { startFrame: 220, endFrame: 239 } },
];
const theme = {
  surface: "transparent", node: "#152d40", ink: "#eef8fe",
  mutedInk: "#a8c0d2", edge: "#5d8299", accent: "#79e6d9",
  packet: "#91aaff", reversePacket: "#ffd099",
  fontFamily: "'Geist Variable', Inter, sans-serif",
  fontSize: 19, radius: 15, strokeWidth: 2.1,
};
export function RagPipelineDiagram({ frame }: { frame: number }) {
  const safe = Math.max(0, Math.min(239, Math.trunc(frame)));
  return <DiagramStage graph={graph} timeline={timeline} frame={safe}
    width={1430} height={400} theme={theme} ports={ports} packets={packets}
    focusedNodeIds={safe < 127 ? ["pdf", "extract", "chunks", "embed-doc", "index"] :
      safe < 185 ? ["index", "topk", "passages"] :
        ["passages", "prompt", "llm", "answer"]}
    ariaLabel="Full RAG pipeline: prepare a PDF by parsing text or using OCR, split chunks, create embeddings and store vectors. At question time embed the query, retrieve similar chunk IDs, load original source text into the prompt, generate an answer and cite the source."
    overlay={<>
      <text x="30" y="45" fill="#a6adff" fontSize="22" fontWeight="650"
        fontFamily="'Geist Variable',sans-serif">BEFORE SEARCH · PREPARE KNOWLEDGE</text>
      <text x="30" y="252" fill="#ffcf8f" fontSize="22" fontWeight="650"
        fontFamily="'Geist Variable',sans-serif">AT QUERY TIME · RETRIEVE AND GENERATE</text>

    </>}
    style={{ width: "100%", height: "100%", maxWidth: "100%",
      maxHeight: "100%", background: "transparent" }} />;
}
