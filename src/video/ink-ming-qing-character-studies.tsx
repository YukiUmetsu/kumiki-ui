/**
 * ANAT5 — fresh Ming/Qing source-led Chinese-ink character studies.
 *
 * The three heads are newly constructed from ANAT1's 468-point face mesh.
 * EXPR1 deforms the actual face landmarks; this renderer does not import
 * ANAT2/ANAT3 portraits or any existing Shanshui character artwork.
 *
 * Reference study: docs/research/chinese-ink-ming-qing-character-study-2026-11-17.md
 */
import {useId,useMemo} from "react";
import type {CSSProperties} from "react";
import {
  createFace,FACE_FEATURES,FACE_LANDMARKS,faceFeatureLines,measureFace,eyeCentres,
} from "../../registry/anatomy/anatomy-face";
import type {FaceLandmark} from "../../registry/anatomy/anatomy-face";
import {
  expressEmotion,expressFace,expressionFeatures,expressionMarks,irisPositions,findEmotion,
} from "../../registry/anatomy/expression-face";
import type {ExpressionFeatures} from "../../registry/anatomy/expression-face";
import {renderMeshFrame,projectPoint,smoothPath} from "../../registry/anatomy/anatomy-view";
import type {Vec3} from "../../registry/anatomy/anatomy-body";

export const INK_MING_QING_CHARACTERS=["scholar","writer","attendant"] as const;
export const INK_MING_QING_EXPRESSIONS=["neutral","smile","sad","surprise","fear","angry"] as const;
export type InkMingQingCharacter=typeof INK_MING_QING_CHARACTERS[number];
export type InkMingQingExpression=typeof INK_MING_QING_EXPRESSIONS[number];
type Point=[number,number];
type LandmarkName=FaceLandmark;

export interface InkMingQingCharacterStudyProps {
  character?:InkMingQingCharacter;
  emotion?:InkMingQingExpression;
  intensity?:number;
  detail?:number;
  /** Animated head turn in degrees. Defaults to the pose observed in the source. */
  yaw?:number;
  className?:string;
  style?:CSSProperties;
}

interface CharacterProfile {
  sourceId:string;
  sourceObjectId:string;
  sourceReferences:string[];
  sex:number;
  yaw:number;
  pitch:number;
  faceWidth:number;
  lowerFace:number;
  jawTaper:number;
  noseWidth:number;
  eyeSpacing:number;
  eyeHeight:number;
  mouthWidth:number;
  hairStyle:string;
  hairFiberCount:number;
  beardFiberCount:number;
  ink:string;
  skin:string;
  wash:string;
  hair:string;
  robe:string;
  accent:string;
}
const PROFILES:Record<InkMingQingCharacter,CharacterProfile>={
  scholar:{
    sourceId:"met-55.37-and-52.177.8-scholar-study",sourceObjectId:"55.37",
    sourceReferences:["Met 55.37 · Twenty-five bust portraits","Met 52.177.8 · Jiang Yun, Portrait of a Man"],
    sex:1,yaw:18,pitch:-2,faceWidth:.91,lowerFace:1.16,jawTaper:.82,
    noseWidth:.92,eyeSpacing:.97,eyeHeight:.94,mouthWidth:.96,
    hairStyle:"tall-scholar-cap",hairFiberCount:38,beardFiberCount:92,
    ink:"#34332e",skin:"#eadbc6",wash:"#94765e",hair:"#292b28",
    robe:"#e8dfd0",accent:"#8e4e3b",
  },
  writer:{
    sourceId:"met-2024.180-and-52.177.5-writer-study",sourceObjectId:"2024.180",
    sourceReferences:["Met 2024.180 · Woman at her dressing table","Met 52.177.5 · Jiang Jun, Portrait of a Lady"],
    sex:0,yaw:-18,pitch:-8,faceWidth:.88,lowerFace:1.08,jawTaper:.84,
    noseWidth:.90,eyeSpacing:1.01,eyeHeight:.98,mouthWidth:.92,
    hairStyle:"pinned-writer-coil",hairFiberCount:64,beardFiberCount:0,
    ink:"#37342e",skin:"#efdfca",wash:"#a98770",hair:"#282723",
    robe:"#ded4c2",accent:"#9c5847",
  },
  attendant:{
    sourceId:"met-2024.180-and-smithsonian-F1916.135-attendant-study",sourceObjectId:"2024.180",
    sourceReferences:["Met 2024.180 · Woman at her dressing table","Smithsonian F1916.135 · Court ladies and attendant"],
    sex:0,yaw:14,pitch:-5,faceWidth:.90,lowerFace:1.06,jawTaper:.82,
    noseWidth:.91,eyeSpacing:1.00,eyeHeight:.94,mouthWidth:.90,
    hairStyle:"attendant-double-pin",hairFiberCount:56,beardFiberCount:0,
    ink:"#38342e",skin:"#e9d9c4",wash:"#9a7a63",hair:"#292722",
    robe:"#d7d0c1",accent:"#805447",
  },
};
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
const smooth=(v:number)=>{const t=clamp(v,0,1);return t*t*(3-2*t);};
const fmt=(v:number)=>Number(v.toFixed(2));
const quadPoint=(a:Point,b:Point,c:Point,t:number):Point=>{
  const u=1-t;return [
    u*u*a[0]+2*u*t*b[0]+t*t*c[0],
    u*u*a[1]+2*u*t*b[1]+t*t*c[1],
  ];
};
const FACE_BASE:Record<InkMingQingCharacter,ReturnType<typeof createFace>>={
  scholar:createSourceFace("scholar"),
  writer:createSourceFace("writer"),
  attendant:createSourceFace("attendant"),
};

/**
 * Each profile starts from raw ANAT1 topology, not a borrowed demographic
 * average. Local landmark falloffs alter source-observed proportions only.
 */
function createSourceFace(character:InkMingQingCharacter){
  const profile=PROFILES[character];
  const base=createFace({calibrate:false,sex:profile.sex});
  const vertices=base.vertices.map(v=>[v[0],v[1],v[2]] as Vec3);
  const at=(name:LandmarkName)=>vertices[FACE_LANDMARKS[name]];
  const sellionY=at("sellion")[1],subnasaleY=at("subnasale")[1];
  const mentonY=at("menton")[1],stomionY=at("stomion")[1];
  const lowerSpan=Math.max(1,subnasaleY-mentonY);
  const eyeL=(at("palpebrale-superius.L")[1]+at("palpebrale-inferius.L")[1])/2;
  const eyeR=(at("palpebrale-superius.R")[1]+at("palpebrale-inferius.R")[1])/2;
  const eyeY=(eyeL+eyeR)/2;
  for(const p of vertices){
    const ox=p[0],oy=p[1];
    const lower=clamp((subnasaleY-oy)/lowerSpan,0,1);
    const noseY=smooth((oy-subnasaleY)/Math.max(1,sellionY-subnasaleY));
    const noseX=1-smooth(Math.abs(ox)/30);
    const noseWeight=noseY*noseX;
    const eyeWeight=Math.max(
      Math.exp(-(((ox-25)/27)**2+((oy-eyeY)/17)**2)),
      Math.exp(-(((ox+25)/27)**2+((oy-eyeY)/17)**2)),
    );
    const mouthWeight=Math.exp(-((ox/31)**2+((oy-stomionY)/13)**2));
    let x=ox*profile.faceWidth;
    let y=oy;
    if(oy<subnasaleY)y=subnasaleY+(oy-subnasaleY)*profile.lowerFace;
    x*=1+(profile.jawTaper-1)*lower;
    x*=1+(profile.noseWidth-1)*noseWeight;
    x*=1+(profile.eyeSpacing-1)*eyeWeight;
    x*=1+(profile.mouthWidth-1)*mouthWeight;
    y=eyeY+(y-eyeY)*(1+(profile.eyeHeight-1)*eyeWeight);
    p[0]=x;p[1]=y;
  }
  const points=new Float32Array(vertices.length*3);
  vertices.forEach((v,i)=>{
    points[i*3]=v[0]/1000;points[i*3+1]=v[1]/1000;points[i*3+2]=v[2]/1000;
  });
  return {...base,vertices,mesh:{...base.mesh,points}};
}

