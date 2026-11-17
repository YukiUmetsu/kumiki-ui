import {describe,it,expect} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {CrayonScene} from "../registry/video/materials/crayon-scene-react";
import {inspectCrayonScene} from "../registry/video/materials/crayon-scene";
import {crayonCc0FaceStudy} from "../src/video/crayon-artcraft-cc0-face";
import {CRAYON_F1_V49_FIELDS} from "../src/video/crayon-artcraft-f1-anat1-oblique-volume-v49";
import {CRAYON_F1_V50_HAIR_IDS} from "../src/video/crayon-artcraft-f1-anat1-photo-hair-v50";
import {CRAYON_F1_V52_PHOTO,crayonF1CombinePhotoWaxV52}
  from "../src/video/crayon-artcraft-f1-anat1-photo-composition-v52";
describe("ArtCraft V52 independent V49 facial plane + V50 hair material composition",()=>{
  it("pins the original photographed source and rejects failed V51 hair",()=>{
    expect(CRAYON_F1_V52_PHOTO.sha).toBe(
      "f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2");
    expect(CRAYON_F1_V52_PHOTO.approved).toBe(false);
    expect(CRAYON_F1_V52_PHOTO.rejectedHair).toBe("V51");
  });
  it("preserves every V50 original physical element except the source-oblique face wax fields",()=>{
    for(const detail of [.2,1] as const)
    for(const lashFinish of ["sparse","rooted-flow"] as const){
      const source=crayonCc0FaceStudy({detail,lashFinish,
        midfaceForm:"source-anat1-photometric-hair-v50"});
      const elements=crayonF1CombinePhotoWaxV52(source.elements);
      const after={...source,elements};
      expect(inspectCrayonScene(after)).toEqual([]);
      expect(after.durationFrames).toBe(300);
      expect(after.elements.length).toEqual(source.elements.length);
      for(let i=0;i<elements.length;i++){
        const a=elements[i],b=source.elements[i];
        if(a.id!=="face-outline"){expect(a).toEqual(b);continue;}
        if(a.kind!=="wax"||b.kind!=="wax")throw Error("Original face missing");
        expect(a.d).toBe(b.d);
        expect(a.colors).toEqual(b.colors);
        expect(a.underpaintFields?.length).toBe(12);
        expect(a.underpaintFields?.slice(0,8)).toEqual(b.underpaintFields);
        expect(a.underpaintFields?.slice(8)).toEqual(CRAYON_F1_V49_FIELDS);
      }
      for(const id of CRAYON_F1_V50_HAIR_IDS)
        expect(elements.find(x=>x.id===id)).toEqual(source.elements.find(x=>x.id===id));
      expect(elements.some(x=>x.id.startsWith("hair-source-lock-"))).toBe(false);
      expect(crayonF1CombinePhotoWaxV52(source.elements)).toEqual(elements);
    }
  });
  it("fails closed on twice-applied cheek planes, missing roots, alien V51 contours and source changes",()=>{
    const old=crayonCc0FaceStudy({midfaceForm:"source-anat1-photometric-hair-v50"});
    const once=crayonF1CombinePhotoWaxV52(old.elements);
    expect(()=>crayonF1CombinePhotoWaxV52(once)).toThrow(RangeError);
    for(const id of ["face-outline",...CRAYON_F1_V50_HAIR_IDS,"iris-near"])
      expect(()=>crayonF1CombinePhotoWaxV52(old.elements.filter(x=>x.id!==id)))
        .toThrow(RangeError);
    expect(()=>crayonF1CombinePhotoWaxV52([...old.elements,old.elements[0]])).toThrow(RangeError);
    expect(()=>crayonF1CombinePhotoWaxV52([...old.elements,
      {...old.elements[0],id:"hair-source-lock-crown-0"}])).toThrow(RangeError);
  });
  it("keeps original CRAYON1 physical grain and 12 face / 4+4+3 wax color contacts",()=>{
    const old=crayonCc0FaceStudy({midfaceForm:"source-anat1-photometric-hair-v50",detail:.2});
    const html=renderToStaticMarkup(<CrayonScene spec={{
      ...old,elements:crayonF1CombinePhotoWaxV52(old.elements),
    }} frame={299}/>);
    expect(html).toContain('data-km-crayon-underpaint-fields="12"');
    expect(html).toContain('data-km-crayon-underpaint-fields="4"');
    expect(html).toContain('data-km-crayon-underpaint-fields="3"');
    expect(html).toContain('data-km-crayon-paper-contact-wax');
    expect(html).not.toContain("<image");
  },60_000);
});
