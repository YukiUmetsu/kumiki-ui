import {describe,expect,it} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {CrayonScene} from "../registry/video/materials/crayon-scene-react";
import {inspectCrayonScene} from "../registry/video/materials/crayon-scene";
import {crayonCc0FaceStudy} from "../src/video/crayon-artcraft-cc0-face";
import {CRAYON_F1_NOSE_SCULPT_IDS,crayonF1SculptNasalCartilage}
  from "../src/video/crayon-artcraft-f1-nose-sculpt";

const changed=new Set<string>(CRAYON_F1_NOSE_SCULPT_IDS);

describe("ArtCraft F1 V17 source-projected human nasal cartilage, no circles",()=>{
  it("preserves previous V16 and every unrelated human face wax exactly",()=>{
    const before=crayonCc0FaceStudy({midfaceForm:"source-oral-sculpt"});
    const after=crayonCc0FaceStudy({midfaceForm:"source-nose-sculpt"});
    expect(after.seed).toBe(before.seed);
    expect(after.paper).toEqual(before.paper);
    expect(after.paperTooth).toEqual(before.paperTooth);
    expect(after.durationFrames).toBe(before.durationFrames);
    expect(after.camera).toEqual(before.camera);
    expect(after.elements.length).toBe(before.elements.length);
    expect(after.elements.filter(e=>!changed.has(e.id)))
      .toEqual(before.elements.filter(e=>!changed.has(e.id)));
    expect(new Set(after.elements.map(e=>e.id)).size).toBe(after.elements.length);
    expect(inspectCrayonScene(before)).toEqual([]);
    expect(inspectCrayonScene(after)).toEqual([]);
    for(const id of CRAYON_F1_NOSE_SCULPT_IDS){
      const b=before.elements.find(e=>e.id===id);
      const a=after.elements.find(e=>e.id===id);
      if(b?.kind!=="wax"||a?.kind!=="wax")
        throw Error("Missing CC0 nose shape "+id);
      expect(a.timing).toEqual(b.timing);
      expect(a.parentId).toEqual(b.parentId);
      expect(a.d).not.toEqual(b.d);
      expect(a.d).toContain("C");
    }
  });

  it("forms asymmetrically nested tip, alar roofs, septal plane and hooked shadows",()=>{
    const elements=crayonCc0FaceStudy({midfaceForm:"source-nose-sculpt"}).elements;
    const get=(id:string)=>elements.find(e=>e.id===id);
    const tip=get("nose-tip");
    if(tip?.kind!=="wax")throw Error("Missing nose bone/tip");
    expect(tip.bounds.height).toBeGreaterThan(70);
    expect(tip.coverage).toBe("open");
    expect(tip.featherContacts).toBe(true);
    const narisNear=get("naris-shadow-near");
    const narisFar=get("naris-shadow-far");
    if(narisNear?.kind!=="wax"||narisFar?.kind!=="wax")
      throw Error("Missing nostril cavities");
    expect(narisNear.coverage).toBe("opaque");
    expect(narisFar.coverage).toBe("opaque");
    expect(narisNear.bounds.width).toBeGreaterThan(narisFar.bounds.width);
    expect(narisNear.d).not.toEqual(narisFar.d);
    expect(narisNear.underpaintGradient?.shadow)
      .not.toEqual(narisFar.underpaintGradient?.shadow);
    for(const side of ["near","far"] as const){
      const shadow=get("naris-shadow-"+side);
      const roof=get("alar-roof-"+side);
      const septum=get("alar-septum-"+side);
      const parent=get("nasal-alar-attachment-"+side);
      for(const e of [roof,septum,parent]){
        expect(e).toMatchObject({kind:"wax",coverage:"open",
          parentId:"face-outline",clipToParent:true,featherContacts:true});
        if(e?.kind!=="wax")throw Error("Broken cartilage: "+side);
        expect(e.pressure).toBeLessThan(.6);
        expect(e.blendRadius).toBeGreaterThan(6);
      }
      if(shadow?.kind!=="wax"||roof?.kind!=="wax"||
        septum?.kind!=="wax")throw Error("Missing topological partners");
      const intersection=(a:typeof shadow,b:typeof roof)=>
        (Math.min(a.bounds.x+a.bounds.width,b.bounds.x+b.bounds.width)-
          Math.max(a.bounds.x,b.bounds.x))*
        (Math.min(a.bounds.y+a.bounds.height,b.bounds.y+b.bounds.height)-
          Math.max(a.bounds.y,b.bounds.y));
      expect(intersection(shadow,roof)).toBeGreaterThan(100);
      expect(intersection(shadow,septum)).toBeGreaterThan(50);
      expect(roof.d).not.toEqual(septum.d);
      expect(shadow.colors[1]).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it("rejects missing, duplicated and unauthorized modes and retains negative controls",()=>{
    const previous=crayonCc0FaceStudy({midfaceForm:"source-oral-sculpt"});
    const sample=previous.elements.find(e=>e.id==="naris-shadow-near");
    if(!sample)throw Error("Missing prior nasal node");
    expect(()=>crayonF1SculptNasalCartilage(
      previous.elements.filter(e=>e.id!=="naris-shadow-near"),
    )).toThrow(RangeError);
    expect(()=>crayonF1SculptNasalCartilage([...previous.elements,sample]))
      .toThrow(RangeError);
    expect(()=>crayonCc0FaceStudy({midfaceForm:"fake" as "baseline"}))
      .toThrow(RangeError);
    expect(crayonCc0FaceStudy())
      .toEqual(crayonCc0FaceStudy({midfaceForm:"baseline"}));
    expect(crayonCc0FaceStudy({midfaceForm:"source-nose-sculpt"}).elements
      .filter(e=>e.id==="upper-vermilion-incisor-overhang"))
      .toEqual(previous.elements
        .filter(e=>e.id==="upper-vermilion-incisor-overhang"));
  });

  it("renders true paper-based native CRAYON1 without imported source pixels",()=>{
    const spec=crayonCc0FaceStudy({midfaceForm:"source-nose-sculpt"});
    const html=renderToStaticMarkup(<CrayonScene spec={spec} frame={299}/>);
    for(const id of CRAYON_F1_NOSE_SCULPT_IDS)
      expect(html).toContain('data-km-crayon-element="'+id+'"');
    expect(html).toContain('data-km-crayon-feather-contacts="open-wax"');
    expect(html).toContain('data-km-crayon-underpaint-gradient');
    expect(html).not.toContain("<image");
  });
});
