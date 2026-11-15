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
import { createPencilFlowField } from "./colored-pencil-flow-field";
import { createPencilSalience } from "./colored-pencil-salience";

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
  /** Suppress backdrop scratches and preserve colourful anatomical subject. */
  focus:number;
}
export const PENCIL_PHOTO_DEFAULTS:Readonly<PencilPhotoOptions> = {
  seed:1024,paper:.22,saturation:.90,edges:.72,tooth:.73,density:1.15,focus:.86,
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
    ![o.paper,o.saturation,o.edges,o.tooth,o.focus].every(v=>Number.isFinite(v)&&v>=0&&v<=1)||
    !Number.isFinite(o.density)||o.density<.2||o.density>2)
    throw new RangeError("Invalid photo-to-pencil options");
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
  // A locally averaged structure tensor orients colour-pencil strokes along
  // the photographic fur/feather/bill edge, not against a one-pixel Sobel sign.
  const field=createPencilFlowField(lum,w,h);
  const attention=createPencilSalience(source,field).attention;
  const pigment=new Uint8ClampedArray(data.length);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const i=y*w+x;
    const edge=field.edge[i]*options.edges;
    // Dark form accepts more pencil. Highlights remain near paper-white.
    // Fine and coarse grain follow fixed paper positions, not redraw timing.
    const darkness=1-lum[i];
    const dry=(pencilHash(options.seed,i,72)-.5)*options.tooth;
    const coarse=(pencilHash(options.seed,
      Math.floor(x/3)+Math.ceil(w/3)*Math.floor(y/3),73)-.5)*options.tooth;
    const base=limit(.15+.58*Math.pow(darkness,.74)+edge*.12+
      dry*.23+coarse*.16,.10,.92);
    const subject=attention[i];
    const active=1-options.focus*(1-subject);
    const coverage=limit(base*(.23+.77*active)+
      options.focus*subject*.29,.02,.99);
    for(let c=0;c<3;c++){
      const mixed=paper[c]+(toned[i*3+c]-paper[c])*coverage;
      const contour=mixed*(1-edge*.13);
      pigment[4*i+c]=limit(Math.round(contour),0,255);
    }
    pigment[4*i+3]=255;
  }
  // 3 levels: structural edge pencil, short shadow hatching, fine material fibres.
  // Layered jittered cells avoid grid/moire; seed and source values never change
  // with frame or elapsed time. All dimensions are capped to avoid browser stalls.
  const strokes:PencilPhotoMark[]=[];
  const step=limit(Math.round(4.2/options.density),2,11);
  const gridW=Math.ceil(w/step), gridH=Math.ceil(h/step);
  const max=36000;
  for(let gy=0;gy<gridH;gy++)for(let gx=0;gx<gridW;gx++){
    if(strokes.length>=max)break;
    const j=gy*gridW+gx;
    const px=limit(Math.floor((gx+pencilHash(options.seed,j,91)) *step),1,w-2);
    const py=limit(Math.floor((gy+pencilHash(options.seed,j,92)) *step),1,h-2);
    const i=py*w+px;
    const strength=field.edge[i];
    const coherence=field.coherence[i];
    const darkness=1-lum[i];
    const contrast=darkness*.64+strength*.36;
    // Blank paper/highlights need fewer strokes; don't make random dark dots.
    const threshold=.16+.70*contrast;
    // Keep repeated strokes near actual anatomy, not a uniform background
    // diagonal crosshatch that competes with fine feather or fur structure.
    if(pencilHash(options.seed,j,93)>
      threshold*(1-options.focus*(1-attention[i])*.94))continue;
    const pass:(0|1|2)=strength>.25&&coherence>.4?0:
      darkness>.43?1:2;
    // Structural marks follow the stable local tangent. Flat paper areas
    // receive two subtle crossing hatch directions, not random black noise.
    const angle=strength>.065&&coherence>.34?
      field.tangent[i]+(pencilHash(options.seed,j,94)-.5)*.24:
      (pass===1?-.58:.48)+(pencilHash(options.seed,j,94)-.5)*.4;
    const length=(pass===0?7.2:pass===1?13.2:8.1)*
      (.57+.78*pencilHash(options.seed,j,95))*
      (coherence>.7?1.12:.9);
    const vx=Math.cos(angle)*length,vy=Math.sin(angle)*length;
    const bow=(pencilHash(options.seed,j,96)-.5)*length*.12;
    const pigmentFactor=.35+.65*attention[i];
    const cr=paper[0]+(toned[i*3]-paper[0])*pigmentFactor;
    const cg=paper[1]+(toned[i*3+1]-paper[1])*pigmentFactor;
    const cb=paper[2]+(toned[i*3+2]-paper[2])*pigmentFactor;
    // Each stroke is a colour pencil pigment, never a uniform black outline.
    const alpha=limit((.18+.37*contrast)*
      (pass===0?1.03:pass===1?.90:.72)*
      (.30+attention[i]*.78+(1-options.focus)*.20),.08,.65);
    strokes.push({
      x:px,y:py,controlX:px+vx*.5-Math.sin(angle)*bow,
      controlY:py+vy*.5+Math.cos(angle)*bow,
      endX:px+vx,endY:py+vy,
      color:hex(cr*(1-.26*contrast),cg*(1-.26*contrast),cb*(1-.26*contrast)),
      width:pass===0?.48:pass===1?.68:.40,
      alpha,pass,
    });
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
