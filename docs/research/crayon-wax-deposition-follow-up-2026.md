# Crayon animation study — wax-contact build-up and acting priorities

Updated 2026-11-14. Source status: published process notes, research abstracts
and reference stills inspected. Full reference films were **not** downloaded or
frame-decoded here; references are cited for technique, not copied artwork.

## Reference observations and decisions

| Source | Evidence | Transfer to Kumiki |
| --- | --- | --- |
| [Sonnye Lim, *My Mu*](https://www.cartoonbrew.com/shorts/sonnye-lim-my-mu-crayon-animation-231556.html) | Production interview describes rough digital animation finished with real crayon for line and colour, with camera interplay | Separate body acting from medium-specific linework; treat wax as authored deposits, not generic grain |
| [Hannah Jacobs / Tom Rosenthal, *It's OK*](https://www.doodlersanonymous.com/an-entirely-hand-drawn-music-video/) | Artist's drawn sequence and published frames have uneven scumbling, generous negative space, deliberately simple emotional silhouettes | Reduce micro-detail where the scene needs empathy; reserve grain and mark density for focal subjects |
| [Alisi Telengut, oil-pastel technique](https://www.animatematerials.org/workshops/demo-alisi-telenguts-oil-pastel-animation-method/) | Under-camera reworking of a stable surface; preferred capture around 8 fps; physical color accumulation persists | Build from actual spatial wax contacts; use held exposures rather than uncorrelated per-frame noise |
| [Rudolf, Mould and Neufeld, wax-crayon deposition research](https://people.scs.carleton.ca/~mould/papers/crayon-cgf.pdf) | Paper height field, contact force, friction, wax removal and redeposition govern material behavior | Work toward contact-aware, pressure-sensitive deposits; avoid pretending flat solid wipes are wax |
| [Nicolas Ménard, *Micromachines*](https://vimeo.com/42937472) | Original short explicitly presents cars drawn in wax crayon, originating from a tabletop drawing exercise | Give constructed props coherent stroke order and material contact with the page |

## Before this iteration

CRAYON1 already had solid opaque finished characters and expressive 2D
replacement-drawing rigs, but its **intermediate** dense pigment was clipped
by a height-animated rectangle. The flat geometric boundary contradicted the
actual crayon stroke progression and was especially noticeable at close-ups.

## Implemented

- Paint dense undercoat only where the first seeded mark layer has traveled,
  using the same absolute-frame stroke-progress function as the visible wax.
- Keep the opaque backing independent from the porous tooth mask.
- Add a brief final settling coat to reach the existing fully occluding
  silhouette without a single-frame pop.
- Preserve deterministic seeking, open atmospheric fills, all JSON fields,
  Storybook controls, and low-cost server-renderable tests.
- Add a focused in-progress Storybook optics comparison.

## Next priorities, ordered by perceptual impact

1. Author genuine pressure/speed per path, then render contact-width variation,
   scraped edges and local pigment transfer; avoid expensive full-field simulation
   until output measurements justify it.
2. Increase unique hand-redrawn **key poses** at extreme actions (dragon wing
   compression, jaw opening, landing). Affine deformation alone looks rubbery.
3. Add reusable architectural stroke-order grammar for eaves, timber, stone,
   plants and other illustrated media rather than hundreds of static decals.
4. Pair every performance with a normal-speed 16:9 and 9:16 export; review
   timing, drawing-frame boils, silhouette readability and background occlusion.
5. After those gates, evaluate nib tracking, wax smear/redeposit and
   optional physical paper-height field, with CPU/GPU budget caps.

**Visual-approval state:** not reviewed by a human at normal speed. Unit tests
and static Storybook examples are technical evidence only.
