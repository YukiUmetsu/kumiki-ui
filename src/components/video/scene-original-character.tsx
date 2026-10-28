/** Original, rights-cleared test performer for video QA.
 * All vector shapes are authored here; not based on the user-provided Pip artwork.
 * Uses the real Kumiki character evaluator and renderer, not CSS sprite cycling.
 */
import type { ReactNode } from "react";
import type { CharacterAsset, CharacterCue, CharacterDefinition, CharacterInstance, CharacterShape } from "../../../registry/character/definition";
import { CharacterPresenter } from "../../../registry/character/character-presenter-react";
import type { ImageAsset, SceneTemplateFrame } from "../../../registry/video/scene-templates";

const provenance={license:"original-generated-fixture",source:"Kumiki Scene QA original vector artwork"};
const shape=(shapes:CharacterShape[]):CharacterAsset=>({kind:"shapes",width:400,height:400,shapes,provenance});
const el=(cx:number,cy:number,rx:number,ry:number,fill:string,stroke?:string,strokeWidth?:number):CharacterShape=>
  ({type:"ellipse",cx,cy,rx,ry,fill,stroke,strokeWidth});
const path=(d:string,fill:string,stroke?:string,strokeWidth?:number):CharacterShape=>
  ({type:"path",d,fill,stroke,strokeWidth});
const rect=(x:number,y:number,width:number,height:number,fill:string,rx=0):CharacterShape=>
  ({type:"rect",x,y,width,height,fill,rx});

/** Cove, a tiny exploration automaton: separately hinged arms, neck, legs,
 * eyes and three authored mouth shapes on an original clean SVG silhouette. */
