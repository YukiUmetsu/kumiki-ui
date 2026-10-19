# RAG explainer — from PDF text to useful answers

**One Storybook page:** Explainers → What Is RAG → RAG · From PDF to cited answer.
**Length:** 107 seconds (3,210 frames at 30 fps). Narrative order: show **how** RAG works, then end with **why it helps**.

| Time | One idea | Main visual action |
| --- | --- | --- |
| 0–10s | Extract text from the handbook | Recognizable red **PDF** document → readable policy and source **Section 4** |
| 10–21s | Preserve passages and source identity | Extracted text separates into C01/C02/C03 with human-readable section labels |
| 21–32s | Embed each passage | Text enters embedding model; vectors retain chunk IDs |
| 32–39s | Store vectors in related neighborhoods | A **3D** cloud emerges with independent height/depth and five distinct topics |
| 39–49s | Submit the question | One typed question, one Search click |
| 49–57s | Give the question an embedding | Two **timed, meaningful connections:** query → model → vector |
| 57–71s | Find nearby passages | Gold question enters the same 3D space; camera pushes toward nearby PTO records; C01/C02 highlight |
| 71–81s | Retrieve original wording | Two sequential vector IDs unfold into their original source passages |
| 81–95s | Generate a sourced answer | Context becomes the prompt, then gives way to a cited answer |
| **95–107s** | **Why RAG?** | Three rows comparing conventional document search with an evidence-grounded answer, revealed one pair at a time |

## Design contracts

- **One idea and one principal visual action per scene.** Short subtitle; no duplicated slogans, invented transitions or on-screen methodological disclaimers.
- Color coding comes from source semantics: **PTO mint, Travel violet, Payroll pink, Holidays orange, Benefits blue; query gold.** Distinct source labels C04/C05/C06 are not lumped into a grey Other bucket.
- The cloud uses true 3-axis *illustration* coordinates (X, depth, independent height). Its five clusters are spaced apart across the viewport. Each topic badge stays near its projected cluster centroid during camera focus rather than sitting in a detached top legend. The camera performs one forward push with no reverse drift.
- **Technical accuracy:** the six sample retrieval vectors in `rag-domain.ts` are two-dimensional toy numbers, not output from an actual model. A third spatial height coordinate is used **only to illustrate the volume**, not as an extra real embedding dimension. Similarity ranking uses the original toy vectors; the renderer never changes result ordering. Synthetic background particles do **not** represent indexed records.
- Use a red PDF paper mark instead of the generic file node; display sections as **“Section 4”**, never as unexplained typographical symbols.
- The only connection animations are meaningful transfers between adjacent parts of a process. The lines are absent before a transfer and disappear afterward. Elevation guides in the 3D view are solid, not decorative dotted routes.
- **Comparison precision:** traditional keyword document search often returns pages or snippets; RAG may use keyword, vector, or hybrid retrieval but adds evidence retrieved into an LLM prompt for answer generation with a source reference. Citations still need human verification.

## Review and export

```bash
npm run storybook
# Optional local capture only: FFmpeg and Chromium needed
node scripts/export-rag-video.mjs
# Query-time 3D camera/semantic selection
node scripts/export-rag-video.mjs --startFrame=1710 --frames=420 --output=dist/vector-focus.mp4
# Comparison ending
node scripts/export-rag-video.mjs --startFrame=2850 --frames=360 --output=dist/rag-benefits.mp4
```

No Playwright/browser automation in GitHub CI. Before merging, manually inspect normal-speed playback, labels and clipping in Storybook and one output video. Green unit/type checks alone do not certify visual polish.
