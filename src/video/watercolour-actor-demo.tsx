import { useMemo } from "react";
import type { CharacterAsset, CharacterCue, CharacterDefinition, CharacterInstance, CharacterShape } from "../../registry/character/definition";
import { PaintedComposition } from "../../registry/video/painted-composition-react";
import type { PaintedCompositionSpec } from "../../registry/video/painted-composition";
import type { CharacterWatercolourMaterial } from "../../registry/character/character-presenter-react";
import { WatercolourActor } from "../../registry/video/watercolour-actor-react";
import type { WatercolourActorTrack } from "../../registry/video/watercolour-actor";
import { paintedDemoSpec } from "./painted-composition-demo";
import type { PaintedOutput } from "./painted-composition-demo";

const provenance = { license: "CC0-1.0", source: "Original Kumiki watercolour traveler character study" };
function shapes(...art: CharacterShape[]): CharacterAsset {
  return {kind:"shapes",width:240,height:354,shapes:art,provenance};
}
const path=(d:string,fill:string,stroke="#595A59",strokeWidth=1.4):CharacterShape=>
  ({type:"path",d,fill,stroke,strokeWidth});
const ellipse=(cx:number,cy:number,rx:number,ry:number,fill:string,
  stroke="#595A59",strokeWidth=1):CharacterShape=>({type:"ellipse",cx,cy,rx,ry,fill,stroke,strokeWidth});

/** Original illustrated performer — separate body, head, eyes, mouth, arms and feet.
 * This is a miniature reference rig; consumers supply their approved characters.
 */
