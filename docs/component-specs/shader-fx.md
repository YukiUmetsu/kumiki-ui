# Shader FX

**Registry items:** `shader-fx-model` (data, no GPU), `shader-fx` (WebGL adapter)
**Source:** `registry/video/shader-fx.ts`, `registry/video/shader-fx-react.tsx`
**Dependency:** `@paper-design/shaders` 0.0.82, pinned exactly. Apache-2.0. Keep its `LICENSE` and `NOTICE` when you redistribute a bundle.

## Purpose

Six cinematic effects that a film or a React scene can use as data. A frame fully sets the picture, so a seek cannot change it, and an export is exact. This is not a second renderer or a general background catalog. An effect should support a point in the scene. It should not fill an empty shot.

## Effects

| Effect | Needs | Use it for |
|---|---|---|
| `mesh-gradient` | nothing | A calm opening, a chapter bridge, the ground behind a data story |
| `grain-gradient` | nothing | A documentary or evidence ground |
| `liquid-metal` | a silhouette `image`, or a `shape` | A title mark or an object identity. Not metal on 3D geometry |
| `god-rays` | nothing | Light over `environment-reveal` or `guided-inspection` |
| `water` | a picture `image` | A picture of water, moving under a surface. This is not a fluid simulation |
| `halftone-dots` | a picture `image` | A printed look for `evidence-reveal` or `before-after` |

## Using each effect well

See it before you read it: **Video production → Shader FX Craft** plays each effect in a designed piece next to its most common misuse, with sound cued from the catalog. `Title Sequence` puts all of them into 18 seconds.

Three rules hold for every effect. **Give it one job.** **Let one effect lead a shot.** **Never let it move faster than the words, or sit behind small text.** Restraint is what makes these effects look expensive.

| Effect | Its job | Avoid | Settings that look premium | Sound |
|---|---|---|---|---|
| `mesh-gradient` | A chapter card, an opening, a quiet bridge. It sets a mood and a palette | Saturated colour or fast swirl behind small text. Its contrast varies across the frame, so text can pass in one place and fail in another | 3 to 4 neighbouring hues from one palette, rate 0.15 to 0.25, swirl under 0.2, grain about 0.05. Animate the type, not the background | A soft whoosh as the title rises |
| `liquid-metal` | One identity moment: a logo or mark, once per film | Text, backgrounds, fine detail, and chrome on everything | A clean silhouette on transparency, repetition 2 to 4, distortion under 0.1. Let the flow rush in for about a second, then slow it right down. Show the mark only on its own dark field, then bring in the name | One airy sting, landing as the mark settles |
| `god-rays` | Revealing a place, or the moment light arrives | Rays with no source in the picture, pure white beams, rays across text | Set `originX` and `originY` on the brightest point in the photograph, tint the rays with that light's colour, keep intensity near 0.5 to 0.75, and fade in over 2 to 3 seconds. A slow push toward the source helps | A soft riser that peaks as the title lands |
| `grain-gradient` | Quotes, evidence, documentary cards | Heavy noise or saturated colour under small text | Two neighbouring dark tones, softness 0.8 to 0.9, noise 0.1 to 0.15, rate under 0.2, and a serif or strong weight for the words | A paper slide as the card arrives |
| `water` | A living still: a lake or stream in a photograph | Distorting land, sky, faces or text | Mask it to the water and put the mask edge where the picture already changes, such as a shoreline. Waves and caustic around 0.05, rate about 0.3, a very slow push | A quiet outdoor bed, and no hits |
| `halftone-dots` | Archive, print and then-and-now reveals | Dots so large the subject is lost, low contrast, faces at small sizes, pop-art colour in serious work | Ink on a warm paper colour, a hex grid, contrast 0.5 to 0.6, and `grain` 0.2 to 0.3 so the dots look printed. Pick a photo with clear lights and darks. A straight wipe to the photograph is the payoff | A page turn on the wipe |

**Make the effect resolve.** In studio work, the effect usually ends in the subject: light gathers into a mark, dots sharpen into a picture. `keys` moves a numeric control over the host's frames, eased and validated against the same limits. It updates the live context, so a moving effect never rebuilds WebGL. A control can move more than once. See [Shader effects in practice](../29-shader-fx-in-practice.md).

```json
{ "id": "resolve", "effect": "halftone-dots", "layer": "background", "image": { "id": "photo", "src": "photo.jpg", "alt": "A waterfall", "licenseRef": "cc0" },
  "keys": [{ "param": "contrast", "from": 0, "to": 0.6, "startFrame": 8, "endFrame": 78 }, { "param": "size", "from": 0.95, "to": 0.55, "startFrame": 8, "endFrame": 86 }] }
```

