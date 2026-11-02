/** Physical paper mesh preview and exact-frame capture.
 * Requires a browser WebGL context and the standard Kumiki export pipeline.
 */
import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { VideoExportStage } from "../../../registry/video/video-export-stage";
import type { VideoExportManifest } from "../../../registry/video/video-export-stage";
import { PhysicalBookHero3D, createBookHero3D } from "./scene-book-3d";
import { HeroAssetViewer } from "../../../registry/craft/hero-viewer";
import { DEMO_SCENES } from "./scene-template-fixtures";
import { sceneTemplateAssets } from "../../../registry/video/scene-templates";
import { toEverydayBookSpec } from "../../../registry/video/everyday-scenes-3d";

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
const meta={tags:["!dev","!autodocs","!test"],title:"Motion/Scene Book 3D",component:PhysicalBookHero3D,
  parameters:{layout:"fullscreen"}} satisfies Meta<typeof PhysicalBookHero3D>;
export default meta;
type Story=StoryObj<typeof meta>;
export const Preview3D:Story={args:{spec,frame:60},render:()=> <Preview/>};
export const Capture3D:Story={args:{spec,frame:0},render:()=> <Capture/>};
/** Alternate real geometry views: the cinematic desk shot looks down into
 * the book and cannot establish the shape of its shoulders, spine or headcap. */
const inspectionSpec={...spec,durationFrames:300,content:{...spec.content,
  documentTitle:"The Atlas of Forgotten Places",
  direction:"left" as const,
  pages:spec.content.pages?.map((page,index)=>({...page,
    heading:["The Question","The Journey","The Discovery"][index]??page.heading,
    text:["Beyond the familiar horizon, a thousand paths await discovery.",
      "Follow the cartographer through forgotten mountain valleys.",
      "Every journey leaves its mark on the atlas."][index]??page.text,
  })),
}};
const inspectionAsset=()=>createBookHero3D(inspectionSpec);
export const BindingInspection:Story={args:{spec:inspectionSpec,frame:164},render:()=>
  <HeroAssetViewer createAsset={inspectionAsset} width={960} height={540}
    action="turn-pages" actionFrame={164} fps={30}
    camera={{position:[-1.8,.3,-3.2],target:[0,0,-.15],fov:42}}
    ariaLabel="Isolated rounded-back leather, raised sewing bands and boards"/>};
export const FolioInspection:Story={args:{spec:inspectionSpec,frame:164},render:()=>
  <HeroAssetViewer createAsset={inspectionAsset} width={960} height={540}
    action="turn-pages" actionFrame={164} fps={30}
    camera={{position:[0,-.1,3.8],target:[0,0,0],fov:43}}
    ariaLabel="Isolated curved folios with a sewn-paper gutter and variable paper stacks"/>};
export const FolioRakingInspection:Story={args:{spec:inspectionSpec,frame:164},render:()=>
  <HeroAssetViewer createAsset={inspectionAsset} width={960} height={540}
    action="turn-pages" actionFrame={164} fps={30}
    camera={{position:[1.35,-2.5,1.55],target:[.1,0,-.02],fov:38}}
    ariaLabel="Low-angle inspection of individual paper strata, shoulders and cut fore edges"/>};
export const TurningLeafInspection:Story={args:{spec:inspectionSpec,frame:150},render:()=>
  <HeroAssetViewer createAsset={inspectionAsset} width={960} height={540}
    action="turn-pages" actionFrame={150} fps={30}
    camera={{position:[1.6,-2.2,2.8],target:[.15,0,.15],fov:42}}
    ariaLabel="Three-quarter inspection of turning leaf and its supporting signatures"/>};

/** Macro reviews use the same decoded CC0 material scans as the exported
 * film, not the procedural fallback of the isolated construction stories. */
const filmInspectionSpec=toEverydayBookSpec({
  schemaVersion:1,id:"epic-book-material-inspection",recipeId:"epic-book-storytelling",
  width:960,height:540,durationFrames:300,fps:{num:30,den:1},
  content:{title:"The Atlas of Forgotten Places",pages:[
    {heading:"The Question",text:"Beyond the familiar horizon, a thousand paths are waiting to be found."},
    {heading:"The Journey",text:"Follow the old cartographer's trail through valleys, mountains, and forgotten cities."},
    {heading:"The Discovery",text:"Every journey leaves its mark. Every page remembers where we have been."},
  ]},
});
export const PhotographicCoverCloseup:Story={args:{spec:filmInspectionSpec,frame:0},render:()=>
  <PhysicalBookHero3D spec={filmInspectionSpec} frame={0}
    cameraOverride={{position:[1.6,7.3,7.7],target:[.7,.45,3.1],fov:33}}/>};
export const PhotographicBindingRakingCloseup:Story={args:{spec:filmInspectionSpec,frame:0},render:()=>
  <PhysicalBookHero3D spec={filmInspectionSpec} frame={0}
    cameraOverride={{position:[-1.8,4.3,6.8],target:[.35,.47,3.1],fov:36}}/>};
export const PhotographicSpreadCloseup:Story={args:{spec:filmInspectionSpec,frame:164},render:()=>
  <PhysicalBookHero3D spec={filmInspectionSpec} frame={164}
    cameraOverride={{position:[-1.3,7.7,7.5],target:[-1.45,.4,3.1],fov:34}}/>};
export const PhotographicForeEdgeCloseup:Story={args:{spec:filmInspectionSpec,frame:164},render:()=>
  <PhysicalBookHero3D spec={filmInspectionSpec} frame={164}
    cameraOverride={{position:[4.2,3.3,6.5],target:[1.5,.75,3.0],fov:34}}/>};
