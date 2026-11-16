/**
 * New character #01 — STAGE 1 ONLY.
 *
 * The previously shipped woman/portrait was deliberately retired and is NOT
 * imported or used here.  This is a fresh neutral adult head construction
 * driven by a separately parameterized MediaPipe ANAT1 mesh.  It deliberately
 * has NO eyes, lashes, nose, lips, ears, hairstyle or clothing yet.
 *
 * The frame starts with one facial-contour region; subsequent ArtCraft PRs
 * must finish and visually approve each feature before another is built.
 * This is an anatomy BLOCKOUT, never a finished character/portrait.
 */
import { createFace, FACE_FEATURES, FACE_LANDMARKS } from "../../registry/anatomy/anatomy-face";
import { smoothPath } from "../../registry/anatomy/anatomy-view";
import { pencilHash } from "../../registry/video/colored-pencil";
import type { PencilTrace } from "../../registry/video/colored-pencil";
import type { PencilSubjectPart, PencilPalette } from "./colored-pencil-living-studies";

type Point=readonly [number,number];
const r=(x:number)=>Math.round(x*100)/100;
const n=(x:number)=>r(x).toFixed(2);
const line=(a:Point,b:Point,c:Point)=>"M"+n(a[0])+" "+n(a[1])+
  " Q"+n(b[0])+" "+n(b[1])+" "+n(c[0])+" "+n(c[1]);
const drawn=(id:string,path:string,color:string,width:number,opacity:number,
  startFrame=205):PencilTrace=>({
  id,path,color,width,opacity,startFrame,durationFrames:57,
});

/** Three independent, physically short dry-pencil glaze passes.
 * Guide samples come from three new bony structure curves and vary by
 * local tangent; this is not an old portrait's facial shading or a filter.
 */
function newHeadValuePencil(
  guides:readonly (readonly [Point,Point,Point])[],
  seed:number,
):PencilTrace[]{
  const values=[
    {color:"#967678",width:.41,opacity:.36,start:186},
    {color:"#C9A295",width:.34,opacity:.30,start:212},
    {color:"#F2D4B9",width:.27,opacity:.23,start:240},
  ] as const;
  return values.map((v,layer)=>{
    const marks:string[]=[];
    guides.forEach(([a,c,b],index)=>{
      for(let i=0;i<38;i++){
        const key=index*157+layer*53+i;
        const t=Math.max(.025,Math.min(.975,
          (i+.5+(pencilHash(seed,key,11)-.5)*.48)/38));
        const u=1-t;
        const x=u*u*a[0]+2*u*t*c[0]+t*t*b[0];
        const y=u*u*a[1]+2*u*t*c[1]+t*t*b[1];
        const tx=2*u*(c[0]-a[0])+2*t*(b[0]-c[0]);
        const ty=2*u*(c[1]-a[1])+2*t*(b[1]-c[1]);
        const size=Math.hypot(tx,ty);
        if(size<.0001)continue;
        const dx=tx/size,dy=ty/size,nx=-dy,ny=dx;
        const shift=(pencilHash(seed,key,12)-.5)*5;
        const len=(1.9+2.2*pencilHash(seed,key,13))*
          (layer===2?.72:1);
        const x0=x+nx*shift,y0=y+ny*shift;
        const curve=(pencilHash(seed,key,14)-.5)*.8;
        marks.push(line([x0,y0],
          [x0+dx*len*.52+nx*curve,y0+dy*len*.52+ny*curve],
          [x0+dx*len+nx*curve*.4,y0+dy*len+ny*curve*.4]));
      }
    });
    return drawn("newhead-value-"+layer,marks.join(" "),
      v.color,v.width,v.opacity,v.start);
  });
}

export const NEW_CHARACTER_01_ID="head-silhouette-01" as const;
export const NEW_CHARACTER_01_STAGE="head-outline" as const;

/** 36 distinct source mesh silhouette anchors; NO previous woman parts. */
export function newCharacterHeadStageOne(seed=271):PencilSubjectPart[]{
  if(!Number.isSafeInteger(seed)||seed<0||seed>2147483000)
    throw new RangeError("New character study requires a valid drawing seed");
  // Fresh proportions, camera yaw, outline and local marks are independent
  // of pencilPortraitAnatomy() and the retired woman face() factory.
  const face=createFace({
    norm:"north-american-white",sex:.69,eyeSpacing:.07,
    noseWidth:.02,noseLength:.10,lowerFace:.23,faceWidth:1.035,
  });
  const yaw=17*Math.PI/180,c=Math.cos(yaw),s=Math.sin(yaw);
  const project=(vertex:readonly number[]):Point=>[
    r(224+1.36*(vertex[0]*c+(vertex[2]-50)*s)),
    r(227-1.44*vertex[1]+.03*(vertex[2]-50)),
  ];
  const at=(key:keyof typeof FACE_LANDMARKS):Point=>
    project(face.vertices[FACE_LANDMARKS[key]]);
  const perimeter=FACE_FEATURES.oval.loop.map(i=>project(face.vertices[i]));
  if(perimeter.length<30||perimeter.some(p=>p.some(v=>!Number.isFinite(v))))
    throw new Error("Missing ANAT1 facial outline anchor points");
  const contour=smoothPath(perimeter,true);
  const xs=perimeter.map(p=>p[0]),ys=perimeter.map(p=>p[1]);
  const x0=Math.min(...xs)-4,y0=Math.min(...ys)-4;
  const bounds:readonly [number,number,number,number]=[
    r(x0),r(y0),r(Math.max(...xs)-x0+4),r(Math.max(...ys)-y0+4),
  ];
  // Preserve open, useful negative space. These lines are temporary
  // *construction marks* for forehead/jaw/cheek only, not fake eyes/mouth.
  const forehead=at("forehead"),glabella=at("glabella");
  const leftCheek=at("cheekbone.L"),rightCheek=at("cheekbone.R");
  const leftJaw=at("gonion.L"),rightJaw=at("gonion.R");
  const chin=at("menton"),zyL=at("zygion.L"),zyR=at("zygion.R");
  const guides:readonly (readonly [Point,Point,Point])[]=[
    [forehead,glabella,chin],
    [zyR,rightCheek,rightJaw],
    [zyL,leftCheek,leftJaw],
  ];
  const palette:PencilPalette=["#C6A397","#90767B","#E6C9B2"];
  return [{
    id:NEW_CHARACTER_01_ID,material:"skin",palette,path:contour,
    bounds,direction:64,flow:11,start:73,
    details:[
      ...newHeadValuePencil(guides,seed+1001),
      drawn("newhead-sagittal-guide",line(forehead,glabella,chin),
        "#90777C",.32,.31,103),
      drawn("newhead-zygomatic-guides",
        line(zyR,rightCheek,rightJaw)+" "+line(zyL,leftCheek,leftJaw),
        "#987B7B",.33,.46,139),
      drawn("newhead-mandibular-hinge",
        line(rightJaw,chin,leftJaw),"#7E6871",.36,.43,165),
      drawn("newhead-orbital-placement-only",
        line(at("exocanthion.R"),glabella,at("exocanthion.L")),
        "#B39D97",.28,.24,174),
    ],
  }];
}
