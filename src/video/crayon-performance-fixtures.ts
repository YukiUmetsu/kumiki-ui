import type { CrayonColor, CrayonElement, CrayonSceneSpec } from "../../registry/video/materials/crayon-scene";
import {crayonFormHatching} from "./crayon-editorial-character-craft";

/**
 * Original CRAYON1 performance study. All dialogue timing is authored rather
 * than inferred from text: downstream editors may populate the same cue format
 * from aligned voice recordings. No borrowed characters, fonts or audio.
 */
export type CrayonPerformanceAspect = "landscape" | "portrait";
export interface CrayonPerformanceOptions { editorialDetail?: number }
const berries = ["#ae7f6c","#7f5d58","#d0a489"] as const;
const plum = ["#656f78","#444f5b","#a3a4a5"] as const;
const sage = ["#7e9480","#526e6b","#b1bd9e"] as const;
const honey = ["#d8bc93","#ad9378","#f0d8b0"] as const;
const cloud = ["#ded4bf","#b6b6ad","#f5ecdc"] as const;
const indigo = ["#627d7e","#3b5962","#a4b9af"] as const;
const fieldCoat = ["#697d75","#394f54","#a8afa2"] as const;
const furShadow = ["#855f58","#58464a","#b88e75"] as const;
const boot = ["#555e60","#343c45","#92908b"] as const;
const ink:CrayonColor="#4e4b64";
const egg = (cx:number,cy:number,rx:number,ry:number)=>
  `M${cx-rx} ${cy} a${rx} ${ry} 0 1 0 ${rx*2} 0 a${rx} ${ry} 0 1 0 -${rx*2} 0 Z`;
const wax=(id:string,d:string,bounds:{x:number;y:number;width:number;height:number},
  colors:readonly [CrayonColor,CrayonColor,CrayonColor],props:Partial<Extract<CrayonElement,{kind:"wax"}>>={}):CrayonElement=>
    ({kind:"wax",id,d,bounds,colors,timing:{start:0,end:269},spacing:6.5,pressure:.78,
      // A sky/landscape rub is intentionally open. Living subjects must stop
      // the scenery completely, while retaining textured colour on top.
      coverage: /^(distant-meadow|paper-cloud-left|dusk-hill|sun-disc|shadow)$/.test(id)
        ? "open" : "opaque",
      redraw:/^(body|head|tail|left-ear|right-ear|belly|front-arm|back-arm|scarf)/.test(id)
        ? {holdFrames:3,strength:.58,beginFrame:184}:undefined,
      edgeRoughness:/^(distant-meadow|paper-cloud-left|dusk-hill|sun-disc|shadow)$/.test(id)
        ? 0:.6,
      angle: id==="tail"?-18:id.includes("ear")?15:
        id==="body"?7:id==="head"?-7:id.includes("arm")?18:0,
      ...props});
const contour=(id:string,d:string,width:number,props:Partial<Extract<CrayonElement,{kind:"contour"}>>={}):CrayonElement=>
  ({kind:"contour",id,d,color:ink,width,timing:{start:0,end:269},...props});

