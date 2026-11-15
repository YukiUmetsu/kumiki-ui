import { createPencilMaterialRegion } from "../../registry/video/colored-pencil-materials";
import type { PencilSurface } from "../../registry/video/colored-pencil-materials";
import type { PencilActorSpec, PencilActorPart, PencilPoseKey } from "../../registry/video/colored-pencil-actor";
import type { PencilAspect, PencilTrace } from "../../registry/video/colored-pencil";
import type { PencilSceneSpec } from "../../registry/video/colored-pencil-scene";
import { createPencilRegion } from "../../registry/video/colored-pencil";
import { pencilDemoScene } from "./colored-pencil-demo-scenes";
import { flowBundles } from "./colored-pencil-living-studies";

/**
 * Rebuilt from an empty character authoring slate (2026-11-14).
 * Reference study: Jo Walker's full fox, Ruff Sketchings' fox eye/ruff and
 * Andrew Forkner / Claire Milligan's kingfisher feather-and-beak construction.
 * Their artwork is not copied, traced or redistributed.
 */
const key=(frame:number,x=0,y=0,rotation=0,sx=1,sy=1):PencilPoseKey=>({
  frame, translate:[x,y], rotation, scale:[sx,sy],
});
const neutral=[key(0),key(319)];
const foxRust=["#C87A53","#8B4D45","#EDB787"] as const;
const foxLight=["#E7D0B7","#8C7776","#FFF1D7"] as const;
const foxDark=["#59555A","#303747","#B09C8C"] as const;
const birdBlue=["#3787A6","#214C79","#9FD3D4"] as const;
const birdCobalt=["#446D92","#1C3F66","#8CAFC2"] as const;
const birdOrange=["#E0A26C","#A76754","#F6CD97"] as const;

function trace(path:string,color:string,width=1,startFrame=181,opacity=.82):PencilTrace {
  return {path,color,width,startFrame,durationFrames:60,opacity};
}
type Colors=readonly [string,string,string];
interface PartInput {
  id:string;
  path:string;
  bounds:readonly [number,number,number,number];
  colors:Colors;
  pivot:readonly [number,number];
  keys?:readonly PencilPoseKey[];
  parent?:string;
  material:PencilSurface | "feather";
  direction?:number;
  flow?:number;
  details?:readonly PencilTrace[];
  startFrame?:number;
}
/** Shape / silhouette first, independent pigment region and child joints second. */
function part(input:PartInput):PencilActorPart {
  const seed=([...input.id].reduce((n,c)=>Math.imul(n,31)+c.charCodeAt(0)|0,4137)>>>0)%2000000000;
  const region=input.material==="feather" ?
    createPencilRegion({
      id:input.id,path:input.path,bounds:input.bounds,palette:input.colors,
      seed,startFrame:input.startFrame??36,durationFrames:158,
      material:"dense",direction:input.direction??-36,flow:input.flow??27,
      tone:"core",texture:"fiber",opaqueSupport:true,clipDetails:true,
      underpaintOpacity:.84,details:input.details,contourColor:"#3A5362",
    }) :
    createPencilMaterialRegion({
      id:input.id,path:input.path,bounds:input.bounds,palette:input.colors,
      surface:input.material,seed,startFrame:input.startFrame??36,durationFrames:158,
      direction:input.direction,flow:input.flow,details:input.details,
    });
  return {id:input.id,parent:input.parent,pivot:input.pivot,keys:input.keys??neutral,region};
}
const strokeFox=(guides:Parameters<typeof flowBundles>[0],seed:number,
  color="#F8D0A4",width=.62,start=205)=>flowBundles(guides,seed,color,width,start);

