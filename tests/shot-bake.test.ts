import { describe, expect, it } from "vitest";
import { evaluateCharacter } from "../registry/character/evaluate";
import { compileInteraction } from "../registry/motion/interaction-choreography";
import { bakeShot, interactionCameraTargets, parseShotBake, serializeShotBake } from "../registry/motion/shot-bake";
import type { InteractionSpec } from "../registry/motion/interaction-choreography";
import { doctorQuillCharacter } from "../src/character/fixtures/doctor-quill";
import type { CameraSequenceSpec } from "../registry/motion/cinematic-camera-types";

const definition = doctorQuillCharacter;

const interaction: InteractionSpec = {
  schemaVersion: 1, durationFrames: 60, fps: { num: 30, den: 1 },
  actors: [{ id: "a", position: [0, 0, 0], yaw: 0, height: .2,
    effectors: { hand: { rest: [.05, .03, .02], shoulder: [.05, .12, .02], reach: .2 } } }],
  objects: [{ id: "paper", position: [.12, 0, .05], grips: { edge: [-.02, .002, 0] }, bendable: true }],
  ops: [
    { kind: "grasp", actor: "a", effector: "hand", object: "paper", grip: "edge", startFrame: 5, contactFrame: 20 },
    { kind: "carry", actor: "a", effector: "hand", object: "paper", to: [.05, .1, .08], startFrame: 22, endFrame: 45 },
  ],
};
const compiled = () => {
  const result = compileInteraction(interaction);
  if (!result.ok) throw new Error(JSON.stringify(result.diagnostics));
  return result.plan;
};
const camera: CameraSequenceSpec = {
  schemaVersion: 1, id: "c", title: "Shot", fps: { num: 30, den: 1 }, durationFrames: 60,
  output: { width: 1920, height: 1080 },
  shots: [{ id: "track", type: "follow", target: "paper", durationFrames: 60, framing: "medium" }],
};
const input = () => ({
  id: "s", width: 1920, height: 1080, interaction: compiled(), camera,
  actors: [{ id: "a", definition, instance: { instanceId: "a", characterId: "doctor-quill", revision: "r2", seed: 3 }, cues: [], headPart: "head" }],
  lights: { key: [{ frame: 0, level: 1 }, { frame: 30, level: .5 }] },
});
function bake() {
  const result = bakeShot(input());
  if (!result.ok) throw new Error(JSON.stringify(result.diagnostics));
  return result.bake;
}

describe("shot bake", () => {
  it("writes one entry per frame in every channel", () => {
    const shot = bake();
    expect(shot.duration_frames).toBe(60);
    for (const channel of [shot.camera.position, shot.camera.orientation, shot.camera.fov, shot.camera.focus_distance,
      shot.objects.paper.position, shot.objects.paper.orientation, shot.objects.paper.bend,
      shot.actors.a.parts, shot.actors.a.root.position, shot.actors.a.effectors.hand.position, shot.lights.key])
      expect(channel).toHaveLength(60);
  });

  it("keeps contact events and rational fps", () => {
    const shot = bake();
    expect(shot.fps).toEqual({ num: 30, den: 1 });
    expect(shot.contacts).toEqual([{ frame: 20, kind: "grasp", actor: "a", effector: "hand", object: "paper" }]);
  });

  it("passes Kumiki character state through and adds the head turn", () => {
    const shot = bake();
    const direct = evaluateCharacter(definition, input().actors[0].instance, [], 20).parts.body;
    expect(shot.actors.a.parts[20].body.rotation).toBe(direct.rotation);
    expect(shot.actors.a.parts[20].body.x).toBe(direct.x);
    expect(Math.abs(shot.actors.a.parts[20].head.yaw ?? 0)).toBeGreaterThan(1);
    expect(shot.actors.a.parts[20].body.yaw).toBeUndefined();
  });

  it("takes a held limb out of animated gestures", () => {
    const cues = [{ id: "open", instanceId: "a", kind: "action" as const, startFrame: 22, name: "wing-curl" }];
    const free = bakeShot({ ...input(), actors: [{ ...input().actors[0], cues }] });
    const held = bakeShot({ ...input(), actors: [{ ...input().actors[0], cues, limbs: { hand: "wing-right" } }] });
    if (!free.ok || !held.ok) throw new Error("bake failed");
    const rest = evaluateCharacter(definition, input().actors[0].instance, [], 0).parts["wing-right"];
    const moved = (bake: typeof free.bake) => Math.max(...bake.actors.a.parts.map(part => Math.abs(part["wing-right"].rotation - rest.rotation)));
    const heldFrames = held.bake.actors.a.parts.slice(25);
    expect(moved(free.bake)).toBeGreaterThan(1);
    for (const part of heldFrames) expect(part["wing-right"].rotation).toBeCloseTo(rest.rotation, 6);
  });

  it("eases light levels between keys", () => {
    const shot = bake();
    expect(shot.lights.key[0]).toBe(1);
    expect(shot.lights.key[15]).toBeCloseTo(.75, 5);
    expect(shot.lights.key[59]).toBe(.5);
  });

  it("makes the camera track a carried object", () => {
    const targets = interactionCameraTargets(compiled());
    const paper = targets.find(target => target.id === "paper")!;
    expect(paper.frames).toHaveLength(60);
    expect(paper.frames[50].bounds.max[1]).toBeGreaterThan(paper.frames[0].bounds.max[1]);
    const shot = bake();
    const look = (frame: number) => shot.camera.position[frame][1];
    expect(look(55)).toBeGreaterThan(look(5));
  });

  it("round trips through JSON byte for byte", () => {
    const json = serializeShotBake(bake());
    expect(serializeShotBake(parseShotBake(json))).toBe(json);
  });

  it("is deterministic", () => {
    expect(serializeShotBake(bake())).toBe(serializeShotBake(bake()));
  });

  it("rejects a camera that disagrees with the shot length", () => {
    const result = bakeShot({ ...input(), camera: { ...camera, durationFrames: 30, shots: [{ ...camera.shots[0], durationFrames: 30 }] } });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.diagnostics[0].code).toBe("duration-mismatch");
  });

  it("rejects an actor missing from the interaction", () => {
    const result = bakeShot({ ...input(), actors: [{ ...input().actors[0], id: "ghost" }] });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.diagnostics[0].code).toBe("unknown-actor");
  });
});
