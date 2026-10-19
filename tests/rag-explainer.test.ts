import { expect, it } from "vitest";
import { createRagProduction, RAG_CHAPTERS, RAG_VISUAL_REGION } from "../src/rag-explainer/rag-production";
import { planExplainerLayout } from "../registry/visual/explainer-layout";
import { evaluateExplainerFrame } from "../registry/visual/explainer-sequence";
import { RAG_EXAMPLE_TRACE, RAG_CHUNKS, RAG_QUESTION, cosineSimilarity } from "../src/rag-explainer/rag-domain";
import { typedRagQuestionAt } from "../src/rag-explainer/rag-search-typing";
import { projectToyVector, ragSemanticDomain, ragVectorFocusAt } from "../src/rag-explainer/rag-vector-space";

it("compiles the complete PDF-to-cited-answer RAG film with an unmoving camera", () => {
  const sequence = createRagProduction(); // Also checks every compiled camera frame.
  expect(sequence.durationFrames).toBe(3210);
  expect(sequence.shots.map(shot => shot.id)).toEqual(RAG_CHAPTERS.map(chapter => chapter.id));
  expect(sequence.shots[sequence.shots.length - 1]?.role).toBe("summary");
  expect(RAG_CHAPTERS.map(chapter => chapter.id)).toEqual(["extract", "chunk", "embed", "index", "search", "compare", "query-embed", "retrieve", "evidence", "generate"]);
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

it("ranks nearest PTO vectors without a fictitious distant traversal", () => {
  expect(RAG_EXAMPLE_TRACE.selected).toEqual(["C01", "C02"]);
  expect(RAG_EXAMPLE_TRACE.hits.map(hit => hit.chunk.id)).toEqual(["C01", "C02"]);
  expect(RAG_EXAMPLE_TRACE.prompt.question).toBe(RAG_QUESTION);
  expect(RAG_EXAMPLE_TRACE.prompt.context[0]?.text).toBe(RAG_CHUNKS[0].text);
  expect(RAG_EXAMPLE_TRACE.prompt.context[0]?.source).toContain("§4");
  for (const candidate of RAG_EXAMPLE_TRACE.candidates) {
    expect(candidate.similarity).toBeCloseTo(
      cosineSimilarity([.90, .43], candidate.chunk.embedding), 12);
  }
});

it("types the exact search question using reusable MG1 glyph tracks", () => {
  expect(typedRagQuestionAt(0)).toBe("");
  const midpoint = typedRagQuestionAt(128);
  expect(midpoint.length).toBeGreaterThan(0);
  expect(midpoint.length).toBeLessThan(RAG_QUESTION.length);
  expect(RAG_QUESTION.startsWith(midpoint)).toBe(true);
  expect(typedRagQuestionAt(212)).toBe(RAG_QUESTION);
});

it("keeps query-time retrieved source text tied to the same indexed PDF sections", () => {
  expect(RAG_EXAMPLE_TRACE.hits.map(hit => hit.chunk.id)).toEqual(["C01", "C02"]);
  const source = RAG_EXAMPLE_TRACE.prompt.context[0];
  expect(source.text).toBe(RAG_CHUNKS[0].text);
  expect(source.source).toContain("§4");
  expect(RAG_CHAPTERS[RAG_CHAPTERS.length - 1].end).toBe(3210);
  expect(RAG_CHAPTERS.find(x => x.id === "retrieve")?.start).toBe(2070);
});

it("projects source-linked toy embeddings into one stable, readable semantic field", () => {
  const [qx, qy] = projectToyVector([.90, .43]);
  const [px, py] = projectToyVector(RAG_CHUNKS[0].embedding);
  const [tx, ty] = projectToyVector(RAG_CHUNKS[2].embedding);
  expect(Math.hypot(qx-px, qy-py)).toBeLessThan(45);
  expect(Math.hypot(qx-tx, qy-ty)).toBeGreaterThan(300);
  for (const chunk of RAG_CHUNKS) {
    const [x,y]=projectToyVector(chunk.embedding);
    expect(x).toBeGreaterThan(150);
    expect(x).toBeLessThan(1080);
    expect(y).toBeGreaterThan(70);
    expect(y).toBeLessThan(470);
  }
});

it("keeps the explanatory focus small and the camera move intentional", () => {
  expect(RAG_CHAPTERS[0].id).toBe("extract");
  expect(RAG_CHAPTERS.some(ch => ch.id === "upload")).toBe(false);
  expect(RAG_CHAPTERS.some(ch => ch.id === "recap")).toBe(false);
  expect(ragSemanticDomain("C01")).toBe("PTO");
  expect(ragSemanticDomain("C02")).toBe("PTO");
  expect(ragSemanticDomain("C03")).toBe("Travel");
  expect(ragSemanticDomain("C06")).toBe("Benefits");
  expect(ragVectorFocusAt(400, false).zoom).toBe(1);
  const zooms = [0, 30, 70, 110, 150, 170, 300].map(
    f => ragVectorFocusAt(f, true).zoom,
  );
  expect(zooms).toEqual([...zooms].sort((a, b) => a - b));
  expect(zooms[zooms.length-1]).toBeCloseTo(1.52, 5);
});
