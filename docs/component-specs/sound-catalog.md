# Sound Catalog

**Registry item:** `sound-catalog`
**Source:** `registry/video/sound-catalog.ts`, `scripts/sound-catalog.mjs`, `scripts/film-sound-kit.mjs`
**Data:** [`assets/sound/catalog.json`](../../assets/sound/catalog.json), 23 sounds, about 3 MB

## Purpose

Rights must travel with each sound file. A record states the licence, source, hash, format and exact peak time of one file. The checks fail closed: an unknown licence, an unsafe path or a changed file is refused. The catalog holds data only. It does not play, download or mix anything. `audio-visual-cue` and FFmpeg stay the only mix path.

## Commands

```bash
npm run sound:check                                # hashes, WAV format and rights. catalog:check runs it too
npm run sound:import -- --from=<sfx-kit clone> --ids=whoosh-medium-soft,riser-1s-soft
npm run sound:measure -- mix.wav                   # loudness and true peak. Fails above -1 dBTP
npm run film:sound-kit -- <folder> --preset=neutral
```

Import reads a folder that you already have, accepts CC0 sources only, and refuses a file that does not match the hash that its source publishes.

## Kits

A preset copies sounds into a kit folder with a `kit.json`. A film names the folder in `audio.accents.kit`, so the film file does not change.

| Role | `subtle` | `neutral` | `cinematic` |
|---|---|---|---|
| `whoosh` | `whoosh-medium-soft` | `whoosh-medium-medium` | `whoosh-slow-medium` |
| `riser` | `riser-1s-soft` | `riser-1s-soft` | `riser-2s-strong` |
| `hit` | `impact-medium-soft` | `impact-heavy-firm` | `impact-deep-soft` |
| `ping` | `tone-ding-low` | `tone-ding-mid` | `tone-ding-mid` |

Every kit also holds named physical sounds for `audio.cues`: `paper-slide`, `paper-touch`, `card-touch`, `wood-touch`, `coin-drop`, `page-turn` and `pop-soft`.

These sounds are matched in loudness as supplied, so set `audio.accents.gainDb` to `0`. The default of `-8` suits the older tone kit.

## Cues

A cue ties a kit sound to a moment by name, so a re-timed film keeps its sound in step. The sound's peak lands on the moment.

```json
"cues": [{ "id": "proof", "sound": "coin-drop", "at": "why/match", "offsetFrames": 28, "gainDb": -3 }]
```

## Physical contacts

`ImpactSoundProfile` takes `variants`. Contacts rotate through the takes in a fixed order, so repeats do not use one file, and a re-render gives the same result.

## What the sounds are

All 23 are from [wyzowl/sfx-kit](https://github.com/wyzowl/sfx-kit), CC0. The source states that every sound is synthesized by code. They are designed sounds, not field recordings, and `origin` records that. The set has paper, card, coin and wood sounds. It has no footsteps.

## Limits

- **An agent cannot hear.** Levels and timing are measured. Taste is not. `docs/verification/sound-pack/` holds an A/B pair for a person to judge.
- CC BY sources pass the checks, but none are imported. Film-only rights stay out of a pack through `redistributableSounds`.
