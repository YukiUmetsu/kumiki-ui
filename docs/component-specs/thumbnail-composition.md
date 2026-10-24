# Thumbnail Composition, Preflight and Hero Still Bridge

**Status:** Implemented as opt-in media registry slices, with new editable photographic editorial examples and verification notes below.
**Source:** `registry/media/thumbnail-composition.ts`, `thumbnail-art-direction.ts`, `thumbnail-variants.ts`, `thumbnail-preflight.ts`, optional `registry/craft/hero-still-bridge.ts`.
**Storybook:** `Media / Thumbnail Compositions` — five structural recipes, three educational house-cutaways, and three House Math editorial examples.

## Purpose and ownership

Thumbnail composition is a reusable **static visual production** capability, not a recommendation, promotion or publishing service. Consumers provide the title claim, evidence, licensed images, font and color scheme. The composer places those inputs into a canonical editable `MediaDocument`, and optional preflight checks things measurable from those authored layers. The ordinary `ExportPreview` / `documentToSvg` / `documentToPng` pathway remains the only still renderer.

Kumiki does **not** infer the subject from pixels, extract backgrounds, verify the reality of a quoted number, compare competitors, choose titles, predict CTR or run experiments. Consumers own those responsibilities.

## Registry APIs

### `thumbnail-composition`

`composeThumbnail(input: ThumbnailCompositionInput): ThumbnailCompositionResult` returns:

- `document: MediaDocument` — an ordinary M0 artboard with editable text and image layers.
- `roles` — stable IDs `primaryId`, `headlineId`, optional `secondaryId`, `cueId` for QA and later editing.
- `recipe` — one of `hero-fact`, `comparison`, `hidden-mechanism`, `before-after`, `scale-surprise`.

Required inputs: slug `id`, `recipe`, `primary` licensed `ImageAsset` (image MIME type, URI and alt), nonempty `headline` and `FontAsset`. `comparison` and `before-after` additionally require a different secondary image. Optional `cue`, `primaryFit`/`secondaryFit` (`contain` or `cover`), normalized focal points, palette and integer-pixel 16:9 output dimensions let the same recipe handle different content. Defaults: `contain` (no crop), 1280×720, literal, independently exportable neutral palette. Use `cover` together with a focal point to fill a slot by cropping its edges. All positions re-author from design space when output size changes; never distort the subject to fit.

The compiler throws `ThumbnailCompositionError` containing stable diagnostic `code`/`message` entries for invalid claims, asset metadata/media type, duplicates, non-16:9 or fractional dimensions, font declarations, focal points, fit policies, colors or any remaining schema validation errors. It does **not** fetch missing images or invent a title, price or image.

### `thumbnail-preflight`

`inspectThumbnail(result: ThumbnailInspectionTarget, options?: ThumbnailPreflightOptions): Diagnostic[]` merges `preflightExport` diagnostics with additional semantic still checks. `ThumbnailInspectionTarget` accepts both legacy and editorial compositions; if `roles.headlineIds` is provided, **every** critical headline line is inspected, rather than just the first:

| Code | Meaning |
|---|---|
| `thumbnail-critical-layer-missing` | Required visual or headline layer absent/hidden |
| `thumbnail-primary-too-small` | Primary declared visual occupies under 12% of canvas (configurable) |
| `thumbnail-subject-clipped` | Critical declared visual region is outside the artboard |
| `thumbnail-text-subject-overlap` | Essential text intersects a protected visual box by more than 1% of text area |
| `thumbnail-reserved-region` | Claim or cue overlaps a configurable lower-right reserved UI box |
| `thumbnail-text-overflow` | Text cannot fit its declared box even after shrink-to-fit |
| `thumbnail-text-too-small` | Estimated **fitted** text size is too small at a specified feed width |
| `thumbnail-text-metrics-estimated` | No canvas glyph measurer was available; fit/readability checks use approximate character advances |
| `thumbnail-density-risk` | Too many essential visible text/media layers |

