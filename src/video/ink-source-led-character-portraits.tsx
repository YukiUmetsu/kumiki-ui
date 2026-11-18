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
  expressEmotion,expressFace,expressionFeatures,expressionMarks,irisPositions,findEmotion,
} from "../../registry/anatomy/expression-face";
import type {ExpressionFeatures} from "../../registry/anatomy/expression-face";
import {renderMeshFrame,projectPoint,smoothPath} from "../../registry/anatomy/anatomy-view";
import type {Vec3} from "../../registry/anatomy/anatomy-body";

export const INK_SOURCE_LED_CHARACTERS=["scholar","shepherd","zhong-kui"] as const;
export const INK_SOURCE_LED_EXPRESSIONS=["neutral","smile","sad","angry","surprise","fear"] as const;
export type InkSourceLedCharacter=typeof INK_SOURCE_LED_CHARACTERS[number];
export type InkSourceLedExpression=typeof INK_SOURCE_LED_EXPRESSIONS[number];
type Point=[number,number];

export interface InkSourceLedCharacterPortraitProps {
  character?:InkSourceLedCharacter;
  emotion?:InkSourceLedExpression;
  intensity?:number;
  detail?:number;
  yaw?:number;
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
  lowerFace:number;
  noseWidth:number;
  noseProjection:number;
  eyeSpacing:number;
  eyeHeight:number;
  mouthWidth:number;
  cheekWidth:number;
  cheekLift:number;
  browLift:number;
  age:number;
  headwear:"scholar-cap"|"wrapped-hood"|"loose-hair";
  hairFiberCount:number;
  hair:string;
  headwearColor:string;
  beardStyle:"pointed"|"long"|"full";
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
}

const PROFILES:Record<InkSourceLedCharacter,SourceProfile>={
  scholar:{
    sourceId:"cma-chen-hongshou-1979.27.2.19+met-ren-yi-zhong-kui-2002.208.2+cma-1961.89",
    sourceObjectId:"CMA 1979.27.2.19",
    sourceLabel:"Staff-bearing scholar",
    sourceNote:"A narrow, upright scholar with a black cap, fine moustache, tapered beard, staff and brush; the redraw studies the iron-wire contour rhythm and measured garment line.",
    yaw:16,pitch:-3,faceWidth:.93,jawWidth:.91,lowerFace:1.09,
    noseWidth:.96,noseProjection:1.03,eyeSpacing:.98,eyeHeight:.88,mouthWidth:.94,
    cheekWidth:.95,cheekLift:1.2,browLift:.4,age:56,
    headwear:"scholar-cap",hairFiberCount:34,hair:"#282a27",headwearColor:"#292b28",
    beardStyle:"pointed",beardFiberCount:66,beardLength:72,beardSpread:48,beardColor:"#34312b",
    ink:"#39362f",skin:"#eadbc6",wash:"#92755f",robe:"#e7ddce",collar:"#c9bca8",accent:"#9a5d45",
  },
  shepherd:{
    sourceId:"tsinghua-ren-yi-su-wu-1874",
    sourceObjectId:"Tsinghua Su Wu · 1874",
    sourceLabel:"Su Wu, the shepherd",
    sourceNote:"An older seated figure with greying temples, a far-reaching gaze, blue wrapped hood, long beard and scepter. The source emphasizes a stretched torso and a steadfast expression.",
    yaw:7,pitch:-1,faceWidth:1.02,jawWidth:.98,lowerFace:1.12,
    noseWidth:1.04,noseProjection:1.06,eyeSpacing:1.01,eyeHeight:.82,mouthWidth:1.02,
    cheekWidth:1.05,cheekLift:.2,browLift:-.8,age:68,
    headwear:"wrapped-hood",hairFiberCount:28,hair:"#b7a58e",headwearColor:"#758d91",
    beardStyle:"long",beardFiberCount:112,beardLength:126,beardSpread:62,beardColor:"#c2b7a5",
    ink:"#484238",skin:"#e4d1b8",wash:"#927965",robe:"#d9d1c2",collar:"#b8c0b6",accent:"#607e83",
  },
  "zhong-kui":{
    sourceId:"met-ren-yi-zhong-kui-2002.208.2",
    sourceObjectId:"Met 2002.208.2",
    sourceLabel:"Zhong Kui",
    sourceNote:"The legendary figure is rendered as an eccentric scholar: broad cheek and jaw mass, heavy beard, loose hair with a blossom, and a voluminous seated robe.",
    yaw:10,pitch:1,faceWidth:1.07,jawWidth:1.10,lowerFace:1.04,
    noseWidth:1.14,noseProjection:1.12,eyeSpacing:1.04,eyeHeight:1.02,mouthWidth:1.08,
    cheekWidth:1.12,cheekLift:.8,browLift:-1.0,age:48,
    headwear:"loose-hair",hairFiberCount:78,hair:"#292621",headwearColor:"#302b27",
    beardStyle:"full",beardFiberCount:154,beardLength:108,beardSpread:94,beardColor:"#302c27",
    ink:"#37332d",skin:"#e8d6c1",wash:"#94735e",robe:"#d8c5b1",collar:"#b79c84",accent:"#a94f3d",
  },
};

