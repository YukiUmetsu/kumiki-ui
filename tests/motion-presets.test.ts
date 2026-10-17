/**
 * Presets + kinetic-type lane — deterministic coverage (docs/08 §3).
 *
 * These tests pin behaviour: preset value types, determinism, timing vs
 * amplitude separation, param clamping, the diagnostics contract, segmentation
 * (including the no-`Intl.Segmenter` fallback) and kinetic-text staggering.
 */

import { describe, expect, it } from "vitest";

import type {
  AffineMatrix,
  AnimationTrack,
  Diagnostic,
  MotionNode,
  MotionValueType,
  TrackNode,
  Vec2,
} from "../registry/motion/types";
import { DEFAULT_FPS } from "../registry/motion/constants";
import { validateValue } from "../registry/motion/interpolate";
import { evaluateTimeline, nodeDuration, outputKey } from "../registry/motion/timeline";
import { staggerStartFrames } from "../registry/motion/stagger";
import {
  MOTION_PRESETS,
  getPreset,
  listPresets,
  materializePreset,
  presetDefaults,
  resolveIntensity,
  resolveTiming,
} from "../registry/motion/presets";
import type { PresetInstance } from "../registry/motion/presets";
import {
  buildKineticTextTimeline,
  glyphRunIds,
  glyphTargetId,
  segmentText,
} from "../registry/motion/kinetic-text";
import type { KineticTextSpec } from "../registry/motion/kinetic-text";

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

function collectTracks(nodes: MotionNode[]): AnimationTrack[] {
  const out: AnimationTrack[] = [];
  const walk = (node: MotionNode): void => {
    if (node.kind === "track") {
      out.push(node.track);
      return;
    }
    if (node.kind === "sequence" || node.kind === "parallel") {
      for (const child of node.children) walk(child);
      return;
    }
    if (node.kind === "hold") {
      if (node.child) walk(node.child);
      return;
    }
    if (node.kind === "repeat") {
      walk(node.child);
      return;
    }
    for (const item of node.items) walk(item.node);
  };
  for (const node of nodes) walk(node);
  return out;
}

function firstTrack(nodes: MotionNode[]): AnimationTrack {
  const tracks = collectTracks(nodes);
  if (tracks.length === 0) throw new Error("expected at least one track");
  return tracks[0];
}

function spanOf(nodes: MotionNode[]): number {
  const track = firstTrack(nodes);
  return track.keyframes[track.keyframes.length - 1].frame - track.keyframes[0].frame;
}

function findDiagnostic(diags: Diagnostic[], code: string): Diagnostic | undefined {
  return diags.find((d) => d.code === code);
}

function transformScales(track: AnimationTrack): number[] {
  return track.keyframes.map((kf) => (kf.value as AffineMatrix).a);
}

function ctx() {
  return { fps: DEFAULT_FPS, cueFrames: {}, diagnostics: [] };
}

const EXPECTED_TYPES: Record<string, MotionValueType[]> = {
  "fade-reveal": ["opacity"],
  "rise-reveal": ["vec2", "opacity"],
  "scale-pop": ["transform"],
  "slide-exit": ["vec2", "opacity"],
  "wipe-reveal": ["length"],
  "track-in": ["number"],
  "handoff-swap": ["opacity"],
};

function baseSpec(overrides: Partial<KineticTextSpec> = {}): KineticTextSpec {
  return {
    id: "headline",
    text: "Kinetic",
    granularity: "grapheme",
    startFrame: 0,
    durationFrames: 200,
    ...overrides,
  };
}

function opacityAt(
  result: ReturnType<typeof buildKineticTextTimeline>,
  frame: number,
): number[] {
  const evaluated = evaluateTimeline(result.timeline, frame);
  return result.glyphIds.map((id) => {
    const sample = evaluated.samples[outputKey(id, "opacity")];
    return sample && typeof sample.value === "number" ? sample.value : -1;
  });
}

/* ------------------------------------------------------------------ *
 * Catalogue
 * ------------------------------------------------------------------ */

