# RISO30 — Original physical hand-craft / Kumiki ANAT1 + ArtCraft

**Production subject:** The existing two-person [Risograph 10-second printed film](../../src/video/riso-human-ensemble.tsx) and the same Courier / Paper Artist source vector characters from RISO29. Original 2-ink character contours, sleeve/coat seams, independently printed cobalt/vermilion masters, full 240 frames, actual prop-hand IK and stage composition are preserved.

## Authentic visual references — no third-party asset reuse

1. **Celia Fong, [screenprinted hands](https://www.celiafong.com/)**. Topology: single contiguous wrist/palm with broad thenar wedge and **unequal** reaching digits, thumb leaves the palm obliquely. Flow: curvilinear outer palm edge countered by sharp bends of thumb-index webbing. Edge: cut ink ends and unprinted negative-space finger gaps. In RISO30 the nail/tendon arcs remain attached to one named source joint; no separate floating sticker.
2. **Frankie Palmer, [screenprint / hands, Highpoint Center for Printmaking](https://www.highpointprintmaking.org/frankie-palmer)**. Form: independent hand silhouettes crossing with finger tips sculpted as rounded capsules, more active knuckle arcs and uneven finger direction. Process: coloured print ink has actual source texture and paper fibres; never an RGB blur or faux-opacity filter.
3. **[Anita Allemann Risograph cards](https://www.anitaallemann.com/content/1-home/aa_portfolio_handdrawn_de.pdf)**. Authored graphic hands use continuous finger topology, not repeated perfectly parallel sticks. Solid pink printed shape plus dark outline variants show how body and etching can coexist at graphic scale.
4. **Rose Wong [Risograph practice, It’s Nice That](https://www.itsnicethat.com/articles/rose-wong-risograph-txt-books-illustration-090320)**. Limited colour and intentionally imperfect drawn contour, rather than decorative glossy gradients.
5. **ANAT1 internal primary construction**: `registry/anatomy/anatomy-reference.ts` `SURFACE_FORMS` ("knuckle-arc" with a raised middle metacarpal head and thumb pad); `registry/anatomy/anatomy-pose.ts` `HAND_POSES` real grip/pinch/relaxed angles. `ANSUR.male.measurements.handlength.p50` supplies population hand-size context, **not** a matched identity target. Full anatomical PIP/DIP bones in 3D are future work.

## Deconstruction against actual Courier + Artist 2D sources

| ArtCraft axis | Previous real source | RISO30 authored structural remedy |
| --- | --- | --- |
| 1. Topological continuity | 4 separate finger roots had a valid parent tree, but the uniformly rounded red palms did not reveal thumb pad/metacarpal root. | Each glove receives a blue irregular metacarpal **arch** on an explicit palm-surface joint, a correctly mirrored red thenar plane and true left/right thumb opposition; fifth finger has its own linked source red contour; wrist has an irregular single physical seam. |
| 2. Vector flow | Old blue decoration was two flat, symmetric palm squiggles; all fingers received one identical micro-joint line. | 4 **asymmetric** PIP/DIP fold engravings follow three individual finger root pivots; nails follow each entire finger's transforming local reference plane, with non-identical lengths. |
| 3. Width, mass and negative space | The original hand had only three full fingers and an opposable thumb, with a short round palm obscured halfway by overprinted blue cuff: it read as a two-finger black mitten under 1.1× printing. | The palm runs from true wrist y=-4 to knuckles y=19; five actual source finger bones (thumb/index/middle/ring/pinky) separate at ±6, ±11 local x. The dedicated palm-surface joint carries ANAT1 metacarpal anatomy and exposes a narrow wrist cuff instead of an enormous dark overprint. Fingernails are fine blue crescent rims rather than thick black ovals. Red screened thenar/thumb insertion makes the palm read as an actual muscle mass without broad smooth gradients. |
| 4. Temporal contact | Props and gloves' 240-cel joint coordinates were correct, but old seven foreground contours did not carry meaningful finger lines/nails through handoff. | 9 additional original **physical blue** digit engraving pieces become real prop overprint foreground during donor-to-receiver handoff. Timing, wrist/foot IK and source paper outline unchanged. |
| 5. Tactile microelements | Original blue/red print held RISO26 master screens, but subtle joint/nail topology disappeared at film size. | Each digit has curved nail-rim marks, two independent proximal/distal bend creases, denser contact-side microlines; these are original blue pen-shaped editable SVG paths printed in real cobalt/vermillion separation, not auto-image traces or opacity masks. |

### Real construction data and implementation

- `src/video/riso-hand-artcraft.ts` is a source-authored original vector parts factory for each identity and hand, **14 unique named topologically attached print parts per side**, with no added dependencies.
- Characters keep distinct palms, fingers, hand roots and their many prior hand/coat/face pieces. `RISO30_ANAT1_HAND` references actual ANAT1 pose, knuckle and measured hand-length data; it does **not** falsely claim source personas are scanned 3D humans.
- Film `risoGripParts` passes exactly the printed 7 new nail/fold paths to the overprinting fingertip ink master. These paths do not introduce new physical paper cutouts (red originals remain source paper contact).
- Storybook stays under **Video production → Film Looks → Risograph**, new `RISO30 · ANAT1 Hand Gesture & Two-Ink Engraving` workbench: real actor-specific donor right / receiver left source hands, reverse view control, original f46/144/160/178/198 poses, physical AM dot density/ink isolation/source zoom, and true 2D rig overlays.
- Reject any appearance of loose nail markers detached from red finger mass, thumb beginning as a fifth parallel stick, equal-length finger nailbeds, hidden hand-contact paper, or a clean digital RGB gradient.

### Quality gates and remaining work

1. `npx tsc --noEmit`; `tests/riso30-anat1-hands-artcraft.test.tsx`: all 240-frame ownership constraints and 10 pose samples across BOTH identities and both hands, print source path registration, reference data and independent figure geometry.
2. Actual Chromium Storybook screenshot f46/f144/f160/f178/f198 for the original source humans; two physical plates separately; responsive narrow/wide preview. See GH Actions `RISO22 ocular Storybook browser proof` artifact for proof after the PR.
3. Inspect 1× final film handoff, 4–7× hand source crop. Passing exact path ID/unit counts alone **cannot** certify artistic realism.
4. **Next**: replace still one-piece finger sticks with true *PIP/DIP phalange hierarchy*, adjust glove flexion against paper pressure from `HAND_POSES.pinch`, then independently draw true 3/4 and side hands and faces using licensed references. Avoid inventing "approved" photographic likeness or 3D silhouettes.

### Native Chromium visual rejection before final five-finger design

The first RISO30 browser screenshots (GitHub Actions run `43763248103`) **passed code and browser tests**, yet the **hands looked like two-finger mittens** with broad black cuffs and oversized cobalt nail dots. ArtCraft therefore rejected that preview despite green CI. The second source pass re-authored the actual 2D glove masses so the red palm exits the blue forearm rather than overlapping half of it, reorganized the original individual finger roots with plausible hierarchy and built a **fifth (pinky) digit joint** per hand. Original hand/wrist world anchors, the sheet, gait and physical ink engine remained untouched. The next Chromium proof must visually confirm five distinct fingertips at f46/f160/f178/f198; code-only part counts are insufficient.
