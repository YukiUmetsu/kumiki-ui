# Risograph spot-ink printing (RISO1)

**Registry item:** `riso-print`  
**Source:** `registry/video/print-plates.ts`, `print-plates-react.tsx`, `riso-sheet-feed.tsx`  
**Storybook:** **Video production → Film Looks**, with the three stories **Risograph · Two-Ink Printing**, **Risograph · 3-Shot Film Stage** and **Risograph · Paper Feed Transition**. No new Storybook section.

## Purpose

An artwork-native Risograph material, **not** another film-stock grade or a full-frame RGB halftone filter. Authors supply separate SVG artwork per spot-ink plate. The renderer prints each plate independently onto a single paper surface, with a distinct halftone screen, order-dependent multiply-like overprint, fixed misregistration, seeded paper fiber/pores and a plate-print reveal.

This is useful for graphic editorial explainers, limited-palette teaching scenes, print posters and semantic reveals. It is **not** automatic CMYK separation of photographs, a calibrated printing simulation, or source-quality color proofing.

## API

Install `riso-print`. `RisoPrint` props:

- `spec: RisoPrintSpec`: version 1, sheet `width`/`height`/`paper`, `seed`, `startFrame`, `passFrames`, `gapFrames`, and 2–3 independent plates.
- Each plate: stable `id`, ink `color`, `opacity`, `dotCell`, `dotAngle` and signed 2D `registration`.
- `artworks: Record<plateId, (paint: RisoPaint) => ReactNode>`: original SVG drawing for each plate. `paint.solid` is its ink; `paint.dots` is its independent screen fill.
- `frame: number`: an absolute nonnegative integer film frame; seeking is stateless and deterministic.
- `misregistration?: number` and `paperGrain?: number`: bounded seed-stable adjustments; grain never flickers with frame.
- `reducedMotion?: boolean`: skip all ink-print animation and display the completed print.
- `label?` and standard SVG HTML props (`className`, `style`, `aria-hidden`, etc.)

`inspectRisoPrint` reports actionable, path-specific errors for invalid sheets, timing, colors, plate counts, IDs, registration, dot screens and opacity. The renderer throws for missing authored artwork instead of silently substituting generic cards.

`evaluateRisoPrint(spec, frame)` resolves independent print progress on the same absolute clock, including nonsequential seek and reduced motion. `overprintColor` provides a CPU reference sample for multiplicative color mixing; real browser compositing uses SVG `mix-blend-mode: multiply` and the plate's opacity.

## Storybook artwork and production film

The demo is an original editorial poster, **THE HIDDEN CURRENT**, drawn as two separate SVG spot-ink layers in `src/video/riso-print-demo.tsx` with true landscape and portrait compositions. The previously overlapping **RISO / 02** stamp is larger and isolated below the subtitle. `RISO_STAMP` and `RISO_TEXT_ZONES` declare measured safe regions for both ratios; unit tests check their intersections with rotation considered.

The interactive story lets viewers scrub the printing timeline, play/replay, isolate blue/red plates, choose 16:9 or 9:16, change registration, paper grain and seed, and enable reduced motion.

A separate story within **the same existing Film Looks group** compiles a 13-second three-scene FD1 film through `compileFilm` and `FilmStage`. It uses FilmStage's existing `renderSlot` callback to pass the scene's frame to `RisoPrint`—there is no independent film renderer or duplicate animation clock. The authored film is in `src/video/riso-print-film.ts`.

A third story in the same Film Looks group uses **`RisoSheetFeed`**, a paper-feed bridge between **THE HIDDEN CURRENT** and the independently drawn **FOLLOW THE FLOW**. Both incoming spot-ink plates are printed in sequence as the new sheet arrives, without adding a second timeline or a Film Document transition kind. The five-shot film is `RISO_SHEET_FEED_FILM` in `src/video/riso-print-film.ts`.

The production `film:render` path now resolves these three print slots in `src/film/film-slots.tsx`. A portable film file lives at `examples/film/riso-paper-feed.film.json`:

```bash
npm run film:check -- examples/film/riso-paper-feed.film.json
npm run film:render -- examples/film/riso-paper-feed.film.json
```

These commands are the intended production workflow; successful MP4 export is not implied by compilation or Storybook tests alone.

## Evidence and limitations

- Source and tests: `tests/print-plates.test.ts`, `tests/riso-print-demo.test.tsx`, `tests/riso-sheet-feed.test.tsx`, and the actual-browser `tests/e2e-storybook/riso-film-looks.spec.ts`.
- Physical technique reference: [Risograph demo film / stills](../35a-material-native-style-reference-gallery.md) and its independent printing-process sources.
- No external video, source artwork, images, fonts or sound are bundled. No added production dependencies.
- **Verified in captured Chromium stills:** both aspects and all ink passes render; the RISO / 02 text fits inside its border without collision in either layout. Printed sheets and transitional frames were inspected from captured browser PNGs. The browser test tolerates no more than 2/255 per color channel across at most 0.01% of pixels, based on measured 1–2-level Chromium SVG subpixel rounding seen after nonsequential seeks.
- **Still to qualify:** a passing final browser run, clean consumer install, actual normal-speed encoded film playback/export, and independent final release approval. Screenshots and code tests do not imply video-level visual acceptance.
- Future material extensions: auto-separation from supplied imagery, measured ink absorption, richer paper physics and physically calibrated ink mixing. The current sheet-feed bridge is authored as an existing FilmStage slot, not a universal FD1 transition kind.
