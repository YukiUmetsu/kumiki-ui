/**
 * CP-F1 experimental dry-pencil facial construction study.
 *
 * Source-conditioned geometry and local value/color sampling are allowed
 * ONLY with the portrait's rights-verified source. This module never
 * composites, pixel-copies, or displays the photograph in its output:
 * every visible deposit is an individually addressable pencil gesture.
 *
 * This is a real dry-mark MATERIAL proof, not approved portrait likeness.
 * Technique benchmarks: Jesse Lane's value-first controlled scribbles,
 * Elena Pancorbo's orbital, cheek and lip plane hierarchy.
 */
import {pencilHash} from "../../registry/video/colored-pencil";
import {
  createPencilPortraitFeatureMarks,createPortraitEyeAperture,
} from "./colored-pencil-portrait-guides";
import type {PortraitFeatureMap} from "./colored-pencil-portrait-guides";
import type {PencilPhotoMark,PencilPhotoPixels} from "./colored-pencil-photo";

export type DryPortraitRegion="eyes"|"lips";
export interface DryPortraitPlate {
  readonly width:360;
  readonly height:240;
  readonly crop:Readonly<{left:number;top:number;width:120;height:80}>;
  readonly strokes:readonly PencilPhotoMark[];
  readonly valueCounts:readonly [number,number,number];
  /** The actual rendered plate is paper plus marks, never image data. */
  readonly rasterUnderpainting:false;
}
const clamp=(x:number,a:number,b:number)=>Math.min(b,Math.max(a,x));
const color=(r:number,g:number,b:number)=>"#"+[r,g,b].map(v=>
  clamp(Math.round(v),0,255).toString(16).padStart(2,"0")).join("");
const read=(source:PencilPhotoPixels,x:number,y:number)=>{
  const ix=clamp(Math.round(x),0,source.width-1);
  const iy=clamp(Math.round(y),0,source.height-1);
  const k=(iy*source.width+ix)*4;
  return [source.data[k],source.data[k+1],source.data[k+2]] as const;
};
const luminance=(rgb:readonly number[])=>
  (.2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2])/255;
const quadratic=(a:number,b:number,c:number,t:number)=>
  (1-t)*(1-t)*a+2*(1-t)*t*b+t*t*c;

/** Paint a 120×80 source-grounded face crop on a 360×240 dry-paper plate.
 * Values are reconstructed through bounded pressure and drawn hatches, not
 * by placing a filtered source bitmap beneath the marks.
 */
