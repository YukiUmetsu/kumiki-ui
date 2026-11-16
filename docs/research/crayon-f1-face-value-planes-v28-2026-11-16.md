# F1 V28 — original facial value plane reconstruction, native crayon

**Opt-in source-conditioned experiment. Draft PR #461; DO NOT call the human realistic or release-qualified.**

CC0 original: [Christopher Campbell brunette woman portrait](https://commons.wikimedia.org/wiki/File:Brunette_woman_portrait_(Unsplash).jpg), exact 608×1082 source screenshot SHA256 `f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2`. Study V27 from [actual Chromium run 43870411215](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43870411215), artifact **14228372427**. V27 improves the locally measured nose SSIM from .550149 to .563136 but full portrait .361722→.362040, virtually unchanged. Actual 3× screenshot still shows a **flat face with two dark drawn nose patches**. Source fidelity / anatomical acceptance: **REJECT**.

## Measured five-point photometric research

7×7 local source-native median RGB, CC0 source vs V26 render (before V27, which affects the nose only):

| Region and source observation | xy | source RGB | native RGB | correction |
|---|---|---|---|---|
| Zygomatic high light (near cheek catches warm light) | (180,643) | [233,195,171] | [216,177,156] | brighter soft reflection |
| Near lateral malar turn (rotates away from light) | (140,697) | [141,94,75] | [192,151,135] | deeper warm cheek edge |
| Far cheek disappearing behind hair | (459,687) | [149,105,107] | [187,150,138] | muted cool shadow |
| Near orbital cavity | (245,508) | [140,106,102] | [181,146,142] | under-brow depth |
| Far orbital cavity | (427,486) | [108,82,80] | [177,140,135] | receding dark plane |

Forehead highlight (245,367) is already near source [211,183,174] vs native [210,179,165]. Chin (398,822) [205,176,161] vs native [200,167,153]. **Do not indiscriminately recolor the base skin, forehead or chin.**

## Five independent axes
1. **Topology:** Keep the exact prior irregular cheek, orbit and face contours, and original ANAT1-referenced face, eye, nose, jaw and neck. No new flat polygons.
2. **Flow:** Near cheek cast wax 48° follows cheekbone turn, lifted bounce -23°, far compressed cheek 69°, near/far eye pockets 19°/43°; don't mirror value planes.
3. **Physical edge:** Four local opaque native undercoats with original soft alpha from V25 and precise parent-face clip, gradually transitioning into continuous skin. Lit near cheek remains *open* dry wax; no stickers.
4. **Value hierarchy:** Photo-observed five zone values and warm/cool contrast; source outer malar and far orbit should get darker, near high cheek lighter, forehead/chin unchanged. Avoid omnidirectional light.
5. **Micro-elements:** CRAYON1 paper relief, native dry-nib contact, pressure/pigment gradients, textured wax all preserved. No raster overlays, photo sampling at runtime, arbitrary blur filters or smooth global image postprocessing.

New opt-in `source-face-values` builds **only five existing semantic wax regions**, retaining V27 exact nose geometry, eye anatomy, all unrelated artwork, and complete 300-frame film. Existing same-folder Storybook Story, Vitest checks and browser 608×1082 f299 1× and 3× negative-control A/B. Real actual pixels to be reviewed and documented before the variant is promoted.

Reference medium technique: [Philadelphia Museum of Art, drawing material description](https://legacyweb.philamuseum.org/doc_downloads/conservation/DescriptiveTerminologyforArtonPaper.pdf); [Icarus wax art techniques](https://icarusart.net/media-applications.php?go=1). Source images/textures not included in shipped code.

**Hard stop:** Original ArtCraft 9.1 source SSIM≥.85, independently observed 18 landmarks, five-zone actual artist approval, 1×/3× appearance and 300-frame playback/acting remain unpassed. One high source SSIM ROI does not prove photorealism. Keep PR draft.
