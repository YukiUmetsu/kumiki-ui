import {useEffect,useId,useMemo,useState} from "react";
import latticeUrl from "../../assets/models/anatomy/human-body-lattice.bin?url";
import type {HumanBodyModel,HumanParams} from "../../registry/anatomy/anatomy-body";
import {createHumanBody,loadHumanBodyModel,HUMAN_PRESETS} from "../../registry/anatomy/anatomy-body";
import {measureHumanBody} from "../../registry/anatomy/anatomy-measure";
import {growHair} from "../../registry/anatomy/anatomy-hair";
import {HAND_POSES,POSE_PRESETS,poseHumanBody} from "../../registry/anatomy/anatomy-pose";
import type {HumanPose} from "../../registry/anatomy/anatomy-pose";
import {HumanFigure} from "../../registry/anatomy/anatomy-react";
import {renderHumanFrame} from "../../registry/anatomy/anatomy-view";
import type {HumanFrame} from "../../registry/anatomy/anatomy-view";
import {evaluateInkBrush} from "../../registry/video/ink-brush";
import type {InkBrushSpec} from "../../registry/video/ink-brush";

export type InkAnatomyCharacter="scholar"|"elder";
export type InkAnatomyProp="staff"|"pipe";

const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
const safePoint=(p:readonly number[]|undefined,fallback:readonly [number,number]):[number,number]=>
  p&&Number.isFinite(p[0])&&Number.isFinite(p[1])?[p[0],p[1]]:[fallback[0],fallback[1]];
const mid=(a:readonly number[],b:readonly number[]):[number,number]=>
  [(a[0]+b[0])/2,(a[1]+b[1])/2];
const fmt=(n:number)=>Number(n.toFixed(2));

export function createInkAnatomyPose(prop:InkAnatomyProp):HumanPose{
  const relaxed=POSE_PRESETS.find(p=>p.id==="relaxed")?.pose??{};
  const grip=HAND_POSES.grip(".R");
  const opposedThumb:HumanPose={
    "thumb-cmc.R":{abduct:38,flex:12},
    "thumb-mcp.R":{flex:26},
    "thumb-ip.R":{flex:18},
  };
  if(prop==="pipe"){
    return {
      ...relaxed,
      spine:{flex:4,twist:3},
      neck:{flex:3,twist:-7},
      "shoulder.R":{flex:38,abduct:17,twist:14},
      "elbow.R":{flex:82},
      "forearm.R":{twist:24},
      "wrist.R":{flex:8,abduct:4},
      ...grip,...opposedThumb,
      "finger2-mcp.R":{flex:43},
      "finger2-pip.R":{flex:48},
      "finger2-dip.R":{flex:22},
    };
  }
  return {
    ...relaxed,
    spine:{flex:2,twist:3},
    neck:{twist:-5},
    "shoulder.R":{flex:-5,abduct:12,twist:3},
    "elbow.R":{flex:24},
    "forearm.R":{twist:8},
    "wrist.R":{flex:2},
    ...grip,...opposedThumb,
  };
}

export interface InkRobePaths{
  body:string;
  sleeves:[string,string];
  collar:string;
  cuffs:[string,string];
  cap:string;
  beard:string;
  prop:{path:string;secondary:string;hand:[number,number]};
  anchors:{
    neck:[number,number];shoulders:[[number,number],[number,number]];
    elbows:[[number,number],[number,number]];wrists:[[number,number],[number,number]];
    hips:[[number,number],[number,number]];hem:[[number,number],[number,number]];
  };
}

function jointPoint(frame:HumanFrame,id:string,part:"head"|"tail",fallback:[number,number]){
  return safePoint(frame.joints[id]?.[part],fallback);
}

