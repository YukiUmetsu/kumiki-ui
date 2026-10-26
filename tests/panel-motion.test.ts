import { describe, expect, it } from "vitest";
import { resolvePanelMotion } from "../registry/ui/panel-motion";

describe("panel motion", () => {
  it("returns a calm smooth default with independent backdrop timing", () => {
    const motion = resolvePanelMotion();
    expect(motion.durationMs).toBe(300);
    expect(motion.backdropMs).toBe(220);
    expect(motion.distance).toBe(100);
    expect(motion.opacity).toBe(0.42);
  });

  it("allows custom timing, geometry and actual spring parameters", () => {
    const result = resolvePanelMotion({ durationMs: 410, backdropMs: 120, distance: 60, opacity: 0.65, stiffness: 420, damping: 32 });
    expect(result).toMatchObject({
      durationMs: 410, backdropMs: 120, distance: 60, opacity: 0.65,
      spring: { stiffness: 420, damping: 32 },
    });
    expect(result.easing).toMatch(/^linear\(/);
  });

  it("clamps malformed/unsafe custom values rather than rendering broken panels", () => {
    const result = resolvePanelMotion({ durationMs: -20, backdropMs: Infinity, distance: NaN, opacity: 99, stiffness: 0, damping: -2 });
    expect(result).toMatchObject({ durationMs: 0, backdropMs: 220, distance: 100, opacity: 1 });
    expect(result.spring).toBeUndefined();
  });

  it("removes spatial motion under the reduced-motion preference", () => {
    const result = resolvePanelMotion("spring", true);
    expect(result).toMatchObject({ durationMs: 0, backdropMs: 0, distance: 0 });
    expect(result.spring).toBeUndefined();
  });

  it("recognizes all animation presets", () => {
    expect(resolvePanelMotion("none").durationMs).toBe(0);
    expect(resolvePanelMotion("subtle").durationMs).toBeLessThan(resolvePanelMotion("smooth").durationMs);
    expect(resolvePanelMotion("snappy").durationMs).toBeLessThan(resolvePanelMotion("smooth").durationMs);
    expect(resolvePanelMotion("spring").spring).toEqual({ stiffness: 350, damping: 34 });
  });

  it("keeps extreme finite spring inputs from producing invalid CSS", () => {
    const result = resolvePanelMotion({ stiffness: 1e308, damping: 1e308 });
    expect(result.spring).toEqual({ stiffness: 2000, damping: 120 });
    expect(result.easing).toMatch(/^linear\(/);
    expect(result.easing).not.toMatch(/NaN|Infinity/);
  });

  it("falls back safely if a runtime setting contains an unknown preset", () => {
    expect(resolvePanelMotion("from-old-storage" as "smooth")).toMatchObject({ durationMs: 300, distance: 100 });
  });
});
