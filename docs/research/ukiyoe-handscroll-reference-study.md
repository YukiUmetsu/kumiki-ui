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

## Great-wave pass (owner feedback, 2026-11-14)

The owner asked for the wave and Fuji to look like Hokusai's *Under the Wave off Kanagawa*. We inspected the 3840 px public-domain scan ([Wikimedia](https://commons.wikimedia.org/wiki/File:Tsunami_by_hokusai_19th_century.jpg)) at crest, Fuji and foreground crops:

- **The wave is mostly white.** The back is a broad white foam mass edged by a single fine indigo line. Only the inner face of the curl is deep Prussian blue, carrying lighter-blue bands and irregular snow-like flecks.
- **Claws** are hooked white fingers outlined in indigo, layered in rows, with pale-blue shadow behind. They crown the crest, hang from the lip, and spill forward over the blue along the ridge.
- **Fuji** is a near-straight cone, mostly white snow, with blue rock "flames" rising from a dark base and a fine dark outline. The sky behind is paper with a grey bokashi deepening toward the horizon, and spray floats in front like snow.
- The composition echoes itself: a smaller wave in the foreground mirrors the main one.

Engine changes: the wave motif was rebuilt with that anatomy, `mountain` defaults to this Fuji, `sky` gained `style: "horizon"`, and the karazuri emboss became highlight-only so large white fills no longer grey. In the squall shot the wave now curls over the ferry with a small Fuji in the trough. This is a homage to a public-domain technique and look, not a tracing: the silhouettes are parametric and the composition is our own.

## Boats and foam pass (owner feedback, 2026-11-14)

The owner watched the film and reported four problems. Each was confirmed by tracking the boat's transform frame by frame before fixing it.

| Reported | Measured cause | Fix |
| --- | --- | --- |
| People walked in the air getting on and off the boats | The ferry was moored 300–500 px from the pier, and passengers walked a straight line across the gap | The ferry lies alongside the landing stage. Passengers walk the pier and step down via a waypoint. Nobody moves until the hull is at rest |
| The ferryman worked but the boat sometimes did not advance | Shots opened with a slow ease-in from rest (about 30 frames of no motion), and the boat sat still for 50 frames after the wave | Mid-crossing shots start at full speed; from rest the hull gathers way within the first push; a `surge` loop ties speed to each stroke |
| The wave did not affect the boat convincingly | The boat only rocked on a fixed loop next to the wave | The boat `ride`s the wave: drawn in, lifted and pitched up the face, held as the crest breaks, then carried back down. Largest per-frame step is now 6 px sideways, 8 px down and 1.4° of pitch (it was 14 px, 23 px and 5.7°) |
| The wave still did not look like the print | Foam was two rows of single hooks | Foam is now a lace of small hooked hands in layered tiers with indigo outlines and pale-blue shadow, cascading from the lip; flecks cluster on the lighter bands |

The print's own boats are the model for the squall: long hulls pitched steeply on the face under the claw of foam, with the crew crouched low. Ours carries its own cast and composition.

## Connected foam (owner feedback, 2026-11-14)

The owner pointed at a crop of the crest: **the foam is not layered**. Each small white claw is open at its root and joins the rest of the white; no white part is isolated, and the indigo line traces only the boundary between white and blue or sky. Our previous pass drew the foam as tiers of separately outlined claws stacked on each other, which read as layers of cut paper.

Fix: the crest band, every claw, and the boiling trough are one shape. The painting order (outline, blue face, foam outline, white back, foam white) lets each white cover the lines beneath it, so claws melt into the band and into the white back with no seam. Claws are spaced so blue and sky show between the fingers, which is what makes each claw legible in the print. Fingers are smooth tapering arcs, and one pale stroke sits inside each claw's curl.

## Wave detail pass (owner feedback, 2026-11-14)

The owner compared crops of the scan with our render and named the differences. Each was checked against the 3840 px scan before changing anything:

