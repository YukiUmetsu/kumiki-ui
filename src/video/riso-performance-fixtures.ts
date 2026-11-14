import type {
  RisoActorSpec, RisoCharacterSceneSpec, RisoJointSpec, RisoMarkSet,
  RisoPoseKey, RisoSceneLayer, RisoVariantKey,
} from "../../registry/video/riso-performance";
import type { RisoPrintSpec } from "../../registry/video/print-plates";

export type RisoPerformanceAspect = "landscape" | "portrait";
export type RisoPerformanceSubject = "postcard" | "night-garden";
const ink = (d: string, type: "solid" | "dots" = "solid", opacity = 1) =>
  ({ d, ink: type, opacity } as const);
const marks = (blue?: string, red?: string, blueDots?: boolean, redDots?: boolean): RisoMarkSet => ({
  ...(blue ? { blue: ink(blue, blueDots ? "dots" : "solid") } : {}),
  ...(red ? { red: ink(red, redDots ? "dots" : "solid") } : {}),
});
const key = (frame:number,x=0,y=0,rotate=0,scale=1,ease:"smooth"|"linear"|"hold"="smooth"):RisoPoseKey =>
  ({frame,x,y,rotate,scale,ease});
const variant = (frame:number,name:string):RisoVariantKey=>({frame,name});
const part = (id:string,pivot:readonly[number,number],set:RisoMarkSet,
  opts:Partial<RisoJointSpec>={}):RisoJointSpec=>({id,pivot,marks:set,...opts});
const all = (...layers: RisoSceneLayer[]) => layers;
const P_BLUE = "#225DA1", P_RED = "#D85C43", PAPER = "#F3EAD8";

