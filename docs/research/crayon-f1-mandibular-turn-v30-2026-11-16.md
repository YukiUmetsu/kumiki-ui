# ArtCraft F1 V30 — photograph-measured oblique face and mandibular plane (native CRAYON1)

**Experimental / NOT APPROVED.** Continue [PR #461](https://github.com/YukiUmetsu/kumiki-ui/pull/461) after V29. Never present the resulting portrait as a photorealistic crayon character or merge before independent ArtCraft 9.1 gates.

## Source and direct observation — 2026-11-16

- **Actual source image:** Christopher Campbell, *Brunette woman portrait (Unsplash)*, October 21 2015, [Wikimedia Commons CC0](https://commons.wikimedia.org/wiki/File:Brunette_woman_portrait_(Unsplash).jpg); source 608×1082 screenshot SHA256 `f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2`, extracted and verified against the original 2015 browser screenshot archived [in run 43682633614](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43682633614), artifact 14148787169. **This is a browser crop, not the original full-resolution camera JPEG.**
- **Real prior render:** V29 native source-matched screenshot (608×1082, f299) and eye crop from [run 43910655815](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43910655815), artifact 14249480109. All technical checks passed, but anatomically artistic verdict **REJECT**.
- **Material craft:** Philadelphia Museum of Art, [*Descriptive Terminology for Works of Art on Paper*](https://legacyweb.philamuseum.org/doc_downloads/conservation/DescriptiveTerminologyforArtonPaper.pdf), section on cohesive wax/crayon deposits, fibrous paper and broken contact; and [J. A. Barhydt, *Crayon Portraiture*](https://www.gutenberg.org/cache/epub/30248/pg30248-images.html) (public domain), observing modeled light hierarchy. These are technique comparators **not** the source's photographic texture. Dry pastel, water-soluble pigment and oil sticks do not establish equivalent dry wax-crayon behavior.

### Native reference/topology analysis

| Observable | CC0 608×1082 source observation | Existing V29 original native flaw | V30 original authored correction |
| --- | --- | --- | --- |
| Near cheek turns into ear/hair | independently marked photograph face-left (72,683); cheek has asymmetric malar emergence near (211,658) | left upper cheek is a near-vertical pale wall with triangular maroon face paint | single curved cheek perimeter passes x80,y681 (8.2 px from frozen x72,y683) with attached asymmetric curved, feathered near-malar source shadow |
| Mandibular contour | oblique lower cheek rises from ear to menton; frozen chin (398,858), strongly screen-right | broad, artificially symmetric U-shaped chin under an even skin disk | one connected 16-cubic continuous `face-outline` with exact source chin knot (398,858), jaw emerges from left cheek, thins toward mental eminence |
| Submandibular shading | value drops below jaw, rises into lip/chin; right edge is hair-occluded, cannot observe far neck independently | broad smooth dark stripe and tinted bottom-right chin tile | reshaped existing `jaw-underside` / `chin-plane` source curves with native alpha-feathered attached wax. No fresh patches |
| Hair/eye/nose | real hair overlaps far cheek; near/far eyes, naris and lips are unequal | already separate though source look remains far too illustrative | preserve **exactly** all V29 hair, iris, eyelid, mouth, nasal, eye, forehead and face fiber source nodes |

### Five independent ArtCraft directions

1. **Anatomical topology and continuity**: one non-self-declared, continuous source-space path for `face-outline`; no new overlapping mask or arbitrary geometric primitive. The V30 path's leftmost defined source cheek anchor (80,681) and source chin (398,858) are deliberate, distinct from a symmetric face template. The ear/hair visibility remains mediated by the original painter order.
2. **Vector flow**: forehead-to-temple transitions through shallow C-cubics, near cheek sweeps under a projected zygoma, jaw turns back into source-right mental shelf. Near malar and chin material retain their own wax mark angles; no mirrored gradients or generic repeated mouth/eye marks.
3. **Edge behavior**: opaque continuous skin root prevents a transparent paper-cut face; the parent-clipped malar, jaw and chin contacts have 16–18.3 source-unit native wax-alpha feather. This preserves true paper-tooth pigment within all cores, not blur-image compositing.
4. **Value hierarchy**: V28's five source-observed corrected cheek/orbit values and V29's asymmetric orbital hoods remain unchanged; V30 is a macro geometry correction and does **not** invent new RGB calibration. The original skin underpaint gradient remains byte-identical.
5. **Physical micro-elements**: preserve native pressure, grain, dry nib, directional clumps, source wax color triplets, all fine hair, earring, lashes, iris/radial flecks, photometric alar cartilage, lip/nasolabial, facial landmarks, paper, deterministic seeds, complete 300-frame draw-in and camera movement. Nothing is rasterized, flattened or deleted.

## Production integration and independent release gate

- New opt-in `midfaceForm:"source-mandibular-turn"` must first run the whole V29 prior chain, and modifies **only four existing named source wax nodes** (`face-outline`, `cheek-malar-cast`, `jaw-underside`, `chin-plane`); full coordinates, material and timing in `src/video/crayon-artcraft-f1-mandibular-turn.ts`.
- If the older `jawNeckForm:"source-contour"` is separately enabled, V30 resolves the final four source forms after that optional experiment; its independent 2 extra neck fibers remain. Both forms are isolated from the default baseline.
- Existing **one** ArtCraft Crayon Storybook folder offers V29/V30 comparison, full source photo and synchronized static, 2.4× jaw inspection, slider and playback. No new story category.
- Unit test: original unmodified V29 and V30 compared by exact element ID, all non-target nodes byte-equal, four geometries changed but original wax colors/gradients/motion/film preserved, fail-closed missing/duplicate/wrong-parent. Low detail and optional jaw/neck support tested. Real Chromium 1× and 2.4× f299 screenshots compare identical cameras, seeds, paper and parent paint layers.

**V30 remains REJECT until native 1×/2.4× screenshot A/B *actually reviewed*.** The official ArtCraft 9.1 gate is stricter: independent 18 source-to-candidate landmark masks (especially near cheek, jaw, chin), five calibrated facial values, original-reference whole-image SSIM ≥0.85, normal-speed 300-frame film and independent human artist signoff. Previous portrait ~0.36 SSIM was far below threshold. Geometry knots are minimum source anchors, not evidence of human likeness. If the original silhouette or physical wax quality still fails, keep the PR draft and address the most prominent visible macro-fault next. Never compensate with more tiny hatches or loosen the gate.
