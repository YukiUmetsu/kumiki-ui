import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { evaluatePencilActorRegions, evaluatePencilPose, inspectPencilActors } from "../registry/video/colored-pencil-actor";
import { inspectPencilScene } from "../registry/video/colored-pencil-scene";
import { PencilScene } from "../registry/video/colored-pencil-scene-react";
import { pencilCharacterScene, FOX_REBUILT_PARTS, KINGFISHER_REBUILT_PARTS } from "../src/video/colored-pencil-character-scenes";
import { compileFilm } from "../registry/video/film-document";
import { COLOR_PENCIL_CHARACTER_FILM } from "../src/video/colored-pencil-character-film";
import portableFilm from "../examples/film/colored-pencil-character.film.json";

describe("CP3 authored coloured-pencil ensemble", () => {
  it("replaces cartoon actors with 12-plane fox and 11-plane kingfisher anatomy in both formats", () => {
    expect(FOX_REBUILT_PARTS).toHaveLength(12);
    expect(KINGFISHER_REBUILT_PARTS).toHaveLength(11);
    for (const aspect of ["landscape", "portrait"] as const) {
      const scene = pencilCharacterScene(aspect);
      expect(inspectPencilScene(scene)).toEqual([]);
      expect(inspectPencilActors(scene.actors ?? [])).toEqual([]);
      expect(scene.actors?.map(a=>a.id)).toEqual(["fox","kingfisher"]);
      expect(scene.drawing.regions).toHaveLength(1);
      expect(scene.actors![0].parts.map(p=>p.id)).toEqual(FOX_REBUILT_PARTS);
      expect(scene.actors![1].parts.map(p=>p.id)).toEqual(KINGFISHER_REBUILT_PARTS);
      const all = scene.actors!.flatMap(a => a.parts.map(p => a.id + "-" + p.id));
      expect(all).toHaveLength(23);
      expect(new Set(all).size).toBe(all.length);
      // The replacement composition uses 1 grounded scenery region and 23 actor parts.
      expect(scene.drawing.regions.length + all.length).toBe(24);
      expect(all).toContain("fox-eye");
      expect(all).toContain("fox-tail-tip");
      expect(scene.actors![0].parts.find(part=>part.id==="tail-tip")!.parent).toBe("tail");
      expect(scene.actors![0].parts.find(part=>part.id==="tail-tip")!.region.layers[0].color)
        .toBe("#E7D0B7");
      expect(all).toContain("fox-ear-interiors");
      expect(all).toContain("fox-nose");
      expect(all).toContain("kingfisher-head");
      expect(all).toContain("kingfisher-near-wing");
      expect(all).toContain("kingfisher-wing-coverts");
      expect(scene.actors![1].parts.find(part=>part.id==="wing-coverts")!.parent)
        .toBe("near-wing");
      expect(all).toContain("kingfisher-cheek");
      expect(all).not.toContain("fox-arm");
      expect(all).not.toContain("bird-front-wing");
      expect(scene.actors!.every(actor=>actor.parts.every(part=>part.region.opaqueSupport))).toBe(true);
      expect(scene.actors!.every(actor=>actor.parts.some(part=>part.region.details!.length>3))).toBe(true);
      expect(scene.drawing.regions.some(r=>r.id==="kingfisher-perch")).toBe(true);
      const grounded=scene.drawing.regions.find(r=>r.id==="kingfisher-perch")!;
      expect((grounded.path.match(/M/g)??[]).length).toBe(2);
      expect((grounded.path.match(/Z/g)??[]).length).toBe(2);
      expect(grounded.opaqueSupport).toBe(true);
      expect(scene.drawing.regions.some(r=>r.id==="sun-disk")).toBe(false);
      expect(scene.drawing.regions.some(r=>r.id==="near-hills")).toBe(false);
    }
  });

  it("supports connected expressive eye, head, paw, wing and tail poses without drift", () => {
    const [fox, kingfisher] = pencilCharacterScene("landscape").actors!;
    const f200 = evaluatePencilActorRegions(fox, 200);
    const k200 = evaluatePencilActorRegions(kingfisher, 200);
    evaluatePencilActorRegions(fox, 0);
    evaluatePencilActorRegions(fox, 319);
    evaluatePencilActorRegions(kingfisher, 319);
    expect(evaluatePencilActorRegions(fox, 200)).toEqual(f200);
    expect(evaluatePencilActorRegions(kingfisher, 200)).toEqual(k200);
    const paw=fox.parts.find(part=>part.id==="near-foreleg")!;
    expect(evaluatePencilPose(paw.keys,223).rotation).toBeCloseTo(-22);
    const wing=kingfisher.parts.find(part=>part.id==="near-wing")!;
    expect(evaluatePencilPose(wing.keys,212).rotation).toBeCloseTo(17);
    const foxBlink=fox.parts.find(part=>part.id==="eye")!;
    expect(evaluatePencilPose(foxBlink.keys,202).scale[1]).toBeCloseTo(.16);
    const kingfisherBlink=kingfisher.parts.find(part=>part.id==="eye")!;
    expect(evaluatePencilPose(kingfisherBlink.keys,208).scale[1]).toBeCloseTo(.12);
    const at=(actor:typeof fox, id:string, frame:number)=>
      evaluatePencilActorRegions(actor,frame).find(r=>r.id===actor.id+"-"+id)!.transform;
    expect(at(kingfisher,"near-wing",173)).not.toBe(at(kingfisher,"near-wing",192));
    expect(at(fox,"tail",181)).not.toBe(at(fox,"tail",208));
    expect(at(fox,"head",194)).not.toBe(at(fox,"head",226));
    expect(at(kingfisher,"feet",180)).toBe(at(kingfisher,"feet",260));
    expect(at(fox,"far-foreleg",180)).toBe(at(fox,"far-foreleg",260));
    // The eye inherits head transforms; its local blink is not applied to the muzzle.
    expect(at(fox,"eye",202)).toContain(at(fox,"head",202));
    expect(at(kingfisher,"eye",208)).toContain(at(kingfisher,"head",208));
  });

  it("renders newly authored regions opaque at completed frames and reduced motion", () => {
    const scene = pencilCharacterScene("portrait");
    const html = (frame: number, reduced=false) =>
      renderToStaticMarkup(<PencilScene scene={scene} frame={frame} reducedMotion={reduced}/>);
    expect(html(0)).toContain('data-km-pencil-region="fox-head"');
    expect(html(0)).toContain('data-km-pencil-region="kingfisher-near-wing"');
    expect(html(0)).not.toBe(html(240));
    expect(html(240)).toBe(html(240));
    const finished=html(300);
    expect(finished).toContain('data-km-pencil-support="fox-head"');
    expect(finished).toContain('data-km-pencil-support="kingfisher-head"');
    expect(finished).toContain('data-km-pencil-support="kingfisher-eye"');
    expect(finished).toContain('data-km-pencil-region="kingfisher-perch"');
    expect(finished).not.toContain('data-km-pencil-region="bird-front-wing"');
    expect(html(0,true)).toContain('data-km-pencil-region="fox-eye"');
    expect(evaluatePencilActorRegions(scene.actors![0],0,true))
      .toEqual(evaluatePencilActorRegions(scene.actors![0],319,true));
  });

  it("compiles a complete portable actor performance in both film formats", () => {
    expect(portableFilm).toEqual(COLOR_PENCIL_CHARACTER_FILM);
    for (const outputId of ["landscape", "portrait"]) {
      const compiled = compileFilm(portableFilm, { outputId });
      expect(compiled.ok).toBe(true);
      if (!compiled.ok) continue;
      expect(compiled.film.durationFrames).toBe(320);
      expect(compiled.film.scenes).toHaveLength(3);
    }
  });

  it("rejects invalid parent order and nonmonotonic pose frames", () => {
    const scene = pencilCharacterScene("landscape");
    const actor = scene.actors![0];
    const first = actor.parts[0];
    expect(inspectPencilActors([{ ...actor, parts: [{ ...first, parent: "future" }] }]))
      .toContainEqual(expect.stringMatching(/parent/));
    expect(inspectPencilActors([{ ...actor, parts: [{
      ...first, keys: [first.keys[0], first.keys[0]],
    }] }])).toContainEqual(expect.stringMatching(/keys/));
  });
});
