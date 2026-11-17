import {describe,it,expect} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {CrayonScene} from "../registry/video/materials/crayon-scene-react";
import {inspectCrayonScene} from "../registry/video/materials/crayon-scene";
import {crayonCc0FaceStudy} from "../src/video/crayon-artcraft-cc0-face";
import {
  crayonF1AddRootedHairFlow,CRAYON_F1_V39_ROOT_REGIONS,
} from "../src/video/crayon-artcraft-f1-anat1-root-flow";
import {Cc0Anat1RootFlowV39,Cc0Anat1RootFlowDetailV39,
  Cc0Anat1RootFlowCrownV39}
  from "../src/video/crayon-artcraft-adult-face.stories";

const parent={
  crown:"hair-crown-surface",
  left:"hair-left-curtain",
  right:"hair-right-curtain",
} as const;
const isOriginal=(id:string)=>/^hair-rooted-(crown|left|right)-[0-5]$/.test(id);
const byId=<T extends {id:string}>(a:readonly T[],id:string)=>a.find(x=>x.id===id);

describe("ArtCraft F1 V39 CC0 natural root-to-shaft crayon wax candidate",()=>{
  it("preserves the entire original V38 portrait, details, material and 300-frame timing",()=>{
    for(const detail of [.2,1] as const){
      const before=crayonCc0FaceStudy({detail,midfaceForm:"source-anat1-hair-values"});
      const after=crayonCc0FaceStudy({detail,midfaceForm:"source-anat1-rooted-hair-v39"});
      expect(inspectCrayonScene(before)).toEqual([]);
      expect(inspectCrayonScene(after)).toEqual([]);
      expect(after.elements.map(x=>x.id)).toEqual(before.elements.map(x=>x.id));
      expect(after.elements.length).toBe(before.elements.length);
      for(const key of ["id","width","height","seed","camera","paper","paperTooth",
        "durationFrames"] as const)expect(after[key]).toEqual(before[key]);
      let changed=0;
      for(const original of before.elements){
        const revised=byId(after.elements,original.id);
        if(!revised)throw Error("Lost original source detail "+original.id);
        if(isOriginal(original.id)){
          if(original.kind!=="contour"||revised.kind!=="contour")
            throw Error("Source-rooted film contour not preserved");
          expect(revised.d.startsWith(original.d+" ")).toBe(true);
          expect(revised.d.length).toBeGreaterThan(original.d.length);
          for(const key of ["id","kind","parentId","clipToParent","color","opacity",
            "width","waxContact","waxPressure","timing"] as const)
            expect(revised[key]).toEqual(original[key]);
          expect(revised.d).not.toContain("NaN");
          changed++;
        }else expect(revised).toEqual(original);
      }
      if(detail===1)expect(changed).toBe(18);
      expect(changed).toBeGreaterThanOrEqual(3);
      expect(after.durationFrames).toBe(300);
      for(const region of CRAYON_F1_V39_ROOT_REGIONS){
        const ids=after.elements.filter(e=>e.id.startsWith("hair-rooted-"+region+"-"));
        expect(ids.length).toBeGreaterThan(0);
        for(const el of ids) {
          expect(el.kind).toBe("contour");
          if(el.kind==="contour"){
            expect(el.parentId).toBe(parent[region]);
            expect(el.clipToParent).toBe(true);
          }
        }
      }
    }
  });

  it("is reversible, deterministic and fails closed on malformed or detached source",()=>{
    const baseline=crayonCc0FaceStudy({midfaceForm:"source-anat1-hair-values"});
    const first=crayonF1AddRootedHairFlow(baseline.elements,1);
    const second=crayonF1AddRootedHairFlow(baseline.elements,1);
    expect(first).toEqual(second);
    expect(baseline.elements).not.toEqual(first);
    for(const detail of [-1,0,.199,1.01,NaN,Infinity])
      expect(()=>crayonF1AddRootedHairFlow(baseline.elements,detail))
        .toThrow(RangeError);
    expect(()=>crayonF1AddRootedHairFlow([],1)).toThrow(RangeError);
    expect(()=>crayonF1AddRootedHairFlow(baseline.elements.filter(el=>
      el.id!=="hair-back"),1)).toThrow(RangeError);
    expect(()=>crayonF1AddRootedHairFlow(baseline.elements.filter(el=>
      !el.id.startsWith("hair-rooted-crown-")),1)).toThrow(RangeError);
    const hair=baseline.elements.find(el=>el.id==="hair-rooted-left-0");
    if(!hair)throw Error("Missing V38 original left source");
    expect(()=>crayonF1AddRootedHairFlow([...baseline.elements,hair],1))
      .toThrow(RangeError);
    expect(()=>crayonF1AddRootedHairFlow(baseline.elements.map(el=>
      el.id==="hair-rooted-left-0"?{...el,parentId:"face-outline"}:el),1))
      .toThrow(RangeError);
  });

  it("renders native paper and clipped wax at 1x in experimental Storybook only",()=>{
    expect(Cc0Anat1RootFlowV39.name).toContain("!dev");
    expect(Cc0Anat1RootFlowDetailV39.name).toContain("!dev");
    expect(Cc0Anat1RootFlowCrownV39.name).toContain("!dev");
    const scene=crayonCc0FaceStudy({detail:.2,
      midfaceForm:"source-anat1-rooted-hair-v39"});
    const markup=renderToStaticMarkup(<CrayonScene spec={scene} frame={299}/>);
    for(const name of ["hair-crown-surface","hair-left-curtain","hair-right-curtain",
      "hair-rooted-crown-0","hair-rooted-left-0","hair-rooted-right-0",
      "iris-near","iris-far","source-brow-follicles-near","chin-plane"]){
      expect(markup).toContain('data-km-crayon-element="'+name+'"');
    }
    expect(markup).toContain("data-km-crayon-paper-contact-wax");
    expect(markup).not.toContain("<image");
    expect(markup).not.toContain("<foreignObject");
  },60_000);
});
