# ArtCraft v7 · source-confirmed ear/hair shadow repair

Status: **technical geometry/material improvement; human-portrait artistic approval BLOCKED**.

## Mandatory reference-first investigation

The original authorized anatomy source remains [Christopher Campbell's CC0 photograph, *Brunette woman portrait*](https://commons.wikimedia.org/wiki/File:Brunette_woman_portrait_(Unsplash).jpg). There is NO artist-owned portrait or texture in source code. The photo was reviewed in the actual 285×318 Storybook 540×600 proof crop, not from an invented SVG face.

Technique-only studies:

- [Jesse Lane](https://www.theartguild.org/home-2/the-portrait-in-colored-pencil-workshop-with-jesse-lane-june-13-14-2020): preserve deeply colored occlusion shadows under finely shaded orbital structures, not disconnected paper-white patches.
- [Elena Pancorbo's colored-pencil portraits](https://www.elenapancorbo.com/): intentional hair/skin contact and facial-value hierarchy before fine strands. No artist contours traced.
- [Justin Maas / Blick / Lyra Polycolor](https://assets.ctfassets.net/f1fikihmjtrp/3M5deVdW8BF7XIDQvunZPx/fcf171dc2381a62fb64e7b58fc9d837b/LYRA_Combined_PDF.pdf): observe actual reference proportions, establish value blocks then layered colored-pencil details.
- [Kirsty Partridge, drawing skin](https://kirsty-partridge.s3.amazonaws.com/wp-content/uploads/2021/10/11162613/Drawing-Skin-Coloured-Pencil-Guide.pdf): match surrounding value before blending paper highlights, avoiding accidental blank skin/shadow separations.

## Mechanism and corrected geometry

The PR #360 screenshot had a vertically elongated **white wedge beside the ear**, where the licensed photo had an essentially black connected region. The existing code classified deep near-neutral hair pixels as background because they lacked the auburn chroma present in the outer hair fibres. Simply drawing additional eyelash detail or more global scumble could not restore the missing silhouette.

The new measured polygon `EAR_CONTACT_SHADOW_SCREEN` represents **only the observed left ear/back-hair contact** in the same 608×343 source screenshot already used by the contour system. Source observation uncertainty is still ±4 review-screen pixels. It does **not** add a universal semantic face detector. A candidate is treated as dark contact only if it is in the registered enclosing hair geometry and its real input pixel belongs to the dark reference value range. Green garden pixels are explicitly rejected by synthetic regression tests.

A separate `hair-occlusion` zone deposits actual **source-directed, individually drawn** dark graphite/earth strokes before root-aligned hair fibres. No photographic image, bitmap mask, flat black fill or generated drawing is embedded into the final paper-only plate. A narrow registration tolerance still separates the photographed flesh from hair where rounding could otherwise cause false positive mask ownership.

## Actual Chromium evidence: initial rejection → V2 repair

The 285×318 browser-rendered licensed reference crop was directly measured, with seven-by-seven optical samples around (75,230); lower values are darker:

| Actual source and output | Before repair, PR #360 | Shadow-polygon V2 (CI 43692345063) |
| --- | ---: | ---: |
| Reference black ear lock | 3.3 / 255 | 3.3 / 255 |
| Pencil-rendered ear lock | ~113 / 255 | **10.0 / 255** |
| Difference at that anchor | ~110 / 255 | **6.7 / 255** |
| Result at 3× | Spurious ivory wedge down to the hair edge | Black contact mass restored |

Landscape V2 and portrait V2: source 3.3 and 3.1; dry pencil 10.0 and 10.5 respectively. Proof image [CI run 43692345063](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43692345063), artifacts `artcraft-cc0-landscape-hairline-occlusion-3x.png` and `artcraft-cc0-portrait-hairline-occlusion-3x.png`. These are actual screenshots of source and rendered canvases, not photographs of another artist's paintings. The screenshot's raw file SHA is not confused with the licensed source's original-file SHA.

The V2 code temporarily exceeded the established per-portrait budget (121,232 versus 120,000 maximum strokes on the fixed synthetic head), so the final implementation uses fewer but better-spaced shadow overtraces. Source-connected hair mass strokes supply the broad dark region. The final budget and output must be verified on the actual final commit; prior success is not enough.

## Storybook and continuous verification

Within the **existing** `Video Production/Film Looks/Colour-pencil` group, the four-shot portrait construction page now includes a 3× ear/hair contact comparison and a numeric source/drawn probe. Enlarged screenshots are visual QA only; source photography never becomes the exported dry-pencil artwork. Real-browser tests assert both original photo-derived and pure-pencil canvas pixels at 16:9 and 9:16, preserve normal video export, and enforce a source-dark/drawn-dark gate. Unit tests enforce source-mask safety, deterministic ink marks, no garden-color hair and the stroke-count ceiling.

**Still rejected as a finished character.** Eye/lip anatomy and hair-root structure require better independent source/output landmark registration and 1×/3× pencil-tooth review. The new proof evaluates *one author-measured source-specific occlusion*, not 18 independently approved facial landmarks or professional likeness.
