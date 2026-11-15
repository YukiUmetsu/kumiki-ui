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
const birdCream=["#EEE3CB","#A9A39A","#FFF6DF"] as const;

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
  "tail","far-foreleg","torso","near-hindleg","near-foreleg","ruff",
  "head","ear-interiors","muzzle","nose","eye",
] as const;
function fox():PencilActorSpec {
  const parts:PencilActorPart[]=[
    part({id:"tail",material:"fur",colors:foxRust,pivot:[72,137],
      keys:[key(0),key(155),key(181,0,-2,-8),key(208,0,2,7),
        key(234,0,0,-5),key(275,0,1,4),key(319)],
      path:"M72 127 C40 101 4 95 -21 114 C-38 131 -30 153 -2 173 Q31 187 66 165 Q81 158 83 145 Z",
      bounds:[-40,91,125,101],direction:25,flow:29,
      details:[
        ...strokeFox([[6,115,46,158,5,157,27,15],[13,130,54,163,29,155,24,13],
          [27,110,65,143,39,126,22,15]],1229,"#F1BE83",.73),
        trace("M-21 125 Q-16 150 6 167 M7 104 Q36 112 59 134",
          "#554D54",1.8,214),
        trace("M-26 141 Q-16 162 13 176","#FFF0D0",1.2,231),
      ]}),
    part({id:"far-foreleg",material:"fur",colors:foxDark,pivot:[159,147],
      path:"M151 143 Q166 140 171 159 L167 191 L162 213 Q177 219 178 223 L140 224 Q144 216 145 209 Q141 175 151 143 Z",
      bounds:[136,139,45,88],direction:83,
      details:strokeFox([[154,158,150,209,156,190,15,10]],1251,"#BCA697",.62)}),
    part({id:"torso",material:"fur",colors:foxRust,pivot:[106,139],
      path:"M62 103 C88 87 133 93 164 105 Q181 112 188 136 Q185 161 171 170 Q150 180 126 173 Q111 189 78 179 Q47 164 45 141 Q43 115 62 103 Z",
      bounds:[41,88,153,105],direction:19,flow:21,
      details:[
        ...strokeFox([[60,113,106,165,79,144,28,16],
          [98,105,147,157,120,126,26,15],[133,108,177,154,166,127,22,11]],
          1297,"#F0B988",.64),
        trace("M62 116 Q110 93 150 113 M72 173 Q99 187 124 173",
          "#754E4B",1.1,220),
      ]}),
    part({id:"near-hindleg",material:"fur",colors:foxRust,parent:"torso",pivot:[78,158],
      path:"M59 148 Q76 144 91 154 Q106 166 92 183 L88 211 Q102 215 106 225 L59 225 Q66 213 65 207 Q50 182 59 148 Z",
      bounds:[49,140,61,88],direction:77,
      details:[...strokeFox([[69,161,76,208,58,192,17,11]],1321,"#F0BC89",.59),
        trace("M63 219 Q78 223 101 220","#463B43",1.15,222)]}),
    part({id:"near-foreleg",material:"fur",colors:foxDark,parent:"torso",pivot:[154,158],
      keys:[key(0),key(171),key(199,0,0,-12),key(223,0,-3,-22),
        key(251,0,-1,-11),key(283),key(319)],
      path:"M147 146 Q164 142 173 153 Q183 175 174 194 L168 213 Q184 215 192 224 L144 224 Q149 215 151 210 Q145 173 147 146 Z",
      bounds:[141,139,55,89],direction:82,
      details:[...strokeFox([[160,161,164,211,149,191,18,9]],1343,"#B0A8A0",.61),
        trace("M151 217 Q168 222 186 221","#373540",1.3,228)]}),
    part({id:"ruff",material:"fur",colors:foxLight,parent:"torso",pivot:[168,131],
      path:"M164 112 Q186 104 200 124 Q202 140 194 151 L207 153 L187 161 L192 172 Q177 168 172 183 L162 170 Q149 175 151 159 L140 164 Q150 145 150 132 Z",
      bounds:[137,101,73,85],direction:67,flow:31,
      details:strokeFox([[159,118,178,157,149,151,25,11],
        [178,119,193,155,189,139,21,10]],1373,"#FFF4D9",.66)}),
    part({id:"head",material:"fur",colors:foxRust,parent:"torso",pivot:[169,123],
      keys:[key(0),key(169),key(194,1,-1,-4),key(226,0,-4,-8),
        key(252,1,-1,-4),key(284),key(319)],
      path:"M154 113 Q146 95 154 73 L158 30 Q164 18 173 37 L188 64 Q201 47 208 34 Q222 24 220 50 L216 75 Q223 88 235 105 Q242 112 236 121 Q215 143 185 147 Q165 143 154 132 Z",
      bounds:[145,19,101,132],direction:31,flow:25,
      details:[
        ...strokeFox([[164,80,189,121,161,111,22,10],
          [193,77,221,110,207,83,22,10],[173,60,200,88,189,55,18,9]],
          1403,"#F4C392",.65),
        trace("M161 57 Q164 40 168 34 M203 61 Q209 44 216 41",
          "#513F49",1.3,221),
        trace("M155 99 Q169 126 181 138","#FBE6C1",1.5,235),
      ]}),
    part({id:"ear-interiors",material:"fur",colors:foxDark,parent:"head",pivot:[183,62],
      path:"M160 73 Q159 49 165 39 Q171 50 183 70 Z M197 69 Q208 46 215 40 Q216 61 211 77 Z",
      bounds:[157,37,62,44],direction:79,
      details:strokeFox([[168,44,169,70,172,55,13,6],
        [212,47,205,72,207,61,13,6]],1439,"#DCA68F",.54)}),
    part({id:"muzzle",material:"fur",colors:foxLight,parent:"head",pivot:[210,118],
      path:"M187 110 Q205 103 225 108 Q232 106 243 113 Q235 128 216 135 Q191 141 181 128 Z",
      bounds:[178,100,68,45],direction:18,flow:18,
      details:[
        ...strokeFox([[192,116,219,132,207,126,18,9]],1477,"#FAF1D9",.52,235),
        trace("M196 132 Q217 136 233 119","#3D434C",1.4,250),
        trace("M190 121 Q182 118 172 115 M191 128 Q182 132 167 135",
          "#C9B6AE",.62,248),
      ]}),
    part({id:"nose",material:"fur",colors:["#41414C","#1D2836","#8F7A70"],
      parent:"head",pivot:[239,114],
      path:"M234 110 Q244 108 249 113 Q249 123 241 124 Q235 119 234 110 Z",
      bounds:[231,107,21,20],direction:5,
      details:[trace("M237 111 Q241 110 244 113","#D6CBC0",.85,255)]}),
    part({id:"eye",material:"fur",colors:["#9D805D","#242F3F","#DCC29A"],
      parent:"head",pivot:[209,100],
      keys:[key(0),key(196),key(202,0,0,0,1,.16),
        key(208),key(267),key(274,0,0,0,1,.20),key(281),key(319)],
      path:"M199 99 Q206 89 215 94 Q220 99 214 107 Q207 110 201 106 Z",
      bounds:[197,90,25,22],direction:6,
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
  "tail","far-wing","torso","breast","near-wing","head",
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
      path:"M107 112 C127 99 150 106 162 126 Q176 153 163 181 Q154 199 127 197 Q98 192 91 163 Q90 132 107 112 Z",
      bounds:[86,100,94,102],direction:63,flow:28,
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
      path:"M138 116 Q164 107 172 129 Q173 154 163 172 Q154 190 139 197 Q129 178 119 157 Q126 137 138 116 Z",
      bounds:[116,106,59,96],direction:65,flow:28,
      details:[
        ...strokeFox([[139,127,153,180,131,154,19,10],
          [148,125,168,169,164,142,19,10]],1787,"#9FD4D4",.64),
        trace("M136 133 Q151 153 159 174 M142 126 Q158 144 167 162",
          "#193C62",1.45,226),
        trace("M132 155 Q146 171 152 187","#D3E6DC",.83,239),
      ]}),
    part({id:"head",material:"feather",colors:birdBlue,parent:"torso",pivot:[130,113],
      keys:[key(0),key(177),key(199,0,-2,6),key(227,0,-1,-4),
        key(269),key(319)],
      path:"M96 107 Q89 83 101 61 Q117 43 143 51 Q166 58 164 88 Q164 116 140 125 Q113 128 96 107 Z",
      bounds:[88,45,82,83],direction:39,flow:25,
      details:[
        ...strokeFox([[106,68,145,66,120,48,22,12],
          [104,85,153,89,119,72,24,12]],1831,"#9DE0D9",.61),
        trace("M102 75 Q125 56 149 65 M100 98 Q122 120 150 108",
          "#1A496C",1.3,223),
      ]}),
    part({id:"cheek",material:"feather",colors:birdOrange,parent:"head",pivot:[127,111],
      path:"M100 99 Q113 89 127 99 Q143 102 154 94 Q149 115 127 122 Q106 116 100 99 Z",
      bounds:[96,90,63,37],direction:24,
      details:[trace("M101 102 Q121 111 141 103","#FFF1D8",1.25,233)]}),
    part({id:"beak",material:"feather",colors:["#4C6370","#192A3B","#9EA6A4"],
      parent:"head",pivot:[100,100],
      keys:[key(0),key(202),key(224,0,1,3),key(248),key(319)],
      path:"M101 93 Q80 92 19 101 Q54 106 99 107 L108 103 Z",
      bounds:[15,88,98,24],direction:1,flow:5,
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
      path:"M105 92 Q110 85 117 90 Q122 96 114 101 Q108 104 105 96 Z",
      bounds:[102,84,23,22],direction:8,
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
  const drawing={...source.drawing,regions:[
    ...source.drawing.regions.filter(region=>region.id!=="sun-disk").map(region=>({
      ...region,
      layers:region.layers.map(layer=>({...layer,pressure:layer.pressure*.47,
        tipWidth:layer.tipWidth*.76})),
      contour:{...region.contour,opacity:.26},
    })),
    branch,
  ]};
  return {...source,drawing,actors:[foxActor,birdActor],annotations};
}
