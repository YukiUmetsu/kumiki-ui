/** Original rig adaptation for an INK4 motion-direction proof.
 * All art is independently authored for Kumiki; the native 2.5D presenter
 * retains expressions, gaze, mouth articulation and painterly part materials.
 */
import { useMemo } from "react";
import type { CharacterAsset, CharacterDefinition, CharacterInstance } from "../../registry/character/definition";
import { inkCraftAsset, DEFAULT_INK_FIGURE_CRAFT } from "../../registry/video/ink-figure-craft";
import type { InkFigureCraftControls, InkFigureStroke } from "../../registry/video/ink-figure-craft";
import { InkCharacter } from "../../registry/video/ink-wash-character-react";
import { InkWashScene } from "../../registry/video/ink-wash-story-react";
import type { InkShot } from "../../registry/video/ink-wash-story";
import type { InkWashSpec, InkStroke } from "../../registry/video/ink-wash";
import { inkExampleSpec } from "./ink-wash-demo";
import { INK_TRAVELLER, TRAVELLER_INSTANCE, TRAVELLER_CUES } from "./ink-wash-performer";
import {
  bakeInkActorTrack, bakeInkWalkCorrections,
} from "../../registry/video/ink-actor-director";
import type { InkRoutePlan, InkWalkPlan } from "../../registry/video/ink-actor-director";

export type DirectorAspect="landscape"|"portrait";
const art=(...shapes:NonNullable<Extract<CharacterAsset,{kind:"shapes"}>["shapes"]>):CharacterAsset=>({
  kind:"shapes",width:260,height:340,shapes,
  provenance:{license:"original code-drawn demonstration art",source:"Original Kumiki-UI INK4 segmented-leg demonstration"},
});
const poly=(d:string,fill:string,stroke="#29302B",strokeWidth=1.6)=>({
  type:"path" as const,d,fill,stroke,strokeWidth,
});
/** The only difference from INK3's approved original traveler: add four anatomical leg
 * joint parts so world-locked inverse kinematics has actual knees to animate. */
const WALKING_TRAVELLER_BASE: CharacterDefinition={
  ...INK_TRAVELLER,
  revision:"ink-actor-ink4-walk-v1",
  assets:{
    ...INK_TRAVELLER.assets,
    "far-upper":art(
      poly("M109 253 Q98 273 101 295 L111 298 Q121 277 118 254 Z","#606861"),
      poly("M103 277 Q107 281 111 281","none","#90998d",.95)),
    "far-lower":art(
      poly("M101 290 Q98 313 91 324 L112 328 Q120 323 112 309 L112 293 Z","#49544d"),
      poly("M91 324 Q99 318 116 324 Q124 332 103 331 L88 330 Z","#343d35"),
      poly("M101 305 L103 319","none","#a6afa1",1.1)),
    "near-upper":art(
      poly("M135 252 Q131 274 148 293 L159 290 Q153 269 149 251 Z","#555b52"),
      poly("M145 276 L149 286","none","#90998e",1.1)),
    "near-lower":art(
      poly("M148 288 Q151 310 143 322 L164 328 Q167 313 159 291 Z","#39453d"),
      poly("M143 323 Q159 316 171 325 Q178 333 156 330 L141 329 Z","#283029"),
      poly("M154 302 Q155 307 157 312","none","#8b958a",1.1)),
  },
  // The source's old two-sprite step action targets the removed single-piece legs.
  // This rig uses source-authored IK correction tracks instead.
  actions:Object.fromEntries(Object.entries(INK_TRAVELLER.actions).filter(([id])=>id!=="step")),
  parts:[
    ...INK_TRAVELLER.parts.filter(part=>part.id!=="far-leg"&&part.id!=="near-leg"),
    {id:"far-thigh",asset:"far-upper",channel:"walk",pivot:{x:109,y:254},z:2},
    {id:"far-shin",asset:"far-lower",parent:"far-thigh",channel:"walk",pivot:{x:106,y:292},z:3},
    {id:"near-thigh",asset:"near-upper",channel:"walk",pivot:{x:145,y:255},z:3},
    {id:"near-shin",asset:"near-lower",parent:"near-thigh",channel:"walk",pivot:{x:153,y:290},z:4},
  ],
  capabilities:[...INK_TRAVELLER.capabilities,"world-foot-contact","two-bone-ik"],
};
/**
 * Part-attached, original costume drawings. Traditional Chinese figure-painting
 * line languages suggest flowing silk-thread contours, iron-wire folds and dry,
 * interrupted bristle marks. The paths are authored in the EXISTING art's
 * 260 × 340 design coordinates and therefore move with parent limb joints.
 */
