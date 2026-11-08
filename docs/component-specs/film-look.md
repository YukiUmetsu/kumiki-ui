# Film Look: making films in different styles

**Registry item:** `film-look` (`registry/video/film-look.ts`, `film-look-react.tsx`). `film-document` depends on it.
**Plan and research:** [33 — Film looks and style anchors](../33-film-looks-and-style-anchors.md).

## Purpose

A look is how a film *feels*. It turns a style anchor ("melancholic, bittersweet, shot on 35 mm with natural grain") into explicit, deterministic numbers for:

- the colour grade;
- the texture of a film stock or a video format;
- the frame cadence;
- camera behaviour;
- a lens and a lighting mood for 3D shots;
- type and sound.

A writer chooses a preset and mood words. Style references in a brief (a director, a film, a stock) are resolved into a preset plus overrides using the table below; the code never stores those names.

## In a film

```json
"look": { "preset": "neon-longing", "mood": ["melancholic"], "overrides": { "texture": { "grain": 0.3 } } }
```

- **`look`** on the film applies to every scene.
- **`look`** on a scene merges over the film's: its preset wins, its moods add, and its overrides merge section by section. That gives a grade that changes with the story, a colour script.
- **Trying a look.** `film:check`, `film:review` and `film:render` take `--look=<preset>` and `--mood=<a,b>`, to try a film in another look without editing it:

  ```bash
  npm run film:review -- my.film.json --only=draft --look=noir --out=dist/film-looks/noir
  ```

## Presets

| Preset | Character | Informed by |
|---|---|---|
| `studio-clean` | Crisp and neutral, no texture | Product launch films |
| `warm-35mm` | Soft toe, warm skin, fine grain, amber halation, slight weave | 35 mm colour negative print |
| `neon-longing` | Saturated teal shadows and magenta highlights, red halation, anamorphic streaks, step-printed handheld, a little wide; 3D lit by neon practicals | The Hong Kong films shot by Christopher Doyle for Wong Kar-wai |
| `bleach-bypass` | Desaturated, hard contrast, handheld, low-key 3D | Skip-bleach processing |
| `teal-amber` | Teal shadows against warm skin and highlights | Contemporary feature grading |
| `nordic-overcast` | Cool, muted, locked-off, overcast 3D light | Scandinavian crime drama |
| `pastel-tableau` | Lifted pastel palette, locked symmetrical frames, wide lens, high-key 3D, spaced geometric capitals | Storybook, symmetrical auteur comedy |
| `noir` | Black and white, hard contrast, mono grain, blinds, flicker, low-key 3D, serif capitals | 1940s film noir |
| `home-8mm` | Heavy grain, strong weave and flicker, light leaks, faded warm colour, step-printed handheld, muffled sound | Super 8 home movies |
| `analog-video` | Colour bleed, scan lines, tracking noise, soft, monospace capitals, muffled sound | 1990s consumer tape |
| `documentary-natural` | Muted, natural, gentle handheld | Observational documentary |
| `cel-animation` | Posterised flat colour, saturated, on twos, locked | Hand-drawn television animation |

## Moods

Each mood moves a preset's numbers in one direction; `LOOK_MOOD_EFFECTS` has the exact steps. Brightness and saturation follow Valdez and Mehrabian (1994): brightness carries pleasure and saturation carries arousal. Light, camera and texture follow cinematography practice.

| Mood | What it does |
|---|---|
| `melancholic` | Darker, desaturated, cooler; teal shadows; a push-in at the turn; blue-hour 3D light |
| `bittersweet` | Warm highlights over cool shadows; more halation |
| `tense` | Harder contrast, less saturation, darker; vignette; handheld; low-key 3D light |
| `joyful` | Brighter, more saturated, warmer |
| `serene` | Brighter, softer, less saturated; handheld becomes a float |
| `nostalgic` | Lifted blacks, faded and warm; more halation, grain and weave |
| `clinical` | Cool and clean: no grain, halation or leaks; a locked camera |
| `urgent` | More saturation and contrast; handheld; a push-in at the turn |

