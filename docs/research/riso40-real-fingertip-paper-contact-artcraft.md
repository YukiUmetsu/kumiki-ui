# RISO40 — real thumb/index pad → shared letter contact
## ArtCraft v9 source/structure/film study

Status: **production code implemented, release awaiting actual latest native Chromium frame inspection**. This continues PR #445 rather than starting a competing PR. The subject is two existing original *authored* RISO figures passing one original sheet; third-party art below is a **craft observation only**, never an image asset or traced geometry.

### 1. Reference evidence, ownership and observed features

| ID / actual source | Rights and confidence | Specific visible feature and negative control |
| --- | --- | --- |
| R1, [Stan Prokopenko — realistic hand construction and thumb opposition](https://www.proko.com/course-lesson/how-to-draw-hands-details-for-realistic-hands/) | Copyright original artist; high-confidence published drawing instruction; not a source photo of Kumiki figure. | Opposed thumb turns toward index; dorsal tendons straighter than palmar fat. **Wrong**: put thumb tip 10+ source units from the actual held sheet, or rotate an unbending mitten as one solid image. |
| R2, [Stan Prokopenko — muscle anatomy/thenar and first dorsal interosseous](https://www.proko.com/course-lesson/how-to-draw-hands-muscle-anatomy-of-the-hand/) | Copyright original author; medium-high technique evidence; no user-original three-quarter hand reference. | Contact compresses the first web and brings two actual moving pads into a common local region. **Wrong**: independently draw a letter ending at the wrist, then put all finger ink outside it. |
| R3, [Line drawing: hands receiving a letter, Gotou Satomi](https://www.gettyimages.com/), found through image reference search | Commercially licensed © illustrator/agency; visual composition-only, no reproduction/tracing. | On a frontal paper transfer, both hands contact the paper's **short-end boundary**, not arbitrary points behind the sheet; fingertips and folded edges share one visual coordinate system. This is a flat 2D view, **not proof of correct anatomical foreshortening**. |
| R4, [The Printhaus — original blue/orange real two-ink Risograph print](https://www.theprinthaus.org/ph-courses/beginners-riso-printing) | © printmaker/workshop; physical process/spot separation only. | Real paper shows visible halftone, minor registration defects and layered two-spot artwork; a new fake RGB patch or opacity filter would violate the medium. Keep real physical two-plate ink source and paper knockout. |
| C1, original user-owned *kumiki-ui* RISO39 Chromium proof, `riso39-native-opposed-grip-proof.zip` run 43792300038 | Original generated render, source is repository plus existing RISO39 tests; direct screenshot inspected. | At f160: printed long letter between body/wrist anchors, but Courier right fingers **below** its left short edge; Artist left fingers **right of** the paper's right short edge. Receiver f166 true red fingertip ink gap ~4.7 local source units, not contact. |
| C2, original *kumiki-ui* SVG/ANAT1 FK/IK source in `src/video/riso39-opposed-paper-pinch.ts` | Original user-owned source and real evaluated transforms; exact named bones available. | Current thumb IP and index DIP *already* compute stage-space pad positions. Paper short-end center incorrectly uses `right-hand` and `left-hand` wrist root origins, while physical ink is applied at the distal pads. |

### 2. Structure and attachment graph (source, not cosmetic overlay)

```
Actor A: right-upper-sleeve → right-forearm → right-hand → right-thumb → right-thumb-ip → [real red distal thumb pad]
                                                        ↘ right-index → right-index-pip → right-index-dip → [real red fingertip]
                                           \__ midpoint of ACTUAL two moving tips = sheet source short-end center

Physical shared paper: source midpoint —— long sheet chord and two real RisoPrint plate graphics —— receiver midpoint

Actor B: left-upper-sleeve → left-forearm → left-hand → left-thumb → left-thumb-ip → [real red distal thumb pad]
                                                        ↘ left-index → left-index-pip → left-index-dip → [real red fingertip]
                                           \__ midpoint of ACTUAL two moving tips = sheet receiver short-end center
```

Both sides still own **one** physically printed letter via `evaluateRisoPropHandoff`. The sheet short edge is locally normal to the chord between these source contact centers, including curl, pressure pleats and registration. After release the letter is receiver-relative using independent **fixed-frame** source pads, never a history-accumulating offset.

The receiver paper endpoint approaches her **true moving pad** during f126–160. Before f160 the sheet is unfolding between its donor source and the interpolated tip, and **must not** already reach the receiving hand. After f160 the sheet end stays on her pad; after f202 only the receiver owns paper. No re-timing of the figure or invented third ink.

### 3. Five-axis source-render decision matrix

| ArtCraft axis | What changed in original code | Required screenshot / failure |
| --- | --- | --- |
| Topological continuity | One connected physical paper ribbon, same actual red thumb IP/index DIP bone source matrices, identical pad-centered paper endpoint. | f156/f160/f166/f177 source-red and full plate; reject a paper gap or detached ink, compare original workbench to full-film. |
| Flow and gesture | Paper follows original two live arm IK gestures; no keyframe duplicate. Pressure creases derive from same paper tangent/normal and source pad contact. | Native landscape and portrait f126/142/160/177/189/202, reject instant sheet teleport or reversal at takeover. |
| Relative weight | Red pads above front letter, existing opaque paper masks earlier torso/forearm, compressed paper inherits real source pressure; no fake alpha. | Blue-only/red-only/combined f160, inspect silhouette, paper edge, front/back ordering. |
| Repetition and temporal rhythm | Original 24fps, two-frame print cadence, independent hand/source-release duration preserved. | Random seek determinism + every two-frame source tip from f126–238, reject pop on first unfold. |
| Real material/microtexture | Unmodified original two spot inks, native RisoPrint grain/misregistration, full source 12 phalanx paths + separate thumb IP. | Six print variants and full-film close-up, no fake noise texture or flattened vector shapes. |

### 4. Implementation / exact contract

- `src/video/riso40-paper-fingertip-contact.ts`: `evaluateRiso40PaperGrip` evaluates the original source animation, applies each **real source joint matrix** to its own original distal tip offset and stage transform, and derives the shared paper short-end anchor as the midpoint. That endpoint belongs to the paper; the red pads still remain independently animated parts attached to the original actors, not art clones.
- `src/video/riso-human-ensemble.tsx`: original paper handoff and fixed-frame receiver-relative release now use these endpoints in place of the previous generic hand joint root. Exposes original source-to-pad and thumb/index distance as diagnostic attributes, alongside physically pressed sheet contact and six native print channels.
- `tests/riso40-paper-fingertip-contact.test.ts`: each source stage projector matches the original RISO39 independently evaluated FK/IK world tip, both real film aspect ratios, f160 shared contact, f202+ ownership, f126–160 unfolding interpolation, and 2-frame release continuity.
- `tests/e2e-storybook/riso-human-ensemble.spec.ts`: native full-film browser asserts that f160 paper anchor is shifted **away from wrist roots** and stage-space real pad separation is finite. Both real animated actors, both aspect ratios, the existing paper z-order, print screens and contact creases still need browser proof.

### 5. Explicit remaining limitations

This fix makes the paper attach to the original **actual index/thumb print**, rather than to the wrist. It does **not** make the ~4.7-source-unit underlying red thumb/index pad gap disappear. For a physically credible pinch, verify the paper's normal-axis lies between the two pad surfaces; validate the contour tangent at each paper short edge and that the nearest red pad ink reaches the opaque paper without an open white tunnel at final viewing size. The original two-handed frontal 2D rig lacks independently observed 3/4 actor/reference hand masks and physically solved tissue deformation. The v9 human anatomy portrait fidelity gate is therefore *not available as a certified PASS*. A successful CI screenshot is technical verification; only an actual visual review can approve the composed grip.
