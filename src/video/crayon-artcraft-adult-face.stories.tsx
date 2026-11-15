import {useMemo} from "react";
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
  // Source geometry is expensive and independent of the animation playhead.
  const spec=useMemo(()=>crayonAdultFaceStudy(aspect,{detail,expression,headScaleY}),
    [aspect,detail,expression,headScaleY]);
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
/** Matched two-up proof: same material, pose, frame and scale; expression alone changes. */
export function AdultFaceExpressionComparison({aspect,detail,headScaleY,startFrame,playbackRate,loop}:StudyProps){
  // Reuse identical source geometry while the shared playhead advances.
  // Two full handcrafted SVG studies are intentionally rendered in this bench.
  const warm=useMemo(()=>crayonAdultFaceStudy(aspect,{detail,headScaleY,expression:"warm"}),
    [aspect,detail,headScaleY]);
  const neutral=useMemo(()=>crayonAdultFaceStudy(aspect,{detail,headScaleY,expression:"neutral"}),
    [aspect,detail,headScaleY]);
  const {frame,playing,seek,restart,toggle}=useCrayonStoryPlayback(
    startFrame,warm.durationFrames,"adult-face-expression-compare:"+aspect+":"+headScaleY,
    playbackRate,loop);
  return <section data-km-crayon-artcraft-comparison=""
    style={{maxWidth:1120,margin:"auto",padding:16,background:"#efe7db",
      color:"#34333d",fontFamily:"system-ui",boxSizing:"border-box"}}>
    <h2 style={{fontSize:20,margin:"0 0 8px"}}>ArtCraft expression anatomy — review only</h2>
    <p style={{fontSize:13,lineHeight:1.6,maxWidth:800,margin:"0 0 16px"}}>
      Matched original three-quarter facial studies at exactly the same frame and scale.
      Compare eyelids, commissures, cheeks and nasolabial tension before approving the design.
      These studies are not approved production characters.
    </p>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%, 340px),1fr))",gap:16}}>
      {([{label:"Warm expression",spec:warm},{label:"Neutral expression",spec:neutral}] as const).map(({label,spec})=>
        <figure key={label} style={{margin:0,minWidth:0}}>
          <figcaption style={{fontWeight:700,marginBottom:8}}>{label}</figcaption>
          <div style={{width:"100%",aspectRatio:aspect==="portrait"?"540 / 960":"960 / 540",
            border:"7px solid #fff7e8",boxSizing:"border-box"}}>
            <CrayonScene spec={spec} frame={frame}/>
          </div>
        </figure>)}
    </div>
    <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap",marginTop:16}}>
      <button type="button" onClick={toggle}>{playing?"Pause":"Play both"}</button>
      <button type="button" onClick={restart}>Restart both</button>
      <label>Shared frame <input type="range" min={0} max={warm.durationFrames-1}
        value={frame} onChange={event=>seek(Number(event.target.value))}/></label>
      <output aria-live="off" style={{fontVariantNumeric:"tabular-nums"}}>{frame}</output>
      <button type="button" onClick={()=>seek(warm.durationFrames-1)}>Compare final</button>
    </div>
  </section>;
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
export const MatchedExpressionComparison:Story={render:args=><AdultFaceExpressionComparison {...args}/>};
export const MatchedExpressionPortrait:Story={args:{aspect:"portrait"},render:args=><AdultFaceExpressionComparison {...args}/>};
