import { inspectPencilDrawing } from "./colored-pencil";
import type { PencilDrawingSpec } from "./colored-pencil";
import { PENCIL_MATERIALS, pencilMaterialCraftFinish } from "./colored-pencil-materials";
import type { PencilSurface } from "./colored-pencil-materials";

/**
 * CP-F1: non-destructive drawing foundation shared by every new coloured-pencil
 * study and reusable across films. Geometry always comes from an authored
 * silhouette, measured reference, or an explicitly licensed source image.
 * This layer never infers anatomy or traces artist-owned paintings.
 */
export const PENCIL_FOUNDATION_STAGES = [
  {id:"observe",name:"Reference & structure",frame:0,
    rule:"Document subject, rights, landmarks, overlaps, lighting and reference features."},
  {id:"outline",name:"Contour and silhouette",frame:52,
    rule:"Check major masses, attachment, negative space and perspective before pigment."},
  {id:"undertone",name:"Light value map",frame:106,
    rule:"Reserve highlights; establish shadow/light planes in low-pressure deposits."},
  {id:"layer",name:"Cross-layer colour",frame:168,
    rule:"Use complementary translucent colours and material-aligned directions."},
  {id:"detail",name:"Rooted texture & edges",frame:254,
    rule:"Place eyelashes, fur, veins, seams or other local detail on named structures."},
  {id:"review",name:"Burnish and visual audit",frame:335,
    rule:"Inspect 1x and macro, paper tooth, opacity, facial landmarks, frames and crops."},
] as const;
export type PencilFoundationStage=typeof PENCIL_FOUNDATION_STAGES[number]["id"];
export type PencilFoundationMedium="dry"|"water-soluble";
export type PencilFoundationSubject=
  "human"|"wildlife"|"botanical"|"landscape"|"architecture"|"object"|"science";
export interface PencilFoundationReference {
  /** Human-readable reference / observation provenance; avoid unlicensed assets. */
  title:string;
  /** Optional original artist/institution page. No files downloaded or embedded. */
  url?:string;
  /** Technique-only: never trace; owned/licensed: images may be used as input. */
  rights:"technique-only"|"owned"|"licensed";
  /** Specifically observed rule, not a vague adjective such as 'detailed'. */
  observation:string;
}
export interface PencilFoundationManifest {
  version:1;
  subject:PencilFoundationSubject;
  medium:PencilFoundationMedium;
  /** This system does not physically diffuse watercolor-pencil pigment. */
  references:readonly PencilFoundationReference[];
  /** Explicit geometry/lighting plan, not automatically generated anatomy. */
  construction:string;
  /** All named region IDs, including intentionally translucent regions. */
  surfaces:Readonly<Record<string,PencilSurface>>;
}
export interface PencilFoundationRequest {
  subject:PencilFoundationSubject;
  medium?:PencilFoundationMedium;
  references:readonly PencilFoundationReference[];
  construction:string;
  surfaces:Readonly<Record<string,PencilSurface>>;
}
const SUBJECTS:readonly PencilFoundationSubject[]=[
  "human","wildlife","botanical","landscape","architecture","object","science",
];
const MATERIAL_SET=new Set<string>(PENCIL_MATERIALS);
const ID=/^[a-zA-Z][\w-]{0,64}$/;
function inspectManifest(drawing:PencilDrawingSpec,
  foundation:PencilFoundationManifest):string[]{
  const errors:string[]=[];
  if(foundation.version!==1)errors.push("foundation.version: must be 1");
  if(!SUBJECTS.includes(foundation.subject))
    errors.push("foundation.subject: unknown drawing subject");
  if(foundation.medium!=="dry"&&foundation.medium!=="water-soluble")
    errors.push("foundation.medium: invalid pencil medium");
  if(typeof foundation.construction!=="string"||
    foundation.construction.trim().length<32||foundation.construction.length>1800)
    errors.push("foundation.construction: describe actual silhouette, light and anatomical flow");
  if(!Array.isArray(foundation.references)||foundation.references.length<1||
    foundation.references.length>12)errors.push("foundation.references: need 1-12 grounded art references");
  else for(const [i,r] of foundation.references.entries()){
    if(!r||typeof r.title!=="string"||r.title.trim().length<3||
      typeof r.observation!=="string"||r.observation.trim().length<22||
      !["technique-only","owned","licensed"].includes(r.rights)||
      (r.url!==undefined&&
        (typeof r.url!=="string"||!/^https:\/\/[^\s]+$/i.test(r.url)||r.url.length>1024)))
      errors.push("foundation.references["+i+"]: invalid provenance / observed feature");
  }
  const surfaces=foundation.surfaces;
  if(!surfaces||typeof surfaces!=="object"||Array.isArray(surfaces)){
    errors.push("foundation.surfaces: explicit region-to-material map required");
    return errors;
  }
  const expected=new Set(drawing.regions.map(r=>r.id));
  const entries=Object.entries(surfaces);
  for(const [id,surface] of entries){
    if(!expected.has(id)||!ID.test(id))errors.push("foundation.surfaces: unknown region "+id);
    if(!MATERIAL_SET.has(surface))errors.push("foundation.surfaces: unsupported material "+id);
  }
  for(const region of drawing.regions){
    const surface=surfaces[region.id];
    if(!surface){
      errors.push("foundation.surfaces: missing material for "+region.id);
      continue;
    }
    if(!MATERIAL_SET.has(surface))continue; // Report invalid surface above, do not throw.
    if(region.layers.length<3)
      errors.push("foundation.layers: each region needs 3+ colour deposits ("+region.id+")");
    const finish=pencilMaterialCraftFinish(surface);
    if(finish){
      // Anatomically continuous dermal children inherit their parent facial
      // pigment without introducing a second blank ivory support. All other
      // solid materials continue to require a fully occluding paper base.
      if(!region.opaqueSupport&&
        !(surface==="skin"&&region.layeredSkinOverParent===true))
        errors.push("foundation.support: solid "+region.id+" must be paper-opaque");
      if(region.layeredSkinOverParent&&surface!=="skin")
        errors.push("foundation.skin-overlap: only skin can inherit skin pigment ("+region.id+")");
      if(region.craft?.kind!==finish.kind)
        errors.push("foundation.craft: wrong / missing "+surface+" finish for "+region.id);
    }else if(region.opaqueSupport){
      errors.push("foundation.translucency: "+region.id+" should not have a solid paper matte");
    }else if(region.craft){
      errors.push("foundation.translucency: non-occluding "+region.id+" cannot have opaque craft base");
    }
  }
  return errors;
}
/** A strict API used by new authored studies. No silent missing-material fallback.
 * Legacy CP1 drawings may still render, but are not labelled CP-F1 qualified.
 */
