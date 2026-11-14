import {useMemo} from "react";
import type {CharacterCue,CharacterDefinition,CharacterInstance,CharacterShapeAsset} from "../../registry/character/definition";
import {InkCharacter} from "../../registry/video/ink-wash-character-react";
import {bakeInkActorTrack,bakeInkWalkCorrections,inkRouteAt} from "../../registry/video/ink-actor-director";
import {bakeInkClothCorrections} from "../../registry/video/ink-figure-motion";
import {InkShanshuiStage} from "../../registry/video/ink-shanshui-react";
import {shanshuiRoute,DEFAULT_SHANSHUI,SHANSHUI_FRAMES} from "../../registry/video/ink-shanshui";
import type {ShanshuiControls,ShanshuiScene} from "../../registry/video/ink-shanshui";
import {makeInkWalkingTraveller,inkDirectorGait} from "./ink-actor-director-demo";
import type {InkFigureCraftControls} from "../../registry/video/ink-figure-craft";
import {shanshuiFaceAssets} from "./ink-shanshui-face-plates";
import {
  shanshuiBodyFit,shanshuiBodyAssets,applyShanshuiBodyFit,shanshuiFittedRoute,
} from "./ink-shanshui-full-body";

const p=(d:string,fill="none",stroke="$ink",strokeWidth=1,opacity=1)=>({
  type:"path" as const,d,fill,stroke,strokeWidth,opacity,
});
const originalArt=(...shapes:ReturnType<typeof p>[]):CharacterShapeAsset=>({
  kind:"shapes",width:260,height:340,shapes,
  provenance:{license:"CC0-1.0",source:"Original Kumiki code-drawn shanshui scholar costume"},
});
/** Full coverage first: opaque original rice-paper and cloth primer prevents
 * any mountains or rock hatching showing through the figure's torso/garment.
 * Loose dry/wet brush overlays come AFTER this well-defined body silhouette.
 */
const opaqueRobe=originalArt(
  p("M101 137 Q83 153 81 188 Q83 236 78 273 Q68 292 79 301 Q121 314 170 309 Q198 307 202 298 Q197 260 182 194 Q185 152 165 136 Q139 131 101 137 Z",
    "$linen","none",0,1),
  p("M101 139 Q87 184 87 227 Q80 262 75 292 Q82 308 121 314 L153 305 Q135 273 136 228 Q135 181 151 144 Z".replace(/\s+/g," "),
    "$mist","none",0,.92),
);
const robeDecor=originalArt(
  p("M105 166 Q91 199 83 233 Q69 271 56 296 Q76 295 91 287 Q101 308 117 321 Q142 331 163 318 Q190 326 211 306 Q186 273 181 245 Q179 207 160 172 Z",
    "$wash","$shadow",1.25,.74),
  p("M119 166 Q101 201 97 249 Q90 284 83 296 Q102 303 127 320 Q146 325 163 312 Q169 280 155 230 Z",
    "$mist","none",0,.73),
  p("M158 169 Q175 208 170 247 Q171 283 208 306 L186 316 Q158 289 148 245 Z",
    "$deep","none",0,.26),
  p("M113 176 Q103 226 104 259 Q100 293 117 316","none","$shadow",1.35,.8),
  p("M138 180 Q132 232 142 284 Q143 308 151 321","none","$shadow",.95,.68),
  p("M161 184 Q156 222 165 254 Q169 291 194 307","none","$shadow",1.1,.62),
  p("M85 294 Q137 316 204 303","none","$linen",1.75,.54),
  p("M70 287 Q74 296 90 301","none","$shadow",.7,.62),
  p("M179 299 Q188 299 202 304","none","$shadow",.8,.46),
);
const flowingHem=originalArt(
  p("M121 258 Q98 286 65 302 Q79 307 112 309 Q89 318 64 327 Q110 327 144 319 Q165 326 187 319 Q166 303 161 285 Z",
    "$linen","$shadow",1.1,.69),
  p("M124 277 Q100 307 78 312 Q112 312 135 306 M103 316 Q135 322 166 313","none","$shadow",1.25,.66),
  p("M117 298 Q106 308 90 319 M145 291 Q150 304 162 315",
    "none","$paper",2.1,.52),
  p("M71 325 Q93 329 110 322","none","$ink",1,.54),
);
const floatingSash=originalArt(
  p("M143 217 Q121 243 93 258 Q68 267 45 270 Q67 279 96 267 Q124 263 153 240 Z",
    "$deep","$shadow",.9,.37),
  p("M145 220 Q111 259 55 272 M139 229 Q117 251 89 259",
    "none","$linen",1.2,.59),
  p("M138 221 Q153 265 176 298","none","$twine",1.1,.53),
);
const hairRibbon=originalArt(
  p("M138 51 Q111 47 86 50 Q60 50 41 45 Q68 56 92 56 Q118 58 136 57 Z","$shadow","$ink",.7,.81),
  p("M139 54 Q104 67 81 72 Q59 75 44 69 Q68 84 96 74 Q118 67 140 60 Z",
    "$deep","$shadow",.9,.68),
  p("M126 54 Q90 55 59 48","none","$linen",.8,.7),
);
const nearSleeveDecoration=originalArt(
  p("M166 164 Q175 189 185 214 Q190 236 204 248 Q219 253 228 238",
    "none","$ink",1.05,.67),
  p("M177 177 Q191 217 197 233","none","$paper",2.7,.51),
  p("M175 204 Q183 230 196 244","none","$shadow",1.1,.61),
  p("M189 245 Q209 255 227 239","none","$linen",2,.66),
);

