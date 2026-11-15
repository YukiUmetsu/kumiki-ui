import type {CrayonColor,CrayonElement,CrayonSceneSpec} from "../../registry/video/materials/crayon-scene";
import {crayonFurFlow,crayonFormHatching} from "./crayon-editorial-character-craft";

/**
 * ArtCraft v6 unpublished eye/nose/mouth study. This is a NEW adult
 * three-quarter anatomy study, not the rejected Blue Coat child asset.
 * Geometry is original, informed by observed professional portrait
 * techniques, and intentionally unapproved pending rendered crop review.
 */
export type PortraitStudyAspect="landscape"|"portrait";
export interface PortraitStudyOptions { detail?:number; frameLength?:300 }
type Wax=Extract<CrayonElement,{kind:"wax"}>;
type Ink=Extract<CrayonElement,{kind:"contour"}>;
type Rect={x:number;y:number;width:number;height:number};
const box=(x:number,y:number,width:number,height:number):Rect=>({x,y,width,height});
const colors={
  flesh:["#d6a68d","#b58374","#f0c4a8"] as const,
  warm:["#e4b498","#c08b79","#f6d0b2"] as const,
  cool:["#b69591","#96777f","#d0b5a7"] as const,
  cheek:["#cf9a87","#b47b78","#edbcaa"] as const,
  socket:["#aa827b","#805f61","#c6a09a"] as const,
  sclera:["#cfc0af","#a79998","#e6d6c2"] as const,
  iris:["#80796e","#514b4e","#bcae8e"] as const,
  pupil:["#37343b","#292d35","#62585b"] as const,
  lip:["#b77b76","#8d6069","#d5a094"] as const,
  hair:["#66484b","#3a333d","#9d726b"] as const,
  hairLight:["#916b60","#4d4046","#bd937b"] as const,
  neck:["#bc8a78","#816269","#dfb09b"] as const,
  coat:["#556677","#344958","#84909b"] as const,
  silk:["#d7bda9","#a9918d","#eee0c7"] as const,
} satisfies Record<string,readonly [CrayonColor,CrayonColor,CrayonColor]>;
export const portraitCriticalParts=[
  "adult-face","left-supraorbital","right-supraorbital",
  "left-eye-aperture","right-eye-aperture",
  "left-upper-lid","right-upper-lid",
  "left-tear-duct","right-tear-duct",
  "nose-bridge","nose-sidewall","nose-alar-wing",
  "lip-upper-volume","lip-lower-volume","mandible-plane",
  "hair-back","hair-temple-lock","neck-under-jaw",
  "coat-collar-left","coat-collar-right",
] as const;
const time={base:[1,98],value:[63,173],anatomy:[135,236],detail:[206,288]} as const;

