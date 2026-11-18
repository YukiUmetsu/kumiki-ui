import { describe, expect, it } from "vitest";
import { eikonal, inspectMaterial, materialFrame, planMaterial } from "../registry/video/film-material";
import type { MaterialKind } from "../registry/video/film-material";
import { compileFilm } from "../registry/video/film-document";
import type { FilmDocument } from "../registry/video/film-document";
import materialFilm from "../examples/film/material.film.json";
import materialShapes from "../examples/film/material-shapes.film.json";

const COLS = 96, ROWS = 54, ASPECT = 16 / 9;
const mean = (a: Uint8ClampedArray) => a.reduce((s, v) => s + v, 0) / a.length / 255;

describe("material transitions", () => {
  it("solves fronts: uniform speed gives distance, slow paper holds the front back", () => {
    const speed = new Float32Array(41 * 41).fill(1);
    const d = eikonal(speed, 41, 41, 1, [[20, 20]]);
    // The 16-direction stencil stays within a few percent of Euclidean distance in every direction.
    for (const [x, y] of [[40, 20], [40, 40], [30, 40], [20, 0]] as const) expect(d[x + y * 41] / Math.hypot(x - 20, y - 20)).toBeGreaterThan(0.97);
    for (const [x, y] of [[40, 20], [40, 40], [30, 40]] as const) expect(d[x + y * 41] / Math.hypot(x - 20, y - 20)).toBeLessThan(1.06);
    speed.fill(0.25, 0, 41 * 20);
    expect(eikonal(speed, 41, 41, 1, [[20, 20]])[20]).toBeGreaterThan(d[20] * 2);
    // Faster along the grain: an elliptical front.
    const along = eikonal(new Float32Array(41 * 41).fill(1), 41, 41, 1, [[20, 20]], 1.4, Math.PI / 2);
    expect(along[20 + 0 * 41]).toBeLessThan(along[0 + 20 * 41]);
  });

  it("starts on the old scene and ends on the new, with every overlay gone, for each material", () => {
    for (const material of ["bleed", "burn", "paint", "frost"] as MaterialKind[]) {
      const plan = planMaterial({ material, seed: 4 }, COLS, ROWS, ASPECT);
      const first = materialFrame(plan, 0), last = materialFrame(plan, 1);
      expect(mean(first.reveal)).toBeLessThan(0.02);
      expect(mean(last.reveal)).toBeGreaterThan(0.99);
      for (const layer of last.layers) expect(mean(layer.alpha)).toBeLessThan(0.01);
      // Deterministic: the same seed and size give the same frame.
      expect(materialFrame(planMaterial({ material, seed: 4 }, COLS, ROWS, ASPECT), 0.4)).toEqual(materialFrame(plan, 0.4));
    }
  });

  it("follows each material's physics", () => {
    // Ink on paper spreads as √t: a quarter of the time covers far more than a quarter of the way.
    const bleed = planMaterial({ material: "bleed", seed: 2, origins: [{ x: 0.5, y: 0.5 }] }, COLS, ROWS, ASPECT);
    expect(mean(materialFrame(bleed, 0.25).reveal)).toBeGreaterThan(mean(materialFrame(bleed, 0.75).reveal) * 0.3);
    // Burning paper leaves char behind its glowing front.
    const burn = materialFrame(planMaterial({ material: "burn", seed: 3 }, COLS, ROWS, ASPECT), 0.4);
    expect(burn.layers.find((l) => l.id === "char")!.alpha.some((v) => v > 200)).toBe(true);
    expect(burn.layers.find((l) => l.id === "ember")!.alpha.some((v) => v > 100)).toBe(true);
    // Paint runs down: the top of the frame is painted before the bottom.
    const paint = planMaterial({ material: "paint", seed: 5 }, COLS, ROWS, ASPECT);
    expect(paint.arrival[COLS * 2 + 10]).toBeLessThan(paint.arrival[COLS * (ROWS - 2) + 10]);
    // Frost covers the frame completely at the change, so the swap is hidden.
    const frost = materialFrame(planMaterial({ material: "frost", seed: 1 }, COLS, ROWS, ASPECT), 0.5);
    expect(mean(frost.layers.find((l) => l.id === "frost")!.alpha)).toBeGreaterThan(0.88);
  });

  it("keeps a shape while the material roughens it", () => {
    const plan = planMaterial({ material: "burn", seed: 6, shape: "diamond", origins: [{ x: 0.5, y: 0.5 }] }, COLS, ROWS, ASPECT);
    const at = (x: number, y: number) => plan.arrival[Math.round(x * (COLS - 1)) + Math.round(y * (ROWS - 1)) * COLS];
    // A diamond reaches the points on its axes before the corners at the same distance.
    expect(at(0.5 + 0.25 / ASPECT, 0.5)).toBeLessThan(at(0.5 + 0.18 / ASPECT, 0.68));
  });

  it("checks specs and compiles films with material mattes and shapes", () => {
    expect(inspectMaterial({ material: "glass" as MaterialKind }, 40, 30, "/t").map((p) => p.code)).toContain("material-kind");
    expect(inspectMaterial({ material: "burn", color: "red" }, 40, 30, "/t").map((p) => p.code)).toContain("material-color");
    expect(inspectMaterial({ material: "frost" }, 10, 30, "/t").map((p) => p.code)).toContain("material-timing");
    const film = compileFilm(materialFilm as unknown as FilmDocument, { outputId: "draft" });
    expect(film.ok).toBe(true);
    if (film.ok) expect(Object.values(film.film.mattes).map((m) => m.texture)).toEqual(["bleed", "burn", "paint", "frost"]);
    const shapes = compileFilm(materialShapes as unknown as FilmDocument, { outputId: "draft" });
    expect(shapes.ok).toBe(true);
    if (shapes.ok) expect(Object.values(shapes.film.shapes).map((s) => s.material)).toEqual(["burn", "bleed", "burn", "frost"]);
    const bad = { ...(materialShapes as unknown as FilmDocument), scenes: (materialShapes as unknown as FilmDocument).scenes.map((s) => (s.id === "fall" ? { ...s, transition: { kind: "shape" as const, shape: "mark" as const, material: "burn" as const } } : s)) };
    const refused = compileFilm(bad, { outputId: "draft" });
    expect(refused.ok).toBe(false);
  });
});
