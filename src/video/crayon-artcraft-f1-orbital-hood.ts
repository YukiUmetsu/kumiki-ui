import type {CrayonElement} from "../../registry/video/materials/crayon-scene";

type Wax=Extract<CrayonElement,{kind:"wax"}>;

/**
 * ArtCraft F1 V29 — photographed upper-orbital shadow topology, experiment.
 * Replaces V28's two closed oval eye-socket patches with asymmetric,
 * source-observed continuous upper-brow hood ribbons tapering into the
 * lateral canthus. Existing lids, iris, tear duct, lower lid and all
 * directional wax/paper micro-marks remain on their original film layers.
 *
 * The reference is Campbell's CC0 portrait at 608 x 1082. Prior V28
 * actual Chromium source-native 1x and 3x frames showed opaque mauve
 * eye-discs that did not resemble the original photograph's brow bone.
 * This is a corrective native drawing, NOT a release-qualified likeness.
 */
export const CRAYON_F1_V29_ORBITAL_IDS=["socket-near","socket-far"] as const;

const hoods:Readonly<Record<(typeof CRAYON_F1_V29_ORBITAL_IDS)[number],Partial<Wax>>> = {
  "socket-near":{
    // A single connected asymmetrically tapering ribbon around the
    // supraorbital rim; the concave lower return is above the upper lid.
    // No isolated filled ellipse or circular purple sticker.
    d:"M194 518 C207 492 235 477 260 478 "+
      "C290 472 313 488 323 511 "+
      "C328 523 327 535 325 544 "+
      "C314 529 304 522 286 519 "+
      "C258 512 236 522 218 542 "+
      "C209 553 203 563 199 570 "+
      "C189 554 189 535 194 518Z",
    bounds:{x:187,y:469,width:144,height:105},
    coverage:"opaque",deposition:"stroke-built",
    featherContacts:true,blendRadius:15.6,
    colors:["#ae8980","#624b4c","#c7a397"],
    nibStyle:"dry",strokeOrder:"patches",markLength:"short",
    pressure:.70,spacing:6.8,markStrength:.28,angle:21,
    underpaintTooth:.22,opaqueBurnish:.39,
    underpaintGradient:{light:"#c59e92",shadow:"#61494a",
      focusX:.42,focusY:.35,radius:.94},
    outlineOpacity:0,edgeRoughness:.17,
  },
  "socket-far":{
    // Far orbit is compressed and more obliquely foreshortened;
    // separately authored rather than a scaled near-side duplicate.
    d:"M390 470 C405 453 421 443 438 442 "+
      "C455 440 471 452 477 470 "+
      "C482 482 480 496 476 506 "+
      "C462 493 446 490 435 492 "+
      "C418 493 403 506 394 522 "+
      "C389 505 385 484 390 470Z",
    bounds:{x:382,y:436,width:104,height:91},
    coverage:"opaque",deposition:"stroke-built",
    featherContacts:true,blendRadius:12.7,
    colors:["#967570","#4f3d43","#b99188"],
    nibStyle:"dry",strokeOrder:"patches",markLength:"short",
    pressure:.77,spacing:6.3,markStrength:.27,angle:44,
    underpaintTooth:.23,opaqueBurnish:.56,
    underpaintGradient:{light:"#b69087",shadow:"#4e3a41",
      focusX:.37,focusY:.51,radius:.88},
    outlineOpacity:0,edgeRoughness:.18,
  },
};

/** Precise, opt-in V28 -> V29 transform; fail closed if state is
 * missing, doubled, wrong-kind or already treated. This is not a
 * reusable generic face/identity and cannot silently change baseline.
 */
export function crayonF1RebuildOrbitalHood(
  elements:readonly CrayonElement[],
):CrayonElement[]{
  const found=new Set<string>();
  const result=elements.map(el=>{
    if(!Object.prototype.hasOwnProperty.call(hoods,el.id))return el;
    if(el.kind!=="wax"||found.has(el.id))
      throw new RangeError("Duplicated/non-wax photo orbital hood "+el.id);
    found.add(el.id);
    if(el.d===hoods[el.id as keyof typeof hoods].d)
      throw new RangeError("V29 source orbital hood already constructed");
    // The two original source regions must remain clipped to the skin.
    if(el.parentId!=="face-outline"||el.clipToParent!==true)
      throw new RangeError("V29 orbital hood lost its parent skin");
    return {...el,...hoods[el.id as keyof typeof hoods]};
  });
  if(found.size!==CRAYON_F1_V29_ORBITAL_IDS.length)
    throw new RangeError("Missing photo-registered near/far ocular mass");
  return result;
}
