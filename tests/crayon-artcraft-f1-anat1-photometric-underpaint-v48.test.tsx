import {describe,it,expect} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {CrayonScene} from "../registry/video/materials/crayon-scene-react";
import {inspectCrayonScene} from "../registry/video/materials/crayon-scene";
import {crayonCc0FaceStudy} from "../src/video/crayon-artcraft-cc0-face";
import {CRAYON_F1_V48_FIELDS,CRAYON_F1_V48_SOURCE_SHA,CRAYON_F1_V48_WITNESSES,
  crayonF1BuildPhotometricUnderpaintV48} from "../src/video/crayon-artcraft-f1-anat1-skin-underpaint-v48";
import {Cc0Anat1PhotometricUnderpaintV48,Cc0Anat1CheekUnderpaintV48,
  Cc0Anat1OrbitUnderpaintV48} from "../src/video/crayon-artcraft-adult-face.stories";
describe("V48 complete original photographic crayon facial underpaint",()=>{
  it("uses eight measured CC0-vs-native photo witnesses without substituting source raster",()=>{
    expect(CRAYON_F1_V48_SOURCE_SHA).toBe(
      "f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2");
    expect(CRAYON_F1_V48_FIELDS).toHaveLength(8);
    expect(CRAYON_F1_V48_WITNESSES).toHaveLength(8);
    expect(CRAYON_F1_V48_WITNESSES[0].source).toEqual([123,85,67]);
    expect(CRAYON_F1_V48_WITNESSES[0].nativeV46).toEqual([203,166,149]);
    expect(CRAYON_F1_V48_FIELDS.every(f=>f.x>=0&&f.x<=1&&
      f.y>=0&&f.y<=1&&f.strength>0)).toBe(true);
  });
  it("modifies only the original continuous face undercoat: all source geometry and 300 frames intact",()=>{
    for(const detail of [.2,1] as const)for(const lashFinish of ["sparse","rooted-flow"] as const){
      const old=crayonCc0FaceStudy({detail,lashFinish,midfaceForm:"source-anat1-orbital-aperture-v46"});
      const next=crayonCc0FaceStudy({detail,lashFinish,midfaceForm:"source-anat1-photometric-underpaint-v48"});
      expect(inspectCrayonScene(old)).toEqual([]);
      expect(inspectCrayonScene(next)).toEqual([]);
      expect(next.durationFrames).toBe(300);
      for(const key of ["id","width","height","seed","paper","paperTooth","camera"] as const)
        expect(next[key]).toEqual(old[key]);
      expect(next.elements).toHaveLength(old.elements.length);
      next.elements.forEach((x,i)=>{
        const y=old.elements[i];
        if(x.id==="face-outline"){
          expect(x).toEqual({...y,underpaintFields:CRAYON_F1_V48_FIELDS});
          if(x.kind==="wax"&&y.kind==="wax"){
            expect(x.d).toBe(y.d);
            expect(x.colors).toEqual(y.colors);
            expect(x.underpaintGradient).toEqual(y.underpaintGradient);
            expect(x.underpaintTooth).toBe(y.underpaintTooth);
          }
        }else expect(x).toEqual(y);
      });
      expect(crayonCc0FaceStudy({detail,lashFinish,
        midfaceForm:"source-anat1-photometric-underpaint-v48"}).elements).toEqual(next.elements);
    }
  });
  it("rejects duplicate skin passes or missing photo-registered anatomy",()=>{
    const old=crayonCc0FaceStudy({midfaceForm:"source-anat1-orbital-aperture-v46"});
    expect(()=>crayonF1BuildPhotometricUnderpaintV48([])).toThrow(RangeError);
    expect(()=>crayonF1BuildPhotometricUnderpaintV48([...old.elements,old.elements[0]]))
      .toThrow(RangeError);
    for(const id of ["face-outline","iris-near","lower-lid-near","cc0-hedge-dark-underpaint"])
      expect(()=>crayonF1BuildPhotometricUnderpaintV48(old.elements.filter(x=>x.id!==id)))
        .toThrow(RangeError);
    const once=crayonF1BuildPhotometricUnderpaintV48(old.elements);
    expect(()=>crayonF1BuildPhotometricUnderpaintV48(once)).toThrow(RangeError);
  });
  it("shows three !dev interactive Storybook inspections with full native wax, not an image overlay",()=>{
    for(const s of [Cc0Anat1PhotometricUnderpaintV48,Cc0Anat1CheekUnderpaintV48,
      Cc0Anat1OrbitUnderpaintV48])expect(s.name).toContain("!dev");
    const face=crayonCc0FaceStudy({detail:.2,midfaceForm:"source-anat1-photometric-underpaint-v48"});
    const html=renderToStaticMarkup(<CrayonScene spec={face} frame={299}/>);
    expect(html).toContain('data-km-crayon-underpaint-fields="8"');
    expect(html).toContain('data-km-crayon-underpaint-gradient=""');
    expect(html).toContain('data-km-crayon-paper-contact-wax');
    expect(html).toContain('data-km-crayon-element="iris-near"');
    expect(html).not.toContain("<image");
  },60_000);
});