export const FOX_REBUILT_PARTS=[
  "tail","tail-tip","far-foreleg","torso","near-hindleg","near-foreleg","ruff",
  "head","ear-interiors","muzzle","nose","eye",
] as const;
function fox():PencilActorSpec {
  const parts:PencilActorPart[]=[
    part({id:"tail",material:"fur",colors:foxRust,pivot:[72,137],
      keys:[key(0),key(155),key(181,0,-2,-8),key(208,0,2,7),
        key(234,0,0,-5),key(275,0,1,4),key(319)],
      path:"M73 128 Q40 113 2 101 Q-27 97 -48 106 Q-42 123 -25 139 Q2 158 38 162 Q64 159 76 145 Z",
      bounds:[-52,93,133,78],direction:25,flow:29,
      details:[
        ...strokeFox([[6,115,46,158,5,157,27,15],[13,130,54,163,29,155,24,13],
          [27,110,65,143,39,126,22,15]],1229,"#F1BE83",.73),
        trace("M-21 125 Q-16 150 6 167 M7 104 Q36 112 59 134",
          "#554D54",1.8,214),
        trace("M-26 141 Q-16 162 13 176","#FFF0D0",1.2,231),
      ]}),
    // The light tip is a genuine connected tail-colour region, not a random
    // white sticker crossing the coat. It inherits every swing of the rump tail.
    part({id:"tail-tip",material:"fur",colors:foxLight,parent:"tail",
      pivot:[-35,120],direction:17,flow:25,
      path:"M-48 106 Q-35 115 -28 136 Q-21 144 -11 150 Q-30 147 -43 136 Q-54 121 -48 106 Z",
      bounds:[-55,102,47,52],
      details:[...strokeFox([[-44,113,-21,144,-39,130,16,8]],1241,"#FFF5DE",.59),
        trace("M-47 111 Q-43 126 -29 141","#F5D2BA",.75,228)]}),
    part({id:"far-foreleg",material:"fur",colors:foxDark,pivot:[159,147],
      path:"M148 145 Q157 143 166 152 Q168 171 162 191 L161 209 Q167 216 179 222 L142 222 Q146 215 147 206 Q140 175 148 145 Z",
      bounds:[138,141,44,85],direction:83,
      details:strokeFox([[154,158,150,209,156,190,15,10]],1251,"#BCA697",.62)}),
    part({id:"torso",material:"fur",colors:foxRust,pivot:[106,139],
      path:"M58 115 C78 99 120 95 159 111 Q183 115 190 137 Q187 159 167 177 Q139 186 106 179 Q80 185 60 168 Q46 147 58 115 Z",
      bounds:[44,94,150,95],direction:19,flow:21,
      details:[
        ...strokeFox([[60,113,106,165,79,144,28,16],
          [98,105,147,157,120,126,26,15],[133,108,177,154,166,127,22,11]],
          1297,"#F0B988",.64),
        trace("M62 116 Q110 93 150 113 M72 173 Q99 187 124 173",
          "#754E4B",1.1,220),
      ]}),
    part({id:"near-hindleg",material:"fur",colors:foxRust,parent:"torso",pivot:[78,158],
      path:"M68 154 Q89 149 101 163 Q100 180 91 193 L88 209 Q105 216 107 224 L56 224 Q64 217 72 205 L67 190 Q56 173 68 154 Z",
      bounds:[53,148,57,80],direction:77,
      details:[...strokeFox([[69,161,76,208,58,192,17,11]],1321,"#F0BC89",.59),
        trace("M63 219 Q78 223 101 220","#463B43",1.15,222)]}),
    part({id:"near-foreleg",material:"fur",colors:foxDark,parent:"torso",pivot:[154,158],
      keys:[key(0),key(171),key(199,0,0,-12),key(223,0,-3,-22),
        key(251,0,-1,-11),key(283),key(319)],
      path:"M147 150 Q161 144 171 151 Q176 166 170 184 L168 204 L173 213 Q184 215 191 223 L146 223 Q150 214 154 207 L148 176 Q143 164 147 150 Z",
      bounds:[143,141,51,84],direction:82,
      details:[...strokeFox([[160,161,164,211,149,191,18,9]],1343,"#B0A8A0",.61),
        trace("M151 217 Q168 222 186 221","#373540",1.3,228)]}),
    part({id:"ruff",material:"fur",colors:foxLight,parent:"torso",pivot:[168,131],
      path:"M160 117 Q178 107 195 116 Q201 126 194 142 L191 152 L202 155 L182 164 L184 176 L168 169 L159 180 L157 166 L144 165 Q147 150 153 139 Z",
      bounds:[141,103,65,81],direction:67,flow:31,
      details:strokeFox([[159,118,178,157,149,151,25,11],
        [178,119,193,155,189,139,21,10]],1373,"#FFF4D9",.66)}),
    part({id:"head",material:"fur",colors:foxRust,parent:"torso",pivot:[169,123],
      keys:[key(0),key(169),key(194,1,-1,-4),key(226,0,-4,-8),
        key(252,1,-1,-4),key(284),key(319)],
      path:"M156 112 Q146 99 154 84 Q156 71 156 55 Q158 43 166 47 Q173 59 177 78 Q186 77 200 70 Q204 56 211 51 Q220 50 217 66 L214 87 Q236 98 247 111 Q251 118 238 122 Q218 130 192 135 Q172 128 156 112 Z",
      bounds:[145,41,109,98],direction:31,flow:25,
      details:[
        ...strokeFox([[164,80,189,121,161,111,22,10],
          [193,77,221,110,207,83,22,10],[173,60,200,88,189,55,18,9]],
          1403,"#F4C392",.65),
        trace("M161 57 Q164 40 168 34 M203 61 Q209 44 216 41",
          "#513F49",1.3,221),
        trace("M155 99 Q169 126 181 138","#FBE6C1",1.5,235),
      ]}),
    part({id:"ear-interiors",material:"fur",colors:foxDark,parent:"head",pivot:[183,62],
      path:"M159 81 Q158 61 161 51 Q167 56 175 78 Z M200 79 Q206 62 212 55 Q215 67 210 87 Z",
      bounds:[156,48,62,42],direction:79,
      details:strokeFox([[168,44,169,70,172,55,13,6],
        [212,47,205,72,207,61,13,6]],1439,"#DCA68F",.54)}),
    part({id:"muzzle",material:"fur",colors:foxLight,parent:"head",pivot:[210,118],
      path:"M184 112 Q205 103 228 108 Q243 106 248 115 Q240 132 214 140 Q197 141 183 128 Z",
      bounds:[179,100,72,45],direction:18,flow:18,
      details:[
        ...strokeFox([[192,116,219,132,207,126,18,9]],1477,"#FAF1D9",.52,235),
        trace("M196 132 Q217 136 233 119","#3D434C",1.4,250),
        trace("M190 121 Q182 118 172 115 M191 128 Q182 132 167 135",
          "#C9B6AE",.62,248),
      ]}),
    part({id:"nose",material:"fur",colors:["#41414C","#1D2836","#8F7A70"],
      parent:"head",pivot:[239,114],
      path:"M241 111 Q250 110 253 114 Q253 122 245 124 Q239 118 241 111 Z",
      bounds:[238,107,18,20],direction:5,
      details:[trace("M237 111 Q241 110 244 113","#D6CBC0",.85,255)]}),
    part({id:"eye",material:"fur",colors:["#9D805D","#242F3F","#DCC29A"],
      parent:"head",pivot:[209,100],
      keys:[key(0),key(196),key(202,0,0,0,1,.16),
        key(208),key(267),key(274,0,0,0,1,.20),key(281),key(319)],
      path:"M198 98 Q204 89 212 95 Q215 99 210 104 Q203 105 199 102 Z",
      bounds:[196,87,21,20],direction:6,
      details:[
        trace("M198 100 Q207 89 216 96 M201 108 Q208 112 216 105",
          "#332B37",1.55,245),
        trace("M206 95 Q210 95 211 100 Q211 106 207 106 Q204 102 206 95",
          "#182737",2.4,253),
        trace("M207 96 L208 98","#FFF4D9",1.25,263),
      ]}),
  ];
  return {id:"fox",parts};
}

