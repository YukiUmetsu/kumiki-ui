/**
 * Storyboard fixtures for the Kumiki motion foundation.
 *
 * These are *data*, not library code: no registry item imports this module. The
 * tests and the motion showcase both build from here, so a fixture that stops
 * validating fails the suite instead of quietly describing a different video.
 *
 * Three rules hold throughout:
 *
 * 1. **Copy is anonymous and reusable.** No brands, customers, platforms or
 *    industry-specific claims — the fixtures demonstrate planning and handoff
 *    behaviour, nothing else.
 * 2. **Every board tiles exactly.** Shots cover `[0, durationFrames)` with no
 *    hole and no overlap, so the positive fixtures validate with zero errors.
 * 3. **Every negative fixture isolates one documented diagnostic.** Each entry
 *    in {@link NEGATIVE_STORYBOARDS} fails with exactly its `expectedCodes`, so
 *    the codes are pinned by data rather than by prose.
 */

import type { MotionCue, RationalFps } from "../../registry/motion/types";
import {
  createStoryboard,
  type Storyboard,
  type StoryboardShot,
} from "../../registry/motion/storyboard";

const FPS_30: RationalFps = { num: 30, den: 1 };

/** Defaults keep the fixtures about *timing and handoff*, not repeated boilerplate. */
type ShotOverrides = Partial<Omit<StoryboardShot, "id">> & {
  id: string;
  sceneRef: string;
  startFrame: number;
  durationFrames: number;
};

function shot(overrides: ShotOverrides): StoryboardShot {
  return {
    claim: "One focal idea per shot.",
    visualObjective: "An observable change the viewer can follow.",
    focusTarget: "focus-anchor",
    onScreenLabels: ["Label"],
    staticFallback: "Single still frame summarising this shot.",
    ...overrides,
  };
}

function board(props: {
  id: string;
  title: string;
  shots: StoryboardShot[];
  fps?: RationalFps;
  durationFrames?: number;
  cues?: MotionCue[];
  identities?: string[];
}): Storyboard {
  return createStoryboard(props);
}

/* ------------------------------------------------------------------ *
 * Positive fixtures
 * ------------------------------------------------------------------ */

/**
 * 30 s @ 30 fps (900 frames) landscape typographic explainer.
 *
 * Six fully-filled shots whose durations sum to exactly 900, with a
 * `query-token` → `retrieved-chunk` → `context-window` identity chain carried
 * across five handoffs.
 */
