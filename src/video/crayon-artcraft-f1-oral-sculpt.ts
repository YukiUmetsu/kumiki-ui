import type {CrayonElement} from "../../registry/video/materials/crayon-scene";

type Wax=Extract<CrayonElement,{kind:"wax"}>;

/**
 * ArtCraft CC0 F1 V16: actual Chromium V15 revealed three pale ellipse-like
 * floating teeth in a straight mauve slash and a too-thin lower lip.
 * Source: the photographed 608x1082 Campbell CC0 projection, visible
 * mouth x352..484 y691..773. This is original edited SVG wax, not a
 * photo overlay or artificial vector sticker. No change to earlier modes.
 *
 * Rebuild local curved vermilion edge, three nonmirrored tooth contacts,
 * and the lower-lip volume. The mouth's overhanging inner upper edge is
 * laid AFTER the upper incisors: this is physical occlusion, not ink line.
 */
const patches:Readonly<Record<string,Partial<Wax>>>={
  "lip-upper":{
    d:"M352 746 C359 732 370 719 383 712 "+
      "C401 698 417 693 430 694 "+
      "C435 690 442 694 448 698 "+
      "C462 700 476 706 483 712 "+
      "C464 716 451 717 434 724 "+
      "C411 732 389 741 369 746 "+
      "C361 749 355 749 352 746Z",
    bounds:{x:348,y:690,width:141,height:63},
    colors:["#af6870","#71454e","#cc9190"],
    pressure:.54,spacing:6.5,markStrength:.19,
    blendRadius:8.5,featherContacts:true,
  },
  "labial-upper-value":{
    d:"M355 744 C373 720 392 708 406 701 "+
      "C419 696 427 692 434 695 "+
      "C444 693 458 699 468 704 "+
      "C475 708 480 709 481 712 "+
      "C457 713 440 720 422 727 "+
      "C400 735 373 746 355 744Z",
    bounds:{x:351,y:690,width:134,height:59},
    colors:["#985862","#6b4049","#bd8183"],
    pressure:.49,spacing:6.5,markStrength:.17,
    blendRadius:9.5,featherContacts:true,
  },
  "lip-cupid-tubercles":{
    d:"M395 719 C408 706 419 701 429 696 "+
      "C434 694 439 694 445 700 "+
      "C453 697 461 701 469 706 "+
      "C456 711 441 715 428 721 "+
      "C415 726 402 724 395 719Z",
    bounds:{x:391,y:691,width:83,height:38},
    colors:["#b98083","#8a575e","#d09892"],
    pressure:.28,spacing:7.4,markStrength:.13,
    blendRadius:8.2,featherContacts:true,
  },
  "dental-surface-left":{
    d:"M398 733 C401 729 405 725 410 725 "+
      "C415 725 415 728 412 732 "+
      "C408 736 402 737 398 733Z",
    bounds:{x:394,y:721,width:24,height:19},
    colors:["#978c88","#5c5559","#aea49b"],
    pressure:.69,spacing:4.9,markStrength:.06,
    underpaintTooth:.10,opaqueBurnish:.86,
    underpaintGradient:{light:"#b0a59f",shadow:"#575055",
      focusX:.35,focusY:.38,radius:.93},
    edgeRoughness:.05,outlineOpacity:0,
  },
  "dental-surface-center":{
    d:"M415 728 C417 722 425 719 433 719 "+
      "C440 718 439 724 434 727 "+
      "C427 732 420 732 415 728Z",
    bounds:{x:411,y:715,width:33,height:21},
    colors:["#a29791","#655c60","#b8aaa2"],
    pressure:.70,spacing:5.0,markStrength:.07,
    underpaintTooth:.10,opaqueBurnish:.86,
    underpaintGradient:{light:"#bcb0a6",shadow:"#60575b",
      focusX:.36,focusY:.36,radius:.91},
    edgeRoughness:.04,outlineOpacity:0,
  },
  "dental-surface-far":{
    d:"M439 721 C445 717 453 715 459 718 "+
      "C462 721 455 724 449 724 "+
      "C444 725 441 723 439 721Z",
    bounds:{x:436,y:712,width:28,height:16},
    colors:["#94887f","#5c5355","#aa9e97"],
    pressure:.68,spacing:5.0,markStrength:.06,
    underpaintTooth:.11,opaqueBurnish:.84,
    underpaintGradient:{light:"#aba099",shadow:"#554d51",
      focusX:.43,focusY:.35,radius:.9},
    edgeRoughness:.05,outlineOpacity:0,
  },
  "lip-lower-body-wax":{
    d:"M372 753 C392 754 411 744 432 738 "+
      "C456 731 474 724 480 719 "+
      "C475 733 461 748 443 756 "+
      "C418 766 394 769 381 761Z",
    bounds:{x:368,y:715,width:116,height:57},
    colors:["#d0a5a4","#a07b81","#e9bdb7"],
    pressure:.74,spacing:5.5,markStrength:.19,
    underpaintTooth:.18,opaqueBurnish:.56,
    underpaintGradient:{light:"#e1b8b3",shadow:"#957078",
      focusX:.58,focusY:.72,radius:1.04},
    edgeRoughness:.08,outlineOpacity:0,
  },
  "lip-lower":{
    d:"M355 749 C375 754 395 746 421 740 "+
      "C450 731 473 722 483 718 "+
      "C488 735 475 752 457 762 "+
      "C430 774 408 776 386 767 "+
      "C368 761 359 754 355 749Z",
    bounds:{x:350,y:714,width:142,height:65},
    colors:["#d4aaa9","#ad868c","#eac0ba"],
    pressure:.50,spacing:7.5,markStrength:.18,
    blendRadius:10.4,featherContacts:true,
  },
  "labial-lower-value":{
    d:"M357 749 C377 752 402 746 425 741 "+
      "C451 733 473 725 482 720 "+
      "C483 735 470 750 450 760 "+
      "C426 770 406 771 384 764Z",
    bounds:{x:352,y:716,width:135,height:58},
    colors:["#c29398","#9b7380","#ddb0b1"],
    pressure:.46,spacing:7.8,markStrength:.15,
    blendRadius:10.6,featherContacts:true,
  },
};

