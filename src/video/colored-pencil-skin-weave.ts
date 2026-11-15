/**
 * CC0 ArtCraft optical skin weave — dry-pencil-only overlapping loops.
 *
 * Studio study: Campbell CC0 portrait, one 25-landmark sitter. Janie Gildow
 * (How to Color with Colored Pencils) demonstrates overlapping elongated
 * loops and feathered pressure for even skin. Claudia Nice / Crayola
 * distinguishes light pencil layers from tooth-crushing wax saturation.
 * These are stroke-technique references ONLY, never painted/traced content.
 *
 * Every nib is constrained by the CC0 measured face polygon, local source
 * luminance, and photographed pigment. It returns vector pigment strokes,
 * not a bitmap, Gaussian-blurred photograph or generic skin-colored fill.
 */
import {pencilHash} from "../../registry/video/colored-pencil";
import type {PencilPhotoMark,PencilPhotoPixels} from "./colored-pencil-photo";
import type {PortraitFeatureMap} from "./colored-pencil-portrait-guides";

type Point=readonly[number,number];
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));

const dist=(a:Point,b:Point)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
/** Evaluate the actual deposited quadratic, not just its endpoint chord. */
const onCurve=(a:Point,c:Point,b:Point,t:number):Point=>{
  const q=1-t;
  return [q*q*a[0]+2*q*t*c[0]+t*t*b[0],
    q*q*a[1]+2*q*t*c[1]+t*t*b[1]];
};
const inside=(p:Point,poly:readonly Point[])=>{
  let state=false;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++){
    const a=poly[i],b=poly[j];
    if((a[1]>p[1])!==(b[1]>p[1])&&
      p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])
      state=!state;
  }
  return state;
};
const at=(p:PencilPhotoPixels,x:number,y:number):readonly[number,number,number]=>{
  const xx=clamp(Math.round(x),0,p.width-1);
  const yy=clamp(Math.round(y),0,p.height-1);
  const i=(yy*p.width+xx)*4;
  return [p.data[i],p.data[i+1],p.data[i+2]];
};
const optical=(p:PencilPhotoPixels,x:number,y:number,radius:number)=>{
  const center=at(p,x,y);
  const a=at(p,x+radius,y),b=at(p,x-radius,y);
  const c=at(p,x,y+radius),d=at(p,x,y-radius);
  return [0,1,2].map(k=>
    (center[k]*4+a[k]+b[k]+c[k]+d[k])/8) as
      [number,number,number];
};
const yOf=(c:readonly number[])=>
  (.2126*c[0]+.7152*c[1]+.0722*c[2])/255;
const hex=(c:readonly number[])=>
  "#"+c.map(v=>clamp(Math.round(v),0,255)
    .toString(16).padStart(2,"0")).join("");
