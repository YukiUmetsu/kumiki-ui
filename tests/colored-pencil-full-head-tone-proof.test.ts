import {describe,expect,it} from "vitest";
import {
  CC0_FACE_VALUE_REGIONS,compareCC0PortraitTones,
} from "../src/video/colored-pencil-full-head-tone-proof";
import type {PencilTonePixelGrid} from "../src/video/colored-pencil-full-head-tone-proof";

const make=(value:number):PencilTonePixelGrid=>{
  const width=540,height=600,data=new Uint8ClampedArray(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const index=4*(y*width+x);
    data[index]=data[index+1]=data[index+2]=value;
    data[index+3]=255;
  }
  return {width,height,data};
};
const paint=(image:PencilTonePixelGrid,x:number,y:number,value:number)=>{
  const cx=Math.round(x*image.width),cy=Math.round(y*image.height);
  for(let yy=cy-16;yy<=cy+16;yy++)for(let xx=cx-16;xx<=cx+16;xx++){
    const index=4*(yy*image.width+xx);
    image.data[index]=image.data[index+1]=image.data[index+2]=value;
  }
};
describe("source-aligned ArtCraft facial tone evidence (negative gate only)",()=>{
  it("measures five matching real-image regions, preserves contrast and never approves art",()=>{
    const source=make(245),dry=make(250);
    const sourceLevels=[22,107,132,178,215];
    const pencilLevels=[40,113,139,180,217];
    CC0_FACE_VALUE_REGIONS.forEach((r,i)=>{
      paint(source,r.x,r.y,sourceLevels[i]);
      paint(dry,r.x,r.y,pencilLevels[i]);
    });
    const result=compareCC0PortraitTones(source,dry);
    expect(result.regions).toHaveLength(5);
    result.regions.forEach((r,i)=>{
      expect(r.name).toBe(CC0_FACE_VALUE_REGIONS[i].name);
      expect(r.sourceLuminance).toBeCloseTo(sourceLevels[i],0);
      expect(r.drawnLuminance).toBeCloseTo(pencilLevels[i],0);
    });
    expect(result.sourceRange).toBeGreaterThan(180);
    expect(result.contrastRetention).toBeGreaterThan(.8);
    expect(result.severeValueCollapse).toBe(false);
    expect(result.artisticApproval).toBe(false);
  });
  it("flags pale optical washes and flat reference inputs, without false artistic success",()=>{
    const source=make(245),pale=make(250);
    CC0_FACE_VALUE_REGIONS.forEach((r,i)=>paint(
      source,r.x,r.y,[21,108,132,180,210][i]));
    const collapsed=compareCC0PortraitTones(source,pale);
    expect(collapsed.contrastRetention).toBe(0);
    expect(collapsed.severeValueCollapse).toBe(true);
    expect(collapsed.meanAbsoluteValueError).toBeGreaterThan(70);
    const flat=compareCC0PortraitTones(make(188),make(188));
    expect(flat.sourceRange).toBe(0);
    expect(flat.severeValueCollapse).toBe(true);
    expect(flat.artisticApproval).toBe(false);
  });
  it("rejects malformed, unregistered and translucent image evidence",()=>{
    const good=make(160);
    expect(()=>compareCC0PortraitTones(
      {...good,data:new Uint8ClampedArray(3)},good)).toThrow(RangeError);
    expect(()=>compareCC0PortraitTones(
      good,{...good,width:400})).toThrow(RangeError);
    const withAlpha=make(160);
    const r=CC0_FACE_VALUE_REGIONS[0];
    const x=Math.round(r.x*withAlpha.width);
    const y=Math.round(r.y*withAlpha.height);
    withAlpha.data[4*(y*withAlpha.width+x)+3]=0;
    expect(()=>compareCC0PortraitTones(good,withAlpha)).toThrow(RangeError);
  });
});
