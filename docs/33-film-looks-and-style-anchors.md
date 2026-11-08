# Film looks and style anchors: making videos in different styles

**Research:** 2026-11-08 · **Status:** Built 2026-11-08 (all five steps); see [Film Look](component-specs/film-look.md) for the shipped API, evidence and limits. Approved by the owner on the photographic plates (2026-11-08). · **Builds on:** [18 — Film style grammar](18-film-style-grammar-and-direction.md), [32 — Professional video recipes](32-professional-video-recipes-research.md), [Film Document](component-specs/film-document.md), [Shader FX](component-specs/shader-fx.md)

## Question

Prompt guides for generative video tell writers to anchor a scene in a concrete style or emotional state, not abstract adjectives: "melancholic mood, bittersweet atmosphere, shot on 35 mm film with natural grain, a particular director's colour grade". How can Kumiki, which renders from code rather than generating, make films in many distinct styles from anchors like these?

## What Kumiki has, and the gap

- **Film style grammar** (doc 18, `film-style-grammar.ts`) covers *structure*: which operations each shot role uses, caption density, pacing and exclusions. Colour and type are left to the consumer's tokens.
- **The 3D studio** has four lighting looks (`softbox`, `strip`, `rim`, `high-key`) and five sweep palettes.
- **Shader effects** draw backgrounds and transitions (`grain-gradient`, `halftone-dots` and others). None grades or emulates film over the finished frame.
- **The gap** is a film-wide **look**: the grade, film or video texture, lens, lighting mood, camera language, cadence, type treatment and sound mood that make a film *feel* a certain way. Nothing yet turns "melancholic" or "35 mm" into numbers.

## What the research says

