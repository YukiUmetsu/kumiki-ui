/** Two-lane RAG recap. This is a SUMMARY, not another full schematic:
 * details were taught in the preceding scenes. Nine nodes, generous spacing,
 * and genuinely attached Kumiki DiagramStage packets.
 */
import { DiagramStage } from "../../registry/motion/diagram-stage-react";
import { createDiagramTimeline } from "../../registry/motion/diagram-stage";
import type { DiagramEdgePorts, DiagramPacket } from "../../registry/motion/diagram-stage";
import type { DiagramSpec } from "../../registry/infographic/types";
import { RAG_FPS } from "./rag-production";

const stages = [
  ["pdf", "PDF", "Original knowledge"],
  ["extract", "Extract + chunk", "Parse text or OCR, retain sources"],
  ["embed", "Embed text", "Numerical vectors"],
  ["index", "Vector index", "Source-linked vectors"],
  ["question", "Ask + embed", "Compatible query vector"],
  ["search", "Vector search", "Similarity-ranked IDs"],
  ["context", "Source text", "Original passages"],
  ["llm", "Prompt + LLM", "Augment with retrieved context"],
  ["answer", "Cited answer", "Grounded generation"],
] as const;
const graph: DiagramSpec = {
  direction: "horizontal",
  nodes: stages.map(([id,label,description]) => ({ id,label,description })),
  edges: [
    {id:"pdf-extract",from:"pdf",to:"extract"},
    {id:"extract-embed",from:"extract",to:"embed"},
    {id:"embed-index",from:"embed",to:"index"},
    {id:"question-search",from:"question",to:"search"},
    {id:"index-search",from:"index",to:"search"},
    {id:"search-context",from:"search",to:"context"},
    {id:"context-llm",from:"context",to:"llm"},
    {id:"llm-answer",from:"llm",to:"answer"},
  ],
};
const top = ["pdf","extract","embed","index"];
const bottom = ["question","search","context","llm","answer"];
const bounds = Object.fromEntries(stages.map(([id]) => {
  const upper=top.includes(id);
  const n=upper?top.indexOf(id):bottom.indexOf(id);
  return [id,{ x:upper?47+n*352:47+n*272, y:upper?85:280,
    width:upper?244:224, height:79 }];
}));
const timeline=createDiagramTimeline({
  id:"rag-editorial-recap",graph,fps:RAG_FPS,durationFrames:240,
  layouts:[{frame:0,bounds},{frame:239,bounds}],
});
const ports: Record<string,DiagramEdgePorts> = {
  "index-search": { from:{side:"bottom",offset:.5},
    to:{side:"top",offset:.5},curvature:.34 },
};
const packets:DiagramPacket[]=[
  {id:"parse",edgeId:"pdf-extract",range:{startFrame:10,endFrame:47}},
  {id:"embed",edgeId:"extract-embed",range:{startFrame:48,endFrame:78}},
  {id:"index",edgeId:"embed-index",range:{startFrame:81,endFrame:111}},
  {id:"query",edgeId:"question-search",range:{startFrame:64,endFrame:105}},
  {id:"retrieve",edgeId:"index-search",range:{startFrame:109,endFrame:145}},
  {id:"source",edgeId:"search-context",range:{startFrame:148,endFrame:178}},
  {id:"augment",edgeId:"context-llm",range:{startFrame:181,endFrame:210}},
  {id:"answer",edgeId:"llm-answer",range:{startFrame:211,endFrame:239}},
];
const theme={
  surface:"transparent",node:"#153346",ink:"#eef7fd",mutedInk:"#afc9d7",
  edge:"#587f94",accent:"#7ce9da",packet:"#a4a4ff",
  fontFamily:"'Geist Variable', Inter, sans-serif",
  fontSize:22,radius:17,strokeWidth:2.2,
};
export function RagPipelineDiagram({frame}:{frame:number}) {
  const safe=Math.max(0,Math.min(239,Math.trunc(frame)));
  return <DiagramStage graph={graph} timeline={timeline} frame={safe}
    width={1430} height={400} theme={theme} ports={ports} packets={packets}
    focusedNodeIds={safe<111?top:safe<180?["search","context","index"]:["context","llm","answer"]}
    ariaLabel="Two stages of RAG. First prepare a PDF by extracting text, creating chunks, embeddings and the vector index. Later embed the question, search similar vectors, retrieve original text, augment an LLM prompt and generate a cited answer."
    overlay={<>
      <text x="47" y="56" fill="#ada9ff" fontSize="22" fontWeight="690"
        fontFamily="'Geist Variable',sans-serif">PREPARE ONCE</text>
      <text x="47" y="255" fill="#ffce92" fontSize="22" fontWeight="690"
        fontFamily="'Geist Variable',sans-serif">FOR EVERY QUESTION</text>
    </>}
    style={{width:"100%",height:"100%",background:"transparent"}} />;
}
