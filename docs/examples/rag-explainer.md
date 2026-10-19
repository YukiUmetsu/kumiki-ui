# RAG explainer — from PDF to a cited answer

**Implementation:** 110 seconds · 3,300 absolute frames · 30 fps · 1600×900 export. One Storybook page: **Explainers → What Is RAG → RAG · From PDF to cited answer**. Visual direction: [RAG V2 motion treatment](rag-v2-motion-treatment.md); prior feedback and prevention rules: [Explainer lessons](../15-explainer-lessons.md).

| Seconds | Viewer follows | Technical operation |
| --- | --- | --- |
| 0–7 | Employee Handbook.pdf enters the library | Ingestion precedes searches |
| 7–17 | Pages split into selectable-text parsing and scanned-image OCR; recovered words move into extracted output | Choose extraction per page; retain section/page IDs; OCR is not infallible |
| 17–28 | Visible identified text strips peel off the extracted page | Chunk text with source references; three of six demo chunks shown |
| 28–39 | Chunks travel through an embedding lattice, with matching vector IDs emerging | Text → vector; keep source text separately |
| 39–46 | A projected semantic embedding space shows topical neighborhoods and source IDs; the source record keeps its vector and citation | Prepared index and example neighbor links |
| 46–56 | User types and clicks Search; the question leaves the UI | Query time begins |
| 56–64 | The **same question** arrives as a gold token and is embedded | Compatible query/document embedding space |
| 64–78 | An ANN-like graph is traversed from C03 → C04 → C05 → C01; scores appear **after traversal**; top-2 selects C01/C02 | Candidate exploration; measured cosine similarity from toy vectors; rank/select |
| 78–88 | Selected IDs enter source lookup; original passages emerge with § references | Vectors are retrieval keys, **not** LLM source text |
| 88–102 | Question and two exact passages assemble into a prompt; LLM produces an example answer linking to Handbook §4 | Augmentation + generation + citation |
| 102–110 | One connected two-lane graph traces PDF ingestion and query-time retrieval to the final answer | Full RAG architecture; grounded but still verify sources |

**Semantic truth:** `rag-domain.ts` is the shared data model for chunk IDs, fictional handbook text, demo vectors, illustrative ANN neighbor traversal, computed similarities, ranked hits, prompt passages, and citation. It is **not** a real embedding model, PDF parser, OCR engine, ANN implementation, vector DB, or LLM call. Graph layouts are conceptual; their 2D screen positions do not represent actual embedding coordinates. Different vector databases use different indexing/search methods. The demonstration's answer makes a claim only about the fictional sample handbook.

## Implementation and UI contracts

- ES1 sequence compiler, player and frame capture supply **one frame clock**.
- The projected SVG vector space preserves source IDs and uses MG1 motion paths for illustrative candidate search. Kumiki `DiagramStage` still drives the final connected two-lane recap; `KineticText` drives the query and its caret shares the exact SVG text run.
- No camera zoom, shake or unnecessary cut. The PDF opening is static; animated motion is reserved for extraction, representation changes, candidate traversal, and prompt-to-answer. Authored scene dissolves do not change camera pose.
- Caption placement protects an authored **81%** visual stage and reserves **19%** for one concise subtitle. The on-video footer HUD and redundant source footnotes are removed. Preview is responsive; 1600×900 is fixed **only** in export mode.
- One Storybook story; append `?ragExport=1` to the iframe story URL to access the same composition in capture mode.
- Lightweight deterministic tests for compiled 3,300-frame timeline, source identity, cosine arithmetic and caption exclusion. No Playwright in CI.

## Preview and optional silent MP4 export

```bash
npm ci
npm run storybook
# Optional local export: FFmpeg + Chromium installed
npx playwright install chromium
node scripts/export-rag-video.mjs
```

The script exports all 3,300 frames into `dist/rag-explainer.mp4` (H.264, 30 fps) if Chromium and FFmpeg are available. Supply already synchronized narration with `--audio=/path/to/track.wav`; no speech is synthesized. For a quick sample: `node scripts/export-rag-video.mjs --frames=90 --output=dist/rag-preview.mp4`.
For focused manual review **without rendering all 3,300 frames**:
```bash
node scripts/export-rag-video.mjs --startFrame=1920 --frames=420 --output=dist/vector-db-review.mp4
node scripts/export-rag-video.mjs --startFrame=2640 --frames=660 --output=dist/answer-and-recap-review.mp4
```
Frame offsets preserve the absolute ES1 timeline. With an optional audio input, FFmpeg also seeks the track to the corresponding starting time.

**Review gate:** CI cannot prove cinematographic quality. This branch has not been visually played back in the user's browser, and the final MP4 has not been rendered or inspected in this environment. Confirm timing, pacing, collision-free labels and source continuity at normal speed before merging.
