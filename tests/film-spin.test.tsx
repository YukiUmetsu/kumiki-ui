import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { compileFilm, evaluateFilm } from "../registry/video/film-document";
import type { FilmDocument } from "../registry/video/film-document";
import { inspectSpinCut, spinCutFrame, turnCover } from "../registry/video/film-spin";
import type { FilmSpinCut } from "../registry/video/film-spin";
import { MotionBlurFilter } from "../registry/video/film-blur-react";

const spin: FilmSpinCut = { kind: "spin", turn: 180, zoom: 1.8, clockwise: true }, zoom: FilmSpinCut = { ...spin, kind: "zoom-blur" };
/** The angle (degrees) and scale of a CSS matrix about the frame's centre. */
const pose = (m: { a: number; b: number }) => ({ angle: Math.atan2(m.b, m.a) * 180 / Math.PI, scale: Math.hypot(m.a, m.b) });

describe("spin and zoom-blur cuts", () => {
  it("keeps the frame covered at every angle of a turn", () => {
    const width = 1920, height = 1080;
    for (const degrees of [0, 10, 45, 90, 135, 180]) {
      const k = turnCover(width, height, degrees), r = degrees * Math.PI / 180;
      for (const [x, y] of [[0, 0], [width, 0], [0, height], [width, height]]) {
        const px = x - width / 2, py = y - height / 2, ux = (Math.cos(r) * px + Math.sin(r) * py) / k, uy = (-Math.sin(r) * px + Math.cos(r) * py) / k;
        expect(Math.abs(ux)).toBeLessThanOrEqual(width / 2 + 1e-6);
        expect(Math.abs(uy)).toBeLessThanOrEqual(height / 2 + 1e-6);
      }
    }
    expect(turnCover(width, height, 90)).toBeCloseTo(width / height, 6);
  });

  it("turns one way through the cut, fastest and most blurred at the cut", () => {
    const frames = [0, .25, .45, .55, .75, 1].map(t => spinCutFrame(spin, t, 14, 960, 540));
    expect(frames.map(frame => frame.showIncoming)).toEqual([false, false, false, true, true, true]);
    // Outgoing from 0 towards +90, incoming from −90 back to 0: one clockwise turn of 180 degrees.
    const angles = frames.map(frame => pose(frame.showIncoming ? frame.incoming : frame.outgoing).angle);
    expect(angles[0]).toBeCloseTo(0, 6);
    expect(angles[2]).toBeGreaterThan(angles[1]);
    expect(angles[3]).toBeLessThan(0);
    expect(angles[4]).toBeGreaterThan(angles[3]);
    expect(angles[5]).toBeCloseTo(0, 6);
    expect(frames[2].spin).toBeGreaterThan(frames[1].spin);
    expect(frames[0].spin).toBe(0);
    // Half a frame of turn at the fastest point (a 180° shutter), up to 24 degrees.
    expect(spinCutFrame(spin, .5, 14, 960, 540).spin).toBeCloseTo(.5 * 180 * 3 / 14 * Math.PI / 180, 6);
    expect(spinCutFrame({ ...spin, turn: 720 }, .5, 14, 960, 540).spin).toBeCloseTo(24 * Math.PI / 180, 6);
    expect(pose(spinCutFrame({ ...spin, clockwise: false }, .25, 14, 960, 540).outgoing).angle).toBeLessThan(0);
  });

  it("pushes in to the cut and pulls back out of it", () => {
    const at = (t: number) => spinCutFrame(zoom, t, 10, 960, 540);
    expect(pose(at(0).outgoing).scale).toBeCloseTo(1, 6);
    expect(pose(at(.49).outgoing).scale).toBeGreaterThan(1.7);
    expect(pose(at(.51).incoming).scale).toBeGreaterThan(1.7);
    expect(pose(at(1).incoming).scale).toBeCloseTo(1, 6);
    expect(at(.49).zoom).toBeGreaterThan(at(.2).zoom);
  });

  it("checks its options", () => {
    const codes = (transition: Parameters<typeof inspectSpinCut>[0]) => inspectSpinCut(transition, 30, "/t").problems.map(item => item.code);
    expect(codes({ kind: "spin", turn: 45 })).toContain("spin-turn");
    expect(codes({ kind: "zoom-blur", zoom: 8 })).toContain("zoom-blur-zoom");
    expect(codes({ kind: "spin", direction: "up" })).toContain("spin-direction");
    expect(codes({ kind: "spin", durationFrames: 60 })).toContain("spin-length");
    expect(inspectSpinCut({ kind: "spin", direction: "left" }, 30, "/t").cut).toEqual({ kind: "spin", turn: 180, zoom: 1.8, clockwise: false });
  });

  it("blurs along circles for a turn and along rays for a zoom", () => {
    const both = renderToStaticMarkup(<MotionBlurFilter id="m" zoom={.1} spin={.2} centre={{ x: .5, y: .5 }} width={960} height={540} />);
    expect(both.match(/<feDisplacementMap/g)).toHaveLength(24);
    expect(both.match(/data-km-film-warp-map/g)).toHaveLength(4);
    expect(renderToStaticMarkup(<MotionBlurFilter id="m" zoom={0} spin={0} centre={{ x: .5, y: .5 }} width={960} height={540} />)).toBe("");
  });

  it("compiles the example with each cut on a kick, and plays a dissolve under reduced motion", () => {
    const doc = JSON.parse(readFileSync("examples/film/spin-zoom.film.json", "utf8")) as FilmDocument;
    const result = compileFilm(doc);
    if (!result.ok) throw new Error(result.diagnostics.map(item => item.message).join("\n"));
    expect(result.diagnostics).toEqual([]);
    expect(Object.keys(result.film.spins)).toEqual(["falls", "lagoon"]);
    // The first frame showing the incoming scene is a beat of the 110 bpm loop.
    for (const transition of result.film.cut.transitions) {
      const first = Array.from({ length: transition.endFrame - transition.startFrame }, (_, i) => transition.startFrame + i)
        .find(frame => spinCutFrame(result.film.spins[transition.toShotId], evaluateFilm(result.film, frame).transition!.progress, transition.endFrame - transition.startFrame, 960, 540).showIncoming)!;
      expect([147, 278]).toContain(first);
    }
  });
});