const validate=(src:PencilPhotoPixels,g:PortraitFeatureMap,
  poly:readonly Point[],seed:number,strength:number)=>{
  if(!src||!Number.isSafeInteger(src.width)||!Number.isSafeInteger(src.height)||
    src.width<8||src.height<8||src.width>2048||src.height>2048||
    !(src.data instanceof Uint8ClampedArray)||
    src.data.length!==src.width*src.height*4||
    !g||Object.keys(g).length!==25||
    Object.values(g).some(p=>!Array.isArray(p)||p.length!==2||
      p.some(x=>!Number.isFinite(x)))||
    poly.length<3||poly.length>256||
    poly.some(p=>p.length!==2||p.some(x=>!Number.isFinite(x)))||
    !Number.isSafeInteger(seed)||seed<0||seed>2147483647||
    !Number.isFinite(strength)||strength<0||strength>1)
    throw new RangeError("Invalid CC0 photographed skin weave evidence");
};
/** Distinguish fiber coverage from illicit 1:1 photo-pixel stamps. */
export interface PencilSkinWeave {
  readonly marks:readonly PencilPhotoMark[];
  readonly sourceSupported:number;
  readonly protectedHighlights:number;
  readonly protectedEdges:number;
  readonly protectedAnatomy:number;
  /** Full curved nib rejected before crossing an eyelid, lip or paper reserve. */
  readonly protectedSpans:number;
  /** Independently drawn light-plane fibres, not a smooth raster glaze. */
  readonly opticalLightFibres:number;
  readonly rasterUnderpainting:false;
  readonly sourceRequired:true;
  readonly strength:number;
}
export function createPencilSkinOpticalWeave(
  source:PencilPhotoPixels,guides:PortraitFeatureMap,
  face:readonly Point[],seed=271,strength=.70,
):PencilSkinWeave {
  validate(source,guides,face,seed,strength);
  const marks:PencilPhotoMark[]=[];
  let sourceSupported=0,protectedHighlights=0,
    protectedEdges=0,protectedAnatomy=0,protectedSpans=0,
    opticalLightFibres=0;
  if(strength===0)return {
    marks,sourceSupported,protectedHighlights,protectedEdges,
    protectedAnatomy,protectedSpans,opticalLightFibres,
    rasterUnderpainting:false,sourceRequired:true,strength,
  };
  const eyeDist=dist(guides.eyeNearCenter,guides.eyeFarCenter);
  // Preserve the existing <120k whole-head pencil mark budget.
  // Dense optical coverage comes from broader, softly overlapping loops
  // rather than expensive fields of tiny uniform individual stipples.
  const step=clamp(eyeDist*.046,2.1,7.8);
  const minX=Math.max(3,Math.min(...face.map(p=>p[0])));
  const maxX=Math.min(source.width-4,Math.max(...face.map(p=>p[0])));
  const minY=Math.max(3,Math.min(...face.map(p=>p[1])));
  const maxY=Math.min(source.height-4,Math.max(...face.map(p=>p[1])));
  const cols=Math.ceil((maxX-minX)/step);
  const rows=Math.ceil((maxY-minY)/step);
  if(!Number.isFinite(eyeDist)||eyeDist<6||eyeDist>1200||
    cols*rows>500000)throw new RangeError("Unsafe skin weave dimensions");
  // 2 offset grids, but each drawn mark is an irregular closed-fibre
  // *segment* rather than a digital paint/canvas blur. Tiny overlapping
  // loops cross at alternating angles, preserving tactile paper tooth.
  for(const pass of [0,1] as const){
    for(let iy=0;iy<rows;iy++)for(let ix=0;ix<cols;ix++){
      const key=iy*cols+ix+pass*369119;
      const jitterX=(pencilHash(seed,key,811)-.5)*.68;
      const jitterY=(pencilHash(seed,key,812)-.5)*.68;
      const x=minX+(ix+.5+jitterX+pass*.27)*step;
      const y=minY+(iy+.5+jitterY+pass*.23)*step;
      const p:Point=[x,y];
      if(x>maxX||y>maxY||!inside(p,face))continue;
      const rgb=optical(source,x,y,step*.47),v=yOf(rgb);
      if(v>.918){protectedHighlights++;continue;}
      // The near eye, far eye, parted lips and nostril remain independently
      // drawn high-frequency anatomical materials. Skin weave must NOT
      // make the finished pupils look milky or blur the lip seam.
      const nearOrbit=Math.min(dist(p,guides.eyeNearCenter),
        dist(p,guides.eyeFarCenter));
      const mouth=dist(p,guides.lipCupid);
      const nostril=dist(p,guides.noseTip);
      const insideDetail=(nearOrbit<eyeDist*.28||
        mouth<eyeDist*.24||nostril<eyeDist*.14);
      if(insideDetail){protectedAnatomy++;continue;}
      const offset=step*.68;
      const horizontal=yOf(optical(source,x+offset,y,.5))-
        yOf(optical(source,x-offset,y,.5));
      const vertical=yOf(optical(source,x,y+offset,.5))-
        yOf(optical(source,x,y-offset,.5));
      const edge=Math.hypot(horizontal,vertical);
      // Hard photographed contour (>8% contrast) is reserved for sharp
      // eye, nose, lip and jaw passes. Merging it would lose topology.
      if(edge>.085){protectedEdges++;continue;}
      const shade=clamp((.93-v)/.70,0,1);
      // Source light is not blank paper: add quiet, overlapping fibres
      // in the 0.67–0.91 luminance band without touching true glints.
      const lightSupport=clamp((v-.67)/.23,0,1)*
        clamp((.918-v)/.11,0,1);
      const probability=clamp(.40+.23*shade+.14*lightSupport+
        .11*pencilHash(seed,key,813),0,.82);
      if(pencilHash(seed,key,814)>probability)continue;
      // Crossed elongated ellipses: the complementary pass is rotated,
      // but the tangent itself tracks a continuous cheek→nose→jaw field.
      const side=clamp((x-guides.noseBridge[0])/eyeDist,-1.4,1.4);
      const jaw=clamp((y-guides.noseTip[1])/
        Math.max(1,guides.chin[1]-guides.noseTip[1]),0,1);
      const cheekTheta=-.21+.27*side+.36*jaw;
      const angle=cheekTheta+(pass===1?.88:0)+
        (pencilHash(seed,key,815)-.5)*.36;
      const len=step*(.90+.53*pencilHash(seed,key,816));
      const vx=Math.cos(angle)*len;
      const vy=Math.sin(angle)*len;
      const start:Point=[x-vx*.5,y-vy*.5],
        end:Point=[x+vx*.5,y+vy*.5];
      if(!inside(start,face)||!inside(end,face))continue;
      if(yOf(optical(source,end[0],end[1],.45))>.92||
        yOf(optical(source,start[0],start[1],.45))>.92){
        protectedHighlights++;continue;
      }
      // Warm/cool optical strata derived from sitter's pixels, not a
      // synthetic uniform "skin tone". Interleaved violet shadow and
      // ochre/rose halftone remain translucent, never fully burnished.
      const local=pass===0?
        [rgb[0]*.87+113*.13,rgb[1]*.89+72*.11,
          rgb[2]*.88+82*.12]:
        [rgb[0]*.88+150*.12,rgb[1]*.87+91*.13,
          rgb[2]*.89+112*.11];
      const alpha=clamp((.19+.17*shade+.09*lightSupport)*
        (.73+.27*pencilHash(seed,key,817))*strength,.008,.43);
      const width=step*(.45+.35*pencilHash(seed,key,818)+
        .14*lightSupport);
      // Curvature changes sign by pass, creating real small looping
      // scumbles (quadratic pigment strokes), never identical hatch rows.
      const turn=(pass===0?1:-1)*(.20+
        .25*pencilHash(seed,key,819));
      const control:Point=[x-vy*turn,y+vx*turn];
      // Endpoint-only tests admitted arcs across eyelids and unmarked
      // paper. Evaluate the entire quadratic before depositing pigment.
      let blocked=false;
      for(const t of [.2,.4,.6,.8]){
        const q=onCurve(start,control,end,t);
        if(!inside(q,face)){blocked=true;protectedSpans++;break;}
        const sample=optical(source,q[0],q[1],.45);
        if(yOf(sample)>.918){
          protectedHighlights++;protectedSpans++;blocked=true;break;
        }
        if(Math.min(dist(q,guides.eyeNearCenter),
          dist(q,guides.eyeFarCenter))<eyeDist*.28||
          dist(q,guides.lipCupid)<eyeDist*.24||
          dist(q,guides.noseTip)<eyeDist*.14){
          protectedAnatomy++;protectedSpans++;blocked=true;break;
        }
        const a=yOf(optical(source,q[0]+.55,q[1],.4))-
          yOf(optical(source,q[0]-.55,q[1],.4));
        const b=yOf(optical(source,q[0],q[1]+.55,.4))-
          yOf(optical(source,q[0],q[1]-.55,.4));
        if(Math.hypot(a,b)>.085){
          protectedEdges++;protectedSpans++;blocked=true;break;
        }
      }
      if(blocked)continue;
      marks.push({
        x:start[0],y:start[1],
        controlX:control[0],controlY:control[1],
        endX:end[0],endY:end[1],
        color:hex(local),alpha,width,pass:2,
      });
      if(lightSupport>.2)opticalLightFibres++;
      sourceSupported++;
    }
  }
  return {marks,sourceSupported,protectedHighlights,protectedEdges,
    protectedAnatomy,protectedSpans,opticalLightFibres,
    rasterUnderpainting:false,sourceRequired:true,strength};
}