export const TRAVELLER:CharacterDefinition={
  schemaVersion:1,characterId:"watercolour-traveller",revision:"1.0.0",mode:"puppet-2.5d",
  design:{width:240,height:354},channels:["body","head","arms","legs","face"],
  palette:{
    coat:"#779A96",coatShade:"#567B7D",coatLight:"#A8BDB0",
    skin:"#DAAC91",skinShade:"#C78F7D",hair:"#554A55",
    scarf:"#C18E81",scarfLight:"#E1ADA3",boots:"#59636A",
    bag:"#B78C67",bagShade:"#927057",ink:"#45545B",
  },
  assets:{
    "backpack":shapes(
      path("M77 183 Q53 183 51 218 L61 258 Q75 265 90 248 L95 193 Z","$bag"),
      path("M64 189 Q57 203 59 226 Q65 232 82 226","none","$bagShade",3.4),
      path("M55 232 Q64 234 76 231","none","$bagShade",2)),
    "leg-left":shapes(
      path("M96 231 Q89 255 84 285 L79 311 Q81 318 90 318 L109 312 Q116 282 126 248 Z","$coatShade"),
      path("M80 306 Q72 316 71 325 Q71 335 89 337 L111 328 L109 315 Z","$boots"),
      path("M76 330 Q92 336 109 327","none","#353E49",1.5)),
    "leg-right":shapes(
      path("M126 235 Q130 265 143 300 L149 315 Q160 316 166 305 L159 277 L148 241 Z","$coatShade"),
      path("M146 304 L160 304 Q172 315 172 327 Q167 334 149 335 L131 330 Z","$boots"),
      path("M139 330 Q153 336 169 328","none","#353E49",1.5)),
    "arm-left":shapes(
      path("M87 166 Q69 173 67 198 Q61 232 75 261 Q86 264 93 253 L100 218 L114 190 Z","$coatShade"),
      path("M73 246 Q79 243 89 250 Q93 266 84 275 Q75 275 69 262 Z","$skin"),
      path("M73 207 Q73 225 80 242","none","$coatLight",2.2)),
    "arm-right":shapes(
      path("M150 163 Q171 163 178 181 L181 242 Q180 255 165 259 L155 244 L156 201 L141 184 Z","$coat"),
      path("M165 248 Q174 245 180 250 Q188 264 178 271 Q168 272 161 258 Z","$skin"),
      path("M171 186 Q176 211 174 242","none","$coatLight",2)),
    "coat":shapes(
      path("M88 159 Q107 150 133 153 Q154 156 164 171 L163 218 Q173 245 175 274 Q149 282 127 276 Q109 281 77 273 Q84 236 80 208 Q79 177 88 159 Z","$coat"),
      path("M127 169 Q124 215 126 275","none","$coatShade",2.6),
      path("M86 188 Q92 216 84 260","none","$coatLight",3.4),
      path("M156 188 Q161 223 165 261","none","$coatShade",2.2),
      path("M91 268 Q113 274 126 271 Q144 276 166 269","none","$coatShade",2.6),
      ellipse(129,203,2.8,3.1,"$ink"),ellipse(128,229,2.6,2.6,"$ink")),
    "scarf":shapes(
      path("M100 147 Q112 161 144 146 L151 162 Q140 177 121 176 Q104 173 94 164 Z","$scarf"),
      path("M141 164 Q145 193 132 220 L119 211 Q129 192 128 174 Z","$scarfLight"),
      path("M135 173 Q134 191 126 209","none","$scarf",2.4)),
    "neck":shapes(path("M110 135 L140 133 L139 162 Q123 174 110 160 Z","$skinShade")),
    "head":shapes(
      ellipse(124,110,43,51,"$skin"),
      path("M93 114 Q106 125 108 147","none","$skinShade",2.5),
      path("M142 146 Q151 136 154 121","none","$skinShade",2.2),
      ellipse(85,123,5.4,9,"$skinShade"),
      ellipse(163,121,4.3,8,"$skin")),
    "cheeks":shapes(
      ellipse(103,128,10,5.8,"$skinShade","none",0),
      ellipse(148,127,9,5,"$skinShade","none",0)),
    "eyes-open":shapes(
      path("M102 113 Q109 106 117 112","none","$ink",2.1),
      path("M131 112 Q140 106 148 113","none","$ink",2.1),
      ellipse(110,114,2.5,3.9,"$ink","none",0),
      ellipse(139,114,2.5,3.9,"$ink","none",0)),
    "eyes-closed":shapes(
      path("M100 117 Q109 123 118 117","none","$ink",2.3),
      path("M131 117 Q140 123 150 116","none","$ink",2.3)),
    "mouth-rest":shapes(path("M117 138 Q125 141 132 137","none","$ink",1.7)),
    "mouth-open":shapes(ellipse(125,140,5,7,"#946A72","$ink",1.2)),
    "mouth-round":shapes(ellipse(124,140,3.2,5.7,"#946A72","$ink",1.2)),
    "hair":shapes(
      path("M83 113 Q74 96 84 76 Q91 54 113 57 Q127 42 147 54 Q167 61 167 89 L160 116 Q150 103 145 84 Q133 89 121 79 Q112 91 97 92 Q95 108 83 113 Z","$hair"),
      path("M96 76 Q106 65 119 72 M133 62 Q144 64 150 74","none","#756572",2.4)),
    "hat":shapes(
      path("M84 82 Q89 45 111 43 Q141 31 153 47 Q165 62 165 82 Q143 89 115 89 Q94 89 84 82 Z","$bag"),
      path("M73 83 Q111 73 170 84 Q171 93 152 95 Q104 100 78 93 Z","$bagShade"),
      path("M99 68 Q127 73 151 66","none","#E2BD8D",2.5)),
  },
  parts:[
    {id:"backpack",channel:"body",asset:"backpack",pivot:{x:75,y:206},z:0},
    {id:"leg-left",channel:"legs",asset:"leg-left",pivot:{x:112,y:241},z:1},
    {id:"leg-right",channel:"legs",asset:"leg-right",pivot:{x:140,y:242},z:2},
    {id:"arm-left",channel:"arms",asset:"arm-left",pivot:{x:86,y:175},z:3},
    {id:"neck",channel:"head",asset:"neck",pivot:{x:124,y:157},z:4},
    {id:"coat",channel:"body",asset:"coat",pivot:{x:123,y:176},z:5},
    {id:"arm-right",channel:"arms",asset:"arm-right",pivot:{x:156,y:169},z:6},
    {id:"scarf",channel:"body",asset:"scarf",pivot:{x:124,y:163},z:7},
    {id:"head",channel:"head",asset:"head",pivot:{x:124,y:144},z:8},
    {id:"cheeks",channel:"face",asset:"cheeks",pivot:{x:124,y:116},z:9},
    {id:"eyes",channel:"face",asset:"eyes-open",variants:{open:"eyes-open",closed:"eyes-closed"},pivot:{x:125,y:114},z:10},
    {id:"mouth",channel:"face",asset:"mouth-rest",variants:{rest:"mouth-rest",open:"mouth-open",round:"mouth-round"},pivot:{x:124,y:139},z:11},
    {id:"hair",channel:"head",asset:"hair",pivot:{x:124,y:91},z:12},
    {id:"hat",channel:"head",asset:"hat",pivot:{x:124,y:69},z:13},
  ],
  poses:{neutral:{}},basePose:"neutral",
  actions:{
    "step-left":{channel:"legs",blend:"override",priority:1,takeover:"cut",phases:[
      {name:"prepare",frames:4,pose:{"leg-left":{rotation:8},"leg-right":{rotation:-9}}},
      {name:"act",frames:8,pose:{"leg-left":{rotation:-17},"leg-right":{rotation:14}}},
      {name:"hold",frames:3,pose:{"leg-left":{rotation:-10},"leg-right":{rotation:7}}},
      {name:"recover",frames:4,pose:{}}]},
    "step-right":{channel:"legs",blend:"override",priority:1,takeover:"cut",phases:[
      {name:"prepare",frames:4,pose:{"leg-left":{rotation:-11},"leg-right":{rotation:9}}},
      {name:"act",frames:8,pose:{"leg-left":{rotation:16},"leg-right":{rotation:-17}}},
      {name:"hold",frames:3,pose:{"leg-left":{rotation:8},"leg-right":{rotation:-10}}},
      {name:"recover",frames:4,pose:{}}]},
    wave:{channel:"arms",blend:"override",priority:2,takeover:"blend-out",blendOutFrames:4,phases:[
      {name:"prepare",frames:10,pose:{"arm-right":{rotation:-65}}},
      {name:"act",frames:18,pose:{"arm-right":{rotation:-140}}},
      {name:"hold",frames:24,pose:{"arm-right":{rotation:-126}}},
      {name:"recover",frames:14,pose:{}}]},
    nod:{channel:"head",blend:"additive",priority:2,takeover:"finish",phases:[
      {name:"prepare",frames:8,pose:{head:{rotation:7},hair:{rotation:7},hat:{rotation:7}}},
      {name:"act",frames:11,pose:{head:{rotation:-4},hair:{rotation:-4},hat:{rotation:-4}}},
      {name:"hold",frames:5,pose:{head:{rotation:-4}}},
      {name:"recover",frames:9,pose:{}}]},
  },
  expressions:{default:"rest",sets:{rest:{},happy:{pose:{head:{rotation:-3},cheeks:{y:-2}}}}},
  blink:{parts:["eyes"],variant:"closed",intervalFrames:{min:75,max:110},durationFrames:6},
  gaze:{parts:["eyes"],maxOffset:3,easeFrames:5},
  speech:{mouthPart:"mouth",rest:"rest",visemes:{A:"open",O:"round",M:"rest"},
    approximateCycle:["open","round","rest"],transitionFrames:3,approximateStepFrames:7},
  idle:{parts:{"head":{property:"rotation",amplitude:1.25,periodFrames:95},
    "scarf":{property:"y",amplitude:1.8,periodFrames:88}}},
  capabilities:["walk","wave","blink","gaze","speech","expressions"],
};
export const TRAVELLER_MATERIAL:CharacterWatercolourMaterial={seed:97,granulation:.72,tooth:.81,bleed:.42};
export const TRAVELLER_INSTANCE:CharacterInstance={
  instanceId:"traveller",characterId:TRAVELLER.characterId,revision:TRAVELLER.revision,seed:83,
  targets:{viewer:{x:180,y:117}},
};

