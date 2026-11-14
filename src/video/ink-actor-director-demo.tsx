/** Original rig adaptation for an INK4 motion-direction proof.
 * All art is independently authored for Kumiki; the native 2.5D presenter
 * retains expressions, gaze, mouth articulation and painterly part materials.
 */
import type { CharacterAsset, CharacterDefinition, CharacterInstance } from "../../registry/character/definition";
import { InkCharacter } from "../../registry/video/ink-wash-character-react";
import { InkWashScene } from "../../registry/video/ink-wash-story-react";
import type { InkShot } from "../../registry/video/ink-wash-story";
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
export const INK_WALKING_TRAVELLER: CharacterDefinition={
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
export function inkDirectorRoute(aspect:DirectorAspect):InkRoutePlan {
  const portrait=aspect==="portrait", y=portrait?810:484;
  return {
    id:"ink-traveler-continuous",instanceId:TRAVELLER_INSTANCE.instanceId,
    stopAtEnds:true,waypoints:portrait
      ?[{frame:0,x:135,y},{frame:110,x:220,y:y-9},
        {frame:210,x:288,y:y-15},{frame:340,x:305,y:y-15}]
      :[{frame:0,x:150,y},{frame:110,x:360,y:y-3},
        {frame:210,x:572,y:y-12},{frame:340,x:638,y:y-12}],
  };
}
export function inkDirectorGait(aspect:DirectorAspect):InkWalkPlan {
  return {
    route:inkDirectorRoute(aspect),startFrame:0,endFrame:218,
    cycleFrames:45,stanceFraction:.61,hipHeight:70,
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
export function InkDirectorFilm({frame,aspect="landscape",reducedMotion=false}:{
  frame:number;aspect?:DirectorAspect;reducedMotion?:boolean;
}) {
  const route=inkDirectorRoute(aspect);
  const track=bakeInkActorTrack(route);
  const spec=inkExampleSpec("landscape",aspect);
  const instance=inkDirectorInstance(aspect);
  const fpsFrame=Math.max(0,Math.min(419,Math.floor(frame)));
  // The source's old step action is disabled so new IK motion is not overlaid on
  // a simultaneous conflicting original gait; all other face/gesture cues survive.
  const cues=TRAVELLER_CUES.filter(c=>!(c.kind==="action"&&c.name==="step"));
  return <InkWashScene spec={spec} shot={INK_DIRECTOR_SHOT} frame={fpsFrame}
    reducedMotion={reducedMotion} label="Painted landscape with a walking articulated ink character"
    renderLayer={()=> <InkCharacter definition={INK_WALKING_TRAVELLER} instance={instance}
      track={track} cues={cues} frame={reducedMotion?419:fpsFrame}
      reducedMotion={reducedMotion} label="Ink traveler with planted feet, separate knees and expressive face"
      absorption={.67} grain={.59}
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
