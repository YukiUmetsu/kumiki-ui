import { describe, expect, it } from "vitest";
import { compileObjectStory, evaluateObjectStory } from "../registry/video/object-story";
import type { ObjectStoryBeat, ObjectStorySpec } from "../registry/video/object-story";

/** Latin average width; enough for layout decisions in tests. */
const measure = (font: string, text: string) => text.length * Number(/(\d+)px/u.exec(font)?.[1] ?? 16) * .52;
const options = { measure };
const beat = (id: string, startFrame: number, endFrame: number, rest: Partial<ObjectStoryBeat>): ObjectStoryBeat =>
  ({ id, startFrame, endFrame, arrangement: { kind: "pair", objects: ["a", "b"] }, ...rest });
const spec = (beats: ObjectStoryBeat[], over: Partial<ObjectStorySpec> = {}): ObjectStorySpec => ({
  schemaVersion: 1, id: "s", fps: { num: 30, den: 1 }, durationFrames: beats[beats.length - 1].endFrame, width: 1920, height: 1080,
  objects: [{ id: "a", label: "First", value: { format: { kind: "currency", currency: "USD", precision: 0 } } }, { id: "b", label: "Second", value: { format: { kind: "currency", currency: "USD", precision: 0 } } }, { id: "c", label: "Third" }],
  beats, ...over,
});
const story = spec([
  beat("one", 0, 60, { arrangement: { kind: "solo", objects: ["a"] }, caption: { text: "The first total", emphasis: ["total"] }, ops: [{ kind: "set-value", object: "a", value: 120 }] }),
  beat("two", 60, 120, { caption: { text: "The second total" }, ops: [{ kind: "set-value", object: "b", value: 100 }] }),
  beat("three", 120, 180, { ops: [{ kind: "measure-gap", a: "a", b: "b", label: "$20" }, { kind: "mark", object: "b", mark: "question", atFrame: 150 }] }),
  beat("four", 180, 240, { arrangement: { kind: "row", objects: ["a", "c", "b"] }, ops: [{ kind: "connect", from: "a", to: "c" }, { kind: "transfer", from: "c", to: "b", label: "$", atFrame: 200 }] }),
  beat("five", 240, 300, { arrangement: { kind: "solo", objects: ["b"] }, focus: "b", ops: [{ kind: "highlight", object: "b" }] }),
]);
const compile = (input: ObjectStorySpec) => {
  const result = compileObjectStory(input, options);
  if (!result.ok) throw new Error(JSON.stringify(result.diagnostics));
  return result.plan;
};
const codes = (input: ObjectStorySpec) => compileObjectStory(input, options).diagnostics.map(item => item.code);

