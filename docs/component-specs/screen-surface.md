# ScreenSurface — put real content on a 3D device, without stretching or guessing

**Status:** Implementing. Automated checks and agent screenshot review are recorded below. Human review is pending.
**Catalog phase:** P0, third slice of Phase 3 in [17 — Explainer Visual Components](../17-explainer-visual-components.md#3-highest-priority-component-contracts-p0).
**Scope:** Binds browser or app content (a live painter, a screenshot, an SVG) to an existing 3D device's display mesh.
- The content keeps the display's true aspect.
- It repaints deterministically from the frame number.
- Screen-space callouts follow the display's corners.
- Text that would be unreadable from the camera is flagged.

It does not model devices. It does not judge whether the content is accurate.

## Reuse and the gap it fills
- **Reused:**
  - **Hero assets:** `HeroAsset.parts` provides the named display mesh (`laptop-display`, `phone-display`) and `pose(state)` drives the device.
  - **Viewer:** `ScreenContent3D` draws through `HeroAssetViewer`'s `onPose` hook, and `fitHeroCamera` builds the same camera the viewer draws with, so overlays and readability use the drawn pose.
  - **Painting:** canvas textures, with the same no-canvas fallback as `paintTexture` in Node and jsdom.
  - **Text measurement:** `createCanvasMeasurer` for overlay labels.
- **The gap:** the crafted devices painted their screens with fixed, built-in UIs. Nothing let a consumer bind their own content, and nothing checked the binding (stretch, orientation, facing, legibility) or kept callouts on the display.

## Install and inspect
- Registry item: `screen-surface` (`screen-surface.ts`, `screen-content-3d.tsx`), depending on `crafted-3d-hero`.
- Storybook: **Craft / Screen Surface**.
  - **Devices:** a phone (9:16) and a laptop (16:9), each showing content with a measured callout that follows the display's top-right corner. The phone shows a live tracker painted from the frame number, or an SVG screenshot that loads asynchronously. The laptop shows a route board. The controls are Play, a frame seek, and Live paint / Screenshot (SVG).
  - **Refusals:** a missing part, a part that is a group rather than a screen, an image still loading, text too small from a distant camera, and a display turned away. Each is reported with its status.

## Minimal usage
~~~tsx
const screen = useMemo(() => ({ part: "phone-display", designWidth: 390, minTextPx: 16,
  content: { kind: "paint", draw: (ctx, w, h, frame) => drawTracker(ctx, w, h, frame) } }), []);

<ScreenContent3D createAsset={createPhone} width={360} height={640} zoom={2} action="notify" actionFrame={frame} fps={30}
  screen={screen} ariaLabel="Phone showing a parcel tracker"
  overlay={({ projection }) => <circle cx={projection.corners[1].x} cy={projection.corners[1].y} r={6} />}
  onDiagnostics={report} />
~~~

Lower level, for a custom viewer or a GLB screen: `bindScreenSurface(asset, options)` returns a handle with `paintAt(frame)`, `project(camera, w, h)`, `diagnostics(camera?, w?, h?)` and `dispose()`.

## Contract
- **Binding:** `part` names an entry in `asset.parts`. It must be a single-material `Mesh` with an emissive map. Otherwise the handle reports an error (`screen-surface-part-missing` or `screen-surface-part-invalid`) and never throws.
  - The bound material's emissive map is replaced, and restored on `dispose()`.
  - The display's UVs decide its face. `displayFace(geometry)` finds which local axes u and v follow, the face size and the visible side, so rotated meshes and GLB screens work.
  - If the UVs do not cover the whole display, the handle warns (`screen-surface-uv-partial`).
- **Aspect:** the canvas is `resolution` on its long side (default 2048), with the display's aspect. Content is never stretched. `screenCanvasSize` and `fitScreenContent` are exported.
- **Content:**
  - `{ kind: "paint", draw(ctx, designWidth, designHeight, frame) }`: drawn in design px, so one painter fits any device. The design height follows the aspect. The frame is the caller's frame.
  - `{ kind: "image", source, width, height }`: a loaded source (image, SVG, canvas, or a video frame the caller has seeked). `fit` is `contain` (default) or `cover`. A source with no pixels yet is `pending`, and `onReady` fires when it loads.
  - A painter that throws sets status `error` with `screen-surface-content-error`.
- **Determinism:** `paintAt(frame)` is a pure function of the frame and content. The same frame repaints the same pixels, and an unchanged frame is skipped. Verified in the browser: frame 100, then 200, then 100 again gives identical pixels.
- **Projection:** `project(camera, w, h)` returns the display's corners in CSS px (top-left, top-right, bottom-right, bottom-left), its centre, `pxPerDesignPx`, `facing` (cosine against the camera direction) and `inside`.
- **Diagnostics:** `diagnostics(camera?, w?, h?)`.
  - **Binding (errors):** `screen-surface-part-missing`, `screen-surface-part-invalid`, `screen-surface-content-invalid`, `screen-surface-content-error`.
  - **Warnings:**
    - `screen-surface-no-canvas`: there is no 2D canvas (Node, jsdom); the display keeps its original content.
    - `screen-surface-uv-partial`.
    - `screen-surface-unreadable`: `minTextPx` (the smallest text in the design, in design px) renders below `minScreenTextPx` on screen.
    - `screen-surface-facing-away`: the display is seen from behind.
    - `screen-surface-outside-viewport`: a corner is clipped, so callouts would be cut off.
- **Component:** `ScreenContent3D` wraps `HeroAssetViewer` and forwards its props, except `onPose`, `onAsset` and an explicit `camera`.
  - `screen` is read when first bound; a new identity rebinds it, so memoize it like `createAsset`.
  - `overlay({ projection, frame, width, height })` draws SVG in the viewport's CSS px, re-projected on every draw.
  - `onDiagnostics` is called only when the list changes.
  - An image that finishes loading repaints the screen automatically.
  - The root reports `data-km-screen-content3d`.
- **Limits:**
  - The screen follows the viewer's `actionFrame`. It updates through the plain draw path only; the viewer's motion-blur sub-frames reuse the main frame's pixels.
  - Only one asset is bound at a time per recipe instance.
  - Rectangular displays only; curved screens are approximated by their flat face.
  - Video is supported by seeking the source yourself and passing the frame to `paint`. The adapter does not seek.
  - Readability uses the design's smallest text, which the caller declares; a wrong declaration produces a wrong warning.
  - The devices used in the story are crafted hero models in `registry/domains/technology-3d.ts`, which are not yet a registry item.

## Verification (2026-10-23)
- `npx vitest run tests/hero-quality-gate.test.ts`: seven ScreenSurface cases, 15 tests in the file.
  - **Geometry:** the phone display's aspect is 0.468 and the laptop's is 1.552, with full UV coverage, u along x and v along z.
  - **Aspect:** canvas and fit maths keep the aspect; cover and contain are checked.
  - **Refusals:** a missing part and a non-screen part return errors without throwing, and leave the asset's material untouched.
  - **No canvas:** reports `unpainted`, keeps the display's canvas geometry, paints nothing.
  - **Projection:** at the default pose the top corners are above the bottom ones, facing is positive and the display is inside the viewport.
  - **Motion:** a turn changes the corners, reports `facing-away` at the half-turn, and returns to the rest corners exactly.
  - **Readability:** a distant camera flags text, and a closer one clears it.
- Storybook (headless, WebGL via SwiftShader):
  - Both viewers reach `kmHeroReady` with no console errors.
  - After the first readability fixes, the devices story reports no diagnostics.
  - The SVG screenshot switches from pending to ready, with no diagnostics.
  - The refusals story lists each expected problem.
- Fixed after review:
  - **Island overlap:** the tracker's title ran under the phone's dynamic island, so content now starts below it. The SVG screenshot's header was also moved clear.
  - **Readability:** `minTextPx` was the default 14 rather than the content's smallest text, so the phone's warning was 8.5 px and the laptop's 5.8 px. Each content now declares its real smallest text (16, 17 and 21 design px); the laptop camera moved from zoom 1.4 to 1.6 to clear 9 px.
- **Open items:**
  - A hatched strip is visible along the laptop display's left bezel in the live paint. It is not yet attributed: it could be the existing lid geometry or a sampling artefact of the screen's side walls. It needs checking against the unbound asset before this spec's status changes.
  - Human visual review of the devices is pending. No real device or product screenshot has been exercised; all content is fictional and generic.
