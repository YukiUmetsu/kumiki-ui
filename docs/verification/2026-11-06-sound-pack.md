# Sound pack verification

Date: 2026-11-06. Machine: Apple M4, 24 GB. Scope: [plan 28](../28-cinematic-sound-fx-pack-plan.md), M0 to M4, with the MOSS spike.

## Result

`assets/sound/catalog.json` holds 73 CC0 sounds: 50 from `wyzowl/sfx-kit` at revision `92780e7`, and 23 real recordings from Freesound. Each Wyzowl file matched the SHA-256 that the source publishes. Each recording's licence was read on its Freesound page. The example film `billing-gap` now uses a kit from this catalog, with paper, card and coin sounds tied to story moments.

| Check | Result |
|---|---|
| `sound:check` | 73 sounds pass: hash, WAV format and rights. `catalog:check` now runs it, so CI does |
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

- **Blind A/B.** The files above are labelled, so this is an open comparison. A blind test needs someone to shuffle them.

## The stone walk

Plan 28 names a three-step stone walk as a test, with no synthetic footsteps. Twelve recorded steps are now in the catalog. Listen to these:

- [`stone-walk-dry.m4a`](sound-pack/stone-walk-dry.m4a): three takes, dry.
- [`stone-walk-hall.m4a`](sound-pack/stone-walk-hall.m4a): the same recipe in `hall`.

Earshot gave the recorded steps a `realness` of 0.96 to 0.98. Its top description for two gravel takes was "footsteps on gravel". It heard two stone takes as a keyboard press and a liquid bloop, so those two were dropped.

## Earshot results

Earshot 0.4.1 was reviewed, then installed in its own environment. It runs locally, and no audio left the machine.

| File | `realness` p_real | Verdict |
|---|---|---|
| `billing-gap-A-synth-kit` | 0.09 | Likely code-synthesized |
| `billing-gap-B-catalog-kit` | 0.50 | Uncertain |
| `foley-glass-touch`, `foley-wood-touch` (Wyzowl) | 0.00, 0.02 | Likely code-synthesized |
| `drop-water-full` (recorded) | 0.97 | Real or pro-produced |
| `drop-water-round` (recorded) | 0.35 | Uncertain |
| `bed-waterfall-near`, `bed-river-fast` (recorded) | 0.56, 0.73 | Uncertain |

This supports the plan's preference for recordings on physical sounds. The score is advisory, and one recorded drop scored low. `rank` found the Icelandic recording first for "a large waterfall roaring" (z +4.6). It also heard one "ice" recording as a plastic snap, so that file was not imported.

## Search (M2)

Local `findSounds` on 61 sounds, before the footsteps were added, with eight plain-language queries:

| Query | First result |
|---|---|
| a glass clink | `foley-glass-touch` |
| paper sliding on a desk | `foley-paper-slide` |
| wooden knock | `foley-wood-touch` |
| a coin dropping | `money-coin-drop` |
| a book closing | `props-book-close` |
| water drop | `drop-water-bright`, a correct take |
| a big waterfall | `bed-waterfall-near` |
| wind in the mountains | `bed-wind-mountain` |

**Decision on Foley.** Only its README was read, and its code was not run. It is a Python stack with optional models and paid generation backends. A catalog of this size does not need it, and AGENTS.md rule 7 asks for minimal dependencies. Earshot's `rank` covers the case where words do not match. Review Foley again if the catalog grows past a few hundred sounds.

## Rooms (M3)

Decay of a water drop, from the peak, after calibration:

| Room | To -20 dB | To -30 dB | To -40 dB |
|---|---|---|---|
| `dry` | 0.04 s | 0.08 s | 0.16 s |
| `outdoors` | 0.05 s | 0.12 s | 0.26 s |
| `room` | 0.05 s | 0.16 s | 0.28 s |
| `underwater` | 0.11 s | 0.27 s | 0.41 s |
| `hall` | 0.24 s | 0.36 s | 0.70 s |
| `cave` | 0.26 s | 0.56 s | 1.00 s |

The first settings were almost inaudible: a cave decayed like a dry sound. FFmpeg normalizes the tail, so the levels were set by measurement. Plain `aecho` was compared, and it gave separate repeats. Convolution adds no dependency, so it is the adapter.

| Check | Result |
|---|---|
| Sync | The peak stayed at 0.0200 s through `dry`, `room`, `hall` and `cave`. `underwater` read 0.0164 s, because its low-pass filter moves the sample peak |
| Rebake | Identical bytes for each room from an empty cache |
| Cache | A second bake reports `cached: true`. A changed file or recipe gives a new key |
| Injection | A sound ID or a gain that holds filter text is refused. Tests cover it |

