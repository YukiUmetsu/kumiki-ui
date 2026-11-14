# Risograph Character Art — Printmaking Reference Audit (RISO5)

**Date:** 2026-11-14  
**Context:** Kumiki UI's original Paper Courier (RISO2 → RISO4), FilmStage, spot-ink print system, and anatomy-agnostic 2D rigs.  
**Goal:** Characters must read as **opaque, deliberately inked subjects** even in front of complex printed backdrops. Preserve authentic overprinting and registration character; do not confuse transparency with low ink density.

## Reference evidence and design transfer

| Source | Observed / documented practice | Implementation implication |
| --- | --- | --- |
| Maryland Institute College of Art (MICA), [Riso File Prep](https://www.mica.edu/campus-life-and-resources/places-and-spaces/maker-spaces-fabrication-studios/printmaking-studio/risograph-file-prep/) | Each grayscale plate has independent ink density; full black produces full ink while gray produces a tint; multiply previews are useful for color mixing. | **Keep solid ink for body masses.** For light faces and fabric highlights, use actual tint screens on paper—not a semitransparent figure drawn over a complicated scene. |
| University of Illinois, [Riso Print Guide](https://web.faa.illinois.edu/app/uploads/sites/6/2021/05/riso_print_guide.pdf) | Knockout eliminates lower-plate ink where another color must remain pure; trapping expands adjacent colors to avoid misregistration gaps. | Create **one paper-matte silhouette from all posed character components** between already-printed scenery and actor ink layers. Use a small, bounded edge expansion. |
| [Risolana printmaking guidance](https://www.risolana.org/printing) | Stencil master, translucent inks and independent passes; overlapping colors create new combinations; registration is imperfect. | Preserve transparent ink **within intentional overprints**, per-plate color and independent registration offsets. Never globally disable Riso multiply to solve an actor-matte bug. |
| [Dopple Press, Risograph character work](https://www.dopplepress.com/riso) | Bold character silhouette, high contrast, separately legible costume, accessories and shoes; details work without complex gradients. | Strengthen coat vs face vs bag masses, facial framing, boot and satchel hardware. Protect limb readability before microtexture. |
| [Hello Vonnie, Tiny Plant Friends](https://www.hellovonnie.nl/shop/p/tiny-plant-friends-riso-prints-set-of-3) | Large contiguous color areas and readable simple faces; printed dot texture is secondary to the graphic shape. | Remove half-opacity character bodies, use distinct solid/tinted shape hierarchy and a deliberate paper-colored light region. |
| [Jen Schier, After Later](https://www.jenschier.com/work/music/after-later-risograph-animated-music-video) | Case study describing actual printed frame-by-frame Risograph stop motion and limited color choices. | Treat held source cels as authored print frames; avoid generating independently randomized texture or reg offsets on every playback tick. |
| [School for Poetic Computation, Riso Animation](https://sfpc.study/sessions/summer-25/riso-animation) | High-contrast short looping animations with a limited number of carefully selected source frames. | Favor polished short poses, clean character contour and repeatable action keys rather than a long low-craft continuous pseudo-walk. |

Research uses **principles and craft**, not traced illustrations, extracted copyrighted assets, or reproduced character designs. No external artwork is bundled.

## Critical review of Kumiki's RISO2–RISO4 before this iteration

1. **P0 — The subject is see-through.** `RisoPrint` globally multiplies translucent spot-ink layers, including background and foreground. If a background plate runs through the coat or bird, it remains visible; a dark leg or face alone cannot conceal it. Previous screenshots show crossed print layers and weak actor-background separation.
2. **P0 — Character bases are alpha-faded.** The courier face is 29% opacity, coat 82%, bag 76%; the bird's body is 40% and head 54%. This makes anatomy look like translucent acetate instead of paper-backed, solid graphic masses. Keep `opacity` in the generic schema for intentional printed tints and future uses, but stop using partial opacity in original lead character silhouettes.
3. **P1 — Tone is being confused with material opacity.** A face should be a screened ink tint on the physical page, not a transparent viewport onto trees, props and streets. Fill a body contour with paper first; use dots for tint.
4. **P1 — Detail scale and edge control are inconsistent.** Boots, seams, satchel hardware and face border are too generic; the banding of limbs is often more prominent than expression or costume design. Add a few purposeful high-contrast details with real spot-ink separation.
5. **P1 — Anatomical deformation remains limited.** The RISO4 tapered 2D ribbon closes cracks but can flatten elbow and knee volume, especially under sharp bends and side-on poses. Needs authored crease accents, shape swaps and volume constraints—not merely more grain.
6. **P1 — The acting vocabulary is sparse.** Walking, blinking, speaking, smiling and one prop handhold are not enough for a wide cast across genres. Next: expressive pose libraries, discrete turnarounds, independent gaze/eyebrows, finger/grip redraw, pauses and anticipation/recovery beats.
7. **P2 — Texture is too uniform.** Current sheet-level pores and globally repeated halftones can read as digital damage over a clean vector drawing. The ink layer should eventually support deterministic local density mottling, paper-tooth interaction and rare directional roller artifacts. It must remain legible at video compression size.
8. **P2 — Plate proofing lacks a foreground-matte stress scene.** Existing Storybook screenshots mainly show characters over pale paper with sparse backdrops. Build tests with dark shapes crossing the torso and face, per-ink isolation, aspect ratios and shuffled seeks.

## RISO5 design: paper-backed opaque characters

The root compositor prints **background ink A and B**, then an opaque **paper clearance** in the union of all posed actor parts, then **foreground ink A and B**. A second actor may apply its own paper matte and subsequent ink passes to preserve depth ordering. The paper matte is not counted as a third spot plate. It represents **no ink at that footprint**, as if the underlying master had been knocked out.

- API: `RisoPrint.foregroundLayers` is optional and backwards compatible. Each layer has a unique slug, optional `knockout` SVG group, and one ink callback per declared plate.
- API: `RisoCharacterKnockout` evaluates the same absolute frame and IK state as `RisoCharacterInk` and emits all its part paths as full-opacity paper geometry. `spread` (0..8 stage units) adds controlled tracing/trapping.
- Original actors: no partial-opacity base shapes. Paper-surface facial tone and cheek accents use real screen dots, while coat, bird, cap, hair, shoes, bag and visible contours are solid. The original blue/red limited palette remains.
- Composition: `RisoCharacterPerformance` paints stage backdrops/titles first and independently clears/prints the courier then paper bird. The magnified rig lab uses the same compositing.
- Validation: invalid foreground layer definitions, duplicate IDs and paper knockouts in transparent-paper mode fail loudly. Existing non-character RISO prints remain unchanged.

## Next craftsmanship roadmap after RISO5

1. **P0 / visual check:** compare dense-background stress screenshots at frames 0, 46, 157 and 198 in 16:9 and 9:16; check hairline leaks, accidental plate-only gaps, face contrast, readability and H.264 compression.
2. **P1 / shape language:** create identity-preserving forearm, coat, trouser and knee redraw options; separate silhouette, shadow and keyline layers; use 2–4 distinct shapes rather than a single elongated taper.
3. **P1 / acting system:** author walk-start/stop and weight shift, precise foot contact, blink timing, talking mouth keys, eyebrows and grasp/release; export looping/one-shot actions across characters without borrowing another style's animation engine.
4. **P1 / artistic inks:** implement deterministic spatial coverage noise, spot plate threshold, edge roughness and controlled trapping designed at output pixel scale; avoid unstable random temporal flicker.
5. **P2 / proofing:** make split-screen plate and actor matte inspections, close-up 100% PNG, H.264 MP4 proof, color-edge audit and perceptual checks for video encoding.

**Acceptance:** visually opaque characters, no visibly exposed background inside covered body shapes, zero involuntary alpha fade, independent plate separation, exact seeks, no nested rig regression, correct registration, no stolen art, and real browser/film verification. Green geometry tests alone do not approve character art.
