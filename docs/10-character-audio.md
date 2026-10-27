# 10 — Character Animation, Narration & Sound

**Purpose:** repeatable character-led education with synchronized voice, gesture, captions and sound. **In scope:** timed cues, character playback contracts and declarative mixes. **Out of scope:** generating voices or characters, phoneme recognition, rig authoring, general-purpose DAW, proprietary character assets. See [07](07-media-foundation.md), [08](08-motion-graphics.md) and [11](11-rendering-quality.md).

## 1. Supported character strategies

| Mode | Import | Animatable channels | First release |
|---|---|---|---|
| `sprite` | Approved images/sprite atlas, named poses/visemes | Pose swaps, face, mouth, blink, transforms | **Yes** — universal fallback |
| `vector-puppet` | Hierarchical SVG/rig + bone/mesh metadata, optional runtime adapter | 2D rig transforms, IK, deformation, blends | **Later**, playback not rig editor |
| `3d-rig` | Third-party 3D skeleton/face blend shapes | Pose, face, lighting, camera | Optional adapter; no core runtime |

Each `character-presenter` references stable `characterId` and **explicit asset/rig version**; it never silently regenerates a character. Preserve silhouette, proportions, color/material treatment, layer anchors and voice association across scenes. Separate character **asset identity** from **instance identity** so multiple appearances can share a rig without sharing animation state.

## 2. Rig and performance contract

| Component/channel | Data model | Behavior |
|---|---|---|
| `character-rig` | Rig manifest, named anchors, hierarchy, default pose | Validate missing sprites/bones/assets; expose capabilities |
| `character-pose` | Named pose, start/end frames, blend weight | Hold/transition whole-body or masked regions |
| `facial-expression` | Named expression, magnitude, face-region mask | Composable with speech; expression must not overwrite mouth by accident |
| `lip-sync` | Timed viseme events, transition policy, jaw/mouth layer | Sample frame deterministically; clean rest/mouth close on pauses |
| `eye-controller` | Blink cues, gaze target, smoothing, eye limits | Stable blink and target tracking; avoid unnatural continuous motion |
| `gesture-controller` | Gesture cue, target anchor, arm/hand mask | Point/wave/nod/react with anticipation and recovery |
| `idle-animation` | Periodic breathing, subtle body motion, seed | Low-amplitude background channel; suspended by strong acting |
| `character-interaction` | Object ID, hand/eye anchor, contact interval | Relative transforms stay attached during camera/group movement |
| `character-dialogue` | Speech segment, visemes, emphasis cues, mood | Coordinates mouth/face/body without owning the audio generator |

### Independent channels and conflict resolution

A presenter may **speak + blink + breathe + point** simultaneously. Define channels by region: `body`, `head`, `leftArm`, `rightArm`, `eyes`, `brows`, `mouth`. Layers support weight and blend mode: `override`, `additive`, or `masked`. Evaluation order is explicit: base pose → locomotion/body → gestures/IK → facial expression → mouth/viseme → corrective constraints. Lower-level rig adapters may implement more advanced blending but must preserve this observed behavior.

- Keyframe conflict on the **same channel/property** without an explicit priority/blend is an error.
- Gestures have `prepare → action → hold → release`; a new gesture can interrupt only using declared interruption behavior (`finish`, `blend-out`, `cut`).
- Expressions react to narrative **events**, not randomly every second. Neutral is a valid acting choice; exaggerated movements reduce credibility in technical instruction.
- Looking at an offscreen callout requires a declared target; if target disappears, eyes return to a stable fallback.
- Do not turn every phrase into mouth/body motion. Leave visual attention on diagrams when they carry the lesson.

```ts
// Illustrative authoring API, not the 11 wire format.
characterPresenter({
  id: 'host-in-scene-3',
  characterId: 'host-v1',
  rigRef: 'assets/host-sprites-v1',
  basePose: 'standing',
  channels: [
    { type: 'idle', preset: 'subtle-breathing' },
    { type: 'speech', speechCue: 'host-explains-context' },
    { type: 'gaze', targetId: 'context-box', fromCue: 'context-mentioned' },
    { type: 'gesture', name: 'point', targetId: 'context-box', fromCue: 'chunks-arrive' },
  ],
});
```

## 3. Lip sync and multilingual speech

**Boundary:** the consumer or optional analysis adapter supplies transcript, word timestamps, and optional phoneme/viseme alignment; Kumiki **plays the cues**. Do not claim automatic phoneme extraction is core functionality. Store original timestamps (prefer sample/second precision in imported alignment metadata), then resolve mouth state at output frames. A fractional speech onset cannot shift subsequent cues through cumulative rounding.

