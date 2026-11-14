# CRAYON1 material craft audit — opaque character buildup and storybook navigation

Date: 2026-11-14. Status: implementation in PR, not independently human-approved.

## Reference comparison (technical study, not an assertion that every film was watched)

1. **Alisi Telengut**, [oil-pastel animation method](https://www.animatematerials.org/workshops/demo-alisi-telenguts-oil-pastel-animation-method/).
   The documented technique repeatedly draws over the same relief surface,
   applies gel medium to separate layers when colors get muddy, and animates
   on a low exposure rate. A surface has *accumulated paint*, not uniformly
   transparent vector silhouettes. **Implication:** separate dense pigment
   buildup from top wax relief and preserve persistent paper tooth.
2. **Pixar — "Coloring Outside the Pipeline" (SIGGRAPH 2026)**,
   [research paper](https://research.pixar.com/docs/2026.SiggraphTalks.SDW.pdf).
   The production differentiates character opacity/silhouette coherence
   from pastel markings and uses a dual system of internal/attached
   sketch strokes and breaking up silhouette edges. It also uses
   per-shot occlusion in environment processing and keeps detail focal.
   **Implication:** detailed brush-like texture must not destroy the
   volume/occlusion of characters; stylized lines and blocking are
   two different jobs. This is a transfer of craft principles, not
   a reproduction of their proprietary shader or assets.
3. **Pelikan**, [Teaching Art in Practice: Wax crayons, pp. 42–43](https://www.pelikan.com/images/PelikanMX/Descargables/teaching-art-in-practice.pdf).
   The teaching manual distinguishes opaque figures and vehicles
   from lightly rubbed backgrounds and demonstrates dark-on-light
   layered drawing. **Implication:** give foreground silhouettes
   dense blocking pigment; keep atmospheric washes translucent.
4. **Marika Maijala**, [artist interview / city illustration](https://blog.picturebookmakers.com/post/marika-maijala).
   Loosely built streets and houses use visibly different mark densities
   and palette areas. **Implication:** enrich varied architectural
   surfaces rather than stamping the same grain everywhere.
5. **Philadelphia Museum of Art**, [Descriptive Terminology for Art on Paper](https://legacyweb.philamuseum.org/doc_downloads/conservation/DescriptiveTerminologyforArtonPaper.pdf).
   Wax crayon deposits may clump or lift, with wax binder contributing
   visible cohesion and lustre. **Implication:** a completely flat digital
   fill is not sufficient; mark-pressure/scumble/scrape relief should
   still be visible after opaque underpainting.

## Verified weaknesses in the prior implementation

- The default `WaxRegion` set its silhouette base alpha to
  `construction.glaze ?? 0.58`, plus modest partly transparent
  stroke overlays. Background hills, window lines and characters behind
  a subject therefore **showed through finished torsos and heads**.
- The entire fill, including its colored base, went through a porous
  mask designed for highlight wax, incorrectly making paper holes
  transparent through the entire character.
- All objects largely used horizontal hatch strokes regardless of
  anatomy, with occasional generic vector-like silhouettes.
- `Crayon Storybook` and `Crayon Scene Engine` were separate sibling
  Storybook nodes rather than one discoverable film-look family.
- The previous automated tests checked SVG structure and timelines,
  but had no physically meaningful comparison against a
  high-contrast background behind an opaque character.

## Implemented material and authoring rules

**Two distinct coverage modes, opt-in and backwards compatible:**

- `coverage:"open"`: legacy translucent glaze and tooth-masked
  strokes; suitable for sky, far hills, atmospheric wax, reflected light.
- `coverage:"opaque"`: full-opacity silhouette underpaint, clipped
  to a progressively drawn pigment window, with textured colored wax
  and directional scumble applied **above** it. The paper-tooth mask
  only affects decorative strokes, never the backing pigmentation.

The unmodified `WaxRegion` default remains `open` so pre-existing
portable FilmDocuments, client recipes and artwork keep their authored
appearance; scene validator explicitly rejects any unknown coverage
value. Character and foreground fixture factories now choose `opaque`
intentionally. Scene exports, drag/walk rigs and pose redraws still
evaluate by absolute frame, so seeking backwards is deterministic.

**Directional craft:** selectively rotate wax hatch strokes to align
with a wing membrane, curved neck, tail, long ears, limbs and roof.
This does not create a physics-based wax shader. Pressure-dependent
scumble density and tooth remain present so opaque layers are not
flat vector paint.

**Storybook discovery:** Both existing story metas are grouped under
`Video production / Film Looks / Crayon`, now joined by
`Material Studies` with an **open vs opaque** comparison over striped
colored paper. Existing explicit Storybook IDs are unchanged, so
previous URLs should continue to work.

## Testing and known limitations

- Unit tests cover clipping versus tooth mask order, animated
  progressive fill, reduced motion, deterministic rendering,
  real scene coverage and invalid schema values.
- Browser tests verify Storybook's actual `index.json` hierarchy,
  render the comparison in two contrasting palettes and sample
  the creature's interior pixels. Finished opaque color should be
  virtually invariant when background stripes change.
- Existing smoke and rig tests continue across landscape/portrait,
  acting, construction, locomotion and dragon architecture.

**Still missing:** continuous physical wax deposition across
redrawn exposures, image-sourced wax-stroke atlases with redistribution
rights, genuine per-stroke nib tracking, local material-aware specular
response, expressive character deformation beyond affine joints,
more advanced cloth/fur/skin occlusion and complete encoded
normal-speed full-film artistic acceptance.

Do not copy other artists' designs or redistribute their imagery.
The examples and illustration paths in this repository remain original.
