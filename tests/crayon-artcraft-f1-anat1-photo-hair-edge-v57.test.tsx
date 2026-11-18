import {describe,it,expect} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {CrayonScene} from "../registry/video/materials/crayon-scene-react";
import {inspectCrayonScene} from "../registry/video/materials/crayon-scene";
import {crayonCc0FaceStudy} from "../src/video/crayon-artcraft-cc0-face";
import {CRAYON_F1_V57_SOURCE,crayonF1PhotographicHairEdgeV57}
  from "../src/video/crayon-artcraft-f1-anat1-photo-hair-edge-v57";
import {CRAYON_F1_V56_IDS} from "../src/video/crayon-artcraft-f1-anat1-outer-hair-v56";
import {Cc0Anat1SourceHairEdgeV57,Cc0Anat1SourceHairCrownV57,
  Cc0Anat1SourceHairRightV57}
  from "../src/video/crayon-artcraft-adult-face.stories";
const scene=(variant:"source-anat1-hair-top-v56"|"source-anat1-hair-edge-v57",
  detail=1,finish:"sparse"|"rooted-flow"="sparse")=>
  crayonCc0FaceStudy({detail,lashFinish:finish,midfaceForm:variant});
describe("ArtCraft V57 source measured outer crown residual contour",()=>{
  it("pins exact CC0 source and 22 real remaining top-edge witness stations",()=>{
    expect(CRAYON_F1_V57_SOURCE.sha).toBe(
      "f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2");
    expect(CRAYON_F1_V57_SOURCE.observedX).toHaveLength(22);
    expect(CRAYON_F1_V57_SOURCE.v56RenderedTop).toHaveLength(22);
    expect(CRAYON_F1_V57_SOURCE.acceptedForRelease).toBe(false);
    expect(CRAYON_F1_V57_SOURCE.observedTop[19]-
      CRAYON_F1_V57_SOURCE.v56RenderedTop[19]).toBeGreaterThan(15);
  });
  it("retains complete V56 film and every pigment/fiber/face/brow/eye shape except 3 top hair cubic envelopes",()=>{
    for(const detail of [.2,1] as const)
    for(const finish of ["sparse","rooted-flow"] as const){
      const old=scene("source-anat1-hair-top-v56",detail,finish);
      const next=scene("source-anat1-hair-edge-v57",detail,finish);
      expect(inspectCrayonScene(old)).toEqual([]);
      expect(inspectCrayonScene(next)).toEqual([]);
      for(const key of ["id","width","height","durationFrames","seed",
        "paper","paperTooth","camera"] as const)
        expect(next[key]).toEqual(old[key]);
      expect(next.durationFrames).toBe(300);
      expect(next.elements.length).toEqual(old.elements.length);
      const changed:string[]=[];
      next.elements.forEach((el,i)=>{
        const previous=old.elements[i];
        if(CRAYON_F1_V56_IDS.includes(el.id as typeof CRAYON_F1_V56_IDS[number])){
          expect(previous.kind).toBe("wax");expect(el.kind).toBe("wax");
          if(el.kind!=="wax"||previous.kind!=="wax")throw Error("Lost source hair wax");
          expect(el.d).not.toBe(previous.d);
          expect(el).toEqual({...previous,d:el.d});
          expect(el.d.endsWith("Z")).toBe(true);
          changed.push(el.id);
        }else expect(el).toEqual(previous);
      });
      expect(changed.sort()).toEqual([...CRAYON_F1_V56_IDS].sort());
      expect(next.elements.filter(x=>x.id.startsWith("hair-rooted-")))
        .toEqual(old.elements.filter(x=>x.id.startsWith("hair-rooted-")));
      expect(scene("source-anat1-hair-edge-v57",detail,finish).elements)
        .toEqual(next.elements);
    }
  });
  it("rejects alien originals, duplicate source hair and repeat application",()=>{
    const before=scene("source-anat1-hair-top-v56");
    expect(()=>crayonF1PhotographicHairEdgeV57([])).toThrow(RangeError);
    expect(()=>crayonF1PhotographicHairEdgeV57([...before.elements,before.elements[0]]))
      .toThrow(RangeError);
    for(const id of ["hair-back","hair-crown-surface","hair-right-curtain",
      "hair-left-curtain","hair-rooted-crown-0","iris-near","face-outline"])
      expect(()=>crayonF1PhotographicHairEdgeV57(
        before.elements.filter(x=>x.id!==id))).toThrow(RangeError);
    expect(()=>crayonF1PhotographicHairEdgeV57(
      crayonF1PhotographicHairEdgeV57(before.elements))).toThrow(RangeError);
    expect(()=>crayonF1PhotographicHairEdgeV57([...before.elements,
      {...before.elements[0],id:"hair-source-lock-right-0"}])).toThrow(RangeError);
  });
  it("exposes three opt-in original photo comparison Storybooks, native paper/wax",()=>{
    for(const story of [Cc0Anat1SourceHairEdgeV57,Cc0Anat1SourceHairCrownV57,
      Cc0Anat1SourceHairRightV57])expect(story.name).toContain("!dev");
    const html=renderToStaticMarkup(<CrayonScene spec={
      scene("source-anat1-hair-edge-v57",.2)} frame={299}/>);
    for(const id of CRAYON_F1_V56_IDS)
      expect(html).toContain('data-km-crayon-element="'+id+'"');
    expect(html).toContain('data-km-crayon-paper-contact-wax');
    expect(html).not.toContain("<image");
  },60_000);
});
