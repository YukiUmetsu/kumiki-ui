/**
 * Golden fixtures for the renderer-neutral 2D motion system — the MG1 stop
 * condition from docs/08 §12, checked against the docs/11 §6 quality gates.
 *
 * `examples/motion/<id>.json` (timelines and storyboards) and
 * `examples/motion/<id>.frames.json` (frame-coverage tables) are generated
 * output, never hand-edited. The only sanctioned way to refresh them is:
 *
 *   KM_WRITE_FIXTURES=1 npx vitest run tests/motion-fixtures.test.ts
 *
 * and then re-run the suite *without* the variable to prove the committed JSON
 * still round-trips byte-for-byte. The guard exists so the JSON cannot silently
 * drift from `serializeTimeline` / `serializeStoryboard`: a normal run only reads
 * and verifies, it never writes.
 *
 * The second half of this file is what makes the first half trustworthy: a
 * fixture whose frames do not match in shuffled order, whose values jump at a
 * handoff, whose morph silently vanishes or whose trim window leaves the source
 * path is not a golden example. Those properties are asserted from evaluated
 * values and geometry, not eyeballed from a screenshot.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  IDENTITY,
  evaluateMask,
  evaluateTimeline,
  morphShapes,
  normalizeTrimWindow,
  parseStoryboard,
  parseTimeline,
  pathBounds,
  pathTransformPoint,
  pointOnPath,
  resampleContour,
  sampleTrack,
  serializeStoryboard,
  serializeTimeline,
  toStoryboardClips,
  trimPath,
  validateStoryboard,
  validateTimeline,
} from "../registry/motion";
import type {
  AffineMatrix,
  AnimationTrack,
  ContourShape,
  MaskSpecLocal,
  MotionNode,
  MotionPath,
  MotionValue,
  MotionValueType,
  PathContour,
  PathTrimSpec,
  Vec2,
} from "../registry/motion";
import {
  MOTION_FIXTURES,
  MOTION_FIXTURE_DIGESTS,
  MOTION_FIXTURE_FRAMES,
  NEGATIVE_TIMELINES,
  STORYBOARD_EXAMPLES,
  fixtureById,
  fixtureDigest,
  sampleFixture,
  type MotionFixture,
} from "../src/motion/motion-fixtures";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const examplesDir = path.join(projectRoot, "examples", "motion");
const WRITE_FIXTURES = process.env.KM_WRITE_FIXTURES === "1";

/* ------------------------------------------------------------------ *
 * Documented tolerances and declared cuts
 * ------------------------------------------------------------------ */

/**
 * Motion-coherence tolerances, in value units per frame. A genuine discontinuity
 * (a teleport, a hidden end state) is orders of magnitude larger; legitimate
 * motion — even the underdamped emphasis spring — stays well below.
 */
const SCALAR_TOLERANCE = 0.5;
const VECTOR_TOLERANCE = 64;

/**
 * Discrete cuts the coherence gate must not flag, keyed `${outputKey}@${frame}`
 * (the frame the new value takes effect). `kinetic-title-30s` declares one
 * `step-end` jump on `step-marker.value` at the handoff cue frame.
 */
const DECLARED_CUTS: Record<string, string[]> = {
  "kinetic-title-30s": ["step-marker.value@456"],
};

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

function codesOf(diagnostics: Array<{ code: string }>): string[] {
  return [...new Set(diagnostics.map((diagnostic) => diagnostic.code))].sort();
}

function isFiniteValue(value: unknown): boolean {
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "string" || typeof value === "boolean" || value === null) return true;
  if (Array.isArray(value)) return value.every(isFiniteValue);
  if (typeof value === "object" && value !== null) {
    return Object.values(value as Record<string, unknown>).every(isFiniteValue);
  }
  return false;
}

function numericComponents(value: MotionValue, valueType: MotionValueType): number[] {
  switch (valueType) {
    case "number":
    case "opacity":
    case "length":
    case "angle":
      return typeof value === "number" ? [value] : [];
    case "vec2": {
      const vec = value as Vec2;
      return [vec.x, vec.y];
    }
    case "transform": {
      const matrix = value as AffineMatrix;
      return [matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f];
    }
    default:
      return [];
  }
}

