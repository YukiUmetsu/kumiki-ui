import type {CrayonColor,CrayonElement,CrayonMotionKey,CrayonSceneSpec} from "../../registry/video/materials/crayon-scene";
import {crayonFormHatching} from "./crayon-editorial-character-craft";

/**
 * Original, editable CRAYON1 illustration inspired by the user's crayon craft
 * board: a child explorer in a heavy blue wool coat, hand-woven plaid scarf,
 * layered embroidered dress, lace-up leather boots, and windswept hair.
 *
 * Everything here is painted with existing wax/contour primitives. No raster
 * sprite, simulated texture screenshot, or copyrighted character is embedded.
 */
export type CrayonAtelierMode="acting"|"walk"|"draw-in";
export type CrayonAtelierExpression="sequence"|"smile"|"wonder"|"concern";
export interface CrayonAtelierOptions {
  mode?:CrayonAtelierMode;
  expression?:CrayonAtelierExpression;
  detail?:number;
  stride?:number;
  stepLift?:number;
  rig?:"drawn"|"ik";
  order?:"outline-first"|"fill-first";
  outlineFraction?:number;
  glaze?:number;
}

const P={
  navy:["#516d8a","#2f4766","#849ab0"] as const,
  coatLight:["#6983a0","#38516e","#acb5bc"] as const,
  coatDeep:["#38516b","#293f55","#758b9f"] as const,
  dress:["#efe0c6","#c8ac91","#fff1d8"] as const,
  lace:["#fcf0da","#e0c6ac","#fff9e9"] as const,
  skin:["#e8ae89","#bc806d","#f9d0a5"] as const,
  skinLight:["#f0c49f","#cf947c","#ffe3bc"] as const,
  blush:["#ca8075","#b76464","#ecad8e"] as const,
  hair:["#704f46","#412f34","#ba8470"] as const,
  hairLight:["#91604d","#5b3a37","#d5a079"] as const,
  scarf:["#b74d50","#873c4b","#e58c69"] as const,
  scarfShadow:["#85404d","#612d41","#c86757"] as const,
  brass:["#d2a26c","#967451","#f9d3a0"] as const,
  leather:["#825747","#503a39","#b48663"] as const,
  boot:["#74594d","#4b3a3a","#ae8b70"] as const,
  dark:["#453b45","#302e35","#76616a"] as const,
  meadow:["#a1b99d","#819d91","#d4d4ad"] as const,
  light:["#efe3d4","#e5cbb7","#fdf2de"] as const,
} satisfies Record<string,readonly [CrayonColor,CrayonColor,CrayonColor]>;

type Wax=Extract<CrayonElement,{kind:"wax"}>;
type Line=Extract<CrayonElement,{kind:"contour"}>;
type Stage="atmosphere"|"underlay"|"garment"|"skin"|"detail"|"finish";
type Box={x:number;y:number;width:number;height:number};
const bounds=(x:number,y:number,width:number,height:number):Box=>({x,y,width,height});
const isFiniteScale=(n:number,a:number,b:number)=>Number.isFinite(n)&&n>=a&&n<=b;

