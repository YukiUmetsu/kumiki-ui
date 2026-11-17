# RISO50 — Source-carved palmar cup and oblique MCP planes

**Build:** RISO49 PR #471. ArtCraft source continuation in existing Risograph Storybook; no new folder, paid assets or vector flattening.

## Authentic hand and press references

1. **Proko – [Muscle Anatomy of the Hand](https://www.proko.com/course-lesson/how-to-draw-hands-muscle-anatomy-of-the-hand)**. The dominant hand forms are radial thenar, hypothenar and intermetacarpal muscle volumes. Palmar thenar reaches the wrist; dorsal thenar is shorter. The thumb/index commissure tenses on opening and bunches as pinch closes. A round uniform glove from wrist through knuckles incorrectly makes both models look like paws.
2. **Proko – [Details for Realistic Hands](https://www.proko.com/course-lesson/how-to-draw-hands-details-for-realistic-hands/)**. Dorsal MCP surfaces show straighter, flatter bony/tendon planes; the palmar side is softer. A repeated, equally convex dark arch at all four MCPs reads as four eyebrow/smile logos, not anatomy. Differentiate bony knuckle crests from finger pulp, stagger planes and match nail cross-sections to each real articulated digit.
3. **Proko – [How to Draw Foreshortened Hands](https://www.proko.com/course-lesson/how-to-draw-foreshortened-hands)**. Strong camera projection alters the *visible* segment length even though real bone lengths do not change. Do not attempt to fix a frontal hand by merely adding skin hatch marks.
4. **[RISOTTO Risograph printing FAQ](https://risottostudio.com/pages/printing-faq)**. Physical stencil drums produce separated spot colors, halftone/dither and slight paper/ink behavior. Very low tone coverage can vanish. Keep valuable readable bony mass and actual two plate-source inks; do not use RGB fake shadows or tiny grain as an anatomical shortcut.

Photo studies from searches for *hand holding a sheet of paper* were used for grip topology only. No photograph, stock pixel, media asset or proprietary licensed image was copied, traced, distributed or used as a CSS image.

## Observed failure in the real native Chromium film

RISO49 f160 at 6.2×: Courier had a broad near-circular vermilion glove and four identical horizontal cobalt eyebrow/grin arches above downward unsupported finger tines. Receiver had horizontal red rake fingers, a very wide palm and floating thenar/index knot. These problems exist **in the actual two-spot printed SVG** and are not solved by the previous RISO48/49 ~1.5-2-unit PIP/DIP source shortening. They are visible in artifact `riso32-native-thumb-proof` from run [43821020980](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43821020980).

## Changes are anatomical source geometry, not postprocessing

**Macro RED positive ink – carpal cup:** in `riso47-palmar-cup.ts`, preserve the existing single connected original `(left|right)-glove` source and all moving descendants, but replace its old near-isometric outline with a new continuous **16-cubic** profile. Wrist narrows first; the radial thenar inflates at one bony station, the hypothenar/ulnar heel cuts back near pisiform, and four MCP crests receive staggered unequal convex transitions. Courier and Paper Artist retain independent fullness and knuckle control; right/left are independent chirality transforms, never a reflected screenshot. Add explicit RISO50 craft provenance and continue all original 40+ other hand marks.

**Meso BLUE physical stencil – four *different* metacarpal bone planes:** in `riso37-anatomical-engraving.ts`, old four ~3.7-to-4.5-unit horizontal symmetrical grin arches are replaced, not erased, by **four asymmetrical distinct oblique** positive cobalt ridge ribbons (~1.9–2.8 source units long). Each has multiple independent cubic edge curves, varying signed y-slope, higher/shorter bony transitions, nonzero positive area and a genuine path closure. They remain joint-parented to the existing original `(left|right)-palm-surface`, never a viewport decal. New `RISO50_MCP_PLANES` publishes source anchor topology. No fine nail/crease details dropped: all RISO37/46 source contours, fingernails, digit dorsal planes, thenar folds and true real red source segments stay as named printed parts.

**Deepened 3/4 foreshortening with real red bones:** preserving earlier independent RISO48 receiver and RISO49 donor source transforms, increase only PIP/DIP **2D projection offsets** of three supporting fingers. Their 3D canonical ANAT1 lengths and original clinically bounded rotations remain fixed. Original paper contact, actual 24fps cadence and RISO43/44 ink stacking stay intact. New f160 projected visible lengths remain >58% of the original natural segment length. The INDEX source is unchanged, as required for actual paper pressure and receiver/donor contact.

**Studio:** the existing `video-riso-artcraft-studies--human-hand-anatomy-print` story now exposes live `data-km-riso50-source-mcp-planes` and `data-km-riso50-palm-cubics` properties, each derived from the *actual evaluated physical source paths*, not hardcoded from author assertions. All original interactive frame, red/blue/both, density, rig, zoom and opposite-hand controls remain.

## Quality gates (never promote solely on green tests)

- Original `RISO50` tests: all four real anatomical source hands, both actors, 16 continuous positive RED cubic main-palm segments, exactly four distinct non-self-colliding, closed cobalt MCP plates with nontrivial signed area, and preserved original named prints.
- RISO31–49 legacy tests unchanged: actual physical print part IDs, true 3-bone articulated phalanges per finger, source red/finger contours 12/hand, real two-plate RisoPrint with separate ink.
- Every named actor/hand, all two-frame contact/release samples preserve actual centerline paper-white source gap **strictly >3** and no crossed centerline pair; no regression thresholds relaxed.
- Original index-over/real thumb-under sheet at f160 and f166 in both aspect ratios. Chromium workbench f144/154/156/160/166 at 6.2× and 7.4× plus **full-frame 960×540 and 540×960 film** (1× quality criterion).
- Independent real **image review**: compare matched same-size final-head native PNGs at full-film 1×, at RISO50 6.2×; study finger silhouette/thenar web, on-paper joint continuity, bone landmarks and absence of smile-knuckles, not only source test or dot pattern. If still claw/mitt, leave PR as draft and move to a true view-conditioned 3/4 hand silhouette/kinematic source, not decorative hatching.

**Limitations:** These are editable original 2D illustration sources constrained by named ANAT1 landmarks, not fitted 3D hand photogrammetry, motion-capture, clinical diagnostic measurement or artist-certified physical printed proof.
