import type { CrayonColor, CrayonElement, CrayonSceneSpec } from "../../registry/video/materials/crayon-scene";

/**
 * Original CRAYON1 performance study. All dialogue timing is authored rather
 * than inferred from text: downstream editors may populate the same cue format
 * from aligned voice recordings. No borrowed characters, fonts or audio.
 */
export type CrayonPerformanceAspect = "landscape" | "portrait";
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

export function crayonPerformanceScene(aspect:CrayonPerformanceAspect):CrayonSceneSpec {
  const portrait=aspect==="portrait", W=portrait?540:960,H=portrait?960:540;
  const ox=W*.51, oy=portrait?H*.65:H*.63;
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
    wax("body","M-41 -58 Q-67 -53 -71 -22 C-77 12 -55 73 -42 94 Q-5 113 46 93 C60 69 76 5 59 -30 Q40 -63 8 -64 Q-20 -68 -41 -58Z",
      {x:-81,y:-72,width:161,height:191},berries,{
        placement:{x:ox,y:oy},motion:bodyMotion,poseCadence:2}),
    wax("foot-back","M-48 144 Q-29 138 -16 146 L-9 160 Q-24 175 -52 169Z",
      {x:-55,y:137,width:51,height:39},boot,{parentId:"body",pressure:.84,spacing:4.5,
        contacts:[{start:0,end:269,anchor:{x:-29,y:166}}]}),
    wax("foot-front","M15 143 Q34 137 49 147 L58 161 Q40 176 15 169Z",
      {x:9,y:136,width:53,height:42},boot,{parentId:"body",pressure:.84,spacing:4.5,
        contacts:[{start:0,end:269,anchor:{x:31,y:166}}]}),
    wax("belly","M-14 -25Q0 -9 14 -24 L10 76 Q0 91 -8 76Z",
      {x:-18,y:-29,width:37,height:124},honey,
      {parentId:"body",pressure:.58,spacing:5}),
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
    wax("head","M-48 -127 Q-54 -144 -25 -157 C4 -175 42 -157 52 -133 Q64 -109 51 -85 L41 -59 Q14 -27 -11 -46 Q-41 -48 -51 -83 Q-59 -106 -48 -127Z",
      {x:-65,y:-177,width:126,height:157},berries,{
        parentId:"body",pivot:{x:0,y:-71},motion:headMotion,poseCadence:2}),
    wax("muzzle","M-25 -89Q-6 -107 9 -92Q27 -99 38 -76Q28 -47 5 -43 Q-16 -41 -31 -65Z",
      {x:-38,y:-110,width:81,height:75},honey,
      {parentId:"head",pressure:.62,spacing:5}),
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
    contour("left-eye","M-27 -101 a5 6 0 1 0 10 0 a5 6 0 1 0 -10 0",3.4,{
      parentId:"head",poseCadence:2,
      poses:[{id:"blink",d:"M-29 -103 Q-22 -95 -15 -103"},
        {id:"soft",d:"M-29 -104 Q-22 -109 -15 -103"},
        {id:"smile",d:"M-30 -105 Q-22 -115 -14 -103"}],
      poseCues:blinkCues}),
    contour("right-eye","M17 -101 a5 6 0 1 0 10 0 a5 6 0 1 0 -10 0",3.4,{
      parentId:"head",poseCadence:2,
      poses:[{id:"blink",d:"M15 -103 Q22 -95 29 -103"},
        {id:"soft",d:"M15 -104 Q22 -109 29 -103"},
        {id:"smile",d:"M14 -103 Q22 -115 30 -105"}],
      poseCues:blinkCues}),
    contour("freckles-left","M-45 -81 l5 1 M-44 -75 l4 2 M-38 -79 l4 1",2,
      {parentId:"head",color:"#c16f65",opacity:.74}),
    contour("freckles-right","M40 -81 l5 1 M40 -75 l4 2 M34 -79 l4 1",2,
      {parentId:"head",color:"#c16f65",opacity:.74}),
    wax("nose","M0 -85Q7 -88 12 -83L7 -76Q2 -73 -2 -79Z",
      {x:-5,y:-91,width:21,height:22},plum,
      {parentId:"head",spacing:4,pressure:.8}),
    contour("mouth","M-9 -64 Q0 -58 9 -64",4.4,{
      parentId:"head",poseCadence:2,
      poses:[
        {id:"mbp",d:"M-12 -64 Q0 -61 12 -64"},
        {id:"ah",d:"M-11 -65 C-12 -46 12 -45 11 -65Z"},
        {id:"ee",d:"M-17 -66 Q0 -49 17 -66"},
        {id:"oh",d:"M-7 -63 a7 10 0 1 0 14 0 a7 10 0 1 0 -14 0"},
        {id:"fv",d:"M-13 -67 Q0 -61 13 -67 M-10 -62 H10"},
        {id:"smile",d:"M-17 -65 Q0 -41 17 -65"},
      ],poseCues:mouthCues}),
    wax("front-arm","M43 -9Q68 -5 76 21Q83 49 59 61L42 47L55 24Z",
      {x:36,y:-17,width:52,height:83},fieldCoat,{parentId:"body",pivot:{x:49,y:10},
        motion:[{frame:0,x:0,y:0,rotate:-9},{frame:60,x:0,y:0,rotate:-27},
          {frame:96,x:0,y:0,rotate:-67},{frame:145,x:0,y:0,rotate:-50},
          {frame:210,x:0,y:0,rotate:-6},{frame:269,x:0,y:0,rotate:-9}],poseCadence:2}),
    contour("flower-stem","M66 29 Q83 -8 87 -38",4,{color:"#648568",
      parentId:"front-arm",timing:{start:38,end:98}}),
    wax("flower-leaf","M77 -14 Q56 -28 53 -14 Q63 3 77 -14Z M83 -24 Q93 -42 104 -30 Q101 -16 83 -24Z",
      {x:50,y:-44,width:58,height:49},sage,{parentId:"front-arm",timing:{start:38,end:105},spacing:5}),
    wax("flower-petals","M86 -59 C77 -80 60 -71 65 -55 C46 -59 49 -37 69 -35 C69 -17 90 -16 95 -35 C115 -26 123 -47 105 -53 C113 -67 98 -77 86 -59Z",
      {x:45,y:-82,width:81,height:69},honey,{parentId:"front-arm",timing:{start:40,end:106},spacing:4}),
    contour("petal-etching","M86 -53 L74 -66 M85 -48 L60 -48 M91 -45 L105 -42 M88 -42 L83 -27",2,
      {parentId:"front-arm",color:"#c38a68",opacity:.68,timing:{start:48,end:123}}),
    wax("flower-center",egg(86,-45,6,7),{x:79,y:-53,width:14,height:16},plum,
      {parentId:"front-arm",timing:{start:45,end:116},spacing:4}),
    // The edge-of-frame flora provides scale and a grounded visual baseline.
    ...[.15,.32,.69,.89].map((ratio,i):CrayonElement=>{
      const fx=W*ratio, fy=H*(portrait ? .77 : .82)+(i%2?8:-6);
      return contour("meadow-sprig-"+i,
        `M${fx} ${fy+28} Q${fx-9} ${fy+7} ${fx-5} ${fy-5} M${fx-5} ${fy+13} l-10 -8 M${fx-5} ${fy+7} l11 -11`,
        3,{color:i%2?"#677b66":"#718467",opacity:.77,timing:{start:44,end:176}});
    }),
    // Captions live above the paper texture, unrotated and camera-independent.
    {kind:"lettering",id:"eyebrow",timing:{start:0,end:45},screenSpace:true,
      lines:["CRAYON PERFORMANCE   /   ORIGINAL CHARACTER"],x:portrait?32:52,y:portrait?58:57,
      fontSize:portrait?12:15,family:"sans",weight:700,color:"#53576a"},
    {kind:"lettering",id:"headline",timing:{start:5,end:64},screenSpace:true,
      lines:portrait?["THE LITTLE","FLOWER"] : ["THE LITTLE FLOWER"],x:portrait?32:52,y:portrait?138:117,
      fontSize:portrait?48:57,lineHeight:1.08,family:"serif",weight:700,color:"#4f566b"},
    {kind:"lettering",id:"caption",timing:{start:85,end:144},screenSpace:true,
      lines:["HELLO, LITTLE FLOWER!"],x:W/2,y:portrait?H*.84:H*.88,
      fontSize:portrait?25:32,anchor:"middle",family:"serif",weight:700,color:"#4c5363",
      backing:{color:"#f6ebd5",padding:12,width:portrait?340:420,height:52,radius:8}},
    {kind:"lettering",id:"footer",timing:{start:169,end:269},screenSpace:true,
      lines:["ORIGINAL WAX DRAWING  /  30 FPS"],
      x:portrait?32:52,y:H-31,fontSize:portrait?10:13,family:"sans",weight:600,color:"#586675"},
  ];
  return {version:1,id:"crayon-performance-"+aspect,width:W,height:H,durationFrames:270,
    seed:237,paper:"#f4eedf",paperTooth:.73,elements,
    camera:[{frame:0,focusX:W/2,focusY:H/2,zoom:1},
      {frame:145,focusX:W/2,focusY:H/2+6,zoom:1.035},
      {frame:269,focusX:W/2,focusY:H/2,zoom:1}]};
}
