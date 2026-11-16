# ArtCraft V19 – photographed source nasal shadow/contact boundary (2026-11-15)

**Draft PR #281; artistic gate FAILED / V19 pending actual-pixel review. Do not merge.**

## Reference and five-axis structure

- Christopher Campbell's [Brunette woman portrait](https://commons.wikimedia.org/wiki/File:Brunette_woman_portrait_(Unsplash).jpg), photographed 2015-10-21, CC0 1.0. Immutable reference is the existing **608×1082** browser screenshot, SHA-256 `f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2`, **not** the verified original JPEG.
- Anatomical study: native photo x340–492/y570–683. The near naris is an oblique curved hook, bounded by a projecting upper cartilage; the far one is a taller, much narrower foreshortened recess. Both cavities share a boundary with skin. Independent actual Chromium V18 pictures instead showed flat dark stickers and an unsuccessful pale-circular correction.
- Wax references: [Stockmar wax-layering process](https://www.stockmar.de/en/service/publications/?cid=1237&file=files%2FContents%2FDownloads%2FKreativtipps%2FEN%2FSTOCKMAR_wax+crayons_getting-started_EN.pdf) and [Philadelphia Museum of Art paper terminology](https://legacyweb.philamuseum.org/doc_downloads/conservation/DescriptiveTerminologyforArtonPaper.pdf), p.44. No commercial images, source-photo pixels, raster filters or textures were copied into native shapes.

| Axis | V19 native construction | Unverified release risk |
| --- | --- | --- |
| Topological continuity | 2 exact source-specific opposing cubic roof/shadow seam pairs | Antialias and dry wax may leave a paper-light halo |
| Flow | Near/far unequal cubic curvature; sidewalls and cavities follow source projection | Photo geometry still not numerically registered to a V19 screenshot |
| Edge | Narrow dark opaque core, visibly broken open-wax roofing painted **after** cavity | Composite may still resemble pasted ink |
| Pressure/rhythm | Independent near/far color, nib pitch, pressure and feather widths | Color and tooth density are not source-matched |
| Microtexture | Inherited native wax clumps, paper-tooth and variable contact | Genuine wax-redeposition fidelity unproven |

## Code, isolation and review

- V19 is an **opt-in** `source-contour-joined` branch off the native V17 semantics, not V18's rejected circular overlays. Exactly six pre-existing nasal wax paths change. No added decorative blobs, no lost fine anatomy/hair/lip features, no photo paint-over. Paint the two alar roof passages immediately following their dark-space regions, to interrupt the dark boundary.
- Same ArtCraft Adult Face Lab Storybook folder receives a source-aligned 3× story and reversible form selector. Vitest checks topology, immutable earlier controls, malformed-input failures, wax SSR. Chromium browser test captures native 1×/3× frames 210 and 299 against V17 and V18.
- **Not yet visually accepted.** Source/candidate photo comparison, ArtCraft 9.1 thresholds, 18 independently measured portrait landmarks, human anatomy framework, 300-frame normal-speed animation and outside artist review remain mandatory. V18 full-frame SSIM **0.376002** (threshold ≥0.85), edge ratio **2.740825** (≤0.20), histogram **−0.208013** (≥0.92); these historical failures are NOT V19 measurements.
- Next: review exact-head browser PNGs at natural 1× and macro 3×; reject and reconstruct contour if disconnected. Then sculpt lips/tooth occlusion, eyelid/iris, cheek/skull, jaw/neck, rooted hair. No default promotion or merge based only on CI.
