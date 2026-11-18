import {describe,it,expect} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {CrayonScene} from "../registry/video/materials/crayon-scene-react";
import {inspectCrayonScene} from "../registry/video/materials/crayon-scene";
import type {CrayonElement} from "../registry/video/materials/crayon-scene";
import {crayonCc0FaceStudy} from "../src/video/crayon-artcraft-cc0-face";
import {CRAYON_F1_V29_ORBITAL_IDS,crayonF1RebuildOrbitalHood}
  from "../src/video/crayon-artcraft-f1-orbital-hood";
import {Cc0OrbitalHoodV29}
  from "../src/video/crayon-artcraft-adult-face.stories";

const find=(all:readonly CrayonElement[],id:string)=>all.find(el=>el.id===id);

describe("ArtCraft F1 V29 continuous source-registered upper orbital wax",()=>{
  const ids=new Set<string>(CRAYON_F1_V29_ORBITAL_IDS);
  it("replaces two eye-discs, retains all other independently authored facial layers",()=>{
    const old=crayonCc0FaceStudy({midfaceForm:"source-face-values"});
    const next=crayonCc0FaceStudy({midfaceForm:"source-orbital-hood"});
    expect(inspectCrayonScene(old)).toEqual([]);
    expect(inspectCrayonScene(next)).toEqual([]);
    for(const k of ["width","height","durationFrames","seed","paper",
      "paperTooth","camera"] as const)expect(next[k]).toEqual(old[k]);
    expect(next.elements).toHaveLength(old.elements.length);
    expect(next.elements.filter(el=>!ids.has(el.id))).toEqual(
      old.elements.filter(el=>!ids.has(el.id)));
    for(const id of ids){
      const before=find(old.elements,id),after=find(next.elements,id);
      if(before?.kind!=="wax"||after?.kind!=="wax")throw Error(id);
      expect(after.d).not.toBe(before.d);
      expect(after.d.match(/C/g)?.length).toBeGreaterThanOrEqual(6);
      expect(after.d).toMatch(/^M[\d.\s]+C.*Z$/);
      expect(after.parentId).toBe("face-outline");
      expect(after.clipToParent).toBe(true);
      expect(after.timing).toEqual(before.timing);
      expect(after.pivot).toEqual(before.pivot);
      expect(after.motion).toEqual(before.motion);
      expect(after.coverage).toBe("opaque");
      expect(after.featherContacts).toBe(true);
      expect(after.deposition).toBe("stroke-built");
      expect(after.nibStyle).toBe("dry");
      expect(after.underpaintGradient).toBeDefined();
      expect(after.underpaintTooth).toBeGreaterThan(0);
      expect(after.blendRadius).toBeGreaterThan(12);
      expect(after.markStrength).toBeGreaterThan(0);
      expect(after.opaqueBurnish).toBeGreaterThan(0);
      expect(after.outlineOpacity).toBe(0);
    }
  });
  it("has compressed, non-mirrored near/far hood topology and bounded wax",()=>{
    const scene=crayonCc0FaceStudy({midfaceForm:"source-orbital-hood"});
    const near=find(scene.elements,"socket-near"),far=find(scene.elements,"socket-far");
    if(near?.kind!=="wax"||far?.kind!=="wax")throw Error("No original socket wax");
    expect(near.bounds.width).toBeGreaterThan(far.bounds.width*1.25);
    expect(near.bounds.height).toBeGreaterThan(far.bounds.height);
    expect(near.angle).not.toBe(far.angle);
    expect(near.d).not.toBe(far.d);
    // Upper eye hood is a continuous tapered mass, not a symmetrical oval.
    expect(near.d.match(/M/g)).toHaveLength(1);
    expect(far.d.match(/M/g)).toHaveLength(1);
  });
  it("fails closed on missing, duplicate, wrong-kind and reapplied orbital source",()=>{
    const old=crayonCc0FaceStudy({midfaceForm:"source-face-values"});
    const current=crayonCc0FaceStudy({midfaceForm:"source-orbital-hood"});
    const near=find(old.elements,"socket-near");
    if(!near)throw Error("No near eye");
    expect(()=>crayonF1RebuildOrbitalHood(old.elements.filter(el=>
      el.id!=="socket-near"))).toThrow(RangeError);
    expect(()=>crayonF1RebuildOrbitalHood([...old.elements,near])).toThrow(RangeError);
    expect(()=>crayonF1RebuildOrbitalHood(current.elements)).toThrow(RangeError);
    expect(()=>crayonF1RebuildOrbitalHood(old.elements.map(el=>el.id==="socket-near"?
      {...el,kind:"contour"} as CrayonElement:el))).toThrow(RangeError);
  });
  it("keeps original 300-frame native material and quarantine Storybook",()=>{
    const a=crayonCc0FaceStudy({midfaceForm:"source-orbital-hood"});
    expect(a.durationFrames).toBe(300);
    expect(Cc0OrbitalHoodV29.name).toContain("!dev");
    for(const frame of [0,150,299]){
      const markup=renderToStaticMarkup(<CrayonScene spec={a} frame={frame}/>);
      if(frame===299)for(const id of ids)
        expect(markup).toContain('data-km-crayon-element="'+id+'"');
      if(frame===299)expect(markup).toContain("data-km-crayon-paper-contact-wax");
      expect(markup).not.toContain("<image");
      expect(markup).not.toContain("<foreignObject");
    }
  },25_000);
});
