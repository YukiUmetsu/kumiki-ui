# Cinematic Sound FX Pack: research and implementation plan

**Status:** M1 built, with one Foley preset. M0 is measured, and its listening half is waiting for the owner. See the [component spec](component-specs/sound-catalog.md) and the [verification report](verification/2026-11-06-sound-pack.md). · **Reviewed:** 2026-11-06 (expanded discovery, generation, QA, and Apple Silicon research)

## Decision

Build a **sample-first, deterministic, offline sound-design layer** for premium narrated explainers. Prefer real recordings for physical Foley, use CC0 sound packs for immediately reusable accents, and generate missing sounds with an **optional locally hosted model** after license and listening QA. Original synthesis adds controlled transients, low-frequency weight, motion, and sci-fi accents. Avoid a pure oscillator-based “game beep” aesthetic. No subscriptions, paid API, required model download, or live audio clock.

This is an **extension**, not a replacement, of Kumiki's existing audio system:

- `registry/video/audio-visual-cue.ts` already defines `SoundEvent`, `AudioLane`, `bakedContactsToSoundEvents`, `createAudioMixManifest`, and `audioMixFfmpegArgs`; reuse their rational-FPS/sample-domain timing and FFmpeg mix/export.
- `registry/video/film-document.ts` already maps transitions/turns to `whoosh`, `riser`, `hit`, `ping`; `npm run film:sound-kit -- <folder>` currently synthesizes a four-file, 48 kHz kit with peak offsets in `kit.json`. Improve its **sound sources and recipes** without making another soundtrack clock.
- Existing original audio builders (`scripts/build-product-hero-audio.mjs`, `build-epic-book-audio.mjs`, `build-hybrid-audio.mjs`) are examples of baked cue sheets; `registry/motion/baked-physical-motion.ts` supplies meaningful contact timing. Keep narration, music, and SFX independent.
- Honor `docs/10-character-audio.md`, `docs/11-rendering-quality.md`, `docs/13-content-creation-integrations.md`, and their license register. Do not rebuild mixing, captions, film editing, or character speech.

## Findings from implementation

| Plan said | Found | Result |
|---|---|---|
| Wyzowl: 320 CC0 synthesized WAVs, 48 kHz/24-bit, with `sounds.json` | True, and better than stated: each sound has a published SHA-256, a sync point, a loudness tier and `under_voiceover_db` | The importer verifies each hash, and `peakSeconds` comes from the sync point |
| Meta Open Sound: Oculus pack is CC BY 4.0 | True. GitHub's repository licence says CC0, which applies only to the instruments | Not imported. The plan was right, and the GitHub label misleads |
| M0 reproduces "a three-step stone walk" | Wyzowl has no footsteps | Not reproduced. Footsteps need another source, such as the Oculus pack with credit |
| M0 "must pass before architecture growth" | Half of M0 is a human listening test, and an agent cannot hear | Measured checks are done. M1 went ahead because it is rights and data work that any listening result still needs. The A/B pair is ready |
| Run Earshot in M0 | AGENTS.md rule 8 forbids running unreviewed external scripts | Not run. Review its code before use |
| MOSS v2 spike on the M4 | The machine is an M4 with 24 GB. The spike needs about 12 GB and a large weight download | Not run. The plan keeps it optional and out of the first PR |
| `SoundDesignSpec`, `bakeSoundDesign` and a content-addressed cache | The first preset needs none of them: a kit and `audio.cues` reach the same FFmpeg path | Not built. Add them with layered recipes |
| `SoundAssetRecord` fields | Built, with `origin`, `bitDepth`, `peakSeconds`, `loudnessLufs` and `description` added | `peak` as a level was dropped: the source gives a sync time, which is what a cue needs |

## Investigated free, commercially usable software

Licenses below apply to **code**, not automatically to demo sounds, model weights, or downloaded recordings. P0 = first evaluation/integration candidates; P1 = useful opt-in; R = researched but not initially needed. All listed software has a free commercially usable open-source license; re-check license and version before pinning. **A P0 listing does not mean its audio quality or runtime has already passed our benchmarks.**

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

