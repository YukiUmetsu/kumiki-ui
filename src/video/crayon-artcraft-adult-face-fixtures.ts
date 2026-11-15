import type {CrayonColor,CrayonElement,CrayonSceneSpec} from "../../registry/video/materials/crayon-scene";
import {crayonFurFlow,crayonFormHatching,crayonIrisFlecks} from "./crayon-editorial-character-craft";

/**
 * ArtCraft v6 unpublished eye/nose/mouth study. This is a NEW adult
 * three-quarter anatomy study, not the rejected Blue Coat child asset.
 * Geometry is original, informed by observed professional portrait
 * techniques, and intentionally unapproved pending rendered crop review.
 */
export type PortraitStudyAspect="landscape"|"portrait";
/** Static ArtCraft expression studies; not yet approved animated visemes. */
export type PortraitStudyExpression="warm"|"neutral";
export interface PortraitStudyOptions { detail?:number; frameLength?:300;
  expression?:PortraitStudyExpression;
  /** Cranial vertical compression around the brow/jaw balance point, 0.72..1. */
  headScaleY?:number }
type Wax=Extract<CrayonElement,{kind:"wax"}>;
type Ink=Extract<CrayonElement,{kind:"contour"}>;
type Rect={x:number;y:number;width:number;height:number};
const box=(x:number,y:number,width:number,height:number):Rect=>({x,y,width,height});
const colors={
  flesh:["#d6a68d","#b58374","#f0c4a8"] as const,
  warm:["#e4b498","#c08b79","#f6d0b2"] as const,
  cool:["#b69591","#96777f","#d0b5a7"] as const,
  cheek:["#cf9a87","#b47b78","#edbcaa"] as const,
  blush:["#df7864","#ac5262","#f7ad87"] as const,
  blushLight:["#ec9b7e","#c67572","#ffcca0"] as const,
  socket:["#aa827b","#805f61","#c6a09a"] as const,
  sclera:["#cfc0af","#a79998","#e6d6c2"] as const,
  iris:["#767f6a","#3f514e","#d0b691"] as const,
  pupil:["#37343b","#292d35","#62585b"] as const,
  lip:["#b77b76","#8d6069","#d5a094"] as const,
  hair:["#66484b","#3a333d","#9d726b"] as const,
  hairLight:["#916b60","#4d4046","#bd937b"] as const,
  neck:["#bc8a78","#816269","#dfb09b"] as const,
  coat:["#556677","#344958","#84909b"] as const,
  noseShade:["#c79c8b","#a67e7b","#e6bda6"] as const,
  scarf:["#aa6a5e","#724f59","#d5a082"] as const,
  scarfShadow:["#845251","#5d434b","#bc7a68"] as const,
  brass:["#c1a076","#856c55","#f0cb92"] as const,
  silk:["#d7bda9","#a9918d","#eee0c7"] as const,
} satisfies Record<string,readonly [CrayonColor,CrayonColor,CrayonColor]>;
export const portraitCriticalParts=[
  "adult-face","left-supraorbital","right-supraorbital",
  "left-eye-aperture","right-eye-aperture",
  "left-upper-lid","right-upper-lid",
  "left-tear-duct","right-tear-duct",
  "eye-cast-shadow-near","eye-cast-shadow-far",
  "iris-fibers-near","iris-fibers-far",
  "nose-bridge","nose-sidewall","nose-alar-wing",
  "lip-upper-volume","lip-lower-volume","mandible-plane",
  "hair-back","hair-temple-lock","neck-under-jaw",
  "coat-collar-left","coat-collar-right",
  "tailored-scarf-wrap","tailored-scarf-tail",
  "nose-tip-underpaint","cheek-warm-pigment","tear-trough-value",
  "neck-jaw-cast-shadow",
  "cheek-malar-crayon-red","cheek-far-crayon-red",
  "forelock-loose-curl","nose-septum-alar",
] as const;
const time={base:[1,98],value:[63,173],anatomy:[135,236],detail:[206,288]} as const;

