import {describe,expect,it} from "vitest";
import {
  NEW_CHARACTER_01_ID,newCharacterHeadStageOne,
  newHeadCranialTonalVolume,
} from "../src/video/colored-pencil-first-character";
import {pencilLivingStudyDrawing} from "../src/video/colored-pencil-living-studies";

describe("ArtCraft new human #01: physically layered cranial volume (unapproved study)",()=>{
  it("draws five distinguishable values and three transparent short crosshatch passes",()=>{
    const head=newCharacterHeadStageOne(291);
    expect(head).toHaveLength(1);
    expect(head[0].id).toBe(NEW_CHARACTER_01_ID);
    const strokes=head[0].details!.filter(t=>t.id?.startsWith("newhead-cranium-"));
    expect(strokes).toHaveLength(15);
    for(const name of ["highlight","light","halftone",
      "core-shadow","reflected-light"]){
      const value=strokes.filter(t=>t.id?.startsWith("newhead-cranium-"+name+"-"));
      expect(value).toHaveLength(3);
      expect(value.map(t=>t.color).every(c=>/^#[0-9a-f]{6}$/i.test(c))).toBe(true);
      expect(value.every(t=>(t.opacity??0)>0&&(t.opacity??0)<.54&&
        t.width>.3&&t.width<.8&&t.path.length>1000&&
        (t.path.match(/M/g)??[]).length>80)).toBe(true);
    }
    expect(strokes.reduce((sum,t)=>sum+(t.path.match(/M/g)??[]).length,0))
      .toBeGreaterThan(2000);
    expect(strokes.every(t=>!t.path.includes("NaN")&&!t.path.includes("Infinity")))
      .toBe(true);
    expect(strokes.every(t=>t.startFrame>=173&&t.startFrame<=210)).toBe(true);
  },15000);
  it("preserves original cranium, ANAT1 and morphology when volume A/B is disabled",()=>{
    const original=newCharacterHeadStageOne(291,false);
    const woven=newCharacterHeadStageOne(291,true);
    expect(original).toHaveLength(1);
    expect(woven).toHaveLength(1);
    for(const key of ["id","path","bounds","material","direction","flow"] as const)
      expect(woven[0][key]).toEqual(original[0][key]);
    expect(woven[0].details!.filter(t=>!t.id?.startsWith("newhead-cranium-")))
      .toEqual(original[0].details);
    expect(original[0].details!.filter(t=>t.id?.startsWith("newhead-cranium-")))
      .toHaveLength(0);
    expect(woven[0].details!.filter(t=>t.id?.startsWith("newhead-cranium-")))
      .toHaveLength(15);
    expect(woven[0].details!.some(t=>t.id?.includes("eye-iris")||
      t.id?.includes("lip-color")||t.id?.includes("hair-strand")))
      .toBe(false);
  },15000);
  it("makes different real dry contact marks per valid seed while rejecting invalid material",()=>{
    const bounds=[25,30,220,340] as const;
    const one=newHeadCranialTonalVolume(bounds,271);
    const again=newHeadCranialTonalVolume(bounds,271);
    expect(again).toEqual(one);
    const another=newHeadCranialTonalVolume(bounds,272);
    expect(another.map(t=>t.id)).toEqual(one.map(t=>t.id));
    expect(another[0].path).not.toEqual(one[0].path);
    expect(()=>newHeadCranialTonalVolume([20,30,0,300],271))
      .toThrow(RangeError);
    expect(()=>newHeadCranialTonalVolume([20,30,200,Number.NaN],271))
      .toThrow(RangeError);
    expect(()=>newCharacterHeadStageOne(271,"yes" as never))
      .toThrow(RangeError);
  },15000);
  it("keeps original CP-F1 single head in both aspect ratios with all film geometry intact",()=>{
    const options={subject:"portrait" as const,aspect:"landscape" as const,seed:291};
    const before=pencilLivingStudyDrawing({...options,headVolumeWeave:false});
    const after=pencilLivingStudyDrawing({...options,headVolumeWeave:true});
    expect(after.foundation?.version).toBe(before.foundation?.version);
    expect(after.regions.map(r=>r.id)).toEqual([NEW_CHARACTER_01_ID]);
    expect(before.regions.map(r=>r.id)).toEqual(after.regions.map(r=>r.id));
    expect(before.regions[0].path).toBe(after.regions[0].path);
    expect(after.regions[0].details!.length).toBe(before.regions[0].details!.length+15);
    const tall=pencilLivingStudyDrawing({...options,aspect:"portrait",headVolumeWeave:true});
    expect(tall.width).toBe(540);expect(tall.height).toBe(960);
    expect(tall.regions[0].details!.filter(t=>t.id?.startsWith("newhead-cranium-")))
      .toHaveLength(15);
    expect(()=>pencilLivingStudyDrawing({...options,headVolumeWeave:1 as never}))
      .toThrow(RangeError);
  },20000);
});
