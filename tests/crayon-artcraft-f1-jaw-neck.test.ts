import {describe,it,expect} from "vitest";
import {inspectCrayonScene} from "../registry/video/materials/crayon-scene";
import {crayonCc0FaceStudy} from "../src/video/crayon-artcraft-cc0-face";
import {CRAYON_F1_JAW_NECK_IDS,crayonF1ReconstructJawNeck}
  from "../src/video/crayon-artcraft-f1-jaw-neck-geometry";

const options={
  eyeContact:"baseline" as const,
  midfaceForm:"baseline" as const,
  lashFinish:"sparse" as const,
};

describe("ArtCraft v9 F1 photograph-grounded jaw/neck native wax",()=>{
  it("retains exactly all original semantic regions outside six modified wax masses",()=>{
    const baseline=crayonCc0FaceStudy({...options,jawNeckForm:"baseline"});
    const candidate=crayonCc0FaceStudy({...options,jawNeckForm:"source-contour"});
    const changed=new Set(CRAYON_F1_JAW_NECK_IDS);
    expect(changed.size).toBe(6);
    expect(new Set(candidate.elements.map(e=>e.id)).size)
      .toBe(candidate.elements.length);
    expect(candidate.seed).toBe(baseline.seed);
    expect(candidate.camera).toEqual(baseline.camera);
    expect(candidate.width).toBe(608);
    expect(candidate.height).toBe(1082);
    expect(candidate.durationFrames).toBe(300);
    expect(candidate.elements.length).toBe(baseline.elements.length);
    expect(candidate.elements.filter(e=>!changed.has(e.id)))
      .toEqual(baseline.elements.filter(e=>!changed.has(e.id)));
    for(const id of changed){
      const prev=baseline.elements.find(e=>e.id===id);
      const next=candidate.elements.find(e=>e.id===id);
      if(prev?.kind!=="wax"||next?.kind!=="wax")
        throw new Error("Missing expected wax root "+id);
      expect(next.d).not.toBe(prev.d);
      expect(next.parentId).toBe(prev.parentId);
      expect(next.clipToParent).toBe(prev.clipToParent);
      expect(next.coverage).toBe(prev.coverage);
      expect(next.timing).toEqual(prev.timing);
      expect(next.deposition).toBe("stroke-built");
    }
    expect(inspectCrayonScene(baseline)).toEqual([]);
    expect(inspectCrayonScene(candidate)).toEqual([]);
  });

  it("makes lower jaw a continuous asymmetric contour instead of an oval/straight neck rectangle",()=>{
    const candidate=crayonCc0FaceStudy({...options,jawNeckForm:"source-contour"});
    const get=(id:string)=>candidate.elements.find(e=>e.id===id);
    const face=get("face-outline"),jaw=get("jaw-underside"),chin=get("chin-plane");
    if(face?.kind!=="wax"||jaw?.kind!=="wax"||chin?.kind!=="wax")
      throw Error("Missing root face, connected jaw or chin");
    // The observed F1 chin is at source (398,858), not the symmetric
    // midline of a generic frontal head. Curved geometry crosses it.
    expect(face.d).toContain("421 852");
    expect(face.d).toContain("389 869");
    expect(jaw.d).toContain("420 849");
    expect(jaw.d).toMatch(/C\d/);
    expect((face.d.match(/C/g)??[]).length).toBeGreaterThanOrEqual(12);
    expect(jaw.coverage).toBe("open");
    expect(jaw.featherContacts).toBe(true);
    expect(jaw.blendRadius).toBeGreaterThanOrEqual(16);
    expect(chin.coverage).toBe("open");
    expect(chin.parentId).toBe("face-outline");
    expect(chin.blendRadius).toBeGreaterThanOrEqual(10);
    expect(chin.underpaintTooth).toBeGreaterThanOrEqual(0);
  });

  it("preserves a connected neck root and feathered submandibular occlusion",()=>{
    const candidate=crayonCc0FaceStudy({...options,jawNeckForm:"source-contour"});
    const get=(id:string)=>candidate.elements.find(e=>e.id===id);
    const ids=candidate.elements.map(e=>e.id);
    const neck=get("neck-attached");
    if(neck?.kind!=="wax")throw Error("Missing cervical base");
    expect(neck.coverage).toBe("opaque");
    expect(neck.d).toContain("440 827");
    expect(neck.d).toContain("480 1091");
    expect(neck.underpaintGradient?.shadow).toBe("#35272b");
    expect(neck.underpaintGradient?.focusY).toBeGreaterThan(.8);
    for(const id of ["neck-submandibular-cast","neck-cervical-turn"]){
      const e=get(id);
      if(e?.kind!=="wax")throw new Error("Missing jaw-rooted neck "+id);
      expect(e.parentId).toBe("neck-attached");
      expect(e.clipToParent).toBe(true);
      expect(e.coverage).toBe("open");
      expect(e.featherContacts).toBe(true);
      expect(e.blendRadius).toBeGreaterThanOrEqual(18);
      expect(ids.indexOf("neck-attached")).toBeLessThan(ids.indexOf(id));
      expect(ids.indexOf(id)).toBeLessThan(ids.indexOf("face-outline"));
    }
    expect(inspectCrayonScene(candidate)).toEqual([]);
  });

  it("supports 20%-detail frames and all independent eye/midface combination switches",()=>{
    for(const eyeContact of ["baseline","source-shade"] as const){
      for(const midfaceForm of ["baseline","source-volume"] as const){
        const scene=crayonCc0FaceStudy({
          detail:.2,eyeContact,midfaceForm,jawNeckForm:"source-contour",
        });
        expect(inspectCrayonScene(scene)).toEqual([]);
      }
    }
    expect(()=>crayonCc0FaceStudy({
      jawNeckForm:"bad" as "source-contour",
    })).toThrow(RangeError);
    expect(()=>crayonF1ReconstructJawNeck([])).toThrow(RangeError);
  });
});
