# 26 — Automated Content Quality Plan

**Status:** proposed. Nothing in this plan is built. **Date:** 2026-11-06.
**Goal:** an agent that starts cold makes a video or an infographic that a person accepts with few or no revisions.
**Read with:** [film document](component-specs/film-document.md), [15 lessons](15-explainer-lessons.md), [17 explainer components](17-explainer-visual-components.md), [12 infographics](12-infographic-system.md).

## 1. Where quality is lost today

The film path works: one JSON file, a checker, a review and a render. The first films through it showed five places where quality is lost. Each one is a different kind of problem, so each needs a different kind of fix.

| # | Loss | Evidence |
|---|---|---|
| 1 | **Decisions before pixels are not checked.** An agent picks a story, a pace and a metaphor with no feedback | `inspectExplainerPrinciples` checks hooks, payoffs and holds. The film path does not call it |
| 2 | **The film file reaches a small part of the library.** | It reaches 25 recipes and `object-story`. It does not reach `chart-story`, the 8 visual stages, characters, footage or 3D |
| 3 | **The review cannot see.** It reads text boxes only | Dark text on a dark image passed it. An empty frame passed it. A person found both |
| 4 | **Iteration is slow.** | A 21-second film takes 156 s to render: about 4 frames a second |
| 5 | **Nothing is remembered.** | The catalog has 0 approved entries. Each film starts from zero. Each rejection teaches one session only |

Infographics have a sixth loss: **no path at all.** `buildInfographic`, the templates, the art directions and `layoutToSvgFile` exist, but there is no command, no PNG and no review.

## 2. Seven perspectives

Each perspective is a role on a real production team. Each one sees a different loss and proposes a different fix.

### A. The scientist: measure first

Without a benchmark, "higher quality" is an opinion.

- **Build:** a set of 12 fixed briefs across subjects and formats (explain a mechanism, compare two prices, show a trend, tell a short story with a number). `npm run bench:content` runs an agent on each brief from a cold start.
- **Record:** first-pass check rate, review errors, iterations to a clean review, wall time, and a human score from 1 to 5 on a fixed rubric (reads in one glance, one focus, fills the frame, picture explains the beat).
- **Exit:** a baseline table in `docs/verification/`. Each later workstream reports its change against it.

### B. The director: story before pixels

Most weak films are weak before the first frame. Loss 1.

- **Storyboard file.** A small JSON stage before the film file: one learning objective, then beats. Each beat states **input, transformation, visible output** and its role (hook, mechanism, payoff, limit). `film:storyboard` compiles it to an `ExplainerPrinciplesManifest` and runs the checker that already exists.
- **Hook as a scene type.** `short-hook-director` already compiles five opening types. Make it a film scene, so the first 3 seconds are designed, not improvised.
- **Text-off test.** `film:review --no-text` draws the sheet with captions and labels hidden. If the pictures alone do not carry the beat, the beat fails. This is the rule in docs/15, made a command.
- **Exit:** a storyboard with no payoff, or with a beat that has no visible output, fails before any scene is written.

### C. The editor: time comes from sound

Today an agent guesses `durationFrames`. A real edit is cut to the voice. Loss 1.

- **Narration-first timing.** Input: a script and an alignment file from any speech tool. The parsers exist (`alignment-formats`), and `alignmentToCaptionTrack` exists. `film:time` sets scene and beat durations from the words, writes captions, and links cues to words.
- **Pace report for every scene.** `object-story` already reports its longest still stretch. The review can measure this for any scene by comparing small copies of sampled frames. Report dead stretches and frantic stretches film-wide.
- **Exit:** a narrated film where no beat ends before its sentence, and no stretch over 2.5 s is still unless it is marked as a hold.

### D. The art director: one look for one film

The example film needed a hand-set background to make its three scenes match. Loss 2 and loss 3.

- **Film-wide look.** One `look` object in the film file: color roles, type scale, surface, grain. Every scene type reads it through tokens. No scene sets its own canvas.
- **Curated looks.** Three to five named looks. A person approves each look once, on the benchmark films. `film-style-grammar` already has three grammars for shot choice. Join them: a look plus a grammar is a **style**.
- **Exit:** the same film file renders in each look with no text error, and no scene needs a per-scene color.

### E. The critic: a review that sees

Loss 3. Four layers, from cheap and certain to costly and subjective. A lower layer never replaces a higher one.

1. **Geometry** (exists): collisions, clipping, safe areas, type size.
2. **Pixel measures, no model:**
   - *Contrast:* sample the screenshot under each text box and compute the contrast ratio. This catches dark text on a dark image.
   - *Occupancy:* the share of the frame that differs from the background. This catches the empty frame.
   - *Balance:* the visual centre of mass against the safe-area centre.
   - *Motion:* change between sampled frames, for the pace report in C.
