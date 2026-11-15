import {describe,expect,it} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {CrayonScene} from "../registry/video/materials/crayon-scene-react";
import {inspectCrayonScene} from "../registry/video/materials/crayon-scene";
import {crayonCc0FaceStudy}
  from "../src/video/crayon-artcraft-cc0-face";
import {auditCrayonF1LashRootContinuity,CRAYON_F1_LASH_CLUSTER_COUNTS}
  from "../src/video/crayon-artcraft-f1-lash-clusters";

/**
 * ArtCraft source-observed continuity gate, NOT art/likeness acceptance.
 * Source camera: fixed 608x1082 Campbell CC0 browser capture.
 * Root means the thick terminal deposition end of each reversed cubic.
 */
describe("ArtCraft F1 wax lash root attachment to photographed tarsal rim",()=>{
  it("keeps all 47 irregular wax fibres attached across source-eye value and material detail",()=>{
    for(const eyeContact of ["source-shade","source-value"] as const){
      for(const detail of [.2,.6,1]){
        const spec=crayonCc0FaceStudy({eyeContact,detail,
          lashFinish:"rooted",midfaceForm:"baseline",jawNeckForm:"baseline"});
        const audit=auditCrayonF1LashRootContinuity(spec.elements);
        expect(audit.near.count).toBe(CRAYON_F1_LASH_CLUSTER_COUNTS.near);
        expect(audit.far.count).toBe(CRAYON_F1_LASH_CLUSTER_COUNTS.far);
        expect(audit.near.detached).toBe(0);
        expect(audit.far.detached).toBe(0);
        expect(audit.near.maximumDistance).toBeLessThan(5.5);
        expect(audit.far.maximumDistance).toBeLessThan(5.5);
        expect(inspectCrayonScene(spec)).toEqual([]);
      }
    }
  });

  it("retains true old negative control and changes only the opt-in lash contours",()=>{
    for(const eyeContact of ["baseline","source-shade","source-value"] as const){
      const sparse=crayonCc0FaceStudy({eyeContact,lashFinish:"sparse"});
      const rooted=crayonCc0FaceStudy({eyeContact,lashFinish:"rooted"});
      expect(rooted.seed).toBe(sparse.seed);
      expect(rooted.camera).toEqual(sparse.camera);
      expect(rooted.durationFrames).toBe(sparse.durationFrames);
      expect(rooted.paperTooth).toBe(sparse.paperTooth);
      if(eyeContact==="baseline"){
        expect(rooted).toEqual(sparse);
        continue;
      }
      const lashNames=new Set(["lash-contact-near","lash-contact-far"]);
      expect(rooted.elements.filter(e=>!lashNames.has(e.id)))
        .toEqual(sparse.elements.filter(e=>!lashNames.has(e.id)));
      for(const id of lashNames){
        const before=sparse.elements.find(e=>e.id===id);
        const after=rooted.elements.find(e=>e.id===id);
        expect(after?.kind).toBe("contour");
        expect(after?.timing).toEqual(before?.timing);
        expect(after?.parentId).toBe(before?.parentId);
        expect(after?.d).not.toBe(before?.d);
      }
    }
  });

  it("detects spatially floating deposits even when fibre counts and paths are valid",()=>{
    const scene=crayonCc0FaceStudy({eyeContact:"source-value",lashFinish:"rooted"});
    const displaced=scene.elements.map(element=>element.kind==="contour"&&
      element.id==="lash-contact-near"
      ?{...element,d:element.d.replace(
        "M215 555 C216 557 217 558 218 558",
        "M215 555 C216 557 217 558 218 490")}
      :element);
    const audit=auditCrayonF1LashRootContinuity(displaced);
    expect(audit.near.count).toBe(33);
    expect(audit.near.detached).toBeGreaterThan(0);
    expect(audit.far.detached).toBe(0);
    expect(auditCrayonF1LashRootContinuity(scene.elements).near.detached).toBe(0);
    expect(()=>auditCrayonF1LashRootContinuity(scene.elements,0))
      .toThrow(RangeError);
    expect(()=>auditCrayonF1LashRootContinuity(scene.elements,NaN))
      .toThrow(RangeError);
    expect(()=>auditCrayonF1LashRootContinuity(scene.elements,21))
      .toThrow(RangeError);
  });

  it("rejects missing, malformed and duplicate source lash roots",()=>{
    const scene=crayonCc0FaceStudy({eyeContact:"source-shade",lashFinish:"rooted"});
    const near=scene.elements.find(e=>e.id==="lash-contact-near");
    if(near?.kind!=="contour")throw Error("Missing native source contour");
    expect(()=>auditCrayonF1LashRootContinuity(
      scene.elements.filter(e=>e.id!=="lash-contact-near"),
    )).toThrow(RangeError);
    expect(()=>auditCrayonF1LashRootContinuity([...scene.elements,near]))
      .toThrow(RangeError);
    expect(()=>auditCrayonF1LashRootContinuity(scene.elements.map(e=>
      e.id==="lash-contact-near"?{...near,d:"M0 0 C1 2"}:e),
    )).toThrow(RangeError);
  });

  it("renders true CRAYON1 source wax and remains honest about art release",()=>{
    const scene=crayonCc0FaceStudy({eyeContact:"source-value",lashFinish:"rooted"});
    const html=renderToStaticMarkup(<CrayonScene spec={scene} frame={299}/>);
    expect(html).toContain('data-km-crayon-element="lash-contact-near"');
    expect(html).toContain('data-km-crayon-element="lash-contact-far"');
    expect(html).toContain('data-km-crayon-fiber-contact="dry-wax"');
    expect(html).toContain('data-km-crayon-element="tarsal-shelf-near"');
    expect(html).toContain('data-km-crayon-element="tarsal-shelf-far"');
  });
});
