import type {CrayonElement} from "../../registry/video/materials/crayon-scene";
type Wax=Extract<CrayonElement,{kind:"wax"}>;

/** ArtCraft F1 V21 experimental CC0 source-projected nasal volume.
 * Source: Christopher Campbell CC0 608×1082 portrait, study x328..478 y493..667.
 * Builds true nose root, dorsum, bulb, near/far wings, and septum from
 * pre-existing named native CRAYON1 wax forms. No source-photo pixels,
 * smooth photo filters, mirror duplicates, pale disks, or reduced detail.
 * V20 dark-source rims, all controls/animation, paper and unrelated anatomy
 * remain unchanged. Material/portrait quality awaits actual-pixel review.
 */
export const CRAYON_F1_NOSE_VOLUME_ANCHORS=Object.freeze({
  boneRoot:[357,531],dorsalPlane:[372,570],bulb:[409,612],
  nearWing:[381,627],farWing:[454,619],septalTurn:[431,646],
} as const);

const patches:Readonly<Record<string,Partial<Wax>>> ={
  "nose-root":{
    d:"M331 494 C345 496 354 510 360 531 "+
      "C367 546 373 557 375 569 "+
      "C367 582 357 577 351 558 "+
      "C343 531 337 510 331 494Z",
    bounds:{x:328,y:490,width:51,height:93},
    colors:["#997675","#6e555c","#cba6a2"],
    pressure:.53,spacing:6.8,markStrength:.34,angle:57,
    coverage:"open",deposition:"stroke-built",nibStyle:"dry",
    featherContacts:true,blendRadius:11.4,outlineOpacity:0,edgeRoughness:.18,
  },
  "nose-dorsum":{
    d:"M354 528 C366 525 376 542 383 565 "+
      "C393 582 412 594 426 610 "+
      "C435 623 429 638 415 640 "+
      "C400 634 387 619 377 596 "+
      "C363 564 359 541 354 528Z",
    bounds:{x:351,y:524,width:89,height:122},
    colors:["#e0bbaa","#b58a81","#f5d1bb"],
    pressure:.62,spacing:6.0,markStrength:.39,angle:59,
    coverage:"open",deposition:"stroke-built",nibStyle:"dry",
    featherContacts:true,blendRadius:10.6,outlineOpacity:0,edgeRoughness:.17,
  },
  "nose-sidewall":{
    d:"M342 543 C353 552 360 576 369 600 "+
      "C379 615 391 630 400 636 "+
      "C390 652 373 644 362 627 "+
      "C350 601 343 569 342 543Z",
    bounds:{x:339,y:539,width:66,height:115},
    colors:["#9f7470","#74565c","#c49488"],
    pressure:.64,spacing:5.5,markStrength:.47,angle:68,
    coverage:"open",deposition:"stroke-built",nibStyle:"dry",
    featherContacts:true,blendRadius:13.3,outlineOpacity:0,edgeRoughness:.20,
  },
  "nose-tip":{
    d:"M375 602 C384 592 397 588 412 590 "+
      "C430 593 444 605 448 619 "+
      "C448 631 437 637 421 639 "+
      "C410 638 395 632 383 628 "+
      "C372 622 371 609 375 602Z",
    bounds:{x:369,y:585,width:83,height:57},
    colors:["#eac2af","#bd9284","#f6d8c1"],
    pressure:.68,spacing:5.2,markStrength:.49,angle:-18,
    coverage:"open",deposition:"stroke-built",nibStyle:"dry",
    featherContacts:true,blendRadius:6.2,outlineOpacity:0,edgeRoughness:.15,
  },
  "nose-septal-transition":{
    d:"M406 619 C418 622 425 635 431 646 "+
      "C440 644 445 633 446 626 "+
      "C450 640 441 655 432 659 "+
      "C420 656 411 641 406 619Z",
    bounds:{x:403,y:615,width:51,height:48},
    colors:["#a97a70","#775151","#cca094"],
    pressure:.65,spacing:5.7,markStrength:.47,angle:23,
    coverage:"open",deposition:"stroke-built",nibStyle:"dry",
    featherContacts:true,blendRadius:7.0,outlineOpacity:0,edgeRoughness:.18,
  },
  "nose-alar-near":{
    d:"M368 626 C375 611 385 605 398 608 "+
      "C414 608 425 618 427 633 "+
      "C425 646 410 652 397 652 "+
      "C384 652 375 643 368 626Z",
    bounds:{x:365,y:602,width:65,height:56},
    colors:["#be8879","#84564e","#e4af99"],
    pressure:.67,spacing:5.4,markStrength:.48,angle:27,
    coverage:"open",deposition:"stroke-built",nibStyle:"dry",
    featherContacts:true,blendRadius:7.2,outlineOpacity:0,edgeRoughness:.18,
  },
  "nose-alar-far":{
    d:"M436 615 C442 602 451 597 461 604 "+
      "C471 613 477 627 468 640 "+
      "C464 648 453 648 447 637 "+
      "C439 625 438 622 436 615Z",
    bounds:{x:433,y:594,width:46,height:57},
    colors:["#b0827b","#704d4b","#d2a095"],
    pressure:.58,spacing:5.6,markStrength:.44,angle:65,
    coverage:"open",deposition:"stroke-built",nibStyle:"dry",
    featherContacts:true,blendRadius:7.3,outlineOpacity:0,edgeRoughness:.18,
  },
  "nose-sidewall-form":{
    d:"M336 511 C347 527 355 548 363 568 "+
      "C374 589 387 610 397 623 "+
      "C404 634 407 640 401 648 "+
      "C389 655 375 639 366 623 "+
      "C350 603 344 567 336 511Z",
    bounds:{x:333,y:507,width:78,height:148},
    colors:["#956b67","#674d50","#be8f83"],
    pressure:.70,spacing:6.2,markStrength:.45,angle:62,
    coverage:"open",deposition:"stroke-built",nibStyle:"dry",
    featherContacts:true,blendRadius:15.3,outlineOpacity:0,edgeRoughness:.23,
  },
  "nose-subalar-contact":{
    d:"M371 630 C384 639 393 649 409 650 "+
      "C422 653 434 647 440 637 "+
      "C448 631 453 624 460 622 "+
      "C456 641 442 656 424 660 "+
      "C402 666 379 654 371 630Z",
    bounds:{x:367,y:617,width:97,height:52},
    colors:["#a37368","#6f5050","#c79486"],
    pressure:.63,spacing:5.8,markStrength:.44,angle:-27,
    coverage:"open",deposition:"stroke-built",nibStyle:"dry",
    featherContacts:true,blendRadius:9.3,outlineOpacity:0,edgeRoughness:.18,
  },
  "nose-tip-reflected-light":{
    d:"M376 608 C388 594 399 591 409 593 "+
      "C422 595 432 604 432 612 "+
      "C421 624 406 627 391 625 "+
      "C382 624 375 617 376 608Z",
    bounds:{x:372,y:587,width:64,height:43},
    colors:["#efc5ac","#c19284","#ffe0bd"],
    pressure:.58,spacing:5.8,markStrength:.38,angle:-12,
    coverage:"open",deposition:"stroke-built",nibStyle:"dry",
    featherContacts:true,blendRadius:6.4,outlineOpacity:0,edgeRoughness:.14,
  },
  "nose-tip-underlight":{
    d:"M395 631 C405 629 416 639 428 641 "+
      "C438 642 442 630 446 625 "+
      "C445 645 435 659 425 657 "+
      "C413 658 402 646 395 631Z",
    bounds:{x:391,y:622,width:58,height:39},
    colors:["#be8e7d","#875e57","#dba996"],
    pressure:.52,spacing:6.5,markStrength:.32,angle:40,
    coverage:"open",deposition:"stroke-built",nibStyle:"dry",
    featherContacts:true,blendRadius:7.1,outlineOpacity:0,edgeRoughness:.17,
  },
  // V20 alar rim and cavity remain exact. These are surrounding skin wax.
  "nasal-alar-attachment-near":{
    colors:["#ae7770","#724a48","#d69a88"],
    pressure:.67,spacing:5.7,markStrength:.42,angle:32,
    featherContacts:true,blendRadius:8.0,outlineOpacity:0,
  },
  "nasal-alar-attachment-far":{
    colors:["#ab746b","#704847","#d39d8b"],
    pressure:.59,spacing:5.9,markStrength:.36,angle:63,
    featherContacts:true,blendRadius:6.5,outlineOpacity:0,
  },
};
export const CRAYON_F1_NOSE_VOLUME_IDS=Object.freeze(Object.keys(patches));

/** Existing semantic wax only. Fail closed on incomplete or repeated input.
 * All other elements preserve identity and source rig/film positions.
 */
export function crayonF1ConstructNasalVolume(
  elements:readonly CrayonElement[],
):CrayonElement[]{
  const seen=new Set<string>();
  const out=elements.map(el=>{
    if(!Object.prototype.hasOwnProperty.call(patches,el.id))return el;
    if(el.kind!=="wax"||seen.has(el.id))
      throw new RangeError("Missing or duplicate source nasal volume: "+el.id);
    seen.add(el.id);
    if(el.id==="nose-root"&&el.d===patches[el.id].d)
      throw new RangeError("Nasal volume already constructed");
    return {...el,...patches[el.id]};
  });
  if(seen.size!==CRAYON_F1_NOSE_VOLUME_IDS.length)
    throw new RangeError("Incomplete source anatomy for nasal volume");
  return out;
}
