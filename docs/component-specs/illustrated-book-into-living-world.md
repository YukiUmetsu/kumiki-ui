# Illustrated Book into Living World Scene

`illustrated-book-into-living-world` establishes a tactile book on a table and turns a
physically curved page. It then pushes into the new spread's illustration until the
painting dissolves into the living scene it depicts. Supply a
`SceneTemplateSpec<"illustrated-book-into-living-world">`; the caller owns playback and
supplies `frame`.

This is its own stage (`registry/video/stages/illustrated-book-stage.tsx`). It does not
change `page-turn-story`; shared page-turn pieces can be consolidated later.

**Causal beat.** *Input:* an open book whose spreads pair text with an illustration.
*Transform:* a leaf bends and turns about the spine to the next spread. The camera rises
and pushes into its illustration, and the painted plate gives way to the photograph it
was made from. *Output:* the world, held alive under the chapter title.

**Beats.** `cueFrames` are *dock* (first turn), *reveal* (push) and *resolve* (world
title).

- **Establish (0 → dock):** the book settles on the table from frame 0 (ease-out
  push), under window light, with the cover boards, page-block edges and binding shadow.
- **Turn (dock → reveal − hold):** spreads turn in order, sharing the time evenly. Each
  turn uses 85% of its slot, and the rest is reading time.
- **Push (reveal → resolve):** tilt eases from 24° to 0 while the book scales so the portal
  art covers the frame. Page text fades early so it never pixelates. From 42% of the push, the
  world opens inside the art box through a soft radial dissolve.
- **Resolve:** the world wakes (light sweep, a drifting mist band, motes and a slow push);
  `title` rises word by word, then `line`.

**The curved leaf.** `leafStrips(progress)` returns 24 strips. Each strip's angle φ(s) =
θ − bend·s^1.6 (+ a small recovery term late in the turn), clamped to 0..π. Strip
positions integrate cos φ and sin φ along the page, so the sheet is a continuous curve: it
lifts from the spine with its free edge trailing, and lies flat at both ends. Each strip
renders its slice of the outgoing art page on the front face and of the incoming text page
on the back (`backface-visibility`). Faces are Lambert-shaded from φ, and the page beneath
takes a shadow proportional to the curl. This is CSS 3D with real per-strip geometry; it
is not a cloth or paper simulation.

**The match.** The world image is rendered inside the portal art's own box. Validation
requires the portal art and the world to share an aspect (within 2%), so the dissolve is
registered at every frame of the push, not only at its end. For a painterly match, make the
page art from the world plate. The demo's art is an offline Kuwahara/ink/gouache rendering
of the world photograph.

**Inputs.** All visible copy is input.

| field | purpose |
|---|---|
| `spreads` | 2–4 `{ id, label?, heading, text?, art, caption? }`; the last art is the portal |
| `world` | the living scene, same aspect as the portal art |
| `title`, `line` | held over the world |
| `surface` | table texture |
| `book` | `cover`, `paper`, `ink` colours |
| `light` | warm light colour of the waking world |
| `look` | `grain`, `vignette` |

**Typography and safety.** Book print is diegetic: it is judged visually at rest
(heading about 7% and body about 3% of the short side in 16:9) and is ignored by the overlay
bounds check while the camera pushes through it. The title is 3.2em (16:9) or 2.9em (9:16),
capped by `fitLongestWord`, over a bottom scrim. In 9:16 the landscape spread keeps table
margin above and below; a portrait-native single-page layout is a possible extension.
Reduced motion cuts to the portal spread at dock and to the world at reveal, with no leaf,
motes or drift.

**Verification performed.** Storybook frames were checked in 16:9 and 9:16 at establish,
mid-turn, landing, the read hold, mid-push, the dissolve, arrival and the final hold, plus
reduced motion. Targeted tests cover the leaf geometry, the beat order, reduced motion and
aspect validation. Human review at normal speed remains open.

Storybook: **Video production / Scene Templates / Illustrated Book Into Living World**.
World: [Austrian mountains over a lake](https://commons.wikimedia.org/wiki/File:Austrian_mountains_over_a_lake_(Unsplash).jpg)
by Michael Fruehmann (CC0). Page art is an illustrated rendering of that photograph and of
[Clearing in the New Forest](https://commons.wikimedia.org/wiki/File:Clearing_in_the_New_Forest.jpg)
(GothicGolem29, CC0). The table is Poly Haven
[Dark Wooden Planks](https://polyhaven.com/a/dark_wooden_planks) (CC0). The story copy is
original placeholder text. The demo has no audio.
