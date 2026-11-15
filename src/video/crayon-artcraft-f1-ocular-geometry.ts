import type {CrayonElement} from "../../registry/video/materials/crayon-scene";

type Wax=Extract<CrayonElement,{kind:"wax"}>;
type Contour=Extract<CrayonElement,{kind:"contour"}>;

/**
 * ArtCraft F1, experimental native CRAYON1 reconstruction.
 * Reference: Christopher Campbell CC0, independently fixed 608×1082 browser
 * screenshot sha256 f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2.
 *
 * This is hand-authored pigment geometry, NOT photo pixels or a shader applied
 * to a raster. The prior semantic eye is available as an unchanged control.
 *
 * Near eye (source): outer canthus around x217/y557; upper lash rim climbs
 * through x243/y539 to x269/y533 and returns to inner x316/y544.
 * The limbus is partly hidden ABOVE by the upper lid, not a floating circle.
 * Far eye (source): compressed dark iris and line of the upper lid disappear
 * under source hair x460..485. A broad bright crescent is NOT visible.
 */
const sourceWax:Record<string,Partial<Wax>>={
  "sclera-near":{
    d:"M215 559 C225 545 247 536 266 535 "+
      "C290 532 309 538 319 545 "+
      "C311 555 292 565 273 569 "+
      "C248 577 228 573 215 559Z",
    bounds:{x:211,y:531,width:111,height:51},
    colors:["#a79b97","#625a61","#d0bfb2"],
    pressure:.77,spacing:5.6,markStrength:.19,underpaintTooth:.19,
    underpaintGradient:{
      light:"#cbc0b4",shadow:"#655861",focusX:.8,focusY:.55,radius:.86,
    },
  },
  "iris-near":{
    d:"M240 544 C243 536 253 534 265 535 "+
      "C276 536 283 545 282 554 "+
      "C281 564 272 568 260 568 "+
      "C248 567 240 560 240 544Z",
    bounds:{x:237,y:530,width:48,height:42},
    colors:["#49352f","#241e22","#77533f"],
    pressure:.94,markStrength:.35,
    underpaintGradient:{
      light:"#765440",shadow:"#201b20",focusX:.6,focusY:.81,radius:.86,
    },
  },
  "pupil-near":{
    d:"M253 545 C255 542 261 541 264 544 "+
      "C268 550 265 557 260 559 "+
      "C255 559 252 553 253 545Z",
    bounds:{x:251,y:539,width:18,height:23},
    colors:["#282123","#17161a","#433338"],
    pressure:.96,spacing:3.8,underpaintTooth:.08,
  },
  "upper-lid-near":{
    d:"M210 557 C220 537 240 523 263 519 "+
      "C289 516 314 530 326 545 "+
      "C306 537 289 534 269 536 "+
      "C245 536 225 546 215 566Z",
    bounds:{x:205,y:511,width:124,height:60},
    colors:["#a98888","#715961","#c9a39c"],
    blendRadius:5.8,pressure:.51,markStrength:.23,
  },
  "upper-lid-crease-near":{
    d:"M215 544 C225 523 245 514 265 513 "+
      "C291 510 313 521 326 539 "+
      "C305 523 286 519 264 523 "+
      "C244 526 225 535 215 544Z",
    bounds:{x:210,y:507,width:121,height:43},
    colors:["#98757a","#66515e","#bf9a98"],
    blendRadius:5.7,pressure:.36,markStrength:.15,
    featherContacts:true,
  },
  "lash-root-near":{
    d:"M216 559 C231 545 245 537 264 535 "+
      "C288 533 307 537 318 544 "+
      "C305 542 293 539 277 540 "+
      "C252 539 232 550 222 563Z",
    bounds:{x:213,y:530,width:109,height:37},
    colors:["#4b363a","#282329","#705656"],
    pressure:.79,spacing:4.5,markStrength:.28,underpaintTooth:.17,
  },
  "sclera-far":{
    d:"M404 527 C411 513 430 502 447 501 "+
      "C461 500 471 505 476 513 "+
      "C463 528 440 531 420 531 "+
      "Q408 532 404 527Z",
    bounds:{x:400,y:497,width:80,height:40},
    colors:["#827779","#4e464d","#aca0a0"],
    pressure:.72,markStrength:.16,
    underpaintGradient:{
      light:"#b1a4a0",shadow:"#51464b",focusX:.35,focusY:.65,radius:.84,
    },
  },
  "iris-far":{
    d:"M408 523 C411 511 425 505 441 503 "+
      "C453 501 464 509 463 520 "+
      "Q459 531 439 534 "+
      "C420 534 410 533 408 523Z",
    bounds:{x:405,y:500,width:62,height:36},
    colors:["#302627","#19171b","#503b35"],
    pressure:.94,underpaintTooth:.1,opaqueBurnish:.95,
    underpaintGradient:{
      light:"#544037",shadow:"#171619",focusX:.46,focusY:.68,radius:.87,
    },
  },
  "pupil-far":{
    d:"M425 519 C428 512 436 510 441 513 "+
      "C444 517 442 526 436 528 "+
      "C429 528 426 525 425 519Z",
    bounds:{x:423,y:509,width:21,height:22},
    colors:["#221c20","#141319","#33262a"],
    underpaintTooth:.07,opaqueBurnish:1,
  },
  "upper-lid-far":{
    d:"M399 528 C407 506 428 490 444 490 "+
      "C459 488 475 499 481 507 "+
      "C461 499 443 500 427 507 "+
      "C415 513 408 525 404 534Z",
    bounds:{x:395,y:482,width:91,height:56},
    colors:["#98767b","#66555d","#b49493"],
    pressure:.52,markStrength:.22,blendRadius:4.9,
  },
  "upper-lid-crease-far":{
    d:"M398 515 C410 493 430 483 447 485 "+
      "C461 486 477 498 481 507 "+
      "C463 496 449 493 434 498 "+
      "C416 503 405 511 398 515Z",
    bounds:{x:395,y:480,width:90,height:42},
    blendRadius:5.8,pressure:.36,markStrength:.15,
    featherContacts:true,
  },
  "lash-root-far":{
    d:"M404 529 C416 506 435 500 449 499 "+
      "C464 499 474 506 479 513 "+
      "C461 508 444 505 429 510 "+
      "C415 517 408 530 404 532Z",
    bounds:{x:400,y:496,width:83,height:41},
    colors:["#423035","#261e25","#5c464d"],
    pressure:.79,markStrength:.26,underpaintTooth:.15,
  },
};

