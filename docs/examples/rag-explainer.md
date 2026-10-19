# RAG explainer — PDF-first production

**Current implementation:** 56 seconds / 1,680 frames at 30 fps. This is **Part 1** of the [110-second RAG V2 treatment](rag-v2-motion-treatment.md). It is not yet a complete retrieval-and-answer film and remains unapproved until normal-speed visual review.

**One Storybook entry:** Explainers → What Is RAG → RAG · PDF to vector index (Part 1).

| Seconds | Demonstration | Accuracy requirement |
| --- | --- | --- |
| 0–7 | Drag Employee Handbook.pdf to the knowledge base and commit the import | Ingestion **before** any user question |
| 7–17 | Embedded text parsed directly; scanned-image page recognized with OCR; outputs converge | OCR is needed for image-only pages, not all PDFs; extraction/OCR are simulated |
| 17–28 | Extracted text becomes C01/C02/C03 strips with source sections | IDs and original text come from the same `rag-domain.ts` corpus |
| 28–39 | Passages enter embedding-model lattice and emerge as illustrative vectors | Source text remains linked; 2D toy numbers are not live model inference |
| 39–46 | Vectors settle into Kumiki `DiagramStage` graph with attached routes/packets | Graph is a teaching abstraction, not a universal vector-DB structure |
| 46–56 | User types the PTO question, presses Search, gold query enters retrieval path | First query happens *after* index creation |

## Visual and implementation principles

A static camera holds the entire film; no automatic zooms or cuts. Motion is concentrated in the PDF, extraction paths, strips, embedding lattice, index routes and search interaction. Objects keep IDs, and the measured narration cue remains in a separate protected lower lane. The responsive preview fits its Storybook container; fixed 1600×900 output applies only in export mode.

Reuse: ES1 sequence/player/capture, semantic text-placement contract, MG1 arc-length path sampling, `DiagramStage` linked graph/packets, the shared typed example corpus. Refer to the [revision ledger](../15-explainer-lessons.md) when extending.

## Preview

```bash
npm ci
npm run storybook
```

Open **Explainers → What Is RAG** (one page), use the play/pause control or chapter tabs. This is a *cinematic preview*, not a working PDF parser, OCR runtime, or embedding service.

## Manual MP4 export

```bash
brew install ffmpeg
npx playwright install chromium
node scripts/export-rag-video.mjs
```

`dist/rag-explainer.mp4` is the 56-second 1600×900 30-fps H.264 film, silent unless `--audio=/path/to/aligned-track.wav` is provided. To inspect the opening 3 seconds: `node scripts/export-rag-video.mjs --frames=90 --output=dist/rag-preview.mp4`.

The exporter seeks the **same one Storybook story** in its internal `?ragExport=1` mode and encodes frames using FFmpeg. It is opt-in, not part of GitHub CI. Full playback and MP4 pixels **have not been visually inspected by the assistant**.

Next: implement query embedding → ANN/cosine/top-k → original source passage retrieval → grounded LLM prompt → cited answer → full recap, following the V2 treatment; do not call Part 1 a completed RAG explanation.
