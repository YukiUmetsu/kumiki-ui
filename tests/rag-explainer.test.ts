import { expect, it } from "vitest";
import { createRagProduction, RAG_CHAPTERS } from "../src/rag-explainer/rag-production";
import { evaluateExplainerFrame } from "../registry/visual/explainer-sequence";

it("compiles the factual 36-second RAG production with an unmoving camera", () => {
  const sequence = createRagProduction(); // Also checks every compiled camera frame.
  expect(sequence.durationFrames).toBe(1080);
  expect(sequence.shots.map(shot => shot.id)).toEqual(RAG_CHAPTERS.map(chapter => chapter.id));
  expect(sequence.shots.at(-1)?.role).toBe("summary");
  for (const chapter of RAG_CHAPTERS) {
    const atStart = evaluateExplainerFrame(sequence, chapter.start);
    const atEnd = evaluateExplainerFrame(sequence, chapter.end - 1);
    expect(atStart.shot.id).toBe(chapter.id);
    expect(atEnd.shot.id).toBe(chapter.id);
    expect(atStart.explanation.length).toBeGreaterThan(12);
    expect(sequence.director.cues.some(cue => cue.frame === chapter.start &&
      cue.payload.kind === "narration")).toBe(true);
    expect(sequence.composition.sample(chapter.start).issues).toEqual([]);
  }
}, 45_000);
