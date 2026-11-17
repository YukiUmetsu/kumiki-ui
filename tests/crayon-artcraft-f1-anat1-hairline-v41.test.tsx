import {describe,it,expect} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {CrayonScene} from "../registry/video/materials/crayon-scene-react";
import {inspectCrayonScene} from "../registry/video/materials/crayon-scene";
import type {CrayonElement} from "../registry/video/materials/crayon-scene";
import {CRAYON_PORTRAIT_AUDIT} from "../src/video/crayon-artcraft-portrait-audit";
import {crayonCc0FaceStudy} from "../src/video/crayon-artcraft-cc0-face";
import {
  CRAYON_F1_V41_SOURCE,CRAYON_F1_V41_CHANGED_IDS,
  crayonF1AlignAnat1HairlineV41,
} from "../src/video/crayon-artcraft-f1-anat1-hairline-v41";
import {
  Cc0Anat1MeasuredHairlineV41,Cc0Anat1MeasuredForeheadV41,
  Cc0Anat1MeasuredTempleV41,
} from "../src/video/crayon-artcraft-adult-face.stories";

const by=(elements:readonly CrayonElement[],id:string)=>
  elements.find(e=>e.id===id);

describe("ArtCraft CC0 F1 V41 photographed forehead and far-temple hairline",()=>{
  it("uses actual source screenshot SHA + specifically measured asymmetric skin transition",()=>{
    expect(CRAYON_F1_V41_SOURCE.sha).toBe(CRAYON_PORTRAIT_AUDIT.source.sha256);
    expect(CRAYON_F1_V41_SOURCE.width).toBe(608);
    expect(CRAYON_F1_V41_SOURCE.height).toBe(1082);
    expect(CRAYON_F1_V41_SOURCE.artisticApproval).toBe(false);
    expect(CRAYON_F1_V41_SOURCE.edge).toHaveLength(14);
    const at=(x:number)=>CRAYON_F1_V41_SOURCE.edge.find(p=>p.x===x);
    expect(at(140)?.photoY).toBe(334);
    expect(at(140)?.v40Y).toBe(355);
    expect(at(420)?.photoY).toBe(353);
    expect(at(420)?.v40Y).toBe(316);
    expect(CRAYON_F1_V41_CHANGED_IDS).toEqual([
      "face-outline","forehead-light","hair-right-curtain",
    ]);
  });

  it("only adjusts three source-space wax outlines; every V40 facial feature and hair fiber survives",()=>{
    for(const detail of [.2,1] as const){
      const control=crayonCc0FaceStudy({detail,midfaceForm:"source-anat1-hair-contour-v40"});
      const candidate=crayonCc0FaceStudy({detail,midfaceForm:"source-anat1-hairline-v41"});
      expect(inspectCrayonScene(control)).toEqual([]);
      expect(inspectCrayonScene(candidate)).toEqual([]);
      for(const key of ["id","width","height","seed","durationFrames",
        "camera","paper","paperTooth"] as const)
        expect(candidate[key]).toEqual(control[key]);
      expect(candidate.elements.map(x=>x.id)).toEqual(control.elements.map(x=>x.id));
      let changed=0,fibers=0;
      for(const el of control.elements){
        const other=by(candidate.elements,el.id);
        if(!other)throw Error("Lost original face element "+el.id);
        if(CRAYON_F1_V41_CHANGED_IDS.some(id=>id===el.id)){
          if(el.kind!=="wax"||other.kind!=="wax")
            throw Error("Lost face/hair wax "+el.id);
          expect(other.d).not.toBe(el.d);
          const {d:beforePath,...beforeEverything}=el;
          const {d:afterPath,...afterEverything}=other;
          expect(afterEverything).toEqual(beforeEverything);
          expect(afterPath.length).toBeGreaterThan(140);
          expect(beforePath).not.toBe(afterPath);
          changed++;
        }else expect(other).toEqual(el);
        if(el.id.startsWith("hair-rooted-")){
          fibers++;
          expect(other).toEqual(el);
        }
      }
      expect(changed).toBe(3);
      expect(fibers).toBeGreaterThanOrEqual(3);
      if(detail===1)expect(fibers).toBe(18);
    }
  });

  it("rejects missing, duplicate or substituted source outlines",()=>{
    const original=crayonCc0FaceStudy({midfaceForm:"source-anat1-hair-contour-v40"});
    expect(()=>crayonF1AlignAnat1HairlineV41([])).toThrow(RangeError);
    const face=by(original.elements,"face-outline");
    if(!face)throw Error("Missing photographed V40 original face");
    expect(()=>crayonF1AlignAnat1HairlineV41([...original.elements,face]))
      .toThrow(RangeError);
    for(const id of ["face-outline","forehead-light","hair-right-curtain",
      "hair-left-curtain","hair-crown-surface","source-brow-follicles-near"]){
      expect(()=>crayonF1AlignAnat1HairlineV41(original.elements.filter(e=>
        e.id!==id))).toThrow(RangeError);
    }
    expect(()=>crayonF1AlignAnat1HairlineV41(original.elements.map(el=>
      el.id==="hair-right-curtain"?{...el,d:"M0 0Z"}:el)))
      .toThrow(RangeError);
    expect(()=>crayonF1AlignAnat1HairlineV41(original.elements.map(el=>
      el.id==="forehead-light"?{...el,parentId:"other"}:el)))
      .toThrow(RangeError);
  });

  it("keeps actual native paper / layered hair and all ArtCraft Storybook states quarantined",()=>{
    for(const story of [Cc0Anat1MeasuredHairlineV41,
      Cc0Anat1MeasuredForeheadV41,Cc0Anat1MeasuredTempleV41])
      expect(story.name).toContain("!dev");
    const spec=crayonCc0FaceStudy({detail:.2,midfaceForm:"source-anat1-hairline-v41"});
    expect(spec.durationFrames).toBe(300);
    const html=renderToStaticMarkup(<CrayonScene spec={spec} frame={299}/>);
    for(const id of ["face-outline","forehead-light","hair-back",
      "hair-crown-surface","hair-left-curtain","hair-right-curtain",
      "hair-rooted-crown-0","hair-rooted-left-0","hair-rooted-right-0",
      "source-brow-follicles-near","iris-near","naris-shadow-far",
      "lip-upper","chin-plane"]){
      expect(html).toContain('data-km-crayon-element="'+id+'"');
    }
    expect(html).toContain('data-km-crayon-paper-contact-wax');
    expect(html).toContain('data-km-crayon-fiber-contact="dry-wax"');
    expect(html).not.toContain("<image");
    expect(html).not.toContain("<foreignObject");
  },60_000);
});
