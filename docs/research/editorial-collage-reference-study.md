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

Photographs of real people (rights), lip-sync from audio (not available yet), 3D camera moves (off-genre), and any
specific palette, typeface or layout identified with one publisher.
