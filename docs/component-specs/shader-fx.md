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
- A `transition` layer was planned and is not built. See [plan 27](../27-cinematic-shader-fx-pack-plan.md).
