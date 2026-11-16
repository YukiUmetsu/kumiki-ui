import {describe,it,expect} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {CrayonScene} from "../registry/video/materials/crayon-scene-react";
import {inspectCrayonScene} from "../registry/video/materials/crayon-scene";
import {crayonCc0FaceStudy} from "../src/video/crayon-artcraft-cc0-face";
import {CRAYON_F1_JOINED_NARIS_IDS,CRAYON_F1_SHARED_NARIS_RIMS,
  crayonF1JoinNarisContours} from "../src/video/crayon-artcraft-f1-naris-contour";
import {Cc0JoinedNarisContourMacro} from "../src/video/crayon-artcraft-adult-face.stories";

describe("ArtCraft V19 source alar rim shared contour (experimental)",()=>{
  const part=(elements:ReturnType<typeof crayonCc0FaceStudy>["elements"],id:string)=>
    elements.find(e=>e.id===id);
  const changed=new Set<string>(CRAYON_F1_JOINED_NARIS_IDS);
  it("retains V17 and V18 controls, exact frame/seed and all unrelated art",()=>{
    const old=crayonCc0FaceStudy({midfaceForm:"source-nose-sculpt"});
    const v18=crayonCc0FaceStudy({midfaceForm:"source-nasal-depth"});
    const next=crayonCc0FaceStudy({midfaceForm:"source-contour-joined"});
    for(const scene of [old,v18,next])expect(inspectCrayonScene(scene)).toEqual([]);
    expect(next.elements).toHaveLength(old.elements.length);
    for(const key of ["width","height","durationFrames","paper","paperTooth",
      "seed","camera"] as const)expect(next[key]).toEqual(old[key]);
    expect(next.elements.filter(e=>!changed.has(e.id))).toEqual(
      old.elements.filter(e=>!changed.has(e.id)));
    for(const id of CRAYON_F1_JOINED_NARIS_IDS){
      const a=part(old.elements,id),b=part(next.elements,id);
      if(a?.kind!=="wax"||b?.kind!=="wax")throw Error("Missing "+id);
      expect(b.d).not.toBe(a.d);
      expect(b.parentId).toBe(a.parentId);
      expect(b.clipToParent).toBe(a.clipToParent);
      expect(b.timing).toEqual(a.timing);
    }
    expect(new Set(next.elements.map(e=>e.id)).size).toBe(next.elements.length);
    expect(Cc0JoinedNarisContourMacro.name).toContain("!dev");
  });
  it("connects distinct near/far dark spaces by exact reverse-curved wax roof seams",()=>{
    const els=crayonCc0FaceStudy({midfaceForm:"source-contour-joined"}).elements;
    const ids=els.map(e=>e.id);
    for(const side of ["near","far"] as const){
      const rim=CRAYON_F1_SHARED_NARIS_RIMS[side];
      const roof=part(els,"alar-roof-"+side);
      const shadow=part(els,"naris-shadow-"+side);
      const skin=part(els,"nasal-alar-attachment-"+side);
      if(roof?.kind!=="wax"||shadow?.kind!=="wax"||skin?.kind!=="wax")
        throw Error("Missing "+side);
      expect(shadow.d.startsWith(rim.forward)).toBe(true);
      if(side==="near")expect(shadow.d).toContain("C407 628 405 635 403 640");
      if(side==="far")expect(shadow.d).toContain("C462 635 458 641 454 642");
      expect(roof.d.includes(rim.reverse)).toBe(true);
      expect(ids.indexOf(roof.id)).toBe(ids.indexOf(shadow.id)+1);
      expect(shadow.coverage).toBe("opaque");
      expect(roof).toMatchObject({coverage:"open",featherContacts:true,
        parentId:"face-outline",clipToParent:true,deposition:"stroke-built",
        outlineOpacity:0});
      expect(skin.blendRadius).toBeGreaterThan(7);
      expect(skin.coverage).toBe("open");
    }
    expect(CRAYON_F1_SHARED_NARIS_RIMS.near).not.toEqual(
      CRAYON_F1_SHARED_NARIS_RIMS.far);
  });
  it("fails closed for duplicates, missing parent pieces and a second application",()=>{
    const original=crayonCc0FaceStudy({midfaceForm:"source-nose-sculpt"});
    const next=crayonCc0FaceStudy({midfaceForm:"source-contour-joined"});
    expect(()=>crayonF1JoinNarisContours(original.elements.filter(e=>
      e.id!=="alar-roof-near"))).toThrow(RangeError);
    const duplicate=part(original.elements,"naris-shadow-near");
    if(!duplicate)throw Error("Missing source");
    expect(()=>crayonF1JoinNarisContours([...original.elements,duplicate]))
      .toThrow(RangeError);
    expect(()=>crayonF1JoinNarisContours(next.elements)).toThrow(RangeError);
  });
  it("renders native CRAYON1 wax at frame 299 rather than images or filters",()=>{
    const spec=crayonCc0FaceStudy({midfaceForm:"source-contour-joined"});
    const html=renderToStaticMarkup(<CrayonScene spec={spec} frame={299}/>);
    for(const id of CRAYON_F1_JOINED_NARIS_IDS)
      expect(html).toContain('data-km-crayon-element="'+id+'"');
    expect(html).not.toContain("<image");
    expect(html).toContain('data-km-crayon-underpaint-gradient');
    expect(html).toContain('data-km-crayon-feather-contacts="open-wax"');
  });
});
