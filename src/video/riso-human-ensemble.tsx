import {useEffect,useMemo,useState} from "react";
import {evaluateRisoCharacter} from "../../registry/video/riso-character";
import type {RisoCharacterPart,RisoCharacterSpec,RisoJoint} from "../../registry/video/riso-character";
import {RisoCharacterInk,RisoCharacterKnockout} from "../../registry/video/riso-character-react";
import {RisoPrint} from "../../registry/video/print-plates-react";
import {RisoTransferSheetPlate,evaluateRisoTransferSheet} from "../../registry/video/riso-transfer-sheet";
import type {RisoTransferSheetOptions} from "../../registry/video/riso-transfer-sheet";
import {evaluateRisoPropHandoff,RISO_HANDOFF_DEFAULTS} from "../../registry/video/riso-prop-handoff";
import type {RisoHandoffSchedule} from "../../registry/video/riso-prop-handoff";
import type {RisoForegroundLayer} from "../../registry/video/print-plates-react";
import type {RisoPrintSpec} from "../../registry/video/print-plates";
import type {RisoCharacterMeshSheet,RisoMeshCategory} from "../../registry/video/riso-proportion-mesh";
import {COURIER} from "./riso-character-demo";

/** RISO14: a second authored human, not a color-inverted Courier.
 * Reuse a mechanically compatible limb/digit rig, not the Courier face, hair,
 * jacket silhouette, color hierarchy, or headwear. No third-party art assets.
 */
