/**
 * INK4 — path-continuous character blocking and grounded gait director.
 *
 * This is *only* motion direction. It never invents artwork, visemes, or a character identity.
 * Existing CharacterPresenter owns anatomy/part hierarchy, acting, blink and speech; InkCharacter
 * owns the paper material. Every value here is a pure function of absolute film frame + authored plan.
 */
import type { CharacterPoseCorrectionTracks, CharacterPoseDelta } from "../character/definition";
import type { InkActorTrack, InkActorTransform } from "./ink-wash-character";

export interface InkRouteWaypoint {
  frame: number;
  x: number;
  /** Feet position on a world-anchored paper stage (Y increases down). */
  y: number;
  scale?: number;
  facing?: "left" | "right";
}
export interface InkRoutePlan {
  id: string;
  instanceId: string;
  waypoints: readonly InkRouteWaypoint[];
  /** Hold at the endpoints or preserve arrival/departure momentum. Defaults to false. */
  stopAtEnds?: boolean;
}
export interface InkRouteState extends InkActorTransform {
  /** Local derivative per frame, useful for generating secondary motion. */
  vx: number;
  vy: number;
}
const bound = (n: number, min: number, max: number) => Number.isFinite(n) && n >= min && n <= max;
const safeID = (id: string) => typeof id === "string" && /^[a-z][a-z0-9._-]{0,63}$/i.test(id) &&
  !["__proto__", "constructor", "prototype"].includes(id);
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

export function assertInkRoute(plan: InkRoutePlan): void {
  if (!plan || !safeID(plan.id) || !safeID(plan.instanceId) ||
      !Array.isArray(plan.waypoints) || plan.waypoints.length < 2 || plan.waypoints.length > 48 ||
      (plan.stopAtEnds !== undefined && typeof plan.stopAtEnds !== "boolean"))
    throw new RangeError("INK4 requires safe IDs, a stop flag and 2..48 route waypoints.");
  let previous = -1;
  for (const key of plan.waypoints) {
    if (!key || !Number.isSafeInteger(key.frame) || key.frame <= previous ||
        key.frame < 0 || key.frame > 360000 ||
        !bound(key.x, -8192, 8192) || !bound(key.y, -8192, 8192) ||
        (key.scale !== undefined && !bound(key.scale, .05, 8)) ||
        (key.facing !== undefined && key.facing !== "left" && key.facing !== "right"))
      throw new RangeError("INK4 waypoints must have increasing integer frames and bounded paper poses.");
    previous = key.frame;
  }
}

/** Monotone tangent: preserves C1 continuity without overshooting a reversed direction. */
function tangent(points: readonly InkRouteWaypoint[], index: number,
  key: "x" | "y" | "scale", stopAtEnds = false): number {
  const value = (i: number) => key === "scale" ? Math.log(points[i].scale ?? 1) : points[i][key];
  const n = points.length;
  if ((index === 0 || index === n - 1) && stopAtEnds) return 0;
  if (index === 0) return (value(1) - value(0)) / (points[1].frame - points[0].frame);
  if (index === n - 1) return (value(n - 1) - value(n - 2)) / (points[n - 1].frame - points[n - 2].frame);
  const before = (value(index) - value(index - 1)) / (points[index].frame - points[index - 1].frame);
  const after = (value(index + 1) - value(index)) / (points[index + 1].frame - points[index].frame);
  if (!before || !after || before * after <= 0) return 0;
  const average = (before + after) / 2;
  return Math.sign(average) * Math.min(Math.abs(average), 3 * Math.min(Math.abs(before), Math.abs(after)));
}
/** Cubic Hermite position and speed at any exact or fractional frame. */
function hermite(p0: number, p1: number, m0: number, m1: number, dt: number, u: number) {
  const u2 = u * u, u3 = u2 * u;
  return {
    value: (2*u3-3*u2+1)*p0 + (u3-2*u2+u)*dt*m0 +
      (-2*u3+3*u2)*p1 + (u3-u2)*dt*m1,
    velocity: ((6*u2-6*u)*p0 + (3*u2-4*u+1)*dt*m0 +
      (-6*u2+6*u)*p1 + (3*u2-2*u)*dt*m1) / dt,
  };
}
export function inkRouteAt(plan: InkRoutePlan, frame: number): InkRouteState {
  assertInkRoute(plan);
  if (!Number.isFinite(frame) || frame < 0 || frame > 360000)
    throw new RangeError("INK4 frame must be a finite paper-film frame.");
  const keys = plan.waypoints;
  const simple = (k: InkRouteWaypoint): InkRouteState => ({
    x:k.x,y:k.y,scale:k.scale??1,rotation:0,
    facing:k.facing??"right",vx:0,vy:0,
  });
  if (frame <= keys[0].frame) return simple(keys[0]);
  if (frame >= keys[keys.length - 1].frame) return simple(keys[keys.length - 1]);
  let segment = 1;
  while (keys[segment].frame < frame) segment++;
  const a = keys[segment - 1], b = keys[segment], dt = b.frame - a.frame;
  const u = (frame - a.frame) / dt;
  const axis = (key: "x" | "y" | "scale") => {
    const start = key === "scale" ? Math.log(a.scale ?? 1) : a[key];
    const end = key === "scale" ? Math.log(b.scale ?? 1) : b[key];
    return hermite(start, end, tangent(keys,segment-1,key,plan.stopAtEnds),
      tangent(keys,segment,key,plan.stopAtEnds),dt,u);
  };
  const x=axis("x"),y=axis("y"),scale=axis("scale");
  // Facing changes at a way-point. Never mirror halfway through an interpolated pose.
  const facing=frame<b.frame?(a.facing??"right"):(b.facing??"right");
  return {x:x.value,y:y.value,scale:Math.exp(scale.value),rotation:0,facing,vx:x.velocity,vy:y.velocity};
}
/** Bake a C1 path to the existing INK3 track without exceeding its 512-key budget.
 * Always retains every authored waypoint, including stops and facing changes. */
