import {describe,it,expect} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {CrayonScene} from "../registry/video/materials/crayon-scene-react";
import {inspectCrayonScene} from "../registry/video/materials/crayon-scene";
import {crayonCc0FaceStudy} from "../src/video/crayon-artcraft-cc0-face";
import {crayonF1RegisterAnat1Face} from "../src/video/crayon-artcraft-f1-anat1-malar";
import {
  CRAYON_F1_V47_SOURCE_SHA,CRAYON_F1_V47_REGIONS,
  CRAYON_F1_V47_SOURCE_SAMPLES,CRAYON_F1_V47_NEW_IDS,
  crayonF1AddContinuousFaceWaxV47,
} from "../src/video/crayon-artcraft-f1-anat1-continuous-face-v47";
import {
  Cc0Anat1ContinuousFaceV47,Cc0Anat1CheekFormV47,
  Cc0Anat1OrbitMalarV47,
} from "../src/video/crayon-artcraft-adult-face.stories";

const byId=(ids:readonly {id:string}[],id:string)=>ids.find(x=>x.id===id);
describe("ArtCraft F1 V47 physically connected source-registered ANAT1 3D facial wax flow",()=>{
  it("uses the exact original CC0 crop and photo-vs-same-frame skin witnesses, not invented flat pigment",()=>{
    expect(CRAYON_F1_V47_SOURCE_SHA).toBe(
      "f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2");
    const fit=crayonF1RegisterAnat1Face();
    expect(fit.model).toBe("ANAT1/MediaPipe-468-unmodified");
    expect(fit.artisticApproval).toBe(false);
    expect(fit.rmse).toBeLessThan(40);
    expect(CRAYON_F1_V47_REGIONS).toEqual([
      "malar-light","orbito-malar","lateral-cast","nasal-root","jaw-roll",
    ]);
    expect(CRAYON_F1_V47_NEW_IDS).toHaveLength(5);
    expect(CRAYON_F1_V47_SOURCE_SAMPLES).toHaveLength(5);
    for(const x of CRAYON_F1_V47_SOURCE_SAMPLES){
      expect(x.originalCubic).toHaveLength(8);
      expect(x.vertex).toBeTruthy();
      expect(x.at).toHaveLength(2);
      expect(x.photo).toHaveLength(3);
      expect(x.nativeV46).toHaveLength(3);
      expect(x.photo).not.toEqual(x.nativeV46);
    }
    const cast=CRAYON_F1_V47_SOURCE_SAMPLES.find(x=>x.id==="lateral-cast");
    expect(cast?.photo).toEqual([123,85,67]);
    expect(cast?.nativeV46).toEqual([203,166,149]);
    const malar=CRAYON_F1_V47_SOURCE_SAMPLES.find(x=>x.id==="malar-light");
    expect(malar?.photo).toEqual([240,207,191]);
    expect(malar?.nativeV46).toEqual([224,187,168]);
  });

  it("appends five native contiguous, parent-clipped dry-wax mark groups WITHOUT changing any original V46 element, film, camera, seed, or pigment",()=>{
    for(const detail of [.2,1] as const){
      for(const lashFinish of ["sparse","rooted-flow"] as const){
        const options={detail,lashFinish};
        const before=crayonCc0FaceStudy({
          ...options,midfaceForm:"source-anat1-orbital-aperture-v46",
        });
        const after=crayonCc0FaceStudy({
          ...options,midfaceForm:"source-anat1-continuous-face-v47",
        });
        expect(inspectCrayonScene(before)).toEqual([]);
        expect(inspectCrayonScene(after)).toEqual([]);
        for(const key of ["id","width","height","durationFrames","seed",
          "paper","paperTooth","camera"] as const)
          expect(after[key]).toEqual(before[key]);
        expect(after.durationFrames).toBe(300);
        expect(after.elements).toHaveLength(before.elements.length+5);
        expect(after.elements.slice(0,before.elements.length)).toEqual(before.elements);
        const newborn=after.elements.slice(before.elements.length);
        expect(newborn.map(e=>e.id)).toEqual(CRAYON_F1_V47_NEW_IDS);
        const counts=[82,70,115,65,82];
        newborn.forEach((el,i)=>{
          if(el.kind!=="contour")throw new Error("Lost native dry wax geometry");
          expect(el.d).toMatch(/^M[\d.]+ [\d.]+ C/);
          expect((el.d.match(/M/g)??[])).toHaveLength(counts[i]);
          expect(el.d).not.toContain("NaN");
          expect(el.d).not.toContain("Infinity");
          expect(el.d.length).toBeLessThan(25000);
          expect(el.waxContact).toBe("dry-wax");
          expect(el.waxPressure).toBeGreaterThanOrEqual(.2);
          expect(el.waxPressure).toBeLessThanOrEqual(1);
          expect(el.parentId).toBe("face-outline");
          expect(el.clipToParent).toBe(true);
          expect(el.opacity).toBeGreaterThanOrEqual(.08);
          expect(el.opacity).toBeLessThanOrEqual(.42);
          expect(el.width).toBeGreaterThan(0);
          expect(el.width).toBeLessThan(1.2);
          expect(el.timing).toEqual({start:245,end:299});
        });
        expect(after.elements.filter(e=>e.id.startsWith("hair-rooted-")))
          .toEqual(before.elements.filter(e=>e.id.startsWith("hair-rooted-")));
        expect(after.elements.filter(e=>e.id.startsWith("cc0-hedge-")))
          .toEqual(before.elements.filter(e=>e.id.startsWith("cc0-hedge-")));
        for(const id of ["sclera-near","iris-near","pupil-near",
          "upper-lid-near","lash-contact-near","nose-root",
          "cheek-malar-cast","cheek-malar-bounce",
          "source-brow-follicles-near","face-outline","hair-crown-surface"]){
          expect(byId(after.elements,id)).toEqual(byId(before.elements,id));
        }
        const repeated=crayonCc0FaceStudy({
          ...options,midfaceForm:"source-anat1-continuous-face-v47",
        });
        expect(repeated.elements).toEqual(after.elements);
      }
    }
  });

  it("fails closed on missing source skin, missing photo environment, duplicate IDs or double application",()=>{
    const source=crayonCc0FaceStudy({
      midfaceForm:"source-anat1-orbital-aperture-v46",
    });
    expect(()=>crayonF1AddContinuousFaceWaxV47([])).toThrow(RangeError);
    expect(()=>crayonF1AddContinuousFaceWaxV47([
      ...source.elements,source.elements[0],
    ])).toThrow(RangeError);
    for(const id of ["face-outline","cheek-malar-bounce",
      "malar-cheek-near","cheek-malar-cast","nose-root","chin-plane",
      "iris-near","iris-far","hair-crown-surface",
      "source-brow-follicles-near","cc0-hedge-dark-underpaint"]){
      expect(()=>crayonF1AddContinuousFaceWaxV47(source.elements.filter(x=>
        x.id!==id))).toThrow(RangeError);
    }
    expect(()=>crayonF1AddContinuousFaceWaxV47(
      crayonF1AddContinuousFaceWaxV47(source.elements))).toThrow(RangeError);
  });

  it("renders physical dry wax on exact original photo-driven 3D form without raster overlays",()=>{
    for(const story of [
      Cc0Anat1ContinuousFaceV47,Cc0Anat1CheekFormV47,
      Cc0Anat1OrbitMalarV47,
    ])expect(story.name).toContain("!dev");
    const scene=crayonCc0FaceStudy({
      detail:.2,midfaceForm:"source-anat1-continuous-face-v47",
    });
    const html=renderToStaticMarkup(<CrayonScene spec={scene} frame={299}/>);
    for(const id of [...CRAYON_F1_V47_NEW_IDS,"face-outline",
      "iris-near","iris-far","hair-crown-surface",
      "source-brow-follicles-near","cc0-hedge-dark-underpaint"]){
      expect(html).toContain('data-km-crayon-element="'+id+'"');
    }
    expect(html).toContain('data-km-crayon-fiber-contact="dry-wax"');
    expect(html).toContain('data-km-crayon-paper-contact-wax');
    expect(html).not.toContain("<image");
    expect(html).not.toContain("<foreignObject");
  },60_000);
});
