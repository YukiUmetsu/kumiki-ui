import {describe,it,expect} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {CrayonScene} from "../registry/video/materials/crayon-scene-react";
import {inspectCrayonScene} from "../registry/video/materials/crayon-scene";
import {crayonCc0FaceStudy} from "../src/video/crayon-artcraft-cc0-face";
import {
  CRAYON_F1_V50_SOURCE,CRAYON_F1_V50_SPOTS,CRAYON_F1_V50_HAIR_FIELDS,
  CRAYON_F1_V50_HAIR_IDS,crayonF1AddPhotometricHairWaxV50,
} from "../src/video/crayon-artcraft-f1-anat1-photo-hair-v50";
const source=(detail:number,lashFinish:"sparse"|"rooted-flow")=>
  crayonCc0FaceStudy({detail,lashFinish,
    midfaceForm:"source-anat1-photometric-underpaint-v48"});
describe("ArtCraft V50 original-rooted physical hair source photometry",()=>{
  it("retains the true CC0 608x1082 crop, source medians and original pigment registration",()=>{
    expect(CRAYON_F1_V50_SOURCE.sha).toBe(
      "f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2");
    expect(CRAYON_F1_V50_SOURCE.artistApproved).toBe(false);
    expect(CRAYON_F1_V50_SPOTS.crown[0].photo).toEqual([45,34,29]);
    expect(CRAYON_F1_V50_SPOTS.crown[0].nativeV48).toEqual([73,51,44]);
    expect(CRAYON_F1_V50_SPOTS.left[0].photo).toEqual([92,64,50]);
    expect(CRAYON_F1_V50_SPOTS.right[1].nativeV48).toEqual([101,74,60]);
    expect(CRAYON_F1_V50_HAIR_FIELDS.crown).toHaveLength(4);
    expect(CRAYON_F1_V50_HAIR_FIELDS.left).toHaveLength(4);
    expect(CRAYON_F1_V50_HAIR_FIELDS.right).toHaveLength(3);
    for(const region of ["crown","left","right"] as const)
      for(const field of CRAYON_F1_V50_HAIR_FIELDS[region]){
        expect(field.x).toBeGreaterThanOrEqual(0);expect(field.x).toBeLessThanOrEqual(1);
        expect(field.y).toBeGreaterThanOrEqual(0);expect(field.y).toBeLessThanOrEqual(1);
        expect(field.radiusX).toBeGreaterThan(0);expect(field.radiusY).toBeGreaterThan(0);
        expect(field.strength).toBeGreaterThan(0);expect(field.strength).toBeLessThanOrEqual(1);
      }
  });
  it("keeps all V48 material, native root strands, 300 frames, camera, paper and face identical",()=>{
    for(const detail of [.2,1] as const)
    for(const lashFinish of ["sparse","rooted-flow"] as const){
      const before=source(detail,lashFinish),after={
        ...before,elements:crayonF1AddPhotometricHairWaxV50(before.elements)};
      expect(inspectCrayonScene(before)).toEqual([]);
      expect(inspectCrayonScene(after)).toEqual([]);
      for(const key of ["id","width","height","seed","paper","paperTooth",
        "camera","durationFrames"] as const)
        expect(after[key]).toEqual(before[key]);
      expect(after.durationFrames).toBe(300);
      expect(after.elements).toHaveLength(before.elements.length);
      for(let i=0;i<after.elements.length;i++){
        const a=after.elements[i],b=before.elements[i];
        if(CRAYON_F1_V50_HAIR_IDS.includes(a.id as typeof CRAYON_F1_V50_HAIR_IDS[number])){
          if(a.kind!=="wax"||b.kind!=="wax")throw Error("Lost original hair wax mass");
          const {underpaintFields,...old}=a;
          expect(old).toEqual(b);
          expect(underpaintFields?.length).toBeGreaterThan(2);
          expect(a.d).toEqual(b.d);
          expect(a.colors).toEqual(b.colors);
          expect(a.underpaintGradient).toEqual(b.underpaintGradient);
        }else expect(a).toEqual(b);
      }
      expect(after.elements.filter(x=>x.id.startsWith("hair-rooted-")))
        .toEqual(before.elements.filter(x=>x.id.startsWith("hair-rooted-")));
      expect(crayonF1AddPhotometricHairWaxV50(before.elements)).toEqual(after.elements);
    }
  });
  it("rejects incomplete source hair, malformed roots, double application and foreign face",()=>{
    const before=source(1,"sparse");
    expect(()=>crayonF1AddPhotometricHairWaxV50([])).toThrow(RangeError);
    expect(()=>crayonF1AddPhotometricHairWaxV50([...before.elements,before.elements[0]]))
      .toThrow(RangeError);
    for(const id of ["face-outline","hair-crown-surface","hair-left-curtain",
      "hair-right-curtain","iris-near","cc0-hedge-dark-underpaint"]){
      expect(()=>crayonF1AddPhotometricHairWaxV50(before.elements.filter(x=>x.id!==id)))
        .toThrow(RangeError);
    }
    expect(()=>crayonF1AddPhotometricHairWaxV50(
      crayonF1AddPhotometricHairWaxV50(before.elements))).toThrow(RangeError);
  });
  it("retains physical wax texture and actual SSR source geometry without third-party raster",()=>{
    const before=source(.2,"sparse");
    const after={...before,
      elements:crayonF1AddPhotometricHairWaxV50(before.elements)};
    const html=renderToStaticMarkup(<CrayonScene spec={after} frame={299}/>);
    for(const id of CRAYON_F1_V50_HAIR_IDS)
      expect(html).toContain('data-km-crayon-element="'+id+'"');
    expect(html).toContain('data-km-crayon-underpaint-fields="4"');
    expect(html).toContain('data-km-crayon-underpaint-fields="3"');
    expect(html).toContain('data-km-crayon-paper-contact-wax');
    expect(html).toContain('data-km-crayon-underpaint-grain');
    expect(html).not.toContain("<image");
  },60_000);
});
