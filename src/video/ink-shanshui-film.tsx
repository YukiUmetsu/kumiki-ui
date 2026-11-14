import {useMemo} from "react";
import type {CharacterCue,CharacterDefinition,CharacterInstance} from "../../registry/character/definition";
import {InkCharacter} from "../../registry/video/ink-wash-character-react";
import {bakeInkActorTrack,bakeInkWalkCorrections,inkRouteAt} from "../../registry/video/ink-actor-director";
import {bakeInkClothCorrections} from "../../registry/video/ink-figure-motion";
import {InkShanshuiStage} from "../../registry/video/ink-shanshui-react";
import {DEFAULT_SHANSHUI,SHANSHUI_FRAMES} from "../../registry/video/ink-shanshui";
import type {ShanshuiControls,ShanshuiScene} from "../../registry/video/ink-shanshui";
import {makeInkWalkingTraveller,inkDirectorGait} from "./ink-actor-director-demo";
import type {InkFigureCraftControls} from "../../registry/video/ink-figure-craft";
import {shanshuiFaceAssets} from "./ink-shanshui-face-plates";
import {
  shanshuiBodyFit,shanshuiBodyAssets,applyShanshuiBodyFit,
  shanshuiFittedRoute,bakeShanshuiGroundedShoes,
} from "./ink-shanshui-full-body";

/** A scene-specific portrait, not a replacement for the canonical walking rig.
 * Warm, longer nested robes and fluttering bands are original code-drawn assets.
 * Preserve real split knees, the instructor's face/visemes and body-pivot system.
 */
export function makeShanshuiScholar(
  detail=1,contrast=.9,scene:ShanshuiScene="mountain-trail",
):CharacterDefinition {
  const craft:InkFigureCraftControls={detail,contrast,seed:83};
  const base=makeInkWalkingTraveller(craft);
  // A single image-to-rig projection calibrates head, shoulder, elbow/cuff,
  // hands, torso, belt, hips, robe, hem and shoes in one coordinated pass.
  const artwork=shanshuiFaceAssets(scene);
  const completeBody=shanshuiBodyAssets(scene);
  const fittedParts=applyShanshuiBodyFit(scene,base.parts);
  return {
    ...base,characterId:"shanshui-scholar",
    revision:"shanshui-scholar-complete-figure-"+scene+"-v4",
    palette:{
      ...base.palette,ink:"#403329",shadow:"#66513e",wash:"#bd9d7b",
      mist:"#dfcaad",deep:"#937251",paper:"#f6ead4",
      skin:"#ddc3a5",skinshade:"#ad8d70",linen:"#d9c0a0",
      twine:"#9e7955",cinnabar:"#a24c3e",
    },
    assets:{
      ...base.assets,
      ...artwork,
      ...completeBody,
    },
    parts:[
      ...fittedParts,
      // Shoes are independent planted parts driven by exact projected foot
      // contact, not illustrations welded to the old short puppet shins.
      {id:"shoe-left",asset:"shoe-left",channel:"walk",
        pivot:shanshuiBodyFit(scene).anchors.leftFoot,z:4},
      {id:"shoe-right",asset:"shoe-right",channel:"walk",
        pivot:shanshuiBodyFit(scene).anchors.rightFoot,z:5},
      {id:"robe-opaque",asset:"scholar-opaque-ground",parent:"body",
        channel:"body",pivot:{x:133,y:188},z:9},
      {id:"robe-outer",asset:"scholar-robe-overlay",parent:"body",
        channel:"body",pivot:{x:136,y:204},z:11},
      {id:"hem-flow",asset:"scholar-flowing-hem",parent:"body",
        channel:"body",pivot:{x:141,y:270},z:11},
      {id:"sash-tail",asset:"scholar-sash",parent:"body",
        channel:"body",pivot:{x:144,y:222},z:14},
      {id:"hair-band",asset:"scholar-hair-band",parent:"head",
        channel:"head",pivot:{x:137,y:56},z:19},
      {id:"sleeve-paint",asset:"scholar-sleeve-contour",parent:"near-sleeve",
        channel:"arms",pivot:{x:190,y:211},z:18},
    ],
    capabilities:[...base.capabilities,"sepia-figure","outer-robe",
      "cloth-ribbon","teacher-measured-proportions",
      "full-figure-source-fit","world-planted-shoes","distinct-face-profiles"],
  };
}
export interface ShanshuiFilmProps {
  frame:number;
  controls?:ShanshuiControls;
  reducedMotion?:boolean;
  showScholar?:boolean;
  clothAmount?:number;
}
export function shanshuiScholarInstance(
  scene:ShanshuiScene,clothAmount=.72,
):CharacterInstance {
  if(!Number.isFinite(clothAmount)||clothAmount<0||clothAmount>1)
    throw new RangeError("Scholar cloth motion must be in 0..1.");
  const route=shanshuiFittedRoute(scene);
  const gait=inkDirectorGait("landscape");
  const fit=shanshuiBodyFit(scene);
  // Full-width two-foot contact is part of the same source morphology.
  // Larger safe leg reach is used below the garment, without inventing
  // reference knee points. The visible shoes have independently locked anchors.
  const plan={
    ...gait,route,startFrame:0,endFrame:154,
    cycleFrames:26,footLift:5.5,bodyBob:1.0,
    footSeparation:Math.abs(fit.anchors.rightFoot.x-fit.anchors.leftFoot.x)/2,
    hipHeight:65,upperLength:51,lowerLength:49,
    parts:{
      leftUpper:gait.parts.leftUpper,leftLower:gait.parts.leftLower,
      rightUpper:gait.parts.rightUpper,rightLower:gait.parts.rightLower,
      torso:"body",head:"head",
    },
  };
  const correctionTracks=bakeInkWalkCorrections(plan,2);
  const shoeCorrections=bakeShanshuiGroundedShoes(plan,fit,SHANSHUI_FRAMES-1);
  const cloth=bakeInkClothCorrections({
    route,endFrame:SHANSHUI_FRAMES-1,
    cycleFrames:26,amount:clothAmount,
    parts:{hem:"hem-drape",nearCuff:"near-cuff",farCuff:"far-cuff"},
  },3);
  const trailing=Array.from({length:76},(_,i)=>{
    const frame=Math.min(299,i*4);
    const vel=inkRouteAt(route,frame).vx;
    const gait=clamp01(Math.abs(vel)/1.8);
    return {frame,pose:{
      rotation:clothAmount===0?0:(-1.2-1.8*Math.sin(frame*.12))*gait*clothAmount,
      x:clothAmount===0?0:-2*Math.sin(frame*.09)*gait*clothAmount,
    }};
  });
  return {
    instanceId:route.instanceId,characterId:"shanshui-scholar",
    revision:"shanshui-scholar-complete-figure-"+scene+"-v4",seed:113,
    targets:{landscape:{x:16,y:77},viewer:{x:176,y:90}},
    corrections:{...correctionTracks,...shoeCorrections,...cloth,
      "sash-tail":trailing,"hem-flow":trailing},
  };
}
const clamp01=(n:number)=>Math.max(0,Math.min(1,n));
const cues=(scene:ShanshuiScene):CharacterCue[]=>[
  {id:scene+"-look",kind:"gaze",target:"landscape",startFrame:43,
    endFrame:240,instanceId:"shanshui-scholar"},
  {id:scene+"-contemplate",kind:"action",name:"ponder",startFrame:148,
    instanceId:"shanshui-scholar"},
  {id:scene+"-attention",kind:"expression",name:"attentive",
    startFrame:151,endFrame:284,instanceId:"shanshui-scholar"},
  {id:scene+"-bow",kind:"action",name:"bow",startFrame:247,
    instanceId:"shanshui-scholar"},
];
/** Render in the same absolute film frame as leaves, bird, water and camera.
 * All artwork is native SVG/DOM; no rasterized AI scenery or CSS video playback.
 */
