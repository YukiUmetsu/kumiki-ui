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
import {readerInkPortraitGlazes,READER_INK_GLAZE_REGIONS} from
  "../src/video/ink-shanshui-reader-glazes";
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
      s.d.includes("M135.4 125.9 C137.1 125.6"))).toBe(true);
    expect(paths(face,"mouth-smile")).not.toEqual(restMouth);
    const anatomicalSeam=anatomy.lips.find(s=>s.type==="path"&&
      s.d.includes("M135.2 125.9 Q138.9"));
    if(!anatomicalSeam||anatomicalSeam.type!=="path")
      throw new Error("Original attached muscle seam missing");
    // ANAT1 lip volume must not double-ink the independent animated
    // neutral mouth. Both original paths stay present and editable.
    expect(anatomicalSeam.stroke).toBe("$skinshade");
    expect(anatomicalSeam.strokeWidth).toBeLessThan(.5);
    expect(anatomicalSeam.opacity).toBeLessThan(.5);
    const dynamicRest=restMouth.find(s=>s.type==="path"&&
      s.d.includes("M135.4 125.9 C137.1 125.6"));
    if(!dynamicRest||dynamicRest.type!=="path")
      throw new Error("Dynamic resting mouth contour missing");
    expect(dynamicRest.fill).toBe("none");
    expect(dynamicRest.strokeWidth).toBeLessThan(.8);
    expect(dynamicRest.opacity).toBeLessThan(.8);
    const speech=["mouth-aa","mouth-oh","mouth-mm","mouth-smile"];
    expect(new Set(speech.map(id=>JSON.stringify(paths(face,id))).concat(
      JSON.stringify(restMouth))).size).toBe(5);
    const root=paths(face,"face").find(s=>s.type==="path"&&s.d.includes("143.3 143.7"));
    expect(root).toMatchObject({fill:"$skin",opacity:1});
    const rig=makeShanshuiScholar(1,.88,"river-scholar");
    for(const part of ["eyes","brows","pupil-left","pupil-right","mouth","head"]){
      expect(rig.parts.find(p=>p.id===part)).toBeDefined();
    }
    expect(rig.parts.find(p=>p.id==="head")?.rest)
      .toEqual(shanshuiBodyFit("river-scholar").headRest);
  });
  it("binds translucent cheek and lip material to ANAT1 malar volume, not copied diagonal stripes",()=>{
    const portrait=scrollReaderFacePortrait(1);
    const material=readerFaceAnatomy(1);
    const malar=material.planes.find(s=>s.type==="path"&&
      s.d.includes("C124.9 108.7 131.7 112.7 135.2 115.7"));
    const lowerCheek=paths(portrait,"face").find(s=>s.type==="path"&&
      s.d.startsWith("M119.2 116 C121.4 120.5 124.8 123.5"));
    const lip=material.lips.find(s=>s.type==="path"&&
      s.d.includes("M135.2 125.9 Q138.9"));
    if(!malar||malar.type!=="path"||
       !lowerCheek||lowerCheek.type!=="path"||
       !lip||lip.type!=="path")
      throw Error("Facial anatomy paint course missing");
    // All original pigment is still present; only its positive anatomy
    // is redirected. The longer, nonlinear return prevents the old
    // ruler-like brown stripe from reading as a nasolabial wrinkle.
    expect((malar.d.match(/C/g)??[]).length).toBeGreaterThanOrEqual(4);
    expect((lowerCheek.d.match(/C/g)??[]).length).toBeGreaterThanOrEqual(4);
    expect(malar.d).toContain("C127.2 115.9 123.2 115.7 120.8 109.6 Z");
    expect(lowerCheek.d).toContain("C122 122.6 120.4 119.6 119.2 116 Z");
    for(const shape of [malar,lowerCheek]){
      expect(shape.stroke).toBe("none");
      expect(shape.fill).toBe("$skinshade");
      expect(shape.opacity).toBeGreaterThan(0);
      expect(shape.opacity).toBeLessThan(.14);
      expect(shape.d.trim().endsWith("Z")).toBe(true);
      expect(shape.d).not.toMatch(/NaN|Infinity/);
    }
    // Keep physical paper relief independent of the animated
    // viseme line, without flattening the original ink micro-detail.
    expect(lip.strokeWidth).toBeLessThan(.5);
    expect(lip.opacity).toBeLessThan(.5);
    const mouth=paths(portrait,"mouth-rest").find(s=>s.type==="path"&&
      s.d.startsWith("M135.4 125.9 C137.1 125.6"));
    expect(mouth).toMatchObject({type:"path",fill:"none"});
    for(const id of ["mouth-rest","mouth-aa","mouth-oh","mouth-mm",
      "mouth-smile","eyes-open","eyes-soft","eyes-closed"]){
      expect(paths(portrait,id).length).toBeGreaterThan(1);
    }
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
    // Realistic Chinese face construction uses faint gongbi contours
    // with ink-wash volume, not one uniform dark mask border.
    expect(jaw.stroke).toBe("$skinshade");
    expect(jaw.strokeWidth).toBeLessThan(1);
    // Faint linework must never make a painted head transparent.
    expect(jaw.opacity).toBe(1);
    const earContour=paths(source,"reader-ear")[0];
    if(earContour.type!=="path")throw Error("Near ear geometry missing");
    expect(earContour.strokeWidth).toBeLessThan(1);
    expect(earContour.opacity).toBe(1);
    expect(earContour.fill).toBe("$skin");
    const nose=readerFaceAnatomy(1).nose;
    const featureLines=nose.filter(shape=>shape.type==="path"&&
      shape.stroke!=="none"&&shape.stroke!=="$paper");
    expect(featureLines.length).toBeGreaterThanOrEqual(5);
    expect(featureLines.every(shape=>(shape.strokeWidth??0)<=.65)).toBe(true);
    expect(featureLines.every(shape=>(shape.opacity??1)<=.65)).toBe(true);
    expect(readerFaceAnatomy(1).nose).toEqual(nose);
    expect(makeShanshuiScholar(1,.88,"river-scholar").parts
      .find(x=>x.id==="head")?.rest).toEqual(
        shanshuiBodyFit("river-scholar").headRest);
  });
  it("forms near and far eyelids around their original independent irises and non-spiral ear cartilage",()=>{
    const high=readerFaceAnatomy(1);
    const path=(region:readonly {type:string;d?:string}[],idx:number)=>{
      const p=region[idx];
      if(p?.type!=="path"||!p.d)throw Error("Missing anatomical path");
      return p.d;
    };
    const box=(d:string)=>{
      const nums=(d.match(/-?\d+(?:\.\d+)?/g)??[]).map(Number);
      expect(nums.length%2).toBe(0);
      expect(nums.length).toBeGreaterThanOrEqual(8);
      const xs=nums.filter((_,k)=>k%2===0);
      const ys=nums.filter((_,k)=>k%2===1);
      return {x0:Math.min(...xs),x1:Math.max(...xs),
        y0:Math.min(...ys),y1:Math.max(...ys)};
    };
    const near=box(path(high.eyesOpen,0));
    const far=box(path(high.eyesOpen,1));
    const nearIris=box(path(high.nearPupil,0));
    const farIris=box(path(high.farPupil,0));
    expect(near.x1-near.x0).toBeGreaterThan(far.x1-far.x0);
    expect(far.y0).toBeGreaterThan(near.y0);
    for(const [eye,iris] of [[near,nearIris],[far,farIris]]){
      expect(iris.x0).toBeGreaterThan(eye.x0);
      expect(iris.x1).toBeLessThan(eye.x1);
      expect(iris.y0).toBeGreaterThan(eye.y0);
      expect(iris.y1).toBeLessThan(eye.y1);
    }
    const nearUpper=path(high.eyesOpen,2);
    const farUpper=path(high.eyesOpen,3);
    expect(nearUpper).not.toBe(farUpper);
    expect(high.eyesOpen).not.toEqual(high.eyesSoft);
    expect(high.eyesSoft).not.toEqual(high.eyesClosed);
    const ear=paths(scrollReaderFacePortrait(1),"reader-ear");
    const outer=ear[0];
    if(outer.type!=="path")throw Error("Front ear should be a path");
    expect(outer.fill).toBe("$skin");
    expect(outer.d).toContain("119.3 113.6");
    expect(outer.d).toContain("115.7 118.5");
    expect(outer.strokeWidth).toBeLessThan(1);
    expect(ear.length).toBeGreaterThanOrEqual(10);
    expect(ear.every(shape=>shape.type==="path")).toBe(true);
    // The concha is a recessed pigment volume, while the antihelix
    // branches into three anatomical stems instead of a spiral or a
    // dropped simplified outline.
    expect(ear[2].type==="path"&&
      (ear[2].d.match(/M/g)??[]).length).toBe(3);
    // The superior and inferior crus must share a stem hinge. Their
    // actual source control points are connected in 3/4 projection.
    expect(ear[2].type==="path"&&ear[2].d)
      .toContain("M114.45 106.7");
    // Anatomy now has separate meatus, concha and low-opacity scapha.
    expect(ear.length).toBeGreaterThanOrEqual(13);
    expect(ear.some(shape=>shape.type==="path"&&
      shape.fill==="$shadow"&&shape.stroke==="none"&&
      (shape.opacity??0)>.15)).toBe(true);
    expect(scrollReaderFacePortrait(1)).toEqual(scrollReaderFacePortrait(1));
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
  it("follows the original canthi, zygions and pronasale with layered six-region Ming glazes",()=>{
    const A=READER_FACE_ANAT1_POINTS;
    const guide={
      nearCanthus:A["endocanthion.R"],
      farCanthus:A["endocanthion.L"],
      sellion:A.sellion,
      noseTip:A.pronasale,
      nearCheek:A["zygion.R"],
      farCheek:A["zygion.L"],
      chin:A.menton,
    };
    const low=readerInkPortraitGlazes(guide,0);
    const medium=readerInkPortraitGlazes(guide,.6);
    const high=readerInkPortraitGlazes(guide,1);
    expect(Object.keys(high)).toEqual(READER_INK_GLAZE_REGIONS);
    expect(READER_INK_GLAZE_REGIONS).toHaveLength(6);
    const count=(shapes:typeof high)=>Object.values(shapes)
      .reduce((total,layer)=>total+layer.length,0);
    expect(count(low)).toBeGreaterThanOrEqual(8);
    expect(count(medium)).toBeGreaterThan(count(low));
    expect(count(high)).toBeGreaterThan(count(medium));
    expect(high["orbital-near"].length)
      .toBeGreaterThan(high["orbital-far"].length);
    for(const [region,shapes] of Object.entries(high)){
      expect(shapes.length,region).toBeGreaterThanOrEqual(2);
      for(const shape of shapes){
        expect(shape.type).toBe("path");
        expect(shape.d).toMatch(/^M/);
        expect(shape.d).not.toMatch(/NaN|Infinity|undefined/);
        expect(shape.fill).toMatch(/^\$(?:skinshade|paper)$|^none$/);
        expect(shape.opacity).toBeGreaterThan(0);
        expect(shape.opacity).toBeLessThan(.3);
        expect(shape.strokeWidth).toBeLessThanOrEqual(.3);
      }
    }
    expect(readerInkPortraitGlazes(guide,1)).toEqual(high);
    expect(()=>readerInkPortraitGlazes(guide,Infinity)).toThrow(RangeError);
    expect(()=>readerInkPortraitGlazes(guide,-.01)).toThrow(RangeError);
    expect(()=>readerInkPortraitGlazes({...guide,
      sellion:[NaN,100]},1)).toThrow(RangeError);
  });
  it("builds convex ANAT1 malar pigment volumes rather than parallel cheek bands",()=>{
    const A=READER_FACE_ANAT1_POINTS;
    const glazes=readerInkPortraitGlazes({
      nearCanthus:A["endocanthion.R"],
      farCanthus:A["endocanthion.L"],sellion:A.sellion,
      noseTip:A.pronasale,nearCheek:A["zygion.R"],
      farCheek:A["zygion.L"],chin:A.menton,
    },1);
    const coords=(d:string)=>{
      // SVG M/C/Q geometry is source-space x,y control-point pairs.
      const numbers=(d.match(/-?\d+(?:\.\d+)?/g)??[]).map(Number);
      expect(numbers.length%2).toBe(0);
      const xs=numbers.filter((_,i)=>i%2===0);
      const ys=numbers.filter((_,i)=>i%2===1);
      return {x0:Math.min(...xs),x1:Math.max(...xs),
        y0:Math.min(...ys),y1:Math.max(...ys)};
    };
    const broad=glazes["malar-near"][0];
    expect(broad.type).toBe("path");
    expect((broad.d.match(/C/g)??[]).length).toBeGreaterThanOrEqual(3);
    const b=coords(broad.d);
    const width=b.x1-b.x0,height=b.y1-b.y0;
    expect(width).toBeGreaterThan(14);
    expect(height).toBeGreaterThan(width*.55);
    expect(b.x0).toBeGreaterThan(119);
    expect(b.x1).toBeLessThan(141);
    expect(b.y0).toBeGreaterThan(105);
    expect(b.y1).toBeLessThan(125);
    expect(glazes["malar-near"].length).toBeGreaterThanOrEqual(5);
    expect(glazes["malar-near"].slice(0,3)
      .every(x=>x.fill==="$skinshade"&&(x.opacity??1)<.1)).toBe(true);
    const all=readerFaceAnatomy(1);
    const base=all.planes.find(x=>x.d.startsWith("M119.1 107.9"));
    expect(base?.d).toContain("C134.6 121.5 130.5 120 127.1 117.9");
    expect(base?.opacity).toBeLessThan(.08);
    const paper=all.planes.find(x=>x.d.startsWith("M126.6 112.8"));
    expect(paper).toMatchObject({fill:"$paper",opacity:.13});
    // The primary dorsal shape is pressure-sampled into a many-point
    // closed path, so it must not be matched to the unsampled seed pair.
    const dorsal=all.nose[0];
    expect(dorsal).toMatchObject({type:"path",opacity:.34});
    expect((dorsal?.d.match(/L/g)??[]).length).toBeGreaterThan(20);
    expect(all.nose.some(x=>x.d.startsWith("M150.9 114.2"))).toBe(true);
    expect(all.nose.length).toBeGreaterThanOrEqual(8);
  });
  it("builds compact convex secondary malar ink masses instead of multi-pass cheek stripes",()=>{
    const A=READER_FACE_ANAT1_POINTS;
    const glazes=readerInkPortraitGlazes({
      nearCanthus:A["endocanthion.R"],farCanthus:A["endocanthion.L"],
      sellion:A.sellion,noseTip:A.pronasale,
      nearCheek:A["zygion.R"],farCheek:A["zygion.L"],chin:A.menton,
    },1);
    // Measuring control-point bounds is a conservative topology guard,
    // not proof of full-scale pictorial quality. The previous narrow
    // near-cheek passes formed several parallel diagonal wash stripes.
    const extent=(d:string)=>{
      const values=(d.match(/-?\d+(?:\.\d+)?/g)??[]).map(Number);
      if(values.length%2)throw Error("Malformed original source ink path");
      const xs=values.filter((_,i)=>i%2===0);
      const ys=values.filter((_,i)=>i%2===1);
      return {w:Math.max(...xs)-Math.min(...xs),
        h:Math.max(...ys)-Math.min(...ys)};
    };
    const near=glazes["malar-near"];
    const secondary=near.slice(1,4);
    expect(secondary).toHaveLength(3);
    for(const shape of secondary){
      expect(shape.type).toBe("path");
      const e=extent(shape.d);
      expect((shape.d.match(/C/g)??[]).length).toBeGreaterThanOrEqual(3);
      expect(e.w).toBeGreaterThan(5);
      expect(e.h).toBeGreaterThan(e.w*.66);
      expect(shape.opacity).toBeLessThan(.08);
    }
    const far=glazes["malar-far"].slice(0,2);
    for(const shape of far){
      const e=extent(shape.d);
      expect((shape.d.match(/C/g)??[]).length).toBeGreaterThanOrEqual(3);
      expect(e.h).toBeGreaterThan(e.w*.8);
    }
    const nose=glazes["nose-bridge"];
    expect((nose[0].d.match(/C/g)??[]).length).toBeGreaterThanOrEqual(3);
    expect((nose[1].d.match(/C/g)??[]).length).toBeGreaterThanOrEqual(3);
    const anatomy=readerFaceAnatomy(1);
    expect(anatomy.nose.some(shape=>shape.type==="path"&&
      shape.d.startsWith("M150.9 114.2 C152.2 113.9"))).toBe(true);
    expect(anatomy.nose.some(shape=>shape.type==="path"&&
      shape.d.includes("C154.2 117.9 152.5 118.4 151.3 117.6"))).toBe(true);
    for(const detail of [.1,.6,1])
      expect(readerInkPortraitGlazes({
        nearCanthus:A["endocanthion.R"],farCanthus:A["endocanthion.L"],
        sellion:A.sellion,noseTip:A.pronasale,
        nearCheek:A["zygion.R"],farCheek:A["zygion.L"],chin:A.menton,
      },detail)).toEqual(readerInkPortraitGlazes({
        nearCanthus:A["endocanthion.R"],farCanthus:A["endocanthion.L"],
        sellion:A.sellion,noseTip:A.pronasale,
        nearCheek:A["zygion.R"],farCheek:A["zygion.L"],chin:A.menton,
      },detail));
  });

  it("models independent AA and OH 3/4 lip anatomy as multi-pass thin ink, not an opaque oval",()=>{
    const high=scrollReaderFacePortrait(1),low=scrollReaderFacePortrait(.1);
    const aperture=(name:"mouth-aa"|"mouth-oh")=>{
      const marks=paths(high,name);
      const ink=marks.find(s=>s.type==="path"&&s.fill==="$shadow"&&
        s.stroke==="none"&&s.opacity!==undefined&&
        s.opacity>=.16&&s.opacity<=.19);
      if(!ink||ink.type!=="path")throw Error("Native speech opening missing");
      return {marks,ink};
    };
    const aa=aperture("mouth-aa"),oh=aperture("mouth-oh");
    // Both open mouth cels have deliberate near/far rolling contours.
    // Every original open viseme gains five separate wet/dry marks
    // without deleting original ANAT1 mouth muscle / lip planes.
    for(const [name,item] of [["mouth-aa",aa],["mouth-oh",oh]] as const){
      expect(item.marks.length).toBeGreaterThanOrEqual(
        paths(low,name).length);
      expect(item.ink.opacity).toBeLessThan(.2);
      // An optically layered mouth is not a single flat sticker:
      // reserve the light external silhouette for underpainting, then
      // paint at least two smaller recessed cavity masses on top.
      const cavity=item.marks.filter(s=>s.type==="path"&&
        s.fill==="$shadow"&&s.stroke==="none"&&s.opacity!==undefined&&
        s.opacity>=.25&&s.opacity<.4);
      const deeper=item.marks.filter(s=>s.type==="path"&&
        s.fill==="$deep"&&s.stroke==="none"&&s.opacity!==undefined&&
        s.opacity>=.17&&s.opacity<.3);
      // Original ANAT1 anatomy can already contain a separate wet
      // $shadow/$deep paint pass. Require at least one of each new
      // pigment level without incorrectly banning those preserved
      // micro-layers (the prior exact-count test falsely rejected two).
      expect(cavity.length).toBeGreaterThanOrEqual(1);
      expect(deeper.length).toBeGreaterThanOrEqual(1);
      // "$deep" is warm ochre, not the darkest pigment. The actual
      // wet-mouth recess must also contain a much smaller $ink core,
      // with its opacity weaker than the original opaque dark stamp.
      const cores=item.marks.filter(s=>s.type==="path"&&
        s.fill==="$ink"&&s.stroke==="none"&&
        s.opacity!==undefined&&s.opacity>=.2&&s.opacity<.3);
      expect(cores).toHaveLength(1);
      const pressureFibres=item.marks.filter(s=>s.type==="path"&&
        s.stroke==="none"&&s.d.includes(" L")&&
        (s.fill==="$shadow"||s.fill==="$skinshade"));
      expect(pressureFibres.length).toBeGreaterThanOrEqual(1);
      expect((item.ink.d.match(/C/g)??[]).length)
        .toBeGreaterThanOrEqual(3);
      expect(item.marks.filter(s=>s.type==="path"&&
        s.fill!=="none").length).toBeGreaterThanOrEqual(4);
      expect(item.marks.filter(s=>s.type==="path"&&
        s.stroke==="$skinshade").length).toBeGreaterThanOrEqual(3);
      expect(item.marks.filter(s=>s.type==="path"&&
        s.fill==="$paper").length).toBeGreaterThanOrEqual(1);
    }
    expect(aa.ink.d).not.toEqual(oh.ink.d);
    const envelope=(d:string)=>{
      const values=(d.match(/-?\d+(?:\.\d+)?/g)??[]).map(Number);
      const xs=values.filter((_,i)=>i%2===0),
        ys=values.filter((_,i)=>i%2===1);
      return {x0:Math.min(...xs),x1:Math.max(...xs),
        y0:Math.min(...ys),y1:Math.max(...ys)};
    };
    const big=envelope(aa.ink.d),small=envelope(oh.ink.d);
    expect(big.x1-big.x0).toBeGreaterThan((small.x1-small.x0)*1.8);
    expect(big.y1-big.y0).toBeGreaterThan(small.y1-small.y0);
    expect(small.x0).toBeGreaterThan(139);
    expect(small.x1).toBeLessThan(147);
    expect(small.y0).toBeGreaterThan(124);
    expect(small.y1).toBeLessThan(134);
    // Drawing cannot regress into a flat solid dark sticker at either
    // production detail setting.
    for(const detail of [.1,.45,1]){
      const viseme=scrollReaderFacePortrait(detail);
      for(const name of ["mouth-aa","mouth-oh"]){
        const marks=paths(viseme,name);
        expect(marks.some(s=>s.type==="path"&&
          s.fill==="$paper"&&(s.opacity??0)<.4)).toBe(true);
        expect(marks.some(s=>s.type==="path"&&
          s.fill==="$deep"&&(s.opacity??0)<.5)).toBe(true);
      }
    }
    expect(scrollReaderFacePortrait(1)).toEqual(high);
  });

  it("routes preserved resting lip anatomy to attached AA/OH vermilion, not a third-eye horizontal mouth seam",()=>{
    const anatomy=readerFaceAnatomy(1);
    const old=anatomy.lips.slice(2,6).filter(s=>s.type==="path");
    expect(old).toHaveLength(4);
    const originalNeutralSeam=
      "M135.2 125.9 Q138.9 125.6 142 126.7 Q145.9 127 148.7 126.6";
    expect(old.some(s=>s.type==="path"&&
      s.d===originalNeutralSeam)).toBe(true);
    const rest=paths(scrollReaderFacePortrait(1),"mouth-rest");
    expect(rest.some(s=>s.type==="path"&&
      s.d===originalNeutralSeam)).toBe(true);
    for(const state of ["aa","oh"] as const){
      const active=paths(scrollReaderFacePortrait(1),"mouth-"+state);
      // Preserve exactly the ANAT1 original four pigments/strokes and
      // their order; change the *position of the lip contact* so the
      // resting seam cannot cut horizontally through a speaking hole.
      expect(active.some(s=>s.type==="path"&&
        s.d===originalNeutralSeam)).toBe(false);
      const warped=active.slice(0,4);
      for(let i=0;i<4;i++){
        expect(warped[i]).toMatchObject({
          type:"path",fill:old[i].fill,stroke:old[i].stroke,
          strokeWidth:old[i].strokeWidth,opacity:old[i].opacity,
        });
        if(warped[i].type!=="path"||old[i].type!=="path")
          throw Error("Active anatomical lip must remain a path");
        expect(warped[i].d).not.toEqual(old[i].d);
      }
      // The long neutral 14px line must now lie ABOVE the speaking
      // negative space, not bisecting its apparent opening.
      if(warped[2].type!=="path")throw Error("Upper lip is not source path");
      const upper=warped[2].d;
      expect(upper).toContain(state==="oh"?"M140.65 125.45":"M136.3 124.82");
      const originalFace=scrollReaderFacePortrait(1);
      expect(paths(originalFace,"mouth-"+state).length)
        .toBe(active.length);
    }
  });

  it("keeps pre-existing reader face contour, lip cels, ear and paint while adding optically nested washes",()=>{
    const original=scrollReaderFacePortrait(1);
    const anatomy=readerFaceAnatomy(1);
    const low=readerFaceAnatomy(.1);
    const shapeCount=(name:string)=>paths(original,name).length;
    expect(anatomy.planes.length).toBeGreaterThan(low.planes.length+4);
    // The source-fitted paper-skin base and independent film visemes
    // cannot be replaced with a new facial sticker for the glaze effect.
    // Source paintings may add individual ear/cheek paths ahead of
    // the untouched head. Find its opaque ANAT1 jaw silhouette by
    // semantic geometry, never a brittle array index.
    const originalHead=paths(original,"face").find(s=>
      s.type==="path"&&s.fill==="$skin"&&s.d.includes("143.3 143.7"));
    expect(originalHead).toMatchObject({
      type:"path",fill:"$skin",opacity:1,
    });
    for(const name of ["reader-ear","brow","eyes-open","eyes-soft",
      "eyes-closed","mouth-rest","mouth-aa","mouth-oh","mouth-mm",
      "mouth-smile","pupil-left","pupil-right"])
      expect(shapeCount(name)).toBeGreaterThan(0);
    const nasalTurn=anatomy.planes.find(s=>s.d.includes(
      "C149.1 103.8 150.4 109.1 152.2 112.5"));
    expect(nasalTurn).toMatchObject({
      type:"path",fill:"$skinshade",stroke:"none",opacity:.185,
    });
    // Prior large angular bridge wedge is not restored by the glazing.
    expect(anatomy.planes.some(s=>s.d.includes(
      "C149.2 103.4 153 109.3 155 112.6"))).toBe(false);
    expect(original).toEqual(scrollReaderFacePortrait(1));
  });

});
