# Editorial collage demo images — provenance

App-level demo assets for the **COLLAGE1 · From the archive** Storybook story and
`examples/film/editorial-collage-archive.film.json`. They are not part of the `editorial-collage` registry pack: consumers
supply and clear their own images. Each image is captioned on screen with what it is and when it was made.

| File | Source | Date | Rights | Changes |
| --- | --- | --- | --- | --- |
| `pocket-watch-cutout.webp` | The Metropolitan Museum of Art, *Pocket watch*, object 206812 — [collection page](https://www.metmuseum.org/art/collection/search/206812), image `SF1979_498_1_img1.jpg` | ca. 1900 | Public domain, Met Open Access (**CC0**), `isPublicDomain: true` via the Met Collection API | Subject cut out on-device (Apple Vision); the maker's signature and number on the dial retouched out (dial colour interpolated); cropped and resized to 743×1040 |
| `locomotive-1873-cutout.webp` | Library of Congress, *[Pennsylvania Railroad : Locomotive PRR 421]* — [item 2025169037](https://www.loc.gov/item/2025169037/) | 1873 | "No known restrictions on publication." (LOC rights advisory); published 1873, public domain | Subject cut out on-device (Apple Vision), cropped |
| `union-station-indianapolis.jpg` | Library of Congress, Detroit Publishing Co., *Union Station, Indianapolis, Ind.* — [item 2016803742](https://www.loc.gov/item/2016803742/) | between 1900 and 1906 | "No known restrictions on publication." (LOC); public domain | Glass-plate border and the photographer's caption cropped off |
| `greenwich-stereograph-1904.jpg` | Library of Congress, Keystone View Co., *Observatory, Greenwich, England* — [item 2019637858](https://www.loc.gov/item/2019637858/) | 1904 | "No known restrictions on publication." (LOC); public domain | 10 px trimmed from each edge |
| `the-sun-1883-11-19-p1.jpg` | *The Sun* (New York), 19 November 1883, page 1 — Library of Congress, Chronicling America, [page](https://www.loc.gov/resource/sn83030272/1883-11-19/ed-1/?sp=1) | 1883 | Public domain (1883 publication) | Region x 80, y 560, 1480×1480 of the 5439 px master via the LOC IIIF service, scaled to 1184 px. Highlight boxes come from the page's ALTO OCR word coordinates |

### Derived layers of the pocket watch (`pocket-watch-plate|minute|hour|seconds|cap|subcap|bow.webp`)

Cut from `pocket-watch-cutout.webp` by `scripts/collage/watch-parts.py` so the hands, caps and bow can move separately.
The plate is a **restoration, not the original photo**: the hands were removed and the dial under them reconstructed
(tick rings and the collet copied from symmetric angles, enamel interpolated). The subdial numeral "10", which the hour
hand hides in the photograph, and the "2" of "20", crossed by the seconds hand, were **re-typeset** from the dial's own
"0" plus a Newsreader (OFL 1.1) digit, so close inspection shows a slightly different "1" and "2". The museum's clear
display mount on the bow was retouched off. Same CC0 basis as the source image.

Retrieved 2026-11-14. The Library of Congress statement "No known restrictions on publication" means the Library is not
aware of copyright or other restrictions; all four LOC items predate 1927. Map coastlines in the same film are Natural
Earth (public domain); the relief texture on that map is generated and illustrative, not elevation data.
