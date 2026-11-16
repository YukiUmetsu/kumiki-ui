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

## Kami and heavenly beings (folktale queue F9, 2026-11-15)

**Sources** (the Met, public domain):

- the netsuke of a tennin (59277);
- a 7th-century flying apsara tile (60778);
- Kōno Bairei's *Luring the Sun Goddess Amaterasu Out of a Cave with Music* (670889);
- Totoya Hokkei's *Ebisu and Daikoku* (54017).

**What they show.**

- **Celestials.** The flying celestials arch along their flight with their robes trailing behind. A long scarf streams and loops above them; the hair is in a crowned topknot, with swirling cloud around them.
- **Daikoku.** A soft round cap, a raised mallet and a great white rice bag over the shoulder, laughing.
- **Ebisu.** A folded tall cap, a fishing rod, and a red sea bream held to his chest.

**What was built.** `ukiyoe-kami.ts`:
- the `fly` action and the hagoromo `stole`;
- magatama beads;
- `mizura` and `tenko` hair, and the `zukin` cap;
- the mirror, tsurugi, hoko and tai props, and the rice bag;
- the `kumo` cloud;
- six looks and `kamiScene()` with four scenes.

Storybook has **Kami**, and the Motifs gallery has the cloud.

**Review rounds.**

1. **Cast sheets** of the six looks in profile and front.
   - The mizura loops read at the ears.
   - The bag, cap, fish and spear all attach to the hands or back.
2. **Scenes.**
   - The tennyo's flight was checked at mid-path: she is off the ground, with the scarf stretched behind.
   - The storm god's grey cloud vanished against the storm sky and is now white.

**Not done.**

- No Seven Lucky Gods beyond Ebisu and Daikoku.
- Konohanasakuya-hime, the kagura dance and the rock-cave door being rolled away are not built.
- Flying is a lean, not a full horizontal body like the apsara tile.
- Nobody has done a human visual review yet.

## Warriors II (folktale queue F5, 2026-11-15)

**Sources.**

- The Met's *Armor (Yoroi)*, early 14th to early 15th century (23025, Arms and Armor), studied from the museum photograph.
- The armour and sword observations already in this study (U3a).
- No archery or naginata print was studied for this slice. That gap remains, along with Kuniyoshi's and Yoshitoshi's warrior prints.

**What it shows.**

- **Horns.** The gilt horns rise tall and almost straight from a plate on the brow, far above the riveted bowl.
- **Neck guard.** It flares very wide, like a low roof over the shoulders.
- **Breastplate.** Covered with a stencilled diamond leather panel.
- **Skirt plates.** Broad, reaching nearly to the knees, densely laced in rows.
- **Shoulder boards and tassels.** Large square boards, and orange knotted tassels.

**What was built.** `ukiyoe-bushi.ts`:
- the `armor` ō-yoroi and the `kabuto`, in every view;
- the `yumi` prop with the `shoot` timeline (raise, draw by IK, hold, loose on `contact`, the arrow flying to `aim` and sticking);
- the `naginata`;
- the `mato` target;
- `bushiScene()`.

Storybook has **Warriors**.

**Review rounds.**

1. **Tracking a shot frame by frame:** raised, drawn to the ear, held, loosed, in flight, stuck. The aim had been offset to the target's edge and now lands at its centre; the test checks this for all three arrows.
2. **Front view.** The helmet's neck guard covered the face. It now flares only at the sides.
3. **Against the yoroi photograph.** The horns were short and curled; they are now tall and straight. The neck guard was narrow and is now wide.

**Not done.**

- Archery and naginata print references.
- The agemaki tassels.
- Mounted warriors.
- A naginata fighting timeline; it is only carried.
- Toad magic.
- The ghostly Heike army.
- Nobody has done a human visual review yet.

## Animals II (folktale queue F4, 2026-11-15)

**Sources** (the Met, public domain):

- Yashima Gakutei's *Red Carp Ascending a Waterfall* (54158);
- Hokusai's *Crab and Rice Plant* (54091);
- Teisai Hokuba's fans with crane and minogame (54177).

The four-legged rig itself follows the Koson and Kuniyoshi studies earlier in this document. No new bear, boar, deer, ox or wolf print was studied for this slice.

**What they show.**

- **The carp.** Deep-bodied, its scales a net of crossing diagonals with each diamond a scale. Large fins ribbed with rays, a gold eye, the body spotted.
- **The crab.** A round pale carapace, thin jointed legs, and furry "mitten" claws held up.
- **The minogame.** Its long fan of seaweed trails behind the shell.

**What was built.**

- Six four-legged species and two birds, from the parameter tables.
- Six critter rigs.
- `animalScene()` with four habitats.
- Storybook **Animals**, and 14 new Bestiary specimens.

**Review rounds.**

1. **Menagerie sheet.**
   - The bear's legs vanished in its fur, so they are longer now.
   - The boar's tusks were too small to see and have been enlarged.
   - The ox looked like a black dog. It now has bigger horns, a blunter muzzle and no grey cheek.
   - The carp was a thin sardine; it is now deeper.
2. **Front views.** The bear's face was black on black and now has a brown muzzle.
3. **Habitats.**
   - The hawk floated in mid-air and is now on a post.
   - The carp sat on top of the pond and now swim under a translucent surface.
   - The mice ran through the ox and now run in front of it.
4. **Against Gakutei.** The carp's scale pattern was replaced with his net of diagonals, and ribbed pectoral and pelvic fins were added under the belly. They first came out on the back and were moved.

**Not done.**

- Bear, boar, deer and ox prints have not been studied.
- The crab's furry mittens.
- The hawk's hooked beak.
- The critters, hawk and duck have no front or back views.
- Centipede and giant toad (F12).
- Nobody has done a human visual review yet.

## Temples, shrines and graves (folktale queue F8, 2026-11-15)

**Sources.**

- Public domain prints:
  - Hiroshige's *Kinryūzan Temple at Asakusa* (Met 56689);
  - *Gion Shrine in Snow* (55998);
  - *Evening Bell at Mii Temple* (49931);
  - Yoshitoshi's *The Southern Gate* (Wikimedia Commons).
- A photograph of the Saikyō-ji bonshō in Fukuoka (Wikimedia Commons, CC BY-SA 4.0). It was studied only and is not redistributed.

**What they show.**

- **Asakusa gate.** The vermilion two-storey gate frames the hall, its great red lantern hanging in the opening, a pagoda beyond, all in snow.
- **Gion shrine.** Stone lanterns stand inside the shrine fence, and the torii is snow-laden.
- **Rashōmon.** Massive red pillars.
- **The bonshō.** Verdigris bronze; rows of raised nubs in the upper panels; crossing raised bands; two lotus striking seats; the dragon loop; the log striker hanging on chains at the side.

**What was built.** `ukiyoe-temple.ts`:
- the `belfry`, `hondo`, `gate`, `hokora`, `graves`, `toro` and `hut` motifs, sharing the castle's roof;
- `bellStrike` timing;
- `templeScene()`.

The well came earlier, with F3. Storybook has **Temples**, and the Motifs gallery has eight new tiles.

**Review rounds.**

1. **The graveyard.** The wooden sotoba stood twice the height of the stones and swamped them. Both have been rescaled.
2. **The bell.** Checked at a strike and while ringing, and confirmed by test: the log is drawn back, meets the bell on the strike frame, and the bell sways afterwards.

