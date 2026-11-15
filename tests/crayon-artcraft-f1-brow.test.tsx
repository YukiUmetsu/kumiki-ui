import {describe,expect,it} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {inspectCrayonScene} from "../registry/video/materials/crayon-scene";
import {CrayonScene} from "../registry/video/materials/crayon-scene-react";
import {crayonCc0FaceStudy}
  from "../src/video/crayon-artcraft-cc0-face";
import {CRAYON_F1_BROW_IDS,crayonF1ReconstructBrows}
  from "../src/video/crayon-artcraft-f1-brow-geometry";

const settings={
  eyeContact:"baseline" as const,midfaceForm:"baseline" as const,
  jawNeckForm:"baseline" as const,lashFinish:"sparse" as const,
};

describe("ArtCraft F1 source-brow wax construction",()=>{
  it("retains an exact negative control and every unstudied anatomical element",()=>{
    const old=crayonCc0FaceStudy({...settings,browForm:"baseline"});
    const next=crayonCc0FaceStudy({...settings,browForm:"source-rooted"});
    expect(CRAYON_F1_BROW_IDS).toHaveLength(6);
    expect(next.elements).toHaveLength(old.elements.length+6);
    expect(next.seed).toBe(old.seed);
    expect(next.paper).toBe(old.paper);
    expect(next.paperTooth).toBe(old.paperTooth);
    expect(next.camera).toEqual(old.camera);
    expect(next.durationFrames).toBe(old.durationFrames);
    expect(next.elements.filter(e=>!CRAYON_F1_BROW_IDS.includes(
      e.id as (typeof CRAYON_F1_BROW_IDS)[number]))).toEqual(old.elements);
    for(const id of CRAYON_F1_BROW_IDS){
      expect(old.elements.some(e=>e.id===id)).toBe(false);
      expect(next.elements.filter(e=>e.id===id)).toHaveLength(1);
    }
    expect(inspectCrayonScene(old)).toEqual([]);
    expect(inspectCrayonScene(next)).toEqual([]);
  });
  it("constructs two connected opaque eyebrow masses ahead of soft pressure glazes",()=>{
    const elements=crayonCc0FaceStudy({...settings,browForm:"source-rooted"}).elements;
    const names=elements.map(e=>e.id);
    for(const side of ["near","far"] as const){
      const core=elements.find(e=>e.id==="source-brow-wax-"+side);
      const halo=elements.find(e=>e.id==="source-brow-feather-"+side);
      const overlay=elements.find(e=>e.id==="brow-superciliary-"+side);
      expect(core).toMatchObject({kind:"wax",parentId:"face-outline",
        clipToParent:true,coverage:"opaque",deposition:"stroke-built",
        featherContacts:false,outlineOpacity:0});
      expect(overlay).toMatchObject({kind:"wax",coverage:"open",
        featherContacts:true,clipToParent:true});
      expect(halo).toMatchObject({kind:"wax",coverage:"open",
        featherContacts:true,clipToParent:true,
        parentId:"face-outline",outlineOpacity:0,
        underpaintTooth:0});
      if(core?.kind!=="wax")throw Error("Missing connected wax brow "+side);
      expect(core.underpaintGradient?.shadow).toMatch(/^#[0-9a-f]{6}$/i);
      expect(core.underpaintTooth).toBeGreaterThan(.15);
      expect(core.markStrength).toBeLessThan(.15);
      expect(core.pressure).toBeGreaterThan(.8);
      expect(core.spacing).toBeLessThan(5.1);
      expect((core.d.match(/C/g)??[]).length).toBeGreaterThanOrEqual(4);
      expect(names.indexOf("face-outline")).toBeLessThan(names.indexOf(core.id));
      expect(names.indexOf("source-brow-feather-"+side)).toBeLessThan(
        names.indexOf(core.id));
      expect(names.indexOf(core.id)).toBeLessThan(
        names.indexOf("brow-superciliary-"+side));
    }
  });
  it("lays irregular genuinely curved wax fibers after each brow, under hair",()=>{
    const scene=crayonCc0FaceStudy({...settings,browForm:"source-rooted"});
    const names=scene.elements.map(e=>e.id);
    const near=scene.elements.find(e=>e.id==="source-brow-fibers-near");
    const far=scene.elements.find(e=>e.id==="source-brow-fibers-far");
    if(near?.kind!=="contour"||far?.kind!=="contour")
      throw Error("Missing attached crayon fibers");
    expect(near).toMatchObject({parentId:"face-outline",
      clipToParent:true,waxContact:"dry-wax"});
    expect(far).toMatchObject({parentId:"face-outline",
      clipToParent:true,waxContact:"dry-wax"});
    expect((near.d.match(/M/g)??[]).length).toBe(20);
    expect((far.d.match(/M/g)??[]).length).toBe(9);
    for(const [side,bundle] of [["near",near],["far",far]] as const){
      expect((bundle.d.match(/C/g)??[]).length).toBe(
        side==="near"?20:9);
      expect(bundle.width).toBeLessThan(.3);
      expect(bundle.waxPressure).toBeGreaterThan(.45);
      expect(names.indexOf("brow-superciliary-"+side)).toBeLessThan(
        names.indexOf("source-brow-fibers-"+side));
      expect(names.indexOf("source-brow-fibers-"+side)).toBeLessThan(
        names.indexOf("hair-right-curtain"));
    }
    expect(inspectCrayonScene(scene)).toEqual([]);
  });
  it("preserves optional modes and renders actual native wax source masks",()=>{
    for(const detail of [.2,.6,1]){
      for(const view of ["wax","anatomy"] as const){
        expect(inspectCrayonScene(crayonCc0FaceStudy({
          ...settings,browForm:"source-rooted",detail,view,
        }))).toEqual([]);
      }
    }
    expect(()=>crayonCc0FaceStudy({browForm:"bad" as "baseline"}))
      .toThrow(RangeError);
    expect(()=>crayonF1ReconstructBrows([])).toThrow(RangeError);
    const html=renderToStaticMarkup(<CrayonScene spec={crayonCc0FaceStudy({
      ...settings,browForm:"source-rooted",
    })} frame={299}/>);
    for(const id of CRAYON_F1_BROW_IDS)
      expect(html).toContain('data-km-crayon-element="'+id+'"');
    expect(html).toContain('data-km-crayon-underpaint-gradient=""');
    expect(html).toContain('data-km-crayon-fiber-contact="dry-wax"');
  });
});
