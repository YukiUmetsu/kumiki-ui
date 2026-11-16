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
    // Native v10 proof rejected a bright cut-paper band between lid and
    // iris. Preserve the skin occluder, but root its lower edge INSIDE
    // the adjacent dark margin. This is source-observed TARSAL tissue,
    // not a second floating eyeliner ribbon.
    d:"M214 556 C226 539 248 529 268 528 "+
      "C291 526 314 536 325 545 "+
      "C309 541 298 539 281 539 "+
      "C256 539 237 549 217 563Z",
    bounds:{x:210,y:523,width:119,height:45},
    colors:["#a78581","#6f545b","#c19b91"],
    pressure:.82,spacing:5.7,markStrength:.2,
    underpaintTooth:.23,edgeRoughness:.18,
    underpaintGradient:{
      light:"#bd9791",shadow:"#624e55",focusX:.69,focusY:.26,radius:1.04,
    },
  },
  "tarsal-shelf-far":{
    d:"M401 528 C411 509 429 499 445 498 "+
      "C461 498 477 505 482 512 "+
      "C467 509 452 506 436 509 "+
      "C420 516 412 528 406 534Z",
    bounds:{x:397,y:493,width:90,height:46},
    colors:["#9c7a7b","#6b545a","#b78d8b"],
    pressure:.79,spacing:5.8,markStrength:.2,
    underpaintTooth:.19,edgeRoughness:.17,
    underpaintGradient:{
      light:"#b28b89",shadow:"#5e4b53",focusX:.56,focusY:.35,radius:1.02,
    },
  },
  "lash-root-near":{
    // The source dark root is a thin, irregular implanted boundary,
    // not the previous thick, painted continuous eyebrow-like slab.
    // Named source-fiber curves and the anatomical canthi are retained.
    d:"M217 557 C226 545 240 540 261 537 "+
      "C282 535 303 538 317 544 "+
      "C304 541 287 540 274 541 "+
      "C251 543 235 550 221 559Z",
    bounds:{x:213,y:531,width:109,height:33},
    colors:["#594146","#31272d","#7d5e59"],
    pressure:.79,spacing:6.1,markStrength:.18,
    underpaintTooth:.2,opaqueBurnish:.32,edgeRoughness:.23,
    outlineOpacity:0,
    underpaintGradient:{
      light:"#765955",shadow:"#30252e",focusX:.58,focusY:.43,radius:.88,
    },
  },
  "lash-root-far":{
    d:"M406 528 C418 512 431 505 447 504 "+
      "C462 503 475 509 480 513 "+
      "C464 510 454 509 441 510 "+
      "C425 515 415 526 407 531Z",
    bounds:{x:402,y:499,width:81,height:36},
    colors:["#533d42","#30262d","#745858"],
    pressure:.78,spacing:6.1,markStrength:.17,
    underpaintTooth:.21,opaqueBurnish:.3,edgeRoughness:.22,
    outlineOpacity:0,
    underpaintGradient:{
      light:"#6c5252",shadow:"#30272c",focusX:.55,focusY:.46,radius:.9,
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
    // Worn compact wax fibers touch the parent lash root, without
    // widening the eyelid into an unnatural uniformly dark ribbon.
    d:"M231 551 C243 542 255 539 269 539 "+
      "C283 538 295 539 305 542 "+
      "C292 540 280 541 266 542 "+
      "C251 544 241 550 232 554Z",
    bounds:{x:226,y:535,width:83,height:23},
    coverage:"open",deposition:"stroke-built",
    colors:["#61494b","#30282f","#83605a"],
    blendRadius:4.6,featherContacts:true,angle:10,
    pressure:.48,spacing:7.2,markStrength:.15,
    edgeRoughness:.18,outlineOpacity:0,nibStyle:"dry",
  },
  "source-tarsal-burnish-far":{
    kind:"wax",id:"source-tarsal-burnish-far",
    parentId:"face-outline",clipToParent:true,
    timing:{start:195,end:294},
    d:"M416 520 C426 510 435 507 446 506 "+
      "C458 505 469 508 475 513 "+
      "C459 509 448 510 440 511 "+
      "C428 514 422 520 417 524Z",
    bounds:{x:412,y:502,width:66,height:26},
    coverage:"open",deposition:"stroke-built",
    colors:["#5b4648","#2d272e","#7a5b59"],
    blendRadius:4.3,featherContacts:true,angle:15,
    pressure:.46,spacing:7.1,markStrength:.15,
    edgeRoughness:.17,outlineOpacity:0,nibStyle:"dry",
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
