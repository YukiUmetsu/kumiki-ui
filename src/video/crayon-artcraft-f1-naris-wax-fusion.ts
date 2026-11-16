import type {CrayonElement} from "../../registry/video/materials/crayon-scene";

type Wax=Extract<CrayonElement,{kind:"wax"}>;

/**
 * ArtCraft F1 V27: source-observed, *softly occluded* nostril recess.
 * CC0 original: Christopher Campbell, photograph 608 x 1082.
 *
 * The V26 screenshot had better near/far cavity ROI scores but looked like
 * two foreign cut-paper stickers at 3x. Source cavities soften naturally
 * into warm alar skin: the interior is a dark volume, not a hard outline.
 * This native CRAYON1 experiment feathers existing solid-wax *alpha* at
 * the cavity boundary and tones down only the overlying alar roof wax;
 * geometry, scene seed, frame timing, previous opt-in variants preserved.
 * Do not promote this study until genuine 1x/3x and ArtCraft review.
 */
export const CRAYON_F1_V27_SOURCE_OBSERVATION=Object.freeze({
  source:"Christopher Campbell, CC0, 608x1082",
  near:{center:[405,631],darkRgb:[29,4,4],wing:"hooked"},
  far:{center:[450,627],darkRgb:[74,22,18],wing:"compressed"},
  control:"source-carved-naris",
} as const);

/** Every node is already present in V26; no additional cutout or
 * decorative stroke is introduced. These are native medium parameters.
 */
const surfaces:Readonly<Record<string,Partial<Wax>>> = {
  "naris-shadow-near":{
    // Warm black core with a decaying, physically blurred alpha *edge*.
    // Unlike gaussian-blurring the image, this retains every wax pickup
    // and explicit dry-nib mark, with soft skin/paper boundaries only.
    coverage:"opaque",deposition:"stroke-built",
    featherContacts:true,blendRadius:2.15,
    nibStyle:"dry",markLength:"short",strokeOrder:"patches",
    colors:["#4e2925","#170b0f","#8e5448"],
    pressure:.95,spacing:3.8,markStrength:.21,angle:-27,
    opaqueBurnish:.96,underpaintTooth:.07,
    underpaintGradient:{
      light:"#55302b",shadow:"#12070b",
      focusX:.80,focusY:.36,radius:.90,
    },
    outlineOpacity:0,edgeRoughness:.16,
  },
  "naris-shadow-far":{
    coverage:"opaque",deposition:"stroke-built",
    featherContacts:true,blendRadius:2.55,
    nibStyle:"dry",markLength:"short",strokeOrder:"patches",
    colors:["#633a32","#261316","#b17b69"],
    pressure:.91,spacing:3.9,markStrength:.21,angle:66,
    opaqueBurnish:.94,underpaintTooth:.08,
    underpaintGradient:{
      light:"#71423b",shadow:"#201014",
      focusX:.73,focusY:.66,radius:.82,
    },
    outlineOpacity:0,edgeRoughness:.18,
  },
  "alar-roof-near":{
    // Keep the V23 shared cubic occlusion edge: reduce contrast in
    // cartilage *around* the recess rather than painting a pale lip.
    coverage:"open",deposition:"stroke-built",nibStyle:"dry",
    colors:["#cca195","#8e6963","#dfb4a3"],
    featherContacts:true,blendRadius:6.4,
    pressure:.59,spacing:5.6,markStrength:.28,angle:24,
    strokeOrder:"patches",markLength:"short",
    outlineOpacity:0,edgeRoughness:.18,
  },
  "alar-roof-far":{
    coverage:"open",deposition:"stroke-built",nibStyle:"dry",
    colors:["#bd978e","#81615b","#d3a79a"],
    featherContacts:true,blendRadius:6.8,
    pressure:.57,spacing:5.7,markStrength:.27,angle:66,
    strokeOrder:"patches",markLength:"short",
    outlineOpacity:0,edgeRoughness:.18,
  },
};
export const CRAYON_F1_V27_FUSED_IDS=Object.freeze(Object.keys(surfaces));

/** Fails closed on duplicate, missing or already-treated nasal anatomy.
 * Paint order is a specific V26 prerequisite: recessed dark wax last.
 */
export function crayonF1FuseNarisIntoAlarSkin(
  elements:readonly CrayonElement[],
):CrayonElement[]{
  const seen=new Set<string>();
  const next=elements.map(el=>{
    if(!Object.prototype.hasOwnProperty.call(surfaces,el.id))return el;
    if(el.kind!=="wax"||seen.has(el.id))
      throw new RangeError("Invalid/doubled photo alar wax "+el.id);
    seen.add(el.id);
    if(el.id==="naris-shadow-near"&&el.featherContacts)
      throw new RangeError("V27 native wax already fused");
    return {...el,...surfaces[el.id]};
  });
  if(seen.size!==CRAYON_F1_V27_FUSED_IDS.length)
    throw new RangeError("Incomplete registered near/far alar wax");
  for(const side of ["near","far"] as const){
    const roof=next.findIndex(el=>el.id==="alar-roof-"+side);
    const recess=next.findIndex(el=>el.id==="naris-shadow-"+side);
    if(roof<0||recess<=roof)
      throw new RangeError("V27 source cavity must occlude its existing skin roof");
  }
  return next;
}
