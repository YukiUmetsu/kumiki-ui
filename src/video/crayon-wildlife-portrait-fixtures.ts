import type {
  CrayonColor,CrayonElement,CrayonSceneSpec,
} from "../../registry/video/materials/crayon-scene";
import {crayonFurFlow,crayonIrisFlecks} from "./crayon-editorial-character-craft";
import type {CrayonFurFlow} from "./crayon-editorial-character-craft";

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
  // Reference-led composition: prevent tall folded ears from clipping in 16:9.
  // One root scale preserves the anatomy/pivots in both aspect ratios.
  const ox=portrait?340:676,oy=portrait?599:357,D=240;
  const characterScale=.94;
  const elements:CrayonElement[]=[];
  const wax=(id:string,d:string,bounds:{x:number;y:number;width:number;height:number},
    colors:readonly [CrayonColor,CrayonColor,CrayonColor],
    extra:Partial<Wax>={})=>{
    elements.push({kind:"wax",id,d,bounds,colors,
      coverage:"opaque",timing:{start:0,end:130},
      spacing:11,pressure:.84,strokeOrder:"patches",nibStyle:"tapered",
      markLength:"long",edgeRoughness:.11,outlineOpacity:.16,...extra});
  };
  const line=(id:string,d:string,color:CrayonColor,width=1.6,
    extra:Partial<Contour>={})=>{
    elements.push({kind:"contour",id,d,color,width,
      timing:{start:0,end:155},opacity:.8,...extra});
  };
  const hatch=(id:string,flow:Omit<CrayonFurFlow,"count">,
    target:number,color:CrayonColor,width=1.2,parentId="head",opacity=.72,
    start=64)=>{
    line(id,crayonFurFlow({...flow,count:Math.round(5+target*detail)}),
      color,width,{parentId,clipToParent:true,opacity,
        timing:{start,end:Math.max(195,start+2)}});
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
    {placement:{x:ox,y:oy,scale:characterScale},motion:bodyMotion,spacing:13,
      outlineOpacity:.48,edgeRoughness:.35});
  wax("shoulder-cool-shadow",
    "M88 103C147 133 153 220 144 345L110 436L179 448"+
    "Q171 335 161 208Q150 116 88 103Z",
    {x:82,y:98,width:105,height:360},C.shadow,
    {parentId:"shoulder-silhouette",spacing:12});
  wax("neck-ruff",
    "M-121 85Q-139 130 -110 191Q-70 263 -23 321"+
    "Q38 286 49 222Q69 153 30 94Z",
    {x:-145,y:75,width:220,height:258},C.warm,
    {parentId:"shoulder-silhouette",spacing:10,
      sgraffito:{d:"M-110 149Q-84 225 -38 290"+
        "M-103 163Q-73 233 -27 298M-119 135Q-109 181 -89 219",
        width:1.38,first:191,last:230}});
  wax("neck-chest-light",
    "M-83 118Q-121 184 -77 238Q-48 279 -18 310"+
    "Q13 265 7 201Q-9 143 -41 111Z",
    {x:-130,y:102,width:155,height:216},C.cream,
    {parentId:"shoulder-silhouette",spacing:9,pressure:.92});
  wax("far-ear",
    "M14 -110C-10 -172 -35 -255 -23 -328Q-15 -344 -1 -329"+
    "C40 -281 54 -190 45 -114Z",
    {x:-35,y:-352,width:98,height:255},C.ear,
    {parentId:"head",pivot:{x:22,y:-119},outlineOpacity:.34,
      motionLagFrames:3,
      motion:[{frame:0,x:0,y:0,rotate:0},
        {frame:85,x:0,y:0,rotate:4*earMotion},
        {frame:130,x:0,y:0,rotate:-3*earMotion},
        {frame:181,x:0,y:0,rotate:2*earMotion},
        {frame:239,x:0,y:0,rotate:0}],poseCadence:2});
  wax("far-ear-inner",
    "M-10 -140Q-27 -244 -16 -322Q10 -276 25 -203Q29 -163 24 -124Z",
    {x:-29,y:-328,width:61,height:211},C.earInner,
    {parentId:"far-ear",spacing:8,outlineOpacity:.1});
  wax("far-ear-crease-shadow",
    "M-21 -135Q-31 -208 -17 -318Q-18 -244 4 -188L18 -135Z",
    {x:-33,y:-324,width:57,height:199},C.shadow,
    {parentId:"far-ear",spacing:6.5,pressure:.91,outlineOpacity:0});
  line("far-ear-rim-fold","M-14 -306Q-16 -247 7 -183Q20 -151 22 -126"+
    "M-9 -312Q-2 -253 12 -216",
    "#e5c29d",1.27,{parentId:"far-ear",opacity:.77,
      timing:{start:95,end:188}});
  wax("near-ear",
    "M68 -115C74 -182 99 -283 133 -317Q161 -307 151 -265"+
    "C137 -211 114 -158 109 -102Z",
    {x:63,y:-324,width:106,height:230},C.ear,
    {parentId:"head",pivot:{x:99,y:-115},outlineOpacity:.36,
      motionLagFrames:5,
      motion:[{frame:0,x:0,y:0,rotate:0},
        {frame:81,x:0,y:0,rotate:-4*earMotion},
        {frame:135,x:0,y:0,rotate:5*earMotion},
        {frame:184,x:0,y:0,rotate:-3*earMotion},
        {frame:239,x:0,y:0,rotate:0}],poseCadence:2});
  wax("near-ear-inner",
    "M85 -132C92 -230 119 -288 139 -309"+
    "Q147 -274 132 -226Q115 -170 101 -117Z",
    {x:79,y:-318,width:76,height:206},C.earInner,
    {parentId:"near-ear",spacing:8,
      sgraffito:{d:"M99 -149Q112 -188 125 -249"+
        "M107 -167Q118 -217 137 -278M97 -176Q110 -206 130 -262",
        width:1.35,first:179,last:224}});
  wax("near-ear-outer-lip",
    "M137 -307Q160 -277 146 -238L123 -184"+
    "Q110 -157 107 -118Q107 -194 129 -258Z",
    {x:103,y:-317,width:63,height:211},C.warm,
    {parentId:"near-ear",outlineOpacity:.05,spacing:7.3,pressure:.88});
  wax("near-ear-canal-shadow",
    "M91 -132Q95 -158 105 -165Q120 -143 111 -111Z",
    {x:84,y:-171,width:39,height:66},C.shadow,
    {parentId:"near-ear",outlineOpacity:0,spacing:5.8,pressure:.94});
  line("near-ear-rim-fold",
    "M137 -302Q138 -242 118 -185Q109 -159 104 -128"+
    "M124 -285Q106 -241 102 -193",
    "#eed3af",1.32,{parentId:"near-ear",opacity:.81,
      timing:{start:92,end:195}});
  wax("throat-occlusion",
    "M-91 86Q-130 116 -117 148Q-90 186 -57 191L8 172Q50 142 53 104Z",
    {x:-135,y:81,width:200,height:118},C.shadow,
    {parentId:"shoulder-silhouette",spacing:10});
  wax("head",
    // Wedge-shaped real hare skull: orbital brow and cheek run back to the
    // neck while the tapering bridge meets the projected whisker pad.
    "M-154 -70C-165 -120 -115 -158 -46 -161"+
    "C13 -172 88 -148 115 -111Q142 -75 133 -38"+
    "C125 4 82 51 32 83Q1 105 -41 84"+
    "Q-97 67 -127 29Q-169 -12 -154 -70Z",
    {x:-173,y:-179,width:318,height:293},C.umber,
    {parentId:"shoulder-silhouette",pivot:{x:-2,y:65},
      motion:headMotion,poseCadence:2,spacing:10,
      outlineOpacity:.45,edgeRoughness:.32});
  wax("temple-shadow-plane",
    "M-3 -154C63 -150 115 -120 132 -80"+
    "Q142 -42 119 -5Q88 56 44 76"+
    "Q61 26 42 -18Q33 -94 -3 -154Z",
    {x:-16,y:-168,width:171,height:259},C.shadow,
    {parentId:"head",spacing:11,outlineOpacity:.05});
  wax("forehead-sun-plane",
    "M-119 -99Q-85 -152 -26 -147Q20 -134 39 -104"+
    "Q-38 -109 -69 -53Q-100 -61 -119 -99Z",
    {x:-126,y:-156,width:170,height:110},C.warm,
    {parentId:"head",spacing:9,pressure:.89});
  wax("cheek-warm-plane",
    "M-105 -31Q-40 -52 -11 -12Q35 44 -35 80"+
    "Q-94 73 -134 25Z",
    {x:-140,y:-59,width:185,height:155},C.cheek,
    {parentId:"head",spacing:9,
      sgraffito:{d:"M-111 -14Q-79 9 -47 62"+
        "M-103 2Q-68 26 -35 66M-122 14Q-89 45 -53 66",
        width:1.16,first:186,last:230}});
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
    {parentId:"head",spacing:5.5,pressure:.94,outlineOpacity:.55});
  wax("eye-amber-iris",oval(-56,-57,13.5,13),
    {x:-72,y:-74,width:32,height:35},C.eye,
    {parentId:"head",spacing:4.5,pressure:.95});
  // The eye in reference wildlife studies is not a flat gold circle.
  // Irregular inner pigment rays, copper arcs and deep limbal flecks
  // converge around the dark pupil. Clipping holds every micro-stroke
  // inside the original amber iris even when the head rotates.
  line("iris-deep-radials",crayonIrisFlecks({
    seed:211,cx:-56,cy:-57,rx:13.4,ry:12.8,count:35,
    minRadius:.52,maxRadius:.94}),"#4c3637",.92,
    {parentId:"eye-amber-iris",clipToParent:true,opacity:.84,
      timing:{start:121,end:183}});
  line("iris-gold-radials",crayonIrisFlecks({
    seed:212,cx:-56,cy:-57,rx:13.3,ry:12.7,count:22,
    minRadius:.58,maxRadius:.90}),"#ecd297",.62,
    {parentId:"eye-amber-iris",clipToParent:true,opacity:.86,
      timing:{start:132,end:190}});
  wax("eye-pupil",oval(-53,-57,6.5,11),
    {x:-62,y:-71,width:18,height:29},C.pupil,
    {parentId:"head",spacing:4.4});
  line("eye-bright-catchlight","M-59 -65Q-56 -69 -52 -65",
    "#f6f5de",2.6,{parentId:"head",opacity:.98});
  line("eye-secondary-catchlight","M-47 -49Q-45 -51 -43 -50",
    "#b2d1cf",1.35,{parentId:"head",opacity:.88,
      timing:{start:151,end:210}});
  line("eye-limbal-light","M-73 -59Q-72 -75 -61 -77M-40 -48Q-48 -36 -62 -37",
    "#d3b595",1.15,{parentId:"head",opacity:.66});
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
    // Projected narrow bridge and paired whisker pads, not a large rounded
    // cartoon peanut. Nose and philtrum remain in source coordinates.
    "M-125 -52C-158 -49 -194 -24 -213 -5"+
    "Q-233 9 -218 33C-199 51 -174 47 -143 42"+
    "L-101 27Q-100 -11 -125 -52Z",
    {x:-238,y:-62,width:150,height:128},C.cheek,
    {parentId:"head",spacing:9,outlineOpacity:.3});
  wax("muzzle-light",
    "M-182 3Q-160 -10 -125 -9Q-127 18 -153 33"+
    "Q-178 40 -197 32Z",
    {x:-206,y:-17,width:92,height:57},C.cream,
    {parentId:"head",spacing:7});
  wax("nose",
    "M-199 7Q-212 3 -216 19Q-209 34 -198 29Q-186 23 -199 7Z",
    {x:-221,y:-2,width:41,height:42},C.pupil,
    {parentId:"head",spacing:4.8,outlineOpacity:.42});
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
  // Gallery-quality layered, flowing fur groups. The first pass is a
  // deeper root/shadow color; the second follows the same muscle with more
  // varied warm midtones; the sparse high-value pass catches individual
  // filaments. Their flow curves turn with the cheek and neck rather than
  // repeating a constant hatch angle. Every stroke is clipped to its own
  // moving, fully opaque anatomical wax parent.
  hatch("forehead-undercoat",{
    seed:902,guide:[{x:-139,y:-115},{x:-108,y:-155},{x:-28,y:-148},{x:4,y:-125}],
    spread:12,length:12,forkRate:.055},99,"#49383b",1.1,"head",.55,53);
  hatch("forehead-short-fur",{
    seed:9,guide:[{x:-132,y:-111},{x:-94,y:-149},{x:-34,y:-145},{x:11,y:-113}],
    spread:19,length:15,forkRate:.09},120,"#e9c6a0",1.2,"head",.76,71);
  hatch("forehead-bright-filaments",{
    seed:192,guide:[{x:-119,y:-119},{x:-82,y:-154},{x:-25,y:-148},{x:14,y:-121}],
    spread:9,length:11,forkRate:.025},49,"#f5dfbf",.79,"head",.79,129);

  hatch("face-underfur",{
    seed:91,guide:[{x:-124,y:-24},{x:-102,y:3},{x:-51,y:69},{x:-4,y:77}],
    spread:24,length:18,forkRate:.13},142,"#61433e",1.35,"head",.71,60);
  hatch("cheek-warm-fur",{
    seed:402,guide:[{x:-121,y:-20},{x:-82,y:12},{x:-39,y:75},{x:-3,y:76}],
    spread:21,length:14,forkRate:.09},118,"#cb9873",1.16,"head",.79,89);
  hatch("cheek-silvery-fur",{
    seed:93,guide:[{x:-116,y:-12},{x:-84,y:17},{x:-42,y:80},{x:4,y:72}],
    spread:12,length:12,forkRate:.035},94,"#f9e4c8",.95,"head",.92,132);
  hatch("muzzle-coarse-fur",{
    seed:110,guide:[{x:-121,y:-28},{x:-148,y:-22},{x:-195,y:22},{x:-204,y:35}],
    spread:13,length:10,forkRate:.09},66,"#725148",1.0,"muzzle-projection",.77,90);
  hatch("muzzle-rim-light",{
    seed:111,guide:[{x:-134,y:-5},{x:-155,y:14},{x:-183,y:28},{x:-192,y:30}],
    spread:7,length:8,forkRate:.035},40,"#f5dfc3",.8,"muzzle-projection",.88,145);

  hatch("temple-scratches",{
    seed:14,guide:[{x:4,y:-130},{x:54,y:-104},{x:115,y:-28},{x:83,y:60}],
    spread:25,length:15,forkRate:.095},96,"#dca882",1.19,"head",.62,71);
  hatch("temple-shadow-filaments",{
    seed:151,guide:[{x:20,y:-128},{x:71,y:-93},{x:123,y:-13},{x:84,y:51}],
    spread:12,length:15,forkRate:.07},64,"#332d36",.99,"head",.67,61);
  hatch("cool-crown-fur",{
    seed:5,guide:[{x:10,y:-143},{x:73,y:-135},{x:142,y:-54},{x:116,y:27}],
    spread:18,length:16,forkRate:.1},96,"#c3a28b",1.04,"head",.77,96);

  hatch("neck-ruff-shadow",{
    seed:12,guide:[{x:-120,y:107},{x:-99,y:180},{x:-47,y:271},{x:-6,y:311}],
    spread:19,length:21,forkRate:.1},123,"#5d4845",1.33,
    "shoulder-silhouette",.56,67);
  hatch("neck-ruff-fur",{
    seed:13,guide:[{x:-121,y:115},{x:-91,y:191},{x:-54,y:271},{x:-9,y:314}],
    spread:23,length:22,forkRate:.14},145,"#f0d5b4",1.3,
    "shoulder-silhouette",.75,93);
  hatch("neck-ruff-flare",{
    seed:803,guide:[{x:-122,y:129},{x:-86,y:211},{x:-42,y:288},{x:0,y:302}],
    spread:12,length:19,forkRate:.035},53,"#fff1d8",.87,
    "shoulder-silhouette",.87,156);
  hatch("shoulder-long-fur",{
    seed:73,guide:[{x:19,y:125},{x:75,y:174},{x:95,y:306},{x:120,y:429}],
    spread:40,length:26,forkRate:.13},153,"#be8f77",1.32,
    "shoulder-silhouette",.68,107);
  hatch("shoulder-cool-fur",{
    seed:741,guide:[{x:54,y:124},{x:128,y:188},{x:144,y:296},{x:129,y:418}],
    spread:20,length:23,forkRate:.075},87,"#4b4348",1.21,
    "shoulder-silhouette",.52,78);
  hatch("throat-short-fur",{
    seed:53,guide:[{x:-121,y:105},{x:-121,y:173},{x:-77,y:251},{x:-19,y:309}],
    spread:15,length:13,forkRate:.1},98,"#493d40",1.25,
    "shoulder-silhouette",.64,64);
  hatch("far-ear-fibers",{
    seed:23,guide:[{x:-16,y:-312},{x:-10,y:-240},{x:21,y:-175},{x:25,y:-125}],
    spread:10,length:14,forkRate:.09},75,"#e2aa8e",.95,"far-ear",.75,95);
  hatch("far-ear-tip-luster",{
    seed:123,guide:[{x:-15,y:-306},{x:5,y:-250},{x:24,y:-196},{x:25,y:-130}],
    spread:5,length:11,forkRate:.02},34,"#f5d2ac",.85,"far-ear",.88,150);
  hatch("near-ear-fibers",{
    seed:24,guide:[{x:135,y:-306},{x:118,y:-244},{x:102,y:-187},{x:97,y:-126}],
    spread:11,length:14,forkRate:.08},74,"#e2aa8e",.96,"near-ear",.75,108);
  hatch("near-ear-deep-roots",{
    seed:124,guide:[{x:134,y:-298},{x:121,y:-247},{x:103,y:-185},{x:96,y:-124}],
    spread:6,length:10,forkRate:.055},39,"#543d41",.79,"near-ear",.61,82);
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
