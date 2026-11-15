/**
 * ANAT1 → CP-F1 bridge. A single calibrated, three-dimensional cranial face
 * drives *all* original dry-pencil features. MediaPipe mesh geometry and
 * published facial measurements determine topology, never a photographed
 * texture, CSS filter or independently guessed circular cartoon landmarks.
 *
 * The projection is an authorable three-quarter portrait camera. It is
 * deliberately independent of any one photograph or performer.
 */
import {
  createFace, eyeCentres, FACE_FEATURES, FACE_LANDMARKS,
  FACE_MESH_SOURCE, IRIS_DIAMETER_MM, measureFace,
} from "../anatomy/anatomy-face";
import { smoothPath } from "../anatomy/anatomy-view";

export interface PencilAnatomyCurve {
  path: string;
  bounds: readonly [number,number,number,number];
}
export interface PencilPortraitCamera {
  centerX?: number;
  centerY?: number;
  scaleX?: number;
  scaleY?: number;
  /** Yaw in degrees. The face still uses one continuous 3D model. */
  yaw?: number;
}
export interface PencilPortraitAnatomy {
  source: string;
  metrics: ReturnType<typeof measureFace>;
  landmarks: Record<string,readonly [number,number]>;
  features: Record<string,PencilAnatomyCurve>;
  eyes: Record<"R"|"L",PencilAnatomyCurve>;
  irises: Record<"R"|"L",PencilAnatomyCurve>;
  pupils: Record<"R"|"L",PencilAnatomyCurve>;
  browInk: Record<"R"|"L",PencilAnatomyCurve>;
  browMass: PencilAnatomyCurve;
  lips: {upper:string;lower:string};
}

const round=(x:number)=>Math.round(x*100)/100;
const fmt=(x:number)=>round(x).toFixed(2);
const curve=(points:readonly [number,number][],closed=false)=>
  smoothPath(points,closed);
const bounded=(points:readonly [number,number][],path=curve(points,true),
  pad=2):PencilAnatomyCurve=>{
  if(!points.length||points.some(v=>v.some(x=>!Number.isFinite(x))))
    throw new RangeError("Empty or invalid anatomical feature");
  const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
  const left=Math.min(...xs)-pad,top=Math.min(...ys)-pad;
  return {path,bounds:[round(left),round(top),
    round(Math.max(...xs)-Math.min(...xs)+pad*2),
    round(Math.max(...ys)-Math.min(...ys)+pad*2)]};
};
const oval=(x:number,y:number,rx:number,ry:number):PencilAnatomyCurve=>{
  const k=.55228474983;
  const path="M"+fmt(x-rx)+" "+fmt(y)+
    " C"+fmt(x-rx)+" "+fmt(y-ry*k)+" "+fmt(x-rx*k)+" "+
      fmt(y-ry)+" "+fmt(x)+" "+fmt(y-ry)+
    " C"+fmt(x+rx*k)+" "+fmt(y-ry)+" "+fmt(x+rx)+" "+
      fmt(y-ry*k)+" "+fmt(x+rx)+" "+fmt(y)+
    " C"+fmt(x+rx)+" "+fmt(y+ry*k)+" "+fmt(x+rx*k)+" "+
      fmt(y+ry)+" "+fmt(x)+" "+fmt(y+ry)+
    " C"+fmt(x-rx*k)+" "+fmt(y+ry)+" "+fmt(x-rx)+" "+
      fmt(y+ry*k)+" "+fmt(x-rx)+" "+fmt(y)+" Z";
  return {path,bounds:[round(x-rx-2),round(y-ry-2),
    round(rx*2+4),round(ry*2+4)]};
};

/** The same 468 calibrated mesh vertices supply each eyelid and bone plane. */
export function pencilPortraitAnatomy(
  camera:PencilPortraitCamera={},
):PencilPortraitAnatomy{
  const {centerX=230,centerY=226,scaleX=1.3,scaleY=1.42,yaw=7.5}=camera;
  if(![centerX,centerY,scaleX,scaleY,yaw].every(Number.isFinite)||
    scaleX<.5||scaleX>2.5||scaleY<.5||scaleY>2.5||
    Math.abs(yaw)>35)
    throw new RangeError("Invalid ANAT1 face camera");
  const face=createFace({
    norm:"north-american-white",sex:.2,eyeSpacing:-.12,
    noseWidth:-.06,faceWidth:.99,
  });
  const theta=yaw*Math.PI/180, c=Math.cos(theta),s=Math.sin(theta);
  const project=(p:readonly number[]):[number,number]=>[
    round(centerX+scaleX*(p[0]*c+(p[2]-50)*s)),
    round(centerY-scaleY*p[1]+.03*(p[2]-50)),
  ];
  const features:Record<string,PencilAnatomyCurve>={};
  const paths:Record<string,[number,number][]>={};
  for(const [id,spec]of Object.entries(FACE_FEATURES)){
    const points=spec.loop.map(i=>project(face.vertices[i]));
    paths[id]=points;
    features[id]=bounded(points,curve(points,spec.closed));
  }
  const closedEye=(side:"R"|"L")=>{
    const upper=paths["eye-upper."+side],lower=paths["eye-lower."+side];
    // Both eyelid loops share canthi. Reverse the lower lid but do not
    // duplicate endpoints, preventing a self-crossed or detached ring.
    const outline=[...upper,...lower.slice(1,-1).reverse()];
    return bounded(outline,curve(outline,true));
  };
  const eyes={R:closedEye("R"),L:closedEye("L")};
  const ctr=eyeCentres(face.vertices);
  const irises={R:oval(0,0,1,1),L:oval(0,0,1,1)};
  const pupils={R:oval(0,0,1,1),L:oval(0,0,1,1)};
  for(const side of ["R","L"] as const){
    const [x,rawY]=project(ctr[side]);
    const [,top,,h]=eyes[side].bounds;
    const y=Math.min(top+h-3,Math.max(top+3,rawY+3.5));
    const irisRadius=Math.min(7.1,IRIS_DIAMETER_MM*scaleX*.44);
    irises[side]=oval(x,y,irisRadius,4.3);
    pupils[side]=oval(x+.35,y,2.3,3.75);
  }
  const browInk={R:features["brow.R"],L:features["brow.L"]};
  const browRibbon=(side:"R"|"L")=>{
    const points=paths["brow."+side];
    const bottom=points.slice().reverse().map(([x,y])=>[
      x,y+1.65] as [number,number]);
    return [...points,...bottom] as [number,number][];
  };
  const browPoints=[...browRibbon("R"),...browRibbon("L")];
  const browMass: PencilAnatomyCurve = {
    path:curve(browRibbon("R"),true)+" "+curve(browRibbon("L"),true),
    bounds:bounded(browPoints).bounds,
  };
  const mouth=paths["mouth-line"];
  const upper=[...paths["lips-upper"],...mouth.slice().reverse()];
  const lower=[...mouth,...paths["lips-lower"].slice().reverse()];
  const landmarks:Record<string,readonly [number,number]>={};
  for(const [name,index]of Object.entries(FACE_LANDMARKS))
    landmarks[name]=project(face.vertices[index]);
  return {
    source:FACE_MESH_SOURCE.name,
    metrics:measureFace(face.vertices),
    landmarks,features,eyes,irises,pupils,browInk,browMass,
    lips:{upper:curve(upper,true),lower:curve(lower,true)},
  };
}
