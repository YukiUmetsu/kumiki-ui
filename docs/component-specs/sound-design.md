# Sound Design

**Registry items:** `sound-design`, `sound-mastering`
**Source:** `registry/video/sound-design.ts`, `registry/video/sound-mastering.ts`, `scripts/sound-catalog.mjs`
**Story:** `Video production/Sound Lab`

## Purpose

Sound design as data. A recipe names catalog sounds and bounded settings. It cannot hold a filter string, so an agent cannot put anything into FFmpeg. The compiler is pure: the same recipe and the same files give the same filter graph and the same cache key. FFmpeg runs once for each key, and the result enters the film as an ordinary `SoundEvent`. There is no second scheduler, audio lane or mixer.

## Commands

```bash
npm run sound:find -- "glass touch" --material=glass    # search the catalog
npm run sound:bake -- recipe.json                       # one cached WAV, in dist/sound-cache
npm run sound:measure -- mix.wav                        # loudness, true peak, DC, clipping, clicks
npm run sound:critique -- film.mp4                      # Earshot's advisory scorecard, if installed
npm run sound:lab                                       # remake the Storybook fixtures
```

## Recipes

```json
{
  "id": "cave-drop",
  "layers": [
    { "sound": "drop-water-full" },
    { "sound": "drop-water-small", "offsetMs": 90, "gainDb": -9, "pitchCents": -300 }
  ],
  "seed": 4,
  "intensity": "neutral",
  "room": "cave",
  "position": { "pan": -0.3, "distance": 4 }
}
```

The first layer's peak is the sync point. `soundDesignEvent` lands it on a frame, with fractional frame rates and sub-frame offsets. The peak stays correct through pitch changes.

| Setting | Values |
|---|---|
| `intensity` | `subtle` -6 dB, `neutral` 0 dB, `cinematic` +3 dB |
| `room` | `dry`, `outdoors`, `room`, `hall`, `cave`, `underwater` |
| `position.pan` | -1 (left) to 1 (right), at constant power |
| `position.distance` | 1 to 200 metres. Each doubling is 6 dB quieter, duller, and has more room in it |
| `seed` | Sets one take's small pitch change, within 35 cents. Omit it to keep the pitch exact |

## Takes

`soundVariant(pool, seed, index)` gives each pass through a pool its own order. It uses every take in a pass, and a pass never starts on the take that ended the last pass. `bakedContactsToSoundEvents` takes it through its `pick` option. The default stays the fixed rotation.

## Material contacts

`contactProfiles(catalog)` builds an `ImpactSoundProfile` for each material that has a sound. Footsteps have their own keys: `stone-step`, `gravel-step` and `wood-step`. A material with no sound stays out, so a contact is silent, not wrong.

## Rooms

A room is a seeded noise tail, convolved with FFmpeg's `afir`. FFmpeg already has this filter, so a room adds no dependency. Plain `aecho` was compared and rejected: it gives separate repeats, and convolution gives a smooth tail.

`wetDb` looks high because FFmpeg normalizes the tail. The values were set by measuring decay on a water drop. See the [verification report](../verification/2026-11-06-sound-pack.md).

## Ambience

A catalog sound with the `loop` tag repeats without a seam, because the importer crossfades its tail over its head. `compileAmbience` bakes a bed of any length with a fade at each end. A film uses `audio.beds`.

## Mastering

| Profile | Target | True peak ceiling | Tolerance |
|---|---|---|---|
| `youtube`, `social` | -14 LUFS | -1 dBTP | 1.5 LU |
| `podcast` | -16 LUFS | -1 dBTP | 1 LU |
| `broadcast` | -23 LUFS | -1 dBTP | 0.5 LU |

By default the master is one gain, which stops at the true peak ceiling. If one cue holds the gain back and the film misses its target, the export stops and names the fix. Lower the loudest cue, or raise the bed.

Real recordings have large natural peaks, so a mix of them cannot reach a platform's loudness on gain alone. Set `"limit": true` in `audio.master`. The limiter works at 4x oversampling, so it catches peaks between samples, and its latency is compensated, so transients stay on their frames. A mix that needs more than 9 dB of limiting stops, because that would crush the sound.

| Check | Stops the export? |
|---|---|
| Silent mix, clipping, DC offset above 0.005 | Always |
| True peak above the ceiling | When the film has `audio.master` |
| Loudness outside tolerance | When the film has `audio.master` and a bed or a voice. A film of separate effects gets a warning |
| Possible clicks | Warning |

`film:render` writes `mix-report.json` next to the video. The checks read each channel on its own, because a mono downmix can sum hotter than either channel and report false clipping.

## Narration first

`audioMixFfmpegArgs` takes `duckDb`, and `audio.master.duckDb` sets it for a film. The default is 12 dB. The voice pushes everything else down by that amount, and the bed returns when the voice stops. Two compressors in series remove a wet path while the voice speaks, which leaves a dry path at the target level. In silence, the two paths sum back to the bed. So the depth does not depend on how loud the voice is.

## Generation

Generation is optional, off by default, and a last resort. `npm run sound:generate -- "a prompt"` needs a local install of the MLX port of MOSS-SoundEffect v2. Kumiki does not install it.

| Rule | How it works |
|---|---|
| A real recording comes first | If the catalog matches most of the request, the command stops. `--force` overrides it |
| Same input, same file | The name is a hash of the prompt, seconds, seed, steps and model revision |
| Provenance | A JSON file records the model, the revision, the seed, the prompt, the time and the peak memory |
| Bad takes are rejected | A silent, clipped or offset take is deleted, and the command asks for another seed |
| It never enters the catalog by itself | A take stays in `dist/sound-generated`, with `origin: generated` |

Each clip takes about 4 minutes on an M4, and the process peaks at about 18 GB. Close other GPU work first. See the [verification report](../verification/2026-11-06-sound-pack.md).

## Search

`findSounds` scores material, ID, tags and description by exact words. It repeats exactly, needs no model, and never returns a record that fails a rights check. Semantic ranking stays advisory: a score never grants a right.

## Limits

- **An agent cannot hear.** Levels, timing and decay are measured. Taste is not.
- The room is one noise tail, not a measured space. It has no early reflections.
- Sound Lab fixtures are AAC files for listening. AAC can move a transient by a few milliseconds, so bake a WAV to check sync.
- The recorded sounds are cut from the original Freesound uploads, which are mostly 24-bit or 32-bit WAV or FLAC, re-cut on 2026-11-08. One source, the full water drop, was itself uploaded as an MP3.
- `sound:critique` scores against launch films. Treat it as advisory for other kinds of film.
