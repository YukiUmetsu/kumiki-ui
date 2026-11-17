# Sculptural Type (MC1.2)

**Status:** built 2026-11-17 for roadmap slice MC1.2 ([docs/06](../06-roadmap.md)). Owner visual review pending.
**Registry items:** `sculptural-type` (core, no runtime dependency) and `sculptural-type-three` (Three.js adapter;
depends on `three`; takes materials structurally, so it does not pull in the materials pack). `title-sequence` uses the core for sculpted titles.
**Extends:** KineticText (`animated-text`: grapheme segmentation, stagger) and TitleSequence (`title.sculpt`).
**Storybook:** Motion engine → Motion React → *Sculptural Type*; Video production → Title Sequence → *Sculpted Title*.

## Purpose

Treat letters as dimensional, deformable, material-bearing animated objects. Each grapheme (or word) of any font the
page can draw becomes a solid with a sculpted face, carries a measured material, and moves with weight: it falls,
squashes, unfolds, twists, inflates or swings, and settles.

## How it works

1. **Layout and rasters** (`sculptural-type-field.ts`). The text is split with KineticText's `segmentText`. Each unit
   is drawn alone at the font's pixel size (one em = that size). Pen positions come from measuring each prefix of the
   line, so kerning is kept. Ligatures are not, because every unit is its own object. Use `unit: "word"` for joined
   scripts (Arabic, Devanagari conjuncts).
2. **Signed distance field.** The exact linear-time Euclidean transform of Felzenszwalb and Huttenlocher, seeded with
   coverage at edge pixels as in Mapbox TinySDF. The zero line runs through 50 % coverage.
3. **Relief profile** (`ReliefProfile`): height over distance from the edge.

   | Profile | Cross-section |
   |---|---|
   | `flat` | A plain extrusion with a square edge |
   | `chamfer` | A straight bevel of `width`, rising `height`, then a plateau |
   | `round` | A quarter-round bevel (its start is capped at about 76° so a pixel grid can sample it) |
   | `pillow` | An inflated face: each stroke rounds over its own thickest point |
   | `chisel` | A V-cut prism: walls at `angle` meet in a ridge along each stroke's centre line, as in cut stone |

4. **Solid** (`sculptural-type-mesh.ts`).
   - **Face:** marching squares fill every covered grid cell, so the face edge follows the zero line exactly and the
     mesh is watertight. Heights are exact. Normals come from a lightly smoothed field and one pass of neighbour
     averaging, which removes grid aliasing on diagonal bevels. There is no averaging for `chisel` and `flat`.
   - **Walls:** smooth normals on curves and split normals at corners sharper than `creaseAngle`.
   - **Back:** a flat cap.
   - Coordinates are em, y up, front faces counter-clockwise.
5. **Deformers** (`sculptural-type-deform.ts`):
   - `bend`, `twist` and `taper` after Barr, plus `squash` (stretch y, thin x and z by 1/√s: constant volume), `lean`,
     `wave` and `inflate`.
   - Every deformer returns its Jacobian. A stack composes exactly, and normals transform by the cofactor of the
     composed Jacobian, so they stay valid even when a squash nearly flattens a letter.
6. **Motion** (`sculptural-type.ts`).
   - **Timing:** `planSculpturalText` staggers the units with MG1's `staggerStartFrames`, optionally grouped by word
     or line.
   - **Poses:** `glyphPose` is a pure function of the frame: pivot offset, rotation, scale and deformer stack.
   - **Evaluation:** `SculpturalText.update(frame)` writes deformed positions and normals into reused buffers. It
     rewrites only units whose deformers are active or have just ended.

   | Entrance | Behaviour |
   |---|---|
   | `drop` | Falls under constant acceleration while stretching, squashes on landing and springs back with a small wobble |
   | `unfold` | Lies face up, then stands and uncurls (bend → 0) on a firm spring |
   | `twist` | Turns in from behind (ease-out-back) while its twist unwinds |
   | `inflate` | Starts as flat paper and puffs up to its relief with an overshoot |
   | `swing` | Hangs from a hinge at its top: a damped pendulum, the bend dragging behind the swing |
   | `rise` | Rises from below the baseline and settles |

   Idle motion after arriving: `wave` (a ripple along the line) or `breathe` (the relief swells). `reducedMotion`
   shows every unit at rest.

7. **Three.js adapter** (`sculptural-type-three.ts`).
   - `SculpturalTextObject` has one pivoted mesh per unit, and it re-uploads only changed buffers.
   - `sculptMaterial(record, texture?)` takes **any measured material**. MATL1's `findMaterial(id)` and
     `materialTexture(id)` fit as they are. It uses the measured base colour, metalness, roughness and index of
     refraction. Its maps (colour, roughness and metalness, and a normal map from height) are baked from the texture
     recipe at real size, with one em = `emMm` mm. The inputs are structural, so the adapter does not depend on the
     materials pack. That pack's clean install currently fails upstream (see Limits).
   - Optics carry over: anisotropy for brushed metal, transmission for glass, iridescence for nacre, clear coat for
     lacquer.
   - `detail` (0–1) blends the surface variation toward the measured mean. Wear and marks are optional storytelling,
     per [docs/14](../14-3d-visual-fidelity.md).
