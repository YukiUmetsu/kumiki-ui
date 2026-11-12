# 34 — Promo motion and sound: what award and showcase work uses that Kumiki lacks

**Research:** 2026-11-11 · **Status:** all 31 moves built (2026-11-12). Storybook **Video production → Promo Moves → Progress** shows each with its story. Every built move is in the component catalog as `move:<code>` (for example `npm run catalog:find -- --query="sonic logo"`), from the same table as the Progress story (`src/video/promo-moves/progress.ts`). Built: T1 dip and fade; T2 flash cut and burst; T3 shape wipe; T4 organic matte; T5 dither; T6 stutter; T7 polarity flip; T8 lens gateway; T9 panels; A1 rapid word flash; A2 type wall; A3 rebuild (letters only); A4 weight swell; A5 scramble; A6 smears and squash; A7 line boil; A8 glass lens; A9 several cursors; A10 generate; A12 focus pull (photo cards); S1 air gap; S2 drop-out; S9 bed dips under hits; S10 quieter accents (opt-in); S3 swell and level arc; S7 drone, pulse and Shepard rise; S4 braam and layered hit; S5 reverse swell; S6 tape stop and rewind; S8 sonic logo; A11 sound-driven motion.

**Decisions (owner, 2026-11-11):** the owner accepted the suggestions in *Open questions*: up to three flashes a second, checked on rendered frames; whooshes only on travelling moves for new films; a rewind with no story link back is a warning; a sonic logo is made on request, not by default.

## Question

Kumiki can already cut, dissolve, wipe, whip, match, grow a tile, pass behind a foreground and zoom through. It has speed ramps, J- and L-cuts, cold opens, film looks, screen demos and a sound kit (whoosh, riser, hit, ping).

Award sites and showcase sites collect the best promos, trailers, idents and motion films. What animations, transitions and sounds do those films use that Kumiki cannot make yet? For each one: what is it, what does it look or sound like, where can you see it, and how would we build it?

This follows [doc 32](32-professional-video-recipes-research.md) (ad and explainer recipes) and [doc 33](33-film-looks-and-style-anchors.md) (film looks). Doc 32 covered *what story structure to use*. This doc covers the *small moves* inside a film: the moments of picture and sound.

## How sources are graded

The same letters as doc 32, plus two of our own:

- **A:** peer-reviewed or reproducible research.
- **B:** a platform's own large dataset.
- **C:** practitioner, studio, vendor or press material. It shows what professionals do. Its numbers are not checked.
- **M (measured):** our own counts from the numeric data in `kumiki-reference-lab` (see *Measured patterns* below). These are detector results on sampled windows of real films, not human-confirmed edits.
- **S (spot check):** a person saw this in one or two films. It shows the move exists; it does not show how common it is.

## What was studied

### The 13 sites

