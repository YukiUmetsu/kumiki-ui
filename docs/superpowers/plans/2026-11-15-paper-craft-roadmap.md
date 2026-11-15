# Paper Craft Implementation Roadmap

**Goal:** Make reusable, reference-led paper craft capable of sustaining rich, editable animated films in both landscape and portrait.

**Architecture:** Extend the existing PAPER1 cut-stock renderer and Paper Director shot/film composition rather than creating a parallel renderer. Each milestone delivers one independently reviewable capability, with original artwork, deterministic frame evaluation, Storybook controls and FilmStage proof. Choose exact public interfaces only after the relevant source and construction study; record them in a focused implementation plan before coding.

**Tech stack:** TypeScript, React, SVG, Storybook, Vitest, Playwright and the existing FD1 film renderer.

**Authority:** [Paper Craft spec](../../component-specs/paper-craft.md), [visual pass log](../../35b-paper-craft-theatre-visual-pass-log.md), [material-native roadmap](../../35-material-native-film-styles-implementation-roadmap.md), and ArtCraft's current `SKILL.md`. This roadmap is a priority queue, not evidence that milestones have passed.

## Global gates

- Before new art, inspect current output and obtain authentic, rights-documented references. Record source images or permitted links, close crops, topology, edge and material observations, and a feature-to-construction matrix. Do not substitute text descriptions for image inspection. Follow applicable ArtCraft structure, five-axis and fidelity gates; record non-applicable axes and reasons.
- Construct original semantic contours and real apertures, coherent sheet attachment and layering; preserve meaningful fine cuts, edge character, stock texture and depth. Never use detail counts or noise as a proxy for fidelity.
- Test absolute-frame seeking, both aspect ratios, reduced motion, bounds and invalid input. Review actual full-size native frames and normal-speed motion, including transitions, against source-specific crops. Record defects and visual approval separately from automated results.
- Reuse the existing Paper Craft Storybook group and catalog pack. Verify public API, registry metadata and clean install when changed; run `npm run catalog:check` when registry metadata, semantic kinds or previews change. Record actual failures and do not treat tests as artistic approval.
- Make one focused PR at a time; verify the exact head, CI and all visual gates before merging. Preserve rights and do not redistribute source images without permission.

## Current baseline (2026-11-15)

PAPER1 supplies five media, cut layers, holes, shadows and deterministic motion; Paper Director supplies shot sequencing and parent-child hinged stock. Existing demos include botanical, objects, scenery and a royal story. These are implementation descriptions, not a blanket visual acceptance. See the spec and log for limits.

