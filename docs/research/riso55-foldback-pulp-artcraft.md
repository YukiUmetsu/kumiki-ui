# RISO55 — original printed 3/4 distal pulp foldback

**Scope:** the existing RISO49–54 draft PR #471, original Risograph ArtCraft Storybook. Original two color ink, 240 frames, five living source digits. Artistic approval is separate from source validity.

## Original reference photographs and artistic breakdown

[CMU Hand Holding Papers, fig45](https://www.cs.cmu.edu/~jialiu1/dbimg/fig45.jpg) is a close cropped real right hand holding a physical white-paper edge. The **thumb nail faces camera and points along the page**, while the index and upper unopposed digits are folded **laterally back across the palm** instead of continuing downward as three vertical sausages. Index/thumb produce the main sheet pressure. Middle, ring and little finger form a compact and overlapping row of curved pulp volumes with small, differently rotated nail caps. Asymmetric dermal folds and localized nail beds are bound to the individual distal phalanges, not repeated arcs on the whole palm.

Compare [Proko Hand Details](https://www.proko.com/course-lesson/how-to-draw-hands-details-for-realistic-hands/) for tapering distal pads and bony DIP structure, and [Kenhub Anatomy of Grip](https://www.kenhub.com/en/library/anatomy/anatomy-of-grip) for thumb opposition and varying MCP/PIP/DIP flexion. The pinch-specific image is an observation of morphology, **not permission to copy or distribute the image**, and no photo tracing/pixels are present in code.

Five contour dimensions:

1. **Topology:** true living ANAT1 four-finger source (MCP→PIP→DIP) with attached thumb-index paper. Each support terminal must turn back toward the palm rather than becoming another dangling pointed tine; do not fake a missing joint.
2. **Vector flow:** three different angle signs and magnitudes, distinct nail-bed curvature, original unequal lengths. At the far tip, the photographed curled pulp projects mostly sideways and can return toward the metacarpal hollow. The projected bone stations are already foreshortened by RISO54, but the *printed distal pulp* still extended straight beyond them.
3. **Edge characteristics:** preserve all original RISO38 asymmetric distal PULP cubic/quad control flow and blue nail source paths. Retain the negative overlapping root on the original DIP joint to prevent gaps; focus the 3/4 surface turn on the **positive-y region only**. No tiny decorative replacements of macro anatomy.
4. **Physical stencil:** original RED solid distal positive-ink source and original BLUE screened moving nail are projected identically. Both retain the exact original SVG path-command topology, printed material/registration, original paper clearing source, RISO43 index-over and thumb-under physical transfer.
5. **Animation:** rest and approach are the original prints. f146→160 continuously interpolates original SVG Bézier points, the actual letter is physically supported at f160/166, then donor releases and receiver holds. Every 2-cel frame tested; original opposite hand and actor identities remain untouched.

## Source implementation

`src/video/riso55-foldback-pulp-source.ts` reprojects each original local DIP ink-point `(x,y)`: **the named original DIP source pivot (0,0) stays fixed and the entire distal pad rotates as a rigid positive-ink mass**; this preserves the original overlap near its moving joint and prevents the source contour from collapsing into a narrow self-intersecting stroke. Each contact point rotates into the palm by actor- and digit-specific signed source-view angles (Courier: middle 106°, ring 148°, pinky 114°; Paper Artist: 104°/146°/112°). Formula:

```
x' = x * cos(viewAngle) + actorHandSign * digitFoldSign * y * sin(viewAngle)
y' = -actorHandSign * digitFoldSign * x * sin(viewAngle) + y * cos(viewAngle)
```

`RISO31_GEOMETRY` represents the **true canonical clinical bone**; these angles are original 2D illustration/camera-projection decisions, **NOT clinical DIP rotations**, and should not be confused with anatomical ROM. The existing `RisoCharacterPart.pathKeys` (RISO51) interpolates the same number of original M/C/Q/L/Z source vertices and preserves exact f0 source bytes. `riso52FoldedTerminalContact` now applies the *same* RISO55 fold to its existing RED printed contact pulp and the cobalt nail after its original foreshortening. All 12 RED original finger segments per actor, original detail bands, 2 authentic inks and exact named DIP moving transforms are preserved. No new printable part IDs, dependencies, image filters, alpha layering, raster, nor hiding/redacting earlier details.

## Verification / reject conditions

- `tests/riso55-foldback-pulp-artcraft.test.ts`: original/3/4 print command topology, changed red terminal positive-y return, red/cobalt same living DIP joint and true double spot-ink, no source actor leakage, original strict 3-unit no-crossing real bone axes for all 120 held cels and actual index/thumb physical letter contact at f160/f166 in both 16:9 and 9:16.
- Existing RISO31–54 tests, strict TypeScript, Storybook build and native Chromium 2-color masters. New live `data-km-riso55-folded-source-tip-count` samples actual moving red printed source geometry at five Storybook stages. All original UI states, density, side swap, 6.2×/7.4× crop remain.
- **Native human visual release gate:** compare exact f160/f166 RISO54 and RISO55 two-hand zooms and physical film 1×, not just tests. The donor should read as a compact flexed side pinch rather than hanging claws, receiver should present a supported page, both should maintain natural relative thumb/index size. If the distal source folds into unnatural ribbon angles, self-intersections or two-spot noise, reject despite passing tests and return to natural-convex origami-like positive contour. A small percentage of full film pixels changed cannot on its own establish premium art.
- **Next large option** if source art still fails at 1×: plan a genuine storyboard close-up transfer beat of the two attached inked hands, replacing—not obscuring—the bland wide shot at f154–186; verify strict consistent camera, physical page grip, both aspect ratios, safe reading space.

**No art certification**: 2D artistic projection without calibrated 3D or source-photo landmark alignment. Leave PR draft until visible native hand contact genuinely meets reference-led human anatomy.

## Rejected projection attempt and corrected positive ink

The first RISO55 candidate moved only positive-local-y control points back toward the palm, leaving the negative-local-y attached root fixed. This produced a folded/overlapping polygon that **lost signed printable pulp area** (3.8 and 3.2 square source units, below the existing RISO52 >4 release gate). An attempted transverse-width expansion further collapsed some digit shapes (2.6/3.1, and one new custom test just 1.47). **Those candidates are rejected; thresholds have NOT been relaxed.** The source now uses a single proper rotation around the live DIP source origin, determinant +1, preserving printed pulp area and winding exactly; the cobalt original nail follows the same transform. That preserves true silhouette mass and remains subject to native screenshot critique. The original >4 printed pulp area contract is retained, with an additional near-isometry area regression check.

## RISO42 physical red-tip collision correction

The first proper-rotation proof restored signed red pulp area, but the original RISO42 *real printed ink gap* correctly caught **zero source red gap** between rotated adjacent terminal pads (Courier ring/pinky at f160; receiver middle/ring and ring/pinky at f166). These real material intersections are a quality defect, not a threshold to weaken. The revised fold profile separates digit roles: middle approaches radial thumb opposition; ring largely folds backward into the cup (higher angle / smaller sideways translation); little pulp turns along the ulnar hypothenar border. The corresponding live cobalt nail follows each identical proper-rotation matrix. The strict original RISO42 red clearance remains unchanged, and two-actor native print QA must verify these new silhouettes visually before promotion.
