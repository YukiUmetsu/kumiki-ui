import type {CrayonElement,CrayonUnderpaintField} from "../../registry/video/materials/crayon-scene";
import {CRAYON_F1_V48_FIELDS,CRAYON_F1_V48_SOURCE_SHA}
  from "./crayon-artcraft-f1-anat1-skin-underpaint-v48";

/** V49 is a reversible original-photo / native-wax negative-control experiment.
 * It KEEPS all eight V48 underpaint stations and every existing face, eyelid,
 * hair, paper and foliage primitive. Only four source-oriented wax volumes
 * are appended below the original paper-tooth and pressure contacts.
 *
 * Source: Christopher Campbell CC0 portrait, original 608×1082 screenshot
 * SHA-256 f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2.
 * This is a photo-observed pigment experiment, not a 3D identity scan.
 */
const sourceBounds={x:73,y:272,width:440,height:611} as const;
export const CRAYON_F1_V49_OBSERVATIONS=Object.freeze([
  // Source lower tarsus follows canthal slope x216/558 -> x318/545;
  // native V48 at x255,y583 remains ~60-70 RGB too pale.
  {id:"infraorbital-occlusion",at:[255,583],color:"#5a3f3a",
    radiusX:.18,radiusY:.045,rotationDeg:-8,strength:.54},
  // Outer lateral cheek turns diagonally into the underjaw.
  {id:"lateral-cheek-undercut",at:[133,702],color:"#51372f",
    radiusX:.24,radiusY:.064,rotationDeg:68,strength:.58},
  // Alar-to-nasolabial roll: distinct from dark nostril aperture.
  {id:"alar-cheek-rotation",at:[357,656],color:"#76514b",
    radiusX:.14,radiusY:.056,rotationDeg:53,strength:.43},
  // The source high malar plane reflects upward light;
  // retain its bright wax even while deepening the nearby trough.
  {id:"malar-light-return",at:[175,615],color:"#fbe0cb",
    radiusX:.18,radiusY:.072,rotationDeg:30,strength:.29},
] as const);
const sourceField=(obs:(typeof CRAYON_F1_V49_OBSERVATIONS)[number]):CrayonUnderpaintField=>{
  const [x,y]=obs.at;
  if(x<sourceBounds.x||x>sourceBounds.x+sourceBounds.width||
     y<sourceBounds.y||y>sourceBounds.y+sourceBounds.height||
     !Number.isFinite(obs.rotationDeg)||Math.abs(obs.rotationDeg)>89)
    throw new RangeError("Unregistered V49 photographic flow field "+obs.id);
  return Object.freeze({
    x:Number(((x-sourceBounds.x)/sourceBounds.width).toFixed(5)),
    y:Number(((y-sourceBounds.y)/sourceBounds.height).toFixed(5)),
    radiusX:obs.radiusX,radiusY:obs.radiusY,
    rotationDeg:obs.rotationDeg,color:obs.color,strength:obs.strength,
  });
};
export const CRAYON_F1_V49_FIELDS:readonly CrayonUnderpaintField[]=Object.freeze(
  CRAYON_F1_V49_OBSERVATIONS.map(sourceField));
export const CRAYON_F1_V49_SOURCE_SHA=CRAYON_F1_V48_SOURCE_SHA;
/** Only accepts the exact unchanged V48 source volume. Never layers
 * another generic cheek sticker, repaints eye wax, or promotes the study.
 */
export function crayonF1AddObliqueSourceVolumeV49(
  elements:readonly CrayonElement[],
):CrayonElement[]{
  if(CRAYON_F1_V49_SOURCE_SHA!==
    "f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2")
    throw new RangeError("V49 CC0 original source benchmark changed");
  const ids=new Set<string>();
  for(const el of elements){
    if(ids.has(el.id))throw new RangeError("Duplicate V49 source wax ID "+el.id);
    ids.add(el.id);
  }
  const face=elements.find(el=>el.id==="face-outline");
  if(face?.kind!=="wax"||face.coverage!=="opaque"||
     face.underpaintFields!==CRAYON_F1_V48_FIELDS||
     !face.underpaintGradient||
     Object.entries(sourceBounds).some(([key,value])=>
       face.bounds[key as keyof typeof sourceBounds]!==value))
    throw new RangeError("V49 requires exact V48 source-connected face wax");
  for(const id of ["sclera-near","iris-near","lower-lid-near","upper-lid-crease-near",
    "nose-dorsum","cheek-malar-cast","hair-crown-surface",
    "cc0-hedge-dark-underpaint","source-brow-follicles-near"])
    if(!ids.has(id))throw new RangeError("V49 missing original micro-element "+id);
  return elements.map(el=>el===face?{
    ...face,underpaintFields:Object.freeze([
      ...CRAYON_F1_V48_FIELDS,...CRAYON_F1_V49_FIELDS,
    ]),
  }:el);
}
