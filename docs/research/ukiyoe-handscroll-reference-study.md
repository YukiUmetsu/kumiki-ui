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

## Crowds, sound and fingered claws (owner request, 2026-11-14)

- **Crowds.** Emaki and Tōkaidō station prints are full of street life. The new `crowd` node fills a strip of road with townsfolk in depth rows, from a reusable cast of twelve Edo looks. Every person is a full figure with its own pace and behaviour, seeded. The Night Ferry's riverside town now has two crowds strolling along the shop fronts and by the shrine, behind the story's named characters.
- **Sound.** Each shot of the three films carries a recorded ambience bed from the sound catalog. All are CC0 field recordings: a fast river, a close stream and strong mountain wind.
  - *The Night Ferry:* river at the title and the boarding, stream through the town, the fireworks and the arrival, and wind in the squall.
  - *The Peach and the Oni:* river, stream on the road, wind on the island.
  - *The Snow Woman:* wind throughout, muffled and low at the night shrine.
  - The beds go into the film documents, so renders carry them with crossfades at the cuts. The Storybook players play them on their frame clock, with an on/off switch.
  - The beds were chosen from the catalog's descriptions and have not been listened to in context. There are no event sounds yet (no surf crash, no fireworks): the catalog has no recorded ones.
- **Fingered claws.** In the print, a big claw's hook ends in two or three small curled fingers, like a bird's foot (see the claw crop of the 3840 px scan). Hooks on the larger claws now split near the tip into a smaller twin curling the same way, and the biggest sometimes into two. Small claws stay single hooks, so the lace keeps its rhythm. The first version, thin backward ticks, read as hair, not fingers, and was redrawn. It is limited to the larger claws because the first version cost the squall 2–3 fps; it now plays at 27.5–29 fps.

## Event sounds and three-quarter bodies (owner request, 2026-11-14)

