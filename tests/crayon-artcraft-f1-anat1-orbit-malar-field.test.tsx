import {describe,it,expect} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {CrayonScene} from "../registry/video/materials/crayon-scene-react";
import {inspectCrayonScene} from "../registry/video/materials/crayon-scene";
import type {CrayonElement} from "../registry/video/materials/crayon-scene";
import {crayonCc0FaceStudy} from "../src/video/crayon-artcraft-cc0-face";
import {CRAYON_PORTRAIT_AUDIT} from "../src/video/crayon-artcraft-portrait-audit";
import {crayonF1RegisterAnat1Face} from "../src/video/crayon-artcraft-f1-anat1-malar";
import {
  CRAYON_F1_V35_IDS,CRAYON_F1_V35_SOURCE_SAMPLES,
  crayonF1Anat1OrbitalMalarPaths,crayonF1BuildAnat1OrbitMalarField
} from "../src/video/crayon-artcraft-f1-anat1-orbit-malar-field";
import {Cc0Anat1OrbitMalarV35,Cc0Anat1OrbitMalarNearV35}
  from "../src/video/crayon-artcraft-adult-face.stories";
const find=(els:readonly CrayonElement[],id:string)=>els.find(e=>e.id===id);

describe("ArtCraft F1 V35 original-source ANAT1 eye-to-zygomatic wax value field",()=>{
  it("registers licensed original photo and 468-pt ANAT1 3D camera but never approves art",()=>{
    const fit=crayonF1RegisterAnat1Face();
    expect(fit.model).toBe("ANAT1/MediaPipe-468-unmodified");
    expect(fit.artisticApproval).toBe(false);
    expect(fit.rmse).toBeGreaterThan(0);
    expect(fit.rmse).toBeLessThan(40);
    expect(CRAYON_F1_V35_SOURCE_SAMPLES.sourceSha)
      .toEqual(CRAYON_PORTRAIT_AUDIT.source.sha256);
    expect(CRAYON_F1_V35_SOURCE_SAMPLES.nearBrow.photo).toEqual([133,94,79]);
    expect(CRAYON_F1_V35_SOURCE_SAMPLES.nearHood.photo).toEqual([121,89,87]);
    expect(CRAYON_F1_V35_SOURCE_SAMPLES.malarLight.photo).toEqual([240,208,189]);
    expect(CRAYON_F1_V35_SOURCE_SAMPLES.cheekCore.photo).toEqual([115,78,64]);
    expect(CRAYON_F1_V35_SOURCE_SAMPLES.nasalRoot.photo).toEqual([163,126,108]);
    expect(CRAYON_F1_V35_IDS).toEqual(["socket-near","socket-far",
      "malar-cheek-near","cheek-malar-cast","cheek-malar-bounce","nose-root"]);
    const shapes=crayonF1Anat1OrbitalMalarPaths();
    expect(Object.keys(shapes).sort()).toEqual([...CRAYON_F1_V35_IDS].sort());
    for(const shape of Object.values(shapes)){
      expect(shape.d).toMatch(/^M[\d.\s]+ C.*Z$/);
      expect(shape.d.match(/M/g)).toHaveLength(1);
      expect(shape.d.match(/C/g)?.length).toBeGreaterThanOrEqual(4);
      expect(shape.d).not.toContain("NaN");
      expect(shape.d).not.toContain("Infinity");
      expect(shape.bounds.width).toBeGreaterThan(20);
      expect(shape.bounds.height).toBeGreaterThan(20);
      expect(shape.bounds.width).toBeLessThan(480);
      expect(shape.bounds.height).toBeLessThan(520);
      expect(Math.abs(shape.angle)).toBeLessThanOrEqual(75);
    }
  });

  it("from V32 changes exactly six original native wax forms, not failed V33/V34",()=>{
    const previous=crayonCc0FaceStudy({midfaceForm:"source-anat1-midface-bridge"});
    const failed33=crayonCc0FaceStudy({midfaceForm:"source-anat1-nasal-volume"});
    const failed34=crayonCc0FaceStudy({midfaceForm:"source-anat1-alar-recess"});
    const newScene=crayonCc0FaceStudy({midfaceForm:"source-anat1-orbit-malar"});
    expect(inspectCrayonScene(previous)).toEqual([]);
    expect(inspectCrayonScene(newScene)).toEqual([]);
    const changed=new Set<string>(CRAYON_F1_V35_IDS);
    expect(newScene.elements).toHaveLength(previous.elements.length);
    expect(newScene.elements.filter(e=>!changed.has(e.id))).toEqual(
      previous.elements.filter(e=>!changed.has(e.id)));
    for(const key of ["id","width","height","durationFrames","camera",
      "seed","paper","paperTooth"] as const){
      expect(newScene[key]).toEqual(previous[key]);
    }
    for(const key of ["naris-shadow-near","naris-shadow-far",
      "alar-roof-near","alar-roof-far"]){
      expect(find(newScene.elements,key)).toEqual(find(previous.elements,key));
      expect(find(newScene.elements,key)).not.toEqual(find(failed34.elements,key));
    }
    for(const key of ["nose-dorsum","nose-sidewall-form","nose-tip"]){
      expect(find(newScene.elements,key)).toEqual(find(previous.elements,key));
      expect(find(newScene.elements,key)).not.toEqual(find(failed33.elements,key));
    }
    for(const id of changed){
      const before=find(previous.elements,id),after=find(newScene.elements,id);
      if(before?.kind!=="wax"||after?.kind!=="wax")
        throw Error("Missing V32 original wax "+id);
      expect(after.d).not.toEqual(before.d);
      expect(after.colors).not.toEqual(before.colors);
      expect(after.bounds).not.toEqual(before.bounds);
      expect(after.parentId).toEqual("face-outline");
      expect(after.clipToParent).toBe(true);
      expect(after.deposition).toBe("stroke-built");
      expect(after.nibStyle).toBe("dry");
      expect(after.featherContacts).toBe(true);
      for(const key of ["id","kind","timing","markLength","strokeOrder",
        "motion","pivot","edgeRoughness"] as const){
        expect(after[key]).toEqual(before[key]);
      }
    }
  });

  it("refuses missing, duplicated, foreign or double-painted anatomical surfaces",()=>{
    const old=crayonCc0FaceStudy({midfaceForm:"source-anat1-midface-bridge"});
    const newer=crayonCc0FaceStudy({midfaceForm:"source-anat1-orbit-malar"});
    const original=find(old.elements,"socket-near");
    if(!original)throw Error("Missing source orbital form");
    expect(()=>crayonF1BuildAnat1OrbitMalarField([])).toThrow(RangeError);
    expect(()=>crayonF1BuildAnat1OrbitMalarField(
      old.elements.filter(e=>e.id!=="nose-root"))).toThrow(RangeError);
    expect(()=>crayonF1BuildAnat1OrbitMalarField([...old.elements,original]))
      .toThrow(RangeError);
    expect(()=>crayonF1BuildAnat1OrbitMalarField(newer.elements))
      .toThrow(RangeError);
    expect(()=>crayonF1BuildAnat1OrbitMalarField(old.elements.map(e=>
      e.id==="socket-near"?{...e,parentId:"foreign-skin"}:e)))
      .toThrow(RangeError);
    expect(()=>crayonF1BuildAnat1OrbitMalarField(old.elements.map(e=>
      e.id==="nose-root"?{...e,kind:"contour"} as CrayonElement:e)))
      .toThrow(RangeError);
  });

  it("preserves whole native 300-frame film, face element identifiers and !dev Storybook",()=>{
    expect(Cc0Anat1OrbitMalarV35.name).toContain("!dev");
    expect(Cc0Anat1OrbitMalarNearV35.name).toContain("!dev");
    for(const jawNeckForm of ["baseline","source-contour"] as const){
      const scene=crayonCc0FaceStudy({detail:.2,eyeContact:"source-shade",
        jawNeckForm,midfaceForm:"source-anat1-orbit-malar"});
      expect(inspectCrayonScene(scene)).toEqual([]);
      expect(scene.durationFrames).toBe(300);
      expect(scene.width).toBe(608);
      expect(scene.height).toBe(1082);
      const html=renderToStaticMarkup(<CrayonScene spec={scene} frame={299}/>);
      expect(html).toContain("data-km-crayon-paper-contact-wax");
      for(const id of [...CRAYON_F1_V35_IDS,"face-outline","iris-near",
        "iris-far","lip-upper","lip-lower","chin-plane","naris-shadow-near",
        "naris-shadow-far","jaw-underside","hair-left-curtain",
        "hair-right-curtain"]){
        expect(html).toContain('data-km-crayon-element="'+id+'"');
      }
      expect(html).not.toContain("<image");
      expect(html).not.toContain("<foreignObject");
    }
  },40_000);
});
