import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { BEAUFORT, CLOUD_GENERA, ELEMENT_WIDTH_DEG, SKY_PHASES } from "../registry/nature/sky-data";
import type { CloudGenus } from "../registry/nature/sky-data";
import {
  beaufortOf, beaufortSpeed, contrastAt, dropAxisRatio, dropFallSpeed, dropSpectrum, lightningFlash, rainbow, rainClass, skyPhase, slantDeg,
  sunElevation, thunderDelay, toEnvironmentalEffect, weatherState,
} from "../registry/nature/sky-physics";
import { cloudDeck, cloudShape } from "../registry/nature/sky-clouds";
import { cumulusModel, outlineDimension } from "../registry/nature/sky-cumulus";
import { SkySheet } from "../registry/nature/sky-react";
import { atmosphere, direction } from "../registry/nature/sky-atmosphere";
import { CLOUD_SCENES, CLOUD_VOLUMES, extinction, HALO, minimumDeviation, renderCloudSky } from "../registry/nature/sky-volume";

const GENERA = Object.keys(CLOUD_GENERA) as CloudGenus[];

describe("SKY1 data", () => {
  it("keeps the Beaufort scale contiguous and the empirical speed inside each force", () => {
    expect(BEAUFORT).toHaveLength(13);
    for (let b = 1; b < BEAUFORT.length; b++) expect(BEAUFORT[b].speed[0]).toBeCloseTo(BEAUFORT[b - 1].speed[1] + .1, 5);
    for (let b = 1; b <= 12; b++) {
      const v = beaufortSpeed(b);
      expect(v).toBeGreaterThanOrEqual(BEAUFORT[b].speed[0]);
      expect(v).toBeLessThanOrEqual(BEAUFORT[b].speed[1]);
      expect(beaufortOf(v).force).toBe(b);
    }
  });
  it("cites a public-domain atlas plate for every genus and grades the element widths", () => {
    for (const g of GENERA) {
      expect(CLOUD_GENERA[g].reference.rights).toBe("public-domain");
      expect(CLOUD_GENERA[g].reference.url).toMatch(/commons\.wikimedia\.org\/wiki\/File:International_Cloud_Atlas_1896-/);
    }
    expect(ELEMENT_WIDTH_DEG.cirrocumulus!.max).toBeLessThanOrEqual(ELEMENT_WIDTH_DEG.altocumulus!.min);
    expect(ELEMENT_WIDTH_DEG.altocumulus!.max).toBeLessThanOrEqual(ELEMENT_WIDTH_DEG.stratocumulus!.min);
    for (const p of SKY_PHASES) for (const c of [p.zenith, p.mid, p.horizon, p.sunDisc]) expect(c).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe("SKY1 physics", () => {
  it("matches the reported fall speeds, shapes and drop sizes", () => {
    expect(dropFallSpeed(.5)).toBeCloseTo(2, 0);
    expect(dropFallSpeed(3)).toBeCloseTo(8, 0);
    expect(dropFallSpeed(5)).toBeCloseTo(9.1, 1);
    expect(dropAxisRatio(1)).toBeGreaterThan(.98);
    expect(dropAxisRatio(5)).toBeCloseTo(.68, 2);
    expect(dropSpectrum(1).medianDiameter).toBeCloseTo(3.67 / 4.1, 3);
    expect(dropSpectrum(20).medianDiameter).toBeGreaterThan(dropSpectrum(2).medianDiameter);
    expect(["light", "moderate", "heavy", "violent"].map(id => id)).toEqual([1, 5, 20, 80].map(r => rainClass(r).id));
  });
  it("slants, fades, flashes and bows as reported", () => {
    expect(slantDeg(5, 5)).toBeCloseTo(45, 5);
    expect(contrastAt(3, 3)).toBeCloseTo(.02, 3);
    expect(thunderDelay(1)).toBeCloseTo(2.92, 2);
    expect(rainbow(10).primaryTop).toBe(32);
    expect(rainbow(45).visible).toBe(false);
    expect(sunElevation(35, 172, 12)).toBeCloseTo(90 - 35 + 23.44, 0);
    expect(skyPhase(-5).id).toBe("civil-twilight");
    expect(skyPhase(30).id).toBe("day");
    expect(skyPhase(-20).id).toBe("night");
    const fl = lightningFlash(1);
    expect(fl.strokes.length).toBeGreaterThanOrEqual(3);
    fl.strokes.slice(1).forEach((t, i) => expect(t - fl.strokes[i]).toBeGreaterThanOrEqual(.04));
    expect(fl.at(0)).toBeCloseTo(1, 5);
  });
  it("builds one consistent state and hands real speeds to the effect renderer", () => {
    const heavy = weatherState({ precipitation: "rain", intensity: "heavy", wind: 6 });
    expect(heavy.className).toBe("heavy");
    expect(heavy.slant).toBeGreaterThan(45);
    expect(heavy.notes.join(" ")).not.toMatch(/Mist|Fog|Haze/);
    expect(weatherState({ precipitation: "snow", intensity: "heavy" }).visibility).toBeLessThanOrEqual(.5);
    expect(weatherState({ obscurity: "fog" }).obscurity?.id).toBe("fog");
    const fx = toEnvironmentalEffect(heavy, { region: { min: [0, 0, 0], max: [10, 10, 10] }, unitsPerMetre: 100, fps: 24 })!;
    expect(fx.kind).toBe("rain");
    expect(fx.speed).toBeCloseTo(heavy.fallSpeed * 100 / 24, 5);
    expect(fx.wind[0]).toBeCloseTo(heavy.wind * 100 / 24, 5);
    expect(toEnvironmentalEffect(weatherState(), { region: fx.region, unitsPerMetre: 1, fps: 24 })).toBeUndefined();
  });
});

describe("SKY1 clouds", () => {
  it("draws every genus deterministically with finite bounds", () => {
    for (const g of GENERA) {
      const a = cloudShape(g, { seed: 4 }), b = cloudShape(g, { seed: 4 });
      expect(a.outline.length).toBeGreaterThan(20);
      expect(a.outline).toBe(b.outline);
      expect(a.bounds.every(Number.isFinite)).toBe(true);
      expect(a.outline).not.toMatch(/NaN/);
    }
  });
  it("sets decks on one plane that converges on the horizon, with heaps inside the frame", () => {
    const cam = { width: 640, height: 360, horizonY: 220, focal: 512, cover: .7 };
    const rows = cloudDeck("altocumulus", cam);
    expect(rows.length).toBeGreaterThan(4);
    // Far to near: farther rows sit lower (nearer the horizon) and fade more.
    for (let i = 1; i < rows.length; i++) expect(rows[i].distance).toBeLessThan(rows[i - 1].distance);
    for (const g of GENERA) for (const it of cloudDeck(g, cam)) {
      expect(it.fade).toBeGreaterThanOrEqual(0);
      expect(it.fade).toBeLessThanOrEqual(1);
      if (CLOUD_GENERA[g].form === "heaps") expect(it.y - it.shape.height * it.scale).toBeGreaterThanOrEqual(-1);
    }
  });
  it("builds cumulus from lit lumps at several scales, exposed to a white crown, darker when backlit", () => {
    const front = cumulusModel({ aspect: .7, seed: 3, sunAzimuth: 30 }), back = cumulusModel({ aspect: .7, seed: 3, sunAzimuth: 165 });
    expect(new Set(front.lumps.map(l => l.level)).size).toBeGreaterThanOrEqual(3);
    expect(Math.max(...front.lumps.map(l => l.light))).toBeCloseTo(1, 5);
    const mean = (m: typeof front) => m.lumps.reduce((a, l) => a + l.light, 0) / m.lumps.length;
    expect(mean(back)).toBeLessThan(mean(front) * .5);
    expect(back.lumps.some(l => (l.glow ?? 0) > .3)).toBe(true);
    expect(front.lumps.every(l => Number.isFinite(l.c[0] + l.c[1] + l.r))).toBe(true);
    const d = outlineDimension(front);
    expect(d).toBeGreaterThan(.85);
    expect(d).toBeLessThan(1.3);
  });
  it("renders the sheet in one tree without NaN", () => {
    const html = renderToStaticMarkup(<SkySheet />);
    expect(html).toContain("cumulonimbus");
    expect(html).not.toMatch(/NaN|undefined/);
  });
});

describe("SKY1 rendered skies", () => {
  it("colours the clear sky and sunlight by scattering: blue overhead, the low sun reddened", () => {
    const high = atmosphere({ sunElevation: 40, sunAzimuth: 0 }), low = atmosphere({ sunElevation: 3, sunAzimuth: 0 });
    const zen = high.sky(direction(90, 0));
    expect(zen[2]).toBeGreaterThan(zen[0] * 1.6);
    const sHigh = high.sunlight(500, Math.sin(40 * Math.PI / 180)), sLow = low.sunlight(500, Math.sin(3 * Math.PI / 180));
    expect(sLow[0] / sLow[2]).toBeGreaterThan(3 * (sHigh[0] / sHigh[2]));
    const diffuseShare = high.skyIrradiance[1] / (high.sunlight(2, Math.sin(40 * Math.PI / 180))[1] * Math.sin(40 * Math.PI / 180));
    expect(diffuseShare).toBeGreaterThan(0.05);
    expect(diffuseShare).toBeLessThan(0.3);
  });
  it("builds the genera from their physics: extinction from water content, ice halos at their minimum deviation", () => {
    expect(extinction(0.5, 10)).toBeCloseTo(0.075, 4);
    expect(minimumDeviation(1.31, 60) * 180 / Math.PI).toBeCloseTo(21.8, 1);
    expect(minimumDeviation(1.31, 90) * 180 / Math.PI).toBeCloseTo(45.7, 1);
    expect(minimumDeviation(HALO.iceIndex[2], 60)).toBeGreaterThan(minimumDeviation(HALO.iceIndex[0], 60));
    for (const [g, v] of Object.entries(CLOUD_VOLUMES)) {
      expect(v.top, g).toBeGreaterThan(v.base);
      expect(CLOUD_GENERA[g as CloudGenus]).toBeDefined();
    }
    expect(extinction(CLOUD_VOLUMES.cirrostratus.waterContent, CLOUD_VOLUMES.cirrostratus.effectiveRadius, "ice") * (CLOUD_VOLUMES.cirrostratus.top - CLOUD_VOLUMES.cirrostratus.base)).toBeLessThan(3);
    expect(extinction(CLOUD_VOLUMES.nimbostratus.waterContent, CLOUD_VOLUMES.nimbostratus.effectiveRadius) * (CLOUD_VOLUMES.nimbostratus.top - CLOUD_VOLUMES.nimbostratus.base)).toBeGreaterThan(23);
  });
  it("renders every genus to finite pixels, the same every time; a rain layer is darker than fair cumulus", () => {
    const mean = (px: Uint8ClampedArray) => { let s = 0; for (let i = 0; i < px.length; i += 4) s += px[i] + px[i + 1] + px[i + 2]; return s / (px.length / 4) / 3; };
    const means: Record<string, number> = {};
    for (const g of Object.keys(CLOUD_SCENES) as CloudGenus[]) {
      const r = renderCloudSky({ width: 32, height: 18, layers: [g], steps: 16, ...CLOUD_SCENES[g] });
      expect(r.rgba.length).toBe(32 * 18 * 4);
      means[g] = mean(r.rgba);
    }
    const a = renderCloudSky({ width: 24, height: 14, layers: ["stratocumulus"], steps: 12 }), b = renderCloudSky({ width: 24, height: 14, layers: ["stratocumulus"], steps: 12 });
    expect(Array.from(a.rgba)).toEqual(Array.from(b.rgba));
    expect(means.nimbostratus).toBeLessThan(means.stratus);
  }, 60000);
});
