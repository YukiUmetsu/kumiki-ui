import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { WatercolourCraftDetails, watercolourCraftMarks } from "../src/video/watercolour-craft-detail";
import { WatercolourMasterStudyPage, watercolourStudySpec } from "../src/video/watercolour-master-studies";
import { compileFilm } from "../registry/video/film-document";
import { loadFilmSlots } from "../src/film/film-slots";
import artOnly from "../examples/film/watercolour-master-studies-art-only.film.json";

describe("WM6 observational watercolor detail, not random surface noise",()=>{
  for(const subject of ["botanical","estuary","courtyard"] as const){
    it(subject+" is repeatable, bounded and responds to an actual detail level",()=>{
      const full=watercolourCraftMarks(subject,83,1);
      const half=watercolourCraftMarks(subject,83,.4);
      expect(full.length).toBeGreaterThan(90);
      expect(full.length).toBeLessThan(1000);
      expect(half.length).toBeLessThan(full.length);
      expect(watercolourCraftMarks(subject,83,1)).toEqual(full);
      expect(watercolourCraftMarks(subject,84,1)).not.toEqual(full);
      expect(watercolourCraftMarks(subject,83,0)).toEqual([]);
      expect(full.every(x=>!x.path.includes("NaN")&&!x.path.includes("Infinity")
        &&/^M[-\d.]+ [-\d.]+ /.test(x.path)
        &&x.opacity>0&&x.opacity<=1&&x.strokeWidth>0
        &&x.firstFrame>=0&&x.firstFrame<420)).toBe(true);
    });
  }

  it("puts botanical venation on real, jointly animated stems and complex seedheads",()=>{
    const marks=watercolourCraftMarks("botanical",83);
    expect(marks.filter(x=>x.kind==="vein").length).toBeGreaterThan(160);
    expect(marks.filter(x=>x.kind==="seed").length).toBeGreaterThan(50);
    expect(marks.filter(x=>x.kind==="flower").length).toBeGreaterThan(40);
    expect(marks.filter(x=>x.kind==="grass").length).toBeGreaterThan(20);
    expect(marks.every(x=>x.plantIndex!==undefined&&x.plantX!==undefined)).toBe(true);
    const early=renderToStaticMarkup(
      <WatercolourCraftDetails study="botanical" seed={83} frame={180}/>);
    const late=renderToStaticMarkup(
      <WatercolourCraftDetails study="botanical" seed={83} frame={355}/>);
    expect(early).not.toEqual(late);
    expect(early).toContain('data-km-craft-kind="vein"');
    expect(late).toContain("rotate(");
  });

  it("uses attached secondary light filaments and curved nonparallel surface current",()=>{
    const marks=watercolourCraftMarks("estuary",83,1);
    expect(marks.filter(x=>x.kind==="reflection").length).toBeGreaterThan(30);
    expect(marks.filter(x=>x.kind==="current").length).toBeGreaterThan(50);
    expect(marks.some(x=>x.path.includes(" q")&&x.stroke==="#FDF6DD")).toBe(true);
    const d=marks.filter(x=>x.kind==="current").map(x=>x.path);
    expect(new Set(d).size).toBe(d.length);
    expect(new Set(marks.map(x=>x.stroke)).size).toBeGreaterThan(4);
  });

  it("preserves architectural window openings and varies perspective marks",()=>{
    const marks=watercolourCraftMarks("courtyard",83,1);
    expect(marks.filter(x=>x.kind==="slate").length).toBeGreaterThan(12);
    expect(marks.filter(x=>x.kind==="masonry").length).toBeGreaterThan(55);
    expect(marks.filter(x=>x.kind==="wood").length).toBeGreaterThan(25);
    for(const m of marks.filter(x=>x.kind==="masonry")){
      const match=/^M([-\d.]+) ([-\d.]+) /.exec(m.path);
      expect(match).not.toBeNull();
      const x=Number(match![1]),y=Number(match![2]);
      for(let row=0;row<2;row++)for(let col=0;col<3;col++){
        const wx=525+col*108,wy=329+row*73;
        expect(x>=wx-5&&x<=wx+47&&y>=wy-5&&y<=wy+42).toBe(false);
      }
    }
  });

  it("rejects unbounded detail, out-of-range paper seeds and unsupported subject",()=>{
    for(const bad of [-1,.000/0,1.1,Infinity,NaN])
      expect(()=>watercolourCraftMarks("botanical",83,bad)).toThrow(RangeError);
    expect(()=>watercolourCraftMarks("estuary",-1)).toThrow(RangeError);
    expect(()=>watercolourCraftMarks("courtyard",2147483648)).toThrow(RangeError);
    expect(()=>watercolourCraftMarks("invalid" as "courtyard",83)).toThrow(RangeError);
  });

  it("can disable only the craft detail without disabling physical watercolor",()=>{
    for(const output of ["landscape","portrait"] as const){
      const spec=watercolourStudySpec("botanical",output);
      const fine=renderToStaticMarkup(<WatercolourMasterStudyPage
        study="botanical" spec={spec} frame={335} craftDetail={1} artOnly/>);
      const simple=renderToStaticMarkup(<WatercolourMasterStudyPage
        study="botanical" spec={spec} frame={335} craftDetail={0} artOnly/>);
      expect(fine).toContain('data-km-craft-detail="1"');
      expect(simple).toContain('data-km-craft-detail="0"');
      expect(fine).toContain('data-km-craft-kind="vein"');
      expect(simple).not.toContain('data-km-craft-kind="vein"');
      expect(simple).toContain('data-km-subject-pigment=""');
      expect(simple).toContain('data-km-wet-pigment-field=""');
    }
  });

  it("keeps the original portable film and accepts bounded craft controls",async()=>{
    for(const outputId of ["landscape","portrait"] as const){
      const result=compileFilm(artOnly,{outputId});
      expect(result.ok).toBe(true);
      if(!result.ok)continue;
      const render=await loadFilmSlots(result.film);
      const ctx={frame:355,fps:{num:30,den:1},durationFrames:420,
        width:result.film.width,height:result.film.height,reducedMotion:false};
      const a=renderToStaticMarkup(<>{render({slot:"watercolour-master-study",
        label:"craft",props:{study:"estuary",artOnly:true,craftDetail:.8}},ctx)}</>);
      expect(a).toContain('data-km-craft-detail="0.8"');
      expect(a).toContain('data-km-craft-kind="reflection"');
      expect(()=>render({slot:"watercolour-master-study",label:"bad",
        props:{study:"estuary",craftDetail:1.1}},ctx)).toThrow(RangeError);
    }
  });
});
