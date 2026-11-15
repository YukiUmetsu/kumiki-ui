import {useMemo} from "react";
import type {Meta,StoryObj} from "@storybook/react-vite";
import {CrayonScene} from "../../registry/video/materials/crayon-scene-react";
import type {CrayonSceneSpec} from "../../registry/video/materials/crayon-scene";
import {inspectCrayonDrawingPlan} from "../../registry/video/materials/crayon-art-direction";
import {crayonBotanicalDrawing} from "./crayon-drawing-system-fixtures";
import type {CrayonDrawingAspect} from "./crayon-drawing-system-fixtures";
import {useCrayonStoryPlayback} from "./crayon-story-playback";

export type CrayonDrawingInspection="full"|"surface"|"stalk-leaf"|"contact";
const inspectionCamera={
  landscape:{
    surface:{focusX:480,focusY:294,zoom:2.25},
    "stalk-leaf":{focusX:532,focusY:125,zoom:2.15},
    contact:{focusX:480,focusY:469,zoom:2.4},
  },
  portrait:{
    surface:{focusX:270,focusY:422,zoom:2.25},
    "stalk-leaf":{focusX:320,focusY:205,zoom:2.15},
    contact:{focusX:270,focusY:651,zoom:2.4},
  },
} as const;
/** Inspection never mutates source marks, scene seed, drawing order, or timings. */
export function crayonDrawingInspectionSpec(
  spec:CrayonSceneSpec,inspection:CrayonDrawingInspection,
):CrayonSceneSpec{
  if(inspection==="full")return spec;
  const aspect=spec.height>spec.width?"portrait":"landscape";
  const view=inspectionCamera[aspect][inspection];
  if(!view)throw new RangeError("Invalid crayon inspection area");
  return {...spec,camera:[{frame:0,...view},{frame:spec.durationFrames-1,...view}]};
}

interface DrawingStudioProps {
  aspect:CrayonDrawingAspect;detail:number;pressure:number;paperTooth:number;
  startFrame:number;playbackRate:number;loop:boolean;
  inspection?:CrayonDrawingInspection;
}
const steps=[
  {name:"1. Structural masses",range:"1–54",at:26},
  {name:"2. Light and value",range:"55–104",at:90},
  {name:"3. Local wax colour",range:"105–159",at:153},
  {name:"4. Directional finishing",range:"160–239",at:239},
] as const;

/**
 * A source-native, single-subject drawing workbench, not a quality-approved
 * illustration. Text and interactive controls stay outside the film SVG.
 */