describe("preset catalogue", () => {
  it("exposes a stable, serializable catalogue", () => {
    const list = listPresets();
    expect(list.map((p) => p.name)).toEqual([
      "fade-reveal",
      "rise-reveal",
      "scale-pop",
      "slide-exit",
      "wipe-reveal",
      "track-in",
      "handoff-swap",
    ]);
    for (const entry of list) {
      expect(typeof entry.name).toBe("string");
      expect(entry.version).toBeGreaterThanOrEqual(1);
      expect(["reveal", "emphasis", "exit", "handoff", "kinetic"]).toContain(entry.role);
      expect(entry.description.length).toBeGreaterThan(0);
      expect(entry.params.length).toBeGreaterThan(0);
      for (const param of entry.params) {
        expect(typeof param.name).toBe("string");
        expect(typeof param.default).toBe("number");
      }
    }
    expect(Object.keys(MOTION_PRESETS).sort()).toEqual(list.map((p) => p.name).sort());
    // The catalogue is plain data (no functions) and round-trips through JSON.
    expect(JSON.parse(JSON.stringify(list))).toEqual(list);
  });

  it("resolves presets by name and version", () => {
    expect(getPreset("fade-reveal")?.version).toBe(1);
    expect(getPreset("fade-reveal", 1)).not.toBeNull();
    expect(getPreset("fade-reveal", 99)).toBeNull();
    expect(getPreset("does-not-exist")).toBeNull();
  });

  it("returns fresh defaults that do not alias the preset", () => {
    const preset = getPreset("rise-reveal");
    expect(preset).not.toBeNull();
    if (!preset) return;
    expect(preset.defaults.distance).toBe(24);
    const copy = presetDefaults(preset);
    copy.distance = 999;
    expect(preset.defaults.distance).toBe(24);
  });
});

/* ------------------------------------------------------------------ *
 * Builds
 * ------------------------------------------------------------------ */

describe("preset builds", () => {
  it("builds nodes whose value types and values match the declaration", () => {
    for (const name of Object.keys(EXPECTED_TYPES)) {
      const { nodes, diagnostics } = materializePreset({ preset: name, targetId: "layer-1", startFrame: 0 });
      expect(nodes.length).toBeGreaterThan(0);
      expect(diagnostics).toEqual([]);

      const tracks = collectTracks(nodes);
      expect(tracks.map((t) => t.valueType).sort()).toEqual([...EXPECTED_TYPES[name]].sort());
      for (const track of tracks) {
        expect(track.keyframes.length).toBeGreaterThan(0);
        for (const keyframe of track.keyframes) {
          expect(validateValue(track.valueType, keyframe.value)).toBeNull();
        }
      }
      // Node output is plain data.
      expect(JSON.parse(JSON.stringify(nodes))).toEqual(nodes);
    }
  });

  it("materializes identical output for identical instances (determinism)", () => {
    const instance: PresetInstance = {
      preset: "scale-pop",
      targetId: "hero",
      startFrame: 5,
      timing: 24,
      intensity: 0.7,
      params: { overshoot: 0.2 },
    };
    const a = materializePreset(instance);
    const b = materializePreset(instance);
    expect(a.nodes).toEqual(b.nodes);
    expect(a.diagnostics).toEqual(b.diagnostics);
    expect(JSON.stringify(a.nodes)).toBe(JSON.stringify(b.nodes));
    // The input is never mutated.
    expect(instance).toEqual({
      preset: "scale-pop",
      targetId: "hero",
      startFrame: 5,
      timing: 24,
      intensity: 0.7,
      params: { overshoot: 0.2 },
    });
  });

  it("treats timing as duration only", () => {
    const short = materializePreset({ preset: "fade-reveal", targetId: "a", startFrame: 0, timing: 10 });
    const long = materializePreset({ preset: "fade-reveal", targetId: "a", startFrame: 0, timing: 40 });
    expect(spanOf(short.nodes)).toBe(10);
    expect(spanOf(long.nodes)).toBe(40);
    expect(nodeDuration(short.nodes[0], ctx())).toBe(10);
    expect(nodeDuration(long.nodes[0], ctx())).toBe(40);
    // Endpoint values are identical across durations.
    expect(firstTrack(short.nodes).keyframes.map((k) => k.value)).toEqual([0, 1]);
    expect(firstTrack(long.nodes).keyframes.map((k) => k.value)).toEqual([0, 1]);

    const offsetNodes = materializePreset({ preset: "fade-reveal", targetId: "a", startFrame: 12, timing: 10 }).nodes;
    expect((offsetNodes[0] as TrackNode).offset).toBe(12);
  });

  it("scales amplitude with intensity and never duration", () => {
    const builds = [0, 0.5, 1].map((intensity) =>
      materializePreset({ preset: "scale-pop", targetId: "chip", startFrame: 0, timing: 30, intensity }),
    );

    for (const build of builds) {
      expect(spanOf(build.nodes)).toBe(30);
    }

    const scales = builds.map((build) => transformScales(firstTrack(build.nodes)));
    for (const series of scales) {
      expect(series[0]).toBeCloseTo(0.6, 10);
      expect(series[series.length - 1]).toBeCloseTo(1, 10);
    }

    const peaks = scales.map((series) => Math.max(...series));
    expect(peaks[0]).toBeCloseTo(1, 6);
    expect(peaks[1]).toBeCloseTo(1.04, 6);
    expect(peaks[2]).toBeCloseTo(1.08, 6);
    expect(peaks[2]).toBeGreaterThan(peaks[1]);
    expect(peaks[1]).toBeGreaterThan(peaks[0]);
  });

  it("scales travel distance with intensity (rise-reveal)", () => {
    const endpoints = (intensity: number): { start: number; end: number } => {
      const { nodes } = materializePreset({ preset: "rise-reveal", targetId: "t", startFrame: 0, timing: 12, intensity });
      const position = collectTracks(nodes).find((t) => t.valueType === "vec2");
      expect(position).toBeDefined();
      if (!position) return { start: NaN, end: NaN };
      const first = position.keyframes[0].value as Vec2;
      const last = position.keyframes[position.keyframes.length - 1].value as Vec2;
      return { start: first.y, end: last.y };
    };

    expect(endpoints(1).start).toBeCloseTo(24, 10);
    expect(endpoints(0.5).start).toBeCloseTo(12, 10);
    expect(endpoints(0).start).toBeCloseTo(0, 10);
    expect(endpoints(1).end).toBeCloseTo(0, 10);
    expect(endpoints(0.5).end).toBeCloseTo(0, 10);
  });

  it("clamps params to declared bounds and warns on unknown keys", () => {
    const high = materializePreset({
      preset: "rise-reveal",
      targetId: "t",
      startFrame: 0,
      timing: 10,
      params: { distance: 9999, bogus: 1 },
    });
    expect(findDiagnostic(high.diagnostics, "preset-param-unknown")?.severity).toBe("warning");
    expect(high.diagnostics.filter((d) => d.code === "preset-param-unknown")).toHaveLength(1);
    const position = collectTracks(high.nodes).find((t) => t.valueType === "vec2");
    expect((position?.keyframes[0].value as Vec2).y).toBeCloseTo(400, 10);

    const low = materializePreset({
      preset: "rise-reveal",
      targetId: "t",
      startFrame: 0,
      timing: 10,
      params: { distance: -50 },
    });
    expect(low.diagnostics).toEqual([]);
    const positionLow = collectTracks(low.nodes).find((t) => t.valueType === "vec2");
    expect((positionLow?.keyframes[0].value as Vec2).y).toBeCloseTo(0, 10);
  });
});