const fold=(id:string,kind:InkFigureStroke["kind"],points:readonly (readonly[number,number,number])[],
  width:number,tone:number,water:number,detailMin=0,pigment?:string):InkFigureStroke=>({
  id,kind,points:points.map(([x,y,pressure])=>({x,y,pressure})),
  width,tone,water,detailMin,...(pigment?{pigment}:{}),
});
export const INK_TRAVELLER_FOLDS: Readonly<Record<string,readonly InkFigureStroke[]>>={
  robe:[
    fold("outer-shoulder","silk-thread",[[102,145,.05],[93,178,.31],[90,221,.54],[88,271,.39],[82,293,.03]],3.2,.64,.16,.15),
    fold("left-crease","fold",[[116,166,.05],[119,196,.24],[111,237,.67],[114,276,.32],[106,301,.02]],5.8,.60,.45,.35),
    fold("front-column","silk-thread",[[138,170,.03],[131,202,.22],[135,239,.53],[129,286,.35],[126,306,.01]],2.4,.55,.20,.18),
    fold("right-fall","fold",[[160,164,.04],[153,191,.26],[161,237,.65],[171,280,.48],[181,300,.02]],7,.53,.39,.2),
    fold("right-inset","silk-thread",[[178,179,.07],[172,215,.22],[179,261,.56],[194,291,.03]],2.2,.49,.19,.42),
    fold("gathered-center","silk-thread",[[134,231,.02],[137,248,.45],[139,275,.26],[146,302,.02]],1.7,.46,.10,.67),
    fold("left-hem","dry-brush",[[81,295,.04],[105,301,.37],[145,307,.50],[183,301,.32],[199,295,.02]],3.4,.64,.10,.44),
    fold("hem-inner","silk-thread",[[89,289,.04],[118,294,.35],[159,296,.32],[187,287,.03]],1.8,.39,.10,.80),
    fold("under-arm-shadow","fold",[[98,174,.04],[109,185,.42],[113,207,.06]],4.8,.58,.43,.54),
    fold("belt-radial","silk-thread",[[138,228,.04],[146,251,.30],[147,271,.09]],1.9,.42,.14,.82),
  ],
  "sleeve-far":[
    fold("sleeve-far-fold","fold",[[89,161,.02],[79,183,.27],[67,216,.66],[47,238,.05]],5.5,.63,.37,.2),
    fold("sleeve-far-edge","silk-thread",[[63,178,.03],[56,203,.51],[44,230,.22],[41,242,.02]],2.0,.67,.12,.48),
    fold("sleeve-far-crease","silk-thread",[[84,202,.04],[78,227,.43],[69,246,.03]],2.2,.53,.10,.65),
    fold("sleeve-far-cuff","dry-brush",[[43,242,.05],[59,247,.33],[76,244,.38],[87,238,.02]],2.4,.52,.09,.7),
  ],
  "sleeve-near":[
    fold("near-sleeve-volume","fold",[[174,157,.02],[183,180,.43],[202,216,.65],[220,237,.04]],6,.63,.45,.2),
    fold("near-sleeve-inside","silk-thread",[[190,167,.03],[192,190,.31],[202,218,.65],[205,239,.04]],2.2,.57,.12,.50),
    fold("near-sleeve-left","silk-thread",[[167,185,.02],[180,212,.38],[191,247,.07]],1.9,.42,.12,.66),
    fold("near-sleeve-cuff","dry-brush",[[190,243,.02],[207,250,.40],[224,244,.28],[231,237,.02]],2.7,.63,.13,.78),
  ],
  "hand-far":[
    fold("far-thumb","silk-thread",[[42,238,.10],[46,235,.55],[52,238,.23]],1.4,.42,.07,.4,"$shadow"),
    fold("far-knuckles","silk-thread",[[45,245,.04],[50,246,.43],[56,242,.04]],.8,.44,.05,.73,"$skinshade"),
  ],
  "hand-near":[
    fold("near-thumb","silk-thread",[[218,242,.03],[221,238,.56],[226,236,.04]],1.3,.6,.07,.38),
    fold("near-knuckles","silk-thread",[[224,247,.06],[229,248,.39],[234,245,.04]],.9,.58,.06,.61),
    fold("near-fingers","silk-thread",[[224,239,.07],[229,241,.44],[233,239,.08]],.85,.49,.06,.80),
  ],
  hair:[
    fold("temple-ink","silk-thread",[[112,76,.01],[124,64,.57],[145,60,.24],[165,69,.01]],2.4,.41,.12,.35,"$wash"),
    fold("hair-bun-bristles","dry-brush",[[137,29,.06],[143,32,.43],[147,46,.10]],2,.38,.10,.73,"$wash"),
  ],
  beard:[
    fold("beard-flow","silk-thread",[[135,141,.04],[141,153,.55],[142,169,.03]],1.55,.46,.11,.4,"$ink"),
    fold("beard-split","silk-thread",[[147,146,.04],[146,156,.47],[143,168,.02]],.9,.43,.06,.77,"$wash"),
  ],
  "far-upper":[
    fold("far-knee-shadow","fold",[[110,266,.03],[106,281,.55],[106,292,.07]],2.5,.49,.3,.46),
  ],
  "near-upper":[
    fold("near-knee-shadow","fold",[[144,265,.04],[149,279,.53],[152,288,.03]],3,.53,.25,.43),
  ],
  "far-lower":[
    fold("far-boot-crease","dry-brush",[[93,324,.02],[102,320,.32],[114,324,.02]],1.7,.41,.12,.66),
  ],
  "near-lower":[
    fold("near-boot-crease","dry-brush",[[146,325,.03],[158,322,.49],[168,327,.02]],2.1,.52,.12,.63),
  ],
};
export function makeInkWalkingTraveller(
  controls:InkFigureCraftControls=DEFAULT_INK_FIGURE_CRAFT,
):CharacterDefinition {
  // Only original SVG shapes are augmented. Pivot, channels, facial layers,
  // acting cues, asset rights and all authored rig limits remain untouched.
  const assets={...WALKING_TRAVELLER_BASE.assets};
  for(const [key,folds] of Object.entries(INK_TRAVELLER_FOLDS)){
    const asset=assets[key];
    if(!asset||asset.kind!=="shapes")
      throw new RangeError("INK5 expected the approved vector costume asset "+key);
    assets[key]=inkCraftAsset(asset,folds,controls);
  }
  return {...WALKING_TRAVELLER_BASE,assets};
}
export const INK_WALKING_TRAVELLER:CharacterDefinition=makeInkWalkingTraveller();

