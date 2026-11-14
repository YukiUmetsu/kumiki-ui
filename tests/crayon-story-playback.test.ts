import { describe, expect, it } from "vitest";
import { crayonFrameAtElapsed } from "../src/video/crayon-story-playback";

describe("Crayon Storybook wall-clock frame player",()=>{
  it("derives source frames from elapsed time instead of number of browser paint callbacks",()=>{
    expect(crayonFrameAtElapsed(0,0,240)).toBe(0);
    expect(crayonFrameAtElapsed(0,500,240)).toBe(15);
    expect(crayonFrameAtElapsed(15,1500,240)).toBe(60);
    // If Chromium renders just one frame after 1200 ms, the source must still advance 36.
    expect(crayonFrameAtElapsed(10,1200,240)).toBe(46);
    const irregular=[0,16,37,120,390,993];
    expect(irregular.map(ms=>crayonFrameAtElapsed(20,ms,240)))
      .toEqual(irregular.map(ms=>20+Math.floor(ms*30/1000)));
  });
  it("supports speed control and exact wrap-around for loops",()=>{
    expect(crayonFrameAtElapsed(20,1000,240,30,.5)).toBe(35);
    expect(crayonFrameAtElapsed(20,1000,240,30,2)).toBe(80);
    expect(crayonFrameAtElapsed(237,200,240,30,1,true)).toBe(3);
    expect(crayonFrameAtElapsed(239,1000,240,30,1,false)).toBe(239);
    expect(crayonFrameAtElapsed(239,1000,240,30,1,true)).toBe(29);
  });
  it("clamps start and terminal frames as subjects change and rejects invalid clocks",()=>{
    expect(crayonFrameAtElapsed(269,0,240)).toBe(239);
    expect(crayonFrameAtElapsed(-10,0,240)).toBe(0);
    expect(crayonFrameAtElapsed(50,10000,240)).toBe(239);
    expect(()=>crayonFrameAtElapsed(0,-1,240)).toThrow(/playback timing/);
    expect(()=>crayonFrameAtElapsed(0,0,1)).toThrow(/playback timing/);
    expect(()=>crayonFrameAtElapsed(0,0,240,30,0)).toThrow(/playback timing/);
    expect(()=>crayonFrameAtElapsed(NaN,10,240)).toThrow(/playback timing/);
    expect(()=>crayonFrameAtElapsed(0,0,240,30,Infinity)).toThrow(/playback timing/);
  });
});
