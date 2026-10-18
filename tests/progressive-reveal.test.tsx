/**
 * `progressive-reveal` — construction, cue resolution, deterministic frame
 * evaluation and the shared DOM/SVG reveal slots.
 *
 * These tests pin behaviour, not implementation detail: invalid compositions
 * throw actionable errors, a compiled timeline resolves to existing MG1 preset
 * tracks plus a reveal-progress track, the same frame always produces the same
 * state, and `ProgressiveReveal`/`RevealItem`/`RevealLayer` agree on one
 * evaluation (including reduced motion).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { createRevealTimeline } from "../registry/motion/progressive-reveal";
import type { RevealStep } from "../registry/motion/progressive-reveal";
import {
  ProgressiveReveal,
  RevealItem,
  RevealLayer,
} from "../registry/motion/progressive-reveal-react";
import { evaluateTimeline, outputKey } from "../registry/motion/timeline";
import type { MotionTimeline } from "../registry/motion/types";

const FPS = { num: 30, den: 1 };

function fadeTimeline(): MotionTimeline {
  return createRevealTimeline({
    id: "reveal-basic",
    fps: FPS,
    durationFrames: 40,
    steps: [{ id: "hero", at: 0, effect: "fade", durationFrames: 20 }],
  });
}

function numberAt(timeline: MotionTimeline, frame: number, key: string): number {
  const sample = evaluateTimeline(timeline, frame).samples[key];
  if (typeof sample?.value !== "number") throw new Error(`no number sample for ${key}`);
  return sample.value;
}

beforeEach(() => {
  vi.stubGlobal("matchMedia", (media: string) => ({
    media, matches: false, onchange: null,
    addEventListener() {}, removeEventListener() {},
    addListener() {}, removeListener() {}, dispatchEvent: () => true,
  }));
});
afterEach(() => vi.unstubAllGlobals());

describe("createRevealTimeline — compilation and validation", () => {
  it("compiles each step to preset tracks plus a reveal-progress track", () => {
    const timeline = fadeTimeline();
    expect(timeline.schemaVersion).toBe(1);
    expect(timeline.id).toBe("reveal-basic");
    expect(timeline.fps).toEqual(FPS);
    expect(timeline.durationFrames).toBe(40);
    const ids = timeline.nodes.map((node) => node.id);
    expect(ids).toContain("hero-fade-reveal");
    expect(ids).toContain("hero-reveal-progress");
    expect(ids).toHaveLength(2);
  });

  it("rejects a missing id, short composition or invalid rational fps", () => {
    const steps: RevealStep[] = [{ id: "hero", at: 0 }];
    expect(() => createRevealTimeline({ id: "   ", fps: FPS, durationFrames: 40, steps }))
      .toThrow(/Cannot create progressive reveal/);
    expect(() => createRevealTimeline({ id: "x", fps: FPS, durationFrames: 1, steps }))
      .toThrow(/at least two composition frames/);
    expect(() => createRevealTimeline({ id: "x", fps: { num: 0, den: 1 }, durationFrames: 40, steps }))
      .toThrow(/positive integer rational FPS/);
    expect(() => createRevealTimeline({ id: "x", fps: { num: 30, den: 0 }, durationFrames: 40, steps }))
      .toThrow(/positive integer rational FPS/);
  });

  it("resolves numeric and cue anchors and rejects unresolvable ones", () => {
    const timeline = createRevealTimeline({
      id: "cue-anchors", fps: FPS, durationFrames: 60,
      cues: [{ id: "open", frame: 10 }],
      steps: [{ id: "hero", at: { cue: "open" }, durationFrames: 20 }],
    });
    expect(numberAt(timeline, 10, outputKey("hero", "opacity"))).toBe(0);
    expect(numberAt(timeline, 29, outputKey("hero", "opacity"))).toBe(1);

    expect(() => createRevealTimeline({
      id: "bad-cue", fps: FPS, durationFrames: 60,
      steps: [{ id: "hero", at: { cue: "missing" } }],
    })).toThrow(/cannot resolve/);

    expect(() => createRevealTimeline({
      id: "dup-cue", fps: FPS, durationFrames: 60,
      cues: [{ id: "open", frame: 10 }, { id: "open", frame: 20 }],
      steps: [{ id: "hero", at: 0 }],
    })).toThrow(/Reveal cue "open" is invalid/);

    expect(() => createRevealTimeline({
      id: "out-cue", fps: FPS, durationFrames: 60,
      cues: [{ id: "open", frame: 60 }],
      steps: [{ id: "hero", at: 0 }],
    })).toThrow(/Reveal cue "open" is invalid/);
  });

  it("validates step identity, duration, opacity and travel", () => {
    expect(() => createRevealTimeline({
      id: "dup-step", fps: FPS, durationFrames: 60,
      steps: [{ id: "hero", at: 0 }, { id: "hero", at: 10 }],
    })).toThrow(/unique non-empty ID/);

    expect(() => createRevealTimeline({
      id: "short-step", fps: FPS, durationFrames: 60,
      steps: [{ id: "hero", at: 0, durationFrames: 1 }],
    })).toThrow(/duration of at least two frames/);

    expect(() => createRevealTimeline({
      id: "overflow-step", fps: FPS, durationFrames: 60,
      steps: [{ id: "hero", at: 50, durationFrames: 20 }],
    })).toThrow(/fits the composition/);

    expect(() => createRevealTimeline({
      id: "opacity-step", fps: FPS, durationFrames: 60,
      steps: [{ id: "hero", at: 0, subduedOpacity: 2 }],
    })).toThrow(/opacity from 0 to 1/);

    expect(() => createRevealTimeline({
      id: "travel-step", fps: FPS, durationFrames: 60,
      steps: [{ id: "hero", at: 0, distance: 401 }],
    })).toThrow(/travel from 0 to 400 pixels/);
  });
});

describe("createRevealTimeline — deterministic evaluation", () => {
  it("fades and advances reveal progress from 0 to 1, then holds", () => {
    const timeline = fadeTimeline();
    expect(numberAt(timeline, 0, outputKey("hero", "opacity"))).toBe(0);
    expect(numberAt(timeline, 0, outputKey("hero", "revealProgress"))).toBe(0);
    expect(numberAt(timeline, 19, outputKey("hero", "opacity"))).toBeCloseTo(1, 9);
    expect(numberAt(timeline, 19, outputKey("hero", "revealProgress"))).toBe(1);
    expect(numberAt(timeline, 39, outputKey("hero", "opacity"))).toBe(1);
    expect(numberAt(timeline, 39, outputKey("hero", "revealProgress"))).toBe(1);
  });

  it("reduces emphasis at focusUntil while keeping the item visible", () => {
    const timeline = createRevealTimeline({
      id: "focus", fps: FPS, durationFrames: 200,
      cues: [{ id: "start", frame: 0 }, { id: "second", frame: 100 }],
      steps: [
        { id: "one", at: { cue: "start" }, effect: "fade", durationFrames: 20 },
        { id: "two", at: { cue: "second" }, effect: "fade", durationFrames: 20, focusUntil: 160, subduedOpacity: 0.4 },
      ],
    });
    expect(numberAt(timeline, 160, outputKey("two", "opacity"))).toBeCloseTo(1, 9);
    expect(numberAt(timeline, 179, outputKey("two", "opacity"))).toBeCloseTo(0.4, 9);
    expect(numberAt(timeline, 195, outputKey("two", "opacity"))).toBeCloseTo(0.4, 9);
    expect(numberAt(timeline, 195, outputKey("two", "revealProgress"))).toBe(1);

    expect(() => createRevealTimeline({
      id: "too-early", fps: FPS, durationFrames: 200,
      steps: [{ id: "one", at: 0, effect: "fade", durationFrames: 20, focusUntil: 10 }],
    })).toThrow(/cannot reduce emphasis yet/);
  });

  it("is deterministic and never mutates its inputs", () => {
    const steps: RevealStep[] = [{ id: "hero", at: 0, effect: "fade", durationFrames: 20 }];
    const snapshot = JSON.parse(JSON.stringify(steps));
    const timeline = createRevealTimeline({ id: "stable", fps: FPS, durationFrames: 40, steps });
    const a = evaluateTimeline(timeline, 10);
    const b = evaluateTimeline(timeline, 10);
    expect(a.samples).toEqual(b.samples);
    expect(steps).toEqual(snapshot);
  });
});

describe("ProgressiveReveal — shared DOM and SVG state", () => {
  function renderReveal(frame: number, reducedMotion?: boolean) {
    return render(
      <ProgressiveReveal timeline={fadeTimeline()} frame={frame} reducedMotion={reducedMotion}>
        <RevealItem targetId="hero">Hero content</RevealItem>
      </ProgressiveReveal>,
    );
  }

  it("marks a hidden item inert and aria-hidden before its entrance", () => {
    const { container } = renderReveal(0);
    expect(container.querySelector("[data-km-progressive-reveal]")).not.toBeNull();
    const item = container.querySelector("[data-km-reveal-item='hero']");
    expect(item).toHaveAttribute("data-reveal-phase", "hidden");
    expect(item).toHaveAttribute("aria-hidden", "true");
    expect(item).toHaveStyle({ visibility: "hidden", pointerEvents: "none" });
  });

  it("reports the entering phase mid-reveal", () => {
    const { container } = renderReveal(10);
    const item = container.querySelector("[data-km-reveal-item='hero']");
    expect(item).toHaveAttribute("data-reveal-phase", "entering");
    expect(item).toHaveAttribute("aria-hidden", "true");
  });

  it("exposes a fully interactive item at the end of the composition", () => {
    const { container } = renderReveal(39);
    const item = container.querySelector("[data-km-reveal-item='hero']");
    expect(item).toHaveAttribute("data-reveal-phase", "visible");
    expect(item).not.toHaveAttribute("aria-hidden");
    expect(item).not.toHaveAttribute("inert");
    expect(screen.getByText("Hero content")).toBeInTheDocument();
  });

  it("resolves reduced motion to the completed reveal", () => {
    const { container } = renderReveal(0, true);
    const item = container.querySelector("[data-km-reveal-item='hero']");
    expect(item).toHaveAttribute("data-reveal-phase", "visible");
    expect(item).not.toHaveAttribute("aria-hidden");
  });

  it("shares the same evaluation with SVG reveal layers", () => {
    const { container } = render(
      <ProgressiveReveal timeline={fadeTimeline()} frame={39} reducedMotion={false}>
        <svg>
          <RevealLayer targetId="hero"><text>Layer</text></RevealLayer>
        </svg>
      </ProgressiveReveal>,
    );
    const layer = container.querySelector("[data-km-reveal-layer='hero']");
    expect(layer).toHaveAttribute("data-reveal-phase", "visible");
    expect(layer).toHaveAttribute("opacity", "1");
    expect(layer).toHaveAttribute("transform", "translate(0 0)");
  });

  it("throws when an item references no authored target", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() =>
      render(
        <ProgressiveReveal timeline={fadeTimeline()} frame={0}>
          <RevealItem targetId="ghost">ghost</RevealItem>
        </ProgressiveReveal>,
      ),
    ).toThrow(/ghost/);
    error.mockRestore();
  });
});
