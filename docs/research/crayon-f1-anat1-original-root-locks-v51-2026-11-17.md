# ArtCraft CRAYON1 V51 — original-source crown whorl, clipped directional hair locks

**2026-11-17 · opt-in / !dev / PR #461 DRAFT, ART HOLD, DO NOT MERGE.**

## Original-source observation and material deconstruction

- Identity and rights: [Christopher Campbell, *Brunette woman portrait* (CC0, Wikimedia Commons)](https://commons.wikimedia.org/wiki/File:Brunette_woman_portrait_(Unsplash).jpg). Original exact browser-source evidence is 608×1082, SHA256 `f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2` (not the original photo JPEG). Original portrait has a right-of-center crown whorl, short left-sweeping root wisps, strong near-side sweep from x~150..60 along the temple, and darker far-side curtain dropping across the cheek. There is **no uniform straight-comb parting** and the original hair has multiple physically overlapping thicknesses.
- Material physics: [Rudolf/Mould/Neufeld, *Bidirectional Deposition Model of Wax Crayons*](https://people.scs.carleton.ca/~mould/papers/crayon-cgf.pdf) and [Philadelphia Museum of Art paper terminology](https://legacyweb.philamuseum.org/doc_downloads/conservation/DescriptiveTerminologyforArtonPaper.pdf). Dry wax is physically pressure-dependent, loses contact over paper grain and creates broken line fragments. The actual source photo is a reference for *topology and flow*; wax grain must remain visible instead of painting photoreal digitally.
- **Topology:** V50 already proved large value correction but 1× native still read like a shiny helmet. The next organic root/shaft field must be *different from straight decorative strokes*. Seven asymmetric crown Bézier rails start near the observed root fan and flow left/right. Five near-side rails turn from the temple over the ear, and six far curtain rails follow gravity down toward photo y~1080. Guides are manually inspected source hypotheses, **not individually pixel-traced strands or ANAT1 scalp scan**.
- **Vector orientation:** Source long central root-to-shaft Bezier tangents and their local normals determine every pigment subcurve; eleven independent bounded pseudo-random channels choose segment length, station and small normal offset. No unrelated global hatch angle.
- **Edges:** Three native dry-wax pigment bands (black undertone, chestnut medium, sparse reflected light) per existing original parent hair wax. All 9 group IDs are parent-clipped, so the original V41 face/hairline and V46 iris stay intact. Nonuniform widths .3–1.02, different pressure, opacity and time; all original 267+ native pre-existing fibers and all source-witness V50 underpaint remain deep-identical.
- **Layering and timing:** Append 9 bundled physical contour groups, roughly 200 original cubic strand pieces, without introducing a bitmap overlay, shared shader noise, new face contour, cut-out, or reset clock. Wax draw-in is staged 179–299 of exactly original 300 frames; source camera, paper, 3 hair silhouettes, foliage and human anatomy unchanged.

## Engineering acceptance and independent visual gates

- True native source vs actual Chromium SVG render at 608×1082 frame 299 and 2.85× crown, identical seed/camera, V50 original same-head negative control. Actual PNGs must be inspected at 1× and zoom; decode RGB and compare independently original-source SSIM, 7×7 hair medians, silhouette masks, and protected original iris/foliage. Preserve this trial only if regional material/direction improves. A nominal additional strand count is NOT artistic progress.
- Four interactive `!dev` Storybook states live in same original ArtCraft folder (full, crown, left, right). Control UI retains 300 frame scrub/play.
- Structural tests ensure valid original CC0 hash, source-curved nonmirrored cubic geometry, all V50 original elements exactly unchanged, nine clipped source locks, material wax pressure/width, deterministic detail variants, duplicate/missing root rejection, proper chronology and zero foreign asset.
- Full output **DO NOT MERGE** until 18 independently reobserved rendered landmarks, five complete true photographic skin value planes, final all-300-frame normal-speed cinematic review, original identity/hair likeness and independent artist acceptance; required overall original-source SSIM ≥.85. Status remains ART HOLD even if technical CI passes.

## Independent source-photo native Chromium review — explicit V51 ART FAILURE, 2026-11-17

Exact rendered commit `9fe227299dcad2b4ba25c9ba458b04808b021ee3`. **All engineering checks PASS:** [typecheck and changed tests](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/44127092109), [native wax grammar](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/44127092063), [real Chromium image proof](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/44127092053). [Original 1× and 2.85× V50/V51 screenshots artifact](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/44127092053/artifacts/14349305402).

**Objective independent photo/native test:** decode actual same-head 608×1082 final f299 PNGs and the exact original CC0 source screenshot SHA `f8d28cbe...`, compare `skimage.metrics.structural_similarity(...,channel_axis=2,data_range=255)` and 8-bit RGB mean absolute differences, no overlays, rescaling, retouching or filtered comparisons.

| Original source ROI | V50 SSIM | V51 SSIM | Δ |
| --- | ---: | ---: | ---: |
| Whole portrait | **.507668** | .500779 | **−.006889** |
| Hair crown | **.367543** | .349188 | −.018355 |
| Central root | **.318159** | .306623 | −.011536 |
| Left temple | **.323745** | .312444 | −.011301 |
| Left curtain | **.340958** | .332727 | −.008231 |
| Right upper veil | **.441029** | .418114 | −.022915 |
| Right lower veil | **.489245** | .453614 | −.035631 |
| Original face | .724289 | .724289 | 0 |
| Original near iris | .516876 | .516876 | 0 |
| Original upper foliage | .560451 | .560451 | 0 |

**VISUAL REJECTION, DO NOT PROMOTE:** native screenshot V51 introduces parallel dark and orange wax arcs around the *outer* hair boundary instead of naturally rooted part-to-temple clump movement. The original source guide overlay corroborates paths tracing scalp envelope rather than actual internal root whorl/shaft. The added lines make V50's already problematic hair helmet MORE artificial, and **all hair source ROIs regress**. Both photo SSIM and photo MAE worsen. Keep `source-anat1-rooted-hair-v51` opt-in research/negative control only; don't merge or use as baseline. Future variants must recover V50's source-photo score before any promotion; actual photogrammetric topology and shape continuity matter more than adding strands.

