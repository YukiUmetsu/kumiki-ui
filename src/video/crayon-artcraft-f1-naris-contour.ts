import type {CrayonElement} from "../../registry/video/materials/crayon-scene";
type Wax=Extract<CrayonElement,{kind:"wax"}>;

/** V19 source-projected native CRAYON1 nasal contour; experimental, not approved.
 * Campbell CC0 608x1082 photograph, x340..492/y570..683: dark near hooked
 * nostril turns under alar hood; far side is narrower and foreshortened.
 * We reconstruct a shared cubic skin/shadow boundary, not add opaque
 * pale circles (rejected V18). V17/V18, other anatomy and timing are kept.
 * Neither structural tests nor screenshot creation imply artist sign-off.
 */
export const CRAYON_F1_SHARED_NARIS_RIMS=Object.freeze({
  near:{
    forward:"M388 632 C395 621 408 619 420 629",
    reverse:"C408 619 395 621 388 632",
  },
  far:{
    forward:"M446 627 C449 616 455 616 460 626",
    reverse:"C455 616 449 616 446 627",
  },
});
const n=CRAYON_F1_SHARED_NARIS_RIMS.near;
const f=CRAYON_F1_SHARED_NARIS_RIMS.far;
const patches:Readonly<Record<string,Partial<Wax>>>={
  "nasal-alar-attachment-near":{
    d:"M371 621 C380 608 393 601 408 606 "+
      "C423 612 430 625 425 638 "+
      "C415 651 400 655 388 649 "+
      "C378 641 374 629 371 621Z",
    bounds:{x:367,y:599,width:65,height:60},
    coverage:"open",pressure:.46,spacing:6.6,markStrength:.25,
    featherContacts:true,blendRadius:9.8,outlineOpacity:0,edgeRoughness:.15,
  },
  "nasal-alar-attachment-far":{
    d:"M439 616 C445 604 454 603 463 611 "+
      "C471 622 469 633 461 644 "+
      "C451 647 444 639 442 629 "+
      "C439 625 438 621 439 616Z",
    bounds:{x:436,y:599,width:38,height:50},
    coverage:"open",pressure:.41,spacing:6.7,markStrength:.22,
    featherContacts:true,blendRadius:8.2,outlineOpacity:0,edgeRoughness:.14,
  },
  // Exact same cubic control points in reverse: a true joined wax boundary.
  "naris-shadow-near":{
    d:n.forward+" C421 635 415 640 410 643 "+
      "C404 648 394 643 388 632Z",
    bounds:{x:384,y:617,width:40,height:35},
    colors:["#67403c","#211b1d","#88574f"],coverage:"opaque",
    pressure:.89,spacing:4.1,markStrength:.31,
    underpaintTooth:.12,opaqueBurnish:.84,
    underpaintGradient:{light:"#875c51",shadow:"#21191c",
      focusX:.36,focusY:.57,radius:.89},
    outlineOpacity:0,edgeRoughness:.11,
  },
  "naris-shadow-far":{
    d:f.forward+" C462 633 458 641 454 642 "+
      "C450 641 447 635 446 627Z",
    bounds:{x:443,y:613,width:21,height:32},
    colors:["#71504a","#302226","#91675c"],coverage:"opaque",
    pressure:.86,spacing:3.9,markStrength:.29,
    underpaintTooth:.12,opaqueBurnish:.81,
    underpaintGradient:{light:"#95695d",shadow:"#281e23",
      focusX:.3,focusY:.48,radius:.87},
    outlineOpacity:0,edgeRoughness:.12,
  },
  "alar-roof-near":{
    d:"M373 624 C381 606 393 602 408 607 "+
      "C424 612 430 623 423 635 "+
      "C421 636 420 631 420 629 "+n.reverse+
      " C382 634 377 631 373 624Z",
    bounds:{x:369,y:600,width:64,height:39},
    colors:["#d6a99b","#9d726c","#e7bbab"],coverage:"open",
    pressure:.61,spacing:5.4,markStrength:.29,
    featherContacts:true,blendRadius:5.1,outlineOpacity:0,edgeRoughness:.15,
  },
  "alar-roof-far":{
    d:"M440 617 C442 605 453 602 460 609 "+
      "C469 616 471 628 465 635 "+
      "C461 637 462 629 460 626 "+f.reverse+
      " C442 629 440 624 440 617Z",
    bounds:{x:437,y:600,width:37,height:41},
    colors:["#cba094","#956f69","#e2b2a4"],coverage:"open",
    pressure:.57,spacing:5.8,markStrength:.26,
    featherContacts:true,blendRadius:4.4,outlineOpacity:0,edgeRoughness:.15,
  },
};
export const CRAYON_F1_JOINED_NARIS_IDS=Object.freeze(Object.keys(patches));

/** No new nodes. Paint near/far roofs after their dark recesses so
 * native wax physically interrupts the hard boundary, unlike V18 circles.
 * Fail closed on removed/duplicated source anatomy and repeated work.
 */
export function crayonF1JoinNarisContours(
  elements:readonly CrayonElement[],
):CrayonElement[]{
  const seen=new Set<string>();
  const roofs=new Map<"near"|"far",Wax>();
  const out:CrayonElement[]=[];
  for(const el of elements){
    if(!Object.prototype.hasOwnProperty.call(patches,el.id)){
      out.push(el);continue;
    }
    if(el.kind!=="wax"||seen.has(el.id))
      throw new RangeError("Invalid or duplicate V17 naris "+el.id);
    seen.add(el.id);
    if((el.id==="naris-shadow-near"||el.id==="naris-shadow-far")&&
      el.d===patches[el.id].d)
      throw new RangeError("Naris contour already joined");
    const item:Wax={...el,...patches[el.id]};
    if(el.id==="alar-roof-near"||el.id==="alar-roof-far"){
      roofs.set(el.id.endsWith("near")?"near":"far",item);
      continue;
    }
    out.push(item);
    if(el.id==="naris-shadow-near"||el.id==="naris-shadow-far"){
      const side=el.id.endsWith("near")?"near":"far";
      const roof=roofs.get(side);
      if(!roof)throw new RangeError("Missing preceding alar roof");
      out.push(roof);
    }
  }
  if(seen.size!==CRAYON_F1_JOINED_NARIS_IDS.length||roofs.size!==2)
    throw new RangeError("Missing source-contoured nasal features");
  return out;
}
