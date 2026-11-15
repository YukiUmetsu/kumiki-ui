import {describe,expect,it} from "vitest";
import {
  createOpticalEyelidFibres,
} from "../src/video/colored-pencil-optical-eyelids";
import {createPortraitEyeAperture,mapCC0WomanPortraitFeatures}
  from "../src/video/colored-pencil-portrait-guides";
import type {PencilPhotoPixels} from "../src/video/colored-pencil-photo";

const guides=mapCC0WomanPortraitFeatures({
  width:900,height:506,naturalWidth:5184,naturalHeight:3456,
  mode:"focus",focal:[.52,.25],zoom:2.05,
});
const beige=():PencilPhotoPixels=>{
  const width=900,height=506,data=new Uint8ClampedArray(width*height*4);
  for(let i=0;i<data.length;i+=4){
    data[i]=197;data[i+1]=159;data[i+2]=139;data[i+3]=255;
  }
  return {width,height,data};
};
const quadratic=(a:readonly[number,number],b:readonly[number,number],
  c:readonly[number,number],t:number)=>{
  const s=1-t;
  return [s*s*a[0]+2*s*t*b[0]+t*t*c[0],
    s*s*a[1]+2*s*t*b[1]+t*t*c[1]] as const;
};
const photographedLids=()=>{
  const source=beige();
  for(const eye of ["near","far"] as const){
    const lid=createPortraitEyeAperture(guides,eye);
    for(const ctr of [lid.upper,lid.lower]){
      for(let i=0;i<=2000;i++){
        const t=i/2000;
        const [x,y]=quadratic(lid.start,ctr,lid.end,t);
        const xx=Math.round(x),yy=Math.round(y);
        for(const dx of [0,1])for(const dy of [0,1]){
          const k=((yy+dy)*source.width+xx+dx)*4;
          source.data[k]=72;source.data[k+1]=44;source.data[k+2]=40;
        }
      }
    }
  }
  return source;
};
describe("ArtCraft source-conditioned realistic pencil eyelids",()=>{
  it("rejects manufactured lid shapes when a source has no optical ridges",()=>{
    const src=beige();
    const blank=createOpticalEyelidFibres(src,guides,271,.8);
    expect(blank.marks).toHaveLength(0);
    expect(blank.traces).toHaveLength(4);
    expect(blank.traces.every(t=>t.sourceSupported===0&&t.marks===0))
      .toBe(true);
    expect(blank.rasterUnderpainting).toBe(false);
    expect(blank.sourceRequired).toBe(true);
    expect(createOpticalEyelidFibres(src,guides,271,0).marks)
      .toHaveLength(0);
  });
  it("constructs true upper/lower rim pressure nibs only on photographed dark ridges",()=>{
    const src=photographedLids();
    const before=new Uint8ClampedArray(src.data);
    const result=createOpticalEyelidFibres(src,guides,271,.9);
    expect(result.traces).toHaveLength(4);
    expect(result.traces.every(t=>t.sourceSupported>3)).toBe(true);
    expect(result.traces.every(t=>t.marks>2)).toBe(true);
    expect(result.marks.length).toBeGreaterThan(24);
    expect(result.marks.length).toBeLessThan(400);
    expect(result.marks.every(m=>m.alpha>0&&m.alpha<=.56&&m.width>0&&
      m.pass===2&&/^#[0-9a-f]{6}$/.test(m.color)&&
      [m.x,m.y,m.controlX,m.controlY,m.endX,m.endY]
        .every(Number.isFinite))).toBe(true);
    // Vitest deep-diffing a 1.8-million-element typed array exceeds the
    // focused 5-second test budget; a linear exact equality scan does not.
    expect(src.data.length).toBe(before.length);
    expect(src.data.every((value,i)=>value===before[i])).toBe(true);
    expect(createOpticalEyelidFibres(src,guides,271,.9)).toEqual(result);
    expect(createOpticalEyelidFibres(src,guides,272,.9).marks)
      .not.toEqual(result.marks);
  });
  it("never extends bright glints or source samples beyond image bounds",()=>{
    const source=photographedLids();
    const lid=createPortraitEyeAperture(guides,"near");
    for(let x=Math.floor(lid.center[0]-4);
      x<=Math.ceil(lid.center[0]+4);x++){
      for(let y=Math.floor(lid.center[1]-4);
        y<=Math.ceil(lid.center[1]+4);y++){
        const k=4*(y*source.width+x);
        source.data[k]=255;source.data[k+1]=255;source.data[k+2]=255;
      }
    }
    const marked=createOpticalEyelidFibres(source,guides,6,1);
    for(const m of marked.marks){
      expect(m.x).toBeGreaterThanOrEqual(0);
      expect(m.y).toBeGreaterThanOrEqual(0);
      expect(m.endX).toBeLessThan(source.width);
      expect(m.endY).toBeLessThan(source.height);
    }
    expect(()=>createOpticalEyelidFibres({
      ...source,data:new Uint8ClampedArray(0)},guides)).toThrow(RangeError);
    expect(()=>createOpticalEyelidFibres(source,guides,1,1.1))
      .toThrow(RangeError);
    expect(()=>createOpticalEyelidFibres(source,{
      ...guides,eyeNearCenter:[Number.NaN,1],
    })).toThrow(RangeError);
  });
});
