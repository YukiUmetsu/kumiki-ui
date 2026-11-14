/** Original rig adaptation for an INK4 motion-direction proof.
 * All art is independently authored for Kumiki; the native 2.5D presenter
 * retains expressions, gaze, mouth articulation and painterly part materials.
 */
import { useMemo } from "react";
import type { CharacterAsset, CharacterDefinition, CharacterInstance } from "../../registry/character/definition";
import { inkCraftAsset, DEFAULT_INK_FIGURE_CRAFT } from "../../registry/video/ink-figure-craft";
import type { InkFigureCraftControls } from "../../registry/video/ink-figure-craft";
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
import { INK_TRAVELLER_FOLDS } from "./ink-figure-classical-art";
export { INK_TRAVELLER_FOLDS } from "./ink-figure-classical-art";

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
