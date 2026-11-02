import { describe, expect, it } from "vitest";
import { Group, Quaternion, Vector3 } from "three";
import { contactEventsForBakedAction, sampleBakedPhysicalTrack, validateBakedPhysicalActions } from "../registry/motion/baked-physical-motion";
import { createBakedPhysicalHeroMotion } from "../registry/craft/baked-physical-motion-three";
import type { BakedPhysicalActionSpec } from "../registry/motion/baked-physical-motion";
import type { HeroAsset } from "../registry/craft/hero-asset";

const identity = [0, 0, 0, 1] as const;
const spin180 = [0, 1, 0, 0] as const;
const baked: BakedPhysicalActionSpec = {
  schemaVersion: 1, id: "contact-stack", label: "Offline rigid body contacts", durationFrames: 60,
  tracks: [{ target: "kumiki:fastener:1", keys: [
    { frame: 0, position: [0, 1, 0], rotation: identity },
    { frame: 15, position: [0, 0, 0], rotation: spin180 },
    { frame: 21, position: [0.4, 0.3, 0], rotation: spin180, scale: [1.2, 1, 1] },
    { frame: 60, position: [0.6, 0, 0], rotation: identity },
  ] }],
  contacts: [{ frame: 15.25, target: "kumiki:fastener:1", speedMps: 3.8, material: "metal" },
    { frame: 54, target: "kumiki:fastener:1", speedMps: 0.4 }],
};

function heroWithFastener() {
  const group = new Group(), fastener = new Group();
  fastener.name = "fastener";
  fastener.position.set(.2, .1, .3);
  group.add(fastener);
  let poseCalls: Array<string | null> = [];
  const hero: HeroAsset = {
    id: "baked-test", group, parts: new Map([["kumiki:fastener:1", fastener]]), tier: "hero",
    bounds: { min: [-1, -1, -1], max: [1, 2, 1] }, metersPerUnit: 1,
    craft: { materials: [], details: [] },
    actions: [{ id: "lift", label: "Lift", durationFrames: 60, loop: false, meaning: "Original glTF action" }],
    pose: state => { poseCalls.push(state.id); if (state.id === "lift") fastener.position.x = -2; },
    dispose: () => { group.clear(); },
  };
  return { hero, fastener, getPoseCalls: () => poseCalls, clearCalls: () => { poseCalls = []; } };
}

