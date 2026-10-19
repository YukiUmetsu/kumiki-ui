import { expect, it } from "vitest";
import { createRagProduction, RAG_CHAPTERS, RAG_VISUAL_REGION } from "../src/rag-explainer/rag-production";
import { planExplainerLayout } from "../registry/visual/explainer-layout";
import { evaluateExplainerFrame } from "../registry/visual/explainer-sequence";
import { RAG_EXAMPLE_TRACE, RAG_CHUNKS, RAG_QUESTION, cosineSimilarity, displaySection } from "../src/rag-explainer/rag-domain";
import { typedRagQuestionAt } from "../src/rag-explainer/rag-search-typing";
import { projectToyVector, ragSemanticDomain, ragVectorFocusAt, ragCloudHeightRange, ragSemanticLabelsAt } from "../src/rag-explainer/rag-vector-space";
import { RAG_COMPARISON_ROWS } from "../src/rag-explainer/rag-comparison";
import { RAG_HOOK_FRAMES, RAG_HOOK_BEATS, ragHookReveal, ragHookStageAt } from "../src/rag-explainer/rag-hook";

it("compiles the complete PDF-to-cited-answer RAG film with an unmoving camera", () => {
  const sequence = createRagProduction(); // Also checks every compiled camera frame.
  expect(sequence.durationFrames).toBe(3570);
  expect(sequence.shots.map(shot => shot.id)).toEqual(RAG_CHAPTERS.map(chapter => chapter.id));
  expect(sequence.shots[sequence.shots.length - 1]?.role).toBe("summary");
  expect(RAG_CHAPTERS.map(chapter => chapter.id)).toEqual(["hook", "extract", "chunk", "embed", "index", "search", "query-embed", "retrieve", "evidence", "generate", "compare"]);
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
  expect(RAG_CHAPTERS[RAG_CHAPTERS.length - 1].end).toBe(3570);
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
  expect(RAG_CHAPTERS[0].id).toBe("hook");
  expect(RAG_CHAPTERS.map(ch => String(ch.id)).includes("upload")).toBe(false);
  expect(RAG_CHAPTERS.map(ch => String(ch.id)).includes("recap")).toBe(false);
  expect(ragSemanticDomain("C01")).toBe("PTO");
  expect(ragSemanticDomain("C02")).toBe("PTO");
  expect(ragSemanticDomain("C03")).toBe("Travel");
  expect(ragSemanticDomain("C04")).toBe("Payroll");
  expect(ragSemanticDomain("C05")).toBe("Holidays");
  expect(ragSemanticDomain("C06")).toBe("Benefits");
  expect(ragVectorFocusAt(400, false).zoom).toBe(1);
  const zooms = [0, 30, 70, 110, 150, 170, 300].map(
    f => ragVectorFocusAt(f, true).zoom,
  );
  expect(zooms).toEqual([...zooms].sort((a, b) => a - b));
  expect(zooms[zooms.length-1]).toBeCloseTo(1.52, 5);
});

it("moves the search-vs-RAG benefit comparison to the closing scene", () => {
  const final = RAG_CHAPTERS[RAG_CHAPTERS.length-1];
  expect(final.id).toBe("compare");
  expect(final.start).toBe(3210);
  expect(final.end).toBe(3570);
});

it("projects a truly elevated 3D scatter cloud with different topic colors", () => {
  const cloud=ragCloudHeightRange();
  expect(cloud.count).toBeGreaterThan(150);
  expect(cloud.max-cloud.min).toBeGreaterThan(1.3);
  expect(new Set(RAG_CHUNKS.map(chunk => ragSemanticDomain(chunk.id))).size).toBe(5);
  expect(ragVectorFocusAt(170,true).yaw).toBeGreaterThan(ragVectorFocusAt(0,true).yaw);
});

it("uses human-readable source section labels in the film", () => {
  expect(displaySection("§4")).toBe("Section 4");
  expect(displaySection("Example Handbook §2")).toBe("Section 2");
  expect(displaySection("Section 5")).toBe("Section 5");
});

