import {describe,expect,it} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {CrayonScene} from "../registry/video/materials/crayon-scene-react";
import {inspectCrayonScene} from "../registry/video/materials/crayon-scene";
import {crayonCc0FaceStudy} from "../src/video/crayon-artcraft-cc0-face";
import {CRAYON_F1_NASAL_DEPTH_IDS,crayonF1BuildNasalWaxDepth}
  from "../src/video/crayon-artcraft-f1-nasal-depth";

const inserts=new Set<string>(CRAYON_F1_NASAL_DEPTH_IDS);

describe("ArtCraft V18 source-observed nose / native wax volume and occlusion",()=>{
  it("retains the entire V17 source drawing, camera, 300-frame acting and controls",()=>{
    const prev=crayonCc0FaceStudy({midfaceForm:"source-nose-sculpt"});
    const next=crayonCc0FaceStudy({midfaceForm:"source-nasal-depth"});
    expect(next.width).toBe(608);
    expect(next.height).toBe(1082);
    expect(next.seed).toBe(prev.seed);
    expect(next.paper).toEqual(prev.paper);
    expect(next.paperTooth).toBe(prev.paperTooth);
    expect(next.camera).toEqual(prev.camera);
    expect(next.durationFrames).toBe(prev.durationFrames);
    expect(next.elements.length).toBe(prev.elements.length+7);
    expect(next.elements.filter(e=>!inserts.has(e.id)&&e.id!=="naris-shadow-far"))
      .toEqual(prev.elements.filter(e=>e.id!=="naris-shadow-far"));
    const oldFar=prev.elements.find(e=>e.id==="naris-shadow-far");
    const newFar=next.elements.find(e=>e.id==="naris-shadow-far");
    if(oldFar?.kind!=="wax"||newFar?.kind!=="wax")
      throw Error("Source far naris missing");
    expect(newFar.d).not.toBe(oldFar.d);
    expect(newFar.timing).toEqual(oldFar.timing);
    expect(newFar.parentId).toEqual(oldFar.parentId);
    expect(new Set(next.elements.map(e=>e.id)).size).toBe(next.elements.length);
    expect(inspectCrayonScene(prev)).toEqual([]);
    expect(inspectCrayonScene(next)).toEqual([]);
  });

  it("lays down asymmetric feathered alar wax and curved hood after each cavity",()=>{
    const spec=crayonCc0FaceStudy({midfaceForm:"source-nasal-depth"});
    const all=spec.elements,ids=all.map(x=>x.id);
    for(const side of ["near","far"] as const){
      const mass=all.find(e=>e.id==="nasal-sidewall-"+side+"-underpaint");
      const root=all.find(e=>e.id==="nasal-alar-attachment-"+side);
      const dark=all.find(e=>e.id==="naris-shadow-"+side);
      const hood=all.find(e=>e.id==="nasal-hood-"+side+"-occluder");
      const contact=all.find(e=>e.id==="nasal-hood-"+side+"-dry-contact");
      if(mass?.kind!=="wax"||root?.kind!=="wax"||
         dark?.kind!=="wax"||hood?.kind!=="wax"||contact?.kind!=="wax")
        throw Error("Missing coupled source nasal wax for "+side);
      expect(ids.indexOf(mass.id)).toBeLessThan(ids.indexOf(root.id));
      expect(ids.indexOf(root.id)).toBeLessThan(ids.indexOf(dark.id));
      expect(ids.indexOf(dark.id)).toBeLessThan(ids.indexOf(hood.id));
      expect(ids.indexOf(hood.id)).toBeLessThan(ids.indexOf(contact.id));
      expect(mass).toMatchObject({
        parentId:"face-outline",clipToParent:true,coverage:"open",
        deposition:"stroke-built",featherContacts:true,outlineOpacity:0,
      });
      expect(hood).toMatchObject({
        parentId:"face-outline",clipToParent:true,coverage:"open",
        deposition:"stroke-built",featherContacts:true,outlineOpacity:0,
      });
      expect(contact).toMatchObject({
        parentId:"face-outline",clipToParent:true,coverage:"open",
        deposition:"stroke-built",featherContacts:true,
      });
      for(const node of [mass,hood]){
        expect(node.underpaintGradient).toBeUndefined();
        expect(node.opaqueBurnish).toBeUndefined();
        expect(node.underpaintTooth).toBeUndefined();
        expect(node.blendRadius).toBeGreaterThan(3);
        expect(node.nibStyle).toBe("dry");
        expect(node.markStrength).toBeGreaterThan(.2);
      }
      // Pressure-rooted contact must geometrically meet the real dark cavity;
      // a bounding-box overlap is only a preliminary test, NOT art approval.
      const overlap=(a:typeof mass,b:typeof mass)=>{
        const dx=Math.max(0,Math.min(a.bounds.x+a.bounds.width,
          b.bounds.x+b.bounds.width)-Math.max(a.bounds.x,b.bounds.x));
        const dy=Math.max(0,Math.min(a.bounds.y+a.bounds.height,
          b.bounds.y+b.bounds.height)-Math.max(a.bounds.y,b.bounds.y));
        return dx*dy;
      };
      expect(overlap(mass,dark)).toBeGreaterThan(380);
      expect(overlap(hood,dark)).toBeGreaterThan(80);
      expect(hood.d).toContain("C");
      expect(contact.d).toContain("C");
    }
    const near=all.find(e=>e.id==="nasal-sidewall-near-underpaint");
    const far=all.find(e=>e.id==="nasal-sidewall-far-underpaint");
    if(near?.kind!=="wax"||far?.kind!=="wax")
      throw Error("Missing independent alar volumes");
    expect(near.bounds.width).toBeGreaterThan(far.bounds.width);
    expect(near.colors).not.toEqual(far.colors);
    const septum=all.find(e=>e.id==="nasal-columella-attached-turn");
    expect(septum).toMatchObject({kind:"wax",coverage:"open",
      parentId:"face-outline",clipToParent:true,featherContacts:true});
    expect(ids.indexOf(septum?.id??"")).toBeLessThan(
      ids.indexOf("naris-shadow-near"));
  });

  it("fails closed on absent, duplicated, or already depth-sculpted anatomical anchors",()=>{
    const prev=crayonCc0FaceStudy({midfaceForm:"source-nose-sculpt"});
    const next=crayonCc0FaceStudy({midfaceForm:"source-nasal-depth"});
    const shadow=prev.elements.find(e=>e.id==="naris-shadow-near");
    if(!shadow)throw Error("Missing source reference shadow");
    expect(()=>crayonF1BuildNasalWaxDepth(
      prev.elements.filter(e=>e.id!=="naris-shadow-near"),
    )).toThrow(RangeError);
    expect(()=>crayonF1BuildNasalWaxDepth([...prev.elements,shadow]))
      .toThrow(RangeError);
    expect(()=>crayonF1BuildNasalWaxDepth(next.elements)).toThrow(RangeError);
    expect(()=>crayonCc0FaceStudy({midfaceForm:"fake" as "baseline"}))
      .toThrow(RangeError);
    expect(crayonCc0FaceStudy()).toEqual(
      crayonCc0FaceStudy({midfaceForm:"baseline"}));
  });

  it("paints actual CRAYON1 wax, not source photo overlaid on a vector face",()=>{
    const scene=crayonCc0FaceStudy({midfaceForm:"source-nasal-depth"});
    const html=renderToStaticMarkup(<CrayonScene spec={scene} frame={299}/>);
    for(const id of CRAYON_F1_NASAL_DEPTH_IDS)
      expect(html).toContain('data-km-crayon-element="'+id+'"');
    expect(html).toContain('data-km-crayon-underpaint-gradient');
    expect(html).toContain('data-km-crayon-feather-contacts="open-wax"');
    expect(html).not.toContain("<image");
  });
});
