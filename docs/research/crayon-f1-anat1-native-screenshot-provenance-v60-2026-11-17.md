# Crayon ArtCraft V60 — actual Chromium PNG provenance for independent 18-point review

**2026-11-17 — !dev experiment on PR #461; ART HOLD. Native screenshot bytes, not a proof of artistic quality.**

## Source rights and authentic medium

- Identity/reference camera: Christopher Campbell, [*Brunette woman portrait (Unsplash)*](https://commons.wikimedia.org/wiki/File:Brunette_woman_portrait_(Unsplash).jpg), verified CC0 1.0. ArtCraft's reference is **the previously archived 608×1082 screenshot** with exact SHA-256 `f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2`; never conflate it with the uncaptured original JPEG.
- The physical medium is informed by [Mould et al., *A Bidirectional Deposition Model of Wax Crayons*](https://people.scs.carleton.ca/~mould/papers/crayon-cgf.pdf), which models contact height, clumped deposition, carried pigment and carving, and the [Philadelphia Museum of Art's characterization of art on paper](https://legacyweb.philamuseum.org/doc_downloads/conservation/DescriptiveTerminologyforArtonPaper.pdf), which distinguishes cohesive wax clumps from chalk. These are process references, not image assets.
- Authentic practitioner visual examples to study rather than trace: [Kassia Rico, *Portraits 2013 Crayon*](https://www.behance.net/gallery/14450891/Portraits-2013-Crayon/modules/124832885) and [Georgette Seabrooke Powell, *Portrait of a Community Member*, Anacostia Community Museum](https://anacostia.si.edu/collection/object/acm_1995.0007.0001). These links are visual observations, **not** a blanket license to redistribute their art.

## Five-axis source and native visual deconstruction

| Axis | Reference finding | Evidence requirement |
| --- | --- | --- |
| Topology | Photo's near/far canthi, nose–mouth obliquity, malar-to-jaw turn and hair-front occlusion must be local to this sitter, not symmetrical ANAT1 defaults. | Independently place all **18 candidate-render points** on a **fixed actual Chromium f299 PNG**, not on the CC0 source guide. |
| Vector flow | Hair roots and wax strokes follow oblique volume; the small visible crayon flake stream follows physical contact and changing pressure. | Preserve every V57 original cubic and 267+ rooted wax filaments; inspect native 1× and macro, not generated paint marks. |
| Edges | Crayon wax clusters unevenly on high paper tooth; eyelid/hair interpenetration and foliage boundaries need nonmechanical broken edge. | Pixel-compare original and native; protect existing microtexture and separate foreground, no raster source pasted into SVG. |
| Value/depth | Source photo has five **connected** oblique facial planes, unlike detached synthetic nose/lip stickers. | Independent whole-photo source SSIM and region values, not a successful unit/DOM check; current V57 ≈0.5155 vs ≥0.85 gate. |
| Micro/temporal | Dense hair roots, near-eye lids, paper grain, layered wax contact must survive drawing in motion. | Keep 300-frame render and original seed intact. V60 captures **only frame 299**, not a normal-speed 300-frame review. |

## V60 mechanism: measured artifact before annotations

Existing Playwright **F1 V58** already captures two real native 608×1082 Chromium PNGs at f299: `v58-photo-native-V56-299.png` and `v58-photo-native-V57-299.png`. V60 now computes **SHA-256 from those very PNG byte buffers**, not guessed from a scene description, and writes matching immutable browser-artifact sidecars:

- `v60-native-candidate-V56-299.json`
- `v60-native-candidate-V57-299.json`

Each sidecar includes screenshot filename, actual byte SHA, Git checkout SHA (note GitHub pull_request checkout may be a synthetic **merge ref**), 608×1082, f299, detail 1, exact native variant, original CC0 URL+SHA, all 18 frozen source point coordinates, **zero** candidate point coordinates and explicit `releaseApproved:false`, `artistApproved:false`, `facialValuePlanesApproved:false`, `entire300FrameFilmReviewed:false`. The same V58 source/native test independently verifies original frozen source pixels, 22 original hairline stations and detailed RGB/SSIM region comparisons; the V60 JSON links the physical captured PNG to the V59 manually annotated candidate form. Its `sourceLandmarks` describe the original photo **only**. The source photograph itself is never embedded in the shipped crayon scene.

`crayonF1NativeCaptureWorksheetV60` validates hash syntax, source hash disjointness, checkout hash, safe PNG basename and exact accepted native V54/V56/V57 variants; the generated worksheet remains `INCOMPLETE` (18 missing). The tested UI in V59 lets a human mark candidate-render points and yields provisional observations but **cannot** attest that such points correspond to V60's hashed screenshot or independently verify that actual PNG bytes were reviewed. A captured SHA is provenance, not authenticating that an annotator looked at that image.

## Acceptance and next priorities

1. Download the exact V60 native PNG and JSON from the **same Actions run**, validate `sha256sum` of the PNG against the manifest, then have an independent reviewer annotate and preserve **18 actual candidate** pixels against that image. The current live Storybook worksheet is not an immutable PNG review tool yet.
2. Measure and iterate **five continuous photo-value planes** (source eye socket, malar turn, nose sidewall, mouth/lips and jaw) *without* removing material grain, anatomy or separate legacy negative controls.
3. Compare original real photo and native frame at 1× and ≥2.85×; separately review the full **300-frame film at normal speed** with an independent professional artist.
4. Keep draft PR #461, and all unapproved V54/V56/V57 experiments, **unmerged** until original-photo whole SSIM ≥0.85, independently verified candidate 18 landmarks, five value planes and artistic acceptance pass.

No V60 code changes the painted anatomy, wax material, CRAYON1 renderer, animation, seed, paper tooth, or photographic similarity. Green engineering checks **do not** promote an art-study into the public library.


## V61 — annotate the exact PNG bytes, not a re-rendered Storybook SVG

**Implementation:** hidden story `Video production / Film Looks / Crayon / ArtCraft Source Lab / CC0 exact native PNG · manual 18-point review (ArtCraft experiment, !dev V61)`.

1. Download `v58-photo-native-V56-299.png` (or V57) **and its matching** `v60-native-candidate-V56-299.json` (or V57) from the same successful GitHub Actions artifact.
2. Upload both to V61. The browser verifies PNG signature, IHDR 608×1082, actual uploaded-byte Web Crypto SHA-256, exact filename and digest match, native variant, detail 1, full camera, frame 299, checkout SHA format, CC0 source SHA/URL, and every one of the 18 frozen source points. A manifest with pre-filled candidate marks, modified source coordinates, release flags, or inconsistent capture identity is rejected.
3. The displayed picture is the **uploaded native PNG itself**. Blue dots are immutable original-photo observations; orange diamonds are manual candidate-image observations. Click to place a point, use the exact pixel inputs to refine, or clear points. Export contains the verified image digest and newly measured candidate points with source-relative residuals.
4. V61 does not calculate candidate features, copy source coordinates into candidate slots, authenticate the annotator, certify the GitHub run or artistically accept the result. The V60 sidecar is an **unsigned consistency manifest**; use the trusted same-run Actions artifact pair. The export explicitly records `reviewerIndependenceVerified:false`, `artistApproved:false`, and `releaseApproved:false`.

### V61 engineering checks

- `tests/crayon-artcraft-f1-native-png-review-v61.test.tsx`: valid 608×1082 PNG parsing, actual SHA-256, exact V60 manifest validation, rejection of altered bytes/name/dimensions/source landmarks/prefilled candidate marks/approval flags, file-upload state, direct PNG annotation and quarantine of mismatched pairs.
- On head `a1c7407`, typecheck and Storybook source/import guard passed; all **353 changed-contract tests passed** (56 test files); native CRAYON1 drawing grammar proof passed.
- The separate original-photo Chromium proof was still running at the time this note was added. The exact V61 review remains a manual reviewer workflow, not an automated art signoff.

**Art status unchanged:** V57 whole-source SSIM ≈0.5155 remains below the ≈0.85 research gate. The 18 candidate-render landmarks are still unmeasured by an independent reviewer; five connected facial value planes, full normal-speed 300-frame review and professional artist acceptance remain open. Do not merge.


### Actual V60 PNG artifact generated by the passing V61-head browser run

The original-photo source-native proof completed successfully on [Actions run 44182155613](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/44182155613). Artifact **14373257363** (`crayon-artcraft-source-native-inspection`) contains the real full-camera PNGs and V60 JSON sidecars:

| Candidate | Native PNG SHA-256 | Sidecar |
| --- | --- | --- |
| V56 | `3211b3f46ceca3d5ff5cc5104e0265574f91614fb4b6b340f97d74c4743f2382` | `v60-native-candidate-V56-299.json` |
| V57 | `59bf9923d0bdc83d00d13c4a5b362eaf2d1a4aaaafed8a5ffc9de3958d8e72bd` | `v60-native-candidate-V57-299.json` |

Both artifact PNGs were SHA-256 checked against their matching sidecars after download; both are 608×1082, frame 299, and report **0/18 candidate landmarks measured**. They are now ready for manual annotation through the V61 Storybook workbench. This confirms exact byte provenance and handoff availability, **not** independent feature measurement or artistic acceptance.
