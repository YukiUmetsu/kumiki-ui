/**
 * `scene-storyboard` — deterministic coverage for the storyboard layer
 * (docs/07 M2, docs/09 §"Storyboard-to-scene handoff").
 *
 * These tests pin behaviour, not implementation detail: frame derivation,
 * end-exclusive ranges, every documented diagnostic (errors and warnings),
 * handoff resolution and ordering, the clip/cue/timeline projections,
 * determinism and input immutability.
 */

import { describe, expect, it } from "vitest";

import {
  STORYBOARD_SCHEMA_VERSION,
  createStoryboard,
  handoffChain,
  shotAt,
  shotRange,
  storyboardDuration,
  storyboardSummary,
  storyboardToTimelineNodes,
  toStoryboardClips,
  toStoryboardCues,
  validateStoryboard,
} from "../registry/motion/storyboard";
import type { Storyboard, StoryboardShot } from "../registry/motion/storyboard";
import { countBySeverity } from "../registry/motion/diagnostics";
import { NEGATIVE_STORYBOARDS, STORYBOARD_FIXTURES } from "../src/motion/storyboard-fixtures";

/** The complete documented code set: 15 errors + 4 warnings. */
const ERROR_CODES = [
  "storyboard-empty",
  "storyboard-shot-id-duplicate",
  "storyboard-shot-invalid-duration",
  "storyboard-shot-invalid-start",
  "storyboard-coverage-gap",
  "storyboard-coverage-overlap",
  "storyboard-duration-mismatch",
  "storyboard-claim-missing",
  "storyboard-objective-missing",
  "storyboard-focus-missing",
  "storyboard-narration-cue-missing",
  "storyboard-labels-empty",
  "storyboard-handoff-target-unknown",
  "storyboard-handoff-identity-mismatch",
  "storyboard-transition-invalid",
];

const WARNING_CODES = [
  "storyboard-transition-overlap",
  "storyboard-label-overflow",
  "storyboard-identity-unused",
  "storyboard-shot-no-fallback",
];

const ALL_CODES = [...ERROR_CODES, ...WARNING_CODES].sort();

function mkShot(
  overrides: Partial<StoryboardShot> & { id: string; startFrame: number; durationFrames: number },
): StoryboardShot {
  return {
    sceneRef: `scene-${overrides.id}`,
    claim: "One focal idea per shot.",
    visualObjective: "An observable change the viewer can follow.",
    focusTarget: "focus-anchor",
    onScreenLabels: ["Label"],
    staticFallback: "Single still frame summarising this shot.",
    ...overrides,
  };
}

function fixture(id: string): Storyboard {
  const entry = STORYBOARD_FIXTURES.find((item) => item.id === id);
  if (!entry) throw new Error(`Unknown storyboard fixture "${id}".`);
  return entry.board;
}

function codesOf(diagnostics: Array<{ code: string }>): string[] {
  return [...new Set(diagnostics.map((diagnostic) => diagnostic.code))].sort();
}

describe("createStoryboard", () => {
  it("stamps the schema version and defaults the fps to 30/1", () => {
    expect(STORYBOARD_SCHEMA_VERSION).toBe(1);

    const board = createStoryboard({
      id: "board",
      title: "A board",
      shots: [mkShot({ id: "a", startFrame: 0, durationFrames: 100 })],
    });

    expect(board.schemaVersion).toBe(1);
    expect(board.fps).toEqual({ num: 30, den: 1 });
    expect(board.durationFrames).toBe(100);
    expect(board.shots).toHaveLength(1);
    expect(board.cues).toBeUndefined();
    expect(board.identities).toBeUndefined();
  });

  it("derives durationFrames from the shots and preserves an explicit duration", () => {
    const derived = createStoryboard({
      id: "derived",
      title: "Derived",
      shots: [
        mkShot({ id: "a", startFrame: 0, durationFrames: 100 }),
        mkShot({ id: "b", startFrame: 150, durationFrames: 50 }),
      ],
    });
    expect(derived.durationFrames).toBe(200);

    const explicit = createStoryboard({
      id: "explicit",
      title: "Explicit",
      durationFrames: 400,
      shots: [
        mkShot({ id: "a", startFrame: 0, durationFrames: 100 }),
        mkShot({ id: "b", startFrame: 150, durationFrames: 50 }),
      ],
    });
    expect(explicit.durationFrames).toBe(400);

    const empty = createStoryboard({ id: "empty", title: "Empty", shots: [] });
    expect(empty.durationFrames).toBe(0);
    expect(empty.shots).toEqual([]);
  });

  it("copies shots, cues and identities so later mutation cannot reach the caller", () => {
    const labels = ["Ask"];
    const shots = [mkShot({ id: "a", startFrame: 0, durationFrames: 100, onScreenLabels: labels })];
    const cues = [{ id: "beat", frame: 0 }];
    const identities = ["query-token"];

    const board = createStoryboard({ id: "board", title: "Board", shots, cues, identities });

    board.shots[0].onScreenLabels.push("mutated");
    board.shots[0].startFrame = 999;
    if (board.cues) board.cues[0].frame = 42;
    board.identities?.push("mutated");

    expect(labels).toEqual(["Ask"]);
    expect(shots[0].startFrame).toBe(0);
    expect(cues[0].frame).toBe(0);
    expect(identities).toEqual(["query-token"]);
  });
});