/**
 * An original compact kingfisher. Distinct planes: ivory/orange throat,
 * long near-black spear-shaped beak, teal crown with short broken rachises,
 * layered primaries and copper chest, rather than a generic blue round bird.
 */
export const KINGFISHER_REBUILT_PARTS=[
  "tail","far-wing","torso","breast","near-wing","wing-coverts","head",
  "cheek","beak","feet","eye",
] as const;
export function createKingfisherActor():PencilActorSpec {
  const parts:PencilActorPart[]=[
    part({id:"tail",material:"feather",colors:birdCobalt,pivot:[131,177],
      keys:[key(0),key(171),key(199,0,0,-7),key(227,0,0,5),key(280),key(319)],
      path:"M120 164 Q135 161 151 182 L161 235 Q153 240 147 225 L136 239 Q131 222 124 235 Q115 212 109 184 Z",
      bounds:[106,159,59,84],direction:76,
      details:strokeFox([[122,184,132,224,129,206,18,10],
        [139,181,152,230,144,205,18,8]],1611,"#9BD3D8",.67)}),
    part({id:"far-wing",material:"feather",colors:birdCobalt,pivot:[125,113],
      keys:[key(0),key(161),key(174,0,-3,-21),key(194,0,0,10),
        key(211,0,-3,-17),key(235,0,0,6),key(279),key(319)],
      path:"M118 110 Q89 90 90 63 Q77 78 79 105 Q74 128 92 154 Q105 163 126 135 Z",
      bounds:[70,60,60,105],direction:-42,
      details:strokeFox([[94,83,102,146,81,115,18,10]],1649,"#A8D7D5",.64)}),
    part({id:"torso",material:"feather",colors:birdBlue,pivot:[125,150],
      path:"M107 109 Q132 98 155 111 Q178 135 169 167 Q159 198 140 199 Q111 193 96 176 Q87 153 96 127 Z",
      bounds:[86,97,96,106],direction:63,flow:28,
      details:[
        ...strokeFox([[115,118,129,179,108,151,22,13],
          [143,117,153,185,161,153,20,12]],1693,"#B2DDD9",.68),
        trace("M112 127 Q134 116 157 131 M99 169 Q122 189 149 187",
          "#1F5374",1.25,223),
      ]}),
    part({id:"breast",material:"feather",colors:birdOrange,parent:"torso",pivot:[115,150],
      path:"M106 118 Q125 114 133 142 Q145 172 133 195 Q109 202 94 174 Q91 146 106 118 Z",
      bounds:[89,113,60,91],direction:72,flow:24,
      details:strokeFox([[107,128,112,182,96,157,22,10],
        [120,131,129,181,131,153,19,9]],1733,"#FADEA7",.59)}),
    part({id:"near-wing",material:"feather",colors:birdCobalt,parent:"torso",pivot:[139,122],
      keys:[key(0),key(159),key(173,0,-2,14),key(192,0,0,-19),
        key(212,0,-2,17),key(236,0,0,-15),key(270),key(319)],
      path:"M136 113 Q158 109 169 130 Q180 162 162 195 L153 211 L148 196 L140 205 L135 186 Q127 183 123 155 Q127 130 136 113 Z",
      bounds:[119,105,64,109],direction:65,flow:28,
      details:[
        ...strokeFox([[139,127,153,180,131,154,19,10],
          [148,125,168,169,164,142,19,10]],1787,"#9FD4D4",.64),
        trace("M136 133 Q151 153 159 174 M142 126 Q158 144 167 162",
          "#193C62",1.45,226),
        trace("M132 155 Q146 171 152 187","#D3E6DC",.83,239),
      ]}),
    // The overlapping shoulder coverts are a separate pigmented feather plane.
    // The neutral animation inherits near-wing only once, even at wing extremes.
    part({id:"wing-coverts",material:"feather",colors:birdBlue,
      parent:"near-wing",pivot:[142,133],direction:39,flow:24,
      path:"M133 114 Q156 107 171 125 Q167 145 150 156 Q134 155 125 139 Z",
      bounds:[122,104,53,56],
      details:[
        ...strokeFox([[134,121,148,151,127,139,18,8],
          [146,117,161,144,158,127,16,7]],1819,"#C0E3DA",.57),
        trace("M130 132 Q143 151 151 151 M147 121 Q160 133 166 136",
          "#1D5A73",.9,241),
      ]}),
    part({id:"head",material:"feather",colors:birdBlue,parent:"torso",pivot:[130,113],
      keys:[key(0),key(177),key(199,0,-2,6),key(227,0,-1,-4),
        key(269),key(319)],
      path:"M95 108 C92 90 98 72 111 65 Q127 56 147 64 Q162 72 165 91 Q161 113 146 122 Q117 128 95 108 Z",
      bounds:[91,55,78,77],direction:39,flow:25,
      details:[
        ...strokeFox([[106,68,145,66,120,48,22,12],
          [104,85,153,89,119,72,24,12]],1831,"#9DE0D9",.61),
        trace("M102 75 Q125 56 149 65 M100 98 Q122 120 150 108",
          "#1A496C",1.3,223),
      ]}),
    part({id:"cheek",material:"feather",colors:birdOrange,parent:"head",pivot:[127,111],
      path:"M97 100 Q112 95 123 100 Q135 103 154 93 Q151 105 132 116 Q110 119 98 108 Z",
      bounds:[95,91,63,29],direction:24,
      details:[trace("M101 102 Q121 111 141 103","#FFF1D8",1.25,233)]}),
    part({id:"beak",material:"feather",colors:["#4C6370","#192A3B","#9EA6A4"],
      parent:"head",pivot:[100,100],
      keys:[key(0),key(202),key(224,0,1,3),key(248),key(319)],
      path:"M100 94 Q72 91 10 98 Q47 105 102 108 L112 103 Z",
      bounds:[7,89,109,23],direction:1,flow:5,
      details:[
        trace("M26 100 Q68 96 101 99","#D2C9B7",.8,244),
        trace("M35 106 Q79 102 99 104","#182536",.95,249),
      ]}),
    part({id:"feet",material:"fur",colors:["#A76854","#624951","#E1A085"],
      parent:"torso",pivot:[129,186],
      path:"M115 182 Q122 179 125 185 L122 206 Q128 213 137 217 L133 220 Q126 217 119 213 Q114 220 107 222 L105 219 L116 205 Z M143 183 Q150 183 152 190 L147 207 Q158 212 165 217 L162 220 Q153 217 146 213 Q140 223 133 224 L131 221 L141 207 Z",
      bounds:[102,178,68,50],direction:69,
      details:[trace("M117 206 Q121 212 132 215 M145 207 Q148 214 160 216",
        "#583C48",1.1,246)]}),
    part({id:"eye",material:"fur",colors:["#455362","#151F30","#B7B8A3"],
      parent:"head",pivot:[111,94],
      keys:[key(0),key(200),key(208,0,0,0,1,.12),key(216),
        key(271),key(278,0,0,0,1,.18),key(285),key(319)],
      path:"M106 91 Q112 86 117 91 Q119 98 113 101 Q107 101 105 96 Z",
      bounds:[103,85,18,19],direction:8,
      details:[
        trace("M105 93 Q113 84 120 92 M106 99 Q112 105 119 99",
          "#20313E",1.1,240),
        trace("M111 90 Q114 92 114 98","#0D1725",1.8,249),
        trace("M109 90 L111 92","#FFF8DC",1.3,261),
      ]}),
  ];
  return {id:"kingfisher",parts};
}

