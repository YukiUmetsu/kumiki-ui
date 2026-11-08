import { describe, expect, it } from "vitest";
import { compileEffect, evaluateEffect, heatColor, sampleShapeTargets } from "../registry/visual/environmental-effects";
import { PARTICLE_GUIDE } from "../registry/visual/particle-guide";
import { PARTICLE_MOMENTS, assembleIntoMark, embersRising, firefliesAtDusk, lensBokeh, motesInTheLight, particleFlow, sparksOnImpact } from "../registry/visual/particle-moments";
import { Group, Mesh, MeshStandardMaterial, Quaternion, SphereGeometry, Vector3 } from "three";
import { createPhysicalHeroMotion } from "../registry/craft/physical-motion-three";
import type { HeroAsset } from "../registry/craft/hero-asset";
import {
  impactEventsForPhysicalAction, samplePhysicalMotion, validatePhysicalActionSpecs,
} from "../registry/motion/physical-motion";

const drop = { kind: "drop" as const, target: "hardware", height: 0.9, restitution: 0.5, gravity: 10 };

describe("frame-independent physically grounded motion", () => {
  it("solves gravity and successive restitution impacts without delta-time integration", () => {
    const action = validatePhysicalActionSpecs([{ schemaVersion: 1, id: "fall", durationFrames: 120, motions: [drop] }])[0];
    const events = impactEventsForPhysicalAction(action);
    const first = Math.sqrt(2 * drop.height / drop.gravity);
    expect(events[0].timeSeconds).toBeCloseTo(first);
    expect(events[0].speedMps).toBeCloseTo(Math.sqrt(2 * drop.height * drop.gravity));
    expect(events[1].timeSeconds - events[0].timeSeconds).toBeCloseTo(2 * events[0].speedMps * drop.restitution / drop.gravity);
    expect(samplePhysicalMotion(drop, 0).translation).toEqual([0, drop.height, 0]);
    expect(samplePhysicalMotion(drop, first).translation[1]).toBeCloseTo(0);
    const halfBounce = first + events[0].speedMps * drop.restitution / drop.gravity;
    expect(samplePhysicalMotion(drop, halfBounce).translation[1]).toBeCloseTo(0.225);
    expect(samplePhysicalMotion(drop, 20).translation[1]).toBe(0);
    expect(samplePhysicalMotion(drop, halfBounce)).toEqual(samplePhysicalMotion(drop, halfBounce));
  });

  it("uses the existing analytic mass-spring response and small-angle gravitational pendulum", () => {
    const spring = { kind: "spring" as const, target: "shade", offset: [0, 0.5, 0] as const, mass: 2,
      stiffness: 80, damping: 15 };
    const pendulum = { kind: "pendulum" as const, target: ["arm", "shade"], axis: [0, 0, 1] as const,
      pivot: "joint", angleDeg: 20, lengthMeters: 0.6, dampingRatio: 0.1 };
    expect(samplePhysicalMotion(spring, 0).translation[1]).toBeCloseTo(0.5);
    expect(Math.abs(samplePhysicalMotion(spring, 4).translation[1])).toBeLessThan(0.01);
    expect(samplePhysicalMotion(pendulum, 0).angleRad).toBeCloseTo(20 * Math.PI / 180);
    expect(Math.abs(samplePhysicalMotion(pendulum, 8).angleRad)).toBeLessThan(0.1);
    expect(samplePhysicalMotion(pendulum, 0).translation).toEqual([0, 0, 0]);
  });

  it("decelerates spin through viscous angular drag, with an exact zero-drag limit", () => {
    const spin = { kind: "spin" as const, target: "wheel", axis: [0, 1, 0] as const,
      angularVelocityDegPerSec: 180, drag: 2 };
    const zero = { ...spin, drag: 0 };
    expect(samplePhysicalMotion(spin, 0).angleRad).toBe(0);
    expect(samplePhysicalMotion(spin, 1).angleRad).toBeCloseTo(Math.PI / 2 * (1 - Math.exp(-2)));
    expect(samplePhysicalMotion(zero, 1).angleRad).toBeCloseTo(Math.PI);
  });

  it("slides with Coulomb friction to a finite resting distance independent of frame sampling", () => {
    const slide = validatePhysicalActionSpecs([{ schemaVersion: 1, id: "table-slide", durationFrames: 120,
      motions: [{ kind: "slide", target: "crate", direction: [3, 0, 4], speedMps: 2,
        frictionCoefficient: .4, gravity: 10, startFrame: 15 }] }])[0].motions[0];
    const stop = .5; // initial speed / (friction coefficient × gravity)
    const restDistance = .5; // initial speed squared / (2 × deceleration)
    expect(samplePhysicalMotion(slide, .4).translation).toEqual([0, 0, 0]);
    expect(samplePhysicalMotion(slide, .5 + stop).translation[0]).toBeCloseTo(restDistance * .6);
    expect(samplePhysicalMotion(slide, 3).translation[2]).toBeCloseTo(restDistance * .8);
    expect(samplePhysicalMotion(slide, 8)).toEqual(samplePhysicalMotion(slide, 3));
    expect(samplePhysicalMotion(slide, .5 + stop / 2).translation[0]).toBeCloseTo(.6 * .375);
    const frictionless = { ...slide, frictionCoefficient: 0 } as typeof slide;
    expect(samplePhysicalMotion(frictionless, 1.5).translation[0]).toBeCloseTo(1.2);
  });

  it("rolls without slipping on the XZ plane, respecting rotated glTF parents and backward scrubs", () => {
    const roll = validatePhysicalActionSpecs([{ schemaVersion: 1, id: "roll-ball", durationFrames: 90,
      motions: [{ kind: "roll", target: "ball", direction: [1, 0, 0], speedMps: 1,
        radiusMeters: .2, rollingResistance: .1, gravity: 10 }] }])[0].motions[0];
    const atHalf = samplePhysicalMotion(roll, .5), distance = .375;
    expect(atHalf.translation).toEqual([distance, 0, 0]);
    expect(atHalf.angleRad).toBeCloseTo(distance / .2);
    expect(samplePhysicalMotion(roll, 5).translation[0]).toBeCloseTo(.5);
    const root = new Group(), parent = new Group();
    parent.rotation.y = Math.PI / 3;
    const ball = new Mesh(new SphereGeometry(.2), new MeshStandardMaterial());
    ball.position.y = .2;
    parent.add(ball); root.add(parent);
    const hero: HeroAsset = { id: "roll-test", group: root, bounds: { min: [-1, 0, -1], max: [1, 1, 1] },
      parts: new Map([["ball", ball]]), tier: "supporting", craft: { materials: [], details: [] },
      metersPerUnit: 1, dispose: () => { ball.geometry.dispose(); (ball.material as MeshStandardMaterial).dispose(); } };
    const { asset } = createPhysicalHeroMotion(hero,
      [{ schemaVersion: 1, id: "roll-ball", durationFrames: 90, motions: [roll] }],
      id => id === "ball" ? [ball] : []);
    const start = ball.getWorldPosition(new Vector3());
    asset.pose({ id: "roll-ball", frame: 15 });
    expect(ball.getWorldPosition(new Vector3()).distanceTo(start.clone().add(new Vector3(distance, 0, 0)))).toBeLessThan(1e-5);
    const expectedWorld = new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), distance / .2)
      .multiply(parent.getWorldQuaternion(new Quaternion()));
    expect(ball.getWorldQuaternion(new Quaternion()).angleTo(expectedWorld)).toBeLessThan(1e-5);
    asset.pose({ id: "roll-ball", frame: 30 });
    asset.pose({ id: "roll-ball", frame: 15 });
    expect(ball.getWorldPosition(new Vector3()).distanceTo(start.clone().add(new Vector3(distance, 0, 0)))).toBeLessThan(1e-5);
    asset.pose({ id: null, frame: 0 });
    expect(ball.getWorldPosition(new Vector3()).distanceTo(start)).toBeLessThan(1e-5);
    asset.dispose();
  });

  it("validates physical units, identifiers, source actions and limits before binding", () => {
    const valid = [{ schemaVersion: 1, id: "swing", durationFrames: 90, sourceActionId: "lift", motions: [
      { kind: "pendulum", target: ["arm", "shade"], pivot: "joint", axis: [0, 0, 1], angleDeg: 12, lengthMeters: 0.8 },
    ] }];
    expect(validatePhysicalActionSpecs(valid)[0].sourceActionId).toBe("lift");
    expect(() => validatePhysicalActionSpecs([{ ...valid[0], motions: [{ ...drop, gravity: -9.81 }] }])).toThrow(/gravity/);
    expect(() => validatePhysicalActionSpecs([{ ...valid[0], motions: [{ ...drop, restitution: 1.1 }] }])).toThrow(/restitution/);
    expect(() => validatePhysicalActionSpecs([{ ...valid[0], motions: [{ ...drop, height: Infinity }] }])).toThrow(/height/);
    expect(() => validatePhysicalActionSpecs([{ ...valid[0], motions: [{ ...drop, target: "../escape" }] }])).toThrow(/target/);
    expect(() => validatePhysicalActionSpecs([{ ...valid[0], durationFrames: 90.5 }])).toThrow(/integer/);
    expect(() => validatePhysicalActionSpecs([valid[0], valid[0]])).toThrow(/duplicate/i);
    for (const kind of ["slide", "roll"] as const) {
      const motion = { kind, target: "body", direction: [1, .5, 0], speedMps: 1, radiusMeters: .2 };
      expect(() => validatePhysicalActionSpecs([{ ...valid[0], motions: [motion] }])).toThrow(/horizontal/);
      expect(() => validatePhysicalActionSpecs([{ ...valid[0], motions: [{ ...motion, direction: [0, 0, 0] }] }])).toThrow(/zero/);
      expect(() => validatePhysicalActionSpecs([{ ...valid[0], motions: [{ ...motion, direction: [1, 0, 0], speedMps: -1 }] }])).toThrow(/speedMps/);
    }
    expect(() => validatePhysicalActionSpecs([{ ...valid[0], motions: [
      { kind: "slide", target: "body", direction: [1, 0, 0], speedMps: 1, frictionCoefficient: -1 },
    ] }])).toThrow(/frictionCoefficient/);
    expect(() => validatePhysicalActionSpecs([{ ...valid[0], motions: [
      { kind: "roll", target: "body", direction: [1, 0, 0], speedMps: 1, radiusMeters: 0 },
    ] }])).toThrow(/radiusMeters/);
  });
});

