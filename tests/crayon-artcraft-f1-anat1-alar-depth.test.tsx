import {describe,it,expect} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {CrayonScene} from "../registry/video/materials/crayon-scene-react";
import {inspectCrayonScene} from "../registry/video/materials/crayon-scene";
import type {CrayonElement} from "../registry/video/materials/crayon-scene";
import {crayonCc0FaceStudy} from "../src/video/crayon-artcraft-cc0-face";
import {CRAYON_PORTRAIT_AUDIT} from "../src/video/crayon-artcraft-portrait-audit";
import {crayonF1RegisterAnat1Face} from "../src/video/crayon-artcraft-f1-anat1-malar";
import {CRAYON_F1_V34_IDS,CRAYON_F1_V34_SOURCE_OBSERVATIONS,
  crayonF1Anat1RecessGeometry,crayonF1RebuildAnat1AlarRecess}
  from "../src/video/crayon-artcraft-f1-anat1-alar-depth";
import {Cc0Anat1AlarRecessV34,Cc0Anat1AlarDetailV34}
  from "../src/video/crayon-artcraft-adult-face.stories";

const find=(xs:readonly CrayonElement[],id:string)=>xs.find(x=>x.id===id);

describe("ArtCraft V34 actual ANAT1/CC0 nostril negative space, NOT rejected V33 nose",()=>{
  it("uses source-observed near/far nasal cavities and ANAT1 fitted 3D turn",()=>{
    const fit=crayonF1RegisterAnat1Face();
    expect(fit.model).toBe("ANAT1/MediaPipe-468-unmodified");
    expect(fit.artisticApproval).toBe(false);
    expect(fit.rmse).toBeGreaterThan(0);
    expect(fit.rmse).toBeLessThan(40);
    expect(CRAYON_F1_V34_SOURCE_OBSERVATIONS.sourceSha)
      .toBe(CRAYON_PORTRAIT_AUDIT.source.sha256);
    expect(CRAYON_F1_V34_SOURCE_OBSERVATIONS.nearCenter).toEqual([405,631]);
    expect(CRAYON_F1_V34_SOURCE_OBSERVATIONS.farCenter).toEqual([450,627]);
    expect(CRAYON_F1_V34_SOURCE_OBSERVATIONS.nearSourceShadow).toEqual([22,3,3]);
    expect(CRAYON_F1_V34_SOURCE_OBSERVATIONS.farSourceShadow).toEqual([76,24,20]);
    expect(CRAYON_F1_V34_IDS).toEqual([
      "alar-roof-near","naris-shadow-near","alar-roof-far","naris-shadow-far",
    ]);
    const shapes=crayonF1Anat1RecessGeometry();
    expect(Object.keys(shapes).sort()).toEqual([...CRAYON_F1_V34_IDS].sort());
    for(const shape of Object.values(shapes)){
      expect(shape.d).toMatch(/^M[\d.\s]+ C.*Z$/);
      expect(shape.d.match(/M/g)).toHaveLength(1);
      expect(shape.d.match(/C/g)?.length).toBeGreaterThanOrEqual(4);
      expect(shape.bounds.x).toBeGreaterThan(350);
      expect(shape.bounds.y).toBeGreaterThan(580);
      expect(shape.bounds.width).toBeGreaterThan(20);
      expect(shape.bounds.width).toBeLessThan(95);
      expect(shape.bounds.height).toBeGreaterThan(15);
      expect(shape.bounds.height).toBeLessThan(95);
      expect(shape.angle).toBeGreaterThan(-75);
      expect(shape.angle).toBeLessThan(75);
    }
  });

  it("changes exactly four pre-existing native cartilage/cavity wax forms; V33 rejected nose unneeded",()=>{
    const v32=crayonCc0FaceStudy({midfaceForm:"source-anat1-midface-bridge"});
    const v33=crayonCc0FaceStudy({midfaceForm:"source-anat1-nasal-volume"});
    const v34=crayonCc0FaceStudy({midfaceForm:"source-anat1-alar-recess"});
    expect(inspectCrayonScene(v32)).toEqual([]);
    expect(inspectCrayonScene(v34)).toEqual([]);
    expect(v34.elements).toHaveLength(v32.elements.length);
    const changed=new Set<string>(CRAYON_F1_V34_IDS);
    expect(v34.elements.filter(e=>!changed.has(e.id))).toEqual(
      v32.elements.filter(e=>!changed.has(e.id)));
    for(const key of ["id","width","height","durationFrames","camera","paper",
      "paperTooth","seed"] as const)expect(v34[key]).toEqual(v32[key]);
    expect(v34.elements.find(e=>e.id==="nose-dorsum")).toEqual(
      v32.elements.find(e=>e.id==="nose-dorsum"));
    expect(v34.elements.find(e=>e.id==="nose-dorsum")).not.toEqual(
      v33.elements.find(e=>e.id==="nose-dorsum"));
    for(const id of changed){
      const old=find(v32.elements,id),now=find(v34.elements,id);
      if(old?.kind!=="wax"||now?.kind!=="wax")throw Error("Missing native wax "+id);
      expect(now.d).not.toEqual(old.d);
      expect(now.bounds).not.toEqual(old.bounds);
      expect(now.parentId).toBe("face-outline");
      expect(now.clipToParent).toBe(true);
      expect(now.deposition).toBe("stroke-built");
      expect(now.nibStyle).toBe("dry");
      expect(now.featherContacts).toBe(true);
      for(const key of ["id","kind","timing","markLength","strokeOrder",
        "motion","pivot"] as const)expect(now[key]).toEqual(old[key]);
      expect(now.colors).not.toEqual(old.colors);
    }
    for(const side of ["near","far"]){
      const roof=v34.elements.findIndex(e=>e.id==="alar-roof-"+side);
      const hole=v34.elements.findIndex(e=>e.id==="naris-shadow-"+side);
      expect(hole).toBeGreaterThan(roof);
    }
  });

  it("refuses repeated or corrupted 3D cavities and foreign shape attachments",()=>{
    const old=crayonCc0FaceStudy({midfaceForm:"source-anat1-midface-bridge"});
    const current=crayonCc0FaceStudy({midfaceForm:"source-anat1-alar-recess"});
    const near=find(old.elements,"naris-shadow-near");
    if(!near)throw Error("Missing near cavity");
    expect(()=>crayonF1RebuildAnat1AlarRecess([])).toThrow(RangeError);
    expect(()=>crayonF1RebuildAnat1AlarRecess(
      old.elements.filter(e=>e.id!=="alar-roof-near"))).toThrow(RangeError);
    expect(()=>crayonF1RebuildAnat1AlarRecess([...old.elements,near]))
      .toThrow(RangeError);
    expect(()=>crayonF1RebuildAnat1AlarRecess(current.elements)).toThrow(RangeError);
    expect(()=>crayonF1RebuildAnat1AlarRecess(
      old.elements.map(e=>e.id==="naris-shadow-near"?
        {...e,parentId:"foreign-cartilage"}:e))).toThrow(RangeError);
    expect(()=>crayonF1RebuildAnat1AlarRecess(
      old.elements.map(e=>e.id==="naris-shadow-near"?
        {...e,kind:"contour"} as CrayonElement:e))).toThrow(RangeError);
  });

  it("keeps 300-frame native wax and existing !dev source/reference Storybook",()=>{
    expect(Cc0Anat1AlarRecessV34.name).toContain("!dev");
    expect(Cc0Anat1AlarDetailV34.name).toContain("!dev");
    for(const jawNeckForm of ["baseline","source-contour"] as const){
      const spec=crayonCc0FaceStudy({detail:.2,jawNeckForm,
        midfaceForm:"source-anat1-alar-recess",eyeContact:"source-shade"});
      expect(inspectCrayonScene(spec)).toEqual([]);
      expect(spec.durationFrames).toBe(300);
      const html=renderToStaticMarkup(<CrayonScene spec={spec} frame={299}/>);
      expect(html).toContain("data-km-crayon-paper-contact-wax");
      for(const id of CRAYON_F1_V34_IDS){
        expect(html).toContain('data-km-crayon-element="'+id+'"');
      }
      for(const id of ["face-outline","nose-dorsum","nose-tip",
        "socket-near","socket-far","iris-near","iris-far","lip-lower",
        "chin-plane","jaw-underside","cheek-malar-bounce"]){
        expect(html).toContain('data-km-crayon-element="'+id+'"');
      }
      expect(html).not.toContain("<image");
      expect(html).not.toContain("<foreignObject");
    }
  },40_000);
});
