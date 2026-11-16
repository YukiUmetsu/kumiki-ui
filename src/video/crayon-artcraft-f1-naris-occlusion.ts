import type {CrayonElement} from "../../registry/video/materials/crayon-scene";
/** Type-only ANAT1 contract: do not load Mediapipe JSON through Node/ESM
 * in the native Chromium proof runner (requires a JSON import attribute). */
type FaceLandmarkName=keyof typeof import("../../registry/anatomy/anatomy-face").FACE_LANDMARKS;
type Wax=Extract<CrayonElement,{kind:"wax"}>;

/** F1 V23: photo-observed nose cavity/ala occlusion, *not* a source-photo
 * filter or an ArtCraft 9.1-qualified human. CC0 Christopher Campbell.
 * Ref 608x1082, near undercut x388..423/y623..651; far x448..462/y616..645.
 * V22's dark floating bean/ellipse fails 1x reference fidelity.
 */
export const CRAYON_F1_NARIS_ANAT1=Object.freeze({
  root:"sellion",tip:"pronasale",septum:"subnasale",
  nearAla:"alare.R",farAla:"alare.L",
} as const satisfies Record<string,FaceLandmarkName>);
/** Mathematically identical reversed Bezier rims for the overhanging
 * cartilage and dark recess; near/far are independently constructed. */
