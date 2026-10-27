import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { compileFollowSubjectFrame, validateFollowSubject } from "../registry/video/follow-subject-through-sections";
import type { FollowSubjectSpec } from "../registry/video/follow-subject-through-sections";
import { FollowSubjectThroughSections } from "../registry/video/follow-subject-through-sections-react";

const scene = (): FollowSubjectSpec => ({
  id: "travel", fps: { num: 30, den: 1 }, width: 960, height: 540,
  subject: { id: "traveler", src: "/subject.svg", alt: "Traveler flying between settings", x: 50, y: 40,
    path: [{ frame: 0, x: 35, y: 40 }, { frame: 19, x: 65, y: 40 }] },
  sections: [
    { id: "forest", frames: 10, layers: [{ id: "sky", src: "/sky.svg" }, { id: "trees", src: "/trees.svg", depth: 1 }] },
    { id: "town", frames: 10, transition: "crossfade", transitionFrames: 4,
      layers: [{ id: "sky", src: "/town.svg", depth: -0.5 }] },
  ],
});
describe("FollowSubjectThroughSections / frame contract", () => {
  it("preserves one subject identity through all sections", () => {
    for (const frame of [0, 5, 9, 10, 13, 19]) {
      expect(compileFollowSubjectFrame(scene(), frame).subjectId).toBe("traveler");
    }
  });
  it("resolves section boundaries without extending the total duration", () => {
    expect(compileFollowSubjectFrame(scene(), 9).activeSectionId).toBe("forest");
    expect(compileFollowSubjectFrame(scene(), 10).activeSectionId).toBe("town");
    expect(compileFollowSubjectFrame(scene(), 19).durationFrames).toBe(20);
  });
  it("blends at the incoming section's start, with exact final opacity", () => {
    const first = compileFollowSubjectFrame(scene(), 10).layers;
    expect(first.find(x => x.key === "forest/sky")?.opacity).toBe(1);
    expect(first.find(x => x.key === "town/sky")?.opacity).toBe(0);
    const middle = compileFollowSubjectFrame(scene(), 11).layers;
    expect(middle.find(x => x.key === "forest/sky")?.opacity).toBeCloseTo(2 / 3);
    expect(middle.find(x => x.key === "town/sky")?.opacity).toBeCloseTo(1 / 3);
    expect(compileFollowSubjectFrame(scene(), 13).layers.map(x => x.key)).toEqual(["town/sky"]);
  });
  it("cuts exactly on the boundary without bleeding scenery", () => {
    const data = scene();
    data.sections[1].transition = "cut";
    expect(compileFollowSubjectFrame(data, 10).layers.map(x => x.key)).toEqual(["town/sky"]);
  });
  it("supports arbitrary frame seeking with identical output", () => {
    const data = scene();
    const baseline = compileFollowSubjectFrame(data, 11);
    [19, 0, 9, 18, 1, 11].forEach(frame => compileFollowSubjectFrame(data, frame));
    expect(compileFollowSubjectFrame(data, 11)).toEqual(baseline);
  });
  it("interpolates the subject independently of section transitions", () => {
    const state = compileFollowSubjectFrame(scene(), 10);
    expect(state.subject.x).toBeCloseTo(35 + 30 * 10 / 19);
    expect(state.subject.y).toBe(40);
  });
  it("makes parallax safe within image overscan", () => {
    const s = scene();
    for (const frame of [0, 5, 9, 10, 19]) {
      for (const layer of compileFollowSubjectFrame(s, frame).layers) {
        const availableOverscan = (layer.scale - 1) * 50;
        expect(Math.abs(layer.translatePercent)).toBeLessThanOrEqual(availableOverscan + 0.001);
      }
    }
  });
  it("provides cut and static path equivalents for reduced motion", () => {
    const s = { ...scene(), reducedMotion: true };
    const state = compileFollowSubjectFrame(s, 10);
    expect(state.layers.map(x => x.key)).toEqual(["town/sky"]);
    expect(state.layers.every(x => x.translatePercent === 0 && x.scale === 1)).toBe(true);
    expect(state.subject.x).toBe(50);
  });
  it("clamps out-of-range frames but rejects fractional frames", () => {
    expect(compileFollowSubjectFrame(scene(), -5).frame).toBe(0);
    expect(compileFollowSubjectFrame(scene(), 999).frame).toBe(19);
    expect(() => compileFollowSubjectFrame(scene(), 0.5)).toThrow(/integer/);
  });
  it("rejects duplicate IDs and invalid transitions and opacity", () => {
    const duplicate = scene();
    duplicate.sections[1].id = "forest";
    expect(() => validateFollowSubject(duplicate)).toThrow(/unique/);
    const timing = scene();
    timing.sections[1].transitionFrames = 10;
    expect(() => validateFollowSubject(timing)).toThrow(/fit/);
    const opacity = scene();
    opacity.sections[0].layers[0].opacity = 1.5;
    expect(() => validateFollowSubject(opacity)).toThrow(/opacity/);
  });
  it("rejects non-monotonic or out-of-range subject path keys", () => {
    const data = scene();
    data.subject.path = [{ frame: 5, x: 50, y: 50 }, { frame: 4, x: 50, y: 50 }];
    expect(() => validateFollowSubject(data)).toThrow(/ascending/);
  });
  it("rejects empty assets and non-finite values", () => {
    const invalid = scene();
    invalid.sections[0].layers[0].src = "";
    expect(() => validateFollowSubject(invalid)).toThrow(/asset/);
    const nan = scene();
    nan.subject.widthPercent = NaN;
    expect(() => validateFollowSubject(nan)).toThrow(/Subject/);
  });
  it("renders accessible stage, persistent foreground and independent scenery", () => {
    const view = render(<FollowSubjectThroughSections spec={scene()} frame={11} />);
    const surface = view.getByRole("img", { name: /traveler flying/i });
    expect(surface.getAttribute("data-km-frame")).toBe("11");
    expect(surface.querySelectorAll("img[data-km-asset-id]")).toHaveLength(4);
    expect(surface.querySelectorAll("img[data-km-subject]")).toHaveLength(1);
    view.rerender(<FollowSubjectThroughSections spec={scene()} frame={13} />);
    expect(surface.querySelectorAll("img[data-km-asset-id]")).toHaveLength(2);
  });
  it("reflows to portrait while keeping subject identity and semantic state", () => {
    const s = scene();
    s.width = 540; s.height = 960;
    const view = render(<FollowSubjectThroughSections spec={s} frame={19} />);
    expect(view.getByRole("img").getAttribute("data-km-subject-id")).toBe("traveler");
    expect((view.getByRole("img") as HTMLElement).style.aspectRatio).toBe("540 / 960");
  });
});
