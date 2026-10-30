import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { compileFollowSubjectFrame, collectFollowSubjectAssets, validateFollowSubject } from "../registry/video/follow-subject-through-sections";
import type { FollowSubjectSpec } from "../registry/video/follow-subject-through-sections";
import { FollowSubjectThroughSections } from "../registry/video/follow-subject-through-sections-react";

const scene = (): FollowSubjectSpec => ({
  schemaVersion: 1, recipeId: "follow-subject-through-sections", recipeVersion: 1,
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
  it("rejects unsupported serialized scene and recipe versions", () => {
    const unsupported = scene();
    (unsupported as unknown as { schemaVersion: number }).schemaVersion = 2;
    expect(() => validateFollowSubject(unsupported)).toThrow(/schema v1/);
    const recipe = scene();
    (recipe as unknown as { recipeVersion: number }).recipeVersion = 2;
    expect(() => validateFollowSubject(recipe)).toThrow(/recipe.*v1/);
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
    expect(surface.querySelectorAll("[data-km-subject]")).toHaveLength(1);
    view.rerender(<FollowSubjectThroughSections spec={scene()} frame={13} />);
    expect(surface.querySelectorAll("img[data-km-asset-id]")).toHaveLength(2);
  });
  it("crossfades entire environment groups, not each background layer independently", () => {
    const view = render(<FollowSubjectThroughSections spec={scene()} frame={11} />);
    const previous = view.container.querySelector<HTMLElement>("[data-km-environment=forest]");
    const incoming = view.container.querySelector<HTMLElement>("[data-km-environment=town]");
    expect(Number(previous?.style.opacity)).toBe(1); // outgoing layer keeps the scene opaque
    expect(Number(incoming?.style.opacity)).toBeCloseTo(1 / 3);
    expect(previous?.querySelectorAll("img")).toHaveLength(2);
    expect(incoming?.querySelectorAll("img")).toHaveLength(1);
  });
  it("keeps an opaque backing scene at every crossfade midpoint", () => {
    const spec = scene();
    for (const frame of [10, 11, 12]) {
      const state = compileFollowSubjectFrame(spec, frame);
      const previous = state.layers.filter(layer => layer.sectionId === "forest");
      const incoming = state.layers.filter(layer => layer.sectionId === "town");
      expect(previous).toHaveLength(2);
      expect(incoming).toHaveLength(1);
      expect(previous.every(layer => layer.groupOpacity === 1)).toBe(true);
      expect(incoming.every(layer => layer.groupOpacity >= 0 && layer.groupOpacity <= 1)).toBe(true);
    }
  });
  it("collects stable source and optional rights references for video-export-stage", () => {
    const s = scene();
    s.subject.licenseRef = "licensed-subject";
    s.sections[1].layers[0].licenseRef = "licensed-town";
    expect(collectFollowSubjectAssets(s)).toEqual([
      { id: "traveler", kind: "image", url: "/subject.svg", licenseRef: "licensed-subject" },
      { id: "forest/sky", kind: "image", url: "/sky.svg", licenseRef: undefined },
      { id: "forest/trees", kind: "image", url: "/trees.svg", licenseRef: undefined },
      { id: "town/sky", kind: "image", url: "/town.svg", licenseRef: "licensed-town" },
    ]);
  });
  it("can render a custom frame-addressable character without image duplication", () => {
    const view = render(<FollowSubjectThroughSections
      spec={scene()} frame={6}
      renderSubject={state => <svg data-testid="rig" data-rig-frame={state.frame} viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="20" />
      </svg>}
    />);
    expect(view.getByTestId("rig").getAttribute("data-rig-frame")).toBe("6");
    expect(view.container.querySelectorAll("[data-km-subject]")).toHaveLength(1);
    expect(view.container.querySelector('[data-km-asset-id="traveler"]')).toBeNull();
    view.rerender(<FollowSubjectThroughSections spec={scene()} frame={14}
      renderSubject={state => <svg data-testid="rig" data-rig-frame={state.frame} />} />);
    expect(view.getByTestId("rig").getAttribute("data-rig-frame")).toBe("14");
  });
  it("reflows to portrait while keeping subject identity and semantic state", () => {
    const s = scene();
    s.width = 540; s.height = 960;
    const view = render(<FollowSubjectThroughSections spec={s} frame={19} />);
    expect(view.getByRole("img").getAttribute("data-km-subject-id")).toBe("traveler");
    expect((view.getByRole("img") as HTMLElement).style.aspectRatio).toBe("540 / 960");
  });
  it("reveals a new world through a portal anchored to the persistent flying subject",()=>{
    const data=scene();
    data.sections[1].transition="portal";
    const start=compileFollowSubjectFrame(data,10);
    const mid=compileFollowSubjectFrame(data,11);
    const settled=compileFollowSubjectFrame(data,13);
    expect(start.transition?.type).toBe("portal");
    expect(start.transition?.progress).toBe(0);
    expect(mid.transition?.progress).toBeGreaterThan(0);
    expect(mid.transition?.subjectX).toBeCloseTo(mid.subject.x);
    expect(mid.layers.find(x=>x.key==="forest/sky")?.groupOpacity).toBe(1);
    expect(mid.layers.find(x=>x.key==="town/sky")?.groupOpacity).toBe(1);
    expect(settled.transition).toBeUndefined();
    const view=render(<FollowSubjectThroughSections spec={data} frame={11}/>);
    const incoming=view.container.querySelector<HTMLElement>("[data-km-environment=town]");
    expect(incoming?.style.clipPath).toContain("circle(");
    expect(incoming?.dataset.kmRevealMode).toBe("portal");
    const surface=view.container.querySelector<HTMLElement>("[data-km-follow-subject-scene]");
    expect(surface?.dataset.kmSceneTransition).toBe("portal");
    view.rerender(<FollowSubjectThroughSections spec={data} frame={13}/>);
    expect(incoming?.style.clipPath).toBe("");
    expect(view.container.querySelectorAll("[data-km-subject]")).toHaveLength(1);
  });
  it("reveals a new environment via a feathered depth wipe without transparent backing",()=>{
    const data=scene();
    data.sections[1].transition="depth-wipe";
    const state=compileFollowSubjectFrame(data,11);
    expect(state.transition?.type).toBe("depth-wipe");
    expect(state.layers.find(x=>x.key==="forest/sky")?.groupOpacity).toBe(1);
    const view=render(<FollowSubjectThroughSections spec={data} frame={11}/>);
    const incoming=view.container.querySelector<HTMLElement>("[data-km-environment=town]");
    expect(incoming?.dataset.kmRevealMode).toBe("depth-wipe");
    expect(incoming?.getAttribute("style")).toMatch(/mask-image|maskImage/);
    const reduced={...data,reducedMotion:true};
    const calm=compileFollowSubjectFrame(reduced,11);
    expect(calm.transition).toBeUndefined();
    expect(calm.layers.map(x=>x.sectionId)).toEqual(["town"]);
  });
  it("rejects unknown cinematic transition modes without disrupting existing crossfade semantics",()=>{
    const data=scene();
    (data.sections[1] as {transition?:string}).transition="teleport";
    expect(()=>validateFollowSubject(data)).toThrow(/transition/i);
    data.sections[1].transition="crossfade";
    expect(compileFollowSubjectFrame(data,11).transition).toBeUndefined();
  });

  it("supports cinematic eased travel without breaking legacy linear frame semantics",()=>{
    const legacy=scene();
    const cinematic=scene();
    cinematic.subject.pathEasing="cinematic";
    const first=compileFollowSubjectFrame(cinematic,0).subject;
    const last=compileFollowSubjectFrame(cinematic,19).subject;
    expect(first.x).toBe(35);
    expect(last.x).toBe(65);
    const linear=compileFollowSubjectFrame(legacy,4).subject.x;
    const eased=compileFollowSubjectFrame(cinematic,4).subject.x;
    expect(eased).toBeLessThan(linear);
    const other=compileFollowSubjectFrame(cinematic,15).subject.x;
    expect(other).toBeGreaterThan(compileFollowSubjectFrame(legacy,15).subject.x);
    for(const step of [18,0,7,19,4])compileFollowSubjectFrame(cinematic,step);
    expect(compileFollowSubjectFrame(cinematic,4).subject.x).toBe(eased);
    cinematic.subject.pathEasing="cubic" as "cinematic";
    expect(()=>validateFollowSubject(cinematic)).toThrow(/easing/);
  });

});
