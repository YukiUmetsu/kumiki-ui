# Crayon ArtCraft F1 V44 — source-calibrated ANAT1 five-plane facial wax

**2026-11-16 · `!dev` experimental art study, PR #461 DRAFT / ART HOLD.**

## Authentic artwork reference and physically correct medium

- Christopher Campbell, [*Brunette woman portrait (Unsplash)*](https://commons.wikimedia.org/wiki/File:Brunette_woman_portrait_(Unsplash).jpg), 2015, **CC0 1.0**. The exact quality benchmark is its previously archived **608×1082 screenshot**, SHA256 `f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2` ([source screenshot evidence](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43682633614/artifacts/14148787169)). Do not substitute the original camera JPEG, a library portrait or external raster in runtime.
- V43 exact current negative-control native screenshot: [Crayon ArtCraft browser proof](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/44016205791/artifacts/14298484504), including corrected exact 608×1082 original-frame background, source-registered ANAT1 face, 18 hair-root groups, natural wax grain and 300 frames.
- For the physical crayon medium, retain stroke-built native dry-wax pigment and paper-tooth deposition rather than constructing 2D flat vector cheek stickers or photographic blurs. [Rudolf, Mould & Neufeld, *Bidirectional Deposition Model of Wax Crayons*](https://people.scs.carleton.ca/~mould/papers/crayon-cgf.pdf), [Philadelphia Museum of Art, art-on-paper terminology](https://legacyweb.philamuseum.org/doc_downloads/conservation/DescriptiveTerminologyforArtonPaper.pdf).

## Source/photo RGB remeasurement on exact portrait

The **same original 608×1082 CC0 RGB** versus **same-index V43 Chromium f299 native**; 7×7 median pixel samples, no photographic overlay or color matching shader:

| Anatomical plane/physical contact | Source x,y | Source RGB | Native V43 RGB | Native−photo |
| --- | --- | --- | --- | --- |
| Supraorbital/near hood | 254,514 | 121,89,87 | 170,136,132 | +49,+47,+45 |
| Infraorbital roll | 255,585 | 162,118,105 | 193,159,146 | +31,+41,+41 |
| Near malar lit crest | 180,620 | 240,208,189 | 221,184,165 | −19,−24,−24 |
| Lateral zygomatic underturn | 133,721 | 115,78,64 | 200,163,146 | +85,+85,+82 |
| Mandibular/jaw contact | 170,794 | 114,80,65 | 194,158,143 | +80,+78,+78 |
| Nasal root at inner-eye turn | 350,532 | 163,126,108 | 200,167,153 | +37,+41,+45 |
| Lower-chin value transition | 323,811 | 176,138,117 | 199,164,148 | +23,+26,+31 |
| Malar center/bounce | 215,673 | 208,159,136 | 219,183,163 | +11,+24,+27 |
| Forehead warmth | 178,387 | 227,199,186 | 209,177,163 | −18,−22,−23 |

These are local color witnesses, not validated source skin segmentation, photometric BRDF recovery, or the independently audited 18 final-render anatomical landmarks. The earlier V35 study explicitly found that **six opaque cheek stickers failed** naturalism; this attempt intentionally uses translucent, physically wax-pressure-built underpainting instead.

## Five-axis drawing deconstruction

1. **Topology and anatomical attachment:** Reuse **existing** named V43 five ANAT1 native surfaces `socket-near`, `cheek-malar-cast`, `cheek-malar-bounce`, `nose-root`, `chin-plane`, all clipped to the exact same source-registered face with original **complete cubic path strings unchanged**. No new face discs, shadow strips, hair contours, cheek geometry, eyes or lip shapes. Other V43 nodes are **deep-identical** in ID order, geometry, fill, grain, paper and timed animation.
2. **Vector and light flow:** Original near orbital undercut points naturally toward zygomatic underturn. Deep, warm-brown muted wax occupies orbit + far lateral cheek/jaw; cheek crest receives a narrower warmer light bounce. Source right nasal root recedes into the eye socket; lower chin rolls into original mandibular underside. Do not create independent circular cheek blush or geometric digital stripes.
3. **Physical pigment edge:** Preserve all existing source Bézier controls, `coverage:"open"`, `deposition:"stroke-built"`, native tooth, dry nib, feathered contacts and source-specific original frame timing. Source-measured changes target the pressure/wax occupancy and muted multi-pigment triads. No `coverage:"opaque"` sticker and no image gradients/screens supplied from a file. Background V43 native wax remains unchanged.
4. **Depth and microtexture:** Eye/lid/brow/iris/upper-lash and far-occluding hair remain on original parent layers, 18 source-root contact strokes and V43 19 photographic foliage contours retained. Original skin's underlying pigment and wax-marks are **not flattened**; overlay only changes five material parameters at existing soft anatomical glazes. Near-crown, ear and oral cavity remain same. Ensure skin roughness is not erased or made flesh-colored plastic.
5. **Animation and reversibility:** An opt-in new stage `midfaceForm:"source-anat1-five-tone-v44"` over V43. V43 is an unmodified negative control. Same original 608×1082 camera, deterministic seed, source shape topology, 300-frame film. Three independent !dev Storybook states: full 1×, near face 1.6× and cheek/orbit macro 2.12× with original absolute playback controls.

## Independent QA and rejection gate

- Unit: every original V43 ordered element ID and path, every source face/hair/foliage/brow/iris/film primitive identical, except the physical **pigments and pressure/contact settings of exactly five original native wax faces**. Low `detail=.2` and high `detail=1`, determinism, original coverage/masks/timing and all source controls; malformed or unrelated input raises.
- Chromium: same-head V43 and V44 608×1082 full and 1.6× face macro, absolute f299. Preserve actual-source-background pixel array at top-left against V43 exact decoded PNG (not merely the same DOM or JSX). Facial pigments must measurably change without missing huge compositor tiles, overpainting eyes or erasing original photographic hair contact.
- Photo quality: source vs matched V43/V44 native f299 in 11 established background/face ROIs, plus extra 7×7 anatomical samples here. **Correct 85-RGB cheek shadow alone is not sufficient** if it becomes a hard brown patch or destroys 3D volume. Inspect at 1× and macro, reject distorted/flat face and any unintended near-eye iris shift. No reliance on structural tests alone.
- Whole-portrait release threshold **≥0.85 RGB SSIM** versus the photographed CC0 capture. V43 whole **0.496979**, below; V44 unmeasured until actual screenshot audit. Independently validated final-render 18 landmarks, five complete 3D/tonal planes, all 300 frames at normal speed, and professional artist approval are still required.

**Decision before pixel review: ART HOLD, do not merge.**
