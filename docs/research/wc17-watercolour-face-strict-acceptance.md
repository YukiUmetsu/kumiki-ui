# WC17: Strict watercolor face acceptance (unapproved private study)

**Status: unpublished experimental face. No public Storybook, FilmStage portrait, or artistic approval.** This replaces the previous unmeasured "looks believable" bar.

## 1. Reference types and rights

**Style only, not pixels:** [Mary Whyte portrait instruction](https://www.marywhytebooks.com/mary-whyte/p/painting-portraits-and-figures-in-watercolor), [Stan Miller portrait demonstration](https://www.youtube.com/watch?v=ruazvqznIJg), [Heather's Memory](https://realismtoday.com/portrait-of-emotion-painting-portraits/), and [Charles Reid](https://www.pinterest.com/pin/226939268710029906/). These contemporary works are not licensed for copying individual sitter likenesses or source pixels.

**Private benchmark:** an existing user-owned watercolor portrait image in their file library. It was used as an *unapproved* same-person/pose **candidate target**, without checking its pixels into Kumiki. For a new person inspired by Whyte/Miller/Reid, pixel SSIM against those artists' unrelated sitters is **invalid**; use anatomy and watercolor-specific review with an original approved source target instead.

**Private code asset:** src/video/experimental/watercolour-portrait-study.ts is a hand-authored original static illustration. It is not automatically accepted, not animated and not a public Storybook item.

## 2. Frozen numbers: same-source / same-pose ONLY

Source and render must be exactly **550 × 688 px** in the same pixel coordinates for the first candidate. Every row is a separate mandatory gate. Boxes are inclusive-exclusive [x1,y1,x2,y2].

| Required crop | Bounding box | Minimum RGB SSIM | Minimum edge F1 (±2px) |
| --- | --- | ---: | ---: |
| Full face | [172,76,451,443] | 0.84 | 0.76 |
| Near eye, lids, socket | [244,170,353,249] | 0.88 | 0.80 |
| Far eye, lids, socket | [352,164,440,252] | 0.88 | 0.80 |
| Nasal bridge, alae, tip | [303,226,418,312] | 0.88 | 0.80 |
| Philtrum, mouth, lips | [324,306,421,373] | 0.88 | 0.80 |
| Hairline / crown | [74,0,441,226] | 0.84 | 0.76 |
| Jaw / chin | [168,290,466,487] | 0.84 | 0.76 |

**Every crop** must additionally pass mean RGB error ≤12/255, native Laplacian-detail ratio **0.78–1.22**, >=20 real edge pixels in *both* source and render, and **no alpha under 254**. Use a source-calibrated Canny threshold frozen before inspecting the candidate. Zero missing crops; no averaging that hides a bad eye or mouth.

**Provenance gates:** authorized reference, actual authored source code of substantial size, same native frame/pose, distinct source/render hashes and decoded pixel content. A copied bitmap cannot qualify as code-authored portrait art. Scripts report machine result separately from artistic approval.

### Observed failure: generic automatic vectorization

The private first-pass posterized vector draft was measured and **rejected**. Its native SSIM at each critical region was:

| Crop | Observed SSIM | Required |
| --- | ---: | ---: |
| Full face | 0.3483 | 0.84 |
| Near eye | 0.2036 | 0.88 |
| Far eye | 0.3718 | 0.88 |
| Nose | 0.4131 | 0.88 |
| Mouth | 0.3782 | 0.88 |
| Hairline | 0.2700 | 0.84 |
| Jaw | 0.4181 | 0.84 |

All seven also failed the detail envelope; overly bright contour fragments exaggerated texture. Hairline alpha coverage also failed. A recognizable overall silhouette and high edge F1 were **not** enough. This candidate and private benchmark pixels were NOT checked into the repository.

## 3. Source geometry and ArtCraft v6 gates

Before making a face publicly available, document **at least 28 measured landmarks**: both canthi and upper/lower eyelid apexes, pupils and their optical axes, brows/inner brows, nasal root/tip/alar wings, philtrum, mouth corners and upper/lower lip centers, cheekbone maxima, left/right mandibular corners, chin, ears, crown and hairline. Record the actual pose, landmark uncertainty and per-region source crop.

Create a source-derived attachment/occlusion graph for the skull, orbital rims, lids, iris, cheek, nasal cartilage, mouth, jaw, ears, hair roots/clumps and neck. **Hard fail** on disconnected sclera or iris, mirrored cartoon eyes, copied generic mouth paths, unsupported hair clumps, missing opaque face/neck backing, hairline crawl and repeated sine-wave texture.

Follow ArtCraft v6 research → reference-to-contour → shape topology → five-axis evidence → numeric fidelity → independent art critique. Produce native source/render masks, edge/flow/color/connectedness evidence per critical region. Measurements must be chosen from a real source, not made up to fit generated SVGs.

## 4. Required actual renders and signoff

Inspect native **550×688** and production-frame **960×540 and 540×960**; 3× crops of each eye, nose, mouth, jaw and hair roots are required for human review, but are **not** counted as extra-resolution SSIM evidence. Compare original and code render side by side with aligned landmark overlays. Resolve every reported mismatch by root cause, not global grain/noise.

An independent anatomy review and an independent watercolor-medium review are required before portrait publication. Facial animation adds separate extreme-pose, gaze, blink, expression and normal-speed video tests later.

The numeric script deliberately returns **artistApproved=false** and **releaseReady=false** even on a passing technical render. A test suite cannot certify beauty or faithful human anatomy.

## 5. Commands and files

- Gate: scripts/watercolour-portrait-quality-gate.py
- Frozen benchmark config: docs/research/wc17-portrait-strict-gate.example.json
- Negative controls: tests/watercolour-portrait-quality-gate.test.py
- Private authored static figure: src/video/experimental/watercolour-portrait-study.ts
- Source anatomy test: tests/watercolour-portrait-experimental.test.tsx
- Actual Chromium proof, no Storybook promotion: scripts/watercolour-portrait-private-proof.mjs
- Scoped workflow: .github/workflows/watercolour-wc17-private-portrait.yml

Run locally with authorized source/render files placed at the relative manifest paths:

    python scripts/watercolour-portrait-quality-gate.py --manifest docs/research/wc17-portrait-strict-gate.example.json --report dist/wc17/portrait-metrics.json
    python -m unittest discover -s tests -p watercolour-portrait-quality-gate.test.py -v
    node scripts/watercolour-portrait-private-proof.mjs --out=dist/wc17-private-portrait

The example paths must be replaced by uncommitted local source/render paths. Do not loosen thresholds after seeing a failing candidate; version any new protocol and independently justify changes.
