import {describe,it,expect} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {CrayonScene} from "../registry/video/materials/crayon-scene-react";
import {inspectCrayonScene} from "../registry/video/materials/crayon-scene";
import type {CrayonElement} from "../registry/video/materials/crayon-scene";
import {crayonCc0FaceStudy} from "../src/video/crayon-artcraft-cc0-face";
import {CRAYON_PORTRAIT_AUDIT} from "../src/video/crayon-artcraft-portrait-audit";
import {CRAYON_F1_V38_SOURCE,CRAYON_F1_V38_HAIR_IDS,
  crayonF1CalibrateAnat1HairValues}
  from "../src/video/crayon-artcraft-f1-anat1-hair-value";
import {Cc0Anat1HairValuesV38,Cc0Anat1HairCrownV38}
  from "../src/video/crayon-artcraft-adult-face.stories";
const by=(a:readonly CrayonElement[],id:string)=>a.find(e=>e.id===id);
const isHairFiber=(id:string)=>/^hair-rooted-(crown|left|right)-\d$/.test(id);

describe("F1 V38 ANAT1/CC0 photographed crown + face-occluding curtain native wax",()=>{
  it("uses measured original screenshot SHA, crown and two distinct curtain gradients",()=>{
    expect(CRAYON_F1_V38_SOURCE.sha).toBe(CRAYON_PORTRAIT_AUDIT.source.sha256);
    expect(CRAYON_F1_V38_SOURCE.comparisons).toHaveLength(7);
    expect(CRAYON_F1_V38_SOURCE.comparisons[0].photo).toEqual([47,36,30]);
    expect(CRAYON_F1_V38_SOURCE.comparisons[0].v37).toEqual([162,133,112]);
    expect(CRAYON_F1_V38_HAIR_IDS).toEqual([
      "hair-back","hair-crown-surface","hair-left-curtain","hair-right-curtain",
    ]);
    const ids=new Set(CRAYON_F1_V38_HAIR_IDS);
    expect(ids.size).toBe(4);
  });

  it("retains each original V37 ANAT1 face/eyebrow/naris/lash, changes 4 hair wax and original fibers only",()=>{
    for(const detail of [.2,1] as const){
      const old=crayonCc0FaceStudy({detail,midfaceForm:"source-anat1-brow-follicles"});
      const current=crayonCc0FaceStudy({detail,midfaceForm:"source-anat1-hair-values"});
      expect(inspectCrayonScene(old)).toEqual([]);
      expect(inspectCrayonScene(current)).toEqual([]);
      expect(current.elements).toHaveLength(old.elements.length);
      const ids=new Set<string>(CRAYON_F1_V38_HAIR_IDS);
      expect(current.elements.filter(e=>!ids.has(e.id)&&!isHairFiber(e.id)))
        .toEqual(old.elements.filter(e=>!ids.has(e.id)&&!isHairFiber(e.id)));
      for(const key of ["id","width","height","seed","durationFrames","camera",
        "paper","paperTooth"] as const)expect(current[key]).toEqual(old[key]);
      for(const id of CRAYON_F1_V38_HAIR_IDS){
        const a=by(old.elements,id),b=by(current.elements,id);
        if(a?.kind!=="wax"||b?.kind!=="wax")throw Error("Missing native hair wax "+id);
        expect(b.d).toBe(a.d);
        expect(b.bounds).toEqual(a.bounds);
        expect(b.colors).not.toEqual(a.colors);
        expect(b.underpaintGradient).not.toEqual(a.underpaintGradient);
        expect(b.underpaintGradient).toBeDefined();
        expect(b.coverage).toBe("opaque");
        expect(b.deposition).toBe("stroke-built");
        expect(b.nibStyle).toBe("dry");
        expect(b.underpaintTooth).toBeGreaterThan(0);
        for(const k of ["id","kind","timing","parentId","clipToParent",
          "strokeOrder","markLength","motion","pivot"] as const)
          expect(b[k]).toEqual(a[k]);
      }
      let count=0;
      for(const before of old.elements.filter(x=>isHairFiber(x.id))){
        const after=by(current.elements,before.id);
        if(before.kind!=="contour"||after?.kind!=="contour")
          throw Error("Missing native strand group");
        count++;
        expect(after.d).toBe(before.d);
        expect(after.parentId).toBe(before.parentId);
        expect(after.clipToParent).toBe(before.clipToParent);
        expect(after.timing).toEqual(before.timing);
        expect(after.width).toBe(before.width);
        expect(after.waxContact).toBe(before.waxContact);
        expect(after.waxPressure).toBe(before.waxPressure);
        expect(after.color).not.toBe(before.color);
      }
      expect(count).toBeGreaterThanOrEqual(3);
      if(detail===1)expect(count).toBe(18);
    }
  });

  it("rejects absent/duplicate/invalid root groups and partially assembled hair",()=>{
    const native=crayonCc0FaceStudy({midfaceForm:"source-anat1-brow-follicles"});
    const newScene=crayonCc0FaceStudy({midfaceForm:"source-anat1-hair-values"});
    expect(()=>crayonF1CalibrateAnat1HairValues([])).toThrow(RangeError);
    expect(()=>crayonF1CalibrateAnat1HairValues(newScene.elements))
      .not.toThrow(); // idempotent pigment calibration: does not add geometry
    expect(()=>crayonF1CalibrateAnat1HairValues(native.elements.filter(e=>
      e.id!=="hair-back"))).toThrow(RangeError);
    expect(()=>crayonF1CalibrateAnat1HairValues(native.elements.filter(e=>
      !e.id.startsWith("hair-rooted-crown-")))).toThrow(RangeError);
    expect(()=>crayonF1CalibrateAnat1HairValues(native.elements.map(e=>
      e.id==="hair-crown-surface"?{...e,clipToParent:true}:e)))
      .toThrow(RangeError);
    expect(()=>crayonF1CalibrateAnat1HairValues(native.elements.map(e=>
      e.id==="hair-rooted-left-0"?{...e,parentId:"other-person"}:e)))
      .toThrow(RangeError);
    const left= native.elements.find(e=>e.id==="hair-rooted-left-0");
    if(!left)throw Error("Source left fiber missing");
    expect(()=>crayonF1CalibrateAnat1HairValues([...native.elements,left]))
      .toThrow(RangeError);
    expect(()=>crayonF1CalibrateAnat1HairValues(native.elements.map(e=>
      e.id==="hair-rooted-left-0"?{...e,id:"hair-rooted-left-7"}:e)))
      .toThrow(RangeError);
    expect(()=>crayonF1CalibrateAnat1HairValues(native.elements.filter(e=>
      !e.id.startsWith("hair-rooted-right-")))).toThrow(RangeError);
  });

  it("preserves 300-frame paper tooth, real hair strokes and original !dev Storybook",()=>{
    expect(Cc0Anat1HairValuesV38.name).toContain("!dev");
    expect(Cc0Anat1HairCrownV38.name).toContain("!dev");
    const scene=crayonCc0FaceStudy({detail:.2,midfaceForm:"source-anat1-hair-values"});
    expect(scene.durationFrames).toBe(300);
    const html=renderToStaticMarkup(<CrayonScene spec={scene} frame={299}/>);
    expect(html).toContain("data-km-crayon-paper-contact-wax");
    for(const id of ["hair-back","hair-crown-surface","hair-left-curtain",
      "hair-right-curtain","hair-rooted-crown-0","hair-rooted-left-0",
      "hair-rooted-right-0","source-brow-follicles-near","iris-near",
      "socket-near","naris-shadow-far","chin-plane","lip-upper"]){
      expect(html).toContain('data-km-crayon-element="'+id+'"');
    }
    expect(html).not.toContain("<image");
    expect(html).not.toContain("<foreignObject");
  },40_000);
});
