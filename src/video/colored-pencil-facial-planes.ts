/**
 * ArtCraft v7 — source-conditioned facial pigment for one licensed CC0 woman.
 *
 * This is a narrow, anatomy-measured construction study, not face detection.
 * Lip corners, two vermilion planes and nasal cartilage are supplied by the
 * 25 verified CC0 landmarks. Every pigment gesture samples the legal photo
 * ONLY for local value/hue/edge flow. The photo bitmap is never returned.
 *
 * Technique benchmarks (no artist art traced or shipped):
 * Elena Pancorbo: warm lip pillows, transparent highlights, orbital volume.
 * Jesse Lane: dark alar anatomy, gradual rose/earth pigment deposition.
 */
import {pencilHash} from "../../registry/video/colored-pencil";
import type {PencilPhotoPixels} from "./colored-pencil-photo";
import type {PortraitFeatureMap} from "./colored-pencil-portrait-guides";

export type FacialPlaneKind="lip-vermilion"|"nasal-alar";
export interface FacialPlaneStroke {
  readonly kind:FacialPlaneKind;
  readonly x:number;readonly y:number;
  readonly dx:number;readonly dy:number;
  readonly color:string;
  readonly width:number;readonly alpha:number;
  readonly curvature:number;
}
export interface FacialPlaneEvidence {
  readonly marks:readonly FacialPlaneStroke[];
  readonly regions:Readonly<Record<FacialPlaneKind,number>>;
  readonly rasterUnderpainting:false;
}
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
const q=(a:number,b:number,c:number,t:number)=>{
  const n=1-t;return n*n*a+2*n*t*b+t*t*c;
};
const rgb=(src:PencilPhotoPixels,x:number,y:number):readonly[number,number,number]=>{
  const ix=clamp(Math.round(x),0,src.width-1);
  const iy=clamp(Math.round(y),0,src.height-1);
  const i=(iy*src.width+ix)*4;
  return [src.data[i],src.data[i+1],src.data[i+2]];
};
const value=(src:PencilPhotoPixels,x:number,y:number)=>{
  // Optical (not source-pixel stamp) value; average 3 registered samples.
  let sum=0;
  for(const dx of [-1.1,0,1.1]){
    const c=rgb(src,x+dx,y);
    sum+=(.2126*c[0]+.7152*c[1]+.0722*c[2])/255;
  }
  return sum/3;
};
const hex=(c:readonly number[])=>"#"+c.map(x=>
  clamp(Math.round(x),0,255).toString(16).padStart(2,"0")).join("");
const valid=(src:PencilPhotoPixels,g:PortraitFeatureMap,seed:number,strength:number)=>{
  // Public research helpers must also fail closed on malformed runtime maps,
  // rather than reading a missing landmark before validating it.
  if(!g||typeof g!=="object"||Object.keys(g).length!==25||
    Object.values(g).some(p=>!Array.isArray(p)||p.length!==2||
      !p.every(Number.isFinite)))
    throw new RangeError("Invalid CC0 facial source landmarks");
  const d=Math.hypot(
    g.eyeNearCenter[0]-g.eyeFarCenter[0],
    g.eyeNearCenter[1]-g.eyeFarCenter[1],
  );
  if(!(src.data instanceof Uint8ClampedArray)||
    !Number.isSafeInteger(src.width)||!Number.isSafeInteger(src.height)||
    src.width<8||src.height<8||src.width>2048||src.height>2048||
    src.data.length!==src.width*src.height*4||
    !Number.isSafeInteger(seed)||seed<0||seed>2147483647||
    !Number.isFinite(strength)||strength<0||strength>1||
    !Number.isFinite(d)||d<8||d>1600||
    Object.values(g).some(p=>!Array.isArray(p)||p.length!==2||
      !p.every(Number.isFinite)))
    throw new RangeError("Invalid CC0 face source, feature map, seed or detail strength");
  return d;
};
/** Two anatomical lip pillows and the actual alar cast-shadow, on plain paper.
 * NO generic tinted face ellipse, photofilter, teeth wash, or hard nose outline.
 */
