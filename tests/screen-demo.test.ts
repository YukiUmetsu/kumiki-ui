import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { compileScreenDemo, evaluateScreenDemo, inspectScreenDemoOutput, SCREEN_DWELL, SCREEN_OPENING, screenView, travelFrames, typingFrames } from "../registry/video/screen-demo";
import type { ScreenDemoContent } from "../registry/video/screen-demo";
import { TASKS_LIVE_DEMO, tasksImageDemo } from "../registry/video/screen-demo-examples";
import { compileFilm } from "../registry/video/film-document";

const FPS = 30;
const codes = (content: ScreenDemoContent, duration = 600, output?: Parameters<typeof compileScreenDemo>[3]) => compileScreenDemo(content, duration, FPS, output).problems.map(p => p.code);
const images = tasksImageDemo({ start: "start.png", composer: "composer.png", added: "added.png", done: "done.png" });

describe("screen demo motion", () => {
  it("times cursor travel by Fitts' law: farther and smaller takes longer, and no move takes no time", () => {
    expect(travelFrames(1, 40, FPS)).toBe(0);
    expect(travelFrames(800, 40, FPS)).toBeGreaterThan(travelFrames(200, 40, FPS));
    expect(travelFrames(400, 16, FPS)).toBeGreaterThan(travelFrames(400, 120, FPS));
    // MacKenzie et al. 1991: 230 + 166·log2(400/40 + 1) ms ≈ 804 ms, slowed 1.35× for watching.
    expect(travelFrames(400, 40, FPS)).toBe(Math.round(.804 * 1.35 * FPS));
  });
  it("types with a repeatable, uneven rhythm that pauses on spaces", () => {
    const a = typingFrames("Send the summary", FPS, 10, 3), b = typingFrames("Send the summary", FPS, 10, 3);
    expect(a).toEqual(b);
    expect(a).toHaveLength(16);
    expect(a.every((frame, i) => !i || frame >= a[i - 1])).toBe(true);
    const gaps = a.slice(1).map((frame, i) => frame - a[i]);
    expect(new Set(gaps).size).toBeGreaterThan(1);
  });
});

describe("screen demo plan", () => {
  const { plan, problems } = compileScreenDemo(TASKS_LIVE_DEMO, 460, FPS, { width: 1920, height: 1080 });
  it("plans the example with no problems, holding the opening before the first move", () => {
    expect(problems).toEqual([]);
    expect(plan.steps.map(step => step.id)).toEqual(["click-1", "type-1", "add", "show-1", "finish"]);
    expect(plan.steps[0].start).toBe(Math.round(FPS * SCREEN_OPENING));
    expect(plan.cues.map(cue => cue.id)).toEqual(["click-1", "type-1", "add", "show-1", "finish"]);
  });
  it("clicks on the target after a short dwell, and changes the UI on the click", () => {
    const click = plan.steps[0], at = evaluateScreenDemo(plan, click.action);
    expect(click.action - click.arrive).toBe(SCREEN_DWELL);
    const target = TASKS_LIVE_DEMO.targets["new-task"];
    expect(Math.abs(at.cursor.x - (target.x + target.width / 2))).toBeLessThan(1);
    expect(at.cursor.pressed).toBe(true);
    expect(evaluateScreenDemo(plan, click.action - 1).ui.state.composer).toBe(false);
    expect(evaluateScreenDemo(plan, click.action + 3).ui.state.composer).toBe(true);
  });
  it("types into UI state letter by letter, with a lit caret, and shows the I-beam", () => {
    const type = plan.steps[1], mid = evaluateScreenDemo(plan, Math.round((type.action + type.end) / 2));
    const typed = String(mid.ui.state.title);
    expect(typed.length).toBeGreaterThan(0);
    expect("Send the quarterly summary".startsWith(typed)).toBe(true);
    expect(mid.caret).toEqual({ target: "title", visible: true });
    expect(mid.cursor.mode).toBe("text");
    // The pointer steps aside while keys land, so the caret is the only mark in the text, and returns after.
    expect(mid.cursor.opacity).toBe(0);
    expect(evaluateScreenDemo(plan, type.end + 6).cursor.opacity).toBe(1);
    expect(evaluateScreenDemo(plan, type.end).ui.state.title).toBe("Send the quarterly summary");
  });
  it("frames the field and its button once, rather than swinging between them, and steps back at the end", () => {
    const type = plan.steps[1], add = plan.steps[2];
    expect(plan.camera.some(move => move.start > type.action && move.start < add.action)).toBe(false);
    const last = plan.camera[plan.camera.length - 1];
    expect(last.to.zoom).toBe(1);
    expect(Math.max(...plan.camera.map(move => move.to.zoom))).toBeLessThanOrEqual(1.8);
  });
  it("reads any frame the same in any order", () => {
    const frames = [400, 12, 233, 90, 400, 12];
    const results = frames.map(frame => JSON.stringify(evaluateScreenDemo(plan, frame)));
    expect(results[0]).toBe(results[4]);
    expect(results[1]).toBe(results[5]);
  });
  it("cuts the camera instead of gliding under reduced motion", () => {
    const move = plan.camera[0], mid = Math.round((move.start + move.end) / 2);
    const zooms = [move.from.zoom, move.to.zoom];
    expect(zooms).toContain(evaluateScreenDemo(plan, mid, { reducedMotion: true }).camera.zoom);
    expect(zooms).not.toContain(evaluateScreenDemo(plan, mid).camera.zoom);
  });
  it("crops in for a portrait output and keeps a landscape output whole", () => {
    expect(screenView(TASKS_LIVE_DEMO, { width: 1920, height: 1080 }).base).toBe(1);
    const portrait = screenView(TASKS_LIVE_DEMO, { width: 1080, height: 1920, safe: { left: .08, right: .12, top: .09, bottom: .19 } });
    expect(portrait.base).toBeGreaterThan(1.25);
    expect(portrait.max).toBeCloseTo(1.8 * portrait.base);
    const vertical = compileScreenDemo(TASKS_LIVE_DEMO, 460, FPS, { width: 1080, height: 1920, safe: { left: .08, right: .12, top: .09, bottom: .19 } }).plan;
    expect(vertical.opening.zoom).toBeCloseTo(portrait.base);
  });
});

