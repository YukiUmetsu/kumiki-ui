# Reusable Thumbnail Compositions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship five deterministic, editable thumbnail recipes, opt-in objective QA, and a lightweight bridge from existing 3D hero capture to the media image document.

**Architecture:** Use `registry/media/document.ts` (`MediaDocument`) and `registry/media/svg-export.ts` as the only still schema and renderer. A pure recipe compiler produces a document and semantic layer IDs, a pure preflight reports geometry and legibility risks alongside existing export diagnostics, and a separate browser-only hero-capture helper produces a self-contained `ImageAsset` without Three.js in the 2D core.

**Tech Stack:** TypeScript, existing MediaDocument/SVG/PNG export, React Storybook showcase, Vitest, optional browser canvas/Playwright. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-23-thumbnail-compositions-design.md`

## Global Constraints

- Reuse `MediaDocument`, `ExportPreview`, existing M0 layers, `preflightExport` and the already implemented `hero:capture` CLI.
- No industry/channel specifics, new 3D objects, new media document format, external network fetches, new rendering engine, LLM/image recognition QA, or required `three` import in the 2D core.
- Preserve editable text, stable IDs, deterministic serialisation, source asset rights and explicit failure diagnostics. Use 16:9 as default; do not stretch different aspects.
- Keep analytics and competitive research in ContentGen, not Kumiki. Manual visual acceptance remains necessary.

## Review Focus

1. **Long/CJK headline:** Test that it is preserved and export preflight reports overflow, rather than silently truncating it (Task 1/2).
2. **No/duplicate assets and invalid canvas:** Test explicit errors and no implicit fetch/fabricated fallback (Task 1).
3. **Secondary required only for comparison/before-after:** Test missing-secondary and valid-single-subject variants (Task 1).
4. **Deliberate vs accidental overlaps:** Test that protected content overlaps warn while declared intentional layering is allowed (Task 2).
5. **Zero-size/tainted canvas in hero capture:** Test descriptive failure and user-provided metadata/rights preservation (Task 3).

---

### Task 1: Thumbnail Composition Recipe Compiler

**Files:**
- Create: `registry/media/thumbnail-composition.ts`
- Test: `tests/thumbnail-composition.test.ts`

**Interfaces:**
- Consumes: `createDocument`, `createArtboard`, `MediaDocument`, `MediaLayer`, `TextLayer`, `FontAsset`, `ImageAsset`, `Diagnostic`, `validateDocument`, `serializeDocument` from `./document`.
- Produces: `ThumbnailRecipeId = "hero-fact" | "comparison" | "hidden-mechanism" | "before-after" | "scale-surprise"`; `ThumbnailCompositionInput` with `id`, `recipe`, `primary: ImageAsset`, optional `secondary: ImageAsset`, `headline: string`, optional `cue: string`, `font: FontAsset`, optional `size: Size`, optional palette and normalized focal points; `ThumbnailCompositionResult { document: MediaDocument; roles: { primaryId; headlineId; secondaryId?; cueId? } }`; `composeThumbnail(input): ThumbnailCompositionResult`, `ThumbnailCompositionError { diagnostics: Diagnostic[] }`.

- [ ] **Step 1: Write failing tests** for five distinct layout geometries, editable media/text IDs, deterministic serialization, missing secondary, empty/long CJK headline, invalid 16:9 dimensions, missing asset metadata and duplicate asset IDs. Assert generated docs are `validateDocument`-clean for valid inputs and claims remain unaltered.
- [ ] **Step 2: Verify RED** using `npx vitest run tests/thumbnail-composition.test.ts`; expect module/function missing.
- [ ] **Step 3: Implement compiler** with explicit semantic slot allocation per recipe, modest neutral palette, configurable color/focal point, stable layer IDs, finite bounds and `createDocument` canonical document construction. Throw typed error with stable codes for invalid inputs. Do not generate or invent facts.
- [ ] **Step 4: Verify GREEN** with `npx vitest run tests/thumbnail-composition.test.ts` and run `npm run typecheck`.
- [ ] **Step 5: Commit** `registry/media/thumbnail-composition.ts` and test file.

### Task 2: Deterministic Thumbnail Preflight

**Files:**
- Create: `registry/media/thumbnail-preflight.ts`
- Test: `tests/thumbnail-preflight.test.ts`

**Interfaces:**
- Consumes: Task 1's `ThumbnailCompositionResult`, `MediaDocument`, `Diagnostic`, `layerBounds`, `rectsIntersect` and `preflightExport`.
- Produces: `ThumbnailPreflightOptions` (inspection widths default `[320,160,96]`, configurable bottom-right reserved region, critical-layer/intentional-overlap IDs, minimum area/text thresholds); `inspectThumbnail(result, options?): Diagnostic[]`. Passes through `preflightExport` diagnostics.

- [ ] **Step 1: Write failing tests** for too-small primary subject, out-of-bounds subject, essential headline in reserved corner, unsafe text/subject overlap, declared safe overlap, excessive essential elements, tiny text at 160 px and CJK/missing-font feedback. Existing export errors must remain visible; no false CTR/aesthetic score.
- [ ] **Step 2: Verify RED** using `npx vitest run tests/thumbnail-preflight.test.ts`; expect module/function missing.
- [ ] **Step 3: Implement inspector** with objective threshold-based geometry and explicit semantic roles; allow protected region overrides/intentional overlap exemptions; include stable per-layer codes, use existing `preflightExport`. Report measurement uncertainty rather than pixel-based inference.
- [ ] **Step 4: Verify GREEN** with `npx vitest run tests/thumbnail-preflight.test.ts` and run `npm run typecheck`.
- [ ] **Step 5: Commit** new preflight source and tests.

### Task 3: Optional 3D Hero Still Bridge

**Files:**
- Create: `registry/craft/hero-still-bridge.ts`
- Test: `tests/hero-still-bridge.test.ts`

**Interfaces:**
- Consumes: `HTMLCanvasElement` produced by existing `HeroAssetViewer` and `ImageAsset` type from `../media/document`. Does not import Three.js or any renderer runtime.
- Produces: `captureHeroStill(canvas, { id, alt, licenseId?, attribution? }): ImageAsset` using a PNG data URI, with validated canvas dimensions, descriptive errors for empty/tainted capture and preserved metadata. Existing CLI `npm run hero:capture` remains the alternative for Storybook/batch captures.

- [ ] **Step 1: Write failing tests** for a valid captured PNG asset, zero-sized/empty data, `SecurityError`, exact rights/alt metadata and no default invented license.
- [ ] **Step 2: Verify RED** using `npx vitest run tests/hero-still-bridge.test.ts`; expect module/function missing.
- [ ] **Step 3: Implement browser-only adapter** using `canvas.toDataURL('image/png')` with explicit failure handling and no additional dependencies.
- [ ] **Step 4: Verify GREEN** with `npx vitest run tests/hero-still-bridge.test.ts` and `npm run typecheck`.
- [ ] **Step 5: Commit** source and tests.

### Task 4: Registry, Showcase, Integration and Documentation

**Files:**
- Modify: `registry.json`
- Create: `src/media/thumbnail-composition.stories.tsx`, `src/media/thumbnail-fixtures.ts`, `docs/component-specs/thumbnail-composition.md`
- Modify: `docs/INDEX.md` and a short note in `docs/07-media-foundation.md`
- Test: `tests/thumbnail-registry.test.ts`

**Interfaces:**
- Consumes: Tasks 1–3 APIs, `ExportPreview`, existing `gradientDataUri` fixture, existing house/finance demo assets when licensed and verified.
- Produces: independently installable `thumbnail-composition` and `thumbnail-preflight` registry entries plus optional `hero-still-bridge`; five neutral stories/fixtures and three educational showcase scenarios; the already-working SVG/PNG exporter remains the only export.

- [ ] **Step 1: Write failing registry/integration test** asserting the three registry items exist, install paths/deps are correct, fixtures produce serializable docs and the generated SVG uses the media exporter.
- [ ] **Step 2: Verify RED** using `npx vitest run tests/thumbnail-registry.test.ts`; expect missing entries/fixtures.
- [ ] **Step 3: Implement registry and showcase**, with `ExportPreview` at 320/160/96 px and diagnostics shown outside the exported image. Add five distinct neutral recipe previews and three accurate educational examples; include only rights-cleared imagery, otherwise explicitly label demonstration placeholders. Document API, content responsibilities and limitations.
- [ ] **Step 4: Verify GREEN** using `npx vitest run tests/thumbnail-registry.test.ts`, `npm run registry:validate`, `npm run registry:smoke`, `npm run catalog:check`, `npm run typecheck`.
- [ ] **Step 5: Commit** registry, stories, fixtures, docs and tests.

### Task 5: Whole-Branch Verification and Visual Acceptance

**Files:**
- Modify: `docs/component-specs/thumbnail-composition.md` with actual test/run evidence and limitations.

**Interfaces:**
- Consumes: completed Tasks 1–4 and current scripts.
- Produces: honest verification record, export snapshots/screenshots when run, one feature branch ready for a single PR.

- [ ] **Step 1: Run** `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run registry:validate`, `npm run registry:smoke`, `npm run catalog:check`, plus a selected browser rendering/export check if available; capture exact results.
- [ ] **Step 2: Inspect** five recipes plus three educational examples at normal and small sizes; note whether actual WebGL hero capture works and whether screenshots were viewed. A screenshot presence alone is not visual sign-off.
- [ ] **Step 3: Record** the precise evidence, incomplete gates and known visual limitations; update the docs and commit.
- [ ] **Step 4: Review** the whole branch against the spec and all five Review Focus cases, address critical findings by RED→GREEN, then create one PR without merging.
