/**
 * ANAT6 — source-led Qing/Ming Chinese-ink character portraits.
 *
 * Independent redraws from newly researched museum references. The renderer
 * imports only ANAT1 face topology and EXPR1 FACS deformation; it does not
 * import any prior Shanshui, ANAT2, ANAT3, ANAT4 or ANAT5 character artwork.
 *
 * Research notes and source rights: docs/research/chinese-ink-source-led-character-portraits-2026-11-17.md
 */
import {useId,useMemo} from "react";
import type {CSSProperties} from "react";
import {
  createFace,FACE_FEATURES,FACE_LANDMARKS,faceFeatureLines,measureFace,eyeCentres,
} from "../../registry/anatomy/anatomy-face";
import type {FaceLandmark} from "../../registry/anatomy/anatomy-face";
import {
  expressFace,expressionFeatures,expressionMarks,irisPositions,findEmotion,blendWeights,nearestEmotion,
} from "../../registry/anatomy/expression-face";
import type {ExpressionFeatures} from "../../registry/anatomy/expression-face";
import {renderMeshFrame,projectPoint,smoothPath} from "../../registry/anatomy/anatomy-view";
import type {Vec3} from "../../registry/anatomy/anatomy-body";

export const INK_SOURCE_LED_CHARACTERS=["scholar","shepherd","zhong-kui","lady"] as const;
export const INK_SOURCE_LED_EXPRESSIONS=["neutral","smile","sad","angry","surprise","fear","disgust","contempt"] as const;
export type InkSourceLedCharacter=typeof INK_SOURCE_LED_CHARACTERS[number];
export type InkSourceLedExpression=typeof INK_SOURCE_LED_EXPRESSIONS[number];
type Point=[number,number];

export interface InkSourceLedCharacterPortraitProps {
  character?:InkSourceLedCharacter;
  emotion?:InkSourceLedExpression;
  intensity?:number;
  detail?:number;
  yaw?:number;
  fromEmotion?:InkSourceLedExpression;
  transitionProgress?:number;
  reducedMotion?:boolean;
  className?:string;
  style?:CSSProperties;
}

interface SourceProfile {
  sourceId:string;
  sourceObjectId:string;
  sourceLabel:string;
  sourceNote:string;
  yaw:number;
  pitch:number;
  faceWidth:number;
  jawWidth:number;
  templeWidth:number;
  chinWidth:number;
  lowerFace:number;
  malarProjection:number;
  orbitDepth:number;
  ageSag:number;
  noseWidth:number;
  noseProjection:number;
  eyeSpacing:number;
  eyeHeight:number;
  mouthWidth:number;
  cheekWidth:number;
  cheekLift:number;
  browLift:number;
  age:number;
  headwear:"scholar-cap"|"wrapped-hood"|"loose-hair"|"pinned-hair";
  hairFiberCount:number;
  hair:string;
  headwearColor:string;
  beardStyle:"pointed"|"long"|"full"|"none";
  beardFiberCount:number;
  beardLength:number;
  beardSpread:number;
  beardColor:string;
  ink:string;
  skin:string;
  wash:string;
  robe:string;
  collar:string;
  accent:string;
  lip:string;
}

const PROFILES:Record<InkSourceLedCharacter,SourceProfile>={
  scholar:{
    sourceId:"cma-chen-hongshou-1979.27.2.19+met-ren-yi-zhong-kui-2002.208.2+cma-1961.89",
    sourceObjectId:"CMA 1979.27.2.19",
    sourceLabel:"Staff-bearing scholar",
    sourceNote:"A narrow, upright scholar with a black cap, fine moustache, tapered beard, staff and brush; the redraw studies the iron-wire contour rhythm and measured garment line.",
    yaw:16,pitch:-3,faceWidth:.88,jawWidth:.82,templeWidth:.91,chinWidth:.78,
    lowerFace:1.12,malarProjection:2.8,orbitDepth:1.6,ageSag:.45,
    noseWidth:.96,noseProjection:1.03,eyeSpacing:.98,eyeHeight:1.02,mouthWidth:.94,
    cheekWidth:1.02,cheekLift:.55,browLift:.25,age:56,
    headwear:"scholar-cap",hairFiberCount:34,hair:"#282a27",headwearColor:"#292b28",
    beardStyle:"pointed",beardFiberCount:66,beardLength:46,beardSpread:34,beardColor:"#34312b",
    ink:"#39362f",skin:"#eadbc6",wash:"#92755f",robe:"#e7ddce",collar:"#c9bca8",accent:"#9a5d45",lip:"#875d52",
  },
  shepherd:{
    sourceId:"tsinghua-ren-yi-su-wu-1874",
    sourceObjectId:"Tsinghua Su Wu · 1874",
    sourceLabel:"Su Wu, the shepherd",
    sourceNote:"An older seated figure with greying temples, a far-reaching gaze, blue wrapped hood, long beard and scepter. The source emphasizes a stretched torso and a steadfast expression.",
    yaw:7,pitch:-1,faceWidth:.94,jawWidth:.86,templeWidth:.94,chinWidth:.84,
    lowerFace:1.14,malarProjection:2.6,orbitDepth:3.0,ageSag:1.9,
    noseWidth:1.04,noseProjection:1.06,eyeSpacing:1.01,eyeHeight:.88,mouthWidth:1.02,
    cheekWidth:1.03,cheekLift:.15,browLift:-.35,age:68,
    headwear:"wrapped-hood",hairFiberCount:28,hair:"#b7a58e",headwearColor:"#758d91",
    beardStyle:"long",beardFiberCount:112,beardLength:88,beardSpread:44,beardColor:"#c2b7a5",
    ink:"#484238",skin:"#e4d1b8",wash:"#927965",robe:"#d9d1c2",collar:"#b8c0b6",accent:"#607e83",lip:"#86685c",
  },
  "zhong-kui":{
    sourceId:"met-ren-yi-zhong-kui-2002.208.2",
    sourceObjectId:"Met 2002.208.2",
    sourceLabel:"Zhong Kui",
    sourceNote:"The legendary figure is rendered as an eccentric scholar: broad cheek and jaw mass, heavy beard, loose hair with a blossom, and a voluminous seated robe.",
    yaw:10,pitch:1,faceWidth:1.02,jawWidth:1.08,templeWidth:1.04,chinWidth:1.02,
    lowerFace:1.04,malarProjection:3.8,orbitDepth:1.2,ageSag:.55,
    noseWidth:1.14,noseProjection:1.12,eyeSpacing:1.04,eyeHeight:1.0,mouthWidth:1.08,
    cheekWidth:1.10,cheekLift:.45,browLift:-.55,age:48,
    headwear:"loose-hair",hairFiberCount:78,hair:"#292621",headwearColor:"#302b27",
    beardStyle:"full",beardFiberCount:154,beardLength:76,beardSpread:76,beardColor:"#302c27",
    ink:"#37332d",skin:"#e8d6c1",wash:"#94735e",robe:"#d8c5b1",collar:"#b79c84",accent:"#a94f3d",lip:"#815b4e",
  },
  lady:{
    sourceId:"met-jiang-jun-portrait-of-a-lady-52.177.5",
    sourceObjectId:"Met 52.177.5",
    sourceLabel:"Jiang Jun · Portrait of a Lady study",
    sourceNote:"A new 19th-century Qing female character study from Met 52.177.5: softly tapered jaw, vermilion lips, rounded pinned coiffure, pink peony, jade hair ornaments, long hanging earrings, blue embroidered robe, white patterned cuffs and a folded fan. The inscription appears to identify the sitter at age 26; this redraw is not her likeness.",
    yaw:3,pitch:0,faceWidth:.90,jawWidth:.84,templeWidth:.94,chinWidth:.78,
    lowerFace:.99,malarProjection:2.4,orbitDepth:.7,ageSag:.08,
    noseWidth:.90,noseProjection:.94,eyeSpacing:1.0,eyeHeight:1.08,mouthWidth:.88,
    cheekWidth:1.0,cheekLift:.28,browLift:.22,age:26,
    headwear:"pinned-hair",hairFiberCount:92,hair:"#27251f",headwearColor:"#292720",
    beardStyle:"none",beardFiberCount:0,beardLength:0,beardSpread:0,beardColor:"#27251f",
    ink:"#51483e",skin:"#f0dfcf",wash:"#a67c70",robe:"#477f93",collar:"#e7d9c2",accent:"#c75f70",lip:"#a64c56",
  },
};

const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
const fmt=(v:number)=>Number(v.toFixed(2));
const gaussian=(x:number,y:number,cx:number,cy:number,sx:number,sy:number)=>{
  const dx=(x-cx)/sx,dy=(y-cy)/sy;
  return Math.exp(-.5*(dx*dx+dy*dy));
};
const rand=(seed:number,index:number)=>{
  let x=Math.imul(seed+index*0x9e3779b9,0x85ebca6b);
  x^=x>>>13;x=Math.imul(x,0xc2b2ae35);x^=x>>>16;
  return (x>>>0)/4294967295;
};

/**
 * Raw ANAT1 topology is locally remapped from observed source proportions.
 * No unvalidated population norm is used as a proxy for a historical sitter.
 */
