---
name: kumiki-chinese-ink
description: Use when making, painting, animating or reviewing Chinese ink (水墨, sumi-e, shan shui, brush painting) pictures, characters or videos in Kumiki, especially when the ink looks like flat vector shapes or a filter, the page is too full, a face or robe looks crude, a figure shows what is behind it, brush strokes pop on instead of being painted, birds or water move backwards, or words sit on a drawing.
---

# Kumiki Chinese ink (INK-FILM1)

Read the [spec](../../docs/component-specs/chinese-ink-film.md). For new brush marks or a new face read
[INK-RISO1](../../docs/component-specs/ink-riso-press.md) too. Genre recipes and review questions:
[craft study](../../docs/36-chinese-ink-wash-craft-and-film-system.md).

1. **Use what exists.** `INK_BOOK` names every subject: people, mountains, waterfalls, trees, flowers, birds, fish,
   buildings, boats, weather, letters and seals. `inkPeaksScene` and its sisters give whole places. Another seed is
   another place.
2. **A film is data** (`InkFilm`): shots, layers, camera, text. Play it with `InkFilmPlayer`, export it with
   `VideoExportStage`, put it in a film document with the `ink-film` slot. Run `inspectInkFilm` first.
3. **Most of the page stays paper.** Water, sky, mist and snow are the paper. One hero per shot, darkest ink on it.
4. **Only brush marks.** `inkSide` (belly of the brush), `inkBloom` (wet), `inkThread` (a hair line), `inkDab`,
   `pen.line`. No flat fills, filters or gradients.
5. **Layers hide what is behind them.** Cover gaps inside a figure with `inkCover`; let a robe go out with `inkFade`.
   Check the figure over a strong colour.
6. **It paints itself** in the order the brush went: `turn` for each part, `soft` for faces.
7. **Calm motion.** A light wind is 4–16 units. Birds, boats and water go the way they face, never back.
8. **Words on bare paper**, in both formats. Measure the darkest pixel under each caption.
9. **Faces** from a measured head and brush marks, judged by eye. A robe closes the wearer's left side over the right.
   Do not change an accepted figure's drawing.
10. **Review** at normal speed and frame by frame, wide and upright. Record what you checked.