export function buildInkRobePaths(frame:HumanFrame,character:InkAnatomyCharacter,prop:InkAnatomyProp):InkRobePaths{
  const {x0,y0,x1,y1}=frame.bounds;
  const cx=(x0+x1)/2;
  const span=Math.max(42,(x1-x0)*.48);
  const shoulderL=jointPoint(frame,"upperarm.L","head",[cx-span*.42,y0+(y1-y0)*.23]);
  const shoulderR=jointPoint(frame,"upperarm.R","head",[cx+span*.42,y0+(y1-y0)*.23]);
  const elbowL=jointPoint(frame,"forearm.L","head",[cx-span*.55,y0+(y1-y0)*.4]);
  const elbowR=jointPoint(frame,"forearm.R","head",[cx+span*.55,y0+(y1-y0)*.4]);
  const wristL=jointPoint(frame,"wrist.L","head",[cx-span*.48,y0+(y1-y0)*.55]);
  const wristR=jointPoint(frame,"wrist.R","head",[cx+span*.48,y0+(y1-y0)*.55]);
  const hipL=jointPoint(frame,"thigh.L","head",[cx-span*.22,y0+(y1-y0)*.55]);
  const hipR=jointPoint(frame,"thigh.R","head",[cx+span*.22,y0+(y1-y0)*.55]);
  const ankleL=jointPoint(frame,"foot.L","head",[cx-span*.16,y1-48]);
  const ankleR=jointPoint(frame,"foot.R","head",[cx+span*.16,y1-48]);
  const leftShoulder=shoulderL[0]<=shoulderR[0]?shoulderL:shoulderR;
  const rightShoulder=shoulderL[0]<=shoulderR[0]?shoulderR:shoulderL;
  const leftElbow=elbowL[0]<=elbowR[0]?elbowL:elbowR;
  const rightElbow=elbowL[0]<=elbowR[0]?elbowR:elbowL;
  const leftWrist=wristL[0]<=wristR[0]?wristL:wristR;
  const rightWrist=wristL[0]<=wristR[0]?wristR:wristL;
  const leftHip=hipL[0]<=hipR[0]?hipL:hipR;
  const rightHip=hipL[0]<=hipR[0]?hipR:hipL;
  const leftAnkle=ankleL[0]<=ankleR[0]?ankleL:ankleR;
  const rightAnkle=ankleL[0]<=ankleR[0]?ankleR:ankleL;
  const shoulderSpan=Math.max(36,rightShoulder[0]-leftShoulder[0]);
  const neck=safePoint(frame.landmarks.suprasternale,mid(leftShoulder,rightShoulder));
  const hipY=(leftHip[1]+rightHip[1])/2;
  const hemY=Math.min(leftAnkle[1],rightAnkle[1])-18;
  const hemWidth=Math.max(shoulderSpan*.76,(rightHip[0]-leftHip[0])*1.75);
  const hemLeft:[number,number]=[cx-hemWidth/2,hemY];
  const hemRight:[number,number]=[cx+hemWidth/2,hemY];
  const neckWidth=shoulderSpan*.2;
  const neckLeft:[number,number]=[neck[0]-neckWidth/2,neck[1]];
  const neckRight:[number,number]=[neck[0]+neckWidth/2,neck[1]];
  const body=`M${fmt(neckLeft[0])} ${fmt(neckLeft[1])}
    Q${fmt(leftShoulder[0])} ${fmt(leftShoulder[1]-8)} ${fmt(leftShoulder[0])} ${fmt(leftShoulder[1]+4)}
    C${fmt(leftShoulder[0]-shoulderSpan*.12)} ${fmt(leftShoulder[1]+shoulderSpan*.42)}
     ${fmt(leftHip[0]-shoulderSpan*.2)} ${fmt(hipY+shoulderSpan*.34)} ${fmt(hemLeft[0])} ${fmt(hemLeft[1])}
    Q${fmt(cx)} ${fmt(hemY+shoulderSpan*.12)} ${fmt(hemRight[0])} ${fmt(hemRight[1])}
    C${fmt(rightHip[0]+shoulderSpan*.2)} ${fmt(hipY+shoulderSpan*.34)}
     ${fmt(rightShoulder[0]+shoulderSpan*.12)} ${fmt(rightShoulder[1]+shoulderSpan*.42)} ${fmt(rightShoulder[0])} ${fmt(rightShoulder[1]+4)}
    Q${fmt(rightShoulder[0])} ${fmt(rightShoulder[1]-8)} ${fmt(neckRight[0])} ${fmt(neckRight[1])} Z`;
  const sleeve=(shoulder:[number,number],elbow:[number,number],wrist:[number,number],side:-1|1)=>{
    const cuffX=wrist[0]+side*3,cuffY=wrist[1]-2;
    return `M${fmt(shoulder[0])} ${fmt(shoulder[1])}
      C${fmt(shoulder[0]+side*shoulderSpan*.22)} ${fmt(shoulder[1]+shoulderSpan*.22)}
       ${fmt(elbow[0]+side*shoulderSpan*.2)} ${fmt(elbow[1]-shoulderSpan*.08)}
       ${fmt(wrist[0]+side*shoulderSpan*.13)} ${fmt(wrist[1]-shoulderSpan*.04)}
      Q${fmt(cuffX+side*5)} ${fmt(cuffY+8)} ${fmt(cuffX)} ${fmt(cuffY+17)}
      C${fmt(elbow[0]-side*shoulderSpan*.06)} ${fmt(elbow[1]+shoulderSpan*.16)}
       ${fmt(shoulder[0]-side*shoulderSpan*.15)} ${fmt(shoulder[1]+shoulderSpan*.3)}
       ${fmt(shoulder[0])} ${fmt(shoulder[1])} Z`;
  };
  const sleeveL=sleeve(leftShoulder,leftElbow,leftWrist,-1);
  const sleeveR=sleeve(rightShoulder,rightElbow,rightWrist,1);
  const collar=`M${fmt(neckLeft[0])} ${fmt(neckLeft[1]+2)}
    Q${fmt(cx-shoulderSpan*.08)} ${fmt(neck[1]+shoulderSpan*.24)} ${fmt(cx)} ${fmt(neck[1]+shoulderSpan*.32)}
    Q${fmt(cx+shoulderSpan*.08)} ${fmt(neck[1]+shoulderSpan*.24)} ${fmt(neckRight[0])} ${fmt(neckRight[1]+2)}`;
  const cuffs:[string,string]=[
    `M${fmt(leftWrist[0]-8)} ${fmt(leftWrist[1]+5)} Q${fmt(leftWrist[0])} ${fmt(leftWrist[1]+11)} ${fmt(leftWrist[0]+8)} ${fmt(leftWrist[1]+5)}`,
    `M${fmt(rightWrist[0]-8)} ${fmt(rightWrist[1]+5)} Q${fmt(rightWrist[0])} ${fmt(rightWrist[1]+11)} ${fmt(rightWrist[0]+8)} ${fmt(rightWrist[1]+5)}`,
  ];
  const vertex=safePoint(frame.landmarks.vertex,[cx,y0]);
  const menton=safePoint(frame.landmarks.menton,[cx,vertex[1]+shoulderSpan*.32]);
  const zL=safePoint(frame.landmarks["zygion.L"],[cx-shoulderSpan*.16,vertex[1]+shoulderSpan*.18]);
  const zR=safePoint(frame.landmarks["zygion.R"],[cx+shoulderSpan*.16,vertex[1]+shoulderSpan*.18]);
  const headWidth=Math.max(12,Math.abs(zR[0]-zL[0]));
  const capTop=vertex[1]-headWidth*.1,capBottom=vertex[1]+headWidth*.18;
  const cap=`M${fmt(cx-headWidth*.48)} ${fmt(capBottom)}
    Q${fmt(cx-headWidth*.52)} ${fmt(capTop+headWidth*.12)} ${fmt(cx)} ${fmt(capTop)}
    Q${fmt(cx+headWidth*.52)} ${fmt(capTop+headWidth*.12)} ${fmt(cx+headWidth*.48)} ${fmt(capBottom)} Z`;
  const beard=character==="elder"
    ?`M${fmt(zL[0]*.25+cx*.75)} ${fmt(menton[1]-headWidth*.08)}
      Q${fmt(cx)} ${fmt(menton[1]+headWidth*.22)} ${fmt(zR[0]*.25+cx*.75)} ${fmt(menton[1]-headWidth*.08)}
      Q${fmt(cx)} ${fmt(menton[1]+headWidth*.55)} ${fmt(cx)} ${fmt(menton[1]+headWidth*.6)} Z`
    :"";
  const hand=jointPoint(frame,"wrist.R","tail",rightWrist);
  const mouth=safePoint(frame.landmarks.pronasale,[cx,vertex[1]+headWidth*.45]);
  const propPath=prop==="staff"
    ?`M${fmt(hand[0]+5)} ${fmt(frame.floorY-12)} Q${fmt(hand[0]-10)} ${fmt((frame.floorY+hand[1])/2)} ${fmt(hand[0]+3)} ${fmt(hand[1]-headWidth*.2)}`
    :`M${fmt(mouth[0]+headWidth*.05)} ${fmt(mouth[1]+headWidth*.08)} Q${fmt((mouth[0]+hand[0])/2)} ${fmt((mouth[1]+hand[1])/2-headWidth*.1)} ${fmt(hand[0]+headWidth*.12)} ${fmt(hand[1]-headWidth*.08)}`;
  const secondary=prop==="staff"
    ?`M${fmt(hand[0]-1)} ${fmt(frame.floorY-12)} L${fmt(hand[0]+6)} ${fmt(frame.floorY-12)}`
    :`M${fmt(hand[0]+headWidth*.08)} ${fmt(hand[1]-headWidth*.1)} q${fmt(headWidth*.12)} ${fmt(-headWidth*.12)} ${fmt(headWidth*.18)} ${fmt(-headWidth*.04)}`;
  return {
    body,sleeves:[sleeveL,sleeveR],collar,cuffs,cap,beard,
    prop:{path:propPath,secondary,hand},
    anchors:{neck,shoulders:[leftShoulder,rightShoulder],elbows:[leftElbow,rightElbow],wrists:[leftWrist,rightWrist],hips:[leftHip,rightHip],hem:[hemLeft,hemRight]},
  };
}

