/**
 * ArtCraft eyelid studio: source-observed eyelash roots and lid rim.
 *
 * Construction benchmark is the licensed CC0 Campbell portrait, not an
 * arbitrary face mesh. Technique study (no borrowed artwork): Elena
 * Pancorbo's softly turned orbital planes and sharp broken eyelid rims,
 * Veronica Winters's upper-lid-cast iris shadow, Kerry Brooks's
 * source-individual sclera and pupil/catchlight. These marks do NOT
 * render/trace the source bitmap: only tiny independent pressure strokes.
 */
import {pencilHash} from "../../registry/video/colored-pencil";
import type {PencilPhotoMark,PencilPhotoPixels} from "./colored-pencil-photo";
import {
  createPortraitEyeAperture,
} from "./colored-pencil-portrait-guides";
import type {PortraitFeatureMap} from "./colored-pencil-portrait-guides";

type Point=readonly[number,number];
type Eye="near"|"far";
type Rim="upper"|"lower";
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(v,b));
const lerp=(a:number,b:number,t:number)=>a+(b-a)*t;
const q=(a:Point,b:Point,c:Point,t:number):Point=>{
  const r=1-t;
  return [r*r*a[0]+2*r*t*b[0]+t*t*c[0],
    r*r*a[1]+2*r*t*b[1]+t*t*c[1]];
};
const luminance=(src:PencilPhotoPixels,x:number,y:number)=>{
  const xx=clamp(Math.round(x),0,src.width-1);
  const yy=clamp(Math.round(y),0,src.height-1);
  const k=(yy*src.width+xx)*4;
  return (.2126*src.data[k]+.7152*src.data[k+1]+
    .0722*src.data[k+2])/255;
};
const rgb=(src:PencilPhotoPixels,x:number,y:number):readonly[number,number,number]=>{
  const xx=clamp(Math.round(x),0,src.width-1);
  const yy=clamp(Math.round(y),0,src.height-1);
  const k=(yy*src.width+xx)*4;
  return [src.data[k],src.data[k+1],src.data[k+2]];
};
const hex=(a:readonly number[])=>"#"+a.map(v=>
  clamp(Math.round(v),0,255).toString(16).padStart(2,"0")).join("");