function createSourceFace(character:InkSourceLedCharacter){
  const p=PROFILES[character];
  const base=createFace({calibrate:false});
  const vertices=base.vertices.map(v=>[v[0],v[1],v[2]] as Vec3);
  const at=(name:FaceLandmark)=>vertices[FACE_LANDMARKS[name]];
  const sellionY=at("sellion")[1],subnasaleY=at("subnasale")[1];
  const stomionY=at("stomion")[1];
  const eyeL=(at("palpebrale-superius.L")[1]+at("palpebrale-inferius.L")[1])/2;
  const eyeR=(at("palpebrale-superius.R")[1]+at("palpebrale-inferius.R")[1])/2;
  const eyeY=(eyeL+eyeR)/2;
  const cheekL=at("cheekbone.L"),cheekR=at("cheekbone.R");
  const gonionL=at("gonion.L"),gonionR=at("gonion.R");
  const menton=at("menton");
  const ageFactor=clamp((p.age-25)/65,0,1);
  for(const v of vertices){
    const x=v[0],y=v[1];
    const nose=gaussian(x,y,0,(sellionY+subnasaleY)/2,23,31);
    const eyes=Math.max(
      gaussian(x,y,-27,eyeY,25,17),
      gaussian(x,y,27,eyeY,25,17),
    );
    const mouth=gaussian(x,y,0,stomionY,30,13);
    const cheek=Math.max(
      gaussian(x,y,cheekL[0],cheekL[1],25,28),
      gaussian(x,y,cheekR[0],cheekR[1],25,28),
    );
    const jaw=Math.max(
      gaussian(x,y,gonionL[0],gonionL[1],21,25),
      gaussian(x,y,gonionR[0],gonionR[1],21,25),
    );
    const temple=Math.max(
      gaussian(x,y,-43,eyeY+25,25,32),
      gaussian(x,y,43,eyeY+25,25,32),
    );
    const chin=gaussian(x,y,0,menton[1]+7,22,18);
    const brow=Math.max(
      gaussian(x,y,at("brow-inner.L")[0],at("brow-inner.L")[1],19,10),
      gaussian(x,y,at("brow-inner.R")[0],at("brow-inner.R")[1],19,10),
    );
    v[0]=x*p.faceWidth;
    v[0]*=1+(p.jawWidth-1)*jaw;
    v[0]*=1+(p.templeWidth-1)*temple;
    v[0]*=1+(p.chinWidth-1)*chin;
    v[0]*=1+(p.noseWidth-1)*nose;
    v[0]*=1+(p.eyeSpacing-1)*eyes;
    v[0]*=1+(p.mouthWidth-1)*mouth;
    v[0]*=1+(p.cheekWidth-1)*cheek;
    v[1]=subnasaleY+(y-subnasaleY)*(y<subnasaleY?p.lowerFace:1);
    v[1]=eyeY+(v[1]-eyeY)*(1+(p.eyeHeight-1)*eyes);
    v[1]-=p.cheekLift*cheek;
    v[1]-=p.browLift*brow;
    v[1]-=ageFactor*p.ageSag*cheek;
    v[2]*=1+(p.noseProjection-1)*nose;
    v[2]+=p.malarProjection*cheek-p.orbitDepth*eyes;
  }
  const points=new Float32Array(vertices.length*3);
  vertices.forEach((v,i)=>{
    points[i*3]=v[0]/1000;
    points[i*3+1]=v[1]/1000;
    points[i*3+2]=v[2]/1000;
  });
  return {...base,vertices,mesh:{...base.mesh,points}};
}

const FACE_BASE:Record<InkSourceLedCharacter,ReturnType<typeof createFace>>={
  scholar:createSourceFace("scholar"),
  shepherd:createSourceFace("shepherd"),
  "zhong-kui":createSourceFace("zhong-kui"),
  lady:createSourceFace("lady"),
};

export interface SourceLedPortraitGeometry {
  character:InkSourceLedCharacter;
  sourceId:string;
  sourceObjectId:string;
  sourceLabel:string;
  headwear:SourceProfile["headwear"];
  beardStyle:SourceProfile["beardStyle"];
  hairFiberCount:number;
  beardFiberCount:number;
  yaw:number;
  outline:string;
  features:{id:string;d:string}[];
  marks:{id:string;strength:number;d:string}[];
  eyeOpenings:{side:"L"|"R";d:string}[];
  mouthOutline:string;
  mouthLine:string;
  irises:{side:"L"|"R";x:number;y:number;rx:number;ry:number}[];
  landmarks:Record<string,Point>;
  expression:ExpressionFeatures;
  expressionMatch:string;
  transitionFrom:InkSourceLedExpression;
  transitionProgress:number;
  faceWidthMm:number;
  noseWidthMm:number;
  mouthWidthMm:number;
  lowerFaceMm:number;
  top:number;
  left:number;
  right:number;
}

export function buildSourceLedPortraitGeometry(
  character:InkSourceLedCharacter,
  emotion:InkSourceLedExpression,
  intensity:number,
  yawOverride?:number,
  fromEmotion:InkSourceLedExpression="neutral",
  transitionProgress=1,
):SourceLedPortraitGeometry{
  if(!INK_SOURCE_LED_CHARACTERS.includes(character))throw new RangeError("Unknown ANAT6 character");
  if(!INK_SOURCE_LED_EXPRESSIONS.includes(emotion)||(emotion!=="neutral"&&!findEmotion(emotion)))
    throw new RangeError("Unknown ANAT6 expression");
  if(!INK_SOURCE_LED_EXPRESSIONS.includes(fromEmotion)||(fromEmotion!=="neutral"&&!findEmotion(fromEmotion)))
    throw new RangeError("Unknown ANAT6 transition source expression");
  if(!Number.isFinite(intensity)||intensity<0||intensity>1)
    throw new RangeError("ANAT6 expression intensity must be in [0,1]");
  if(!Number.isFinite(transitionProgress)||transitionProgress<0||transitionProgress>1)
    throw new RangeError("ANAT6 transition progress must be in [0,1]");
  const p=PROFILES[character],yaw=yawOverride===undefined?p.yaw:yawOverride;
  if(!Number.isFinite(yaw)||yaw < -35||yaw > 35)
    throw new RangeError("ANAT6 yaw must be finite and in [-35,35]");
  const base=FACE_BASE[character];
  const scaleWeights=(weights:Readonly<Record<number,number>>):Record<number,number>=>Object.fromEntries(
    Object.entries(weights).map(([id,value])=>[Number(id),value*intensity]),
  ) as Record<number,number>;
  const fromPrototype=fromEmotion==="neutral"?undefined:findEmotion(fromEmotion);
  const toPrototype=emotion==="neutral"?undefined:findEmotion(emotion);
  const fromWeights=fromPrototype?.aus??{};
  const toWeights=toPrototype?.aus??{};
  const progress=transitionProgress;
  const side=toPrototype?.side??(progress<.5?fromPrototype?.side:undefined);
  const expressed=expressFace(blendWeights(
    [scaleWeights(fromWeights),1-progress],
    [scaleWeights(toWeights),progress],
  ),base,side);
  const frame=renderMeshFrame(
    expressed.mesh,{yaw,pitch:p.pitch},
    {width:240,height:280,pixelsPerMetre:610,centerOnTarget:true,padding:0},
  );
  const map=(point:readonly number[]):Point=>[
    fmt(240+(point[0]-120)*1.58),
    fmt(245+(point[1]-140)*1.58),
  ];
  const pointAt=(index:number):Point=>map([
    frame.screen[index*3],frame.screen[index*3+1],
  ]);
  const landmark=(name:FaceLandmark)=>pointAt(FACE_LANDMARKS[name]);
  const outlinePoints=FACE_FEATURES.oval.loop.map(pointAt);
  const outline=smoothPath(outlinePoints,true);
  const eyeOpenings=(["L","R"] as const).map(side=>{
    const upper=FACE_FEATURES["eye-upper."+side].loop.map(pointAt);
    const lower=FACE_FEATURES["eye-lower."+side].loop.slice(1,-1).reverse().map(pointAt);
    return {side,d:smoothPath([...upper,...lower],true)};
  });
  const features=faceFeatureLines(frame)
    .filter(line=>line.id!=="oval")
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
      const projected=projectPoint(frame,[x/1000,y/1000,depthAt(x,y)/1000]);
      return map([projected[0],projected[1]]);
    });
    return {id:mark.id,strength:mark.strength,d:smoothPath(points,false)};
  }).filter(mark=>mark.d.length>0);
  const mouthUpper=FACE_FEATURES["lips-upper"].loop.map(pointAt);
  const mouthLower=FACE_FEATURES["lips-lower"].loop.slice(1,-1).reverse().map(pointAt);
  const mouthOutline=smoothPath([...mouthUpper,...mouthLower],true);
  const mouthLine=features.find(feature=>feature.id==="mouth-line")?.d??"";
  const centres=eyeCentres(expressed.vertices),gaze=irisPositions(expressed);
  const irises=([ "L","R" ] as const).map(side=>{
    const projected=projectPoint(frame,[
      gaze[side][0]/1000,gaze[side][1]/1000,centres[side][2]/1000,
    ]);
    const [x,y]=map([projected[0],projected[1]]);
    const nearIndex=FACE_LANDMARKS[side==="L"?"zygion.L":"zygion.R"];
    const farIndex=FACE_LANDMARKS[side==="L"?"zygion.R":"zygion.L"];
    const near=frame.vertexFacing[nearIndex]>=frame.vertexFacing[farIndex];
    return {
      side,x,y,
      rx:fmt(gaze.r*frame.projection.scale/1000*1.58*.96*(near?1:.78)),
      ry:fmt(gaze.r*frame.projection.scale/1000*1.58*.68*clamp(expressionFeatures(expressed).eyeOpen,.35,1.5)*(near?1:.82)),
    };
  });
  const m=measureFace(expressed.vertices),e=expressionFeatures(expressed);
  const landmarks={
    forehead:landmark("forehead"),glabella:landmark("glabella"),
    sellion:landmark("sellion"),pronasale:landmark("pronasale"),
    subnasale:landmark("subnasale"),menton:landmark("menton"),
    zygionL:landmark("zygion.L"),zygionR:landmark("zygion.R"),
    gonionL:landmark("gonion.L"),gonionR:landmark("gonion.R"),
    cheekboneL:landmark("cheekbone.L"),cheekboneR:landmark("cheekbone.R"),
    earRootL:[landmark("zygion.L")[0]-9,
      (landmark("endocanthion.L")[1]+landmark("subnasale")[1])/2] as Point,
    earRootR:[landmark("zygion.R")[0]+9,
      (landmark("endocanthion.R")[1]+landmark("subnasale")[1])/2] as Point,
    mouthL:landmark("cheilion.L"),mouthR:landmark("cheilion.R"),
    eyeInnerL:landmark("endocanthion.L"),eyeInnerR:landmark("endocanthion.R"),
    browInnerL:landmark("brow-inner.L"),browInnerR:landmark("brow-inner.R"),
    browOuterL:landmark("brow-outer.L"),browOuterR:landmark("brow-outer.R"),
  };
  return {
    character,sourceId:p.sourceId,sourceObjectId:p.sourceObjectId,sourceLabel:p.sourceLabel,
    headwear:p.headwear,beardStyle:p.beardStyle,hairFiberCount:p.hairFiberCount,
    beardFiberCount:p.beardFiberCount,yaw,outline,features,marks,eyeOpenings,
    mouthOutline,mouthLine,irises,landmarks,expression:e,
    expressionMatch:emotion==="neutral"?"neutral":nearestEmotion(e)[0]?.id??emotion,
    transitionFrom:fromEmotion,transitionProgress:progress,
    faceWidthMm:m.zyZy,noseWidthMm:m.alAl,mouthWidthMm:m.chCh,
    lowerFaceMm:m.snGn,top:Math.min(...outlinePoints.map(x=>x[1])),
    left:Math.min(...outlinePoints.map(x=>x[0])),right:Math.max(...outlinePoints.map(x=>x[0])),
  };
}

