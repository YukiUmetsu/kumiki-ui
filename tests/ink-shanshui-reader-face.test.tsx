import {describe,expect,it} from "vitest";
import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {validateCharacterDefinition} from "../registry/character/validate";
import {SHANSHUI_SCENES,DEFAULT_SHANSHUI} from
  "../registry/video/ink-shanshui";
import {scrollReaderFacePortrait,READER_FACE_LANDMARKS} from
  "../src/video/ink-shanshui-reader-face";
import {readerFaceAnatomy,READER_FACE_CRAFT_REGIONS,READER_FACE_ANAT1_POINTS} from
  "../src/video/ink-shanshui-reader-anatomy";
import {FACE_LANDMARKS,FACE_CANONICAL_MEASURES} from
  "../registry/anatomy/anatomy-face";
import {shanshuiFaceAssets} from "../src/video/ink-shanshui-face-plates";
import {shanshuiOtherFaceCraft,SHANSHUI_PORTRAIT_OBSERVATIONS} from
  "../src/video/ink-shanshui-other-face-craft";
import {shanshuiBodyFit,shanshuiBodyAssets} from
  "../src/video/ink-shanshui-full-body";
import {makeShanshuiScholar,shanshuiScholarInstance,InkShanshuiFilm} from
  "../src/video/ink-shanshui-film";
const allVector=(assets:ReturnType<typeof scrollReaderFacePortrait>)=>
  Object.values(assets).every(x=>x.kind==="shapes");
