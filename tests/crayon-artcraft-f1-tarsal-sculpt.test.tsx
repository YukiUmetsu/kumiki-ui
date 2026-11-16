import {describe,expect,it} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {CrayonScene} from "../registry/video/materials/crayon-scene-react";
import {inspectCrayonScene} from "../registry/video/materials/crayon-scene";
import {crayonCc0FaceStudy}
  from "../src/video/crayon-artcraft-cc0-face";
import {CRAYON_F1_TARSAL_SCULPT_ADDITIONS,CRAYON_F1_TARSAL_SCULPT_PATCH_IDS,
  crayonF1SculptTarsal}
  from "../src/video/crayon-artcraft-f1-tarsal-sculpt";
import {auditCrayonF1LashRootContinuity}
  from "../src/video/crayon-artcraft-f1-lash-clusters";

describe("ArtCraft source-specific upper tarsus + ocular socket — experimental wax",()=>{
  const common={detail:1 as const,midfaceForm:"baseline" as const,
    browForm:"baseline" as const,jawNeckForm:"baseline" as const,
    lashFinish:"rooted" as const};

  it("retains all unstudied shapes, camera, contact, timing, and root placement",()=>{
    const previous=crayonCc0FaceStudy({...common,eyeContact:"source-value"});
    const next=crayonCc0FaceStudy({...common,eyeContact:"source-sculpt"});
    expect(CRAYON_F1_TARSAL_SCULPT_PATCH_IDS).toHaveLength(10);
    expect(CRAYON_F1_TARSAL_SCULPT_ADDITIONS).toHaveLength(6);
    expect(next.elements.length).toBe(previous.elements.length+6);
    expect(next.camera).toEqual(previous.camera);
    expect(next.seed).toBe(previous.seed);
    expect(next.paper).toBe(previous.paper);
    expect(next.paperTooth).toBe(previous.paperTooth);
    expect(next.durationFrames).toBe(previous.durationFrames);
    const touched=new Set([...CRAYON_F1_TARSAL_SCULPT_PATCH_IDS,
      ...CRAYON_F1_TARSAL_SCULPT_ADDITIONS]);
    expect(next.elements.filter(e=>!touched.has(e.id)))
      .toEqual(previous.elements.filter(e=>!touched.has(e.id)));
    for(const id of CRAYON_F1_TARSAL_SCULPT_PATCH_IDS){
      const old=previous.elements.find(e=>e.id===id);
      const now=next.elements.find(e=>e.id===id);
      if(old?.kind!=="wax"||now?.kind!=="wax")
        throw new Error("Missing existing registered eye plane: "+id);
      expect(now.parentId).toBe(old.parentId);
      expect(now.clipToParent).toBe(old.clipToParent);
      expect(now.timing).toEqual(old.timing);
      expect(now.deposition).toBe(old.deposition);
      expect(now).not.toEqual(old);
    }
    const roots=auditCrayonF1LashRootContinuity(next.elements);
    expect(roots.near).toMatchObject({count:33,detached:0});
    expect(roots.far).toMatchObject({count:14,detached:0});
    expect(inspectCrayonScene(previous)).toEqual([]);
    expect(inspectCrayonScene(next)).toEqual([]);
  });

  it("builds asymmetric material-native socket / tarsal / lower-lid planes",()=>{
    const spec=crayonCc0FaceStudy({...common,eyeContact:"source-sculpt"});
    const ids=spec.elements.map(e=>e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for(const side of ["near","far"] as const){
      const socket="source-socket-turn-"+side;
      const tarsal="source-tarsal-burnish-"+side;
      const lower="source-infraorbital-wax-"+side;
      for(const id of [socket,tarsal,lower]){
        const e=spec.elements.find(x=>x.id===id);
        expect(e).toMatchObject({kind:"wax",parentId:"face-outline",
          clipToParent:true,coverage:"open",deposition:"stroke-built",
          featherContacts:true,outlineOpacity:0});
        if(e?.kind!=="wax")throw new Error("Missing pressure-painted "+id);
        expect(e.blendRadius).toBeGreaterThan(2);
        expect(e.markStrength).toBeGreaterThan(.15);
        expect(e.angle).toBeGreaterThan(-89);
        expect(e.pressure).toBeGreaterThan(.5);
      }
      const shelf=spec.elements.find(e=>e.id==="tarsal-shelf-"+side);
      const root=spec.elements.find(e=>e.id==="lash-root-"+side);
      const iris=spec.elements.find(e=>e.id==="iris-"+side);
      if(shelf?.kind!=="wax"||root?.kind!=="wax"||iris?.kind!=="wax")
        throw new Error("Missing photographed lid/iris "+side);
      expect(shelf.coverage).toBe("opaque");
      expect(shelf.underpaintTooth).toBeGreaterThan(.18);
      expect(shelf.underpaintGradient).toBeDefined();
      // Actual source-camera v10 pixels rejected the dark eyeliner slab.
      // Wax contact must stay pigmented, irregular, and skin-integrated.
      expect(root.opaqueBurnish).toBeGreaterThan(.2);
      expect(root.opaqueBurnish).toBeLessThan(.5);
      expect(root.markStrength).toBeLessThan(.22);
      expect(root.underpaintGradient).toBeDefined();
      expect(root.outlineOpacity).toBe(0);
      expect(ids.indexOf("eye-orbital-fold-"+side)).toBeLessThan(ids.indexOf(socket));
      expect(ids.indexOf(socket)).toBeLessThan(ids.indexOf("sclera-"+side));
      expect(ids.indexOf("iris-"+side)).toBeLessThan(ids.indexOf("tarsal-shelf-"+side));
      expect(ids.indexOf("tarsal-shelf-"+side)).toBeLessThan(ids.indexOf("lash-root-"+side));
      expect(ids.indexOf("lash-root-"+side)).toBeLessThan(ids.indexOf(tarsal));
      expect(ids.indexOf(tarsal)).toBeLessThan(ids.indexOf("lash-contact-"+side));
      expect(ids.indexOf("lower-lid-"+side)).toBeLessThan(ids.indexOf(lower));
      expect(iris.parentId).toBe("sclera-"+side);
    }
    const near=spec.elements.find(e=>e.id==="tarsal-shelf-near");
    const far=spec.elements.find(e=>e.id==="tarsal-shelf-far");
    if(near?.kind!=="wax"||far?.kind!=="wax")
      throw new Error("Missing source-specific eyelid planes");
    expect(near.d).not.toBe(far.d);
    expect(near.bounds.width).toBeGreaterThan(far.bounds.width);
    expect(spec.width).toBe(608);
    expect(spec.height).toBe(1082);
  });

  it("leaves the previous photo value and even older art controls fully unchanged",()=>{
    const original=crayonCc0FaceStudy({...common,eyeContact:"source-value"});
    const again=crayonCc0FaceStudy({...common,eyeContact:"source-value"});
    expect(again).toEqual(original);
    expect(crayonCc0FaceStudy({...common,eyeContact:"baseline"})).toEqual(
      crayonCc0FaceStudy({...common,eyeContact:"baseline",lashFinish:"sparse"}));
    expect(crayonCc0FaceStudy({...common,eyeContact:"source-sculpt"})).toEqual(
      crayonCc0FaceStudy({...common,eyeContact:"source-sculpt"}));
    expect(()=>crayonCc0FaceStudy({
      eyeContact:"source-canvas" as "source-sculpt",
    })).toThrow(RangeError);
    expect(()=>crayonF1SculptTarsal([])).toThrow(RangeError);
    const newSpec=crayonCc0FaceStudy({...common,eyeContact:"source-sculpt"});
    const duplicate=newSpec.elements.find(x=>x.id==="tarsal-shelf-near");
    if(!duplicate)throw new Error("Missing source lid");
    expect(()=>crayonF1SculptTarsal([...newSpec.elements,duplicate]))
      .toThrow(RangeError);
  });

  it("renders opaque overlapping wax without raster overlays",()=>{
    // 120/210 source-camera frames are photographed by Playwright.
    // Only one costly full-scene React SSR is needed here.
    const spec=crayonCc0FaceStudy({...common,eyeContact:"source-sculpt"});
    expect(inspectCrayonScene(spec)).toEqual([]);
    const markup=renderToStaticMarkup(<CrayonScene spec={spec} frame={299}/>);
    expect(markup).toContain('data-km-crayon-scene');
    for(const id of CRAYON_F1_TARSAL_SCULPT_ADDITIONS)
      expect(markup).toContain('data-km-crayon-element="'+id+'"');
    expect(markup).toContain('data-km-crayon-underpaint="opaque"');
    expect(markup).toContain('data-km-crayon-fiber-contact="dry-wax"');
    expect(markup).not.toContain("<image ");
  },20_000);
});