describe("cinematic particles", () => {
  const region = { min: [-1, -1, -1] as const, max: [1, 1, 1] as const };
  it("gives the same particles at a frame however it is reached", () => {
    for (const kind of ["embers", "bokeh", "motes", "fireflies"] as const) {
      const plan = compileEffect({ id: kind, kind, region, seed: 3 });
      const direct = evaluateEffect(plan, 87);
      evaluateEffect(plan, 12); evaluateEffect(plan, 140);
      expect(evaluateEffect(plan, 87).positions).toEqual(direct.positions);
      expect(direct.positions.every(Number.isFinite)).toBe(true);
    }
  });
  it("throws sparks from the burst frame, pulls them down, bounces them off the floor, and lets them die", () => {
    const plan = compileEffect({ id: "s", kind: "sparks", burst: { frame: 10, origin: [0, 0, 0], direction: [0, 1, 0], spread: .4, speed: .2, gravity: .01, life: 30 }, floorY: -.5, budget: 40, intensity: 1, seed: 2 });
    expect(evaluateEffect(plan, 5).alphas.every(a => a === 0)).toBe(true);
    const early = evaluateEffect(plan, 14), late = evaluateEffect(plan, 32);
    const meanY = (positions: Float32Array) => { let y = 0; for (let i = 1; i < positions.length; i += 3) y += positions[i]; return y / (positions.length / 3); };
    expect(meanY(early.positions)).toBeGreaterThan(0);
    for (let i = 1; i < late.positions.length; i += 3) expect(late.positions[i]).toBeGreaterThanOrEqual(-.5 - 1e-6);
    expect(evaluateEffect(plan, 60).alphas.every(a => a === 0)).toBe(true);
    // Heat falls as a spark ages.
    expect(Math.max(...late.heats!)).toBeLessThan(Math.max(...early.heats!));
    expect(() => compileEffect({ id: "x", kind: "sparks" })).toThrow(/burst/);
  });
  it("lights motes only inside their beam", () => {
    const plan = compileEffect({ id: "m", kind: "motes", region: { min: [-2, -2, -2], max: [2, 2, 2] }, budget: 600, intensity: 1, seed: 5, beam: { origin: [-3, 0, 0], direction: [1, 0, 0], angle: .15 } });
    const f = evaluateEffect(plan, 40);
    let inside = 0, outside = 0, ni = 0, no = 0;
    for (let i = 0; i < f.count; i++) {
      const y = f.positions[i * 3 + 1], z = f.positions[i * 3 + 2], x = f.positions[i * 3], r = Math.hypot(y, z), radius = (x + 3) * Math.tan(.15);
      if (r < radius * .5) { inside += f.alphas[i]; ni += 1; } else if (r > radius * 1.5) { outside += f.alphas[i]; no += 1; }
    }
    expect(inside / ni).toBeGreaterThan(5 * (outside / no));
  });
  it("cools embers and sparks from white to red", () => {
    const [hr, hg, hb] = heatColor(1), [cr, cg, cb] = heatColor(0);
    expect(hb).toBeGreaterThan(.8);
    expect(cr).toBeGreaterThan(cg + cb);
    expect(heatColor(.5)).toEqual(heatColor(.5));
    expect(hr + hg + hb).toBeGreaterThan(cr + cg + cb);
  });
});

