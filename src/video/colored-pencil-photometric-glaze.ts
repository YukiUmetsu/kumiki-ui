/**
 * ArtCraft CP16 — photograph-calibrated transparent colored-pencil glazing.
 *
 * Construction reference (technique only): Alyona Nickelsen, Colored Pencil
 * Magazine AMA 2017: lightly layered tones and tightly spaced sharp
 * contacts prevent high-contrast skin tooth from reading as white flecks.
 * Justin Maas, LYRA portrait instruction: establish source values before
 * refining the eyes, nose and lips. Nothing from any artist is traced.
 *
 * This is NOT a source image underpainting, digital blur, source texture
 * transfer, flat face fill or AI skin-generation model. It authors
 * individually curved, source-coloured, translucent pressure strokes
 * beneath existing untouched high-frequency colored-pencil details.
 */
import {pencilHash} from "../../registry/video/colored-pencil";
import type {PencilPhotoPixels,PencilPhotoMark} from "./colored-pencil-photo";
import type {PortraitFeatureMap} from "./colored-pencil-portrait-guides";
import type {PortraitHeadStroke} from "./colored-pencil-full-head";

type Point=readonly[number,number];
type Crop=Readonly<{left:number;top:number;width:number;height:number}>;
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
const rgb=(source:PencilPhotoPixels,x:number,y:number):readonly[number,number,number]=>{
  const xx=clamp(Math.round(x),0,source.width-1);
  const yy=clamp(Math.round(y),0,source.height-1);
  const i=4*(yy*source.width+xx);
  return [source.data[i],source.data[i+1],source.data[i+2]];
};
const luma=(color:readonly number[])=>
  (.2126*color[0]+.7152*color[1]+.0722*color[2])/255;
const average=(source:PencilPhotoPixels,x:number,y:number)=>{
  const a=rgb(source,x,y),b=rgb(source,x-1.6,y),
    c=rgb(source,x+1.6,y),d=rgb(source,x,y-1.6),
    e=rgb(source,x,y+1.6);
  return [0,1,2].map(k=>
    (4*a[k]+b[k]+c[k]+d[k]+e[k])/8) as [number,number,number];
};
const length=(a:Point,b:Point)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const hex=(c:readonly number[])=>"#"+c.map(v=>
  clamp(Math.round(v),0,255).toString(16).padStart(2,"0")).join("");
export interface SourceSkinGlaze {
  readonly marks:readonly PencilPhotoMark[];
  readonly accepted:number;
  readonly highlighted:number;
  readonly anatomyProtected:number;
  readonly highContrastProtected:number;
  readonly rasterUnderpainting:false;
  readonly sourceRequired:true;
  readonly strength:number;
}
export function createPhotometricSkinGlaze(
  source:PencilPhotoPixels,guides:PortraitFeatureMap,crop:Crop,
  strokes:readonly PortraitHeadStroke[],strength=.72,seed=271,
):SourceSkinGlaze{
  if(!source||!Number.isSafeInteger(source.width)||
    !Number.isSafeInteger(source.height)||
    source.width<8||source.height<8||
    source.width>2048||source.height>2048||
    !(source.data instanceof Uint8ClampedArray)||
    source.data.length!==4*source.width*source.height||
    !guides||Object.keys(guides).length!==25||
    Object.values(guides).some(p=>!Array.isArray(p)||p.length!==2||
      p.some(n=>!Number.isFinite(n)))||
    !crop||![crop.left,crop.top,crop.width,crop.height]
      .every(Number.isFinite)||crop.width<=0||crop.height<=0||
    !Array.isArray(strokes)||strokes.length>180000||
    !Number.isSafeInteger(seed)||seed<0||seed>2147483647||
    !Number.isFinite(strength)||strength<0||strength>1)
    throw new RangeError("Invalid photograph-registered colored-pencil glaze");
  const marks:PencilPhotoMark[]=[];
  let accepted=0,highlighted=0,anatomyProtected=0,highContrastProtected=0;
  if(strength===0)return {
    marks,accepted,highlighted,anatomyProtected,highContrastProtected,
    rasterUnderpainting:false,sourceRequired:true,strength,
  };
  const eyes=length(guides.eyeNearCenter,guides.eyeFarCenter);
  if(eyes<5||eyes>1200)throw new RangeError("Invalid eye distance");
  for(const m of strokes){
    if(m.zone!=="face-value"&&m.zone!=="face-chroma")continue;
    // A spread across source-registered base strokes, not the first N
    // marks: preserves continuous tonal glazing on forehead, both cheeks
    // and chin without a mechanical flat paint polygon.
    const key=(Math.imul(Math.round(m.x*4),73856093)^
      Math.imul(Math.round(m.y*4),19349663)^
      Math.imul(Math.round(m.endX*4),83492791)^seed)>>>0;
    if(pencilHash(seed,key,1601)>.83)continue;
    const x=(m.x+m.endX)*.5/540*crop.width+crop.left;
    const y=(m.y+m.endY)*.5/600*crop.height+crop.top;
    if(x<3||y<3||x>=source.width-3||y>=source.height-3)
      continue;
    // Preserve all historically reconstructed eyelid, iris, lip,
    // nostril and high-contrast contours. These are observed sitter
    // landmarks and local optics, not a universal portrait template.
    if(Math.min(length([x,y],guides.eyeNearCenter),
      length([x,y],guides.eyeFarCenter))<eyes*.29||
      length([x,y],guides.lipCupid)<eyes*.27||
      length([x,y],guides.noseTip)<eyes*.17){
      anatomyProtected++;continue;
    }
    const local=average(source,x,y),value=luma(local);
    if(value>.92){highlighted++;continue;}
    const dx=luma(average(source,x+1.8,y))-
      luma(average(source,x-1.8,y));
    const dy=luma(average(source,x,y+1.8))-
      luma(average(source,x,y-1.8));
    if(Math.hypot(dx,dy)>.070){highContrastProtected++;continue;}
    const shade=clamp((.93-value)/.72,0,1);
    // Broad translucent base plus an individually curved narrow
    // optical tone: the original, sharply cut pencil hatch remains
    // painted on top and the true camera highlights remain paper.
    const pigment=hex([
      local[0]*.91+249*.09,
      local[1]*.91+245*.09,
      local[2]*.91+237*.09,
    ]);
    const pressure=.91+.18*pencilHash(seed,key,1602);
    // Calibrated against BOTH photographed 285×318 portrait views:
    // full unrestrained glaze decreased tooth noise but overshot real
    // forehead/malar/jaw pigment by ≈10–14 grey levels. Recover the
    // actual warm light-mass instead of chasing smoothness alone.
    const alpha=clamp(strength*(.064+.123*shade)*pressure,.001,.21);
    const width=m.width*(3.65+1.25*shade)*
      (.91+.16*pencilHash(seed,key,1603));
    const wiggle=(pencilHash(seed,key,1604)-.5)*m.width*.27;
    marks.push({
      ...m,pass:0,color:pigment,
      controlX:m.controlX+wiggle,controlY:m.controlY-wiggle,
      alpha,width,
    });
    // Complementary sharp translucent pigment strand gives real tooth
    // directional detail under the retained dark hatching, without
    // photographic pixels or synthesized freckle/mottle noise.
    marks.push({
      ...m,pass:0,color:pigment,
      alpha:clamp(alpha*.49,.001,.22),
      width:width*.47,
    });
    accepted++;
  }
  return {marks,accepted,highlighted,anatomyProtected,highContrastProtected,
    rasterUnderpainting:false,sourceRequired:true,strength};
}
