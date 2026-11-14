import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Paper, WaxRegion } from "../registry/video/materials/crayon-react";
import { inspectCrayonScene } from "../registry/video/materials/crayon-scene";
import { CrayonScene } from "../registry/video/materials/crayon-scene-react";
import { crayonPerformanceScene } from "../src/video/crayon-performance-fixtures";
import { crayonWalkScene } from "../src/video/crayon-walk-fixtures";
import { crayonCharacterDrawScene } from "../src/video/crayon-character-draw-fixtures";
import { crayonDragonVillageScene } from "../src/video/crayon-dragon-village-fixtures";
import { crayonDemoScene } from "../src/video/crayon-scene-fixtures";

const shape="M-70 -30Q-100 -85 0 -88Q100 -80 80 32Q45 90 -22 78Q-84 54 -70 -30Z";
const colors=["#d98765","#966274","#f0b58c"] as const;
function sample(frame:number,coverage:"opaque"|"open",reduced=false){
  return renderToStaticMarkup(<svg xmlns="http://www.w3.org/2000/svg">
    <Paper width={300} height={260} seed={3} tooth="test-tooth" strength={.75}/>
    <rect x="0" y="0" width="300" height="260" fill="#173b93"/>
    <WaxRegion d={shape} bounds={{x:-110,y:-95,width:212,height:187}}
      seed={42} pressure={.9} colors={colors} tooth="test-tooth"
      frame={frame} first={20} last={120} reduced={reduced}
      construction={{order:"outline-first",outlineFraction:.3,glaze:.15}}
      coverage={coverage}/>
  </svg>);
}
describe("opaque medium-native character coatings",()=>{
  it("builds a truly blocking underpaint outside the porous stroke mask",()=>{
    const finished=sample(120,"opaque");
    expect(finished).toContain('data-km-crayon-coverage="opaque"');
    expect(finished).toContain('data-km-crayon-underpaint="opaque"');
    const coated=finished.indexOf('data-km-crayon-underpaint="opaque"');
    const strokes=finished.indexOf('data-km-crayon-wax=""');
    expect(coated).toBeGreaterThan(0);
    expect(coated).toBeLessThan(strokes);
    // Undercoat has a dense clip, but is not masked by paper pores.
    const undercoatTag=finished.slice(finished.lastIndexOf("<path",coated),finished.indexOf(">",coated)+1);
    expect(undercoatTag).toContain('clip-path="url(#');
    expect(undercoatTag).not.toContain("mask=");
    expect(undercoatTag).not.toContain("opacity=");
    expect(finished).toEqual(sample(120,"opaque"));
  });
  it("retains airy backgrounds and staged build-up without premature fills",()=>{
    const open=sample(120,"open");
    expect(open).toContain('data-km-crayon-coverage="open"');
    expect(open).not.toContain('data-km-crayon-underpaint="opaque"');
    expect(open).toContain('opacity="0.15"');
    const early=sample(23,"opaque");
    expect(early).toContain('data-km-crayon-coverage="opaque"');
    expect(early).not.toContain('data-km-crayon-underpaint="opaque"');
    const painting=sample(82,"opaque");
    expect(painting).toContain('data-km-crayon-underpaint="opaque"');
    expect(painting).not.toEqual(sample(120,"opaque"));
    expect(sample(23,"opaque",true)).toContain('data-km-crayon-underpaint="opaque"');
    expect(()=>sample(120,"invalid" as "open")).toThrow(/coverage/);
  });
  it("marks actor and foreground mass opaque across original films, preserves scenery",()=>{
    for(const aspect of ["portrait","landscape"] as const){
      const scenes=[
        crayonPerformanceScene(aspect),crayonWalkScene(aspect),
        crayonCharacterDrawScene(aspect),crayonDragonVillageScene(aspect),
        crayonDemoScene("city",aspect),
      ];
      for(const scene of scenes){
        expect(inspectCrayonScene(scene)).toEqual([]);
        const actor=scene.elements.filter(e=>e.kind==="wax"&&(
          /^(dragon|friend|owl|body|head|tail|foot|bird-body|bird-wing|house-|roof-)/.test(e.id)));
        expect(actor.length).toBeGreaterThan(0);
        actor.forEach(e=>{
          if(e.kind==="wax")expect(e.coverage).toBe("opaque");
        });
      }
      const dragon=crayonDragonVillageScene(aspect);
      expect(dragon.elements.find(e=>e.id==="sky-paper")).toMatchObject({coverage:"open"});
      expect(dragon.elements.find(e=>e.id==="castle-main")).toMatchObject({coverage:"opaque"});
      expect(dragon.elements.find(e=>e.id==="dragon-wing-near")).toMatchObject({coverage:"opaque",angle:23});
      const html=renderToStaticMarkup(<CrayonScene spec={dragon} frame={329}/>);
      expect(html).toContain('data-km-crayon-underpaint="opaque"');
      expect(html).toContain('data-km-crayon-coverage="open"');
      expect(html).toEqual(renderToStaticMarkup(<CrayonScene spec={dragon} frame={329}/>));
    }
  });
  it("rejects invalid coverage values at the serializable scene boundary",()=>{
    const scene=crayonPerformanceScene("landscape");
    const elements=scene.elements.map(node=>node.id==="body"
      ? {...node,coverage:"lacquer"} : node);
    expect(inspectCrayonScene({...scene,elements}).join(" ")).toMatch(/coverage/);
    expect(inspectCrayonScene({...scene,elements:scene.elements}).join(" ")).toBe("");
  });
});
