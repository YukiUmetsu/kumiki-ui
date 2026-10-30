import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { validateSceneTemplate } from "../registry/video/scene-templates";
import type { SceneTemplateSpec } from "../registry/video/scene-templates";
import { FollowSubjectThroughSectionsScene, followSubjectAt, followSubjectFraming, followSubjectTimeline } from "../registry/video/recipes/follow-subject-through-sections";
import type { FollowSubjectTransition } from "../registry/video/recipes/follow-subject-through-sections";

const plate = (id: string) => ({ id, src: `/${id}.jpg`, alt: `${id} plate`, width: 2000, height: 1000 });
const scene = (transitions: FollowSubjectTransition[] = ["occluder-wipe", "whip-pan", "camera-carry"]): SceneTemplateSpec<"follow-subject-through-sections"> => ({
  schemaVersion: 1, recipeVersion: 1, recipeId: "follow-subject-through-sections", id: "journey",
  fps: { num: 24, den: 1 }, durationFrames: 240, width: 960, height: 540,
  content: {
    subject: { media: { id: "carrier", src: "/carrier.svg", alt: "Carrier", width: 400, height: 200 }, size: .14, contact: .8 },
    sections: [
      { id: "a", environment: plate("a"), title: "First world", duration: 60 },
      { id: "b", environment: plate("b"), title: "Second world", transition: transitions[0] },
      { id: "c", environment: plate("c"), title: "Third world", transition: transitions[1], start: 120 },
      { id: "d", environment: plate("d"), title: "Destination", caption: "Arrives.", transition: transitions[2], foreground: "grass" },
    ],
  },
});

describe("follow-subject-through-sections", () => {
  it("validates the payload with actionable errors", () => {
    expect(() => validateSceneTemplate(scene())).not.toThrow();
    const one = scene(); one.content.sections = one.content.sections.slice(0, 1);
    expect(() => validateSceneTemplate(one)).toThrow(/two to eight sections/);
    const bad = scene(); bad.content.sections[1] = { ...bad.content.sections[1], transition: "dissolve" as FollowSubjectTransition };
    expect(() => validateSceneTemplate(bad)).toThrow(/transition/);
    const untitled = scene(); untitled.content.sections[2] = { ...untitled.content.sections[2], title: " " };
    expect(() => validateSceneTemplate(untitled)).toThrow(/title/);
  });
  it("resolves durations, cue frames and even shares into a contiguous timeline", () => {
    const t = followSubjectTimeline(scene().content, 240);
    expect(t.map(s => [s.start, s.end])).toEqual([[0, 60], [60, 120], [120, 180], [180, 240]]);
    expect(t.map(s => s.transition)).toEqual(["match-cut", "occluder-wipe", "whip-pan", "camera-carry"]);
  });
  it("keeps the subject continuous through every transition kind (no jump at a boundary)", () => {
    for (const kinds of [["occluder-wipe", "whip-pan", "camera-carry"], ["match-cut", "match-cut", "match-cut"]] as FollowSubjectTransition[][]) {
      const spec = scene(kinds);
      let prev = followSubjectAt(spec, 30);
      for (let f = 31; f < 200; f++) {
        const s = followSubjectAt(spec, f);
        expect(Math.hypot(s.x - prev.x, s.y - prev.y)).toBeLessThan(16); // cruise speed; a cut jump is far larger
        expect(Math.abs(s.heading - prev.heading)).toBeLessThan(3);
        prev = s;
      }
      expect(followSubjectFraming(spec).filter(i => i.code === "continuity")).toEqual([]);
    }
  });
  it("is a pure function of the frame and settles on arrival", () => {
    const spec = scene(), a = followSubjectAt(spec, 133);
    [5, 239, 61, 0].forEach(f => followSubjectAt(spec, f));
    expect(followSubjectAt(spec, 133)).toEqual(a);
    expect(followSubjectAt(spec, 239).arrived).toBe(1);
    expect(followSubjectAt(spec, 100).arrived).toBe(0);
    const reduced = followSubjectAt(spec, 120, true);
    expect(reduced.transition).toBeUndefined();
    expect(reduced.heading).toBe(0);
  });
  it("renders the active section and hands the evaluated state to a host rig", () => {
    const seen: number[] = [];
    const { container } = render(<FollowSubjectThroughSectionsScene spec={scene()} frame={150}
      renderSubject={({ state }) => { seen.push(state.sectionIndex); return <span data-rig="">rig</span>; }}/>);
    expect(container.querySelector("[data-km-follow-section]")?.getAttribute("data-km-follow-section")).toBe("c");
    expect(container.querySelector("[data-rig]")).not.toBeNull();
    expect(seen).toContain(2);
    expect(container.textContent).toContain("Third world");
  });
});
