# Verification: storybook production system (2026-11-25)

Specs: [storybook-film](../component-specs/storybook-film.md), [storybook-episode](../component-specs/storybook-episode.md). Phase 1: [report of the convenience store](storybook-film-2026-11-24.md).

Six scenes and the episode `first-trip`: 487.1 s (8 min 7 s), 115 shots, 11,690 frames at 24 a second. No film has code of its own: `konbini` is data in TypeScript, and the others are JSON.

| Level | State |
|---|---|
| Mechanically tested | yes, see below |
| Visually reviewed | by the agent that built it, in frames and in Storybook |
| Reviewed by an independent agent, stills only | one time: 26 findings, worst first, no verdict. See [Independent review](#independent-review) |
| **Artist-approved** | **no** |

## Commands

| Check | Command | Result |
|---|---|---|
| Types | `npm run typecheck` | exit 0 |
| Lint of the 46 changed scripts and sources | `npx eslint` with each file | exit 0 |
| Unit tests of this work | `npx vitest run --project unit tests/storybook-film.test.ts tests/rig.test.tsx tests/riso-rig-ik.test.tsx` | 66 passed |
| Registry manifest | `npm run registry:validate` | 315 items valid |
| Registry smoke | `npm run registry:smoke` | 315 items, 7483 files |
| Clean app, `painted-rig` | `node scripts/registry-fixture.js --item=painted-rig` | 12 items, 142 files compiled |
| Clean app, `storybook-film` | `node scripts/registry-fixture.js --item=storybook-film` | 13 items, 153 files compiled |
| Catalog | `npm run catalog:check` | @@CATALOG@@ |
| Docs | `npm run docs:check` | OK |
| Sounds | `npm run sound:check` | 165 sounds |
| Art from recipes and cards | `storybook-art.py` on the 11 recipes, `storybook-rig.py` on the 13 figure cards, from `local-assets/storybook/paintings` | @@ART@@ |

The whole unit suite and the whole story suite were not run.

## Films, from the data

`npm run -s story:qa -- <film> --out …`: no faults in each film.

| Film | Frames | Folds | Foot that is down moves | Joint in one frame | Hand against the hips | Lines | Mouth lag | Long open vowels that fall on the sound |
|---|---|---|---|---|---|---|---|---|
| hello | 1954 | 0.00% | 0.00 cm | 21.3° | 2.31 m/s | 16 | −40 to +50 ms | 64 of 65 |
| konbini | 871 | 0.00% | 0.08 cm | 18.7° | 1.70 | 7 | −20 to +20 | 37 of 37 |
| station | 2162 | 0.00% | 0.02 cm | 25.3° | 2.57 | 12 | −10 to +250 | 56 of 58 |
| taxi | 1792 | 0.00% | 0.00 cm | 31.7° | 2.55 | 13 | −10 to +50 | 85 of 86 |
| shop | 1594 | 0.00% | 0.03 cm | 21.0° | 1.31 | 11 | 0 to +50 | 58 of 58 |
| ryokan | 1892 | 0.00% | 0.02 cm | 16.6° | 1.34 | 12 | 0 to +40 | 74 of 74 |
| festival | 1605 | 0.00% | 0.02 cm | 24.8° | 1.76 | 12 | −20 to +40 | 46 of 46 |
| **first-trip** | 11690 | 0.00% | 0.20 cm | 26.7° | 2.55 | 83 | −40 to +250 | 420 of 424 |
| Limit | | 0.2% | 0.6 cm | 40° | 2.6 m/s | | 70 ms | — |

- The lag of +250 ms is one line (`trip` in the station, likeness 0.28). Its onset and end agree with the recording within 30 and 50 ms. The gate names a lag only when the onset or the end is late too.
- Kits (one film for each of the 17 figures: standing, turning, each look, speech, both arms through the space in front, each act, a walk, sitting): no faults, with two exceptions that no film uses. `ema-side` folds 0.44% of the torso in its deepest bow. A hand of `riku-three-quarter` reaches 2.73 m/s in a shrug.

## Films, from the pictures

Each frame at 640 px in Chromium (`story:qa -- <film> --frames`), 11,870 frames of seven films: no faults. The episode is made of these films, and its frames were not taken a second time.

| Film | Three frames again in another order | A frame unlike both neighbours | Feet that are down, Lucas-Kanade: tracked, median, worst | Painted mouth against recording |
|---|---|---|---|---|
| hello | 0 of 255, SSIM 1.0 | 0.08% | 1271, 0.002 cm, 0.22 cm | 1 line, 0.95, lag 0 |
| konbini | 0 of 255, SSIM 1.0 | 0.03% | 184, 0.007, 0.65 | 2 lines, 0.78 to 0.88, lag 0 |
| station | 0 of 255, SSIM 1.0 | 0.28% (the train comes in) | 1351, 0.013, 0.25 | 2 lines, 0.87 to 0.96, lag 0 |
| taxi | 0 of 255, SSIM 1.0 | 0.10% | 146, 0.045, 0.37 | 9 lines, 0.85 to 0.94, lag 0 |
| shop | 0 of 255, SSIM 1.0 | 0.06% | 140, 0.000, 0.07 | 6 lines, 0.39 to 0.98, lag −1 to 0 |
| ryokan | 0 of 255, SSIM 1.0 | 0.03% | 2021, 0.008, 0.35 | 5 lines, 0.92 to 0.96, lag 0 |
| festival | 0 of 255, SSIM 1.0 | 0.14% | 247, 0.017, 0.36 | 5 lines, 0.80 to 0.96, lag −1 to 0 |
| Limit | 2 of 255 | 0.6% | 1.2 cm | 0.35; 2 frames |

The other mouths are too small to measure in a picture of 640 px. They were measured from the data only. A change of a doc loaded the page again at frame 952 of hello and frame 847 of shop. The films and the art did not change, and the checks went on.

## Layers against the painting

The figure at rest against the owner's painting (SSIM in the box of the figure):

| Sophie | Daniel | Emma | Leo | Emi | Haruka | Sato | Daichi | Takahashi |
|---|---|---|---|---|---|---|---|---|
| 0.938 | 0.950 | 0.941 | 0.954 | 0.934 | 0.944 | 0.937 | 0.926 | 0.938 |

The hands and the feet come from the kit of the cast, and the faces are drawn again for each look. Both lower the number. The manifest gates of the ArtCraft skill (pixel, structure, axis and anatomy manifests) were not run: the turnarounds on the sheets are about 300 pixels high and in other poses.

## Sound

`npm run story:sound`, measured with ebur128. No person listened to the mixes for this report.

| Film | Length | Loudness | True peak |
|---|---|---|---|
| hello | 81.4 s | −14.0 LUFS | −2.0 dBTP |
| konbini | 36.3 s | −14.1 | −1.8 |
| station | 90.1 s | −14.0 | −1.9 |
| taxi | 74.7 s | −14.2 | −1.9 |
| shop | 66.4 s | −14.0 | −2.0 |
| ryokan | 78.8 s | −14.1 | −1.9 |
| festival | 66.9 s | −14.1 | −1.9 |
| first-trip | 487.1 s | −14.1 | −1.8 |

The mix check warns of possible clicks in konbini, station, taxi, shop, festival and first-trip. They were not judged by ear.

The voices are Fish Audio voices of the library. The phone times come from a forced alignment of each recording, and the table above compares the mouth with the recording.

## Browser

Chromium, Storybook on port 6016:

- 32 stories of the group opened: no console error and no page error. Three of them (`Library`, `Lines`, `Text`) have no canvas.
- Play, on the convenience store and on the episode: the sound starts (peak 0.80 and 0.81), and the clock follows the audio.
- 375 px: no sideways scroll. Reduced motion: stays at frame 0.
- The episode is ready to play 3.7 s after the page opens on this machine.

## Looked at

- The whole episode on a contact sheet, with at least one picture of each of the 115 shots.
- Each film on a contact sheet after its last change, and each of the 17 kits.
- Several frames of each: the train arrival and the first steps, the gate, the hail, the car door, the wheel, the card, each fan action, the bag, the key, the bows, the shoes on the step, the cooking, the bite, each point and wave.
- Beside photographs: the wheel grip, the fan grip, the pick grip, the handover with two hands, the paper boat in the hand, a hand at the chin, a wave. See [Sources](#sources).

## The owner's correction

The owner stopped the taxi: "you should find reference images for driving before deciding how you set joints. wrists look very wrong. that's not how humans hold handles."

The wheel had been held from imagination. It was done again from photographs and from measured driving postures: hands at 9 and 3 o'clock, thumbs along the rim, wrists in line with the forearm, elbows low and bent. The rule is now step 3 of the order of work for each action, and the fan, the picks, the purse, the handover, the hand at the chin and the wave were done the same way.

## Independent review

An agent that did not build the films looked at stills of the five new scenes and 27 closer looks, beside the owner's paintings. It did not play the films, and it did not read the code. It found no wrong reading and no wrong furigana.

| # | Finding, shortened | State |
|---|---|---|
| 1 | Sophie's raised arm starts at the hood, and an empty shoulder stays | corrected: sewn armholes |
| 2 | Leo's arm starts at the collar, the strap stretches, and Leo points at the floor | corrected |
| 3 | The taxi drives with no driver, no door opens, Daniel flips to a back view | corrected: a driver in the car, a door on a hinge |
| 4 | Spikes of skin at Daichi's wrists, picks on top of the hands | corrected, from photographs |
| 5 | The wheel faces us, there is no column or dashboard, the hands never leave it | corrected |
| 6 | Closed fans look like sticks | corrected: a folded fan shows its paper between two guards |
| 7 | Fans hang over the hand and stick out of the bag | corrected |
| 8 | Emma changes clothes between views | corrected: views in other clothes are kept apart |
| 9 | Bent puffy sleeves become balloon elbows | **not corrected** |
| 10 | Four people stand on a wall above the floor line | corrected |
| 11 | The key floats | corrected |
| 12 | The ticket stands on end and never enters the slot | corrected |
| 13 | Eye contact in the taxi and at the station | corrected |
| 14 | Three of four blink together | corrected: blinks of a group are spread |
| 15 | Leo's mouth hangs open while others speak | corrected: `idle` look |
| 16 | The rear window is frozen while the car drives | corrected |
| 17 | A finger points at the seat | corrected |
| 18 | Daichi's wave is a chop | corrected, from photographs |
| 19 | Front walks show little arm swing | **not corrected**: the arms swing ±20° in depth, which is small from the front |
| 20 | Front bows only sink | **not corrected**: no turned body is painted |
| 21 | Takoyaki plates have no burner | corrected: a gas cooker |
| 22 | The ball stops beside the mouth | corrected |
| 23 | Necks stretch on Leo and Sophie | looked at, accepted |
| 24 | The phone shows a lock screen and lies ungripped | corrected |
| 25 | Specks on two faces | corrected |
| 26 | Flat word cards | looked at, accepted |

Only the agent that built the films looked at the corrections. There was no second independent review.

## Faults that were found and corrected

| Fault | Correction |
|---|---|
| A joined episode lost the views that only one film had of a person, and the data check stopped | the casts of the parts merge for each person and each figure, and a test covers it |
| A turned face folded at the far cheek | the relief fades toward the ears |
| A pony tail past the head box was cut | parts past the head box are kept |
| A raised arm showed an empty shoulder | an armhole in the card, cut and filled |
| A kimono sleeve bent as a stiff board | its corner hangs on a bone, and its inner cloth is drawn in |
| A shot of a car left out a person | a spot that `stays` keeps its person in each picture |
| A painted badge had the letters of a real railway company | a plain wheel (`badges` in the card): the repository is public |
| A re-cut figure lost its `idle` look, because the art tool dropped the field | the tool keeps it, and Leo and Daniel were cut again |
| Face patches of three figures of the first phase came from an older tool than the recipes say | cut again, compared before and after, and the store film was measured again |
| Two face pictures that no figure names | removed |
| A long queue of paintings was stopped by its time limit of 2 h | the remaining pictures were painted in shorter runs |

## Capabilities

| Capability | Where |
|---|---|
| Conversation: who looks at whom and when, nods, reactions, blinks, listeners, speech beats | `rig-acting`, the compiler |
| Speech: mouth shapes from phone times | `speech-mouth` |
| Looks by shared facial units, for each face | `rig-face`, cards |
| 49 acts: walking, turning, sitting, standing, bows, pointing, waving, handing over, packing, paying, cooking, eating, steering, fanning | `rig-presets*` |
| Acts blend, queue and can be cut off; hands go to points in the scene | `story-figure`, `rig-evaluate` |
| Steps on the floor with perspective, turns, rear views | `rig-walk`, `ground` of a set |
| Head and chest turns of a painting in 2.5D | `rig-look-painted` |
| Figures from a card, with their own proportions, faces and clothes | `storybook-rig.py` |
| Cloth: hanging parts, wide sleeves, slack elbows | `drape`, `hang`, `slack` |
| Places with spots, sides, frames, swinging doors, drifts, bursts, moving layers | `places/*.json` |
| Pages, wipes, cuts, dissolves and the spoken-line cards with furigana | `storybook-film` |
| Lessons: practice, words with pictures, a quiz | the compiler |
| An episode from whole films or chosen scenes | `episodes/*.json` |
| Plan, look, measure, sound without a full render | `story:plan`, `story:look`, `story:qa`, `story:sound` |

## Limits

See [the list in the episode spec](../component-specs/storybook-episode.md#limits). Also:

- Side and three-quarter views exist only for Emma (convenience store clothes) and Riku. All other turns are 2.5D turns of a front view.
- Each handover happens in a cut. No picture shows two hands on one thing that changes its owner.
- The seasons differ between the scenes (cherry blossoms, red maples, fireworks), as the brief and the sheets ask.
- No seat belt is shown in the taxi.
- Bent puffy sleeves, front bows and front walks: see the review above.
- The wisps of hair at Sophie's nape float a little in a turn. Leo's neck is long when Leo looks up. The page `next` of the episode has only words.

## Next priorities

1. An artist's review of the episode by the owner, with a 1080p render when the owner asks for it.
2. People who have sheets and are not yet figures: Fumiko, Hana, Kento, Ren, Yui and the cat Momo.
3. Outfits: yukata for the festival and the inn, and one season for a whole trip.
4. Three-quarter and side paintings of the family. These remove the limits of front walks, front bows and handovers.
5. Paintings of people who sit (lap and knees), shoes that come off, backpacks that come off.
6. Handovers that show both hands, and the payment at the festival.
7. Kimono sleeves and puffy sleeves as cloth.

## Not checked

An artist's review. A second independent review after the corrections. Screen readers. Safari and Firefox. A full-length video file at 1080p. Any listening test. Any test with learners.

## Sources

Photographs on Flickr and those on Commons with a share-alike licence were only looked at. None is in the repository, and none was an input to a painting.

- Station: [Saitama guideline on station gates](https://www.pref.saitama.lg.jp/documents/196300/053-040.pdf), [Travel Watch on ticket gates](https://travel.watch.impress.co.jp/docs/series/inoue/1502243.html), [Travel Watch on paper tickets](https://travel.watch.impress.co.jp/docs/series/inoue/1672424.html), [JR-West call system](https://www.jr-odekake.net/ticket/callsystem/).
- Taxi: [Toyota JPN Taxi](https://global.toyota/detail/19121192), [driver utility](https://global.toyota/jp/jpntaxi/features/driver-utility/), [Statista on cashless taxis](https://statista.com/statistics/1260502/japan-taxi-number-cashless-payment-terminals-by-type).
- Hands on a wheel: [ITmedia](https://www.itmedia.co.jp/business/spv/2207/25/news130_4.html), [Best Car](https://bestcarweb.jp/feature/column/471532), [Kuruma News](https://kuruma-news.jp/post/373763), [SlashGear](https://www.slashgear.com/2181695/9-and-3-nhtsa-steering-wheel-hand-placement/), [Progressive](https://progressive.com/lifelanes/steering-wheel-hand-position/), [Hanson et al.](https://lup.lub.lu.se/record/404124), [Wolf et al. 2022](https://www.hs.mh.tum.de/biomechanik/news-single-view/article/new-publication-in-press-corrected-proof-available-online-in-the-journal-applied-ergonomics/), photographs [Burst](https://burst.shopify.com/photos/hands-grasping-a-steering-wheel), [London cabbie](https://commons.wikimedia.org/wiki/File:London_-_London_cabbie_-_3843.jpg) (Jorge Royan, CC BY-SA 3.0), [Taipei taxi driver](https://commons.wikimedia.org/wiki/File:Taxi_driver_and_dog_on_car_in_Taipei.jpg) (CC BY-SA 2.0), [bus driver](https://commons.wikimedia.org/wiki/File:Bus_driver_(5171124305).jpg), [Dereva wa basi](https://commons.wikimedia.org/wiki/File:Dereva_wa_basi.jpg), [606 ACS](https://commons.wikimedia.org/wiki/File:606_ACS_executes_Exercise_PRIMO_Specto_26-3_(9872287).jpg) (public domain), [Flickr 1](https://www.flickr.com/photos/78087459@N00/12911964673), [Flickr 2](https://www.flickr.com/photos/9855726@N07/16114126566).
- Shop and fans: [Mapple](https://www.mapple.net/article/37945/), [HugKum](https://hugkum.sho.jp/502995), DIME [1](https://dime.jp/genre/421938/), [2](https://dime.jp/genre/421938/2), [3](https://dime.jp/genre/421938/3), [All About on fans](https://allabout.co.jp/gm/gc/220672/), Flickr [1](https://www.flickr.com/photos/acafe/48547515226/), [2](https://www.flickr.com/photos/acafe/48547514321/), [3](https://www.flickr.com/photos/acafe/45961322822/), [4](https://www.flickr.com/photos/acafe/48547668037/), [5](https://www.flickr.com/photos/acafe/48547514311/).
- Handing over: [Rakuten](https://event.rakuten.co.jp/ochugen/howto/handover/). Read only as search summaries: [All About on gifts](https://allabout.co.jp/gm/gc/220718/) (the page refused), [Saison](https://www.saisoncard.co.jp/credictionary/lifestyle/article052.html), [Aoyama](https://www.y-aoyama.jp/aoyama_journal/name-card/), [Musubu](https://library.musubu.in/articles/10838), [Sansan](https://jp.sansan.com/media/howtoget-business-card/), [toplog](https://toplog.jp/448098), [visipri](https://visipri.com/size/namecard/info-manner.php), [kurashi-manner](https://kurashi-manner.jp/business/business-card.html), [renue](https://renue.co.jp/posts/business-card-exchange-manner-guide), [kokoni](https://manner.kokoni.jp/meishi/). Flickr [1](https://www.flickr.com/photos/acafe/34111336301/), [2](https://www.flickr.com/photos/acafe/34992421890/), [3](https://www.flickr.com/photos/mytripsmypics/28164660321/).
- Inn: [Japan Guide](https://Japan-guide.com/e/e2029_arrival.html), [Live Japan](https://livejapan.com/en/article-a0000388), Flickr [genkan](https://www.flickr.com/photos/nopperabo-x/55298418628/), [socks on tatami](https://www.flickr.com/photos/65113026@N00/5623139892/).
- Festival: [Live Japan](https://livejapan.com/ja/article-a0001178/), [Event21](https://event21.co.jp/mat925_yatai.htm), [Tokushima on stall hygiene](https://www.pref.tokushima.lg.jp/file/attachment/622580.pdf), Flickr [vendor](https://www.flickr.com/photos/hrm01/8462004096/), [Hanazono](https://www.flickr.com/photos/31029865@N06/8236818451/), [picks](https://www.flickr.com/photos/194505895@N05/52068063022/), [Osaka](https://www.flickr.com/photos/sophiaho/37852583391/), [boat in a hand](https://www.flickr.com/photos/tiffanyfong/32672648176/), eating [1](https://www.flickr.com/photos/acafe/49394610382/), [2](https://www.flickr.com/photos/acafe/49394409116/), [3](https://www.flickr.com/photos/acafe/33919716378/), [boat held out](https://www.flickr.com/photos/roblucas/55573575145/), [fireworks](https://www.flickr.com/photos/203306614@N04/55515934685/).
- A hand at the chin: [Flickr](https://www.flickr.com/photos/185676713@N06/52307778048/).
