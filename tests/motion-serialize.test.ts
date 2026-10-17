/**
 * Serialize + validate lane — deterministic coverage for
 * `registry/motion/serialize` and `registry/motion/validate`.
 *
 * These tests pin behaviour: byte-stable canonical JSON, sorted/deduped
 * keyframes, tolerant parsing with the documented codes, FNV-1a hashing,
 * storyboard round-trips, every documented validation code (severity included),
 * document dispatch, determinism and input immutability.
 */

import { describe, expect, it } from "vitest";

import {
  normalizeTimeline,
  parseStoryboard,
  parseTimeline,
  serializeStoryboard,
  serializeTimeline,
  stableStringify,
  storyboardHash,
  timelineHash,
} from "../registry/motion/serialize";
import { validateMotionDocument, validateTimeline } from "../registry/motion/validate";
import type { Storyboard } from "../registry/motion/storyboard";
import type {
  AnimationTrack,
  Diagnostic,
  MotionOffset,
  MotionTimeline,
  TrackNode,
} from "../registry/motion/types";

/* ------------------------------------------------------------------ *
 * Fixtures and helpers
 * ------------------------------------------------------------------ */

const IDENTITY = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

const ERROR_CODES = [
  "motion-schema-version-unsupported",
  "motion-id-invalid",
  "motion-fps-invalid",
  "motion-duration-invalid",
  "motion-node-missing",
  "motion-node-id-missing",
  "motion-node-id-duplicate",
  "motion-keyframe-empty",
  "motion-keyframe-frame-invalid",
  "motion-keyframe-duplicate-frame",
  "motion-value-type-mismatch",
  "motion-value-not-finite",
  "motion-cue-invalid",
  "motion-cue-duplicate",
  "motion-offset-cue-missing",
  "motion-transform-duplicate-id",
  "motion-transform-parent-missing",
  "motion-transform-parent-cycle",
  "motion-constraint-target-missing",
  "motion-repeat-count-invalid",
  "motion-duplicate-writer",
  "motion-node-empty",
];

const WARNING_CODES = [
  "motion-keyframe-unordered",
  "motion-hold-child-overflow",
  "motion-frame-out-of-range",
  "motion-priority-tie",
  "motion-cue-unused",
  "motion-constraint-clamped",
  "motion-node-unreachable",
  "motion-no-duration",
];

const ALL_CODES = [...ERROR_CODES, ...WARNING_CODES].sort();

function trackNode(id: string, overrides: Partial<AnimationTrack> = {}, offset?: MotionOffset): TrackNode {
  const node: TrackNode = {
    kind: "track",
    id,
    track: {
      id,
      targetId: "box",
      property: "x",
      valueType: "number",
      keyframes: [
        { frame: 0, value: 0 },
        { frame: 10, value: 1 },
      ],
      ...overrides,
    },
  };
  if (offset !== undefined) node.offset = offset;
  return node;
}

function validTimeline(): MotionTimeline {
  return {
    schemaVersion: 1,
    id: "demo",
    fps: { num: 30, den: 1 },
    durationFrames: 120,
    cues: [{ id: "start", frame: 0 }],
    nodes: [
      trackNode("t-x", {
        keyframes: [
          { frame: 0, value: 0 },
          { frame: 60, value: 100 },
        ],
      }),
    ],
  };
}

function validStoryboard(): Storyboard {
  return {
    schemaVersion: 1,
    id: "board",
    title: "Board",
    fps: { num: 30, den: 1 },
    durationFrames: 100,
    shots: [
      {
        id: "a",
        sceneRef: "scene-a",
        startFrame: 0,
        durationFrames: 100,
        claim: "Claim",
        visualObjective: "Objective",
        focusTarget: "focus",
        onScreenLabels: ["Label"],
        staticFallback: "Still",
      },
    ],
  };
}

function codesOf(diagnostics: Diagnostic[]): string[] {
  return [...new Set(diagnostics.map((diagnostic) => diagnostic.code))].sort();
}

