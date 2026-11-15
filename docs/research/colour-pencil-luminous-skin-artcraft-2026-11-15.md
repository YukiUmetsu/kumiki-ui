# ArtCraft v7 · pigment-bearing luminous skin is not blank paper

Status: **experimental CC0 portrait material study only; NOT artist-approved** (2026-11-15).

## Source and observed failure

Licensed anatomy and pixel evidence: [Christopher Campbell's 2015 CC0 *Brunette woman portrait*](https://commons.wikimedia.org/wiki/File:Brunette_woman_portrait_(Unsplash).jpg). A *real* Chromium screenshot of the existing source-aligned 540×600 portrait was visually reviewed at 285×318 and enlarged 3×. No reference painter's portrait was traced. Technique-only art references: [Elena Pancorbo](https://www.elenapancorbo.com/) skin-plane depth/pigment chroma, [Jesse Lane](https://www.theartguild.org/home-2/the-portrait-in-colored-pencil-workshop-with-jesse-lane-june-13-14-2020) transparent layered colour-pencil and isolated strong edges, [Justin Maas/Blick](https://assets.ctfassets.net/f1fikihmjtrp/3M5deVdW8BF7XIDQvunZPx/fcf171dc2381a62fb64e7b58fc9d837b/LYRA_Combined_PDF.pdf) value-first measured proportions. No source bitmap or artist-owned art is part of the code-drawn plate.

**Mechanism:** the v7 five-bin `toneBand` placed all reference luminance above .73 (186/255) into a “paper reserve”, randomly **discarding 72%** of the photo-conditioned malar and bridge pencil gestures and reducing the surviving marks' pressure by another 48%. Yet the genuine CC0 photo has pigmented luminous cheek and bridge at Y≈202/255 and ≈199/255, far short of ivory paper white. The output wrongly rendered those regions at Y≈241 and ≈236. Local warm/cool coloured-pencil marks were omitted rather than being drawn more smoothly.

## Repair and formal material rules

`observedLightSkinSupport(value)` explicitly differentiates observed pale skin from near-white photographic highlights. For source value **.79**, a paper-only colour-pencil support still deposits at **.72 mark density and .85 opacity multiplier**; the support falls continuously by .93 source value to **.17 density and .35 multiplier**, reserving true bright skin and corneal white. The existing seed-driven, local-photo-hue, directional, independently drawable facial strokes remain, and the original head silhouette, eye, nose, lips and hair regions are not simplified. The new support affects **only first and second skin material passes**, never the photo's source bytes, eye/lip fine geometry, existing 3× detailed controls or normal video export. No flat fill or picture filter has been added.

Negative-only `compareCC0LuminousSkin` checks two separately manually registered (source and generated output) real-browser patches, left malar (114,148) and nasal bridge (176,142), in the same 285×318 CC0 screenshot used by the existing facial planes. It rejects missing source pigment, copy/alignment errors and papery output. It always reports `artisticApproval:false` and CANNOT certify a human likeness.

The [photo-proof GitHub Actions workflow](https://github.com/YukiUmetsu/kumiki-ui/blob/main/.github/workflows/colored-pencil-photo-visual-proof.yml) is now explicitly triggered by **all full-head and tonal-proof code/test changes** to prevent future merges with only unit tests and no actual Chromium screenshot proof. CI budget remains targeted to this code only, not the entire suite.

## Real V8 browser comparison with pre-PR screenshot

Final working head for the image evidence **`ae4f53561cc5a13319884e0db87ad3c656e17cba`**, [actual licensed-CC0 16:9 + 9:16 Chromium photo proof](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43696028142). Screenshot RGB mean within registered 7×7 patches (Y: 0=black, 255=white):

| Region (285×318) | CC0 source Y | Previous dry pencil Y (#368) | V8 paper pencil Y (16:9) | V8 Y (9:16) |
| --- | ---: | ---: | ---: | ---: |
| Malar cheek (114,148) | 202.5 | ~241 | **230.4** | 230.8 |
| Nasal bridge (176,142) | 198.7 | ~236 | **221.1** | 220.7 |
| Lower cheek (119,164) | 185.4 | 206.0 | **199.0** | 204.8 |
| Under eye (136,118) | 93.7 | 113.1 | **113.1** | 114.1 |
| Chin (163,215) | 149.1 | 172.9 | **172.9** | 173.4 |
| Upper vermilion (180,188) | 75.4 | 75.4 | **75.4** | 81.1 |
| Lower vermilion (194,201) | 110.6 | 126.1 | **126.1** | 127.4 |
| Hair behind ear (75,230) | 3.3 | 11.7 | **11.7** | 11.6 |

V8 malar source-to-pencil deficit **27.9** landscape, **29.4** portrait (<30); nasal bridge **22.4/22.5** (<32). Prior deficits ~39/38. The source-matched eye, lips, tonal groups, and hair/ear quality negative gates still hold. All checks for this image-proof SHA green: [actual browser](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43696028142), [foundation/unit](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43696028134), [changed-contract/TS](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43696028151).

**Actual screenshot SHA-256** (not the original CC0 image-file hash): landscape dry head `8acf97125834c7d20b659ce0c5785e963c1319263eb52cd0e25c2373df2fc13e`; portrait dry head `d2fedb1030f741e9accdd142ba302106f5b0785531aec8d29c0857a85471b5f6`. The screenshots are in the GitHub image-proof artifacts, including 3× malar/nasal bridge source-vs-code atlas.

## Explicit unapproved quality and next priority

The 1× code portrait now retains more light skin pigment and volume without the prior white cheek sticker. But the 3× output still looks like **uniformly regular diagonal hatch fields**, inconsistent with a high-end light-pressure polished coloured-pencil surface; eyebrow and hairline geometry are too mechanical, the eyelid and jaw need better independent actual-render registration. The full **18 independent source vs actual output landmarks**, original unmodified CC0 photo SHA-256, actual ArtCraft v7 `portrait_fidelity_gate.py` result and human material judgement remain missing. None of these technical negative gates authorizes artist-quality acceptance or production human promotion.
