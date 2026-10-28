# Premium Scene Animation — Skeptical Code & Visual QA Review

**Scope:** Kumiki UI PR #45, 26 recipes, shared ST1 renderer, FS1 and PJ1, Storybook gallery, 26-video export pipeline. **Review method:** source/API/test inspection. **Not performed:** interactive browser screenshots, normal-speed footage review, listening to audio, and proof of physical 3D realism. This is not a visual signoff.

## Finding summary

**P1 — Real visual qualification remains absent.** Having a typed component and passing DOM tests does not prove that a rendered clip looks cinematic. The current GitHub PR has no verified full 26-scene video output artifact on its latest commits. Keep draft. Require source Storybook clips plus an annotated visual review of first, transformation, and last frames in both aspects. Verify at normal playback speed, not just screenshot poses.

**P1 — Source illustrations were misleadingly repetitive.** The initial Storybook fixture rendered the same mountain motif for almost every scene, concealing whether globe, book, UI, device, evidence and architectural scenes worked. Fixed in the branch with distinct original fixture motifs (house, network, UI, document, exploded parts, planet, character, craft, office). These SVGs remain QA art only, not premium stock footage.

**P1 — Editorial camera direction was reversed.** The original generic cinematic helper began zoomed in and pulled out during a claimed push-in. Fixed with frame-exact zoom **toward** the subject, a clamped camera translation to prevent blank edges, and regression assertions.

**P2 — Scene-specific visual quality gaps remain.** CSS transforms, 2.5D layering, and basic primitive drawings are useful fallbacks, not substitutes for realistic articulated character animation, 3D earth geometry, mesh cutaways, glass refraction, or curved-page simulation. The optional host renderer slots can integrate these with existing Kumiki renderers; they do not themselves implement those physical effects.

**P2 — User-content robustness is not browser-qualified.** 9:16, long paragraphs, CJK text, many timeline points, variable aspect-ratio imagery, reduced motion, region target registration and caption-safe areas must be tested using realistic authored content. Current tests check semantic state, DOM presence and basic geometry, but not visual desirability.

## Per-recipe source review and visual QA acceptance