export function inkDirectorRoute(aspect:DirectorAspect):InkRoutePlan {
  const portrait=aspect==="portrait", y=portrait?810:484;
  return {
    id:"ink-traveler-continuous",instanceId:TRAVELLER_INSTANCE.instanceId,
    // At 218 the feet settle and the root STOPS; the subsequent expression,
    // speech recovery and bow act in place instead of gliding on neutral legs.
    stopAtEnds:true,waypoints:portrait
      ?[{frame:0,x:135,y},{frame:110,x:220,y:y-9},
        {frame:195,x:276,y:y-15},{frame:218,x:288,y:y-15},{frame:340,x:288,y:y-15}]
      :[{frame:0,x:150,y},{frame:110,x:360,y:y-3},
        {frame:195,x:560,y:y-12},{frame:218,x:572,y:y-12},{frame:340,x:572,y:y-12}],
  };
}
export function inkDirectorGait(aspect:DirectorAspect):InkWalkPlan {
  return {
    route:inkDirectorRoute(aspect),startFrame:0,endFrame:218,
    cycleFrames:24,stanceFraction:.58,hipHeight:70,
    upperLength:38,lowerLength:36,footLift:11,footSeparation:3,bodyBob:1.7,
    parts:{
      leftUpper:"far-thigh",leftLower:"far-shin",
      rightUpper:"near-thigh",rightLower:"near-shin",
      torso:"body",head:"head",
      leftArm:"far-sleeve",rightArm:"near-sleeve",
      leftSleeve:"far-hand",rightSleeve:"near-hand",
    },
  };
}
/**
 * Story-specific, original dry-brush footpath. Character movement is sampled
 * independently of the settled backdrop, as in traditional multiplane acting.
 * Its three pigment passes trace the EXACT authored ground route rather than
 * painting a floating decorative wave beneath a walking figure.
 */
