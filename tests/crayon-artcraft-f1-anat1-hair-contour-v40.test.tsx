import {describe,it,expect} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {CrayonScene} from "../registry/video/materials/crayon-scene-react";
import {inspectCrayonScene} from "../registry/video/materials/crayon-scene";
import type {CrayonElement} from "../registry/video/materials/crayon-scene";
import {crayonCc0FaceStudy} from "../src/video/crayon-artcraft-cc0-face";
import {
  CRAYON_F1_V40_HAIR_MASSES,CRAYON_F1_V40_HAIR_SOURCE,
  crayonF1ReconstructHairContourV40,
} from "../src/video/crayon-artcraft-f1-anat1-hair-contour-v40";
import {
  Cc0Anat1HairSilhouetteV40,Cc0Anat1HairSilhouetteCrownV40,
  Cc0Anat1HairSilhouetteRightV40,Cc0Anat1HairSilhouetteLeftV40,
} from "../src/video/crayon-artcraft-adult-face.stories";

const by=(items:readonly CrayonElement[],id:string)=>items.find(e=>e.id===id);
const rooted=(id:string)=>/^hair-rooted-(crown|left|right)-[0-5]$/.test(id);

describe("ArtCraft V40 source asymmetry, nonrectangular dry wax and native hair depth",()=>{
  it("keeps all V39 source strands, ANAT1 face, paper, camera, pigments and film",()=>{
    expect(CRAYON_F1_V40_HAIR_SOURCE.approval).toBe(false);
    expect(CRAYON_F1_V40_HAIR_MASSES).toHaveLength(4);
    for(const detail of [.2,1] as const){
      const control=crayonCc0FaceStudy({detail,midfaceForm:"source-anat1-rooted-hair-v39"});
      const candidate=crayonCc0FaceStudy({detail,midfaceForm:"source-anat1-hair-contour-v40"});
      expect(inspectCrayonScene(control)).toEqual([]);
      expect(inspectCrayonScene(candidate)).toEqual([]);
      for(const key of ["id","width","height","seed","durationFrames",
        "camera","paper","paperTooth"] as const)
        expect(candidate[key]).toEqual(control[key]);
      expect(candidate.durationFrames).toBe(300);
      expect(candidate.elements.map(e=>e.id)).toEqual(control.elements.map(e=>e.id));
      let waxChanged=0,fibersRefined=0;
      for(const before of control.elements){
        const after=by(candidate.elements,before.id);
        if(!after)throw Error("V40 erased original detail: "+before.id);
        if(CRAYON_F1_V40_HAIR_MASSES.some(id=>id===before.id)){
          if(before.kind!=="wax"||after.kind!=="wax")
            throw Error("Missing original wax silhouette "+before.id);
          expect(after.d).not.toEqual(before.d);
          for(const key of ["id","kind","colors","bounds","timing","pressure",
            "deposition","coverage","markStrength","underpaintTooth",
            "opaqueBurnish","underpaintGradient","edgeRoughness",
            "nibStyle","spacing","parentId","clipToParent",
            "outlineOpacity"] as const)
            expect(after[key]).toEqual(before[key]);
          expect(after.d.length).toBeGreaterThan(120);
          waxChanged++;
        }else if(rooted(before.id)){
          if(before.kind!=="contour"||after.kind!=="contour")
            throw Error("Lost natural rooted hair "+before.id);
          // Every V39 cubic strand, source direction, pigment and clipping
          // is exactly preserved. Narrow the stamp; never delete the detail.
          expect(after.d).toBe(before.d);
          expect(after.width).toBeLessThan(before.width);
          expect(after.width).toBeGreaterThanOrEqual(.19);
          expect(after.waxContact).toBe("dry-wax");
          expect(after.waxPressure).toBeGreaterThanOrEqual(.5);
          for(const key of ["kind","id","parentId","clipToParent",
            "color","opacity","timing","motion","pivot"] as const)
            expect(after[key]).toEqual(before[key]);
          fibersRefined++;
        }else expect(after).toEqual(before);
      }
      expect(waxChanged).toBe(4);
      if(detail===1)expect(fibersRefined).toBe(18);
      else expect(fibersRefined).toBeGreaterThanOrEqual(3);
    }
  });

  it("rejects detached/malformed source volumes instead of silently flattening",()=>{
    const old=crayonCc0FaceStudy({midfaceForm:"source-anat1-rooted-hair-v39"});
    expect(()=>crayonF1ReconstructHairContourV40([])).toThrow(RangeError);
    expect(()=>crayonF1ReconstructHairContourV40(old.elements.filter(el=>
      el.id!=="hair-crown-surface"))).toThrow(RangeError);
    expect(()=>crayonF1ReconstructHairContourV40(old.elements.filter(el=>
      !el.id.startsWith("hair-rooted-left-")))).toThrow(RangeError);
    const back=by(old.elements,"hair-back");
    if(!back)throw Error("Lost baseline hair background");
    expect(()=>crayonF1ReconstructHairContourV40([...old.elements,back]))
      .toThrow(RangeError);
    expect(()=>crayonF1ReconstructHairContourV40(old.elements.map(el=>
      el.id==="hair-right-curtain"?{...el,d:"M0 0Z"}:el))).toThrow(RangeError);
    expect(()=>crayonF1ReconstructHairContourV40(old.elements.map(el=>
      el.id==="hair-rooted-right-0"?
        {...el,parentId:"face-outline"}:el))).toThrow(RangeError);
  });

  it("renders native paper, fine crayon fiber and original character in !dev scenes",()=>{
    for(const story of [Cc0Anat1HairSilhouetteV40,
      Cc0Anat1HairSilhouetteCrownV40,Cc0Anat1HairSilhouetteRightV40,
      Cc0Anat1HairSilhouetteLeftV40])
      expect(story.name).toContain("!dev");
    const spec=crayonCc0FaceStudy({detail:.2,
      midfaceForm:"source-anat1-hair-contour-v40"});
    const html=renderToStaticMarkup(<CrayonScene spec={spec} frame={299}/>);
    for(const id of ["hair-back","hair-crown-surface","hair-left-curtain",
      "hair-right-curtain","hair-rooted-crown-0","hair-rooted-left-0",
      "hair-rooted-right-0","iris-near","iris-far",
      "source-brow-follicles-near","naris-shadow-near","chin-plane"])
      expect(html).toContain('data-km-crayon-element="'+id+'"');
    expect(html).toContain('data-km-crayon-fiber-contact="dry-wax"');
    expect(html).toContain('data-km-crayon-paper-contact-wax');
    expect(html).not.toContain("<image");
    expect(html).not.toContain("<foreignObject");

  },60_000);
});
