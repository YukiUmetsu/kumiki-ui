# RAG explainer — source PDF to cited answer

**One Storybook page:** Explainers → What Is RAG → RAG · From PDF to cited answer.
**Current storyboard:** 107 seconds, 3,210 deterministic frames at 30 fps. The visual is a teaching simulation, not real PDF parsing or model inference.

| Time | One idea per scene | Essential visual action |
| --- | --- | --- |
| 0–10s | A PDF contains readable source text | A handbook sentence and §4 reference become extracted text; no upload/OCR digression |
| 10–21s | Retrieval uses smaller passages | The sentence separates into source-linked chunk C01, with C02/C03 |
| 21–32s | Embeddings represent text numerically | Chunk identities survive text→vector transformation |
| 32–39s | Related meaning forms neighborhoods | Colored PTO, Benefits, Travel and Other clusters appear in one vector field |
| 39–49s | Someone asks a question | One actual typed question and Search click; no duplicate orange question |
| 49–61s | Search vs. RAG | A two-column, three-row comparison is revealed **one row at a time**: retrieved pages vs sourced answer, user's next step |
| 61–69s | Query gets a compatible embedding | The same question passes through the embedding model |
| 69–83s | Similar passages rank highest | Gold query appears in the same semantic field; **one-way camera push** closes on the nearby PTO cluster; C01/C02 selected, no artificial C03 traversal |
| 83–93s | Vectors identify the original text | Two sequential source IDs unfold into actual source passages; no permanently drawn connectors |
| 93–107s | Source context leads to an answer | Prompt assembles, recedes, then a cited answer becomes the **final frame**; no redundant pipeline recap |

## Direction: teach, don't decorate

- **One idea / one transformation / one short caption** per scene. Scene titles should provide orientation, not read the same words as the caption or narration. Avoid explanatory footnotes inside the art.
- A connector is **not rendered** until its actual transfer starts, grows with that transfer, and disappears shortly afterward. No random data particles traveling just to disguise scene changes. If the same object is not preserved, use a simple deliberate dissolve.
- Static camera for documents and interface. Exactly **one purposeful editorial camera move** inside the vector scene: push into query-adjacent PTO records, hold for the ranking. No reverse dolly or oscillation.
- Semantic colors: gold = query, mint = PTO, blue = Benefits, violet = Travel, grey = Other; keep the legend anchored when zooming. Use the same declared toy corpus, calculated cosine scores, source IDs, and retrieved text in every scene.
- The embedding space is an explanatory projection; do **not** overlay disclaimer labels on the graphics. For technical precision outside the film, the sample corpus has six two-dimensional toy vectors, not production-model embeddings. The vector search uses **exact ranking of the six records**, not a simulated ANN index traversal.
- **Comparison accuracy:** keyword document search often returns pages and snippets; RAG can use keyword, semantic, or hybrid retrieval and adds prompt augmentation and answer generation from retrieved evidence. A citation allows verification but is not a guarantee of accuracy.

## Review and export

```bash
npm run storybook
# The same Storybook composition also supports manual deterministic export:
node scripts/export-rag-video.mjs
# Review the vector close-up without rendering the entire film:
node scripts/export-rag-video.mjs --startFrame=2070 --frames=420 --output=dist/vector-focus.mp4
```

Browser/FFmpeg dependencies are required for manual export. `?ragExport=1` is reserved for capture. No browser/Playwright tests in GitHub CI.

**Quality gate:** typechecking and small deterministic tests cannot prove cinema quality. Review the full animation at normal speed and final size. In particular, verify text boundaries, legend clarity during the close-up, no premature line appearance, and a readable cited final frame. Do not merge on CI alone.
