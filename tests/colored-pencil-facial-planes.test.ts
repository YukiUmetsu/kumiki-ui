import {describe,expect,it} from "vitest";
import {createFacialOpticalPlanes} from "../src/video/colored-pencil-facial-planes";
import {mapCC0WomanPortraitFeatures} from "../src/video/colored-pencil-portrait-guides";
import type {PencilPhotoPixels} from "../src/video/colored-pencil-photo";

const g=mapCC0WomanPortraitFeatures({
  width:900,height:506,naturalWidth:5184,naturalHeight:3456,
  mode:"focus",focal:[.52,.25],zoom:2.05,
});
const lipMask=(x:number,y:number)=>{
  const left=g.lipLeft,right=g.lipRight,t=(x-left[0])/(right[0]-left[0]);
  if(t<=0||t>=1)return false;
  const q=(a:number,b:number,c:number)=>
    (1-t)*(1-t)*a+2*(1-t)*t*b+t*t*c;
  return y>=q(left[1],g.lipCupid[1],right[1])&&
    y<=q(left[1],g.lipLower[1],right[1]);
};
const photo=(withFeatures=true):PencilPhotoPixels=>{
  const width=900,height=506,data=new Uint8ClampedArray(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const at=4*(y*width+x);
    let color=[205,159,142];
    if(withFeatures&&lipMask(x,y))color=[131,60,72];
    if(withFeatures&&Math.hypot(x-g.noseTip[0],y-g.noseTip[1])<13)
      color=[86,51,40];
    data[at]=color[0];data[at+1]=color[1];
    data[at+2]=color[2];data[at+3]=255;
  }
  return {width,height,data};
};
describe("ArtCraft photo-measured dry-pencil lip and alar tonal planes",()=>{
  it("separately builds source-supported lip, alar fibres on plain paper",()=>{
    const img=photo(),before=new Uint8ClampedArray(img.data);
    const out=createFacialOpticalPlanes(img,g,271,.85);
    expect(out.rasterUnderpainting).toBe(false);
    expect(out.regions["lip-vermilion"]).toBeGreaterThan(80);
    expect(out.regions["nasal-alar"]).toBeGreaterThan(10);
    expect(out.marks.length).toBeLessThan(4500);
    expect(out.regions["lip-vermilion"]+
      out.regions["nasal-alar"]).toBe(out.marks.length);
    expect(out.marks.every(m=>
      ["lip-vermilion","nasal-alar"].includes(m.kind)&&
      [m.x,m.y,m.dx,m.dy,m.width,m.alpha,m.curvature]
        .every(Number.isFinite)&&m.x>0&&m.x<img.width&&
      m.y>0&&m.y<img.height&&m.alpha>0&&m.alpha<=.56&&
      m.width>0&&/^#[a-f0-9]{6}$/i.test(m.color))).toBe(true);
    expect(img.data).toEqual(before);
    expect(createFacialOpticalPlanes(img,g,271,.85)).toEqual(out);
    expect(createFacialOpticalPlanes(img,g,272,.85))
      .not.toEqual(out);
  });
  it("honours detail strength, shadow chroma and excludes invented pigment",()=>{
    const img=photo(),off=createFacialOpticalPlanes(img,g,271,0);
    const light=createFacialOpticalPlanes(img,g,271,.4);
    const strong=createFacialOpticalPlanes(img,g,271,1);
    expect(off.marks).toHaveLength(0);
    expect(light.marks.length).toBe(strong.marks.length);
    expect(light.marks.every((m,i)=>m.alpha<strong.marks[i].alpha))
      .toBe(true);
    const blank=createFacialOpticalPlanes(photo(false),g,271,1);
    expect(blank.regions["lip-vermilion"]).toBe(0);
    expect(blank.regions["nasal-alar"]).toBe(0);
  });
  it("fails closed with missing landmarks, corrupt pixel arrays and bad pressure",()=>{
    const img=photo();
    expect(()=>createFacialOpticalPlanes(img,g,271,NaN))
      .toThrow(RangeError);
    expect(()=>createFacialOpticalPlanes(img,g,271,-.01))
      .toThrow(RangeError);
    expect(()=>createFacialOpticalPlanes(img,g,271,1.01))
      .toThrow(RangeError);
    expect(()=>createFacialOpticalPlanes(img,{
      ...g,noseTip:[Infinity,10],
    })).toThrow(RangeError);
    expect(()=>createFacialOpticalPlanes(img,{} as never))
      .toThrow(RangeError);
    expect(()=>createFacialOpticalPlanes({...img,width:999},g))
      .toThrow(RangeError);
  });
});