export function createDryPortraitPlate(source:PencilPhotoPixels,
  guides:PortraitFeatureMap,region:DryPortraitRegion="eyes",
  seed=271):DryPortraitPlate {
  if(region!=="eyes"&&region!=="lips")throw new RangeError("Invalid face crop");
  if(!Number.isSafeInteger(seed)||seed<0||seed>2147483647||
    !Number.isSafeInteger(source.width)||!Number.isSafeInteger(source.height)||
    source.width<8||source.height<8||
    source.width>2048||source.height>2048||
    !(source.data instanceof Uint8ClampedArray)||
    source.data.length!==source.width*source.height*4)
    throw new RangeError("Invalid source or seed for dry portrait");
  // The existing CC0 guide validator also rejects missing/nonfinite features.
  const authored=createPencilPortraitFeatureMarks(source,guides,seed);
  const anchor=region==="eyes"?guides.eyeNearCenter:guides.lipCupid;
  const left=anchor[0]-60,top=anchor[1]-40;
  const lid=createPortraitEyeAperture(guides,"near");
  const mouthLeft=guides.lipLeft,mouthRight=guides.lipRight;
  const marks:PencilPhotoMark[]=[];
  const counts:[number,number,number]=[0,0,0];
  // Value-first architecture: broad soft diagonal undertone, second optical
  // colour family at a crossing angle, then local edge-driven dark detail.
  // Short overlapping arcs resemble deposited pencil, not bitmap stippling.
  for(const pass of [0,1,2] as const){
    const step=pass===0?2.25:pass===1?2.1:1.6;
    const cols=Math.ceil(120/step),rows=Math.ceil(80/step);
    for(let iy=0;iy<rows;iy++)for(let ix=0;ix<cols;ix++){
      const j=iy*cols+ix;
      const sx=left+(ix+.5+(pencilHash(seed,j+pass*22201,63)-.5)*.53)*step;
      const sy=top+(iy+.5+(pencilHash(seed,j+pass*22201,64)-.5)*.53)*step;
      if(sx<1||sy<1||sx>=source.width-2||sy>=source.height-2)continue;
      const rgb=read(source,sx,sy);
      const lum=luminance(rgb);
      const depth=1-lum;
      // Preserve the brightest paper/corneal reflections. The darkest
      // accents are added last and are not an invented eye-outline mask.
      if(pass===2&&lum>.91)continue;
      const leftRGB=read(source,sx-1.6,sy);
      const rightRGB=read(source,sx+1.6,sy);
      const topRGB=read(source,sx,sy-1.6);
      const bottomRGB=read(source,sx,sy+1.6);
      const gx=luminance(rightRGB)-luminance(leftRGB);
      const gy=luminance(bottomRGB)-luminance(topRGB);
      const gradient=Math.hypot(gx,gy);
      const tangent=Math.atan2(-gx,gy);
      // Curve the fiber field around the eye socket and across the lower
      // lip pillow. Global diagonal screen-space hatching looked like a
      // crosshatched filter, not construction around anatomical volume.
      const u=(sx-anchor[0])/(region==="eyes"?44:52);
      const v=(sy-anchor[1])/(region==="eyes"?27:25);
      const radius=Math.hypot(u,v);
      const arc=Math.atan2(v,u)+Math.PI/2;
      const anatomy=region==="eyes"?
        -.34+(arc+.34)*clamp(radius/.5,0,1)*.72:
        Math.PI*.46-u*.26+v*.09;
      const theta=pass===2&&gradient>.065?tangent:
        pass===0?anatomy:
          anatomy+.54;
      const grain=(pencilHash(seed,j+pass*22201,65)-.5)*.32;
      const angle=theta+grain;
      // Value layers are separated from chroma layers: a broad quiet
      // midtone is followed by warm/cool accents, then sharper edges.
      const palette=pass===0?
        color(rgb[0]*.80+66*.20,rgb[1]*.81+54*.19,rgb[2]*.83+51*.17):
        pass===1?
          color(rgb[0]*.91+31*.09,rgb[1]*.89+38*.11,rgb[2]*.86+60*.14):
          color(rgb[0]*.72+40*.28,rgb[1]*.74+30*.26,rgb[2]*.77+31*.23);
      const contrast=clamp(gradient*2.4,0,1);
      // Value passes should reveal actual eyelid depth and the separate
      // upper/lower vermilion pillows. A uniform crosshatched skin rectangle
      // cannot substitute for those anatomical masses.
      let volume=1;
      if(region==="eyes"){
        const t=clamp((sx-lid.start[0])/(lid.end[0]-lid.start[0]),0,1);
        const upperY=quadratic(lid.start[1],lid.upper[1],lid.end[1],t);
        const lowerY=quadratic(lid.start[1],lid.lower[1],lid.end[1],t);
        if(sx>=lid.start[0]&&sx<=lid.end[0]&&
          sy>upperY&&sy<lowerY){
          volume=1.26+.56*(1-lum);
        }
      }else{
        const t=clamp((sx-mouthLeft[0])/
          (mouthRight[0]-mouthLeft[0]),0,1);
        const topY=quadratic(mouthLeft[1],guides.lipCupid[1],
          mouthRight[1],t);
        const bottomY=quadratic(mouthLeft[1],guides.lipLower[1],
          mouthRight[1],t);
        if(sx>mouthLeft[0]&&sx<mouthRight[0]&&
          sy>topY&&sy<bottomY){
          // Richer, curved red-brown pencil deposits inside the observed
          // lips, softly fading toward their corners and contour edges.
          const across=Math.pow(Math.sin(Math.PI*t),.65);
          const between=Math.pow(Math.sin(Math.PI*clamp(
            (sy-topY)/Math.max(1,bottomY-topY),0,1)),.55);
          volume=1+.95*across*between;
        }
      }
      const alpha=pass===0?
        (.11+.22*depth):
        pass===1?(.09+.25*depth):
          (.05+.34*depth+.17*contrast);
      const length=(pass===0?6.8:pass===1?7.9:4.8)*
        (.7+.65*pencilHash(seed,j+pass*22201,66));
      const startX=(sx-left)*3,startY=(sy-top)*3;
      // Root-aligned, pressure-bounded, short laid pencil fibres.
      const vx=Math.cos(angle)*length,vy=Math.sin(angle)*length;
      const bow=(pencilHash(seed,j+pass*22201,67)-.5)*.9;
      const endX=clamp(startX+vx,0,360),endY=clamp(startY+vy,0,240);
      marks.push({
        x:clamp(startX,0,360),y:clamp(startY,0,240),
        controlX:clamp(startX+vx*.5-Math.sin(angle)*bow,0,360),
        controlY:clamp(startY+vy*.5+Math.cos(angle)*bow,0,240),
        endX,endY,color:palette,
        alpha:clamp(alpha*volume,0,.60),
        width:pass===0?.96:pass===1?.78:.59,
        pass,
      });
      counts[pass]++;
    }
  }
  // Reuse source-observed eyelid, brow, iris, alar and lip contours, now
  // deposited on the dry-paper plate (no embedded photo or flat face fill).
  // Clip full stroke geometry, not only its root, to the actual art crop.
  for(const m of authored.marks){
    const x=(m.x-left)*3,y=(m.y-top)*3;
    if(x<0||y<0||x>360||y>240)continue;
    const toX=(n:number)=>clamp((n-left)*3,0,360);
    const toY=(n:number)=>clamp((n-top)*3,0,240);
    marks.push({
      ...m,x,y,
      controlX:toX(m.controlX),controlY:toY(m.controlY),
      endX:toX(m.endX),endY:toY(m.endY),
      width:m.width*2.6,
      alpha:clamp(m.alpha*.96,0,.57),
    });
  }
  marks.sort((a,b)=>a.pass-b.pass);
  return {width:360,height:240,
    crop:{left,top,width:120,height:80},
    strokes:marks,valueCounts:counts,rasterUnderpainting:false};
}
