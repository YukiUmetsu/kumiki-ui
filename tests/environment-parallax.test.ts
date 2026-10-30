import { describe, expect, it } from "vitest";
import { sampleEnvironmentFrame } from "../registry/video/environment-parallax";

const path={from:{x:.3,y:.36,zoom:1.04},to:{x:.66,y:.51,zoom:1.42}};
const anchor={x:.61,y:.43};
describe("Cinematic 2.5D environment camera",()=>{
  it("samples any absolute frame without time accumulation or jitter",()=>{
    const first=sampleEnvironmentFrame(path,anchor,0,120);
    const mid=sampleEnvironmentFrame(path,anchor,60,120);
    const end=sampleEnvironmentFrame(path,anchor,119,120);
    expect(first.progress).toBe(0);
    expect(end.progress).toBe(1);
    expect(mid.progress).toBeGreaterThan(.5);
    expect(mid.zoom).toBeGreaterThan(first.zoom);
    expect(mid.zoom).toBeLessThan(end.zoom);
    sampleEnvironmentFrame(path,anchor,108,120);
    sampleEnvironmentFrame(path,anchor,14,120);
    expect(sampleEnvironmentFrame(path,anchor,60,120)).toEqual(mid);
  });
  it("moves transparent foreground faster than background without hard exposed edges",()=>{
    for(const frame of [0,25,55,90,119]){
      const state=sampleEnvironmentFrame(path,anchor,frame,120,{foregroundStrength:1.5});
      expect(state.foreground.scale).toBeGreaterThan(state.background.scale);
      const bgPadding=(state.background.scale-1)*50;
      const fgPadding=(state.foreground.scale-1)*50;
      expect(Math.abs(state.background.x)).toBeLessThanOrEqual(bgPadding+.001);
      expect(Math.abs(state.background.y)).toBeLessThanOrEqual(bgPadding+.001);
      expect(Math.abs(state.foreground.x)).toBeLessThanOrEqual(fgPadding+.001);
      expect(Math.abs(state.foreground.y)).toBeLessThanOrEqual(fgPadding+.001);
    }
  });
  it("tracks a world anchor through camera movement instead of floating in screen space",()=>{
    const early=sampleEnvironmentFrame(path,anchor,0,120);
    const late=sampleEnvironmentFrame(path,anchor,119,120);
    expect(late.subject.x).not.toBeCloseTo(early.subject.x);
    expect(late.subject.y).not.toBeCloseTo(early.subject.y);
    const exact=sampleEnvironmentFrame(path,{x:.5,y:.5},119,120);
    expect(exact.subject.x).toBeCloseTo(50+exact.background.x);
    expect(exact.subject.y).toBeCloseTo(50+exact.background.y);
  });
  it("has a static reduced-motion state and validates authored optical controls",()=>{
    const calm=sampleEnvironmentFrame(path,anchor,0,120,{reducedMotion:true});
    expect(calm.progress).toBe(1);
    expect(calm.lightSweep).toBe(0);
    expect(()=>sampleEnvironmentFrame(path,anchor,35,120,{foregroundStrength:.9})).toThrow(/strength/);
    expect(()=>sampleEnvironmentFrame(path,{x:-1,y:0},35,120)).toThrow(/camera/);
    expect(()=>sampleEnvironmentFrame(path,anchor,35,0)).toThrow(/camera/);
  });
});
