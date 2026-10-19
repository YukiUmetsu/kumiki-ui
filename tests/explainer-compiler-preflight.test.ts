import { describe, expect, it } from "vitest";
import { createCameraTargetRegistry } from "../registry/motion/camera-targets";
import { compileExplainerSequence } from "../registry/visual/explainer-sequence";
import type { ExplainerSequenceSpec } from "../registry/visual/explainer-sequence";

const registry = createCameraTargetRegistry({
  revision: "xp1-compiler-fixture",
  targets: [{
    id: "subject",
    frames: [{ frame: 0, bounds: {
      min: [-1, -1, -1] as const, max: [1, 1, 1] as const,
    } }],
  }],
});
const base: ExplainerSequenceSpec = {
  schemaVersion: 1, id: "compiled-preflight", title: "Explain and summarize",
  fps: { num: 30, den: 1 }, output: { width: 1280, height: 720 },
  subjects: [{ id: "subject", protectText: true }],
  shots: [
    {
      id: "overview", durationFrames: 60,
      camera: { type: "establish", target: "subject", movement: "hold", framing: "wide" },
      explanation: "The source enters the process.",
      intent: { focusId: "subject", visualChange: "Reveal the source", mode: "establish" },
    },
    {
      id: "recap", role: "summary", durationFrames: 60,
      camera: { type: "inspect", target: "subject", movement: "hold", framing: "wide" },
      explanation: "The source remains identifiable.",
      intent: { focusId: "subject", visualChange: "Re-emphasize the same source", mode: "hold" },
    },
  ],
  preflight: {
    elements: [
      { id: "subject", semanticId: "source-1", role: "subject",
        bounds: { x: 80, y: 200, width: 240, height: 180 } },
      { id: "label", semanticId: "source-label", role: "label", text: "Source",
        bounds: { x: 650, y: 140, width: 160, height: 44 } },
    ],
  },
};

describe("explainer compilation and opt-in semantic preflight", () => {
  it("retains legacy compilation when semantic preflight is omitted", () => {
    const legacy: ExplainerSequenceSpec = {
      ...base, preflight: undefined,
      shots: base.shots.map(({ intent: _intent, ...shot }) => shot),
    };
    const result = compileExplainerSequence(legacy, registry);
    expect(result.ok, JSON.stringify(result.diagnostics)).toBe(true);
    if (result.ok) {
      expect(result.sequence.preflight).toBeUndefined();
      expect(result.sequence.durationFrames).toBe(120);
    }
  });

  it("runs sparse preflight automatically with one timeline and reports its coverage", () => {
    const result = compileExplainerSequence(base, registry);
    expect(result.ok, JSON.stringify(result.diagnostics)).toBe(true);
    if (!result.ok) return;
    expect(result.sequence.preflight).toMatchObject({ ok: true, inspectedFrames: 3, diagnostics: [] });
    expect(result.sequence.shots.map(s => [s.startFrame, s.endFrame])).toEqual([
      [0, 60], [60, 120],
    ]);
    expect(result.sequence.durationFrames).toBe(result.sequence.camera.timeline.durationFrames);
  });

  it("fails compilation when a declared label is clipped", () => {
    const bad: ExplainerSequenceSpec = { ...base, preflight: {
      ...base.preflight!, elements: base.preflight!.elements.map(element =>
        element.id === "label" ? { ...element,
          bounds: { x: 1200, y: 140, width: 160, height: 44 } } : element),
    }};
    const result = compileExplainerSequence(bad, registry);
    expect(result.ok).toBe(false);
    expect(result.diagnostics).toContainEqual(expect.objectContaining({
      code: "label-clipped", severity: "error", frame: 0,
    }));
  });

  it("requires explicit focus and observable visual intent for participating shots", () => {
    const bad: ExplainerSequenceSpec = { ...base, shots: base.shots.map((shot, i) =>
      i === 1 ? { ...shot, intent: undefined } : shot),
    };
    const result = compileExplainerSequence(bad, registry);
    expect(result.ok).toBe(false);
    expect(result.diagnostics).toContainEqual(expect.objectContaining({
      code: "explainer-sequence-invalid", path: "shots[1].intent",
    }));
  });

  it("derives semantic ranges after retiming; never needs a second duration", () => {
    const retimed: ExplainerSequenceSpec = { ...base,
      shots: base.shots.map((shot, index) => ({
        ...shot, durationFrames: index === 0 ? 40 : 80,
      })),
      preflight: { ...base.preflight!, samples: [{
        frame: 40, bounds: { label: { x: 1100, y: 140, width: 160, height: 44 } },
      }] },
    };
    const result = compileExplainerSequence(retimed, registry);
    expect(result.ok, JSON.stringify(result.diagnostics)).toBe(true);
    if (result.ok) expect(result.sequence.preflight?.inspectedFrames).toBe(3);
  });

  it("never lets custom samples bypass mandatory boundaries or unknown-geometry failures", () => {
    const bad: ExplainerSequenceSpec = { ...base, preflight: {
      ...base.preflight!,
      samples: [{ frame: 35, bounds: {
        missing: { x: 0, y: 0, width: 4, height: 4 },
      }}],
    }};
    const result = compileExplainerSequence(bad, registry);
    expect(result.ok).toBe(false);
    expect(result.diagnostics).toContainEqual(expect.objectContaining({
      code: "sample-bounds", frame: 35,
    }));
  });
});
