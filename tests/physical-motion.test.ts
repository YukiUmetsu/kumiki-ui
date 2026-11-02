import { describe, expect, it } from "vitest";
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