const take=(id:string,ink?: "blue"|"red"):RisoCharacterPart=>{
  const p=COURIER.parts.find(part=>part.id===id);
  if(!p)throw new Error("RISO14: missing shared articulated contour "+id);
  return {...p,plate:ink??p.plate};
};
const staticLeg=(j:RisoJoint):RisoJoint=>{
  if(j.id==="root")return {...j,keys:[
    {frame:0,x:0,y:0,easing:"ease"},
    {frame:110,x:-8,y:0,easing:"ease"},
    {frame:160,x:-12,y:-3,easing:"ease"},
    {frame:198,x:-13,y:0,easing:"ease"},
    {frame:239,x:-13,y:0},
  ]};
  if(j.id==="body")return {...j,keys:[
    {frame:0,rotate:0,y:0,easing:"ease"},
    {frame:90,rotate:-2,y:-1,easing:"ease"},
    {frame:160,rotate:2,y:-3,easing:"ease"},
    {frame:198,rotate:0,y:0,easing:"ease"},
    {frame:239,rotate:0,y:0},
  ]};
  if(j.id==="head")return {...j,keys:[
    {frame:0,rotate:3,easing:"ease"},
    {frame:110,rotate:-4,easing:"ease"},
    {frame:160,rotate:-7,easing:"ease"},
    {frame:198,rotate:1,easing:"ease"},
    {frame:239,rotate:1},
  ]};
  if(j.id==="left-arm")return {...j,keys:[
    {frame:0,rotate:18,easing:"ease"},
    {frame:95,rotate:-10,easing:"ease"},
    {frame:150,rotate:-42,easing:"ease"},
    {frame:205,rotate:-22,easing:"ease"},
    {frame:239,rotate:-22},
  ]};
  if(j.id==="left-elbow")return {...j,keys:[
    {frame:0,rotate:-8,easing:"ease"},
    {frame:130,rotate:-38,easing:"ease"},
    {frame:170,rotate:-52,easing:"ease"},
    {frame:239,rotate:-35},
  ]};
  if(j.id==="right-arm")return {...j,keys:[
    {frame:0,rotate:-9,easing:"ease"},
    {frame:120,rotate:8,easing:"ease"},
    {frame:198,rotate:-15,easing:"ease"},
    {frame:239,rotate:-15},
  ]};
  if(j.id==="right-elbow")return {...j,keys:[
    {frame:0,rotate:9,easing:"ease"},
    {frame:120,rotate:24,easing:"ease"},
    {frame:198,rotate:6,easing:"ease"},
    {frame:239,rotate:6},
  ]};
  if(j.id==="left-leg"||j.id==="right-leg")return {...j,keys:[
    {frame:0,rotate:0},{frame:239,rotate:0},
  ]};
  return {...j};
};
const coatPieces:readonly RisoCharacterPart[]=[
  {id:"coat",joint:"body",plate:"red",paint:"solid",
    d:"M-24 -56 C-18 -66 -7 -70 6 -66 Q22 -64 26 -52 Q24 -34 23 -17 Q31 0 35 24 Q15 30 -1 25 Q-18 30 -35 23 Q-29 3 -27 -19 Q-29 -41 -24 -56 Z"},
  {id:"coat-lapel-left",joint:"body",plate:"blue",paint:"solid",
    d:"M-21 -58 Q-12 -66 -4 -64 L-8 -49 Q-14 -43 -17 -35 Q-23 -46 -21 -58 Z"},
  {id:"coat-lapel-right",joint:"body",plate:"blue",paint:"solid",
    d:"M7 -63 Q18 -65 24 -56 Q23 -46 17 -36 Q14 -46 8 -49 Z"},
  {id:"coat-waist-pleats",joint:"body",plate:"blue",paint:"screen",
    d:"M-24 -12 C-20 -4 -19 6 -14 17 Q-20 12 -23 -3 Z M18 -16 Q18 0 28 18 Q21 13 19 6 Z M-2 -9 Q4 4 6 21 L3 22 Q0 6 -2 -9 Z"},
  {id:"coat-bottom-binding",joint:"body",plate:"blue",paint:"screen",
    d:"M-31 18 Q-2 30 30 19 L34 24 Q0 35 -34 23 Z"},
  {id:"coat-breast-pocket",joint:"body",plate:"blue",paint:"solid",
    d:"M12 -28 Q20 -31 23 -27 L22 -25 Q16 -28 12 -26 Z"},
  {id:"scarf",joint:"body",plate:"blue",paint:"solid",
    d:"M-9 -70 Q0 -75 10 -69 Q17 -61 13 -56 Q1 -59 -11 -57 Z M6 -58 Q17 -49 10 -32 L6 -35 Q9 -48 3 -57 Z"},
  {id:"neck",joint:"body",plate:"blue",paint:"solid",
    d:"M-8 -82 Q0 -85 8 -82 L9 -62 Q1 -58 -8 -62 Z"},
];
const facePieces:readonly RisoCharacterPart[]=[
  {id:"hair-back",joint:"head",plate:"blue",paint:"solid",
    d:"M-38 -29 C-45 -57 -30 -74 -8 -74 Q15 -81 33 -65 Q46 -53 40 -26 Q46 -4 36 21 Q27 26 24 13 Q34 -5 27 -29 Q22 -46 11 -52 Q-17 -57 -28 -35 Q-29 -8 -26 11 Q-31 23 -40 13 Q-46 2 -38 -29 Z"},
  {id:"face",joint:"head",plate:"blue",paint:"solid",knockoutOnly:true,
    d:"M-29 -38 C-26 -54 -12 -59 5 -56 Q26 -54 30 -35 Q34 -12 25 11 Q16 29 -2 31 Q-23 26 -30 8 Q-34 -10 -29 -38 Z"},
  {id:"ear-left",joint:"head",plate:"blue",paint:"solid",
    d:"M-28 -11 Q-36 -16 -37 -7 Q-38 3 -30 7 L-28 4 Q-35 0 -33 -6 Q-31 -9 -28 -7 Z"},
  {id:"face-outline",joint:"head",plate:"blue",paint:"solid",
    d:"M-29 -37 C-27 -51 -14 -58 2 -57 Q23 -56 29 -37 Q35 -13 26 11 C21 24 6 32 -5 30 Q-25 24 -30 8 L-27 7 Q-24 23 -4 27 C10 29 20 18 23 8 Q31 -12 26 -34 Q23 -51 2 -53 Q-17 -55 -25 -34 Z"},
  {id:"temple-tones",joint:"head",plate:"red",paint:"screen",
    d:"M-24 -25 C-29 -12 -28 -2 -21 10 Q-29 3 -29 -9 Z M22 -26 Q30 -14 25 0 Q25 -10 22 -26 Z"},
  {id:"brow-left",joint:"head",plate:"blue",paint:"solid",
    d:"M-23 -18 Q-16 -24 -8 -20 L-9 -18 Q-17 -21 -22 -16 Z",
    expressions:{blink:"M-23 -16 Q-16 -21 -8 -18 L-9 -16 Q-17 -19 -23 -15 Z",
      smile:"M-23 -20 Q-16 -26 -8 -21 L-9 -19 Q-17 -24 -22 -18 Z"}},
  {id:"brow-right",joint:"head",plate:"blue",paint:"solid",
    d:"M7 -20 Q16 -26 24 -19 L23 -16 Q16 -22 8 -17 Z",
    expressions:{blink:"M8 -18 Q17 -23 24 -18 L23 -16 Q16 -20 9 -16 Z",
      smile:"M8 -23 Q18 -29 25 -20 L24 -17 Q16 -25 9 -20 Z"}},
  {id:"eye-left",joint:"head",plate:"blue",paint:"solid",
    d:"M-23 -8 C-18 -13 -13 -14 -8 -9 L-9 -7 Q-15 -11 -22 -5 Z",
    expressions:{blink:"M-23 -7 Q-16 -4 -8 -8 L-9 -6 Q-16 -2 -23 -5 Z"}},
  {id:"eye-right",joint:"head",plate:"blue",paint:"solid",
    d:"M8 -10 Q17 -17 24 -10 L23 -7 Q16 -13 9 -7 Z",
    expressions:{blink:"M8 -9 Q16 -5 24 -9 L23 -7 Q16 -3 9 -7 Z"}},
  {id:"iris-left",joint:"head",plate:"blue",paint:"solid",
    d:"M-17 -8 Q-13 -11 -12 -7 Q-12 -3 -15 -3 Q-19 -5 -17 -8 Z",
    expressions:{blink:"M-17 -5 L-12 -5 L-12 -4 L-17 -4 Z"}},
  {id:"iris-right",joint:"head",plate:"blue",paint:"solid",
    d:"M15 -10 Q19 -12 20 -8 Q20 -4 17 -4 Q14 -6 15 -10 Z",
    expressions:{blink:"M15 -6 L20 -6 L20 -5 L15 -5 Z"}},
  {id:"nose-bridge",joint:"head",plate:"blue",paint:"solid",
    d:"M1 -12 Q4 -7 3 -1 Q0 5 3 7 Q6 9 9 6 L9 8 Q6 11 2 9 Q-2 7 0 3 Q2 -4 1 -12 Z"},
  {id:"cheek-tones",joint:"head",plate:"red",paint:"screen",
    d:"M-25 3 Q-20 0 -14 5 Q-20 3 -24 8 Z M17 4 Q24 3 27 10 Q23 7 18 8 Z"},
  {id:"mouth",joint:"head",plate:"red",paint:"solid",
    d:"M-7 15 Q0 18 7 13 L8 16 Q0 22 -7 18 Z",
    expressions:{speak:"M-6 13 Q0 8 6 14 Q8 21 1 23 Q-6 22 -6 13 Z",
      smile:"M-11 11 Q0 22 12 10 Q8 23 0 24 Q-7 23 -11 11 Z"}},
  {id:"lip-corners",joint:"head",plate:"blue",paint:"solid",
    d:"M-10 14 L-7 14 L-7 16 Z M8 12 L11 11 L9 15 Z",
    expressions:{speak:"M-8 12 L-5 10 L-6 14 Z M7 12 L10 13 L8 16 Z",
      smile:"M-13 10 Q-12 13 -10 15 L-11 15 Z M11 10 Q15 8 16 5 L15 11 Z"}},
  {id:"chin-tone",joint:"head",plate:"red",paint:"screen",
    d:"M-8 25 Q2 29 14 23 Q11 29 1 30 Z"},
  {id:"hair-fringe",joint:"head",plate:"blue",paint:"solid",
    d:"M-29 -40 Q-24 -58 -9 -60 Q12 -67 27 -51 Q29 -45 26 -37 Q20 -44 15 -48 Q13 -39 6 -36 Q8 -46 3 -49 Q-2 -39 -9 -35 Q-8 -46 -14 -48 Q-18 -36 -26 -34 Z"},
  {id:"hair-linework",joint:"head",plate:"red",paint:"screen",
    d:"M-29 -49 Q-24 -60 -9 -62 Q-21 -57 -27 -45 Z M8 -61 Q21 -57 28 -46 Q21 -52 8 -59 Z"},
];
const sharedLimbs=[
  "right-thigh","right-shin","right-boot","right-boot-detail",
  "left-thigh","left-shin","left-boot","left-boot-detail",
  "left-upper-sleeve","left-forearm","sleeve-left-fold","cuff-left",
  "left-glove","left-glove-index","left-glove-middle","left-glove-ring","left-glove-thumb",
  "left-glove-detail","left-glove-thumb-fold","left-finger-joint-lines",
  "right-upper-sleeve","right-forearm","sleeve-right-fold","cuff-right",
  "right-glove","right-glove-index","right-glove-middle","right-glove-ring","right-glove-thumb",
  "right-glove-detail","right-glove-thumb-fold","right-finger-joint-lines",
];
const legs=sharedLimbs.slice(0,8).map(id=>take(id));
const arms=sharedLimbs.slice(8).map(id=>take(id));
export const PAPER_ARTIST:RisoCharacterSpec={
  version:1,id:"paper-artist",durationFrames:240,cadence:2,
  joints:COURIER.joints.map(staticLeg),
  // Original full-body rest and gestures; no fake cross-person IK. Every hand
  // remains a child of a stable arm with independent articulated digits.
  ik:[],
  expressions:[{frame:0,name:"neutral"},{frame:76,name:"blink"},
    {frame:81,name:"neutral"},{frame:156,name:"speak"},
    {frame:180,name:"neutral"},{frame:198,name:"smile"}],
  parts:[...legs,...coatPieces,...arms,...facePieces],
};
function category(part:RisoCharacterPart):RisoMeshCategory{
  if(part.id.startsWith("hair"))return "hair";
  if(part.joint==="head")return "face";
  if(part.id.includes("boot"))return "foot";
  if(part.id.includes("thigh")||part.id.includes("shin"))return "leg";
  if(part.joint.endsWith("hand")||["thumb","index","middle","ring"].some(d=>part.joint.endsWith("-"+d)))return "hand";
  if(part.joint.includes("arm")||part.joint.includes("elbow"))return "arm";
  if(part.id==="scarf"||part.id.includes("pocket"))return "accessory";
  return "torso";
}
export const RISO_PAPER_ARTIST_SHEET:RisoCharacterMeshSheet={
  id:"paper-artist",label:"Paper Artist",view:"authored-2d",headRegion:"face",
  missingViews:["true-side","back","three-quarter","top"],
  poses:[{frame:46,label:"Studio waiting"},{frame:160,label:"Receiving printed sheet"},
    {frame:198,label:"Exchange finished"}],
  measurements:[
    {id:"interocular",label:"Left/right eye spacing",from:"eye-left",to:"eye-right"},
    {id:"nose-mouth",label:"Nasal bridge to mouth",from:"nose-bridge",to:"mouth"},
    {id:"thumb-index",label:"Grip opening",from:"left-glove-thumb",to:"left-glove-index"},
    {id:"shoulders",label:"Sleeve shoulder separation",from:"left-upper-sleeve",to:"right-upper-sleeve"},
  ],
  // Each region follows the actual named SVG contour and joint transform,
  // never a fabricated proportional rectangle or invented alternate view.
  regions:PAPER_ARTIST.parts.map(part=>({
    id:part.id,label:part.id.replace(/-/g," "),category:category(part),
    joint:part.joint,parts:[part.id],...(part.skin?{tipJoint:part.skin.tipJoint}:{}),
  })),
};
const paper="#FAEED9",blue="#255B8E",red="#D65641";
type EnsemblePlate="both"|"blue"|"red";
type EnsembleAspect="landscape"|"portrait";
const personPoint=(spec:RisoCharacterSpec,frame:number,joint:string,x:number,y:number,scale:number)=>{
  const pose=evaluateRisoCharacter(spec,frame).joints.find(j=>j.id===joint);
  if(!pose)throw new RangeError("Missing Riso ensemble contact point "+joint);
  return {x:x+pose.x*scale,y:y+pose.y*scale};
};
/**
 * Only original rigged finger/digit contours overprint the already-opaque
 * physical letter. The palms, sleeves, coats and faces stay behind the paper.
 * This is depth ordering, not a fake sticker or alpha-blended actor.
 */
