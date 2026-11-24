# Chinese ink films (INK-FILM1)

Moving pictures in Chinese brush ink (水墨), as data. Every mark is a brush mark from the [INK-RISO1 engine](ink-riso-press.md): nothing is filtered, nothing is downloaded, and the same film always gives the same frames.

| Pack | What it holds (`registry/video/ink/`) |
|---|---|
| `ink-film` | The engine: `ink-cel` (a painting in layers), `ink-motion`, `ink-reveal`, `ink-stage` (WebGL2), `ink-film` (the film as data), `ink-film-react` (stage and player), `ink-paint` (workers), `ink-lettering` (words and seals), `ink-picture` (a photograph as ink), `ink-pigments`, `ink-veil`, `ink-brush-kit` |
| `ink-motifs` | Subjects from a seed: `ink-land`, `ink-terrain`, `ink-place`, `ink-flora`, `ink-fauna`, `ink-folk`, `ink-marks` |
| `ink-cast` | Half figures in layers: 水月 `inkShuiyue`, 清風 `inkQingfeng`, 墨梅 `inkMomei` |
| `ink-studio` | `INK_BOOK` (every subject by name), composed scenes, the worker pool, the `ink-film` slot |

Storybook: **Video production / Film Looks / Chinese Ink** — Film, Characters, Scenes, Motifs, Reveals And Transitions, Titles And Seals, Any Picture In Ink.

## Make a film

```tsx
import { InkFilmPlayer } from "./components/video/ink/ink-film-react";
import { inkPainter } from "./components/video/ink/ink-paint-pool";
import { inkRiverScene } from "./components/video/ink/ink-scenes";
import { INK_BOOK } from "./components/video/ink/ink-subjects";

const film = {
  schemaVersion: 1, id: "river", title: "A river at night", fps: 30, paper: "#F8F1E3",
  size: { width: 1920, height: 1080 }, tall: { width: 1080, height: 1920 },
  shots: [
    { id: "river", seconds: 6, label: "A boat comes down a moonlit river", layers: inkRiverScene({ seed: 2, enter: 0.2 }),
      camera: [{ at: 0, x: -20 }, { at: 6, x: 30, zoom: 1.05 }],
      text: [{ text: "A lamp comes down the river.", at: [190, 250], size: 50, width: 640, align: "left", from: 1.3, tall: { at: [540, 180], align: "center" } }] },
    { id: "lady", seconds: 6, enter: { kind: "mist", seconds: 1.1 }, label: "水月 looks back over her shoulder",
      layers: [{ subject: "shuiyue", at: [960, 560], scale: 0.9, enter: { kind: "paint", at: 0.2, seconds: 3 } }] },
  ],
};
<InkFilmPlayer film={film} book={INK_BOOK} painter={inkPainter} />;
```

- **Layers** name a subject and its options (`subject: "massif", props: { kind: "pillar" }`), a place, `depth` (parallax; 1 is the picture plane), `enter`, `leave`, `motion`, and `tall` for what differs upright. `swarm` repeats a small subject up to 400 times: petals, leaves, rain, snow.
- **Ways in** `paint` (stroke by stroke, in the order the brush went), `bloom`, `wipe`, `mist`, `develop`. **Between shots** `cut`, `dissolve`, `blot`, `mist`, `brush`, `scroll`, `flood`.
- **Mounts** show a shot in a round `fan` or an album `leaf` instead of the whole page.
- **Scenes** give whole places as layers: `inkPeaksScene`, `inkRiverScene`, `inkTownScene`, `inkHeightScene`, `inkRainScene`, `inkLotusScene`, `inkAutumnScene`, `inkSnowScene`; `inkFlock` lays a skein of birds over any of them. Another seed is another place.
- **Check** with `inspectInkFilm(film, INK_BOOK)`: unknown subjects, transitions over 60% of a shot, ways in that outlast it, text under 2.6% of the height or too short to read.
- **Export** through `VideoExportStage`: it waits for the layers to be painted, then seeks frame by frame (stories `ExportWide` and `ExportTall`). Inside a film document use the `ink-film` slot.
- **Less motion:** `still` holds every frame whole. For a viewer who asks for less motion the player waits like that until they press Play.

## Add a subject

A subject is a page, its plates and a list of parts, back to front. Put it in the book: `{ ...INK_BOOK, heron: props => inkHeron(props) }`; workers need a book of their own (`serveInkCels`).

```ts
export const inkReed = (): InkSubject => ({
  id: "reed", label: "A reed", page: { width: 400, height: 900 }, plates: inkPlates(["ink"]), seed: 3,
  parts: [{ id: "stem", box: [60, 0, 300, 900], motion: [{ kind: "sway", from: [200, 880], to: [220, 60], amount: 14 }],
    draw: ({ page }) => inkSide(page, "ink", [[200, 880, 0.6], [206, 480, 1], [220, 60, 0.2]], 16, { tip: 0.9, belly: 0.3, dryEnd: 1.1, seed: 4 }) }],
});
```

