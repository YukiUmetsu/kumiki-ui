# RAG explainer — from PDF text to useful answers

**One Storybook page:** Explainers → What Is RAG → RAG · From PDF to cited answer.
**Length:** 119 seconds (3,570 deterministic frames at 30 fps). Narrative order: lead with a cinematic **what is RAG?** definition, demonstrate how it works, then show **why it helps**.

| Time | One idea | Main visual action |
| --- | --- | --- |
| **0–12s** | **What is RAG?** | An oversized kinetic **RAG** expands to **Retrieval–Augmented–Generation**. Its letters dock into three steps: retrieve an actual handbook passage → add it to the original question's prompt → reveal a cited answer. |
| 12–22s | Extract PDF text | The wide red-marked handbook page contains the actual Section 4 policy; extraction preserves source identity. |
| 22–33s | Keep source-linked chunks | Source text separates into C01/C02/C03 without losing section references. |
| 33–44s | Create passage embeddings | Text enters the embedding model; indexed vectors retain chunk IDs. |
| 44–51s | Prepare the index | Five distinct semantic topics form neighborhoods in a height-aware 3D cloud. |
| 51–61s | Ask the question | One typed question, one Search click. |
| 61–69s | Embed the query | Visible, time-bounded question → model → vector transfers. |
| 69–83s | Retrieve similar passages | A controlled close-up shows nearby PTO records C01/C02 in the 3D semantic cloud. |
| 83–93s | Recover original evidence | Matching source IDs become readable handbook passages. |
| 93–107s | Generate an answer | Original question and retrieved context become the augmented prompt, then a cited answer. |
| **107–119s** | **Why use RAG?** | A three-row keyword-search vs semantic-RAG comparison progressively reveals outputs, strengths and weaknesses. |

## Design contracts

- **Opening hook:** use one bold typographic move and one meaningful causal transformation per beat. The giant acronym maps directly to **RETRIEVE**, **AUGMENT THE PROMPT**, and **GENERATE**. It must not imply modifying the original PDF or source text. `rag-hook.tsx` uses the same deterministic frame clock, exact C01 source passage, and motion only for semantic tokens. The final answer should remain readable long enough to register before cutting to the document explanation.

- **One idea and one principal visual action per scene.** Short subtitle; no duplicated slogans, invented transitions or on-screen methodological disclaimers.
- Color coding comes from source semantics: **PTO mint, Travel violet, Payroll pink, Holidays orange, Benefits blue; query gold.** Distinct source labels C04/C05/C06 are not lumped into a grey Other bucket.
- The cloud uses true 3-axis *illustration* coordinates (X, depth, independent height). Its five clusters are spaced apart across the viewport. Each topic badge stays near its projected cluster centroid during camera focus rather than sitting in a detached top legend. The camera performs one forward push with no reverse drift.
- **Technical accuracy:** the six sample retrieval vectors in `rag-domain.ts` are two-dimensional toy numbers, not output from an actual model. A third spatial height coordinate is used **only to illustrate the volume**, not as an extra real embedding dimension. Similarity ranking uses the original toy vectors; the renderer never changes result ordering. Synthetic background particles do **not** represent indexed records.
- Show the title, policy text and red PDF mark on one landscape-proportioned paper page, never as floating labels beside a skinny file icon; display sections as **“Section 4”**, never as unexplained typographical symbols.
- The only connection animations are meaningful transfers between adjacent parts of a process. The lines are absent before a transfer and disappear afterward. Elevation guides in the 3D view are solid, not decorative dotted routes.
- **Comparison precision:** traditional keyword document search often returns pages or snippets; RAG may use keyword, vector, or hybrid retrieval but adds evidence retrieved into an LLM prompt for answer generation with a source reference. Citations still need human verification.
- **Final table:** one shared row label for **Output / Strengths / Weaknesses**, two bounded columns, two lines max per cell, and progressive row reveal. Keyword is lightweight and deterministic for exact SKUs, error codes and part numbers but can miss synonyms. Semantic retrieval can handle intent, conceptual similarity and multilingual matches **with appropriate models**. RAG incurs additional compute/operational complexity and generated answers must be verified; these are not mutually exclusive retrieval choices.

## Review and export

```bash
npm run storybook
# Optional local capture only: FFmpeg and Chromium needed
node scripts/export-rag-video.mjs
# Review only the opening hook (12 seconds)
node scripts/export-rag-video.mjs --startFrame=0 --frames=360 --output=dist/rag-hook.mp4
# Query-time 3D camera/semantic selection
node scripts/export-rag-video.mjs --startFrame=2070 --frames=420 --output=dist/vector-focus.mp4
# Closing comparison
node scripts/export-rag-video.mjs --startFrame=3210 --frames=360 --output=dist/rag-benefits.mp4
```

No Playwright/browser automation in GitHub CI. Before merging, manually inspect normal-speed playback, labels and clipping in Storybook and one output video. Green unit/type checks alone do not certify visual polish.