describe("particles as a catalog", () => {
  const codes = (plan: ReturnType<typeof compileEffect>) => plan.diagnostics.filter(d => d.severity !== "info").map(d => d.code);
  it("forms a shape from a silhouette, holds it, and breaks it apart when dissolving", () => {
    const w = 20, h = 20, pixels = new Uint8ClampedArray(w * h * 4);
    for (let y = 5; y < 15; y++) for (let x = 5; x < 15; x++) pixels[(y * w + x) * 4 + 3] = 255;
    const targets = sampleShapeTargets(pixels, w, h, 400, { width: 2 });
    expect(targets.length).toBe(100);
    expect(targets.every(([x, y]) => Math.abs(x) <= .55 && Math.abs(y) <= .55)).toBe(true);
    const plan = compileEffect({ id: "a", kind: "assemble", assemble: { targets, startFrame: 0, endFrame: 60 }, seed: 1 });
    const done = evaluateEffect(plan, 70);
    for (let i = 0; i < targets.length; i++) expect(Math.hypot(done.positions[i * 3] - targets[i][0], done.positions[i * 3 + 1] - targets[i][1])).toBeLessThan(.01);
    const gone = evaluateEffect(compileEffect({ id: "d", kind: "assemble", assemble: { targets, startFrame: 0, endFrame: 60, dissolve: true }, seed: 1 }), 70);
    expect(Math.max(...gone.alphas)).toBeLessThan(.05);
  });
  it("streams flow along its path, from source to destination", () => {
    const plan = compileEffect({ id: "f", kind: "flow", flow: { path: [[-2, 0, 0], [2, 0, 0]], spread: 0 }, budget: 50, intensity: 1, seed: 2 });
    const a = evaluateEffect(plan, 10), b = evaluateEffect(plan, 20);
    for (let i = 0; i < a.count; i++) { expect(Math.abs(a.positions[i * 3 + 1])).toBeLessThan(1e-6); expect(a.positions[i * 3]).toBeGreaterThanOrEqual(-2); expect(a.positions[i * 3]).toBeLessThanOrEqual(2); }
    let forward = 0;
    for (let i = 0; i < a.count; i++) if (b.positions[i * 3] > a.positions[i * 3]) forward++;
    expect(forward).toBeGreaterThan(a.count * .8);
  });
  it("warns about the misuses film work avoids", () => {
    const region = { min: [-1, -1, -1] as const, max: [1, 1, 1] as const };
    expect(codes(compileEffect({ id: "m", kind: "motes", region }))).toContain("particle-unmotivated");
    expect(codes(compileEffect({ id: "m", kind: "motes", region, beam: { origin: [-2, 0, 0], direction: [1, 0, 0], angle: .3 } }))).toEqual([]);
    expect(codes(compileEffect({ id: "f", kind: "fireflies", region, budget: 400, intensity: 1 }))).toContain("particle-soup");
    expect(codes(compileEffect({ id: "s", kind: "sparks", burst: { frame: 0, origin: [0, 0, 0], life: 200 } }))).toContain("particle-sparks-linger");
    expect(codes(compileEffect({ id: "e", kind: "embers", region, job: "data" }))).toContain("particle-job");
    expect(codes(compileEffect({ id: "t", kind: "assemble", assemble: { targets: [[0, 0, 0]], startFrame: 0, endFrame: 10 } }))).toEqual(expect.arrayContaining(["particle-shape-thin", "particle-too-fast"]));
    expect(compileEffect({ id: "p", kind: "flow", flow: { path: [[0, 0, 0], [1, 0, 0]] } }).diagnostics.map(d => d.code)).toContain("particle-approximate");
  });
  it("builds every moment so it follows its own guide", () => {
    const targets = Array.from({ length: 800 }, (_, i) => [Math.cos(i), Math.sin(i), 0] as [number, number, number]);
    const built = [motesInTheLight(), embersRising(), sparksOnImpact(), lensBokeh(), firefliesAtDusk(), assembleIntoMark({ targets }), particleFlow()];
    expect(new Set(built.flatMap(moment => moment.specs.map(spec => spec.kind)))).toEqual(new Set([...PARTICLE_MOMENTS.map(moment => moment.kind), "bokeh"]));
    for (const moment of built) for (const spec of moment.specs) {
      expect(codes(compileEffect(spec))).toEqual([]);
      expect(PARTICLE_GUIDE[spec.kind]!.jobs).toContain(spec.job);
    }
    for (const moment of PARTICLE_MOMENTS) expect(PARTICLE_GUIDE[moment.kind]!.jobs).toContain(moment.job);
  });
});