function collectTracks(nodes: MotionNode[]): AnimationTrack[] {
  const out: AnimationTrack[] = [];
  const walk = (node: MotionNode): void => {
    switch (node.kind) {
      case "track":
        out.push(node.track);
        return;
      case "sequence":
      case "parallel":
        for (const child of node.children) walk(child);
        return;
      case "hold":
        if (node.child) walk(node.child);
        return;
      case "repeat":
        walk(node.child);
        return;
      case "stagger":
        for (const item of node.items) walk(item.node);
        return;
    }
  };
  for (const node of nodes) walk(node);
  return out;
}

/** A fixed-seed, deterministic Fisher–Yates permutation (never `Math.random`). */
function seededPermutation(size: number, seed: number): number[] {
  const order = Array.from({ length: size }, (_, index) => index);
  let state = seed >>> 0;
  const next = (): number => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state;
  };
  for (let i = size - 1; i > 0; i -= 1) {
    const j = next() % (i + 1);
    const swap = order[i];
    order[i] = order[j];
    order[j] = swap;
  }
  return order;
}

function discreteValue(fixture: MotionFixture, key: string): unknown {
  return evaluateTimeline(fixture.timeline, 0).samples[key]?.value;
}

/** Mirror of the morph module's closed-contour resampling (`resampleLoop`). */
function resampleLoopOf(contour: PathContour, count: number): Vec2[] {
  const loop = contour.points.map((point) => ({ x: point.x, y: point.y }));
  loop.push({ x: contour.points[0].x, y: contour.points[0].y });
  const resampled = resampleContour(loop, count + 1);
  resampled.pop();
  return resampled;
}

function framesTable(fixture: MotionFixture): string {
  return `${JSON.stringify(
    { id: fixture.id, digest: fixtureDigest(fixture), frames: MOTION_FIXTURE_FRAMES[fixture.id] },
    null,
    2,
  )}\n`;
}

/* ------------------------------------------------------------------ *
 * Generated JSON baselines (the generator guard)
 * ------------------------------------------------------------------ */

describe("motion fixtures: committed JSON baselines", () => {
  for (const fixture of MOTION_FIXTURES) {
    it(`${fixture.id} matches examples/motion/${fixture.id}.json byte-for-byte`, () => {
      const file = path.join(examplesDir, `${fixture.id}.json`);
      const expected = serializeTimeline(fixture.timeline);

      if (WRITE_FIXTURES) {
        mkdirSync(examplesDir, { recursive: true });
        writeFileSync(file, expected, "utf8");
        console.log(`[motion-fixtures] wrote ${path.relative(projectRoot, file)}`);
      }

      const onDisk = readFileSync(file, "utf8");
      expect(onDisk).toBe(expected);

      const parsed = parseTimeline(onDisk);
      expect(parsed.timeline).not.toBeNull();
      expect(serializeTimeline(parsed.timeline!)).toBe(onDisk);
    });

    it(`${fixture.id} coverage table matches examples/motion/${fixture.id}.frames.json`, () => {
      const file = path.join(examplesDir, `${fixture.id}.frames.json`);
      const expected = framesTable(fixture);

      if (WRITE_FIXTURES) {
        mkdirSync(examplesDir, { recursive: true });
        writeFileSync(file, expected, "utf8");
        console.log(`[motion-fixtures] wrote ${path.relative(projectRoot, file)}`);
      }

      expect(readFileSync(file, "utf8")).toBe(expected);
    });
  }

  for (const example of STORYBOARD_EXAMPLES) {
    it(`${example.id} matches examples/motion/${example.id}.json byte-for-byte`, () => {
      const file = path.join(examplesDir, `${example.id}.json`);
      const expected = serializeStoryboard(example.board);

      if (WRITE_FIXTURES) {
        mkdirSync(examplesDir, { recursive: true });
        writeFileSync(file, expected, "utf8");
        console.log(`[motion-fixtures] wrote ${path.relative(projectRoot, file)}`);
      }

      const onDisk = readFileSync(file, "utf8");
      expect(onDisk).toBe(expected);
      expect(parseStoryboard(onDisk).board).not.toBeNull();
    });
  }
});

