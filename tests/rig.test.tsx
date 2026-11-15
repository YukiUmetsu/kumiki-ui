import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { RIG_PRESETS, scalePath, personRig, quadrupedRig, locomotiveRig, clockRig, birdRig, modernCarRig, bicycleRig, helicopterRig } from "../registry/rig/rig-presets";
import { evaluateRig, wingStroke } from "../registry/rig/rig-evaluate";
import { inspectRig } from "../registry/rig/rig-spec";
import type { RigSpec } from "../registry/rig/rig-spec";
import { RIG_LOOKS, RigScene, followCamera } from "../registry/rig/rig-react";
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
  it("gallops with knees forward, hocks back and the transverse footfall order", () => {
    const spec = quadrupedRig("horse", { motion: "gallop", start: 0, end: 200, from: 0, to: 3000 });
    const gait = spec.drivers!.find(d => d.type === "gait")!;
    if (gait.type !== "gait") throw new Error("no gait");
    const byLeg = Object.fromEntries(gait.legs.map(l => [l.upper, l]));
    expect([byLeg["up-fore-near"].bend, byLeg["up-hind-near"].bend]).toEqual([1, -1]);
    // Landing order (phase = 1 − landing time): hind, hind, fore, fore, then a suspension.
    const landing = (id: string) => (1 - byLeg[id].phase) % 1;
    expect(["up-hind-far", "up-hind-near", "up-fore-far", "up-fore-near"].map(landing)).toEqual([0, .1, .27, .4].map(v => expect.closeTo(v, 5)));
    // Joint angles change through the stride: straight in stance (a column on the sinking fetlock), folded in swing.
    const knee = (f: number) => { const fr = evaluateRig(spec, f), a = fr.bones.get("up-fore-near")!.world, b = fr.bones.get("lo-fore-near")!.world;
      return Math.abs(((Math.atan2(b.b, b.a) - Math.atan2(a.b, a.a)) * 180 / Math.PI + 540) % 360 - 180); };
    const knees = Array.from({ length: 60 }, (_, i) => knee(60 + i));
    expect(Math.min(...knees)).toBeLessThan(24); // .985 of full length: reads straight, never snaps to a locked knee
    expect(Math.max(...knees)).toBeGreaterThan(70);
  });
  it("beats side-view wings by projection, never swinging the tips ahead of the shoulder", () => {
    const spec = birdRig({ motion: "fly", start: 0, end: 60, from: 0, to: 600 });
    let lowest = Infinity, highest = -Infinity, forward = -Infinity;
    for (let f = 0; f < 28; f++) {
      const fr = evaluateRig(spec, f), sh = fr.bones.get("wing-near")!.world, hand = fr.bones.get("hand-near")!, tip = [hand.world.c * hand.length + hand.world.e, hand.world.d * hand.length + hand.world.f];
      lowest = Math.min(lowest, tip[1] - sh.f); highest = Math.max(highest, tip[1] - sh.f); forward = Math.max(forward, tip[0] - sh.e);
    }
    expect(lowest).toBeLessThan(-40);
    expect(highest).toBeGreaterThan(30);
    expect(forward).toBeLessThan(18);
  });
  it("brakes with a nose dive that rebounds, and reverses with wheels rolling backward", () => {
    const stop = modernCarRig({ motion: "sudden-brake", start: 0, end: 240, from: 0, to: 1000, y: 700 });
    const pitch = (spec: RigSpec, f: number) => { const m = evaluateRig(spec, f).bones.get("body")!.world; return Math.atan2(m.b, m.a) * 180 / Math.PI; };
    const angles = Array.from({ length: 100 }, (_, i) => pitch(stop, 60 + i));
    expect(Math.max(...angles)).toBeGreaterThan(3);
    expect(Math.min(...angles)).toBeLessThan(-.5);
    const back = modernCarRig({ motion: "reverse", start: 0, end: 240, from: 1000, to: 400, y: 700 });
    const wheel = (f: number) => { const m = evaluateRig(back, f).bones.get("wheel-r")!.world; return Math.atan2(m.b, m.a); };
    expect(evaluateRig(back, 120).root.facing).toBe(1);
    expect(Math.sin(wheel(100) - wheel(98))).toBeLessThan(0);
    expect(evaluateRig(back, 120).parts.some(p => p.id === "reverse")).toBe(true);
    expect(evaluateRig(back, 230).parts.some(p => p.id === "reverse")).toBe(false);
  });
  it("turns into the distance as a solid: smaller, faces opening, far-side indicator only", () => {
    const spec = modernCarRig({ motion: "turn-away", start: 0, end: 240, from: 0, to: 1600, y: 700 });
    const mid = evaluateRig(spec, 138), end = evaluateRig(spec, 230);
    expect(mid.root.yaw).toBeGreaterThan(15);
    expect(end.root.scale).toBeLessThan(.7);
    expect(mid.parts.find(p => p.id === "shell")!.farMatrix!.e).toBeLessThan(mid.parts.find(p => p.id === "shell")!.matrix.e - 40);
    expect(renderToStaticMarkup(<RigScene look="flat" width={1600} height={900} ground={700} frame={138} rigs={[spec]} />)).toContain('data-km-rig-part="shell-face-');
    // Turning away is a left turn: the far (left) indicators blink, the near ones stay dark.
    const blink = evaluateRig(spec, 50).parts.map(p => p.id);
    expect(blink).toContain("ind-r-far");
    expect(blink).not.toContain("ind-r");
  });
  it("stops a bicycle hard enough to lift the rear wheel, and lands a helicopter with the rotor winding down", () => {
    const bike = bicycleRig({ motion: "sudden-stop", start: 0, end: 240, from: 0, to: 900, y: 700 });
    const lift = Array.from({ length: 120 }, (_, i) => { const m = evaluateRig(bike, 50 + i).bones.get("pitch")!.local; return Math.atan2(m.b, m.a) * 180 / Math.PI; });
    expect(Math.max(...lift)).toBeGreaterThan(3);
    expect(Math.min(...lift)).toBeGreaterThanOrEqual(0);
    const heli = helicopterRig({ motion: "land", start: 0, end: 240, from: 600, y: 700 });
    const blade = (f: number) => evaluateRig(heli, f).bones.get("blade-a")!.world.a;
    expect(blade(100)).not.toBeCloseTo(blade(101), 3);
    expect(blade(232)).toBeCloseTo(blade(239), 6);
    expect(evaluateRig(heli, 236).root.y).toBe(700);
  });
  it("sits a person on a chair with feet planted and hands on the knees", () => {
    const spec = personRig({ motion: "sit", start: 0, end: 120, from: 400, y: 700 });
    const f = evaluateRig(spec, 20), pelvis = f.bones.get("pelvis")!.world.f, foot = f.bones.get("foot-f")!.world.f;
    expect(pelvis).toBeGreaterThan(700 - 30 * 3.6);
    expect(Math.abs(foot - (700 - 2.4 * 3.6))).toBeLessThan(.5);
    expect(f.parts.some(p => p.id === "chair-seat")).toBe(true);
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
  it("tracks a travelling rig with a camera over world-anchored ground", () => {
    const rig = quadrupedRig("horse", { motion: "gallop", start: 0, end: 100, from: 0, to: 3000, y: 500 });
    const html = renderToStaticMarkup(<RigScene look="collage" width={800} height={450} ground={500} frame={60} rigs={[rig]} camera={followCamera(rig, 60, { y: 225 })} />);
    expect(html).toMatch(/<g transform="translate\(-\d+[^"]*"[^>]*data-km-rig-world=""/);
    expect(html).toContain("data-km-rig-ground");
  });
  it("embeds rigs in COLLAGE1 scenes as rig nodes", () => {
    const spec = { version: 1, id: "c", width: 800, height: 450, durationFrames: 60, seed: 1, board: { material: "kraft" },
      nodes: [{ id: "walker", kind: "rig", rig: personRig({ motion: "walk", start: 0, end: 60, from: 100, to: 500, y: 400 }) }] };
    expect(inspectCollageScene(spec)).toEqual([]);
    expect(renderToStaticMarkup(<CollageScene spec={spec as never} frame={20} />)).toContain('data-km-rig-layer="collage"');
    expect(inspectCollageScene({ ...spec, nodes: [{ id: "x", kind: "rig", rig: { version: 2 } }] })).toEqual(expect.arrayContaining([expect.stringContaining("nodes[0].rig.version")]));
  });
});