| # | Recipe | Implementation inspected / current animation | Remaining QA or premium requirement |
|---:|---|---|---|
| 1 | `question-reveal` | Camera-led question hero and independently timed kinetic answer; optional answer visual | Verify first-frame hook, no answer overlap, readable answer in 9:16 |
| 2 | `hidden-detail` | Focus-directed dolly with scan beam and highlighted ROI | Confirm exact target alignment with real cropped images; no empty-edge exposure |
| 3 | `process-journey` | Reuses PJ1 graph route, DiagramStage and MG1 camera planning | Test smooth route handoffs, readable small nodes, non-occluded traveling subject |
| 4 | `before-after` | Synchronized two-state wipe with luminous scan edge | Source pairs require matching registration/framing; check crossing midpoint in clips |
| 5 | `side-by-side` | Paired directional dolly entrances and controlled criterion | Equal visual scale and fair crop are not yet validated for unrelated source sizes |
| 6 | `cause-effect` | Per-step staggered entrance and kinetic outcome | 5+ steps can crowd output; diagram-level paths would outperform tile chain |
| 7 | `scale-reveal` | Proportional bars and frame-addressed number count-up | Check actual shared scale, large ratios, precise units and readable tick/label timing |
| 8 | `context-to-detail` | Spatial camera dive, highlighted ROI and flying magnified inset | Target must be authored in the composed source viewport; test split reveal at 9:16 |
| 9 | `layered-cutaway` | New 2.5D extruded material slabs, shaded sidewalls, depth separation and readable callouts; optional **true Three.js** solid-layer assembly in Storybook | Real geometry is an illustrative original fixture, not a source-matched scanned cross-section; GPU frame and visual QA pending |
| 10 | `build-and-connect` | Staggered nodes and actual stroked path growth | Dense graphs, edge routing, label overlap and long links require browser QA |
| 11 | `transform-and-track` | Same semantic entity persists through front/back 3D flip | A card flip is not object morphing; validate with real transformable subject models |
| 12 | `time-evolution` | Time-specific image hero with moving frame-based playhead and caption | Some milestones lack assets; require visual holds and content-aware source transitions |
| 13 | `data-story` | Signed zero baseline, source text, absolute-frame bar growth and counters | Labels/units must remain honest; test negatives, tiny values and long descriptions |
| 14 | `consequence-chain` | Animated propagated connectors and staged impact nodes | Route collisions, impact count scaling and final outcome position need visual QA |
| 15 | `decision-branch` | Directional fan-out with depth/opacity and independent branch outcomes | This is a video diagram, not an interactive choice; verify conditions never overlap |
| 16 | `worked-example` | Staggered operation entry with emphasized result impact | Ensure each mathematical step has sufficient reading hold and source accuracy |
| 17 | `demonstration` | Optional authored image state per action, tracked cursor targets and focus ripple | Real action fidelity requires supplied screenshots/capture; no invented interactions |
| 18 | `guided-inspection` | Camera motion with all inspection ROIs in same transformed source coordinate system | Test visual registration and legibility at multiple zoom levels and portrait crop |
| 19 | `character-discovery` | Same original Cove rig now used in preview and video capture, driven by `CharacterPresenter` with jointed arms, head/expression, blinking and speech cues | Appearance and gesture timing must be human-reviewed; natural narration-aligned lip-sync still requires an audio/viseme performance director |
| 20 | `evidence-reveal` | Source image camera, ROI scan and timed source/excerpt entrance | Require context-preserving citation and source provenance before publication |
| 21 | `follow-subject-through-sections` | FS1 stable subject, parallax environments, whole-scene crossfade and custom rig slot | Verify foreground edges, subject continuity and non-repeating scene movement in MP4 |
| 22 | `environment-reveal` | Frame-addressed multi-plane background/alpha foreground camera, focus-tracked subject, soft haze and light shafts; 2.5D parallax controls | Real 3D cave fly-through and optical volumetrics still require native scene geometry; inspect asset alpha and portrait occlusions |
| 23 | `page-turn-story` | 2.5D folded-page fallback plus optional Three.js bending paper mesh (56×12 grid) with distinct front/back textures, real normals, book covers and frame-driven page turns | Curved mesh currently draws authored heading/text plus procedural ornament, but not the source image; GPU capture and visual QA pending |
| 24 | `orbit-world` | Shared orthographic projection now drives moving camera, Natural Earth 110m coastline strokes, graticule, clipped great-circle routes, markers and subject travel | Georeferenced 2.5D is now source-backed; physical 3D Earth mesh, terrain, atmospheric scattering and browser pixel QA still pending |
| 25 | `timeline-journey` | Chronological media, slow camera emphasis and continuous time playhead | Dates need proportional spacing where requested; verify text/image changes are smooth |
| 26 | `glass-data-reveal` | 2.5D backdrop-sampling panels now have controllable Fresnel edges and caustics; separate true 3D `MeshPhysicalMaterial` transmission demo and capture story | Browser QA and measured optical realism remain unverified; default core still uses CSS approximation |

## Earth geography and visual behavior (new code-review result)

Earlier the globe image and the projected markers moved in unrelated coordinate systems; a viewer could see a marker drifting over the wrong continent. This has been addressed by **a single camera projection** used by graticules, public-domain Natural Earth 110m coastline polylines, city markers and great-circle routes. All geometry is evaluated at the absolute composition frame, with a separate fixed-camera comparison mode and a reduced-motion fallback. Test cases now cover horizon clipping, random-access determinism, dateline crossing, antipodal routes, and coastline rotation.

**Limitations:** The Earth remains a stylized orthographic 2.5D composition rather than a real shader-driven 3D sphere; coastline outlines are simplified with 0.25° tolerance. The output is unsuitable for political borders or surveying. `globe.src` is no longer incorrectly projected as a rotating land texture in geographic mode. Verify these claims visually on exported normal-speed clips before premium QA signoff.

## Book-turn choreography follow-up

The first version turned a rigid planar sheet. The updated 2.5D composition adds a frame-dependent, pinched free edge and twelve staggered lighting strips that accentuate the fold at midturn. Clipping is applied to the front/back page faces rather than the 3D parent so `backface-visibility` and perspective can remain effective. Reduced motion avoids the fold animation. A focused regression test now checks changes in curl amount, presence of fold strips, preserved two-sided faces, and fallback behavior.

**Still unverified visually:** page-image alignment near the fold, actual perceived paper curvature, anti-aliasing of the tapered free edge, and normal-speed smoothness. A physically curved paper mesh would require a separate textured 3D renderer, not a claim that these CSS transforms provide full physical simulation.

## Second premium implementation pass (latest PR #45)

