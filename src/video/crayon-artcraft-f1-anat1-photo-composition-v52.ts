import type {CrayonElement} from "../../registry/video/materials/crayon-scene";
import {CRAYON_F1_V48_FIELDS,CRAYON_F1_V48_SOURCE_SHA}
  from "./crayon-artcraft-f1-anat1-skin-underpaint-v48";
import {crayonF1AddObliqueSourceVolumeV49,CRAYON_F1_V49_FIELDS}
  from "./crayon-artcraft-f1-anat1-oblique-volume-v49";
import {CRAYON_F1_V50_HAIR_FIELDS,CRAYON_F1_V50_HAIR_IDS}
  from "./crayon-artcraft-f1-anat1-photo-hair-v50";

/** F1 ArtCraft V52 (!dev): only combine independent photo-positive
 * non-overlapping native wax volumes. V49 corrects V48 *face* planes;
 * V50 corrects three *hair* volumes. V51 artificial hair-rim stripes
 * worsened all reference ROIs and are strictly excluded.
 */
export const CRAYON_F1_V52_PHOTO=Object.freeze({
  sha:CRAYON_F1_V48_SOURCE_SHA,
  reference:"Christopher Campbell CC0 exact original 608x1082 browser screenshot",
  approved:false,
  rejectedHair:"V51",
  unchangedFrames:300,
});
export function crayonF1CombinePhotoWaxV52(elements:readonly CrayonElement[]):CrayonElement[]{
  if(CRAYON_F1_V52_PHOTO.sha!==
    "f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2")
    throw new RangeError("V52 original CC0 photo source changed");
  const ids=new Map<string,CrayonElement>();
  for(const e of elements){
    if(ids.has(e.id))throw new RangeError("Repeated source ANAT1 wax "+e.id);
    ids.set(e.id,e);
  }
  const face=ids.get("face-outline");
  if(face?.kind!=="wax"||face.underpaintFields!==CRAYON_F1_V48_FIELDS)
    throw new RangeError("V52 needs original V48 source face volume");
  for(let i=0;i<CRAYON_F1_V50_HAIR_IDS.length;i++){
    const id=CRAYON_F1_V50_HAIR_IDS[i],mass=ids.get(id);
    const region=i===0?"crown":i===1?"left":"right";
    if(mass?.kind!=="wax"||
       mass.underpaintFields!==CRAYON_F1_V50_HAIR_FIELDS[region])
      throw new RangeError("V52 needs V50 original rooted hair volume "+id);
  }
  if(elements.some(e=>e.id.startsWith("hair-source-lock-")))
    throw new RangeError("Rejected V51 source-discordant hair contours excluded");
  const output=crayonF1AddObliqueSourceVolumeV49(elements);
  const composed=output.find(e=>e.id==="face-outline");
  if(composed?.kind!=="wax"||composed.underpaintFields?.length!==12||
     composed.underpaintFields.slice(8).some((f,i)=>f!==CRAYON_F1_V49_FIELDS[i]))
    throw new RangeError("Lost photographed face plane in composition");
  return output;
}
