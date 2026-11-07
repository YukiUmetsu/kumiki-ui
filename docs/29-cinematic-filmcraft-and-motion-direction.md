# 29 — Cinematic Filmcraft & Motion Direction: Implementation Brief

> **Status:** Research synthesis and coding-agent implementation brief only. No feature, command, artistic approval, or new dependency is claimed to be shipped by this document.
>
> **Source baseline:** `main` at `b6e660dc441c60f9fd4377bf2c98dcc3b3df9e24`, inspected 2026-11-07. Recheck HEAD, open PRs, and actual exports before implementing.
>
> **Goal:** Make independently generated explainers feel like intentionally directed films: clear visual causality, grounded character performance, coherent cinematography, strong materials and lighting, expressive restraint, and production-quality audiovisual editing.
>
> **Scope:** A cross-cutting *execution brief*, not another film schema, roadmap, animation engine, renderer, art pack, or QA authority. [06](06-roadmap.md) owns delivery sequencing; [08](08-motion-graphics.md) owns frame-keyed motion; [09](09-explainer-components.md) owns explainer composition; [10](10-character-audio.md) owns character/audio contracts; [11](11-rendering-quality.md) owns canonical scenes/rendering; [18](18-film-style-grammar-and-direction.md) owns style grammar; [23](23-cinematic-quality-upgrade-plan.md) owns cinematic-scene milestones; [26](26-automated-content-quality-plan.md) owns film/graphic quality phases. Implement in those systems and update their owning docs when behavior changes.

## 0. Read this before coding

1. Read [AGENTS.md](../AGENTS.md), [INDEX](INDEX.md), [15 — first-attempt lessons](15-explainer-lessons.md), [23 — cinematic quality](23-cinematic-quality-upgrade-plan.md), [26 — automated content quality](26-automated-content-quality-plan.md), and [film document](component-specs/film-document.md). For any 3D hero, also read [14 — 3D fidelity](14-3d-visual-fidelity.md), [asset sourcing](ASSET_SOURCING.md), and the [hero quality gate](verification/hero-quality-gate.md).
2. Inspect the *current* public source contracts, tests, fixtures, and registry before choosing a component. Use `npm run catalog:find -- --query="..." --format=json` and `npm run catalog:api -- --id=ID --format=json` when installed IDs/exports matter. Do not infer availability from a plan.
3. Deliver **one small end-to-end vertical slice per PR**, with actual saved rendered evidence. Do not mark artistic work approved from type checks, screenshots alone, one LLM verdict, or media metadata.
4. Preserve MG1 rational-frame, absolute-time deterministic evaluation. Camera, actors, sound cues, scenes, previews, and export must agree at an arbitrarily sought frame; never add independently ticking runtimes or random state during capture.
5. Treat all outside references as **inspiration/research**, never as automatically redistributable art, code, audio, model weights, or footage. Audit each actual dependency and asset license independently.

## 1. Verified starting point, planned work, and real gaps

| Capability | Current evidence at baseline | Work to implement / verify |
|---|---|---|
| Storyboard intent | `registry/motion/storyboard.ts` already records `claim`, `visualObjective`, `focusTarget`, `narrationCue`, `exitHandoff` and `staticFallback`, and validates shot coverage/identity. | Connect its data to a low-cost **timed story reel**, rough camera/actor blocking, and final FD1 compilation. Do not invent another storyboard format. |
| Film-style operation choice | `registry/visual/film-style-grammar.ts` provides shot roles/objectives, an installed-operation catalog, deterministic selection, and rationale. | Route selections into the actual film compiler; pair named DTCG looks with semantic motion/camera intent. `docs/18` contains an older proposed description; source code is more authoritative. |
| Camera direction | CC1 (`cinematic-camera-director`, `camera-shot-*`) supports shot recipes, geometry fitting, constraints, paths, timing, and focal targets. | Add optional **story-oriented metadata and validations** for POV, action axis, geography, eyelines, shot purpose, and motivated cuts. Do not reimplement camera motion mathematics. |
| Character and contact motion | `interaction-choreography.ts` includes gaze lead, anticipation, grasp/carry/place contacts; `shot-bake.ts` joins interactions, rig evaluation, CC1 camera, lights, and frames. | Connect character acting to narrated beat/shot selection and production FilmStage; add readable-pose, silhouette, eyeline and physical-contact review. No new rig system. |
| Film source and stage | FD1 `registry/video/film-document.ts` currently accepts recipe scenes and `object-story`; `film-stage.tsx` renders `ObjectStory` or `SceneTemplateView`. | Implement small typed adapters for needed visual stages, 3D, character performance, footage and charts using [11](11-rendering-quality.md); preserve one source/frame clock. |
| Cuts and identities | `cut-director`, `shared-element`, FD1 `subjects` and a `match` transition already exist. | Add **semantic continuity** (subject/action/gesture/gaze/direction) where an adapter exposes reliable data; rectangular matching is necessary but not sufficient. |
| Narration and sound | `audio-visual-cue.ts` already associates frames with speech/beat/SFX; FD1 has audio lanes and accents. | Implement the proposed narration-first `film:time` and an editorial sound pass using the existing clock. Improve sound sources via [28](28-cinematic-sound-fx-pack-plan.md), not an independent mixer. |
| Quality feedback | `rendered-frame-measures.ts` detects some contrast, empty-frame, and focal issues; `video:measure` checks rough pace/flashes. | Implement [26](26-automated-content-quality-plan.md)'s proposed `--no-text`, sequence-level continuity, causal coverage, objective visibility, variants and approval ledger. Checks are not human sign-off. |
| Visual look and FX | Reusable 3D material/hero/light tooling exists; [27](27-cinematic-shader-fx-pack-plan.md) is a **plan**, not evidence of shipped shader effects. | Prioritize blocking, PBR/material/texture fidelity, motivated lights, tonal progression and depth; add optional polish after scene comprehension works. |

