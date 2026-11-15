# ArtCraft v7 — F1 CC0 face, true browser pixels and independent source gate

**2026-11-15. Artistic release is REJECTED.** All experiments remain inside the existing Crayon `!dev` Storybook folder. Keep the existing draft PR #281 open and unmerged. Numerical checks are not artistic signoff.

## Evidence pinned to native browser output

- Anatomical reference: Christopher Campbell, [Brunette woman portrait (Unsplash)](https://commons.wikimedia.org/wiki/File:Brunette_woman_portrait_(Unsplash).jpg), photo 2015, **CC0 1.0**. Native actual browser capture **608x1082**, verified SHA256 `f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2`. See [run 43682633614](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43682633614). It is a preview screenshot, NOT the preserved original camera JPEG.
- Source-space original code: `src/video/crayon-artcraft-cc0-face.ts`. All anatomical parts are authored in the same source screenshot coordinate system and 18 source landmark positions are frozen in `CRAYON_PORTRAIT_AUDIT.sourcePoints`. This is one photograph identity F1, deliberately **not** the separate B1 standing figure.
- Native experimental F1 candidate after cheek/nose planes, commit `c3088981ac74c841ba8aaa54063d50b732714be7`, [browser capture run 43716221807](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43716221807). Inspect `crayon-f1-cc0-source-registered-wax-299.png` at **608x1082** and `crayon-f1-cc0-source-registered-anatomy-299.png`, plus absolute frames 120 and 210. Verified candidate PNG SHA256 `d8f62f90f17a4921d10c84b751946baf66c701881a928e9acc0116e8bddef277`.

## Independent ArtCraft v7 quantitative gate (V4)

ArtCraft `scripts/portrait_fidelity_gate.py` was executed on those actual PNG files. Candidate/source normalized 18 landmarks are based on the **previous V3 candidate manual annotation checked against V4 unchanged macro contours**, not a fresh high-resolution independent annotation at every nose/cheek change; consequently its geometry result is provisional. **Never call this full visual approval.**

| Metric | Real CC0 source | Native CRAYON1 candidate | Result |
| --- | ---: | ---: | --- |
| 18 photographed anatomy landmark distance tolerance 0.085 | 18 fixed points | all 18 under threshold, max ~0.0626 | passes coarse geometry only |
| Independent facial aspect error | - | 0.04544 | passes coarse geometry only |
| Eye socket local luminance P90-P10 | 105 | 63 | local contrast threshold passed, shape remains unconvincing |
| Nose planes local luminance P90-P10 | 112 | 48 | meets 38% contrast floor, contours still primitive |
| Cheek planes local luminance P90-P10 | 53 | 28 | meets 38% contrast floor, volumetric form still weak |
| Lips local luminance P90-P10 | 120 | 74 | contrast floor passed; mouth still reads as drawn slot |
| Hair local luminance P90-P10 | 73 | 104 | contrast floor passed; random cross-hatch visually dominates |

Machine output status for V4 was `geometry_and_tone_pass`, `issues: []`, **`artistic_approval: false`**. The score advanced from V3 `REJECT` (nose 27/112, cheek 13/53) after directed, attached cheek/nose pigment forms; **this does not mean an artistic pass**. The local source screenshot is a photo and the candidate is crayon code, so color and contrast comparisons can identify gross absence of form but cannot prove convincing crayon craftsmanship.

## Native-pixel ArtCraft visual review — FAIL

- Anatomical landmarks are approximately positioned, but the code face still looks a smooth mask rather than one continuous modeled zygoma, upper eyelid, nasal sidewall and maxillary volume. The photographed identity is not convincingly reproduced.
- Visible ear is still a smooth pale oval. Right hair curtain is a broad vector wedge. Eyes are too evenly outlined and sclera too bright/flat. Nasal cartilage appears as several dark isolated spots, not naturally connected nostril + alar plane. Lip oral opening still looks a slanted slit rather than moist unequal vermilion.
- The source photograph has hair with stable crown-root direction and continuous descending strands. Candidate is uniformly scratched, crossing wax marks with little anatomical root direction, even though it contains individual coarse authored hair paths.
- Good original crayon paintings have meaningful pressure deposition, paper-tooth gaps, connected wax clumps and differentiated form strokes. CRAYON1 current output still looks more like uniformly algorithmic scribbles over opaque SVG areas than true museum-quality wax artistry.

## Next revisions queued by visual evidence

- Construct continuous short directional source-locked hair arcs/fibers (not arbitrary screen-space scratches) at crown and both curtains; reduce paper-wide randomized marking when the authentic hair fiber system is visible.
- Correct distinct eyelid folds/iris occlusion and ear cartilage, revisit nose tip and nostril alar geometry from source-pixel macro before making cosmetic tweaks.
- Recreate lip volume and jaw-to-neck cast shadow with attached paint planes, not separate high-contrast symbols.
- Screenshot the changed true native F1 specimen, redo the immutable source-to-candidate gate with independently reannotated candidate landmarks, and review actual pixels at 1x/3x plus motion extrema. **Until independently approved: PR remains draft, Storybook remains !dev, no merge.**


## Latest source-linked scalp, hair, ear and cheek revision (ArtCraft V5)

Actual **608x1082 Chromium native** PNGs from [browser run 43717378944](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43717378944), source-locked candidate commit `0bd140dd735958516e137c2fe9cccb5d4a070544`. File: `crayon-f1-cc0-source-registered-wax-299.png`. Candidate PNG SHA-256 **`f7019b880bf79fdd0191a0870fcd544d4880b50cd34d107d4522234e98d0fea4`**; source remains SHA-256 `f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2`.

Improvements in actual code: **267** source-directed hair centerlines are emitted in **18** multi-tone/width compound SVG paths under CRAYON1's **240 element** budget. Crown, far curtain and near curtain have different flow fields; a new scalp-only volume clips late-rendered background hair fiber paths, so fibers cannot darken the foreground forehead. The photographed left ear now has separate helix, concha, antihelix, lobe and attached pearl/silver glint rather than a smooth detached circle. Separate cheek bounce and cast shadow and unequal alar cartilage are present.

The latest independently executed `portrait_fidelity_gate.py` on the actual screenshot returns **`geometry_and_tone_pass`** with all 18 source/candidate approximate landmarks within **0.085** relative tolerance and face aspect error **0.04544**. The five candidate/source P90-P10 local contrast pairs are eye **68/105**, nose **50/112**, cheek **29/53**, lips **70/120**, hair **97/73**. The automatically returned **`artistic_approval: false`** is decisive. The candidate point coordinates were visually rechecked from earlier V3 annotations, NOT freshly independent source/candidate segmentation, and the source is a browser preview rather than original camera pixels; therefore do not claim the full formal ArtCraft gate is complete.

**Actual V5 visual critique: FAIL.** Some crown hair fibers now follow root direction instead of scrolling across the forehead. However the hair still reads as rough scribble over colored vector masses and not richly layered physical wax; eyes are schematic, nostril/shadow planes are still blobby, mouth is a slanted hard slot, cheek roundness is not convincingly sculpted, neck and jaw separation remains artificial. The earring reads as a small attached light point. These remaining flaws are visible at original 1x pixels and block ArtCraft release. Do not reinterpret a numerical contrast threshold as aesthetic acceptance.

**Verified technical status on commit `0bd140d`:** [changed tests/type safety](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43717378966) **PASS**, [native drawing grammar](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43717378934) **PASS**, [native Chromium browser](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43717378944) **PASS**. The unfinished Storybook meta remains `!dev`, PR #281 remains **draft and NOT MERGED**. Next craftsmanship direction: rework actual nose alar undercut / lip volume from a source-registered reference crop, develop meaningful cheek/skin anatomical value transitions, reduce synthetic all-over mark pattern, then review source/candidate at 1x and 3x and re-run independent gate.
