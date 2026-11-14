# Editorial paper-collage explainers — reference study (COLLAGE1)

**Date:** 2026-11-14 · **Used for:** [COLLAGE1 spec](../component-specs/editorial-collage.md) · **Gate:** [doc 35 §3.4](../35-material-native-film-styles-implementation-roadmap.md#34-mandatory-reference-review-gate)

The genre: animated news explainers built from cut paper, archival-print textures and hand annotation, popularised
by Vox's video team and widely imitated ("Vox-style"). We study principles only. Kumiki ships no Vox name, logo,
footage, frames, characters, fonts or audio, and no story from any reference.

## What was actually inspected

Honest limit: no reference video was watched at normal speed in this session (no video playback in the agent
environment). Everything below is from **written sources read on 2026-11-14** plus the general craft vocabulary;
the owner's normal-speed comparison is still required by doc 35.

| Source | Owner / rights | What it says that we used |
| --- | --- | --- |
| [How Vox uses animation to make complicated topics digestible](https://www.storybench.org/?p=21229) | Storybench interview with a Vox video art director | Hand-made construction-paper art; visual metaphors for data (a paper clock becoming a chart); a recurring motif per video; *don't make it look perfect or it reads as an ad*; maps are checked for accuracy. |
| [Estelle Caswell on Vox Earworm](https://schoolofmotion.com/blog/estelle-caswell-vox-podcast) | School of Motion podcast | Story first, visual evidence over generic imagery; motifs that build across a video; transitions are rare — cuts preferred; restraint: hold one image for seconds. |
| [vox-explainer-skill style guide](https://github.com/CK42BB/vox-explainer-skill/blob/main/references/vox-style-guide.md) | Third-party imitation guide | Cream paper base, charcoal ink, one accent per piece; cutouts with 3–6 px white sticker borders and soft shadows; halftone accents; tape at corners; slow 3–5 % push-in, layer parallax, slide-in-and-settle; no 3D orbit, no glossy lighting, caption ≤ 2 lines. |
| [vox-explainer (MIT)](https://github.com/bestuserever121/vox-explainer) | Third-party tool, MIT | Paper looks (creased paper, riso duotone, graph paper), halftone photo cutouts, arrows between panels, camera visits panels then pulls out to reveal the sheet; timing anchored to sentences. |
| [Why your motion graphics never look like Vox](https://trydemotion.com/blog/motion-graphics-like-vox) | Third-party blog (unsourced) | Five to ten parallax layers per scene; three-to-four-colour palettes; bold heavy headline type; mix fast moves with held frames; time changes to the voice. |
| [Natural Earth](https://www.naturalearthdata.com/about/terms-of-use/) | Public domain | 1:110m land outlines for paper maps. |

## Principles → engine decisions

| Principle | COLLAGE1 decision |
| --- | --- |
| Hand-made, not perfect | Torn/cut edges per piece with a white fibre core; stop-motion on twos with sub-pixel boil; marker lines re-drawn on twos. |
| Physical layers | Every piece casts a light-direction shadow scaled by `lift`; parallax `depth`; pieces drop, slide and stamp onto the board. |
| Print texture | Real amplitude-modulated halftone dots (dot area follows the shading ramp) and a luminance halftone filter for "archival" prints; newsprint/kraft/cork/card boards. |
| Annotation | Marker circles/arrows/underlines and highlighter sweeps that draw on; stamped labels. |
| Type as motion | Condensed headline words on pasted-up slips revealed word by word; one caption per beat on a paper slip pinned to the frame. |
| Maps | Torn paper continents from public-domain coastlines, geo-placed pins and labels, dashed routes that draw, objects that follow them. |
| Restraint | Cuts by default; one paper move (cover sheet or tear) where a chapter turns; calm camera with a slow push. |
| A motif that builds | The showcase's clock recurs in every shot and resolves in the payoff. |

## Not adopted

Photographs of living people (rights; the archive film uses objects, buildings and a public-domain page instead),
lip-sync from audio (not available yet), 3D camera moves (off-genre), satellite imagery (licensing), and any specific
palette, typeface or layout identified with one publisher.

## Round 2 — the different kinds of Vox video (2026-11-14)

**What was inspected this time.** Storyboard frames (YouTube's 160×90 scrub thumbnails, 48 evenly spaced frames per
video), the designed thumbnails and the 480 p auto-frames of 19 Vox uploads, studied locally and never committed:
Darkroom (*How the Hindenburg killed an entire industry*), Atlas (*Kashmir*, *Ukraine*), Almanac (*Leonardo's 1502
map*), Earworm (*Radiohead's "Videotape"*), Borders (*India & Pakistan*), *Who made these circles in the Sahara?*,
*Why the US banned Red 3*, *Why Americans love big cars*, *Why the Supreme Court made this map illegal*, *Why does this
forest look like a fingerprint?*, *Creatine, debunked*, *The untold history of diabetes and Black Americans*, *Why the
right can't stop talking about communism* and recent host-led uploads. Plus the MIT-licensed
[SousekiL/vox-style-video](https://github.com/SousekiL/vox-style-video) notes, which measure five Vox videos and a
120-thumbnail survey, and the [sadekxD collage skill](https://github.com/sadekxD/vox-style-collage-video-skill) and
[gilvy "Vox photographic look"](https://github.com/sukirman1901/gilvy/pull/21). Still not watched at normal speed.

### The registers

| Register | Where it shows up | What it is made of | COLLAGE1 support |
| --- | --- | --- | --- |
| **Printed photo cut-out** | Thumbnails across the channel, cold opens, Kahlil Explains, Gray Area art | Real photos cut out, greyscale/duotone with coarse halftone and grain, white (often torn) sticker border, flat saturated colour field with a corner dot gradient, a big disc behind the subject, cut-out lettering chips, paper scraps, tape | `image` `cutout` + `sticker` + `treatment`; `flat` board + `halftone`; kit `photoCutout`, `cutLetters`, `scraps` |
| **Archival evidence (light)** | Almanac, Darkroom, history explainers | Full-bleed or bordered B/W prints under a slow, never-stopping push; red caption tags (place, date); film negatives and contact prints; the camera drifts during holds | `image` `kenBurns`; kit `archivalPrint` (cream border, tag), `filmNegative`; camera drift |
| **Document board** | Red 3, Supreme Court map, Sahara (Reddit post), diabetes | Real pages (laws, rulings, journals, posts) at rest, then a push onto the passage; yellow highlighter on the exact words; the rest dimmed; typewriter scans | kit `documentScan` (highlights in scan pixels, e.g. OCR boxes), `spotlight` node, `highlight.style` |
| **Dark map board** | Atlas, Borders, Supreme Court map | Slate stage and near-black water, shaded relief clipped to land, flat saturated region fills, hatching for contested areas, giant cropped place names, labels in boxes, years in outlined boxes, red-bar chapter captions, white hand-drawn arrows | `slate` board + `grid`; map `relief`, `coast`, region `hatch`; kit `giantLabel`, `labelBox`, `yearBox`, `chapterCaption` |
| **Data graphics** | Red 3, big cars, communism (Pew-style donuts), Supreme Court | Clean bars, donuts and lines on cream or dark, one highlight colour, direct labels and a source line | `barChart`, `sourceLine`; donut/line charts not built yet |
| **Music / Earworm** | Earworm | Dark grid stage, neon brush blocks behind words and beats, tracked caps, footage of players | `slate` + `grid`, `highlight.style: "brush"`; beat grids not built |
| **Host-led / reported** | Gray Area, America Actually, Borders, Sahara | Presenter or interview footage with collage graphics laid over, lower thirds, reporter's camera | Out of scope for a frame renderer without footage; lower thirds possible with `labelBox` |
| **Paper collage + characters** | Construction-paper explainers | Cut paper, puppets, stop-motion on twos | Round 1 (the paper film) |

**Rules taken from the study.** Evidence keeps its tonality (natural treatment for the document and the prints;
halftone/duotone only on decorative cut-outs). Every factual picture carries a source line. One accent colour does
the pointing (highlighter yellow on light boards, red on dark). Something is drawn on in most shots (highlight,
ring, arrow). Cuts by default; paper moves only at chapter turns. The camera never freezes on a document or a print.
