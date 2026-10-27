# Component: Character Presenter (2D sprite and 2.5D layered characters)

**Status:** Implementing; P0 slice landed, human review pending, registry install smoke test not run  
**Catalog phase:** specialized (media / character playback)  
**Why shared:** one portable definition and one pure evaluator let the same character perform in explainers, lessons, games and overlays, with identical semantics in preview and export. Source contract: [2026-10-26 2D character performance brief](../superpowers/specs/2026-10-26-2d-character-performance-design.md); canonical semantics: [docs/10](../10-character-audio.md) and [docs/11](../11-rendering-quality.md).

## Files

| File | Owns |
|---|---|
| `registry/character/definition.ts` | Data contract: definition, instance, cues, diagnostics, frame state. No functions, no URLs. |
| `registry/character/evaluate.ts` | Pure `evaluateCharacter(definition, instance, cues, frame)`, `partLocalMatrix`, `partAssetKey`, `resolveCharacterAppearance`. |
| `registry/character/validate.ts` | `validateCharacterDefinition` (load-time) and `assertCharacterDefinitionValid`. |
| `registry/character/character-presenter-react.tsx` | `CharacterPresenter`: draws one evaluated frame as nested SVG. |
| `src/character/fixtures/doctor-quill.ts`, `pip.ts` (+ `doctor-quill-assets/`, `pip-assets-v1-6/`) | Storybook raster rigs from user-supplied PNG drawings. Pip uses the registered v1.6 rig. **Not** part of the installable registry. |
| `scripts/assemble-pip-v1-6-assets.mjs` | Reproducible import of the complete v1.6 ZIP. Registers all ten forepaws to shared pivots, preserves the 25 separate transparent mouth overlays. Requires ImageMagick for regeneration, not at runtime. |
| `src/character/character-presenter.stories.tsx` | Storybook review stories, title **Visual / Character Presenter**. |
| `src/character/character-presenter-demo.ts` | Pure Storybook cue timelines, 25-stage beak sweep and deterministic frontal perspective approach. Not registry code. |

Registry items: `character-performance` (definition, evaluator, validator; depends on `motion-track` for matrix, easing and types) and `character-presenter` (depends on `character-performance`).

## Contract

- **Use / not use:** use for layered sprite or 2.5D puppets that act, speak and look at targets. Not for full skeletal 3D, general animation editing, speech generation, or auto-rigging from a flat image.
- **Public API:** `CharacterPresenter` props `definition`, `instance`, `cues`, `frame` (absolute frame; the presenter owns no clock), `label` (required), `assetUrls?`, `reducedMotion?: boolean | "auto"`, `onDiagnostics?`, plus div props and a forwarded ref. `evaluateCharacter` is usable without React.
- **Determinism:** the evaluator keeps no state. Blink schedules and idle phase are derived from `instance.seed`; takeovers are derived from the cue list. Shuffled seeks equal linear playback.
- **Channels and blending:** base pose → idle (additive) → actions → expression → parallax → gaze → mouth and blink variants → limits. Override actions only write parts in their own channel (a mismatch is an error diagnostic, not a silent write). Additive actions sum. Each action declares `takeover`: `finish` queues, `blend-out` fades the running action, `cut` drops it. A lower-priority action cannot take over a higher-priority running action (warning).
- **Phases:** a phase's `pose` lists complete targets; parts an action drives but omits return to rest. A phase may also set `variants` (drawing swaps for parts in the action's channel). Swaps apply while the action's weight is above 0.5 (override) or for the whole phase (additive). Swaps are hard cuts at phase boundaries.
- **Speech:** Doctor Quill switches to a clean beakless face during speech and animates a separately registered 25-stage beak. Pip v1.6 keeps its head, eyes and chin fixed and animates a separate 25-stage mouth overlay (7 major positions, 18 in-betweens). Exact phoneme timings require supplied cues; approximate speech does not claim audio alignment. Silence closes the mouth.
- **Gaze:** pupil parts translate toward an anchor or runtime target, eased in and out. A missing target is a warning and the eyes rest. Raster rigs paint the pupils into each face, so they have no gaze.
- **Customization:** bounded `params` (clamped, out-of-declared-names ignored with warning), palette and asset `skins`, and anchors that follow parts (prop attachment). Image assets use logical references resolved by the host; the presenter never fetches.
- **Safety:** path data uses a strict SVG path alphabet; colors are hex or `$palette` references; the presenter never uses `innerHTML`. Invalid frames and cues produce diagnostics and are skipped.
- **Accessibility:** the root is `role="img"` with the required `label`; the SVG is `aria-hidden`.
- **Reduced motion:** `reducedMotion` (or `auto`, which follows `prefers-reduced-motion`) suppresses idle and blink. Action and expression poses still apply.
- **Dependencies:** none beyond React and existing `motion-track` helpers. No WebGL, WASM or vendor runtime.
- **Limits:** see *Known gaps*.

