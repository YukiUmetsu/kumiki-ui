import {describe,expect,it} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {CrayonScene} from "../registry/video/materials/crayon-scene-react";
import {inspectCrayonScene} from "../registry/video/materials/crayon-scene";
import {crayonCc0FaceStudy} from "../src/video/crayon-artcraft-cc0-face";
import {crayonF1ConnectAlarUndercuts,CRAYON_F1_ALAR_CONTINUITY_IDS}
  from "../src/video/crayon-artcraft-f1-alar-continuity";

const changed=new Set<string>([
  ...CRAYON_F1_ALAR_CONTINUITY_IDS,
  "naris-shadow-near","naris-shadow-far",
]);

describe("ArtCraft F1 source-specific nasal cartilage and naris research",()=>{
  it("preserves every previous midface element not explicitly studied",()=>{
    const previous=crayonCc0FaceStudy({midfaceForm:"source-volume"});
    const next=crayonCc0FaceStudy({midfaceForm:"source-alar"});
    expect(next.seed).toBe(previous.seed);
    expect(next.paper).toBe(previous.paper);
    expect(next.paperTooth).toBe(previous.paperTooth);
    expect(next.camera).toEqual(previous.camera);
    expect(next.durationFrames).toBe(previous.durationFrames);
    expect(next.elements.length).toBe(previous.elements.length+4);
    expect(next.elements.filter(e=>!changed.has(e.id)))
      .toEqual(previous.elements.filter(e=>!changed.has(e.id)));
    expect(new Set(next.elements.map(e=>e.id)).size).toBe(next.elements.length);
    expect(inspectCrayonScene(previous)).toEqual([]);
    expect(inspectCrayonScene(next)).toEqual([]);
  });
  it("creates separate non-mirrored wax bridges, then naris cavities in real paint order",()=>{
    const elements=crayonCc0FaceStudy({midfaceForm:"source-alar"}).elements;
    const ids=elements.map(e=>e.id);
    for(const side of ["near","far"] as const){
      const roof=elements.find(e=>e.id==="alar-roof-"+side);
      const septum=elements.find(e=>e.id==="alar-septum-"+side);
      const naris=elements.find(e=>e.id==="naris-shadow-"+side);
      for(const el of [roof,septum]){
        expect(el).toMatchObject({
          kind:"wax",parentId:"face-outline",clipToParent:true,
          coverage:"open",deposition:"stroke-built",
          featherContacts:true,outlineOpacity:0,nibStyle:"dry",
        });
        if(el?.kind!=="wax")throw new Error("Missing CRAYON1 nasal wax");
        expect(el.d).toContain("C");
        expect(el.pressure).toBeGreaterThan(.4);
        expect(el.markStrength).toBeLessThan(.3);
        expect(el.blendRadius).toBeGreaterThan(5);
      }
      expect(naris).toMatchObject({
        kind:"wax",parentId:"face-outline",
        clipToParent:true,coverage:"opaque",deposition:"stroke-built",
      });
      if(roof?.kind!=="wax"||septum?.kind!=="wax"||naris?.kind!=="wax")
        throw new Error("Missing coupled alar volumes");
      expect(ids.indexOf("alar-roof-"+side))
        .toBeLessThan(ids.indexOf("alar-septum-"+side));
      expect(ids.indexOf("alar-septum-"+side))
        .toBeLessThan(ids.indexOf("naris-shadow-"+side));
      // A nostril must overlap the same-cartilage roof and septal wax
      // in source projection, not be an isolated independent symbol.
      for(const plane of [roof,septum]){
        const left=Math.max(plane.bounds.x,naris.bounds.x);
        const right=Math.min(plane.bounds.x+plane.bounds.width,
          naris.bounds.x+naris.bounds.width);
        const top=Math.max(plane.bounds.y,naris.bounds.y);
        const bottom=Math.min(plane.bounds.y+plane.bounds.height,
          naris.bounds.y+naris.bounds.height);
        expect(right-left).toBeGreaterThan(8);
        expect(bottom-top).toBeGreaterThan(12);
      }
      expect(naris.underpaintTooth).toBeGreaterThan(0);
      expect(naris.colors[1]).toMatch(/^#[0-9a-f]{6}$/i);
    }
    const near=elements.find(e=>e.id==="naris-shadow-near");
    const far=elements.find(e=>e.id==="naris-shadow-far");
    if(near?.kind!=="wax"||far?.kind!=="wax")throw Error("Missing naris");
    expect(near.bounds.width).toBeGreaterThan(far.bounds.width);
    expect(near.d).not.toBe(far.d);
    expect(inspectCrayonScene(crayonCc0FaceStudy({
      midfaceForm:"source-alar",detail:.2,view:"anatomy",
    }))).toEqual([]);
  });
  it("keeps prior negative controls identical, and fails closed on corrupt anchors",()=>{
    const baseline=crayonCc0FaceStudy({midfaceForm:"baseline"});
    const source=crayonCc0FaceStudy({midfaceForm:"source-volume"});
    const candidate=crayonCc0FaceStudy({midfaceForm:"source-alar"});
    expect(baseline.elements.some(e=>e.id==="alar-roof-near")).toBe(false);
    expect(source.elements.some(e=>e.id==="alar-roof-near")).toBe(false);
    expect(candidate.elements.some(e=>e.id==="alar-roof-near")).toBe(true);
    expect(()=>crayonCc0FaceStudy({midfaceForm:"untrusted" as "baseline"}))
      .toThrow(RangeError);
    const near=source.elements.find(e=>e.id==="naris-shadow-near");
    if(!near)throw Error("Missing source root");
    expect(()=>crayonF1ConnectAlarUndercuts(
      source.elements.filter(e=>e.id!=="naris-shadow-near"),
    )).toThrow(RangeError);
    expect(()=>crayonF1ConnectAlarUndercuts([...source.elements,near]))
      .toThrow(RangeError);
  });
  it("renders actual CRAYON1 wax without photo overlays",()=>{
    const spec=crayonCc0FaceStudy({midfaceForm:"source-alar"});
    const html=renderToStaticMarkup(<CrayonScene spec={spec} frame={299}/>);
    for(const id of CRAYON_F1_ALAR_CONTINUITY_IDS)
      expect(html).toContain('data-km-crayon-element="'+id+'"');
    expect(html).toContain('data-km-crayon-feather-contacts="open-wax"');
    expect(html).not.toContain("<image");
  });
});