describe("shotRange / shotAt / storyboardDuration", () => {
  it("returns an end-exclusive range", () => {
    const range = shotRange(mkShot({ id: "a", startFrame: 100, durationFrames: 50 }));
    expect(range).toEqual({ startFrame: 100, endFrame: 150 });

    const board = createStoryboard({
      id: "board",
      title: "Board",
      shots: [mkShot({ id: "a", startFrame: 100, durationFrames: 50 })],
    });
    expect(shotAt(board, 149)?.id).toBe("a");
    expect(shotAt(board, 150)).toBeNull();
  });

  it("resolves first, last, boundary and out-of-range frames", () => {
    const board = fixture("explainer-60s");

    expect(shotAt(board, 0)?.id).toBe("problem");
    expect(shotAt(board, 179)?.id).toBe("problem");
    expect(shotAt(board, 180)?.id).toBe("retrieval");
    expect(shotAt(board, 479)?.id).toBe("retrieval");
    expect(shotAt(board, 480)?.id).toBe("search");
    expect(shotAt(board, 1439)?.id).toBe("generate");
    expect(shotAt(board, 1440)?.id).toBe("recap");
    expect(shotAt(board, 1799)?.id).toBe("recap");
    expect(shotAt(board, 1800)).toBeNull();
    expect(shotAt(board, -1)).toBeNull();
    expect(shotAt(board, Number.NaN)).toBeNull();
  });

  it("reports the authored storyboard length", () => {
    expect(storyboardDuration(fixture("typographic-30s"))).toBe(900);
    expect(storyboardDuration(fixture("explainer-60s"))).toBe(1800);
    expect(storyboardDuration(fixture("social-9x16"))).toBe(450);
  });
});

describe("validateStoryboard — positive fixtures", () => {
  it("accepts every fixture with zero errors and zero warnings", () => {
    for (const { id, board } of STORYBOARD_FIXTURES) {
      const diagnostics = validateStoryboard(board);
      expect(countBySeverity(diagnostics), id).toEqual({ error: 0, warning: 0 });
    }
  });

  it("accepts every fixture when cues, labels and identities are cross-checked", () => {
    for (const { id, board } of STORYBOARD_FIXTURES) {
      const diagnostics = validateStoryboard(board, {
        knownCues: toStoryboardCues(board).map((cue) => cue.id),
        knownIdentities: board.identities,
        labelFits: (label) => label.length <= 24,
      });
      expect(countBySeverity(diagnostics), id).toEqual({ error: 0, warning: 0 });
    }
  });

  it("tiles every positive fixture across [0, durationFrames) exactly", () => {
    for (const { id, board } of STORYBOARD_FIXTURES) {
      let cursor = 0;
      for (const shot of board.shots) {
        expect(shot.startFrame, id).toBe(cursor);
        cursor += shot.durationFrames;
      }
      expect(cursor, id).toBe(board.durationFrames);
    }
  });
});

