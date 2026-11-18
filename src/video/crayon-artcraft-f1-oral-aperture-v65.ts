import type {CrayonElement} from "../../registry/video/materials/crayon-scene";

type Wax=Extract<CrayonElement,{kind:"wax"}>;
type Contour=Extract<CrayonElement,{kind:"contour"}>;

/**
 * ArtCraft F1 V65 — deepen the oral cavity and restore tactile vermilion.
 *
 * V64 narrowed the aperture and reduced the enamel highlights, but its native
 * 3x review still showed a pale central enamel band with no source-dark core.
 * V65 keeps the aperture silhouette and parent clipping, narrows the connected
 * enamel underlayer, lowers tooth value, and reduces excessive lip feathering.
 * It is a local, reversible wax-material correction; no other facial region,
 * camera, paper, seed, timing or 300-frame animation is changed.
 */
const patches:Readonly<Record<string,Partial<Wax>>>={
  "mouth-aperture-depth":{
    coverage:"opaque",deposition:"stroke-built",
    colors:["#342129","#1b1118","#57343d"],
    pressure:.98,spacing:4.0,markStrength:.17,
    underpaintTooth:.045,opaqueBurnish:.98,
    underpaintGradient:{
      light:"#21131a",shadow:"#4a2c35",
      focusX:.5,focusY:.48,radius:.9,
    },
    blendRadius:1.05,featherContacts:true,
    edgeRoughness:.06,outlineOpacity:0,
  },
  "dental-arch-connected-wax":{
    d:"M393 730 C404 725 419 722 435 720 "+
      "C449 719 460 720 467 722 "+
      "C457 726 444 729 430 731 "+
      "C414 733 401 733 393 730Z",
    bounds:{x:390,y:718,width:80,height:15},
    coverage:"opaque",deposition:"stroke-built",
    colors:["#5b4d51","#3c3037","#817176"],
    pressure:.72,spacing:4.5,markStrength:.06,
    underpaintTooth:.045,opaqueBurnish:.88,
    underpaintGradient:{
      light:"#716166",shadow:"#403139",
      focusX:.5,focusY:.35,radius:.9,
    },
    edgeRoughness:.06,outlineOpacity:0,
  },
  "dental-surface-left":{
    colors:["#716a67","#51484b","#928881"],
    pressure:.65,spacing:4.7,markStrength:.05,
    underpaintTooth:.05,opaqueBurnish:.84,
    underpaintGradient:{
      light:"#928881",shadow:"#51464c",
      focusX:.38,focusY:.32,radius:.92,
    },
    edgeRoughness:.06,outlineOpacity:0,
  },
  "dental-surface-center":{
    colors:["#7a726e","#564c50","#9a9087"],
    pressure:.67,spacing:4.8,markStrength:.055,
    underpaintTooth:.05,opaqueBurnish:.86,
    underpaintGradient:{
      light:"#9a9087",shadow:"#564b50",
      focusX:.4,focusY:.32,radius:.91,
    },
    edgeRoughness:.05,outlineOpacity:0,
  },
  "dental-surface-far":{
    colors:["#6f6864","#4e4549","#8d837c"],
    pressure:.63,spacing:4.8,markStrength:.05,
    underpaintTooth:.05,opaqueBurnish:.83,
    underpaintGradient:{
      light:"#8d837c",shadow:"#4c4348",
      focusX:.44,focusY:.34,radius:.9,
    },
    edgeRoughness:.06,outlineOpacity:0,
  },
  "upper-vermilion-incisor-overhang":{
    pressure:.5,spacing:4.8,markStrength:.13,
    blendRadius:1.8,featherContacts:true,
    edgeRoughness:.09,
  },
  "lip-upper":{
    pressure:.51,spacing:6.0,markStrength:.18,
    blendRadius:6.8,featherContacts:true,
  },
  "labial-upper-value":{
    pressure:.46,spacing:6.0,markStrength:.16,
    blendRadius:7.2,featherContacts:true,
  },
  "lip-lower":{
    pressure:.47,spacing:6.8,markStrength:.16,
    blendRadius:7.8,featherContacts:true,
  },
  "labial-lower-value":{
    pressure:.44,spacing:7.0,markStrength:.15,
    blendRadius:7.8,featherContacts:true,
  },
};

const lowerRibs:Partial<Contour>={
  d:[
    "M377 751 C377 754 378 757 379 760",
    "M386 753 C386 756 387 759 389 762",
    "M396 751 C396 755 398 758 399 762",
    "M407 747 C408 751 409 755 410 759",
    "M418 744 C419 748 420 752 422 756",
    "M430 741 C431 745 432 749 433 753",
    "M442 738 C443 742 444 746 445 749",
    "M453 734 C454 738 455 742 456 745",
    "M463 730 C465 734 466 737 467 741",
    "M472 725 C473 729 474 733 475 736",
    "M414 750 C415 754 416 757 417 761",
    "M437 746 C438 750 439 753 441 756",
    "M389 758 C390 760 391 762 392 764",
    "M449 747 C450 750 451 753 452 756",
  ].join(" "),
  color:"#d8aaa6",width:.58,opacity:.62,
  waxContact:"dry-wax",waxPressure:.58,
};

export const CRAYON_F1_ORAL_APERTURE_V65_IDS=Object.freeze([
  ...Object.keys(patches),"lip-lower-wax-ribs",
] as const);

/** Patch only the existing V64 oral wax; all non-mouth nodes retain identity. */
export function crayonF1DeepenOralCavityV65(
  elements:readonly CrayonElement[],
):CrayonElement[]{
  const found=new Set<string>();
  const next=elements.map(element=>{
    if(element.id==="lip-lower-wax-ribs"){
      if(element.kind!=="contour"||found.has(element.id))
        throw new RangeError("Invalid or duplicated V65 lower-lip wax ribs");
      found.add(element.id);
      return {...element,...lowerRibs} satisfies Contour;
    }
    const patch=patches[element.id];
    if(!patch)return element;
    if(element.kind!=="wax"||found.has(element.id))
      throw new RangeError("Invalid or duplicated V65 oral wax "+element.id);
    found.add(element.id);
    return {...element,...patch} satisfies Wax;
  });
  for(const id of CRAYON_F1_ORAL_APERTURE_V65_IDS)
    if(!found.has(id))throw new RangeError("Missing V65 oral anchor "+id);
  return next;
}
