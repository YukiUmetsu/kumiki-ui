import type {CrayonElement} from "../../registry/video/materials/crayon-scene";

type Wax=Extract<CrayonElement,{kind:"wax"}>;

/**
 * ArtCraft F1 tarsal/ocular STUDY, NOT an approved portrait or face template.
 * Source: Christopher Campbell's 2015 CC0 portrait; fixed 608x1082 source
 * browser crop, SHA256 f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2.
 *
 * The photographic upper-lid margin crosses the iris. Earlier native wax
 * painted an oversized bright almond, then drew disconnected mascara points.
 * This opt-in forms the lids, wet rim and lower socket with native deposited
 * wax on an existing source-registered anatomical graph. No photo filters.
 *
 * Coordinates are source-pixel observations, not generalized adult ratios:
 * near canthi ~216,557/319,545; iris x242..282/y535..568;
 * far eye x404..479/y500..534, darkened by hair at the medial boundary.
 */
const sourcePatches:Readonly<Record<string,Partial<Wax>>>={
  "sclera-near":{
    colors:["#93817e","#514449","#b6a29b"],
    pressure:.9,spacing:5.1,markStrength:.23,underpaintTooth:.24,
    underpaintGradient:{
      light:"#b6a49d",shadow:"#51434d",focusX:.86,focusY:.56,radius:.87,
    },
  },
  "sclera-far":{
    colors:["#76686b","#3e343b","#a28e88"],
    pressure:.88,markStrength:.20,underpaintTooth:.22,
    underpaintGradient:{
      light:"#9d8a88",shadow:"#42343c",focusX:.37,focusY:.61,radius:.78,
    },
  },
  "iris-near":{
    // Natural upper iris remains PRESENT and is overpainted by skin.
    // The asymmetric inferior edge is not a full generic cartoon circle.
    d:"M242 544 C247 536 256 533 267 536 "+
      "C278 538 284 546 281 554 "+
      "C279 561 271 566 260 565 "+
      "C247 564 241 557 242 544Z",
    bounds:{x:237,y:532,width:47,height:38},
    colors:["#392924","#18151a","#654539"],
    pressure:.97,markStrength:.33,opaqueBurnish:.95,
    underpaintGradient:{
      light:"#654638",shadow:"#161419",focusX:.57,focusY:.79,radius:.9,
    },
  },
  "iris-far":{
    colors:["#302323","#17151a","#513b32"],
    pressure:.97,markStrength:.3,opaqueBurnish:.96,
    underpaintGradient:{
      light:"#523b32",shadow:"#171518",focusX:.54,focusY:.72,radius:.88,
    },
  },
  "tarsal-shelf-near":{
    // A real overlapping opaque SKIN plane, after both iris and pupil.
    // The lower edge is irregular and cuts across the upper iris 7-11px.
    // The far/near eyes are deliberately different, not mirrored.
    d:"M214 557 C225 539 248 528 267 526 "+
      "C292 525 313 536 325 544 "+
      "C310 542 295 540 282 544 "+
      "C257 546 236 551 217 565Z",
    bounds:{x:210,y:522,width:119,height:48},
    colors:["#b28b84","#775a5e","#d3aa9d"],
    pressure:.87,spacing:5.3,markStrength:.22,
    underpaintTooth:.23,edgeRoughness:.17,
    underpaintGradient:{
      light:"#c9a69c",shadow:"#65505a",focusX:.69,focusY:.23,radius:1.04,
    },
  },
  "tarsal-shelf-far":{
    d:"M400 529 C410 508 428 498 446 497 "+
      "C461 497 476 504 482 512 "+
      "C465 508 451 505 435 513 "+
      "C420 520 412 529 406 535Z",
    bounds:{x:396,y:492,width:91,height:47},
    colors:["#aa8783","#725a60","#c09a95"],
    pressure:.84,spacing:5.2,markStrength:.23,
    underpaintTooth:.19,edgeRoughness:.16,
    underpaintGradient:{
      light:"#bc9690",shadow:"#634f55",focusX:.56,focusY:.35,radius:1.03,
    },
  },
  "lash-root-near":{
    // Connected mass with variable thickness; not a thick constant-width line.
    d:"M216 558 C224 546 239 537 260 534 "+
      "C282 530 306 536 319 544 "+
      "C304 540 291 538 278 539 "+
      "C257 540 237 548 220 561Z",
    bounds:{x:212,y:528,width:112,height:38},
    colors:["#442e31","#221c23","#735351"],
    pressure:.93,spacing:4.2,markStrength:.25,
    underpaintTooth:.18,opaqueBurnish:.86,edgeRoughness:.21,
    outlineOpacity:0,
    underpaintGradient:{
      light:"#624745",shadow:"#211b23",focusX:.57,focusY:.42,radius:.89,
    },
  },
  "lash-root-far":{
    d:"M404 529 C414 509 432 501 447 499 "+
      "C464 497 474 505 480 513 "+
      "C468 510 454 506 441 508 "+
      "C423 514 414 524 406 534Z",
    bounds:{x:400,y:494,width:84,height:43},
    colors:["#3c292d","#201a20","#61484b"],
    pressure:.92,spacing:4.1,markStrength:.24,
    underpaintTooth:.18,opaqueBurnish:.84,edgeRoughness:.2,
    outlineOpacity:0,
    underpaintGradient:{
      light:"#594143",shadow:"#1e1920",focusX:.56,focusY:.47,radius:.9,
    },
  },
  "lower-lid-near":{
    colors:["#9c7572","#624c55","#bb8d86"],
    pressure:.61,spacing:7.1,markStrength:.23,
    blendRadius:8.7,featherContacts:true,
  },
  "lower-lid-far":{
    colors:["#967372","#624f54","#bd938b"],
    pressure:.57,spacing:7.2,markStrength:.22,
    blendRadius:7.1,featherContacts:true,
  },
};

