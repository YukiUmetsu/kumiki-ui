# RAG V2 — motion direction and engineering treatment

**Status: production design, not approved footage.** Supersedes the first 36-second RAG storyboard in PR #6. **Do not mistake the existing Storybook sequence for this design.** This is the required source of truth *before* rewriting the animation.

## The film in one sentence

A user types **“How many unused PTO days can I carry over?”**, clicks Search, and the same **gold question** travels through a system that retrieves **blue source passages** from an **already-prepared** vector index and supplies their actual text to a language model, which answers with a traceable citation.

**Creative thesis:** no lecture slides. One continuous, high-fidelity software world unfolds from the original search box. Make cause and effect visible, with one focal action at a time. The visual should teach even when the bottom caption is hidden.

### Art direction and continuity

- **Surface:** credible premium search UI in deep midnight navy; calibrated translucent/metallic depth only on elements that represent actual layers. Crisp off-white typography, restrained bloom on active data, no repeated glass-card grids.
- **Identities never change:** query = warm gold / \`query-pto\`; handbook chunks = steel-blue \`C01\`, \`C02\`, \`C03\`; embedding vectors = violet, **still linked to their source IDs**; selected result = mint outline; LLM = off-white. Colors encode roles, not decoration.
- **Screen:** fixed 16:9 output at 1600×900; responsive preview fits available width (no forced 1600px minimum or horizontal scroll). Reserve top 75% for visuals and lower 25% for **one short, stable caption**. Export retains fixed pixel resolution. Persistent visual anchors and per-shot subject bounds prevent cropping/overlap.
- **Camera:** essentially locked architectural view. Depth is created by moving and transforming *objects inside the world*. One purposeful local inspection magnification is allowed for the similarity calculation; do not zoom the entire camera, repeat zoom reversals, shake, or execute surprise cuts. Transitions retain shared element positions/IDs.
- **Pacing:** visual anticipation (8–12 frames) → **meaningful motion** (24–60 frames) → readable hold (at least 30 frames) → physical handoff. Never animate all nodes simultaneously. No arbitrary numeric labels ticking independently of the action.

## Time-coded storyboard (84 seconds / 2520 frames / 30 FPS)

| Time / frames | Exact on-screen action (WHAT the viewer sees) | WHAT it teaches | Kumiki building block |
| --- | --- | --- | --- |
| **0–9s** / 0–269 | Start inside an actual search app. Cursor types the full PTO question letter by letter. Pointer enters, **Search** depresses, then the entire query becomes a small gold data token that travels out of the search bar. The typed words remain legible until submission. | There is one real question, not an abstract “query” label. | Kinetic text / shared-element handoff / motion path; timed click press |
| **9–16s** / 270–479 | The query token stops at a retrieval gateway. The view unfolds, exposing a *previously prepared* blue document index behind it. Label the blue preparation lane **“Prepared earlier”**; do not make it look as if documents are first indexed after this click. | Ingestion happens ahead of time; retrieval happens when a question arrives. | DiagramStage ports + guided reveal, same gold token |
| **16–28s** / 480–839 | Zoom **inside the document surface, not the camera**. A real handbook page peels into three *text-bearing* strips with IDs C01/C02/C03 and source pointers §4/§2/§8. The relevant “5 days” sentence remains visibly attached to C01 through the split. Strips glide along attached paths toward one embedding module. | Parsing/chunking preserves the original text and its source. | VT1 one-to-many semantic transition, stagger, mask/path trim |
| **28–39s** / 840–1169 | One strip enters an embedding model: token highlights pass through a restrained lattice; a **numerical vector glyph** materializes. Repeat in stagger for the other chunks. Preserve each ID. Vectors populate a network/index layer; original source text remains addressable in a linked drawer. Caption **“Text becomes a searchable vector.”** | Embedding maps text to numeric meaning representations; index keeps the vector + reference to original content. | VT1 shared element / MG1 stagger / DiagramStage, optional restrained 2.5D material |
| **39–49s** / 1170–1469 | Return to the waiting **same gold question**. It enters the **same embedding-model** stage and becomes a gold vector glyph. Its vector joins the same index space, shown as an explicitly **illustrative projection** of many-dimensional vectors. | Question and documents must be embedded in a compatible vector space. Embeddings are not the original text. | Shared-element, motion path, optional local vector-space focus |
| **49–59s** / 1470–1769 | In the index, traversal lights up connected candidate nodes along a *graph of approximate neighbors* (an illustrative ANN/HNSW-like search). Show a **single cosine comparison** with an angle/score derived from toy vectors. Ranked results stop at **top-k = 2**; C01 and C02 brighten, C03 dims. No random spinning constellation. | Vector indexes narrow candidate search; similarity ranks candidates; top-k selects likely relevant chunks. A 2D plot is explanatory, not the full embedding. | DiagramStage routes and packets, motion-path arc progress, measured callout; one purpose-built similarity adapter only if required |
| **59–68s** / 1770–2039 | The chosen vector IDs travel back along index links. At the gateway they **unfold into their *original textual passages***, with C01/§4 and C02/§2 source anchors intact. The numbers disappear; human-readable passages do not. | RAG retrieves **text** using vectors. The LLM does not consume “a pile of embeddings” as its evidence. | VT1 reverse representation transition, semantic ID handoff, anchored source callout |
| **68–78s** / 2040–2339 | The actual gold question docks into a PROMPT slot; the two blue retrieved text strips stack into CONTEXT slots. The complete prompt moves into the LLM stage. Answer appears in natural word groups: **“Up to five unused days can roll over.”** An inline **[Handbook §4]** citation links back, briefly lighting C01 on the original document. | The LLM gets the question **and evidence** as text, generates an answer, and can reference its supplied source. Citation is not a correctness guarantee. | DiagramStage ports / shared element / KineticText & ProgressiveReveal / linked event |
| **78–84s** / 2340–2519 | With no cut, the scene eases into a concise **two-lane architecture**: upper blue **Prepare once: document → chunks → embeddings → index**; lower gold **Each question: query → embed → retrieve text → prompt → LLM → answer**. The token and selected passages complete one last brief route to the cited answer. | RAG = **Retrieve → Augment → Generate**. The index can be updated without retraining the LLM; verify important sources. | DiagramStage with real attached paths and packets, one restrained concluding hold |

**Narration:** 9 chapter-aligned spoken cues (roughly 125–155 words total) plus deliberately silent moments for typing, splitting, search, and the cited answer. Narration states why a step matters just as the viewer sees it. Do not read the screen labels aloud verbatim. Script and audio timing must be approved against the animation before synthesis/recording.

## Mechanical fidelity: facts that the animation must not misrepresent

1. **Chronology:** The index was built **before** the user submitted the question. The video reveals that prior work after the click as a visual explanation; it does not depict real-time retraining.
2. **Two representations:** Every document chunk has \`{id, text, source, vector}\`. \`vector\` is used for retrieval; \`text\` is placed into the model prompt. Do **not** morph the selected numeric vector directly into “the answer.”
3. **Numbers:** Illustrative cosine scores must be **computed from declared toy vectors**, not manually invented values. Show a normalized-vector comparison, not a 2D Euclidean nearest-neighbor result labeled cosine. A conceptual 2D map cannot claim to reproduce real high-dimensional distances.
4. **Index:** An HNSW/ANN-like path is an **illustration**, not a claim that every production vector DB uses HNSW or that all indexed nodes are inspected. Label it “example approximate-neighbor traversal”; show the ranked candidates as the output.
5. **Generation:** The fictional handbook's PTO rollover sentence and cited section must match throughout the clip. The final claim says **according to the example handbook**. RAG can improve grounding but still produce unsupported answers.

## Reuse Kumiki intentionally (no second motion engine)

| Need | Existing implementation to use | Only build if unavailable |
| --- | --- | --- |
| Shot, narrated event and a single absolute film clock | **ES1** \`ExplainerSequence\` / \`ExplainerPlayer\` / \`ExplainerFrameCapture\`, MD1 cues | None |
| Connected system, stable actor IDs and routed data packets | **\`DiagramStage\`**, \`createDiagramTimeline\`, ports, attached motion paths | A narrow semantic ANN index visualization adapter |
| Document → chunks; text → vector; vector ID → retrieved text | **VT1** \`VisualTransformation\` with semantic mappings, masks and shared elements | Specific document/embedding artwork with the same data IDs |
| Typed question, generated answer and restrained reveals | **KineticText**, \`ProgressiveReveal\`, MG1 stagger | A reusable measured search-field interaction if absent |
| Cinema continuity, on-screen legibility, source callouts | **SemanticCompositionStage** protected region, media geometry, anchored labels | None |
| Preview and actual MP4 | Same single Storybook page, browser frame capture, local FFmpeg | Sound/narration production outside Kumiki |

## Build and acceptance sequence — do not skip the first usable slice

1. **Data contract first:** one tiny fictional corpus, persistent query and chunk IDs, computed vector similarities, text/source lookups, storyboard cue timestamps. This is the single source for both words and pixels.
2. **Vertical slice (0–16s):** make the *real search field* respond to input, click and query travel; then unveil the already-prepared index without a cut. Review this visually **before** building later scenes. If the first 16s look like a slide deck, stop and fix the staging.
3. **Mechanism (16–68s):** chunk peel → embedding transform → graph traversal → top-k → recover text. Reuse VT1/DiagramStage; add only missing narrow adapters. Review critical frame pairs for identity, boundaries and held readability.
4. **Payoff (68–84s):** prompt assembly, answer reveal, *source-linked* citation and persistent two-lane recap.
5. **One complete playback** at normal speed plus a handful of key-frame inspections at final video resolution. Passing TypeScript, geometry and compile checks does **not** certify motion design. Manual Playwright/video render only; no new browser CI.

### Hard rejection conditions

- Search field absent, button cropped, query “teleports,” or typing/sending is off-screen.
- Generic floating cards merely appear/disappear without showing data transforms.
- Camera zoom reversals, busy shaking or unexpected cuts; more than one focal animation competing at once.
- An apparent semantic similarity computed from mislabeled/independent graphics.
- Captions cover the diagram, unreadable chips or text too dense to understand at full playback speed.
- Preview overflows the available width, or export differs from the preview scene.
- Missing source continuity between stored document chunk, retrieved passage and citation.

**Approval criterion:** a viewer can **point to the gold question and the two blue passages through the entire journey**, explain which step uses numbers versus text, and tell why the final answer includes evidence. The beauty must *make that comprehension easier*.
