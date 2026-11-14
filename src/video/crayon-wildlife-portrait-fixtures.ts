import type {
  CrayonColor,CrayonElement,CrayonSceneSpec,
} from "../../registry/video/materials/crayon-scene";
import {crayonFormHatching} from "./crayon-editorial-character-craft";

export interface CrayonWildlifePortraitOptions {
  /** Anatomically anchored fur/tooth detail, 0..1. */
  detail?:number;
  /** Amplification of the original ears' held-key secondary action. */
  earMotion?:number;
}
type Wax=Extract<CrayonElement,{kind:"wax"}>;
type Contour=Extract<CrayonElement,{kind:"contour"}>;
const C={
  umber:["#9b7154","#412f34","#c6a07c"] as const,
  shadow:["#564548","#352f36","#9c7868"] as const,
  warm:["#c2966b","#9d785e","#e9c6a0"] as const,
  cheek:["#b48b6c","#75574e","#dfbb95"] as const,
  cream:["#e2cbaa","#a88e76","#fff1d4"] as const,
  chest:["#a17a5e","#64504d","#d3bc9c"] as const,
  ear:["#836051","#432f35","#c58b70"] as const,
  earInner:["#b47665","#805556","#e2aa8e"] as const,
  eye:["#b98b50","#8d623c","#e5bd7b"] as const,
  pupil:["#20272d","#0e181c","#4f6161"] as const,
};
const oval=(x:number,y:number,rx:number,ry:number)=>
  "M"+(x-rx)+" "+y+"a"+rx+" "+ry+" 0 1 0 "+(rx*2)+" 0a"+rx+" "+ry+
  " 0 1 0 "+(-rx*2)+" 0Z";

/**
 * An original, naturalistic wax-crayon wildlife portrait, not a pet mascot.
 * Complex outline/eyelid/ear/fur masses remain authored CRAYON1 elements so
 * the whole scene exports through the same film system in both aspect ratios.
 */