interface Fiber {d:string;width:number;opacity:number}
function buildBeardFibers(g:SourceLedPortraitGeometry,p:SourceProfile,detail:number):Fiber[]{
  if(p.beardStyle==="none")return [];
  const count=Math.max(12,Math.round(p.beardFiberCount*detail));
  const cx=(g.landmarks.mouthL[0]+g.landmarks.mouthR[0])/2;
  const jawL=g.landmarks.gonionL[0],jawR=g.landmarks.gonionR[0];
  const mouthY=(g.landmarks.mouthL[1]+g.landmarks.mouthR[1])/2;
  const chinY=g.landmarks.menton[1];
  return Array.from({length:count},(_,i)=>{
    const t=(i+.5)/count,r=rand(41+i,characterSeed(g.character));
    const startX=jawL-4+t*(jawR-jawL+8);
    const startY=mouthY+8+r*13;
    const tuftBias=t<.2?-1:t>.8?1:t<.43?-.35:t>.57?.35:0;
    const endX=cx+(t-.5)*p.beardSpread+tuftBias*(2+r*5);
    const endY=Math.min(578,chinY+p.beardLength*(.66+r*.32)+Math.abs(t-.5)*p.beardLength*.12);
    const c1x=startX+(endX-startX)*.22+(r-.5)*11;
    const c1y=startY+17+r*12;
    const c2x=endX+(cx-endX)*.18+(r-.5)*9;
    const c2y=endY-15-r*12;
    return {
      d:"M "+fmt(startX)+" "+fmt(startY)+" C "+fmt(c1x)+" "+fmt(c1y)+" "+fmt(c2x)+" "+fmt(c2y)+" "+fmt(endX)+" "+fmt(endY),
      width:fmt(.22+r*.68),opacity:fmt(.16+r*.34),
    };
  });
}
function characterSeed(character:InkSourceLedCharacter){
  return character==="scholar"?17:character==="shepherd"?53:character==="zhong-kui"?91:127;
}
function buildBrowFibers(g:SourceLedPortraitGeometry,detail:number):Fiber[]{
  const count=Math.max(4,Math.round(10*detail));
  return (["L","R"] as const).flatMap(side=>{
    const inner=side==="L"?g.landmarks.browInnerL:g.landmarks.browInnerR;
    const outer=side==="L"?g.landmarks.browOuterL:g.landmarks.browOuterR;
    const direction=Math.sign(outer[0]-inner[0])|| (side==="L"?-1:1);
    return Array.from({length:count},(_,i)=>{
      const t=(i+.5)/count,r=rand(701+i,characterSeed(g.character)+(side==="L"?0:37));
      const x=inner[0]+(outer[0]-inner[0])*t;
      const y=inner[1]+(outer[1]-inner[1])*t-Math.sin(t*Math.PI)*1.2;
      const sx=x-direction*r*1.1,sy=y+(r-.5)*1.1;
      const ex=x+direction*(1+r*1.8),ey=y-.8-r*1.4;
      return {d:"M "+fmt(sx)+" "+fmt(sy)+" Q "+fmt(x+direction*.6)+" "+fmt(y-1.1)+" "+fmt(ex)+" "+fmt(ey),
        width:fmt(.22+r*.34),opacity:fmt(.22+r*.28)};
    });
  });
}
function buildHeadFibers(g:SourceLedPortraitGeometry,p:SourceProfile,detail:number){
  const count=Math.max(8,Math.round(p.hairFiberCount*detail));
  const cx=(g.left+g.right)/2,w=g.right-g.left,top=g.top;
  return Array.from({length:count},(_,i)=>{
    const t=(i+.5)/count,r=rand(123+i,characterSeed(g.character));
    if(p.headwear==="wrapped-hood"){
      const x=g.left-9+t*(w+18);
      const y=top-31+Math.sin(t*Math.PI)*11;
      return {
        d:"M "+fmt(x)+" "+fmt(y)+" Q "+fmt(x+(t-.5)*13)+" "+fmt(top+1+r*8)+" "+fmt(x+(t-.5)*18)+" "+fmt(top+25+r*10),
        width:fmt(.45+r*.45),opacity:fmt(.18+r*.24),
      };
    }
    if(p.headwear==="scholar-cap"){
      const x=cx-w*.53+t*w*1.06;
      const y0=top-29+Math.sin(t*Math.PI)*-2;
      return {
        d:"M "+fmt(x)+" "+fmt(y0)+" Q "+fmt(x+(t-.5)*4)+" "+fmt(top-12)+" "+fmt(x+(t-.5)*5)+" "+fmt(top+22),
        width:fmt(.24+r*.24),opacity:fmt(.11+r*.18),
      };
    }
    if(p.headwear==="pinned-hair"){
      const x=cx-w*.53+t*w*1.06;
      const y0=top-26+Math.sin(t*Math.PI)*-17;
      const endX=cx+(t-.5)*w*.66+(r-.5)*5;
      return {
        d:"M "+fmt(x)+" "+fmt(y0)+" C "+fmt(x+(t-.5)*16)+" "+fmt(top-6)+" "+fmt(endX+(t-.5)*9)+" "+fmt(top+6)+" "+fmt(endX)+" "+fmt(top+39+r*9),
        width:fmt(.34+r*.38),opacity:fmt(.19+r*.28),
      };
    }
    const x=cx-w*.58+t*w*1.16;
    const y0=top-34+Math.sin(t*Math.PI)*-28;
    const y1=top+25+r*42;
    return {
      d:"M "+fmt(x)+" "+fmt(y0)+" C "+fmt(x+(t-.5)*23)+" "+fmt(top-4)+" "+fmt(x+(t-.5)*28)+" "+fmt(top+8)+" "+fmt(x+(t-.5)*17)+" "+fmt(y1),
      width:fmt(.45+r*.75),opacity:fmt(.25+r*.36),
    };
  });
}

function robeFolds(character:InkSourceLedCharacter):Fiber[]{
  const paths:Record<InkSourceLedCharacter,string[]>={
    scholar:[
      "M 156 482 C 137 514 126 549 112 590",
      "M 180 477 C 172 520 167 554 160 600",
      "M 207 477 C 211 516 205 558 202 600",
      "M 324 482 C 344 514 355 549 369 590",
      "M 300 477 C 308 520 313 554 320 600",
      "M 273 477 C 269 516 275 558 278 600",
      "M 164 501 C 194 520 217 533 239 548",
      "M 316 501 C 286 520 263 533 241 548",
      "M 130 540 C 167 550 188 570 196 594",
      "M 350 540 C 313 550 292 570 284 594",
    ],
    shepherd:[
      "M 116 484 C 136 514 144 552 129 600",
      "M 151 477 C 168 512 173 552 167 600",
      "M 186 472 C 194 512 191 556 190 600",
      "M 364 484 C 344 514 336 552 351 600",
      "M 329 477 C 312 512 307 552 313 600",
      "M 294 472 C 286 512 289 556 290 600",
      "M 130 514 C 172 526 208 538 239 562",
      "M 350 514 C 308 526 272 538 241 562",
      "M 90 558 C 139 557 167 579 177 600",
      "M 390 558 C 341 557 313 579 303 600",
      "M 212 486 C 222 520 222 550 215 588",
      "M 268 486 C 258 520 258 550 265 588",
    ],
    "zhong-kui":[
      "M 104 476 C 130 512 128 552 92 600",
      "M 138 468 C 164 514 160 558 143 600",
      "M 177 466 C 191 516 188 558 184 600",
      "M 376 476 C 350 512 352 552 388 600",
      "M 342 468 C 316 514 320 558 337 600",
      "M 303 466 C 289 516 292 558 296 600",
      "M 113 524 C 157 526 194 552 209 589",
      "M 367 524 C 323 526 286 552 271 589",
      "M 151 493 C 181 502 210 515 239 537",
      "M 329 493 C 299 502 270 515 241 537",
      "M 82 570 C 139 552 176 575 193 600",
      "M 398 570 C 341 552 304 575 287 600",
      "M 228 478 C 232 520 226 560 224 600",
      "M 252 478 C 248 520 254 560 256 600",
    ],
    lady:[
      "M 66 600 C 86 552 118 516 162 490 Q 190 478 211 483",
      "M 414 600 C 394 552 362 516 318 490 Q 290 478 269 483",
      "M 138 505 C 163 522 183 545 191 576",
      "M 342 505 C 317 522 297 545 289 576",
      "M 169 482 C 181 500 198 514 218 526",
      "M 311 482 C 299 500 282 514 262 526",
      "M 190 540 C 204 551 215 565 221 590",
      "M 290 540 C 276 551 265 565 259 590",
      "M 102 563 C 143 556 168 573 183 598",
      "M 378 563 C 337 556 312 573 297 598",
      "M 224 488 C 229 516 227 543 223 566",
      "M 256 488 C 251 516 253 543 257 566",
      "M 151 519 C 175 531 189 544 196 562",
      "M 329 519 C 305 531 291 544 284 562",
      "M 207 500 C 220 513 229 528 232 544",
      "M 273 500 C 260 513 251 528 248 544",
    ],
  };
  return paths[character].map((d,i)=>({d,width:.55+(i%4)*.18,opacity:.2+(i%3)*.08}));
}

