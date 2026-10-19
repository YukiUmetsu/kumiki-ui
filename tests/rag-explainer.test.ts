import { expect, it } from "vitest";
import { createRagProduction, RAG_CHAPTERS, RAG_VISUAL_REGION } from "../src/rag-explainer/rag-production";
import { planExplainerLayout } from "../registry/visual/explainer-layout";
import { evaluateExplainerFrame } from "../registry/visual/explainer-sequence";
import { RAG_EXAMPLE_TRACE, RAG_CHUNKS, RAG_QUESTION, cosineSimilarity } from "../src/rag-explainer/rag-domain";

it("compiles the 56-second PDF ingestion slice with an unmoving camera", () => {
  const sequence = createRagProduction(); // Also checks every compiled camera frame.
  expect(sequence.durationFrames).toBe(1680);
  expect(sequence.shots.map(shot => shot.id)).toEqual(RAG_CHAPTERS.map(chapter => chapter.id));
  expect(sequence.shots[sequence.shots.length - 1]?.role).toBe("summary");
  expect(RAG_CHAPTERS.map(chapter => chapter.id)).toEqual(["upload", "extract", "chunk", "embed", "index", "search"]);
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

it("keeps RAG captions below diagram artwork at preview and export widths", () => {
  for (const width of [1600, 1000, 720]) {
    const fontSizePx = Math.max(13, width * 26 / 1600);
    const layout = planExplainerLayout({
      viewport: { width, height: width * 9 / 16 },
      subjects: [{ id: "diagram", region: RAG_VISUAL_REGION }],
      protect: ["diagram"], text: "Source text → prompt → answer.",
      maxLines: 2, font: fontSizePx + "px Geist",
      fontSizePx, lineHeightPx: fontSizePx * 1.38,
      gapPx: 20,
    }, (_font, value) => [...value].length * fontSizePx * .55);
    expect(layout.ok).toBe(true);
    if (layout.ok) {
      expect(layout.text.placement).toBe("below");
      expect(layout.text.rect.y).toBeGreaterThanOrEqual(RAG_VISUAL_REGION.height);
    }
  }
});

it("keeps RAG's visible ANN walk, ranking, source text and citation grounded in one corpus", () => {
  expect(RAG_EXAMPLE_TRACE.traversed).toEqual(["C03", "C04", "C05", "C01"]);
  expect(RAG_EXAMPLE_TRACE.hits.map(hit => hit.chunk.id)).toEqual(["C01", "C02"]);
  expect(RAG_EXAMPLE_TRACE.prompt.question).toBe(RAG_QUESTION);
  expect(RAG_EXAMPLE_TRACE.prompt.context[0]?.text).toBe(RAG_CHUNKS[0].text);
  expect(RAG_EXAMPLE_TRACE.prompt.context[0]?.source).toContain("§4");
  for (const candidate of RAG_EXAMPLE_TRACE.candidates) {
    expect(candidate.similarity).toBeCloseTo(
      cosineSimilarity([.90, .43], candidate.chunk.embedding), 12);
  }
});