/* ------------------------------------------------------------------ *
 * Diagnostics contract
 * ------------------------------------------------------------------ */

describe("materialize diagnostics", () => {
  it("errors on an unknown preset and returns no nodes", () => {
    const result = materializePreset({ preset: "nope", targetId: "t", startFrame: 0 });
    expect(result.nodes).toEqual([]);
    expect(findDiagnostic(result.diagnostics, "preset-unknown")?.severity).toBe("error");
  });

  it("warns on a version mismatch but still builds", () => {
    const result = materializePreset({ preset: "fade-reveal", version: 2, targetId: "t", startFrame: 0 });
    expect(result.nodes.length).toBeGreaterThan(0);
    expect(findDiagnostic(result.diagnostics, "preset-version-mismatch")?.severity).toBe("warning");
  });

  it("errors when the target is missing", () => {
    const result = materializePreset({ preset: "fade-reveal", targetId: "", startFrame: 0 });
    expect(result.nodes).toEqual([]);
    expect(findDiagnostic(result.diagnostics, "preset-target-missing")?.severity).toBe("error");
  });

  it("resolves timing from defaults and clamps intensity silently", () => {
    const preset = getPreset("wipe-reveal");
    expect(preset).not.toBeNull();
    if (!preset) return;
    expect(resolveTiming(undefined, preset)).toBe(preset.defaults.durationFrames);
    expect(resolveTiming(0, preset)).toBe(1);
    expect(resolveTiming(-5, preset)).toBe(1);
    expect(resolveTiming(12.6, preset)).toBe(13);

    expect(resolveIntensity(undefined)).toBe(1);
    expect(resolveIntensity(-2)).toBe(0);
    expect(resolveIntensity(5)).toBe(1);
    expect(resolveIntensity(0.35)).toBe(0.35);
  });
});

/* ------------------------------------------------------------------ *
 * Segmentation
 * ------------------------------------------------------------------ */