const additions:Readonly<Record<string,Wax>>={
  "source-socket-turn-near":{
    kind:"wax",id:"source-socket-turn-near",
    parentId:"face-outline",clipToParent:true,
    timing:{start:135,end:250},
    d:"M208 540 C226 517 246 511 273 509 "+
      "C300 508 318 519 330 535 "+
      "C304 521 286 520 266 524 "+
      "C238 527 222 537 208 540Z",
    bounds:{x:204,y:502,width:132,height:43},
    coverage:"open",deposition:"stroke-built",
    colors:["#947576","#624f5b","#b99590"],
    blendRadius:11,featherContacts:true,angle:-23,
    pressure:.55,spacing:7.1,markStrength:.16,
    edgeRoughness:.11,outlineOpacity:0,
  },
  "source-socket-turn-far":{
    kind:"wax",id:"source-socket-turn-far",
    parentId:"face-outline",clipToParent:true,
    timing:{start:137,end:251},
    d:"M396 519 C410 497 430 487 446 484 "+
      "C462 482 478 497 485 509 "+
      "C467 497 455 495 441 501 "+
      "C420 506 405 518 396 519Z",
    bounds:{x:392,y:480,width:97,height:46},
    coverage:"open",deposition:"stroke-built",
    colors:["#896b70","#5c4b57","#ad8b89"],
    blendRadius:9.2,featherContacts:true,angle:-20,
    pressure:.56,spacing:7,markStrength:.17,
    edgeRoughness:.1,outlineOpacity:0,
  },
  "source-tarsal-burnish-near":{
    kind:"wax",id:"source-tarsal-burnish-near",
    parentId:"face-outline",clipToParent:true,
    timing:{start:195,end:295},
    d:"M219 557 C230 544 245 539 264 537 "+
      "C283 535 306 538 317 544 "+
      "C302 541 289 539 277 541 "+
      "C254 542 237 550 221 560Z",
    bounds:{x:215,y:533,width:106,height:31},
    coverage:"open",deposition:"stroke-built",
    colors:["#38282d","#211a20","#65494a"],
    blendRadius:2.6,featherContacts:true,angle:10,
    pressure:.91,spacing:4.2,markStrength:.31,
    edgeRoughness:.18,outlineOpacity:0,nibStyle:"dry",
  },
  "source-tarsal-burnish-far":{
    kind:"wax",id:"source-tarsal-burnish-far",
    parentId:"face-outline",clipToParent:true,
    timing:{start:195,end:294},
    d:"M405 528 C417 509 432 503 447 501 "+
      "C463 501 473 506 478 513 "+
      "C460 508 449 506 439 509 "+
      "C425 514 415 526 406 532Z",
    bounds:{x:402,y:497,width:80,height:39},
    coverage:"open",deposition:"stroke-built",
    colors:["#36282b","#1f1a20","#60474b"],
    blendRadius:2.3,featherContacts:true,angle:15,
    pressure:.9,spacing:4.2,markStrength:.29,
    edgeRoughness:.18,outlineOpacity:0,nibStyle:"dry",
  },
  "source-infraorbital-wax-near":{
    kind:"wax",id:"source-infraorbital-wax-near",
    parentId:"face-outline",clipToParent:true,
    timing:{start:187,end:285},
    d:"M220 562 C239 573 254 575 276 570 "+
      "C297 567 312 554 322 545 "+
      "C315 567 299 579 277 581 "+
      "C251 582 233 575 220 562Z",
    bounds:{x:217,y:540,width:110,height:47},
    coverage:"open",deposition:"stroke-built",
    colors:["#a57e7a","#705560","#bd928c"],
    blendRadius:7.2,featherContacts:true,angle:16,
    pressure:.55,spacing:7,markStrength:.19,
    edgeRoughness:.12,outlineOpacity:0,
  },
  "source-infraorbital-wax-far":{
    kind:"wax",id:"source-infraorbital-wax-far",
    parentId:"face-outline",clipToParent:true,
    timing:{start:186,end:282},
    d:"M405 528 C420 537 437 537 453 532 "+
      "C465 529 471 520 475 512 "+
      "C472 538 454 547 438 547 "+
      "C420 545 408 536 405 528Z",
    bounds:{x:402,y:506,width:77,height:47},
    coverage:"open",deposition:"stroke-built",
    colors:["#997578","#66515d","#b58e8c"],
    blendRadius:6.4,featherContacts:true,angle:19,
    pressure:.52,spacing:7.1,markStrength:.18,
    edgeRoughness:.11,outlineOpacity:0,
  },
};

