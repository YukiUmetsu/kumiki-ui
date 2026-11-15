import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PencilDrawing } from "../registry/video/colored-pencil-react";
import { inspectPencilDrawing, hatchPencilRegion } from "../registry/video/colored-pencil";
import {
  PENCIL_LIVING_STUDIES, flowBundles, pencilLivingStudyDrawing,
} from "../src/video/colored-pencil-living-studies";

describe("ArtCraft source-led coloured-pencil living subjects",()=>{
  it("generates independent, constrained human, animal and landscape studies in 16:9 and 9:16",()=>{
    expect(PENCIL_LIVING_STUDIES).toEqual(["portrait","fox","valley"]);
    for(const subject of PENCIL_LIVING_STUDIES){
      for(const aspect of ["landscape","portrait"] as const){
        const drawing=pencilLivingStudyDrawing({subject,aspect});
        expect(inspectPencilDrawing(drawing)).toEqual([]);
        expect(drawing.regions.length).toBeGreaterThanOrEqual(16);
        expect(drawing.regions.length).toBeLessThanOrEqual(24);
        expect(drawing.width).toBe(aspect==="landscape"?960:540);
        expect(drawing.height).toBe(aspect==="landscape"?540:960);
        expect(drawing.regions.every(r=>r.opaqueSupport!==undefined)).toBe(true);
        expect(drawing.regions.every(r=>r.layers.length===3)).toBe(true);
        expect(drawing.regions.every(r=>r.transform?.startsWith("translate("))).toBe(true);
        expect(pencilLivingStudyDrawing({subject,aspect})).toEqual(drawing);
        const seeded=pencilLivingStudyDrawing({subject,aspect,seed:512});
        expect(inspectPencilDrawing(seeded)).toEqual([]);
        expect(seeded.regions[0].layers[0].seed).not.toBe(drawing.regions[0].layers[0].seed);
        const base=drawing.regions[0];
        expect(hatchPencilRegion(base,base.layers[0]))
          .toEqual(hatchPencilRegion(base,base.layers[0]));
      }
    }
  });

  it("constructs an original face with independent eyes, brow, bridge, jaw, lips and layered hair",()=>{
    const drawing=pencilLivingStudyDrawing({subject:"portrait",aspect:"landscape"});
    const parts=new Map(drawing.regions.map(region=>[region.id,region]));
    const must=[
      "hair-back","coat-back","neck","ear","face-main","temple-light",
      "cheek-light","eye-white-far","iris-far","pupil-far","eye-white-near","iris-near","pupil-near",
      "brows","nose-bridge","lip-upper","lip-lower","hair-crown",
      "hair-lock-left","hair-lock-right","collar-left","collar-right",
    ];
    expect([...parts.keys()]).toEqual(must);
    expect(parts.get("hair-back")!.details!.length).toBeGreaterThan(3);
    expect(parts.get("hair-crown")!.details!.length).toBeGreaterThan(3);
    expect(parts.get("face-main")!.opaqueSupport).toBe(true);
    expect(parts.get("face-main")!.clipDetails).toBe(true);
    expect(parts.get("iris-near")!.opaqueSupport).toBe(false);
    expect(parts.get("pupil-near")!.opaqueSupport).toBe(true);
    expect(parts.get("pupil-far")!.opaqueSupport).toBe(true);
    expect(parts.get("temple-light")!.opaqueSupport).toBe(false);
    expect(parts.get("cheek-light")!.opaqueSupport).toBe(false);
    // Source-led face construction: narrow natural apertures, layered sockets,
    // cartilage/naris detail, and short directional brow hairs, not doll eyes.
    for(const eye of ["eye-white-far","eye-white-near"]){
      const r=parts.get(eye)!;
      expect(r.bounds[3]).toBeLessThanOrEqual(30);
      expect(r.details!.length).toBeGreaterThanOrEqual(3);
      expect(r.path.match(/C|Q/g)?.length).toBeGreaterThanOrEqual(2);
    }
    expect(parts.get("face-main")!.details!.length).toBeGreaterThanOrEqual(8);
    expect(parts.get("brows")!.details!.length).toBeGreaterThanOrEqual(3);
    expect(parts.get("nose-bridge")!.details!.length).toBeGreaterThanOrEqual(4);
    expect(parts.get("lip-upper")!.details!.length).toBeGreaterThanOrEqual(2);
    expect(parts.get("eye-white-near")!.bounds[2])
      .toBeGreaterThan(parts.get("eye-white-far")!.bounds[2]);
    expect(parts.get("lip-upper")!.path).not.toBe(parts.get("lip-lower")!.path);
    for(const id of ["hair-back","hair-crown","hair-lock-left","hair-lock-right"]){
      const r=parts.get(id)!;
      expect(r.details!.some(x=>(x.path.match(/ Q/g)??[]).length>=15)).toBe(true);
    }
  });

  it("constructs a fox with distinct ear inserts, ruff, four facial feature masses and rooted fur",()=>{
    const drawing=pencilLivingStudyDrawing({subject:"fox",aspect:"portrait"});
    const parts=new Map(drawing.regions.map(region=>[region.id,region]));
    for(const id of [
      "tail-back","body","rear-leg","foreleg-left","foreleg-right",
      "chest","neck-ruff","head-main","ear-far","ear-far-inner",
      "ear-near","ear-near-inner","mask","muzzle","eye-far","eye-near",
      "nose","whisker-roots","tail-tip",
    ])expect(parts.has(id)).toBe(true);
    // The old broad continuous raccoon band must resolve into socket shadows.
    expect((parts.get("mask")!.path.match(/M/g)??[]).length).toBe(2);
    expect(parts.get("head-main")!.details!.length).toBeGreaterThanOrEqual(4);
    for(const eye of ["eye-far","eye-near"]){
      expect(parts.get(eye)!.details!.length).toBeGreaterThanOrEqual(3);
      expect(parts.get(eye)!.bounds[3]).toBeLessThanOrEqual(26);
    }
    expect(parts.get("muzzle")!.details!.length).toBeGreaterThanOrEqual(3);
    expect(parts.get("nose")!.details!.length).toBeGreaterThanOrEqual(3);
    expect(parts.get("chest")!.details!.length).toBe(2);
    expect(parts.get("ground-shadow")!.opaqueSupport).toBe(false);
    expect(parts.get("muzzle")!.opaqueSupport).toBe(true);
    const whisker=parts.get("whisker-roots")!;
    expect(whisker.clipDetails).toBe(false);
    expect(whisker.opaqueSupport).toBe(true);
    expect(whisker.details!.slice(0,2).reduce((n,t)=>
      n+(t.path.match(/M/g)??[]).length,0)).toBe(6);
  });

  it("builds an asymmetrical fox rostrum and a rooted, short-fibre cheek instead of round mask stickers",()=>{
    const regions=pencilLivingStudyDrawing({subject:"fox",aspect:"landscape"}).regions;
    const parts=new Map(regions.map(region=>[region.id,region]));
    const nose=parts.get("nose")!,near=parts.get("eye-near")!;
    const far=parts.get("eye-far")!,muzzle=parts.get("muzzle")!;
    const bridge=parts.get("rostrum-bridge")!,cheek=parts.get("cheek-ruff")!;
    expect(regions.length).toBeLessThanOrEqual(24);
    expect(nose.bounds[0]+nose.bounds[2]).toBeLessThan(far.bounds[0]);
    expect(far.bounds[0]+far.bounds[2]).toBeLessThan(near.bounds[0]);
    expect(near.bounds[2]).toBeGreaterThan(far.bounds[2]*1.20);
    expect(muzzle.bounds[2]).toBeGreaterThan(155);
    expect(muzzle.bounds[3]).toBeLessThan(80);
    expect(bridge.opaqueSupport).toBe(false); // dry glaze, no paper-backed sticker
    expect(cheek.opaqueSupport).toBe(true);
    const nearEar=parts.get("ear-near")!,farEar=parts.get("ear-far")!;
    expect(nearEar.bounds[3]).toBeLessThan(107);
    expect(farEar.bounds[3]).toBeLessThan(100);
    for(const region of regions.filter(r=>r.craft?.kind==="fur")){
      expect(region.layers.every(layer=>layer.texture==="fiber")).toBe(true);
      expect(region.layers.every(layer=>layer.tipWidth<1.55)).toBe(true);
    }
    expect(parts.get("mask")!.bounds[3]).toBeLessThanOrEqual(46);
    for(const id of ["head-main","muzzle","cheek-ruff"]){
      const region=parts.get(id)!;
      const fibres=region.details!.filter(x=>x.id?.startsWith("fibre-"));
      expect(fibres.length).toBeGreaterThanOrEqual(6);
      for(const trace of fibres){
        const strokes=trace.path.match(/M/g)??[];
        expect(strokes.length).toBeGreaterThanOrEqual(12);
        expect(strokes.length).toBeLessThanOrEqual(36);
        expect(trace.path).toMatch(/ Q/);
        expect(trace.path).not.toMatch(/NaN|Infinity/);
        expect(trace.width).toBeLessThanOrEqual(.65);
      }
    }
    expect(parts.get("whisker-roots")!.clipDetails).toBe(false);
  });

  it("separates distant from close pines, reflected water, river rock and bank foliage",()=>{
    const drawing=pencilLivingStudyDrawing({subject:"valley",aspect:"landscape"});
    const parts=new Map(drawing.regions.map(region=>[region.id,region]));
    const near=parts.get("pine-right-a")!,far=parts.get("pine-far-a")!;
    expect(near.bounds[3]).toBeGreaterThan(far.bounds[3]*2);
    expect(near.details![0].path.match(/M/g)!.length).toBe(15);
    expect(far.details![0].path.match(/M/g)!.length).toBe(15);
    expect(parts.get("mountain-far")!.layers[0].color).toBe("#9FA9AD");
    expect(parts.get("river")!.layers[2].texture).toBe("hatch");
    expect(parts.get("distant-forest")!.layers[1].texture).toBe("fiber");
    expect(parts.get("left-bank")!.details!.length).toBe(2);
    expect(parts.has("river-rock-left")&&parts.has("river-rock-right")).toBe(true);
  });

  it("generates bounded curved contour-aligned marks, never drifting random particles",()=>{
    const input=[[120,40,140,180,105,105,26,18] as const];
    const a=flowBundles(input,431,"#AABBCC",.7,230);
    expect(a).toEqual(flowBundles(input,431,"#AABBCC",.7,230));
    expect(a).toHaveLength(1);
    expect(a[0].path.match(/M/g)).toHaveLength(26);
    expect(a[0].path.match(/ Q/g)).toHaveLength(26);
    expect(a[0].path).not.toMatch(/NaN|Infinity/);
    expect(()=>flowBundles([[0,0,0,0,0,0,0,0]],10,"#AABBCC")).toThrow(RangeError);
    expect(()=>flowBundles([[0,0,5,7,3,4,38,2]],10,"#AABBCC")).toThrow(RangeError);
    expect(()=>flowBundles(input,-1,"#AABBCC")).toThrow(RangeError);
  });

  it("renders opaque face masses without leaking paper through skin and preserves frame seeking",()=>{
    const drawing=pencilLivingStudyDrawing({subject:"portrait",aspect:"landscape"});
    const at=(frame:number)=>renderToStaticMarkup(
      <PencilDrawing drawing={drawing} frame={frame}/>);
    const final=at(310);
    expect(final).toContain('data-km-pencil-region="face-main"');
    expect(final).toContain('data-km-pencil-support="face-main"');
    expect(final).toContain('data-km-pencil-details');
    expect(final).not.toContain('data-km-pencil-support="iris-near"');
    at(50);
    expect(at(310)).toBe(final);
  });

  it("rejects malformed controls; near maximum seed remains bounded",()=>{
    const base={subject:"portrait" as const,aspect:"landscape" as const};
    expect(()=>pencilLivingStudyDrawing({...base,subject:"invalid" as "portrait"}))
      .toThrow(RangeError);
    expect(()=>pencilLivingStudyDrawing({...base,aspect:"invalid" as "landscape"}))
      .toThrow(RangeError);
    expect(()=>pencilLivingStudyDrawing({...base,seed:-1})).toThrow(RangeError);
    expect(()=>pencilLivingStudyDrawing({...base,seed:2147483647})).toThrow(RangeError);
    expect(()=>pencilLivingStudyDrawing({...base,paperTooth:1.5})).toThrow(RangeError);
    expect(()=>pencilLivingStudyDrawing({...base,pressure:1.3})).toThrow(RangeError);
    expect(inspectPencilDrawing(pencilLivingStudyDrawing({
      ...base,seed:2147483000,pressure:1.2,
    }))).toEqual([]);
  });
});
