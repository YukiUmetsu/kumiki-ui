# Ukiyo-e woodblock and emaki handscroll — reference study

**Prepared:** 2026-11-14 · **Roadmap:** [35 — material-native film styles](../35-material-native-film-styles-implementation-roadmap.md), [35A gallery](../35a-material-native-style-reference-gallery.md) (Ukiyo-e / handscroll row)
**Implementation:** `ukiyoe-handscroll` pack ([spec](../component-specs/ukiyoe-handscroll.md))

We studied these references for **technique only**. Kumiki reproduces no prints, compositions, characters, frames or text from them. Every figure, composition and story in the showcase is original.

## What was actually inspected

| Reference | What we looked at | Grade |
| --- | --- | --- |
| Lemo-Opuscar "Ukiyo-e" demo film ([page](https://lemomo-ai.github.io/lemo-opuscar/styles/ukiyoe/), [MP4](https://github.com/lemomo-ai/lemo-opuscar/releases/download/films/ukiyoe.mp4)) | Downloaded the 44 s MP4; inspected a 1 fps contact sheet (48 frames) and full-size stills at 3, 7, 12, 16, 21, 26, 31, 36 and 41 s. **Not watched at normal speed.** | B (peer demo, AI-assisted) |
| Hiroshige, *Sudden Shower over Shin-Ōhashi Bridge and Atake* (1857), public domain, [Wikimedia](https://commons.wikimedia.org/wiki/File:Hiroshige,_Sudden_shower_over_Shin-%C5%8Chashi_bridge_and_Atake,_1857.jpg) | Full-image still | A (primary artwork) |
| Hokusai, *Under the Wave off Kanagawa* (c. 1831), public domain, [Wikimedia](https://commons.wikimedia.org/wiki/File:Tsunami_by_hokusai_19th_century.jpg) | Full-image still | A |
| Hiroshige, *Fireworks at Ryōgoku* (1858), public domain, [Wikimedia](https://commons.wikimedia.org/wiki/File:Fireworks_at_Ryogoku_(Ryogoku_Hanabi),_No._98_from_One_Hundred_Famous_Views_of_Edo.jpg) | Full-image still | A |
| *Ban Dainagon Ekotoba* emaki (12th c.), detail, public domain, [Wikimedia](https://commons.wikimedia.org/wiki/File:Ban_Dainagon_Ekotoba_-_Crowd_and_a_gate.jpg) | Detail still | A |
| [Asian Art Museum — the ukiyo-e woodblock printing process](https://education.asianart.org/resources/the-ukiyo-e-woodblock-printing-process/) | Read: key block first, one block per colour, kentō registration, baren rubbing | A (museum education) |
| [Fitzwilliam Museum Yoshitoshi glossary](https://yoshitoshi.fitzmuseum.cam.ac.uk/glossary/) | Read: bokashi, atenashi bokashi, itame mokuhan, karazuri, kirazuri, kentō, formats | A |
| [Rōnin Gallery — how to make a woodblock print](https://www.roningallery.com/how-to-make-a-woodblock-print) | Read: printing order light → dark | B (dealer) |
| [Harvard — McCormick 2019, Genji paintings](https://scholar.harvard.edu/sites/scholar.harvard.edu/files/melissamccormick/files/mccormick_2019_genji_paintings_kuruma_arasoi.pdf), [Wikipedia: fukinuki yatai](https://en.wikipedia.org/wiki/Fukinuki_yatai) | Read summaries: blown-off roof interiors, suyari-gasumi mist bands as scene/time dividers | A / C |
| Takahata, *Animation in the 12th Century* (via [Pixivision](https://www.pixivision.net/en/a/1303), [Nausicaa.net](https://nausicaa.net/wiki/12th_Century_Animation)) | Read secondary summaries: unrolling a scroll is a camera move, continuous narration shows time passing | C (secondary) |
| [Motionographer — ANNY "Ukiyo-e" (2008)](https://motionographer.com/2008/07/02/anny-ukiyo-e) | Read the review: ukiyo-e look plus suibokuga negative space plus buyō movement; the reviewer found the camera jumpy | C |

## Observations that changed the engine

1. **Flat colour is not flat.** In the Ryōgoku print the night sky shows horizontal wood grain and blotchy baren pressure. Large fields need **itame grain** and **mottle**, not clean vector fills. → `print.grain` and `print.mottle`. Mottle is clipped to each layer's own ink.
2. **Order of impressions.** Printers lay the key block first, then colours from light to dark. → Every colour fill is assigned to one of 8 impressions by lightness. `printIn` reveals impressions in that order with a baren sweep, and the Printer's proof story pulls a proof at any impression.
3. **Registration is fixed per block.** Misregistration is a constant offset of each colour block against the key line, not jitter. → One seeded offset per impression (`print.registration`).
4. **Bokashi** is a hand-wiped gradient: a hard ichimonji band of Prussian blue at the top of the sky, and a beni glow at the horizon (Hiroshige). → The `sky` motif uses `band` and `horizon`; water gets a deep band at an absolute depth below the horizon (`deepAt`).
5. **Rain is two families of long, fine, straight lines** at slightly different angles across the whole picture, including over the figures (Sudden Shower). → The `rain` particle type.
6. **The great wave** reads through its silhouette (a long back, a curl that overhangs forward), **bands of lighter water parallel to the back**, a white crest, and **claw-like foam fingers reaching forward**, with spray like snow. → The `wave` motif: rise via `progress`, `breakAt` collapse, and the claws swept toward the direction of travel.
7. **Snow-capped peaks** carry drip tongues hanging below the snow line. → The `mountain` motif with `snow` and `tongues`.
8. **Emaki grammar:** gold or white **suyari-gasumi** bands cut across the picture and divide scenes and time; interiors are seen from above with the roof removed (**fukinuki yatai**); one figure appears several times as the scroll unrolls (continuous narration); the reader unrolls right → left. → The `cloud` band motif, the `house` `roof: "cutaway"`, the right → left `scrollPan` with stations, and the `UkiyoeKasumi` transition.
9. **Lemo demo critique.** Strong stills, but the figures are small, stiff and rarely act; most of the animation is camera and weather. Text cartouches sit on top of the picture. → Kumiki puts its effort into articulated, costumed, acting figures that share one wind field. Cartouches are part of the print (vertical CJK with the Latin title set sideways).
10. **Figures in prints** are dominated by the robe silhouette and hanging sleeves, with pale faces in thin line. Women's hems trail with a coloured under-layer at the edge. → The figure rig draws sleeves as hanging panels that slide down a raised arm, with trailing hems, a hem band in the under-robe colour, and fold lines from the obi.

## Not yet matched (honest gaps)

- No true **karazuri** blind embossing depth or **kirazuri** mica sparkle beyond a light emboss filter.
- Faces are a single profile design per hairstyle. There are no three-quarter turns or expressive brow and eye shapes yet.
- The wave's claws are procedural and less intricate than a master carver's.
- No soundtrack yet (shakuhachi and koto beds, rain and surf foley).
- Human normal-speed review of the film has **not** been recorded.
