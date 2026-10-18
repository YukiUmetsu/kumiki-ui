# What is RAG? — 36-second reference explainer

**Storybook:** `Explainers / What Is RAG`. The production is authored with the ES1 sequence compiler, previewed with `ExplainerPlayer`, and exported from `ExplainerFrameCapture`. No bespoke animation clock, renderer or global capture system is added to the registry.

## Story and visual decisions

| Seconds | Teaching point | What must be visible |
| --- | --- | --- |
| 0–5 | A generic model doesn't automatically know current private company files | User policy question, general LLM and an example handbook |
| 5–13 | Documents become chunks; embeddings make them searchable by meaning | Document → ordered chunks → vector index |
| 13–21 | The question gets embedded and relevant passages are retrieved | Query embedding, comparison step and ranked illustrative chunks |
| 21–30 | Retrieved text is added to the prompt; the LLM answers using that context | Prompt containing the question and source passage; model; example cited answer |
| 30–36 | RAG = Retrieve, Augment, Generate; sources still require verification | Three clear steps and groundedness caveat |

**Example only:** The PTO policy and `[Example handbook `4]` citation are invented for instruction, not claims about a real company. Retrieved chunks can be irrelevant or incorrect; a cited answer can still be wrong. A vector embedding is not a database row of literal numbers—displayed vectors are illustrative. RAG uses retrieval at query time; it does *not* retrain the model.

Voiceover is stored as five typed MD1 narration cues (`ragSequenceSpec()`). Audio is **not synthesized or included by default**, avoiding robotic placeholder speech.

## Premium composition rules enforced

- Exactly one **locked, context-wide camera** across all 1,080 frames. `assertRagCameraLocked()` compares the compiled pose at every frame and rejects any zoom, shake, pan, orbit, focal drift, lens change or unexpected cut.
- Camera never tracks individual chunks or small query/answer symbols. Their meaning is shown through **in-scene vector motion**.
- The explainer caption is measured in a dedicated right-side area. Caption wording changes only at authored chapter boundaries.
- Chapter transitions use 15-frame (~0.5-second) dissolves; the outgoing diagram freezes during the dissolve. No abrupt perspective cuts or arbitrary motion reversals.
- Every visual is a pure function of its absolute frame, so seeking directly to the middle of indexing or generation returns the same picture as playback.
- One compact Vitest contract guards successful production compilation, every chapter's narration, and the camera lock. No new visual QA suite.

## Preview locally

```bash
git checkout feat/rag-explainer-reference
npm ci
npm run storybook
```

Open **Explainers → What Is RAG → 01 · Play complete RAG explainer**. Use its play/pause control, frame scrubber, or chapter buttons. For the fixed-resolution export surface, open **02 · Prepare export-ready frames**. The camera must remain static across every chapter. No Playwright is run in CI.

## Export an actual video manually

Once on your machine, ensure [FFmpeg](https://ffmpeg.org/) and Chromium are installed:

```bash
brew install ffmpeg
npx playwright install chromium
node scripts/export-rag-video.mjs
```

The script starts Storybook locally if needed, seeks to each of the 1,080 absolute frames through the same capture contract, captures its **1600 × 900** DOM, and encodes an **H.264 MP4 at 30 fps** to `dist/rag-explainer.mp4`. Temporary PNG frames are removed on success or failure. It does not rely on screenshot recognition or inference.

For a faster manual sample export (first three seconds):

```bash
node scripts/export-rag-video.mjs --frames=90 --output=dist/rag-preview.mp4
```

For full-length narration recorded or produced separately, supply a prealigned audio track:

```bash
node scripts/export-rag-video.mjs --audio=/path/to/rag-narration.wav
```

Audio should follow the exact five narration cues and chapter starts (0, 5, 13, 21 and 30 seconds). The exporter **does not time-stretch or synthesize narration**, so validate timing before shipping. Without `--audio` the video intentionally has no audio. Use natural, intelligible narration only after previewing and approving the storyboard.

## Constraints and follow-up

A passing camera/semantic contract is not a substitute for visual review. Inspect chapter handoffs, captions and the relevant retrieved context using Storybook. Actual FFmpeg rendering is manual and not yet validated on this environment. Once the full visual video meets the desired quality, move the generic frame-export orchestration into the separate `content-gen` project so Kumiki UI remains a reusable component library.