/** A scene-specific portrait, not a replacement for the canonical walking rig.
 * Warm, longer nested robes and fluttering bands are original code-drawn assets.
 * Preserve real split knees, the instructor's face/visemes and body-pivot system.
 */
export function makeShanshuiScholar(
  detail=1,contrast=.9,scene:ShanshuiScene="mountain-trail",
):CharacterDefinition {
  const craft:InkFigureCraftControls={detail,contrast,seed:83};
  const base=makeInkWalkingTraveller(craft);
  // A single image-to-rig projection calibrates head, shoulder, elbow/cuff,
  // hands, torso, belt, hips, robe, hem and shoes in one coordinated pass.
  const artwork=shanshuiFaceAssets(scene);
  const completeBody=shanshuiBodyAssets(scene);
  const fittedParts=applyShanshuiBodyFit(scene,base.parts);
  shanshuiBodyFit(scene);
  return {
    ...base,characterId:"shanshui-scholar",
    revision:"shanshui-scholar-complete-figure-"+scene+"-v3",
    palette:{
      ...base.palette,ink:"#403329",shadow:"#69543f",wash:"#c6ad8c",
      mist:"#e3d2b8",deep:"#937657",paper:"#f6ead4",
      skin:"#ddc3a5",skinshade:"#ad8d70",linen:"#f2e5cc",
      twine:"#9e7955",cinnabar:"#a24c3e",
    },
    assets:{
      ...base.assets,
      ...artwork,
      ...completeBody,
      "scholar-opaque-ground":completeBody["scholar-opaque-ground"],
      "scholar-robe-overlay":completeBody["scholar-robe-overlay"],
      "scholar-flowing-hem":completeBody["scholar-flowing-hem"],
      "scholar-sash":completeBody["scholar-sash"],
      "scholar-hair-band":completeBody["scholar-hair-band"],
      "scholar-sleeve-contour":completeBody["scholar-sleeve-contour"],
    },
    parts:[
      ...fittedParts,
      {id:"robe-opaque",asset:"scholar-opaque-ground",parent:"body",
        channel:"body",pivot:{x:133,y:188},z:9},
      {id:"robe-outer",asset:"scholar-robe-overlay",parent:"body",
        channel:"body",pivot:{x:136,y:204},z:11},
      {id:"hem-flow",asset:"scholar-flowing-hem",parent:"body",
        channel:"body",pivot:{x:141,y:270},z:11},
      {id:"sash-tail",asset:"scholar-sash",parent:"body",
        channel:"body",pivot:{x:144,y:222},z:14},
      {id:"hair-band",asset:"scholar-hair-band",parent:"head",
        channel:"head",pivot:{x:137,y:56},z:19},
      {id:"sleeve-paint",asset:"scholar-sleeve-contour",parent:"near-sleeve",
        channel:"arms",pivot:{x:190,y:211},z:18},
    ],
    capabilities:[...base.capabilities,"sepia-figure","outer-robe",
      "cloth-ribbon","teacher-measured-proportions",
      "full-figure-source-fit","distinct-face-profiles"],
  };
}
export interface ShanshuiFilmProps {
  frame:number;
  controls?:ShanshuiControls;
  reducedMotion?:boolean;
  showScholar?:boolean;
  clothAmount?:number;
}
export function shanshuiScholarInstance(
  scene:ShanshuiScene,clothAmount=.72,
):CharacterInstance {
  if(!Number.isFinite(clothAmount)||clothAmount<0||clothAmount>1)
    throw new RangeError("Scholar cloth motion must be in 0..1.");
  const route=shanshuiFittedRoute(scene);
  const gait=inkDirectorGait("landscape");
  // With hands holding a scroll / touching the chin, legacy walking arm
  // swings break contact. Keep the proven lower-limb gait but let true
  // source-designed shoulder/sleeve pivots retain their authored poses.
  const correctionTracks=bakeInkWalkCorrections({
    ...gait,route,startFrame:0,endFrame:154,
    cycleFrames:26,footLift:5.5,bodyBob:1.0,
    parts:{
      leftUpper:gait.parts.leftUpper,leftLower:gait.parts.leftLower,
      rightUpper:gait.parts.rightUpper,rightLower:gait.parts.rightLower,
      torso:"body",head:"head",
    },
  },2);
  const cloth=bakeInkClothCorrections({
    route,endFrame:SHANSHUI_FRAMES-1,
    cycleFrames:26,amount:clothAmount,
    parts:{hem:"hem-drape",nearCuff:"near-cuff",farCuff:"far-cuff"},
  },3);
  const trailing=Array.from({length:76},(_,i)=>{
    const frame=Math.min(299,i*4);
    const vel=inkRouteAt(route,frame).vx;
    const gait=clamp01(Math.abs(vel)/1.8);
    return {frame,pose:{
      rotation:clothAmount===0?0:(-1.2-1.8*Math.sin(frame*.12))*gait*clothAmount,
      x:clothAmount===0?0:-2*Math.sin(frame*.09)*gait*clothAmount,
    }};
  });
  return {
    instanceId:route.instanceId,characterId:"shanshui-scholar",
    revision:"shanshui-scholar-complete-figure-"+scene+"-v3",seed:113,
    params:{sleeveVolume:scene==="river-scholar"?1.1:scene==="misty-hermit"?.86:.94},
    targets:{landscape:{x:16,y:77},viewer:{x:176,y:90}},
    corrections:{...correctionTracks,...cloth,"sash-tail":trailing,"hem-flow":trailing},
  };
}
const clamp01=(n:number)=>Math.max(0,Math.min(1,n));
const cues=(scene:ShanshuiScene):CharacterCue[]=>[
  {id:scene+"-look",kind:"gaze",target:"landscape",startFrame:43,
    endFrame:240,instanceId:"shanshui-scholar"},
  {id:scene+"-contemplate",kind:"action",name:"ponder",startFrame:148,
    instanceId:"shanshui-scholar"},
  {id:scene+"-attention",kind:"expression",name:"attentive",
    startFrame:151,endFrame:284,instanceId:"shanshui-scholar"},
  {id:scene+"-bow",kind:"action",name:"bow",startFrame:247,
    instanceId:"shanshui-scholar"},
];
/** Render in the same absolute film frame as leaves, bird, water and camera.
 * All artwork is native SVG/DOM; no rasterized AI scenery or CSS video playback.
 */
