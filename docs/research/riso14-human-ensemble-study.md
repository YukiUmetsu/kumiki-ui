# RISO14 — two original human figures and a source-anchored print exchange

Status: **an independently designed second human and blocking study**, not a signed-off short film. Designed from the human-character Risograph references in [RISO12](riso12-human-character-reference-atlas.md), with original hand-authored source paths.

## What ships

- **Paper Artist**, a second human with different head construction, shorter bob/flared hair silhouette, different face outline and expressions, asymmetrical collar/scarf, red long coat, blue garment-hem facets, and a retained articulated multi-digit rig. Compatible reusable joints are shared with Courier where appropriate; source face/hair/coat regions are original, not transformed copies.
- **Source-linked construction sheet** `RISO_PAPER_ARTIST_SHEET` maps each drawn part to its actual contour/joint and exposes interocular, nose-to-mouth, thumb-index and shoulder measurements. Unsupported true-side, back, top and three-quarter views remain explicitly unavailable.
- **Two-human Storybook scene** in the existing Risograph ArtCraft CSF. Fixed-width 16:9/9:16 stage, independent blue/red ink plates, paper-backed actor silhouettes, per-frame timeline controls and a two-hand print-sheet study. The original Courier remains the first actor.
- **Analytic contact points** in `evaluateRisoHumanEnsemble(frame, aspect)`: source right-hand and recipient left-hand positions are extracted from real FK evaluated joints. The sheet unfolds 126–160 and stays attached to both endpoints for the exchange. No random alpha or synchronous stateful simulation.
- **Visual debug mode** reveals contact anchor endpoints so source and paper geometry can be audited under motion. Paper is a prop; characters remain fully opaque.

## Scope limitations

1. Reusing a general hand/leg rig is intentional; reusing the *same face* as a new character would not be acceptable. Body proportions and upper-limb structure still share many primitives and need further distinct anatomical work.
2. The letter is an analytic blocking prop, not a true two-body IK solver: no force coupling, finger compression, paper fold physics or hand-surface collision response.
3. Full artistic acceptance requires normal-speed video review, real reference-specific cropped masks/ArtCraft axes, more figures and interactions, and production print-screen calibration.
4. Existing media renderer is reused; no second film engine, external image, or special runtime dependency.

## ArtCraft five-axis criteria

- **Topology:** head and hands stay connected, all source regions mapped, letter endpoints coincide with real hand anchors at/after frame 160; no hidden automatic body alpha.
- **Flow:** asymmetric hair, coat and scarf draw with parent anatomy; fingers inherit hand roots and move independently; printing sheet traces between hands.
- **Stroke pressure:** taper contour edges, garment seams and detailed face; no giant ink discs covering facial expression.
- **Rhythm:** intentionally different coat, hair and facial proportion rhythms between the two original figures.
- **Microtexture:** print dots remain tied to stage; uniform per-frame randomness is forbidden; compare actual halftone density by source/film scale.

## Quality checks

`npm run typecheck`; `npx vitest run --project unit tests/riso14-human-ensemble.test.tsx tests/riso13-anatomy.test.tsx tests/riso-character-paper-clearance.test.tsx`; Storybook production build; Playwright screen captures of the ensemble and all Risograph stories in portrait and landscape; encoded 240-frame film where supported.

No copyrighted source imagery is bundled. Initial reference sources: [Uma Joana](https://ogaleria.com/products/lets-look-at-the-trailer-ii-by-uma-joana), [Mina Braun](https://peopleofprint.com/best-of/pop-member-showcase-21-riso-prints/), [Natalie Andrewson](https://www.natalieandrewson.com/products/6-makers-series-risograph-prints).
