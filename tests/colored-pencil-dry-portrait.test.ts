import {describe,expect,it} from "vitest";
import {createDryPortraitPlate} from "../src/video/colored-pencil-dry-portrait";
import {mapCC0WomanPortraitFeatures} from "../src/video/colored-pencil-portrait-guides";
import type {PencilPhotoPixels} from "../src/video/colored-pencil-photo";

const photo=():PencilPhotoPixels=>{
  const width=900,height=506;
  const data=new Uint8ClampedArray(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const k=(y*width+x)*4;
    const iris=Math.exp(-Math.pow((x-446)/14,2)-Math.pow((y-220)/7,2));
    const lower=Math.exp(-Math.pow((x-476)/30,2)-Math.pow((y-295)/12,2));
    const skin=Math.exp(-Math.pow((x-495)/185,2)-Math.pow((y-254)/180,2));
    data[k]=Math.round(88+143*skin-105*iris-72*lower);
    data[k+1]=Math.round(65+116*skin-72*iris-48*lower);
    data[k+2]=Math.round(60+100*skin-66*iris-42*lower);
    data[k+3]=255;
  }
  return {width,height,data};
};
const guides=mapCC0WomanPortraitFeatures({
  width:900,height:506,naturalWidth:5184,naturalHeight:3456,
  mode:"focus",focal:[.52,.25],zoom:2.05,
});
describe("ArtCraft experimental dry portrait construction",()=>{
  it("builds three ordered value/color/detail mark passes with NO bitmap underpaint",()=>{
    const p=createDryPortraitPlate(photo(),guides,"eyes",204);
    expect(p.width).toBe(360);expect(p.height).toBe(240);
    expect(p.rasterUnderpainting).toBe(false);
    expect(p.valueCounts.every(n=>n>200)).toBe(true);
    expect(p.strokes.length).toBeGreaterThan(1200);
    expect(p.strokes.length).toBeLessThan(16000);
    expect(p.strokes.every((s,i,a)=>
      /^#[0-9a-f]{6}$/i.test(s.color)&&s.alpha>0&&s.alpha<=.60&&
      s.width>0&&
      [s.x,s.y,s.endX,s.endY,s.controlX,s.controlY].every(Number.isFinite)&&
      s.x>=0&&s.x<=360&&s.endX>=0&&s.endX<=360&&
      s.y>=0&&s.y<=240&&s.endY>=0&&s.endY<=240&&
      (i===0||a[i-1].pass<=s.pass))).toBe(true);
    expect(createDryPortraitPlate(photo(),guides,"eyes",204)).toEqual(p);
    // A material proof cannot accidentally return raw source pixel data.
    expect("pigment" in p).toBe(false);
    expect("sourceImage" in p).toBe(false);
  });
  it("reconstructs different anatomical regions with the same sampler",()=>{
    const eyes=createDryPortraitPlate(photo(),guides,"eyes",204);
    const lips=createDryPortraitPlate(photo(),guides,"lips",204);
    expect(eyes.crop).not.toEqual(lips.crop);
    expect(eyes.strokes).not.toEqual(lips.strokes);
    expect(createDryPortraitPlate(photo(),guides,"eyes",205).strokes)
      .not.toEqual(eyes.strokes);
  });
  it("responds to source values and fails closed for malformed input",()=>{
    const src=photo();
    const before=createDryPortraitPlate(src,guides,"eyes",204);
    const [x,y]=guides.eyeNearCenter;
    for(let yy=Math.max(0,Math.floor(y)-22);yy<Math.min(src.height,y+22);yy++)
      for(let xx=Math.max(0,Math.floor(x)-32);xx<Math.min(src.width,x+32);xx++){
        const k=(yy*src.width+xx)*4;
        src.data[k]=250;src.data[k+1]=249;src.data[k+2]=246;
      }
    const after=createDryPortraitPlate(src,guides,"eyes",204);
    expect(after.strokes).not.toEqual(before.strokes);
    expect(()=>createDryPortraitPlate(src,guides,"invalid" as never))
      .toThrow(RangeError);
    expect(()=>createDryPortraitPlate({...src,data:new Uint8ClampedArray(0)},guides))
      .toThrow(RangeError);
  });
});
