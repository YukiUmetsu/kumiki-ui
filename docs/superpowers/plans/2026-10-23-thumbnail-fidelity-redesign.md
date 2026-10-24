# Editorial Thumbnail Fidelity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn three House Math cinematic thumbnail references into editable, source-backed Storybook outputs using reusable Kumiki editorial controls.

**Architecture:** Add an opt-in `full-bleed` mode to the existing `composeEditorialThumbnail` compiler, with caller-authored normalized text frames and appearance. New demo fixtures use text-free image assets, with editable `MediaDocument` text and accents. Existing modes and exports retain their behavior.

**Tech Stack:** React, TypeScript, Storybook, Vitest, existing M0 document and SVG/PNG exporter.

**Spec:** `docs/superpowers/specs/2026-10-23-thumbnail-fidelity-redesign.md`

## Global Constraints

- Preserve existing editor layouts and exported M0 semantics; no runtime AI or new npm packages.
- Public composer APIs are domain-neutral; House Math wording is fixture-only.
- Outputs are 1280×720; all headline text remains editable; preserve image provenance and rights.
- Do not certify aesthetics with only automated QA. Human visual review at full and 320px is required.

## Review Focus

- A normalized text frame that leaks beyond the artboard must be rejected with an actionable diagnostic.
- Non-finite or negative typography sizing and tracking must be rejected rather than producing invalid SVG.
- Existing three layouts must remain byte-stable when new optional fields are omitted.
- CJK text must preserve characters in an editable text span.
- Same asset ID across full-bleed base and props must be rejected as duplicate.

---

### Task 1: Full-bleed editorial authoring control

**Files:**
- Modify: `registry/media/thumbnail-art-direction.ts`
- Test: `tests/thumbnail-art-direction.test.ts`

**Interfaces:**
- Extend `EditorialThumbnailInput.layout` with `"full-bleed"`.
- Add `EditorialTextPlacement` with `frame: Rect` (normalized), optional `fontSize`, `minFontSize`, `letterSpacing`, `lineHeight`, `align`, and `shadow` (M0 drop-shadow).
- Extend `EditorialHeadlineLine` with `placement?: EditorialTextPlacement`; add `cuePlacement?: EditorialTextPlacement`.
- Full-bleed mode treats `primary` as the 1280×720 `cover` image with semantic subject role; explicit line placements create editable text layers.

- [ ] **Step 1: Write failing tests** for full-bleed cover geometry, caller frames/styles, cue placement, all five review-focus cases, and unchanged legacy serialization.
- [ ] **Step 2: RED verification.** Run `npx vitest run tests/thumbnail-art-direction.test.ts`; expected failures for new API/behavior.
- [ ] **Step 3: Implement validated full-bleed authoring** in the existing composer without changing default paths.
- [ ] **Step 4: GREEN verification.** Run the same test file, then `npm run typecheck`.
- [ ] **Step 5: Commit** `feat: support full-bleed editorial thumbnail typography`.

### Task 2: Storybook reference-quality fixtures

**Files:**
- Create: `src/media/thumbnail-examples/*-scene.png` (three text-free imagegen scenes)
- Modify: `src/media/thumbnail-editorial-fixtures.ts`
- Modify: `src/media/thumbnail-examples/ASSETS.md`
- Test: `tests/thumbnail-editorial-showcase.test.ts`

**Interfaces:** Use `composeEditorialThumbnail` full-bleed input from Task 1; reuse existing `ExportPreview` and story IDs.

- [ ] **Step 1: Write failing tests** that each House Math demo uses full-bleed primary, distinct photographic source, editable multiple text layers and no flattened reference thumbnail as media.
- [ ] **Step 2: RED verification.** Run `npx vitest run tests/thumbnail-editorial-showcase.test.ts`; expected fixture mismatch.
- [ ] **Step 3: Author text-free source assets** from approved visual references with a documented generated-asset provenance; move final assets into `src/media/thumbnail-examples/`.
- [ ] **Step 4: Rebuild fixtures** for cost, HVAC, and rent/buy with deliberate text frames and independent editable graphics.
- [ ] **Step 5: GREEN verification.** Run the same test, `npm run typecheck`, and `npm run build`.
- [ ] **Step 6: Commit** `feat: art-direct House Math editorial thumbnails`.

### Task 3: Export verification and handoff

**Files:**
- Modify: `docs/component-specs/thumbnail-composition.md`
- Create: `docs/verification/2026-10-23-thumbnail-fidelity.md`

**Interfaces:** Uses the Storybook story IDs and standard `ExportPreview` download/export path.

- [ ] **Step 1: Run** `npm test`, `npm run typecheck`, `npm run build`, `npm run catalog:check` if metadata changed.
- [ ] **Step 2: Render and inspect** all three Storybook examples and browser PNG exports; compare against reference at 1280 and 320 px; record exact visual issues and iterate until acceptable.
- [ ] **Step 3: Document** limits, visual review, and original source attribution. Do not claim visual approval if only unit tests ran.
- [ ] **Step 4: Commit** verification and documentation, then open one PR.