/**
 * Deliberately irregular groups of attached CRAYON1 cubic wax-fibres.
 * No repeated tick spacing or synthetic vector-stroke eyelashes.
 * Roots stay within original dark lash band; tips are clustered under
 * and above the border with abbreviated lengths matching source crop.
 */
const sourceFibres:Record<string,Partial<Contour>>={
  "lash-contact-near":{
    d:[
      "M222 559 C221 556 219 554 217 553",
      "M225 554 C223 551 220 549 219 547",
      "M231 549 C229 546 226 545 226 543",
      "M237 544 C236 541 233 539 233 537",
      "M242 541 C241 538 238 535 238 534",
      "M247 539 C245 536 243 534 243 532",
      "M252 538 C251 536 249 533 249 532",
      "M257 537 C256 535 255 532 255 531",
      "M261 536 C260 533 260 531 261 530",
      "M267 535 C267 532 268 530 270 529",
      "M272 536 C273 533 275 531 276 531",
      "M279 535 C280 533 283 531 283 532",
      "M285 537 C287 534 289 533 291 533",
      "M292 538 C294 536 296 535 298 536",
      "M298 539 C302 537 304 537 306 537",
      "M304 542 C308 540 311 540 312 542",
    ].join(" "),
    width:.23,opacity:.63,waxPressure:.49,
  },
  "lash-contact-far":{
    d:[
      "M408 526 C406 523 404 521 404 519",
      "M414 518 C412 514 410 512 410 511",
      "M419 514 C417 510 416 508 416 507",
      "M425 509 C425 506 423 504 423 503",
      "M431 506 C431 502 432 499 434 499",
      "M438 504 C439 501 440 499 442 499",
      "M447 504 C448 502 450 501 452 502",
      "M453 505 C456 503 458 504 460 505",
    ].join(" "),
    width:.21,opacity:.59,waxPressure:.47,
  },
};

export const CRAYON_F1_RECONSTRUCTED_OCULAR_IDS=Object.freeze([
  ...Object.keys(sourceWax),...Object.keys(sourceFibres),
] as string[]);

export function crayonF1ReconstructEyes(elements:readonly CrayonElement[]):CrayonElement[]{
  return elements.map(element=>{
    if(element.kind==="wax"){
      const patch=sourceWax[element.id];
      return patch?{...element,...patch}:element;
    }
    if(element.kind==="contour"){
      const patch=sourceFibres[element.id];
      return patch?{...element,...patch}:element;
    }
    return element;
  });
}
