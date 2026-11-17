# RISO46 — original thumb–index thenar web (ArtCraft source iteration)

**Status: experimental drawing; native-image and anatomical visual approval pending.** Continuation of merged PR #457, whose original f160 1× and 6.2× Chromium renders still showed a rake/claw support gesture and flat thumb–index volume.

## Source-led construction

- **Printed medium:** [SAIC Risography](https://sites.saic.edu/servicebureau/home/services/risography-printing/) documents stencil color layers, soy ink, and absorption on uncoated paper. [Risolana production guide](https://www.risolana.org/printing) documents independent gray separation, screen tone and registration. Macro/meso print shape must be on real color masters; micro marks inherit the existing true print screening, dot gain, absorbent paper, and independent registration.
- **Genuine close-up print:** [Fish Guts Press](https://fishgutspress.com/collections/frontpage) displays irregular two-color halftone portrait printing and overlapping transparent ink, providing a real-medium texture reference. No pixels are copied into the repository.
- **Hand structure:** [Proko, Details for Realistic Hands](https://www.proko.com/course-lesson/how-to-draw-hands-details-for-realistic-hands/) for the distinction between thumb pad and rigid parallel digit contour. The in-repo [Kumiki ANAT1 human-anatomy skill](../../skills/kumiki-human-anatomy/SKILL.md) and actual thumb/index source joints control position and physical pose.
- **Original candidate:** RISO45 native ArtCraft hand and full-film f160/166 frames from merged PR #457. Its remaining flat thumb base is the target, rather than an external photo likeness. No verified photo-aligned 3/4 anatomical landmark dataset is available yet.

## Topology, layer order and source path

**Macro:** preserve all previous original red finger silhouettes, 24fps timeline, actor mesh, full paper history, index-over/thumb-under z-order and the actual physical contact at f160/166.

**Meso:** the current character's true palm-local thumb CMC sits at ±7.1, -3; index MCP at ±6, +5 (source units, not population measurements). Add a broad, eccentric C-Bézier thumb-abductor mass that folds toward the index web and back into the wrist, plus a subordinate attached positive red commissure ridge. Source curvature is separately authored for Courier and Paper Artist, not a copied image. This is appended to the existing RED thenar-plane master: the prior path and its physical dot screen are retained.

**Micro:** on the exact same moving palm-surface parent, append three short original cobalt pressure-incision shapes to the existing BLUE thenar-fold master, retaining the previous RISO37 tapered curves and other nail/knuckle/tendon engravings. The cobalt is a real screened stencil under the sheet, not an alpha sticker or post-render filter.

**Animation:** existing original handedness, moving source joint and paper remain untouched; inspect Storybook original hand workbench at 144, **154**, **156**, 160 and 166, in blue/red/both physical plates, 4.8–7.4× source zoom, screen density, rig overlay, opposite-hand and two-actor views.

## Verification and release gates

1. Static/semantic: both actors × both hands, source joint provenance, two named original part paths, physically printed two-plate ink, old and new d subpaths, independently authored curves.
2. Motion/occlusion: original paired red/blue transform in f0/126/144/154/156/160/166/186/205/239; original under-paper thenar; original index printed above; f160/166 actual red ink-to-paper contact on 16:9 and 9:16 film.
3. Source-only regression: original full ArtCraft RISO30–45 focused unit and native Chromium Storybook, 240-frame film, distinct red/blue plate screenshots and TypeScript. New unit source is tests/riso46-thenar-web-anatomy.test.ts.
4. **Artist-required**: at actual new head inspect native 1× and 6.2× f154–166, 960×540/540×960 frames and physical red/blue separations; compare against live photographed hand poses, evaluate negative spaces, palmar planes and temporal pressure. Reject flat extra-lobe contours or artificial 3D claims. CI alone is insufficient; keep PR draft until inspected.

No dependencies or new Storybook folders. No image assets or copyright-restricted source pixels. The separate ArtCraft plugin package was not available in this runtime; the available in-repository ArtCraft craft standards and Kumiki UI/ANAT1 skills were followed. Do not claim the unavailable package was executed.
