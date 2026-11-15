import {useMemo,useState} from "react";
import type {Meta,StoryObj} from "@storybook/react-vite";
import {CrayonScene} from "../../registry/video/materials/crayon-scene-react";
import {crayonCamera} from "../../registry/video/materials/crayon-scene";
import type {CrayonSceneSpec} from "../../registry/video/materials/crayon-scene";
import {crayonAdultFaceStudy} from "./crayon-artcraft-adult-face-fixtures";
import {crayonCc0NearEyeStudy} from "./crayon-artcraft-cc0-near-eye";
import {crayonPaperContactSwatches} from "./crayon-artcraft-paper-contact-fixtures";
import {crayonArtcraftBodyStudy,CRAYON_BODY_REFERENCE} from "./crayon-artcraft-body-study";
import {crayonCc0FaceStudy,CRAYON_F1_FACE_PROOF,CRAYON_F1_EYE_INSPECTION} from "./crayon-artcraft-cc0-face";
import {useCrayonStoryPlayback} from "./crayon-story-playback";
import {CRAYON_PORTRAIT_AUDIT,crayonPortraitFrozenAudit} from "./crayon-artcraft-portrait-audit";

/** ArtCraft reference crops use only the native CRAYON1 camera; source marks remain unchanged. */
export type ArtcraftInspection="full"|"face"|"eyes"|"nose-mouth"|"garment";
const inspectionFocus={
  landscape:{
    face:{focusX:480,focusY:194,zoom:1.55},
    eyes:{focusX:477,focusY:162,zoom:2.5},
    "nose-mouth":{focusX:480,focusY:267,zoom:2.65},
    garment:{focusX:480,focusY:405,zoom:1.85},
  },
  portrait:{
    face:{focusX:270,focusY:330,zoom:1.5},
    eyes:{focusX:270,focusY:243,zoom:2.15},
    "nose-mouth":{focusX:270,focusY:431,zoom:2.7},
    garment:{focusX:270,focusY:726,zoom:1.5},
  },
} as const;
/** Original wax geometry, palette and seed remain immutable in inspection. */
export function crayonArtcraftInspectionSpec(
  spec:CrayonSceneSpec,inspection:ArtcraftInspection,
):CrayonSceneSpec{
  if(inspection==="full")return spec;
  const aspect=spec.height>spec.width?"portrait":"landscape";
  const focus=inspectionFocus[aspect][inspection];
  if(!focus)throw new RangeError("Unknown ArtCraft inspection region");
  return {...spec,camera:[{frame:0,...focus},{frame:spec.durationFrames-1,...focus}]};
}
/** ArtCraft unapproved evidence bench; not a public character showcase. */
interface StudyProps {
  aspect:"landscape"|"portrait";
  detail:number;expression:"warm"|"neutral";headScaleY:number;
  startFrame:number;playbackRate:number;loop:boolean;
  inspection?:ArtcraftInspection;
  /** Diagnostic evidence only; never an approved character. */
  referenceReview?:boolean;
  showCandidateLandmarks?:boolean;
}
export function AdultFaceArtcraftWorkbench({aspect,detail,expression,headScaleY,startFrame,playbackRate,loop,
  inspection="full",referenceReview=false,showCandidateLandmarks=false}:StudyProps){
  // Source geometry is expensive and independent of the animation playhead.
  const spec=useMemo(()=>crayonAdultFaceStudy(aspect,{detail,expression,headScaleY}),
    [aspect,detail,expression,headScaleY]);
  const framed=useMemo(()=>crayonArtcraftInspectionSpec(spec,inspection),[spec,inspection]);
  const {frame,playing,seek,restart,toggle}=useCrayonStoryPlayback(
    startFrame,spec.durationFrames,"adult-face-artcraft:"+aspect+":"+expression+":"+headScaleY,playbackRate,loop);
  const audit=crayonPortraitFrozenAudit();
  const frozenView=aspect==="portrait"&&detail===1&&expression==="warm"&&
    headScaleY===.82&&frame===299&&inspection==="full";
  return <div data-km-crayon-artcraft-inspection={inspection} style={{maxWidth:1040,margin:"auto",padding:16,color:"#34333d",
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
          unfinished CRAYON1 character. The audit measures a separate 608×1082
          browser capture; the image above is an unregistered preview.
        </figcaption>
      </figure>}
      <div style={{width:aspect==="portrait"?"min(100%,420px)":"100%",
        aspectRatio:aspect==="portrait"?"540/960":"960/540",
        margin:"0 auto",border:"9px solid #fff7e8",
        position:"relative",boxSizing:"border-box"}}>
        <CrayonScene spec={framed} frame={frame}/>
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
        warm expression, full camera and head scale 0.82; these current controls differ.</p>}
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
/** Matched two-up proof: same material, pose, frame and scale; expression alone changes. */
export function AdultFaceExpressionComparison({aspect,detail,headScaleY,startFrame,playbackRate,loop,inspection="full"}:StudyProps){
  // Reuse identical source geometry while the shared playhead advances.
  // Two full handcrafted SVG studies are intentionally rendered in this bench.
  const warm=useMemo(()=>crayonAdultFaceStudy(aspect,{detail,headScaleY,expression:"warm"}),
    [aspect,detail,headScaleY]);
  const neutral=useMemo(()=>crayonAdultFaceStudy(aspect,{detail,headScaleY,expression:"neutral"}),
    [aspect,detail,headScaleY]);
  const framedWarm=useMemo(()=>crayonArtcraftInspectionSpec(warm,inspection),[warm,inspection]);
  const framedNeutral=useMemo(()=>crayonArtcraftInspectionSpec(neutral,inspection),[neutral,inspection]);
  const {frame,playing,seek,restart,toggle}=useCrayonStoryPlayback(
    startFrame,warm.durationFrames,"adult-face-expression-compare:"+aspect+":"+headScaleY,
    playbackRate,loop);
  return <section data-km-crayon-artcraft-comparison="" data-km-crayon-artcraft-inspection={inspection}
    style={{maxWidth:1120,margin:"auto",padding:16,background:"#efe7db",
      color:"#34333d",fontFamily:"system-ui",boxSizing:"border-box"}}>
    <h2 style={{fontSize:20,margin:"0 0 8px"}}>ArtCraft expression anatomy — review only</h2>
    <p style={{fontSize:13,lineHeight:1.6,maxWidth:800,margin:"0 0 16px"}}>
      Matched original three-quarter facial studies at exactly the same frame and scale.
      Compare eyelids, commissures, cheeks and nasolabial tension before approving the design.
      These studies are not approved production characters.
    </p>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%, 340px),1fr))",gap:16}}>
      {([{label:"Warm expression",spec:framedWarm},{label:"Neutral expression",spec:framedNeutral}] as const).map(({label,spec})=>
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
  title:"Video production/Film Looks/Crayon/ArtCraft Adult Face Lab",
  id:"video-crayon-artcraft-adult-face",
  tags:["!dev"],
  component:AdultFaceArtcraftWorkbench,
  args:{aspect:"landscape",detail:1,expression:"warm",headScaleY:.82,startFrame:299,playbackRate:1,loop:false,inspection:"full",
    referenceReview:false,showCandidateLandmarks:false},
  argTypes:{aspect:{control:"inline-radio",options:["landscape","portrait"]},
    detail:{control:{type:"range",min:0,max:1,step:.05}},
    inspection:{control:"select",options:["full","face","eyes","nose-mouth","garment"],
      description:"Native CRAYON1 camera crops; identical wax seed and anatomy"},
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
export const MatchedExpressionComparison:Story={render:args=><AdultFaceExpressionComparison {...args}/>};
export const MatchedExpressionPortrait:Story={args:{aspect:"portrait"},render:args=><AdultFaceExpressionComparison {...args}/>};
export const EyeStructureMacro:Story={args:{inspection:"eyes",startFrame:299}};
export const LipAndNoseMacro:Story={args:{inspection:"nose-mouth",startFrame:299}};
export const TailoredGarmentMacro:Story={args:{inspection:"garment",startFrame:299}};
export const MatchedEyesMacro:Story={args:{inspection:"eyes",startFrame:299},render:args=><AdultFaceExpressionComparison {...args}/>};

/** ArtCraft experimental, source-crop-derived independent iris/eyelid wax.
 * NOT transplanted onto the rejected whole-face synthetic character.
 */
export function Cc0EyeCropWorkbench({aspect,detail,startFrame,playbackRate,loop}:StudyProps){
  const spec=useMemo(()=>crayonCc0NearEyeStudy(aspect,Math.max(.2,detail)),[aspect,detail]);
  const {frame,playing,seek,restart,toggle}=useCrayonStoryPlayback(
    startFrame,spec.durationFrames,"crayon-cc0-eye-study:"+aspect,playbackRate,loop);
  return <section data-km-crayon-cc0-eye-study="" style={{maxWidth:1050,
    padding:16,margin:"auto",background:"#f4e8dd",boxSizing:"border-box"}}>
    <h2 style={{fontSize:19,margin:"0 0 8px"}}>CC0 eye anatomy: original wax construction</h2>
    <p style={{fontSize:13,lineHeight:1.5,maxWidth:760}}>
      Experimental 210×200 source-crop construction. Upper and lower eyelids,
      socket, iris, tear corner and brow have distinct native CRAYON1 wax.
      Not a full portrait, photographic likeness or approved professional art.
    </p>
    <div style={{maxWidth:aspect==="portrait"?420:960,margin:"auto",
      aspectRatio:aspect==="portrait"?"540 / 960":"960 / 540"}}>
      <CrayonScene spec={spec} frame={frame}/>
    </div>
    <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center",marginTop:12}}>
      <button type="button" onClick={toggle}>{playing?"Pause":"Play study"}</button>
      <button type="button" onClick={restart}>Restart</button>
      <label>Frame <input aria-label="Eye study frame" type="range" min={0}
        max={spec.durationFrames-1} value={frame}
        onChange={e=>seek(Number(e.target.value))}/></label>
      <output>{frame}</output>
      <button type="button" onClick={()=>seek(299)}>Inspect wax</button>
    </div>
  </section>;
}
export const SourceMeasuredCc0Eye:Story={
  name:"CC0 near-eye · isolated native wax (ArtCraft experiment)",
  args:{aspect:"landscape",detail:1,startFrame:299},
  render:args=><Cc0EyeCropWorkbench {...args}/>,
};
export const SourceMeasuredCc0EyePortrait:Story={
  name:"CC0 near-eye · vertical construction (ArtCraft experiment)",
  args:{aspect:"portrait",detail:1,startFrame:299},
  render:args=><Cc0EyeCropWorkbench {...args}/>,
};

/** Opt-in material A/B. Same CC0 study, anatomical paths, seed, frame and
 * viewport. Only wax deposition changes. Kept in the one Crayon folder.
 */
export function Cc0WaxContactComparison({aspect,detail,startFrame,playbackRate,loop}:StudyProps){
  const baseline=useMemo(()=>crayonCc0NearEyeStudy(aspect,Math.max(.2,detail),"smooth"),
    [aspect,detail]);
  const drawn=useMemo(()=>crayonCc0NearEyeStudy(aspect,Math.max(.2,detail),"stroke-built"),
    [aspect,detail]);
  const {frame,playing,seek,restart,toggle}=useCrayonStoryPlayback(
    startFrame,drawn.durationFrames,"crayon-material-compare:"+aspect,playbackRate,loop);
  return <section data-km-crayon-material-comparison="" style={{maxWidth:1120,
    margin:"auto",padding:14,background:"#f4e8dd",boxSizing:"border-box"}}>
    <h2 style={{fontSize:18,margin:"0 0 8px"}}>Crayon tooth and pressure — actual mark construction</h2>
    <p style={{maxWidth:760,fontSize:13,lineHeight:1.5}}>
      The same anatomy and seed in both samples. Left uses the previous polished
      wax finish; right uses cross-grain broken crayon contacts, visible paper
      tooth and an opaque, non-airbrushed undercoat. Experimental craft review.
    </p>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,320px),1fr))",
      gap:14}}>
      {([{label:"Before · smooth wax",spec:baseline},
         {label:"After · stroke-built wax",spec:drawn}] as const).map(({label,spec})=>
        <figure key={label} style={{margin:0,minWidth:0}}>
          <figcaption style={{margin:"0 0 7px",fontWeight:700,fontSize:13}}>{label}</figcaption>
          <div style={{aspectRatio:aspect==="portrait"?"540 / 960":"960 / 540"}}>
            <CrayonScene spec={spec} frame={frame}/>
          </div>
        </figure>)}
    </div>
    <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",marginTop:12}}>
      <button type="button" onClick={toggle}>{playing?"Pause":"Play wax deposition"}</button>
      <button type="button" onClick={restart}>Restart</button>
      <label>Frame <input aria-label="Wax contact frame" type="range"
        min={0} max={drawn.durationFrames-1} value={frame}
        onChange={e=>seek(Number(e.target.value))}/></label>
      <output>{frame}</output>
      <button type="button" onClick={()=>seek(299)}>Inspect final</button>
    </div>
  </section>;
}
export const SourceMeasuredWaxContactComparison:Story={
  name:"Crayon contact · smooth versus stroke-built (ArtCraft experiment)",
  args:{aspect:"landscape",detail:1,startFrame:299},
  render:args=><Cc0WaxContactComparison {...args}/>,
};