/** Source-rooted upper lip membrane partly occludes dental roots.
 * Clip to the mouth aperture, never a sticker on adjacent cheek.
 * Paint after ALL dental surfaces and before lower lip.
 */
const upperOverlap:Wax={
  kind:"wax",id:"upper-vermilion-incisor-overhang",
  parentId:"mouth-aperture-depth",clipToParent:true,
  coverage:"open",deposition:"stroke-built",
  timing:{start:231,end:295},
  d:"M390 738 C405 728 418 723 435 719 "+
    "C453 715 467 713 479 715 "+
    "C465 720 455 719 446 723 "+
    "C430 726 418 729 403 736 "+
    "C396 740 392 741 390 738Z",
  bounds:{x:386,y:712,width:97,height:31},
  colors:["#90505a","#603943","#b37677"],
  pressure:.52,spacing:5.4,markStrength:.16,
  blendRadius:3.0,featherContacts:true,
  outlineOpacity:0,edgeRoughness:.08,
};

export const CRAYON_F1_ORAL_SCULPT_IDS=Object.freeze([
  ...Object.keys(patches),upperOverlap.id,
] as const);

export function crayonF1SculptOralOcclusion(
  elements:readonly CrayonElement[],
):CrayonElement[]{
  const found=new Set<string>();
  const next:CrayonElement[]=[];
  let inserted=false;
  for(const e of elements){
    if(Object.prototype.hasOwnProperty.call(patches,e.id)){
      if(e.kind!=="wax"||found.has(e.id))
        throw new RangeError("Invalid duplicated oral wax anchor "+e.id);
      found.add(e.id);
      next.push({...e,...patches[e.id]});
    }else next.push(e);
    if(e.id==="dental-surface-far"){
      if(e.kind!=="wax"||inserted)
        throw new RangeError("Invalid F1 overhang attachment");
      inserted=true;
      next.push(upperOverlap);
    }
  }
  if(found.size!==Object.keys(patches).length||!inserted||
     elements.some(e=>e.id===upperOverlap.id))
    throw new RangeError("Missing or duplicated F1 oral structure");
  return next;
}