## Acceptance evidence

- [x] Typecheck clean for `registry/character`, `src/character` (`node node_modules/typescript/bin/tsc --noEmit -p tsconfig.json`).
- [x] Scratch evaluator checks outside the repo (not committed, per the no-new-suites preference): shuffled seek equals linear playback; arm action at rest, lifted, mid-recover and back at rest; channel mismatch and unknown action diagnosed; viseme drives the mouth; mouth returns to rest; blink opens and closes; anchors present. Final run: all passed.
- [x] Validator negative cases: wrong-channel write, undefined palette, unknown part, and a missing mouth variant are reported.
- [x] Both raster fixtures validate with zero errors and zero warnings (`validateCharacterDefinition`), re-run after the phase-variant change.
- [x] Storybook: five stories indexed and rendered with no page errors at 1280px and 360px, with the raster owl and squirrel. I reviewed the screenshots. Found and fixed: a spurious `unknown-viseme` diagnostic from the cross-fade lookup, unreadable note text on dark panels, an expression mouth that a silent speech step overwrote, and stale captions.
- [ ] Human visual review of the owl and squirrel at natural speed (required before any "approved" status).
- [ ] Accessibility: axe run and screen-reader check on the story page.
- [ ] Clean registry install smoke test (`character-performance`, `character-presenter`).
- [ ] Performance: render time, memory and frame stability on desktop and mobile fixtures.
- [ ] P1 acceptance: a 30–45 s original two-character performance with speech, gesture, walk or point, prop focus, and preview/export parity at keyed and random frames. Not started.

**Links to evidence:** Storybook ids `visual-character-presenter--two-independent-performers`, `--lip-sync-precision`, `--skins-and-bounded-params`, `--diagnostics`, `--reduced-motion-comparison`.

### Updated Storybook motion review (October 27, 2026)

- **Animated preview:** Quill speaks, walks toward the viewer, points and nods. Pip walks toward the viewer, speaks, raises one paw in a question gesture and cheers. The `walk` and `bob` rigs run matched 24-frame cycles. Storybook adds scale-only depth progress, since these front-view rigs cannot believably travel sideways.
- **Animation inspector:** each character's named gestures are separately selectable, playable, pausable and scrub-able. The lip-sync comparison sweeps both Quill's 25 beak frames and Pip's 25 independent mouth frames, then returns to closed at two frames per stage. This is an alignment test, **not** recorded phoneme sync.
- **Automated evidence:** `tests/character-presenter-demo.test.ts` verifies registered stages, deterministic seek, matched walking clips, per-arm question pose and bounded depth motion. `tests/character-presenter-render.test.ts` renders real presenter SVG frames with the bundled art, checking that no image layers are missing. Set `CHARACTER_QA_DIR` to write SVG frames for offline visual inspection.
- **Pip v1.6 assets:** the rebuilt complete ZIP includes squirrel forepaws and lowered shoulders, a sleeveless torso, the tail-base relocation of +120 logical px, the corrected satchel strap and isolated mouth overlays. The demo now uses those images, not the old pre-rig fixture. The generated arm variants have common transparent frames, maintaining shoulder registration during swaps.
- **Limits:** the perspective approach is a Storybook presentation cue, not planted-foot IK. Pip's arms remain one-piece pose sprites and each leg is rigid; fully realistic elbow/ankle articulation is unavailable. Normal-speed browser playback still requires human review.

## Known gaps

1. **Z-order** is global only among siblings, because parts are nested SVG groups. A child cannot draw above a parent's sibling. Flattening to world matrices would fix this.
2. **Unknown palette keys** render with no fill in the presenter. The validator rejects them, so this only occurs when validation is skipped.
3. **Missing image URLs** draw nothing and raise a `missing-asset-url` warning.
4. **P1 not complete:** multi-view sets (front, three-quarter, side), depth masks and occlusion, and mesh deformation are not implemented. Depth parallax is a bounded translation only.
5. **Gaze** offsets are applied in the pupil's parent space and measured against rest-pose pivots; they are accurate for flat rigs.
6. **Fixture art** comes from user-supplied images whose licence the owner must confirm before distribution. Fixtures stay out of the registry.
7. **Turnaround views** (front, three-quarter, side) are supplied as sheets but not yet modelled. Multi-view sets need a `views` contract, which is the next P1 item.
8. **Fixed-size alternatives:** Pip v1.6 speech animates only the registered mouth plate while head art stays fixed. Quill's expression faces replace the whole head, but speech uses the registered beakless head and a separately animated beak without changing the head's size. Pip v1.6 no longer offers the old full-face mood variants; mood cues subtly tilt the head instead.
9. **Props:** the supplied sheets have no magnifier or book, so the rigs have no held props. The `held-object` anchor follows a part, not a drawing.
