# ArtCraft 9.1 — F1 alar cartilage and labial planes (source-registered experiment)

**Status: draft research / release REJECT.** This is a single anatomy + wax-volume iteration within existing draft [PR #281](https://github.com/YukiUmetsu/kumiki-ui/pull/281), not a finished character. Source identity remains Christopher Campbell's 2015 [CC0 image](https://commons.wikimedia.org/wiki/File:Brunette_woman_portrait_(Unsplash).jpg). It is a three-quarter photographed portrait, not a generic front-facing face. Use the same 608×1082 source-browser capture and 18 frozen source points in `CRAYON_PORTRAIT_AUDIT`, not the unrelated B1 figure.

## Observed source and negative-control deconstruction

| Source anchor (screenshot px) | Anatomical relationship | Prior native candidate defect | Source-informed constructed response |
| --- | --- | --- | --- |
| root (363,522) → tip (411,631) | bridge turns to an asymmetric oblique nasal bulb | nose shadows on near/far sides did not connect into tip volume | add `nose-septal-transition` linked to tip and alar cartilage, under an existing forehead/cheek plane |
| near nostril (399,643) | minute undercut lies beneath source's near alar wing | thick (2.3px) dark arc and separate round brown patches looked like two icon nostrils | soften/widen underlying alar volume, shorten nostril contour to 1.06px pressure-sensitive visual accent; far contour only 0.78px |
| lip corners (348,741) → (489,710) | source's mouth is strongly oblique; near-closed expression with unbalanced upper/lower volume | bright interior 61×25 "teeth" slash and thick dark cartoon smile | preserve actual corner positions, compress oral opening into a slanted narrow seam, reduce enamel/reflection contact to 37×11 and neutral muted color |
| upper lip (418,708) / lower lip (420,761) | unequal upper cupid peaks, inferior vermilion turns into chin | two broad flat disconnected pink polygons | add parent-clipped `lip-cupid-tubercles` and `lip-lower-core-shadow` as *open* dry-wax value regions, each with directional pressure and feathered paint contact |

**Structural continuity:** Both nose additions are children of `face-outline` and are parent-clipped; subalar, near/far wing and septal planes overlap without detached glyphs. Both lip additions are children of the same face and keep the source mouth-corner/tubercles perspective. All previous semantic eye, ear, hair, skull and scalp assets remain; no unrelated reference identity was introduced, no polygon flattening, no global face blur or generic 3D primitive replacement.

**Medium:** The volume hierarchy uses open pressure-built crayon glazes atop opaque source-specific facial blocking, preserving uneven pigment and paper relief. These are visible paint masses, not random cross-hatches. The original `oral-opening` and `mouth-teeth` IDs remain for compatibility, but the fake oversized enamel strip is reduced to an interrupted low-contrast local reflection. Real-source alignment of actual teeth is unresolved.

## Proof / ArtCraft gates

- **Micro & topology:** unit tests require both attached nasal volumes and unequal attached lip masses, short nostril non-closed contours (width <= 1.3), tiny muted enamel under `oral-opening`, preserved full-scene invariants and non-reduced dimensions.
- **Native render:** Storybook F1 workbench adds existing-folder controls for `eyes` 2.5× and `nose-mouth` 2.65×. The headless Chromium test captures the actual 608×1082 source-space nose/lip crop at absolute film frames **210 and 299**, alongside whole face, source landmarks and hair A/B frames. No extra folder or approved production character.
- **Rejection gate:** compare both actual native macros to Campbell source and professional wax/crayon portraits at 1× and 3×, manually annotate the new rendered 18 source-relative candidate points independently, measure local contrast and detect oversized dark circular nostrils / exposed teeth. These must **not** be deemed successful on unit tests, matching anchor IDs or unchanged face landmark positions alone.
- **Known limitations:** F1 source capture is a screenshot, not a preserved full-resolution original camera crop; the proposed color/tone contours are hand-constructed approximations, not independently source-scanned per-pixel boundaries. Current eye depth, lips, near-jaw connection and neck attachment remain visibly unconvincing. The native wax material's microtexture and final-speed action remain below ArtCraft acceptance.

**Do not merge PR #281 until an independent reviewer approves native full portrait + crop stills, human-anatomy gate, color/edge/topology gate, film-motion extrema and no regressions.**