describe("offline physics bake interchange", () => {
  it("samples arbitrary source frames, linear position and shortest quaternion slerp exactly", () => {
    const track = validateBakedPhysicalActions([baked])[0].tracks[0];
    expect(sampleBakedPhysicalTrack(track, 0).position).toEqual([0, 1, 0]);
    expect(sampleBakedPhysicalTrack(track, 7.5).position[1]).toBeCloseTo(.5);
    const q = new Quaternion(...sampleBakedPhysicalTrack(track, 7.5).rotation);
    expect(q.angleTo(new Quaternion(...identity))).toBeCloseTo(Math.PI / 2);
    expect(sampleBakedPhysicalTrack(track, 500).position[0]).toBeCloseTo(.6);
    expect(sampleBakedPhysicalTrack(track, 21).scale[0]).toBeCloseTo(1.2);
    expect(sampleBakedPhysicalTrack(track, 0)).toEqual(sampleBakedPhysicalTrack(track, 0));
  });

  it("supports stepped collision/discontinuity keys without interpolating across a jump", () => {
    const track = validateBakedPhysicalActions([{ ...baked, tracks: [
      { ...baked.tracks[0], interpolation: "step" },
    ] }])[0].tracks[0];
    expect(sampleBakedPhysicalTrack(track, 14.999).position).toEqual([0, 1, 0]);
    expect(sampleBakedPhysicalTrack(track, 15).position).toEqual([0, 0, 0]);
  });

  it("validates finite, ordered, bounded transforms and rejects unsafe or overlapping targets", () => {
    const invalid = (tracks: unknown) => [{ ...baked, tracks }];
    const key = baked.tracks[0].keys[0];
    expect(() => validateBakedPhysicalActions(invalid([{ target: "../outside", keys: [key] }]))).toThrow(/target/);
    expect(() => validateBakedPhysicalActions(invalid([{ target: "part", keys: [{ ...key, rotation: [0, 0, 0, 0] }] }]))).toThrow(/quaternion/);
    expect(() => validateBakedPhysicalActions(invalid([{ target: "part", keys: [{ ...key, position: [Infinity, 0, 0] }] }]))).toThrow(/position/);
    expect(() => validateBakedPhysicalActions(invalid([{ target: "part", keys: [{ ...key, frame: 2 }, key] }]))).toThrow(/frame/);
    expect(() => validateBakedPhysicalActions(invalid([{ target: "part", keys: [key, key] }]))).toThrow(/increasing/);
    expect(() => validateBakedPhysicalActions(invalid([{ target: "part", keys: [key] }, { target: "part", keys: [key] }]))).toThrow(/duplicate/);
    expect(() => validateBakedPhysicalActions([{ ...baked, contacts: [{ frame: 4, target: "part", speedMps: NaN }] }])).toThrow(/speedMps/);
  });

  it("provides fractional contact cue timing across preview and video FPS", () => {
    const spec = validateBakedPhysicalActions([baked])[0];
    expect(contactEventsForBakedAction(spec)[0]).toMatchObject({ frame: 15.25, timeSeconds: 15.25 / 30, speedMps: 3.8, material: "metal" });
    expect(contactEventsForBakedAction(spec, 60)[0].frame).toBeCloseTo(30.5);
    expect(contactEventsForBakedAction(spec, 60)[0].timeSeconds).toBeCloseTo(15.25 / 30);
  });

  it("binds to a single canonical part and seeks frames out of order without state drift", () => {
    const { hero, fastener } = heroWithFastener();
    const { asset, events } = createBakedPhysicalHeroMotion(hero, [baked], ref => ref === "kumiki:fastener:1" ? [fastener] : []);
    asset.pose({ id: "contact-stack", frame: 30 });
    const later = fastener.position.clone();
    asset.pose({ id: "contact-stack", frame: 6 });
    asset.pose({ id: "contact-stack", frame: 30 });
    expect(fastener.position.distanceTo(later)).toBeLessThan(1e-9);
    expect(events("contact-stack", 60)[0].frame).toBeCloseTo(30.5);
    asset.pose({ id: null, frame: 0 });
    expect(fastener.position.distanceTo(new Vector3(.2, .1, .3))).toBeLessThan(1e-9);
    expect(asset.actions?.map(a => a.id)).toEqual(["lift", "contact-stack"]);
    asset.dispose();
  });

  it("composes an authored glTF action before overriding only baked targets", () => {
    const { hero, fastener, getPoseCalls, clearCalls } = heroWithFastener();
    const plan = { ...baked, sourceActionId: "lift" };
    const { asset } = createBakedPhysicalHeroMotion(hero, [plan], () => [fastener]);
    clearCalls();
    asset.pose({ id: "contact-stack", frame: 15, fps: 30 });
    expect(getPoseCalls()).toEqual(["lift"]);
    expect(fastener.position.x).toBeCloseTo(0);
    expect(fastener.position.y).toBeCloseTo(0);
    asset.dispose();
  });

  it("rejects ambiguous roles, reused source names and missing contacts before playback", () => {
    const { hero, fastener } = heroWithFastener();
    const extra = new Group(); hero.group.add(extra);
    expect(() => createBakedPhysicalHeroMotion(hero, [baked], () => [fastener, extra])).toThrow(/exactly one/);
    expect(() => createBakedPhysicalHeroMotion(hero, [{ ...baked, id: "lift" }], () => [fastener])).toThrow(/conflicts/);
    expect(() => createBakedPhysicalHeroMotion(hero, [{ ...baked, sourceActionId: "missing" }], () => [fastener])).toThrow(/sourceActionId/);
    expect(() => createBakedPhysicalHeroMotion(hero, [baked], ref => ref === "kumiki:fastener:1" ? [] : [fastener])).toThrow(/exactly one/);
  });
});
