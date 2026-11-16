# COSTUME1 — clothing and costume framework, found by tags

**Registry item:** `costume` (needs `art-foundations`) · **Files:** `registry/costume/costume-*.ts(x)` ·
**Storybook:** Video production → Art Foundations → Clothing and Costume (Sheet, Costume finder, Drape and details) · **Skill:**
[kumiki-costume](../../skills/kumiki-costume/SKILL.md) · **Research:**
[costume framework, 2026-11-16](../research/costume-framework-2026-11-16.md)

COSTUME1 holds what people wore across the world and through time. You find it by **tags** that combine, not only
by period:

- **Where:** a UN M49 region (a tree, so "asia" finds Japan and India), ISO 3166 countries and cultures.
- **When:** a year range and named eras (Heian, Edo, Joseon, Ming, Victorian and others).
- **Who:** worn by women, men or all; roles (court, warrior, scholar, farmer and others).
- **What for:** occasions (everyday, formal, court, wedding, festival, work, religious and others).
- **On the body and how it is made:** slot (full, upper, lower, outer, waist, head, feet, under, draped), cut
  (straight-cut, wrapped, draped, tailored, tunic, tube, cloak, structure), fabrics and climate.

## What it is for

- **Dressing a person for a place and a time.**
  - `findOutfits("region:eastern-asia year:1780 worn:women")` gives whole outfits.
  - `findGarments("country:KR era:joseon")` gives single garments.
  - `outfitGarments(o)` lists an outfit's garments in wearing order.
- **Browsing.** `WorldTimeMatrix` lays out regions by period; `facetCounts` and `garmentTags` drive filters.
- **Drawing.** `garmentShape(g)` gives a front-view construction on ANAT1's measured person. It has a body piece,
  sleeves of the right kind, trousers, and bands (obi, sashes), drapes and hats, to paint over in any style. Each
  garment's `drawing` notes say what to get right: left over right, where the drape falls, what the structure
  does.
- **Re-using.** `styles` says where the library already draws a garment (UKIYO1's `ukiyoeWardrobe(role)` and
  `ukiyoe-heian`).

## Data (registry/costume/costume-data.ts)

| Table | Holds |
| --- | --- |
| `REGIONS` | UN M49 regions and sub-regions |
| `ERAS` | Named periods by place with years |
| `GARMENTS` | 74 garments across East, South and South-east Asia, Western Asia, North and Sub-Saharan Africa, Europe, the Americas and Oceania. Each has its local name, tags, a period (reported when the article states it, otherwise estimated with a note), a description condensed from its Wikipedia article, drawing notes and a source link. |
| `OUTFITS` | 33 outfits for a place, year, wearer and occasion |

## Construction (registry/costume/costume-shapes.ts)

- Heights come from ANAT1 landmarks: neck, shoulder, bust, waist, hip, knee, ankle.
- A silhouette is a top and hem level, half-widths at the shoulder, waist and hem, a sleeve kind (cap, short,
  long, wide, square, hanging) and extras. Defaults follow slot and cut.
- About 70 garments carry their own: furisode sleeves hang to the knee, crinolines and panniers spread, the
  kamishimo has wings, a gat has a brim, a sari or toga drapes over the left shoulder.

## Drape and detail (registry/costume/costume-drape.ts, round two)

- **Folds come from the cloth.**
  - Each garment's first fabric gives a bending length (`FABRIC_BENDING`), placed within the range Peirce measured
    on about 50 fabrics: 1.81–6.35 cm, or 1.6–8.5 cm with other overhangs. The placements are estimated.
  - Folds hang about four bending lengths apart (`foldSpacing`; estimated from Cusick drape-test sizes). Silk
    therefore folds narrow and often, wool broader, denim, brocade and skins in few broad folds. This is Leonardo's
    rule in numbers (`FOLD_RULES`).
  - The depth comes from the extra cloth at the hem over its support: a gathered or flared hem folds deeply, a
    straight tube only softly.
- **`hangingFolds`.** Pipe folds hang from the support (obi, sash, waistband, else the bust) and spread to the hem.
  Their depths vary, and each fold's shadow lies on the side away from the light (upper left). The hem waves with
  the folds. Skirts held out by hoops (crinoline, farthingale, robe à la française) span the frame in a few broad
  folds.
- **Other folds.**
  - `swagFolds`: catenary swags across a draped cloth (a sari's pallu, a toga's sinus).
  - `elbowFolds`: zigzag folds at the elbow of a long sleeve.
  - Pipe folds fall in wide sleeves; folds gather at the bottom of a hanging sleeve.
- **Necklines** (`neckline`):
  - **crossed:** kimono family, hanbok, hanfu, deel. Always left over right: the top panel's collar runs from the
    viewer's right of the neck down to the left, a "y". The first round drew it the other way, which is how the dead
    are dressed. Women's kimono show the white under-collar inside it.
  - **mandarin:** a standing collar, with the flap to the wearer's right underarm and knot buttons.
  - **lapel:** notched lapels with a shirt and tie, buttons (double-breasted for the frock coat) and pockets.
  - **placket:** a slit and buttons.
  - **round** and **square:** a low square neck shows a white chemise, laced on a dirndl.
- **Drapes** go over the wearer's left shoulder (the viewer's right), leaving the right arm free, as the sari, toga
  and kente articles describe. The first round had them on the right.
- **Signatures.**
  - **Women's kimono:** obiage and obijime on the obi, as in Kusakabe Kimbei's photographs, and lining showing at
    the sleeve openings and hem.
  - **Kimono-family sleeves:** long rectangles hanging to the hip, or to the knee on a furisode.
  - **Hakama:** read from the front as one wide skirt, with five front pleats, two on the wearer's right and three on
    the left (reported, Wikipedia), and a waist tie.
  - **Haori:** the himo loop and crests.
  - **Jūnihitoe:** layered edges (kasane) at the neck and sleeve openings.
  - **Hanbok:** the goreum bow.
  - **Kilt:** a flat front apron with its fringed edge and pin.
  - **Sari:** front pleats.
- **Patterns** (`pattern`): tartan (kilt), fine stripes (hakama), kente strips, scattered dyed motifs (kimono,
  furisode, kosode, yukata).
- **`CostumeFigure`** paints each garment:
  - filled, patterned, and shaded round the body;
  - then fold shadows and ridges, linings, collars, bands, cords, pleats and buttons;
  - drapes lie over the body with a soft shadow below them.

## Known limits

- **The silhouettes are constructions, not patterns:**
  - front view only (the bustle's shape is at the back);
  - estimated from descriptions.
- **Folds are a construction for painting**, set by bending length and fullness, not a cloth simulation:
  - patterns lie flat and do not follow the folds;
  - the fold spacing factor and the per-fabric bending lengths are estimated within Peirce's reported range.
- **The records are a first round.** Periods marked estimated need checking against dated museum objects;
  regional and class variants (Edo merchants versus samurai, Ming versus Tang hanfu) are tags and notes, not
  separate shapes yet.
- **Colours in the sheet are placeholders,** except where the description fixes them (white togas and thawbs,
  black abayas).
