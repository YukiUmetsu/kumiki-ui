# Crayon 16:9 / 9:16 original-character production-film proof

Date: 2026-11-14. Status: *export workflow implemented; full browser/
encoded-film human visual approval still pending*.

## Film

`examples/film/crayon-character-performances.film.json` compiles
two independently source-authored Storybook scenes into 600 film frames at
30 fps (20 seconds total) for 960×540 and 540×960 output.

- **The Little Flower**, frames 0–269 (9s): ear and scarf overlap,
  eyebrow emotion, mouth visemes, squash/stretch and planted feet.
- **Dragon and village**, frames 270–599 (11s): wing rig, animated
  multi-character cast, roofs, masonry, old ink outlines, soft page grain.

The `crayon-character-film` slot in `src/film/film-slots.tsx`
resolves existing original CRAYON1 fixtures by named subject; it does not
create copies of scene JSON, foreign assets or another drawing engine.
It rejects subject options with unknown keys, invalid aspect/output
dimensions and mismatched shot durations.

## Local qualification commands

From repo root, with npm dependencies, Playwright Chromium and FFmpeg:

```bash
npm run film:check -- examples/film/crayon-character-performances.film.json
npm run film:frame -- examples/film/crayon-character-performances.film.json --frame=176 --only=landscape --out=dist/crayon-film-proof
npm run film:frame -- examples/film/crayon-character-performances.film.json --frame=430 --only=portrait --out=dist/crayon-film-proof
npm run film:render -- examples/film/crayon-character-performances.film.json --frames=600 --only=landscape --out=dist/crayon-film-proof
npm run film:render -- examples/film/crayon-character-performances.film.json --frames=600 --only=portrait --out=dist/crayon-film-proof
```

**On-demand GitHub Actions:** Actions → *Crayon Storybook browser and film
qualification* → Run workflow → Film: **characters**. This optional workflow
renders the 20s character+dragon film and selected visual beats in both
aspects, uploading artifacts under `crayon-production-film-proof`.

The previous **storybook** choice still renders the 14s fox/lantern film.
Neither branch runs for ordinary pushes or PRs. Focused source tests
and typechecking remain the only automatic CI.

## Human visual review gate (still open)

Play both full MP4s at normal 30fps. Inspect painted-to-opaque layering,
lip-cue clarity, foot grounding, head/ear overlap, scarf attachment, wing
fold, and castle construction. Review each 20s film at native full
resolution and inspect the captured beat stills. No actual character-film
artifact has been produced or signed off in this task yet.