export function InkShanshuiFilm({frame,controls=DEFAULT_SHANSHUI,
  reducedMotion=false,showScholar=true,clothAmount=.72}:ShanshuiFilmProps){
  const definition=useMemo(()=>makeShanshuiScholar(controls.detail,.9,controls.scene),
    [controls.detail,controls.scene]);
  const instance=useMemo(()=>shanshuiScholarInstance(controls.scene,clothAmount),
    [controls.scene,clothAmount]);
  const route=useMemo(()=>shanshuiFittedRoute(controls.scene),[controls.scene]);
  const track=useMemo(()=>bakeInkActorTrack(route),[route]);
  const performance=useMemo(()=>cues(controls.scene),[controls.scene]);
  return <InkShanshuiStage frame={frame} controls={controls}
    reducedMotion={reducedMotion}>
    {showScholar&&<InkCharacter definition={definition} instance={instance}
      cues={performance} frame={frame} track={track}
      label="An original sepia ink scholar with planted feet and layered flowing robes"
      reducedMotion={reducedMotion} absorption={.72} grain={.63}
      partFinish={{
        body:{bleed:.76},"robe-outer":{bleed:.88},"hem-flow":{bleed:.72},
        "sash-tail":{bleed:.67},"sleeve-paint":{bleed:.32},
        "far-sleeve":{bleed:.7},"near-sleeve":{bleed:.65},
        head:{bleed:.09,dryContour:true},hair:{bleed:.18,dryContour:true},
        "hair-band":{bleed:.24},
        eyes:{bleed:0,dryContour:true},"pupil-left":{bleed:0,dryContour:true},
        "pupil-right":{bleed:0,dryContour:true},
        mouth:{bleed:0,dryContour:true},brows:{bleed:0,dryContour:true},
        "near-hand":{bleed:.06,dryContour:true},"far-hand":{bleed:.06,dryContour:true},
      }}/>}
  </InkShanshuiStage>;
}
