import { describe, expect, it } from "vitest";
import {
  INK_TONES, evaluateInkStroke, evaluateInkWash, flyingWhite, inkHash,
  inkHoldFrame, inkOutline, inkSamples, inspectInkWash,
} from "../registry/video/ink-wash";
import type { InkStroke, InkWashSpec } from "../registry/video/ink-wash";

const stroke = (id: string, points: readonly (readonly [number, number, number])[], look: Pick<InkStroke, "width" | "tone" | "water" | "startFrame" | "drawFrames">): InkStroke => ({
  id, points: points.map(([x, y, pressure]) => ({ x, y, pressure })), load: .88, spreadFrames: 28, dryFrames: 44, ...look,
});
/** One dry, dark stroke and one wet, pale stroke: the two ends of the moisture range. */
const spec: InkWashSpec = {
  version: 1, width: 960, height: 540, paper: "#F4F0E5", ink: "#20282A", accent: "#A63A2B", seed: 29, absorption: .69, grain: .5,
  strokes: [
    stroke("dry-trunk", [[220, 429, .82], [240, 393, .93], [250, 363, .64], [280, 330, .86], [275, 294, .23]],
      { width: 21, tone: INK_TONES.black, water: .19, startFrame: 59, drawFrames: 38 }),
    stroke("wet-ridge", [[566, 343, .07], [663, 304, .25], [751, 274, .5], [816, 300, .29], [944, 327, .06]],
      { width: 18, tone: INK_TONES.pale, water: .97, startFrame: 4, drawFrames: 41 }),
  ],
};
const [dry, wet] = spec.strokes;

describe("INK1 pressure-shaped paper pigment engine", () => {
  it("exposes five calibrated values and retains distinct pressure/brush moisture inputs", () => {
    expect(Object.values(INK_TONES)).toHaveLength(5);
    expect(Object.values(INK_TONES)).toEqual([.16, .31, .5, .73, 1]);
    expect(spec.strokes.some(s => s.water < .3)).toBe(true);
    expect(spec.strokes.some(s => s.water > .9)).toBe(true);
    expect(spec.strokes.some(s => s.points[0].pressure !== s.points[1].pressure)).toBe(true);
    expect(inspectInkWash(spec)).toEqual([]);
  });
  it("rejects duplicate ids, invalid tone, nonfinite control points, missing accent and bad timelines", () => {
    const a = spec.strokes[0];
    const broken = {
      ...spec, accent: undefined,
      strokes: [a, { ...a, tone: 2, points: [{ ...a.points[0], x: Number.NaN }, a.points[1]],
        drawFrames: 0, accent: true }],
    };
    const codes = inspectInkWash(broken).map(i => i.code);
    expect(codes).toEqual(expect.arrayContaining(["stroke-id", "brush-tone", "point", "timing", "accent"]));
    expect(inspectInkWash({ ...spec, seed: -1 }).map(p => p.code)).toContain("seed");
  });
  it("separates deposition, capillary spread, absorption and drying on one seekable frame axis", () => {
    const s = spec.strokes[0];
    const before = evaluateInkStroke(s, 0);
    expect(before.deposit).toBe(0);
    expect(before.spread).toBe(0);
    expect(before.absorbed).toBe(0);
    expect(before.dry).toBe(0);
    const drawing = evaluateInkStroke(s, s.startFrame + Math.floor(s.drawFrames * .7));
    expect(drawing.deposit).toBeGreaterThan(0);
    expect(drawing.deposit).toBeLessThan(1);
    expect(drawing.dry).toBe(0);
    const finished = evaluateInkStroke(s, inkHoldFrame(spec));
    expect(finished).toMatchObject({ deposit: 1, spread: 1, absorbed: 1, dry: 1 });
    const future = evaluateInkWash(spec, inkHoldFrame(spec) + 70);
    evaluateInkWash(spec, 42);
    evaluateInkWash(spec, 1);
    expect(evaluateInkWash(spec, inkHoldFrame(spec) + 70)).toEqual(future);
    expect(evaluateInkWash(spec, 0, true).every(state => state.dry === 1)).toBe(true);
    expect(() => evaluateInkWash(spec, -1)).toThrow(RangeError);
  });
  it("samples curved centerlines with pressure, tapered ends and fixed seeded fibers", () => {
    const s = dry;
    const full = inkSamples(s, 1), half = inkSamples(s, .5);
    expect(full.length).toBeGreaterThan(half.length);
    expect(full[0].x).toBeCloseTo(s.points[0].x);
    expect(full[full.length - 1].y).toBeCloseTo(s.points[s.points.length - 1].y);
    expect(inkOutline(s, 23, 1)).toMatch(/^M/);
    expect(inkOutline(s, 23, 0)).toBe("");
    expect(inkOutline(s, 23, 1)).toBe(inkOutline(s, 23, 1));
    expect(inkOutline(s, 23, 1)).not.toEqual(inkOutline(s, 23, .5));
    expect(inkOutline(s, 23, 1)).not.toMatch(/NaN|Infinity/);
    expect(inkHash(29, 10, 4)).toBe(inkHash(29, 10, 4));
    expect(inkHash(29, 10, 4)).not.toBe(inkHash(29, 11, 4));
  });
  it("produces flying-white split in dry brush, not in water-loaded strokes", () => {
    expect(flyingWhite(dry, 47, 1).length).toBeGreaterThan(0);
    expect(flyingWhite(wet, 47, 1)).toEqual([]);
  });
});
