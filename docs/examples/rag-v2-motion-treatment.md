# RAG explainer: narrative and motion direction (V3)

**Production plan:** 107 seconds / 3,210 frames / 30 fps. **One Storybook page.**
The detailed timing and review commands live in [rag-explainer.md](rag-explainer.md).

## The story

Start from the employee handbook's *actual text*, not a fake upload sequence. Extract a PTO policy with its source section; divide it into identifiable chunks; embed them into a multi-topic vector space; then let a person search for unused PTO carryover. The query enters that **same** space. A deliberate camera push reveals how C01 and C02 sit closest. Retrieve their **original wording** and use it as context for an LLM's **cited answer**. The final frame is the answer—not another lecture slide.

After the user clicks Search, insert a three-row side-by-side reveal answering **Why RAG instead of looking up a document?** Keyword-style document search often surfaces source pages/snippets; RAG adds contextual answer generation. Avoid implying that RAG inherently uses a different retrieval algorithm or necessarily guarantees a correct citation. [Pinecone's RAG overview](https://www.pinecone.io/learn/retrieval-augmented-generation/) distinguishes ingestion, retrieval, augmentation, and generation; [Pinecone on similarity search](https://www.pinecone.io/learn/what-is-similarity-search/) distinguishes exact nearest-neighbor search from optional ANN indexing.

## Direction contracts

1. **Cognitive budget:** each scene asks and answers *one* question. Limit to one dominant visual transformation, one concise subtitle, and at most two short source labels. Remove lower-priority callouts rather than shrinking text.
2. **Connection contract:** connector visible **only while its source actually moves toward a target**. Reveal along the real path; hide shortly after arrival. Never paint inert dashed paths for decoration, and never animate a dot merely to mask a scene cut.
3. **Transition contract:** preserve a named entity (chunk ID, literal question, source passage) if animating continuity. Otherwise use a clean editorial dissolve; no arbitrary floating tokens or reversals.
4. **Camera contract:** a single smooth one-way push inside the semantic vector space from the overall topical neighborhoods toward the query/PTO matches; hold after arrival. Keep the legend pinned to screen space. No bouncing, zoom reversals or unrelated camera travel.
5. **Hierarchy contract:** source evidence → answer is the payoff. No upload scene, no early OCR digression, no repeated recap, no redundant “retrieve / augment / generate” labels elsewhere.
6. **Truth contract:** the selected C01/C02 cosine scores derive from the same tiny fictional source corpus and numeric toy vectors. A 2D projected illustration is explanatory, not a real production model, and *does not need an on-screen disclaimer*. Keep those qualifications in documentation or narration only if essential.

## Review gate

Storyboard → one scene implementation → normal-speed review → refine. Deterministic frame seeks and small geometry/data tests catch structural errors; they are not proof of premium composition. Browser/FFmpeg export is manual, never GitHub Actions Playwright CI. Do not mark PR ready to merge solely from green tests.