8. **Relief in 2D** (`sculptural-type-relief.ts`). `shadeRelief` shades a unit's field directly into pixels:
   - `cut-card`: an opaque card face over a soft shadow that falls further while the card is lifted;
   - `letterpress`: ink and impression walls as overlays;
   - `embossed`: foil with tight highlights;
   - `chiselled`: V-cut walls of even tone meeting in a crisp centre line.

   Incised styles return only what the cut changes, so the ground texture shows through.

## TitleSequence

`title.sculpt = { style, color?, depth? }` (also on credits) makes the line as physical letters:
- A letter lands every `SCULPT_LETTER_STEP` (2) frames and settles in `SCULPT_LETTER_FRAMES` (6), on the sequence's
  cadence.
- A card is set down from a little above the table, as the paper pieces are. Impressions and cuts deepen with a slight
  kiss of overshoot.
- The reading-time check counts the letters landing.
- An invalid style, colour or depth is the error `title-sculpt`.
- Film documents accept it (`npm run film:schema` regenerated).

## Usage

```ts
import { SculpturalTextObject, sculptMaterial } from "./components/motion/sculptural-type-three";
import { findMaterial } from "./components/materials/materials-physics"; // MATL1, optional
import { materialTexture } from "./components/materials/materials-texture";

await document.fonts.load("800 160px Geist");
const letters = new SculpturalTextObject({
  id: "title", text: "Kumiki", font: "800 160px Geist",
  profile: { kind: "chisel", angle: 40 }, depth: 0.16,
  stagger: 3, motion: { enter: "drop", intensity: 1, idle: "wave" },
}, { material: sculptMaterial(findMaterial("marble")!, materialTexture("marble"), { emMm: 140 }) });
scene.add(letters);
letters.update(frame); // each frame; seek in any order
```

## Research (graded)

| Source | Grade | Used for |
|---|---|---|
| Barr, "Global and local deformations of solid primitives", SIGGRAPH 1984 ([archive](https://history.siggraph.org/?p=107435)) | A (peer reviewed) | Bend, twist and taper, and the normal rule (cofactor of the Jacobian) |
| Felzenszwalb and Huttenlocher, "Distance Transforms of Sampled Functions", Theory of Computing 8 (2012) ([paper](https://cs.brown.edu/people/pfelzens/papers/dt.pdf)) | A | Exact linear-time Euclidean distance transform |
| Mapbox TinySDF ([README](https://cdn.jsdelivr.net/npm/@mapbox/tiny-sdf@2.1.0/README.md)) | C (practice) | Seeding the transform with antialiased coverage |
| Maxon, kinetic typography in Cinema 4D ([page](https://www.maxon.net/en/solutions/kinetic-typography)); MoGraph Text ([help](https://help.maxon.net/c4d/2027/en-us/Content/html/OMOGRAPH_TEXT.html)) | C (vendor practice) | Per-letter clones, extrude and bevel, bend/twist/bulge deformers |
| Carving guides on V-cut lettering, Catich via signwriting practice ([guide](https://shidiao.pages.dev/blog/2026-05-05-lettering-tools-stone-inscription/), [Trajan](https://www.nickgarrettsignwriter.com/trajan-lettering/)) | C, conflicting (45°–90° walls) | Chisel profile; the wall angle is a parameter, not a constant |
| Squash and stretch with constant volume ([Toon Boom](https://learn.toonboom.com/modules/animation-principles/topic/squash-and-stretch-principle?c=25)), after Thomas and Johnston, *The Illusion of Life* (1981) | C | Drop and rise presets |

## Limits

- Deformation runs on the CPU: about 2 ms per 20 000-vertex unit with two deformers (Node 24, Apple silicon). Only
  units still arriving or idling with deformers are rewritten. Very long texts should use `unit: "word"`, a larger
  `step`, or a smaller font size.
- Separate units lose ligatures and contextual joining; use `unit: "word"` for joined scripts.
- A clean install of the `materials` pack fails on main, independent of this slice. `human-anatomy` ships files
  that import `facial-expressions/expression-face.ts`, and `facial-expressions` already depends on `human-anatomy`.
  `sculptural-type-three` therefore takes materials structurally instead of depending on the pack.
- Grid resolution limits very thin bevels: keep bevel widths at about 8 raster pixels or more (0.05 em at 160 px).
- A swing's lean and an unfold's curl are stylized, not simulated.

## Acceptance evidence

- Geometry probe on an antialiased "O": the field's peak is 12.65 px against about 12.5 expected. For all five
  profiles there are no triangles against their normals, no inward walls and no nonfinite values. The same holds
  after bend, twist, squash and a taper + lean + wave stack.
- `tests/sculptural-type.test.ts` covers the field, solids, deformer normals, poses, stagger, relief and the
  TitleSequence checks and timing.
- Storybook screenshots were reviewed in Chromium: gold, terracotta round and chisel close-ups; a mid-drop frame;
  all four sculpted title styles. Found and fixed: beaded bevels, dull metal and framing, a stale tile cache, and
  hatched chisel shading.
