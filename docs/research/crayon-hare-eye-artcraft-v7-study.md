# ArtCraft v7 — European hare ocular construction (experimental)

Date: 2026-11-14
Scope: `src/video/crayon-wildlife-portrait-fixtures.ts`, one animal-eye region. No human-face editing, new Storybook folder, promotional reclassification or copyrighted asset import.
**Status:** anatomy-rebuild candidate only. NOT reference-fidelity qualified or visually approved.

## 0. Original rendered failure (inspected)

The previous source-rendered `hare-artcraft-eye-macro.png` in the project's review library shows a 60-unit-wide near-black almond around a roughly 27-unit amber iris. A large flat angular posterior orbital area and a pale blocky superorbital ribbon dominate the frame. A warm circle with a white highlight reads as a graphic mascot eye, not a hare eye. The requested remedy is **structural reconstruction first**, not more procedurally scattered texture.

## 1. Reference sources inspected (anatomy versus material)

| ID | Source / rights | Observable features / limits |
|---|---|---|
| anatomy-eye | [Hans Hillewaert, *Lepus europaeus (eye)*, Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Lepus_europaeus_(eye).jpg), **CC BY-SA 4.0** | A separate photograph of an actual European hare. Use its raised upper brow, black thin limbal boundary, near-round amber globe and short direction-changing surrounding fur for anatomical guidance. Online page lists 4352×3264 source, but that **original was not downloaded or measured locally**. Do not pretend its pixels informed numeric tests. |
| anatomy-side | [Rudolf Vornehm, European hare, Bavarian wildlife portal](https://www.wildtierportal.bayern.de/wildtiere_bayern/102456/index.php), reuse license unverified | The eye sits within a pale fur rim against a darker orbital socket; ear base and nasal bridge share continuous head mass. Source was viewed as a web preview only. |
| pastel-craft | [Nadezhda Kokorina, *Portrait of a Hare*](https://www.saatchiart.com/en-pr/art/Drawing-Portrait-of-a-hare-painting-animal-art-oil-pastel-rabbit-art/296362/9862769/view), copyrighted | Distinct selective light hairs around a luminous rim, directional warm/cool fur, controlled dark accents. Oil pastel is a **technique comparison**, not proof of hard crayon pigment behavior. |
| hair-construction | [Tracy Barnett, *After the Dawn*](https://annkullberg.com/blogs/ann-muses/the-pencil-box-featured-artists-january-2024), copyrighted | Hair sweeps from the socket into the cheek and changes density near the eyelid. Colored pencil is not hard wax crayon; technique only. |

No reference image files or third-party pigments are distributed. This is a **style-guided original illustration**, not an image or contour copy. Reference crop annotation/semantic masks, source-photo landmark registration and quantitative source-relative axis metrics remain unavailable and explicitly block ArtCraft release qualification.

## 2. Anatomy construction graph and negative controls

The original `head` wax and motion rig are preserved. All new and rebuilt structures are independently named and remain opaque, in real CRAYON1 painter order:

```text
head (wedge cranium; existing motion parent)
 ├─ eye-socket (mid-value orbital shadow; compact, not huge black almond)
 ├─ eye-bone-light-shelf (narrow supporting superorbital flesh)
 ├─ eye-dark-rim (bounded 62-unit ocular mass; pupil-colored, no graphic wedge)
 ├─ eye-amber-iris (38-unit bounding region with staggered pigment radials)
 ├─ eye-pupil (smaller moving with head, opaque dark)
 ├─ eye-upper-lid-overhang (curved shadow overlapping upper globe)
 ├─ eye-lower-fur-fold (cream wax crescent enclosing lower globe)
 │   └─ eye-lower-fur-fibers (clip-to-parent curved lines)
 ├─ eye-medial-canthus (nasal tear corner)
 └─ eyelid-painted-occlusion (opaque alternative shape at blink extrema)
```

Local eye study anchors in the existing head coordinates: dark rim x≈[-81,-31], y≈[-83,-38]; iris center (-55,-58), iris radius (16.2,16); pupil (-53,-58); brow above y≈-100; lower crescent y≈[-53,-36]; medial corner x≈-81. These are **authored output coordinates**, not digitized measurements from the source photos.

Structural negative controls:
- Whole socket as solid near-black almond with a tiny contrasting round pupil
- Bright cartoon eyebrow bar separated from an underlying ocular globe
- Thin line pretending to close the eye without opaque pigment obscuring iris/pupil
- White disk underneath the globe, cartoon sclera, decorative detached tear dot
- Independent uniform fur particles or texture noise replacing anatomical lid boundaries

## 3. Feature-to-construction review matrix

| Feature | What is observed | Implementation | Proof still needed |
|---|---|---|---|
| Compact aperture | Thin dark circumference around the amber surface | Rebuild `eye-dark-rim`, enlarge relative iris proportion, use a compact socket | Actual 16:9 and 9:16 native crop, static final frame 237 |
| Curved eyelid volume | Upper shadow overlaps globe; lower pale-fur fold follows round eye | `eye-upper-lid-overhang`, `eye-lower-fur-fold`; no alpha holes | Native closeup with darkness and 1×/3× inspection |
| Inner corner continuity | Small tear canthus joins nasal orbital rim | `eye-medial-canthus` with source-local coordinates | Eye crop, lower fold clipping and no detached gap |
| Wax iris | Amber/copper with dark irregular radial fibers; restrained highlight | Opaque `eye-amber-iris` and two clipped seeded pigment fields; small catchlight | Static crop, dark/light base |
| Closed-lid stress | Iris, pupil and reflections hidden by **opaque** lid wax | Updated `eyelid-painted-occlusion` geometry and bounds | Native frames 89/203, reopen frames 95/209 |
| Fur flow transition | Rooted short hairs on lower lid changing toward cheek | A few clipped curved lid hairs, not global fur noise | Native macro, source-relative hair-direction trace |

## 4. Five-axis policy (do not fabricate baselines)

- **Topology:** required; semantic eye/lid/canthus masks and connected components needed from a rights-cleared pixel reference and actual render. Source masks NOT acquired; blocked.
- **Flow:** required for short fur and upper/lower eyelid arcs; annotated source/rendermask tangent maps NOT acquired; blocked.
- **Stroke-pressure distribution:** required for wax/pastel translation, but region-specific original medium differs from photograph and colored pencil; must use a genuine hard-crayon reference, not numeric hair-photo thickness. Blocked.
- **Optical rhythm:** not applicable to the globe itself (not an evenly repeated stripe pattern); applicable to fur group once a comparative stroke-only mask and cross-normal probe are captured.
- **Microtexture:** required for wax/paper at aligned original resolution; source hard-crayon material and matched crop NOT acquired; blocked.

The tests are deliberately *structural and rendering* checks, not source-mask substitutes. Use `artcraft/scripts/art_axis_audit.py` and the `--gate release` contract only when independently staged source/render semantic regions and written bounds exist; do not lower thresholds or label the artifact approved.

## 5. Rendering and review workflow

The narrow PR proof runs the real CRAYON1 React renderer through Playwright at 960×540 and 540×960, native camera magnification 3×, frames 89 (early draw-in blink), 203 (fully painted blink), and 237 (open),
and retains six PNGs. `hideScreenSpace` removes only editorial typography
from the inspection camera; no wax source geometry or seeds are deleted. Comparison must be against the saved prior eye crop and the publicly linked photographs. No browser test proving DOM presence can certify artistic appearance.

### First actual Chromium review and corrective pass

The first 960×540 and 540×960 source-native screenshots (run
[43681966287](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43681966287))
showed a larger amber iris, but the surrounding prior `orbital-structure` and
`eye-brow-bone` still read as huge flat intersecting geometric ribbons. The
first macro also included unrelated editorial lettering, which obstructed the
art inspection. The eye-only change had **not** fixed this.

Second construction pass: narrowed the giant dark orbital plane, reshaped the
superorbital bone as a smaller rooted crescent, reduced mechanical pale/dark
rings and made the surrounding coarse head-tooth marks less dominant. The
next native captures will be independently reviewed; no aesthetic pass claimed.
The early frame-89 blink occurs during unfinished head pigment deposition and
shows gaps in the incomplete wax undercoat: this is a **separate source-timing
problem**, not proof of a finished transparent hare. Final-frame opacity must
remain intact. Do not call this a passing full-film proof.

### Second Chromium review and third localized correction

The second native captures (post-orbital-refinement) showed a noticeably
smaller brow shadow, but the 203-frame blink still formed a blank, perfectly
round skin sticker because the *open* dark limbus remained present while the
fully opaque eyelid was painted over the iris. That was a negative-control
failure under ArtCraft structural-appearance criteria.

The third candidate now carries discrete *limbal redrawing* at frames 88/94
and 202/208, using a shallow curved closing aperture with its own bounded
CRAYON1 wax drawing while keeping the actual head transform unchanged. The
opaque lid uses the nearby warmer head pigment rather than an isolated
dark-brown circle; its crease moves with the new opening. Tests assert closed
versus reopened geometry and final rest recovery. Source-relative axes
remain blocked; another real-pixel proof is mandatory.

### Unresolved issues

The surrounding skull, nose, cheek and upper forehead still have planar digital-looking boundaries and may require a separate reference-conditioned rebuild. The eye change alone does not qualify the character or authorize exposing the hidden `Crayon/The Wild Hare` Storybook stories.