| Site | What it offers | What was useful here |
|---|---|---|
| [Directors' Library](https://directorslibrary.com/) | Campaigns, music videos, shorts and film, with director, agency, format and festival filters | A place to find examples by director and format. The list pages give credits only, no technique notes |
| [STASH](https://www.stashmedia.tv/) | Short articles on animation, VFX and title work | Technique notes: [dithered, deliberately "less perfect" 3D titles](https://www.stashmedia.tv/escafandra-studio-opens-web-unleashed-2026/), [music-driven precision in *PLUS*](https://www.stashmedia.tv/take-a-break-from-festive-feels-and-get-lost-in-renaud-hallees-new-short-film-plus/), [a three-colour poster-style title](https://www.stashmedia.tv/alt-western-buck-opens-bass-x-machina-on-netflix/) |
| [Motionographer](https://motionographer.com/) | Long articles and interviews | [*Don't Blink*: type and rhythm](https://motionographer.com/2016/09/14/4-ways-dont-blink-is-a-masterclass-of-type-and-rhythm/), the most exact technique article found (frame counts per word) |
| [shots](https://shots.net/the-work) | Ad news by brand and director | Context. [Hand-drawn scribbles that dance to the music](https://shots.net/news/view/starbucks-draws-us-in-with-another-seasonal-scribble) |
| [Ads of the World](https://www.adsoftheworld.com/medium_types/film) | 30,000+ film ads with brand and agency | A large index of ads. No technique notes on the list pages |
| [Vimeo Staff Picks](https://vimeo.com/channels/staffpicks) | Curated shorts and music videos | Needs a real browser (the page is built in JavaScript). Current picks include [Son Lux "Out Into Us"](https://vimeo.com/1228116196) and [Balming Tiger "Janjan"](https://vimeo.com/1210405418) |
| [Clio Awards](https://clios.com/winners-gallery/) | Winners by programme and craft category | Shows which crafts are judged: Animation, Design Craft. [*Cash in Cash out*](https://clios.com/winners-gallery/details/3956) won Animation; [Channel 4 Idents](https://clios.com/winners-gallery/details/13240) won Art Direction. Credits need a login |
| [AICP Awards Archive](https://aicp.com/aicp-awards/aicp-awards-archive) | US craft awards | Its Post Awards judge editing, audio mixing, **sound design**, colour, graphic design and VFX as separate crafts. Sound design is a craft of its own |
| [Little Black Book](https://lbbonline.com/work) | Work and news | Needs a real browser. Has a monthly "best work" round-up |
| [Motion Design Awards](https://www.motiondesignawards.com/) | Motion films, each scored by voters for concept, design, **motion** and **sound** | 491 entries measured in the reference lab (see below). The top motion and sound scores went to [PlusOne's *Manifesto*](https://www.motiondesignawards.com/project/46/plusone-manifesto), [*Node Fest 2024* titles](https://www.motiondesignawards.com/project/2008/node-fest-2024) and [Microsoft *Loop*](https://www.motiondesignawards.com/project/882/microsoft-loop) |
| [Promonews](https://www.promonews.tv/videos) | Music video reviews | Technique notes: [a lens filter used as "a gateway between setups"](https://www.promonews.tv/videos/2026/11/03/ear-candy-clean-clothes-rob-ulitski/96844), speed ramps, high-speed inserts |
| [FrameThrower](https://framethrower.ai/reference) | 2.4 million tagged frames, 78 named camera techniques | A reference search by light, lens and shot size. Paid tool; no technique list on the open page |
| [FilmDraft](https://filmdraft.co/trailers) | 2,861 trailers, grouped by film: teaser, trailer 1, 2, final | Shows that one campaign makes several cuts of different lengths from the same material |

### Other sources

- **Trailer sound craft:** [Violet Recording: sound design for trailers](https://violetrecording.com/sound-design-for-trailers/), [Ableton: high-impact sounds for movies and trailers](https://www.ableton.com/en/blog/learn-how-to-make-high-impact-sounds-for-movies-and-trailers/) (C).
- **Famous sound devices:** [Dunkirk's ticking watch and Shepard tone](https://www.cbc.ca/radio/q/blog/hans-zimmer-explains-the-audio-trickery-that-made-dunkirk-audiences-nauseous-1.4311684); [how the Netflix "ta-dum" was made](https://www.musicradar.com/news/the-netflix-ta-dum-sound-features-a-reversed-electric-guitar-sample-that-was-created-using-90s-effect-pedals) (C).
- **Editing craft:** [Nike *You Can't Stop Us*, split-screen edit](https://www.adweek.com/creativity/the-hardest-commercial-i-have-ever-edited-how-nike-created-its-split-screen-masterpiece/) (C); [trailer structure, quoting a trailer editor](https://filmmakermagazine.com/?p=37093) (C).
- **Material and type:** [Apple Liquid Glass lensing, WWDC25 session 219](https://nonstrict.eu/wwdcindex/wwdc2025/219/), [building glass for the web](https://aave.com/design/building-glass-for-the-web) (C); [variable font axes in After Effects](https://helpx.adobe.com/au/after-effects/desktop/variable-font-axes/work-with-variable-font-axes/working-with-variable-font-axes.html) (C).
- **Launch films:** What Ships spot checks in `kumiki-reference-lab/research/whatships-browser-observations-2026-11-10.json` (S).

### What could not be read

- Art of the Title and Creative Review returned 403 to the fetch tool.
- Vimeo and Little Black Book needed a real browser. A short Playwright visit listed only titles.
- Most award and gallery list pages give credits, not technique. Technique notes came from articles, interviews and the measured data.
- **No video was watched for this doc.** Each "before / after" below describes the intended result from the sources. It is not a frame review of the reference films.

## Measured patterns (M)

These counts were made on 2026-11-11 with small one-off scripts over the numeric files in `kumiki-reference-lab`. The scripts and counts are not committed there. The data sets:

- **15 film trailers** (Disney, Pixar, Marvel, Warner, Sony, Universal, Blender Studio): three 20 s windows each, with cut candidates, audio levels, brightness and image motion.
- **491 Motion Design Awards entries**, picture only.
- **63 Motionographer clips**, picture only.

| Pattern | Number | What it means for Kumiki |
|---|---|---|
| Few cuts land on a sound attack | 25 of 268 trailer cut candidates have a level attack within ±250 ms | Sound runs across most cuts. A whoosh on every transition is not the norm |
| Builds rise and stay up | 67 sustained climbs of 1.5–3 s and at least 8 dB; only 5 end in a drop | A swell that ends louder, not only a riser that ends in a hit |
| Silence is an event | 38 gaps of 150 ms or more in 13 of 15 trailers, median 0.7 s. 13 of the 24 gaps inside a window are followed within 250 ms by a loud hit | An air gap before a hit |
| Hard drop-outs | 22 falls of 18 dB or more within 150 ms, in 7 trailers | A drop-out that cuts the bed with no fade |
| Level follows an arc | Median level −27 dBFS at the opening, −19 in the middle, −22 at the end | Bed level per act |
| Black is part of the edit | 14% of sampled trailer frames are black. 10 of 15 open on black; 14 end on black; every trailer has black frames inside it | Dips to black, opening and ending on black |
| Very short changes in bursts | 35% of motion-award films have changes 3 frames or less apart. 372 bursts, median 4 changes in 0.42 s | A flash-cut burst, with a safety cap |
| Light and dark flips | 25% of motion-award films jump between a dark and a light frame | A polarity flip |
| Few steady pulses | Only 2 of 45 trailer windows show a strong regular pulse | Beat sync is not the first thing to build |

## What Kumiki already has

Checked in the code on 2026-11-11, so these are not proposed again:

- **Transitions** (`FilmTransition` in `registry/video/film-document.ts`): `cut`, `dissolve`, `wipe` (straight edge), `whip`, `match`, `container`, `pass-by`, `zoom`. A transition can carry one shader effect. The motion kernel's masks (`registry/motion/masks.ts`) can also sweep radially, but films cannot ask for that.
- **Time:** speed ramps with holds, `play` stretches, cold open, loop ending.
- **Sound:** kit sounds `whoosh`, `riser` (1 s and 2 s), `hit`, `ping`; a whoosh at the middle of every transition; `turnAccent` (`soft`, `impact`, `none`); named cues; beds with fades, `lowpassHz` and `reverse`; scene sounds with J- and L-cuts; voice ducking (`duckDb`); mastering; sound recipes with layers, pitch, rooms and pan (`sound-design`); original sounds from FFmpeg recipes (`sound:synth`).
- **Type:** word-by-word reveals (`KineticWords`, `animated-text`), word highlight captions, impact typography styles (snap, overshoot, wipe, word highlight, count-up), count-ups (`animated-metric`).
- **Shape:** contour morphs (`shape-morph`), draw-on strokes, cut-paper title sequence.
- **Accents** (`registry/motion/attention-editing-treatments.ts`): punch scale, outline pulse, one brief flash, directional shake, chromatic offset, focus rack. These are plans for a host to draw. Films cannot use them yet.
- **Looks:** grain, halation, weave, flicker, light leaks, scan lines, on-twos cadence, ink outlines. No depth of field.
- **Shader effects:** mesh gradient, grain gradient, liquid metal, god rays, water over a picture, halftone dots.
- **Demos:** screen demo with one cursor, clicks, typing, scrolling and callouts.

## The gaps, ranked

| Rank | Item | Kind | Evidence | Effort |
|---|---|---|---|---|
| P0 | [S1 Air gap](#s1-air-gap) | Sound | M, C | Small |
| P0 | [S2 Drop-out](#s2-drop-out) | Sound | M, C | Small |
| P0 | [S3 Swell and level arc](#s3-swell-and-level-arc) | Sound | M, C | Small |
| P0 | [T1 Dip to black, white or colour](#t1-dip-to-black-white-or-colour) | Transition | M | Small |
| P0 | [S10 Quieter default accents](#s10-quieter-default-accents) | Sound policy | M | Small |
| P1 | [S4 Braam and layered hit](#s4-braam-and-layered-hit) | Sound | C | Small |
| P1 | [S5 Reverse swell into a cut](#s5-reverse-swell-into-a-cut) | Sound | C | Small |
| P1 | [S7 Pulse bed and endless rise](#s7-pulse-bed-and-endless-rise) | Sound | C | Medium |
| P1 | [S9 Bed dips under hits](#s9-bed-dips-under-hits) | Sound | C | Small |
| P1 | [A1 Rapid word flash](#a1-rapid-word-flash) | Type | C | Small |
| P1 | [A2 Type wall](#a2-type-wall) | Type | S | Small |
| P1 | [T2 Flash cut and flash burst](#t2-flash-cut-and-flash-burst) | Transition | M, C | Small (needs a decision) |
| P1 | [T3 Shape wipe and iris](#t3-shape-wipe-and-iris) | Transition | C | Small |
| P1 | [T9 Split screen and panels](#t9-split-screen-and-panels) | Layout | C | Medium |
| P2 | [S6 Tape stop and rewind](#s6-tape-stop-and-rewind) | Sound + picture | C | Small |
| P2 | [S8 Sonic logo](#s8-sonic-logo) | Sound | C | Medium |
| P2 | [A3 Type that acts out its word](#a3-type-that-acts-out-its-word) | Type | C | Medium |
| P2 | [A4 Variable font breathing](#a4-variable-font-breathing) | Type | C | Small |
| P2 | [A5 Text scramble](#a5-text-scramble) | Type | C | Small |
| P2 | [A6 Smears and squash](#a6-smears-and-squash) | Animation | C | Medium |
| P2 | [A9 Several cursors](#a9-several-cursors) | Demo | S | Small |
| P2 | [A10 Prompt, working, result](#a10-prompt-working-result) | Demo | S | Small |
| P2 | [T4 Organic matte](#t4-organic-matte) | Transition | C | Medium |
| P2 | [T6 Stutter](#t6-stutter) | Transition + sound | C | Small |
| P2 | [T7 Polarity flip](#t7-polarity-flip) | Transition | M | Small |
| P3 | [A7 Line boil](#a7-line-boil) | Animation | S, C | Small |
| P3 | [A8 Glass lens](#a8-glass-lens) | Material | S, C | Medium |
| P3 | [A11 Sound-driven motion](#a11-sound-driven-motion) | Animation | S | Medium |
| P3 | [A12 Focus pull](#a12-focus-pull) | Camera | C | Medium |
| P3 | [T5 Dither dissolve](#t5-dither-dissolve) | Transition | C | Small |
| P3 | [T8 Lens gateway](#t8-lens-gateway) | Transition | C | Small |

**Why sound comes first:** the measured trailers say the most about sound (silence, drop-outs, swells, arcs), and Kumiki's sound is the thinnest part. Every film gains from it, and none of it needs new art.

---

## Sound

Every sound item below enters the film as ordinary audio events through the existing mixer (`audioMixFfmpegArgs` in `registry/video/audio-visual-cue.ts`). None adds a second scheduler or mixer, and none accepts a filter string from a film file. Original sounds are made with `sound:synth` recipes (FFmpeg's deterministic expression evaluator), so they are the project's own work under its licence.

### S1 Air gap

**Built 2026-11-11.** See [Film Document → Air gaps, drop-outs and ducking under hits](component-specs/film-document.md#air-gaps-drop-outs-and-ducking-under-hits). Room tone is not added: the beds themselves, at −40 dB, are the room.

**What it is.** Just before a big moment, every sound stops for a short time. Then the hit lands. The silence makes the hit feel louder, even when its level is the same.

**Where we saw it.** 13 of 15 measured trailers have silences of 150 ms or more; median 0.7 s. More than half of the silences inside a window are followed within 250 ms by a loud hit (M). Trailer sound guides describe "dropping everything out for a beat" before the final hit ([Violet](https://violetrecording.com/sound-design-for-trailers/), [Ableton](https://www.ableton.com/en/blog/learn-how-to-make-high-impact-sounds-for-movies-and-trailers/)) (C).

**Before / after.**

```
before:  bed ▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇  hit ▇  bed ▇▇▇▇▇      (the hit sits on top of the bed; it barely stands out)
after:   bed ▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▁▁▁▁▁▁  hit █  bed ▇▇▇▇▇      (0.4–0.8 s of near-silence, then the hit)
picture: …the title card appears on the hit frame, often after a cut to black during the gap
```

**How it should sound.**
- Length 0.15 s to 1.1 s. Default 0.5 s. Under 0.15 s reads as a click; over 1.5 s the viewer thinks the film broke.
- Every lane drops, including the bed, scene sounds and music. Narration is the one exception: a line *can* sit in the gap (a whispered line before the title is a trailer classic).
- The fall into silence takes 2 to 4 frames, not a slow fade. The silence is not digital zero: keep a room tone 40 dB down, so it sounds like a held breath, not a dropout.
- The hit after it is the loudest event of that act.

**How to build it in Kumiki.**

```json
"audio": { "gaps": [{ "id": "breath", "before": "title/reveal", "frames": 15, "keep": ["narration"] }] }
```

- `before` names a moment, like a cue, so the gap follows the film when it is re-timed.
- Compile each gap to a gain envelope on every lane except `keep`, in `registry/video/audio-visual-cue.ts`, next to the existing duck.
- Room tone: a new looped catalog bed, `bed-room-tone`, made with `sound:synth` (pink noise, low-passed at 2 kHz, −45 LUFS).

**Checks.**
- `gap-no-hit` (warning): nothing peaks within 250 ms after the gap ends.
- `gap-length` (warning): outside 0.15 to 1.5 s.
- `gap-too-many` (warning): more than one gap per 20 s. The device stops working when it repeats.

### S2 Drop-out

**Built 2026-11-11.** See [Film Document → Air gaps, drop-outs and ducking under hits](component-specs/film-document.md#air-gaps-drop-outs-and-ducking-under-hits).

**What it is.** The music or bed stops dead on a frame, with no fade. Often it happens on a cut to black or a joke, and the next shot plays in near-silence.

**Where we saw it.** 22 falls of 18 dB or more within 150 ms, in 7 of 15 trailers (M). The "sudden cut to near-silence" is in [Violet's toolkit](https://violetrecording.com/sound-design-for-trailers/) (C). Comedy trailers use it for the "record scratch" beat.

**Before / after.**

```
before:  music ▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▅▄▃▂▁        (every Kumiki bed fades out)
after:   music ▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▁          (stops in one frame, on the cut)
```

**How it should sound.**
- The level falls within 1 to 2 frames (a 10 to 20 ms ramp, so there is no click).
- What is left: room tone, a single voice or one small sound (a footstep, a cough). The quiet is the joke or the shock.
- A short reverb tail of the music may ring out under it; option `tail: true` keeps 0.3 s of the bed's room.

**How to build it in Kumiki.** Add `"cut": true` on a bed or scene sound end, and on a transition `{ "kind": "cut", "audio": "drop" }`. The mixer already writes fades per bed (`compileAmbience`); a cut end is a fade of 1 frame with a 15 ms ramp.

**Checks.** `drop-click` (error) if the ramp is shorter than 5 ms. `drop-no-silence` (warning) if another bed at the same level keeps playing, so the drop cannot be heard.

### S3 Swell and level arc

**Built 2026-11-11** as bed `gain` points with `open`. The `audio.arc` shortcut and an `arc-flat` check are not built. See [Film Document → Swells, tonal beds and catalog cues](component-specs/film-document.md#swells-tonal-beds-and-catalog-cues).

**What it is.** The bed slowly gets louder and fuller over several seconds, and stays up. The film's overall level also follows a shape: quiet opening, loud middle, pulled-back ending.

**Where we saw it.** 67 sustained climbs of 1.5 to 3 s in all 15 trailers; only 5 end in a drop (M). Opening, middle and end median levels: −27, −19, −22 dBFS (M). Trailer guides describe a tension bed "with filter and volume automation so it swells gradually" and an escalating arc: quiet open, rising middle, biggest hits at the end ([Violet](https://violetrecording.com/sound-design-for-trailers/)) (C). [A trailer editor](https://filmmakermagazine.com/?p=37093) starts from three music cues, one per act (C).

**Before / after.**

```
before:  bed ▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇  (one level the whole film)
after:   bed ▂▂▂▃▃▃▄▄▅▅▆▆▇▇▇▇▇▇▇▇▆▆▅▅▄▄▄▄▄  (act 1 low, swell into act 2, ease off for the end card)
         filter: dull ────────► open      (the bed brightens as it rises, not only louder)
```

**How it should sound.**
- A swell lasts 2 to 8 s and adds 6 to 12 dB. It opens a low-pass filter at the same time (from about 800 Hz to fully open), so it gets brighter as well as louder.
- The level arc moves in steps of 4 to 8 dB per act. The end pulls back 3 to 5 dB so the end card and sonic logo have room.
- Narration ducking still wins over the swell.

**How to build it in Kumiki.**

```json
"beds": [{ "id": "score", "sound": "bed-drone-low", "gain": [
  { "at": "hook/start", "db": -8 }, { "at": "proof/start", "db": 0, "rampSeconds": 4, "openHz": true }, { "at": "end/start", "db": -4 } ] }]
```

- `gain` keyframes are named moments plus a ramp. Compile them to an FFmpeg `volume` expression and a time-varying `lowpass` in the bed's lane. Both are fixed filters with bounded numbers; the film never writes a filter string.
- `audio.arc: "rise-fall"` is a shortcut: it sets keyframes at each act from the story's turns.
- Needs tonal beds first (S7), because the six nature beds do not "swell" musically.

**Checks.** `arc-flat` (warning, extends the existing story check): a film of 30 s or more whose bed level never changes by 4 dB. `swell-into-narration` (warning): a swell peaks under a spoken line.

### S4 Braam and layered hit

**Built 2026-11-11**: the sounds, `turnAccent: "braam"`, and layered hits as cues on one moment (no `hit-stack` preset). See [Film Document → Braam, layered hits and reverse swells](component-specs/film-document.md#braam-layered-hits-and-reverse-swells).

**What it is.** A *braam* is a huge, low brass-like blast with a long dark tail. It marks a title or a big reveal. A *layered hit* is one impact built from three parts that land on the same sample: a sharp click on top, a body in the middle, and a sub-bass underneath that you feel more than hear.

**Where we saw it.** The braam is described in [Ableton's guide](https://www.ableton.com/en/blog/learn-how-to-make-high-impact-sounds-for-movies-and-trailers/): a long low note around C1 to C2, octave layers above and below, distortion moving on one layer, a big reverb. The three-tier hit is in [Violet](https://violetrecording.com/sound-design-for-trailers/) (C). Kumiki's catalog has single impacts, `boom-drop-soft` and `bass-rumble-short`, but no braam, and hits are single files.

**Before / after.**

```
before:  title appears ─ "thud" (one 0.3 s impact)
after:   title appears ─ "tk" + "BWAAAM" + sub drop, ringing out over 2–4 s while the title holds
```

**How it should sound.**
- Braam: 2 to 4 s, fundamental 32 to 65 Hz, a slow pitch bend down of 1 to 2 semitones over its length, a dark reverb tail.
- Layered hit: transient (0 to 30 ms), body (to 300 ms), sub drop (a sine falling from about 60 to 30 Hz over 0.5 to 1 s, with a fast 5 ms fade-in so it does not click).
- Use the biggest one once, at the end. Guides warn against "peaking too early" and against sub on every hit.

**How to build it in Kumiki.**
- Three original `sound:synth` recipes: `braam-low` (stacked saw waves at octaves, soft-clipped, low-passed, convolved with the existing `hall` room), `sub-drop` (falling sine) and `hit-transient` (filtered noise click).
- A kit role `braam`, and a sound-design recipe preset `hit-stack` that layers transient + any catalog impact + `sub-drop`, using the existing `layers`, `offsetMs` and peak-alignment. The first layer's peak stays the sync point.
- `turnAccent: "braam"` beside `soft`, `impact` and `none`.

**Checks.** `sub-overuse` (warning): more than three sub drops in a 30 s film. Existing true-peak and loudness checks cover the rest.

### S5 Reverse swell into a cut

**Built 2026-11-11** as `swell-reverse` and the transition `accent: "suck"`, a synthesized reversed swell rather than any sound reversed at bake time. See [Film Document → Braam, layered hits and reverse swells](component-specs/film-document.md#braam-layered-hits-and-reverse-swells).

**What it is.** A sound that grows *backwards* into a moment: you hear a reverb tail getting louder, and it stops exactly on the cut. It "sucks" the viewer into the next shot.

**Where we saw it.** Reverse reverb is a standard swell: render a reverb, flip it, and end it on the hit, so the tail comes before the sound ([Amped Studio](https://ampedstudio.com/blog/reverse-reverb/)). Guides suggest a longer decay than usual, about 2 to 5 s, and sound libraries sell swells with an abrupt end because it gives an editor one exact frame to cut on (C). The Netflix "ta-dum" ends on [a reversed guitar recording](https://www.musicradar.com/news/the-netflix-ta-dum-sound-features-a-reversed-electric-guitar-sample-that-was-created-using-90s-effect-pedals) (C).

**Before / after.**

```
before:  shot A ───────────| shot B       sound: whoosh peaks in the middle of a dissolve
after:   shot A ───────────| shot B       sound: ▁▂▃▄▅▆▇█|  (the swell ends on the exact cut frame, then silence or the next hit)
```

**How it should sound.** 0.5 to 2 s. Rises in level and brightness. Ends with no tail, on the frame. Works best on a hard cut, not a dissolve.

**How to build it in Kumiki.** A sound-design option `"reverse": true` already exists for beds; add it for one-shots, so any catalog sound (for example `impact-deep-soft` with the `hall` room) is rendered with its room, then reversed. The sync point becomes the *end*, not the peak: `soundDesignEvent` places the last sample on the cut frame. Film syntax: `{ "kind": "cut", "accent": "suck" }`.

**Checks.** `suck-on-dissolve` (warning): a reverse swell on a transition longer than 4 frames, where it has no single frame to land on.

### S6 Tape stop and rewind

**Built 2026-11-11** as a speed-ramp hold's `sound: "tape-stop"` and a scene's `rewind`, warping the finished mix. `rewind-meaning` is a warning, as decided. See [Film Document → Tape stop and rewind](component-specs/film-document.md#tape-stop-and-rewind).

**What it is.** *Tape stop*: everything slows down and drops in pitch until it stops, like a tape machine switched off. *Rewind*: the sound runs backwards at speed with a rising chatter. Both pair with picture: a freeze or slow-down for the stop; the picture running backwards for the rewind ("let's go back").

**Where we saw it.** Tape stop is "a pitch-down effect" from reel-to-reel machines; a slow sag suits a tired ending, a fast brake suits an abrupt cut ([SoundBridge](https://www.soundbridge.io/create-a-tape-stop-effect)) (C). Kumiki's speed ramps already slow the picture, but the sound never follows.

**Before / after.**

```
before:  picture slows to a hold (speed ramp) · music carries on at normal speed — they disagree
after:   picture slows to a hold · music pitch falls with it ▇▆▅▃▂▁ and stops on the held frame
rewind:  picture runs backwards over 0.5 s · sound: fast reversed chatter, rising
```

**How it should sound.** Stop: 0.3 to 1.2 s, pitch falls about two octaves, level falls with it. Rewind: 0.4 to 1 s, reversed and sped up 3 to 6 times.

**How to build it in Kumiki.**
- In the mixer, apply `asetrate` + `atempo` steps (fixed filters, bounded numbers) to every lane over a span. Do it once on the pre-master mix, so all lanes stop together.
- Link it to picture: a speed ramp hold may set `"sound": "tape-stop"`; a new scene option `"rewind": { "frames": 15 }` plays the scene's last frames backwards (a time map, like `play`) and adds the rewind sound.

**Checks.** `rewind-meaning` (warning): a rewind with no story link back to an earlier scene. The owner dislikes backward movement that does not read as time rewinding (see [open question 3](#open-questions)).

### S7 Pulse bed and endless rise

**Built 2026-11-11**: `bed-drone-low`, `bed-pulse-tick` and `rise-shepard`, with cues that name catalog sounds. A bed's `bpm` grid for snapping cuts is not built. See [Film Document → Swells, tonal beds and catalog cues](component-specs/film-document.md#swells-tonal-beds-and-catalog-cues).

**What it is.** A *pulse bed*: a steady low tick or throb, like a clock or heartbeat, under the picture. It adds pressure without music. An *endless rise* (Shepard tone): a sound that seems to climb forever without getting higher. It holds tension over a long build.

**Where we saw it.** *Dunkirk* built its score on a recorded pocket watch turned into a pulse, and on a Shepard tone; the boats share the music's tempo ([CBC, Hans Zimmer](https://www.cbc.ca/radio/q/blog/hans-zimmer-explains-the-audio-trickery-that-made-dunkirk-audiences-nauseous-1.4311684); [Business Insider, Christopher Nolan](https://www.businessinsider.in/christopher-nolan-explains-the-audio-illusion-that-created-the-unique-music-in-dunkirk/amp_articleshow/59742153.cms)) (C). The Shepard tone is a stack of tones an octave apart, each fading in at the bottom and out at the top. Kumiki has no tonal or musical bed at all: its six beds are water, wind and cave.

**Before / after.**

```
before:  a 20 s product build plays over a waterfall bed, or over nothing
after:   tick · tick · tick · tick (90 per minute), getting brighter; a Shepard rise fades in for the last 6 s; air gap; hit
```

**How it should sound.**
- Pulse: 60 to 120 per minute; a dull tick (filtered click) or a soft sub thump. The tempo is declared, so cuts and cues can snap to it.
- Shepard rise: 6 to 8 octave-spaced sines or saws, a 4 to 10 s cycle, low-passed. Fade it in; never let it play alone for more than about 10 s.
- Drone: a low pad of two or three notes with slow filter movement. Use it as the bed that S3 swells.

**How to build it in Kumiki.**
- Three `sound:synth` recipes that loop without a seam (the importer already crossfades loops): `bed-pulse-tick`, `bed-drone-low` and `rise-shepard`.
- Beds take `bpm`, so a bed carries a beat grid like a music lane in `audio-visual-cue`. This is the first step to doc 32's blocked **beat sync**, using our own bed instead of a licensed track.
- The look's `bedTags` (doc 33) can then point at real tonal beds.

**Checks.** `pulse-cut-drift` (warning, optional): a film that declares `snapToPulse` but has cuts more than 2 frames off the grid.

### S8 Sonic logo

**Built 2026-11-11** as `brand.sonic`, on request only, as decided. The tones are the catalog's two bell recordings, pitched; the reversed bloom is a shimmer for glass. The `sonic-logo-missing` and `sonic-logo-drift` checks are not built (one film cannot see another). See [Film Document → Sonic logo](component-specs/film-document.md#sonic-logo).

**What it is.** A short, owned sound for the brand mark: two or three notes or a struck object, plus a short "blossom" tail. It plays with the end card, every time.

**Where we saw it.** The Netflix "ta-dum": a wedding ring knocked on a wooden cabinet, layered with a slowed anvil and muted hits, then a reversed guitar "blossom" ([MusicRadar](https://www.musicradar.com/news/the-netflix-ta-dum-sound-features-a-reversed-electric-guitar-sample-that-was-created-using-90s-effect-pedals); [Twenty Thousand Hertz](https://www.20k.org/episodes/netflix)) (C). Doc 32 already found that brands are recognised by distinctive, repeated assets (B). Kumiki has one generic `sting-airy-short`.

**Before / after.**

```
before:  end card + the same airy sting every brand uses
after:   end card + "tk–DUM, shhhh" built from the brand's own seed: two notes, a struck material, a reversed bloom
```

**How it should sound.** 1 to 3 s. A clear attack on the frame the mark lands. Two to four notes at most. The same every time for one brand, and different between brands.

**How to build it in Kumiki.**
- `brand.sonic: { "seed": 7, "material": "wood", "notes": 2 }` on the film's brand.
- Compile with existing parts: a struck foley sound for the material (catalog `foley-*-touch`), slowed and pitched (`pitchCents`); one or two tones from a fixed synth recipe on a scale picked by the seed; a reversed tail (S5). Bake with `sound:bake` so one brand always gets the same file.
- The end card's mark-landing moment is the sync point.

**Checks.** `sonic-logo-missing` (info) for a branded film. `sonic-logo-drift` (warning): two films with the same brand name and different sonic settings.

### S9 Bed dips under hits

**Built 2026-11-11.** See [Film Document → Air gaps, drop-outs and ducking under hits](component-specs/film-document.md#air-gaps-drop-outs-and-ducking-under-hits).

**What it is.** Each time a hit lands, the bed and music dip for a fraction of a second, then come back. The hit punches through without being turned up.

**Where we saw it.** "The tension bed and score duck for a fraction of a second under each hit" ([Violet](https://violetrecording.com/sound-design-for-trailers/)) (C). Kumiki ducks under narration only.

**Before / after.** Before: hit and bed add up, the master hits its peak limit, and the master gain falls for the whole film. After: the bed dips 3 to 6 dB for 100 to 250 ms under each hit; the hit reads clearly and the film can be louder overall.

**How to build it in Kumiki.** Treat hits, braams and accents as a second sidechain key in `audioMixFfmpegArgs`, beside narration, with its own `hitDuckDb` (default 4) and a fast release (150 ms). Same two-compressor design as the voice duck.

**Checks.** None new. The mix report already shows loudness and peaks.

### S10 Quieter default accents

**Built 2026-11-11.** See [Film Document → Air gaps, drop-outs and ducking under hits](component-specs/film-document.md#air-gaps-drop-outs-and-ducking-under-hits). Room tone is not added: the beds themselves, at −40 dB, are the room.

**What it is.** A policy change, not a component. Today `film:render` puts a whoosh at the middle of *every* transition.

**Where we saw it.** Only 25 of 268 trailer cut candidates have a sound attack within ±250 ms (M). Sound guides tie whooshes to "fast camera moves, logo reveals and section transitions", not to every cut (C).

**Before / after.** Before: every cut and dissolve goes "whoosh", so the film sounds like a template. After: a whoosh only on moves that travel (whip, pass-by, zoom, container); plain cuts and dissolves are silent unless a cue asks.

**How to build it in Kumiki.** `audio.accents.on: "moves"` (new default) or `"all"` (today's behaviour). Keep `"all"` for existing films via the schema version, so no film changes silently.

**Checks.** `accent-every-cut` (warning): more than 70% of transitions have an accent.

---

## Transitions

Each new transition is a new `kind` in `FilmTransition` (`registry/video/film-document.ts`), drawn in `registry/video/film-stage.tsx`, with the same rules as today's: its frames overlap the incoming scene; reduced motion keeps a plain dissolve or cut; `film:check` warns about bad timing.

### T1 Dip to black, white or colour

**What it is.** The picture fades to a flat colour, holds, and fades up on the next scene. Also: a film opens from black and ends on black. A dip can carry one line of text on the hold ("Two years later", a date, a title).

**Where we saw it.** 14% of sampled trailer frames are black; 10 of 15 trailers open on black, 14 of 15 end on black, and all of them have black frames inside (M). 30% of motion-award films open on black and 9% on white (M). Kumiki has neither a dip nor an opening or closing fade.

**Before / after.**

```
before:  [scene A]──dissolve──[scene B]          (the two pictures mix; a time jump does not read as a jump)
after:   [scene A]▓▓▒░  ■■■■  ░▒▓▓[scene B]       (out 8 f · hold 6–24 f on black · in 8 f)
         with text: ■■ "THREE DAYS LATER" ■■       (the line sits alone on the black)
```

**How it should look.**
- Out 6 to 12 frames, hold 0 to 24 frames, in 6 to 12 frames. A dip to white is shorter (it is bright and tiring): hold 2 to 8 frames.
- The colour can be the brand colour, for a branded chapter break.
- Fades work in linear light, not on gamma pixel values, so mid-tones do not go muddy on the way down.
- Text on a dip uses the film's caption style and needs its reading time (the existing reading-time check).

**How to build it in Kumiki.**

**Built 2026-11-11.** See [Film Document → Dip and fade](component-specs/film-document.md#dip-and-fade).

```json
{ "kind": "dip", "color": "#000000", "holdFrames": 12, "text": "Three days later" }
```

and on the film, `"fade": { "in": 18, "out": 24 }`. The film's length still equals the sum of its scenes: the dip's frames come out of the incoming scene, like every transition.

**Checks.** `dip-hold-long`, `dip-text-time` (a warning, like the other reading-time checks), `dip-white-long`, `dip-timing`, and `dip-hides-start`, added after review: the incoming scene's clock runs under the colour. Reduced motion keeps the dip; it is not motion.

### T2 Flash cut and flash burst

**Built 2026-11-11.** See [Film Document → Flash cut, burst and flip](component-specs/film-document.md#flash-cut-burst-and-flip). Inserts take 2 to 6 frames each (one frame is below what the eye can name), and flips live on cards.

**What it is.** *Flash cut*: one to three white (or colour) frames on a cut, like a camera flash. *Flash burst*: three to seven very short shots, two or three frames each, in under a second. Used at peaks of energy: a drop in the music, a montage climax, a memory flash.

**Where we saw it.** 35% of motion-award films have changes 3 frames or less apart; 372 bursts, median 4 changes in 0.42 s (M). Editors describe a 4 to 6 frame white solid with a fade-out, placed on a beat ([editing forum tutorials](https://www.dvinfo.net/forum/what-happens-vegas/125973-make-clip-flash-beats-vegas-pro-8-a.html)) (C). Promonews notes "high-speed inserts" in [*Northside Needs Me*](https://www.promonews.tv/videos/2026/11/11/blackhaine-northside-needs-me-mau-morgo/96936) (C). Kumiki allows one flash per impact accent and refuses loops, for photosensitivity.

**Before / after.**

```
before:  [A]────────|[B]                                  (plain cut on the music's drop)
flash:   [A]────────|□□▒[B]                                (2 white frames, then 2 fading frames)
burst:   [A]────|c1 c1|c2 c2|c3 c3|c4 c4 c4|[B]            (4 inserts, 2–3 frames each, 0.4 s)
```

**How it should look.**
- Flash: 1 to 3 frames at full white, then 2 to 4 frames fading. Use a "screen" blend so the picture shows through the fade, rather than a flat white card.
- Burst inserts are *related*: close-ups of the same subject, or the next scenes previewed. Random images read as noise.
- **Safety:** no more than three large luminance flashes in any one second, and red flashes count double. This follows the common broadcast guidance for photosensitive viewers (WCAG 2.3.1 uses the same three-per-second limit). This needs the owner's approval, because it loosens today's one-flash rule.

**How to build it in Kumiki.**

```json
{ "kind": "flash", "color": "#fff", "frames": 2, "fadeFrames": 3 }
{ "kind": "burst", "inserts": [{ "scene": "proof", "at": "reveal" }, { "image": "a.jpg" }, { "image": "b.jpg" }], "framesEach": 2 }
```

Inserts reuse scenes (a single content frame, like `play`) or images. A sound tick per insert can come from the kit's `ping` or a short click.

**Checks.** `flash-rate` (error): more than three flashes in one second over 25% of the frame, measured on the rendered frames by the existing rendered-frame audit. `burst-unrelated` (warning): inserts that share no subject with the scenes around them. Reduced motion: the flash becomes a 4-frame dissolve; the burst becomes one held insert.

### T3 Shape wipe and iris

**Built 2026-11-11.** See [Film Document → Shape wipe](component-specs/film-document.md#shape-wipe). The parameter is `subject`, like the other transitions, and a mark wipe fades the scene in around the mark over its last third.

**What it is.** The next scene is revealed through a growing shape: a circle (an iris), a diamond, a star, or the brand's own mark. The shape can grow from a point that matters (a face, a button, the logo).

**Where we saw it.** Editing tools offer a shape wipe with a chosen shape, position, direction and edge ([Maxon shape wipe](https://help.maxon.net/rg/en-us/Content/html/Transitions/shape-wipe.html)) (C). Brand idents often grow the next shot from the logo; Channel 4's 2023 idents keep the logo "as the central axis of each film" ([D&AD](https://www.dandad.org/work/annual-2024/behind-the-work/how-broadcaster-channel-4-depicted-a-nation-in-25-idents)) (C). Kumiki's mask kernel can sweep radially, but films can only ask for a straight-edge `wipe`.

**Before / after.**

```
before:  wipe: a straight edge crosses the frame left to right
after:   iris: a circle opens from the speaker's face until it covers the frame ( · → ○ → ◯ → full )
         mark: the brand mark scales up from the centre and the next scene shows inside it
```

**How it should look.**
- 10 to 20 frames. The shape grows on an ease that starts slow and ends fast (it must cover the corners at the end).
- An optional thin edge line (brand colour, 0.3% of the short side) makes the shape read as designed, not as a mask.
- The shape must cover the far corner on the last frame. For a circle from a point, radius = distance to the furthest corner.

**How to build it in Kumiki.** `{ "kind": "shape", "shape": "circle" | "diamond" | "mark", "from": "<subject id>", "edge": "#2f6bff" }`. Use the existing `radial` mask for circles; add an SVG-path mask for other shapes, scaled about the subject's centre. `"mark"` uses the film brand's mark path.

**Checks.** `shape-subject` (error), `shape-timing` (warning, under 8 or over 30 frames). Reduced motion: dissolve.

### T4 Organic matte

**Built 2026-11-11.** See [Film Document → Matte and dither](component-specs/film-document.md#matte-and-dither).

**What it is.** The next scene is revealed through a moving natural texture: ink spreading in water, paint strokes, smoke, torn paper. The edge is soft and irregular.

**Where we saw it.** Stock libraries sell ink, brush and smoke luma mattes as organic transitions, and editing plug-ins draw ink-like edges with adjustable edge delay and luma detail ([Film Impact Shape Flow](https://filmimpact.com/shape-flow-premiere-pro)) (C). The method is the same in each: a matte that animates over time decides which scene shows. Kumiki already has a luma mask kind in `registry/motion/masks.ts`, but no film transition uses a moving texture.

**Before / after.** Before: a dissolve, where both pictures are half-visible. After: black ink blooms from two points; inside the ink, scene B; outside, scene A. Edges are soft and branching. 0.6 to 1.2 s.

**How to build it in Kumiki.**
- Do not use stock files (licence and look). Generate the matte procedurally and deterministically per frame: a threshold that rises over a seeded fractal noise field, with a little domain warping so it spreads like ink. One small shader in the existing shader layer, which is already seek-exact.
- `{ "kind": "matte", "texture": "ink" | "brush" | "smoke", "seed": 3, "from": "<subject id>" }`.

**Checks.** `matte-timing` (warning). Reduced motion: dissolve. A review frame at the midpoint, because a bad seed can leave a hole of scene A in the centre at the end.

### T5 Dither dissolve

**Built 2026-11-11.** See [Film Document → Matte and dither](component-specs/film-document.md#matte-and-dither).

**What it is.** The picture changes through a pattern of hard pixels, like an old computer screen or a print: the new scene appears dot by dot in an ordered pattern.

**Where we saw it.** Escafandra's title sequence used voxels, pixels and dithering, "intentionally losing information" ([STASH](https://www.stashmedia.tv/escafandra-studio-opens-web-unleashed-2026/)) (C). The visual styles list in the reference lab names "grainy print texture" and "faux stop-motion and rough DIY print" as studio styles (S).

**Before / after.** Before: smooth dissolve. After: a 4×4 or 8×8 ordered (Bayer) pattern turns on, cell by cell, in 8 to 16 frames, at a visible pixel size (0.5 to 1% of the short side).

**How to build it in Kumiki.** A shader that compares a Bayer threshold to the transition's progress. Best paired with the `analog-video` or a new `print` look. `{ "kind": "dither", "cell": 0.008 }`.

**Checks.** Reduced motion: dissolve. `dither-text` (warning) when a scene's text sits in the frame during the transition (text breaks into dots).

### T6 Stutter

**Built 2026-11-11** for picture. See [Film Document → Stutter](component-specs/film-document.md#stutter). Repeating sound cues inside the stutter waits for the sound work.

**What it is.** A few frames repeat two to four times on a beat, picture and sound together ("b-b-b-but"). It stresses a moment or a word.

**Where we saw it.** A common editing move in music videos and trailers; the measured bursts of 2 to 3 frame changes include it (M), and sound guides list stutters among trailer effects (C). Kumiki's `film-look` has a `step` cadence that holds frames, but nothing repeats a short stretch.

**Before / after.** Before: the shot plays once. After: frames 40–44 play, then 40–44 again, and again, then the shot carries on. The sound of those frames repeats in the same rhythm.

**How to build it in Kumiki.** A time map, like a speed ramp: `"stutter": { "at": "reveal", "frames": 4, "repeats": 3 }`. The scene sound and any cue inside the span repeat too (the mixer slices the audio of that span and repeats it).

**Checks.** `stutter-on-ui` (warning, like `look-cadence-on-ui`: it reads as broken playback on screen recordings). Reduced motion: no repeat.

### T7 Polarity flip

**Built 2026-11-11** as `flips` on cards. See [Film Document → Flash cut, burst and flip](component-specs/film-document.md#flash-cut-burst-and-flip).

**What it is.** A hard cut between the same layout drawn dark-on-light and light-on-dark. Two or three flips in a row give a punchy rhythm without changing the content.

**Where we saw it.** 25% of motion-award films jump between a dark and a light frame between adjacent samples (M). Common in type-led brand films.

**Before / after.** Before: one title card in white on black. After: the card cuts to black on white on the beat, then back, then holds.

**How to build it in Kumiki.** Card and type scenes already draw from the film's `appearance`. Add `"flip": [{ "at": 12 }, { "at": 18 }]` on a scene, which swaps ground and ink tokens at those frames. Not a pixel inversion: images and photos stay as they are.

**Checks.** Counts as a flash in `flash-rate` (T2).

### T8 Lens gateway

**Built 2026-11-11** as the `lens` transition. See [Film Document → Glass lens and lens gateway](component-specs/film-document.md#glass-lens-and-lens-gateway).

**What it is.** A filter or glass passes in front of the lens (a prism, a coloured gel, frosted glass), and the next scene appears behind it as it clears.

**Where we saw it.** Promonews describes "a lens filter that acts as a gateway between setups" in [*Clean Clothes*](https://www.promonews.tv/videos/2026/11/03/ear-candy-clean-clothes-rob-ulitski/96844) (C).

**How to build it in Kumiki.** A variant of `pass-by`, where the foreground is a refracting glass (see A8) rather than a dark shape. Low priority: build A8 first.

### T9 Split screen and panels

**Built 2026-11-11** as the `panels` scene. See [Film Document → Panels](component-specs/film-document.md#panels). Panels line up in time by named moments (`align`), not by subject position: each panel is its own compiled film, so their subjects do not share coordinates.

**What it is.** The frame splits into two, three or more panels that play at once. The strongest version matches movement across the split: a motion in one panel continues in the next, so two different moments read as one gesture.

**Where we saw it.** Nike's *You Can't Stop Us*: 72 archive clips combined into 36 split-screen moments, each pair matched by eye ([Adweek](https://www.adweek.com/creativity/the-hardest-commercial-i-have-ever-edited-how-nike-created-its-split-screen-masterpiece/); [Working Not Working](https://magazine.workingnotworking.com/creative-work-blog/you-cant-stop-us-nike-ad)) (C). It is also the classic before/after and "two worlds" device. Kumiki has a split-screen plan (`compileSplitScreen`) and a side-by-side comparison stage, but no film scene that plays two scenes in panels.

**Before / after.**

```
before:  [scene A] cut [scene B]
after:   ┌──────┬──────┐   the split line opens from the centre in 10 f,
         │  A   │  B   │   A's swing continues into B's swing across the line,
         └──────┴──────┘   then the line closes and B fills the frame
```

**How to build it in Kumiki.**
- A `"recipeId": "panels"` scene: `{ "layout": "2-vertical" | "2-horizontal" | "3" | "grid-4", "panels": [{ "scene": "a" }, { "scene": "b", "offsetFrames": 6 }], "match": { "subject": "ball" } }`. Each panel draws a scene (each already a pure function of its frame) clipped to its box, using the film's existing per-output reflow.
- `match` aligns a subject's position across the split line at a named moment, using the subject boxes the `match` transition already uses.
- Portrait outputs stack panels top and bottom.

**Checks.** `panels-text-small` (warning): text in a panel falls below the minimum size once scaled. `panels-too-many` (warning): more than four panels on a 9:16 output.

---

## Animation and type

### A1 Rapid word flash

**Built 2026-11-11** as the `words` card. See [Ad Formats → Cards](component-specs/ad-formats.md#cards).

**What it is.** One word at a time, each shown alone for a fifth of a second, replacing the last. The text reads at the edge of reading speed, which feels urgent.

**Where we saw it.** Apple's *Don't Blink*: most words stay up for "five to seven frames" (about 0.2 s at 29.97 fps), close to 300 words per minute, and almost every word has one or two syllables ([Motionographer](https://motionographer.com/2016/09/14/4-ways-dont-blink-is-a-masterclass-of-type-and-rhythm/)) (C). Kumiki's `KineticWords` *adds* words one by one until a line is complete; it does not replace them.

**Before / after.**

```
before:  "Your  budget  leaks  every  week"   (words appear left to right and stay)
after:   "Your" → "budget" → "LEAKS" → "every" → "week"   (each alone, centre frame, 6 frames each)
```

**How it should look.**
- 5 to 7 frames per short word at 30 fps; longer words get more (scale by syllables or letters). Never under 4 frames.
- Words are big (12 to 25% of the frame height) and centred. Cut on, cut off: no fade, because a fade eats the reading time.
- Vary the pace: a run of fast words, then one word held 1 to 2 s. *Don't Blink* stays readable for 107 seconds because it changes speed.
- Pair with a percussive bed (S7). A tick per word is optional; on every word it becomes tiring.

**How to build it in Kumiki.** A `"card": "flash-words"` card, or an option on `KineticWords`: `{ "mode": "replace", "framesPerWord": 6, "hold": ["leaks"] }`. Timing per word from `displayUnits` (already used for CJK-safe splitting).

**Checks.** `words-too-fast` (error under 4 frames per word; warning when the average is over 330 words per minute). Caption duplicates: a flash-word scene should not also show captions of the same words. Reduced motion: show the full phrase at once.

### A2 Type wall

**Built 2026-11-11** as the `wall` card. See [Ad Formats → Cards](component-specs/ad-formats.md#cards).

**What it is.** One word, repeated in rows, fills the whole frame and runs off its edges. Rows may slide in opposite directions. A single colour ground, a single ink colour.

**Where we saw it.** The *Claude Motion Reel* fills a fluorescent yellow frame with oversized repeated black "NEVER" lettering (What Ships spot check) (S). The same move is common in brand manifesto films.

**Before / after.** Before: "NEVER" centred on a card. After: "NEVER NEVER NEVER" in eight rows, cut off at the frame edges, alternate rows sliding left and right at a slow constant speed; one row is a different colour or weight.

**How to build it in Kumiki.** `"card": "wall"`: `{ "word": "never", "rows": 8, "speed": 0.04, "accentRow": 4 }`. Rows are measured text (the existing measured-text path), repeated to cover the frame width plus one copy, and offset by `frame × speed`. Deterministic, no state.

**Checks.** `wall-unreadable` (warning): fewer than 3 rows visible or text height under 6% of the frame. This is a texture, not a sentence: the film should also say the word once clearly.

### A3 Type that acts out its word

**Built 2026-11-11** as the headline's `rebuild` reveal: the letter shuffle. A word's outline becoming an object is not built. See [Ad Formats → Cards](component-specs/ad-formats.md#cards).

**What it is.** A word does what it means. "Re-engineered" is rebuilt from the letters of the line before it. "To" becomes a water balloon and bursts. "Stretch" stretches.

**Where we saw it.** *Don't Blink*: "the design has been" is rebuilt into "re-engineered"; "To" becomes a water balloon in slow motion and bursts ([Motionographer](https://motionographer.com/2016/09/14/4-ways-dont-blink-is-a-masterclass-of-type-and-rhythm/)) (C). Kumiki has contour morphs (`shape-morph`) but nothing turns letters into other letters or into objects.

**Before / after.** Before: the word fades out and the next fades in. After: the letters of one word fly to their places in the next (shared letters stay; others scale down and out); or the word's outline morphs into an object's silhouette.

**How to build it in Kumiki.**
- *Letter shuffle:* match letters between two words by character (shared letters travel, the rest fade and scale), with the existing glyph measurements of `kinetic-text`. A `card: "rebuild"` with `{ "from": "the design has been", "to": "re-engineered" }`.
- *Word to object:* convert the word to outlines (font glyph paths) and use `shape-morph` to the object's path, with its dissolve fallback when topology differs.

**Checks.** The existing reading-time check on both words. Reduced motion: cut from the first word to the second.

### A4 Variable font breathing

**Built 2026-11-11** as the headline's `weight` reveal, with Geist Variable as the fallback variable font. See [Ad Formats → Cards](component-specs/ad-formats.md#cards).

**What it is.** A word changes weight or width smoothly: thin to bold on a stress, wide to narrow on a squeeze, letters pulsing in a wave.

**Where we saw it.** After Effects animates variable font axes (weight and width) per character, with a spacing setting to keep lines steady ([Adobe](https://helpx.adobe.com/au/after-effects/desktop/variable-font-axes/work-with-variable-font-axes/working-with-variable-font-axes.html)); the web does the same with `font-variation-settings` ([CSS IRL](https://css-irl.info/variable-font-animation-with-css-and-splitting-js/)) (C). Kumiki has no variable font axis anywhere.

**Before / after.** Before: a word pops in at one weight. After: the word lands thin (weight 200) and swells to heavy (800) over 10 frames as the voice stresses it; or a wave of weight runs through the letters.

**How to build it in Kumiki.** A `fontAxes` track in `motion-preset` (`wght`, `wdth`, any registered axis) applied through `font-variation-settings`. Needs a licensed variable font in the film's type; the look's type tokens (doc 33) can name one. Re-measure the line at each frame, or reserve the widest width, so text does not push neighbours around.

**Checks.** `axis-missing-font` (error) when the font has no such axis. `axis-reflow` (warning) when the line width changes more than 5% while it is being read.

### A5 Text scramble

**Built 2026-11-11** as the headline's `scramble` reveal. See [Ad Formats → Cards](component-specs/ad-formats.md#cards).

**What it is.** Each letter cycles through random characters, then locks into the right one, left to right. Reads as "decoding", "computing", "loading".

**Where we saw it.** Many ready-made web components ([Framer Text Scramble](https://www.framer.com/marketplace/components/text-scramble/), [Motion Primitives](https://21st.dev/motion-primitives/text-scramble/default)) (C). Common in tech launch films. Kumiki has none.

**Before / after.** Before: "Access granted" types in. After: "X#7k$ q&9@Zl!" flickers for 12 frames, then letters lock in from left to right over 15 frames.

**How to build it in Kumiki.** A text treatment in `animated-text`: `{ "treatment": "scramble", "lockFrames": 15, "charset": "latin" }`. Random characters come from a seeded hash of `(frame, index)`, so any frame renders the same in any order. Use a monospaced font or fixed letter boxes so the line does not jitter.

**Checks.** Screen readers get the final text only. Reduced motion: no cycling. `scramble-cjk` (warning): scramble on CJK reads poorly; use a fade.

### A6 Smears and squash

**Built 2026-11-11** for object-story scenes (`"smear": true`), from the pure `motion/smear.ts`. See [Object Story → Smears and squash](component-specs/object-story.md#smears-and-squash).

**What it is.** Animation principles for 2D shapes. *Smear:* on the fastest frame of a move, the shape is stretched along its path, or drawn as a few ghost copies, for one or two frames. *Squash and stretch:* a shape flattens on landing and stretches while moving fast. These make motion feel fast and alive instead of slid.

**Where we saw it.** Smear frames date to 1940s cartoons; in motion design they are done with stretching or duplicated copies ([CG Wire](https://blog.cg-wire.com/smear-frames/), [Jake Parker](https://www.mrjakeparker.com/blog/2022/1/12/the-art-of-the-smear)) (C). Kumiki has motion blur on whips and an overshoot on `scale-pop`, but objects in object stories and cards slide as rigid shapes.

**Before / after.**

```
before:  ●      ●      ●      ●    (a coin slides across, same shape every frame)
after:   ●     ⬮      ═══●   ●̲    (stretch while fast · smear on the fastest frame · squash on landing · settle)
```

**How to build it in Kumiki.** A motion modifier on any MG1 position track: `{ "smear": { "speed": 0.6 }, "squash": 0.15 }`. Per frame, read the track's speed (already known from the curve), stretch the shape along the direction of travel by a bounded amount, keep its area, and add 2 or 3 fading ghost copies above a speed threshold. Squash uses the landing contact (object-story moves already know when an object lands).

**Checks.** `squash-on-text` (warning): squash applied to text. Reduced motion: no smear or squash.

### A7 Line boil

**Built 2026-11-11** as the look texture `boil`. See [Film Look](component-specs/film-look.md).

**What it is.** Hand-drawn lines wobble slightly every second or third frame, like redrawn animation. It makes clean vector art feel hand-made.

**Where we saw it.** Starbucks' seasonal film with Geoff McFetridge's hand-drawn illustrations that "dance along" to the music ([shots](https://shots.net/news/view/starbucks-draws-us-in-with-another-seasonal-scribble)) (C); the visual-styles list names hand-drawn cel style (S). Kumiki's `cel-animation` look holds frames on twos but lines stay perfectly still.

**How to build it in Kumiki.** A look texture `boil: 0.5`: an SVG turbulence displacement that changes seed on every held frame (on twos), small (0.1 to 0.3% of the short side). Applies to drawn scenes (draw-on, title sequence, cards), not to photographs.

**Checks.** `boil-on-photo` (warning). Reduced motion: no boil.

### A8 Glass lens

**Built 2026-11-11** from copies of the scene (magnified middle, more-magnified edge ring), not a shader or a displacement map. See [Film Document → Glass lens and lens gateway](component-specs/film-document.md#glass-lens-and-lens-gateway).

**What it is.** A clear glass shape (a sphere, a pill, a rounded card) moves over the picture and bends what is behind it. Edges magnify and shift colour slightly.

**Where we saw it.** The Figma *Made in Figma 2025* reel shows a translucent, refractive sphere over "Liquid" lettering (What Ships spot check) (S). Apple's Liquid Glass makes "lensing" its main visual idea: light bends at the edges, larger elements lens more, objects appear by changing their lensing rather than fading ([WWDC25 session 219](https://nonstrict.eu/wwdcindex/wwdc2025/219/)) (C). On the web this needs a displacement map, not a blur ([Aave](https://aave.com/design/building-glass-for-the-web)) (C). Kumiki has physical glass on 3D objects and a water shader over a still image, but nothing refracts a live 2D scene.

**Before / after.** Before: a frosted card (blurred background). After: a clear lens slides across a headline; the letters under its edge swell and bend, with a thin bright rim and a faint colour fringe; the centre is almost undistorted.

**How to build it in Kumiki.** A shader effect `lens` that samples the scene layer below with a displacement from the lens shape's signed distance field (strong at the edge, weak in the middle), plus a rim highlight. Shapes: circle, rounded rectangle, a path. It needs the composited scene as a texture, so it belongs in the transition and scene `fx` layer. Animated "appear" = lensing strength from 0 to 1, as Apple describes.

**Checks.** `lens-over-text` (warning) while the text is meant to be read. Reduced motion: a still lens.

### A9 Several cursors

**Built 2026-11-11** as screen-demo `guests`. See [Screen Demo → Several cursors](component-specs/screen-demo.md#several-cursors).

**What it is.** Two or more cursors, each with a name label and colour, work in different windows at the same time. Shows parallel agents, teammates or automation.

**Where we saw it.** *agent-desktop* shows "multiple desktop windows and labeled colored cursors performing app interactions" (What Ships spot check) (S). Collaborative product demos use it often. Kumiki's screen demo has one cursor.

**How to build it in Kumiki.** In `registry/video/screen-demo.ts`, give each step an optional `cursor: "ana"`, and the scene a `cursors: { "ana": { "label": "Ana", "color": "#e5484d" } }` table. Each cursor runs its own steps; steps of different cursors may overlap in time. The camera follows a named cursor or frames them all.

**Checks.** `cursor-collide` (warning) when two labels overlap. `cursor-too-many` (warning) over four.

### A10 Prompt, working, result

**Built 2026-11-11** as the `generate` step. See [Screen Demo → Generate](component-specs/screen-demo.md#generate).

**What it is.** The three-beat demo of generative and AI products: a prompt is typed; a short "working" state shows (a shimmer, a sweep, a progress line); the result sharpens in. The working beat must be short and honest.

**Where we saw it.** Canva *Craft*: a prompt interface, then the generated image (S). OpenAI *GPT-6.1 Terra*: a prompt card asking for a 3D model, then the model in a modelling viewport (S). Kumiki's screen demo can type and `show`, but has no in-between state.

**Before / after.** Before: text typed, then a hard cut to the result. After: text typed → the box glows and a light sweep runs across a placeholder for 0.6 to 1.2 s → the result resolves from blurred and low-detail to sharp over 10 to 15 frames → a callout names what changed.

**How to build it in Kumiki.** A screen-demo step `{ "do": "generate", "target": "canvas", "show": "result", "workingFrames": 24 }`. The working state reuses the `tech-scan-sweep` sound and a light-sweep shader; the resolve reuses `ResolveIntoPicture` from shader moments.

**Checks.** `generate-long` (warning): a working state over 2 s (it reads as slow software). Existing honesty rule: a demo must show real output, so this step requires a real result image.

### A11 Sound-driven motion

**Built 2026-11-11** for catalog beds, as a scene's `drive` (scale or glow). Levels are measured ahead of time by `npm run sound:levels`, not when the film compiles, because the browser compile cannot read audio. Voice, music lanes and motion tracks are not driven yet. See [Film Document → Sound-driven motion](component-specs/film-document.md#sound-driven-motion).

**What it is.** The loudness of a sound drives something on screen frame by frame: a logo pulses with the bass, a line wobbles with a voice, lights flicker with a hit.

**Where we saw it.** A Linear launch film with "custom 3D motion and reactive sound"; a generative music video where "every frame is a function of song time" (What Ships descriptions) (S). Renaud Hallée's *PLUS* is "music-driven visual precision" ([STASH](https://www.stashmedia.tv/take-a-break-from-festive-feels-and-get-lost-in-renaud-hallees-new-short-film-plus/)) (C). Kumiki ties visuals to discrete cues, not to a continuous level.

**How to build it in Kumiki.** Measure a level envelope offline when the film compiles (the reference lab already measures per-frame RMS the same way). Store it as an array per lane, one value per film frame, in the compiled film. Expose `envelope("score", frame)` to scenes and to motion tracks as a bounded multiplier: `{ "scale": { "drive": "score", "amount": 0.04 } }`. Deterministic, because the audio file is fixed.

**Checks.** `drive-strobe` (warning): a driven opacity or brightness that changes more than three times a second by a large step (same safety rule as T2). Reduced motion: drive off.

### A12 Focus pull

**Built 2026-11-11** for photo cards (`focus` keys between the photograph and the words). Layered 2D scenes and 3D shots are not built. See [Ad Formats → Cards](component-specs/ad-formats.md#cards).

**What it is.** The sharp focus moves from one layer to another: the foreground blurs as the background sharpens. It moves the viewer's eye without a cut.

**Where we saw it.** Tagged "shallow-focus" and "slow focus transitions" for the *Stranger Things* title sequence in the reference lab's popular-video list (S, editorial tag). A rack focus on a real photograph beat every procedural ice cave in an earlier Kumiki film (owner review). Kumiki has a `focus-rack` accent plan and 2.5D depth layers, but `film-look` states it has no depth of field.

**How to build it in Kumiki.** For layered 2D and 2.5D scenes: give each layer a depth, and blur each by its distance from a focus depth that moves over time (a per-layer blur, cheaper and steadier than per-pixel depth of field). For 3D shots: a bokeh pass in the 3D renderer with an animated focus distance. `"focus": [{ "at": 0, "on": "cup" }, { "at": 40, "on": "face", "frames": 18 }]`.

**Checks.** `focus-on-text` (warning): text inside a blurred layer while it should be read.

---

## Suggested order

1. **Sound first (P0):** S1 air gap, S2 drop-out, S3 swell and arc, S10 quieter default accents, and the tonal beds of S7 that S3 needs. Together they give Kumiki films the shape the measured trailers have, with no new art.
2. **T1 dip** with open-from-black and close-to-black. It is the most common thing in the trailer data that Kumiki cannot do.
3. **P1 sound:** S4 braam and layered hit, S5 reverse swell, S9 bed dips. These are recipes over the existing sound-design compiler.
4. **P1 picture:** A1 rapid word flash and A2 type wall (type-led promos), T3 shape wipe, T9 panels. T2 flash waits for the owner's decision on flash safety.
5. **P2 and P3** as films need them.

Each item ships like the doc 32 recipes did: one feature per PR, an example film, a Storybook comparison against today's behaviour, rendered frames reviewed, and for sound, an A/B pair for a person to listen to. **An agent cannot hear**, so every sound item needs the owner's ears before it is called done.

## Not recommended

- **Copying a reference film's look.** Every item above is a reusable move with neutral defaults. No item ships a named brand's colours, type or sound.
- **Stock transition packs.** Ink, smoke and light-leak packs carry unclear licences and a recognisable look. Generate mattes procedurally (T4).
- **Hard rules from these numbers.** Frame counts and dB values above are starting points from practitioners and from detector counts. They belong in warnings, not errors, except where a rule protects viewers (flash rate) or prevents a broken render.
- **Beat sync on licensed music.** Doc 32 found the catalog has no music bed. The pulse bed (S7) gives a declared tempo from our own sound first.
- **Glitch and datamosh as defaults.** They date quickly and break text. Keep them as looks a film asks for, not as recipes.

## Open questions

1. **Flash safety (T2, T7, A11).** Today one restrained flash is allowed and loops are refused. Allowing up to three flashes a second (the WCAG 2.3.1 limit), checked on rendered frames, would make bursts possible. Is that acceptable?
2. **Default accents (S10).** Should new films default to whooshes on travelling moves only? Existing films keep today's behaviour either way.
3. **Rewind (S6).** The owner dislikes a camera moving backwards unless it reads as rewinding time. Should rewind require a story link back to an earlier scene (an error), or only warn?
4. **Sonic logo (S8).** Should a branded film get a generated sonic logo by default, or only on request?

## Sources

**Sites studied:** [Directors' Library](https://directorslibrary.com/) · [STASH](https://www.stashmedia.tv/) · [Motionographer](https://motionographer.com/) · [shots](https://shots.net/the-work) · [Ads of the World](https://www.adsoftheworld.com/medium_types/film) · [Vimeo Staff Picks](https://vimeo.com/channels/staffpicks) · [Clio Awards](https://clios.com/winners-gallery/) · [AICP Awards Archive](https://aicp.com/aicp-awards/aicp-awards-archive) · [Little Black Book](https://lbbonline.com/work) · [Motion Design Awards](https://www.motiondesignawards.com/) · [Promonews](https://www.promonews.tv/videos) · [FrameThrower](https://framethrower.ai/reference) · [FilmDraft](https://filmdraft.co/trailers)

**Articles (C):**
- [4 ways *Don't Blink* is a masterclass of type and rhythm](https://motionographer.com/2016/09/14/4-ways-dont-blink-is-a-masterclass-of-type-and-rhythm/), Motionographer
- [Escafandra's "Less Perfect" title sequence](https://www.stashmedia.tv/escafandra-studio-opens-web-unleashed-2026/), [Renaud Hallée's *PLUS*](https://www.stashmedia.tv/take-a-break-from-festive-feels-and-get-lost-in-renaud-hallees-new-short-film-plus/), [BUCK's *Bass X Machina* titles](https://www.stashmedia.tv/alt-western-buck-opens-bass-x-machina-on-netflix/), STASH
- [Starbucks' seasonal scribble](https://shots.net/news/view/starbucks-draws-us-in-with-another-seasonal-scribble), shots
- [*Clean Clothes*](https://www.promonews.tv/videos/2026/11/03/ear-candy-clean-clothes-rob-ulitski/96844), [*Northside Needs Me*](https://www.promonews.tv/videos/2026/11/11/blackhaine-northside-needs-me-mau-morgo/96936), Promonews
- [Sound design for trailers](https://violetrecording.com/sound-design-for-trailers/), Violet Recording
- [High-impact sounds for movies and trailers](https://www.ableton.com/en/blog/learn-how-to-make-high-impact-sounds-for-movies-and-trailers/), Ableton
- [Hans Zimmer on Dunkirk's audio illusion](https://www.cbc.ca/radio/q/blog/hans-zimmer-explains-the-audio-trickery-that-made-dunkirk-audiences-nauseous-1.4311684), CBC; [Christopher Nolan on the Shepard tone](https://www.businessinsider.in/christopher-nolan-explains-the-audio-illusion-that-created-the-unique-music-in-dunkirk/amp_articleshow/59742153.cms), Business Insider
- [How the Netflix "ta-dum" was made](https://www.musicradar.com/news/the-netflix-ta-dum-sound-features-a-reversed-electric-guitar-sample-that-was-created-using-90s-effect-pedals), MusicRadar; [Twenty Thousand Hertz: Netflix](https://www.20k.org/episodes/netflix)
- [How Nike created its split-screen masterpiece](https://www.adweek.com/creativity/the-hardest-commercial-i-have-ever-edited-how-nike-created-its-split-screen-masterpiece/), Adweek; [conversation with the creatives](https://magazine.workingnotworking.com/creative-work-blog/you-cant-stop-us-nike-ad), Working Not Working
- [How Channel 4 depicted a nation in 25 idents](https://www.dandad.org/work/annual-2024/behind-the-work/how-broadcaster-channel-4-depicted-a-nation-in-25-idents), D&AD
- [Trailer structure](https://filmmakermagazine.com/?p=37093), Filmmaker Magazine
- [Liquid Glass, WWDC25 session 219](https://nonstrict.eu/wwdcindex/wwdc2025/219/); [Building glass for the web](https://aave.com/design/building-glass-for-the-web), Aave
- [Working with variable font axes](https://helpx.adobe.com/au/after-effects/desktop/variable-font-axes/work-with-variable-font-axes/working-with-variable-font-axes.html), Adobe; [Variable font animation with CSS](https://css-irl.info/variable-font-animation-with-css-and-splitting-js/), CSS IRL
- [Text Scramble](https://www.framer.com/marketplace/components/text-scramble/), Framer; [Text Scramble](https://21st.dev/motion-primitives/text-scramble/default), Motion Primitives
- [Smear frames](https://blog.cg-wire.com/smear-frames/), CG Wire; [The art of the smear](https://www.mrjakeparker.com/blog/2022/1/12/the-art-of-the-smear), Jake Parker
- [Shape wipe](https://help.maxon.net/rg/en-us/Content/html/Transitions/shape-wipe.html), Maxon; [Shape Flow](https://filmimpact.com/shape-flow-premiere-pro), Film Impact
- [Create a tape stop effect](https://www.soundbridge.io/create-a-tape-stop-effect), SoundBridge; [Reverse reverb](https://ampedstudio.com/blog/reverse-reverb/), Amped Studio
- [Flash on the beat](https://www.dvinfo.net/forum/what-happens-vegas/125973-make-clip-flash-beats-vegas-pro-8-a.html), DV Info forum

**Measured data (M) and spot checks (S):** `kumiki-reference-lab` — `research/analysis/movie-promotions/` (main), `research/analysis/motiondesignawards/` (branch `YukiUmetsu/feat-motion-design-awards`), `research/analysis/motionographer/` (branch `feat/video-analysis-motionographer`), `research/whatships-browser-observations-2026-11-10.json`, `research/popular-cinematic-videos.v1.json`, `research/visual-styles.v1.json`.
