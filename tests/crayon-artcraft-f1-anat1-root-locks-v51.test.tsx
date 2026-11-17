import {describe,it,expect} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {CrayonScene} from "../registry/video/materials/crayon-scene-react";
import {inspectCrayonScene} from "../registry/video/materials/crayon-scene";
import {crayonCc0FaceStudy} from "../src/video/crayon-artcraft-cc0-face";
import {CRAYON_F1_V51_SOURCE,CRAYON_F1_V51_SOURCE_GUIDES,
  CRAYON_F1_V51_LOCK_IDS,crayonF1AddPhotoRootLocksV51,
} from "../src/video/crayon-artcraft-f1-anat1-root-locks-v51";
import {Cc0Anat1RootLocksV51,Cc0Anat1RootCrownV51,
  Cc0Anat1RootLeftV51,Cc0Anat1RootRightV51,
} from "../src/video/crayon-artcraft-adult-face.stories";
const original=(detail:number,lashFinish:"sparse"|"rooted-flow")=>
  crayonCc0FaceStudy({detail,lashFinish,
    midfaceForm:"source-anat1-photometric-hair-v50"});
const variant=(detail:number,lashFinish:"sparse"|"rooted-flow")=>
  crayonCc0FaceStudy({detail,lashFinish,
    midfaceForm:"source-anat1-rooted-hair-v51"});
describe("ArtCraft V51 photo-observed source rooted hair topology",()=>{
  it("keeps CC0 source guide orientation, non-mirrored root and independent wax pigments",()=>{
    expect(CRAYON_F1_V51_SOURCE.sha).toBe(
      "f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2");
    expect(CRAYON_F1_V51_SOURCE.approved).toBe(false);
    expect(CRAYON_F1_V51_SOURCE_GUIDES.crown).toHaveLength(7);
    expect(CRAYON_F1_V51_SOURCE_GUIDES.left).toHaveLength(5);
    expect(CRAYON_F1_V51_SOURCE_GUIDES.right).toHaveLength(6);
    expect(CRAYON_F1_V51_SOURCE_GUIDES.crown[0][6]).toBeLessThan(200);
    expect(CRAYON_F1_V51_SOURCE_GUIDES.crown[4][6]).toBeGreaterThan(400);
    expect(CRAYON_F1_V51_LOCK_IDS).toHaveLength(9);
    expect(new Set(CRAYON_F1_V51_LOCK_IDS).size).toBe(9);
  });
  it("retains all original native 267+ fibers and every original source/film element byte-exact",()=>{
    for(const detail of [.2,1] as const)
    for(const lashFinish of ["sparse","rooted-flow"] as const){
      const before=original(detail,lashFinish),after=variant(detail,lashFinish);
      expect(inspectCrayonScene(before)).toEqual([]);
      expect(inspectCrayonScene(after)).toEqual([]);
      for(const key of ["id","width","height","seed","paper","paperTooth",
        "camera","durationFrames"] as const)
        expect(after[key]).toEqual(before[key]);
      expect(after.durationFrames).toBe(300);
      expect(after.elements.slice(0,before.elements.length)).toEqual(before.elements);
      expect(after.elements.length).toBe(before.elements.length+9);
      const locks=after.elements.slice(-9);
      expect(locks.map(x=>x.id)).toEqual(CRAYON_F1_V51_LOCK_IDS);
      for(const lock of locks){
        expect(lock.kind).toBe("contour");
        if(lock.kind!=="contour")throw new Error("Unexpected source lock");
        expect(lock.clipToParent).toBe(true);
        expect(lock.parentId).toContain("hair-");
        expect(lock.d).toMatch(/^M/);
        expect(lock.d).toMatch(/ C/);
        expect(lock.waxContact).toBe("dry-wax");
        expect(lock.waxPressure).toBeGreaterThan(.2);
      }
      const oldRoots=before.elements.filter(x=>x.id.startsWith("hair-rooted-"));
      expect(oldRoots.length).toBeGreaterThan(12);
      expect(after.elements.filter(x=>x.id.startsWith("hair-rooted-"))).toEqual(oldRoots);
      expect(variant(detail,lashFinish).elements).toEqual(after.elements);
    }
  });
  it("rejects duplicated roots, repeat application, foreign source and source strands falling outside contour",()=>{
    const before=original(1,"sparse");
    expect(()=>crayonF1AddPhotoRootLocksV51([],1)).toThrow(RangeError);
    expect(()=>crayonF1AddPhotoRootLocksV51(before.elements,.19)).toThrow(RangeError);
    expect(()=>crayonF1AddPhotoRootLocksV51(before.elements,NaN)).toThrow(RangeError);
    expect(()=>crayonF1AddPhotoRootLocksV51([...before.elements,before.elements[0]],1)).toThrow(RangeError);
    expect(()=>crayonF1AddPhotoRootLocksV51(
      crayonF1AddPhotoRootLocksV51(before.elements,1),1)).toThrow(RangeError);
    for(const id of ["hair-crown-surface","hair-left-curtain","hair-right-curtain","face-outline","iris-near"]){
      expect(()=>crayonF1AddPhotoRootLocksV51(before.elements.filter(x=>x.id!==id),1))
        .toThrow(RangeError);
    }
  });
  it("renders nine physical dry-wax source hair groupings and four !dev Storybook states",()=>{
    for(const s of [Cc0Anat1RootLocksV51,Cc0Anat1RootCrownV51,
      Cc0Anat1RootLeftV51,Cc0Anat1RootRightV51])
      expect(s.name).toContain("!dev");
    const html=renderToStaticMarkup(<CrayonScene spec={variant(.2,"sparse")} frame={299}/>);
    for(const id of CRAYON_F1_V51_LOCK_IDS)
      expect(html).toContain('data-km-crayon-element="'+id+'"');
    expect(html).toContain('data-km-crayon-paper-contact-wax');
    expect(html).not.toContain("<image");
  },60_000);
});