/** All actions use the existing character-performance evaluator. */
export const TRAVELLER_CUES:readonly CharacterCue[] = [
  ...Array.from({length:8},(_,i):CharacterCue=>({
    id:"walk-"+i,instanceId:"traveller",kind:"action",startFrame:155+i*23,
    name:i%2?"step-right":"step-left",
  })),
  {id:"wave",instanceId:"traveller",kind:"action",name:"wave",startFrame:275},
  {id:"smile",instanceId:"traveller",kind:"expression",name:"happy",startFrame:290},
  {id:"look",instanceId:"traveller",kind:"gaze",target:"viewer",startFrame:298,endFrame:375},
  {id:"say",instanceId:"traveller",kind:"speech",precision:"approximate",startFrame:312,endFrame:370},
  {id:"nod",instanceId:"traveller",kind:"action",name:"nod",startFrame:320},
];

/** Feet and silhouette preserve consistent geometry for both output sizes. */
export function travellerTrack(output:PaintedOutput):WatercolourActorTrack{
  const portrait=output==="portrait",width=portrait?540:960,height=portrait?960:540;
  const ground=portrait?807:480,from=portrait?110:530,to=portrait?380:811;
  return{id:"traveller",stage:{width,height},stepLift:8,leanDegrees:1.65,
    cadenceFrames:2,keys:[
      {frame:0,x:from-75,y:ground,scale:portrait?1.07:.71,facing:"right",stepsToNext:0},
      {frame:152,x:from,y:ground,scale:portrait?1.07:.71,facing:"right",stepsToNext:7},
      {frame:340,x:to,y:ground,scale:portrait?1.07:.71,facing:"right",stepsToNext:0},
      {frame:415,x:to,y:ground,scale:portrait?1.07:.71,facing:"right"},
    ]};
}

