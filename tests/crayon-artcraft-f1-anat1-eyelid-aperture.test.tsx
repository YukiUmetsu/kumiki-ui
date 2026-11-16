import {describe,it,expect} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {CrayonScene,} from "../registry/video/materials/crayon-scene-react";
import {inspectCrayonScene} from "../registry/video/materials/crayon-scene";
import type {CrayonElement} from "../registry/video/materials/crayon-scene";
import {crayonCc0FaceStudy} from "../src/video/crayon-artcraft-cc0-face";
import {CRAYON_PORTRAIT_AUDIT} from "../src/video/crayon-artcraft-portrait-audit";
import {crayonF1RegisterAnat1Face} from "../src/video/crayon-artcraft-f1-anat1-malar";
import {
  CRAYON_F1_V36_IDS,CRAYON_F1_V36_SOURCE,
  crayonF1Anat1NearEyePaths,crayonF1BuildAnat1NearEyeAperture,
} from "../src/video/crayon-artcraft-f1-anat1-eyelid-aperture";
import {Cc0Anat1NearEyeV36,Cc0Anat1NearEyeDetailV36}
  from "../src/video/crayon-artcraft-adult-face.stories";
const byId=(a:readonly CrayonElement[],id:string)=>a.find(x=>x.id===id);

describe("ArtCraft F1 V36 ANAT1 photographed source near iris and tarsal aperture",()=>{
  it("uses actual photographic left/right sclera, iris, lid RGB and licensed ANAT1",()=>{
    const fit=crayonF1RegisterAnat1Face();
    expect(fit.model).toBe("ANAT1/MediaPipe-468-unmodified");
    expect(fit.artisticApproval).toBe(false);
    expect(fit.rmse).toBeGreaterThan(0);
    expect(fit.rmse).toBeLessThan(40);
    expect(CRAYON_F1_V36_SOURCE.sha).toBe(CRAYON_PORTRAIT_AUDIT.source.sha256);
    expect(CRAYON_F1_V36_SOURCE.nearOuterCanthus).toEqual([216,558]);
    expect(CRAYON_F1_V36_SOURCE.nearInnerCanthus).toEqual([318,545]);
    expect(CRAYON_F1_V36_SOURCE.leftSclera.source).toEqual([43,28,27]);
    expect(CRAYON_F1_V36_SOURCE.rightSclera.source).toEqual([114,99,100]);
    expect(CRAYON_F1_V36_SOURCE.iris.source).toEqual([19,12,10]);
    expect(CRAYON_F1_V36_SOURCE.lidMargin.source).toEqual([108,64,60]);
    expect(CRAYON_F1_V36_IDS).toHaveLength(8);
    const forms=crayonF1Anat1NearEyePaths();
    expect(Object.keys(forms).sort()).toEqual([...CRAYON_F1_V36_IDS].sort());
    for(const [id,shape] of Object.entries(forms)){
      expect(shape.d).toMatch(/^M[\d.\s]+ C.*Z$/);
      expect(shape.d.match(/M/g)).toHaveLength(1);
      expect(shape.d.match(/C/g)?.length)
        .toBeGreaterThanOrEqual(id==="pupil-near"?3:4);
      expect(shape.d).not.toContain("NaN");
      expect(shape.d).not.toContain("Infinity");
      expect(shape.bounds.width).toBeGreaterThan(17);
      expect(shape.bounds.height).toBeGreaterThan(17);
      expect(shape.bounds.width).toBeLessThan(155);
      expect(shape.bounds.height).toBeLessThan(110);
      expect(shape.bounds.x).toBeGreaterThan(185);
      expect(shape.bounds.y).toBeGreaterThan(479);
    }
  });

  it("rebuilds precisely eight V35 wax forms and preserves complete separate iris/hair/nose",()=>{
    const previous=crayonCc0FaceStudy({midfaceForm:"source-anat1-orbit-malar"});
    const latest=crayonCc0FaceStudy({midfaceForm:"source-anat1-near-eye"});
    expect(inspectCrayonScene(previous)).toEqual([]);
    expect(inspectCrayonScene(latest)).toEqual([]);
    const changed=new Set<string>(CRAYON_F1_V36_IDS);
    expect(latest.elements).toHaveLength(previous.elements.length);
    expect(latest.elements.filter(e=>!changed.has(e.id))).toEqual(
      previous.elements.filter(e=>!changed.has(e.id)));
    for(const key of ["id","width","height","durationFrames","camera",
      "seed","paper","paperTooth"] as const){
      expect(latest[key]).toEqual(previous[key]);
    }
    for(const id of ["naris-shadow-near","naris-shadow-far","nose-root",
      "nose-dorsum","nose-sidewall-form","cheek-malar-bounce",
      "socket-near","socket-far","malar-cheek-near","iris-far",
      "pupil-far","sclera-far","upper-lid-far",
      "hair-left-curtain","hair-right-curtain","lash-contact-near"]){
      expect(byId(latest.elements,id)).toEqual(byId(previous.elements,id));
    }
    for(const id of changed){
      const before=byId(previous.elements,id),after=byId(latest.elements,id);
      if(before?.kind!=="wax"||after?.kind!=="wax")
        throw Error("Missing original source eye "+id);
      expect(after.d).not.toBe(before.d);
      expect(after.bounds).not.toEqual(before.bounds);
      expect(after.colors).not.toEqual(before.colors);
      expect(after.deposition).toBe("stroke-built");
      expect(after.nibStyle).toBe("dry");
      expect(after.clipToParent).toBe(true);
      expect(after.parentId).toBe(id==="iris-near"?"sclera-near":
        id==="pupil-near"?"iris-near":"face-outline");
      for(const key of ["id","kind","timing","markLength",
        "strokeOrder","motion","pivot","edgeRoughness"] as const){
        expect(after[key]).toEqual(before[key]);
      }
    }
    expect(latest.durationFrames).toBe(300);
  });

  it("fails closed on duplicate/missing/foreign/double-applied or inverted cornea",()=>{
    const prev=crayonCc0FaceStudy({midfaceForm:"source-anat1-orbit-malar"});
    const v36=crayonCc0FaceStudy({midfaceForm:"source-anat1-near-eye"});
    const sclera=byId(prev.elements,"sclera-near");
    if(!sclera)throw Error("Missing source sclera");
    expect(()=>crayonF1BuildAnat1NearEyeAperture([])).toThrow(RangeError);
    expect(()=>crayonF1BuildAnat1NearEyeAperture(
      prev.elements.filter(e=>e.id!=="upper-lid-near"))).toThrow(RangeError);
    expect(()=>crayonF1BuildAnat1NearEyeAperture([...prev.elements,sclera]))
      .toThrow(RangeError);
    expect(()=>crayonF1BuildAnat1NearEyeAperture(v36.elements)).toThrow(RangeError);
    expect(()=>crayonF1BuildAnat1NearEyeAperture(
      prev.elements.map(e=>e.id==="iris-near"?
        {...e,parentId:"foreign-eyeball"}:e))).toThrow(RangeError);
    expect(()=>crayonF1BuildAnat1NearEyeAperture(
      prev.elements.map(e=>e.id==="sclera-near"?
        {...e,kind:"contour"} as CrayonElement:e))).toThrow(RangeError);
    expect(()=>crayonF1BuildAnat1NearEyeAperture(
      prev.elements.map(e=>e.id==="sclera-near"?
        {...e,clipToParent:false}:e))).toThrow(RangeError);
    expect(()=>crayonF1BuildAnat1NearEyeAperture([
      ...prev.elements.filter(e=>e.id!=="upper-lid-near"),
      ...prev.elements.filter(e=>e.id==="upper-lid-near"),
    ])).toThrow(RangeError);
  });

  it("retains exact 300-frame native wax film and existing Storybook controls",()=>{
    expect(Cc0Anat1NearEyeV36.name).toContain("!dev");
    expect(Cc0Anat1NearEyeDetailV36.name).toContain("!dev");
    for(const eyeContact of ["source-shade","source-sculpt"] as const){
      const scene=crayonCc0FaceStudy({detail:.2,eyeContact,
        midfaceForm:"source-anat1-near-eye"});
      expect(inspectCrayonScene(scene)).toEqual([]);
      expect(scene.durationFrames).toBe(300);
      const html=renderToStaticMarkup(<CrayonScene spec={scene} frame={299}/>);
      expect(html).toContain("data-km-crayon-paper-contact-wax");
      for(const id of [...CRAYON_F1_V36_IDS,"face-outline","socket-near",
        "socket-far","sclera-far","iris-far","pupil-far",
        "naris-shadow-near","lip-upper","lip-lower","chin-plane",
        "hair-left-curtain","cheek-malar-bounce"]){
        expect(html).toContain('data-km-crayon-element="'+id+'"');
      }
      expect(html).not.toContain("<image");
      expect(html).not.toContain("<foreignObject");
    }
  },40_000);
});
