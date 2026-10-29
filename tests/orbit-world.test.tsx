import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OrbitWorldScene } from "../registry/video/recipes/orbit-world";
import type { SceneTemplateSpec } from "../registry/video/scene-templates";
import { validateSceneTemplate } from "../registry/video/scene-templates";
import { MAX_ROLL, angleBetween, cameraMatrices, cameraRates, geoToVec, layoutLabels, planOrbitWorld, projectToStage, resolveOrbitWorld,
  subsolarPoint, viewAt } from "../registry/video/orbit-world-model";
import { clipRing, capRing, orthoProjector } from "../registry/video/orbit-globe-flat";

const lhr = { latitude: 51.47, longitude: -0.4543 }, hnd = { latitude: 35.5494, longitude: 139.7798 };
const spec: SceneTemplateSpec<"orbit-world"> = {
  schemaVersion: 1, recipeVersion: 1, recipeId: "orbit-world", id: "orbit", fps: { num: 24, den: 1 },
  durationFrames: 360, width: 960, height: 540, cueFrames: [72, 168, 264],
  content: { placement: "geographic", title: "From A to B", locations: [{ id: "a", label: "Alpha", ...lhr }, { id: "b", label: "Beta", detail: "Detail", ...hnd }],
    readout: { value: "9,590 km", label: "Distance" }, credit: "Credit line" },
};
const timing = { durationFrames: 360, fps: 24, dock: 72, reveal: 168, resolve: 264 };

describe("orbit world", () => {
  it("keeps v1 payloads valid and rejects broken v2 inputs", () => {
    const v1: SceneTemplateSpec<"orbit-world"> = { ...spec, content: { placement: "geographic", locations: spec.content.locations,
      camera: { latitude: 20, longitude: 10, orbitDegrees: 30 }, globeRadiusPercent: 70 } };
    expect(() => validateSceneTemplate(v1)).not.toThrow();
    const bad = (content: Partial<SceneTemplateSpec<"orbit-world">["content"]>) => () => validateSceneTemplate({ ...spec, content: { ...spec.content, ...content } });
    expect(bad({ routes: [{ id: "r", from: "a", to: "zz" }] })).toThrow(/route refers/);
    expect(bad({ sun: { time: "not a date" } })).toThrow(/sun time/);
    expect(bad({ palette: { route: "orange" } })).toThrow(/palette/);
    expect(bad({ camera: { destination: "nowhere" } })).toThrow(/destination/);
  });

  it("migrates v1 camera to the opening view and defaults routes to consecutive legs", () => {
    const r = resolveOrbitWorld({ placement: "geographic", locations: [...spec.content.locations, { id: "c", label: "Gamma", latitude: 1.35, longitude: 103.99 }],
      camera: { latitude: 20, longitude: 10 } });
    expect(r.routes.map(x => [x.from, x.to])).toEqual([["a", "b"], ["b", "c"]]);
    expect(r.destination.id).toBe("c");
    expect(angleBetween(r.start!, geoToVec(20, 10))).toBeLessThan(1e-9);
    // London–Haneda great circle: 9,590 km ± 10.
    expect(Math.abs(resolveOrbitWorld(spec.content).totalAngle * 6371.0088 - 9592)).toBeLessThan(10);
  });

  it("is a pure, calm camera: moves from frame 0, rate-limited, and arrives on the destination", () => {
    const r = resolveOrbitWorld(spec.content);
    const a = planOrbitWorld(r, timing, 16 / 9), b = planOrbitWorld(r, timing, 16 / 9);
    expect(viewAt(a, 211)).toEqual(viewAt(b, 211));
    expect(angleBetween(viewAt(a, 0).n, viewAt(a, 6).n) + Math.abs(viewAt(a, 0).distance - viewAt(a, 6).distance)).toBeGreaterThan(.002);
    const rates = cameraRates(a.views, 24);
    expect(Math.max(...rates.heading)).toBeLessThan(30);
    expect(Math.max(...rates.roll)).toBeLessThanOrEqual(MAX_ROLL + 1e-6);
    // Held: the destination stays on the visible face, steady through the last second.
    const end = viewAt(a, 359), hold = viewAt(a, 336);
    expect(angleBetween(end.n, geoToVec(hnd.latitude, hnd.longitude))).toBeLessThan(.2);
    expect(angleBetween(end.n, hold.n)).toBeLessThan(1e-3);
    const p = projectToStage(cameraMatrices(end, 16 / 9), geoToVec(hnd.latitude, hnd.longitude), 960, 540);
    expect(p.x).toBeGreaterThan(480); expect(p.x).toBeLessThan(912); expect(p.y).toBeGreaterThan(54); expect(p.y).toBeLessThan(486);
  });

  it("computes the subsolar point, clips the night cap to the disc and keeps labels apart", () => {
    const june = subsolarPoint("2026-06-21T12:00:00Z");
    expect(june.latitude).toBeCloseTo(23.44, 0);
    expect(Math.abs(june.longitude)).toBeLessThan(2);
    const v = { n: geoToVec(0, 0), up: geoToVec(90, 0), distance: 3, pitch: 0, shiftX: 0, shiftY: 0 };
    const m = cameraMatrices(v, 1), disc = { x: 100, y: 100, r: 50 }, project = orthoProjector(m, disc);
    // Night hemisphere centred 90° east: exactly the right half of the disc.
    const night = clipRing(capRing(geoToVec(0, 90), Math.PI / 2), project, disc);
    const xs = [...night.matchAll(/([\d.]+) ([\d.]+)/g)].map(x => Number(x[1]));
    expect(Math.min(...xs)).toBeGreaterThan(99); expect(Math.max(...xs)).toBeCloseTo(150, 0);
    const safe = { x: 0, y: 0, w: 400, h: 200 };
    const placed = layoutLabels([
      { id: "dest", anchor: { x: 380, y: 100 }, box: { w: 80, h: 30 }, gap: 10, sides: ["right", "left"], priority: 10 },
      { id: "near", anchor: { x: 300, y: 100 }, box: { w: 80, h: 30 }, gap: 10, sides: ["right", "left"], priority: 1 },
    ], safe, []);
    expect(placed.get("dest")!.side).toBe("left"); // flips away from the frame edge
    const d = placed.get("dest")!.rect, n = placed.get("near");
    if (n) expect(n.rect.x + n.rect.w <= d.x || d.x + d.w <= n.rect.x || n.rect.y + n.rect.h <= d.y || d.y + d.h <= n.rect.y).toBe(true);
  });

  it("renders the projected globe without textures and settles every element under reduced motion", () => {
    const { container } = render(<OrbitWorldScene spec={spec} frame={340} reducedMotion/>);
    expect(container.querySelector('[data-km-globe-state="projection"]')).toBeTruthy();
    expect(container.querySelector("[data-km-globe-flat]")).toBeTruthy();
    expect(container.querySelector('[data-km-orbit-route="a-b"]')).toBeTruthy();
    expect(container.querySelector('[data-km-orbit-label="b"]')!.textContent).toBe("BetaDetail");
    expect(container.querySelector("[data-km-orbit-readout]")!.textContent).toBe("9,590 km");
  });
});
