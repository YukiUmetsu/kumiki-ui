import type { CrayonColor, CrayonElement, CrayonSceneSpec } from "../../registry/video/materials/crayon-scene";

/**
 * Original CRAYON1 performance study. All dialogue timing is authored rather
 * than inferred from text: downstream editors may populate the same cue format
 * from aligned voice recordings. No borrowed characters, fonts or audio.
 */
export type CrayonPerformanceAspect = "landscape" | "portrait";
const berries = ["#cc896e","#b56765","#eeb19b"] as const;
const plum = ["#77748c","#5f5b79","#a9a1b0"] as const;
const sage = ["#779d80","#4e7a71","#a5b994"] as const;
const honey = ["#ecc180","#ca9867","#ffe1a1"] as const;
const cloud = ["#e9d5bd","#d8c7b9","#fff1dd"] as const;
const indigo = ["#67788f","#515e7e","#a2afbe"] as const;
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
  const bodyMotion=[
    {frame:0,x:0,y:0,rotate:0},
    {frame:68,x:0,y:4,rotate:-3},
    {frame:88,x:0,y:-7,rotate:3},
    {frame:120,x:0,y:-9,rotate:2},
    {frame:160,x:0,y:-3,rotate:-2},
    {frame:217,x:0,y:0,rotate:0},
    {frame:269,x:0,y:0,rotate:0},
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
    wax("tail","M-46 39 C-107 66 -129 8 -100 -9 C-85 -29 -66 -12 -46 5Z",
      {x:-135,y:-32,width:95,height:105},plum,{parentId:"body",pivot:{x:-46,y:24},
        motion:[{frame:0,x:0,y:0,rotate:-14},{frame:80,x:0,y:0,rotate:16},
          {frame:130,x:0,y:0,rotate:-9},{frame:190,x:0,y:0,rotate:21},
          {frame:269,x:0,y:0,rotate:-14}],poseCadence:2}),
    wax("left-ear",egg(-37,-126,20,43),{x:-59,y:-170,width:44,height:88},
      berries,{parentId:"head",pivot:{x:-37,y:-97}}),
    wax("right-ear",egg(37,-126,20,43),{x:15,y:-170,width:44,height:88},
      berries,{parentId:"head",pivot:{x:37,y:-97}}),
    wax("left-ear-inner",egg(-37,-127,9,27),{x:-48,y:-155,width:22,height:56},
      honey,{parentId:"head",spacing:4.5,pressure:.45}),
    wax("right-ear-inner",egg(37,-127,9,27),{x:26,y:-155,width:22,height:56},
      honey,{parentId:"head",spacing:4.5,pressure:.45}),
    wax("back-arm","M-48 15 Q-78 34 -73 69 Q-51 83 -36 45Z",
      {x:-82,y:10,width:50,height:81},berries,{parentId:"body",pivot:{x:-49,y:18},
        motion:[{frame:0,x:0,y:0,rotate:10},{frame:90,x:0,y:0,rotate:-12},
          {frame:180,x:0,y:0,rotate:12},{frame:269,x:0,y:0,rotate:10}]}),
    wax("body","M-61 3 C-75 -29 -54 -57 0 -63 C58 -63 77 -25 66 27 L62 78 Q0 113 -61 76Z",
      {x:-80,y:-70,width:160,height:188},berries,{
        placement:{x:ox,y:oy},motion:bodyMotion,poseCadence:2}),
    wax("foot-back",egg(-29,94,24,13),{x:-55,y:79,width:52,height:31},
      plum,{parentId:"body",pressure:.68,spacing:4.5}),
    wax("foot-front",egg(31,94,24,13),{x:4,y:79,width:54,height:31},
      plum,{parentId:"body",pressure:.68,spacing:4.5}),
    wax("belly",egg(0,30,37,53),{x:-40,y:-25,width:80,height:110},honey,
      {parentId:"body",pressure:.58,spacing:8}),
    wax("scarf-wrap","M-37 -38 Q0 -18 39 -38 L34 -20 Q0 1 -33 -22Z",
      {x:-42,y:-42,width:86,height:46},indigo,{parentId:"body",pressure:.82,spacing:5.5}),
    wax("scarf-tail","M21 -24 Q35 -18 46 -6 L56 25 L37 29 L24 0Z",
      {x:18,y:-27,width:42,height:60},indigo,{parentId:"body",pressure:.8,spacing:5}),
    contour("scarf-weave","M-29 -29 Q0 -8 31 -29 M38 16 L50 14",2.2,
      {parentId:"body",color:"#d5d9df",opacity:.75}),
    wax("head","M-63 -83 Q-69 -130 -29 -149 Q2 -161 38 -144 Q66 -126 64 -83 Q54 -47 4 -45 Q-47 -45 -63 -83Z",
      {x:-70,y:-164,width:140,height:124},berries,{
        parentId:"body",pivot:{x:0,y:-71},motion:headMotion,poseCadence:2}),
    wax("muzzle",egg(0,-77,38,27),{x:-40,y:-106,width:80,height:59},honey,
      {parentId:"head",pressure:.62,spacing:5}),
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
    wax("nose",egg(0,-85,8,6),{x:-9,y:-93,width:18,height:14},plum,
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
    wax("front-arm","M46 1 Q74 12 66 41 Q56 58 40 40Z",
      {x:36,y:-3,width:47,height:66},berries,{parentId:"body",pivot:{x:49,y:10},
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
    seed:237,paper:"#f6edda",paperTooth:.68,elements,
    camera:[{frame:0,focusX:W/2,focusY:H/2,zoom:1},
      {frame:145,focusX:W/2,focusY:H/2+6,zoom:1.035},
      {frame:269,focusX:W/2,focusY:H/2,zoom:1}]};
}
