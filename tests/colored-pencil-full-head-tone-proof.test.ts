import {describe,expect,it} from "vitest";
import {
  CC0_FACE_VALUE_REGIONS,compareCC0PortraitTones,
  CC0_HAIR_OCCLUSION_PROBE,compareCC0HairOcclusion,
  CC0_VERMILION_PROBES,compareCC0Vermilion,
  CC0_SKIN_COVERAGE_PROBES,compareCC0SoftSkin,
  CC0_LUMINOUS_SKIN_PROBES,compareCC0LuminousSkin,
  CC0_JAW_CONTACT_PROBES,compareCC0JawContact,
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
describe("ArtCraft three distinct source-dark jaw contact patches",()=>{
  it("rejects bright ivory gaps and accepts only source-matched dry fibres",()=>{
    const source=make(230),old=make(230),repaired=make(230);
    const src=[65,52,66],bad=[149,134,141],ink=[107,103,116];
    CC0_JAW_CONTACT_PROBES.forEach((p,i)=>{
      paint(source,p.x,p.y,src[i]);
      paint(old,p.x,p.y,bad[i]);
      paint(repaired,p.x,p.y,ink[i]);
    });
    expect(compareCC0JawContact(source,old).missingDarkJawContact)
      .toBe(true);
    const a=compareCC0JawContact(source,repaired);
    expect(a.missingDarkJawContact).toBe(false);
    expect(a.artisticApproval).toBe(false);
    expect(a.regions.map(x=>x.name)).toEqual([
      "upper-jaw","mid-jaw","lower-jaw"]);
    expect(compareCC0JawContact(make(230),repaired)
      .missingDarkJawContact).toBe(true);
    expect(()=>compareCC0JawContact(source,{...repaired,width:20}))
      .toThrow(RangeError);
  });
});
describe("ArtCraft luminous cheek/nasal bridge vs genuine paper-white negative gate",()=>{
  it("rejects prior blank-white face regions while protecting real source light",()=>{
    const src=make(230),chalk=make(240),optical=make(240);
    const sourceY=[202,199],oldY=[241,236],drawY=[221,223];
    CC0_LUMINOUS_SKIN_PROBES.forEach((region,i)=>{
      paint(src,region.x,region.y,sourceY[i]);
      paint(chalk,region.x,region.y,oldY[i]);
      paint(optical,region.x,region.y,drawY[i]);
    });
    const missing=compareCC0LuminousSkin(src,chalk);
    const restored=compareCC0LuminousSkin(src,optical);
    expect(missing.missingPhotographedLightSkin).toBe(true);
    expect(restored.missingPhotographedLightSkin).toBe(false);
    expect(restored.artisticApproval).toBe(false);
    expect(restored.regions.map(r=>r.name))
      .toEqual(["malar","nasal-bridge"]);
    expect(compareCC0LuminousSkin(make(245),optical)
      .missingPhotographedLightSkin).toBe(true);
    expect(()=>compareCC0LuminousSkin(src,{...optical,width:400}))
      .toThrow(RangeError);
  });
});
describe("ArtCraft independent cheek, under-eye and chin tonal support gate",()=>{
  it("fails on the prior chalk-white skin but not new source-matched dry fibres",()=>{
    const source=make(230),old=make(240),newPlate=make(240);
    const sourceYs=[185,94,149];
    const oldYs=[214,124,185];
    const newYs=[206,113,173];
    CC0_SKIN_COVERAGE_PROBES.forEach((r,i)=>{
      paint(source,r.x,r.y,sourceYs[i]);
      paint(old,r.x,r.y,oldYs[i]);
      paint(newPlate,r.x,r.y,newYs[i]);
    });
    expect(compareCC0SoftSkin(source,old).missingOpticalCoverage)
      .toBe(true);
    const evidence=compareCC0SoftSkin(source,newPlate);
    expect(evidence.missingOpticalCoverage).toBe(false);
    expect(evidence.artisticApproval).toBe(false);
    expect(evidence.regions.map(r=>r.name))
      .toEqual(["cheek","under-eye","chin"]);
    expect(compareCC0SoftSkin(make(245),newPlate)
      .missingOpticalCoverage).toBe(true);
    expect(()=>compareCC0SoftSkin(source,{...newPlate,width:400}))
      .toThrow(RangeError);
  });
});
describe("ArtCraft independent upper/lower vermilion negative-only optical gate",()=>{
  it("rejects the old pale mouth while retaining source-matched pigment, never approving art",()=>{
    const source=make(230),old=make(230),corrected=make(230);
    const src=[75,111],bad=[113,151],good=[82,138];
    CC0_VERMILION_PROBES.forEach((region,i)=>{
      paint(source,region.x,region.y,src[i]);
      paint(old,region.x,region.y,bad[i]);
      paint(corrected,region.x,region.y,good[i]);
    });
    const oldEvidence=compareCC0Vermilion(source,old);
    const repaired=compareCC0Vermilion(source,corrected);
    expect(oldEvidence.missingVermilionPigment).toBe(true);
    expect(repaired.missingVermilionPigment).toBe(false);
    expect(repaired.artisticApproval).toBe(false);
    expect(repaired.regions.map(x=>x.name)).toEqual(["upper","lower"]);
    expect(repaired.regions[0].lightnessDeficit).toBeCloseTo(7,0);
    expect(repaired.regions[1].lightnessDeficit).toBeCloseTo(27,0);
    expect(compareCC0Vermilion(make(220),corrected)
      .missingVermilionPigment).toBe(true);
    expect(()=>compareCC0Vermilion(source,{...old,width:400}))
      .toThrow(RangeError);
  });
});
describe("source-registered ear/hair shadow continuity (negative-only)",()=>{
  it("rejects a lost dark lock and accepts measured dark-pencil depth without artwork approval",()=>{
    const source=make(245),washed=make(250),ink=make(250);
    paint(source,CC0_HAIR_OCCLUSION_PROBE.x,
      CC0_HAIR_OCCLUSION_PROBE.y,3);
    paint(ink,CC0_HAIR_OCCLUSION_PROBE.x,
      CC0_HAIR_OCCLUSION_PROBE.y,58);
    const missing=compareCC0HairOcclusion(source,washed);
    expect(missing.missingDarkLock).toBe(true);
    expect(missing.sourceLuminance).toBeCloseTo(3,0);
    const repaired=compareCC0HairOcclusion(source,ink);
    expect(repaired.missingDarkLock).toBe(false);
    expect(repaired.drawnLuminance).toBeCloseTo(58,0);
    expect(repaired.artisticApproval).toBe(false);
    expect(()=>compareCC0HairOcclusion(source,{
      ...ink,width:400,
    })).toThrow(RangeError);
    const moved=compareCC0HairOcclusion(make(220),ink);
    expect(moved.missingDarkLock).toBe(true);
  });
});
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