export function crayonWildlifePortraitScene(
  aspect:"landscape"|"portrait",options:CrayonWildlifePortraitOptions={},
):CrayonSceneSpec {
  const detail=options.detail??1,earMotion=options.earMotion??1;
  if(!Number.isFinite(detail)||detail<0||detail>1||
    !Number.isFinite(earMotion)||earMotion<0||earMotion>2)
    throw new RangeError("Invalid crayon wildlife portrait settings");
  const portrait=aspect==="portrait",W=portrait?540:960,H=portrait?960:540;
  const ox=portrait?340:666,oy=portrait?555:327,D=240;
  const elements:CrayonElement[]=[];
  const wax=(id:string,d:string,bounds:{x:number;y:number;width:number;height:number},
    colors:readonly [CrayonColor,CrayonColor,CrayonColor],
    extra:Partial<Wax>={})=>{
    elements.push({kind:"wax",id,d,bounds,colors,
      coverage:"opaque",timing:{start:0,end:130},
      spacing:11,pressure:.84,strokeOrder:"patches",nibStyle:"tapered",
      markLength:"long",edgeRoughness:.21,...extra});
  };
  const line=(id:string,d:string,color:CrayonColor,width=1.6,
    extra:Partial<Contour>={})=>{
    elements.push({kind:"contour",id,d,color,width,
      timing:{start:0,end:155},opacity:.8,...extra});
  };
  const hatch=(id:string,
    form:Omit<Parameters<typeof crayonFormHatching>[0],"count">,
    target:number,color:CrayonColor,width=1.2,parentId="head",opacity=.72)=>{
    line(id,crayonFormHatching({...form,count:Math.round(5+target*detail)}),
      color,width,{parentId,opacity,timing:{start:64,end:195}});
  };
  const blink=[
    {frame:0,pose:"base"},{frame:88,pose:"blink"},{frame:93,pose:"base"},
    {frame:157,pose:"soft"},{frame:168,pose:"base"},
    {frame:202,pose:"blink"},{frame:207,pose:"base"},
  ] as const;
  const bodyMotion=[
    {frame:0,x:0,y:0,rotate:0,scaleX:1,scaleY:1},
    {frame:64,x:0,y:2,rotate:-.7,scaleX:1.01,scaleY:.99},
    {frame:110,x:0,y:-2,rotate:1.1,scaleX:.994,scaleY:1.01},
    {frame:164,x:0,y:-3,rotate:-1.2,scaleX:1.005,scaleY:1.008},
    {frame:239,x:0,y:0,rotate:0,scaleX:1,scaleY:1},
  ];
  const headMotion=[
    {frame:0,x:0,y:0,rotate:0},
    {frame:72,x:0,y:0,rotate:-1.2},
    {frame:125,x:0,y:-2,rotate:2.1},
    {frame:172,x:0,y:0,rotate:-2.7},
    {frame:239,x:0,y:0,rotate:0},
  ];
  // The masses are in painter order, not parent/rig order.
  wax("shoulder-silhouette",
    "M-96 91C-159 90 -182 169 -184 278L-193 448L185 448"+
    "Q164 318 163 195C152 125 106 83 53 92Q-14 120 -96 91Z",
    {x:-199,y:82,width:390,height:370},C.chest,
    {placement:{x:ox,y:oy},motion:bodyMotion,spacing:13});
  wax("shoulder-cool-shadow",
    "M88 103C147 133 153 220 144 345L110 436L179 448"+
    "Q171 335 161 208Q150 116 88 103Z",
    {x:82,y:98,width:105,height:360},C.shadow,
    {parentId:"shoulder-silhouette",spacing:12});
  wax("neck-ruff",
    "M-121 85Q-139 130 -110 191Q-70 263 -23 321"+
    "Q38 286 49 222Q69 153 30 94Z",
    {x:-145,y:75,width:220,height:258},C.warm,
    {parentId:"shoulder-silhouette",spacing:10});
  wax("neck-chest-light",
    "M-83 118Q-121 184 -77 238Q-48 279 -18 310"+
    "Q13 265 7 201Q-9 143 -41 111Z",
    {x:-130,y:102,width:155,height:216},C.cream,
    {parentId:"shoulder-silhouette",spacing:9,pressure:.92});
  wax("far-ear",
    "M14 -110C-10 -172 -35 -255 -23 -328Q-15 -344 -1 -329"+
    "C40 -281 54 -190 45 -114Z",
    {x:-35,y:-352,width:98,height:255},C.ear,
    {parentId:"head",pivot:{x:22,y:-119},
      motionLagFrames:3,
      motion:[{frame:0,x:0,y:0,rotate:0},
        {frame:85,x:0,y:0,rotate:4*earMotion},
        {frame:130,x:0,y:0,rotate:-3*earMotion},
        {frame:181,x:0,y:0,rotate:2*earMotion},
        {frame:239,x:0,y:0,rotate:0}],poseCadence:2});
  wax("far-ear-inner",
    "M9 -137Q-10 -205 -15 -316Q14 -277 26 -216Q36 -176 30 -128Z",
    {x:-20,y:-321,width:62,height:201},C.earInner,
    {parentId:"far-ear",spacing:8});
  wax("near-ear",
    "M68 -115C74 -182 99 -283 133 -317Q161 -307 151 -265"+
    "C137 -211 114 -158 109 -102Z",
    {x:63,y:-324,width:106,height:230},C.ear,
    {parentId:"head",pivot:{x:99,y:-115},
      motionLagFrames:5,
      motion:[{frame:0,x:0,y:0,rotate:0},
        {frame:81,x:0,y:0,rotate:-4*earMotion},
        {frame:135,x:0,y:0,rotate:5*earMotion},
        {frame:184,x:0,y:0,rotate:-3*earMotion},
        {frame:239,x:0,y:0,rotate:0}],poseCadence:2});
  wax("near-ear-inner",
    "M87 -127Q99 -235 137 -303Q141 -264 120 -208Q104 -166 96 -121Z",
    {x:82,y:-309,width:68,height:195},C.earInner,
    {parentId:"near-ear",spacing:8});
  wax("throat-occlusion",
    "M-91 86Q-130 116 -117 148Q-90 186 -57 191L8 172Q50 142 53 104Z",
    {x:-135,y:81,width:200,height:118},C.shadow,
    {parentId:"shoulder-silhouette",spacing:10});
  wax("head",
    "M-127 -94C-106 -153 -28 -166 39 -148Q128 -139 141 -75"+
    "Q157 -27 115 30Q77 71 18 93Q-45 103 -103 51"+
    "Q-157 10 -147 -51Z",
    {x:-158,y:-171,width:317,height:277},C.umber,
    {parentId:"shoulder-silhouette",pivot:{x:-2,y:65},
      motion:headMotion,poseCadence:2,spacing:10});
  wax("temple-shadow-plane",
    "M-13 -153Q99 -155 135 -80Q146 -31 114 21"+
    "Q87 49 32 74Q70 18 34 -40Q19 -96 -13 -153Z",
    {x:-21,y:-165,width:177,height:255},C.shadow,
    {parentId:"head",spacing:11});
  wax("forehead-sun-plane",
    "M-119 -99Q-85 -152 -26 -147Q20 -134 39 -104"+
    "Q-38 -109 -69 -53Q-100 -61 -119 -99Z",
    {x:-126,y:-156,width:170,height:110},C.warm,
    {parentId:"head",spacing:9,pressure:.89});
  wax("cheek-warm-plane",
    "M-105 -31Q-40 -52 -11 -12Q35 44 -35 80"+
    "Q-94 73 -134 25Z",
    {x:-140,y:-59,width:185,height:155},C.cheek,
    {parentId:"head",spacing:9});
  wax("cheek-light-reflection",
    "M-81 0Q-17 -6 2 41Q-30 82 -89 48Z",
    {x:-97,y:-13,width:110,height:105},C.cream,
    {parentId:"head",spacing:8.5,pressure:.92});
  wax("eye-socket",
    "M-91 -73Q-54 -98 -16 -68Q-35 -54 -83 -55Z",
    {x:-95,y:-105,width:86,height:58},C.shadow,
    {parentId:"head",spacing:7.4});
  wax("eye-dark-rim",
    "M-89 -58Q-58 -83 -28 -58Q-49 -34 -79 -39Z",
    {x:-98,y:-86,width:80,height:65},C.pupil,
    {parentId:"head",spacing:5.5,pressure:.94});
  wax("eye-amber-iris",oval(-56,-57,13.5,13),
    {x:-72,y:-74,width:32,height:35},C.eye,
    {parentId:"head",spacing:4.5,pressure:.95});
  wax("eye-pupil",oval(-53,-57,6.5,11),
    {x:-62,y:-71,width:18,height:29},C.pupil,
    {parentId:"head",spacing:4.4});
  line("eye-bright-catchlight","M-59 -64Q-56 -67 -53 -63",
    "#fff4d6",3.6,{parentId:"head",opacity:.97});
  line("eye-orbit-structure",
    "M-94 -64Q-59 -92 -24 -61M-88 -38Q-61 -28 -35 -43",
    "#382e32",2.15,{parentId:"head"});
  // True held-frame repaint of the eyelid. The underlying iris, pupil and
  // catchlight are occluded by opaque face pigment for the blink exposure;
  // switching only the contour would leave the eye visible through a line.
  const eyelidOpen="M-90 -58h2v1h-2Z";
  const eyelidClosed="M-95 -64Q-63 -91 -25 -64"+
    "Q-38 -42 -84 -46Z";
  const lidBase={x:-94,y:-62,width:7,height:7};
  const lidClosed={x:-100,y:-94,width:84,height:62};
  wax("eyelid-painted-occlusion",eyelidOpen,lidBase,C.umber,
    {parentId:"head",timing:{start:0,end:56},spacing:4.5,
      edgeRoughness:0,pressure:.97,
      drawings:[{frame:88,d:eyelidClosed,bounds:lidClosed},
        {frame:94,d:eyelidOpen,bounds:lidBase},
        {frame:202,d:eyelidClosed,bounds:lidClosed},
        {frame:208,d:eyelidOpen,bounds:lidBase}]});
  line("eyelid-blink",
    "M-90 -59Q-55 -81 -26 -59",
    "#332e32",2.8,{parentId:"head",poseCadence:2,
      poses:[{id:"blink",d:"M-91 -58Q-57 -37 -25 -58"},
        {id:"soft",d:"M-90 -57Q-57 -71 -25 -58"}],
      poseCues:blink});
  wax("muzzle-projection",
    "M-122 -47Q-165 -47 -195 -14Q-234 18 -207 47"+
    "Q-190 70 -147 65L-92 44Q-99 6 -122 -47Z",
    {x:-234,y:-54,width:153,height:131},C.cheek,
    {parentId:"head",spacing:9});
  wax("muzzle-light",
    "M-182 3Q-160 -10 -125 -9Q-127 18 -153 33"+
    "Q-178 40 -197 32Z",
    {x:-206,y:-17,width:92,height:57},C.cream,
    {parentId:"head",spacing:7});
  wax("nose",
    "M-199 7Q-212 3 -216 19Q-209 34 -198 29Q-186 23 -199 7Z",
    {x:-221,y:-2,width:41,height:42},C.pupil,
    {parentId:"head",spacing:4.8});
  line("philtrum-and-jaw",
    "M-204 36Q-188 48 -166 42M-175 47Q-153 62 -134 52",
    "#4b3d3c",2.5,{parentId:"head"});
  wax("cheek-cool-shadow",
    "M-14 4Q31 27 67 17Q52 55 22 76Q-10 95 -48 65Z",
    {x:-56,y:-2,width:128,height:103},C.shadow,
    {parentId:"head",spacing:9});
  wax("collar-chest-light",
    "M-90 84Q-63 109 -23 123Q23 110 51 74"+
    "Q58 135 1 171Q-47 146 -90 84Z",
    {x:-96,y:66,width:160,height:111},C.cream,
    {parentId:"shoulder-silhouette",spacing:10,pressure:.91});
  hatch("forehead-short-fur",
    {seed:9,cx:-75,cy:-99,rx:51,ry:39,angle:-30,length:12},125,
    "#e9c6a0",1.35,"head",.69);
  hatch("face-underfur",
    {seed:91,cx:-67,cy:-16,rx:65,ry:48,angle:35,length:14},140,
    "#704b44",1.2,"head",.78);
  hatch("cheek-silvery-fur",
    {seed:93,cx:-51,cy:31,rx:44,ry:31,angle:52,length:12},92,
    "#f9e4c8",1.16,"head",.91);
  hatch("temple-scratches",
    {seed:14,cx:45,cy:4,rx:62,ry:41,angle:58,length:12},85,
    "#dca882",1.32,"head",.61);
  hatch("cool-crown-fur",
    {seed:5,cx:71,cy:-76,rx:38,ry:58,angle:105,length:12},90,
    "#c3a28b",1.1,"head",.8);
  hatch("neck-ruff-fur",
    {seed:13,cx:-35,cy:146,rx:58,ry:75,angle:102,length:18},145,
    "#f0d5b4",1.45,"shoulder-silhouette",.71);
  hatch("shoulder-long-fur",
    {seed:73,cx:72,cy:233,rx:65,ry:124,angle:109,length:16},150,
    "#be8f77",1.4,"shoulder-silhouette",.6);
  hatch("throat-short-fur",
    {seed:53,cx:-98,cy:165,rx:45,ry:84,angle:95,length:12},90,
    "#493d40",1.34,"shoulder-silhouette",.57);
  hatch("far-ear-fibers",
    {seed:23,cx:13,cy:-228,rx:10,ry:75,angle:-96,length:11},68,
    "#e2aa8e",1,"far-ear",.69);
  hatch("near-ear-fibers",
    {seed:24,cx:113,cy:-231,rx:13,ry:65,angle:-75,length:11},68,
    "#e2aa8e",1,"near-ear",.66);
  line("cheek-feathered-edge",
    "M-145 -66l-21 -12M-145 -45l-16 -8M-139 -29l-18 -6"+
    "M-108 41l-21 7M-92 70l-18 18M18 89l-3 23"+
    "M29 86l8 20M46 77l13 18M64 61l17 10",
    "#ead1b0",1.75,{parentId:"head",opacity:.78});
  line("long-whiskers",
    "M-178 27Q-225 4 -282 -2M-180 34Q-237 32 -291 54"+
    "M-174 43Q-215 59 -257 103M-161 34Q-213 -2 -261 -47",
    "#f1e0d0",1.25,{parentId:"head",opacity:.79,
      motionLagFrames:4,
      pivot:{x:-180,y:31},
      motion:[{frame:0,x:0,y:0,rotate:0},
        {frame:123,x:0,y:0,rotate:1.4},
        {frame:194,x:0,y:0,rotate:-1.7},
        {frame:239,x:0,y:0,rotate:0}]});
  // Camera-independent typographic hierarchy: editorial, not nursery art.
  const text=(id:string,lines:string[],x:number,y:number,
    fontSize:number,extra:Partial<Extract<CrayonElement,{kind:"lettering"}>>={})=>{
    elements.push({kind:"lettering",id,lines,x,y,fontSize,
      color:"#efe3cc",family:"serif",weight:400,
      screenSpace:true,timing:{start:0,end:45},...extra});
  };
  text("eyebrow",["FIELD BIOLOGY / DRAWN IN WAX"],portrait?34:48,portrait?76:67,
    portrait?12:14,{family:"sans",weight:700,color:"#b7a98d"});
  text("headline",portrait?["THE WILD","HARE"]:["THE WILD","HARE"],
    portrait?34:48,portrait?160:148,portrait?50:58,
    {lineHeight:1.1,weight:700,color:"#f3e5ca"});
  text("subtitle",["A study of fur, light","and winter stillness."],
    portrait?34:48,portrait?309:284,portrait?18:16,
    {lineHeight:1.45,color:"#cfc1ae",timing:{start:30,end:77}});
  text("footer",["PLATE 04 / LEPUS EUROPAEUS"],
    portrait?34:48,portrait?925:490,portrait?11:11,
    {family:"sans",weight:600,color:"#a4b4b2",timing:{start:52,end:103}});
  line("title-rule",
    portrait?"M34 274H319":"M48 243H350","#b79c75",1.25,
    {screenSpace:true,timing:{start:15,end:65},opacity:.85});
  return {version:1,id:"crayon-wildlife-portrait-"+aspect,
    width:W,height:H,durationFrames:D,
    paper:"#1e3039",paperTooth:.69,seed:8642,elements,
    camera:[{frame:0,focusX:W/2,focusY:H/2,zoom:1},
      {frame:120,focusX:W/2,focusY:H/2+5,zoom:1.012},
      {frame:239,focusX:W/2,focusY:H/2,zoom:1}]};
}
