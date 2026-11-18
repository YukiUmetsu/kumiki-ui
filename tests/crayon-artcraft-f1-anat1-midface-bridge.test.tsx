import {describe,it,expect} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {CrayonScene} from "../registry/video/materials/crayon-scene-react";
import {inspectCrayonScene} from "../registry/video/materials/crayon-scene";
import type {CrayonElement} from "../registry/video/materials/crayon-scene";
import {crayonCc0FaceStudy} from "../src/video/crayon-artcraft-cc0-face";
import {CRAYON_PORTRAIT_AUDIT} from "../src/video/crayon-artcraft-portrait-audit";
import {crayonF1RegisterAnat1Face} from "../src/video/crayon-artcraft-f1-anat1-malar";
import {CRAYON_F1_V32_ANAT1_IDS,CRAYON_F1_V32_SOURCE_SHA,
  crayonF1Anat1MidfacePaths,crayonF1RebuildAnat1Midface}
  from "../src/video/crayon-artcraft-f1-anat1-midface-bridge";
import {Cc0Anat1MidfaceBridgeV32,Cc0Anat1MidfaceBridgeNearV32}
  from "../src/video/crayon-artcraft-adult-face.stories";

const byId=(a:readonly CrayonElement[],id:string)=>a.find(e=>e.id===id);

