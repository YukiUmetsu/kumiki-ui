import {describe,expect,it} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {CrayonScene} from "../registry/video/materials/crayon-scene-react";
import {inspectCrayonScene} from "../registry/video/materials/crayon-scene";
import {crayonCc0FaceStudy} from "../src/video/crayon-artcraft-cc0-face";
import {
  CRAYON_F1_ORAL_FIDELITY_IDS,crayonF1ReconstructOralContact,
} from "../src/video/crayon-artcraft-f1-oral-fidelity";

const reviewed=new Set<string>([
  ...CRAYON_F1_ORAL_FIDELITY_IDS,"lip-lower-wax-ribs",
]);

describe("ArtCraft F1 source-oral V14 / native wax fidelity experiment",()=>{
  it("changes only registered oral shapes; preserves original face/anatomy/acting and all negative controls",()=>{
    const previous=crayonCc0FaceStudy({midfaceForm:"source-alar"});
    const candidate=crayonCc0FaceStudy({midfaceForm:"source-oral"});
    expect(candidate.seed).toBe(previous.seed);
    expect(candidate.camera).toEqual(previous.camera);
    expect(candidate.durationFrames).toBe(previous.durationFrames);
    expect(candidate.paper).toBe(previous.paper);
    expect(candidate.paperTooth).toBe(previous.paperTooth);
    expect(candidate.elements.length).toBe(previous.elements.length);
    expect(candidate.elements.filter(e=>!reviewed.has(e.id)))
      .toEqual(previous.elements.filter(e=>!reviewed.has(e.id)));
    expect(new Set(candidate.elements.map(e=>e.id)).size).toBe(candidate.elements.length);
    expect(inspectCrayonScene(previous)).toEqual([]);
    expect(inspectCrayonScene(candidate)).toEqual([]);
    for(const id of reviewed){
      const before=previous.elements.find(e=>e.id===id);
      const after=candidate.elements.find(e=>e.id===id);
      if(!before||!after)throw Error("Missing source lip layer "+id);
      expect(after.d).not.toBe(before.d);
      expect(after.parentId).toBe(before.parentId);
      expect(after.timing).toEqual(before.timing);
      expect(after.kind).toBe(before.kind);
    }
  });

  it("preserves source three-dimensional lip-to-mouth paint order, warm tooth occlusion and unequal curvature",()=>{
    const elements=crayonCc0FaceStudy({midfaceForm:"source-oral"}).elements;
    const ids=elements.map(e=>e.id);
    const get=(id:string)=>elements.find(e=>e.id===id);
    const order=[
      "lip-upper-body-wax","lip-upper","labial-upper-value",
      "oral-opening","mouth-aperture-depth",
      "dental-arch-connected-wax","dental-surface-center",
      "lip-lower-body-wax","lip-lower","labial-lower-value",
    ];
    for(let i=1;i<order.length;i++)
      expect(ids.indexOf(order[i-1])).toBeLessThan(ids.indexOf(order[i]));
    const upper=get("lip-upper-body-wax"),lower=get("lip-lower-body-wax");
    const cavity=get("mouth-aperture-depth");
    const upperCore=get("labial-upper-value"),lowerCore=get("labial-lower-value");
    for(const e of [upper,lower,cavity]){
      expect(e).toMatchObject({kind:"wax",coverage:"opaque",
        parentId:e===cavity?"oral-opening":"face-outline",
        clipToParent:true,deposition:"stroke-built"});
      if(e?.kind!=="wax")throw Error("Missing opaque source oral underpaint");
      expect(e.underpaintTooth).toBeGreaterThan(0);
      expect(e.underpaintGradient).toBeDefined();
    }
    for(const e of [upperCore,lowerCore]){
      expect(e).toMatchObject({kind:"wax",coverage:"open",
        featherContacts:true,clipToParent:true});
    }
    if(upper?.kind!=="wax"||lower?.kind!=="wax"||
       cavity?.kind!=="wax")throw Error("Broken mouth volume");
    expect(upper.bounds.y).toBeLessThan(cavity.bounds.y);
    expect(lower.bounds.y+lower.bounds.height).toBeGreaterThan(cavity.bounds.y+20);
    expect(upper.bounds.height).toBeGreaterThan(65);
    expect(cavity.bounds.height).toBeLessThanOrEqual(48);
    expect(lower.colors).not.toEqual(upper.colors);
    expect(cavity.colors[1]).toMatch(/^#[12][0-9a-f]{5}$/i);
    const dental=["dental-surface-left","dental-surface-center",
      "dental-surface-far"];
    for(const id of dental){
      const e=get(id);
      expect(e).toMatchObject({kind:"wax",
        parentId:"mouth-aperture-depth",clipToParent:true,
        coverage:"opaque",deposition:"stroke-built"});
      if(e?.kind!=="wax")throw Error("Missing tooth root "+id);
      expect(e.bounds.width).toBeLessThan(36);
      expect(e.bounds.height).toBeLessThan(25);
      expect(e.colors[2]).not.toBe("#ffffff");
      expect(e.underpaintTooth).toBeGreaterThan(0);
    }
    const waxRibs=get("lip-lower-wax-ribs");
    if(waxRibs?.kind!=="contour")throw Error("No native lip wax fibers");
    expect(waxRibs.d.match(/M/g)).toHaveLength(10);
    expect(waxRibs.d.match(/C/g)).toHaveLength(10);
    expect(waxRibs.waxContact).toBe("dry-wax");
    expect(waxRibs.parentId).toBe("lip-lower");
  });

  it("never promotes the rejected previous form; rejects missing or duplicate mouth anatomy",()=>{
    const defaultScene=crayonCc0FaceStudy();
    expect(defaultScene).toEqual(crayonCc0FaceStudy({midfaceForm:"baseline"}));
    expect(defaultScene.elements.some(e=>e.id==="dental-arch-connected-wax")).toBe(false);
    const old=crayonCc0FaceStudy({midfaceForm:"source-alar"});
    const updated=crayonCc0FaceStudy({midfaceForm:"source-oral"});
    expect(old.elements.find(e=>e.id==="lip-upper")?.d)
      .not.toEqual(updated.elements.find(e=>e.id==="lip-upper")?.d);
    expect(()=>crayonCc0FaceStudy({midfaceForm:"fake" as "baseline"}))
      .toThrow(RangeError);
    const upper=old.elements.find(e=>e.id==="lip-upper");
    if(!upper)throw Error("Missing source vermilion anchor");
    expect(()=>crayonF1ReconstructOralContact(
      old.elements.filter(e=>e.id!=="lip-upper"),
    )).toThrow(RangeError);
    expect(()=>crayonF1ReconstructOralContact([...old.elements,upper]))
      .toThrow(RangeError);
  });

  it("keeps 1x and 3x original CRAYON1 rendered wax and no photo-compositing shortcut",()=>{
    const spec=crayonCc0FaceStudy({midfaceForm:"source-oral"});
    const html=renderToStaticMarkup(<CrayonScene spec={spec} frame={299}/>);
    for(const id of CRAYON_F1_ORAL_FIDELITY_IDS)
      expect(html).toContain('data-km-crayon-element="'+id+'"');
    expect(html).toContain('data-km-crayon-element="lip-lower-wax-ribs"');
    expect(html).toContain('data-km-crayon-fiber-contact="dry-wax"');
    expect(html).not.toContain("<image");
  });
});