function hasCode(diagnostics: Diagnostic[], code: string): boolean {
  return diagnostics.some((diagnostic) => diagnostic.code === code);
}

/* ------------------------------------------------------------------ *
 * stableStringify
 * ------------------------------------------------------------------ */

describe("stableStringify", () => {
  it("sorts object keys by code-unit order at every depth regardless of insertion order", () => {
    const first = { b: 1, a: { d: 4, c: 3 } };
    const second = { a: { c: 3, d: 4 }, b: 1 };

    expect(stableStringify(first)).toBe('{"a":{"c":3,"d":4},"b":1}');
    expect(stableStringify(first)).toBe(stableStringify(second));
  });

  it("keeps arrays in order and omits undefined object values", () => {
    expect(stableStringify({ z: [3, 1, 2], a: undefined, b: "x" })).toBe('{"b":"x","z":[3,1,2]}');
  });

  it("rejects non-finite numbers with a path", () => {
    expect(() => stableStringify({ a: { b: Number.NaN } })).toThrow(/a\.b/);
    expect(() => stableStringify([1, Number.POSITIVE_INFINITY])).toThrow(/\[1\]/);
  });

  it("indents with the space argument", () => {
    expect(stableStringify({ a: 1 }, 2)).toBe('{\n  "a": 1\n}');
    expect(stableStringify({ a: 1 }, 0)).toBe('{"a":1}');
  });
});

/* ------------------------------------------------------------------ *
 * normalizeTimeline
 * ------------------------------------------------------------------ */

describe("normalizeTimeline", () => {
  it("sorts keyframes ascending and de-duplicates duplicate frames (last wins)", () => {
    const timeline = validTimeline();
    timeline.nodes = [
      trackNode("t", {
        keyframes: [
          { frame: 20, value: 2 },
          { frame: 10, value: 1 },
          { frame: 20, value: 3 },
        ],
      }),
    ];

    const node = normalizeTimeline(timeline).nodes[0];
    if (node.kind !== "track") throw new Error("expected a track node");
    expect(node.track.keyframes.map((keyframe) => keyframe.frame)).toEqual([10, 20]);
    expect(node.track.keyframes.map((keyframe) => keyframe.value)).toEqual([1, 3]);
  });

  it("orders cues by frame then id", () => {
    const timeline = validTimeline();
    timeline.cues = [
      { id: "b", frame: 5 },
      { id: "a", frame: 5 },
      { id: "c", frame: 1 },
    ];

    expect(normalizeTimeline(timeline).cues?.map((cue) => cue.id)).toEqual(["c", "a", "b"]);
  });

  it("keeps nodes in authored order and deep-copies them", () => {
    const timeline = validTimeline();
    timeline.nodes = [trackNode("z", { targetId: "a" }), trackNode("a", { targetId: "b" })];

    const normalized = normalizeTimeline(timeline);
    expect(normalized.nodes.map((node) => node.id)).toEqual(["z", "a"]);
    expect(normalized.nodes[0]).not.toBe(timeline.nodes[0]);
  });

  it("never mutates the input", () => {
    const timeline = validTimeline();
    timeline.nodes = [
      trackNode("t", {
        keyframes: [
          { frame: 20, value: 2 },
          { frame: 10, value: 1 },
        ],
      }),
    ];
    const before = JSON.stringify(timeline);

    normalizeTimeline(timeline);
    serializeTimeline(timeline);

    expect(JSON.stringify(timeline)).toBe(before);
  });
});

/* ------------------------------------------------------------------ *
 * serializeTimeline
 * ------------------------------------------------------------------ */