| Owner note | What the scan shows | Change |
| --- | --- | --- |
| The blue stripes are not straight; they curve with the wave | Thin medium-blue stripes run parallel to the column's front edge, bow back at mid-height and fan toward the trough; the dark bands between them are wider than the stripes | Stripes are offsets of the measured front edge with a fan and a bow; five thin stripes and thick navy between |
| The top of the wave has no small wave parts; it rolls in smooth, uneven bumps | The dome's top contour carries no claws, only soft irregular undulation | The dome's top is displaced by low-frequency noise; claws start only where the crest tips forward |
| Claws branch, and surfaces are bumpy, not smooth | Claw arms are irregular; some split into a second hook | Claw spines carry seeded turning irregularity; about a quarter branch at the claw's own scale |
| The overall shape and curve angle differ | Broad dome far back, crest overhanging into a long lip, near-vertical column | The silhouette was re-measured from the scan by overlaying our control points on it |
| Claws stretch forward and down, not upward; one claw at a time, spread out | Each claw is one arm rising forward, arcing over, hooking down and back; claws are staggered with pale between them | Claws point along the wave's travel, single arms on pale-blue ground, wider spacing |

### Smooth growth (owner feedback, 2026-11-14)

The owner saw the wave jump from small to medium to big. Per-frame measurement found three causes:
- The rise was eased twice: once by the scene's keys, and again inside the motif. That made a near-snap mid-rise (273 → 576 px tall in 12 frames).
- Claws were re-spaced every frame from the growing line, so the count changed on 45 of 170 frames and claws jumped up to 75 px.
- The wave was drawn on twos.

Now `progress` is used as given. Each row has a fixed claw count, taken once from the fully risen wave, and claws sit at fixed parameters along their lines. The wave is drawn on every frame. The stripes are copies of the column's front edge shifted horizontally: offsetting along the normal folded into zigzags when the wave was small or collapsing.

### Wave motion pass (owner request, 2026-11-14)

The owner asked for the wave's animation to be studied from real wave animation. Sources inspected frame by frame:

| Source | Rights | What it showed |
| --- | --- | --- |
| Segawa Atsuki's animated *Great Wave* GIF (2015, via Hyperallergic), 144 frames at 25 fps | Copyrighted: studied for timing only, not traced or redistributed | The wave **enters travelling** and rises as it advances; it never grows in place. Through the break the crest slides forward about a fifth to a third of the frame, lowering and flattening, claws tipping further forward and down; what is left becomes low foam hills that keep moving and settle. Timing about 2.4 s rise, 1.9 s break, 1.4 s settle. |
| *Plunging breaker* diagram animation, Wikimedia Commons (Mendax) | CC BY-SA 2.0 de: studied, not redistributed | A low swell **steepens** until the front is vertical before any lip forms; the **crest outruns the base** (each profile further forward); the lip is thrown out and falls in an arc, enclosing a tube about 0.3–0.4 of the height; the jet lands ahead of the face and a turbulent foam mass spreads forward. |
| *Breaking wave* (Wikipedia); Deike, Popinet and Melville, 3D simulations of deep-water breaking waves (arXiv 1410.1746) | Facts only | Spilling, plunging and collapsing types; after jet impact most energy goes into a whitewater roller that travels on and weakens. |

Before this pass the wave rose in place as a shrunken copy of the full great wave (a white slab over a vertical blue cliff when small), collapsed by squashing, with a flat white pancake at its foot, and then stayed at half height forever. The motif now follows the stages above:

