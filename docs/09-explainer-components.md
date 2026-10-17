# 09 — Explainer Components & Visual Storytelling

**Purpose:** turn technical ideas into reusable, visually coherent **scenes** rather than animated slides. **Foundation:** [07](07-media-foundation.md). **Motion behavior:** [08](08-motion-graphics.md). **Audio cues:** [10](10-character-audio.md). **Scene JSON/export:** [11](11-rendering-quality.md).

## 1. Editorial contract: each scene teaches one change

Scenes have: `claim` (one sentence), `visualObjective` (what must become clearer), `focusTarget`, `evidence` (visual content), `narrationCue`, `enter`, `hold`, `handoff`. **Show the process while explaining it**, not generic slides beside a voiceover. Distinguish **exposition** (introduce), **mechanism** (demonstrate), **comparison** (differentiate), **application** (show use), and **recap** (reinforce). Vary shot scale and visual metaphor only when it helps the narrative.

**Story grammar:** hook/problem → establish model → reveal mechanism → test/contrast → implication → recall. Not every video needs all six. Storyboard cards preserve scene objective, assets, VO segment, text on screen, focus, transition continuity and expected duration. Timed narration is an input to the scene plan, not an afterthought.

| Production rule | Enforce by |
|---|---|
| One focal idea per shot | Explicit `focusTarget` and max competing emphasis events |
| Explain relationships with motion | Object-preserving transitions, not repeated fade-in bullet lists |
| Source text is not on-screen transcript | Distinct concise labels + full narration/caption tracks |
| Demonstrations match words | Time-bounded events anchored to speech cues, validated against transcript |
| Dense content earns more time | Editable hold/reveal beats; QA flags undisplayed labels and sub-threshold dwell |
| Orientation survives cuts | Persist color/shape/position identity for recurring entities |
| Art direction is configurable | Tokens/presets from 07/08, no hard-coded channel style |

## 2. Reusable educational component contracts

These are **component APIs and semantic state**; animation interpolations live in [08](08-motion-graphics.md). Every component supports stable IDs, `focusTarget`, step-based progression, editable source data, text summary, and a useful static frame.

| Item | Required authoring inputs | Behavior; failure cases |
|---|---|---|
| `animated-code` | Language, source, token spans/ranges, cursor edits, focus steps | Exact monospaced measured layout; preserve line/column anchors through edits; syntax-theme override; no arbitrary code execution |
| `code-diff` | Before/after sources, structured hunks, anchors | Highlight additions/deletions/moves; stable unchanged tokens; fallback to side-by-side if semantic matching fails |
| `terminal-animation` | Structured commands and output events, timestamps | Cursor, prompt, typed output, scroll window, pause/rewind; commands **display only**, never execute |
| `algorithm-visualizer` | Typed states, transitions, comparisons, pseudocode refs | Replay recorded state evolution; deterministic scrubbing; no opaque runtime simulation required |
| `math-expression` | Math AST/LaTeX input, named term IDs, render adapter | Equation layout with baseline and exact glyph metrics; safe fallback if math renderer unavailable |
| `equation-morph` | Before/after term IDs, term correspondence, unmatched policy | Moves preserved terms; adds/removes terms deliberately; never morph semantically unrelated glyphs |
| `diagram-stage` | Stable nodes, ports, edges, grouping, layout hints | Connectors remain attached during movement; grouped auto-layout is **version-pinned** |
| `architecture-reveal` | Graph, ordered groups, focus and explanation cues | Build graph incrementally; preserve layout and semantic identities across stages |
| `data-flow` | Ports, path, payload tokens, direction/speed, arrival cues | Animated data packets along real connector paths; distinguish requests, responses, errors |
| `network-flow` | Actors, protocols, latencies, exchanges | Message sequence with timeline scale and timing labels; not falsely synchronous |
| `chart-reveal` | Typed data, units, axes, series, annotation anchors | Axes do not jump; scales disclose truncation; annotate changes, not generic chart growth |
| `process-timeline` | Ordered/parallel steps, states, durations, dependencies | Reveal actual ordering and overlap; accessible textual summary |
| `comparison-stage` | Cases, shared dimensions, comparison claims | Aligned scales/anchors; no misleading mismatched baselines |
| `concept-transform` | Before/after semantic states, correspondence map | Shared elements/morph/path; fallback crossfade only if relationship cannot be represented |
| `callout-focus` | Target ID, label, preferred attachment, reveal cue | Maintain pointer geometry and viewport avoidance during animation |

