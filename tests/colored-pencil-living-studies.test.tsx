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

  it("builds soft three-quarter human eye and nasal planes without hard iris or brow stickers",()=>{
    const regions=pencilLivingStudyDrawing({subject:"portrait",aspect:"landscape"}).regions;
    const parts=new Map(regions.map(r=>[r.id,r]));
    const nose=parts.get("nose-bridge")!;
    expect(nose.opaqueSupport).toBe(false);
    expect(nose.craft).toBeUndefined();
    const eyebrow=parts.get("brows")!;
    expect(eyebrow.bounds[3]).toBeLessThan(18);
    expect(eyebrow.layers.every(l=>l.texture==="fiber")).toBe(true);
    for(const [eye,iris,pupil] of [
      ["eye-white-far","iris-far","pupil-far"],
      ["eye-white-near","iris-near","pupil-near"],
    ] as const){
      const sclera=parts.get(eye)!,colour=parts.get(iris)!,dark=parts.get(pupil)!;
      expect(sclera.bounds[3]).toBeLessThanOrEqual(23);
      expect(colour.bounds[1]).toBeGreaterThanOrEqual(sclera.bounds[1]);
      expect(colour.bounds[1]+colour.bounds[3])
        .toBeLessThanOrEqual(sclera.bounds[1]+sclera.bounds[3]+2);
      expect(dark.bounds[2]).toBeLessThan(colour.bounds[2]);
      expect(sclera.layers[0].color).not.toBe("#FFFFFF");
    }
    const skin=regions.filter(r=>r.craft?.kind==="skin");
    expect(skin.length).toBeGreaterThan(5);
    expect(skin.every(r=>r.layers[0].texture==="stipple")).toBe(true);
    expect(regions.filter(r=>r.craft?.kind==="hair")
      .every(r=>r.layers.every(layer=>layer.texture==="fiber"))).toBe(true);
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
      expect(defaultArt).toContain('data-km-pencil-craft-base');
      expect(isolated).not.toContain('data-km-pencil-craft-base');
      expect(isolated).not.toContain("<linearGradient");
      expect(isolated).toContain('data-km-pencil-micro');
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
    const reference=pencilLivingStudyDrawing({subject:"portrait",aspect:"landscape"});
    const portraitHead=reference.regions.find(r=>r.id==="face-main")!;
    expect(portraitHead.craft?.pigmentDensity??0).toBe(0);
    for(const id of ["tail-back","body","chest","neck-ruff","head-main",
      "ear-far","ear-near"]){
      const region=regions.get(id)!;
      expect(region.craft?.kind).toBe("fur");
      expect(region.craft?.pigmentDensity??0).toBeGreaterThan(.29);
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
    expect(cheek.bounds[1]+cheek.bounds[3]).toBeGreaterThanOrEqual(310);
    // Narrow malar transition: a broad filled triangular cheek becomes an
    // anatomically detached cardboard flap in native film screenshots.
    expect(cheek.bounds[2]).toBeLessThanOrEqual(49);
    expect((cheek.path.match(/ C/g)??[]).length).toBeGreaterThanOrEqual(5);
    expect((cheek.path.match(/ L/g)??[]).length).toBe(0);
    expect(cheek.bounds[0]).toBeLessThan(neck.bounds[0]+neck.bounds[2]);
    expect(cheek.clipDetails).toBe(false);
    expect(cheek.details!.filter(t=>t.id?.startsWith("fringe-")))
      .toHaveLength(3);
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
        const strokes=mark!.path.match(/M-?\\d+(?:\\.\\d+)? -?\\d+(?:\\.\\d+)?/g)??[];
        expect(strokes.length,id+" "+feature).toBe(4);
        if(feature!=="claw-tips")expect(mark!.path).toContain(" Q");
      }
      const crease=paw.details!.find(trace=>trace.id==="toe-furrows")!;
      const coordinates=Array.from(crease.path.matchAll(/M(-?\\d+(?:\\.\\d+)?) (-?\\d+(?:\\.\\d+)?)/g),
        match=>[Number(match[1]),Number(match[2])]);
      expect(coordinates.every(([x,y])=>
        x>=paw.bounds[0]&&x<=paw.bounds[0]+paw.bounds[2]&&
        y>=paw.bounds[1]+paw.bounds[3]-19&&y<=paw.bounds[1]+paw.bounds[3])).toBe(true);
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