**Not done.**

- The castle roof gives every temple the same eave with its pale underside. There are no curved Buddhist roof profiles.
- No pagoda interior, and no bell wrapped by the serpent (F12).
- The Rashōmon's ruin has no broken rafters.
- Nobody has done a human visual review yet.

## Animal yōkai (folktale queue F6, 2026-11-15)

**Sources** (public domain, Wikimedia Commons): Toriyama Sekien's *Kamaitachi* and Hokusai's *Baku*.

**What they show.**

- **Kamaitachi.** The whirlwind is a great flat spiral of grey bands seen face on, weasels curled in its turns and leaves caught along it.
- **Baku.** A shaggy, densely hatched tawny beast with a long curling trunk, small tusks, clawed paws and a bushy tail, crouching with its head low.

**What was built.**

- Two-tailed cats, the towel, glowing eyes and the carried key, jewel or scroll.
- The `weasel`, `baku` and `ape` species.
- The `whirlwind` particle.
- `animalYokaiScene()` with six scenes.
- Storybook **Animal yōkai**.

**Review rounds.**

1. **First sheet.**
   - The whirlwind was a few faint ellipses round the weasels. It is now Sekien's spiral with leaves on its bands; one weasel sleeps at the heart and two are carried round.
   - The baku was a grey striped boar, closer to the charm pictures than to Hokusai. It is now shaggy and tawny, with a long fur coat and a bushy tail.
2. **Scenes.** The two-tailed nekomata, the dancing towelled cats with glowing eyes, the following wolves' eyes and the messenger fox's key were all checked on stills.

**Not done.**

- No transformation from a cat into a woman.
- No inugami.
- The satori ape does not speak its mind-reading lines.
- The yamabiko has no echo effect.
- Nobody has done a human visual review yet.

## Trees and forest spirits (folktale queue F13, 2026-11-15)

**Sources** (public domain):

- Sakai Hōitsu's *Persimmon Tree* (Met 45392);
- the *Taketori Monogatari* scroll (Wikimedia Commons);
- Toriyama Sekien's *Kodama* (Wikimedia Commons).

**What they show.**

- **Hōitsu's persimmon.** A gnarled trunk bending up from a grassy bank into a few angular branches, sparse leaves, and only a handful of round vermilion fruit with dark calyxes.
- **Sekien's kodama.** The spirits of a hundred-year-old pine: an old man and woman in robes emerging from the trunk.
- **The Taketori scroll.** The bamboo cutter's family in a thatched house.

**What was built.** `ukiyoe-trees.ts`:
- the `bamboo`, `kaki`, `shinboku` and `jinmenju` motifs;
- `treeScene()` with five scenes.

Storybook has **Trees**, and the Motifs gallery has five new tiles.

**Review rounds.**

1. **First sheet.**
   - The persimmon was loaded with fruit like a cherry; it now carries a few, as in Hōitsu, on a thicker trunk.
   - The jinmenju's heads bunched on one branch and are now spread over the crown.
   - The sacred tree's trunk was a straight column. It now flares into roots and twists as it rises.
2. **Scenes.** The shining stalk's glow, the face opening and the vampire tree's reaching arms were checked on stills.

**Not done.**

- The kodama spirits are ordinary figures fading in, not drawn emerging from the trunk.
- No cherry tree that blooms on its own; that comes from the `sakura` motif's progress (F14).
- The bamboo stalk does not split open to show the child.
- Nobody has done a human visual review yet.

## Heian court (folktale queue F2, 2026-11-15)

**Sources** (the Met, public domain):

- the Tosa-school *Evening Face* scene of the Tale of Genji (45743);
- Hokusai's *Court Lady* (57286);
- the 16th-century *Aoi* chapter scroll (670936).

**What they show.**

- **The lady.** She wears pink layered robes over a red hakama, her hair straight and loose to the floor. Hokusai's seated lady spreads in many coloured layers, each edge showing at the sleeve and the hem.
- **The noble.** Green robes, a black cap with its standing tail, a baton.
- **The ox-cart.** A black-lacquered house on two great spoked wheels, with a blind across the front.
- **The palace.** The Aoi scroll's rooms are seen from above, with blinds and screens framing the people.

**What was built.** `ukiyoe-heian.ts`:
- the `heian` hair and the `kanmuri`;
- the `shaku` and `hiogi`;
- court looks;
- the `gissha`, `sudare`, `kicho` and `shinden` motifs;
- `heianScene()`.

Storybook has **Heian court**, and the Motifs gallery has four tiles.

**Review rounds.**

1. **Cast sheets in profile and front.**
   - The noble carried an Edo katana that stuck out at the hip; it has been removed.
   - The layers show at the hem in the front view.
2. **The veranda.**
   - The palace was drawn over the lady, hiding her, and she floated above the floor.
   - The palace now splits into back and front. She kneels on the floor between them, seen dimly through the translucent blinds, which roll half up as the noble comes.
3. **The ox-cart.** The ox did not reach the shafts, and an attendant overlapped the cart. The ox now stands in the shafts and the attendants walk clear.

**Not done.**

- Layered sleeves spilling out under the blinds (uchiide no kinu).
- No seated spread-robe pose: the kneeling robe does not fan out like Hokusai's lady.
- No bugaku dancers or court music.
- Nobody has done a human visual review yet.

## Folk yōkai (folktale queue F7, 2026-11-15)

**Sources** (public domain, Wikimedia Commons): Toriyama Sekien's *Akaname*, *Nurarihyon* and *Dodomeki*, and Takehara Shunsen's *Azukiarai*.

**What they show.**

- **Akaname.** A wild-haired imp with a long tongue and one-toed clawed feet, peeking into a bathhouse past the tubs.
- **Nurarihyon.** An old gentleman in fine robes with an enormous bald gourd of a head, sitting at ease on a veranda.
- **Azukiarai.** A squat, grinning little man washing beans in a tub at the stream's edge.
- **Dodomeki.** A veiled woman in long robes; the legend covers her arms with eyes.

**What was built.** `ukiyoe-folkyokai.ts`:
- the gourd head, the straw cape, the eyes and the bean basket;
- the `throw` action with sand;
- the `akaname` yōkai;
- eight looks;
- `folkYokaiScene()`.

Storybook has **Folk yōkai**.

**Review rounds.**

1. **First sheet.**
   - Nurarihyon's head was barely bigger than a bald man's and is now a great gourd.
   - The akaname looked like a kiwi bird. It is now Sekien's crouching imp, with knees up and an arm reaching to the floor.
   - Dodomeki's eyes were too small to see, and the straw cape was a patch on the shoulders. Both have been enlarged.
   - The bean basket was hidden because the hands were apart; the figure now holds it in both hands.
2. **The throw.** The sand was too fine to see; it now has bigger grains and a dust glow.

**Not done.**

- The konaki-jiji does not turn into a stone.
- The yukinko does not melt.
- Nurarihyon does not smoke or drink.
- The akaname has no front view.
- Nobody has done a human visual review yet.

## Giant monsters (folktale queue F12, 2026-11-15)

**Sources** (public domain, Wikimedia Commons):

- Kuniyoshi's *Takiyasha the Witch and the Skeleton Spectre*;
- his *Kuwana* sea monk;
- Yoshitoshi's *Susanoo slays Yamata no Orochi*;
- the *Kashima kaname-ishi* namazu-e.

