# COSTUME1 — clothing and costume framework, found by tags

**Registry item:** `costume` (needs `art-foundations`) · **Files:** `registry/costume/costume-*.ts(x)` ·
**Storybook:** Video production → Art Foundations → Clothing and Costume (Sheet, Costume finder) · **Skill:**
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

## Known limits

- **The silhouettes are constructions, not patterns:**
  - front view only (the bustle's shape is at the back);
  - estimated from descriptions;
  - no fabric folds or prints.
- **The records are a first round.** Periods marked estimated need checking against dated museum objects;
  regional and class variants (Edo merchants versus samurai, Ming versus Tang hanfu) are tags and notes, not
  separate shapes yet.
- **Colours in the sheet are placeholders,** except where the description fixes them (white togas and thawbs,
  black abayas).
