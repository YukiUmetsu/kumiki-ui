import {describe,it,expect} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {inspectCrayonScene} from "../registry/video/materials/crayon-scene";
import {CrayonScene} from "../registry/video/materials/crayon-scene-react";
import {crayonCc0FaceStudy} from "../src/video/crayon-artcraft-cc0-face";
import {CRAYON_F1_V54_IDS,CRAYON_F1_V54_SOURCE,
  crayonF1SourceSuperiorTarsusV54}
  from "../src/video/crayon-artcraft-f1-anat1-superior-tarsus-v54";
import {Cc0Anat1SuperiorTarsusV54,Cc0Anat1SuperiorEyeV54,
  Cc0Anat1SuperiorFaceV54}
  from "../src/video/crayon-artcraft-adult-face.stories";
const study=(form:"source-anat1-photo-hair-face-v52"|"source-anat1-superior-tarsus-v54",
  detail=1,lashFinish:"sparse"|"rooted-flow"="sparse")=>
  crayonCc0FaceStudy({midfaceForm:form,detail,lashFinish});
describe("ArtCraft V54 source measured tarsus-only from V52",()=>{
  it("pins original photo hash and isolates only two shape IDs",()=>{
    expect(CRAYON_F1_V54_SOURCE.originalSha).toBe(
      "f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2");
    expect(CRAYON_F1_V54_SOURCE.approved).toBe(false);
    expect(CRAYON_F1_V54_IDS).toEqual(["upper-lid-near","lash-root-near"]);
  });
  it("changes exactly two geometries and preserves 300 frames and ALL other wax microdetails",()=>{
    for(const detail of [.2,1] as const)
    for(const finish of ["sparse","rooted-flow"] as const){
      const b=study("source-anat1-photo-hair-face-v52",detail,finish);
      const a=study("source-anat1-superior-tarsus-v54",detail,finish);
      expect(inspectCrayonScene(b)).toEqual([]);
      expect(inspectCrayonScene(a)).toEqual([]);
      for(const key of ["id","width","height","durationFrames","seed","paper",
        "paperTooth","camera"] as const)expect(a[key]).toEqual(b[key]);
      expect(a.durationFrames).toBe(300);
      expect(a.elements).toHaveLength(b.elements.length);
      a.elements.forEach((x,i)=>{
        const y=b.elements[i];
        if(CRAYON_F1_V54_IDS.includes(x.id as typeof CRAYON_F1_V54_IDS[number])){
          expect(x.kind).toBe("wax");expect(y.kind).toBe("wax");
          if(x.kind!=="wax"||y.kind!=="wax")throw Error("Missing source tarsal wax");
          expect(x.d).not.toBe(y.d);
          const {d,angle,bounds,...rest}=x;
          const {d:oldD,angle:oldAngle,bounds:oldBounds,...original}=y;
          expect(rest).toEqual(original);
          expect(bounds.width).toBeGreaterThan(50);
        }else expect(x).toEqual(y);
      });
      expect(study("source-anat1-superior-tarsus-v54",detail,finish).elements)
        .toEqual(a.elements);
    }
  });
  it("rejects twice-composed source, missing original eye and altered photo base",()=>{
    const a=study("source-anat1-photo-hair-face-v52");
    expect(()=>crayonF1SourceSuperiorTarsusV54([])).toThrow(RangeError);
    for(const id of ["face-outline","upper-lid-near","lash-root-near",
      "iris-near","hair-crown-surface"])
      expect(()=>crayonF1SourceSuperiorTarsusV54(a.elements.filter(x=>x.id!==id)))
        .toThrow(RangeError);
    expect(()=>crayonF1SourceSuperiorTarsusV54([...a.elements,a.elements[0]]))
      .toThrow(RangeError);
    expect(()=>crayonF1SourceSuperiorTarsusV54(
      crayonF1SourceSuperiorTarsusV54(a.elements))).toThrow(RangeError);
  });
  it("exposes three opt-in Storybook views, original wax grain and iris geometry",()=>{
    for(const s of [Cc0Anat1SuperiorTarsusV54,Cc0Anat1SuperiorEyeV54,
      Cc0Anat1SuperiorFaceV54])expect(s.name).toContain("!dev");
    const html=renderToStaticMarkup(<CrayonScene spec={
      study("source-anat1-superior-tarsus-v54",.2)} frame={299}/>);
    for(const id of CRAYON_F1_V54_IDS)
      expect(html).toContain('data-km-crayon-element="'+id+'"');
    expect(html).toContain('data-km-crayon-paper-contact-wax');
    expect(html).not.toContain("<image");
  },60_000);
});
