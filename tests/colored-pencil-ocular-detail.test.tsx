import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PencilScene } from "../registry/video/colored-pencil-scene-react";
import { inspectPencilScene } from "../registry/video/colored-pencil-scene";
import { pencilCharacterScene } from "../src/video/colored-pencil-character-rebuild";
import { pencilWildlifeScene } from "../src/video/colored-pencil-wildlife";

describe("ArtCraft mammal ocular and kingfisher beak/feather micro-craft",()=>{
  for(const aspect of ["landscape","portrait"] as const){
    it("renders opaque glossy eyes and physically distinct keratin bill in "+aspect,()=>{
      const duo=pencilCharacterScene(aspect);
      const hero=pencilWildlifeScene({aspect,detail:"full"});
      expect(inspectPencilScene(duo)).toEqual([]);
      expect(inspectPencilScene(hero)).toEqual([]);
      const fox=duo.actors![0],kingfisher=duo.actors![1],
        heroKingfisher=hero.actors![0];
      const foxEye=fox.parts.find(p=>p.id==="eye")!.region;
      const birdEye=kingfisher.parts.find(p=>p.id==="eye")!.region;
      const heroEye=heroKingfisher.parts.find(p=>p.id==="eye")!.region;
      const beak=kingfisher.parts.find(p=>p.id==="beak")!.region;
      const nose=fox.parts.find(p=>p.id==="nose")!.region;

      for(const eye of [foxEye,birdEye,heroEye]){
        expect(eye.layers.map(l=>l.texture)).toEqual([
          "hatch","hatch","stipple",
        ]);
        expect(eye.opaqueSupport).toBe(true);
        // Ocular catchlights/eyelids extend past the cornea but cannot reveal
        // underlying scene through the solid eye region.
        expect(eye.clipDetails).toBe(false);
        expect(eye.details!.length).toBeGreaterThanOrEqual(5);
        expect(eye.details!.some(x=>x.color==="#FFF4D9"||x.color==="#FFF8DC"))
          .toBe(true);
      }
      expect(beak.layers.map(l=>l.texture)).toEqual([
        "hatch","hatch","stipple",
      ]);
      expect(beak.opaqueSupport).toBe(true);
      expect(beak.bounds[2]).toBeGreaterThan(90);
      expect(beak.details).toHaveLength(3);
      expect(nose.layers[2].texture).toBe("stipple");
      expect(nose.opaqueSupport).toBe(true);
      const crown=heroKingfisher.parts.find(p=>p.id==="head")!.region;
      expect(crown.details!.some(d=>
        d.color==="#D6F0DF" && (d.path.match(/M/g)??[]).length>=7)).toBe(true);
      expect(crown.details!.some(d=>
        d.color==="#173B5D" && (d.path.match(/M/g)??[]).length>=6)).toBe(true);
      const markup=renderToStaticMarkup(<PencilScene scene={duo} frame={318}/>);
      expect(markup).toContain('data-km-pencil-support="fox-eye"');
      expect(markup).toContain('data-km-pencil-support="kingfisher-eye"');
      expect(markup).toContain('data-km-pencil-support="kingfisher-beak"');
    });
  }

  it("keeps broad pigment/tone and the open whisker detail contract separate",()=>{
    const scene=pencilCharacterScene("landscape");
    const fox=scene.actors![0];
    const muzzle=fox.parts.find(p=>p.id==="muzzle")!.region;
    const eye=fox.parts.find(p=>p.id==="eye")!.region;
    const head=fox.parts.find(p=>p.id==="head")!.region;
    expect(muzzle.clipDetails).toBe(false);
    expect(muzzle.opaqueSupport).toBe(true);
    expect(head.clipDetails).toBe(true);
    expect(head.opaqueSupport).toBe(true);
    expect(eye.clipDetails).toBe(false);
    const last=renderToStaticMarkup(<PencilScene scene={scene} frame={310}/>);
    expect(last).toContain('data-km-pencil-details');
    const eyeBefore=renderToStaticMarkup(<PencilScene scene={scene} frame={30}/>);
    expect(eyeBefore).not.toBe(last);
    expect(renderToStaticMarkup(<PencilScene scene={scene} frame={310}/>))
      .toBe(last);
  });
});
