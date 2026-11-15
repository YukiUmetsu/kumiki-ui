import type {CrayonElement} from "../../registry/video/materials/crayon-scene";

type Wax=Extract<CrayonElement,{kind:"wax"}>;

/**
 * ArtCraft F1 volume study based on the same immutable CC0 Campbell
 * 608×1082 photographic screenshot as the eye reconstruction.
 *
 * The source's near nostril is a hooked *undercut in an attached alar wing*;
 * the far opening is a small foreshortened recess. Neither is an isolated
 * solid ink circle. The nearly-parted lips have a sloped three-dimensional
 * vermilion mass and shadowed, partially connected upper incisors.
 *
 * Shapes are original source-space SVG wax, not source pixels / post-fx.
 * The prior face is fully recoverable with midfaceForm:"baseline".
 */
const sourceWax:Record<string,Partial<Wax>>={
  "nose-tip":{
    d:"M380 605 C384 593 396 590 410 594 "+
      "C425 596 434 607 432 620 "+
      "C430 632 415 637 401 635 "+
      "C389 633 383 622 380 605Z",
    bounds:{x:376,y:586,width:60,height:54},
    blendRadius:5.9,pressure:.56,markStrength:.3,
    colors:["#d6ab99","#ab7d72","#f4cbb5"],
  },
  "nose-alar-near":{
    d:"M372 621 C382 613 391 610 401 615 "+
      "C411 618 418 626 422 640 "+
      "Q408 652 393 652 C382 650 375 639 372 621Z",
    bounds:{x:368,y:606,width:58,height:51},
    pressure:.54,markStrength:.32,blendRadius:7.1,
    colors:["#b68a7e","#855f61","#dca89a"],
  },
  "nose-alar-far":{
    d:"M438 608 C444 600 450 600 457 604 "+
      "C464 607 469 615 467 627 "+
      "C462 636 451 635 445 628Z",
    bounds:{x:433,y:597,width:42,height:44},
    pressure:.52,markStrength:.29,blendRadius:5.7,
    colors:["#b58779","#7f5b5a","#d9a396"],
  },
  "nasal-alar-attachment-near":{
    d:"M373 625 C378 616 389 608 398 608 "+
      "C410 605 424 613 430 626 "+
      "C431 641 417 654 405 656 "+
      "C387 658 377 641 373 625Z",
    bounds:{x:370,y:600,width:66,height:63},
    colors:["#9d7168","#624748","#c58f83"],
    featherContacts:true,blendRadius:7.2,pressure:.73,markStrength:.38,
  },
  "nasal-alar-attachment-far":{
    d:"M438 613 C441 602 450 598 458 603 "+
      "C467 608 471 619 466 630 "+
      "C463 644 451 647 445 638 "+
      "Q440 627 438 613Z",
    bounds:{x:434,y:597,width:41,height:56},
    colors:["#a07570","#684c4d","#c99087"],
    featherContacts:true,blendRadius:6.5,pressure:.65,markStrength:.28,
  },
  "naris-shadow-near":{
    d:"M387 635 C389 625 397 622 405 622 "+
      "C411 620 417 623 419 628 "+
      "C417 636 409 641 405 647 "+
      "C397 649 389 645 387 635Z",
    bounds:{x:384,y:618,width:39,height:33},
    colors:["#493032","#21171b","#81524d"],
    pressure:.92,spacing:4.2,markStrength:.32,
    underpaintTooth:.09,opaqueBurnish:.94,
    underpaintGradient:{
      light:"#68403d",shadow:"#1d161b",focusX:.57,focusY:.3,radius:.89,
    },
  },
  "naris-shadow-far":{
    d:"M448 632 C448 625 451 620 456 618 "+
      "C461 622 462 629 458 635 "+
      "Q452 642 448 632Z",
    bounds:{x:445,y:614,width:21,height:31},
    pressure:.91,spacing:4.3,markStrength:.27,
    underpaintTooth:.09,opaqueBurnish:.88,
  },
  "lip-upper":{
    d:"M350 744 C367 728 382 716 400 709 "+
      "C415 701 428 694 436 695 "+
      "C448 700 453 696 465 698 "+
      "C474 698 484 702 487 707 "+
      "C472 715 450 724 427 733 "+
      "C394 745 366 750 350 744Z",
    bounds:{x:345,y:688,width:147,height:66},
    colors:["#b77779","#754551","#dba09f"],
    pressure:.71,markStrength:.35,blendRadius:5.3,
    featherContacts:true,
  },
  "labial-upper-value":{
    d:"M355 740 C376 718 403 703 425 697 "+
      "C438 694 447 696 458 698 "+
      "C471 697 482 700 487 708 "+
      "C450 716 416 732 384 742Z",
    bounds:{x:350,y:691,width:142,height:56},
    pressure:.76,markStrength:.34,blendRadius:6.8,
    colors:["#955b64","#55343e","#c68a87"],
    featherContacts:true,
  },
  "oral-opening":{
    d:"M352 742 C371 733 394 720 415 716 "+
      "C438 709 464 706 485 711 "+
      "C484 720 472 726 450 730 "+
      "C410 738 376 749 354 748Z",
    bounds:{x:346,y:703,width:145,height:49},
    pressure:.68,blendRadius:3.2,markStrength:.34,
    featherContacts:true,
  },
  "mouth-aperture-depth":{
    d:"M353 745 C379 730 404 722 425 719 "+
      "C446 713 472 709 483 714 "+
      "C475 724 461 728 438 731 "+
      "C406 739 377 749 353 745Z",
    bounds:{x:348,y:707,width:140,height:46},
    pressure:.89,markStrength:.25,underpaintTooth:.11,
    colors:["#61393f","#291e24","#8f555b"],
  },
  "dental-surface-left":{
    d:"M391 732 C397 728 403 724 411 724 "+
      "C412 728 410 732 408 736 "+
      "C401 739 396 738 391 735Z",
    bounds:{x:389,y:719,width:25,height:22},
    colors:["#706663","#494144","#a1928b"],
    pressure:.87,markStrength:.11,underpaintTooth:.09,
  },
  "dental-surface-center":{
    d:"M414 723 C420 719 429 717 437 718 "+
      "C438 722 435 728 431 731 "+
      "C423 733 419 731 414 730Z",
    bounds:{x:410,y:714,width:31,height:23},
    colors:["#79706c","#55494c","#afa29a"],
    pressure:.89,markStrength:.12,underpaintTooth:.09,
  },
  "dental-surface-far":{
    d:"M438 717 C445 715 453 713 458 716 "+
      "C458 719 453 722 445 723 "+
      "Q440 724 438 721Z",
    bounds:{x:434,y:709,width:28,height:19},
    colors:["#7d7271","#55494d","#aca09a"],
    pressure:.88,markStrength:.1,underpaintTooth:.09,
  },
  "lip-lower":{
    d:"M354 743 C375 750 397 745 420 738 "+
      "C448 732 470 723 486 714 "+
      "C487 729 478 744 459 754 "+
      "C433 768 394 779 378 767 "+
      "C369 761 360 752 354 743Z",
    bounds:{x:349,y:709,width:141,height:70},
    colors:["#c68b90","#8a5662","#eeb9b4"],
    pressure:.69,spacing:7,markStrength:.34,
    blendRadius:4.8,featherContacts:true,
  },
  "labial-lower-value":{
    d:"M355 744 C381 754 398 744 421 739 "+
      "C448 731 476 721 485 715 "+
      "C488 730 475 752 454 761 "+
      "C426 774 387 775 369 761Z",
    bounds:{x:350,y:709,width:139,height:70},
    colors:["#b47a7d","#814c5b","#dda2a3"],
    pressure:.66,markStrength:.31,blendRadius:6.5,
    featherContacts:true,
  },
  "lip-lower-core-shadow":{
    d:"M360 746 C385 751 405 747 422 740 "+
      "C450 733 469 723 483 716 "+
      "C479 732 461 751 438 757 "+
      "C407 767 379 761 360 746Z",
    bounds:{x:355,y:711,width:132,height:59},
    pressure:.48,markStrength:.22,blendRadius:6.5,
  },
};