it("positions each topic badge beside its own 3D cluster, not in a detached legend", () => {
  const labels = ragSemanticLabelsAt(0,false);
  expect(labels).toHaveLength(5);
  expect(new Set(labels.map(d=>d.color)).size).toBe(5);
  for (const label of labels) {
    const self=Math.hypot(label.x-label.centerX,label.y-label.centerY);
    expect(self).toBeLessThan(126);
    expect(label.x).toBeGreaterThan(15);
    expect(label.x).toBeLessThan(970);
    expect(label.y).toBeGreaterThan(60);
    expect(label.y).toBeLessThan(440);
    for (const other of labels) {
      if (other.id===label.id) continue;
      expect(Math.hypot(label.centerX-other.centerX,
        label.centerY-other.centerY)).toBeGreaterThan(145);
      expect(self).toBeLessThan(Math.hypot(label.x-other.centerX,
        label.y-other.centerY));
    }
  }
  const pto = ragSemanticLabelsAt(420,true).find(x=>x.id==="PTO")!;
  expect(pto.x).toBeGreaterThan(0);
  expect(pto.x).toBeLessThan(1000);
  expect(pto.y).toBeGreaterThan(40);
});

it("moves the camera's question focus monotonically without reverse zoom drift", () => {
  const frames=[0,25,45,68,92,115,145,168,200,420];
  const poses=frames.map(frame=>ragVectorFocusAt(frame,true));
  expect(poses.map(x=>x.zoom)).toEqual(poses.map(x=>x.zoom).sort((a,b)=>a-b));
  for(let i=1;i<poses.length;i++){
    expect(poses[i].screenX).toBeLessThanOrEqual(poses[i-1].screenX+1e-8);
    expect(poses[i].screenY).toBeLessThanOrEqual(poses[i-1].screenY+1e-8);
  }
});

it("keeps the final comparison focused on output, strengths and weaknesses", () => {
  expect(RAG_COMPARISON_ROWS.map(row => row.label)).toEqual([
    "OUTPUT", "STRENGTHS", "WEAKNESSES",
  ]);
  const strengths=RAG_COMPARISON_ROWS[1];
  expect(strengths.search.join(" ")).toMatch(/SKUs.*part numbers.*error codes/);
  expect(strengths.rag.join(" ")).toMatch(/Synonyms.*intent.*natural questions/);
  expect(strengths.rag.join(" ")).toMatch(/multilingual models/);
  const tradeoffs=RAG_COMPARISON_ROWS[2];
  expect(tradeoffs.search.join(" ")).toMatch(/rephrasing.*synonyms/);
  expect(tradeoffs.rag.join(" ")).toMatch(/cost and complexity/);
  expect(tradeoffs.rag.join(" ")).toMatch(/verification/);

  const safeStageBottom=729;
  const headerBottom=267;
  for (const [index,row] of RAG_COMPARISON_ROWS.entries()) {
    expect(row.y).toBeGreaterThan(headerBottom);
    expect(row.y+row.height).toBeLessThan(safeStageBottom-45);
    expect(row.search.length).toBeLessThanOrEqual(2);
    expect(row.rag.length).toBeLessThanOrEqual(2);
    if (index>0) {
      const previous=RAG_COMPARISON_ROWS[index-1];
      expect(row.y).toBeGreaterThan(previous.y+previous.height+12);
      expect(row.at).toBeGreaterThan(previous.at+60);
    }
  }
});

it("opens with a punchy, source-grounded three-beat RAG definition", () => {
  expect(RAG_HOOK_FRAMES).toBe(360);
  expect(RAG_CHAPTERS[0]).toEqual({
    id:"hook",start:0,end:360,label:"What is RAG?",
  });
  const markers=[RAG_HOOK_BEATS.retrieve[0],RAG_HOOK_BEATS.augment[0],
    RAG_HOOK_BEATS.generate[0]];
  expect(markers).toEqual([...markers].sort((a,b)=>a-b));
  expect(ragHookStageAt(0)).toBe("title");
  expect(ragHookStageAt(130)).toBe("retrieve");
  expect(ragHookStageAt(205)).toBe("augment");
  expect(ragHookStageAt(295)).toBe("generate");
  for(const [at,duration] of [[5,30],[131,22],[225,17],[287,40]]) {
    const progresses=[at,at+duration/4,at+duration/2,
      at+duration-1,at+duration].map(f=>ragHookReveal(f,at,duration));
    expect(progresses).toEqual([...progresses].sort((a,b)=>a-b));
    expect(progresses[0]).toBe(0);
    expect(progresses[progresses.length-1]).toBe(1);
  }
  const cue=createRagProduction().director.cues.find(
    c=>c.frame===0 && c.payload.kind==="narration");
  expect(cue).toBeDefined();
});
