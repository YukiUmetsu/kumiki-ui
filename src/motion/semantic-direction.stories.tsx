import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import type { SemanticDirectionScene } from "../../registry/motion/semantic-direction";
import { semanticSampleFrames } from "../../registry/motion/semantic-direction";
import { SemanticTransferSvg } from "../../registry/motion/semantic-transfer-svg";
import { layoutSemanticLabels } from "../../registry/visual/semantic-labels";
import { validateExplainerComposition } from "../../registry/visual/explainer-preflight";

const input={x:75,y:214,width:230,height:120};
const output={x:585,y:214,width:230,height:120};
const scene:SemanticDirectionScene={
  id:"request-to-result",width:900,height:500,durationFrames:120,
  elements:[
    {id:"request",semanticId:"request-001",role:"subject",bounds:input},
    {id:"processor",semanticId:"processor",role:"subject",bounds:output},
  ],
  beats:[{id:"flow",range:{startFrame:0,endFrame:120},
    claim:"A request becomes a processed result",
    visualChange:"Move the named payload into the processor",
    focusId:"request"}],
  transfers:[{id:"request-transfer",semanticId:"request-001",intent:"transport",
    fromId:"request",toId:"processor",
    range:{startFrame:30,endFrame:92},fadeFrames:10}],
  camera:[{id:"stable",kind:"hold",targetId:"request",
    reason:"Both actors are visible without panning",
    range:{startFrame:0,endFrame:120}}],
};
const labelLayout=layoutSemanticLabels({
  viewport:{width:scene.width,height:scene.height},
  subjects:[{id:"request",bounds:input},{id:"processor",bounds:output}],
  labels:[
    {id:"input-label",targetId:"request",width:130,height:25,preferred:["above"]},
    {id:"output-label",targetId:"processor",width:154,height:25,preferred:["above"]},
  ],
});
const previewScene:SemanticDirectionScene={
  ...scene,
  elements:[
    ...scene.elements,
    ...labelLayout.placed.map(label=>({
      id:label.id,semanticId:"label-"+label.id,role:"label" as const,
      bounds:label.bounds,text:label.id==="input-label"?"SOURCE":"DESTINATION",
    })),
  ],
};
const preview=validateExplainerComposition(previewScene,{
  samples:semanticSampleFrames(previewScene).map(frame=>({frame})),
});
if(!labelLayout.ok||!preview.ok)
  throw new Error("Invalid semantic direction preview: "+JSON.stringify(preview.diagnostics));
function SemanticDirectionPreview() {
  const [frame,setFrame]=useState(61);
  const where=labelLayout.placed;
  return <main style={{
    background:"linear-gradient(145deg,#071B28,#102F3F)",
    color:"#E8F7FF",minHeight:"100vh",
    padding:"min(5vw,64px)",
    fontFamily:"'Geist Variable',Inter,system-ui,sans-serif",
  }}>
    <header style={{maxWidth:900,margin:"0 auto 25px"}}>
      <div style={{fontSize:13,letterSpacing:3,color:"#83D9C9",fontWeight:700}}>
        MOTION / INTENT FIRST
      </div>
      <h1 style={{fontSize:37,fontWeight:680,margin:"15px 0 8px"}}>
        Only animate what has meaning.
      </h1>
      <p style={{color:"#AEC5D2",fontSize:17,margin:0}}>
        A named request is transferred. The connector exists only while the request moves.
      </p>
    </header>
    <div style={{maxWidth:900,margin:"auto",borderRadius:24,border:"1px solid #3C6374",
      background:"#0A2230",overflow:"hidden"}}>
      <svg viewBox="0 0 900 500" role="img"
        aria-label="Semantic request transfer, with visible path only between frame 30 and 92"
        width="100%" style={{display:"block"}}>
        <defs><linearGradient id="semantic-demo-line">
          <stop stopColor="#73DCC4"/><stop offset="1" stopColor="#A29CFF"/>
        </linearGradient></defs>
        {[{id:"request",box:input,fill:"#163E46",stroke:"#76E5CF"},
          {id:"processor",box:output,fill:"#28354B",stroke:"#9F9DFF"}].map(o=>
          <g key={o.id}>
            <rect {...o.box} rx={21} fill={o.fill} stroke={o.stroke} strokeWidth={2}/>
            <text x={o.box.x+26} y={o.box.y+72} fill="#F0FBFF"
              fontSize={30} fontWeight={650}>
              {o.id==="request"?"Request":"Processor"}
            </text>
          </g>)}
        {where.map(item=><text key={item.id}
          x={item.bounds.x+item.bounds.width/2}
          y={item.bounds.y+item.bounds.height-4}
          textAnchor="middle" fontSize={17} fill="#A7C7D8">
          {item.id==="input-label"?"SOURCE":"DESTINATION"}
        </text>)}
        <SemanticTransferSvg frame={frame} transfer={scene.transfers![0]}
          fromBounds={input} toBounds={output} color="#7DE6D1" strokeWidth={4}>
          <rect x={-44} y={-18} width={88} height={36} rx={10}
            fill="#164A4B" stroke="#73E5CE" strokeWidth={2}/>
          <text textAnchor="middle" y={7} fill="#DFFFF9"
            fontSize={17} fontWeight={700}>ID 001</text>
        </SemanticTransferSvg>
        <text x={450} y={431} textAnchor="middle" fill="#B5D3E0" fontSize={19}>
          {frame<30?"Waiting for the transfer":frame<92?"Transferring the named payload":"Transfer completed"}
        </text>
      </svg>
      <div style={{padding:"18px 28px 25px",borderTop:"1px solid #365262"}}>
        <label htmlFor="semantic-direction-frame" style={{display:"block",
          marginBottom:12,fontSize:15,color:"#C4DEE8"}}>
          Absolute frame: <strong style={{color:"#78E4D1"}}>{frame} / 119</strong>
        </label>
        <input id="semantic-direction-frame" type="range" min={0} max={119}
          value={frame} onChange={event=>setFrame(Number(event.target.value))}
          style={{width:"100%",accentColor:"#6BDAC7"}}/>
        <div style={{display:"flex",justifyContent:"space-between",
          marginTop:12,color:"#94B6C6",fontSize:13}}>
          <span>0 – no idle connection</span>
          <span>30–91 – causal motion</span>
          <span>92+ – clean finish</span>
        </div>
      </div>
    </div>
    <p style={{maxWidth:900,margin:"18px auto",color:"#A3C2D0",
      fontSize:14}}>
      Preflight: {preview.ok?"PASS":"CHECK"} · {preview.inspectedFrames} sparse frame samples ·
      {" "}{preview.diagnostics.length} diagnostics · no screenshots or model calls
    </p>
  </main>;
}
const meta={title:"Motion/Semantic Direction",
  component:SemanticDirectionPreview,
  parameters:{layout:"fullscreen"}} satisfies Meta<typeof SemanticDirectionPreview>;
export default meta;
type Story=StoryObj<typeof meta>;
export const CausalTransfer:Story={};