describe("ArtCraft F1 V32 photograph-registered ANAT1 3D zygoma–alar midface",()=>{
  it("inherits genuine ANAT1 source camera and one connected near cheek/nose depth transition",()=>{
    const reg=crayonF1RegisterAnat1Face();
    const s=CRAYON_PORTRAIT_AUDIT.sourcePoints;
    expect(reg.model).toBe("ANAT1/MediaPipe-468-unmodified");
    expect(reg.artisticApproval).toBe(false);
    expect(reg.rmse).toBeGreaterThan(0);
    expect(reg.rmse).toBeLessThan(40);
    expect(CRAYON_F1_V32_SOURCE_SHA).toBe(CRAYON_PORTRAIT_AUDIT.source.sha256);
    expect(CRAYON_F1_V32_ANAT1_IDS).toEqual(["malar-cheek-near","nose-sidewall"]);
    expect(reg.projected["pronasale"][0]).toBeGreaterThan(s.nose_root[0]);
    expect(reg.projected["cheekbone.R"][0]).toBeLessThan(s.nose_tip[0]);
    const paths=crayonF1Anat1MidfacePaths();
    expect(Object.keys(paths).sort()).toEqual([...CRAYON_F1_V32_ANAT1_IDS].sort());
    for(const [id,shape] of Object.entries(paths)){
      expect(shape.d).toMatch(/^M[\d.\s]+C.*Z$/);
      expect(shape.d.match(/M/g)).toHaveLength(1);
      expect(shape.d.match(/C/g)).toHaveLength(id==="malar-cheek-near"?5:4);
      expect(shape.bounds.width).toBeGreaterThan(20);
      expect(shape.bounds.height).toBeGreaterThan(40);
      expect(shape.bounds.width).toBeLessThan(450);
      expect(shape.bounds.height).toBeLessThan(450);
      expect(shape.bounds.x).toBeGreaterThan(50);
      expect(shape.bounds.x).toBeLessThan(450);
      expect(shape.bounds.y).toBeGreaterThan(450);
      expect(shape.bounds.y).toBeLessThan(760);
      expect(Math.abs(shape.angle)).toBeLessThanOrEqual(75);
      expect(Number.isFinite(shape.angle)).toBe(true);
    }
  });

  it("rebuilds two existing native wax regions, never pixels, eyes, hair or source 300-frame rig",()=>{
    const prior=crayonCc0FaceStudy({midfaceForm:"source-anat1-malar"});
    const latest=crayonCc0FaceStudy({midfaceForm:"source-anat1-midface-bridge"});
    expect(inspectCrayonScene(prior)).toEqual([]);
    expect(inspectCrayonScene(latest)).toEqual([]);
    expect(latest.elements).toHaveLength(prior.elements.length);
    const changed=new Set<string>(CRAYON_F1_V32_ANAT1_IDS);
    expect(latest.elements.filter(e=>!changed.has(e.id))).toEqual(
      prior.elements.filter(e=>!changed.has(e.id)));
    for(const key of ["id","width","height","durationFrames","camera",
      "seed","paper","paperTooth"] as const)
      expect(latest[key]).toEqual(prior[key]);
    expect(latest.durationFrames).toBe(300);
    for(const id of changed){
      const old=byId(prior.elements,id),now=byId(latest.elements,id);
      if(old?.kind!=="wax"||now?.kind!=="wax")throw Error(id+" lost physical wax");
      expect(now.d).not.toBe(old.d);
      expect(now.bounds).not.toEqual(old.bounds);
      expect(now.parentId).toBe("face-outline");
      expect(now.clipToParent).toBe(true);
      for(const key of ["colors","coverage","timing","markStrength",
        "markLength","spacing","pressure","nibStyle","featherContacts",
        "blendRadius","underpaintGradient","underpaintTooth","strokeOrder",
        "deposition","opaqueBurnish","outlineOpacity","edgeRoughness",
        "motion","pivot"] as const)
        expect(now[key]).toEqual(old[key]);
    }
  });

  it("fails closed if source anatomical skin is missing, duplicate or has invalid attachment",()=>{
    const original=crayonCc0FaceStudy({midfaceForm:"source-anat1-malar"});
    const updated=crayonCc0FaceStudy({midfaceForm:"source-anat1-midface-bridge"});
    const near=byId(original.elements,"malar-cheek-near");
    if(!near)throw Error("Missing source near cheek");
    expect(()=>crayonF1RebuildAnat1Midface([])).toThrow(RangeError);
    expect(()=>crayonF1RebuildAnat1Midface(
      original.elements.filter(e=>e.id!=="nose-sidewall"))).toThrow(RangeError);
    expect(()=>crayonF1RebuildAnat1Midface([...original.elements,near]))
      .toThrow(RangeError);
    expect(()=>crayonF1RebuildAnat1Midface(updated.elements)).toThrow(RangeError);
    expect(()=>crayonF1RebuildAnat1Midface(
      original.elements.map(e=>e.id==="malar-cheek-near"?
        {...e,parentId:"neck-attached"}:e))).toThrow(RangeError);
    expect(()=>crayonF1RebuildAnat1Midface(
      original.elements.map(e=>e.id==="malar-cheek-near"?
        {...e,kind:"contour"} as CrayonElement:e))).toThrow(RangeError);
  });

  it("retains optional jaw-neck, minimum detail, actual native CRAYON1 SSR and quarantined Storybook",()=>{
    expect(Cc0Anat1MidfaceBridgeV32.name).toContain("!dev");
    expect(Cc0Anat1MidfaceBridgeNearV32.name).toContain("!dev");
    for(const jawNeckForm of ["baseline","source-contour"] as const){
      const scene=crayonCc0FaceStudy({detail:.2,midfaceForm:"source-anat1-midface-bridge",
        eyeContact:"source-shade",jawNeckForm});
      expect(inspectCrayonScene(scene)).toEqual([]);
      const rendered=renderToStaticMarkup(<CrayonScene spec={scene} frame={299}/>);
      for(const id of CRAYON_F1_V32_ANAT1_IDS)
        expect(rendered).toContain('data-km-crayon-element="'+id+'"');
      expect(rendered).toContain('data-km-crayon-element="cheek-malar-bounce"');
      expect(rendered).toContain("data-km-crayon-paper-contact-wax");
      expect(rendered).not.toContain("<image");
      expect(rendered).not.toContain("<foreignObject");
    }
  },40_000);
});
