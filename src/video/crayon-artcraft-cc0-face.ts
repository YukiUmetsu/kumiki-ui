import type {CrayonColor,CrayonElement,CrayonSceneSpec}
  from "../../registry/video/materials/crayon-scene";
import {CRAYON_PORTRAIT_AUDIT}
  from "./crayon-artcraft-portrait-audit";
import {crayonHash} from "../../registry/video/materials/crayon";

/**
 * ArtCraft v7: independently source-registered native-crayon facial
 * construction, intentionally NOT an approved finished portrait.
 *
 * The anatomical observation is a real 608x1082 browser capture of:
 * https://commons.wikimedia.org/wiki/File:Brunette_woman_portrait_(Unsplash).jpg
 * Christopher Campbell, CC0 1.0, photograph 2015.
 *
 * Unlike the unrelated synthetic adult bust, every major plane below uses
 * THIS source photograph's original screen-space (x,y) coordinates and
 * the 18 frozen source landmark annotations. There is no auto-fitting, no
 * invented generic face proportion template and no photographic texture.
 *
 * The full original camera JPEG is not locally certified. This is a
 * source-led research artifact; do not transplant it onto the B1 body.
 */
export const CRAYON_F1_FACE_PROOF={
  width:608,
  height:1082,
  sourceSha256:CRAYON_PORTRAIT_AUDIT.source.sha256,
  url:CRAYON_PORTRAIT_AUDIT.source.link,
  author:"Christopher Campbell",
  rights:"CC0 1.0",
  crop:"Exact screenshot 608x1082 (not original camera JPEG)",
  sourceLandmarks:CRAYON_PORTRAIT_AUDIT.sourcePoints,
  review:"Unapproved artwork; source anchors alone are not pixel fidelity",
} as const;
export type Cc0FaceView="wax"|"anatomy";
export interface Cc0FaceOptions {detail?:number;view?:Cc0FaceView}
type Wax=Extract<CrayonElement,{kind:"wax"}>;
type Ink=Extract<CrayonElement,{kind:"contour"}>;
const rect=(x:number,y:number,width:number,height:number)=>
  ({x,y,width,height});
const C={
  paper:"#f4e6d3" as CrayonColor,
  hair:["#4c382f","#21191d","#886753"] as const,
  hairLight:["#815c4a","#45302f","#b49273"] as const,
  hairShadow:["#3a2a29","#20191f","#6d4c43"] as const,
  skin:["#d1a490","#92766f","#f0c9ae"] as const,
  skinLight:["#eed1be","#bb9a91","#ffe1c6"] as const,
  skinCool:["#c29e9a","#896c76","#e0c2b7"] as const,
  cheek:["#dca78e","#ad7b77","#eec2a7"] as const,
  socket:["#aa807e","#66545e","#c59d9a"] as const,
  lid:["#c7a19b","#886a72","#e3b8ad"] as const,
  sclera:["#b3a5a0","#777074","#dfc9bb"] as const,
  iris:["#604b3c","#241f22","#9a7962"] as const,
  pupil:["#251e20","#17151b","#453639"] as const,
  eyebrow:["#77564b","#3e2d30","#a38775"] as const,
  nose:["#c89482","#8d645d","#e5b19e"] as const,
  noseLight:["#f0cdb5","#b6867a","#ffe0c3"] as const,
  lip:["#bd8883","#814d54","#dfaaa0"] as const,
  lipLight:["#d4a19c","#a7797e","#f1bdb1"] as const,
  mouth:["#773d43","#43272f","#ad6c6e"] as const,
  neck:["#95736c","#483a3d","#c2a08b"] as const,
} satisfies Record<string,CrayonColor|readonly [CrayonColor,CrayonColor,CrayonColor]>;

export const CRAYON_F1_FACE_PARTS=[
  "hair-back","hair-crown-surface","neck-attached","ear-underplane",
  "ear-helix-value","ear-concha-shadow","ear-antihelix-reflection",
  "ear-lobe-warmth","ear-stud-setting","ear-stud-glint","face-outline",
  "forehead-light","brow-superciliary-near","brow-superciliary-far",
  "socket-near","socket-far","sclera-near","sclera-far",
  "iris-near","iris-far","pupil-near","pupil-far",
  "upper-lid-near","upper-lid-far",
  "lash-root-near","lash-root-far","lower-lid-near","lower-lid-far",
  "malar-cheek-near","cheek-far","nose-root","nose-dorsum",
  "nose-tip","nose-alar-near","nose-alar-far",
  "philtrum","lip-upper","lip-lower","oral-opening",
  "chin-plane","jaw-underside","cheek-malar-cast",
  "cheek-malar-bounce","nose-sidewall-form","nose-subalar-contact",
  "nose-alar-undercut-near","nose-alar-undercut-far",
  "nose-tip-reflected-light","hair-left-curtain",
  "hair-right-curtain",
] as const;

