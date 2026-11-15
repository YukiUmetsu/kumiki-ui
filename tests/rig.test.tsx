import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { RIG_PRESETS, scalePath, personRig, quadrupedRig, locomotiveRig, clockRig, birdRig, modernCarRig, bicycleRig, helicopterRig, frogRig, snakeRig, leafRig, petalsRig } from "../registry/rig/rig-presets";
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
    expect(Math.min(...knees)).toBeLessThan(30); // .985 of full length: reads straight, never snaps to a locked knee
    expect(Math.max(...knees)).toBeGreaterThan(70);
  });
  it("breaks a hoof over its planted toe at the end of stance and lands it flat", () => {
    const spec = quadrupedRig("horse", { motion: "walk", start: 0, end: 240, from: 0, to: 1500, size: 430, y: 700 });
    const gait = spec.drivers!.find(d => d.type === "gait");
    if (gait?.type !== "gait") throw new Error("no gait");
    const leg = gait.legs.find(l => l.upper === "up-fore-near")!;
    let broke = 0, flatPlants = 0;
    for (let f = 40; f < 200; f++) {
      const h = evaluateRig(spec, f).bones.get("hoof-fore-near")!.world, angle = Math.atan2(h.b, h.a) * 180 / Math.PI;
      const toeY = h.b * leg.toe! + h.f;
      if (angle > 40 && Math.abs(toeY - 700) < .6) broke++;
      if (Math.abs(angle) < .5 && Math.abs(h.f - 700) < .6) flatPlants++;
    }
    expect(broke).toBeGreaterThan(2);
    expect(flatPlants).toBeGreaterThan(20);
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
    // Turning toward the camera: the nose shows grille and lamps, the tyres their tread, the bonnet top (raised camera).
    const toward = modernCarRig({ motion: "turn-toward", start: 0, end: 240, from: 0, to: 1600, y: 700 });
    const html = renderToStaticMarkup(<RigScene look="flat" width={1600} height={900} ground={700} frame={128} rigs={[toward]} />);
    for (const id of ["front-grille", "front-lamp-far", "wheel-f-tread-face-", "shell-face-"]) expect(html).toContain(`data-km-rig-part="${id}`);
    expect(renderToStaticMarkup(<RigScene look="flat" width={1600} height={900} ground={700} frame={10} rigs={[toward]} />)).not.toContain("front-grille");
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

describe("RIG1 nature and actions", () => {
  const tip = (spec: RigSpec, bone: string, f: number) => { const b = evaluateRig(spec, f).bones.get(bone)!; return [b.world.e + b.world.c * b.length, b.world.f + b.world.d * b.length]; };
  it("hops a frog off planted toes and lands it on planted hands, feet never below the ground", () => {
    const spec = frogRig({ motion: "hop", start: 0, end: 98, from: 100, to: 1600, y: 600 });
    const push = [8, 10, 12, 13].map(f => tip(spec, "toes-n", f));
    for (const p of push) expect(Math.hypot(p[0] - push[0][0], p[1] - push[0][1])).toBeLessThan(1.5);
    const hand = [26, 30, 34].map(f => world(spec, "hand-n", f));
    for (const p of hand) expect(Math.abs(p[0] - hand[0][0])).toBeLessThan(2.5);
    for (let f = 0; f < 98; f++) expect(tip(spec, "toes-n", f)[1]).toBeLessThan(600 + 2.5);
    // After landing the legs stay in line with the body (well short of vertical), then fold low beside it.
    for (let f = 28; f < 46; f++) expect(tip(spec, "toes-n", f)[1], `frame ${f}`).toBeGreaterThan(world(spec, "body", f)[1] - (f < 33 ? 40 : 24) * (160 / 60));
    // In the flight the body is well off the ground with the legs trailing behind the hip.
    const air = evaluateRig(spec, 20), hip = air.bones.get("body")!.world.f;
    expect(hip).toBeLessThan(600 - 100);
    expect(tip(spec, "toes-n", 20)[0]).toBeLessThan(air.bones.get("body")!.world.e - 60);
  });
  it("slithers with every point following the head's path, and strikes from the coil in two frames", () => {
    const spec = snakeRig({ motion: "slither", start: 0, end: 200, from: 0, to: 800, y: 600 });
    // A body joint passes through the very spot an earlier joint occupied some frames before (no sideways slip).
    const L = 94 / 16 * 3.6;
    for (const f of [90, 150]) {
      const later = world(spec, "body-11", f);
      const best = Math.min(...Array.from({ length: 60 }, (_, k) => { const p = world(spec, "body-5", f - k); return Math.hypot(p[0] - later[0], p[1] - later[1]); }));
      expect(best).toBeLessThan(L * .25);
    }
    const strike = snakeRig({ motion: "strike", start: 0, end: 240, y: 600 });
    const a = Math.round(240 * .28), before = world(strike, "head", a), hit = world(strike, "head", a + 2);
    expect(hit[0] - before[0]).toBeGreaterThan(60);
    expect(evaluateRig(strike, a + 3).parts.find(p => p.id === "mouth")).toBeTruthy();
  });
  it("drops a leaf in a zigzag that shows its back, settling flat; on water it floats inside spreading ripples", () => {
    const spec = leafRig({ motion: "fall", start: 0, end: 240, from: 500, y: 600 });
    const xs = Array.from({ length: 160 }, (_, f) => world(spec, "leaf", f)[0]);
    const turns = xs.slice(2).filter((x, i) => (x - xs[i + 1]) * (xs[i + 1] - xs[i]) < 0).length;
    expect(turns).toBeGreaterThanOrEqual(4);
    const backs = Array.from({ length: 180 }, (_, f) => evaluateRig(spec, f).parts.find(p => p.id === "blade")!.color).filter(c => c === "#e0b07c").length;
    expect(backs).toBeGreaterThan(5);
    const end = evaluateRig(spec, 239).bones.get("leaf")!.world;
    expect(Math.abs(end.f - (600 + 9.5 * 4.2))).toBeLessThan(3);
    const water = leafRig({ motion: "fall-water", start: 0, end: 240, from: 500, y: 600 });
    expect(evaluateRig(water, 239).parts.some(p => p.id === "ripple-0" || p.id === "ripple-3")).toBe(true);
    expect(evaluateRig(water, 20).parts.some(p => p.id.startsWith("ripple"))).toBe(false);
  });
  it("streams petals on the wind, recycling them and flipping some to their backs", () => {
    const spec = petalsRig({ motion: "blow", start: 0, end: 240, from: 800, y: 700 });
    const f = evaluateRig(spec, 100), petals = f.parts.filter(p => /^petal-\d+$/.test(p.id));
    expect(petals.length).toBeGreaterThan(25);
    expect(petals.some(p => p.color === "#fbe2e9")).toBe(true);
    const x0 = world(spec, "petal-3", 40)[0], x1 = world(spec, "petal-3", 50)[0];
    expect(Math.abs(x1 - x0)).toBeGreaterThan(30);
  });
  it("keeps hands on their props through every action", () => {
    const cases: [string, [string, string][], number][] = [["shoot", [["hand-f", "gun"]], 60], ["sword", [["hand-f", "sword"], ["hand-b", "sword-pommel"]], 0], ["sword-thrust", [["hand-f", "sword"], ["hand-b", "sword-pommel"]], 0], ["sword-sweep", [["hand-f", "sword"], ["hand-b", "sword-pommel"]], 0], ["chop", [["hand-f", "knife"], ["hand-b", "claw"]], 0], ["pan-toss", [["hand-f", "pan"]], 0]];
    for (const [motion, pairs, from] of cases) {
      const spec = personRig({ motion, start: 0, end: 240, y: 700 });
      for (let f = from; f < 240; f += 3) for (const [hand, grip] of pairs) {
        const h = world(spec, hand, f), g = world(spec, grip, f);
        expect(Math.hypot(h[0] - g[0], h[1] - g[1]), `${motion} ${hand} ${f}`).toBeLessThan(2.4 * 3.6);
      }
    }
  });
  it("varies the sword form and draws from, then returns to, the scabbard with hands on grip and scabbard", () => {
    const form = personRig({ motion: "sword", start: 0, end: 240, y: 700 }), angles = new Set<string>();
    let lunge = 0;
    for (let f = 0; f < 240; f += 2) {
      const m = evaluateRig(form, f).bones.get("sword")!.world, a = Math.atan2(m.b, m.a) * 180 / Math.PI;
      angles.add(a < -110 ? "overhead" : a > 25 && a < 60 ? "low" : Math.abs(a) < 8 ? "level" : "other");
      lunge = Math.max(lunge, world(form, "pelvis", f)[1] - world(form, "pelvis", 0)[1]);
    }
    expect([...angles]).toEqual(expect.arrayContaining(["overhead", "low", "level"]));
    expect(lunge).toBeGreaterThan(6 * 3.6);
    const draw = personRig({ motion: "sword-draw", start: 0, end: 240, y: 700 });
    for (const f of [5, 110]) { const s = world(draw, "sword", f), y = world(draw, "saya", f); expect(Math.hypot(s[0] - y[0], s[1] - y[1]), `seated ${f}`).toBeLessThan(1); }
    const out = world(draw, "sword", 12 + 30), mouth = world(draw, "saya", 12 + 30);
    expect(Math.hypot(out[0] - mouth[0], out[1] - mouth[1])).toBeGreaterThan(40);
    for (let f = 0; f < 240; f += 3) {
      const h = world(draw, "hand-f", f), g = world(draw, "sword", f);
      expect(Math.hypot(h[0] - g[0], h[1] - g[1]), `grip ${f}`).toBeLessThan(2.4 * 3.6);
    }
    for (const f of [14, 30, 84]) { const h = world(draw, "hand-b", f), g = world(draw, "saya-grip", f); expect(Math.hypot(h[0] - g[0], h[1] - g[1]), `scabbard ${f}`).toBeLessThan(2.4 * 3.6); }
  });
  it("flashes the muzzle only on shots, snaps a kick to waist height and lands a jab at shoulder height", () => {
    const shoot = personRig({ motion: "shoot", start: 0, end: 240, y: 700 }), shot = Math.round(240 * .32);
    expect(evaluateRig(shoot, shot).parts.some(p => p.id === "flash-out")).toBe(true);
    expect(evaluateRig(shoot, shot + 4).parts.some(p => p.id === "flash-out")).toBe(false);
    const kick = personRig({ motion: "kick", start: 0, end: 240, y: 700 });
    expect(world(kick, "foot-f", 18 + 11)[1]).toBeLessThan(700 - 48 * 3.6);
    const box = personRig({ motion: "box", start: 0, end: 240, y: 700 }), sh = world(box, "arm-b", 17), fist = world(box, "hand-b", 17);
    expect(Math.abs(fist[1] - sh[1])).toBeLessThan(6 * 3.6);
    expect(fist[0] - sh[0]).toBeGreaterThan(24 * 3.6);
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
