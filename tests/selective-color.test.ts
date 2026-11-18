import { describe, expect, it } from "vitest";
import { deltaE2000, hueDistance, rgbToHsv, rgbToLab, rgbToYcbcr } from "../registry/video/selective-color-math";
import { colorMask, colorMatcher, composite, selectItem, createSelectiveColorEngine, monochromeCurve, refineMask, resolveSelectiveColorConfig, SelectiveColorError, strengthAt } from "../registry/video/selective-color";
import type { SelectiveColorFrame, SelectiveColorInput } from "../registry/video/selective-color";

/** Sharma, Wu & Dalal (2005), Table 1: L1 a1 b1 L2 a2 b2 ΔE00 — test data for CIEDE2000 implementations. */
const SHARMA = [
  [50, 2.6772, -79.7751, 50, 0, -82.7485, 2.0425], [50, 3.1571, -77.2803, 50, 0, -82.7485, 2.8615], [50, 2.8361, -74.02, 50, 0, -82.7485, 3.4412],
  [50, -1.3802, -84.2814, 50, 0, -82.7485, 1], [50, -1.1848, -84.8006, 50, 0, -82.7485, 1], [50, -0.9009, -85.5211, 50, 0, -82.7485, 1],
  [50, 0, 0, 50, -1, 2, 2.3669], [50, -1, 2, 50, 0, 0, 2.3669], [50, 2.49, -0.001, 50, -2.49, 0.0009, 7.1792], [50, 2.49, -0.001, 50, -2.49, 0.001, 7.1792],
  [50, 2.49, -0.001, 50, -2.49, 0.0011, 7.2195], [50, 2.49, -0.001, 50, -2.49, 0.0012, 7.2195], [50, -0.001, 2.49, 50, 0.0009, -2.49, 4.8045],
  [50, -0.001, 2.49, 50, 0.001, -2.49, 4.8045], [50, -0.001, 2.49, 50, 0.0011, -2.49, 4.7461], [50, 2.5, 0, 50, 0, -2.5, 4.3065], [50, 2.5, 0, 73, 25, -18, 27.1492],
  [50, 2.5, 0, 61, -5, 29, 22.8977], [50, 2.5, 0, 56, -27, -3, 31.903], [50, 2.5, 0, 58, 24, 15, 19.4535], [50, 2.5, 0, 50, 3.1736, 0.5854, 1], [50, 2.5, 0, 50, 3.2972, 0, 1],
  [50, 2.5, 0, 50, 1.8634, 0.5757, 1], [50, 2.5, 0, 50, 3.2592, 0.335, 1], [60.2574, -34.0099, 36.2677, 60.4626, -34.1751, 39.4387, 1.2644],
  [63.0109, -31.0961, -5.8663, 62.8187, -29.7946, -4.0864, 1.263], [61.2901, 3.7196, -5.3901, 61.4292, 2.248, -4.962, 1.8731], [35.0831, -44.1164, 3.7933, 35.0232, -40.0716, 1.5901, 1.8645],
  [22.7233, 20.0904, -46.694, 23.0331, 14.973, -42.5619, 2.0373], [36.4612, 47.858, 18.3852, 36.2715, 50.5065, 21.2231, 1.4146], [90.8027, -2.0831, 1.441, 91.1528, -1.6435, 0.0447, 1.4441],
  [90.9257, -0.5406, -0.9208, 88.6381, -0.8985, -0.7239, 1.5381], [6.7747, -0.2908, -2.4247, 5.8714, -0.0985, -2.2286, 0.6377], [2.0776, 0.0795, -1.135, 0.9033, -0.0636, -0.5514, 0.9082],
];

/** A test card: a red square and a blue square on mid grey, a near-black red stripe (below the value floor) and a pale
 * (desaturated) red stripe. */
