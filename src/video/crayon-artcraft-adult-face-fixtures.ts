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
  noseShade:["#c79c8b","#a67e7b","#e6bda6"] as const,
  scarf:["#aa6a5e","#724f59","#d5a082"] as const,
  scarfShadow:["#845251","#5d434b","#bc7a68"] as const,
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
  "tailored-scarf-wrap","tailored-scarf-tail",
  "nose-tip-underpaint","cheek-warm-pigment","tear-trough-value",
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
  const rootX=portrait?270:480,rootY=portrait?435:268,rootScale=portrait?1.24:.73;
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
      spacing:9,markStrength:.78,outlineOpacity:0});
  wax("neck-under-jaw",
    "M-36 56Q-39 100 -74 122Q-42 146 11 147"+
    "Q59 139 85 117Q49 95 42 55Z",
    box(-87,46,180,113),colors.neck,"base",
    {parentId:"coat-silhouette",outlineOpacity:0});
  wax("hair-back",
    "M-132 -177C-156 -243 -127 -304 -54 -323"+
    "Q-3 -344 55 -314Q124 -310 147 -238"+
    "Q162 -210 148 -181Q179 -135 151 -83"+
    "Q135 -50 143 -8Q150 44 112 92"+
    "Q125 45 104 13Q81 0 58 -17"+
    "Q-28 42 -108 14Q-147 -22 -149 -89"+
    "Q-170 -132 -132 -177Z",
    box(-183,-350,364,451),colors.hair,"base",
    {parentId:"adult-face",edgeRoughness:.6,markStrength:.62,outlineOpacity:.06});
  // Adult 3/4 head: forehead broad, asymmetrical lower jaw, chin displaced
  // toward the viewer's right; substantially taller than the old child mask.
  wax("adult-face",
    "M-96 -203Q-77 -274 -10 -288C61 -304 110 -261 124 -197"+
    "Q131 -148 114 -105Q120 -57 91 4Q75 54 31 100"+
    "Q-3 117 -41 89C-81 58 -90 12 -103 -45"+
    "Q-130 -119 -96 -203Z",
    box(-137,-312,272,446),colors.flesh,"value",
    {parentId:"neck-under-jaw",spacing:9.8,markStrength:.2,outlineOpacity:.07,
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
    "M32 -40Q52 -51 61 -29Q60 -10 40 -14"+
    "Q28 -8 17 -21Q18 -31 32 -40Z",
    box(11,-58,59,61),colors.flesh,"anatomy",
    {parentId:"adult-face",markStrength:.27,outlineOpacity:.02,spacing:7});
  wax("nose-tip-reflected-wax",
    "M12 -41Q25 -52 41 -41Q44 -33 32 -26"+
    "Q17 -29 12 -41Z",
    box(6,-57,44,39),colors.warm,"anatomy",
    {parentId:"adult-face",coverage:"open",clipToParent:true,
      blendRadius:5,markStrength:.12,pressure:.34,spacing:12,
      outlineOpacity:0,edgeRoughness:0});
  ink("nose-dorsal-soft-edge",
    "M7 -103Q9 -81 14 -61M17 -49Q21 -40 25 -39",
    "#b48775",1.25,"detail",{parentId:"adult-face",opacity:.68});
  ink("nose-alar-undercut",
    "M22 -23Q28 -18 35 -20M39 -26Q45 -31 51 -27",
    "#a4716c",1.15,"detail",{parentId:"adult-face",opacity:.69});
  // Anatomical tip and glabella: diffuse color, not a hard nose triangle.
  // These follow the existing forehead/dorsum underpainting and cannot leak
  // out of the continuous adult facial silhouette.
  wax("nose-tip-underpaint",
    "M8 -35Q21 -48 36 -41Q48 -32 37 -23"+
    "Q28 -20 15 -24Q11 -28 8 -35Z",
    box(2,-55,52,44),colors.noseShade,"anatomy",
    {parentId:"adult-face",coverage:"open",clipToParent:true,
      blendRadius:4,markStrength:.15,pressure:.47,spacing:11,
      outlineOpacity:0,edgeRoughness:0});
  wax("nose-root-sunlight",
    "M1 -122Q11 -132 19 -116Q15 -91 18 -70"+
    "Q19 -58 17 -51Q7 -73 1 -122Z",
    box(-6,-138,35,93),colors.warm,"anatomy",
    {parentId:"adult-face",coverage:"open",clipToParent:true,
      blendRadius:6,markStrength:.09,pressure:.38,spacing:13,
      outlineOpacity:0,edgeRoughness:0});
  ink("nostril-underplane",
    "M14 -27Q19 -22 24 -26M40 -27Q44 -30 48 -29",
    "#865e61",1.08,"detail",{parentId:"adult-face",opacity:.7});
  ink("nasolabial-transition",
    "M58 -4Q66 4 64 12M-6 22Q-10 27 -8 31",
    "#ab7c75",.88,"detail",{parentId:"adult-face",opacity:.42});
  wax("lip-upper-volume",
    "M-18 43Q-6 37 6 38Q15 33 24 36"+
    "Q35 36 43 41Q24 49 8 47Q-4 50 -18 43Z",
    box(-25,30,77,29),colors.lip,"anatomy",
    {parentId:"adult-face",coverage:"open",clipToParent:true,blendRadius:3,
      pressure:.38,markStrength:.17,spacing:9,outlineOpacity:0,edgeRoughness:0});
  wax("lip-lower-volume",
    "M-13 53Q8 57 30 49Q34 58 28 64"+
    "Q9 70 -4 62Q-10 58 -13 53Z",
    box(-20,46,60,29),colors.cheek,"anatomy",
    {parentId:"adult-face",coverage:"open",clipToParent:true,blendRadius:3,
      pressure:.38,markStrength:.17,spacing:9,outlineOpacity:0,edgeRoughness:0});
  ink("mouth-commissures",
    "M-18 45Q-5 49 8 47Q25 50 43 40",
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
    {parentId:"adult-face",markStrength:.42,spacing:4,outlineOpacity:.12,
      timing:{start:133,end:187}});
  wax("right-eye-aperture",
    "M49 -158Q64 -170 79 -161Q87 -157 89 -148"+
    "Q75 -138 59 -146Q52 -149 49 -158Z",
    box(44,-178,51,47),colors.sclera,"anatomy",
    {parentId:"adult-face",markStrength:.42,spacing:4,outlineOpacity:.12,
      timing:{start:133,end:187}});
  wax("left-eye-iris",
    "M-59 -170Q-50 -173 -45 -164Q-42 -152 -49 -145"+
    "Q-57 -146 -59 -158Q-60 -164 -59 -170Z",
    box(-64,-179,26,40),colors.iris,"anatomy",
    {parentId:"adult-face",markStrength:.42,spacing:4.2,outlineOpacity:0,
      timing:{start:169,end:229}});
  wax("right-eye-iris",
    "M66 -164Q75 -169 80 -160Q83 -152 77 -146"+
    "Q70 -145 67 -151Q65 -158 66 -164Z",
    box(61,-176,27,39),colors.iris,"anatomy",
    {parentId:"adult-face",markStrength:.42,spacing:4.2,outlineOpacity:0,
      timing:{start:169,end:229}});
  wax("left-eye-pupil","M-54 -165Q-51 -169 -49 -162Q-48 -156 -52 -153"+
    "Q-55 -156 -54 -165Z",
    box(-58,-172,14,24),colors.pupil,"anatomy",
    {parentId:"adult-face",markStrength:.42,spacing:4,outlineOpacity:0,
      timing:{start:198,end:246}});
  wax("right-eye-pupil","M72 -161Q75 -166 77 -160Q78 -154 74 -153"+
    "Q71 -156 72 -161Z",
    box(69,-169,13,20),colors.pupil,"anatomy",
    {parentId:"adult-face",markStrength:.42,spacing:4,outlineOpacity:0,
      timing:{start:198,end:246}});
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
    "#60484b",2.4,"detail",{parentId:"adult-face"});
  ink("brow-structure-right",
    "M45 -190Q66 -202 99 -184",
    "#614a4d",2.2,"detail",{parentId:"adult-face"});
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
    "M-80 120Q-43 136 0 142Q41 139 78 118"+
    "Q90 132 68 158Q28 182 -17 167Q-58 166 -87 143Z",
    box(-97,107,191,82),colors.scarf,"anatomy",
    {parentId:"coat-silhouette",spacing:5.6,markStrength:.62,
      edgeRoughness:.43,outlineOpacity:.06});
  wax("tailored-scarf-tail",
    "M30 169Q53 187 53 215Q56 248 43 264"+
    "L19 268Q30 236 18 181Z",
    box(9,158,60,127),colors.scarfShadow,"anatomy",
    {parentId:"coat-silhouette",spacing:6,markStrength:.65,
      edgeRoughness:.36,outlineOpacity:.05});
  ink("tailored-scarf-weft",
    "M-80 136Q-25 154 71 133M-78 150Q-11 167 65 147"+
    "M-35 127Q-34 150 -26 163M13 135Q18 159 26 167"+
    "M54 130Q60 148 58 161",
    "#e2ae8d",1.85,"detail",
    {parentId:"tailored-scarf-wrap",clipToParent:true,opacity:.91});
  ink("tailored-scarf-tail-stitch",
    "M25 181Q45 218 36 260M36 178Q51 224 44 249",
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
  return {version:1,id:"crayon-artcraft-adult-face-"+aspect,
    width:W,height:H,durationFrames:300,seed:6812,
    paper:"#f8efe0",paperTooth:.8,elements,
    camera:[{frame:0,focusX:W/2,focusY:H/2,zoom:1},
      {frame:299,focusX:W/2,focusY:H/2,zoom:1}]};
}
