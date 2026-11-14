# Crayon character films — process research and implementation gaps

**Date:** 2026-11-14. **Scope:** CRAYON1 in `kumiki-ui`. This is a source-linked
production-method study, **not** a claim that all referenced videos were
downloaded and inspected frame-by-frame. Video titles, filmmaker statements
and documented demonstrations are distinguished from design interpretations.
References are for inspiration; no audio, footage, character design or
artwork was copied.

## Sources reviewed

| Film / documented demo | Verified making-of evidence | Transferable visual technique |
| --- | --- | --- |
| [Hannah Jacobs — *It's OK* (Vimeo)](https://vimeo.com/112564769) and [director interview](https://directorsnotes.com/2014/12/04/hannah-jacobs-tom-rosenthal/) | Jacobs describes **traditional light-box animation**, made entirely with pencil, crayons and oil pastels on paper. [Later process interview](https://www.wix.com/playground/post/finding-magic-in-the-mundane-with-animator-hannah-jacobs) describes line art first and coloring afterward. | Character construction and expressive timing precede pigment; the line is a meaningful authored action. |
| [Gotye — *Giving Me a Chance*](https://vimeo.com/49085099) and [interview with Gina Thorstensen and Nacho Rodríguez](https://heisthewallrus.wordpress.com/the-wall-nuts-interview-with-gina-nacho-giving-video-coming-soon/) | They describe **122 individually crayon-painted frames** in a moving landscape/character shot, plus scanned paper cutouts, separately painted background layers, and digital multiplies. | A still, seeded texture simply carried through space does not capture the expressive material differences of a redrawn frame. |
| [Meg Myers — *Running Up That Hill*](https://www.thisiscolossal.com/2019/07/meg-myers-music-video/) | 3,202 black-and-white printed frames colored by more than 2,100 children; coloring variation becomes the motion texture. | Color may be intentionally uneven or change between exposures without losing character continuity. |
| [Pencilmation — *You Drive Me Crayon*](https://www.youtube.com/watch?v=smrNB5L5cn0) | Creator description identifies a story where existing doodle characters are drawn with crayons. | The drawing process can motivate a character **coming alive**, instead of being only a reveal transition. Exact stroke ordering needs frame inspection. |
| [Toniko Pantoja — *Crayon Dragon*](https://vimeo.com/41314639) | Synopsis: a painted illustration becomes a living world; a girl interacts with the character. | A material-to-character transition can be a storytelling event, with constraints for interacting with drawn surroundings. |
| [Kristi Sword — *Work Process I*](https://vimeo.com/113245451) | Described as a process film where wax-crayon dots are applied one-by-one using a heated wax pen. | Material can build as **individual deposits**, not a solid opacity mask. This is a different medium treatment from ordinary dry-stick crayon. |
| [Interlace — hand-drawn sketch animation](https://interlacevideo.com/resources/blog/whiteboard-animation-drawing-hand) | The Oct. 2026 product walkthrough explicitly distinguishes stroke-by-stroke tracing from old patch wipes; examples include **outline then color**, sensible neighboring stroke order and a drawing hand. | Each line/path should have an authored timeline; a floating hand/tool should only be claimed when the tip follows the actual path. |
| [Special Art Books — wax techniques](https://www.specialartbooks.com/blogs/stories-and-ideas/crayon-coloring-techniques) | Practical guidance: trace sharp outline; fill with directional strokes; light pressure before heavier, blending/scraping for surfaces. | A broad flat base fill at the first exposure makes the mark-making stage feel digital. Preserve paper pores, partial coverage, direction and layering. |

## Baseline gap audit

| Observation in main (CRAYON1) | Compared to research | Priority |
| --- | --- | --- |
| `WaxRegion` fades an entire base shape to **58% opacity from the beginning**, and only afterward accumulates hatches | A large amount of color exists before any tool could have filled it; unlike contour-first hand drawing | **P0 — this PR** |
| Native dry-wax outlines are mostly faded full paths rather than distinctly timed start-to-end tracing of a silhouette | The contour is less legible as an action | **P0 — this PR** |
| The character actor exists as a finished multi-part rig before its storytelling action | The act of *creating* the character is missing | **P0 — this PR** |
| No guides that retire when the permanent mark replaces them | Human sketch-to-finish craft process not illustrated | **P1 — this PR** |
| Motion and surface grain are pinned to the same part through every frame | No authored redraw-frequency/material variation equivalent to frame-by-frame scanned crayon | **P1 next** |
| Strokes of a single complex silhouette cannot be semantically split into multiple controlled sub-contours without authoring them separately | Hand order, pauses, and corrections are harder to orchestrate | **P1 next** |
| Optional true drawing-hand/tool tip cannot be guaranteed to track a vector path at each frame | A hand-cursor overlay would be dishonest if its tip did not match the drawn trace | **P2 — defer** |
| No first-class wax scraping/rub, eraser debris, pigment displacement or multi-color pressure accumulation | Physical material signature still partial | **P2 — defer** |
| No independent normal-speed reference comparisons of complete 16:9/9:16 encoded films | Static browser proof cannot grant artistic acceptance | **Mandatory visual QA** |

## Implemented technique: authored construction windows

Optional `CrayonWaxConstruction` has **order** (`outline-first` or
`fill-first`), **outlineFraction** and **glaze** (subtle binder, 0–0.45).
At a bounded absolute frame, the native silhouette is first traced using
`WaxLine`; its visual length grows along its actual SVG geometry. The existing
seeded wax-mark generator deposits marks only during the subsequent coloring
window. A restrained `glaze` can preserve overall form without making the
entire enclosed area appear before the strokes. Existing scenes with no
`construction` are **bit-for-bit unchanged in their rendering contract**.

An optional validated `exitFade` on a scene element retires lightly
sketched construction guides while leaving the permanent character untouched.
This is an *illustrative fade*, **not** physical erasing of deposited wax.

The original 450-frame `crayonCharacterDrawScene(aspect, options)` produces
the same character identity in both landscape and portrait from explicit
phase timing: blank paper → pale sketch axes and silhouette guides →
tail/body/ears contour construction → directional wax hatching → face/muzzle →
a softly drawn background → flower details and a small acting payoff. Moving parent joints and
mouth/eye cues begin only after drawing construction has completed.

Interactive previews:
- **Video production / Film Looks / Crayon Scene Engine / Character Draw In**
- **Video production / Film Looks / Crayon Scene Engine / Character Draw In Portrait**

Storybook controls compare outline-first and fill-first, outline duration,
wax glaze, paper tooth, speed, loop and exact frame. Core CRAYON1 remains
source independent and JSON-validatable.

## Separate acceptance gates

1. Use Playwright to capture untouched paper, guide, silhouette, start of
   pigment, layered pigment, facial details and finished-acting frames in both
   aspects. Look for immediate full-color silhouettes, unnatural gaps and
   guide ghosts.
2. Compare full normal-speed encoded films (30fps) to the cited films with
   written production criteria. Final quality remains **unapproved** without
   independent human review.
3. Check 9:16 lower caption-safe region and 16:9 typography legibility.
4. Test deterministic out-of-order frame seeking, reduced-motion final state,
   invalid authored construction values, source compatibility and rendering
   budgets for dense hatching.
5. Next iteration: per-exposure redraw textures, authored stroke-specific
   pressure/speed, and coherent paths for a truly connected crayon nib.