export function crayonIllustratedChildScene(
  aspect:"landscape"|"portrait", options:CrayonAtelierOptions={},
):CrayonSceneSpec {
  const mode=options.mode??"acting",expression=options.expression??"sequence";
  const detail=options.detail??1,stride=options.stride??1,stepLift=options.stepLift??1,
    rig=options.rig??"drawn",order=options.order??"outline-first",
    outlineFraction=options.outlineFraction??.31,glaze=options.glaze??.17;
  if(!["acting","walk","draw-in"].includes(mode)||
    !["sequence","smile","wonder","concern"].includes(expression)||
    !isFiniteScale(detail,0,1)||!isFiniteScale(stride,.6,1.6)||
    !isFiniteScale(stepLift,.6,1.8)||!["drawn","ik"].includes(rig)||
    !["outline-first","fill-first"].includes(order)||
    !isFiniteScale(outlineFraction,.1,.75)||!isFiniteScale(glaze,0,.45))
    throw new RangeError("Invalid crayon illustrated character options");

  const portrait=aspect==="portrait",W=portrait?540:960,H=portrait?960:540;
  const durationFrames=mode==="draw-in"?450:270;
  const ox=portrait?277:674,oy=portrait?547:303,scale=portrait?1.14:.965;
  const walk=mode==="walk";
  const draw=mode==="draw-in";
  const times:Record<Stage,readonly [number,number]>=draw?{
    atmosphere:[138,343],underlay:[35,203],garment:[150,324],
    skin:[207,352],detail:[280,418],finish:[335,440],
  }:{
    atmosphere:[4,96],underlay:[14,100],garment:[31,128],
    skin:[47,141],detail:[83,181],finish:[126,219],
  };
  const build=draw?{order,outlineFraction,glaze}:undefined;
  const elements:CrayonElement[]=[];
  const wax=(id:string,d:string,rect:Box,colors:readonly [CrayonColor,CrayonColor,CrayonColor],
    stage:Stage,opts:Partial<Wax>={})=>{
    elements.push({kind:"wax",id,d,bounds:rect,colors,timing:{start:times[stage][0],end:times[stage][1]},
      coverage:"opaque",nibStyle:"tapered",strokeOrder:"patches",markLength:"long",
      pressure:.89,spacing:6.5,edgeRoughness:.22,outlineOpacity:.25,
      construction:build,...opts});
  };
  const line=(id:string,d:string,color:CrayonColor,width:number,stage:Stage,
    opts:Partial<Line>={})=>{
    elements.push({kind:"contour",id,d,color,width,
      timing:{start:times[stage][0],end:times[stage][1]},opacity:.91,...opts});
  };
  const hatch=(id:string,parentId:string,rect:{cx:number;cy:number;rx:number;ry:number},
    color:CrayonColor,count:number,angle:number,stage:Stage,seed:number)=>{
    const d=crayonFormHatching({...rect,seed,angle,
      count:Math.round(count*detail),length:angle===90?6.3:9.8,curvature:.35});
    if(d)line(id,d,color,.7,stage,{parentId,clipToParent:true,opacity:.52});
  };
  const txt=(id:string,lines:readonly string[],x:number,y:number,size:number,start:number,end:number,
    color:CrayonColor="#4b4a59")=>{
    elements.push({kind:"lettering",id,lines,x,y,fontSize:size,color,
      family:"serif",weight:700,screenSpace:true,timing:{start,end}});
  };

  // The faint distant atmosphere is translucent; the protagonist never is.
  wax("paper-distant-hills","M0 "+(H*.78)+" Q"+(W*.18)+" "+(H*.7)+" "+(W*.42)+" "+(H*.78)+
      " T"+W+" "+(H*.74)+" V"+H+"H0Z",
    bounds(0,H*.68,W,H*.32),P.meadow,"atmosphere",
    {coverage:"open",pressure:.36,spacing:14,outlineOpacity:0});
  wax("soft-cloud","M"+(W*.45)+" "+(H*.22)+"q-25 -21 -57 3q-35 -17 -49 19q-6 25 38 29h90q41 -12 24 -32Z",
    bounds(W*.35,H*.16,170,97),P.light,"atmosphere",
    {coverage:"open",pressure:.35,spacing:12,outlineOpacity:0});
  wax("ground-shadow","M"+(ox-115)+" "+(oy+215*scale)+"q110 -30 232 -3q20 19 -27 20h-185q-37 -5 -20 -17Z",
    bounds(ox-125,oy+193*scale,250,45),P.leather,"underlay",
    {coverage:"open",pressure:.22,spacing:14,outlineOpacity:0});
  // Body movement is a child-friendly offset with weighted squash and head
  // anticipation, never a substitute for the actual garment/body silhouette.
  const bodyMotion:readonly CrayonMotionKey[]=walk?[
    {frame:0,x:-73*stride,y:0},{frame:40,x:-73*stride,y:0},
    {frame:78,x:-38*stride,y:-7*stepLift,rotate:-2},
    {frame:105,x:-14*stride,y:0},{frame:145,x:17*stride,y:-8*stepLift,rotate:2},
    {frame:179,x:36*stride,y:0},{frame:220,x:66*stride,y:-6*stepLift},
    {frame:269,x:66*stride,y:0},
  ]:draw?[
    {frame:0,x:0,y:0},{frame:365,x:0,y:0},
    {frame:393,x:0,y:-4,rotate:-1},{frame:424,x:0,y:0,rotate:1},
    {frame:449,x:0,y:0},
  ]:[
    {frame:0,x:0,y:0},{frame:66,x:0,y:2,scaleY:.992},
    {frame:94,x:0,y:-4,rotate:-1},{frame:146,x:0,y:0,rotate:1.2},
    {frame:187,x:0,y:-3},{frame:234,x:0,y:0},{frame:269,x:0,y:0},
  ];
  const headMotion:readonly CrayonMotionKey[]=draw?[
    {frame:0,x:0,y:0},{frame:368,x:0,y:0},
    {frame:408,x:0,y:-2,rotate:3},{frame:449,x:0,y:0,rotate:0},
  ]:[
    {frame:0,x:0,y:0},{frame:61,x:0,y:0,rotate:-3},
    {frame:113,x:0,y:-2,rotate:5},{frame:171,x:0,y:0,rotate:-3},
    {frame:234,x:0,y:0,rotate:1},{frame:269,x:0,y:0,rotate:0},
  ];
  const armMotion:readonly CrayonMotionKey[]=draw?[
    {frame:0,x:0,y:0},{frame:380,x:0,y:0},
    {frame:417,x:0,y:0,rotate:-14},{frame:449,x:0,y:0},
  ]:[
    {frame:0,x:0,y:0,rotate:-3},{frame:80,x:0,y:0,rotate:6},
    {frame:127,x:0,y:0,rotate:-15},{frame:167,x:0,y:0,rotate:-8},
    {frame:225,x:0,y:0,rotate:5},{frame:269,x:0,y:0,rotate:-3},
  ];
  const shoeMove=(side:-1|1):readonly CrayonMotionKey[]=>walk?[
    {frame:0,x:0,y:0},{frame:41,x:0,y:0,rotate:side*3},
    {frame:73,x:side*20*stride,y:-18*stepLift,rotate:-side*12},
    {frame:104,x:side*23*stride,y:0},{frame:135,x:-side*11*stride,y:0},
    {frame:162,x:side*12*stride,y:-16*stepLift},
    {frame:188,x:side*17*stride,y:0},{frame:269,x:0,y:0},
  ]:[{frame:0,x:0,y:0},{frame:durationFrames-1,x:0,y:0}];

  // Layer one: overlapping hair, back sleeve, dress, legs. All attached to
  // semantic parents; painter order does not determine rig parentage.
  wax("hair-back","M-88 -149C-110 -176 -92 -216 -48 -224Q-19 -235 5 -220"+
    "Q44 -244 81 -207Q117 -187 107 -134Q128 -89 89 -64Q57 -56 24 -73"+
    "Q-12 -47 -52 -71Q-92 -91 -88 -149Z",
    bounds(-121,-248,254,215),P.hair,"underlay",
    {parentId:"face",spacing:6.6,outlineOpacity:.3,edgeRoughness:.49});
  wax("rear-sleeve","M-59 -70Q-91 -77 -109 -44Q-121 -7 -101 38"+
    "Q-92 51 -78 39L-50 -13Z",
    bounds(-128,-83,83,142),P.coatDeep,"garment",
    {parentId:"coat-body",pivot:{x:-70,y:-59},motion:armMotion});
  wax("dress-skirt","M-44 37Q-10 53 45 39Q61 82 73 143"+
    "Q21 157 -24 143Q-71 148 -81 130Q-69 75 -44 37Z",
    bounds(-93,31,176,135),P.dress,"garment",
    {parentId:"coat-body",outlineOpacity:.18});
  wax("dress-hem-lace","M-80 126Q-51 134 -22 135Q30 143 72 131"+
    "L78 153Q60 162 47 150Q34 164 20 151Q2 168 -15 150"+
    "Q-35 160 -49 147Q-68 161 -84 144Z",
    bounds(-94,121,181,51),P.lace,"detail",
    {parentId:"dress-skirt",spacing:4.9,outlineOpacity:.13});
  wax("stocking-back","M-48 127Q-27 134 -17 130L-20 197Q-31 204 -47 192Z",
    bounds(-57,122,47,88),P.dress,"garment",
    {parentId:"coat-body",spacing:5.5});
  wax("stocking-front","M17 132Q31 138 46 129L49 196Q33 201 18 193Z",
    bounds(8,123,53,83),P.dress,"garment",
    {parentId:"coat-body",spacing:5.5});
  wax("boot-back","M-51 184Q-30 178 -13 186L-7 211Q1 217 -7 227"+
    "H-65Q-78 222 -66 208Z",
    bounds(-79,175,83,62),P.boot,"garment",
    {parentId:"coat-body",pivot:{x:-34,y:191},motion:shoeMove(-1),spacing:5.1});
  wax("boot-front","M14 184Q37 176 54 187L55 209Q78 213 73 225"+
    "Q57 232 8 229Q0 220 13 213Z",
    bounds(-2,175,85,64),P.boot,"garment",
    {parentId:"coat-body",pivot:{x:32,y:192},motion:shoeMove(1),spacing:5.1});

  wax("coat-body","M-48 -69Q-66 -83 -78 -60C-99 -33 -85 39 -75 89"+
    "Q-61 109 -43 113L-20 91Q8 117 34 114Q60 111 70 89"+
    "Q85 8 73 -42Q62 -80 42 -73Q1 -63 -48 -69Z",
    bounds(-100,-89,185,210),P.navy,"underlay",
    {placement:{x:ox,y:oy,scale},motion:bodyMotion,pivot:{x:0,y:36},
      spacing:7.4,outlineOpacity:.26,edgeRoughness:.46});
  wax("shirt-front","M-30 -57Q-9 -35 15 -41L44 -47"+
    "Q43 37 26 94L-22 94Q-38 38 -30 -57Z",
    bounds(-43,-63,98,165),P.dress,"garment",
    {parentId:"coat-body",outlineOpacity:.11});
  wax("coat-left-panel","M-49 -69Q-68 -61 -73 -33Q-83 33 -73 98"+
    "Q-50 106 -24 91L-16 -31Q-26 -56 -49 -69Z",
    bounds(-87,-79,79,193),P.coatLight,"garment",
    {parentId:"coat-body",spacing:7,outlineOpacity:.12});
  wax("coat-right-panel","M25 -61Q50 -85 70 -50Q79 -21 74 18"+
    "Q66 85 54 105Q33 107 15 93L5 -20Z",
    bounds(-4,-91,89,206),P.coatDeep,"garment",
    {parentId:"coat-body",spacing:7,outlineOpacity:.15});
  wax("coat-left-lapel","M-47 -70L-12 -29L-28 16Q-49 -11 -65 -49Z",
    bounds(-70,-76,68,101),P.coatLight,"garment",
    {parentId:"coat-body",spacing:5.8,outlineOpacity:.22});
  wax("coat-right-lapel","M27 -69L3 -26L17 22Q42 -12 52 -49Z",
    bounds(-4,-74,67,109),P.navy,"garment",
    {parentId:"coat-body",spacing:5.8,outlineOpacity:.23});

  // Hair does not consist of a single rigid sticker: roots, ears, jaw,
  // cheek, fringe and individual curved locks remain separate geometry.
  wax("face","M-50 -189Q-69 -186 -79 -159C-92 -136 -79 -101 -58 -83"+
    "Q-32 -60 4 -62Q51 -60 75 -97C96 -125 89 -163 56 -184"+
    "Q16 -205 -21 -198Z",
    bounds(-95,-207,193,154),P.skin,"skin",
    {parentId:"coat-body",pivot:{x:0,y:-83},motion:headMotion,
      spacing:5.9,outlineOpacity:.22,edgeRoughness:.18});
  wax("left-ear","M-77 -144Q-104 -161 -100 -130Q-93 -109 -79 -119Z",
    bounds(-107,-167,36,65),P.skinLight,"skin",
    {parentId:"face",spacing:4.2,outlineOpacity:.22});
  wax("right-ear","M76 -139Q104 -150 99 -123Q93 -112 77 -115Z",
    bounds(70,-156,38,53),P.skinLight,"skin",
    {parentId:"face",spacing:4.2,outlineOpacity:.23});
  wax("jaw-plane","M-61 -119Q-25 -98 12 -105Q51 -110 74 -122"+
    "Q59 -77 23 -70Q-22 -68 -61 -91Z",
    bounds(-67,-132,151,69),P.skinLight,"skin",
    {parentId:"face",spacing:7.3,outlineOpacity:0});
  wax("cheek-left-blush","M-67 -109Q-51 -124 -26 -110Q-20 -93 -42 -85"+
    "Q-63 -86 -67 -109Z",
    bounds(-73,-130,55,50),P.blush,"detail",
    {parentId:"face",coverage:"open",pressure:.4,spacing:9.4,outlineOpacity:0});
  wax("cheek-right-blush","M41 -108Q56 -117 73 -108Q76 -90 56 -86"+
    "Q41 -91 41 -108Z",
    bounds(35,-125,47,48),P.blush,"detail",
    {parentId:"face",coverage:"open",pressure:.37,spacing:9,outlineOpacity:0});
  // Slightly asymmetrical orbital architecture, not circular googly eyes.
  wax("eye-left-sclera","M-52 -138Q-32 -155 -13 -137Q-30 -120 -52 -138Z",
    bounds(-58,-158,51,45),P.lace,"skin",
    {parentId:"face",spacing:4.7,outlineOpacity:.3});
  wax("eye-right-sclera","M24 -135Q44 -148 61 -130Q45 -115 24 -135Z",
    bounds(19,-152,50,43),P.lace,"skin",
    {parentId:"face",spacing:4.7,outlineOpacity:.3});
  wax("eye-left-iris","M-40 -139Q-26 -152 -20 -138Q-19 -125 -30 -126Z",
    bounds(-45,-153,31,32),P.leather,"skin",
    {parentId:"face",spacing:4.4,outlineOpacity:.13});
  wax("eye-right-iris","M36 -136Q49 -145 55 -130Q53 -118 43 -121Z",
    bounds(32,-150,28,34),P.leather,"skin",
    {parentId:"face",spacing:4.4,outlineOpacity:.13});
  wax("eye-left-pupil","M-32 -141Q-25 -141 -24 -132Q-25 -128 -32 -130Z",
    bounds(-37,-146,18,24),P.dark,"skin",
    {parentId:"face",spacing:4.2,outlineOpacity:0});
  wax("eye-right-pupil","M43 -138Q50 -137 50 -129Q48 -124 44 -127Z",
    bounds(38,-144,17,23),P.dark,"skin",
    {parentId:"face",spacing:4.2,outlineOpacity:0});
  // Dense skin-colour blink paint is above irises, not a transparent outline.
  // The open state is a microscopic mark; the closed frame blocks both eyes.
  const blinkL="M-52 -140Q-32 -153 -11 -136Q-28 -119 -52 -140Z";
  const blinkR="M23 -135Q43 -149 62 -131Q44 -114 23 -135Z";
  const blinkFrames=draw?[{frame:418,d:blinkL,bounds:bounds(-58,-158,51,45)},
    {frame:426,d:"M-53 -137l1 0.1 -1 0Z",bounds:bounds(-54,-138,4,4)}]:
    [{frame:97,d:blinkL,bounds:bounds(-58,-158,51,45)},
    {frame:104,d:"M-53 -137l1 0.1 -1 0Z",bounds:bounds(-54,-138,4,4)},
    {frame:185,d:blinkL,bounds:bounds(-58,-158,51,45)},
    {frame:193,d:"M-53 -137l1 0.1 -1 0Z",bounds:bounds(-54,-138,4,4)}];
  wax("eye-left-blink-wax","M-53 -137l1 0.1 -1 0Z",bounds(-54,-138,4,4),
    P.skinLight,"underlay",{parentId:"face",spacing:4.2,
      pressure:.98,outlineOpacity:0,edgeRoughness:0,
      timing:{start:0,end:16},drawings:blinkFrames});
  wax("eye-right-blink-wax","M23 -134l1 0.1 -1 0Z",bounds(22,-135,4,4),
    P.skinLight,"underlay",{parentId:"face",spacing:4.2,
      pressure:.98,outlineOpacity:0,edgeRoughness:0,
      timing:{start:0,end:16},
      drawings:blinkFrames.map(k=>({...k,
        d:k.d===blinkL?blinkR:"M23 -134l1 0.1 -1 0Z",
        bounds:k.d===blinkL?bounds(19,-152,50,43):bounds(22,-135,4,4)}))});
  // Hair foreground: locks have distinct flow and rooted occlusion.
  wax("hair-fringe-left","M-77 -174Q-74 -221 -34 -220"+
    "Q-20 -210 1 -212Q-16 -186 -50 -172"+
    "Q-63 -150 -76 -138Q-87 -153 -77 -174Z",
    bounds(-90,-229,100,100),P.hair,"skin",
    {parentId:"face",spacing:5.2,edgeRoughness:.6,outlineOpacity:.16});
  wax("hair-fringe-right","M-30 -210Q8 -237 52 -207Q75 -193 81 -172"+
    "Q78 -149 55 -150Q46 -175 25 -177Q-7 -173 -18 -161"+
    "Q-15 -184 -30 -210Z",
    bounds(-41,-240,132,94),P.hairLight,"skin",
    {parentId:"face",spacing:5.3,edgeRoughness:.46,outlineOpacity:.13});
  wax("hair-temple-curl","M-76 -161Q-107 -146 -96 -111Q-83 -85 -65 -97"+
    "Q-87 -101 -80 -122Q-64 -138 -76 -161Z",
    bounds(-112,-167,60,79),P.hairLight,"skin",
    {parentId:"face",spacing:5,edgeRoughness:.59,outlineOpacity:.12});
  wax("hair-right-curl","M76 -167Q105 -162 109 -139Q115 -104 94 -91"+
    "Q83 -86 76 -99Q100 -119 87 -142Z",
    bounds(68,-171,53,91),P.hair,"skin",
    {parentId:"face",spacing:5.1,edgeRoughness:.52,outlineOpacity:.14});

  // Tail of red scarf is drawn below the wrap but above the coat body.
  wax("scarf-tail","M-53 -50Q-84 -42 -95 -13Q-119 31 -153 39"+
    "Q-134 61 -102 45Q-68 31 -47 -6Z",
    bounds(-163,-58,127,127),P.scarfShadow,"garment",
    {parentId:"coat-body",pivot:{x:-54,y:-52},
      motion:[{frame:0,x:0,y:0,rotate:-4},
        {frame:97,x:0,y:0,rotate:4},
        {frame:173,x:0,y:0,rotate:-5},
        {frame:269,x:0,y:0,rotate:0}],
      motionLagFrames:4,spacing:5.8,edgeRoughness:.43});
  wax("scarf-wrap","M-64 -72Q-48 -59 -14 -63Q20 -62 60 -76"+
    "Q84 -57 62 -39Q27 -20 -9 -30Q-44 -21 -68 -44Z",
    bounds(-78,-83,154,70),P.scarf,"garment",
    {parentId:"coat-body",spacing:5.4,edgeRoughness:.43,outlineOpacity:.22});
  wax("scarf-fold-highlight","M-53 -65Q-12 -46 27 -53Q53 -63 64 -62"+
    "Q50 -42 16 -43Q-23 -38 -53 -53Z",
    bounds(-60,-73,131,42),P.scarfShadow,"detail",
    {parentId:"scarf-wrap",spacing:4.8,outlineOpacity:0});
  wax("front-sleeve","M59 -65Q88 -67 97 -39Q112 -8 94 46"+
    "Q82 59 65 44L44 2Z",
    bounds(35,-78,86,141),P.coatLight,"garment",
    {parentId:"coat-body",pivot:{x:60,y:-56},motion:armMotion,
      spacing:6.1,outlineOpacity:.25});
  wax("cuff-front","M75 31Q90 40 103 34L99 57Q85 64 70 51Z",
    bounds(64,25,51,45),P.coatDeep,"detail",
    {parentId:"front-sleeve",spacing:4.5});
  wax("mitten-front","M78 52Q87 42 98 56Q110 54 109 68Q104 86 87 86"+
    "Q70 80 78 52Z",
    bounds(68,38,50,55),P.leather,"detail",
    {parentId:"front-sleeve",spacing:4.3,outlineOpacity:.13});
  wax("satchel-body","M-120 37Q-93 31 -60 46L-58 110"+
    "Q-93 128 -130 108L-134 59Z",
    bounds(-142,25,92,113),P.leather,"garment",
    {parentId:"coat-body",spacing:6.1,edgeRoughness:.27,outlineOpacity:.29});
  wax("satchel-flap","M-130 55Q-95 39 -59 53L-66 75"+
    "Q-100 87 -131 72Z",
    bounds(-139,33,91,63),P.boot,"detail",
    {parentId:"satchel-body",spacing:4.9,outlineOpacity:.26});
  wax("satchel-clasp","M-99 71Q-91 68 -86 73L-87 84Q-96 91 -102 83Z",
    bounds(-105,63,24,34),P.brass,"detail",
    {parentId:"satchel-body",spacing:4.1,outlineOpacity:.19});
  // A small visible gloved hand grips the satchel strap; thumb and fingers
  // are not fused into a single round blob.
  wax("hand-back","M-105 24Q-119 34 -115 44Q-108 55 -96 47"+
    "Q-88 44 -90 35Q-96 26 -105 24Z",
    bounds(-126,17,42,45),P.skinLight,"detail",
    {parentId:"rear-sleeve",spacing:4.3,outlineOpacity:.18});

  // Deliberate cloth construction and line-weight hierarchy.
  line("coat-center-placket","M-11 -19Q-17 21 -18 90","#c7b0a1",1.4,"detail",
    {parentId:"coat-body",opacity:.87});
  line("left-lapel-fold","M-59 -52Q-42 -29 -29 -11L-36 14","#c1b8b5",1.45,"detail",
    {parentId:"coat-left-lapel"});
  line("right-lapel-fold","M47 -51Q34 -20 20 1L25 21","#afc0c2",1.3,"detail",
    {parentId:"coat-right-lapel"});
  line("coat-hem-seam","M-74 90Q-52 104 -25 91M18 97Q45 108 63 90",
    "#b2b9c2",1.4,"detail",{parentId:"coat-body",opacity:.76});
  line("coat-left-pocket","M-59 44Q-43 48 -27 42L-31 72Q-46 80 -60 69Z",
    "#a4b5bd",1.5,"detail",{parentId:"coat-left-panel",opacity:.8});
  line("coat-right-pocket","M33 50Q50 54 63 47L61 77Q46 83 35 74Z",
    "#a4aeb8",1.5,"detail",{parentId:"coat-right-panel",opacity:.81});
  line("coat-button-rims","M-5 9a5 6 0 1 0 10 0a5 6 0 1 0 -10 0"+
    "M-5 39a5 6 0 1 0 10 0a5 6 0 1 0 -10 0"+
    "M-5 70a5 6 0 1 0 10 0a5 6 0 1 0 -10 0",
    "#daa56a",2.3,"finish",{parentId:"coat-body"});
  line("coat-button-thread","M-2 5L2 13M2 5L-2 13M-2 35L2 43M2 35L-2 43"+
    "M-2 66L2 74M2 66L-2 74",
    "#6b4b46",1,"finish",{parentId:"coat-body",opacity:.75});
  line("coat-pocket-stitch","M-56 47L-56 66Q-45 72 -35 66M38 53L39 69Q48 76 58 70",
    "#d0c0ac",.95,"finish",{parentId:"coat-body",opacity:.87});
  line("dress-pleats","M-32 102Q-49 130 -51 140M-8 104Q-12 126 -16 143"+
    "M20 103Q26 130 31 147M43 99Q57 127 61 141",
    "#c6a98e",1.45,"detail",{parentId:"dress-skirt",opacity:.8});
  line("hem-embroidered-flora","M-44 142q3 -8 7 0q3 -7 7 0"+
    "M-1 150q3 -8 7 0q3 -7 7 0M41 147q4 -8 8 0q4 -7 7 0",
    "#ad765e",1.4,"finish",{parentId:"dress-hem-lace",opacity:.79});
  line("boot-left-lacing","M-40 186L-25 207M-25 185L-44 207"+
    "M-43 191L-26 197M-42 200L-26 204",
    "#d7af87",1.7,"finish",{parentId:"boot-back"});
  line("boot-right-lacing","M29 188L43 207M43 187L29 206"+
    "M29 193L42 199M29 200L42 205",
    "#d7af87",1.7,"finish",{parentId:"boot-front"});
  line("boot-soles","M-66 224Q-31 233 -8 224M8 227Q46 236 72 223",
    "#463536",3.1,"finish",{parentId:"coat-body"});
  line("satchel-edge-stitch","M-126 82L-124 107Q-89 124 -64 107L-64 80",
    "#d8b48a",1.05,"finish",{parentId:"satchel-body",opacity:.75});
  line("satchel-strap","M-85 38Q-43 -31 41 -48",
    "#8f5a43",5.2,"garment",{parentId:"coat-body",opacity:.97});
  line("satchel-strap-stitch","M-84 38Q-42 -27 40 -44",
    "#d4ab83",1.1,"finish",{parentId:"coat-body",opacity:.9});
  line("mitten-thumb","M81 66Q88 69 92 62M90 72Q101 73 103 65",
    "#b7896c",1.4,"finish",{parentId:"mitten-front"});

  // Plaid remains attached to moving scarf cloth and is physically cropped
  // to its silhouette, rather than being a global checkerboard overlay.
  line("scarf-plaid-weft","M-67 -55Q0 -46 71 -62"+
    "M-65 -47Q0 -38 70 -53M-68 -69Q-1 -56 58 -73",
    "#e4a66e",2.5,"finish",
    {parentId:"scarf-wrap",clipToParent:true,opacity:.87});
  line("scarf-plaid-warp","M-49 -83Q-42 -45 -40 -21M-21 -85Q-12 -44 -9 -21"+
    "M12 -85Q17 -46 22 -20M45 -88Q52 -46 54 -20",
    "#e7a66f",2.15,"finish",
    {parentId:"scarf-wrap",clipToParent:true,opacity:.9});
  line("scarf-tail-tartan","M-140 15Q-112 29 -72 12"+
    "M-144 30Q-109 43 -63 19M-118 -9Q-96 15 -91 50"+
    "M-91 -19Q-82 7 -69 37",
    "#e8a77d",2.15,"finish",
    {parentId:"scarf-tail",clipToParent:true,opacity:.84});
  line("scarf-tassels","M-140 45l-15 10M-131 49l-11 14M-121 51l-5 14",
    "#9b4d50",1.9,"finish",{parentId:"scarf-tail"});
  // Form-following marks work with wax opacity instead of punching holes.
  hatch("coat-wool-direction","coat-left-panel",{cx:-48,cy:31,rx:26,ry:70},
    "#c7b6ab",125,70,"detail",1001);
  hatch("coat-wool-shadow","coat-right-panel",{cx:43,cy:30,rx:23,ry:65},
    "#a7b3ad",110,114,"detail",1002);
  hatch("scarf-crayon-weave","scarf-wrap",{cx:0,cy:-51,rx:57,ry:18},
    "#f5ba86",70,10,"finish",1003);
  hatch("hair-crown-strands","hair-fringe-left",{cx:-43,cy:-192,rx:30,ry:23},
    "#d4a17b",71,138,"finish",1004);
  hatch("hair-side-locks","hair-fringe-right",{cx:47,cy:-194,rx:33,ry:25},
    "#d8a884",72,53,"finish",1005);
  hatch("cheek-soft-grain","face",{cx:-44,cy:-112,rx:19,ry:13},
    "#a56d67",36,34,"finish",1006);
  hatch("face-sunlit-grain","face",{cx:46,cy:-103,rx:17,ry:12},
    "#f6d6ad",29,-30,"finish",1007);
  hatch("skirt-wax-pleats","dress-skirt",{cx:3,cy:112,rx:45,ry:33},
    "#d9b89b",65,78,"finish",1008);
  hatch("boot-scuffed-wax","boot-front",{cx:34,cy:211,rx:30,ry:12},
    "#d4ab8b",35,13,"finish",1009);
  line("fringe-brushed-curls","M-78 -175Q-66 -207 -41 -213"+
    "M-48 -207Q-13 -220 2 -210M-8 -207Q11 -191 -8 -177"+
    "M22 -215Q50 -214 71 -183M57 -197Q80 -169 79 -145",
    "#e5b18c",1.4,"finish",{parentId:"face",opacity:.91});
  line("hair-loose-tendrils","M-80 -149Q-110 -116 -94 -94"+
    "M93 -154Q119 -125 101 -99M-55 -208Q-77 -217 -91 -204",
    "#63433f",1.6,"finish",{parentId:"face",opacity:.92});
  line("ear-architecture","M-94 -144Q-88 -132 -87 -125M92 -137Q87 -123 84 -120",
    "#b78170",1.2,"finish",{parentId:"face",opacity:.71});

  const cues=expression==="sequence"&&!draw?[
    {frame:0,pose:"base"},{frame:70,pose:"wonder"},
    {frame:110,pose:"base"},{frame:142,pose:"smile"},
    {frame:215,pose:"concern"},{frame:244,pose:"smile"},
  ]:expression==="sequence"&&draw?[
    {frame:0,pose:"base"},{frame:390,pose:"wonder"},
    {frame:415,pose:"smile"},{frame:449,pose:"smile"},
  ]:[{frame:0,pose:expression}];
  line("left-upper-lid","M-54 -140Q-33 -157 -11 -137",
    "#594347",2.3,"finish",{parentId:"face"});
  line("right-upper-lid","M23 -137Q44 -152 64 -132",
    "#594347",2.3,"finish",{parentId:"face"});
  line("lower-lids","M-50 -134Q-32 -117 -15 -134"+
    "M26 -129Q44 -113 60 -127",
    "#ae756e",1.25,"finish",{parentId:"face",opacity:.72});
  line("eyebrow-left","M-54 -158Q-35 -171 -12 -156",
    "#624744",2.8,"finish",{parentId:"face",poseCadence:2,poseCues:cues,
      poses:[{id:"smile",d:"M-54 -157Q-31 -168 -12 -153"},
        {id:"wonder",d:"M-54 -167Q-31 -181 -12 -168"},
        {id:"concern",d:"M-54 -157Q-32 -161 -12 -170"}]});
  line("eyebrow-right","M26 -153Q45 -166 64 -146",
    "#624744",2.7,"finish",{parentId:"face",poseCadence:2,poseCues:cues,
      poses:[{id:"smile",d:"M26 -153Q46 -165 64 -149"},
        {id:"wonder",d:"M26 -164Q46 -179 65 -160"},
        {id:"concern",d:"M26 -169Q46 -163 64 -153"}]});
  line("nose-bridge","M3 -131Q-1 -110 -3 -105Q2 -97 11 -102",
    "#a47069",1.6,"finish",{parentId:"face",opacity:.79});
  line("nose-warm-tip","M2 -101Q9 -97 14 -104",
    "#c6846f",1.7,"finish",{parentId:"face",opacity:.9});
  line("mouth-expression","M-8 -88Q10 -75 32 -89",
    "#7d4e53",2.25,"finish",{parentId:"face",poseCadence:2,poseCues:cues,
      poses:[{id:"smile",d:"M-11 -89Q8 -67 35 -90M0 -83Q17 -77 25 -84"},
        {id:"wonder",d:"M7 -92Q20 -100 23 -84Q22 -72 10 -76Q3 -82 7 -92Z"},
        {id:"concern",d:"M-8 -84Q14 -97 33 -85"}]});
  line("philtrum-and-chin","M4 -96Q7 -92 9 -94M2 -70Q18 -66 29 -72",
    "#b37f71",1.1,"finish",{parentId:"face",opacity:.65});
  line("freckles-left","M-54 -106l2 -1M-45 -111l1.5 -.5M-37 -103l1 -1"+
    "M-61 -99l1 -1M-32 -108l1 -1",
    "#9b6361",1.3,"finish",{parentId:"face",opacity:.85});
  line("freckles-right","M48 -103l2 -1M55 -109l1 -1M64 -104l1 -1",
    "#a67068",1.2,"finish",{parentId:"face",opacity:.77});
  line("eye-catchlights","M-34 -144l3 -2M40 -140l3 -2",
    "#fff5dd",1.8,"finish",{parentId:"face",opacity:.93});

  if(walk){
    // Knees are independently addressable, and the IK story actually uses
    // analytic two-bone connectors rather than a mislabeled preset.
    for(const [id,x,side] of [["left",-34,"left"],["right",30,"right"]] as const){
      elements.push({kind:"connector",id:"knee-"+id,
        from:{elementId:"coat-body",anchor:{x,y:90}},
        to:{elementId:id==="left"?"boot-back":"boot-front",anchor:{x,y:187}},
        ...(rig==="ik"?{ik:{upperLength:51,lowerLength:51,bendSide:side}}:
          {bend:side==="left"?-10:11}),
        color:"#b39b85",width:11,opacity:.88,timing:{start:20,end:66}});
    }
  }

  txt("eyebrow",["ORIGINAL CHARACTER  /  WAX & PAPER"],portrait?30:55,
    portrait?66:44,portrait?11:13,1,43);
  txt("headline",portrait?["THE BLUE","COAT"]:["THE BLUE COAT"],portrait?29:54,
    portrait?129:109,portrait?44:52,10,92);
  txt("subtitle",[
    draw?"Every garment begins with a line.":
      walk?"A little traveler, carefully animated.":
        "Eyes, wool, hair and a little courage."
  ],portrait?30:56,portrait?169:150,portrait?17:19,31,102);
  txt("footer",["CHARACTER ATELIER   /   HAND-DRAWN IN CODE"],portrait?30:55,
    portrait?915:512,portrait?11:13,152,durationFrames-1);

  return {version:1,id:"crayon-atelier-child-"+mode+"-"+aspect,width:W,height:H,
    durationFrames,seed:8147,paper:"#fbefda",paperTooth:.77,elements,
    camera:[{frame:0,focusX:W/2,focusY:H/2,zoom:1},
      {frame:durationFrames-1,focusX:W/2,focusY:H/2,zoom:1}]};
}
