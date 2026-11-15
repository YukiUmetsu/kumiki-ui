/**
 * INK6 — deterministic figure-cloth follow-through for an APPROVED 2.5D puppet.
 * An artist chooses separate hem/cuff parts and a continuous route. This only
 * animates their already-approved brush marks; it never modifies rigged limbs,
 * facial drawings, prop mounts or the CharacterPresenter clock.
 */
import type { CharacterPoseCorrectionTracks, CharacterPoseDelta } from "../character/definition";
import { assertInkRoute, inkRouteAt } from "./ink-actor-director";
import type { InkRoutePlan } from "./ink-actor-director";

export interface InkClothPartIds {
  hem: string;
  nearCuff: string;
  farCuff: string;
}
export interface InkClothMotionPlan {
  route: InkRoutePlan;
  /** Last frame of the shot including the final still. */
  endFrame: number;
  /** Frames per gait cycle, matching the actor's authored walking cadence. */
  cycleFrames: number;
  /** 0 disables secondary motion; 1 is the full subtle authored deformation. */
  amount: number;
  parts: InkClothPartIds;
}
export interface InkClothMotionState {
  hem: CharacterPoseDelta;
  nearCuff: CharacterPoseDelta;
  farCuff: CharacterPoseDelta;
  /** 0..1 inferred activity; derived from stage velocity, never a history buffer. */
  activity: number;
}
const id=(value:string)=>typeof value==="string"&&/^[a-z][a-z0-9._-]{0,63}$/i.test(value)&&
  !["__proto__","constructor","prototype"].includes(value);
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
export function assertInkClothMotion(plan:InkClothMotionPlan):void{
  if(!plan||!plan.route||!plan.parts)throw new RangeError("INK6 needs a route and three cloth part IDs.");
  assertInkRoute(plan.route);
  if(!Number.isSafeInteger(plan.endFrame)||plan.endFrame<1||plan.endFrame>36000||
    !Number.isSafeInteger(plan.cycleFrames)||plan.cycleFrames<12||plan.cycleFrames>180||
    !Number.isFinite(plan.amount)||plan.amount<0||plan.amount>1)
    throw new RangeError("INK6 cloth frames, cadence and intensity must be bounded.");
  const names=Object.values(plan.parts);
  if(names.length!==3||names.some(v=>!id(v))||new Set(names).size!==3)
    throw new RangeError("INK6 needs three distinct existing safe figure part IDs.");
}
/** Frame-pure follow-through. All angles are modest on purpose: line language
 * and its attachment to the sleeves matters more than an exaggerated flutter.
 */
export function inkClothAt(plan:InkClothMotionPlan,frame:number):InkClothMotionState{
  assertInkClothMotion(plan);
  if(!Number.isFinite(frame)||frame<0||frame>plan.endFrame)
    throw new RangeError("INK6 frame must be within the authored shot.");
  const actor=inkRouteAt(plan.route,frame);
  const velocity=Math.hypot(actor.vx,actor.vy);
  const activity=clamp(velocity/2.9,0,1)*plan.amount;
  const phase=frame/plan.cycleFrames*2*Math.PI;
  const sway=Math.sin(phase-.65),counter=Math.sin(phase+1.1);
  const inertia=clamp(actor.vx/3,-1,1)*activity;
  return {
    hem:{x:-.95*inertia+1.8*activity*sway,
      y:.9*activity*Math.abs(Math.sin(phase)),
      rotation:3.2*activity*sway-1.1*inertia},
    nearCuff:{x:.55*activity*counter,
      y:.60*activity*(1+counter)*.5,rotation:3.1*activity*counter},
    farCuff:{x:-.45*activity*sway,
      y:.55*activity*(1-sway)*.5,rotation:-2.7*activity*sway},
    activity,
  };
}
/** Corrections compose additively with the existing INK4 knee/hip performance.
 * Sampling absolute frames at two-frame intervals limits interpolation error
 * without exceeding the shared CharacterPoseCorrectionTracks 512-key budget.
 */
export function bakeInkClothCorrections(plan:InkClothMotionPlan,step=2):CharacterPoseCorrectionTracks{
  assertInkClothMotion(plan);
  if(!Number.isSafeInteger(step)||step<1||step>12)
    throw new RangeError("INK6 correction interval must be 1..12 frames.");
  if(Math.ceil(plan.endFrame/step)+1>512)
    throw new RangeError("INK6 cloth correction would exceed the rig's 512-key budget.");
  const tracks:CharacterPoseCorrectionTracks={
    [plan.parts.hem]:[],[plan.parts.nearCuff]:[],[plan.parts.farCuff]:[],
  };
  const frames:number[]=[];
  for(let frame=0;frame<plan.endFrame;frame+=step)frames.push(frame);
  frames.push(plan.endFrame);
  for(const frame of frames){
    const sampled=inkClothAt(plan,frame);
    tracks[plan.parts.hem].push({frame,pose:sampled.hem});
    tracks[plan.parts.nearCuff].push({frame,pose:sampled.nearCuff});
    tracks[plan.parts.farCuff].push({frame,pose:sampled.farCuff});
  }
  return tracks;
}
