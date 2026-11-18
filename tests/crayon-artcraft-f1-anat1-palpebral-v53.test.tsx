import {describe,it,expect} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {CrayonScene} from "../registry/video/materials/crayon-scene-react";
import {inspectCrayonScene} from "../registry/video/materials/crayon-scene";
import {crayonCc0FaceStudy} from "../src/video/crayon-artcraft-cc0-face";
import {CRAYON_F1_V53_CHANGED_IDS,CRAYON_F1_V53_SOURCE,
  crayonF1RebuildSourcePalpebralV53,
} from "../src/video/crayon-artcraft-f1-anat1-palpebral-v53";
import {Cc0Anat1PalpebralV53,Cc0Anat1PalpebralEyeV53,
  Cc0Anat1PalpebralFaceV53,
} from "../src/video/crayon-artcraft-adult-face.stories";
const spec=(detail:number,midfaceForm:"source-anat1-photo-hair-face-v52"|
  "source-anat1-palpebral-v53",lashFinish:"sparse"|"rooted-flow"="sparse")=>
  crayonCc0FaceStudy({detail,midfaceForm,lashFinish});
describe("ArtCraft V53 CC0 photographed tarsal-pupil structural continuity",()=>{
  it("pins exact original eye landmarks and source-closed six 4-cubic profiles",()=>{
    expect(CRAYON_F1_V53_SOURCE.sha).toBe(
      "f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2");
    expect(CRAYON_F1_V53_SOURCE.releaseApproved).toBe(false);
    expect(CRAYON_F1_V53_SOURCE.outerCanthus[0]).toBeLessThan(220);
    expect(CRAYON_F1_V53_SOURCE.innerCanthus[0]).toBeGreaterThan(310);
    expect(CRAYON_F1_V53_CHANGED_IDS).toHaveLength(6);
    expect(new Set(CRAYON_F1_V53_CHANGED_IDS).size).toBe(6);
  });
  it("modifies only 6 protected existing wax paths: all other geometry and film frames are identical",()=>{
    for(const detail of [.2,1] as const)
    for(const lashFinish of ["sparse","rooted-flow"] as const){
      const a=spec(detail,"source-anat1-photo-hair-face-v52",lashFinish);
      const b=spec(detail,"source-anat1-palpebral-v53",lashFinish);
      expect(inspectCrayonScene(a)).toEqual([]);
      expect(inspectCrayonScene(b)).toEqual([]);
      for(const k of ["id","width","height","durationFrames","seed","paper",
        "paperTooth","camera"] as const)expect(b[k]).toEqual(a[k]);
      expect(b.durationFrames).toBe(300);
      expect(b.elements.length).toBe(a.elements.length);
      for(let i=0;i<b.elements.length;i++){
        const original=a.elements[i],next=b.elements[i];
        if(CRAYON_F1_V53_CHANGED_IDS.includes(next.id as typeof CRAYON_F1_V53_CHANGED_IDS[number])){
          if(original.kind!=="wax"||next.kind!=="wax")throw Error("Missing photo eye wax");
          expect(next.parentId).toBe(original.parentId);
          expect(next.clipToParent).toBe(true);
          expect(next.colors).toEqual(original.colors);
          expect(next.underpaintGradient).toEqual(original.underpaintGradient);
          expect(next.pressure).toBe(original.pressure);
          expect(next.timing).toEqual(original.timing);
          expect(next.d).not.toEqual(original.d);
          const {d,angle,bounds,...remainder}=next;
          const {d:oldD,angle:oldAngle,bounds:oldBounds,...oldRemainder}=original;
          expect(remainder).toEqual(oldRemainder);
          expect(bounds.width).toBeGreaterThan(10);
        }else expect(next).toEqual(original);
      }
      expect(b.elements.filter(x=>x.id.startsWith("hair-rooted-")))
        .toEqual(a.elements.filter(x=>x.id.startsWith("hair-rooted-")));
      expect(spec(detail,"source-anat1-palpebral-v53",lashFinish).elements)
        .toEqual(b.elements);
    }
  });
  it("fails closed with incompatible photo sources, double application and rejected V51 geometry",()=>{
    const a=spec(1,"source-anat1-photo-hair-face-v52");
    expect(()=>crayonF1RebuildSourcePalpebralV53([])).toThrow(RangeError);
    expect(()=>crayonF1RebuildSourcePalpebralV53([...a.elements,a.elements[0]]))
      .toThrow(RangeError);
    for(const id of ["face-outline","iris-near","sclera-near","upper-lid-near",
      "hair-crown-surface","hair-right-curtain"])
      expect(()=>crayonF1RebuildSourcePalpebralV53(a.elements.filter(x=>x.id!==id)))
        .toThrow(RangeError);
    const once=crayonF1RebuildSourcePalpebralV53(a.elements);
    expect(()=>crayonF1RebuildSourcePalpebralV53(once)).toThrow(RangeError);
    expect(()=>crayonF1RebuildSourcePalpebralV53([
      ...a.elements,{...a.elements[0],id:"hair-source-lock-right-0"}])).toThrow(RangeError);
  });
  it("retains real SVG paper grain and three independent !dev Storybook inspection states",()=>{
    for(const s of [Cc0Anat1PalpebralV53,Cc0Anat1PalpebralEyeV53,
      Cc0Anat1PalpebralFaceV53])
      expect(s.name).toContain("!dev");
    const html=renderToStaticMarkup(<CrayonScene spec={
      spec(.2,"source-anat1-palpebral-v53")} frame={299}/>);
    for(const id of CRAYON_F1_V53_CHANGED_IDS)
      expect(html).toContain('data-km-crayon-element="'+id+'"');
    expect(html).toContain('data-km-crayon-paper-contact-wax');
    expect(html).not.toContain("<image");
  },60_000);
});