**What they show.**

- **The skeleton.** It leans in through the ruined palace. Its huge skull fills the frame, the ribs are drawn bone by bone, and one hand of long finger bones reaches toward the warriors.
- **The sea monk.** A vast smooth black head looms over a cargo boat in the waves, with tiny white eyes.
- **Orochi.** Dark coils in breaking surf.
- **The catfish.** A great black catfish with long whiskers, pinned by the god with the keystone.

**What was built.** `ukiyoe-giants.ts`:
- six giant species;
- `giantScene()` with eight scenes.

The toad uses the frog rig at large size, and the daidarabotchi uses the figure rig scaled up. Storybook has **Giants**.

**Review rounds.**

1. **First sheet.**
   - The skeleton's skull was cut off at the top and too small for Kuniyoshi's; it is now larger and lower.
   - The sea monk's boat was a sliver with a full-size sailor on it. It is now a proper boat with a small boatman, and the streaming water is subtler.
   - The catfish's dorsal fin read as a shark's and is now small and rounded. A house sat on its body, and later floated; it now stands on the ground behind.
   - The serpent on a bell hanging in the belfry was too small. The bell is now down on the ground, with the serpent coiled round it, as in the story.

**Not done.**

- The nure-onna and funayūrei are not built.
- The gashadokuro has no legs; it always rises from the ground.
- Orochi's heads do not drink from the sake vats.
- The catfish has no keystone and no god.
- Nobody has done a human visual review yet.

## Tsukumogami (folktale queue F11, 2026-11-15)

**Sources** (public domain, Wikimedia Commons): Toriyama Sekien's *Biwa-bokuboku*, *Wanyūdō*, *Mokumokuren*, *Kosode-no-te* and *Oboro-guruma*.

**What they show.**

- **Biwa-bokuboku.** A lute for a head on a robed body, walking with a staff, one hand raised.
- **Wanyūdō.** A heavy cart wheel with a man's head as the hub, flames swirling round it as it rolls.
- **Mokumokuren.** A neglected room's shoji with an eye in every pane.
- **Kosode-no-te.** Pale hands reaching from the sleeves of a robe on its rack.

**What was built.** `ukiyoe-tsukumo.ts`:
- four yōkai;
- the `ikou` rack;
- the room's eyes and the cart's face;
- `tsukumoScene()` with seven scenes.

Storybook has **Tsukumogami**, and the Motifs gallery has a rack tile.

**Review rounds.**

1. **First sheet.**
   - The wanyūdō's flames streaked like comets; they are shorter now.
   - The rice field was hidden under the ground and now lies on it.
   - The biwa-bokuboku and the cotton strip were too small, and a startled farmer was added for scale.
   - The eyed shoji were too crowded and now fill 70% of the panes.

**Not done.**

- Bunbuku's tightrope act.
- The ittan-momen wrapping a man.
- The wanyūdō has no captured wheel.
- The biwa does not play.
- Nobody has done a human visual review yet.

## Other realms (folktale queue F10, 2026-11-15)

**Sources**:

- Kuniyoshi's *Recovering the Stolen Jewel from the Palace of the Dragon King* (Met DP146820, CC0);
- Shunsai Toshimasa's *Origin of the Cave Door Dance* (Wikimedia Commons, public domain);
- Yoshitoshi's *Gekkyū no mukae* (Commons, public domain);
- Hiroshige's *Tanabata Festival* (Met DP121512, CC0).

**What they show.**

- **The Dragon Palace.** Kuniyoshi draws the sea's interior as a mass of blue-green breakers with sea creatures and the dragon.
- **The rock cave.** Toshimasa fills the cave scene with orange and gold rays, Uzume dancing on a tub and the gods drumming.
- **The moon.** Yoshitoshi's Kaguya rises on clouds with her attendants and a parasol while the old man reaches after her.
- **Tanabata.** Hiroshige's bamboo poles carry paper strips, a gourd and streamers over the roofs.

**What was built.** `ukiyoe-realms.ts`:
- nine motifs;
- the `bubbles` particle;
- `realmScene()`: six realms, each with a camera move or keyed event that carries the viewer in.

Storybook has **Realms**, and the Motifs gallery has five tiles.

**Review rounds.**

1. **First sheet.**
   - The sky behind the dive ran out at the right as the camera moved; it is now wider.
   - Fish crowded the palace roofs and now swim to its left.
   - The Tanabata ox stood on nothing; it is now on the cowherd's cloud.
   - The bamboo pole was taken out of the star sky.
2. **Checked on stills.** The dive (above the waves, under the surface, at the gate), Kaguya's ascent, the bridge filling, the cave opening and Yomi closing.

**Not done.**

- The sea interior is a calm gradient, not Kuniyoshi's breaking waves.
- No Otohime, no tamatebako, no dragon in the palace.
- Kaguya's attendants and parasol are missing.
- Yomi's hags do not pursue.
- Nobody has done a human visual review yet.

## Processions and parades (folktale queue F16, 2026-11-15)

**Sources**:

- Mochizuki Gyokusen's *Copy of Night Parade of One Hundred Demons from the Shinjuan Collection* (Met 816210, CC0);
- the inrō *Case with Design of Fox Wedding Procession in Rain* (Met 58612, CC0);
- Yamamoto Shōun's *Fox wedding procession* (Wikimedia Commons, public domain).

**What they show.**

- **The night parade.** Oni, beasts and household objects stride and dance one after another across the scroll. Each
  figure is spaced by its own size. There is no ground line, only the order of the march.
- **The fox weddings.** Foxes walk upright in kimono. One carries a lantern on a pole, and two carry the bride's
  palanquin on a pole between them. Rain slants across the whole scene.
- **Shōun's print.** Foxes in haori and hakama walk in a line with paper lanterns, heads level.

**What was built.** `ukiyoe-parade.ts`:
- animal heads and tails for figures (`look.animal`);
- the `kago` palanquin;
- `procession()`;
- `paradeScene()`: three parades.

Storybook has **Parades**.

**Review rounds.**

1. **First sheet.** The night parade bunched up and members overlapped; `procession()` now spaces each member by its
   width plus a gap.
2. **Palanquin drift.** The kago's keys eased in and out while the walks ran at a constant pace, so the box slid off its
   pole between the bearers. Its keys are now linear, with the walk's short acceleration at each end.
3. **Travel units.** Figure and creature travel is in scene pixels, not scaled with the member. The parade divided
   travel by scale, so the bearers lagged 230 px behind the palanquin by frame 300. Fixed and checked on a still at frame
   300: the box hangs between its two bearers.

**Not done.**

- The bearers' hands do not grip the pole.
- The mouse wedding has no trousseau chest.
- The sunshower has rain but no rainbow, and the sun does not light the drops.
- The night parade has no dancing or hopping beyond the umbrella.
- Nobody has done a human visual review yet.

## YouTube episode template and Kasa Jizō (folktale queue F17, 2026-11-15)

**Sources**:

- Hiroshige's *Evening Snow at Kanbara* (Met 56915, CC0);
- the netsuke *Daikoku and Bag on Rice Bale* (Met 59066, CC0).

**What they show.**

- **Kanbara.** Travellers bend under wide, shallow straw kasa. The ribs run from the crown to the brim, and the hat is
  much wider than the shoulders. Thatch carries thick, rounded snow caps. Snow falls as scattered dots over a grey sky
  that darkens at the top.
