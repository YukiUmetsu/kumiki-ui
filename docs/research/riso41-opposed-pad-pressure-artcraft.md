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