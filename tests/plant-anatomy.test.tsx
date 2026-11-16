import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { PLANT_SPECIES, findPlant } from "../registry/anatomy/plant-species";
import type { Month } from "../registry/anatomy/plant-species";
import { GROWTH_FORMS } from "../registry/anatomy/plant-forms";
import { growPlant, hangingChainHz, plantConstruction, plantShapes, swayField } from "../registry/anatomy/plant-construct";
import { CROWN_LIGHT, crownDetail, foliageLadder, ladderAt, luma, speciesSway, woodDetail } from "../registry/anatomy/plant-crown";
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
  it("paints crowns whose light and sky holes match the photographs", () => {
    for (const id of ["zelkova", "japanese-black-pine", "japanese-cedar", "japanese-maple"]) {
      const cd = crownDetail(growPlant(plantConstruction(id), { month: 7, seed: 11 }), { seed: 1 });
      expect(cd.tufts.every(t => [...t.outline, ...t.leaves.flatMap(l => l.pts)].every(p => p.every(Number.isFinite))), id).toBe(true);
      // The foliage luma ladder (10th–75th percentiles over the 95th) inside the spread of the photographs, ±0.05.
      const Y = cd.tufts.map(t => luma(ladderAt(cd.ladder, t.light))).sort((a, b) => a - b), at = (p: number) => Y[Math.floor(p * (Y.length - 1))];
      [.1, .25, .5, .75].forEach((p, i) => {
        const [lo, hi] = CROWN_LIGHT.ladder.leafSpread[i], v = at(p) / at(.95);
        expect(v, `${id} p${p * 100}`).toBeGreaterThan(lo - .05);
        expect(v, `${id} p${p * 100}`).toBeLessThan(hi + .05);
      });
      // Sky through the crown inside the measured range (10–26%, a little slack), the top brighter than the bottom.
      expect(cd.gapSeen, id).toBeGreaterThan(.07);
      expect(cd.gapSeen, id).toBeLessThan(.3);
      const ys = cd.tufts.map(t => t.c[1]), y0 = Math.min(...ys), y1 = Math.max(...ys), mean = (a: number[]) => a.reduce((x, v) => x + v, 0) / a.length;
      const lum = (lo: number, hi: number) => mean(cd.tufts.filter(t => t.c[1] >= lo && t.c[1] <= hi).map(t => luma(ladderAt(cd.ladder, t.light))));
      const ratio = lum(y1 - (y1 - y0) / 3, y1) / lum(y0, y0 + (y1 - y0) / 3);
      expect(ratio, id).toBeGreaterThan(1.1);
      expect(ratio, id).toBeLessThan(2.4);
    }
    // Deterministic, and the ladder darkens from sunlit to shade.
    const sk = growPlant(plantConstruction("camphor"), { month: 7, seed: 3 });
    expect(crownDetail(sk, { seed: 2 }).tufts.slice(0, 20)).toEqual(crownDetail(sk, { seed: 2 }).tufts.slice(0, 20));
    const L = foliageLadder("#3f6b34").map(luma);
    expect(L.slice(1).every((v, i) => v > L[i])).toBe(true);
    // Willows carry leaves along their hanging twigs; wood thick enough gets shading and bark.
    expect(crownDetail(growPlant(plantConstruction("weeping-willow"), { month: 6, seed: 2 })).strandLeaves.length).toBeGreaterThan(100);
    const wd = woodDetail(growPlant(plantConstruction("japanese-black-pine"), { seed: 4 }));
    expect(wd.shade.length).toBeGreaterThan(0);
    expect(wd.bark.some(b => b.plates.length > 0)).toBe(true);
  });
  it("sways at the physical rate when asked, and at the original pace otherwise", () => {
    const sk = growPlant(plantConstruction("zelkova"), { seed: 1 });
    // The original pace repeats every 2π/2.1 s; the species rate is a cantilever f₀ well under 2 Hz.
    const legacy = swayField(sk, 1, .3), again = swayField(sk, 1, .3 + 2 * Math.PI / 2.1);
    expect(legacy([.1, .8])[0]).toBeCloseTo(again([.1, .8])[0], 9);
    const f0 = speciesSway(sk);
    expect(f0).toBeGreaterThan(.1);
    expect(f0).toBeLessThan(2);
    expect(swayField(sk, 1, .3, "species")([.1, .8])[0]).toBeCloseTo(swayField(sk, 1, .3 + 1 / f0, "species")([.1, .8])[0], 9);
    // A 4 m hanging twig swings as a chain: about 0.3 Hz.
    expect(hangingChainHz(4)).toBeCloseTo(.30, 2);
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
  }, 30000);   // 24 sheets, each painting four detailed crowns
});