export interface MingQingPortraitGeometry {
  character:InkMingQingCharacter;
  sourceId:string;
  sourceObjectId:string;
  sourceReferences:string[];
  hairStyle:string;
  hairFiberCount:number;
  beardFiberCount:number;
  yaw:number;
  outline:string;
  features:{id:string;d:string}[];
  marks:{id:string;strength:number;d:string}[];
  irises:{side:"L"|"R";x:number;y:number;rx:number;ry:number}[];
  landmarks:Record<string,Point>;
  expression:ExpressionFeatures;
  faceWidthMm:number;
  mouthWidthMm:number;
  noseWidthMm:number;
  lowerFaceMm:number;
  top:number;
  left:number;
  right:number;
}

export function buildMingQingPortraitGeometry(
  character:InkMingQingCharacter,emotion:InkMingQingExpression,intensity:number,yawOverride?:number,
):MingQingPortraitGeometry{
  if(!INK_MING_QING_CHARACTERS.includes(character))throw new RangeError("Unknown ANAT5 character");
  if(!INK_MING_QING_EXPRESSIONS.includes(emotion)||(emotion!=="neutral"&&!findEmotion(emotion)))
    throw new RangeError("Unknown ANAT5 expression");
  if(!Number.isFinite(intensity)||intensity<0||intensity>1)
    throw new RangeError("ANAT5 expression intensity must be in [0,1]");
  const profile=PROFILES[character];
  const yaw=yawOverride??profile.yaw;
  if(!Number.isFinite(yaw)||yaw < -45||yaw > 45)
    throw new RangeError("ANAT5 yaw must be finite and in [-45,45]");
  const base=FACE_BASE[character];
  const expressed=emotion==="neutral"?expressFace({},base):expressEmotion(emotion,intensity,base);
  const frame=renderMeshFrame(
    expressed.mesh,{yaw,pitch:profile.pitch},
    {width:240,height:260,pixelsPerMetre:720,centerOnTarget:true,padding:0},
  );
  const map=(p:readonly number[]):Point=>[
    fmt(160+(p[0]-120)*1.12),fmt(164+(p[1]-130)*1.12),
  ];
  const pointAt=(index:number):Point=>map([frame.screen[index*3],frame.screen[index*3+1]]);
  const landmark=(name:LandmarkName)=>pointAt(FACE_LANDMARKS[name]);
  const outlinePoints=FACE_FEATURES.oval.loop.map(pointAt);
  const outline=smoothPath(outlinePoints,true);
  const features=faceFeatureLines(frame).filter(line=>line.id!=="oval")
    .map(line=>({id:line.id,d:smoothPath(line.points.map(map),false)}))
    .filter(line=>line.d.length>0);
  const depthAt=(x:number,y:number)=>{
    let best=Infinity,z=0;
    for(const v of expressed.vertices){
      const d=(v[0]-x)*(v[0]-x)+(v[1]-y)*(v[1]-y);
      if(d<best){best=d;z=v[2];}
    }
    return z;
  };
  const marks=expressionMarks(expressed).map(mark=>{
    const points=mark.points.map(([x,y])=>{
      const p=projectPoint(frame,[x/1000,y/1000,depthAt(x,y)/1000]);
      return map([p[0],p[1]]);
    });
    return {id:mark.id,strength:mark.strength,d:smoothPath(points,false)};
  }).filter(mark=>mark.d.length>0);
  const centres=eyeCentres(expressed.vertices),gaze=irisPositions(expressed);
  const irises=(["L","R"] as const).map(side=>{
    const p=projectPoint(frame,[gaze[side][0]/1000,gaze[side][1]/1000,centres[side][2]/1000]);
    const [x,y]=map([p[0],p[1]]);
    const nearIndex=FACE_LANDMARKS[side==="L"?"exocanthion.L":"exocanthion.R"];
    const farIndex=FACE_LANDMARKS[side==="L"?"exocanthion.R":"exocanthion.L"];
    const near=frame.vertexFacing[nearIndex]>=frame.vertexFacing[farIndex];
    const radius=gaze.r*frame.projection.scale/1000*1.12;
    return {side,x,y,rx:fmt(radius*.49*(near?1:.78)),ry:fmt(radius*.62)};
  });
  const landmarks={
    forehead:landmark("forehead"),glabella:landmark("glabella"),
    sellion:landmark("sellion"),pronasale:landmark("pronasale"),
    subnasale:landmark("subnasale"),menton:landmark("menton"),
    labialeSuperius:landmark("labiale-superius"),stomion:landmark("stomion"),
    labialeInferius:landmark("labiale-inferius"),sublabiale:landmark("sublabiale"),
    pogonion:landmark("pogonion"),
    alareL:landmark("alare.L"),alareR:landmark("alare.R"),
    zygionL:landmark("zygion.L"),zygionR:landmark("zygion.R"),
    gonionL:landmark("gonion.L"),gonionR:landmark("gonion.R"),
    cheekboneL:landmark("cheekbone.L"),cheekboneR:landmark("cheekbone.R"),
    mouthL:landmark("cheilion.L"),mouthR:landmark("cheilion.R"),
    eyeL:landmark("endocanthion.L"),eyeR:landmark("endocanthion.R"),
    exocanthionL:landmark("exocanthion.L"),exocanthionR:landmark("exocanthion.R"),
    endocanthionL:landmark("endocanthion.L"),endocanthionR:landmark("endocanthion.R"),
    upperLidL:landmark("palpebrale-superius.L"),upperLidR:landmark("palpebrale-superius.R"),
    lowerLidL:landmark("palpebrale-inferius.L"),lowerLidR:landmark("palpebrale-inferius.R"),
    browInnerL:landmark("brow-inner.L"),browInnerR:landmark("brow-inner.R"),
    browMidL:landmark("brow-mid.L"),browMidR:landmark("brow-mid.R"),
    browOuterL:landmark("brow-outer.L"),browOuterR:landmark("brow-outer.R"),
  };
  const measures=measureFace(expressed.vertices);
  const expression=expressionFeatures(expressed);
  const top=Math.min(...outlinePoints.map(p=>p[1]));
  const left=Math.min(...outlinePoints.map(p=>p[0]));
  const right=Math.max(...outlinePoints.map(p=>p[0]));
  return {
    character,sourceId:profile.sourceId,sourceObjectId:profile.sourceObjectId,
    sourceReferences:profile.sourceReferences,hairStyle:profile.hairStyle,hairFiberCount:profile.hairFiberCount,
    beardFiberCount:profile.beardFiberCount,yaw,outline,features,marks,irises,
    landmarks,expression,faceWidthMm:fmt(measures.zyZy),
    mouthWidthMm:fmt(measures.chCh),noseWidthMm:fmt(measures.alAl),
    lowerFaceMm:fmt(measures.snGn),top:fmt(top),left:fmt(left),right:fmt(right),
  };
}

