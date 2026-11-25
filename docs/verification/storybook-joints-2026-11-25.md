# Verification: joints, hands, sleeves and voices of the storybook films (2026-11-25)

Specs: [storybook-film](../component-specs/storybook-film.md#joints), [storybook-episode](../component-specs/storybook-episode.md). The report before this one: [storybook production](storybook-production-2026-11-25.md).

The owner looked at the episode and sent pictures. This report says what each fault was, why it happened, and what now finds it. All corrections are in shared parts. Screenplays changed only where they named a place that no hand can reach.

| Level | State |
|---|---|
| Mechanically tested | yes, see [Measured](#measured) |
| Visually reviewed | by the agent that built it: pose sheets of all acts of arms, frame by frame for the ones the owner named |
| Reviewed by someone else | no |
| **Artist-approved** | **no** |
| **Listened to by a person** | **no** |

## What the owner saw

| The owner said | Cause | Correction | What finds it now |
|---|---|---|---|
| "Faces are distorted. Ear is disconnected from the face." | the head was cut at the cheek. The ear stayed on the body, and a turned head left it there | the head is cut along the ink of the ear and the jaw, and the mesh of the face ends before the ear. All 13 figures were cut again | the likeness at rest, the kit of each figure |
| "Awkward hand posture" | one drawing of a hand stood for all its sides. A left hand showed its thumb on the wrong side | palms, backs, thumbs and little fingers in the kit; a drawing says what it shows, and the solver takes the one that the forearm can show. Rear views have their left and right hands changed over | forearm turn and wrist in `story:check` |
| "hand going through the table" | a place behind the counter was reached in a straight line | a hand goes over a counter at its far edge (`raise.edge`), and the solver goes round it | the counter check of `story:check` |
| "bad arm, elbow rig" | the arm was solved in the picture, and an elbow could go where no elbow goes | the arm is solved in depth. Its joints are read as a viewer reads them, and the pose that strains least is taken | 14 joint ranges in `story:check` |
| "Their arm elbow area is wobbling when their hand is above elbow line" | a hold was a place. When the body breathed, the solver looked for the place again, and a short arm in the picture changed its elbow much | a hold is a pose of the joints. The drawing of a hand changes when the move is 42 % done, and the choice of a way is made over time, not for one frame | the elbow check: 3 cm for a frame² in the frame of the body |
| "arm is still wobbly" (bent like a hose) | the sleeve was bent smoothly over two bones, as a tube | the sleeve is drawn with straight parts, a corner outside the elbow and a crease inside, and a root as wide as its armhole | five sleeve tests; the pose sheet |
| ごじゅうのとう, せんはっぴゃくえん | the voice read them in another way, and the aligner, which knows the text, could not tell | a model that does not know the text hears each line. The two lines were recorded again, and the best of several takes was kept. Eight other lines were recorded again for the same reason (see [Voices](#voices)) | `story:speech --hear --ear` |
| "we should add english meaning for vocab review" | the English of words was behind the switch for subtitles | the pages that teach words show it always. Lines of speech stay as they were: hidden until the switch is on | a test |

"Is it better to code possible xyz angle range that's comfortable for human joints for each joint?" Yes, and it is in `rig-comfort.ts`. It is not enough alone. Of the poses in the owner's pictures, several were inside all ranges. A range says what a person can do, and a photograph says what a person does. So each act that moves an arm has an entry in `ACT_STUDIES`: 31 acts, 49 sources, with the angles that were read off.

## Measured

| Check | Result |
|---|---|
| `npm run typecheck` | exit 0 |
| `npx eslint` with each changed file | exit 0 |
| `npx vitest run --project unit tests/rig.test.tsx tests/storybook-film.test.ts tests/riso-rig-ik.test.tsx` | 73 passed |
| `npm run -s story:check` on the seven films and `first-trip` | 0 faults; to look at: station 2, festival 6, others 0; `first-trip` 8 (the same eight; looked at, see below) |
| `npm run -s story:qa` (data) on the seven films and `first-trip` | no faults in each |
| Frames at 640 px (`story:qa --frames`) | not run for this change. The frames that changed were looked at with `story:look --cells` |
| `npm run catalog:check`, `npm run docs:check` | OK |
| `npm run registry:validate`, `node scripts/registry-fixture.js --item=painted-rig` and `--item=storybook-film` | 315 items valid; 144 and 156 files compiled in a clean fixture |

- Elbows, while the hand is over the elbow, in the frame of the body: the ten worst changes of speed were 0.99 to 4.22 cm for a frame² before (the worst: a pointing hand in the shop). Now the worst is 1.01 (konbini, Ema takes the purse back; it was 1.47), then 0.90 and 0.63.
- The ranges `can` are those of the anatomy pack. A test compares the two.
- The fastest hand: 2.28 m/s (shop, the bag; 2.31 in the episode). The shrug in the station was 2.62 m/s. It now takes 0.95 s to rise, and its hand moves at 2.16 m/s.
- A forearm that turns past what a person can do is a fault when it stays 0.25 s. A change of the hand's drawing is at once, so a shorter turn is not seen. Other joints are a fault after 0.1 s.

## Voices

`storybook-hear.py` hears phones with a model that has no text (HuBERT phone CTC, see Sources) and compares the pitch with the accents that OpenJTalk gives.

| Line | Before | Now |
|---|---|---|
| taxi `temple` あれは お寺です。五重塔ですよ。 | the owner heard ごじゅうのとう as wrong | heard as `g o j u u n o t o o`, accent 0.71 |
| taxi `price` 千八百円です。 | the owner heard せんはっぴゃくえん as wrong | せん and はっぴゃく as written, pitch high on both, accent 0.40 |
| ryokan `welcome`, `wide`, `here`, `slippers`; station `sakura`, `there`; shop `go-ahead`; hello `leo` | heard with other sounds or a pitch against the accent | recorded again; the new take was kept when it was heard better. `slippers` is now スリッパです！ (Slippers!), which the voice read as written. Leo now says レオです。たこ焼きが、食べたいです！ with a pause |
| still not as written | | station `sakura` (わあ、…) starts with a u that is not written; ryokan `welcome` has one vowel heard as another; ryokan `wide` loses one a; station `yes` has accent −0.43. A person has to listen to them |
| all other lines of festival, shop and taxi | | heard as written |

The accent number goes from −1 to 1. It is the correlation, inside each accent phrase, of the morae that OpenJTalk says are high with the pitch of the voice. It is not a verdict. No source for the accent of 五重塔 was found beyond OpenJTalk: the NHK dictionary has it and is not free to read. A person has to listen.

## Looked at

- Pose sheets (`story:check --out`) of hello, taxi, shop, station, festival, ryokan and konbini.
- Frame by frame: Daniel's wave and both raises that the owner sent, Emma's wave, Sophie's raise, the hail from behind, Daniel's `explain` (20 frames) and shrug, the fold of Emi and Haruka, the bag, both points at the counter, the purse.
- The kit page of Sophie and Daniel: `explain`, `shrug`, `wave`, `raise`, `point`, `call` on both sides.
- The vocabulary pages of shop, station and hello, and the quiz.
- The moments that `story:check` names to look at: Leo's raised finger (127° to the side: a child points at a train), Daniel's hand behind Emma in the shrug, Daichi's hand behind the griddle's edge, Leo's wrist at a bite (79°). They read well. They stay as they are.

## The next video

| Step | Before | Now |
|---|---|---|
| A screenplay | 6 to 10 KB by hand from an empty file | `story:make --new` writes one that plays: 1 KB, 16 s of film, in 2 s |
| A look before any voice | not possible: a line with no recording stopped the film | a silent draft, as long as a slow voice |
| Voices | all lines of a play again | only lines with new text, and each is heard |
| Arms | looked for by eye in each shot, corrected with angles in the screenplay | no angle in a screenplay. One sheet has all acts of arms |
| All checks of an 81 s film | five commands | one command, 56 s |
| A new person or place | as before | as before: paintings are the cost |

## Limits

- An arm is a painting. Seen from the front, a forearm that points at the viewer is a shorter sleeve, not a drawn foreshortening.
- A kimono sleeve keeps its curve. In `wave`, `raise`, `call` and `shrug` it is not drawn well. Haruka does none of them in a film.
- A small piece of cloth stands out beside Sophie's elbow in the raise at 41.2 s of the festival.
- `beckon` is in no film.
- Practice pages (a whole sentence to say) show their English only with the switch.
- The hand drawing of two fingers (a peace sign) failed: its thumb pointed at the viewer. It is not in the kit.

## Sources

Photographs: each entry of `registry/rig/rig-act-studies.ts` has its title, author, licence and address. They were looked at and measured. None is in the repository, and none was an input to a painting.

- The outline of a raised sleeve: [a statue waves, Rusty Clark, CC BY 2.0](https://www.flickr.com/photos/23206546@N04/6142889970), [Lola's Raised Hand, edenpictures, CC BY 2.0](https://www.flickr.com/photos/10485077@N06/5271124279), and the waves and points of `ACT_STUDIES`.
- Comfort of joints: [Kee and Karwowski 2001](https://informahealthcare.com/doi/abs/10.1080/00140130110038044); RULA [1](https://www.ergocenter.ncsu.edu/wp-content/uploads/sites/18/2020/07/RULA-Scoring-Sheet-2020.pdf), [2](https://health.usf.edu/-/media/v3/usf-health/COPH/Thomas-Bernard/Ergonomics/RULA_r1.ashx). Ranges: ANAT1, `registry/anatomy/anatomy-pose.ts`.
- Folded hands: [All About](https://allabout.co.jp/gm/gc/425624/), [President](https://president.jp/articles/-/17252), [Gifu](https://www.pref.gifu.lg.jp/uploaded/attachment/77968.pdf).
- The phone model: [prj-beatrice/japanese-hubert-base-phoneme-ctc-v4](https://huggingface.co/prj-beatrice/japanese-hubert-base-phoneme-ctc-v4).
