import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { CrayonScene } from "../../registry/video/materials/crayon-scene-react";
import { crayonDemoScene } from "./crayon-scene-fixtures";
import { crayonPerformanceScene } from "./crayon-performance-fixtures";
import { crayonWildlifePortraitScene } from "./crayon-wildlife-portrait-fixtures";
import { crayonWalkScene } from "./crayon-walk-fixtures";
import { crayonCharacterDrawScene } from "./crayon-character-draw-fixtures";
import { crayonDragonVillageScene } from "./crayon-dragon-village-fixtures";
import { useCrayonStoryPlayback } from "./crayon-story-playback";
import type { CrayonDemoAspect, CrayonDemoSubject } from "./crayon-scene-fixtures";

interface PlaygroundProps {
  subject:CrayonDemoSubject | "performance" | "walk" | "draw-in" | "dragon-village" | "wildlife-portrait"; aspect:CrayonDemoAspect; seed:number; paperTooth:number;
  reducedMotion:boolean; startFrame:number; stride:number; stepLift:number; rig:"drawn"|"ik";
  playbackRate:number; loop:boolean;
  drawOrder:"outline-first"|"fill-first"; outlineFraction:number; waxGlaze:number;
  wingPower:number; villageDetail:number; followThrough:number;
  redrawStrength:number; exposureFrames:2|3|4|5|6;
  cast:"duo"|"trio"; dragonPalette:"teal"|"copper"|"plum";
  shot:"wide"|"dragon"|"architecture";
  nibStyle:"tapered"|"rounded";
  strokeOrder:"patches"|"scanline";
  markLength:"long"|"short";
  editorialDetail:number;
  wildlifeDetail:number; wildlifeEarMotion:number; wildlifeCrop:"composition"|"eye"|"fur"|"muzzle"|"ear";
}
function CrayonPlayground({subject,aspect,seed,paperTooth,reducedMotion,startFrame,stride,stepLift,rig,playbackRate,loop,drawOrder,outlineFraction,waxGlaze,wingPower,villageDetail,followThrough,cast,dragonPalette,shot,redrawStrength,exposureFrames,nibStyle,strokeOrder,markLength,editorialDetail,wildlifeDetail,wildlifeEarMotion,wildlifeCrop}:PlaygroundProps){
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
      base.elements).map(node=>
      node.kind==="wax"?{...node,nibStyle,strokeOrder,markLength}:node);
    return {...base,seed,paperTooth,camera,elements};
  },[subject,aspect,seed,paperTooth,stride,stepLift,rig,drawOrder,outlineFraction,waxGlaze,wingPower,villageDetail,followThrough,cast,dragonPalette,shot,redrawStrength,exposureFrames,nibStyle,strokeOrder,markLength,editorialDetail,wildlifeDetail,wildlifeEarMotion,wildlifeCrop]);
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
      The Crayon folder keeps all Film Looks showcases together. Character and foreground pigment uses opaque wax underpainting; skies stay an airy, open scumble. Opaque buildup is drawn progressively and retains its directional wax texture. Dragon Village shows a three-actor rigged dragon and two forest animals, with expressive wing, tail, jaw, eye and squash-and-stretch motion plus detailed modular architecture. Draw-In shows original character construction with penciled guides, individually traced wax contours, staged hatching and final acting. Walk Cycle demonstrates pinned steps with foot-roll and smooth release; change stride, lift and rig to compare drawn knees against analytical two-bone joints. Playback is wall-clock synchronized with speed and looping controls. Character Performance demonstrates expression cues. Scrub in either direction.
      Original subjects, paths, captions, contact/acting cues and camera are supplied as scene data, not built into the renderer.
    </p>
  </div>;
}
const meta={
  title:"Video production/Film Looks/Crayon/Scene Engine",
  id:"video-crayon-scene-engine",
  component:CrayonPlayground,
  args:{subject:"water-cycle",aspect:"landscape",seed:54,paperTooth:.64,reducedMotion:false,startFrame:239,stride:1,stepLift:1,rig:"drawn",playbackRate:1.2,loop:false,drawOrder:"outline-first",outlineFraction:.31,waxGlaze:.17,wingPower:1,villageDetail:.85,followThrough:7,cast:"trio",dragonPalette:"teal",shot:"wide",redrawStrength:.68,exposureFrames:3,nibStyle:"tapered",strokeOrder:"patches",markLength:"long",editorialDetail:1,wildlifeDetail:1,wildlifeEarMotion:1,wildlifeCrop:"composition"},
  argTypes:{
    subject:{control:"inline-radio",options:["water-cycle","city","numbers","performance","walk","draw-in","dragon-village","wildlife-portrait"]},
    aspect:{control:"inline-radio",options:["landscape","portrait"]},
    seed:{control:{type:"number",min:0,max:10000,step:1}},
    paperTooth:{control:{type:"range",min:0,max:1,step:.05}},
    nibStyle:{control:"inline-radio",options:["tapered","rounded"]},
    strokeOrder:{control:"inline-radio",options:["patches","scanline"]},
    markLength:{control:"inline-radio",options:["long","short"]},
    editorialDetail:{control:{type:"range",min:0,max:1,step:.1}},
    wildlifeDetail:{control:{type:"range",min:0,max:1,step:.1}},
    wildlifeEarMotion:{control:{type:"range",min:0,max:2,step:.1}},
    wildlifeCrop:{control:"inline-radio",options:["composition","eye","fur","muzzle","ear"]},
    stride:{control:{type:"range",min:.6,max:1.6,step:.1}},
    stepLift:{control:{type:"range",min:.6,max:1.8,step:.1}},
    rig:{control:"inline-radio",options:["drawn","ik"]},
    drawOrder:{control:"inline-radio",options:["outline-first","fill-first"]},
    outlineFraction:{control:{type:"range",min:.1,max:.75,step:.05}},
    waxGlaze:{control:{type:"range",min:0,max:.45,step:.03}},
    wingPower:{control:{type:"range",min:.5,max:1.6,step:.1}},
    villageDetail:{control:{type:"range",min:.25,max:1,step:.05}},
    followThrough:{control:{type:"range",min:0,max:18,step:1}},
    redrawStrength:{control:{type:"range",min:0,max:1,step:.05}},
    exposureFrames:{control:"inline-radio",options:[2,3,4,5,6]},
    cast:{control:"inline-radio",options:["duo","trio"]},
    dragonPalette:{control:"inline-radio",options:["teal","copper","plum"]},
    shot:{control:"inline-radio",options:["wide","dragon","architecture"]},
    playbackRate:{control:{type:"range",min:.25,max:2,step:.25}},
    loop:{control:"boolean"},
    reducedMotion:{control:"boolean"},
    startFrame:{control:{type:"range",min:0,max:449,step:1}},
  }
} satisfies Meta<typeof CrayonPlayground>;
export default meta;
type Story=StoryObj<typeof meta>;
export const WaterCycle:Story={};
export const WaterCyclePortrait:Story={args:{aspect:"portrait",startFrame:239}};
export const StorybookTown:Story={args:{subject:"city",startFrame:239}};
export const IllustratedData:Story={args:{subject:"numbers",startFrame:239}};
export const CharacterPerformance:Story={args:{subject:"performance",startFrame:176}};
export const CharacterPerformancePortrait:Story={args:{subject:"performance",aspect:"portrait",startFrame:176}};
export const CharacterWalkCycle:Story={args:{subject:"walk",startFrame:156}};
export const CharacterWalkPortrait:Story={args:{subject:"walk",aspect:"portrait",startFrame:156}};
export const CharacterTwoBoneIK:Story={args:{subject:"walk",rig:"ik",stride:1.15,stepLift:1.35,startFrame:124}};
export const CharacterTwoBoneIKPortrait:Story={args:{subject:"walk",rig:"ik",aspect:"portrait",stride:1.1,stepLift:1.35,startFrame:124}};
export const CharacterDrawIn:Story={args:{subject:"draw-in",startFrame:190}};
export const CharacterDrawInPortrait:Story={args:{subject:"draw-in",aspect:"portrait",startFrame:280}};