describe("serializeTimeline", () => {
  it("is byte-stable across calls and across shuffled keyframes", () => {
    const first = validTimeline();
    first.nodes = [
      trackNode("t", {
        keyframes: [
          { frame: 20, value: 2 },
          { frame: 10, value: 1 },
        ],
      }),
    ];
    const second = validTimeline();
    second.nodes = [
      trackNode("t", {
        keyframes: [
          { frame: 10, value: 1 },
          { frame: 20, value: 2 },
        ],
      }),
    ];

    expect(serializeTimeline(first)).toBe(serializeTimeline(first));
    expect(serializeTimeline(first)).toBe(serializeTimeline(second));
  });

  it("is compact when space is 0", () => {
    const compact = serializeTimeline(validTimeline(), 0);
    expect(compact.includes("\n")).toBe(false);
    expect(JSON.parse(compact).id).toBe("demo");
  });
});

/* ------------------------------------------------------------------ *
 * parseTimeline
 * ------------------------------------------------------------------ */

describe("parseTimeline", () => {
  it("accepts a JSON string and an already-parsed object", () => {
    const timeline = validTimeline();

    expect(parseTimeline(serializeTimeline(timeline)).timeline).not.toBeNull();
    expect(parseTimeline(timeline).timeline).not.toBeNull();
  });

  it("reports unparseable JSON with timeline-parse-failed", () => {
    const result = parseTimeline("{not json");
    expect(result.timeline).toBeNull();
    expect(codesOf(result.diagnostics)).toEqual(["timeline-parse-failed"]);
  });

  it("reports a wrong schemaVersion and a missing nodes array", () => {
    expect(codesOf(parseTimeline({ schemaVersion: 2, nodes: [] }).diagnostics)).toEqual(["timeline-shape-invalid"]);
    expect(codesOf(parseTimeline({ schemaVersion: 1 }).diagnostics)).toEqual(["timeline-shape-invalid"]);
    expect(codesOf(parseTimeline(42).diagnostics)).toEqual(["timeline-shape-invalid"]);
  });

  it("returns null when there are errors but a value when there are only warnings", () => {
    const broken = parseTimeline({ ...validTimeline(), nodes: [] });
    expect(broken.timeline).toBeNull();
    expect(hasCode(broken.diagnostics, "motion-node-missing")).toBe(true);

    const warned = parseTimeline({
      ...validTimeline(),
      nodes: [
        trackNode("t", {
          keyframes: [
            { frame: 10, value: 0 },
            { frame: 0, value: 1 },
          ],
        }),
      ],
    });
    expect(warned.timeline).not.toBeNull();
    expect(hasCode(warned.diagnostics, "motion-keyframe-unordered")).toBe(true);
    expect(warned.diagnostics.every((diagnostic) => diagnostic.severity === "warning")).toBe(true);
  });
});

/* ------------------------------------------------------------------ *
 * timelineHash
 * ------------------------------------------------------------------ */

describe("timelineHash", () => {
  it("is stable and 8 lowercase hex characters", () => {
    const timeline = validTimeline();
    const hash = timelineHash(timeline);
    expect(hash).toBe(timelineHash(timeline));
    expect(hash).toMatch(/^[0-9a-f]{8}$/);
  });

  it("changes when a value changes", () => {
    const first = validTimeline();
    const second = validTimeline();
    second.nodes = [
      trackNode("t-x", {
        keyframes: [
          { frame: 0, value: 0 },
          { frame: 60, value: 999 },
        ],
      }),
    ];

    expect(timelineHash(first)).not.toBe(timelineHash(second));
  });
});

/* ------------------------------------------------------------------ *
 * Storyboard serialization
 * ------------------------------------------------------------------ */

