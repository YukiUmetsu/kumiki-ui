import {describe,expect,it} from "vitest";
import {mapCC0WomanPortraitFeatures}
  from "../src/video/colored-pencil-portrait-guides";
import {createPhotoNeckContactFibres}
  from "../src/video/colored-pencil-neck-contact";
import type {PencilPhotoPixels} from "../src/video/colored-pencil-photo";

const guides=mapCC0WomanPortraitFeatures({
  width:900,height:506,naturalWidth:5184,naturalHeight:3456,
  mode:"focus",focal:[.52,.25],zoom:2.05,
});
const eyeDist=Math.hypot(
  guides.eyeNearCenter[0]-guides.eyeFarCenter[0],
  guides.eyeNearCenter[1]-guides.eyeFarCenter[1],
);
const crop={left:guides.hairline[0]-eyeDist*4.55*.49,
  top:guides.hairline[1]-eyeDist*.7,
  width:eyeDist*4.55,height:eyeDist*4.55*600/540};
const source=(kind:"shadow"|"paper"|"garden"="shadow"):PencilPhotoPixels=>{
  const width=900,height=506;
  const data=new Uint8ClampedArray(width*height*4);
  const c=kind==="paper"?[249,245,237]:
    kind==="garden"?[70,116,49]:[140,97,72];
  for(let i=0;i<data.length;i+=4){
    data[i]=c[0];data[i+1]=c[1];data[i+2]=c[2];data[i+3]=255;
  }
  return {width,height,data};
};
describe("ArtCraft CC0 rooted neck/contact fiber continuity",()=>{
  it("preserves every original dry-pencil mark at 0% without inventing material",()=>{
    const img=source(),original=img.data.slice();
    const out=createPhotoNeckContactFibres(img,guides,crop,0,271);
    expect(out.marks).toHaveLength(0);
    expect(out.sourceSupported).toBe(0);
    expect(out.sourceRequired).toBe(true);
    expect(out.rasterUnderpainting).toBe(false);
    expect(img.data).toEqual(original);
  });
  it("produces connected source-dark neck fibres along the measured root gap",()=>{
    const img=source(),original=img.data.slice();
    const out=createPhotoNeckContactFibres(img,guides,crop,1,271);
    expect(out.marks.length).toBeGreaterThan(100);
    expect(out.marks.length).toBeLessThan(1500);
    expect(out.sourceSupported).toBe(out.marks.length);
    const xs=out.marks.map(m=>m.x),ys=out.marks.map(m=>m.y);
    const expectedX=(guides.hairline[0]-crop.left)*540/crop.width;
    expect(Math.max(...xs)-Math.min(...xs)).toBeLessThan(12);
    expect(xs.every(x=>Math.abs(x-expectedX)<8)).toBe(true);
    expect(Math.max(...ys)-Math.min(...ys)).toBeGreaterThan(40);
    expect(out.marks.every(m=>
      /^#[0-9a-f]{6}$/.test(m.color)&&
      m.pass===2&&m.alpha>0&&m.alpha<=.36&&m.width>0&&
      [m.x,m.y,m.endX,m.endY,m.controlX,m.controlY]
        .every(Number.isFinite)&&m.x>=0&&m.x<=540&&
      m.y>=0&&m.y<=600&&m.endX>=0&&m.endX<=540&&
      m.endY>=0&&m.endY<=600)).toBe(true);
    expect(img.data).toEqual(original);
    expect(createPhotoNeckContactFibres(img,guides,crop,1,271))
      .toEqual(out);
    expect(createPhotoNeckContactFibres(img,guides,crop,1,272))
      .not.toEqual(out);
  });
  it("never paints fabricated dark hair on bright source or green garden",()=>{
    const paper=createPhotoNeckContactFibres(
      source("paper"),guides,crop,1);
    expect(paper.marks).toHaveLength(0);
    expect(paper.protectedLight).toBeGreaterThan(50);
    const garden=createPhotoNeckContactFibres(
      source("garden"),guides,crop,1);
    expect(garden.marks).toHaveLength(0);
    expect(garden.protectedBackground).toBeGreaterThan(50);
  });
  it("fails closed on malformed photo/landmarks/invalid pressure, and crops out of frame",()=>{
    const img=source();
    expect(()=>createPhotoNeckContactFibres({
      ...img,data:new Uint8ClampedArray(0),
    },guides,crop,1)).toThrow(RangeError);
    expect(()=>createPhotoNeckContactFibres(img,{
      ...guides,chin:[NaN,0],
    },crop,1)).toThrow(RangeError);
    expect(()=>createPhotoNeckContactFibres(img,guides,{
      ...crop,width:0,
    },1)).toThrow(RangeError);
    expect(()=>createPhotoNeckContactFibres(img,guides,crop,1.01))
      .toThrow(RangeError);
    expect(()=>createPhotoNeckContactFibres(img,guides,crop,.5,-1))
      .toThrow(RangeError);
    // A vertical crop without any supported neck must remain blank.
    const clipped=createPhotoNeckContactFibres(img,guides,{
      ...crop,top:-90,height:250,
    },1);
    expect(clipped.marks).toHaveLength(0);
  });
});