export const DragonVillage:Story={args:{subject:"dragon-village",startFrame:155}};
export const DragonVillagePortrait:Story={args:{subject:"dragon-village",aspect:"portrait",startFrame:207}};
export const DragonVillageDuo:Story={args:{subject:"dragon-village",cast:"duo",dragonPalette:"copper",startFrame:260}};
export const DragonAnatomyDetail:Story={args:{subject:"dragon-village",shot:"dragon",villageDetail:1,startFrame:241}};
export const DragonAnatomyDetailPortrait:Story={args:{subject:"dragon-village",shot:"dragon",villageDetail:1,aspect:"portrait",startFrame:241}};
export const CastleMasonryDetail:Story={args:{subject:"dragon-village",shot:"architecture",villageDetail:1,startFrame:241}};
export const DragonHandRedraw:Story={args:{subject:"dragon-village",shot:"dragon",redrawStrength:1,exposureFrames:2,startFrame:221}};
export const DragonWingMorph:Story={args:{subject:"dragon-village",shot:"dragon",wingPower:1.3,redrawStrength:.82,exposureFrames:3,startFrame:182}};

/** Non-mascot, mature wildlife acting with authored proportional masses. */
export const WildlifeHarePortrait:Story={
  args:{subject:"wildlife-portrait",aspect:"landscape",startFrame:198,
    wildlifeDetail:1,wildlifeEarMotion:1,paperTooth:.69},
};
export const WildlifeHarePortraitVertical:Story={
  args:{subject:"wildlife-portrait",aspect:"portrait",startFrame:198,
    wildlifeDetail:1,wildlifeEarMotion:1,paperTooth:.69},
};

/** True engine-magnified shots: no separate raster illustrations. */
export const WildlifeHareEyeMacro:Story={
  args:{subject:"wildlife-portrait",aspect:"landscape",
    startFrame:224,wildlifeCrop:"eye",wildlifeDetail:1,
    wildlifeEarMotion:1,paperTooth:.69},
};
export const WildlifeHareFurMacro:Story={
  args:{subject:"wildlife-portrait",aspect:"landscape",
    startFrame:224,wildlifeCrop:"fur",wildlifeDetail:1,
    wildlifeEarMotion:1,paperTooth:.69},
};

/** ArtCraft anatomy gates at the final native SVG renderer: no image swaps. */
export const WildlifeHareMuzzleMacro:Story={
  args:{subject:"wildlife-portrait",aspect:"landscape",startFrame:224,
    wildlifeCrop:"muzzle",wildlifeDetail:1,wildlifeEarMotion:1,paperTooth:.69},
};
export const WildlifeHareEarMacro:Story={
  args:{subject:"wildlife-portrait",aspect:"landscape",startFrame:224,
    wildlifeCrop:"ear",wildlifeDetail:1,wildlifeEarMotion:1,paperTooth:.69},
};