describe("screenshot demos", () => {
  const { plan, problems } = compileScreenDemo(images, 460, FPS, { width: 1920, height: 1080 });
  it("switches screenshots on clicks with a short dissolve, and draws typing only until its screenshot changes", () => {
    expect(problems).toEqual([]);
    const add = plan.steps[2];
    expect(evaluateScreenDemo(plan, add.action + 1).image?.id).toBe("composer");
    const swap = evaluateScreenDemo(plan, add.action + 3).image!;
    expect(swap).toMatchObject({ id: "added", previous: "composer" });
    expect(swap.mix).toBeGreaterThan(0);
    expect(evaluateScreenDemo(plan, add.action - 1).typed.title).toBe("Send the quarterly summary");
    expect(evaluateScreenDemo(plan, add.action + 4).typed.title).toBeUndefined();
  });
  it("warns when the camera enlarges screenshots past their pixels", () => {
    const small = { ...images, source: { kind: "images" as const, states: images.source.kind === "images" ? images.source.states.map(state => ({ ...state, image: { ...state.image, width: 1280, height: 800 } })) : [] } };
    const soft = compileScreenDemo(small, 460, FPS, { width: 3840, height: 2160 }).plan;
    expect(inspectScreenDemoOutput(soft, { width: 3840, height: 2160 }).map(p => p.code)).toEqual(["screen-zoom-soft"]);
    expect(inspectScreenDemoOutput(plan, { width: 1920, height: 1080 })).toEqual([]);
  });
});

describe("screen demo checks", () => {
  it("names each problem with its path", () => {
    expect(codes({ ...TASKS_LIVE_DEMO, steps: [{ do: "click", target: "nowhere" }] })).toContain("screen-unknown-target");
    expect(codes({ ...images, steps: [{ do: "click", target: "add", show: "missing" }] })).toContain("screen-unknown-state");
    expect(codes({ ...images, steps: [{ do: "click", target: "add", set: { a: 1 } }] })).toContain("screen-set-images");
    expect(codes({ ...TASKS_LIVE_DEMO, steps: [{ do: "click", target: "add", show: "x" }] })).toContain("screen-show-ui");
    expect(codes({ ...TASKS_LIVE_DEMO, steps: [{ do: "scroll", to: 300 }] })).toContain("screen-scroll-none");
    expect(codes({ ...TASKS_LIVE_DEMO, steps: [{ do: "wait", frames: 10, callout: "Look" }] })).toContain("screen-callout-target");
    expect(codes({ ...TASKS_LIVE_DEMO, label: " " })).toContain("screen-label");
    expect(codes({ ...TASKS_LIVE_DEMO, steps: [] })).toContain("screen-no-steps");
    expect(codes(TASKS_LIVE_DEMO, 200)).toContain("screen-overflow");
    expect(codes({ ...TASKS_LIVE_DEMO, steps: [{ do: "type", target: "title", text: "x".repeat(60), click: false }] })).toContain("screen-type-long");
    expect(codes({ ...TASKS_LIVE_DEMO, targets: { ...TASKS_LIVE_DEMO.targets, add: { x: 1270, y: 141, width: 60, height: 40 } } })).toContain("screen-target-outside");
  });
  it("refuses screenshots without rights or of the wrong shape", () => {
    const states = images.source.kind === "images" ? images.source.states : [];
    const broken: ScreenDemoContent = { ...images, source: { kind: "images", states: [{ ...states[0], image: { ...states[0].image, licenseRef: "", width: 1000, height: 1000 } }, ...states.slice(1)] } };
    expect(codes(broken)).toEqual(expect.arrayContaining(["unlicensed-asset", "screen-image-size"]));
  });
  it("warns when the result is not held long enough to see", () => {
    const steps = compileScreenDemo(TASKS_LIVE_DEMO, 9999, FPS).plan.steps, length = steps[steps.length - 1].end;
    expect(codes(TASKS_LIVE_DEMO, length + 10)).toContain("screen-result-hold");
  });
});

describe("screen demos in a film", () => {
  it("compiles both example films, with each step a named moment and the turn on the last change", () => {
    for (const file of ["screen-demo-live", "screen-demo-screenshots"]) {
      const result = compileFilm(JSON.parse(readFileSync(`examples/film/${file}.film.json`, "utf8")));
      expect(result.diagnostics.filter(d => d.severity === "error")).toEqual([]);
      if (!result.ok) continue;
      const demo = result.film.scenes.find(scene => scene.kind === "screen-demo")!;
      expect(demo.cues.map(cue => cue.id)).toEqual(["start", "click-1", "type-1", "add", "show-1", "finish"]);
      if (demo.story?.expects) expect(demo.turnFrame).toBe(demo.cues.find(cue => cue.id === "finish")!.frame);
    }
  });
});