### Non-negotiable correctness details

- **Code:** syntax highlighting and font measurement are renderer-independent inputs; preserve tabs/whitespace, line numbers, wraps and diff alignment. A code runner is a consumer service, not part of `animated-code`.
- **Math:** preserve meaning and grouping. A symbol morph does **not** imply mathematical equivalence; require explicit term correspondence. Pin formula-renderer/font artifacts.
- **Diagrams:** layout *once per semantic step*, interpolate between stable layouts; protect label bounds and edges. Nodes require ports with attachment semantics; prevent connectors from crossing labeled regions when feasible.
- **Charts:** encode unit, source, zero/baseline policy and uncertainty; provide static accessible summary. Animated comparisons must use a shared scale unless deliberately called out.
- **Flow:** packet travel conveys causation; packet count or speed must not accidentally imply throughput/latency unsupported by data. Differentiate illustrative animation from measured data.
- **Terminal:** show commands as data with escaping/sanitization; disable real terminal, secret insertion and external process execution.

## 3. Component composition patterns

| Pattern | Reusable building blocks | Narrative role |
|---|---|---|
| `concept-introduction` | Animated title + symbolic visual + controlled reveal | Establish vocabulary and interest |
| `problem-solution` | Comparison + failure state + corrected system | Show why the idea matters |
| `step-by-step` | Progressive reveal + focus + process timeline | Explain a process without losing context |
| `system-architecture` | Diagram + data flow + camera + callouts | Demonstrate system behavior |
| `code-walkthrough` | Animated code + terminal + output focus | Connect implementation and outcome |
| `math-intuition` | Equation morph + chart + visual metaphor | Connect symbolic and geometric forms |
| `data-story` | Chart reveal + annotations + contrast | Explain evidence and limitations |
| `character-explanation` | Presenter + referenced diagram + speech cues | Add guided narration without visual clutter |
| `before-after` | Aligned comparison + shared-element continuity | Establish a specific change |
| `recap` | Reuse established objects + compact key relationships | Reinforce understanding |

Each template declares **slots** and **constraints**, never fixed copy: `content`, `focus`, `accentRole`, `motionProfile`, `assetRefs`, `audioCues`, `aspectPolicy`, and editable timing ranges. Consumer-controlled brand assets and themes stay external. The template should be meaningful at a still frame, with emphasis on legibility rather than decorative complexity.

```ts
// Illustrative authoring API, not the serialized wire contract.
const shot = systemArchitecture({
  id: 'retrieval',
  claim: 'Retrieval finds relevant context before generation.',
  graph: ragGraph,
  sequence: [
    { cue: 'question', action: 'focus', target: 'query' },
    { cue: 'search', action: 'send', from: 'query', to: 'vector-store' },
    { cue: 'results', action: 'reveal', target: 'top-k' },
    { cue: 'context', action: 'send', from: 'top-k', to: 'llm' },
  ],
  framing: { landscape: 'overview', portrait: 'follow-focus' },
});
```

### Storyboard-to-scene handoff

The storyboarding layer records decisions as **data**, not a free-form prompt the renderer executes:

| Field | Example | Must validate |
|---|---|---|
| `claim` | “The retrieved chunks are added as context” | One coherent proposition |
| `visualObjective` | “Track three chunks entering the context window” | Observable change |
| `focusTarget` | `context-window` | Resolves to stable semantic ID |
| `narrationCue` | `chunks-enter` | Resolved time/frame exists |
| `onScreenLabels` | `Top 3`, `Context` | Fits and contrasts at delivery size |
| `exitHandoff` | `semanticId: context-window` | Target scene accepts identity |