const TYPOGRAPHIC_30S: Storyboard = board({
  id: "typographic-30s",
  title: "Typographic explainer — 30 seconds, 16:9",
  fps: FPS_30,
  durationFrames: 900,
  identities: ["query-token", "retrieved-chunk", "context-window"],
  cues: [{ id: "beat-reveal", frame: 330, kind: "emphasis", targetId: "retrieved-chunk" }],
  shots: [
    shot({
      id: "hook",
      sceneRef: "scene-hook",
      startFrame: 0,
      durationFrames: 150,
      claim: "A question without private context gets a vague answer.",
      visualObjective: "Show the question object standing alone with no sources attached.",
      focusTarget: "query-token",
      narrationCue: "hook-question",
      onScreenLabels: ["Ask a question", "Private notes"],
      exitHandoff: { semanticId: "query-token", targetSceneRef: "scene-model" },
      transitionIn: { kind: "cut" },
      staticFallback: "Question card with an empty source shelf beside it.",
      assets: ["asset-question-card"],
    }),
    shot({
      id: "establish",
      sceneRef: "scene-model",
      startFrame: 150,
      durationFrames: 180,
      claim: "Retrieval turns the question into a query the store can match.",
      visualObjective: "The question object becomes a query token beside the store.",
      focusTarget: "query-token",
      narrationCue: "introduce-query",
      onScreenLabels: ["Query", "Retriever", "Store"],
      exitHandoff: { semanticId: "query-token", targetSceneRef: "scene-mechanism" },
      transitionIn: { kind: "shared-element", durationFrames: 12 },
      staticFallback: "Query token, retriever and store laid out left to right.",
    }),
    shot({
      id: "mechanism",
      sceneRef: "scene-mechanism",
      startFrame: 330,
      durationFrames: 210,
      claim: "Matching passages rise out of the store in ranked order.",
      visualObjective: "Track three passages arriving and ordering themselves.",
      focusTarget: "retrieved-chunk",
      narrationCue: "find-passages",
      onScreenLabels: ["Search", "Top 3", "Relevant passages"],
      exitHandoff: { semanticId: "retrieved-chunk", targetSceneRef: "scene-contrast" },
      transitionIn: { kind: "crossfade", durationFrames: 15 },
      staticFallback: "Three ranked passage cards stacked beside the store.",
      assets: ["asset-passage-card"],
    }),
    shot({
      id: "contrast",
      sceneRef: "scene-contrast",
      startFrame: 540,
      durationFrames: 180,
      claim: "Retrieved context changes the answer the model can give.",
      visualObjective: "Compare an unsourced answer with a sourced one on a shared baseline.",
      focusTarget: "context-window",
      narrationCue: "assemble-context",
      onScreenLabels: ["With retrieval", "Without retrieval"],
      exitHandoff: { semanticId: "context-window", targetSceneRef: "scene-implication" },
      transitionIn: { kind: "crossfade", durationFrames: 12 },
      staticFallback: "Two aligned answer cards, one citing a source and one not.",
    }),
    shot({
      id: "implication",
      sceneRef: "scene-implication",
      startFrame: 720,
      durationFrames: 120,
      claim: "Grounded answers stay traceable to the passage that produced them.",
      visualObjective: "Link each answer sentence back to its source passage.",
      focusTarget: "context-window",
      narrationCue: "generate-answer",
      onScreenLabels: ["Grounded answer", "Cite sources"],
      exitHandoff: { semanticId: "context-window", targetSceneRef: "scene-recap" },
      transitionIn: { kind: "shared-element", durationFrames: 12 },
      staticFallback: "Answer card with three citation threads to passage cards.",
    }),
    shot({
      id: "recap",
      sceneRef: "scene-recap",
      startFrame: 840,
      durationFrames: 60,
      claim: "Retrieve, answer, verify — the loop that keeps claims checkable.",
      visualObjective: "Return to the compact pipeline with the verification step lit.",
      focusTarget: "query-token",
      narrationCue: "recap-loop",
      onScreenLabels: ["Retrieve", "Answer", "Verify"],
      transitionIn: { kind: "crossfade", durationFrames: 12 },
      staticFallback: "Three-step pipeline diagram with the verify step highlighted.",
    }),
  ],
});

/**
 * The docs/09 §4 reference: 60 s @ 30 fps (1800 frames) RAG explainer.
 *
 * Shot ranges are the documented ones (0-179, 180-479, 480-779, 780-1079,
 * 1080-1439, 1440-1799); `query-token`, `retrieved-chunk` and `context-window`
 * retain identity across at least two handoffs, and every shot has a static
 * fallback as §4 requires.
 */
