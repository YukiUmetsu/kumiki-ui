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
| The RAG caption overlapped the diagram despite passing camera geometry | Reserve an authored 2D visual footprint and move essential copy into a separate lower caption band | The actual **SVG/diagram bounds**, not a fake 3D camera target, must drive text exclusion. Test several viewport widths before export. |
| The Storybook player forced a fixed 1600px width and scrolled rather than shrinking | Keep the **preview** at 100% available width; preserve fixed pixels only for **capture/export** | Never apply export dimensions as preview minimum width; explicitly separate responsive preview sizing from deterministic output. |
| Constructed Device crashed because MD1 contained only an event cue | Import the existing CC1 camera tracks into MD1 before compiling the action cue | Every MD1 timeline requires at least one actual motion channel; share an existing compiled timeline, never fabricate a dummy track. |
| Bespoke cards ignored Kumiki's reusable graph components | Use DiagramStage for node identity, attached connections and packets | Prefer existing semantic motion/diagram components for causal graph movement instead of redrawing a new static workflow in each example. |
| An index appeared as a decorative glowing node graph with no clear database behavior | Separate **source-linked record storage**, candidate traversal, computed similarity scores and top-k selection | Never label a generic constellation "vector DB": show an actual search trace, what each node stores, which neighbors are inspected, when scores are computed, and which source IDs are returned. |
| The initial RAG film ended the moment the user pressed Search | Continue the **same user question** through query embedding → neighbor search → top-k → original-text lookup → augmented prompt → cited answer | A technical film may not stop at the setup or trigger event. Storyboard must have an observable **output** and a semantic source-to-answer payoff. |
| Attractive fades and cards did not create meaningful motion | Animate the **content** and its provenance (PDF text leaving pages, IDs moving through transforms, query traveling to DB, original passages entering LLM prompt) | Favor persistent semantic objects traveling across stages over independent enter/exit animations of the boxes surrounding them. |
| RAG ending footer text collided with video progress text and subtitles | Removed the repeated video HUD, shortened captions, and reserved an explicit 81% visual / 19% caption split | Screen-space bounds must include **all** SVG callouts, scene footers, status labels and captions. Never layer multiple footer systems. |
| PDF upload animation consumed time without teaching ingestion | Static PDF establishing shot; preserve time for parser vs OCR, chunking and embedding transforms | Only animate meaningful transformations. Do not add fake progress, clicking or dragging if there is no teaching payoff. |
| Typing caret drifted from the typed word because width was guessed by character count | Put caret inside the **same** SVG text run as the input glyphs | Never compute text positions from `string.length × estimated glyph width`. Measure or use intrinsic layout. |
| Vector DB connected-node graph looked like a chaotic network without semantic meaning | Use a projected embedding space with topical clusters, source IDs and one purposeful candidate path; separate index records from ANN navigation | Spatial projections illustrate *similarity*; neighbor links are an optional index implementation. Animate focused traversal only when teaching ANN. |
| Evidence cards and LLM prompt repeated too much text; source footnotes overlapped passages | Remove redundant copy, keep original passages readable, let prompt scene recede before the cited answer takes focus | Prefer **successive editorial focus** over showing the whole pipeline and its commentary simultaneously. |
| Early “done” calls happened before an actual rendered video was inspected | Keep CI claims separate from cinematic acceptance | Passing TypeScript/geometry/unit tests means *structurally valid*, not *visually premium*. Manually watch one full run and inspect a few critical frames before calling it finished. |

## Screenshot-review V3: prevent cognitive overload before rendering

| Repeated failure | Authoring invariant |
| --- | --- |
| Static dashed connectors visible before an event | A transfer path has a bounded visibility window. It draws **during** the transfer and fades on arrival; never exists as idle decoration. |
| Meaningless dots bridge unrelated scenes | Animate only identifiable data or a real material transformation. Otherwise use a direct cut or a short dissolve. A random traveling point is not semantic continuity. |
| Repeated titles, captions, footnotes and RAG slogans | One scene = **one learning objective, one focal action, one short caption**. At most two essential labels for the main object; no extra disclaimer inside the artwork. |
| A diagram crams every technical detail into one shot | Stage a three-beat hierarchy: input → transformation → result, with only the current beat prominent. Use progressive row reveal for comparisons; end on the payoff, not a redundant recap. |
| A low-value opening consumes viewer attention | Scene exists only if removing it would make a critical causal step impossible to understand. A PDF *upload* is not the same as PDF *text extraction*. |
| Vector-search “camera” does not help understanding | One intentional camera focus from broad domain clusters to query-adjacent hits; zoom once and hold. Preserve semantic color legend in screen space; don't zoom it away. |
| Making one visual without checking alternatives | Compare at least two **teaching metaphors** before implementation (e.g., nearest semantic neighborhoods vs detailed ANN graph). Pick the one that communicates the learning objective with the fewest concepts. |

## V4 screenshot learnings: communicate space, notation and value

- **Story order matters:** viewers should see a mechanism and its resulting answer **before** comparing its benefits with familiar search; use the final comparison as the takeaway.
- **Color only helps when categories are discriminable:** assign each actual topic a different hue, and anchor a five-category legend. Don't collapse Payroll, Holidays and Benefits into an undifferentiated "Other" group.
- **A tilted 2D plane is not 3D:** clouds need independent elevation and depth, perspective cues, and a modest camera-angle change to reveal parallax. Use solid elevation guides for geometric clarity, not decorative dotted connector lines.
- **Recognition beats novelty:** a familiar red PDF mark and **“Section 4”** are easier to recognize than generic blue file blocks or “§4”.
- **Connection animation is warranted when there is a real transfer:** the *question → embedding model → query vector* sequence should show a short, timed handoff; the connection must not be visible in idle states.
- **No false extra embedding dimension:** geometric height may clarify a 3D illustration, but it must never change actual cosine-similarity ranking. Keep that technical caveat in documentation rather than cluttering the scene.

## Authoring contract: 5 tiny decisions before coding

1. **Learning objective:** In one sentence, state what the viewer should understand afterward.
2. **Causal storyboard:** Each 5–9-second beat defines **input / processing / resulting state**; use animation for the transformation, not zoom or decorations.
3. **Continuity:** One frame clock; persistent visual identity for the same entities; explicit visibility windows, stable camera and editorial caption lane.
4. **Readability:** A single final-resolution canvas, sparse text, generous chip padding, calculated bounds and a real closing takeaway.
5. **Acceptance:** One Storybook entry, direct frame seek, lightweight deterministic guards and a manual quality review. Do *not* put Playwright into CI or generate screenshots for every frame as QA.

**Implementation bias:** Fix an authoring API or component invariant once when several edits expose the same root cause. Avoid per-video special-case CSS, endless checklists, large test suites and screenshot recognition.