- A part is one thing that moves as one. `poses` gives several drawings of it: a wing beat, lids, water threads.
- `box` is where its marks stay; a tight box paints faster. `ink-brush-kit` works it out (`inkMarksPart`).
- Motion: `sway`, `turn`, `breathe`, `drift`, `ripple`, `path`. All are functions of time, so any frame can be asked for first.

## Rules that decide the quality

- **Leave paper.** Water, sky, mist and snow are the paper. A scene that fills the page is not ink painting.
- **One hero per shot**, darkest ink and finest line on it; the rest paler with distance (`density`, `tone`, `blur`).
- **What a layer hides.** A cel multiplies its ink and covers with paper where it is solid. Cover every gap inside a figure (between face and hair, say) with `inkCover` in a film-only part, and let a robe or a root that stops without a line go out with `inkFade`. Look at the figure over a strong colour to find holes.
- **Painting order.** For `paint`, give parts their `turn` with `inkPaintOrder`, and name the face as `soft`: it comes up as a whole. A face that wipes on from one side looks broken, and one that comes mark by mark has holes for eyes.
- **Words.** On bare paper, never under or over a drawing; swarms fade near them. Measure it at both sizes: the darkest pixel under a caption should stay near the paper. Upright, keep captions near the top, clear of app buttons.
- **Calm motion.** A light wind is 4–16 units; nothing loops in step; birds and fish face the way they travel. Do not swing a travelling subject with `back`: it would go backwards.
- **Faces** come from a posed, measured head ([INK-RISO1](ink-riso-press.md)) and brush marks. Judge them by eye against real pictures, not with a face detector. A young woman has a short lower face, open lids and nearly level eyes; a young man has a longer face, narrow lids and a low brow loaded with ink. `eyeTilt` raises the outer corners of the eyes; a head turned about 25° is easier to make beautiful than one turned less. Give it its side (`side`: the jaw runs up to the lobe, the ear stands at brow to nose height; [measures](ink-riso-press.md)) and paint the ear in the hair's part, between the hair behind it and the hair over it, so a blink does not redraw it. Warm, lit skin, lips, eyes and the ear come from [layers over white](ink-riso-press.md#faces-in-layers-over-white-工筆); `tan` and `white` are its pigments. A robe closes the wearer's left side over the right.
- **Hair** follows the [hair rules](ink-riso-press.md): a few dark masses from one short part, cut with paper wedges. A lock that curves from the part past the temple borders each cheek, so the hairline is never an arch. Loops, coils and knots are thin at the foot and full at the turn. Keep the period's forms: for a girl a coil (髻) with a hollow hanging loop (垂鬟) and a tied tress, for a young man a crowned knot with the rest let down. Soft locks are [painted wet](ink-riso-press.md#hair-painted-wet).
- **Full-size frames cost time**, not correctness: draft at `pixels={960}`. A small figure is painted up to twice its size and shrunk, and a small box gets a smaller canvas, so fine lines stay whole.
- **Feet on the ground:** `inkSkyline(massif)` gives the rock's height at a place; see `inkHeightScene`.

## Limits

Layers are ink on paper, not a fluid simulation: wet ink does not mix between layers. Geese, swallows and butterflies have four to six drawings of a beat, so keep geese under about 120 px. Snowflakes only show against ink. Dry brush under about 12 page units breaks into dots. WebGL2 is required for the moving picture; `drawInkSubject` paints a still without it.

## Checked

Storybook in Chromium at both sizes, frame by frame for the cast, small figures, scenes, reveals, transitions and the demo film; export seek in both formats; text clearance measured under every caption of the demo film; reduced motion, keyboard and 320–360 px wide pages; the four packs installed and compiled in a clean app. 清風 and 墨梅 were redrawn after the owner found their first faces and hair awkward: pictures of handsome young men and of pretty young women in historical dress were studied side by side and none was traced or kept. The owner then found the jaw line and the ear odd; both were laid out again from six studied heads, with the neck, collars and near hair that touch them. Checked after that: blinks, cels over a strong colour, the bare head at six poses, and 水月's pixels (unchanged). The owner then asked for both to come closer to the studied pictures in hair, face geometry and eyes. Each was redrawn against one main picture, levelled on the irises, feature by feature; no picture was traced or kept. Checked after that: the blink at three openings, both figures over green, each painting itself, the motion of both stories, the demo film wide and upright, text clearance under their captions (234 or lighter of 255), and 水月's pixels (unchanged). The owner then still found small differences in hair, eye area, eye shadow, skin tone, lips, lip shape and lighting, and neither figure as pretty as the references. Both were repainted in layers over white, with tables of sampled colours and one feature at a time at high zoom; no picture was traced or kept, and ornaments, clothes and composition are our own. Checked after that: the blink at three openings, both figures over green and where the film cover shows outside them, each painting itself, the motion of both stories, the demo film wide and upright, text clearance under their captions (234 or lighter of 255), axe on all 34 ink stories, and 水月's pixels (unchanged). 清風's sword tassel has no cover. The drawings have not had an outside art review.
