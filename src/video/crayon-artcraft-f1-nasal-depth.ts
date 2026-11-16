import type {CrayonElement} from "../../registry/video/materials/crayon-scene";

type Wax=Extract<CrayonElement,{kind:"wax"}>;

/**
 * ArtCraft F1 V18: original source-projected native wax / nasal depth.
 *
 * Source: Christopher Campbell CC0; frozen 608x1082 browser projection,
 * nose ROI x340..492, y570..683. V17 actual Chromium shows two dark
 * floating cavities surrounded by flat face. The *source* instead has
 * a continuous 3/4 nasal tip whose alar hood occludes the upper rim
 * of the near hooked recess, and a tapered, partly hidden far recess.
 *
 * These are not generic circles. Each wax mass follows separately
 * observed near/far contours, with distinct orientation, pressure and
 * parent clipping. The two dense core undercoats are laid BEFORE the
 * source alar forms; overhangs are deposited AFTER the dark openings,
 * to physically interrupt the previously free-floating contours.
 * Open broken-nib feathers restore wax-to-skin continuity.
 *
 * No source-image pixels, compositing effects, or topology reductions.
 * This is an opt-in unapproved study; source-nose-sculpt is unchanged.
 */
const nearSidewall:Wax={
  kind:"wax",id:"nasal-sidewall-near-underpaint",
  parentId:"face-outline",clipToParent:true,
  coverage:"opaque",deposition:"stroke-built",
  timing:{start:182,end:266},
  d:"M369 620 C371 605 382 595 394 597 "+
    "C408 595 419 608 423 622 "+
    "C429 635 420 649 410 653 "+
    "C397 660 379 655 371 642 "+
    "C365 633 368 625 369 620Z",
  bounds:{x:364,y:590,width:65,height:72},
  colors:["#c49a8d","#8e6865","#e0afa0"],
  pressure:.67,spacing:6.1,markStrength:.20,
  underpaintTooth:.22,opaqueBurnish:.49,
  underpaintGradient:{
    light:"#d7aa9b",shadow:"#8b6762",
    focusX:.41,focusY:.26,radius:1.06,
  },
  outlineOpacity:0,edgeRoughness:.10,
};

const farSidewall:Wax={
  kind:"wax",id:"nasal-sidewall-far-underpaint",
  parentId:"face-outline",clipToParent:true,
  coverage:"opaque",deposition:"stroke-built",
  timing:{start:183,end:266},
  d:"M439 613 C442 600 450 595 459 599 "+
    "C468 600 476 613 474 626 "+
    "C473 639 467 645 459 649 "+
    "C451 650 443 642 440 631 "+
    "C437 624 438 619 439 613Z",
  bounds:{x:435,y:594,width:42,height:59},
  colors:["#be9186","#876461","#d7a498"],
  pressure:.62,spacing:6.5,markStrength:.17,
  underpaintTooth:.20,opaqueBurnish:.46,
  underpaintGradient:{
    light:"#cda095",shadow:"#896360",
    focusX:.37,focusY:.25,radius:1.04,
  },
  outlineOpacity:0,edgeRoughness:.12,
};

const columella:Wax={
  kind:"wax",id:"nasal-columella-attached-turn",
  parentId:"face-outline",clipToParent:true,
  coverage:"open",deposition:"stroke-built",
  timing:{start:202,end:279},
  d:"M407 625 C413 628 420 637 425 645 "+
    "C433 650 441 645 447 635 "+
    "C447 646 438 658 431 661 "+
    "C419 661 409 643 407 625Z",
  bounds:{x:403,y:621,width:49,height:44},
  colors:["#b68c80","#795b59","#d5a99d"],
  pressure:.69,spacing:5.8,markStrength:.26,
  blendRadius:7.2,featherContacts:true,
  outlineOpacity:0,edgeRoughness:.12,
};

/** Near hood extends *across* the top-right of the dark hook, partly
 * hiding its former perfectly uniform isolated boundary. The
 * visible dark recess is still left of and below this curved rim.
 */
const nearHood:Wax={
  kind:"wax",id:"nasal-hood-near-occluder",
  parentId:"face-outline",clipToParent:true,
  coverage:"opaque",deposition:"stroke-built",
  timing:{start:240,end:298},
  d:"M384 622 C390 610 401 608 411 612 "+
    "C421 616 429 624 427 633 "+
    "C423 637 416 633 412 629 "+
    "C405 623 397 626 391 632 "+
    "C387 632 384 629 384 622Z",
  bounds:{x:380,y:606,width:51,height:33},
  colors:["#d3a399","#a97972","#e2b4a5"],
  pressure:.76,spacing:5.2,markStrength:.19,
  underpaintTooth:.18,opaqueBurnish:.52,
  underpaintGradient:{
    light:"#dbada0",shadow:"#a17870",
    focusX:.45,focusY:.20,radius:.98,
  },
  outlineOpacity:0,edgeRoughness:.10,
};

