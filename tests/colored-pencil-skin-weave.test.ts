import {describe,expect,it} from "vitest";
import {
  createPencilSkinOpticalWeave,
} from "../src/video/colored-pencil-skin-weave";
import {projectMeasuredHeadContours}
  from "../src/video/colored-pencil-full-head";
import {mapCC0WomanPortraitFeatures}
  from "../src/video/colored-pencil-portrait-guides";
import type {PencilPhotoPixels} from "../src/video/colored-pencil-photo";

const guides=mapCC0WomanPortraitFeatures({
  width:900,height:506,naturalWidth:5184,naturalHeight:3456,
  mode:"focus",focal:[.52,.25],zoom:2.05,
});
const face=projectMeasuredHeadContours(guides).face;
const photo=(brightPatch=false):PencilPhotoPixels=>{
  const width=900,height=506,data=new Uint8ClampedArray(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const k=(y*width+x)*4;
    const v=clamp(Math.round(204+(x/width-0.5)*35-
      Math.min(92,Math.abs(y-250)*.22)),55,235);
    const highlight=brightPatch&&
      Math.hypot((x-guides.cheekLeft[0])/.76,
        y-guides.cheekLeft[1])<17;
    data[k]=highlight?252:v;
    data[k+1]=highlight?250:Math.round(v*.83);
    data[k+2]=highlight?247:Math.round(v*.77);
    data[k+3]=255;
  }
  return {width,height,data};
};
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
const inPoly=(x:number,y:number,poly:typeof face)=>{
  let inside=false;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++){
    const a=poly[i],b=poly[j];
    if((a[1]>y)!==(b[1]>y)&&
      x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;
  }
  return inside;
};
describe("ArtCraft photographed skin optical weave",()=>{
  it("keeps the 0% setting EXACTLY blank while retaining geometry evidence",()=>{
    const img=photo();
    const before=img.data.slice();
    const out=createPencilSkinOpticalWeave(img,guides,face,271,0);
    expect(out.marks).toHaveLength(0);
    expect(out.sourceSupported).toBe(0);
    expect(out.rasterUnderpainting).toBe(false);
    expect(out.sourceRequired).toBe(true);
    expect(img.data.every((v,i)=>v===before[i])).toBe(true);
  });
  it("lays thousands of overlapping actual pressure arcs within face and preserves features",()=>{
    const img=photo(true);
    const before=img.data.slice();
    const w=createPencilSkinOpticalWeave(img,guides,face,271,.7);
    expect(w.marks.length).toBeGreaterThan(300);
    expect(w.marks.length).toBeLessThan(50000);
    expect(w.sourceSupported).toBe(w.marks.length);
    expect(w.protectedAnatomy).toBeGreaterThan(20);
    expect(w.protectedHighlights).toBeGreaterThan(0);
    expect(w.marks.some(m=>Math.abs(m.controlY-
      (m.y+m.endY)*.5)>.05)).toBe(true);
    expect(w.marks.every(m=>m.alpha>0&&m.alpha<.5&&m.pass===2&&
      m.width>0&&/^#[0-9a-f]{6}$/.test(m.color)&&
      [m.x,m.y,m.controlX,m.controlY,m.endX,m.endY]
        .every(Number.isFinite)&&
      inPoly(m.x,m.y,face)&&inPoly(m.endX,m.endY,face))).toBe(true);
    expect(img.data.every((v,i)=>v===before[i])).toBe(true);
    expect(createPencilSkinOpticalWeave(img,guides,face,271,.7)).toEqual(w);
    expect(createPencilSkinOpticalWeave(img,guides,face,272,.7).marks)
      .not.toEqual(w.marks);
  },15000);
  it("refuses to paint manufactured skin when source is paper-white",()=>{
    const img=photo();
    for(let i=0;i<img.data.length;i+=4){
      img.data[i]=249;img.data[i+1]=248;img.data[i+2]=247;
    }
    const w=createPencilSkinOpticalWeave(img,guides,face,271,1);
    expect(w.marks).toHaveLength(0);
    expect(w.protectedHighlights).toBeGreaterThan(100);
    expect(()=>createPencilSkinOpticalWeave({
      ...img,data:new Uint8ClampedArray(0)},guides,face))
      .toThrow(RangeError);
    expect(()=>createPencilSkinOpticalWeave(img,{
      ...guides,eyeNearCenter:[NaN,1],
    },face)).toThrow(RangeError);
    expect(()=>createPencilSkinOpticalWeave(img,guides,face,271,1.1))
      .toThrow(RangeError);
    expect(()=>createPencilSkinOpticalWeave(img,guides,[
      [0,0],[1,2],
    ])).toThrow(RangeError);
  });
});
