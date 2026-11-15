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
    expect(src.data.every((v,i)=>v===photo[i])).toBe(true);
    expect(paint.data.every((v,i)=>v===before[i])).toBe(true);
  });
  it("lays deterministic finite dry contacts only across source-supported skin",()=>{
    const src=source(),paint=drawing();
    const before=src.data.slice(),render=paint.data.slice();
    const a=createPhotoSkinToothBridge(src,paint,guides,face,crop,1,31);
    expect(a.marks.length).toBeGreaterThan(30);
    expect(a.marks.length).toBeLessThan(20000);
    expect(a.sourceMatchedGaps).toBe(a.marks.length);
    expect(a.protectedAnatomy).toBeGreaterThan(0);
    // Single aggregated assertions keep large real-pixel tests fast:
    // thousands of expect() calls and typed-array deep equality are NOT
    // necessary to verify every point in the full painted geometry.
    const safe=a.marks.every(m=>
      m.alpha>0&&m.alpha<.45&&m.pass===2&&m.width>0&&
      /^#[a-f0-9]{6}$/.test(m.color)&&
      [m.x,m.y,m.endX,m.endY,m.controlX,m.controlY]
        .every(Number.isFinite)&&
      [0,.25,.5,.75,1].every(t=>{
        const q=1-t;
        const x=q*q*m.x+2*q*t*m.controlX+t*t*m.endX;
        const y=q*q*m.y+2*q*t*m.controlY+t*t*m.endY;
        return pointInside(crop.left+x/540*crop.width,
          crop.top+y/600*crop.height);
      }));
    expect(safe).toBe(true);
    expect(src.data.every((v,i)=>v===before[i])).toBe(true);
    expect(paint.data.every((v,i)=>v===render[i])).toBe(true);
    const repeat=createPhotoSkinToothBridge(
      src,paint,guides,face,crop,1,31);
    expect(JSON.stringify(repeat.marks)).toBe(JSON.stringify(a.marks));
    const alternate=createPhotoSkinToothBridge(
      src,paint,guides,face,crop,1,32);
    expect(JSON.stringify(alternate.marks.slice(0,40)))
      .not.toBe(JSON.stringify(a.marks.slice(0,40)));
  },30000);
  it("refuses invented pigmentation on genuine paper or already dark skin",()=>{
    const bright=image(900,506,252);
    for(let k=0;k<bright.data.length;k+=4){
      bright.data[k+1]=251;bright.data[k+2]=250;
    }
    const noGaps=createPhotoSkinToothBridge(
      bright,drawing(),guides,face,crop,1);
    expect(noGaps.marks).toHaveLength(0);
    expect(noGaps.protectedHighlights).toBeGreaterThan(0);
    const alreadyDark=createPhotoSkinToothBridge(
      source(),image(270,300,130),guides,face,crop,1);
    expect(alreadyDark.marks).toHaveLength(0);
    expect(alreadyDark.untouchedAreas).toBeGreaterThan(0);
  });
  it("rejects bright paper islands when the whole source plane is already too dark",()=>{
    const src=source(),overdrawn=image(540,600,115);
    for(let y=0;y<600;y++)for(let x=0;x<540;x++){
      if(x%9<3&&y%9<3){
        const p=4*(y*540+x);
        overdrawn.data[p]=255;overdrawn.data[p+1]=251;
        overdrawn.data[p+2]=245;
      }
    }
    const result=createPhotoSkinToothBridge(
      src,overdrawn,guides,face,crop,1);
    expect(result.marks).toHaveLength(0);
    expect(result.untouchedAreas).toBeGreaterThan(0);
    expect(result.rasterUnderpainting).toBe(false);
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