const paths=(assets:ReturnType<typeof scrollReaderFacePortrait>,key:string)=>{
  const a=assets[key];if(a.kind!=="shapes")throw Error("Expected shapes");
  return a.shapes;
};
describe("one-part-at-a-time: scroll reader three-quarter FACE only",()=>{
  it("builds an ANAT1-named foreshortened portrait with distinct facial ink-bone volumes",()=>{
    const guide=READER_FACE_ANAT1_POINTS;
    const ids=Object.keys(guide);
    expect(ids.length).toBeGreaterThanOrEqual(25);
    for(const [id,p] of Object.entries(guide)){
      expect(id in FACE_LANDMARKS).toBe(true);
      expect(p).toHaveLength(2);
      expect(p.every(Number.isFinite)).toBe(true);
      expect(p[0]).toBeGreaterThan(105);
      expect(p[0]).toBeLessThan(168);
      expect(p[1]).toBeGreaterThan(90);
      expect(p[1]).toBeLessThan(147);
    }
    // ANAT1's 468-vertex canonical mask is the *anatomical vocabulary*
    // and construction reference, not a mirrored mask pasted over the
    // observed historical three-quarter face.
    expect(FACE_CANONICAL_MEASURES.exEn).toBeGreaterThan(0);
    expect(FACE_CANONICAL_MEASURES.nSn).toBeGreaterThan(0);
    const span=(a:readonly number[],b:readonly number[])=>
      Math.hypot(a[0]-b[0],a[1]-b[1]);
    const near=span(guide["exocanthion.R"],guide["endocanthion.R"]);
    const far=span(guide["exocanthion.L"],guide["endocanthion.L"]);
    expect(far).toBeLessThan(near);
    expect(far/near).toBeGreaterThan(.7);
    expect(guide["pronasale"][1]).toBeGreaterThan(guide["sellion"][1]);
    expect(guide["subnasale"][1]).toBeGreaterThan(guide["pronasale"][1]);
    expect(guide["menton"][1]).toBeGreaterThan(guide["stomion"][1]+12);
    expect(guide["alare.L"][0]).toBeGreaterThan(guide["alare.R"][0]);
    expect(guide["labiale-superius"][1]).toBeLessThan(
      guide["labiale-inferius"][1]);
    const high=readerFaceAnatomy(1);
    const low=readerFaceAnatomy(.1);
    const wash=high.planes.filter(shape=>shape.type==="path"&&
      shape.fill==="$skinshade"&&shape.stroke==="none"&&
      (shape.opacity??0)>.11);
    expect(wash.length).toBeGreaterThanOrEqual(8);
    expect(high.planes.length).toBeGreaterThan(low.planes.length);
    for(const shape of wash){
      if(shape.type!=="path")throw Error("A wash must be geometry");
      expect(shape.d.trim().endsWith("Z")).toBe(true);
      expect(shape.d).not.toMatch(/NaN|Infinity|undefined/);
      expect(shape.opacity).toBeLessThan(.4);
    }
    const portrait=scrollReaderFacePortrait(1);
    expect(paths(portrait,"face").length)
      .toBeGreaterThan(paths(scrollReaderFacePortrait(.1),"face").length);
    for(const part of ["eyes-open","eyes-soft","eyes-closed",
      "mouth-rest","mouth-aa","mouth-oh","mouth-mm","mouth-smile"]){
      expect(paths(portrait,part).length).toBeGreaterThan(1);
    }
  });
  it("models an asymmetric near/far eye aperture and individually connected facial planes",()=>{
    const high=readerFaceAnatomy(1),low=readerFaceAnatomy(.1);
    const expected=[
      "orbit-near","orbit-far","nasal-bridge","alar-nostril",
      "cheek-volume","mouth-volume","ear-concha",
    ];
    for(const id of expected){
      expect(READER_FACE_CRAFT_REGIONS.find(x=>x.id===id)).toBeDefined();
    }
    expect(high.planes.length).toBeGreaterThan(low.planes.length);
    expect(high.nose.length).toBeGreaterThanOrEqual(6);
    expect(high.ear.length).toBeGreaterThanOrEqual(5);
    expect(high.brow.length).toBeGreaterThanOrEqual(8);
    expect(high.eyesOpen.length).toBeGreaterThanOrEqual(8);
    expect(high.eyesOpen.length).toBeGreaterThan(low.eyesOpen.length);
    // Downcast lids still need two actual paper-lit aperture planes so
    // attached animated iris geometry never becomes an isolated dot.
    expect(high.eyesSoft.filter(shape=>shape.fill==="$paper"&&
      shape.stroke==="none")).toHaveLength(2);
    expect(high.eyesSoft.length).toBeGreaterThan(high.eyesClosed.length+4);
    expect(high.eyesSoft.length).toBeGreaterThan(4);
    expect(high.eyesClosed.length).toBeGreaterThanOrEqual(3);
    expect(high.nearPupil.length).toBeGreaterThanOrEqual(3);
    expect(high.farPupil.length).toBeGreaterThanOrEqual(3);
    expect(high.lips.length).toBeGreaterThanOrEqual(4);
    // No emoji eyes or monochrome filled disks in place of eyelid/iris geometry.
    const regions=[high.planes,high.nose,high.ear,high.brow,
      high.eyesOpen,high.eyesSoft,high.eyesClosed,
      high.nearPupil,high.farPupil,high.lips];
    for(const region of regions){
      expect(region.every(shape=>shape.type==="path")).toBe(true);
      for(const shape of region){
        if(shape.type!=="path")continue;
        expect(shape.d).not.toMatch(/NaN|Infinity|undefined/);
        expect(shape.opacity).toBeGreaterThan(0);
        expect(shape.opacity).toBeLessThanOrEqual(1);
      }
    }
    expect(high).toEqual(readerFaceAnatomy(1));
    expect(()=>readerFaceAnatomy(Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });
  it("retains opaque face, head pivot, and separate animated gaze/viseme assets after anatomy upgrade",()=>{
    const face=scrollReaderFacePortrait(1);
    const anatomy=readerFaceAnatomy(1);
    expect(paths(face,"face").length).toBeGreaterThan(25);
    expect(paths(face,"eyes-open").length).toBeGreaterThanOrEqual(anatomy.eyesOpen.length);
    expect(paths(face,"pupil-left").length).toBeGreaterThanOrEqual(anatomy.nearPupil.length);
    expect(paths(face,"pupil-right").length).toBeGreaterThanOrEqual(anatomy.farPupil.length);
    expect(paths(face,"reader-ear").length).toBeGreaterThanOrEqual(anatomy.ear.length);
    const restMouth=paths(face,"mouth-rest");
    // A thoughtful downward-looking reader has a nearly level, closed
    // mouth at rest; the expressive "smile" cel remains distinct.
    expect(restMouth.some(s=>s.type==="path"&&
      s.d.includes("M135.2 125.5 Q139.6 126.4"))).toBe(true);
    expect(paths(face,"mouth-smile")).not.toEqual(restMouth);
    const root=paths(face,"face").find(s=>s.type==="path"&&s.d.includes("143.3 143.7"));
    expect(root).toMatchObject({fill:"$skin",opacity:1});
    const rig=makeShanshuiScholar(1,.88,"river-scholar");
    for(const part of ["eyes","brows","pupil-left","pupil-right","mouth","head"]){
      expect(rig.parts.find(p=>p.id===part)).toBeDefined();
    }
    expect(rig.parts.find(p=>p.id==="head")?.rest)
      .toEqual(shanshuiBodyFit("river-scholar").headRest);
  });
  it("reconstructs an opaque tapered face with a separately delineated ear and nose",()=>{
    const art=scrollReaderFacePortrait(1);
    expect(allVector(art)).toBe(true);
    const face=paths(art,"face");
    expect(face.length).toBeGreaterThan(18);
    expect(face[0].type).toBe("path");
    // Anatomy, not drawing order: ear contours are separate foreground
    // or background lines and may legitimately gain extra strokes.
    const jaw=face.find(x=>x.type==="path"&&x.d.includes("143.3 143.7"));
    expect(jaw).toBeDefined();
    expect(jaw?.fill).toBe("$skin");
    expect(jaw?.opacity).toBe(1);
    // Calligraphic contour releases into the chin rather than a hard
    // triangular puppet jaw; preserved pigment behind the full opaque face.
    expect(jaw?.strokeWidth).toBeLessThanOrEqual(1.2);
    if(jaw?.type!=="path")throw new Error("Jaw must be a source-led SVG path");
    expect((jaw.d.match(/C/g)??[]).length).toBeGreaterThanOrEqual(12);

    expect(face[0].type==="path"&&face[0].d.includes("117.2 94.9")).toBe(true);
    const ear=paths(art,"reader-ear");
    expect(ear.length).toBeGreaterThanOrEqual(4);
    expect(ear[0]).toMatchObject({type:"path",fill:"$skin",opacity:1});
    // The ink-pressure sampler expands the nose bridge into a closed
    // contour, while this fine nostril accent remains a direct path.
    expect(face.some(x=>x.type==="path"&&x.d.includes("M149.4 116.7")))
      .toBe(true);
    const labels=READER_FACE_LANDMARKS.map(v=>v.name);
    expect(labels).toContain("exposed-ear");
    expect(labels).toContain("earlobe");
    expect(labels).toContain("nose-tip");
    expect(labels).toContain("chin");
    expect(new Set(labels).size).toEqual(labels.length);
    for(const pt of READER_FACE_LANDMARKS){
      expect(pt.x).toBeGreaterThan(0);
      expect(pt.x).toBeLessThan(260);
      expect(pt.y).toBeGreaterThan(0);
      expect(pt.y).toBeLessThan(340);
    }
    expect(READER_FACE_LANDMARKS.find(x=>x.name==="chin")!.y)
      .toBeGreaterThan(READER_FACE_LANDMARKS.find(x=>x.name==="nose-tip")!.y);
  });
  it("retains a rounded young jaw and fine three-quarter nose without thick overlapping ink hooks",()=>{
    const source=scrollReaderFacePortrait(1);
    const face=paths(source,"face");
    const jaw=face.find(shape=>shape.type==="path"&&
      shape.fill==="$skin"&&shape.d.includes("143.3 143.7"));
    if(!jaw||jaw.type!=="path")throw new Error("Reader jaw missing");
    // Two distinct native cubics approach and leave the actual ANAT1
    // menton with a curved tangent; the former mask-like V point is
    // rejected while keeping the original animation pivot unchanged.
    expect(jaw.d).toMatch(
      /C146 141\.4 144\.9 143\.2 143\.3 143\.7 C140\.6 144\.6 138\.7 143\.7 136\.1 142\.2/);
    expect(jaw.d).not.toMatch(/NaN|Infinity/);
    const nose=readerFaceAnatomy(1).nose;
    const featureLines=nose.filter(shape=>shape.type==="path"&&
      shape.stroke!=="none"&&shape.stroke!=="$paper");
    expect(featureLines.length).toBeGreaterThanOrEqual(5);
    expect(featureLines.every(shape=>shape.strokeWidth<=.65)).toBe(true);
    expect(featureLines.every(shape=>shape.opacity<=.65)).toBe(true);
    expect(readerFaceAnatomy(1).nose).toEqual(nose);
    expect(makeShanshuiScholar(1,.88,"river-scholar").parts
      .find(x=>x.id==="head")?.rest).toEqual(
        shanshuiBodyFit("river-scholar").headRest);
  });
  it("preserves an asymmetric, foreshortened near/far eye and five speaking visemes",()=>{
    const plate=scrollReaderFacePortrait(.8);
    const eyelids=["eyes-open","eyes-soft","eyes-closed"] as const;
    expect(new Set(eyelids.map(x=>JSON.stringify(paths(plate,x)))).size).toBe(3);
    const near=READER_FACE_LANDMARKS.filter(x=>x.name.startsWith("near-eye"));
    const far=READER_FACE_LANDMARKS.filter(x=>x.name.startsWith("far-eye"));
    expect(Math.abs(near[1].x-near[0].x))
      .toBeGreaterThan(Math.abs(far[1].x-far[0].x));
    const visemes=["mouth-rest","mouth-aa","mouth-oh","mouth-mm","mouth-smile"];
    expect(new Set(visemes.map(k=>JSON.stringify(paths(plate,k)))).size).toBe(5);
    expect(paths(plate,"beard")).toEqual([]);
    expect(paths(plate,"pupil-left").length).toBeGreaterThan(0);
    expect(paths(plate,"pupil-right").length).toBeGreaterThan(0);
  });
  it("adds selective anatomy and hair folds at higher detail without scaling the head",()=>{
    const low=scrollReaderFacePortrait(.1);
    const high=scrollReaderFacePortrait(1);
    for(const id of ["face","hair","brow","eyes-open","mouth-rest"]){
      expect(paths(high,id).length).toBeGreaterThan(paths(low,id).length);
    }
    expect(high).toEqual(scrollReaderFacePortrait(1));
    expect(()=>scrollReaderFacePortrait(-.1)).toThrow(RangeError);
    expect(()=>scrollReaderFacePortrait(1.2)).toThrow(RangeError);
    expect(()=>scrollReaderFacePortrait(NaN)).toThrow(RangeError);
    expect(shanshuiFaceAssets("river-scholar",1)).toEqual(high);
    const head=shanshuiBodyFit("river-scholar").headRest;
    expect(makeShanshuiScholar(1,.88,"river-scholar").parts
      .find(x=>x.id==="head")?.rest).toEqual(head);
  });
  it("keeps three distinct source-fitted identities instead of cloning reader facial cels",()=>{
    const hermit=shanshuiOtherFaceCraft("misty-hermit",1);
    const walker=shanshuiOtherFaceCraft("mountain-trail",1);
    expect(SHANSHUI_PORTRAIT_OBSERVATIONS["misty-hermit"].age)
      .not.toEqual(SHANSHUI_PORTRAIT_OBSERVATIONS["mountain-trail"].age);
    for(const scene of ["misty-hermit","mountain-trail"] as const){
      const high=shanshuiOtherFaceCraft(scene,1).face;
      const medium=shanshuiOtherFaceCraft(scene,.5).face;
      // Gradated near-transparent washes remain separate from eye-cel
      // outlines; identical upper/lower lids must not be duplicated.
      const washes=high.filter(x=>x.type==="path"&&
        x.fill==="$skinshade"&&x.stroke==="none"&&
        x.opacity!==undefined&&x.opacity<.09);
      expect(washes.length).toBeGreaterThanOrEqual(5);
      expect(high.length).toBeGreaterThan(medium.length);
      expect(new Set(washes.map(x=>x.type==="path"?x.d:"")).size)
        .toBe(washes.length);
    }
    expect(shanshuiOtherFaceCraft("river-scholar",1)).toEqual({});
    expect(shanshuiOtherFaceCraft("misty-hermit",0)).toEqual({});
    expect(shanshuiOtherFaceCraft("mountain-trail",0)).toEqual({});
    expect(()=>shanshuiOtherFaceCraft("mountain-trail",Infinity))
      .toThrow(RangeError);
    for(const [scene,region] of [
      ["misty-hermit",hermit],["mountain-trail",walker],
    ] as const){
      expect(region.face.length).toBeGreaterThanOrEqual(7);
      expect(region.brow.length).toBeGreaterThanOrEqual(2);
      expect(region["pupil-left"].length).toBe(1);
      expect(region["pupil-right"].length).toBe(1);
      expect(region["eyes-open"]).not.toEqual(region["eyes-closed"]);
      const art=shanshuiFaceAssets(scene,1);
      const low=shanshuiFaceAssets(scene,0);
      expect(paths(art,"face").length).toBeGreaterThan(paths(low,"face").length);
      for(const marks of Object.values(region)){
        for(const shape of marks){
          expect(shape.type).toBe("path");
          if(shape.type!=="path")continue;
          expect(shape.d).not.toMatch(/NaN|Infinity|undefined/);
          expect(shape.opacity).toBeGreaterThan(0);
          expect(shape.opacity).toBeLessThanOrEqual(1);
        }
      }
    }
    const hermitBeard=paths(shanshuiFaceAssets("misty-hermit",1),"beard")[0];
    expect(hermitBeard.type).toBe("path");
    if(hermitBeard.type!=="path")throw new Error("Painted beard must be a path");
    // A scholar's beard is layered hair with changing curvature, not
    // a straight-edged hanging triangle.
    expect((hermitBeard.d.match(/C/g)??[]).length).toBeGreaterThanOrEqual(8);
    expect(hermitBeard.d).not.toContain("L143 169");
    expect(hermit.face).not.toEqual(walker.face);
    expect(shanshuiOtherFaceCraft("misty-hermit",1)).toEqual(hermit);
    expect(shanshuiOtherFaceCraft("mountain-trail",1)).toEqual(walker);
  });

  it("changes ONLY the reader's facial image assets; full garment, hand and rig remain identical",()=>{
    for(const scene of SHANSHUI_SCENES){
      const model=makeShanshuiScholar(1,.89,scene);
      const instance=shanshuiScholarInstance(scene);
      expect(validateCharacterDefinition(model)
        .filter(d=>d.severity==="error")).toEqual([]);
      expect(model.revision).toEqual(instance.revision);
      for(const [key,bodyAsset] of Object.entries(shanshuiBodyAssets(scene)))
        expect(model.assets[key]).toEqual(bodyAsset);
      expect(model.parts.some(x=>x.id==="near-hand")).toBe(true);
      expect(model.parts.some(x=>x.id==="far-sleeve")).toBe(true);
    }
    // The hermit and walker remain on the preceding, separate face designs.
    const hermit=shanshuiFaceAssets("misty-hermit");
    const walker=shanshuiFaceAssets("mountain-trail");
    expect(paths(hermit,"face")[0]).toMatchObject({
      type:"path",d:expect.stringContaining("M113 75 Q123 64"),
    });
    expect(paths(walker,"face")[0]).toMatchObject({
      type:"path",d:expect.stringContaining("M112 77 Q123 65"),
    });
    expect(paths(hermit,"beard").length).toBeGreaterThan(0);
    expect(paths(walker,"beard")).toEqual([]);
    const reader=makeShanshuiScholar(1,.89,"river-scholar");
    expect(reader.assets.face).toEqual(scrollReaderFacePortrait(1).face);
    expect(reader.assets["reader-ear"]).toEqual(scrollReaderFacePortrait(1)["reader-ear"]);
    expect(reader.parts.find(x=>x.id==="reader-ear")).toMatchObject({
      parent:"head",channel:"face",asset:"reader-ear",
    });
    expect(makeShanshuiScholar(1,.89,"misty-hermit").parts
      .find(x=>x.id==="reader-ear")).toBeUndefined();
    expect(makeShanshuiScholar(1,.89,"mountain-trail").parts
      .find(x=>x.id==="reader-ear")).toBeUndefined();
    expect(reader.assets["eyes-open"]).toEqual(scrollReaderFacePortrait(1)["eyes-open"]);
    expect(reader.assets.hair).toEqual(scrollReaderFacePortrait(1).hair);
    expect(reader.assets["mouth-smile"]).toEqual(scrollReaderFacePortrait(1)["mouth-smile"]);
    for(const frame of [50,125,210]){
      const props={frame,controls:{...DEFAULT_SHANSHUI,scene:"river-scholar" as const,detail:1}};
      const markup=renderToStaticMarkup(createElement(InkShanshuiFilm,props));
      expect(markup).toContain('data-km-shanshui-scene="river-scholar"');
      expect(markup).toContain('data-km-ink-character-part="head"');
      expect(markup).toEqual(renderToStaticMarkup(createElement(InkShanshuiFilm,props)));
    }
  });
});