export function buildInkRobeBrushSpec(frame:HumanFrame,character:InkAnatomyCharacter):InkBrushSpec{
  const paths=buildInkRobePaths(frame,character,character==="elder"?"pipe":"staff");
  const {anchors}=paths;
  const center=mid(anchors.hem[0],anchors.hem[1]);
  const shoulderMid=mid(anchors.shoulders[0],anchors.shoulders[1]);
  const elbowMid=mid(anchors.elbows[0],anchors.elbows[1]);
  const hipMid=mid(anchors.hips[0],anchors.hips[1]);
  const nodes=(pts:readonly (readonly [number,number])[])=>pts.map(([x,y],i)=>({
    x:fmt(clamp(x,4,frame.width-4)),y:fmt(clamp(y,4,frame.height-4)),
    pressure:[.32,.72,.56,.28][i%4],pace:[1.2,.85,1.1,.9][i%4],
  }));
  const stroke=(id:string,pts:readonly (readonly [number,number])[],width:number,tone:0|1|2|3|4,load:number,dryness:number)=>({
    id,points:nodes(pts),width,load,dryness,tone,startFrame:0,durationFrames:1,
  });
  const [lShoulder,rShoulder]=anchors.shoulders,[lElbow,rElbow]=anchors.elbows,[lWrist,rWrist]=anchors.wrists;
  const [lHip,rHip]=anchors.hips,[lHem,rHem]=anchors.hem;
  return {
    version:1,width:Math.round(frame.width),height:Math.round(frame.height),paper:"#f1e7d6",seed:48291,
    strokes:[
      stroke("robe-center-fold",[shoulderMid,hipMid,center],5,2,.62,.32),
      stroke("robe-left-fold",[lShoulder,[lHip[0]-8,hipMid[1]],lHem],4,1,.72,.24),
      stroke("robe-right-fold",[rShoulder,[rHip[0]+8,hipMid[1]],rHem],4,1,.72,.24),
      stroke("sleeve-left-crease",[lShoulder,lElbow,lWrist],5,2,.62,.3),
      stroke("sleeve-right-crease",[rShoulder,rElbow,rWrist],5,2,.62,.3),
      stroke("collar-flow",[lShoulder,shoulderMid,rShoulder],3,1,.82,.18),
      stroke("hem-dry-brush",[lHem,center,rHem],7,1,.58,.58),
      stroke("sleeve-inner-fold",[lElbow,hipMid,rElbow],3,3,.42,.46),
    ],
  };
}

