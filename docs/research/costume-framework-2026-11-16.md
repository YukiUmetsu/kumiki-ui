# Clothing and costume framework (COSTUME1) — research, 2026-11-16

The owner asked for clothing and costume "not just by period but also world area or country … more like a tag
system". This note records how the tags were chosen and where each value comes from.

## Tags

- **Place.**
  - The UN Statistics Division's M49 regions are a stable, neutral tree (world → continent → sub-region), so a query
    for a region finds everything inside it.
  - Countries use ISO 3166-1 alpha-2.
  - Cultures are free tags for peoples across borders (Asante, Yoruba, Inuit, Han Chinese, Korean).
- **Time.** Garments carry year ranges (CE; negative for BCE; open-ended while still worn). Named eras by place
  (Heian 794–1185, Edo 1603–1868, Joseon 1392–1897, Ming 1368–1644, Victorian 1837–1901 …) turn into a year range
  plus a place.
- **Wearer and use.** Worn by women, men or all, roles, and occasions. These are as the source states them; the
  library does not prescribe who may wear what.
- **Making.** Slot on the body, cut, fabrics, climate.

## Sources

| What | Source | Grade |
| --- | --- | --- |
| Descriptions | Wikipedia article summaries for 80 garments, fetched through the REST summary API on 2026-11-16 and condensed. Redirects were followed and the article that answered is the one linked: Kamishimo → Hakama, Kariginu → Jōe, Cotehardie → Kirtle, Sugegasa → Kasa. Magua returned an unrelated article and was dropped. | reported |
| Periods stated in an article | Sokutai from the Heian period; jūnihitoe first worn in the Heian period; tabi from the 15th century; gat in the Joseon period; Hanfu to the mid-17th century; Zhongshan suit after 1912; ruff mid-16th to mid-17th century; farthingale from 15th-century Spain; robe à la française in the 18th century; frock coat 1830s–1910s; kilt (great kilt 16th century, small kilt 18th); kokoshnik since the 10th century; sherwani 19th century; zoot suit 1940s; riveted jeans 1873 | reported |
| Other periods | Estimated, with a note on the record | estimated |
| Regions | UN M49 | reported |
| Silhouettes | Estimated from the descriptions, on ANAT1's measured person (man, 25) | estimated |

## What the renders changed

- **Details.** All details were first drawn white, so the Heian trains and kamishimo wings vanished into white
  blots. They now take the garment's colour; ruffs keep white trim.
- **Bands.** The obi disappeared into a kimono of the same colour. Obi, sashes and braces now take a contrasting
  band colour.
- **Trousers.** Leg outlines showed through robes (agbada) because legs and body shared one path. Legs are now
  their own layer under the body.
- **Europe.** Garments tagged for the whole of Europe fell outside every sub-region row of the matrix; they now
  have their own row.

## Next

- Side and back views (bustle, train, obi knots, hair).
- Class and occasion variants as shapes.
- Dated museum objects (Met and Rijksmuseum CC0) per record, to replace estimated periods.
- Textiles in MATL1 (silk, cotton, hemp, wool, linen) linked from `fabrics`.
- Accessories (hair ornaments, jewellery, weapons) and armour.
- Hooking `findOutfits` into the scene builders of each style pack.

## Round two: drape and detail (2026-11-16)

The owner said clothes still lacked detail and asked for more physics and more real images.

**References studied** (public domain or CC0, Wikimedia Commons):
- **Kusakabe Kimbei**, *Seated Woman* and a standing woman in kimono, hand-coloured photographs. They show:
  - the white under-collar inside the collar, crossed in a "y";
  - obiage and obijime on the obi;
  - lining at the sleeve openings;
  - long hanging sleeves;
  - scattered motifs.
- **A Meiji portrait of Konoe Tadafusa:** striped hakama with deep pleats, a haori with its himo loop and crests.
- **Kilt portraits:** Robert Lister Macneil (Library of Congress) and Alderman William Grant Clark (1908, State
  Library of Queensland). They show tartan, the flat apron and the sporran.
- **Drapery studies:** Leonardo's drapery for a seated figure, a sleeve study for the Annunciation, and a study for
  the Salvator Mundi; Dürer's *Study of Drapery*; Sargent's *Study of Drapery* (NGA, CC0). They show:
  - pipe folds from supports;
  - broad and narrow folds by cloth;
  - nested folds where cloth is held.

**Reported.**
- Peirce (1930), via Cassidy's review of fabric drape measurement: bending length over about 50 fabrics, 1.81 cm
  (soft) to 6.35 cm (stiff), and 1.6–8.5 cm with other overhangs. Lower bending length means softer cloth.
- From the same review: on Cusick's drape tester the folds are counted as nodes; denser, stiffer cloth makes fewer
  nodes and a higher drape coefficient.
- Leonardo, *Treatise on Painting* (Rigaud's translation), ch. 143: folds wrap round the parts they cover and gather
  where the limbs gather the cloth; heavy wool makes broad folds, thinner cloth narrower ones.
- Wikipedia, Hakama: "seven deep pleats, two on the back and five on the front … two to the right, three to the left";
  umanori and andon "appear similar".
- Wikipedia, Kimono: always worn left over right, except when dressing the dead. Sari, toga and kente: draped over
  the left shoulder.

**Estimated.**
- The bending length of each fabric, placed in Peirce's range by weight and weave.
- The fold spacing of four bending lengths, from the Cusick test's sizes: about six nodes round 75 cm for a middling
  fabric.
- The fold depth from extra cloth.
- Sleeve lengths and collar widths.

**Corrected from the first round.**
- The crossed collar ran right over left, the way the dead are dressed.
- Drapes hung over the wrong shoulder.

**What the renders changed.** Each change was checked on a review page of 18 garments and 12 outfits at 1× and 3×:
- Even, uniform fold shadows read as accordion pleats; fold depths now vary.
- Crinolines folded like tents; hoops now hold the cloth out in a few broad folds with a nearly round hem.
- Kimono sleeves were balloons; they are now hanging rectangles with lining at the opening.
- Hakama were two balloon trousers; they are now one wide pleated skirt, as the Meiji photograph shows.
- The jūnihitoe's layered edges sat in the wrong place; they now show at the neck and sleeve openings.
- The under-collar lay beside the collar instead of inside it; the obi was pill-shaped; the obiage was white.
- A separate obi garment drew a fringed skirt below its band; waist pieces are now bands only.
- Drapes were translucent bubbles; they are now opaque, lit, and casting a shadow, with folds along the cloth.
- Trouser legs and long sleeves ballooned; they now hang straight and taper like arms.

No owner review yet.
