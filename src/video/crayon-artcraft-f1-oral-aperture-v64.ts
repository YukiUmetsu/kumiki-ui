import type {CrayonElement} from "../../registry/video/materials/crayon-scene";

type Wax=Extract<CrayonElement,{kind:"wax"}>;
type Contour=Extract<CrayonElement,{kind:"contour"}>;

/**
 * ArtCraft F1 V64 — source-led oral aperture correction.
 *
 * The V63 3× native review exposed three pale, detached enamel lozenges and
 * an over-open digital smile. The CC0 source instead shows a narrow oblique
 * dark aperture, a connected low-contrast incisor glimpse and a fuller lower
 * vermilion with fine directional wax ribs.
 *
 * This version changes only the mouth region. It retains V63 facial geometry,
 * camera, eye/nose geometry, hair, paper, seed and timing. It is an opt-in
 * experiment; no photo pixels or generic ellipse stickers are introduced.
 */
const patches:Readonly<Record<string,Partial<Wax>>>={
  "mouth-aperture-depth":{
    d:"M365 742 C382 733 402 726 421 723 "+
      "C441 720 458 719 473 720 "+
      "C470 724 459 727 446 730 "+
      "C425 734 404 740 386 745 "+
      "C376 748 368 748 365 742Z",
    bounds:{x:361,y:717,width:115,height:32},
    colors:["#59343a","#271b22","#76464e"],
    pressure:.84,spacing:4.2,markStrength:.16,
    underpaintTooth:.10,opaqueBurnish:.78,
    underpaintGradient:{
      light:"#6b4247",shadow:"#24181f",focusX:.45,focusY:.28,radius:.92,
    },
    edgeRoughness:.04,outlineOpacity:0,
  },
  "dental-arch-connected-wax":{
    d:"M391 733 C402 727 418 723 435 721 "+
      "C450 719 462 720 469 722 "+
      "C459 728 445 732 430 735 "+
      "C413 738 399 738 391 733Z",
    bounds:{x:387,y:717,width:84,height:23},
    colors:["#685053","#3b2b32","#857071"],
    pressure:.62,spacing:4.5,markStrength:.05,
    underpaintTooth:.06,opaqueBurnish:.82,
    underpaintGradient:{
      light:"#8a6d6d",shadow:"#33252c",focusX:.5,focusY:.28,radius:.94,
    },
    edgeRoughness:.04,outlineOpacity:0,
  },
  "dental-surface-left":{
    d:"M396 731 C400 728 406 726 412 726 "+
      "C414 728 411 731 408 733 "+
      "C403 734 399 733 396 731Z",
    bounds:{x:393,y:724,width:21,height:10},
    colors:["#817875","#5d5558","#a59b93"],
    pressure:.55,spacing:4.8,markStrength:.04,
    underpaintTooth:.08,opaqueBurnish:.78,
    underpaintGradient:{
      light:"#a59b93",shadow:"#5b5255",focusX:.38,focusY:.32,radius:.92,
    },
    edgeRoughness:.06,outlineOpacity:0,
  },
  "dental-surface-center":{
    d:"M412 728 C418 724 426 722 434 722 "+
      "C437 724 433 728 428 730 "+
      "C421 732 416 731 412 728Z",
    bounds:{x:409,y:720,width:28,height:11},
    colors:["#8c817b","#665d60","#ada39a"],
    pressure:.56,spacing:4.9,markStrength:.04,
    underpaintTooth:.08,opaqueBurnish:.79,
    underpaintGradient:{
      light:"#ada39a",shadow:"#62595d",focusX:.4,focusY:.32,radius:.91,
    },
    edgeRoughness:.05,outlineOpacity:0,
  },
  "dental-surface-far":{
    d:"M435 724 C442 721 450 720 457 721 "+
      "C459 723 454 725 449 726 "+
      "C443 727 438 726 435 724Z",
    bounds:{x:432,y:719,width:27,height:8},
    colors:["#807772","#5c5457","#a0968f"],
    pressure:.52,spacing:4.9,markStrength:.035,
    underpaintTooth:.08,opaqueBurnish:.77,
    underpaintGradient:{
      light:"#a0968f",shadow:"#584f53",focusX:.44,focusY:.34,radius:.9,
    },
    edgeRoughness:.06,outlineOpacity:0,
  },
  "upper-vermilion-incisor-overhang":{
    d:"M393 735 C405 729 419 725 434 722 "+
      "C449 720 461 719 472 720 "+
      "C462 724 451 726 439 729 "+
      "C421 733 407 738 397 740 "+
      "C394 739 393 737 393 735Z",
    bounds:{x:390,y:717,width:83,height:24},
    colors:["#8b525b","#5f3841","#a96c72"],
    pressure:.48,spacing:5.2,markStrength:.11,
    blendRadius:3.0,featherContacts:true,
    edgeRoughness:.07,outlineOpacity:0,
  },
  "lip-upper":{
    colors:["#9a5d67","#693f48","#b77c82"],
    pressure:.49,spacing:6.7,markStrength:.16,
    blendRadius:8.8,featherContacts:true,
  },
  "labial-upper-value":{
    colors:["#8e5861","#653f48","#b87c81"],
    pressure:.44,spacing:6.5,markStrength:.14,
    blendRadius:9.5,featherContacts:true,
  },
  "lip-lower":{
    colors:["#c49a9e","#987680","#dfb4b5"],
    pressure:.45,spacing:7.6,markStrength:.14,
    blendRadius:10.4,featherContacts:true,
  },
  "labial-lower-value":{
    colors:["#bd8f98","#916c75","#d7abae"],
    pressure:.42,spacing:7.8,markStrength:.13,
    blendRadius:10.6,featherContacts:true,
  },
};

