# Page-Turn Story Scene

`page-turn-story` opens a physical book on a lit desk, moves in to reading distance, then
turns a leaf around the fixed spine to reveal the next illustrated spread. Supply a
`SceneTemplateSpec<"page-turn-story">` to `PageTurnStoryScene`. The caller owns playback and
supplies `frame`; the component creates no clock.

**Causal beat.** *Input:* a bound book of spreads. *Transform:* the camera moves from the
establishing view to reading distance. A leaf peels at its lower outer corner, bends
around the spine with a moving bend radius, trails through the air and lands with one
small hop. *Output:* the next spread, held long enough to read, with its caption.

**Beats.** `cueFrames[0]` ends the establishing shot (default 15% of the duration).

- **Establish (0 → cue):** the whole book on the desk, framed right of centre in landscape
  and low in portrait. The title rises word by word from frame 2 under its eyebrow. The
  camera is already dollying in and turning from frame 0.
- **Read:** the camera eases to reading distance over 40 frames. The title gives way to a small
  running head, and the spread's `caption` lands in the band below the book. During the hold, the
  landscape camera eases in towards the text page. In portrait it reads the text page, then
  pans to the plate.
- **Turn (`turns[k]`):** the camera starts moving 24 frames before the turn and settles 8 frames
  after it begins. It ends lower and wider, with headroom for the standing leaf. The caption
  leaves 16 frames before the turn. After the landing, the camera returns to reading distance.

**Page physics (`registry/video/stages/page-curl.ts`, renderer-free).** Each row of the leaf
is an inextensible strip, integrated by arc length from the spine, so paper never
stretches. Its tangent angle blends from the resting gutter curve on the start side to the
mirrored curve on the far side. The blend is uniform near the spine and bends towards the
fore edge from `bendStart`. Moving `bendStart` from 0.58 to 0.1 widens the bend through the turn.
Positive `deflection` leads with the fore edge (the peel); negative trails it (air drag);
`corner` tilts the bend line so the lower outer corner lifts first. A soft clamp keeps the
leaf above both page blocks with no crease. `leafBendAt(p, stiffness)` is the authored
turn: `stiffness` 0 is limp with a deep trailing curl, 1 is card. Normals come from the
deformed surface (central differences down the page, the integrated tangent across it).
The underside sits one paper thickness below along the normal. Turn progress, camera
and faces are pure functions of the frame (`bookMoment`, `cameraAt`, `bookFaces`).

**Book (`page-turn-book.ts`, optional Three.js).** `createPageLeaf` makes a front sheet and a
back sheet one thickness apart, with a paper-edge rim. `createPageBlock` makes each side's
block: a top that follows the gutter curve and carries a page face, plus fore-edge and
head/tail faces whose stacked-leaf lines follow that curve. `createPageTurnBook` adds the
rest of the set:

- rounded cloth-covered boards with squares, a spine and headbands
- the desk and a contact shadow
- a warm spot key with soft PCF shadows (the leaf shadows the page beneath and the desk)
- a hemisphere fill and an optional PMREM-filtered HDRI

Page faces are painted by `page-face.ts` in Canvas 2D in two passes:

- **Colour:** paper tint, paper detail, fibre speckle, ageing, a plate mark around the
  multiplied plate, and gutter shading.
- **Roughness:** ink and plates are glossier than bare paper.

The WebGL leaf and the 2.5D book both use these canvases. The rig never animates itself:
`update(state)` and one render per host frame. These pieces are exported for reuse, for
example by a book-to-world scene.

**Fallback.** The foundation stage carries no 3D dependency. `PageTurnStoryScene` supplies
the WebGL book through `PageTurnRendererContext`. Without it, when WebGL fails, or with
`renderer: "flat"`, a CSS 3D book draws the same pages through the same orbit camera. Its
leaf is 28 strips placed by the same curl integration and shaded by their own angles.
**Reduced motion** keeps the 3D book but locks the camera at reading distance. Each turn
becomes a cut at its midpoint, and the title and captions cut in on their beats.

**Inputs.** All visible copy is an input; nothing is generated.

