# ArtCraft F1 / 13 — Nasal cartilage and dark air-space continuity

**Status: EXPERIMENTAL / ARTISTIC REJECT. PR [#281](https://github.com/YukiUmetsu/kumiki-ui/pull/281) remains draft and unmerged.** This is an editable native CRAYON1 sculpture experiment, not a photorealistic or artist-approved wax portrait.

## Reference and source rights

- [Christopher Campbell, *Brunette woman portrait*, October 2015, CC0 1.0](https://commons.wikimedia.org/wiki/File:Brunette_woman_portrait_(Unsplash).jpg). Immutable 608×1082 registered source-browser capture SHA256 `f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2`, preserved in PR source analysis. The source photo's original full-camera crop **does not** match this browser projection; do not change the coordinate system.
- [Philadelphia Museum of Art, descriptive terminology for art on paper](https://legacyweb.philamuseum.org/doc_downloads/conservation/DescriptiveTerminologyforArtonPaper.pdf), p.44: color and pressure-loaded wax clumps, uneven binder pickup; not a basis for nose anatomy.
- [Rudolf, Mould, Neufeld, *Bidirectional Deposition Model of Wax Crayons* (2005)](https://doi.org/10.1111/j.1467-8659.2005.00826.x): irregular crayon-material deposition. Source-study information informs authentic mark-making; no reference pixels are imported as image/textures.

## Actual prior output failure (not inferred from code)

Inspected the real previous native 608×1082 [source-volume midface screenshot, Chromium run 43773969699](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43773969699). The 3× image shows **two dark, solid nostril islands** disconnected from any visible projected cartilage. The near one is nearly a floating rhombus, the far is an isolated vertical ellipse. The lip/teeth also look like pasted angular lozenges; these are **outside this iteration**. Previous source-volume mode was already rejected by the independent ArtCraft V2 full-face report: SSIM .3726, edge mismatch 2.8792, histogram correlation −.2096, all substantially below portrait gate. No attempt to make an inappropriate whole-photo pixel score a stylistic approval criterion.

## Five-axis plan

| Axis | Locked photographic observation | Native construction change | Do not do |
|---|---|---|---|
| Topology | Near dark cavity x389..419/y622..648 under lateral nose wing, far foreshortened recess x447..461/y616..639 | Two separate alar roofs, each anchored to face; two septal inflection rings deposited over each roof before naris dark pigment | Two detached black ellipses or disks |
| Tangent flow | Near alar hood arches diagonally around x390..418; far margin strongly compressed | Asymmetric cubic roof and septal curves, source-space attachment, interlocking local bounds | Mirror one generic nostril |
| Edge | Soft skin-cartilage sweep and sharp recessed air-space at contact | Open `featherContacts` wax for soft cartilage, opaque dry-wax shadow for cavity | Uniform outline stroke or broad purple sticker |
| Width/rhythm | Near opening projects wider and more hooked, far smaller | Near 40×25 px cavity, far 20×24 px cavity; pressure and undercoat differ | Equal circular openings or perfectly uniform stroke thickness |
| Microtexture | Dry side-nib pressure contact, wax pickup on paper height | Preserve global paper tooth and native pressure/deposition; no raster postprocessing | Digital blur/noise wallpaper or discarded fine detail |

## Implementation and failure containment

The independent `crayonF1ConnectAlarUndercuts()` transformer accepts only a **previously constructed** `source-volume` scene. It adds four source-space named semantic open-wax regions (`alar-roof-near/far`, `alar-septum-near/far`) immediately before their associated existing naris shadow, then replaces only the two naris source paths. It rejects duplicate or missing naris anchors, preserves every unrelated element byte-for-byte, frame timing, camera, old eyelids/eyebrows/teeth, mouth and hair. All original modes `baseline` and `source-volume` remain exact controls; **`source-alar` is opt-in**, not the default.

Existing **Crayon / ArtCraft Adult Face Lab** Storybook gains a third native nasal dropdown option; no new folder. New Vitest independently checks parent/wax material, near-far asymmetry, paint depth order, quantitative *bounding overlap* (necessary but not sufficient for surface-connected appearance), default negative control, invalid-input rejection, no image overlays, and CRAYON1 renderer. New Playwright captures exact 608×1082 native 3× nasal `source-volume` vs `source-alar` f299 at identical source camera, paper, seed and playback time, and preserves screenshots as artifact.

## Required post-render release gate

**Do not claim improved art until real Chromium screenshots have been downloaded and reviewed**. At source 1× and nasal 3×, check whether darker cavities now actually look embedded in the connected alar fold, whether the cartilage region reads as physical volume instead of a patch-shaped sticker, and whether wax directional grain is authentic. Compare source/candidate native crops at same geometry without replacing them with a photo filter. Reject if a block-shaped dark nose remains. Still required: 18 independently verified source-render face landmarks, five tonal planes, human anatomy source-vs-render gate, normal-speed 300-frame playback, both 16:9/9:16 contexts, independent artist approval. Leave PR #281 draft/unmerged while any critical feature fails.
