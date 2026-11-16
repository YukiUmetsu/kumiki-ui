import type {CrayonElement} from "../../registry/video/materials/crayon-scene";
type Wax=Extract<CrayonElement,{kind:"wax"}>;
/** ArtCraft V25: photo-observed source native light/shadow SOLID underpaint
 * with alpha-contact feather, not pasted opaque disks. CC0 Campbell source.
 * Only existing V24 geometry, 300-frame animation and paper tooth retained.
 * Unapproved until actual source screenshots and ArtCraft gate pass.
 */
const patches:Readonly<Record<string,Partial<Wax>>> ={
  "nose-dorsum":{coverage:"opaque",featherContacts:true,blendRadius:14,
    deposition:"stroke-built",nibStyle:"dry",pressure:.63,spacing:5.2,
    markStrength:.42,underpaintTooth:.22,opaqueBurnish:.1,
    underpaintGradient:{light:"#f5d0be",shadow:"#bd8d84",
      focusX:.3,focusY:.38,radius:1.12},outlineOpacity:0},
  "nose-tip":{coverage:"opaque",featherContacts:true,blendRadius:9.8,
    deposition:"stroke-built",nibStyle:"dry",pressure:.79,spacing:4.8,
    markStrength:.48,underpaintTooth:.28,opaqueBurnish:.17,
    underpaintGradient:{light:"#ffe3c8",shadow:"#af7e72",
      focusX:.24,focusY:.42,radius:1.02},outlineOpacity:0},
  "nose-sidewall-form":{coverage:"opaque",featherContacts:true,blendRadius:11.5,
    deposition:"stroke-built",nibStyle:"dry",pressure:.65,spacing:5.4,
    markStrength:.42,underpaintTooth:.25,opaqueBurnish:.14,
    underpaintGradient:{light:"#c29a90",shadow:"#7e5852",
      focusX:.23,focusY:.38,radius:.95},outlineOpacity:0},
  "nose-septal-transition":{coverage:"opaque",featherContacts:true,blendRadius:8.1,
    deposition:"stroke-built",nibStyle:"dry",pressure:.74,spacing:5.2,
    markStrength:.45,underpaintTooth:.24,opaqueBurnish:.2,
    underpaintGradient:{light:"#ba8f82",shadow:"#754b43",
      focusX:.35,focusY:.32,radius:1.0},outlineOpacity:0},
};
export const CRAYON_F1_V25_VOLUME_IDS=Object.freeze(Object.keys(patches));
export function crayonF1FeatheredSolidNose(
  elements:readonly CrayonElement[],
):CrayonElement[]{
  const seen=new Set<string>();
  const result=elements.map(e=>{
    if(!Object.prototype.hasOwnProperty.call(patches,e.id))return e;
    if(e.kind!=="wax"||seen.has(e.id))
      throw new RangeError("Invalid source nose solid "+e.id);
    seen.add(e.id);
    if(e.id==="nose-tip"&&e.coverage==="opaque"&&e.featherContacts)
      throw new RangeError("Nose solid already constructed");
    return {...e,...patches[e.id]};
  });
  if(seen.size!==CRAYON_F1_V25_VOLUME_IDS.length)
    throw new RangeError("Incomplete photographed nasal planes");
  return result;
}
