import {describe,it,expect} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {CrayonScene} from "../registry/video/materials/crayon-scene-react";
import {inspectCrayonScene} from "../registry/video/materials/crayon-scene";
import {crayonCc0FaceStudy} from "../src/video/crayon-artcraft-cc0-face";
import {CRAYON_F1_V56_IDS,CRAYON_F1_V56_SOURCE,
  crayonF1SourceOuterHairV56}
  from "../src/video/crayon-artcraft-f1-anat1-outer-hair-v56";
import {Cc0Anat1HairTopV56,Cc0Anat1HairCrownV56,
  Cc0Anat1HairRightV56} from "../src/video/crayon-artcraft-adult-face.stories";
const study=(form:"source-anat1-superior-tarsus-v54"|"source-anat1-hair-top-v56",
  detail=1,lashFinish:"sparse"|"rooted-flow"="sparse")=>
  crayonCc0FaceStudy({midfaceForm:form,detail,lashFinish});
describe("ArtCraft V56 original photographed hair silhouette not wax stripes",()=>{
  it("pins original CC0 hash and 22 independent photo/render top edge stations",()=>{
    expect(CRAYON_F1_V56_SOURCE.sha).toBe(
      "f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2");
    expect(CRAYON_F1_V56_SOURCE.x).toHaveLength(22);
    expect(CRAYON_F1_V56_SOURCE.originalY).toHaveLength(22);
    expect(CRAYON_F1_V56_SOURCE.artisticApproval).toBe(false);
    expect(CRAYON_F1_V56_SOURCE.originalY[19]-CRAYON_F1_V56_SOURCE.v54Y[19]).toBeGreaterThan(65);
  });
  it("preserves every original fine-grained fiber, pigment, source face and entire 300-frame film",()=>{
    for(const detail of [.2,1] as const)
    for(const lashFinish of ["sparse","rooted-flow"] as const){
      const a=study("source-anat1-superior-tarsus-v54",detail,lashFinish);
      const b=study("source-anat1-hair-top-v56",detail,lashFinish);
      expect(inspectCrayonScene(a)).toEqual([]);
      expect(inspectCrayonScene(b)).toEqual([]);
      for(const k of ["id","width","height","durationFrames","seed","paper",
        "paperTooth","camera"] as const)expect(a[k]).toEqual(b[k]);
      expect(b.durationFrames).toBe(300);
      expect(b.elements).toHaveLength(a.elements.length);
      const modified:string[]=[];
      b.elements.forEach((item,i)=>{
        const old=a.elements[i];
        if(CRAYON_F1_V56_IDS.includes(item.id as typeof CRAYON_F1_V56_IDS[number])){
          if(item.kind!=="wax"||old.kind!=="wax")throw Error("Missing physical hair wax");
          modified.push(item.id);
          expect(item.d).not.toEqual(old.d);
          expect(item).toEqual({...old,d:item.d});
          expect(item.d.endsWith("Z")).toBe(true);
        }else expect(item).toEqual(old);
      });
      expect(modified.sort()).toEqual([...CRAYON_F1_V56_IDS].sort());
      expect(b.elements.filter(x=>x.id.startsWith("hair-rooted-")))
        .toEqual(a.elements.filter(x=>x.id.startsWith("hair-rooted-")));
      expect(study("source-anat1-hair-top-v56",detail,lashFinish).elements)
        .toEqual(b.elements);
    }
  });
  it("fails closed on missing original source masses, repeated application and rejected V51 fibers",()=>{
    const a=study("source-anat1-superior-tarsus-v54");
    expect(()=>crayonF1SourceOuterHairV56([])).toThrow(RangeError);
    for(const id of ["hair-back","hair-crown-surface","hair-right-curtain",
      "hair-left-curtain","hair-rooted-right-0","face-outline","iris-near"])
      expect(()=>crayonF1SourceOuterHairV56(a.elements.filter(x=>x.id!==id)))
        .toThrow(RangeError);
    expect(()=>crayonF1SourceOuterHairV56([...a.elements,a.elements[0]])).toThrow(RangeError);
    expect(()=>crayonF1SourceOuterHairV56(
      crayonF1SourceOuterHairV56(a.elements))).toThrow(RangeError);
    expect(()=>crayonF1SourceOuterHairV56([
      ...a.elements,{...a.elements[0],id:"hair-source-lock-right-0"}])).toThrow(RangeError);
  });
  it("retains native grain/paper contact and full/crown/right !dev Storybook states",()=>{
    for(const s of [Cc0Anat1HairTopV56,Cc0Anat1HairCrownV56,
      Cc0Anat1HairRightV56])expect(s.name).toContain("!dev");
    const html=renderToStaticMarkup(<CrayonScene spec={
      study("source-anat1-hair-top-v56",.2)} frame={299}/>);
    for(const id of CRAYON_F1_V56_IDS)
      expect(html).toContain('data-km-crayon-element="'+id+'"');
    expect(html).toContain('data-km-crayon-paper-contact-wax');
    expect(html).not.toContain("<image");
  },60_000);
});