export function crayonPerformanceScene(aspect:CrayonPerformanceAspect,options:CrayonPerformanceOptions={}):CrayonSceneSpec {
  const detail=options.editorialDetail??1;
  if(!Number.isFinite(detail)||detail<0||detail>1)
    throw new RangeError("Crayon editorial detail must be 0..1");
  const portrait=aspect==="portrait", W=portrait?540:960,H=portrait?960:540;
  const ox=W*(portrait?.56:.73), oy=portrait?H*.65:H*.63;
  // Opaque torso is a soft volume: weight compresses on anticipation and
  // releases on the lifted gesture. Neither axis ever collapses the shape.
  const bodyMotion=[
    {frame:0,x:0,y:0,rotate:0,scaleX:1,scaleY:1},
    {frame:68,x:0,y:4,rotate:-3,scaleX:1.045,scaleY:.965},
    {frame:88,x:0,y:-7,rotate:3,scaleX:.965,scaleY:1.045},
    {frame:120,x:0,y:-9,rotate:2,scaleX:.975,scaleY:1.035},
    {frame:160,x:0,y:-3,rotate:-2,scaleX:1.025,scaleY:.985},
    {frame:217,x:0,y:0,rotate:0,scaleX:.99,scaleY:1.01},
    {frame:269,x:0,y:0,rotate:0,scaleX:1,scaleY:1},
  ];
  const headMotion=[
    {frame:0,x:0,y:0,rotate:0},
    {frame:64,x:0,y:0,rotate:-5},
    {frame:96,x:0,y:-2,rotate:6},
    {frame:132,x:0,y:0,rotate:-3},
    {frame:178,x:0,y:0,rotate:8},
    {frame:230,x:0,y:0,rotate:0},
    {frame:269,x:0,y:0,rotate:0},
  ];
  const mouthCues=[
    {frame:0,pose:"base"}, {frame:76,pose:"mbp"}, {frame:82,pose:"ah"},
    {frame:88,pose:"ee"}, {frame:96,pose:"base"}, {frame:106,pose:"oh"},
    {frame:114,pose:"ee"}, {frame:122,pose:"fv"}, {frame:128,pose:"ah"},
    {frame:138,pose:"base"}, {frame:156,pose:"oh"}, {frame:164,pose:"ah"},
    {frame:172,pose:"smile"}, {frame:214,pose:"base"},
  ] as const;
  const blinkCues=[
    {frame:0,pose:"base"}, {frame:70,pose:"soft"}, {frame:76,pose:"base"},
    {frame:101,pose:"blink"}, {frame:105,pose:"base"},
    {frame:170,pose:"smile"}, {frame:192,pose:"blink"},
    {frame:198,pose:"smile"}, {frame:232,pose:"base"},
  ] as const;
  // Distinct eyebrow art carries the emotional sentence, not a mirrored
  // rotation of a flat head. These cues intentionally precede/succeed the
  // mouth and eyelid keyframes by several source frames.
  const browCues=[
    {frame:0,pose:"base"}, {frame:64,pose:"concern"},
    {frame:83,pose:"wonder"}, {frame:103,pose:"base"},
    {frame:152,pose:"wonder"}, {frame:171,pose:"smile"},
    {frame:214,pose:"concern"}, {frame:230,pose:"base"},
  ] as const;
  // Ear and textile response lag behind skull, arms and torso by separate
  // authored offsets. Every path is still parented to its natural joint.
  const leftEarMotion=[
    {frame:0,x:0,y:0,rotate:0,scaleY:1},
    {frame:72,x:0,y:0,rotate:8,scaleY:.95},
    {frame:104,x:0,y:0,rotate:-10,scaleY:1.04},
    {frame:140,x:0,y:0,rotate:4,scaleY:1},
    {frame:183,x:0,y:0,rotate:-7,scaleY:1.03},
    {frame:238,x:0,y:0,rotate:3,scaleY:.99},
    {frame:269,x:0,y:0,rotate:0,scaleY:1},
  ];
  const rightEarMotion=[
    {frame:0,x:0,y:0,rotate:0,scaleY:1},
    {frame:72,x:0,y:0,rotate:-5,scaleY:1.05},
    {frame:103,x:0,y:0,rotate:9,scaleY:.96},
    {frame:148,x:0,y:0,rotate:-4,scaleY:1},
    {frame:184,x:0,y:0,rotate:7,scaleY:1.04},
    {frame:241,x:0,y:0,rotate:-3,scaleY:1},
    {frame:269,x:0,y:0,rotate:0,scaleY:1},
  ];

  const elements:CrayonElement[]=[
    wax("distant-meadow",`M0 ${H*.69} Q${W*.25} ${H*.59} ${W*.46} ${H*.71} Q${W*.73} ${H*.58} ${W} ${H*.70} V${H} H0Z`,
      {x:0,y:H*.56,width:W,height:H*.44},plum,{timing:{start:0,end:90},spacing:12,pressure:.34}),
    wax("paper-cloud-left",`M${W*.10} ${H*.28} C${W*.09} ${H*.21} ${W*.18} ${H*.19} ${W*.22} ${H*.24} C${W*.30} ${H*.17} ${W*.35} ${H*.24} ${W*.31} ${H*.29}Z`,
      {x:W*.08,y:H*.16,width:W*.29,height:H*.16},cloud,{timing:{start:9,end:90},spacing:11,pressure:.4}),
    wax("dusk-hill",`M0 ${H*.75} Q${W*.26} ${H*.64} ${W*.52} ${H*.77} Q${W*.82} ${H*.66} ${W} ${H*.73} V${H} H0Z`,
      {x:0,y:H*.62,width:W,height:H*.38},sage,{timing:{start:8,end:94},spacing:10}),
    wax("sun-disc",egg(W*.76,H*.29,61,61),{x:W*.76-62,y:H*.29-62,width:124,height:124},
      honey,{timing:{start:0,end:88},pressure:.55}),
    contour("rolling-grass",`M0 ${H*.83} Q${W*.30} ${H*.74} ${W*.62} ${H*.84} T${W} ${H*.83}`,8,
      {timing:{start:8,end:130},color:"#547b65",opacity:.65}),
    wax("shadow",egg(ox,oy+112,87,13),{x:ox-89,y:oy+97,width:178,height:29},
      plum,{timing:{start:34,end:155},pressure:.28,spacing:12}),
    // Tail and ear backs intentionally precede the torso in painter order,
    // despite inheriting its transforms through the articulated DAG.
     wax("tail","M-42 36 C-81 58 -139 33 -133 -13 C-133 -46 -96 -51 -75 -25 Q-59 -10 -42 7Z",
      {x:-145,y:-57,width:109,height:124},berries,{parentId:"body",pivot:{x:-46,y:24},
        motion:[{frame:0,x:0,y:0,rotate:-14},{frame:80,x:0,y:0,rotate:16},
          {frame:130,x:0,y:0,rotate:-9},{frame:190,x:0,y:0,rotate:21},
          {frame:269,x:0,y:0,rotate:-14}],poseCadence:2}),
    wax("left-ear","M-44 -102 C-65 -130 -79 -182 -57 -232 Q-30 -203 -27 -153 L-29 -101Z",
      {x:-80,y:-236,width:58,height:138},
      berries,{parentId:"head",pivot:{x:-37,y:-97},
        motion:leftEarMotion,motionLagFrames:3,poseCadence:2}),
    wax("right-ear","M25 -105 C17 -152 24 -202 51 -224 Q72 -179 55 -137 L47 -101Z",
      {x:15,y:-230,width:62,height:134},
      berries,{parentId:"head",pivot:{x:37,y:-97},
        motion:rightEarMotion,motionLagFrames:5,poseCadence:2}),
    // Inner ear pigment must follow the moving outer ear, not remain stuck
    // directly to the head; the local artwork is still the same original.
    wax("left-ear-inner","M-44 -113 Q-64 -155 -55 -209 Q-38 -183 -35 -146Z",
      {x:-64,y:-214,width:33,height:105},furShadow,{parentId:"left-ear",spacing:4.5,pressure:.45}),
    wax("right-ear-inner","M35 -117 Q30 -161 49 -207 Q60 -174 45 -132Z",
      {x:28,y:-213,width:34,height:103},furShadow,{parentId:"right-ear",spacing:4.5,pressure:.45}),
    wax("back-arm","M-52 -12 Q-83 7 -76 48 Q-70 73 -50 68 L-37 24Z",
      {x:-89,y:-20,width:62,height:97},fieldCoat,{parentId:"body",pivot:{x:-49,y:18},
        motion:[{frame:0,x:0,y:0,rotate:10},{frame:90,x:0,y:0,rotate:-12},
          {frame:180,x:0,y:0,rotate:12},{frame:269,x:0,y:0,rotate:10}]}),
    // Long limb volumes sit below the tailored coat and behind the body.
    wax("shin-back","M-49 67Q-52 109 -47 153L-22 155Q-18 118 -18 80Z",
      {x:-56,y:60,width:44,height:101},plum,{parentId:"body",spacing:5.5}),
    wax("shin-front","M17 75Q15 118 20 152L49 150Q53 115 45 74Z",
      {x:10,y:68,width:49,height:91},plum,{parentId:"body",spacing:5.5}),
    wax("body","M-41 -58 Q-67 -53 -71 -22 C-77 12 -55 73 -42 94 Q-5 113 46 93 C60 69 76 5 59 -30 Q40 -63 8 -64 Q-20 -68 -41 -58Z",
      {x:-81,y:-72,width:161,height:191},berries,{
        placement:{x:ox,y:oy},motion:bodyMotion,poseCadence:2}),
    wax("coat-shadow","M23 -49Q63 -55 64 -13L48 80Q31 90 23 84L30 7Z",
      {x:18,y:-58,width:52,height:154},furShadow,
      {parentId:"body",pressure:.82,spacing:6}),
    wax("coat-left-panel","M-44 -51Q-61 -33 -55 5L-36 91Q-11 104 -3 95L-17 -18Z",
      {x:-64,y:-57,width:67,height:165},fieldCoat,{parentId:"body",spacing:5.6}),
    wax("coat-right-panel","M30 -49Q58 -34 60 -10L43 82Q22 98 6 96L17 -17Z",
      {x:2,y:-56,width:62,height:160},fieldCoat,{parentId:"body",spacing:5.6}),
    wax("coat-lapel-left","M-43 -49L-11 -31L-24 -8L-2 16L-28 4Z",
      {x:-49,y:-56,width:51,height:75},indigo,{parentId:"body",spacing:4.7}),
    wax("coat-lapel-right","M27 -48L5 -28L21 -9L4 15L31 2Z",
      {x:0,y:-55,width:38,height:76},indigo,{parentId:"body",spacing:4.7}),
    contour("coat-seam-architecture",
      "M-44 -37Q-56 -7 -45 26L-33 81M44 -35Q60 5 45 50L38 80"+
      "M-18 -17L-12 30Q-9 61 -14 91M21 -20L17 25Q16 66 18 86"+
      "M-48 75Q-26 89 -13 83M20 84Q36 89 47 70",
      1.75,{parentId:"body",color:"#314e53",opacity:.75}),
    contour("coat-pocket-structure","M-44 47Q-32 53 -17 49L-19 68Q-33 73 -44 65Z"+
      "M25 51Q39 56 49 49L47 68Q34 75 24 68Z",1.8,
      {parentId:"body",color:"#d4d1ba",opacity:.75}),
    wax("coat-brass-button-one",egg(5,24,3.9,4.3),
      {x:0,y:19,width:10,height:11},honey,{parentId:"body",spacing:4}),
    wax("coat-brass-button-two",egg(5,48,3.8,4),
      {x:0,y:43,width:10,height:11},honey,{parentId:"body",spacing:4}),
    wax("foot-back","M-48 144 Q-29 138 -16 146 L-9 160 Q-24 175 -52 169Z",
      {x:-55,y:137,width:51,height:39},boot,{parentId:"body",pressure:.84,spacing:4.5,
        contacts:[{start:0,end:269,anchor:{x:-29,y:166}}]}),
    wax("foot-front","M15 143 Q34 137 49 147 L58 161 Q40 176 15 169Z",
      {x:9,y:136,width:53,height:42},boot,{parentId:"body",pressure:.84,spacing:4.5,
        contacts:[{start:0,end:269,anchor:{x:31,y:166}}]}),
    wax("belly","M-14 -25Q0 -9 14 -24 L10 76 Q0 91 -8 76Z",
      {x:-18,y:-29,width:37,height:124},honey,
      {parentId:"body",pressure:.58,spacing:5}),
    contour("boot-lacing","M-29 145L-31 158M-40 151L-22 151M-39 156L-23 156"+
      "M32 145L31 159M24 151L44 151M24 157L45 157",1.65,
      {parentId:"body",color:"#d3c6aa",opacity:.83}),
    wax("scarf-wrap","M-37 -38 Q0 -18 39 -38 L34 -20 Q0 1 -33 -22Z",
      {x:-42,y:-42,width:86,height:46},indigo,{parentId:"body",pressure:.82,spacing:5.5}),
    wax("scarf-tail","M21 -24 Q35 -18 46 -6 L56 25 L37 29 L24 0Z",
      {x:18,y:-27,width:42,height:60},indigo,{parentId:"body",pressure:.8,spacing:5,
        pivot:{x:24,y:-20},motionLagFrames:6,poseCadence:2,
        motion:[{frame:0,x:0,y:0,rotate:0,scaleY:1},
          {frame:78,x:0,y:0,rotate:-8,scaleY:.96},
          {frame:111,x:0,y:0,rotate:15,scaleY:1.08},
          {frame:159,x:0,y:0,rotate:-6,scaleY:.95},
          {frame:199,x:0,y:0,rotate:8,scaleY:1.04},
          {frame:244,x:0,y:0,rotate:-3,scaleY:1},
          {frame:269,x:0,y:0,rotate:0,scaleY:1}]}),
    contour("scarf-weave","M-29 -29 Q0 -8 31 -29",2.2,
      {parentId:"body",color:"#d5d9df",opacity:.75}),
    contour("scarf-tail-stitch","M38 16 L50 14",2.2,
      {parentId:"scarf-tail",color:"#d5d9df",opacity:.75}),
    wax("head","M-52 -117Q-54 -146 -24 -159C11 -172 46 -158 53 -128"+
      "Q64 -110 58 -85Q59 -74 51 -63Q38 -54 21 -48"+
      "Q-4 -35 -27 -56Q-54 -72 -55 -97Z",
      {x:-65,y:-177,width:132,height:150},berries,{
        parentId:"body",pivot:{x:0,y:-71},motion:headMotion,poseCadence:2}),
    wax("face-temple-shadow","M25 -146Q56 -129 51 -93L39 -70L28 -89Z",
      {x:22,y:-152,width:40,height:89},furShadow,{parentId:"head",spacing:4.5}),
    wax("face-cheek-light","M-47 -124Q-29 -148 6 -146Q-29 -125 -31 -102"+
      "Q-39 -80 -29 -63Q-56 -80 -47 -124Z",
      {x:-56,y:-152,width:69,height:98},honey,{parentId:"head",spacing:5.5,pressure:.46}),
    wax("muzzle","M-14 -95Q9 -105 29 -92Q50 -92 56 -78"+
      "Q53 -67 34 -57Q17 -47 2 -54Q-18 -59 -23 -78Z",
      {x:-28,y:-111,width:90,height:65},honey,
      {parentId:"head",pressure:.68,spacing:5}),
    wax("muzzle-jowl-shadow","M22 -56Q45 -70 50 -80Q59 -65 34 -52L5 -48Z",
      {x:0,y:-83,width:62,height:40},furShadow,
      {parentId:"head",pressure:.65,spacing:4.7}),
    contour("nose-bridge-anatomy","M24 -121Q38 -105 44 -85M17 -81Q30 -87 43 -82"+
      "M24 -61Q36 -65 45 -71",1.8,
      {parentId:"head",color:"#775c56",opacity:.77}),
    contour("cheek-whiskers","M-11 -70Q-32 -75 -52 -66M-11 -65Q-37 -57 -53 -47"+
      "M35 -67Q58 -78 77 -67M35 -61Q61 -54 81 -40",1.35,
      {parentId:"head",color:"#6c5b59",opacity:.64}),
    contour("ear-left-fold","M-42 -119Q-54 -163 -54 -199M-35 -123Q-45 -160 -49 -188",
      1.8,{parentId:"left-ear",color:"#dfbb9d",opacity:.75}),
    contour("ear-right-fold","M39 -120Q48 -155 51 -195M31 -129Q34 -163 43 -185",
      1.8,{parentId:"right-ear",color:"#dfbb9d",opacity:.75}),
    contour("brow-left","M-32 -115 Q-23 -122 -14 -117",2.8,{
      parentId:"head",poseCadence:2,opacity:.82,
      poses:[{id:"concern",d:"M-34 -114 Q-23 -127 -13 -120"},
        {id:"wonder",d:"M-33 -123 Q-24 -131 -14 -123"},
        {id:"smile",d:"M-33 -115 Q-23 -117 -14 -113"}],
      poseCues:browCues}),
    contour("brow-right","M14 -117 Q24 -122 33 -115",2.8,{
      parentId:"head",poseCadence:2,opacity:.82,
      poses:[{id:"concern",d:"M14 -120 Q24 -127 34 -114"},
        {id:"wonder",d:"M14 -123 Q24 -131 33 -123"},
        {id:"smile",d:"M14 -113 Q24 -117 33 -115"}],
      poseCues:browCues}),
    contour("left-eye","M-31 -110Q-25 -113 -19 -108Q-25 -106 -31 -110Z",2,{
      parentId:"head",poseCadence:2,
      poses:[{id:"blink",d:"M-33 -109Q-24 -105 -15 -110"},
        {id:"soft",d:"M-32 -110Q-23 -112 -16 -109"},
        {id:"smile",d:"M-32 -110Q-24 -117 -16 -110"}],
      poseCues:blinkCues}),
    contour("right-eye","M13 -110Q23 -121 36 -109Q27 -99 13 -110Z",2.8,{
      parentId:"head",poseCadence:2,
      poses:[{id:"blink",d:"M15 -108Q24 -104 34 -108"},
        {id:"soft",d:"M15 -109Q25 -113 33 -109"},
        {id:"smile",d:"M15 -109Q24 -116 34 -109"}],
      poseCues:blinkCues}),
    // Warm iris, dark pupil and paper-white catchlight share the eyelid's
    // held exposure sheet. They disappear on a blink instead of floating
    // visibly over a closed eye.
    contour("near-eye-iris","M21 -110a5 6 0 1 0 10 0a5 6 0 1 0 -10 0",
      3.6,{parentId:"head",color:"#c7a26b",poseCadence:2,
        poses:[{id:"blink",d:"M21 -109L21.1 -109"},
          {id:"soft",d:"M22 -110Q26 -113 31 -110"},
          {id:"smile",d:"M22 -111Q26 -114 31 -110"}],
        poseCues:blinkCues}),
    contour("near-eye-pupil","M24 -110a2 4 0 1 0 4 0a2 4 0 1 0 -4 0",
      3.2,{parentId:"head",color:"#343d43",poseCadence:2,
        poses:[{id:"blink",d:"M24 -110L24.1 -110"},
          {id:"soft",d:"M24 -110L28 -109"},
          {id:"smile",d:"M24 -111L28 -110"}],
        poseCues:blinkCues}),
    contour("near-eye-catchlight","M25 -113L27 -114",1.9,
      {parentId:"head",color:"#fff1cc",opacity:.96,poseCadence:2,
        poses:[{id:"blink",d:"M25 -113L25.1 -113"},
          {id:"soft",d:"M25 -113L25.5 -113"},
          {id:"smile",d:"M25 -113L25.5 -113"}],
        poseCues:blinkCues}),
    contour("orbital-bone","M11 -115Q24 -124 38 -113M16 -102Q25 -99 35 -103",
      1.6,{parentId:"head",color:"#604a4a",opacity:.79}),
    contour("lower-jaw-volume","M-24 -68Q-7 -42 20 -47M10 -50Q28 -45 40 -58",
      1.35,{parentId:"head",color:"#b18c70",opacity:.68}),
    contour("freckles-left","M-45 -81 l5 1 M-44 -75 l4 2 M-38 -79 l4 1",2,
      {parentId:"head",color:"#c16f65",opacity:.74}),
    contour("freckles-right","M40 -81 l5 1 M40 -75 l4 2 M34 -79 l4 1",2,
      {parentId:"head",color:"#c16f65",opacity:.74}),
    wax("nose","M42 -84Q49 -90 58 -84Q58 -80 50 -76Q44 -77 42 -84Z",
      {x:39,y:-92,width:23,height:19},plum,
      {parentId:"head",spacing:4,pressure:.8}),
    contour("mouth","M27 -61Q38 -53 50 -65",2.8,{
      parentId:"head",poseCadence:2,
      poses:[
        {id:"mbp",d:"M27 -61Q38 -57 50 -65"},
        {id:"ah",d:"M29 -64Q37 -47 47 -65Q39 -55 29 -64Z"},
        {id:"ee",d:"M24 -61Q40 -53 51 -65"},
        {id:"oh",d:"M35 -65a5 6 0 1 0 10 0a5 6 0 1 0 -10 0"},
        {id:"fv",d:"M28 -63Q39 -59 50 -65M33 -59H46"},
        {id:"smile",d:"M23 -62Q39 -49 53 -66"},
      ],poseCues:mouthCues}),
    wax("front-arm","M43 -9Q68 -5 76 21Q83 49 59 61L42 47L55 24Z",
      {x:36,y:-17,width:52,height:83},fieldCoat,{parentId:"body",pivot:{x:49,y:10},
        motion:[{frame:0,x:0,y:0,rotate:-9},{frame:60,x:0,y:0,rotate:-27},
          {frame:96,x:0,y:0,rotate:-67},{frame:145,x:0,y:0,rotate:-50},
          {frame:210,x:0,y:0,rotate:-6},{frame:269,x:0,y:0,rotate:-9}],poseCadence:2}),
    wax("hand-glove","M59 44Q66 31 78 35L80 48Q73 61 61 58Z",
      {x:56,y:31,width:29,height:34},boot,{parentId:"front-arm",spacing:4.5}),
    contour("sleeve-rib","M51 13Q65 18 72 30M48 25Q60 28 69 35",
      1.8,{parentId:"front-arm",color:"#bbc1b1",opacity:.82}),
    contour("flower-stem","M68 34 Q84 -12 88 -44",2.9,{color:"#648568",
      parentId:"front-arm",timing:{start:38,end:98}}),
    wax("flower-leaf","M78 -14Q58 -31 52 -19Q63 -4 78 -14Z"+
      "M84 -26Q89 -48 111 -40Q105 -22 84 -26Z",
      {x:48,y:-53,width:69,height:52},sage,{parentId:"front-arm",timing:{start:38,end:105},spacing:5}),
    wax("flower-petals","M86 -60Q73 -84 62 -69Q57 -60 72 -51"+
      "Q48 -50 56 -32Q66 -27 80 -42Q80 -19 95 -28Q105 -34 102 -43"+
      "Q121 -35 122 -51Q119 -63 102 -58Q112 -82 96 -79Q87 -76 86 -60Z",
      {x:43,y:-89,width:84,height:72},honey,{parentId:"front-arm",timing:{start:40,end:106},spacing:4}),
    contour("petal-etching","M86 -53Q75 -65 68 -69M85 -49Q64 -46 58 -38"+
      "M91 -48Q106 -55 115 -53M89 -43Q89 -35 91 -29",1.5,
      {parentId:"front-arm",color:"#c38a68",opacity:.68,timing:{start:48,end:123}}),
    wax("flower-center","M84 -53Q94 -58 99 -49Q99 -40 90 -37Q83 -39 84 -53Z",
      {x:80,y:-58,width:23,height:23},plum,
      {parentId:"front-arm",timing:{start:45,end:116},spacing:4}),
    // Directed fine art in the head, coat and fabric, parented to anatomical
    // masses. Only density changes; the opaque painted silhouette does not.
    contour("face-fur-grain",crayonFormHatching({seed:88,cx:-25,cy:-121,
      rx:25,ry:20,angle:65,count:Math.round(4+detail*31),length:8}),1.1,
      {parentId:"head",color:"#6c5250",opacity:.38}),
    contour("face-cheek-grain",crayonFormHatching({seed:90,cx:30,cy:-77,
      rx:12,ry:18,angle:-63,count:Math.round(3+detail*21),length:7}),1,
      {parentId:"head",color:"#493f42",opacity:.42}),
    contour("left-ear-fur",crayonFormHatching({seed:191,cx:-49,cy:-160,
      rx:6,ry:27,angle:78,count:Math.round(4+detail*23),length:11}),1.15,
      {parentId:"left-ear",color:"#f2d7b4",opacity:.62}),
    contour("right-ear-fur",crayonFormHatching({seed:192,cx:44,cy:-162,
      rx:6,ry:26,angle:-74,count:Math.round(4+detail*23),length:10}),1.15,
      {parentId:"right-ear",color:"#f2d7b4",opacity:.62}),
    contour("left-coat-weave",crayonFormHatching({seed:260,cx:-38,cy:36,
      rx:11,ry:44,angle:62,count:Math.round(6+detail*49),length:11}),1,
      {parentId:"body",color:"#c4bdaa",opacity:.43}),
    contour("right-coat-weave",crayonFormHatching({seed:261,cx:37,cy:36,
      rx:10,ry:42,angle:114,count:Math.round(6+detail*48),length:11}),1,
      {parentId:"body",color:"#c4bdaa",opacity:.42}),
    contour("waistcoat-fiber",crayonFormHatching({seed:265,cx:1,cy:31,
      rx:5,ry:33,angle:82,count:Math.round(4+detail*30),length:8}),1,
      {parentId:"body",color:"#9e7762",opacity:.52}),
    contour("boot-wear",crayonFormHatching({seed:270,cx:28,cy:155,
      rx:13,ry:5,angle:16,count:Math.round(3+detail*16),length:6}),1.1,
      {parentId:"body",color:"#cebea9",opacity:.5}),
    contour("iris-petal-hatching",crayonFormHatching({seed:280,cx:86,cy:-52,
      rx:15,ry:14,angle:77,count:Math.round(4+detail*29),length:7}),1.1,
      {parentId:"front-arm",color:"#a67f5d",opacity:.46}),
    contour("iris-leaf-veins","M55 -18Q65 -19 78 -14M90 -28Q100 -36 108 -40",
      1.25,{parentId:"front-arm",color:"#425f5a",opacity:.67}),
    // The edge-of-frame flora provides scale and a grounded visual baseline.
    ...[.15,.32,.69,.89].map((ratio,i):CrayonElement=>{
      const fx=W*ratio, fy=H*(portrait ? .77 : .82)+(i%2?8:-6);
      return contour("meadow-sprig-"+i,
        `M${fx} ${fy+28} Q${fx-9} ${fy+7} ${fx-5} ${fy-5} M${fx-5} ${fy+13} l-10 -8 M${fx-5} ${fy+7} l11 -11`,
        3,{color:i%2?"#677b66":"#718467",opacity:.77,timing:{start:44,end:176}});
    }),
    // Captions live above the paper texture, unrotated and camera-independent.
    {kind:"lettering",id:"eyebrow",timing:{start:0,end:45},screenSpace:true,
      lines:["FIELD JOURNAL    /    STUDY NO. 06"],x:portrait?32:52,y:portrait?58:57,
      fontSize:portrait?12:15,family:"sans",weight:700,color:"#53576a"},
    {kind:"lettering",id:"headline",timing:{start:5,end:64},screenSpace:true,
      lines:portrait?["AFTER","THE RAIN"] : ["AFTER THE RAIN"],x:portrait?32:52,y:portrait?138:117,
      fontSize:portrait?48:57,lineHeight:1.08,family:"serif",weight:700,color:"#4f566b"},
    {kind:"lettering",id:"caption",timing:{start:85,end:144},screenSpace:true,
      lines:["THE LAST IRIS OF AUTUMN"],x:W/2,y:portrait?H*.84:H*.88,
      fontSize:portrait?21:26,anchor:"middle",family:"serif",weight:700,color:"#4c5363",
      backing:{color:"#f6ebd5",padding:12,width:portrait?340:420,height:52,radius:8}},
    {kind:"lettering",id:"footer",timing:{start:169,end:269},screenSpace:true,
      lines:["WAX CRAYON   /   OBSERVATION IN MOTION"],
      x:portrait?32:52,y:H-31,fontSize:portrait?10:13,family:"sans",weight:600,color:"#586675"},
  ];
  return {version:1,id:"crayon-performance-"+aspect,width:W,height:H,durationFrames:270,
    seed:237,paper:"#f4eedf",paperTooth:.73,elements,
    camera:[{frame:0,focusX:W/2,focusY:H/2,zoom:1},
      {frame:145,focusX:W/2,focusY:H/2+6,zoom:1.035},
      {frame:269,focusX:W/2,focusY:H/2,zoom:1}]};
}
