import {describe,it,expect} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {CrayonScene} from "../registry/video/materials/crayon-scene-react";
import {inspectCrayonScene} from "../registry/video/materials/crayon-scene";
import {auditCrayonF1LashRootContinuity} from "../src/video/crayon-artcraft-f1-lash-clusters";
import {crayonCc0FaceStudy} from "../src/video/crayon-artcraft-cc0-face";
import {
  CRAYON_F1_V45_SOURCE,CRAYON_F1_V45_CHANGED_IDS,
  CRAYON_F1_V45_NEW_LASH_COUNT,crayonF1RefineNearTarsusV45,
} from "../src/video/crayon-artcraft-f1-anat1-eye-tarsus-v45";
import {
  Cc0Anat1SourceTarsusV45,Cc0Anat1NearTarsusV45,
  Cc0Anat1EyeCheekV45,
} from "../src/video/crayon-artcraft-adult-face.stories";

describe("Crayon ArtCraft V45 source tarsal form, scleral color and rooted native lash microcontact",()=>{
  it("records the authentic photographed canthus, neutral sclera and underlid correction source",()=>{
    expect(CRAYON_F1_V45_SOURCE.sha).toBe(
      "f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2");
    expect(CRAYON_F1_V45_SOURCE.independentApproval).toBe(false);
    expect(CRAYON_F1_V45_SOURCE.medialTearDuct.xy).toEqual([312,546]);
    expect(CRAYON_F1_V45_SOURCE.medialTearDuct.photo).toEqual([74,30,28]);
    expect(CRAYON_F1_V45_SOURCE.neutralSclera.photo).toEqual([131,132,132]);
    expect(CRAYON_F1_V45_NEW_LASH_COUNT).toBe(23);
    expect(CRAYON_F1_V45_CHANGED_IDS).toHaveLength(5);
    expect(new Set(CRAYON_F1_V45_CHANGED_IDS).size).toBe(5);
  });

  it("keeps every V43 ANAT1 eye/nose/face/hair/foliage path and seed, except source-rooted tarsal pigment",()=>{
    for(const detail of [.2,1] as const){
      const before=crayonCc0FaceStudy({
        detail,midfaceForm:"source-anat1-photo-foliage-v43",
      });
      const after=crayonCc0FaceStudy({
        detail,midfaceForm:"source-anat1-eye-tarsus-v45",
      });
      expect(inspectCrayonScene(before)).toEqual([]);
      expect(inspectCrayonScene(after)).toEqual([]);
      for(const prop of ["id","seed","width","height","paper",
        "paperTooth","camera","durationFrames"] as const)
        expect(after[prop]).toEqual(before[prop]);
      expect(after.durationFrames).toBe(300);
      expect(after.elements.map(e=>e.id)).toEqual(before.elements.map(e=>e.id));
      let changed=0,lashes=0;
      for(let i=0;i<before.elements.length;i++){
        const original=before.elements[i],candidate=after.elements[i];
        if(CRAYON_F1_V45_CHANGED_IDS.some(id=>id===original.id)){
          if(original.kind!=="wax"||candidate.kind!=="wax")
            throw new Error("Lost source-near tarsus native wax");
          // The anatomical contour, real source camera and all ANAT1 eye
          // geometry remain EXACT. Only five existing pigment touches
          // differ. No 'fake beautiful eye' hardcoded geometry.
          const {colors:a,pressure:b,spacing:c,markStrength:d,
            featherContacts:e,blendRadius:f,underpaintTooth:g,
            opaqueBurnish:h,underpaintGradient:k,...rest}=original;
          const {colors:A,pressure:B,spacing:C,markStrength:D,
            featherContacts:E,blendRadius:F,underpaintTooth:G,
            opaqueBurnish:H,underpaintGradient:K,...same}=candidate;
          expect(same).toEqual(rest);
          expect(A).not.toEqual(a);
          expect(B).toBeGreaterThan(0);
          expect(C).toBeGreaterThan(0);
          expect(D).toBeGreaterThan(0);
          expect(candidate.d).toBe(original.d);
          expect(candidate.parentId).toBe(original.parentId);
          expect(candidate.clipToParent).toBe(true);
          expect(candidate.timing).toEqual(original.timing);
          changed++;
        }else if(original.id==="lash-contact-near"){
          if(original.kind!=="contour"||candidate.kind!=="contour")
            throw new Error("Source lash component lost");
          expect(candidate.d.startsWith(original.d+" ")).toBe(true);
          expect((original.d.match(/M/g)??[])).toHaveLength(10);
          expect((candidate.d.match(/M/g)??[])).toHaveLength(33);
          const {d:a,...originalMeta}=original;
          const {d:b,...candidateMeta}=candidate;
          expect(candidateMeta).toEqual(originalMeta);
          lashes++;
        }else expect(candidate).toEqual(original);
      }
      expect(changed).toBe(5);
      expect(lashes).toBe(1);
      expect(after.elements.filter(e=>e.id.startsWith("hair-rooted-")))
        .toEqual(before.elements.filter(e=>e.id.startsWith("hair-rooted-")));
      expect(after.elements.filter(e=>e.id.startsWith("cc0-hedge-")))
        .toEqual(before.elements.filter(e=>e.id.startsWith("cc0-hedge-")));
    }
  });

  it("preserves pre-existing rooted-flow 33 source eyelashes and registers 23 more true tarsal contacts",()=>{
    const options={detail:1,lashFinish:"rooted-flow" as const};
    const v43=crayonCc0FaceStudy({
      ...options,midfaceForm:"source-anat1-photo-foliage-v43",
    });
    const v45=crayonCc0FaceStudy({
      ...options,midfaceForm:"source-anat1-eye-tarsus-v45",
    });
    expect(inspectCrayonScene(v45)).toEqual([]);
    const source=v43.elements.find(x=>x.id==="lash-contact-near");
    const result=v45.elements.find(x=>x.id==="lash-contact-near");
    if(source?.kind!=="contour"||result?.kind!=="contour")
      throw new Error("Missing ANAT1 root-flow source lash");
    expect((source.d.match(/M/g)??[])).toHaveLength(33);
    expect((result.d.match(/M/g)??[])).toHaveLength(56);
    expect(result.d.startsWith(source.d+" ")).toBe(true);
    const roots=auditCrayonF1LashRootContinuity(v45.elements);
    expect(roots.near.count).toBe(56);
    expect(roots.near.detached).toBe(0);
    expect(roots.near.maximumDistance).toBeLessThanOrEqual(5.5);
    expect(roots.far.detached).toBe(0);
  });

  it("fails closed if original V36 eye is detached, source follicle removed, or study double-applied",()=>{
    const original=crayonCc0FaceStudy({
      midfaceForm:"source-anat1-photo-foliage-v43",
    });
    expect(()=>crayonF1RefineNearTarsusV45([])).toThrow(RangeError);
    expect(()=>crayonF1RefineNearTarsusV45([
      ...original.elements,original.elements[0],
    ])).toThrow(RangeError);
    for(const id of [...CRAYON_F1_V45_CHANGED_IDS,
      "face-outline","iris-near","pupil-near","lash-contact-near",
      "cc0-hedge-dark-underpaint"]){
      expect(()=>crayonF1RefineNearTarsusV45(original.elements.filter(el=>
        el.id!==id))).toThrow(RangeError);
    }
    expect(()=>crayonF1RefineNearTarsusV45(original.elements.map(e=>
      e.id==="sclera-inner-contact-near"?{...e,parentId:"face-outline"}:e)))
      .toThrow(RangeError);
    expect(()=>crayonF1RefineNearTarsusV45(original.elements.map(e=>
      e.id==="lower-lid-near"?{...e,renderLayer:"backdrop" as const}:e)))
      .toThrow(RangeError);
    const v45=crayonF1RefineNearTarsusV45(original.elements);
    expect(()=>crayonF1RefineNearTarsusV45(v45)).toThrow(RangeError);
  });

  it("renders all original tarsal structure and fine physically deposited roots with no photographic overlays",()=>{
    for(const story of [
      Cc0Anat1SourceTarsusV45,Cc0Anat1NearTarsusV45,
      Cc0Anat1EyeCheekV45,
    ])expect(story.name).toContain("!dev");
    const scene=crayonCc0FaceStudy({detail:.2,
      midfaceForm:"source-anat1-eye-tarsus-v45"});
    const html=renderToStaticMarkup(<CrayonScene spec={scene} frame={299}/>);
    for(const id of ["sclera-near","sclera-inner-contact-near",
      "iris-near","pupil-near","upper-lid-near","lash-root-near",
      "lash-contact-near","lower-lid-near","lower-lid-margin-near",
      "upper-lid-crease-near","source-brow-follicles-near",
      "face-outline","hair-crown-surface","cc0-hedge-dark-underpaint"]){
      expect(html).toContain('data-km-crayon-element="'+id+'"');
    }
    expect(html).toContain('data-km-crayon-paper-contact-wax');
    expect(html).toContain('data-km-crayon-fiber-contact="dry-wax"');
    expect(html).not.toContain("<image");
    expect(html).not.toContain("<foreignObject");
  },60_000);
});
