import { describe, expect, it } from "vitest";
import {
  globeCameraAtFrame, interpolateGlobeCamera, projectGlobePoint,
  projectedGlobeCoastlines, projectedGlobeGraticule, projectedGlobePath, sampleGreatCircle,
} from "../registry/video/globe-projection";

describe("Orthographic cinematic globe", () => {
  it("projects the camera center to front-facing (0,0)", () => {
    const camera = { latitude: 38.9, longitude: -77.0 };
    const center = projectGlobePoint(camera, camera);
    expect(center.x).toBeCloseTo(0, 6);
    expect(center.y).toBeCloseTo(0, 6);
    expect(center.depth).toBeCloseTo(1, 6);
    expect(center.visible).toBe(true);
  });
  it("hides back-side points instead of drawing them through Earth", () => {
    const camera = { latitude: 0, longitude: 0 };
    expect(projectGlobePoint({latitude:0,longitude:0}, camera).visible).toBe(true);
    expect(projectGlobePoint({latitude:0,longitude:180}, camera).visible).toBe(false);
    expect(projectGlobePoint({latitude:0,longitude:90}, camera).depth).toBeCloseTo(0, 6);
  });
  it("interpolates across the dateline on the 2 degree path rather than 358 degrees", () => {
    const mid = interpolateGlobeCamera(
      {latitude: 10, longitude: 179},
      {latitude: 10, longitude: -179},
      .5,
    );
    expect(Math.abs(mid.longitude)).toBeCloseTo(180, 6);
    expect(mid.latitude).toBeCloseTo(10);
  });
  it("moves the absolute-frame camera smoothly without requiring previous frames", () => {
    const locations = [{latitude:0,longitude:100},{latitude:20,longitude:140},{latitude:40,longitude:170}];
    const first = globeCameraAtFrame(locations,0,121);
    const mid = globeCameraAtFrame(locations,60,121);
    const final = globeCameraAtFrame(locations,120,121);
    expect(first.longitude).toBeCloseTo(100);
    expect(mid.longitude).toBeCloseTo(140);
    expect(final.longitude).toBeCloseTo(170);
    for (const at of [119,35,0,60,90,2,60]) globeCameraAtFrame(locations,at,121);
    expect(globeCameraAtFrame(locations,60,121)).toEqual(mid);
  });
  it("keeps reduced-motion mode on a static itinerary state", () => {
    const places = [{latitude:0,longitude:10},{latitude:0,longitude:80}];
    const calm = globeCameraAtFrame(places,60,121,undefined,true,30);
    expect(calm).toEqual({latitude:0,longitude:80});
    const orbit = globeCameraAtFrame(places,30,121,undefined,false,30);
    expect(orbit.longitude).not.toBeCloseTo(10);
  });
  it("generates short-arc globe routes, not long lines through hidden geometry", () => {
    const from = {latitude:0,longitude:179}, to = {latitude:0,longitude:-179};
    const samples = sampleGreatCircle(from,to);
    const middle = samples[Math.floor(samples.length/2)];
    expect(Math.abs(middle.longitude)).toBeCloseTo(180, 1);
    const nearDateline = projectedGlobePath(samples,{latitude:0,longitude:180});
    const farSide = projectedGlobePath(samples,{latitude:0,longitude:0});
    expect(nearDateline).toMatch(/^M/);
    expect(nearDateline).not.toContain("NaN");
    expect(farSide).toBe("");
  });
  it("clips whole curves at the horizon without producing coordinates off the sphere", () => {
    const points = Array.from({length:73},(_,i)=>({latitude:0,longitude:-180+i*5}));
    const path = projectedGlobePath(points,{latitude:0,longitude:0});
    expect(path).toContain("M");
    expect(path).not.toContain("NaN");
    expect(path).not.toContain("Infinity");
    const commands = path.match(/[ML]/g)??[];
    expect(commands.length).toBeGreaterThan(25);
  });
  it("projects graticules and city points through the identical camera", () => {
    const front={latitude:0,longitude:0};
    const grid=projectedGlobeGraticule(front);
    expect(grid.length).toBeGreaterThan(12);
    expect(grid.some(x=>x.id==="parallel-0"&&x.d.length>0)).toBe(true);
    const rotated=projectedGlobeGraticule({latitude:35,longitude:120});
    expect(rotated).not.toEqual(grid);
    expect(projectGlobePoint({latitude:35,longitude:120},{latitude:35,longitude:120}).depth).toBeCloseTo(1);
  });
  it("projects recognizable public-domain land coastlines through the same camera", () => {
    const west=projectedGlobeCoastlines({latitude:25,longitude:-110});
    const east=projectedGlobeCoastlines({latitude:25,longitude:125});
    expect(west.length).toBeGreaterThan(20);
    expect(east.length).toBeGreaterThan(20);
    expect(west).not.toEqual(east);
    expect(west.every(path=>path.d.startsWith("M")&&!path.d.includes("NaN"))).toBe(true);
  });
  it("rejects invalid source coordinates, frame counts and route steps", () => {
    expect(()=>projectGlobePoint({latitude:91,longitude:0},{latitude:0,longitude:0})).toThrow(/Invalid/);
    expect(()=>globeCameraAtFrame([],0,120)).toThrow(/Invalid/);
    expect(()=>globeCameraAtFrame([{latitude:0,longitude:0}],.5,120)).toThrow(/Invalid/);
    expect(()=>sampleGreatCircle({latitude:0,longitude:0},{latitude:1,longitude:1},1)).toThrow(/Invalid/);
  });
});
