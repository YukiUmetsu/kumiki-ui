# ArtCraft V35: ANAT1 source-referenced orbital–malar–nasal facial light field

**Source/rights:** Christopher Campbell, [Brunette woman portrait (Unsplash)](https://commons.wikimedia.org/wiki/File:Brunette_woman_portrait_(Unsplash).jpg), **CC0 1.0** (2015). Reviewed unchanged **608×1082 browser-cropped source PNG**, SHA256 `f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2`; exact source JPEG camera file is not certified. The photo shows a 3/4 face tilted upward, strong near-left eye/zygomatic natural lighting, a visibly darker brow groove and inner nose-root, hard photographic tonal contrast that the native drawing cannot currently reproduce, and many directional overlapping hair strands.

**Status: ART HOLD; unapproved, !dev, draft PR #461.** V33 source-nose-paint and V34 wide-dark-cavity variants remain explicitly **REJECTED** by actual 1×/3× original-photo inspection. V35 starts from V32 **without** those failed changes. The goal is a coherent **continuous 3D facial light field**, not another isolated nose or cheek sticker.

## Real reference/source image deconstruction before code

These are independent **median 7×7 source RGB** measurements (browser screenshot), measured in original 608×1082 coordinates, against the actual V32 Chromium native 1× screenshot at identical pixels. V32 1× exact-head artifact: [14259628116](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43933797292/artifacts/14259628116).

| Region | Original source (x,y) | Photo RGB median | V32 native wax median | Failure |
| --- | --- | --- | --- | --- |
| Near brow bone | (225,490) | (133,94,79) | (188,156,146) | brow/core overlit |
| Near socket | (254,514) | (121,89,87) | (170,137,134) | orbital socket too flat/soft |
| Lower orbital skin | (255,585) | (162,118,105) | (198,160,146) | dark→light transition missing |
| Near zygomatic reflection | (180,620) | (240,208,189) | (222,185,165) | bright form/rim underexposed |
| Under-malar cast | (133,721) | (115,78,64) | (153,109,98) | cheek depth too light |
| Nasal root | (350,532) | (163,126,108) | (203,171,158) | nose and orbital volume detached |

These photo samples are **not rendered textures**; no photo raster, segmentation mask, web image, or proprietary painted contours are embedded into the library. The numbers constrain high-level value planes. Do not claim matching individual photos from those six values alone.

## Actual existing human anatomy framework + source identity

The repo's [ANAT1 human anatomy skill](../../skills/kumiki-human-anatomy/SKILL.md), [anatomy specification](../component-specs/human-anatomy.md), `registry/anatomy/anatomy-face.ts` and `anatomy-view.ts` are the 3D, camera, surface-direction authorities. They provide 468 MediaPipe canonical facial vertices, `exocanthion.R/L`, `endocanthion.R/L`, `brow-mid.R`, `palpebrale-inferius.R`, `cheekbone.R`, `sellion`, and a fitted yaw/pitch/roll under V31's frozen source landmark registration.

The generic 3D canonical face **is not the person's unique likeness** and contains neither full skull, scalp, ears, neck nor coiffure. Original photo points dominate interpolation 85–95%; ANAT1 supplies tangent direction and facial continuity. Existing source 18 landmark annotations and 13 ANAT1 fitting anchors are **not** independent observation of the final 608×1082 native candidate. No inference about race or ethnicity is used.

## Five axes, original 300-frame native wax only

1. **Topology:** A single internal registered anchor field (near/far canthi, brow apex, lower orbit, malar zygoma, nose root) directs six original parent-clipped wax groups: `socket-near`, `socket-far`, `malar-cheek-near`, `cheek-malar-cast`, `cheek-malar-bounce`, `nose-root`. The infraorbital→malar→undercast and medial brow→nasal bone are continuously derived from the **same** photographed ANAT1 anchor system.
2. **Vector/flow:** Each individual face value curve is a connected 4–6 segment cubic volume with tangent direction from the ANAT1 fitting camera and source portrait; the far eye is smaller/foreshortened/hair-occluded and *never* mirrored.
3. **Edge contact:** No new SVG element or stroke overlay is introduced. All six planes reuse source-name wax, parent clipping, native drawn texture and exact `face-outline`. Near/far socket opaque pigment is softened with physically deposited dry nib, matte paper tooth and 13.6–18 px native edge feather; all radii respect the renderer's 18 px safety limit.
4. **Value material:** Separate warm orbital occlusion, stronger cheek shadow, nearer reflective malar light, and a darker rooted nose plane. Five-value interpretation is explicit: diffuse brow highlight / local halftone / orbital core shadow / malar reflected light / under-cheek cast. All colors are paint ingredients rather than embedded source pixels. No blurred screenshot/mask and no flat painted disk.
5. **Microstructure + film:** Keep each unchanged V32 wax fiber/plane/eye/lashes, teeth, pupil, hair strand, alar roof and original naris, full anatomy/camera, original paper/tooth/seed, and **all 300 frames** unchanged. If source-value shapes change, tests fail closed on duplicate, absence, bad parent/clip, malformed 3D registration. 1× and 3× same-source-camera A/B pixel evidence must be captured; f0/f149/f299 are **spot checks only**, not a complete animation review.

## Evidence and release gate

Opt-in `midfaceForm:"source-anat1-orbit-malar"` in original **Crayon ArtCraft Adult Face Lab** with two !dev Storybook states (full image and face detail). V31, V32, rejected V33/V34 and default variants remain available as negative controls. New four-unit test suite guards unchanged original nodes, original sequence and canvas; native Playwright checks single native wax IDs and produces **V32/V35 1× and 3× f299 PNGs** and three native film exposures. No test categories or old checks are disabled.

**Do not merge** without genuine screenshot inspection: original-photo 608×1082 SSIM must be independently measured for face, orbit, infraorbital, malar, nose root, and whole frame, including the exact original V32 1× image as negative control. Actual ART HOLD expires only on: final-render 18 independent facial landmarks, five original-source matched face value planes, credible 1×/3× direct human/art review, 300-frame natural-speed review, and the existing ArtCraft v7 photographic ≥0.85 threshold. Browser green, material-valid drawing and model projection are **not evidence of artistic acceptance**.
