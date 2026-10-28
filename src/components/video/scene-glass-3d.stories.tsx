/** GPU-optional physically based glass preview and MP4 handshake.
 * Uses original modeled assets and the existing Kumiki studio pipeline.
 */
import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { VideoExportStage } from "../../../registry/video/video-export-stage";
import type { VideoExportManifest } from "../../../registry/video/video-export-stage";
import { PhysicalGlassHero3D } from "./scene-glass-3d";
import { DEMO_SCENES } from "./scene-template-fixtures";
const spec=DEMO_SCENES["glass-data-reveal"];
const manifest:VideoExportManifest={
  schemaVersion:1,id:"original-3d-physical-glass",width:960,height:540,
  fps:spec.fps,durationFrames:spec.durationFrames,assets:[],
};
function Preview(){
  const [frame,setFrame]=useState(55);
  const [reduced,setReduced]=useState(false);
  return <main style={{minHeight:"100vh",background:"#091a2c",color:"#f0f9f6",
    fontFamily:"system-ui,sans-serif",padding:28}}>
    <div style={{maxWidth:1030,margin:"0 auto"}}>
      <div style={{fontSize:13,letterSpacing:2.4,opacity:.65}}>GLASS · THREE.JS STUDIO</div>
      <h1 style={{fontSize:28,margin:"8px 0"}}>True optical transmission</h1>
      <p style={{maxWidth:730,fontSize:14,opacity:.73}}>
        This optional renderer uses solid dielectric meshes with an index of refraction,
        world lighting, reflections and multiple independently moving panes. The standard
        glass recipe remains a GPU-independent blurred-panel fallback.
      </p>
      <PhysicalGlassHero3D spec={spec} frame={frame} reducedMotion={reduced}/>
      <div style={{display:"flex",alignItems:"center",gap:14,marginTop:20,flexWrap:"wrap"}}>
        <label htmlFor="glass-3d-seek">Frame {frame}</label>
        <input id="glass-3d-seek" type="range" min={0} max={119}
          value={frame} onChange={event=>setFrame(Number(event.target.value))}
          style={{flex:"1 1 290px"}}/>
        <label><input type="checkbox" checked={reduced}
          onChange={event=>setReduced(event.target.checked)}/> Reduced motion</label>
      </div>
      <div style={{display:"flex",gap:8,marginTop:12,flexWrap:"wrap"}}>
        {[0,25,45,65,90,119].map(frame=><button type="button" key={frame}
          onClick={()=>setFrame(frame)}
          style={{borderRadius:8,padding:"7px 12px",border:"1px solid #397486",
            background:"#15364c",color:"#e6f5ef"}}>{frame}</button>)}
      </div>
    </div>
  </main>;
}
function Capture(){
  const [frame,setFrame]=useState(0);
  return <VideoExportStage manifest={manifest} frame={frame} onSeek={setFrame}>
    <PhysicalGlassHero3D spec={spec} frame={frame}/>
  </VideoExportStage>;
}
const meta={title:"Motion/Scene Glass 3D",component:PhysicalGlassHero3D,
  parameters:{layout:"fullscreen"}} satisfies Meta<typeof PhysicalGlassHero3D>;
export default meta;
type Story=StoryObj<typeof meta>;
export const Preview3D:Story={args:{spec,frame:55},render:()=> <Preview/>};
export const Capture3D:Story={args:{spec,frame:0},render:()=> <Capture/>};
