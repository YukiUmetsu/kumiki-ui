# Image Relief 2.5D — source image to frame-addressable depth geometry

**Status:** implementing; deterministic geometry tests and a Storybook inspection story are included. **Not visually approved** and not a true multi-view reconstruction or an image generator. **Registry ID:** `image-relief-2-5d`. **Source:** `registry/craft/image-relief.ts`. **Storybook:** `3D asset toolkit / 2.5D Image Relief / Camera Inspection`.

## When to use

Use for a detailed **still photograph or AI-generated 2D illustration** that needs a slow dolly, lateral drift, slight orbit, depth-dependent occlusion or lighting response. In ContentGen's visual-asset pipeline, use it **after** image production and selection, when you have an approved color image and depth map with the same composition. A transparent foreground cutout can be supplied separately. This is a way to animate **existing pixels**, not a replacement for ComfyUI, rigging, motion capture or Blender.

Do **not** use it for an extreme orbit, a shot that exposes previously hidden sides, an object requiring physically correct internal mechanics, readable generated text, or a major camera move behind foreground objects. For those, use a proper 3D asset or separately generated and art-directed image layers. The mesh cannot invent pixels behind occlusions. Keep critical text, diagrams and data in Kumiki's sharp screen-space overlays.

## Data contract

1. **Color image:** approved, licensed 8-bit PNG/JPEG/WebP or equivalent decoded into a Three.js `Texture` with `SRGBColorSpace`. The caller owns it and its provenance.
2. **Depth image:** exactly the corresponding source framing; 8-bit RGBA decoded in row-major order, **top row first**. `white = near` by default; invert with `nearIsWhite: false`. `depthChannel` selects RGB luminance or one channel. Use ComfyUI's depth estimation as an external asset-generation step; inspect it for object-boundary and reflective-surface errors. The utility does not call ComfyUI or install models.
3. **Optional alpha mask:** a separately decoded non-color Three.js `Texture`. White reveals pixels, black hides them; Three.js samples its green channel. Use cutout masks around foreground elements when a single depth sheet would visibly stretch across occlusions.
4. **Spec:** serializable `ImageReliefSpec` (version 1). World dimensions, depth scale, tessellation, smoothing, and boundary feather are explicit. The geometry adapter accepts decoded pixels and textures separately, so raw pixels, GPU textures and browser objects are **not** embedded in the saved scene document.
5. **Timing:** the utility does not animate. Drive the resulting mesh and the scene camera through the existing `CameraViewport3D`, `CinematicCameraDirector` or `HeroAssetViewer` using absolute frames and a reduced-motion hold/cut policy.

## Minimal example

```ts
import { createImageRelief } from "./components/craft/image-relief";

const spec = {
  schemaVersion: 1 as const,
  id: "approved-forest-image",
  width: 4.8, height: 2.4, depthScale: 0.28,
  segmentsX: 240, segmentsY: 120,
  depthChannel: "red" as const,
  nearIsWhite: true,
  smoothRadius: 2, edgeFeather: 0.05,
};

// Decoding and verifying these approved assets is the host's responsibility.
const relief = createImageRelief(spec, decodedDepthRGBA, {
  color: approvedColorTexture,
  alpha: optionalCutoutMaskTexture,
  lighting: "baked", // photographs already contain light and shadow
});
scene.add(relief.mesh);

// Existing Kumiki camera plan evaluates each absolute frame; no new clock.
// On unmount: relief.dispose(); color/depth textures remain caller-owned.
```

`lighting: "relight"` switches to MeshStandardMaterial and enables cast/receive shadow. Use it only for imagery prepared as neutral albedo, since relighting an already-lit photograph compounds shadows. Its `roughness` and `metalness` parameters are explicit; the default `"baked"` surface is unlit to preserve the source's color and tonality.

In a browser, skip the image decoding boilerplate entirely with the same registry item:

