# RAG explainer: motion and learning direction (V4)

**One Storybook page · 107 seconds · 3,210 ES1 frames · 30 fps.**
Detailed timings: [rag-explainer.md](rag-explainer.md).

## Causal story

Prepare a knowledge base from a familiar red PDF: extract the policy text, attach human-readable source labels, chunk, embed and index it. Then a viewer sees one typed PTO question enter the same embedding model and get its vector. A three-dimensional field of **five clearly colored semantic topics** shows why the PTO passages are nearest; the camera pushes into that part of the space with visible depth and height. The retriever resolves C01/C02 IDs into exact readable source passages. The LLM receives them as context and produces an answer that cites **Section 4**.

**After the answer, and only then, show the benefit.** A progressive three-row comparison contrasts conventional keyword document search returning matching pages/snippets with RAG's use of retrieved evidence to generate a directly usable, source-linked answer.

## Visual rules derived from screenshot review

1. **One concept per shot.** Only the decisive input, transformation and output are visible; no extra slide of terminology or decorative commentary.
2. **Recognizable objects and words.** Red PDF paper mark; plain “Section 4” rather than the section symbol; one concise source label at a time.
3. **Actual spatial depth.** Background dots occupy `[X, depth, height]` with independently varying height. Perspective scales with depth. Elevated source records have quiet solid vertical guides. Five visually distinct topics: mint PTO, violet Travel, pink Payroll, orange Holidays, blue Benefits; query gold.
4. **Intentional camera.** The vector-space viewport makes one forward push with a small yaw change, revealing parallax and query-neighbor proximity. Fixed HUD legend remains in screen space. Never overshoot, reverse, or animate unrelated scenes.
5. **Connections exist only for causal transfer.** **Query → embedding model → query vector** uses two revealed, timed routes. Idle dashed lines and purposeless between-shot dots are forbidden.
6. **End with a real contrast.** The comparison belongs **after** the answer, when the benefit is understandable. Progressive reveal, no flood of simultaneous text.
7. **Data accuracy.** Cosine scores are calculated from the declared 2D teaching vectors, not the extra height drawn for artistic clarity. The cloud is an illustrative 3D spatial metaphor, not an inference over true 3D production embeddings. Methodological caveats live in docs, not as scene labels.

Visual acceptance still requires Storybook playback and optional local MP4 inspection. Do not use Playwright in GitHub CI or call the film visually approved based only on static tests.
