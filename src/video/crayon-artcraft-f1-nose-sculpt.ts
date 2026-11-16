import type {CrayonElement} from "../../registry/video/materials/crayon-scene";

type Wax=Extract<CrayonElement,{kind:"wax"}>;

/**
 * ArtCraft F1 V17 / real CC0 608x1082 source x340..492,y570..683.
 *
 * The nose is not two stamped circles: broad luminous bone-to-tip,
 * a projecting near alar hood hiding a hooked recess, a compressed
 * far alar margin and one continuous septal underside connecting them.
 * Prior V13 native Chromium shows separate oval dark stickers on a
 * planar flesh rectangle; all earlier V16 oral / V13 nasal / eye /
 * jaw / hair controls must remain byte-for-byte available.
 *
 * 11 semantically connected, asymmetrical original native CRAYON1 wax
 * forms are re-authored: no mirror copies, pixmap, photo filter, smooth
 * geometric proxy, or opacity shortcuts; local dry/wet tooth retained.
 */
const patches:Readonly<Record<string,Partial<Wax>>>={
  "nose-tip":{
    d:"M376 599 C391 584 404 580 414 584 "+
      "C427 579 443 585 454 600 "+
      "C464 614 459 624 451 631 "+
      "C439 638 427 642 418 650 "+
      "C405 654 386 648 375 637 "+
      "C366 628 369 610 376 599Z",
    bounds:{x:365,y:577,width:101,height:80},
    colors:["#d6ad9f","#ab827b","#f1c7b0"],
    coverage:"open",underpaintTooth:undefined,opaqueBurnish:undefined,
    pressure:.44,spacing:8.1,markStrength:.17,
    featherContacts:true,blendRadius:12.3,
    outlineOpacity:0,edgeRoughness:.13,
  },
  "nose-alar-near":{
    d:"M370 628 C374 616 382 611 393 609 "+
      "C405 608 418 614 425 625 "+
      "C427 640 418 648 405 655 "+
      "C388 655 377 642 370 628Z",
    bounds:{x:366,y:604,width:64,height:57},
    colors:["#bd9187","#926b67","#d6a79c"],
    coverage:"open",underpaintTooth:undefined,opaqueBurnish:undefined,
    pressure:.46,spacing:7.3,markStrength:.18,
    featherContacts:true,blendRadius:8.7,
    outlineOpacity:0,edgeRoughness:.11,
  },
  "nose-alar-far":{
    d:"M441 609 C448 600 456 600 465 608 "+
      "C474 618 472 628 465 638 "+
      "C460 642 452 643 448 636 "+
      "C442 629 441 619 441 609Z",
    bounds:{x:437,y:595,width:39,height:53},
    colors:["#b7887f","#865d5c","#d2a096"],
    coverage:"open",underpaintTooth:undefined,opaqueBurnish:undefined,
    pressure:.42,spacing:7.8,markStrength:.16,
    featherContacts:true,blendRadius:8.2,
    outlineOpacity:0,edgeRoughness:.12,
  },
  "nasal-alar-attachment-near":{
    d:"M374 620 C382 610 395 604 408 609 "+
      "C421 614 427 628 426 640 "+
      "C421 653 407 661 395 659 "+
      "C383 657 377 645 374 632 "+
      "C378 643 388 651 398 652 "+
      "C416 649 421 631 412 622 "+
      "C401 611 389 612 374 620Z",
    bounds:{x:371,y:601,width:61,height:63},
    colors:["#ab7b72","#745356","#ca988d"],
    coverage:"open",underpaintTooth:undefined,opaqueBurnish:undefined,
    pressure:.51,spacing:7.0,markStrength:.20,
    featherContacts:true,blendRadius:8.6,
    outlineOpacity:0,edgeRoughness:.13,
  },
  "nasal-alar-attachment-far":{
    d:"M440 615 C447 601 459 601 467 613 "+
      "C473 622 470 636 462 643 "+
      "C453 651 445 641 443 633 "+
      "C446 641 454 644 460 637 "+
      "C466 629 461 616 454 613 "+
      "C450 609 444 612 440 615Z",
    bounds:{x:437,y:599,width:38,height:57},
    colors:["#a77e73","#735253","#c39388"],
    coverage:"open",underpaintTooth:undefined,opaqueBurnish:undefined,
    pressure:.46,spacing:7.3,markStrength:.16,
    featherContacts:true,blendRadius:8.1,
    outlineOpacity:0,edgeRoughness:.12,
  },
  "alar-roof-near":{
    d:"M377 622 C382 609 393 607 403 611 "+
      "C416 612 425 621 426 632 "+
      "C421 637 416 637 411 636 "+
      "C413 631 411 625 405 623 "+
      "C394 618 384 619 377 622Z",
    bounds:{x:374,y:604,width:56,height:37},
    colors:["#d0a095","#a37870","#e4b4a5"],
    coverage:"open",underpaintTooth:undefined,opaqueBurnish:undefined,
    pressure:.53,spacing:6.6,markStrength:.19,
    featherContacts:true,blendRadius:6.8,
    outlineOpacity:0,edgeRoughness:.11,
  },
  "alar-septum-near":{
    d:"M401 624 C411 618 418 625 424 636 "+
      "C429 647 436 647 443 639 "+
      "C442 653 434 660 425 658 "+
      "C415 655 409 641 401 624Z",
    bounds:{x:398,y:614,width:49,height:48},
    colors:["#c1948a","#8a625f","#e0b2a7"],
    coverage:"open",underpaintTooth:undefined,opaqueBurnish:undefined,
    pressure:.39,spacing:7.0,markStrength:.15,
    featherContacts:true,blendRadius:7.7,
    outlineOpacity:0,edgeRoughness:.08,
  },
  "alar-roof-far":{
    d:"M439 617 C444 605 452 602 461 606 "+
      "C469 612 472 623 470 632 "+
      "C468 639 462 641 455 643 "+
      "C464 635 466 628 461 622 "+
      "C456 614 447 612 439 617Z",
    bounds:{x:436,y:600,width:38,height:47},
    colors:["#c89b90","#936c66","#dcaea2"],
    coverage:"open",underpaintTooth:undefined,opaqueBurnish:undefined,
    pressure:.48,spacing:6.8,markStrength:.17,
    featherContacts:true,blendRadius:7.0,
    outlineOpacity:0,edgeRoughness:.10,
  },
  "alar-septum-far":{
    d:"M446 619 C452 612 460 617 463 626 "+
      "C464 637 460 642 455 647 "+
      "C463 646 468 636 468 626 "+
      "C466 615 455 608 446 619Z",
    bounds:{x:443,y:606,width:28,height:44},
    colors:["#af837b","#795553","#cb9d90"],
    coverage:"open",underpaintTooth:undefined,opaqueBurnish:undefined,
    pressure:.37,spacing:7.1,markStrength:.14,
    featherContacts:true,blendRadius:7.0,
    outlineOpacity:0,edgeRoughness:.09,
  },
  "naris-shadow-near":{
    d:"M388 635 C393 629 400 624 407 624 "+
      "C415 622 420 625 423 630 "+
      "C420 635 415 635 414 631 "+
      "C407 628 405 635 403 640 "+
      "C400 646 396 647 393 644 "+
      "C390 642 389 638 388 635Z",
    bounds:{x:385,y:621,width:41,height:29},
    colors:["#583331","#201a1d","#8b574c"],
    coverage:"opaque",pressure:.88,spacing:4.1,
    markStrength:.27,underpaintTooth:.11,opaqueBurnish:.87,
    underpaintGradient:{light:"#794542",shadow:"#23191b",
      focusX:.35,focusY:.45,radius:.94},
    outlineOpacity:0,edgeRoughness:.05,
  },
  "naris-shadow-far":{
    d:"M447 628 C447 622 450 617 455 617 "+
      "C460 617 462 625 461 632 "+
      "C460 637 456 642 452 641 "+
      "C448 639 447 633 447 628Z",
    bounds:{x:444,y:613,width:22,height:31},
    colors:["#67433d","#2a1e21","#956359"],
    coverage:"opaque",pressure:.84,spacing:4.2,
    markStrength:.24,underpaintTooth:.10,opaqueBurnish:.82,
    underpaintGradient:{light:"#81534c",shadow:"#291c1f",
      focusX:.28,focusY:.34,radius:.91},
    outlineOpacity:0,edgeRoughness:.06,
  },
};
export const CRAYON_F1_NOSE_SCULPT_IDS=Object.freeze(Object.keys(patches));

/** No node-budget increase, no modification to original V13–V16 controls. */
export function crayonF1SculptNasalCartilage(
  elements:readonly CrayonElement[],
):CrayonElement[]{
  const seen=new Set<string>();
  const result=elements.map(e=>{
    if(!Object.prototype.hasOwnProperty.call(patches,e.id))return e;
    if(e.kind!=="wax"||seen.has(e.id))
      throw new RangeError("Invalid or duplicated F1 nasal region "+e.id);
    seen.add(e.id);
    return {...e,...patches[e.id]};
  });
  if(seen.size!==Object.keys(patches).length)
    throw new RangeError("Missing F1 nasal cartilage wax features");
  return result;
}
