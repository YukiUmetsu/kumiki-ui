# ArtCraft F1 V34 — ANAT1/source-registered cartilage overhang and *negative space*

**2026-11-16 · PR #461 · UNAPPROVED ART / DRAFT, not for merge.**
This pass starts from the V32 native 3/4 wax anatomy, **not** the rejected V33 pigment reconstruction.

## Original photographic and physical evidence (not inferred anatomy)

**Image source:** Christopher Campbell, [*Brunette woman portrait (Unsplash)*](https://commons.wikimedia.org/wiki/File:Brunette_woman_portrait_(Unsplash).jpg), CC0, original verified browser screenshot 608×1082, SHA256 `f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2`. This exact browser crop is the only reference pixel source used here; it is *not* a certified original high-res camera JPEG.

Native Chromium V33 output [exact-head artifact 14261466161](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43937163283/artifacts/14261466161), head `4a031a83`, independently compared with original CC0 source and unchanged V32. **ArtCraft REJECT V33:** it passed TypeScript, 32/32 changed-test files, native crayon grammar and Chromium 1×/3× screenshots, but made the actual face *worse*. SSIM (8-bit RGB, skimage structural similarity, matched original dimensions):

| Actual original source ROI | V32 | V33 | Difference |
|---|---:|---:|---:|
| whole 608×1082 | 0.362889 | 0.362543 | **−0.000345** |
| face x108–502,y282–862 | 0.598708 | 0.597704 | −0.001005 |
| nasal root x322–405,y482–575 | 0.642630 | 0.628257 | **−0.014373** |
| bridge x323–410,y505–637 | 0.656323 | 0.640216 | **−0.016107** |
| near nasal wall x335–415,y540–655 | 0.648850 | 0.626860 | **−0.021990** |
| bulb x361–446,y573–640 | 0.574980 | 0.551042 | **−0.023938** |
| near/far cavity x380–466,y615–661 | 0.501087 | 0.498455 | −0.002632 |

V33 paint changed just **0.624% of full source-registered pixels** at >6/255 but introduced further unrealistic chalk-light nasal root and *did not correct the two floating cartoon nostril shapes*. Therefore preserve it as labeled rejected/!dev evidence; the new anatomical improvement **does not inherit it**.

The original 3× photograph reveals a real near **hooked, black-red opening with strong irregular occlusion**, shadow center ~`(405,631)=(22,3,3)` RGB; a smaller, upright, *different* far opening center ~`(450,627)=(76,24,20)` RGB. The native V33 image at these points remains ~`(79,43,39)` near, `(96,65,60)` far. The apertures are not free-floating ink ellipses; skin cartilage hangs across their *shared dark edge* and value is continuous with connected alae. The left/right cavities are anatomically different because of the camera yaw.

## Reused, licensed 3D anatomy

- Existing [Kumiki ANAT1 human anatomy framework](../../component-specs/human-anatomy.md) and [skill](../../../skills/kumiki-human-anatomy/SKILL.md) tell us to separate true body/face form from render medium. `createFace({calibrate:false})` uses MediaPipe’s existing licensed 468-vertex 3D canonical face; `FACE_LANDMARKS` and `cameraBasis` supply the independently fitted photographed yaw/pitch and image-space positions. No new external runtime dependency or ethnicity assumptions.
- Original **source-observed** near/far cavity coordinates anchor both shapes. ANAT1 3D face turn is permitted to adjust source points only ±1.5 px because the average 3D canonical alae differ from this photographed sitter. Source skin contours always take priority.
- The standalone ANAT1 face mesh has **no scalp, ears, cranium, or neck**; it cannot authorize inventing missing head features or replacing the person with a generic face. Its 13 source-fit anchors are **not** an independent 18 final-render-landmark ArtCraft gate.

## Five-axis drawing construction

| Axis | Observed source | Native V34 implementation |
| --- | --- | --- |
| **Topological continuity** | near upper cartilage meets exactly the same nonlinear lip as the dark recess; far cavity has its own distinct profile | `alar-roof-near` / `naris-shadow-near` share two exactly reversed ANAT1-oriented cubic segments; far pair also shares exactly the two matching reversed curves. No seam, arbitrary vector hole, mirrored ellipse |
| **Vector flow** | near opening slopes toward camera; far opening is foreshortened and nearly vertical | sign/asymmetry derived from the ANAT1 fitted camera + frozen original source `(405,631)` and `(450,627)`, with near and far separate cubic control flows |
| **Edge physics** | opaque occluded center but soft, slightly worn wax perimeter on paper-tooth | keep nested native CRAYON1 wax with `featherContacts`, 2.7–2.8 px blend, stroke-built dry nib, opacity/underpaint gradient; no raster blur, photo mask or ink outline |
| **Five-value form** | true deeply occluded dark center, tan-brown alar roof, warm bounce under cartilage | center colors near `#100607`, far `#1a0d0e`; strong **physical** burnish, tooth grain preserved; separate native cartilage material gradients, no entire face tone/palette rewrite |
| **Micro-elements/animation** | original hair, skin, tear ducts, nasal cartilage, mouth and lighting all have different mediums and directions | change precisely four existing original wax components; every other V32 item, seed, 608×1082 camera, paper/grain and exact 300-frame animation identical; V33 remains a separate failed study |

## QA and release decision

- New opt-in `midfaceForm:"source-anat1-alar-recess"`, based **directly on the proven V32** (not V33) following the same V23–V32 original geometries.
- Same original !dev Crayon ArtCraft Adult Face Lab, full source comparison and 3× nose detail; no new Storybook folder. Native-only Vitest checks four changed regions, unchanged all others, original 300-frame scene, parent clipping and occlusion painter order. CI Playwright captures source-camera 1×/3× at f299 for original V32 and new V34.
- **Mandatory independent review:** after V34 native PNGs become available, calculate original-source SSIM at both near and far hole crops **and whole face**, determine whether the original root/bridge/nose remains unchanged, and inspect literal 3× wax/rim quality. Even improvement in one negative-space crop **cannot** claim realistic portrait acceptance without separate independently annotated final-render 18 candidate landmarks, five matched value planes, >=0.85 source SSIM, full natural-speed 300-frame film review and human artist approval.
- **Verdict at implementation: ART HOLD.** GitHub PR remains draft/unmerged. If the actual 1× and 3× output remains cartoonish, retain V34 as a reversible, quarantined experiment; prioritize full source-specific orbital/nasal/face reconstruction before release.