const EXPLAINER_60S: Storyboard = board({
  id: "explainer-60s",
  title: "Retrieval explainer — 60 seconds, 16:9",
  fps: FPS_30,
  durationFrames: 1800,
  identities: ["query-token", "retrieved-chunk", "context-window"],
  shots: [
    shot({
      id: "problem",
      sceneRef: "scene-problem",
      startFrame: 0,
      durationFrames: 180,
      claim: "An answer without private context cannot address a private question.",
      visualObjective: "Leave the question object on screen with an absent-document silhouette.",
      focusTarget: "query-token",
      narrationCue: "hook-missing-context",
      onScreenLabels: ["Question", "No sources"],
      exitHandoff: { semanticId: "query-token", targetSceneRef: "scene-retrieval" },
      transitionIn: { kind: "cut" },
      staticFallback: "Question card beside a greyed-out document silhouette.",
    }),
    shot({
      id: "retrieval",
      sceneRef: "scene-retrieval",
      startFrame: 180,
      durationFrames: 300,
      claim: "Retrieval finds relevant information before generation starts.",
      visualObjective: "The question becomes a query token; the retriever and store are revealed.",
      focusTarget: "query-token",
      narrationCue: "retrieve-context",
      onScreenLabels: ["Query token", "Retriever", "Store"],
      exitHandoff: { semanticId: "query-token", targetSceneRef: "scene-search" },
      transitionIn: { kind: "shared-element", durationFrames: 15 },
      staticFallback: "Query token connected to a retriever and a store block.",
    }),
    shot({
      id: "search",
      sceneRef: "scene-search",
      startFrame: 480,
      durationFrames: 300,
      claim: "Matching passages rise from the store as ranked chunks.",
      visualObjective: "A packet travels the real connector path and three chunks arrive.",
      focusTarget: "retrieved-chunk",
      narrationCue: "find-passages",
      onScreenLabels: ["Top 3", "Matching passages"],
      exitHandoff: { semanticId: "retrieved-chunk", targetSceneRef: "scene-assemble" },
      transitionIn: { kind: "crossfade", durationFrames: 12 },
      staticFallback: "Store with a packet on the connector and three ranked chunks.",
    }),
    shot({
      id: "assemble",
      sceneRef: "scene-assemble",
      startFrame: 780,
      durationFrames: 300,
      claim: "The retrieved chunks are added beside the question as context.",
      visualObjective: "Chunks move into the context window while keeping their ids.",
      focusTarget: "context-window",
      narrationCue: "assemble-context",
      onScreenLabels: ["Context window", "Question"],
      exitHandoff: { semanticId: "context-window", targetSceneRef: "scene-generate" },
      transitionIn: { kind: "shared-element", durationFrames: 18 },
      staticFallback: "Context window holding the question and three chunk cards.",
    }),
    shot({
      id: "generate",
      sceneRef: "scene-generate",
      startFrame: 1080,
      durationFrames: 360,
      claim: "The model answers from the assembled context rather than from memory.",
      visualObjective: "Context and question connect to the model and the answer resolves.",
      focusTarget: "context-window",
      narrationCue: "generate-answer",
      onScreenLabels: ["Model", "Grounded answer"],
      exitHandoff: { semanticId: "context-window", targetSceneRef: "scene-recap" },
      transitionIn: { kind: "crossfade", durationFrames: 12 },
      staticFallback: "Context window feeding a model block that emits an answer card.",
    }),
    shot({
      id: "recap",
      sceneRef: "scene-recap",
      startFrame: 1440,
      durationFrames: 360,
      claim: "Retrieval helps, but sources and verification still matter.",
      visualObjective: "Return to the compact pipeline and surface the citation caveat.",
      focusTarget: "context-window",
      narrationCue: "recap-caveat",
      onScreenLabels: ["Retrieve", "Answer", "Cite sources"],
      transitionIn: { kind: "crossfade", durationFrames: 12 },
      staticFallback: "Compact pipeline diagram with a citation caveat caption.",
    }),
  ],
});

/**
 * 15 s @ 30 fps (450 frames) portrait variant of a short board.
 *
 * Same shot plan as a landscape cut, with explicitly shortened labels — the
 * only sanctioned way to adapt on-screen text (docs/09 §6).
 */
