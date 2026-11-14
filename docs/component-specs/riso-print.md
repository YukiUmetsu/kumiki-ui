# Risograph spot-ink printing (RISO1)

**Registry item:** `riso-print`  
**Source:** `registry/video/print-plates.ts`, `print-plates-react.tsx`  
**Storybook:** **Video production → Film Looks → Risograph · Two-Ink Printing** and **Video production → Film Looks → Risograph · 3-Shot Film Stage**. The Storybook group already existed; no new section has been added.

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

## Storybook artwork and three-shot film

The demo is an original editorial poster, **THE HIDDEN CURRENT**, drawn as two separate SVG spot-ink layers in `src/video/riso-print-demo.tsx` with true landscape and portrait compositions. The previously overlapping **RISO / 02** stamp is larger and isolated below the subtitle. `RISO_STAMP` and `RISO_TEXT_ZONES` declare measured safe regions for both ratios; unit tests check their intersections with rotation considered.

The interactive story lets viewers scrub the printing timeline, play/replay, isolate blue/red plates, choose 16:9 or 9:16, change registration, paper grain and seed, and enable reduced motion.

A separate story within **the same existing Film Looks group** compiles a 13-second three-scene FD1 film through `compileFilm` and `FilmStage`. It uses FilmStage's existing `renderSlot` callback to pass the scene's frame to `RisoPrint`—there is no independent film renderer or duplicate animation clock. The authored film is in `src/video/riso-print-film.ts`.

## Evidence and limitations

- Source and tests: `tests/print-plates.test.ts` and `tests/riso-print-demo.test.tsx`.
- Physical technique reference: [Risograph demo film / stills](../35a-material-native-style-reference-gallery.md) and its independent printing-process sources.
- No external video, source artwork, images, fonts or sound are bundled. No added production dependencies.
- **Unverified until actual browser QA:** contact sheet captures at 0%, 25%, 50%, 75%, 100% for both ratios; normal-speed three-shot playback; actual SVG glyph bounds and paper/ink antialiasing at 1080p. Tests and Storybook presence do not alone imply visual approval.
- Future material extensions: auto-separation from supplied imagery, measured ink absorption, richer paper physics and authored stamp/print transitions between different scenes.
