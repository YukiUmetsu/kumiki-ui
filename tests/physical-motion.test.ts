import { describe, expect, it } from "vitest";
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
  });
});
