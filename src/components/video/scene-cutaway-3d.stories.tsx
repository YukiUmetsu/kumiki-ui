/** GPU-optional true 3D assembly QA. The normal 24-scene capture pipeline
 * retains the deterministic, hardware-independent 2.5D fallback.
 */
import { useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { VideoExportStage } from "../../../registry/video/video-export-stage";
import type { VideoExportManifest } from "../../../registry/video/video-export-stage";
import { CutawayHero3D } from "./scene-cutaway-3d";
import { DEMO_SCENES } from "./scene-template-fixtures";

const spec=DEMO_SCENES["layered-cutaway"];
const manifest:VideoExportManifest={
  schemaVersion:1,id:"original-3d-layered-cutaway",width:960,height:540,
  durationFrames:spec.durationFrames,fps:spec.fps,
  // All geometry/materials are originally generated in this source file;
  // no external media asset or third-party product texture is requested.
  assets:[],
};
function Preview(){
  const [frame,setFrame]=useState(55);
  const [reduced,setReduced]=useState(false);
  const frames=useMemo(()=>[0,20,35,55,75,92,119],[]);
  return <main style={{minHeight:"100vh",background:"#091a2c",
    color:"#ecf5f5",fontFamily:"system-ui,sans-serif",padding:28}}>
    <div style={{maxWidth:1040,margin:"0 auto"}}>
      <div style={{fontSize:13,letterSpacing:2.4,opacity:.65}}>TRUE 3D · HERO ASSET VIEWER</div>
      <h1 style={{fontSize:28,margin:"7px 0 4px"}}>Material cutaway · exploded assembly</h1>
      <p style={{opacity:.75,maxWidth:710,fontSize:14}}>
        Independently articulated solid meshes, metal fasteners, physical materials,
        shadow-casting geometry and deterministic camera orbit. GPU required.
        No stock media or rastered 3D illusion.
      </p>
      <CutawayHero3D spec={spec} frame={frame} reducedMotion={reduced}/>
      <div style={{display:"flex",gap:12,alignItems:"center",marginTop:20,flexWrap:"wrap"}}>
        <label htmlFor="cutaway-seek">Seek frame {frame}</label>
        <input id="cutaway-seek" type="range" min={0} max={119} value={frame}
          onChange={e=>setFrame(Number(e.target.value))} style={{flex:"1 1 330px"}}/>
        <label><input type="checkbox" checked={reduced} onChange={e=>setReduced(e.target.checked)}/>
          Reduced motion</label>
      </div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:12}}>
        {frames.map(f=><button key={f} type="button" onClick={()=>setFrame(f)}
          style={{padding:"7px 12px",borderRadius:8,color:"#e4f8f6",
            border:"1px solid #397486",background:"#13344b"}}>{f}</button>)}
      </div>
      <p style={{fontSize:13,opacity:.55}}>Uses Kumiki’s existing Three.js HeroAssetViewer. The authored pieces are
        illustrative mechanical layers; real product-specific cross-sections require a source mesh.</p>
    </div>
  </main>;
}
function Capture(){
  const [frame,setFrame]=useState(0);
  return <VideoExportStage manifest={manifest} frame={frame} onSeek={setFrame}>
    <CutawayHero3D spec={spec} frame={frame}/>
  </VideoExportStage>;
}
const meta={title:"Motion/Scene Cutaway 3D",component:CutawayHero3D,
  parameters:{layout:"fullscreen"}} satisfies Meta<typeof CutawayHero3D>;
export default meta;
type Story=StoryObj<typeof meta>;
export const Preview3D:Story={
  args:{spec,frame:55},
  render:()=> <Preview/>,
};
export const Capture3D:Story={
  args:{spec,frame:0},
  render:()=> <Capture/>,
};
