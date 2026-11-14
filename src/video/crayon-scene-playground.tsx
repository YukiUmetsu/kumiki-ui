import { useMemo } from "react";
import { CrayonScene } from "../../registry/video/materials/crayon-scene-react";
import { crayonDemoScene } from "./crayon-scene-fixtures";
import { crayonPerformanceScene } from "./crayon-performance-fixtures";
import { crayonWildlifePortraitScene } from "./crayon-wildlife-portrait-fixtures";
import { crayonWalkScene } from "./crayon-walk-fixtures";
import { crayonCharacterDrawScene } from "./crayon-character-draw-fixtures";
import { crayonDragonVillageScene } from "./crayon-dragon-village-fixtures";
import { useCrayonStoryPlayback } from "./crayon-story-playback";
import type { CrayonDemoAspect, CrayonDemoSubject } from "./crayon-scene-fixtures";
import type { CrayonElement, CrayonSceneSpec } from "../../registry/video/materials/crayon-scene";

export interface PlaygroundProps {
  subject:CrayonDemoSubject | "performance" | "walk" | "draw-in" | "dragon-village" | "wildlife-portrait"; aspect:CrayonDemoAspect;
  /** Source materials remain unchanged unless an explicit Storybook experiment is requested. */
  paperRecipe:"authored"|"custom"; seed:number; paperTooth:number;
  reducedMotion:boolean; startFrame:number; stride:number; stepLift:number; rig:"drawn"|"ik";
  playbackRate:number; loop:boolean;
  drawOrder:"outline-first"|"fill-first"; outlineFraction:number; waxGlaze:number;
  wingPower:number; villageDetail:number; followThrough:number;
  redrawStrength:number; exposureFrames:2|3|4|5|6;
  cast:"duo"|"trio"; dragonPalette:"teal"|"copper"|"plum";
  shot:"wide"|"dragon"|"architecture";
  /** "authored" preserves each wax region\'s original material recipe. */
  nibStyle:"authored"|"tapered"|"rounded";
  strokeOrder:"authored"|"patches"|"scanline";
  markLength:"authored"|"long"|"short";
  editorialDetail:number;
  wildlifeDetail:number; wildlifeEarMotion:number; wildlifeCrop:"composition"|"eye"|"fur"|"muzzle"|"ear";
}
/**
 * Source paper settings are part of a film's visual identity. Only an explicit
 * experiment may replace them; the production scene is never mutated.
 */
export function crayonPreviewPaperOverrides(
  controls:Pick<PlaygroundProps,"paperRecipe"|"seed"|"paperTooth">,
):Partial<Pick<CrayonSceneSpec,"seed"|"paperTooth">> {
  if(controls.paperRecipe==="authored") return {};
  if(controls.paperRecipe!=="custom"||
     !Number.isSafeInteger(controls.seed)||
     !Number.isFinite(controls.paperTooth)||
     controls.paperTooth<0||controls.paperTooth>1)
    throw new RangeError("Invalid custom Crayon paper recipe");
  return {seed:controls.seed,paperTooth:controls.paperTooth};
}

