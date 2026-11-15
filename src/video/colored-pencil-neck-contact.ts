/**
 * ArtCraft CP17 — photo-corroborated neck/hairline contact closure.
 *
 * Reference: Christopher Campbell's 2015 CC0 brunette portrait.
 * The real Chromium 285×318 proof shows an implausible ivory vertical
 * root seam beneath the photographed jaw at the x of the hairline.
 * It is NOT a skin-air silhouette: the source here is continuous,
 * low-chroma sienna neck shadow. Current hair-root sides diverge from
 * the same root column and expose a ruled paper channel.
 *
 * Close ONLY this photo-observed material defect using narrow individual
 * curved pencil fibers aligned with the sternocleidomastoid/neck flow.
 * No artificial contour polygon, source bitmap, photo filter, stamped
 * texture, uniform wax fill or invented long hairs.
 */
import {pencilHash} from "../../registry/video/colored-pencil";
import type {PencilPhotoPixels,PencilPhotoMark} from "./colored-pencil-photo";
import type {PortraitFeatureMap} from "./colored-pencil-portrait-guides";

type Point=readonly[number,number];
type Crop=Readonly<{left:number;top:number;width:number;height:number}>;
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
const luma=(c:readonly number[])=>
  (.2126*c[0]+.7152*c[1]+.0722*c[2])/255;
const photo=(source:PencilPhotoPixels,x:number,y:number):readonly[number,number,number]=>{
  const xx=clamp(Math.round(x),0,source.width-1);
  const yy=clamp(Math.round(y),0,source.height-1);
  const i=4*(yy*source.width+xx);
  return [source.data[i],source.data[i+1],source.data[i+2]];
};
const hex=(v:readonly number[])=>"#"+v.map(x=>
  clamp(Math.round(x),0,255).toString(16).padStart(2,"0")).join("");

export interface PencilNeckContactProof {
  readonly marks:readonly PencilPhotoMark[];
  readonly sourceSupported:number;
  readonly protectedBackground:number;
  readonly protectedLight:number;
  readonly rasterUnderpainting:false;
  readonly strength:number;
  readonly sourceRequired:true;
}
/**
 * Source-specific construction, deliberately NOT a universal person/neck
 * detector. Source-space guide positions remain stable across 16:9 and
 * 9:16, while the final mark positions follow the actual head plate crop.
 */
export function createPhotoNeckContactFibres(
  source:PencilPhotoPixels,guides:PortraitFeatureMap,crop:Crop,
  strength=.72,seed=271,
):PencilNeckContactProof {
  if(!source||!Number.isSafeInteger(source.width)||
    !Number.isSafeInteger(source.height)||
    source.width<8||source.height<8||
    source.width>2048||source.height>2048||
    !(source.data instanceof Uint8ClampedArray)||
    source.data.length!==4*source.width*source.height||
    !guides||Object.keys(guides).length!==25||
    Object.values(guides).some(p=>!Array.isArray(p)||p.length!==2||
      p.some(x=>!Number.isFinite(x)))||
    !crop||![crop.left,crop.top,crop.width,crop.height]
      .every(Number.isFinite)||crop.width<=0||crop.height<=0||
    !Number.isFinite(strength)||strength<0||strength>1||
    !Number.isSafeInteger(seed)||seed<0||seed>2147483647)
    throw new RangeError("Invalid CC0 neck material registration");
  const marks:PencilPhotoMark[]=[];
  let sourceSupported=0,protectedBackground=0,protectedLight=0;
  if(strength===0)return {
    marks,sourceSupported,protectedBackground,protectedLight,
    rasterUnderpainting:false,strength,sourceRequired:true,
  };
  const eyeDist=Math.hypot(
    guides.eyeNearCenter[0]-guides.eyeFarCenter[0],
    guides.eyeNearCenter[1]-guides.eyeFarCenter[1]);
  if(eyeDist<8||eyeDist>1200)
    throw new RangeError("Invalid observed neck anatomy scale");
  const xRoot=guides.hairline[0];
  const startY=guides.chin[1]+eyeDist*.017;
  const endY=Math.min(source.height-3,crop.top+crop.height*.89);
  const step=clamp(eyeDist*.021,1.3,5);
  const rows=Math.ceil((endY-startY)/step);
  if(rows>500)throw new RangeError("Unsafe observed neck span");
  if(rows<1)return {marks,sourceSupported,protectedBackground,
    protectedLight,rasterUnderpainting:false,strength,sourceRequired:true};
  const scaleX=540/crop.width,scaleY=600/crop.height;
  // The diagonal pen normals remain short and continuous: crossweave
  // shadow value from the dark photographed neck, never a straight rule.
  for(const layer of [0,1,2] as const){
    for(let row=0;row<rows;row++)for(let col=-2;col<=2;col++){
      const key=(layer+1)*104729+row*59+col+2;
      const yy=startY+(row+.38+layer*.23)*step;
      const xx=xRoot+(col*.011+(pencilHash(seed,key,173)-.5)*.005)*eyeDist;
      const root:Point=[xx,yy];
      if(root[0]<3||root[0]>=source.width-3||
        root[1]<3||root[1]>=Math.min(source.height-3,endY))
        continue;
      const c=photo(source,xx,yy);
      const y=luma(c);
      if(y>.68){protectedLight++;continue;}
      // A warm connected mass of photographic neck pigment, not the
      // green garden nor near-neutral paper. Two off-center witnesses
      // protect against a lone dark photographic freckle.
      const witnesses=[
        photo(source,xx-eyeDist*.035,yy),
        photo(source,xx+eyeDist*.035,yy),
      ];
      const skin=c[0]>c[1]*1.08&&c[1]>c[2]*.97;
      const corroborated=witnesses.every(v=>
        v[0]>v[1]*1.055&&luma(v)<.77);
      if(!skin||!corroborated){protectedBackground++;continue;}
      const shade=clamp((.70-y)/.52,0,1);
      const ty=yy+step*(.74+.45*pencilHash(seed,key,174));
      if(ty>=endY||ty>=source.height-2)continue;
      const target=photo(source,xx,ty);
      if(luma(target)>.73)continue;
      const sway=(pencilHash(seed,key,175)-.5)*eyeDist*.010;
      const ex=xx+sway,ey=ty;
      const ax=(xx-crop.left)*scaleX,ay=(yy-crop.top)*scaleY;
      const bx=(ex-crop.left)*scaleX,by=(ey-crop.top)*scaleY;
      if([ax,ay,bx,by].some(v=>!Number.isFinite(v))||
        ax<0||ax>540||ay<0||ay>600||
        bx<0||bx>540||by<0||by>600)continue;
      const pigment=hex([
        c[0]*.73+51*.27,c[1]*.74+37*.26,c[2]*.76+32*.24,
      ]);
      const curve=(pencilHash(seed,key,176)-.5)*.65;
      marks.push({
        x:ax,y:ay,
        controlX:(ax+bx)*.5+curve,
        controlY:(ay+by)*.5,
        endX:bx,endY:by,color:pigment,
        alpha:clamp(strength*(.12+.22*shade)*
          (.76+.24*pencilHash(seed,key,177)),.005,.36),
        width:(.90+.64*pencilHash(seed,key,178))*scaleX,
        pass:2,
      });
      sourceSupported++;
    }
  }
  return {marks,sourceSupported,protectedBackground,protectedLight,
    rasterUnderpainting:false,strength,sourceRequired:true};
}