### Expanded research: discovery, agent audition, generation, and sound finishing

| Repository / model | Verified free commercial license | Value and decision |
| --- | --- | --- |
| [Leonxlnx/earshot](https://github.com/Leonxlnx/earshot) | MIT code; optional [CLAP](https://huggingface.co/laion/larger_clap_general) Apache-2.0 and [AST](https://huggingface.co/MIT/ast-finetuned-audioset-10-10-0.4593) BSD-3-Clause weights | **P0 QA + kits.** CPU-local sound descriptions, match/find, critiques, seeded `sfx` bank (252 effects), `kit` with measured peak times, and fit-from-recording. Bank rendering needs no model download; optional analysis uses ~1.1 GB of pinned weights. Model scores are **not** proof of photographic/recorded Foley realism. `fit` derives from the source recording and **retains its license**. |
| [reeleehq/foley](https://github.com/reeleehq/foley) | MIT code; individual sources/models vary | **P0 retrieval spike.** Source/index/select/weave facade, local files + Openverse + Freesound adapters, CLAP search, context-based sound selection, license metadata. Reuse/adapt **retrieval and selection only**; Kumiki already owns timeline/mixer. Disable its optional paid/uncleared generator backends. Young project: validate behavior before adoption. |
| [OpenMOSS/MOSS-TTS: MOSS-SoundEffect v2](https://github.com/OpenMOSS/MOSS-TTS/tree/main/moss_soundeffect_v2) / [weights](https://huggingface.co/OpenMOSS-Team/MOSS-SoundEffect-v2.0) | Apache-2.0 **code and published model weights** | **P1 optional offline generator / P0 feasibility spike.** 1.3B DiT with Qwen3 text encoder; text-to-Foley/ambience/creature/action, 48 kHz, up to 30 s. Not a default runtime; generation may be slow and timing non-exact. Never replace a good licensed recording simply because an AI output exists. |
| [xocialize/mlx-moss-soundeffect-swift](https://github.com/xocialize/mlx-moss-soundeffect-swift) / [MLX v2 4-bit weights](https://huggingface.co/mlx-community/MOSS-SoundEffect-v2.0-4bit) | Apache-2.0 port and weights | **P1 Mac adapter candidate.** Swift/MLX MOSS v2 generation; author reports ~12.2 GB working set and 45 s/30-second latent on M5 Max for 4-bit. **M4/24 GB not verified**; measure CPU/GPU pressure, memory, output quality and total latency. macOS 26+ requirement; young integration. |
| [VladimirTalyzin/MOSS-SoundEffect_v2.0_MPS_ROCm](https://github.com/VladimirTalyzin/MOSS-SoundEffect_v2.0_MPS_ROCm) | Apache-2.0 | **R alternative** Python/MPS CLI and MCP integration. Reported working on Apple Silicon; compare with MLX instead of shipping two engines. |
| [appautomaton/mlx-speech](https://github.com/appautomaton/mlx-speech) / [MOSS-SoundEffect-MLX-4bit](https://huggingface.co/mlx-community/MOSS-SoundEffect-MLX-4bit) | MIT runtime; Apache-2.0 weights | **R.** Existing Apple MLX generator for **original MOSS SoundEffect**, not the v2 DiT; do not confuse with the v2 Swift path. |
| [TaaroBravo/semantic-audio-search](https://github.com/TaaroBravo/semantic-audio-search) | MIT | **P1 alternative** CLAP + hybrid keyword/vector search for local WAVs. Qdrant/FastAPI/Gradio is heavy for a small sound catalog; compare against Foley and simpler local index first. |
| [JesseRWeigel/sfxforge](https://github.com/JesseRWeigel/sfxforge) | MIT | **R.** Offline, model-free seeded procedural footsteps, material impacts and UI effects. Compare with Earshot and recordings; existing mono 16-bit game-audio output is not our premium-quality baseline. |
| [Signalsmith-Audio/signalsmith-stretch](https://github.com/Signalsmith-Audio/signalsmith-stretch) | MIT | **P1.** Pitch/time transformation to create subtle variations or fit duration with fewer artifacts; never stretch a contact transient beyond recognizability. |
| [Rikorose/DeepFilterNet](https://github.com/Rikorose/DeepFilterNet) | MIT / Apache-2.0 **code + model weights** | **P1 optional.** Clean noisy narration and speech-like recordings; do not strip purposeful room tone and environmental textures. |
| [timsainb/noisereduce](https://github.com/timsainb/noisereduce) | MIT | **P1 alternative.** Transparent, conventional spectral noise gating for approved samples; A/B against unprocessed originals. |
| [xiph/rnnoise](https://github.com/xiph/rnnoise) | BSD-style | **R.** Lightweight realtime speech/noise cleaner; less useful for natural cinematic Foley. |
| [RBYHNDRDS/add-sfx](https://github.com/RBYHNDRDS/add-sfx) | MIT | **R.** Reference agent skill for sparse, event-aligned effects and safe final-video processing, not another canonical timeline. |
| [eakbulut/foley](https://github.com/eakbulut/foley) | MIT | **R.** Small original Web Audio interaction-cue collection; avoid audible web-UI aesthetics in cinematic scenes. |

The separate `MOSS-SoundEffect v2` **model license** is verified at its publisher's model card. Other text/video-to-audio projects may publish permissive **code** but restrict **weights** or explicitly disclaim commercial suitability; they are intentionally absent. Do not treat a model's license as an assurance of sound quality, rights in training data, or compatibility with M4 hardware.

### Free recording sources: rights must travel with each file

| Source | Commercial-use rights | Distribution policy for Kumiki |
| --- | --- | --- |
| [Kenney Impact Sounds](https://kenney.nl/assets/impact-sounds), [Interface Sounds](https://kenney.nl/assets/interface-sounds), [UI Audio](https://kenney.nl/assets/ui-audio), [Sci-fi Sounds](https://kenney.nl/assets/sci-fi-sounds) | CC0, free, commercial permitted | **P0 starter pack:** select, listen, hash, and document specific recordings; CC0 files can be shipped. Some are stylized, so layer with higher-quality recordings. |
| [Freesound](https://freesound.org/help/faq/) | Per-sound CC0 or CC BY may allow commercial use | **P0 curated import:** default to individually verified **CC0**, with uploader/source URL/hash. CC BY is allowed only with traceable attribution in video/project metadata. Never assume all Freesound audio is CC0; exclude NC assets. |
| [OpenGameArt CC0 sound collections](https://opengameart.org/content/cc0-sound-effects) | CC0 **only when verified on individual submission** | **P1 curated import:** verify original uploader, file rights and actual pack contents; avoid bulk blanket assumptions. |
| [Openverse audio search](https://openverse.org/) / [API](https://api.openverse.org/v1/) | CC0/PD or per-item Creative Commons (some commercial with attribution); **index is not license proof** | **P0 discovery adapter:** search audio by semantic query and `license=cc0` for potential bundle inclusion; check original uploader/file page; persist license URL, creator and source ID. Follow [API terms](https://docs.openverse.org/terms_of_service): no scraping, respect rate limits/registration, and identify software as made using Openverse but not endorsed by it. |
| [Wyzowl SFX Kit](https://github.com/wyzowl/sfx-kit) | **CC0**, including all 320 WAVs and metadata | **P0 bundlable pilot:** 48 kHz/24-bit, 67 MB of original **synthesized** effects; `sounds.json` provides intended uses, avoid-list, sync peak, voiceover level, and audio measures. Can immediately populate cinematic accents and UI; listening QA still needed, not real field recordings. |
| [Meta Open Sound: Oculus Audio Pack](https://github.com/facebookincubator/Meta-open-sound) | **CC BY 4.0** for 289 game/VR effects; separate instruments **CC0** | **P1 optional credited Foley:** footsteps, doors, interactions, ambient loops. Record and include credits in rendered project/attribution manifest. Do not label its Foley as CC0; code and collections have different licenses. |
| [Hipdiscovery Free Sound Effects](https://github.com/hipdiscovery/Free-Sound-Effects) | Per-file verified **CC0** | **P1 small UI catalog:** ~100 effects, provenance and hashes; less breadth/realism than custom Foley. |
| [Leminno Ambient Sounds](https://github.com/Leminno-org/ambient-sounds-library) | Cataloged original/verified **CC0** entries | **P1 ambience seeds:** versioned procedural ambience and separate CC0 recordings. Inspect realism and loop seams before inclusion. |
| [SFXMint free catalog/MCP](https://github.com/sfxmint/sfxmint-mcp) | Existing sound files **CC0**, free discovery/download subject to rate limits | **R retrieval-only.** No paid API or paid sound generation integration; if free catalog coverage is useful, cache verified CC0 results locally. Assets are synthesized/AI-generated and need listening QA. |
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
| **P1** | **Found/Generated SFX**: never-covered ambience, unique objects, fictional interactions | Search verified CC0/licensed library first; optional MOSS v2 emits candidate WAVs; Earshot ranks and checks; compare human-approved reference | Fallback for content-specific scenes, not the default for all sound events |

Each pack should expose **subtle / neutral / cinematic** intensity, material/room selectors where relevant, and a no-SFX option. Prefer narrative clarity and silence over constant whooshes. A low-quality asset must never become louder to compensate for lack of realism.

## Integration contract and architecture

1. **Source registry** (`SoundAssetRecord`): stable `id`, `sha256`, `path`, `durationSamples`, `sampleRate`, `channels`, `peak`, `loudness`, `tags`, `material`, `sourceUrl`, `author`, `licenseId`, `attribution`, `redistributable`, `allowedUses`, `verifiedAt`. Treat project-imported files as project-local and never publish automatically. Fail closed on missing rights, invalid media, or path traversal.
2. **Semantic recipe** (`SoundDesignSpec`): `{ id, preset, frame, subframeOffset?, durationFrames?, sceneId?, layer[], seed, intensity, material?, motion?, room?, position3D?, licenseRefs[] }`; validate via versioned schema. A recipe names approved assets/parameters, never arbitrary JS/filter strings supplied by users or an AI agent.
3. **Compiler** (`bakeSoundDesign`): visual or contact event + recipe -> deterministic variant/layers -> offline WAV in content-addressed cache -> existing `SoundEvent`/`AudioMixManifest` -> existing FFmpeg export. Use canonical FPS-to-samples conversion; store peak onset offsets to align with cuts/gestures. Avoid adding another scheduler, audio lane, or renderer.
4. **Render adapters**: start with existing FFmpeg effects + optional `Tone.Offline`; optional room-IR processor behind capability detection. 48 kHz stereo WAV defaults, no network call, no GPU requirement, bounded memory on Apple Silicon M4/24 GB. Render once, reuse across Storybook, ContentGen, and final MP4.
5. **Storybook sound-design lab**: listen to dry/processed/A-B, inspect waveform/peak markers, set source/material/intensity/space, audition under sample narration, export licensed recipe + manifest. Controls must work with static, offline-generated fixture audio; never require continuous Tone transport.
6. **ContentGen handoff**: scene/character/action/narration metadata selects safe semantic presets; Kumiki returns reproducible WAV assets + cue manifest and provenance for final mixes. Retain the existing Fish Audio or other narration engine; no new remote SFX generator or per-render user approval.
7. **Discovery adapter**: use local catalog first, then optional Foley/Openverse/Freesound queries respecting each API's terms; query CC0 when redistribution is needed, save original source URL, license evidence, creator, and attribution. Semantic ranking is advisory, never licensing authority. Imported restricted files remain local and out of git/npm/CI.
8. **Quality + generation adapter**: Earshot `describe`/`match`/`find`/`critique` for candidate search and pre-render QA, `sfx`/`kit` for the existing peak-aligned film accent kit. Optional MOSS v2 Apple MLX/Python sidecar is **off by default** and runs after local+CC0 retrieval fails; require pinned Apache-2.0 weights, content-addressed output, bounded M4 memory, seed/provenance, and waveform/listening QA. A generator must never silently replace a real licensed recording.

## Implementation sequence and gates

1. **M0: Listening + M4 feasibility benchmark (must pass before architecture growth).** Reproduce a three-step stone walk, a metal/stone contact, a page turn, and a cinematic reveal. Compare existing four-sound kit, Wyzowl CC0, Earshot bank, licensed recordings, and MOSS v2 when useful; run offline on the actual M4/24 GB. Measure sound quality in blind A/B, intelligibility, peak sync, MOSS memory/latency, and cold vs warm model startup. Do not assume an Earshot score guarantees fidelity.
2. **M1: License-aware catalog + ready-made assets.** Import and curate verified Wyzowl CC0 entries and other explicitly verified sound files with `sounds.json` timing, provenance, attribution ledger, hashing, trim/fade, deduplication and safe workspace isolation. Validate Openverse provider metadata without trusting it as license proof. Unit-test prohibited rights, unknown sources, malformed WAVs, path traversal, and pack-export filtering.
3. **M2: Semantic selection + existing render hooks.** Evaluate Foley's source/index/select stages and Earshot's match/find/kit API against simple local search. Connect material contacts and `film:sound-kit` with existing `SoundEvent` and `kit.json`; retain FFmpeg and narration mixing. Add deterministic variations and cache invalidation.
4. **M3: Optional generation + ambience/spatial Storybook.** MOSS v2 offline sidecar only after no acceptable licensed sample; automated candidate rejection/fallback, resource limits, version/seed cache, and periodic human blind A/B to calibrate presets (**no per-render approval**). Add loop crossfades, room profiles, camera-relative sound and a Storybook A/B sound lab. Compare one room IR adapter before adding dependencies.
5. **M4: Mix mastering + autonomous ContentGen QA.** Measure loudness, true peak, clicks, DC, looping, sound/narration masking, exact transients and repeatability. Use Earshot critique as advisory evidence plus measurable signal checks and listening; narration-first ducking with profile-selectable loudness, fail/gate bad exports instead of hiding problems.

### Non-negotiable acceptance tests

- **Frame accurate:** cues/contacts align to the intended video frame and recorded transient peak, including fractional fps and subframe offsets; output stays sample-accurate through the existing renderer.
- **Audibly professional:** no synthetic footsteps or same-file repetition artifacts, coherent acoustic perspective, believable material-specific impacts, no transition overload, and narration remains intelligible on laptop/phone speakers.
- **Stable output:** pinned code/inputs/seed -> identical PCM on the same platform; cross-platform comparison within a declared numeric tolerance. No random playback-time selection, no missing file fallback to unrelated sound.
- **Production safe:** bounded memory/voices, 48 kHz stereo default, no clipping (configurable true-peak ceiling, e.g. -1 dBTP), delivery-profile-dependent loudness rather than one universal LUFS target; clean transient and ambience transitions.
- **License safe:** only verified commercial assets; shipping requires redistribution permission (CC0 or equivalent), imported restricted material never leaks into package/Storybook fixtures/CI, attribution is preserved, no training on asset recordings.
- **Generation safe:** model *weights* as well as code permit commercial use; optional local model fits declared RAM/time budgets, records model revision/seed/prompt and source lineage, and never automatically downloads non-permitted checkpoints.

**Still out of scope:** model downloads, remote inference, a rewritten FFmpeg export or mixer, and a ContentGen audio UI. The first code PR delivers **M1 and one Foley preset** (paper, card and coin on the example film). Whether that preset is "genuinely convincing" is the owner's call. **First optional generation spike:** MOSS v2 4-bit MLX on an actual M4/24 GB, with measured peak RSS and human A/B results, before declaring it a supported feature.
