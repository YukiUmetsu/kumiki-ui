import { describe, expect, it } from "vitest";
import {
  assertInkRoute, assertInkWalk, bakeInkActorTrack, bakeInkWalkCorrections,
  inkRouteAt, inkWalkAt, solveInkLimb,
} from "../registry/video/ink-actor-director";
import type { InkRoutePlan, InkWalkPlan } from "../registry/video/ink-actor-director";
import { inkActorAt } from "../registry/video/ink-wash-character";

const route: InkRoutePlan = {
  id:"traveler-path",instanceId:"traveler-01",
  waypoints:[
    {frame:0,x:130,y:398,facing:"right"},
    {frame:80,x:265,y:398},
    {frame:155,x:394,y:383},
    {frame:240,x:590,y:396,facing:"left"},
  ],
};
const gait: InkWalkPlan = {
  route,startFrame:0,endFrame:240,cycleFrames:48,stanceFraction:.62,
  hipHeight:42,upperLength:27,lowerLength:27,footLift:10,footSeparation:2.5,
  bodyBob:2.2,parts:{
    leftUpper:"left-thigh",leftLower:"left-shin",
    rightUpper:"right-thigh",rightLower:"right-shin",
    torso:"body",head:"head",leftArm:"left-arm",rightArm:"right-arm",
    leftSleeve:"left-sleeve",rightSleeve:"right-sleeve",
  },
};

describe("INK4 continuous character directing",()=>{
  it("uses C1 world paths through waypoints with no middle stop-start",()=>{
    expect(()=>assertInkRoute(route)).not.toThrow();
    const before=inkRouteAt(route,80-.01);
    const after=inkRouteAt(route,80+.01);
    expect(Math.abs(before.vx-after.vx)).toBeLessThan(.02);
    expect(Math.abs(before.vy-after.vy)).toBeLessThan(.02);
    const at=inkRouteAt(route,80);
    expect(at.x).toBeCloseTo(265,7);
    expect(at.vx).toBeGreaterThan(.2);
    expect(inkRouteAt(route,120).x).toBeGreaterThan(265);
    expect(inkRouteAt(route,120).x).toBeLessThan(394);
    expect(inkRouteAt(route,160).y).toBeGreaterThanOrEqual(383);
    expect(inkRouteAt(route,160).y).toBeLessThanOrEqual(398);
  });
  it("holds and mirrors only at declared facing keys, never halfway through a body tween",()=>{
    const before=inkRouteAt(route,239);
    expect(before.facing).toBe("right");
    expect(inkRouteAt(route,240).facing).toBe("left");
    expect(inkRouteAt(route,800).x).toBe(590);
    const baked=bakeInkActorTrack(route);
    expect(baked.keys.length).toBeLessThanOrEqual(512);
    expect(baked.keys.some(k=>k.frame===155&&k.x===394)).toBe(true);
    expect(inkActorAt(baked,240).facing).toBe("left");
    expect(inkActorAt(baked,239).facing).toBe("right");
    expect(inkActorAt(baked,80).x).toBeCloseTo(265,5);
  });
  it("rejects unsafe and impossible direction/scale/duration inputs",()=>{
    expect(()=>assertInkRoute({...route,waypoints:[{frame:10,x:0,y:0},{frame:10,x:1,y:1}]})).toThrow(RangeError);
    expect(()=>assertInkRoute({...route,waypoints:[{frame:0,x:0,y:0,scale:0},{frame:10,x:1,y:1}]})).toThrow(RangeError);
    expect(()=>assertInkRoute({...route,instanceId:"invalid space"})).toThrow(RangeError);
    expect(()=>inkRouteAt(route,Number.NaN)).toThrow(RangeError);
    expect(()=>assertInkWalk({...gait,upperLength:0})).toThrow(RangeError);
    expect(()=>assertInkWalk({...gait,parts:{...gait.parts,rightLower:"left-shin"}})).toThrow(RangeError);
  });
  it("solves 2-bone leg IK to correct forward kinematic endpoint",()=>{
    for(const target of [[12,43],[-12,43],[0,52]] as const){
      const pose=solveInkLimb(target[0],target[1],27,27,1);
      const hip=(pose.upper+90)*Math.PI/180;
      const shin=(pose.upper+90+pose.lower)*Math.PI/180;
      const x=27*Math.cos(hip)+27*Math.cos(shin);
      const y=27*Math.sin(hip)+27*Math.sin(shin);
      expect(x).toBeCloseTo(target[0],3);
      expect(y).toBeCloseTo(target[1],3);
    }
    const far=solveInkLimb(200,0,27,27,-1);
    expect(Math.hypot(...far.reached)).toBeLessThan(54);
    expect(()=>solveInkLimb(0,0,-1,2)).toThrow(RangeError);
  });
  it("locks a supporting foot in stage space while the actor advances",()=>{
    expect(()=>assertInkWalk(gait)).not.toThrow();
    const support=[0,3,10,19,28].map(f=>inkWalkAt(gait,f));
    expect(support.every(s=>s.left.planted)).toBe(true);
    expect(new Set(support.map(s=>s.left.x.toFixed(5)))).toEqual(new Set([support[0].left.x.toFixed(5)]));
    expect(new Set(support.map(s=>s.left.y.toFixed(5)))).toEqual(new Set([support[0].left.y.toFixed(5)]));
    expect(support[4].right.planted).toBe(true);
    const swing=inkWalkAt(gait,37);
    expect(swing.left.planted).toBe(false);
    expect(swing.left.y).toBeLessThan(398);
  });
  it("provides independent knee, sleeve, head and body correction tracks, seek stable",()=>{
    const at=inkWalkAt(gait,55);
    const tracks=bakeInkWalkCorrections(gait,3);
    expect(Object.keys(tracks)).toHaveLength(10);
    expect(tracks["left-thigh"][0].frame).toBe(0);
    expect(tracks["head"][0].pose.rotation).toBe(0);
    expect(tracks["body"][0].pose.y).toBe(0);
    expect(tracks["left-sleeve"][0].pose.rotation).not.toBe(tracks["left-arm"][0].pose.rotation);
    const after=inkWalkAt(gait,201);
    inkWalkAt(gait,0);inkWalkAt(gait,230);inkWalkAt(gait,130);
    expect(inkWalkAt(gait,55)).toEqual(at);
    expect(inkWalkAt(gait,201)).toEqual(after);
    expect(inkWalkAt(gait,290)).toEqual(inkWalkAt(gait,240));
    expect(tracks["left-thigh"].every((key,i,array)=>i===0||key.frame>array[i-1].frame)).toBe(true);
    expect(()=>bakeInkWalkCorrections(gait,0)).toThrow(RangeError);
  });
  it("bakes long paths safely while respecting 512-key runtime cap",()=>{
    const long: InkRoutePlan={...route,waypoints:[
      {frame:0,x:0,y:300},{frame:15000,x:700,y:300},
    ]};
    const track=bakeInkActorTrack(long);
    expect(track.keys.length).toBeLessThanOrEqual(512);
    expect(track.keys[track.keys.length-1].frame).toBe(15000);
    expect(inkActorAt(track,15000).x).toBe(700);
    expect(()=>bakeInkWalkCorrections({...gait,endFrame:240,cycleFrames:11})).toThrow(RangeError);
  });
});
