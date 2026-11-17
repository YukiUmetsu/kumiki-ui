import {describe,it,expect} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {CrayonScene} from "../registry/video/materials/crayon-scene-react";
import {inspectCrayonScene} from "../registry/video/materials/crayon-scene";
import {crayonCc0FaceStudy} from "../src/video/crayon-artcraft-cc0-face";
import {crayonF1AddSourceHedgeV42} from "../src/video/crayon-artcraft-f1-anat1-hedge-v42";
import {
  Cc0Anat1SourceHedgeV42,Cc0Anat1HedgeLeftV42,Cc0Anat1HedgeRightV42,
} from "../src/video/crayon-artcraft-adult-face.stories";

describe("ArtCraft F1 V42 photographed green-black hedge and native physical leaf pigments",()=>{
  it("keeps the original V41 wax and every authored index identical; appends only source backdrop",()=>{
    for(const detail of [.2,1] as const){
      const original=crayonCc0FaceStudy({detail,midfaceForm:"source-anat1-hairline-v41"});
      const enriched=crayonCc0FaceStudy({detail,midfaceForm:"source-anat1-hedge-v42"});
      expect(inspectCrayonScene(original)).toEqual([]);
      expect(inspectCrayonScene(enriched)).toEqual([]);
      for(const prop of ["id","seed","paper","paperTooth","width","height",
        "durationFrames","camera"] as const)
        expect(enriched[prop]).toEqual(original[prop]);
      // Rendering uses index-dependent paper/wax seed; all original authored
      // indices remain fixed because source backdrop is APPENDED and then
      // independently sorted into an underlayer by the renderer.
      expect(enriched.elements.slice(0,original.elements.length))
        .toEqual(original.elements);
      const env=enriched.elements.slice(original.elements.length);
      expect(env.length).toBeGreaterThan(11);
      expect(env.every(el=>el.renderLayer==="backdrop")).toBe(true);
      expect(env[0].id).toBe("cc0-hedge-dark-underpaint");
      expect(env.filter(el=>el.kind==="wax")).toHaveLength(
        4+(detail===1?19:4));
      expect(env.filter(el=>el.kind==="contour")).toHaveLength(
        detail===1?19:4);
      expect(env.every(el=>el.timing.end<original.durationFrames)).toBe(true);
      for(const el of env){
        expect(el.id).toMatch(/^cc0-hedge-/);
        if(el.kind==="contour"){
          expect(el.clipToParent).toBe(true);
          expect(el.waxContact).toBe("dry-wax");
          expect(el.parentId).toMatch(/^cc0-hedge-leaf-/);
        }
        if(el.kind==="wax"){
          expect(el.deposition).toBe("stroke-built");
          expect(el.nibStyle).toBe("dry");
          expect(el.colors).toHaveLength(3);
        }
      }
      expect(enriched.elements.filter(el=>el.id.startsWith("hair-rooted-")))
        .toEqual(original.elements.filter(el=>el.id.startsWith("hair-rooted-")));
    }
  });

  it("rejects invalid source, duplicate IDs, invalid detail and invalid painter layer",()=>{
    const orig=crayonCc0FaceStudy({midfaceForm:"source-anat1-hairline-v41"});
    for(const value of [-1,0,.19,1.01,NaN,Infinity]){
      expect(()=>crayonF1AddSourceHedgeV42(orig.elements,value))
        .toThrow(RangeError);
    }
    expect(()=>crayonF1AddSourceHedgeV42([],1)).toThrow(RangeError);
    expect(()=>crayonF1AddSourceHedgeV42(orig.elements.filter(e=>
      e.id!=="hair-back"),1)).toThrow(RangeError);
    expect(()=>crayonF1AddSourceHedgeV42([
      ...orig.elements,orig.elements[0],
    ],1)).toThrow(RangeError);
    const bad={...orig,elements:[
      {...orig.elements[0],renderLayer:"other" as "backdrop"},
      ...orig.elements.slice(1),
    ]};
    expect(inspectCrayonScene(bad).some(x=>x.includes("renderLayer")))
      .toBe(true);
    const bg=crayonCc0FaceStudy({detail:.2,midfaceForm:"source-anat1-hedge-v42"});
    const detached={...bg,elements:bg.elements.map(el=>
      el.id==="cc0-hedge-lamina-near-left-broad"?
        {...el,renderLayer:"normal" as const}:el)};
    expect(inspectCrayonScene(detached).some(x=>
      x.includes("crosses renderLayer boundary"))).toBe(true);
  });

  it("has actual source-depth wax and grain, no PNGs, filters or external graphics",()=>{
    for(const story of [
      Cc0Anat1SourceHedgeV42,Cc0Anat1HedgeLeftV42,Cc0Anat1HedgeRightV42,
    ])expect(story.name).toContain("!dev");
    const spec=crayonCc0FaceStudy({detail:.2,midfaceForm:"source-anat1-hedge-v42"});
    const html=renderToStaticMarkup(<CrayonScene spec={spec} frame={299}/>);
    expect(html).toContain('data-km-crayon-element="cc0-hedge-dark-underpaint"');
    expect(html).toContain('data-km-crayon-element="cc0-hedge-leaf-near-left-broad"');
    expect(html).toContain('data-km-crayon-element="cc0-hedge-lamina-near-left-broad"');
    expect(html).toContain('data-km-crayon-fiber-contact="dry-wax"');
    expect(html).toContain('data-km-crayon-element="face-outline"');
    expect(html).toContain('data-km-crayon-element="hair-crown-surface"');
    // The ecological backdrop is first in native painter order, despite
    // original face being first in the append-only scene data.
    const hedge=html.indexOf('data-km-crayon-element="cc0-hedge-dark-underpaint"');
    const hair=html.indexOf('data-km-crayon-element="hair-back"');
    const face=html.indexOf('data-km-crayon-element="face-outline"');
    expect(hedge).toBeGreaterThan(0);
    expect(hair).toBeGreaterThan(hedge);
    expect(face).toBeGreaterThan(hair);
    expect(html).not.toContain("<foreignObject");
    expect(html).not.toContain("<image");
  },90_000);
});
