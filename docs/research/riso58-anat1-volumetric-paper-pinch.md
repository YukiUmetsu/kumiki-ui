# RISO58 — 3D-depth ANAT1 hand surface from the ORIGINAL living print joints

**Status:** ArtCraft experimental, review required. This continues the existing [Risograph PR #471](https://github.com/YukiUmetsu/kumiki-ui/pull/471). **Do not merge because code or print tests pass alone.**

## Reference study: actual grasp, not a guessed decorative contour

- [The Orthopaedic Physical Examination, Hand and Wrist, Figure 4-1](https://cintabukumedis.wordpress.com/wp-content/uploads/2014/01/the-orthopaedic-physical-exam.pdf) differentiates *side pinch/key pinch*, *tip pinch*, *chuck pinch*, and *hook grasp* in actual human hands. The page transfer is a **lateral/tip pinch by thumb and index**; the middle, ring and little fingers are supporting volume behind the paper and must not form a second symmetric claw.
- [CMU Paper/Hand Real Photo Study, fig45](https://www.cs.cmu.edu/~jialiu1/dbimg/fig45.jpg) (reference-only photographic gesture; no image pixels redistributed) shows the page-edge thumb/index opposition with the thenar arch continuous to the wrist while unopposed fingers remain in the receding palm plane rather than three equal frontal tubes.
- [Proko — How to Draw Hands: Details for Realistic Hands](https://www.proko.com/course-lesson/how-to-draw-hands-details-for-realistic-hands/) gives an artistic muscle/tendon and skin crease study; the original blue printed knuckle crests must belong to the moving skin, not float on top of a new RED geometry.
- Kumiki's own [ANAT1 clinical joint spec](../../skills/kumiki-human-anatomy/SKILL.md) and `registry/anatomy/anatomy-pose.ts` constrain the true 4 individual MCP→PIP→DIP phalanx lengths and independent active thumb IP.

Reference *observations* used for original source construction. **No photography, stock image, scanned mesh, raster texture, sample tracing, learned pose inference, or external model is imported into the reusable RISO2 code**. Static sample pictures and copyright remain with their respective owners.

## Why RISO49–57 failed visually

Earlier tests required all 12 RED phalanx source parts, real separate COBALT nails, full 24fps movement, ANAT1 axis gap, the paper index-over/thumb-under, and true physical negative finger-web knockouts. Those are strong **software/stencil** gates. But an anatomical camera-facing palm is an *outer continuous skin volume*, not 4 independent world-space 2D fingers pasted near a hand-colored polygon. At real 6.2× and real 2.15× film f160/f166, the RISO57 Courier palm was a sharp sleeve-to-finger red wedge with hanging red tips; Paper Artist had a hollow V-shaped non-opposed support digit and detached-looking pads.

RISO57's 16-C1 red palm envelope still **guessed its y and x contours from fixed authored 2D landmarks**, while the living Courier INDEX actually drifts and retracts at f160. The result was fundamentally misregistered to the current joint source even when f0 rest coordinates were correct.

## Actual RISO58 3D clinical depth reconstruction

`src/video/riso58-anat1-volume-skin.ts` uses only the **original** RISO31/RISO49/RISO48 moving clinical source joints and the **original** `RISO31_GEOMETRY` bone lengths. At f160 (the real shared-paper frame):

1. Evaluate the complete existing RISO2 character and solved original IK, not a manufactured sample pose. Invert the TRUE moving palm joint affine matrix, retrieving all four MCP/PIP/DIP stations in the same local source frame as the printed positive RED palm.
2. For each moving two-dimensional proximal/middle bone segment measure its existing projected length `d`, and read its true original anatomical length `L`.
3. Reconstruct the magnitude of its invisible depth axis as **`|Δz| = sqrt(max(0, L² - min(d,L)²))`**. Thus the 3D distance from MCP→PIP and PIP→DIP equals the unchanged clinical source length. No made-up 2D shortening factor is substituted after the fact.
4. **Depth-sign ambiguity cannot be inferred from one 2D illustration.** The authored original pinch and visual reference choose INDEX in front and three unopposed fingers curled behind. The given source is **not** a medically calibrated 3D camera or actual patient surface scan.
5. Use the actual moving thumb root and IP to reconstruct the first index/thumb saddle, thenar bulge and first-web soft tissue. Fit the four other knuckle peaks and inter-finger valleys to **actual** MCP root stations (not guessed RISO57 fixed points). Hypothenar heel is anchored to the real ulnar/pinky source line.
6. Model the visible 3D skin as **16 named, original, differentiated x/y/z skin stations** with near/far thenar, first-web, four digital crests and hypothenar depth. Apply a single mathematically defined orthographic yaw (65°) and pitch (−13°) whose flat Z=0 plane is calibrated to preserve the original 2D source-joint registration; use per-actor hand mirror. Regenerate **the same one** original RED `left|right-glove` contact-view positive 16-C1 source contour via shared Hermite derivatives. Original f0 red bytes and opposite hand are untouched; original approach/release morphs remain smooth.
7. Retarget the **existing** two 4-C physical paper-negative RISO54 interdigital stencil IDs to the *new* moving 3D red web stations. The first version incorrectly left those outside/inside the new red envelope; the prior RISO54 cutout-inside AND cutout-outside independent tests correctly rejected it. We preserved every assertion and corrected the true ink source rather than hiding the blocker.
8. Re-register the **existing** four COBALT MCP engraving facets through an inverse-distance-weighted displacement field from the **same 16 original-to-3D red skin knots**. Source BLUE facets remain their true 16-C source strokes and same old named parent joint, adjusted for its original +11-unit local offset; no disconnected new blue detail, layer override or third ink is added.

The output is a **source-authored 2.5D volumetric image-model**, with true 3D reconstructed proximal/intermediate bone lengths and a depth-conditioned single printed red palm plus blue pressure. It is **not a full deformable mesh** of muscle/skin tissue, full physically-based occlusion of the red finger bones, photogrammetry or proof of anatomical realism. A complete photo-calibrated mesh and observed thumb/finger occlusion ordering remain potential subsequent work if 1× art is still not convincing.

## Original physical print / real React / cinema unchanged

- Same 16 connected source **cubic RED-positive skin** Béziers (RISO57); exact original `left|right-glove` ID, red spot master, rest path and actor distinction. No extra body part/texture/fake compositing sticker.
- Same original COBALT four independent anatomical MCP planes, original moving blue nail beds, source forehead/face detail, cap, coat, shoe and page story.
- Same 12 original finger RED anatomical phalanx sources, clinic joint lengths, original PIP/DIP camera shortening RISO48/49, original under-pressure RISO41, original RISO42 >3-axis/finger ink-no-intersection tests.
- Same two **genuinely negative** animated moving RISO54 ink-clearing web notches now anchored to the RISO58 skin; unchanged original `knockoutOnly` and 4-C source topology; still invisible before paper contact.
- Same actual RISO43 paper-over-thumb/under-index pressure, physical page knockout and **two real press inks**. Original 240 cels at 24fps and both RISO56 16:9 / 9:16 authentic film cameras are unchanged.
- Original story remains under existing `Video/RISO ArtCraft` group, not a new Storybook folder. The hand workbench exposes actual computed `data-km-riso58-reconstructed-bone-rays` = 4, `data-km-riso58-source-surface-z` and `data-km-riso58-source-contact-volume` at f160, all from genuine RISO2 source readback and clinical joint models.

## Tests and independent release gate

- `tests/riso58-anat1-volume-skin-artcraft.test.ts` covers the **real 3D Euclidean bone-length equality** at the source f0/f144/f156/f160/f166/f180/f202/f239, independent signed depth, shared camera and true original palm-local inverse transform (no stage-coordinate cheating). Verifies original sixteen continuous C1 red Béziers, closed non-self-crossed palm ink, unchanged all original part IDs/ink plates/paint, and f0 identity. Original COBALT has four closed separately printed contours and true 16-C surface-aligned contact redraw.
- All original RISO31–57 tests retained, including RISO54's independently strict paper-clearance interior/exterior intersection rather than weakening it; RISO33 >3 source bone-axis space; RISO42 physical RED no-cross; RISO43 actual sheet and two-color pressure through both active actors f160/166.
- Source geometry reads **actual live actor**; native Chromium renders physically screened original RED and BLUE masters at f144/154/156/160/166 and 6.2×/7.4×, plus actual original full 16:9 and 9:16 f160/f166 scene at normal 1×.
- **Render-based artist acceptance, mandatory and independent:** compare exact RISO57/RISO58 same-frame images. Both active hands must read as unmistakably natural contact masses with connected index saddle and folded three-finger support. No new red wedge, blue crease off flesh, isolated pad, empty palm-white hole, or floating nail. A signed depth reconstruction or CI pass alone is NOT approval and MUST NOT cause merging PR #471.

### Initial 3D red-volume-only intermediate evidence — approved technology, rejected visual finish

At the code head `57e151e5be9ee7fc837b8e647b3cc5d3b4641bf5`, before moving the COBALT MCP engravings, [all 3 GitHub workflows succeeded](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43939653560), including [physical two-ink screenshot artifact #14260898717](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43939653560/artifacts/14260898717). Actual matched **RISO57→RISO58** f160 native-pixel changes (>6/255):
- True RED workbench master: **0.25037%**, BLUE: **0.01023%**.
- 1600×1198 two-actor hand workbench **0.24943%**.
- Original 958×539 full 16:9 f160 **0.04125%**, f166 **0.04106%**.
- Original 448×799 full 9:16 f160 **0.05811%**, f166 **0.06034%**.

This reconstructs real bone-depth and reattaches the positive palm knot to the live index, but the red silhouette at 6.2× still visibly has **a hanging three-pad anatomy/flat-glove problem**. Another coat of detail alone cannot correct 3D depth/occlusion of 4 fingers. Mark ArtCraft finish **HOLD** pending physically registered cobalt and actual final-head screenshots; the present calculation is an experimental construction, not a world-class print illustration.
