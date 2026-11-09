import { describe, expect, it } from "vitest";
import { Group, Mesh } from "three";
import { inspectTrackPass, shutterOffsets, trackPassState } from "../registry/visual/race-shots";
import type { TrackPassSpec } from "../registry/visual/race-shots";
import { findWheels } from "../registry/visual/race-recipes-react";
import { shot3dCues, shot3dTurnCue } from "../registry/video/film-3d";
import type { FilmShot3dContent } from "../registry/video/film-3d";
import { compileFilm } from "../registry/video/film-document";
import { compileSpeed, speedClock } from "../registry/video/film-speed";
import { generatedMountain, MOUNTAIN_RING, mountainCentre } from "../registry/visual/race-scenery";

const PASS: TrackPassSpec = { durationFrames: 150, speed: 58, passFrame: 75 };
const codes = (spec: Partial<TrackPassSpec>) => inspectTrackPass({ ...PASS, ...spec }, 30).map(p => p.code);

describe("trackside pass", () => {
  it("moves the car at its speed, level with the camera at the pass", () => {
    expect(trackPassState(PASS, 75, 30).carX).toBeCloseTo(0);
    expect(trackPassState(PASS, 105, 30).carX).toBeCloseTo(58);
    expect(trackPassState(PASS, 45, 30).carX).toBeCloseTo(-58);
  });
  it("turns the wheels by distance over radius, so a speed ramp slows them with the car", () => {
    const a = trackPassState(PASS, 30, 30, .34), b = trackPassState(PASS, 31, 30, .34);
    expect(b.wheelTurn - a.wheelTurn).toBeCloseTo(58 / 30 / .34);
    expect(trackPassState(PASS, 30.5, 30, .34).wheelTurn).toBeCloseTo((a.wheelTurn + b.wheelTurn) / 2);
  });
  it("keeps the trackside camera still and panning, and the follow camera alongside", () => {
    const early = trackPassState(PASS, 20, 30), late = trackPassState(PASS, 130, 30);
    expect(early.pose.position).toEqual(late.pose.position);
    expect(early.pose.target[0]).toBeLessThan(0);
    expect(late.pose.target[0]).toBeGreaterThan(0);
    const follow = { ...PASS, camera: { mode: "follow" as const, along: 2.5, side: 6 } };
    for (const f of [20, 75, 130]) { const s = trackPassState(follow, f, 30); expect(s.pose.position[0] - s.carX).toBeCloseTo(2.5, 1); }
  });
  it("chases at the car's first speed in film time, and brakes to stay behind when the ramp slows the car", () => {
    const clock = speedClock(compileSpeed({ source: 150, holds: [{ at: 75, frames: 45 }], exit: 12 }, 120, 30, () => undefined).speed!);
    const chase = { ...PASS, camera: { mode: "chase" as const, shake: 0 } }, at = (film: number) => trackPassState(chase, clock.contentAt(film), 30, .34, clock);
    const gaps = Array.from({ length: 121 }, (_, f) => at(f).carX - at(f).pose.position[0]), camera = (f: number) => at(f).pose.position[0];
    expect(gaps[0]).toBeCloseTo(24, 1);
    // At first the camera keeps the car's speed on screen, so the car holds its place.
    expect(gaps[20]).toBeCloseTo(24, 0);
    // Through the hold it closes in no nearer than 14 m, slowing as it goes; it never speeds up again, so the car races away.
    expect(Math.min(...gaps)).toBeGreaterThanOrEqual(14 - 1e-6);
    expect(Math.min(...gaps)).toBeLessThan(15);
    const speeds = Array.from({ length: 119 }, (_, f) => camera(f + 1) - camera(f));
    expect(speeds.every((u, i) => !i || u <= speeds[i - 1] + 1e-6)).toBe(true);
    expect(gaps[120]).toBeGreaterThan(60);
    // Sampled in any order, the same frame gives the same place.
    expect(camera(77.3)).toBe(camera(77.3));
  });
  it("rises the camera just before the ramp speeds up, eased, in film time", () => {
    const clock = speedClock(compileSpeed({ source: 169, exit: 45 }, 135, 30, () => undefined).speed!);
    const spec = { ...PASS, camera: { mode: "chase" as const, shake: 0, rise: { height: 3.2 } } }, height = (film: number) => trackPassState(spec, clock.contentAt(film), 30, .34, clock).pose.position[1];
    expect(clock.rampUp).toBe(90);
    expect(height(60)).toBeCloseTo(1.2, 5);
    expect(height(80)).toBeCloseTo(2.2, 1);
    expect(height(90)).toBeCloseTo(3.2, 5);
    expect(height(120)).toBeCloseTo(3.2, 5);
    // Without a ramp to lead into, a rise needs its own end.
    expect(trackPassState(spec, 100, 30).pose.position[1]).toBeCloseTo(1.2, 5);
    expect(trackPassState({ ...spec, camera: { ...spec.camera, rise: { height: 3.2, end: 50 } } }, 100, 30).pose.position[1]).toBeCloseTo(3.2, 5);
  });
  it("rings the track with distant mountains on every side, from a tile that meets the plain below ground", () => {
    const tile = generatedMountain(64), ys = tile.positions.filter((_, i) => i % 3 === 1);
    expect(Math.max(...ys)).toBeCloseTo(1, 5);
    expect(ys[0]).toBeLessThan(0);
    expect(generatedMountain(64).positions).toEqual(tile.positions);
    const sides = MOUNTAIN_RING.map(place => mountainCentre(place));
    expect(sides.some(([x]) => x > 5000)).toBe(true);
    expect(sides.some(([x]) => x < -5000)).toBe(true);
    expect(sides.some(([, z]) => z < -3000)).toBe(true);
    expect(sides.some(([, z]) => z > 3000)).toBe(true);
    expect(MOUNTAIN_RING.every(place => place.distance - place.width / 2 > 1000)).toBe(true);
  });
  it("averages moments spread across a centred 180° shutter, shortened by a speed ramp's rate", () => {
    const offsets = shutterOffsets({ camera: { mode: "follow" } });
    expect(offsets).toHaveLength(6);
    // Centred on the frame, half a frame wide: the first moment is (0.5/6 − 0.5) × 0.5 frames from the frame.
    expect(offsets[0]).toBeCloseTo((.5 / 6 - .5) * .5);
    expect(offsets.reduce((a, b) => a + b, 0)).toBeCloseTo(0);
    expect(Math.max(...shutterOffsets({ camera: { mode: "follow" } }, .1))).toBeCloseTo(Math.max(...offsets) * .1);
    // Trackside shoots a shorter 90° shutter, half the smear.
    expect(Math.max(...shutterOffsets({}))).toBeCloseTo(Math.max(...offsets) / 2);
    expect(shutterOffsets({ shutter: { samples: 1 } })).toEqual([0]);
    expect(Math.max(...shutterOffsets({ shutter: { angle: 90, samples: 4 } }))).toBeCloseTo(.375 * .25);
  });
  it("shakes a following camera a little, and keeps a trackside camera still", () => {
    const follow = { ...PASS, camera: { mode: "follow" as const, along: 0, side: 6, height: 1 } };
    const heights = [10, 20, 30, 40].map(f => trackPassState(follow, f, 30).pose.position[1]);
    expect(new Set(heights.map(h => h.toFixed(4))).size).toBeGreaterThan(1);
    expect(Math.max(...heights.map(h => Math.abs(h - 1)))).toBeLessThan(.013);
    expect(trackPassState(PASS, 10, 30).pose.position).toEqual(trackPassState(PASS, 40, 30).pose.position);
  });
  it("rides a little on the road, the same at the same frame", () => {
    const s = trackPassState(PASS, 40, 30);
    expect(Math.abs(s.ride.lift)).toBeLessThan(.005);
    expect(trackPassState(PASS, 40, 30)).toEqual(s);
  });
  it("checks the craft rules, and skips the pass rules for a follow shot", () => {
    expect(codes({})).toEqual([]);
    expect(codes({ passFrame: 200 })).toContain("race-pass-outside");
    expect(codes({ passFrame: 15 })).toContain("race-approach-short");
    expect(codes({ passFrame: 140 })).toContain("race-exit-short");
    expect(codes({ speed: 150 })).toContain("race-speed");
    expect(codes({ camera: { side: 2 } })).toContain("race-camera-close");
    expect(codes({ title: { text: "Faster", enter: 70 } })).toContain("race-title-at-pass");
    expect(codes({ title: { text: "One two three four five six seven", enter: 130 } })).toContain("race-title-short");
    expect(codes({ passFrame: 200, camera: { mode: "follow" } })).toEqual([]);
    // A chase camera rides right behind the car: the trackside distance rule does not apply.
    expect(codes({ camera: { mode: "follow", side: 1 } })).toEqual([]);
  });
});

