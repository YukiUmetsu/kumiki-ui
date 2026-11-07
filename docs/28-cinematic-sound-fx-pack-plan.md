# Cinematic Sound FX Pack: research and implementation plan

**Branch:** `feat/cinematic-sound-fx-pack` · **Status:** research/plan only · **Reviewed:** 2026-11-06

## Decision

Build a **sample-first, deterministic, offline sound-design layer** for premium narrated explainers. Professional Foley comes primarily from recordings; synthesis adds controlled transients, low-frequency weight, motion, and sci-fi accents. Avoid a pure oscillator-based “game beep” aesthetic. Prefer a small, clearly licensed CC0 starter catalog plus **user-imported** recordings, with complete provenance. No subscription, paid API, model inference, or dependency on a live audio clock.

This is an **extension**, not a replacement, of Kumiki's existing audio system:

- `registry/video/audio-visual-cue.ts` already defines `SoundEvent`, `AudioLane`, `bakedContactsToSoundEvents`, `createAudioMixManifest`, and `audioMixFfmpegArgs`; reuse their rational-FPS/sample-domain timing and FFmpeg mix/export.
- `registry/video/film-document.ts` already maps transitions/turns to `whoosh`, `riser`, `hit`, `ping`; `npm run film:sound-kit -- <folder>` currently synthesizes a four-file, 48 kHz kit with peak offsets in `kit.json`. Improve its **sound sources and recipes** without making another soundtrack clock.
- Existing original audio builders (`scripts/build-product-hero-audio.mjs`, `build-epic-book-audio.mjs`, `build-hybrid-audio.mjs`) are examples of baked cue sheets; `registry/motion/baked-physical-motion.ts` supplies meaningful contact timing. Keep narration, music, and SFX independent.
- Honor `docs/10-character-audio.md`, `docs/11-rendering-quality.md`, `docs/13-content-creation-integrations.md`, and their license register. Do not rebuild mixing, captions, film editing, or character speech.

## Investigated free, commercially usable software

Licenses below apply to **code**, not automatically to a project's demo sounds, pretrained weights, or downloaded recordings. P0 = recommended core; P1 = useful opt-in; R = researched but not initially needed. All listed software has a free commercially usable open-source license; re-check license and version before pinning.

