# Annotated Picture

**Registry item:** `annotate` (`registry/video/annotate.ts`, `annotate-react.tsx`): the timing, the camera, the checks and the renderer. `film-document` depends on it.

**In a film:** an `"recipeId": "annotate"` scene.
**Research:** [32 — Professional video recipes](../32-professional-video-recipes-research.md): the P2 "Annotated footage" recipe, §5 (signalling) and §13 (video essays).

## Purpose

Make an argument on a picture. The video essay's move: the picture plays (here, drifts) while it registers, then stops, and a pen circles, points at, underlines or measures a detail, with a few words beside it. Signalling, cues that direct attention to the relevant part of a picture, improves learning in meta-analyses (grade A); video essayists build whole arguments on footage this way (grade C, practice). One picture carries one thesis, and each mark is evidence for it.

## How it plays

1. **The picture registers.** It drifts in a few percent, aimed at the marks' details, with the thesis (`title`) set over it.
2. **For each mark**, the camera moves to the mark's view in 0.8 s and stops: the freeze. A **push** brings the detail to about a third of the frame (up to 2.6× the cover fit); a **wide** view keeps the picture at its cover fit, aimed at the detail as far as the picture allows, so a vertical frame still holds it. The camera never shows the picture's edge.
3. **The pen draws** in 0.55 s, and the rest of the frame dims round the detail. A **circle** is a hand-drawn loop that runs past its start; an **arrow** comes in on a curve from the note's side, its head drawn after its shaft; an **underline** runs left to right with a little wave; a **span** is a bracket that measures the detail's height (beside it) or width (above or below it).
4. **The note** arrives as the stroke ends, a short chip with an edge in the pen's colour, on the side with room at this output size. An authored `side` is a preference: when the note does not fit there, the next side with room is used. A span's note sits outside its bracket when there is room, otherwise inside it, never on its line.
5. **The camera leaves** for the next mark once the note has been read; the mark fades. The last mark holds to the end.

Strokes are seeded by the mark's ID, so each is irregular in its own way and identical on every render. A soft dark line runs under the ink, so the pen reads on white water as well as on dark rock.

## Content

```json
{
  "image": { "id": "dynjandi", "src": "assets/iceland-large/dynjandi.jpg", "alt": "…", "licenseRef": "commons-dynjandi-cc0-large", "width": 3200, "height": 2136 },
  "label": "Dynjandi waterfall. A person standing at its foot is circled for scale; …",
  "title": "Dynjandi is bigger than it looks",
  "marks": [
    { "id": "person", "kind": "circle", "region": { "x": 0.6915, "y": 0.396, "width": 0.009, "height": 0.022 }, "note": "One person, for scale", "at": 120 },
    { "id": "height", "kind": "span", "region": { "x": 0.68, "y": 0.126, "width": 0.26, "height": 0.28 }, "note": "About 100 m, crest to foot", "at": 226, "side": "left" },
    { "id": "foot", "kind": "underline", "region": { "x": 0.62, "y": 0.3, "width": 0.33, "height": 0.1 }, "note": "Twice as wide at its foot", "at": 350, "view": "wide" }
  ]
}
```

- `region` is a box in fractions of the picture. Find it on the picture itself, for example with a 5% grid laid over it, not by eye on a thumbnail.
- `at` is the scene frame the pen starts; the camera arrives just before it.
- `until` clears a mark before the next one or the scene's end: before a zoom into its detail, say. `titleAt` delays the thesis when the scene arrives through a long transition.
- Each mark's detail is tagged on screen (`data-km-film-subject`), so a [container transform or a zoom](film-document.md#zoom-through) can start from it.
- `view` defaults to `push`, and to `wide` for a span. `color` sets the pen (default a warm red-orange that holds on sky, rock and water).

## Checks

| Code | Severity | What it catches |
|---|---|---|
| `annotate-image` | error | A picture without its source, width or height |
| `annotate-marks` | error | No marks |
| `annotate-region` | error | A region outside the picture |
| `annotate-order` | error | Marks outside the scene or out of order |
| `annotate-note` | error | A mark without a note |
| `annotate-id`, `annotate-kind` | error | A missing or repeated ID; an unknown mark |
| `annotate-short` | error | Too little time to read the last note |
| `annotate-crowded` | warning | More than four marks: an argument becomes a diagram |
| `annotate-note-long` | warning | A note over eight words |
| `annotate-rushed` | warning | The camera leaves a note before it can be read; the hint gives the frame the next mark can start |
| `annotate-first-early` | warning | A mark before the picture has registered (about a second) |
| `annotate-title-short` | warning | The thesis is not on screen long enough to read before the first mark |
| `annotate-licence` | warning | A picture with no rights record |

## In a film

Each mark is a moment (its ID), at the pen's start, for sound cues, review frames and story turns. Speed ramps above 1.3× are warned about, as the scene carries words; the scene does not drift with the film's camera, as it moves its own.

**Example.** [`examples/film/annotate.film.json`](../../examples/film/annotate.film.json): Dynjandi (CC0, Wikimedia Commons), "bigger than it looks": the person standing at its foot circled for scale, a bracket from crest to foot ("About 100 m"), and its foot underlined ("Twice as wide at its foot"). The figures are the commonly published ones: about 100 m high, 30 m wide at the top and 60 m at the bottom.

**Storybook, Video production → Annotated Footage:** plays the example in 16:9 or 9:16, with jumps to each mark and reduced motion.

## States

- **Reduced motion.** The camera cuts between views and each mark appears whole.
- **Output sizes.** Notes and the title stay inside the output preset's safe area; a vertical frame aims at the marks.
- **Text.** The title and notes are HTML, measured by the rendered-text audit; strokes are art.

## Evidence (2026-11-09)

- **Tests.** `tests/film-document.test.ts`, "annotated picture": the drift and the still camera while a mark is drawn and read, reduced motion, pushes that never show the picture's edge, a vertical frame aimed at a wide mark, every check, and the example's moments.
- **Render review.** Frames 60, 128, 160, 214, 236, 290, 360 and 460 at 1920×1080, and 60, 160, 300 and 460 at 1080×1920: the rendered-text audit reports no problems. Problems found and fixed: the bracket floated in open sky (its region started left of the falls); in a vertical frame the wide view showed the middle of the picture and lost the falls off its edge, so wide views and the opening now aim at the marks; and an authored note side with no room let the note slide over its own bracket, so sides are preferences and a span's note moves inside its bracket instead.

## Limits

- Pictures only. Footage needs a frame-accurate clip under the camera; `freeze-frame-focus` does the freeze on footage today.
- One picture per scene; a side-by-side comparison of two frames is a later addition.
- Notes are placed by measured rules on estimated text widths, and the rendered-text audit checks the result; a very long note in a tight corner can still need a `side`.
