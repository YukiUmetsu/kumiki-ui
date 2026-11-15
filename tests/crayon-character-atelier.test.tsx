import {describe,expect,it} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {inspectCrayonScene,crayonDrawingAt} from "../registry/video/materials/crayon-scene";
import {CrayonScene} from "../registry/video/materials/crayon-scene-react";
import {crayonIllustratedChildScene} from "../src/video/crayon-character-atelier-fixtures";
import {CrayonPlayground} from "../src/video/crayon-scene-playground";
import {crayonSceneDefaultArgs} from "../src/video/crayon-scene-story-config";

describe("ArtCraft source-first illustrated child",()=>{
  for(const aspect of ["landscape","portrait"] as const){
    it("validates authored parts and stable silhouette layering in "+aspect,()=>{
      for(const mode of ["acting","walk","draw-in"] as const){
        const scene=crayonIllustratedChildScene(aspect,{mode});
        expect(inspectCrayonScene(scene)).toEqual([]);
        expect(scene.durationFrames).toBe(mode==="draw-in"?450:270);
        expect(scene.elements.length).toBeLessThan(240);
        const ids=scene.elements.map(node=>node.id);
        expect(new Set(ids).size).toBe(ids.length);
        for(const id of ["coat-body","face","hair-back","hair-fringe-left",
          "eye-left-sclera","eye-left-iris","eye-left-pupil",
          "eye-right-sclera","eye-right-iris","eye-right-pupil",
          "left-ear","right-ear","nose-bridge","mouth-expression",
          "scarf-wrap","scarf-tail","scarf-plaid-weft",
          "dress-hem-lace","coat-left-lapel","coat-right-lapel",
          "boot-back","boot-front","satchel-body","satchel-flap",
          "coat-pocket-stitch","boot-left-lacing"]){
          expect(ids,mode+" missing "+id).toContain(id);
        }
        for(const node of scene.elements.filter(el=>el.kind==="wax"&&
          !["paper-distant-hills","soft-cloud","ground-shadow",
            "cheek-left-blush","cheek-right-blush"].includes(el.id))){
          expect(node.kind==="wax"&&node.coverage,mode+" "+node.id).toBe("opaque");
        }
        expect(scene.elements.find(el=>el.id==="hair-back")?.parentId).toBe("face");
        expect(scene.elements.find(el=>el.id==="scarf-plaid-weft")?.parentId).toBe("scarf-wrap");
        expect(scene.elements.find(el=>el.id==="scarf-plaid-weft"&&el.kind==="contour")?.kind).toBe("contour");
      }
    });
    it("has blinking paint that actually blocks both iris silhouettes in "+aspect,()=>{
      const scene=crayonIllustratedChildScene(aspect);
      const left=scene.elements.find(x=>x.id==="eye-left-blink-wax");
      const right=scene.elements.find(x=>x.id==="eye-right-blink-wax");
      if(left?.kind!=="wax"||right?.kind!=="wax")throw new Error("Missing painted eyelid");
      expect(left.coverage).toBe("opaque");
      expect(right.coverage).toBe("opaque");
      expect(crayonDrawingAt(left,99).d).not.toBe(crayonDrawingAt(left,109).d);
      expect(crayonDrawingAt(right,99).d).not.toBe(crayonDrawingAt(right,109).d);
      const final=renderToStaticMarkup(<CrayonScene spec={scene} frame={239}/>);
      expect(final).toContain('data-km-crayon-element="coat-body"');
      expect(final).toContain('data-km-crayon-element="face"');
      expect(final).toContain('data-km-crayon-coverage="opaque"');
      expect(final).toContain('data-km-crayon-element="scarf-plaid-warp"');
    });
  }
  it("uses independently controllable mouth and brow expressions",()=>{
    for(const emotion of ["smile","wonder","concern"] as const){
      const scene=crayonIllustratedChildScene("landscape",{expression:emotion});
      const mouth=scene.elements.find(node=>node.id==="mouth-expression");
      if(mouth?.kind!=="contour")throw new Error("Missing mouth expression");
      expect(mouth.poseCues).toEqual([{frame:0,pose:emotion}]);
      expect(mouth.poses?.some(p=>p.id===emotion)).toBe(true);
    }
  });
  it("preserves genuine two-bone IK while changing the walking stride",()=>{
    const drawn=crayonIllustratedChildScene("landscape",{mode:"walk",rig:"drawn"});
    const ik=crayonIllustratedChildScene("landscape",{mode:"walk",rig:"ik",stride:1.2,stepLift:1.4});
    expect(inspectCrayonScene(ik)).toEqual([]);
    expect(drawn.elements.filter(x=>x.kind==="connector")).toHaveLength(2);
    expect(ik.elements.filter(x=>x.kind==="connector"&&x.ik)).toHaveLength(2);
    expect(drawn.elements.filter(x=>x.kind==="connector"&&x.ik)).toHaveLength(0);
    expect(drawn.elements.find(x=>x.id==="coat-body")).not.toEqual(ik.elements.find(x=>x.id==="coat-body"));
  });
  it("keeps the existing character film generators untouched while replacing Storybook artwork",()=>{
    const markup=renderToStaticMarkup(<CrayonPlayground {...crayonSceneDefaultArgs}
      subject="performance" atelierExpression="smile" startFrame={239} reducedMotion/>);
    expect(markup).toContain('data-km-crayon-scene="crayon-atelier-child-acting-landscape"');
    expect(markup).toContain('data-km-crayon-element="coat-body"');
    expect(markup).toContain('data-km-crayon-element="face"');
    expect(markup).not.toContain('data-km-crayon-scene="crayon-performance-landscape"');
    const macro=renderToStaticMarkup(<CrayonPlayground {...crayonSceneDefaultArgs}
      subject="performance" atelierCrop="face" atelierExpression="smile"
      startFrame={239} reducedMotion/>);
    expect(macro).toContain('data-km-crayon-element="face"');
    expect(macro).not.toContain('data-km-crayon-element="headline"');
  });
  it("rejects invalid material, anatomy and gait controls early",()=>{
    expect(()=>crayonIllustratedChildScene("landscape",{detail:-.1})).toThrow();
    expect(()=>crayonIllustratedChildScene("landscape",{stride:Infinity})).toThrow();
    expect(()=>crayonIllustratedChildScene("portrait",{stepLift:3})).toThrow();
    expect(()=>crayonIllustratedChildScene("landscape",{outlineFraction:.95})).toThrow();
    expect(()=>crayonIllustratedChildScene("portrait",{glaze:-1})).toThrow();
  });
});
