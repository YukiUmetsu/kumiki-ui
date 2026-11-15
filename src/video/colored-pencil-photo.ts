/**
 * PR1: image-conditioned, code-rendered colour-pencil reconstruction.
 *
 * A photograph supplies actual anatomy, light and image-space edges. This module
 * does not copy drawings from other artists or pretend to infer an arbitrary
 * animal's topology from a sparse shape list. The original image is transformed
 * into paper / translucent pigment and thousands of hand-like contour-oriented
 * marks, all deterministic by seed and a pure absolute-frame timeline.
 *
 * Technique references: Matsui et al. (VC 2004) region-boundary stroke direction,
 * Lu et al. (NPAR 2012) sketch + tone, Wang et al. (CVM 2023) feature-preserving
 * lighter/less-saturated chromatic pencil.
 */
import { pencilHash } from "../../registry/video/colored-pencil";

export interface PencilPhotoPixels {
  width:number;
  height:number;
  data:Uint8ClampedArray;
}
export interface PencilPhotoOptions {
  seed:number;
  /** Value recovery through ivory paper, 0...1. */
  paper:number;
  /** Source chroma retention, 0...1. */
  saturation:number;
  /** Strength of regional pencil/feature contour, 0...1. */
  edges:number;
  /** Dry-to-burnished paper grain, 0...1. */
  tooth:number;
  /** Number of strokes relative to the paper dimensions, .2...2. */
  density:number;
}
export const PENCIL_PHOTO_DEFAULTS:Readonly<PencilPhotoOptions> = {
  seed:1024,paper:.30,saturation:.76,edges:.59,tooth:.69,density:1,
};
export interface PencilPhotoMark {
  x:number;y:number;
  controlX:number;controlY:number;
  endX:number;endY:number;
  color:string; width:number; alpha:number;
  /** Marks are drawn on top of base pigment in artistic chronological passes. */
  pass:0|1|2;
}
export interface PencilPhotoStudy {
  width:number;height:number;
  /** 8-bit RGBA, fully opaque. */
  pigment:Uint8ClampedArray;
  strokes:readonly PencilPhotoMark[];
  seed:number;
}
const limit=(n:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,n));
const hex=(r:number,g:number,b:number):string=>"#"+[r,g,b].map(x=>
  limit(Math.round(x),0,255).toString(16).padStart(2,"0")).join("");
const check=(p:PencilPhotoPixels,o:PencilPhotoOptions)=>{
  if(!Number.isSafeInteger(p.width)||!Number.isSafeInteger(p.height)||
    p.width<8||p.height<8||p.width>2048||p.height>2048||
    !(p.data instanceof Uint8ClampedArray)||
    p.data.length!==p.width*p.height*4)throw new RangeError("Invalid source image pixels");
  if(!Number.isSafeInteger(o.seed)||o.seed<0||o.seed>2147483647||
    ![o.paper,o.saturation,o.edges,o.tooth].every(v=>Number.isFinite(v)&&v>=0&&v<=1)||
    !Number.isFinite(o.density)||o.density<.2||o.density>2)
    throw new RangeError("Invalid photo-to-pencil options");
};
const sample=(lum:Float32Array,w:number,h:number,x:number,y:number):number=>
  lum[limit(y,0,h-1)*w+limit(x,0,w-1)];
const derivatives=(lum:Float32Array,w:number,h:number,x:number,y:number):readonly[number,number]=>{
  // 3x3 Sobel, normalized into a 0...1 brightness gradient. This conserves
  // eyelids, fur direction, bill/branch contours rather than a global hatch.
  const a=sample(lum,w,h,x-1,y-1),b=sample(lum,w,h,x,y-1),
    c=sample(lum,w,h,x+1,y-1),d=sample(lum,w,h,x-1,y),
    e=sample(lum,w,h,x+1,y),f=sample(lum,w,h,x-1,y+1),
    g=sample(lum,w,h,x,y+1),i=sample(lum,w,h,x+1,y+1);
  return [(c+2*e+i-a-2*d-f)/8,
    (f+2*g+i-a-2*b-c)/8];
};

