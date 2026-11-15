# RISO28 — grounded arrival, source-time weight transfer and physical ink QA

**Scope:** the existing original Courier and Paper Artist two-ink 240-frame film. No raster painting, external character pixels, new Storybook folder, third ink, outline simplification, removed fibre, postprocess RGB halftoning or free-running animation clock. ArtCraft **production candidate**; independent human-identity anatomy and final-head visual approval remain separate gates.

## Authentic primary print and animation observations

- [Zine Hug *Crushed!* sequential risograph contact sheet](https://zinehug.com/products/crushed-contact-sheet) and [Zine Hug printed animation archive](https://zinehug.com/pages/animation): inspect *neighboring* poses, anchored silhouettes, tactile spot separation and stable on-paper identity. The observable motion should come from source cels, never per-frame noise.
- [Megan Chong risograph animations](https://www.meganchongdesign.com/work/riso-animations) and [Zack Lydon *Wind* animation production](https://www.catsuka.com/news/2024-06-23/wind-nouvelle-anim-en-riso-par-zack-lydon-imprime-par-zinehug-pour-tvpaint): repeated hand-drawn figure poses and patterned spot ink remain a cohesive authored character across a moving sequence. References to motion and printing **only**; do not reproduce subjects or frames.
- [Risolana printer preparation](https://www.risolana.org/printing) and [MICA printing instructions](https://www.mica.edu/campus-life-and-resources/places-and-spaces/maker-spaces-fabrication-studios/2d-prototyping-studio/riso-image-making-and-printing/): sequential single-ink master passes; paper substrate, screen coverage and registration decide how colors overprint. The press is not an animated full-frame shader.
- [SAIC *Everything Riso* registration/trapping guide](https://sites.saic.edu/servicebureau/wp-content/uploads/sites/20/2025/03/EverythingRiso_2024.pdf): edge continuity needs intentional knockout and overlap so offsets do not cut white gaps through limbs or paper.
- The source actor is the repo's original `COURIER` contour rig; its existing front-only human-anatomy model must not be mistaken for a measured person or a physically calibrated walk.

## Rejected baseline (RISO27 native full-frame and contact-sheet review)

The prior cinematic review explicitly rejected the **wide-legged Courier walk during release**, even after correcting portrait-stage clipping. Source: [RISO27 review](riso27-sequential-acting-artcraft.md). The previous boot track used a 66-source-frame full stride, 38-frame stance, two 33-frame-opposed feet and continued stepping to **frame 198**. At the actual sheet-contact f160–165 the left and right source target X positions could spread by more than 70 authored units; the donor continued stepping *after* physical sheet contact, leading to an unconvincing handoff. This is a topology/acting failure, not a reason to hide or soften the inked boots.

## Five-axis reference-to-code decomposition

| ArtCraft axis | RISO28 source decision | Negative control |
| --- | --- | --- |
| Topological continuity | The **same** Courier boot, shin, knee, hip, coat, hand and paper contours remain attached via the two-bone IK joint tree. Target positions are physically reached by the existing leg geometry; no shoes drawn in a new overlay. | Never move the paper independently of hand joints or detach its finger knockout. |
| Vector flow | Source root advances from x50 to x192 while boot targets finish at x173/x203. After last contact the pelvis travels gradually over a stationary base; leg/knee bend communicates weight. Arm pendulum keys follow the contact alternation, not unrelated oscillation. | No arbitrary global position wiggle, camera pan or scaled-leg trick. |
| Width and edge | Original 22→17 unit thigh taper, 17→15 shin, 2 ink plate masks, seam engravings and all non-leg source shapes are retained. Real print masters still control dot sizes, angle, registration and paper fibres. | Do not blur, flatten detail, replace a printed body with an emoji/circle, or fake an RGB texture. |
| Rhythm | Original 24fps **240-frame** film, deterministic seek, complementary **54-frame** steps with **31-frame stance**, half-phase right at **27 frames**; each foot travels three original 46-unit strides. Left and right finish the source walk by **f165**, with both on paper from **f162** onward. Six small graded body weight compressions replace the mismatched 66-frame bounce; a single softer f180 settlement is retained. | No looping from f239→0, no time-dependent random jitter, no both-feet-airborne frame. |
| Microtexture | Source blue/red solid and screened inks and post-RISO26 light/mid master values are *untouched*. RISO20 tests now correctly count six real patterns (normal/light/mid per plate), asserting the same physically deposited ink instead of a stale two-pattern limit. | No uniform alpha reduction, image-filter wash, missing grain or unsupported simulated real-press calibration. |

## Construction, exact positions and invariants

At frame 162, left physical print foot target `(173,0)` and right target `(203,0)` are both in stance (source character coordinates). The IK sampler clamps **the target clock**, not the reach, at frame 165, so these points remain independent of film seek order through frame 239. The pelvis continues its original approach to x188 at f198; in source coordinates the pelvis then lies between original left/right hip-rooted planted feet, with no later boot slip. No new foot primitives, no change to last/first frame ownership, no change to two-color paper reception.

**Independent construction rejection and correction:** The first pass only checked screen-space foot position and missed an **unreachable target**: the f136 right-foot source target stood 8.6 units beyond the 40+36-unit two-bone chain. The solver silently clamps that ankle and draws a physically broken foot plant. This fails ArtCraft topological continuity. Added source pelvis/root keys `f135→(152,-2)` and `f165→(168,-11)`, so the right hip arrives before the third contact, then eases down into the two-foot base without altering any foot ink geometry. Solved original 24fps 240-cel rig now checks **both** foot chains for actual `reachable` and joint-solution error below 0.02 at every frame; raw sampled target coordinates alone are insufficient.

**Storybook:** existing `Video Production / Film Looks / Risograph / RISO27 Full-Film Acting & Physical Contact` receives a `Foot plant f165` source marker and explicit approaching/grounded status. This still uses the real `RisoHumanEnsembleStudio`, not a separate demonstration renderer.

**Tests:** new RISO28 source test checks both-foot airborne rejection over every arrival frame, final target continuity for all remaining frames, real evaluated ankle coordinates and paper actor stage for 16:9 and 9:16. Existing RISO27 production test includes the additional source cue. Chromium Storybook 16:9/9:16 captures include f162/f165/f198 and verifies actual page state; RISO20 AM/FM source master test is updated for the RISO26 screen contract.

## Release gate / independent artist decision

1. Run typecheck, RISO20/RISO27/RISO28 tests and related original RISO IK, paper, print regression tests on **exact PR head**, with both 16:9 and 9:16 native Chromium runs.
2. **Actually inspect** native print contact-sheet stills f135, f140, f159, f162, f165, f178, f198, f202 at 1× and close crops. Verify grounded feet, plausibly bending knees, no contact toe clipping, hair/ear preserved, paper silhouette clean, no obvious unnatural fast shuffle. A passing numeric gate is not an animation approval.
3. Source-human structural gate remains **unapproved**: proportional leg-to-body anatomy, genuine profile/3/4 source, 18 independently observed photo/character landmarks and independent ArtCraft human resemblance gate are not available. Do not label this a certified realistic human.

If final-head screenshots show a too-fast stepping cadence or mechanical shoulder/hip acting, **keep PR unmerged** and revise the source rig. Next art priorities after this pass: reference-led torso/counter-rotation, anatomically measured hands and 3/4 identity, then a full encoded source film from both aspects.