export function crayonCc0FaceStudy(options:Cc0FaceOptions={}):CrayonSceneSpec{
  const detail=options.detail??1,view=options.view??"wax";
  if(!Number.isFinite(detail)||detail<.2||detail>1||
    !["wax","anatomy"].includes(view))
    throw new RangeError("Invalid ArtCraft F1 face controls");
  const elements:CrayonElement[]=[];
  const wax=(id:string,d:string,bounds:ReturnType<typeof rect>,
    colors:readonly [CrayonColor,CrayonColor,CrayonColor],
    stage:[number,number],overrides:Partial<Wax>={})=>{
    const opaque=overrides.coverage!=="open";
    elements.push({kind:"wax",id,d,bounds,colors,
      timing:{start:stage[0],end:stage[1]},deposition:"stroke-built",
      pressure:.75,spacing:7.2,strokeOrder:"patches",
      nibStyle:"dry",markLength:"long",
      markStrength:.32,outlineOpacity:0,edgeRoughness:.16,
      ...overrides,
      coverage:opaque?"opaque":"open",
      underpaintTooth:opaque?(overrides.underpaintTooth??.34):0,
    });
  };
  const mark=(id:string,d:string,color:CrayonColor,width:number,
    stage:[number,number]=[175,292],opacity=.62,parentId?:string)=>{
    const item:Ink={kind:"contour",id,d,color,width,opacity,
      timing:{start:stage[0],end:stage[1]},
      ...(parentId?{parentId,clipToParent:true}:{})};
    elements.push(item);
  };

  // BACKGROUND HAIR: these continuously connected masses envelope the
  // source's specific long hairline, not a symmetrical cap or faux bob.
  wax("hair-back",
    "M-45 405C-12 280 62 207 174 182"+
    "C255 166 331 165 379 196C451 217 473 264 499 316"+
    "C530 386 564 536 596 660L631 1103L-27 1103"+
    "C-36 963 -25 717 -45 405Z",
    rect(-48,164,682,941),C.hair,[1,88],
    {pressure:.79,spacing:8.3,markStrength:.27,
      underpaintTooth:.19,edgeRoughness:.26,
      underpaintGradient:{light:"#a17c60",shadow:"#2b2025",
        focusX:.33,focusY:.17,radius:1.14}});
  // Crown is an upper/temple wax volume with its OWN visible surface.
  // Hair-back contains the entire background behind the face, so clipping
  // source crown fibers to hair-back would print dark hatches ON THE SKIN
  // when these fibers are drawn late. A crown-only parent fixes the
  // anatomical overlap without changing semantic element seed order.
  wax("hair-crown-surface",
    "M-44 404C-8 270 83 195 182 183"+
    "Q303 157 381 195Q447 218 478 313"+
    "Q474 347 459 383Q448 337 421 311"+
    "Q391 279 365 273Q316 261 261 270"+
    "Q206 282 161 322Q111 354 89 417"+
    "Q60 466 37 501L-35 501Z",
    rect(-48,157,531,350),C.hairLight,[26,112],
    {pressure:.81,spacing:9.3,markStrength:.15,
      edgeRoughness:.25,underpaintTooth:.16,
      underpaintGradient:{light:"#b48a69",shadow:"#302327",
        focusX:.57,focusY:.23,radius:1.03}});
  // The actual face taper remains visible from near left cheek across an
  // oblique jaw to the chin at (398,858); the far edge is hair-occluded.
  wax("neck-attached",
    "M149 807Q179 852 255 865Q334 891 418 841"+
    "Q431 915 447 976Q469 1045 480 1091"+
    "L122 1091Q135 1005 139 930Q150 872 149 807Z",
    rect(116,798,374,298),C.neck,[17,115],
    {pressure:.75,spacing:8.1,markStrength:.17,
      underpaintTooth:.2,underpaintGradient:{light:"#bd9985",shadow:"#584142",
        focusX:.43,focusY:.12,radius:1.18}});
  wax("ear-underplane",
    "M99 650C81 644 67 666 67 692Q68 733 86 758"+
    "Q104 777 125 767Q152 753 151 728Q144 682 124 661Z",
    rect(62,642,95,139),C.skinCool,[16,113],
    {pressure:.58,spacing:7.7,markStrength:.21,underpaintTooth:.2});
  // Source F1 left ear: helix/root, antihelix and concha overlap the
  // photographed cheek at x65..144/y653..781. The small silver earring
  // anchors to the lobe, rather than floating as a circular face symbol.
  wax("ear-helix-value",
    "M95 661Q80 659 77 680Q77 708 87 728Q89 750 105 757"+
    "Q119 758 126 746Q109 745 107 730Q93 715 93 693"+
    "Q89 679 99 670Z",
    rect(73,650,59,114),C.skinCool,[93,188],
    {parentId:"ear-underplane",clipToParent:true,coverage:"open",
      pressure:.56,spacing:6.4,markStrength:.26,blendRadius:4.4});
  wax("ear-concha-shadow",
    "M107 684Q126 683 129 704Q132 719 121 729"+
    "Q110 726 108 713Q97 700 107 684Z",
    rect(96,678,39,57),
    ["#916e70","#5d4a50","#bd9790"],[117,215],
    {parentId:"ear-underplane",clipToParent:true,coverage:"open",
      pressure:.64,spacing:5.7,markStrength:.4,blendRadius:3.2});
  wax("ear-antihelix-reflection",
    "M91 676Q103 673 109 690Q105 707 110 720"+
    "Q103 732 96 718Q88 700 91 676Z",
    rect(85,669,31,69),C.skinLight,[132,229],
    {parentId:"ear-underplane",clipToParent:true,coverage:"open",
      pressure:.39,spacing:7.2,markStrength:.18,blendRadius:5});
  wax("ear-lobe-warmth",
    "M87 726Q91 742 109 750Q119 760 114 771"+
    "Q100 781 89 761Q83 746 87 726Z",
    rect(79,722,44,58),C.skin,[151,238],
    {parentId:"ear-underplane",clipToParent:true,coverage:"open",
      pressure:.47,spacing:8,markStrength:.15,blendRadius:5});
  wax("ear-stud-setting",
    "M101 759Q106 754 113 758Q119 764 115 770"+
    "Q108 774 103 770Q99 764 101 759Z",
    rect(97,752,25,25),
    ["#aba29b","#716b6e","#d3cac2"],[193,274],
    {parentId:"ear-underplane",clipToParent:true,
      pressure:.74,spacing:4.4,markStrength:.3,underpaintTooth:.17});
  wax("ear-stud-glint",
    "M105 760Q110 759 112 764Q110 768 106 767"+
    "Q103 765 105 760Z",
    rect(101,755,16,17),
    ["#f2ece4","#aca39e","#ffffff"],[229,289],
    {parentId:"ear-stud-setting",clipToParent:true,
      pressure:.63,spacing:4.4,markStrength:.19,underpaintTooth:.12});
  // SOURCE-CONTOUR MAIN SKIN. Forehead x145..439, outer cheek x107,
  // mandibular contact x161..459, chin near 398,858.
  wax("face-outline",
    "M142 353C170 305 236 282 292 287"+
    "C350 274 408 286 437 331"+
    "Q460 388 468 464C479 538 492 604 501 682"+
    "Q510 731 495 775C477 809 444 843 404 856"+
    "C364 871 322 874 275 867Q206 857 172 820"+
    "C145 795 119 762 112 719Q101 669 106 604"+
    "Q108 530 108 467C111 421 118 389 142 353Z",
    rect(99,272,412,608),C.skin,[42,147],
    {underpaintGradient:{light:"#efd0b7",shadow:"#a87a76",
        focusX:.4,focusY:.29,radius:1.1},
      markStrength:.14,pressure:.72,underpaintTooth:.24,spacing:11.5});
  // THE SOURCE'S OPEN LIGHT ZONES: warm left cheek, cooler forehead and
  // far face. Each bounded glaze retains the same continuous skin mass.
  wax("forehead-light",
    "M159 357Q230 291 341 295Q419 293 440 367"+
    "Q449 419 422 465Q369 469 317 438"+
    "Q259 429 202 486Q151 462 135 431Z",
    rect(129,290,321,207),C.skinLight,[63,167],
    {parentId:"face-outline",clipToParent:true,coverage:"open",
      pressure:.36,spacing:11,markStrength:.1,blendRadius:14});
  wax("temple-left-shadow",
    "M139 350Q171 325 183 350Q162 408 162 470"+
    "Q144 531 126 554Q116 473 139 350Z",
    rect(114,320,75,246),C.skinCool,[75,176],
    {parentId:"face-outline",clipToParent:true,coverage:"open",
      pressure:.3,spacing:12,markStrength:.15,blendRadius:9});
  wax("temple-far",
    "M419 321Q455 361 457 419Q456 480 471 535"+
    "Q474 609 495 672Q478 648 465 602"+
    "Q446 536 418 477Z",
    rect(409,310,94,373),C.skinCool,[77,182],
    {parentId:"face-outline",clipToParent:true,coverage:"open",
      pressure:.37,spacing:9,markStrength:.13,blendRadius:11});
  wax("malar-cheek-near",
    "M123 572Q152 544 185 564Q214 589 244 588"+
    "Q273 610 294 657Q264 735 217 774"+
    "Q153 753 119 709Q109 628 123 572Z",
    rect(109,540,195,244),C.cheek,[87,190],
    {parentId:"face-outline",clipToParent:true,coverage:"open",
      pressure:.3,spacing:10.5,markStrength:.14,blendRadius:15});
  // The source has a definite under-malar turn and bouncing light from
  // the near cheekbone. One faint blurred polygon cannot carry the
  // photographed 53-level local contrast: preserve two directional wax
  // contacts over the same attached facial surface.
  wax("cheek-malar-cast",
    "M108 611Q128 624 152 655Q176 696 198 722"+
    "Q184 768 154 793Q125 768 112 712Q101 653 108 611Z",
    rect(98,603,111,199),
    ["#986d68","#654a50","#bc8d7f"],[93,204],
    {parentId:"face-outline",clipToParent:true,coverage:"open",
      blendRadius:10,pressure:.66,markStrength:.29,spacing:8.5});
  wax("cheek-malar-bounce",
    "M133 575Q161 561 196 584Q230 609 245 658"+
    "Q224 693 188 696Q158 676 133 626Z",
    rect(125,554,128,152),
    ["#f4ceaf","#c89f95","#ffe2c3"],[119,209],
    {parentId:"face-outline",clipToParent:true,coverage:"open",
      blendRadius:12,pressure:.58,markStrength:.2,spacing:11});
  wax("malar-highlight",
    "M143 559Q164 553 177 563Q194 592 190 629"+
    "Q173 649 146 643Q127 607 143 559Z",
    rect(126,545,77,109),C.skinLight,[113,201],
    {parentId:"face-outline",clipToParent:true,coverage:"open",
      pressure:.29,spacing:12,markStrength:.12,blendRadius:15});
  wax("cheek-far",
    "M436 561Q481 558 485 633Q504 703 480 775"+
    "Q469 792 442 808L430 750Q460 672 436 561Z",
    rect(421,549,86,272),C.skinCool,[94,184],
    {parentId:"face-outline",clipToParent:true,coverage:"open",
      pressure:.34,spacing:9.5,markStrength:.16,blendRadius:11});
  wax("jaw-underside",
    "M118 735Q162 807 232 839Q322 880 400 850"+
    "Q438 830 485 779Q469 842 403 865"+
    "Q326 899 251 872Q173 851 118 775Z",
    rect(106,721,388,182),C.skinCool,[112,201],
    {parentId:"face-outline",clipToParent:true,coverage:"open",
      pressure:.29,spacing:9.4,markStrength:.13,blendRadius:9});
  wax("chin-plane",
    "M355 773Q397 767 449 770Q480 790 463 819"+
    "Q436 853 395 861Q354 863 334 839"+
    "Q340 813 355 773Z",
    rect(326,758,159,112),C.skinLight,[137,221],
    {parentId:"face-outline",clipToParent:true,coverage:"open",
      pressure:.26,spacing:9.5,markStrength:.12,blendRadius:10});
  // EYE SOCKETS: their dark value comes BEFORE the sclera, and the
  // upper-lid wax fully overlaps each exposed iris, source F1 observed.
  wax("socket-near",
    "M183 522Q199 484 243 470Q292 461 316 489"+
    "Q335 516 319 555Q287 591 236 588"+
    "Q196 582 183 550Z",
    rect(175,457,163,143),C.socket,[89,197],
    {parentId:"face-outline",clipToParent:true,coverage:"open",
      pressure:.47,spacing:6.2,markStrength:.25,blendRadius:8.5});
  wax("socket-far",
    "M386 478Q400 450 435 440Q467 437 475 465"+
    "Q492 502 484 534Q454 555 416 547"+
    "Q390 533 386 478Z",
    rect(379,433,115,131),C.socket,[94,199],
    {parentId:"face-outline",clipToParent:true,coverage:"open",
      pressure:.43,spacing:5.7,markStrength:.22,blendRadius:7});
  wax("brow-superciliary-near",
    "M192 498Q217 470 253 465Q299 456 326 476"+
    "Q285 468 259 480Q218 490 192 498Z",
    rect(184,451,150,57),C.eyebrow,[118,224],
    {parentId:"face-outline",clipToParent:true,coverage:"open",
      pressure:.46,spacing:5.7,markStrength:.31,blendRadius:2.7});
  wax("brow-superciliary-far",
    "M395 462Q420 439 447 434Q464 434 475 442"+
    "Q447 442 424 454Q409 463 395 462Z",
    rect(388,430,92,42),C.eyebrow,[120,223],
    {parentId:"face-outline",clipToParent:true,coverage:"open",
      pressure:.47,spacing:5.4,markStrength:.27,blendRadius:2});
  wax("sclera-near",
    "M213 551Q230 523 267 520Q307 515 325 545"+
    "Q296 559 273 564C241 570 219 564 213 551Z",
    rect(205,511,126,68),C.sclera,[131,236],
    {parentId:"face-outline",clipToParent:true,
      pressure:.79,spacing:5.9,markStrength:.2,
      underpaintGradient:{light:"#cfc1b8",shadow:"#6e6368",
        focusX:.76,focusY:.6,radius:1}});
  wax("sclera-far",
    "M406 518Q417 499 439 498Q464 496 474 510"+
    "Q466 526 447 530Q421 532 406 518Z",
    rect(400,488,81,50),C.sclera,[135,234],
    {parentId:"face-outline",clipToParent:true,
      pressure:.75,spacing:4.5,markStrength:.16,
      underpaintGradient:{light:"#aaa09d",shadow:"#50484e",
        focusX:.75,focusY:.7,radius:1}});
  // Use photo-observed near iris center ~260,550, far ~441,518.
  // Exposed iris is NOT a perfect round eye glyph: upper contour flattens
  // under the lid, lower iris curves into lower lash line.
  wax("iris-near",
    "M241 535Q247 527 259 528Q279 527 284 540"+
    "Q288 554 273 563Q255 567 246 554Q240 547 241 535Z",
    rect(237,523,53,48),C.iris,[148,247],
    {parentId:"sclera-near",clipToParent:true,
      pressure:.86,spacing:4.2,markStrength:.44});
  wax("pupil-near",
    "M252 536Q258 533 265 537Q274 541 271 550"+
    "Q266 558 257 555Q251 551 252 536Z",
    rect(249,530,28,29),C.pupil,[156,250],
    {parentId:"iris-near",clipToParent:true,
      pressure:.95,spacing:4.1,markStrength:.49});
  wax("iris-far",
    "M424 509Q430 502 443 503Q456 501 460 512"+
    "Q465 524 451 532Q437 534 428 525Z",
    rect(420,498,48,39),C.iris,[146,245],
    {parentId:"sclera-far",clipToParent:true,
      pressure:.83,spacing:4.3,markStrength:.4});
  wax("pupil-far",
    "M434 510Q439 508 446 511Q451 517 448 524"+
    "Q442 529 436 523Z",
    rect(431,505,22,28),C.pupil,[155,253],
    {parentId:"iris-far",clipToParent:true,pressure:.9,
      spacing:4.0,markStrength:.42});
  wax("upper-lid-near",
    "M207 553Q231 519 264 514Q304 508 328 539"+
    "Q303 526 276 527Q238 526 220 552Z",
    rect(203,505,130,51),C.lid,[170,264],
    {parentId:"face-outline",pressure:.76,spacing:5.3,markStrength:.25});
  wax("upper-lid-far",
    "M402 521Q415 493 442 491Q467 489 479 509"+
    "Q460 503 438 505Q420 505 407 521Z",
    rect(395,485,91,41),C.lid,[176,263],
    {parentId:"face-outline",pressure:.72,spacing:5.5,markStrength:.24});
  wax("lash-root-near",
    "M213 551Q234 525 264 522Q299 518 324 542"+
    "Q292 530 267 532Q233 533 219 557Z",
    rect(208,517,121,46),C.eyebrow,[194,281],
    {parentId:"face-outline",clipToParent:true,coverage:"open",
      pressure:.62,spacing:4.9,markStrength:.33,blendRadius:1.6});
  wax("lash-root-far",
    "M407 519Q420 498 440 497Q461 495 477 511"+
    "Q461 506 440 508Q419 508 412 526Z",
    rect(403,491,81,41),C.eyebrow,[194,278],
    {parentId:"face-outline",clipToParent:true,coverage:"open",
      pressure:.6,spacing:4.2,markStrength:.29,blendRadius:1.2});
  wax("lower-lid-near",
    "M213 551Q235 561 262 566Q302 563 326 542"+
    "Q311 573 282 579Q241 588 214 560Z",
    rect(207,538,124,55),C.lid,[184,276],
    {parentId:"face-outline",clipToParent:true,coverage:"open",
      pressure:.37,spacing:7.7,markStrength:.13,blendRadius:8.5});
  wax("lower-lid-far",
    "M404 522Q419 530 440 533Q466 532 478 510"+
    "Q476 540 446 546Q420 546 406 530Z",
    rect(399,506,85,48),C.lid,[186,274],
    {parentId:"face-outline",clipToParent:true,coverage:"open",
      pressure:.34,spacing:7.5,markStrength:.13,blendRadius:7});
  // NOSE: bridge and bulb are DIFFERENT continuous paint planes. The
  // alar wings are source-observed asymmetric and nostril *contact*
  // remains a small deep undercut rather than a sketched triangle.
  wax("nose-root",
    "M330 486Q356 483 370 514Q377 547 382 571"+
    "Q365 576 352 554Q342 522 330 486Z",
    rect(321,477,69,103),C.skinCool,[109,203],
    {parentId:"face-outline",clipToParent:true,coverage:"open",
      blendRadius:10,pressure:.38,spacing:8,markStrength:.16});
  wax("nose-dorsum",
    "M357 531Q374 529 392 550Q404 573 420 597"+
    "Q435 615 428 628Q407 646 382 632"+
    "Q368 616 367 595Q358 558 357 531Z",
    rect(349,523,90,126),C.noseLight,[122,223],
    {parentId:"face-outline",clipToParent:true,coverage:"open",
      blendRadius:9,pressure:.33,spacing:7.4,markStrength:.19});
  wax("nose-sidewall",
    "M354 558Q367 575 371 605Q379 636 397 640"+
    "Q376 651 365 636Q348 604 354 558Z",
    rect(343,549,61,112),C.nose,[129,235],
    {parentId:"face-outline",clipToParent:true,coverage:"open",
      blendRadius:7,pressure:.63,spacing:5.8,markStrength:.33});
  wax("nose-tip",
    "M383 598Q400 586 420 599Q436 607 431 624"+
    "Q420 638 401 634Q384 632 380 620Z",
    rect(375,584,61,56),C.noseLight,[141,240],
    {parentId:"face-outline",clipToParent:true,coverage:"open",
      blendRadius:6.4,pressure:.51,spacing:5.2,markStrength:.25});
  wax("nose-alar-near",
    "M380 616Q389 607 404 616Q411 625 406 642"+
    "Q390 651 381 639Z",
    rect(374,604,41,51),C.nose,[148,248],
    {parentId:"face-outline",clipToParent:true,coverage:"open",
      blendRadius:2.9,pressure:.68,spacing:4.4,markStrength:.46});
  wax("nose-alar-far",
    "M442 602Q454 594 463 606Q468 621 459 635"+
    "Q448 636 445 627Z",
    rect(436,592,38,49),C.nose,[147,249],
    {parentId:"face-outline",clipToParent:true,coverage:"open",
      blendRadius:3.3,pressure:.62,spacing:4.8,markStrength:.35});
  // Source-observed alar cartilages require attached undercuts and
  // reflected light BEFORE a drawn nostril. The earlier render showed two
  // floating ink circles on featureless skin; these overlapping pressure
  // planes support a three-dimensional tip and asymmetric nasal wall.
  wax("nose-sidewall-form",
    "M336 513Q349 527 357 558Q364 588 377 618"+
    "Q375 636 365 628Q346 605 340 570Q333 540 336 513Z",
    rect(329,505,56,132),
    ["#a57b76","#71565c","#cfa292"],[136,246],
    {parentId:"face-outline",clipToParent:true,coverage:"open",
      blendRadius:7,pressure:.7,markStrength:.3,spacing:6});
  wax("nose-subalar-contact",
    "M371 626Q380 627 388 638Q400 648 413 636"+
    "Q426 627 434 630Q428 651 405 659"+
    "Q383 660 371 644Z",
    rect(365,622,75,43),
    ["#996b65","#624449","#c19381"],[157,259],
    {parentId:"face-outline",clipToParent:true,coverage:"open",
      blendRadius:4,pressure:.69,markStrength:.39,spacing:5.5});
  wax("nose-alar-undercut-near",
    "M379 631Q385 620 397 626Q406 631 404 640"+
    "Q393 647 381 640Z",
    rect(374,616,37,34),
    ["#8a5550","#4d3539","#ad7d71"],[176,269],
    {parentId:"face-outline",clipToParent:true,coverage:"open",
      blendRadius:2,pressure:.76,markStrength:.55,spacing:4.3});
  wax("nose-alar-undercut-far",
    "M441 617Q450 608 459 615Q466 622 455 632"+
    "Q446 635 441 626Z",
    rect(437,605,34,34),
    ["#90645a","#5b3d3d","#b98b7c"],[173,268],
    {parentId:"face-outline",clipToParent:true,coverage:"open",
      blendRadius:2,pressure:.72,markStrength:.49,spacing:4.2});
  wax("nose-tip-reflected-light",
    "M382 611Q392 597 409 599Q426 602 431 612"+
    "Q422 622 406 622Q390 624 382 611Z",
    rect(376,590,62,42),
    ["#edc8ae","#b89283","#ffe0ba"],[174,271],
    {parentId:"face-outline",clipToParent:true,coverage:"open",
      blendRadius:7,pressure:.54,markStrength:.17,spacing:8.1});
  // Mouth's natural perspective slopes upwards toward the occluded far
  // cheek. Separate vermilion volumes, dark oral slit and visible tooth
  // interruption are sourced from F1 x348..490/y681..775, not a U glyph.
  wax("philtrum",
    "M407 645Q415 655 424 661Q440 656 446 640"+
    "Q460 665 449 692Q436 697 424 690Q411 687 407 645Z",
    rect(400,636,65,70),C.skinCool,[135,222],
    {parentId:"face-outline",clipToParent:true,coverage:"open",
      pressure:.29,spacing:8.8,markStrength:.14,blendRadius:8});
  wax("lip-upper",
    "M354 742Q366 731 383 717Q402 703 422 701"+
    "Q440 697 457 701Q473 696 484 707"+
    "Q487 710 485 714Q462 714 440 725"+
    "Q418 735 389 743Q368 748 354 742Z",
    rect(350,692,140,61),C.lip,[166,260],
    {parentId:"face-outline",pressure:.55,spacing:7.2,
      markStrength:.25,underpaintTooth:.24});
  wax("oral-opening",
    "M356 742Q384 729 409 721Q439 715 465 711"+
    "Q478 708 486 713Q467 728 439 734"+
    "Q392 748 357 747Z",
    rect(351,705,140,47),C.mouth,[194,279],
    {parentId:"face-outline",pressure:.71,spacing:5.3,
      markStrength:.35,underpaintTooth:.27});
  wax("mouth-teeth",
    "M415 727Q437 717 454 715Q463 713 468 715"+
    "Q448 725 420 730Z",
    rect(412,710,61,25),["#ad9894","#7d6b6d","#cab4aa"],[207,284],
    {parentId:"oral-opening",clipToParent:true,pressure:.31,
      markStrength:.08,spacing:8.1,underpaintTooth:.12});
  wax("lip-lower",
    "M363 744Q386 747 412 739Q447 731 484 717"+
    "Q488 735 475 747Q446 766 414 766"+
    "Q383 767 369 756Z",
    rect(357,713,134,60),C.lipLight,[199,286],
    {parentId:"face-outline",pressure:.49,spacing:8.4,
      markStrength:.18,underpaintTooth:.18});
  // Silhouette-order lock: hair curtains lie on TOP of the face on right
  // and behind left cheek, selectively masking the far pupil's outer edge.
  wax("hair-left-curtain",
    "M-33 352C-4 269 77 202 186 193"+
    "C143 224 108 270 97 337Q80 408 80 476"+
    "Q74 535 74 613Q54 665 59 737"+
    "C74 827 92 947 111 1093L-27 1093Z",
    rect(-36,181,233,919),C.hairShadow,[121,236],
    {pressure:.79,spacing:8.7,markStrength:.28,
      underpaintTooth:.22,edgeRoughness:.29});
  wax("hair-right-curtain",
    "M379 191Q450 209 480 263C507 326 523 423 538 517"+
    "Q548 636 566 742Q582 851 615 1091"+
    "L434 1091Q464 970 476 863"+
    "Q486 772 491 709Q490 646 480 590"+
    "Q474 544 466 485Q464 394 438 338"+
    "Q416 294 379 191Z",
    rect(376,184,245,915),C.hair,[130,240],
    {pressure:.8,spacing:8.2,markStrength:.28,
      underpaintTooth:.2,edgeRoughness:.32,
      underpaintGradient:{light:"#956c52",shadow:"#251c20",
        focusX:.6,focusY:.32,radius:1.2}});
  // Interior medium-specific marks correspond to *observed* direction:
  // thick root sweep across crown, thin vertical strands on right curtain,
  // subtle geometry-attached brows/lashes and nose/lip contact. These are
  // NOT random circles or evenly spaced global crosshatching.
  const hairFlow=[
    "M45 399Q68 279 184 222Q262 193 350 208",
    "M21 445Q40 316 150 241Q219 198 305 212",
    "M12 479Q30 379 88 302Q174 217 284 211",
    "M48 502Q57 352 153 273Q232 222 323 222",
    "M90 398Q110 293 210 247Q285 226 367 252",
    "M142 287Q222 224 300 233Q371 241 425 303",
    "M195 212Q260 192 331 224Q387 245 428 319",
    "M255 198Q300 198 348 238Q398 271 439 358",
    "M325 209Q376 239 415 303Q449 393 473 473",
    "M409 263Q446 338 470 439Q495 575 501 696",
    "M439 310Q474 420 486 558Q500 718 489 863",
    "M457 358Q482 473 503 611Q514 815 476 1003",
    "M474 416Q503 579 519 763Q517 940 503 1074",
    "M482 470Q510 615 538 800Q537 973 546 1087",
    "M489 510Q525 689 545 882Q547 992 567 1095",
    "M69 656Q68 776 95 924Q98 1031 100 1084",
    "M42 612Q47 805 72 941Q79 1048 75 1085",
  ] as const;
  for(let i=0;i<Math.round(hairFlow.length*detail);i++)
    mark("hair-fiber-flow-"+i,hairFlow[i],
      i%4===0?"#b28e70":i%3===0?"#34252a":"#9d7965",
      i%4===0?1.05:.65,[204+(i%4)*2,298],
      i%5===0?.55:.35,i<9?"hair-crown-surface":
      i<15?"hair-right-curtain":"hair-left-curtain");

  // Hair is a flow field and a value mass, not a random hatch screen.
  // Photo F1: short crown roots sweep across the skull, while the two
  // hanging curtains turn vertical with gravity. Unequal local
  // source-space cubic strands remain clipped to these color masses.
  // A partial mark is a tapered crayon fiber, not an opaque new hair rod.
  const fiber=(seed:number,index:number,channel:number)=>
    crayonHash(seed,index,channel);
  // Each strand has independent source-surface curvature, but 240 is the
  // CRAYON1 semantic-element budget for a *whole film*. Batch short fiber
  // centerlines into six pigment/width bands per mass. 267 separate contours
  // would trip scene validation, increase SVG memory and prevent animation.
  // Grouped compound paths keep each strand's actual cubic topology without
  // inserting 267 new React nodes or a single uniform-width hair screen.
  const hairBands=6;
  const pigment=["#2c2427","#554039","#806050",
    "#a47a61","#674b40","#c19a76"] as const;
  const finishHair=(region:"left"|"right"|"crown",
    parentId:string,startFrame:number,bands:string[][])=>{
    for(let band=0;band<hairBands;band++){
      const path=bands[band].join(" ");
      if(!path)continue;
      mark("hair-rooted-"+region+"-"+band,path,
        pigment[band],.31+band*.155,
        [startFrame+(band%3)*4,299],.27+band*.057,parentId);
    }
  };
  for(const [side,count,seed] of [
    ["left",85,33107],["right",130,44631],
  ] as const){
    const parentId=side==="left"?"hair-left-curtain":"hair-right-curtain";
    const bands=Array.from({length:hairBands},()=>[] as string[]);
    for(let i=0;i<Math.round(count*detail);i++){
      const u=fiber(seed,i,1),v=fiber(seed,i,2);
      const x=side==="left"?-20+u*148:433+u*141;
      const y=(side==="left"?352:290)+v*(side==="left"?660:750);
      const len=34+fiber(seed,i,3)*151;
      // Left mass falls around the jaw; right mass follows the occluding
      // far-face curtain. Both are seeded in the same F1 source frame.
      const sway=(side==="left"?.05:.13)+(fiber(seed,i,4)-.5)*.13;
      const bend=side==="left"?-3:6;
      const d="M"+x.toFixed(2)+" "+y.toFixed(2)+
        " C"+(x+len*sway*.21+bend).toFixed(2)+" "+(y+len*.29).toFixed(2)+
        " "+(x+len*sway*.82).toFixed(2)+" "+(y+len*.76).toFixed(2)+
        " "+(x+len*sway).toFixed(2)+" "+(y+len).toFixed(2);
      const band=Math.min(hairBands-1,
        Math.floor(fiber(seed,i,6)*hairBands));
      bands[band].push(d);
    }
    finishHair(side,parentId,198,bands);
  }
  // Crown fibers turn across the source's oblique parting and move toward
  // each side, unlike the two approximately vertical curtain flow fields.
  const crownBands=Array.from({length:hairBands},()=>[] as string[]);
  for(let i=0;i<Math.round(52*detail);i++){
    const u=fiber(66317,i,1),t=fiber(66317,i,2);
    const originX=213+u*156,originY=184+t*68;
    const direction=u<.55?-1:1;
    const len=25+fiber(66317,i,3)*118;
    const dx=direction*len*(.55+fiber(66317,i,4)*.37);
    const dy=len*(.22+fiber(66317,i,5)*.36);
    const d="M"+originX.toFixed(2)+" "+originY.toFixed(2)+
      " C"+(originX+dx*.22).toFixed(2)+" "+(originY-dy*.42).toFixed(2)+
      " "+(originX+dx*.76).toFixed(2)+" "+(originY+dy*.15).toFixed(2)+
      " "+(originX+dx).toFixed(2)+" "+(originY+dy).toFixed(2);
    const band=Math.min(hairBands-1,
      Math.floor(fiber(66317,i,7)*hairBands));
    crownBands[band].push(d);
  }
  finishHair("crown","hair-crown-surface",186,crownBands);
  const eyebrowFiberGroups=[
    "M202 491Q218 477 232 479 M211 487Q231 472 248 471",
    "M234 476Q248 462 269 465 M249 470Q268 459 285 467",
    "M269 467Q288 460 305 468M286 469Q304 470 317 478",
    "M302 470Q315 471 324 478M310 473Q318 478 324 483",
    "M397 457Q414 445 425 447M410 454Q423 439 439 442",
    "M432 444Q450 433 461 441M447 442Q464 439 472 445",
  ] as const;
  for(let i=0;i<Math.round(eyebrowFiberGroups.length*detail);i++)
    mark("brow-fibers-"+i,eyebrowFiberGroups[i],
      "#4e3535",.55,[201,298],.56,"face-outline");
  mark("upper-lid-crease-near",
    "M200 537Q221 501 263 497Q305 493 329 526",
    "#815b61",.85,[207,296],.56,"face-outline");
  mark("upper-lid-crease-far",
    "M395 510Q410 482 438 480Q461 479 479 500",
    "#674e52",.68,[207,296],.62,"face-outline");
  mark("lash-contact-near",
    "M218 546Q214 539 215 535M227 535Q223 526 224 523"+
    "M235 532Q231 521 233 519M245 526Q242 516 245 513"+
    "M255 524Q255 513 258 509M269 522Q270 511 273 511"+
    "M281 524Q284 516 286 516M293 527Q300 519 302 520",
    "#362a31",.58,[219,299],.72,"face-outline");
  mark("lash-contact-far",
    "M411 514Q409 507 410 504M421 505Q419 498 421 493"+
    "M430 502Q430 493 433 490M442 499Q445 491 447 491"+
    "M453 501Q458 496 460 498",
    "#34262e",.53,[220,299],.71,"face-outline");
  mark("lower-lid-margin-near",
    "M217 559Q240 570 272 572Q305 566 319 549",
    "#996e70",.79,[214,299],.42,"face-outline");
  mark("lower-lid-margin-far",
    "M410 526Q433 541 459 533",
    "#906d6d",.58,[214,298],.46,"face-outline");
  mark("tear-canthus-near",
    "M321 540q6 2 7 8", "#8e6667",.8,[224,299],.68,"face-outline");
  mark("nose-alar-crease-near",
    "M382 638Q387 646 396 644M390 633Q391 625 401 626",
    "#7a504a",1.12,[225,298],.61,"face-outline");
  mark("nose-alar-crease-far",
    "M446 622Q450 613 455 613",
    "#86564c",.96,[231,298],.61,"face-outline");
  mark("nostril-contact-near",
    "M383 635Q390 625 399 629Q402 631 403 635",
    "#5a3433",2.3,[235,299],.78,"face-outline");
  mark("nostril-contact-far",
    "M447 623Q449 613 455 615Q457 619 455 623",
    "#69423d",1.4,[234,299],.66,"face-outline");
  mark("lip-commissure-left",
    "M351 744Q357 735 365 733",
    "#663841",1.18,[243,298],.78,"face-outline");
  mark("lip-commissure-right",
    "M475 710Q484 707 490 713",
    "#6e444d",.96,[245,298],.73,"face-outline");
  mark("lower-lip-reflected-contact",
    "M384 766Q425 780 461 750",
    "#e4b6aa",.94,[246,297],.48,"lip-lower");
  mark("chin-reflected-volume",
    "M353 834Q383 850 414 843",
    "#ddb3a7",.8,[246,298],.33,"face-outline");
  mark("jaw-underside-contour",
    "M157 784Q222 868 339 873Q398 876 446 835",
    "#805d5e",.76,[241,298],.35,"face-outline");

  if(view==="anatomy"){
    const links=[
      ["brow_near_peak","eye_near_inner"],
      ["eye_near_outer","eye_near_inner"],
      ["eye_near_inner","nose_root"],
      ["eye_far_inner","eye_far_outer"],
      ["eye_far_inner","nose_root"],
      ["nose_root","nose_tip"],
      ["nose_tip","nostril_near"],
      ["nostril_near","upper_lip"],
      ["upper_lip","lower_lip"],
      ["mouth_left","mouth_right"],
      ["lower_lip","chin"],
      ["face_top","brow_near_peak"],
      ["face_left","cheek_near"],
    ] as const;
    const anchors=CRAYON_F1_FACE_PROOF.sourceLandmarks;
    for(const [i,[a,b]] of links.entries()){
      const from=anchors[a],to=anchors[b];
      mark("source-face-link-"+i,"M"+from[0]+" "+from[1]+
        "L"+to[0]+" "+to[1],"#bd303e",1.18,[0,299],.74);
    }
    for(const [name,p] of Object.entries(anchors))
      mark("source-face-landmark-"+name.replace(/_/g,"-"),
        "M"+(p[0]-4)+" "+p[1]+"h8M"+p[0]+" "+(p[1]-4)+"v8",
        "#b82737",1.24,[0,299],.95);
  }
  return {version:1,id:"crayon-artcraft-cc0-portrait-"+view,
    width:608,height:1082,durationFrames:300,seed:441501,
    paper:C.paper,paperTooth:.79,elements,
    camera:[{frame:0,focusX:304,focusY:541,zoom:1},
      {frame:299,focusX:304,focusY:541,zoom:1}]};
}