/** Storybook-only material overrides. Unchanged authoring wins by default. */
export function applyCrayonStudyWaxSettings(
  node:CrayonElement,
  controls:Pick<PlaygroundProps,"nibStyle"|"strokeOrder"|"markLength">,
):CrayonElement {
  if(node.kind!=="wax") return node;
  const {nibStyle,strokeOrder,markLength}=controls;
  if(nibStyle==="authored"&&strokeOrder==="authored"&&markLength==="authored") return node;
  return {...node,
    ...(nibStyle==="authored"?{}:{nibStyle}),
    ...(strokeOrder==="authored"?{}:{strokeOrder}),
    ...(markLength==="authored"?{}:{markLength}),
  };
}
export function CrayonPlayground({subject,aspect,paperRecipe,seed,paperTooth,reducedMotion,startFrame,stride,stepLift,rig,playbackRate,loop,drawOrder,outlineFraction,waxGlaze,wingPower,villageDetail,followThrough,cast,dragonPalette,shot,redrawStrength,exposureFrames,nibStyle,strokeOrder,markLength,editorialDetail,wildlifeDetail,wildlifeEarMotion,wildlifeCrop}:PlaygroundProps){
  const spec=useMemo(()=>{
    const base=subject==="performance"?crayonPerformanceScene(aspect,{editorialDetail}):
      subject==="walk"?crayonWalkScene(aspect,{stride,lift:stepLift,rig}):
      subject==="draw-in"?crayonCharacterDrawScene(aspect,{order:drawOrder,outlineFraction,glaze:waxGlaze}):
      subject==="dragon-village"?crayonDragonVillageScene(aspect,{wingPower,detail:villageDetail,followThrough,cast,palette:dragonPalette,shot,redrawStrength,exposureFrames}):
      subject==="wildlife-portrait"?crayonWildlifePortraitScene(aspect,{detail:wildlifeDetail,earMotion:wildlifeEarMotion}):
      crayonDemoScene(subject,aspect);
    // Production source remains unmodified. Optional Storybook macro shots
    // inspect authentic rendered eye and fur strokes at 2.3-3x enlargement.
    // The same absolute-frame rig, pigment and geometry are used in export.
    const close = subject==="wildlife-portrait" && wildlifeCrop!=="composition";
    const ox=aspect==="portrait"?340:676,oy=aspect==="portrait"?599:357;
    const rootScale=.98;
    const target=wildlifeCrop==="eye"?{x:-56,y:-57,zoom:3.35}:
      wildlifeCrop==="muzzle"?{x:-179,y:-2,zoom:3.0}:
      wildlifeCrop==="ear"?{x:109,y:-222,zoom:2.15}:
      {x:-58,y:27,zoom:2.55};
    const focusX=ox+rootScale*target.x;
    const focusY=oy+rootScale*target.y;
    const zoom=target.zoom;
    const camera=close ? [
      {frame:0,focusX,focusY,zoom},
      {frame:base.durationFrames-1,focusX,focusY,zoom},
    ] : base.camera;
    // Macro inspections should not hide the artwork under editorial title
    // overlays. Filtering screen-space copy is preview-only: film export
    // preserves the complete authored source illustration.
    const elements=(close?base.elements.filter(node=>!node.screenSpace):
      base.elements).map(node=>applyCrayonStudyWaxSettings(
        node,{nibStyle,strokeOrder,markLength}));
    return {...base,...crayonPreviewPaperOverrides({paperRecipe,seed,paperTooth}),camera,elements};
  },[subject,aspect,paperRecipe,seed,paperTooth,stride,stepLift,rig,drawOrder,outlineFraction,waxGlaze,wingPower,villageDetail,followThrough,cast,dragonPalette,shot,redrawStrength,exposureFrames,nibStyle,strokeOrder,markLength,editorialDetail,wildlifeDetail,wildlifeEarMotion,wildlifeCrop]);
  const {frame,playing,seek,restart,toggle}=useCrayonStoryPlayback(
    startFrame,spec.durationFrames,subject+":"+aspect,playbackRate,loop);
  const duration=spec.durationFrames-1;
  const beats:readonly (readonly [number,string])[]=subject==="wildlife-portrait" ?
    [[0,"Paper"],[32,"First mass"],[82,"Eye & ear"],[137,"Fur grain"],[197,"Portrait"],[239,"Final artwork"]] : subject==="dragon-village" ?
    [[0,"Paper"],[58,"Towers rise"],[112,"Dragon arrives"],[155,"Wings unfurl"],[207,"Dragon reacts"],[260,"Friends answer"],[329,"Final pose"]] : subject==="draw-in" ?
    [[0,"Blank paper"],[48,"Sketch guides"],[146,"First outlines"],[190,"Wax colour"],[280,"Layered shading"],[343,"Face details"],[400,"Drawing moves"],[449,"Complete"]] : subject==="walk" ?
    [[0,"Ready"],[38,"Back-foot lift"],[44,"Contact release"],[94,"Back-foot plant"],[124,"Front-foot swing"],[156,"Front-foot plant"],[214,"Final plant"],[269,"Rest"]] : subject==="performance" ?
    [[0,"Paper"],[70,"Anticipation"],[90,"Speech begins"],[118,"Viseme change"],[176,"Smile"],[269,"Final pose"]] :
    [[0,"Blank paper"],[72,"First wax"],[145,"Illustration builds"],[239,"Finished page"]];
  return <div style={{maxWidth:1050,margin:"auto",padding:22,background:"#e9e3d5",color:"#344e60",fontFamily:"system-ui"}}>
    <div style={{display:"flex",gap:12,justifyContent:"space-between",alignItems:"flex-end",flexWrap:"wrap",marginBottom:12}}>
      <div><div style={{fontSize:12,letterSpacing:2.8,fontWeight:700,textTransform:"uppercase"}}>Crayon scene engine · JSON-native</div>
        <div style={{font:"700 28px Georgia,serif",marginTop:8}}>{subject==="wildlife-portrait"?"The Wild Hare / Field Biology":subject==="dragon-village"?"The Dragon & The Village":subject==="draw-in"?"First a Line, Then a Life":subject==="walk"?(rig==="ik"?"The Knee & The Step":"A Little Journey"):subject==="performance"?"After the Rain":subject==="water-cycle"?"Where Rain Begins":subject==="city"?"Our Little Town":"How Things Grow"}</div></div>
      <div style={{fontSize:13,color:"#586b72"}}>{subject==="wildlife-portrait"?"Naturalistic wildlife anatomy · 30 fps · 8 seconds":subject==="dragon-village"?"Three character rigs · castle & village · 30 fps · 11 seconds":subject==="draw-in"?"Guides → contours → wax → acting · 30 fps · 15 seconds":subject==="performance"?"Acting exposure sheet · 30 fps · 9 seconds":subject==="walk"?(rig==="ik"?"Two-bone IK · rolling feet · 30 fps":"Contact-locked walk cycle · 30 fps · 9 seconds"):"Story-independent drawing · 30 fps · 8 seconds"}</div>
    </div>
    <div style={{width:aspect==="portrait"?"min(100%,440px)":"100%",aspectRatio:aspect==="portrait"?"540/960":"960/540",
      margin:"0 auto",border:"10px solid #fff7e8",background:"#fff7e8",boxSizing:"border-box",boxShadow:"0 12px 28px #3e4d5c26"}}>
      <CrayonScene frame={frame} spec={spec} reducedMotion={reducedMotion}/>
    </div>
    <div style={{display:"flex",alignItems:"center",flexWrap:"wrap",gap:10,marginTop:20}}>
      <button type="button" aria-label={playing?"Pause animation":"Play animation"} onClick={toggle}
        style={{cursor:"pointer",background:"#3c5872",border:0,color:"#fff",padding:"12px 21px",borderRadius:8,fontWeight:700}}>{playing?"Pause":"Play film"}</button>
      <button type="button" onClick={restart} style={{cursor:"pointer",
        background:"#fff9ef",padding:"12px 17px",border:"1px solid #bdb3a4",borderRadius:8}}>Restart</button>
      <label style={{display:"flex",flex:"1 1 200px",alignItems:"center",gap:10}}>
        Frame <input type="range" aria-label="Film frame" style={{width:"100%",accentColor:"#b86e59"}}
          min={0} max={duration} value={frame} onChange={e=>seek(Number(e.target.value))}/>
        <output style={{fontVariantNumeric:"tabular-nums",minWidth:35}}>{frame}</output>
      </label>
    </div>
    <nav aria-label="Drawing beats" style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:14}}>
      {beats.map(([at,label])=>
        <button key={at} onClick={()=>seek(Number(at))} type="button"
          style={{cursor:"pointer",padding:"8px 13px",background:"#fff9ef",border:"1px solid #c1b9a9",borderRadius:24}}>
          {label}</button>)}
    </nav>
    <p style={{fontSize:13,color:"#5f6f75",lineHeight:1.5,marginBottom:0,marginTop:15}}>
      {subject==="wildlife-portrait"?
        "ArtCraft wildlife study: inspect the connected muzzle, orbital planes, ear cartilage and directional wax fur at full composition or in a real-renderer macro crop. Scrub through blink and ear poses to check continuity and opaque pigment.":
        subject==="dragon-village"?
        "ArtCraft creature and architecture study: inspect silhouettes, wing articulation, overlapping characters and coherent masonry. Compare wide and detail shots before approving a full film.":
        subject==="draw-in"?
        "Study the authentic drawing sequence: guidelines, outlines, wax coverage and animation must arrive in authored order. Scrub backward to verify that later marks do not leak into earlier frames.":
        subject==="walk"?
        "Inspect weight, ground contacts and silhouette deformation. Compare contact-locked drawn poses with two-bone IK and review foot plants on every beat.":
        subject==="performance"?
        "Inspect eyebrow, eye, hand and mouth acting cues as held source drawings. Compare expression transitions and meaningful follow-through.":
        "Inspect the authored illustration's hierarchy, wax-material deposits, paper grain and absolute-frame construction rather than substituting a uniform digital filter."}
      {" Wax and paper remain configurable, but their authored source settings are the default. Set Paper recipe to 'custom' to enable a seed/tooth experiment, or change nib, stroke order or mark length to compare wax treatments. The production scene and film clock remain unchanged."}
    </p>
  </div>;
}