const farHood:Wax={
  kind:"wax",id:"nasal-hood-far-occluder",
  parentId:"face-outline",clipToParent:true,
  coverage:"opaque",deposition:"stroke-built",
  timing:{start:240,end:298},
  d:"M443 618 C446 609 453 605 462 610 "+
    "C469 615 471 626 467 632 "+
    "C464 630 464 623 460 620 "+
    "C455 618 451 622 449 628 "+
    "C447 626 444 621 443 618Z",
  bounds:{x:440,y:605,width:33,height:31},
  colors:["#c89b90","#996e68","#dbafa3"],
  pressure:.72,spacing:5.7,markStrength:.17,
  underpaintTooth:.16,opaqueBurnish:.47,
  underpaintGradient:{
    light:"#d4a79c",shadow:"#97726a",
    focusX:.32,focusY:.19,radius:1.03,
  },
  outlineOpacity:0,edgeRoughness:.11,
};

const nearContact:Wax={
  kind:"wax",id:"nasal-hood-near-dry-contact",
  parentId:"face-outline",clipToParent:true,
  coverage:"open",deposition:"stroke-built",
  timing:{start:252,end:298},
  d:"M374 622 C379 610 393 603 404 607 "+
    "C416 609 426 619 430 631 "+
    "C423 624 416 618 408 617 "+
    "C397 615 388 621 382 630Z",
  bounds:{x:370,y:601,width:64,height:35},
  colors:["#dcada0","#b28c83","#efc1ad"],
  pressure:.57,spacing:6.1,markStrength:.17,
  blendRadius:6.3,featherContacts:true,
  outlineOpacity:0,edgeRoughness:.12,
};

const farContact:Wax={
  kind:"wax",id:"nasal-hood-far-dry-contact",
  parentId:"face-outline",clipToParent:true,
  coverage:"open",deposition:"stroke-built",
  timing:{start:253,end:298},
  d:"M439 615 C444 602 451 601 461 606 "+
    "C470 613 476 623 469 637 "+
    "C472 625 465 614 458 611 "+
    "C450 608 444 617 441 625Z",
  bounds:{x:435,y:599,width:43,height:42},
  colors:["#ce9f92","#a57b71","#e0b3a5"],
  pressure:.49,spacing:6.4,markStrength:.15,
  blendRadius:5.9,featherContacts:true,
  outlineOpacity:0,edgeRoughness:.13,
};

export const CRAYON_F1_NASAL_DEPTH_IDS=Object.freeze([
  nearSidewall.id,farSidewall.id,columella.id,nearHood.id,farHood.id,
  nearContact.id,farContact.id,
] as const);

/** Fail closed if applied twice or if the source anatomy is not V17.
 * Preserve exact input element objects for every unmodified region.
 */
export function crayonF1BuildNasalWaxDepth(
  elements:readonly CrayonElement[],
):CrayonElement[]{
  const out:CrayonElement[]=[];
  const required=new Set([
    "nasal-alar-attachment-near",
    "nasal-alar-attachment-far",
    "naris-shadow-near","naris-shadow-far",
  ]);
  const seen=new Set<string>();
  if(elements.some(e=>CRAYON_F1_NASAL_DEPTH_IDS.some(id=>id===e.id)))
    throw new RangeError("V18 nasal underpaint already present");
  for(const el of elements){
    if(required.has(el.id)){
      if(el.kind!=="wax"||seen.has(el.id))
        throw new RangeError("Invalid or duplicate V17 source anatomy "+el.id);
      seen.add(el.id);
    }
    if(el.id==="nasal-alar-attachment-near")out.push(nearSidewall);
    if(el.id==="nasal-alar-attachment-far")out.push(farSidewall);
    if(el.id==="naris-shadow-near")out.push(columella);
    out.push(el);
    if(el.id==="naris-shadow-near")out.push(nearHood,nearContact);
    if(el.id==="naris-shadow-far")out.push(farHood,farContact);
  }
  if(seen.size!==required.size)
    throw new RangeError("Missing original near/far nasal attachments");
  return out;
}
