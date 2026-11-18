import {describe,it,expect} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {CrayonScene} from "../registry/video/materials/crayon-scene-react";
import {inspectCrayonScene} from "../registry/video/materials/crayon-scene";
import {crayonCc0FaceStudy} from "../src/video/crayon-artcraft-cc0-face";
import {crayonF1RegisterAnat1Face} from "../src/video/crayon-artcraft-f1-anat1-malar";
import {
  CRAYON_F1_V46_SOURCE,CRAYON_F1_V46_NINE_EYE_IDS,
  crayonF1Anat1OrbitalGeometryV46,
  crayonF1RebuildOrbitalApertureV46,
} from "../src/video/crayon-artcraft-f1-anat1-orbital-aperture-v46";
import {
  Cc0Anat1OrbitalApertureV46,Cc0Anat1OrbitalRimV46,
  Cc0Anat1OrbitalCheekV46,
} from "../src/video/crayon-artcraft-adult-face.stories";

describe("ArtCraft CC0 V46 photographed ANAT1 orbital aperture structural proof",()=>{
  it("fits true CC0 canthi, upper sulcus and lower lid to the registered 3D eye tangent",()=>{
    const f=crayonF1RegisterAnat1Face();
    expect(f.model).toBe("ANAT1/MediaPipe-468-unmodified");
    expect(f.rmse).toBeLessThan(40);
    expect(f.artisticApproval).toBe(false);
    expect(CRAYON_F1_V46_SOURCE.sha).toBe(
      "f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2");
    expect(CRAYON_F1_V46_SOURCE.artApproved).toBe(false);
    expect(CRAYON_F1_V46_SOURCE.upperSulcus).toEqual([270,518]);
    expect(CRAYON_F1_V46_SOURCE.leftCanthus).toEqual([216,558]);
    expect(CRAYON_F1_V46_SOURCE.rightCanthus).toEqual([318,545]);
    expect(CRAYON_F1_V46_NINE_EYE_IDS).toHaveLength(9);
    expect(new Set(CRAYON_F1_V46_NINE_EYE_IDS).size).toBe(9);
    const shapes=crayonF1Anat1OrbitalGeometryV46();
    expect(Object.keys(shapes).sort()).toEqual([...CRAYON_F1_V46_NINE_EYE_IDS].sort());
    for(const [id,shape] of Object.entries(shapes)){
      expect(shape.d).toMatch(/^M[\d.\s]+ C.*Z$/);
      expect(shape.d.match(/M/g)).toHaveLength(1);
      expect(shape.d.match(/C/g)).toHaveLength(4);
      expect(shape.d).not.toContain("NaN");
      expect(shape.d).not.toContain("Infinity");
      expect(shape.bounds.width).toBeGreaterThan(20);
      expect(shape.bounds.width).toBeLessThan(160);
      expect(shape.bounds.height).toBeGreaterThan(18);
      expect(shape.bounds.height).toBeLessThan(105);
      expect(shape.bounds.x).toBeGreaterThan(185);
      expect(shape.bounds.y).toBeGreaterThan(480);
      expect(shape.angle).toBeGreaterThan(-45);
      expect(shape.angle).toBeLessThan(45);
      expect(id).not.toContain("far");
    }
    // The upper tarsal sulcus is a separate 3D skin fold ABOVE the
    // actual wet upper lid and the exposed lower-lid roll.
    expect(shapes["upper-lid-crease-near"].bounds.y)
      .toBeLessThan(shapes["upper-lid-near"].bounds.y);
    expect(shapes["upper-lid-near"].bounds.y)
      .toBeLessThan(shapes["lower-lid-margin-near"].bounds.y);
  });

  it("retains every V43 native wax pigment, photo backdrop, 18 hair groups, face seed, paper and full film",()=>{
    for(const detail of [.2,1] as const){
      for(const lashFinish of ["sparse","rooted-flow"] as const){
        const before=crayonCc0FaceStudy({
          detail,lashFinish,midfaceForm:"source-anat1-photo-foliage-v43",
        });
        const after=crayonCc0FaceStudy({
          detail,lashFinish,midfaceForm:"source-anat1-orbital-aperture-v46",
        });
        expect(inspectCrayonScene(before)).toEqual([]);
        expect(inspectCrayonScene(after)).toEqual([]);
        for(const key of ["id","seed","width","height","paper",
          "paperTooth","camera","durationFrames"] as const)
          expect(after[key]).toEqual(before[key]);
        expect(after.durationFrames).toBe(300);
        expect(after.elements.map(x=>x.id)).toEqual(before.elements.map(x=>x.id));
        let changed=0;
        for(let i=0;i<after.elements.length;i++){
          const a=before.elements[i],b=after.elements[i];
          if(!CRAYON_F1_V46_NINE_EYE_IDS.some(id=>id===a.id)){
            expect(b).toEqual(a);
            continue;
          }
          if(a.kind!=="wax"||b.kind!=="wax")
            throw new Error("Unregistered original eye wax primitive "+a.id);
          expect(b.d).not.toBe(a.d);
          expect(b.d).toMatch(/^M.* C.*Z$/);
          expect(b.bounds).not.toEqual(a.bounds);
          expect(b.parentId).toEqual(a.parentId);
          expect(b.clipToParent).toBe(true);
          const {d:oldPath,bounds:oldBounds,angle:oldAngle,...oldWax}=a;
          const {d:newPath,bounds:newBounds,angle:newAngle,...newWax}=b;
          expect(newWax).toEqual(oldWax);
          expect(oldPath.length).toBeGreaterThan(20);
          expect(newPath.length).toBeGreaterThan(20);
          expect(oldBounds.width).toBeGreaterThan(10);
          expect(newBounds.width).toBeGreaterThan(20);
          expect(Number.isFinite(newAngle)).toBe(true);
          expect(Number.isFinite(oldAngle)).toBe(true);
          changed++;
        }
        expect(changed).toBe(9);
        expect(after.elements.filter(x=>x.id.startsWith("hair-rooted-")))
          .toEqual(before.elements.filter(x=>x.id.startsWith("hair-rooted-")));
        expect(after.elements.filter(x=>x.id.startsWith("cc0-hedge-")))
          .toEqual(before.elements.filter(x=>x.id.startsWith("cc0-hedge-")));
        for(const id of ["lash-contact-near","lash-contact-far","iris-far",
          "pupil-far","upper-lid-far","cheek-malar-bounce"]){
          expect(after.elements.find(x=>x.id===id))
            .toEqual(before.elements.find(x=>x.id===id));
        }
      }
    }
  });

  it("fails closed on incomplete photograph, wrong parent, duplicate or repeated source distortion",()=>{
    const baseline=crayonCc0FaceStudy({
      midfaceForm:"source-anat1-photo-foliage-v43",
    });
    const elems=baseline.elements;
    expect(()=>crayonF1RebuildOrbitalApertureV46([])).toThrow(RangeError);
    expect(()=>crayonF1RebuildOrbitalApertureV46([...elems,elems[0]]))
      .toThrow(RangeError);
    for(const id of [...CRAYON_F1_V46_NINE_EYE_IDS,
      "face-outline","hair-crown-surface","source-brow-follicles-near",
      "cc0-hedge-dark-underpaint","sclera-far","iris-far"]){
      expect(()=>crayonF1RebuildOrbitalApertureV46(elems.filter(el=>
        el.id!==id))).toThrow(RangeError);
    }
    expect(()=>crayonF1RebuildOrbitalApertureV46(elems.map(el=>
      el.id==="iris-near"?{...el,parentId:"face-outline"}:el)))
      .toThrow(RangeError);
    expect(()=>crayonF1RebuildOrbitalApertureV46(elems.map(el=>
      el.id==="upper-lid-crease-near"?{...el,renderLayer:"backdrop" as const}:el)))
      .toThrow(RangeError);
    const once=crayonF1RebuildOrbitalApertureV46(elems);
    expect(()=>crayonF1RebuildOrbitalApertureV46(once)).toThrow(RangeError);
  });

  it("renders each real optical layer and original fibers as CRAYON1 native wax, not photo-pasted pixels",()=>{
    for(const story of [
      Cc0Anat1OrbitalApertureV46,Cc0Anat1OrbitalRimV46,
      Cc0Anat1OrbitalCheekV46,
    ])expect(story.name).toContain("!dev");
    const scene=crayonCc0FaceStudy({
      detail:.2,midfaceForm:"source-anat1-orbital-aperture-v46",
    });
    const html=renderToStaticMarkup(<CrayonScene spec={scene} frame={299}/>);
    for(const id of [...CRAYON_F1_V46_NINE_EYE_IDS,
      "face-outline","iris-far","pupil-far","nose-dorsum",
      "source-brow-follicles-near","hair-crown-surface",
      "cc0-hedge-dark-underpaint","lash-contact-near"]){
      expect(html).toContain('data-km-crayon-element="'+id+'"');
    }
    expect(html).toContain('data-km-crayon-paper-contact-wax');
    expect(html).toContain('data-km-crayon-fiber-contact="dry-wax"');
    expect(html).not.toContain("<image");
    expect(html).not.toContain("<foreignObject");
  },60_000);
});
