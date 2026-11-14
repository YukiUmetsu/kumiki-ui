# WC10 — Optical watercolor glazes and naturalist artwork

**Milestone:** iterative improvement over the reusable WC9 illustration contract. This is an original authored scene, not an image transfer or copied professional painting. WC9 remains functional without any `wash` treatment.

## ArtCraft comparison: what was missing

The final WC9 captures (960×540 and 540×960) had clear silhouette hierarchy but the heron read as a poster/flat-vector illustration: large uniform teal body, uniformly smooth feather color, flattened horizon and disconnected water contact. Fine contours existed in code but did not visually read as layered translucent watercolor. Composition is still artistically stylized.

Scientific watercolor references support **separate** wet-in-wet spreading, wet-on-dry edge accumulation, granulation, clear-water backruns, and optical glazing—not one whole-canvas noise filter. See [Curtis et al., *Computer-Generated Watercolor*](https://grail.cs.washington.edu/projects/watercolor/paper_small.pdf), section 2.2 and figures 1a–f, and [TAMU watercolor paper study](https://oaktrust.library.tamu.edu/bitstream/handle/1969.1/1572/etd-tamu-2004C-VIZA-Scott.pdf?sequence=1). The artistic references in [WC9's original ArtCraft board](watercolour-wc9-artcraft-illustration-director.md) remain study-only, not included as textures. New visual comparison subjects include original work by Glen Loates (realistic overlapping heron wing feathers) and atmospheric washes shown by Ilya Ibryaev (pigment boundaries and luminous breaks); both are copyrighted and are **not traced, downloaded into the repo, or distributed**.

## Implementation and art-direction choices

1. `WatercolourWashTreatment` is an **optional** extension of a semantic watercolor `path`: `highlight`, `shadow`, `glaze: { pigment, opacity }`, and `edgePooling`. The main path retains the original pigment and opacity; a bounded gradient adds tonal hierarchy, a second translucent paint pass simulates *optical* mixing, and an irregularly displaced contour pass simulates edge pigment deposition. This is a controlled qualitative renderer, **not** a validated Kubelka–Munk spectral model.
2. Treatment parameters are only legal for actual colored `wash` paths. Only six-digit hex pigments and 0..1 scalar strength are allowed; malformed JSON, unsafe colors, invalid opacity, and treatment on line/drybrush paths are rejected. Existing films without `wash` properties retain their rendering.
3. Heron construction was revised with asymmetrical body silhouette, multi-value shoulder and wing washes, soft luminous neck/cheek, retained eye/mandible attachment, and separate lower-body optical shadows. The body is still opaque enough to avoid the former see-through character problem.
4. Marsh rendering adds two receding bank masses, 13 fine rooted distant grasses, a non-contiguous water-contact reflection, and silt pools under the feet. Important background forms remain quieter than the head/eye and primary folded wing.
5. Storybook **05 Illustration Director** retains its stable ID and all existing timeline, format, fine-detail and JSON controls, and adds **Optical glazing & pigment pooling** for direct before/after critique. FilmStage output remains source-driven in both ratios.

### Acceptance and verification gates

- `npm run typecheck`, changed tests and Storybook source checks.
- Deterministic absolute-frame motion; no animation timers in the library, no external textures.
- Browser captures at 0/135/265/359 in both ratios. Verify optical passes exist and disappear with the before/after control.
- Real FilmStage frames, encoded MP4 segment, anatomy crop and negative-space audit. Focus on bill, iris, legs' placement under torso, reed anchoring and shoulder feather flow.
- High-fidelity physical paper/ink and speed benchmarks remain open. **Do not certify world-class craftsmanship from tests alone.**

### Next quality work after this milestone

- Brush-direction-guided fibers, inter-pigment granulation at real scale, localized bloom boundaries.
- Independent heron wing/leg pose control, coherent reflections following moving limbs, species-grade anatomy.
- New, non-bird authored scenes (architectural, human and botanical) exercising the same engine.
- Independent professional watercolor review against licensed visual study boards.