| Input level | Playback quality | Required fallback |
|---|---|---|
| Exact viseme/alignment cues | Best; mapped per frame into rig mouth shapes | Map unknown visemes to neutral or nearest supported class with warning |
| Phoneme timestamps | Map through language/rig-specific phoneme→viseme table | Language-aware mapping; report missing table |
| Word timestamps only | Coarse timed speaking/rest or calibrated mouth-cycle | Never pretend it is phoneme-accurate |
| Audio only | Conservative speaking/closed-mouth based on precomputed energy or no mouth motion | Warn `lipSyncPrecision=approximate/none` |

Character manifest declares supported **viseme IDs**, neutral/rest, transition speed and language mappings. English/Japanese/Chinese cannot assume identical phoneme inventory or grapheme-to-sound mapping; mappings must be testable with each language and different speaking rates. Blinks and mouth cues must survive seeking and time remapping. Silence should close the mouth; punctuation is not reliable silence without alignment.

When a default face sprite already paints the closed mouth or beak, use a separate
mouth child with registered transparent sprites and a mouth-free head variant.
`speech.activeVariants` maps companion part IDs to those clean background variants
only while speech/viseme cues are active. The swap takes precedence over painted
expression/blink face variants to prevent a double mouth; the ordinary expression
returns on silence. Keep every mouth sprite on a common canvas with the same origin
and pivot as its parent head. The companion map is optional, supports up to 16
parts and must not target `speech.mouthPart` itself.

## 4. Speech-linked performance cues

Audio and visual elements share named timeline events. Each cue has source type, start/end, optional target, confidence/provenance, and payload. `speechCue` can drive *caption timing*, *face emotion*, *object focus*, *gesture*, and *camera reframe*; each consumer chooses explicitly which actions to bind. A template should not infer a gesture from a transcript without review.

| Event | Suggested animation | Verification |
|---|---|---|
| Definition begins | Word emphasis + look toward term | Highlight starts near spoken definition |
| Diagram node named | Callout glow + pointed gaze | Label visible while named |
| Data arrives | Packet contact + subtle sound cue | Visual endpoint and cue align |
| Contrast signaled | Camera shifts or comparison reveals | Before and after remain legible |
| Pause / rhetorical question | Character and camera hold | No forced lip flapping during silence |

**Narration-first layout:** reserve caption and presenter regions before placing labels; captions may switch between safe predefined regions if colliding with focal subjects. Do not let an animated presenter obscure the architecture being explained. Prefer side-by-side presenter/diagram in landscape; in portrait use sequential focus shots when space is limited.

## 5. Audio composition contract

| Element | Required fields | Semantic behavior |
|---|---|---|
| `audio-asset` | Stable ref, content hash, sample rate/channels if known, duration, rights | Media decoded by adapter; portable data manifest |
| `audio-clip` | `assetRef`, start frame, trim/source offset, duration, gain, fades | Clip source timing cannot silently drift from frames |
| `audio-cue-track` | Ordered clips and named events for narration/music/SFX | Independent lanes; explicit routing |
| `speech-alignment` | Segment/word/phoneme spans + language + confidence/source | Captions and visemes consume same alignment |
| `volume-automation` | Frame or sample-relative gain curve | Smooth envelope, no clipping at boundary |
| `ducking` | Sidechain source, target lane, attack/release, attenuation | Music moves under narration without abrupt pumping |
| `audio-reactive` | Precomputed features (RMS, onset, bands), analysis hash | Audio-driven visuals reproducible without realtime FFT |
| `beat-sync` | Beat/phrase markers, musical downbeats, tolerance | Purposeful cuts/emphasis; never force teaching pace to music |

**Mix order:** source decode → clip trim/time mapping → clip gain/fades → track automation → ducking → track sum → limiter/loudness processing in export adapter. Document channel layout and sample-rate conversion behavior. **No universal loudness target**: select delivery profile (e.g. YouTube, short-form, presentation) in consumer/export configuration and validate against that profile; avoid clipping and speech masking everywhere.

### Sound-design grammar

| Sound event | Appropriate use | Avoid |
|---|---|---|
| UI tick | Selection or discrete state change | Every glyph/word reveal |
| Soft whoosh | Large spatial transition | Routine text entrances |
| Tonal accent | Key insight, payoff, chapter transition | Continuous dramatic scoring |
| Environmental bed | Establish context/texture | Masking narration |
| Silence | Complex explanation, pause, emphasis | Treating gaps as audio defects |