function capOrHairPath(character:InkMingQingCharacter,g:MingQingPortraitGeometry){
  const l=g.left,r=g.right,t=g.top,c=(l+r)/2;
  if(character==="scholar"){
    const crown=t-61,band=t+10;
    return "M"+fmt(l-14)+" "+fmt(band)
      +" C"+fmt(l-19)+" "+fmt(t-4)+" "+fmt(l-12)+" "+fmt(t-34)+" "+fmt(l-5)+" "+fmt(crown+10)
      +" L"+fmt(c-25)+" "+fmt(crown)
      +" Q"+fmt(c)+" "+fmt(crown-3)+" "+fmt(c+23)+" "+fmt(crown)
      +" L"+fmt(r+6)+" "+fmt(crown+10)
      +" C"+fmt(r+15)+" "+fmt(t-31)+" "+fmt(r+18)+" "+fmt(t-5)+" "+fmt(r+13)+" "+fmt(band)
      +" Q"+fmt(c)+" "+fmt(band+15)+" "+fmt(l-14)+" "+fmt(band)+" Z";
  }
  if(character==="writer"){
    const crown=t-34;
    return "M"+fmt(l-13)+" "+fmt(t+13)
      +" C"+fmt(l-20)+" "+fmt(t-11)+" "+fmt(c-44)+" "+fmt(crown+6)+" "+fmt(c-18)+" "+fmt(crown+1)
      +" C"+fmt(c-4)+" "+fmt(crown-30)+" "+fmt(c+24)+" "+fmt(crown-24)+" "+fmt(c+26)+" "+fmt(crown-4)
      +" C"+fmt(c+49)+" "+fmt(crown-7)+" "+fmt(r+20)+" "+fmt(t-8)+" "+fmt(r+12)+" "+fmt(t+14)
      +" Q"+fmt(c)+" "+fmt(t+29)+" "+fmt(l-13)+" "+fmt(t+13)+" Z";
  }
  const crown=t-30;
  return "M"+fmt(l-12)+" "+fmt(t+12)
    +" C"+fmt(l-20)+" "+fmt(t-12)+" "+fmt(c-45)+" "+fmt(crown+8)+" "+fmt(c-24)+" "+fmt(crown+2)
    +" C"+fmt(c-10)+" "+fmt(crown-18)+" "+fmt(c+8)+" "+fmt(crown-21)+" "+fmt(c+18)+" "+fmt(crown-4)
    +" C"+fmt(c+40)+" "+fmt(crown-16)+" "+fmt(r+18)+" "+fmt(t-8)+" "+fmt(r+12)+" "+fmt(t+13)
    +" Q"+fmt(c)+" "+fmt(t+27)+" "+fmt(l-12)+" "+fmt(t+12)+" Z";
}

function collarPath(character:InkMingQingCharacter){
  if(character==="scholar")return "M111 279 Q126 306 160 331 Q194 306 209 279 L227 390 L93 390 Z";
  if(character==="writer")return "M119 282 Q128 309 160 328 Q190 307 201 282 L229 390 L91 390 Z";
  return "M116 281 Q131 309 157 325 Q188 306 205 280 L232 390 L88 390 Z";
}

