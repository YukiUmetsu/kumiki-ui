import {describe,expect,it} from "vitest";
import {
  PENCIL_PHOTO_DEFAULTS,createPencilPhotoStudy,pencilPhotoStrokeCount,
} from "../src/video/colored-pencil-photo";
import type {PencilPhotoPixels} from "../src/video/colored-pencil-photo";

function synthetic(width=96,height=72):PencilPhotoPixels {
  const data=new Uint8ClampedArray(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const i=(y*width+x)*4;
    const left=x<width/2;
    const eye=Math.abs(y-height*.43-(x-width*.45)*.34)<3;
    const tail=Math.abs(y-height*.6-(x-width*.33)*.11)<3;
    data[i]=eye?30:left?199:50;
    data[i+1]=eye?24:left?105:126;
    data[i+2]=eye?36:left?62:158;
    if(tail){data[i]=230;data[i+1]=213;data[i+2]=173;}
    data[i+3]=255;
  }
  return {width,height,data};
}
const mean=(data:Uint8ClampedArray,width:number,height:number,start:number,end:number,
  color:number)=>{
  let total=0,count=0;
  for(let y=0;y<height;y++)for(let x=start;x<end;x++){
    total+=data[(y*width+x)*4+color];count++;
  }
  return total/count;
};

describe("source-guided colour-pencil reconstruction",()=>{
  it("preserves real reference geometry, chromatic separation and fine outlines",()=>{
    const source=synthetic();
    const art=createPencilPhotoStudy(source);
    expect(art.width).toBe(96);
    expect(art.height).toBe(72);
    expect(art.pigment).toHaveLength(source.data.length);
    expect(art.strokes.length).toBeGreaterThan(20);
    expect(art.strokes.length).toBeLessThan(30000);
    expect(art.pigment.every((v,i)=>i%4!==3||v===255)).toBe(true);
    // A burnt-orange animal on one half and a blue scene on the other
    // cannot collapse to one global vector-style solid hue.
    const lr=mean(art.pigment,96,72,0,48,0);
    const rr=mean(art.pigment,96,72,48,96,0);
    const lb=mean(art.pigment,96,72,0,48,2);
    const rb=mean(art.pigment,96,72,48,96,2);
    expect(lr).toBeGreaterThan(rr+40);
    expect(rb).toBeGreaterThan(lb+35);
    const idx=(32*96+48)*4;
    expect(art.pigment[idx]).toBeGreaterThan(0);
  });

  it("renders deterministic stroke ordering, geometric curves and absolute frame count",()=>{
    const input=synthetic();
    const art=createPencilPhotoStudy(input,{seed:101,density:2});
    const same=createPencilPhotoStudy(input,{seed:101,density:2});
    expect(art).toEqual(same);
    expect(createPencilPhotoStudy(input,{seed:102,density:2}).strokes)
      .not.toEqual(art.strokes);
    expect(art.strokes.every(s=>
      [s.x,s.y,s.controlX,s.controlY,s.endX,s.endY,s.width,s.alpha]
        .every(Number.isFinite))).toBe(true);
    expect(art.strokes.every(s=>s.width<1 && s.alpha<.6)).toBe(true);
    expect(art.strokes.every((s,i,a)=>i===0||a[i-1].pass<=s.pass)).toBe(true);
    expect(pencilPhotoStrokeCount(art,0)).toBe(0);
    expect(pencilPhotoStrokeCount(art,95)).toBe(0);
    expect(pencilPhotoStrokeCount(art,350)).toBe(art.strokes.length);
    const mid=pencilPhotoStrokeCount(art,205);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(art.strokes.length);
    expect(pencilPhotoStrokeCount(art,205)).toBe(mid);
    expect(()=>pencilPhotoStrokeCount(art,-1)).toThrow(RangeError);
  });

  it("responds visibly to pigment pressure, source colour and tooth",()=>{
    const input=synthetic();
    const dry=createPencilPhotoStudy(input,{
      paper:.95,tooth:.95,saturation:.2,edges:.1,
    });
    const saturated=createPencilPhotoStudy(input,{
      paper:0,tooth:0,saturation:1,edges:1,
    });
    expect(dry.pigment).not.toEqual(saturated.pigment);
    expect(dry.strokes).not.toEqual(saturated.strokes);
    expect(PENCIL_PHOTO_DEFAULTS.seed).toBe(1024);
    expect(dry.strokes.every(s=>/^#[0-9a-f]{6}$/.test(s.color))).toBe(true);
  });

  it("enforces bounded source dimensions and settings before allocating a full frame",()=>{
    const input=synthetic();
    expect(()=>createPencilPhotoStudy({...input,width:0})).toThrow(RangeError);
    expect(()=>createPencilPhotoStudy({...input,width:9999})).toThrow(RangeError);
    expect(()=>createPencilPhotoStudy({...input,
      data:new Uint8ClampedArray(12)})).toThrow(RangeError);
    expect(()=>createPencilPhotoStudy(input,{seed:-1})).toThrow(RangeError);
    expect(()=>createPencilPhotoStudy(input,{paper:1.1})).toThrow(RangeError);
    expect(()=>createPencilPhotoStudy(input,{density:3})).toThrow(RangeError);
    expect(()=>createPencilPhotoStudy(input,{tooth:NaN})).toThrow(RangeError);
  });
});
