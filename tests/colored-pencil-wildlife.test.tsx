import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { inspectPencilScene } from "../registry/video/colored-pencil-scene";
import { inspectPencilDrawing } from "../registry/video/colored-pencil";
import { evaluatePencilActorRegions, evaluatePencilPose } from "../registry/video/colored-pencil-actor";
import { PencilScene } from "../registry/video/colored-pencil-scene-react";
import { compileFilm } from "../registry/video/film-document";
import { pencilWildlifeScene, KINGFISHER_REBUILT_PARTS } from "../src/video/colored-pencil-wildlife";
import { COLOR_PENCIL_WILDLIFE_FILM } from "../src/video/colored-pencil-wildlife-film";
import portableFilm from "../examples/film/colored-pencil-wildlife.film.json";

describe("ArtCraft rebuilt kingfisher wildlife illustration",()=>{
  for(const aspect of ["landscape","portrait"] as const){
    it("replaces old copperbird, preserving valid paper, anatomy and "+aspect+" composition",()=>{
      const full=pencilWildlifeScene({aspect});
      const compact=pencilWildlifeScene({aspect,detail:"study"});
      expect(inspectPencilScene(full)).toEqual([]);
      expect(inspectPencilScene(compact)).toEqual([]);
      expect(full.actors).toHaveLength(1);
      expect(full.actors![0].id).toBe("kingfisher");
      expect(full.actors![0].parts.map(p=>p.id)).toEqual(KINGFISHER_REBUILT_PARTS);
      expect(full.actors![0].parts).toHaveLength(10);
      expect(full.drawing.regions).toHaveLength(4);
      expect(full.drawing.regions.map(r=>r.id)).toEqual([
        "perch-bark","branch-twig","leaf-upper","leaf-lower",
      ]);
      expect(full.actors![0].parts.every(p=>p.region.opaqueSupport===true)).toBe(true);
      expect(full.actors![0].parts.some(p=>p.region.layers.some(l=>l.texture==="fiber"))).toBe(true);
      expect(full.drawing.width).toBe(aspect==="landscape"?960:540);
      expect(full.drawing.height).toBe(aspect==="landscape"?540:960);
      const count=(scene:typeof full)=>scene.actors![0].parts.reduce((n,p)=>
        n+(p.region.details?.length??0),0);
      expect(count(compact)).toBeLessThan(count(full));
      expect(full.actors![0].parts.every(p=>p.id!=="wing-primaries"&&p.id!=="eye-ring"))
        .toBe(true);
    });
  }

  it("uses rooted kingfisher feather guides and multiple overlapping wing layers",()=>{
    const actor=pencilWildlifeScene({aspect:"landscape",detail:"full"}).actors![0];
    const wing=actor.parts.find(p=>p.id==="near-wing")!;
    const far=actor.parts.find(p=>p.id==="far-wing")!;
    const crown=actor.parts.find(p=>p.id==="head")!;
    const chest=actor.parts.find(p=>p.id==="breast")!;
    for(const part of [wing,far,crown,chest]){
      const traces=part.region.details??[];
      expect(traces.length).toBeGreaterThan(2);
      expect(traces.some(t=>(t.path.match(/ Q/g)??[]).length>=18)).toBe(true);
      expect(traces.every(t=>t.path.length<=12000)).toBe(true);
      expect(traces.every(t=>!t.path.includes("NaN")&&!t.path.includes("Infinity"))).toBe(true);
      expect(part.region.clipDetails).toBe(true);
    }
    expect(wing.parent).toBe("torso");
    expect(crown.parent).toBe("torso");
    expect(far.parent).toBeUndefined();
    expect(chest.parent).toBe("torso");
    expect(wing.region.details!.length).toBeGreaterThan(
      actor.parts.find(p=>p.id==="eye")!.region.details!.length);
    expect(wing.region.details!.length).toBeLessThanOrEqual(80);
  });

  it("articulates head/wing/tail and blinks without doubling inherited animation or sliding feet",()=>{
    const actor=pencilWildlifeScene({aspect:"landscape"}).actors![0];
    const at=(frame:number)=>Object.fromEntries(evaluatePencilActorRegions(actor,frame)
      .map(region=>[region.id,region.transform]));
    const before=at(158),winged=at(173),tilt=at(199),blink=at(208),settle=at(260);
    expect(winged["kingfisher-near-wing"]).not.toBe(before["kingfisher-near-wing"]);
    expect(winged["kingfisher-far-wing"]).not.toBe(before["kingfisher-far-wing"]);
    expect(tilt["kingfisher-head"]).not.toBe(before["kingfisher-head"]);
    expect(blink["kingfisher-eye"]).not.toBe(before["kingfisher-eye"]);
    expect(at(181)["kingfisher-feet"]).toBe(settle["kingfisher-feet"]);
    expect(at(260)).toEqual(settle);
    const wing=actor.parts.find(p=>p.id==="near-wing")!;
    expect(evaluatePencilPose(wing.keys,212).rotation).toBeCloseTo(17);
    const posed=evaluatePencilActorRegions(actor,212);
    const torso=posed.find(p=>p.id==="kingfisher-torso")!;
    const front=posed.find(p=>p.id==="kingfisher-near-wing")!;
    expect(front.transform).toContain(torso.transform+" translate(0 0) rotate(");
  });

  it("uses paper support for all solid bird parts and real graphite timing",()=>{
    const scene=pencilWildlifeScene({aspect:"landscape"});
    const render=(frame:number,reducedMotion=false)=>renderToStaticMarkup(
      <PencilScene scene={scene} frame={frame} reducedMotion={reducedMotion}/>);
    const blank=render(0),final=render(350);
    expect(blank).not.toContain('data-km-pencil-support="kingfisher-torso"');
    expect(final).toContain('data-km-pencil-support="kingfisher-torso"');
    expect(final).toContain('data-km-pencil-support="kingfisher-head"');
    expect(final).toContain('data-km-pencil-region="kingfisher-beak"');
    expect(final).toContain('data-km-pencil-region="kingfisher-near-wing"');
    expect(final).toContain('data-km-pencil-region="perch-bark"');
    expect(final).not.toContain('data-km-pencil-region="copperbird-head"');
    expect(render(0,true)).toContain('data-km-pencil-support="kingfisher-torso"');
    render(70);
    expect(render(350)).toBe(final);
  });

  it("keeps bounded draw topology and validates reference-derived colour and anatomy contracts",()=>{
    const actor=pencilWildlifeScene({aspect:"portrait"}).actors![0];
    const head=actor.parts.find(p=>p.id==="head")!.region;
    const beak=actor.parts.find(p=>p.id==="beak")!.region;
    const breast=actor.parts.find(p=>p.id==="breast")!.region;
    const feet=actor.parts.find(p=>p.id==="feet")!.region;
    expect(head.bounds[2]).toBeGreaterThan(70);
    expect(beak.bounds[2]).toBeGreaterThan(beak.bounds[3]*3);
    expect(breast.layers[0].color).toBe("#E0A26C");
    expect(head.layers[0].color).toBe("#3787A6");
    expect((feet.path.match(/M/g)??[]).length).toBe(2);
    expect(feet.path.match(/Z/g)).toHaveLength(2);
    expect(beak.opaqueSupport).toBe(true);
    expect(feet.opaqueSupport).toBe(true);
    expect(inspectPencilScene(pencilWildlifeScene({aspect:"portrait"}))).toEqual([]);
  });

  it("rejects invalid paper, material detail and layout parameters",()=>{
    const scene=pencilWildlifeScene({aspect:"portrait"});
    const invalid={...scene.drawing,regions:[{
      ...scene.drawing.regions[0],opaqueSupport:"yes" as unknown as boolean,
    }]};
    expect(inspectPencilDrawing(invalid)).not.toEqual([]);
    expect(()=>pencilWildlifeScene({aspect:"portrait",paperTooth:1.2})).toThrow(RangeError);
    expect(()=>pencilWildlifeScene({
      aspect:"portrait",detail:"unknown" as "full",
    })).toThrow(RangeError);
  });

  it("preserves the 420-frame three-shot FilmStage proof for both formats",()=>{
    expect(portableFilm).toEqual(COLOR_PENCIL_WILDLIFE_FILM);
    for(const id of ["landscape","portrait"]){
      const compiled=compileFilm(COLOR_PENCIL_WILDLIFE_FILM,{outputId:id});
      expect(compiled.ok).toBe(true);
      if(compiled.ok){
        expect(compiled.film.durationFrames).toBe(420);
        expect(compiled.film.scenes.every(s=>s.kind==="slot")).toBe(true);
      }
    }
  });
});