3. **Rubric critic (advisory):** an agent reads the full-size frames against a fixed rubric and writes scored findings to `report.json`. It never approves. It covers only what layers 1 and 2 cannot measure. This needs a decision: see section 5.
4. **Human approval ledger:** an approval is stored with a fingerprint of the inputs (`visual-receipt` already computes this). It stays valid until an input changes. A re-render of an approved, unchanged scene needs no new review.

- **Also:** `film:review --against=<ref>` draws before and after side by side, so a revision is judged as a change.
- **Exit:** the two defects that a person found in the first films are found by layer 2 with no person.

### F. The toolmaker: reach and speed

Loss 2 and loss 4.

- **Scene adapters.** One small contract for a scene type: schema, compile, render, review frames. Write adapters for `chart-story` first, then the visual stages (`comparison-stage`, `causal-system-stage`, `map-stage`, `code-stage`, `evidence-stage`), then `character-presenter` and `frame-accurate-clip`. This is the largest gain in what a film can show.
- **Fixes that a machine can apply.** A diagnostic carries a JSON Patch when the fix is certain (a misspelled key, a cue outside the scene). `film:fix --safe` applies them.
- **One frame, fast.** `film:frame -- <file> --frame=120` returns one PNG in about 2 s, with its audit. An agent then checks a change in seconds.
- **Render speed.** Three steps, in this order: render segments in parallel pages (`segmentPlan` exists), reuse a scene whose fingerprint did not change, and do not capture a frame whose state did not change. Target: 10 times faster on a cold run, and near-instant for an unchanged scene.
- **Variants.** `film:variants -- <file> --scene=<id>` makes three or four alternatives for one scene (another recipe, another arrangement, another look) and draws them on one sheet. A designer explores before choosing. An agent should too.
- **Exit:** the benchmark films use at least 6 scene types, and a one-scene change is reviewed in under 10 s.

### G. The librarian: memory

Loss 5. Human review is the scarce resource. Each approval and each rejection must pay back many times.

- **Exemplars.** An approved film or graphic is stored as an example with its intent. `film:example --like="compare two prices"` returns the nearest approved work. Agents start from proven work, not from a blank file.
- **Rejections become rules.** A rejection is recorded with its frame and its reason. A reason that recurs becomes a check. Docs/15 does this by hand today.
- **Art coverage.** An object with no art becomes a word card, silently. Build a concept-to-art index over the domain packs, and report missing art as a named gap. Follow [asset sourcing](ASSET_SOURCING.md) to fill gaps.
- **Exit:** the second film on a topic takes fewer iterations than the first, measured on the benchmark.

## 3. Infographics: the same path for stills

- **Commands.** `graphic:check`, `graphic:review`, `graphic:render`, on an `InfographicSource` file. They mirror the film commands and reuse the schema checker, the text audit and the pixel measures.
- **Outputs.** One source, many sizes (1:1, 4:5, 9:16, 16:9) and carousel pages (`buildInfographicPages` exists). SVG and PNG.
- **Honest data.** Checks for a zero-based bar axis, a stated unit, a stated source, and a number that matches its source value. `chart-story` already enforces some of these.
- **One brief, three outputs.** Derive a film from an infographic source (one section becomes one scene), and derive a thumbnail from a film's hook (`thumbnail-composition` and `thumbnail-preflight` exist). The storyboard file in B is the shared source.
- **Exit:** one source file gives a reviewed graphic in four sizes, and a draft film, with no hand-written layout.

## 4. Order

| Phase | Work | Why here |
|---|---|---|
| 0 | A benchmark, E4 approval ledger | Defines "good" and measures every later step |
| 1 | E2 pixel measures, F one-frame preview, F render speed | Makes each later iteration cheaper and more honest |
| 2 | F scene adapters, D film-wide look, section 3 infographic commands | Raises the ceiling of what can be made |
| 3 | B storyboard file and hook, C narration timing and pace | Raises the quality of the decisions |
| 4 | F variants, G exemplars and rules, section 3 three outputs, E3 rubric critic | Compounds the gains |

Each phase ends with a benchmark run and a human review of its sheets. Stop after each phase and report.

## 5. Decisions and risks

- **Rubric critic.** AGENTS.md rule 9 forbids a model review in place of solvable geometry. This plan keeps a model out of layers 1, 2 and 4, and uses it only as advice for what cannot be measured. Decide whether that is acceptable.
- **Speech.** Kumiki does not make speech. Narration timing needs an audio file and an alignment file from outside.
- **Human review capacity.** No part of this plan removes the need for a person. The plan makes each review cover more work.
- **Audit first.** The modules named here were read at the level of their exports. Each workstream starts with a short audit of the module that it joins.

## 6. Not in this plan

- Image, video or voice generation inside Kumiki. These stay upstream.
- A second renderer or clock.
- A model as an approval gate.
- A server or a hosted service. The commands stay local and offline.