Use `intentionalOverlaps` for an authored layering exception, or `subjectRegions` for actual manually measured subject bounds where the media frame contains large transparent margins. Since image segmentation is not performed, frame overlap is a conservative estimate, **not** a declaration of pixel occlusion.

`inspectionWidths` defaults to `[320,160,96]`; each distinct width is tested against absolute displayed-pixel thresholds (7px heading, 5px cue, both configurable). Lower-right reservation defaults to 18%×12% (configurable or `null`). Text fitting uses the same measurer as SVG export; without a live canvas it emits an explicit estimated-metrics warning. Font substitution can still cause clipping, so use browser inspection and the ordinary `ExportPreview` strip for actual legibility. Explicitly decorative media layers do not count against the content-density limit. Invalid or empty inspection configurations throw `RangeError`. No automated aesthetic/CTR grade is produced.

### `hero-still-bridge` (optional)

`captureHeroStill(canvas: HTMLCanvasElement, options: { id; alt; licenseId?; attribution? }): ImageAsset`

- Wait for an existing `HeroAssetViewer` canvas with `data-km-hero-ready`, then capture the rendered frame via the standard browser PNG API.
- Returns a self-contained `data:image/png;base64,...` `ImageAsset` with intrinsic dimensions and **exactly the rights metadata supplied**. The bridge never labels an unverified asset as licensed.
- Throws on zero-size/empty/tainted/cross-origin capture; a `SecurityError` is actionable.
- Rendering and the bridge remain independent. For batch/static fixtures, the already-available `npm run hero:capture` can write PNGs from Storybook; the consumer may register the reviewed file as a normal media asset.
- This adapter has no `three` import and is optional to the 2D thumbnail composer.

### `thumbnail-art-direction` (new)

`composeEditorialThumbnail(input: EditorialThumbnailInput): EditorialThumbnailResult`

This is an art-directable, photographic alternative to the original five
structural recipes. Its generic layouts are `subject-left`, `subject-right`,
`split-comparison`, and `full-bleed`; **none** encodes the House Math brand or any financial fact.
The consumer supplies:

- A separate licensed source image for the hero, and a second for comparison.
- An optional full-bleed image backdrop, plus optional graphic props with
  normalized `[0,1]` frames, opacity, and z-order. Each prop is a distinct
  decorative but editable media layer.
- One or more independently editable `headline` lines with foreground/accent
  intent and optional size emphasis; optional `cue` text, a declared font, and
  portable hex palette. Single-subject layouts accept up to three headline
  lines; split layouts accept up to two, so the cue and subjects keep their
  designated areas. Excess lines produce a typed diagnostic.
- The `full-bleed` layout covers the 1280×720 canvas with the primary photo
  and requires normalized `[0,1]` authored frames for every headline and cue.
  Each display line remains real M0 text, with optional font size, tracking,
  leading, alignment and portable drop shadow. The line-break policy is
  `explicit-only` for these placement-authored headlines: they never acquire
  unexpected automatic wraps (though an authored `\n` still starts a new line).
  Its `fit: none` policy requires review with the **actual declared font**;
  approximate font widths cannot guarantee that a text line will stay clear
  of a subject.

The compiler returns an ordinary 1280×720 `MediaDocument` with stable IDs:
`background`, `subject-primary`, optional `subject-secondary`,
`headline-0` … `headline-n`, optional `cue`, and `prop-<id>`. It also returns
`roles.headlineIds` and legacy-compatible `roles.headlineId`. No text is baked
into source pixels; supplied image composition happens entirely in media layers.
Hero cutouts get a portable, optional drop shadow rendered with basic SVG filter
primitives instead of SVG2 `feDropShadow`, which would hide subjects in older
SVG applications. Invalid assets, duplicate IDs, empty copy, unsafe prop bounds,
invalid opacity, and unavailable comparison imagery produce typed diagnostics.

Example:

