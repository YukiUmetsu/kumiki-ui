# Eighteen watercolor-master references — craftsmanship translation (WM4)

**Inspected:** 2026-11-14  
**Requested source:** [Fuumuui, *18 Famous Watercolor Paintings & Artists*](https://fuumuui.com/blogs/art/18-famous-watercolor-paintings-and-artists) (2025-11-27).  
**Scope clarification:** 18 **listed works**, spanning **12 distinct artists**.
**Purpose:** extract individual craft principles into an original, reusable
animated watercolor system; the gallery is a study guide, **not an instruction
to trace, copy or redistribute museum paintings**.

## Source-quality audit

The article is useful as a teaching shortlist, but **not authoritative on
every work's physical medium**:

- Thomas Moran's *The Grand Canyon of the Yellowstone* (1872) is **oil on
  canvas**, per the [U.S. Department of the Interior](https://www.doi.gov/interiormuseum/highlights-thomas-moran-big-picture).
  Use its depth and geologic rhythm for *composition* only; do not present
  it as an example of watercolor fluid mechanics.
- Winslow Homer's final *The Gulf Stream* (1899) is **oil on canvas**,
  per the [Met's museum catalog](https://www.metmuseum.org/art/collection/search/11122).
  His preliminary watercolor work and separate watercolors remain
  technique references; do not relabel the oil as a watercolor.
- William Blake's *Ancient of Days* is a **hand-colored relief etching** with
  watercolor/gouache components, not a pure single-pass wash;
  see the [Met's William Blake exhibition](https://www.metmuseum.org/exhibitions/listings/2001/william-blake).
- The blog itself flags that its embedded Thomas Girtin image is **not the
  Tate original**. Prefer the
  [Paul Mellon Centre's catalog entry](https://www.thomasgirtin.com/collection/catalogue/chelsea-reach-looking-towards-battersea-the-white-house-chelsea)
  or [Tate's listing](https://shop.tate.org.uk/girtin-the-white-house-at-chelsea/thogir1501.html).
- O'Keeffe's *Evening Star No. III* is still under the museum's rights
  statement. Technique can be studied; its image cannot be redistributed
  in our npm pack.
- None of the artwork images in this study were copied into the repository.
  Re-rendering an *original* composition from general medium principles is
  a different task from copying a recognizable painting.

## Eighteen individual visual lessons

| # | Original work / artist | What to learn | Kumiki engine response / remaining fidelity work |
| --- | --- | --- | --- |
| 1 | Dürer — *Young Hare* (1502) | Fur families follow anatomical direction; highlights are **individual hair shafts**, not random raster noise | WM1 fine bristle groups and WM3 fur/feather material per body part; future strand-flow maps and proportion study |
| 2 | Dürer — *Great Piece of Turf* (1503) | Species-specific leaf shape, seed-head anatomy, overlapping stalks, observation-first botanical draftsmanship | **Implemented:** original `BotanicalArt` with layered stems, leaves, seed structures, overdrawn fine curves and seed-stable natural variation; future species-accurate botanical library |
| 3 | Blake — *The Ancient of Days* (1794) | Controlled theatrical light, etched definition and translucent luminous halo; mixed-media provenance matters | WM2 fine outlines, WM4 localized warm pigment, protected white paper; future radiating glow composition with authored negative space |
| 4 | van Dyck — *English Landscape* (1630s) | Restrained earth tone, distance compressed by lightness, broad grouped shadows | WM2 layered silhouette depth; WM4 neighboring wash transport; needs measured aerial perspective and warm/cool calibration |
| 5 | Turner — *Blue Rigi, Sunrise* (1842) | Mist can be almost the paper itself; light expands through low-contrast atmospheric washes | **Implemented:** estuary foreground/middle/background layers, amber–blue shared wet pigments, unpainted sun; still needs finer seamless wet boundary |
| 6 | Turner — *Burning of the Houses of Lords and Commons* (1835) | Unstable warm light against cooler darkness; narrative through water-driven contrast | WM4 wet neighboring pigments and complementary color; future heat-light direction and organic drop reactivation |
| 7 | Constable — *Stonehenge* (1835) | Varied cloud-scale marks and weather-driven tonal organization | WM2 shape-based soft cloud wash; future directional storm texture, turbulence without artificial repetitive noise |
| 8 | Girtin — *The White House at Chelsea* (1800) | Limited color ranges and **paper reserves** clarify the tiny bright architecture within a large landscape | **Implemented:** WM4 `reservePaths`; source image corrected via Tate catalog; future topology-aware mask-edge pigment displacement |
| 9 | Moran — *Grand Canyon of the Yellowstone* (1872, oil) | Geographic depth, warm canyon strata, tiny scale figures | **Composition reference only**; future contour-safe stratigraphy and atmospheric perspective; not a watercolor-medium exemplar |
| 10 | van Gogh — *Fishing Boats on the Beach at Saintes-Maries* (1888) | Transparent color next to confident expressive ink line, structural boat geometry | **Implemented:** separate unfiltered contour linework over WM4 pigments, estuary boat with rigging; further dynamic brush ink loading needed |
| 11 | Homer — *The Blue Boat* (1892) | Silhouette, water reflection rhythm and bright sunlit pockets | **Implemented:** layered coastal strokes and irregular fine ripples; future true moving water / reflected-object coupling |
| 12 | Homer — *The Gulf Stream* (1899, oil) | Large-value grouping, wave diagonals, human narrative stakes | **Composition reference only**; future film scene choreography and detailed rigged water interaction |
| 13 | Cézanne — *Still-Life with a Watermelon and Pomegranates* (1900–06) | Transparent constructive color patches, graphite structure, untouched white and visible observation | WM2 path-based form, WM4 shared colored glazes and reserves; future volumetric color planes and mixed-scale dry marks |
| 14 | Sargent — *Gondoliers’ Siesta* (1904) | Economy of confident brushwork, purposeful shape economy, directional edges | WM1 pressure/speed ribbon, WM2 wash gesture; future wide-side-brush turns, pressure accents and intentional incompleteness |
| 15 | Sargent — *White Ships* (c. 1908) | White paper **is** intense sunlight; masks are not white paint daubs | **Implemented:** unpainted sun and broken reflections through WM4 `reservePaths`; next: negative-space planning tied to subject geometry |
| 16 | Klee — *Hammamet with Its Mosque* (1914) | Luminous geometric color planes and surprising value pairings | **Implemented:** courtyard architectural value groups with warm/cool translucent pigment and masked windows; future irregular dry-edged planar glazing |
| 17 | O’Keeffe — *Evening Star No. III* (1917) | Small vivid focal color against expansive abstract atmosphere | WM4 adjacent, individually timed colors with sparse background; future expressive gestural edges, no copied motifs |
| 18 | Hopper — *The Mansard Roof* (1923) | Believable roof structure, crisp cast shadows and selective paper-soft transitions | **Implemented:** original courtyard house with roof silhouette, dormer/window construction, directional cool shadows; future perspective-validated building meshes |

**Primary collection calibration:**

- [Albertina: Dürer's meticulous nature studies](https://www.albertina.at/site/assets/files/3587/presskit_duerer.pdf).
- [Brooklyn Museum: Sargent's watercolor surface and wax/scrape techniques](https://www.brooklynmuseum.org/exhibitions/sargent_watercolors).
- [Brooklyn: Sargent's *Santa Maria della Salute*](https://opencollection.brooklynmuseum.org/objects/20389) describes ruled perspective underdrawing versus loose wet foreground figures and actual scraped highlights.
- [The Met: Cézanne's *Still-Life*](https://www.metmuseum.org/art/collection/search/343735) highlights the luminous reserved paper forming a sugar bowl.
- [Georgia O'Keeffe Museum catalog: *Evening Star No. III*](https://access-ok.okeeffemuseum.org/object/8346/).
- [Whitney: Hopper's rooftop watercolor studies](https://whitney.org/media/53786).
- [Tate: Girtin's white-paper house](https://shop.tate.org.uk/girtin-the-white-house-at-chelsea/thogir1501.html).

## Three **original** executable composition studies

The goal is one versatile engine, not 18 individually hardcoded painting copies.

1. **Botanical / `botanical`:** wet evergreen/earth underpainting,
   close-observed fine stem families, asymmetric foliage and seed heads,
   foreground soil marks. Dürer inspired **craft method**, not copied layout.
2. **Estuary / `estuary`:** Turner + Homer + Sargent craft synthesis:
   broad atmosphere, distant ridges, small boat silhouette and rigging,
   broken reflections and truly untouched-paper sun; narrated-safe margins.
3. **Courtyard / `courtyard`:** Klee + Hopper + Cézanne principles:
   layered colored architecture, structured roof/windows, precise divisions,
   reserve highlights, graphite-like details, believable shadow mass.

**Runtime:**
- `src/video/watercolour-master-studies.tsx`: all original SVG detail,
  one common WM4 wet/pigment field with scene-specific deposits and reserves.
- `src/video/watercolour-master-studies.stories.tsx`: interactive
  `Video Production/Film Looks/Watercolour & Brush` three-chapter studio.
- `examples/film/watercolour-master-studies.film.json`: exactly
  42 s at 30 fps (3 × 420 frames), two-aspect FilmStage source.
- `tests/watercolour-master-studies.test.tsx`: preflight, SSR and film
  portability checks.

## Craft acceptance versus code completion

Current source-backed progress is NOT evidence of museum-quality appearance.
No literal copied artworks, no giant image textures, no single CSS watercolor
look filter, no opaque character silhouettes masquerading as delicate pigment.

**Next critical milestones:**

1. Human normal-speed review of both 42-second encoded exports plus material
   close-up evidence; fix cropped heads, soft foreground mistakes,
   faux-regular stippling, banding and mechanical stems.
2. Reconstruct *water-edge* dynamics: paper-fiber wick direction, masking-fluid
   edges, transparent-to-opaque granulation and density under refraction.
3. Upgrade biological fidelity: anatomy-specific leaves, roots, animals,
   human faces and articulated motion without transparent see-through bodies.
4. Add dynamic gaze, grounded multiple-character interaction, moving camera,
   SFX/score intent, longer scenes and narration-safe bilingual captions.
5. Benchmark production 1080p/4K; guarantee stable final dry holds,
   repeatable absolute seek and clean installer / partial Storybook export.
