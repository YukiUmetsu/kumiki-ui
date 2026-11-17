import {describe,it,expect} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {CrayonScene} from "../registry/video/materials/crayon-scene-react";
import {inspectCrayonScene} from "../registry/video/materials/crayon-scene";
import {crayonCc0FaceStudy} from "../src/video/crayon-artcraft-cc0-face";
import {CRAYON_F1_V48_FIELDS} from "../src/video/crayon-artcraft-f1-anat1-skin-underpaint-v48";
import {CRAYON_F1_V49_OBSERVATIONS,CRAYON_F1_V49_FIELDS,
  CRAYON_F1_V49_SOURCE_SHA,crayonF1AddObliqueSourceVolumeV49}
  from "../src/video/crayon-artcraft-f1-anat1-oblique-volume-v49";
import {Cc0Anat1ObliqueVolumeV49,Cc0Anat1ObliqueCheekV49,
  Cc0Anat1ObliqueOrbitV49} from "../src/video/crayon-artcraft-adult-face.stories";

describe("CRAYON1 F1 V49 original-source oblique wax volume / ArtCraft HOLD",()=>{
  it("has four independent photographed tangent observations, not generic reused stamps",()=>{
    expect(CRAYON_F1_V49_SOURCE_SHA).toBe(
      "f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2");
    expect(CRAYON_F1_V49_OBSERVATIONS).toHaveLength(4);
    expect(new Set(CRAYON_F1_V49_OBSERVATIONS.map(x=>x.id)).size).toBe(4);
    expect(CRAYON_F1_V49_FIELDS).toHaveLength(4);
    const b={x:73,y:272,width:440,height:611};
    CRAYON_F1_V49_OBSERVATIONS.forEach((obs,i)=>{
      const field=CRAYON_F1_V49_FIELDS[i];
      expect(field.x).toBeCloseTo((obs.at[0]-b.x)/b.width,4);
      expect(field.y).toBeCloseTo((obs.at[1]-b.y)/b.height,4);
      expect(field.rotationDeg).toBe(obs.rotationDeg);
      expect(Math.abs(field.rotationDeg??0)).toBeLessThan(89);
      expect(field.radiusX).toBeGreaterThan(field.radiusY);
      expect(field.strength).toBeGreaterThan(0);
      expect(field.strength).toBeLessThan(1);
    });
    expect(new Set(CRAYON_F1_V49_FIELDS.map(f=>f.rotationDeg)).size).toBe(4);
  });
  it("retains exact V48 wax, 8 fields, every original source geometry & 300 animation frames",()=>{
    for(const detail of [.2,1] as const)
      for(const lashFinish of ["sparse","rooted-flow"] as const){
        const base=crayonCc0FaceStudy({
          detail,lashFinish,midfaceForm:"source-anat1-photometric-underpaint-v48"});
        const next=crayonCc0FaceStudy({
          detail,lashFinish,midfaceForm:"source-anat1-oblique-volume-v49"});
        expect(inspectCrayonScene(base)).toEqual([]);
        expect(inspectCrayonScene(next)).toEqual([]);
        for(const key of ["id","width","height","durationFrames","seed","paper",
          "paperTooth","camera"] as const)expect(next[key]).toEqual(base[key]);
        expect(next.durationFrames).toBe(300);
        expect(next.elements.map(e=>e.id)).toEqual(base.elements.map(e=>e.id));
        expect(next.elements).toHaveLength(base.elements.length);
        next.elements.forEach((el,i)=>{
          const original=base.elements[i];
          if(el.id!=="face-outline")expect(el).toEqual(original);
          else {
            expect(el.kind).toBe("wax");
            if(el.kind!=="wax"||original.kind!=="wax")throw Error("No source skin");
            const {underpaintFields:previous,...oldProperties}=original;
            const {underpaintFields:future,...newProperties}=el;
            expect(newProperties).toEqual(oldProperties);
            expect(previous).toEqual(CRAYON_F1_V48_FIELDS);
            expect(future?.slice(0,8)).toEqual(previous);
            expect(future?.slice(8)).toEqual(CRAYON_F1_V49_FIELDS);
            expect(future).toHaveLength(12);
          }
        });
        expect(crayonCc0FaceStudy({detail,lashFinish,
          midfaceForm:"source-anat1-oblique-volume-v49"}).elements)
          .toEqual(next.elements);
      }
  });
  it("fails closed for incomplete source anatomy, duplicate ID, or applying a second skin pass",()=>{
    const source=crayonCc0FaceStudy({
      midfaceForm:"source-anat1-photometric-underpaint-v48"});
    expect(()=>crayonF1AddObliqueSourceVolumeV49([])).toThrow(RangeError);
    expect(()=>crayonF1AddObliqueSourceVolumeV49(
      [...source.elements,source.elements[0]])).toThrow(RangeError);
    for(const id of ["face-outline","sclera-near","lower-lid-near",
      "nose-dorsum","source-brow-follicles-near","cc0-hedge-dark-underpaint"])
      expect(()=>crayonF1AddObliqueSourceVolumeV49(
        source.elements.filter(el=>el.id!==id))).toThrow(RangeError);
    const next=crayonF1AddObliqueSourceVolumeV49(source.elements);
    expect(()=>crayonF1AddObliqueSourceVolumeV49(next)).toThrow(RangeError);
    expect(()=>crayonF1AddObliqueSourceVolumeV49(
      source.elements.map(el=>el.id==="face-outline"&&el.kind==="wax"?
        {...el,bounds:{x:99,y:272,width:412,height:608}}:el))).toThrow(RangeError);
  });
  it("exposes all 12 original+new fields in physical SVG, no photo raster",()=>{
    for(const story of [Cc0Anat1ObliqueVolumeV49,
      Cc0Anat1ObliqueCheekV49,Cc0Anat1ObliqueOrbitV49])
      expect(story.name).toContain("!dev");
    const scene=crayonCc0FaceStudy({
      detail:.2,midfaceForm:"source-anat1-oblique-volume-v49"});
    const html=renderToStaticMarkup(<CrayonScene spec={scene} frame={299}/>);
    expect(html).toContain('data-km-crayon-underpaint-fields="12"');
    expect(html).toContain('data-km-crayon-underpaint-field="11"');
    expect(html).toContain('transform="rotate(-8');
    expect(html).toContain('transform="rotate(68');
    expect(html).toContain('data-km-crayon-undercoat-pits');
    expect(html).toContain('data-km-crayon-paper-contact-wax');
    expect(html).toContain('data-km-crayon-element="iris-near"');
    expect(html).not.toContain("<image");
    expect(html).not.toContain("<foreignObject");
  },60_000);
});