export function InkMingQingCharacterStudy({
  character="scholar",emotion="neutral",intensity=.82,detail=1,yaw,className,style,
}:InkMingQingCharacterStudyProps){
  if(!INK_MING_QING_CHARACTERS.includes(character))throw new RangeError("Unknown ANAT5 character");
  if(!INK_MING_QING_EXPRESSIONS.includes(emotion)||(emotion!=="neutral"&&!findEmotion(emotion)))
    throw new RangeError("Unknown ANAT5 expression");
  if(!Number.isFinite(intensity)||intensity<0||intensity>1)
    throw new RangeError("ANAT5 expression intensity must be in [0,1]");
  if(!Number.isFinite(detail)||detail<.25||detail>1)
    throw new RangeError("ANAT5 detail must be in [.25,1]");
  if(yaw!==undefined&&(!Number.isFinite(yaw)||yaw < -45||yaw > 45))
    throw new RangeError("ANAT5 yaw must be finite and in [-45,45]");
  const uid="km-anat5-"+useId().replace(/[^a-zA-Z0-9_-]/g,"");
  const g=useMemo(()=>buildMingQingPortraitGeometry(character,emotion,intensity,yaw),
    [character,emotion,intensity,yaw]);
  const p=PROFILES[character];
  const cx=(g.left+g.right)/2;
  const earY=(g.landmarks.zygionL[1]+g.landmarks.zygionR[1])/2;
  const neckTop=g.landmarks.menton[1]-2;
  const neckLeft=g.landmarks.menton[0]-19;
  const neckRight=g.landmarks.menton[0]+19;
  const mouthY=(g.landmarks.mouthL[1]+g.landmarks.mouthR[1])/2;
  const mouthOpen=clamp(g.expression.mouthOpen*14,0,12);
  const mouthPath="M"+fmt(g.landmarks.mouthL[0])+" "+fmt(mouthY)
    +" Q"+fmt(cx)+" "+fmt(mouthY-mouthOpen)+" "+fmt(g.landmarks.mouthR[0])+" "+fmt(mouthY)
    +" Q"+fmt(cx)+" "+fmt(mouthY+mouthOpen*.72)+" "+fmt(g.landmarks.mouthL[0])+" "+fmt(mouthY)+" Z";
  const eyes=(["L","R"] as const).map(side=>{
    const outer=g.landmarks["exocanthion"+side],inner=g.landmarks["endocanthion"+side];
    const upper=g.landmarks["upperLid"+side],lower=g.landmarks["lowerLid"+side];
    const d="M"+fmt(outer[0])+" "+fmt(outer[1])
      +" Q"+fmt(upper[0])+" "+fmt(upper[1])+" "+fmt(inner[0])+" "+fmt(inner[1])
      +" Q"+fmt(lower[0])+" "+fmt(lower[1])+" "+fmt(outer[0])+" "+fmt(outer[1])+" Z";
    const fold="M"+fmt(outer[0])+" "+fmt(outer[1]-3.2)
      +" Q"+fmt(upper[0])+" "+fmt(upper[1]-5.2)+" "+fmt(inner[0])+" "+fmt(inner[1]-2.7);
    const rim="M"+fmt(outer[0])+" "+fmt(outer[1]+2.2)
      +" Q"+fmt(lower[0])+" "+fmt(lower[1]+3.1)+" "+fmt(inner[0])+" "+fmt(inner[1]+1.7);
    return {side,outer,inner,upper,lower,d,fold,rim};
  });
  const brows=(["L","R"] as const).map(side=>({
    side,a:g.landmarks["browInner"+side],b:g.landmarks["browMid"+side],c:g.landmarks["browOuter"+side],
  }));
  const lipPath="M"+fmt(g.landmarks.mouthL[0])+" "+fmt(g.landmarks.mouthL[1])
    +" Q"+fmt(g.landmarks.labialeSuperius[0]-4)+" "+fmt(g.landmarks.labialeSuperius[1]-3)
    +" "+fmt(g.landmarks.labialeSuperius[0])+" "+fmt(g.landmarks.labialeSuperius[1])
    +" Q"+fmt(g.landmarks.labialeSuperius[0]+4)+" "+fmt(g.landmarks.labialeSuperius[1]-3)
    +" "+fmt(g.landmarks.mouthR[0])+" "+fmt(g.landmarks.mouthR[1])
    +" Q"+fmt(g.landmarks.labialeInferius[0])+" "+fmt(g.landmarks.labialeInferius[1]+3)
    +" "+fmt(g.landmarks.mouthL[0])+" "+fmt(g.landmarks.mouthL[1])+" Z";
  const hairPath=capOrHairPath(character,g);
  const hairCount=Math.max(0,Math.round(g.hairFiberCount*detail));
  const beardCount=Math.max(0,Math.round(g.beardFiberCount*detail));
  const capCount=character==="scholar"?Math.max(12,Math.round(42*detail)):0;
  const shoulderPath=character==="scholar"
    ?"M7 390 C18 358 42 325 83 306 Q111 294 137 305 L160 333 L183 305 Q209 294 237 306 C278 325 302 358 313 390 Z"
    :character==="writer"
      ?"M6 390 C20 355 49 323 91 304 Q122 295 145 321 Q160 337 175 321 Q198 295 229 304 C271 323 300 355 314 390 Z"
      :"M8 390 C22 357 48 326 88 307 Q116 298 143 319 Q160 333 177 319 Q204 298 232 307 C272 326 298 357 312 390 Z";
  return <svg className={className} style={{display:"block",width:"100%",height:"auto",...style}}
    xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 390" role="img"
    aria-label={character+" Chinese ink portrait study"}
    data-km-ink-anat5="true" data-km-ink-anat5-character={character}
    data-km-ink-anat5-source={g.sourceId} data-km-ink-anat5-source-object={g.sourceObjectId} data-km-ink-anat5-source-references={g.sourceReferences.join(" | ")}
    data-km-ink-anat5-hair-style={g.hairStyle} data-km-ink-anat5-yaw={fmt(g.yaw)}
    data-km-anat1-source="468-point-face-mesh"
    data-km-anat1-face-width-mm={fmt(g.faceWidthMm)}
    data-km-anat1-mouth-width-mm={fmt(g.mouthWidthMm)}
    data-km-anat1-nose-width-mm={fmt(g.noseWidthMm)}
    data-km-anat1-lower-face-mm={fmt(g.lowerFaceMm)}
    data-km-anat1-feature-count={g.features.length}
    data-km-expr1-emotion={emotion} data-km-expr1-mark-count={g.marks.length}
    data-km-ink-anat5-hair-fiber-count={hairCount}
    data-km-ink-anat5-beard-fiber-count={beardCount}>
    <defs>
      <clipPath id={uid+"-face"}><path d={g.outline}/></clipPath>
      <filter id={uid+"-wet"} x="-35%" y="-35%" width="170%" height="170%">
        <feGaussianBlur stdDeviation="2.1"/>
      </filter>
      <filter id={uid+"-soft"} x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation=".8"/>
      </filter>
      <filter id={uid+"-wash-edge"} x="-30%" y="-30%" width="160%" height="160%">
        <feTurbulence type="fractalNoise" baseFrequency=".035 .055" numOctaves="2" seed="17" result="paper-noise"/>
        <feDisplacementMap in="SourceGraphic" in2="paper-noise" scale="1.15" xChannelSelector="R" yChannelSelector="G"/>
        <feGaussianBlur stdDeviation=".32"/>
      </filter>
      <linearGradient id={uid+"-skin"} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#f7ead7"/>
        <stop offset="46%" stopColor={p.skin}/>
        <stop offset="100%" stopColor="#d8bda2"/>
      </linearGradient>
    </defs>
    <rect width="320" height="390" fill="#f1e8d9"/>
    <g data-km-ink-anat5-paper-fibre="source-layer" opacity=".24">
      {Array.from({length:38},(_,i)=>{
        const x=(i*47)%320,y=(i*71)%390;
        return <path key={i} d={"M"+x+" "+y+" q"+(i%2?3:-2)+" "+(i%5+1)+" "+(i%3+1)+" "+(i%7+2)}
          fill="none" stroke={i%3===0?"#9d8b72":"#fff8e9"}
          strokeWidth={.28+(i%4)*.12} opacity={.22+(i%5)*.035}/>;
      })}
    </g>
    <g data-km-ink-anat5-upper-body="anatomical-shoulder-and-collar-mass">
      <path d={shoulderPath} fill={p.robe} stroke={p.ink} strokeWidth=".8" strokeOpacity=".42"/>
      <path d="M39 345 Q77 309 111 300 Q131 311 160 335 Q189 311 209 300 Q247 309 281 345"
        fill="none" stroke={p.wash} strokeWidth="8" opacity=".08" filter={"url(#"+uid+"-wet)"}/>
      <path d={collarPath(character)} fill="#e9decb" stroke={p.ink} strokeWidth=".78" strokeOpacity=".48"/>
      <path d="M111 280 Q127 310 160 331 Q193 310 209 280"
        fill="none" stroke={p.ink} strokeWidth="1.05" opacity=".55"/>
      <path d="M126 291 Q141 316 160 325 Q180 315 194 291"
        fill="none" stroke="#fff8e9" strokeWidth="2.1" opacity=".42"/>
      {character!=="scholar"&&<g data-km-ink-anat5-collar-embroidery="separate-threaded-motifs">
        {Array.from({length:18},(_,i)=>{
          const side=i<9?-1:1,n=i%9,t=(n+.5)/9;
          const x=160+side*(7+t*34),y=293+t*32;
          return <g key={i} data-km-ink-anat5-collar-motif={i} transform={"translate("+fmt(x)+" "+fmt(y)+") rotate("+(side*24)+")"}>
            <path d="M0 0 q-2.4 -3.6 0 -6.4 q2.8 2.8 0 6.4 q-2.8 2.5 0 5.2 q2.4 -2.8 0 -5.2"
              fill="none" stroke={i%3===0?p.accent:"#8b795f"} strokeWidth={.55+(i%3)*.1} opacity=".58"/>
            <path d="M-1.5 0 q1.5 -1.5 3 0" fill="none" stroke="#f5e7d4" strokeWidth=".42" opacity=".7"/>
          </g>;
        })}
      </g>}
      {Array.from({length:18},(_,i)=>{
        const t=i/17,x=42+t*236;
        const startY=311+(i%4)*9;
        const endX=x+(i%2?9:-7)+(Math.sin(i*1.8)*5);
        const endY=388-(i%5)*12;
        return <path key={i} data-km-ink-anat5-robe-fold={i}
          d={"M"+fmt(x)+" "+startY+" C"+fmt(x+(i%3-1)*13)+" "+(startY+22)
            +" "+fmt(endX+(i%4)*3)+" "+(endY-20)+" "+fmt(endX)+" "+endY}
          fill="none" stroke={i%4===0?"#fff7e7":p.ink}
          strokeWidth={.42+(i%5)*.17} opacity={.16+(i%6)*.045}/>;
      })}
      <path d="M26 367 Q58 346 88 354 M231 354 Q263 346 294 367"
        fill="none" stroke={p.accent} strokeWidth=".65" opacity=".26"/>
    </g>
    <g data-km-ink-anat5-headwear={g.hairStyle}>
      <path d={hairPath} fill={p.hair} stroke={p.ink} strokeWidth=".72" strokeOpacity=".75"/>
      {character==="scholar"&&<g data-km-ink-anat5-cap-band="separate-woven-band">
        <path d={"M"+fmt(g.left-11)+" "+fmt(g.top+9)+" Q"+fmt(cx)+" "+fmt(g.top+19)+" "+fmt(g.right+11)+" "+fmt(g.top+9)}
          fill="none" stroke="#b6a48a" strokeWidth="2.1" opacity=".58"/>
        <path d={"M"+fmt(g.left-7)+" "+fmt(g.top+13)+" Q"+fmt(cx)+" "+fmt(g.top+23)+" "+fmt(g.right+8)+" "+fmt(g.top+13)}
          fill="none" stroke={p.ink} strokeWidth=".5" opacity=".6"/>
        <path data-km-ink-anat5-cap-front-panel="woven-black-cloth"
          d={"M"+fmt(cx-24)+" "+fmt(g.top-52)+" Q"+fmt(cx)+" "+fmt(g.top-57)+" "+fmt(cx+22)+" "+fmt(g.top-52)
            +" L"+fmt(cx+20)+" "+fmt(g.top+6)+" Q"+fmt(cx)+" "+fmt(g.top+12)+" "+fmt(cx-20)+" "+fmt(g.top+6)+" Z"}
          fill="#42423d" opacity=".54"/>
        <path data-km-ink-anat5-cap-crown-seam="raised-edge"
          d={"M"+fmt(cx-24)+" "+fmt(g.top-52)+" Q"+fmt(cx)+" "+fmt(g.top-57)+" "+fmt(cx+22)+" "+fmt(g.top-52)}
          fill="none" stroke="#c1b39a" strokeWidth=".8" opacity=".54"/>
        <path data-km-ink-anat5-cap-side-seam="L"
          d={"M"+fmt(cx-24)+" "+fmt(g.top-52)+" Q"+fmt(cx-29)+" "+fmt(g.top-20)+" "+fmt(g.left-11)+" "+fmt(g.top+8)}
          fill="none" stroke="#b5a58c" strokeWidth=".7" opacity=".46"/>
        <path data-km-ink-anat5-cap-side-seam="R"
          d={"M"+fmt(cx+22)+" "+fmt(g.top-52)+" Q"+fmt(cx+28)+" "+fmt(g.top-20)+" "+fmt(g.right+11)+" "+fmt(g.top+8)}
          fill="none" stroke="#b5a58c" strokeWidth=".7" opacity=".42"/>
        {Array.from({length:capCount},(_,i)=>{
          const t=i/Math.max(1,capCount-1),x=g.left-7+t*(g.right-g.left+14);
          const y=g.top-9-38*Math.sin(t*Math.PI);
          return <path key={i} data-km-ink-anat5-cap-fiber={i}
            d={"M"+fmt(x)+" "+fmt(g.top+5)+" Q"+fmt(x+Math.sin(i*1.4)*3)+" "+fmt(y+16)
              +" "+fmt(x+Math.cos(i*.9)*4)+" "+fmt(y)}
            fill="none" stroke={i%5===0?"#c3b49b":"#141715"}
            strokeWidth={.32+(i%4)*.12} opacity={(.22+(i%4)*.025)*detail}/>;
        })}
        {Array.from({length:11},(_,i)=>{
          const x=cx-17+i*3.4,y=g.top-40+(i%3)*2;
          return <path key={i} data-km-ink-anat5-cap-weave={i}
            d={"M"+fmt(x)+" "+fmt(y)+" q1.8 1.6 3.2 0"}
            fill="none" stroke="#c5b69d" strokeWidth=".42" opacity=".28*detail"/>;
        })}
      </g>}
      {character!=="scholar"&&<g data-km-ink-anat5-pinned-hair="separate-locks">
        {Array.from({length:hairCount},(_,i)=>{
          const t=i/Math.max(1,hairCount-1);
          const rootX=g.left-4+t*(g.right-g.left+8);
          const rootY=g.top+8+Math.sin(t*Math.PI)*2;
          const side=character==="writer"?(t<.5?-1:1):(i%2?-1:1);
          const endX=cx+side*(12+(i%9)*2.1);
          const endY=g.top-15-(i%7)*2.4;
          const midX=(rootX+endX)/2+Math.sin(i*1.31)*4;
          return <path key={i} data-km-ink-anat5-hair-fiber={i}
            d={"M"+fmt(rootX)+" "+fmt(rootY)+" C"+fmt(midX-5)+" "+fmt(rootY-16)
              +" "+fmt(midX+4)+" "+fmt(endY+11)+" "+fmt(endX)+" "+fmt(endY)}
            fill="none" stroke={i%6===0?"#bba88f":p.hair}
            strokeWidth={.28+(i%5)*.13} strokeLinecap="round" opacity={(.22+(i%7)*.045)*detail}/>;
        })}
        <path d={"M"+fmt(cx-3)+" "+fmt(g.top-23)+" Q"+fmt(cx+12)+" "+fmt(g.top-39)+" "+fmt(cx+23)+" "+fmt(g.top-18)}
          fill="none" stroke="#c0a77f" strokeWidth="1.2" opacity=".68"/>
        <path d={"M"+fmt(cx+20)+" "+fmt(g.top-18)+" Q"+fmt(cx+34)+" "+fmt(g.top-33)+" "+fmt(cx+42)+" "+fmt(g.top-22)}
          fill="none" stroke={p.accent} strokeWidth="1.5" opacity=".78"/>
        {character==="writer"&&<g data-km-ink-anat5-writer-hair-ornament="floral-coil">
          <path d={"M"+fmt(cx-18)+" "+fmt(g.top-15)+" C"+fmt(cx-33)+" "+fmt(g.top-33)+" "+fmt(cx-9)+" "+fmt(g.top-47)+" "+fmt(cx+5)+" "+fmt(g.top-31)
            +" C"+fmt(cx+15)+" "+fmt(g.top-19)+" "+fmt(cx+4)+" "+fmt(g.top-8)+" "+fmt(cx-18)+" "+fmt(g.top-15)+" Z"}
            fill="#1f211e" stroke="#4c4940" strokeWidth=".65"/>
          <path d={"M"+fmt(cx-18)+" "+fmt(g.top-23)+" Q"+fmt(cx-5)+" "+fmt(g.top-39)+" "+fmt(cx+4)+" "+fmt(g.top-23)}
            fill="none" stroke="#b8a27c" strokeWidth=".8" opacity=".68"/>
          <path d={"M"+fmt(cx+21)+" "+fmt(g.top-23)+" q5 -10 10 -4 q-2 8 -10 4 q-8 3 -8 -5 q8 -5 8 5"}
            fill={p.accent} stroke="#c6a875" strokeWidth=".55" opacity=".88"/>
          <circle cx={cx+21} cy={g.top-23} r="1.8" fill="#e7c78e"/>
        </g>}
        {character==="attendant"&&<g data-km-ink-anat5-attendant-hair-pins="paired-coils">
          <path d={"M"+fmt(cx-28)+" "+fmt(g.top-17)+" C"+fmt(cx-42)+" "+fmt(g.top-30)+" "+fmt(cx-27)+" "+fmt(g.top-44)+" "+fmt(cx-12)+" "+fmt(g.top-29)
            +" Q"+fmt(cx-7)+" "+fmt(g.top-17)+" "+fmt(cx-28)+" "+fmt(g.top-17)+" Z"}
            fill="#20221f" stroke="#4b463d" strokeWidth=".6"/>
          <path d={"M"+fmt(cx+10)+" "+fmt(g.top-22)+" C"+fmt(cx+21)+" "+fmt(g.top-42)+" "+fmt(cx+42)+" "+fmt(g.top-32)+" "+fmt(cx+31)+" "+fmt(g.top-15)
            +" Q"+fmt(cx+18)+" "+fmt(g.top-9)+" "+fmt(cx+10)+" "+fmt(g.top-22)+" Z"}
            fill="#20221f" stroke="#4b463d" strokeWidth=".6"/>
          <path d={"M"+fmt(cx-26)+" "+fmt(g.top-38)+" Q"+fmt(cx-5)+" "+fmt(g.top-50)+" "+fmt(cx+17)+" "+fmt(g.top-39)}
            fill="none" stroke="#b8a27c" strokeWidth="1" opacity=".78"/>
          <path d={"M"+fmt(cx+13)+" "+fmt(g.top-42)+" l14 -9 M"+fmt(cx-23)+" "+fmt(g.top-41)+" l-12 -8"}
            fill="none" stroke="#b38c55" strokeWidth="1.1" strokeLinecap="round"/>
          <circle cx={cx+27} cy={g.top-51} r="2" fill={p.accent}/>
          <circle cx={cx-35} cy={g.top-49} r="1.8" fill="#bda36f"/>
        </g>}
      </g>}
    </g>
    <g data-km-ink-anat5-ears="anatomical-support">
      <path d={"M"+fmt(g.right+2)+" "+fmt(earY-11)+" C"+fmt(g.right+18)+" "+fmt(earY-16)
        +" "+fmt(g.right+22)+" "+fmt(earY+12)+" "+fmt(g.right+4)+" "+fmt(earY+17)}
        fill="#ddc7ad" stroke={p.ink} strokeWidth=".7" opacity=".74"/>
      <path d={"M"+fmt(g.right+7)+" "+fmt(earY-3)+" Q"+fmt(g.right+16)+" "+fmt(earY+2)+" "+fmt(g.right+7)+" "+fmt(earY+10)}
        fill="none" stroke={p.ink} strokeWidth=".55" opacity=".54"/>
      <path d={"M"+fmt(g.left-2)+" "+fmt(earY-8)+" C"+fmt(g.left-13)+" "+fmt(earY-12)
        +" "+fmt(g.left-17)+" "+fmt(earY+9)+" "+fmt(g.left-3)+" "+fmt(earY+14)}
        fill="#ddc7ad" stroke={p.ink} strokeWidth=".6" opacity=".42"/>
    </g>
    <path d={"M"+fmt(neckLeft)+" "+fmt(neckTop)+" C"+fmt(neckLeft-4)+" 301 121 316 129 323"
      +" Q160 345 191 323 C199 316 "+fmt(neckRight+4)+" 301 "+fmt(neckRight)+" "+fmt(neckTop)+" Z"}
      fill="#d3b99e" opacity=".9"/>
    <path d={g.outline} fill={"url(#"+uid+"-skin)"} stroke={p.ink} strokeWidth=".7" strokeOpacity=".38"/>
    <g clipPath={"url(#"+uid+"-face)"} data-km-ink-anat5-facial-wash-planes="forehead-orbit-malar-nose-jaw">
      <path d={"M"+fmt(g.landmarks.forehead[0]-35)+" "+fmt(g.landmarks.forehead[1]+6)
        +" C"+fmt(g.landmarks.forehead[0]-19)+" "+fmt(g.landmarks.forehead[1]-18)
        +" "+fmt(g.landmarks.forehead[0]+18)+" "+fmt(g.landmarks.forehead[1]-14)
        +" "+fmt(g.landmarks.forehead[0]+34)+" "+fmt(g.landmarks.forehead[1]+8)
        +" C"+fmt(cx+10)+" "+fmt(g.landmarks.sellion[1]-4)+" "+fmt(cx-21)+" "+fmt(g.landmarks.sellion[1]-1)
        +" "+fmt(g.landmarks.forehead[0]-35)+" "+fmt(g.landmarks.forehead[1]+6)+" Z"}
        fill="#fff7e8" opacity=".34" filter={"url(#"+uid+"-wet)"}/>
      <path d={"M"+fmt(g.landmarks.cheekboneL[0]-9)+" "+fmt(g.landmarks.cheekboneL[1]-1)
        +" C"+fmt(g.landmarks.cheekboneL[0]-20)+" "+fmt(g.landmarks.cheekboneL[1]+12)
        +" "+fmt(g.landmarks.gonionL[0]+8)+" "+fmt(g.landmarks.gonionL[1]-8)
        +" "+fmt(g.landmarks.mouthL[0]+2)+" "+fmt(g.landmarks.mouthL[1]+10)
        +" Q"+fmt(g.landmarks.cheekboneL[0]+2)+" "+fmt(g.landmarks.cheekboneL[1]+20)
        +" "+fmt(g.landmarks.cheekboneL[0]-9)+" "+fmt(g.landmarks.cheekboneL[1]-1)+" Z"}
        fill={p.wash} opacity=".16" filter={"url(#"+uid+"-wet)"}/>
      <path d={"M"+fmt(g.landmarks.cheekboneR[0]+8)+" "+fmt(g.landmarks.cheekboneR[1]-1)
        +" C"+fmt(g.landmarks.cheekboneR[0]+18)+" "+fmt(g.landmarks.cheekboneR[1]+12)
        +" "+fmt(g.landmarks.gonionR[0]-7)+" "+fmt(g.landmarks.gonionR[1]-8)
        +" "+fmt(g.landmarks.mouthR[0]-1)+" "+fmt(g.landmarks.mouthR[1]+10)
        +" Q"+fmt(g.landmarks.cheekboneR[0]-2)+" "+fmt(g.landmarks.cheekboneR[1]+18)
        +" "+fmt(g.landmarks.cheekboneR[0]+8)+" "+fmt(g.landmarks.cheekboneR[1]-1)+" Z"}
        fill={p.wash} opacity=".12" filter={"url(#"+uid+"-wet)"}/>
      <path d={"M"+fmt(g.landmarks.sellion[0]-8)+" "+fmt(g.landmarks.sellion[1]+2)
        +" Q"+fmt(g.landmarks.pronasale[0]-8)+" "+fmt(g.landmarks.pronasale[1]+3)
        +" "+fmt(g.landmarks.subnasale[0]-7)+" "+fmt(g.landmarks.subnasale[1]+4)
        +" Q"+fmt(g.landmarks.pronasale[0]+9)+" "+fmt(g.landmarks.pronasale[1]+7)
        +" "+fmt(g.landmarks.sellion[0]+7)+" "+fmt(g.landmarks.sellion[1]+2)}
        fill="none" stroke={p.wash} strokeWidth="6.5" opacity=".12" filter={"url(#"+uid+"-soft)"}/>
      <path d={"M"+fmt(g.landmarks.menton[0]-20)+" "+fmt(g.landmarks.menton[1]-7)
        +" Q"+fmt(cx)+" "+fmt(g.landmarks.menton[1]+10)
        +" "+fmt(g.landmarks.menton[0]+20)+" "+fmt(g.landmarks.menton[1]-7)}
        fill="none" stroke="#6f5747" strokeWidth="8" opacity=".09" filter={"url(#"+uid+"-wet)"}/>
      {Array.from({length:22},(_,i)=>{
        const t=i/21,x=g.left+8+t*(g.right-g.left-16);
        const y=g.landmarks.cheekboneL[1]+16+(i%5)*3;
        return <path key={i} d={"M"+fmt(x)+" "+fmt(y)+" q"+fmt(Math.sin(i*1.7)*3)+" 2 "+fmt(Math.cos(i*.9)*4)+" "+(4+i%4)}
          fill="none" stroke={i%4===0?"#fff6e8":p.wash}
          strokeWidth={.32+(i%3)*.14} opacity={.13*detail}/>;
      })}
    </g>
    <g data-km-ink-anat5-landmark-facial-planes="nose-philtrum-lips-chin">
      <path data-km-ink-anat5-nose-bridge-wash="true"
        d={"M"+fmt(g.landmarks.sellion[0]-4)+" "+fmt(g.landmarks.sellion[1]+2)
          +" C"+fmt(g.landmarks.sellion[0]-8)+" "+fmt(g.landmarks.pronasale[1]-7)
          +" "+fmt(g.landmarks.pronasale[0]-6)+" "+fmt(g.landmarks.pronasale[1]-2)
          +" "+fmt(g.landmarks.subnasale[0]-5)+" "+fmt(g.landmarks.subnasale[1]+2)
          +" Q"+fmt(g.landmarks.pronasale[0]+4)+" "+fmt(g.landmarks.pronasale[1]+6)
          +" "+fmt(g.landmarks.sellion[0]+5)+" "+fmt(g.landmarks.sellion[1]+2)+" Z"}
        fill={p.wash} opacity=".14" filter={"url(#"+uid+"-wash-edge)"}/>
      <path data-km-ink-anat5-nose-sidewall="L"
        d={"M"+fmt(g.landmarks.sellion[0]-5)+" "+fmt(g.landmarks.sellion[1]+3)
          +" Q"+fmt(g.landmarks.alareL[0]-4)+" "+fmt(g.landmarks.pronasale[1]+4)
          +" "+fmt(g.landmarks.alareL[0])+" "+fmt(g.landmarks.alareL[1]+1)}
        fill="none" stroke={p.wash} strokeWidth="3.6" strokeLinecap="round" opacity=".17" filter={"url(#"+uid+"-soft)"}/>
      <path data-km-ink-anat5-nose-sidewall="R"
        d={"M"+fmt(g.landmarks.sellion[0]+5)+" "+fmt(g.landmarks.sellion[1]+3)
          +" Q"+fmt(g.landmarks.alareR[0]+4)+" "+fmt(g.landmarks.pronasale[1]+4)
          +" "+fmt(g.landmarks.alareR[0])+" "+fmt(g.landmarks.alareR[1]+1)}
        fill="none" stroke={p.wash} strokeWidth="3.6" strokeLinecap="round" opacity=".14" filter={"url(#"+uid+"-soft)"}/>
      <path d={"M"+fmt(g.landmarks.pronasale[0]-4)+" "+fmt(g.landmarks.pronasale[1]-1)
        +" Q"+fmt(g.landmarks.pronasale[0])+" "+fmt(g.landmarks.pronasale[1]+3)
        +" "+fmt(g.landmarks.pronasale[0]+4)+" "+fmt(g.landmarks.pronasale[1]-1)}
        fill="none" stroke="#fff7e8" strokeWidth="1.4" opacity=".54" strokeLinecap="round"/>
      <ellipse data-km-ink-anat5-nostril="L" cx={g.landmarks.alareL[0]+1.1}
        cy={g.landmarks.alareL[1]+1.8} rx="1.7" ry=".78" fill="#594338" opacity=".48"/>
      <ellipse data-km-ink-anat5-nostril="R" cx={g.landmarks.alareR[0]-1.1}
        cy={g.landmarks.alareR[1]+1.8} rx="1.7" ry=".78" fill="#594338" opacity=".42"/>
      <path data-km-ink-anat5-alar-rim="L"
        d={"M"+fmt(g.landmarks.alareL[0]-4)+" "+fmt(g.landmarks.alareL[1]+1)
          +" Q"+fmt(g.landmarks.alareL[0])+" "+fmt(g.landmarks.alareL[1]-2)
          +" "+fmt(g.landmarks.alareL[0]+3)+" "+fmt(g.landmarks.alareL[1]+1)}
        fill="none" stroke={p.ink} strokeWidth=".55" opacity=".38"/>
      <path data-km-ink-anat5-alar-rim="R"
        d={"M"+fmt(g.landmarks.alareR[0]-3)+" "+fmt(g.landmarks.alareR[1]+1)
          +" Q"+fmt(g.landmarks.alareR[0])+" "+fmt(g.landmarks.alareR[1]-2)
          +" "+fmt(g.landmarks.alareR[0]+4)+" "+fmt(g.landmarks.alareR[1]+1)}
        fill="none" stroke={p.ink} strokeWidth=".55" opacity=".34"/>
      <path data-km-ink-anat5-philtrum="L"
        d={"M"+fmt(g.landmarks.subnasale[0]-3)+" "+fmt(g.landmarks.subnasale[1]+2)
          +" Q"+fmt(g.landmarks.labialeSuperius[0]-5)+" "+fmt(g.landmarks.stomion[1]-1)
          +" "+fmt(g.landmarks.labialeSuperius[0]-3)+" "+fmt(g.landmarks.labialeSuperius[1])}
        fill="none" stroke={p.wash} strokeWidth=".8" opacity=".48"/>
      <path data-km-ink-anat5-philtrum="R"
        d={"M"+fmt(g.landmarks.subnasale[0]+3)+" "+fmt(g.landmarks.subnasale[1]+2)
          +" Q"+fmt(g.landmarks.labialeSuperius[0]+5)+" "+fmt(g.landmarks.stomion[1]-1)
          +" "+fmt(g.landmarks.labialeSuperius[0]+3)+" "+fmt(g.landmarks.labialeSuperius[1])}
        fill="none" stroke={p.wash} strokeWidth=".8" opacity=".42"/>
      <path data-km-ink-anat5-lip-volume="vermilion-border" d={lipPath}
        fill="#9a6d5c" opacity=".22"/>
      <path data-km-ink-anat5-lip-highlight="lower-vermilion"
        d={"M"+fmt(g.landmarks.mouthL[0]+3)+" "+fmt(g.landmarks.mouthL[1]+1)
          +" Q"+fmt(g.landmarks.labialeInferius[0])+" "+fmt(g.landmarks.labialeInferius[1]+2)
          +" "+fmt(g.landmarks.mouthR[0]-3)+" "+fmt(g.landmarks.mouthR[1]+1)}
        fill="none" stroke="#f7e6d2" strokeWidth="1" opacity=".6" strokeLinecap="round"/>
      <path data-km-ink-anat5-nasolabial="L"
        d={"M"+fmt(g.landmarks.alareL[0]-1)+" "+fmt(g.landmarks.alareL[1]+2)
          +" Q"+fmt(g.landmarks.mouthL[0]-8)+" "+fmt(g.landmarks.mouthL[1]+8)
          +" "+fmt(g.landmarks.mouthL[0]+1)+" "+fmt(g.landmarks.mouthL[1]+13)}
        fill="none" stroke={p.wash} strokeWidth="1.05" opacity=".32"/>
      <path data-km-ink-anat5-nasolabial="R"
        d={"M"+fmt(g.landmarks.alareR[0]+1)+" "+fmt(g.landmarks.alareR[1]+2)
          +" Q"+fmt(g.landmarks.mouthR[0]+8)+" "+fmt(g.landmarks.mouthR[1]+8)
          +" "+fmt(g.landmarks.mouthR[0]-1)+" "+fmt(g.landmarks.mouthR[1]+13)}
        fill="none" stroke={p.wash} strokeWidth="1.05" opacity=".28"/>
      <path data-km-ink-anat5-chin-plane="sub-labial"
        d={"M"+fmt(g.landmarks.sublabiale[0]-12)+" "+fmt(g.landmarks.sublabiale[1]-2)
          +" Q"+fmt(g.landmarks.menton[0])+" "+fmt(g.landmarks.menton[1]+6)
          +" "+fmt(g.landmarks.sublabiale[0]+12)+" "+fmt(g.landmarks.sublabiale[1]-2)}
        fill="none" stroke={p.wash} strokeWidth="4.8" opacity=".13" filter={"url(#"+uid+"-soft)"}/>
    </g>
    <g data-km-anat1-projected-features="true">
      {eyes.map(eye=><g key={eye.side} data-km-ink-anat5-eye-anatomy={eye.side}>
        <path data-km-ink-anat5-eye-aperture={eye.side} d={eye.d} fill="#f6ead9" opacity=".72"/>
        <path data-km-ink-anat5-eye-lid-fold={eye.side} d={eye.fold}
          fill="none" stroke={p.wash} strokeWidth=".68" opacity=".54"/>
        <path data-km-ink-anat5-eye-lower-rim={eye.side} d={eye.rim}
          fill="none" stroke="#fff5e6" strokeWidth=".72" opacity=".48"/>
        <path d={"M"+fmt(eye.outer[0])+" "+fmt(eye.outer[1])
          +" q"+(eye.side==="L"?-2.4:2.4)+" -1.8 "+(eye.side==="L"?-3.7:3.7)+" -3.4"}
          fill="none" stroke={p.ink} strokeWidth=".52" opacity=".55"/>
        {Array.from({length:5},(_,i)=>{
          const t=.12+i*.16,pt=quadPoint(eye.outer,eye.upper,eye.inner,t);
          const side=eye.side==="L"?-1:1;
          return <path key={i} data-km-ink-anat5-lash={eye.side+"-"+i}
            d={"M"+fmt(pt[0])+" "+fmt(pt[1])
              +" q"+fmt(side*(1.1+i*.18))+" "+fmt(-1.5-i*.16)
              +" "+fmt(side*(2.0+i*.2))+" "+fmt(-2.5-i*.22)}
            fill="none" stroke={p.ink} strokeWidth={.35+(i%2)*.12} opacity=".48"/>;
        })}
      </g>)}
      {g.irises.map(eye=><g key={eye.side} data-km-anat1-iris={eye.side}>
        <ellipse cx={eye.x} cy={eye.y} rx={eye.rx} ry={eye.ry} fill="#755a43" opacity=".84"/>
        <ellipse cx={eye.x} cy={eye.y} rx={eye.rx*.76} ry={eye.ry*.9}
          fill="none" stroke="#c4a27c" strokeWidth=".36" opacity=".72"/>
        <ellipse cx={eye.x} cy={eye.y} rx={eye.rx*.43} ry={eye.ry*.76} fill="#211e1a"/>
        <path d={"M"+fmt(eye.x-eye.rx*.28)+" "+fmt(eye.y-eye.ry*.35)+" q1.4 -1.4 2.7 .1"}
          fill="none" stroke="#fff5e5" strokeWidth=".8" opacity=".8"/>
      </g>)}
      {g.expression.mouthOpen>.035&&<path d={mouthPath} fill="#613d34" opacity=".76"/>}
      {g.features.map((f,i)=>{
        const brow=f.id.startsWith("brow"),eye=f.id.startsWith("eye");
        const nose=f.id.startsWith("nose"),lip=f.id.startsWith("lips")||f.id==="mouth-line";
        return <path key={f.id+"-"+i} data-km-anat1-feature={f.id} d={f.d}
          fill="none" stroke={lip?"#755548":p.ink}
          strokeWidth={brow ? 1.05 : eye ? 0.82 : nose ? 0.68 : lip ? 0.72 : 0.5}
          strokeLinecap="round" strokeLinejoin="round"
          opacity={brow ? 0.68 : eye ? 0.78 : nose ? 0.56 : lip ? 0.75 : 0.48}/>;
      })}
      {brows.map(brow=><g key={brow.side} data-km-ink-anat5-brow-anatomy={brow.side}>
        <path d={"M"+fmt(brow.a[0])+" "+fmt(brow.a[1])
          +" Q"+fmt(brow.b[0])+" "+fmt(brow.b[1])+" "+fmt(brow.c[0])+" "+fmt(brow.c[1])}
          fill="none" stroke={p.ink} strokeWidth="1.25" opacity=".42" strokeLinecap="round"/>
        {Array.from({length:14},(_,i)=>{
          const t=(i+.25)/14,pt=quadPoint(brow.a,brow.b,brow.c,t);
          const direction=brow.side==="L"?-1:1;
          return <path key={i} data-km-ink-anat5-brow-fiber={brow.side+"-"+i}
            d={"M"+fmt(pt[0])+" "+fmt(pt[1])
              +" q"+fmt(direction*(.6+(i%3)*.5))+" "+fmt(-1.1-(i%4)*.25)
              +" "+fmt(direction*(1.7+(i%4)*.5))+" "+fmt(-2.2-(i%3)*.35)}
            fill="none" stroke={p.hair} strokeWidth={.24+(i%4)*.11}
            opacity={(.26+(i%5)*.06)*detail} strokeLinecap="round"/>;
        })}
      </g>)}
      {g.marks.map(mark=><path key={mark.id} data-km-expr1-mark={mark.id} d={mark.d}
        fill="none" stroke={p.ink} strokeWidth={.35+mark.strength*.48}
        strokeLinecap="round" opacity={mark.strength*(character==="scholar" ? 0.48 : 0.34)*detail}/>)}
    </g>
    {character==="scholar"&&<g data-km-ink-anat5-beard="rooted-split-fibres">
      <path data-km-ink-anat5-beard-substrate="left-cheek-to-chin"
        d={"M"+fmt(g.landmarks.mouthL[0]-4)+" "+fmt(mouthY+4)
          +" C"+fmt(g.landmarks.mouthL[0]-19)+" "+fmt(mouthY+19)
          +" "+fmt(g.landmarks.menton[0]-29)+" "+fmt(g.landmarks.menton[1]+8)
          +" "+fmt(g.landmarks.menton[0]-17)+" "+fmt(g.landmarks.menton[1]+29)
          +" Q"+fmt(cx-9)+" "+fmt(g.landmarks.menton[1]+40)+" "+fmt(cx-2)+" "+fmt(g.landmarks.menton[1]+26)
          +" C"+fmt(cx-7)+" "+fmt(g.landmarks.menton[1]+8)
          +" "+fmt(g.landmarks.mouthL[0]+3)+" "+fmt(mouthY+11)
          +" "+fmt(g.landmarks.mouthL[0]-4)+" "+fmt(mouthY+4)+" Z"}
        fill={p.hair} opacity=".14"/>
      <path data-km-ink-anat5-beard-substrate="right-cheek-to-chin"
        d={"M"+fmt(g.landmarks.mouthR[0]+4)+" "+fmt(mouthY+4)
          +" C"+fmt(g.landmarks.mouthR[0]+19)+" "+fmt(mouthY+19)
          +" "+fmt(g.landmarks.menton[0]+29)+" "+fmt(g.landmarks.menton[1]+8)
          +" "+fmt(g.landmarks.menton[0]+17)+" "+fmt(g.landmarks.menton[1]+29)
          +" Q"+fmt(cx+9)+" "+fmt(g.landmarks.menton[1]+40)+" "+fmt(cx+2)+" "+fmt(g.landmarks.menton[1]+26)
          +" C"+fmt(cx+7)+" "+fmt(g.landmarks.menton[1]+8)
          +" "+fmt(g.landmarks.mouthR[0]-3)+" "+fmt(mouthY+11)
          +" "+fmt(g.landmarks.mouthR[0]+4)+" "+fmt(mouthY+4)+" Z"}
        fill={p.hair} opacity=".14"/>
      <path data-km-ink-anat5-moustache-substrate="left"
        d={"M"+fmt(g.landmarks.mouthL[0]-2)+" "+fmt(mouthY+3)
          +" Q"+fmt(cx-13)+" "+fmt(mouthY-1)+" "+fmt(cx-1)+" "+fmt(mouthY+7)
          +" Q"+fmt(cx-10)+" "+fmt(mouthY+11)+" "+fmt(g.landmarks.mouthL[0]-2)+" "+fmt(mouthY+3)+" Z"}
        fill={p.hair} opacity=".23"/>
      <path data-km-ink-anat5-moustache-substrate="right"
        d={"M"+fmt(g.landmarks.mouthR[0]+2)+" "+fmt(mouthY+3)
          +" Q"+fmt(cx+13)+" "+fmt(mouthY-1)+" "+fmt(cx+1)+" "+fmt(mouthY+7)
          +" Q"+fmt(cx+10)+" "+fmt(mouthY+11)+" "+fmt(g.landmarks.mouthR[0]+2)+" "+fmt(mouthY+3)+" Z"}
        fill={p.hair} opacity=".23"/>
      {Array.from({length:beardCount},(_,i)=>{
        const t=i/Math.max(1,beardCount-1);
        const rootX=g.landmarks.mouthL[0]-5+t*(g.landmarks.mouthR[0]-g.landmarks.mouthL[0]+10);
        const rootY=mouthY+7+Math.sin(t*Math.PI)*2.5;
        const side=t<.5?-1:1,span=Math.abs(t-.5)*2;
        const endX=cx+side*(5+span*19+Math.sin(i*1.63)*3.2);
        const endY=g.landmarks.menton[1]+17+(1-span)*8+(i%7)*1.7;
        const midX=(rootX+endX)/2+side*(4+Math.sin(i*.77)*4);
        return <path key={i} data-km-ink-anat5-beard-fiber={i}
          d={"M"+fmt(rootX)+" "+fmt(rootY)
            +" C"+fmt(midX-4)+" "+fmt(rootY+15)
            +" "+fmt(midX+5)+" "+fmt(endY-11)
            +" "+fmt(endX)+" "+fmt(endY)}
          fill="none" stroke={i%7===0?"#b9a88e":p.hair}
          strokeWidth={.22+(i%5)*.12} strokeLinecap="round"
          opacity={(.24+(i%6)*.05)*detail}/>;
      })}
      {Array.from({length:20},(_,i)=>{
        const t=i/19,x=cx-18+t*36,side=t<.5?-1:1;
        return <path key={i} data-km-ink-anat5-moustache-fiber={i}
          d={"M"+fmt(x)+" "+fmt(mouthY+5)
            +" Q"+fmt(x+side*3)+" "+fmt(mouthY+9+Math.sin(i*1.3)*2)
            +" "+fmt(x+side*(3+(i%4)))+" "+fmt(mouthY+12+Math.sin(i*1.7)*2)}
          fill="none" stroke={p.hair} strokeWidth={.25+(i%3)*.12}
          strokeLinecap="round" opacity={(.3+(i%4)*.06)*detail}/>;
      })}
    </g>}
    <g data-km-ink-anat5-neck-and-collar-detail="source-specific">
      <path d={"M"+fmt(g.landmarks.gonionL[0])+" "+fmt(g.landmarks.gonionL[1])
        +" Q160 "+fmt(g.landmarks.menton[1]+16)+" "+fmt(g.landmarks.gonionR[0])+" "+fmt(g.landmarks.gonionR[1])}
        fill="none" stroke={p.ink} strokeWidth=".58" opacity=".34"/>
      <path d="M104 301 Q127 326 146 337 M216 301 Q193 326 174 337"
        fill="none" stroke={p.ink} strokeWidth=".62" opacity=".35"/>
      <path d="M92 348 Q115 331 130 343 M228 348 Q205 331 190 343"
        fill="none" stroke="#fff7e7" strokeWidth="1.8" opacity=".34"/>
    </g>
  </svg>;
}
