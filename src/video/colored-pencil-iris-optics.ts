/**
 * ArtCraft v13 — source-conditioned, dry colored-pencil iris optics.
 *
 * IMPORTANT: this is a source-measured study of ONE licensed CC0 portrait,
 * not universal face detection. The supplied, observed pupil landmarks
 * constrain every gesture. A hypothetical iris never justifies drawing:
 * independent local photographic contrast must support actual pigment.
 *
 * Technique references only — never copied/traced:
 * Veronica Winters: pupil first, radial iris fibres, upper-lid cast shadow,
 * crisp reserved reflections, complex pupil shadow rather than black stamp.
 * BMD Portraits: cumulative layered pigment and individual sharp touches.
 */
import {pencilHash} from "../../registry/video/colored-pencil";
import type {PencilPhotoMark,PencilPhotoPixels} from "./colored-pencil-photo";
import {createPortraitEyeAperture} from "./colored-pencil-portrait-guides";
import type {PortraitFeatureMap} from "./colored-pencil-portrait-guides";

type Eye="near"|"far";
type Point=readonly[number,number];
const clamp=(x:number,a:number,b:number)=>Math.max(a,Math.min(b,x));
const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
const lum=(r:number,g:number,b:number)=>(.2126*r+.7152*g+.0722*b)/255;
const photo=(p:PencilPhotoPixels,x:number,y:number):readonly[number,number,number]=>{
  const sx=clamp(Math.round(x),0,p.width-1);
  const sy=clamp(Math.round(y),0,p.height-1);
  const i=4*(sy*p.width+sx);
  return [p.data[i],p.data[i+1],p.data[i+2]];
};
const value=(p:PencilPhotoPixels,x:number,y:number)=>{
  let sum=0;
  for(const dx of [-.78,0,.78])
    for(const dy of [-.78,0,.78]){
      const c=photo(p,x+dx,y+dy);
      sum+=lum(c[0],c[1],c[2]);
    }
  return sum/9;
};
const hex=(rgb:readonly[number,number,number])=>"#"+rgb.map(v=>
  clamp(Math.round(v),0,255).toString(16).padStart(2,"0")).join("");
const mixPigment=(rgb:readonly[number,number,number],dark:number):string=>
  hex([mix(rgb[0],67,dark),mix(rgb[1],43,dark),mix(rgb[2],48,dark)]);
const valid=(p:PencilPhotoPixels,g:PortraitFeatureMap,seed:number,strength:number)=>{
  if(!p||!Number.isSafeInteger(p.width)||!Number.isSafeInteger(p.height)||
    p.width<8||p.height<8||p.width>2048||p.height>2048||
    !(p.data instanceof Uint8ClampedArray)||
    p.data.length!==4*p.width*p.height||
    !g||Object.keys(g).length!==25||
    Object.values(g).some(v=>!Array.isArray(v)||v.length!==2||
      v.some(n=>!Number.isFinite(n)))||
    !Number.isSafeInteger(seed)||seed<0||seed>2147483647||
    !Number.isFinite(strength)||strength<0||strength>1)
    throw new RangeError("Invalid registered color-pencil iris source");
};
export interface IrisOpticalResult {
  readonly eye:Eye;
  readonly sourceContrast:number;
  readonly observedCenter:Point;
  readonly ringNibCount:number;
  readonly radialNibCount:number;
  readonly pupilNibCount:number;
  readonly reserveCount:number;
}
export interface IrisOpticalEvidence {
  readonly marks:readonly PencilPhotoMark[];
  readonly eyes:readonly IrisOpticalResult[];
  readonly rasterUnderpainting:false;
  readonly sourceRequired:true;
  readonly highlightReserves:number;
}
/**
 * Enforces both root AND tip contact with dark photographed iris rather
 * than artificially stamping a full iris disc or a high-contrast pupil.
 * Three probes prevent a long random vector from crossing a catchlight.
 */
