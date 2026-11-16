import {describe,expect,it} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {CrayonScene} from "../registry/video/materials/crayon-scene-react";
import {inspectCrayonScene} from "../registry/video/materials/crayon-scene";
import {crayonCc0FaceStudy} from "../src/video/crayon-artcraft-cc0-face";
import {crayonF1SculptOralOcclusion,CRAYON_F1_ORAL_SCULPT_IDS}
  from "../src/video/crayon-artcraft-f1-oral-sculpt";

const altered=new Set<string>(CRAYON_F1_ORAL_SCULPT_IDS);
const parts=["dental-surface-left","dental-surface-center","dental-surface-far"];

describe("ArtCraft F1 V16 native upper-lip / dental source-depth topology",()=>{
  it("keeps all previous CC0 modes and all non-oral wax byte-for-byte",()=>{
    const previous=crayonCc0FaceStudy({midfaceForm:"source-oral"});
    const scene=crayonCc0FaceStudy({midfaceForm:"source-oral-sculpt"});
    expect(scene.width).toBe(608);
    expect(scene.height).toBe(1082);
    expect(scene.durationFrames).toBe(300);
    expect(scene.seed).toBe(previous.seed);
    expect(scene.paper).toBe(previous.paper);
    expect(scene.paperTooth).toBe(previous.paperTooth);
    expect(scene.camera).toEqual(previous.camera);
    expect(scene.elements.length).toBe(previous.elements.length+1);
    expect(scene.elements.filter(e=>!altered.has(e.id)))
      .toEqual(previous.elements.filter(e=>!altered.has(e.id)));
    expect(new Set(scene.elements.map(e=>e.id)).size).toBe(scene.elements.length);
    expect(inspectCrayonScene(previous)).toEqual([]);
    expect(inspectCrayonScene(scene)).toEqual([]);
    for(const id of CRAYON_F1_ORAL_SCULPT_IDS){
      if(id==="upper-vermilion-incisor-overhang")continue;
      const before=previous.elements.find(e=>e.id===id);
      const after=scene.elements.find(e=>e.id===id);
      if(before?.kind!=="wax"||after?.kind!=="wax")
        throw Error("Missing native source wax "+id);
      expect(after.timing).toEqual(before.timing);
      expect(after.parentId).toBe(before.parentId);
      expect(after.d).not.toBe(before.d);
    }
  });

  it("deposits an anatomically clipped vermilion ledge over the 3 teeth, before lower lip",()=>{
    const scene=crayonCc0FaceStudy({midfaceForm:"source-oral-sculpt"});
    const elems=scene.elements,ids=elems.map(e=>e.id);
    const shelf=elems.find(e=>e.id==="upper-vermilion-incisor-overhang");
    expect(shelf).toMatchObject({
      kind:"wax",coverage:"open",deposition:"stroke-built",
      parentId:"mouth-aperture-depth",clipToParent:true,
      featherContacts:true,timing:{start:231,end:295},
    });
    if(shelf?.kind!=="wax")throw Error("Missing wax overhang");
    expect(shelf.d).toMatch(/M.*C.*Z/);
    expect(shelf.pressure).toBeLessThan(.7);
    expect(shelf.markStrength).toBeLessThan(.2);
    for(const id of parts){
      expect(ids.indexOf(id)).toBeLessThan(ids.indexOf(shelf.id));
      const tooth=elems.find(e=>e.id===id);
      if(tooth?.kind!=="wax")throw Error("Missing tooth "+id);
      expect(tooth.parentId).toBe("mouth-aperture-depth");
      expect(tooth.underpaintGradient).toBeDefined();
      expect(tooth.colors[1]).not.toBe(tooth.colors[2]);
      // Explicit source-projected overlap is necessary, not sufficient:
      // live pixels must still be visually reviewed for true occlusion.
      const left=Math.max(tooth.bounds.x,shelf.bounds.x);
      const right=Math.min(tooth.bounds.x+tooth.bounds.width,
        shelf.bounds.x+shelf.bounds.width);
      const top=Math.max(tooth.bounds.y,shelf.bounds.y);
      const bottom=Math.min(tooth.bounds.y+tooth.bounds.height,
        shelf.bounds.y+shelf.bounds.height);
      expect(right-left).toBeGreaterThan(12);
      expect(bottom-top).toBeGreaterThan(8);
    }
    expect(ids.indexOf(shelf.id)).toBeLessThan(ids.indexOf("lip-lower-body-wax"));
    const inner=elems.find(e=>e.id==="lip-lower-body-wax");
    const outer=elems.find(e=>e.id==="lip-lower");
    if(inner?.kind!=="wax"||outer?.kind!=="wax")
      throw Error("Missing lower lip volume layers");
    expect(inner.coverage).toBe("opaque");
    expect(outer.coverage).toBe("open");
    expect(inner.bounds.height).toBeLessThan(outer.bounds.height);
    expect(outer.featherContacts).toBe(true);
  });

  it("rejects absent, duplicate and malformed anatomy without changing old control",()=>{
    const v15=crayonCc0FaceStudy({midfaceForm:"source-oral"});
    const newScene=crayonCc0FaceStudy({midfaceForm:"source-oral-sculpt"});
    expect(crayonCc0FaceStudy({midfaceForm:"baseline"}))
      .toEqual(crayonCc0FaceStudy());
    expect(v15.elements.find(e=>e.id==="upper-vermilion-incisor-overhang"))
      .toBeUndefined();
    expect(newScene.elements.find(e=>e.id==="upper-vermilion-incisor-overhang"))
      .toBeDefined();
    const center=v15.elements.find(e=>e.id==="dental-surface-center");
    if(!center)throw Error("Missing old source tooth");
    expect(()=>crayonF1SculptOralOcclusion(
      v15.elements.filter(e=>e.id!=="dental-surface-center"),
    )).toThrow(RangeError);
    expect(()=>crayonF1SculptOralOcclusion([...v15.elements,center]))
      .toThrow(RangeError);
    expect(()=>crayonF1SculptOralOcclusion(newScene.elements))
      .toThrow(RangeError);
    expect(()=>crayonCc0FaceStudy({midfaceForm:"bad" as "baseline"}))
      .toThrow(RangeError);
  });

  it("renders the actual CRAYON1 wax and timing, not a source photo or digital overlay",()=>{
    const spec=crayonCc0FaceStudy({midfaceForm:"source-oral-sculpt"});
    const html=renderToStaticMarkup(<CrayonScene spec={spec} frame={299}/>);
    expect(html).toContain(
      'data-km-crayon-element="upper-vermilion-incisor-overhang"');
    expect(html).toContain(
      'data-km-crayon-feather-contacts="open-wax"');
    expect(html).not.toContain("<image");
  });
});