const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
const smooth=(v:number)=>{const t=clamp(v,0,1);return t*t*(3-2*t);};
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
  const base=createFace({calibrate:false,sex:1});
  const vertices=base.vertices.map(v=>[v[0],v[1],v[2]] as Vec3);
  const at=(name:FaceLandmark)=>vertices[FACE_LANDMARKS[name]];
  const sellionY=at("sellion")[1],subnasaleY=at("subnasale")[1];
  const mentonY=at("menton")[1],stomionY=at("stomion")[1];
  const lowerSpan=Math.max(1,subnasaleY-mentonY);
  const eyeL=(at("palpebrale-superius.L")[1]+at("palpebrale-inferius.L")[1])/2;
  const eyeR=(at("palpebrale-superius.R")[1]+at("palpebrale-inferius.R")[1])/2;
  const eyeY=(eyeL+eyeR)/2;
  const cheekL=at("cheekbone.L"),cheekR=at("cheekbone.R");
  for(const v of vertices){
    const x=v[0],y=v[1];
    const lower=smooth(clamp((subnasaleY-y)/lowerSpan,0,1));
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
    const brow=Math.max(
      gaussian(x,y,at("brow-inner.L")[0],at("brow-inner.L")[1],19,10),
      gaussian(x,y,at("brow-inner.R")[0],at("brow-inner.R")[1],19,10),
    );
    v[0]=x*p.faceWidth;
    v[0]*=1+(p.jawWidth-1)*lower;
    v[0]*=1+(p.noseWidth-1)*nose;
    v[0]*=1+(p.eyeSpacing-1)*eyes;
    v[0]*=1+(p.mouthWidth-1)*mouth;
    v[0]*=1+(p.cheekWidth-1)*cheek;
    v[1]=subnasaleY+(y-subnasaleY)*(y<subnasaleY?p.lowerFace:1);
    v[1]=eyeY+(v[1]-eyeY)*(1+(p.eyeHeight-1)*eyes);
    v[1]-=p.cheekLift*cheek;
    v[1]-=p.browLift*brow;
    v[2]*=1+(p.noseProjection-1)*nose;
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
  irises:{side:"L"|"R";x:number;y:number;rx:number;ry:number}[];
  landmarks:Record<string,Point>;
  expression:ExpressionFeatures;
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
):SourceLedPortraitGeometry{
  if(!INK_SOURCE_LED_CHARACTERS.includes(character))throw new RangeError("Unknown ANAT6 character");
  if(!INK_SOURCE_LED_EXPRESSIONS.includes(emotion)||(emotion!=="neutral"&&!findEmotion(emotion)))
    throw new RangeError("Unknown ANAT6 expression");
  if(!Number.isFinite(intensity)||intensity<0||intensity>1)
    throw new RangeError("ANAT6 expression intensity must be in [0,1]");
  const p=PROFILES[character],yaw=yawOverride===undefined?p.yaw:yawOverride;
  if(!Number.isFinite(yaw)||yaw < -35||yaw > 35)
    throw new RangeError("ANAT6 yaw must be finite and in [-35,35]");
  const base=FACE_BASE[character];
  const expressed=emotion==="neutral"?expressFace({},base):expressEmotion(emotion,intensity,base);
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
      rx:fmt(gaze.r*frame.projection.scale/1000*1.58*.58*(near?1:.76)),
      ry:fmt(gaze.r*frame.projection.scale/1000*1.58*.48*clamp(expressionFeatures(expressed).eyeOpen,.35,1.5)*(near?1:.82)),
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
    mouthL:landmark("cheilion.L"),mouthR:landmark("cheilion.R"),
    eyeInnerL:landmark("endocanthion.L"),eyeInnerR:landmark("endocanthion.R"),
    browInnerL:landmark("brow-inner.L"),browInnerR:landmark("brow-inner.R"),
  };
  return {
    character,sourceId:p.sourceId,sourceObjectId:p.sourceObjectId,sourceLabel:p.sourceLabel,
    headwear:p.headwear,beardStyle:p.beardStyle,hairFiberCount:p.hairFiberCount,
    beardFiberCount:p.beardFiberCount,yaw,outline,features,marks,irises,landmarks,
    expression:e,faceWidthMm:m.zyZy,noseWidthMm:m.alAl,mouthWidthMm:m.chCh,
    lowerFaceMm:m.snGn,top:Math.min(...outlinePoints.map(x=>x[1])),
    left:Math.min(...outlinePoints.map(x=>x[0])),right:Math.max(...outlinePoints.map(x=>x[0])),
  };
}

