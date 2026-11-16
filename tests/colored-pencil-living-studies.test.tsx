import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PencilDrawing } from "../registry/video/colored-pencil-react";
import {
  NEW_CHARACTER_01_ID, NEW_CHARACTER_01_STAGE,
  NEW_CHARACTER_01_INSPECTION_KEYS,
  newCharacterHeadInspectionAnchors, newCharacterHeadStageOne,
} from "../src/video/colored-pencil-first-character";
import { inspectPencilDrawing, hatchPencilRegion } from "../registry/video/colored-pencil";
import {
  PENCIL_LIVING_STUDIES, flowBundles, pencilLivingStudyDrawing,
} from "../src/video/colored-pencil-living-studies";

describe("ArtCraft source-led coloured-pencil living subjects",()=>{
  it("separates a brand-new single human head from the independently finished fox and landscape",()=>{
    expect(PENCIL_LIVING_STUDIES).toEqual(["portrait","fox","valley"]);
    for(const subject of PENCIL_LIVING_STUDIES){
      for(const aspect of ["landscape","portrait"] as const){
        const drawing=pencilLivingStudyDrawing({subject,aspect});
        expect(inspectPencilDrawing(drawing)).toEqual([]);
        expect(drawing.regions.length).toBeGreaterThanOrEqual(subject==="portrait"?1:16);
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

  it("deletes the previous woman and starts exactly one NEW head outline without eyes/hair/nose/mouth",()=>{
    expect(NEW_CHARACTER_01_STAGE).toBe("head-outline");
    expect(NEW_CHARACTER_01_ID).toBe("head-silhouette-01");
    const oldWomanParts=[
      "face-main","hair-back","hair-crown","hair-lock-left",
      "eye-white-near","eye-white-far","pupil-near","iris-near",
      "nose-bridge","lip-upper","lip-lower","neck","collar-left",
    ];
    for(const aspect of ["landscape","portrait"] as const){
      const d=pencilLivingStudyDrawing({subject:"portrait",aspect,seed:291});
      expect(d.foundation?.subject).toBe("human");
      expect(d.regions).toHaveLength(1);
      expect(d.regions[0].id).toBe("head-silhouette-01");
      expect(d.foundation?.construction).toContain("stage 1 only");
      expect(d.regions[0].craft).toBeUndefined();
      expect(d.regions[0].opaqueSupport).toBe(false);
      expect(d.regions[0].clipDetails).toBe(true);
      expect(d.regions[0].layers).toHaveLength(3);
      // No generic broad crosshatch lattice: the head's value-direction
      // strokes remain independently authored from the ANAT1 bony guides.
      expect(d.regions[0].layers.every(l=>l.texture==="stipple")).toBe(true);
      expect(d.regions[0].layers.map(l=>l.spacing)).toEqual([6.1,8.3,11.5]);
      expect(d.regions[0].layers.every(l=>l.tipWidth<.6&&l.pressure<.3))
        .toBe(true);
      expect(d.regions[0].bounds[2]).toBeGreaterThan(125);
      expect(d.regions[0].bounds[3]).toBeGreaterThan(180);
      expect(d.regions[0].path.match(/C|Q/g)?.length)
        .toBeGreaterThanOrEqual(26);
      for(const id of oldWomanParts)
        expect(d.regions.some(r=>r.id===id),id).toBe(false);
      expect(inspectPencilDrawing(d)).toEqual([]);
    }
  });

  it("draws the first human skull silhouette using measured 3D mesh anchors and 3 bounded dry-pencil value fans",()=>{
    const one=newCharacterHeadStageOne(291);
    expect(one).toHaveLength(1);
    const head=one[0];
    expect(head.material).toBe("glaze");
    expect(head.details?.length).toBe(77); // 54 local + 15 ANAT1 value + 3 guide fans + 5 structural guides
    const fields=head.details!.filter(t=>t.id?.startsWith("newhead-plane-"));
    expect(fields).toHaveLength(54);
    expect(new Set(fields.map(t=>t.id)).size).toBe(54);
    expect(fields.filter(t=>t.id?.startsWith("newhead-plane-far-malar-")))
      .toHaveLength(9);
    expect(fields.filter(t=>t.id?.startsWith("newhead-plane-mandibular-")))
      .toHaveLength(9);
    for(const t of fields){
      expect(t.path).not.toMatch(/NaN|Infinity/);
      expect(t.path.length).toBeLessThan(12000);
      expect(t.path.match(/M/g)?.length).toBeGreaterThan(65);
      expect(t.path.match(/ Q/g)?.length).toBeGreaterThan(65);
      expect(t.width).toBeLessThan(.6);
      expect(t.opacity).toBeGreaterThan(.15);
      expect(t.opacity).toBeLessThan(.55);
    }

    for(let layer=0;layer<3;layer++){
      const t=head.details!.find(x=>x.id==="newhead-value-"+layer);
      expect(t).toBeDefined();
      expect((t!.path.match(/M/g)??[]).length).toBe(114);
      expect((t!.path.match(/ Q/g)??[]).length).toBe(114);
      expect(t!.path.length).toBeLessThan(12000);
      expect(t!.width).toBeLessThan(.5);
      expect(t!.opacity).toBeLessThan(.5);
    }
    for(const id of ["newhead-sagittal-guide",
      "newhead-zygomatic-guides","newhead-mandibular-hinge",
      "newhead-orbital-placement-only","newhead-cranial-vault-turn"]){
      const d=head.details?.find(x=>x.id===id);
      expect(d,id).toBeDefined();
      expect(d!.path).toContain(" Q");
    }
    expect(one).toEqual(newCharacterHeadStageOne(291));
    expect(newCharacterHeadStageOne(291)[0].details)
      .not.toEqual(newCharacterHeadStageOne(515)[0].details);
    expect(newCharacterHeadStageOne(2147483000)).toHaveLength(1);
    expect(()=>newCharacterHeadStageOne(-1)).toThrow(RangeError);
  });

  it("deposits five ANAT1 normal-driven tonal families as native, editable dry-pencil curves",()=>{
    const one=newCharacterHeadStageOne(291);
    const head=one[0];
    const valueFamilies=[
      "highlight","light","halftone","core-shadow","reflected-light",
    ] as const;
    const meshValues=head.details!.filter(trace=>
      trace.id?.startsWith("newhead-anat1-"));
    expect(meshValues).toHaveLength(15);
    expect(new Set(meshValues.map(trace=>trace.id)).size).toBe(15);
    for(const name of valueFamilies){
      const cohort=meshValues.filter(trace=>
        trace.id?.startsWith("newhead-anat1-"+name+"-"));
      expect(cohort,name).toHaveLength(3);
      for(const trace of cohort){
        expect(trace.path).not.toMatch(/NaN|Infinity/);
        expect((trace.path.match(/M/g)??[]).length).toBeGreaterThan(90);
        expect((trace.path.match(/ Q/g)??[]).length).toBeGreaterThan(90);
        expect(trace.path.length).toBeLessThan(18000);
        expect(trace.width).toBeGreaterThan(.18);
        expect(trace.width).toBeLessThan(.55);
        expect(trace.opacity).toBeGreaterThan(.12);
        expect(trace.opacity).toBeLessThan(.55);
      }
    }
    // Real native 1x/2.15x visual proof found the five equal-density
    // families too scratchy and pale. The face's dark core must receive
    // MORE shorter contacts than the highlight: graded pressure/coverage
    // is required before calling this a five-value pencil mass.
    const count=(name:string)=>meshValues
      .filter(trace=>trace.id?.startsWith("newhead-anat1-"+name+"-"))
      .reduce((sum,trace)=>sum+(trace.path.match(/M/g)?.length??0),0);
    expect(count("core-shadow")).toBeGreaterThan(count("highlight")*1.48);
    expect(count("halftone")).toBeGreaterThan(count("highlight")*1.30);
    expect(count("light")).toBeGreaterThan(count("highlight")*1.18);
    expect(count("reflected-light")).toBeGreaterThan(count("highlight")*1.10);
        // Five value families are not a single pattern recolored five times.
    const locations=valueFamilies.map(name=>{
      const trace=meshValues.find(v=>
        v.id==="newhead-anat1-"+name+"-0")!;
      const coords=[...trace.path.matchAll(/M(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g)]
        .map(m=>[Number(m[1]),Number(m[2])]);
      const x=coords.reduce((sum,p)=>sum+p[0],0)/coords.length;
      const y=coords.reduce((sum,p)=>sum+p[1],0)/coords.length;
      expect(x).toBeGreaterThanOrEqual(head.bounds[0]-8);
      expect(x).toBeLessThanOrEqual(head.bounds[0]+head.bounds[2]+8);
      expect(y).toBeGreaterThanOrEqual(head.bounds[1]-8);
      expect(y).toBeLessThanOrEqual(head.bounds[1]+head.bounds[3]+8);
      return [Math.round(x),Math.round(y)];
    });
    expect(new Set(locations.map(p=>p.join(","))).size)
      .toBeGreaterThanOrEqual(4);
    expect(one).toEqual(newCharacterHeadStageOne(291));
    expect(newCharacterHeadStageOne(291)[0].details)
      .not.toEqual(newCharacterHeadStageOne(515)[0].details);
    // Still a ONE REGION head, no facial-feature geometry.
    expect(one.map(p=>p.id)).toEqual(["head-silhouette-01"]);
  });

  it("exposes nine NEW mesh-derived head-guide points, not the former woman's portrait anchors",()=>{
    const anchors=newCharacterHeadInspectionAnchors();
    const head=newCharacterHeadStageOne(291)[0];
    expect(anchors.map(x=>x.id)).toEqual([...NEW_CHARACTER_01_INSPECTION_KEYS]);
    expect(anchors).toHaveLength(9);
    const [left,top,width,height]=head.bounds;
    for(const {point:[x,y]} of anchors){
      expect(Number.isFinite(x)&&Number.isFinite(y)).toBe(true);
      expect(x).toBeGreaterThanOrEqual(left);
      expect(x).toBeLessThanOrEqual(left+width);
      expect(y).toBeGreaterThanOrEqual(top);
      expect(y).toBeLessThanOrEqual(top+height);
    }
    expect(newCharacterHeadInspectionAnchors()).toEqual(anchors);
    // A staged, new head contains no photometric face patch or original
    // woman's opaque skin. Diagnostics are the exact same ANAT1 projection.
    expect(head.material).toBe("glaze");
  });

  it("keeps the brand-new character head in the original CP-F1 renderer with no previous woman's geometry or bitmap art",()=>{
    const d=pencilLivingStudyDrawing({subject:"portrait",aspect:"landscape",seed:291});
    const render=(frame:number)=>renderToStaticMarkup(
      <PencilDrawing drawing={d} frame={frame}/>);
    const final=render(335);
    expect(final).toContain('data-km-pencil-region="head-silhouette-01"');
    expect(final).not.toContain('data-km-pencil-support="head-silhouette-01"');
    expect(final).toContain('data-km-graphite');
    expect(final).toContain('data-km-pencil-render-method="authored-vector-pigment"');
    expect(final).toContain('data-km-pencil-photo-pixels="none"');
    expect(final).toContain('data-km-pencil-details');
    expect(final).not.toContain('data-km-pencil-region="face-main"');
    expect(final).not.toContain('data-km-pencil-region="hair-crown"');
    expect(final).not.toContain('data-km-pencil-region="eye-white-near"');
    expect(final).not.toContain("<image");
    expect(final).not.toContain("<foreignObject");
    render(52);
    expect(render(335)).toBe(final);
  });

  it("grows the fox brush tail from the rump with interleaved low-pressure distal pencil fibres",()=>{
    // The released specimen previously read as a perfectly smooth sausage
    // with a detached white end-cap. Check topology and real pigment contacts
    // separately; a passing structural gate is NOT artistic approval.
    for(const aspect of ["landscape","portrait"] as const){
      const drawing=pencilLivingStudyDrawing({subject:"fox",aspect,seed:291});
      const parts=new Map(drawing.regions.map(r=>[r.id,r]));
      const tail=parts.get("tail-back")!,tip=parts.get("tail-tip")!;
      // Delicate contour hairs are explicitly authored *outside* the pelt.
      // A material-wide clip silently erased every silhouette breakthrough.
      expect(tail.clipDetails).toBe(false);
      expect(tip.clipDetails).toBe(false);
      expect(tail.details!.some(d=>d.id?.startsWith("fringe-"))).toBe(true);
      expect(tip.details!.some(d=>d.id?.startsWith("fringe-"))).toBe(true);
      expect(tail.path.match(/C/g)?.length).toBeGreaterThan(10);
      expect(tail.path).toContain("C11 376 17 382 24 385");
      expect(tail.path).toContain("195 346 Z");
      expect(tip.path.match(/C/g)?.length).toBeGreaterThan(6);
      expect(tip.path).toContain("C48 367 46 374 49 381");
      expect(tail.details!.filter(d=>d.id?.startsWith("fibre-"))).toHaveLength(24);
      expect(tip.details!.filter(d=>d.id?.startsWith("fibre-"))).toHaveLength(15);
      const seam=tip.details!.find(d=>d.id==="tail-tip-feathered-seam");
      expect(seam?.path.match(/M/g)).toHaveLength(3);
      for(const region of [tail,tip]){
        for(const trace of region.details!){
          expect(trace.path).not.toMatch(/NaN|Infinity/);
          expect(trace.width).toBeLessThan(1);
          expect(trace.path.length).toBeLessThanOrEqual(12000);
        }
      }
      expect(pencilLivingStudyDrawing({subject:"fox",aspect,seed:291})).toEqual(drawing);
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
    expect(parts.get("chest")!.details!.length).toBeGreaterThan(12);
    expect(parts.get("neck-ruff")!.details!.length).toBeGreaterThan(9);
    for(const ear of ["ear-far-inner","ear-near-inner"]){
      const region=parts.get(ear)!;
      const roots=region.details!.filter(d=>d.id?.startsWith("fibre-"));
      expect(roots.length).toBeGreaterThanOrEqual(6);
      expect(roots.every(r=>r.path.includes(" Q"))).toBe(true);
      expect(region.opaqueSupport).toBe(true);
    }
    const tip=parts.get("tail-tip")!;
    expect(tip.bounds[0]).toBeLessThan(parts.get("tail-back")!.bounds[0]);
    expect(tip.details!.filter(d=>d.id?.startsWith("fibre-")).length)
      .toBeGreaterThanOrEqual(6);
    expect(parts.get("ground-shadow")!.opaqueSupport).toBe(false);
    expect(parts.get("muzzle")!.opaqueSupport).toBe(true);
    const whisker=parts.get("whisker-roots")!;
    expect(whisker.clipDetails).toBe(false);
    // Whiskers and follicles are marks, never an opaque floating sticker
    // painted on top of the jaw/chin plane.
    expect(whisker.opaqueSupport).toBe(false);
    expect(whisker.craft).toBeUndefined();
    expect(whisker.underpaint).toBeUndefined();
    expect(whisker.contour.opacity??1).toBeLessThanOrEqual(.10);
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
    // The older >155px requirement baked a long cartoon beak into QA.
    // A fox's tapered nasal wedge is now shorter than the cheek-head mass.
    expect(muzzle.bounds[2]).toBeGreaterThan(135);
    expect(muzzle.bounds[2]).toBeLessThanOrEqual(152);
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
    // Photo-informed morphology, still an original hand-authored vector.
    // The far orbit is only a short occluded seam: two glossy, evenly
    // sized cartoon eyes are forbidden for this left-turned seated fox.
    expect(parts.get("eye-far")!.opaqueSupport).toBe(false);
    expect(parts.get("eye-far")!.craft).toBeUndefined();
    expect(parts.get("eye-far")!.details!.length).toBe(3);
    expect(parts.get("eye-near")!.details!.length)
      .toBeGreaterThan(parts.get("eye-far")!.details!.length);
    const partsInOrder=regions.map(r=>r.id);
    for(const id of ["ear-far","ear-far-inner","ear-near","ear-near-inner"])
      expect(partsInOrder.indexOf(id))
        .toBeLessThan(partsInOrder.indexOf("head-main"));
    expect(parts.get("tail-back")!.layers[0].color)
      .not.toBe("#59616A");
    const orbit=parts.get("periocular-form")!;
    expect(orbit.opaqueSupport).toBe(false);
    expect(orbit.craft).toBeUndefined();
    expect((orbit.path.match(/M/g)??[]).length).toBe(3);
    expect(orbit.details!.filter(d=>d.id?.startsWith("fibre-"))).toHaveLength(9);
    expect(orbit.details!.every(d=>d.path.includes("Q")||
      d.path.includes("C"))).toBe(true);
    expect(parts.get("eye-near")!.details!.length)
      .toBeGreaterThan(parts.get("eye-far")!.details!.length);
    expect(parts.get("eye-near")!.bounds[3]).toBeLessThanOrEqual(24);
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

  it("replaces the fox white chest spear with connected convex sternal tuft turns and rooted dry hair",()=>{
    for(const aspect of ["landscape","portrait"] as const){
      const drawing=pencilLivingStudyDrawing({subject:"fox",aspect,seed:291});
      const chest=drawing.regions.find(r=>r.id==="chest")!;
      const throat=drawing.regions.find(r=>r.id==="neck-ruff")!;
      expect(chest.path).not.toContain("244 365");
      expect(chest.path).toContain("C242 359 238 356 235 349");
      expect(chest.path).toContain("C231 354 226 351 222 346");
      expect(chest.path.match(/ C/g)?.length).toBeGreaterThan(8);
      expect(chest.opaqueSupport).toBe(true);
      expect(chest.clipDetails).toBe(false);
      expect(throat.opaqueSupport).toBe(true);
      const ridge=chest.details?.find(d=>d.id==="fox-sternal-fur-turn");
      expect(ridge?.path.match(/ Q/g)).toHaveLength(2);
      expect(ridge!.width).toBeLessThan(.4);
      expect(chest.details!.filter(d=>d.id?.startsWith("fibre-")))
        .toHaveLength(24);
      const fringe=chest.details!.filter(d=>d.id?.startsWith("fringe-"));
      expect(fringe).toHaveLength(3);
      expect(fringe.every(d=>(d.path.match(/ Q/g)??[]).length>=110)).toBe(true);
      expect(pencilLivingStudyDrawing({subject:"fox",aspect,seed:291}))
        .toEqual(drawing);
    }
  });

  it("constructs a fox palpebral slit and connected maxillary pencil planes without cartoon eye stickers",()=>{
    for(const aspect of ["landscape","portrait"] as const){
      const drawing=pencilLivingStudyDrawing({subject:"fox",aspect,seed:291});
      const regions=new Map(drawing.regions.map(r=>[r.id,r]));
      const eye=regions.get("eye-near")!,far=regions.get("eye-far")!;
      const head=regions.get("head-main")!,muzzle=regions.get("muzzle")!;
      expect(eye.bounds[2]/head.bounds[2]).toBeLessThan(.13);
      expect(eye.bounds[3]).toBeLessThanOrEqual(18);
      expect(eye.bounds[0]).toBeGreaterThan(far.bounds[0]+far.bounds[2]);
      expect(eye.opaqueSupport).toBe(false);
      expect(eye.path).toContain("C250 187 251 189 249 191");
      for(const id of [
        "fox-superior-tarsus","fox-inferior-tarsus","fox-iris-pigment",
        "fox-vertical-pupil","fox-corneal-glint",
        "fox-supraorbital-arc","fox-orbital-turn",
      ])expect(eye.details?.some(d=>d.id===id)).toBe(true);
      // The slit and iris are independent physical pencil traces.
      // Nine further fibre families grow into the brow instead of masking
      // the eye with a flat raster/white-sclera ellipse.
      const eyeFibres=eye.details!.filter(d=>d.id?.startsWith("fibre-"));
      expect(eyeFibres).toHaveLength(9);
      expect(eyeFibres.every(d=>d.path.includes(" Q")&&d.width<.65)).toBe(true);
      for(const id of ["fox-maxillary-plane","fox-mandibular-turn",
        "fox-rostral-highlight"]){
        const trace=muzzle.details?.find(t=>t.id===id);
        expect(trace,id).toBeDefined();
        expect(trace!.width).toBeLessThan(.35);
        expect(trace!.opacity).toBeLessThan(.6);
      }
      expect(muzzle.details!.filter(d=>d.id?.startsWith("fibre-")))
        .toHaveLength(21);
      expect(drawing.regions.every(r=>r.details?.every(t=>
        t.path.length<=12000&&!/NaN|Infinity/.test(t.path))??true)).toBe(true);
      expect(pencilLivingStudyDrawing({subject:"fox",aspect,seed:291}))
        .toEqual(drawing);
    }
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

  it("renders a reversible pigment-only ArtCraft negative control without changing original anatomy",()=>{
    for(const subject of ["fox","portrait"] as const){
      const drawing=pencilLivingStudyDrawing({subject,aspect:"landscape"});
      const defaultArt=renderToStaticMarkup(<PencilDrawing drawing={drawing} frame={335}/>);
      const painted=renderToStaticMarkup(
        <PencilDrawing drawing={drawing} frame={335} showTonalSupport={true}/>);
      const isolated=renderToStaticMarkup(
        <PencilDrawing drawing={drawing} frame={335} showTonalSupport={false}/>);
      expect(defaultArt).toBe(painted);
      expect(defaultArt).toContain('data-km-pencil-tonal-support="on"');
      expect(isolated).toContain('data-km-pencil-tonal-support="off"');
      if(subject==="fox")expect(defaultArt).toContain('data-km-pencil-craft-base');
      else {
        expect(defaultArt).not.toContain('data-km-pencil-craft-base');
        expect(defaultArt).toContain('data-km-pencil-region="head-silhouette-01"');
      }
      expect(isolated).not.toContain('data-km-pencil-craft-base');
      expect(isolated).not.toContain("<linearGradient");
      if(subject==="fox")expect(isolated).toContain('data-km-pencil-micro');
      else expect(isolated).toContain('data-km-graphite');
      expect(isolated).toContain('data-km-pigment-layer="2"');
      expect(isolated.match(/data-km-pencil-region=/g)?.length)
        .toBe(defaultArt.match(/data-km-pencil-region=/g)?.length);
      expect(isolated).not.toContain("<image");
      expect(isolated).not.toContain("data:image/");
    }
  });

  it("keeps foreshortened far-ear anatomy and renders the heavy coat as actual pigment contacts",()=>{
    const drawing=pencilLivingStudyDrawing({subject:"fox",aspect:"landscape"});
    const regions=new Map(drawing.regions.map(region=>[region.id,region]));
    const far=regions.get("ear-far")!,near=regions.get("ear-near")!;
    // Three-quarter viewpoint: the far cartilage cannot match the near
    // ear's full upright size, as in the previous rabbit-like silhouette.
    expect(far.bounds[3]).toBeLessThanOrEqual(near.bounds[3]*.82);
    expect(far.bounds[1]).toBeGreaterThanOrEqual(119);
    expect(near.bounds[3]).toBeLessThanOrEqual(96);
    // Fox coat and the brand-new head remain independent medium systems.
    // Never reference any of the removed woman's obsolete part IDs.
    const fresh=pencilLivingStudyDrawing({subject:"portrait",aspect:"landscape"});
    expect(fresh.regions.map(r=>r.id)).toEqual(["head-silhouette-01"]);
    expect(fresh.regions[0].craft).toBeUndefined();
    expect(fresh.regions[0].opaqueSupport).toBe(false);
    expect(fresh.regions[0].craft?.pigmentDensity??0).toBe(0);
    for(const id of ["tail-back","body","chest","neck-ruff","head-main",
      "ear-far","ear-near"]){
      const region=regions.get(id)!;
      expect(region.craft?.kind).toBe("fur");
      expect(region.craft?.pigmentDensity??0).toBeGreaterThan(.29);
    }
  });

  it("builds an asymmetric fox ear concha inside a rounded outer helix instead of a flat rabbit-like leaf",()=>{
    for(const aspect of ["landscape","portrait"] as const){
      const drawing=pencilLivingStudyDrawing({subject:"fox",aspect,seed:291});
      const parts=new Map(drawing.regions.map(p=>[p.id,p]));
      const pinna=parts.get("ear-near")!,concha=parts.get("ear-near-inner")!;
      const skull=parts.get("head-main")!,far=parts.get("ear-far")!;
      expect(pinna.bounds[3]).toBeLessThanOrEqual(79);
      expect(pinna.bounds[3]).toBeGreaterThan(far.bounds[3]);
      expect(concha.bounds[2]).toBeLessThan(pinna.bounds[2]*.48);
      expect(concha.bounds[3]).toBeLessThan(pinna.bounds[3]*.76);
      expect(concha.bounds[0]).toBeGreaterThan(pinna.bounds[0]);
      expect(concha.bounds[1]).toBeGreaterThanOrEqual(pinna.bounds[1]);
      expect(concha.bounds[1]+concha.bounds[3])
        .toBeLessThanOrEqual(pinna.bounds[1]+pinna.bounds[3]);
      expect(pinna.opaqueSupport).toBe(true);
      expect(concha.opaqueSupport).toBe(true);
      expect(concha.craft?.kind).toBe("fur");
      expect(concha.layers[1].color).not.toBe(pinna.layers[1].color);
      const outerFeatures=[
        "near-pinna-helix-rim","near-pinna-posterior-fold","near-auricular-base",
      ];
      const innerFeatures=[
        "near-conchal-shadow","near-antihelix-reflection","near-canal-base",
      ];
      for(const [region,ids] of [[pinna,outerFeatures],[concha,innerFeatures]] as const){
        for(const id of ids)expect(region.details!.some(d=>d.id===id)).toBe(true);
        expect(region.details!.filter(d=>d.id?.startsWith("fibre-")))
          .toHaveLength(9);
        expect(region.details!.every(d=>!d.path.includes("NaN"))).toBe(true);
      }
      expect(pinna.path).toContain("C305 146 300 164 289 189");
      expect(concha.path).toContain("C274 179 273 175 275 170");
      expect(pinna.bounds[0]+pinna.bounds[2]).toBeGreaterThan(skull.bounds[0]+120);
      expect(pencilLivingStudyDrawing({subject:"fox",aspect,seed:291}))
        .toEqual(drawing);
    }
  });

  it("keeps fox chest and throat curves connected without cardboard spikes or cartoon eye outline",()=>{
    const drawing=pencilLivingStudyDrawing({subject:"fox",aspect:"landscape"});
    const parts=new Map(drawing.regions.map(region=>[region.id,region]));
    const chest=parts.get("chest")!;
    const throat=parts.get("neck-ruff")!;
    for(const plane of [chest,throat]){
      // Form boundaries follow the irregular living pelt: short joined
      // curvatures instead of folded sharp-corner polygon stickers.
      expect((plane.path.match(/ C/g)??[]).length).toBeGreaterThanOrEqual(7);
      expect((plane.path.match(/ L/g)??[]).length).toBeLessThanOrEqual(1);
      expect(plane.craft?.kind).toBe("fur");
    }
    const eye=parts.get("eye-near")!;
    // A shaded iris is drawn inside independently articulated upper/lower
    // lids; the all-around contour should not outline a complete circle.
    expect(eye.contour.opacity??1).toBeLessThanOrEqual(.23);
    expect(eye.details?.some(trace=>
      trace.color==="#242632"&&trace.opacity!==undefined&&trace.opacity>.9)).toBe(true);
  });

  it("rejects long decorative fur slashes in favor of short anatomically rooted dry-pencil contacts",()=>{
    const drawing=pencilLivingStudyDrawing({subject:"fox",aspect:"landscape"});
    const parts=new Map(drawing.regions.map(r=>[r.id,r]));
    const pattern=/M(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?) Q-?\d+(?:\.\d+)? -?\d+(?:\.\d+)? (-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g;
    for(const id of ["tail-back","body","rear-leg","foreleg-left","foreleg-right"]){
      const region=parts.get(id)!;
      const multiline=region.details!.filter(t=>(t.path.match(/M/g)??[]).length>=10);
      expect(multiline.length).toBeGreaterThanOrEqual(3);
      for(const trace of multiline){
        const chords=Array.from(trace.path.matchAll(pattern),m=>
          Math.hypot(Number(m[3])-Number(m[1]),Number(m[4])-Number(m[2])));
        expect(chords.length).toBeGreaterThanOrEqual(10);
        expect(Math.max(...chords)).toBeLessThanOrEqual(33);
      }
    }
  });

  it("roots fine coat edge-fibres to named cheek and throat curves instead of clipped opaque sticker edges",()=>{
    const drawing=pencilLivingStudyDrawing({subject:"fox",aspect:"landscape"});
    const map=new Map(drawing.regions.map(region=>[region.id,region]));
    for(const id of ["chest","neck-ruff","cheek-ruff"]){
      const region=map.get(id)!;
      expect(region.clipDetails).toBe(false);
      expect(region.contour.opacity??1).toBeLessThan(.27);
      const fringes=region.details!.filter(t=>t.id?.startsWith("fringe-"));
      expect(fringes).toHaveLength(3);
      for(const trace of fringes){
        expect((trace.path.match(/M/g)??[]).length).toBeGreaterThan(24);
        expect(trace.path).toMatch(/ Q/);
        expect(trace.path).not.toMatch(/NaN|Infinity/);
        expect(trace.width).toBeLessThan(.6);
      }
    }
  });

  it("anchors the fox cheek-ruff from orbital jaw into the chest instead of an isolated oval patch",()=>{
    const drawing=pencilLivingStudyDrawing({subject:"fox",aspect:"landscape"});
    const cheek=drawing.regions.find(region=>region.id==="cheek-ruff")!;
    const neck=drawing.regions.find(region=>region.id==="neck-ruff")!;
    expect(cheek.bounds[1]+cheek.bounds[3]).toBeLessThanOrEqual(295);
    expect(cheek.bounds[1]+cheek.bounds[3]).toBeGreaterThanOrEqual(285);
    // A diagonal malar-to-cervical overlap now lies inside the white neck
    // instead of creating a narrow but detached vertical ribbon.
    expect(cheek.bounds[2]).toBeLessThanOrEqual(46);
    expect(cheek.bounds[3]).toBeLessThanOrEqual(70);
    expect(cheek.path).not.toContain("250 313");
    expect((cheek.path.match(/ C/g)??[]).length).toBeGreaterThanOrEqual(5);
    expect((cheek.path.match(/ L/g)??[]).length).toBe(0);
    expect(cheek.bounds[0]).toBeLessThan(neck.bounds[0]+neck.bounds[2]);
    expect(cheek.clipDetails).toBe(false);
    expect(cheek.details!.filter(t=>t.id?.startsWith("fringe-")))
      .toHaveLength(3);
  });

  it("constructs a truncated malar fur fan that joins the cream sternum instead of a dangling gray scarf",()=>{
    for(const aspect of ["landscape","portrait"] as const){
      const drawing=pencilLivingStudyDrawing({subject:"fox",aspect,seed:291});
      const map=new Map(drawing.regions.map(p=>[p.id,p]));
      const cheek=map.get("cheek-ruff")!;
      const chest=map.get("chest")!;
      const muzzle=map.get("muzzle")!;
      expect(cheek.bounds[3]).toBeLessThan(65);
      expect(cheek.bounds[2]/cheek.bounds[3]).toBeGreaterThan(.65);
      expect(cheek.bounds[0]+cheek.bounds[2]).toBeGreaterThan(250);
      expect(cheek.bounds[1]).toBeLessThan(muzzle.bounds[1]+muzzle.bounds[3]);
      expect(cheek.bounds[1]+cheek.bounds[3]).toBeGreaterThan(chest.bounds[1]+35);
      expect(cheek.opaqueSupport).toBe(true);
      expect(cheek.craft?.kind).toBe("fur");
      expect(cheek.layers[0].color).toBe(chest.layers[0].color);
      expect(cheek.layers[1].color).toBe(chest.layers[1].color);
      expect(cheek.details?.find(d=>d.id==="fox-malar-light-fan")).toBeDefined();
      expect(cheek.details?.find(d=>d.id==="fox-cervical-turn")).toBeDefined();
      const fibres=cheek.details!.filter(d=>d.id?.startsWith("fibre-"));
      expect(fibres).toHaveLength(12); // 4 anatomical fan guides × 3 pigment layers
      expect(fibres.every(d=>d.width<.6&&d.path.includes(" Q"))).toBe(true);
      for(const part of [cheek,chest,muzzle]){
        expect(part.path).not.toMatch(/NaN|Infinity/);
      }
      expect(pencilLivingStudyDrawing({subject:"fox",aspect,seed:291}))
        .toEqual(drawing);
    }
  });

  it("anchors the fox's tapered nasal cartilage close to its eye instead of a disconnected 170px beak",()=>{
    const parts=new Map(pencilLivingStudyDrawing({subject:"fox",aspect:"landscape"})
      .regions.map(r=>[r.id,r]));
    const eye=parts.get("eye-near")!,nose=parts.get("nose")!;
    const head=parts.get("head-main")!,muzzle=parts.get("muzzle")!;
    const bridge=parts.get("rostrum-bridge")!;
    const pupilX=eye.bounds[0]+eye.bounds[2]/2;
    const nasalX=nose.bounds[0]+nose.bounds[2]/2;
    const ratio=(pupilX-nasalX)/head.bounds[2];
    expect(ratio).toBeGreaterThan(.4);
    expect(ratio).toBeLessThanOrEqual(.59);
    expect(nose.bounds[0]).toBeGreaterThanOrEqual(128);
    expect(muzzle.bounds[2]).toBeLessThanOrEqual(152);
    expect(muzzle.bounds[0]).toBeLessThanOrEqual(nose.bounds[0]);
    expect(bridge.bounds[0]).toBeLessThan(nose.bounds[0]+16);
    expect(muzzle.details?.some(d=>d.id==="zygomatic-transition")).toBe(true);
    expect(muzzle.details?.some(d=>d.id==="nasolabial-shadow")).toBe(true);
    expect((muzzle.path.match(/ C/g)??[]).length).toBeGreaterThanOrEqual(7);
  });

  it("fox structural pass keeps the eye embedded and nasal tip connected to a tapered muzzle",()=>{
    const drawing=pencilLivingStudyDrawing({subject:"fox",aspect:"landscape"});
    const parts=new Map(drawing.regions.map(r=>[r.id,r]));
    const near=parts.get("eye-near")!,far=parts.get("eye-far")!;
    const bridge=parts.get("rostrum-bridge")!,nose=parts.get("nose")!,muzzle=parts.get("muzzle")!;
    // The photographed fox is not a round-eyed cartoon: upper lid dominates,
    // tiny iris lies inside a brow socket and the far canthus is occluded.
    expect(near.bounds[2]).toBeLessThanOrEqual(20);
    expect(near.bounds[3]).toBeLessThanOrEqual(14);
    expect(far.bounds[2]).toBeLessThanOrEqual(13);
    expect(near.bounds[2]).toBeGreaterThan(far.bounds[2]*1.20);
    expect(near.contour.opacity??1).toBeLessThanOrEqual(.23);
    // An original curved rostrum runs all the way to the dark nose.
    expect(nose.bounds[2]).toBeLessThanOrEqual(24);
    expect(nose.bounds[3]).toBeLessThanOrEqual(23);
    expect(nose.bounds[0]+nose.bounds[2]).toBeGreaterThan(bridge.bounds[0]);
    expect((muzzle.path.match(/ C/g)??[]).length).toBeGreaterThanOrEqual(6);
    expect(muzzle.path).not.toMatch(/ L/);
    expect(nose.details!.some(trace=>trace.id==="nasal-philtrum"&&
      trace.path.includes(" Q"))).toBe(true);
  });

  it("gives each weight-bearing fox paw four attached toe furrows, subtle nails and a tapered metacarpal transition",()=>{
    const drawing=pencilLivingStudyDrawing({subject:"fox",aspect:"landscape"});
    for(const id of ["foreleg-left","foreleg-right"]){
      const paw=drawing.regions.find(r=>r.id===id)!;
      for(const feature of ["toe-furrows","claw-tips","wrist-tendons"]){
        const mark=paw.details?.find(trace=>trace.id===feature);
        expect(mark,id+" "+feature).toBeDefined();
        expect(mark!.width).toBeLessThan(.8);
        expect(mark!.path).not.toMatch(/NaN|Infinity/);
        const strokes=mark!.path.match(/M-?\d+(?:\.\d+)? -?\d+(?:\.\d+)?/g)??[];
        expect(strokes.length,id+" "+feature).toBe(4);
        if(feature!=="claw-tips")expect(mark!.path).toContain(" Q");
      }
      const crease=paw.details!.find(trace=>trace.id==="toe-furrows")!;
      const coordinates=Array.from(crease.path.matchAll(/M(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g),
        match=>[Number(match[1]),Number(match[2])]);
      expect(coordinates.every(([x,y])=>
        x>=paw.bounds[0]&&x<=paw.bounds[0]+paw.bounds[2]&&
        y>=paw.bounds[1]+paw.bounds[3]-19&&y<=paw.bounds[1]+paw.bounds[3])).toBe(true);
    }
  });

  it("tucks the seated hind hock into the rump instead of inventing a third upright boot",()=>{
    for(const aspect of ["landscape","portrait"] as const){
      const drawing=pencilLivingStudyDrawing({subject:"fox",aspect,seed:291});
      const parts=new Map(drawing.regions.map(r=>[r.id,r]));
      const hind=parts.get("rear-leg")!,body=parts.get("body")!;
      // Sitting fox anatomy: the bent thigh disappears under the rust
      // pelvis and the short tarsus contacts the ground transversely.
      expect(hind.bounds[1]).toBeGreaterThanOrEqual(360);
      expect(hind.bounds[3]).toBeLessThanOrEqual(48);
      expect(hind.bounds[2]/hind.bounds[3]).toBeGreaterThan(1.0);
      expect(hind.bounds[0]).toBeLessThan(body.bounds[0]+body.bounds[2]);
      expect(hind.bounds[1]+hind.bounds[3]).toBeGreaterThanOrEqual(405);
      expect(hind.path).toContain("M328 369 C334 366 344 371 349 379");
      expect(hind.path).not.toContain("L369 402");
      expect((hind.path.match(/ C/g)??[]).length).toBeGreaterThanOrEqual(7);
      expect((hind.path.match(/ L/g)??[]).length).toBe(0);
      for(const id of ["hind-hock-plane","hind-digit-folds",
        "hind-tiny-claws","hind-fur-light-turn"]){
        const t=hind.details?.find(d=>d.id===id);
        expect(t,id).toBeDefined();
        expect(t!.opacity).toBeLessThanOrEqual(.7);
        expect(t!.width).toBeLessThanOrEqual(.5);
        expect(t!.path).not.toMatch(/NaN|Infinity/);
      }
      expect(hind.details!.filter(d=>d.id?.startsWith("fibre-")))
        .toHaveLength(12);
      expect(pencilLivingStudyDrawing({subject:"fox",aspect,seed:291}))
        .toEqual(drawing);
    }
  });

  it("preserves four separate canine toe creases while giving each forearm physical turning planes",()=>{
    for(const aspect of ["landscape","portrait"] as const){
      const drawing=pencilLivingStudyDrawing({subject:"fox",aspect,seed:291});
      for(const [id,prefix] of [
        ["foreleg-left","far"],["foreleg-right","near"],
      ] as const){
        const leg=drawing.regions.find(r=>r.id===id)!;
        expect((leg.path.match(/ C/g)??[]).length).toBeGreaterThanOrEqual(9);
        expect((leg.path.match(/ L/g)??[]).length).toBe(0);
        expect(leg.opaqueSupport).toBe(true);
        for(const name of ["antebrachial-plane","metacarpal-turn"]){
          const trace=leg.details?.find(d=>d.id===prefix+"-"+name);
          expect(trace,prefix+" "+name).toBeDefined();
          expect(trace!.width).toBeLessThan(.5);
          expect(trace!.opacity).toBeLessThanOrEqual(.6);
        }
        const roots=leg.details!.filter(d=>d.id?.startsWith("fibre-"));
        expect(roots.length).toBeGreaterThanOrEqual(15);
        expect(roots.every(t=>t.path.includes(" Q")&&!/NaN|Infinity/.test(t.path)))
          .toBe(true);
        for(const digit of ["paw-toes","toe-furrows","claw-tips"]){
          const t=leg.details?.find(d=>d.id===digit);
          expect(t,digit).toBeDefined();
          expect((t!.path.match(/M/g)??[]).length).toBeGreaterThanOrEqual(3);
        }
      }
    }
  });

  it("fox weight-bearing forelegs taper to articulated toes rather than uniform black boots",()=>{
    const drawing=pencilLivingStudyDrawing({subject:"fox",aspect:"landscape"});
    const parts=new Map(drawing.regions.map(r=>[r.id,r]));
    for(const [id,maxWidth] of [["foreleg-left",56],["foreleg-right",68]] as const){
      const paw=parts.get(id)!;
      expect(paw.bounds[2]).toBeLessThanOrEqual(maxWidth);
      expect((paw.path.match(/ C/g)??[]).length).toBeGreaterThanOrEqual(6);
      expect((paw.path.match(/ L/g)??[]).length).toBeLessThanOrEqual(1);
      const toes=paw.details!.find(d=>d.id==="paw-toes");
      expect(toes).toBeDefined();
      expect((toes!.path.match(/M/g)??[]).length).toBeGreaterThanOrEqual(3);
      expect(toes!.width).toBeLessThan(1);
    }
  });

  it("scales ears against cranial depth and joins a narrow white-grey cervical chest",()=>{
    const parts=new Map(pencilLivingStudyDrawing({subject:"fox",aspect:"landscape"})
      .regions.map(r=>[r.id,r]));
    const head=parts.get("head-main")!,near=parts.get("ear-near")!;
    const far=parts.get("ear-far")!,chest=parts.get("chest")!;
    const neck=parts.get("neck-ruff")!,body=parts.get("body")!;
    // Authentic sitting fox photographs: each auricle is substantially
    // shorter than the entire skull, unlike the original rabbit-like fins.
    expect(near.bounds[3]).toBeLessThanOrEqual(79);
    expect(far.bounds[3]).toBeLessThanOrEqual(61);
    expect(far.bounds[3]).toBeLessThanOrEqual(near.bounds[3]*.8);
    expect(near.bounds[1]+near.bounds[3]).toBeGreaterThan(head.bounds[1]+70);
    // Chest is a narrow, root-connected ventral plane, not a flared
    // paper-white neckerchief hiding both shoulders.
    expect(chest.bounds[2]).toBeLessThanOrEqual(107);
    expect(neck.bounds[2]).toBeLessThanOrEqual(97);
    expect(chest.bounds[1]+chest.bounds[3]).toBeGreaterThan(365);
    expect(chest.bounds[0]+chest.bounds[2]).toBeLessThan(body.bounds[0]+body.bounds[2]);
    expect(chest.layers[1].color).not.toBe("#887B78");
    expect(chest.details!.filter(t=>t.id?.startsWith("fringe-"))).toHaveLength(3);
  });

  it("keeps all three fur pigment passes tangent to coat growth instead of generic 73-degree crosshatching",()=>{
    for(const aspect of ["landscape","portrait"] as const){
      const drawing=pencilLivingStudyDrawing({subject:"fox",aspect});
      const furs=drawing.regions.filter(r=>r.craft?.kind==="fur");
      expect(furs.length).toBeGreaterThan(10);
      for(const region of furs){
        const angles=region.layers.map(layer=>layer.angle);
        expect(angles).toHaveLength(3);
        expect(Math.abs(angles[1]-angles[0]),region.id).toBeLessThanOrEqual(24);
        expect(Math.abs(angles[2]-angles[0]),region.id).toBeLessThanOrEqual(24);
        expect(Math.abs(angles[1]-angles[0]),region.id).toBeGreaterThanOrEqual(5);
        expect(region.layers.every(layer=>layer.texture==="fiber")).toBe(true);
      }
    }
  });

  it("recedes the far orbit under the bridge and eliminates black-disc eyes and round nose",()=>{
    const drawing=pencilLivingStudyDrawing({subject:"fox",aspect:"landscape"});
    const map=new Map(drawing.regions.map(r=>[r.id,r]));
    const orbital=map.get("mask")!,far=map.get("eye-far")!;
    const near=map.get("eye-near")!,nose=map.get("nose")!;
    // In original wildlife pencil references the upper socket is a shallow
    // shadow wedge, not a separate circular black sticker on the temple.
    expect(orbital.bounds[2]).toBeLessThanOrEqual(76);
    expect(orbital.bounds[3]).toBeLessThanOrEqual(28);
    expect((orbital.path.match(/M/g)??[]).length).toBe(2);
    expect(far.bounds[3]).toBeLessThanOrEqual(8);
    expect(near.bounds[3]).toBeLessThanOrEqual(13);
    expect(near.bounds[2]).toBeGreaterThan(far.bounds[2]*1.2);
    expect(nose.bounds[3]).toBeLessThanOrEqual(20);
    expect((nose.path.match(/ C/g)??[]).length).toBeGreaterThanOrEqual(5);
    expect(map.get("cheek-ruff")!.layers[0].color).not.toBe("#CEB79B");
  });

  it("blends the warm fox nasal bridge into cheek fur without a hard white sticker boundary",()=>{
    const parts=new Map(pencilLivingStudyDrawing({subject:"fox",aspect:"landscape"})
      .regions.map(r=>[r.id,r]));
    const muzzle=parts.get("muzzle")!;
    expect(muzzle.clipDetails).toBe(false);
    expect(muzzle.contour.opacity??1).toBeLessThanOrEqual(.23);
    const boundaryRoots=muzzle.details!.filter(t=>t.id?.startsWith("fringe-"));
    expect(boundaryRoots).toHaveLength(3);
    expect(boundaryRoots.every(t=>(t.path.match(/M/g)??[]).length>=85))
      .toBe(true);
    expect(boundaryRoots.every(t=>t.path.includes(" Q"))).toBe(true);
  });

  it("separates brush-tail growth direction from a round pompom and keeps the pale tip attached",()=>{
    const drawing=pencilLivingStudyDrawing({subject:"fox",aspect:"landscape"});
    const tail=drawing.regions.find(r=>r.id==="tail-back")!;
    const tip=drawing.regions.find(r=>r.id==="tail-tip")!;
    expect(tail.bounds[2]).toBeGreaterThanOrEqual(190);
    expect(tail.bounds[3]).toBeLessThanOrEqual(100);
    expect(tail.bounds[2]/tail.bounds[3]).toBeGreaterThan(2.15);
    expect(tail.bounds[0]+tail.bounds[2]).toBeGreaterThan(185);
    expect(tip.bounds[0]).toBeLessThan(tail.bounds[0]+10);
    expect(tip.bounds[0]+tip.bounds[2]).toBeGreaterThan(tail.bounds[0]+18);
    expect(tail.layers[0].angle).toBeGreaterThanOrEqual(143);
    expect((tail.path.match(/ C/g)??[]).length).toBeGreaterThanOrEqual(7);
    const rootFurs=tail.details!.filter(t=>t.id?.startsWith("fibre-"));
    expect(rootFurs.length).toBeGreaterThan(12);
    expect(rootFurs.every(t=>t.path.includes(" Q"))).toBe(true);
    expect(tail.details!.some(t=>t.id?.startsWith("fringe-"))).toBe(true);
  });

  it("renders original CP-F1 fox anatomy from authored pencil vectors with zero photo pixels",()=>{
    const drawing=pencilLivingStudyDrawing({subject:"fox",aspect:"landscape"});
    expect(drawing.foundation?.subject).toBe("wildlife");
    const original=renderToStaticMarkup(
      <PencilDrawing drawing={drawing} frame={335}/>);
    expect(original).toContain('data-km-pencil-render-method="authored-vector-pigment"');
    expect(original).toContain('data-km-pencil-photo-pixels="none"');
    expect(original).toContain('data-km-pencil-region="periocular-form"');
    expect(original).toContain('data-km-pencil-region="eye-near"');
    expect(original).toContain('data-km-pencil-region="eye-far"');
    expect(original).toContain('data-km-pencil-micro=""');
    expect(original).toContain('data-km-pigment-layer="2"');
    expect(original).not.toContain("<image");
    expect(original).not.toContain("<foreignObject");
    expect(original).not.toContain("<feImage");
    expect(original).not.toContain("data:image/");
    expect(renderToStaticMarkup(
      <PencilDrawing drawing={drawing} frame={335}/>)).toBe(original);
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