## 4. Worked reference: 60-second RAG explanation

**Format:** 1800 frames at 30 fps, 1920×1080 design reference; portrait framing is a **separate authored constraint set**. Timings are examples, adjusted to actual spoken durations, not a built-in preset.

| Frames | Shot objective | Visual execution | Narration anchor / handoff |
|---|---|---|---|
| 0–179 | Problem: answer lacks private context | Question card, absent-document silhouette, limited motion | Hook, leave question object on screen |
| 180–479 | Introduce retrieval | Question becomes query token; camera reveals retriever + store | “First, retrieve relevant information” |
| 480–779 | Show search | Data-flow packet reaches store; 3 relevant chunks rise | “Find matching passages” |
| 780–1079 | Assemble context | Chunks move, retaining IDs, into prompt context frame | “Place retrieved text beside the question” |
| 1080–1439 | Generate grounded answer | Context + question connect to model, answer resolves | “Generate using that context” |
| 1440–1799 | Recap + caveat | Return to compact pipeline; cite source/verification caveat | “Retrieval helps, but sources still matter” |

**Continuity requirements:** query token, retrieved chunks and context window retain identity across at least two handoffs. Camera follows information flow only where it adds clarity. Captions must not collide with chunks or labels. Each narrated action occurs **during** the corresponding visual event; exact speech timestamps are aligned by [10](10-character-audio.md). Include a clear static fallback for all six shots.

## 5. Thumbnail, social card and title-sequence reuse

| Component | Contract |
|---|---|
| `thumbnail-canvas` | Editable text and subject groups, salience map, safe zones, 16:9 / 9:16 / 1:1 output recipes |
| `thumbnail-variants` | Immutable base + parameter overrides; linked A/B variants with consistent source asset IDs |
| `subject-cutout` | Consume approved alpha/mask; cutout generation is an external provider; preserve edge-matte quality |
| `kinetic-title` | Reuse typographic groups for still thumbnail and animated intro without changing wording/identity |
| `chapter-card` | Short visual reset, section title, stable chapter tokens; exportable as still |

**Thumbnail QA:** inspect at target resolution and **160px / 320px equivalent** widths; check focus, text clipping, mask edges and contrast over subject. Avoid assuming YouTube UI overlays stay fixed. Never promise click-through performance from aesthetic checks; variant testing belongs to the publishing consumer.

## 6. Aspect ratios and design constraints

Author layout constraints for each target, then resolve to a fixed-size scene. For 16:9 to 9:16 adaptation, prioritize semantic targets: reflow diagram into vertical lanes; move presenter and subtitle zones; crop background *not* instructional nodes; shorten on-screen labels only through explicit content variants. Keep minimum type size as a **project-defined token** evaluated at delivery size; do not invent universal pixel thresholds. Fit policies: `reflow`, `resize-with-bounds`, `crop-background`, `pan-focus`, `reject`. `reject` is required when a diagram cannot remain legible.

## 7. Editorial + automated acceptance

**Every component:** source-data round-trip; stable IDs; accessible/static description; corrupted-input tests; deterministic frames; standalone usage plus at least one template composition. **Every template:** coherent shot objective, narration anchors, intentional holds, handoffs, portrait/landscape variants, small-screen review.

**Golden explainer tests** (work toward these before adding new components):

1. Animate code edits and terminal results; a direct seek to any frame reproduces cursor, output and token highlights.
2. Animate 12-node architecture with 3 branching packets; connectors remain attached and labels do not collide during camera travel.
3. Morph `embedding → search → context → response` across four scenes using semantic identity; explicit fallback for unmatched elements.
4. Transform a math expression while preserving named terms; no false implied equivalence on unmatched tokens.
5. Render synchronized explanatory and caption layers; text stays legible at 16:9 and 9:16 in downscaled previews.
6. Export a still, two thumbnail variants, and the storyboard from the same source document without losing editability.

Quality criterion: a viewer can infer the **sequence and causal relationship even with narration muted**; with narration enabled, visuals reinforce rather than merely repeat words.