```ts
import { createImageReliefFromSources } from "./components/craft/image-relief";

const relief = await createImageReliefFromSources(spec, {
  colorSrc: "/approved/forest-color.png",
  depthSrc: "/approved/forest-depth.png",
  alphaSrc: "/approved/forest-alpha.png", // optional
});
scene.add(relief.mesh);
// Host camera evaluates an absolute frame. On teardown: relief.dispose().
```

The URL helper uses browser image decoding and Canvas2D; assets must be same-origin or CORS-enabled. It verifies matching image aspect and releases textures as well as geometry on `dispose()`. It does not fetch files in Node.js or validate rights; the production asset manifest remains authoritative.

## Craft controls and hard limits

| Parameter | Use | Bound |
|---|---|---|
| `depthScale` | How much foreground separates from background in world units | 0 to half the shorter world dimension |
| `segmentsX`, `segmentsY` | Mesh silhouette and grazing-angle detail | 2–512 each; ≤262,144 vertices total |
| `smoothRadius` | Reduce noisy AI depth artifacts at the mesh level | 0–3 source pixels |
| `edgeFeather` | Return photo edges gradually to the original plane; reduce hard frame-edge cliffs | 0–0.25 normalized UV |
| `nearIsWhite` | Match the actual depth estimator's polarity | boolean |
| `depthChannel` | Use output format's correct channel | `red`, `green`, `blue`, `luminance` |
| `alphaTest` | Discard transparent silhouette pixels for better edge/occlusion behavior | 0–1 |

The decoded depth input must have dimensions 2–8192 pixels per axis and exactly four channels. The validator reports actionable errors before geometry allocation. No network, inference, renderer configuration, or global material mutation occurs in the utility. One instance owns its geometry/material; caller-owned textures are not disposed.

## Camera and visual acceptance

- Start with **very small camera shifts** (roughly ±3–7°) and inspect foreground edges, tree trunks, faces and straight architecture. Motion must be motivated by subject reveal or focus—not movement for its own sake.
- Check the original source at full output size and inspect actual 16:9 and independently authored 9:16 crops. The same single image cannot automatically cover both aspects at every framing.
- Verify source/depth alignment, masks, white/black depth polarity and real transparency. Incorrect maps produce rubber-sheet distortion even when the geometry tests pass.
- Compare frame 0, mid-shot and final shot, plus representative reverse/random seeks. Keep fine text out of the distorted texture and above foreground layers.
- Record GPU captures and human review before calling a scene premium. The Storybook demonstration's brightness-derived depth is **illustrative test data**, not a claim of photographic depth fidelity or a rendered production approval.

## Suggested ContentGen handoff

`approved visual brief → approved image + rights → reviewed ComfyUI depth + optional alpha → ImageReliefSpec → Kumiki camera plan → capture and human QA`.

Only choose this renderer for beats where visual depth and motivated camera motion improve comprehension. The ordinary 2D/2.5D layered composition is still appropriate for a clean static graphic with no useful relief, and `crafted-3d-hero` / `kumiki-blender` remain separate routes for true 3D geometry.

## Verification — 2026-10-31

| Check | Result |
|---|---|
| `npm run typecheck` | Passed |
| `npx vitest run --project unit tests/image-relief.test.ts` | 6/6 passed |
| `npm run scenes:test` | 192/192 passed across 5 files |
| `npm run registry:validate` | 201 items valid |
| `npm run registry:smoke` | 201 items staged successfully |
| `npm run catalog:check` | Passed after adding the purpose-group mapping |
| `npm run build-storybook` | Passed; WebGL output not visually inspected |
| Focused `npx eslint` on changed TS/TSX | Passed |
| Full `npm run lint` | Failed on 14 unrelated pre-existing errors in `globe-projection.ts` and two existing scripts; new files had no errors |
| Browser capture / human aesthetic review | **Pending**: Playwright Chromium download returned truncated/invalid archive in this environment; no screenshot or rendered-MP4 approval claimed |

Acceptance still requires a **real reviewed depth-map pack** (not the synthetic brightness-map gallery), an actual forward/side/reverse capture at delivery resolution, inspected object boundaries and text-safe overlays, and recorded human visual signoff. No Blender tasks live in this package.
