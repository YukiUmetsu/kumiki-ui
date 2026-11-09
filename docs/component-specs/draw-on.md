# Draw-On

**Registry item:** `draw-on` (`registry/video/draw-on.ts`, `draw-on-react.tsx`): the timing, the pen, the checks and the renderer. `film-document` depends on it.

**In a film:** a `"recipeId": "draw-on"` scene.
**Research:** [32 — Professional video recipes](../32-professional-video-recipes-research.md): the P3 "Draw-on explainer" recipe and §9.

## Purpose

Explain a process by drawing it. A hand-drawn explainer holds attention by showing a thing being made, one part at a time (grade C, practice); one part per beat is the same staging rule as the [chart morph](chart-morph.md)'s, and the camera stays locked so the drawing is the only motion.

## How it plays

- **The pen draws each stroke** with its tip on the end of the line, its barrel leaning up and to the right and its shadow on the surface. Between strokes it lifts (it rises and its shadow moves away) and travels to the next start; after the last stroke it fades.
- **A closed outline's wash** blooms over 0.7 s once the outline is drawn: a watercolour fill with pigment pooled a little at its edge.
- **A label** lands beside its stroke over a third of a second once the stroke is done.
- **Dashed strokes** (an edge that is not there yet: a line of collapse, a path to come) reveal their dashes along the line.
- **Surfaces.** `paper`: dark ink on warm paper. `board`: chalk-white on a dark slate board. A faint bleed runs round every line.

Strokes are points on the author's canvas, smoothed through (Catmull-Rom) or kept as `corners`, so the pen's place along a stroke is plain arithmetic from its sampled length: no DOM measuring, identical on every render. A stroke without `frames` takes the time a hand needs at about a third of the canvas a second.

## Content

```json
{
  "label": "A cross-section of a waterfall drawn by hand: …",
  "title": "How a waterfall moves upstream",
  "canvas": { "width": 160, "height": 90 },
  "strokes": [
    { "id": "hard", "points": [[6, 34], [92, 34], [92, 44], [6, 44]], "closed": true, "corners": true, "fill": "#7f8a99", "at": 20, "frames": 54, "label": { "text": "Hard rock", "at": [10, 39] } },
    { "id": "river", "points": [[6, 32.4], [30, 31.8], …, [99, 71]], "color": "#2f6fb0", "at": 170, "frames": 48, "label": { "text": "The river", "at": [44, 28], "align": "middle" } },
    { "id": "crack", "points": [[84.5, 33.6], [86.2, 44.2]], "corners": true, "dashed": true, "color": "#b0412e", "at": 370, "frames": 16, "label": { "text": "The overhang breaks off", "at": [86, 26], "align": "middle" } }
  ]
}
```

The canvas is fitted into the output's safe area under the title. Draw it for the shape of frame it will play in: a wide diagram in a tall frame is small, and its labels are not.

## Checks

| Code | Severity | What it catches |
|---|---|---|
| `draw-canvas`, `draw-strokes`, `draw-id`, `draw-points` | error | No canvas or strokes; a missing or repeated ID; a stroke with under two points or points off the canvas |
| `draw-order` | error | A stroke outside the scene, or out of the listed order |
| `draw-short` | error | The scene ends mid-stroke, or before the last label can be read |
| `draw-fast` | warning | A pen faster than a hand (over about 0.9 canvas-widths a second): a reveal, not a drawing |
| `draw-overlap` | warning | A stroke that starts before the one before it is done: one hand draws one line at a time |
| `draw-rushed` | warning | A label that has less than its reading time before the next lands |
| `draw-fill-open` | warning | A wash on an open stroke |
| `draw-label-long` | warning | A label over six words |
| `draw-label-collision`, `draw-label-outside` | warning | In an output of this shape, two labels overlap, or a label leaves the safe area; projected with the renderer's own layout |

## In a film

Each stroke is a moment (its ID), as the pen touches down, for a pen sound, a beat or a review frame. Speed ramps above 1.3× are warned about, as the scene carries words; the scene does not drift with the film's camera.

**Example.** [`examples/film/draw-on.film.json`](../../examples/film/draw-on.film.json), "How a waterfall moves upstream", the textbook account: a band of hard rock over soft rock; the river runs over the edge into a plunge pool; the soft rock behind the fall wears back; the overhang of hard rock breaks off; so the waterfall moves upstream. Landscape only: drawn for a wide frame.

**Storybook, Video production → Draw-On:** `Paper` and `Board`, with reduced motion.

## States

- **Reduced motion.** Each stroke appears whole at its start, with its wash and label; there is no pen.
- **Text.** The title and labels are HTML, measured by the rendered-text audit; strokes and the pen are art. Labels still landing are marked as entering.
- **An empty page.** The first frames of a draw-on are mostly empty by design, and the review's `frame-mostly-empty` says so on its opening frame.

## Evidence (2026-11-09)

- **Tests.** `tests/film-document.test.ts`, "draw-on": the pen on the end of the line and lifted between strokes, the wash after its outline, reduced motion, stroke lengths, every check including labels projected into a 1080×1920 frame, and the example's moments.
- **Render review.** Frames 50, 120, 200, 260, 300, 380, 470 and 550 at 1920×1080: the rendered-text audit reports no problems after the opening frame's empty page. Problems found and fixed: the dashed line of collapse never appeared (its reveal mask was transformed twice); and in a 1080×1920 frame the wide drawing was small while its labels were not, so two collided and one left the safe area. The check now projects labels into each output, and the example plays in landscape.

## Limits

- Strokes are authored as points; there is no import from an SVG file.
- One pen; strokes are drawn in order, not in parallel.
- No camera moves: a drawing larger than the frame needs a cut to a second scene.