```ts
import { composeEditorialThumbnail } from "./thumbnail-art-direction";
import { inspectThumbnail } from "./thumbnail-preflight";

const thumbnail = composeEditorialThumbnail({
  id: "example-home-cost", layout: "subject-left", font,
  primary: rightsClearedHouseCutout,
  background: rightsClearedBackdrop,
  headline: [
    { text: "$500K", tone: "foreground" },
    { text: "TRAP", tone: "accent" },
  ],
  cue: "30 YEARS?",
});
const issues = inspectThumbnail(thumbnail);
```

### `thumbnail-variants` (new)

`composeEditorialVariants(input, layouts?)` composes reproducible, uniquely
identified alternatives using the same user-provided assets and exact wording.
For a single subject, it defaults to left/right alternatives. For a comparison
composition it defaults to one split variant. The optional layout list can
override the defaults; duplicates and an unavailable second comparison image
are rejected rather than silently falling back. This is a layout tool, **not**
an AI title generator or CTR predictor.

### House Math visual acceptance examples

`Media / Thumbnail Compositions / House Math Real Cost`, `House Math Hvac`,
`House Math Rent Vs Buy` and the combined `House Math Editorial Examples`
gallery now consume three art-directed, text-free photographic **full-scene**
images, with separately editable M0 text headline/cue layers, in
[`src/media/thumbnail-examples/ASSETS.md`](../../src/media/thumbnail-examples/ASSETS.md).
The older six generated source cutouts/backgrounds and three vector accents
remain in the repository as earlier experiments, but the three current
editorial stories no longer combine those pieces.
The image-generation tool is **not** a Kumiki runtime dependency. These
specific examples are example-only, have provenance metadata, and are not
asserted to be CC0.

Reproduce the SVG export and optionally rasterize it with Inkscape:

```bash
./node_modules/.bin/esbuild scripts/export-house-math-thumbnails.ts \
  --bundle --platform=node --format=esm --loader:.jpg=dataurl --loader:.ttf=dataurl \
  --outfile=/tmp/kumiki-thumbnail-export.mjs
node /tmp/kumiki-thumbnail-export.mjs /tmp/kumiki-house-math-thumbnails
inkscape /tmp/kumiki-house-math-thumbnails/house-cost-editorial.svg \
  --export-type=png \
  --export-filename=/tmp/kumiki-house-math-thumbnails/house-cost-editorial.png
```

The export emits a standalone SVG with inlined image data, alongside a JSON
diagnostic report. Run the Inkscape step for the other two SVG files as well.
Review each actual PNG at full size and in 320, 160 and 96px feed-size scales;
legibility at those widths cannot be inferred solely from geometry.

## Minimal example

```ts
import { composeThumbnail } from "./thumbnail-composition";
import { inspectThumbnail } from "./thumbnail-preflight";
import { documentToSvg } from "./svg-export";

// image and font come from the consumer's licensed asset and font registry.
const composition = composeThumbnail({
  id: "example-still", recipe: "hero-fact", primary: image, font,
  headline: "ONE SURPRISING DETAIL", cue: "SOURCE-VERIFIED FACT",
});
const warnings = inspectThumbnail(composition);
const { svg } = documentToSvg(composition.document, {
  resolveAssetHref: (_assetId, uri) => uri, // Inline already-reviewed data: assets
  attributes: { "xmlns:xlink": "http://www.w3.org/1999/xlink" }, // Legacy SVG readers
});
```

For full interaction, pass `composition.document` to `<ExportPreview />`, which already offers 320, 160 and 96px inspection and SVG/PNG download. Diagnostics are shown **outside** the exported artwork, never watermarked onto the thumbnail. If no image meets the fidelity bar, use a technical illustration knowingly; do not present a 2D example as a photorealistic 3D result.

## Quality, accessibility and distribution