- **Swell, then steepen, then curl.** A young swell is blue with a thin white cap and a front that slopes on a cosine from the crest to a far foot. The front stands up into the measured column as the wave steepens; the lace emerges from the band and grows with the curl; the dome's white spreads down the back as the column forms.
- **Travel.** `travel` (fraction of the width) moves the wave forward: half while rising, the rest through the break and the roll-on. `waveSurface` applies the same offset, so riders stay on the drawn water.
- **Throw, fall, impact.** At `breakAt` the crest leans forward (weighted by height cubed, so the column keeps its concave front), the lip is thrown out (decelerating) and falls (accelerating) onto the water ahead of the face. As it falls the lip thins to a curtain: its underside runs parallel to its outer edge, so the tube under it stays open to the sky. Where it lands a whitewater roller boils up: lumpy, clawed, joined to the one foam outline. Each roller claw has a fixed place on the water and grows as the roller reaches it, so foam spreads by appearing, never by sliding.
- **Settle.** After the break the tube collapses (the underside closes onto the column's foot), the roller rolls on and sinks, and the wave goes back to flat water (`settleTo`, default 0) over `settleDuration`, with the pale wash fading so the last foam reads white. A few weak foam bubbles then drift and pop on the water where it fell (owner note: no lingering wave at the end, some weak bubbles after the drop). They float just behind the waterline, so a scene's foreground sea never hides them.

The column's top (owner note, same day): in the print the blue column rises in a concave curve and bends forward into a pointed hook that tucks under the white lip. Ours stopped in a blunt corner, with a notch of sky between the blue and the foam. On the curled wave the contour from the crest down to the column now runs just inside the crest foam's lower edge, and the column ends in a slim hook under the lip. The hook draws back over the first 60% of the break, so its tip never pokes out past the thrown lip. The throw now starts from rest (a sine ease), so the break no longer jumps from the held peak to 14 px per frame in one frame.

The column follows the lip (owner note, same day): as the lip fell, the blue column stayed in place and only lost height, so it read as shrinking. Now, through the fall, the whole water mass pitches forward and down after the lip: every point moves forward in proportion to its height (up to 16% of the width at the crest), so the column, its stripes and the crest lean toward the impact. The pitch holds through the settle, so water never slides back. `waveSurface` shifts its own profile the same way, up to the top of the ridable face. Riders feel half of it, so a boat crossing the roller is not tipped hard (largest pitch step 2.47° per frame, within the 2.5° limit).

The blue follows the white (owner note, same day): near the white, the blue was still cut off mid-curl. A fixed hook drew back as the lip was thrown, and two folds left a wedge of sky between the blue and the foam. The first fold was in the foam band's inner edge, pulled up the curtain toward the crest. The second was in the blue outline, which ran back to the old column top. Now the blue is the inside of the curl: its top runs along the lip's underside, tucked under the white, and tapers to a point near the lip's tip, so it bends and moves with the white. As the lip falls the point slides back up the curtain, so the tube below stays an open, rounded hollow. The curtain forms from the tip end, so the underside beside the column stays at the column's top, and the outline from the crest always ends at the curl's root. Plotting the body and foam outlines found both folds.

The sea rises first, and the wave never stops (owner note, same day): the great wave should travel left to right the whole time, growing as it goes, not stand still and change shape. And a big wave doesn't come out of flat water: the whole sea should already be running high. References:
- Segawa's animated print: the whole sea is rough before the big wave enters, and the big wave travels in from off-frame.
- Physics of open-sea swells:
  - Gerstner (trochoidal) waves have sharp crests and broad troughs, because water gathers under each crest ([Wikipedia: Trochoidal wave](https://en.wikipedia.org/wiki/Trochoidal_wave); [arXiv 2512.05353](https://arxiv.org/abs/2512.05353)).
  - Deep-water swells travel in groups that move at half the speed of their crests.
- An animators' rule of thumb: crests slightly steeper than troughs ([Pixelblog: Water in Motion](https://www.slynyrd.com/blog/2018/10/12/pixelblog-10-water-in-motion)).

Searches for production breakdowns of studio wave animation found no reliable primary sources, so none is cited.

Changes:
- **Sea state:** the `sea` motif takes `rough` (0–1, times the node's progress, so it can be keyed). Its flat lines become rows of Gerstner swells. Each crest casts a shadow fading to the next crest, so the water's own gradient stays. Nearer rows are bigger and overlap farther ones. Swells come in groups moving at half the crest speed, and the highest crests of each group grow white caps that belong to their crest, so none pop in.
- **The squall's sea:** the river and the near sea roughen from a light chop at frame 0 to full swells by frame 170, running right, the way the wave runs.
- **Continuous travel:** a new `speed` param moves the wave at an even pace from the first frame, through the break and the settle. In the squall it is 1.6 px per frame: the wave comes in from the left as a swell, grows while travelling, and reaches the boat where it did before. On the face the boat keeps pace with the wave, so its climb is unchanged (largest step 10.1 px, pitch step 1.99° per frame). The boat also rocks a little from frame 40 as the sea builds.
- Playback holds at 28–30 fps through the squall.

Per-frame tracking of the squall (rise 56→240, break at 252 over 40 frames): height changes at most 6 px per frame on the rise and 13 px through the break. No claw moves more than 7 px per frame on the rise or 18 px through the break (the old break's peak). The surface under the boat moves at most 14 px per frame, and the boat's largest step is still 10 px. A first version slid roller claws 95 px per frame and dropped the crest 22 px per frame. Fixing that took four changes: claws fixed on the water, an even sink for the crest, an in-sine fall instead of a quadratic, and a splash-up on its own slower clock.

### Great-wave checklist

Owner requirements gathered across the review rounds. Items marked (test) are asserted in `tests/ukiyoe.test.tsx`; the rest are measured from renders.

| # | Requirement | How it is checked | Result (2026-11-14) |
| --- | --- | --- | --- |
| 1 | Foam is one connected white: claws open into it, nothing separately outlined; indigo only where white meets blue or sky | One outlined foam shape; zero other outlined fills (test) | Pass |
| 2 | Claws stretch forward and down with the wave's travel, never upward | Every claw's direction within 120–215° in wave space (test) | 46/46 |
| 3 | Claws branch into sections at the claw's own scale | At least 60% of claws have 2–3 hooks (test) | 87% |
| 4 | Claw density: one claw at a time, spread out | Median nearest-neighbour gap ÷ claw size between 0.55 and 1.2 (test) | 0.74 |
| 5 | Dome's top rolls in smooth, uneven bumps with no small wave parts | No claws high on the back of the wave (test); bumped top contour | Pass |
| 6 | Blue stripes curve with the wave | Each stripe bows at least 8% of its length from its chord (test) | 24–31% |
| 7 | Dark blue between stripes is thicker than the light stripes, while the light stripes are thick enough (later note) and fill the column down to the bottom | Median dark gap ÷ stripe width at least 1.5 (test; was 2 before the owner asked for thicker stripes) | 1.6×, 8 stripes |
| 8 | Stripes run with the column, not diagonally across it | Each stripe within 35° of vertical (test) | 2–20° |
| 9 | The top-right white mass is not too big | Wave pixels beyond the print's measured outline (+30 px band), wave alone on plain ground | 0.7% |
| 10 | Overall silhouette and curl angle match the print | Measured control points overlaid on the scan | Pass |
| 11 | Pale-blue tongues under claws; pale shows between claws | Visual (crop comparison with the scan) | Pass |
| 12 | Boats ride the reshaped wave smoothly | Rider per-frame step limits (test) | Pass (largest step 10 px) |
| 13 | The wave grows smoothly: no jumps from small to medium to big | Per-frame height change and per-claw step during the squall's rise; claw count constant | 6 px and 8 px max (was 75 px); 45 claws every frame |
| 14 | Droplets never go above the wave, and are few | Droplets above the highest claw over rise and break; most per frame | 0; at most 32 (was about 230) |
| 15 | The wave's life follows a breaking wave: swell, steepen, curl, travel, throw, fall, impact, roll on, settle | Frame sheets of the squall and the wave alone, compared with the Plunging breaker diagram and the animated print | Pass |
| 16 | The break stays smooth | Per-frame height change and per-claw step from the break to the settle; roller claws fixed on the water | 13 px and 18 px max |
| 17 | No lingering wave at the end: back to flat water, then weak bubbles | Height after the settle; bubbles only at or behind the waterline, small and half transparent | Flat by the end of `settleDuration`; the squall is flat from frame 356 |
| 19 | As the lip falls, the blue water moves forward and down after it instead of shrinking in place | Column front x through the fall (frame sheets in both orientations) | Pass; the column leans up to 16% of the width toward the impact |
| 20 | Near the white, the blue curves on with it through the throw and fall; no cut-out | Body and foam outlines plotted at the fall (no fold, no enclosed sky); frame sheets in both orientations | Pass; the blue lines the curl from the column to near the lip's tip |
| 21 | The wave travels the whole time, growing as it moves; the sea runs high before the big wave | The wave moves 1.6 px or more on every frame, the peak hold included; the sea's swells rise from frame 0 to 170 (frame sheets) | Pass |
| 18 | The blue column's top curves forward into the white, close to it, with no sky between | Column top runs just inside the crest foam's lower edge; the column ends in a pointed hook under the lip (crop comparison with the scan) | Pass; the hook draws back as the lip is thrown, outline steps at most 14 px per frame |

## Folktale creatures (owner request, 2026-11-14)

Motifs common to Japanese folktales and their prints: kitsune and the fox wedding (*kitsune no yomeiri*, foxes under a sun-shower with foxfire, *kitsunebi*), tanuki (the drumming, sake-carrying folk tanuki), shape-shifting (*henge*), oni (red and blue, horns, tiger-skin loincloth, iron club), Momotarō's peach and companions (dog, pheasant), cranes, dragons chasing the flaming pearl, and rice paddies. All are public-domain folklore. The rigs and the "Peach and the Oni" story are original work.

## Creatures, yōkai and countryside (owner request, 2026-11-14)

The owner asked for more realistic, detailed animals and creatures, Japanese ghosts such as the yuki-onna, stone statues, old country houses and mountain scenery other than Fuji. Sources studied:

| Source | Rights | What it gave |
| --- | --- | --- |
| [Ohara Koson, *Fox in the reeds*](https://commons.wikimedia.org/wiki/File:Koson_-_fox-in-the-reeds.jpg) | Public domain | Fox anatomy: a deep chest and tucked waist, the white ruff and cheeks, dark stockings, a brush tail. Fur is carved strokes following the body, and the long-haired edges break into locks. |
| [Ohara Koson, *Rabbit at full moon*](https://commons.wikimedia.org/wiki/File:Konijn_bij_volle_maan,_RP-P-1999-561.jpg) (Rijksmuseum) | Public domain | Soft fur edge, red eye, pink inner ear, big hind feet |
| [Ohara Koson, *Cawing crow*](https://commons.wikimedia.org/wiki/File:Cawing_crow_by_Ohara_Koson.jpg) and [*Two herons in flight*](https://commons.wikimedia.org/wiki/File:Koson_-_two-herons-in-flight.jpg) | Public domain | Wings as separate primaries and secondaries under layered coverts, a heavy beak with a gape line, scaled legs and toes. The heron flies with its neck drawn in. |
| [Utagawa Kuniyoshi, cats](https://commons.wikimedia.org/wiki/File:Kuniyoshi_Utagawa,_For_cats_in_different_poses.jpg) | Public domain | Calico patches, the cat's head |
| [Toriyama Sekien, *Yuki-onna*](https://commons.wikimedia.org/wiki/File:SekienYukionna.jpg) (1776) | Public domain | Streaming hair; a robe that turns into falling snow, with no feet |
| [Maruyama Ōkyo (attrib.), the ghost of Oyuki](https://commons.wikimedia.org/wiki/File:Oyuki.jpg) | Public domain | Yūrei: a pale downcast face, loose hair, a robe fading out below |
| [Katsushika Hokusai, Oiwa-san](https://commons.wikimedia.org/wiki/File:Hokusai,_cento_storie_(di_fantasmi),_il_fantasma_di_Oiwa-san,_1831-32.jpg) | Public-domain artwork (photo CC BY-SA 3.0): studied only | The lantern ghost: ribs across the face, the mouth in the torn paper, wisps of smoke |
| [Hiroshige, *Mountains and Rivers Along the Kisokaidō*](https://commons.wikimedia.org/wiki/File:%E6%9C%A8%E6%9B%BE%E8%B7%AF%E4%B9%8B%E5%B1%B1%E5%B7%9D-Mountains_and_Rivers_Along_the_Kisokaid%C5%8D_MET_DP121483.jpg) (MET) | CC0 | Stacked cliffs, snow on every upper surface over dark faces, pines along the ridges, the waterfall in its gorge |
| [Hiroshige, *Fox fires at Ōji*](https://commons.wikimedia.org/wiki/File:Hiroshige-100-views-of-edo-fox-fires.jpg) | Public domain | Thatched farmhouses, the night palette, foxfire |

What changed:
- **Four-legged animals.**
  - The torso and neck are one coat silhouette with one key line. Its long-haired stretches (chest ruff, belly fringe, along the back) break into uneven locks.
  - Inside the body, the thigh and shoulder carry no outline, only a carved contour down their front.
  - Legs have a hock (hind) and a wrist (fore), slim lower legs, toes, and dark stockings on the fox. Standing legs now reach the ground exactly; before, they floated.
  - The face has a stop, a pale muzzle (urajiro), a lip line, nose leather, a rimmed eye with iris, pupil (slit for fox and cat) and catchlight, brow hairs, whisker pads and a cheek ruff.
  - Brush tails are one tufted shape with the white tip inside it. The nine tails of a kyūbi are drawn lighter so they don't tangle.
- **Birds.**
  - A wing is real feathers on a bone frame (shoulder, wrist, hand): primaries and secondaries under scalloped coverts.
  - Folded, the wing covers the flank with the primaries crossing the tail. In flight, the hand lags the wrist through the stroke.
  - Legs have the backward heel joint, scales, three forward toes and a hind toe.
  - The heron flies with its neck drawn in. Each species has its own markings: the crane's white nape and black bustle, the sparrow's cheek spot and bib, the pheasant's face wattle and barred tail, and the crow's sheen.
- **Yōkai** (`ukiyoe-yokai.ts`).
  - The snow woman: an S-curve robe trailing into tendrils of snow, wind-borne hair ending in locks, a bijin profile with red lips, and the freezing breath (`blow`).
  - The yūrei: the robe closed right over left as the dead are dressed, the paper triangle, hair falling over the face, limp hands, soul-flames, and a robe fading out below.
  - The umbrella spirit: one leg in a geta, a squash-and-stretch hop, one eye and a lolling tongue.
  - The lantern spirit: swaying on its hook, a torn grin, a flickering glow.
  - Soul-flames. `appear` and `vanish` fade any of them in and out.
- **Scenery** (`ukiyoe-scenery.ts`): `range`, `minka`, `jizo` and `komainu`, as described in the spec.
- **A third film, *The Snow Woman*:**
  - A snowbound pass with a village and jizō.
  - The old shrine at night, with komainu, the lantern and umbrella spirits and a yūrei.
  - The snowfield where the snow woman breathes on the traveller and vanishes.

## Monkey, horse, kappa, tengu and rokurokubi (owner request, 2026-11-14)

The missing pieces from the previous round. Sources (all public domain, Wikimedia Commons):

| Source | What it gave |
| --- | --- |
| [Ohara Koson, *Monkey with her child*](https://commons.wikimedia.org/wiki/File:Koson_-_monkey-with-her-child.jpg) | The macaque's grey-brown shaggy coat, bare red face, small side ears and stub tail |
| [Hiroshige, *Totsuka* (Tōkaidō, Rijksmuseum)](https://commons.wikimedia.org/wiki/File:Totsuka_No._6._Totsuka_one_of_the_fifty-three_noted_places_from_Tokaido._Painted_by_Hiroshige._(titel_op_object)_De_T%C3%B4kaid%C3%B4_van_Hiroshige_(serietitel)_Hiroshige_no_fude_T%C3%B4kaid%C3%B4_(serietitel_op_object),_RP-P-2010-310-95-6.jpg) | The packhorse: red harness and crupper, saddle cloth and load |
| [Toriyama Sekien, *Kappa*](https://commons.wikimedia.org/wiki/File:Kappa_jap_myth.jpg) | Crouching body, shell, the dish of water ringed by hair, webbed hands, beak |
| [Toriyama Sekien, *Tengu*](https://commons.wikimedia.org/wiki/File:SekienTengu.jpg) | The bird-headed tengu: beak, feathered head, wings |
| [Toriyama Sekien, *Rokurokubi*](https://commons.wikimedia.org/wiki/File:SekienRokurokubi.jpg) and [Hokusai](https://commons.wikimedia.org/wiki/File:Hokusai_Rokurokubi.jpg) | The neck as a long thin line rising from a still body, the head dressed |

What was built:
- **`monkey`:**
  - Longer legs and a forward head.
  - A heart-shaped red face mask under a heavy brow, with forward eyes, nostrils and small side ears.
  - Dark hands and a stub tail.
- **`horse`:**
  - Its own head: a flat forehead and straight nose, a deep blunt muzzle, the round jowl, nostril, forelock and tall pointed ears.
  - A long arched neck with a mane falling in locks.
  - Hooves with fetlocks, black stockings, and a tail of hair strands that falls and swings.
  - `tack` adds the Tōkaidō harness, saddle cloth and pack.
- **`kappa`:**
  - A crouching, frog-legged body with a shell of plates and a ringed belly.
  - Webbed hands and feet, a beak and staring eyes.
  - The hair fringe round the dish of water. `bow` tips the head and the water spills and splashes.
- **`tengu` and `karasutengu`:**
  - Yamabushi dress: checked suzukake, a pom-pom sash, wide hakama, one-toothed geta and the little tokin cap.
  - Great feathered wings, half folded at rest and beating in `fly`.
  - The feather fan: `fan` swings it and sends out streaks of wind.
  - The red tengu has the long nose, white mane and beard; the karasu-tengu has a crow's head and beak.
- **`rokurokubi`:** a living woman in a kanoko kimono and shimada hair with kanzashi. `stretch` raises her head on a long, swaying S of neck.
- **In the films:** Momotarō's monkey now walks with the dog and pheasant, and a kappa bows at the paddy, spilling its dish. A packhorse waits by the temple, and two tengu watch over the folktale road. A rokurokubi appears at the shrine in *The Snow Woman*.

Not done: three-quarter views. Every rig is still a profile, mirrored to turn.

## Three-quarter faces, nue, nurikabe, tsuchigumo (owner request, 2026-11-14)

- **Three-quarter faces.** Most faces in ukiyo-e are drawn three-quarter: both eyes, the far one foreshortened by the curve of the face, the nose a hooked line breaking the cheek's edge, the mouth set toward the cheek. Figures now take `look.view: "three-quarter"`, and the `face` action swings a head between the views. The head narrows through the turn and the drawing changes at the midpoint, the same trick the body `turn` uses. In the films, the mother in *The Night Ferry* is drawn three-quarter, as bijin are, and the traveller turns his face to us as he prays at the end of *The Snow Woman*. Bodies and creatures stay profile rigs.
- **Nue** ([Sekien](https://commons.wikimedia.org/wiki/File:SekienNue.jpg); [Kuniyoshi, Yorimasa shooting the nue](https://commons.wikimedia.org/wiki/File:Yorimasa_shooting_at_the_monsterous_nue.jpg)):
  - The four-legged rig with a monkey's red face.
  - A tiger coat: stripes from the spine down the body and bands across the legs.
  - A living snake for a tail, scaled and sinuous, its head turning back with a flicking tongue.
- **Nurikabe** ([*Bakemono no e*, BYU](https://commons.wikimedia.org/wiki/File:Nurikabe_Bakemono_no_e_BYU.jpg)): a huge white beast crouched low as a wall.
  - Skin rolls hooding the face and plaster cracks over the body.
  - Three blue-ringed eyes with petal lids that roll and blink.
  - A curled nose, a frowning lip with dark tusks, and great round paws.
- **Tsuchigumo** ([Kuniyoshi, *The Earth Spider at Raikō's mansion*](https://commons.wikimedia.org/wiki/File:Warrior_Minamoto_Raiko_and_the_Earth_Spider_LACMA_M.2006.136.292a-c_(1_of_2).jpg)):
  - A striped abdomen and a hairy cephalothorax with two great eyes and a row of small red ones.
  - Hooked fangs, and eight legs arching high at the knee, banded in yellow.
  - It creeps in a four-and-four gait and rears with forelegs raised, fangs spread. Standing still, it trails a thread of silk.
- **In *The Snow Woman*:** a nurikabe crouches across the far road in the pass. At the shrine, the earth spider hangs in the torii and rears, and the nue prowls past.

## Not yet matched (honest gaps)

- No true **karazuri** blind embossing depth or **kirazuri** mica sparkle beyond a light emboss filter.
- Faces are a single profile design per hairstyle. There are no three-quarter turns or expressive brow and eye shapes yet.
- The wave's foam is procedural. It is now one connected white like the print's, but every claw is built from the same palm-and-talon unit, so it lacks the print's hand-drawn variety of claw sizes and the long lace trailing over the back.
- The wave breaks one way only: a plunging breaker. There is no spilling breaker for the small background waves, and the falling curtain has no motion smear at its fastest frames.
- Creature fur is procedural carved hairlines and tufted edges. It is closer to Koson's prints but not hand-carved. Faces turn three-quarter, but bodies and creatures are profile rigs that mirror to turn.
- No soundtrack yet (shakuhachi and koto beds, rain and surf foley).
- Human normal-speed review of the film has **not** been recorded.
