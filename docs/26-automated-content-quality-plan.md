# 26 — Automated Content Quality Plan

**Status:** proposed, with one slice built on 2026-11-06: story checks (4.1, on film scenes, not yet a storyboard file), the match transition (4.3), sound accents (4.4), contrast, empty-frame and squint measures (2E, 4.6), and `video:measure` for pace, flashes and teardowns. See the [slice report](verification/2026-11-06-research-slice.md) and the first [reference teardown](verification/2026-11-06-reference-teardown.md). The rest is not built.
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

A seventh loss is outside the code: **craft that the tools do not know.** Section 4 covers it.

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
3. **Rubric critic (advisory, approved 2026-11-06):** an agent reads the full-size frames against a fixed rubric and writes scores and findings to `report.json`. It never approves. It covers only what layers 1 and 2 cannot measure. It scores as three viewers: a person with the sound off, a person who sees only the first 3 seconds, and a person who sees the frame at thumbnail size. Each one states the claim in one sentence. The answers are compared with the learning objective.
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

## 4. Craft from outside the repository

Sections 1 to 3 find what is missing in the code. This section asks a different question: what do good editors, researchers and platforms know that the code does not know yet?

**Evidence grades.** The sources differ in quality, and the plan treats them differently.

| Grade | Source type | Use in this plan |
|---|---|---|
| Strong | Peer-reviewed research | Becomes a default check |
| Official | A platform's own guidance | Becomes a platform profile |
| Practitioner | A studio's own account of its process | Shapes the workflow |
| Weak | Vendor blogs. Most numbers have no source, and they disagree | Becomes a setting with no fixed threshold |

### 4.1 Surprise is a structure, so it can be checked

- **Finding (strong).** A 2024 study in *Science Advances* measured about 30,000 films, shows, novels and pitches. Stories with more and larger reversals of fortune were rated higher. The authors warn that this is not a formula.
- **Finding (strong).** Curiosity comes from a gap that the viewer notices in what they know (Loewenstein). A story is a chain of such gaps.
- **Finding (weak).** A sudden interrupt holds the first second, but viewers leave if it does not connect to what follows.
- **Build: the expectation ledger.** Each storyboard beat states `viewerExpects` and `actually`. A beat where they differ is a **turn**. Each beat can `open` or `close` a named loop.
- **Checks.** Every loop that opens must close. The hook opens a loop. A film over 20 s with no turn gets a "flat arc" warning. A hook must share a subject with the next beat, so the interrupt connects.
- **Build: turn recipes.** Scene types made for a reversal: *you would think, but*, *myth and bust*, *the catch*, *it gets worse*, *zoom out*. Each one keeps the same object on screen and changes what the viewer believes about it.

### 4.2 Teach the way people learn

- **Finding (strong).** Mayer's multimedia principles: remove extras (coherence), point at what is spoken (signaling), do not repeat narration as screen text (redundancy), put a label next to its subject (spatial contiguity), show a thing when it is named (temporal contiguity), and work in short segments.
- **Build: five checks**, each one measurable with data that the pipeline already has.
  - *Label distance:* the gap between a label box and its subject box.
  - *Named, then shown:* a key word in the narration has a visual cue within a few frames.
  - *Signal:* when the narration names an object, that object gets a highlight.
  - *Repeat:* a caption that copies a full narrated sentence is flagged.
  - *Extras:* a moving element with no semantic ID is flagged as decoration.
- **Conflict.** Platforms favor captions for viewers with the sound off. The redundancy principle argues against them. Resolution: two kinds of screen text. A **subtitle** is for access and can repeat the voice. A **label** is part of the picture and must be short.

### 4.3 Cut on meaning, and carry identity across the cut

- **Finding (strong).** Viewers split what they see into events when the action, place or time changes. Continuity editing keeps cuts unnoticed inside an event. Most scenes are events, and most shots are not.
- **Finding (practitioner).** The fluid look of the best explainers comes from transitions that carry one object from one sequence to the next. A match cut joins two shots by a shared shape, object or motion.
- **Build: two kinds of change.** An **event boundary** is a new claim. A **reset** is a visual change inside one claim: a push-in, a new angle, a caption swap. The pace report counts both. Reset frequency is a setting in the platform profile, because the published numbers (every 5 to 15 s) have no source.
- **Build: identity-carrying transitions.** A scene adapter publishes the screen boxes of its subjects. When two adjacent scenes hold the same `semanticId`, the compiler proposes a match cut or a shared-element morph. `cut-director` and `shared-element` already hold the math. The film file cannot reach them today. In the example film, the paper bill in the opening photo would become the bill icon of the next scene.

