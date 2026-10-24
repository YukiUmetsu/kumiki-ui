# Reusable Thumbnail Compositions — Design

**Date:** 2026-10-23
**Decision:** Approach A — a thin, reusable thumbnail-production layer in Kumiki-UI; research, experimentation and YouTube analytics stay with the consumer (e.g. ContentGen).

## Intent

Make it practical to compose and export visually compelling, faceless, static thumbnails from Kumiki's existing 2D/3D assets. A creator should be able to select a narrative composition, supply truthful content and licensed imagery, render an editable 16:9 still, inspect it at feed sizes and get actionable, deterministic quality warnings.

The library must help communicate one compelling idea without claiming to predict click-through rate or automate artistic judgment.

## Goals and acceptance

1. Five clearly different, reusable composition recipes: **hero + fact**, **side-by-side comparison**, **hidden mechanism**, **before/after consequence**, **scale surprise**. Each exposes semantic roles (primary subject, optional second subject, claim/headline, evidence/cue) rather than industry-specific props or hard-coded copy. Missing required roles produce an explicit diagnostic; a recipe must not invent them.
2. Compile each recipe into the **existing** `MediaDocument` (`registry/media/document.ts`), preserving editable text, image assets, stable IDs, deterministic geometry and the ordinary SVG/PNG export path. No parallel thumbnail renderer or schema.
3. Provide configurable, neutral art direction: palette, type scale, cropping/focal point and optional intentional image/text overlap. Responsive stills are authored for a target aspect; no stretched crops. Ship a clean 16:9 reference configuration.
4. Extend the **existing** media diagnostics with an opt-in thumbnail preflight: missing/too-small focal subject, critical subject crop/edge violations, title-size threshold at specified inspection widths, timestamp-corner reserved area, risky claim/subject overlap, extreme content density, plus checks already provided by `preflightExport` (fonts, assets, text fit). Every issue has a stable code, severity and actionable layer ID where applicable. Use declared semantic geometry and measurable font metrics, never image recognition, an LLM score or a fake aesthetic grade.
5. Integrate with `ExportPreview`'s existing 320/160/96-pixel inspection (no second preview implementation). Optional subject/claim guards must not prohibit deliberate layering, obscure or silently truncate content. Export the ordinary still image.
6. Complete and verify the optional **3D hero → still asset → MediaDocument** workflow using existing `HeroRender` / `hero:capture` and the media image registry. This bridge is separate from 2D core so installing thumbnail compositions does not load Three.js or GPU code. No external assets bundled without verified distribution rights.
7. Deliver tested registry item(s), documented public API, five reusable stories/fixtures and three realistic educational demonstration compositions using existing home/finance assets when their actual quality and rights are verified. Demos may show specific topics; registry APIs and default names remain domain-neutral.

## Non-goals

- YouTube metadata, competitor scraping, feed simulation, A/B campaigns, impressions/CTR, title optimization, or publishing; those belong to ContentGen.
- Automatic background removal, generative image creation, screenshot-based AI quality scoring, image-derived subject segmentation or unlicensed model ingestion.
- New 3D domain models, new text-layout engine, alternate media document format, animation/video timelines or general-purpose image editor.
- Guaranteeing premium visual quality from static metrics alone. Human review and audience testing remain required.

## Constraints from the repository

- **Reuse first:** `MediaDocument`, `Artboard`, `LayerStack`, `EditableText`, `MediaFrame`, `ExportPreview`, `preflightExport`, `ShortSafeFrame` and optional `HeroRender` already exist.
- **Registry isolation:** source-distributed items must list their dependencies and install paths; thumbnail 2D core cannot import optional Three.js or FFmpeg.
- **No consumer specificity:** no YouTube brand dependency, channel/business logic, mandatory font assets or channel palette in the library contract. The timestamp reserve is a configurable corner exclusion region, not an embedded platform badge.
- **Quality:** measured text, explicit text/subject protection and real browser visual inspection, including CJK and multiple palettes. Report checks not run as not run.
- **Truth and rights:** visual data, numeric claims and licenses are supplied by the consumer; no misleading extrapolation or silently fabricated values.

## Approaches considered

| Approach | Benefits | Costs and decision |
|---|---|---|
| **A. Thin composition recipe and preflight layer over M0 media (chosen)** | Reuses known layout/export, optional 3D adapter, no duplicate schema; fits existing registry | Requires an integration example and cautious judgment about semantic visual intent |
| B. Integrated thumbnail studio with research/analytics | One end-to-end workflow | Duplicates ContentGen and makes the generic component library consumer-specific; rejected |
| C. Separate thumbnail renderer | Complete visual control | Creates preview/export drift, overlapping layer schema, expensive testing; rejected |

## Structure and data flow

1. A consumer supplies a recipe ID, canvas/palette, explicitly licensed `ImageAsset` records and semantic slots for focal subjects, claim and visual cue. A pure composer allocates geometry and emits ordinary `MediaDocument` layers; it returns role-to-layer IDs for QA and optional editing.
2. A pure inspector checks the semantic role map and actual layer rectangles, then merges opt-in diagnostics with existing `preflightExport`. It checks the designated output sizes without a new rasterization pass. If text metrics are unavailable, it reports that limitation instead of pretending legibility is verified.
3. `ExportPreview` renders and exports the same document; inspect 320/160/96 px. A browser visual workflow verifies typography, overlap, crop and realistic appearance.
4. For 3D, optional existing hero capture exports a reviewed, rights-cleared PNG; the consumer registers it as an ordinary image asset. A small documented adapter or helper may handle this handoff, but 2D thumbnail APIs must remain independent of Three.js.
5. The consumer retains selection, factual research, competitor data and performance analysis.

## Error handling and edge cases

- Empty claim, missing focal asset, duplicate semantic slot IDs, invalid/fractional geometry or an impossible layout: fail explicitly with stable diagnostic codes and no made-up fallback content.
- Long English/Japanese text, mixed-direction text, narrow safe regions and fonts unavailable at export: use existing measured text behavior and report where fitting is impossible.
- A deliberate image/claim overlap may be allowed by author intent; essential text over a protected subject without such intent must be reported. Transparent/visible-subject pixels cannot be inferred from a static bounding box alone.
- User-supplied assets may be inaccessible, taint canvas or lack redistribution permission: retain the existing export errors and rights metadata; never perform implicit fetches.
- Very small inspection output: report an objective readability risk, not a claim that CTR will be low.
- Different aspect/crop: compose from semantic slots for the target aspect; never distort source imagery.

## Verification and completion standard

Write failing tests first for each recipe's geometry and semantics, invalid inputs, stable output, CJK/long headline handling, reserved corner, intentional/accidental overlap and missing assets; verify failures, implement, re-run. Then run `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run registry:validate`, `npm run registry:smoke`, `npm run catalog:check` and selected browser export/visual review if available. Verify optional 3D capture separately, record actual artifacts and known limitations; do not mark untouched gates as passed.

**Release boundary:** one PR on a feature branch with the focused registry API, tests, examples, docs and verification evidence. No ContentGen changes in this PR.