| Repository | License | Role / Kumiki integration decision |
| --- | --- | --- |
| [Tonejs/Tone.js](https://github.com/Tonejs/Tone.js) | MIT | **P0.** `Tone.Offline` for original cinematic risers, filtered noise, tonal pings, sub-hits, and processing; bake WAV; **do not automatically reuse sample files from examples**. |
| [audiojs/audio](https://github.com/audiojs/audio) | MIT | **P1.** Optional TS audio editing/processing and sample manipulation; assess overlap with FFmpeg before adopting. |
| [audiojs/web-audio-api](https://github.com/audiojs/web-audio-api) | MIT | **P1.** Headless Node Web Audio adapter if `Tone.Offline` needs reliable non-browser rendering; compare portability and native build costs. |
| [thi-ng/umbrella `@thi.ng/dsp`](https://github.com/thi-ng/umbrella/tree/develop/packages/dsp) | Apache-2.0 | **P1.** Lightweight seedable noise, envelopes, signal processing; optional alternative to larger synth graph. Upstream GitHub is a mirror; check current canonical package source. |
| [naomiaro/waveform-playlist](https://github.com/naomiaro/waveform-playlist) | MIT | **P1.** Optional multitrack audition/edit view, cue trims, fades and export for Storybook; never canonical mix timing. |
| [naomiaro/react-waveform-playlist-components](https://github.com/naomiaro/react-waveform-playlist-components) | MIT | **R.** React UI reference for optional editor; avoid duplicate controls. |
| [katspaugh/wavesurfer.js](https://github.com/katspaugh/wavesurfer.js) | BSD-3-Clause | **P0 authoring only.** Zoomable waveform/regions, transient and loop-boundary inspection; not the offline audio render engine. |
| [goldfire/howler.js](https://github.com/goldfire/howler.js) | MIT | **P1 preview only.** Audition pre-rendered samples without altering timeline. Already listed by Kumiki. |
| [csteinmetz1/pymixconsole](https://github.com/csteinmetz1/pymixconsole) | MIT | **P1.** Optional headless EQ/compressor/pan/reverb-bus quality comparison; FFmpeg remains default exporter. |
| [LCAV/pyroomacoustics](https://github.com/LCAV/pyroomacoustics) | MIT | **P1.** Offline room impulse responses based on dimensions and source/listener geometry for caves, halls, rooms; performance-gated. |
| [audiolabs/rir-generator](https://github.com/audiolabs/rir-generator) | MIT | **P1 alternative.** Simpler room IR generator; choose it **or** pyroomacoustics after listening/benchmarking, not both by default. |
| [resonance-audio/resonance-audio-web-sdk](https://github.com/resonance-audio/resonance-audio-web-sdk) | Apache-2.0 | **R.** Binaural/ambisonic spatial audio reference; archived project, compatibility risk; not a default dependency. |
| [RustAudio/dasp](https://github.com/RustAudio/dasp) | MIT / Apache-2.0 | **R.** Frame/sample DSP and resampling if an audio worker eventually runs in Rust. |
| [AudioKit/AudioKit](https://github.com/AudioKit/AudioKit) | MIT | **R.** Native Swift/Apple-only audio engine; cross-platform Kumiki does not require it. |
| [iver56/audiomentations](https://github.com/iver56/audiomentations) | MIT | **P1.** Deterministic *production* variation of licensed recordings (small pitch, gain, time shift, EQ); do not use as an ML-training pipeline. |
| [meyda/meyda](https://github.com/meyda/meyda) | MIT | **P1.** RMS, spectral features, transient/energy checks for browser-side inspector. |
| [librosa/librosa](https://github.com/librosa/librosa) | ISC | **R.** Python onset/spectral diagnostics for offline benchmark runs. |
| [csteinmetz1/pyloudnorm](https://github.com/csteinmetz1/pyloudnorm) | MIT | **P0 QA option.** BS.1770 integrated loudness measurement; pair with peak/true-peak measurement. |
| [slhck/ffmpeg-normalize](https://github.com/slhck/ffmpeg-normalize) | MIT | **R.** FFmpeg loudness wrapper; avoid adding if existing export filters suffice. |
| [ttencate/jfxr](https://github.com/ttencate/jfxr) | BSD-3-Clause | **R.** Procedural UI/game sound inspiration only; too synthetic for main Foley catalog. |
| [loov/jsfx](https://github.com/loov/jsfx) | MIT | **R.** Small procedural accent generator; prioritize Tone recipes instead. |
| [KilledByAPixel/ZzFX](https://github.com/KilledByAPixel/ZzFX) | MIT | **R.** Tiny original UI bleeps; use sparingly, not for cinematic environmental realism. |
| [k33bz/timbre](https://github.com/k33bz/timbre) | MIT | **R.** Example procedural SFX algorithms; audition against actual Foley before copying any recipe. |
| [NilayShenai/Songbird](https://github.com/NilayShenai/Songbird) | MIT | **R.** Browser synthesis experiments for drones/electronics; not a core mixer. |
| [csteinmetz1/dasp-pytorch](https://github.com/csteinmetz1/dasp-pytorch) | Apache-2.0 | **R.** Advanced differentiable DSP ideas; unnecessary PyTorch cost for normal SFX. |

### Free recording sources: rights must travel with each file

| Source | Commercial-use rights | Distribution policy for Kumiki |
| --- | --- | --- |
| [Kenney Impact Sounds](https://kenney.nl/assets/impact-sounds), [Interface Sounds](https://kenney.nl/assets/interface-sounds), [UI Audio](https://kenney.nl/assets/ui-audio), [Sci-fi Sounds](https://kenney.nl/assets/sci-fi-sounds) | CC0, free, commercial permitted | **P0 starter pack:** select, listen, hash, and document specific recordings; CC0 files can be shipped. Some are stylized, so layer with higher-quality recordings. |
| [Freesound](https://freesound.org/help/faq/) | Per-sound CC0 or CC BY may allow commercial use | **P0 curated import:** default to individually verified **CC0**, with uploader/source URL/hash. CC BY is allowed only with traceable attribution in video/project metadata. Never assume all Freesound audio is CC0; exclude NC assets. |
| [OpenGameArt CC0 sound collections](https://opengameart.org/content/cc0-sound-effects) | CC0 **only when verified on individual submission** | **P1 curated import:** verify original uploader, file rights and actual pack contents; avoid bulk blanket assumptions. |
| [Sonniss GameAudioGDC free archive](https://sonniss.com/gameaudiogdc/) / [GDC 2026](https://gdc.sonniss.com/) | Free commercial film/video synchronization under [bundle license v2.0](https://sonniss.com/gdc-bundle-license/); **not CC0** | **Optional end-user local import only**, never distribute raw or processed SFX as a Kumiki pack, SDK, or template. The license separately forbids AI-development/training uses; disable for any unclear AI/ML workflow and seek clarification before integration into AI-generated-video automation. Never auto-download or automatically bundle. |

The free library/source shortlist intentionally includes **no subscription, paid-only, noncommercial-only, or unverified-license** dependency. “Commercial end-video use” is not the same permission as “redistribute sounds inside a public npm package.” A library's MIT code license does not relicense its bundled demonstration WAVs.

## Packs and reusable presets to ship

| Priority | Pack / presets | Sound design (recording + optional original DSP) | Trigger and explainer use |
| --- | --- | --- | --- |
| **P0** | **Cinematic Foley**: stone/sand/gravel/wood steps; paper turns; book shut; cloth/foliage rustle; glass/metal handling | Transient, body, texture and tail layers; 6–12 source variations where possible; seed-stable sample selection, subtle pitch/EQ changes | Character walk contacts, illustrated history books, desk props, natural world scenes |
| **P0** | **Physical Impact & Mechanism**: drop, collision, roll, creak, hinge, machinery | Material-pair + mass/speed-derived gain/spectral brightness; soft contact versus hard collision; audible weight, never fake huge bangs | Connect `bakedContactsToSoundEvents` and physical-motion events; deterministic per contact |
| **P0** | **Cinematic Transition & Reveal**: silk/air whoosh, pass-by, soft riser, deep reveal hit, gentle realization ping | Noise sweep + layered source + tonal sub + shaped reverb tail; center transient/peak to kit offsets | Upgrade existing `film:sound-kit` and `audio.accents` without changing `FilmDocument` shape |
| **P1** | **Atmosphere & Weather**: desert wind, cave air/drips, forest dawn, rain, room tone, underwater texture, city bed | Crossfaded stereo loops, broad/near detail layers, short evolving one-shots, noise-floor continuity | Location-setting storytelling and seamless cuts; quiet under narration |
| **P1** | **Spatial & Acoustic**: near/far, behind camera, interior, stone cave, library, large hall, outdoors | Distance rolloff, pan, air absorption, early reflections/IR convolution, sensible wet/dry; offline bake | Moving 3D cameras, Pip/Quill dialogue, flying/walking through environments |
| **P1** | **Science/Technology**: pulse, data sweep, scanner, activation, shimmer, hologram, gentle UI click | Primarily original Tone.js layered synthesis, filtered noise, modulated harmonics; restraint and low masking | Diagrams, science explainers, future-technology scenes |

Each pack should expose **subtle / neutral / cinematic** intensity, material/room selectors where relevant, and a no-SFX option. Prefer narrative clarity and silence over constant whooshes. A low-quality asset must never become louder to compensate for lack of realism.

## Integration contract and architecture

1. **Source registry** (`SoundAssetRecord`): stable `id`, `sha256`, `path`, `durationSamples`, `sampleRate`, `channels`, `peak`, `loudness`, `tags`, `material`, `sourceUrl`, `author`, `licenseId`, `attribution`, `redistributable`, `allowedUses`, `verifiedAt`. Treat project-imported files as project-local and never publish automatically. Fail closed on missing rights, invalid media, or path traversal.
2. **Semantic recipe** (`SoundDesignSpec`): `{ id, preset, frame, subframeOffset?, durationFrames?, sceneId?, layer[], seed, intensity, material?, motion?, room?, position3D?, licenseRefs[] }`; validate via versioned schema. A recipe names approved assets/parameters, never arbitrary JS/filter strings supplied by users or an AI agent.
3. **Compiler** (`bakeSoundDesign`): visual or contact event + recipe -> deterministic variant/layers -> offline WAV in content-addressed cache -> existing `SoundEvent`/`AudioMixManifest` -> existing FFmpeg export. Use canonical FPS-to-samples conversion; store peak onset offsets to align with cuts/gestures. Avoid adding another scheduler, audio lane, or renderer.
4. **Render adapters**: start with existing FFmpeg effects + optional `Tone.Offline`; optional room-IR processor behind capability detection. 48 kHz stereo WAV defaults, no network call, no GPU requirement, bounded memory on Apple Silicon M4/24 GB. Render once, reuse across Storybook, ContentGen, and final MP4.
5. **Storybook sound-design lab**: listen to dry/processed/A-B, inspect waveform/peak markers, set source/material/intensity/space, audition under sample narration, export licensed recipe + manifest. Controls must work with static, offline-generated fixture audio; never require continuous Tone transport.
6. **ContentGen handoff**: scene/character/action/narration metadata selects safe semantic presets; Kumiki returns reproducible WAV assets + cue manifest and provenance for final mixes. Retain the existing Fish Audio or other narration engine; no new remote SFX generator or per-render user approval.

## Implementation sequence and gates

1. **M0: Listening benchmark (must pass before architecture growth).** Reproduce one realistic 3-step stone walk, a heavy metal/stone contact, a page turn, and a cinematic reveal with existing baseline versus sample-first layered design; run on M4 offline. Gather A/B listening judgment, reference recordings, CPU/memory/time, and narration masking notes. Reject obviously fake or fatiguing results.
2. **M1: Licensing + asset preparation.** Add CC0-specific import validator, attribution ledger, file hashing, resample/trim/fade, loop-point detection, deduplication and safe workspace isolation. Build a small legal starter set; retain optional user-supplied assets in local cache, not git/npm. Unit-test wrong-license rejection and malformed/path-traversal WAV metadata.
3. **M2: Core Foley + physical/reveal hooks.** Bake original Tone/FFmpeg layers; connect material-contact mapping and `film:sound-kit` while keeping current `SoundEvent` and `kit.json` semantics. Add per-scene deterministic variation and asset/algorithm versioned cache invalidation.
4. **M3: Spatial/ambience & Storybook.** Implement loop crossfades, room profiles, 3D relative listener/camera sound, one optional room IR adapter after A/B measurements. Add reusable Storybook controls, preset galleries, and exact peak-marker visual QA.
5. **M4: Mix mastering & ContentGen bridge.** Measure integrated loudness, true peak, clipping, DC offset, clicks at boundaries, loop discontinuities, overlapping voice masking, and offline determinism. Speech-first ducking with selectable delivery profiles; fail/gate a bad export rather than silently overcompressing narration.

### Non-negotiable acceptance tests

- **Frame accurate:** cues/contacts align to the intended video frame and recorded transient peak, including fractional fps and subframe offsets; output stays sample-accurate through the existing renderer.
- **Audibly professional:** no synthetic footsteps or same-file repetition artifacts, coherent acoustic perspective, believable material-specific impacts, no transition overload, and narration remains intelligible on laptop/phone speakers.
- **Stable output:** pinned code/inputs/seed -> identical PCM on the same platform; cross-platform comparison within a declared numeric tolerance. No random playback-time selection, no missing file fallback to unrelated sound.
- **Production safe:** bounded memory/voices, 48 kHz stereo default, no clipping (configurable true-peak ceiling, e.g. -1 dBTP), delivery-profile-dependent loudness rather than one universal LUFS target; clean transient and ambience transitions.
- **License safe:** only verified commercial assets; shipping requires redistribution permission (CC0 or equivalent), imported restricted material never leaks into package/Storybook fixtures/CI, attribution is preserved, no training on asset recordings.

**Not in this branch:** implementation, audio downloads, dependency additions, PR, remote inference, model weights, rewritten FFmpeg export/mixer, or new ContentGen audio UI. First code PR should deliver **M0–M1 and one genuinely convincing Foley/impact preset**, not a large catalog of weak synth demos.