export const CRAYON_F1_RECONSTRUCTED_MIDFACE_IDS=Object.freeze(
  [...Object.keys(sourceWax),"dental-arch-connected-wax"] as string[],
);

/**
 * Draw order: background < attached nasal planes < recessed nostril;
 * upper lip < oral opening < arch undercoat < individual enamel contacts
 * < lower lip < hair curtain. Inherited frames stay unmodified.
 */
export function crayonF1ReconstructMidface(
  elements:readonly CrayonElement[],
):CrayonElement[]{
  const out:CrayonElement[]=[];
  let inserted=false;
  for(const element of elements){
    if(element.kind!=="wax"){out.push(element);continue;}
    const patch=sourceWax[element.id];
    if(element.id==="dental-surface-left"){
      if(inserted)throw new Error("Duplicate native dental undercoat");
      const dental:Wax={
        ...element,
        id:"dental-arch-connected-wax",
        d:"M390 731 C401 724 413 718 430 717 "+
          "C443 714 453 713 461 715 "+
          "C456 727 433 734 407 739 "+
          "Q395 739 390 731Z",
        bounds:{x:387,y:710,width:78,height:33},
        colors:["#716967","#484044","#ab9d96"],
        timing:{start:217,end:292},
        pressure:.84,spacing:4.5,markStrength:.09,
        opaqueBurnish:.87,underpaintTooth:.08,
        parentId:"mouth-aperture-depth",clipToParent:true,
      };
      out.push(dental);
      inserted=true;
    }
    out.push(patch?{...element,...patch}:element);
  }
  if(!inserted)throw new Error("ArtCraft source dental anchor unavailable");
  return out;
}