function earPath(point:Point,side:"L"|"R",scale:number){
  const s=side==="L"?-1:1,x=point[0],y=point[1],w=12*scale,h=22*scale;
  return "M "+fmt(x)+" "+fmt(y-h*.58)+
    " C "+fmt(x+s*w)+" "+fmt(y-h*.76)+" "+fmt(x+s*w*1.25)+" "+fmt(y-h*.12)+" "+fmt(x+s*w*.88)+" "+fmt(y+h*.42)+
    " C "+fmt(x+s*w*.55)+" "+fmt(y+h)+" "+fmt(x-s*w*.18)+" "+fmt(y+h*.72)+" "+fmt(x-s*w*.22)+" "+fmt(y+h*.12)+
    " C "+fmt(x-s*w*.24)+" "+fmt(y-h*.2)+" "+fmt(x-s*w*.1)+" "+fmt(y-h*.48)+" "+fmt(x)+" "+fmt(y-h*.58)+" Z";
}
function earInnerPaths(point:Point,side:"L"|"R",scale:number){
  const s=side==="L"?-1:1,x=point[0],y=point[1],w=12*scale,h=22*scale;
  return {
    antihelix:"M "+fmt(x-s*w*.12)+" "+fmt(y-h*.34)+
      " C "+fmt(x+s*w*.30)+" "+fmt(y-h*.52)+" "+fmt(x+s*w*.72)+" "+fmt(y-h*.20)+" "+fmt(x+s*w*.60)+" "+fmt(y+h*.05)+
      " C "+fmt(x+s*w*.52)+" "+fmt(y+h*.31)+" "+fmt(x+s*w*.16)+" "+fmt(y+h*.42)+" "+fmt(x-s*w*.05)+" "+fmt(y+h*.22),
    concha:"M "+fmt(x+s*w*.18)+" "+fmt(y-h*.05)+
      " C "+fmt(x+s*w*.52)+" "+fmt(y-h*.16)+" "+fmt(x+s*w*.60)+" "+fmt(y+h*.18)+" "+fmt(x+s*w*.28)+" "+fmt(y+h*.24)+
      " Q "+fmt(x+s*w*.08)+" "+fmt(y+h*.18)+" "+fmt(x+s*w*.18)+" "+fmt(y-h*.05)+" Z",
    tragus:"M "+fmt(x-s*w*.06)+" "+fmt(y-h*.04)+
      " Q "+fmt(x+s*w*.14)+" "+fmt(y+h*.02)+" "+fmt(x+s*w*.04)+" "+fmt(y+h*.18),
    lobe:"M "+fmt(x+s*w*.08)+" "+fmt(y+h*.34)+
      " Q "+fmt(x+s*w*.42)+" "+fmt(y+h*.59)+" "+fmt(x+s*w*.58)+" "+fmt(y+h*.34),
  };
}

function headwearPath(g:SourceLedPortraitGeometry,p:SourceProfile){
  const cx=(g.left+g.right)/2,top=g.top;
  if(p.headwear==="pinned-hair"){
    return "M "+fmt(g.left-17)+" "+fmt(top+35)+
      " C "+fmt(g.left-29)+" "+fmt(top+3)+" "+fmt(cx-55)+" "+fmt(top-38)+" "+fmt(cx-22)+" "+fmt(top-44)+
      " C "+fmt(cx-7)+" "+fmt(top-66)+" "+fmt(cx+35)+" "+fmt(top-63)+" "+fmt(cx+48)+" "+fmt(top-36)+
      " C "+fmt(g.right+27)+" "+fmt(top-12)+" "+fmt(g.right+27)+" "+fmt(top+28)+" "+fmt(g.right+13)+" "+fmt(top+53)+
      " Q "+fmt(cx)+" "+fmt(top+35)+" "+fmt(g.left+8)+" "+fmt(top+55)+" Z";
  }
  if(p.headwear==="scholar-cap"){
    return "M "+fmt(g.left-13)+" "+fmt(top+29)+
      " C "+fmt(g.left-17)+" "+fmt(top+3)+" "+fmt(cx-44)+" "+fmt(top-32)+" "+fmt(cx-26)+" "+fmt(top-34)+
      " L "+fmt(cx+26)+" "+fmt(top-34)+
      " C "+fmt(cx+44)+" "+fmt(top-32)+" "+fmt(g.right+17)+" "+fmt(top+3)+" "+fmt(g.right+13)+" "+fmt(top+29)+
      " L "+fmt(g.right+10)+" "+fmt(top+39)+
      " Q "+fmt(cx)+" "+fmt(top+46)+" "+fmt(g.left-10)+" "+fmt(top+39)+" Z";
  }
  if(p.headwear==="wrapped-hood"){
    return "M "+fmt(g.left-13)+" "+fmt(top+37)+
      " C "+fmt(g.left-27)+" "+fmt(top+2)+" "+fmt(cx-44)+" "+fmt(top-54)+" "+fmt(cx-8)+" "+fmt(top-68)+
      " Q "+fmt(cx+18)+" "+fmt(top-76)+" "+fmt(g.right+14)+" "+fmt(top+12)+
      " Q "+fmt(g.right+29)+" "+fmt(top+46)+" "+fmt(g.right-5)+" "+fmt(top+57)+
      " Q "+fmt(cx)+" "+fmt(top+27)+" "+fmt(g.left+7)+" "+fmt(top+58)+" Z";
  }
  return "M "+fmt(g.left-15)+" "+fmt(top+36)+
    " C "+fmt(g.left-30)+" "+fmt(top-5)+" "+fmt(cx-45)+" "+fmt(top-48)+" "+fmt(cx-8)+" "+fmt(top-50)+
    " C "+fmt(cx+18)+" "+fmt(top-66)+" "+fmt(g.right+28)+" "+fmt(top-18)+" "+fmt(g.right+17)+" "+fmt(top+34)+
    " C "+fmt(g.right+4)+" "+fmt(top+64)+" "+fmt(g.right-12)+" "+fmt(top+86)+" "+fmt(g.right-26)+" "+fmt(top+91)+
    " Q "+fmt(cx)+" "+fmt(top+49)+" "+fmt(g.left+21)+" "+fmt(top+88)+" Z";
}

function robePath(character:InkSourceLedCharacter){
  if(character==="scholar")
    return "M 82 600 C 98 546 119 511 158 489 Q 195 467 221 468 L 259 468 Q 285 467 322 489 C 361 511 382 546 398 600 Z";
  if(character==="shepherd")
    return "M 54 600 C 76 534 112 500 159 482 Q 198 464 240 468 Q 282 464 321 482 C 368 500 404 534 426 600 Z";
  if(character==="lady")
    return "M 44 600 C 62 548 102 505 153 484 Q 196 458 240 464 Q 284 458 327 484 C 378 505 418 548 436 600 Z";
  return "M 34 600 C 57 524 104 482 160 470 Q 202 448 240 456 Q 278 448 320 470 C 376 482 423 524 446 600 Z";
}

function collarPath(character:InkSourceLedCharacter){
  if(character==="scholar")
    return "M 195 466 Q 216 480 240 505 Q 264 480 285 466 L 316 493 Q 286 515 260 550 L 240 565 L 220 550 Q 194 515 164 493 Z";
  if(character==="shepherd")
    return "M 178 468 Q 210 483 240 520 Q 270 483 302 468 L 336 501 Q 296 522 268 567 L 240 581 L 212 567 Q 184 522 144 501 Z";
  if(character==="lady")
    return "M 190 462 Q 216 480 240 506 Q 264 480 290 462 L 323 489 Q 289 516 270 551 L 240 566 L 210 551 Q 191 516 157 489 Z";
  return "M 176 457 Q 210 480 240 518 Q 270 480 304 457 L 350 500 Q 301 531 269 575 L 240 588 L 211 575 Q 179 531 130 500 Z";
}

function beardMassPath(g:SourceLedPortraitGeometry,p:SourceProfile){
  if(p.beardStyle==="none")return "";
  const l=g.landmarks.gonionL,r=g.landmarks.gonionR,mL=g.landmarks.mouthL,mR=g.landmarks.mouthR;
  const cx=(mL[0]+mR[0])/2,my=(mL[1]+mR[1])/2,chin=g.landmarks.menton[1];
  const end=Math.min(578,chin+p.beardLength),spread=p.beardSpread/2;
  const asym=g.character==="shepherd"?-3.5:g.character==="zhong-kui"?4.5:1.2;
  const leftJaw=l[0]-5,rightJaw=r[0]+5;
  const leftOuter=cx-spread*.70-asym,rightOuter=cx+spread*.72+asym;
  const leftInner=cx-spread*.23-asym*.3,rightInner=cx+spread*.25+asym*.25;
  const lower=end+(p.beardStyle==="long"?18:p.beardStyle==="full"?12:8);
  return "M "+fmt(mL[0]-4)+" "+fmt(my+6)+
    " C "+fmt(mL[0]-12)+" "+fmt(my+16)+" "+fmt(l[0]-14)+" "+fmt(chin+10)+" "+fmt(leftJaw)+" "+fmt(chin+22)+
    " C "+fmt(leftJaw-4)+" "+fmt(chin+44)+" "+fmt(leftOuter-10)+" "+fmt(end-44)+" "+fmt(leftOuter)+" "+fmt(end-24)+
    " C "+fmt(leftOuter+5)+" "+fmt(end-6)+" "+fmt(leftInner-7)+" "+fmt(end+5)+" "+fmt(leftInner)+" "+fmt(end+2)+
    " C "+fmt(leftInner+6)+" "+fmt(end+10)+" "+fmt(cx+asym-10)+" "+fmt(lower+4)+" "+fmt(cx+asym)+" "+fmt(lower)+
    " C "+fmt(cx+asym+10)+" "+fmt(lower+4)+" "+fmt(rightInner-6)+" "+fmt(end+10)+" "+fmt(rightInner)+" "+fmt(end+2)+
    " C "+fmt(rightInner+7)+" "+fmt(end+5)+" "+fmt(rightOuter-5)+" "+fmt(end-6)+" "+fmt(rightOuter)+" "+fmt(end-24)+
    " C "+fmt(rightOuter+10)+" "+fmt(end-44)+" "+fmt(rightJaw+4)+" "+fmt(chin+44)+" "+fmt(rightJaw)+" "+fmt(chin+22)+
    " C "+fmt(r[0]+14)+" "+fmt(chin+10)+" "+fmt(mR[0]+12)+" "+fmt(my+16)+" "+fmt(mR[0]+4)+" "+fmt(my+6)+
    " Q "+fmt(cx+spread*.28)+" "+fmt(my+25)+" "+fmt(mL[0]-4)+" "+fmt(my+6)+" Z";
}

