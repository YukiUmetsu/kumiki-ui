import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  evaluatePencilCamera, inspectPencilScene, pencilSceneProgress,
} from "../registry/video/colored-pencil-scene";
import { PencilScene } from "../registry/video/colored-pencil-scene-react";
import { coloredPencilExample } from "../src/video/colored-pencil-science";
import { pencilDemoScene } from "../src/video/colored-pencil-demo-scenes";

const basic = () => ({
  version: 1 as const, drawing: coloredPencilExample("leaf", "landscape"),
  camera: { from: [0, 0, 1] as const, to: [-50, -25, 1.18] as const,
    startFrame: 30, durationFrames: 90 },
  annotations: [
    { id: "vein", type: "callout" as const, label: "Branch veins",
      path: "M715 201 L845 175 L895 175", at: [782, 163] as const,
      color: "#34483c", startFrame: 170, durationFrames: 25, space: "screen" as const },
    { id: "detail", type: "stroke" as const,
      path: "M540 395 Q580 350 600 290", width: 1.6, color: "#6B8273",
      startFrame: 100, durationFrames: 40, space: "paper" as const },
    { id: "caption", type: "text" as const, text: ["A living system", "drawn in pencil"],
      at: [40, 441] as const, color: "#333F35", size: 18,
      startFrame: 120, durationFrames: 25, space: "screen" as const },
  ],
});

describe("topic-neutral coloured-pencil scene", () => {
  it("evaluates absolute camera frames and holds without history", () => {
    const camera = basic().camera;
    const first = evaluatePencilCamera(camera, 0);
    expect(first).toEqual({ x: 0, y: 0, zoom: 1 });
    expect(evaluatePencilCamera(camera, 75).zoom).toBeGreaterThan(1);
    const end = evaluatePencilCamera(camera, 300);
    expect(end).toEqual({ x: -50, y: -25, zoom: 1.18 });
    evaluatePencilCamera(camera, 300); evaluatePencilCamera(camera, 0);
    expect(evaluatePencilCamera(camera, 75)).toEqual(evaluatePencilCamera(camera, 75));
    expect(evaluatePencilCamera(camera, 0, true)).toEqual(end);
    expect(() => evaluatePencilCamera({ ...camera, to: [0, 0, 0.1] }, 30)).toThrow(RangeError);
  });
  it("provides explicit provenance for factual metrics and bounds text", () => {
    const base = basic();
    expect(inspectPencilScene(base)).toEqual([]);
    expect(inspectPencilScene({ ...base, annotations: [
      ...base.annotations, { id: "measurement", type: "metric", text: "10.2 cm",
        at: [40, 340], color: "#333F35", size: 16,
        startFrame: 2, durationFrames: 10 },
    ] })).toContainEqual(expect.stringMatching(/provenance/));
    expect(inspectPencilScene({ ...base, annotations: [
      { id: "bad-text", type: "text", text: ["A".repeat(200)], at: [930, 510],
        size: 18, color: "#333F35", startFrame: 0, durationFrames: 10 },
    ] })).not.toEqual([]);
    expect(inspectPencilScene({ ...base, camera: { ...base.camera, to: [99999, 0, 1] } })).not.toEqual([]);
  });
  it("renders label and line styles as actual SVG drawing, no source-specific code", () => {
    const scene = basic();
    const render = (frame: number) => renderToStaticMarkup(
      <PencilScene scene={scene} frame={frame} label="Scientific pencil explanation"/>);
    const mid = render(135), end = render(260);
    expect(mid).toContain('data-km-pencil-scene=""');
    expect(mid).toContain('data-km-pencil-camera=');
    expect(mid).toContain('data-km-pencil-annotation="detail"');
    expect(mid).toContain("stroke-dasharray");
    expect(end).toContain("Branch veins");
    expect(end).toContain("A living system");
    expect(end).toContain("data-km-colored-pencil");
    expect(render(260)).toEqual(end);
    expect(render(0)).not.toEqual(end);
    expect(pencilSceneProgress(250, 170, 25)).toBe(1);
  });
  for (const subject of ["orbit", "circuit", "terrain"] as const) {
    for (const aspect of ["landscape", "portrait"] as const) {
      it("supports arbitrary " + subject + " graphics, labels and aspect " + aspect, () => {
        const scene = pencilDemoScene(subject, aspect);
        expect(inspectPencilScene(scene)).toEqual([]);
        const html = renderToStaticMarkup(<PencilScene scene={scene} frame={300}/>);
        expect(html).toContain('data-km-pencil-region=');
        expect(html).toContain('data-km-pencil-annotation=');
        expect(html).toContain('viewBox="0 0 ' + (aspect === "landscape" ? "960 540" : "540 960") + '"');
      });
    }
  }
});
