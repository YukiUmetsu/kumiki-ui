# Editorial Thumbnails Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make three attractive House Math thumbnails from separately editable Kumiki media, text, and effects layers while exposing reusable art-direction components for other channels.

**Architecture:** Preserve the existing `MediaDocument`/SVG/PNG still pipeline and five legacy recipes. Add one portable appearance primitive, one typed editorial thumbnail composer, and an optional deterministic variant helper; use reviewed image assets for realistic visual subjects rather than generating pixels inside Kumiki.

**Tech Stack:** TypeScript, React, Vitest, Vite/Storybook, existing media registry and exporter; zero mandatory runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-10-23-editorial-thumbnails-design.md`

## Global Constraints

- No channel-specific names, palettes, financial assertions or image model dependencies in public registry APIs.
- All final artwork is an editable `MediaDocument`; do not substitute the reference flattened PNGs.
- Source assets must declare provenance and redistribution permissions; license uncertainty blocks packaging.
- Preview and SVG/PNG export must agree, and guards are deterministic/CPU-only. No asserted CTR prediction.
- Keep the work inside draft PR #20. Do not merge, alter ContentGen or add unnecessary libraries.

## Review Focus

1. Empty/long/CJK title lines: reject empty, preserve text and emit legibility warnings rather than clip silently (Task 2/3).
2. Missing second image in split mode: clear error, no invented filler (Task 2).
3. Invalid filter color/blur/opacity: validate before export instead of emitting invalid SVG/CSS (Task 1).
4. Images without reliable rights metadata: do not mark as CC0/stock by assumption; example provenance is explicit (Task 4).
5. Overlapping subject/claim: role-aware preflight reports collisions unless intentional exceptions are recorded (Task 3/4).

---

### Task 1: Portable drop-shadow appearance

**Files:** Modify `registry/media/document.ts`, `registry/media/layer-stack.tsx`, `registry/media/svg-export.ts`; test `tests/media-appearance.test.ts` (create).

**Interfaces:** Add optional `LayerBase.appearance?: { dropShadow?: { dx: number; dy: number; blur: number; color: string; opacity: number } }`. Validation must reject non-finite/out-of-range lengths, non-hex color and opacity outside `[0,1]`. Render with equivalent CSS `drop-shadow` in the DOM and deterministic SVG `<filter>` definitions; avoid changing existing layers without appearance.

- [ ] Write tests for validation, stable SVG serialization, filtered image/text layers, special-character layer IDs and unaffected legacy documents.
- [ ] Run `npx vitest run tests/media-appearance.test.ts` and confirm tests fail for absent behavior.
- [ ] Implement the minimal schema, DOM styling and SVG filter support with stable filter IDs and safe escaping.
- [ ] Re-run focused test; then `npm run typecheck` and selected existing media export tests.
- [ ] Commit task.

### Task 2: Typed editorial thumbnail composer

**Files:** Create `registry/media/thumbnail-art-direction.ts`; modify `registry.json`, `src/catalog/catalog-metadata.ts`; test `tests/thumbnail-art-direction.test.ts`.

**Interfaces:**

```ts
interface EditorialHeadlineLine { text: string; tone: "foreground" | "accent"; scale?: "primary" | "secondary" }
interface EditorialProp { id: string; image: ImageAsset; frame: { x: number; y: number; width: number; height: number }; z?: number; opacity?: number }
interface EditorialThumbnailInput {
  id: string;
  layout: "subject-left" | "subject-right" | "split-comparison";
  primary: ImageAsset;
  secondary?: ImageAsset;
  background?: ImageAsset;
  props?: readonly EditorialProp[];
  headline: readonly EditorialHeadlineLine[];
  cue?: string;
  font: FontAsset;
  palette?: Partial<ThumbnailPalette>;
}
interface EditorialThumbnailResult {
  document: MediaDocument;
  recipe: "editorial";
  layout: EditorialThumbnailInput["layout"];
  roles: ThumbnailCompositionRoles & { headlineIds: readonly string[] };
}
function composeEditorialThumbnail(input: EditorialThumbnailInput): EditorialThumbnailResult;
```

All `frame` values are normalized design-space fractions `[0,1]`; prominent subject and text placements are owned by the selected layout. Emit background, optional props, subject(s), separately editable headline lines, cue, stable role IDs and intentional generic drop shadows. `headlineId` is the first line for compatibility; `headlineIds` includes all critical lines. Use `createDocument`, `validateDocument` and the existing palette/asset semantics. `split-comparison` requires `secondary`.

- [ ] Write failing tests for all three layouts, expected editable layer roles/order, 16:9 bounds, duplicated IDs, invalid props, missing second subject, bad/empty/CJK copy and stable results.
- [ ] Run focused tests and confirm failures.
- [ ] Implement composer; keep legacy `composeThumbnail` unchanged; register export/metadata and inspect catalog API.
- [ ] Run focused tests, `npm run typecheck`, `npm run registry:validate` and `npm run catalog:check`.
- [ ] Commit task.

### Task 3: Variant generation and objective QA

**Files:** Create `registry/media/thumbnail-variants.ts`; modify `registry/media/thumbnail-preflight.ts` only if the new composition requires role support; tests `tests/thumbnail-variants.test.ts`, extend `tests/thumbnail-preflight.test.ts`.

**Interfaces:** `composeEditorialVariants(input: EditorialThumbnailInput, variants?: readonly EditorialThumbnailInput["layout"][]): readonly EditorialThumbnailResult[]` with deterministic defaults (the two compatible subject-sided layouts, or one comparison layout when a second subject is provided). IDs must be unique and stable; no random text or numbers. Widen `inspectThumbnail` to accept a shared structural contract (`document` plus roles with optional `headlineIds`), checking **all** editorial critical lines for overlap, reserved-corner intersection and legibility; retain legacy result behavior.

- [ ] Write failing tests for stable variant IDs/order, immutable inputs, missing subjects, CJK/long headline, reserved-corner collision and explicit intentional-overlap exceptions.
- [ ] Run focused tests and confirm failures.
- [ ] Implement minimal variant helper and only necessary inspector alignment; reuse existing checks.
- [ ] Run focused tests and the original thumbnail test suite.
- [ ] Commit task.

### Task 4: Three real House Math visual examples and evidence

**Files:** Create `src/media/thumbnail-examples/` image assets plus `ASSETS.md`; modify `src/media/thumbnail-fixtures.ts`, `src/media/thumbnail-composition.stories.tsx`, `docs/component-specs/thumbnail-composition.md`, `docs/INDEX.md`, optional registry docs; test `tests/thumbnail-art-direction.test.ts` or one story-fixture test.

**Interfaces:** Add three example-only fixtures with IDs `house-cost-editorial`, `hvac-editorial`, `rent-buy-editorial`, using `composeEditorialThumbnail`. Every example must have distinct editable background/subject/text layers; demo copy is indicative and must not assert unverified lifetime expenses. Store image provenance/rights and don't ship flattened reference PNGs as completed examples.

- [ ] Generate or locate legally distributable **text-free** imagery suitable for House Math; review and document its provenance. Keep any generated text out of the pixels and all images out of the generic registry distribution.
- [ ] Add the three composed Storybook examples, making the imported images inlinable for SVG→PNG export rather than assuming cross-origin references will work.
- [ ] Add a failing automated fixture test that proves each demo uses multiple distinct assets/text layers and has no uncovered fatal preflight diagnostics, then make it pass.
- [ ] Run focused tests, full unit project, typecheck, lint, build, Storybook build, registry validate/smoke and catalog check.
- [ ] Render actual 1280×720 exports, review each visually at 320/160/96px, refine composition and document exact successes/failures. Do not mark browser export passed if Chromium is unavailable.
- [ ] Commit the changes, push/update draft PR #20, and describe any remaining blockers without merging.
