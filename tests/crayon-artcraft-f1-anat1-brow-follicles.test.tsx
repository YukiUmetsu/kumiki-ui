import {describe,it,expect} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {CrayonScene} from "../registry/video/materials/crayon-scene-react";
import {inspectCrayonScene} from "../registry/video/materials/crayon-scene";
import type {CrayonElement} from "../registry/video/materials/crayon-scene";
import {crayonCc0FaceStudy} from "../src/video/crayon-artcraft-cc0-face";
import {CRAYON_PORTRAIT_AUDIT} from "../src/video/crayon-artcraft-portrait-audit";
import {crayonF1RegisterAnat1Face} from "../src/video/crayon-artcraft-f1-anat1-malar";
import {crayonF1ReconstructBrows} from "../src/video/crayon-artcraft-f1-brow-geometry";
import {
  CRAYON_F1_V37_SOURCE,CRAYON_F1_V37_WAX_IDS,CRAYON_F1_V37_NEW_IDS,
  crayonF1Anat1BrowFibrePaths,crayonF1BuildAnat1SourceBrow,
} from "../src/video/crayon-artcraft-f1-anat1-brow-follicles";
import {Cc0Anat1BrowFolliclesV37,Cc0Anat1BrowDetailV37}
  from "../src/video/crayon-artcraft-adult-face.stories";