function courier(x:number,y:number):RisoActorSpec {
  return {id:"courier",origin:[x,y],cadence:2,
    motion:[key(0,-108,7,0,.92),key(66,0,0),key(135,0,0),key(210,13,0),key(299,18,0)],
    joints:[
      part("back-legs",[-25,-4],marks("M-15 0 L14 0 L14 91 Q3 104 -16 91 Z"),{
        z:-5,motion:[key(0,0,0,-12),key(18,0,0,13),key(36,0,0,-12),key(54,0,0,13),
          key(72),key(299)],}),
      part("rear-leg",[23,-4],marks("M-12 0 L15 0 L14 93 Q5 102 -12 91 Z"),{
        z:-4,motion:[key(0,0,0,13),key(18,0,0,-12),key(36,0,0,13),
          key(54,0,0,-12),key(72),key(299)]}),
      part("left-boot",[-1,84],marks(undefined,
        "M-18 -2 L12 -4 L20 8 Q-2 17 -23 9 Z"),{parent:"back-legs",z:5}),
      part("right-boot",[2,86],marks(undefined,
        "M-14 -1 L13 -3 L24 10 Q4 19 -19 10 Z"),{parent:"rear-leg",z:5}),
      part("body",[0,0],marks(
        "M-46 -114 Q-22 -133 2 -128 Q37 -127 46 -108 L43 1 Q12 18 -44 2 Z",
        "M-46 -116 Q-26 -139 -15 -122 L-30 -87 Q-42 -92 -46 -116 Z M28 -123 Q42 -115 49 -100 L42 -87 Q26 -91 28 -123 Z"),{
        z:0,
      }),
      part("coat-stitch",[0,-72],marks(undefined,
        "M-1 -34 L2 45 L-1 46 Z M8 -20 h5 v3 h-5 Z M8 0 h5 v3 h-5 Z M8 20 h5 v3 h-5 Z M-24 42 Q0 48 24 39 L21 44 Q0 54 -25 46 Z"),{parent:"body",z:1}),
      part("satchel",[32,-46],marks(undefined,
        "M-22 -32 Q0 -42 23 -29 L25 23 Q4 35 -22 20 Z M-18 -30 L18 7"),{parent:"body",z:2}),
      part("neck",[0,-118],marks("M-12 -9 H12 V22 H-12 Z"),{parent:"body",z:4}),
      part("head",[0,-145],marks(
        "M0 -34 C-40 -36 -41 29 0 36 C42 36 39 -38 0 -34 Z",
        "M-30 -16 Q-18 -42 15 -37 Q29 -34 32 -8 L20 -12 Q-11 -23 -30 -16 Z"),{
        parent:"body",z:8,
        motion:[key(0,0,0,-7),key(66),key(135),key(174,0,0,10),key(206),key(299)]}),
      part("cap-brim",[-2,-23],marks(undefined,
        "M-41 3 Q-4 -19 37 -4 L42 3 Q-3 -1 -38 11 Z"),{parent:"head",z:9}),
      part("nose",[0,9],marks("M-3 -2 L3 -2 L6 3 L-4 4 Z"),{parent:"head",z:11}),
      part("cheeks",[0,13],marks(undefined,
        "M-29 -1 Q-21 -5 -17 2 Q-22 7 -29 3 Z M17 0 Q24 -5 30 -1 L30 3 Q21 7 17 0 Z"),{parent:"head",z:10}),
      part("eyes",[-17,-4],marks("M0 0 a3 4 0 1 0 6 0 a3 4 0 1 0 -6 0 M35 0 a3 4 0 1 0 6 0 a3 4 0 1 0 -6 0"),{
        parent:"head",z:10,
        variants:{
          open:marks("M0 0 a3 4 0 1 0 6 0 a3 4 0 1 0 -6 0 M35 0 a3 4 0 1 0 6 0 a3 4 0 1 0 -6 0"),
          blink:marks("M-2 0 H9 V2 H-2 Z M33 0 H44 V2 H33 Z"),
        },
        variantKeys:[variant(0,"open"),variant(96,"blink"),variant(100,"open"),
          variant(173,"blink"),variant(178,"open"),variant(265,"blink"),variant(269,"open")],
      }),
      part("mouth",[1,15],marks(undefined,"M-9 2 Q0 9 9 2 Q0 14 -9 2 Z"),{
        parent:"head",z:10,
        variants:{
          rest:marks(undefined,"M-9 0 Q0 4 9 0 L8 3 Q0 7 -8 3 Z"),
          talk:marks(undefined,"M-7 -3 Q0 -9 7 -3 Q13 12 0 13 Q-13 12 -7 -3 Z"),
          smile:marks(undefined,"M-9 0 Q0 9 9 0 Q3 12 -3 12 Z"),
        },
        variantKeys:[variant(0,"rest"),variant(112,"smile"),variant(141,"talk"),variant(151,"rest"),
          variant(161,"talk"),variant(169,"smile"),variant(299,"rest")],
      }),
      part("left-arm",[-43,-93],marks(
        "M-10 0 Q5 -8 11 7 L22 65 Q17 83 6 78 L-15 12 Z",
        "M6 70 Q12 78 19 75 L23 81 Q4 99 -1 86 Z"),{
        parent:"body",z:1,motion:[key(0),key(76),key(116,0,0,13),key(132,0,0,0),key(299)]}),
      part("right-arm",[44,-97],marks(
        "M-9 -2 Q9 -9 18 8 L16 70 Q5 91 -8 75 Z",
        "M-8 74 Q6 85 17 70 L25 75 Q14 96 -5 88 Z"),{
        parent:"body",z:5,motion:[key(0),key(83),key(128,0,0,-122),
          key(158,0,0,-114),key(194,0,0,-126),key(222),key(299)]}),
      part("scarf",[2,-115],marks(undefined,
        "M-35 -11 Q0 12 30 -10 L22 9 Q-4 19 -29 9 Z M-15 6 L-9 41 L2 43 L2 7 Z"),{
        parent:"body",z:15,motion:[key(0),key(80,0,0,8),key(118,0,0,-7),key(152),key(299)]}),
    ]};
}
function bird(x:number,y:number):RisoActorSpec {
  const wingBlue="M0 0 C-19 -19 -44 -31 -59 -18 Q-54 3 -16 20 Q0 15 0 0 Z";
  return {id:"little-bird",origin:[x,y],cadence:2,
    motion:[key(0,108,-74,0,.9),key(46,20,-15,0,1),key(110,0,3),
      key(150,-18,10),key(200,-32,26),key(258,-20,22),key(299,-20,22)],
    joints:[
      part("tail",[-25,12],marks("M0 0 Q-25 -4 -48 -23 L-31 1 L-51 15 Q-20 24 0 0 Z"),{z:-9,
        motion:[key(0,0,0,-10),key(20,0,0,15),key(42,0,0,-10),key(64,0,0,15),
          key(86,0,0,-10),key(108),key(299)]}),
      part("body",[0,0],marks("M-28 -9 C-35 -39 16 -41 38 -11 C55 27 8 43 -18 26 C-34 15 -31 6 -28 -9 Z",
        "M-17 18 Q5 45 30 14 Q26 44 0 43 Q-23 41 -17 18 Z"),{z:0}),
      part("left-wing",[-10,-10],marks(wingBlue,"M-48 -16 Q-20 -19 -10 -8 L-29 -3 Z"),{
        parent:"body",z:-1,motion:[key(0,0,0,-48),key(12,0,0,21),key(24,0,0,-48),
          key(36,0,0,21),key(48,0,0,-48),key(60,0,0,21),key(72),key(110),
          key(154,0,0,-13),key(166,0,0,19),key(178,0,0,-13),
          key(196),key(299)]}),
      part("left-feather-lines",[-14,-9],marks(undefined,
        "M-12 -6 Q-28 -17 -48 -17 L-35 -15 Q-19 -9 -6 2 Z M-6 4 Q-25 8 -41 2 L-30 10 Q-14 15 -6 9 Z"),{
        parent:"left-wing",z:7}),
      part("right-wing",[16,-8],marks("M0 0 Q18 -48 47 -44 Q51 -12 23 25 Z",undefined,true),{
        parent:"body",z:5,motion:[key(0,0,0,31),key(12,0,0,-23),key(24,0,0,31),
          key(36,0,0,-23),key(48,0,0,31),key(60,0,0,-23),
          key(72),key(110),key(150,0,0,9),key(195),key(299)]}),
      part("right-feather-lines",[4,-14],marks(undefined,
        "M0 0 Q17 -23 35 -25 L27 -15 Q12 -9 2 6 Z M2 10 Q17 18 29 9 L29 16 Q13 27 2 14 Z"),{
        parent:"right-wing",z:7}),
      part("head",[23,-17],marks("M-22 -5 C-23 -32 13 -35 29 -18 Q46 2 25 20 Q0 37 -18 11 Z",
        "M-14 -24 Q7 -38 22 -22 Q2 -27 -14 -12 Z"),{parent:"body",z:10,
        motion:[key(0),key(130,0,0,-4),key(168,0,0,7),key(198),key(299)]}),
      part("beak",[24,4],marks(undefined,"M0 0 L29 -8 L20 9 Z"),{parent:"head",z:11,
        variants:{
          closed:marks(undefined,"M0 0 L29 -8 L20 9 Z"),
          chirp:marks(undefined,"M0 -3 L30 -18 L22 -2 L32 6 L14 11 Z"),
        },variantKeys:[variant(0,"closed"),variant(125,"chirp"),variant(135,"closed"),
          variant(150,"chirp"),variant(168,"closed")]}),
      part("crest",[0,-25],marks(undefined,
        "M-3 0 Q-14 -22 -4 -35 Q-3 -18 5 -8 Q3 -31 14 -36 Q13 -12 10 0 Z"),{
        parent:"head",z:9}),
      part("bird-eye",[3,-8],marks("M0 0 a4 4 0 1 0 8 0 a4 4 0 1 0 -8 0"),{
        parent:"head",z:11,
        variants:{open:marks("M0 0 a4 4 0 1 0 8 0 a4 4 0 1 0 -8 0"),
          blink:marks("M-3 0 H12 V2 H-3 Z")},
        variantKeys:[variant(0,"open"),variant(90,"blink"),variant(94,"open"),variant(215,"blink"),variant(219,"open")],
      }),
      part("feet",[-1,25],marks(undefined,"M0 0 L-6 15 L-23 20 L-2 19 L5 25 L5 16 L15 19 L8 12 Z"),{
        parent:"body",z:9}),
    ]};
}
function fox(x:number,y:number):RisoActorSpec {
  return {id:"fox",origin:[x,y],cadence:3,motion:[key(0,-58,0),key(86,0,0),
    key(160,0,0),key(220,36,0),key(299,40,0)],joints:[
    part("tail",[-31,-16],marks(undefined,
      "M0 0 Q-79 3 -99 -31 Q-125 -88 -74 -105 Q-57 -66 -25 -66 Q-4 -60 0 0 Z"),{
      z:-20,motion:[key(0,0,0,-12),key(24,0,0,8),key(48,0,0,-12),key(72,0,0,8),
        key(96,0,0,-12),key(120),key(180,0,0,15),key(230),key(299)]}),
    part("body",[0,0],marks("M-43 -47 Q0 -79 44 -42 L40 35 Q12 68 -40 34 Z",
      "M-30 0 Q0 37 26 0 L23 34 Q-4 58 -27 31 Z"),{z:0}),
    part("head",[6,-70],marks(undefined,
      "M-49 -15 L-40 -70 L-11 -47 L22 -57 L56 -79 L50 -17 Q64 29 12 44 Q-39 40 -49 -15 Z"),{
      parent:"body",z:6,motion:[key(0,0,0,-4),key(86),key(164,0,0,8),key(226),key(299)]}),
    part("face",[1,4],marks("M-24 -5 Q-20 14 -1 5 Q11 15 21 -6 L19 -1 Q3 35 -21 -1 Z"),{
      parent:"head",z:7}),
    part("ear-linings",[6,-40],marks("M-34 -20 L-31 -52 L-14 -29 Z M18 -38 L44 -56 L39 -21 Z",undefined,true),{
      parent:"head",z:9}),
    part("nose-and-whiskers",[0,12],marks("M-8 -2 L8 -2 L0 8 Z M-3 8 L-34 17 L-23 17 L-3 12 Z M3 8 L34 17 L23 17 L3 12 Z"),{
      parent:"head",z:10}),
    part("fox-mouth",[0,22],marks(undefined,"M-9 0 Q0 6 9 0 Q0 12 -9 0 Z"),{
      parent:"head",z:12,
      variants:{rest:marks(undefined,"M-8 0 Q0 5 8 0 L7 3 Q0 8 -7 3 Z"),
        surprised:marks(undefined,"M-4 -3 Q0 -10 4 -3 Q9 10 0 13 Q-9 10 -4 -3 Z")},
      variantKeys:[variant(0,"rest"),variant(153,"surprised"),variant(178,"rest")],
    }),
    part("eyes",[-25,-8],marks("M0 0 a3 4 0 1 0 6 0 a3 4 0 1 0 -6 0 M47 0 a3 4 0 1 0 6 0 a3 4 0 1 0 -6 0"),{
      parent:"head",z:10,variants:{
        open:marks("M0 0 a3 4 0 1 0 6 0 a3 4 0 1 0 -6 0 M47 0 a3 4 0 1 0 6 0 a3 4 0 1 0 -6 0"),
        closed:marks("M-1 0 H8 V3 H-1 Z M46 0 H56 V3 H46 Z")},
        variantKeys:[variant(0,"open"),variant(124,"closed"),variant(129,"open"),variant(210,"closed"),variant(215,"open")]}),
    part("fox-collar",[0,-38],marks("M-24 0 Q0 15 24 0 L14 16 Q0 27 -14 16 Z"),{
      parent:"body",z:12}),
    part("fur-markings",[0,3],marks(undefined,
      "M-25 -18 Q-18 -24 -12 -17 L-8 -11 Q-17 -11 -25 -18 Z M14 -14 Q19 -22 28 -16 L25 -9 Q16 -8 14 -14 Z M-15 12 L-9 28 L-3 12 Z M5 14 L12 27 L18 11 Z"),{
      parent:"body",z:8}),
    part("left-paw",[-26,30],marks("M-10 0 L9 0 L6 48 Q-4 60 -17 48 Z"),{
      parent:"body",z:9,motion:[key(0),key(142),key(176,0,0,24),key(210),key(299)]}),
    part("right-paw",[24,33],marks("M-9 0 L9 0 L12 47 Q1 57 -12 47 Z"),{
      parent:"body",z:9,motion:[key(0),key(102,0,0,-41),key(136,0,0,-54),
        key(176),key(299)]}),
  ]};
}
function moth(x:number,y:number):RisoActorSpec {
  return {id:"moon-moth",origin:[x,y],cadence:2,motion:[key(0,100,-15,0,.88),
    key(80,0,0),key(138,-20,28),key(194,-60,12),key(255,-22,0),key(299,0,0)],joints:[
      part("left-wing",[-7,-12],marks(undefined,
        "M0 0 Q-40 -80 -95 -49 Q-92 13 -24 40 Z"),{z:-10,
        motion:[key(0,0,0,16),key(14,0,0,-21),key(28,0,0,16),key(42,0,0,-21),
          key(56,0,0,16),key(70,0,0,-21),key(84),key(120,0,0,9),key(180),key(299)]}),
      part("right-wing",[7,-12],marks("M0 0 Q45 -90 96 -42 Q87 20 24 40 Z",undefined,true),{
        z:-9,motion:[key(0,0,0,-16),key(14,0,0,22),key(28,0,0,-16),
          key(42,0,0,22),key(56,0,0,-16),key(70,0,0,22),key(84),key(299)]}),
      part("wing-veins-left",[-8,-10],marks("M0 0 Q-18 -29 -61 -40 L-48 -32 Q-18 -23 0 10 Z M-3 12 Q-23 4 -57 -8 L-42 2 Q-19 23 -3 17 Z",undefined,true),{
        parent:"left-wing",z:7}),
      part("wing-veins-right",[8,-10],marks(undefined,
        "M0 0 Q21 -29 62 -41 L50 -32 Q17 -22 0 10 Z M3 14 Q21 7 57 -7 L41 6 Q18 23 3 16 Z"),{
        parent:"right-wing",z:7}),
      part("body",[0,0],marks("M-14 -37 Q0 -55 14 -37 L12 40 Q0 60 -12 40 Z",
        "M-5 -25 H5 V34 H-5 Z"),{z:0}),
      part("moth-dots",[0,-4],marks(undefined,
        "M-5 -15 a2 2 0 1 0 4 0 a2 2 0 1 0 -4 0 M-4 4 a2 2 0 1 0 4 0 a2 2 0 1 0 -4 0 M-3 23 a2 2 0 1 0 4 0 a2 2 0 1 0 -4 0"),{
        parent:"body",z:7}),
      part("antenna",[0,-39],marks(undefined,"M-1 3 Q-19 -18 -30 -17 L-26 -23 Q-6 -18 0 0 Q6 -18 26 -23 L30 -17 Q19 -18 1 3 Z"),{parent:"body",z:5}),
  ]};
}
function risoSpec(aspect:RisoPerformanceAspect, seed:number):RisoPrintSpec {
  const portrait=aspect==="portrait";
  return {
    version:1,width:portrait?540:960,height:portrait?960:540,paper:PAPER,
    seed,startFrame:0,passFrames:1,gapFrames:0,
    plates:[
      {id:"blue",color:P_BLUE,opacity:.96,dotCell:7,dotAngle:25,registration:[0,0]},
      {id:"red",color:P_RED,opacity:.92,dotCell:6,dotAngle:-15,registration:[2.4,-1.4]},
    ],
  };
}
export function risoPerformanceScene(subject:RisoPerformanceSubject,
  aspect:RisoPerformanceAspect):RisoCharacterSceneSpec {
  if (!["postcard","night-garden"].includes(subject)||!["landscape","portrait"].includes(aspect))
    throw new RangeError("Unknown Riso performance subject or aspect.");
  const portrait=aspect==="portrait";
  const width=portrait?540:960, height=portrait?960:540;
  const header=portrait?95:87, footer=portrait?885:493;
  const sceneTop=portrait?500:200;
  const originGround=portrait?650:370;
  const titleX=portrait?44:55;
  const title=subject==="postcard"?
    (portrait?["AN UNEXPECTED","POSTCARD"]:["AN UNEXPECTED POSTCARD"]) :
    (portrait?["THE MIDNIGHT","GARDEN"]:["THE MIDNIGHT GARDEN"]);
  const labels=subject==="postcard"?["SOME WORDS ARRIVE","WITHOUT AN ENVELOPE"]:
    ["SOME STORIES GROW","AFTER THE LIGHT FADES"];
  const layers=all(
    {id:"back-sky",kind:"path",plate:"blue",ink:"dots",
      d:"M0 "+(originGround-118)+" Q"+(width*.37)+" "+(originGround-203)+" "+width+" "+(originGround-120)+
        " L"+width+" "+(originGround+30)+" Q"+(width*.43)+" "+(originGround+9)+" 0 "+(originGround+35)+" Z",
      z:-80,parallax:.35},
    {id:"sun",kind:"path",plate:"red",ink:"dots",z:-76,
      d:"M"+(width*.79)+" "+(sceneTop-35)+" m-69 0 a69 69 0 1 0 138 0 a69 69 0 1 0 -138 0 Z",parallax:.30},
    {id:"distant-ridge",kind:"path",plate:"blue",ink:"dots",opacity:.69,z:-60,parallax:.56,
      d:"M0 "+(originGround-93)+" Q"+(width*.18)+" "+(originGround-210)+" "+(width*.40)+" "+(originGround-118)+
      " Q"+(width*.64)+" "+(originGround-250)+" "+width+" "+(originGround-130)+
      " L"+width+" "+(originGround+28)+" Q"+(width*.4)+" "+(originGround+21)+" 0 "+(originGround+32)+" Z"},
    {id:"ground",kind:"path",plate:"blue",ink:"solid",opacity:.88,z:-30,
      d:"M0 "+(originGround+80)+" Q"+(width*.46)+" "+(originGround+74)+" "+width+" "+(originGround+79)+
      " V"+(originGround+95)+" Q"+(width*.46)+" "+(originGround+90)+" 0 "+(originGround+96)+" Z"},
    {id:"ground-line",kind:"path",plate:"red",ink:"solid",opacity:.8,z:30,
      d:"M0 "+(originGround+81)+" Q"+(width*.5)+" "+(originGround+73)+" "+width+" "+(originGround+76)+
      " V"+(originGround+81)+" Q"+(width*.5)+" "+(originGround+78)+" 0 "+(originGround+85)+" Z"},
    {id:"top-rule",kind:"path",plate:"blue",ink:"solid",z:90,screenSpace:true,
      d:"M"+titleX+" "+(header-36)+" H"+(width-titleX)+" V"+(header-33)+" H"+titleX+" Z"},
    {id:"foot-rule",kind:"path",plate:"blue",ink:"solid",z:90,screenSpace:true,
      d:"M"+titleX+" "+(footer-22)+" H"+(width-titleX)+" V"+(footer-20)+" H"+titleX+" Z"},
    {id:"brand",kind:"text",plate:"blue",z:95,screenSpace:true,lines:["PRINTED TALES  /  Vol. 02"],
      x:titleX,y:header-48,fontSize:13,fontFamily:"sans",weight:700},
    {id:"headline",kind:"text",plate:"blue",z:95,screenSpace:true,lines:title,
      x:titleX,y:header+30,fontSize:portrait?43:51,fontFamily:"serif",weight:700,lineHeight:1.06},
    {id:"subheading",kind:"text",plate:"red",z:95,screenSpace:true,lines:labels,
      x:titleX,y:header+(portrait?150:66),fontSize:portrait?15:15,fontFamily:"sans",weight:700,lineHeight:1.5},
    {id:"footer",kind:"text",plate:"blue",z:95,screenSpace:true,
      lines:[subject==="postcard"?"A KIND WORD TRAVELS FAR":"LIGHT MOVES, STORIES REMAIN"],
      x:titleX,y:footer,fontSize:portrait?15:15,fontFamily:"sans",weight:700},
  ) as RisoSceneLayer[];
  if(subject==="postcard"){
    layers.push(
      {id:"letter",kind:"path",plate:"red",ink:"solid",z:12,
        d:"M"+(portrait?300:620)+" "+(originGround-33)+
        " l94 -20 l17 63 l-94 20 Z M"+(portrait?302:623)+" "+(originGround-27)+
        " l55 22 l39 -37 l-40 48 Z",
        motion:[key(0,0,60,7,.7),key(100,0,0,0,1),key(190,0,-10,-8,1),key(299,5,-8,-4,1)]});
  } else {
    layers.push(
      {id:"moon-stars",kind:"path",plate:"red",ink:"solid",z:-55,
        d:Array.from({length:9},(_,i)=>{
          const x=width*(.11+(i%5)*.18),y=originGround-245-(i%3)*38;
          return "M"+x+" "+(y-8)+" L"+(x+3)+" "+(y-2)+" L"+(x+9)+" "+y+" L"+(x+3)+" "+(y+2)+
            " L"+x+" "+(y+9)+" L"+(x-3)+" "+(y+2)+" L"+(x-9)+" "+y+" L"+(x-3)+" "+(y-2)+" Z";
        }).join(" "),parallax:.55});
  }
  const actors:RisoActorSpec[]=subject==="postcard"?
    [courier(portrait?207:326,originGround),bird(portrait?365:727,originGround-142)]:
    [fox(portrait?191:340,originGround),moth(portrait?357:695,originGround-164)];
  const camera=portrait?
    [{frame:0,focusX:270,focusY:520,zoom:1},{frame:160,focusX:270,focusY:530,zoom:1.035},
      {frame:299,focusX:267,focusY:528,zoom:1.02}]:
    [{frame:0,focusX:480,focusY:270,zoom:1},{frame:150,focusX:495,focusY:269,zoom:1.04},
      {frame:299,focusX:498,focusY:268,zoom:1.02}];
  return {
    version:1,id:"riso-"+subject+"-"+aspect,durationFrames:300,
    print:risoSpec(aspect,subject==="postcard"?41:91),actors,layers,camera,
  };
}

/** Stable references avoid rehashing paper grain on every FilmStage frame. */
const SCENES: Record<RisoPerformanceSubject,Record<RisoPerformanceAspect,RisoCharacterSceneSpec>> = {
  postcard:{
    landscape:risoPerformanceScene("postcard","landscape"),
    portrait:risoPerformanceScene("postcard","portrait"),
  },
  "night-garden":{
    landscape:risoPerformanceScene("night-garden","landscape"),
    portrait:risoPerformanceScene("night-garden","portrait"),
  },
};
export function risoPerformanceSceneStable(
  subject:RisoPerformanceSubject,aspect:RisoPerformanceAspect,
):RisoCharacterSceneSpec {
  return SCENES[subject][aspect];
}
