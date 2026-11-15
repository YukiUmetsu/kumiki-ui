/** Original rig adaptation for an INK4 motion-direction proof.
 * All art is independently authored for Kumiki; the native 2.5D presenter
 * retains expressions, gaze, mouth articulation and painterly part materials.
 */
import { useMemo } from "react";
import type { CharacterAsset, CharacterDefinition, CharacterInstance } from "../../registry/character/definition";
import { DEFAULT_INK_FIGURE_CRAFT } from "../../registry/video/ink-figure-craft";
import { bakeInkClothCorrections } from "../../registry/video/ink-figure-motion";
import type { InkFigureCraftControls } from "../../registry/video/ink-figure-craft";
import { makeClassicalInkFigure } from "./ink-figure-classical-art";
export { INK_TRAVELLER_FOLDS } from "./ink-figure-classical-art";
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
const poly=(d:string,fill:string,stroke="#29302B",strokeWidth=1.6,opacity=1)=>({
  type:"path" as const,d,fill,stroke,strokeWidth,opacity,
});
/** The only difference from INK3's approved original traveler: add four anatomical leg
 * joint parts so world-locked inverse kinematics has actual knees to animate. */
const WALKING_TRAVELLER_BASE: CharacterDefinition={
  ...INK_TRAVELLER,
  revision:"ink-actor-ink6-walk-v1",
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
    // Fine interior cloth planes: independent from the fixed robe outline.
    // Each one remains attached to the corresponding body/sleeve joint.
    "hem-drape-art":art(
      poly("M84 291 Q104 297 126 301 Q156 306 193 294 L195 300 Q157 310 121 305 Q104 302 83 297 Z",
        "#7c8a7c","none",0,.22),
      poly("M89 293 Q112 299 135 300 Q165 302 189 295","none","#435348",1.25,.68),
      poly("M105 292 Q119 299 135 301","none","#e0e0d5",1.0,.50),
      poly("M154 299 Q167 296 180 292","none","#404f45",1.1,.51)),
    "far-cuff-art":art(
      poly("M44 242 Q58 247 77 245 Q85 243 88 238","none","#30382e",1.2,.75),
      poly("M49 239 Q58 241 72 240","none","#e4e1d2",1.6,.55),
      poly("M73 238 Q77 242 76 247","none","#606b61",.85,.55)),
    "near-cuff-art":art(
      poly("M188 242 Q201 251 216 248 Q227 245 231 238","none","#30382e",1.25,.79),
      poly("M194 243 Q204 247 213 245","none","#e4e1d2",1.5,.57),
      poly("M212 245 Q220 243 224 239","none","#5c655a",.9,.48)),
    // These two overlapping articulated fingers are IN FRONT of the brush
    // shaft; the parent hand still owns its existing action, and the prop
    // remains correctly attached during the greeting and painting gestures.
    "near-brush-grip-art":art(
      poly("M227 235 Q232 232 237 235 Q240 239 236 241 L232 239 Q231 242 227 244 L223 241 Q224 237 227 235 Z",
        "#d8cab0","#695f50",.75,.96),
      poly("M229 236 Q231 234 234 236 M226 241 Q229 243 231 241","none","#a99b88",.82,.85),
      poly("M234 239 Q239 239 238 243 Q235 245 231 244","none","#776b5a",.77,.85),
      poly("M229 239 Q231 240 232 241","none","#eee4d5",.8,.72)),
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
    {id:"hem-drape",asset:"hem-drape-art",parent:"body",channel:"body",pivot:{x:139,y:292},z:14},
    {id:"far-cuff",asset:"far-cuff-art",parent:"far-sleeve",channel:"arms",pivot:{x:63,y:243},z:8},
    {id:"near-cuff",asset:"near-cuff-art",parent:"near-sleeve",channel:"arms",pivot:{x:211,y:243},z:18},
    {id:"brush-grip",asset:"near-brush-grip-art",parent:"near-hand",channel:"prop",pivot:{x:232,y:239},z:23},
  ],
  capabilities:[...INK_TRAVELLER.capabilities,"world-foot-contact","two-bone-ik","cloth-follow-through","prop-finger-occlusion"],
};
/**
 * Part-attached, original costume drawings. Traditional Chinese figure-painting
 * line languages suggest flowing silk-thread contours, iron-wire folds and dry,
 * interrupted bristle marks. The paths are authored in the EXISTING art's
 * 260 × 340 design coordinates and therefore move with parent limb joints.
 */
export function makeInkWalkingTraveller(
  controls:InkFigureCraftControls=DEFAULT_INK_FIGURE_CRAFT,
):CharacterDefinition {
  // Match the richer classical portrait atlas already applied to Ensemble.
  // Director previously attached only the first generic robe-fold layer,
  // omitting the authored master face, hair, beard and orchid-leaf volumes.
  // This preserves all source pivots, IK joints and instance properties.
  return makeClassicalInkFigure(WALKING_TRAVELLER_BASE,"master",controls);
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

/** INK6 clothes have independent parts; a zero amount restores their neutral
 * shapes without changing the approved gait or near-hand/brush joint ancestry.
 */
export function inkDirectorInstance(aspect:DirectorAspect,clothAmount=.75):CharacterInstance {
  return {
    ...TRAVELLER_INSTANCE,revision:INK_WALKING_TRAVELLER.revision,
    corrections:{
      ...bakeInkWalkCorrections(inkDirectorGait(aspect),1),
      ...bakeInkClothCorrections({
        route:inkDirectorRoute(aspect),endFrame:419,cycleFrames:24,
        amount:clothAmount,
        parts:{hem:"hem-drape",nearCuff:"near-cuff",farCuff:"far-cuff"},
      }),
    },
  };
}
export const INK_DIRECTOR_SHOT:InkShot={
  id:"ink-traveler-directed",
  label:"An ink-wash traveler walks across a painted valley, stops and performs",
  durationFrames:420,
  layers:[{id:"traveler",startFrame:0,durationFrames:1,reveal:"instant",interactive:false}],
};
export function InkDirectorFilm({frame,aspect="landscape",reducedMotion=false,
  foldDetail=1,foldContrast=.85,clothAmount=.75}:{
  frame:number;aspect?:DirectorAspect;reducedMotion?:boolean;
  foldDetail?:number;foldContrast?:number;clothAmount?:number;
}) {
  const definition=useMemo(()=>makeInkWalkingTraveller({
    ...DEFAULT_INK_FIGURE_CRAFT,detail:foldDetail,contrast:foldContrast,
  }),[foldDetail,foldContrast]);
  const route=inkDirectorRoute(aspect);
  const track=bakeInkActorTrack(route);
  const spec=inkDirectorBackdrop(aspect);
  const instance=useMemo(()=>inkDirectorInstance(aspect,clothAmount),[aspect,clothAmount]);
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
        "hem-drape":{bleed:.73}, "far-cuff":{bleed:.42}, "near-cuff":{bleed:.42},
        "brush-grip":{bleed:0,dryContour:true},
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