const lowerRibs:Partial<Contour>={
  d:[
    "M377 751 C377 754 378 757 378 759",
    "M386 753 C386 756 387 759 388 761",
    "M396 751 C396 755 398 758 398 761",
    "M407 747 C408 751 408 755 409 758",
    "M418 744 C419 748 420 751 421 755",
    "M430 741 C431 745 431 749 432 752",
    "M442 738 C443 742 443 745 444 748",
    "M453 734 C454 738 455 741 455 744",
    "M463 730 C465 733 465 737 466 740",
    "M472 725 C473 729 474 732 474 735",
    "M414 750 C415 753 416 756 416 759",
    "M437 746 C438 749 439 752 440 755",
  ].join(" "),
  color:"#e2b6b1",width:.46,opacity:.52,
  waxContact:"dry-wax",waxPressure:.52,
};

export const CRAYON_F1_ORAL_APERTURE_V64_IDS=Object.freeze([
  ...Object.keys(patches),"lip-lower-wax-ribs",
] as const);

/** Patch the existing oral wax in place; every non-mouth element is untouched. */
export function crayonF1RefineOralApertureV64(
  elements:readonly CrayonElement[],
):CrayonElement[]{
  const found=new Set<string>();
  const next=elements.map(element=>{
    if(element.id==="lip-lower-wax-ribs"){
      if(element.kind!=="contour"||found.has(element.id))
        throw new RangeError("Invalid or duplicated V64 lower-lip wax ribs");
      found.add(element.id);
      return {...element,...lowerRibs} satisfies Contour;
    }
    const patch=patches[element.id];
    if(!patch)return element;
    if(element.kind!=="wax"||found.has(element.id))
      throw new RangeError("Invalid or duplicated V64 oral wax "+element.id);
    found.add(element.id);
    return {...element,...patch} satisfies Wax;
  });
  for(const id of CRAYON_F1_ORAL_APERTURE_V64_IDS)
    if(!found.has(id))throw new RangeError("Missing V64 oral anchor "+id);
  return next;
}
