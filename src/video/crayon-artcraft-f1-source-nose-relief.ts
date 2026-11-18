import type {CrayonElement} from "../../registry/video/materials/crayon-scene";
type Wax=Extract<CrayonElement,{kind:"wax"}>;

/** ArtCraft F1 V24 original source-observed attached nasal light planes.
 * CC0 Campbell photo 608×1082; V23 native preview run 43814285587.
 *
 * Important source observations, median RGB in local 7×7 patches:
 * (386,615) [242,203,182] / previous native [201,155,142].
 * (415,614) [183,138,115] / previous native [205,160,145].
 * (434,608) [164,128,117] / previous native [211,171,153].
 * (405,631) [29,4,4] / previous native [140,103,93].
 * (427,644) [149,97,75] / previous native [184,138,125].
 *
 * The high left nasal bulb and right dark sidewall require opposite
 * value changes, not a homogeneous color or bigger nostril stickers.
 * Build the convex illuminated bulb first, attach the far-side plane
 * and columella, preserve V23 exact cavity/roof reverse cubic paths.
 * Original CRAYON1 feathered stroke deposition over common paper tooth;
 * no source pixels embedded, no raster textures, no new nodes.
 * This remains an unapproved, reversible source study.
 */
export const CRAYON_F1_V24_SOURCE_PATCHES=Object.freeze({
  noseBulbHigh:{x:375,y:594,width:38,height:40,rgb:[242,203,182]},
  farSidewall:{x:420,y:584,width:40,height:57,rgb:[164,128,117]},
  subalarTurn:{x:398,y:626,width:48,height:36,rgb:[149,97,75]},
} as const);