const observedDark=(source:PencilPhotoPixels,start:Point,end:Point,
  limit:number):boolean=>{
  for(const t of [0,.25,.5,.75,1]){
    const x=mix(start[0],end[0],t),y=mix(start[1],end[1],t);
    if(x<3||y<3||x>=source.width-3||y>=source.height-3)
      return false;
    // Test the INDIVIDUAL source pixel as well as the soft 3×3 optical
    // neighbourhood: a 1-pixel photographed corneal catchlight otherwise
    // averages into a dark iris and receives a spurious brown nib.
    const direct=photo(source,x,y);
    if(lum(direct[0],direct[1],direct[2])>limit||
      value(source,x,y)>limit)return false;
  }
  return true;
};
/** Pure, deterministic, photograph-registered independent pencil marks. */
export function createOpticalIrisPencil(
  source:PencilPhotoPixels,guides:PortraitFeatureMap,
  seed=271,strength=.78,
):IrisOpticalEvidence {
  valid(source,guides,seed,strength);
  const marks:PencilPhotoMark[]=[];
  const eyes:IrisOpticalResult[]=[];
  let highlightReserves=0;
  if(strength===0)return {
    marks,eyes,highlightReserves,rasterUnderpainting:false,sourceRequired:true,
  };
  for(const eye of ["near","far"] as const){
    const lid=createPortraitEyeAperture(guides,eye);
    const near=eye==="near";
    const rx=clamp(lid.span*(near ? .195 : .17),2.7,17);
    const ry=rx*(near ? .87 : .81);
    const raw=lid.center;
    // Iris centre is NOT the mathematical centre of the eye aperture:
    // allow at most 12% of iris radius of source-dark centroid adjustment.
    // If the camera cannot see the real pupil, skip the material entirely.
    let center:Point=raw,best=Number.POSITIVE_INFINITY;
    for(const u of [-1,0,1])for(const v of [-1,0,1]){
      const candidate:Point=[raw[0]+u*rx*.105,raw[1]+v*ry*.105];
      const c=value(source,candidate[0],candidate[1]);
      // The observed guide remains the primary geometric constraint,
      // discouraging a nearby dark eyelash from becoming the pupil.
      const score=c+.032*(u*u+v*v);
      if(score<best){best=score;center=candidate;}
    }
    const [cx,cy]=center;
    const surrounding=[
      value(source,cx+rx*1.55,cy),
      value(source,cx-rx*1.55,cy),
      value(source,cx,cy+ry*1.75),
    ];
    const brightNeighbour=Math.max(...surrounding);
    const sourceContrast=clamp(brightNeighbour-best,0,1);
    let ringNibCount=0,radialNibCount=0,pupilNibCount=0,reserveCount=0;
    if(sourceContrast<.075||best>.64){
      eyes.push({eye,sourceContrast,observedCenter:center,ringNibCount,
        radialNibCount,pupilNibCount,reserveCount});
      continue;
    }
    const id=near?13013:27179;
    const chordAt=(x:number)=>mix(lid.start[1],lid.end[1],
      clamp((x-lid.start[0])/(lid.end[0]-lid.start[0]),0,1));
    const inAperture=(x:number,y:number):boolean=>{
      const chord=chordAt(x);
      return y>chord-lid.span*.15&&y<chord+lid.span*.20;
    };
    const emit=(start:Point,end:Point,ink:string,opacity:number,
      width:number,twist:number,type:"ring"|"radial"|"pupil")=>{
      if(!inAperture(start[0],start[1])||
        !inAperture(end[0],end[1]))return;
      if(!observedDark(source,start,end,.78)){reserveCount++;return;}
      const mid:Point=[mix(start[0],end[0],.5),mix(start[1],end[1],.5)];
      const vx=end[0]-start[0],vy=end[1]-start[1];
      marks.push({
        x:start[0],y:start[1],
        controlX:mid[0]-vy*twist,controlY:mid[1]+vx*twist,
        endX:end[0],endY:end[1],
        color:ink,alpha:clamp(opacity*strength,.005,.56),
        width,pass:2,
      });
      if(type==="ring")ringNibCount++;
      if(type==="radial")radialNibCount++;
      if(type==="pupil")pupilNibCount++;
    };
    // Two independent passes of partially exposed, source-sampled limbal
    // edge: avoid a continuous digitally outlined iris and avoid mascara.
    for(let layer=0;layer<2;layer++){
      const sectors=near?120:88;
      for(let i=0;i<sectors;i++){
        const key=id+layer*1007+i;
        if(pencilHash(seed,key,701)>.84)continue;
        const angle=2*Math.PI*(i+.14*pencilHash(seed,key,702))/sectors;
        const r=.83+.15*pencilHash(seed,key,703);
        const x=cx+Math.cos(angle)*rx*r;
        const y=cy+Math.sin(angle)*ry*r;
        const endAngle=angle+(2*Math.PI/sectors)*(.35+
          .80*pencilHash(seed,key,704));
        const end:Point=[
          cx+Math.cos(endAngle)*rx*r,
          cy+Math.sin(endAngle)*ry*r,
        ];
        const ink=mixPigment(photo(source,x,y),.30+
          .14*pencilHash(seed,key,705));
        emit([x,y],end,ink,.24+.17*(1-value(source,x,y)),
          .37+.24*pencilHash(seed,key,706),.04,"ring");
      }
    }
    // A colored-pencil iris is radial fibres, not a solid tinted pupil.
    // Foveal color, value and local asymmetry come from the actual photo.
    // Three quasi-independent pigment layers give cross-directional depth.
    for(let layer=0;layer<3;layer++){
      const count=near?280:190;
      for(let i=0;i<count;i++){
        const key=id+layer*700001+i;
        const angle=Math.PI*2*pencilHash(seed,key,711);
        const fromR=.25+.52*pencilHash(seed,key,712);
        const toR=clamp(fromR+.09+
          .22*pencilHash(seed,key,713),.36,.96);
        const start:Point=[
          cx+rx*Math.cos(angle)*fromR,
          cy+ry*Math.sin(angle)*fromR,
        ];
        const end:Point=[
          cx+rx*Math.cos(angle)*toR,
          cy+ry*Math.sin(angle)*toR,
        ];
        if(!observedDark(source,start,end,.80)){reserveCount++;continue;}
        const sampled=photo(source,start[0],start[1]);
        const y=value(source,start[0],start[1]);
        const sourceDepth=clamp((.70-y)/.58,0,1);
        const alpha=(.19+.21*sourceDepth)*
          (.63+.37*pencilHash(seed,key,714));
        emit(start,end,mixPigment(sampled,layer===1?.12:.24),
          alpha,.32+.31*pencilHash(seed,key,715),
          (pencilHash(seed,key,716)-.5)*.12,"radial");
      }
    }
    // The pupil is an optically confirmed soft dark mass built from
    // many dry nibs, NOT a single polygon, flat ellipse or black circle.
    // The photographed corneal glint remains untouched by endpoint
    // and midpoint sampling, even when it lies in the pupil footprint.
    for(let layer=0;layer<3;layer++){
      const count=near?400:245;
      for(let i=0;i<count;i++){
        const key=id+layer*18191+i;
        const angle=2*Math.PI*pencilHash(seed,key,723);
        const radius=.40*Math.sqrt(pencilHash(seed,key,724));
        const x=cx+rx*Math.cos(angle)*radius;
        const y=cy+ry*Math.sin(angle)*radius;
        const sampled=photo(source,x,y);
        const darkness=value(source,x,y);
        if(darkness>.56){reserveCount++;continue;}
        const heading=-.53+(pencilHash(seed,key,725)-.5)*1.14;
        const len=.48+.98*pencilHash(seed,key,726);
        const end:Point=[x+Math.cos(heading)*len,y+Math.sin(heading)*len];
        emit([x,y],end,mixPigment(sampled,.37),
          (.17+.26*clamp((.55-darkness)/.5,0,1))*
          (.68+.31*pencilHash(seed,key,727)),
          .37+.42*pencilHash(seed,key,728),.05,"pupil");
      }
    }
    highlightReserves+=reserveCount;
    eyes.push({eye,sourceContrast,observedCenter:center,
      ringNibCount,radialNibCount,pupilNibCount,reserveCount});
  }
  return {marks,eyes,rasterUnderpainting:false,
    sourceRequired:true,highlightReserves};
}
