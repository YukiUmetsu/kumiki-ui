# ArtCraft v7 — Coloured-Pencil Portrait Quality Failure and Rebuild Gate

**Status: blocked / experimental.** Human portrait graphics in `src/video/colored-pencil-living-studies.ts` do **not** meet professional coloured-pencil reference quality. PRs #314, #318 and #321 passed CP-F1 structure/material tests, TS checks and Storybook screenshots, yet their actual outputs were flat, mismatched, stylized mannequins. **No artist-level acceptance.**

## Evidence and causal analysis

Actual generated artwork and browser crops are in [CI run 43678505694](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43678505694) and [run 43678505750](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43678505750); PNG filenames include `artcraft-facial-portrait-eyes.png` and `pencil-foundation-portrait-landscape.png`.

| Problem visible in the actual image | Mechanism | Rebuild order |
| --- | --- | --- |
| Eyes are circular/white grey wedges detached from skull geometry | Independently fabricated SVG paths, no measured orbital landmarks, no occlusion or corneal volume | Measured cranium/eyelids/iris in a single perspective |
| Nose remains sharply defined unconvincing taper | `glaze` change removed white support sticker, but did **not** reconstruct face-shadow or alar/cheek volume | Source-derived nose bridge/tip/alar and continuous tonal planes |
| Skin face reads as a flat coloured oval | CP-F1 3 material passes are vector hatch/stipple atop a flat fill; no source-specific multi-scale light map | Shadow/core/halftone/reflected-light map BEFORE texture |
| Hair looks like geometric ribbons | A few long global cubic silhouettes and repeated parallel fibres | Hairstyle mass, roots, overlap, direction, clump shading then individual strokes |
| Finished animation quality remains poor | Static anatomical blockout was never accepted, but reused as a showcased character | Static source match **before** animation/rigging |

**Required source distinction:** [Elena Pancorbo](https://www.elenapancorbo.com/) and [Jesse Lane](https://realismtoday.com/abyss-colored-pencil-art-by-jesse-lane/) are **technique-only** artist benchmarks for layering, eyes, chroma, and density. Do not extract their copyrighted contours as a photo-derived identity. A separately authorized/CC0 photograph supplies measurable head anatomy and tonal maps. An existing local candidate is [Wikimedia CC0 brunette portrait](https://commons.wikimedia.org/wiki/File:Brunette_woman_portrait_(Unsplash).jpg), already used in the photo research atelier; provenance must be checked at source before it is used as the matched anatomical benchmark.

Painter [Justin Maas's portrait tutorial](https://www.dickblick.com/lesson-plans/portrait-drawing-with-lyra-rembrandt-polycolor-pencils/) begins with observed photo proportions, angles and low-pressure value blocks; form builds with color layers before details. That sequence is what our CP-F1 code never *measured* in its human drawing.

## ArtCraft v7 gated rebuild procedure

1. **Select one legal source photo** showing a clear 3/4 face and credible side lighting. Store unchanged source bytes, SHA-256, URL, rights and scene provenance. Do not use another artist's painting to construct the anatomy.
2. **Annotate 18 semantic landmarks** on the actual source: face top/left/right/chin, both eyelid apertures, near brow, nose root/tip/alar, lip corners and upper/lower lip, cheek and hairline. Document source coordinate uncertainty. `PENCIL_PORTRAIT_LANDMARKS` in the code refers **only to current generated-output points**, not approved source data.
3. **Build a new portrait-specific geometry/value engine**, not another incremental edit to the prior 22 SVG primitive regions. Reconstruct source-relative head perspective, attached nasal cartilage, curved orbital rims, eyelid occlusion, lip/jaw silhouette, hairline and root-group topology. Make a neutral five-tone (highlight/halftone/core shadow/reflected light/cast) proof before pencil pigment.
4. **Compare source vs actual generated face** using ArtCraft v7 `portrait_fidelity_gate.py`, with screenshot and source SHA-256 and independently annotated output landmarks; require geometry/tone gates to pass and open the generated overlay. Reject mismatched landmarks or flat cheek/nose/sockets before applying colour/pencil finish. Passing this script is a negative filter, not professional approval.
5. **Require artist-style material gates separately**: color stratification and pencil tooth must resemble selected artist technique references in 1× and 3× crops (not source photograph pixels), with separate independent reviewer commentary and visible fixes.
6. **Only then bring work to Storybook's normal gallery**. For now the current character stays in the existing `Video Production/Film Looks/Colour-pencil` folder, explicitly labeled **unapproved** and accompanied by diagnostic output anchors.

### How to inspect the current failed geometry

Open `Video Production/Film Looks/Colour-pencil / Living Subjects Atelier`, choose **Human portrait · unapproved blockout**, and enable **Show measured output anchors (NOT source-approved)**. The toggle overlays the current 18 observed *generated* landmark coordinates over the actual art, without changing exported film frames. It is a diagnostic, not a reference match.

## What ArtCraft v7 changes

Available locally in the standalone `artcraft-v7.zip` skill package:
- `skills/artcraft/references/portrait-reconstruction-gate.md`
- `skills/artcraft/scripts/portrait_fidelity_gate.py`
- `skills/artcraft/tests/test_portrait_fidelity_gate.py` (seven fail-closed and positive/negative controls)

The script requires an authorized source, actual source/render PNGs, SHA-256, 18 independently annotated landmarks and 5 matched tonal rectangles, produces an actual comparison overlay, and **never** returns `artistic_approval=true`. It cannot replace independent artistic critique or automatically synthesize a high-quality illustration.

**Anti-failure rule:** An author may not claim a new human character looks realistic merely because it is CP-F1 qualified or the render is technically valid. Art evidence is a separate required input. If absent, status remains experimental, regardless of how many code iterations have been run.
