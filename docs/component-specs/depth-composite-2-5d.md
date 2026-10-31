# Depth-Aware 2.5D Composite — photographic layers, truthful occlusion and soft shadows

**Registry ID:** `depth-composite-2-5d`. **Depends on:** `image-relief-2-5d` (installable registry dependency, no Blender). **Code:** `registry/craft/depth-composite.ts`. **Storybook:** `3D asset toolkit / 2.5D Depth Composite / Layered Jungle`. **Status:** implementing; **not visually approved** without actual WebGL renders at video output resolution.

## When to choose it

Choose this adapter when the script benefits from a physically legible camera move across **two or more separately authored 2D layers**, such as foreground foliage against a cleaned background, an isolated physical subject in an environment, a layered product photograph, or a near/mid/far architectural illustration.

- **Single image + matched depth map:** use `image-relief-2-5d` directly; this pack adds no value.
- **Several independently masked images + depth maps:** use this pack; it gives cutouts real z-buffer occlusion and an optional shadow matte projected on the *receiver's displaced geometry*.
- **Precise text, amounts, labels and information:** create it in Kumiki's live 2D/3D text/overlay primitives; never ask ComfyUI to draw letters, forms or invoice numbers into the pixels.
- **Orbit beyond the authored view, major disocclusion or mechanical movement:** use multi-view imagery/rigging or real 3D geometry instead. A single photo layer cannot reveal hidden back faces.

This is a **compositor of approved assets**, not an image finder, text generator, mask estimator, texture generator, camera timeline or video exporter.

## Production asset requirements

For each layer, ContentGen or another host supplies:

1. Approved/licensed **color** image as a caller-owned Three.js `Texture`. Set `SRGBColorSpace`; retain source provenance.
2. A corresponding **decoded RGBA depth image** (`ReliefDepthPixels`), top row first. Depth value is luminance/selected channel in 0–255, white-near by default. The image-relief utility creates actual displaced geometry; the depth bitmap is not a shader-only lighting trick.
3. An optional **grayscale alpha texture**. White = present, black = absent. **Three.js samples the alpha map's green channel**, so a transparent PNG's fourth (`A`) channel must be converted to grayscale before using it as `alpha` (the Storybook story demonstrates conversion). The same silhouette mask is used by any shadow this layer casts.
4. **A cleaned/inpainted background plate** anywhere a cutout will reveal pixels hidden in the original. Without this, lateral motion can expose duplicated objects or empty holes. Inspect the inpainting; the compositor will not invent it.

Source artwork, depth and alpha should share the **same crop per layer**. When multiple layers are aligned to the same source, use the same world dimensions and centers but different Z. When a cutout is cropped tightly, use its actual size and authored XY position. If ComfyUI produces a depth prediction or segmentation matte, review boundaries, halos, fine foliage, hair, glass and signs manually. This utility neither configures ComfyUI nor downloads models.

## Minimal API

```ts
import { createDepthComposite } from "./components/craft/depth-composite";

const spec = {
  schemaVersion: 1 as const, id: "forest-push",
  layers: [ // Strict back → front order
    { id: "clean-plate", width: 4.8, height: 2.7,
      at: [0, 0, -.5] as const, depthScale: .08,
      segmentsX: 192, segmentsY: 108, edgeFeather: .04 },
    { id: "leaf-cutout", width: 4.8, height: 2.7,
      at: [0, 0, .15] as const, depthScale: .12,
      segmentsX: 192, segmentsY: 108, smoothRadius: 1,
      shadow: { receiverId: "clean-plate", offset: [-.06, -.09] as const,
        opacity: .28, softness: .015 } },
  ],
};

const assets = {
  "clean-plate": { color: backgroundTexture, depth: decodedBackgroundDepth },
  "leaf-cutout": { color: cutoutTexture, depth: decodedLeafDepth,
    alpha: grayscaleLeafSilhouetteTexture },
};

const composite = createDepthComposite(spec, assets);
scene.add(composite.group);
// Existing CameraViewport3D / MG1 evaluates the camera at absolute frame N.
// On scene teardown: composite.dispose(); caller disposes its own textures.
```

### Hard constraints