/**
 * ArtCraft material-only proof: same deterministic CRAYON1 engine, four
 * controlled paint situations. This is a *research* story in the existing
 * Crayon folder, not a polished portrait or an additional category.
 */
export function PaperContactMaterialLab({detail,startFrame,playbackRate,loop}:StudyProps){
  const [compare,setCompare]=useState(false);
  const pressure=Math.max(.2,Math.min(1,detail));
  const spec=useMemo(()=>crayonPaperContactSwatches(pressure),[pressure]);
  const {frame,playing,seek,restart,toggle}=useCrayonStoryPlayback(
    startFrame,spec.durationFrames,"artcraft-paper-contact:"+pressure,playbackRate,loop);
  return <section data-km-artcraft-paper-contact-lab="" style={{
    padding:16,maxWidth:1060,margin:"auto",background:"#f7ecda",boxSizing:"border-box"}}>
    <h2 style={{fontSize:19,margin:"0 0 8px"}}>ArtCraft paper tooth: controlled native wax deposits</h2>
    <p style={{fontSize:13,lineHeight:1.5,maxWidth:760,margin:"0 0 12px"}}>
      True paper-coordinate height sampling, pressure-dependent wax pickup and
      broken side-nib contacts. The artwork is a material test, not an approved
      human eye. Pressure is controlled by the Detail slider.
    </p>
    <div data-km-crayon-contact-frames={compare?"comparison":"single"} style={{
      display:compare?"grid":"block",gridTemplateColumns:compare?"repeat(2,minmax(0,1fr))":undefined,
      gap:12,alignItems:"start"}}>
      {compare&&<div>
        <div style={{fontSize:12,marginBottom:4}}>Earlier absolute frame {Math.max(0,frame-24)}</div>
        <div style={{width:"100%",aspectRatio:"960 / 318"}}>
          <CrayonScene spec={spec} frame={Math.max(0,frame-24)}/>
        </div>
      </div>}
      <div>
        {compare&&<div style={{fontSize:12,marginBottom:4}}>Current absolute frame {frame}</div>}
        <div style={{width:"100%",aspectRatio:"960 / 318"}}>
          <CrayonScene spec={spec} frame={frame}/>
        </div>
      </div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",
      gap:8,fontSize:12,marginTop:8,textAlign:"center"}}>
      <span>Single pass</span><span>Overlapping colors</span>
      <span>Dense opaque wax</span><span>Wax on dark ground</span>
    </div>
    <div style={{display:"flex",gap:9,alignItems:"center",flexWrap:"wrap",marginTop:12}}>
      <button type="button" onClick={toggle}>{playing?"Pause":"Play deposition"}</button>
      <button type="button" onClick={restart}>Restart</button>
      <label>Frame <input aria-label="Paper contact frame" type="range"
        min={0} max={spec.durationFrames-1} value={frame}
        onChange={e=>seek(Number(e.target.value))}/></label>
      <output>{frame}</output>
      <button type="button" onClick={()=>seek(239)}>Inspect material</button>
      <button type="button" aria-pressed={compare}
        onClick={()=>setCompare(previous=>!previous)}>
        {compare?"Hide before/after":"Compare earlier/later frames"}
      </button>
    </div>
  </section>;
}
export const ArtCraftPaperContactSamples:Story={
  name:"Paper height · contact and layering samples (ArtCraft experiment)",
  args:{aspect:"landscape",detail:.72,startFrame:239},
  render:args=><PaperContactMaterialLab {...args}/>,
};


