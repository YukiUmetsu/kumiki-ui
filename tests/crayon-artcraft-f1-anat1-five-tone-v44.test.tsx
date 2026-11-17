import {describe,it,expect} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {CrayonScene} from "../registry/video/materials/crayon-scene-react";
import {inspectCrayonScene} from "../registry/video/materials/crayon-scene";
import {crayonCc0FaceStudy} from "../src/video/crayon-artcraft-cc0-face";
import {
  CRAYON_F1_V44_SOURCE_SHA,CRAYON_F1_V44_FIVE_VALUE_IDS,
  CRAYON_F1_V44_PHOTO_VALUE_SAMPLES,crayonF1CalibrateSourceSkinV44,
} from "../src/video/crayon-artcraft-f1-anat1-five-tone-v44";
import {
  Cc0Anat1FiveToneFaceV44,Cc0Anat1FiveToneOrbitV44,
  Cc0Anat1FiveToneCheekV44,
} from "../src/video/crayon-artcraft-adult-face.stories";

describe("ArtCraft F1 V44 source-measured native connected facial value planes",()=>{
  it("records original CC0 photo values and isolates five native pigments",()=>{
    expect(CRAYON_F1_V44_SOURCE_SHA).toBe(
      "f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2");
    expect(CRAYON_F1_V44_FIVE_VALUE_IDS).toHaveLength(5);
    expect(new Set(CRAYON_F1_V44_FIVE_VALUE_IDS).size).toBe(5);
    expect(CRAYON_F1_V44_PHOTO_VALUE_SAMPLES.reviewApproved).toBe(false);
    expect(CRAYON_F1_V44_PHOTO_VALUE_SAMPLES.cheekUnderturn.source)
      .toEqual([115,78,64]);
    expect(CRAYON_F1_V44_PHOTO_VALUE_SAMPLES.cheekUnderturn.nativeV43)
      .toEqual([200,163,146]);
    expect(CRAYON_F1_V44_PHOTO_VALUE_SAMPLES.cheekBounce.source)
      .toEqual([240,208,189]);
    expect(CRAYON_F1_V44_PHOTO_VALUE_SAMPLES.nearOrbit.xy)
      .toEqual([254,514]);
  });

  it("retains V43 every source path, fine stroke, scene ID, order, paper and 300 frames",()=>{
    for(const detail of [.2,1] as const){
      const v43=crayonCc0FaceStudy({detail,midfaceForm:"source-anat1-photo-foliage-v43"});
      const v44=crayonCc0FaceStudy({detail,midfaceForm:"source-anat1-five-tone-v44"});
      expect(inspectCrayonScene(v43)).toEqual([]);
      expect(inspectCrayonScene(v44)).toEqual([]);
      for(const key of ["id","width","height","seed","camera","paper",
        "paperTooth","durationFrames"] as const)
        expect(v44[key]).toEqual(v43[key]);
      expect(v44.durationFrames).toBe(300);
      expect(v44.elements.map(e=>e.id)).toEqual(v43.elements.map(e=>e.id));
      let changed=0;
      for(let i=0;i<v43.elements.length;i++){
        const before=v43.elements[i],after=v44.elements[i];
        if(!CRAYON_F1_V44_FIVE_VALUE_IDS.some(id=>id===before.id)){
          expect(after).toEqual(before);
          continue;
        }
        if(before.kind!=="wax"||after.kind!=="wax")
          throw new Error("Lost existing photographed facial wax "+before.id);
        const {colors:beforeColors,pressure:beforePressure,
          spacing:beforeSpacing,markStrength:beforeStrength,
          blendRadius:beforeBlend,featherContacts:beforeFeather,
          ...beforeEverything}=before;
        const {colors:afterColors,pressure:afterPressure,
          spacing:afterSpacing,markStrength:afterStrength,
          blendRadius:afterBlend,featherContacts:afterFeather,
          ...afterEverything}=after;
        expect(afterEverything).toEqual(beforeEverything);
        expect(beforeSpacing).toBeGreaterThan(0);
        expect(beforeBlend).toBeGreaterThan(0);
        expect(beforeFeather===undefined||typeof beforeFeather==="boolean").toBe(true);
        expect(afterColors).not.toEqual(beforeColors);
        expect(afterPressure).not.toBe(beforePressure);
        expect(afterStrength).not.toBe(beforeStrength);
        expect(afterSpacing).toBeGreaterThan(0);
        expect(afterBlend).toBeGreaterThan(0);
        expect(afterFeather).toBe(true);
        expect(after.d).toBe(before.d);
        expect(after.parentId).toBe("face-outline");
        expect(after.clipToParent).toBe(true);
        expect(after.coverage).toBe("open");
        expect(after.timing).toEqual(before.timing);
        changed++;
      }
      expect(changed).toBe(5);
      expect(v44.elements.filter(e=>e.id.startsWith("hair-rooted-")))
        .toEqual(v43.elements.filter(e=>e.id.startsWith("hair-rooted-")));
      expect(v44.elements.filter(e=>e.id.startsWith("cc0-hedge-")))
        .toEqual(v43.elements.filter(e=>e.id.startsWith("cc0-hedge-")));
    }
  });

  it("fails closed for malformed original source wax or absent photographic environment",()=>{
    const baseline=crayonCc0FaceStudy({midfaceForm:"source-anat1-photo-foliage-v43"});
    expect(()=>crayonF1CalibrateSourceSkinV44([])).toThrow(RangeError);
    expect(()=>crayonF1CalibrateSourceSkinV44([
      ...baseline.elements,baseline.elements[0],
    ])).toThrow(RangeError);
    for(const id of [...CRAYON_F1_V44_FIVE_VALUE_IDS,
      "face-outline","hair-crown-surface","cc0-hedge-dark-underpaint",
      "source-brow-follicles-near"]){
      expect(()=>crayonF1CalibrateSourceSkinV44(baseline.elements.filter(e=>
        e.id!==id))).toThrow(RangeError);
    }
    expect(()=>crayonF1CalibrateSourceSkinV44(baseline.elements.map(e=>
      e.id==="cheek-malar-cast"?{...e,parentId:"hair-crown-surface"}:e)))
      .toThrow(RangeError);
    expect(()=>crayonF1CalibrateSourceSkinV44(baseline.elements.map(e=>
      e.id==="nose-root"?{...e,renderLayer:"backdrop" as const}:e)))
      .toThrow(RangeError);
  });

  it("renders native original paper and every facial landmark without raster overlays",()=>{
    for(const story of [
      Cc0Anat1FiveToneFaceV44,Cc0Anat1FiveToneOrbitV44,
      Cc0Anat1FiveToneCheekV44,
    ])expect(story.name).toContain("!dev");
    const spec=crayonCc0FaceStudy({detail:.2,
      midfaceForm:"source-anat1-five-tone-v44"});
    const html=renderToStaticMarkup(<CrayonScene spec={spec} frame={299}/>);
    for(const id of ["face-outline","socket-near","cheek-malar-cast",
      "cheek-malar-bounce","nose-root","chin-plane",
      "iris-near","iris-far","upper-lid-near","lower-lid-near",
      "lip-upper","source-brow-follicles-near","hair-crown-surface",
      "cc0-hedge-dark-underpaint"]){
      expect(html).toContain('data-km-crayon-element="'+id+'"');
    }
    expect(html).toContain('data-km-crayon-paper-contact-wax');
    expect(html).toContain('data-km-crayon-fiber-contact="dry-wax"');
    expect(html).not.toContain("<image");
    expect(html).not.toContain("<foreignObject");
  },60_000);
});