describe("validateStoryboard — negative fixtures", () => {
  it("fails each negative fixture with exactly its documented codes", () => {
    for (const { id, board, expectedCodes } of NEGATIVE_STORYBOARDS) {
      const diagnostics = validateStoryboard(board);
      expect(codesOf(diagnostics), id).toEqual([...expectedCodes].sort());

      for (const diagnostic of diagnostics) {
        const expectedSeverity = ERROR_CODES.includes(diagnostic.code) ? "error" : "warning";
        expect(diagnostic.severity, `${id}:${diagnostic.code}`).toBe(expectedSeverity);
      }
    }
  });

  it("exercises every documented diagnostic code", () => {
    const codes = new Set<string>();

    for (const { board } of NEGATIVE_STORYBOARDS) {
      for (const diagnostic of validateStoryboard(board)) codes.add(diagnostic.code);
    }

    const labelBoard = createStoryboard({
      id: "labels",
      title: "Labels",
      shots: [
        mkShot({ id: "a", startFrame: 0, durationFrames: 100, onScreenLabels: ["A very long label"] }),
      ],
    });
    for (const diagnostic of validateStoryboard(labelBoard, { labelFits: () => false })) {
      codes.add(diagnostic.code);
    }

    const cueBoard = createStoryboard({
      id: "cues",
      title: "Cues",
      shots: [mkShot({ id: "a", startFrame: 0, durationFrames: 100, narrationCue: "missing-cue" })],
    });
    for (const diagnostic of validateStoryboard(cueBoard, { knownCues: [] })) {
      codes.add(diagnostic.code);
    }

    expect([...codes].sort()).toEqual(ALL_CODES);
  });

  it("reports narration cues only when a cue vocabulary is supplied", () => {
    const board = createStoryboard({
      id: "cues",
      title: "Cues",
      shots: [mkShot({ id: "a", startFrame: 0, durationFrames: 100, narrationCue: "missing-cue" })],
    });

    expect(codesOf(validateStoryboard(board))).toEqual([]);

    const missing = validateStoryboard(board, { knownCues: ["other-cue"] });
    expect(codesOf(missing)).toEqual(["storyboard-narration-cue-missing"]);
    expect(missing[0].severity).toBe("error");

    expect(validateStoryboard(board, { knownCues: ["missing-cue"] })).toEqual([]);
  });

  it("checks labels with the supplied fit function and passes the shot", () => {
    const board = createStoryboard({
      id: "labels",
      title: "Labels",
      shots: [
        mkShot({ id: "a", startFrame: 0, durationFrames: 100, onScreenLabels: ["A very long label"] }),
      ],
    });

    const seen: Array<{ label: string; shotId: string }> = [];
    const diagnostics = validateStoryboard(board, {
      labelFits: (label, shot) => {
        seen.push({ label, shotId: shot.id });
        return label.length <= 4;
      },
    });

    expect(codesOf(diagnostics)).toEqual(["storyboard-label-overflow"]);
    expect(diagnostics[0].severity).toBe("warning");
    expect(seen).toEqual([{ label: "A very long label", shotId: "a" }]);
  });

  it("flags a handoff identity the target composition does not declare", () => {
    const board = fixture("typographic-30s");
    const diagnostics = validateStoryboard(board, { knownIdentities: ["query-token"] });

    expect(codesOf(diagnostics)).toEqual(["storyboard-handoff-identity-mismatch"]);
    expect(diagnostics).toHaveLength(3);
  });
});

