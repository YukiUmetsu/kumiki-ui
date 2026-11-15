import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PencilDrawing } from "../registry/video/colored-pencil-react";
import { createPencilMaterialRegion,pencilMaterialCraftFinish,PENCIL_MATERIALS } from "../registry/video/colored-pencil-materials";
import { createPencilFoundationDrawing,inspectPencilFoundationDrawing,PENCIL_FOUNDATION_STAGES,PENCIL_PHOTO_FOUNDATION } from "../registry/video/colored-pencil-foundation";
import type { PencilFoundationRequest } from "../registry/video/colored-pencil-foundation";
import { pencilLivingStudyDrawing } from "../src/video/colored-pencil-living-studies";
import { pencilObjectStudyDrawing } from "../src/video/colored-pencil-object-studies";
import { createPencilPhotoStudy } from "../src/video/colored-pencil-photo";

const authored=()=>createPencilMaterialRegion({
  surface:"fur",id:"fox-head",seed:40,startFrame:30,
  path:"M19 24 C28 4 78 10 87 33 Q79 78 31 71 Z",
  bounds:[17,4,73,78],palette:["#BD7951","#604B4F","#F2CB9A"],
  details:[{path:"M32 48 Q54 31 72 40",color:"#593E45",
    width:.8,startFrame:120,durationFrames:65}],
  // Intentionally leave craft off; CP-F1 must supply it.
});
const required={
  subject:"wildlife" as const,
  construction:"Fox head, attached ears, eyelids, muzzle axis and directional cheek hair guided by side-lit volumes.",
  references:[{title:"Original fox form observation",rights:"owned" as const,
    observation:"An anatomically grounded fox with attached muzzle, shaded eye socket and long neck hairs."}],
  surfaces:{"fox-head":"fur" as const},
};