describe("storyboard serialization", () => {
  it("round-trips through serialize/parse and hashes stably", () => {
    const board = validStoryboard();
    const json = serializeStoryboard(board);

    expect(json).toBe(serializeStoryboard(board));

    const parsed = parseStoryboard(json);
    expect(parsed.board).not.toBeNull();
    expect(parsed.board).toEqual(board);
    expect(parsed.diagnostics.filter((diagnostic) => diagnostic.severity === "error")).toEqual([]);

    expect(storyboardHash(board)).toBe(storyboardHash(board));
    expect(storyboardHash(board)).toMatch(/^[0-9a-f]{8}$/);
  });

  it("changes the hash when a field changes", () => {
    const first = validStoryboard();
    const second = validStoryboard();
    second.title = "Different";

    expect(storyboardHash(first)).not.toBe(storyboardHash(second));
  });

  it("rejects bad JSON and a wrong schema version", () => {
    expect(codesOf(parseStoryboard("{").diagnostics)).toEqual(["storyboard-parse-failed"]);
    expect(codesOf(parseStoryboard({ schemaVersion: 2, shots: [] }).diagnostics)).toEqual(["storyboard-shape-invalid"]);
  });
});

/* ------------------------------------------------------------------ *
 * validateTimeline — positive and every documented code
 * ------------------------------------------------------------------ */