- **The rice bale.** A barrel-shaped tawara with straw running lengthwise under rope bands. Its round end cap is
  puckered into a centre knot.

**What was built.**

- `ukiyoe-village.ts`: hats, bales, the loaded sled, and hat and cloth for the jizō.
- `ukiyoe-episode.ts`: the episode template.
- `ukiyoe-film-slot.tsx`: moved from `src` into the pack.
- `src/video/ukiyoe-kasa-jizo.ts`: the episode.

**Review rounds.**

1. **Art sheet.** The hats sit on the jizō heads, one mid-drop and the cloth on the sixth, and the bales read with
   their ropes and end caps.
2. **First stills.**
   - The end card's vertical cartouche covered the seal and hid the next-story line. They now stand beside it.
   - The night snowfield read as a lake. It is now pale snow.
   - The market and jizō shots were small in frame. Their cameras moved closer.
   - The hats at the hearth sat on its rim.
3. **Portrait stills.**
   - The house was cut at the left of the end card.
   - The old woman fell out of the hearth frame.
   - At the night shot's open, the jizō were still off-frame. The camera now follows the lead jizō to the door.
4. **`film:review`, first runs.** It found three faults in shared code, each fixed where it starts:
   - **Caption plates in a scaled preview.** The plates were 0.59 of the text's width, because text was measured in
     screen pixels while the lane was in layout pixels. Text is now measured in layout pixels.
   - **Caption type size.** `cqw` caption sizes fell back to the page's viewport, so captions were 55 px instead of
     42 px in Storybook. The caption layer is now a size container.
   - **Safe area.** Captions sat below YouTube's bottom safe area. They now keep to the preset's safe area.
5. **Caption length.** Five narration lines needed three lines on 9:16. They were split, and the script check now
   estimates the two-line fit itself.
6. **Final check.**
   - `film:check` passed with no warnings.
   - `film:review` of both outputs found 0 errors and 12 warnings: the last frame faded to black, the mist crossing the
     title, and the seal's contrast. The audit reads an SVG text's CSS colour, not its fill, so the seal reads as 1:1
     though its light glyphs stand on red.

**Not done.**

- No voice yet. The captions are script estimates until a narration is recorded and aligned.
- The sound is wind beds only, with no hearth crackle or footsteps.
- No full render (a low-res draft is next, on request).
- The jizō walk as small grey figures, not carved stone.
- Nobody has done a human visual review yet.

## Tiled roofs (owner request, 2026-11-15)

**Sources**:

- Hiroshige's *Suruga Street* (Met 37052, CC0);
- Hokusai's *Nihonbashi in Edo* (Met 56394, CC0);
- Kusakabe Kimbei's photographs *Honchō-dōri, Yokohama* and *Theatre Street* (public domain);
- Totoya Hokkei's *Roof Tile and Sparrows* (Met 54171, CC0).

**What they show.**

- **Suruga Street.** Every roof is straight: straight eave, straight hips and verges, level ridge. The tile rows are
  dense parallel lines down the slope, darker toward the eave. The ridge is a tall layered band, with an onigawara at
  each end: a tall block with a curl and a round crest tile.
- **Nihonbashi.** The storehouses are gabled. Their massive ridges stand proud and throw a dark shadow down the roof,
  and their white gables carry the family mark.
- **The photographs.** Kawara are silver-grey, not black. Round caps catch the light over dark troughs, and the eave
  edge is a bead line of round tile ends.
- **Hokkei.** The onigawara is matte mid-grey, with scroll curls and a stamped tomoe roundel.

**What was built.**

- `roof()` was rebuilt:
  - kawara rows down the slope, with courses of small arcs, an occasional bright cap and a sheen gradient;
  - the bead of tile ends with their bosses along the eave;
  - plaster or wooden rafters under the eave (`soffit`);
  - stacked ridges with onigawara, layered hips and a heavier ridge for storehouses;
  - a gabled form (`gable`) with a plaster gable, crest and tiled verge;
  - snow capping the ridge and onigawara.
- `kawaraRows`, `kawaraEave` and `KAWARA_SHEEN` are shared with the `house` motif's `tileRoof`.

**Review rounds.**

1. **First pass.** The tile lines fanned toward the ridge, and the roof was a flat dark mass. The rows now run straight
   down the slope.
2. **Zoomed in.**
   - The rows read as corrugated metal. The courses are now arcs.
   - The storehouse's onigawara looked like ears and are now smaller.
   - Its hip-and-gable "beak" was replaced by a proper gable.
   - Its stray gold gable ornament was removed.
3. **Owner, "those roofs should not have curved outline, compare with references".** They now match: straight by
   default, with only a gentle `sori` (.3–.35) on castle keeps and temple halls.
4. **Snow.** The snow sat below the taller ridge. It now caps the ridge and the onigawara.

**Not done.**

- No hand-placed broken or slipped tiles.
- No moss or weathering.
- The onigawara have no demon faces.
- Nobody has done a human visual review yet.

## Urashima Tarō (episode E2, 2026-11-15)

**Sources**:

- Yanagawa Shigenobu's *Hanatsuru as the Dragon Princess Otohime* (Met 845812, CC0);
- Totoya Hokkei's *Urashima Tarō Going Home on the Back of a Tai* (Met 54029, CC0);
- Kawanabe Kyōsai's *Urashima Tarō Riding on a Tortoise* (Met 50771, CC0);
- a lacquered tebako (Met 45492, CC0).

**What they show.**

- **Otohime.** A gold dragon coiled as a crown, long loose black hair, a dark-blue seigaiha robe with coral sprigs over
  vermilion and green layered collars, a long front panel, striped hems, a fan.
- **The Dragon King.** A dragon crown, a red robe and a white beard.
- **Urashima.** A young man with a topknot in a blue jacket with a rod and creel. He rides a minogame, a turtle with a
  long seaweed tail, which the pack already had. The palace floats far off in mist.
- **The box.** A deep lid overlapping a box with rounded corners, gold maki-e on lacquer, ring fittings for the cord.

**What was built.**

- `ukiyoe-ryugu.ts`: dragon crown, tamatebako prop and motif with its smoke, looks, `agedLook()`.
- `src/video/ukiyoe-urashima.ts`: the eight-shot episode, which reuses the realm motifs for the dive and the palace.

**Review rounds.**

1. **Art sheet.**
   - The crown was too small to read and is now 1.4× larger.
   - The Dragon King's green coat hid his red robe.
   - The held box was a speck in one hand. It is now larger and held up in both hands.
   - The smoke curls stacked into a coiled spring. They are now scroll marks on every other billow.
2. **First landscape stills.**
   - Figures were small under a big sky. The shore cameras moved closer.
   - The turtle was too large next to the children, and a boat stood in its path to the sea.
   - The palace dwarfed the figures.
   - The smoke rose beside Tarō instead of over him. It now leans onto him and covers his head at the swap.
3. **Portrait stills.** Tarō arrived outside the frame on the beach, and he was cut at the palace. Both cameras were re-aimed.
4. **`film:check`.** Passed.
5. **`film:review`.** 0 errors on both outputs, and 10 warnings: the seal under the mist, and the last frame faded to black.
6. **Captions over people.** In Storybook, "and he was an old, old man" sat across the old man. A new script check,
   `ukiyoeCaptionCovers`, projects every figure through the camera at each cue's middle frame. It flagged 31
   cue/figure pairs in six shots; Kasa Jizō had none. The cameras were moved until no figure lies more than a third
   inside the caption band. After that, `film:review` found 0 errors and 11 warnings, all inside the mist transition
   and the final fade.