export const CRAYON_F1_V23_RIMS=Object.freeze({
  near:{
    forward:"M388 637 C391 628 400 622 408 623 C416 623 422 628 423 633",
    reverse:"C422 628 416 623 408 623 C400 622 391 628 388 637",
  },
  far:{
    forward:"M448 634 C446 626 450 618 454 616 C459 615 461 620 461 626",
    reverse:"C461 620 459 615 454 616 C450 618 446 626 448 634",
  },
});
const n=CRAYON_F1_V23_RIMS.near,f=CRAYON_F1_V23_RIMS.far;
const patches:Readonly<Record<string,Partial<Wax>>> ={
  "naris-shadow-near":{
    d:n.forward+" C422 639 417 638 414 634 C410 632 407 639 405 644 "+
      "C402 651 398 650 395 648 C390 645 387 642 388 637Z",
    bounds:{x:385,y:619,width:42,height:36},
    colors:["#79504a","#281b1c","#b27865"],
    coverage:"opaque",deposition:"stroke-built",
    pressure:.77,spacing:4.2,markStrength:.24,angle:-23,
    underpaintTooth:.10,opaqueBurnish:.68,
    underpaintGradient:{light:"#a36b5c",shadow:"#25171a",
      focusX:.76,focusY:.47,radius:.84},outlineOpacity:0,edgeRoughness:.17,
  },
  "naris-shadow-far":{
    d:f.forward+" C462 633 460 640 457 645 C453 648 450 641 448 634Z",
    bounds:{x:445,y:612,width:20,height:38},
    colors:["#8a5d50","#3a2626","#ba8573"],
    coverage:"opaque",deposition:"stroke-built",
    pressure:.74,spacing:4.1,markStrength:.23,angle:75,
    underpaintTooth:.10,opaqueBurnish:.64,
    underpaintGradient:{light:"#b47e69",shadow:"#2c1d1e",
      focusX:.75,focusY:.66,radius:.78},outlineOpacity:0,edgeRoughness:.17,
  },
  "alar-roof-near":{
    d:"M372 626 C380 606 395 601 409 606 "+
      "C424 613 431 627 425 639 C424 640 422 637 423 633 "+
      n.reverse+" C383 642 376 637 372 626Z",
    bounds:{x:369,y:598,width:65,height:47},
    colors:["#d2a69a","#9a7066","#eabca9"],
    coverage:"open",deposition:"stroke-built",
    pressure:.70,spacing:5.2,markStrength:.39,angle:24,
    markLength:"short",strokeOrder:"patches",
    featherContacts:true,blendRadius:4.5,outlineOpacity:0,edgeRoughness:.19,
  },
  "alar-roof-far":{
    d:"M441 618 C445 605 455 602 461 608 "+
      "C471 616 472 628 466 639 C463 641 461 630 461 626 "+
      f.reverse+" C443 644 440 627 441 618Z",
    bounds:{x:438,y:599,width:36,height:47},
    colors:["#c9a197","#96716b","#e2b6a8"],
    coverage:"open",deposition:"stroke-built",
    pressure:.65,spacing:5.6,markStrength:.36,angle:66,
    markLength:"short",strokeOrder:"patches",
    featherContacts:true,blendRadius:4.8,outlineOpacity:0,edgeRoughness:.19,
  },
  "nasal-alar-attachment-near":{
    d:"M373 626 C380 609 394 603 405 608 "+
      "C423 612 429 623 428 634 C425 646 412 653 399 654 "+
      "C387 652 379 644 373 626Z",
    bounds:{x:370,y:602,width:61,height:55},
    colors:["#d3a49a","#96685f","#e2b1a1"],
    coverage:"open",deposition:"stroke-built",
    pressure:.52,spacing:6.3,markStrength:.33,angle:28,
    markLength:"short",strokeOrder:"patches",
    featherContacts:true,blendRadius:9.2,outlineOpacity:0,edgeRoughness:.20,
  },
  "nasal-alar-attachment-far":{
    d:"M440 618 C444 605 454 602 463 612 "+
      "C471 624 471 634 463 646 C451 648 443 637 440 618Z",
    bounds:{x:437,y:600,width:37,height:49},
    colors:["#c39b91","#8c6963","#d8ab9e"],
    coverage:"open",deposition:"stroke-built",
    pressure:.49,spacing:6.3,markStrength:.30,angle:65,
    markLength:"short",strokeOrder:"patches",
    featherContacts:true,blendRadius:8.0,outlineOpacity:0,edgeRoughness:.19,
  },
  "nose-subalar-contact":{
    d:"M385 630 C395 637 401 646 412 650 C423 653 432 648 440 643 "+
      "C445 640 448 635 451 630 C447 644 438 653 430 656 "+
      "C413 661 398 653 390 641 C387 638 385 634 385 630Z",
    bounds:{x:382,y:627,width:73,height:35},
    colors:["#ae8076","#80554e","#c89b8d"],
    coverage:"open",deposition:"stroke-built",
    pressure:.56,spacing:5.8,markStrength:.34,angle:-20,
    markLength:"short",strokeOrder:"patches",
    featherContacts:true,blendRadius:9.3,outlineOpacity:0,edgeRoughness:.19,
  },
  "nose-tip-underlight":{
    d:"M396 630 C406 634 416 644 429 646 C437 648 442 636 445 631 "+
      "C443 650 436 657 429 658 C416 656 404 643 396 630Z",
    bounds:{x:393,y:627,width:55,height:35},
    colors:["#bf9081","#8a5d54","#d9aa9a"],
    coverage:"open",deposition:"stroke-built",
    pressure:.54,spacing:5.9,markStrength:.36,angle:33,
    markLength:"short",strokeOrder:"patches",
    featherContacts:true,blendRadius:7.8,outlineOpacity:0,edgeRoughness:.18,
  },
};
export const CRAYON_F1_V23_IDS=Object.freeze(Object.keys(patches));
/** Replace only existing named wax; preserve all other strokes/frames. */
export function crayonF1NarisSourceOcclusion(
  elements:readonly CrayonElement[],
):CrayonElement[]{
  const seen=new Set<string>();
  const result=elements.map(el=>{
    if(!Object.prototype.hasOwnProperty.call(patches,el.id))return el;
    if(el.kind!=="wax"||seen.has(el.id))
      throw new RangeError("Invalid/double source naris "+el.id);
    seen.add(el.id);
    if(el.id==="naris-shadow-near"&&el.d===patches[el.id].d)
      throw new RangeError("Already occluded source naris");
    return {...el,...patches[el.id]};
  });
  if(seen.size!==CRAYON_F1_V23_IDS.length)
    throw new RangeError("Incomplete source alar geometry");
  return result;
}