- **Anchors work because they are concrete.** Guides for current video models put style, camera, lens, lighting and atmosphere in separate parts of the prompt. They warn that a bare term ("dolly-in") does little without specifics, and that camera motion must be stated apart from subject motion. These are third-party guides; we did not find Google's own. [Veed](https://www.veed.io/learn/veo-3-prompts), [Picsart](https://picsart.com/blog/veo-prompts/), [Medium](https://medium.com/@miguelivanov/mastering-veo-3-an-expert-guide-to-optimal-prompt-structure-and-cinematic-camera-control-693d01ae9f8b) (C). **For Kumiki**, each anchor must resolve to explicit parameters, not a label.
- **Colour has measured emotional effects (A).** Valdez and Mehrabian (1994) found brightness and saturation had strong, consistent effects:
  - Pleasure ≈ 0.69 brightness + 0.22 saturation
  - Arousal ≈ −0.31 brightness + 0.60 saturation
  - Dominance ≈ −0.76 brightness + 0.32 saturation

  Later work agrees that saturation moves emotion more than hue. [PubMed](https://pubmed.ncbi.nlm.nih.gov/7996122/), [Wilms & Oberfeld 2018](https://pubmed.ncbi.nlm.nih.gov/28612080/). **For Kumiki**, mood words can move brightness and saturation in a known direction, as the defaults behind a look.
- **Lighting style is a ratio and a source (C, consistent across texts).** Key-to-fill near 1:1 is high-key: bright, few shadows, upbeat. Little or no fill from one hard source is low-key: suspense and mystery. Chiaroscuro sculpts form from strong contrast. Practicals are visible sources in the frame; motivated light only appears to come from one. [StudioBinder](https://www.studiobinder.com/blog/what-is-key-light), [No Film School](https://nofilmschool.com/film-lighting-techniques-and-examples), [Videomaker](https://www.videomaker.com/how-to/lighting/lighting-design/lighting-techniques-for-film-and-video/)
- **Film is four measurable things (C, industry tools).**
  - **Colour response:** a tone curve with a soft toe and a rolled shoulder, and print-film colour.
  - **Grain:** larger on faster stocks, different in each colour channel, new every frame.
  - **Halation:** an amber glow around highlights, from light scattering in the emulsion.
  - **Gate weave:** frame-to-frame drift, large in 1930s footage, subtle by the 1970s, and visible only in motion.

  [No Film School](https://nofilmschool.com/four-elements-film-emulation), [StraySpark](https://www.strayspark.studio/blog/blender-film-look-halation-grain-gate-weave), [Filmbox](https://videovillage.com/filmbox/technical_faq), [Yedlin on grain emulation](https://mail.yedlin.net/NerdyFilmTechStuff/OnFilmGrainEmulation.html)
- **A director's style breaks down into techniques (C).** The Hong Kong neon-melancholy style studied for this plan comes down to:
  - coloured neon practicals;
  - a reactive handheld camera and low angles;
  - **step printing**: undercranked footage with each frame held, so motion smears and stutters while time seems to stretch;
  - shifts between frenzy and slowness.

  [BFI](https://www.bfi.org.uk/features/mood-love-wong-kar-wai-emotion), [In Depth Cine](https://indepthcine.com/videos/how-wong-kar-wai-shoots-a-film-at-3-budget-levels), [Bruch thesis 2024](https://dspace.amu.cz/jspui/bitstream/10318/18648/1/1_Master_s%20Thesis_AntoineBruch_05012024.pdf). **For Kumiki**, a reference style is learned as its techniques, which are generic and reusable, and named by what it is.
- **Camera movement mostly raises involvement, not emotion (A, small study).** Push-ins sit at decisions and realisations (doc 32 §11). Handheld reads as presence and urgency; a locked-off camera as calm and authority (practice, C).
- **Music sets how a scene is read (A, doc 32 §11).** A look includes the sound bed's mood.

## The proposal: a `look` in every film

A **look** is a named bundle of explicit, deterministic parameters, applied film-wide and overridable per scene. The film document gains:

```json
"look": { "preset": "neon-longing", "mood": ["melancholic", "bittersweet"], "overrides": { "grain": { "amount": 0.35 } } }
```

### What a look controls

| Layer | Parameters | How it renders |
|---|---|---|
| **Grade** | Exposure, contrast, a tone curve (toe lift for matte blacks, shoulder roll), white balance (temperature, tint), saturation, split toning (shadow and highlight tints), one hue pushed or kept (an accent) | An SVG filter on the composited frame: `feColorMatrix` for balance and saturation, `feComponentTransfer` tables for per-channel curves. It applies to DOM, canvas and WebGL alike |
| **Film or video texture** | Grain (size, amount, per-channel), halation (threshold, radius, amber tint), bloom, gate weave (amount by era), vignette, gentle flicker, aspect matte (2.39:1, 4:3), light leaks. For video eras: chroma bleed, scanlines, tracking noise | A grain layer seeded by frame, so any frame looks the same in any order. Halation as a threshold, blur, tint and screen chain. Weave as a sub-pixel transform per frame. All of it is reproducible |
| **Cadence** | Frame rate feel: smooth, on twos (12 fps), step printed (each frame held 2–5 times, with a smear of the frames before) | The film's frame is quantized per scene before evaluation; the smear is a short frame blend |
| **Lens** | Focal length bias (wide or long) for 3D shots, depth of field, anamorphic flare streaks, slight barrel distortion | Passed to 3D recipes as camera and fov multipliers; flares as an overlay on highlights |
| **Lighting mood** (3D) | Key-to-fill ratio, key colour temperature, practical colours (neon), haze, sun angle (golden or blue hour) | New studio looks beside `softbox`, `strip`, `rim` and `high-key`: `low-key`, `neon-practicals`, `golden-hour`, `blue-hour`, `overcast` |
| **Camera language** | Locked-off, slow dolly, Steadicam float, handheld (amplitude, frequency), push-in at turns | Deterministic noise of the frame, as a layer transform for 2D and a camera offset for 3D; push-ins keyed to story turns |
| **Edit rhythm** | Hold-length bias, preferred transitions (hard cuts or dissolves), pace | Defaults and warnings for `film:check` |
| **Type** | Typeface role, case, tracking, caption position and treatment (for example, yellow serif subtitles for an art-house look) | Caption and title tokens |
| **Sound mood** | Bed tags (sparse piano, warm room tone), filter (lo-fi, tape) | Chosen from the sound catalog by tag; mastering profile |

Captions and titles are graded lightly by default and never textured, so the look cannot cost legibility. The rendered-text audit checks contrast *after* the grade.

### Mood vocabulary

A mood word moves parameters in a known direction, on top of a preset. The directions follow the colour research (brightness for pleasure, saturation for arousal) and lighting and camera practice:

| Mood | Grade | Light | Camera and rhythm |
|---|---|---|---|
| melancholic | brightness −, saturation −, cool shadows, soft contrast | low key, blue hour, rain or haze | slow push-ins, long holds, dissolves |
| bittersweet | warm highlights over cool shadows, moderate saturation | low sun, warm practicals | gentle float, lingering holds |
| tense | contrast +, saturation − except one accent, crushed blacks | low-key, hard single source | handheld micro-shake, shorter holds, hard cuts |
| joyful | brightness +, saturation +, warm | high-key, soft | bouncy easing, quick holds |
| serene | brightness +, saturation −, low contrast | soft overcast | locked-off or slow drift, long holds |
| nostalgic | lifted blacks, faded saturation, warm cast, halation | warm practicals | gate weave, slower cadence |
| clinical | neutral to cool, high clarity, saturation − | even high-key | locked-off, precise easing |
| urgent | saturation +, contrast + | hard light | handheld, fast cuts, speed ramps |

### A starting library of looks

Code names describe the look, not a person or brand, following the repo rule. The references that informed each look appear only here.

| Look | Character | Informed by (docs only) |
|---|---|---|
| `studio-clean` | Today's default: crisp, neutral, no texture | Product launch films |
| `warm-35mm` | Soft toe, warm skin tones, fine grain, gentle amber halation, slight weave | Colour negative stocks of the 35 mm era |
| `neon-longing` | Saturated red, green and teal practicals, deep tinted shadows, step-printed motion, handheld, medium grain | The Hong Kong films shot by Christopher Doyle for Wong Kar-wai |
| `bleach-bypass` | Desaturated, high contrast, silver-retained highlights | The skip-bleach process in 1990s–2000s features |
| `teal-amber` | Complementary teal shadows and warm skin highlights | Contemporary blockbuster grading |
| `nordic-overcast` | Cool, low saturation, soft overcast light, long holds | Scandinavian crime drama |
| `pastel-tableau` | Pastel palette, symmetrical locked-off frames, flat frontal light, whip pans | Symmetrical, storybook auteur comedies |
| `noir` | Black and white, low-key hard light, slatted shadows, strong grain | 1940s film noir |
| `home-8mm` | Heavy grain, strong weave, vignette, light leaks, 18 fps cadence, 4:3 | Super 8 home movies |
| `analog-video` | Chroma bleed, scanlines, tracking noise, 4:3, soft | 1990s consumer video |
| `documentary-natural` | Muted, natural light, gentle handheld | Observational documentary |
| `cel-animation` | On twos, flat shading, clean lines, saturated | Hand-drawn television animation |

**Style references in a brief** (a director, a film, a stock) are resolved by the writer or an agent into a preset plus overrides, using this table and the techniques behind it. Kumiki's code never parses or stores the names.

## Checks

- **`look-text-contrast`:** caption and title contrast measured after the grade (rendered-text audit).
- **`look-mood-conflict`:** a mood that contradicts its preset, such as "joyful" on `noir`. A warning; it may be intended.
- **`look-texture-on-text`:** grain or halation reaching a caption layer.
- **`look-cadence-on-ui`:** step printing or on-twos cadence on a screen demo, where it reads as broken playback.
- **Determinism:** the same frame renders identically in any order. This extends the existing `film:seek` check.

## Evidence plan

1. One film rendered in every look at draft size: a contact sheet of the same three frames, look by look, for side-by-side review.
2. Fixed probes per look: the grade on a grey ramp and a colour chart, so each look's curve and balance can be measured, not just seen.
3. Owner review of each look against its references. Human judgement decides whether a look "feels" right; code checks only that it is stable and legible.

## Order of work

1. **The look layer and the grade** (SVG filter, mood vocabulary, `studio-clean`, `warm-35mm`, `bleach-bypass`, `teal-amber`, `nordic-overcast`), plus the text-contrast check.
2. **Texture** (grain, halation, weave, vignette, matte) and `home-8mm`, `noir`, `analog-video`.
3. **Cadence and camera language** (step printing, on twos, handheld, Steadicam float), with `neon-longing` and `documentary-natural`.
4. **3D lighting moods** (`low-key`, `neon-practicals`, `golden-hour`, `blue-hour`, `overcast`), and lens bias for shot-3d scenes.
5. **Type and sound mood** per look; `pastel-tableau` and `cel-animation`.

## Open questions for the owner

- Should looks grade captions too (more filmic), or keep them clean by default (more legible)? The plan keeps them clean.
- Which three looks matter most for your films, so they are built and reviewed first?
