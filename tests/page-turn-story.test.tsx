import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PageTurnStoryScene } from "../registry/video/recipes/page-turn-story";
import type { ImageAsset, SceneTemplateSpec } from "../registry/video/scene-templates";
import { pageTurnSpreads, validateSceneTemplate } from "../registry/video/scene-templates";
import { blockTop, bookFaces, bookMoment, bookShape, cameraAt, createLeafSurface, deformLeaf, flatLeaf, hingeHeight, leafBendAt, turnSchedule } from "../registry/video/stages/page-curl";
import type { CameraKey } from "../registry/video/stages/page-curl";

const img = (id: string): ImageAsset => ({ id, src: `/${id}.jpg`, alt: id });
const spec: SceneTemplateSpec<"page-turn-story"> = {
  schemaVersion: 1, recipeVersion: 1, recipeId: "page-turn-story", id: "book",
  fps: { num: 24, den: 1 }, durationFrames: 240, width: 960, height: 540,
  content: { documentTitle: "A field guide", eyebrow: "Chapter one",
    spreads: [
      { id: "a", caption: "First", left: { heading: "One", text: "Body" }, right: { image: img("p1") } },
      { id: "b", caption: "長い日本語のキャプション", left: { heading: "二", text: "本文。" }, right: { image: img("p2") } },
    ],
    turns: [{ at: 120, frames: 40 }] },
};

describe("page-turn story", () => {
  it("migrates legacy pages to spreads and validates turn cues", () => {
    const legacy = { ...spec.content, spreads: undefined, turns: undefined,
      pages: [{ id: "x", heading: "X", image: img("x"), text: "t" }, { id: "y", heading: "Y", image: img("y") }] };
    expect(() => validateSceneTemplate({ ...spec, content: legacy })).not.toThrow();
    expect(pageTurnSpreads(legacy)[0]).toMatchObject({ id: "x", left: { heading: "X", text: "t" }, right: { image: { id: "x" }, layout: "plate" } });
    expect(() => validateSceneTemplate({ ...spec, content: { ...spec.content, pages: legacy.pages } })).toThrow(/not both/);
    expect(() => validateSceneTemplate({ ...spec, content: { ...spec.content, turns: [] } })).toThrow(/one turn cue/);
    expect(() => validateSceneTemplate({ ...spec, content: { ...spec.content, turns: [{ at: 230, frames: 40 }] } })).toThrow(/inside the composition/);
    expect(() => validateSceneTemplate({ ...spec, content: { ...spec.content, environment: { light: { elevation: 95 } } } })).toThrow(/elevation/);
  });

  it("keeps the leaf inextensible, above the page blocks and flat when it lands", () => {
    const shape = bookShape(), s = createLeafSurface(32, 8), cols = 33;
    for (const p of [0, .1, .25, .5, .75, .9, 1]) {
      deformLeaf(s, shape, leafBendAt(p), 1);
      for (let j = 0; j <= 8; j++) {
        let length = 0;
        for (let i = 0; i < 32; i++) {
          const a = (j * cols + i) * 3, b = a + 3;
          length += Math.hypot(s.position[b] - s.position[a], s.position[b + 1] - s.position[a + 1]);
          // Never below the gutter, never through the flat part of either block.
          expect(s.position[b + 1]).toBeGreaterThanOrEqual(hingeHeight(shape) - 1e-6);
          if (Math.abs(s.position[b]) > .35) expect(s.position[b + 1]).toBeGreaterThanOrEqual(blockTop(shape) - 1e-6);
        }
        expect(length).toBeCloseTo(1, 3);
      }
    }
    deformLeaf(s, shape, leafBendAt(1), 1);
    // Landed on the far side: the fore edge lies flat at x ≈ −1.
    expect(s.position[32 * 3]).toBeLessThan(-.97);
  });

  it("derives real unit normals that face up on a resting leaf from either side", () => {
    const shape = bookShape(), s = createLeafSurface(16, 4);
    for (const side of [1, -1] as const) {
      deformLeaf(s, shape, flatLeaf, side);
      const k = (2 * 17 + 12) * 3;
      expect(Math.hypot(s.normal[k], s.normal[k + 1], s.normal[k + 2])).toBeCloseTo(1, 5);
      expect(s.normal[k + 1]).toBeGreaterThan(.99);
      expect(s.backNormal[k + 1]).toBeLessThan(-.99);
    }
    deformLeaf(s, shape, leafBendAt(.5), 1);
    const k = (2 * 17 + 8) * 3;
    expect(Math.hypot(s.normal[k], s.normal[k + 1], s.normal[k + 2])).toBeCloseTo(1, 5);
  });

  it("is a pure function of the frame: schedule, faces, reduced-motion cuts and an early camera move", () => {
    const schedule = turnSchedule(3, 300, undefined, 45);
    expect(schedule).toHaveLength(2);
    const m = bookMoment(schedule[0].at + schedule[0].frames / 2, schedule);
    expect(m).toMatchObject({ spread: 0, turning: 0, progress: .5 });
    expect(bookFaces(m, 1, .45)).toMatchObject({ left: 0, right: 3, leaf: { front: 1, back: 2 } });
    expect(bookFaces(m, -1, .45)).toMatchObject({ left: 2, right: 1, leaf: { front: 0, back: 3 } });
    expect(bookMoment(schedule[0].at + schedule[0].frames / 2, schedule, true)).toMatchObject({ spread: 1, turning: -1 });
    const shot = (distance: number) => ({ target: [0, 0, 0] as [number, number, number], yaw: 0, pitch: 40, distance, fov: 30 });
    const keys: CameraKey[] = [{ at: 0, shot: shot(12), move: 1 }, { at: 45, shot: shot(10), move: 45 }];
    expect(cameraAt(0, keys).distance - cameraAt(8, keys).distance).toBeGreaterThan(.05);
    expect(cameraAt(100, keys)).toEqual(cameraAt(100, keys));
  });

  it("renders honest loading, measured copy and announced page text without WebGL", () => {
    const { container, rerender } = render(<PageTurnStoryScene spec={{ ...spec, content: { ...spec.content, renderer: "flat" } }} frame={0} className="custom"/>);
    const stage = container.querySelector("[data-km-book-state]")!;
    expect(stage.getAttribute("data-km-book-state")).toBe("loading");
    expect(stage.getAttribute("data-km-book-renderer")).toBe("flat");
    expect(container.querySelector(".custom")).toBeTruthy();
    expect(container.querySelector("[data-km-book-eyebrow]")!.textContent).toBe("Chapter one");
    expect(container.textContent).toContain("Body");
    rerender(<PageTurnStoryScene spec={spec} frame={200} reducedMotion/>);
    expect(container.querySelector("[data-km-book-state]")!.getAttribute("data-km-book-spread")).toBe("1");
    expect(container.querySelector("[data-km-book-caption]")!.textContent).toBe("長い日本語のキャプション");
    expect(container.textContent).toContain("本文。");
  });
});