| Rule | Reason |
|---|---|
| 1–12 semantic layers, IDs unique, world dimensions positive | Bounded GPU work and stable scene inspection |
| `layers[]` strictly back-to-front along world **+Z** | Shader-free opaque depth-buffer occlusion; no competing CSS stacking rules |
| For every layer: `[z − depthScale/2, z + depthScale/2]` must be ahead of the previous layer's interval by `>0.0001` | Prevents overlapping, flickering displaced sheets; conservative full-range bound |
| A shadow refers to an **earlier** layer's `receiverId`; caster must have `alpha` | Prevents missing matte/receiver, accidental self-shadow |
| Shadow `opacity` 0–0.8, `softness` 0–0.04 caster UV, `surfaceBias` 0.0001–0.02 world units | Prevents runaway darkening/blur and makes contact-offset explicit |
| Shadow `color` six-digit hex | Deterministic, color-safe input without arbitrary shader injection |
| Optional image-relief controls obey `validateImageRelief` | Keeps depth/tessellation budgets bounded; no extra geometry backend |
| Max 655,360 combined rendered vertices, including each shadow's receiver pass | Prevents unexpectedly expensive multi-layer GPU scenes despite shared geometry buffers |

## How projected soft shadows work

The shadow mesh reuses the **receiver's actual relief geometry**, displaced forward by `surfaceBias`. A small nine-tap fragment shader samples the **caster's alpha mask** at each receiver-space XY coordinate plus an authored offset. It multiplies by the receiver's own mask when present; it writes **no depth**, so actual closer image layers can occlude it. Its color/opacity and penumbra are editable but frame-independent. The existing camera moves all geometry together; there is no duplicate animation clock.

This is a **stylized 2.5D directional contact cue**, not ray-traced light transport: shadow projection is orthographic in composite-local XY, ignoring exact cast light direction, variable caster distance per pixel, volumetric scattering, interreflection and large translations/rotations. Keep the shadow subtle; large offsets on a close crop become obviously fake. Receiver and caster may each have their own alpha cutout. If a shot requires accurate physical shadows, use the existing real-3D light/material/render path instead.

Default `lighting: "baked"` preserves photographic lighting. Use `lighting: "relight"` only on clean albedo imagery; otherwise adding a new light doubles the original shadows. The projected matte is independent of Three.js' shadow map and complements the image's authored illumination rather than recreating it.

## Visual acceptance sequence

1. **Asset review:** inspect RGB image, depth grayscale, alpha cutout and clean plate **individually** at source resolution. Look for silhouette halos, mismatched crops, hallucinated text and repeated/inpainted elements.
2. **Straight-on frame:** compare with original still. Alpha edges must not darken/green-shift, shadow should fit the foreground's actual silhouette and receiver's terrain.
3. **Camera move:** render start, midpoint and end of a **small** motivated lateral move (begin with ±3–7°). Check background reveal and parallax order at near/mid/far depth. Large moves exposing unpainted pixels fail the shot.
4. **Shadow toggle:** compare same frame shadow on/off at full output resolution. It must ground the foreground without broad muddy blobs or a detached flat rectangle.
5. **Aspect and motion:** separately art-direct 16:9 and 9:16 crops; inspect actual text-safe zones, final still frame, reverse seek and reduced-motion hold. Do not add unreadable labels over important content.
6. **Performance and lifecycle:** inspect WebGL frame time, triangulation, alpha texture size and mask overdraw for production packs. Repeated mount/unmount must not leak GPU textures or geometry.

The included Storybook `Layered Jungle` shows a genuine existing cutout and a cleaned existing background plate. **Its depth maps are deliberately flat synthetic fixture data**; it demonstrates compositing and parallax, not the final quality of a real depth estimate. Browser screenshots and human review remain pending and must not be inferred from unit tests.

## Work left for production

- Capture actual GPU output for a production-authorized **ComfyUI depth + alpha + clean-plate pack** and visually sign it off, including color management and greenery edge matte quality.
- Integrate with ContentGen's existing visual manifest/asset factory using source URLs, provenance and dimensions; do not embed DOM textures or pixel arrays in production JSON. This Kumiki component is an installable consumer module, not yet a ContentGen backend integration.
- Consider tracked contact shadows for moving/rotating cutouts as a separate feature only after a shot requires them; current projection assumes a shared, fixed local scene XY frame.
- For very high layer counts, use authored LOD and downsampled supporting depth maps before attempting more elaborate GPU compositors.

## Verification — 2026-10-31

| Check | Result |
|---|---|
| Focused unit tests | 7 depth-composite tests added; run with existing image-relief + craft-detail tests (20 total) |
| `npm run typecheck`; focused `npx eslint` | Passed |
| `npm run registry:validate`; `npm run registry:smoke`; `npm run catalog:check` | Passed (203 registry items; 373 catalog entries) |
| `npm run registry:fixture -- --item=depth-composite-2-5d` | Passed (2-item dependency chain / 3 files compiled in isolated consumer) |
| `npm run scenes:test` | 192/192 passed |
| `npm run build-storybook` | Passed; the added Storybook scenario was compiled, **not visually inspected** |
| Browser WebGL screenshots / MP4 review | **Not yet run; unapproved** |

