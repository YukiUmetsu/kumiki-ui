import type {CrayonElement} from "../../registry/video/materials/crayon-scene";
type Wax=Extract<CrayonElement,{kind:"wax"}>;

/** V19 source-projected native CRAYON1 nasal contour; experimental, not approved.
 * Campbell CC0 608x1082 photograph, x340..492/y570..683: dark near hooked
 * nostril turns under alar hood; far side is narrower and foreshortened.
 * We reconstruct a shared cubic skin/shadow boundary, not add opaque
 * pale circles (rejected V18). V17/V18, other anatomy and timing are kept.
 * V19 source-registered Chromium was artistically rejected: near naris
 * became a circular dark blob, far one a stamp, and an artificial bright rim
 * persisted. V20 restores the source hook by carving concave negative space
 * into the near naris and tapering the far slit while retaining an exact
 * source-shared cartilage edge. No other anatomy or prior control is changed.
 * Neither structural tests nor screenshot creation imply artist sign-off.
 */
export const CRAYON_F1_SHARED_NARIS_RIMS=Object.freeze({
  near:{
    forward:"M388 635 C393 629 400 624 407 624 C415 622 420 625 423 630",
    reverse:"C420 625 415 622 407 624 C400 624 393 629 388 635",
  },
  far:{
    forward:"M450 634 C448 628 450 620 454 617 C458 615 461 620 461 626",
    reverse:"C461 620 458 615 454 617 C450 620 448 628 450 634",
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
    d:n.forward+" C420 635 415 635 414 631 "+
      "C407 628 405 635 403 640 "+
      "C400 646 396 647 393 644 "+
      "C390 642 389 638 388 635Z",
    bounds:{x:384,y:619,width:43,height:33},
    colors:["#67403c","#211b1d","#88574f"],coverage:"opaque",
    pressure:.87,spacing:4.1,markStrength:.30,
    underpaintTooth:.12,opaqueBurnish:.84,
    underpaintGradient:{light:"#875c51",shadow:"#21191c",
      focusX:.36,focusY:.57,radius:.89},
    outlineOpacity:0,edgeRoughness:.11,
  },
  "naris-shadow-far":{
    d:f.forward+" C462 635 458 641 454 642 "+
      "C451 642 450 638 450 634Z",
    bounds:{x:444,y:612,width:21,height:34},
    colors:["#71504a","#302226","#91675c"],coverage:"opaque",
    pressure:.84,spacing:4.0,markStrength:.27,
    underpaintTooth:.12,opaqueBurnish:.81,
    underpaintGradient:{light:"#95695d",shadow:"#281e23",
      focusX:.3,focusY:.48,radius:.87},
    outlineOpacity:0,edgeRoughness:.12,
  },
  "alar-roof-near":{
    d:"M373 624 C381 606 393 602 408 607 "+
      "C424 612 430 623 427 635 "+
      "C426 637 424 634 423 630 "+n.reverse+
      " C382 636 377 631 373 624Z",
    bounds:{x:369,y:600,width:64,height:39},
    colors:["#d6a99b","#9d726c","#e7bbab"],coverage:"open",
    pressure:.65,spacing:5.4,markStrength:.34,
    featherContacts:true,blendRadius:5.1,outlineOpacity:0,edgeRoughness:.15,
  },
  "alar-roof-far":{
    d:"M440 617 C442 605 453 602 460 609 "+
      "C469 616 471 628 465 635 "+
      "C462 639 461 630 461 626 "+f.reverse+
      " C443 638 440 624 440 617Z",
    bounds:{x:437,y:600,width:37,height:41},
    colors:["#cba094","#956f69","#e2b2a4"],coverage:"open",
    pressure:.62,spacing:5.8,markStrength:.30,
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