describe("CP-F1 mandatory foundation for new pencil drawings",()=>{
  it("declares an ordered material process with no missing or duplicate stages",()=>{
    expect(PENCIL_FOUNDATION_STAGES.map(s=>s.id)).toEqual([
      "observe","outline","undertone","layer","detail","review",
    ]);
    expect(PENCIL_FOUNDATION_STAGES.map(s=>s.frame)).toEqual([0,52,106,168,254,335]);
    expect(PENCIL_PHOTO_FOUNDATION.markOrder).toEqual([
      "structural-contour","value-hatching","surface-fibres",
    ]);
    expect(new Set(PENCIL_MATERIALS).size).toBe(PENCIL_MATERIALS.length);
  });
  it("attaches exact material-native finish without changing authored path or contour",()=>{
    const part=authored();
    expect(part.craft).toBeUndefined();
    const drawing={version:1 as const,seed:42,width:420,height:310,
      paper:"#F8F5EA",paperTooth:.7,regions:[part]};
    const qualified=createPencilFoundationDrawing(drawing,required);
    expect(inspectPencilFoundationDrawing(qualified)).toEqual([]);
    expect(qualified.regions[0].path).toBe(part.path);
    expect(qualified.regions[0].contour).toEqual(part.contour);
    expect(qualified.regions[0].details).toEqual(part.details);
    expect(qualified.regions[0].layers).toEqual(part.layers);
    expect(qualified.regions[0].craft).toEqual(pencilMaterialCraftFinish("fur"));
    expect(drawing.regions[0].craft).toBeUndefined();
    const html=renderToStaticMarkup(<PencilDrawing drawing={qualified} frame={335}/>);
    expect(html).toContain('data-km-pencil-foundation="CP-F1"');
    expect(html).toContain('data-km-pencil-craft-base=""');
    expect(html).toContain('data-km-pencil-support="fox-head"');
    expect(html).toContain('data-km-pencil-micro=""');
    expect(renderToStaticMarkup(<PencilDrawing drawing={qualified} frame={335}/>))
      .toBe(html);
  });
  it("denies anonymous materials, wrong craft, inadequate references or missing geometry",()=>{
    const drawing={version:1 as const,seed:42,width:420,height:310,
      paper:"#F8F5EA",paperTooth:.7,regions:[authored()]};
    const badRequests:PencilFoundationRequest[]=[
      {...required,surfaces:{}},
      {...required,surfaces:{"fox-head":"unicorn" as "fur"}},
      {...required,surfaces:{"fox-head":"fur" as const,"ghost":"skin" as const}},
      {...required,construction:"generic face"},
      {...required,references:[]},
      {...required,references:[{title:"a",rights:"technique-only" as const,observation:"detailed"}]},
    ];
    for(const bad of badRequests)
      expect(()=>createPencilFoundationDrawing(drawing,bad)).toThrow(RangeError);
    const qualified=createPencilFoundationDrawing(drawing,required);
    expect(inspectPencilFoundationDrawing({
      ...qualified,regions:qualified.regions.map(r=>({...r,craft:{...r.craft!,kind:"skin"}})),
    })).toContainEqual(expect.stringContaining("wrong / missing"));
    expect(inspectPencilFoundationDrawing({...qualified,foundation:undefined}))
      .toContain("foundation: CP-F1 metadata required");
  });
  it("preserves transparent glass, cast shadow and glaze while requiring opaque solids",()=>{
    for(const surface of ["glass","cast-shadow","glaze"] as const){
      const region=createPencilMaterialRegion({...{
        id:"test",seed:20,surface,path:"M0 0 H50 V50 Z",bounds:[0,0,50,50] as const,
        palette:["#ACB1B0","#737F7D","#F0E6D0"] as const,
      },craft:true});
      expect(pencilMaterialCraftFinish(surface)).toBeNull();
      const qualified=createPencilFoundationDrawing({
        version:1,width:420,height:310,seed:20,paper:"#FAF4E8",
        paperTooth:.63,regions:[region],
      },{...required,surfaces:{test:surface}});
      expect(qualified.regions[0].opaqueSupport).toBe(false);
      expect(qualified.regions[0].craft).toBeUndefined();
      expect(inspectPencilFoundationDrawing(qualified)).toEqual([]);
    }
  });
  it("rejects unsupported pseudo-skin while allowing actual face-connected labial pigment",()=>{
    const drawing=pencilLivingStudyDrawing({subject:"portrait",aspect:"landscape"});
    expect(inspectPencilFoundationDrawing(drawing)).toEqual([]);
    for(const id of ["lip-upper","lip-lower"]){
      const part=drawing.regions.find(r=>r.id===id)!;
      expect(part.layeredSkinOverParent).toBe(true);
      expect(part.opaqueSupport).toBe(false);
      expect(part.craft?.kind).toBe("skin");
      const withoutOptIn={...drawing,regions:drawing.regions.map(r=>
        r.id===id?{...r,layeredSkinOverParent:false}:r)};
      expect(inspectPencilFoundationDrawing(withoutOptIn)).toContainEqual(
        expect.stringContaining("foundation.support: solid "+id));
      const detachedMaterial={...drawing,regions:drawing.regions.map(r=>
        r.id===id?{...r,craft:{...r.craft!,kind:"fur" as const}}:r)};
      expect(inspectPencilFoundationDrawing(detachedMaterial)).toContainEqual(
        expect.stringContaining("requires non-opaque skin craft"));
    }
  });
  it("qualifies every original living and object material, at either film aspect",()=>{
    for(const aspect of ["landscape","portrait"] as const){
      for(const subject of ["portrait","fox","valley"] as const){
        const drawing=pencilLivingStudyDrawing({subject,aspect});
        expect(inspectPencilFoundationDrawing(drawing)).toEqual([]);
        expect(drawing.foundation?.subject).toBe(
          subject==="portrait"?"human":subject==="fox"?"wildlife":"landscape");
        expect(Object.keys(drawing.foundation!.surfaces)).toHaveLength(drawing.regions.length);
        expect(drawing.regions.every(r=>r.opaqueSupport?!!r.craft:
          r.layeredSkinOverParent?r.craft?.kind==="skin":!r.craft)).toBe(true);
      }
      for(const subject of ["rose","glass","architecture","fabric"] as const){
        const drawing=pencilObjectStudyDrawing({subject,aspect});
        expect(inspectPencilFoundationDrawing(drawing)).toEqual([]);
        expect(Object.keys(drawing.foundation!.surfaces)).toHaveLength(drawing.regions.length);
      }
    }
  });
  it("source-conditioned photos also carry the same deterministic CP-F1 pass order",()=>{
    const width=48,height=32,data=new Uint8ClampedArray(width*height*4);
    for(let i=0;i<width*height;i++){
      const j=i*4;data[j]=215;data[j+1]=128;data[j+2]=81;data[j+3]=255;
    }
    const photo=createPencilPhotoStudy({width,height,data},{seed:9});
    expect(photo.foundationVersion).toBe("CP-F1");
    expect(photo.foundationPasses).toEqual(PENCIL_PHOTO_FOUNDATION.markOrder);
    expect(photo.strokes.every((s,i,a)=>i===0||a[i-1].pass<=s.pass)).toBe(true);
  });
});
