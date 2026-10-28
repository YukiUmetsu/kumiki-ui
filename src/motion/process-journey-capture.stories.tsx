import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { createProcessJourney, evaluateProcessJourney } from "../../registry/motion/process-journey";
import { VideoExportStage } from "../../registry/video/video-export-stage";
import type { VideoExportManifest } from "../../registry/video/video-export-stage";

const plan=createProcessJourney({
  id:"process-journey-export-demo",subjectId:"persistent-object",
  fps:{num:30,den:1},durationFrames:120,
  graph:{
    direction:"horizontal",
    nodes:[{id:"a",label:"Origin"},{id:"b",label:"Relay"},{id:"c",label:"Destination"}],
    edges:[{id:"a-b",from:"a",to:"b"},{id:"b-c",from:"b",to:"c"}],
  },
  layouts:[{frame:0,bounds:{
    a:{x:80,y:230,width:180,height:90},
    b:{x:385,y:230,width:180,height:90},
    c:{x:690,y:230,width:180,height:90},
  }}],
  route:[{edgeId:"a-b",startFrame:12,endFrame:52},
         {edgeId:"b-c",startFrame:70,endFrame:108}],
});
const manifest:VideoExportManifest={
  schemaVersion:1,id:"process-journey-export",
  durationFrames:120,width:960,height:540,fps:{num:30,den:1},
};
function ProcessJourneyCapture(){
  const [frame,setFrame]=useState(0);
  const state=evaluateProcessJourney(plan,frame);
  return <VideoExportStage manifest={manifest} frame={frame} onSeek={setFrame}>
    <div style={{width:960,height:540,background:"#10243a",color:"#e6f4ef",
      fontFamily:"system-ui",position:"relative"}}>
      <svg viewBox="0 0 960 540" role="img" aria-label="One subject follows a three-stage process"
        width="960" height="540">
        <defs><linearGradient id="route" x2="1" y2="0">
          <stop stopColor="#74a4ba"/><stop offset="1" stopColor="#87daca"/>
        </linearGradient></defs>
        <text x="62" y="92" fontSize="37" fill="currentColor" fontWeight="700">
          A connected journey
        </text>
        <path d="M170 275 H780" fill="none" stroke="url(#route)" strokeWidth="8"
          strokeLinecap="round" strokeDasharray="12 16"/>
        {[
          {id:"a",x:170,label:"Origin"},{id:"b",x:475,label:"Relay"},
          {id:"c",x:780,label:"Destination"},
        ].map(node=><g key={node.id} opacity={state.focusedNodeIds.includes(node.id)?1:.7}>
          <rect x={node.x-90} y="220" width="180" height="110" rx="18"
            fill="#173c55" stroke="#8bcbbf" strokeWidth="3"/>
          <text x={node.x} y="287" textAnchor="middle" fill="white"
            fontSize="21">{node.label}</text>
        </g>)}
        <circle data-km-process-subject={state.subjectId} cx={state.position.x}
          cy={state.position.y} r="17" fill="#eec778" stroke="#122d47" strokeWidth="5"/>
      </svg>
    </div>
  </VideoExportStage>;
}
const meta={title:"Motion/Process Journey Capture",component:ProcessJourneyCapture,
  parameters:{layout:"fullscreen"}} satisfies Meta<typeof ProcessJourneyCapture>;
export default meta;
type Story=StoryObj<typeof meta>;
export const Default:Story={render:()=> <ProcessJourneyCapture/>};
