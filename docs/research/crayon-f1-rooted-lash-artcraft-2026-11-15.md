# ArtCraft 9.1 F1 — photographic eyelash-root wax cluster A/B

**Date:** 2026-11-15 · **Status:** working experiment, not artist-approved. Existing [draft PR #281](https://github.com/YukiUmetsu/kumiki-ui/pull/281); Storybook `!dev`, **do not merge** until native reference review passes.

## True reference vs rejected output

- Source identity: Christopher Campbell, 2015 [CC0 portrait](https://commons.wikimedia.org/wiki/File:Brunette_woman_portrait_(Unsplash).jpg), source-locked real 608×1082 Chromium screenshot SHA256 `f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2`. The actual source near-eye crop **[185,450,346,603]** and far **[386,422,488,573]** were inspected before code changes. Crops are referenced, **not imported into any code-created scene**.
- Wax medium: [Philadelphia Museum of Art descriptive terminology, p.44](https://legacyweb.philamuseum.org/doc_downloads/conservation/DescriptiveTerminologyforArtonPaper.pdf) and [Rudolf et al. wax deposition model (2005)](https://doi.org/10.1111/j.1467-8659.2005.00826.x) for pressure-dependent uneven contact, paper-tooth clumps and terminal pickup; neither supplies facial anatomy or lip contour geometry.
- Defect confirmed in native 608×1082 screenshot: previous 16-near/8-far hand-authored lash curves were so thin and sparse that the eye looked like a long *vector pencil line* with about 4–5 isolated upright sticks, not a source-eyed dark rooted fringe. The source shows intersecting, irregular dark lash-root groups, partially merged with the upper tarsal border. The photo has occluded/foreshortened far lashes under hair; not a mirror of the near eye.

## Five-axis deconstruction and source-space plan

| Axis | Observed source root behaviour | Hand-authored CRAYON1 construction | Forbidden shortcut |
| --- | --- | --- | --- |
| Topology | fibers emerge from the tarsal pigmented upper rim and partly merge into the dark lid mass | two existing `lash-contact-*` parent-clipped named contours only, no new detached sticker nodes | random free-floating whiskers or independent black lines |
| Vector flow | outer canthus sweeps outward, center fibers stand more upward, inner fan bends inward | source-specific cubic curves along root sequence x215..312/529..559; far x404..458/500..529 | mirrored arcs or equal-length vertical rods |
| Edge character | interrupted tiny fiber tips and dark attached roots | native `dry-wax` contact, inherited terminal pickup and uneven paper relief; preserve original iris/lid occlusion | smooth opaque vector-stroke mascara |
| Width and rhythm | dense center groups, sparser canthus, nonmonotonic local root spacing | 33 manually authored near fibers, 14 far, width .29/.25, pressure .57/.52; 1 frame identity and unchanged CRAYON1 global seed | evenly spaced repeating lashes |
| Microtexture | irregular pressure, no photographic texture overlay | CRAYON1 individual wax nib contact with paper-tooth dependency; no image edits, noise wallpaper, photo masks or shader replacement | fake external pencil texture stamps |

## Code and reversible study

- Original sparse source eye remains unchanged via `lashFinish:"sparse"` (the default). New native `lashFinish:"rooted"` is **opt-in only when `eyeContact:"source-shade"`**; the entirely original `eyeContact:"baseline"` is pixel-equivalent regardless of lash finish.
- Authoring: `src/video/crayon-artcraft-f1-lash-clusters.ts` has exactly two original compound cubic path groups and a deterministic `crayonF1AddRootedLashes` transformer. It preserves the original parent IDs, clip topology, timing, camera, source landmark audit, hair and midface, and the low scene element budget.
- Controls: existing **Crayon / ArtCraft Adult Face Lab** Storybook gets an independently selectable **source eyelash root density** dropdown, no new folder. The midface remains **baseline default** after native V2 source rejection.
- Regressions: Vitest asserts 33-near/14-far cubic roots, exact original graph equality except for two named lash contours, timing and paint pressure. Playwright captures **native 608×1082** same-camera **2.95×** PNGs for sparse/rooted at final frame 299; DOM checks both native `dry-wax` contacts and rendering exceptions.

## Release gate remains pending

This study is a **hypothesis**, not proven improvement. Need inspect real sparse/rooted Chromium PNGs side-by-side with the source 1×/3× and independently annotate actual rendered lash-root continuity, lid coverage, contact-tube width variability and iris preservation. Apply ArtCraft 9.1 portrait/human-anatomy/pixel gates without weakening thresholds. Reject the grouped variant if it reads as a comb of parallel marks or damages eye realism; revert to sparse by keeping the existing default. Source-matched full face, nose, lips and neck remain unfinished regardless.

**Priority after visual verification:** true source-tarsal lid shape, subtle negative-space sclera, irregular fine lash-root clumps, chin-to-neck continuity and animation extremes; whole face remains `!dev` and PR #281 unmerged.