**Not done.**

- The palace's four-season rooms.
- Otohime's front panel and striped hems.
- The CSV's expansion ideas (the time-dilation palace, the tsunami backstory).
- A voice.
- Sound beyond surf and underwater beds.
- No video render yet.
- Nobody has done a human visual review yet.

## Momotarō (episode E3, 2026-11-15)

**Sources**:

- Utagawa Toyoharu's *Momotarō and His Animal Friends Conquer the Demons* (Wikimedia Commons, public domain);
- Yoshitoshi's *Momotarō Goes to Devil's Island* (Commons, public domain);
- the Momotarō inrō by Kogyoku Tokayo (Met 45583, CC0).

**What they show.**

- **Toyoharu.** The beaten oni crawl and bow, with the treasure heaped on a tray: tied sacks, red coral, the mallet,
  the hat and straw cloak of invisibility.
- **Yoshitoshi.** Momotarō in a headband with a sword. The monkey wears a red vest and the dog a red scarf, and a tall
  nobori banner flies with a small streaming flag at its head.
- **The inrō.** Momotarō with a pack on his back, the dog sitting before him.

**What was built.**

- `ukiyoe-treasure.ts`: banner, dumplings, treasure heap, handcart.
- `src/video/ukiyoe-momotaro.ts`: eight shots, reusing the splitting peach, the oni fight, the animal rigs, Onigashima
  and the boats.

**Review rounds.**

1. **Art sheet.** The dog read as a fox. The episode now draws it white, the folktale dog.
2. **Landscape stills.**
   - The peach sat in the fire pit, and the baby was too small.
   - The country sky was pink to the top.
   - The monkey never left its tree. For creatures, `leap` is an in-place jump; `hop` travels. It then landed on the
     dog and now lands on Momotarō's other side, turned to face him.
   - The grandparents were cut at the end card's edge.
3. **Portrait stills.** The boat, the surrender and the homecoming lost their subjects at the edge. The cameras now pan
   with the action.
4. **Checks.** `film:check` passed. The script check, including caption covers, reports nothing. `film:review` of both
   outputs found 0 errors.

**Not done.**

- The animals' costumes (vest, scarf).
- The oni's kneeling loincloth reads as tents.
- The fight shows the animals' attacks briefly, not Toyoharu's melee.
- No voice.
- No video render yet.
- Nobody has done a human visual review yet.

## Kaguya-hime (episode E4, 2026-11-15)

**Sources**:

- the illustrated *Tale of the Bamboo Cutter*, late 17th century (Met 45361, CC0; 74 page images, studied as contact
  sheets);
- Yoshitoshi's *Gekkyū no mukae* (studied for F10).

**What they show.**

- **The book.** Palace interiors seen from above without roofs (fukinuki yatai), green-bordered mats, gold cloud bands
  framing each scene. Kaguya appears in layered robes with long hair in a raised room, the courtiers kneeling in the
  garden. On one page, armoured guards with bows mass in the courtyard to wait for the moon people.
- **Yoshitoshi.** Kaguya rises on clouds with her attendants.

**What was built.**

- The `takegiri` motif.
- `src/video/ukiyoe-kaguya.ts`, which reuses:
  - the shining grove;
  - the Heian veranda, court looks and lords;
  - the archers' `shoot`;
  - the gissha as the moon people's flying cart on a cloud;
  - the tennyo envoys;
  - the moon palace;
  - Fuji with smoke.

**Review rounds.**

1. **Script check.**
   - The motif had never been added: a chained shell command stopped before the edit.
   - Cameras on the title, guards and ascent put figures under the captions.
   - One end-card line was too long for Shorts.
2. **Landscape stills.**
   - The radiant halo read as a sun emblem, both behind Kaguya and as the moon people's blaze. Her glow is now soft, and
     the blaze is light rays from above.
   - The host ended cut off at the top of the frame.
   - The stalk's twig read as a stick and is now a leaf spray.
   - The ascent lacked a place. It now has the wall and the kneeling archers.
   - The cloud's tail covered the old couple.
3. **Portrait stills.** All held.
4. **Checks.** `film:check` passed. `film:review` of both outputs found 0 errors and 12 warnings, all in the mist and
   the final fade.

**Not done.**

- The five treasures are named, not shown.
- No Emperor on screen.
- No elixir.
- No voice.
- No video render yet.
- Nobody has done a human visual review yet.

## Faces (quality slice Q1, 2026-11-15)

**Sources** (all Met, CC0), studied in close crops:

- Kitagawa Utamaro's *A Young Woman Reading a Letter* (36626);
- *Okita of the Naniwa-ya Teahouse* (55867);
- *Hanaōgi of the Gomeirō* (53654);
- *Hanazuma of Hyōgoya* (54862);
- *Yamauba Blackening her Teeth* (40244).

**What they show.**

- **The face.** Cut with the finest line on the block.
- **The eye.** A single long upper-lid line with a slight lift at the outer end. A small black iris hangs from it,
  partly hidden. There is almost no lower lid.
- **The brows.** Grey smudges set high, with a darker lower edge.
- **The nose.** In three-quarter, one line from between the brows to a small hook at the nostril.
- **The mouth.** Tiny: a red upper lip and a fuller lower lip, parted by a dark line.
- **The hairline.** Hundreds of fine combed strands (kewari) that fade into the skin. The hairline over the brow is the
  Fuji shape, dipping to a point.
- **The hair.** The side locks are combed into thin, see-through wings. The knot is bound with a red cloth and a paper
  tie. A tortoiseshell comb sits before the knot, with a bar through it and pins with dangling strips.

**What was built.**

- `ukiyoe-face.ts`: features, expressions and traits.
- The profile and front shimada, rebuilt.
- The front-view women's face, narrowed.
- Powdered skin for women.

**Review rounds.**

1. **Before.** Every face was a dot eye and a dash brow under a helmet of hair, and men and women differed only in
   their hair.
2. **First pass.** The hairline strands were heavy grey smears, the iris too big, and the face line too heavy. All were
   thinned.
3. **Front view.**
   - The strands were drawn in profile units, so they ran down over the whole face. They now take a unit scale.
   - The crown polygon covered the forehead.
   - The front shimada was a bowl. It is now wings, a puff, the knot, a comb and pins.
4. **Tests.**
   - The face hash first included the view, so a figure turning from profile changed face. It now hashes identity only.
   - Eye-count tests now count iris clips.

**Not done.**

- Hands are still simple.
- Men's hair in front view is unchanged.
- Hyōgo, Heian and maiko hairstyles keep their earlier hairlines without kewari.
- Nobody has done a human visual review yet.

## Wardrobe (quality slice Q2, 2026-11-15)

**Sources** (all Met, CC0):

- the Edo kosode 2001.428.44, .47, .48 and .52, and 45187;
- the summer robe with irises at Yatsuhashi (813665);
- Torii Kiyonaga's *A Young Woman with a Dog* (51998);
- Kiyonaga's *Three Women on a Riverbank* (39725).

**What they show.**