describe("handoffChain", () => {
  it("resolves each exit handoff to the next shot providing the target scene", () => {
    const chain = handoffChain(fixture("typographic-30s"));

    expect(chain.map((handoff) => handoff.fromShotId)).toEqual([
      "hook",
      "establish",
      "mechanism",
      "contrast",
      "implication",
    ]);
    expect(chain.map((handoff) => handoff.toShotId)).toEqual([
      "establish",
      "mechanism",
      "contrast",
      "implication",
      "recap",
    ]);
    expect(chain.map((handoff) => handoff.semanticId)).toEqual([
      "query-token",
      "query-token",
      "retrieved-chunk",
      "context-window",
      "context-window",
    ]);
    expect(chain.map((handoff) => handoff.toSceneRef)).toEqual([
      "scene-model",
      "scene-mechanism",
      "scene-contrast",
      "scene-implication",
      "scene-recap",
    ]);
  });

  it("orders entries by shot start frame, not authored order", () => {
    const board = createStoryboard({
      id: "shuffled",
      title: "Shuffled",
      shots: [
        mkShot({
          id: "b",
          startFrame: 100,
          durationFrames: 100,
          exitHandoff: { semanticId: "context-window", targetSceneRef: "scene-c" },
        }),
        mkShot({
          id: "a",
          startFrame: 0,
          durationFrames: 100,
          exitHandoff: { semanticId: "query-token", targetSceneRef: "scene-b" },
        }),
        mkShot({ id: "c", startFrame: 200, durationFrames: 100 }),
      ],
    });

    expect(handoffChain(board)).toEqual([
      { semanticId: "query-token", fromShotId: "a", toShotId: "b", toSceneRef: "scene-b" },
      { semanticId: "context-window", fromShotId: "b", toShotId: "c", toSceneRef: "scene-c" },
    ]);
  });

  it("leaves an unresolvable target empty for validation to report", () => {
    const board = NEGATIVE_STORYBOARDS.find((entry) => entry.id === "handoff-target-unknown")?.board;
    expect(board).toBeDefined();

    expect(handoffChain(board as Storyboard)).toEqual([
      { semanticId: "query-token", fromShotId: "a", toShotId: "", toSceneRef: "scene-absent" },
    ]);
  });
});

describe("toStoryboardClips / toStoryboardCues", () => {
  it("places clips in start order with sourceStartFrame 0", () => {
    const clips = toStoryboardClips(fixture("explainer-60s"));

    expect(clips.map((clip) => clip.startFrame)).toEqual([0, 180, 480, 780, 1080, 1440]);
    expect(clips[0]).toEqual({
      id: "problem",
      sceneRef: "scene-problem",
      startFrame: 0,
      durationFrames: 180,
      sourceStartFrame: 0,
    });
    expect(clips.every((clip) => clip.sourceStartFrame === 0)).toBe(true);
  });

  it("sorts clips by start frame for an out-of-order board", () => {
    const board = createStoryboard({
      id: "shuffled",
      title: "Shuffled",
      shots: [
        mkShot({ id: "b", startFrame: 150, durationFrames: 50 }),
        mkShot({ id: "a", startFrame: 0, durationFrames: 150 }),
      ],
    });

    expect(toStoryboardClips(board).map((clip) => clip.id)).toEqual(["a", "b"]);
  });

  it("resolves declared, shot-start and narration cues once, sorted by frame", () => {
    const board = createStoryboard({
      id: "cues",
      title: "Cues",
      cues: [
        { id: "beat-reveal", frame: 330, kind: "emphasis" },
        { id: "shot-a", frame: 999, kind: "declared" },
      ],
      shots: [
        mkShot({ id: "a", startFrame: 0, durationFrames: 100, narrationCue: "narration-a" }),
        mkShot({ id: "b", startFrame: 100, durationFrames: 100 }),
      ],
    });

    const cues = toStoryboardCues(board);

    // The declared `shot-a` wins over the derived start cue with the same id.
    expect(cues.map((cue) => cue.id)).toEqual([
      "narration-a",
      "shot-b",
      "beat-reveal",
      "shot-a",
    ]);
    expect(cues.find((cue) => cue.id === "narration-a")).toEqual({
      id: "narration-a",
      frame: 0,
      kind: "narration",
      targetId: "focus-anchor",
    });
    expect(cues.find((cue) => cue.id === "shot-b")).toEqual({
      id: "shot-b",
      frame: 100,
      kind: "shot-start",
      targetId: "scene-b",
    });
    expect(cues.find((cue) => cue.id === "shot-a")).toEqual({
      id: "shot-a",
      frame: 999,
      kind: "declared",
    });
    expect(cues.every((cue) => Number.isInteger(cue.frame))).toBe(true);
  });
});

