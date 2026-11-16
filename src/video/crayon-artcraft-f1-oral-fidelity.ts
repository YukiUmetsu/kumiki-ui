import type {CrayonElement} from "../../registry/video/materials/crayon-scene";

type Wax=Extract<CrayonElement,{kind:"wax"}>;
type Contour=Extract<CrayonElement,{kind:"contour"}>;

/**
 * ArtCraft F1 native wax / source-space oral-fidelity candidate (V14).
 *
 * Source: Christopher Campbell CC0, frozen 608×1082 photographed projection.
 * The actual photographed mouth x351..485, y687..771 has a crescent-shaped
 * upper vermilion, a narrow oblique negative-space aperture, three partly
 * occluded *warm grey* incisor contacts and a plump rounded lower lip.
 * The previous source-volume study turned all four into a digital triangle,
 * straight slash and three independent grey lozenges.
 *
 * This OPT-IN correction preserves CRAYON1 original SVG geometry, semantic
 * elements, clip relationships, paper-tooth, camera/seed and reveal timing.
 * No filter, photo pixel overlay or generic symmetric lip primitives.
 * Geometry only constrains local source anatomy; art approval is separate.
 */
const wax:Readonly<Record<string,Partial<Wax>>>={
  "philtrum":{
    d:"M408 648 C416 657 421 674 423 690 "+
      "C430 697 438 697 444 691 "+
      "C444 672 449 653 453 642 "+
      "C451 662 453 688 445 701 "+
      "C429 703 418 697 415 682Z",
    bounds:{x:403,y:636,width:57,height:71},
    colors:["#b28c86","#826469","#d4aca0"],
    pressure:.30,spacing:8.1,markStrength:.12,
    blendRadius:10.5,featherContacts:true,
  },
  "lip-upper-body-wax":{
    d:"M365 738 C380 721 397 708 414 703 "+
      "C427 698 438 699 449 703 "+
      "C462 704 470 707 477 710 "+
      "C450 712 429 719 410 728 "+
      "C392 736 376 740 365 738Z",
    bounds:{x:362,y:696,width:119,height:48},
    colors:["#95636b","#663d45","#b67f81"],
    pressure:.78,spacing:5.4,markStrength:.20,
    underpaintTooth:.18,opaqueBurnish:.61,
    underpaintGradient:{
      light:"#ae7779",shadow:"#6a424a",focusX:.43,focusY:.35,radius:1.06,
    },
    edgeRoughness:.10,outlineOpacity:0,
  },
  "lip-upper":{
    d:"M350 746 C359 727 374 711 392 700 "+
      "C411 689 429 687 443 693 "+
      "C455 691 470 695 483 707 "+
      "C477 714 462 713 445 717 "+
      "C410 731 376 746 350 746Z",
    bounds:{x:345,y:685,width:143,height:65},
    colors:["#a16b74","#704850","#c18c8d"],
    pressure:.53,spacing:7.0,markStrength:.18,
    blendRadius:9.1,featherContacts:true,
  },
  "labial-upper-value":{
    d:"M352 744 C367 724 383 709 405 697 "+
      "C420 690 430 689 441 695 "+
      "C456 691 473 701 481 708 "+
      "C464 710 446 715 430 721 "+
      "C407 731 373 745 352 744Z",
    bounds:{x:347,y:687,width:137,height:60},
    colors:["#915963","#673f48","#b97d7f"],
    pressure:.52,spacing:6.4,markStrength:.17,
    blendRadius:9.2,featherContacts:true,
  },
  "lip-cupid-tubercles":{
    d:"M391 717 C405 706 415 698 424 697 "+
      "C430 693 435 693 441 697 "+
      "C451 693 461 697 470 705 "+
      "C449 707 430 715 410 724 "+
      "C400 727 394 724 391 717Z",
    bounds:{x:386,y:690,width:89,height:39},
    colors:["#b47c7e","#895d64","#cd9693"],
    pressure:.28,spacing:7.4,markStrength:.12,blendRadius:9.2,
    featherContacts:true,
  },
  "oral-opening":{
    d:"M351 746 C371 734 395 722 420 718 "+
      "C445 715 466 714 482 716 "+
      "C482 722 471 727 455 729 "+
      "C426 733 401 740 383 748 "+
      "C361 752 353 753 351 746Z",
    bounds:{x:347,y:710,width:143,height:48},
    colors:["#743f47","#39262d","#956166"],
    pressure:.58,spacing:5.3,markStrength:.18,
    blendRadius:2.6,featherContacts:true,
  },
  "mouth-aperture-depth":{
    d:"M353 747 C378 735 401 724 424 720 "+
      "C449 716 467 716 480 719 "+
      "C482 723 471 727 458 729 "+
      "C432 733 408 740 384 747 "+
      "C366 751 355 751 353 747Z",
    bounds:{x:349,y:714,width:135,height:44},
    colors:["#5a3238","#251b23","#74454d"],
    pressure:.91,spacing:4.1,markStrength:.16,
    underpaintTooth:.12,opaqueBurnish:.85,
    underpaintGradient:{
      light:"#6c3f45",shadow:"#24181e",focusX:.45,focusY:.28,radius:.91,
    },
    edgeRoughness:.04,outlineOpacity:0,
  },
  "dental-arch-connected-wax":{
    d:"M398 733 C405 724 422 719 437 718 "+
      "C453 715 462 716 470 718 "+
      "C461 726 445 732 427 735 "+
      "C411 738 400 737 398 733Z",
    bounds:{x:394,y:713,width:80,height:28},
    colors:["#745458","#3b292f","#8a6262"],
    pressure:.69,spacing:4.3,markStrength:.07,
    underpaintTooth:.07,opaqueBurnish:.87,
    underpaintGradient:{
      light:"#8c6969",shadow:"#332329",focusX:.5,focusY:.25,radius:.95,
    },
    edgeRoughness:.03,outlineOpacity:0,
  },
  "dental-surface-left":{
    d:"M397 730 C401 726 406 724 414 723 "+
      "C417 726 415 732 410 734 "+
      "C403 735 398 734 397 730Z",
    bounds:{x:394,y:720,width:26,height:18},
    colors:["#aaa09b","#7c7270","#c9bcb1"],
    pressure:.74,spacing:5.1,markStrength:.07,
    underpaintTooth:.09,opaqueBurnish:.91,
    underpaintGradient:{light:"#c3b9af",shadow:"#716564",focusX:.43,focusY:.32,radius:.94},
    edgeRoughness:.05,outlineOpacity:0,
  },
  "dental-surface-center":{
    d:"M415 724 C422 719 430 718 437 717 "+
      "C442 719 439 725 434 729 "+
      "C426 732 420 730 415 728Z",
    bounds:{x:412,y:713,width:32,height:22},
    colors:["#b6a9a1","#857c79","#d0c4b9"],
    pressure:.80,spacing:5.0,markStrength:.08,
    underpaintTooth:.08,opaqueBurnish:.92,
    underpaintGradient:{light:"#d1c3b7",shadow:"#77706e",focusX:.43,focusY:.31,radius:.91},
    edgeRoughness:.04,outlineOpacity:0,
  },
  "dental-surface-far":{
    d:"M438 718 C446 715 453 716 460 716 "+
      "C463 719 457 724 450 725 "+
      "C444 725 440 723 438 718Z",
    bounds:{x:435,y:712,width:29,height:17},
    colors:["#aca19a","#776c6a","#cabfb4"],
    pressure:.77,spacing:5.0,markStrength:.07,
    underpaintTooth:.09,opaqueBurnish:.90,
    underpaintGradient:{light:"#c7bcb3",shadow:"#706666",focusX:.46,focusY:.33,radius:.91},
    edgeRoughness:.06,outlineOpacity:0,
  },
  "lip-lower-body-wax":{
    d:"M370 752 C392 752 412 742 436 736 "+
      "C452 732 470 725 480 722 "+
      "C474 736 460 746 443 751 "+
      "C414 763 390 765 377 756Z",
    bounds:{x:365,y:719,width:119,height:50},
    colors:["#cba2a2","#a17d82","#e5bbb3"],
    pressure:.74,spacing:5.9,markStrength:.18,
    underpaintTooth:.17,opaqueBurnish:.57,
    underpaintGradient:{
      light:"#ddb1ad",shadow:"#956c72",focusX:.58,focusY:.71,radius:1.03,
    },
    edgeRoughness:.08,outlineOpacity:0,
  },
  "lip-lower":{
    d:"M355 748 C375 750 401 742 423 737 "+
      "C452 730 476 718 484 716 "+
      "C489 730 477 746 462 754 "+
      "C436 771 404 779 382 767 "+
      "C366 759 361 754 355 748Z",
    bounds:{x:350,y:713,width:141,height:68},
    colors:["#cba1a5","#a6818a","#e9c0bc"],
    pressure:.47,spacing:7.4,markStrength:.16,
    blendRadius:9.8,featherContacts:true,
  },
  "labial-lower-value":{
    d:"M355 748 C373 751 400 745 426 739 "+
      "C451 733 470 722 483 718 "+
      "C488 734 476 750 454 758 "+
      "C428 769 399 773 378 762 "+
      "C368 757 362 752 355 748Z",
    bounds:{x:350,y:716,width:141,height:62},
    colors:["#bd8f98","#956e78","#ddb0b2"],
    pressure:.45,spacing:7.7,markStrength:.15,
    blendRadius:10.2,featherContacts:true,
  },
  "lip-lower-core-shadow":{
    d:"M360 750 C386 753 403 747 430 739 "+
      "C452 733 473 723 482 720 "+
      "C476 740 457 750 441 755 "+
      "C417 761 384 764 370 756Z",
    bounds:{x:356,y:716,width:129,height:52},
    colors:["#c39493","#926e74","#dda7a2"],
    pressure:.31,spacing:8,markStrength:.12,
    blendRadius:11.2,featherContacts:true,
  },
  "lip-commissure-left":{
    d:"M348 745 C352 741 356 738 362 739 "+
      "C358 743 355 749 352 751Z",
    bounds:{x:346,y:735,width:20,height:20},
    colors:["#90686b","#57373c","#b88c89"],
    pressure:.44,spacing:5.5,markStrength:.12,blendRadius:3.4,
    featherContacts:true,
  },
  "lip-commissure-right":{
    d:"M473 713 C480 712 485 715 488 719 "+
      "C483 721 478 719 474 718Z",
    bounds:{x:470,y:709,width:21,height:16},
    colors:["#9b7270","#64454b","#b88a88"],
    pressure:.34,spacing:6.8,markStrength:.09,blendRadius:3.8,
    featherContacts:true,
  },
};