export function InkSourceLedCharacterPortrait({
  character="scholar",emotion="neutral",intensity=.88,detail=1,yaw,
  fromEmotion="neutral",transitionProgress=1,reducedMotion=false,className,style,
}:InkSourceLedCharacterPortraitProps){
  if(!INK_SOURCE_LED_CHARACTERS.includes(character))throw new RangeError("Unknown ANAT6 character");
  if(!INK_SOURCE_LED_EXPRESSIONS.includes(emotion))throw new RangeError("Unknown ANAT6 expression");
  if(!Number.isFinite(intensity)||intensity<0||intensity>1)
    throw new RangeError("ANAT6 intensity must be in [0,1]");
  if(!Number.isFinite(detail)||detail<.25||detail>1)
    throw new RangeError("ANAT6 detail must be in [.25,1]");
  if(yaw!==undefined&&(!Number.isFinite(yaw)||yaw < -35||yaw > 35))
    throw new RangeError("ANAT6 yaw must be finite and in [-35,35]");
  if(!INK_SOURCE_LED_EXPRESSIONS.includes(fromEmotion))
    throw new RangeError("ANAT6 transition source expression is invalid");
  if(!Number.isFinite(transitionProgress)||transitionProgress<0||transitionProgress>1)
    throw new RangeError("ANAT6 transition progress must be in [0,1]");
  const progress=reducedMotion?1:transitionProgress;
  const p=PROFILES[character],uid="km-anat6-"+useId().replace(/[^a-zA-Z0-9_-]/g,"");
  const g=useMemo(()=>buildSourceLedPortraitGeometry(character,emotion,intensity,yaw,fromEmotion,progress),[character,emotion,intensity,yaw,fromEmotion,progress]);
  const beard=useMemo(()=>buildBeardFibers(g,p,detail),[g,p,detail]);
  const hair=useMemo(()=>buildHeadFibers(g,p,detail),[g,p,detail]);
  const brows=useMemo(()=>buildBrowFibers(g,detail),[g,detail]);
  const folds=robeFolds(character);
  const cx=(g.left+g.right)/2,w=g.right-g.left;
  const chin=g.landmarks.menton,forehead=g.landmarks.forehead;
  const mouthY=(g.landmarks.mouthL[1]+g.landmarks.mouthR[1])/2;
  const nose=g.landmarks.pronasale;
  const cheekL=g.landmarks.cheekboneL,cheekR=g.landmarks.cheekboneR;
  const earScale=clamp(w/142,.78,1.18);
  const earL=earInnerPaths(g.landmarks.earRootL,"L",earScale);
  const earR=earInnerPaths(g.landmarks.earRootR,"R",earScale*.82);
  const cap=headwearPath(g,p);
  const beardPath=beardMassPath(g,p);
  const upperLip="M "+fmt(g.landmarks.mouthL[0])+" "+fmt(mouthY-1)+
    " Q "+fmt(cx)+" "+fmt(mouthY-12-p.age*.04)+" "+fmt(g.landmarks.mouthR[0])+" "+fmt(mouthY-1);
  const lowerLip="M "+fmt(g.landmarks.mouthL[0]+2)+" "+fmt(mouthY+2)+
    " Q "+fmt(cx)+" "+fmt(mouthY+9+g.expression.mouthOpen*10)+" "+fmt(g.landmarks.mouthR[0]-2)+" "+fmt(mouthY+2);
  const beardOpacity=p.beardStyle==="none"?0:.22;
  const eyeLine=(id:string)=>id.indexOf("eye-upper")===0;
  const featureStyle=(id:string)=>{
    if(id.indexOf("brow")===0)return {width:character==="zhong-kui"?1.7:1.2,opacity:.58};
    if(eyeLine(id))return {width:1.35,opacity:.88};
    if(id.indexOf("eye-lower")===0)return {width:.75,opacity:.45};
    if(id.indexOf("nose")===0)return {width:1.0,opacity:.58};
    if(id.indexOf("lips")===0||id==="mouth-line")return {width:1.0,opacity:.78};
    return {width:.8,opacity:.52};
  };
  const robe=robePath(character),collar=collarPath(character);
  return <svg className={className} style={{display:"block",width:"100%",height:"auto",...style}}
    viewBox="0 0 480 600" role="img"
    aria-label={p.sourceLabel+" Chinese ink anatomical portrait, "+emotion}
    data-km-ink-anat6-character={character}
    data-km-ink-anat6-source={g.sourceId}
    data-km-ink-anat6-source-object={g.sourceObjectId}
    data-km-ink-anat6-headwear={g.headwear}
    data-km-ink-anat6-beard={g.beardStyle}
    data-km-ink-anat6-yaw={g.yaw}
    data-km-expr1-transition-from={g.transitionFrom}
    data-km-expr1-transition-progress={g.transitionProgress}
    data-km-expr1-nearest-emotion={g.expressionMatch}
    data-km-ink-anat6-hair-fiber-count={hair.length}
    data-km-ink-anat6-beard-fiber-count={beard.length}
    data-km-anat1-source="468-point-face-mesh"
    data-km-expr1-emotion={emotion}>
    <defs>
      <linearGradient id={uid+"-paper"} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#f3eadb"/><stop offset=".58" stopColor="#eadfcd"/><stop offset="1" stopColor="#e4d7c3"/>
      </linearGradient>
      <radialGradient id={uid+"-skin"} cx="39%" cy="22%" r="83%">
        <stop offset="0" stopColor="#f6e9d7"/><stop offset=".34" stopColor={p.skin}/>
        <stop offset=".74" stopColor="#dfc9b0"/><stop offset="1" stopColor="#c8aa8e" stopOpacity=".82"/>
      </radialGradient>
      <radialGradient id={uid+"-cheek"} cx="50%" cy="45%" r="62%">
        <stop offset="0" stopColor={p.wash} stopOpacity=".28"/><stop offset=".58" stopColor={p.wash} stopOpacity=".12"/>
        <stop offset="1" stopColor={p.wash} stopOpacity="0"/>
      </radialGradient>
      <radialGradient id={uid+"-orbit"} cx="50%" cy="50%" r="68%">
        <stop offset="0" stopColor="#74604f" stopOpacity=".25"/><stop offset=".65" stopColor="#806b57" stopOpacity=".10"/>
        <stop offset="1" stopColor="#806b57" stopOpacity="0"/>
      </radialGradient>
      <linearGradient id={uid+"-nose"} x1="0" y1="0" x2="1" y2=".15">
        <stop offset="0" stopColor="#886e58" stopOpacity="0"/><stop offset=".48" stopColor="#a58268" stopOpacity=".28"/>
        <stop offset="1" stopColor="#f7ead7" stopOpacity=".1"/>
      </linearGradient>
      <linearGradient id={uid+"-neck"} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#a88970" stopOpacity=".48"/><stop offset=".45" stopColor="#f0dfc8"/>
        <stop offset="1" stopColor="#987d68" stopOpacity=".4"/>
      </linearGradient>
      <linearGradient id={uid+"-robe"} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#f0e7d8"/><stop offset=".38" stopColor={p.robe}/>
        <stop offset=".78" stopColor="#cbbca7"/><stop offset="1" stopColor="#b9a992"/>
      </linearGradient>
      <linearGradient id={uid+"-cap"} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#4b4941"/><stop offset=".42" stopColor={p.headwearColor}/>
        <stop offset="1" stopColor="#1f211f"/>
      </linearGradient>
      <linearGradient id={uid+"-beard"} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor={p.beardColor}/><stop offset=".62" stopColor={p.beardColor}/>
        <stop offset="1" stopColor={character==="shepherd"?"#8e8376":"#211f1b"}/>
      </linearGradient>
      <filter id={uid+"-soft"} x="-35%" y="-35%" width="170%" height="170%">
        <feGaussianBlur stdDeviation="2.1"/>
      </filter>
      <filter id={uid+"-wash"} x="-55%" y="-55%" width="210%" height="210%">
        <feGaussianBlur stdDeviation="5.2"/>
      </filter>
      <filter id={uid+"-paper-grain"} x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency=".72" numOctaves="2" seed="17" result="noise"/>
        <feColorMatrix in="noise" type="saturate" values="0" result="mono"/>
        <feComponentTransfer in="mono" result="grain">
          <feFuncA type="table" tableValues="0 .12"/>
        </feComponentTransfer>
        <feBlend in="SourceGraphic" in2="grain" mode="multiply"/>
      </filter>
      <clipPath id={uid+"-face-clip"}><path d={g.outline}/></clipPath>
      <clipPath id={uid+"-headwear-clip"}><path d={cap}/></clipPath>
      <clipPath id={uid+"-robe-clip"}><path d={robe}/></clipPath>
    </defs>

    <rect width="480" height="600" fill={"url(#"+uid+"-paper)"}/>
    <g data-km-ink-anat6-paper-fibers="true" opacity=".13" fill="none" stroke="#9f8d76" strokeLinecap="round">
      {Array.from({length:38},(_,i)=>{
        const x=18+(i*67)%442,y=20+(i*113)%560,len=7+(i%7)*3;
        return <path key={i} d={"M "+fmt(x)+" "+fmt(y)+" q "+fmt((i%3-1)*1.6)+" "+fmt(len*.45)+" "+fmt((i%5-2)*.6)+" "+fmt(len)}
          strokeWidth={i%4===0?.7:.38} opacity={.28+(i%4)*.08}/>;
      })}
    </g>
    <g opacity=".08" fill="none" stroke={p.wash} strokeWidth="9" filter={"url(#"+uid+"-wash)"}>
      <path d="M 26 170 Q 85 122 128 151 T 214 130"/>
      <path d="M 314 112 Q 378 92 442 144 T 466 205"/>
    </g>

    <path d={robe} fill={"url(#"+uid+"-robe)"} stroke={p.ink} strokeWidth="1.05" strokeOpacity=".52"/>
    <g clipPath={"url(#"+uid+"-robe-clip)"} fill="none" stroke={p.ink}>
      {folds.map((f,i)=><path key={i} data-km-ink-anat6-robe-fold={i} d={f.d}
        strokeWidth={f.width} strokeOpacity={f.opacity} strokeLinecap="round"/>)}
      <path d="M 76 586 Q 150 554 208 584 M 404 586 Q 330 554 272 584"
        stroke={p.wash} strokeWidth="8" opacity=".12" filter={"url(#"+uid+"-wash)"}/>
      <path d="M 116 503 Q 165 517 190 548 M 364 503 Q 315 517 290 548"
        stroke="#f7efdf" strokeWidth="2.4" opacity=".48"/>
    </g>

    <path d={"M "+fmt(cx-25)+" "+fmt(chin[1]-2)+" C "+fmt(cx-27)+" "+fmt(chin[1]+39)+" 210 450 197 482 Q 240 504 283 482 C 270 450 "+fmt(cx+27)+" "+fmt(chin[1]+39)+" "+fmt(cx+25)+" "+fmt(chin[1]-2)+" Z"}
      fill={"url(#"+uid+"-neck)"} opacity=".98"/>
    <path d="M 217 438 Q 240 458 263 438 M 222 452 Q 214 468 211 479 M 258 452 Q 266 468 269 479"
      fill="none" stroke={p.wash} strokeWidth="2.1" opacity=".28"/>

    <g data-km-ink-anat6-ear="L" opacity=".78">
      <path data-km-ink-anat6-ear-part="helix.L" d={earPath(g.landmarks.earRootL,"L",earScale)}
        fill="#d9c3aa" stroke={p.ink} strokeWidth=".85" strokeOpacity=".6"/>
      <path data-km-ink-anat6-ear-part="antihelix.L" d={earL.antihelix}
        fill="none" stroke={p.wash} strokeWidth="1.05" strokeLinecap="round" opacity=".72"/>
      <path data-km-ink-anat6-ear-part="concha.L" d={earL.concha}
        fill={p.wash} fillOpacity=".16" stroke={p.wash} strokeWidth=".7" opacity=".72"/>
      <path data-km-ink-anat6-ear-part="tragus.L" d={earL.tragus}
        fill="none" stroke={p.ink} strokeWidth=".9" strokeLinecap="round" opacity=".62"/>
      <path data-km-ink-anat6-ear-part="lobe.L" d={earL.lobe}
        fill="none" stroke={p.wash} strokeWidth="1.0" strokeLinecap="round" opacity=".65"/>
    </g>
    <g data-km-ink-anat6-ear="R" opacity=".55">
      <path data-km-ink-anat6-ear-part="helix.R" d={earPath(g.landmarks.earRootR,"R",earScale*.82)}
        fill="#d9c3aa" stroke={p.ink} strokeWidth=".72" strokeOpacity=".48"/>
      <path data-km-ink-anat6-ear-part="antihelix.R" d={earR.antihelix}
        fill="none" stroke={p.wash} strokeWidth=".85" strokeLinecap="round" opacity=".62"/>
      <path data-km-ink-anat6-ear-part="concha.R" d={earR.concha}
        fill={p.wash} fillOpacity=".12" stroke={p.wash} strokeWidth=".6" opacity=".58"/>
      <path data-km-ink-anat6-ear-part="tragus.R" d={earR.tragus}
        fill="none" stroke={p.ink} strokeWidth=".75" strokeLinecap="round" opacity=".5"/>
      <path data-km-ink-anat6-ear-part="lobe.R" d={earR.lobe}
        fill="none" stroke={p.wash} strokeWidth=".8" strokeLinecap="round" opacity=".52"/>
    </g>

    <path d={cap} fill={"url(#"+uid+"-cap)"} stroke={p.ink} strokeWidth="1.1" strokeOpacity=".75"
      data-km-ink-anat6-headwear-shape={p.headwear}/>
    {p.headwear==="scholar-cap"&&<>
      <path d={"M "+fmt(g.left-18)+" "+fmt(g.top+34)+" Q "+fmt(cx)+" "+fmt(g.top+55)+" "+fmt(g.right+18)+" "+fmt(g.top+34)}
        fill="none" stroke="#9a8d78" strokeWidth="2.2" opacity=".52"/>
      <path d={"M "+fmt(g.left-8)+" "+fmt(g.top+42)+" Q "+fmt(cx)+" "+fmt(g.top+58)+" "+fmt(g.right+8)+" "+fmt(g.top+42)}
        fill="none" stroke="#161816" strokeWidth="1.4" opacity=".72"/>
    </>}
    {p.headwear==="wrapped-hood"&&<>
      <path d={"M "+fmt(g.left-12)+" "+fmt(g.top+23)+" Q "+fmt(cx-14)+" "+fmt(g.top+53)+" "+fmt(cx+5)+" "+fmt(g.top+29)+" Q "+fmt(g.right+13)+" "+fmt(g.top+14)+" "+fmt(g.right+10)+" "+fmt(g.top+46)}
        fill="none" stroke="#d0d4c7" strokeWidth="4.2" opacity=".58"/>
      <path d={"M "+fmt(g.left-3)+" "+fmt(g.top+2)+" Q "+fmt(cx+3)+" "+fmt(g.top+38)+" "+fmt(g.right+8)+" "+fmt(g.top+18)}
        fill="none" stroke="#435f65" strokeWidth="1.6" opacity=".62"/>
    </>}
    {p.headwear==="loose-hair"&&<>
      <path d={"M "+fmt(cx+20)+" "+fmt(g.top-42)+" C "+fmt(cx+45)+" "+fmt(g.top-64)+" "+fmt(cx+66)+" "+fmt(g.top-42)+" "+fmt(cx+58)+" "+fmt(g.top-18)+" Q "+fmt(cx+42)+" "+fmt(g.top-4)+" "+fmt(cx+24)+" "+fmt(g.top-22)+" Z"}
        fill={p.hair} stroke={p.ink} strokeWidth=".8"/>
      <g transform={"translate("+fmt(cx+50)+" "+fmt(g.top-37)+")"} fill={p.accent} stroke="#784638" strokeWidth=".8">
        {Array.from({length:5},(_,i)=><ellipse key={i} cx={Math.cos(i*Math.PI*2/5)*7} cy={Math.sin(i*Math.PI*2/5)*7} rx="4.6" ry="7.2" transform={"rotate("+(i*72)+")"}/>)}
        <circle r="3.1" fill="#c39a5e"/>
      </g>
    </>}
    {p.headwear==="pinned-hair"&&<g data-km-ink-anat6-flower="peony">
      <g transform={"translate("+fmt(cx+45)+" "+fmt(g.top-42)+")"}>
        {Array.from({length:9},(_,i)=><ellipse key={i} cx={Math.cos(i*Math.PI*2/9)*8} cy={Math.sin(i*Math.PI*2/9)*8} rx="5.6" ry="9.2"
          transform={"rotate("+(i*40)+")"} fill={i%2===0?"#d77b83":"#b94f63"} stroke="#8d4b50" strokeWidth=".55"/>)}
        <circle r="4" fill="#d4ad69" stroke="#9d8053" strokeWidth=".65"/>
      </g>
      <path d={"M "+fmt(cx-32)+" "+fmt(g.top-35)+" q 24 -18 48 -5"}
        fill="none" stroke="#b7a06e" strokeWidth="2.1" strokeLinecap="round"/>
      <path d={"M "+fmt(cx-30)+" "+fmt(g.top-36)+" l -13 -16 m 13 16 l -2 -18"}
        fill="none" stroke="#7b9b8e" strokeWidth="1.8" strokeLinecap="round"/>
      <circle cx={fmt(cx-43)} cy={fmt(g.top-52)} r="2.4" fill="#b8a16b"/>
    </g>}

    <path d={g.outline} fill={"url(#"+uid+"-skin)"} stroke={p.ink} strokeWidth=".88" strokeOpacity=".46"/>
    {p.headwear==="scholar-cap"&&<g data-km-ink-anat6-cap-band="true" fill="none" stroke="#242522"><path d={"M "+fmt(g.left-13)+" "+fmt(g.top+29)+" Q "+fmt(cx)+" "+fmt(g.top+42)+" "+fmt(g.right+13)+" "+fmt(g.top+29)} strokeWidth="2.0" opacity=".64"/><path d={"M "+fmt(g.left-9)+" "+fmt(g.top+36)+" Q "+fmt(cx)+" "+fmt(g.top+47)+" "+fmt(g.right+9)+" "+fmt(g.top+36)} strokeWidth="1.1" opacity=".78"/></g>}
    <g clipPath={"url(#"+uid+"-face-clip)"} filter={"url(#"+uid+"-paper-grain)"}>
      <path d={"M "+fmt(forehead[0]-52)+" "+fmt(g.top+15)+" Q "+fmt(cx)+" "+fmt(g.top-9)+" "+fmt(forehead[0]+48)+" "+fmt(g.top+16)+" Q "+fmt(cx+20)+" "+fmt(g.top+59)+" "+fmt(cx)+" "+fmt(g.top+62)+" Q "+fmt(cx-30)+" "+fmt(g.top+55)+" "+fmt(forehead[0]-52)+" "+fmt(g.top+15)+" Z"}
        fill="#fff3df" opacity=".22" filter={"url(#"+uid+"-soft)"}/>
      <path d={"M "+fmt(cheekL[0]-22)+" "+fmt(cheekL[1]-10)+" C "+fmt(cheekL[0]-9)+" "+fmt(cheekL[1]-22)+" "+fmt(cheekL[0]+18)+" "+fmt(cheekL[1]-13)+" "+fmt(cheekL[0]+22)+" "+fmt(cheekL[1]+1)+" C "+fmt(cheekL[0]+12)+" "+fmt(cheekL[1]+17)+" "+fmt(cheekL[0]-10)+" "+fmt(cheekL[1]+24)+" "+fmt(cheekL[0]-23)+" "+fmt(cheekL[1]+10)+" Z"}
        fill={"url(#"+uid+"-cheek)"} opacity=".68"/>
      <path d={"M "+fmt(cheekR[0]-22)+" "+fmt(cheekR[1]-10)+" C "+fmt(cheekR[0]-9)+" "+fmt(cheekR[1]-22)+" "+fmt(cheekR[0]+18)+" "+fmt(cheekR[1]-13)+" "+fmt(cheekR[0]+22)+" "+fmt(cheekR[1]+1)+" C "+fmt(cheekR[0]+12)+" "+fmt(cheekR[1]+17)+" "+fmt(cheekR[0]-10)+" "+fmt(cheekR[1]+24)+" "+fmt(cheekR[0]-23)+" "+fmt(cheekR[1]+10)+" Z"}
        fill={"url(#"+uid+"-cheek)"} opacity=".62"/>
      <ellipse cx={g.landmarks.eyeInnerL[0]-10} cy={g.landmarks.eyeInnerL[1]+1} rx="18" ry="10"
        fill={"url(#"+uid+"-orbit)"} opacity=".72"/>
      <ellipse cx={g.landmarks.eyeInnerR[0]+10} cy={g.landmarks.eyeInnerR[1]+1} rx="18" ry="10"
        fill={"url(#"+uid+"-orbit)"} opacity=".58"/>
      <path d={"M "+fmt(g.landmarks.sellion[0]-7)+" "+fmt(g.landmarks.sellion[1]+5)+" C "+fmt(g.landmarks.sellion[0]-9)+" "+fmt(g.landmarks.sellion[1]+25)+" "+fmt(nose[0]-8)+" "+fmt(nose[1]-14)+" "+fmt(nose[0]-7)+" "+fmt(nose[1]+2)+" C "+fmt(nose[0]-2)+" "+fmt(nose[1]+8)+" "+fmt(nose[0]+3)+" "+fmt(nose[1]+8)+" "+fmt(nose[0]+5)+" "+fmt(nose[1]+2)+" C "+fmt(nose[0]+7)+" "+fmt(nose[1]-13)+" "+fmt(g.landmarks.sellion[0]+5)+" "+fmt(g.landmarks.sellion[1]+25)+" "+fmt(g.landmarks.sellion[0]+4)+" "+fmt(g.landmarks.sellion[1]+5)+" Z"}
        fill={"url(#"+uid+"-nose)"} opacity=".62"/>
      <path d={"M "+fmt(g.landmarks.sellion[0]-4)+" "+fmt(g.landmarks.sellion[1]+8)+" C "+fmt(g.landmarks.sellion[0]-7)+" "+fmt(g.landmarks.sellion[1]+24)+" "+fmt(nose[0]-5)+" "+fmt(nose[1]-6)+" "+fmt(nose[0]-5)+" "+fmt(nose[1]+1)}
        fill="none" stroke={p.wash} strokeWidth="1.15" opacity=".46"/>
      <path d={"M "+fmt(g.landmarks.sellion[0]+4)+" "+fmt(g.landmarks.sellion[1]+8)+" C "+fmt(g.landmarks.sellion[0]+7)+" "+fmt(g.landmarks.sellion[1]+24)+" "+fmt(nose[0]+6)+" "+fmt(nose[1]-6)+" "+fmt(nose[0]+6)+" "+fmt(nose[1]+1)}
        fill="none" stroke={p.ink} strokeWidth=".8" opacity=".28"/>
      <path d={"M "+fmt(g.landmarks.gonionL[0]-3)+" "+fmt(g.landmarks.gonionL[1]-8)+" Q "+fmt(cx)+" "+fmt(chin[1]+29)+" "+fmt(g.landmarks.gonionR[0]+3)+" "+fmt(g.landmarks.gonionR[1]-8)}
        fill="none" stroke="#8b725e" strokeWidth="8" opacity=".08" filter={"url(#"+uid+"-wash)"}/>
      <path d={"M "+fmt(g.landmarks.pronasale[0]-9)+" "+fmt(g.landmarks.pronasale[1]+4)+" Q "+fmt(g.landmarks.pronasale[0])+" "+fmt(g.landmarks.pronasale[1]+10)+" "+fmt(g.landmarks.pronasale[0]+9)+" "+fmt(g.landmarks.pronasale[1]+4)}
        fill="none" stroke="#735b4a" strokeWidth="1.1" opacity=".46"/>
      {Array.from({length:Math.round(p.age/8*detail)},(_,i)=>{
        const side=i%2===0?-1:1,offset=Math.floor(i/2);
        const x=cx+side*(30+offset*2.2),y=g.landmarks.eyeInnerL[1]+20+offset*2.4;
        return <path key={i} data-km-ink-anat6-age-mark={i}
          d={"M "+fmt(x)+" "+fmt(y)+" q "+fmt(side*4)+" "+fmt(2+offset*.2)+" "+fmt(side*8)+" "+fmt(3+offset*.25)}
          fill="none" stroke={p.wash} strokeWidth=".7" opacity=".23"/>;
      })}
    </g>

    {p.beardStyle!=="none"&&<>
      <path d={beardPath} fill={"url(#"+uid+"-beard)"} opacity={beardOpacity}
        data-km-ink-anat6-beard-mass={p.beardStyle}/>
      <g data-km-ink-anat6-beard-fibers="true" fill="none" stroke={p.beardColor} strokeLinecap="round">
        {beard.map((f,i)=><path key={i} data-km-ink-anat6-beard-fiber={i} d={f.d}
          strokeWidth={f.width} strokeOpacity={f.opacity}/>)}
      </g>
    </>}

    <g data-km-anat1-eye-openings="true">
      {g.eyeOpenings.map(eye=><path key={eye.side} data-km-anat1-eye-opening={eye.side}
        d={eye.d} fill="#f3e8d8" fillOpacity={eye.side==="L"?.74:.56} stroke="none"/>)}
    </g>
    <g data-km-anat1-features="true" fill="none" stroke={p.ink} strokeLinecap="round" strokeLinejoin="round">
      {g.features.map((f,i)=>{
        const s=featureStyle(f.id);
        return <path key={i} data-km-anat1-feature={f.id} d={f.d}
          strokeWidth={s.width} strokeOpacity={s.opacity}/>;
      })}

      <path d={g.mouthOutline} data-km-anat1-mouth-shape="true" fill={p.lip} fillOpacity=".19" stroke="none"/>
      <path d={g.mouthLine} data-km-anat1-mouth-line="true" stroke={p.ink} strokeWidth={g.expression.mouthOpen>.12?1.15:.82} strokeOpacity=".82"/>
      <path d={upperLip} stroke={p.lip} strokeWidth="1.0" opacity=".66"/>
      <path d={lowerLip} stroke={p.wash} strokeWidth=".85" opacity=".58"/>
      {g.expression.mouthOpen>.06&&<path data-km-anat1-oral-aperture="true"
        d={"M "+fmt(g.landmarks.mouthL[0]+3)+" "+fmt(mouthY+1)+" Q "+fmt(cx)+" "+fmt(mouthY+Math.min(7,g.expression.mouthOpen*5.8))+" "+fmt(g.landmarks.mouthR[0]-3)+" "+fmt(mouthY+1)+" Q "+fmt(cx)+" "+fmt(mouthY-Math.min(2,g.expression.mouthOpen*1.3))+" "+fmt(g.landmarks.mouthL[0]+3)+" "+fmt(mouthY+1)+" Z"}
        fill="#57382f" opacity={clamp(g.expression.mouthOpen*.8,0,.68)}/>}
      {character==="lady"&&<path d={"M "+fmt(cx-8)+" "+fmt(mouthY+5)+" Q "+fmt(cx)+" "+fmt(mouthY+7)+" "+fmt(cx+8)+" "+fmt(mouthY+5)}
        fill="none" stroke="#f2c6b9" strokeWidth=".85" opacity=".62"/>}
      <path d={"M "+fmt(cx)+" "+fmt(g.landmarks.subnasale[1]-3)+" Q "+fmt(cx-1)+" "+fmt(mouthY-11)+" "+fmt(cx-2)+" "+fmt(mouthY-4)}
        stroke={p.wash} strokeWidth=".9" opacity=".44"/>
      <path d={"M "+fmt(g.landmarks.pronasale[0]-12)+" "+fmt(g.landmarks.pronasale[1]+6)+" q -3 4 -5 2 M "+fmt(g.landmarks.pronasale[0]+12)+" "+fmt(g.landmarks.pronasale[1]+6)+" q 3 4 5 2"}
        stroke={p.ink} strokeWidth="1.1" opacity=".68"/>
    </g>

    <g data-km-ink-anat6-brow-fibers="true" fill="none" stroke={p.hair} strokeLinecap="round">
      {brows.map((fiber,i)=><path key={i} data-km-ink-anat6-brow-fiber={i} d={fiber.d}
        strokeWidth={fiber.width} strokeOpacity={fiber.opacity}/>)}
    </g>
    <g data-km-anat1-irises="true">
      {g.irises.map(iris=><g key={iris.side} data-km-anat1-iris={iris.side}>
        <ellipse cx={iris.x} cy={iris.y} rx={iris.rx} ry={iris.ry} fill="#74604d" opacity=".84"/>
        <ellipse cx={iris.x} cy={iris.y} rx={iris.rx*.43} ry={iris.ry*.78} fill="#211f1b"/>
        <circle cx={iris.x-iris.rx*.28} cy={iris.y-iris.ry*.32} r="1.25" fill="#fff2dc" opacity=".82"/>
      </g>)}
    </g>

    <g data-km-expr1-marks="true" fill="none" stroke={p.wash} strokeLinecap="round">
      {g.marks.map((mark,i)=><path key={i} data-km-expr1-mark={mark.id} d={mark.d}
        strokeWidth={.55+mark.strength*.72} strokeOpacity={.18+mark.strength*.48}/>)}
    </g>
    {p.beardStyle!=="none"&&<g data-km-ink-anat6-moustache="true" fill="none" stroke={p.beardColor} strokeLinecap="round">
      <path d={"M "+fmt(cx-2)+" "+fmt(mouthY-4)+" C "+fmt(cx-15)+" "+fmt(mouthY-17)+" "+fmt(g.landmarks.mouthL[0]-13)+" "+fmt(mouthY-8)+" "+fmt(g.landmarks.mouthL[0]-5)+" "+fmt(mouthY+1)}
        strokeWidth={character==="zhong-kui"?3.2:1.7} opacity=".72"/>
      <path d={"M "+fmt(cx+2)+" "+fmt(mouthY-4)+" C "+fmt(cx+15)+" "+fmt(mouthY-17)+" "+fmt(g.landmarks.mouthR[0]+13)+" "+fmt(mouthY-8)+" "+fmt(g.landmarks.mouthR[0]+5)+" "+fmt(mouthY+1)}
        strokeWidth={character==="zhong-kui"?3.2:1.7} opacity=".72"/>
    </g>}

    <g data-km-ink-anat6-head-fibers="true" clipPath={"url(#"+uid+"-headwear-clip)"} fill="none" stroke={p.hair} strokeLinecap="round">
      {hair.map((f,i)=><path key={i} data-km-ink-anat6-hair-fiber={i} d={f.d} strokeWidth={f.width} strokeOpacity={f.opacity}/>)}
    </g>
    {p.headwear==="wrapped-hood"&&<g fill="none" stroke="#526f73" strokeLinecap="round">
      <path d={"M "+fmt(g.left-12)+" "+fmt(g.top+17)+" Q "+fmt(cx-8)+" "+fmt(g.top+47)+" "+fmt(g.right+11)+" "+fmt(g.top+17)}
        strokeWidth="1.5" opacity=".7"/>
      <path d={"M "+fmt(g.left-5)+" "+fmt(g.top+28)+" Q "+fmt(cx+10)+" "+fmt(g.top+58)+" "+fmt(g.right+5)+" "+fmt(g.top+28)}
        strokeWidth=".9" opacity=".52"/>
    </g>}
    {character==="lady"&&<>
      <g data-km-ink-anat6-earring="L" fill="none" stroke="#b99a5d" strokeLinecap="round">
        <path d={"M "+fmt(g.landmarks.earRootL[0]-2)+" "+fmt(g.landmarks.earRootL[1]+5)+" q -4 9 -2 17"} strokeWidth="1.0"/>
        <circle cx={fmt(g.landmarks.earRootL[0]-4)} cy={fmt(g.landmarks.earRootL[1]+23)} r="2.5" fill="#8ca69a" stroke="#7c8e7f"/>
        <path d={"M "+fmt(g.landmarks.earRootL[0]-4)+" "+fmt(g.landmarks.earRootL[1]+25)+" q -1 6 -3 8"} strokeWidth=".8"/>
        <ellipse cx={fmt(g.landmarks.earRootL[0]-7)} cy={fmt(g.landmarks.earRootL[1]+34)} rx="2.2" ry="3.6" fill="#d3b26f" stroke="#9b8154"/>
      </g>
      <g data-km-ink-anat6-earring="R" fill="none" stroke="#b99a5d" strokeLinecap="round">
        <path d={"M "+fmt(g.landmarks.earRootR[0]+2)+" "+fmt(g.landmarks.earRootR[1]+5)+" q 4 9 2 17"} strokeWidth="1.0"/>
        <circle cx={fmt(g.landmarks.earRootR[0]+4)} cy={fmt(g.landmarks.earRootR[1]+23)} r="2.5" fill="#8ca69a" stroke="#7c8e7f"/>
        <path d={"M "+fmt(g.landmarks.earRootR[0]+4)+" "+fmt(g.landmarks.earRootR[1]+25)+" q 1 6 3 8"} strokeWidth=".8"/>
        <ellipse cx={fmt(g.landmarks.earRootR[0]+7)} cy={fmt(g.landmarks.earRootR[1]+34)} rx="2.2" ry="3.6" fill="#d3b26f" stroke="#9b8154"/>
      </g>
      <g data-km-ink-anat6-folded-fan="true" strokeLinecap="round">
        <path d="M 173 526 Q 240 493 307 526 L 296 564 Q 240 548 184 564 Z" fill="#e8d9bf" stroke="#917d61" strokeWidth="1.05"/>
        {Array.from({length:11},(_,i)=>{
          const x=183+i*11.4;
          return <path key={i} d={"M 240 556 Q "+fmt(x)+" 540 "+fmt(x)+" 527"} fill="none" stroke={i%3===0?"#9d795f":"#b49b78"} strokeWidth={i%3===0?.85:.48} opacity=".7"/>;
        })}
        <path d="M 240 555 L 240 589" stroke="#9a805d" strokeWidth="2.1"/>
        <path d="M 185 565 Q 240 553 295 565" fill="none" stroke="#f7ecda" strokeWidth="1.1" opacity=".8"/>
      </g>
    </>}

    <path d={collar} fill={p.collar} fillOpacity=".82" stroke={p.ink} strokeWidth="1.0" strokeOpacity=".64"/>
    <path d={"M 240 506 Q 222 530 194 557 M 240 506 Q 258 530 286 557"}
      fill="none" stroke={p.accent} strokeWidth="2.1" opacity=".64"/>
    <path d={"M 240 521 Q 225 546 213 568 M 240 521 Q 255 546 267 568"}
      fill="none" stroke="#f5ecdc" strokeWidth="1.6" opacity=".68"/>
    {character==="lady"&&<g data-km-ink-anat6-robe-embroidery="true" fill="none" stroke="#d6bd83" strokeLinecap="round">
      {Array.from({length:14},(_,i)=>{
        const x=176+(i%7)*21,y=486+Math.floor(i/7)*12;
        return <g key={i} transform={"translate("+x+" "+y+")"}>
          <path d="M 0 -4 Q 5 0 0 4 Q -5 0 0 -4 Z" strokeWidth=".55" opacity=".72"/>
          <circle r="1.1" fill="#c49e66" stroke="none"/>
        </g>;
      })}
      <path d="M 164 494 Q 240 526 316 494 M 179 505 Q 240 536 301 505" strokeWidth=".7" opacity=".55"/>
    </g>}
    {character==="lady"&&<g data-km-ink-anat6-sleeve-cuffs="true">
      <path d="M 100 548 Q 137 525 178 550 L 191 585 Q 151 606 111 580 Z"
        fill="#eadfcf" stroke="#51483e" strokeWidth="1.1"/>
      <path d="M 380 548 Q 343 525 302 550 L 289 585 Q 329 606 369 580 Z"
        fill="#eadfcf" stroke="#51483e" strokeWidth="1.1"/>
      <path d="M 108 555 Q 145 535 181 557 M 113 568 Q 149 548 185 570 M 119 581 Q 153 562 188 583"
        fill="none" stroke="#b98d65" strokeWidth=".8"/>
      <path d="M 372 555 Q 335 535 299 557 M 367 568 Q 331 548 295 570 M 361 581 Q 327 562 292 583"
        fill="none" stroke="#b98d65" strokeWidth=".8"/>
      {Array.from({length:12},(_,i)=>{
        const side=i<6?-1:1,k=i%6,x=side<0?119+k*11:361-k*11,y=555+k*4.8;
        return <g key={i} data-km-ink-anat6-cuff-flower={i} transform={"translate("+x+" "+y+")"}>
          <path d="M 0 -3.5 Q 3 -1 0 2 Q -3 -1 0 -3.5 Z M -3.5 0 Q -1 -3 2 0 Q -1 3 -3.5 0 Z"
            fill="#b86b6b" stroke="#86544c" strokeWidth=".45"/>
          <circle r="1" fill="#d0ad70" stroke="none"/>
        </g>;
      })}
    </g>}
    {character==="lady"&&<g data-km-ink-anat6-fan-ornament="true" fill="none" strokeLinecap="round">
      <path d="M 207 529 Q 220 520 233 529 M 247 529 Q 260 520 273 529"
        stroke="#a75f64" strokeWidth=".8" opacity=".75"/>
      <path d="M 220 532 q 4 -7 8 0 q -4 7 -8 0 M 252 532 q 4 -7 8 0 q -4 7 -8 0"
        stroke="#bd8b62" strokeWidth=".7"/>
      <circle cx="240" cy="535" r="2" fill="#b96d71" stroke="none"/>
    </g>}
    {character==="lady"&&<g data-km-ink-anat6-fan-hands="true">
      <path d="M 212 542 C 206 546 207 557 214 564 Q 222 570 232 560 L 237 550 Q 229 541 220 540 Z"
        fill={p.skin} stroke={p.ink} strokeWidth=".8"/>
      <path d="M 216 545 Q 220 550 220 557 M 223 543 Q 228 549 226 556 M 230 547 Q 234 552 231 558"
        fill="none" stroke={p.wash} strokeWidth=".7" strokeLinecap="round"/>
      <path d="M 268 542 C 274 546 273 557 266 564 Q 258 570 248 560 L 243 550 Q 251 541 260 540 Z"
        fill={p.skin} stroke={p.ink} strokeWidth=".8"/>
      <path d="M 264 545 Q 260 550 260 557 M 257 543 Q 252 549 254 556 M 250 547 Q 246 552 249 558"
        fill="none" stroke={p.wash} strokeWidth=".7" strokeLinecap="round"/>
      <path d="M 218 543 q 2 -3 4 -2 M 261 541 q 2 -1 4 2"
        fill="none" stroke="#fff1e7" strokeWidth=".65" opacity=".7"/>
    </g>}
    <g fill="none" stroke={p.ink} strokeLinecap="round">
      {Array.from({length:Math.round(22*detail)},(_,i)=>{
        const t=(i+.5)/Math.round(22*detail),x=116+t*248;
        const y=494+Math.sin(t*Math.PI)*11;
        return <path key={i} data-km-ink-anat6-robe-grain={i}
          d={"M "+fmt(x)+" "+fmt(y)+" q "+fmt((t-.5)*3)+" 9 "+fmt((t-.5)*7)+" 18"}
          strokeWidth=".42" opacity=".2"/>;
      })}
    </g>
    <text x="24" y="578" fontFamily="Georgia,serif" fontSize="10" letterSpacing="1.6"
      fill={p.ink} opacity=".68">{p.sourceLabel.toUpperCase()} · ANAT1 / EXPR1</text>
  </svg>;
}