- [ ] **P0a — Finish [PR #346](https://github.com/YukiUmetsu/kumiki-ui/pull/346):** merged `main` into its branch at `3cf7d0ec`; focused checks and local typecheck passed, with fresh CI still running at planning time. Review exact-head frames 228, 234, 239, 240, 246 and 251 in both aspects and the normal-speed encoded edit. Inspect both faces, hinge, seam, opacity, and destination; also verify curtain and reduced-motion behavior. Fix and rerender defects, then merge only after CI and the recorded visual gate pass. Rigid leaf behavior does not establish flexible page curl.
- [ ] **P0b — Continue [PR #359](https://github.com/YukiUmetsu/kumiki-ui/pull/359):** the existing review explicitly rejects finished facial quality. Recheck its current head and avoid assuming the older green run applies. Obtain a rights-cleared source and exact hash, independently measured 18 landmarks and five value planes, matching actual render crops, ArtCraft v7 portrait gate and independent 1×/3× review. Address portrait crowding and attachment. Keep it open if the required evidence or artistic quality is missing; never promote realism on technical tests alone.

## Ordered milestones

### P1 — Qualify the existing paper film pipeline

- [ ] Audit existing Garden, Botanical, Kingfisher, Scenery and Director in actual 16:9/9:16 frames; include close-ups, dark/light contexts, all five media, reduced motion and shuffled frame seeks. Record named defects, source comparisons, exact output hashes and the top three root causes.
- [ ] Fix the highest-impact shared defect in a focused PR, then repeat the same captures and regression checks. Check `tests/paper-craft.test.tsx`, `tests/paper-director.test.tsx`, existing Storybook e2e tests, `npm run registry:validate`, `npm run typecheck` and the relevant `film:check`/native render commands. Record exact commands and results.
- [ ] Establish a reviewable native film with editorial continuity and a normal-speed viewing log. Exit only with no critical clipping, broken layer attachment, invisible subject, blank seam or rejected critical art region. Document remaining limitations and human review status.

### P2 — Articulated paper performance

- [ ] Study authentic paper-puppet construction and motion at joints, overlaps, silhouettes and contact; establish rights and document measured rest/pose landmarks and negative spaces. Select one original actor and one short action as the bounded proof.
- [ ] Specify reusable authoring and validation for the actual needed joint/contact behavior on top of `PaperCutLayer.parentId` and `PaperDirectorFilm`; avoid committing to IK or deformable meshes until the study demonstrates the need. Provide a focused implementation plan with exact types, file ownership and failing behavior tests.
- [ ] Implement the smallest reusable improvement, with joint attachment checks, extreme-pose crops, forward/backward seek tests, reduced motion, both aspects and an interactive Storybook example. Review normal-speed acting and preserve the actor's identity at every pose. Exit when critical attachments and source-specific silhouette comparisons pass, and visual approval is recorded.

### P3 — Physical paper mechanisms and material depth

- [ ] Study physical folded constructions, tabs, hinges, paper thickness, lighting and transmission using source close-ups and motion. Separate observed behavior from approximations; pick one bounded mechanism with a useful film application.
- [ ] Specify and implement that mechanism as a reusable composition over existing paper primitives, with deterministic geometry and explicit constraints. Test invalid configurations, hinge continuity, opacity/occlusion, reduced motion and both directions/aspects; inspect 1×/3× motion frames and stock edge shadows. Do not call a rigid leaf a flexible fold or claim physical simulation without evidence.

### P4 — Production authoring and reusable scene vocabulary

- [ ] Use P1–P3 findings to identify the most consequential missing authoring operation for multi-shot films. Search the installed catalog first and query exact exports before designing an API. Specify semantic controls, slots and validation with no consumer-specific assumptions.
- [ ] Deliver one operation with documented JSON/React examples, interactive controls, actionable validation, registry install smoke test, and a native two-aspect film demonstrating it alongside existing director features. Verify deterministic playback and that no text or subject is clipped.

### P5 — End-to-end qualification and next priorities

- [ ] Produce a reference-led multi-shot film that exercises the accepted actor, mechanism, materials and transitions. Capture production-sized frames, close-ups, and normal-speed encoded outputs in both aspects; review narrative continuity, motion, sound when used, and material fidelity. Fix critical defects and re-review changed shots.
- [ ] Run the applicable quality, registry, accessibility and clean-install gates; record exact head, commands, artifacts, rights, visual reviewers, failures and unresolved limitations. Update the component spec, Storybook and this queue based on measured gaps. Human artistic acceptance remains a separate gate.

## Review focus

1. Reverse and random frame seeks preserve every attachment and material state.
2. Portrait framing retains the subject and reading space throughout motion and cuts.
3. Reduced motion presents a complete composition, including at transition boundaries.
4. Invalid or excessive layer, timeline and rig inputs fail with actionable diagnostics.
5. Actual paper stays opaque and correctly ordered at a hinge, opening or page seam.

Each milestone owns the relevant regression and rendered proof. A source, visual, or rights blocker is recorded as open; it does not become a silent reduction in quality.

## P2 source lead (not a completed study)

[Auguste Edouart, *James Tooley* (1844)](https://www.metmuseum.org/art/collection/search/656554), cut-paper silhouette, is labeled Public Domain by The Met. The Met API returned the [original image](https://images.metmuseum.org/CRDImages/dp/original/DP-16322-001.jpg); downloaded bytes SHA-256 `98c1f530ef4f9e2b4f1c923cfc318c0d372fcbde8d1b1deaa65c7632197f6bb9`. Direct inspection shows a single readable profile with an angular hat brim, a narrow light opening between neck and collar, a forward-bent sleeve and a continuous hand silhouette resting on a cane, with curved interior lines suggesting fingers. Fine interior costume marks are much subtler than the outer silhouette. This is a useful source for studying silhouette, hand-to-prop contact and negative space; it does not show a moving joint or authorize claims about animation. The original image was inspected locally, not committed. Crops, measurements, further sources, motion study and the ArtCraft source/structure gates remain open.

A close crop of the original (`x=850, y=1450, width=640, height=760` in the 1955 × 4000 image) shows that the finger divisions are interior light marks, not independently separated cut fingers. The sleeve joins the hand in one dark mass and the cane begins beneath it. This corrects the earlier full-frame reading; no joint mechanics are visible.