export const createFacialOpticalPlanes=(
  source:PencilPhotoPixels,guides:PortraitFeatureMap,
  seed=271,strength=.85,
):FacialPlaneEvidence=>{
  const d=valid(source,guides,seed,strength);
  const marks:FacialPlaneStroke[]=[];
  const counts:Record<FacialPlaneKind,number>={
    "lip-vermilion":0,"nasal-alar":0,
  };
  const push=(kind:FacialPlaneKind,x:number,y:number,
    dx:number,dy:number,ink:string,alpha:number,width:number,
    curvature:number)=>{
    if(x<1||y<1||x>=source.width-2||y>=source.height-2||
      !Number.isFinite(alpha)||alpha<=0)return;
    marks.push({
      kind,x,y,dx,dy,color:ink,
      alpha:clamp(alpha,.006,.56),width,curvature,
    });
    counts[kind]++;
  };
  // The published source's two upper/lower lip planes are NOT a stamped
  // cartoon polygon. A lip-shaped source-supported scan determines where
  // directional rose/earth pigment is permitted; the teeth/highlight stay
  // blank because light low-chroma pixels are rejected.
  const [left,right,cupid,lower]=[
    guides.lipLeft,guides.lipRight,guides.lipCupid,guides.lipLower,
  ];
  const width=Math.hypot(right[0]-left[0],right[1]-left[1]);
  const lipStep=d*.014;
  const columns=clamp(Math.ceil(width/lipStep),8,120);
  for(const layer of [0,1] as const){
    for(let col=0;col<columns;col++){
      const t=(col+.5)/columns;
      const x=mix(left[0],right[0],t);
      const top=q(left[1],cupid[1],right[1],t);
      const bottom=q(left[1],lower[1],right[1],t);
      if(bottom-top<.5)continue;
      const rows=clamp(Math.ceil((bottom-top)/(d*.014)),3,45);
      for(let row=0;row<rows;row++){
        const n=layer*100000+col*47+row;
        const across=Math.pow(Math.sin(Math.PI*t),.55);
        const u=(row+.5+(pencilHash(seed,n,311)-.5)*.29)/rows;
        const y=mix(top,bottom,u);
        const c=rgb(source,x,y),v=value(source,x,y);
        const redExcess=c[0]-c[1],chroma=c[0]-c[2];
        // The source has a pale opening between both lips. Preserve it;
        // do not fill teeth, highlights or skin with a preset lipstick red.
        if(v>.83||redExcess<13||chroma<6)continue;
        const pressure=clamp((.88-v)/.68,0,1);
        const likelihood=(.50+.48*pressure)*(.50+.50*across);
        if(pencilHash(seed,n,312)>likelihood)continue;
        const theta=(layer===0?-.11:.20)+(t-.5)*.35+
          (pencilHash(seed,n,313)-.5)*.17;
        const length=d*(.020+.006*pencilHash(seed,n,314));
        const brown=layer===0?.09:.14;
        const ink=hex([
          mix(c[0],58,brown*.70),mix(c[1],36,brown),
          mix(c[2],42,brown),
        ]);
        push("lip-vermilion",x,y,
          Math.cos(theta)*length,Math.sin(theta)*length,
          ink,(.23+.30*pressure)*strength*(.68+.32*across),
          layer===0?1.40:1.14,
          (pencilHash(seed,n,315)-.5)*.15);
      }
    }
  }
  // Nasal plane detailing is optical, not a fixed drawn triangle. Only a
  // source-confirmed dark local gradient may carry an alar cartilage mark.
  // Stroke direction follows the photographed gradient tangent, preserving
  // bridge/alar bright reserves instead of blackening the nose tip.
  const n=guides.noseTip;
  const rx=Math.max(d*.27,
    Math.abs(guides.noseAlaNear[0]-guides.noseAlaFar[0])*.9);
  const ry=d*.24;
  const step=d*.014;
  const cols=clamp(Math.ceil(2*rx/step),8,100);
  const rows=clamp(Math.ceil(2*ry/step),8,100);
  for(let layer=0;layer<2;layer++){
    for(let iy=0;iy<rows;iy++)for(let ix=0;ix<cols;ix++){
      const hash=layer*130031+iy*cols+ix;
      const x=n[0]-rx+(ix+.5+(pencilHash(seed,hash,316)-.5)*.23)*2*rx/cols;
      const y=n[1]-ry+(iy+.5+(pencilHash(seed,hash,317)-.5)*.23)*2*ry/rows;
      const u=(x-n[0])/rx,v=(y-n[1])/ry;
      if(u*u+v*v>=1)continue;
      const l=value(source,x,y);
      if(l>.76)continue;
      const delta=d*.010;
      const gx=value(source,x+delta,y)-value(source,x-delta,y);
      const gy=value(source,x,y+delta)-value(source,x,y-delta);
      const edge=Math.hypot(gx,gy);
      if(edge<.038||pencilHash(seed,hash,318)>
        clamp((edge-.03)*5.1,0,1))continue;
      const c=rgb(source,x,y);
      const theta=Math.atan2(-gx,gy)+(layer===0?0:.23)+
        (pencilHash(seed,hash,319)-.5)*.16;
      const length=d*(.016+.010*pencilHash(seed,hash,320));
      push("nasal-alar",x,y,
        Math.cos(theta)*length,Math.sin(theta)*length,
        hex([mix(c[0],48,.22),mix(c[1],37,.24),mix(c[2],36,.20)]),
        (.20+.34*clamp((edge-.035)*5,0,1))*strength,
        layer===0?.82:.64,(pencilHash(seed,hash,321)-.5)*.12);
    }
  }
  return {marks,regions:counts,rasterUnderpainting:false};
};