/** Source-led portrait facial morphology; full body/rig are deliberately absent. */
export function crayonAdultFaceStudy(
  aspect:PortraitStudyAspect,options:PortraitStudyOptions={},
):CrayonSceneSpec{
  const detail=options.detail??1,expression=options.expression??"warm";
  const headScaleY=options.headScaleY??.82;
  if(!["warm","neutral"].includes(expression)||!["landscape","portrait"].includes(aspect)||
     !Number.isFinite(detail)||detail<0||detail>1||
     !Number.isFinite(headScaleY)||headScaleY<.72||headScaleY>1||
     (options.frameLength!==undefined&&options.frameLength!==300))
    throw new RangeError("Invalid ArtCraft facial study");
  const portrait=aspect==="portrait",W=portrait?540:960,H=portrait?960:540;
  const rootX=portrait?270:480,rootY=portrait?435:268,rootScale=portrait?1.24:.73;
  // The three-quarter face is intentionally asymmetric; expressing a smile
  // deforms the commissures and nasolabial folds, not merely their line color.
  const smiling=expression==="warm";
  const upperLip=smiling?
    "M-20 43Q-8 34 4 36Q14 30 23 33Q35 31 46 35"+
    "Q40 45 24 46Q8 47 -3 49Q-16 51 -20 43Z":
    "M-18 43Q-6 37 6 38Q15 33 24 36"+
    "Q35 36 43 41Q24 49 8 47Q-4 50 -18 43Z";
  const lowerLip=smiling?
    "M-15 51Q7 54 29 46Q37 49 31 57"+
    "Q18 64 5 63Q-9 61 -15 51Z":
    "M-13 53Q8 57 30 49Q34 58 28 64"+
    "Q9 70 -4 62Q-10 58 -13 53Z";
  const mouthLine=smiling?
    "M-21 43Q-5 51 8 46Q27 51 46 34":
    "M-18 45Q-5 49 8 47Q25 50 43 40";
  const elements:CrayonElement[]=[];
  const wax=(id:string,d:string,bounds:Rect,
    palette:readonly [CrayonColor,CrayonColor,CrayonColor],
    stage:keyof typeof time,overrides:Partial<Wax>={})=>{
    elements.push({kind:"wax",id,d,bounds,colors:palette,
      timing:{start:time[stage][0],end:time[stage][1]},
      coverage:"opaque",pressure:.9,spacing:9.4,nibStyle:"tapered",
      strokeOrder:"patches",markLength:"long",edgeRoughness:.31,
      outlineOpacity:.12,...overrides});
  };
  const ink=(id:string,d:string,color:CrayonColor,width:number,
    stage:keyof typeof time,overrides:Partial<Ink>={})=>{
    elements.push({kind:"contour",id,d,color,width,
      timing:{start:time[stage][0],end:time[stage][1]},
      opacity:.88,...overrides});
  };
  const hair=(id:string,region:string,guide:readonly [
    {x:number;y:number},{x:number;y:number},
    {x:number;y:number},{x:number;y:number}],
    seed:number,count:number,color:CrayonColor)=>{
    const d=crayonFurFlow({guide,seed,count:Math.round(count*detail),
      spread:10.5,length:16.4,curvature:.17,forkRate:.05});
    if(d)ink(id,d,color,.83,"detail",
      {parentId:region,clipToParent:true,opacity:.73});
  };
  const grain=(id:string,parentId:string,seed:number,
    cx:number,cy:number,rx:number,ry:number,angle:number,
    count:number,color:CrayonColor)=>{
    const d=crayonFormHatching({seed,cx,cy,rx,ry,angle,
      count:Math.round(count*detail),length:8.7,curvature:.28});
    if(d)ink(id,d,color,.7,"detail",
      {parentId,clipToParent:true,opacity:.61});
  };
  wax("paper-value",
    "M0 "+(H*.8)+"Q"+(W*.4)+" "+(H*.73)+" "+W+" "+(H*.78)+
    "V"+H+"H0Z",box(0,H*.7,W,H*.3),
    colors.silk,"base",{coverage:"open",pressure:.3,spacing:14,outlineOpacity:0});
  wax("coat-silhouette",
    "M-140 115Q-178 124 -194 160"+
    "Q-204 187 -200 237L-185 327"+
    "Q-171 340 -143 340L-129 280"+
    "Q-128 324 -104 345Q-1 355 103 346"+
    "Q134 331 140 281L146 337"+
    "Q175 345 190 328L199 237"+
    "Q206 185 174 152Q153 128 120 117"+
    "Q88 104 43 112L-49 111Q-99 99 -140 115Z",
    box(-216,91,428,270),colors.coat,"base",
    {placement:{x:rootX,y:rootY,scale:rootScale},
      spacing:9,markStrength:.78,
      underpaintGradient:{light:"#718899",shadow:"#304355",focusX:.35,focusY:.1,radius:1.2},
      outlineOpacity:0});
  wax("neck-under-jaw",
    "M-36 56Q-32 86 -67 119Q-39 136 11 137"+
    "Q53 133 72 117Q43 92 42 55Z",
    box(-78,48,158,101),colors.neck,"base",
    {parentId:"coat-silhouette",markStrength:.27,spacing:11.5,
      underpaintGradient:{light:"#d7a58b",shadow:"#8d6866",
        focusX:.34,focusY:.26,radius:1.15},
      outlineOpacity:0});
  wax("neck-jaw-cast-shadow",
    "M-34 59Q-2 62 40 57Q45 74 35 84"+
    "Q7 89 -27 76Z",
    box(-43,49,96,45),colors.cool,"value",
    {parentId:"neck-under-jaw",coverage:"open",clipToParent:true,
      blendRadius:5,pressure:.38,markStrength:.12,spacing:11,
      outlineOpacity:0,edgeRoughness:0});
  wax("hair-back",
    "M-132 -177C-156 -243 -127 -304 -54 -323"+
    "Q-3 -344 55 -314Q124 -310 147 -238"+
    "Q162 -210 148 -181Q179 -135 151 -83"+
    "Q135 -50 143 -8Q150 44 112 92"+
    "Q125 45 104 13Q81 0 58 -17"+
    "Q-28 42 -108 14Q-147 -22 -149 -89"+
    "Q-170 -132 -132 -177Z",
    box(-183,-350,364,451),colors.hair,"base",
    {parentId:"adult-face",edgeRoughness:.6,markStrength:.62,
      underpaintGradient:{light:"#9d7167",shadow:"#342f3a",focusX:.32,focusY:.18,radius:1.28},
      outlineOpacity:.06});
  // Adult 3/4 head: forehead broad, asymmetrical lower jaw, chin displaced
  // toward the viewer's right; substantially taller than the old child mask.
  wax("adult-face",
    "M-94 -208C-85 -270 -41 -289 16 -291"+
    "C81 -297 113 -261 122 -201"+
    "Q132 -154 112 -111Q115 -68 100 -27"+
    "Q88 18 71 50Q58 76 43 91"+
    "Q19 104 -9 99Q-38 94 -52 76"+
    "C-80 43 -103 7 -108 -42"+
    "Q-127 -133 -94 -208Z",
    box(-137,-312,272,446),colors.flesh,"value",
    {parentId:"neck-under-jaw",
      // The old character had a 1.64:1 face and an unattached looking
      // chin. Compress the *entire* inherited head hierarchy, including
      // lids, cheek planes, nose, brows and rooted hair, so coordinates
      // cannot drift apart or open a gap at the neck.
      placement:{scaleY:headScaleY},pivot:{x:0,y:-140},
      spacing:9.8,markStrength:.2,
      underpaintGradient:{light:"#f3ccab",shadow:"#ad7e78",focusX:.34,focusY:.28,radius:1.06},
      outlineOpacity:.07,
      edgeRoughness:.17});
  wax("ear-shadow",
    "M115 -149Q139 -166 145 -135Q152 -104 134 -88"+
    "Q120 -79 113 -88Z",
    box(108,-174,49,104),colors.cool,"value",
    {parentId:"adult-face",outlineOpacity:.12});
  wax("ear-concha",
    "M126 -145Q140 -138 137 -115Q129 -111 121 -100"+
    "Q118 -124 126 -145Z",
    box(114,-152,32,59),colors.socket,"anatomy",
    {parentId:"adult-face",spacing:4.8,outlineOpacity:0});
  wax("temple-cool",
    "M72 -227Q115 -206 118 -162Q122 -99 94 -60"+
    "Q84 -105 70 -158Z",
    box(63,-241,69,190),colors.cool,"value",
    {parentId:"adult-face",coverage:"open",clipToParent:true,markStrength:.16,blendRadius:9,pressure:.39,spacing:12,outlineOpacity:0,edgeRoughness:0});
  wax("forehead-ochre",
    "M-84 -204Q-46 -251 5 -251Q49 -255 79 -222"+
    "Q33 -227 -4 -216Q-50 -193 -70 -172Z",
    box(-102,-277,203,128),colors.warm,"value",
    {parentId:"adult-face",coverage:"open",clipToParent:true,markStrength:.16,blendRadius:11,pressure:.42,spacing:12.6,outlineOpacity:0,edgeRoughness:0});
  wax("left-supraorbital",
    "M-101 -173Q-69 -196 -29 -184Q-4 -178 4 -159"+
    "Q-22 -141 -60 -143Q-91 -148 -101 -173Z",
    box(-109,-206,123,78),colors.socket,"value",
    {parentId:"adult-face",coverage:"open",clipToParent:true,markStrength:.16,blendRadius:6,pressure:.5,spacing:11,outlineOpacity:0,edgeRoughness:0});
  wax("right-supraorbital",
    "M34 -172Q60 -194 98 -165Q111 -151 103 -136"+
    "Q67 -130 43 -143Z",
    box(24,-201,94,79),colors.cool,"value",
    {parentId:"adult-face",coverage:"open",clipToParent:true,markStrength:.16,blendRadius:6,pressure:.45,spacing:11,outlineOpacity:0,edgeRoughness:0});
  wax("left-cheek-volume",
    "M-96 -103Q-70 -118 -48 -94Q-34 -65 -41 -32"+
    "Q-58 -16 -74 -34Q-90 -68 -96 -103Z",
    box(-105,-126,82,122),colors.cheek,"value",
    {parentId:"adult-face",coverage:"open",clipToParent:true,markStrength:.16,blendRadius:11,pressure:.4,spacing:11.5,outlineOpacity:0,edgeRoughness:0});
  wax("right-cheek-receding",
    "M83 -126Q102 -115 104 -80Q99 -44 81 -17"+
    "Q64 -27 65 -63Z",
    box(59,-138,55,132),colors.cool,"value",
    {parentId:"adult-face",coverage:"open",clipToParent:true,markStrength:.16,blendRadius:9,pressure:.37,spacing:12,outlineOpacity:0,edgeRoughness:0});
  wax("malar-reflection",
    "M-84 -87Q-59 -100 -34 -75Q-23 -50 -39 -17"+
    "Q-63 -27 -77 -43Z",
    box(-94,-109,78,101),colors.warm,"value",
    {parentId:"adult-face",coverage:"open",clipToParent:true,markStrength:.16,blendRadius:8,pressure:.37,spacing:11.6,outlineOpacity:0,edgeRoughness:0});
  wax("cheek-warm-pigment",
    "M-82 -72Q-60 -87 -41 -70Q-25 -49 -45 -29"+
    "Q-68 -29 -82 -48Z",
    box(-93,-95,78,74),colors.cheek,"value",
    {parentId:"adult-face",coverage:"open",clipToParent:true,
      blendRadius:12,markStrength:.16,pressure:.32,spacing:15,
      outlineOpacity:0,edgeRoughness:0});
  wax("tear-trough-value",
    "M-76 -144Q-55 -128 -31 -140Q-29 -125 -51 -122"+
    "Q-69 -126 -76 -144Z",
    box(-84,-150,61,38),colors.cool,"value",
    {parentId:"adult-face",coverage:"open",clipToParent:true,
      blendRadius:5,markStrength:.1,pressure:.34,spacing:12,
      outlineOpacity:0,edgeRoughness:0});
  // User-supplied Crayon Design Board: warm saturated malar color is a
  // structural facial plane, not uniformly scattered digital freckles.
  // Each rub follows a source-locked cheek volume over continuous skin.
  wax("cheek-malar-crayon-red",
    "M-94 -113Q-66 -134 -37 -112"+
    "Q-16 -93 -25 -56Q-40 -31 -62 -45"+
    "Q-91 -58 -94 -113Z",
    box(-106,-144,94,116),colors.blushLight,"value",
    {parentId:"adult-face",coverage:"open",clipToParent:true,
      blendRadius:14,markStrength:.16,pressure:.35,spacing:11,
      angle:-16,outlineOpacity:0,edgeRoughness:0});
  // Irregular near-cheek red contacts remain discrete wax spots rather
  // than covering the whole malar plane with one synthetic red circle.
  wax("cheek-saturated-contact",
    "M-72 -99Q-54 -103 -43 -91Q-38 -78 -50 -67"+
    "Q-60 -62 -74 -74Q-80 -85 -72 -99Z",
    box(-85,-111,55,57),colors.blush,"anatomy",
    {parentId:"adult-face",coverage:"open",clipToParent:true,
      blendRadius:7,markStrength:.32,pressure:.53,spacing:6.5,
      angle:-18,outlineOpacity:0,edgeRoughness:0});
  wax("cheek-far-crayon-red",
    "M70 -115Q96 -120 108 -97"+
    "Q113 -80 96 -60Q82 -55 72 -70Z",
    box(63,-132,56,87),colors.blushLight,"value",
    {parentId:"adult-face",coverage:"open",clipToParent:true,
      blendRadius:8,markStrength:.24,pressure:.45,spacing:7.5,
      angle:19,outlineOpacity:0,edgeRoughness:0});
  grain("blush-directed-pigment-near","adult-face",1051,
    -64,-81,29,32,-28,96,"#c45f62");
  grain("blush-directed-pigment-far","adult-face",1052,
    88,-90,15,24,36,33,"#d88a7a");
  wax("mandible-plane",
    "M-62 -12Q-24 18 15 23Q52 25 78 -3"+
    "Q70 44 31 85Q-2 100 -28 73Q-55 46 -62 -12Z",
    box(-76,-23,167,130),colors.cool,"value",
    {parentId:"adult-face",coverage:"open",clipToParent:true,markStrength:.16,blendRadius:10,pressure:.35,spacing:13,outlineOpacity:0,edgeRoughness:0});
  wax("nose-bridge",
    "M-2 -135Q9 -146 18 -132"+
    "Q15 -104 19 -82Q23 -54 29 -41"+
    "Q31 -35 25 -33Q12 -38 8 -57"+
    "Q2 -84 -2 -135Z",
    box(-14,-151,52,130),colors.warm,"anatomy",
    {parentId:"adult-face",coverage:"open",clipToParent:true,blendRadius:7,
      markStrength:.14,pressure:.38,spacing:11,outlineOpacity:0,edgeRoughness:0});
  wax("nose-sidewall",
    "M-7 -100Q-14 -75 -19 -53Q-29 -39 -18 -30"+
    "Q-6 -38 -1 -58Z",
    box(-34,-111,43,92),colors.noseShade,"anatomy",
    {parentId:"adult-face",coverage:"open",clipToParent:true,markStrength:.16,blendRadius:9,pressure:.38,spacing:7.5,outlineOpacity:0,edgeRoughness:0});
  wax("nose-alar-wing",
    "M25 -39Q38 -44 48 -32Q52 -22 41 -19"+
    "Q32 -19 21 -26Q20 -33 25 -39Z",
    box(16,-49,42,39),colors.flesh,"anatomy",
    {parentId:"adult-face",markStrength:.13,outlineOpacity:0,spacing:8});
  wax("nose-tip-reflected-wax",
    "M19 -37Q29 -44 38 -37Q40 -31 32 -28"+
    "Q24 -30 19 -37Z",
    box(13,-50,33,29),colors.warm,"anatomy",
    {parentId:"adult-face",coverage:"open",clipToParent:true,
      blendRadius:8,markStrength:.07,pressure:.3,spacing:13,
      outlineOpacity:0,edgeRoughness:0});
  ink("nose-dorsal-soft-edge",
    "M8 -87Q12 -61 18 -48",
    "#b48775",.9,"detail",{parentId:"adult-face",opacity:.43});
  ink("nose-alar-undercut",
    "M22 -23Q28 -18 35 -20M39 -26Q45 -31 51 -27",
    "#a4716c",1.15,"detail",{parentId:"adult-face",opacity:.69});
  // Anatomical tip and glabella: diffuse color, not a hard nose triangle.
  // These follow the existing forehead/dorsum underpainting and cannot leak
  // out of the continuous adult facial silhouette.
  wax("nose-tip-underpaint",
    "M14 -36Q27 -49 42 -35Q43 -29 34 -25"+
    "Q24 -25 17 -29Z",
    box(8,-54,41,35),colors.noseShade,"anatomy",
    {parentId:"adult-face",coverage:"open",clipToParent:true,
      blendRadius:8,markStrength:.1,pressure:.36,spacing:13,
      outlineOpacity:0,edgeRoughness:0});
  wax("nose-root-sunlight",
    "M1 -122Q11 -132 19 -116Q15 -91 18 -70"+
    "Q19 -58 17 -51Q7 -73 1 -122Z",
    box(-6,-138,35,93),colors.warm,"anatomy",
    {parentId:"adult-face",coverage:"open",clipToParent:true,
      blendRadius:6,markStrength:.09,pressure:.38,spacing:13,
      outlineOpacity:0,edgeRoughness:0});
  // The nostril wing and septum do not meet as a glyph: the alar margin
  // turns around the bulb, the cast shadow stays below the tip.
  ink("nose-septum-alar",
    "M26 -27Q31 -24 35 -27"+
    "M44 -29L46 -30",
    "#91615f",.87,"detail",
    {parentId:"adult-face",opacity:.73});
  ink("dorsum-nose-bone-line",
    "M1 -94Q8 -66 14 -52",
    "#b78a7a",.89,"detail",
    {parentId:"adult-face",opacity:.44});
  ink("nose-tip-chromatic-highlight",
    "M19 -39Q25 -43 32 -39",
    "#d7ad96",.86,"detail",
    {parentId:"adult-face",opacity:.58});
  ink("nostril-underplane",
    "M29 -27Q32 -26 35 -28",
    "#b17c72",.63,"detail",{parentId:"adult-face",opacity:.35});
  ink("nasolabial-transition",
    "M58 -4Q66 4 64 12M-6 22Q-10 27 -8 31",
    "#ab7c75",.88,"detail",{parentId:"adult-face",opacity:.42});
  wax("lip-upper-volume",
    upperLip,
    box(-29,26,88,34),colors.lip,"anatomy",
    {parentId:"adult-face",coverage:"open",clipToParent:true,blendRadius:3,
      pressure:.38,markStrength:.17,spacing:9,outlineOpacity:0,edgeRoughness:0});
  wax("lip-lower-volume",
    lowerLip,
    box(-23,42,69,35),colors.cheek,"anatomy",
    {parentId:"adult-face",coverage:"open",clipToParent:true,blendRadius:3,
      pressure:.38,markStrength:.17,spacing:9,outlineOpacity:0,edgeRoughness:0});
  ink("mouth-commissures",mouthLine,
    "#86575d",1.32,"detail",{parentId:"adult-face",opacity:.81});
  ink("lip-reflected-wax",
    "M-6 60Q10 65 26 57M-12 44Q-5 42 1 43",
    "#d8a199",1.12,"detail",{parentId:"adult-face",opacity:.78});
  ink("lip-contour-reflected-warmth",
    "M-16 41Q-7 38 2 40M19 42Q30 39 38 39"+
    "M-10 65Q7 70 27 62",
    "#b87575",.88,"detail",
    {parentId:"adult-face",opacity:.71});
  ink("philtrum-column",
    "M2 14Q3 30 6 33M22 9Q23 23 21 31",
    "#c28b79",1.05,"detail",{parentId:"adult-face"});
  ink("chin-silhouette-light",
    "M-12 84Q13 96 36 80",
    "#d5aaa1",1.55,"detail",{parentId:"adult-face"});
  // Independent eyelid/sclera/iris systems; lid shadows lie over irises.
  wax("left-eye-aperture",
    "M-77 -163Q-61 -176 -44 -169Q-29 -166 -22 -153"+
    "Q-37 -139 -54 -143Q-70 -148 -77 -163Z",
    box(-85,-184,70,53),colors.sclera,"anatomy",
    {parentId:"adult-face",markStrength:.42,spacing:4,
      underpaintGradient:{light:"#ebe0ca",shadow:"#9d9296",focusX:.49,focusY:.72,radius:.85},
      outlineOpacity:.12,
      timing:{start:133,end:187}});
  wax("right-eye-aperture",
    "M49 -158Q64 -170 79 -161Q87 -157 89 -148"+
    "Q75 -138 59 -146Q52 -149 49 -158Z",
    box(44,-178,51,47),colors.sclera,"anatomy",
    {parentId:"adult-face",markStrength:.42,spacing:4,
      underpaintGradient:{light:"#ebe0ca",shadow:"#9d9296",focusX:.49,focusY:.72,radius:.85},
      outlineOpacity:.12,
      timing:{start:133,end:187}});
  wax("left-eye-iris",
    "M-63 -160C-63 -169 -57 -172 -51 -171"+
    "C-45 -171 -42 -166 -42 -160"+
    "C-42 -153 -46 -149 -52 -149"+
    "C-59 -149 -63 -154 -63 -160Z",
    box(-67,-175,29,30),colors.iris,"anatomy",
    {parentId:"adult-face",markStrength:.42,spacing:4.2,
      underpaintGradient:{light:"#b8a989",shadow:"#405154",
        focusX:.31,focusY:.21,radius:.9},
      outlineOpacity:0,
      timing:{start:169,end:229}});
  wax("right-eye-iris",
    "M66 -156C66 -163 71 -167 76 -166"+
    "C82 -165 84 -159 82 -153"+
    "C79 -148 72 -147 68 -151"+
    "C66 -153 66 -156 66 -156Z",
    box(62,-170,26,28),colors.iris,"anatomy",
    {parentId:"adult-face",markStrength:.42,spacing:4.2,
      underpaintGradient:{light:"#b8a989",shadow:"#405154",
        focusX:.31,focusY:.21,radius:.9},
      outlineOpacity:0,
      timing:{start:169,end:229}});
  wax("left-eye-pupil","M-58 -159Q-58 -165 -53 -166"+
    "Q-48 -166 -48 -160"+
    "Q-48 -154 -53 -153Q-58 -154 -58 -159Z",
    box(-61,-169,16,20),colors.pupil,"anatomy",
    {parentId:"adult-face",markStrength:.42,spacing:4,outlineOpacity:0,
      timing:{start:198,end:246}});
  wax("right-eye-pupil","M71 -157Q71 -163 75 -163Q79 -162 79 -157"+
    "Q78 -152 75 -152Q71 -153 71 -157Z",
    box(68,-166,15,17),colors.pupil,"anatomy",
    {parentId:"adult-face",markStrength:.42,spacing:4,outlineOpacity:0,
      timing:{start:198,end:246}});
  // The lids cast a warm, soft occlusion into the *real sclera*.
  // The grained iris underneath remains solid and visible where uncovered.
  wax("eye-cast-shadow-near",
    "M-79 -166Q-63 -178 -44 -171"+
    "Q-31 -169 -23 -155Q-45 -161 -59 -159"+
    "Q-70 -157 -79 -166Z",
    box(-89,-188,77,47),colors.socket,"anatomy",
    {parentId:"left-eye-aperture",coverage:"open",clipToParent:true,
      blendRadius:2.1,markStrength:.22,pressure:.52,
      spacing:8,outlineOpacity:0,edgeRoughness:0,
      timing:{start:178,end:235}});
  wax("eye-cast-shadow-far",
    "M48 -160Q64 -173 81 -163"+
    "Q88 -157 89 -148Q74 -156 61 -154Z",
    box(43,-184,55,47),colors.socket,"anatomy",
    {parentId:"right-eye-aperture",coverage:"open",clipToParent:true,
      blendRadius:1.8,markStrength:.18,pressure:.48,
      spacing:9,outlineOpacity:0,edgeRoughness:0,
      timing:{start:178,end:235}});
  wax("left-upper-lid",
    "M-78 -169Q-61 -180 -43 -172Q-26 -165 -19 -153"+
    "Q-41 -162 -54 -161Q-69 -159 -78 -153Z",
    box(-86,-190,75,50),colors.socket,"anatomy",
    {parentId:"adult-face",markStrength:.42,spacing:4,outlineOpacity:0,
      timing:{start:159,end:216}});
  wax("right-upper-lid",
    "M47 -164Q64 -174 80 -164Q91 -155 92 -146"+
    "Q75 -158 64 -157Q56 -155 47 -149Z",
    box(42,-182,58,43),colors.cool,"anatomy",
    {parentId:"adult-face",markStrength:.42,spacing:4,outlineOpacity:0,
      timing:{start:159,end:216}});
  ink("upper-lid-rim-left","M-80 -164Q-60 -178 -44 -170Q-29 -164 -21 -154",
    "#5a474e",1.75,"detail",{parentId:"adult-face"});
  ink("upper-lid-rim-right","M47 -160Q62 -173 78 -161Q86 -155 89 -146",
    "#594a50",1.5,"detail",{parentId:"adult-face"});
  ink("lower-lid-rim-left","M-76 -157Q-57 -139 -43 -146Q-30 -146 -23 -153",
    "#b48781",1.08,"detail",{parentId:"adult-face"});
  ink("lower-lid-rim-right","M49 -152Q67 -139 88 -149",
    "#ac8884",1.02,"detail",{parentId:"adult-face"});
  ink("left-tear-duct","M-79 -157Q-75 -153 -70 -155",
    "#a97772",1.16,"detail",{parentId:"adult-face"});
  ink("right-tear-duct","M49 -155Q54 -152 57 -154",
    "#af7671",1.05,"detail",{parentId:"adult-face"});
  ink("brow-structure-left",
    "M-88 -191Q-63 -206 -30 -187",
    "#6b5556",1.48,"detail",{parentId:"adult-face",opacity:.64});
  ink("brow-structure-right",
    "M45 -190Q66 -202 99 -184",
    "#715556",1.35,"detail",{parentId:"adult-face",opacity:.6});
  // Intermittent brow hairs replace a single graphic arc. Kept thinner
  // than the tarsal fold; the eye remains shaded under the brow.
  ink("fine-brow-hairs-near",
    "M-84 -191l7 -6M-75 -197l5 -4M-64 -200l6 -3"+
    "M-54 -199l7 2M-43 -194l5 3M-35 -190l3 3",
    "#76564e",.84,"detail",
    {parentId:"adult-face",opacity:.79});
  ink("fine-brow-hairs-far",
    "M49 -191l6 -4M58 -196l7 -3M69 -196l7 1"+
    "M82 -193l7 3M91 -188l4 4",
    "#765950",.79,"detail",
    {parentId:"adult-face",opacity:.72});
  ink("eye-upper-iris-shade",
    "M-58 -165Q-53 -169 -47 -165"+
    "M68 -162Q74 -166 79 -162",
    "#564e52",1.03,"detail",
    {parentId:"adult-face",opacity:.74});
  // Lash roots are tangent to the actual painted lid rims; separate
  // near/far eye taper rather than radial clock-face spokes.
  ink("upper-lashes-rooted-near",
    "M-78 -161Q-82 -165 -83 -168"+
    "M-73 -166Q-75 -169 -76 -172"+
    "M-65 -170Q-65 -173 -66 -175"+
    "M-46 -170Q-44 -171 -43 -173",
    "#654a50",.76,"detail",{parentId:"adult-face",opacity:.78});
  ink("upper-lashes-rooted-far",
    "M49 -157Q47 -160 47 -163"+
    "M54 -165Q52 -167 52 -169"+
    "M64 -167Q62 -169 62 -171",
    "#685259",.67,"detail",{parentId:"adult-face",opacity:.69});
  ink("lower-lid-pigmented-ridges",
    "M-70 -144Q-54 -137 -37 -148"+
    "M55 -144Q73 -139 85 -149",
    "#c99991",1.1,"detail",
    {parentId:"adult-face",opacity:.7});
  // Real pencil/crayon eyes have radial iris pigment beneath eyelids.
  // These source-bounded fibers are irregular seeded strokes,
  // clipped to painted iris anatomy, not unconnected spoke clip art.
  const irisNear=crayonIrisFlecks({
    seed:8821,cx:-52,cy:-160,rx:10.5,ry:10.6,
    count:Math.round(42*detail),minRadius:.39,maxRadius:.94,
  });
  const irisFar=crayonIrisFlecks({
    seed:8822,cx:74.3,cy:-157,rx:8.0,ry:8.9,
    count:Math.round(29*detail),minRadius:.43,maxRadius:.91,
  });
  if(irisNear)ink("iris-fibers-near",irisNear,"#d7c59d",.58,"detail",
    {parentId:"left-eye-iris",clipToParent:true,opacity:.83});
  if(irisFar)ink("iris-fibers-far",irisFar,"#a8977f",.53,"detail",
    {parentId:"right-eye-iris",clipToParent:true,opacity:.75});
  // Arc-tangent eyebrow hairs: one diffuse anatomical region plus
  // shorter independently seeded hairs, never only one vector arc.
  const browNear=crayonFurFlow({
    guide:[{x:-90,y:-190},{x:-69,y:-211},
      {x:-49,y:-202},{x:-29,y:-186}],
    seed:8823,count:Math.round(43*detail),
    spread:2.6,length:7.2,curvature:.14,forkRate:0,
  });
  const browFar=crayonFurFlow({
    guide:[{x:44,y:-190},{x:58,y:-207},
      {x:85,y:-197},{x:102,y:-184}],
    seed:8824,count:Math.round(30*detail),
    spread:2.1,length:6.2,curvature:.15,forkRate:0,
  });
  if(browNear)ink("brow-fibers-near",browNear,"#87645b",.52,"detail",
    {parentId:"adult-face",clipToParent:true,opacity:.58});
  if(browFar)ink("brow-fibers-far",browFar,"#87665a",.5,"detail",
    {parentId:"adult-face",clipToParent:true,opacity:.55});
  ink("near-iris-limbal-ring",
    "M-63 -161C-64 -170 -57 -174 -51 -172"+
    "C-44 -171 -40 -166 -41 -160"+
    "C-41 -152 -46 -148 -52 -148"+
    "C-59 -148 -63 -154 -63 -161Z",
    "#415251",1.12,"detail",
    {parentId:"left-eye-iris",clipToParent:true,opacity:.74});
  ink("far-iris-limbal-ring",
    "M65 -156C65 -164 70 -169 76 -167"+
    "C82 -166 85 -160 83 -153"+
    "C80 -147 71 -146 67 -151Q65 -154 65 -156Z",
    "#424d4b",.93,"detail",
    {parentId:"right-eye-iris",clipToParent:true,opacity:.69});
  ink("iris-catchlights",
    "M-54 -166l1.5 -1.8M72 -162l1.2 -1.4",
    "#f5e7d0",1.2,"detail",{parentId:"adult-face"});
  // Anatomy-first iris fibers follow each smaller pupil. Both stroke beds
  // are clipped to real pigmented irises; never independent radial clip-art.
  ink("near-iris-radials",
    "M-56 -165l3 2M-56 -158l4 1M-49 -168l-1 4M-51 -151l1 3",
    "#a59278",.78,"detail",
    {parentId:"left-eye-iris",clipToParent:true,opacity:.7});
  ink("far-iris-radials",
    "M70 -162l3 1M69 -155l3 1M76 -161l-1 3",
    "#a78f76",.72,"detail",
    {parentId:"right-eye-iris",clipToParent:true,opacity:.65});
  // Sparse flesh-colored upper-lid fold creases, aligned to observed socket.
  ink("orbital-fold-left",
    "M-78 -182Q-56 -193 -39 -185M-74 -141Q-59 -136 -48 -141",
    "#b18b82",1.05,"detail",{parentId:"adult-face",opacity:.62});
  ink("orbital-fold-right",
    "M52 -181Q72 -188 88 -173M61 -139Q75 -137 85 -144",
    "#b09088",.98,"detail",{parentId:"adult-face",opacity:.59});
  wax("hair-temple-lock",
    "M-119 -212Q-149 -158 -129 -98"+
    "Q-118 -68 -111 -36Q-88 -62 -97 -105"+
    "Q-118 -156 -69 -213Z",
    box(-157,-224,107,205),colors.hairLight,"anatomy",
    {parentId:"adult-face",edgeRoughness:.57,outlineOpacity:.09});
  wax("hair-crown-part",
    "M-119 -224Q-139 -280 -78 -312Q-43 -329 6 -315"+
    "Q62 -316 94 -283Q40 -290 -13 -260Q-64 -227 -80 -183Z",
    box(-134,-337,242,169),colors.hair,"anatomy",
    {parentId:"adult-face",edgeRoughness:.57,outlineOpacity:.06});
  wax("hair-far-wave",
    "M40 -295Q129 -304 146 -214Q166 -145 124 -73"+
    "Q139 -155 97 -221Q75 -249 40 -245Z",
    box(28,-320,151,266),colors.hairLight,"anatomy",
    {parentId:"adult-face",edgeRoughness:.55,outlineOpacity:.09});
  // Three overlapping swept locks break the old helmet silhouette without
  // changing the source identity. All roots follow the cranium.
  wax("hair-left-lower-wave",
    "M-122 -150Q-151 -118 -150 -80"+
    "Q-166 -46 -143 -23Q-122 -8 -109 -23"+
    "Q-127 -52 -116 -84Q-106 -121 -122 -150Z",
    box(-176,-165,82,168),colors.hairLight,"anatomy",
    {parentId:"adult-face",markStrength:.55,spacing:7.1,
      outlineOpacity:.08,edgeRoughness:.58});
  wax("hair-nape-sweep",
    "M113 -157Q153 -130 146 -96"+
    "Q169 -61 142 -31Q133 -11 119 -22"+
    "Q137 -59 120 -92Q105 -123 113 -157Z",
    box(103,-170,77,165),colors.hair,"anatomy",
    {parentId:"adult-face",markStrength:.58,spacing:6.9,
      outlineOpacity:.07,edgeRoughness:.61});
  wax("hair-amber-crown-glaze",
    "M-126 -227Q-89 -311 -27 -310Q59 -325 111 -270"+
    "Q34 -275 -16 -251Q-92 -241 -106 -198Z",
    box(-138,-330,263,149),colors.hairLight,"anatomy",
    {parentId:"hair-crown-part",coverage:"open",clipToParent:true,
      blendRadius:6,markStrength:.28,spacing:9.8,pressure:.48,
      outlineOpacity:0,edgeRoughness:0});
  // Loose forehead curl is a tapered, CONNECTED lock with a shadowed
  // underside and individual source-following crayon fibers.
  wax("forelock-loose-curl",
    "M-123 -237Q-109 -271 -67 -283"+
    "Q-21 -285 3 -260Q-43 -270 -72 -241"+
    "Q-89 -228 -92 -199Q-105 -205 -103 -223"+
    "Q-114 -224 -123 -237Z",
    box(-137,-296,150,112),colors.hairLight,"anatomy",
    {parentId:"adult-face",spacing:8.7,markStrength:.42,
      edgeRoughness:.47,outlineOpacity:.05});
  wax("forelock-underturn",
    "M-107 -224Q-94 -252 -70 -261"+
    "Q-45 -272 -20 -267Q-66 -252 -83 -218Z",
    box(-120,-277,116,69),colors.hair,"anatomy",
    {parentId:"forelock-loose-curl",coverage:"open",
      clipToParent:true,blendRadius:2.5,
      spacing:5.1,markStrength:.65,pressure:.56,
      outlineOpacity:0,edgeRoughness:0});
  hair("forelock-fiber-direction","forelock-loose-curl",
    [{x:-120,y:-238},{x:-105,y:-275},{x:-51,y:-288},{x:0,y:-261}],
    620,72,"#b99685");
  ink("forelock-loose-rooted-tip",
    "M-101 -237Q-91 -214 -91 -198M-104 -232Q-98 -206 -92 -193",
    "#78544c",1.25,"detail",{parentId:"forelock-loose-curl",
      clipToParent:true,opacity:.82});
  hair("rooted-crown-direction","hair-crown-part",
    [{x:-119,y:-228},{x:-113,y:-290},{x:-18,y:-324},{x:87,y:-269}],
    610,124,"#c4a087");
  hair("rooted-temple-direction","hair-temple-lock",
    [{x:-112,y:-215},{x:-141,y:-162},{x:-136,y:-96},{x:-111,y:-37}],
    611,115,"#c6a080");
  hair("rooted-far-wave","hair-far-wave",
    [{x:49,y:-286},{x:126,y:-289},{x:151,y:-180},{x:129,y:-84}],
    612,118,"#b58c78");
  hair("hair-left-lower-flow","hair-left-lower-wave",
    [{x:-124,y:-142},{x:-164,y:-105},{x:-165,y:-54},{x:-114,y:-23}],
    613,123,"#d3a084");
  hair("hair-nape-flow","hair-nape-sweep",
    [{x:118,y:-146},{x:165,y:-102},{x:170,y:-55},{x:134,y:-22}],
    614,112,"#b48c79");
  ink("flyaway-accents",
    "M-126 -223Q-145 -242 -157 -225"+
    "M-92 -286Q-112 -305 -125 -290"+
    "M119 -263Q145 -272 153 -242",
    "#634b4e",1.25,"detail",{parentId:"adult-face"});
  wax("coat-collar-left",
    "M-130 123Q-96 105 -65 139L-8 201"+
    "Q-38 231 -78 272Q-100 216 -130 123Z",
    box(-140,97,140,183),colors.coat,"anatomy",
    {parentId:"coat-silhouette",spacing:7.5,outlineOpacity:.09});
  wax("coat-collar-right",
    "M55 114Q103 106 151 158Q112 183 71 266"+
    "Q44 193 27 168Z",
    box(21,101,146,178),colors.coat,"anatomy",
    {parentId:"coat-silhouette",spacing:7.5,outlineOpacity:.09});
  wax("shirt-linen","M-53 150Q-23 171 7 181Q38 167 61 151"+
    "Q33 208 21 268Q10 281 -11 266Z",
    box(-64,137,136,153),colors.silk,"anatomy",
    {parentId:"coat-silhouette",markStrength:.43,spacing:10,outlineOpacity:0});
  // Wrapped textile has separate rolled band and hanging tail with
  // grain following cloth direction. No flat screen-space tartan overlay.
  wax("tailored-scarf-wrap",
    "M-81 107Q-51 92 -18 104Q10 111 38 104"+
    "Q59 92 78 104Q88 122 72 138"+
    "Q47 152 8 150Q-31 159 -65 144"+
    "Q-86 130 -81 107Z",
    box(-94,88,184,78),colors.scarf,"anatomy",
    {parentId:"coat-silhouette",spacing:5.6,markStrength:.62,
      edgeRoughness:.43,outlineOpacity:.06});
  wax("tailored-scarf-tail",
    "M27 144Q49 152 55 179Q62 213 51 239"+
    "Q46 260 33 269L13 255"+
    "Q28 214 18 161Z",
    box(9,135,67,143),colors.scarfShadow,"anatomy",
    {parentId:"coat-silhouette",spacing:6,markStrength:.65,
      edgeRoughness:.36,outlineOpacity:.05});
  ink("tailored-scarf-weft",
    "M-73 119Q-31 137 64 116M-68 136Q-12 151 62 134"+
    "M-39 104Q-37 126 -28 145M10 113Q17 137 26 149"+
    "M53 105Q57 127 59 140",
    "#e2ae8d",1.85,"detail",
    {parentId:"tailored-scarf-wrap",clipToParent:true,opacity:.91});
  ink("tailored-scarf-tail-stitch",
    "M24 166Q45 209 35 255M38 161Q52 211 44 242",
    "#dda087",1.2,"detail",
    {parentId:"tailored-scarf-tail",clipToParent:true,opacity:.8});
  wax("coat-shoulder-shadow-left",
    "M-147 136Q-187 160 -182 229"+
    "Q-164 254 -150 284Q-146 204 -129 156Z",
    box(-198,126,80,168),colors.coat,"value",
    {parentId:"coat-silhouette",coverage:"open",clipToParent:true,
      blendRadius:5,markStrength:.4,spacing:11,pressure:.49,
      outlineOpacity:0,edgeRoughness:0});
  wax("coat-sleeve-shadow-right",
    "M135 134Q191 167 190 233Q183 270 158 300"+
    "Q165 232 128 161Z",
    box(119,120,85,198),colors.coat,"value",
    {parentId:"coat-silhouette",coverage:"open",clipToParent:true,
      blendRadius:5,markStrength:.4,spacing:11,pressure:.48,
      outlineOpacity:0,edgeRoughness:0});
  ink("coat-fold-seams",
    "M-150 142Q-108 184 -91 253M71 141Q101 163 132 165"+
    "M-101 262Q-106 285 -115 315M75 268Q84 296 85 318",
    "#a6aca9",1.8,"detail",{parentId:"coat-silhouette"});
  ink("coat-shoulder-set-in-sleeves",
    "M-141 144Q-158 186 -150 260M133 140Q157 183 150 264",
    "#bac0b4",1.05,"detail",
    {parentId:"coat-silhouette",opacity:.81});
  ink("coat-reinforced-buttonholes",
    "M-8 239Q4 241 10 235M-13 271Q1 275 14 267",
    "#c2bab0",1.7,"detail",
    {parentId:"coat-silhouette",opacity:.74});
  ink("blouse-yoke-gathers",
    "M-31 172Q-34 191 -29 216M-5 180Q-8 211 -3 235"+
    "M22 178Q19 213 16 243",
    "#ab938d",1.05,"detail",
    {parentId:"shirt-linen",clipToParent:true,opacity:.55});
  grain("left-cheek-layered-wax","adult-face",1001,
    -57,-78,31,54,-42,40,"#e7b39b");
  grain("nose-sidewall-wax","adult-face",1002,
    9,-88,21,49,76,32,"#c88d78");
  grain("right-temple-shadow-wax","adult-face",1003,
    89,-93,21,53,-64,32,"#846871");
  grain("coat-wool-broken-rub","coat-collar-left",1004,
    -107,188,35,48,70,117,"#b8b7ab");
  grain("coat-fold-shaded-wax","coat-collar-right",1005,
    93,181,38,46,-41,100,"#8998a1");
  grain("jaw-chromatic-undercoat","adult-face",1006,
    6,51,37,36,24,32,"#a27577");
  // Source-led cloth construction: folded seam tubes track shoulder tension,
  // buttonhole and dress-front drape rather than a rectangular inset bib.
  ink("coat-neck-roll","M-143 118Q-108 118 -87 137M56 128Q99 117 151 158",
    "#b1aea8",1.8,"detail",{parentId:"coat-silhouette",opacity:.83});
  ink("coat-right-princess-seam","M69 242Q83 269 93 310",
    "#9ba5a8",1.15,"detail",{parentId:"coat-silhouette",opacity:.65});
  ink("linen-vertical-gathers","M-20 173Q-30 220 -27 283"+
    "M8 174Q3 229 16 283M31 170Q43 226 39 279",
    "#b8a498",1.35,"detail",{parentId:"shirt-linen",opacity:.72});
  ink("linen-fold-under-chin","M-46 161Q-7 189 37 167",
    "#f2dac6",1.65,"detail",{parentId:"shirt-linen",opacity:.89});
  ink("tailored-coat-cuff-crease","M-163 279Q-150 296 -137 302"+
    "M130 307Q144 299 156 279",
    "#b0b7b2",1.4,"detail",{parentId:"coat-silhouette",opacity:.76});
  // ArtCraft close-crop feature study: small, uneven pigment strokes at
  // the exact orbital rim and malar tissue. Different layers carry
  // asymmetrical freckles, warm light, and controlled nasolabial tension.
  wax("cheek-malar-glow",
    "M-87 -111Q-61 -127 -37 -101Q-28 -89 -31 -72"+
    "Q-53 -56 -76 -73Z",
    box(-98,-136,80,88),colors.warm,"anatomy",
    {parentId:"adult-face",coverage:"open",clipToParent:true,
      blendRadius:9,pressure:.34,spacing:13,markStrength:.18,
      outlineOpacity:0,edgeRoughness:0});
  wax("far-cheek-reflection",
    "M66 -116Q87 -118 102 -103Q106 -89 91 -64"+
    "Q82 -76 70 -85Z",
    box(57,-130,57,80),colors.cheek,"anatomy",
    {parentId:"adult-face",coverage:"open",clipToParent:true,
      blendRadius:8,pressure:.36,spacing:12,markStrength:.18,
      outlineOpacity:0,edgeRoughness:0});
  ink("freckles-near",
    "M-77 -81l1.9 -.8M-68 -86l1.2 -.5M-59 -79l2 -.6"+
    "M-71 -72l1 -.7M-50 -88l1.6 -.4M-60 -91l1.4 -.2"+
    "M-83 -74l1.2 -.7M-53 -71l1.5 -.7M-42 -84l1.2 -.6",
    "#94645e",.88,"detail",{parentId:"adult-face",opacity:.58});
  ink("freckles-far",
    "M79 -93l1 -.6M87 -88l1.3 -.5M71 -81l1.7 -.2"+
    "M85 -76l1.1 -.3M93 -94l1 -.6",
    "#956c68",.76,"detail",{parentId:"adult-face",opacity:.5});
  ink("smile-nasolabial-soft",
    smiling?"M-25 12Q-34 22 -26 34M53 15Q57 26 50 33":
      "M-26 14Q-29 20 -25 25M52 15Q55 22 51 28",
    "#b68478",.83,"detail",{parentId:"adult-face",opacity:.48});
  ink("smile-corner-undercuts",
    smiling?"M-21 43q-3 -.5 -3 -4M46 35q4 -1 4 -5":
      "M-20 44q-1 -1 -1 -2M43 42q2 -1 2 -3",
    "#8b5e65",.95,"detail",{parentId:"adult-face",opacity:.65});
  // Hair follows the lobes' actual growth and overlapping curls; the
  // negative space beside each cheek remains open instead of filling it
  // with a generic solid oval.
  ink("forelock-woodgrain",
    "M-114 -237Q-97 -288 -39 -310M-106 -250Q-78 -294 -30 -304"+
    "M-87 -257Q-39 -305 9 -306M-57 -283Q-7 -304 36 -293"+
    "M-27 -299Q12 -314 55 -288",
    "#c39a86",1.24,"detail",
    {parentId:"hair-crown-part",clipToParent:true,opacity:.62});
  ink("crown-root-hatching",
    "M-109 -219Q-90 -251 -65 -262M-101 -215Q-73 -252 -46 -266"+
    "M-92 -212Q-52 -256 -31 -264M-74 -228Q-42 -257 -16 -264",
    "#59424a",1.75,"detail",
    {parentId:"hair-crown-part",clipToParent:true,opacity:.82});
  ink("temple-curl-inner-flow",
    "M-128 -146Q-153 -109 -146 -72M-135 -148Q-153 -112 -138 -63"+
    "M-146 -113Q-154 -83 -143 -52M-135 -93Q-139 -59 -125 -37",
    "#e6b293",1.2,"detail",
    {parentId:"hair-left-lower-wave",clipToParent:true,opacity:.79});
  ink("far-curl-inner-flow",
    "M128 -145Q156 -119 149 -93M139 -135Q162 -102 149 -73"+
    "M147 -91Q150 -57 134 -38",
    "#d5a18a",1.3,"detail",
    {parentId:"hair-nape-sweep",clipToParent:true,opacity:.84});
  ink("forehead-hairline-baby-hairs",
    "M-70 -201q-5 2 -5 8M-61 -208q-4 2 -4 7"+
    "M-53 -214q-5 3 -4 8M-46 -221q-5 2 -5 8"+
    "M-18 -229q-3 2 -2 7",
    "#8e6460",.88,"detail",
    {parentId:"adult-face",opacity:.65});
  // The tailored coat receives functional details before ornament:
  // curved placket, sewn bound edges, uneven button spacing and wool
  // rubs anchored to fabric masses. All lines clip to the coat shape.
  wax("coat-brass-button-one",
    "M-31 258Q-25 250 -18 254Q-12 261 -18 268Q-28 268 -31 258Z",
    box(-37,244,30,32),colors.brass,"detail",
    {parentId:"coat-silhouette",spacing:4,markStrength:.23,
      outlineOpacity:.11});
  wax("coat-brass-button-two",
    "M-38 292Q-31 285 -23 287Q-15 292 -21 304"+
    "Q-31 307 -38 292Z",
    box(-44,279,36,34),colors.brass,"detail",
    {parentId:"coat-silhouette",spacing:4,markStrength:.23,
      outlineOpacity:.12});
  ink("coat-button-threads",
    "M-26 259l5 4M-22 257l-3 6M-32 292l7 6M-25 291l-7 6",
    "#c4ac90",1.05,"detail",
    {parentId:"coat-silhouette",opacity:.92});
  ink("coat-hand-sewn-piping",
    "M-128 118Q-91 149 -73 185Q-65 205 -59 229"+
    "M53 127Q81 151 85 190Q91 217 87 243"+
    "M-145 173Q-155 229 -149 298M132 173Q155 226 149 299",
    "#d4c2b0",1.05,"detail",
    {parentId:"coat-silhouette",clipToParent:true,opacity:.73});
  ink("coat-wool-following-sleeve",
    "M-162 163Q-181 206 -170 252M-157 173Q-173 209 -165 246"+
    "M159 159Q175 211 171 246M167 180Q185 232 172 265",
    "#a5a5a2",1.1,"detail",
    {parentId:"coat-silhouette",clipToParent:true,opacity:.63});
  ink("scarf-woven-check-diagonal",
    "M-67 109Q-49 131 -36 149M-42 107Q-23 134 -13 151"+
    "M-14 109Q0 139 8 151M20 109Q34 136 45 148"+
    "M46 105Q59 127 63 140",
    "#f2c5a0",.97,"detail",
    {parentId:"tailored-scarf-wrap",clipToParent:true,opacity:.92});
  ink("scarf-edge-broken-fringe",
    "M26 251l-5 9M30 252l-4 12M35 254l-3 11M41 253l0 9",
    "#e3b092",1.35,"detail",
    {parentId:"tailored-scarf-tail",clipToParent:true,opacity:.83});
  ink("linen-floral-embroidery",
    "M-18 232q4 -8 8 -1q5 -8 9 1M0 241q4 -8 8 -1q4 -8 8 -2"+
    "M-8 252q4 -8 8 -1q4 -8 8 -1",
    "#b78175",.9,"detail",
    {parentId:"shirt-linen",clipToParent:true,opacity:.55});
  // Pull the under-eye, nasal and lip shapes together with local anatomy.
  // Avoid an extra face-wide texture overlay: every guide is supported by
  // the parent mask and its original authored coordinates.
  ink("malar-crease-near",
    "M-79 -123Q-64 -118 -47 -125"+
    "M-67 -115Q-54 -112 -46 -119",
    "#c68b80",.92,"detail",
    {parentId:"adult-face",opacity:.59});
  ink("malar-crease-far",
    "M66 -120Q81 -113 94 -120",
    "#b78a86",.85,"detail",
    {parentId:"adult-face",opacity:.46});
  ink("upper-lip-philtrum-highlight",
    "M6 18Q10 28 11 31M19 15Q20 23 18 29",
    "#e6b69c",1.09,"detail",
    {parentId:"adult-face",opacity:.72});
  ink("oral-commissure-warm-creases",
    smiling?"M-23 41Q-28 34 -29 30M45 35Q52 32 53 26":
      "M-21 45Q-24 41 -24 37M43 42Q47 39 48 35",
    "#b87674",.88,"detail",
    {parentId:"adult-face",opacity:.58});
  return {version:1,id:"crayon-artcraft-adult-face-"+aspect,
    width:W,height:H,durationFrames:300,seed:6812,
    paper:"#f8efe0",paperTooth:.8,elements,
    camera:[{frame:0,focusX:W/2,focusY:H/2,zoom:1},
      {frame:299,focusX:W/2,focusY:H/2,zoom:1}]};
}