- **Commoners' robes.** Plain indigo, faintly checked or ikat-marked, with family crests on the back and sleeves.
- **The summer robe.** The design rises from the hem over a pale ground, densest at the bottom.
- **Kiyonaga's young woman.** A vermilion robe with large chrysanthemum heads on the skirt, a black obi with gold
  roundels, layered collars, and a long white under-robe at the hem.
- **The riverbank.** Vermilion, grey and black robes side by side: the colour of a street comes from many people.

**What was built.**

- Eleven patterns.
- Hem designs.
- Four obi knots and obi designs.
- `ukiyoe-wardrobe.ts`, with roles and seasons.
- Crowds dressed from it.

**Review rounds.**

1. **First sheet.**
   - The key-fret read as brickwork and is now drawn finer.
   - Old women wore the men's shaved style. They now wear a grey shimada, with age lines and unpowdered skin.
2. **Scenes.** The castle-town crowd now varies in pattern and colour. The Night Ferry's fixed cast is unchanged apart
   from its faces.

**Not done.**

- No crests on men's robes outside the kamishimo.
- No haori patterns beyond kikko.
- Nobody has done a human visual review yet.

## Follow-through (quality slice Q3, 2026-11-15)

**Approach.** Classical animation's follow-through and overlapping action, done as a damped spring over the figure's
own recent poses: the sleeve swing takes the wrists' and the body's velocity history; arm follow-through takes the pose
channels' history. No external reference was used for this slice.

**Checked frame by frame.**

- **A wave.** The arm drops from 158° and swings past the rest of 9° to −14° (−7° after softening the gain from .55
  to .4). It comes back to 15° and settles at 9° by about frame 54.
- **A walk.** Rendered frames 54–112 of a walk, a stop and a wave show sleeves and hem trailing, then swinging forward
  and settling on the stop. The long sleeve swings past after the wave.
- **Contact actions.** A `cut` figure's settled pose equals its base pose at every frame tested.

**Not done.**

- No anticipation before a gesture.
- Hair ornaments other than the shimada pin do not swing.
- No weight shift while standing.
- Nobody has done a human review at playback speed.

## Weather and fire (quality slice Q4, 2026-11-15)

**Sources** (all Met, CC0):

- Hiroshige's *Sudden Shower over Shin-Ōhashi and Atake* (55433);
- *Sudden Shower at Shōno* (36521);
- *Night Rain at Karasaki* (36531);
- *Evening Snow at Kanbara* (56915), studied for E1.

**What they show.**

- **Rain.** Hundreds of long, fine, straight lines, some crossing the whole sky, cut on two blocks: a dark sumi block
  and a grey block at a slightly different angle. The sky darkens toward the top, and the far bank greys out behind
  the rain.
- **Snow.** Flakes of very different sizes; the near ones are large and soft.
- **Fire.** In the scrolls and prints, fire is drawn as tongues that curl over into hooked tips, not as cones.

**Before.** The rain was short, sparse scratches. The snow was uniform dots. The fire was flat zigzag cones under grey
blobs.

**Review.**

- Close stills of rain and snow over a walking woman.
- The Night Ferry squall.
- Three frames of the burning field (flicker, flamelets, curls).

**Not done.**

- No rain-darkened ground or wet sheen.
- No lantern light pools.
- Smoke billows have no inner curls.
- Nobody has done a human visual review yet.

## Transitions (quality slice Q5, 2026-11-15)

**Grounding.**

- **Scroll.** A handscroll is unrolled leftward, so new pictures enter from the left. Its sheets are joined at paper
  seams.
- **Ink.** Sumi on damp paper spreads with a pale centre and a darker rim where the pigment gathers.
- **Print.** Woodblock printing lays the key block and then the colours, light to dark.

No new image reference was used.

**Review.**

1. The first ink version read as a black iris with a hard circular hole. It became translucent washes with wet rims,
   the next scene revealed through a feathered mask that lags behind the ink.
2. The transitions were checked in the `film:review` pipeline (Kasa Jizō: 0 errors). The scroll pushes the hearth off
   as the market unrolls in, and the ink blooms over the jizō before night.
3. Longer transitions made the script check flag three captions that started during them; those cues were moved.

**In the episodes.**

- **Kasa Jizō:** scroll into the market, ink into the night.
- **Urashima:** scroll to the turtle, ink to three hundred years later.
- **Momotarō:** scroll along the road, ink into the fight.
- **Kaguya:** print into her grown beauty, ink into the night at the moon.

## Sound effects (quality slice Q6, 2026-11-15)

**Sources.** Every new sound is a recording from Freesound, found through Openverse.
- **Licence check:** each one's own Freesound page shows Creative Commons 0 (a `publicdomain/zero/1.0` link and no
  attribution licence), checked on 2026-11-15.
- **Shipping:** they are trimmed into `assets/sound/recorded/`, each with its source URL and author in
  `assets/sound/catalog.json`.
- **The 38 sounds:**

| Sounds | Recording (author, Freesound ID) |
| --- | --- |
| `bell-temple-large` | Temple Bell, Valley of the Temples (Mista Bumpy, 232333) |
| `bells-suzu` | Suzu - Japanese Bell (DiSK, 519190) |
| `step-snow-1`–`5` | Footstep in the snow_01–04 (cabled_mess, 384421–4) |
| `step-sand-1`–`4` | Footsteps in Sand (kessir, 264124) |
| `bed-fire-hearth` | campfire (aerror, 350757), high-passed and gently compressed |
| `bed-wind-snow` | forest light wind through bare trees winter (kyles, 637566) |
| `bed-bubbles-underwater` | Hydrophone water bubbles 1 (thaighaudio, 349878) |
| `bed-crows-day` | A Murder of Crows in the Daytime (kactus23, 121142) |
| `bed-birds-uguisu` | Japanese bush warbler (uguisu) (warukunai, 524526) |
| `clash-sword-1`, `clash-sword-2` | Swords Clash (Christopherderp, 364529, 342393) |
| `swing-sword` | swosh swinging sword 37 (qubodup, 60024) |
| `draw-sword`, `sheathe-sword` | Unsheathing the sword and Sword sheathing (ihitokage, 395364, 395371) |
| `thud-club-1`, `thud-club-2` | HEAVY BAG DROP DIRT (burbujafilms, 392008) |
| `fall-body` | Fight and body falls on stone (craigsmith, 675925) |
| `chop-axe-1`, `chop-axe-2` | axe chop into old upside down wood rowboat (kyles, 452553) |
| `bark-dog-1`, `bark-dog-2` | A dog barking (close recording) (felix.blume, 199261) |
| `howl-dog` | Dog Howl (Latranz, 518566) |
| `flap-wings-1`, `flap-wings-2` | Bird wings flapping quickly (craigsmith, 675959) |
| `call-gull-1`, `call-gull-2` | Seagulls clean wildtrack (Soojay, 462462) |
| `hiss-smoke` | steam (JustineOu, 569449) |
| `creak-wood` | Boat creaking; moving against dock (craigsmith, 675784) |
| `lid-box-wood` | Little Wooden Box Opening And Closing (arduenn, 676420) |
| `paper-sheet-slide`, `paper-sheet-lay` | paper sheets handling (kyles, 450043) and Paper sheets (paulocorona, 334994) |

