import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PencilDrawing } from "../registry/video/colored-pencil-react";
import { createPencilMaterialRegion } from "../registry/video/colored-pencil-materials";
import { inspectPencilDrawing } from "../registry/video/colored-pencil";
import {
  isPencilCraftFinish,pencilCraftKinds,pencilGrainTile,pencilMicroDeposit,
} from "../registry/video/colored-pencil-craft";
import { pencilCharacterScene } from "../src/video/colored-pencil-character-rebuild";
import { pencilObjectStudyDrawing } from "../src/video/colored-pencil-object-studies";
import { pencilLivingStudyDrawing } from "../src/video/colored-pencil-living-studies";

const drawing=()=>{
  const region=createPencilMaterialRegion({
    id:"original-rose-petal",
    surface:"petal",
    path:"M18 110 C-4 68 34 7 94 25 Q145 47 158 95 Q100 163 18 110 Z",
    bounds:[0,5,162,160],
    palette:["#BA4967","#6A2449","#F6B0B2"],
    seed:732,startFrame:40,durationFrames:180,
    craft:true,
  });
  return {version:1 as const,seed:732,width:420,height:280,
    paper:"#FAF4E8",paperTooth:.78,regions:[region]};
};

describe("ArtCraft high-fidelity medium deposition",()=>{
  it("rejects malformed craftsmanship and preserves the old flat pipeline when omitted",()=>{
    const base=drawing();
    expect(inspectPencilDrawing(base)).toEqual([]);
    expect(isPencilCraftFinish(base.regions[0].craft)).toBe(true);
    expect(pencilCraftKinds).toContain("fur");
    const bad={...base,regions:[{...base.regions[0],craft:{
      kind:"fur" as const,light:2,burnish:.8,tooth:.7,
    }}]};
    expect(inspectPencilDrawing(bad)).toContainEqual(
      expect.stringMatching(/craft/));
    expect(isPencilCraftFinish({kind:"fur",light:NaN,burnish:1,tooth:.5})).toBe(false);
    const legacy=createPencilMaterialRegion({
      id:"legacy",surface:"fur",path:"M0 0 H80 V80 Z",
      bounds:[0,0,80,80],palette:["#A7654E","#60434C","#EDBF92"],
      seed:12,startFrame:20,durationFrames:160,
    });
    expect(legacy.craft).toBeUndefined();
    const rendered=renderToStaticMarkup(<PencilDrawing
      drawing={{...base,regions:[legacy]}} frame={300}/>);
    expect(rendered).not.toContain("data-km-pencil-craft-base");
    expect(rendered).not.toContain("data-km-pencil-micro");
    expect(rendered).toContain('data-km-pencil-underpaint=""');
  });

  it("produces seeded, boundable tooth grain and three independent micro pigment families",()=>{
    const spec=drawing();
    const profile=spec.regions[0].craft!;
    const dots=pencilGrainTile(731,850);
    expect(dots).toEqual(pencilGrainTile(731,850));
    expect(dots).toHaveLength(850);
    expect(dots.some(d=>d.r<.25)).toBe(true);
    expect(dots.every(d=>d.x>=0&&d.y>=0&&d.x<64&&d.y<64)).toBe(true);
    expect(()=>pencilGrainTile(1,1200)).toThrow(RangeError);
    const marks=pencilMicroDeposit(spec.regions[0],profile,123);
    expect(marks).toEqual(pencilMicroDeposit(spec.regions[0],profile,123));
    expect(marks).toHaveLength(3);
    expect(marks.every(m=>m.path.startsWith("M")&&m.path.includes(" Q"))).toBe(true);
    expect(marks.reduce((n,g)=>n+g.count,0)).toBeGreaterThan(600);
    expect(marks.reduce((n,g)=>n+g.count,0)).toBeLessThanOrEqual(2100);
    expect(marks.every(m=>m.opacity<.5&&m.width<.8)).toBe(true);
    expect(marks.flatMap(m=>[m.path]).every(p=>!p.includes("NaN")&&!p.includes("Infinity")))
      .toBe(true);
    expect(pencilMicroDeposit(spec.regions[0],profile,124)).not.toEqual(marks);
    expect(()=>pencilMicroDeposit(spec.regions[0],profile,-1)).toThrow(RangeError);
  });

  it("adds only explicit source-free dry pencil mass, never changing legacy marks",()=>{
    const spec=drawing(),region=spec.regions[0],craft=region.craft!;
    const baseline=pencilMicroDeposit(region,craft,123);
    const zero=pencilMicroDeposit(region,{...craft,pigmentDensity:0},123);
    expect(zero).toEqual(baseline);
    const expanded=pencilMicroDeposit(region,{
      ...craft,pigmentDensity:.8,
    },123);
    expect(expanded.length).toBe(3);
    expect(expanded.reduce((n,g)=>n+g.count,0))
      .toBeGreaterThan(baseline.reduce((n,g)=>n+g.count,0)*2);
    expect(expanded.reduce((n,g)=>n+g.count,0))
      .toBeLessThanOrEqual(5500);
    expect(expanded.every(g=>g.path.startsWith("M")&&
      !g.path.includes("NaN"))).toBe(true);
    expect(pencilMicroDeposit(region,{
      ...craft,pigmentDensity:.8,
    },123)).toEqual(expanded);
    expect(isPencilCraftFinish({...craft,pigmentDensity:.8})).toBe(true);
    expect(isPencilCraftFinish({...craft,pigmentDensity:1.1})).toBe(false);
    expect(isPencilCraftFinish({...craft,pigmentDensity:NaN})).toBe(false);
    expect(()=>pencilMicroDeposit(region,{
      ...craft,pigmentDensity:-.1,
    },123)).toThrow(RangeError);
    const fox=pencilLivingStudyDrawing({subject:"fox",aspect:"landscape"});
    const head=fox.regions.find(r=>r.id==="head-main")!;
    expect(head.craft?.pigmentDensity).toBeGreaterThan(.7);
    expect(head.opaqueSupport).toBe(true);
    const human=pencilLivingStudyDrawing({subject:"portrait",aspect:"landscape"});
    expect(human.regions.every(r=>r.craft?.pigmentDensity===undefined)).toBe(true);
  });
  it("renders a volumetric layer and a dry tooth instead of a uniform matte",()=>{
    const spec=drawing();
    const html=(frame:number,reducedMotion=false)=>renderToStaticMarkup(
      <PencilDrawing drawing={spec} frame={frame} reducedMotion={reducedMotion}/>);
    const start=html(0),final=html(330);
    expect(start).not.toContain('data-km-pencil-craft-base=""');
    expect(start).not.toContain('data-km-pencil-support="original-rose-petal"');
    expect(final).toContain('data-km-pencil-craft-base=""');
    expect(final).toContain('data-km-pencil-support="original-rose-petal"');
    expect(final).toContain('data-km-pencil-micro=""');
    expect(final).toContain("linearGradient");
    expect(final).toContain("craft-grain");
    expect(final).toContain("craft-mask-0");
    expect(final).toContain("data-km-craft-group");
    expect(final).not.toContain('data-km-pencil-underpaint=""');
    expect(html(330)).toBe(final);
    expect(html(0,true)).toContain('data-km-pencil-craft-base=""');
  });

  it("enables the improved medium for original animals, human face, scenery and objects",()=>{
    for(const aspect of ["landscape","portrait"] as const){
      for(const study of ["portrait","fox","valley"] as const){
        const d=pencilLivingStudyDrawing({subject:study,aspect});
        expect(inspectPencilDrawing(d)).toEqual([]);
        expect(d.regions.filter(r=>r.opaqueSupport).every(r=>r.craft!==undefined))
          .toBe(true);
      }
      const rose=pencilObjectStudyDrawing({subject:"rose",aspect});
      expect(rose.regions.some(r=>r.id==="heart"&&r.craft?.kind==="general")).toBe(true);
      const glass=pencilObjectStudyDrawing({subject:"glass",aspect});
      expect(glass.regions.find(r=>r.id==="pitcher")!.craft).toBeUndefined();
      const scene=pencilCharacterScene(aspect);
      expect(scene.actors!.every(a=>a.parts.every(p=>p.region.craft))).toBe(true);
      expect(scene.actors![0].parts.find(p=>p.id==="eye")!.region.craft?.kind).toBe("ocular");
      expect(scene.actors![1].parts.find(p=>p.id==="near-wing")!.region.craft?.kind)
        .toBe("feather");
    }
  });
});