const SCHOLAR_BASE=HUMAN_PRESETS.find(p=>p.id==="man-50")?.params??{sex:1,age:50};
const ELDER_BASE=HUMAN_PRESETS.find(p=>p.id==="man-80")?.params??{sex:1,age:80};
const BODY_PARAMS:Record<InkAnatomyCharacter,HumanParams>={
  scholar:{...SCHOLAR_BASE,sex:1,age:58,muscle:.36,weight:.42,stature:1.68,growthCurve:false,ancestry:{asian:1}},
  elder:{...ELDER_BASE,sex:1,age:72,muscle:.28,weight:.46,stature:1.64,growthCurve:false,ancestry:{asian:1}},
};

function useAnatomyModel(){
  const [model,setModel]=useState<HumanBodyModel|null>(null);
  const [error,setError]=useState<string|null>(null);
  useEffect(()=>{
    let live=true;
    loadHumanBodyModel(latticeUrl).then(m=>{if(live)setModel(m);},e=>{if(live)setError(String(e));});
    return()=>{live=false;};
  },[]);
  return {model,error};
}

export interface InkAnatomyCharacterFigureProps{
  character?:InkAnatomyCharacter;
  detail?:number;
  className?:string;
}

export function InkAnatomyCharacterFigure({
  character="scholar",detail=1,className,
}:InkAnatomyCharacterFigureProps){
  const {model,error}=useAnatomyModel();
  const uid="km-anat4-"+useId().replace(/[^a-zA-Z0-9_-]/g,"");
  const params=BODY_PARAMS[character];
  const prop:InkAnatomyProp=character==="elder"?"pipe":"staff";
  const body=useMemo(()=>model?createHumanBody(model,params):null,[model,params]);
  const pose=useMemo(()=>createInkAnatomyPose(prop),[prop]);
  const posed=useMemo(()=>body?poseHumanBody(body,pose):null,[body,pose]);
  const frame=useMemo(()=>body&&posed?renderHumanFrame(
    body,posed.points,{yaw:character==="elder"?13:18,pitch:0},
    {width:460,height:840,padding:28},
  ):null,[body,posed,character]);
  const paths=useMemo(()=>frame?buildInkRobePaths(frame,character,prop):null,[frame,character,prop]);
  const brushSpec=useMemo(()=>frame?buildInkRobeBrushSpec(frame,character):null,[frame,character]);
  const brush=useMemo(()=>brushSpec?evaluateInkBrush(brushSpec,1,true):[],[brushSpec]);
  const hair=useMemo(()=>body&&posed?growHair(body,posed.points,{
    length:character==="elder" ? .105 : .078,curl:1,strands:820,parting:"center",
    flow:"back",recession:character==="elder" ? .18 : .05,volume:.008,
    clump:.78,frizz:.06,seed:character==="elder"?48293:48292,
  }):null,[body,posed,character]);
  const measures=useMemo(()=>body?measureHumanBody(body):null,[body]);
  if(error)return <div role="alert" data-testid="ink-anat4-error">ANAT1 body lattice: {error}</div>;
  if(!body||!posed||!frame||!paths||!measures)return <div role="status" data-testid="ink-anat4-loading">Loading ANAT1 body lattice…</div>;
  const [leftSleeve,rightSleeve]=paths.sleeves;
  const [leftCuff,rightCuff]=paths.cuffs;
  const [leftHem,rightHem]=paths.anchors.hem;
  const cx=(frame.bounds.x0+frame.bounds.x1)/2;
  return <div className={className} data-testid="ink-anat4-figure"
    data-km-anat4-ready="true" data-km-anat4-character={character}
    data-km-anat4-prop={prop} data-km-anat1-source="makehuman-ansur-body-lattice"
    data-km-anat1-joint-count={Object.keys(frame.joints).length}
    data-km-anat1-out-of-range={posed.outOfRange.length}
    data-km-anat1-heads-tall={fmt(measures.headsTall)}
    data-km-anat1-hand-length-mm={fmt(measures.handLength*1000)}
    data-km-anat1-hair-strands={hair?.counts.length??0}
    data-km-ink1-strokes={brush.length}
    style={{position:"relative",width:460,height:840,maxWidth:"100%",background:"#f1e7d6",overflow:"hidden"}}>
    <svg width="460" height="840" viewBox="0 0 460 840"
      style={{position:"absolute",inset:0}} aria-hidden="true">
      <rect width="460" height="840" fill="#f1e7d6"/>
      <path d={paths.prop.path} fill="none" stroke="#816c4d" strokeWidth={prop==="staff"?5.2:2.2}
        strokeLinecap="round" opacity=".88"/>
      <path d={paths.prop.secondary} fill="none" stroke="#c1a77e"
        strokeWidth={prop==="staff"?1.8:1.4} strokeLinecap="round"/>
      {prop==="staff"&&Array.from({length:7},(_,i)=>{
        const y=frame.floorY-34-i*86,x=paths.prop.hand[0]+4;
        return <path key={i} d={`M${fmt(x-3)} ${fmt(y)} q4 -2 8 0`}
          fill="none" stroke="#9c805a" strokeWidth="1.4" opacity=".8"/>;
      })}
      {prop==="pipe"&&<ellipse cx={paths.prop.hand[0]+10} cy={paths.prop.hand[1]-5}
        rx="5" ry="8" fill="#66513c" stroke="#3d3026" strokeWidth=".8"/>}
    </svg>
    <HumanFigure frame={frame} surface="tonal" contour lineWidth={1.25}
      hair={hair??undefined}
      hairColor={{eumelanin:character==="elder" ? .45 : 1.6,pheomelanin:.04,grey:character==="elder" ? .76 : .14}}
      palette={{light:"#e8c9a9",shadow:"#785b47",ink:"#3a3029",accent:"#a38a70",grid:"#b5a58f",eye:"#ead8c3"}}
      label={character==="elder"?"Anatomy-led elder ink figure":"Anatomy-led scholar ink figure"}
      style={{position:"absolute",inset:0}}/>
    <svg width="460" height="840" viewBox="0 0 460 840"
      style={{position:"absolute",inset:0,overflow:"hidden"}} aria-hidden="true"
      data-km-ink-anat4-robe="landmark-fitted">
      <defs>
        <linearGradient id={uid+"-robe"} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f2e9db"/>
          <stop offset=".48" stopColor="#e4d8c7"/>
          <stop offset="1" stopColor="#cdbda8"/>
        </linearGradient>
        <radialGradient id={uid+"-wash"} cx=".35" cy=".25" r=".85">
          <stop offset="0" stopColor="#fffaf0" stopOpacity=".72"/>
          <stop offset=".65" stopColor="#aa9278" stopOpacity=".16"/>
          <stop offset="1" stopColor="#625345" stopOpacity=".05"/>
        </radialGradient>
        <filter id={uid+"-wet"} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="4.5"/>
        </filter>
        <clipPath id={uid+"-robe-clip"}>
          <path d={paths.body}/><path d={leftSleeve}/><path d={rightSleeve}/>
        </clipPath>
      </defs>
      <path d={paths.body} fill={"url(#"+uid+"-robe)"} stroke="#494138" strokeWidth=".9" strokeOpacity=".68"/>
      <path d={leftSleeve} fill={"url(#"+uid+"-robe)"} stroke="#494138" strokeWidth=".85" strokeOpacity=".66"/>
      <path d={rightSleeve} fill={"url(#"+uid+"-robe)"} stroke="#494138" strokeWidth=".85" strokeOpacity=".66"/>
      <g clipPath={"url(#"+uid+"-robe-clip)"}>
        <ellipse cx={cx} cy={paths.anchors.neck[1]+170} rx="108" ry="220"
          fill={"url(#"+uid+"-wash)"} filter={"url(#"+uid+"-wet)"}/>
        <path d={paths.collar} fill="none" stroke="#8d7963" strokeWidth="5" opacity=".12"/>
        <path d={paths.collar} fill="none" stroke="#4b4035" strokeWidth=".82" opacity=".7"/>
        {brush.map(mark=><g key={mark.id} data-km-ink1-stroke={mark.id} opacity={mark.opacity}>
          {mark.outline&&<path d={mark.outline} fill={mark.color}/>}
          {mark.core&&<path d={mark.core} fill={mark.color} opacity=".82"/>}
          {mark.hairs.map((h,i)=><path key={i} d={h.d} fill="none" stroke={mark.color}
            strokeWidth={h.width} strokeLinecap="round" opacity={h.opacity}/>)}
          {mark.gaps.map((g,i)=><path key={i} d={g.d} fill="none" stroke="#f1e7d6"
            strokeWidth={g.width} strokeLinecap="round"/>)}
          {mark.pores.map((p,i)=><ellipse key={i} cx={p.x} cy={p.y} rx={p.rx} ry={p.ry}
            fill="#f1e7d6" opacity=".7"/>)}
        </g>)}
      </g>
      <path d={leftCuff} fill="none" stroke="#51463a" strokeWidth=".85" opacity=".55"/>
      <path d={rightCuff} fill="none" stroke="#51463a" strokeWidth=".85" opacity=".55"/>
      <path d={paths.cap} fill="#343a38" stroke="#222724" strokeWidth=".8"/>
      <path d={`M${fmt(cx-12)} ${fmt(frame.bounds.y0+34)} Q${fmt(cx)} ${fmt(frame.bounds.y0+30)} ${fmt(cx+12)} ${fmt(frame.bounds.y0+34)}`}
        fill="none" stroke="#b7aa96" strokeWidth=".6" opacity=".5"/>
      {paths.beard&&<path d={paths.beard} fill="#66594d" opacity=".16" stroke="#4c4137" strokeWidth=".4"/>}
      {character==="elder"&&Array.from({length:26},(_,i)=>{
        const t=i/25,chin=safePoint(frame.landmarks.menton,[cx,frame.bounds.y0+115]);
        const x=cx-(frame.bounds.x1-frame.bounds.x0)*.035+t*(frame.bounds.x1-frame.bounds.x0)*.07;
        return <path key={i} d={`M${fmt(x)} ${fmt(chin[1]+4)}
          Q${fmt(x+Math.sin(i*1.4)*3)} ${fmt(chin[1]+15)}
          ${fmt(x+Math.sin(i*.8)*4)} ${fmt(chin[1]+24+(i%4)*2)}`}
          fill="none" stroke={i%5===0?"#b9a58d":"#51463b"}
          strokeWidth={.32+(i%3)*.08} opacity={.42*detail}/>;
      })}
      <g data-km-anat4-sandal-straps="true" fill="none" stroke="#66533f" strokeWidth=".8" opacity=".65">
        {(["L","R"] as const).map(side=>{
          const foot=frame.joints["foot."+side];
          if(!foot)return null;
          return <path key={side} d={`M${fmt(foot.head[0]-5)} ${fmt(foot.head[1]+8)}
            Q${fmt(foot.head[0])} ${fmt(foot.head[1]+2)} ${fmt(foot.head[0]+7)} ${fmt(foot.head[1]+8)}`}/>;
        })}
      </g>
    </svg>
  </div>;
}