## Mastering (M4)

| Check | Result |
|---|---|
| Ducking asked 6, 12, 18 dB | Measured 5.8, 11.4, 16.6 dB. The bed returned to within 0.0 dB |
| Repeat | Two renders of a narrated film gave the same mix SHA-256 |
| Target | A narrated film with a river bed reached -14.0 LUFS at -2.3 dBTP |
| Gate | A bed under one huge hit stopped at -19.3 LUFS, before any frame was drawn, and named the fix |

Three defects were found by measuring real audio:

- **False clipping.** The first check read a mono downmix, which sums hotter than either channel. It refused a clean mix. It now reads each channel.
- **A silent ending.** The ducked bed stopped when the voice stopped, so a film went silent. The key is now padded to the end.
- **Shallow ducking.** A single compressor reached 4.9 dB of an asked 18 dB. Two in series on a parallel path reach the target.

The gate also refused the first mix of `where-water-begins`: a sharp cue held the gain back, so the bed stayed at -18.5 LUFS. Raising the beds and lowering the cues fixed it, at -15.2 LUFS.

## Limiter

Real recordings have large natural peaks. All three films failed the one-gain master: the beds peaked above the ceiling while their loudness stayed near -22 LUFS. A limiter at 48 kHz then left true peak at +1.5 dBTP, because peaks fall between samples. At 4x oversampling, `plaster-valley` reached -15.4 LUFS at -1.8 dBTP, and `upstream` (the CG flight, now `river-flight`) reached -14.2 LUFS at -1.9 dBTP. A test click through the limiter stayed within 1.2 ms of its place.

## Narration on a phone speaker (estimate)

This is a measurement, not a listening test. A system voice at -16 LUFS was set against `bed-waterfall-near` at +6 dB, with both filtered to the band a small speaker plays, and level was read at 1 to 4 kHz, where consonants sit.

| Ducking | Speech over bed |
|---|---|
| 0 dB | -0.3 dB |
| 6 dB | +5.4 dB |
| 10 dB | +9.2 dB |
| 14 dB | +13 dB |

About +10 to +15 dB is a common target for clear speech, so the default rose from 10 to 12 dB. This is the loudest bed in the catalog.

## MOSS spike

Code reviewed before use: `xocialize/moss-soundeffect-mlx` at `4e8e3e3`. Its inference path has no subprocess, no pickle and no remote code. Weights: `mlx-community/MOSS-SoundEffect-v2.0-4bit` at `51d53e8`, Apache-2.0, 6.0 GB on disk, safetensors. It ran offline in its own environment, in `~/.moss`.

| Measure | Result, M4, 24 GB, 50 steps |
|---|---|
| Load | 2.6 s, warm |
| Each clip | 252 to 259 s. It always denoises a full 30 s latent, so a short clip costs the same |
| MLX peak | 11.9 GB |
| Process peak footprint | 18.3 GB. The published 12 GB figure is the MLX working set only |
| Pressure | 52% of memory stayed free |

| Clip | Earshot `realness` | Earshot `match` |
|---|---|---|
| [`moss-walk-stone`](sound-pack/moss-walk-stone.m4a) | 0.89 | strong, z +3.7 |
| [`moss-page-turn`](sound-pack/moss-page-turn.m4a) | 0.96 | strong, z +3.3 |
| [`moss-ice-crack`](sound-pack/moss-ice-crack.m4a) | 0.80 | no match, z +1.9 |
| [`moss-water-drop`](sound-pack/moss-water-drop.m4a) | 0.96 | strong, z +4.1 |

This is better than expected, and it is one prompt and one seed each. Levels came back very low, at -38 to -48 LUFS, so `sound:generate` sets the peak. The acceptable use is still a sound the catalog does not have. A person must listen first.

## Open items

- **Every sound is synthesized by code**, as the source states. A real recording may still be better for Foley. This is the question that the listening test answers.
- **No voice is in these mixes.** Levels under narration were not tested. Each record holds the source's `underVoiceoverDb` for when that work starts.
- **The first narrated test used the macOS system voice.** Narration intelligibility on phone speakers still needs a person.
- **`sound:critique` scores against launch films.** On one film, it reported sound on 0% of visual events with a salient hit, against 8% to 49% in its references. That is advisory, and a person should judge it.
- **Recordings come from MP3 previews.** The original files on Freesound are better for a release.
