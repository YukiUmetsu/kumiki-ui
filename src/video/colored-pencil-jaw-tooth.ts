/**
 * ArtCraft CP18 — photo-measured jaw plane paper-tooth repair.
 *
 * The licensed Campbell CC0 portrait is a PHOTOGRAPHIC REFERENCE ONLY.
 * The 285×318 Chromium before/source comparison shows bright isolated
 * chalk-like paper flecks along the authored jaw boundary, especially
 * photo-observed contour segments 8–15. These are *missing dark pigment*,
 * not genuine highlights; the source underjaw is umber, not paper-white.
 *
 * This post-stroke craft pass checks BOTH source and current dry-pencil
 * paper values, then places short, individually varied, source-pigmented
 * quadratic fibers on the missing-tooth regions. It never blurs, stamps
 * source pixels, traces other artists' artwork, smooths the output raster,
 * fills a polygon, or tampers with authored eye/lip/hair mark families.
 */
import {pencilHash} from "../../registry/video/colored-pencil";
import type {PencilPhotoMark,PencilPhotoPixels} from "./colored-pencil-photo";
import type {PortraitFeatureMap} from "./colored-pencil-portrait-guides";

type Point=readonly[number,number];
type Crop=Readonly<{left:number;top:number;width:number;height:number}>;
const clamp=(x:number,a:number,b:number)=>Math.max(a,Math.min(b,x));
const value=(c:readonly[number,number,number])=>
  .2126*c[0]+.7152*c[1]+.0722*c[2];
const pixel=(source:PencilPhotoPixels,x:number,y:number):readonly[number,number,number]=>{
  const ix=clamp(Math.round(x),0,source.width-1);
  const iy=clamp(Math.round(y),0,source.height-1);
  const k=4*(iy*source.width+ix);
  return [source.data[k],source.data[k+1],source.data[k+2]];
};
const color=(rgb:readonly number[])=>"#"+rgb.map(x=>
  clamp(Math.round(x),0,255).toString(16).padStart(2,"0")).join("");
