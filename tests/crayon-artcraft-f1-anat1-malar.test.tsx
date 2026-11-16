import {describe,it,expect} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {CrayonScene} from "../registry/video/materials/crayon-scene-react";
import {inspectCrayonScene} from "../registry/video/materials/crayon-scene";
import type {CrayonElement} from "../registry/video/materials/crayon-scene";
import {FACE_LANDMARKS,createFace,measureFace}
  from "../registry/anatomy/anatomy-face";
import {crayonCc0FaceStudy}
  from "../src/video/crayon-artcraft-cc0-face";
import {CRAYON_PORTRAIT_AUDIT}
  from "../src/video/crayon-artcraft-portrait-audit";
import {CRAYON_F1_ANAT1_SOURCE_ANCHORS,CRAYON_F1_V31_CHANGED_IDS,
  crayonF1RegisterAnat1Face,crayonF1PaintAnat1Malar}
  from "../src/video/crayon-artcraft-f1-anat1-malar";
import {Cc0Anat1MalarV31,Cc0Anat1MalarCloseV31}
  from "../src/video/crayon-artcraft-adult-face.stories";

const find=(a:readonly CrayonElement[],id:string)=>a.find(e=>e.id===id);
describe("ArtCraft F1 V31 actual ANAT1 468-vertex face source registration",()=>{
  it("uses ANAT1 3D landmarks with a single bounded photographic camera fit",()=>{
    const model=createFace({calibrate:false});
    const measured=measureFace(model.vertices);
    expect(model.vertices).toHaveLength(468);
    expect(model.mesh.pointCount).toBe(468);
    expect(measured.nSn).toBeGreaterThan(25);
    expect(measured.snGn).toBeGreaterThan(30);
    expect(FACE_LANDMARKS.pronasale).toBe(4);
    expect(FACE_LANDMARKS.menton).toBe(152);
    const fit=crayonF1RegisterAnat1Face();
    expect(fit.model).toBe("ANAT1/MediaPipe-468-unmodified");
    expect(fit.source).toBe("Campbell-CC0-608x1082");
    expect(fit.artisticApproval).toBe(false);
    expect(CRAYON_F1_ANAT1_SOURCE_ANCHORS).toHaveLength(13);
    expect(new Set(CRAYON_F1_ANAT1_SOURCE_ANCHORS).size).toBe(13);
    expect(CRAYON_F1_ANAT1_SOURCE_ANCHORS).not.toContain("face_top");
    expect(CRAYON_F1_ANAT1_SOURCE_ANCHORS).not.toContain("hairline_center");
    expect(fit.sourceError).not.toHaveProperty("face_top");
    expect(fit.rmse).toBeGreaterThan(0);
    expect(fit.rmse).toBeLessThan(40);
    expect(fit.yaw).toBeGreaterThanOrEqual(-50);
    expect(fit.yaw).toBeLessThanOrEqual(-6);
    expect(fit.pitch).toBeGreaterThanOrEqual(-12);
    expect(fit.pitch).toBeLessThanOrEqual(22);
    expect(Math.abs(fit.roll)).toBeLessThanOrEqual(18);
    expect(fit.scale).toBeGreaterThan(1);
    expect(fit.scale).toBeLessThan(6);
    for(const id of CRAYON_F1_ANAT1_SOURCE_ANCHORS){
      expect(Number.isFinite(fit.sourceError[id])).toBe(true);
    }
    for(const id of ["zygion.R","zygion.L","gonion.R","menton",
      "cheekbone.R","alare.R","pronasale"] as const){
      const p=fit.projected[id];
      expect(Number.isFinite(p[0])).toBe(true);
      expect(Number.isFinite(p[1])).toBe(true);
      expect(p[0]).toBeGreaterThan(-200);
      expect(p[0]).toBeLessThan(900);
      expect(p[1]).toBeGreaterThan(100);
      expect(p[1]).toBeLessThan(1040);
    }
    expect(fit.projected["pronasale"][0]).toBeGreaterThan(
      fit.projected["sellion"][0]);
    expect(fit.projected["gonion.R"][0]).toBeLessThan(
      fit.projected["gonion.L"][0]);
    expect(Number.isFinite(fit.nearCheekNormalLight)).toBe(true);
    expect(Number.isFinite(fit.farCheekNormalLight)).toBe(true);
    expect(CRAYON_PORTRAIT_AUDIT.source.sha256)
      .toBe("f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2");
    expect(crayonF1RegisterAnat1Face()).toBe(fit); // stable, cached
  });
  it("directs a real 3D cheek wax contour without changing any unrelated anatomy",()=>{
    const original=crayonCc0FaceStudy({midfaceForm:"source-mandibular-turn"});
    const v31=crayonCc0FaceStudy({midfaceForm:"source-anat1-malar"});
    expect(CRAYON_F1_V31_CHANGED_IDS).toEqual(["cheek-malar-bounce"]);
    expect(inspectCrayonScene(original)).toEqual([]);
    expect(inspectCrayonScene(v31)).toEqual([]);
    expect(v31.elements).toHaveLength(original.elements.length);
    expect(v31.elements.filter(e=>e.id!=="cheek-malar-bounce"))
      .toEqual(original.elements.filter(e=>e.id!=="cheek-malar-bounce"));
    for(const k of ["id","width","height","durationFrames","camera","seed",
      "paper","paperTooth"] as const)expect(v31[k]).toEqual(original[k]);
    const old=find(original.elements,"cheek-malar-bounce");
    const next=find(v31.elements,"cheek-malar-bounce");
    if(old?.kind!=="wax"||next?.kind!=="wax")throw Error("No malar wax");
    expect(next.d).not.toBe(old.d);
    expect(next.d).toMatch(/^M[\d.\s]+C.*Z$/);
    expect(next.d.match(/C/g)?.length).toBe(4);
    expect(next.d.match(/M/g)?.length).toBe(1);
    expect(next.bounds.width).toBeGreaterThan(60);
    expect(next.bounds.height).toBeGreaterThan(100);
    expect(next.angle).toBeGreaterThan(-70);
    expect(next.angle).toBeLessThan(70);
    expect(next.parentId).toBe("face-outline");
    expect(next.clipToParent).toBe(true);
    expect(next.colors).toEqual(old.colors);
    expect(next.coverage).toBe(old.coverage);
    expect(next.underpaintGradient).toEqual(old.underpaintGradient);
    expect(next.markStrength).toBe(old.markStrength);
    expect(next.pressure).toBe(old.pressure);
    expect(next.featherContacts).toBe(old.featherContacts);
    expect(next.deposition).toBe(old.deposition);
    expect(next.timing).toEqual(old.timing);
    expect(next.motion).toEqual(old.motion);
    expect(next.pivot).toEqual(old.pivot);
    expect(v31.durationFrames).toBe(300);
  });
  it("fails closed for damaged ANAT1 skin attachment and for duplicate edits",()=>{
    const baseline=crayonCc0FaceStudy({midfaceForm:"source-mandibular-turn"});
    const v31=crayonCc0FaceStudy({midfaceForm:"source-anat1-malar"});
    const old=find(baseline.elements,"cheek-malar-bounce");
    if(!old)throw Error("No original light");
    expect(()=>crayonF1PaintAnat1Malar(
      baseline.elements.filter(e=>e.id!=="cheek-malar-bounce")))
      .toThrow(RangeError);
    expect(()=>crayonF1PaintAnat1Malar([...baseline.elements,old]))
      .toThrow(RangeError);
    expect(()=>crayonF1PaintAnat1Malar(v31.elements)).toThrow(RangeError);
    expect(()=>crayonF1PaintAnat1Malar(
      baseline.elements.map(e=>e.id==="cheek-malar-bounce"?
        {...e,clipToParent:false}:e))).toThrow(RangeError);
    expect(()=>crayonF1PaintAnat1Malar(
      baseline.elements.map(e=>e.id==="cheek-malar-bounce"?
        {...e,kind:"contour"} as CrayonElement:e))).toThrow(RangeError);
  });
  it("renders CRAYON1 native 300-frame low-detail scene and kept-in-lab stories",()=>{
    expect(Cc0Anat1MalarV31.name).toContain("!dev");
    expect(Cc0Anat1MalarCloseV31.name).toContain("!dev");
    for(const jawNeckForm of ["baseline","source-contour"] as const){
      const scene=crayonCc0FaceStudy({detail:.2,midfaceForm:"source-anat1-malar",
        jawNeckForm,eyeContact:"source-shade"});
      expect(inspectCrayonScene(scene)).toEqual([]);
      const html=renderToStaticMarkup(<CrayonScene spec={scene} frame={299}/>);
      expect(html).toContain('data-km-crayon-element="cheek-malar-bounce"');
      expect(html).toContain('data-km-crayon-element="face-outline"');
      expect(html).toContain("data-km-crayon-paper-contact-wax");
      expect(html).not.toContain("<image");
      expect(html).not.toContain("<foreignObject");
    }
  },40_000);
});