### 4.4 Sound is half of the edit

- **Finding (official).** "Build with sound" is one of TikTok's six creative codes.
- **Finding (practitioner).** A riser must peak on the moment that it marks. A hit must land on the exact frame of the cut. Sound from the next scene can start before the picture changes (a J-cut).
- **Build: a sound pass.** `film:sound` reads the compiled timeline and places accents from a small licensed kit that the consumer supplies: a whoosh on a transition, a riser that ends on a reveal cue, a hit on the cut frame, a tick on a counting number. `audio-visual-cue` already places sounds to the sub-frame. Add a `lead` so that narration can start before its scene, and lower the music under the voice.
- **Checks.** Every reveal has an accent. No stretch has too many accents. A film for a sound-first platform has sound.

### 4.5 Formats, not trends

- **Finding (weak, but consistent).** The formats that recur are simple: a fact explainer, a narrated story with captions, an animated explainer, a narrated slide sequence. A trend-based meme is stale in about three weeks.
- **Finding (official).** TikTok asks for a structure: an opening that takes attention, a body, and a close.
- **Build: format packs.** A format is a storyboard skeleton, a scene sequence, a look, a sound profile and its checks. An agent fills the slots. First set: *myth and bust*, *one number*, *X against Y*, *how it works in 30 seconds*, *three mistakes*, *timeline in 60 seconds*, *what if*, *one chart story*. The library stays with lasting formats. A trend has a short life, and library code must stay neutral.
- **Build: platform profiles.** Each output preset carries its checks: structure present, interface space clear, reset frequency, sound present.
- **Build: loop ending (experimental).** An option that makes the last frame match the first frame. Several guides say that replays help a short video. No platform statement was found.

### 4.6 Charts that move honestly, and stills that read at a glance

- **Finding (strong).** Animated transitions between charts improve what viewers perceive. Staged transitions are preferred. Change the axis first, then the values (Heer and Robertson, 2007). For analysis, small multiples are more accurate than animation (Robertson and others, 2008).
- **Finding (strong).** A data story balances the path that the author sets against what the reader explores (Segel and Heer, 2010).
- **Build.** `chart-story` stages each transition: axis, then values, with the same mark for the same data item. A still infographic uses small multiples where a film would animate. Each infographic template states a reading path: hero number, then support, then takeaway.
- **Build: the squint test.** Blur the frame and find the region with the most contrast. It must overlap the subject that the author named as the hero. This needs no model, and it tests "understood in one second".
- **Build: carousel rules.** One idea for each slide, one aspect ratio for all slides, a hook on the first slide, a takeaway on the last. Slide count is a setting. The sources disagree (5 to 8, or 6 to 12).

### 4.7 The voice leads, and the script is the bottleneck

- **Finding (practitioner).** Kurzgesagt states that the voiceover sets the timing for its animators, that writing is its bottleneck, and that one video takes about 1,200 hours.
- **Use.** This supports narration-first timing (2C). It also says where an agent should spend effort: on the storyboard (2B), before any scene exists.

### 4.8 Learn from the real audience

- **Finding (weak, and stated as such by the better sources).** No platform publishes a pass mark for retention. The useful comparison is against the channel's own past videos.
- **Finding (reported, not verified).** A leaked production handbook from the largest YouTube channel says that most viewers leave in the first minute, and that the team plans moments to win attention back at fixed points.
- **Build: a retention overlay.** Import the retention curve that a platform exports for a published film. Map each drop to the scene and beat on screen at that second. Draw it over the contact sheet. The library (2G) then stores which patterns held viewers, with data from the real audience, not only from one reviewer.

## 5. Order

