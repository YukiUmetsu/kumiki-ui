import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { BREAKERS, OPTICS, SEA_STATES, WATER_COLOURS } from "../registry/nature/water-data";
import type { BreakerType } from "../registry/nature/water-data";
import {
  breakerDetail, breakerShape, breakerType, deepWavelength, fresnel, fullyDevelopedSea, glitterPath, groupSpeed, iribarren, kelvinWake, meanderAngle, meanderPath, orbit,
  phaseSpeed, reflectanceAt, reflectPoint, seaStateOf, seaSurface, wavelength, whitecapCoverage,
} from "../registry/nature/water-physics";
import { WaterSheet } from "../registry/nature/water-react";
import { fresnelWater, oceanField, renderOcean, seaSpectrum, subsurfaceReflectance } from "../registry/nature/water-ocean";
import { FULLY_DEVELOPED, G, SLOPES, WHITECAPS } from "../registry/nature/water-data";

describe("WATER1 waves", () => {
  it("follows the dispersion relation in deep and shallow water", () => {
    expect(deepWavelength(10)).toBeCloseTo(9.81 * 100 / (2 * Math.PI), 6);
    expect(phaseSpeed(deepWavelength(10))).toBeCloseTo(9.81 * 10 / (2 * Math.PI), 3);
    expect(groupSpeed(deepWavelength(10)) / phaseSpeed(deepWavelength(10))).toBeCloseTo(.5, 2);
    // Shallow water: speed √(g h), group speed equal to phase speed.
    const L = wavelength(20, 2);
    expect(phaseSpeed(L, 2)).toBeCloseTo(Math.sqrt(9.81 * 2), 1);
    expect(groupSpeed(L, 2) / phaseSpeed(L, 2)).toBeGreaterThan(.95);
  });
  it("raises the Pierson–Moskowitz sea and its whitecaps from the wind", () => {
    const s = fullyDevelopedSea(10);
    expect(s.height).toBeCloseTo(.22 * 100 / 9.81, 6);
    expect(s.period).toBeCloseTo(2 * Math.PI * 10.26 / (.877 * 9.81), 3);
    expect(s.steepness).toBeLessThan(.142);
    expect(whitecapCoverage(2)).toBe(0);
    expect(whitecapCoverage(10)).toBeCloseTo(3.84e-6 * 10 ** 3.41, 8);
    expect(seaStateOf(3).code).toBe(5);
    expect(SEA_STATES.map(s => s.code)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });
  it("gives a sea surface whose significant height matches and whose crests are sharper than troughs", () => {
    const sf = seaSurface(12, { seed: 4, spread: 0 }), xs = Array.from({ length: 4000 }, (_, i) => i * .5), eta = xs.map(x => sf.at(x, 0));
    const mean = eta.reduce((a, v) => a + v, 0) / eta.length, sd = Math.sqrt(eta.reduce((a, v) => a + (v - mean) ** 2, 0) / eta.length);
    expect(4 * sd).toBeGreaterThan(sf.sea.height * .6);
    expect(4 * sd).toBeLessThan(sf.sea.height * 1.5);
    expect(Math.max(...eta) - mean).toBeGreaterThan(mean - Math.min(...eta));
    expect(sf.at(13.7, 2.2)).toBe(seaSurface(12, { seed: 4, spread: 0 }).at(13.7, 2.2));
  });
  it("moves water in circles shrinking with depth, flattening in shallow water", () => {
    const top = orbit(2, 50, 0, Math.PI / 2), deep = orbit(2, 50, -10, Math.PI / 2);
    expect(Math.abs(top[0])).toBeCloseTo(1, 6);
    expect(Math.abs(deep[0])).toBeCloseTo(Math.exp(-2 * Math.PI * 10 / 50), 6);
    const sh = [orbit(1, 60, -2, Math.PI / 2, 3), orbit(1, 60, -2, 0, 3)];
    expect(Math.abs(sh[0][0])).toBeGreaterThan(Math.abs(sh[1][1]) * 2);
  });
});

describe("WATER1 shore, wakes, light and rivers", () => {
  it("names breakers by the Iribarren number and draws each type", () => {
    expect(breakerType(iribarren(.02, 1, 8))).toBe("spilling");
    expect(breakerType(iribarren(.1, 1, 8))).toBe("plunging");
    expect(breakerType(iribarren(.5, 1, 10))).toBe("surging");
    for (const t of Object.keys(BREAKERS) as BreakerType[]) for (const st of [0, .4, .7, 1]) {
      const b = breakerShape(t, st);
      expect(b.water.every(p => p.every(Number.isFinite))).toBe(true);
    }
    expect(breakerShape("plunging", .65).air).toBeDefined();
    const late = breakerDetail(breakerShape("plunging", .95));
    expect(late.bubbles.length).toBeGreaterThan(30);
    expect(late.translucent.length).toBeGreaterThan(10);
    expect(late.spindrift.length).toBeGreaterThan(0);
    expect(breakerShape("spilling", .2).foam).toHaveLength(0);
  });
  it("keeps a Kelvin wake's cusps on the 19.47° lines at any speed", () => {
    for (const v of [2, 5, 9]) {
      const w = kelvinWake(v, 400), c = w.crests[1], cusp = c.reduce((m, p) => (p[1] > m[1] ? p : m), c[0]);
      expect(Math.atan2(cusp[1], cusp[0]) * 180 / Math.PI).toBeCloseTo(19.47, 0);
      expect(w.transverseWavelength).toBeCloseTo(2 * Math.PI * v * v / 9.81, 6);
    }
  });
  it("reflects 2% straight down and nearly all at grazing, mirrored about the water plane", () => {
    expect(OPTICS.r0).toBeCloseTo(.0204, 3);
    expect(fresnel(1)).toBeCloseTo(OPTICS.r0, 6);
    expect(reflectanceAt(1)).toBeGreaterThan(.85);
    expect(reflectanceAt(60)).toBeLessThan(.03);
    expect(reflectPoint([3, 5], 1)).toEqual([3, -3]);
    expect(glitterPath(20, 10).halfHeight).toBeGreaterThan(glitterPath(20, 2).halfHeight);
  });
  it("draws sine-generated meanders with the asked sinuosity", () => {
    for (const K of [1.3, 2]) {
      const pts = meanderPath({ width: 10, sinuosity: K, bends: 4, jitter: 0 });
      const len = pts.slice(1).reduce((a, p, i) => a + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);
      expect(len / (pts[pts.length - 1][0] - pts[0][0])).toBeCloseTo(K, 1);
    }
    expect(meanderAngle(1.0001)).toBeLessThan(.05);
  });
  it("cites a reference for every measured colour and renders the sheet without NaN", () => {
    for (const c of WATER_COLOURS) if (c.grade === "measured") expect(c.reference?.url).toMatch(/commons\.wikimedia\.org/);
    const html = renderToStaticMarkup(<WaterSheet />);
    expect(html).toContain("plunging");
    expect(html).not.toMatch(/NaN|undefined/);
  });
});

describe("WATER1 rendered ocean", () => {
  it("makes the measured sea for a wind: Pierson–Moskowitz height and period, shorter fetch a smaller sea", () => {
    for (const U of [6, 10, 16]) {
      const sp = seaSpectrum({ wind: U }), u195 = U * FULLY_DEVELOPED.u195;
      expect(sp.significantHeight / (FULLY_DEVELOPED.height * u195 * u195 / G)).toBeGreaterThan(0.9);
      expect(sp.significantHeight / (FULLY_DEVELOPED.height * u195 * u195 / G)).toBeLessThan(1.1);
      expect(sp.peakPeriod).toBeCloseTo((2 * Math.PI * u195) / (FULLY_DEVELOPED.peak * G), 1);
    }
    const open = seaSpectrum({ wind: 12 }), bay = seaSpectrum({ wind: 12, fetchKm: 20 });
    expect(bay.significantHeight).toBeLessThan(open.significantHeight * 0.7);
    expect(bay.peakPeriod).toBeLessThan(open.peakPeriod);
  });
  it("whitecaps the share Monahan measured; keeps resolved slopes within Cox–Munk's", () => {
    const U = 12, f = oceanField({ wind: U, seed: 2 }), cover = WHITECAPS.a * U ** WHITECAPS.b;
    expect(f.whitecapCover).toBeCloseTo(cover, 4);
    let below = 0, n = 0;
    for (let i = 0; i < 4000; i++) { const s = f.sample((i % 63) * 2.9, Math.floor(i / 63) * 2.9); n++; if (s.jac < f.foamThreshold) below++; }
    expect(below / n).toBeGreaterThan(cover * 0.4);
    expect(below / n).toBeLessThan(cover * 2.5);
    for (const w of [3, 8, 15]) { const g = oceanField({ wind: w }); expect(g.resolvedSlopeVar).toBeLessThanOrEqual((SLOPES.base + SLOPES.perWind * w) * 0.85 + 1e-6); }
  });
  it("reflects 2% of light at normal incidence and nearly all at grazing; deep water sends back blue", () => {
    expect(fresnelWater(1)).toBeCloseTo(0.0204, 3);
    expect(fresnelWater(0.02)).toBeGreaterThan(0.85);
    const r = subsurfaceReflectance();
    expect(r[2]).toBeGreaterThan(r[1]);
    expect(r[1]).toBeGreaterThan(r[0]);
  });
  it("renders a sea to finite, deterministic pixels; a gale is whiter than a calm", () => {
    const a = renderOcean({ width: 32, height: 18, wind: 6, seed: 1 }), b = renderOcean({ width: 32, height: 18, wind: 6, seed: 1 });
    expect(a.rgba.length).toBe(32 * 18 * 4);
    expect(Array.from(a.rgba)).toEqual(Array.from(b.rgba));
    const white = (px: Uint8ClampedArray) => { let c = 0; for (let i = 0; i < px.length; i += 4) if (px[i] > 200 && px[i + 1] > 200 && px[i + 2] > 200) c++; return c; };
    const calm = renderOcean({ width: 96, height: 54, wind: 3, pitch: -20, sunAzimuth: -120, seed: 2 }), gale = renderOcean({ width: 96, height: 54, wind: 20, pitch: -20, sunAzimuth: -120, seed: 2 });
    expect(white(gale.rgba)).toBeGreaterThan(white(calm.rgba));
  }, 60000);
});