/**
 * ArtCraft v7 source-guided whole-body laboratory. This is deliberately
 * distinct from the currently REJECTED full face. Reference is attributed
 * CC BY-SA material for anatomical structure; no source photo is bundled.
 * Never promote to a production-facing gallery without pixel registration
 * and an independent artist signoff on an actual native browser render.
 */
export function BodyReferenceArtcraftWorkbench({
  detail,startFrame,playbackRate,loop,
}:StudyProps){
  const [view,setView]=useState<"painted"|"construction">("painted");
  const [sourceVisible,setSourceVisible]=useState(true);
  const spec=useMemo(()=>crayonArtcraftBodyStudy({
    detail:Math.max(.2,detail),view,
  }),[detail,view]);
  const {frame,playing,seek,restart,toggle}=useCrayonStoryPlayback(
    startFrame,spec.durationFrames,"crayon-body-artcraft:"+view+":"+detail,playbackRate,loop);
  return <section data-km-crayon-body-artcraft="" style={{
    maxWidth:1250,margin:"auto",padding:16,background:"#f5e9dc",
    color:"#39343b",boxSizing:"border-box",fontFamily:"system-ui"}}>
    <h2 style={{fontSize:19,margin:"0 0 8px"}}>
      Full-body anatomy · source-first Crayon construction (unapproved)
    </h2>
    <p style={{fontSize:13,maxWidth:870,lineHeight:1.55}}>
      A standalone photograph-studied adult body. Distinct shoulder, elbow,
      wrist, hip, knee and ankle anchors; folded garment volumes, cuff
      overlaps, hand anatomy, pinstripes, trouser folds and grounded shoes.
      The neutral head is intentionally unfinished: never mistake it for a
      reference-accurate portrait.
    </p>
    <div style={{display:"grid",
      gridTemplateColumns:sourceVisible?
        "repeat(auto-fit,minmax(min(100%,340px),1fr))":"minmax(0,600px)",
      gap:16,alignItems:"start",justifyContent:"center"}}>
      {sourceVisible&&<figure style={{margin:0,minWidth:0}}>
        <div style={{fontWeight:650,fontSize:13,marginBottom:8}}>
          Original anatomy / garment reference
        </div>
        <img
          src="https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Free_use_human_standing_simple.jpg/500px-Free_use_human_standing_simple.jpg"
          alt="Licensed standing-figure photographic anatomy and clothing reference"
          loading="lazy" style={{width:"100%",height:"auto",display:"block"}}/>
        <figcaption style={{fontSize:11,lineHeight:1.55,marginTop:9}}>
          {CRAYON_BODY_REFERENCE.title} · {CRAYON_BODY_REFERENCE.author},
          {" "}{CRAYON_BODY_REFERENCE.license}.
          <a style={{marginLeft:5}} target="_blank" rel="noopener noreferrer"
            href={CRAYON_BODY_REFERENCE.url}>Source / license</a>.
          Technique and construction reference; photograph not packaged.
        </figcaption>
      </figure>}
      <figure style={{margin:0,minWidth:0}}>
        <figcaption style={{fontWeight:650,fontSize:13,marginBottom:8}}>
          CRAYON1 · {view==="painted"?"wax construction":"body landmark graph"}
        </figcaption>
        <div style={{width:"100%",aspectRatio:"669 / 1000",
          background:"#f5ead8",overflow:"hidden"}}>
          <CrayonScene spec={spec} frame={frame}/>
        </div>
        <figcaption style={{fontSize:11,lineHeight:1.5,marginTop:9}}>
          ArtCraft: TECHNICAL EXPERIMENT. No measured photo/render fidelity
          or visual approval is claimed. Human face, hands and clothing
          remain subject to independent reference-matched reconstruction.
        </figcaption>
      </figure>
    </div>
    <div style={{display:"flex",gap:10,alignItems:"center",
      flexWrap:"wrap",marginTop:16,fontSize:13}}>
      <button type="button" onClick={toggle}>{playing?"Pause":"Play strokes"}</button>
      <button type="button" onClick={restart}>Restart</button>
      <label>Frame <input aria-label="Body ArtCraft frame" type="range"
        min={0} max={spec.durationFrames-1} value={frame}
        onChange={e=>seek(Number(e.target.value))}/></label>
      <output>{frame}</output>
      <button type="button" onClick={()=>seek(299)}>Finished still</button>
      <button type="button" onClick={()=>
        setView(previous=>previous==="painted"?"construction":"painted")}>
        {view==="painted"?"Inspect reference anchors":"Return to wax"}
      </button>
      <button type="button" aria-pressed={sourceVisible}
        onClick={()=>setSourceVisible(v=>!v)}>
        {sourceVisible?"Hide source photo":"Compare original photo"}
      </button>
    </div>
  </section>;
}
export const SourceMeasuredBodyStudy:Story={
  name:"Full body · source geometry and garment art (ArtCraft experiment)",
  args:{aspect:"portrait",detail:1,startFrame:299,playbackRate:1,loop:false},
  render:args=><BodyReferenceArtcraftWorkbench {...args}/>,
};


