# RISO41 — Original red thumb/index contact and ink-derived paper pressure

Status: reference-led source revision, pending native print screenshot critique. ArtCraft v9 includes reference research, human anatomy, 2D construction, material study, animation and independent fidelity review. Numerical source/CI validation does NOT equal anatomy or artistic approval.

## Direct source image observations and licensed technique references

| Reference (rights) | Specific observed construction | Required source repair |
| --- | --- | --- |
| [Proko: hand muscle anatomy](https://www.proko.com/course-lesson/how-to-draw-hands-muscle-anatomy-of-the-hand/) (copyright artist, technique only) | Thumb palmar thenar mass starts at wrist; thumb/index web bows inward as fingertips oppose; short visible fat-pad arc and longer dorsal tendon remain different. | Preserve original red thenar, separate moving thumb IP and cobalt nail. Move existing joint ROOTS, never paste external hand pixels. |
| [Proko: hands from imagination](https://www.proko.com/course-lesson/how-to-draw-hands-from-imagination-step-by-step/) (copyright artist, anatomy construction) | Short hooked index C-shape approaches thumb through a concave negative-space tunnel. Other three fingertips retain independent stagger and foreshortening. | Preserve RISO39 independent PIP/DIP curl, RISO38 proximal/middle/distal red contours, RISO33 index-middle bone centerline separation. |
| [Reference photograph: side pinch gesture](https://www.uidownload.com/en/clipart-aht4e) (redistribution permission unverified; link only, NOT copied or traced) | Nail-bearing fingertips oppose across a small channel, thumb shorter than curved index, knuckle roots asymmetrically placed. | No stamped fingernail/photo, keep four discrete C/Q sources per articulated digit. |
| [Proko: hand bones](https://www.youtube.com/watch?v=rJjMiXlq9ns) (copyright creator) | MCP, PIP, DIP and thumb CMC/IP must have independent joints with nonzero bone lengths. | Maintain existing ANAT1 constraints; real source transforms must drive true red ink, not a scene-only sticker. |
| Original RISO40 native Chromium hero f166, workbench 6.2x (owned source: latest main + [PR #445](https://github.com/YukiUmetsu/kumiki-ui/pull/445)) | Red thumb/index ink clearance is 4.7 original units. Paper midpoint is now correct but the raised red pads fail to meet; the paper crease is driven by hand/root distance, not by ink pressure. | Retract original moving index MCP into palm 3.8 local units and advance original thumb CMC 1.5 units, including smooth release, then tie real cobalt paper pleats to closed-red gap. |

## Source hierarchy, independent plate mechanics, negative controls

- Hand root: full original red glove; contains both anatomical index and thumb roots.
- Thumb source: thumb CMC local y offset at f156–186 +1.5, own red proximal form → original fixed-length thumb IP → separate red distal pulp and blue nail (untouched).
- Index source: original index MCP local y offset at pinch -3.8, original radial x splay retained to protect the index/middle paper-white tunnel; own proximal red shape → PIP → DIP and cobalt nail.
- Paper: one original physically opaque two-ink sheet anchored to the moving thumb/index tip midpoint, with donor f156 and receiving f160–166 real print pressure.
- Wrong shortcut #1: move paper while hands still miss (RISO40 fixed paper-to-tip midpoint only).
- Wrong shortcut #2: enlarge red finger tips with a pasted blob to hide the 4.7-unit gap.
- Wrong shortcut #3: decrease pressure visually by opacity, RGB alpha wash or global blur.
- Wrong shortcut #4: infer anatomically faithful 3D grasp from a 2D front-camera projection.

## ArtCraft five axes and release evidence

1. Topological continuity: all original closed red source paths, two articulate thumb pieces, 12 three-bone red index/middle/ring/pinky shapes, and blue nail engravings stay attached. Reject missing proximal thumb, broken wrist skin, or index-middle axes crossing at ANY two-frame contact/release cel.
2. Directional flow: original MCP translation follows thenar/index opposition, preserving independent PIP/DIP/IP curl. The palm C-shaped negative space must be visible at 1x.
3. Variable physical print pressure: new inspectRiso41InkPressure calculates true red ink distance using RISO39 closed source SVG contours and maps it smoothly from a 3-unit open-gap to a 0.6-unit print-near-contact cue. This is EDITORIAL ink pressure, NOT clinical force. The actual originally authored cobalt paper wrinkles use that curve.
4. Optical rhythm: use original 0–239 24fps film and 2-frame screen cadence; photographically incorrect key interpolation around 156/160/166/186/205 must fail release review. The screen cell and print misregistration remain unchanged.
5. Microtexture: preserve screen-dot density, paper tooth, misregistration, original red pad tip wedge and RISO37 individually drawn blue dorsals, creases and nail bed. No texture flattening.

## Proof and unresolved certification

- Technical gates: tests/riso41-real-red-pad-contact.test.ts; existing RISO17/21/29/32/33/36/37/38/39/40 tests; native Chromium Storybook isolated red and blue masters, full original film in 16:9 and 9:16, source contact at f156/160/166 and release f177/186/202.
- Visually inspect annotated source f166 workbench + both full-film f160/f166 and f202. Compare source f166 4.7-unit gap with candidate measured red edge clearance. Reject all accidental red collisions, missing blue nail, dark cuff overprint or paper z-order errors.
- ArtCraft v9 human anatomy image/mask fidelity certification cannot be honestly run without same-identity observed reference views and independently annotated semantic masks/landmarks. Neither joint ROM numerical checks nor a passing screenshot browser test substitutes for human art approval.
## RISO41 timing correction: source vs receiver roles

The f202–239 inherited RISO39 rig let both figures relax their index PIP/DIP and thumb IP, while the original RISO40 paper still followed the receiver's hand. That violates hand–prop ownership despite a technically valid joint tree. At frame 202 the donor must release its printed red pads, but the **receiving left hand must remain visibly closed over its paper edge**.

This iteration keys left index MCP/PIP/DIP and left thumb CMC/IP to the contact pose through frame 239. Only the donor's right-hand roots, fingers and thumb release by f205. The existing RISO33 full-two-frame fan/axis checks, RISO36 physical red contour checker and the RISO41 independent recipient-versus-donor source pressure test reject accidental crossing, disconnection and a receiver dropping the physical letter. This is a source-actor motion correction rather than a fake paper shadow.

## First native film / ArtCraft review (original 2026-11-15 f166 source)

Actual, not synthesized: GitHub Actions RISO41 workbench shot f166 and complete film f160/f166, run 43798179640, artifact ID 14195327681.

- Receiver blue/red 6.2x hand print: RISO40 had **4.7 source units of red thumb/index separation**; new exact closed red source geometry is **0.0 source units (contours touch/overlap)**, projected independent fingertip joint tips **1.3 source units apart**, native ink-pressure cue **100%**. Distinct cobalt nail crescents and three other red fingertip silhouettes remain, with original screen paper tooth.
- Donor at f166: **1.55 source units** of red pad white separation; source pressure **66%**, real index/thumb tips ~3.0 original units. The donor still physically contacts its sheet edge.
- Observed limitation: at high zoom the receiver's curled index and thumb make a compact red knot/diamond near the web with limited 3D tissue/foreshortening cues. It is more convincing as a print-contact gesture than the open RISO40 red hook, but NOT photo-real anatomy. The full 16:9 original film still uses stylized tiny figures and needs independent source silhouette quality work.
- Found real regression from new physically earned pressure: the donor started uncurling its source PIP/DIP/IP/CMC **before frame 178**, so the native f177 screenshot loses three of six original paper pressure creases. Browser rejected correct output and timed out rather than falsely certifying a good render.
- Corrective source action: preserve full right thumb CMC and IP, plus right index PIP/DIP through f178; release those real moving bones f178→f186→f205. The left receiving source index and thumb remain pressed through the held f239 shot. Independent unit assertions now require **both actual ink-pressure sources and all six authentic paper pleats at f177**.
- New real browser render still required before merge; passing geometry and viewing one contact hero cel is not a full-film artistic release sign-off.

## Second native film visual critique — RISO41 source release hold

Actual Chromium complete success was observed on run 43798849889: **all 3 GitHub Actions checks were green** at head b555572, including the 16:9 and 9:16 original f177 frame with all six actual sheet pressure creases. Inspected final original 16:9 f177 and f239 full-film screenshots (artifact riso32-native-thumb-proof, 14195837011).

- Correct: donor final shared f177 visibly maintains thumb/index grasp over the sheet edge. The original source red fingers, two physical inks, blue hatching and screen registration persist without missing strokes; recipient remains in contact after the original donor releases, and f239 the source physical hand owns the sheet.
- **Independent art rejection:** although old RISO40 geometry only tested that the sheet contour stayed **above** the planted boots, the f239 screenshot still shows the paper left free end almost on the baseline, crossing the upper calves. The receiver held the long letter at waist level but its far end drooped so far that the scene read as dropped rather than held.
- Actual source fix: at receiver-owned f202+ change shared original handoff final inclination from -23 degrees to +9 degrees (a restrained wrist-up lift). The same source hand/index/thumb pad and existing sheet FK/IK still drive the one physical page. Do not create another prop, independent postprocessing matrix or flatten original real print curves.
- Stronger art gate: the 2D original sheet's vertically projected short-end difference after takeover must remain below 15% of its own long-edge chord. This is a stylized waist-band staging rule, not clinical paper stiffness or full dynamics. Check f202/f239 in landscape and portrait at final native viewing size, with no clipping, free-tip foot penetration or f178 handoff pop.