export function bakeInkActorTrack(plan: InkRoutePlan): InkActorTrack {
  assertInkRoute(plan);
  const first = plan.waypoints[0].frame, last = plan.waypoints[plan.waypoints.length-1].frame;
  const available = 512 - plan.waypoints.length;
  const interval = Math.max(1, Math.ceil((last-first) / Math.max(1, available-1)));
  const frames = new Set<number>(plan.waypoints.map(k=>k.frame));
  for (let f=first;f<last;f+=interval) frames.add(f);
  frames.add(last);
  const keys = Array.from(frames).sort((a,b)=>a-b).map(frame=>{
    const v=inkRouteAt(plan,frame);
    return {frame,x:v.x,y:v.y,scale:v.scale,rotation:v.rotation,facing:v.facing};
  });
  if (keys.length > 512) throw new RangeError("INK4 path bake exceeds 512 INK3 keys.");
  return {id:plan.id,instanceId:plan.instanceId,keys,interpolation:"linear"};
}

export interface InkLimbAngles {
  /** Angle of first segment, measured clockwise from +Y/down. */
  upper: number;
  /** Relative bend at knee/elbow: 0 is straight, positive/negative indicate bend side. */
  lower: number;
  /** The reachable end-point, clamped at the closest valid distance. */
  reached: readonly [number,number];
}
/** Analytic 2-bone IK with explicit segment lengths. Values in design px.
 * No anatomical inference: the author supplies real rig pivots, neutral angles and orientation.
 */
export function solveInkLimb(targetX:number,targetY:number,upperLength:number,
  lowerLength:number,bend:1|-1=1):InkLimbAngles {
  if (![targetX,targetY,upperLength,lowerLength].every(Number.isFinite) ||
      upperLength<1||lowerLength<1||upperLength>4096||lowerLength>4096 ||
      Math.abs(targetX)>8192||Math.abs(targetY)>8192||(bend!==1&&bend!==-1))
    throw new RangeError("INK4 limb requires finite target and positive limb lengths.");
  const raw = Math.hypot(targetX,targetY);
  const minD = Math.abs(upperLength-lowerLength)+.00001;
  const maxD = upperLength+lowerLength-.00001;
  const d=clamp(raw,minD,maxD);
  const theta=Math.atan2(targetY,targetX);
  const open=Math.acos(clamp((upperLength*upperLength+d*d-lowerLength*lowerLength)/
    (2*upperLength*d),-1,1));
  const first=theta-bend*open;
  const kneeX=Math.cos(first)*upperLength,kneeY=Math.sin(first)*upperLength;
  const endX=raw>1e-9?targetX*d/raw:0,endY=raw>1e-9?targetY*d/raw:d;
  const second=Math.atan2(endY-kneeY,endX-kneeX);
  const asDeg=(rad:number)=>rad*180/Math.PI;
  return {upper:asDeg(first-Math.PI/2),lower:asDeg(second-first),reached:[endX,endY]};
}

