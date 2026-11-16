import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { BREAKERS, OPTICS, SEA_STATES, WATER_COLOURS } from "../registry/nature/water-data";
import type { BreakerType } from "../registry/nature/water-data";
import {
  breakerDetail, breakerShape, breakerType, deepWavelength, fresnel, fullyDevelopedSea, glitterPath, groupSpeed, iribarren, kelvinWake, meanderAngle, meanderPath, orbit,
  phaseSpeed, reflectanceAt, reflectPoint, seaStateOf, seaSurface, wavelength, whitecapCoverage,
} from "../registry/nature/water-physics";
import { WaterSheet } from "../registry/nature/water-react";

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