export interface TravellerFilmCustomization {
  track?: WatercolourActorTrack;
  definition?: CharacterDefinition;
  instance?: CharacterInstance;
  cues?: readonly CharacterCue[];
  material?: CharacterWatercolourMaterial;
  background?: PaintedCompositionSpec;
  showShadow?: boolean;
  showActor?: boolean;
  showTypography?: boolean;
  paperColor?: string;
  text?: { kicker:string; line1:string; line2:string; subtitle:string };
}
/** Production and Storybook render the same original film; optional overrides never add a clock. */
export function PaintedTravellerPage({output,frame,reducedMotion=false,options}:{
  output:PaintedOutput;frame:number;reducedMotion?:boolean;options?:TravellerFilmCustomization;
}){
  const defaultBackground=useMemo(()=>paintedDemoSpec("nature",output,103),[output]);
  const defaultTrack=useMemo(()=>travellerTrack(output),[output]);
  const background=options?.background??defaultBackground;
  const track=options?.track??defaultTrack;
  const definition=options?.definition??TRAVELLER;
  const characterInstance=options?.instance??TRAVELLER_INSTANCE;
  const characterCues=options?.cues??TRAVELLER_CUES;
  const characterMaterial=options?.material??TRAVELLER_MATERIAL;
  const words=options?.text??{
    kicker:"PAINTED CHARACTERS / 01",line1:"Every journey",line2:"begins in colour.",
    subtitle:"A character walks through a world made of layered washes.",
  };
  const portrait=output==="portrait";
  const environmentFade=portrait
    ? "radial-gradient(ellipse 57% 40% at 50% 65%, #000 35%, #000 50%, transparent 100%)"
    : "radial-gradient(ellipse 44% 62% at 73% 56%, #000 34%, #000 53%, transparent 100%)";
  return <div style={{width:background.width,height:background.height,position:"relative",
    overflow:"hidden",background:options?.paperColor??"#F5EFE5"}}>
    <PaintedComposition spec={background} frame={frame} reducedMotion={reducedMotion}
      label="A luminous painted coastal landscape"
      style={{maskImage:environmentFade,WebkitMaskImage:environmentFade}}/>
    {options?.showActor!==false && <WatercolourActor track={track} definition={definition} instance={characterInstance}
      cues={characterCues} frame={frame} watercolourMaterial={characterMaterial}
      showShadow={options?.showShadow!==false}
      reducedMotion={reducedMotion} label="Illustrated traveller walking, waving and speaking"/>}
    {options?.showTypography!==false && <div style={{position:"absolute",left:portrait?37:48,top:portrait?69:58,
      pointerEvents:"none",maxWidth:portrait?462:390,color:"#384A50"}}>
      <div style={{font:"700 14px/1.4 system-ui,sans-serif",letterSpacing:2.1,marginBottom:14}}>
        {words.kicker}
      </div>
      <div style={{font:"italic 53px/1.06 Georgia,serif",letterSpacing:-1.3}}>
        {words.line1}<br/>{words.line2}
      </div>
      <div style={{font:"17px/1.5 Georgia,serif",maxWidth:335,marginTop:18}}>
        {words.subtitle}
      </div>
    </div>}
  </div>;
}
