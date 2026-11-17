# Groomed hair (ANAT1 hair foundation, second generation) — research, 2026-11-16

The owner found the hair foundation robotic: too few hairs, a bald-looking side in shadow, weak bangs, and portraits
that did not use it. `hair-groom.ts` replaces the portrait's hair. It grooms a style on the head, grows it under
gravity, cuts it like a haircut and draws tens of thousands of strands with self-shadowing.

Grades:
- **reported:** quoted from the source;
- **measured:** from data in the repository;
- **estimated:** chosen within what the sources support, then checked in renders.

## Physics of a hair on a head

| What | Value | Grade | Source |
| --- | --- | --- | --- |
| Elasto-gravity length of a hair | ℓ = (A/λg)^(1/3) ≈ 5 cm | reported | Goldstein, Warren & Ball, *Shape of a ponytail and the statistical physics of hair fiber bundles*, PRL 108, 078101 (2012) |
| How a hanging strand turns toward gravity | over √(ℓ³/L), L the length still below | estimated | Linearised heavy elastica, B θ'' = T sin θ with tension T = λgL, so the bending length is √(B/λgL) = √(ℓ³/L); a 40 cm hair turns within about 18 mm of the scalp, while 6 cm stands out |
| Scalp hairs | about 100,000 (80,000–150,000) | reported | Common dermatology figure |
| Fibre diameter | 70–78 µm | measured | `HAIR_GROUPS` (ANAT1) |
| Highlight shifts | R −7°, TT +3.5°, TRT +10.5°; widths 7.5° / 3.75° / 15° | reported | Marschner et al., *Light scattering from human hair fibers*, SIGGRAPH 2003 |
| Self-shadowing | deep opacity maps | reported (method) | Yuksel & Keyser, *Deep opacity maps*, Eurographics 2008 |
| Light scattered through the hair volume | in the fibres' colour, attenuated less than direct light | reported (idea) | Zinke, Yuksel, Weber & Keyser, *Dual scattering approximation for fast multiple scattering in hair*, SIGGRAPH 2008 |
| Fibre colour | σa from eumelanin and pheomelanin | reported | Chiang et al. 2016 via pbrt (ANAT1 `hairSigmaA`) |

## How stylists cut bangs

| What | Value | Grade | Source |
| --- | --- | --- | --- |
| The bang section | a triangle from the apex to the recessions or the ends of the brows | reported | [Kenra Professional, *Fringe 101*](https://kenraprofessional.com/blog/different-ways-to-cut-bangs) |
| Section depth | about 1 in. behind the hairline for see-through bangs, 2–3 in. for a heavy fringe | reported | Home-cutting guides summarised in a search, low quality; used only as a range |
| Curtain bangs | shortest at the bridge of the nose | reported | Kenra Professional (as above) |
| Curtain bangs | from the cheekbones to just above the lips | reported | [AARP, *The best bangs … at 50-plus*](https://www.aarp.org/entertainment/beauty-style/bangs-hair-style/) |
| Bottleneck bangs | slim and short in the middle, longer round the eyes, longest along the cheekbones | reported | [Stylist UK, *Bottleneck bangs*](https://stylist.co.uk/beauty/hair/bottleneck-bangs/606342) |
| Widths, depths and lengths used (`FRINGES`) | blunt 34° × 55 mm, wispy 30° × 32 mm thinned to 38%, curtain 37° × 45 mm, … | estimated | Within the ranges above |

Styles (`HAIRSTYLES`) follow the standard salon lengths (a bob at the jaw, a lob at the collarbone, clipper guards
3–25 mm). They were compared with public-domain portraits:
- Renée Adorée's 1920s bob;
- Veronica Lake's 1940s side wave;
- Abbey Lincoln's 1966 afro;
- 1940s men's side parts.

## What changed in review

| Defect (seen in renders) | Cause | Fix |
| --- | --- | --- |
| Long hair stuck out like a static charge | Bending constraints applied every iteration made each guide a rigid rod | Guides grown as heavy elastica: they lie on the head and turn toward gravity over √(ℓ³/L) once free |
| Bangs and side hair drifted to the middle, or flew forward off the face | (1) Points were pushed out of the scalp from its centre, which drifts them sideways; (2) a surface push was taken as the new direction | Push along the surface normal; slide the strand's own direction along the surface |
| A seam, dashes or a lip across the upper forehead | The face mask ends about 30 mm below the hairline and stands up to 14 mm in front of the cranium | A strip of skin grows from the mask's top edge onto the cranium (one surface, shared vertices) |
| Front hair fell over the face | Gravity pulls the front down; a real style holds it | Over the front of the head the comb alone steers hair (no gravity) until it passes the temple |
| Child strands crossed the face, or slid under the chin | Two guides that part ways were averaged; root offsets were carried as fixed vectors; clump leaders went elsewhere | Children follow only guides that stay together, carry offsets in the strand's own frame, and join leaders by root and tip |
| Black stripe beside the face; bald-looking temples | Deep hair lost all light; bare scalp painted at half the hair colour and shadowed again | A sky floor and weaker extinction for scattered light; the roots painted at 80% of the hair colour and lit like the hair mass |
| Saturated "doll" blonde | Multiple scattering used albedo², which multiplies the saturation | Halfway between the fibre's chroma and its square |
| Bob splayed out at the sides | Short hair leaving the widest part of the head keeps its direction for about 4 cm (physically right) | A blow-dried `hug` toward the head and neck for bobs and lobs |

## Checks

`tests/human-anatomy.test.ts` checks:
- grooming is deterministic;
- no strand hangs over the face below the brows without bangs;
- blunt bangs end within 6 mm of the brow line;
- coils stand further from the scalp than slicked hair;
- the scalp is bare below the hairline, covered above it, with a bare parting.

## Limits

- Strands are drawn as lines; there is no full path tracing of the hair volume (deep opacity maps and the
  dual-scattering idea stand in).
- One groom per head shape, not simulated in motion.
- Tight coils are a textured volume, not individual coils traced end to end.
- Only the agent has reviewed the renders; no human visual review yet.
