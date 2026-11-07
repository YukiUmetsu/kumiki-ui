# Sound pack verification

Date: 2026-11-06. Machine: Apple M4, 24 GB. Scope: [plan 28](../28-cinematic-sound-fx-pack-plan.md), M1 and one Foley preset, with the measured half of M0.

## Result

`assets/sound/catalog.json` holds 23 CC0 sounds from `wyzowl/sfx-kit` at revision `92780e7`. Each file matched the SHA-256 that the source publishes. The example film `billing-gap` now uses a kit from this catalog, with paper, card and coin sounds tied to story moments.

| Check | Result |
|---|---|
| `sound:check` | 23 sounds pass: hash, WAV format and rights. `catalog:check` now runs it, so CI does |
| Rights tests (M1) | Prohibited and unknown licences, a missing attribution, a missing source, malformed WAV, path traversal and pack filtering are all refused |
| `film:render` | Two MP4s, 630 verified frames each, with audio |
| Mix level | -31.2 LUFS integrated, -7.8 dBTP true peak. Under the -1 dBTP ceiling, with no clipping |
| Timing | Measured sound onsets against the planned file starts, in the table below |

| Cue | Planned start | Measured onset |
|---|---|---|
| `ping` on the turn | 3.000 s | 3.003 s |
| `card-touch` on "a $20 late fee" | 7.923 s | 7.926 s |
| `paper-slide` on the transfer | 10.661 s | 10.700 s, because its soft attack starts under the detector's -45 dB threshold |
| `paper-touch` on the second receipt | 15.911 s | 15.914 s |
| `coin-drop` on the match | 18.923 s | 18.926 s |

## Listen to this

An agent cannot hear, so this is the half of M0 that needs a person.

- [`billing-gap-A-synth-kit.m4a`](sound-pack/billing-gap-A-synth-kit.m4a): the old plain tones, raised by 8 dB to match.
- [`billing-gap-B-catalog-kit.m4a`](sound-pack/billing-gap-B-catalog-kit.m4a): the catalog kit, with paper, card and coin cues.
- [`billing-gap-with-picture.mp4`](sound-pack/billing-gap-with-picture.mp4): B with the film.

Listen on a laptop or phone. Ask: does B sound like objects, or like synthesized effects? Does anything sound early, late or too loud? Is it too busy?

## Not done from M0

- **The stone walk.** The source has no footsteps.
- **Earshot.** AGENTS.md rule 8 forbids running unreviewed external scripts. Review it before use.
- **MOSS v2.** It needs about 12 GB and a large download, and the plan keeps it out of the first PR.
- **Blind A/B.** The files above are labelled, so this is an open comparison. A blind test needs someone to shuffle them.

## Open items

- **Every sound is synthesized by code**, as the source states. A real recording may still be better for Foley. This is the question that the listening test answers.
- **No voice is in these mixes.** Levels under narration were not tested. Each record holds the source's `underVoiceoverDb` for when that work starts.
- **M2 to M4 are not built:** semantic selection, generation, ambience, spatial sound and mastering gates.
