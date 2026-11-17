import type {CrayonElement,CrayonUnderpaintField} from "../../registry/video/materials/crayon-scene";
import {CRAYON_PORTRAIT_AUDIT} from "./crayon-artcraft-portrait-audit";
import {crayonF1RegisterAnat1Face} from "./crayon-artcraft-f1-anat1-malar";

/** CRAYON1 ArtCraft V48 research-only: continuous photo-calibrated wax
 * underpaint built on ACCEPTED GEOMETRY CONTROL V46, not rejected V47.
 * Original silhouette, orbital anatomy, every eye/hair/foliage element,
 * seeds, paper, gradients and 300-frame motion are preserved.
 * The ANAT1 mesh is a structural guide, never a sitter-specific 3D scan.
 */
// V30 rebuilt the actual continuous face outline to encompass the photographed
// near cheek and chin. V41 only adjusted the hairline geometry, not the bounds.
// Never normalize the source observations against the obsolete V23 412×608 box.
const bounds={x:73,y:272,width:440,height:611} as const;
const witnesses=[
  {id:"lateral-cast",at:[133,702],source:[123,85,67],nativeV46:[203,166,149]},
  {id:"jaw-undercut",at:[155,762],source:[129,92,75],nativeV46:[197,162,145]},
  {id:"nasal-root",at:[333,533],source:[124,95,90],nativeV46:[199,167,153]},
  {id:"orbito-malar",at:[201,582],source:[189,150,136],nativeV46:[209,175,158]},
  {id:"lower-malar",at:[220,688],source:[203,151,128],nativeV46:[223,186,166]},
  {id:"mandibular-roll",at:[261,830],source:[177,133,108],nativeV46:[197,163,148]},
  {id:"malar-light",at:[193,622],source:[240,207,191],nativeV46:[224,187,168]},
  {id:"nasal-ridge",at:[367,595],source:[226,192,174],nativeV46:[200,164,148]},
] as const;
export const CRAYON_F1_V48_SOURCE_SHA=CRAYON_PORTRAIT_AUDIT.source.sha256;
export const CRAYON_F1_V48_WITNESSES=Object.freeze(witnesses);
function field(index:number,color:CrayonUnderpaintField["color"],radiusX:number,radiusY:number,
  strength:number):CrayonUnderpaintField{
  const [x,y]=witnesses[index].at;
  return Object.freeze({x:Number(((x-bounds.x)/bounds.width).toFixed(5)),
    y:Number(((y-bounds.y)/bounds.height).toFixed(5)),
    radiusX,radiusY,color,strength});
}
export const CRAYON_F1_V48_FIELDS=Object.freeze([
  field(0,"#51392f",.29,.27,.88),
  field(1,"#593f39",.30,.19,.68),
  field(2,"#684b49",.17,.15,.69),
  field(3,"#89635f",.25,.17,.37),
  field(4,"#977262",.26,.20,.42),
  field(5,"#866051",.30,.16,.35),
  field(6,"#fbe1ce",.24,.15,.40),
  field(7,"#f5cbb6",.18,.16,.34),
]);
export function crayonF1BuildPhotometricUnderpaintV48(
  elements:readonly CrayonElement[],
):CrayonElement[]{
  if(CRAYON_F1_V48_SOURCE_SHA!==
    "f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2")
    throw new RangeError("Original CC0 benchmark changed");
  const ids=new Set<string>();
  for(const element of elements){
    if(ids.has(element.id))throw new RangeError("Duplicate ANAT1 source ID "+element.id);
    ids.add(element.id);
  }
  const face=elements.find(x=>x.id==="face-outline");
  if(face?.kind!=="wax"||face.coverage!=="opaque"||
     face.underpaintFields!==undefined||!face.underpaintGradient||
     Object.entries(bounds).some(([key,v])=>face.bounds[key as keyof typeof bounds]!==v))
    throw new RangeError("Missing original source-registered skin volume");
  for(const id of ["sclera-near","iris-near","pupil-near","upper-lid-near",
    "lower-lid-near","hair-crown-surface","source-brow-follicles-near",
    "malar-cheek-near","cheek-malar-cast","cheek-malar-bounce",
    "cc0-hedge-dark-underpaint"])
    if(!ids.has(id))throw new RangeError("Missing original source geometry "+id);
  const fit=crayonF1RegisterAnat1Face();
  if(fit.model!=="ANAT1/MediaPipe-468-unmodified"||
    !Number.isFinite(fit.rmse)||fit.rmse>40)
    throw new RangeError("Unverified photo-to-ANAT1 fit");
  return elements.map(el=>el===face?
    {...face,underpaintFields:CRAYON_F1_V48_FIELDS}:el);
}