export function InkShanshuiFilm({frame,controls=DEFAULT_SHANSHUI,
  reducedMotion=false,showScholar=true,clothAmount=.72}:ShanshuiFilmProps){
  const definition=useMemo(()=>makeShanshuiScholar(controls.detail,.9,controls.scene),
    [controls.detail,controls.scene]);
  const instance=useMemo(()=>shanshuiScholarInstance(controls.scene,clothAmount),
    [controls.scene,clothAmount]);
  const route=useMemo(()=>shanshuiFittedRoute(controls.scene),[controls.scene]);
  const track=useMemo(()=>bakeInkActorTrack(route),[route]);
  const performance=useMemo(()=>cues(controls.scene),[controls.scene]);
  return <InkShanshuiStage frame={frame} controls={controls}
    reducedMotion={reducedMotion}>
    {showScholar&&<InkCharacter definition={definition} instance={instance}
      cues={performance} frame={frame} track={track}
      label="An original sepia ink scholar with planted feet and layered flowing robes"
      reducedMotion={reducedMotion} absorption={.72} grain={.63}
      partFinish={{
        body:{bleed:.76},"robe-outer":{bleed:.88},"hem-flow":{bleed:.72},
        "sash-tail":{bleed:.67},"sleeve-paint":{bleed:.32},
        "far-sleeve":{bleed:.7},"near-sleeve":{bleed:.65},
        head:{bleed:.09,dryContour:true},hair:{bleed:.18,dryContour:true},
        "hair-band":{bleed:.24},
        eyes:{bleed:0,dryContour:true},"pupil-left":{bleed:0,dryContour:true},
        "pupil-right":{bleed:0,dryContour:true},
        mouth:{bleed:0,dryContour:true},brows:{bleed:0,dryContour:true},
        "near-hand":{bleed:.06,dryContour:true},"far-hand":{bleed:.06,dryContour:true},
        "shoe-left":{bleed:.08,dryContour:true},"shoe-right":{bleed:.08,dryContour:true},
        scroll:{bleed:.19,dryContour:true},
      }}/>}
  </InkShanshuiStage>;
}
