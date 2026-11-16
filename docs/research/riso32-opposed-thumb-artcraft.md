# RISO32 — ArtCraft original opposed thumb / real IP source bone

**Status:** technical implementation + regression fixtures; independent native-ink visual approval **not yet obtained**. The **existing Risograph** Storybook hand workbench and original 240-frame two-actor film are the only targets. No new folder, photo substitution, raster overlay, flattened gradient, 3rd plate, purchased source art, or altered film timeline.

## Verified reference-led deconstruction

Authentic published print craft is studied for **technique only**, never traced or embedded:

- David Vanadia, *Liens Tissés*, risograph fingers and weave — [Creative Boom artist coverage](https://www.creativeboom.com/inspiration/david-vanadias-bold-and-minimalist-illustrations-that-fuse-graphic-design-with-art/). Source observation: complete continuous thumb/finger silhouette creates visible opposed voids rather than one filled mitten, with thickness controlled by intersecting fingers.
- Jennifer Colquhoun, *Fingers Crossed Anatomy Risoprint* — [artist print listing](https://harp-cowbell-wcet.squarespace.com/shop/p/fingers-crossed). Source observation: different overprinted fingers can bend independently and leave paper-white breathing space between two printed ink masses.
- RISO print principles and material constraints: [Risograph printing imperfections](https://risograph.co.uk/08-imperfections) (intentional registration drift must not simulate geometric attachment), [MICA image making and printing](https://www.mica.edu/undergraduate-majors-minors/printmaking-major/) (spot-separated masters); production renderer is **Kumiki** `registry/video/print-plates-react.tsx`, not a copied image or translucent fake.
- **Anatomical source of truth:** installed [ANAT1 thumb CMC/MCP/IP three-bone grammar](../../registry/anatomy/anatomy-pose.ts) and [Kumiki human anatomy skill](../../skills/kumiki-human-anatomy/SKILL.md), especially `JOINTS.thumb-ip` source A and `HAND_POSES.fist(".R")` 40-degree IP flexion. These are anatomical ranges, **not** photographed finger landmarks and **not** arbitrary 2D angle certification.

### Five axes — source geometry, not a filter

| ArtCraft axis | Failure in RISO31 | Actual RISO32 drawing correction |
|---|---|---|
| Topological continuity / isolation | Thumb stays one rigid silhouette during paper pinch, while other four fingers have PIP/DIP pivots. | Parent thumb has **distinct source-local red proximal wedge** and a separate **closed distal pad** on `left/right-thumb-ip`. New source regions use the existing mesh evaluator, so joint-to-ink paths are inspectable on both figures. |
| Flow | Opposed thumb could only rotate as a stick at its hand-root. | Source-engraved, eccentric radial thenar-to-IP curves direct the gesture into a rounded distal nail pad. IP is parented to the real original thumb; no detached 2D animation sticker. |
| Weight | One heavy red wedge visually reads like a mitten. | Broad proximal structural wedge, narrower soft distal pad and **2.4-unit overlapping undercap** maintain deposited-ink continuity through projected flexion. Existing palm, all five finger bases, forearm skin and wrist contour remain. |
| Temporal rhythm | Five source finger contacts but no distinct thumb pinch/release. | Rest 0 → anticipation 96/126 → donor contact 160 or receiver 166 → release 180/186 → hold 205/239; original physical letter ownership, satchel/foot IK, 240 frames and both output ratios remain. |
| Material / microtexture | Glued-on nail engravings or digital gradients would look artificial. | Nail moves with actual IP joint; fine **blue light-screen** pressure crease deposits separate cobalt spots over the red proximal/distal contact master. Physical screen values and registration from `RisoPrint` stay intact; no RGBA tonal shortcut. |

## Implementation map

- `src/video/riso32-thumb-ip.ts` defines typed 2D source geometry, bounded ANAT1-derived IP keyframes, left/right custom red curves, and `inspectRiso32ThumbIp`.
- `src/video/riso-character-demo.tsx` wires both hands of the Courier; `src/video/riso-human-ensemble.tsx` inherits the rig into Paper Artist and brings both closed thumb sections **in front of the letter** under the existing controlled contact mask.
- `src/video/riso-hand-artcraft.ts` retargets exact original blue nail to the moving IP bone, adds physically screened microfold, includes distal thumb in crop bounds. `src/video/riso-character-mesh-sheets.ts` adds real source mesh regions for each thumb IP.
- Existing `src/video/riso30-human-hands-studio.tsx` is now a RISO32 diagnostic while keeping old public selectors/controls: original two actors, both hand sides, 0/46/126/144/160/166/178/186/198/239 poses, real physical red/blue plate isolation, ink density, crop zoom, rig, source print data.
- `tests/riso32-thumb-ip-artcraft.test.tsx` tests both actors / both sides, actual 240-frame joint and red stencil geometry, nail attachment, crop envelopes, mesh regions and original aspect/physical handoff.
- `tests/e2e-storybook/riso32-thumb-ip-artcraft.spec.ts` captures native Storybook 1× actual whole hand at meaningful poses, physical spot isolation and opposite hand comparison. This must be run in Chromium; file existence alone is **not** proof.

## Art director rejection gates and next tasks

1. **Technical gate**: `npm run typecheck`; `npm run test -- tests/riso32-thumb-ip-artcraft.test.tsx tests/riso29-human-anatomy-neck-portrait.test.tsx tests/riso-character.test.tsx`; `npm run build-storybook`; `npx playwright test -c playwright.storybook.config.ts tests/e2e-storybook/riso32-thumb-ip-artcraft.spec.ts`.
2. **Native print gate**: check original red plate alone, blue plate alone, both overprinted; contact 160/166, release 178/186 and still 0/198; **4 original hands**, with proper fingertip paper-white space and no violet gap, rectangular double-deposit cuff, chopped pad or floating nail. Review 1× film and 4–7× source zoom.
3. **Two-aspect/temporal gate**: manually inspect encoded 16:9 and 9:16 foreground sheet at source 159/160, 165/166, 177/178, 185/186, 201/202, and earlier first-contact anticipation.
4. **Unresolved**: a frontal illustrator's 2D projection cannot prove true 3D opposition or realistic identity. Full independent 3/4 and profile human reference studies, 18 landmark source-vs-render ArtCraft gate where relevant, paper pressure, and fine print gain calibration are **not artist-approved**. Do not conflate passing unit/browser tests with premium visual acceptance.

**Next priority after RISO32:** reference-observed three-quarter hand and head source turnaround, then frame-to-frame anatomy/occlusion proof at both output ratios. Preserve all original detail/film clocks when implementing.
