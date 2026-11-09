import { describe, expect, it } from "vitest";
import { Group, Mesh } from "three";
import { inspectTrackPass, trackPassState } from "../registry/visual/race-shots";
import type { TrackPassSpec } from "../registry/visual/race-shots";
import { findWheels } from "../registry/visual/race-recipes-react";
import { shot3dCues, shot3dTurnCue } from "../registry/video/film-3d";
import type { FilmShot3dContent } from "../registry/video/film-3d";
import { compileFilm } from "../registry/video/film-document";

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
    for (const f of [20, 75, 130]) { const s = trackPassState(follow, f, 30); expect(s.pose.position[0] - s.carX).toBeCloseTo(2.5); }
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