export function CrayonDrawingStudio({aspect,detail,pressure,paperTooth,
  startFrame,playbackRate,loop,inspection="full"}:DrawingStudioProps){
  const {scene,plan}=useMemo(()=>crayonBotanicalDrawing({
    aspect,detail,pressure,paperTooth,
  }),[aspect,detail,pressure,paperTooth]);
  const errors=useMemo(()=>inspectCrayonDrawingPlan(scene,plan),[scene,plan]);
  const framed=useMemo(()=>crayonDrawingInspectionSpec(scene,inspection),[scene,inspection]);
  const {frame,playing,seek,restart,toggle}=useCrayonStoryPlayback(
    startFrame,scene.durationFrames,"crayon-art-system:"+aspect,
    playbackRate,loop);
  const stage=frame<=54?0:frame<=104?1:frame<=159?2:3;
  return <section data-km-crayon-drawing-studio="" data-km-crayon-inspection={inspection}
    style={{padding:"clamp(12px, 3vw, 24px)",maxWidth:1100,margin:"auto",
      background:"#eee5d7",color:"#303d40",fontFamily:"system-ui",
      boxSizing:"border-box"}}>
    <h2 style={{font:"700 clamp(20px, 3vw, 30px) Georgia, serif",
      margin:"0 0 8px"}}>Crayon Drawing Atelier — construction grammar</h2>
    <p style={{maxWidth:790,margin:"0 0 15px",lineHeight:1.6,fontSize:14}}>
      Original botanical study. Each solid shape has a declared role, physical
      attachments, a scheduled painting pass and clipped wax direction.
      The study demonstrates rules, not artist-approved illustration quality.
    </p>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(min(100%, 270px), 1fr))",
      gap:16,alignItems:"start"}}>
      <div style={{width:"100%",maxWidth:aspect==="portrait"?420:undefined,margin:"0 auto",
        aspectRatio:aspect==="portrait"?"540 / 960":"960 / 540",
        background:"#fff5e4",border:"8px solid #fff9ef",boxSizing:"border-box"}}>
        <CrayonScene spec={framed} frame={frame}
          aria-label="Original wax-crayon still life being drawn in four stages"
          style={{width:"100%",height:"100%",display:"block"}}/>
      </div>
      <aside aria-label="Drawing contract and construction phases"
        style={{minWidth:0,background:"#f7efe3",padding:15,borderRadius:5}}>
        <div style={{fontWeight:700,fontSize:15,marginBottom:11}}>
          Drawing plan <span data-km-crayon-drawing-status=""
            style={{fontWeight:500,color:errors.length?"#a33c35":"#427047"}}>
            {errors.length?"Requires correction":"Structure passes"}</span>
        </div>
        <ol style={{margin:"0 0 12px",paddingLeft:21}}>
          {steps.map((step,i)=><li key={step.name}
            style={{marginBottom:10,fontWeight:i===stage?700:400}}>
            <button type="button" onClick={()=>seek(step.at)}
              aria-label={"Inspect "+step.name} aria-current={i===stage?"step":undefined}
              style={{border:0,background:"transparent",padding:0,font:"inherit",
                color:"inherit",textAlign:"left",cursor:"pointer"}}>
              {step.name}</button>
            <div style={{fontSize:12,color:"#697076",fontWeight:400}}>Frames {step.range}</div>
          </li>)}
        </ol>
        <p style={{fontSize:13,lineHeight:1.6,margin:0}}>
          Opaque primary subject; measured attachment anchors; ordered colour
          passes; open glazes clipped to wax; directional finishing. No
          screen-space text inside the painted scene.
        </p>
        {errors.length>0&&<ul aria-label="Drawing errors" style={{fontSize:12,paddingLeft:20}}>
          {errors.map((message,i)=><li key={i}>{message}</li>)}
        </ul>}
      </aside>
    </div>
    <div style={{display:"flex",gap:10,marginTop:15,flexWrap:"wrap",alignItems:"center"}}>
      <button type="button" onClick={toggle}>{playing?"Pause":"Play drawing"}</button>
      <button type="button" onClick={restart}>Restart</button>
      <label style={{display:"flex",alignItems:"center",gap:8,flex:"1 1 180px"}}>
        Source frame
        <input type="range" min={0} max={scene.durationFrames-1} value={frame}
          onChange={e=>seek(Number(e.target.value))} style={{flex:1,minWidth:60}}/>
      </label>
      <output style={{fontVariantNumeric:"tabular-nums"}}>{frame} / 239</output>
    </div>
  </section>;
}
const meta={
  title:"Video production/Film Looks/Crayon/Materials/Drawing System",
  id:"video-crayon-drawing-system",
  component:CrayonDrawingStudio,
  // No newly constructed artwork is approved for public galleries without
  // native-resolution reference-matched artistic review.
  tags:["!dev"],
  args:{aspect:"landscape",detail:1,pressure:.88,paperTooth:.78,
    startFrame:239,playbackRate:1.25,loop:false,inspection:"full"},
  argTypes:{
    aspect:{control:"inline-radio",options:["landscape","portrait"]},
    inspection:{control:"select",options:["full","surface","stalk-leaf","contact"],
      description:"Camera-only 1:1 source inspection for pigment, anatomy and ground contact"},
    detail:{control:{type:"range",min:.2,max:1,step:.05}},
    pressure:{control:{type:"range",min:.2,max:1,step:.05}},
    paperTooth:{control:{type:"range",min:0,max:1,step:.05}},
    startFrame:{control:{type:"range",min:0,max:239,step:1}},
    playbackRate:{control:{type:"range",min:.25,max:2,step:.25}},
    loop:{control:"boolean"},
  },
} satisfies Meta<typeof CrayonDrawingStudio>;
export default meta;
type Story=StoryObj<typeof meta>;
export const FourPassWaxConstruction:Story={};
export const VerticalDrawingStudy:Story={args:{aspect:"portrait"}};