- **New recordings.** Four CC0 field recordings from Freesound were found through Openverse. The CC0 licence was read on each source page before import, and each went through the repo's importer (trim, seamless loop, level-matched to −23 LUFS, sha256, rights):

  | Bed | Source |
  | --- | --- |
  | `bed-rain-heavy` | Kinoton, [393560](https://freesound.org/people/Kinoton/sounds/393560) |
  | `bed-surf-beach` | kyles, [177698](https://freesound.org/people/kyles/sounds/177698) |
  | `bed-fireworks-distant` | monotraum, [212673](https://freesound.org/people/monotraum/sounds/212673) |
  | `bed-crickets-night` | PhilllChabbb, [245834](https://freesound.org/people/PhilllChabbb/sounds/245834) |

- **Sections chosen with earshot** (find, describe, realness). The final loops were measured again:

  | Bed | Match | Real (p_real) | Voices (voice z) |
  | --- | --- | --- | --- |
  | Rain | heavy rain, z +3.9 | 0.96 | 1.2 |
  | Surf | ocean waves, z +5.7 | 0.87 | 1.5 |
  | Distant fireworks | fireworks exploding, z +4.3 (tag +5.2) | 0.94 | 2.0 |
  | Crickets | crickets at night, z +4.1 | 0.93 | 1.5 |

  None reaches the 2.5 voice threshold, so no voices are heard.
- **Rejected candidates:**
  - A crickets recording with audible distant village voices (AudioSet "Speech").
  - A surf recording whose best trims read as underwater bubbles.
  - A temple bell whose strikes all start inside the previous ring.
  - The first surf section, which failed the importer's loop-seam check at −2.9 dB. A 12 s section passed.
- **In the films:**
  - Rain is layered over the storm's wind.
  - The fireworks shot plays distant fireworks with crickets under them. The first mix had a faint stream too: earshot heard it as "being underwater" and the fireworks only weakly (z +2.4), so the stream was dropped and the levels set again. Fireworks z +4.4 and crickets +3.4, both strong.
  - Crickets play under the arrival.
  - Surf with a little wind on the oni island (ocean waves +4.8, wind +3.0).
- **Shot `layers`.** A shot can now carry extra beds, written as film beds over its frames; the Storybook players play them too. Event sounds (a crash on the break, single bursts on each firework) are still beds, not hits timed to frames.
- **Three-quarter bodies.** Prints often draw a figure's limbs in profile while the torso and face turn toward the viewer. A figure with `view: "three-quarter"` now gets:
  - a broader chest, with the far shoulder's seam showing;
  - a breast panel over the near sleeve, carrying the crossed collar as a V (the wearer's left edge over the right);
  - the robe's front panel (okumi) edge running down to the hem, with a sliver of the under-robe;
  - the obi cord across the front.

  It reads in standing, walking and waving poses. The Night Ferry's mother and the crowd's three-quarter townswomen use it. Creatures are still profile rigs.

## Three-quarter limbs and animals (owner request, 2026-11-14)

- **Figures.**
  - **Limbs.** A three-quarter figure's limbs now turn with its torso. The turn is applied to the solved joints, so every action keeps working. The sideways reach of a swinging limb foreshortens by cos 45°, the far leg and arm stand back and higher (further away), the near ones come forward, and the feet shorten on the diagonal.
  - **Gait.** The walk cycle shortens by the same factor, so the stance foot stays planted. Measured on the lowest point of the figure, the drift per frame is 3.16 px both in profile and turned.
  - **Where it shows.** The Night Ferry's mother and the crowd's three-quarter townswomen.
- **Animals.**
  - **Four-legged rig.** `look.view: "three-quarter"` foreshortens the body to 80% and sets the far legs back and higher, so all four feet read in depth. The head turns to us: the muzzle shortens, the far eye shows beyond the bridge of the nose with the stop between the eyes, and the horse shows only the far eye's upper rim over its long head.
  - **Birds.** The far leg and wing are set back and higher.
  - **In the films.** Momotarō's dog on the folktale road, and the fox that stops to look back in *The Snow Woman*'s pass.
  - **In Storybook.** The Bestiary has a **View** switch that turns every animal and figure.
- **Not done.** No back views or full front views; dragons and yōkai keep their own drawings.

## Back views and full front views (owner request, 2026-11-14)

Prints often show a figure from behind: a traveller walking away down the road, a woman whose back is turned to show her nape and her obi's knot. They also show a figure square on, facing out of the print. Figures and four-legged animals now take `look.view: "front"` and `"back"`.

- **Figures** (`ukiyoe-figure-front.ts`). The drawing is driven by the same pose channels as the profile rig, so every action works.
  - **Legs.** They stand side by side. A stride lifts the swinging foot and bends its knee toward us, so the shin shortens.
  - **Arms.** They hang at the sides. A profile shoulder angle becomes a sideways lift, reaching straight overhead at the top of a cheer. A forward reach foreshortens, and a folded forearm (praying, cradling) comes in to the chest. A punt pole stands upright at one side, held in both hands one above the other, and the hands climb and drop with the stroke.
  - **Bow.** A bow shortens the torso and drops the head.
  - **Kneeling.** Seiza folds the knees into a wide base.
  - **From the front.** Both eyes and brows, the nose and mouth, the crossed collar (left over right), the front panel and the obi cord.
  - **From behind.** The back of each hairstyle, the nape (the women's collar pulled low, emon-nuki), the taiko knot and the centre-back seam.
  - **Oni.** Horns, fangs and the glaring eyes face out; from behind, only the wild hair and the horns.
  - **Props.** The umbrella leans over the head without crossing the face, the staff or kanabō stands at the side, the lantern hangs from the hand, and the fan is held up.
- **Four-legged animals** (`quadFrontBack` in `ukiyoe-creatures.ts`). The fox, tanuki, dog, cat, rabbit, monkey, horse and nue take these views.
  - **From the front.** The face square on (both ears, both eyes, the muzzle toward us with the nose leather at its tip, each species' markings), the chest ruff, the front legs side by side, and the hind legs behind them.
  - **From behind.** The backs of the ears, the rump with the tail down its middle, and the hind legs.
  - **Horse.** From behind, its head stands high on the neck with the mane down it.
  - **Sitting.** The haunches spread at the base.
  - **Kyūbi.** Its nine tails fan out behind it, with the foxfire circling.
  - **Drumming tanuki.** It stands upright, beating its belly with both paws, with the hat and the sake bottle.
  - **Nue.** Its snake tail rears up over the back and looks at us.
- **In Storybook.** The Bestiary's View switch offers Front and Back (birds, the dragon and the yōkai stay in profile), and the Cast lab has a View switch for each figure.
- **Not done.**
  - Birds, the dragon and the yōkai have no front or back drawing.
  - No film uses these views yet.
  - The turn between views is a cut, not an animated turn.

## Oiran (roadmap U1, owner request, 2026-11-14)

**Sources.** Public-domain prints from the Metropolitan Museum's open-access collection, studied at full resolution:

- Torii Kiyonaga, *An Oiran Accompanied by Two Kamuro* (Met 56034)
- Chōbunsai Eishi, *Karakoto of Chōjiya on Parade* (52000) and *Oiran and Attendants at the Ō Mon of the Yoshiwara* (36662)
- Katsukawa Shunchō, *The Oiran Shirayu of Wakanaya attended by Two Kamuro and Shinzo* (54819)
- Chōkōsai Eishō, a large-head portrait of Hanaogi of Ōgiya (36664), for the hair
- Katsushika Taito II, *Courtesan on Parade* (57069), for the back view

Accounts of the procession step and the costume, which agree in outline and differ in detail:

- uncannyjapan.com and japlanease.com: soto-hachimonji, the foot tracing an 8
- oldtokyo.com: the skater-like crossing step; three-toothed lacquered clogs about 8 inches tall; the order of the procession
- Wikipedia "Oiran" and tsunagujapan.com: the date-hyōgo hairstyle, the manaita obi tied in front, the unbelted uchikake

The counts of kanzashi and the weights given vary between sources and were not used as targets.

**What the prints show.**

- **Hair.** Wide, translucent side-wings with fine combed lines and a bun at the nape. Large loops on top with a broad tortoiseshell comb in front, and long pins radiating out on both sides, tipped with coral beads and flat ornaments.
- **Collars.** Several collars layered at the neck (white, red, yellow).
- **Obi.** A huge padded obi bundle at the belly in a gold tortoiseshell-hexagon weave, its ends hanging long.
- **Over-robe.** A black uchikake with large motifs, its hems pooling and flaring over the coloured hems of the robes beneath, with a fat padded roll at the bottom.
- **Clogs.** Tall black clogs peeking out under the hem.
- **Attendants.** Two kamuro in matching red with flower pins, walking at her side or ahead.
- **Parasol.** A manservant behind holding a big long-handled parasol over her.

**What was built.** `ukiyoe-oiran.ts` holds the hyōgo hair (side and square views), the kamuro bob, the koma-geta (side and square), the padded hem, the kasane bands, the mae-obi (side and front), the chrysanthemum roundels and the parasol. The `dochu` step, `UKIYOE_OIRAN_LOOKS` and `oiranProcession` complete it. Storybook has **Oiran procession**: a pleasure-quarter street at dusk with cherry trees, lanterns and onlookers, plus the oiran in four views. The Cast lab includes the oiran.

**Measured, not eyeballed.**

- Tracking the clog teeth frame by frame first found the clogs drawn upward into the foot. The teeth sat 21 px above the ground; that is fixed, and the teeth now reach the ground within 1 px.
- The planted clog slid about 8 px a step. The sweep is now ±10° at an even (triangle-wave) rate, and the planted clog holds within 0.3 px over a step.
- The tests check both (within 3 px and within 1.5 px).

**Not done.**

- The uchikake's motifs are roundels, not the painted cranes, phoenixes or waves of the prints.
- The turn between views is a cut.
- The look-back mirrors the head; the body does not twist.
- Kneeling in the uchikake is a rough mound.
- No film uses the procession yet.
- Nobody has done a human visual review yet.

## Maiko (roadmap U2, owner request, 2026-11-14)

**Sources.** The maiko dress as now known (the darari obi, okobo, the wareshinobu) is late Edo to Meiji and later, so prints are few; the Met's open-access search found none. Studied instead, from Wikimedia Commons:

- Kuroda Seiki, *Maiko* (1893, public domain)
- Licensed photographs, studied only and not redistributed:
  - *Darari.jpg* (CC BY-SA 2.0), a black-and-white back view of a darari obi
  - *Gion Higashi maiko Hinayū in Seirai-in Temple 05/06* (CC BY-SA 2.0), the bun and the darari from behind
  - *Okobo.JPG* (CC BY 3.0)
  - *Maiko-henshin-fullheight.jpg* (CC BY-SA 3.0)
  - *Two young maiko in Seirai-in Temple 01* (CC BY-SA 2.0)
  - *Toshimana dancing 03* (CC BY-SA 2.0), dance with two fans

**What they show.**

- **Darari.** Two long ends hang from a high folded knot nearly to the hem, side by side, patterned and weighted with a crest at the tip.
- **Hair.** A split bun on the crown with red tie-dyed silk in the split, a cluster of silk flowers at the temple with strands hanging, and a silver pin.
- **Make-up and dress.** White make-up stopping in points at the nape, a red collar, long sleeves and a trailing hem over red layers.
- **Okobo.** A tall unlacquered wooden block with the toe cut back in a slope and a red thong.
- **Dance.** Held poses with an open gold fan, arms extended, the sleeves hanging from them, knees softly bent.

**What was built.** `ukiyoe-maiko.ts` holds the wareshinobu (side and square views), the hana-kanzashi with swinging strands, the silver pin, the eri-ashi, the darari (side and back), the front obiage and pocchiri, the okobo (side and square) and the maiōgi. It also adds the `kyomai` action, okobo steps in `walk`, and `UKIYOE_MAIKO_LOOK`. Storybook has **Maiko dance**; the Cast lab's maiko uses the new look and dances the kyōmai.

**Measured.**

- Tracking the okobo frame by frame found the planted clog skating 4–7 px a step with the ordinary (sine) gait. On okobo the stance leg now sweeps at an even rate (triangle wave), and the clog holds within about 1 px.
- The tests check that it holds within 1.5 px over a step. They also check that the kyōmai is still within a hold, never jumps more than 8° a frame in a transition, and opens the fan to dance.

**Not done.**

- The kyōmai is four poses, not a choreographed piece.
- In the front view an arm swept back hangs instead of opening to the side.
- Kneeling lets the darari hang to the floor instead of lying on it.
- No film uses her yet.
- Nobody has done a human visual review yet.

## Samurai and katana (roadmap U3a, owner request, 2026-11-15)

**Sources.** Public-domain objects and prints from the Met's open-access collection, studied at full resolution:

- *Blade and Mounting for a Sword (Katana)* (22101, 21889 by Naotane Taikei)
- *Blades and Mountings for a Pair of Swords (Daishō)* by Sukemitsu of Bizen (27789)
- Katsukawa Shunshō, *The Fifth Ichikawa Danjūrō as a Samurai Attired in Ceremonial Kamishimo* (36880)
- Utagawa Yoshitora, *The Warrior Slaying the Giant White Hihi* (63376)

**What they show.**

- **Hilt.** The silk wrap crosses in diamonds, with the white nodular ray skin showing in the gaps. There is a dark end cap and a metal collar at the guard.
- **Guard and collar.** A round dark guard, with the gold collar on the blade.
- **Blade.** It curves gently. The edge carries a frosty band (the temper line) and the ridge line runs to the tip; the tip is cut at an angle (yokote).
- **Scabbards.** Glossy black lacquer, with a knob for the cord.
- **Kamishimo and the pair.** The kamishimo's starched wings stand straight out from the shoulders, with crests. The pair is worn through the obi at the left hip, hilts forward and up, scabbards back.

**Measured.**

- The kata was tracked through every frame of the sword's drawn geometry. Moving between guards, the blade first swung hassō→waki 266° round the front. It now turns the short way, 94° back over the shoulder, at most 9.4° a frame.
- Outside the strike, no frame turns the blade more than 30°. The strike's fast middle reaches 44° a frame.
- The 158° jumps in the raw state at the draw's release and the sheathe's entry happen while the sword lies along the scabbard, so the drawn sword does not move. The tests check all of this.

**Not done.**

- Duels between two figures (U3b) and armour are not built yet.
- The square views project the profile sword rather than drawing true front and back poses.
- The left hand is hidden behind the hilt in profile.
- No film uses the samurai yet.
- Nobody has done a human visual review yet.

## Duels (roadmap U3b, owner request, 2026-11-15)

**What was built.**

- **Aimed exchanges.** Contact is solved geometrically, not hoped for. Each exchange names its contact frame. The attacker's cut and the defender's receiving guard are both aimed at one point a quarter-height in front of the defender's brow. On that frame each blade is turned to pass through the point, wherever the figure's neck and hands actually are.
- **Sparks.** A `sparks` particle bursts from that point.
- **Parried or not.** A parried cut stops on the blade and rebounds. An unparried cut follows through.
- **Hit and fall.** The struck figure recoils, and his blade drops. He topples back about his heels (`fall`, accelerating), his sword and scabbards laid along his body so nothing pierces the ground. The victor holds, clears his blade and sheathes it.
- **Recipe and Storybook.** `samuraiDuel()` builds the whole duel from a list of exchanges. Storybook **Samurai duel** shows it in a moonlit field of pampas grass.

**Measured.**

- On every contact frame of the default duel the two blades cross within 0.2 px: 83% along the attacker's blade and 49% along the defender's. The spark sits on both.
- Eight frames earlier the blades have not met.
- Frame tracking of the fall found three defects, all fixed:
  - the dropped blade spun a full circle the long way;
  - while kneeling, the lowered blade went into the ground;
  - lying down, the sword stuck straight up and the scabbards stabbed down.
- The tests check contact within 2 px, that the defender falls and stays down, and that the victor sheathes.

**Not done.**

- No footwork: the fighters stand their ground.
- Every cut is the same high diagonal.
- No armour.
- No film uses a duel yet.
- Nobody has done a human visual review yet.

## Oni weapons and fighting (roadmap U4, owner request, 2026-11-15)

**Sources.**

- Wikimedia Commons museum photographs of kanabō: *Antique Japanese kanabo 12*, *Kanabo tetsubo*, *Kanabo with handle* (CC BY-SA 3.0, studied only and not redistributed).
- Public-domain prints: Kuniyoshi's *Imperial Bodyguard Fighting with a Demon* and *Kidōmaru*, and Utagawa Toyoharu's *Momotarō no oni-taiji*.
- The Met's open-access search gave little on the club.

**What they show.**

- **The club.** A long iron-shod club, thickening toward the head, its striking half set with rows of iron studs, iron bands, a wrapped grip and an iron ring at the butt.
- **The oni.** Wild hair, sinewy limbs and big diagonal action; defeated oni bow to Momotarō.

**Measured.**

- **Smashes.** The head lands within 0.0 px of the ground at both smashes. It had first sunk about 30 px into the ground when the aim ignored the crouching body; the angle is now solved from the actual hands. It lands at least 40 px clear of the hero, who springs back.
- **Club against blade.** Club and blade meet within 0.6 px at both parries, and the sparks sit on both.
- **Final cut.** Its tip lands inside the oni's body.
- **Dust.** Placed by the recipe, the dust was about 100 px from the actual impact. It is now drawn by the figure at the club's head.
- **Shake.** The first camera shake was about 98 px and 5° and showed the page edge. It is now about 11 px and half a degree.
- The tests check the ground contact, the clearance, the club-on-blade meetings, the final cut, the fall and the dropped club.

**Not done.**

- The oni's fall seen square on is a foreshortened collapse, not a drawn pose.
- No oni weapons other than the kanabō.
- No film uses the fight yet.
- Nobody has done a human visual review yet.

## Castle (roadmap U5, owner request, 2026-11-15)

**Sources.**

- Public-domain Meiji-era photographs on Wikimedia Commons: *Nagoya Castle in 1880s*, *Kumamoto Castle oldphoto 1874*, *Himejicastle-meiji*.
- Hiroshige's Tōkaidō views with castles from the Met's open-access collection: *Kuwana* (55587), *Odawara* (36931) and *Nihonbashi* (37195).

**What they show.**

- **Keep.** Stacked tiers, each smaller, with deep dark eaves turning up at the corners.
- **Gables.** Triangular chidori gables and a curved karahafu stand forward on the roof faces.
- **Walls.** White plaster with rows of small barred windows (Kumamoto: black boarding below).
- **Ridge.** Gold shachihoko on the top ridge.
- **Stone base.** A tall base whose faces are shallow at the foot and steep at the top, with long-and-short interlocking corner stones.
- **Outer works.** Corner turrets and long walled galleries on the stonework, gates, moats.

**What was built.** `ukiyoe-castle.ts` (`motif: "castle"`) draws the keep, the outer wall, the turrets, the gate, the moat and the bridge, seen slightly from the side. It takes `tiers`, `style`, `snow`, `night`, `depth`, and `walls` / `turrets` / `gate` / `moat` / `bridge`. Three examples are in the Motifs gallery.

**Review rounds (screenshots at 0.6× and 1.6×).**

1. **First draft.** The stone base bulged like a dome (the fan curve was inverted). The roofs were thin, and the elevation was flat. The base now flares at the foot and steepens at the top; the roofs are deeper with wider eaves; storeys, roofs and stone bases have shaded side faces.
2. **Second round.**
   - The keep base's side face ballooned outward; it is now a straight receding face.
   - The shachihoko were oversized and have been scaled down.
3. **Close-up.**
   - The chidori gables were hidden by the storey above. They are now drawn after the whole tower, standing in front with tiled bargeboards and a gold gegyo.
   - Hip lines started under the upturned corners and left spikes; they now start at the corners.
   - The side eave left a notch at the front corner; it now starts from the upturned front corner.
   - A chidori gable covered the karahafu; that tier now carries only the karahafu.

**Further study (owner request: "study more castle references").** More public-domain Meiji photographs and prints, from Wikimedia Commons:

- Beato's views of Edo castle: *Castle of Yedo, inner moat*, *Yedo castlemoat*, *Tycoon's Palace double bridge*
- *Matsumoto Castle Old Photograph*
- *Nijō Castle in Kyoto, before 1902*
- Hiroshige's *One Hundred Famous Views of Edo* no. 66 and *Soto Sakurada*
- Hiroshige III's *Kudanzaka Ushigabuchi*

They showed five things the motif lacked, all now built:

- **Stones.** The stones are irregular blocks, not neat courses. They are biggest at the foot and the corners, each with its own tone, and the joints never line up. They are now drawn that way.
- **Galleries.** The walls carry long white gallery buildings (tamon-yagura) with rows of windows and tiled roofs (Edo). These are the default; the plain loopholed wall is `wall: "dobei"`.
- **Top roof.** The top roof is hip-and-gable, with a big gable on its end face (Edo's Fujimi turret, Nagoya). It is now drawn on the receding face.
- **Reflections.** The moats mirror the walls (Matsumoto, Edo); the walls are now reflected, faded, in the moat.
- **Pines.** Hiroshige crowns castle walls with umbrella pines. Now `pines` stand along the bailey behind the wall.

**Not done.**

- A single fixed angle (left to right); `flip` mirrors it.
- No second bailey; the grassy earthwork banks (dote) of Edo's outer moats are not drawn.
- The stone wall runs are frontal.
- No film uses the castle yet.
- Nobody has done a human visual review yet.

## Castle town (roadmap U6, owner request, 2026-11-15)

**Sources.**

- Hiroshige's *One Hundred Famous Views of Edo* no. 8, *Suruga-chō* (Wikimedia Commons, public domain).
- From the Met: Hiroshige's *Asakusa Kaminarimon*, *Twilight Moon at Ryōgoku Bridge* and *Sudden Shower over Shin-Ōhashi*.
- Beato's *View of Yedo* (public domain).
- Yoshitoshi's Yaoya Oshichi climbing a fire-watch tower (public domain).
- A photograph of a surviving hinomi-yagura (CC BY 2.1 JP; studied only, not redistributed).

**What they show.**

- **Merchant streets.** Lines of big shops under heavy tiled roofs, indigo noren with white crests across the fronts, standing signs and slit windows above, crowds on the street, mist bands, Fuji beyond.
- **Samurai quarters.** Long white walls with gatehouses, pines behind, moats with grassy banks.
- **Bridges.** Long wooden bridges on piles, boats below.
- **Fire-watch towers.** Tapering timber legs, a lashed ladder, a platform with a bell under a little roof.

**What was built.** `ukiyoe-town.ts` adds the `shop`, `kura`, `yashiki` and `firetower` motifs and the `castleTown()` scene (6,400 px, four stations). Storybook has **Castle town**, and the Motifs gallery has the four new motifs.

**Review rounds.**

1. **First pass.**
   - The keep's top was cut off, and the castle floated over a band of sky. The town now has one ground that rises to the castle's hill, and the castle is smaller.
   - The street covered the bridge. The street is now split, with the canal water, stone banks, the bridge over it and a boat in it.
   - The residence pines were spindly and have been shortened.
2. **Tracking the crowds frame by frame** showed walkers would wade into the canal. They are now placed and directed so none ever stands on the water; the test checks every walker every 15 frames.
3. **Distant range.** A hard white snow line on the range in the snowless version was removed.

**Not done.**

- Walkers do not cross the bridge.
- The street is seen from the side, not in Suruga-chō's deep perspective.
- No night version.
- Nobody has done a human visual review yet.

## Interiors (folktale queue F1, 2026-11-15)

**Sources** (public domain; the Met open-access collection unless noted).

- Hiroshige's *Akasaka: Inn with Serving Maids* (Tōkaidō, ca. 1834, 36958).
- Harunobu's *Night Rain at the Double-Shelf Stand* from *Eight Parlor Views* (37145) and his parlour prints.
- Utamaro's *A Woman Weaving, Seated at a Hand Loom* (36631), *Women Weaving Silk Cloth* (36627) and *Kitchen Scene* (37325).
- Kiyonaga's *Three Geishas of Tachibana Street in Their Room* (57090).
- Kuniyoshi's *The Okazaki Cat Demon* (45282).
- The *Genji Monogatari Emaki*, Azumaya (Wikimedia Commons).

**What they show.**

- **The open front.** Hiroshige's inn is seen from the garden with the front wall open: ochre posts and lintels, white shoji with their grid, silver-grey fusuma painted with bamboo, green tatami with black borders, a veranda of planks with posts beneath, a thatched eave cut by the top of the print, a square paper lamp, bedding stacked. The Genji scroll's roofless rooms (fukinuki yatai) look down at an angle and frame figures with posts, blinds and screens.
- **Projection.** The floor recedes in parallel oblique, never toward a vanishing point. The tatami joints and borders carry the depth.
- **Furniture.** Harunobu's parlour has a round window with a bamboo lattice and staggered lacquered shelves. Kiyonaga's room has a lattice screen and a black-lacquer mirror stand.
- **The loom.** Utamaro's loom is pale wood blocks with key lines. The warp is a sheet of fine threads, the reed is a comb in a frame, and an overhead arm carries the cord. The weaver kneels close, one hand on the beater.
- **Kitchen and hearth.** Utamaro's kitchen: wooden tubs bound with cord, an iron kettle with its spout, smoke rising in curling bands.

**What was built.** `ukiyoe-interior.ts` adds the `room`, `andon`, `irori`, `futon`, `loom` and `byobu` motifs, the `sleep` and `weave` actions, and `interiorScene()` with four rooms. Storybook has **Interiors**, and the Motifs gallery has eight new tiles.

**Review rounds.**

1. **First renders.**
   - The tatami borders were twice as heavy as the prints' and have been thinned to a line.
   - The hearth flames were plain triangles. They are now curling tongues with yellow hearts and a key line.
   - The quilt was a shapeless blob. It is now a thick cover with a mound over the body, a draped front and a collar band across the head end.
   - The loom was a spindly scaffold. Its timbers are now outlined wood blocks, and the warp is a translucent sheet.
2. **Torn shoji.** Random holes with radial marks read as insects. Tears now burst whole lattice cells, with a scrap of paper still hanging from the top of each, as in the ghost prints.
3. **Night paper.** At night the shoji paper was translucent, so the garden showed through it like glass. The paper is now opaque grey-blue, or warm when a lamp is behind it (the inn's front shoji).
4. **Painted fusuma.** Each panel repeated the same painting. The painting now runs across both panels of a bay and moves with the sliding panel.
5. **The sleeper.** The figure first lay on the floor in front of the futon, then hidden under the cover. Its heels are now placed so the head rests on the pillow, which was checked at full size with and without the cover.
6. **Tracking the weaver frame by frame** over a full pick (44 frames). Her hands floated short of the beater, and the beater swung half the loom's length. The beater now swings a hand's width. The `weave` action puts the near hand on the beater bar by IK, using the loom's own `loomGrip` and swing, and the weaver kneels with her knees under the cloth beam. On every frame the hand is on the bar, and the shuttle shows only while the beater is back.
7. **The maid.** The carry pose read as scratching her head. She now holds her hands before her as she walks in, then kneels and bows.

**Not done.**

- Smoke-blackened rafters for the farmhouse.
- A tray, teacups and other hand props (queued for F15).
- The fusuma do not open by a figure's hand.
- Interiors have no three-quarter or deep-perspective view.
- Nobody has done a human visual review yet.

## Women ghosts and hags (folktale queue F3, 2026-11-15)

**Sources** (public domain prints; one photograph of a print studied only).

- Hokusai's *Sarayashiki* and *Oiwa-san* from *One Hundred Ghost Stories* (Wikimedia Commons; the Oiwa file is a CC BY-SA photograph of the print, studied only).
- Toriyama Sekien's *Hone-onna*, *Ubume* and *Nure-onna* (Wikimedia Commons).
- Utamaro's *Yamauba and Kintoki* (Met DP135601, CC0).
- Hokuei's and Toyokuni's Oiwa prints in the Met (76565, 45290), seen in search only.

**What they show.**

- **Okiku.** Okiku's neck is a long serpentine coil of stacked plates. Her hair falls in a great black mass beside it, her face is a white profile, and one thin curl of breath drifts out. The well is a ragged plank curb overgrown with ivy.
- **Oiwa.** Oiwa's face merges with a torn lantern: one eye drags down under a swelling, and the hair is thin.
- **Hone-onna.** Hone-onna looks like a living young woman in a patterned kimono, carrying a peony lantern at a gate.
- **Ubume.** The ubume wades in the river in rain with wet loose hair, holding the baby.
- **Yamauba.** Yamauba's hair is long and wild.

**What was built.** `ukiyoe-onna.ts` adds:
- six ghost faces with the `reveal` action, in every view;
- the peony lantern, the baby and the candle crown;
- eight generic looks.

`ukiyoe-yokai.ts` adds `okiku`, and `ukiyoe-interior.ts` adds the `well` motif. Storybook has **Women ghosts**, and the Motifs gallery has the well.

**Review rounds.**

1. **Close-ups of all eight looks**, in four views, before and after the reveal.
   - The futakuchi mouth in profile was too small to see behind the bun; it is now almost twice the size, with a tongue.
   - Oiwa's swelling looked like a lens, with a hard outline; it is now an uneven bruise sagging onto the cheek.
   - The yamanba's spiky "wild" hair read as a starburst. She now has long white hair.
2. **Okiku.** The first coil was a few small plates and the face was tiny. She now has seventeen overlapping plates, a heavier mass of hair and a larger head, which is closer to Hokusai.
3. **The lineup.** A ground block covered only half the frame (rect nodes are centred), and the labels were checked for gaps between them.

**Not done.**

- The ame-onna and tsurara-onna are composed from existing pieces (long wet hair with rain; the snow woman in icy colours). They have no look of their own.
- The funayūrei and nure-onna are left for F12, with the sea monsters.
- Oiwa has no lantern-face version.
- The skull reveal does not show the bones of the body.
- Nobody has done a human visual review yet.

## Folk work and props (folktale queue F15, 2026-11-15)

**Sources** (public domain, the Met):

- the six-panel screen *Farmers' Lives in the Twelve Months* (44674), studied at full resolution;
- Ishikawa Toyonobu's *Woman Washing Clothes* (55779).

**What they show.**

- **Farmers.** The farmers work bent over, with their sleeves tied back and headbands on, and their robes hitched up over bare legs. Hoes are carried on the shoulder. Lunch comes out to the field on a carrying pole, and an ox draws the plough.
- **The washerwoman.** She hitches up her robe and works at the water's edge.

**What was built.** `ukiyoe-folk.ts`:
- the `chop`, `hoe`, `pound`, `wash` and `shake` actions;
- the axe, hoe and pestle on a tool timeline with IK hands;
- strike chips, clods and mochi;
- the mallet of luck with pouring treasure;
- rice ball, firewood bundle and Hachikazuki's bowl;
- the `stump`, `usu` and `tarai` motifs;
- `folkScene()`.

Storybook has **Folk work**, and the Motifs gallery has three new tiles.

**Review rounds.**

1. **Tracking the axe frame by frame** over one stroke: the slow lift, the hold at the top, the fast drop over the head and the bite into the block.
   - With long sleeves raised overhead, the sleeve covered the face. Workers now have short sleeves, like the screen's tied-back sleeves.
   - The hoe's contact frame fell between whole frames, so its contact pulse could be missed. The stroke's phases now land on whole frames.
   - The test checks that the head is exactly on its contact point every stroke, and that the drop is more than twice as fast as the lift.
2. **Scenes.**
   - The pink horizon showed in a gap between the hills and the ground. The ground was raised and the figures made bigger.
   - A ricefield strip read as stray stripes; it was replaced by furrows under the hoe.
   - The treasure was too small to see and has been enlarged.

**Not done.**

- Carrying a person on the back (Ubasute-yama).
- Sewing, the needle-sword and the one-inch boy's bowl boat.
- Tools in the square views.
- A tray of cups.
- Nobody has done a human visual review yet.

## Effects and magic (folktale queue F14, 2026-11-15)

**Sources** (public domain):

- the *Kitano Tenjin engi emaki* (13th century, Met 45428), the hell-fire passage;
- Hiroshige's *Fox Fires on New Year's Eve at the Changing Tree, Ōji* (Met DP121555, via Wikimedia Commons).

**What they show.**

- **Fire.** Fire streams sideways in long vermilion tongues with curled tips, white and grey smoke rolls in bands, and speed lines sweep through.
- **Fox-fires.** Each fox carries a small teardrop flame by its head, yellow inside and red at the edge, and far fires string out across the dark field.

**What was built.** `ukiyoe-effects.ts`:
- the `fire` and `halo` motifs;
- the `smoke`, `lightning`, `ash` and `foxfire` particles;
- `effectScene()`.

Storybook has **Effects**, and the Motifs gallery has two new tiles.

**Review rounds.**

1. **Smoke billows.**
   - The billows were drawn as one scalloped polygon and came out as spiky stars and gears. Each billow is now a cluster of round lobes drawn as one outlined union.
   - The union outline showed every lobe through the translucent fill. The fill is now opaque, and the cloud fades as a whole group. The same fix went into the creature `transform` puff, which had the same see-through outlines.
2. **Flames.** The flames were an even fence. Their count, width and height now vary, and the tips curl less.
3. **Lightning.** The bolt was too thin to read at film size and has been thickened.
4. **Henge timing.** The woman appeared a frame before the fox vanished. She now appears after the puff's midpoint, and the test checks this.

**Not done.**

- The earthquake has only the camera shake, with no falling objects.
- Magical growth, such as a stalk shooting up, has no effect of its own.
- No flame-carrying creature for Click-Clack Mountain's burning load.
- Nobody has done a human visual review yet.

## Not yet matched (honest gaps)

- No true **karazuri** blind embossing depth or **kirazuri** mica sparkle beyond a light emboss filter.
- Faces have one design per hairstyle in each view. There are no expressive brow and eye shapes yet.
- The wave's foam is procedural. It is now one connected white like the print's, but every claw is built from the same palm-and-talon unit, so it lacks the print's hand-drawn variety of claw sizes and the long lace trailing over the back.
- The wave breaks one way only: a plunging breaker. There is no spilling breaker for the small background waves, and the falling curtain has no motion smear at its fastest frames.
- Creature fur is procedural carved hairlines and tufted edges. It is closer to Koson's prints but not hand-carved. Figures and animals turn three-quarter, and figures and four-legged animals can face front or back. Birds, the dragon and the yōkai cannot, and there is no animated turn between views.
- Sound is recorded ambience beds (river, stream, wind, rain, surf, distant fireworks, crickets). There is no music and no hits timed to frames (a crash on the wave's break, each firework). Nobody has listened to the mix yet.
- Human normal-speed review of the film has **not** been recorded.
