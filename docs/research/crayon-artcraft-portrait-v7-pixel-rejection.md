# ArtCraft v7 — measured portrait screenshot REJECTION, not a released character

**2026-11-14 / PR #281.** The existing synthetic-face geometry has not been reconstructed from a photograph. No additional cosmetic hatching may be added under ArtCraft v7 until the source-to-contour gate is repaired. All portrait Storybook entries remain `!dev`, inside the single existing `Video production/Film Looks/Crayon` folder.

## Real rights-verified reference and real renderer evidence

- **Photograph:** Christopher Campbell, [*Brunette woman portrait*](https://commons.wikimedia.org/wiki/File:Brunette_woman_portrait_(Unsplash).jpg), photographed/published 2015 under **CC0** (original predates Unsplash's June 2017 licensing change). View: upward-tilted three-quarter face, warm directional cheek light, dark nasal contact shadow, distinct overlapping upper/lower eyelid planes, non-symmetric lips, and hair mass sweeping around forehead. This is a *candidate identity/anatomy reconstruction reference*, not proof the existing stylized character matches it.
- **Reference pixels actually opened:** 608×1082 Chromium source screenshot of the unmodified photo from [GH Actions run 43682633614](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43682633614), artifact `14148787169`, file `artcraft-portrait-woman-portrait-source.png`. SHA256 `f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2`. **This is a viewport crop, NOT the original 5184×3456 JPEG.** Do not misrepresent it as preserved original bytes.
- **Real CRAYON1 pixels actually opened:** 540×960 [GH Actions run 43671953745](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43671953745), artifact `14144119863`, `native-adult-face-portrait-299.jpg`, PR head `08ad7e158e8b5439ec5edec98c15bafcc4a0a483`. SHA256 `43e0bad437227d868da2e4f4e92502969e5210eddf9d204dabade05aa5e40cbd`. Measurements must NEVER be attributed to new revisions without new screenshots and hashes.

## Measured and independently annotated results

The 18 visibly observed named landmarks and native image dimensions are frozen in `src/video/crayon-artcraft-portrait-audit.ts`. These were annotated on the **actual source and actual rendered pixels**, rather than derived from intended SVG paths. `artcraft/scripts/portrait_fidelity_gate.py` compared normalized face-frame positions with the default hard cap 0.085. Result: **REJECT, 17 of 18 landmarks failed**. Face aspect ratio only differs by 0.01201 (passes coarse bound), demonstrating that gross aspect similarity conceals incorrect feature placement.

| Tonal feature | Source P90-P10 | CRAYON1 P90-P10 | Minimum (38% source) | Gate |
| --- | ---: | ---: | ---: | --- |
| eye_socket | 126 | 45 | 47.88 | FAIL |
| nose_planes | 110 | 16 | 41.80 | FAIL |
| cheek_planes | 58 | 15 | 22.04 | FAIL |
| lips | 123 | 17 | 46.74 | FAIL |
| hair | 166 | 154 | 63.08 | PASS |

**Visual review:** the synthetic face has frontward eye placement, very low nasal sidewall contrast and a nearly invisible mouth. The actual source has an oblique eye line, strongly modeled nose, oblique lips and distinct cheek depth. The photo is the target for *future source-driven reconstruction*; the current face is *not* a faithful portrait of that person. The final source JPEG, semantic masks for eyebrows/eyelids/alar cartilage/lips/hair, actual source-derived editable curves, repeat native render and independent artistic approval remain **BLOCKED**.

## Code and Storybook handoff

`AdultFaceArtcraftWorkbench` now offers an optional **source-review** comparison inside the same Crayon story, and independent screenshot-observed candidate landmark dots visible only on the *exact frozen native portrait configuration* (warm expression, `detail=1`, `headScaleY=.82`, portrait frame 299). The live source thumbnail is unregistered to the 608×343 browser crop and is **not** presented as pixel-aligned. Normal film renders do not load a third-party reference image.

When revising the portrait: (1) obtain original CC0 JPEG and preserve SHA; (2) independently trace the source face, orbital and cheek form paths; (3) reconstruct source-driven shapes on an isolated hero first, leaving the current fail version for negative controls; (4) capture new real Chromium 16:9/9:16 stills at 1×/3× and motion extrema; (5) re-annotate all 18 actual candidate landmarks and five true tonal regions; (6) rerun the independent Python gate and visual review. **Do not merge PR #281 as a portrait-art improvement until this is complete.**

## Second source capture — larger facial crop, independently checked

The earlier 608×343 landscape source capture showed small eyes and nose, making manual annotations less precise. The actual **608×1082 portrait** source capture from the same CI artifact reveals more facial area and sharper lid/alar/mouth boundaries. The full 18-point reference annotation and five source tonal boxes were independently remeasured on this new actual screenshot. No candidate geometry or candidate landmarks were altered.

Using the unchanged portrait candidate and strict ArtCraft v7 gate, **17/18 landmarks and 4/5 tonal regions now fail**. The remaining failure is not a material-grain problem: photo and illustration have different projected eye, nose, cheek and mouth positions. The screenshot source is still NOT the original full-resolution JPEG, so this audit cannot satisfy the v7 original-source requirement. Keep this branch draft until the real face is reconstructed and verified.