/** Paint from authorized input pixels; all calculations are deterministic and local. */
export function createPencilPhotoStudy(source:PencilPhotoPixels,
  settings:Partial<PencilPhotoOptions>={}):PencilPhotoStudy {
  const options={...PENCIL_PHOTO_DEFAULTS,...settings};
  check(source,options);
  const {width:w,height:h,data}=source;
  const lum=new Float32Array(w*h);
  const paper=[249,245,237];
  const toned=new Float32Array(w*h*3);
  for(let i=0;i<w*h;i++){
    const r=data[i*4],g=data[i*4+1],b=data[i*4+2];
    const y=(.2126*r+.7152*g+.0722*b)/255;
    lum[i]=y;
    // Paper-friendly reduced saturation while retaining dark eye/bill structure.
    const luma=y*255;
    for(let c=0;c<3;c++){
      const channel=[r,g,b][c];
      const chroma=luma+(channel-luma)*options.saturation;
      const lifted=chroma*(1-options.paper*.28)+paper[c]*(options.paper*.28);
      toned[i*3+c]=lifted;
    }
  }
  const pigment=new Uint8ClampedArray(data.length);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const i=y*w+x;
    const [gx,gy]=derivatives(lum,w,h,x,y);
    const edge=limit(Math.hypot(gx,gy)*5.5,0,1)*options.edges;
    // Preserve near-white paper and reserve dark strokes for actual source edges.
    const dry=(pencilHash(options.seed,i,72)-.5)*options.tooth;
    const coverage=limit(.76-options.paper*.19+edge*.10+dry*.25,.32,.96);
    for(let c=0;c<3;c++){
      const mixed=paper[c]+(toned[i*3+c]-paper[c])*coverage;
      const contour=mixed*(1-edge*.20);
      pigment[4*i+c]=limit(Math.round(contour),0,255);
    }
    pigment[4*i+3]=255;
  }
  // 3 levels: structural edge pencil, short shadow hatching, fine material fibres.
  // Layered jittered cells avoid grid/moire; seed and source values never change
  // with frame or elapsed time. All dimensions are capped to avoid browser stalls.
  const strokes:PencilPhotoMark[]=[];
  const step=limit(Math.round(5/options.density),3,11);
  const gridW=Math.ceil(w/step), gridH=Math.ceil(h/step);
  const max=30000;
  let k=0;
  for(let gy=0;gy<gridH;gy++)for(let gx=0;gx<gridW;gx++){
    if(strokes.length>=max)break;
    const j=gy*gridW+gx;
    const px=limit(Math.floor((gx+pencilHash(options.seed,j,91)) *step),1,w-2);
    const py=limit(Math.floor((gy+pencilHash(options.seed,j,92)) *step),1,h-2);
    const i=py*w+px;
    const [dx,dy]=derivatives(lum,w,h,px,py);
    const strength=limit(Math.hypot(dx,dy)*6,0,1);
    const darkness=1-lum[i];
    const contrast=darkness*.64+strength*.36;
    // Blank paper/highlights need fewer strokes; don't make random dark dots.
    const threshold=.16+.70*contrast;
    if(pencilHash(options.seed,j,93)>threshold)continue;
    const pass:(0|1|2)=strength>.24?0:
      darkness>.42?1:2;
    const tangent=Math.atan2(dy,dx)+Math.PI/2;
    const angle=strength>.045?tangent:
      (pass===1?-.58:.42)+
      (pencilHash(options.seed,j,94)-.5)*.5;
    const length=(pass===0?6.5:pass===1?9:4)*
      (.64+.74*pencilHash(options.seed,j,95));
    const vx=Math.cos(angle)*length,vy=Math.sin(angle)*length;
    const bow=(pencilHash(options.seed,j,96)-.5)*length*.12;
    const cr=paper[0]+(toned[i*3]-paper[0])*.78;
    const cg=paper[1]+(toned[i*3+1]-paper[1])*.78;
    const cb=paper[2]+(toned[i*3+2]-paper[2])*.78;
    // Each stroke is a colour pencil pigment, never a uniform black outline.
    const alpha=limit((.17+.30*contrast)*
      (pass===0?1.06:pass===1?.83:.67),.09,.51);
    strokes.push({
      x:px,y:py,controlX:px+vx*.5-Math.sin(angle)*bow,
      controlY:py+vy*.5+Math.cos(angle)*bow,
      endX:px+vx,endY:py+vy,
      color:hex(cr*(1-.26*contrast),cg*(1-.26*contrast),cb*(1-.26*contrast)),
      width:pass===0?.58:pass===1?.72:.36,
      alpha,pass,
    });
    k++;
  }
  // Stable chronological grouping; no need to store frames or mutable clocks.
  strokes.sort((a,b)=>a.pass-b.pass);
  return {width:w,height:h,pigment,strokes,seed:options.seed};
}
export function pencilPhotoStrokeCount(study:PencilPhotoStudy,frame:number,total=350):number {
  if(!Number.isSafeInteger(frame)||frame<0||
    !Number.isSafeInteger(total)||total<1)throw new RangeError("Invalid photo pencil frame");
  const progress=limit(frame/total,0,1);
  if(progress<.28)return 0;
  const adjusted=(progress-.28)/.72;
  return Math.floor(study.strokes.length*adjusted);
}