const safe=(src:PencilPhotoPixels,g:PortraitFeatureMap,seed:number,strength:number)=>{
  if(!src||!Number.isSafeInteger(src.width)||!Number.isSafeInteger(src.height)||
    src.width<8||src.height<8||src.width>2048||src.height>2048||
    !(src.data instanceof Uint8ClampedArray)||
    src.data.length!==src.width*src.height*4||
    !g||typeof g!=="object"||Object.keys(g).length!==25||
    Object.values(g).some(p=>!Array.isArray(p)||p.length!==2||
      !p.every(Number.isFinite))||
    !Number.isSafeInteger(seed)||seed<0||seed>2147483647||
    !Number.isFinite(strength)||strength<0||strength>1)
    throw new RangeError("Invalid CC0 optical eyelid evidence");
};
export interface OpticalEyelidTrace {
  readonly eye:Eye;
  readonly rim:Rim;
  /** A candidate must be darker than its photographed neighbourhood. */
  readonly opticalCandidates:number;
  readonly sourceSupported:number;
  readonly marks:number;
}
export interface OpticalEyelidEvidence {
  readonly marks:readonly PencilPhotoMark[];
  readonly traces:readonly OpticalEyelidTrace[];
  readonly rasterUnderpainting:false;
  readonly sourceRequired:true;
}
interface Sample {
  readonly base:Point;
  readonly x:number;
  readonly y:number;
  readonly score:number;
  readonly supported:boolean;
}
/** Returns JUST photographic evidence-backed nibs, never a generic eye shape. */
export const createOpticalEyelidFibres=(
  source:PencilPhotoPixels,guides:PortraitFeatureMap,
  seed=271,strength=.75,
):OpticalEyelidEvidence=>{
  safe(source,guides,seed,strength);
  const marks:PencilPhotoMark[]=[];
  const traces:OpticalEyelidTrace[]=[];
  if(strength===0)return {
    marks,traces,rasterUnderpainting:false,sourceRequired:true,
  };
  for(const eye of ["near","far"] as const){
    const lid=createPortraitEyeAperture(guides,eye);
    for(const rim of ["upper","lower"] as const){
      const ctrl=rim==="upper"?lid.upper:lid.lower;
      const steps=clamp(Math.ceil(lid.span/.76),14,96);
      const tolerance=clamp(lid.span*.085,1.2,4.0);
      const points:Sample[]=[];
      let supported=0;
      for(let i=0;i<=steps;i++){
        const t=.04+.92*i/steps;
        const base=q(lid.start,ctrl,lid.end,t);
        const [x,yy]=base;
        // Interior guard is deliberately stricter than the photo loader:
        // three-pixel source neighbours must not clamp into the margin.
        if(x<4||x>source.width-5||yy<6||yy>source.height-7){
          points.push({base,x,y:yy,score:0,supported:false});
          continue;
        }
        let bestScore=0,bestY=yy;
        // The lid is a photographic dark ridge *relative* to skin on
        // either side. A static brown stroke through bright sclera must
        // never pass. Search only around each observed eye aperture.
        for(let k=-7;k<=7;k++){
          const offset=tolerance*k/7,y=yy+offset;
          const middle=luminance(source,x,y);
          const above=luminance(source,x,y-2);
          const below=luminance(source,x,y+2);
          const ridge=(above+below)*.5-middle;
          const c=rgb(source,x,y);
          // No stray dark-green plant pixels masquerading as eyelashes.
          if(c[1]>c[0]*1.18&&c[1]>c[2]*1.13)continue;
          const supportedOptics=middle<.73&&ridge>.022;
          if(!supportedOptics)continue;
          const score=ridge*.83+Math.max(0,.63-middle)*.20-
            Math.abs(offset)/tolerance*.035;
          if(score>bestScore){bestScore=score;bestY=y;}
        }
        const visible=bestScore>.026;
        if(visible)supported++;
        points.push({base,x,y:visible?bestY:yy,
          score:Math.max(0,bestScore),supported:visible});
      }
      const before=marks.length;
      for(let i=1;i<points.length-1;i++){
        const p=points[i],next=points[i+1];
        if(!p.supported||!next.supported)continue;
        // Average the observed ridge deviation with immediate neighbours;
        // never blur the photographic colour or alter the baseline. At
        // discontinuities retain the original point (hair interruption).
        const regularize=(j:number)=>{
          const s=points[j];
          const neighbours=[j-1,j,j+1].filter(k=>
            k>=0&&k<points.length&&points[k].supported);
          if(neighbours.length<2)return s.y;
          const correction=neighbours.reduce((sum,k)=>
            sum+points[k].y-points[k].base[1],0)/neighbours.length;
          return clamp(lerp(s.y,s.base[1]+correction,.53),
            s.base[1]-tolerance,s.base[1]+tolerance);
        };
        const y=regularize(i),y2=regularize(i+1);
        const x=p.x,dx=next.x-x,dy=y2-y;
        if(Math.abs(dx)>lid.span*.09||Math.hypot(dx,dy)>lid.span*.12)
          continue; // invalid discontinuity, never draw a teleport line
        const v=luminance(source,x,y);
        const endpoint=luminance(source,next.x,y2);
        if(v>.77||endpoint>.79)continue;
        const [red,green,blue]=rgb(source,x,y);
        const deep=rim==="upper"?.34:.18;
        const ink=hex([
          lerp(red,55,deep),lerp(green,35,deep),
          lerp(blue,39,deep),
        ]);
        const pressure=clamp(.15+(p.score-.02)*1.7,.12,.52);
        const nib:PencilPhotoMark={
          x,y,controlX:(x+next.x)*.5,
          controlY:(y+y2)*.5+(pencilHash(seed,i,eye==="near"?621:622)-.5)*.18,
          endX:next.x,endY:y2,
          color:ink,alpha:clamp(pressure*strength,0,.56),
          width:(rim==="upper"?.56:.42)*
            (.83+.32*pencilHash(seed,i,eye==="near"?623:624)),
          pass:2,
        };
        marks.push(nib);
        // Upper lash roots are visible as *individual photographed dark
        // gestures*, not a regularly spaced fake eyelash fan. If the actual
        // pixels above the eyelid are pale, do not invent a lash.
        if(rim==="upper"&&i%3===1){
          const sx=x+dx*.25,sy=y-.7;
          const root=luminance(source,sx,sy);
          const skin=luminance(source,sx,sy-2.7);
          if(root<.46&&skin-root>.08&&p.score>.05){
            const outward=(i/steps-.52)*1.9;
            const rootInk=hex([red*.72+18*.28,
              green*.72+15*.28,blue*.75+14*.25]);
            const lashEnd:Point=[sx+outward,sy-lerp(1.3,2.6,
              pencilHash(seed,i,643))];
            if(luminance(source,lashEnd[0],lashEnd[1])<.81){
              marks.push({
                x:sx,y:sy,controlX:sx+outward*.25,
                controlY:sy-.8,
                endX:lashEnd[0],endY:lashEnd[1],
                color:rootInk,width:.32,alpha:.30*strength,
                pass:2,
              });
            }
          }
        }
      }
      traces.push({eye,rim,opticalCandidates:points.length,
        sourceSupported:supported,marks:marks.length-before});
    }
  }
  return {marks,traces,rasterUnderpainting:false,sourceRequired:true};
};