describe("car wheels", () => {
  const car = (names: string[]) => { const root = new Group(); for (const name of names) { const m = new Mesh(); m.name = name; root.add(m); } return root; };
  it("finds the four wheels under common names, front and rear, left and right", () => {
    for (const names of [["WheelFrontL", "WheelFrontR", "WheelRearL", "WheelRearR"], ["Wheel_FL_Textures 1_0", "Wheel_FR_Textures 1_0", "Wheel_BL_Textures 1_0", "Wheel_BR_Textures 1_0"],
      ["wheel_front_left", "wheel_front_right", "wheel_rear_left", "wheel_rear_right"]]) {
      expect(findWheels(car(names)).map(o => o.name)).toEqual(names);
    }
    expect(() => findWheels(car(["Body", "Glass"]))).toThrow(/four wheels/);
  });
});

describe("race shots in a film", () => {
  const content: FilmShot3dContent = { shot: "race", label: "A car passes a trackside camera.", spec: { passFrame: 75 } as never };
  it("names the pass as a transient moment, the turn of the shot", () => {
    const cues = shot3dCues(content, 150, 30);
    expect(cues).toEqual([{ id: "pass", frame: 75, transient: true }]);
    expect(shot3dTurnCue(content)).toBe("pass");
    expect(shot3dTurnCue({ ...content, spec: { passFrame: 75, camera: { mode: "follow" } } } as FilmShot3dContent)).toBe("title");
  });
  it("compiles in a film and reports the shot's craft problems", () => {
    const film = (spec: object) => compileFilm({ schemaVersion: 1, id: "r", fps: { num: 30, den: 1 }, outputs: [{ id: "o", width: 640, height: 360 }],
      scenes: [{ id: "pass", recipeId: "shot-3d", durationFrames: 150, content: { ...content, spec } }] });
    expect(film({ passFrame: 75 }).diagnostics.filter(d => d.severity === "error")).toEqual([]);
    expect(film({ passFrame: 400 }).diagnostics.map(d => d.code)).toContain("race-pass-outside");
  });
});
