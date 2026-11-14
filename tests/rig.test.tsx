import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { RIG_PRESETS, scalePath, personRig, quadrupedRig, locomotiveRig, clockRig } from "../registry/rig/rig-presets";
import { evaluateRig, wingStroke } from "../registry/rig/rig-evaluate";
import { inspectRig } from "../registry/rig/rig-spec";
import type { RigSpec } from "../registry/rig/rig-spec";
import { RIG_LOOKS, RigScene } from "../registry/rig/rig-react";
import { inspectCollageScene } from "../registry/video/collage/collage-scene";
import { CollageScene } from "../registry/video/collage/collage-react";

const world = (spec: RigSpec, bone: string, f: number) => { const m = evaluateRig(spec, f).bones.get(bone)!.world; return [m.e, m.f]; };

describe("RIG1 contract", () => {
  it("every preset and motion validates", () => {
    for (const p of RIG_PRESETS) for (const motion of p.motions)
      expect(inspectRig(p.build({ motion, start: 0, end: 120, from: 0, to: p.travels(motion) ? 600 : 0, y: 500 })), p.id + "/" + motion).toEqual([]);
  });
  it("reports bad bones, parts and drivers with paths", () => {
    const issues = inspectRig({ version: 1, id: "x", kind: "t", bounds: { x: 0, y: 0, width: 1, height: 1 }, provenance: { license: "CC0", source: "t" }, palette: { skin: "#fff" },
      bones: [{ id: "a", x: 0, y: 0 }, { id: "b", parent: "zz", x: 0, y: 0 }], parts: [{ id: "p", bone: "nope", role: "skin", z: 0, shape: { type: "path", d: "<x>" } }],
      drivers: [{ type: "gait", body: "a", stride: 10, legs: [{ upper: "a", lower: "b", phase: 0, bend: 1 }] }] });
    expect(issues).toEqual(expect.arrayContaining([
      expect.stringContaining("palette.skin"), expect.stringContaining("bones[1].parent"), expect.stringContaining("parts[0].bone"),
      expect.stringContaining("parts[0].shape.d"), expect.stringContaining("needs a length")]));
  });
  it("scales path data without touching arc flags", () => {
    expect(scalePath("M1 2A3 3 0 1 0 4 5Z", 2)).toBe("M2 4A6 6 0 1 0 8 10Z");
  });
});

describe("RIG1 motion", () => {
  it("is a pure function of the frame (any seek order)", () => {
    const spec = quadrupedRig("horse", { motion: "gallop", start: 0, end: 200, from: 0, to: 2000 });
    const a = [10, 77, 140].map(f => JSON.stringify(evaluateRig(spec, f).parts.map(p => p.matrix)));
    const b = [140, 10, 77].map(f => JSON.stringify(evaluateRig(spec, f).parts.map(p => p.matrix)));
    expect([b[1], b[2], b[0]]).toEqual(a);
  });
  it("keeps a planted foot still in the world while the body walks over it", () => {
    const spec = personRig({ motion: "walk", start: 0, end: 240, from: 180, to: 1400, y: 720 });
    const pts = Array.from({ length: 60 }, (_, i) => world(spec, "foot-f", 40 + i));
    const ground = Math.max(...pts.map(p => p[1]));
    const planted = pts.filter(p => Math.abs(p[1] - ground) < .01);
    expect(planted.length).toBeGreaterThan(8);
    // Two separate plants in the window at most, each perfectly still.
    expect(new Set(planted.map(p => Math.round(p[0] * 10) / 10)).size).toBeLessThanOrEqual(2);
    expect(world(spec, "foot-f", 230)[0]).toBeGreaterThan(world(spec, "foot-f", 20)[0] + 800);
  });
  it("rolls wheels by distance and keeps the coupling rod level on its crank pins", () => {
    const spec = locomotiveRig({ size: 600, start: 0, end: 120, from: 0, to: 1200 });
    const f = evaluateRig(spec, 60), wheel = f.bones.get("drv-0")!.world, rod = f.bones.get("coupling")!.world;
    expect(Math.abs(Math.atan2(wheel.b, wheel.a))).toBeGreaterThan(.01);
    expect(Math.abs(rod.d)).toBeLessThan(1e-6);
    expect(f.parts.some(p => p.id.startsWith("puff-"))).toBe(true);
  });
  it("ticks a clock's seconds hand once a second and swings its pendulum", () => {
    const spec = clockRig({ start: 0, end: 120 });
    const ang = (f: number) => { const m = evaluateRig(spec, f).bones.get("second")!.world; return Math.round(Math.atan2(m.b, m.a) * 180 / Math.PI); };
    expect(ang(10)).toBe(ang(25));
    expect(ang(40)).not.toBe(ang(25));
    expect(Math.abs(evaluateRig(spec, 2).bones.get("pendulum")!.world.b - evaluateRig(spec, 30).bones.get("pendulum")!.world.b)).toBeGreaterThan(.05);
    expect(wingStroke(0)).toBe(1);
  });
});

describe("RIG1 painters", () => {
  it("draws the same rig in every film look", () => {
    const rig = quadrupedRig("dog", { motion: "walk", start: 0, end: 100, from: 100, to: 700, y: 500 });
    for (const l of RIG_LOOKS) {
      const html = renderToStaticMarkup(<RigScene look={l.id} width={800} height={600} ground={500} frame={30} rigs={[rig]} showBones />);
      expect(html, l.id).toContain('data-km-rig="dog"');
      expect(html).toContain("data-km-rig-bones");
    }
  });
  it("embeds rigs in COLLAGE1 scenes as rig nodes", () => {
    const spec = { version: 1, id: "c", width: 800, height: 450, durationFrames: 60, seed: 1, board: { material: "kraft" },
      nodes: [{ id: "walker", kind: "rig", rig: personRig({ motion: "walk", start: 0, end: 60, from: 100, to: 500, y: 400 }) }] };
    expect(inspectCollageScene(spec)).toEqual([]);
    expect(renderToStaticMarkup(<CollageScene spec={spec as never} frame={20} />)).toContain('data-km-rig-layer="collage"');
    expect(inspectCollageScene({ ...spec, nodes: [{ id: "x", kind: "rig", rig: { version: 2 } }] })).toEqual(expect.arrayContaining([expect.stringContaining("nodes[0].rig.version")]));
  });
});
