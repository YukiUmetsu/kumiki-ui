# RISO52 ArtCraft — physical folded distal pulp and attached cobalt nails

Status: **candidate, art release not approved**. Extends RISO49–51 draft PR #471. No new character, no third ink plate, no copied reference pixels, no flattened effects, no deletion of hand anatomy.

## Exact preceding rendered failure
RISO51's actual 1600×1198 original 7.4× Chromium f160 print shows three long, separated red fingers extending outside each original human's moving palmar cup. The donor points toward the lower left, the receiver toward the upper right. In the source rig, the PIP and DIP joint stations and six proximal/middle red polygons already shorten for a three-quarter view, but **the three terminal RED distal pads and the actual COBALT nail insets remain at full frontal drawn reach**. This visible mismatch survives the new 16-C palm and local MCP print.

- [RISO51 exact-head native source print run](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43872099334), archive ID 14228975537.
- [CMU Hand Holding Papers: original side-three-quarter photo](https://www.cs.cmu.edu/~jialiu1/database.html), image fig45 (technique reference only). The three support digits' pads recede and stack under the paper edge; the thumb rests across a continuous radial saddle. A tip never projects as far as its real bony length in this view.
- [Proko: Details for Realistic Hands](https://www.proko.com/course-lesson/how-to-draw-hands-details-for-realistic-hands/), finger-pulp cap, nail fold and palmar curvature. Clinically full bone length differs from its two-dimensional projection.
- [MICA Risograph File Prep](https://www.mica.edu/campus-life-and-resources/places-and-spaces/maker-spaces-fabrication-studios/printmaking-studio/risograph-file-prep/) and [University of Illinois Risograph Guide](https://web.faa.illinois.edu/app/uploads/sites/6/2021/05/riso_print_guide.pdf): distinct real ink masters, print separation, visible misregistration, screened cobalt values. Physically changing one ink without its attached registered counterpart creates a detached nail or accidental third-ink visual.

## Five-axis source deconstruction

| Axis | RISO51 measured/source defect | RISO52 source correction | Rejection condition |
| --- | --- | --- | --- |
| Continuity | Two shortened PIP/DIP stations but full-length distals, red pulp extending beyond actual folded hand. | Six named moving original distal paths get individual projected length, 49–58% of their original 2D reach, without changing their source joint/ink identity. | Abrupt detached red caps, broken PIP/DIP overlap. |
| Line of action | Three terminal clubs fan out in competing vectors. | Contact shortening is asymmetric by digit and actor; original live MCP/PIP/DIP rotation and source-scale paper bridge still provide the vector flow. | Rigid pasted caps or identical three printed fingers. |
| Volume | Long rounded distal red tubes read as full frontal reach. | Original complex 7-C/quadratic distal shape rebuilt at the same DIP source in three-quarter projected reach. Preserve original pressure bulge, contact overlap and asymmetry. | Simplified rectangle, flat capsule or altered active index/thumb. |
| Ink/edge | New red pulp ending earlier without cobalt nail would leave a floating blue mark. | Each original blue multi-contour nail is *reprojected* at the same moving DIP joint with all original C/Q/M/L control curves and screenTone, not replaced by dots. Two-ink RGB registration and paper grain remain. | Detached nail, unsupported stroke, new screen master or third color. |
| Timing | Static edits would jump frames or lose exact original 24fps spot film. | Reuse RISO51's validated 0,146,160,180,205,239 2D vector-path source keys and its 2-frame print cadence; both artists separate. | Non-deterministic frame playback or f160/f166 lost real paper-tip contact. |

**No factual claim of 3D landmark calibration:** the factor range is an authored stylization estimate and must be judged against actual physical-ink film, not treated as real anatomical bone compression.

## Implementation and proof requirements

- New `src/video/riso52-folded-terminal-source.ts`: original joint-bound red distal pad paths for middle/ring/little, plus all three original cobalt nail paths. Enforce strict original M/L/C/Q/Z topology, valid projection range, no foreign SVG, no alpha blend or bitmap.
- `src/video/riso51-view-conditioned-source.ts`: retain RISO51's eight physical source forms and add six more original paths, **14 total per active hand**. Contact stage at f160, continuous 240-frame timeline. The other hand and opposing thumb/index source remain exactly original.
- Existing Storybook hands workbench: native two-master 1×/6.2×/7.4× source printed states, blue/red split, actor, side, pose, rig and paper-grain controls; live RISO52 three moving nail/pulp pairs diagnostic. No additional Storybook folder.
- New tests: matching BLUE nail/RED pulp transforms and source curves across both original humans and 120 physical 2-cel samples, strict 3+ bone-axis white spacing, 12 moving red sections, and true RISO44 thumb-under/index-over physical paper edge in both portrait and landscape. E2E asserts original physical source stamp counts and visually records each frame.

## Release gate

1. TypeScript, all inherited RISO32–51 source units and changed units **must pass**; actual Chromium Storybook 1× and 7.4×, both ink masters and complete 16:9/9:16 film must run without errors.
2. Compare exact new f160/f166 hand workbench and 1× native 960×540 f160 to **RISO51 pixels**. Report measured crop impact, remaining angular/anatomical issues and any new false BLUE nail islands or paper-white ink bridges. No substituting raw pixel difference for artistic judgment.
3. **Keep draft until genuinely convincing visual form**. If genuine projected tip reduction is too subtle, next pass should reauthor ulnar MCP source roots and connected near/far fingertip overlap, not add ornamental hatch or remove printed pores. Reference-matched independent three-quarter hand landmarks remain unverified.
