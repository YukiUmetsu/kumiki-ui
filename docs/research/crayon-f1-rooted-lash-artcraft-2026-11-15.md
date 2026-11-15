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


## Native V1 screenshot rejection and root-direction repair

Actual first Chromium screenshot [run 43759097205](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43759097205) at 608×1082 and source 2.95× showed that simply increasing count from 16 to 33 near-eye curves was **not** professional lash craft: almost every free strand terminated in a tiny vertical dot, making a regular comb. Source photo tips taper into skin while pigment volume collects at the rooted lash margin. This is a deposition-direction error, not a lack of random noise. Do **not** accept V1 on the basis of increased detail count.

**V2 causal correction:** the original manually authored cubic coordinates are preserved exactly, but the deposition direction is reversed *per cubic segment*: `M root C c1 c2 tip` becomes `M tip C c2 c1 root`. CRAYON1's terminal wax pickup now accumulates at the attached lash rim instead of forming a square black bead at each floating tip. This preserves tangent, curved silhouette, count (33/14), timing, clip and paper-height sampling; it does not delete any strand or substitute a fake texture. New structural tests freeze the exact first cubic endpoints for both eyes and reject malformed path grammar. The actual post-fix render and exact source alignment still require independent review; keep the `"sparse"` default until approved.


## ArtCraft v9.1 continuity gate: source-observed root connectivity, 2026-11-15

**Exact medium:** hand-authored CRAYON1 source-coloured wax cubics on sampled paper tooth, not a photograph filter, smooth digital outline, or oil-pastel substitution. **Source:** [Campbell CC0 image on Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Brunette_woman_portrait_(Unsplash).jpg), verified 608×1082 reference crop; [Stockmar wax-crayon layering and side-contact examples](https://www.stockmar.de/en/service/publications/?cid=1237&file=files%2FContents%2FDownloads%2FKreativtipps%2FEN%2FSTOCKMAR_wax+crayons_getting-started_EN.pdf), [PMA wax-crayon microstructure](https://legacyweb.philamuseum.org/doc_downloads/conservation/DescriptiveTerminologyforArtonPaper.pdf). Manufacturer and conservation references provide **material** behavior; photographed CC0 canthi and lid curvature provide **anatomy**. No downloaded reference pixels are imported into the rendering.

Previously 33 near-eye and 14 far-eye hand-built cubic fibers passed a **count** test despite several deposited thick ends lying off the dark tarsal rim. Their parent clip only prevents wax from escaping the face; it does **not** prove lash fibers are attached to the **lid**. A V2 stroke-direction repair moved thick terminal pickup to the root end, but root coordinates had not been independently checked.

**Source-space construction and five axes:**

- **Topological continuity:** source near two-rail upper margin runs from (216,559) through (264,535) to (318,544); far curved margin from (404,529) through (449,499) to (479,513). Each deposited terminal root must be within 5.5 source pixels of one of the two *asymmetric* cubic rim paths. The renderer now rejects the opt-in rooted pass if any terminal contact is floating.
- **Flow:** preserve every individually authored original cubic's body, control handles, and tapered free tip. Move only five misplaced root endpoints to the actual lid margin; never distribute lashes with a generic even-interval comb or mirror the near-eye to the far-eye.
- **Edges:** use existing dry-wax broken nib contact and under-lid occlusion. Root proximity does not create extra black vector eyeliner or a shaded sticker; it prevents a topology error.
- **Width/rhythm:** existing 33 near/14 far unequal fibers, per-side widths and pressure, occlusion, 300-frame timing, and 608×1082 source camera remain unchanged. The previous sparse and eye-value modes remain independently selectable controls.
- **Microtexture:** original nib variation, binder pickup, optical paper grain, pressure relief and colored source wax all remain; no new noise wallpaper or blurring.
 
Deterministic sampled-cubic source-space audit after the five contact repairs: **near 33 attached / 0 detached, max deviation 3.03 px, mean 1.08 px; far 14 attached / 0 detached, max 4.13 px, mean 2.90 px.** All 47 satisfy the 5.5 px root-distance threshold. These geometry-only measurements were computed from code coordinates, **not** from a native browser or independent artist. Adversarial tests displace a plausible-looking root, check duplicate/missing/malformed paths, unchanged unrelated elements and mode controls, and request CRAYON1 SSR proof.

**Storybook:** existing `Video production / Film Looks / Crayon / ArtCraft Adult Face Lab` now has two new opt-in near (2.95×) and far (3×) macro presets plus a live, explicitly **topology-only** root proximity meter. All research stories retain `!dev`; normal output does not pay the audit cost. No standalone art-style folders, reference-image copies, raster overlays, or external runtime dependencies.

**Artistic release remains REJECT.** Root proximity alone does not prove a continuous dark lash rim at actual native pixels or correct depth occlusion. Before merge: inspect **exact-current-head** Chromium 608×1082 source-vs-wax near/far 1×/3×, full face 16:9 and 9:16, frames 120/210/299, normal-speed 300-frame motion, source-relative 18 anatomical points and five tonal planes, wax-contact anisotropy and material grain; require independent art approval. If CI or rendered screenshots disagree with this ledger, keep draft and investigate. Nose, lips, cheeks and neck are still visually rejected. Never report tests as proof of portrait realism.