/* ------------------------------------------------------------------ *
 * Positive validation
 * ------------------------------------------------------------------ */

describe("motion fixtures: validation", () => {
  for (const fixture of MOTION_FIXTURES) {
    it(`${fixture.id} validates with zero diagnostics`, () => {
      const diagnostics = validateTimeline(fixture.timeline);
      expect(diagnostics.filter((diagnostic) => diagnostic.severity === "error")).toEqual([]);
      expect(diagnostics.filter((diagnostic) => diagnostic.severity === "warning")).toEqual([]);
    });
  }
});

/* ------------------------------------------------------------------ *
 * Frame coverage (docs/11 §6)
 * ------------------------------------------------------------------ */

describe("motion fixtures: frame coverage", () => {
  for (const fixture of MOTION_FIXTURES) {
    it(`${fixture.id} coverage is sorted, unique and inside [0, durationFrames)`, () => {
      const frames = MOTION_FIXTURE_FRAMES[fixture.id];
      expect(frames.length).toBeGreaterThan(0);
      expect(frames).toEqual([...new Set(frames)].sort((a, b) => a - b));
      for (const frame of frames) {
        expect(Number.isInteger(frame)).toBe(true);
        expect(frame).toBeGreaterThanOrEqual(0);
        expect(frame).toBeLessThan(fixture.timeline.durationFrames);
      }
      expect(frames).toContain(0);
      expect(frames).toContain(fixture.timeline.durationFrames - 1);
      for (const cue of fixture.timeline.cues ?? []) expect(frames).toContain(cue.frame);
    });
  }
});

/* ------------------------------------------------------------------ *
 * Coverage evaluation — finite values, no error diagnostics
 * ------------------------------------------------------------------ */

describe("motion fixtures: coverage evaluation", () => {
  for (const fixture of MOTION_FIXTURES) {
    it(`${fixture.id} yields finite values and no error diagnostic at every coverage frame`, () => {
      for (const frame of MOTION_FIXTURE_FRAMES[fixture.id]) {
        const result = evaluateTimeline(fixture.timeline, frame);
        expect(result.diagnostics.filter((diagnostic) => diagnostic.severity === "error"), `frame ${frame}`).toEqual(
          [],
        );
        for (const [key, sample] of Object.entries(result.samples)) {
          expect(isFiniteValue(sample.value), `${key} at ${frame}`).toBe(true);
        }
      }
    });
  }
});

/* ------------------------------------------------------------------ *
 * Determinism — seek order cannot change the result
 * ------------------------------------------------------------------ */

describe("motion fixtures: determinism", () => {
  for (const fixture of MOTION_FIXTURES) {
    it(`${fixture.id}: authored, reversed and shuffled seek orders agree per frame`, () => {
      const frames = MOTION_FIXTURE_FRAMES[fixture.id];
      const baseline = new Map(frames.map((frame) => [frame, evaluateTimeline(fixture.timeline, frame)]));

      const reversed = [...frames].reverse();
      const permuted = seededPermutation(frames.length, 0x9e3779b1).map((index) => frames[index]);

      for (const order of [reversed, permuted]) {
        for (const frame of order) {
          expect(evaluateTimeline(fixture.timeline, frame)).toEqual(baseline.get(frame));
        }
      }
    });

    it(`${fixture.id}: evaluating the same frame twice is identical`, () => {
      for (const frame of MOTION_FIXTURE_FRAMES[fixture.id]) {
        expect(evaluateTimeline(fixture.timeline, frame)).toEqual(evaluateTimeline(fixture.timeline, frame));
      }
    });
  }
});

/* ------------------------------------------------------------------ *
 * Motion coherence — no discontinuity except declared cuts
 * ------------------------------------------------------------------ */