const SOCIAL_9X16: Storyboard = board({
  id: "social-9x16",
  title: "Portrait explainer — 15 seconds, 9:16",
  fps: FPS_30,
  durationFrames: 450,
  identities: ["query-token", "context-window"],
  shots: [
    shot({
      id: "v-hook",
      sceneRef: "v-hook",
      startFrame: 0,
      durationFrames: 120,
      claim: "A question alone cannot reach private context.",
      visualObjective: "Stack the question above an empty source slot.",
      focusTarget: "query-token",
      narrationCue: "v-hook",
      onScreenLabels: ["Ask"],
      exitHandoff: { semanticId: "query-token", targetSceneRef: "v-mechanism" },
      transitionIn: { kind: "cut" },
      staticFallback: "Question stacked above an empty source slot.",
    }),
    shot({
      id: "v-mechanism",
      sceneRef: "v-mechanism",
      startFrame: 120,
      durationFrames: 150,
      claim: "Retrieval matches the question to ranked passages.",
      visualObjective: "Show the query token reaching the store and chunks rising.",
      focusTarget: "query-token",
      narrationCue: "v-search",
      onScreenLabels: ["Top 3"],
      exitHandoff: { semanticId: "context-window", targetSceneRef: "v-contrast" },
      transitionIn: { kind: "shared-element", durationFrames: 9 },
      staticFallback: "Query token above three ranked passage chips.",
    }),
    shot({
      id: "v-contrast",
      sceneRef: "v-contrast",
      startFrame: 270,
      durationFrames: 120,
      claim: "Context changes what the answer can claim.",
      visualObjective: "Compare an unsourced and a sourced answer in vertical lanes.",
      focusTarget: "context-window",
      narrationCue: "v-context",
      onScreenLabels: ["Context"],
      exitHandoff: { semanticId: "context-window", targetSceneRef: "v-recap" },
      transitionIn: { kind: "crossfade", durationFrames: 9 },
      staticFallback: "Two vertical answer lanes, one with a citation chip.",
    }),
    shot({
      id: "v-recap",
      sceneRef: "v-recap",
      startFrame: 390,
      durationFrames: 60,
      claim: "Keep the retrieval step visible so claims stay checkable.",
      visualObjective: "Collapse the lanes back into a single vertical pipeline.",
      focusTarget: "context-window",
      narrationCue: "v-recap",
      onScreenLabels: ["Recall"],
      transitionIn: { kind: "crossfade", durationFrames: 9 },
      staticFallback: "Single vertical pipeline with a citation chip at the end.",
    }),
  ],
});

/** Valid storyboards used by the tests and the showcase. */
export const STORYBOARD_FIXTURES: Array<{ id: string; board: Storyboard }> = [
  { id: "typographic-30s", board: TYPOGRAPHIC_30S },
  { id: "explainer-60s", board: EXPLAINER_60S },
  { id: "social-9x16", board: SOCIAL_9X16 },
];

/* ------------------------------------------------------------------ *
 * Negative fixtures — one documented diagnostic each
 * ------------------------------------------------------------------ */

const NEGATIVE_BOARD = "Negative fixture for validation coverage.";

/**
 * Boards that must fail validation with exactly their `expectedCodes`.
 *
 * Two codes are deliberately absent: `storyboard-narration-cue-missing` and
 * `storyboard-label-overflow` need caller-supplied options (`knownCues`,
 * `labelFits`), so the test exercises them directly instead of through a board.
 */