describe("segmentText", () => {
  it("segments graphemes for Latin, CJK, emoji ZWJ and combining marks", () => {
    expect(segmentText("Hi", "grapheme")).toEqual(["H", "i"]);

    const cjk = segmentText("日本語テキスト", "grapheme");
    expect(cjk).toEqual(["日", "本", "語", "テ", "キ", "ス", "ト"]);
    expect(cjk.join("")).toBe("日本語テキスト");

    expect(segmentText("👩🏽‍💻", "grapheme")).toHaveLength(1);
    expect(segmentText("👩🏽‍💻", "grapheme")).toEqual(["👩🏽‍💻"]);

    const combining = "e\u0301"; // e + COMBINING ACUTE ACCENT
    expect(segmentText(combining, "grapheme")).toEqual([combining]);
  });

  it("splits lines on \\n only", () => {
    expect(segmentText("a\nb\nc", "line")).toEqual(["a", "b", "c"]);
    expect(segmentText("a\n\nb", "line")).toEqual(["a", "", "b"]);
    expect(segmentText("one", "line")).toEqual(["one"]);
  });

  it("segments words, discarding whitespace", () => {
    expect(segmentText("hello brave world", "word")).toEqual(["hello", "brave", "world"]);
    expect(segmentText("   ", "word")).toEqual([]);
    expect(segmentText("", "grapheme")).toEqual([]);
  });

  it("falls back to a combining-mark-aware scan without Intl.Segmenter", () => {
    const descriptor = Object.getOwnPropertyDescriptor(Intl, "Segmenter");
    Object.defineProperty(Intl, "Segmenter", { value: undefined, configurable: true, writable: true });
    try {
      expect(segmentText("👩🏽‍💻", "grapheme")).toEqual(["👩🏽‍💻"]);
      expect(segmentText("e\u0301", "grapheme")).toEqual(["e\u0301"]);
      expect(segmentText("ab", "grapheme")).toEqual(["a", "b"]);
      expect(segmentText("hello brave", "word")).toEqual(["hello", "brave"]);
    } finally {
      if (descriptor) Object.defineProperty(Intl, "Segmenter", descriptor);
      else delete (Intl as unknown as { Segmenter?: unknown }).Segmenter;
    }
  });
});

/* ------------------------------------------------------------------ *
 * Kinetic text
 * ------------------------------------------------------------------ */