/** Source-led portrait facial morphology; full body/rig are deliberately absent. */
export function crayonAdultFaceStudy(
  aspect:PortraitStudyAspect,options:PortraitStudyOptions={},
):CrayonSceneSpec{
  const detail=options.detail??1;
  if(!["landscape","portrait"].includes(aspect)||
     !Number.isFinite(detail)||detail<0||detail>1||
     (options.frameLength!==undefined&&options.frameLength!==300))
    throw new RangeError("Invalid ArtCraft facial study");
  const portrait=aspect==="portrait",W=portrait?540:960,H=portrait?960:540;
  const rootX=portrait?270:656,rootY=portrait?435:261,rootScale=portrait?1.24:.70;
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
    "M-146 115Q-182 145 -187 202L-179 291"+
    "Q-163 323 -120 337L-58 329L65 335"+
    "Q131 341 162 307Q183 261 170 206"+
    "Q154 132 117 112Q87 101 43 108"+
    "L-50 110Q-100 94 -146 115Z",
    box(-199,89,386,262),colors.coat,"base",
    {placement:{x:rootX,y:rootY,scale:rootScale},
      spacing:9,outlineOpacity:0});
  wax("neck-under-jaw",
    "M-36 56Q-39 100 -74 122Q-42 146 11 147"+
    "Q59 139 85 117Q49 95 42 55Z",
    box(-87,46,180,113),colors.neck,"base",
    {parentId:"coat-silhouette",outlineOpacity:0});
  wax("hair-back",
    "M-132 -172C-164 -248 -117 -310 -25 -318"+
    "Q102 -326 143 -216Q165 -141 127 -67"+
    "Q143 21 101 66L82 -29Q-24 34 -116 18"+
    "Q-149 -25 -132 -172Z",
    box(-175,-339,348,420),colors.hair,"base",
    {parentId:"adult-face",edgeRoughness:.56,outlineOpacity:.06});
  // Adult 3/4 head: forehead broad, asymmetrical lower jaw, chin displaced
  // toward the viewer's right; substantially taller than the old child mask.
  wax("adult-face",
    "M-96 -203Q-77 -274 -10 -288C61 -304 110 -261 124 -197"+
    "Q131 -148 114 -105Q120 -57 91 4Q75 54 31 100"+
    "Q-3 117 -41 89C-81 58 -90 12 -103 -45"+
    "Q-130 -119 -96 -203Z",
    box(-137,-312,272,446),colors.flesh,"value",
    {parentId:"neck-under-jaw",spacing:7.1,outlineOpacity:.07,
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
    {parentId:"adult-face",coverage:"open",pressure:.39,spacing:12,outlineOpacity:0,edgeRoughness:0});
  wax("forehead-ochre",
    "M-84 -204Q-46 -251 5 -251Q49 -255 79 -222"+
    "Q33 -227 -4 -216Q-50 -193 -70 -172Z",
    box(-102,-277,203,128),colors.warm,"value",
    {parentId:"adult-face",coverage:"open",pressure:.42,spacing:12.6,outlineOpacity:0,edgeRoughness:0});
  wax("left-supraorbital",
    "M-101 -173Q-69 -196 -29 -184Q-4 -178 4 -159"+
    "Q-22 -141 -60 -143Q-91 -148 -101 -173Z",
    box(-109,-206,123,78),colors.socket,"value",
    {parentId:"adult-face",coverage:"open",pressure:.5,spacing:11,outlineOpacity:0,edgeRoughness:0});
  wax("right-supraorbital",
    "M34 -172Q60 -194 98 -165Q111 -151 103 -136"+
    "Q67 -130 43 -143Z",
    box(24,-201,94,79),colors.cool,"value",
    {parentId:"adult-face",coverage:"open",pressure:.45,spacing:11,outlineOpacity:0,edgeRoughness:0});
  wax("left-cheek-volume",
    "M-96 -103Q-70 -118 -48 -94Q-34 -65 -41 -32"+
    "Q-58 -16 -74 -34Q-90 -68 -96 -103Z",
    box(-105,-126,82,122),colors.cheek,"value",
    {parentId:"adult-face",coverage:"open",pressure:.4,spacing:11.5,outlineOpacity:0,edgeRoughness:0});
  wax("right-cheek-receding",
    "M83 -126Q102 -115 104 -80Q99 -44 81 -17"+
    "Q64 -27 65 -63Z",
    box(59,-138,55,132),colors.cool,"value",
    {parentId:"adult-face",coverage:"open",pressure:.37,spacing:12,outlineOpacity:0,edgeRoughness:0});
  wax("malar-reflection",
    "M-84 -87Q-59 -100 -34 -75Q-23 -50 -39 -17"+
    "Q-63 -27 -77 -43Z",
    box(-94,-109,78,101),colors.warm,"value",
    {parentId:"adult-face",coverage:"open",pressure:.37,spacing:11.6,outlineOpacity:0,edgeRoughness:0});
  wax("mandible-plane",
    "M-62 -12Q-24 18 15 23Q52 25 78 -3"+
    "Q70 44 31 85Q-2 100 -28 73Q-55 46 -62 -12Z",
    box(-76,-23,167,130),colors.cool,"value",
    {parentId:"adult-face",coverage:"open",pressure:.35,spacing:13,outlineOpacity:0,edgeRoughness:0});
  wax("nose-bridge",
    "M-6 -140Q9 -150 20 -137Q15 -99 20 -70"+
    "Q23 -43 30 -29Q18 -20 6 -34Q-3 -61 -6 -90Z",
    box(-17,-160,56,151),colors.warm,"anatomy",
    {parentId:"adult-face",outlineOpacity:0,spacing:5});
  wax("nose-sidewall",
    "M-7 -100Q-14 -75 -19 -53Q-29 -39 -18 -30"+
    "Q-6 -38 -1 -58Z",
    box(-34,-111,43,92),colors.cool,"anatomy",
    {parentId:"adult-face",coverage:"open",pressure:.56,spacing:7.5,outlineOpacity:0,edgeRoughness:0});
  wax("nose-alar-wing",
    "M32 -40Q52 -51 61 -29Q60 -10 40 -14"+
    "Q28 -8 17 -21Q18 -31 32 -40Z",
    box(11,-58,59,61),colors.flesh,"anatomy",
    {parentId:"adult-face",outlineOpacity:.04,spacing:4});
  ink("nostril-underplane",
    "M17 -23Q30 -10 40 -21M44 -22Q52 -31 56 -22",
    "#734957",1.85,"detail",{parentId:"adult-face"});
  ink("nasolabial-transition",
    "M60 -11Q73 7 63 25M-18 -3Q-26 14 -15 27",
    "#a76e71",1.12,"detail",{parentId:"adult-face",opacity:.72});
  wax("lip-upper-volume",
    "M-23 42Q-8 34 5 37Q16 29 29 36"+
    "Q44 31 51 41Q27 51 7 49Q-8 53 -23 42Z",
    box(-32,23,92,39),colors.lip,"anatomy",
    {parentId:"adult-face",spacing:4.2,outlineOpacity:0});
  wax("lip-lower-volume",
    "M-15 51Q7 56 30 49Q41 53 38 62"+
    "Q23 71 6 67Q-8 65 -15 51Z",
    box(-22,44,69,36),colors.cheek,"anatomy",
    {parentId:"adult-face",spacing:4.5,outlineOpacity:0});
  ink("mouth-commissures",
    "M-25 43Q-9 52 7 48Q25 53 50 41",
    "#714b58",1.95,"detail",{parentId:"adult-face"});
  ink("philtrum-column",
    "M2 14Q3 30 6 33M22 9Q23 23 21 31",
    "#c28b79",1.05,"detail",{parentId:"adult-face"});
  ink("chin-silhouette-light",
    "M-12 84Q13 96 36 80",
    "#d5aaa1",1.55,"detail",{parentId:"adult-face"});
  // Independent eyelid/sclera/iris systems; lid shadows lie over irises.
  wax("left-eye-aperture",
    "M-87 -164Q-64 -177 -38 -168Q-24 -161 -15 -147"+
    "Q-36 -131 -61 -141Q-80 -146 -87 -164Z",
    box(-94,-184,89,62),colors.sclera,"anatomy",
    {parentId:"adult-face",spacing:4,outlineOpacity:.12,
      timing:{start:133,end:187}});
  wax("right-eye-aperture",
    "M45 -163Q67 -178 93 -160Q102 -153 102 -142"+
    "Q74 -136 56 -147Z",
    box(35,-188,78,61),colors.sclera,"anatomy",
    {parentId:"adult-face",spacing:4,outlineOpacity:.12,
      timing:{start:133,end:187}});
  wax("left-eye-iris",
    "M-67 -168Q-53 -178 -46 -164Q-43 -147 -52 -143"+
    "Q-65 -146 -67 -168Z",
    box(-75,-184,38,52),colors.iris,"anatomy",
    {parentId:"adult-face",spacing:4.2,outlineOpacity:0,
      timing:{start:169,end:229}});
  wax("right-eye-iris",
    "M68 -165Q80 -177 87 -162Q92 -147 82 -144"+
    "Q70 -144 68 -165Z",
    box(61,-182,39,51),colors.iris,"anatomy",
    {parentId:"adult-face",spacing:4.2,outlineOpacity:0,
      timing:{start:169,end:229}});
  wax("left-eye-pupil","M-57 -165Q-52 -170 -49 -162Q-48 -155 -54 -153Z",
    box(-62,-174,20,30),colors.pupil,"anatomy",
    {parentId:"adult-face",spacing:4,outlineOpacity:0,
      timing:{start:198,end:246}});
  wax("right-eye-pupil","M76 -163Q81 -167 84 -160Q85 -153 79 -151Z",
    box(72,-171,18,30),colors.pupil,"anatomy",
    {parentId:"adult-face",spacing:4,outlineOpacity:0,
      timing:{start:198,end:246}});
  wax("left-upper-lid",
    "M-91 -167Q-64 -184 -38 -173Q-15 -164 -12 -150"+
    "Q-36 -162 -58 -163Q-77 -162 -91 -155Z",
    box(-100,-193,103,50),colors.socket,"anatomy",
    {parentId:"adult-face",spacing:4,outlineOpacity:0,
      timing:{start:159,end:216}});
  wax("right-upper-lid",
    "M43 -169Q68 -185 97 -165Q109 -158 109 -146"+
    "Q83 -163 64 -162Q52 -158 43 -151Z",
    box(35,-193,87,54),colors.cool,"anatomy",
    {parentId:"adult-face",spacing:4,outlineOpacity:0,
      timing:{start:159,end:216}});
  ink("upper-lid-rim-left","M-88 -164Q-61 -185 -38 -171Q-22 -164 -11 -150",
    "#51424a",2.35,"detail",{parentId:"adult-face"});
  ink("upper-lid-rim-right","M44 -165Q66 -180 92 -165Q104 -154 107 -145",
    "#57464f",2.0,"detail",{parentId:"adult-face"});
  ink("lower-lid-rim-left","M-83 -154Q-61 -134 -37 -143Q-23 -147 -16 -153",
    "#af8580",1.28,"detail",{parentId:"adult-face"});
  ink("lower-lid-rim-right","M46 -150Q72 -134 104 -146",
    "#a0807f",1.23,"detail",{parentId:"adult-face"});
  ink("left-tear-duct","M-90 -158Q-84 -151 -77 -154",
    "#a97772",1.5,"detail",{parentId:"adult-face"});
  ink("right-tear-duct","M44 -157Q50 -150 55 -155",
    "#af7671",1.23,"detail",{parentId:"adult-face"});
  ink("brow-structure-left",
    "M-96 -195Q-71 -217 -34 -194",
    "#503f45",3.7,"detail",{parentId:"adult-face"});
  ink("brow-structure-right",
    "M39 -198Q69 -216 108 -185",
    "#5a4147",3.2,"detail",{parentId:"adult-face"});
  ink("iris-catchlights",
    "M-57 -170l2 -2M77 -169l2 -2",
    "#f5e7d0",1.5,"detail",{parentId:"adult-face"});
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
  hair("rooted-crown-direction","hair-crown-part",
    [{x:-119,y:-228},{x:-113,y:-290},{x:-18,y:-324},{x:87,y:-269}],
    610,124,"#c4a087");
  hair("rooted-temple-direction","hair-temple-lock",
    [{x:-112,y:-215},{x:-141,y:-162},{x:-136,y:-96},{x:-111,y:-37}],
    611,115,"#c6a080");
  hair("rooted-far-wave","hair-far-wave",
    [{x:49,y:-286},{x:126,y:-289},{x:151,y:-180},{x:129,y:-84}],
    612,118,"#b58c78");
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
  wax("shirt-linen","M-58 145Q-29 161 6 176Q37 159 67 143"+
    "L54 290Q22 303 -29 292Z",
    box(-69,130,145,179),colors.silk,"anatomy",
    {parentId:"coat-silhouette",spacing:6.9,outlineOpacity:0});
  ink("coat-fold-seams",
    "M-150 142Q-108 184 -91 253M71 141Q101 163 132 165"+
    "M-101 262Q-106 285 -115 315M75 268Q84 296 85 318",
    "#a6aca9",1.8,"detail",{parentId:"coat-silhouette"});
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
  return {version:1,id:"crayon-artcraft-adult-face-"+aspect,
    width:W,height:H,durationFrames:300,seed:6812,
    paper:"#f8efe0",paperTooth:.8,elements,
    camera:[{frame:0,focusX:W/2,focusY:H/2,zoom:1},
      {frame:299,focusX:W/2,focusY:H/2,zoom:1}]};
}
