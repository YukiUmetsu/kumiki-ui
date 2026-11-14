import { describe, expect, it } from "vitest";
import { samplePoseCorrection, isValidCorrectionKeys } from "../registry/character/authoring";
import { assertInkClothMotion, inkClothAt, bakeInkClothCorrections } from "../registry/video/ink-figure-motion";
import type { InkClothMotionPlan } from "../registry/video/ink-figure-motion";
const plan:InkClothMotionPlan={
  route:{id:"cloth-route",instanceId:"actor",stopAtEnds:true,waypoints:[
    {frame:0,x:100,y:200},{frame:20,x:150,y:200},{frame:60,x:260,y:197},
    {frame:80,x:260,y:197},{frame:150,x:260,y:197},
  ]},
  endFrame:180,cycleFrames:24,amount:.8,
  parts:{hem:"hem-drape",nearCuff:"near-cuff",farCuff:"far-cuff"},
};
describe("INK6 painted cloth is frame-pure and physically restrained",()=>{
  it("uses one continuous route with bounded self-contained kinetic pose",()=>{
    assertInkClothMotion(plan);
    const start=inkClothAt(plan,0);
    const moving=inkClothAt(plan,36);
    const stopped=inkClothAt(plan,150);
    expect(start.activity).toBe(0);
    expect(moving.activity).toBeGreaterThan(0);
    expect(stopped.activity).toBe(0);
    expect(stopped.hem.rotation).toBe(0);
    expect(Math.abs(moving.hem.rotation??999)).toBeLessThan(6);
    expect(Math.abs(moving.nearCuff.rotation??999)).toBeLessThan(5);
    expect(inkClothAt(plan,36)).toEqual(moving);
    inkClothAt(plan,130);inkClothAt(plan,0);
    expect(inkClothAt(plan,36)).toEqual(moving);
  });
  it("adds a discrete action layer without disturbing the existing IK correction tracks",()=>{
    const tracks=bakeInkClothCorrections(plan,2);
    expect(Object.keys(tracks).sort()).toEqual(["far-cuff","hem-drape","near-cuff"]);
    expect(Object.values(tracks).every(keys=>isValidCorrectionKeys(keys))).toBe(true);
    expect(tracks["hem-drape"][0].frame).toBe(0);
    expect(tracks["hem-drape"].at(-1)?.frame).toBe(180);
    expect(samplePoseCorrection(tracks,"hem-drape",36)).toEqual(inkClothAt(plan,36).hem);
    const zero=bakeInkClothCorrections({...plan,amount:0});
    expect(samplePoseCorrection(zero,"hem-drape",36).rotation).toBe(0);
    expect(samplePoseCorrection(tracks,"hem-drape",180).rotation).toBe(0);
  });
  it("rejects malformed routes, names and correction budgets",()=>{
    expect(()=>assertInkClothMotion({...plan,amount:-1})).toThrow(RangeError);
    expect(()=>assertInkClothMotion({...plan,cycleFrames:8})).toThrow(RangeError);
    expect(()=>assertInkClothMotion({...plan,parts:{...plan.parts,nearCuff:"hem-drape"}})).toThrow(RangeError);
    expect(()=>inkClothAt(plan,181)).toThrow(RangeError);
    expect(()=>inkClothAt(plan,NaN)).toThrow(RangeError);
    expect(()=>bakeInkClothCorrections(plan,0)).toThrow(RangeError);
    expect(()=>bakeInkClothCorrections({...plan,endFrame:2000},2)).toThrow(RangeError);
  });
});