describe("motion fixtures: motion coherence", () => {
  for (const fixture of MOTION_FIXTURES) {
    it(`${fixture.id}: no per-frame delta exceeds the documented tolerance`, () => {
      const frames = MOTION_FIXTURE_FRAMES[fixture.id];
      const cuts = new Set(DECLARED_CUTS[fixture.id] ?? []);
      const results = frames.map((frame) => evaluateTimeline(fixture.timeline, frame));

      for (let i = 1; i < frames.length; i += 1) {
        const previous = results[i - 1].samples;
        const next = results[i].samples;
        const gap = frames[i] - frames[i - 1];

        for (const key of Object.keys(next)) {
          // A value that appears or disappears at a frame is a declared visibility
          // cut (a hold ending, a repeat window opening) — not a value jump.
          if (!(key in previous)) continue;
          if (cuts.has(`${key}@${frames[i]}`)) continue;

          const before = numericComponents(previous[key].value, previous[key].valueType);
          const after = numericComponents(next[key].value, next[key].valueType);
          if (before.length === 0) continue;

          const valueType = next[key].valueType;
          const tolerance =
            valueType === "vec2" || valueType === "transform" ? VECTOR_TOLERANCE : SCALAR_TOLERANCE;
          const delta = Math.max(...before.map((value, index) => Math.abs(after[index] - value)));
          expect(delta / gap, `${key} at ${frames[i]}`).toBeLessThanOrEqual(tolerance);
        }
      }
    });
  }
});

/* ------------------------------------------------------------------ *
 * Endpoints hold
 * ------------------------------------------------------------------ */

describe("motion fixtures: endpoints hold", () => {
  for (const fixture of MOTION_FIXTURES) {
    it(`${fixture.id}: every track holds its first/last value outside its keyframe span`, () => {
      const tracks = collectTracks(fixture.timeline.nodes);
      expect(tracks.length).toBeGreaterThan(0);
      for (const track of tracks) {
        const frames = track.keyframes.map((keyframe) => keyframe.frame);
        const first = Math.min(...frames);
        const last = Math.max(...frames);
        expect(sampleTrack(track, first - 5).value, `${track.id} before first`).toEqual(
          sampleTrack(track, first).value,
        );
        expect(sampleTrack(track, last + 5).value, `${track.id} after last`).toEqual(
          sampleTrack(track, last).value,
        );
      }
    });
  }
});

/* ------------------------------------------------------------------ *
 * Shared element — one semanticId across a cross-fade
 * ------------------------------------------------------------------ */

describe("motion fixtures: shared-element handoff", () => {
  it("kinetic-title-30s carries one semanticId across a cross-fade, never a morph", () => {
    const fixture = fixtureById("kinetic-title-30s")!;
    const cue = (fixture.timeline.cues ?? []).find((entry) => entry.id === "cue-handoff");
    expect(cue).toBeDefined();
    expect(cue!.kind).toBe("shared-element");
    expect(cue!.targetId).toBe("focus-mark");

    const before = evaluateTimeline(fixture.timeline, 455).samples;
    const during = evaluateTimeline(fixture.timeline, 480).samples;
    const after = evaluateTimeline(fixture.timeline, 520).samples;

    // Shot A fades out across the handoff window; shot B fades in over the same window.
    expect(before["focus-mark-a.opacity"].value).toBeCloseTo(1, 6);
    expect(before["focus-mark-b.opacity"]).toBeUndefined();
    expect(during["focus-mark-a.opacity"].value as number).toBeGreaterThan(0);
    expect(during["focus-mark-a.opacity"].value as number).toBeLessThan(1);
    expect(during["focus-mark-b.opacity"].value as number).toBeGreaterThan(0);
    expect(during["focus-mark-b.opacity"].value as number).toBeLessThan(1);
    expect(after["focus-mark-a.opacity"]).toBeUndefined();
    expect(after["focus-mark-b.opacity"].value).toBeCloseTo(1, 6);
  });
});

/* ------------------------------------------------------------------ *
 * Geometry invariants (graphic-composition)
 * ------------------------------------------------------------------ */

