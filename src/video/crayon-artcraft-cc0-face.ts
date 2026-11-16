import type {CrayonColor,CrayonElement,CrayonSceneSpec}
  from "../../registry/video/materials/crayon-scene";
import {CRAYON_PORTRAIT_AUDIT}
  from "./crayon-artcraft-portrait-audit";
import {crayonHash} from "../../registry/video/materials/crayon";
import {crayonF1ReconstructEyes,crayonF1SourceValueEyes}
  from "./crayon-artcraft-f1-ocular-geometry";
import {crayonF1SculptTarsal}
  from "./crayon-artcraft-f1-tarsal-sculpt";
import {crayonF1ReconstructMidface} from "./crayon-artcraft-f1-midface-geometry";
import {crayonF1ConnectAlarUndercuts} from "./crayon-artcraft-f1-alar-continuity";
import {crayonF1ReconstructOralContact} from "./crayon-artcraft-f1-oral-fidelity";
import {crayonF1SculptOralOcclusion} from "./crayon-artcraft-f1-oral-sculpt";
import {crayonF1SculptNasalCartilage} from "./crayon-artcraft-f1-nose-sculpt";
import {crayonF1BuildNasalWaxDepth} from "./crayon-artcraft-f1-nasal-depth";
import {crayonF1JoinNarisContours} from "./crayon-artcraft-f1-naris-contour";
import {crayonF1ConstructNasalVolume} from "./crayon-artcraft-f1-nasal-volume";
import {crayonF1ReconstructNasalValue} from "./crayon-artcraft-f1-photometric-nose";
import {crayonF1ReconstructBrows} from "./crayon-artcraft-f1-brow-geometry";
import {crayonF1ReconstructJawNeck} from "./crayon-artcraft-f1-jaw-neck-geometry";
import {crayonF1AddRootedLashes,type CrayonF1LashFinish}
  from "./crayon-artcraft-f1-lash-clusters";

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
/** Source-registered ocular pigment experiment; baseline is an unchanged negative control. */
export type Cc0EyeContact="baseline"|"source-shade"|"source-value"|"source-sculpt";
export type Cc0BrowForm="baseline"|"source-rooted";
export type Cc0MidfaceForm="baseline"|"source-volume"|"source-alar"|"source-oral"|"source-oral-sculpt"|"source-nose-sculpt"|"source-nasal-depth"|"source-contour-joined"|"source-nasal-volume"|"source-nasal-value";
export type Cc0JawNeckForm="baseline"|"source-contour";
export interface Cc0FaceOptions {detail?:number;view?:Cc0FaceView;fiberMaterial?:"line"|"dry-wax";eyeContact?:Cc0EyeContact;midfaceForm?:Cc0MidfaceForm;browForm?:Cc0BrowForm;jawNeckForm?:Cc0JawNeckForm;lashFinish?:CrayonF1LashFinish}
type Wax=Extract<CrayonElement,{kind:"wax"}>;
type Ink=Extract<CrayonElement,{kind:"contour"}>;
const rect=(x:number,y:number,width:number,height:number)=>
  ({x,y,width,height});
const C={
  paper:"#f4e6d3" as CrayonColor,
  hair:["#4c382f","#21191d","#886753"] as const,
  hairLight:["#815c4a","#45302f","#b49273"] as const,
  hairShadow:["#3a2a29","#20191f","#6d4c43"] as const,
  skin:["#bb8d7c","#785e5c","#d9ad99"] as const,
  skinLight:["#d9b4a8","#a88682","#edcbb7"] as const,
  skinCool:["#af8c8a","#755e66","#d4b0a6"] as const,
  cheek:["#cb967f","#916969","#e6b9a2"] as const,
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
  neck:["#77574d","#32292c","#a78372"] as const,
} satisfies Record<string,CrayonColor|readonly [CrayonColor,CrayonColor,CrayonColor]>;

export const CRAYON_F1_FACE_PARTS=[
  "hair-back","hair-crown-surface","neck-attached","ear-underplane",
  "ear-helix-value","ear-concha-shadow","ear-antihelix-reflection",
  "ear-lobe-warmth","ear-stud-setting","ear-stud-glint","face-outline",
  "forehead-light","brow-superciliary-near","brow-superciliary-far",
  "socket-near","socket-far","eye-orbital-undercut-near",
  "eye-orbital-undercut-far","sclera-near","sclera-far",
  "iris-near","iris-far","pupil-near","pupil-far",
  "upper-lid-near","upper-lid-far",
  "sclera-outer-contact-near","sclera-inner-contact-near",
  "sclera-outer-contact-far",
  "lash-root-near","lash-root-far","lower-lid-near","lower-lid-far",
  "malar-cheek-near","cheek-far","nose-root","nose-dorsum",
  "nose-tip","nose-septal-transition","nose-tip-underlight",
  "nose-alar-near","nose-alar-far",
  "philtrum","lip-upper","lip-cupid-tubercles","lip-lower",
  "lip-lower-core-shadow","oral-opening",
  "chin-plane","jaw-underside","cheek-malar-cast",
  "cheek-malar-bounce","nose-sidewall-form","nose-subalar-contact",
  "nose-alar-undercut-near","nose-alar-undercut-far",
  "nose-tip-reflected-light","nasal-alar-attachment-near",
   "nasal-alar-attachment-far","naris-shadow-near","naris-shadow-far",
   "mouth-aperture-depth","labial-upper-value","labial-lower-value",
   "dental-surface-left","dental-surface-center",
   "dental-surface-far","hair-left-curtain",
  "hair-right-curtain",
] as const;