**Choosing, with earshot.** Each candidate was trimmed with `find`, labelled with `describe` and checked with `realness`
before import. Earshot `realness` was run again on the 38 files as shipped (after the listening fixes below):
- 37 read "real or pro-produced" (p_real 0.79–0.996).
- `bell-temple-large` reads "uncertain" (0.62 on its 10 s file, judged by the long-file thresholds of 0.40 and 0.77).
  Its strike trims read 0.81–0.92. A long, clean ringing tone is what that model leans toward hearing as synthesised.
  The recording comes from a source page that places it at the Valley of the Temples, so it was kept.

Earshot rejected these, by what it heard:
- **Both bowstring recordings:** an impact (z 3.3) and a squelch (z 3.3), not a twang. The Kaguya archers never loose,
  so their bows now drop with wooden knocks.
- **A second shrine-bell file:** it read as cutlery.
- **A "bamboo forest" bed:** it held someone walking through dry leaves (Walk, footsteps 0.49).
- **A cart crossing a bridge and a sled dragged on snow:** both were unclear.
- **A second temple bell:** it read as code-synthesised in parts.
- **Two long snow-walk recordings:** they were continuous crunching, with no single steps. Single steps came from
  other recordings.

The catalog's older foley, impacts and whooshes are synthesised (Wyzowl). The episodes use none of them. Even the
transitions' paper sounds are now recorded.

**Placing.** The rig gives the frames:
- **Steps:** where a stride's phase reaches a quarter or three quarters of a cycle, on the drawing that shows it.
- **Axe strikes:** from the tool stroke's own timing.
- **Blows:** the fight's contact frames.
- **Others:** the end of a fall or a drop.

Frame checks:
- **Club:** on the club smash at frame 112, the club is coming down beside Momotarō's feet. On 114 it rests on the rock
  with the dust thrown up.
- **Axe:** at the axe strike on frame 52, the head is at the shining stalk, and stays there through 54.

**Review.** These are measurements, not listening.

1. **Late steps.** The first steps were late. The snow takes started up to 115 ms before their crunch, and FD1 placed a
   cue's peak, not its start, on the frame. The importer's `keepLead` now starts a take where it becomes audible. FD1
   cues gained `align: "start"`, which steps, strikes and contacts use.
2. **Sync.** earshot `timeline` against each episode's own cue list:

   | Episode | Within one frame (chance) | Median offset |
   | --- | --- | --- |
   | Kasa Jizō | 36% (20%) | 44 ms, the snow crunch builds |
   | Urashima Tarō | 49% (26%) | 23 ms |
   | Momotarō | 62% (17%) | 18 ms |
   | Kaguya-hime | 67% (20%) | 19 ms |
   | Momotarō's battle alone | 77% (16%), 0 cues without a hit | 9 ms |

   Some cues have no hit; these are mostly distant steps and gulls under surf, wind or crickets.
3. **Stacked steps.** Six jizō walking in step stacked six crunches on one frame. Now the lead and two others, quieter
   and in different takes, are heard.
4. **Repeated takes.** A two-take pool could repeat a take across a pass boundary (`soundVariant` compared with the
   previous pass before its own swap). Fixed; it is covered in `tests/sound-design.test.ts`.
5. **Levels.** Mastered to −14 LUFS, −2 dBTP. The limiter takes 6–8 dB off the loudest peaks, under the 9 dB cap. Most
   of that is the beds' own gusts and crackles at +25 dB of master gain: the committed Kasa Jizō, with beds only,
   already took 6.8 dB. A narration voice will carry the loudness and lower the master gain.
6. **Seams.** The fire, crow and warbler beds were cut at seam points measured on the importer's own pipeline. The
   seams are −35, −39 and −34 dB against each bed's level.

**Owner listening, 2026-11-15.** The owner heard Kasa Jizō as "just low buzz sounds and that's it".

**Causes, measured on that mix.**
- **Drone everywhere.** Almost everything was below 150 Hz:
  - the hearth bed (a close fireplace whose body is a low roar) was 71% below 150 Hz;
  - the first snow steps (handling thumps more than crunch) were 41–77%;
  - the gale bed was low-passed to 700–900 Hz indoors and at night;
  - in the hearth shot, 77% of the mix was below 150 Hz.
- **Masking.** Loudness meters discount the low end, so the normalised beds and mastering (+25 dB) raised this rumble
  over the effects.
- **Other episodes.** The underwater bed (97% below 150 Hz) did the same to Urashima's three palace shots.

**Fixes.**
- **Snow steps.** They now come from cabled_mess's crisp series: 46–61% of their energy is at 1–8 kHz, and they are
  high-passed at 120 Hz.
- **Hearth.** A dry campfire crackle (3% below 150 Hz).
- **Outdoor wind.** The gale gives way to a light winter wind through bare trees (`bed-wind-snow`).
- **Underwater.** A hydrophone bubble bed replaces the old underwater bed.
- **High-passed re-cuts:**
  - the warbler, at 400 Hz (city rumble);
  - the stream, at 150 Hz;
  - the axe, at 250 Hz.
- **Importer.** It gains `highpassHz`. For loops it is applied before the crossfade, so the seam stays continuous.
- **Levels.** The beds sit lower, so the effects carry the shot.
- **Result.** Every shot of the four episodes now has at most 19% of its energy below 150 Hz.
- **Kasa Jizō after the fixes:**
  - −14.8 LUFS, with 8.7 dB of limiting;
  - earshot hears the sections as crackling fire and crows;
  - 66% of cues have an onset within one frame (chance 23%), and only 8 cues are without a hit.

**Not done.**
- The fixed mixes are not yet re-heard by the owner.
- These effects have no cue yet:
  - straw rustle for the hats;
  - the sled's runners;
  - the monkey and the pheasant's calls;
  - bowstrings;
  - a market crowd.
- Each needs a recording that passes earshot.

## Boar and bear (2026-11-15)

The owner asked to compare the boar and the bear with references and fix them.

**References.** All are public domain or CC0, from Wikimedia Commons.

| Animal | Reference | Rights |
| --- | --- | --- |
| Boar | *Fauna Japonica*, Mammalia pl. 20, *Sus leucomystax* (the Japanese wild boar) | PD |
| Boar | Tachibana Morikuni, *Wild boars running, on cliffs, and near pine trees* (Library of Congress, LCCN 2008660987) | PD |
| Boar | Utagawa Kuniyoshi, Nitta no Shirō Tadatsune and the boar (British Museum 2008,3037.21407) | PD |
| Boar | Stefano della Bella, *A wild boar running* (Met DP833249) | CC0 |
| Bear | Tanaka Yoshio, *Dōbutsu kunmō*, "Tibet bear" (1875) | PD |
| Bear | Two Okuhida specimens of tsukinowaguma | CC0 photos |
| Bear | A wild bear on Mount Kurai | CC0 photo |
| Bear | Hokusai, *Sakata Kintoki Riding on Bear's Back* (Met 56.121.16) | PD |
| Bear | Torii Kiyomasu I, *Kintoki Wrestling with a Black Bear* | PD |
| Bear | Kuniyoshi, Shigekiyo fighting a black bear in the snow | PD |

**What was wrong.** Both reused the generic quadruped head, a pointed muzzle stretched by a snout factor.

The boar:
- It had round bear ears and a rat's snout.
- Its legs were 36 against a body 64 deep, and the belly fringe hid them, so it had neither legs nor hooves.
- A dark throat band read as a stripe.
- Head-on it had a bear's face.

The bear:
- It had a narrow mole's muzzle.
- The shared "ruff" colour gave it a brown bib.
- The crescent sat behind the fore leg.
- Long tufts all round made a hedgehog outline.
- From behind it read as a box.