Movable controls: `mesh-gradient` distortion and swirl. `liquid-metal` contour, distortion and softness. `god-rays` intensity, density, bloom, midSize and midIntensity. `grain-gradient` intensity, noise and softness. `water` caustic, waves, highlights, layering and edges. `halftone-dots` size, radius and contrast. Colours, shapes and images stay fixed.

**Two controls were added for this:** `god-rays` takes `originX`, so rays can come from where the light is, and `halftone-dots` takes `grain`, so print does not look generated. `water` takes `waterline`, so only the water moves.

### The guide is data

`SHADER_FX_GUIDE` in `shader-fx-guide.ts` holds the table above for each effect: its jobs, what to use it for, what to avoid, settings, a catalog sound, review questions, and `practice`: how studio and brand work uses it, described without names. The docs, the Storybook pages, the catalog and `film:check` all read it, so an agent meets the same rules wherever it looks.

- **Jobs.** Every effect can name its job: `mood`, `bridge`, `identity`, `reveal`, `evidence`, `archive` or `living-still`. A job the effect does not suit is an error (`shader-fx-job`). A film effect with no job gets a warning.
- **Use checks.** `film:check` warns about the misuses studio work avoids: `fx-competing` (two effects leading one shot), `fx-unmotivated-light` (rays with no origin), `fx-unmasked-water` (no waterline, unless keys calm the water to waves of 0.05 or less and caustic of 0.06 or less), `fx-subject-lost` (halftone that ends with the picture lost), `fx-competes-with-text` (a hero or fast gradient behind words) and `fx-identity-repeated` (chrome more than once, or as a background). They are warnings, so a film can break a rule on purpose.
- **Search by intent.** Each effect and moment is a catalog entry of type `effect`. `npm run catalog:find -- --type=effect --query="reveal a logo"` returns the match with its jobs, use, avoid and settings. Its use is searchable; its avoid text is not, so "text" does not find an effect that warns against text.
- **Review.** `film:review` writes each effect's review questions into its report, and prints them.
- **Light.** `npm run fx:light -- <photo> [--aspect=16:9]` finds the light in a photograph and prints `originX` and `originY`. A strength under 1.4 means the picture has no clear light. `findLightSource` and `rayOrigin` do the same in code. The mapping was measured in a browser: the rays' core sits at the frame's centre plus the origin times its shorter side, with y down.

### Moments

`shader-fx-moments` is a separate pack of ready-made moments, each one job done well. A pure builder returns the effect spec, the frames where text lands and the sound cues, so a film file and a React stage agree. The React component plays it on a frame clock.

| Moment | Job | What it does |
|---|---|---|
| `ResolveIntoPicture` | reveal | Printed dots sharpen into the photograph, then a label lands |
| `ResolveIntoMark` | identity | Coloured beams gather into a backlit mark, then fall back |
| `MarkSting` | identity | A chrome mark rushes in, settles on a dark field, and the name follows |
| `LivingStill` | living-still | Only the water moves, below the waterline |
| `SignatureGradient` | identity | One brand palette, seed and rate, in any format |
| `LightWithASource` | reveal | Rays placed on the light it finds in the photograph |
| `CausticReveal` | reveal | The picture starts under rippling water and caustic light, and the surface calms until it comes through clear |
| `GrainFinish` | none | One seeded grain over a whole shot, so layers read as one made piece |

```tsx
<LivingStill image={lake} waterline={0.52} title="Still air, moving water" frame={frame} fps={fps} durationFrames={150} style={{ color: "#0d2133" }} />
```

Text in a moment inherits `style.color`: white by default, dark over a bright sky. See them, and pick one by what the shot needs, in Storybook **Video production → Shader FX Moments → Choose An Effect**.

**Sources, and how much weight each one carries:**

