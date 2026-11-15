import {describe,expect,it} from "vitest";
import {createPhotoSkinToothBridge}
  from "../src/video/colored-pencil-tooth-bridge";
import {mapCC0WomanPortraitFeatures}
  from "../src/video/colored-pencil-portrait-guides";
import {projectMeasuredHeadContours}
  from "../src/video/colored-pencil-full-head";
import type {PencilPhotoPixels}
  from "../src/video/colored-pencil-photo";

const guides=mapCC0WomanPortraitFeatures({
  width:900,height:506,naturalWidth:5184,naturalHeight:3456,
  mode:"focus",focal:[.52,.25],zoom:2.05,
});
const face=projectMeasuredHeadContours(guides).face;
const crop={left:guides.hairline[0]-
  Math.hypot(guides.eyeNearCenter[0]-guides.eyeFarCenter[0],
    guides.eyeNearCenter[1]-guides.eyeFarCenter[1])*4.55*.49,
  top:guides.hairline[1]-Math.hypot(
    guides.eyeNearCenter[0]-guides.eyeFarCenter[0],
    guides.eyeNearCenter[1]-guides.eyeFarCenter[1])*.70,
  width:Math.hypot(
    guides.eyeNearCenter[0]-guides.eyeFarCenter[0],
    guides.eyeNearCenter[1]-guides.eyeFarCenter[1])*4.55,
  get height(){return this.width*600/540;},
};
const image=(width:number,height:number,shade:number):PencilPhotoPixels=>{
  const data=new Uint8ClampedArray(width*height*4);
  for(let k=0;k<data.length;k+=4){
    data[k]=shade;data[k+1]=Math.round(shade*.86);
    data[k+2]=Math.round(shade*.79);data[k+3]=255;
  }
  return {width,height,data};
};
const source=()=>image(900,506,205);
const drawing=()=>image(540,600,242);
const pointInside=(x:number,y:number)=>{
  let yes=false;
  for(let i=0,j=face.length-1;i<face.length;j=i++){
    const a=face[i],b=face[j];
    if((a[1]>y)!==(b[1]>y)&&
      x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])yes=!yes;
  }
  return yes;
};
describe("ArtCraft photo-conditioned pencil-tooth residual repair",()=>{
  it("keeps disabled mode bit-for-bit blank and source/drawing immutable",()=>{
    const src=source(),paint=drawing();
    const photo=src.data.slice(),before=paint.data.slice();
    const out=createPhotoSkinToothBridge(src,paint,guides,face,crop,0);
    expect(out.marks).toHaveLength(0);
    expect(out.sourceMatchedGaps).toBe(0);
    expect(out.rasterUnderpainting).toBe(false);
    expect(src.data).toEqual(photo);
    expect(paint.data).toEqual(before);
  });
  it("lays deterministic finite dry contacts only across source-supported skin",()=>{
    const src=source(),paint=drawing();
    const before=src.data.slice(),render=paint.data.slice();
    const a=createPhotoSkinToothBridge(src,paint,guides,face,crop,1,31);
    expect(a.marks.length).toBeGreaterThan(30);
    expect(a.marks.length).toBeLessThan(12000);
    expect(a.sourceMatchedGaps).toBe(a.marks.length);
    expect(a.protectedAnatomy).toBeGreaterThan(0);
    for(const m of a.marks){
      expect(m.alpha).toBeGreaterThan(0);
      expect(m.alpha).toBeLessThan(.37);
      expect(m.pass).toBe(2);
      expect(m.width).toBeGreaterThan(0);
      expect(m.color).toMatch(/^#[a-f0-9]{6}$/);
      expect([m.x,m.y,m.endX,m.endY,m.controlX,m.controlY]
        .every(Number.isFinite)).toBe(true);
      // No "inside at endpoints only" mistake: full curved nib stays
      // inside the original measured face silhouette at every proof point.
      for(const t of [0,.25,.5,.75,1]){
        const q=1-t;
        const x=q*q*m.x+2*q*t*m.controlX+t*t*m.endX;
        const y=q*q*m.y+2*q*t*m.controlY+t*t*m.endY;
        expect(pointInside(crop.left+x/540*crop.width,
          crop.top+y/600*crop.height)).toBe(true);
      }
    }
    expect(src.data).toEqual(before);
    expect(paint.data).toEqual(render);
    expect(createPhotoSkinToothBridge(src,paint,guides,face,crop,1,31))
      .toEqual(a);
    expect(createPhotoSkinToothBridge(src,paint,guides,face,crop,1,32)
      .marks).not.toEqual(a.marks);
  });
  it("refuses invented pigmentation on genuine paper or already dark skin",()=>{
    const bright=image(900,506,252);
    const noGaps=createPhotoSkinToothBridge(
      bright,drawing(),guides,face,crop,1);
    expect(noGaps.marks).toHaveLength(0);
    expect(noGaps.protectedHighlights).toBeGreaterThan(0);
    const alreadyDark=createPhotoSkinToothBridge(
      source(),image(270,300,130),guides,face,crop,1);
    expect(alreadyDark.marks).toHaveLength(0);
    expect(alreadyDark.untouchedAreas).toBeGreaterThan(0);
  });
  it("fails closed for malformed buffers, geometry, source and strength",()=>{
    const src=source(),paint=drawing();
    expect(()=>createPhotoSkinToothBridge(
      {...src,data:new Uint8ClampedArray(5)},
      paint,guides,face,crop,1)).toThrow(RangeError);
    expect(()=>createPhotoSkinToothBridge(
      src,{...paint,width:320},guides,face,crop,1))
      .toThrow(RangeError);
    expect(()=>createPhotoSkinToothBridge(
      src,paint,guides,face,{...crop,width:0},1))
      .toThrow(RangeError);
    expect(()=>createPhotoSkinToothBridge(
      src,paint,{...guides,eyeNearCenter:[NaN,1]},face,crop,1))
      .toThrow(RangeError);
    expect(()=>createPhotoSkinToothBridge(
      src,paint,guides,face,crop,1.1)).toThrow(RangeError);
    expect(()=>createPhotoSkinToothBridge(
      src,paint,guides,face,crop,1,-1)).toThrow(RangeError);
  });
});
