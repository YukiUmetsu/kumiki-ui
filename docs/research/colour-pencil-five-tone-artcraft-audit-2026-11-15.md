# ArtCraft v7 · dry-pencil five-plane optical density audit (2026-11-15)

**Status: technical evidence only, human likeness / artist material approval BLOCKED.**

## Source and craft deconstruction

- **Only anatomical/tonal source:** [Christopher Campbell, *Brunette woman portrait (Unsplash)*, CC0](https://commons.wikimedia.org/wiki/File:Brunette_woman_portrait_(Unsplash).jpg). Browser evidence is a 540×600 crop of the same license-verified photograph (not the original file bytes).
- **Technique references only:** [Elena Pancorbo portrait gallery](https://www.elenapancorbo.com/) for quiet skin planes and sharp orbital transitions; [Jesse Lane on many pencil pigment layers](https://www.artistsnetwork.com/art-mediums/colored-pencil/photorealism-decoded-oceans-of-layers/) for value-first grisaille, individual hue separation and paper reserves; [Justin Maas's colour-pencil method](https://assets.ctfassets.net/f1fikihmjtrp/3M5deVdW8BF7XIDQvunZPx/fcf171dc2381a62fb64e7b58fc9d837b/LYRA_Combined_PDF.pdf) for measured proportions before color.
- No reference artist's copyrighted contours or pixels are reproduced in code.

The actual PR #349 540×600 dry-only output was **much brighter** than the source: the iris, orbital crease and jaw lacked connected pencil shadow. Merely increasing rough noise, outlining eyeballs or faking a photo bitmap would not solve tonal structure.

## Code and negative-only geometry/value checks

The updated `createDryPencilHeadPlate` retains its explicitly **experimental** status. The new layer is **three more source-conditioned charcoal/earth-pigment passes** built from dry pencil gestures, not `drawImage`, `putImageData` or flat skin fills. It selectively deposits where the blurred sampled source value is darker than .80, using a pressure-dependent dropout field, aligned orbital/nasal/lip tangents, angular variation and feathering. The hair's darkest source-connected clumps receive two more dry-fibre density passes. White corneal glints and the brightest paper remain unmarked by this process.

The new pure `compareCC0PortraitTones` negative gate compares **actual source crop and actual drawn canvas pixels** in five manually observed reference regions: iris core (135,130), orbital shadow (134,112), jaw core (142,229), cheek halftone (116,166), forehead light (156,75), all coordinates in the 285×318 Storybook source screenshot and normalized against the actual canvas dimensions. The output values are *measured*, never inferred from `fiveValueCounts` or artist judgement. It fails closed on mismatched dimensions/alpha, flat reference values, loss of tonal contrast, and excessively pale output. It always returns `artisticApproval:false`.

## Real CC0 screenshot evidence — V4 to V5

| Source region | Reference, Y (0–255) | Previous PR #349 ~Y | V5 browser Y (16:9) | V5 browser Y (9:16) |
| --- | ---: | ---: | ---: | ---: |
| Iris core | 22 | 124 | 70 | 71 |
| Orbital shadow | 109 | 185 | 141 | 143 |
| Jaw core | 131 | 195 | 165 | 166 |
| Cheek halftone | 185 | 219 | 211 | 213 |
| Forehead light | 179 | 206 | 197 | 200 |

Previous V4's mean five-plane gap was **approximately 63/255** in the 285×318 reviewed screenshot. V5's identical-source live-browser 540×600 probe shows **31.4/255 landscape** and **33.3/255 portrait**. Five-plane contrast retention: **87% / 88%**. Do not interpret these intensity differences as perceptual image fidelity. The new real-CC0 browser regression requires mean gap below **45/255** and contrast retention above **75%** in both aspects; those are calibrated negative thresholds, not an artistic acceptance bar.

Evidence: [image-proof workflow run 43689436148](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43689436148). V5 original generated PNG SHA-256, landscape: `ba7bf7e42b8ddefef186296521d776a996888464efaf2adf7bb1f8172dde031d`, portrait: `11695467518448b7688a07dd71053ac240b4a265659ccf1fde9fc18d3b3b6a3e`. The proof table screenshots are `8d8f86072c5e96dde6f1612475e459b1219ba8ddb13ceb2451da26299eb09fc2` and `6b0df170b1c6f9310c605b5dbfd188cebed0b56ac4570f7ecd475720e780439b`. These are screenshot hashes, **not** the original source image SHA-256.

## Remaining ArtCraft rejection criteria

At 1× the eye region still looks noisy, the lip contour and cartilage are insufficiently modeled, and the hair/face boundary has excessive bright edge separation. The apparent facial likeness remains stylized relative to the source. The five **source** tonal rectangles do **not** establish five *independent output landmarks* or the full ArtCraft v7 `portrait_fidelity_gate.py` result. There is no calibrated paper-tooth/burnish optics and no approved cinematic character rig.

**Do not promote the old unapproved human.** Continue with independent 18-point output-source anatomical registration, multi-scale light/shadow hierarchy, hair segmentation and shadow topology, then human 1×/3× critique, before animation. Storybook remains in the existing Colour-pencil folder and the main video renderer is untouched.