interface Fiber {d:string;width:number;opacity:number}
function buildBeardFibers(g:SourceLedPortraitGeometry,p:SourceProfile,detail:number):Fiber[]{
  const count=Math.max(12,Math.round(p.beardFiberCount*detail));
  const cx=(g.landmarks.mouthL[0]+g.landmarks.mouthR[0])/2;
  const jawL=g.landmarks.gonionL[0],jawR=g.landmarks.gonionR[0];
  const mouthY=(g.landmarks.mouthL[1]+g.landmarks.mouthR[1])/2;
  const chinY=g.landmarks.menton[1];
  return Array.from({length:count},(_,i)=>{
    const t=(i+.5)/count,r=rand(41+i,characterSeed(g.character));
    const startX=jawL-4+t*(jawR-jawL+8);
    const startY=mouthY+9+r*13;
    const endX=cx+(t-.5)*p.beardSpread+(r-.5)*11;
    const endY=Math.min(558,chinY+p.beardLength*(.76+r*.34));
    const c1x=startX+(endX-startX)*.22+(r-.5)*9;
    const c1y=startY+17+r*12;
    const c2x=endX+(cx-endX)*.18+(r-.5)*8;
    const c2y=endY-15-r*12;
    return {
      d:"M "+fmt(startX)+" "+fmt(startY)+" C "+fmt(c1x)+" "+fmt(c1y)+" "+fmt(c2x)+" "+fmt(c2y)+" "+fmt(endX)+" "+fmt(endY),
      width:fmt(.28+r*.72),opacity:fmt(.22+r*.42),
    };
  });
}
function characterSeed(character:InkSourceLedCharacter){
  return character==="scholar"?17:character==="shepherd"?53:91;
}
function buildHeadFibers(g:SourceLedPortraitGeometry,p:SourceProfile,detail:number):Fiber[]{
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
      const x=cx-w*.56+t*w*1.12;
      const y0=top-59+Math.sin(t*Math.PI)*-5;
      return {
        d:"M "+fmt(x)+" "+fmt(y0)+" Q "+fmt(x+(t-.5)*5)+" "+fmt(top-15)+" "+fmt(x+(t-.5)*7)+" "+fmt(top+24),
        width:fmt(.32+r*.38),opacity:fmt(.16+r*.25),
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

function headwearPath(g:SourceLedPortraitGeometry,p:SourceProfile){
  const cx=(g.left+g.right)/2,top=g.top;
  if(p.headwear==="scholar-cap"){
    return "M "+fmt(g.left-18)+" "+fmt(top+35)+
      " C "+fmt(g.left-26)+" "+fmt(top+6)+" "+fmt(cx-43)+" "+fmt(top-67)+" "+fmt(cx)+" "+fmt(top-76)+
      " C "+fmt(cx+43)+" "+fmt(top-67)+" "+fmt(g.right+26)+" "+fmt(top+6)+" "+fmt(g.right+18)+" "+fmt(top+35)+
      " L "+fmt(g.right+13)+" "+fmt(top+48)+" Q "+fmt(cx)+" "+fmt(top+62)+" "+fmt(g.left-13)+" "+fmt(top+48)+" Z";
  }
  if(p.headwear==="wrapped-hood"){
    return "M "+fmt(g.left-13)+" "+fmt(top+37)+
      " C "+fmt(g.left-27)+" "+fmt(top+2)+" "+fmt(cx-44)+" "+fmt(top-54)+" "+fmt(cx-8)+" "+fmt(top-68)+
      " Q "+fmt(cx+18)+" "+fmt(top-76)+" "+fmt(g.right+14)+" "+fmt(top+12)+
      " Q "+fmt(g.right+29)+" "+fmt(top+46)+" "+fmt(g.right-5)+" "+fmt(top+57)+
      " Q "+fmt(cx)+" "+fmt(top+27)+" "+fmt(g.left+7)+" "+fmt(top+58)+" Z";
  }
  return "M "+fmt(g.left-15)+" "+fmt(top+36)+
    " C "+fmt(g.left-30)+" "+fmt(top-5)+" "+fmt(cx-45)+" "+fmt(top-67)+" "+fmt(cx-8)+" "+fmt(top-70)+
    " C "+fmt(cx+18)+" "+fmt(top-89)+" "+fmt(g.right+28)+" "+fmt(top-18)+" "+fmt(g.right+17)+" "+fmt(top+34)+
    " C "+fmt(g.right+4)+" "+fmt(top+64)+" "+fmt(g.right-12)+" "+fmt(top+86)+" "+fmt(g.right-26)+" "+fmt(top+91)+
    " Q "+fmt(cx)+" "+fmt(top+49)+" "+fmt(g.left+21)+" "+fmt(top+88)+" Z";
}

function robePath(character:InkSourceLedCharacter){
  if(character==="scholar")
    return "M 82 600 C 98 546 119 511 158 489 Q 195 467 221 468 L 259 468 Q 285 467 322 489 C 361 511 382 546 398 600 Z";
  if(character==="shepherd")
    return "M 54 600 C 76 534 112 500 159 482 Q 198 464 240 468 Q 282 464 321 482 C 368 500 404 534 426 600 Z";
  return "M 34 600 C 57 524 104 482 160 470 Q 202 448 240 456 Q 278 448 320 470 C 376 482 423 524 446 600 Z";
}

function collarPath(character:InkSourceLedCharacter){
  if(character==="scholar")
    return "M 195 466 Q 216 480 240 505 Q 264 480 285 466 L 316 493 Q 286 515 260 550 L 240 565 L 220 550 Q 194 515 164 493 Z";
  if(character==="shepherd")
    return "M 178 468 Q 210 483 240 520 Q 270 483 302 468 L 336 501 Q 296 522 268 567 L 240 581 L 212 567 Q 184 522 144 501 Z";
  return "M 176 457 Q 210 480 240 518 Q 270 480 304 457 L 350 500 Q 301 531 269 575 L 240 588 L 211 575 Q 179 531 130 500 Z";
}

function beardMassPath(g:SourceLedPortraitGeometry,p:SourceProfile){
  const l=g.landmarks.gonionL,r=g.landmarks.gonionR,mL=g.landmarks.mouthL,mR=g.landmarks.mouthR;
  const cx=(mL[0]+mR[0])/2,my=(mL[1]+mR[1])/2,chin=g.landmarks.menton[1];
  const end=Math.min(558,chin+p.beardLength);
  const spread=p.beardSpread/2;
  if(p.beardStyle==="pointed"){
    return "M "+fmt(mL[0]-4)+" "+fmt(my+7)+
      " Q "+fmt(l[0]-7)+" "+fmt(chin+8)+" "+fmt(cx-spread*.65)+" "+fmt(end-18)+
      " Q "+fmt(cx)+" "+fmt(end+9)+" "+fmt(cx+spread*.65)+" "+fmt(end-18)+
      " Q "+fmt(r[0]+7)+" "+fmt(chin+8)+" "+fmt(mR[0]+4)+" "+fmt(my+7)+
      " Q "+fmt(cx)+" "+fmt(my+22)+" "+fmt(mL[0]-4)+" "+fmt(my+7)+" Z";
  }
  if(p.beardStyle==="long"){
    return "M "+fmt(l[0]-8)+" "+fmt(my+2)+
      " C "+fmt(l[0]-22)+" "+fmt(chin+20)+" "+fmt(cx-spread)+" "+fmt(end-20)+" "+fmt(cx-7)+" "+fmt(end)+
      " Q "+fmt(cx+2)+" "+fmt(end+12)+" "+fmt(cx+spread*.9)+" "+fmt(end-8)+
      " C "+fmt(r[0]+20)+" "+fmt(chin+20)+" "+fmt(r[0]+8)+" "+fmt(my+2)+" "+fmt(mR[0]+4)+" "+fmt(my+2)+
      " Q "+fmt(cx)+" "+fmt(my+26)+" "+fmt(mL[0]-4)+" "+fmt(my+2)+" Z";
  }
  return "M "+fmt(l[0]-16)+" "+fmt(my-1)+
    " C "+fmt(l[0]-30)+" "+fmt(chin+14)+" "+fmt(cx-spread)+" "+fmt(end-24)+" "+fmt(cx-7)+" "+fmt(end)+
    " Q "+fmt(cx)+" "+fmt(end+12)+" "+fmt(cx+spread*.95)+" "+fmt(end-4)+
    " C "+fmt(r[0]+30)+" "+fmt(chin+14)+" "+fmt(r[0]+16)+" "+fmt(my-1)+" "+fmt(mR[0]+5)+" "+fmt(my-1)+
    " Q "+fmt(cx)+" "+fmt(my+27)+" "+fmt(mL[0]-5)+" "+fmt(my-1)+" Z";
}

export function InkSourceLedCharacterPortrait({
  character="scholar",emotion="neutral",intensity=.88,detail=1,yaw,className,style,
}:InkSourceLedCharacterPortraitProps){
  if(!INK_SOURCE_LED_CHARACTERS.includes(character))throw new RangeError("Unknown ANAT6 character");
  if(!INK_SOURCE_LED_EXPRESSIONS.includes(emotion))throw new RangeError("Unknown ANAT6 expression");
  if(!Number.isFinite(intensity)||intensity<0||intensity>1)
    throw new RangeError("ANAT6 intensity must be in [0,1]");
  if(!Number.isFinite(detail)||detail<.25||detail>1)
    throw new RangeError("ANAT6 detail must be in [.25,1]");
  if(yaw!==undefined&&(!Number.isFinite(yaw)||yaw < -35||yaw > 35))
    throw new RangeError("ANAT6 yaw must be finite and in [-35,35]");
  const p=PROFILES[character],uid="km-anat6-"+useId().replace(/[^a-zA-Z0-9_-]/g,"");
  const g=useMemo(()=>buildSourceLedPortraitGeometry(character,emotion,intensity,yaw),[character,emotion,intensity,yaw]);
  const beard=useMemo(()=>buildBeardFibers(g,p,detail),[g,p,detail]);
  const hair=useMemo(()=>buildHeadFibers(g,p,detail),[g,p,detail]);
  const folds=robeFolds(character);
  const cx=(g.left+g.right)/2,w=g.right-g.left;
  const chin=g.landmarks.menton,forehead=g.landmarks.forehead;
  const mouthY=(g.landmarks.mouthL[1]+g.landmarks.mouthR[1])/2;
  const nose=g.landmarks.pronasale;
  const cheekL=g.landmarks.cheekboneL,cheekR=g.landmarks.cheekboneR;
  const earScale=clamp(w/142,.78,1.18);
  const cap=headwearPath(g,p);
  const beardPath=beardMassPath(g,p);
  const upperLip="M "+fmt(g.landmarks.mouthL[0])+" "+fmt(mouthY-1)+
    " Q "+fmt(cx)+" "+fmt(mouthY-12-p.age*.04)+" "+fmt(g.landmarks.mouthR[0])+" "+fmt(mouthY-1);
  const lowerLip="M "+fmt(g.landmarks.mouthL[0]+2)+" "+fmt(mouthY+2)+
    " Q "+fmt(cx)+" "+fmt(mouthY+9+g.expression.mouthOpen*10)+" "+fmt(g.landmarks.mouthR[0]-2)+" "+fmt(mouthY+2);
  const beardOpacity=character==="shepherd"?.9:.94;
  const eyeLine=(id:string)=>id.indexOf("eye-upper")===0;
  const featureStyle=(id:string)=>{
    if(id.indexOf("brow")===0)return {width:character==="zhong-kui"?2.5:1.9,opacity:.76};
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
      <clipPath id={uid+"-robe-clip"}><path d={robe}/></clipPath>
    </defs>

    <rect width="480" height="600" fill={"url(#"+uid+"-paper)"}/>
    <g opacity=".18" fill="none" stroke="#9f8d76" strokeWidth=".55">
      {Array.from({length:16},(_,i)=><path key={i} d={"M "+(18+i*31)+" 0 q "+(i%2?5:-4)+" 180 "+(i%2?-3:4)+" 600"}/>)}
      {Array.from({length:12},(_,i)=><path key={"h"+i} d={"M 0 "+(36+i*48)+" q 120 "+(i%2?2:-2)+" 240 0 t 240 0"}/>)}
    </g>
    <g opacity=".14" fill="none" stroke={p.wash} strokeWidth="12" filter={"url(#"+uid+"-wash)"}>
      <path d="M 24 170 Q 82 110 124 148 T 218 118"/>
      <path d="M 310 110 Q 380 82 448 144 T 470 210"/>
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

    <g data-km-ink-anat6-ear="L" opacity=".74">
      <path d={earPath(g.landmarks.zygionL,"L",earScale)} fill="#d9c3aa" stroke={p.ink} strokeWidth=".85" strokeOpacity=".6"/>
      <path d={"M "+fmt(g.landmarks.zygionL[0]-4)+" "+fmt(g.landmarks.zygionL[1]-9)+" Q "+fmt(g.landmarks.zygionL[0]-13)+" "+fmt(g.landmarks.zygionL[1])+" "+fmt(g.landmarks.zygionL[0]-4)+" "+fmt(g.landmarks.zygionL[1]+10)}
        fill="none" stroke={p.wash} strokeWidth="1.1" opacity=".62"/>
    </g>
    <g data-km-ink-anat6-ear="R" opacity=".55">
      <path d={earPath(g.landmarks.zygionR,"R",earScale*.82)} fill="#d9c3aa" stroke={p.ink} strokeWidth=".72" strokeOpacity=".48"/>
      <path d={"M "+fmt(g.landmarks.zygionR[0]+3)+" "+fmt(g.landmarks.zygionR[1]-7)+" Q "+fmt(g.landmarks.zygionR[0]+10)+" "+fmt(g.landmarks.zygionR[1])+" "+fmt(g.landmarks.zygionR[0]+3)+" "+fmt(g.landmarks.zygionR[1]+8)}
        fill="none" stroke={p.wash} strokeWidth=".9" opacity=".55"/>
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
      <path d={"M "+fmt(cx+20)+" "+fmt(g.top-61)+" C "+fmt(cx+45)+" "+fmt(g.top-84)+" "+fmt(cx+66)+" "+fmt(g.top-56)+" "+fmt(cx+58)+" "+fmt(g.top-32)+" Q "+fmt(cx+42)+" "+fmt(g.top-16)+" "+fmt(cx+24)+" "+fmt(g.top-35)+" Z"}
        fill={p.hair} stroke={p.ink} strokeWidth=".8"/>
      <g transform={"translate("+fmt(cx+50)+" "+fmt(g.top-56)+")"} fill={p.accent} stroke="#784638" strokeWidth=".8">
        {Array.from({length:5},(_,i)=><ellipse key={i} cx={Math.cos(i*Math.PI*2/5)*7} cy={Math.sin(i*Math.PI*2/5)*7} rx="4.6" ry="7.2" transform={"rotate("+(i*72)+")"}/>)}
        <circle r="3.1" fill="#c39a5e"/>
      </g>
    </>}

    <path d={g.outline} fill={"url(#"+uid+"-skin)"} stroke={p.ink} strokeWidth=".88" strokeOpacity=".46"/>
    {p.headwear==="scholar-cap"&&<g data-km-ink-anat6-cap-band="true" fill="none" stroke="#242522"><path d={"M "+fmt(g.left-18)+" "+fmt(g.top+34)+" Q "+fmt(cx)+" "+fmt(g.top+55)+" "+fmt(g.right+18)+" "+fmt(g.top+34)} strokeWidth="2.2" opacity=".64"/><path d={"M "+fmt(g.left-8)+" "+fmt(g.top+42)+" Q "+fmt(cx)+" "+fmt(g.top+58)+" "+fmt(g.right+8)+" "+fmt(g.top+42)} strokeWidth="1.2" opacity=".78"/></g>}
    <g clipPath={"url(#"+uid+"-face-clip)"} filter={"url(#"+uid+"-paper-grain)"}>
      <path d={"M "+fmt(forehead[0]-52)+" "+fmt(g.top+15)+" Q "+fmt(cx)+" "+fmt(g.top-9)+" "+fmt(forehead[0]+48)+" "+fmt(g.top+16)+" Q "+fmt(cx+20)+" "+fmt(g.top+59)+" "+fmt(cx)+" "+fmt(g.top+62)+" Q "+fmt(cx-30)+" "+fmt(g.top+55)+" "+fmt(forehead[0]-52)+" "+fmt(g.top+15)+" Z"}
        fill="#fff3df" opacity=".22" filter={"url(#"+uid+"-soft)"}/>
      <ellipse cx={cheekL[0]} cy={cheekL[1]+9} rx={character==="zhong-kui"?25:21} ry="34"
        fill={"url(#"+uid+"-cheek)"} transform={"rotate(-12 "+fmt(cheekL[0])+" "+fmt(cheekL[1]+9)+")"} opacity=".92"/>
      <ellipse cx={cheekR[0]} cy={cheekR[1]+9} rx={character==="zhong-kui"?25:21} ry="34"
        fill={"url(#"+uid+"-cheek)"} transform={"rotate(12 "+fmt(cheekR[0])+" "+fmt(cheekR[1]+9)+")"} opacity=".86"/>
      <ellipse cx={g.landmarks.eyeInnerL[0]-12} cy={g.landmarks.eyeInnerL[1]+1} rx="22" ry="14"
        fill={"url(#"+uid+"-orbit)"}/>
      <ellipse cx={g.landmarks.eyeInnerR[0]+12} cy={g.landmarks.eyeInnerR[1]+1} rx="22" ry="14"
        fill={"url(#"+uid+"-orbit)"}/>
      <path d={"M "+fmt(g.landmarks.sellion[0]-12)+" "+fmt(g.landmarks.sellion[1]+5)+" C "+fmt(nose[0]-9)+" "+fmt(g.landmarks.sellion[1]+37)+" "+fmt(nose[0]-8)+" "+fmt(nose[1]-9)+" "+fmt(nose[0]-13)+" "+fmt(nose[1]+4)+" Q "+fmt(nose[0])+" "+fmt(nose[1]+19)+" "+fmt(nose[0]+15)+" "+fmt(nose[1]+5)+" C "+fmt(nose[0]+8)+" "+fmt(nose[1]-9)+" "+fmt(nose[0]+8)+" "+fmt(g.landmarks.sellion[1]+37)+" "+fmt(g.landmarks.sellion[0]+12)+" "+fmt(g.landmarks.sellion[1]+5)+" Z"}
        fill={"url(#"+uid+"-nose)"} opacity=".88"/>
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

    <path d={beardPath} fill={"url(#"+uid+"-beard)"} opacity={beardOpacity}
      data-km-ink-anat6-beard-mass={p.beardStyle}/>
    <g data-km-ink-anat6-beard-fibers="true" fill="none" stroke={p.beardColor} strokeLinecap="round">
      {beard.map((f,i)=><path key={i} data-km-ink-anat6-beard-fiber={i} d={f.d}
        strokeWidth={f.width} strokeOpacity={f.opacity}/>)}
    </g>

    <g data-km-anat1-features="true" fill="none" stroke={p.ink} strokeLinecap="round" strokeLinejoin="round">
      {g.features.map((f,i)=>{
        const s=featureStyle(f.id);
        return <path key={i} data-km-anat1-feature={f.id} d={f.d}
          strokeWidth={s.width} strokeOpacity={s.opacity}/>;
      })}
      <path d={upperLip} stroke={p.ink} strokeWidth="1.05" opacity=".74"/>
      <path d={lowerLip} stroke={p.wash} strokeWidth=".85" opacity=".66"/>
      <path d={"M "+fmt(cx)+" "+fmt(g.landmarks.subnasale[1]-3)+" Q "+fmt(cx-1)+" "+fmt(mouthY-11)+" "+fmt(cx-2)+" "+fmt(mouthY-4)}
        stroke={p.wash} strokeWidth=".9" opacity=".44"/>
      <path d={"M "+fmt(g.landmarks.pronasale[0]-12)+" "+fmt(g.landmarks.pronasale[1]+6)+" q -3 4 -5 2 M "+fmt(g.landmarks.pronasale[0]+12)+" "+fmt(g.landmarks.pronasale[1]+6)+" q 3 4 5 2"}
        stroke={p.ink} strokeWidth="1.1" opacity=".68"/>
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
    <g data-km-ink-anat6-moustache="true" fill="none" stroke={p.beardColor} strokeLinecap="round">
      <path d={"M "+fmt(cx-2)+" "+fmt(mouthY-4)+" C "+fmt(cx-15)+" "+fmt(mouthY-17)+" "+fmt(g.landmarks.mouthL[0]-13)+" "+fmt(mouthY-8)+" "+fmt(g.landmarks.mouthL[0]-5)+" "+fmt(mouthY+1)}
        strokeWidth={character==="zhong-kui"?4.1:2.4} opacity=".86"/>
      <path d={"M "+fmt(cx+2)+" "+fmt(mouthY-4)+" C "+fmt(cx+15)+" "+fmt(mouthY-17)+" "+fmt(g.landmarks.mouthR[0]+13)+" "+fmt(mouthY-8)+" "+fmt(g.landmarks.mouthR[0]+5)+" "+fmt(mouthY+1)}
        strokeWidth={character==="zhong-kui"?4.1:2.4} opacity=".86"/>
    </g>

    <g data-km-ink-anat6-head-fibers="true" fill="none" stroke={p.headwear==="loose-hair"?p.hair:p.headwearColor} strokeLinecap="round">
      {hair.map((f,i)=><path key={i} data-km-ink-anat6-hair-fiber={i} d={f.d}
        strokeWidth={f.width} strokeOpacity={f.opacity}/>)}
    </g>
    {p.headwear==="wrapped-hood"&&<g fill="none" stroke="#526f73" strokeLinecap="round">
      <path d={"M "+fmt(g.left-12)+" "+fmt(g.top+17)+" Q "+fmt(cx-8)+" "+fmt(g.top+47)+" "+fmt(g.right+11)+" "+fmt(g.top+17)}
        strokeWidth="1.5" opacity=".7"/>
      <path d={"M "+fmt(g.left-5)+" "+fmt(g.top+28)+" Q "+fmt(cx+10)+" "+fmt(g.top+58)+" "+fmt(g.right+5)+" "+fmt(g.top+28)}
        strokeWidth=".9" opacity=".52"/>
    </g>}

    <path d={collar} fill={p.collar} fillOpacity=".82" stroke={p.ink} strokeWidth="1.0" strokeOpacity=".64"/>
    <path d={"M 240 506 Q 222 530 194 557 M 240 506 Q 258 530 286 557"}
      fill="none" stroke={p.accent} strokeWidth="2.1" opacity=".64"/>
    <path d={"M 240 521 Q 225 546 213 568 M 240 521 Q 255 546 267 568"}
      fill="none" stroke="#f5ecdc" strokeWidth="1.6" opacity=".68"/>
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