/** All rebuilt shapes and motions share CP1’s deterministic absolute-frame API. */
export function pencilCharacterScene(aspect:PencilAspect):PencilSceneSpec {
  if(aspect!=="landscape"&&aspect!=="portrait")throw new RangeError("Unknown pencil character aspect");
  const source=pencilDemoScene("terrain",aspect);
  const portrait=aspect==="portrait";
  const foxActor={...fox(),transform:portrait?
    "translate(58 513) scale(.97)":"translate(487 226) scale(1.08)"};
  const birdActor={...createKingfisherActor(),transform:portrait?
    "translate(281 496) scale(.94)":"translate(749 221) scale(.99)"};
  const annotations=source.annotations?.filter(a=>!a.id.startsWith("guide-")).map(a=>{
    if(a.id==="title"&&a.type==="text")return {...a,text:["FOX &","KINGFISHER"]};
    if(a.id==="section"&&a.type==="text")return {...a,text:"WILDLIFE / COLOURED PENCIL"};
    if(a.id==="description"&&a.type==="text")return {...a,
      text:["A fox pauses beside a kingfisher.","A study in fur, feathers and gesture."]};
    return a;
  });
  // Keep no older character geometry, including the generic round bird and biped fox.
  // The new perch is an authored wood surface; remove the old sun to keep total
  // displayed region count within CP1's bounded 24-region drawing limit.
  const branch=createPencilMaterialRegion({
    id:"kingfisher-perch",surface:"wood",
    path:portrait?
      "M289 699 Q370 689 486 697 L488 710 Q391 705 286 715 Z":
      "M738 433 Q824 424 963 440 L963 453 Q842 444 741 454 Z",
    bounds:portrait?[281,682,214,42]:[734,418,231,42],
    palette:["#A08872","#665B52","#D6BC91"],seed:911,
    startFrame:34,durationFrames:170,direction:7,
    details:[trace(portrait?
      "M296 704 Q372 696 480 702":"M745 442 Q824 434 958 446",
      "#DED0B2",.95,220)],
  });
  // Character film favours clean paper and a grounded prop; the previous
  // tutorial mountain backdrop was removed with the cartoony cast, freeing
  // two region slots for a real tail tip and overlapping wing coverts.
  const drawing={...source.drawing,regions:[branch]};
  return {...source,drawing,actors:[foxActor,birdActor],annotations};
}