**Audio effects** may be optional: EQ, compression, noise reduction, reverb, limiting. Kumiki specifies clips/cues/mix intent; DSP engine and encoding belong to the consumer adapter. Do not ship copyrighted music, proprietary voice packs or unclear-license character art as sample defaults.

### Specialized integrations (optional)

| Tool | Responsibilities | Boundary/test |
|---|---|---|
| Rive **runtime** | Play externally authored 2D rigs/state machines | Preserve asset/state-machine version; seek/pose at arbitrary frames or pre-bake; authoring rights separate |
| `three-vrm` + Three.js | VRM humanoid rig, expressions, bones | 3D adapter only; approved VRM rights and stable animation-clock sampling |
| Rhubarb Lip Sync | Offline preprocessing of speech into approximate viseme cues | Validate English-focused results; use separate alignment for Japanese/Chinese as needed; playback owns no recognizer |
| Tone.js | Optional SFX/synthesis and beat/cue generation | **Offline-render or bake** audio; live transport must not drive export timing |
| wavesurfer.js | Authoring-side waveforms/regions | Editor utility only; never required by renderer or exported scene |

Audio alignment belongs to the canonical timeline; final audio mixing/encoding belongs to [11](11-rendering-quality.md). Licensing, package links and redistribution gates: [13](13-content-creation-integrations.md).
## 6. Subtitle and caption behavior

`caption-overlay` accepts language, time-aligned segments and optional word spans, typography role, position policy, highlight policy, backgrounds and screen-safe constraints. Retain transcript as accessible text. Segment at natural language boundaries rather than blindly splitting by fixed character count; English, Japanese and Chinese need distinct line-breaking fixtures. Support left-to-right/right-to-left direction and mixed punctuation. Avoid text flashing faster than narration or highlighting words with no measured timing.

- Captions are synchronized to audio **source timestamps**, transformed into composition frames once.
- Word-level animation is optional; when only segment timestamps exist, highlight by segment, not fake word timing.
- Caption renderer declares supported font fallback and shaping; warn on missing glyphs.
- Caption location is checked against presenter face, diagrams, and platform overlay exclusions over time.
- Exports can preserve captions as editable overlay layers, optionally include sidecar subtitle data; sidecar generation/format adapter is external.

## 7. Worked performance: 12-second character explanation

**Output:** 360 frames at 30 fps; times below are sample choreography, not lip-sync assumptions.

| Frames | Performance | Audio / visual alignment |
|---|---|---|
| 0–44 | Character enters and faces camera; settles | Music bed lowers; no speech |
| 45–119 | Says “First, we retrieve context”; subtle brow change | Caption; exact visemes from supplied cues |
| 120–184 | Glances at diagram; starts pointing | Emphasize diagram’s retrieval node when named |
| 185–269 | Data packet travels while hand holds | Narration explains flow, SFX at packet arrival |
| 270–319 | Character stops speaking; lowers hand | Mouth returns to rest; narration pause |
| 320–359 | Camera reframes to diagram, presenter recedes | Controlled handoff into next scene |

**Negative tests:** nonexistent rig target, overlapping high-priority gestures, missing viseme mapping, mid-word scene trim, variable sample rate, negative clip trim, caption/face overlap and an unsupported rig renderer. All report explicit diagnostics with scene IDs and time frames.

## 8. Acceptance and implementation sequence

1. **Sprite MVP:** named poses/eyes/mouth frames; 2 simultaneous expression channels; deterministic direct seek to an arbitrary frame.
2. **Lip sync:** word-timed approximation and exact viseme playback as separate, labeled quality levels; test English and Japanese (add other languages by mapping).
3. **Acting:** gaze, blink, gesture, idle with interruption policy; one expressive beat must not mask a diagram explanation.
4. **Sound:** three independent lanes (voice/music/SFX), cues and fades; export adapter reports clipping/missing tracks.
5. **Captions:** bilingual fixtures, collision checking and alignment audits at scene boundaries.
6. **Advanced optional adapter:** one imported vector puppet/rig; prove equivalent semantic cues, not pixel identity across engines.

**Golden production:** 45-second presenter-led lesson with independently timed mouth, blink, gesture, narration, captions and diagram highlights. Verify timeline seeks in shuffled order, dialogue/gesture cue alignment, static fallback, aspect-ratio variants and playback/export parity. A natural, **restrained** performance outranks a large library of gestures.
