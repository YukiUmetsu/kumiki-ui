import { describe, expect, it } from "vitest";
import { compileInteraction, evaluateInteraction } from "../registry/motion/interaction-choreography";
import type { InteractionActor, InteractionSpec, InteractionOp } from "../registry/motion/interaction-choreography";

const actor = { id: "a", position: [0, 0, 0] as const, yaw: 0, height: .2,
  effectors: { hand: { rest: [.05, .03, .02] as const, shoulder: [.05, .12, .02] as const, reach: .2 } } };
const paper = { id: "paper", position: [.12, .0, .05] as const, grips: { edge: [-.02, .002, 0] as const }, bendable: true };

const spec = (ops: InteractionOp[], over: Partial<InteractionSpec> = {}): InteractionSpec => ({
  schemaVersion: 1, durationFrames: 120, fps: { num: 30, den: 1 }, timing: "natural",
  actors: [actor], objects: [paper], ops, ...over,
});
const grasp: InteractionOp = { kind: "grasp", actor: "a", effector: "hand", object: "paper", grip: "edge", startFrame: 10, contactFrame: 30 };
const carry: InteractionOp = { kind: "carry", actor: "a", effector: "hand", object: "paper", to: [.1, .08, .06], startFrame: 34, endFrame: 60 };
const place: InteractionOp = { kind: "place", actor: "a", effector: "hand", object: "paper", to: [.14, 0, .04], startFrame: 64, contactFrame: 84 };
const release: InteractionOp = { kind: "release", actor: "a", effector: "hand", startFrame: 88, endFrame: 108 };
const story = [grasp, carry, place, release];
const distance = (a: readonly number[], b: readonly number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

function ok(input: InteractionSpec) {
  const result = compileInteraction(input);
  if (!result.ok) throw new Error(JSON.stringify(result.diagnostics));
  return result.plan;
}
const codes = (input: InteractionSpec) => {
  const result = compileInteraction(input);
  return result.ok ? [] : result.diagnostics.map(item => item.code);
};

describe("interaction choreography", () => {
  it("returns the same state for shuffled and linear seeks", () => {
    const plan = ok(spec(story));
    const linear = Array.from({ length: 120 }, (_, frame) => evaluateInteraction(plan, frame));
    for (const frame of [80, 4, 80, 119, 0, 33]) expect(evaluateInteraction(plan, frame)).toEqual(linear[frame]);
  });

  it("keeps the object still until the hand arrives, with no jump at grasp or release", () => {
    const plan = ok(spec(story));
    expect(evaluateInteraction(plan, 29).objects.paper.position).toEqual(paper.position);
    for (let frame = 1; frame < 120; frame++) {
      const step = distance(evaluateInteraction(plan, frame - 1).objects.paper.position,
        evaluateInteraction(plan, frame).objects.paper.position);
      expect(step, `frame ${frame}`).toBeLessThan(.012);
    }
  });

  it("holds the grip on the hand for every held frame", () => {
    const plan = ok(spec(story));
    for (let frame = 30; frame < 84; frame++) {
      const state = evaluateInteraction(plan, frame);
      const grip = state.grips.paper;
      expect(grip, `frame ${frame}`).toBeDefined();
      expect(distance(grip!, state.effectors["a.hand"].position), `frame ${frame}`).toBeLessThan(1e-9);
    }
  });

  it("arcs across a surface but not on a move straight down", () => {
    const down = ok(spec([grasp, { ...carry, to: [.12, .1, .05], startFrame: 34, endFrame: 50 } as InteractionOp,
      { ...carry, to: [.12, .03, .05], startFrame: 54, endFrame: 80 } as InteractionOp]));
    const high = Math.max(...[60, 64, 68, 72].map(frame => evaluateInteraction(down, frame).objects.paper.position[1]));
    expect(high).toBeLessThanOrEqual(evaluateInteraction(down, 54).objects.paper.position[1] + .004);
  });

  it("marks an effector as holding only between its contacts", () => {
    const plan = ok(spec(story));
    expect(evaluateInteraction(plan, 29).effectors["a.hand"].holding).toBe(false);
    expect(evaluateInteraction(plan, 30).effectors["a.hand"].holding).toBe(true);
    expect(evaluateInteraction(plan, 83).effectors["a.hand"].holding).toBe(true);
    expect(evaluateInteraction(plan, 84).effectors["a.hand"].holding).toBe(false);
  });

  it("settles the object exactly where it was placed and leaves it there", () => {
    const plan = ok(spec(story));
    expect(evaluateInteraction(plan, 84).objects.paper.position).toEqual([.14, 0, .04]);
    expect(evaluateInteraction(plan, 119).objects.paper.position).toEqual([.14, 0, .04]);
  });

  it("blends full IK during contact and back to the animated arm afterwards", () => {
    const plan = ok(spec(story));
    expect(evaluateInteraction(plan, 0).effectors["a.hand"].influence).toBe(0);
    expect(evaluateInteraction(plan, 30).effectors["a.hand"].influence).toBe(1);
    expect(evaluateInteraction(plan, 84).effectors["a.hand"].influence).toBe(1);
    expect(evaluateInteraction(plan, 110).effectors["a.hand"].influence).toBe(0);
  });

  it("moves gaze before the hand", () => {
    const plan = ok(spec(story));
    expect(Math.abs(evaluateInteraction(plan, 9).actors.a.turn.yaw)).toBeGreaterThan(.5);
    const hand = (frame: number) => evaluateInteraction(plan, frame).effectors["a.hand"].position;
    expect(distance(hand(0), hand(9))).toBeLessThan(1e-9);
  });

  it("clamps a head turn to the actor's limit", () => {
    const plan = ok(spec([{ kind: "look", actor: "a", at: { point: [-1, 0, -.1] }, startFrame: 0, endFrame: 119 }],
      { maxHeadTurn: 20 }));
    expect(Math.abs(evaluateInteraction(plan, 100).actors.a.turn.yaw)).toBeLessThanOrEqual(20.001);
  });

  it("carries a held object with a walking actor", () => {
    const plan = ok(spec([grasp, { kind: "move", actor: "a", to: [.1, 0, 0], startFrame: 40, endFrame: 90 }]));
    const before = evaluateInteraction(plan, 35).objects.paper.position, after = evaluateInteraction(plan, 100).objects.paper.position;
    expect(after[0] - before[0]).toBeCloseTo(.1, 5);
  });

  it("keeps a release within reach while the actor walks away", () => {
    const stepAway: InteractionOp = { kind: "move", actor: "a", to: [-.4, 0, 0], startFrame: 86, endFrame: 112 };
    const plan = ok(spec([grasp, carry, place, release, stepAway]));
    const shoulder = (frame: number) => { const root = evaluateInteraction(plan, frame).actors.a.position; return [root[0] + .05, root[1] + .12, root[2] + .02]; };
    for (let frame = 84; frame <= 108; frame++)
      expect(distance(evaluateInteraction(plan, frame).effectors["a.hand"].position, shoulder(frame)), `frame ${frame}`).toBeLessThan(.2);
  });

  it("flexes a bendable object while it moves and settles after", () => {
    const plan = ok(spec(story));
    const peak = Math.max(...Array.from({ length: 120 }, (_, frame) => Math.abs(evaluateInteraction(plan, frame).objects.paper.bend)));
    expect(peak).toBeGreaterThan(.01);
    expect(peak).toBeLessThanOrEqual(.22);
    expect(Math.abs(evaluateInteraction(plan, 119).objects.paper.bend)).toBeLessThan(.01);
  });

  it("changes pacing with the timing preset, not the outcome", () => {
    const calm = ok(spec(story, { timing: "restrained" })), bold = ok(spec(story, { timing: "expressive" }));
    expect(evaluateInteraction(calm, 20).effectors["a.hand"].position).not.toEqual(evaluateInteraction(bold, 20).effectors["a.hand"].position);
    expect(evaluateInteraction(calm, 119).objects.paper.position).toEqual(evaluateInteraction(bold, 119).objects.paper.position);
  });

  it("reports each contact with its frame", () => {
    expect(ok(spec(story)).contacts).toEqual([
      { frame: 30, kind: "grasp", actor: "a", effector: "hand", object: "paper" },
      { frame: 84, kind: "place", actor: "a", effector: "hand", object: "paper" },
    ]);
  });

  describe("letting go above a surface", () => {
    const drop: InteractionOp = { ...place, releaseHeight: .03, fallFrames: 8 } as InteractionOp;
    const plan = () => ok(spec([grasp, carry, drop, { ...release, startFrame: 96, endFrame: 110 }]));
    it("stops the hand above the surface and lets the object fall to its exact place", () => {
      const state = evaluateInteraction(plan(), 84);
      expect(state.effectors["a.hand"].position[1]).toBeGreaterThan(.029);
      expect(evaluateInteraction(plan(), 92).objects.paper.position).toEqual([.14, 0, .04]);
      expect(evaluateInteraction(plan(), 119).objects.paper.position).toEqual([.14, 0, .04]);
    });
    it("falls with no jump, faster near the end", () => {
      const heights = [84, 85, 86, 87, 88, 89, 90, 91, 92].map(frame => evaluateInteraction(plan(), frame).objects.paper.position[1]);
      for (let i = 1; i < heights.length; i++) expect(heights[i]).toBeLessThanOrEqual(heights[i - 1]);
      expect(heights[1] - heights[0]).toBeGreaterThan(-.003);
      expect(heights[8] - heights[7]).toBeLessThan(-.005);
    });
    it("reports contact when the object lands, for sound", () => {
      expect(plan().contacts.find(item => item.kind === "place")?.frame).toBe(92);
    });
    it("flattens toward its resting tilt on the way down", () => {
      const held = ok(spec([grasp, { ...carry, toPitch: 1 } as InteractionOp, drop]));
      expect(evaluateInteraction(held, 84).objects.paper.pitch).toBeCloseTo(0, 5);
    });
    it("rejects a landing past the end of the shot", () => {
      expect(codes(spec([grasp, carry, { ...drop, contactFrame: 115 } as InteractionOp]))).toContain("frame-range");
    });
    it("checks reach at the release point, not at the surface", () => {
      const low: InteractionActor = { ...actor, effectors: { hand: { rest: [.05, .03, .02], shoulder: [.05, .12, .02], reach: .11 } } };
      const nearby = [{ ...paper, position: [.1, .03, .05] as const }];
      expect(codes(spec([grasp, carry, { ...place, to: [.1, 0, .05] } as InteractionOp], { actors: [low], objects: nearby }))).toContain("out-of-reach");
      expect(codes(spec([grasp, carry, { ...place, to: [.1, 0, .05], releaseHeight: .05 } as InteractionOp], { actors: [low], objects: nearby }))).toEqual([]);
    });
  });

  describe("rejections", () => {
    it("names unknown actors, effectors, objects and grips", () => {
      expect(codes(spec([{ ...grasp, actor: "x" } as InteractionOp]))).toContain("unknown-actor");
      expect(codes(spec([{ ...grasp, effector: "x" } as InteractionOp]))).toContain("unknown-effector");
      expect(codes(spec([{ ...grasp, object: "x" } as InteractionOp]))).toContain("unknown-object");
      expect(codes(spec([{ ...grasp, grip: "x" } as InteractionOp]))).toContain("unknown-grip");
    });
    it("rejects place or carry without a held object", () => {
      expect(codes(spec([place]))).toContain("object-not-held");
      expect(codes(spec([carry]))).toContain("object-not-held");
    });
    it("rejects a second hand grabbing a held object", () => {
      const other = { ...actor, id: "b", position: [.2, 0, 0] as const };
      expect(codes(spec([grasp, { ...grasp, actor: "b", startFrame: 40, contactFrame: 50 } as InteractionOp], { actors: [actor, other] })))
        .toContain("object-already-held");
    });
    it("rejects overlapping work on one effector", () => {
      expect(codes(spec([grasp, { ...carry, startFrame: 20 } as InteractionOp]))).toContain("effector-busy");
    });
    it("rejects a target outside the arm's reach", () => {
      expect(codes(spec([grasp], { objects: [{ ...paper, position: [2, 0, 0] }] }))).toContain("out-of-reach");
    });
    it("checks reach on a walking actor's real path", () => {
      const walkAway: InteractionOp = { kind: "move", actor: "a", to: [-1, 0, 0], startFrame: 34, endFrame: 80 };
      const follow: InteractionOp = { ...carry, to: [-.9, .08, .06], startFrame: 82, endFrame: 100 } as InteractionOp;
      expect(codes(spec([grasp, walkAway, follow]))).toEqual([]);
      const hold: InteractionOp = { ...carry, to: [.1, .08, .06], startFrame: 34, endFrame: 80 } as InteractionOp;
      expect(codes(spec([grasp, walkAway, hold]))).toContain("out-of-reach");
    });
    it("rejects frames outside the shot", () => {
      expect(codes(spec([{ ...release, startFrame: 110, endFrame: 500 } as InteractionOp]))).toContain("frame-range");
    });
  });
});
