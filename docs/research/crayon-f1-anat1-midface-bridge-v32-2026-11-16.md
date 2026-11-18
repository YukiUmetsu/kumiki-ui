# ArtCraft F1 V32 — ANAT1 zygomatic–nasal sidewall continuity in native wax

**Source date 2026-11-16. Status: UNAPPROVED / PR #461 DRAFT.** Follow the repository's [human anatomy ANAT1 skill](../../../skills/kumiki-human-anatomy/SKILL.md) and [spec](../../component-specs/human-anatomy.md) before creating any painted human form. ANAT1 chooses human shape, CRAYON1 handles physical wax; the person's observable photo still overrides a generic population model.

## Actual original reference, 3D measurements and prior rejection

- Christopher Campbell, [*Brunette woman portrait (Unsplash)*](https://commons.wikimedia.org/wiki/File:Brunette_woman_portrait_(Unsplash).jpg), 2015, **CC0**. Frozen true browser source viewport **608×1082**, SHA-256 `f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2`. This is a screenshot of a photo, not independently certified original raw JPEG. The source image and 18 independently observed source landmarks are preserved unchanged.
- V31 exact native Chromium proof, commit `919ae260`, [run 43925159969](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43925159969), [original PNG artifact 14255273782](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43925159969/artifacts/14255273782). Extracted and visually reviewed original source, full native V31 at **1×** and zoomed source skin **3×**, then computed independent 8-bit RGB SSIM at matched coordinates:
  
  | Source ROI, unchanged coordinates | V30 | V31 | Difference |
  | --- | ---: | ---: | ---: |
  | Whole 608×1082 | 0.361964 | 0.362092 | +0.000128 |
  | Near cheek x70–212,y560–828 | 0.499814 | 0.502418 | +0.002604 |
  | Malar x120–315,y548–738 | 0.706360 | 0.708933 | +0.002573 |
  | Nose x350–475,y575–669 | **0.542303** | 0.542260 | **−0.000043** |
  | Chin x330–481,y764–881 | 0.585028 | 0.585012 | −0.000016 |
  
  V31 changes only ~0.5866% full-screen native pixels. **Actual source likeness remains very poor (~0.362 global SSIM)**; candidate image reads as flat painted mask, eye/nose stickers and broad undifferentiated malar wall. A single high-cheek patch did not solve anatomical continuity.
- Physical wax craft reference: Philadelphia Museum of Art, [conservation terminology for paper works](https://legacyweb.philamuseum.org/doc_downloads/conservation/DescriptiveTerminologyforArtonPaper.pdf) for uneven fused crayon deposits and paper tooth. [Barhydt, *Crayon Portraiture* (public domain)](https://www.gutenberg.org/cache/epub/30248/pg30248-images.html) for directional facial shading. Wax marks remain nonuniform fiber-contact strokes, not image blur or flat sprayed gradient.
- **Actual ANAT1:** existing Apache-2.0 MediaPipe 468-point face through `createFace({calibrate:false})`, `FACE_LANDMARKS`, `cameraBasis`, `renderMeshFrame`; 13 frozen photo-to-anatomy points fit orthographic yaw/pitch/roll to the original photo. This model represents average facial *topology* but not Campbell's person's *identity*, hair, ear, skull or neck. Do not equate the 13-source camera correspondences with the missing independent 18-candidate landmark gate.

## Five physical and anatomical deconstruction axes

1. **Topology:** V32 replaces only `malar-cheek-near` and `nose-sidewall` original skin-clipped wax regions in the exact V31 scene. The 3D zygion → inferior palpebral → cheekbone → alar sidewall and sellion → pronasale tangents jointly constrain a **five-cubic malar surface** and **four-cubic nasal wall**. Both remain wholly inside `face-outline` and use the **same source-conditioned alar transition anchor**. No disconnected new decals or duplicated person.
2. **Vector flow:** ANAT1 source-fitted 3D projection guides stroke angles. Original photographed source near canthi (222/303,544), near cheek (211,658), nasal root (363,522), and tip (411,631) override average proportions. A single physically valid near/far face orientation governs the paths; no mirrored ellipse.
3. **Edge contacts:** original CRAYON1 native alpha feather, parent clipping, matte tooth and dry-wax pressure preserved byte-for-byte, with Bézier C1-like continuous turning. No source images embedded, no duplicated upper skin overlay or smoothed root mask.
4. **Value anatomy:** V28 calibrated source five-value-plane pigment triplets remain unchanged; V29 orbital hoods and V30 jaw and V31 high cheek light remain byte-identical. V32 is a structural trial for larger 3D *spatial continuity* rather than a claim of better contrast. No light/skin material substitution.
5. **Micro-elements:** original skin, iris, upper/lower tarsal rims, tear ducts, lashes, alar-naris cavities, mouth, jaw, ear, 267+ hair flow fibers, grain, seed, 300-frame rig and all non-target source elements retained **exactly**. Native 1×/3× browser screenshots test actual visual quality at the same source camera, not an inferred SVG or hypothetical 3D still.

## Implementation and stop gate

- New `src/video/crayon-artcraft-f1-anat1-midface-bridge.ts`; `midfaceForm:"source-anat1-midface-bridge"` follows exactly V31 and modifies only the two named wax regions. Geometry recomputes from real ANAT1 fitted canonical named vertices and frozen original-source landmarks. Absent/duplicate/wrong-kind/wrong-parent, double-applied or nonfinite curves fail closed. The existing identity, camera, timing and default forms remain unchanged.
- Existing **one** Storybook Crayon Adult Face Lab !dev group: `Cc0Anat1MidfaceBridgeV32` full registered 1× identity with original source and `Cc0Anat1MidfaceBridgeNearV32` 3× nasal close-up; no new Storybook folder.
- New unit regression guards native scene contract, unmodified material/pressure/film, ANAT1 13-point source fit and model/film identity. Playwright captures real 608×1082 full and same-camera 3× f299 V31/V32 screenshot PNG pairs for independent review.

**Artistic release conditions NOT PASSED.** Before merge or public character promotion: visually review exact V32 1×/3× source/candidate pixels; independently annotate original candidate 18 landmarks and mask; quantify near-malar, nasal bridge, alar, chin and values; review normal-speed entire 300-frame film; require unchanged-source whole-image SSIM ≥0.85 and independent professional artistic signoff. If V32 worsens nose/cheek, preserve V31 and revisit genuinely source-measured geometry rather than painting more hatches. The face mask alone lacks ears/occiput/neck and must not invent those hidden regions.
