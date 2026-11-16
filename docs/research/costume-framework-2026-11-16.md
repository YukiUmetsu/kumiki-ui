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
