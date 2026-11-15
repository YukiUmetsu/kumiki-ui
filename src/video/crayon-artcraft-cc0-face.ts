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
export interface Cc0FaceOptions {detail?:number;view?:Cc0FaceView;fiberMaterial?:"line"|"dry-wax"}
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
  "nose-tip","nose-septal-transition","nose-tip-underlight",
  "nose-alar-near","nose-alar-far",
  "philtrum","lip-upper","lip-cupid-tubercles","lip-lower",
  "lip-lower-core-shadow","oral-opening",
  "chin-plane","jaw-underside","cheek-malar-cast",
  "cheek-malar-bounce","nose-sidewall-form","nose-subalar-contact",
  "nose-alar-undercut-near","nose-alar-undercut-far",
  "nose-tip-reflected-light","hair-left-curtain",
  "hair-right-curtain",
] as const;

export function crayonCc0FaceStudy(options:Cc0FaceOptions={}):CrayonSceneSpec{
  const detail=options.detail??1,view=options.view??"wax";
  const fiberMaterial=options.fiberMaterial??"dry-wax";
  if(!Number.isFinite(detail)||detail<.2||detail>1||
    !["wax","anatomy"].includes(view)||
    !["line","dry-wax"].includes(fiberMaterial))
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
    stage:[number,number]=[175,292],opacity=.62,parentId?:string,
    contact?:{waxContact:"dry-wax";waxPressure:number})=>{
    const item:Ink={kind:"contour",id,d,color,width,opacity,
      timing:{start:stage[0],end:stage[1]},
      ...(parentId?{parentId,clipToParent:true}:{}),
      ...(contact??{})};
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
  // Bridge wall curves into the lateral bulb rather than remaining a
  // narrow vertical cardboard stripe with a detached nose-tip dot.
  wax("nose-sidewall",
    "M349 547Q363 558 374 583Q385 609 398 628"+
    "Q394 642 384 638Q364 625 357 590"+
    "Q352 565 349 547Z",
    rect(342,541,63,103),
    ["#c19b8e","#997976","#e1b4a5"],[129,235],
    {parentId:"face-outline",clipToParent:true,coverage:"open",
      blendRadius:11,pressure:.45,spacing:8.6,markStrength:.18});
  wax("nose-tip",
    "M383 598Q400 586 420 599Q436 607 431 624"+
    "Q420 638 401 634Q384 632 380 620Z",
    rect(375,584,61,56),C.noseLight,[141,240],
    {parentId:"face-outline",clipToParent:true,coverage:"open",
      blendRadius:6.4,pressure:.51,spacing:5.2,markStrength:.25});
  // F1 source plane bridge: tip, columella, and alar wings remain a
  // single overlapping cartilaginous wedge rather than isolated dark dots.
  // The slanted oblique tip centers on source F1 nose_tip=(411,631).
  wax("nose-septal-transition",
    "M404 606C414 610 422 623 427 633"+
    "Q438 637 445 621Q445 639 432 649"+
    "Q418 656 408 645Q402 632 404 606Z",
    rect(398,600,54,59),
    ["#ba8f80","#8e6c68","#ddb19f"],[149,252],
    {parentId:"face-outline",clipToParent:true,coverage:"open",
      pressure:.41,spacing:7.1,markStrength:.23,blendRadius:8});
  // Asymmetric left wing flares OUT of the bridge and terminates as a
  // wedge under the soft tip; no isolated oval nostril sticker.
  wax("nose-alar-near",
    "M373 620Q388 611 404 619C415 626 419 637 420 641"+
    "Q406 653 390 647Q380 640 373 620Z",
    rect(368,607,58,50),
    ["#bf9386","#967471","#d9afa1"],[148,248],
    {parentId:"face-outline",clipToParent:true,coverage:"open",
      blendRadius:7.3,pressure:.43,spacing:7.2,markStrength:.22});
  // The partly foreshortened far wing is a flattened plane, not a
  // separate circular dot at its highest-pressure contact.
  wax("nose-alar-far",
    "M434 605Q445 597 456 607Q466 615 469 619"+
    "Q463 631 452 630Q441 624 434 605Z",
    rect(428,597,46,41),
    ["#bd9184","#977570","#d5aa9c"],[147,249],
    {parentId:"face-outline",clipToParent:true,coverage:"open",
      blendRadius:6.8,pressure:.41,spacing:7.9,markStrength:.19});
  // Source-observed alar cartilages require attached undercuts and
  // reflected light BEFORE a drawn nostril. The earlier render showed two
  // floating ink circles on featureless skin; these overlapping pressure
  // planes support a three-dimensional tip and asymmetric nasal wall.
  // A wider connected root → sidewall → columella plane replaces the
  // photographed-nose-incompatible isolated high-value vertical streak.
  wax("nose-sidewall-form",
    "M335 510Q347 527 357 553"+
    "C365 580 379 607 399 622Q411 629 412 639"+
    "Q399 650 384 637Q357 621 351 585"+
    "Q343 541 335 510Z",
    rect(328,503,92,148),
    ["#b9968c","#907272","#d8b1a3"],[136,246],
    {parentId:"face-outline",clipToParent:true,coverage:"open",
      blendRadius:9.3,pressure:.57,markStrength:.25,spacing:8.2});
  wax("nose-subalar-contact",
    "M372 629Q387 640 400 643Q416 644 429 634"+
    "Q436 628 444 627Q438 647 420 654"+
    "Q393 659 372 644Z",
    rect(367,622,81,43),
    ["#c09587","#9c7771","#ddafa0"],[157,259],
    {parentId:"face-outline",clipToParent:true,coverage:"open",
      blendRadius:9.1,pressure:.41,markStrength:.16,spacing:9});
  // Only a small attached value break is visible under the near ala.
  wax("nose-alar-undercut-near",
    "M390 641Q399 643 409 638Q407 648 399 649"+
    "Q392 647 390 641Z",
    rect(386,635,29,17),
    ["#b79084","#947570","#cda696"],[176,269],
    {parentId:"face-outline",clipToParent:true,coverage:"open",
      blendRadius:5.4,pressure:.4,markStrength:.14,spacing:8});
  wax("nose-alar-undercut-far",
    "M449 627Q457 619 461 617Q460 624 456 629"+
    "Q452 631 449 627Z",
    rect(446,614,20,20),
    ["#b99588","#93746f","#d1ab9b"],[173,268],
    {parentId:"face-outline",clipToParent:true,coverage:"open",
      blendRadius:5,pressure:.39,markStrength:.12,spacing:8.2});
  wax("nose-tip-reflected-light",
    "M382 611Q392 597 409 599Q426 602 431 612"+
    "Q422 622 406 622Q390 624 382 611Z",
    rect(376,590,62,42),
    ["#edc8ae","#b89283","#ffe0ba"],[174,271],
    {parentId:"face-outline",clipToParent:true,coverage:"open",
      blendRadius:7,pressure:.54,markStrength:.17,spacing:8.1});
  // Reflected pressure-built color ties the columella to the alar
  // undercut, while leaving a small air gap beneath each nostril.
  wax("nose-tip-underlight",
    "M390 627Q403 630 416 634Q430 638 442 625"+
    "Q437 646 421 652Q401 651 390 627Z",
    rect(385,622,64,36),
    ["#d7a995","#af8179","#efc3ab"],[195,277],
    {parentId:"face-outline",clipToParent:true,coverage:"open",
      blendRadius:7.8,pressure:.37,spacing:8,markStrength:.18});
  // Source F1 alar and nostril value breaks, attached BEFORE the hair
  // occluder: painted wax cartilage, never isolated pure vector ink loops.
  wax("nose-alar-crease-near",
    "M381 634Q393 639 405 632Q401 644 390 647"+
    "Q384 642 381 634Z",
    rect(378,628,32,22),
    ["#ab8980","#896d6b","#cda79d"],[224,297],
    {parentId:"face-outline",clipToParent:true,coverage:"open",
      pressure:.47,spacing:7.3,markStrength:.19,blendRadius:3.5});
  wax("nose-alar-crease-far",
    "M445 625Q452 614 460 613Q456 627 450 632Z",
    rect(443,611,21,23),
    ["#b18c83","#94726d","#d1a99b"],[230,297],
    {parentId:"face-outline",clipToParent:true,coverage:"open",
      pressure:.41,spacing:7.8,markStrength:.15,blendRadius:3.2});
  wax("nostril-contact-near",
    "M393 640Q401 644 410 639Q406 650 399 650"+
    "Q394 647 393 640Z",
    rect(390,637,24,16),
    ["#9b7770","#785d5b","#bd9589"],[235,299],
    {parentId:"face-outline",clipToParent:true,coverage:"open",
      pressure:.42,spacing:6.9,markStrength:.16,blendRadius:2.6});
  wax("nostril-contact-far",
    "M450 625Q455 620 460 619Q459 629 455 633Z",
    rect(448,618,16,18),
    ["#a4827a","#80605e","#c69c91"],[234,299],
    {parentId:"face-outline",clipToParent:true,coverage:"open",
      pressure:.38,spacing:7.4,markStrength:.12,blendRadius:2.5});
  // Mouth's natural perspective slopes upwards toward the occluded far
  // cheek. Separate vermilion volumes, dark oral slit and visible tooth
  // interruption are sourced from F1 x348..490/y681..775, not a U glyph.
  wax("philtrum",
    "M407 645Q415 655 424 661Q440 656 446 640"+
    "Q460 665 449 692Q436 697 424 690Q411 687 407 645Z",
    rect(400,636,65,70),C.skinCool,[135,222],
    {parentId:"face-outline",clipToParent:true,coverage:"open",
      pressure:.29,spacing:8.8,markStrength:.14,blendRadius:8});
  // Preserve asymmetric Cupid's bow and vermilion volume, but lay it as
  // open pressure-built pigment on facial wax, not an opaque pink capsule.
  wax("lip-upper",
    "M354 741Q369 726 385 715Q405 704 424 701"+
    "Q439 698 454 701Q470 697 483 706Q487 710 485 713"+
    "Q464 716 439 727Q412 739 383 743Q369 746 354 741Z",
    rect(349,690,141,59),
    ["#c49790","#97767a","#deb2a8"],[166,260],
    {parentId:"face-outline",clipToParent:true,coverage:"open",
      pressure:.53,spacing:8.2,markStrength:.27,blendRadius:5.4});
  // The source F1 expression is nearly closed, oblique and asymmetric.
  // Keep an actual narrow internal opening, not a broad smile/teeth slot.
  wax("lip-cupid-tubercles",
    "M386 723Q401 711 415 706Q425 700 434 704"+
    "Q445 699 456 700Q466 701 475 704"+
    "Q450 711 430 720Q408 729 386 723Z",
    rect(382,693,97,42),C.lipLight,[181,268],
    {parentId:"face-outline",clipToParent:true,coverage:"open",
      blendRadius:5.1,pressure:.39,spacing:7,markStrength:.22});
  wax("oral-opening",
    "M355 742C383 733 406 726 430 720"+
    "C452 714 474 710 484 713"+
    "C464 718 446 723 431 727"+
    "C407 734 383 741 355 742Z",
    rect(350,708,139,38),
    ["#9f7977","#775b5d","#bf9690"],[194,279],
    {parentId:"face-outline",clipToParent:true,coverage:"open",
      blendRadius:2.7,pressure:.47,spacing:7.9,markStrength:.24});
  // The actual CC0 face does not visibly show teeth. The prior 37×11
  // muted "enamel" still rendered as a conspicuous white paper stripe,
  // so remove the fabricated layer instead of endlessly shrinking it.
  wax("lip-lower",
    "M358 744Q386 749 416 741Q456 730 485 716"+
    "Q487 732 474 742Q446 762 415 763"+
    "Q385 765 368 754Z",
    rect(352,710,138,60),
    ["#d0a19a","#a47f82","#e8beb0"],[199,286],
    {parentId:"face-outline",clipToParent:true,coverage:"open",
      pressure:.51,spacing:8,markStrength:.25,blendRadius:5.0});
  // The inferior vermilion turns back into the chin as a wide *open*
  // value plane. This is not an opaque digital smile capsule.
  wax("lip-lower-core-shadow",
    "M364 746Q388 754 415 747Q457 737 482 716"+
    "Q481 737 461 748Q433 767 399 763"+
    "Q377 763 364 746Z",
    rect(359,713,130,57),
    ["#b48b88","#8b676a","#deb0a5"],[217,291],
    {parentId:"face-outline",clipToParent:true,coverage:"open",
      pressure:.42,spacing:7.8,markStrength:.23,blendRadius:6.2});
  // Oblique commissures are tiny pressure-built depressions embedded in
  // the vermilion, not two unrelated pure-ink cartoon brackets.
  wax("lip-commissure-left",
    "M351 741Q359 733 368 734Q361 743 355 746Z",
    rect(349,730,23,19),
    ["#a47a78","#7b6061","#c89e98"],[242,299],
    {parentId:"face-outline",clipToParent:true,coverage:"open",
      pressure:.4,spacing:7.2,markStrength:.18,blendRadius:2.8});
  wax("lip-commissure-right",
    "M475 710Q482 708 488 713Q484 717 478 716Z",
    rect(472,707,20,13),
    ["#ac8580","#886766","#caa198"],[243,299],
    {parentId:"face-outline",clipToParent:true,coverage:"open",
      pressure:.35,spacing:7.8,markStrength:.14,blendRadius:2.3});
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
  // Source F1 reads as deep brown-black hair with sparse warm wax pickup.
  // Broad, equally bright gold strips were rejected in native ArtCraft V2.
  const pigment=["#2c2427","#554039","#806050",
    "#806357","#674b40","#9c7e6d"] as const;
  const finishHair=(region:"left"|"right"|"crown",
    parentId:string,startFrame:number,bands:string[][])=>{
    for(let band=0;band<hairBands;band++){
      const path=bands[band].join(" ");
      if(!path)continue;
      mark("hair-rooted-"+region+"-"+band,path,
        pigment[band],.31+band*.155,
        [startFrame+(band%3)*4,299],.27+band*.057,parentId,
        region!=="crown"&&fiberMaterial==="dry-wax"?
          {waxContact:"dry-wax",waxPressure:.78}:undefined);
    }
  };
  // F1 source-space, manually traced CURTAIN flow rails. These are
  // research guides, not pixel-registered individual fibers. The left
  // curtain hugs the ear/cheek before dropping, while the right curtain
  // flows from the part across the far cheek into a widening lower lock.
  // A mark is a SHORT SUBCURVE of a guide, never a randomly oriented
  // screen-space scratch. The parent's wax silhouette still clips it.
  type HairGuide=readonly [number,number,number,number,number,number,number,number];
  const hairGuides:Record<"left"|"right",readonly HairGuide[]>={
    left:[
      [35,366,31,542,42,894,57,1084],
      [46,338,54,539,62,903,72,1089],
      [61,316,65,525,86,858,92,1089],
      [76,292,73,520,91,868,107,1090],
      [87,356,80,565,102,892,110,1088],
    ],
    right:[
      [452,315,469,493,474,837,481,1080],
      [466,340,495,527,493,884,497,1088],
      [476,361,506,561,513,898,519,1091],
      [485,399,523,625,543,919,544,1084],
      [495,420,542,632,555,948,562,1092],
      [507,467,552,671,573,917,584,1090],
    ],
  };
  const hairPoint=(g:HairGuide,t:number):[number,number]=>{
    const s=1-t;
    return [
      s*s*s*g[0]+3*s*s*t*g[2]+3*s*t*t*g[4]+t*t*t*g[6],
      s*s*s*g[1]+3*s*s*t*g[3]+3*s*t*t*g[5]+t*t*t*g[7],
    ];
  };
  const hairTangent=(g:HairGuide,t:number):[number,number]=>{
    const s=1-t;
    return [
      3*s*s*(g[2]-g[0])+6*s*t*(g[4]-g[2])+3*t*t*(g[6]-g[4]),
      3*s*s*(g[3]-g[1])+6*s*t*(g[5]-g[3])+3*t*t*(g[7]-g[5]),
    ];
  };
  // Exact cubic subsegments: tangent and deposited orientation vary
  // continuously with the authored lock, including at any animation seek.
  const hairSubcurve=(g:HairGuide,t0:number,t1:number,offset:number)=>{
    const p=hairPoint(g,t0),q=hairPoint(g,t1);
    const u=hairTangent(g,t0),v=hairTangent(g,t1);
    const uLen=Math.hypot(...u)||1,vLen=Math.hypot(...v)||1;
    const p0=[p[0]-u[1]/uLen*offset,p[1]+u[0]/uLen*offset];
    const p3=[q[0]-v[1]/vLen*offset,q[1]+v[0]/vLen*offset];
    const scale=(t1-t0)/3;
    const p1=[p0[0]+u[0]*scale,p0[1]+u[1]*scale];
    const p2=[p3[0]-v[0]*scale,p3[1]-v[1]*scale];
    const fmt=(point:number[])=>point.map(n=>n.toFixed(2)).join(" ");
    return "M"+fmt(p0)+" C"+fmt(p1)+" "+fmt(p2)+" "+fmt(p3);
  };
  for(const [side,count,seed] of [
    ["left",85,33107],["right",130,44631],
  ] as const){
    const parentId=side==="left"?"hair-left-curtain":"hair-right-curtain";
    const guides=hairGuides[side];
    const bands=Array.from({length:hairBands},()=>[] as string[]);
    for(let i=0;i<Math.round(count*detail);i++){
      const guide=guides[Math.min(guides.length-1,
        Math.floor(fiber(seed,i,1)*guides.length))];
      const t0=.07+fiber(seed,i,2)*.75;
      const t1=Math.min(.99,t0+.07+fiber(seed,i,3)*.16);
      const offset=(fiber(seed,i,4)-.5)*8;
      const d=hairSubcurve(guide,t0,t1,offset);
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
  // Alar relief and labial commissures are deposited in their anatomical
  // paint order above; no late pure-ink outlines can float over hair.
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