describe("validateTimeline", () => {
  it("accepts a valid nested timeline with zero errors", () => {
    const timeline: MotionTimeline = {
      schemaVersion: 1,
      id: "nested",
      fps: { num: 30, den: 1 },
      durationFrames: 120,
      cues: [{ id: "start", frame: 0 }],
      nodes: [
        {
          kind: "sequence",
          id: "seq",
          children: [
            trackNode("t-x", {
              targetId: "box",
              property: "x",
              keyframes: [
                { frame: 0, value: 0 },
                { frame: 60, value: 100 },
              ],
            }),
            trackNode("t-opacity", {
              targetId: "box",
              property: "opacity",
              valueType: "opacity",
              keyframes: [
                { frame: 0, value: 1 },
                { frame: 30, value: 0.5 },
              ],
            }),
          ],
        },
      ],
      constraints: [{ kind: "follow", id: "c-follow", targetId: "box", sourceId: "box", property: "position" }],
      transforms: [{ id: "root", local: IDENTITY }],
    };

    const diagnostics = validateTimeline(timeline);
    expect(diagnostics.filter((diagnostic) => diagnostic.severity === "error")).toEqual([]);
  });

  const fixtures: Array<{ code: string; build: () => MotionTimeline }> = [
    {
      code: "motion-schema-version-unsupported",
      build: () => ({ ...validTimeline(), schemaVersion: 2 as unknown as 1 }),
    },
    { code: "motion-id-invalid", build: () => ({ ...validTimeline(), id: "" }) },
    { code: "motion-fps-invalid", build: () => ({ ...validTimeline(), fps: { num: 0, den: 1 } }) },
    { code: "motion-duration-invalid", build: () => ({ ...validTimeline(), durationFrames: -5 }) },
    { code: "motion-node-missing", build: () => ({ ...validTimeline(), nodes: [] }) },
    { code: "motion-node-id-missing", build: () => ({ ...validTimeline(), nodes: [trackNode("")] }) },
    {
      code: "motion-node-id-duplicate",
      build: () => ({
        ...validTimeline(),
        nodes: [trackNode("dup", { targetId: "a" }), trackNode("dup", { targetId: "b" })],
      }),
    },
    { code: "motion-keyframe-empty", build: () => ({ ...validTimeline(), nodes: [trackNode("t", { keyframes: [] })] }) },
    {
      code: "motion-keyframe-frame-invalid",
      build: () => ({ ...validTimeline(), nodes: [trackNode("t", { keyframes: [{ frame: -1, value: 0 }] })] }),
    },
    {
      code: "motion-keyframe-duplicate-frame",
      build: () => ({
        ...validTimeline(),
        nodes: [
          trackNode("t", {
            keyframes: [
              { frame: 0, value: 0 },
              { frame: 0, value: 1 },
            ],
          }),
        ],
      }),
    },
    {
      code: "motion-value-type-mismatch",
      build: () => ({
        ...validTimeline(),
        nodes: [trackNode("t", { valueType: "number", keyframes: [{ frame: 0, value: "nope" as unknown as number }] })],
      }),
    },
    {
      code: "motion-value-not-finite",
      build: () => ({
        ...validTimeline(),
        nodes: [
          trackNode("t", {
            valueType: "transform",
            keyframes: [{ frame: 0, value: { ...IDENTITY, a: Number.POSITIVE_INFINITY } }],
          }),
        ],
      }),
    },
    { code: "motion-cue-invalid", build: () => ({ ...validTimeline(), cues: [{ id: "c", frame: -1 }] }) },
    {
      code: "motion-cue-duplicate",
      build: () => ({
        ...validTimeline(),
        cues: [
          { id: "c", frame: 0 },
          { id: "c", frame: 5 },
        ],
      }),
    },
    {
      code: "motion-offset-cue-missing",
      build: () => ({ ...validTimeline(), nodes: [trackNode("t", {}, { cue: "nope" })] }),
    },
    {
      code: "motion-transform-duplicate-id",
      build: () => ({
        ...validTimeline(),
        transforms: [
          { id: "r", local: IDENTITY },
          { id: "r", local: IDENTITY },
        ],
      }),
    },
    {
      code: "motion-transform-parent-missing",
      build: () => ({ ...validTimeline(), transforms: [{ id: "r", parentId: "nope", local: IDENTITY }] }),
    },
    {
      code: "motion-transform-parent-cycle",
      build: () => ({
        ...validTimeline(),
        transforms: [
          { id: "a", parentId: "b", local: IDENTITY },
          { id: "b", parentId: "a", local: IDENTITY },
        ],
      }),
    },
    {
      code: "motion-constraint-target-missing",
      build: () => ({
        ...validTimeline(),
        constraints: [{ kind: "look-at", id: "c", targetId: "ghost", towards: { x: 0, y: 0 } }],
      }),
    },
    {
      code: "motion-repeat-count-invalid",
      build: () => ({ ...validTimeline(), nodes: [{ kind: "repeat", id: "r", count: 0, child: trackNode("t") }] }),
    },
    {
      code: "motion-duplicate-writer",
      build: () => ({
        ...validTimeline(),
        nodes: [trackNode("t1", { targetId: "box", property: "x" }), trackNode("t2", { targetId: "box", property: "x" })],
      }),
    },
    {
      code: "motion-node-empty",
      build: () => ({ ...validTimeline(), nodes: [{ kind: "sequence", id: "s", children: [] }] }),
    },
    {
      code: "motion-keyframe-unordered",
      build: () => ({
        ...validTimeline(),
        nodes: [
          trackNode("t", {
            keyframes: [
              { frame: 10, value: 0 },
              { frame: 0, value: 1 },
            ],
          }),
        ],
      }),
    },
    {
      code: "motion-hold-child-overflow",
      build: () => ({
        ...validTimeline(),
        nodes: [
          {
            kind: "hold",
            id: "h",
            durationFrames: 5,
            child: trackNode("t", {
              keyframes: [
                { frame: 0, value: 0 },
                { frame: 60, value: 1 },
              ],
            }),
          },
        ],
      }),
    },
    {
      code: "motion-frame-out-of-range",
      build: () => ({
        ...validTimeline(),
        nodes: [
          trackNode("t", {
            keyframes: [
              { frame: 0, value: 0 },
              { frame: 200, value: 1 },
            ],
          }),
        ],
      }),
    },
    {
      code: "motion-priority-tie",
      build: () => ({
        ...validTimeline(),
        nodes: [
          trackNode("t1", { targetId: "box", property: "x", conflict: "priority", priority: 1 }),
          trackNode("t2", { targetId: "box", property: "x", conflict: "priority", priority: 1 }),
        ],
      }),
    },
    {
      code: "motion-cue-unused",
      build: () => ({ ...validTimeline(), cues: [{ id: "unused", frame: 5 }], nodes: [trackNode("t")] }),
    },
    {
      code: "motion-constraint-clamped",
      build: () => ({
        ...validTimeline(),
        constraints: [{ kind: "bounds", id: "c", targetId: "box", bounds: { x: 0, y: 0, width: 0, height: 0 } }],
      }),
    },
    {
      code: "motion-node-unreachable",
      build: () => ({
        ...validTimeline(),
        durationFrames: 10,
        nodes: [
          {
            kind: "sequence",
            id: "s",
            children: [
              trackNode("t1", {
                keyframes: [
                  { frame: 0, value: 0 },
                  { frame: 100, value: 1 },
                ],
              }),
              trackNode("t2", { targetId: "box2", property: "y" }),
            ],
          },
        ],
      }),
    },
    { code: "motion-no-duration", build: () => ({ ...validTimeline(), durationFrames: 0 }) },
  ];

  it("exercises every documented diagnostic code", () => {
    const produced = new Set<string>();
    for (const fixture of fixtures) {
      for (const diagnostic of validateTimeline(fixture.build())) produced.add(diagnostic.code);
    }
    expect([...produced].sort()).toEqual(ALL_CODES);
  });

  it("assigns the documented severity to every code", () => {
    for (const fixture of fixtures) {
      const match = validateTimeline(fixture.build()).find((diagnostic) => diagnostic.code === fixture.code);
      expect(match, fixture.code).toBeDefined();
      expect(match?.severity, fixture.code).toBe(ERROR_CODES.includes(fixture.code) ? "error" : "warning");
    }
  });

  it("emits diagnostics with a JSON-ish path and a frame where implicated", () => {
    const diagnostics = validateTimeline({
      ...validTimeline(),
      nodes: [
        trackNode("t", {
          keyframes: [
            { frame: 0, value: 0 },
            { frame: 500, value: 1 },
          ],
        }),
      ],
    });
    const outOfRange = diagnostics.find((diagnostic) => diagnostic.code === "motion-frame-out-of-range");
    expect(outOfRange?.path).toBe("nodes[0].track.keyframes[1].frame");
    expect(outOfRange?.frame).toBe(500);
  });
});