/**
 * New F1-only portrait plane study, using ORIGINAL SOURCE PIXEL COORDINATES
 * and actual independently observed source landmark points. Unlike the
 * existing synthetic adult bust, it does not invent a different identity.
 * It remains an unpublished experimental artifact pending pixel-gate review.
 */
/** Synchronize the actual reference PHOTO camera with native SVG
 * without losing grain or relying on an unaligned full-height preview.
 * CSS translate percentages operate on original 608×1082 image size. */
export function crayonF1SourceCssCamera(spec:CrayonSceneSpec,frame:number){
  const camera=crayonCamera(spec,frame);
  return "translate("+
    (100*camera.x/spec.width).toFixed(4)+"%, "+
    (100*camera.y/spec.height).toFixed(4)+"%) scale("+
    camera.scale.toFixed(4)+")";
}

export function Cc0SourceRegisteredFaceWorkbench({
  detail,startFrame,playbackRate,loop,
}:StudyProps){
  const [view,setView]=useState<"wax"|"anatomy">("wax");
  const [showReference,setShowReference]=useState(true);
  const [fiberMaterial,setFiberMaterial]=useState<"line"|"dry-wax">("dry-wax");
  const [eyeContact,setEyeContact]=useState<"source-shade"|"source-value"|"baseline">("source-shade");
  const [midfaceForm,setMidfaceForm]=useState<"source-volume"|"baseline">("baseline");
  const [jawNeckForm,setJawNeckForm]=useState<"source-contour"|"baseline">("baseline");
  const [lashFinish,setLashFinish]=useState<"sparse"|"rooted">("sparse");
  const [inspection,setInspection]=useState<
    "full"|"face"|"eyes"|"near-eye"|"far-eye"|"nose-mouth"|
    "nose"|"mouth"|"jaw-neck"|"hair-left"|"hair-right">("full");
  const spec=useMemo(()=>crayonCc0FaceStudy({
    detail:Math.max(.2,detail),view,fiberMaterial,eyeContact,midfaceForm,jawNeckForm,lashFinish,
  }),[detail,view,fiberMaterial,eyeContact,midfaceForm,jawNeckForm,lashFinish]);
  const framed=useMemo(()=>{
    if(inspection==="full")return spec;
    const focus={
      face:{focusX:335,focusY:586,zoom:1.6},
      eyes:{focusX:331,focusY:524,zoom:2.12},
      "near-eye":CRAYON_F1_EYE_INSPECTION.near,
      "far-eye":CRAYON_F1_EYE_INSPECTION.far,
      "nose-mouth":{focusX:415,focusY:675,zoom:2.65},
      nose:{focusX:416,focusY:622,zoom:3},
      mouth:{focusX:417,focusY:734,zoom:3},
      "jaw-neck":{focusX:312,focusY:871,zoom:2.4},
      "hair-left":{focusX:75,focusY:670,zoom:2.15},
      "hair-right":{focusX:513,focusY:670,zoom:2.15},
    }[inspection];
    return {...spec,camera:[
      {frame:0,...focus},
      {frame:299,...focus},
    ]};
  },[spec,inspection]);
  const {frame,playing,seek,restart,toggle}=useCrayonStoryPlayback(
    startFrame,spec.durationFrames,
    "crayon-source-registered-face:"+view+":"+detail,playbackRate,loop);
  const sourceCamera=crayonF1SourceCssCamera(framed,frame);
  return <section data-km-crayon-f1-registered-face=""
    style={{maxWidth:1160,margin:"auto",padding:16,background:"#f3e9da",
      boxSizing:"border-box",fontFamily:"system-ui",color:"#352b30"}}>
    <h2 style={{fontSize:19,margin:"0 0 7px"}}>
      CC0 full face · photographed landmarks to wax geometry (ArtCraft experiment)
    </h2>
    <p style={{maxWidth:870,fontSize:13,lineHeight:1.55}}>
      Entire 608×1082 CC0 source viewport reconstructed as editable CRAYON1
      planes. The anatomical positions of iris, eyelids, nasal cartilage,
      lip volumes, chin, hairline and jaw use the same real photographed
      identity. A source landmark graph can be toggled without changing
      painted shapes or wax sequence. Artistic acceptance is NOT established.
    </p>
    <div style={{display:"grid",gap:16,alignItems:"start",
      gridTemplateColumns:showReference?
        "repeat(auto-fit,minmax(min(100%,310px),1fr))":"minmax(0,500px)",
      justifyContent:"center"}}>
      {showReference&&<figure style={{margin:0,minWidth:0}}>
        <figcaption style={{fontSize:13,fontWeight:650,marginBottom:8}}>
          Original CC0 photograph · source geometry
        </figcaption>
        <a href={CRAYON_F1_FACE_PROOF.url} target="_blank"
          rel="noopener noreferrer"
          data-km-crayon-f1-source-camera={sourceCamera}
          style={{display:"block",width:"100%",aspectRatio:"608 / 1082",
            position:"relative",overflow:"hidden",background:"#262023"}}>
          <img loading="lazy" src={CRAYON_PORTRAIT_AUDIT.source.preview}
            alt="CC0 photographed source identity and facial anatomy"
            style={{width:"100%",height:"100%",display:"block",
              position:"absolute",top:0,left:0,objectFit:"cover",
              transform:sourceCamera,transformOrigin:"0 0",
              background:"#d8ceba"}}/>
        </a>
        <figcaption style={{fontSize:11,lineHeight:1.5,marginTop:8}}>
          Christopher Campbell, 2015 · CC0 1.0. The measurement baseline
          is a real 608×1082 screenshot (not the original camera JPEG).
          The source preview uses the same zoom/pan as the native rendering.
          This remote image is not packaged with the wax drawing.
        </figcaption>
      </figure>}
      <figure style={{margin:0,minWidth:0}}>
        <figcaption style={{fontSize:13,fontWeight:650,marginBottom:8}}>
          Code-only CRAYON1 · {view==="wax"?
            "wax anatomical reconstruction":"frozen photographed landmarks"}
        </figcaption>
        <div style={{width:"100%",aspectRatio:"608 / 1082",
          background:"#f4e6d3",overflow:"hidden"}}>
          <CrayonScene spec={framed} frame={frame}/>
        </div>
        <figcaption style={{fontSize:11,lineHeight:1.5,marginTop:8}}>
          RESEARCH ONLY. Measured placement and passing technical tests do
          not verify likeness, authentic crayon microtexture, facial action
          or all 18 independently re-observed render landmarks.
        </figcaption>
      </figure>
    </div>
    <div style={{display:"flex",flexWrap:"wrap",gap:10,marginTop:16,
      alignItems:"center",fontSize:13}}>
      <button type="button" onClick={toggle}>
        {playing?"Pause":"Play wax deposition"}
      </button>
      <button type="button" onClick={restart}>Restart</button>
      <label>Frame <input aria-label="Source face frame"
        type="range" min={0} max={spec.durationFrames-1} value={frame}
        onChange={e=>seek(Number(e.target.value))}/></label>
      <output>{frame}</output>
      <button type="button" onClick={()=>seek(299)}>Inspect final</button>
      <button type="button" onClick={()=>
        setView(v=>v==="wax"?"anatomy":"wax")}>
        {view==="wax"?"View source landmarks":"Show wax only"}
      </button>
      <button type="button" aria-pressed={showReference}
        onClick={()=>setShowReference(s=>!s)}>
        {showReference?"Hide source":"Compare source"}
      </button>
      <label>Source eye anatomy and wax{" "}
        <select aria-label="F1 source eye anatomy" value={eyeContact}
          onChange={e=>setEyeContact(e.target.value as
            "source-shade"|"source-value"|"baseline")}>
          <option value="source-shade">Source-led iris, lids and root wax (experiment)</option>
          <option value="source-value">Deeper source-measured wax eye values (experiment)</option>
          <option value="baseline">Unchanged previous eye (negative control)</option>
        </select>
      </label>
      <label>Source eyelash root density{" "}
        <select aria-label="F1 native wax eyelash clusters" value={lashFinish}
          onChange={e=>setLashFinish(e.target.value as "sparse"|"rooted")}>
          <option value="sparse">Previous sparse wax lashes (negative control)</option>
          <option value="rooted">Unequal clustered native wax fibers (experiment)</option>
        </select>
      </label>
      <label>Source nose and lip volumes{" "}
        <select aria-label="F1 source midface anatomy" value={midfaceForm}
          onChange={e=>setMidfaceForm(e.target.value as
            "source-volume"|"baseline")}>
          <option value="source-volume">Attached nasal and lip/dental wax (experiment)</option>
          <option value="baseline">Unchanged previous nose and mouth (negative control)</option>
        </select>
      </label>
      <label>Mandible and neck wax planes{" "}
        <select aria-label="F1 jaw neck source contour" value={jawNeckForm}
          onChange={e=>setJawNeckForm(e.target.value as "source-contour"|"baseline")}>
          <option value="baseline">Previous facial contour (negative control)</option>
          <option value="source-contour">Source mandibular curve and attached neck wax (experiment)</option>
        </select>
      </label>
      <label>Hair mark material{" "}
        <select aria-label="CC0 hair mark material" value={fiberMaterial}
          onChange={e=>setFiberMaterial(e.target.value as "line"|"dry-wax")}>
          <option value="dry-wax">Paper-built crayon deposits</option>
          <option value="line">Legacy smooth line · negative control</option>
        </select>
      </label>
      <label>Inspect source region{" "}
        <select aria-label="CC0 source anatomy inspection" value={inspection}
          onChange={e=>setInspection(e.target.value as
            "full"|"face"|"eyes"|"near-eye"|"far-eye"|"nose-mouth"|
            "nose"|"mouth"|"jaw-neck"|"hair-left"|"hair-right")}>
          <option value="full">Full portrait</option>
          <option value="face">Face planes (1.6×)</option>
          <option value="eyes">Both eyes (2.12×)</option>
          <option value="near-eye">Near eyelid/iris (2.95×)</option>
          <option value="far-eye">Far eyelid/iris (3×)</option>
          <option value="nose-mouth">Nose and lips (2.65×)</option>
          <option value="nose">Asymmetric nostrils (3×)</option>
          <option value="mouth">Shadowed lips and incisors (3×)</option>
          <option value="jaw-neck">Jaw-to-neck attachment (2.4×)</option>
          <option value="hair-left">Left rooted hair (2.15×)</option>
          <option value="hair-right">Right rooted hair (2.15×)</option>
        </select>
      </label>
    </div>
  </section>;
}
export const Cc0RegisteredFullFace:Story={
  name:"CC0 full face · source-registered wax anatomy (ArtCraft experiment)",
  args:{aspect:"portrait",detail:1,startFrame:299,playbackRate:1,loop:false},
  render:args=><Cc0SourceRegisteredFaceWorkbench {...args}/>,
};
