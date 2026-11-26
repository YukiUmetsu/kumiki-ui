# Verification: intake of a storybook person (2026-11-25)

Spec: [Add a person](../component-specs/storybook-character.md). Design: [character intake](../superpowers/specs/2026-11-25-storybook-character-intake-design.md). Plan: [character intake](../superpowers/plans/2026-11-25-storybook-character-intake.md). External libraries: [report](storybook-character-libraries-2026-11-25.md).

A person is now a data file and one command. Two new people, Kento and Yui, went from the owner's full-body paintings to checked figures with `story:person`.

| Level | State |
|---|---|
| Mechanically tested | yes, see [Commands](#commands) |
| Visually reviewed | by the agent that built it: card pictures, parts, face paintings, sheets and close frames |
| **Artist-approved** | **no** |

## Commands

| Check | Command | Result |
|---|---|---|
| Types | `npm run typecheck` | exit 0 |
| Lint of the changed scripts and sources | `npx eslint scripts/storybook-person.mjs scripts/storybook-voice.mjs src/video/storybook/cast.ts tests/storybook-film.test.ts` | exit 0 |
| Unit tests of this work | `npx vitest run --project unit tests/storybook-film.test.ts tests/rig.test.tsx` | 64 passed |
| Docs | `npm run -s docs:check` | OK |
| Catalog | `npm run catalog:check` | OK: 577 entries, 1497 verified stories |
| Two new people | `npm run -s story:person -- kento,yui --out dir --paint --port 6016` | see [Kento and Yui](#kento-and-yui) |

The whole unit suite and the whole story suite were not run.

## Kento and Yui

The owner's sheets give the age and the look of each person, and no height. The heights are the national means of the age group: men aged 26 to 29, 171.8 cm; women in their 20s, 157.5 cm (the 2019 National Health and Nutrition Survey of the Ministry of Health, Labour and Welfare, as quoted by [oggi.jp](https://oggi.jp/6705886); the tables of the [ministry](https://www.mhlw.go.jp/content/10900000/000687163.pdf) and [e-Stat](https://www.e-stat.go.jp/dbview?sid=0003224930) were not read). **The owner must confirm them.**

Seconds of each step on this computer (Apple silicon, one image model at a time):

| Step | Kento | Yui |
|---|---|---|
| prepare | 2 | 2 |
| paint | 274 (a, blink, laugh: each at the first seed) | 285 (rest, blink, laugh: each at the first seed) |
| propose | 2 | 2 |
| cut | 69 | 85 |
| measure (`story:qa`, the shots of the figure) | 10, no faults | 12, no faults |
| check (`story:check`, the same shots) | 3, 0 faults | 4, 0 faults |
| acts (not a gate) | 14, 5 faults | 16, 7 faults |
| sheet | 9 | 11 |
| **total** | **383** | **418** |

The sheet of the first run of Yui showed two faults of the cut (see [Faults that were found and corrected](#faults-that-were-found-and-corrected)). After the correction, `story:person yui` ran again without `--paint`, and kept the faces: 127 s (cut 84, measure 13 with no faults, check 4 with 0 faults, acts 15 with 7 faults, sheet 8).

Typed by hand: the person file (9 lines for each person). Lines of a card corrected by hand: 0 for Kento and 0 for Yui. For comparison, the cards of Sato and Daichi have 79 and 81 lines, and earlier figures needed a recipe cut by hand.

Before this work, Daichi went through the same steps in 121 s without paint and propose: prepare 2 s, cut 83 to 85 s, measure 10 s, check 3 s, acts 14 s, sheet 8 s.

## Face check

`storybook-paint.py --check` on the 21 face paintings that the figures use, and on two negative controls made from `daichi_blink.png`:

| Painting | Kept | Head moved (of the face height) | Size |
|---|---|---|---|
| 21 faces in use | 21 | 0.02 % to 0.20 % | 0.9992 to 1.0008 |
| `daichi_blink` moved 6 % | no: "the head moved 6.1% of the face height" | 6.09 % | 1.0001 |
| `daichi_blink` scaled to 1.04 | no: "the head moved 5.7% of the face height" | 5.73 % | 1.0398 |

The limit is 1.5 % for each. What each face shows, in shares of the face height, on the same 21 faces: lips 0.107 to 0.143 apart for `a`, 0.067 to 0.156 for a laugh, at most 0.007 for closed lips; eyes at most 0.022 open when closed. The limits are 0.04 apart for open lips, 0.015 for closed lips, and 0.03 for closed eyes.

The 6 new faces of Kento and Yui were kept at the first seed. Yui's faces moved 0.15 % to 0.30 % at a size of 0.9987 to 1.0003.

The change of colour inside the face is 5.6 to 17.6 (CIE Lab) on the kept faces. FLUX.2 Klein makes the whole picture paler. Only the eyes, the cheeks and the mouth go into a figure, and the cut matches their colour at the edge. So colour is printed and not judged. In Kento's sheet the face patches have the colour of the head around them.

## Proposed cards against the cards in use

`storybook-rig.py --propose` on the 7 front figures that have a card made by hand:

| Figure | Head box proposed | Head box of the card | Shows (proposed) | Shows (card) |
|---|---|---|---|---|
| daichi | 359, −6, 304 | 360, −6, 304 | joy | rest |
| daniel | 357, −7, 296 | 358, −7, 296 | open | open |
| emi | 350, −13, 320 | 350, −13, 320 | joy | rest |
| haruka | 354, −10, 320 | 354, −10, 320 | rest | rest |
| leo | 274, −19, 480 | 271, −19, 488 | open | open |
| sato | 353, −5, 296 | 353, −5, 296 | narrow | narrow |
| sophie | 302, −14, 416 | 300, −14, 424 | rest | rest |

The boxes agree within 3 px in place and 8 px in size. The paintings of Daichi and Emi laugh. Their cards say `rest` because they use a face painting at rest as the head. So `joy` is right for the paintings.

The armhole seam (`fix.hole`) is not proposed. Three rules (the line from the shoulder, the ink line, the edge of the cloth) found the seam of the cards within 12 px on 4, 3 and 0 of 14 sides.

## Ears

`ears_left` counts the skin of an ear that the cut leaves on the body, after an opening of 5 px. Without the opening, the edge of the paint gave up to 82 px (Sato).

| Cut | Ear skin on the body |
|---|---|
| The 7 front figures in use | 0 px |
| Kento, Yui | 0 px |
| A head box that stops at the cheek (the old fault), on the same figures | 960 to 4531 px (0.05 to 0.14 of the face width squared) |

The limit is 0.02 of the face width squared.

## Kit films

`story:check` of the shots that show the figure (stand, turn, heads, looks, say, arms, walk, sit) gave 0 faults for each figure. The acts of the library gave the same faults for each figure, which is why the step `acts` does not stop a person:

| Act | Time in the kit film | Fault | Kento | Yui |
|---|---|---|---|---|
| `clap` | 0.08 to 0.92 s (poses shot), 59.98 to 60.32 s (acts shot) | a hand turns −149° to −169°; a person can turn it −85° to 80° | 3 | 4 |
| `receive` | 68.23 to 69.23 s | the end turns a hand to −144° to −157° | 1 | 2 |
| `raise` | 55.11 s | elbow b jumps 3.7 cm (Yui) and 4.4 cm (Kento) in one frame | 1 | 1 |

`clap` is in no film. `receive` and `raise` are in films that pass, because there the arm does not start from the poses of the kit film. The step `acts` also writes LOOK lines for Yui: the back of the hand at 43° to 47° in `drink` and `eat` (0° to 30° is easy), and a turn of −103° in `carry` at 28.02 s (−80° to 75° is easy).

## Voices

`story:voice --try` with three Fish Audio voices for each person, on one line ("はじめまして。よろしくお願いします。"), at the default speed. The agent did not choose: **the owner listens and picks** (`story:voice -- <id> --pick <fish id>`). The takes are in `local-assets/storybook/voices/<id>`.

| Person | Voice | Pitch | Next in the cast | Morae a second | Accent |
|---|---|---|---|---|---|
| Kento | `7e334489…` "冷静な男性" | 133 Hz | riku −0.6, takahashi −0.7 semitones | 9.4 | 0.80 |
| Kento | `92c556e1…` "信ボイス" | 136 Hz | riku −0.3, takahashi −0.4 | 10.4 | 0.54 |
| Kento | `8f99ad75…` "士道" | 127 Hz | riku −1.4, takahashi −1.6 | 9.6 | 0.93 |
| Yui | `5161d414…` "元気な女性" | 213 Hz | ema −2.7, haruka +3.7 | 9.1 | 0.30 |
| Yui | `63bc41e6…` "元気な女性v2" | 225 Hz | ema −1.8, leo −2.6 | 9.9 | 0.52 |
| Yui | `34d29f83…` "ゆりVer1" | 276 Hz | daichi −0.6, leo +0.9 | 9.2 | 0.69 |

The three voices for Kento are within 2 semitones of Riku and Takahashi. One line is a rough guide: Sato's lines in the films are 99 to 195 Hz. The films speak at speed 0.8 and 4 to 5.6 morae a second, not at the default speed of these takes. Voices that copy a real person or a character were not tried.

The pitch tracker does not jump an octave on these voices: the odd harmonics of half the pitch have 1 to 4 % of the energy of the harmonics of the pitch.

## Looked at

| Picture | Seen |
|---|---|
| `kento-card.jpg` | The head box holds the hair and both ears. The cuff lines are at the cuffs. The legs part at the crotch. The seams start at the corners of the head box, about 50 px inside the sleeve seam of the jacket. |
| Kento's face paintings beside the head | The same glasses, hair, head place and collar in `a`, `blink` and the laugh. The open mouth of `a` shows the tongue. |
| `kento-front_parts.png` | The arm layers hold the cap of the shoulder of the jacket. |
| `kento-sheet.jpg` | The face in each look, the mouth in speech, the walk and the sit. |
| Close frames of the arms (30.92 s, 33.08 s, 55.08 s) | No tear. With an arm over the shoulder, the shoulder of the jacket shows a small step where the arm layer starts. Not corrected. |
| Close frames of the sit (93.08 s, 94.33 s) | A soft dark edge at the hips and between the legs. Sato and Daniel have the same edge in the same frame: it comes from the shared rig. |
| `yui-card.jpg` | The head box holds the bun, the headband and both ears. The seams run down the outer edge of the backpack straps, so the straps stay on the body. The cuff lines are at the cuffs. The legs part at the crotch. |
| Yui's face paintings beside the head | The same bun, headband, hood and head place in `rest`, `blink` and the laugh. The faces are paler than the head, as Kento's are. `rest` has closed lips and a small smile. |
| `yui-front_parts.png` | The arm layers start at the outer edge of the straps. |
| Close frames of the neck, first run | A pale rectangle of skin beside the neck, under the jaw. Corrected: in the second run there is no rectangle. |
| `yui-sheet.jpg`, first run | The figure listened with the open mouth of the painting. Corrected: in the second run it listens with the `rest` face (14.21 s, 17.21 s). |
| `yui-sheet.jpg`, second run | The laugh at 11.21 s, closed lips between lines at 25.38 s, the arms, the walk and the sit. |
| Close frames of the arms (30.92 s) | A small white notch at the corner of the hood. Not corrected. |
| Close frames of speech (25.38 s, 26.88 s), beside Daniel's at 22.46 s and 26.88 s | The open mouth has a straight top at the teeth and a soft upper lip. Daniel's open mouth has the same straight top: it comes from the shared mouth. Not corrected. |

## Faults that were found and corrected

- Two functions of `storybook-rig.py` had the name `face_of`. The second replaced the first, so `--propose` and `storybook-paint.py --kinds faces` failed on Kento and Yui. The face reader is now `painted_face`.
- The ears check counted the fringe of the paint (82 px on Sato). It now opens the mask by 5 px first.
- The labels of the card picture covered each other. The face line is now in the header.
- `story:person` stopped every person at the acts of the library. It now gates on the shots of the figure, and writes the faults of the acts without a stop.
- `art.build` wrote `_assembled.png` into the assets. The cut now moves it beside the other pictures to look at.
- A step that could not start had a status of null and counted as a pass. A step now passes only with exit 0.
- The cut put the left side of the neck at the median of the runs of skin under the chin. On Yui a speck at the edge of the hood pulled it to 460 px, 32 px left of the neck, and the cut left a pale rectangle beside the jaw. The neck now uses the run of each row that holds the chin (`own_run`). Of the 11 front figures with a card, only Yui's neck changed.
- A painting with an open mouth or a laugh listened with that mouth, because `--propose` wrote no `idle`. It now writes `"idle": "neutral"` when the painting shows `open` or `joy` and a `rest` face is there.

## Limits

- Two people, both from paintings in the same style and the same A-pose.
- The face check measures place and expression. It does not measure likeness: look at each face painting.
- The heights are national means, not the owner's.
- No voice was heard by a person.

## Follow-ups

- The acts `clap`, `receive` and `raise` need photograph studies and new angles (see [Kit films](#kit-films)).
- The soft dark edge at the hips of a figure that sits.
- One frame of Daichi's kit film (574, 23.92 s, say shot) mixes the closed and the open mouth. It was there before this work.
- In speech, the open mouth of Daniel and Yui has a straight top at the teeth.
- Kento: the small step at the shoulder of the jacket when an arm is over the shoulder. Yui: the white notch at the corner of the hood.
- DWPose as a check of rear views, after a read of the terms of its training data.
- The owner confirms the heights and picks the voices.
- The paintings of `ema` and `takahashi` have file names that differ from their ids.
