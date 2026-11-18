import {describe,it,expect} from "vitest";
import {crayonCc0FaceStudy} from "../src/video/crayon-artcraft-cc0-face";
import {
  CRAYON_F1_V63_WITNESSES,
  crayonF1ConnectedFacePlanesV63,
} from "../src/video/crayon-artcraft-f1-anat1-connected-face-v63";

const PATCH_IDS=[
  "lower-lid-near","cheek-malar-cast","cheek-malar-bounce",
  "nose-root","nose-dorsum","nose-sidewall-form","jaw-underside",
] as const;

describe("Crayon ArtCraft V63 connected five-plane value calibration",()=>{
  it("retunes only seven existing source-shaped wax planes and preserves every path",()=>{
    const base=crayonCc0FaceStudy({midfaceForm:"source-anat1-hair-edge-v57"});
    const result=crayonF1ConnectedFacePlanesV63(base.elements);
    expect(result).toHaveLength(base.elements.length);
    const before=new Map(base.elements.map(element=>[element.id,element]));
    const after=new Map(result.map(element=>[element.id,element]));
    expect(PATCH_IDS.every(id=>before.has(id)&&after.has(id))).toBe(true);
    for(const id of PATCH_IDS){
      const old=before.get(id)!;
      const next=after.get(id)!;
      expect(old.kind).toBe("wax");
      expect(next.kind).toBe("wax");
      if(old.kind!=="wax"||next.kind!=="wax")throw new Error("expected wax plane");
      expect(next.d).toBe(old.d);
      expect(next.bounds).toEqual(old.bounds);
      expect(next.timing).toEqual(old.timing);
      expect(next.parentId).toBe(old.parentId);
      expect(next.underpaintFields).toBe(old.underpaintFields);
      expect(next.colors).not.toEqual(old.colors);
    }
    for(const old of base.elements){
      if(!PATCH_IDS.includes(old.id as typeof PATCH_IDS[number]))
        expect(after.get(old.id)).toBe(old);
    }
  });

  it("exposes V63 as a reversible opt-in face variant over the unchanged V57 geometry",()=>{
    const v57=crayonCc0FaceStudy({midfaceForm:"source-anat1-hair-edge-v57"});
    const v63=crayonCc0FaceStudy({
      midfaceForm:"source-anat1-connected-face-v63",
    });
    expect(v63.elements).toHaveLength(v57.elements.length);
    const before=new Map(v57.elements.map(element=>[element.id,element]));
    const after=new Map(v63.elements.map(element=>[element.id,element]));
    for(const id of PATCH_IDS){
      const old=before.get(id)!;
      const next=after.get(id)!;
      if(old.kind!=="wax"||next.kind!=="wax")throw new Error("expected wax plane");
      expect(next.colors).not.toEqual(old.colors);
      expect(next.d).toBe(old.d);
      expect(next.bounds).toEqual(old.bounds);
      expect(next.timing).toEqual(old.timing);
      expect(next.parentId).toBe(old.parentId);
    }
    for(const old of v57.elements){
      if(!PATCH_IDS.includes(old.id as typeof PATCH_IDS[number]))
        expect(after.get(old.id)).toEqual(old);
    }
  });

  it("records the six measured V57 source-to-render value witnesses",()=>{
    expect(CRAYON_F1_V63_WITNESSES).toHaveLength(6);
    expect(CRAYON_F1_V63_WITNESSES.map(item=>item.id)).toEqual([
      "infraorbital-cast","lateral-undercheek","nasal-root",
      "malar-light-return","nasal-ridge-return","mandibular-roll",
    ]);
    for(const witness of CRAYON_F1_V63_WITNESSES){
      expect(witness.sourceRgb).toHaveLength(3);
      expect(witness.v57Rgb).toHaveLength(3);
      expect(witness.at).toHaveLength(2);
    }
  });

  it("fails closed if any required source plane is missing",()=>{
    const base=crayonCc0FaceStudy({midfaceForm:"source-anat1-hair-edge-v57"});
    const incomplete=base.elements.filter(element=>element.id!=="cheek-malar-cast");
    expect(()=>crayonF1ConnectedFacePlanesV63(incomplete)).toThrow(RangeError);
  });
});
