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
import { faceHair } from "../anatomy/anatomy-hair";
import { pencilHash } from "./colored-pencil";

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
  lips: {upper:string;lower:string;bounds:readonly [number,number,number,number]};
  nose:PencilAnatomyCurve;
  hair:Record<string,{path:string;count:number}>;
  pigment:readonly {id:string;path:string;color:string;width:number;opacity:number}[];
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
  const {centerX=230,centerY=226,scaleX=1.3,scaleY=1.42,yaw=-8.5}=camera;
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
    const [x]=project(ctr[side]);
    const [,top,,h]=eyes[side].bounds;
    // The actual upper/lower ANAT1 lid opening occludes iris and pupil;
    // avoid projecting an entire circular globe outside a shallow lid.
    const y=top+h/2;
    const half=Math.min(4.0,(h-4)/2-.2);
    const irisRadius=Math.min(7.1,IRIS_DIAMETER_MM*scaleX*.44);
    irises[side]=oval(x,y,irisRadius,half);
    pupils[side]=oval(x+.35,y,2.3,Math.max(1.8,half-.7));
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
  // ANAT1 labial tissue is morphometrically grounded. In a dry pencil
  // portrait the lips need their own narrow rolled plane, not a flat
  // filled ellipse spanning the full underlying face mesh.
  const mouthCenter=project(face.vertices[FACE_LANDMARKS.stomion])[1];
  const softenLip=(pts:readonly [number,number][]):[number,number][]=>
    pts.map(([x,y])=>[x,round(mouthCenter+(y-mouthCenter)*.57)]);
  const mouth=softenLip(paths["mouth-line"]);
  const upper=[...softenLip(paths["lips-upper"]),...mouth.slice().reverse()];
  const lower=[...mouth,...softenLip(paths["lips-lower"]).slice().reverse()];
  const lipsBounds=bounded([...upper,...lower],undefined,1).bounds;
  // Dorsal nasal cartilage has a narrow sellion and a much broader
  // soft alar base. All guide positions come from the same ANAT1 mesh.
  const named=(key:keyof typeof FACE_LANDMARKS)=>
    project(face.vertices[FACE_LANDMARKS[key]]);
  const root=named("sellion"),tip=named("pronasale"),
    base=named("subnasale"),alaR=named("alare.R"),alaL=named("alare.L");
  const wing=(v:readonly [number,number]):[number,number]=>[
    round(root[0]+(v[0]-root[0])*.80),v[1]];
  const left=wing(alaR),right=wing(alaL);
  const dorsal:[number,number][]=[
    [root[0]-4,root[1]+2],
    [root[0]-6,(root[1]+tip[1])*.52],
    [tip[0]-6,tip[1]-5],
    [left[0],left[1]],
    [base[0],base[1]+2],
    [right[0],right[1]],
    [tip[0]+6,tip[1]-6],
    [root[0]+5,(root[1]+tip[1])*.52],
    [root[0]+4,root[1]+2],
  ];
  const nose=bounded(dorsal,curve(dorsal,true),1);
  // ANAT1 follicles are rooted on actual 3D brow and lid loops. Project
  // each root, control point and tip through the *same* 3D cranial camera,
  // retaining hair taper/flow without post-raster filters or pasted art.
  const hair:Record<string,{path:string;count:number}>={};
  const grouped:Record<string,string[]>={};
  for(const stroke of faceHair(face.vertices,FACE_FEATURES,{
    browDensity:.56,lashes:18,seed:19,
  })){
    const id=stroke.kind+"."+stroke.side;
    const [root,mid,tip]=stroke.points.map(project);
    const d="M"+fmt(root[0])+" "+fmt(root[1])+
      " Q"+fmt(mid[0])+" "+fmt(mid[1])+
      " "+fmt(tip[0])+" "+fmt(tip[1]);
    (grouped[id]??=[]).push(d);
  }
  for(const [name,paths]of Object.entries(grouped)){
    const path=paths.join(" ");
    if(path.length>12000)throw new RangeError("ANAT1 hair trace exceeds CP-F1 budget");
    hair[name]={path,count:paths.length};
  }

  // The eye / nose / cheek pieces above share one ANAT1 camera. Surface
  // light must share their geometry too. Instead of a single digital flat
  // facial gradient, build real tiny dry-pencil contacts in the tangent
  // field of the calibrated 3D face triangles. A mark has an independent
  // pigment family, pressure, paper location and fixed animation timing.
  const families={
    middle:{color:"#B87B70",width:.62,opacity:.43,paths:[] as string[]},
    shadow:{color:"#806575",width:.55,opacity:.49,paths:[] as string[]},
    light:{color:"#E1AD91",width:.48,opacity:.37,paths:[] as string[]},
  };
  const P=face.vertices,F=face.mesh.faces;
  const sun:[number,number,number]=[-.45,.60,.66];
  for(let tri=0;tri<F.length;tri+=3){
    const a=P[F[tri]],b=P[F[tri+1]],c=P[F[tri+2]];
    const ab=[b[0]-a[0],b[1]-a[1],b[2]-a[2]];
    const ac=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];
    const nn:[number,number,number]=[
      ab[1]*ac[2]-ab[2]*ac[1],
      ab[2]*ac[0]-ab[0]*ac[2],
      ab[0]*ac[1]-ab[1]*ac[0],
    ];
    const mag=Math.hypot(...nn);
    if(mag<.0001)continue;
    const n=nn.map(v=>v/mag);
    const facing=n[0]*Math.sin(theta)+n[2]*Math.cos(theta);
    if(facing<.12)continue;
    const illumination=n[0]*sun[0]+n[1]*sun[1]+n[2]*sun[2];
    const shades:readonly [keyof typeof families,number][]=[
      ["middle",4],["shadow",illumination<.84?2:0],
      ["light",illumination>.31?1:0],
    ];
    // Root contacts live *inside* the original triangle in 3D and are
    // projected to the paper. No shape detection, photos or screen noise.
    for(const [kind,count] of shades){
      for(let k=0;k<count;k++){
        const key=tri*11+k*3+(kind==="shadow"?101:kind==="light"?207:0);
        const u=Math.sqrt(pencilHash(9061,key,41));
        const v=pencilHash(9061,key,42);
        const q:[number,number,number]=[
          1-u,u*(1-v),u*v,
        ];
        const point:[number,number,number]=[
          a[0]*q[0]+b[0]*q[1]+c[0]*q[2],
          a[1]*q[0]+b[1]*q[1]+c[1]*q[2],
          a[2]*q[0]+b[2]*q[1]+c[2]*q[2],
        ];
        const [x,y]=project(point);
        // Tangents rotate with the cheek normal and fade on the light
        // front plane. No identical parallel hatch across all anatomy.
        const angle=Math.atan2(.18-.45*n[0],.75+.27*n[1])+
          (pencilHash(9061,key,43)-.5)*.44;
        const step=(2.4+4.9*pencilHash(9061,key,44))*
          (kind==="light"?.72:1);
        const dx=Math.cos(angle)*step,dy=Math.sin(angle)*step;
        const bow=(pencilHash(9061,key,45)-.5)*.65;
        const x2=x+dx,y2=y+dy;
        const cx=x+dx*.5-Math.sin(angle)*bow;
        const cy=y+dy*.5+Math.cos(angle)*bow;
        families[kind].paths.push("M"+fmt(x)+" "+fmt(y)+" Q"+
          fmt(cx)+" "+fmt(cy)+" "+fmt(x2)+" "+fmt(y2));
      }
    }
  }
  const pigment:Array<PencilPortraitAnatomy["pigment"][number]>=[];
  for(const [family,source]of Object.entries(families)){
    // A bounded independent pencil stroke family is the export unit;
    // each 140-stroke SVG brush remains comfortably under 12K chars.
    for(let i=0;i<source.paths.length;i+=140){
      const path=source.paths.slice(i,i+140).join(" ");
      if(path.length>12000)throw new RangeError("ANAT1 skin brush too long");
      pigment.push({id:"anat-skin-"+family+"-"+(i/140),
        path,color:source.color,width:source.width,opacity:source.opacity});
    }
  }
  const landmarks:Record<string,readonly [number,number]>={};
  for(const [name,index]of Object.entries(FACE_LANDMARKS))
    landmarks[name]=project(face.vertices[index]);
  return {
    source:FACE_MESH_SOURCE.name,
    metrics:measureFace(face.vertices),
    landmarks,features,eyes,irises,pupils,browInk,browMass,
    nose,hair,pigment,lips:{upper:curve(upper,true),lower:curve(lower,true),bounds:lipsBounds},
  };
}