describe("object story", () => {
  it("returns the same frame for shuffled and linear seeks", () => {
    const plan = compile(story);
    const linear = Array.from({ length: 300 }, (_, frame) => evaluateObjectStory(plan, frame));
    for (const frame of [299, 4, 190, 61, 0, 150, 299]) expect(evaluateObjectStory(plan, frame)).toEqual(linear[frame]);
  });

  it("moves a kept object continuously instead of cutting it", () => {
    const plan = compile(story);
    const position = (frame: number) => evaluateObjectStory(plan, frame).objects.find(item => item.id === "a")!.rect;
    const travel = Math.abs(position(100).x - position(59).x);
    expect(travel).toBeGreaterThan(100);
    // No single frame covers more than a quarter of the journey, so the eye can follow it.
    for (let frame = 61; frame < 120; frame++) expect(Math.abs(position(frame).x - position(frame - 1).x)).toBeLessThan(travel / 4);
  });

  it("counts a value during its operation and keeps the final value", () => {
    const plan = compile(story);
    const shown = (frame: number) => evaluateObjectStory(plan, frame).objects.find(item => item.id === "a")?.value?.text;
    expect(shown(0)).toBe("$0");
    expect(shown(10)).not.toBe("$0");
    expect(shown(10)).not.toBe("$120");
    expect(shown(100)).toBe("$120");
  });

  it("reveals the caption word by word, and marks emphasis", () => {
    const plan = compile(story);
    const words = (frame: number) => evaluateObjectStory(plan, frame).caption!.lines.flat();
    expect(words(0)[0].progress).toBe(0);
    expect(words(0)[words(0).length - 1].progress).toBe(0);
    expect(words(45).every(word => word.progress === 1)).toBe(true);
    expect(words(45).find(word => word.text === "total")!.emphasis).toBe(true);
    expect(words(45).find(word => word.text === "first")!.emphasis).toBe(false);
  });

  it("places the caption clear of the objects in landscape and portrait", () => {
    for (const size of [{ width: 1920, height: 1080 }, { width: 1080, height: 1920 }]) {
      const plan = compile({ ...story, ...size });
      for (const frame of [40, 100, 160, 280]) {
        const state = evaluateObjectStory(plan, frame);
        const box = state.caption!.rect;
        for (const object of state.objects) {
          const r = object.rect;
          expect(box.x < r.x + r.width && r.x < box.x + box.width && box.y < r.y + r.height && r.y < box.y + box.height, `${frame} ${object.id}`).toBe(false);
        }
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(size.width);
        expect(box.y + box.height).toBeLessThanOrEqual(size.height);
      }
    }
  });

  it("keeps a link between its objects as they rearrange, and removes it on disconnect", () => {
    const plan = compile(spec([
      beat("a", 0, 40, { ops: [{ kind: "connect", from: "a", to: "b" }] }),
      beat("b", 40, 80, { arrangement: { kind: "stack", objects: ["a", "b"] } }),
      beat("c", 80, 120, { arrangement: { kind: "stack", objects: ["a", "b"] }, ops: [{ kind: "disconnect", from: "a", to: "b" }] }),
    ]));
    expect(evaluateObjectStory(plan, 70).links).toHaveLength(1);
    expect(evaluateObjectStory(plan, 119).links).toHaveLength(0);
  });

  it("removes a link when one end leaves, and lifts a link over an object between its ends", () => {
    const plan = compile(spec([
      beat("a", 0, 40, { arrangement: { kind: "row", objects: ["a", "b", "c"] }, ops: [{ kind: "connect", from: "a", to: "c" }, { kind: "connect", from: "a", to: "b" }] }),
      beat("b", 40, 80, { arrangement: { kind: "solo", objects: ["c"] } }),
    ]));
    const links = evaluateObjectStory(plan, 39).links;
    expect(links.find(link => link.id === "a→c")!.bow).toBeGreaterThan(0);
    expect(links.find(link => link.id === "a→b")!.bow).toBe(0);
    expect(evaluateObjectStory(plan, 60).links).toHaveLength(0);
  });

  it("clears a leaving object before the next one arrives in its place", () => {
    const plan = compile(spec([
      beat("a", 0, 60, { arrangement: { kind: "solo", objects: ["a"] }, ops: [{ kind: "highlight", object: "a" }] }),
      beat("b", 60, 120, { arrangement: { kind: "solo", objects: ["c"] }, ops: [{ kind: "highlight", object: "c" }] }),
    ]));
    for (let frame = 60; frame < 90; frame++) {
      const opacity = (id: string) => evaluateObjectStory(plan, frame).objects.find(item => item.id === id)?.opacity ?? 0;
      expect(Math.min(opacity("a"), opacity("c")), `frame ${frame}`).toBeLessThan(.05);
    }
    expect(evaluateObjectStory(plan, 110).objects.find(item => item.id === "c")!.opacity).toBe(1);
  });

  it("moves an object when a mark lands on it, then lets it settle", () => {
    const plan = compile(spec([beat("a", 0, 60, { ops: [{ kind: "mark", object: "a", mark: "cross", durationFrames: 12 }] })]));
    const pulse = (frame: number) => evaluateObjectStory(plan, frame).objects.find(item => item.id === "a")!.pulse;
    expect(pulse(10)).toBeGreaterThan(.5);
    expect(pulse(50)).toBe(0);
  });

  it("clears the stage for a statement and fills the frame with its words", () => {
    const plan = compile(spec([
      beat("a", 0, 60, { ops: [{ kind: "highlight", object: "a" }], caption: { text: "A small caption" } }),
      beat("b", 60, 150, { arrangement: { kind: "statement", objects: [] }, caption: { text: "So where did the money go?", emphasis: ["money"] } }),
      beat("c", 150, 210, { ops: [{ kind: "highlight", object: "b" }] }),
    ]));
    const small = evaluateObjectStory(plan, 40).caption!, large = evaluateObjectStory(plan, 140);
    expect(large.objects).toEqual([]);
    expect(large.caption!.fontSizePx).toBeGreaterThan(small.fontSizePx * 1.4);
    expect(large.caption!.align).toBe("center");
    const box = large.caption!.rect;
    expect(box.y + box.height / 2).toBeCloseTo(540, 0);
    expect(evaluateObjectStory(plan, 180).objects.map(item => item.id)).toEqual(["a", "b"]);
  });

  it("holds new words until leaving objects have cleared", () => {
    const plan = compile(spec([
      beat("a", 0, 60, { ops: [{ kind: "highlight", object: "a" }] }),
      beat("b", 60, 150, { arrangement: { kind: "statement", objects: [] }, caption: { text: "So where did it go?" } }),
    ]));
    for (let frame = 60; frame < 150; frame++) {
      const state = evaluateObjectStory(plan, frame);
      const shown = state.caption!.lines.flat().some(word => word.progress > 0);
      if (shown) expect(state.objects, `frame ${frame}`).toEqual([]);
    }
    expect(evaluateObjectStory(plan, 149).caption!.lines.flat().every(word => word.progress > .5)).toBe(true);
  });

  it("reveals a statement across its whole beat, so it leaves no still stretch", () => {
    const plan = compile(spec([beat("a", 0, 200, { arrangement: { kind: "statement", objects: [] }, caption: { text: "Short line" } })], { maxStillSeconds: 2.5 }));
    expect(plan.pacing.longestStillFrames).toBeLessThan(40);
  });

  it("counts a new statement as a change, and a repeated one as nothing", () => {
    const line = { text: "Same words" };
    expect(codes(spec([beat("a", 0, 40, { arrangement: { kind: "statement", objects: [] }, caption: line }), beat("b", 40, 80, { arrangement: { kind: "statement", objects: [] }, caption: { text: "New words" } })]))).not.toContain("beat-without-change");
    expect(codes(spec([beat("a", 0, 40, { arrangement: { kind: "statement", objects: [] }, caption: line }), beat("b", 40, 80, { arrangement: { kind: "statement", objects: [] }, caption: line })]))).toContain("beat-without-change");
  });

  it("makes one value the subject of a figure beat", () => {
    const plan = compile(spec([
      beat("a", 0, 90, { arrangement: { kind: "figure", objects: ["a"] }, ops: [{ kind: "set-value", object: "a", value: 90, durationFrames: 60 }], caption: { text: "Ninety of them" } }),
      beat("b", 90, 150, { ops: [{ kind: "highlight", object: "b" }] }),
    ]));
    const state = evaluateObjectStory(plan, 70);
    expect(state.objects[0].figure).toBe(true);
    expect(state.objects[0].value?.text).toBe("$90");
    expect(state.objects[0].rect.width).toBeGreaterThan(1500);
    expect(evaluateObjectStory(plan, 140).objects.find(item => item.id === "a")!.figure).toBe(false);
  });

  it("names a stage that does not match its arrangement", () => {
    expect(codes(spec([beat("a", 0, 40, { arrangement: { kind: "pair", objects: [] } })]))).toContain("empty-arrangement");
    expect(codes(spec([beat("a", 0, 40, { arrangement: { kind: "statement", objects: ["a"] }, caption: { text: "Words" } })]))).toContain("empty-arrangement");
    expect(codes(spec([beat("a", 0, 40, { arrangement: { kind: "figure", objects: ["c"] } })]))).toContain("figure-needs-value");
  });

  it("walks an arriving object in from its nearest side, leaving footprints, and stops at its place", () => {
    const plan = compile(spec([beat("a", 0, 90, { arrangement: { kind: "solo", objects: ["a"] }, ops: [{ kind: "act", object: "a", motion: "walk", durationFrames: 60 }] })]));
    const at = (frame: number) => evaluateObjectStory(plan, frame).objects[0];
    expect(at(0).motion.x).toBeGreaterThan(300);
    expect(at(30).motion.x).toBeLessThan(at(0).motion.x);
    expect(at(30).trail.length).toBeGreaterThan(0);
    expect(at(30).trail.length).toBeLessThan(at(59).trail.length);
    expect(at(30).motion.y).not.toBe(at(38).motion.y);
    expect(at(80).motion).toEqual({ x: 0, y: 0, rotate: 0, scale: 1 });
  });

  it("gives each motion its own shape and returns to rest", () => {
    const motions = ["hop", "shake", "spin", "drop", "lift"] as const;
    for (const motion of motions) {
      const plan = compile(spec([beat("a", 0, 60, { ops: [{ kind: "act", object: "a", motion, durationFrames: 40 }] })]));
      const state = (frame: number) => evaluateObjectStory(plan, frame).objects[0].motion;
      expect(state(12), motion).not.toEqual({ x: 0, y: 0, rotate: 0, scale: 1 });
      expect(Math.abs(state(45).x) + Math.abs(state(45).y), motion).toBe(0);
    }
  });

  it("keeps the new size after grow and shrink", () => {
    const plan = compile(spec([
      beat("a", 0, 40, { ops: [{ kind: "act", object: "a", motion: "grow", durationFrames: 20 }, { kind: "act", object: "b", motion: "shrink", durationFrames: 20 }] }),
      beat("b", 40, 80, { ops: [{ kind: "highlight", object: "a" }] }),
    ]));
    const scale = (frame: number, id: string) => evaluateObjectStory(plan, frame).objects.find(item => item.id === id)!.motion.scale;
    expect(scale(70, "a")).toBeGreaterThan(1.1);
    expect(scale(70, "b")).toBeLessThan(.7);
  });

  it("draws a graph that climbs while the object rides its head", () => {
    const plan = compile(spec([
      beat("a", 0, 60, { ops: [{ kind: "trend", object: "a", direction: "up", durationFrames: 50 }] }),
      beat("b", 60, 120, { ops: [{ kind: "trend", object: "b", direction: "down", durationFrames: 50 }] }),
    ]));
    const trend = (frame: number, id: string) => evaluateObjectStory(plan, frame).objects.find(item => item.id === id)!.trend!;
    expect(trend(10, "a").points.length).toBeLessThan(trend(49, "a").points.length);
    expect(trend(49, "a").head.y).toBeLessThan(trend(10, "a").head.y);
    expect(trend(59, "a").head.y).toBeLessThan(.2);
    expect(trend(110, "b").head.y).toBeGreaterThan(trend(70, "b").head.y);
    expect(evaluateObjectStory(plan, 80).objects.find(item => item.id === "a")!.trend, "a graph lasts for its own beat").toBeUndefined();
  });

  it("names an unknown motion", () => {
    expect(codes(spec([beat("a", 0, 40, { ops: [{ kind: "act", object: "a", motion: "dance" as never }] })]))).toContain("unknown-motion");
  });

  it("keeps a mark to its beat unless it persists", () => {
    const plan = compile(spec([
      beat("a", 0, 40, { ops: [{ kind: "mark", object: "a", mark: "cross" }, { kind: "mark", object: "b", mark: "check", persist: true }] }),
      beat("b", 40, 80, { ops: [{ kind: "highlight", object: "a" }] }),
    ]));
    const marks = (frame: number) => evaluateObjectStory(plan, frame).objects.filter(item => item.mark).map(item => item.id);
    expect(marks(39)).toEqual(["a", "b"]);
    expect(marks(60)).toEqual(["b"]);
  });

  it("fills a level meter during its operation, keeps it, and starts from a carried level", () => {
    const plan = compile(spec([
      beat("a", 0, 40, { ops: [{ kind: "level", object: "a", to: .5, durationFrames: 20 }] }),
      beat("b", 40, 80, { ops: [{ kind: "level", object: "a", to: .9, atFrame: 50, durationFrames: 20 }] }),
    ], { objects: [{ id: "a", level: .2 }, { id: "b" }, { id: "c" }] }));
    const level = (frame: number) => evaluateObjectStory(plan, frame).objects.find(item => item.id === "a")!.level!;
    expect(level(0)).toBeCloseTo(.2, 5);
    expect(level(10)).toBeGreaterThan(.2);
    expect(level(30)).toBeCloseTo(.5, 5);
    expect(level(45)).toBeCloseTo(.5, 5);
    expect(level(79)).toBeCloseTo(.9, 5);
    expect(evaluateObjectStory(plan, 30).objects.find(item => item.id === "b")!.level).toBeUndefined();
  });

  it("absorbs an object into another and removes it", () => {
    const plan = compile(spec([
      beat("a", 0, 40, { ops: [{ kind: "highlight", object: "a" }] }),
      beat("b", 40, 80, { ops: [{ kind: "absorb", object: "a", into: "b" }] }),
    ]));
    expect(evaluateObjectStory(plan, 45).objects.map(item => item.id)).toContain("a");
    expect(evaluateObjectStory(plan, 79).objects.map(item => item.id)).toEqual(["b"]);
  });

  it("shows finished states when settled", () => {
    const plan = compile(story);
    const state = evaluateObjectStory(plan, 2, { settled: true });
    expect(state.caption!.lines.flat().every(word => word.progress === 1)).toBe(true);
    expect(state.objects[0].value?.text).toBeDefined();
  });

  it("removes a measured gap when a new object comes between its two sides", () => {
    const plan = compile(story);
    expect(evaluateObjectStory(plan, 170).gaps).toHaveLength(1);
    expect(evaluateObjectStory(plan, 210).gaps).toHaveLength(0);
  });

  it("shows a carried value from the first frame and counts on from it", () => {
    const carried = spec([beat("a", 0, 40, { ops: [{ kind: "set-value", object: "a", value: 200, atFrame: 10, durationFrames: 20 }] })], { carried: { kind: "pair", objects: ["a", "b"] },
      objects: [{ id: "a", value: { format: { kind: "currency", currency: "USD", precision: 0 }, initial: 120, shownFromStart: true } }, { id: "b", value: { format: { kind: "number" }, initial: 7, shownFromStart: true } }, { id: "c" }] });
    const plan = compile(carried);
    const shown = (frame: number, id: string) => evaluateObjectStory(plan, frame).objects.find(item => item.id === id)?.value?.text;
    expect(shown(0, "a")).toBe("$120");
    expect(shown(0, "b")).toBe("7");
    expect(shown(39, "a")).toBe("$200");
  });

  it("carries objects in from the previous scene without an entrance", () => {
    const plan = compile({ ...spec([beat("a", 0, 40, { ops: [{ kind: "highlight", object: "a" }] })]), carried: { kind: "pair", objects: ["a", "b"] } });
    expect(evaluateObjectStory(plan, 0).objects.map(item => item.opacity)).toEqual([1, 1]);
  });

  it("rejects a beat that changes nothing, and allows a declared hold", () => {
    const first = beat("a", 0, 40, { ops: [{ kind: "highlight", object: "a" }] });
    expect(codes(spec([first, beat("b", 40, 80, {})]))).toContain("beat-without-change");
    expect(codes(spec([first, beat("b", 40, 80, { hold: true })]))).not.toContain("beat-without-change");
  });

  it("measures stillness and warns past the budget", () => {
    const plan = compile(spec([beat("a", 0, 200, { ops: [{ kind: "highlight", object: "a" }] })]));
    expect(plan.pacing.longestStillFrames).toBe(180);
    expect(plan.pacing.longestStillSeconds).toBeCloseTo(6, 5);
    expect(codes(spec([beat("a", 0, 200, { ops: [{ kind: "highlight", object: "a" }] })]))).toContain("still-stretch");
    expect(codes(spec([beat("a", 0, 200, { ops: [{ kind: "highlight", object: "a" }] })], { maxStillSeconds: 7 }))).not.toContain("still-stretch");
    expect(compile(story).pacing.longestStillSeconds).toBeLessThan(2);
  });

  it("names each authoring error", () => {
    const first = beat("a", 0, 40, { ops: [{ kind: "highlight", object: "a" }] });
    expect(codes(spec([beat("a", 0, 40, { arrangement: { kind: "pair", objects: ["a", "ghost"] } })]))).toContain("unknown-object");
    expect(codes(spec([first, beat("b", 50, 80, { ops: [{ kind: "highlight", object: "a" }] })]))).toContain("beat-gap");
    expect(codes(spec([first, beat("b", 30, 80, { ops: [{ kind: "highlight", object: "a" }] })]))).toContain("beat-order");
    expect(codes(spec([beat("a", 0, 40, { ops: [{ kind: "highlight", object: "a", atFrame: 39, durationFrames: 10 }] })]))).toContain("op-outside-beat");
    expect(codes(spec([beat("a", 0, 40, { ops: [{ kind: "highlight", object: "c" }] })]))).toContain("object-not-on-stage");
    expect(codes(spec([beat("a", 0, 40, { arrangement: { kind: "solo", objects: ["c"] }, ops: [{ kind: "set-value", object: "c", value: 1 }] })]))).toContain("value-not-declared");
    expect(codes(spec([beat("a", 0, 40, { ops: [{ kind: "disconnect", from: "a", to: "b" }] })]))).toContain("no-link");
    expect(codes(spec([beat("a", 0, 40, { ops: [{ kind: "level", object: "a", to: 1.5 }] })]))).toContain("level-out-of-range");
    expect(codes(spec([beat("a", 0, 40, { arrangement: { kind: "row", objects: ["a", "b", "c", "a", "b", "c", "a"] } })]))).toContain("too-many-objects");
    expect(codes(spec([beat("a", 0, 40, { focus: "c", ops: [{ kind: "highlight", object: "a" }] })]))).toContain("object-not-on-stage");
    expect(codes(spec([beat("a", 0, 40, { ops: [{ kind: "highlight", object: "a" }], caption: { text: "word ".repeat(120) } })]))).toContain("caption-no-room");
  });

  it("reveals Japanese captions without spaces", () => {
    const plan = compile({ ...spec([beat("a", 0, 60, { ops: [{ kind: "highlight", object: "a" }], caption: { text: "請求書の合計" } })]), language: "ja" });
    expect(evaluateObjectStory(plan, 59).caption!.lines.flat().map(word => word.text).join("")).toBe("請求書の合計");
  });
});