export interface PencilJawToothEvidence {
  readonly marks:readonly PencilPhotoMark[];
  readonly photoSupported:number;
  readonly protectedSourceLights:number;
  readonly protectedExistingDarkness:number;
  readonly protectedOutOfFrame:number;
  readonly rasterUnderpainting:false;
  readonly artisticApproval:false;
  readonly strength:number;
}
export function createPhotoJawToothFibres(
  source:PencilPhotoPixels,rendered:PencilPhotoPixels,
  guides:PortraitFeatureMap,face:readonly Point[],crop:Crop,
  strength=.72,seed=271,
):PencilJawToothEvidence {
  if(!source||!rendered||![source,rendered].every(p=>
    Number.isSafeInteger(p.width)&&Number.isSafeInteger(p.height)&&
    p.width>=8&&p.height>=8&&p.width<=2048&&p.height<=2048&&
    p.data instanceof Uint8ClampedArray&&
    p.data.length===p.width*p.height*4)||
    !guides||Object.keys(guides).length!==25||
    Object.values(guides).some(p=>!Array.isArray(p)||p.length!==2||
      !p.every(Number.isFinite))||
    !Array.isArray(face)||face.length!==18||
    face.some(p=>!Array.isArray(p)||p.length!==2||
      !p.every(Number.isFinite))||
    !crop||![crop.left,crop.top,crop.width,crop.height]
      .every(Number.isFinite)||crop.width<=0||crop.height<=0||
    !Number.isFinite(strength)||strength<0||strength>1||
    !Number.isSafeInteger(seed)||seed<0||seed>2147483647)
    throw new RangeError("Invalid photographic jaw/paper-tooth evidence");
  const marks:PencilPhotoMark[]=[];
  let photoSupported=0,protectedSourceLights=0,
    protectedExistingDarkness=0,protectedOutOfFrame=0;
  const result=():PencilJawToothEvidence=>({
    marks,photoSupported,protectedSourceLights,protectedExistingDarkness,
    protectedOutOfFrame,rasterUnderpainting:false,
    artisticApproval:false,strength,
  });
  if(strength===0)return result();
  const eyeDist=Math.hypot(
    guides.eyeNearCenter[0]-guides.eyeFarCenter[0],
    guides.eyeNearCenter[1]-guides.eyeFarCenter[1]);
  if(eyeDist<8||eyeDist>1200)
    throw new RangeError("Degenerate jaw anatomy");
  const scaleX=540/crop.width,scaleY=600/crop.height;
  // Only the hand-measured underjaw from lower face i=8 to i=15.
  // Especially i=11–14, where real browser baselines reveal
  // +32–62 luminance steps of missing paper pigment.
  for(let seg=8;seg<15;seg++){
    const a=face[seg],b=face[seg+1];
    const dx=b[0]-a[0],dy=b[1]-a[1];
    const distance=Math.hypot(dx,dy);
    if(distance<1)continue;
    const tangentX=dx/distance,tangentY=dy/distance;
    const normalX=-tangentY,normalY=tangentX;
    const count=Math.min(140,Math.ceil(distance/
      clamp(eyeDist*.0067,.50,3.1)));
    for(let i=0;i<count;i++)for(const band of [-1,0,1]){
      const key=seg*16381+i*11+band+2;
      const t=(i+.46+(pencilHash(seed,key,151)-.5)*.18)/count;
      const across=band*eyeDist*.0069;
      const rootX=a[0]+t*dx+normalX*across;
      const rootY=a[1]+t*dy+normalY*across;
      const px=(rootX-crop.left)*scaleX;
      const py=(rootY-crop.top)*scaleY;
      if(px<2||py<2||px>=538||py>=598||
        rootX<3||rootY<3||
        rootX>=source.width-3||rootY>=source.height-3){
        protectedOutOfFrame++;continue;
      }
      const reference=pixel(source,rootX,rootY);
      const light=value(reference);
      if(light>185){protectedSourceLights++;continue;}
      const drawnX=px/540*rendered.width;
      const drawnY=py/600*rendered.height;
      const current=value(pixel(rendered,drawnX,drawnY));
      const missing=current-light;
      if(missing<19){protectedExistingDarkness++;continue;}
      // Use the calibrated true source tone as the guide for pigment
      // pressure, not as copied bitmap output. Strength 0% gives exact
      // legacy pixels; source-supported paper holes alone receive marks.
      const gap=clamp((missing-15)/76,0,1);
      const pressure=strength*(.14+.24*gap)*
        (.82+.18*pencilHash(seed,key,152));
      const srcColor=color([
        reference[0]*.89+53*.11,
        reference[1]*.89+39*.11,
        reference[2]*.89+35*.11,
      ]);
      const span=distance/count*(1.10+
        .48*pencilHash(seed,key,153));
      const twist=(pencilHash(seed,key,154)-.5)*eyeDist*.009;
      const startX=px-tangentX*span*scaleX*.25;
      const startY=py-tangentY*span*scaleY*.25;
      const endX=px+tangentX*span*scaleX*.75+
        normalX*twist*scaleX;
      const endY=py+tangentY*span*scaleY*.75+
        normalY*twist*scaleY;
      const width=clamp((.93+.51*pencilHash(seed,key,155))*
        (scaleX+scaleY)*.50,.4,2.6);
      marks.push({
        x:startX,y:startY,
        controlX:(startX+endX)*.5+
          normalX*(pencilHash(seed,key,156)-.5)*.39,
        controlY:(startY+endY)*.5+
          normalY*(pencilHash(seed,key,156)-.5)*.39,
        endX:endX,endY:endY,
        color:srcColor,width,alpha:clamp(pressure,.004,.40),
        pass:2,
      });
      photoSupported++;
    }
  }
  return result();
}