export const CRAYON_F1_TARSAL_SCULPT_PATCH_IDS=Object.freeze(
  Object.keys(sourcePatches),
);
export const CRAYON_F1_TARSAL_SCULPT_ADDITIONS=Object.freeze(
  Object.keys(additions),
);

/** Require the complete source-space hierarchy, never silently adapt
 * painted anatomical planes to another photograph, mirrored eye or body.
 * Exactly one source-value control is maintained unchanged by the caller.
 */
export function crayonF1SculptTarsal(
  elements:readonly CrayonElement[],
):CrayonElement[]{
  const found=new Set<string>();
  const anchors=new Set<string>();
  const out:CrayonElement[]=[];
  for(const element of elements){
    if(element.kind==="wax"&&Object.prototype.hasOwnProperty.call(sourcePatches,element.id)){
      if(found.has(element.id))
        throw new RangeError("Duplicate F1 source lid plane: "+element.id);
      found.add(element.id);
      out.push({...element,...sourcePatches[element.id]});
    }else out.push(element);
    const append:Readonly<Record<string,string>>={
      "eye-orbital-fold-near":"source-socket-turn-near",
      "eye-orbital-fold-far":"source-socket-turn-far",
      "lash-root-near":"source-tarsal-burnish-near",
      "lash-root-far":"source-tarsal-burnish-far",
      "lower-lid-near":"source-infraorbital-wax-near",
      "lower-lid-far":"source-infraorbital-wax-far",
    };
    const child=append[element.id];
    if(child){
      if(anchors.has(element.id)||element.kind!=="wax")
        throw new RangeError("Duplicate or invalid F1 ocular anchor: "+element.id);
      anchors.add(element.id);
      out.push(additions[child]);
    }
  }
  for(const id of Object.keys(sourcePatches))
    if(!found.has(id))throw new RangeError("Missing F1 source lid plane: "+id);
  if(anchors.size!==Object.keys(additions).length)
    throw new RangeError("Missing source-registered ocular paint anchor");
  if(new Set(out.map(e=>e.id)).size!==out.length)
    throw new RangeError("Duplicate F1 tarsal paint id");
  return out;
}