const find=(items:readonly CrayonElement[],id:string)=>items.find(e=>e.id===id);
const controls=(d:string)=>Array.from(
  d.matchAll(/M(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?) C(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g),
  m=>m.slice(1).map(Number));
describe("ArtCraft F1 V37 ANAT1 photographic near brow rooted-wax microfilaments",()=>{
  it("preserves verified source photo and ANAT1 fitted 3D face while adding 165 uneven wax roots",()=>{
    const fit=crayonF1RegisterAnat1Face();
    expect(fit.model).toBe("ANAT1/MediaPipe-468-unmodified");
    expect(fit.artisticApproval).toBe(false);
    expect(fit.rmse).toBeGreaterThan(0);
    expect(fit.rmse).toBeLessThan(40);
    expect(CRAYON_F1_V37_SOURCE.sha).toBe(CRAYON_PORTRAIT_AUDIT.source.sha256);
    expect(CRAYON_F1_V37_SOURCE.nearBrowPeak).toEqual([274,480]);
    expect(CRAYON_F1_V37_SOURCE.paperContactPoints).toHaveLength(6);
    expect(CRAYON_F1_V37_SOURCE.paperContactPoints[3].photo).toEqual([106,64,52]);
    expect(CRAYON_F1_V37_SOURCE.paperContactPoints[3].v36).toEqual([188,159,147]);
    const fibers=crayonF1Anat1BrowFibrePaths();
    const dark=controls(fibers["source-brow-follicles-near"]);
    const glints=controls(fibers["source-brow-flyaways-near"]);
    expect(dark).toHaveLength(128);
    expect(glints).toHaveLength(37);
    expect(new Set(dark.map(v=>v.join(" ")) ).size).toBe(128);
    // Microtexture flows along the photographed curved brow, never one
    // repeated regular comb/tick/fur grid pasted above a uniform arch.
    const spans=dark.map(v=>Math.hypot(v[6]-v[0],v[7]-v[1]));
    const lengths=new Set(spans.map(v=>v.toFixed(1)));
    expect(lengths.size).toBeGreaterThan(24);
    for(const values of [...dark,...glints]){
      expect(values).toHaveLength(8);
      for(const n of values)expect(Number.isFinite(n)).toBe(true);
      expect(values[6]).toBeGreaterThan(195);
      expect(values[6]).toBeLessThan(341);
      expect(values[7]).toBeGreaterThan(455);
      expect(values[7]).toBeLessThan(513);
    }
    expect(crayonF1Anat1BrowFibrePaths()).toEqual(fibers);
  });

  it("changes only three V9 near wax materials, adds two native fibers, keeps 20 original and all other V36",()=>{
    const v36=crayonCc0FaceStudy({midfaceForm:"source-anat1-near-eye"});
    const rooted=crayonF1ReconstructBrows(v36.elements);
    const v37=crayonCc0FaceStudy({midfaceForm:"source-anat1-brow-follicles"});
    expect(inspectCrayonScene(v36)).toEqual([]);
    expect(inspectCrayonScene(v37)).toEqual([]);
    const changed=new Set<string>(CRAYON_F1_V37_WAX_IDS);
    const additions=new Set<string>(CRAYON_F1_V37_NEW_IDS);
    expect(v37.elements).toHaveLength(rooted.length+2);
    expect(v37.elements.filter(e=>!changed.has(e.id)&&!additions.has(e.id)))
      .toEqual(rooted.filter(e=>!changed.has(e.id)));
    expect(v37.elements.filter(e=>additions.has(e.id))).toHaveLength(2);
    for(const key of ["id","width","height","durationFrames","seed","camera",
      "paper","paperTooth"] as const)expect(v37[key]).toEqual(v36[key]);
    const oldNear=find(rooted,"source-brow-fibers-near"),
      newer=find(v37.elements,"source-brow-fibers-near");
    expect(newer).toEqual(oldNear);
    if(newer?.kind!=="contour")throw Error("Missing original brown hair");
    expect((newer.d.match(/M/g)??[]).length).toBe(20);
    for(const id of changed){
      const old=find(rooted,id),current=find(v37.elements,id);
      if(old?.kind!=="wax"||current?.kind!=="wax")
        throw Error("Source root wax missing: "+id);
      expect(current.d).toBe(old.d);
      expect(current.bounds).toEqual(old.bounds);
      expect(current.colors).not.toEqual(old.colors);
      expect(current.parentId).toBe("face-outline");
      expect(current.clipToParent).toBe(true);
      expect(current.deposition).toBe("stroke-built");
      expect(current.featherContacts).toBe(true);
      expect(current.blendRadius).toBeLessThanOrEqual(18);
      for(const k of ["kind","id","timing","markLength","strokeOrder",
        "motion","pivot"] as const)expect(current[k]).toEqual(old[k]);
    }
    for(const id of additions){
      const e=find(v37.elements,id);
      if(e?.kind!=="contour")throw Error("Missing native brows "+id);
      expect(e.waxContact).toBe("dry-wax");
      expect(e.parentId).toBe("face-outline");
      expect(e.clipToParent).toBe(true);
      // V37 first rendered revision deposited square 3× wax chips.
      // Fine native filaments must remain physically narrow/soft rather
      // than ever repeating that cartoon-like thick terminal contact.
      expect(e.width).toBeLessThanOrEqual(.24);
      expect(e.opacity).toBeLessThanOrEqual(.6);
      expect(e.waxPressure).toBeLessThanOrEqual(.42);
      expect(e.timing.end).toBe(299);
    }
    for(const id of ["source-brow-fibers-far","source-brow-wax-far",
      "source-brow-vein-far","source-brow-feather-far","socket-near","socket-far",
      "sclera-inner-contact-near","pupil-near","iris-near","nose-dorsum",
      "naris-shadow-near","hair-left-curtain","hair-right-curtain",
      "cheek-malar-bounce","chin-plane"]){
      expect(find(rooted,id)).toEqual(find(v37.elements,id));
    }
    expect(v37.durationFrames).toBe(300);
  });

  it("fails closed on missing, duplicated, unrooted, double-applied eyebrows",()=>{
    const v36=crayonCc0FaceStudy({midfaceForm:"source-anat1-near-eye"});
    const rooted=crayonF1ReconstructBrows(v36.elements);
    const v37=crayonCc0FaceStudy({midfaceForm:"source-anat1-brow-follicles"});
    const fiber=find(rooted,"source-brow-fibers-near");
    if(!fiber)throw Error("Missing original brow");
    expect(()=>crayonF1BuildAnat1SourceBrow([])).toThrow(RangeError);
    expect(()=>crayonF1BuildAnat1SourceBrow(v36.elements)).toThrow(RangeError);
    expect(()=>crayonF1BuildAnat1SourceBrow(rooted.filter(
      el=>el.id!=="source-brow-vein-near"))).toThrow(RangeError);
    expect(()=>crayonF1BuildAnat1SourceBrow([...rooted,fiber])).toThrow(RangeError);
    expect(()=>crayonF1BuildAnat1SourceBrow(v37.elements)).toThrow(RangeError);
    expect(()=>crayonF1BuildAnat1SourceBrow(rooted.map(el=>
      el.id==="source-brow-wax-near"?{...el,parentId:"foreign-face"}:el)))
      .toThrow(RangeError);
    expect(()=>crayonF1BuildAnat1SourceBrow(rooted.map(el=>
      el.id==="source-brow-fibers-near"?{...el,kind:"wax"} as CrayonElement:el)))
      .toThrow(RangeError);
  });

  it("retains 300-frame native paper-tooth, no raster and existing !dev Storybook controls",()=>{
    expect(Cc0Anat1BrowFolliclesV37.name).toContain("!dev");
    expect(Cc0Anat1BrowDetailV37.name).toContain("!dev");
    for(const browForm of ["baseline","source-rooted"] as const){
      const scene=crayonCc0FaceStudy({detail:.2,eyeContact:"source-shade",
        browForm,midfaceForm:"source-anat1-brow-follicles"});
      expect(inspectCrayonScene(scene)).toEqual([]);
      expect(scene.durationFrames).toBe(300);
      const html=renderToStaticMarkup(<CrayonScene spec={scene} frame={299}/>);
      expect(html).toContain("data-km-crayon-paper-contact-wax");
      for(const id of [...CRAYON_F1_V37_NEW_IDS,...CRAYON_F1_V37_WAX_IDS,
        "source-brow-fibers-near","source-brow-fibers-far","face-outline",
        "iris-near","iris-far","sclera-inner-contact-near","lip-upper",
        "hair-left-curtain","cheek-malar-bounce","naris-shadow-far"]){
        expect(html).toContain('data-km-crayon-element="'+id+'"');
      }
      expect(html).not.toContain("<image");
      expect(html).not.toContain("<foreignObject");
    }
  },40_000);
});