- **Primary:** Paper Shaders documentation, for what each control does: [god rays](https://shaders.paper.design/god-rays), [liquid metal](https://shaders.paper.design/liquid-metal), [halftone dots](https://shaders.paper.design/halftone-dots), [water](https://shaders.paper.design/water). The [WCAG contrast minimum](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html) of 4.5:1 for body text and 3:1 for large text.
- **Practitioner, moderate weight:** StudioBinder on [volumetric lighting](https://www.studiobinder.com/blog/what-is-volumetric-lighting/): visible beams need a hard source and haze. ProVideo Coalition on [removing banding](https://www.provideocoalition.com/remove-banding-in-after-effects/) and RedShark News on [adding noise](https://www.redsharknews.com/technology/item/1767-why-adding-noise-to-video-can-be-good): grain breaks up banding. Digital Production on [halftone](https://digitalproduction.com/2026/08/21/fridays-for-fusion-mug-advanced-halftone/): a perfect grid can look generated. Creative Bloq on [chrome logos](https://www.creativebloq.com/design/logos-icons/from-apple-to-nike-im-mesmerised-by-these-hypnotising-chrome-logos).
- **Vendor or tutorial, low weight:** [Figma](https://www.figma.com/resource-library/how-to-make-a-cinemagraph/) and [Flixel](https://blog.flixel.com/create-smooth-moving-water-cinemagraph-pro-mac) on cinemagraph masks, and [Instant Gradient](https://instantgradient.com/blog/animated-gradient-backgrounds) on slow gradient loops. Their advice matched the stronger sources and was used only where it did.

The settings ranges in the table are this library's own, chosen by rendering and comparing. Human review of the pieces is pending.

## In a film

```json
"fx": [
  { "id": "sea", "effect": "mesh-gradient", "layer": "background", "seed": 3, "treatment": "standard" },
  { "id": "drop", "effect": "liquid-metal", "layer": "overlay", "treatment": "standard",
    "image": { "id": "drop", "src": "assets/water-mark.svg", "alt": "A water drop", "licenseRef": "original-kumiki-example" },
    "region": { "x": 0.4, "y": 0.07, "width": 0.2, "height": 0.3 } }
]
```

[`examples/film/where-water-begins.film.json`](../../examples/film/where-water-begins.film.json) uses five effects in four scenes. `grain-gradient` is in the Storybook story.

- **`layer`:** `background` sits behind the scene, and the scene drops its own canvas. `overlay` sits above it, in `region` or over the whole frame. A full-bleed recipe draws its own plate, so use an overlay on it.
- **`treatment`:** `subtle` (default), `standard` or `hero`. Use `hero` for one moment in a film. `params` override a treatment's values. Each number has limits, and a value outside them is an error.
- **Colours:** `#rrggbb`, `#rrggbbaa`, or a token such as `--km-accent`.
- **`seed`:** Paper Shaders has no seed input, so a seed picks a different moment of the effect. Two scenes with one palette then look different.
- **`rate`:** a share of normal speed. `0` holds the effect still.
- **Budget:** a scene takes two effects at most. A transition then holds four WebGL contexts at most.
- **Rights:** each `image` needs a `licenseRef`. The checker refuses one without it, and the export manifest lists it.

A transition takes an effect with `"layer": "transition"`. Its opacity is a held bell: clear at both ends, and fully covering for about a third of the transition. Reduced motion drops it. See [Film Document](film-document.md).

## In React

```tsx
<ShaderFxLayer spec={spec} frame={frame} fps={{ num: 30, den: 1 }} hostDurationFrames={300} />
```

For a film, pass the adapter to `FilmStage`. This keeps it out of a film's dependency closure unless the film uses it:

```tsx
<FilmStage film={film} frame={frame} renderFx={(spec, context) => <ShaderFxLayer spec={spec} {...context} />} />
```

A scene with effects and no `renderFx` throws an error. It does not silently drop the effect.

## Determinism

- The mount runs at speed 0, so nothing advances on its own. `shaderFxTimeMs` turns a frame into time, with rational FPS.
- `VideoExportStage` waits until the layer has drawn the exact frame on a sized canvas. A failed layer stops the export and names the effect.
- `npm run film:seek -- <file>` proves it: shuffled seeks, then each frame again on a fresh page.

## States

- **Pending:** images load first, because Paper Shaders refuses an image that is still loading. Solving a silhouette takes real time, so each source runs once.
- **Failed:** the layer shows a visible error, and an export stops. A `fallback` prop replaces that error only if the caller passes one.
- **Context lost:** the layer goes back to pending, and it remounts when the browser restores the context.
- **Reduced motion:** the effect holds its first frame, with no fade.
- **SVG sources:** WebGL refuses an SVG image as a texture, and the shader stays blank with no error. The adapter rasterizes SVG sources to 2048 px first.

## Accessibility

An effect is decoration. The host is `pointer-events: none` and holds no text. A person needs the same meaning with the effect removed. Text over an effect is your responsibility: `film:review` reports `text-low-contrast` from the drawn pixels.

## Limits

- `halftone-dots` does not animate by default. Its motion comes from `rate` and from the scene.
- `water` moves across its whole area, including land. Use it on a picture that is mostly water, or stay on `subtle`.
- WebGL2 is required. There is no software fallback.
- Output was checked on one Chromium and GPU. GPU output can vary between machines, so `film:seek` allows a step of 2 in a channel.
