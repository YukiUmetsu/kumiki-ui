import {describe,expect,it} from "vitest";
import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {ROSE_FRONT_VALUE_BANDS,inspectRoseFrontValueBands,roseFrontValueDetails}
  from "../src/video/colored-pencil-rose-front-value";
import {pencilObjectStudyDrawing} from "../src/video/colored-pencil-object-studies";
import {inspectPencilDrawing} from "../registry/video/colored-pencil";
import {inspectPencilFoundationDrawing} from "../registry/video/colored-pencil-foundation";
import {PencilDrawing} from "../registry/video/colored-pencil-react";

const build=(aspect:"landscape"|"portrait",enabled=false,full=false,seed=181)=>
  pencilObjectStudyDrawing({
    subject:"rose",aspect,seed,rosePhysicalFolds:true,roseFrontValueStudy:enabled,
    roseCalyxStudy:full,rosePinnateStudy:full,roseLaminaStudy:full,
    roseLipStudy:full,roseInnerWhorlStudy:full,roseMiddleCupStudy:full,
  });

describe("CP-F1 frontal rose artist-local dry optical value planes",()=>{
  it("has six different genuinely curved source axes and three pigment families per field",()=>{
    expect(inspectRoseFrontValueBands()).toEqual([]);
    expect(ROSE_FRONT_VALUE_BANDS).toHaveLength(6);
    expect(new Set(ROSE_FRONT_VALUE_BANDS.map(b=>JSON.stringify(b.axis))).size).toBe(6);
    for(const petal of ["petal-front-left","petal-front-right"] as const){
      const bands=ROSE_FRONT_VALUE_BANDS.filter(b=>b.petal===petal);
      expect(bands.map(b=>b.role)).toEqual(["fold-core","convex-belly","reflected-field"]);
      const details=roseFrontValueDetails(petal,181);
      expect(details).toHaveLength(9);
      for(const path of details){
        expect(path.path).toMatch(/^M/);
        expect(path.path).toContain(" Q");
        expect(path.path.length).toBeGreaterThan(1500);
        expect(path.path.length).toBeLessThan(12000);
        expect(path.width).toBeGreaterThan(.2);
        expect(path.opacity).toBeGreaterThan(0);
        expect(path.startFrame).toBeGreaterThanOrEqual(168);
        expect(path.startFrame+path.durationFrames).toBeLessThan(335);
      }
    }
    expect(roseFrontValueDetails("petal-front-left",181))
      .not.toEqual(roseFrontValueDetails("petal-front-right",181));
  });

  it.each(["landscape","portrait"] as const)(
    "adds only physically clipped value families, preserving every original path, region and detail at %s",aspect=>{
      const before=build(aspect);
      const after=build(aspect,true);
      expect(before.regions).toHaveLength(16);
      expect(after.regions).toHaveLength(16);
      expect(inspectPencilFoundationDrawing(after)).toEqual([]);
      for(const original of before.regions){
        const newPart=after.regions.find(r=>r.id===original.id);
        expect(newPart).toBeDefined();
        if(original.id.startsWith("petal-front-")){
          const {interiorDetails,...rest}=newPart!;
          expect(rest).toEqual(original);
          expect(interiorDetails).toHaveLength(9);
          expect(interiorDetails?.every(t=>t.id?.startsWith("rv-"))).toBe(true);
        }else expect(newPart).toEqual(original);
      }
      expect(before.regions.every(r=>r.interiorDetails===undefined)).toBe(true);
    });

  it("composes with all 42 inherited flora regions without affecting old material seeds",()=>{
    const before=build("landscape",false,true);
    const after=build("landscape",true,true);
    expect(before.regions).toHaveLength(42);
    expect(after.regions).toHaveLength(42);
    expect(inspectPencilFoundationDrawing(after)).toEqual([]);
    for(const original of before.regions){
      const next=after.regions.find(r=>r.id===original.id)!;
      if(original.id.startsWith("petal-front-")){
        const {interiorDetails,...oldBytes}=next;
        expect(oldBytes).toEqual(original);
        expect(interiorDetails).toHaveLength(9);
      }else expect(next).toEqual(original);
    }
  });

  it("is deterministic for extreme seeds and enforces physical-fold prerequisite",()=>{
    for(const seed of [0,181,2147483000])
      expect(build("portrait",true,true,seed)).toEqual(build("portrait",true,true,seed));
    expect(()=>pencilObjectStudyDrawing({subject:"rose",aspect:"landscape",
      roseFrontValueStudy:true})).toThrow(/physical|folded/i);
    expect(()=>pencilObjectStudyDrawing({subject:"rose",aspect:"portrait",
      rosePhysicalFolds:true,roseFrontValueStudy:"yes" as never})).toThrow(RangeError);
    for(const subject of ["glass","architecture","fabric"] as const){
      const p={subject,aspect:"portrait" as const};
      expect(pencilObjectStudyDrawing({...p,roseFrontValueStudy:true}))
        .toEqual(pencilObjectStudyDrawing(p));
    }
    expect(()=>roseFrontValueDetails("not-a-petal" as never,181)).toThrow(RangeError);
    expect(()=>roseFrontValueDetails("petal-front-left",-1)).toThrow(RangeError);
  });

  it("validates bounds of reusable contained detail layer and renders below pre-existing edge marks",()=>{
    const drawing=build("landscape",true);
    expect(inspectPencilDrawing(drawing)).toEqual([]);
    const region=drawing.regions.find(r=>r.id==="petal-front-right")!;
    const malformed={
      ...drawing,regions:drawing.regions.map(r=>r.id===region.id?
        {...r,interiorDetails:[{...r.interiorDetails![0],color:"#YELLOW"}]}:r),
    };
    expect(inspectPencilDrawing(malformed).join(" "))
      .toContain("interiorDetails");
    const excessive={
      ...drawing,regions:drawing.regions.map(r=>r.id===region.id?
        {...r,interiorDetails:Array(37).fill(r.interiorDetails![0])}:r),
    };
    expect(inspectPencilDrawing(excessive).join(" ")).toContain("interiorDetails");
    const html=renderToStaticMarkup(createElement(PencilDrawing,{drawing,frame:335}));
    expect(html).toContain('data-km-pencil-interior-details=""');
    expect(html).toContain('data-km-pencil-trace="rv-right-fold-cool"');
    expect(html).toContain('clip-path="url(');
    const newLocal=html.indexOf('data-km-pencil-interior-details=""');
    expect(newLocal).toBeGreaterThan(0);
    // The first graphite in the whole SVG belongs to the stem. Verify
    // this petal's NEXT graphite layer follows its contained optical layer.
    expect(html.indexOf('data-km-graphite=""',newLocal))
      .toBeGreaterThan(newLocal);
    const pre=renderToStaticMarkup(createElement(PencilDrawing,{drawing:build("landscape"),frame:335}));
    expect(pre).not.toContain('data-km-pencil-interior-details=""');
    expect(pre).not.toContain('rv-right-fold-cool');
  });
});