/* ------------------------------------------------------------------ *
 * validateMotionDocument
 * ------------------------------------------------------------------ */

describe("validateMotionDocument", () => {
  it("dispatches to the timeline validator", () => {
    expect(validateMotionDocument(validTimeline()).ok).toBe(true);

    const broken = validateMotionDocument({ ...validTimeline(), nodes: [] });
    expect(broken.ok).toBe(false);
    expect(hasCode(broken.diagnostics, "motion-node-missing")).toBe(true);
  });

  it("dispatches to the storyboard validator", () => {
    expect(validateMotionDocument(validStoryboard()).ok).toBe(true);
  });

  it("reports an unknown document", () => {
    const result = validateMotionDocument({ foo: 1 });
    expect(result.ok).toBe(false);
    expect(codesOf(result.diagnostics)).toEqual(["motion-document-unknown"]);
  });
});

/* ------------------------------------------------------------------ *
 * Determinism
 * ------------------------------------------------------------------ */

describe("determinism", () => {
  it("returns identical output for repeated calls", () => {
    const timeline = validTimeline();

    expect(validateTimeline(timeline)).toEqual(validateTimeline(timeline));
    expect(serializeTimeline(timeline)).toBe(serializeTimeline(timeline));
    expect(timelineHash(timeline)).toBe(timelineHash(timeline));
    expect(parseTimeline(serializeTimeline(timeline))).toEqual(parseTimeline(serializeTimeline(timeline)));
  });

  it("orders diagnostics deterministically", () => {
    const timeline = validTimeline();
    timeline.nodes = [
      trackNode("t", {
        keyframes: [
          { frame: 200, value: 0 },
          { frame: -1, value: 1 },
        ],
      }),
    ];

    const first = validateTimeline(timeline);
    const second = validateTimeline(timeline);
    expect(first.map((diagnostic) => diagnostic.code)).toEqual(second.map((diagnostic) => diagnostic.code));
  });
});
