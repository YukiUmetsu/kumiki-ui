# CRAYON1 ArtCraft F1 V48 — source-photometric, connected native wax face volume

**2026-11-17 · PR #461 DRAFT, experimental !dev, ART HOLD, DO NOT MERGE.**

## Original references and physical deconstruction

**Source:** Christopher Campbell, [*Brunette woman portrait (Unsplash)*](https://commons.wikimedia.org/wiki/File:Brunette_woman_portrait_(Unsplash).jpg), verified CC0 1.0. The exact original browser evidence is 608×1082 screenshot with SHA256 `f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2`; this is **not** the original high-resolution photograph. Eight original/actual-native 7×7 median RGB witnesses were extracted independently before V48, documented in [V47 research](crayon-f1-anat1-continuous-face-v47-2026-11-17.md). No source image pixels ship within the component.

**Material sources:** [Rudolf/Mould/Neufeld, *Bidirectional Deposition Model of Wax Crayons*](https://people.scs.carleton.ca/~mould/papers/crayon-cgf.pdf); [Philadelphia Museum of Art paper-conservation terminology](https://legacyweb.philamuseum.org/doc_downloads/conservation/DescriptiveTerminologyforArtonPaper.pdf). Physical crayon pressure, visible paper tooth, broken wax nib and the smooth connected tonal substrate are separate levels, not a flat CSS photo filter.

1. **Topology:** V46 original source-measured face contour remains the sole opaque connected skin boundary. ANAT1/MediaPipe-468 fit is a pose guide, *not* the photographed sitter's scanned face. Eight light/shadow stations are photo-observed and projected into its unchanged V30 source silhouette bounds **x=73, y=272, 440×611** (not the obsolete V23 412×608 box).
2. **Flow:** Connected local wax radial color deposits sit *under the original* three-pigment face gradient's tooth and directionally drawn surface rubs. No extra cheek sticker, cut-out, new feature path, simplified hair, displaced tarsus, or external image.
3. **Edges:** Pigment contacts feather all the way to zero alpha at their native elliptical boundaries; every deposit is clipped to the existing same animated wax silhouette. Existing paper tooth, hairline, brows, wax fibers and opacity remain.
4. **Depth:** Broad lateral zygomatic falloff, jaw underturn, dark nasal root, softened orbito-malar transition and two highlighted facial bone planes address V47's measured defective 0.07%-pixel scratch method. The original background and iris are not repainted.
5. **Motion:** Original drawing sequence, seeds, camera, contours, material and all 300 film frames preserved; only `face-outline.underpaintFields` changes. V46 remains strict negative control. V47's rejected dry-wax scratches remain independently available in the lab.

## Exact CC0-vs-V46 photographic measurements (source coordinates)

| Face region (x,y) | CC0 7×7 median RGB | V46 original native RGB | Intended wax direction |
| --- | --- | --- | --- |
| Lateral undercheek (133,702) | (123,85,67) | (203,166,149) | Deep curved cool auburn |
| Jaw undercut (155,762) | (129,92,75) | (197,162,145) | Broad gradated crease |
| Medial nasal root (333,533) | (124,95,90) | (199,167,153) | Compact orbital root |
| Orbito-malar (201,582) | (189,150,136) | (209,175,158) | Source-continuous midtone |
| Lower malar (220,688) | (203,151,128) | (223,186,166) | Soft lower cheek warmth |
| Mandibular return (261,830) | (177,133,108) | (197,163,148) | Shadow roll on connected jaw |
| Lit cheek crest (193,622) | (240,207,191) | (224,187,168) | Soft, warm wax reflection |
| Nasal ridge (367,595) | (226,192,174) | (200,164,148) | Fine glancing bone highlight |

Colors, radii and pressure are **experimental**. These witnesses are not measured V48 improvements.

## Engineering gates and unresolved ART HOLD

- Reusable optional source `CrayonUnderpaintField`: normalized x/y center, radii, six-digit wax color, opacity/strength; accepted only on opaque original wax, bounded in both scene validator and React painter. Existing drawings render byte-for-byte unchanged if omitted.
- Same-scene source, same 300 frames, exactly original V46 elements except original `face-outline.underpaintFields`; strict source SHA, required ANAT1 camera fit, fail-closed duplicate/missing source anatomy.
- One existing `!dev` ArtCraft Storybook folder: full 608×1082 portrait, 1.6× cheek and near-eye macro with Play/Pause and frame scrubber.
- Native Chromium exact-head V46/V48 at 1×/2.1× captures to compare; far-eye and upper foliage protected RGB. Native scene/material unit tests must pass; browser screenshots need actual visual review.
- **NOT APPROVED** until original-CC0 matching whole-image SSIM ≥0.85, 18 independently observed *final-render* source landmarks, five complete photographic value planes, uninterrupted normal-speed 300-frame animation, 1×/3× artwork inspection, and independent professional artist signoff. If source photo SSIM regresses, quarantine V48 as another failed experiment; never merge merely for technical CI green.

## 2026-11-17 · actual V48 native CI preflight failure and registered geometry repair

The first exact-head real Chromium proof [run 44116591118](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/44116591118) **FAILED** before producing a V48 candidate image. `crayonF1BuildPhotometricUnderpaintV48` required the earlier V23 `(99,272,412,608)` skin bounds even though V30 had already reauthored the connected facial silhouette and expanded its retained renderer bounds to `(73,272,440,611)`. This is a real source registration failure, not a screenshot artifact or license issue. The original V41 forehead/hairline rework preserves the V30 bounds. V48 now normalizes each original photo-coordinate witness against the actual inherited V30 skin box, keeping all V46 source shapes and materials unchanged. A focused test independently asserts V46's original inherited bounds and each of the eight actual source witness mappings.

**This correction only resolves the invalid construction guard and bad source-space normalization.** It does not establish source photographic improvement, realism, successful same-head Chromium, a ≥0.85 global similarity score, full 300-frame artist review, or independent approval. Keep the entire V48 experiment opt-in and PR #461 **DRAFT / ART HOLD / unmerged** until those are independently measured.


## 2026-11-17 · independent same-head native Chromium and source-photographic review

**Engineering checks PASS on commit `ee9cc63`:** [strict TypeScript + 591 unit tests](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/44117668112), [original CRAYON1 physical drawing browser proof](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/44117668257), [same-browser V46/V48 ArtCraft full/2.1× native PNG proof](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/44117668149). All four V46/V48 actual f299 screenshots archived as [artifact 14343158434](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/44117668149/artifacts/14343158434). **This is not artistic approval.**

**Independent RGB/SSIM measurement:** Decode original matching CC0 screenshot (SHA256 `f8d28...`) and both exact 608×1082 Chromium PNGs at f299; compare via `skimage.metrics.structural_similarity(...,channel_axis=2,data_range=255)` and per-channel absolute RGB errors. All ROIs are x0,y0,x1,y1 on native source pixels, not sampled DOM style values.

| Original photo ROI | V46 SSIM | V48 SSIM | Improvement | V46→V48 RGB MAE |
| --- | ---: | ---: | ---: | ---: |
| Whole frame (608×1082) | 0.497072 | **0.500630** | **+0.003558** | 27.79 → 26.87 |
| Original continuous face (73,272,513,883) | 0.575988 | **0.584769** | +0.008781 | 29.53 → 27.28 |
| Undercheek (90,650,220,750) | 0.678724 | **0.735319** | +0.056595 | 56.71 → 40.61 |
| Jaw turn (105,718,313,865) | 0.626593 | **0.654718** | +0.028124 | 35.96 → 27.61 |
| Nasal root (302,495,376,558) | 0.547614 | **0.611688** | +0.064073 | 48.37 → 37.81 |
| Left cheek (130,565,270,705) | 0.764855 | **0.781170** | +0.016315 | 24.29 → 21.12 |
| Near eye (195,490,347,612) | 0.511183 | **0.532758** | +0.021575 | 41.03 → 37.06 |
| Original nose (342,555,466,671) | 0.557948 | **0.557601** | **−0.000347** | 23.39 → 23.25 |
| Far-eye protection (415,475,470,535) | 0.339835 | 0.339802 | −0.000033 | 51.90 → 51.92 |
| Original upper foliage (0,0,70,70) | 0.544275 | 0.544275 | 0.000000 | 16.80 → 16.80 |

Both protected far-eye and background ROI had **0% pixels exceeding 5 summed RGB units change**, meeting the browser negative-control guard; minor <5-unit changes at far eye mean not mathematically pixel-identical. Original 7×7 median source vs V48 proof: lateral (123,85,67) vs (176,144,129) [V46 (203,166,149)]; jaw (129,92,75) vs (168,139,125) [V46 (197,162,145)]; nasal root (124,95,90) vs (180,151,139) [V46 (199,167,153)]; lit cheek (240,207,191) vs (224,190,169) [V46 (224,187,168)]. Source tissue is still too bright and geometric around nose and undercheek.

**Artistic review — NOT APPROVED:** Real screenshot reveals broad smooth but subtle contact fields; forehead remains pale and unnaturally flat, eyes/iris/upper tarsus are stylized instead of convincing 3D, nose mouth and lateral jaw planes still read like separate paper cutouts, hair reads as a solid outer helmet, and greenery lacks photographed organic variation. The new undercheek and nasal values are measurably closer, but the whole image is nowhere near the ≥0.85 gate. Preserve this reversible opt-in as technical groundwork only. Next prioritized craft is connected realistic anatomical value volumes across *all* face planes and source-registered hair/eyelid geometry, not stronger random microstroke or gradient overlays.

**No merge:** Keep PR #461 **DRAFT / ART HOLD** pending actual 18-final-landmark audit, five broad photo-matched value planes, complete 300-frame film review, and independent visual signoff.

## Independent same-head actual-PNG V48 source-photo audit — 2026-11-17

**Exact rendering code head:** `ee9cc63f3befd8c4f1574396b51b853c5b2daa31`; **native browser proof:** [GitHub Actions run 44117668149](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/44117668149), **actual unchanged PNG archive** [14343158434](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/44117668149/artifacts/14343158434). The separate source is the original 608×1082 CC0 browser screenshot independently retrieved from [source archive 14148787169](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43682633614/artifacts/14148787169), SHA-256 **`f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2`**, exactly matching the original frozen audit. The photo is not an overlay and is not distributed by the package.

I independently extracted all actual f299 native 608×1082 PNGs and directly compared the same-head **V46 original vs V48 new** renderer images to that *exact same* original reference with `skimage.metrics.structural_similarity(..., channel_axis=2, data_range=255)`, no retouching, registration, scaling, upsampling or color adjustment. RGB MAE is mean per-channel absolute error of original 8-bit pixels.

| Original photographed region (x0,y0,x1,y1) | V46 SSIM | V48 SSIM | Δ SSIM | RGB MAE V46 → V48 |
| --- | ---: | ---: | ---: | ---: |
| Whole photograph (0,0,608,1082) | .497072 | **.500630** | **+.003558** | 27.79 → **26.87** |
| Face (108,282,502,862) | .623006 | **.632748** | +.009742 | 27.60 → 25.22 |
| Near eye (175,450,360,625) | .576375 | **.595561** | +.019186 | 33.84 → 30.49 |
| Malar crest (145,580,250,680) | .788520 | **.798264** | +.009745 | 15.09 → 14.27 |
| Lateral undercheek (107,620,233,830) | .665734 | **.711722** | +.045987 | 42.86 → 30.60 |
| Infraorbital (190,565,330,660) | .743826 | **.747926** | +.004101 | 23.67 → 22.83 |
| Nasal root (310,515,405,650) | .654919 | **.671679** | +.016760 | 22.78 → 20.06 |
| Jaw turn (196,784,390,864) | .696713 | **.711966** | +.015252 | 24.16 → 20.23 |
| Entire near cheek (117,585,310,810) | .765417 | **.794340** | +.028923 | 28.49 → 20.69 |
| Far eye negative control (415,475,470,535) | .339835 | .339802 | −.000033 | 51.90 → 51.92 |
| Upper foliage negative control (0,0,80,75) | .560451 | .560451 | exactly unchanged | 16.61 → 16.61 |

**Independent original-photo 7×7 median RGB spot checks:** original → V46 → V48:
- Undercheek at (133,702): `(123,85,67) → (203,166,149) → (176,144,129)`, RGB error 81→58.
- Jaw at (155,762): `(129,92,75) → (197,162,145) → (168,139,125)`, error 69.33→45.33.
- Nasal root at (333,533): `(124,95,90) → (199,167,153) → (180,151,139)`, error 70→53.67.
- Orbito-malar at (201,582): `(189,150,136) → (209,175,158) → (210,176,158)`, **error worsens** 22.33→23.
- Lower malar at (220,688): `(203,151,128) → (223,186,166) → (213,179,159)`, error 31→23.
- Mandibular at (261,830): `(177,133,108) → (197,163,148) → (191,158,142)`, error 30→24.33.
- Malar light at (193,622): `(240,207,191) → (224,187,168) → (224,190,169)`, error 19.67→18.33.
- Nasal ridge at (367,595): `(226,192,174) → (200,164,148) → (203,168,152)`, error 26.67→23.

**Physical material/artist critique of real native 1× and cheek 2.1× screenshots:** V48 *measurably* fixes part of the gross missing dark lateral-cheek underpainting without changing photo-derived anatomy, original gradients, hair flow or crayon tooth. That is a regional improvement, not reference-realistic artwork. **V48 still renders a flat, chalky/paper-scumbled oval cheek, unstructured 3D nose/lid, implausibly regular curtain-like hair and oversized graphic foliage.** The source has graduated skin bounce, partially occluded facial volume, individual photo-specific hair strands and optically deep bokeh. V48's +0.00356 whole-image SSIM remains extraordinarily short of the **≥0.85** release gate. Even where spot medians improve, adjacent orbit-to-cheek gradients and landmark shapes can still be wrong. Screenshots are static f299; do not claim the 300-frame film is artist-approved.

**All three native PR CI workflows passed at that rendering head:** [changed typecheck/tests](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/44117668112), [native wax grammar](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/44117668257), and [actual Chromium f299 proof](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/44117668149). Tests prove engineering isolation, not beauty or identity. **Keep PR #461 DRAFT / ART HOLD / do not merge** until photographic-source 18 final-render landmark checks, five continuous value-plane audits, naturally played full 300-frame movie and independent artist signoff, as well as the original ≥.85 gate.

### Priorities after V48
1. Rebuild *source-shaped* nose, near-lid-to-malar transition and facial depth with ANAT1-connected root geometry before adding more generic wax scratches. Photograph x∼200..390, y∼500..820 reveals a real 3D form not reproduced by the current faceted skin overlay.
2. Break the helmet-like crown/curtains with actual photographed hair clumps and root-to-tip directional wax fibers while preserving all original existing paths and texture.
3. Reconstruct soft-depth, irregular foliage laminae and bokeh from source-luminance contours; no repeated stock plant symbols or flattened gradients.
4. Independently verify final-render landmark/sample source comparisons and inspect entire source-native 300-frame film. Do not promote solely on increased aggregate pixel similarity.