describe("kinetic text", () => {
  it("derives stable glyph target ids", () => {
    expect(glyphTargetId("title", 3)).toBe("title-glyph-3");
    expect(glyphRunIds("title", 3)).toEqual(["title-glyph-0", "title-glyph-1", "title-glyph-2"]);
    expect(glyphRunIds("title", 0)).toEqual([]);
    expect(glyphRunIds("title", -4)).toEqual([]);
  });

  it("builds one glyph per token inside a single stagger node", () => {
    const result = buildKineticTextTimeline(
      baseSpec({ stagger: 3, timing: 12, durationFrames: 200 }),
    );
    expect(result.tokens).toEqual(["K", "i", "n", "e", "t", "i", "c"]);
    expect(result.glyphIds).toEqual(glyphRunIds("headline", 7));
    expect(result.timeline.nodes).toHaveLength(1);

    const node = result.timeline.nodes[0];
    expect(node.kind).toBe("stagger");
    if (node.kind !== "stagger") throw new Error("unreachable");
    expect(node.intervalFrames).toBe(3);
    expect(node.direction).toBe("forward");
    expect(node.items).toHaveLength(7);
    expect(node.offset).toBe(0);
    expect(result.diagnostics).toEqual([]);
  });

  it("spaces consecutive glyph start frames by exactly stagger", () => {
    const result = buildKineticTextTimeline(
      baseSpec({ text: "abcdef", stagger: 4, timing: 12, durationFrames: 300 }),
    );
    const node = result.timeline.nodes[0];
    if (node.kind !== "stagger") throw new Error("unreachable");
    const starts = staggerStartFrames(node.items, node.intervalFrames, node.direction);
    expect(starts).toHaveLength(6);
    for (let i = 1; i < starts.length; i += 1) {
      expect(starts[i] - starts[i - 1]).toBe(4);
    }
  });

  it("orders the first visible glyph by direction", () => {
    for (const direction of ["forward", "reverse", "from-center"] as const) {
      const result = buildKineticTextTimeline(
        baseSpec({ text: "abcdef", direction, stagger: 3, timing: 12, durationFrames: 300 }),
      );
      const node = result.timeline.nodes[0];
      if (node.kind !== "stagger") throw new Error("unreachable");
      const starts = staggerStartFrames(node.items, node.intervalFrames, node.direction);
      const rankZero = starts.map((start, i) => ({ start, i })).filter((x) => x.start === 0).map((x) => x.i);

      const visible = opacityAt(result, 1)
        .map((value, i) => (value > 0 ? i : -1))
        .filter((i) => i >= 0);
      expect(visible).toEqual(rankZero);
      expect(rankZero).toHaveLength(1);
    }
  });

  it("is deterministic for the same spec", () => {
    const spec = baseSpec({ text: "日本語", stagger: 2, timing: 10, durationFrames: 120 });
    const a = buildKineticTextTimeline(spec);
    const b = buildKineticTextTimeline(spec);
    expect(a.timeline).toEqual(b.timeline);
    expect(a.tokens).toEqual(b.tokens);
    expect(a.glyphIds).toEqual(b.glyphIds);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("uses rise-reveal by default and honours a custom preset", () => {
    const byDefault = buildKineticTextTimeline(
      baseSpec({ text: "ab", timing: 10, durationFrames: 120 }),
    );
    const properties = collectTracks(byDefault.timeline.nodes).map((t) => t.property);
    expect(properties).toContain("position");
    expect(properties).toContain("opacity");

    const custom = buildKineticTextTimeline(
      baseSpec({ text: "ab", preset: "fade-reveal", timing: 10, durationFrames: 120 }),
    );
    expect(collectTracks(custom.timeline.nodes).map((t) => t.property)).toEqual(["opacity", "opacity"]);
  });

  it("maps spec distance and gap onto declared preset params without noise", () => {
    const rise = buildKineticTextTimeline(
      baseSpec({ text: "ab", preset: "rise-reveal", distance: 100, gap: 5, timing: 10, durationFrames: 120 }),
    );
    expect(rise.diagnostics).toEqual([]);
    const position = collectTracks(rise.timeline.nodes).find((t) => t.valueType === "vec2");
    expect((position?.keyframes[0].value as Vec2).y).toBeCloseTo(100, 10);

    const track = buildKineticTextTimeline(
      baseSpec({ text: "ab", preset: "track-in", gap: 30, timing: 10, durationFrames: 120 }),
    );
    expect(track.diagnostics).toEqual([]);
    const spacing = collectTracks(track.timeline.nodes).find((t) => t.property === "letterSpacing");
    expect(spacing?.keyframes[0].value).toBeCloseTo(30, 10);
  });

  it("reports empty text", () => {
    const result = buildKineticTextTimeline(baseSpec({ text: "", durationFrames: 60 }));
    expect(result.tokens).toEqual([]);
    expect(result.timeline.nodes).toEqual([]);
    expect(findDiagnostic(result.diagnostics, "kinetic-text-empty")?.severity).toBe("error");
  });

  it("clamps a negative stagger to zero", () => {
    const result = buildKineticTextTimeline(
      baseSpec({ text: "abc", stagger: -3, timing: 8, durationFrames: 120 }),
    );
    const node = result.timeline.nodes[0];
    if (node.kind !== "stagger") throw new Error("unreachable");
    expect(node.intervalFrames).toBe(0);
    expect(findDiagnostic(result.diagnostics, "kinetic-text-stagger-clamped")?.severity).toBe("warning");
  });

  it("flags an overrun only when the run exceeds the duration", () => {
    const within = buildKineticTextTimeline(
      baseSpec({ text: "abcdef", stagger: 3, timing: 12, startFrame: 0, durationFrames: 40 }),
    );
    expect(findDiagnostic(within.diagnostics, "kinetic-text-overrun")).toBeUndefined();

    // span = 12 + 3 * 5 = 27 > 20
    const over = buildKineticTextTimeline(
      baseSpec({ text: "abcdef", stagger: 3, timing: 12, startFrame: 0, durationFrames: 20 }),
    );
    expect(findDiagnostic(over.diagnostics, "kinetic-text-overrun")?.severity).toBe("error");
  });

  it("propagates an unknown-preset error per glyph", () => {
    const result = buildKineticTextTimeline(
      baseSpec({ text: "ab", preset: "not-a-preset", durationFrames: 120 }),
    );
    expect(result.diagnostics.filter((d) => d.code === "preset-unknown")).toHaveLength(2);
    expect(findDiagnostic(result.diagnostics, "preset-unknown")?.severity).toBe("error");
  });
});
