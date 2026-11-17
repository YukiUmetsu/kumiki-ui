# Natural bangs and hair physics (ANAT1) — research, 2026-11-17

The owner asked for the following, in four messages:
- hair that looks more realistic, especially the bangs;
- long hair that does not go inside the shoulders;
- bangs studied from many modern references;
- a physics engine: gravity instead of hair held at straight angles, and collisions so hair does not pass through the
  face or shoulders.

Grades:
- **reported:** quoted from the source;
- **measured:** from photographs or data in the repository;
- **estimated:** chosen within what the sources support.

## What was wrong

| Fault | Seen as | Cause |
| --- | --- | --- |
| Long hair inside the shoulders | hair cut off at the shirt, a few strands showing through it | the hair draped over a chest 12–19 mm behind the garment (the garment had moved forward, the hair's copy had not), and a shoulder rounded over 42 mm where the garment is upright |
| Blunt bangs see-through | a comb of separate sticks over a bright forehead | about 20 clumps over a whole fringe, and skin under hair let 73% of the light through one layer of hair, with no ambient occlusion |
| Wispy bangs pale | a light haze, like a hairnet | sub-pixel strands blended over unshadowed skin, light scattered inside the hair added even where there is almost none, and the style's waves bent the short fringe |
| Curtain bangs over the eyes | strands across the eyes, ends sticking out | a curtain 8 mm below the brows in the middle; set directions held straight; no rule keeping it out of the eyes |
| Rope-like waves | twisted braids | each strand offset on an elliptical corkscrew, neighbouring locks out of phase |
| Marks on a man's cheeks | dark curls on the skin | a widened curtain section caught the sideburn roots below the hairline, which the fringe cut left as stubs |
| Hair at fixed angles | bangs and curtains in straight lines | no gravity on the styled shape |

## References: modern bangs, measured

- **Search:** 82 modern celebrities known for bangs (Western, East Asian, Southeast Asian, South Asian and Black), on
  Wikimedia Commons through its API. Photographs from 1995 on, public domain, CC0, CC BY or CC BY-SA; measured only,
  credited below.
- **Downloads and measuring:** 163 photographs, of which 112 were frontal enough to measure.
  - The face: MediaPipe's face landmarker.
  - Hair and face skin: MediaPipe's selfie multiclass segmenter (Apache 2.0).
- **Measures,** in the face's frame (eye centres one unit apart, taken as 62 mm):
  - the fringe's lower edge across the forehead, relative to the brows' upper edge;
  - how much of the forehead it covers;
  - how ragged its edge is;
  - centre against side coverage (a curtain), and left against right (a side-swept fringe).
- **Result:** 25 photographs had a fringe (coverage over 0.35), sorted by those measures into full (11), curtain (10)
  and side-swept (4).

| Type | n | Edge, mm below the brows' upper edge (outer brow, middle, outer brow) | Coverage | Edge raggedness |
| --- | --- | --- | --- | --- |
| Full (blunt) | 11 | +12, about +2, +13 | 0.92 | 4.7 mm |
| Curtain | 10 | +7, −30 (open to the hairline), +7 | 0.48 | 3.2 mm |
| Side-swept | 4 | +18 on the long side, −31 on the short side | 0.42 | 3.2 mm |

Seen on the crops:
- **Full fringes:**
  - an opaque sheet with a fine vertical texture and a shine band across its rounded top;
  - the edge at or just below the brows, broken into 5–15 pointed pieces, longer toward the temples;
  - a soft shadow on the skin below.
- **See-through fringes** (Korean style): thin pieces 2–5 mm wide, skin between them, tips tapering.
- **Curtain fringes:** falling from the part first, then sweeping out, like parentheses round the eyes, to the outer
  brow and cheekbone, lying on the face.
- **Side-swept fringes:** a diagonal from a side part across one brow.

## Physics

| What | Grade | Source |
| --- | --- | --- |
| Elasto-gravity length of a hair, about 5 cm | reported | Goldstein, Warren & Ball 2012, *The shape of a ponytail* |
| Heavy elastica tip angle, horizontal clamp: 1 l 9.5°, 1.5 l 29.4°, 2 l 53.9°, 3 l 81.6° | measured | shooting solution of B θ'' = −w (L − s) cos θ |
| The settle step's tip angles: 8.8°, 28.2°, 53.6°, 84.6° | measured | the same strands through the solver (no contact) |

The solver works on each guide strand, the moment method on a heavy elastic rod:
- **Bending:** the weight beyond each joint bends the strand there away from its styled curvature by (moment × segment)
  / B, with B / w = l³. The styled bend is carried along each segment.
- **No stretching:** positions are rebuilt from the root.
- **Collisions:** each point is pushed out of the head, face, ears, neck, shoulders and chest on every pass.
- **Support:** where hair rests on a surface, that surface carries the weight beyond it.
- **Set hair:** held hair is stiffer.

It settles fringes and short and medium lengths. Long hair is already grown hanging; letting the solver move it swung
it across the face. Blunt-cut lengths (bobs) are shaped by the cut and the blow-dry, so their lengths are left as
grown, though their fringes still settle. Fill strands now keep off the face as well as the head and body.

## Fringes, rebuilt

| Change | Grade |
| --- | --- |
| Cut lines from the measured edges (full: 2 mm below the brows in the middle, 12 mm at the outer brow; curtain: open to the hairline in the middle, to the outer brow and cheekbone; side-swept: hairline to 18 mm below the brow) | measured |
| Hair cut from longer hair, so the cut decides the edge | estimated |
| Pieces: 18–48 clumps by type, gathering only in the last third of the length (see-through fringes gather all the way); each piece ends up to 3 mm above or below the line | measured (raggedness), estimated (counts) |
| A fringe strand drawn as two finer ones, about 1.7 times the usual coverage | estimated |
| Curtains first fall from the part, then sweep out; curtain, bottleneck and side-swept fringes stay out of the eyes | measured (shape), estimated (amounts) |
| The fringe section starts at or behind the front hairline | — |
| The fringe stands off the scalp where it leaves it (the dome) | estimated |

## Light

| Change | Grade |
| --- | --- |
| Skin under hair: a full layer of brown hair lets about a quarter of the key light through, black about a tenth, and hair close over skin blocks the sky and fill (floors at 10% and 35%) | estimated |
| Light scattered inside the hair grows with the hair along the light (a thin fringe has little to scatter in) | estimated (after dual scattering, Zinke et al. 2008) |

## Waves

| Change | Grade |
| --- | --- |
| Waves (curl types II–III) are flat S-curves across the hair sheet, a fifth of that out of it; curls and coils stay helices | estimated |
| Neighbouring locks wave nearly in step: the phase varies over 7–11 cm of the head | estimated |

## Checks

- **Tests:** bangs end about 3 mm below the brows' upper edge; their ends hang down under gravity; fewer than 0.3% of
  long-hair points lie inside the torso. A checked groom found none.
- **Grooming time:** no longer than before (30,000 strands, against main's code).

## Credits: the photographs measured

| Type | Photograph | Author | Licence | Year |
| --- | --- | --- | --- | --- |
| curtain | [20230817 Momo Hirai for Pearly Gates Korea 01.jpg](https://commons.wikimedia.org/wiki/File:20230817_Momo_Hirai_for_Pearly_Gates_Korea_01.jpg) | Pearly Gates Korea | CC BY 3.0 | 2023 |
| curtain | [27th Latin GRAMMY Awards - Red Carpet 0261 - Camila Cabello (cropped).jpg](https://commons.wikimedia.org/wiki/File:27th_Latin_GRAMMY_Awards_-_Red_Carpet_0261_-_Camila_Cabello_(cropped).jpg) | Jorge Jaramillo | CC BY-SA 4.0 | 2026 |
| curtain | [Camila Cabello Sundance 2024 Cropped 2.jpg](https://commons.wikimedia.org/wiki/File:Camila_Cabello_Sundance_2024_Cropped_2.jpg) | ReverendPoppins | CC BY 4.0 | 2024 |
| curtain | [Charlotte Gainsbourg-5647 (cropped).jpg](https://commons.wikimedia.org/wiki/File:Charlotte_Gainsbourg-5647_(cropped).jpg) | Harald Krichel | CC BY-SA 3.0 | 2022 |
| curtain | [Charlotte Gainsbourg-5661.jpg](https://commons.wikimedia.org/wiki/File:Charlotte_Gainsbourg-5661.jpg) | Harald Krichel | CC BY-SA 3.0 | 2022 |
| curtain | [Dakota Johnson Venice 2018 (cropped).jpg](https://commons.wikimedia.org/wiki/File:Dakota_Johnson_Venice_2018_(cropped).jpg) | Pietro Luca Cassarino | CC BY-SA 4.0 | 2018 |
| curtain | [Jenna Ortega-63792 (cropped).jpg](https://commons.wikimedia.org/wiki/File:Jenna_Ortega-63792_(cropped).jpg) | Harald Krichel | CC BY-SA 4.0 | 2024 |
| curtain | [Jenna Ortega-63799 (cropped).jpg](https://commons.wikimedia.org/wiki/File:Jenna_Ortega-63799_(cropped).jpg) | Harald Krichel | CC BY-SA 4.0 | 2024 |
| curtain | [Kim Yoo-jung Hong Kong MAMA red carpet, 2 December 2016.jpg](https://commons.wikimedia.org/wiki/File:Kim_Yoo-jung_Hong_Kong_MAMA_red_carpet,_2_December_2016.jpg) | Saya | CC BY 4.0 | 2016 |
| curtain | [Momo Hirai 2015.jpeg](https://commons.wikimedia.org/wiki/File:Momo_Hirai_2015.jpeg) | MFDICE의 이것저것 | CC BY 4.0 | 2015 |
| full | [20241128 Bae Suzy CELINE photocall.jpg](https://commons.wikimedia.org/wiki/File:20241128_Bae_Suzy_CELINE_photocall.jpg) | K-POPIT 케이팝잇 | CC BY 3.0 | 2024 |
| full | [Anna Wintour 2009 crop.jpg](https://commons.wikimedia.org/wiki/File:Anna_Wintour_2009_crop.jpg) | Anna_Wintour_&_Alexa_Chung.jpg: LGEPR, Cropped by Daniel Case, 2010-06 | CC BY 2.0 | 2010 |
| full | [Anna Wintour in 2024 (cropped).jpg](https://commons.wikimedia.org/wiki/File:Anna_Wintour_in_2024_(cropped).jpg) | UKinUSA | CC BY-SA 2.0 | 2024 |
| full | [Chungha in February 2024.png](https://commons.wikimedia.org/wiki/File:Chungha_in_February_2024.png) | DIVE Studios / 다이브 스튜디오 | CC BY 3.0 | 2024 |
| full | [Claudia Winkleman 2016 (cropped).jpg](https://commons.wikimedia.org/wiki/File:Claudia_Winkleman_2016_(cropped).jpg) | DavidBassom1 | CC BY-SA 4.0 | 2016 |
| full | [Flickr - Genevieve719 - Zooey Deschanel, Jake Johnson, Max Greenfield (cropped).jpg](https://commons.wikimedia.org/wiki/File:Flickr_-_Genevieve719_-_Zooey_Deschanel,_Jake_Johnson,_Max_Greenfield_(cropped).jpg) | Genevieve | CC BY 2.0 | 2012 |
| full | [Jang Won-young at the 2024 Melon Music Awards-2.png](https://commons.wikimedia.org/wiki/File:Jang_Won-young_at_the_2024_Melon_Music_Awards-2.png) | TenAsia | CC BY 3.0 | 2024 |
| full | [Jang Won-young at the Rolarola Photocall, November 6, 2026 (1).png](https://commons.wikimedia.org/wiki/File:Jang_Won-young_at_the_Rolarola_Photocall,_November_6,_2026_(1).png) | K-POPIT 케이팝잇 | CC BY 4.0 | 2026 |
| full | [Nana Komatsu at 2025 Cannes Red Carpet 1 (cropped).jpg](https://commons.wikimedia.org/wiki/File:Nana_Komatsu_at_2025_Cannes_Red_Carpet_1_(cropped).jpg) | Kacy Bao | CC BY-SA 4.0 | 2025 |
| full | [Nana Komatsu at 2025 Cannes Red Carpet 5 (cropped).jpg](https://commons.wikimedia.org/wiki/File:Nana_Komatsu_at_2025_Cannes_Red_Carpet_5_(cropped).jpg) | Kacy Bao | CC BY-SA 4.0 | 2025 |
| full | [Taylor Swift at the Golden Globes 2024 (Enhanced, cropped) 2.jpg](https://commons.wikimedia.org/wiki/File:Taylor_Swift_at_the_Golden_Globes_2024_(Enhanced,_cropped)_2.jpg) | iHeartRadioCA | CC BY 3.0 | 2024 |
| side-swept | [Alexa-chung-hair-first-look-at-her-l-oreal-campaign-35539 w1000.jpg](https://commons.wikimedia.org/wiki/File:Alexa-chung-hair-first-look-at-her-l-oreal-campaign-35539_w1000.jpg) | Mmm09kn | CC BY-SA 4.0 | 2015 |
| side-swept | [HaileeSteinfeldSept10 (cropped).jpg](https://commons.wikimedia.org/wiki/File:HaileeSteinfeldSept10_(cropped).jpg) | Robert Delgadillo at http://dimex.forumfree.it/?t=51181811 | CC BY-SA 3.0 | 2010 |
| side-swept | [Selena Gomez at the 2024 Toronto International Film Festival 3 (Cropped).jpg](https://commons.wikimedia.org/wiki/File:Selena_Gomez_at_the_2024_Toronto_International_Film_Festival_3_(Cropped).jpg) | Frank Sun | CC BY-SA 4.0 | 2024 |
| side-swept | [Urassaya Sperbund in October 2022.png](https://commons.wikimedia.org/wiki/File:Urassaya_Sperbund_in_October_2022.png) | THHeadline | CC BY 3.0 | 2022 |