| Phase | Work | Why here |
|---|---|---|
| 0 | A benchmark, E4 approval ledger | Defines "good" and measures every later step |
| 1 | E2 pixel measures and the squint test (4.6), E3 rubric critic, F one-frame preview, F render speed | Makes each later iteration cheaper and more honest |
| 2 | F scene adapters with identity-carrying transitions (4.3), D film-wide look, section 3 infographic commands, sound pass (4.4) | Raises the ceiling of what can be made |
| 3 | B storyboard file with the expectation ledger (4.1), learning checks (4.2), C narration timing and pace, format packs (4.5) | Raises the quality of the decisions |
| 4 | F variants, G exemplars and rules, section 3 three outputs, retention overlay (4.8) | Compounds the gains |

Each phase ends with a benchmark run and a human review of its sheets. Stop after each phase and report.

## 6. Decisions and risks

- **Rubric critic: decided.** The owner approved a scoring rubric on 2026-11-06. AGENTS.md rule 9 forbids a model review in place of solvable geometry. The critic does not replace layers 1, 2 or 4. It gives advice for what cannot be measured, and it never approves.
- **Outside numbers.** Most published numbers for hooks, pace and slide counts come from vendor blogs and disagree with each other. No check in this plan uses one as a fixed threshold. The benchmark and the retention overlay give this project its own numbers.
- **Formula risk.** The authors of the reversal study warn against a formula. The checks in 4.1 are warnings. A person can accept a film that has no turn.
- **Speech.** Kumiki does not make speech. Narration timing needs an audio file and an alignment file from outside.
- **Human review capacity.** No part of this plan removes the need for a person. The plan makes each review cover more work.
- **Audit first.** The modules named here were read at the level of their exports. Each workstream starts with a short audit of the module that it joins.

## 7. Not in this plan

- Image, video or voice generation inside Kumiki. These stay upstream.
- A second renderer or clock.
- A model as an approval gate.
- A server or a hosted service. The commands stay local and offline.
- Trend-based memes, trend audio, or any format tied to one season.

## 8. Sources for section 4

Strong:
- [Narrative reversals and story success, *Science Advances* 2024 (University of Toronto summary)](https://www.utoronto.ca/news/narrative-reversal-key-telling-great-story-books-film-and-tv-shows-study)
- [Event segmentation and film editing (review, PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC6675763)
- [Animated Transitions in Statistical Data Graphics, Heer and Robertson 2007](https://idl.uw.edu/papers/animated-transitions)
- [Narrative Visualization: Telling Stories with Data, Segel and Heer 2010](https://idl.uw.edu/papers/narrative)
- [Mayer's principles of multimedia learning (Dartmouth summary)](https://services.dartmouth.edu/TDClient/1806/Portal/KB/PrintArticle?ID=171655)
- [The information gap theory of curiosity (summary)](https://www.skyword.com/contentstandard/creativity/the-curiosity-gap-how-consumer-psychology-is-driven-by-whats-missing/)

Official and practitioner:
- [TikTok Creative Codes](https://ads.tiktok.com/business/en/creative-codes)
- [Kurzgesagt: our video process](https://kurzgesagt.org/youtube/)
- [What is a match cut (Boris FX)](https://borisfx.com/blog/what-is-a-match-cut/)
- [Risers (Epidemic Sound)](https://www.epidemicsound.com/fr/sound-effects/categories/designed/riser/)
- [Viewed vs. swiped away (Creator Essentials)](https://www.creatoressentials.com/glossary/viewed-vs-swiped-away/)
- [MrBeast production guide, as reported (Tubefilter)](https://www.tubefilter.com/2024/09/17/mrbeast-internal-production-guide-leaked-key-points/)

Weak (used for ideas, not for thresholds):
- [Video hooks, 7 patterns (Green Frog Labs)](https://greenfroglabs.com/blog/video-hooks-scroll-stopping-2026)
- [Hook-first editing (Nativz)](https://nativz.io/guides/hook-first-editing/)
- [Faceless video formats (Designerbox)](https://designerbox.ai/blog/faceless-videos/)
- [LinkedIn carousel practices (Oktopost)](https://www.oktopost.com/blog/linkedin-carousel-pdf-best-practices/)
- [Social media infographic trends (SocialRails)](https://socialrails.com/blog/social-media-infographic-trends)
