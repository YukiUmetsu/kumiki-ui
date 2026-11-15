import type {Meta,StoryObj} from "@storybook/react-vite";
import {CrayonScene} from "../../registry/video/materials/crayon-scene-react";
import {crayonAdultFaceStudy} from "./crayon-artcraft-adult-face-fixtures";
import {useCrayonStoryPlayback} from "./crayon-story-playback";
import {CRAYON_PORTRAIT_AUDIT,crayonPortraitFrozenAudit} from "./crayon-artcraft-portrait-audit";

/** ArtCraft unapproved evidence bench; not a public character showcase. */
interface StudyProps {
  aspect:"landscape"|"portrait";
  detail:number;expression:"warm"|"neutral";headScaleY:number;
  startFrame:number;playbackRate:number;loop:boolean;
  /** Opt-in photo-versus-render diagnostic only, not a promoted character. */
  referenceReview?:boolean;
  showCandidateLandmarks?:boolean;
}
export function AdultFaceArtcraftWorkbench({aspect,detail,expression,headScaleY,startFrame,playbackRate,loop,
  referenceReview=false,showCandidateLandmarks=false}:StudyProps){
  const spec=crayonAdultFaceStudy(aspect,{detail,expression,headScaleY});
  const {frame,playing,seek,restart,toggle}=useCrayonStoryPlayback(
    startFrame,spec.durationFrames,"adult-face-artcraft:"+aspect+":"+expression+":"+headScaleY,playbackRate,loop);
  const audit=crayonPortraitFrozenAudit();
  const frozenView=aspect==="portrait"&&detail===1&&expression==="warm"&&
    headScaleY===.82&&frame===299;
  return <div style={{maxWidth:1040,margin:"auto",padding:16,color:"#34333d",
    background:"#efe7db",fontFamily:"system-ui",boxSizing:"border-box"}}>
    <div style={{fontSize:18,fontWeight:700}}>ArtCraft — adult facial anatomy (unapproved)</div>
    <p style={{maxWidth:640,lineHeight:1.6,margin:"7px 0 13px",fontSize:13}}>
      Original source geometry: independent lids, tear ducts, orbital shadows,
      nasal sidewall, alar cartilage, jaw planes and rooted hair. This is a
      construction review, not a finished character. Text remains outside SVG.
    </p>
    <div data-km-crayon-source-review={referenceReview?"on":"off"} style={{
      display:referenceReview?"grid":"block",
      gridTemplateColumns:referenceReview?"repeat(auto-fit, minmax(260px, 1fr))":undefined,
      alignItems:"start",gap:16,
    }}>
      {referenceReview&&<figure style={{margin:0,minWidth:0}}>
        <a href={CRAYON_PORTRAIT_AUDIT.source.link}
          target="_blank" rel="noopener noreferrer">
          <img loading="lazy" src={CRAYON_PORTRAIT_AUDIT.source.preview}
            alt="Christopher Campbell, 2015, CC0 photographic anatomy reference"
            style={{display:"block",width:"100%",height:"auto",background:"#e5ddcd"}}/>
        </a>
        <figcaption style={{fontSize:12,lineHeight:1.5,marginTop:8}}>
          Licensed CC0 photographic reference, not the same identity as the
          unfinished CRAYON1 character. The audit measures a separate 608×343
          browser capture; the image above is an unregistered preview.
        </figcaption>
      </figure>}
      <div style={{width:aspect==="portrait"?"min(100%,420px)":"100%",
        aspectRatio:aspect==="portrait"?"540/960":"960/540",
        margin:"0 auto",border:"9px solid #fff7e8",
        position:"relative",boxSizing:"border-box"}}>
        <CrayonScene spec={spec} frame={frame}/>
        {referenceReview&&showCandidateLandmarks&&frozenView&&
          <div data-km-crayon-portrait-landmarks="" aria-label="Screenshot-observed portrait landmarks"
            style={{position:"absolute",inset:0,pointerEvents:"none"}}>
            {Object.entries(CRAYON_PORTRAIT_AUDIT.candidatePoints).map(([name,[x,y]])=>
              <span key={name} title={name} data-km-crayon-portrait-landmark={name}
                style={{position:"absolute",left:(x/540*100)+"%",top:(y/960*100)+"%",
                  width:5,height:5,transform:"translate(-50%,-50%)",
                  borderRadius:"50%",background:"#c5332b",border:"1px solid #fff",
                  boxShadow:"0 0 0 1px #332620"}}/>)}
          </div>}
      </div>
    </div>
    {referenceReview&&<div data-km-crayon-portrait-audit="REJECT" style={{
      marginTop:12,padding:"10px 12px",border:"1px solid #a99586",
      background:"#f7eee3",fontSize:13,lineHeight:1.55}}>
      <strong>ArtCraft v7: REJECT.</strong> Frozen screenshot audit:
      {" "+audit.failedLandmarks.length+"/"+audit.inspectedLandmarks}
      {" "}anatomical landmarks exceed tolerance;
      {" "+audit.failedTonalRegions.length+"/"+audit.tonal.length}
      {" "}face tonal regions are too flat. This is NOT a verified likeness
      and must remain an unpublished research workbench.
      {!frozenView&&<p style={{margin:"6px 0 0"}}>The measured landmark overlay
        applies only to the actual 540×960 frame 299 render with detail 1,
        warm expression and head scale 0.82; these current controls differ.</p>}
      <p style={{margin:"6px 0 0"}}>Source was a cropped screenshot of a
        CC0 photo, not the preserved original JPEG. The original-source,
        independent feature-mask and motion gates still block release.</p>
    </div>}
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
  title:"Video production/Film Looks/Crayon/ArtCraft Adult Face Lab",
  id:"video-crayon-artcraft-adult-face",
  tags:["!dev"],
  component:AdultFaceArtcraftWorkbench,
  args:{aspect:"landscape",detail:1,expression:"warm",headScaleY:.82,startFrame:299,playbackRate:1,loop:false,
    referenceReview:false,showCandidateLandmarks:false},
  argTypes:{aspect:{control:"inline-radio",options:["landscape","portrait"]},
    detail:{control:{type:"range",min:0,max:1,step:.05}},
    expression:{control:"inline-radio",options:["warm","neutral"]},
    headScaleY:{control:{type:"range",min:.72,max:1,step:.01},
      description:"ArtCraft skull proportion: 1 reproduces the rejected elongated head"},
    startFrame:{control:{type:"range",min:0,max:299,step:1}},
    playbackRate:{control:{type:"range",min:.25,max:2,step:.25}},
    loop:{control:"boolean"},
    referenceReview:{control:"boolean",description:"Compare CC0 source to frozen real render; no artistic approval"},
    showCandidateLandmarks:{control:"boolean",description:"18 independent screenshot-observed points, portrait frame 299 only"}},
} satisfies Meta<typeof AdultFaceArtcraftWorkbench>;
export default meta;
type Story=StoryObj<typeof meta>;
export const AdultFaceThreeQuarter:Story={};
export const AdultFacePortrait:Story={args:{aspect:"portrait"}};
export const AdultFaceConstruction:Story={args:{startFrame:160}};