describe("storyboardSummary", () => {
  it("summarises shots, duration, seconds, identities and resolved handoffs", () => {
    expect(storyboardSummary(fixture("explainer-60s"))).toEqual({
      shots: 6,
      durationFrames: 1800,
      totalSeconds: 60,
      identities: ["query-token", "retrieved-chunk", "context-window"],
      handoffs: 5,
    });

    const typographic = storyboardSummary(fixture("typographic-30s"));
    expect(typographic.totalSeconds).toBe(30);
    expect(typographic.handoffs).toBe(5);

    const portrait = storyboardSummary(fixture("social-9x16"));
    expect(portrait).toEqual({
      shots: 4,
      durationFrames: 450,
      totalSeconds: 15,
      identities: ["query-token", "context-window"],
      handoffs: 3,
    });
  });

  it("returns a copy of the identity list", () => {
    const board = fixture("typographic-30s");
    const summary = storyboardSummary(board);
    summary.identities.push("mutated");
    expect(board.identities).toEqual(["query-token", "retrieved-chunk", "context-window"]);
  });
});

describe("storyboardToTimelineNodes", () => {
  it("emits one hold per shot, offset by its start frame, and no tracks", () => {
    const nodes = storyboardToTimelineNodes(fixture("explainer-60s"));

    expect(nodes).toHaveLength(6);
    expect(nodes.every((node) => node.kind === "hold")).toBe(true);
    expect(nodes.map((node) => (node.kind === "hold" ? node.offset : null))).toEqual([
      0, 180, 480, 780, 1080, 1440,
    ]);
    expect(nodes[0]).toEqual({
      kind: "hold",
      id: "shot-problem",
      durationFrames: 180,
      offset: 0,
    });
    expect(nodes[5]).toEqual({
      kind: "hold",
      id: "shot-recap",
      durationFrames: 360,
      offset: 1440,
    });
    expect(nodes.some((node) => node.kind === "track")).toBe(false);
  });

  it("follows start order and keeps each shot's own duration", () => {
    const board = createStoryboard({
      id: "shuffled",
      title: "Shuffled",
      shots: [
        mkShot({ id: "b", startFrame: 150, durationFrames: 50 }),
        mkShot({ id: "a", startFrame: 0, durationFrames: 150 }),
      ],
    });

    expect(storyboardToTimelineNodes(board)).toEqual([
      { kind: "hold", id: "shot-a", durationFrames: 150, offset: 0 },
      { kind: "hold", id: "shot-b", durationFrames: 50, offset: 150 },
    ]);
  });
});

describe("determinism and immutability", () => {
  it("produces deep-equal output for repeated calls", () => {
    const board = fixture("typographic-30s");

    expect(validateStoryboard(board)).toEqual(validateStoryboard(board));
    expect(handoffChain(board)).toEqual(handoffChain(board));
    expect(toStoryboardClips(board)).toEqual(toStoryboardClips(board));
    expect(toStoryboardCues(board)).toEqual(toStoryboardCues(board));
    expect(storyboardToTimelineNodes(board)).toEqual(storyboardToTimelineNodes(board));
    expect(storyboardSummary(board)).toEqual(storyboardSummary(board));
    expect(shotRange(board.shots[0])).toEqual(shotRange(board.shots[0]));
  });

  it("builds the same board from the same props", () => {
    const props = {
      id: "board",
      title: "Board",
      shots: [
        mkShot({ id: "a", startFrame: 0, durationFrames: 100 }),
        mkShot({ id: "b", startFrame: 100, durationFrames: 100 }),
      ],
      identities: ["query-token"],
      cues: [{ id: "beat", frame: 50, kind: "emphasis" }],
    };

    expect(createStoryboard(props)).toEqual(createStoryboard(props));
  });

  it("never mutates the board it reads", () => {
    const board = fixture("explainer-60s");
    const before = JSON.stringify(board);

    validateStoryboard(board, {
      knownCues: toStoryboardCues(board).map((cue) => cue.id),
      knownIdentities: board.identities,
      labelFits: () => true,
    });
    handoffChain(board);
    toStoryboardClips(board);
    toStoryboardCues(board);
    storyboardToTimelineNodes(board);
    storyboardSummary(board);
    shotAt(board, 500);
    shotRange(board.shots[0]);

    expect(JSON.stringify(board)).toBe(before);
  });

  it("serializes to safe JSON with no functions anywhere", () => {
    const json = JSON.stringify(fixture("explainer-60s"));
    const parsed = JSON.parse(json) as Record<string, unknown>;

    expect(parsed.schemaVersion).toBe(1);
    expect(Array.isArray(parsed.shots)).toBe(true);
    expect(json.includes("function")).toBe(false);
  });
});
