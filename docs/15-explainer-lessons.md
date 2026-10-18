# Explainer production: mistakes → reusable prevention

This is a compact **revision ledger** from the first attempts at *A Message's Journey* and *What Is RAG?*; it governs future explainer examples without creating a new screenshot/LLM QA pipeline.

| What went wrong | Correction | Default authoring rule (cheap to enforce) |
| --- | --- | --- |
| Phone composer, typing and Send button were partially cut off | Adjust camera lower; include complete phone state and button in frame | Declare critical UI/action bounds and lead/tail frames before camera planning. Reject cropped critical controls. |
| Camera lagged behind the signal and followed after the relevant transfer | Lead tracking before handoff | Animation and camera must share one absolute timeline; place the destination and subject in the *preceding* shot's protected window. |
| Routers, server and tiny signal zoomed repeatedly, shaking and reversing | Context-first framing; stop over-targeting tiny animated objects | Technical diagrams default to a **locked camera**. Other shots: prefer wide/medium, minimum stable hold, no unmotivated zoom reversal; explicit cuts only for a narrative change. |
| White explanation text jumped/reflowed or switched mid-camera move | Fixed editorial column and text stable for each teaching beat | Decouple caption placement/content from camera projections. Reserve screen space; measure once per semantic change. Keep collision checks for moving subjects. |
| Generic ending did not explain what the viewer should remember | Replaced with conceptual learning summary | End with the mechanism and its limitation, not a list of decorative verbs. |
| RAG first attempt looked like a sequence of unrelated glass cards | Redesign around *transformed data objects* moving through real operations | For every step author **input → transformation → visible output** before making visual components. If removing all text leaves no explanation, storyboard fails. |
| Labels described “embedding” or “search” without showing their internal meaning | Illustrate chunks, vector coordinates, similarity calculation, top-k, prompt assembly, answer/source link | Prove a technical claim visually. Use consistent object IDs/colors across ingestion and query-time pipelines; distinguish vectors from retrieved **text**. Mark numeric examples synthetic. |
| Dense, repetitive on-screen copy drowned the diagram | Minimal cue, technical narration, visual carries detail | One brief caption per beat (ideally ≤9 words); most of the image should be explanatory geometry/motion. Voiceover holds longer explanation. |
| Chips/tags cramped their text; tiny SVG labels became illegible when scaled | Intrinsic or calculated chip width/padding; output-relative minimum text size | Measure or conservatively derive chip width from content, with ≥18px horizontal / ≥8px vertical inset. Avoid arbitrary fixed chip widths. Verify actual final output size. |
| RAG appeared as two separate Storybook pages (play + export) | Single canonical story with export mode in the same page | Exactly **one story entry** for each explainer; expose export as an explicit mode/URL, not a second story. |
| Early “done” calls happened before an actual rendered video was inspected | Keep CI claims separate from cinematic acceptance | Passing TypeScript/geometry/unit tests means *structurally valid*, not *visually premium*. Manually watch one full run and inspect a few critical frames before calling it finished. |

## Authoring contract: 5 tiny decisions before coding

1. **Learning objective:** In one sentence, state what the viewer should understand afterward.
2. **Causal storyboard:** Each 5–9-second beat defines **input / processing / resulting state**; use animation for the transformation, not zoom or decorations.
3. **Continuity:** One frame clock; persistent visual identity for the same entities; explicit visibility windows, stable camera and editorial caption lane.
4. **Readability:** A single final-resolution canvas, sparse text, generous chip padding, calculated bounds and a real closing takeaway.
5. **Acceptance:** One Storybook entry, direct frame seek, lightweight deterministic guards and a manual quality review. Do *not* put Playwright into CI or generate screenshots for every frame as QA.

**Implementation bias:** Fix an authoring API or component invariant once when several edits expose the same root cause. Avoid per-video special-case CSS, endless checklists, large test suites and screenshot recognition.
