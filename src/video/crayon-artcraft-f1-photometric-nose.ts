import type {CrayonElement} from "../../registry/video/materials/crayon-scene";
type Wax=Extract<CrayonElement,{kind:"wax"}>;

/** ArtCraft F1 V22, source-specific anatomical value correction.
 * Campbell CC0 608x1082 source ROI x340..493, y570..684.
 * At 1x, V21b loses the bridge→near-ala→columella value continuity:
 * two dark marks float on planar skin. Correct the existing contiguous
 * *skin* wax instead of adding new nostril circles, labels or filters.
 * An experiment, not an artist-approved portrait.
 */
const patches:Readonly<Record<string,Partial<Wax>>> = {
  "nose-sidewall":{
    d:"M355 562 C363 567 370 583 377 599 "+
      "C383 610 392 620 397 632 "+
      "C389 637 382 632 377 625 "+
      "C368 612 359 587 355 562Z",
    bounds:{x:352,y:558,width:49,height:81},
    colors:["#c5a098","#a8817b","#e1b9aa"],
    coverage:"open",pressure:.51,spacing:6.1,markStrength:.32,
    angle:35,markLength:"short",strokeOrder:"patches",
    featherContacts:true,blendRadius:12.1,
    outlineOpacity:0,edgeRoughness:.17,
  },
  "nose-subalar-contact":{
    // The original V21 region extended over x367..464 and was too wide.
    // This compact connected underplane flows beneath the near hook toward
    // the septal root and far alar edge, not a solid oval skin sticker.
    d:"M381 627 C388 635 398 643 408 645 "+
      "C419 649 427 646 433 642 "+
      "C444 640 449 632 452 627 "+
      "C451 640 443 650 434 655 "+
      "C419 663 402 657 393 648 "+
      "C386 640 382 632 381 627Z",
    bounds:{x:378,y:624,width:76,height:37},
    colors:["#a57769","#6f4b46","#c99484"],
    coverage:"open",pressure:.71,spacing:4.9,markStrength:.52,
    angle:-24,markLength:"short",strokeOrder:"patches",
    featherContacts:true,blendRadius:7.0,
    outlineOpacity:0,edgeRoughness:.16,
  },
  "nose-tip-underlight":{
    d:"M394 630 C407 632 416 639 427 641 "+
      "C436 644 444 632 447 625 "+
      "C445 646 434 656 426 655 "+
      "C412 655 404 642 394 630Z",
    bounds:{x:391,y:622,width:59,height:37},
    colors:["#b38478","#805954","#d3a094"],
    coverage:"open",pressure:.70,spacing:5.0,markStrength:.49,
    angle:32,markLength:"short",strokeOrder:"patches",
    featherContacts:true,blendRadius:6.7,
    outlineOpacity:0,edgeRoughness:.15,
  },
  "nose-alar-near":{
    d:"M370 625 C378 611 387 605 400 606 "+
      "C417 609 424 619 428 629 "+
      "C429 639 418 647 407 651 "+
      "C394 655 380 643 370 625Z",
    bounds:{x:367,y:602,width:65,height:54},
    colors:["#c08e82","#78534f","#e4aa98"],
    coverage:"open",pressure:.69,spacing:5.1,markStrength:.50,
    angle:21,markLength:"short",strokeOrder:"patches",
    featherContacts:true,blendRadius:6.8,
    outlineOpacity:0,edgeRoughness:.16,
  },
  "nose-alar-far":{
    d:"M439 615 C444 604 452 599 462 605 "+
      "C472 614 474 628 469 639 "+
      "C460 646 451 644 445 635 "+
      "C439 626 438 620 439 615Z",
    bounds:{x:436,y:598,width:39,height:49},
    colors:["#b98a82","#735153","#d5a399"],
    coverage:"open",pressure:.60,spacing:5.5,markStrength:.45,
    angle:64,markLength:"short",strokeOrder:"patches",
    featherContacts:true,blendRadius:6.9,
    outlineOpacity:0,edgeRoughness:.17,
  },
};
export const CRAYON_F1_NASAL_VALUE_IDS=Object.freeze(Object.keys(patches));

/** Existing source geometry ONLY, no new shape budget or old-control edits. */
export function crayonF1ReconstructNasalValue(
  elements:readonly CrayonElement[],
):CrayonElement[]{
  const seen=new Set<string>();
  const out=elements.map(el=>{
    if(!Object.prototype.hasOwnProperty.call(patches,el.id))return el;
    if(el.kind!=="wax"||seen.has(el.id))
      throw new RangeError("Missing/duplicate nasal value surface "+el.id);
    seen.add(el.id);
    if(el.id==="nose-subalar-contact"&&el.d===patches[el.id].d)
      throw new RangeError("Nasal value experiment already applied");
    return {...el,...patches[el.id]};
  });
  if(seen.size!==CRAYON_F1_NASAL_VALUE_IDS.length)
    throw new RangeError("Incomplete F1 nasal value anatomy");
  return out;
}
