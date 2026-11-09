# Title Sequence

**Registry item:** `title-sequence` (`registry/video/title-sequence.ts`, `title-sequence-react.tsx`): the timing, the cut edges, the checks and the renderer. `film-document` depends on it.

**In a film:** a `"recipeId": "title-sequence"` scene, usually first.
**Research:** [32 — Professional video recipes](../32-professional-video-recipes-research.md): the P2 "Title sequence" recipe and §10.

## Purpose

Open a film on one symbol for its story, with its title set into it. Saul Bass condensed a film into one symbol; Kyle Cooper's titles work as a metaphor for the story, and some were made by hand on a tabletop (grade C, practice and criticism). This recipe makes that kind of opening in cut paper: a few flat pieces with scissor-cut edges that form one symbol, then the title.

## How it plays

1. **The pieces arrive one at a time.** Each slides in from an edge, turning a few degrees and settling square, or is set down, growing from a little smaller as a piece dropped onto a table. Its shadow falls further while it is in the air and tucks in as it lands.
2. **On twos.** By default the motion holds each drawing for two frames, the stop-motion cadence (`cadence: 1` is smooth).
3. **The title is laid in** word by word, a word every three frames with no fade, into its box. Every word is laid out from the start, so the words already down never move.
4. **The credits** follow the same way.

The ground is paper, with a fine grain multiplied over it and the pieces. Each piece's edge is cut by a seeded rule (`rough`, 0 to 1), so it looks cut by hand and is cut the same way on every render.

## Content

```json
{
  "label": "A title sequence in cut paper: a black cliff slides in, a blue river … spills over the edge …",
  "canvas": { "width": 160, "height": 90 },
  "shapes": [
    { "id": "cliff", "points": [[100, 8], [152, 8], [152, 82], [122, 82], …], "color": "#1b1a17", "from": "right", "at": 8, "frames": 14, "rough": 0.5 },
    { "id": "fall", "points": [[152, 6.2], [152, 10.4], [108, 10.4], …], "color": "#24578a", "from": "top", "at": 24, "frames": 12 },
    { "id": "sun", "points": [ … ], "color": "#c8402e", "from": "down", "at": 54, "frames": 10, "rough": 0.25 }
  ],
  "title": { "text": "Where water begins", "at": 86, "box": { "x": 15, "y": 33, "width": 78, "height": 9.5 } },
  "credits": [{ "text": "Photographs from Wikimedia Commons, CC0", "at": 150, "box": { "x": 15, "y": 47, "width": 78, "height": 3.6 } }]
}
```

- The canvas is fitted whole into the frame and centred; the ground fills the rest.
- A line's type size is its box's height (78% for the title, 70% for a credit).
- A piece the colour of the ground cuts a streak or a window into the pieces under it, as in paper.

## Checks

| Code | Severity | What it catches |
|---|---|---|
| `title-canvas`, `title-symbol`, `title-text` | error | No canvas, no pieces, no title |
| `title-id`, `title-shape`, `title-box`, `title-order` | error | A missing or repeated ID; a piece off the canvas or under three points; a text box off the canvas; anything outside the scene |
| `title-short` | error | The last line cannot be read before the scene ends |
| `title-many-pieces` | warning | More than twelve pieces: a picture, not a symbol |
| `title-before-symbol` | warning | The title arrives before the symbol is whole |
| `title-rushed` | warning | A line has less than its reading time before the next arrives |
| `title-long`, `title-credits` | warning | A title over six words; more than four credit lines |
| `title-overflow`, `title-outside` | warning | In an output of this size, a line is wider than its box (estimated from its type size), or leaves the safe area |

## In a film

Moments: `symbol` (the last piece settled), `title`, and `credit-1`, `credit-2`, …, for a sound on each. Speed ramps above 1.3× are warned about.

**Example.** [`examples/film/title-sequence.film.json`](../../examples/film/title-sequence.film.json), "Where water begins": a black cliff slides in; a blue river runs along its top and spills over the edge as a widening fall, three cream streaks cut into it; a pool slides in beneath; a red sun is set down; the title is laid in beside them, and a credit for the photographs.

**Storybook, Video production → Title Sequence:** `CutPaper` (on twos) and `Smooth` (on ones).

## States

- **Reduced motion.** Pieces appear in place at their time; words still land one by one, as they carry no motion.
- **Text.** The title and credits are HTML, measured by the rendered-text audit; lines still being laid in are marked as entering.

## Evidence (2026-11-09)

- **Tests.** `tests/film-document.test.ts`, "title sequence": stop-motion holds on twos, pieces settling, words landing, reduced motion, repeatable cut edges, every check, and the example's moments.
- **Render review.** Frames 14 to 264 at 1920×1080: the rendered-text audit reports no problems after the opening frame's empty page. The first symbol was a blue bar beside the cliff, which read as a column, not water; it was recut as one piece running along the clifftop and spilling over it, with streaks cut into the fall. The first title box overflowed and left the safe area, which the output check caught.

## Limits

- Pieces are polygons; curves are drawn with many points.
- The canvas is fitted whole, so a 16:9 symbol is small in a vertical frame; draw a second one for it.
