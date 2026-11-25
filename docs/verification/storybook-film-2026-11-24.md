# Verification: painted storybook films (2026-11-24)

Spec: [storybook-film](../component-specs/storybook-film.md). Film: `KONBINI_FILM`, 871 frames at 24 a second, 36.3 s.

| Level | State |
|---|---|
| Mechanically tested | yes, see below |
| Visually reviewed | by the agent that built it, in frames and in Storybook |
| Reviewed by an independent agent, stills only | three times: fail; fail, narrowly; **pass with defects**. See [Independent review](#independent-review) |
| **Artist-approved** | **no** |

## Commands

| Check | Command | Result |
|---|---|---|
| Types | `npm run typecheck` | exit 0 |
| Lint of the changed files | `npx eslint` with each file | exit 0 |
| Unit tests of this film | `npx vitest run --project unit tests/storybook-film.test.ts` | 13 passed |
| Registry manifest | `npm run registry:validate` | 315 items valid |
| Registry smoke | `npm run registry:smoke` | 315 items, 7477 files |
| Clean app, `painted-rig` | `node scripts/registry-fixture.js --item=painted-rig` | 12 items, 140 files compiled |
| Clean app, `storybook-film` | `node scripts/registry-fixture.js --item=storybook-film` | 13 items, 149 files compiled |
| Sounds | `npm run sound:check` | 165 sounds |
| Art from recipes | `storybook-art.py` on the five recipes, from `local-assets/storybook/paintings` | each `art.json` and picture is the same as the asset, byte for byte |

The whole unit suite and the whole story suite were not run.

## Film, from the data

`node scripts/storybook-qa.mjs src/video/storybook/konbini-film.ts KONBINI_FILM --out …`: no faults.

| Measure | Worst | Limit |
|---|---|---|
| Folds in a mesh | 0.00% | 0.2% |
| A foot that is down moves | 0.08 cm (frame 14) | 0.6 cm |
| A joint turns in one frame | 20.4° (frame 663) | 40° |
| A hand moves against the hips | 1.51 m/s (frame 663) | 2.6 m/s |
| Mouth against recording, lag | −20 to +20 ms, seven lines | 70 ms |
| Vowels that the mouth shows | 37 of 37 | all |

## Film, from the pictures

Each of the 871 frames at 1280 px in Chromium: no faults, no page reload.

| Measure | Result | Limit |
|---|---|---|
| Three frames drawn again in another order | 0 of 255, SSIM 1.0 | 2 of 255 |
| A frame unlike both neighbours | at most 0.035% of the picture (332, the scanner goes down) | 0.6% |
| Feet that are down, Lucas-Kanade | 184 tracked, median 0.001 cm, worst 0.41 cm | 1.2 cm |
| Painted mouth against recording | correlation 0.68 to 0.89, lag 0 frames, six lines | 0.35; 2 frames |

The mouth of the line `welcome` is too small to measure in a wide shot at this width. It was measured from the data only.

## Layers against the painting

The share of the figure that comes from the base painting, put back together:

| Figure | Share | SSIM | Colour, of 255 | Outer outline |
|---|---|---|---|---|
| `ema-three-quarter` | 78% | 0.978 | 2.4 | 0.72 cm |
| `ema-side` | 81% | 0.967 | 3.3 | 18.46 cm |
| `riku-front`, against the owner's full-body painting | 91% | 0.990 | 1.3 | 0.09 cm |
| `riku-three-quarter`, only in `Shoulders and elbows` | 82% | 0.976 | 2.1 | 0.19 cm |

The outline of `ema-side` differs only where the far leg and far arm of the painting join the outline. Those parts are replaced by layers of their own.

## Proportions against the owner's sheets

Levels from the top of the figure (0) to the soles (1000), read beside a ruler. The turnarounds on the sheets are about 300 pixels high, so a reading is good to about 5.

| Level | Emma, sheet | Emma, rig | Riku, sheet | Riku, three-quarter rig |
|---|---|---|---|---|
| Chin | 162 | 165 | 157 | 152 |
| Belt, apron tie | 405 | 410 | 412 | 400 |
| Apron hem | | | 688 | 692 |
| Trouser hem | 908 | 905 | 950 | 940 |

The views are not the same (Riku's sheet has a front and two side views), so only heights are compared. The film uses `riku-front`. It is cut from the owner's full-body painting, so its proportions are those of that painting.

The manifest gates of the ArtCraft skill (pixel, structure, axis and anatomy manifests) were not run: the sheet views are about 300 pixels high and in other poses.

## Browser

Chromium, Storybook: 24 stories opened, no console error. Play starts the sound (peak 0.80) and the clock follows the audio. 375 px: no sideways scroll. Reduced motion: stays at frame 0. English is hidden in each picture of the film; the switch starts off, shows it and hides it again; the export story shows it with `&args=english:!true`.

## Looked at

- The whole film on a contact sheet, each 24 frames.
- Rice ball put down (208–240 and 340–372), scan (297–340), gesture (361–405), bag (404–440), nod (494–530), coins (566–660), bag handover (658–740), each mouth of the line ありがとうございます (680–728) and ありがとうございました (733–770).
- The elbow and shoulder stories, the rig views, the coins, the labels and the checkout, beside their references.

## Independent review

Another agent looked at frames beside the owner's two full-body paintings. It did not play the film, and it did not read the code.

| Review | Customer | Cashier | Film |
|---|---|---|---|
| 1 | — | — | fail |
| 2 | pass with defects | pass with defects | fail as a polished demo, narrowly |
| 3 | pass with defects | pass with defects | pass with defects |

The third review named six faults that were corrected after it: Riku's hand at the put-down, the elbow that folded the other way when the bag came up, a rushed nod, Emma's palm over the rice ball at the put-down, a grey scanner hand, and paper left in Riku's hair. Only the agent that built the film has looked at these six corrections.

Not corrected:

- 679→680: Emma's open hand becomes a fist in one frame. 694–702: Riku's fingers go over the counter top when they come back. 682–740: Emma's free hand hardly moves.
- 297 and 331: a sharp bend of the scanner wrist.
- 583–585 and 632–634: a coin goes in without a push of the finger. 587: a flat fingertip.
- The change machine's bowl has pale sides in the wide shot and black sides in the close-up.
- Emma's sweater has less cable knit than the painting. The curtain behind Riku is smeared in two places.

## Faults that were found and corrected

| Fault | Correction |
|---|---|
| An elbow pointed up and the shoulder stayed while a hand reached over the counter | an arm is solved in depth, the elbow hangs, the shoulder goes along, the inside of the elbow folds |
| The far arm lay in front of the own body in the scan | draw order follows the pose: the far arm goes behind the own body from shoulder to elbow |
| An elbow changed its side in one frame | what a moment before and after have has a share in how an arm bends; a reach starts on the side where it ends |
| The scanner wrist bent 90° | a wrist bends at most 46° |
| An arm rose in three frames (`invite`) | it starts as a spring from rest and takes about ten |
| A gesture covered the price and crossed the chest | `invite` takes a `to`, beside the body |
| A hand hung for one frame between two acts | the drawing of the nearer reach stays |
| A hand drawing with a rice ball in it, and a palm over the ball | the ball stands in front of the hand from the moment it is put down |
| Riku's face was off-model | the front view is cut from the owner's painting |
| "o" and "u" mouths pulled paper and hair into the face | `squeeze` takes nothing from outside its radius |
| A grey-blue iris in a half blink; a white loop on the backpack; a shard on the scarf; paper in the hair | recipe steps |
| The wide change machine was another machine than the close-up; no noren; a hard shadow | the sets were repainted from the same references; shadows are soft |
| A cut to a full bag on the counter | an empty bag comes up from below |
| The back of the shirt had no ink line where a raised sleeve uncovers it | a line and a shade in the recipe |
| The mouth measure took in the wall beside a tilted chin and named two good lines | it measures inside the box round the lips |
| The measure for pops named a camera move | it compares with the local range of both neighbours |

## Not checked

An artist's review. A review of the six last corrections by somebody else. Screen readers. Safari and Firefox. A full-length 1080p video file. Any listening test: levels and timing of the sound were measured (36.3 s, −14.1 LUFS, −2 dBTP), and no person judged how it sounds.
