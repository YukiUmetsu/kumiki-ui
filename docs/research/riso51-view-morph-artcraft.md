# RISO51 — 3/4 palm perspective as living source-vector print geometry

Status: **candidate, ArtCraft visual approval separate**. Existing PR [#471](https://github.com/YukiUmetsu/kumiki-ui/pull/471). Builds on RISO49/50; does **not** create new Storybook category, new licensing dependencies or photographic overlays.

## Observed source references and model

* [CMU image: Hand Holding Papers](https://www.cs.cmu.edu/~jialiu1/database.html), photographed thumb pressing against a page edge with the middle, ring and little fingers folding inward. Native visible topology: thumb/index create a compact saddle; far-side metacarpal arch is lower in image than the near-side index and thumb. The three unopposed support fingers are **overlapping curved masses**, not straight parallel independent rake tines. View only; image never copied into the product.
* [Andrew Loomis, *Drawing the Head and Hands*, Plate 81 — Hollow of the palm](https://upload.wikimedia.org/wikipedia/commons/a/a0/Andrew_Loomis%2C_Drawing_the_Head_and_Hands.pdf), physical cupping of radial/ulnar palm and bony crests. The hollow should remain evident after the fingers bend. Treat the entire palm as a changing 3/4 volume, not a constant circular glove.
* [CDC NIOSH, Six Basic Classes of Finger Position](https://stacks.cdc.gov/view/cdc/179564/cdc_179564_DS1.pdf), p.60: lateral thumb-index pinch leaves the remaining fingers flexed into the palm. An index precision pinch is therefore **not** four fingers extending in parallel with the sheet.
* Existing Kumiki ANAT1: `HAND_POSES.grip`, `RISO31_GEOMETRY`, measured clinical joint limits. A source-view length is not a shortened anatomical bone. All existing 24fps 2-cel source joints remain continuous in real time.
* Physical medium: original RED and BLUE separately imaged RisoPrint stencils; no RGB shadows, cross-fades, sprites, traced external photographs, new inks, baked animated screenshots, or loss of the RISO30–50 fine engravings.

## Root-cause correction

RISO50 was a **single static original vector palm** pasted into every handoff cel; the gloved palm could never turn three-quarter despite moving PIP/DIP joints. Similarly, source finger PIP/DIP pivot was compressed by RISO48/49 but the original RED proximal and middle printed path was still authored to full rest length, leaving long red tubes **hanging past their real moving bone station**.

### New general source-geometry capability: `RisoCharacterPart.pathKeys`

`registry/video/riso-path-morph.ts` provides `RisoPathMorphKey`, `inspectRisoPathMorph` and `evaluateRisoPathMorph`. All key vectors must have the exact matching path-command/number topology (M/L/C/Q etc.), be finite, bounded and on strictly increasing valid film frames, and preserve the original source contour at f0. Animated SVG alpha/crossfade is impossible by contract: actual **cubic control-point coordinates** interpolate deterministically at the exact source cel. Unsupported elliptical arc flags or incompatible contour topology fail inspection before rendering. Mismatched keyframe data must not become a flattened generic shape or trigger unsafe raw path injection. These are general reusable RISO2 source features, not consumer-specific conditional logic.

The original renderer then evaluates each part's geometry at `sampledFrame`, preserving the previously established exact RISO2 flipbook cadence, joint/world transforms, original masks, ink knockout and per-plate print. Original static part definitions have unchanged evaluation if `pathKeys` is absent.

### Original RISO51 physical palm and fingers

`src/video/riso51-view-conditioned-source.ts` authors original **3/4 contact** source contours for each hand. For contact: (1) the little-fingerward MCP top ridge fans 2.25–2.7 units farther toward the ulnar side and recedes 4.55–5.1 image units; (2) the near-side index crest advances slightly; (3) wrist station stays fixed. Both actor identities have different parameters. These adjustments are a small **original 2D perspective construction**, not a fitted 3D camera or photo-aligned claimed accurate depth.

The transform is applied identically at the same sampled cel to:
- **1 original RED carpal cup path:** all 16 RISO50 cubic main-outline segments still exist, with a more physically sloping far MCP ridge, preserving attached wrist and true named skeletal joint.
- **1 original BLUE MCP source engraving path:** all 4 source cobalt etched facets remain attached to the changing red top volume, not drifting as screen-space decals.
- **6 original RED support-bone paths:** middle/ring/little proximal+intermediate red physical positive stencils are individually reauthored through `riso31PhalanxSourcePath` to match each foreshortened, still moving ANAT1 PIP/DIP pivot, preserving their original 2/3 control-point sculpt, asymmetry and ink identity. The opposed index and thumb never move via this projection and continue real original paper-pressure printing.

Total **8 genuinely morphed source paths per actor**. Contralateral hands still use the original exact ink. Donor f160 reaches maximum source view and visibly releases until f205; receiver stays projected after the exchange. Film is 240 original frames, 2-cel source hold and actual complex two-character story. No new third color.

## Validation and release gate

- All RISO2 originals still pass their static schema. Explicit negative tests for malformed/injected SVG, mismatched Bézier commands, unsorted/invalid keyframes and forbidden arc-flag morphs.
- Verify actual f148 source vectors differ from both f146 and f160, and actual f160 RED carpal and BLUE MCP source paths equal the new contact control geometry; compare actor/hand isolation.
- Verify each of 8 named animated parts retains source printing, all 12 source-red independently articulated phalanges per hand, genuine 2-ink masters, exact f160/166 thumb under/index on page in both aspect ratios, each original rigorous >3 source bone-axis separation at **every 2-cel frame across 240**. No weakening previous geometry safety tests or tolerance.
- Exact native Storybook workbench browser checks: `data-km-riso51-live-source-morph-parts=8` and `data-km-riso51-palm-projected=true` only on donor right/receiver left at contact, not on untouched opposite hands. Inspect BOTH 6.2×/7.4× hand crops **and full native 960×540/540×960 film** from the actual physical two-color Chromium artifact, including both plate masters. Sample at f144/154/156/160/166, not just f160.
- Human art acceptance **not implied by passing tests**: at actual 1×, a hand must read as a continuous natural palm cup that grips the page, not a mitten with dangling fingers. The 1× full video must show a real artistic improvement in handoff, not only a few changed pixels. If reviewer still sees claw-like rake fingers, remain draft and prioritize full bony joint-constrained side-view overlap, not more decorative microshapes.

All source materials are used as observed topology references only; no distribution permissions for referenced photographs are assumed.
