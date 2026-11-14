import { describe, expect, it } from "vitest";
import { encodeWetInkPng, sampleWetInk } from "../registry/video/ink-wet-paper";
import type { InkBrushSpec } from "../registry/video/ink-brush";

const spec: InkBrushSpec = {
  version: 1, width: 480, height: 270, paper: "#F2EFE4", seed: 71,
  strokes: [{
    id: "wet-gesture", width: 34, load: .86, dryness: .08, tone: 0,
    startFrame: 2, durationFrames: 32,
    points: [
      { x: 76, y: 147, pressure: .08, pace: 1.7 },
      { x: 148, y: 135, pressure: .95, pace: .55 },
      { x: 278, y: 137, pressure: .87, pace: .9 },
      { x: 400, y: 119, pressure: .03, pace: 2.6 },
    ],
  }],
};
const inspect = (rgba: Uint8Array) => {
  let painted = 0, alphaSum = 0, maxAlpha = 0;
  for (let i = 3; i < rgba.length; i += 4) {
    if (rgba[i] > 8) painted++;
    alphaSum += rgba[i];
    if (rgba[i] > maxAlpha) maxAlpha = rgba[i];
  }
  return { painted, alphaSum, maxAlpha };
};
describe("paper-native brush deposition (INK1 wet medium)", () => {
  it("retains blank paper before brush contact and carries exact pixel dimensions", () => {
    const initial = sampleWetInk(spec, 0, { scale: .5 });
    expect(initial.width).toBe(240);
    expect(initial.height).toBe(135);
    expect(inspect(initial.rgba).painted).toBe(0);
    expect(initial.depositedMass).toBe(0);
    const touched = sampleWetInk(spec, 12, { scale: .5 });
    expect(inspect(touched.rgba).painted).toBeGreaterThan(20);
    expect(touched.depositedMass).toBeGreaterThan(0);
  });

  it("spreads on fibres after contact, absorbs pigment and loses water before drying", () => {
    const justFinished = sampleWetInk(spec, 36, { scale: .5, bleed: .85 });
    const absorbed = sampleWetInk(spec, 53, { scale: .5, bleed: .85 });
    expect(absorbed.depositedMass).toBeCloseTo(justFinished.depositedMass, 5);
    expect(absorbed.absorbedMass).toBeGreaterThan(justFinished.absorbedMass);
    expect(absorbed.waterMass).toBeLessThan(justFinished.waterMass);
    // A fine ink halo must expand after the brush leaves, rather than a static SVG path.
    expect(inspect(absorbed.rgba).painted).toBeGreaterThan(inspect(justFinished.rgba).painted);
    const noSpread = sampleWetInk(spec, 53, { scale: .5, bleed: 0 });
    expect(inspect(absorbed.rgba).painted).toBeGreaterThan(inspect(noSpread.rgba).painted);
  });

  it("conserves deposited pigment approximately as the wash expands", () => {
    const first = sampleWetInk(spec, 36, { scale: .5, bleed: .72 });
    const later = sampleWetInk(spec, 53, { scale: .5, bleed: .72 });
    expect(Math.abs(first.pigmentMass - later.pigmentMass) / first.pigmentMass).toBeLessThan(.08);
    expect(later.pigmentMass).toBeGreaterThan(0);
  });

  it("is seek-order independent, completely stable when dry, and honours reduced motion", () => {
    const at40 = sampleWetInk(spec, 40, { scale: .5 });
    sampleWetInk(spec, 0); sampleWetInk(spec, 102); sampleWetInk(spec, 5);
    expect(sampleWetInk(spec, 40, { scale: .5 }).rgba).toEqual(at40.rgba);
    const dry = sampleWetInk(spec, 110, { scale: .5 });
    expect(sampleWetInk(spec, 150, { scale: .5 }).rgba).toEqual(dry.rgba);
    expect(sampleWetInk(spec, 0, { scale: .5, reducedMotion: true }).rgba).toEqual(dry.rgba);
  });

  it("distinguishes loaded wash from fast dry-brush contact without paper-wide texture", () => {
    const wet = sampleWetInk(spec, 53, { scale: .5 });
    const drySpec = { ...spec, strokes: [{ ...spec.strokes[0], dryness: .95, load: .31 }] };
    const dry = sampleWetInk(drySpec, 53, { scale: .5 });
    expect(inspect(wet.rgba).alphaSum).toBeGreaterThan(inspect(dry.rgba).alphaSum);
    expect(dry.waterMass).toBeLessThan(wet.waterMass);
    expect(dry.width).toBe(wet.width);
    // Blank top edge must remain transparent: paper is composited separately.
    expect(dry.rgba.slice(0, dry.width * 4).every(x => x === 0)).toBe(true);
  });

  it("provides a portable browser PNG with alpha, not a fake SVG filter", () => {
    const wet = sampleWetInk(spec, 53, { scale: .5 });
    const png = encodeWetInkPng(wet);
    expect([...png.slice(0, 8)]).toEqual([137,80,78,71,13,10,26,10]);
    expect([...png.slice(12,16)]).toEqual([73,72,68,82]);
    expect(png.byteLength).toBeGreaterThan(2000);
    expect(() => sampleWetInk(spec, -1)).toThrow(/frame/);
    expect(() => sampleWetInk(spec, 50, { scale: 0 })).toThrow(/scale/);
  });
});