export const NEGATIVE_STORYBOARDS: Array<{
  id: string;
  board: Storyboard;
  expectedCodes: string[];
}> = [
  {
    id: "empty",
    board: board({ id: "neg-empty", title: NEGATIVE_BOARD, fps: FPS_30, durationFrames: 0, shots: [] }),
    expectedCodes: ["storyboard-empty"],
  },
  {
    id: "duplicate-shot-id",
    board: board({
      id: "neg-duplicate-shot-id",
      title: NEGATIVE_BOARD,
      fps: FPS_30,
      durationFrames: 300,
      shots: [
        shot({ id: "dup", sceneRef: "scene-a", startFrame: 0, durationFrames: 150 }),
        shot({ id: "dup", sceneRef: "scene-b", startFrame: 150, durationFrames: 150 }),
      ],
    }),
    expectedCodes: ["storyboard-shot-id-duplicate"],
  },
  {
    id: "invalid-duration",
    board: board({
      id: "neg-invalid-duration",
      title: NEGATIVE_BOARD,
      fps: FPS_30,
      durationFrames: 100,
      shots: [
        shot({ id: "a", sceneRef: "scene-a", startFrame: 0, durationFrames: 100 }),
        shot({ id: "b", sceneRef: "scene-b", startFrame: 100, durationFrames: 0 }),
      ],
    }),
    expectedCodes: ["storyboard-shot-invalid-duration"],
  },
  {
    id: "invalid-start",
    board: board({
      id: "neg-invalid-start",
      title: NEGATIVE_BOARD,
      fps: FPS_30,
      durationFrames: 100,
      shots: [
        shot({ id: "a", sceneRef: "scene-a", startFrame: 0, durationFrames: 100 }),
        shot({ id: "b", sceneRef: "scene-b", startFrame: -10, durationFrames: 10 }),
      ],
    }),
    expectedCodes: ["storyboard-shot-invalid-start"],
  },
  {
    id: "coverage-gap",
    board: board({
      id: "neg-coverage-gap",
      title: NEGATIVE_BOARD,
      fps: FPS_30,
      durationFrames: 250,
      shots: [
        shot({ id: "a", sceneRef: "scene-a", startFrame: 0, durationFrames: 100 }),
        shot({ id: "b", sceneRef: "scene-b", startFrame: 150, durationFrames: 100 }),
      ],
    }),
    expectedCodes: ["storyboard-coverage-gap"],
  },
  {
    id: "coverage-overlap",
    board: board({
      id: "neg-coverage-overlap",
      title: NEGATIVE_BOARD,
      fps: FPS_30,
      durationFrames: 200,
      shots: [
        shot({ id: "a", sceneRef: "scene-a", startFrame: 0, durationFrames: 150 }),
        shot({ id: "b", sceneRef: "scene-b", startFrame: 100, durationFrames: 100 }),
      ],
    }),
    expectedCodes: ["storyboard-coverage-overlap"],
  },
  {
    id: "duration-mismatch",
    board: board({
      id: "neg-duration-mismatch",
      title: NEGATIVE_BOARD,
      fps: FPS_30,
      durationFrames: 150,
      shots: [
        shot({ id: "a", sceneRef: "scene-a", startFrame: 0, durationFrames: 100 }),
        shot({ id: "b", sceneRef: "scene-b", startFrame: 100, durationFrames: 100 }),
      ],
    }),
    expectedCodes: ["storyboard-duration-mismatch"],
  },
  {
    id: "claim-missing",
    board: board({
      id: "neg-claim-missing",
      title: NEGATIVE_BOARD,
      fps: FPS_30,
      durationFrames: 300,
      shots: [
        shot({ id: "a", sceneRef: "scene-a", startFrame: 0, durationFrames: 150, claim: "" }),
        shot({ id: "b", sceneRef: "scene-b", startFrame: 150, durationFrames: 150 }),
      ],
    }),
    expectedCodes: ["storyboard-claim-missing"],
  },
  {
    id: "objective-missing",
    board: board({
      id: "neg-objective-missing",
      title: NEGATIVE_BOARD,
      fps: FPS_30,
      durationFrames: 300,
      shots: [
        shot({ id: "a", sceneRef: "scene-a", startFrame: 0, durationFrames: 150, visualObjective: "   " }),
        shot({ id: "b", sceneRef: "scene-b", startFrame: 150, durationFrames: 150 }),
      ],
    }),
    expectedCodes: ["storyboard-objective-missing"],
  },
  {
    id: "focus-missing",
    board: board({
      id: "neg-focus-missing",
      title: NEGATIVE_BOARD,
      fps: FPS_30,
      durationFrames: 300,
      shots: [
        shot({ id: "a", sceneRef: "scene-a", startFrame: 0, durationFrames: 150, focusTarget: "" }),
        shot({ id: "b", sceneRef: "scene-b", startFrame: 150, durationFrames: 150 }),
      ],
    }),
    expectedCodes: ["storyboard-focus-missing"],
  },
  {
    id: "labels-empty",
    board: board({
      id: "neg-labels-empty",
      title: NEGATIVE_BOARD,
      fps: FPS_30,
      durationFrames: 300,
      shots: [
        shot({ id: "a", sceneRef: "scene-a", startFrame: 0, durationFrames: 150, onScreenLabels: [] }),
        shot({ id: "b", sceneRef: "scene-b", startFrame: 150, durationFrames: 150 }),
      ],
    }),
    expectedCodes: ["storyboard-labels-empty"],
  },
  {
    id: "handoff-target-unknown",
    board: board({
      id: "neg-handoff-target-unknown",
      title: NEGATIVE_BOARD,
      fps: FPS_30,
      durationFrames: 300,
      identities: ["query-token"],
      shots: [
        shot({
          id: "a",
          sceneRef: "scene-a",
          startFrame: 0,
          durationFrames: 150,
          exitHandoff: { semanticId: "query-token", targetSceneRef: "scene-absent" },
        }),
        shot({ id: "b", sceneRef: "scene-b", startFrame: 150, durationFrames: 150 }),
      ],
    }),
    expectedCodes: ["storyboard-handoff-target-unknown"],
  },
  {
    id: "handoff-identity-mismatch",
    board: board({
      id: "neg-handoff-identity-mismatch",
      title: NEGATIVE_BOARD,
      fps: FPS_30,
      durationFrames: 300,
      identities: ["retrieved-chunk"],
      shots: [
        shot({
          id: "a",
          sceneRef: "scene-a",
          startFrame: 0,
          durationFrames: 100,
          exitHandoff: { semanticId: "retrieved-chunk", targetSceneRef: "scene-b" },
        }),
        shot({
          id: "b",
          sceneRef: "scene-b",
          startFrame: 100,
          durationFrames: 100,
          exitHandoff: { semanticId: "ghost-token", targetSceneRef: "scene-c" },
        }),
        shot({ id: "c", sceneRef: "scene-c", startFrame: 200, durationFrames: 100 }),
      ],
    }),
    expectedCodes: ["storyboard-handoff-identity-mismatch"],
  },
  {
    id: "transition-invalid",
    board: board({
      id: "neg-transition-invalid",
      title: NEGATIVE_BOARD,
      fps: FPS_30,
      durationFrames: 100,
      shots: [
        shot({
          id: "a",
          sceneRef: "scene-a",
          startFrame: 0,
          durationFrames: 100,
          transitionIn: { kind: "crossfade", durationFrames: 0 },
        }),
      ],
    }),
    expectedCodes: ["storyboard-transition-invalid"],
  },
  {
    id: "transition-overlap",
    board: board({
      id: "neg-transition-overlap",
      title: NEGATIVE_BOARD,
      fps: FPS_30,
      durationFrames: 300,
      shots: [
        shot({
          id: "a",
          sceneRef: "scene-a",
          startFrame: 0,
          durationFrames: 150,
          transitionIn: { kind: "crossfade", durationFrames: 200 },
        }),
        shot({ id: "b", sceneRef: "scene-b", startFrame: 150, durationFrames: 150 }),
      ],
    }),
    expectedCodes: ["storyboard-transition-overlap"],
  },
  {
    id: "identity-unused",
    board: board({
      id: "neg-identity-unused",
      title: NEGATIVE_BOARD,
      fps: FPS_30,
      durationFrames: 300,
      identities: ["ghost-identity"],
      shots: [
        shot({ id: "a", sceneRef: "scene-a", startFrame: 0, durationFrames: 150 }),
        shot({ id: "b", sceneRef: "scene-b", startFrame: 150, durationFrames: 150 }),
      ],
    }),
    expectedCodes: ["storyboard-identity-unused"],
  },
  {
    id: "shot-no-fallback",
    board: board({
      id: "neg-shot-no-fallback",
      title: NEGATIVE_BOARD,
      fps: FPS_30,
      durationFrames: 300,
      shots: [
        shot({ id: "a", sceneRef: "scene-a", startFrame: 0, durationFrames: 150, staticFallback: undefined }),
        shot({ id: "b", sceneRef: "scene-b", startFrame: 150, durationFrames: 150 }),
      ],
    }),
    expectedCodes: ["storyboard-shot-no-fallback"],
  },
];