- Exact text is stored in spans; it remains editable and readable to assistive tools. Primary and secondary visuals require alt descriptions.
- Stable role IDs and a deterministic document prevent preview/export mismatch.
- For SVG compatibility with desktop readers such as Inkscape, request `xmlns:xlink` during export; the existing exporter then emits both `href` and `xlink:href` for embedded images. A percent-encoded SVG referenced inside another SVG may still need to be rasterized to PNG for some downstream editors. The bridge already produces PNG.
- No new dependencies, special network requests or forced account credentials. Colors are literal portable hex values, not unresolved CSS design tokens.
- Real imagery still requires licensing and close-up appearance review. Technical cutaways in the showcase come from the existing house SVG system; neutral images are clearly marked placeholders.
- All supplied figures, depicted comparisons and claims must be verified by the caller. The library cannot judge whether a click hook is misleading.

## Acceptance evidence

Fill with **actual** verification output before PR. No check is assumed successful because a component exists.

- Unit/behavior: `npx vitest run --project unit` passed for the repository unit-test project after the final reviewer fixes. All **30** thumbnail-specific tests passed (composition 10, preflight 13, hero bridge 5, registry 2), covering cropping, 96px legibility, estimated metrics, schema errors and decoration rules.
- Typecheck: `npm run typecheck` passed. `npm run lint` passed with 0 errors and 11 warnings in pre-existing files. `npm run build` passed.
- Registry: `npm run registry:validate` (144 items), `npm run registry:smoke` (144 items), `npm run catalog:check` (314 entries, 617 stories) passed.
- Storybook: `npm run build-storybook` passed. The 8 static compositions were raster-reviewed at 1280×720 using Inkscape with SVG image compatibility mode; headline overflow found in the first pass was corrected. The representative `cover` hero recipe was also checked for source-image cropping and frame boundaries. This **does not substitute** for normal-speed browser visual inspection at 320, 160 and 96px.
- Browser SVG→PNG export and actual WebGL→PNG handoff: **not performed**. The full `npm test` command cannot complete its Storybook browser project because Chromium was unavailable and the Playwright browser download failed. Complete on a machine with Chromium installed.
- Human aesthetic sign-off: not claimed by deterministic tests.

### New editorial implementation (2026-10-23/24)

- Unit tests: `thumbnail-art-direction`, `thumbnail-variants`, and
  `thumbnail-editorial-showcase` add coverage for editable layer roles,
  deterministic variants, CJK title preservation, invalid assets, and all-line
  inspector checks. `media-appearance` also covers portable shadow primitives.
- The initial Inkscape export revealed SVG2 `feDropShadow` made *all* shadowed
  subjects invisible in that reader. The filter was decomposed into SVG1.1
  primitives, after which the cutouts appeared correctly in all three PNGs.
  This is why reviewing real SVG exports matters beyond JSON schema tests.
- The initial House Math render also revealed an overlong cost headline and
  overlapping HVAC headline, which were shortened before re-export.
- The final SVG render caught that nested SVG data-URI images show as broken
  images in Inkscape. Code-authored accents were therefore pre-rasterized to
  transparent PNG while their SVG source remains included for editing.
- Export diagnostics now recognize images already containing inlined data URIs,
  and filter bounds expand with blur and offset instead of clipping small
  subjects. The intentionally placed comparison cue uses an explicit
  `intentionalOverlaps` declaration.
- The three example compositions emitted 1280×720 SVGs with no fatal export
  errors, and were rasterized via Inkscape. These validations are **not** claims
  about browser canvas SVG→PNG conversion, which remains an explicit manual
  check until Chromium is present.
- Final verification after editable accent props: `npx vitest run --project unit
  --silent` **114 files, 1,624 tests passed**; `npm run typecheck`, `npm run
  build`, `npm run build-storybook`, `npm run registry:validate`, `npm run
  registry:smoke`, `npm run catalog:check` all passed. `npm run lint` exited 0
  with 11 existing warnings outside the touched files. All three final SVGs
  rasterized without broken assets and their 320/160/96px PNGs were inspected.
  Browser canvas SVG→PNG and WebGL handoff are still unverified.