| field | purpose |
|---|---|
| `documentTitle`, `eyebrow`, `credit` | title card, running head, provenance line |
| `spreads` | ≥ 2 `{ id, left, right, caption? }`; a face has `heading`, `text`, `image`, `caption`, `folio`, `layout` (`auto`/`plate`/`text`) |
| `turns` | one `{ at, frames? }` per turn (12–240 frames, default 44), ordered, non-overlapping |
| `direction` | `"left"` (default, leaves travel right to left) or `"right"` for right-to-left books |
| `stiffness` | 0..1, default 0.45 |
| `paper` | `color`, `ink`, `accent`, `roughness`, `thickness` (mm), `age`, `edgeColor`, `shadowOpacity`, `texture` maps |
| `book` | `pageWidth`, `pageHeight`, `blockThickness`, `boardThickness` in mm |
| `cover` | `color`, `material` (`cloth`/`leather`/`paper`), `roughness`, `maps`, `headband` |
| `environment` | `surface` (desk colour, roughness, maps), `light` (`azimuth`, `elevation`, `warmth` K, `intensity`), `hdri`, `backdrop` |
| `camera` | `establish`, `read`, `turn`: `{ yaw, pitch, zoom }` overrides |
| `typography` | `headingFont`, `bodyFont` (CSS font stacks; the demo uses a Mincho stack for Japanese) |
| `look` | `grain`, `vignette`, `warmth` (−1..1) |

Maps (`SurfaceMaps`) are tileable `{ color, normal, roughness, repeat }`. Colour maps multiply the
material colour, so ship neutral maps.

**Migration.** Version 1 `pages` (`{ id, heading, image, text? }`, ≥ 2) still validate and render.
`pageTurnSpreads()` turns each page into one spread: heading and text on the verso, the image
as a plate on the recto. `paper.shadowOpacity` is now optional. A spec may not give both
`pages` and `spreads`.

**Typography and safety.** Copy outside the book is DOM text sized against the stage short side:

- title: 10% (landscape) or 9% (portrait), capped so the longest word fits its column
- captions: 4.6–5%
- eyebrow: 2.7%; running head: 2.4%; credit: 2.3%

The page text is printed into the textures. Body copy starts at 3.4% of the page height and
shrinks to fit, down to 1.9%; it is never truncated. If it still does not fit,
`data-km-page-overflow` lists the faces. Line breaking treats CJK per character, keeps closing
punctuation with the character before it, and indents paragraphs (an ideographic space in CJK).
Justification falls back to ragged when word spaces would open rivers. A drop cap is used for
spaced scripts only. The current spread's headings, text, alt text and captions are announced
in a visually hidden live region. The scene forwards ref, DOM props, `className` and `style`.

**Honest states.** `data-km-book-state` is `loading`, `ready` or `error`; images are decoded
before anything is drawn and a failed image is reported, not substituted.
`data-km-book-renderer` says `webgl` or `flat`; `data-km-book-spread`, `-turn` and
`-turn-progress` expose the book state; the canvas reports `data-km-gl-frame`. The drawing
buffer is twice the composition size in both aspects.

**Verification.** Storybook frames were checked in 16:9 and 9:16, EN and JA, WebGL and flat,
and reduced motion. A rendered-bounds pass over title, eyebrow, running head, caption and credit
found no overlaps, nothing outside the stage, and no page overflow at the checked frames. Both
aspects were rendered to MP4 at 24 fps. Human review at normal speed remains open.

**Limits.**

- Paper has no translucency (a backlit leaf does not show through).
- The leaf's shadow on the page below comes from a shadow map only, with no ambient occlusion.
- Block thickness does not change as leaves move from one side to the other.
- The curl is an authored, kinematic model, not a cloth simulation.
- The upright leaf is seen edge-on for a few frames, by design.
- Remote images need CORS.

This is not a claim of photorealism.

Storybook: **Video production / Scene Templates / Page Turn Story** (language and renderer
controls; play, pause, seek, 16:9/9:16 and reduced motion). Demo assets:

- plates from Ernst Haeckel, *Kunstformen der Natur* (1904), public domain, via Wikimedia Commons
- paper: ambientCG Paper001 (CC0)
- linen book cloth, American walnut veneer and the Reading Room HDRI: Poly Haven (CC0)

Provenance is in `assets/THIRD_PARTY_ASSETS.json`. The page copy was written for the demo. No audio.