describe("motion fixtures: geometry invariants", () => {
  const fixture = fixtureById("graphic-composition")!;
  const route = discreteValue(fixture, "graphic-path.data") as MotionPath;
  const trim = discreteValue(fixture, "graphic-trim.data") as PathTrimSpec;
  const morphFrom = discreteValue(fixture, "graphic-morph.from") as ContourShape;
  const morphTo = discreteValue(fixture, "graphic-morph.to") as ContourShape;
  const maskClip = discreteValue(fixture, "graphic-mask.clip") as MaskSpecLocal;
  const maskAlpha = discreteValue(fixture, "graphic-mask.alpha") as MaskSpecLocal;

  it("the geometry travels as data inside the timeline", () => {
    expect(route.anchors.length).toBeGreaterThanOrEqual(2);
    expect(pathBounds(route).width).toBeGreaterThan(0);
    expect(morphFrom.contours).toHaveLength(1);
    expect(maskClip.kind).toBe("clip");
    expect(maskAlpha.kind).toBe("alpha");
  });

  it("path trim windows stay within the source path bounds", () => {
    const bounds = pathBounds(route);
    for (let i = 0; i <= 20; i += 1) {
      const progress = i / 20;
      const window = normalizeTrimWindow({
        start: trim.start,
        end: trim.end * progress,
        offset: trim.offset,
        direction: trim.direction,
      });
      expect(window.startT).toBeGreaterThanOrEqual(0);
      expect(window.endT).toBeLessThanOrEqual(1);
      expect(window.startT).toBeLessThanOrEqual(window.endT);

      for (const point of trimPath(route, { start: trim.start, end: trim.end * progress }).points) {
        expect(point.x).toBeGreaterThanOrEqual(bounds.x - 1e-6);
        expect(point.x).toBeLessThanOrEqual(bounds.x + bounds.width + 1e-6);
        expect(point.y).toBeGreaterThanOrEqual(bounds.y - 1e-6);
        expect(point.y).toBeLessThanOrEqual(bounds.y + bounds.height + 1e-6);
      }
    }
  });

  it("pathTransformPoint is pointOnPath composed with the matrix", () => {
    for (let i = 0; i <= 10; i += 1) {
      const t = i / 10;
      expect(pathTransformPoint(route, t, IDENTITY)).toEqual(pointOnPath(route, t));
    }
  });

  it("mask reveal progress is monotonic non-decreasing", () => {
    let previous = Number.NEGATIVE_INFINITY;
    for (const frame of MOTION_FIXTURE_FRAMES["graphic-composition"]) {
      const value = evaluateTimeline(fixture.timeline, frame).samples["mask.progress"]?.value;
      if (typeof value !== "number") continue;
      expect(value).toBeGreaterThanOrEqual(previous);
      previous = value;
    }
    // The clip mask is fully open at progress 1; the alpha matte tracks progress.
    expect(evaluateMask(maskClip, 1).rect.width).toBeCloseTo(maskClip.rect.width, 9);
    expect(evaluateMask(maskAlpha, 0.5).opacity).toBeCloseTo(0.5, 9);
  });

  it("the morph mid-point lies between the two contours", () => {
    const count = 16;
    const result = morphShapes(morphFrom, morphTo, 0.5, { resampleCount: count });
    expect(result.mode).toBe("morph");

    const from = resampleLoopOf(morphFrom.contours[0], count);
    const to = resampleLoopOf(morphTo.contours[0], count);
    for (let i = 0; i < count; i += 1) {
      expect(result.contours[0].points[i].x).toBeCloseTo((from[i].x + to[i].x) / 2, 9);
      expect(result.contours[0].points[i].y).toBeCloseTo((from[i].y + to[i].y) / 2, 9);
    }
  });

  it("an incompatible morph reports its declared fallback instead of vanishing", () => {
    const badTo = discreteValue(fixture, "graphic-morph-bad.to") as ContourShape;
    const result = morphShapes(morphFrom, badTo, 0.5);
    expect(result.mode).toBe("dissolve");
    expect(result.diagnostics.some((diagnostic) => diagnostic.code === "morph-fallback-dissolve")).toBe(true);
    // The fallback keeps the source contours visible; it never drops them.
    expect(result.contours).toEqual(morphFrom.contours);
  });
});