export interface InkGaitParts {
  leftUpper:string;leftLower:string;rightUpper:string;rightLower:string;
  torso?:string;head?:string;leftArm?:string;rightArm?:string;
  leftSleeve?:string;rightSleeve?:string;
}
export interface InkWalkPlan {
  route:InkRoutePlan;
  /** Scene-local interval for active gait. Later frames resolve to a stable final pose. */
  startFrame:number;
  endFrame:number;
  cycleFrames:number;
  /** Fraction planted on ground, default 0.58. */
  stanceFraction?:number;
  /** Hip joint height above the feet, in design px. */
  hipHeight:number;
  upperLength:number;
  lowerLength:number;
  /** Height of the arc during foot swing, in design px. */
  footLift?:number;
  /** Side-to-side screen-plane foot separation, in design px. */
  footSeparation?:number;
  /** Vertical torso oscillation, in design px. */
  bodyBob?:number;
  /** Names of the authored pivot parts, including optional secondary motion. */
  parts:InkGaitParts;
}
export interface InkFootState {
  x:number;y:number;planted:boolean;
  hipAngle:number;kneeAngle:number;
}
export interface InkWalkState {
  left:InkFootState;right:InkFootState;
  bodyY:number;torsoAngle:number;headAngle:number;
  armLeftAngle:number;armRightAngle:number;
  sleeveLeftAngle:number;sleeveRightAngle:number;
}

export function assertInkWalk(plan:InkWalkPlan) {
  if (!plan || typeof plan !== "object" || !plan.parts || typeof plan.parts !== "object")
    throw new RangeError("INK4 requires a gait plan with named anatomical parts.");
  assertInkRoute(plan.route);
  if (!Number.isSafeInteger(plan.startFrame)||!Number.isSafeInteger(plan.endFrame)||
      plan.startFrame<0||plan.endFrame<=plan.startFrame||
      plan.endFrame>plan.route.waypoints[plan.route.waypoints.length-1].frame ||
      plan.startFrame<plan.route.waypoints[0].frame ||
      plan.hipHeight>plan.upperLength+plan.lowerLength ||
      !Number.isSafeInteger(plan.cycleFrames)||plan.cycleFrames<12||plan.cycleFrames>180||
      !bound(plan.stanceFraction??.58,.4,.75) ||
      !bound(plan.hipHeight,1,4096)||!bound(plan.upperLength,1,4096)||
      !bound(plan.lowerLength,1,4096) ||
      !bound(plan.footLift??12,0,256)||!bound(plan.footSeparation??4,0,256)||
      !bound(plan.bodyBob??2,0,40))
    throw new RangeError("INK4 gait duration, stride, anatomical lengths or ground values are invalid.");
  const entries=Object.values(plan.parts);
  if(entries.length<4||entries.some(x=>typeof x!=="string"||!safeID(x))||
      new Set(entries).size!==entries.length)
    throw new RangeError("INK4 gait requires distinct declared pivot/part IDs.");
}
/** Contact-aware gait: stance world-X is *fixed* while the root moves.
 * Swing uses a single smooth arc to the next plant. No incremental simulation or clock.
 */
