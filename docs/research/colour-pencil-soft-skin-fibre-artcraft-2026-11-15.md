# ArtCraft v7 · photographed skin vs dry-pencil fibre coverage (2026-11-15)

**Status: experimental only. Artist-level facial likeness/material acceptance withheld.**

## Licensed anatomical source and technique references

The sole anatomical/value input is [Christopher Campbell's verified CC0 *Brunette woman portrait*](https://commons.wikimedia.org/wiki/File:Brunette_woman_portrait_(Unsplash).jpg). It is the exact 25-landmark photo and 540×600 head proof used in the prior ArtCraft PRs; local input pixels are sampled for dry-pencil pigment, but **no photographic underpaint, bitmap shader, generative filter or artist artwork** appears in the dry rendering. The normal video export does not invoke this opt-in human proof.

Artist craftsmanship comparisons, technique only:

- [Elena Pancorbo](https://www.elenapancorbo.com/): controlled tonal/colour transitions across cheek and orbital volume, with crisp details only at anatomically sharp edges
- [Jesse Lane workshop](https://www.theartguild.org/home-2/the-portrait-in-colored-pencil-workshop-with-jesse-lane-june-13-14-2020): carefully layered pigment density and high-resolution surface handling, not uniformly exposed paper between diagonal lines
- [Justin Maas / Lyra tutorial](https://assets.ctfassets.net/f1fikihmjtrp/3M5deVdW8BF7XIDQvunZPx/fcf171dc2381a62fb64e7b58fc9d837b/LYRA_Combined_PDF.pdf): measurement and light/dark blocks before colored pencil build-up and final sharp marks

## Cause and technique repair

In the previous [#365](https://github.com/YukiUmetsu/kumiki-ui/pull/365) actual 1× dry screenshot, cheek, nasal bridge and under-eye values were pale and looked like isolated, uniformly thin, mechanical graphite hatch. The problem was **stroke coverage**, not only missing landmark geometry; the highly luminous photo face required many overlapping quiet colour fibres on paper.

`createDryPencilHeadPlate(..., skinCoverage=.70)` now modulates **only the original first two** source-conditioned skin-graphite/chroma mark families. Where the actual licensed input value is not almost-white, individual strokes grow a little wider and shorter at the same original pressure-ordered sample positions; their low-pressure pigment increases minimally, with luminance-dependent taper. The sharp source-observed eyelashes/lips, eye glints and hair fibres retain their former shapes, weights, topology and number of strokes. When `skinCoverage=0`, original mark widths/pressure and source alignment are recoverable. 0…1 is validated and deterministic, with tests proving no input-pixel or hair-material mutation.

The new **cheek/nasal-bridge option** and pigment-coverage slider are in the **same existing** `Video Production/Film Looks/Colour-pencil` Storybook atlas, with real CC0 source / code-output 3× canvas comparisons in both 16:9 and 9:16.

## Real Chromium comparison; rejected artist-level realism

These are independent, actual source/dry screenshot values measured at the **same 285×318** 7×7 RGB patches (Y from 0=black to 255=white). `skinCoverage=.70`, image-proof [CI run 43694986796](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43694986796):

| Anatomical sample | CC0 source Y | Previous dry Y | New dry Y | Improvement |
| --- | ---: | ---: | ---: | ---: |
| Cheek (119,164) | 185.4 | 213.5 | **206.0** | 7.5 closer |
| Nasal bridge (176,142) | 198.7 | 238.5 | **236.1** | 2.4 closer |
| Under-eye (136,118) | 93.7 | 124.4 | **113.1** | 11.3 closer |
| Chin (163,215) | 149.1 | 185.3 | **172.9** | 12.4 closer |
| Upper lip (180,188) | 75.4 | 78.1 | **75.4** | 2.7 closer |
| Lower lip (194,201) | 110.6 | 138.3 | **126.1** | 12.2 closer |
| Dark ear/hair junction (75,230) | 3.3 | 11.7 | **11.7** | unchanged, retained |

The 9:16 result is consistent: cheek improvement 6.7/255, under-eye 11.7, chin 12.8, upper/lower lips 3.2/10.8. **No result is claimed to be a photorealistic or artist-approved face.**

Image evidence SHA-256: real-browser landscape dry head `0a938a903a4cbff40d0463b3c7a58ba582e35588b19863ba809a48b6a4c3c34f`, portrait dry head `1cbc176863cb4ce3e846c4171a16b7200cdb418d32df1c90132fab6a8699dec9`, 3× cheek/bridge atlas `267c903476fb1b56f8e50ac5eaf6e08febc15c5ed0bf37f8fb21decb6fe3b65a`. These are the **screenshot bytes**, not the original CC0 photo SHA.

## Explicit next ArtCraft rejection gates

The facial surface remains visibly scratchy and the lit left malar cheek (e.g. **(114,148)**, source ~202 vs dry ~241) is still too pale, creating a white sticker-looking patch under the eye. The nasal bridge also remains far too light; we did **not** solve it and must not say so. These failures cannot be concealed by smoothing, tracing a copyrighted reference painting, or pretending the 5-plane negative test provides artistic acceptance.

Next phase: source-measured support within the bright (but not white) cheek, preserve real catchlights, compare 1× and 3× in both aspect ratios, then independent source/actual-output 18-landmark and ArtCraft v7 `portrait_fidelity_gate.py` with original source photo hash. Material/fidelity approval remains **BLOCKED**.