export const coveCharacter:CharacterDefinition={
  schemaVersion:1,characterId:"cove-scout",revision:"v1",mode:"puppet-2.5d",
  design:{width:400,height:400},channels:["body","head","arms","legs","face"],
  palette:{shell:"#e5eee7",shade:"#789cad",deep:"#1e475c",accent:"#78d6be",
    warm:"#f2b87f",ink:"#153044",glass:"#91d8e1"},
  assets:{
    tail:shape([path("M151 290Q81 271 84 224Q85 200 105 199Q133 206 126 232Q122 248 154 252Z","$shade","$deep",7)]),
    "leg-left":shape([rect(141,310,42,54,"$deep",18),el(152,363,38,17,"$shade","$deep",6)]),
    "leg-right":shape([rect(224,310,42,54,"$deep",18),el(258,363,38,17,"$shade","$deep",6)]),
    body:shape([el(203,275,97,91,"$deep","$glass",8),el(203,267,75,67,"$shade"),
      el(203,254,48,42,"$shell"),path("M172 257L197 279 238 231","none","$accent",9),
      el(141,286,12,15,"$warm"),el(259,286,12,15,"$warm")]),
    "arm-left":shape([path("M124 233Q106 241 100 289Q98 311 124 318L150 293 150 253Z","$shell","$deep",8),
      el(111,319,23,20,"$warm","$deep",6)]),
    "arm-right":shape([path("M279 232Q308 246 310 292Q311 313 280 319L252 285 255 250Z","$shell","$deep",8),
      el(302,319,23,20,"$warm","$deep",6)]),
    neck:shape([rect(182,182,43,34,"$deep",11)]),
    head:shape([path("M117 120Q119 76 201 66Q293 67 294 125L284 194Q255 216 202 216Q147 216 121 193Z","$shell","$deep",9),
      path("M129 116Q151 85 201 87Q257 87 283 116L275 171Q242 191 202 190Q155 192 133 172Z","$deep"),
      el(155,190,16,12,"$warm"),el(249,190,16,12,"$warm")]),
    ear:shape([path("M186 72L182 47Q182 29 204 29Q224 29 225 48L218 70Z","$shade","$deep",7),
      el(204,40,11,11,"$accent")]),
    eyes:shape([el(167,142,17,24,"$glass"),el(239,142,17,24,"$glass"),
      el(170,143,7,12,"$ink"),el(240,143,7,12,"$ink"),el(173,137,3,4,"$shell"),el(243,137,3,4,"$shell")]),
    "eyes-closed":shape([path("M150 143Q167 155 185 141","none","$glass",7),
      path("M220 141Q240 155 259 143","none","$glass",7)]),
    "mouth-rest":shape([path("M187 176Q204 183 221 175","none","$accent",5)]),
    "mouth-half":shape([el(204,176,17,9,"$accent","$shade",3),el(204,174,8,3,"$deep")]),
    "mouth-open":shape([el(204,178,18,16,"$accent","$shade",3),el(204,177,9,11,"$deep")]),
  },
  parts:[
    {id:"tail",channel:"body",asset:"tail",pivot:{x:151,y:260},z:0},
    {id:"leg-left",channel:"legs",asset:"leg-left",pivot:{x:165,y:320},z:1},
    {id:"leg-right",channel:"legs",asset:"leg-right",pivot:{x:243,y:320},z:2},
    {id:"body",channel:"body",asset:"body",pivot:{x:202,y:270},z:3},
    {id:"arm-left",channel:"arms",asset:"arm-left",pivot:{x:129,y:240},z:4},
    {id:"arm-right",channel:"arms",asset:"arm-right",pivot:{x:272,y:242},z:5},
    {id:"neck",channel:"body",asset:"neck",pivot:{x:204,y:189},z:6},
    {id:"head",channel:"head",asset:"head",pivot:{x:201,y:168},z:7},
    {id:"ear",channel:"head",asset:"ear",pivot:{x:204,y:72},z:8},
    {id:"eyes",channel:"face",asset:"eyes",pivot:{x:203,y:143},z:9,
      variants:{closed:"eyes-closed"}},
    {id:"mouth",channel:"face",asset:"mouth-rest",pivot:{x:203,y:178},z:10,
      variants:{rest:"mouth-rest",half:"mouth-half",open:"mouth-open"}},
  ],
  poses:{neutral:{}},basePose:"neutral",
  actions:{
    ask:{channel:"arms",blend:"override",priority:2,takeover:"blend-out",blendOutFrames:5,phases:[
      {name:"prepare",frames:6,pose:{"arm-right":{rotation:12}}},
      {name:"act",frames:10,pose:{"arm-right":{rotation:-133}},easing:"ease-out-cubic"},
      {name:"hold",frames:23,pose:{"arm-right":{rotation:-133}}},
      {name:"recover",frames:8,pose:{}},
    ]},
    point:{channel:"arms",blend:"override",priority:2,takeover:"blend-out",blendOutFrames:5,phases:[
      {name:"prepare",frames:4,pose:{"arm-right":{rotation:9}}},
      {name:"act",frames:8,pose:{"arm-right":{rotation:-94}},easing:"ease-out-cubic"},
      {name:"hold",frames:8,pose:{"arm-right":{rotation:-94}}},
      {name:"recover",frames:7,pose:{}},
    ]},
  },
  expressions:{default:"attentive",sets:{
    attentive:{pose:{"head":{rotation:-1}}},
    curious:{pose:{"head":{rotation:-8}}},
    pleased:{pose:{"head":{rotation:5}}},
  }},
  speech:{mouthPart:"mouth",rest:"rest",visemes:{A:"open",E:"half",M:"rest"},
    approximateCycle:["rest","half","open","half"],transitionFrames:2,approximateStepFrames:5},
  blink:{parts:["eyes"],variant:"closed",intervalFrames:{min:48,max:90},durationFrames:3},
  idle:{parts:{body:{property:"rotation",amplitude:.8,periodFrames:58},
    head:{property:"rotation",amplitude:1.3,periodFrames:69}}},
  capabilities:["talk","question-gesture","pointing","blink","idle","absolute-frame"],
};
export const coveInstance:CharacterInstance={
  instanceId:"qa-cove",characterId:"cove-scout",revision:"v1",seed:113,
};
export const coveCues:readonly CharacterCue[]=[
  {id:"cove-curious",instanceId:"qa-cove",kind:"expression",startFrame:0,name:"curious"},
  {id:"cove-ask",instanceId:"qa-cove",kind:"action",startFrame:25,name:"ask"},
  {id:"cove-speak",instanceId:"qa-cove",kind:"speech",startFrame:55,endFrame:83,precision:"approximate"},
  {id:"cove-point",instanceId:"qa-cove",kind:"action",startFrame:90,name:"point"},
  {id:"cove-smile",instanceId:"qa-cove",kind:"expression",startFrame:91,name:"pleased"},
];
export function renderOriginalSceneCharacter(asset:ImageAsset,frame:SceneTemplateFrame):ReactNode {
  if(asset.id==="character")return <CharacterPresenter definition={coveCharacter}
    instance={coveInstance} cues={coveCues} frame={frame.frame}
    label="Cove the explorer raising one arm, talking, and pointing"
    reducedMotion={frame.reducedMotion} data-km-video-qa-original-rig=""
    style={{width:"100%",height:"100%"}}/>;
  return <img alt={asset.alt} src={asset.src} draggable={false}
    style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>;
}
