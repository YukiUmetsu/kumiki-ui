# PAPER-D2 — ArtCraft jointed puppet and opaque curtain research

**Gate:** find → inspect → dissect → specify → construct → render → compare → refine. This pass is a **rigging and edit-grammar framework**, not a new source-faithful character portrait. Protected artwork is used as visual/process reference only; no reference image pixels, meshes or source contours are copied.

## Real references

| Work/artist | Inspectable observation | Implementation consequence |
| --- | --- | --- |
| [Buffalo AKG Art Museum — Balla-inspired jointed paper dog](https://buffaloakg.org/learn-discover/kids-families/home-activities-kids-families/family-activity-inspired-giacomo-ballas) | Printed dog limbs and patterned contours overlap at small metal brads. The hinge remains physically visible, rather than dissolving one part into the other. | Each child sheet names a parent and an **authored pivot**; rigid affine inheritance keeps the joint placed correctly while local wing flap/swing remains independent. |
| [MIT International Puppet Museum — color in Chinese shadow puppets](https://www.museudetitelles.com/en/el-color-a-les-ombres-xineses/) | Intricately carved limbs, headpieces and garments connect in a single body structure controlled by rods. Color and negative-space detail support identity. | Preserve real detailed stock/holes, maintain contiguous component graph and stable z-order, do not synthesize transparent humanoid joints. |
| [Toon Boom — Cut-out Animation Workflow](https://learn.toonboom.com/modules/animation-workflow/topic/cut-out-animation-workflow) | Separating parts and rigging hierarchy/pivots is an important preparation stage. | Reject missing parents/cycles, author bind poses before animation, check hinge extrema and overlapping front/back sheets. |
| [Paper Animators — paper transitions](https://paperanimators.com/videos/) | Site lists physical-presentation tropes, including tears, page flips, layered cuts and shutter transitions. Actual frame-accurate source demo wasn't available here. | D2 adds a **different original** opaque deckled curtain that hides an edit via a solid moving sheet, rather than duplicating a proprietary transition or applying alpha fades. |

**Source limitations:** Online source previews and educational text, not rights-cleared high-res source images or full-motion source frames. Hence original observations are qualitative; no measured source-pixel thresholds, no source-normalized contours, and no claims of museum-quality imitation. In browser source rights remain with their owners. The feature-to-construction map is also recorded in [reference-study JSON](paper-director-artcraft-reference-study.json).

## Construction / attachment graph

```text
PAPER-D1 botanical rest sheet (unchanged high-detail existing original cut stocks):
  moth-abdomen [moving ROOT; x/y/angle poseKeys]
    ├── moth-thorax [follow parent; independently drawn dark cut sheet]
    ├── moth-antennae [follow parent; thin authored contour]
    ├── moth-{left,right}-fore [follow parent; existing real hinge/flap]
    ├── moth-{left,right}-hind [follow parent; existing flap]
    ├── fore/hind lining / window spots / edge panels / feather stock
    └── decorations / veins [follow parent; unchanged global Z ordering]
  rooted foliage [unaffected world-space sheets]
```

The original sheets are all authored in shared (x,y) **stage coordinates**. No geometry offset occurs in bind pose. For each child, a local transform rotates about its authored pivot, then parent-to-child affine matrices are multiplied, preserving the parent's spatial translation/rotation. Each sheet is still drawn separately in globally sorted stock-depth order so wing patterns cannot jump over unrelated foliage. The root sheet must remain present and its frontmost paper stock opaque.

**No fabricated human anatomy:** a face/hand with photorealistic expression would need a separately authorized source, anatomy and multi-pose part manifest; the current implementation does not claim this.

## Curtain fabrication and editing beats

Transition chosen: a deckled-edged opaque cardstock curtain, not a transparency wipe. A shot can define `transitionOut:{kind:"paper-curtain",durationFrames:24,color:"#E8CEAA",direction:"left-to-right"}`.

The outgoing scene's last 12 frames move a complete paper sheet across the picture; the cut occurs while fully occluded at global frame 239→240; the incoming scene's first 12 frames reveal the assembled destination shot. The paper has one irregular cut edge with fixed sinusoidal large/small contour perturbations, an anchored fiber line pattern and a separation contact shadow. It has no material opacity ramps, randomized per-frame noise or JPEG/photo overlay. The same approach works in 16:9 and 9:16 without stretching one aspect.

### ArtCraft stress-pose and QA matrix

| Frame/check | Required physical property | Rejected symptom |
| --- | --- | --- |
| Botanical 60, 150, 210 | Root travels and turns, all wing/vein/antenna sheets inherit motion; 2D pin coordinates remain registered | separated head/wing, drifting decorations, body translucency |
| All rigged frames | Parent graph acyclic, explicit pivots, bounded depth/transform; child pivot follows transformed parent position | path disconnected, cycles, NaN transforms |
| 228 → 239 (outgoing) | Curtain moves from fully absent to fully occluded | early blank/colored flash, exposed corners |
| 239 → 240 (hard edit) | Solid pigment remains continuous across exact cut | ghosted/crossfaded paintings, one frame of naked new artwork |
| 240 → 251 (incoming) | Curtain withdraws across exact frame order | tearing seam jumps or background leak |
| 252 onward | Fully assembled 2nd scene, no stray paper layer | curtain stuck onscreen |
| Reduced-motion | No occluding curtain holds; finished shot stays visible | full blank static composition |
| Repeated shuffled seeks | identical SVG matrix and art detail for same absolute frame | flickering/different grain/random movement |

**Performance**: at most 128 sheet parts and 32 pose keys per part, worst-case ancestor traversal ≤128; no separate animation clock. Full 30fps and actual browser/FFmpeg evidence is required before calling the implementation visually verified.

## Candidate review

Await final production outputs and contact sheet. Before release, inspect framing in both aspect ratios, pivot registration and real transition video. If a defect emerges, change the upstream rig/transition cause, rerender and record it rather than claiming ArtCraft equivalence.
