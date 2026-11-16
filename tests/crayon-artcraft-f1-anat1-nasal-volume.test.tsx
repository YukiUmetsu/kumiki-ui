import {describe,it,expect} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {CrayonScene} from "../registry/video/materials/crayon-scene-react";
import {inspectCrayonScene} from "../registry/video/materials/crayon-scene";
import type {CrayonElement} from "../registry/video/materials/crayon-scene";
import {crayonCc0FaceStudy} from "../src/video/crayon-artcraft-cc0-face";
import {CRAYON_PORTRAIT_AUDIT} from "../src/video/crayon-artcraft-portrait-audit";
import {crayonF1RegisterAnat1Face} from "../src/video/crayon-artcraft-f1-anat1-malar";
import {CRAYON_F1_V33_CHANGED_IDS,CRAYON_F1_V33_PHOTO_OBSERVATIONS,
  crayonF1Anat1NasalPatchGeometry,crayonF1BuildAnat1NasalVolume}
  from "../src/video/crayon-artcraft-f1-anat1-nasal-volume";
import {Cc0Anat1NasalVolumeV33,Cc0Anat1NasalCloseV33}
  from "../src/video/crayon-artcraft-adult-face.stories";

const byId=(a:readonly CrayonElement[],id:string)=>a.find(e=>e.id===id);
describe("ArtCraft F1 V33 ANAT1 photograph-registered nasal bone, cartilage and wax",()=>{
  it("retains the actual source observations rather than inventing 3D sitter identity",()=>{
    const fit=crayonF1RegisterAnat1Face();
    expect(fit.model).toBe("ANAT1/MediaPipe-468-unmodified");
    expect(fit.artisticApproval).toBe(false);
    expect(fit.rmse).toBeGreaterThan(0);
    expect(fit.rmse).toBeLessThan(40);
    expect(CRAYON_F1_V33_PHOTO_OBSERVATIONS.sourceSha)
      .toEqual(CRAYON_PORTRAIT_AUDIT.source.sha256);
    expect(CRAYON_F1_V33_PHOTO_OBSERVATIONS.root.source)
      .toEqual([163,126,108]);
    expect(CRAYON_F1_V33_PHOTO_OBSERVATIONS.bulb.source)
      .toEqual([241,199,179]);
    expect(CRAYON_F1_V33_PHOTO_OBSERVATIONS.nearNaris.source)
      .toEqual([22,3,3]);
    expect(CRAYON_F1_V33_PHOTO_OBSERVATIONS.farNaris.source)
      .toEqual([76,24,20]);
    expect(CRAYON_F1_V33_CHANGED_IDS).toEqual([
      "nose-root","nose-dorsum","nose-sidewall-form",
      "nose-tip","nose-tip-reflected-light",
    ]);
    const g=crayonF1Anat1NasalPatchGeometry();
    expect(Object.keys(g).sort()).toEqual([...CRAYON_F1_V33_CHANGED_IDS].sort());
    for(const [id,shape] of Object.entries(g)){
      expect(shape.d).toMatch(/^M[\d.\s]+ C.*Z$/);
      expect(shape.d.match(/M/g)).toHaveLength(1);
      expect(shape.d.match(/C/g)).toHaveLength(id==="nose-dorsum"?5:4);
      expect(shape.bounds.width).toBeGreaterThan(20);
      expect(shape.bounds.height).toBeGreaterThan(20);
      expect(shape.bounds.width).toBeLessThan(210);
      expect(shape.bounds.height).toBeLessThan(210);
      expect(shape.bounds.x).toBeGreaterThan(280);
      expect(shape.bounds.x).toBeLessThan(460);
      expect(shape.bounds.y).toBeGreaterThan(460);
      expect(shape.bounds.y).toBeLessThan(700);
      expect(Math.abs(shape.angle)).toBeLessThanOrEqual(75);
    }
  });
  it("changes only five existing native pigment and continuous 3D nasal curves",()=>{
    const previous=crayonCc0FaceStudy({midfaceForm:"source-anat1-midface-bridge"});
    const latest=crayonCc0FaceStudy({midfaceForm:"source-anat1-nasal-volume"});
    expect(inspectCrayonScene(previous)).toEqual([]);
    expect(inspectCrayonScene(latest)).toEqual([]);
    const ids=new Set<string>(CRAYON_F1_V33_CHANGED_IDS);
    expect(latest.elements).toHaveLength(previous.elements.length);
    expect(latest.elements.filter(e=>!ids.has(e.id))).toEqual(
      previous.elements.filter(e=>!ids.has(e.id)));
    for(const key of ["id","width","height","durationFrames","camera",
      "seed","paper","paperTooth"] as const)expect(latest[key]).toEqual(previous[key]);
    for(const id of ids){
      const old=byId(previous.elements,id),now=byId(latest.elements,id);
      if(old?.kind!=="wax"||now?.kind!=="wax")throw Error("Missing native nose "+id);
      expect(now.d).not.toEqual(old.d);
      expect(now.bounds).not.toEqual(old.bounds);
      expect(now.colors).not.toEqual(old.colors);
      expect(now.parentId).toBe("face-outline");
      expect(now.clipToParent).toBe(true);
      for(const key of ["id","kind","timing","markLength",
        "strokeOrder","motion","pivot","underpaintTooth","edgeRoughness"] as const){
        if(key==="underpaintTooth"&&id!=="nose-root"&&
           id!=="nose-tip-reflected-light")continue;
        expect(now[key]).toEqual(old[key]);
      }
      expect(now.featherContacts).toBe(true);
      expect(now.deposition).toBe("stroke-built");
      expect(now.nibStyle).toBe("dry");
    }
    expect(latest.durationFrames).toBe(300);
    expect(latest.seed).toBe(441501);
  });
  it("fails closed for absent, doubled, malformed or independently pasted nose",()=>{
    const v32=crayonCc0FaceStudy({midfaceForm:"source-anat1-midface-bridge"});
    const v33=crayonCc0FaceStudy({midfaceForm:"source-anat1-nasal-volume"});
    const root=byId(v32.elements,"nose-root");
    if(!root)throw Error("Missing source nose");
    expect(()=>crayonF1BuildAnat1NasalVolume([])).toThrow(RangeError);
    expect(()=>crayonF1BuildAnat1NasalVolume(
      v32.elements.filter(e=>e.id!=="nose-tip-reflected-light"))).toThrow(RangeError);
    expect(()=>crayonF1BuildAnat1NasalVolume([...v32.elements,root]))
      .toThrow(RangeError);
    expect(()=>crayonF1BuildAnat1NasalVolume(v33.elements)).toThrow(RangeError);
    expect(()=>crayonF1BuildAnat1NasalVolume(
      v32.elements.map(e=>e.id==="nose-root"?
        {...e,parentId:"anatomy-foreign-skin"}:e))).toThrow(RangeError);
    expect(()=>crayonF1BuildAnat1NasalVolume(
      v32.elements.map(e=>e.id==="nose-root"?
        {...e,kind:"contour"} as CrayonElement:e))).toThrow(RangeError);
    expect(()=>crayonF1BuildAnat1NasalVolume(
      v32.elements.map(e=>e.id==="nose-root"?
        {...e,clipToParent:false}:e))).toThrow(RangeError);
  });
  it("retains true 300-frame native crayon and all original !dev Storybook controls",()=>{
    expect(Cc0Anat1NasalVolumeV33.name).toContain("!dev");
    expect(Cc0Anat1NasalCloseV33.name).toContain("!dev");
    for(const jawNeckForm of ["baseline","source-contour"] as const){
      const spec=crayonCc0FaceStudy({detail:.2,jawNeckForm,
        midfaceForm:"source-anat1-nasal-volume",eyeContact:"source-shade"});
      expect(inspectCrayonScene(spec)).toEqual([]);
      const html=renderToStaticMarkup(<CrayonScene spec={spec} frame={299}/>);
      expect(html).toContain("data-km-crayon-paper-contact-wax");
      for(const id of ["face-outline","nose-root","nose-dorsum","nose-tip",
        "nose-sidewall-form","nose-tip-reflected-light","naris-shadow-near",
        "naris-shadow-far","cheek-malar-bounce","malar-cheek-near",
        "lip-lower","socket-near","socket-far","iris-near","iris-far",
        "chin-plane"]){
        expect(html).toContain('data-km-crayon-element="'+id+'"');
      }
      expect(html).not.toContain("<image");
      expect(html).not.toContain("<foreignObject");
    }
  },40_000);
});