## What a look controls

- **Grade.** Exposure, contrast as a normalised S-curve, saturation, temperature, tint, lifted blacks, rolled whites, split toning, an optional channel mixer and posterising. It is drawn as one SVG filter on the composited picture, so it grades HTML, canvas and WebGL alike.
- **Texture.**
  - Grain: six seeded tiles, offset per frame, in colour or monochrome.
  - Glow: halation and bloom above a threshold, and horizontal anamorphic streaks.
  - Movement in the gate: weave and flicker.
  - Overlays: vignette, light leaks and window-blind shadows.
  - Video artefacts: colour bleed, scan lines, a rolling tracking band, softness.
  - A 2.39 or 4:3 matte, off by default because it covers titles.
- **Cadence.** `twos` and `step` hold each frame. The scene shows its held frame, while grain, weave and flicker still change every projected frame.
- **Camera.** `locked`, `drift` (the film's push), `float` and `handheld` move the scene layer with seeded noise; `pushAtTurn` pushes in after the scene's story turn.
- **Lens.** 3D shots are re-shot through `ShotLensContext`: the field of view scales and the camera moves along its line of sight, so the subject keeps its size.
- **Lighting.** 3D shots with no studio look of their own take the look's: `softbox`, `strip`, `rim`, `high-key`, or one of five new studio moods, `low-key`, `neon`, `golden-hour`, `blue-hour` and `overcast`, each with its own light colours, sky and sweep.
- **Type.** CSS variables `--km-font-display`, `--km-font-body`, `--km-title-case` and `--km-title-tracking`, used by studio captions and world titles. The film's look sets them for captions too.
- **Sound.** `bedTags` describe the beds that suit the look, and `lowpassHz` muffles beds that set no filter of their own.

Film captions stay above the look: graded and textured scenes never touch the film's captions.

## Checks

- `look-unknown` and `look-mood-unknown` are errors.
- `look-mood-conflict` is a warning, for a mood the preset avoids, such as "joyful" on `noir`.
- `look-matte-text` is a warning when a matte covers the frame edges where titles sit.
- `look-cadence-on-ui` is a warning for a held-frame cadence on a screen shot, which reads as broken playback.
- **Text contrast** after the grade is measured by `film:review`'s rendered-text audit.
- **Reduced motion** keeps the grade and grain but drops shake, push, weave, flicker and held frames (`stillLook`).

## Evidence (2026-11-08)

- **Test card.** Storybook **Video production → Film Looks** draws a test card (a dusk sky with a bright sun, a grey ramp, colour patches, skin tones, a title) in every look and every mood.
- **One film, eight looks.** `savings-3d.film.json` was reviewed in eight looks at draft size on the GPU: 0 errors in each. Text-contrast warnings rise from 18 (clean) to 36 at most, where grain and lifted blacks soften titles.
- **Seek order.** `film:seek` under `neon-longing` (step-printed, handheld): frames reached in any order match to one channel step.
- **Video.** A 60-frame `film:render` under `home-8mm` decoded as expected.
- **Lens.** A long lens (`fovScale` 0.6) changed every studio frame while the subject kept its size.
- **Human review of each look against its references is pending.**

## Limitations

- **Step printing** holds frames but does not smear them: the motion streaks of undercranked footage are not drawn.
- **No depth of field.** The lens changes perspective only. Shots that do not use `ShotCamera` (inside a portal world, the baked flythrough, the captured place) keep their own lens.
- **No hue-selective grading.** The grade cannot desaturate everything except one hue; the channel mixer and split toning stand in.
- **Blinds** fall across scene text as well as the scene.
- **Cel posterising** bands smooth gradients (backdrops, light pools). That is the style, but strong on wide gradients.
- **Sound.** `bedTags` are guidance; a look does not choose a bed by itself.