/** Shared, bounds-checked cameras for native 608×1082 F1 ocular evidence.
 * CRAYON1 allows zoom <= 3; keep Storybook and browser proof in lockstep.
 */
export const CRAYON_F1_EYE_INSPECTION={
  near:{focusX:269,focusY:546,zoom:2.95},
  far:{focusX:437,focusY:516,zoom:3},
} as const;

export function crayonCc0FaceStudy(options:Cc0FaceOptions={}):CrayonSceneSpec{
  const detail=options.detail??1,view=options.view??"wax";
  const fiberMaterial=options.fiberMaterial??"dry-wax";
  const eyeContact=options.eyeContact??"source-shade";
  // Source-aligned mouth/nasal experiment failed native visual review.
  // Preserve the previous baseline by default until strict ArtCraft passes.
  const midfaceForm=options.midfaceForm??"baseline";
  const jawNeckForm=options.jawNeckForm??"baseline";
  const browForm=options.browForm??"baseline";
  const lashFinish=options.lashFinish??"sparse";
  if(!Number.isFinite(detail)||detail<.2||detail>1||
    !["wax","anatomy"].includes(view)||
    !["line","dry-wax"].includes(fiberMaterial)||
    !["baseline","source-shade","source-value","source-sculpt"].includes(eyeContact)||
    !["baseline","source-volume","source-alar","source-oral","source-oral-sculpt","source-nose-sculpt","source-nasal-depth","source-contour-joined","source-nasal-volume","source-nasal-value"].includes(midfaceForm)||
    !["baseline","source-contour"].includes(jawNeckForm)||
    !["baseline","source-rooted"].includes(browForm)||
    !["sparse","rooted","rooted-flow"].includes(lashFinish))
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
      underpaintGradient:{light:"#785b4b",shadow:"#201a1d",
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
      underpaintGradient:{light:"#86644f",shadow:"#251b20",
        focusX:.57,focusY:.23,radius:1.03}});
  // The actual face taper remains visible from near left cheek across an
  // oblique jaw to the chin at (398,858); the far edge is hair-occluded.
  wax("neck-attached",
    "M149 807Q179 852 255 865Q334 891 418 841"+
    "Q431 915 447 976Q469 1045 480 1091"+
    "L122 1091Q135 1005 139 930Q150 872 149 807Z",
    rect(116,798,374,298),C.neck,[17,115],
    {pressure:.91,spacing:8.1,markStrength:.17,
      underpaintTooth:.2,underpaintGradient:{light:"#765c52",shadow:"#32292b",
        focusX:.43,focusY:.12,radius:1.18}});
  // F1 under-jaw occlusion is the projected mandibular cast on a
  // continuous neck mass, not a drawn floating jaw line.
  wax("neck-submandibular-cast",
    "M149 804Q213 837 292 856Q373 869 421 832"+
    "Q438 878 436 916Q398 944 347 941"+
    "Q255 944 178 917Q143 877 149 804Z",
    rect(138,794,309,161),
    ["#685251","#3a3032","#a08179"],[81,180],
    {parentId:"neck-attached",clipToParent:true,coverage:"open",
      featherContacts:true,pressure:.64,spacing:9.6,
      blendRadius:15,markStrength:.13});
  wax("neck-cervical-turn",
    "M151 851Q170 916 184 980Q194 1052 202 1082"+
    "Q248 1087 265 1082Q227 963 203 920Z",
    rect(144,838,128,248),
    ["#654944","#35292c","#9b7569"],[112,203],
    {parentId:"neck-attached",clipToParent:true,coverage:"open",
      featherContacts:true,pressure:.52,spacing:12.5,
      blendRadius:18,markStrength:.13});
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
    {underpaintGradient:{light:"#b99a93",shadow:"#6e5050",
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
    "M185 520C201 487 235 473 268 474"+
    "C294 469 319 492 327 513Q332 550 305 572"+
    "C277 591 239 587 215 571Q190 560 185 520Z",
    rect(177,466,159,127),["#986d75","#55434f","#b78c91"],[89,197],
    {parentId:"face-outline",clipToParent:true,coverage:"open",
      pressure:.54,spacing:7.1,markStrength:.27,blendRadius:13,featherContacts:true});
  wax("socket-far",
    "M390 474Q406 447 435 443Q457 441 471 460"+
    "Q483 484 480 523Q469 549 434 544Q398 539 390 507Z",
    rect(384,435,104,118),["#936f79","#594851","#b58b91"],[94,199],
    {parentId:"face-outline",clipToParent:true,coverage:"open",
      pressure:.55,spacing:7,markStrength:.24,blendRadius:11,featherContacts:true});
  wax("brow-superciliary-near",
    "M201 496C223 477 250 463 278 462"+
    "C300 458 315 470 324 478Q303 470 281 474"+
    "C252 474 224 492 201 496Z",
    rect(196,453,133,50),["#795753","#493a3e","#aa8576"],[118,224],
    {parentId:"face-outline",clipToParent:true,coverage:"open",
      pressure:.52,spacing:7.1,markStrength:.29,blendRadius:7.5,featherContacts:true});
  wax("brow-superciliary-far",
    "M393 465Q412 445 444 437Q461 435 473 440"+
    "Q458 443 441 451Q418 460 393 465Z",
    rect(388,433,91,38),["#765751","#493b3c","#a8837c"],[120,223],
    {parentId:"face-outline",clipToParent:true,coverage:"open",
      pressure:.49,spacing:7.2,markStrength:.27,blendRadius:6.5,featherContacts:true});
  // F1 upper orbital fat/eyelash attachment is an irregular asymmetric
  // skin plane, not a hard oval or freehand floating eyebrow.
  wax("eye-orbital-undercut-near",
    "M208 547C219 524 245 506 267 505"+
    "Q290 503 315 529Q305 526 291 521"+
    "Q265 513 244 529Q222 543 208 547Z",
    rect(202,499,117,53),
    ["#906b74","#5c4b57","#ba9293"],[127,225],
    {parentId:"face-outline",clipToParent:true,coverage:"open",
      pressure:.5,spacing:7.2,markStrength:.25,blendRadius:9,featherContacts:true});
  wax("eye-orbital-undercut-far",
    "M403 522Q410 502 430 491Q451 481 470 504"+
    "Q452 492 438 502Q414 510 403 522Z",
    rect(398,480,77,47),
    ["#8c6972","#554750","#ad858a"],[133,230],
    {parentId:"face-outline",clipToParent:true,coverage:"open",
      pressure:.51,spacing:7.2,markStrength:.24,blendRadius:8.3,featherContacts:true});
  // F1 photographed three-quarter eye topology, 608×1082 crop.
  // Near canthi x218..322; upper iris is occluded by lash margin.
  // Far eye x405..474 is narrower and hair-occluded, not mirrored.
  // Warm orbit and deeper supraorbital crease precede the sclera.
  wax("eye-orbital-fold-near",
    "M208 538C228 515 248 509 273 510"+
    "C299 510 317 519 332 537Q306 525 280 522"+
    "C247 518 229 533 208 538Z",
    rect(203,505,133,41),["#ad8b8b","#806971","#d0a4a0"],[115,208],
    {parentId:"face-outline",clipToParent:true,coverage:"open",
      pressure:.52,spacing:7.2,markStrength:.21,blendRadius:8.4});
  wax("eye-orbital-fold-far",
    "M400 521Q408 496 435 486Q458 480 477 496"+
    "Q451 493 434 499Q412 505 400 521Z",
    rect(395,477,85,48),["#a17c80","#725f66","#c69b99"],[122,212],
    {parentId:"face-outline",clipToParent:true,coverage:"open",
      pressure:.5,spacing:7.5,markStrength:.18,blendRadius:7.2});
  // Opaque but NOT white cartoon balls: photo shows sclera mostly
  // near the nasal canthus, shaded by the upper lid and outer socket.
  wax("sclera-near",
    "M215 560C229 540 249 531 267 531C291 529 313 531 322 543"+
    "C305 553 287 563 273 565C249 570 230 568 215 560Z",
    rect(212,527,115,52),["#aa9f9c","#635e63","#d7cebf"],[131,236],
    {parentId:"face-outline",clipToParent:true,
      pressure:.74,spacing:5.7,markStrength:.18,underpaintTooth:.2,
      underpaintGradient:{light:"#d3ccc1",shadow:"#706269",
        focusX:.79,focusY:.53,radius:.95}});
  wax("sclera-far",
    "M404 527C414 509 435 500 448 501C462 498 468 504 474 511"+
    "Q465 527 442 529Q416 533 404 527Z",
    rect(399,495,80,46),["#948889","#554f54","#b2aba5"],[135,234],
    {parentId:"face-outline",clipToParent:true,
      pressure:.73,spacing:5,markStrength:.17,underpaintTooth:.22,
      underpaintGradient:{light:"#aea5a1",shadow:"#4b464b",
        focusX:.3,focusY:.77,radius:.86}});
  // F1 eye photograph / anatomical study: the wet limbus and two
  // source-side tear junctions live INSIDE the opaque scleral body.
  // These asymmetric pressure-bound deposits break up the oversized
  // chalk-bright white wedges without shrinking or replacing the iris.
  // Preserve the previous scene exactly as a blinded A/B negative control.
  if(eyeContact!=="baseline"){
    wax("sclera-outer-contact-near",
      "M216 558C225 546 236 539 247 537"+
      "C239 543 234 552 239 560Q228 566 216 561Z",
      rect(212,534,39,34),
      ["#988782","#60565c","#b7a59b"],[143,237],
      {parentId:"sclera-near",clipToParent:true,coverage:"open",
        featherContacts:true,blendRadius:3.8,
        pressure:.44,spacing:5.8,markStrength:.17,
        outlineOpacity:0,edgeRoughness:0});
    wax("sclera-inner-contact-near",
      "M282 541C295 537 312 538 321 544"+
      "Q310 547 299 557Q291 563 283 560Z",
      rect(279,535,45,31),
      ["#958885","#665d64","#bea9a1"],[145,239],
      {parentId:"sclera-near",clipToParent:true,coverage:"open",
        featherContacts:true,blendRadius:3.5,
        pressure:.39,spacing:6.2,markStrength:.14,
        outlineOpacity:0,edgeRoughness:0});
    wax("sclera-outer-contact-far",
      "M405 527Q413 512 426 507Q421 517 426 529"+
      "Q413 534 405 527Z",
      rect(402,503,30,32),
      ["#81767a","#514b51","#aa9895"],[145,237],
      {parentId:"sclera-far",clipToParent:true,coverage:"open",
        featherContacts:true,blendRadius:2.8,
        pressure:.41,spacing:5.9,markStrength:.15,
        outlineOpacity:0,edgeRoughness:0});
  }
  // Near brown iris x245..281, source is 33–37px across, not 53.
  // Both are optically compressed and later partly OVERPAINTED by lid.
  wax("iris-near",
    "M245 540C250 533 266 531 276 540C282 547 279 560 269 565"+
    "C254 568 245 558 245 540Z",
    rect(242,530,42,39),["#352b2d","#1b181d","#544038"],[148,247],
    {parentId:"sclera-near",clipToParent:true,
      pressure:.92,spacing:4.1,markStrength:.35,underpaintTooth:.12,opaqueBurnish:0.88,
      underpaintGradient:{light:"#58423d",shadow:"#1d1b20",
        focusX:.54,focusY:.69,radius:.82}});
  wax("pupil-near",
    "M254 541C257 537 265 538 269 544Q270 554 265 557"+
    "Q256 559 253 550Z",
    rect(251,537,21,23),["#242027","#17151a","#352b2d"],[156,250],
    {parentId:"iris-near",clipToParent:true,pressure:.96,
      spacing:4,markStrength:.32,underpaintTooth:.08,opaqueBurnish:1});
  wax("iris-far",
    "M425 512Q432 503 442 504Q459 502 460 515Q460 528 447 532"+
    "Q429 535 425 521Z",
    rect(422,499,38,35),["#30282b","#1a181d","#514038"],[146,245],
    {parentId:"sclera-far",clipToParent:true,
      pressure:.93,spacing:4.3,markStrength:.31,underpaintTooth:.12,opaqueBurnish:0.94,
      underpaintGradient:{light:"#53423a",shadow:"#1c191e",
        focusX:.5,focusY:.65,radius:.81}});
  wax("pupil-far",
    "M433 510Q438 506 445 511Q450 518 446 526Q439 528 434 524Z",
    rect(431,507,18,23),["#211d22","#141319","#32282a"],[155,253],
    {parentId:"iris-far",clipToParent:true,pressure:.93,
      spacing:4.2,markStrength:.28,underpaintTooth:.08,opaqueBurnish:1});
  // Upper skin fold must overlap iris upper third. No long, uniform
  // arch that encloses a round eye like a cartoon symbol.
  wax("upper-lid-near",
    "M209 561C220 533 245 517 269 517C293 513 313 526 327 541"+
    "C307 533 289 530 273 531C252 533 230 544 214 565Z",
    rect(206,510,126,58),["#bb9994","#896d74","#d9b3a9"],[170,264],
    {parentId:"face-outline",clipToParent:true,coverage:"open",
      pressure:.64,spacing:6.2,markStrength:.32,blendRadius:5.2});
  wax("upper-lid-far",
    "M399 529Q409 499 435 490Q462 483 479 506"+
    "Q457 498 439 503Q414 510 403 532Z",
    rect(396,481,87,55),["#b18e8e","#7e646c","#ccaba5"],[176,263],
    {parentId:"face-outline",clipToParent:true,coverage:"open",
      pressure:.59,spacing:6.1,markStrength:.29,blendRadius:4.6});
  // A dark, thin, uneven lip of opaque CRAYON pigment is attached to
  // the lash rim. It is a real wax mass, never a uniform vector stroke.
  wax("lash-root-near",
    "M217 557C229 538 244 532 264 532C286 529 305 535 322 544"+
    "Q300 540 277 538Q254 538 242 542Q228 546 221 561Z",
    rect(214,526,110,38),["#45353a","#29252c","#75605b"],[194,281],
    {parentId:"face-outline",clipToParent:true,pressure:.85,
      spacing:5.1,markStrength:.29,underpaintTooth:.18});
  wax("lash-root-far",
    "M404 526Q416 501 441 497Q462 496 475 510"+
    "Q455 503 440 506Q417 509 407 531Z",
    rect(401,493,79,42),["#413035","#292126","#665257"],[194,278],
    {parentId:"face-outline",clipToParent:true,pressure:.82,
      spacing:4.7,markStrength:.27,underpaintTooth:.17});
  // Connected tapered lash wedges; varying lean/length, no isolated
  // vertical whiskers emerging from the iris.
  // ArtCraft native dry-wax side nib, not flat opaque triangle
  // eyelashes. Every short source-space cubic begins at the dark upper
  // rim; worn wax skips paper valleys and picks up at its terminal.
  // The near source cluster is concentrated x230..288, varied lean.
  mark("lash-contact-near",
    "M228 548 C225 544 222 541 221 539 "+
    "M236 541 C232 538 230 535 228 533 "+
    "M242 538 C240 536 237 532 236 530 "+
    "M248 536 C245 534 243 531 241 529 "+
    "M256 535 C254 533 253 529 252 528 "+
    "M265 534 C264 532 263 529 263 527 "+
    "M273 535 C272 532 271 529 271 528 "+
    "M281 535 C282 532 282 530 283 529 "+
    "M289 537 C291 534 292 532 293 531 "+
    "M298 540 C301 538 303 536 305 535",
    "#45363a",.24,[219,299],.7,"face-outline",
    {waxContact:"dry-wax",waxPressure:.56});
  mark("lash-contact-far",
    "M418 517 C415 514 413 511 411 509 "+
    "M426 511 C423 508 422 505 422 503 "+
    "M433 507 C432 504 431 501 431 500 "+
    "M441 505 C442 502 442 500 443 499 "+
    "M451 505 C453 503 454 501 455 500",
    "#3b3035",.24,[220,299],.67,"face-outline",
    {waxContact:"dry-wax",waxPressure:.53});
  // Lower tarsal lip and infraorbital shadow: separate adjacent
  // 3D planes, not another complete thin oval under the eye.
  wax("lower-lid-near",
    "M212 561C235 573 251 572 275 567Q306 562 322 542"+
    "C315 561 299 579 274 582Q237 591 213 574Z",
    rect(207,538,120,57),["#a87577","#684f56","#d09a92"],[184,276],
    {parentId:"face-outline",clipToParent:true,coverage:"open",
      pressure:.51,spacing:7.5,markStrength:.27,blendRadius:7.8,featherContacts:true});
  wax("lower-lid-far",
    "M404 526Q421 539 442 533Q467 529 474 511"+
    "Q471 544 449 550Q422 550 406 536Z",
    rect(399,507,80,49),["#a97c7e","#775e65","#cfa5a2"],[186,274],
    {parentId:"face-outline",clipToParent:true,coverage:"open",
      pressure:.46,spacing:7.2,markStrength:.22,blendRadius:6.1,featherContacts:true});
  // All orbit details follow the eye UNDER the later hair curtain.
  wax("upper-lid-crease-near",
    "M206 547C221 521 240 517 260 517C286 511 310 522 326 540"+
    "Q309 524 282 522Q237 521 206 547Z",
    rect(202,507,130,43),["#a27e83","#765d65","#c59c98"],[207,296],
    {parentId:"face-outline",clipToParent:true,coverage:"open",
      pressure:.46,spacing:7.8,markStrength:.2,blendRadius:4.1});
  wax("upper-lid-crease-far",
    "M398 517Q411 493 435 488Q462 481 476 503"+
    "Q461 493 439 495Q418 499 398 517Z",
    rect(394,482,86,41),["#967378","#68575f","#bd9393"],[207,296],
    {parentId:"face-outline",clipToParent:true,coverage:"open",
      pressure:.43,spacing:7.4,markStrength:.19,blendRadius:4.1});
  wax("lower-lid-margin-near",
    "M217 569Q242 583 272 576Q304 569 317 550"+
    "Q309 572 277 586Q243 591 217 569Z",
    rect(212,546,110,48),
    ["#a67777","#74575b","#cfa19a"],[214,299],
    {parentId:"face-outline",clipToParent:true,coverage:"open",
      pressure:.43,spacing:7.9,markStrength:.2,blendRadius:6.2,featherContacts:true});
  wax("lower-lid-margin-far",
    "M408 532Q430 548 450 539Q464 535 471 518"+
    "Q469 549 449 553Q426 556 408 532Z",
    rect(403,513,72,45),["#a47b7b","#775b62","#c69f99"],[214,298],
    {parentId:"face-outline",clipToParent:true,coverage:"open",
      pressure:.39,spacing:8,markStrength:.16,blendRadius:4.6,featherContacts:true});
  wax("tear-canthus-near",
    "M307 543Q317 535 321 542Q322 551 312 554Z",
    rect(303,535,23,23),["#c99e9a","#937478","#e2b4ac"],[224,299],
    {parentId:"face-outline",clipToParent:true,coverage:"open",
      pressure:.4,spacing:7.3,markStrength:.16,blendRadius:3.1});
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
    ["#ab7f77","#6f5353","#ce9e91"],[136,246],
    {parentId:"face-outline",clipToParent:true,coverage:"open",
      featherContacts:true,
      blendRadius:12.2,pressure:.59,markStrength:.24,spacing:8.2});
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
  // F1 6× photo: near nostril is a deep concave oblique shadow,
  // the far opening is a slender foreshortened wedge. Split a *soft
  // attached alar cast* from the small deepest recess; never two dots.
  wax("nasal-alar-attachment-near",
    "M377 623Q391 609 408 614Q425 620 427 631"+
    "Q415 650 402 655Q386 650 377 623Z",
    rect(371,606,61,56),
    ["#a06c66","#69474a","#cf9388"],[197,274],
    {parentId:"face-outline",clipToParent:true,coverage:"open",
      featherContacts:true,pressure:.67,spacing:5.6,
      blendRadius:8.6,markStrength:.3});
  wax("nasal-alar-attachment-far",
    "M440 611Q447 597 459 603Q470 613 465 632"+
    "Q456 649 447 644Q439 626 440 611Z",
    rect(434,594,41,58),
    ["#a47572","#704e4e","#ce998f"],[193,275],
    {parentId:"face-outline",clipToParent:true,coverage:"open",
      featherContacts:true,pressure:.6,spacing:5.7,
      blendRadius:7.2,markStrength:.24});
  // Irregular, nested darkest nasal air masses (not the full ale).
  wax("naris-shadow-near",
    "M394 635Q399 624 407 624Q415 621 418 627"+
    "Q420 633 413 638Q407 640 403 647"+
    "Q396 645 394 635Z",
    rect(390,620,32,32),["#443031","#21171c","#77504c"],[236,299],
    {parentId:"face-outline",clipToParent:true,
      pressure:.91,spacing:4.2,markStrength:.32,
      edgeRoughness:0,outlineOpacity:0,underpaintTooth:.10,opaqueBurnish:0.92,
      underpaintGradient:{light:"#674642",shadow:"#1d161b",
        focusX:.7,focusY:.25,radius:.85}});
  wax("naris-shadow-far",
    "M449 634Q446 625 452 620Q457 617 459 622"+
    "Q461 629 455 637Q449 645 449 634Z",
    rect(445,614,18,34),["#513435","#291d23","#80605a"],[236,299],
    {parentId:"face-outline",clipToParent:true,
      pressure:.89,spacing:4.4,markStrength:.22,
      edgeRoughness:0,outlineOpacity:0,underpaintTooth:.12,opaqueBurnish:0.83,
      underpaintGradient:{light:"#79524c",shadow:"#24181c",
        focusX:.38,focusY:.28,radius:.83}});
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
    ["#b17676","#734650","#d39d96"],[166,260],
    {parentId:"face-outline",clipToParent:true,coverage:"open",
      featherContacts:true,
      pressure:.64,spacing:7.3,markStrength:.25,blendRadius:7.4});
  // The source F1 expression is nearly closed, oblique and asymmetric.
  // Keep an actual narrow internal opening, not a broad smile/teeth slot.
  wax("lip-cupid-tubercles",
    "M386 723Q401 711 415 706Q425 700 434 704"+
    "Q445 699 456 700Q466 701 475 704"+
    "Q450 711 430 720Q408 729 386 723Z",
    rect(382,693,97,42),C.lipLight,[181,268],
    {parentId:"face-outline",clipToParent:true,coverage:"open",
      blendRadius:5.1,pressure:.39,spacing:7,markStrength:.22});
  // High-value anatomical source discrepancy: the photo upper lip
  // is a much darker, three-dimensional red-violet structure than the
  // old pale single open glaze. A second *directional wax application*
  // deepens its sampled color without substituting an ink cartoon rim.
  wax("labial-upper-value",
    "M356 738Q376 716 403 704Q422 693 442 696"+
    "Q463 692 482 701Q488 705 483 714"+
    "Q451 714 424 723Q389 737 356 738Z",
    rect(349,687,144,59),
    ["#95585f","#56343d","#b9797b"],[178,268],
    {parentId:"face-outline",clipToParent:true,coverage:"open",
      featherContacts:true,pressure:.72,spacing:6.8,
      blendRadius:7.7,markStrength:.27});
  // Source F1 lips are parted: the cropped photograph plainly
  // shows three shadowed upper incisors, unlike the earlier assumption.
  // The aperture is a perspective wedge anchored at near x355/y743.
  wax("oral-opening",
    "M355 742C382 734 404 726 430 720"+
    "C455 712 477 708 484 713"+
    "C488 719 484 724 476 724"+
    "Q452 729 433 730C403 738 380 744 355 746Z",
    rect(348,706,143,43),
    ["#805156","#4e3139","#a16a6e"],[194,279],
    {parentId:"face-outline",clipToParent:true,coverage:"open",
      featherContacts:true,
      blendRadius:3.4,pressure:.64,spacing:6.5,markStrength:.33});
  // Deep oral interior under a separately visible source tooth surface:
  // opaque wax is not a WHITE slab; depth color is near-black claret.
  wax("mouth-aperture-depth",
    "M355 744Q383 733 409 725Q445 713 481 714"+
    "Q484 718 483 724Q457 730 434 731"+
    "Q390 741 356 746Z",
    rect(349,709,139,42),
    ["#5b363e","#281e27","#89535a"],[206,286],
    {parentId:"oral-opening",clipToParent:true,
      pressure:.89,spacing:4,markStrength:.24,underpaintTooth:.12,opaqueBurnish:0.87,
      edgeRoughness:0,outlineOpacity:0,
      underpaintGradient:{light:"#70474c",shadow:"#281d25",
        focusX:.57,focusY:.34,radius:.9}});
  // In 5x reference crop, dental shapes x390..460/y711..739 are
  // tiny, low-value uneven upper incisors; no artificial bright bar.
  wax("dental-surface-left",
    "M398 729Q404 723 410 723Q413 726 413 730"+
    "Q408 734 400 735Z",
    rect(395,719,22,19),["#6f6967","#4d4648","#948983"],[224,294],
    {parentId:"mouth-aperture-depth",clipToParent:true,
      pressure:.91,spacing:4.3,markStrength:.12,underpaintTooth:.08,
      edgeRoughness:0,outlineOpacity:0});
  wax("dental-surface-center",
    "M415 723Q425 715 435 716Q435 722 432 728"+
    "Q424 730 415 728Z",
    rect(412,713,27,20),["#736c6c","#484247","#9c8f8a"],[228,295],
    {parentId:"mouth-aperture-depth",clipToParent:true,
      pressure:.94,spacing:4.1,markStrength:.13,underpaintTooth:.08,
      edgeRoughness:0,outlineOpacity:0});
  wax("dental-surface-far",
    "M437 717Q448 714 456 715Q458 716 457 719"+
    "Q446 723 437 720Z",
    rect(433,711,28,15),["#7c7270","#514a4f","#a29891"],[232,296],
    {parentId:"mouth-aperture-depth",clipToParent:true,
      pressure:.89,spacing:4.0,markStrength:.1,underpaintTooth:.08,
      edgeRoughness:0,outlineOpacity:0});
  wax("lip-lower",
    "M358 744Q386 749 416 741Q456 730 485 716"+
    "Q487 732 474 742Q446 762 415 763"+
    "Q385 765 368 754Z",
    rect(352,710,138,60),
    ["#cd9596","#956b73","#e9b5ad"],[199,286],
    {parentId:"face-outline",clipToParent:true,coverage:"open",
      featherContacts:true,
      pressure:.61,spacing:8,markStrength:.23,blendRadius:6.2});
  wax("labial-lower-value",
    "M356 743Q383 750 407 745Q450 733 484 716"+
    "Q487 738 472 750Q444 773 409 770"+
    "Q377 769 356 743Z",
    rect(350,709,140,70),
    ["#bd8286","#8a555f","#e4a5a6"],[209,289],
    {parentId:"face-outline",clipToParent:true,coverage:"open",
      featherContacts:true,pressure:.63,spacing:7.2,
      blendRadius:8.2,markStrength:.26});
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
  // Directional, rough wax sheen follows the curved lower vermilion.
  mark("lip-lower-wax-ribs",
    "M376 752 C376 754 375 755 374 757"+
    " M385 754 C385 756 386 757 386 760"+
    " M395 751 C395 754 397 755 397 758"+
    " M408 747 C408 750 408 753 408 756"+
    " M421 743 C421 746 423 749 423 752"+
    " M436 740 C437 743 436 746 436 747"+
    " M448 734 C449 736 448 738 449 740",
    "#e2b6b1",.3,[239,298],.37,"lip-lower",
    {waxContact:"dry-wax",waxPressure:.44});
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
      underpaintGradient:{light:"#5d413b",shadow:"#171419",
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
  // F1 photo: individual brow fibers root into their asymmetric
  // brown wax masses, not evenly-spaced digital Bezier arches.
  const eyebrowFiberGroups=[
    "M205 492 C214 486 219 481 224 478 "+
    "M212 489 C222 483 227 479 235 476 "+
    "M217 485 C225 477 230 473 241 470",
    "M228 476 C237 469 246 467 253 466 "+
    "M231 481 C241 472 250 467 261 466 "+
    "M239 475 C248 470 253 467 267 465",
    "M249 472 C258 467 270 465 278 466 "+
    "M258 473 C270 466 281 466 292 467 "+
    "M265 468 C279 464 288 466 296 471",
    "M279 468 C291 466 302 471 308 475 "+
    "M287 467 C301 468 309 475 315 479 "+
    "M296 469 C306 471 314 477 320 482",
    "M303 473 C310 477 315 481 323 486 "+
    "M310 476 C316 482 321 486 325 490",
    "M395 461 C406 455 413 448 422 446 "+
    "M404 459 C414 451 421 447 432 443 "+
    "M410 454 C420 447 429 441 439 440",
    "M424 446 C435 441 446 438 452 439 "+
    "M434 445 C445 439 453 436 462 438 "+
    "M439 441 C452 437 460 438 468 442",
    "M448 439 C456 439 466 442 472 446 "+
    "M453 438 C463 442 468 447 474 450",
  ] as const;
  for(let i=0;i<Math.round(eyebrowFiberGroups.length*detail);i++)
    mark("brow-fibers-"+i,eyebrowFiberGroups[i],
      "#69504c",.25,[201,298],.51,"face-outline",
      {waxContact:"dry-wax",waxPressure:.48});
  // Source lids, lashes, and meniscus are layered before hair occlusion.
  // No late floating digital line marks over the eyelid or dark curtain.
  // Alar relief and labial commissures are deposited in their anatomical
  // paint order above; no late pure-ink outlines can float over hair.
  mark("lower-lip-reflected-contact",
    "M384 766Q425 780 461 750",
    "#e4b6aa",.94,[246,297],.48,"lip-lower");
  mark("chin-reflected-volume",
    "M353 834Q383 850 414 843",
    "#ddb3a7",.8,[246,298],.33,"face-outline");
  mark("jaw-underside-contour",
    "M158 797Q230 865 334 872Q397 868 452 828",
    "#795857",.45,[241,298],.10,"face-outline");

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
  // Preserve independent, exact negative controls for eye and midface.
  // Both experimental passes are native editable wax geometry and share
  // the original CRAYON1 absolute-frame timing, paper and camera.
  const ocularGeometry=eyeContact!=="baseline"?
    crayonF1ReconstructEyes(elements):elements;
  const valueEyes=eyeContact==="source-value"||eyeContact==="source-sculpt"?
    crayonF1SourceValueEyes(ocularGeometry):ocularGeometry;
  const ocular=eyeContact==="source-sculpt"?
    crayonF1SculptTarsal(valueEyes):valueEyes;
  // One source-rooted face artist, one baseline: no invented brow arch
  // is silently promoted to the existing scene defaults.
  const brow= browForm==="source-rooted"?
    crayonF1ReconstructBrows(ocular):ocular;
  // The sparse/original lashes are the negative control for photographic
  // lash density. Rooted dense fibers are never silently promoted.
  const lashed=eyeContact!=="baseline"?
    crayonF1AddRootedLashes(brow,lashFinish):brow;
  const studied=midfaceForm!=="baseline"?
    crayonF1ReconstructMidface(lashed):lashed;
  const alar=["source-alar","source-oral","source-oral-sculpt","source-nose-sculpt","source-nasal-depth","source-contour-joined","source-nasal-volume","source-nasal-value"].includes(midfaceForm)?
    crayonF1ConnectAlarUndercuts(studied):studied;
  const oral=["source-oral","source-oral-sculpt","source-nose-sculpt","source-nasal-depth","source-contour-joined","source-nasal-volume","source-nasal-value"].includes(midfaceForm)?
    crayonF1ReconstructOralContact(alar):alar;
  const sculpted=["source-oral-sculpt","source-nose-sculpt","source-nasal-depth","source-contour-joined","source-nasal-volume","source-nasal-value"].includes(midfaceForm)?
    crayonF1SculptOralOcclusion(oral):oral;
  const nasal=["source-nose-sculpt","source-nasal-depth","source-contour-joined","source-nasal-volume","source-nasal-value"].includes(midfaceForm)?
    crayonF1SculptNasalCartilage(sculpted):sculpted;
  const depth=midfaceForm==="source-nasal-depth"?
    crayonF1BuildNasalWaxDepth(nasal):nasal;
  const joined=["source-contour-joined","source-nasal-volume","source-nasal-value"].includes(midfaceForm)?
    crayonF1JoinNarisContours(depth):depth;
  const volume=["source-nasal-volume","source-nasal-value"].includes(midfaceForm)?
    crayonF1ConstructNasalVolume(joined):joined;
  const value=midfaceForm==="source-nasal-value"?
    crayonF1ReconstructNasalValue(volume):volume;
  const constructed=jawNeckForm==="source-contour"?
    crayonF1ReconstructJawNeck(value):value;
  return {version:1,id:"crayon-artcraft-cc0-portrait-"+view,
    width:608,height:1082,durationFrames:300,seed:441501,
    paper:C.paper,paperTooth:.79,
    elements:constructed,
    camera:[{frame:0,focusX:304,focusY:541,zoom:1},
      {frame:299,focusX:304,focusY:541,zoom:1}]};
}
