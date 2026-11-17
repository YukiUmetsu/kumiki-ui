# Skin texture by region (ANAT1) — research, 2026-11-16

The owner asked for skin texture studied region by region from real reference images, because human skin is not all
smooth. `skin-texture.ts` gives each region its microrelief, pores, wrinkles and folds by age. The portrait uses it,
and a swatch renderer shows each region at macro scale.

Grades:
- **reported:** quoted from the source;
- **measured:** from photographs or data in the repository;
- **estimated:** chosen within what the sources support, then checked against the reference photographs.

## What skin's surface is made of

| What | Value | Grade | Source |
| --- | --- | --- | --- |
| The microrelief | polygonal plateaus, mainly triangles or quadrangles, bounded by furrows; patterns peculiar to each region | reported | Corcuff et al. 1987; [review, PMC9838641](https://pmc.ncbi.nlm.nih.gov/articles/PMC9838641) |
| Furrow depth | primary lines about 30–100 µm, the only ones visible to the naked eye; secondary lines 5–40 µm, narrower | reported | Review, PMC9838641 |
| With age | primary lines deeper, fewer; secondary lines fewer | reported | Same review; [forearm replica image analysis](https://library.scconline.org/v038n03/2); Skin Visiometer study, *Arch Dermatol Res* 2000 |
| Crow's-feet area | surface roughness steady until the thirties, then rising with furrow depth | reported | Replica study (J Soc Cosmet Chem) |
| Cheek pores | 10–80 per cm², 0.03–0.22 mm² (by ethnic group), 1–16% of the skin, 2,585 women | reported | [Flament et al. 2015, *Clin Cosmet Investig Dermatol* 8:85](https://www.dovepress.com/facial-skin-pores-a-multiethnic-study-peer-reviewed-fulltext-article-CCID) |
| Pores by site | larger and more visible on the nose and forehead than the cheeks; more with age | reported | [Jung et al. 2018, *Skin Res Technol*](https://pubmed.ncbi.nlm.nih.gov/29393550/) |
| Vellus hairs | 439/cm² forehead, 85/cm² back | reported | Blume et al. 1991, *Br J Dermatol* |
| Follicle density | highest on the forehead, lowest on the calf | reported | Otberg et al. 2004, *J Invest Dermatol* 122:14 |
| Papillary ridges | about 0.45–0.5 mm apart | estimated | Usual adult ridge breadth |
| Each region's numbers | network spacing 0.3–0.65 mm; depths 13–75 µm; fold spacings; sheen; redness | estimated | Within the above; checked against the CC0 photographs on the Reference board (skin) |

## How it is built (`skinSurface`)

The microrelief:
- **Primary lines:** three families of grooves about 60° apart (one stronger where the skin is anisotropic: lids,
  neck, upper lip, knuckles). Each groove is long and nearly straight, wanders a little, comes and goes along its
  length, and has its own strength.
- **Secondary lines:** three finer, shallower families, broken into shorter runs.
- **Plateaus:** domed between the furrows, so each catches the light.
- **With age:** cells grow by up to 35%; the primaries deepen and widen while the secondaries fade.

Built this way, the grooves cross into triangles and rhombi, as in the reference close-up.

Pores are pits on a jittered grid at the region's density, a little oval, dark at the opening, with a soft rim.

Wrinkles are irregular grooves in their region's direction, with shorter branches, deepening with age. Palms and
knuckles have their creases from birth.

Fingertip and palm ridges are about 0.1 mm high. A noisy phase makes them end and fork, as minutiae do. The fingertip
ridges run in a loop.

`faceWrinkles` adds the face's age lines, in face coordinates:
- forehead lines;
- the "11" between the brows;
- crow's feet;
- lines under the eyes;
- asymmetric nasolabial folds (the cheek overhanging) and marionette lines;
- neck lines.

`ageSpotsAt` and `frecklesAt` add pigment.

Detail finer than about two pixels fades out (pores down to about one pixel), so the same skin is clean in a
portrait and textured in a close-up.

## What changed in review

| Defect | Cause | Fix |
| --- | --- | --- |
| Reptile or dried-mud polygons | Voronoi cell edges: every furrow ends at a junction | Crossing groove families, as real primary and secondary lines run |
| Long faint scratches, router-cut wrinkles | Lines too long, straight and even | Shorter, wandering runs; branches; uneven depth |
| Young skin blank, old skin soft | The subsurface blur removed the relief | Part of the light is scattered near the surface (40% unblurred); a sheen on domed plateaus; darker furrows |
| A crackle-glaze web in close-ups | Detail faded by the supersampled pixel, then averaged | Fade by the final pixel |
| A bright crescent beside the nose | The face's folds were sampled in the skin's own coordinates, which switch to side view where the surface turns; a bulge lightened the skin | Folds in face coordinates; only creases darken |
| All regions alike | The same network depth everywhere | Thick, oily nose and forehead skin: pores dominate; crêpe on lids and neck; region directions fixed |
| Neck lines vertical | The network's angle convention was the opposite of the wrinkles' | One convention: 0 = across |

## Limits

- The microrelief bends normals and colour; it does not change the silhouette.
- Age changes the skin only. The face's shape (fat loss, jowls, thinner lips) does not age yet.
- Vellus hair shows only in swatches.
- Agent review only; no human visual review yet. Not an approved realistic portrait (AGENTS.md rule 14).
