import type {Meta,StoryObj} from "@storybook/react-vite";
import {CrayonScene} from "../../registry/video/materials/crayon-scene-react";
import {crayonAdultFaceStudy} from "./crayon-artcraft-adult-face-fixtures";
import {useCrayonStoryPlayback} from "./crayon-story-playback";

/** ArtCraft unapproved evidence bench; not a public character showcase. */
interface StudyProps {
  aspect:"landscape"|"portrait";
  detail:number;expression:"warm"|"neutral";headScaleY:number;
  startFrame:number;playbackRate:number;loop:boolean;
}
export function AdultFaceArtcraftWorkbench({aspect,detail,expression,headScaleY,startFrame,playbackRate,loop}:StudyProps){
  const spec=crayonAdultFaceStudy(aspect,{detail,expression,headScaleY});
  const {frame,playing,seek,restart,toggle}=useCrayonStoryPlayback(
    startFrame,spec.durationFrames,"adult-face-artcraft:"+aspect+":"+expression+":"+headScaleY,playbackRate,loop);
  return <div style={{maxWidth:1040,margin:"auto",padding:16,color:"#34333d",
    background:"#efe7db",fontFamily:"system-ui",boxSizing:"border-box"}}>
    <div style={{fontSize:18,fontWeight:700}}>ArtCraft — adult facial anatomy (unapproved)</div>
    <p style={{maxWidth:640,lineHeight:1.6,margin:"7px 0 13px",fontSize:13}}>
      Original source geometry: independent lids, tear ducts, orbital shadows,
      nasal sidewall, alar cartilage, jaw planes and rooted hair. This is a
      construction review, not a finished character. Text remains outside SVG.
    </p>
    <div style={{width:aspect==="portrait"?"min(100%,420px)":"100%",
      aspectRatio:aspect==="portrait"?"540/960":"960/540",
      margin:"0 auto",border:"9px solid #fff7e8",boxSizing:"border-box"}}>
      <CrayonScene spec={spec} frame={frame}/>
    </div>
    <div style={{display:"flex",alignItems:"center",flexWrap:"wrap",
      gap:12,marginTop:16}}>
      <button type="button" onClick={toggle}>{playing?"Pause":"Play film"}</button>
      <button type="button" onClick={restart}>Restart</button>
      <label>Frame <input type="range" min={0} max={299} value={frame}
        onChange={e=>seek(Number(e.target.value))}/></label>
      <output style={{fontVariantNumeric:"tabular-nums"}}>{frame}</output>
      <button type="button" onClick={()=>seek(299)}>Inspect final</button>
    </div>
  </div>;
}
const meta={
  title:"Video production/Film Looks/Crayon/Characters/ArtCraft Adult Face Lab",
  id:"video-crayon-artcraft-adult-face",
  tags:["!dev"],
  component:AdultFaceArtcraftWorkbench,
  args:{aspect:"landscape",detail:1,expression:"warm",headScaleY:.82,startFrame:299,playbackRate:1,loop:false},
  argTypes:{aspect:{control:"inline-radio",options:["landscape","portrait"]},
    detail:{control:{type:"range",min:0,max:1,step:.05}},
    expression:{control:"inline-radio",options:["warm","neutral"]},
    headScaleY:{control:{type:"range",min:.72,max:1,step:.01},
      description:"ArtCraft skull proportion: 1 reproduces the rejected elongated head"},
    startFrame:{control:{type:"range",min:0,max:299,step:1}},
    playbackRate:{control:{type:"range",min:.25,max:2,step:.25}},
    loop:{control:"boolean"}},
} satisfies Meta<typeof AdultFaceArtcraftWorkbench>;
export default meta;
type Story=StoryObj<typeof meta>;
export const AdultFaceThreeQuarter:Story={};
export const AdultFacePortrait:Story={args:{aspect:"portrait"}};
export const AdultFaceConstruction:Story={args:{startFrame:160}};
