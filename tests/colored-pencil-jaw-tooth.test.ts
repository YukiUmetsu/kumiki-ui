import {describe,expect,it} from "vitest";
import {
  createPhotoJawToothFibres,
} from "../src/video/colored-pencil-jaw-tooth";
import {mapCC0WomanPortraitFeatures} from
  "../src/video/colored-pencil-portrait-guides";
import {projectMeasuredHeadContours} from
  "../src/video/colored-pencil-full-head";
import type {PencilPhotoPixels} from "../src/video/colored-pencil-photo";

const guides=mapCC0WomanPortraitFeatures({
  width:900,height:506,naturalWidth:5184,naturalHeight:3456,
  mode:"focus",focal:[.52,.25],zoom:2.05,
});
const eyeDist=Math.hypot(
  guides.eyeNearCenter[0]-guides.eyeFarCenter[0],
  guides.eyeNearCenter[1]-guides.eyeFarCenter[1]);
const crop={
  left:guides.hairline[0]-eyeDist*4.55*.49,
  top:guides.hairline[1]-eyeDist*.70,
  width:eyeDist*4.55,
  height:eyeDist*4.55*600/540,
};
const face=projectMeasuredHeadContours(guides).face;
function image(width:number,height:number,rgb:readonly[number,number,number]):
PencilPhotoPixels{
  const data=new Uint8ClampedArray(width*height*4);
  for(let i=0;i<data.length;i+=4){
    data[i]=rgb[0];data[i+1]=rgb[1];data[i+2]=rgb[2];data[i+3]=255;
  }
  return {width,height,data};
}
const source=()=>image(900,506,[104,71,63]);
const paper=()=>image(540,600,[250,245,237]);
describe("ArtCraft CP18 photo-verified jaw edge tooth fibers",()=>{
  it("leaves exact prior dry pencil and reference unchanged at strength zero",()=>{
    const src=source(),finished=paper();
    const original=src.data.slice(),drawn=finished.data.slice();
    const result=createPhotoJawToothFibres(
      src,finished,guides,face,crop,0);
    expect(result.marks).toHaveLength(0);
    expect(result.photoSupported).toBe(0);
    expect(result.artisticApproval).toBe(false);
    expect(result.rasterUnderpainting).toBe(false);
    expect(src.data.every((v,i)=>v===original[i])).toBe(true);
    expect(finished.data.every((v,i)=>v===drawn[i])).toBe(true);
  });
  it("deposits many independently curved photo-matched fine-pressure jaw nibs",()=>{
    const src=source(),finished=paper(),old=finished.data.slice();
    const result=createPhotoJawToothFibres(
      src,finished,guides,face,crop,1,271);
    expect(result.marks.length).toBeGreaterThan(130);
    expect(result.marks.length).toBeLessThan(1400);
    expect(result.marks.length).toBe(result.photoSupported);
    const first=result.marks[0];
    expect(result.marks.some(m=>m.color!==first.color)).toBe(false);
    expect(result.marks.every(m=>
      m.pass===2&&m.alpha>0&&m.alpha<=.40&&m.width>0&&
      /^#[0-9a-f]{6}$/.test(m.color)&&
      [m.x,m.y,m.endX,m.endY,m.controlX,m.controlY]
        .every(Number.isFinite))).toBe(true);
    expect(createPhotoJawToothFibres(
      src,finished,guides,face,crop,1,271)).toEqual(result);
    expect(createPhotoJawToothFibres(
      src,finished,guides,face,crop,1,272)).not.toEqual(result);
    expect(finished.data.every((v,i)=>v===old[i])).toBe(true);
    expect(createPhotoJawToothFibres(
      src,finished,guides,face,crop,.5).marks
        .every((m,i)=>m.alpha<result.marks[i].alpha)).toBe(true);
  });
  it("does not draw source highlights, already-dark or out-of-frame jaw",()=>{
    const light=createPhotoJawToothFibres(
      image(900,506,[251,246,237]),paper(),
      guides,face,crop,1);
    expect(light.marks).toHaveLength(0);
    expect(light.protectedSourceLights).toBeGreaterThan(80);
    const dark=createPhotoJawToothFibres(
      source(),image(540,600,[38,30,24]),guides,face,crop,1);
    expect(dark.marks).toHaveLength(0);
    expect(dark.protectedExistingDarkness).toBeGreaterThan(80);
    const outside=createPhotoJawToothFibres(
      source(),paper(),guides,face,{
        left:800,top:700,width:100,height:120,
      },1);
    expect(outside.marks).toHaveLength(0);
    expect(outside.protectedOutOfFrame).toBeGreaterThan(80);
  });
  it("rejects corrupt source, observed landmarks, polygon and tunables",()=>{
    const src=source(),out=paper();
    expect(()=>createPhotoJawToothFibres({
      ...src,data:new Uint8ClampedArray(1),
    },out,guides,face,crop)).toThrow(RangeError);
    expect(()=>createPhotoJawToothFibres(src,{
      ...out,data:new Uint8ClampedArray(1),
    },guides,face,crop)).toThrow(RangeError);
    expect(()=>createPhotoJawToothFibres(src,out,{
      ...guides,chin:[NaN,0],
    },face,crop)).toThrow(RangeError);
    expect(()=>createPhotoJawToothFibres(
      src,out,guides,face.slice(1),crop)).toThrow(RangeError);
    expect(()=>createPhotoJawToothFibres(
      src,out,guides,face,{...crop,width:0})).toThrow(RangeError);
    expect(()=>createPhotoJawToothFibres(
      src,out,guides,face,crop,1.01)).toThrow(RangeError);
    expect(()=>createPhotoJawToothFibres(
      src,out,guides,face,crop,.5,-1)).toThrow(RangeError);
  });
});