const waxRibs:Partial<Contour>={
  d:[
    "M374 751 C373 755 372 759 373 761",
    "M382 751 C381 755 381 757 380 759",
    "M391 749 C390 752 390 758 391 761",
    "M401 745 C400 751 401 755 401 760",
    "M411 742 C411 746 413 752 412 756",
    "M422 740 C421 744 424 748 423 752",
    "M435 737 C433 740 435 746 435 750",
    "M446 732 C446 735 446 742 447 744",
    "M456 729 C457 734 458 736 458 740",
    "M468 724 C470 729 470 732 470 734",
  ].join(" "),
  color:"#eac1bb",width:.30,opacity:.37,
  waxContact:"dry-wax",waxPressure:.40,
};

export const CRAYON_F1_ORAL_FIDELITY_IDS=Object.freeze(
  Object.keys(wax),
);

/** Strict against missing/duplicated named source-space anatomy.
 * No changes to any unrelated hair, eye, camera, face source landmark,
 * or the original two negative-control modes.
 */
export function crayonF1ReconstructOralContact(
  elements:readonly CrayonElement[],
):CrayonElement[]{
  const found=new Set<string>();
  const out=elements.map(e=>{
    if(e.id==="lip-lower-wax-ribs"){
      if(e.kind!=="contour"||found.has(e.id))
        throw new RangeError("Invalid or duplicate F1 vermilion wax rib");
      found.add(e.id);return {...e,...waxRibs} satisfies Contour;
    }
    if(!(e.id in wax))return e;
    if(e.kind!=="wax"||found.has(e.id))
      throw new RangeError("Invalid or duplicate F1 oral wax "+e.id);
    found.add(e.id);
    return {...e,...wax[e.id]};
  });
  for(const name of [...CRAYON_F1_ORAL_FIDELITY_IDS,"lip-lower-wax-ribs"])
    if(!found.has(name))throw new RangeError("Missing F1 oral wax "+name);
  return out;
}
