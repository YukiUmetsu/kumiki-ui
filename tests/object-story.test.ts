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
