# Crayon ArtCraft v8 — CC0 eye aperture, value contact and rooted lash study

**2026-11-15. Experimental ArtCraft reconstruction, NOT artist-approved.**

## Unchanged source and visual observations

- Subject: Christopher Campbell, [CC0 brunette woman portrait, 2015](https://commons.wikimedia.org/wiki/File:Brunette_woman_portrait_(Unsplash).jpg). This is a *photo for anatomy*, not a copied crayon artwork or a source of the unrelated existing character's identity.
- Source pixel evidence: actual **608×1082** browser capture in [Actions run 43682633614](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43682633614), SHA-256 **f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2**. An actual 210×200 crop from x160..370 / y430..630 was opened at **630×600** for macro inspection. The full camera original is NOT available as a checked-in source.
- **Anatomy (visual observation at crop scale, approximate):** near-eye corners x≈49/165, center upper aperture y≈99, lowest lower lid y≈143. Visible iris x≈79..120/y≈100..137, partly hidden by heavy upper-lid/lash-root occlusion. Brow rises diagonally from (≈25,85) toward (≈106,40), then tails near x≈165/y≈65. These are hand-read estimates, not certified landmark registrations.
- **Medium (photo vs crayon):** the source records anatomy/value, NOT wax microtexture. Crayon material reference remains [Philadelphia Museum of Art wax terminology p.44](https://legacyweb.philamuseum.org/doc_downloads/conservation/DescriptiveTerminologyforArtonPaper.pdf) and Tiona Marco's authentic crayon portraits studied as technique-only. Preserve tonal shadow hierarchy rather than turning photographic pixels into a filter.

## Three-scale decomposition

| Scale | Observed source feature | Previous actual screenshot failure | Revised experimental construction |
| --- | --- | --- | --- |
| Macro: eye topology | Left/right canthi connect one non-symmetric lid opening; upper lid *overlaps* upper iris | Existing 540×960 [eye screenshot](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43693298607) reads as a bright white triangular fish eye, unusually large iris | Tighter visible iris and pupil, refocused root shadow under upper lid; iris remains clipped to original sclera semantic parent |
| Meso: local tonal flow | Upper orbit darker and compressed, crease follows globe; lower lid narrow and comparatively subtle | Violet under-eye patch occupies most of lower socket, disconnected from photo value rhythm | Restrained/warmer orbital colors, narrower lower-hollow and lower-lid geometry, weaker lower pigment pressure |
| Micro: rooted fibers | Dense short upper lashes converge along lid margin, irregular lengths, no detached fan | Six icon-like separated lash curves | Fifteen staggered, curved contacts attached to upper skin/lid, no free-floating lashes |

**Topology constraints:** lid occlusion over iris; no separate white eyeball sticker; tear duct connected to medial canthus; lash marks terminate near the dark upper margin; lower shadow fades into cheek rather than becoming a second illustrated bag. Every region retains a separate named local parent, wax pressure, SVG geometry and redraw order.

**Negative controls:** giant round anime iris, symmetric eyeliner loop, violet dark circular cheek sticker, six perfectly evenly spaced lashes, flat pale sclera, smooth radial gradient presented as wax. Matching a few crude path bounds or a synthetic check is not visual approval.

## Implementation and explicit failures to reassess

Changes confined to **\`src/video/crayon-artcraft-cc0-near-eye.ts\`**, the same isolated F1 eye specimen that cannot be transplanted to the unrelated full portrait. Updated dark value palette, orbital underplane, lower lid, sclera-clipped iris/pupil, iris flecks and many short anchored lashes. Storybook routes remain in **Video production/Film Looks/Crayon/ArtCraft Adult Face Lab** \`!dev\`. Tests assert critical semantic parents, narrowed structural regions, rooted lashes and exact source crop reading assumptions.

**Release blockers:** fresh native screenshot at 960×540 and 540×960 (full and 3× actual 210×200 eye crop), aligned real-source landmark/tonal comparison, eyelash-tip topology and stroke-medium comparison, human artist assessment. The larger synthetic face still fails 17/18 landmarks and 4/5 tone regions and is NOT fixed by this experiment. No global face refactoring or ArtCraft pass claimed.
