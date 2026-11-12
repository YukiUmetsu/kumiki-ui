# Sound Catalog

**Registry item:** `sound-catalog`
**Source:** `registry/video/sound-catalog.ts`, `scripts/sound-catalog.mjs`, `scripts/film-sound-kit.mjs`
**Data:** [`assets/sound/catalog.json`](../../assets/sound/catalog.json), 86 sounds, about 20 MB. 23 are real recordings.

## Purpose

Rights must travel with each sound file. A record states the licence, source, hash, format and exact peak time of one file. The checks fail closed: an unknown licence, an unsafe path or a changed file is refused. The catalog holds data only. It does not play, download or mix anything. `audio-visual-cue` and FFmpeg stay the only mix path.

## Commands

```bash
npm run sound:check                                # hashes, WAV format and rights. catalog:check runs it too
npm run sound:import -- --from=<sfx-kit clone> --ids=whoosh-medium-soft,riser-1s-soft
npm run sound:import -- --recordings=<manifest.json>   # verified recordings, trimmed and level matched
npm run sound:find -- "glass touch"                # search. See Sound Design
npm run sound:measure -- mix.wav                   # loudness, true peak, DC, clipping and clicks
npm run film:sound-kit -- <folder> --preset=neutral
```

Import reads a folder that you already have, accepts CC0 sources only, and refuses a file that does not match the hash that its source publishes.

A recording manifest is for files whose licence you read at the source. An index such as Openverse is not proof of a licence. The importer starts a one-shot just before its peak, sets its peak to -6 dBFS, and sets each bed to -23 LUFS. It crossfades a loop's tail over its head, and it refuses a loop with an audible seam.

## Kits

A preset copies sounds into a kit folder with a `kit.json`. A film names the folder in `audio.accents.kit`, so the film file does not change.

| Role | `subtle` | `neutral` | `cinematic` |
|---|---|---|---|
| `whoosh` | `whoosh-medium-soft` | `whoosh-medium-medium` | `whoosh-slow-medium` |
| `riser` | `riser-1s-soft` | `riser-1s-soft` | `riser-2s-strong` |
| `hit` | `impact-medium-soft` | `impact-heavy-firm` | `impact-deep-soft` |
| `ping` | `tone-ding-low` | `tone-ding-mid` | `tone-ding-mid` |

Every kit also holds named physical sounds for `audio.cues`: `paper-slide`, `paper-touch`, `card-touch`, `wood-touch`, `coin-drop`, `page-turn`, `book-close`, `water-drop`, `water-splash`, `ice-crack` and `pop-soft`.

These sounds are matched in loudness as supplied, so set `audio.accents.gainDb` to `0`. The default of `-8` suits the older tone kit.

## Cues

A cue ties a kit sound to a moment by name, so a re-timed film keeps its sound in step. The sound's peak lands on the moment.

```json
"cues": [{ "id": "proof", "sound": "coin-drop", "at": "why/match", "offsetFrames": 28, "gainDb": -3 }]
```

## Physical contacts

`ImpactSoundProfile` takes `variants`. Contacts rotate through the takes in a fixed order, so repeats do not use one file, and a re-render gives the same result.

## What the sounds are

50 are from [wyzowl/sfx-kit](https://github.com/wyzowl/sfx-kit), CC0. The source states that every sound is synthesized by code, and `origin` records that. The set has paper, card, coin, glass, fabric, plastic and wood sounds.

23 are real recordings from Freesound, CC0: six seamless beds (waterfall, river, stream, cave air, underwater, wind), four water drops, one ice fracture, and twelve footsteps on stone, gravel and wood. Each licence was read on its Freesound page. [`THIRD_PARTY_ASSETS.json`](../../assets/THIRD_PARTY_ASSETS.json) names each source and each change.

Earshot's `realness` scored two Wyzowl foley sounds at 0.00 and 0.02, and recorded steps at 0.96 to 0.98. A score is advisory, but use a recording for a physical sound when one exists.

## Limits

- **An agent cannot hear.** Levels and timing are measured. Taste is not. `docs/verification/sound-pack/` holds an A/B pair for a person to judge.
- Recipes, rooms, beds and mastering are in [Sound Design](sound-design.md).
- CC BY sources pass the checks, but none are imported. Film-only rights stay out of a pack through `redistributableSounds`.

## Original sounds (`sound:synth`)

`npm run sound:synth` makes the Science and Technology sounds from fixed FFmpeg `aevalsrc` recipes in `scripts/sound-synth.mjs`, measures them and writes their catalog records. They are this project's own work, under its MIT licence. FFmpeg's expression evaluator is deterministic, so rebuilding gives identical files and hashes.

- **Level.** Each is brought to the catalog's accent level, -23 LUFS, measured with silence after it because loudness needs a 400 ms block, and never past a -3 dBTP ceiling.
- **Sync point.** `peakSeconds` is the loudest sample.
- **Checked with Earshot (advisory, 2026-11-08).** `tech-activate` ("a two-tone rising confirmation chime", strong, z +3.7), `tech-shimmer` ("a high sparkling magical shimmer", strong, z +3.6), `tech-ui-click` ("a user interface button click", strong, z +3.1), `tech-digital-glitch` ("a digital glitch", strong, z +3.1), `tech-pulse-soft` ("a notification ding", plausible, z +2.7) and `tech-scan-sweep` ("a rising electronic scanning sweep", plausible, z +2.6). An attempt at "computer clicks" read as a glitch both times, so it is named for what it is. Nobody has listened to them yet.

**Tonal beds and a riser (2026-11-11, doc 34 S7).** `bed-drone-low` (a dark drone on A and E), `bed-pulse-tick` (a pulse at 90 beats a minute) and `rise-shepard` (an endless Shepard-Risset rise) come from the same recipes. The two beds are 8 s loops whose every frequency and LFO completes whole cycles in 8 s, so they loop exactly. The pulse's seam measures −158 dB; the drone reads −17 dB on `loopSeamDb`, which is one sample-step of its 660 Hz top harmonic, not a seam. None clips or clicks (`sound:measure`). Earshot is not installed here, so they have no listening reading; they are for the owner to judge in **Promo Moves → Sound Moves**.

**Trailer hits (2026-11-11, doc 34 S4, S5).** `braam-low`, `sub-drop`, `hit-transient` and `swell-reverse` (whose peak is its end, at 1.387 s of 1.4 s) come from the same recipes. Each sits at −23 LUFS; none clips or clicks on `sound:measure`; the braam's DC offset is 0.001, under the 0.005 limit. No listening reading.

## Finding a sound (`sound:discover`)

`npm run sound:discover -- "rain on a window" [--license=cc0] [--limit=8] [--draft=<manifest.json>] [--format=json] [--offline]` searches the catalog first, with the same `findSounds` an agent uses, and shows only real matches. It then asks [Openverse](https://openverse.org/), an index of openly licensed audio, once, and caches the answer for a day, because anonymous use is rate limited; set `OPENVERSE_TOKEN` to use a registered key. Each result keeps its title, creator, licence, licence URL and source page. Nothing is downloaded.

An index is not proof of a licence. `--draft` writes the candidates in the shape `sound:import --recordings` reads, each with `verified: false`. Read the licence on its source page, download the original file, set `file`, `seek` and `length`, and set `verified: true`. The importer refuses any entry that is unverified or has no file.