const surfaces:Readonly<Record<string,Partial<Wax>>> = {
  // Hold the root-to-tip tube inside source nose, not long dark cheek stripe.
  "nose-dorsum":{
    d:"M356 531 C368 526 376 545 382 564 "+
      "C390 585 400 594 417 605 "+
      "C429 616 427 629 417 632 "+
      "C397 630 383 614 372 592 "+
      "C363 571 358 545 356 531Z",
    bounds:{x:352,y:527,width:80,height:111},
    colors:["#e8c3b3","#c3958b","#f8d8c1"],
    coverage:"open",deposition:"stroke-built",nibStyle:"dry",
    pressure:.73,spacing:5.1,markStrength:.44,angle:53,
    featherContacts:true,blendRadius:12.0,
    strokeOrder:"patches",markLength:"short",
    outlineOpacity:0,edgeRoughness:.16,
  },
  "nose-tip":{
    // Convex lit pad grows FROM the dorsal shaft, not a new pale disc.
    d:"M371 610 C380 596 392 588 405 590 "+
      "C420 590 433 602 436 616 "+
      "C434 629 420 633 409 632 "+
      "C390 631 376 628 371 618 "+
      "C368 616 369 613 371 610Z",
    bounds:{x:367,y:585,width:73,height:52},
    colors:["#f0cab7","#cca092","#ffe0c5"],
    coverage:"open",deposition:"stroke-built",nibStyle:"dry",
    pressure:.78,spacing:4.8,markStrength:.47,angle:-17,
    featherContacts:true,blendRadius:8.1,
    strokeOrder:"patches",markLength:"short",
    outlineOpacity:0,edgeRoughness:.14,
  },
  "nose-sidewall-form":{
    // Source right dorsum (around x420..451), a darker warm skin turn
    // across the bulb; avoid V21's erroneous long left-cheek slash.
    d:"M405 573 C419 577 431 594 438 603 "+
      "C446 614 455 617 462 627 "+
      "C459 637 448 643 440 638 "+
      "C432 629 419 614 414 604 "+
      "C408 589 405 580 405 573Z",
    bounds:{x:402,y:570,width:64,height:76},
    colors:["#b58b83","#896863","#d0a499"],
    coverage:"open",deposition:"stroke-built",nibStyle:"dry",
    pressure:.68,spacing:5.2,markStrength:.40,angle:49,
    featherContacts:true,blendRadius:10.7,
    strokeOrder:"patches",markLength:"short",
    outlineOpacity:0,edgeRoughness:.19,
  },
  "nose-septal-transition":{
    // Columella and lower sidewall make *one continuous undercut*.
    // Restrict strongest ochre to below projecting tip, not cheeks.
    d:"M410 623 C418 628 426 640 434 645 "+
      "C442 645 447 635 450 629 "+
      "C446 646 438 658 429 661 "+
      "C420 659 414 651 410 642 "+
      "C409 635 410 628 410 623Z",
    bounds:{x:407,y:620,width:47,height:44},
    colors:["#ac7d6d","#79524d","#cf9e8c"],
    coverage:"open",deposition:"stroke-built",nibStyle:"dry",
    pressure:.75,spacing:4.9,markStrength:.51,angle:28,
    featherContacts:true,blendRadius:7.7,
    strokeOrder:"patches",markLength:"short",
    outlineOpacity:0,edgeRoughness:.15,
  },
  "nose-tip-reflected-light":{
    // The source left alar/top pad is genuinely illuminated,
    // [242,203,182] around x386,y615; previous native ~[201,155,142].
    d:"M371 609 C379 597 391 593 404 593 "+
      "C416 594 422 602 425 611 "+
      "C417 622 406 628 389 627 "+
      "C375 626 369 617 371 609Z",
    bounds:{x:368,y:590,width:62,height:41},
    colors:["#f0ccbb","#d5a699","#ffe3cc"],
    coverage:"open",deposition:"stroke-built",nibStyle:"dry",
    pressure:.79,spacing:4.6,markStrength:.49,angle:-23,
    featherContacts:true,blendRadius:6.1,
    strokeOrder:"patches",markLength:"short",
    outlineOpacity:0,edgeRoughness:.14,
  },
  "nose-alar-near":{
    d:"M370 626 C378 608 392 601 404 606 "+
      "C418 613 425 624 428 636 "+
      "C422 649 410 654 400 652 "+
      "C382 647 374 634 370 626Z",
    bounds:{x:367,y:599,width:64,height:57},
    colors:["#d6a99b","#9e6d63","#edbdaa"],
    coverage:"open",deposition:"stroke-built",nibStyle:"dry",
    pressure:.72,spacing:5.2,markStrength:.46,angle:22,
    featherContacts:true,blendRadius:7.4,
    strokeOrder:"patches",markLength:"short",
    outlineOpacity:0,edgeRoughness:.16,
  },
  "nose-alar-far":{
    d:"M436 615 C443 600 453 599 462 608 "+
      "C471 619 474 632 466 640 "+
      "C457 650 446 640 442 632 "+
      "C438 624 437 619 436 615Z",
    bounds:{x:434,y:597,width:42,height:55},
    colors:["#b58b82","#815e57","#d9aca0"],
    coverage:"open",deposition:"stroke-built",nibStyle:"dry",
    pressure:.64,spacing:5.5,markStrength:.40,angle:69,
    featherContacts:true,blendRadius:7.3,
    strokeOrder:"patches",markLength:"short",
    outlineOpacity:0,edgeRoughness:.17,
  },
};
export const CRAYON_F1_V24_SURFACE_IDS=Object.freeze(Object.keys(surfaces));

export function crayonF1SourceTonalRelief(
  elements:readonly CrayonElement[],
):CrayonElement[]{
  const found=new Set<string>();
  const result=elements.map(el=>{
    if(!Object.prototype.hasOwnProperty.call(surfaces,el.id))return el;
    if(el.kind!=="wax"||found.has(el.id))
      throw new RangeError("Duplicated/non-wax source nasal relief "+el.id);
    found.add(el.id);
    if(el.id==="nose-tip"&&el.d===surfaces[el.id].d)
      throw new RangeError("Source nasal relief already constructed");
    return {...el,...surfaces[el.id]};
  });
  if(found.size!==CRAYON_F1_V24_SURFACE_IDS.length)
    throw new RangeError("Missing photographed nasal light planes");
  return result;
}