export function createPencilFoundationDrawing(
  drawing:PencilDrawingSpec, request:PencilFoundationRequest,
):PencilDrawingSpec {
  const errors=inspectPencilDrawing(drawing);
  if(errors.length)throw new RangeError("Invalid source pencil drawing: "+errors.join("; "));
  const manifest:PencilFoundationManifest={
    version:1,subject:request.subject,medium:request.medium??"dry",
    references:request.references,construction:request.construction,
    surfaces:request.surfaces,
  };
  // New work cannot escape canonical three-pass craft by forgetting craft:true.
  // Glaze, cast-shadow and glass are exceptions because they must remain translucent.
  const regions=drawing.regions.map(region=>{
    const surface=manifest.surfaces[region.id];
    if(!MATERIAL_SET.has(surface))return region;
    const finish=pencilMaterialCraftFinish(surface);
    return finish?{...region,craft:region.craft??finish}:region;
  });
  const qualified={...drawing,regions,foundation:manifest};
  const issues=inspectPencilFoundationDrawing(qualified);
  if(issues.length)throw new RangeError("Pencil foundation rejected: "+issues.join("; "));
  return qualified;
}
/** Run on every CP-F1 render and in production/tests. No pixel beauty claims. */
export function inspectPencilFoundationDrawing(drawing:PencilDrawingSpec):string[]{
  if(!drawing.foundation)return ["foundation: CP-F1 metadata required"];
  return [...inspectPencilDrawing(drawing),...inspectManifest(drawing,drawing.foundation)];
}
/** Explicit policy for source-conditioned, Canvas pencil marks as well.
 * No image is treated as a third-party art asset without compatible rights.
 */
export const PENCIL_PHOTO_FOUNDATION={
  paper:"#FAF5ED",
  markOrder:["structural-contour","value-hatching","surface-fibres"] as const,
  maxStrokes:36000,
  sourcePixelLimit:2048,
  defaultWashIsPhysical:false,
} as const;
