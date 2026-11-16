# RISO56 — macro-shot cinematography without substituting print anatomy

**Status:** Original film-camera candidate on the existing [Risograph ArtCraft PR #471](https://github.com/YukiUmetsu/kumiki-ui/pull/471). **Not an anatomical or artistic approval.** The photographed three-quarter grip in RISO55 remains unverified, and original 1× full-body f160 rendered the important real hands at approximately 20 stage pixels tall. The previous ten incremental source edits had negligible full-film visual effect because of this editorial shot-distance defect. A new ink hatch/thumbnail is not a valid solution.

## Authentic references, before code

- The genuine [Unsplash Van Tay Media photograph, *Person handing over paper*](https://unsplash.com/photos/person-handing-over-paper-Kab_-4M4I74) shows the social exchange itself: two human arms enter from opposite sides and the viewer focuses on the page and living hand-edge contact, not two entire persons standing under a header.
- The real [CMU hand/paper photographic database](https://www.cs.cmu.edu/~jialiu1/database.html) and [Proko drawing realistic hands](https://www.proko.com/course-lesson/how-to-draw-hands-details-for-realistic-hands/) show an index/thumb saddle, a recessed ulnar support region, and tissue compression at contact. Neither a picture, pixels, photographic depth map, nor traced contour has been imported into Kumiki.
- The original Risograph 2-ink medium constrains the shot: exactly the original RED and COBALT screened stencil sources, original paper knockout, authentic halftone/dot registration and grain. A camera is the **one world-to-film transform** on all physical content, not separate SVG scales of each character, a new letter sticker, or re-rendered raster textures.

## Editorial diagnosis

Original 960×540 f160 native film showed the 210-pixel-wide page and roughly 20-pixel-high crucial hands below an oversized title in an otherwise empty paper sheet. RISO49–55's original individual vein/finger/knuckle/paper details **cannot read as human hands at 1×** even if 6.2× Storybook unit proofs are correct. RISO55 quality review still found mitttens and sausage-like terminal tips. A "premium" shot must visibly communicate the instant of touch and transfer.

## RISO56 original source camera

`src/video/riso56-handoff-camera.ts` exports **pure** `evaluateRiso56HandoffCamera`, `riso56CameraMatrix`, `riso56ProjectPoint`, and `riso56ProjectPlacement`. No browser, scroll state, timer, noise, shader, fake floating close-up hands, 3D distortion, or external animation package.

| Story cel (24fps) | Lens | Meaning |
| --- | --- | --- |
| 0–142 | Exactly 1×, matrix identity | Full-body two-human introduction and real typography untouched. |
| 143–160 | Smoothed, independent aspect-ratio dolly-in | Follow midpoint of **actual source rig** paper-contact anchors; do not hardcode a separate fake page. |
| 160–180 | 2.15× landscape / 2.20× portrait | Real hands and original page dominate the frame, physically together. |
| 181–206 | Continuous dolly-out | Release starts, index lifts, receiving hand retains original page. |
| 207–239 | Exactly 1×, matrix identity | Both human figures and paper settle in the original frame, unchanged. |

The camera projection is `x' = zoom*x + tx; y' = zoom*y + ty`. `tx/ty` interpolate from exactly 0 at source rest to a physical paper-anchor center target (16:9 `x=480,y=359`; 9:16 `x=270,y=475`). `source` and `receiver` are the **two evaluated RISO40 ANAT1 thumb/index paper anchors**. No design-time printed-sheet center guesses. Film clips intentional portions of hair, shins and arms during close-up; the stage is not expanded or made a new picture.

One camera matrix covers both **existing** authored actor ink/kockouts (character placement x/y/scale), the paper-shaped physical background knockout and original paper ink masters (stage SVG matrix), index-over-paper supplemental real ink passes, optional anatomical bone/debug anchor markers, and even real original ankle pressure marks. Camera itself is pure: full frame timeline, physics, contact pressure, ink/master paths, print-sheet world coordinates, original thumbs, original user adjustable paper curl, page registration and screen density are unchanged. No third plate and no alpha/translucent fake scene.

When zoom exceeds 1.22, the full-body title disappears to give the enlarged gesture genuine reading space; original print title returns with the editorial wide. Existing Storybook has an **on/off native camera toggle** for a same-cel 1× comparison. All existing film manipulation, print tint/density/aspect/hand-prop controls remain.

## ArtCraft verification gates and hard blockers

1. Exact identity source matrix and original placements at f0, f142 and f207..239, actor and paper world state unmutated.
2. Every source frame, both output aspects: smooth zoom without a single-frame jump, true RISO40 anchor-centered camera. The sheet and its two active grip areas must remain inside 16:9 and 9:16 paper stage; allowable intentional crop is **body only**, not the story-essential page or index pressure.
3. All real separated red/blue masters, original letter knockout, existing RISO43 index-RED/PIP and independent cobalt engraved fingers above the opaque sheet, original under-paper thumb and unopposed support all still register after camera. No simplification, no pasted standalone hand, no inset composited photograph.
4. Existing RISO14 full-human wide visibility gate retained *before and after* the cinematic shot. Intentional crop during f154–202 is separately gated by minimum onscreen human ink and full visible source page bounding rectangle; no overall regression-tolerance waiver.
5. Original `tests/riso56-handoff-camera.test.ts` protects the true world-state source, both 240-frame logical scales/clip boundaries, source camera matrix, opposite aspect ratios, and playback off toggle. Native `riso-human-ensemble.spec.ts` checks actual Chromium SVG ink and paper geometry at f0,142,156,160,166,177,189,202,239, including original 2-ink physical separation and screenshots. Only then compare 1× real 960×540 and 540×960 screenshots with RISO55.
6. **Visual release gate remains independent:** close-up should make the human fingers' individual source details clearly visible; but it may also make poor mitt geometry more obvious. If so, do not merge #471. The priority after a successful meaningful source shot is a truly positive 3/4 thumb–index–ulnar hand silhouette reconstruction with camera and source plate QA. Only true source ink changes can solve shape; editing the camera does not certify realistic anatomy.

This is a non-photoreal, original 2D editorial camera/ArtCraft study, and not a verified physical Risograph press run.


## Native Chromium acceptance, exact staged film comparison

**Baseline RISO55:** [CI run 43914165728](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43914165728), physical source artifact `14249167658`. **RISO56 pre-toggle exact source head `42df33b4dad22af8dcc86e56ac49b3fe44277932`:** [CI 43917937911](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43917937911), physical native same-CI f0/f142/f156/f160/f166/f177/f189/f202/f239 both-aspect screenshots and real RED/BLUE source masters, artifact `14250952509`. Both builds passed three independent Actions workflows before final on/off toggle browser-test addition.

Original exact PNG data at same viewport, >6/255 max-channel delta, screen size 958×539 (landscape) and 448×799 (portrait):

| Authored cel | 16:9 changed pixels | 9:16 changed pixels |
| --- | ---: | ---: |
| f0 | **0%** | **0%** |
| f142 | **0%** | **0%** |
| f160 | **26.630%** | **16.613%** |
| f166 | **26.511%** | **16.609%** |
| f202 | **6.687%** | **6.547%** |
| f239 | **0%** | **0%** |

This is finally a **material 1× film composition change**, unlike RISO49–55 fingertip ink source differences of <0.05%. Screenshots show the original two-person handing scene filling frame around the paper edges; native f160 16:9 closes from ~210px-long original sheet to a legible ~450px length. Source f0/f142/f239 are pixel-identical. Critically, the camera is not a brush/gradient overlay and the two real actors/print layers remain intact.

### Real artist's visual critique — still rejected

The enlarged f160 image **exposes**, rather than resolves, the original hand defect: Courier's real RED positive thumb/index junction forms an oversized square/angled side-pinch, surrounded by broad brown-red coat material; Paper Artist's upper RED pads are separate rounded blobs disconnected from a convincing carpal/MCP body, and an angular V-shaped source finger curls below the page. At 6.2× anatomy workbench, the palm remains broad, red fingertip roots do not follow a real 3/4 overlapping proximal phalanx and the pressure is indicated by paper overlap rather than a genuinely continuous index–thenar–metacarpal silhouette. Faces/upper bodies are intentionally cropped by the close-up; film output remains visually coherent but anatomy is **not authentic photographic or premium-illustration quality**.

**RISO56 visual verdict:** CINEMATOGRAPHY PASS, ANATOMY FAIL, HOLD DRAFT. Source/stencil/register tests prove technical integrity only. **RISO57 next:** reauthor a *single connected positive-ink contour* across the radial thenar/index MCP and folded ulnar three-finger support, with measured true original ANAT1 joint landmark overlays, non-self-intersecting exterior concave/convex web transitions and independently registered cobalt tendon/fold morphology; explicitly reject floating red blobs or visible zero-area seams. Preserve precise finger/hand articulations and both physical ink masters, prove at 1× and 7.4× under the actual cinematic shot. Do not substitute a paper-coloured mask, cartoon sticker or overlapping same-RED rectangles, and do not weaken RISO42 physical ink-intersection thresholds.

## Independent real-frame composition correction (RISO56b)

Initial valid landscape f160 native at 2.15× centered the paper at y≈289. It revealed the handoff but **cut across the top of both foreheads** while the lower faces remained visible: an unintentional partial head crop. The corrected 16:9 source lens targets y≈359 (66.5% of stage height), retaining both original facial contours while the letter is still entirely on stage. Initial portrait 1.36× scarcely enlarged the handoff at 1× film; corrected portrait 2.20× uses the **same true original live paper anchors** to frame upper bodies and the physical page with leg crop instead of tiny whole figures. This changes only one common world-to-film lens, *not* original human anatomy, ink paths, source pressure, paper stencil, or frame timing. Compare the new native f160/f166 PNGs independently; prior RISO56 (2.15×/1.36×) screenshots are a **rejected composition** for final release.