**Changes.**

The boar:
- **Head:** its own profile head, a long deep wedge with a straight forehead line. It ends in the flat snout disc with its nostril, and the mouth line turns up at the corner.
- **Face details:**
  - the lower tusk curves up and back;
  - the eye is small and high, with heavy folds;
  - the ears are small, pointed and laid back;
  - bristles stand on the crown;
  - the pale jaw stripe (*leucomystax*, "white whiskers") is clipped to the head.
- **Body:**
  - high withers with a crest of uneven bristle locks lying back;
  - slender legs (50) on cloven hooves with dewclaws;
  - a short coat;
  - the thin tail hangs, with a tuft.
- **Head-on:** the face narrows to the round disc with two nostrils, with tusks from the mouth corners, pale jaw stripes and bristles on the brow.

The bear:
- **Head:** its own profile head: a broad domed skull, big round ears set high and back, a short tan muzzle, a large black nose, a small eye, and long black hair under the jaw.
- **Carriage:** the head is carried low.
- **Body and legs:** a heavier body, thick legs, broad paws with long curved claws, and a finer coat edge.
- **Crescent:** the white crescent across the throat and upper chest, ahead of the fore leg.
- **Head-on:** a round face with a tan muzzle and a broad white V on the chest.
- **Flanks, front and back:** locks lying downward on both flanks. Pale hairlines show on the black coat.

Shared changes:
- Cloven hooves now show the split and dewclaws on the deer and the ox too.
- Black coats get visible hairlines head-on and from behind.

**Review.** Profile, three-quarter, front, back, walking and running stills were compared against the references over
five rounds, at 0.6× and 1.2×. The fixes in later rounds:
- the boar's grey bib went;
- its sawtooth crest became uneven locks;
- its jaw stripe had poked out past the head as a white blade, read as a grin, and moved off the lip;
- the bear's spiky jaw ruff over its crescent read as fangs;
- the bear's front and back edges were spiky on one flank only.

The mountain habitat scene (bear walking, boar charging) renders cleanly.

**Second round (motion).** The gaits were studied in Muybridge's *Animals in Motion* (1899, public domain, Getty copy
on the Internet Archive). In its plate of gallop phases (p. 201):
- the bear flings its fore legs far ahead and drives its hind legs back, its body drawn out long and low;
- the hog keeps its body level on short, quick strides;
- the bear, raccoon and hog share one sequence of footfalls.

Muybridge also explains that the "flying gallop" of older art, all four legs flung out at once, never occurs. Morikuni's
boar uses that convention.

Changes:
- **`stride`:** a shorter stride gives the boar quicker steps.
- **`reach`:** the bear's fore legs reach further at the gallop.
- **`arch`:** the bear's back arches between shoulders and hips, as in Tanaka's plate.
- **Galloping legs (every quadruped):** a leg on the ground or reaching for it is now nearly straight, and folds only
  while it is carried forward. Before, the lower leg hung down even when the upper leg reached, so the paws never got
  ahead of the body.
- **`stand`:** hooved animals (boar, deer, ox, horse) now stand on all four legs instead of rearing.
- **Checking:** run cycles of the bear, boar, dog, horse, fox and deer were checked frame by frame.

**Not matched yet.**
- The bear's gallop still reads compact: its short legs under a deep coat need the body itself to stretch and pitch
  through the stride.
- No human visual review yet.

## Not yet matched (honest gaps)

- No true **karazuri** blind embossing depth or **kirazuri** mica sparkle beyond a light emboss filter.
- Faces have one design per hairstyle in each view. There are no expressive brow and eye shapes yet.
- The wave's foam is procedural. It is now one connected white like the print's, but every claw is built from the same palm-and-talon unit, so it lacks the print's hand-drawn variety of claw sizes and the long lace trailing over the back.
- The wave breaks one way only: a plunging breaker. There is no spilling breaker for the small background waves, and the falling curtain has no motion smear at its fastest frames.
- Creature fur is procedural carved hairlines and tufted edges. It is closer to Koson's prints but not hand-carved. Figures and animals turn three-quarter, and figures and four-legged animals can face front or back. Birds, the dragon and the yōkai cannot, and there is no animated turn between views.
- Sound is recorded ambience beds (river, stream, wind, rain, surf, distant fireworks, crickets). There is no music and no hits timed to frames (a crash on the wave's break, each firework). Nobody has listened to the mix yet.
- Human normal-speed review of the film has **not** been recorded.

## Legs and faces against ANIM1 (2026-11-15)

The new animal anatomy framework ([ANIM1](../component-specs/animal-anatomy.md), research:
[animal anatomy framework](animal-anatomy-framework-2026-11-15.md)) measures every UKIYO1 quadruped off its own
standing contour (`ukiyoeBeastLandmarks`). Changes from that check and from the owner's note on faces:

- **Legs.** The boar and the bear stood on less than half the measured clearance under the chest. Their legs are now
  inside the ranges of the Fauna Japonica plate and the Tanaka plate and Okuhida specimens. Strides grew with the legs,
  and walking feet now slide less than before.
- **Faces.** The owner wrote that the bear, tanuki, mouse, weasel and boar faces needed better proportions. They were
  rebuilt from PD/CC0 references:
  - **Tanuki:** a short muzzle, with the mask running down over the cheek.
  - **Mouse:** big bead eyes, huge round ears and no neck.
  - **Weasel:** a flat head with low side ears, a dark mask and a white chin.
  - **Bear:** a long tapering muzzle with no smile.
  - **Boar:** broad laid-back ears, a deep jaw, the eye set back, and a bigger face square on.
- **Open finding.** The fox, dog, cat, wolf, tanuki, rabbit, ox and mouse are still long and low compared with the real
  animals (see the Storybook "UKIYO1 proportion check").

## Trees grown by FLORA1 (2026-11-15)

The pine, cherry and willow were rebuilt on the plant anatomy framework
([FLORA1](../component-specs/plant-anatomy.md)), and a plum (`ume`) was added. They were compared with:

- Hiroshige's *Evening Rain at Karasaki* (MET, CC0) and Hokusai's *Cushion Pine at Aoyama* (MET, CC0);
- Hiroshige's *Asukayama* cherries and Hokusai's *Bullfinch and Weeping Cherry*;
- Hiroshige's willows (*Willow on a river bank*, *Tea-house at the Willow Bridge*);
- Hiroshige's *Plum Garden at Kameido* (Rijksmuseum, CC0) and the *Flora Japonica* plum.

| Tree | Was | Now |
|---|---|---|
| Pine | Four tall dome pads on stubs of a smooth trunk | A leaning trunk under whorled tiers of big flat needle pads on long level branches |
| Cherry | A pink blob on a pole | Limbs of elbows with lenticel bark; blossom clumps over a pink underprint, with gaps; notched five-petal flowers; red young leaves under the blossom |
| Willow | Arched over a small crown | Limbs that arch up and fall; curtains of strands hanging from along them |
| Plum (new) | — | Dark gnarled wood; sparse round white flowers and red buds on the twigs |

`height` is the whole tree; `variant` is the seed; `lean`, `spread`, `bloom` and `strands` keep their meanings. The
trees are grown once per seed and swayed by the scene's wind. The Night Ferry and folktale shots were re-rendered and
checked; no owner review yet.

