import {describe,expect,it} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {CrayonScene} from "../registry/video/materials/crayon-scene-react";
import {crayonDemoScene} from "../src/video/crayon-scene-fixtures";
import {crayonWildlifePortraitScene} from "../src/video/crayon-wildlife-portrait-fixtures";
import {CrayonPlayground} from "../src/video/crayon-scene-playground";
import {crayonSceneDefaultArgs} from "../src/video/crayon-scene-story-config";

function waxSeed(markup:string,id:string):number {
  const at=markup.indexOf('data-km-crayon-element="'+id+'"');
  if(at<0)throw new Error("Missing wax element "+id);
  const nearby=markup.slice(at,at+900);
  const match=nearby.match(/data-km-crayon-seed="([0-9]+)"/);
  if(!match)throw new Error("Missing seeded wax for "+id);
  return Number(match[1]);
}

describe("ArtCraft macro preview / export stroke identity",()=>{
  it("hides early screen-space captions without changing world-space wax seeds",()=>{
    const scene=crayonDemoScene("water-cycle","landscape");
    const wax=scene.elements.find(node=>node.kind==="wax");
    if(!wax)throw new Error("Missing sample pigment");
    const index=scene.elements.indexOf(wax);
    expect(index).toBeGreaterThan(0); // Four captions precede the first wax.
    const originalIds=scene.elements.map(node=>node.id);
    const full=renderToStaticMarkup(<CrayonScene spec={scene} frame={239}/>);
    const crop=renderToStaticMarkup(<CrayonScene spec={scene} frame={239} hideScreenSpace/>);
    const seed=scene.seed+index*1193;
    expect(waxSeed(full,wax.id)).toBe(seed);
    expect(waxSeed(crop,wax.id)).toBe(seed);
    expect(full).toContain('data-km-crayon-element="headline"');
    expect(crop).not.toContain('data-km-crayon-element="headline"');
    expect(crop).toContain('data-km-crayon-wax=""');
    expect(scene.elements.map(node=>node.id)).toEqual(originalIds);
  });
  it("wildlife's eye and muzzle review crops share exact material seeds with its source film",()=>{
    for(const aspect of ["landscape","portrait"] as const){
      const scene=crayonWildlifePortraitScene(aspect);
      const target="maxillary-junction";
      const idx=scene.elements.findIndex(node=>node.id===target);
      expect(idx).toBeGreaterThan(0);
      const expected=scene.seed+idx*1193;
      const full=renderToStaticMarkup(<CrayonScene spec={scene} frame={239}/>);
      const macro=renderToStaticMarkup(<CrayonPlayground
        {...crayonSceneDefaultArgs} subject="wildlife-portrait" aspect={aspect}
        wildlifeCrop="muzzle" reducedMotion startFrame={239}/>);
      expect(waxSeed(full,target)).toBe(expected);
      expect(waxSeed(macro,target)).toBe(expected);
      expect(macro).not.toContain('data-km-crayon-element="headline"');
      expect(macro).toContain('data-km-crayon-element="maxillary-junction"');
    }
  });
});
