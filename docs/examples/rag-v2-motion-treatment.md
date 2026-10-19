# RAG V2 — PDF-first motion treatment

**Status:** Production design. Build the opening 0–56 seconds first and review real playback before developing retrieval/generation. The old 36-second version is superseded.

## Narrative

**A PDF becomes searchable knowledge before anyone asks a question.** We see how a document is ingested, how born-digital text differs from scanned-image OCR, how text becomes source-linked chunks, how embeddings populate the index, and *then* a user searches. The same identified chunks subsequently survive retrieval and appear as literal text in the LLM prompt.

A single **Employee Handbook.pdf** drives the entire demonstration. Its highlighted sentence in **C01 · §4** says **“Up to five unused PTO days may be carried into the next calendar year.”** The final answer and citation must use that exact source. Illustrative embedding vectors come from `rag-domain.ts` and are never represented as real model output.

## Frame-accurate production outline (110 seconds, 30 fps)

| Time | Visual action and continuity | What the viewer learns |
| --- | --- | --- |
| **0–7s** | An identifiable PDF enters a polished upload panel; button responds; import progress runs along a precise route. | PDFs are ingested into a knowledge system first. |
| **7–17s** | The PDF opens into two distinctly marked pages: embedded/selectable text goes through parsing; a scanned image takes the OCR path; both converge into extracted, ordered text with page/source anchors. | **Parse the text layer** when present; **OCR image-only pages**. Cleaning/reading order is needed before chunking. OCR can make mistakes. |
| **17–28s** | Extracted text strips separate into C01/C02/C03; section IDs and original sentences remain attached as strips move. A faint overlapping context seam is shown without fabricating a new assertion. | Chunking preserves readable passages and provenance; overlap is an optional retrieval tactic. |
| **28–39s** | Actual text tokens pulse into an embedding module; aligned numeric vector glyphs materialize; IDs stay fixed; original passages remain linked. | Embedding converts text to numeric vectors. Stored record includes vector and source/text reference. |
| **39–46s** | Indexed vector nodes join a connected space; index routes draw once and the selected record settles. | Search can reuse the **prebuilt** vector index, possibly with an approximate-neighbor graph. |
| **46–56s** | Transition back to the real search interface. Cursor types **“How many unused PTO days can I carry over?”** and clicks **Search**. The gold query detaches and travels into the already-built index. | Query-time retrieval begins **after indexing**, not before. |
| **56–64s** | The same gold question is embedded by the same embedding model family and joins the document vector space. | Query and chunks need compatible embeddings. |
| **64–78s** | Illustrative ANN graph traversal explores visible candidates; a single calculated cosine comparison appears; top-k = 2 selects C01/C02. | Vector similarities rank candidates; ANN is an optional implementation, not a universal DB guarantee. |
| **78–88s** | Selected vector IDs resolve back into **original passage text** and source anchors. | Vectors retrieve evidence; they are **not** pasted into the LLM prompt. |
| **88–102s** | Gold question + C01/C02 source strips compose a prompt; the LLM generates a carefully worded answer and a clickable-looking §4 citation linking to C01. | Grounded generation; citations reference evidence but do not guarantee correctness. |
| **102–110s** | Full two-lane pipeline appears without a camera jump: **Prepare PDF** → extract/OCR → chunk → embed → index; **Ask** → embed query → retrieve → context → LLM → answer. | RAG = retrieve, augment, generate. Index updates don't retrain the model. |

## Motion direction

- **One continuous visual world**, 1600×900 authored output; responsive Storybook preview. Upper 75% = visual stage, lower 25% = a measured **nonoverlapping** narration cue. Readable sans type with deliberate line length.
- **Causal motion only:** page fold/peel → highlighted glyphs leave PDF → ordered text strips → chunk split → semantic data representation → indexed nodes → query token → selected original passages. Same IDs throughout.
- **Color roles:** PDF/source text = blue; chunk IDs = constant blue; embedding output = violet; live question = gold; selected evidence = mint; answer = off-white. Do not recolor a semantic object simply to dramatize a transition.
- **Camera:** stable, no repeated dolly/zoom or surprise cuts. Use local object inspection, path trims, shared-element transforms, masked clipping, focused holds, and optional 2.5D accents instead of shaking the whole frame.
- **Existing Kumiki:** ES1/MD1 narration and playhead; `DiagramStage` connections/packets; MG1 motion paths, easing and stagger; VT1/semantic shared element transitions where identity changes; `KineticText` for typing; `SemanticCompositionStage` for measured safe text.
- **Show first, label second.** At most one short cue per section. The art itself must reveal **input → operation → output**. Do not animate an empty infographic labeled “vector database.”

## Engineering acceptance

- Actual parser vs OCR paths are distinct. Ingesting the example PDF is a **simulation**, not a PDF-processing engine. Never suggest every page needs OCR or that OCR is infallible.
- For each chunk, visual ID, passage, section, embedding and retrieved source derive from **one** `rag-domain.ts` record.
- No offscreen Search button, clipped content, cramped chips, overlapping caption or horizontal scroll on narrow Storybook windows. Preview uses available width; export uses fixed resolution.
- One Storybook entry, same absolute-frame playback/capture, no extra animation clock. Source geometry and click timing are deterministic under seek.
- **First review checkpoint:** implement 0–56s as a compelling self-contained **Part 1: Build the Index → Search**, not claim a complete 110s RAG film. Review at normal playback speed before implementing the remaining 54 seconds.
- No Playwright in CI. Structural/unit contracts should be tiny. Visual inspection remains required prior to merge.
