/**
 * Material-native shanshui film direction. Coordinates are 960×540 paper units,
 * matching the horizontal composition in the three supplied reference images.
 * The engine draws original geometry: reference images never become textures.
 * Absolute-frame sampling makes backward seek, export and reduced motion safe.
 */
import type {InkRoutePlan} from "./ink-actor-director";

export type ShanshuiScene = "misty-hermit"|"river-scholar"|"mountain-trail";
export const SHANSHUI_SCENES:readonly ShanshuiScene[]=[
  "misty-hermit","river-scholar","mountain-trail",
];
/** Historical brush grammars are separate technique studies, not a single mixed filter. */
export type InkRockSchool="fuchun"|"early-spring"|"travelers"|"forest-grotto";
export const INK_ROCK_SCHOOLS:readonly InkRockSchool[]=[
  "fuchun","early-spring","travelers","forest-grotto",
];
export const SHANSHUI_FRAMES=300;
export const SHANSHUI_WIDTH=960,SHANSHUI_HEIGHT=540;
export interface ShanshuiControls {
  scene:ShanshuiScene;
  /** Source-specific, code-drawn rock construction, independent of scene/clock. */
  inkSchool?:InkRockSchool;
  /** Experimental, reversible Fuchun-only 3rd-band rock silhouette; never the normal film default. */
  fuchunNearShoulderStudy?:boolean;
  /** Independent, bounded original pigment/foliage topology. */
  seed:number;
  /** 0..1; controls the number of brush and dry-rock details, not a post-filter. */
  detail:number;
  /** 0..1; atmosphere and paper-white distance, separately from near contours. */
  mist:number;
  /** 0..1; subtle physically plausible independent twig movement. */
  wind:number;
  /** 0..1; ink mass density and stroke alpha. */
  ink:number;
}
export const DEFAULT_SHANSHUI:ShanshuiControls={
  scene:"mountain-trail",inkSchool:"fuchun",seed:71,detail:.9,mist:.67,wind:.32,ink:.73,
};
export interface ShanshuiMotion {
  frame:number;cameraX:number;cameraY:number;cameraZoom:number;
  birdX:number;birdY:number;birdWing:number;cloudX:number;mistX:number;
  breeze:number;waterPhase:number;scholarX:number;scholarY:number;
}
const finite=(v:number,min:number,max:number)=>Number.isFinite(v)&&v>=min&&v<=max;
export function assertShanshuiControls(c:ShanshuiControls):void {
  if(!c||!SHANSHUI_SCENES.includes(c.scene)||
    (c.inkSchool!==undefined&&!INK_ROCK_SCHOOLS.includes(c.inkSchool))||
    (c.fuchunNearShoulderStudy!==undefined&&typeof c.fuchunNearShoulderStudy!=="boolean")||
    !Number.isSafeInteger(c.seed)||c.seed<0||c.seed>2147483647||
    !finite(c.detail,0,1)||!finite(c.mist,0,1)||
    !finite(c.wind,0,1)||!finite(c.ink,0,1))
    throw new RangeError("Shanshui requires a supported scene, integer seed and finite 0..1 art controls.");
}
export function shanshuiHash(seed:number,n:number):number{
  let x=(seed^Math.imul(n+1,0x9e3779b1))|0;
  x=Math.imul(x^(x>>>16),0x85ebca6b);
  x=Math.imul(x^(x>>>13),0xc2b2ae35);
  return ((x^(x>>>16))>>>0)/4294967295;
}
const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
const smooth=(t:number)=>t*t*(3-2*t);
const clip=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
const walkWaypoints:Record<ShanshuiScene,readonly [number,number,number,number][]> = {
  "misty-hermit":[[0,436,470,.72],[84,453,471,.73],[160,477,475,.73],[299,477,475,.73]],
  "river-scholar":[[0,215,475,.78],[84,248,474,.79],[160,292,474,.8],[299,292,474,.8]],
  "mountain-trail":[[0,422,475,.72],[84,453,470,.74],[160,496,468,.76],[299,496,468,.76]],
};
export function shanshuiRoute(scene:ShanshuiScene):InkRoutePlan {
  if(!SHANSHUI_SCENES.includes(scene))throw new RangeError("Unknown shanshui route.");
  return {
    id:"shanshui-"+scene,instanceId:"shanshui-scholar",
    stopAtEnds:true,
    waypoints:walkWaypoints[scene].map(([frame,x,y,scale])=>({
      frame,x,y,scale,facing:"right" as const,
    })),
  };
}
export function shanshuiAt(
  controls:ShanshuiControls,frame:number,reducedMotion=false,
):ShanshuiMotion {
  assertShanshuiControls(controls);
  if(!Number.isSafeInteger(frame)||frame<0||frame>=SHANSHUI_FRAMES)
    throw new RangeError("Shanshui frame must be in the authored 300-frame shot.");
  const t=reducedMotion?SHANSHUI_FRAMES-1:frame;
  const path=walkWaypoints[controls.scene];
  let a=path[0],b=path[path.length-1];
  for(let i=0;i<path.length-1;i++){
    if(t<=path[i+1][0]){a=path[i];b=path[i+1];break;}
  }
  const progress=smooth(clip((t-a[0])/(b[0]-a[0]),0,1));
  const scholarX=mix(a[1],b[1],progress),scholarY=mix(a[2],b[2],progress);
  // Air/water/branch motions are independent *pure* absolute-frame functions.
  // The camera stays intentionally restrained to preserve the painted layout.
  const pan=t/SHANSHUI_FRAMES;
  return {
    frame:t,
    cameraX:reducedMotion?0:-8*pan,
    cameraY:reducedMotion?0:1.8*Math.sin(pan*Math.PI),
    cameraZoom:reducedMotion?1:1+.022*smooth(pan),
    birdX:620+92*pan,birdY:145+4*Math.sin(t*.04),
    birdWing:reducedMotion?0:Math.sin(t*.21)*.48,
    cloudX:reducedMotion?0:12*Math.sin(t*.009),
    mistX:reducedMotion?0:14*Math.sin(t*.01),
    breeze:reducedMotion?0:controls.wind*(Math.sin(t*.052)+.34*Math.sin(t*.018+.8)),
    waterPhase:reducedMotion?0:t*.046,
    scholarX,scholarY,
  };
}
/** The three references supply aesthetic targets, not copied vector data. */
export const SHANSHUI_REFERENCE_NOTES:Readonly<Record<ShanshuiScene,string>>={
  "misty-hermit":"Central scholar, old pines at left, bamboo at right, thin curling clouds and abundant mist.",
  "river-scholar":"A scholar and willow frame a quiet river, arched bridge and far pavilion.",
  "mountain-trail":"Layered mountain ridges, stone path, old pine, distant waterfall and contemplative walker.",
};
