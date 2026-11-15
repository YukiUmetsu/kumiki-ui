# ArtCraft v7: wax-crayon paper-height contact study (2026-11-15)

**Status: research-only, artistic gate REJECT.** Repository: `YukiUmetsu/kumiki-ui`; PR [#281](https://github.com/YukiUmetsu/kumiki-ui/pull/281). The existing CC0 eye experiment and the full synthetic human portrait remain `!dev`; none of the new medium technology validates the blocked face anatomy.

## Source gate and physical observations

| Reference | Observed property | Authorized construction, not copied imagery |
| --- | --- | --- |
| Rudolf, Mould & Neufeld, [*A Bidirectional Deposition Model of Wax Crayons*](https://doi.org/10.1111/j.1467-8659.2005.00826.x) (2005), abstract and publicly accessible [author PDF](https://people.scs.carleton.ca/~mould/papers/crayon-cgf.pdf) | Paper behaves as a height field; nib profile, pressure, friction, deposition, smearing and redeposition govern wax buildup | Deterministic multiscale paper contact, pressure-dependent skipping and clump accumulation. **No** full wax-height/force solver or Kubelka–Munk scattering is implemented |
| Philadelphia Museum of Art, [*Guidelines for Descriptive Terminology for Works of Art on Paper*](https://legacyweb.philamuseum.org/doc_downloads/conservation/DescriptiveTerminologyforArtonPaper.pdf), 2014, p. 44 | Wax crayon deposits can be visibly cohesive, uneven and clumped; unlike powdery chalk | Short connected wax deposits at the paper's raised fibers rather than a global grain/noise shader |
| [Crayon stroke macro photographs](https://www.gettyimages.com/photos/wax-crayon-texture) (third-party commercial imagery; observational only) | Side-nib strokes are broken and granular but flow in coherent directions; crossed colors leave distinct deposits | Two independent, clipped color passes and adjustable force. Never copied/repackaged stock pixels |
| Copyright-cleared individual human eye: Christopher Campbell (2015), [Wikimedia Commons CC0 portrait](https://commons.wikimedia.org/wiki/File:Brunette_woman_portrait_(Unsplash).jpg) | Eye silhouette, lids and adjacent skin are not smooth graphic capsules | Existing independently authored 210×200 source-observed eye fixture; full face proportions remain gated |

The original full-resolution CC0 portrait JPEG has **not** been preserved for the 18-landmark release protocol; available reference measurements came from a browser crop. There is no source-aligned quantitative crayon-material image comparison yet. These cited references are *process studies*, not claimed pixel-matched targets.

## Construction and code map

- `registry/video/materials/crayon.ts`: `crayonPaperHeight(x,y,paperSeed)` computes a deterministic 176-unit tile of layered coherent paper relief. `crayonDryNibPath(...,"hand",paperSeed)` uses that relief to modulate pressure width and open small gaps at low-contact valleys. `crayonWaxContactClumps` places pressure- and height-sensitive short colored deposits in up to six compound paths per region. These are approximations, not physical wax mass conservation.
- `registry/video/materials/crayon-react.tsx`: the `stroke-built` material adds colored clump contacts over fully opaque pigment support and uses height-conditioned paper texture; all clumps clip to the authored wax silhouette. `Paper.handContact` is false by default. No image textures are pasted into the scene.
- `registry/video/materials/crayon-scene-react.tsx`: forwards the same seed from the CRAYON1 scene to the paper and independently authored wax parts. The coordinate field is a **canonical local material-space tile**; under complex independent actor transforms it is not yet a full world-space friction simulation.
- `src/video/crayon-artcraft-paper-contact-fixtures.ts`: four controlled swatches: a single pass, crossed pigments, opaque buildup, and pale wax over dark wax. All use actual native CRAYON1 `CrayonScene` primitives.
- `src/video/crayon-artcraft-adult-face.stories.tsx`: `ArtCraftPaperContactSamples` remains in the **existing** `Video production/Film Looks/Crayon/ArtCraft Adult Face Lab` `!dev` folder, with pressure controlled by the Storybook Detail slider.
- `tests/crayon-artcraft-cc0-near-eye.test.tsx` and `tests/e2e-artcraft/crayon-adult-face.spec.ts`: deterministic paper-seed periodicity, pressure-dependent clump population, legacy compatibility, full opaque support, and Chromium renders at low/firm pressure.

## Actual native QA: reject → reject → experimental improvement

| Pass | Chromium proof | Normal and enlarged actual-pixel result | Gate |
| --- | --- | --- | --- |
| 1: isolated paper-height nibs and sparse pattern | [43689019683](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43689019683) | Flat smooth color planes with scattered large digital-looking scratches; dark-ground and crossing order correct | **Reject** |
| 2: coherent 176-unit height tile and denser masked micro grain | [43689355214](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43689355214) | Almost no perceptual difference at normal viewing scale; optical grain far too weak | **Reject** |
| 3: exposed raised-fiber pigment clumps, pressure and tone | [43689687030](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43689687030) | Clearly stronger granulation inside the wax fields at 1× and 3×, while yellow wax still blocks the dark background. However, macro geometry remains excessively smooth, bands appear algorithmically distributed, and the source's characteristic crayon accumulation/reworking is absent | **Improved experimental medium; final ArtCraft release FAIL** |

An actual-pixel three-version comparison board was generated from these downloaded artifacts; it was not fabricated by repainting or image-generation. Corresponding PNGs are preserved in the cited GitHub Actions artifacts. All dimensions and pressure settings are specified in source.

**Technical proof at code head `aa27fc9d8352aa7ef8dc4421b9e4fe079420269f`:** [Changed tests and type safety 43689686996](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43689686996), [native CRAYON1 drawing-grammar browser proof 43689687033](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43689687033), [native CC0/portrait/material Chromium proof 43689687030](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43689687030) **passed**. These are implementation passes, not photographic/artistic success criteria.

## Unresolved craft requirements (hard release blockers)

1. **Material:** derive deposits from contact direction and *accumulated* wax thickness, including side-nib pressure hysteresis and overlap/smear/redeposition. Current static clumps still lack the cohesion and variable macroscopic edges seen in photographed hand-colored work.
2. **Material source alignment:** obtain a rights-cleared high-resolution single-stroke sample with measured page scale and compare actual rasterized semantic pigment regions for deposit coverage, coarse/fine spatial frequency, line-width, color variance, gap/attachment distributions and paper relief; do not optimize against arbitrary screenshot noise.
3. **Portrait:** complete authorized original-photo capture, measured two-eye/nose/mouth and face volumes, native frame-by-frame renders, per-region ArtCraft fidelity verification, and independent aesthetic review. The existing full human face fails **17 of 18** frozen landmark checks and **four of five** tonal regions.
4. **Animation:** inspect actual playback, partial deposition/recontact and motion extrema for shimmering/ghosting; deterministic SSR final frames alone are insufficient.
5. **Release discipline:** keep PR #281 **draft** and all unfinished characters `!dev`; avoid opening additional Crayon PRs or merging this as approved artwork.
