import {describe,expect,it} from "vitest";
import {createPencilPhotoStudy} from "../src/video/colored-pencil-photo";
import type {PencilPhotoPixels} from "../src/video/colored-pencil-photo";
import {
  CC0_WOMAN_PORTRAIT_SOURCE_FEATURES,createPencilPortraitFeatureMarks,
  mapCC0WomanPortraitFeatures,createPortraitEyeAperture,
} from "../src/video/colored-pencil-portrait-guides";

const photo=(width=900,height=506):PencilPhotoPixels=>{
  const data=new Uint8ClampedArray(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const a=4*(width*y+x);
    const nx=x/width,ny=y/height;
    const cheek=Math.exp(-Math.pow((nx-.53)/.16,2)-Math.pow((ny-.45)/.25,2));
    const eye=Math.exp(-Math.pow((nx-.50)/.05,2)-Math.pow((ny-.38)/.012,2));
    data[a]=Math.round(96+122*cheek-60*eye);
    data[a+1]=Math.round(72+99*cheek-42*eye);
    data[a+2]=Math.round(66+82*cheek-35*eye);
    data[a+3]=255;
  }
  return {width,height,data};
};
const layout={
  width:900,height:506,naturalWidth:5184,naturalHeight:3456,
  mode:"focus" as const,focal:[.52,.25] as const,zoom:2.05,
};
describe("CC0 photo-derived portrait feature construction",()=>{
  it("is source-coordinate based, not the independent rejected SVG face",()=>{
    expect(Object.keys(CC0_WOMAN_PORTRAIT_SOURCE_FEATURES)).toHaveLength(25);
    const mapped=mapCC0WomanPortraitFeatures(layout);
    // Coordinates from the earlier independent 608×343 actual photo capture,
    // scaled to the real 900×506 canvas (within manual observation error).
    expect(mapped.eyeNearCenter[0]/900).toBeCloseTo(288/608,2);
    expect(mapped.eyeNearCenter[1]/506).toBeCloseTo(173/343,2);
    expect(mapped.lipCupid[0]/900).toBeCloseTo(351/608,2);
    expect(mapped.noseTip[1]/506).toBeCloseTo(205/343,2);
    expect(mapped.eyeFarCenter[0]).toBeGreaterThan(mapped.eyeNearCenter[0]);
    expect(mapped.lipCupid[1]).toBeGreaterThan(mapped.noseTip[1]);
  });
  it("respects source image zoom/aspect and clip bounds when face is off screen",()=>{
    const portrait=mapCC0WomanPortraitFeatures({
      ...layout,width:506,height:900,
    });
    expect(portrait.eyeNearCenter[0]).not.toBeCloseTo(
      mapCC0WomanPortraitFeatures(layout).eyeNearCenter[0]);
    expect(portrait.eyeNearCenter[1]).not.toBeCloseTo(
      mapCC0WomanPortraitFeatures(layout).eyeNearCenter[1]);
    const art=createPencilPortraitFeatureMarks(photo(506,900),portrait,8);
    expect(art.marks.every(m=>m.x>=1&&m.x<504&&m.y>=1&&m.y<898&&
      m.endX>=1&&m.endX<=504&&m.endY>=1&&m.endY<=898))
      .toBe(true);
    expect(()=>mapCC0WomanPortraitFeatures({...layout,naturalWidth:0}))
      .toThrow(RangeError);
    expect(()=>mapCC0WomanPortraitFeatures({...layout,zoom:9}))
      .toThrow(RangeError);
    // Focal coordinates at the exact top-left edge are valid.
    expect(()=>mapCC0WomanPortraitFeatures({...layout,focal:[0,0]}))
      .not.toThrow();
    expect(()=>mapCC0WomanPortraitFeatures({...layout,focal:[-.01,.5]}))
      .toThrow(RangeError);
    expect(()=>mapCC0WomanPortraitFeatures({...layout,mode:"invalid" as never}))
      .toThrow(RangeError);
  });
  it("constructs upper and lower lids around, NEVER through, source iris landmarks",()=>{
    const mapped=mapCC0WomanPortraitFeatures(layout);
    for(const eye of ["near","far"] as const){
      const aperture=createPortraitEyeAperture(mapped,eye);
      const apexUpper=(aperture.start[1]+
        2*aperture.upper[1]+aperture.end[1])/4;
      const apexLower=(aperture.start[1]+
        2*aperture.lower[1]+aperture.end[1])/4;
      expect(apexUpper).toBeLessThan(aperture.center[1]-3);
      expect(apexLower).toBeGreaterThan(aperture.center[1]+2);
      expect(aperture.span).toBeGreaterThan(10);
      expect(()=>createPortraitEyeAperture({
        ...mapped,[eye==="near"?"eyeNearRight":"eyeFarRight"]:aperture.start,
      },eye)).toThrow(RangeError);
    }
  });
  it("draws independent iris, eyelid, brow, alar and lip families; never a cartoon eye fill",()=>{
    const input=photo();
    const mapped=mapCC0WomanPortraitFeatures(layout);
    const made=createPencilPortraitFeatureMarks(input,mapped,55);
    expect(Object.keys(made.featureCounts)).toEqual(expect.arrayContaining([
      "near-eye-upper","far-eye-upper","brow-near-fibres",
      "brow-far-fibres","iris-near","iris-far",
      "nose-alar-near","nose-alar-far","lip-top","lip-bottom",
      "lip-opening","lip-grain","near-eye-lower","far-eye-lower",
    ]));
    expect(made.marks.length).toBeGreaterThan(300);
    expect(made.marks.length).toBeLessThan(14000);
    expect(made.marks.every(m=>m.alpha>0&&m.alpha<=.57&&m.width<1&&
      [m.x,m.y,m.endX,m.endY,m.controlX,m.controlY].every(Number.isFinite)))
      .toBe(true);
    expect(made.marks.every(m=>/^#[0-9a-f]{6}$/.test(m.color))).toBe(true);
    expect(createPencilPortraitFeatureMarks(input,mapped,55)).toEqual(made);
    expect(createPencilPortraitFeatureMarks(input,mapped,56).marks)
      .not.toEqual(made.marks);
  });
  it("protects bright photographed iris glints instead of painting over them",()=>{
    const clean=photo();
    const guides=mapCC0WomanPortraitFeatures(layout);
    const untreated=createPencilPortraitFeatureMarks(clean,guides,55);
    const glint=photo();
    const [cx,cy]=guides.eyeNearCenter;
    for(let y=Math.floor(cy)-9;y<=Math.ceil(cy)+9;y++)
      for(let x=Math.floor(cx)-9;x<=Math.ceil(cx)+9;x++){
        const k=4*(glint.width*y+x);
        glint.data[k]=255;glint.data[k+1]=255;glint.data[k+2]=255;
      }
    const reserved=createPencilPortraitFeatureMarks(glint,guides,55);
    expect(untreated.featureCounts["iris-near"]).toBeGreaterThan(0);
    expect(reserved.highlightReserves).toBeGreaterThan(0);
    expect(reserved.featureCounts["iris-near"]??0)
      .toBeLessThan(untreated.featureCounts["iris-near"]);
    expect(createPencilPhotoStudy(glint,{seed:55},guides)
      .portraitHighlightReserves).toBe(reserved.highlightReserves);
  });
  it("rejects malformed source pixels and invalid observed guides before painting",()=>{
    const guides=mapCC0WomanPortraitFeatures(layout);
    expect(()=>createPencilPortraitFeatureMarks({
      width:0,height:0,data:new Uint8ClampedArray(0),
    },guides)).toThrow(RangeError);
    expect(()=>createPencilPortraitFeatureMarks(photo(),{
      ...guides,eyeNearCenter:[NaN,22],
    })).toThrow(RangeError);
  });
  it("applies features ONLY when matching photo guides are explicitly supplied",()=>{
    const input=photo(104,72);
    const bare=createPencilPhotoStudy(input,{seed:204,density:1});
    const guide=mapCC0WomanPortraitFeatures({
      ...layout,width:104,height:72,
    });
    const enhanced=createPencilPhotoStudy(input,{seed:204,density:1},guide);
    expect(bare.portraitFeatures).toBeUndefined();
    expect(enhanced.portraitFeatures).toBeDefined();
    expect(enhanced.strokes.length).toBeGreaterThan(bare.strokes.length);
    expect(enhanced.strokes.every((m,i,a)=>i===0||a[i-1].pass<=m.pass))
      .toBe(true);
    expect(enhanced.strokes.length).toBeLessThanOrEqual(36000);
    // Source-derived optic pixels must not morph because of a different
    // person's eye landmarks. Guides only add physically drawn marks.
    expect(enhanced.pigment).toEqual(bare.pigment);
  });
});
