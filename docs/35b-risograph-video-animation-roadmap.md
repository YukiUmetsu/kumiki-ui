# 35B — Risograph film production: reusable animation expansion

**2026-11-14.** Complement to [Roadmap 35](35-material-native-film-styles-implementation-roadmap.md). This is a **Risograph/printmaking** video roadmap, not a Chinese ink or watercolor pipeline. A complete style means art direction, multiple moving actors, changing environments, editorial motion, film staging and authentic print behavior, not just a colored halftone overlay.

## Reference evidence and aesthetic goals

See [Risograph film research matrix](research/riso-animation-performance-2026.md) for film/process examples by Hiromu Oka, Dominica Harrison, Yiqin Ma, Jen Schier, John Kitses, Mette Virala, and others.

We separate **verified production descriptions** and available visual reference images from decoded frame-by-frame observation: remote third-party Vimeo/YouTube stream decoding was not available. No reference footage, characters, fonts or story artwork may be copied into the repository.

## Status and dependencies

| Layer | Current implementation | Exit gate |
| --- | --- | --- |
| RISO1 — Spot-ink printing | Merged PRs [#151](https://github.com/YukiUmetsu/kumiki-ui/pull/151), [#152](https://github.com/YukiUmetsu/kumiki-ui/pull/152). Separate authored spot plates, multiply overprint, halftone, fixed paper, per-plate passes, sheet-feed and ink-overprint scene transitions | Real multi-ratio normal-speed optical craft review and higher-resolution dot/registration audit |
| RISC1 — Printed character staging | [PR #165](https://github.com/YukiUmetsu/kumiki-ui/pull/165). Strict reusable hierarchical actor rigs and validation; original courier, bird, fox and moth; eyes/mouth pose swaps; cel cadence; multiple actors, scenery and camera; both orientations; browser/encoded FilmStage proof | Technical and visual proof inspected before merge; roadmap continues below |
| RISC2 — Motion craft | **Next.** Authored animation clips for walk/run/turn/bow/reach/swim/fly/speak, normalized action cues, transition blending, IK leg/hand targets, planted feet and contacts, limb curvature and overlap, inter-actor/prop constraints | Film with legible grounded locomotion, no sliding feet, collision/shoulder pops or disconnected joints |
| RISC3 — Acting and dialogue | Phoneme/viseme tracks from time-coded audio (same film audio clock), gaze and eyelid choreography, expression layering, true front/profile/3-quarter shape keys, accent poses, secondary cloth/hair and individual pose-edit UI | Two characters speak, blink and gesture simultaneously with pinned identity; reliable waveform/viseme seek |
| RISOMAT2 — Real print surface | Paper-stock profiles, dot gain from ink density, ink starvation, screen moiré analysis, roller/feed effects, scanning bleed/buckling, print-stock registration, scan/photogrammetry references (all deterministic and license-safe) | Distinct physical print behavior at 100% and 200% crop; controlled sheet/stock variation without random frame crawl |
| RISOMAT3 — Input media | Separate source image/movie into 2–4 real spot-ink plates, validate color selection, print simulation and rights/provenance. Support original 2D, Blender and video-source material without replacing their semantic animation | A reusable original source shot converts to independently inspectable plates and retains readable silhouettes/eyeline |
| RISOFILM2 — Multi-shot scenes | Composable stage nodes/actor clips and layered environment presets; film grammar for establish→character intent→action→consequence→payoff; parallax/props, print-native morph transitions and meaningful typographic motion | 30–60 second two-subject original shorts with different pacing and camera direction, one scriptable film document |
| RISOFILM3 — Editing/audio | Scene-level music/foley/print-press sync, performance cue-to-audio alignment, captions/safe areas, multilingual typography, camera continuity and cut planning; no new jobs or clocks | True 16:9/9:16 exports with mastered sound; fixed typography and readable animation at device size |
| RISOPROD — Quality/performance | Bake/cache spot plates and actor geometry, handle worker failures, measure per-frame render cost and output reproducibility, implement high-resolution export and accessibility/reduced motion | Stable 1080p normal playback and evaluated 4K export within explicit resource budget; multi-frame seek equality |

## Media-native animation vocabulary

Reusable primitives must each have a semantic purpose, an authored frame contract, and real separate spot-ink layers:

1. **Character actions**: perform walk/flight/talk/gaze, prop pickup/transfer, hand–hand communication, emotion and pose metamorphosis, carried contour and screened fill.
2. **Scenery**: separate poster/world layers, hand-drawn foliage and architectural shapes, paper-depth, orbit/pan/scale, foreground occlusion, negative-space staging and stylized grain.
3. **Print transformations**: plate-by-plate reveal, dot saturation and dot gain, ink starvation, print registration kick, page/stock feed, localized emboss/overprint, plate knockout, print-sheet wipe and cut-paper metamorphosis.
4. **Typographic film**: stamped title architecture, letter-by-letter plate printing, text as a moving character prop, screen-tracked annotations, 16:9 and portrait readable copy zones, CJK fallback fonts with explicit rights.
5. **Cross-medium source**: vector, scans, original sprites, depth-aware/3D media and source video to independent plate channels; no fake "whole-screen halftone" as a substitute for authored plate separation.

## Next actionable PR plan

**PR RISC2.1 — expression/action timeline foundation:** independent `ActionClip` and contact/prop tracks, blendable gestures, production-safe local-frame sampling, explicit path-specific validation, Storybook playback/seek, original walk/wave/fly and simple dialog film. Include bad-input tests and frame-accurate camera tracking.

**PR RISC2.2 — IK and grounded locomotion:** 2-bone limb solver, planted sole anchors, root-motion compensation, head stabilization and constrained interactions. Visual gate: feet do not slide; rear/front joints do not pop; pivot range bounded.

**PR RISOMAT2.1 — print/scan realism:** inspect real printed sheet crop references from permitted sources; calibrate paper/halftone/ink-starvation parameter profiles, distinct static-sheet vs per-frame print wear policies and deterministic repeatability.

**PR RISOFILM2.1 — long-form authored story:** at least two unrelated 30–60s shorts with distinct characters/action/scene transformations; original licensed audio and narration from existing systems, plot beats rather than a repeating poster.

## Quality gates that can block merge

- **Source fidelity**: recognize real ink/stock/grain behavior without digital pattern crawling, obvious moiré, oversized flat vector bands or framewise random print noise.
- **Character fidelity**: independent body parts connected, poses and silhouettes readable at thumbnail scale, grounded contact, expressive face and eyeline, reliable front/side redraw.
- **Film correctness**: exact forward/reverse/shuffled seek, no duplicate clocks, no unbounded animation state, independent aspect-composed layouts, reduced-motion behavior.
- **Consumer reliability**: `typecheck`, targeted tests, `registry:validate`, clean registry fixture install, Storybook Chromium captures, two genuine encoded MP4 exports, review of source and generated artwork.
- **Honest qualification**: the first rig PR may be technically mergeable while full feature-film performance is still not achieved. Label *engine foundation* and *artistic acceptance* independently. Do not use passing CI as a substitute for normal-speed artistic comparison.

**Code review:** use the installed senior-code-reviewer skill in Review & Fix mode, inspect all changed files, verify validation boundaries, negative tests, graph/depth/cycle checks, resource growth, and reuse existing FilmStage timing.
