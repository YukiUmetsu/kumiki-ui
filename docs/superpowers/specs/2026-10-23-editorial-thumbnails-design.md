# Editorial Thumbnail Art Direction — Design

**Date:** 2026-10-23  
**Decision:** Extend draft PR #20 with a reusable, asset-driven art-direction layer and three visually reviewed House Math demonstrations. This is an additive improvement to the existing thumbnail compositor, not a new renderer or an image-generation API.

## Intent

The first five thumbnail recipes are structurally correct but aesthetically weak: a few fixed rectangles, uniform text and technical-cutaway placeholders do not reproduce the visual hierarchy of the three accepted House Math PNG concepts (house ownership cost, exploded HVAC cost, rent/buy decision). Make premium compositions achievable from **supplied**, reviewed visual assets while keeping type, subjects, graphic props and background independently editable.

## Approaches and decision

1. **Chosen — hybrid asset-driven composition:** Photoreal imagery comes from reviewed generated/licensed/captured assets; Kumiki assembles editable layers using the existing `MediaDocument` and SVG/PNG pipeline. Powerful and maintainable, but depends on a good input asset.
2. **Baked generated thumbnails:** Almost immediate visual impact, but headlines and subjects become inseparable pixels, defeating reusable recipes and editing. The three PNGs remain art-direction references only.
3. **Procedurally create realistic houses/HVAC entirely in TypeScript:** Domain-model and rendering work far beyond a thumbnail compositor, with no credible parity against image generation. Rejected.

## Scope

- Add a small *editorial art-direction* recipe API which accepts a background, zero or more optional visual props, a prominent hero subject (and a second subject for a comparison), headline **lines with individual colors/emphasis**, a declared font, and a configurable neutral palette. Use named layout variants and normalized positions where appropriate; emit only standard `MediaDocument` layers with stable semantic IDs. Keep the five original recipes compatible.
- Add only the minimal, general-purpose appearance primitives the existing preview and export both need (subject drop shadow and optionally a text outline if required by a visually inspected example). Effects must be deterministic, validated and portable to SVG/PNG; fail or warn honestly when unsupported. Existing blend/crop/mask/opacity stay in use.
- Supply a small predictable variants helper (two or three named alternatives) and reuse `inspectThumbnail` for text/subject bounds, reserved lower-right corner and 320/160/96px legibility; never claim an aesthetic or predicted-CTR score.
- Produce **three actual layered House Math Storybook compositions**, modeled on the user-approved PNGs: housing cost reveal, HVAC inspection, rent/buy comparison. Use photoreal or convincing editorial subject/backdrop assets without baked-in display copy. Generated artwork is example-only and must carry provenance and redistribution-rights notes; no artificial numeric claims masquerading as verified facts.
- Inspect exported PNGs at full and feed sizes, fix clipping and readability problems, and record any browser-specific verification that could not run. Leave the PR draft if critical visual/export gates are blocked.

## Ownership and non-goals

- **Kumiki-UI:** deterministic layout, media/effect layers, text styling, reusable visual metaphor composition, provenance metadata, previews and objective preflight.
- **ContentGen or consumer:** topic research, truth/price checks, prompt/image creation or stock-asset acquisition, model choice, performance measurement, CTR tests and publishing.
- No mandatory image-generation service, cloud key, AI critique loop, platform analytics, arbitrary subject segmentation, full graphics editor, new 3D engine or dependency-heavy effects library.
- No public APIs, default colors or logic named `HouseMath`, `HVAC`, `mortgage`, etc. Those belong only to example fixtures.

## Acceptance gates

1. One visually compelling example is demonstrably **not** a flat AI-generated thumbnail bitmap: hero, background, accent prop, headline segments and cue can be inspected/edited as ordinary media document layers. All three examples must meet that rule.
2. Source images show no baked headline text. Full-size exported images preserve authored overlays, appearance and subjects. No unlicensed external stock art enters the registry.
3. Visual subject never clips unintentionally, important claims remain readable and outside the reserved timestamp region at 320, 160 and 96 pixels, and effect-bearing text/image preview agrees with SVG output.
4. Existing thumbnail recipes, component tests, typecheck, build, lint, registry validation/smoke and Storybook build remain green. Report exact failures rather than inventing visual sign-off.

## Open implementation choices delegated to builder

Choose narrowly scoped file boundaries and public names by inspecting the current `registry/media` contracts. Prefer existing `MediaDocument` primitives and simple presentational data to a new scene schema. If outline effects are not necessary to pass visual review, do not introduce them. Do not use the three flat reference PNGs as art assets in final layered examples.
