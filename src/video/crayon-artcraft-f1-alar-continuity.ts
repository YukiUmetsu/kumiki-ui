import type {CrayonElement} from "../../registry/video/materials/crayon-scene";

type Wax=Extract<CrayonElement,{kind:"wax"}>;

/**
 * ArtCraft F1 CC0-source nasal continuity study; explicitly EXPERIMENTAL.
 * In the immutable 608x1082 Campbell source screenshot, the near naris
 * x389..419/y622..648 is an inset under the lateral alar fold, not an
 * independently attached painted blob. The far naris x447..461/y616..639
 * is narrow and foreshortened. This overlays native CRAYON1 wax parts
 * on the previously preserved source-volume study; no image editing.
 *
 * Four named local wax planes are ordered under the two dark naris.
 * The two air-space paths get hooked, attached rims rather than
 * vertically symmetric dark ellipses. Distinct near/far constructions
 * preserve asymmetry, paper-tooth relief, and differentiated pressure.
 */
const corrections:Readonly<Record<string,Partial<Wax>>>={
  "naris-shadow-near":{
    d:"M385 635 C390 628 396 626 402 625 "+
      "C407 624 412 625 418 630 "+
      "C415 628 410 629 407 633 "+
      "C403 639 397 642 394 641 "+
      "C389 640 387 638 385 635Z",
    bounds:{x:382,y:621,width:40,height:25},
    colors:["#5f3d3a","#21181b","#8c5d53"],
    pressure:.90,spacing:4.3,markStrength:.28,
    underpaintTooth:.10,opaqueBurnish:.88,
    underpaintGradient:{
      light:"#6c4542",shadow:"#24181c",
      focusX:.25,focusY:.27,radius:.89,
    },
  },
  "naris-shadow-far":{
    d:"M447 629 C448 621 452 619 456 619 "+
      "C459 619 461 625 459 629 "+
      "C457 634 454 638 451 636 "+
      "C449 635 448 633 447 629Z",
    bounds:{x:444,y:616,width:20,height:24},
    colors:["#634442","#271c22","#875a52"],
    pressure:.84,spacing:4.5,markStrength:.22,
    underpaintTooth:.13,opaqueBurnish:.83,
    underpaintGradient:{
      light:"#72504a",shadow:"#281d22",
      focusX:.32,focusY:.27,radius:.95,
    },
  },
};

/** Soft cartilage flow first; narrow receding shadow second; naris
 * last, so the opening is embedded within a continuous alar fold.
 * The parent clip is the entire face, unlike standalone dark ovals.
 */
const planes:Readonly<Record<"near"|"far",readonly Wax[]>>={
  near:[
    {
      kind:"wax",id:"alar-roof-near",parentId:"face-outline",
      clipToParent:true,coverage:"open",deposition:"stroke-built",
      timing:{start:145,end:245},
      d:"M374 622 C379 614 389 608 398 609 "+
        "C410 609 418 616 423 628 "+
        "C421 640 412 645 402 647 "+
        "C393 647 387 642 382 637 "+
        "C389 642 397 641 404 636 "+
        "C410 631 407 624 399 620 "+
        "C391 617 383 619 374 622Z",
      bounds:{x:370,y:605,width:57,height:47},
      colors:["#ac8074","#745356","#d2a195"],
      pressure:.62,spacing:6.1,markStrength:.23,
      blendRadius:8.1,featherContacts:true,
      underpaintTooth:.11,outlineOpacity:0,edgeRoughness:.12,
      strokeOrder:"patches",markLength:"short",nibStyle:"dry",
    },
    {
      kind:"wax",id:"alar-septum-near",parentId:"face-outline",
      clipToParent:true,coverage:"open",deposition:"stroke-built",
      timing:{start:160,end:257},
      d:"M381 628 C390 619 398 620 405 624 "+
        "C411 630 411 637 406 641 "+
        "C401 647 395 648 389 643 "+
        "C395 648 406 645 412 640 "+
        "C418 635 414 626 408 622 "+
        "C398 617 388 621 381 628Z",
      bounds:{x:378,y:615,width:42,height:36},
      colors:["#926967","#5b454a","#be8c80"],
      pressure:.52,spacing:5.9,markStrength:.19,
      blendRadius:6.2,featherContacts:true,
      underpaintTooth:.10,outlineOpacity:0,edgeRoughness:.09,
      strokeOrder:"patches",markLength:"short",nibStyle:"dry",
    },
  ],
  far:[
    {
      kind:"wax",id:"alar-roof-far",parentId:"face-outline",
      clipToParent:true,coverage:"open",deposition:"stroke-built",
      timing:{start:146,end:245},
      d:"M439 613 C443 605 449 602 457 605 "+
        "C466 610 471 620 468 631 "+
        "C463 641 454 644 449 638 "+
        "C455 640 460 635 460 628 "+
        "C459 620 453 615 447 617 "+
        "C443 617 441 619 439 613Z",
      bounds:{x:436,y:599,width:36,height:48},
      colors:["#a27a72","#704f52","#c99587"],
      pressure:.55,spacing:6.3,markStrength:.20,
      blendRadius:7.6,featherContacts:true,
      underpaintTooth:.12,outlineOpacity:0,edgeRoughness:.11,
      strokeOrder:"patches",markLength:"short",nibStyle:"dry",
    },
    {
      kind:"wax",id:"alar-septum-far",parentId:"face-outline",
      clipToParent:true,coverage:"open",deposition:"stroke-built",
      timing:{start:163,end:256},
      d:"M445 616 C452 614 458 618 461 626 "+
        "C463 633 460 640 455 642 "+
        "C461 641 465 635 465 629 "+
        "C466 620 457 612 451 612 "+
        "C448 612 446 614 445 616Z",
      bounds:{x:441,y:608,width:28,height:37},
      colors:["#8c6663","#563e43","#b4857f"],
      pressure:.49,spacing:6.2,markStrength:.17,
      blendRadius:5.9,featherContacts:true,
      underpaintTooth:.10,outlineOpacity:0,edgeRoughness:.10,
      strokeOrder:"patches",markLength:"short",nibStyle:"dry",
    },
  ],
};

export const CRAYON_F1_ALAR_CONTINUITY_IDS=Object.freeze([
  "alar-roof-near","alar-septum-near","alar-roof-far","alar-septum-far",
] as const);

/**
 * Fail-closed: only apply to source-volume which already contains
 * the specifically authored naris elements. Fail on duplicated anchors.
 * No global color or compositing pass; all unrelated objects unchanged.
 */
export function crayonF1ConnectAlarUndercuts(
  elements:readonly CrayonElement[],
):CrayonElement[]{
  const seen=new Set<"naris-shadow-near"|"naris-shadow-far">();
  const out:CrayonElement[]=[];
  for(const el of elements){
    if(el.id!=="naris-shadow-near"&&el.id!=="naris-shadow-far"){
      out.push(el);continue;
    }
    if(el.kind!=="wax"||seen.has(el.id))
      throw new RangeError("Duplicated or invalid source alar "+el.id);
    seen.add(el.id);
    const side=el.id==="naris-shadow-near"?"near":"far";
    out.push(...planes[side],{...el,...corrections[el.id]});
  }
  if(seen.size!==2)
    throw new RangeError("Missing source alar continuity anchors");
  return out;
}