- **Code-level fix, character capture:** `character-discovery` no longer exports the static artwork while preview displays a puppet. Both paths render the same original Cove character through Kumiki CharacterPresenter. This new rig contains 11 separately addressable vector parts, expression changes, a right-arm question pose, talking variants, blinking and a resolving pointing gesture. Existing user-supplied Pip rig art remains outside the distributable capture workflow.
- **Code-level fix, cutaway:** The default no-GPU scene now builds dimensional slabs with explicitly rendered side depth and timed disassembly; the optional advanced `scene-cutaway-3d` showcases **actual solid Three.js meshes** under studio lights, with separately named/materialized parts and deterministic exploded poses.
- **Code-level fix, glass:** Default glass layers now sample the backdrop and include deterministic luminous rims and moving caustics. Optional `scene-glass-3d` uses genuine dielectric physical materials, transmission and per-pane frame-driven trajectories. This is demonstrably not the same technique as the CSS fallback.
- **Video export correctness:** Opted-in 3D HeroAssetViewer renders now publish the absolute frame only after drawing it, and VideoExportStage verifies the exact frame before allowing the capture handshake to resolve.
- **Tests newly authored, not executed:** Pure mesh/pose/optics regression tests, DOM visual-contract tests for cutaways/glass/Cove, GPU browser canvas screenshot tests, and the original-rig MP4 frame capture test.

**Do not mark these visually accepted yet.** No current-head CI or actual MP4 visual evidence has been observed in this environment. Device GPU, geometry legibility, glass transparency, book crop, line weight and normal-speed motion still require browser filmstrips and review.

## Third premium animation pass (latest)

**Physical book:** Added `registry/craft/paper-curl.ts`, a pure paper-vertex deformer, plus a GPU-optional hardback book preview/capture with a 56×12 subdivided, genuinely curved page. Separate front/back page materials and a fixed-spine hinge replace the rigid door-like flip in the optional 3D implementation. A deterministic 3D page test verifies geometry curves at mid-turn and produces the same vertices after nonsequential seeking. Source raster illustrations are not yet texture-mapped; this is a material/geometry showcase.

**Environment:** Replaced the previous zoom + disappearing opaque foreground with a genuine alpha-composited, two-plane scene camera. Depth is calculated in `registry/video/environment-parallax.ts`; an authored world anchor drives the focal subject, and soft haze, light rays and seeded motes provide controlled atmosphere without introducing an implicit clock. Reduced motion avoids particle/light motion. Corrected the Storybook foreground fixture to contain an alpha channel. Custom foreground strength, haze and light rays are validated. Pure geometry and rendered DOM tests were added.

**Verification remains open:** No full repository clone, typecheck, Vitest suite or normal-speed MP4 capture completed in this runtime; the optional Three.js book must be visually inspected at middle curl, book spine, backface reversal, beginning/end holds, and reduced-motion cuts. The environment must be reviewed for occlusion, artifact-free edges, 9:16 safe areas and title/hero placement.

## Verification matrix

| Gate | Status | Evidence required |
|---|---|---|
| Source code inventory | Reviewed | 24 ST1 recipe wrappers, shared ST1 viewer/contracts, FS1 and PJ1 |
| Stateful/deterministic animation logic | Source-reviewed, newly changed | Execute all 26 focused render tests and updated motion tests |
| TypeScript and isolated registry installation | **Not rerun on latest head** | Typecheck, unit test suite, catalog parity, clean consumer fixture |
| Storybook browser QA | **Not verified** | Screenshots or filmstrips at frame 0, focus, reveal, resolve for 16:9 and 9:16 |
| Real component MP4s | **Not verified** | 26 scene clips and chaptered review reel, inspected at normal speed |
| Accessibility | **Not verified visually** | Reduced-motion alternative, contrast, readable CJK/long titles, safe areas |
| Premium visual quality | **Not approved** | Human clip-level acceptance of motion smoothness, coherent art direction, no overlaps |
| Third-party assets | Not included in sample art | Validate licenses and attribution per production asset before distribution |

## Priority follow-through

1. Run a complete source consumer/CI pass; fix any new JSX/TypeScript or test regressions.
2. Render the actual 26 scene clips (not mock re-creations), review first/transition/final frames and 9:16 crops.
3. For high-end camera/3D cases (`layered-cutaway`, `environment-reveal`, `page-turn-story`, `orbit-world`, `glass-data-reveal`) connect native Kumiki 3D/camera implementations or preserve explicit 2.5D labeling; do not pretend CSS simulates glass, geography or mesh physics.
4. Integrate real Pip/Quill-style animated rigs into `character-discovery` and follow-subject examples, including eyes, beak/mouth, shoulders and feet actions.
5. Replace QA vector illustrations with verified source-specific licensed production assets as necessary. Maintain reproducible generated fixtures for CI.

**Merge guidance:** Keep PR #45 in draft until all listed verifications have actual passing evidence and the video clips have been visually inspected.