**Do not re-plan work already specified:** [23](23-cinematic-quality-upgrade-plan.md) already calls for a cheap motion-and-sound animatic and reference-backed look/motion evidence; [26](26-automated-content-quality-plan.md) already proposes `film:storyboard`, `film:time`, `film:review --no-text`, film-wide looks, scene adapters, variants, sound passes, rendering speedups and an approval/exemplar ledger. This brief supplies their missing filmcraft semantics and executable acceptance tests, not replacement ownership.

**Baseline observation:** [2026-11-06 research slice](verification/2026-11-06-research-slice.md) produced a 21-second/630-frame example with 14% landscape and 31% portrait still intervals after revision, plus focal/empty-frame warnings; it remained pending human approval. The report noted that comparable references animate the **subject**, whereas a slow full-frame drift mainly moves pixels. Do not treat the reference stillness percentages as universal quality thresholds.

## 2. Core filmmaking principles to encode

### 2.1 Story and visual proof before polish

- One shot should advance a viewer-understandable **claim** or emotional beat: establish → question/obstacle → observable action → result/turn → payoff. A shot may be quiet, still, word-led, character-led or continuous; choose what best communicates the beat.
- Draft rough boards and an **animatic** (timed storyboard reel with temporary audio) before expensive render. Then perform **layout/blocking** using proxies for actors, props, set, camera, light and action to validate geography and timing. Disney explicitly develops storyboard movies and rough 3D layout before final animation ([Story](https://disneyanimation.com/process/story/), [Layout](https://disneyanimation.com/process/layout/)); Pixar's [Art of Storytelling](https://www.khanacademy.org/computing/pixar/storytelling) includes structure, visual language, film grammar, storyreels and feedback.
- Start the visual decision from **what must become visible**, not from a preset name, shader, background or catchy caption. If the explanation relies on words and the image merely decorates them, revise visual evidence before embellishment.
- Prefer the least complex truthful presentation: `still` for a static fact/archival image, `animated` when time, motion or transformation teaches the relation, `hybrid` when a strong still establishes context before a necessary transformation. Controlled visualization research warns that animation can distract or mislead if motion is not apprehensible or congruent ([Tversky et al. 2002](https://doi.org/10.1006/ijhc.2002.1017); [Heer & Robertson 2007](https://idl.uw.edu/papers/animated-transitions)).

### 2.2 Cinematography as a meaning-bearing visual language

- **Stage before moving camera.** Identify who/what matters, their gaze, screen position, silhouette, action and relationship. Let camera movement reveal or follow meaningful changes. An unnecessary orbit can obscure an explanatory mechanism.
- Choose shot purpose deliberately: establish geography; investigate a detail; follow an actor; show scale; make a comparison; witness a reaction; reveal evidence; resolve a question. Attach one-sentence rationale and permitted exceptions.
- Distinguish *objective observer* vs *subjective character* POV; use wide/medium/close/detail based on what must remain readable; choose camera height, lens/FOV, depth and hold duration to express meaning. The ASC describes camera placement, eyelines, actor blocking and geography as narrative choices ([Where Do You Put the Camera?](https://theasc.com/article/shot-craft-where-do-you-put-the-camera/); [Analyzing a Script](https://theasc.com/article/shot-craft-analyzing-a-script/)).
- Track screen direction/action axis across adjacent shots when relevant, but **do not hard-fail** the 180-degree rule: a motivated axis crossing or designed disorientation is valid. Preserve scene geography or reestablish it when confusion would block the claim.
- Aim for readable compositions at output resolution: one primary focus at a time, safe text/subject framing, foreground/midground/background separation, positive/negative space, and no frame edges exposed by pushes or whips.

### 2.3 Editing and attention continuity

- A transition is not premium because it is complicated. Cut when the **story event, attention destination, action, or emotional state** requires it. A static hold may be better than an effect.
- Support match-on-action, subject/shape identity, eyeline-to-object, gesture-led cut, movement-direction continuity, foreground occlusion, and intentional disorientation. Store **before/after semantic targets** and screen/camera geometry when available.
- Example: actor looks at and points to `gear-b` → cut to the gear detail → it reacts to the input gear → return to the actor reaction. The viewer's attention is already at the new shot's subject; no generic wipe is needed. Attentional continuity is studied in Tim J. Smith's [Attentional Theory of Cinematic Continuity](https://ualresearchonline.arts.ac.uk/id/eprint/21187/).
- Ensure a shared subject's identity and important attribute values survive cut and morph; do not imply false causality by changing one object into an unrelated one. Keep narration/music tails or leads across cuts only when the existing audio lanes support them.

### 2.4 Causality and educational comprehension

- For mechanism explanations, express **input → action/transformation → observable output** in consecutive temporal order. The important object must be visible or highlighted when named, with an explicit reading hold after the result.
- Stage chart/data morphs so identities, baselines, units and values remain truthful. Prefer intermediate states over direct incoherent interpolation; this can help readers track items ([Heer & Robertson](https://idl.uw.edu/papers/animated-transitions)).
- Keep subtitles (accessibility) separate from labels (part of the picture). Near-target labels, narration-to-action synchronization, visual signaling and removing irrelevant motion align with Richard Mayer's [multimedia-learning principles](https://www.cambridge.org/core/books/abs/cambridge-handbook-of-multimedia-learning/principles-for-reducing-extraneous-processing-in-multimedia-learning-coherence-signaling-redundancy-spatial-contiguity-and-temporal-contiguity-principles/C98AB3A6CE760DD63C048936EA0B3B44).
- Preserve spatial memory across beats. A persistent subject evolving in a continuous world often teaches more than fade-in/out cards, but *continuous shot* is a creative option, never a universal mandate.

### 2.5 Motion choreography and character acting

- Use classic animation ideas where they clarify action: anticipation before effort, staging/appeal, arcs, timing and spacing, weight, follow-through, secondary action and settle. Disney's [Animation](https://disneyanimation.com/process/animation/) and Pixar's [Articulating the Appeal](https://graphics.pixar.com/library/ArticulatingAppeal/paper.pdf) emphasize readable silhouettes and coordinated face/body expression.
- Group choreography into **primary narrative action**, subtle **secondary reaction**, and optional **ambient** movement. Hero leads; supporting gestures, camera, lighting, contact shadows and SFX respond at coherent but not mechanically identical times.
- Physical interactions should preserve contact frames, attachment/grounded feet, material response, readable hand/eye focus and plausible cause-effect. Reuse `interaction-choreography` and `shot-bake`; don't fake a grasp with an unbound sprite. Exaggeration is allowed for explicitly stylized characters, not for misleading educational geometry.
- Character dialogue is performance: pre-speech eyeline, speaker emphasis gesture, visible reaction from the listener, breathing/settle, correct speaker viseme, and camera not occluding the teaching subject. Two characters need distinguishable roles rather than simultaneous perpetual motion.
- Use restraint in emotional tone: premium/elegant is generally controlled and precise; expressive/playful can use more overshoot, squash and counter-motion. Material movement varies (rigid mass, paper, rubber, fabric), but named ease presets are approximations, **not physical simulation**.

### 2.6 Lighting, image craft and sonic editing

- A **look** is more than palette: coherent shapes, art style, measured texture scale, material PBR, depth separation, typography, shot lens/height, key/fill/rim relationship, lighting contrast, grading, controlled atmosphere, background motion and a sound identity. Pixar's [Incredibles 2 cinematography account](https://renderman.pixar.com/stories/incredible-cinematography) shows rough lighting informing early layout and film-wide camera language.
- Consider a **colorscript**: intentionally vary color, light quality, tonal contrast and visual density across major beats while preserving asset/material identity. Do not apply random per-scene looks. Evaluate in both adjacent frames and full-speed sequences.
- Sound is part of the edit: narration cues lead semantic action, a contact sound follows actual collision/contact, sound transitions peak on authored events, and music yields to speech. Not every transition deserves a whoosh; silence and dry reveals can be stronger. Reuse [28](28-cinematic-sound-fx-pack-plan.md) and `AudioVisualCue`. Disney's [Post Production](https://disneyanimation.com/process/post-production/) covers editorial, score, sound design, mixing and color as continuing story work.
- Do not mask unconvincing meshes, under-detailed textures, bad silhouette, robotic timing or incoherent action with particles, bloom, glass, gradients or overdone sound.

## 3. Extracting the four studied motion-design skills responsibly

These are third-party **design references**, not code to execute, automatically install, or redistribute.

| Source skill | Techniques worth adopting | Kumiki target | Recommendations **not** to universalize |
|---|---|---|---|
| [LottieFiles Motion Design Skill](https://github.com/LottieFiles/motion-design-skill): [decision framework](https://github.com/LottieFiles/motion-design-skill/blob/main/skills/motion-design/director/decision-framework.md), [choreography](https://github.com/LottieFiles/motion-design-skill/blob/main/skills/motion-design/director/choreography.md) | State motion **purpose** first; choose personality/intensity; hero-first attention, spatially consistent entrances, counter-motion, staged setup/action/resolve, useful stagger, material-responsive settle, reduced-motion alternatives | Extend existing MD1 `DirectorProfile` / FSG1 operation policy, shot rationale and film review; no new easing engine | The skill's 1/3 motion/density rules, exact percentages, 500 ms stagger cap, mandatory ambient layer, or 'never linear' as universal cinematic hard errors. |
| [Bang Motion](https://github.com/bangtutorial/bang-motion): [anti-PPT](https://github.com/bangtutorial/bang-motion/blob/main/references/anti-ppt.md), [concept families](https://github.com/bangtutorial/bang-motion/blob/main/references/opener-konsep.md) | Avoid title→card→image→fade repetition; preserve a hero/world across sequences; select **concept structure** from the topic; make UI demos execute visible state; use object handoff, motivated camera, concept/style fingerprints | Extend FD1 adapters, identity-carrying cut planner, film-wide style/look and approved-example ledger; optional live-UI-demo scene only when product briefs need it | No mandatory '10 moving objects', one-shot film, zero explanatory labels, constant moving background, exact opener formula, template blacklist or GSAP/HTML exporter. Explainers need some text and calm holds. |
| [Premium Animations](https://github.com/filipe-dev-macae/premium-animations): [animation](https://github.com/filipe-dev-macae/premium-animations/blob/main/references/animation-principles.md), [UI](https://github.com/filipe-dev-macae/premium-animations/blob/main/references/premium-ui-principles.md) | Purposeful calm hierarchy; containers/subject/proof ordered meaningfully; actual visible state change; restraint in gloss; transform/opacity for UI where possible; respect reduced motion and keyboard; avoid fragile layout animating | Apply existing Motion React/GSAP-free MG1 or CSS where appropriate, and existing performance/a11y gates; polish optional SaaS UI demonstration pack | No obligatory GSAP, Lenis, ScrollTrigger, another render clock, one-size duration/easing tables, or decorative Three.js filler. UI hover timing does not determine a film shot's pacing. |
| [SaaS Product Demo Video](https://github.com/noamdorr/saas-product-demo-video): [creative direction](https://github.com/noamdorr/saas-product-demo-video/blob/main/skills/saas-product-demo-video/references/creative-direction.md), [shot design](https://github.com/noamdorr/saas-product-demo-video/blob/main/skills/saas-product-demo-video/references/shot-design.md), [motion language](https://github.com/noamdorr/saas-product-demo-video/blob/main/skills/saas-product-demo-video/references/motion-language.md), [taste review](https://github.com/noamdorr/saas-product-demo-video/blob/main/skills/saas-product-demo-video/references/taste-review.md) | State the film's **one visual argument** (which meaningful object changes, how, and why the viewer cares); inspect 2–3 chosen film references for camera/transition verbs and rhythm; maintain a picture through the cut; animate real product state instead of mock UI screenshots; use sound/beat anchors and deliberate contrast in motion; review evidence separately as stills, frame strips, and normal-speed footage | Extend existing storyboard `visualObjective`, reference teardown, shot rationale, subject continuity, AudioVisualCue and review/approval evidence. For optional software demos, use a self-contained adapter and author independent 16:9/9:16 compositions with shared semantics | Do not import its Remotion scaffold or run its scripts as part of Kumiki core; narration-first educational films need **not** cut to every music beat; don't mandate one global 3D world, a template visual style, or an extra user-approval gate. |

Additional design implications:

- **One visual argument, not a montage:** for a product or mechanism film, state what concrete object/relationship will visibly change and what that change proves. Use source-backed reference breakdowns (rhythm, camera intent, transition verbs, light and motion) without copying protected footage or assuming a reference is licensed production material. The SaaS demo skill's music-grid recommendations are conditional: a narrated explanation is cut to words and meaning first; any musical accents follow the authored cues.
- **Attention budget:** one main teaching event at a time. A lighting accent or gesture may support it; competing highlights are warnings. Idle/background motion is optional and should remain perceptually subordinate.
- **Brand/film-specific visual DNA:** choose a style based on content and audience, not on last project's default dark gradient/glow/feature cards. Record a *structural fingerprint* (concept, scene roles, subject lifecycle, camera/transition grammar, opening/payoff) separately from a *surface fingerprint* (palette, material, type, background).
- **Treatment exploration:** produce three reasoned candidates for an opening or important scene when useful, then compare story clarity, visual proof, asset feasibility, style diversity and cost. This is not a requirement to generate three complete films.
- **Semantic typography:** kinetic type should express questioning, contrast, accumulation, revelation or resolution, not repeat the same character-stagger entrance. Treat it as an occasional principal subject and keep timed labels stable when a camera moves.
- **Product walkthroughs:** when the subject is real software, show clicks/data/state transitions (prefer genuine components) rather than static screenshot zooms. This is a later optional scene adapter, not a general-purpose website animation dependency.

## 4. Proposed production path and data contracts

The following are **implementation directions**, not shipped APIs. Inspect existing types and compile an example before freezing names or extending the wire format.

```text
Consumer-owned claims, script, evidence, assets, narration/alignment
      |
      v
Existing Storyboard (claim / visualObjective / focusTarget / exitHandoff)
      + FSG1 named grammar + capability catalog + authored look
      |
      v
Story preflight + narration timing [docs/26, proposed]
      |
      v
Low-cost timed animatic -> proxy 2D/3D cinematic layout [new integration]
      |                                |
      |             actor blocking / camera / light / sound / cut review
      v                                v
FD1 scene adapters -> MG1/MD1 + CC1 + CutDirector + ShotBake + AudioVisualCue
      |
      v
FilmStage at absolute frame -> final capture -> film:review / video:measure
      |
      v
Human audiovisual verdict + reproducible approved exemplar [docs/26]
```

**Ownership boundaries**

- **Consumer studio (e.g. ContentGen):** factual research, claim verification, script, narrative choice, voice/audio generation, evidence/source/asset rights, publishing and final approval.
- **Kumiki:** reusable semantic visual vocabulary, camera/cut/staging/animation compilers, optional film style metadata, deterministic rendering, constraints and candid review artifacts. It must never invent facts, silently choose copyrighted assets, require subscriptions, or own external account credentials.
- **3D producer (e.g. Kumiki Blender):** high-quality modeled/photogrammetric geometry, rigs, texture/material source and quality evidence; Kumiki consumes an approved scene/asset contract.

### 4.1 Suggested optional semantic additions (illustrative only)

Prefer augmenting or resolving **existing** `StoryboardShot`, `FilmShotRequest`, `FilmStyleGrammar`, `FilmDocument` and adapter metadata rather than defining a parallel `DirectedFilm` JSON format:

```ts
// Proposed compiler metadata, NOT an existing Kumiki API.
interface DirectedBeatIntent {
  // Keep existing claim, visualObjective, focusTarget and narrationCue in StoryboardShot.
  purpose: "establish" | "investigate" | "cause" | "compare" | "react" | "payoff";
  presentation: "still" | "animate" | "hybrid";
  subjectIds: readonly string[];
  visibleChange?: { inputId: string; action: string; outputId: string };
  attention?: { leadTargetId: string; arrivalTargetId: string; holdFrames?: number };
  camera?: {
    intent: "hold" | "follow-action" | "inspect" | "reveal" | "reaction";
    pointOfView?: "observer" | "actor";
    actionAxisId?: string;
    preserveScreenDirection?: boolean;
  };
  transition?: {
    handoffId?: string;
    cutReason?: "new-event" | "new-evidence" | "follow-gaze" | "match-action";
    disorientationIntent?: string;
  };
}
```

Require each field to have a real consumer and a failing test fixture before shipping it. The example is intentionally **not** a new authoritative schema. Resolve metadata to existing frame/camera/cut/actor commands, preserve source asset provenance and validate unknown/unsupported operation IDs.

### 4.2 Scene adapter outputs

Extend [26's adapter plan](26-automated-content-quality-plan.md) with bounded semantic **observations** as well as render support:

- Adapter input: validated existing scene spec + output aspect + rational FPS + resolved look + asset/renderer capabilities.
- Adapter output: compiled frame evaluator; React/render source; subject bounding boxes or projectable 3D target bounds at declared critical frames; stable identities; semantic events (look, gesture, contact, reveal, hold); declared visual affordances/fallbacks.
- For camera/cut planning, expose optional action direction, gaze/gesture targets and screen-space positions **only when actual data exists**. Never synthesize precision from a screenshot.
- Adapter review metadata: critical frames, preview cost tier, required assets, a reduced-motion/static state, and warnings when 2.5D view angles or occlusion become invalid.
- The adapter must not create a separate clock, unrestricted JS-on-the-wire, arbitrary network fetch, or app-specific dependencies.

### 4.3 Storyreel and layout artifacts

Implement the smallest reusable part of [26's `film:storyboard`/`film:time`](26-automated-content-quality-plan.md) plus [23's required animatic evidence](23-cinematic-quality-upgrade-plan.md):

- **Timed storyreel:** shot-by-shot thumbnails/rough panels with temporary narration, dialogue, audio hits and cuts; exact shot IDs and frame ranges; produces a seekable preview clip and annotated contact sheet.
- **Proxy layout:** simple placeholder geometry and rigs in existing stages, authored camera pose/target, projected subject boxes, light direction and major gesture/contact cues. Cheap frames should preserve *intended composition* so they remain diagnostic.
- **Shot decision report:** purpose, observable output, subject focus, presentation choice, camera rationale, entry/exit identity and audio cue anchors; unresolved art/rights/capability reported visibly.
- **Revision safety:** geometry or asset changes invalidate only dependent shot previews; the stored film/shot fingerprint identifies what was reviewed. Reuse `visual-receipt` and [26's caching/review plans](26-automated-content-quality-plan.md).
- **Command spelling is tentative:** `film:animatic` and `film:layout` are reasonable proposals, **not verified existing CLI commands**. Inspect `scripts/film.mjs` and package scripts before choosing.

### 4.4 Film-wide look, shot-level mood and structural novelty

- Keep the existing FSG1 operation/role selection, then route named DTCG art direction tokens to every compatible adapter. A film-wide look should carry key/fill/rim intent, color roles, font/type hierarchy, material family, contrast/atmosphere, and restrained sonic identity.
- A **colorscript** is a beat/shot progression over a base look: e.g. establishing warm diffused light → cooler investigative close-up → clear payoff. This is *direction*, not an effect generator or permission to recolor physical materials arbitrarily.
- Record scene **structure** independent of styling: sequence of subject actions, teaching roles, camera intents and cut families. Compare approved recent films by this fingerprint so new palette/glow does not disguise recycled composition. A repeated structure may be justified; flag rather than ban it.
- Do not require always-moving backgrounds, a camera transition every N seconds, or decorative ambient effects to "avoid slideshow." A meaningful static hold is valid; unmotivated motion is not.

## 5. Incremental implementation slices (map to docs/06, 23 and 26)

These are **task slices**, not a competing release roadmap. Before starting any, inspect latest code and record the concrete unimplemented capability and a representative fixture. Each slice should end in a separate reviewable PR and rendered evidence. Suggested ordering follows prerequisites, but the owning roadmap can re-order.

### Slice A — Baseline, benchmark and filmcraft scorecard [P0]

**Extend:** [26 §2A/E/G](26-automated-content-quality-plan.md), `film:review`, `video:measure`; [23 §7](23-cinematic-quality-upgrade-plan.md).

- Select one generic 20–30 s narrated explanatory fixture (section 6) and multiple short benchmark briefs; retain a stable seed, input assets, FPS, and license/provenance inventory.
- Record: viewer takeaway per beat, critical frames, native scene capabilities, actual render latency, frame reuse, largest/longest holds, critical-box coverage, text collisions, 16:9/9:16 legibility, narration/action offsets and current human verdict.
- Use [26's review rubric](26-automated-content-quality-plan.md); keep subjective scores separate from reproducible measures. Do not invent approval or a threshold from unrelated videos.
- **Exit:** machine-readable baseline report, full-speed reference MP4/contact sheet for both output aspects, and timecoded defects. This baseline need not be beautiful.

### Slice B — Storyboard → narration → rough animatic/layout [P0]

**Extend:** `storyboard.ts`, `AudioVisualCue`, `scripts/film.mjs`, [26 §2B/C](26-automated-content-quality-plan.md), and current film preview.

- Connect existing storyboard IDs/objectives and alignment cues to a frame-accurate timed storyreel. Show temporary captions/narration and declarative shot transition choices.
- Render placeholder subject, actor gaze/gesture/contact and camera blocking where declared. Surface missing visual evidence and asset capabilities, not silent word cards.
- Validate visual-objective presence, shot coverage, all cue anchors, storyboard handoffs and safe text at each supported aspect. Use the same output size/FPS domain as FD1.
- **Exit:** a reviewer can play/scrub the *rough* 20–30 s reel, understand the causal sequence with labels hidden where applicable, and identify bad geography before high-detail rendering. Exact same frame produces same proxy state after random seeks.

### Slice C — Reach existing visual/3D/character stages from FD1 [P0]

**Extend:** `film-document.ts`, `film-stage.tsx` and [26 §2F](26-automated-content-quality-plan.md); consult [11](11-rendering-quality.md).

- Implement **one** general adapter shape proven by a needed fixture, then add the smallest missing kinds (first a causal visual stage, then a genuine 3D/character shot; footage/chart only if the fixture requires them). Keep current recipes/object-story behavior backward-compatible.
- Export stable subject identities and truthful evaluated boxes/target geometry for CC1/cuts. Supply reduced-motion static presentation and compiler diagnostics when source art/rig is not ready.
- Verify real output, not a simulated renderer or CSS screenshot pretending to be 3D. Preserve correct opacity, depth, material, shadows and camera across scene boundaries.
- **Exit:** one FD1 film plays a recipe, a real 3D explanatory action and a multi-actor reaction with the same MG1 timeline, proper sound alignment, and no regression in existing tests.

### Slice D — Meaning-driven camera and continuity edits [P0]

**Extend:** FSG1 operation selection, CC1 planning/constraints, `CutDirector` and existing `shared-element`.

- Map storyboard purpose to actual shot plans, including appropriate wide/medium/detail, gaze lead, subject action, revealing movement, objective/character POV and deliberate reading holds. Explain every generated move.
- Add optional **continuity checks** across adjacent shots: subject ID/value, eyeline destination, action direction/axis, preserved screen geography, camera transitions and frame-edge safety. Separate hard geometric defects from advisory cinematic preferences.
- Add a small set of *meaningful* cut patterns (match-on-action, eyeline-follow, occlusion, shared identity) only where real scene events and screen geometry support them. Declared disorientation is a logged opt-out, not a failing test.
- **Exit:** an actor points to a persistent 3D part, the camera cuts to that part without attention/identity loss, the part performs the explained action, and the return shot reads at full speed. No generic transition is necessary.

### Slice E — Causal choreography and character performance [P1]

**Extend:** visual-stage motion, MD1, `interaction-choreography`, character definitions, `shot-bake` and [10](10-character-audio.md).

- Use one visible cause → action → result contract; emit stable emphasis/hold cues. Support a still mode for non-temporal facts; avoid incorrect chart/object morphs.
- Coordinate primary action with eye-line, reach/grasp/gesture, camera follow, secondary listener reaction, believable settle and bounded ambient motion. Use saved rig revision and speaker/viseme alignment where required.
- At critical frames review body/face silhouettes, negative space, hand/prop overlap, foot contacts, shadow attachment, 2.5D view-angle limits and object motion. No perpetual robotic "talking" gestures.
- **Exit:** two neutral, re-usable characters visibly interact with the mechanism and each other; contact frames and speaker cues match narration, and the teaching object remains legible even with captions hidden.

### Slice F — Film-wide look, light progression and image craft [P1]

**Extend:** [18](18-film-style-grammar-and-direction.md), [23 §8](23-cinematic-quality-upgrade-plan.md), [26 §2D](26-automated-content-quality-plan.md) and existing DTCG/camera-lighting/hero-render systems.

- Implement one film-wide look consumed by all selected adapters, with authored palette/type/material/lighting roles and per-shot transitions that deliberately track story beats.
- Validate physically plausible light response where photorealism is requested; stylized exceptions must be explicit. Protect readable face/subject separation and critical text contrast across camera movement.
- Test a warm/cool/neutral mood progression using identical assets and non-destructive look tokens. A look must not cover low-detail hero geometry with shader effects.
- **Exit:** adjacent frames/scene handoffs match material identity and typography; 16:9 and 9:16 can render a consistent look without per-scene hardcoded brand palettes; visual reviewer signs off.

### Slice G — Sequence-aware editor/critic and approved-exemplar feedback [P1]

**Extend:** [26 §2E/G and §4](26-automated-content-quality-plan.md), existing frame measures/visual receipt/film review.

- Build `--no-text` samples, multi-frame motion/attention strips, and pre/post-cut checks. Record whether a named subject appears at its narrated phrase, label distance, attention conflicts, safe holds, and semantic handoff continuity.
- Catch structural anti-PPT signatures: repeated title-card template, generic background with only zoomed still art, many text-heavy shots without visible proof, repeated identical cuts; **warn with exact shot/time and counterexample**, not ban a style.
- Use deterministic geometry for clipping/collision and semantic declared events for continuity first; use pixel measures second; an advisory visual critic third; human full-speed approval last.
- Store approved/rejected shots with a stable input/style/artifact fingerprint and timecoded reasons. Feedback affects *future candidate ranking*, not silently retroactive approval.
- **Exit:** a deliberately broken fixture detects wrong cue order/subject gap/label collision; an intentional still documentary hold remains acceptable; approved and unapproved statuses are unambiguous.

### Slice H — Optional specialist packs [P2]

- Kinetic typography treatments driven by semantic role, with measured text bounds and CJK/long-copy tests.
- Real UI walkthrough scene that shows changes in component state and visible user outcome rather than static screenshot movement.
- Optional material-specific secondary motion, sound polish and shader FX under [27](27-cinematic-shader-fx-pack-plan.md)/[28](28-cinematic-sound-fx-pack-plan.md) once earlier slices demonstrate a clear need.
- **Exit:** each pack adds a distinct communication capability, not merely a different surface effect, and passes a complete film integration/test/visual review.

## 6. One falsifiable end-to-end showcase

Use a **generic, non-branded mechanical explanation** that can be redistributed without third-party character IP. Example: *How a small gear drives a larger gear*. This is an illustrative acceptance fixture, not a fact/script claim or a requirement for the final artistic topic.

| Approx. segment | Story objective | Screen action and filmcraft test |
|---|---|---|
| 0–4 s | Establish location and question | Wide, readable physical gear assembly; two neutral actor rigs present; one actor directs attention to the small input gear. Stable main subject and temporary narration. |
| 4–10 s | Demonstrate input | Actor turns a connected handle with declared contact; small gear starts; camera tracks the hand-to-gear causal chain. Contact sound occurs at actual authored event, not at a random transition. |
| 10–16 s | Explain transfer | Real meshing teeth or explicitly schematic gear mechanism; macro viewpoint shows the large gear rotating more slowly; preserve the same gear IDs, axis and truthful direction/ratio. |
| 16–21 s | Show outcome and reaction | Second actor tracks/points to the output; a restrained gaze/gesture and optional measure label clarify speed/force tradeoff. Do not confuse angle with a false mechanism. |
| 21–27 s | Resolve / see the whole | Return to a clear shared composition. The entire system operates; resolve narration with a still reading hold. Minimal captions; optional sound tail. |

Use anonymous rigs/assets or a licensed asset manifest. If using stylized gear proportions or simplifying physics, declare this on screen or in the evidence manifest. The example requires 3D, multi-actor interaction, a continuity cut, narration-aligned cues, material/light treatment, and an intelligible payoff. Render 16:9 and 9:16 as **authored variants**, not a blind crop.

**Human acceptance questions:**

1. Can a viewer explain what input caused the output after one normal-speed watch?
2. Does the mechanism remain understandable with explanatory labels/captions hidden, while subtitles remain available for accessibility?
3. Is subject identity stable across close-up, reaction and overview?
4. Are the actors clearly directing attention, with believable eye-lines, contacts and visible reaction?
5. Is any motion, cut, lighting change, effect, or SFX present solely to make the video appear busy?
6. Does the same film work at phone scale, landscape scale, muted, with audio, and audio-only for timing review?

## 7. Engineering and release evidence

### Deterministic and structural checks (automated)

- Absolute-frame seek tests: compare frame N after sequential playback, reverse seek and random seeks; same subject/camera/actor/contact/visual state.
- Ratio and geometry: rational FPS and sample-domain timing; stable units, world-space identities, camera near/far safety, no accidental frame-edge reveals, screen bounds, no critical subject occlusion.
- Narrative contracts: each causal beat has declared input/action/output or intentional still proof; named subject is visible at declared narration/gesture events; all handoffs resolve without unlabeled identity swaps.
- Camera and contact: shot transitions preserve intended focus/geography, actor reach/attachment and footplant constraints where relevant; 2.5D off-axis constraints produce actionable errors.
- Rendering: no missing assets/fonts/rights, no stale frame caching, predictable output aspect, no nondeterministic third-party render timers; explicit fallback for unsupported acceleration.
- Accessibility: reduced motion, controlled visual flashes, captions, visual-only critical understanding, CJK/wrapping, long multilingual strings, safe margins, hearing- and motion-sensitive alternatives.

### Visual/editorial checks (rendered evidence)

- Critical frame gallery: before/after every cut, pose extremes, beginning/end of each action, contact, reveal, 3D close-up, and 16:9/9:16 layouts.
- Normal-speed MP4 with original narration/audio mix; muted playback; small phone-scale playback; audio-only timing check; inspect motion blur/edges/temporal glitches in adjacent frames.
- Compare reference **choreography, camera motive, light, materials, emotional pacing and visual density**, not copy another studio's art/branding/footage. Track source attribution and license separately.
- Human review: record approver, input/rig/asset/style revision hashes, verdict `accepted` / `needs-revision` / `not-reviewed`, timecodes, fixes, rerender proof. An AI critic may suggest issues, never approve.
- Performance: benchmark on user's M4/24 GB Apple Silicon target when available; preview at reduced resolution first, avoid simultaneously loading multiple GPU-heavy models, measure wall time/peak RSS/VRAM if accessible. Do not promise arbitrary FPS/render speed without measured runs. Use caching and only rerender changed segments where safe.
- Run applicable TypeScript, tests, catalog validation, Storybook checks, real frame review and clean registry-install smoke per AGENTS.md. Preserve test logs and exact commands. Unsupported native Blender/ComfyUI live testing is **blocked**, not passed.

### Stop conditions and non-goals

- Stop when actual imagery, models, dialogue alignment, rights, or environment capabilities are missing; report the exact dependency and best safe fallback.
- Do **not** introduce a new GSAP/Lenis/scroll timeline, global renderer, scene schema, independent authoring studio, or heavyweight dependency simply because a design skill suggests it.
- Do **not** require a universal 1/3 attention limit, a motion event every N seconds, 500 ms maximum stagger, perpetual animated backgrounds, always-on particles, fixed POV/180° axis, or one cinematic style across topics.
- Do **not** create hard quality gates from subjective "looks premium" scoring or from a few reference-video stillness/hook numbers.
- Do **not** claim physical accuracy, historical authenticity, 3D photorealism or premium readiness without source-backed art and actual human-reviewed footage.
- Do **not** conflate successful media encoding, static screenshot appearance and real cinematic craft.

## 8. Reference and provenance register

| Primary source | Relevant finding / application | Evidence type |
|---|---|---|
| [Disney Animation — Story](https://disneyanimation.com/process/story/) and [Layout](https://disneyanimation.com/process/layout/) | Storyboards, rough layout, camera/actor blocking and feedback before final animation | First-party production description |
| [Disney Animation — Animation](https://disneyanimation.com/process/animation/) and [Post Production](https://disneyanimation.com/process/post-production/) | Staging, anticipation/follow-through, character performance, integrated editorial/audio | First-party production description |
| [Pixar in a Box — Art of Storytelling](https://www.khanacademy.org/computing/pixar/storytelling) | Story spine/visual language, film grammar, storyreels and iterative feedback | Pixar/Khan first-party education |
| [Pixar — Incredibles 2 Cinematography](https://renderman.pixar.com/stories/incredible-cinematography) | Film-wide camera language, rough lighting/layout collaboration, focused direction | First-party artist interviews |
| [Pixar — Articulating the Appeal](https://graphics.pixar.com/library/ArticulatingAppeal/paper.pdf) | Character silhouette, facial/body expression, stylized readable form | Pixar technical paper |
| [ASC — Where Do You Put the Camera?](https://theasc.com/article/shot-craft-where-do-you-put-the-camera/) and [Analyzing a Script](https://theasc.com/article/shot-craft-analyzing-a-script/) | Camera POV, blocking, eyelines, geography, lens and motivated movement | Practitioner first-person craft guidance |
| [Smith — Attentional Theory of Cinematic Continuity](https://ualresearchonline.arts.ac.uk/id/eprint/21187/) | Viewer attention, action expectations and continuity editing | Original film-perception research |
| [Mayer — Coherence/Signaling/Contiguity](https://www.cambridge.org/core/books/abs/cambridge-handbook-of-multimedia-learning/principles-for-reducing-extraneous-processing-in-multimedia-learning-coherence-signaling-redundancy-spatial-contiguity-and-temporal-contiguity-principles/C98AB3A6CE760DD63C048936EA0B3B44) | Align relevant visuals, narration and labels; remove distracting extras | Original research synthesis |
| [Heer & Robertson — Animated Transitions](https://idl.uw.edu/papers/animated-transitions) | Staged transitions and identity preservation improve data perception in studied tasks | Peer-reviewed controlled studies |
| [Tversky et al. — Animation: Can It Facilitate?](https://doi.org/10.1006/ijhc.2002.1017) | Animation is not inherently superior to matched static explanation | Peer-reviewed original research |
| [LottieFiles motion-design-skill](https://github.com/LottieFiles/motion-design-skill) | Semantic purpose, attention hierarchy, personalities, coordinated entries, secondary action | First-party skill reference; heuristics, not laws |
| [Bang Motion](https://github.com/bangtutorial/bang-motion) | Anti-PowerPoint structure, persistent world, structural originality, real UI behavior | First-party skill reference; promotional-video bias |
| [Premium Animations](https://github.com/filipe-dev-macae/premium-animations) | Restraint, motion hierarchy, useful interaction, reduced motion and performance | First-party skill reference; interactive-website bias |
| [SaaS Product Demo Video](https://github.com/noamdorr/saas-product-demo-video) | Source-backed visual argument, reference-film teardown, timing grid, shot framing, cut continuity, product UI proof, evidence-based taste review and vertical composition | First-party skill reference; Remotion/music-led product-film bias |

**Research confidence:** Production descriptions establish workflows and craft vocabulary; peer-reviewed experiments support particular comprehension/perception claims in their tested settings. Neither proves that an arbitrary numeric motion rule or visual style will improve all Kumiki films. Use this research to propose verifiable features, then establish project-specific thresholds through the [26 benchmark](26-automated-content-quality-plan.md) and real human review.

## 9. Handoff to each coding agent

For the slice you select, report in the PR:

1. Source SHA, task slice, owning contracts read, existing registry IDs checked, and **what is actually missing**.
2. One or two explicit storyboard/semantic examples and the adapter/compiler changes, with a list of **existing systems reused**.
3. Any versioned schema migration, unknown-field handling, reduced-motion behavior, asset/right constraints, and deterministic-frame invariants.
4. Source/test paths, commands and outputs, real generated preview/review artifacts, performance measurements, and observed visual defects and fixes.
5. Human approval status and exact remaining work. Never say "production-quality" or "photorealistic" solely because a pipeline ran.

The highest-intelligence task is **the first real story-to-screen vertical slice**: prove a timed, understandable rough film; stage camera and two actors around a persistent 3D mechanism; compile it through FD1 using existing directors; render/review the actual narrated movie. Lower-intelligence agents can subsequently implement bounded adapter variants, deterministic reports and catalog documentation after this architecture and visual acceptance bar are proven.
