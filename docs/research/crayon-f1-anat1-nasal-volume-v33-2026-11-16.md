# ArtCraft F1 V33 — ANAT1 3D nasal bone→cartilage→malar native wax

**2026-11-16. Status: UNAPPROVED / !dev / PR #461 draft.**
This is an **anatomical and medium** experiment, not an approved realistic human portrait.

## What actually failed in original V32 source/native screenshot comparison

The source is the original [Christopher Campbell photograph, *Brunette woman portrait (Unsplash)*](https://commons.wikimedia.org/wiki/File:Brunette_woman_portrait_(Unsplash).jpg), CC0, verified **608×1082 screenshot** SHA256 `f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2`. The original high-resolution camera JPEG has **not** been independently verified. [V32 actual native Chromium pixels](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43933797292/artifacts/14259628116) are the only output evidence, not source-of-truth for the photographed sitter.

At matching original pixel positions, median 7×7 RGB patches (8-bit):

| Feature | Source (CC0) | V32 actual browser wax | Observation |
|---|---|---|---|
| Nasal root (350,532) | (163,126,108) | (203,171,158) | root too light and looks like long white sticker |
| Bridge (382,590) | (233,196,177) | (229,196,178) | nearly correct in value, wrong topology |
| Near illuminated bulb (384,612) | (241,199,179) | (210,168,154) | too dark/flat by up to 31 RGB |
| Near naris (402,632) | (22,3,3) | (79,43,39) | cavity too bright and sharply separated |
| Far naris (450,625) | (76,24,20) | (95,65,59) | far cavity too bright |
| Far wall (436,594) | (192,169,167) | (195,159,143) | chroma drift at curved shadow-side nose |
| Overall source SSIM | — | **0.362889** | **REJECT**: below ArtCraft ≥0.85 release requirement |
| Nasal bridge / near wall | — | **0.656323 / 0.648850** | V32 specifically regressed vs V31 |

The photographed person has asymmetric source-specific nose attachment: the **near upper/root is visibly cooler/darker**, the light gains strength toward x384,y612 and curves into the left alar cartilage, while the **far side drops gradually** into a narrower alar/naris cast. Native V32 had a long white strip from the root into a cylindrical tip, broad low-information skin, detached-looking nostril cores. These are defects in integrated **3D macro-form and value placement**, not insufficient random strokes.

## Reuse actual repository human anatomy, not an invented face rig

- [Existing Kumiki ANAT1 human anatomy skill](../../../skills/kumiki-human-anatomy/SKILL.md) and [technical spec](../../component-specs/human-anatomy.md) explicitly separate *where flesh and bones are* from *how the dry wax looks*.
- `registry/anatomy/anatomy-face.ts` `createFace({calibrate:false})` supplies 468 MediaPipe canonical 3D vertices under Apache-2.0 ([official canonical mesh](https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/modules/face_geometry/data/canonical_face_model.obj)). `FACE_LANDMARKS` and `registry/anatomy/anatomy-view.ts` `cameraBasis` + `renderMeshFrame` supply nose root, tip, cheekbone, alar projection and surface-light data.
- V31 fits one yaw/pitch/similarity camera to 13 independently recorded CC0 **source** face landmarks; source-measured individual points dominate the average reference when the 3D face deviates. Critically, the ANAT1 face mask has **no scalp, ears, cranium, neck**, and the model is a *population average*, not a reconstruction of the identity in the photo. The 13 matched **source/model** landmarks do not satisfy the independent requirement to observe 18 **source/native output** landmarks.
- V32 ANAT1 cheek/near zygomatic→alar geometry is unchanged. V33 proceeds **after** all prior transforms in `crayonCc0FaceStudy`; changing the older negative controls would destroy the A/B comparison.

## Five-axis shape, vector, edge, tone and micro-element construction

1. **Topological continuity:** Reconstruct exactly five original, parent-clipped named wax planes in source-space, each from shared original photo root/tip and registered ANAT1 sellion/pronasale/near+far alare: `nose-root` (four cubics), `nose-dorsum` (five cubics), `nose-sidewall-form` (four), `nose-tip` (four), `nose-tip-reflected-light` (four). No generic ellipse, isolated pasted highlight, 3D triangle wireframe or new face geometry.
2. **Vector flow:** The long-axis tangent follows source root→tip at three-quarter yaw/pitch; individual patches have tangents for bone, nasal shaft, alar cartilage and reflected-light crescent. ANAT1 provides the 3D orientation, **not** arbitrary invented proportions.
3. **Tactile edge contact:** Keep native `coverage`/alpha contact, `deposition:"stroke-built"`, `nibStyle:"dry"`, `featherContacts`, `blendRadius` and pre-existing paper/tooth/brush algorithm. The root stays open and feathered; dorsal and tip translucent opaque layers remain native wax with grain/burnish. No image filters or single blurred photo map.
4. **Value hierarchy:** Use measured original-source root and bulb brightness as correction targets. Retune only existing wax shades/pressures and light/shadow underpaint, not unrelated skin, eyes or hair. The near naris and far naris original V27 native cavity geometry/pressure are deliberately **unmodified** in V33: local photography comparison will show whether deepening the nose surface alone improves their integration before separately changing those cavities.
5. **Microscopic detail and film:** All other identifiers, their pigment/pressure/timing/tooth/feathers, lashes, iris, oral cavity, edge/ear/jaw/neck, hair strands, 300-frame timing and 608×1082 original scene seed remain byte-identical. No flattening, new background painting, new imported photos, raster overlays, fake mesh triangles or display images.

## Versioning, tests and what would count as progress

- Opt-in `midfaceForm:"source-anat1-nasal-volume"`; **existing** Storybook Crayon ArtCraft Adult Face Lab variants `Cc0Anat1NasalVolumeV33` and `Cc0Anat1NasalCloseV33`. V32, V31, V30 and default scenes are immutable negative controls.
- `src/video/crayon-artcraft-f1-anat1-nasal-volume.ts` uses actual ANAT1 registered 3D projected reference anchors plus frozen photo points; if the source mask/clip/double application is invalid it throws rather than silently generating unsuitable face geometry.
- Tests demand each named Bézier surface remains bounded, attached to `face-outline`, uses native dry-wax, and *only* five original wax elements change. Unrelated 300-frame source geometry must compare structurally equal. Native React SSR verifies no embedded `<image>` / foreign raster, and Playwright captures exact source 1×/3× V32/V33, plus f0/f149/f299 film spot checks. **A three-frame check is not equivalent to reviewing the full 300-frame animation**.
- After native CI, inspect actual V33 source-pixel likeness in root, bridge, tip, near/far cavity and whole image, with a negative-control V32. **If nose bridge, sidewall or character beauty regress, V33 is still not accepted.** Keep PR draft, do not merge until original 18 final-render landmarks, five value planes, actual 1×/3× artist review, ≥0.85 whole-source SSIM threshold and a complete natural-speed 300-frame human review are independently satisfied.

This approach intentionally exposes a *possible* topology/colour improvement but does not hide failure. Stronger source fidelity is more important than making the demo more elaborate or passing tests with lower standards.
