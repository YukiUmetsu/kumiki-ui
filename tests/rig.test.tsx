import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { RIG_PRESETS, scalePath, personRig, quadrupedRig, locomotiveRig, clockRig, birdRig, modernCarRig, bicycleRig, helicopterRig, frogRig, snakeRig, leafRig, petalsRig } from "../registry/rig/rig-presets";
import { evaluateRig, wingStroke } from "../registry/rig/rig-evaluate";
import { RIG_ROLES, inspectRig } from "../registry/rig/rig-spec";
import type { RigSpec } from "../registry/rig/rig-spec";
import { RIG_LOOKS, RigScene, followCamera } from "../registry/rig/rig-react";
import { PENCIL_ROLE_SURFACE } from "../registry/rig/rig-look-pencil";
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
      drivers: [{ type: "gait", body: "a", stride: 10, legs: [{ upper: "a", lower: "b", phase: 0, bend: 1 }] }, { type: "drape", bones: ["a"], hang: 2 }] });
    expect(issues).toEqual(expect.arrayContaining([
      expect.stringContaining("palette.skin"), expect.stringContaining("bones[1].parent"), expect.stringContaining("parts[0].bone"),
      expect.stringContaining("parts[0].shape.d"), expect.stringContaining("needs a length"),
      expect.stringContaining("drivers[1] needs colliders or floor"), expect.stringContaining("drivers[1].hang must be 0..1")]));
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
  it("keeps feet on the floor lying down, and rolls without digging in or unwinding its turn", () => {
    const ellipseLow = (m: { b: number; d: number; f: number }, cx: number, cy: number, rx: number, ry: number) => m.b * cx + m.d * cy + m.f + Math.hypot(m.b * rx, m.d * ry);
    // Every window length: the feet used to drop through the floor between two reaches at 180 frames but not at 240.
    for (const D of [150, 180, 240]) for (const motion of ["lie-down", "go-to-sleep"]) {
      const spec = personRig({ motion, start: 0, end: D, from: 400, to: 400, y: 700 });
      for (let f = 0; f <= D; f++) for (const id of ["foot-f", "foot-b"]) expect(world(spec, id, f)[1], `${motion} ${D} ${id}@${f}`).toBeLessThan(700);
    }
    const spec = personRig({ motion: "roll", start: 0, end: 180, from: 400, to: 400, y: 700 }), head = spec.parts.find(p => p.id === "hair")!;
    expect(head).toBeDefined();
    const angle = (f: number) => { const m = evaluateRig(spec, f).bones.get("pelvis")!.world; return Math.atan2(m.b, m.a) * 180 / Math.PI; };
    for (let f = 0; f <= 180; f++) {
      // The head's outline (10.2 x 11.2 design units) stays on the floor, upside down included.
      expect(ellipseLow(evaluateRig(spec, f).bones.get("head")!.world, 0, 0, 10.2 * 3.6, 11.2 * 3.6), "head@" + f).toBeLessThan(700 + 4);
      if (f) expect(Math.abs(((angle(f) - angle(f - 1) + 540) % 360 + 360) % 360 - 180), "turn@" + f).toBeLessThan(30);
    }
  });
  describe("long hair", () => {
    type P = [number, number];
    const seg = (p: P, a: P, b: P) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy, t = l ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l)) : 0; return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy); };
    const hair = (motion: string) => personRig({ motion, hair: "long", start: 0, end: 180, from: 400, to: motion === "walk" || motion === "run" ? 900 : 400, y: 700 });
    const turn = (m: { a: number; b: number }) => Math.atan2(m.b, m.a) * 180 / Math.PI;
    const strands = (spec: RigSpec, f: number) => {
      const fr = evaluateRig(spec, f), drape = spec.drivers!.find(d => d.type === "drape")!;
      if (drape.type !== "drape") throw new Error("no drape");
      const at = (bone: string, x: number, y: number): P => { const m = fr.bones.get(bone)!.world; return [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f]; };
      return { drape, head: at("head", 0, 0), lean: Math.abs(turn(fr.bones.get("torso")!.world)), locks: drape.bones.map(id => [at(id, 0, 0), at(id, 0, fr.bones.get(id)!.length)] as [P, P]),
        // A collider's radius scales with its bone (the torso breathes).
        torso: drape.colliders!.filter(c => c.bone === "torso").map(c => { const m = fr.bones.get(c.bone)!.world; return { a: at(c.bone, ...c.at), b: at(c.bone, ...(c.to ?? c.at)), r: c.radius * Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)) }; }) };
    };
    // A breathing torso scales the locks by .8%, so a 24 px lock changes length by up to .2 px as it turns.
    const SKEW = .2;
    const lying = new Set<string>(["lie-down", "go-to-sleep", "sleep", "wake-up", "get-up", "roll"]), motions = RIG_PRESETS.find(p => p.id === "person-long-hair")!.motions;
    it("stays on the shoulders and back in every upright motion, on every frame", () => {
      for (const motion of motions) {
        if (lying.has(motion)) continue;
        const spec = hair(motion);
        for (let f = 0; f <= 180; f++) {
          const { drape, locks, torso, lean } = strands(spec, f);
          // Past 55 degrees of lean the back starts to let go (`slip`).
          if (lean > 55) continue;
          for (const [j, t] of locks) for (const c of torso) {
            const need = Math.min(c.r + drape.radius!, seg(j, c.a, c.b)), half = Math.hypot(t[0] - j[0], t[1] - j[1]) / 2;
            const closest = Math.min(...Array.from({ length: 21 }, (_, k) => seg([j[0] + (t[0] - j[0]) * k / 20, j[1] + (t[1] - j[1]) * k / 20], c.a, c.b)));
            expect(seg(t, c.a, c.b), motion + "@" + f + " tip").toBeGreaterThan(need - SKEW);
            // A lock may cut a round shoulder by its chord's sagitta, and its centre line never enters the body.
            expect(closest, motion + "@" + f + " lock").toBeGreaterThan(Math.sqrt(Math.max(0, need * need - half * half)) - SKEW);
            expect(closest, motion + "@" + f + " centre").toBeGreaterThan(c.r);
          }
        }
      }
    });
    it("never changes sides from one frame to the next", () => {
      for (const motion of motions) {
        if (lying.has(motion)) continue;
        const spec = hair(motion), bare = { ...spec, drivers: spec.drivers!.filter(d => d.type !== "drape") };
        const tips = (s: RigSpec, f: number) => { const fr = evaluateRig(s, f), h = fr.bones.get("head")!.world; return [0, 1, 2, 3, 4, 5].map(i => { const b = fr.bones.get("hair-" + i)!; return [b.world.c * b.length + b.world.e - h.e, b.world.d * b.length + b.world.f - h.f]; }); };
        for (let f = 1; f <= 180; f++) {
          const jump = (s: RigSpec) => { const a = tips(s, f - 1), b = tips(s, f); return Math.max(...b.map((t, i) => Math.hypot(t[0] - a[i][0], t[1] - a[i][1]))); };
          expect(jump(spec), motion + "@" + f).toBeLessThan(Math.max(18, jump(bare) * 1.5));
        }
      }
    });
    it("lies along a bowed back, and hangs free once the body tips past its slip", () => {
      const head = ([a, b]: [P, P]) => Math.atan2(-(b[0] - a[0]), b[1] - a[1]) * 180 / Math.PI;
      const bow = strands(hair("bow"), 100);
      expect(Math.abs(head(bow.locks[5]) - bow.lean)).toBeLessThan(12);
      const spec = hair("idle"), tipped = { ...spec, tracks: { ...spec.tracks, torso: [{ frame: 0, rotate: 85 }] } };
      expect(Math.abs(head(strands(tipped, 60).locks[5]))).toBeLessThan(30);
    });
    it("keeps off the floor in every motion, and settles the same in any seek order", () => {
      for (const motion of motions) {
        const spec = hair(motion);
        for (let f = 0; f <= 180; f += 2) {
          const { drape, locks } = strands(spec, f);
          // A roll puts the head itself on the floor: there a lock may only go no deeper than its joint.
          for (const [j, t] of locks) expect(t[1], motion + "@" + f).toBeLessThan(Math.max(700 - drape.radius!, j[1]) + SKEW);
        }
      }
      const spec = hair("bow"), parts = (f: number) => JSON.stringify(evaluateRig(spec, f).parts.map(p => p.matrix)), first = parts(100);
      parts(40);
      expect(parts(100)).toBe(first);
      // Momentum looks back over earlier poses: a fresh rig at one frame still gives what a played one gives.
      const roll = hair("roll"), at = (s: RigSpec, f: number) => JSON.stringify(evaluateRig(s, f).parts.map(p => p.matrix));
      for (let f = 30; f <= 60; f++) at(roll, f);
      expect(at(hair("roll"), 44)).toBe(at(roll, 44));
      expect(at({ ...roll, drivers: roll.drivers!.map(d => (d.type === "drape" ? { ...d, momentum: undefined } : d)) }, 44)).not.toBe(at(roll, 44));
    });

    it("puts elbows and hands on the floor, not through it", () => {
      for (const motion of lying) {
        const spec = hair(motion), top = motion === "lie-down" || motion === "roll" ? 700 : 700 - 2.4 * 3.6;
        for (let f = 0; f <= 180; f += 2) {
          const fr = evaluateRig(spec, f);
          for (const id of ["fore-f", "fore-b", "hand-f", "hand-b"]) { const b = fr.bones.get(id)!, m = b.world; expect(Math.max(m.f, m.d * b.length! + m.f), motion + " " + id + "@" + f).toBeLessThan(top); }
        }
      }
    });
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
  it("lies down onto the back, sleeps under a blanket, rolls forward and back, and lifts a box", () => {
    const lie = personRig({ motion: "lie-down", start: 0, end: 240, y: 700 }), f = evaluateRig(lie, 200);
    const pel = f.bones.get("pelvis")!.world, angle = Math.atan2(pel.b, pel.a) * 180 / Math.PI;
    expect(Math.abs(angle + 90)).toBeLessThan(3);
    expect(700 - pel.f).toBeLessThan(12 * 3.6);
    for (const foot of ["foot-f", "foot-b"]) expect(Math.abs(world(lie, foot, 150)[1] - (700 - 3 * 3.6))).toBeLessThan(2.5 * 3.6);
    // Lying and sleeping, the legs lie out straight: thigh and shin nearly in line.
    for (const [spec, k] of [[lie, 200], [personRig({ motion: "sleep", start: 0, end: 240, y: 700 }), 100], [personRig({ motion: "go-to-sleep", start: 0, end: 240, y: 700 }), 230]] as const)
      for (const side of ["f", "b"]) {
        const fr = evaluateRig(spec, k), th = fr.bones.get("thigh-" + side)!.world, sh = fr.bones.get("shin-" + side)!.world;
        const bend = Math.abs(((Math.atan2(sh.b, sh.a) - Math.atan2(th.b, th.a)) * 180 / Math.PI + 540) % 360 - 180);
        expect(bend, `${side} knee at ${k}`).toBeLessThan(8);
      }
    const sleep = personRig({ motion: "sleep", start: 0, end: 240, y: 700 }), sf = evaluateRig(sleep, 60);
    expect(sf.parts.find(p => p.id === "eye")!.variant).toBe("shut");
    expect(sf.parts.some(p => p.id === "blanket")).toBe(true);
    // Waking: asleep and lying at first, sitting up with open eyes at the end; getting up ends standing on the mat.
    const wake = personRig({ motion: "wake-up", start: 0, end: 240, y: 700 }), angleAt = (spec: RigSpec, k: number) => { const m = evaluateRig(spec, k).bones.get("pelvis")!.world; return Math.atan2(m.b, m.a) * 180 / Math.PI; };
    expect(Math.abs(angleAt(wake, 10) + 90)).toBeLessThan(3);
    expect(evaluateRig(wake, 10).parts.find(p => p.id === "eye")!.variant).toBe("shut");
    expect(Math.abs(angleAt(wake, 230))).toBeLessThan(10);
    expect(evaluateRig(wake, 230).parts.find(p => p.id === "eye")!.variant).toBeUndefined();
    const getUp = personRig({ motion: "get-up", start: 0, end: 240, y: 700 });
    expect(Math.abs(angleAt(getUp, 10) + 90)).toBeLessThan(3);
    expect(world(getUp, "pelvis", 230)[1]).toBeLessThan(700 - 42 * 3.6);
    for (const foot of ["foot-f", "foot-b"]) expect(Math.abs(world(getUp, foot, 230)[1] - (700 - (2.4 + 2.4) * 3.6))).toBeLessThan(1.5 * 3.6);
    for (let k = 0; k < 240; k += 2) for (const shin of ["shin-f", "shin-b"]) {
      const b = evaluateRig(getUp, k).bones.get(shin)!, endY = b.world.f + b.world.d * b.length;
      expect(endY, `${shin} above the floor at ${k}`).toBeLessThan(700 + 1);
    }
    const roll = personRig({ motion: "roll", start: 0, end: 240, y: 700 });
    let turned = 0, prev = 0;
    for (let k = 0; k < 240; k++) { const m = evaluateRig(roll, k).bones.get("pelvis")!.world, a = Math.atan2(m.b, m.a) * 180 / Math.PI; if (k) turned += ((a - prev + 540) % 360) - 180; prev = a; }
    expect(Math.abs(turned)).toBeLessThan(40);
    const mid = evaluateRig(roll, 12 + 14 + 6 + 13).bones.get("pelvis")!.world;
    expect(Math.abs(Math.atan2(mid.b, mid.a) * 180 / Math.PI)).toBeGreaterThan(90);
    expect(world(roll, "pelvis", 239)[0]).toBeCloseTo(world(roll, "pelvis", 0)[0], -1);
    const pick = personRig({ motion: "pick-up", start: 0, end: 240, y: 700 });
    expect(700 - world(pick, "box", 120)[1]).toBeGreaterThan(45 * 3.6);
    for (const k of [60, 100, 140]) { const h = world(pick, "hand-f", k), g = world(pick, "box-grip-f", k); expect(Math.hypot(h[0] - g[0], h[1] - g[1]), `box ${k}`).toBeLessThan(2.4 * 3.6); }
  });
  it("draws an arrow from the quiver, draws the bow with the string on the nock, and looses the arrow downrange", () => {
    const spec = personRig({ motion: "archery", start: 0, end: 240, y: 700 }), u = 3.6;
    // Full draw: the string's two segments meet at the draw hand, the bow hand holds the grip.
    const drawn = 8 + 32 + 6 + 12 + 14 + 10;
    const f = evaluateRig(spec, drawn), endOf = (id: string) => { const b = f.bones.get(id)!; return [b.world.e + b.world.c * b.length, b.world.f + b.world.d * b.length]; };
    const hand = world(spec, "hand-f", drawn), up = endOf("string-up"), down = endOf("string-down");
    expect(Math.hypot(up[0] - down[0], up[1] - down[1])).toBeLessThan(.6);
    expect(Math.hypot(up[0] - hand[0], up[1] - hand[1])).toBeLessThan(2.4 * u);
    const grip = world(spec, "bow", drawn), bowHand = world(spec, "hand-b", drawn);
    expect(Math.hypot(grip[0] - bowHand[0], grip[1] - bowHand[1])).toBeLessThan(2.4 * u);
    // Release: the arrow leaves fast along its line.
    const rel = drawn + 12, a0 = world(spec, "arrow", rel + 1)[0], a1 = world(spec, "arrow", rel + 3)[0];
    expect(a1 - a0).toBeGreaterThan(60 * u);
    // Taking an arrow: the hand goes up behind the head to the quiver.
    expect(world(spec, "hand-f", 8 + 12)[1]).toBeLessThan(700 - 80 * u);
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
  it("draws coloured pencil from the CP-F1 surfaces, with marks that change only on the boil step", () => {
    for (const role of RIG_ROLES) expect(PENCIL_ROLE_SURFACE[role], role).toBeDefined();
    const rig = quadrupedRig("horse", { motion: "gallop", start: 0, end: 100, from: 100, to: 700, y: 500 });
    const scene = (frame: number, reducedMotion = false) => renderToStaticMarkup(<RigScene look="pencil" width={800} height={600} ground={500} frame={frame} rigs={[rig]} reducedMotion={reducedMotion} />);
    // The mark tile each part pass uses, in paint order.
    const used = (html: string) => [...html.matchAll(/mask="url\(#[^)]*-pcm-([a-z]+\d-\d)\)"/g)].map(m => m[1]);
    const html = scene(36);
    expect(used(html).length).toBeGreaterThan(30);
    for (const key of new Set(used(html))) expect(html).toContain(`-pcm-${key}"`);
    expect(html).toContain('data-km-pencil-ground=""');
    // Within one boil step (six frames) the marks hold while the horse moves; the next step redraws them.
    expect(used(scene(41))).toEqual(used(html));
    expect(used(scene(42))).not.toEqual(used(html));
    // Reduced motion never boils.
    expect(used(scene(36, true))).toEqual(used(scene(42, true)));
  });
  it("paints the ink look with the INK1 engines, and keeps each part's brushwork fixed to the part", () => {
    const rig = quadrupedRig("horse", { motion: "gallop", start: 0, end: 100, from: 100, to: 700, y: 500 });
    const at = (frame: number) => renderToStaticMarkup(<RigScene look="ink" width={800} height={600} ground={500} frame={frame} rigs={[rig]} />);
    const a = at(30), b = at(31);
    // Wet-paper deposits (raster) and brush polygons, on xuan paper; no SVG filter stands in for the medium.
    expect(a).toContain('data-km-rig-paper="xuan"');
    expect(a).toMatch(/<image href="data:image\/png;base64,/);
    expect(a).not.toMatch(/<filter[^>]*-(bleed|dry|contour)"/);
    // Between frames a part moves (its transform) but its washes, deposits and line shapes do not change.
    const marks = (html: string, id: string) => {
      const m = new RegExp(`data-km-rig-part="${id}" transform="[^"]*"[^>]*>(.*?)</g>`).exec(html)!;
      return m[1].replace(/ opacity="[^"]*"/g, "");
    };
    const moved = (html: string, id: string) => new RegExp(`data-km-rig-part="${id}" transform="([^"]*)"`).exec(html)![1];
    const ids = ["barrel", "head", "neck"].filter(p => a.includes(`data-km-rig-part="${p}"`));
    expect(ids.length).toBeGreaterThanOrEqual(2);
    for (const id of ids) expect(marks(a, id), id).toBe(marks(b, id));
    expect(moved(a, "head")).not.toBe(moved(b, "head"));
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