export function inkDirectorBackdrop(aspect:DirectorAspect):InkWashSpec {
  const base=inkExampleSpec("landscape",aspect);
  const portrait=aspect==="portrait";
  const path=portrait
    ? [[55,813,.06],[135,810,.29],[220,801,.46],[288,795,.30],[432,794,.04]]
    : [[60,484,.05],[150,484,.33],[360,481,.49],[572,472,.32],[795,473,.04]];
  const add=(id:string,width:number,tone:number,water:number,load:number,
    offset:number,brush:"upright"|"oblique"):InkStroke=>({
    id,points:path.map(([x,y,pressure])=>({x,y:y+offset,pressure})),
    width,tone,water,load,brush,tipInk:brush==="oblique"?.42:.7,
    drag:brush==="oblique"?.24:.86,startFrame:0,
    drawFrames:2,spreadFrames:18,dryFrames:35,
  });
  return {
    ...base,
    strokes:[
      ...base.strokes,
      add("traveler-ground-dilute",30,.20,.94,.66,9,"oblique"),
      add("traveler-ground-edge",5,.60,.19,.83,6,"upright"),
      add("traveler-ground-fibers",2.3,.37,.12,.73,13,"upright"),
    ],
  };
}

export function inkDirectorInstance(aspect:DirectorAspect):CharacterInstance {
  return {
    ...TRAVELLER_INSTANCE,revision:INK_WALKING_TRAVELLER.revision,
    corrections:bakeInkWalkCorrections(inkDirectorGait(aspect),1),
  };
}
export const INK_DIRECTOR_SHOT:InkShot={
  id:"ink-traveler-directed",
  label:"An ink-wash traveler walks across a painted valley, stops and performs",
  durationFrames:420,
  layers:[{id:"traveler",startFrame:0,durationFrames:1,reveal:"instant",interactive:false}],
};
export function InkDirectorFilm({frame,aspect="landscape",reducedMotion=false,
  foldDetail=1,foldContrast=.85}:{
  frame:number;aspect?:DirectorAspect;reducedMotion?:boolean;
  foldDetail?:number;foldContrast?:number;
}) {
  const definition=useMemo(()=>makeInkWalkingTraveller({
    ...DEFAULT_INK_FIGURE_CRAFT,detail:foldDetail,contrast:foldContrast,
  }),[foldDetail,foldContrast]);
  const route=inkDirectorRoute(aspect);
  const track=bakeInkActorTrack(route);
  const spec=inkDirectorBackdrop(aspect);
  const instance=inkDirectorInstance(aspect);
  const fpsFrame=Math.max(0,Math.min(419,Math.floor(frame)));
  // The source's old step action is disabled so new IK motion is not overlaid on
  // a simultaneous conflicting original gait; all other face/gesture cues survive.
  const cues=TRAVELLER_CUES.filter(c=>!(c.kind==="action"&&c.name==="step"));
  return <InkWashScene spec={spec} shot={INK_DIRECTOR_SHOT} frame={fpsFrame}
    paintFrame={419}
    reducedMotion={reducedMotion} label="Painted landscape with a walking articulated ink character"
    renderLayer={()=> <InkCharacter definition={definition} instance={instance}
      track={track} cues={cues} frame={reducedMotion?419:fpsFrame}
      reducedMotion={reducedMotion} label="Ink traveler with planted feet, separate knees and expressive face"
      absorption={.73} grain={.70}
      partFinish={{
        body:{bleed:.91}, "far-sleeve":{bleed:1}, "near-sleeve":{bleed:1},
        "far-thigh":{bleed:.45}, "near-thigh":{bleed:.45},
        head:{bleed:.12,dryContour:true},hair:{bleed:.25,dryContour:true},
        eyes:{bleed:0,dryContour:true},brows:{bleed:0,dryContour:true},
        mouth:{bleed:0,dryContour:true},
        brush:{bleed:0,dryContour:true},
      }}
      style={{marginTop:10}}
      />}>
    <div data-km-ink-directed-caption="" style={{position:"absolute",
      left:aspect==="portrait"?33:42,top:aspect==="portrait"?76:50,
      width:aspect==="portrait"?450:720,
      color:"#303832",pointerEvents:"none"}}>
      <div style={{font:"600 11px/1.4 Arial, sans-serif",letterSpacing:2.1}}>
        ORIGINAL INK PERFORMANCE / INK4
      </div>
      <div style={{font:"400 36px/1.2 Georgia,serif",marginTop:10}}>
        Across a quiet valley
      </div>
      <div style={{font:"14px/1.5 Arial, sans-serif",marginTop:9,opacity:.7}}>
        Feet settle. Cloth follows. The ink holds.
      </div>
    </div>
  </InkWashScene>;
}
