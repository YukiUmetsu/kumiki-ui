/**
 * Original 2.5D Chinese-ink traveller. Artwork and motion cues are authored in
 * Kumiki's EXISTING CharacterDefinition / evaluateCharacter contract.
 * One approved identity can be restyled or directed in any film genre.
 */
import type {
  CharacterAction, CharacterCue, CharacterDefinition, CharacterInstance,
  CharacterPathShape, CharacterShape, CharacterShapeAsset,
} from "../../registry/character/definition";
import type { InkActorTrack } from "../../registry/video/ink-wash-character";

const provenance = {license:"CC0-1.0",source:"Original Kumiki ink-traveller illustration"};
const p=(d:string,fill="none",stroke="$ink",strokeWidth=1.3,opacity=1):CharacterPathShape =>
  ({type:"path",d,fill,stroke,strokeWidth,opacity});
const e=(cx:number,cy:number,rx:number,ry:number,fill:string,stroke="none",strokeWidth=1.3) =>
  ({type:"ellipse" as const,cx,cy,rx,ry,fill,stroke,strokeWidth});
const art=(...shapes:CharacterShape[]):CharacterShapeAsset =>
  ({kind:"shapes",width:260,height:340,shapes,provenance});
const action=(channel:string,prepare:number,act:number,hold:number,recover:number,
  first:Record<string,{rotation?:number;x?:number;y?:number;scaleX?:number;scaleY?:number}>,
  peak:Record<string,{rotation?:number;x?:number;y?:number;scaleX?:number;scaleY?:number}>):CharacterAction =>
  ({channel,blend:"additive",priority:2,takeover:"blend-out",blendOutFrames:7,
    phases:[
      {name:"prepare",frames:prepare,pose:first,easing:"ease-in-out-cubic"},
      {name:"act",frames:act,pose:peak,easing:"ease-in-out-cubic"},
      {name:"hold",frames:hold,pose:peak,easing:"linear"},
      {name:"recover",frames:recover,pose:{},easing:"ease-in-out-cubic"},
    ]});

