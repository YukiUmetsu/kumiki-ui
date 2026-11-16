# RISO63 — native dry-brush ink as a real Film Document

**Scope:** The exact original, nonhuman RISO62 ArtCraft source from [RISO62 research](riso62-dry-brush-artcraft.md) now renders through the production FilmStage and FFmpeg video pipeline. This is a workflow/evidence extension, not a new flattened shader or another ink renderer.

## Source and medium continuity

- [RISOTTO Studio physical-print FAQ](https://risottostudio.com/pages/printing-faq) and [University of Illinois Riso print/trapping guide](https://web.faa.illinois.edu/app/uploads/sites/6/2021/05/riso_print_guide.pdf): plates are physically independent; colored spot ink overlaps on the substrate, with feed registration and grain.
- [Outlet PDX, Riso source detail](https://www.outletpdx.com/riso): paper holds separate deposited pigments; inspecting only a final two-color composite obscures the plate-level topology.
- Original RISO62: 11 independently drawn cobalt strokes, nine vermilion gestures, 19 native witness marks per master, nine red echo paths, source pressure knots, long fibre cutouts and paper pores. Film integration **reuses these original same SVG nodes** and the existing print renderer; no vectors, tonal layers, edge treatments or macro details are discarded.

## Film construction / API

1. `src/video/riso-brush-studio.tsx` exports `RisoBrushArt` for both the existing interactive Studio and FilmStage. Opt-in `layout="film"` removes Storybook's 460px portrait preview width cap and decorative shadow. The resulting 540×960/960×540 sheet uses native source-space coordinates with correct aspect, without letterboxing.
2. `renderRisoBrushFilmSlot(content,context)` validates the source frame (0..239), spot master ID, finite seed, dryness, grain, pressure width and registration. Production `loadFilmSlots` and new Storybook `Dry-Brush Production Film` both call **the identical adapter**. No other film slot changes.
3. `RISO_DRY_BRUSH_FILM` and the identical, portable `examples/film/riso-dry-brush-native.film.json` define one **continuous** 240-frame scene at exactly 24 fps, hence 10 seconds. Only the original source cubic control handles change at the passed absolute source frame; source paper grain, fiber geometry, pigment count, master IDs and press registration stay seed-locked.
4. `reducedMotion` holds the original source at its authored resting state, not a random rendered frame. Separations in Storybook are **preview-only**: the portable production film always prints both masters, avoiding silent output changes.
5. Capture, mixing and MP4 encoding happen exclusively in the existing `scripts/film.mjs` / `src/film/capture.tsx` and `FilmStage` APIs. No secondary video exporter, server, custom timer, new dependency, SVG filter, screenshot movie or bitmap-precomposited plate.

### Reproduction

```bash
npm run film:check -- examples/film/riso-dry-brush-native.film.json --format=json
npm run film:frame -- examples/film/riso-dry-brush-native.film.json --only=landscape --frame=120 --out=dist/riso63-frames
npm run film:frame -- examples/film/riso-dry-brush-native.film.json --only=portrait --frame=120 --out=dist/riso63-frames
npm run film:render -- examples/film/riso-dry-brush-native.film.json --out=dist/riso63-export
ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,width,height,avg_frame_rate,nb_frames -of json dist/riso63-export/landscape.mp4
```

## Proof and release criteria

- Source-level Vitest: portable JSON equality; both 240-frame exact dimension/FPS compiles; both masters and all twenty unchanged source gestures; original/candidate positional continuity; deterministic source after backward seek; independent single-color output; reduced-motion steady state; malformed controls fail loudly.
- Playwright Chromium: **actual FD1 FilmStage story**, both native 16:9/9:16 outputs and three real spot-master separation screenshots each. Nonlinear seek and reduced-motion states tested on the actual source paths, not detached mock geometry.
- CI builds the complete Storybook and tests clean riso-print registry installation, then invokes the **existing production film CLI** for genuine MP4 exports. FFprobe validates output dimensions, real 24fps encoding and expected full-frame count. Save encoded MP4s and native screenshots as workflow artifacts. Report any skipped, failed or truncated encode explicitly.
- The finished film has no audio; do not imply that the export has music, sound FX, narration or a complete sound mix. Physical press registration, ink saturation, paper absorption and perceived 24fps movement require independent footage/stock QA. Unit tests and generated videos do not certify real printing authenticity.

**Hand/anatomy scope:** no human-hand, face or character files were changed. The unfinished RISO60 hand artwork remains a separate draft and is not promoted by this film work.