/* ------------------------------------------------------------------ *
 * Interruption continuity
 * ------------------------------------------------------------------ */

describe("motion fixtures: interruption continuity", () => {
  it("the post-interruption value at the interrupt frame equals the pre-interruption value", () => {
    const base = fixtureById("interruption-base")!;
    const demo = fixtureById("interruption-demo")!;

    const before = evaluateTimeline(base.timeline, 240).samples["packet.position"].value as Vec2;
    const after = evaluateTimeline(demo.timeline, 240).samples["packet-echo.position"].value as Vec2;

    expect(Math.abs(after.x - before.x)).toBeLessThanOrEqual(1e-6);
    expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(1e-6);
  });

  it("the base timeline is untouched before the interrupt and gains exactly one node", () => {
    const base = fixtureById("interruption-base")!;
    const demo = fixtureById("interruption-demo")!;
    expect(demo.timeline.nodes.length).toBe(base.timeline.nodes.length + 1);

    for (const frame of [0, 100, 200, 239]) {
      expect(evaluateTimeline(demo.timeline, frame).samples["packet.position"].value).toEqual(
        evaluateTimeline(base.timeline, frame).samples["packet.position"].value,
      );
    }
  });
});

/* ------------------------------------------------------------------ *
 * Storyboard examples
 * ------------------------------------------------------------------ */

describe("motion storyboard examples", () => {
  for (const example of STORYBOARD_EXAMPLES) {
    it(`${example.id} validates with zero errors`, () => {
      const errors = validateStoryboard(example.board).filter((diagnostic) => diagnostic.severity === "error");
      expect(errors).toEqual([]);
    });

    it(`${example.id} clips tile the duration exactly`, () => {
      const clips = toStoryboardClips(example.board);
      expect(clips.length).toBeGreaterThan(0);
      let expected = 0;
      for (const clip of clips) {
        expect(clip.startFrame).toBe(expected);
        expected = clip.startFrame + clip.durationFrames;
      }
      expect(expected).toBe(example.board.durationFrames);
    });
  }
});

/* ------------------------------------------------------------------ *
 * Negative timelines — each fails with exactly its documented codes
 * ------------------------------------------------------------------ */

describe("motion fixtures: negative timelines", () => {
  for (const negative of NEGATIVE_TIMELINES) {
    it(`${negative.id} fails with exactly ${negative.expectedCodes.join(", ")}`, () => {
      expect(codesOf(validateTimeline(negative.timeline))).toEqual([...negative.expectedCodes].sort());
    });
  }
});

/* ------------------------------------------------------------------ *
 * Digests and accessors
 * ------------------------------------------------------------------ */

describe("motion fixtures: digests and accessors", () => {
  it("MOTION_FIXTURE_DIGESTS matches fixtureDigest for every fixture", () => {
    for (const fixture of MOTION_FIXTURES) {
      expect(MOTION_FIXTURE_DIGESTS[fixture.id]).toBe(fixtureDigest(fixture));
      expect(MOTION_FIXTURE_DIGESTS[fixture.id]).toMatch(/^[0-9a-f]{8}$/);
    }
  });

  it("fixtureById resolves known ids and returns null otherwise", () => {
    expect(fixtureById("kinetic-title-30s")).toBe(MOTION_FIXTURES[0]);
    expect(fixtureById("nope")).toBeNull();
  });

  it("sampleFixture flattens samples and honours an explicit frame list", () => {
    const fixture = fixtureById("kinetic-title-30s")!;
    const samples = sampleFixture(fixture, [0, 240]);
    expect(samples.map((entry) => entry.frame)).toEqual([0, 240]);
    expect(samples[0].values).toHaveProperty("tracker.position");
    expect(sampleFixture(fixture)).toHaveLength(MOTION_FIXTURE_FRAMES[fixture.id].length);
  });
});