function card(width = 64, height = 48): SelectiveColorFrame {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    let c = [128, 128, 128];
    if (x >= 8 && x < 24 && y >= 8 && y < 24) c = [210, 30, 40];
    if (x >= 40 && x < 56 && y >= 8 && y < 24) c = [30, 60, 210];
    if (y >= 32 && y < 36) c = [20, 3, 4];
    if (y >= 40 && y < 44) c = [200, 180, 182];
    data.set([c[0], c[1], c[2], 255], 4 * (x + y * width));
  }
  return { width, height, data };
}
const at = (f: SelectiveColorFrame | { width: number; data: Uint8ClampedArray }, x: number, y: number) => Array.from(f.data.slice(4 * (x + y * f.width), 4 * (x + y * f.width) + 3));
const isGrey = ([r, g, b]: number[]) => Math.abs(r - g) <= 1 && Math.abs(g - b) <= 1;
const RED: SelectiveColorInput = { targets: [{ color: "#d21e28" }], feathering: { radius: 0 }, temporal: { smoothing: 0 } };

describe("selective colour", () => {
  it("measures colour the standard ways", () => {
    for (const [l1, a1, b1, l2, a2, b2, want] of SHARMA) expect(deltaE2000(l1, a1, b1, l2, a2, b2)).toBeCloseTo(want, 4);
    const red = rgbToLab(1, 0, 0);
    expect(red[0]).toBeCloseTo(53.24, 1); expect(red[1]).toBeCloseTo(80.09, 1); expect(red[2]).toBeCloseTo(67.2, 1);
    expect(rgbToHsv(1, 0.5, 0)[0]).toBeCloseTo(30, 5);
    expect(hueDistance(350, 10)).toBe(20);
    const white = rgbToYcbcr(1, 1, 1);
    expect(white[0]).toBeCloseTo(1, 6); expect(white[1]).toBeCloseTo(0, 6); expect(white[2]).toBeCloseTo(0, 6);
  });

  it("keeps the target colour in every colour space, and nothing grey, dark or pale", () => {
    for (const colorSpace of ["hsv", "lab", "ycbcr"] as const) {
      const { config, problems } = resolveSelectiveColorConfig({ ...RED, colorSpace });
      expect(problems.filter((p) => p.severity === "error")).toEqual([]);
      const mask = colorMask(card(), config), m = (x: number, y: number) => mask[x + y * 64];
      expect(m(15, 15), colorSpace).toBeGreaterThan(0.99);
      expect(m(47, 15), colorSpace).toBeLessThan(0.01);
      expect(m(2, 2), colorSpace).toBeLessThan(0.01);
      expect(m(30, 33), colorSpace).toBeLessThan(0.2);
      expect(m(30, 41), colorSpace).toBeLessThan(0.2);
    }
    // The soft edge falls steadily with hue distance.
    const { config } = resolveSelectiveColorConfig({ targets: [{ color: "#ff0000", tolerance: 10, softness: 20 }] });
    const strip = { width: 40, height: 1, data: new Uint8ClampedArray(160) };
    for (let i = 0; i < 40; i++) { const h = i; const c = h <= 60 ? [255, Math.round((h / 60) * 255), 0] : [0, 0, 0]; strip.data.set([c[0], c[1], c[2], 255], 4 * i); }
    const ramp = Array.from(colorMask(strip, config));
    for (let i = 1; i < 40; i++) expect(ramp[i]).toBeLessThanOrEqual(ramp[i - 1] + 1e-6);
    expect(ramp[0]).toBe(1);
    expect(ramp[39]).toBe(0);
  });

  it("reads large frames from a 3D lookup table close to the exact match (CIELAB and YCbCr)", () => {
    for (const colorSpace of ["lab", "ycbcr"] as const) {
      const { config } = resolveSelectiveColorConfig({ ...RED, colorSpace }), match = colorMatcher(config);
      // Every colour of a fine RGB sweep, as one large frame, so the lookup table is used.
      const side = 96, frame = { width: side * side, height: side, data: new Uint8ClampedArray(side * side * side * 4) };
      for (let b = 0; b < side; b++) for (let g = 0; g < side; g++) for (let r = 0; r < side; r++) frame.data.set([Math.round((r * 255) / (side - 1)), Math.round((g * 255) / (side - 1)), Math.round((b * 255) / (side - 1)), 255], 4 * (r + side * (g + side * b)));
      const mask = colorMask(frame, config);
      let worst = 0;
      for (let p = 0; p < mask.length; p++) worst = Math.max(worst, Math.abs(mask[p] - match(frame.data[4 * p] / 255, frame.data[4 * p + 1] / 255, frame.data[4 * p + 2] / 255)));
      expect(worst, colorSpace).toBeLessThan(colorSpace === "lab" ? 0.05 : 0.025);
    }
  });

  it("fades the effect in and out over each window", () => {
    const windows = [{ start: 1, end: 3, transition: 0.5, curve: "linear" as const }, { start: 150, end: 180, unit: "frames" as const }];
    expect(strengthAt(windows, 0.5, 30)).toBe(0);
    expect(strengthAt(windows, 1.25, 30)).toBeCloseTo(0.5, 6);
    expect(strengthAt(windows, 2, 30)).toBe(1);
    expect(strengthAt(windows, 2.875, 30)).toBeCloseTo(0.25, 6);
    expect(strengthAt(windows, 2.5, 30)).toBe(1);
    expect(strengthAt(windows, 3.5, 30)).toBe(0);
    expect(strengthAt(windows, 5.5, 30)).toBe(1);
    expect(strengthAt(windows, 4.9, 30)).toBe(0);
    expect(strengthAt([], 99, 30)).toBe(1);
  });

  it("blends a styled monochrome base with the kept colour", () => {
    const frame = card(), { config } = resolveSelectiveColorConfig(RED), mask = colorMask(frame, config);
    const full = { width: 64, data: composite(frame, mask, 1, config) };
    expect(at(full, 15, 15)).toEqual(at(frame, 15, 15));
    expect(isGrey(at(full, 47, 15))).toBe(true);
    // Outside a window in monochrome mode everything is grey; in passthrough mode it is the original.
    const off = { width: 64, data: composite(frame, mask, 0, config) };
    expect(isGrey(at(off, 15, 15)) && isGrey(at(off, 47, 15))).toBe(true);
    const pass = resolveSelectiveColorConfig({ ...RED, outside: "passthrough" }).config;
    expect(at({ width: 64, data: composite(frame, mask, 0, pass) }, 47, 15)).toEqual(at(frame, 47, 15));
    // The noir base: blacks crushed at the black level, contrast steeper than the plain grey.
    const curve = monochromeCurve({ ...config.monochrome, blackLevel: 0.1 });
    expect(curve[Math.round(0.08 * 1023)]).toBe(0);
    expect(curve[Math.round(0.55 * 1023)] - curve[Math.round(0.35 * 1023)]).toBeGreaterThan(0.2);
  });

  it("feathers along the picture's edges and holds the mask steady over time", () => {
    // A hard-edged red square: an edge-aware feather keeps the edge; a plain blur spreads colour onto the grey.
    const frame = card(), base = resolveSelectiveColorConfig({ ...RED, matte: { cleanBlack: 0, cleanWhite: 0 } }).config, raw = colorMask(frame, base);
    const guided = refineMask(raw, frame, { ...base, feathering: { radius: 80, edgeAware: true, epsilon: 0.001 } });
    const blurred = refineMask(raw, frame, { ...base, feathering: { radius: 80, edgeAware: false, epsilon: 0.001 } });
    expect(guided[26 + 15 * 64]).toBeLessThan(blurred[26 + 15 * 64]);
    expect(guided[15 + 15 * 64]).toBeGreaterThan(0.9);
    // A mask that flickers frame to frame swings less with temporal smoothing.
    const smoothing = { ...base, temporal: { smoothing: 0.6 } }, state = {};
    const swings: number[] = [];
    let last = 0;
    for (let f = 0; f < 12; f++) {
      const flicker = new Float32Array(raw.length).fill(f % 2);
      const v = refineMask(flicker, frame, smoothing, state)[0];
      if (f > 0) swings.push(Math.abs(v - last));
      last = v;
    }
    expect(Math.max(...swings.slice(4))).toBeLessThan(0.3);
  });

  it("refuses bad configs, frames and times, and logs what it clamps", () => {
    const codes = (input: SelectiveColorInput) => resolveSelectiveColorConfig(input).problems.map((p) => p.code);
    expect(codes({ targets: [{ color: "red" }] })).toContain("sc-target-color");
    expect(codes({ targets: [{ color: "#ff0000", tolerance: 400 }] })).toContain("sc-target-tolerance");
    expect(codes({ monochrome: { blackLevel: 0.6, whiteLevel: 0.5 } })).toContain("sc-levels");
    expect(codes({ windows: [{ start: 3, end: 1 }] })).toContain("sc-window");
    expect(codes({ monochrome: { luminanceWeights: [0.5, 0.5, 0.5] } })).toContain("sc-weights-sum");
    expect(codes({})).toContain("sc-no-targets");
    expect(() => createSelectiveColorEngine({ targets: [{ color: "#ff0000", softness: -1 }] })).toThrow(SelectiveColorError);
    const warnings: string[] = [], engine = createSelectiveColorEngine(RED, { duration: 4, logger: { warn: (m) => warnings.push(m) } });
    expect(() => engine.process({ width: 4, height: 4, data: new Uint8ClampedArray(10) }, 0)).toThrow(/needs 64 bytes/);
    const { report } = engine.process(card(), 9);
    expect(report.time).toBe(4);
    expect(warnings.some((m) => m.includes("clamped"))).toBe(true);
    expect(report.kept).toBeGreaterThan(0.05);
    const strict = createSelectiveColorEngine({ ...RED, outOfRange: "error" }, { duration: 4 });
    expect(() => strict.process(card(), -1)).toThrow(expect.objectContaining({ code: "sc-time-range" }));
  });

  it("keeps colour on one selected item, follows it, and fills its windows", () => {
    // Two red squares on grey; the right one has a white window inside. The seed is on the right one's red frame.
    const frameAt = (shift: number) => {
      const width = 120, height = 60, data = new Uint8ClampedArray(width * height * 4);
      for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        let c = [128, 128, 128];
        if (x >= 10 && x < 30 && y >= 20 && y < 40) c = [210, 30, 40];
        const rx = 70 + shift;
        if (x >= rx && x < rx + 30 && y >= 15 && y < 45) c = x >= rx + 8 && x < rx + 22 && y >= 23 && y < 37 ? [235, 235, 240] : [210, 30, 40];
        data.set([c[0], c[1], c[2], 255], 4 * (x + y * width));
      }
      return { width, height, data };
    };
    const { config } = resolveSelectiveColorConfig({ ...RED, selection: { seed: { x: 0.6, y: 0.5 }, at: 0, close: 0, edge: 0 } });
    const state = { lost: 0 }, m = (mask: Float32Array, x: number, y: number) => mask[x + y * 120];
    const first = selectItem(colorMask(frameAt(0), config), frameAt(0), config, state, 0);
    expect(m(first, 20, 30)).toBeLessThan(0.01);
    expect(m(first, 74, 20)).toBeGreaterThan(0.99);
    // The window inside the item keeps its own colour, though it is not the target colour.
    expect(m(first, 85, 30)).toBeGreaterThan(0.99);
    // It moves; the selection follows, and the other square stays out.
    let moved = first;
    for (const shift of [3, 6, 9, 12]) moved = selectItem(colorMask(frameAt(shift), config), frameAt(shift), config, state, shift / 30);
    expect(m(moved, 86, 20)).toBeGreaterThan(0.99);
    expect(m(moved, 20, 30)).toBeLessThan(0.01);
    // `colour` keeps only the item's target colour; before the seed's time nothing is kept.
    const colourOnly = resolveSelectiveColorConfig({ ...RED, selection: { seed: { x: 0.6, y: 0.5 }, keep: "colour", close: 0, edge: 0, at: 1 } }).config;
    expect(Math.max(...selectItem(colorMask(frameAt(0), colourOnly), frameAt(0), colourOnly, { lost: 0 }, 0.5))).toBe(0);
    const late = selectItem(colorMask(frameAt(0), colourOnly), frameAt(0), colourOnly, { lost: 0 }, 1);
    expect(m(late, 85, 30)).toBeLessThan(0.01);
    expect(m(late, 74, 20)).toBeGreaterThan(0.99);
    expect(resolveSelectiveColorConfig({ selection: { seed: { x: 2, y: 0.5 } } }).problems.map((p) => p.code)).toEqual(expect.arrayContaining(["sc-selection-seed", "sc-selection-target"]));
  });
});