const risoGripParts=(side:"left"|"right"):readonly string[]=>[
  side+"-glove-index",side+"-glove-middle",side+"-glove-ring",side+"-glove-thumb",
  side+"-finger-joint-lines",side+"-glove-detail",side+"-glove-thumb-fold",
];
/** Exact geometry for a prop between two authored hand contact anchors.
 * Stage space, including aspect and placements, must be computed once. */
export function evaluateRisoHumanEnsemble(frame:number,aspect:EnsembleAspect="landscape",
  paperOptions:RisoTransferSheetOptions={},
  handoffSchedule:RisoHandoffSchedule=RISO_HANDOFF_DEFAULTS){
  if(!Number.isInteger(frame)||frame<0||frame>239)
    throw new RangeError("Riso ensemble frame must be an integer 0..239");
  const portrait=aspect==="portrait";
  const width=portrait?540:960,height=portrait?960:540;
  const first={x:portrait?0:120,y:portrait?705:445,scale:portrait?1.2:1.05};
  const second={x:portrait?335:520,y:portrait?705:445,scale:portrait?1.2:1.05};
  const a=personPoint(COURIER,frame,"right-hand",first.x,first.y,first.scale);
  const b=personPoint(PAPER_ARTIST,frame,"left-hand",second.x,second.y,second.scale);
  // Absolute reference pose sampled from the same two rigs: no history and
  // no independent paper keyframe. After transfer it follows only the receiver.
  const releaseA=personPoint(COURIER,handoffSchedule.releaseStart,"right-hand",
    first.x,first.y,first.scale);
  const releaseB=personPoint(PAPER_ARTIST,handoffSchedule.releaseStart,"left-hand",
    second.x,second.y,second.scale);
  const handoff=evaluateRisoPropHandoff(frame,a,b,releaseA,releaseB,handoffSchedule);
  // One material geometry drives the actual knockout and both ink masters.
  // Independent pinch decreases on the letting-go hand and increases on the
  // receiving hand; neither has its own random film clock.
  const printDetails=evaluateRisoTransferSheet(
    handoff.paperStart,handoff.paperEnd,handoff.progress,
    {...paperOptions,sourceGrip:handoff.sourceGrip,receiverGrip:handoff.receiverGrip});
  return {...handoff,frame,aspect,width,height,first,second,source:a,receiver:b,
    propEnd:handoff.paperEnd,progress:handoff.progress,sheet:printDetails.outline,printDetails};
}
export function RisoHumanEnsembleStudio(){
  const [frame,setFrame]=useState(176);
  const [playing,setPlaying]=useState(false);
  const [aspect,setAspect]=useState<EnsembleAspect>("landscape");
  const [plate,setPlate]=useState<EnsemblePlate>("both");
  const [anchors,setAnchors]=useState(false);
  const [grain,setGrain]=useState(.45);
  const [misregistration,setMisregistration]=useState(.25);
  const [dotCell,setDotCell]=useState(6);
  const [sheetDetail,setSheetDetail]=useState(true);
  const [fingertipOcclusion,setFingertipOcclusion]=useState(true);
  const [paperCurl,setPaperCurl]=useState(3);
  const [gripPinch,setGripPinch]=useState(.5);
  const [releaseStart,setReleaseStart]=useState(178);
  const [releaseDuration,setReleaseDuration]=useState(24);
  const [settleDegrees,setSettleDegrees]=useState(-45);
  // Playback is a Storybook convenience. Production frames stay pure: a
  // film exporter passes an absolute frame to evaluateRisoHumanEnsemble.
  useEffect(()=>{
    if(!playing)return;
    const id=window.setInterval(()=>setFrame(current=>(current+1)%240),1000/24);
    return ()=>window.clearInterval(id);
  },[playing]);
  const handoffSchedule:RisoHandoffSchedule={
    ...RISO_HANDOFF_DEFAULTS,
    releaseStart,releaseEnd:releaseStart+releaseDuration,settleDegrees,
  };
  const state=useMemo(()=>evaluateRisoHumanEnsemble(frame,aspect,{
    curl:paperCurl,gripPinch,
  },handoffSchedule),[frame,aspect,paperCurl,gripPinch,releaseStart,releaseDuration,settleDegrees]);
  const printSpec:RisoPrintSpec={
    version:1,width:state.width,height:state.height,paper,seed:38,
    startFrame:0,passFrames:1,gapFrames:0,
    plates:[
      {id:"blue",color:blue,opacity:1,dotCell,dotAngle:-12,registration:[0,0]},
      {id:"red",color:red,opacity:1,dotCell,dotAngle:17,registration:[.5,-.4]},
    ],
  };
  const people=[{spec:COURIER,stage:state.first},{spec:PAPER_ARTIST,stage:state.second}] as const;
  const footContacts=people.flatMap(({spec,stage})=>["left-ankle","right-ankle"].map(joint=>
    personPoint(spec,frame,joint,stage.x,stage.y,stage.scale)));
  const gripLayer=(spec:RisoCharacterSpec,stage:{x:number;y:number;scale:number},
    side:"left"|"right",id:string):RisoForegroundLayer=>{
    const onlyPartIds=risoGripParts(side);
    // Actual ink scratches are open contours. Only four closed, authored red
    // glove digit masses may cut paper; blue hatch/knuckle lines print on top.
    const solidDigits=onlyPartIds.slice(0,4);
    return {
      id,
      knockout:<g data-km-riso-grip-occlusion={id}>
        <RisoCharacterKnockout spec={spec} frame={frame} x={stage.x} y={stage.y}
          scale={stage.scale} spread={1.25} onlyPartIds={solidDigits}/></g>,
      artworks:{
        blue:paint=><RisoCharacterInk spec={spec} frame={frame} plateId="blue"
          paint={paint} x={stage.x} y={stage.y} scale={stage.scale}
          onlyPartIds={onlyPartIds}/>,
        red:paint=><RisoCharacterInk spec={spec} frame={frame} plateId="red"
          paint={paint} x={stage.x} y={stage.y} scale={stage.scale}
          onlyPartIds={onlyPartIds}/>,
      },
    };
  };
  const layers:RisoForegroundLayer[]=[
    // Stage the complete actors on the physical paper before presenting the
    // letter, then allow only actual joint-posed fingers to cover the letter.
    ...people.map(({spec,stage}):RisoForegroundLayer=>({
      id:spec.id,
      knockout:<g data-km-riso-human-actor={spec.id}>
        <RisoCharacterKnockout spec={spec} frame={frame} x={stage.x} y={stage.y}
          scale={stage.scale} spread={2}/></g>,
      artworks:{
        blue:paint=><RisoCharacterInk spec={spec} frame={frame} plateId="blue"
          paint={paint} x={stage.x} y={stage.y} scale={stage.scale}/>,
        red:paint=><RisoCharacterInk spec={spec} frame={frame} plateId="red"
          paint={paint} x={stage.x} y={stage.y} scale={stage.scale}/>,
      },
    })),
    {
      id:"shared-letter",
      knockout:state.sheet?<path d={state.sheet}
        data-km-riso-human-ensemble-sheet={state.progress.toFixed(3)}/>:undefined,
      artworks:{
        blue:paint=><RisoTransferSheetPlate outline={state.sheet}
          geometry={state.printDetails} paint={paint} plateId="blue" detail={sheetDetail}/>,
        red:paint=><RisoTransferSheetPlate outline={state.sheet}
          geometry={state.printDetails} paint={paint} plateId="red" detail={sheetDetail}/>,
      },
    },
    ...(fingertipOcclusion&&state.sheet
      ? [
        // Once the physical paper has moved away from the source finger root,
        // never leave that original rigged finger floating over its surface.
        ...(state.sourceTouching
          ? [gripLayer(COURIER,state.first,"right","courier-grip")]:[]),
        ...(state.receiverTouching
          ? [gripLayer(PAPER_ARTIST,state.second,"left","artist-grip")]:[]),
      ]
      : []),
  ];
  return <main style={{background:"#F0E4D1",padding:18,minHeight:"100vh",font:"14px system-ui,sans-serif"}}>
    <div style={{maxWidth:1320,margin:"0 auto"}}>
      <div style={{fontWeight:800,letterSpacing:2,fontSize:12}}>RISO16 / CONTINUOUS SPOT-PRINT PAPER & TWO-HUMAN ACTING</div>
      <h2 style={{font:"700 29px Georgia,serif",margin:"8px 0"}}>Two original figures · a printed-sheet exchange</h2>
      <p style={{fontSize:13,maxWidth:900,lineHeight:1.5}}>
        Distinct coat, bob hair and facial geometry for the Paper Artist; the Courier retains
        its existing body and satchel grip. The curved printed sheet follows both evaluated hands through a shared physical contour,
        with controllable curl, grip compression, screened fold and original address engravings.
        The joint-posed fingertips print in front of paper during contact, and the Courier
        releases the sheet while the Paper Artist keeps holding it. Release timing, duration
        and tilt are authored; this is not a force-based collision solver.
        Real RisoPrint spot-ink screens, print registration, paper pores and fibres are used.
      </p>
      <div style={{display:"flex",flexWrap:"wrap",gap:20,alignItems:"center",padding:"12px 0"}}>
        <button type="button" aria-label={playing?"Pause Risograph ensemble":"Play Risograph ensemble"}
          aria-pressed={playing} onClick={()=>setPlaying(value=>!value)}
          style={{border:"1px solid #426079",borderRadius:4,color:"#FFF",background:"#244D6C",
            fontWeight:700,padding:"8px 12px",cursor:"pointer"}}>
          {playing?"Pause":"Play scene"}
        </button>
        <label>Frame · {frame} <input type="range" min={0} max={239} value={frame}
          aria-label="RISO ensemble film frame" onChange={e=>setFrame(Number(e.target.value))}/></label>
        <label>Output <select value={aspect} aria-label="RISO ensemble aspect"
          onChange={e=>setAspect(e.target.value as EnsembleAspect)}>
          <option value="landscape">16:9</option><option value="portrait">9:16</option>
        </select></label>
        <label>Ink <select value={plate} aria-label="RISO ensemble ink plate"
          onChange={e=>setPlate(e.target.value as EnsemblePlate)}>
          <option value="both">Both plates</option><option value="blue">Cobalt</option>
          <option value="red">Vermilion</option>
        </select></label>
        <label>Paper curl · {paperCurl.toFixed(1)}
          <input type="range" min={0} max={12} step={.5} value={paperCurl}
            aria-label="RISO ensemble paper curl"
            onChange={e=>setPaperCurl(Number(e.target.value))}/></label>
        <label>Hand grip pinch · {gripPinch.toFixed(2)}
          <input type="range" min={0} max={1} step={.05} value={gripPinch}
            aria-label="RISO ensemble paper grip pinch"
            onChange={e=>setGripPinch(Number(e.target.value))}/></label>
        <label>Release starts · {releaseStart}
          <input type="range" min={170} max={190} step={1} value={releaseStart}
            aria-label="RISO ensemble donor release frame"
            onChange={e=>setReleaseStart(Number(e.target.value))}/></label>
        <label>Release duration · {releaseDuration} frames
          <input type="range" min={14} max={32} step={1} value={releaseDuration}
            aria-label="RISO ensemble transfer duration"
            onChange={e=>setReleaseDuration(Number(e.target.value))}/></label>
        <label>Receiver-held tilt · {settleDegrees}°
          <input type="range" min={-75} max={0} step={1} value={settleDegrees}
            aria-label="RISO ensemble receiver paper tilt"
            onChange={e=>setSettleDegrees(Number(e.target.value))}/></label>
        <label><input type="checkbox" checked={fingertipOcclusion}
          aria-label="RISO ensemble anatomical fingertip occlusion"
          onChange={e=>setFingertipOcclusion(e.target.checked)}/>
          Original finger-over-paper contacts</label>
        <label><input type="checkbox" checked={sheetDetail}
          aria-label="RISO ensemble fine printed-sheet detail"
          onChange={e=>setSheetDetail(e.target.checked)}/> Fine printed-sheet detail</label>
        <label><input type="checkbox" checked={anchors} aria-label="RISO ensemble contact anchors"
          onChange={e=>setAnchors(e.target.checked)}/> Show contact anchors</label>
        <label>Screen cell · {dotCell}px <input type="range" min={3} max={12} step={1}
          aria-label="RISO ensemble screen cell" value={dotCell}
          onChange={e=>setDotCell(Number(e.target.value))}/></label>
        <label>Ink registration · {misregistration.toFixed(2)}
          <input type="range" min={0} max={1} step={.05}
            aria-label="RISO ensemble registration" value={misregistration}
            onChange={e=>setMisregistration(Number(e.target.value))}/></label>
        <label>Paper fibres · {grain.toFixed(2)}
          <input type="range" min={0} max={1} step={.05}
            aria-label="RISO ensemble paper grain" value={grain}
            onChange={e=>setGrain(Number(e.target.value))}/></label>
      </div>
      <div style={{width:aspect==="portrait"?450:960,
        maxWidth:"100%",aspectRatio:aspect==="portrait"?"540 / 960":"960 / 540",
        margin:"0 auto",
        border:"1px solid #B99F87",overflow:"visible"}}
        data-km-riso-ensemble-stage-container={aspect}>
        <RisoPrint
          spec={printSpec} frame={frame} reducedMotion={true}
          paperGrain={grain} misregistration={misregistration}
          style={{width:"100%",height:"100%",display:"block",overflow:"hidden"}}
          visiblePlateIds={plate==="both"?undefined:[plate]}
          artworks={{
            blue:paint=><g fill={paint.solid}>
              {/* Registration-locked floor contact: paper shadows follow real ankle roots. */}
              {footContacts.map((pos,i)=><ellipse key={i} cx={pos.x} cy={pos.y+14}
                rx={13} ry={3.8} fill={paint.dots} data-km-riso-foot-contact={i}/>)}
              <text x={state.width/2} y={aspect==="portrait"?178:76}
                textAnchor="middle" fontFamily="Georgia,serif"
                fontWeight={700} fontSize={35}>A PRINT TO SHARE</text>
              {anchors&&<g fill="none" stroke={paint.solid} strokeWidth={1.5}
                data-km-riso-ensemble-debug-anchors="">
                {([state.source,state.receiver] as const).map((pos,i)=>
                  <g key={i}><circle cx={pos.x} cy={pos.y} r={5}/>
                    <path d={`M${pos.x-10} ${pos.y}h20 M${pos.x} ${pos.y-10}v20`}/></g>)}
              </g>}
            </g>,
            red:paint=><text x={state.width/2} y={aspect==="portrait"?210:99}
              textAnchor="middle" fontFamily="system-ui,sans-serif" fontWeight={700}
              letterSpacing={3} fontSize={aspect==="portrait"?12:11}
              fill={paint.solid}>TWO MAKERS · TWO INKS</text>,
          }}
          foregroundLayers={layers}
          data-km-riso-human-ensemble-frame={frame}
          data-km-riso-human-ensemble-aspect={aspect}
          data-km-riso-human-ensemble-paper-curl={paperCurl}
          data-km-riso-human-ensemble-grip-pinch={gripPinch}
          data-km-riso-human-ensemble-contact-overprint={fingertipOcclusion}
          data-km-riso-handoff-phase={state.phase}
          data-km-riso-handoff-owner={state.owner}
          data-km-riso-handoff-release={state.releaseProgress.toFixed(3)}
          label="Two human Risograph actors exchanging a printed sheet"
        />
      </div>

      <p style={{fontSize:12,color:"#63727A"}}>
        All frames are deterministic. The letter begins at the Courier's hand,
        reaches the Paper Artist by frame 160, then releases from the Courier at the
        configured moment. The print follows the recipient afterward. No alpha-transparent
        bodies, synthetic mitten shapes or playback-history-dependent transforms.
      </p>
    </div>
  </main>;
}
