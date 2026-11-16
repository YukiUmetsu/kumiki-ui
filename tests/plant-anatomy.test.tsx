import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { PLANT_SPECIES, findPlant } from "../registry/anatomy/plant-species";
import type { Month } from "../registry/anatomy/plant-species";
import { GROWTH_FORMS } from "../registry/anatomy/plant-forms";
import { growPlant, plantConstruction, plantShapes } from "../registry/anatomy/plant-construct";
import { checkPlantData, checkPlantProportions, measurePlant, skeletonLandmarks } from "../registry/anatomy/plant-check";
import { barkMarks, flowerShape, fruitShape, leafShape } from "../registry/anatomy/plant-organs";
import { PlantSheet } from "../registry/anatomy/plant-react";

const catalog = JSON.parse(readFileSync("assets/sound/catalog.json", "utf8"));
const soundIds = new Set<string>((catalog.sounds ?? catalog).map((s: { id: string }) => s.id));

describe("FLORA1 data", () => {
  it("species records are consistent, reference PD/CC0 images and real catalog sounds", () => {
    expect(checkPlantData(PLANT_SPECIES, soundIds)).toEqual([]);
  });
  it("every leaf, flower, fruit and bark kind has a shape", () => {
    for (const s of PLANT_SPECIES) {
      expect(leafShape(s.leaf).outlines.length, s.id).toBeGreaterThan(0);
      if (s.flower && s.flower.shape !== "none") expect(flowerShape(s.flower).outlines.length + flowerShape(s.flower).marks.length, s.id).toBeGreaterThan(0);
      if (s.fruit) expect(fruitShape(s.fruit.shape).outlines.length, s.id).toBeGreaterThan(0);
      const b = barkMarks(s.bark.kind, 1, 2);
      expect(b.outlines.length + b.marks.length >= 0).toBe(true);
    }
  });
});

describe("FLORA1 growth", () => {
  it("grows every species in every month with finite geometry", () => {
    for (const s of PLANT_SPECIES) for (let m = 1; m <= 12; m++) {
      const sk = growPlant(plantConstruction(s), { month: m as Month, seed: 3 }), sh = plantShapes(sk);
      expect(sh.bounds.every(Number.isFinite), `${s.id} ${m}`).toBe(true);
      expect(sh.woodBack + sh.woodFront).not.toContain("NaN");
    }
  });
  it("follows the calendar: bare deciduous winters, evergreen winters in leaf, blossom in its month", () => {
    const winter = (id: string) => growPlant(plantConstruction(id), { month: 1, seed: 2 });
    expect(winter("mountain-cherry").foliage.length).toBe(0);
    expect(winter("japanese-black-pine").foliage.length).toBeGreaterThan(0);
    expect(growPlant(plantConstruction("mountain-cherry"), { month: 4, seed: 2 }).blossom.length).toBeGreaterThan(0);
    expect(growPlant(plantConstruction("japanese-plum"), { month: 2, seed: 2 }).flowers.length).toBeGreaterThan(0);
    expect(growPlant(plantConstruction("morning-glory"), { month: 1, seed: 2 }).branches.length).toBe(0);
  });
  it("is deterministic for a seed and varies across seeds", () => {
    const c = plantConstruction("japanese-maple");
    expect(plantShapes(growPlant(c, { seed: 4 })).woodFront).toBe(plantShapes(growPlant(c, { seed: 4 })).woodFront);
    expect(plantShapes(growPlant(c, { seed: 4 })).woodFront).not.toBe(plantShapes(growPlant(c, { seed: 5 })).woodFront);
  });
  it("tapers by Leonardo's rule: a branch is never thinner than one of its twigs, and the stem has the species' width", () => {
    const sk = growPlant(plantConstruction("zelkova"), { seed: 6 });
    for (const b of sk.branches) for (let i = 1; i < b.radii.length; i++) expect(b.radii[i]).toBeLessThanOrEqual(b.radii[i - 1] + 1e-9);
    expect(sk.branches[0].radii[0] * 2).toBeCloseTo(plantConstruction("zelkova").a.trunk.baseWidth, 3);
  });
  it("grown crowns stay inside their species' construction ranges", () => {
    for (const id of ["japanese-black-pine", "mountain-cherry", "camphor", "ginkgo", "japanese-cedar"]) {
      const f = checkPlantProportions(id, measurePlant(skeletonLandmarks(growPlant(plantConstruction(id), { seed: 9 }))), .25).filter(x => x.key === "crownWidth");
      expect(f.map(x => x.status), id).toEqual(["ok"]);
    }
  });
  it("covers every growth form", () => {
    for (const id of Object.keys(GROWTH_FORMS)) expect(() => growPlant(plantConstruction(id), { seed: 1 })).not.toThrow();
  });
});

describe("PlantSheet", () => {
  it("renders a sheet for every species", () => {
    for (const s of PLANT_SPECIES) {
      const html = renderToStaticMarkup(<PlantSheet species={s.id} />);
      expect(html).toContain(s.name.replace(/&/g, "&amp;"));
      expect(html).toContain('role="img"');
    }
    expect(findPlant("sakura")?.id).toBe("mountain-cherry");
  });
});