export function inkWalkAt(plan:InkWalkPlan,frame:number):InkWalkState {
  assertInkWalk(plan);
  if(!Number.isSafeInteger(frame)||frame<0||frame>360000)
    throw new RangeError("INK4 gait frame must be a nonnegative integer.");
  const t=clamp(frame,plan.startFrame,plan.endFrame);
  const cycle=plan.cycleFrames,stance=plan.stanceFraction??.58;
  const current=inkRouteAt(plan.route,t);
  const foot=(offset:number,bend:1|-1,side:number):InkFootState=>{
    const cycles=(t-plan.startFrame)/cycle+offset;
    const index=Math.floor(cycles),phase=cycles-index;
    const plantedAt=(which:number)=>{
      const contactFrame=clamp(plan.startFrame+(which-offset+stance*.48)*cycle,plan.startFrame,plan.endFrame);
      const pos=inkRouteAt(plan.route,contactFrame);
      return {x:pos.x+side*(plan.footSeparation??4),y:pos.y};
    };
    const ground=plantedAt(index),next=plantedAt(index+1);
    let x=ground.x,y=ground.y;
    if(phase>=stance) {
      const q=(phase-stance)/(1-stance);
      const smooth=q*q*(3-2*q);
      x=mix(ground.x,next.x,smooth);
      y=mix(ground.y,next.y,smooth)-Math.sin(Math.PI*q)*(plan.footLift??12);
    }
    const targetX=x-current.x,targetY=y-(current.y-plan.hipHeight);
    const solved=solveInkLimb(targetX,targetY,plan.upperLength,plan.lowerLength,bend);
    return {x,y,planted:phase<stance,hipAngle:solved.upper,kneeAngle:solved.lower};
  };
  const left=foot(0,1,-1),right=foot(.5,-1,1);
  const phase=(t-plan.startFrame)/cycle;
  const bob=-(plan.bodyBob??2)*Math.pow(Math.sin(phase*2*Math.PI),2);
  const arm=Math.sin(phase*2*Math.PI)*13;
  const torsoAngle=Math.sin(phase*2*Math.PI)*1.5;
  const headAngle=-torsoAngle*.62;
  // Delayed cloth/sleeves: visual lag is a phase-shifted oscillation, not per-frame random noise.
  return {left,right,bodyY:bob,torsoAngle,headAngle,
    armLeftAngle:arm,armRightAngle:-arm,
    sleeveLeftAngle:Math.sin(phase*2*Math.PI-.65)*5.5,
    sleeveRightAngle:-Math.sin(phase*2*Math.PI-.65)*5.5};
}
export function inkWalkPose(plan:InkWalkPlan,frame:number):Record<string,CharacterPoseDelta> {
  const at=inkWalkAt(plan,frame),p=plan.parts;
  const out:Record<string,CharacterPoseDelta>={
    [p.leftUpper]:{rotation:at.left.hipAngle},
    [p.leftLower]:{rotation:at.left.kneeAngle},
    [p.rightUpper]:{rotation:at.right.hipAngle},
    [p.rightLower]:{rotation:at.right.kneeAngle},
  };
  if(p.torso)out[p.torso]={y:at.bodyY,rotation:at.torsoAngle};
  if(p.head)out[p.head]={rotation:at.headAngle};
  if(p.leftArm)out[p.leftArm]={rotation:at.armLeftAngle};
  if(p.rightArm)out[p.rightArm]={rotation:at.armRightAngle};
  if(p.leftSleeve)out[p.leftSleeve]={rotation:at.sleeveLeftAngle};
  if(p.rightSleeve)out[p.rightSleeve]={rotation:at.sleeveRightAngle};
  return out;
}
/** Generates native CharacterPoseCorrectionTracks that can be composed with existing
 * authored actions, gaze, expression and visemes without changing the performer renderer.
 */
export function bakeInkWalkCorrections(plan:InkWalkPlan,stepFrames=2):CharacterPoseCorrectionTracks {
  assertInkWalk(plan);
  if(!Number.isSafeInteger(stepFrames)||stepFrames<1||stepFrames>12)
    throw new RangeError("INK4 gait bake stepFrames must be 1..12.");
  const tracks:CharacterPoseCorrectionTracks={};
  const frames:number[]=[];
  for(let f=plan.startFrame;f<plan.endFrame;f+=stepFrames)frames.push(f);
  frames.push(plan.endFrame);
  // Native correction-track limit is 512 keys per part. Avoid generating an
  // apparently valid output that the core character evaluator silently discards.
  if(frames.length+1>512) throw new RangeError("INK4 gait bake exceeds 512 correction keys per part; increase sampling or split shots.");
  for(const f of frames){
    const pose=inkWalkPose(plan,f);
    for(const [part,delta] of Object.entries(pose)){
      (tracks[part]??=[]).push({frame:f,pose:delta});
    }
  }
  // When a character stops walking, all corrective limb/cloth rotations ease
  // naturally back to rig-neutral, rather than freezing at an arbitrary stride.
  const recoveryFrame=Math.min(360000,plan.endFrame+12);
  if(recoveryFrame>plan.endFrame){
    for(const [part,keys] of Object.entries(tracks)){
      const last=keys[keys.length-1].pose;
      const identity:CharacterPoseDelta={};
      for(const name of Object.keys(last) as (keyof CharacterPoseDelta)[]){
        identity[name]=name==="scaleX"||name==="scaleY"?1:0;
      }
      keys.push({frame:recoveryFrame,pose:identity});
    }
  }
  return tracks;
}
