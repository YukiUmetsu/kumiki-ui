import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ReliefMapExpeditionScene } from "../registry/video/recipes/relief-map-expedition";
import type { SceneTemplateSpec } from "../registry/video/scene-templates";
import { validateSceneTemplate } from "../registry/video/scene-templates";
import { decodeTerrarium, drapeRoute, geoToUV, occluded, projectToStage, reliefCameraAtFrame, reliefFrame, viewProjection } from "../registry/video/relief-terrain";
import type { ReliefCamera } from "../registry/video/relief-terrain";

const bounds = { west: -122, east: -121.5, south: 46.6, north: 46.9 };
const spec: SceneTemplateSpec<"relief-map-expedition"> = {
  schemaVersion: 1, recipeVersion: 1, recipeId: "relief-map-expedition", id: "relief",
  fps: { num: 24, den: 1 }, durationFrames: 200, width: 960, height: 540, cueFrames: [40, 100, 160],
  content: { title: "A mountain", terrain: { heightmap: { id: "dem", src: "/dem.png", alt: "Elevation model" }, encoding: "terrarium", bounds, source: "Test DEM" },
    verticalExaggeration: 2, exaggerationNote: "Vertical scale ×2",
    route: { points: [{ latitude: 46.7, longitude: -121.8 }, { latitude: 46.8, longitude: -121.7 }] },
    destination: { label: "Top", detail: "4,000 m", latitude: 46.8, longitude: -121.7 } },
};
/** A synthetic 32×32 cone, Terrarium-encoded: 0 m at the rim, 3,000 m in the middle. */
function cone() {
  const n = 32, rgba = new Uint8ClampedArray(n * n * 4);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const m = Math.max(0, 3000 * (1 - Math.hypot(x - 15.5, y - 15.5) / 15)) + 32768, i = (y * n + x) * 4;
    rgba[i] = Math.floor(m / 256); rgba[i + 1] = Math.floor(m) % 256; rgba[i + 2] = Math.round((m % 1) * 256); rgba[i + 3] = 255;
  }
  return reliefFrame(decodeTerrarium(rgba, n, n), bounds, "web-mercator", 2);
}

describe("relief-map expedition", () => {
  it("requires declared exaggeration, an in-bounds route and valid colour stops", () => {
    expect(() => validateSceneTemplate({ ...spec, content: { ...spec.content, exaggerationNote: undefined } })).toThrow(/declared/);
    expect(() => validateSceneTemplate({ ...spec, content: { ...spec.content, route: { points: [{ latitude: 47.5, longitude: -121.8 }, { latitude: 46.8, longitude: -121.7 }] } } })).toThrow(/inside the terrain/);
    expect(() => validateSceneTemplate({ ...spec, content: { ...spec.content, palette: [{ elevation: 0, color: "green" }, { elevation: 1, color: "#fff" }] } })).toThrow(/palette/);
    expect(() => validateSceneTemplate({ ...spec, content: { ...spec.content, verticalExaggeration: 1, exaggerationNote: undefined } })).not.toThrow();
  });

  it("decodes Terrarium elevation and drapes the route on the exaggerated surface", () => {
    const r = cone();
    expect(r.field.max).toBeGreaterThan(2800);
    const route = drapeRoute(r, [{ latitude: 46.62, longitude: -121.98 }, { latitude: 46.75, longitude: -121.75 }], .5, 0);
    // The last point sits near the peak: height in km × exaggeration.
    expect(route[route.length - 1][1]).toBeGreaterThan(5);
    expect(route[0][1]).toBeLessThan(1);
    const { u, v } = geoToUV(r, 46.9, -122);
    expect([u, v]).toEqual([0, 0]);
  });

  it("holds overhead, descends once and settles; reduced motion cuts between the two views", () => {
    const overhead: ReliefCamera = { target: [0, 0, 0], yaw: 0, pitch: 86, distance: 60, fov: 30 };
    const oblique: ReliefCamera = { target: [1, 2, 0], yaw: 0, pitch: 30, distance: 20, fov: 30 };
    const beats = { descendFrom: 40, descendTo: 94, durationFrames: 200 };
    expect(reliefCameraAtFrame(39, overhead, oblique, beats).pitch).toBe(86);
    // The hook is already moving within its first frames.
    expect(reliefCameraAtFrame(0, overhead, oblique, beats).distance - reliefCameraAtFrame(6, overhead, oblique, beats).distance).toBeGreaterThan(1.5);
    expect(reliefCameraAtFrame(67, overhead, oblique, beats).pitch).toBeCloseTo(58, 0);
    expect(reliefCameraAtFrame(94, overhead, oblique, beats).pitch).toBe(30);
    expect(reliefCameraAtFrame(60, overhead, oblique, beats, true)).toBe(overhead);
    expect(reliefCameraAtFrame(94, overhead, oblique, beats, true)).toBe(oblique);
    const centre = projectToStage(viewProjection(oblique, 16 / 9), oblique.target, 960, 540);
    expect(centre.x).toBeCloseTo(480, 3); expect(centre.y).toBeCloseTo(270, 3);
  });

  it("finds terrain between the eye and a hidden point", () => {
    const r = cone();
    const behind = drapeRoute(r, [{ latitude: 46.88, longitude: -121.75 }, { latitude: 46.881, longitude: -121.75 }], 1, 0)[0];
    const front = drapeRoute(r, [{ latitude: 46.62, longitude: -121.75 }, { latitude: 46.621, longitude: -121.75 }], 1, 0)[0];
    const eye: [number, number, number] = [0, 2, 40];
    expect(occluded(r, eye, behind)).toBe(true);
    expect(occluded(r, eye, front)).toBe(false);
  });

  it("shows an honest loading state and declares exaggeration once the descent starts", () => {
    const { container, rerender } = render(<ReliefMapExpeditionScene spec={spec} frame={0}/>);
    expect(container.querySelector('[data-km-terrain-state="loading"]')).toBeTruthy();
    expect(Number(container.querySelector<HTMLElement>('[data-km-rise="relief-notes"]')!.style.opacity)).toBe(0);
    rerender(<ReliefMapExpeditionScene spec={spec} frame={70}/>);
    expect(container.querySelector("[data-km-relief-exaggeration]")!.textContent).toBe("Vertical scale ×2");
    expect(Number(container.querySelector<HTMLElement>('[data-km-rise="relief-notes"]')!.style.opacity)).toBe(1);
  });
});