/** Details are part-local painted shapes, not copies of a film frame. */
export const INK_TRAVELLER: CharacterDefinition = {
  schemaVersion:1, characterId:"ink-traveller", revision:"ink-actor-v1",
  mode:"puppet-2.5d", design:{width:260,height:340},
  channels:["body","head","face","arms","walk","prop"],
  palette:{
    ink:"#29302B",shadow:"#4A4C43",wash:"#AAB0A2",mist:"#CFD1C3",
    deep:"#555E56",paper:"#F1EBDD",skin:"#D8CAB0",skinshade:"#B9AB96",
    cinnabar:"#A34735",twine:"#977D63",linen:"#E4E1D2",
  },
  assets:{
    "leg-far":art(
      p("M113 253 Q106 288 101 321 L91 323 Q89 320 96 285 L101 244 Z","$deep","$shadow",1.7),
      p("M91 321 Q103 316 117 324 Q123 332 105 330 L89 328 Z","$ink","none"),
      p("M97 302 Q100 300 109 302","none","$mist",2,.58)),
    "leg-near":art(
      p("M145 251 Q158 273 158 316 L145 323 Q142 308 136 274 L131 251 Z","$shadow","$ink",1.5),
      p("M143 323 Q159 316 171 325 Q178 333 156 330 L141 329 Z","$ink","none"),
      p("M147 298 L154 300","none","$wash",1.5,.65)),
    "robe":art(
      p("M101 137 Q83 153 81 188 Q83 236 70 295 Q65 317 76 324 Q118 337 171 329 Q204 327 210 318 Q202 267 182 194 Q185 152 165 136 Q139 131 101 137 Z","$wash","$ink",2.1),
      p("M103 147 Q91 189 89 238 Q90 282 81 312 Q107 326 125 322 L128 166 Z","$mist","none",0, .8),
      p("M165 147 Q177 181 179 223 Q181 286 198 316 L174 321 Q157 291 153 239 Z","$deep","none",0,.22),
      p("M111 163 Q103 217 116 272 Q113 291 108 318","none","$shadow",1.7,.66),
      p("M158 165 Q151 214 160 251 Q158 292 172 319","none","$shadow",1.3,.57),
      p("M92 295 Q120 310 190 302","none","$linen",2,.53),
      p("M76 323 Q130 336 207 321","none","$ink",1.6),
      p("M94 188 Q116 202 138 206","none","$paper",3,.65),
      p("M174 189 Q170 236 180 270","none","$paper",3,.32)),
    "belt":art(
      p("M92 213 Q133 221 182 215 L182 225 Q139 232 92 223 Z","$shadow","$ink",1.2),
      p("M128 216 L133 238 L145 226","none","$twine",2),
      p("M93 222 Q111 230 129 228","none","$mist",1.4,.56)),
    "collar":art(
      p("M119 132 L141 164 L160 131 Q166 136 170 144 L143 182 L113 149 Z","$linen","$ink",1.5),
      p("M116 141 L143 172 L165 138","none","$shadow",1.9),
      p("M131 156 L143 170 L155 155","none","$twine",1.2,.65)),
    "sleeve-far":art(
      p("M97 146 Q78 146 65 179 Q52 216 39 234 Q36 247 62 255 Q85 257 96 237 L111 180 Z","$mist","$shadow",1.8),
      p("M88 169 Q69 211 50 237","none","$shadow",1.5,.68),
      p("M45 244 Q64 251 86 240","none","$ink",1.7),
      p("M76 183 Q67 199 62 212","none","$linen",2.1,.6)),
    "sleeve-near":art(
      p("M166 143 Q188 152 202 188 Q216 215 230 235 Q230 247 209 254 Q188 259 176 239 L155 182 Z","$wash","$ink",1.9),
      p("M171 164 Q194 189 204 222 L215 237","none","$shadow",2,.67),
      p("M188 170 Q193 191 196 198","none","$linen",2.2,.67),
      p("M190 243 Q213 254 230 237","none","$ink",1.8),
      p("M202 217 Q208 228 217 232","none","$shadow",1.1,.6)),
    "hand-far":art(
      p("M40 236 Q45 231 55 233 Q65 237 61 246 Q54 252 45 247 Z","$skin","$shadow",1),
      p("M44 240 Q51 243 56 241","none","$skinshade",.7)),
    "hand-near":art(
      p("M219 236 Q226 229 234 236 Q241 245 231 250 Q221 252 217 244 Z","$skin","$ink",1),
      p("M224 238 Q228 242 233 239 M223 245 L229 247","none","$skinshade",.75)),
    "face":art(
      p("M116 69 Q129 57 147 64 Q169 76 170 96 Q169 129 148 141 Q128 148 113 128 Q106 108 108 86 Z","$skin","$ink",1.4),
      p("M110 91 Q105 110 116 126 Q120 137 135 139","none","$skinshade",3,.32),
      p("M146 91 Q154 105 146 110 Q143 112 139 109","none","$shadow",1.15,.77),
      p("M119 116 Q121 124 128 124","none","$skinshade",1.1,.65),
      p("M159 115 Q164 118 164 120","none","$skinshade",.8,.45),
      e(109,103,4,7,"$skin","$shadow",.7)),
    "hair":art(
      p("M110 91 Q102 75 111 62 Q119 47 140 50 Q159 46 173 62 Q176 81 170 99 Q162 82 150 75 Q130 84 110 91 Z","$ink","none"),
      p("M112 78 Q130 60 154 65","none","$wash",2,.44),
      p("M132 48 Q125 32 139 24 Q153 20 158 39 L155 52 Z","$shadow","$ink",1.4),
      p("M138 25 Q144 31 144 47","none","$wash",2,.59),
      p("M133 53 Q140 56 148 53","none","$paper",1.1,.5),
      p("M171 80 Q175 103 166 122","none","$shadow",2)),
    "brow":art(
      p("M119 94 Q127 89 135 93","none","$ink",2.1),
      p("M148 92 Q158 89 164 91","none","$ink",2.1)),
    "eyes-open":art(
      p("M119 102 Q127 98 134 103","none","$ink",1.55),
      p("M148 102 Q155 98 163 101","none","$ink",1.55)),
    "eyes-closed":art(
      p("M119 102 Q127 105 135 102","none","$ink",1.7),
      p("M148 102 Q154 105 163 101","none","$ink",1.7)),
    "eyes-soft":art(
      p("M119 102 Q127 106 135 101","none","$ink",1.5),
      p("M148 101 Q154 106 163 101","none","$ink",1.5)),
    "pupil-left":art(e(128,102,1.7,2.4,"$ink")),
    "pupil-right":art(e(156,101,1.8,2.2,"$ink")),
    "mouth-rest":art(p("M135 123 Q141 125 147 122","none","$shadow",1.4)),
    "mouth-aa":art(e(142,124,4.9,3.5,"$shadow"),e(142,122,3.8,1.1,"$skinshade")),
    "mouth-oh":art(e(142,124,2.6,4.1,"$shadow")),
    "mouth-mm":art(p("M136 124 Q142 124 147 124","none","$ink",2)),
    "mouth-smile":art(p("M134 121 Q141 129 149 120","none","$shadow",1.8)),
    "beard":art(
      p("M125 132 Q141 146 157 128 Q157 151 148 160 L142 171 Q132 150 125 132 Z","$shadow","none",0,.78),
      p("M139 139 Q140 158 142 170","none","$ink",1.15,.7),
      p("M148 142 Q146 153 145 159","none","$paper",.8,.4)),
    "brush":art(
      p("M230 240 Q231 205 233 159","none","$twine",3),
      p("M231 206 L232 182","none","$paper",1.0,.72),
      p("M230 240 Q235 242 236 246 Q233 257 230 264 Q228 254 228 246 Z","$ink","none"),
      p("M230 251 L230 261","none","$wash",.75,.5),
      p("M229 238 L232 238","none","$shadow",2)),
    "scroll":art(
      p("M69 209 Q97 201 132 208 L126 220 Q96 220 73 223 Z","$linen","$shadow",1),
      p("M75 211 Q99 207 127 210 M76 216 Q98 212 122 214","none","$shadow",.75,.6)),
  },
  parts:[
    {id:"far-leg",asset:"leg-far",channel:"walk",pivot:{x:109,y:256},z:2},
    {id:"near-leg",asset:"leg-near",channel:"walk",pivot:{x:145,y:260},z:3},
    {id:"body",asset:"robe",channel:"body",pivot:{x:133,y:188},z:10,
      limits:{rotation:{min:-24,max:24}}},
    {id:"far-sleeve",asset:"sleeve-far",parent:"body",channel:"arms",pivot:{x:96,y:155},z:7,
      limits:{rotation:{min:-80,max:80}}},
    {id:"far-hand",asset:"hand-far",parent:"far-sleeve",channel:"arms",pivot:{x:55,y:244},z:9},
    {id:"scroll",asset:"scroll",parent:"far-hand",channel:"prop",pivot:{x:63,y:213},z:9},
    {id:"collar",asset:"collar",parent:"body",channel:"body",pivot:{x:140,y:146},z:12},
    {id:"sash",asset:"belt",parent:"body",channel:"body",pivot:{x:132,y:221},z:13},
    {id:"near-sleeve",asset:"sleeve-near",parent:"body",channel:"arms",pivot:{x:165,y:150},z:17,
      limits:{rotation:{min:-90,max:75}}},
    {id:"near-hand",asset:"hand-near",parent:"near-sleeve",channel:"arms",pivot:{x:226,y:244},z:19},
    {id:"brush",asset:"brush",parent:"near-hand",channel:"prop",pivot:{x:230,y:241},z:21},
    {id:"head",asset:"face",parent:"body",channel:"head",pivot:{x:139,y:124},z:15,
      limits:{rotation:{min:-24,max:24}}},
    {id:"hair",asset:"hair",parent:"head",channel:"head",pivot:{x:140,y:74},z:18},
    {id:"brows",asset:"brow",parent:"head",channel:"face",pivot:{x:140,y:94},z:19},
    {id:"eyes",asset:"eyes-open",variants:{closed:"eyes-closed",soft:"eyes-soft"},
      parent:"head",channel:"face",pivot:{x:140,y:102},z:20},
    {id:"pupil-left",asset:"pupil-left",parent:"head",channel:"face",pivot:{x:128,y:102},z:21},
    {id:"pupil-right",asset:"pupil-right",parent:"head",channel:"face",pivot:{x:156,y:102},z:21},
    {id:"mouth",asset:"mouth-rest",
      variants:{rest:"mouth-rest",aa:"mouth-aa",oh:"mouth-oh",mm:"mouth-mm",smile:"mouth-smile"},
      parent:"head",channel:"face",pivot:{x:142,y:124},z:22},
    {id:"beard",asset:"beard",parent:"head",channel:"face",pivot:{x:142,y:139},z:23},
  ],
  anchors:{
    "audience":{at:{x:246,y:106}},
    "landscape":{at:{x:30,y:96}},
    "hand":{part:"near-hand",at:{x:226,y:244}},
    "eyes":{part:"head",at:{x:143,y:102}},
  },
  poses:{rest:{},thoughtful:{head:{rotation:-9},"near-sleeve":{rotation:-8}}},
  basePose:"rest",
  actions:{
    step:action("walk",7,9,7,7,
      {"far-leg":{rotation:14},"near-leg":{rotation:-15}},
      {"far-leg":{rotation:-17},"near-leg":{rotation:17}}),
    greet:action("arms",8,24,20,18,{"near-sleeve":{rotation:-15}},
      {"near-sleeve":{rotation:-52},"near-hand":{rotation:8},"far-sleeve":{rotation:6}}),
    ponder:action("head",11,12,22,13,{head:{rotation:-8}}, {head:{rotation:-13,y:2}}),
    bow:action("body",10,15,17,21,{body:{rotation:5,y:3},head:{rotation:2}},
      {body:{rotation:16,y:7},head:{rotation:10},"near-sleeve":{rotation:10}}),
    paint:action("arms",10,19,17,20,{"near-sleeve":{rotation:-19}},
      {"near-sleeve":{rotation:-39},"near-hand":{rotation:-18},"far-sleeve":{rotation:8}}),
    nod:action("head",6,8,6,10,{head:{rotation:4}}, {head:{rotation:10}}),
  },
  expressions:{default:"neutral",sets:{
    neutral:{},
    attentive:{variants:{eyes:"soft"},pose:{head:{rotation:-3}}},
    delighted:{variants:{eyes:"soft",mouth:"smile"},pose:{head:{rotation:3}}},
    worried:{pose:{brows:{y:-3},mouth:{y:2}}},
  }},
  speech:{
    mouthPart:"mouth",rest:"rest",visemes:{A:"aa",O:"oh",M:"mm"},
    approximateCycle:["aa","oh","aa","mm"],transitionFrames:2,
    approximateStepFrames:5,
  },
  gaze:{parts:["pupil-left","pupil-right"],maxOffset:2.5,easeFrames:7},
  blink:{parts:["eyes"],variant:"closed",
    intervalFrames:{min:66,max:101},durationFrames:7},
  idle:{parts:{
    body:{property:"scaleY",amplitude:.012,periodFrames:108},
    head:{property:"rotation",amplitude:1.25,periodFrames:147},
    "near-sleeve":{property:"rotation",amplitude:1.1,periodFrames:131},
    "far-sleeve":{property:"rotation",amplitude:.85,periodFrames:163},
  }},
  params:{sleeveVolume:{min:.8,max:1.2,default:1,
    targets:[{part:"near-sleeve",property:"scale",weight:.37},
      {part:"far-sleeve",property:"scale",weight:.27}]}},
  skins:{mineral:{palette:{wash:"#A9B9B2",deep:"#5C7274",mist:"#CFDAD2",cinnabar:"#B45136"}}},
  capabilities:["layered-ink","blink","facial-expression","gaze","speech","acting","handheld-prop","depth"],
};
export const TRAVELLER_INSTANCE: CharacterInstance = {
  instanceId:"traveller-one",characterId:"ink-traveller",
  revision:"ink-actor-v1",seed:91,
  targets:{viewer:{x:175,y:93},scroll:{x:77,y:208}},
};
export const TRAVELLER_TRACK: InkActorTrack = {
  id:"scholar-staging",instanceId:"traveller-one",
  keys:[
    {frame:0,x:250,y:477,scale:.84,facing:"right"},
    {frame:110,x:560,y:474,scale:1,facing:"right"},
    {frame:142,x:587,y:476,scale:1.02,facing:"right"},
    {frame:315,x:587,y:476,scale:1.02,facing:"right"},
  ],
};
export const TRAVELLER_CUES: CharacterCue[] = [
  ...[8,40,72,104].map((startFrame,i)=>({
    id:"stride-"+i,instanceId:"traveller-one",kind:"action" as const,
    startFrame,name:"step",
  })),
  {id:"notice",instanceId:"traveller-one",kind:"gaze",
    startFrame:96,endFrame:156,target:"landscape"},
  {id:"greeting",instanceId:"traveller-one",kind:"action",startFrame:139,name:"greet"},
  {id:"attention",instanceId:"traveller-one",kind:"expression",
    startFrame:137,endFrame:255,name:"attentive"},
  {id:"voice",instanceId:"traveller-one",kind:"speech",
    startFrame:168,endFrame:224,precision:"approximate"},
  {id:"look-out",instanceId:"traveller-one",kind:"gaze",
    startFrame:162,endFrame:258,target:"viewer"},
  {id:"delight",instanceId:"traveller-one",kind:"expression",
    startFrame:255,name:"delighted"},
  {id:"bow",instanceId:"traveller-one",kind:"action",startFrame:257,name:"bow"},
];
