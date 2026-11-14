/**
 * WM3 — paper-space animated actor placements using the EXISTING character rig.
 * Walk, gesture, gaze, blink and speech are still CharacterPresenter/evaluateCharacter cues.
 * This module only coordinates grounded staging and optional authored on-twos pose cadence.
 */
export type WatercolourFacing = "left" | "right";
export interface WatercolourActorKey {
  frame: number;
  /** Feet, in artboard coordinates. */
  x: number;
  y: number;
  scale: number;
  rotation?: number;
  facing?: WatercolourFacing;
  /** Footsteps between this key and the next; zero means glide/still. */
  stepsToNext?: number;
}
export interface WatercolourActorTrack {
  id: string;
  stage: { width: number; height: number };
  keys: readonly WatercolourActorKey[];
  /** Pose redraw frequency. 1 animates on every frame, 2 on twos, 3 on threes. */
  cadenceFrames?: 1 | 2 | 3;
  /** Raised foot / body height during authored walking, in stage pixels. */
  stepLift?: number;
  /** How much to tilt the figure as the weight transfers. */
  leanDegrees?: number;
}
export interface WatercolourActorPose {
  x: number; y: number; scale: number; rotation: number;
  facing: WatercolourFacing;
  lift: number; shadowScale: number;
  rigFrame: number; grounded: boolean;
}

const within=(v:number,lo:number,hi:number)=>Number.isFinite(v)&&v>=lo&&v<=hi;
const whole=(v:number,lo:number,hi:number)=>Number.isSafeInteger(v)&&v>=lo&&v<=hi;
const ease=(v:number)=>{const t=Math.max(0,Math.min(1,v));return t*t*(3-2*t);};

export function inspectWatercolourActorTrack(track: WatercolourActorTrack): string[] {
  const errors:string[]=[];
  if(!track || typeof track.id!=="string" || !/^[a-z][a-z0-9_-]{0,63}$/i.test(track.id))
    errors.push("/id");
  if(!track?.stage || !whole(track.stage.width,240,8192) || !whole(track.stage.height,240,8192))
    errors.push("/stage");
  if(!Array.isArray(track?.keys) || track.keys.length<1 || track.keys.length>512){
    errors.push("/keys");return errors;
  }
  if(track.cadenceFrames!==undefined && ![1,2,3].includes(track.cadenceFrames))
    errors.push("/cadenceFrames");
  if(track.stepLift!==undefined && !within(track.stepLift,0,80))errors.push("/stepLift");
  if(track.leanDegrees!==undefined && !within(track.leanDegrees,0,15))errors.push("/leanDegrees");
  let prev=-1;
  track.keys.forEach((k,i)=>{
    if(!k || !whole(k.frame,0,10000000) || k.frame<=prev ||
      !within(k.x,-track.stage.width,track.stage.width*2) ||
      !within(k.y,-track.stage.height,track.stage.height*2) ||
      !within(k.scale,.04,8) || (k.rotation!==undefined && !within(k.rotation,-360,360)) ||
      (k.facing!==undefined && k.facing!=="left" && k.facing!=="right") ||
      (k.stepsToNext!==undefined && !whole(k.stepsToNext,0,24)))errors.push("/keys/"+i);
    if(k && Number.isFinite(k.frame))prev=k.frame;
  });
  return errors;
}

/** Pure interpolation: seeking directly to F and seeking backwards to F agree.
 * Each keyed walking segment has exact contact at its boundaries.
 */
export function watercolourActorAt(track: WatercolourActorTrack, frame: number,
  reducedMotion=false):WatercolourActorPose {
  const errors=inspectWatercolourActorTrack(track);
  if(errors.length)throw new RangeError("Invalid watercolor actor: "+errors.join(", "));
  if(!whole(frame,0,10000000))throw new RangeError("Actor frame must be a nonnegative integer.");
  const keys=track.keys;
  const f=reducedMotion?keys[keys.length-1].frame:frame;
  const rigFrame=reducedMotion?f:Math.floor(f/(track.cadenceFrames??1))*(track.cadenceFrames??1);
  const snap=(k:WatercolourActorKey):WatercolourActorPose=>({
    x:k.x,y:k.y,scale:k.scale,rotation:k.rotation??0,facing:k.facing??"right",
    lift:0,shadowScale:1,rigFrame,grounded:true,
  });
  if(f<=keys[0].frame)return snap(keys[0]);
  for(let i=0;i<keys.length-1;i++){
    const a=keys[i],b=keys[i+1];
    if(f>b.frame)continue;
    const u=(f-a.frame)/(b.frame-a.frame),t=ease(u);
    const mix=(v:number,w:number)=>v+(w-v)*t;
    const steps=a.stepsToNext??0;
    const displacement=Math.hypot(b.x-a.x,b.y-a.y);
    const walking=steps>0 && displacement>0.5 && u>0 && u<1;
    const phase=2*Math.PI*u*steps;
    // One leg swing per half cycle, but only the upward swing lifts the root.
    const bounce=walking?Math.pow(Math.max(0,Math.sin(phase)),1.15):0;
    const lift=(track.stepLift??8)*bounce*mix(a.scale,b.scale);
    const lean=walking?Math.sin(phase)*(track.leanDegrees??2):0;
    return{
      x:mix(a.x,b.x),y:mix(a.y,b.y),scale:Math.exp(mix(Math.log(a.scale),Math.log(b.scale))),
      rotation:mix(a.rotation??0,b.rotation??0)+lean,
      facing:f===b.frame?(b.facing??a.facing??"right"):(a.facing??"right"),
      lift,shadowScale:1-.22*bounce,rigFrame,grounded:lift<=.001,
    };
  }
  return snap(keys[keys.length-1]);
}
