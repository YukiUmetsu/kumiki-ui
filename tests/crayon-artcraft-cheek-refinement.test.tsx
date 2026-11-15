import {describe,expect,it} from "vitest";
import {crayonWildlifePortraitScene} from "../src/video/crayon-wildlife-portrait-fixtures";
import {inspectCrayonScene,crayonElementTransform} from "../registry/video/materials/crayon-scene";

/** ArtCraft local-form regression, not a claim of artist-level visual fidelity. */
describe("ArtCraft cheek form and short guard-fur",()=>{
  for(const aspect of ["landscape","portrait"] as const){
    it("replaces a cartoon sticker with a restrained pigment plane in "+aspect,()=>{
      const scene=crayonWildlifePortraitScene(aspect,{detail:1});
      expect(inspectCrayonScene(scene)).toEqual([]);
      const cheek=scene.elements.find(x=>x.id==="cheek-cool-shadow");
      expect(cheek?.kind).toBe("wax");
      if(cheek?.kind!=="wax")throw new Error("No cheek plane");
      expect(cheek.coverage).toBe("opaque");
      expect(cheek.parentId).toBe("head");
      expect(cheek.outlineOpacity).toBeLessThan(.1);
      expect(cheek.bounds.width).toBeLessThan(135);
      expect(cheek.bounds.height).toBeLessThan(95);
      expect(cheek.colors[0]).not.toBe("#564548");
      const root=scene.elements.find(x=>x.id==="head");
      expect(root).toBeDefined();
      if(!root)throw new Error("Missing skull");
      expect(crayonElementTransform(scene,cheek,135)).toBe(
        crayonElementTransform(scene,cheek,135));
      const children=["cheek-cool-short-guard","cheek-cool-root-shadow"];
      for(const id of children){
        const n=scene.elements.find(x=>x.id===id);
        expect(n?.kind).toBe("contour");
        if(n?.kind!=="contour")throw new Error("Missing fur "+id);
        expect(n.parentId).toBe(cheek.id);
        expect(n.clipToParent).toBe(true);
        expect(n.d).toMatch(/M-?\d/);
        expect((n.d.match(/M/g)??[]).length).toBeGreaterThan(80);
        expect(n.timing.end).toBeGreaterThan(150);
      }
      const low=crayonWildlifePortraitScene(aspect,{detail:0});
      const detail=(id:string,spec:typeof scene)=>{
        const n=spec.elements.find(x=>x.id===id);
        if(n?.kind!=="contour")throw new Error("Missing fur");
        return (n.d.match(/M/g)??[]).length;
      };
      expect(detail(children[0],scene)).toBeGreaterThan(detail(children[0],low)*5);
      expect(low.elements.find(x=>x.id==="cheek-cool-shadow")).toEqual(cheek);
    });
  }
});
