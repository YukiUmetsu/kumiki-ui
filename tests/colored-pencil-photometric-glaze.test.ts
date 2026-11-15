import {describe,expect,it} from "vitest";
import {createPhotometricSkinGlaze}
  from "../src/video/colored-pencil-photometric-glaze";
import {mapCC0WomanPortraitFeatures}
  from "../src/video/colored-pencil-portrait-guides";
import type {PencilPhotoPixels} from "../src/video/colored-pencil-photo";
import type {PortraitHeadStroke} from "../src/video/colored-pencil-full-head";

const guides=mapCC0WomanPortraitFeatures({
  width:900,height:506,naturalWidth:5184,naturalHeight:3456,
  mode:"focus",focal:[.52,.25],zoom:2.05,
});
const crop={left:0,top:0,width:900,height:506} as const;
const source=(bright=false):PencilPhotoPixels=>{
  const width=900,height=506;
  const data=new Uint8ClampedArray(width*height*4);
  for(let i=0;i<data.length;i+=4){
    data[i]=bright?251:180;
    data[i+1]=bright?250:137;
    data[i+2]=bright?248:118;
    data[i+3]=255;
  }
  return {width,height,data};
};
const strokes:PortraitHeadStroke[]=[];
for(let j=0;j<23;j++)for(let i=0;i<30;i++){
  const x=25+i*16,y=25+j*22;
  strokes.push({
    x,y,controlX:x+2.5,controlY:y-1,
    endX:x+5,endY:y+1,color:"#b28c7b",
    width:1.38,alpha:.23,pass:i%2===0?0:1,
    zone:i%2===0?"face-value":"face-chroma",
  });
}
describe("photometric translucent pencil layer over source-measured skin",()=>{
  it("leaves legacy source and strokes exactly unchanged at 0%",()=>{
    const src=source(),before=src.data.slice();
    const out=createPhotometricSkinGlaze(src,guides,crop,strokes,0);
    expect(out.marks).toHaveLength(0);
    expect(out.accepted).toBe(0);
    expect(out.rasterUnderpainting).toBe(false);
    expect(out.sourceRequired).toBe(true);
    expect(src.data.every((n,i)=>n===before[i])).toBe(true);
  });
  it("disperses thousands of photographic warm/cool fibers without gradients or raster",()=>{
    const src=source(),original=src.data.slice();
    const a=createPhotometricSkinGlaze(src,guides,crop,strokes,1,271);
    expect(a.accepted).toBeGreaterThan(40);
    expect(a.marks.length).toBe(a.accepted*2);
    // Each pair sits on opposite sides of the SAME pre-existing
    // source-bound tangent, not on top of one another.
    for(let i=0;i<a.marks.length;i+=2){
      const left=a.marks[i],right=a.marks[i+1];
      expect(Math.hypot(left.x-right.x,left.y-right.y))
        .toBeGreaterThan(2);
      expect(left.color).toBe(right.color);
      expect(left.alpha).toBeGreaterThan(0);
      expect(right.alpha).toBeGreaterThan(0);
    }
    expect(a.marks.every(m=>m.alpha<.3&&m.width<4)).toBe(true);
    expect(a.marks.every(m=>
      /^#[0-9a-f]{6}$/.test(m.color)&&m.alpha>0&&m.alpha<.35&&
      m.width>0&&m.pass===0&&
      [m.x,m.y,m.controlX,m.controlY,m.endX,m.endY]
        .every(Number.isFinite))).toBe(true);
    expect(a.anatomyProtected).toBeGreaterThan(0);
    expect(src.data.every((v,i)=>v===original[i])).toBe(true);
    expect(createPhotometricSkinGlaze(src,guides,crop,strokes,1,271))
      .toEqual(a);
    expect(createPhotometricSkinGlaze(src,guides,crop,strokes,1,272))
      .not.toEqual(a);
    expect(strokes.every(m=>m.color==="#b28c7b")).toBe(true);
  });
  it("never invents skin under photographed paper-white highlights",()=>{
    const proof=createPhotometricSkinGlaze(
      source(true),guides,crop,strokes,1);
    expect(proof.marks).toHaveLength(0);
    expect(proof.highlighted).toBeGreaterThan(100);
  });
  it("fails closed on invalid pixel buffers, guide map, crop and tone",()=>{
    const src=source();
    expect(()=>createPhotometricSkinGlaze({
      ...src,data:new Uint8ClampedArray(0),
    },guides,crop,strokes)).toThrow(RangeError);
    expect(()=>createPhotometricSkinGlaze(src,{
      ...guides,eyeNearCenter:[NaN,1],
    },crop,strokes)).toThrow(RangeError);
    expect(()=>createPhotometricSkinGlaze(src,guides,{
      ...crop,width:0,
    },strokes)).toThrow(RangeError);
    expect(()=>createPhotometricSkinGlaze(src,guides,crop,strokes,1.01))
      .toThrow(RangeError);
    expect(()=>createPhotometricSkinGlaze(src,guides,crop,strokes,.5,-1))
      .toThrow(RangeError);
  });
});
