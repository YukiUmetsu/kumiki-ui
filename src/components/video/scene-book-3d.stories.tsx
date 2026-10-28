/** Physical paper mesh preview and exact-frame capture.
 * Requires a browser WebGL context and the standard Kumiki export pipeline.
 */
import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { VideoExportStage } from "../../../registry/video/video-export-stage";
import type { VideoExportManifest } from "../../../registry/video/video-export-stage";
import { PhysicalBookHero3D } from "./scene-book-3d";
import { DEMO_SCENES } from "./scene-template-fixtures";
import { sceneTemplateAssets } from "../../../registry/video/scene-templates";

const spec=DEMO_SCENES["page-turn-story"];
const manifest:VideoExportManifest={
  schemaVersion:1,id:"original-3d-page-turn",width:960,height:540,
  fps:spec.fps,durationFrames:spec.durationFrames,
  assets:sceneTemplateAssets(spec).map(asset=>({id:asset.id,kind:"image" as const,
    url:asset.src,licenseRef:asset.licenseRef})),
};
function Preview(){
  const [frame,setFrame]=useState(60);
  const [reduced,setReduced]=useState(false);
  return <main style={{minHeight:"100vh",background:"#0c2131",color:"#f4f2e8",
    fontFamily:"system-ui,sans-serif",padding:28}}>
    <div style={{maxWidth:1050,margin:"0 auto"}}>
      <div style={{fontSize:12,letterSpacing:3,opacity:.73}}>CINEMATIC BOOK · GEOMETRY</div>
      <h1 style={{fontSize:30,margin:"8px 0"}}>Physical storybook page turn</h1>
      <p style={{fontSize:14,opacity:.78,maxWidth:800}}>
        Actual deforming page mesh, independent front/back textures and a moving
        camera. Text is taken from the scene recipe; artwork is original procedural
        geometry for this standalone demonstration.
      </p>
      <PhysicalBookHero3D spec={spec} frame={frame} reducedMotion={reduced}/>
      <div style={{display:"flex",gap:12,alignItems:"center",marginTop:22,flexWrap:"wrap"}}>
        <label htmlFor="book-seek">Frame {frame}</label>
        <input id="book-seek" type="range" min={0} max={spec.durationFrames-1}
          value={frame} onChange={e=>setFrame(Number(e.target.value))}
          style={{flex:"1 1 340px"}}/>
        <label><input type="checkbox" checked={reduced}
          onChange={e=>setReduced(e.target.checked)}/> Reduced motion</label>
      </div>
      <div style={{display:"flex",gap:8,marginTop:12,flexWrap:"wrap"}}>
        {[0,35,45,54,72,86,95,119].map(f=><button key={f} type="button"
          onClick={()=>setFrame(f)} style={{padding:"8px 13px",borderRadius:8,
            border:"1px solid #5d756c",background:"#203a4b",color:"#f4f3e5"}}>{f}</button>)}
      </div>
    </div>
  </main>;
}
function Capture(){
  const [frame,setFrame]=useState(0);
  return <VideoExportStage manifest={manifest} frame={frame} onSeek={setFrame}>
    <PhysicalBookHero3D spec={spec} frame={frame}/>
  </VideoExportStage>;
}
const meta={title:"Motion/Scene Book 3D",component:PhysicalBookHero3D,
  parameters:{layout:"fullscreen"}} satisfies Meta<typeof PhysicalBookHero3D>;
export default meta;
type Story=StoryObj<typeof meta>;
export const Preview3D:Story={args:{spec,frame:60},render:()=> <Preview/>};
export const Capture3D:Story={args:{spec,frame:0},render:()=> <Capture/>};
