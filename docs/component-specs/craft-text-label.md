# Precise World-Space Text — SDF label adapter

**Status:** implemented on visual-quality feature branch; browser/GPU visual approval pending. **Registry ID:** `craft-text-label`. **Source:** `registry/craft/text-label.ts`, `troika-three-text.d.ts`. **Examples:** `3D asset toolkit / Precise World Text / Wayfinding`, `/ Equipment`. Uses `troika-three-text@0.52.5` (MIT) and approved bundled fonts.

## When to use

- **Use for exact words and numbers in the 3D world:** wayfinding signage, control panels, dial captions, packaging, labels, measurement callouts and motion-tracked captions attached to objects. Generated-image model lettering often produces unreadable/incorrect characters; compose reviewed type as geometry instead.
- **Use HTML/SVG or the existing 2D renderer instead:** interface overlays, full-screen captions, numerically dense charts and math that do not need real 3D occlusion. Use actual modeled/extruded geometry if letters need metal depth, beveled sides or close-up physical contact shadows; Troika produces *flat SDF glyph quads*, not volumetric extrusions.
- Keep live/changing numbers out of baked textures; update `mesh.text`, call `mesh.sync`, and wait for completion before a capture. Prefer static labels for deterministic batch video output.

## Minimal implementation

```ts
import { createCraftTextLabel } from "./components/craft/text-label";

// The app bundles an approved/licensed font at this URL.
const label = createCraftTextLabel({
  schemaVersion: 1, id: "input-port", text: "INPUT 12V DC",
  fontUrl: "/assets/fonts/approved-label.ttf",
  fontSize: .18, at: [-.4, .25, .15],
  anchorX: "left", anchorY: "middle", color: 0xf2f2eb,
  outline: { width: .006, color: 0x101b25 },
});
scene.add(label.mesh);
await label.ready; // REQUIRED before starting deterministic capture/export
// existing Kumiki camera and MG1 evaluate the scene's absolute frame
// teardown: remove from scene, then label.dispose()
```

The text remains exact, selectable as a scene mesh and occluded by other geometry. Position and optional rotation use world units/radians; it composes with `craft-solid-cutouts` and other approved Kumiki materials/camera systems. `outline.width` is capped at one-quarter of the font size; font size is at most 20 and each text item at most 300 characters. Consumers own the font file and its license.

## Font and worker contract

1. **Supply a reviewed .ttf, .otf or .woff URL**. Troika does **not** support `.woff2` and defaults to fetching Roboto remotely if `font` is omitted; this adapter makes `fontUrl` mandatory.
2. For reproducible video production, bundle fonts on the same origin and ensure files and worker startup are available in the export renderer. Font files must allow the rendered content's commercial use; this component supplies no third-party fonts.
3. Troika can fetch *Unicode fallback fonts* from a public CDN if glyphs are absent. This adapter rejects non-ASCII text unless `unicodeFontsURL` is explicitly configured, but even ASCII characters unsupported by the supplied font can trigger a fallback. **Preflight glyph coverage and verify no unexpected network requests** in the isolated production runner. Self-host fallback data when needed.
4. `.ready` resolves after Troika's async SDF glyph layout has synced. The renderer is frame-driven, not continuous; request a redraw after ready (Storybook does this with `sceneRevision`). Wait for `ready` for every visible label before frame zero or a screenshot. Do not call `dispose` until exports are finished.
5. Use a per-project type/brand scale, high legibility contrast and scene-specific label hierarchy. No generative model should invent factual label text.

## Validation and QA

- `tests/craft-text-label.test.ts`: exact text and pose, async-ready lifecycle, font URL validation, Unicode fallback contract, bounded typography parameters (with a mocked SDF worker).
- `npm run typecheck`, focused ESLint, `registry:validate` (205 items), `catalog:check` (375 entries / 793 stories), `registry:smoke`, isolated `registry:fixture -- --item=craft-text-label` (compiled adapter and portable `.d.ts` shim), and `build-storybook` passed. The relevant five-file unit suite passed 29/29 tests. These are structural/build checks, not typography approval.
- GPU screenshots of both scenes at extreme angle/scale, 16:9 and 9:16, should verify sharp edges, outline thickness, material interaction, no font loading stalls and text layout before release. **Not visually approved** yet.

## Upstream

- [`troika-three-text`](https://github.com/protectwise/troika/tree/main/packages/troika-three-text), MIT, `0.52.5`, lightweight SDF text rendered in normal Three.js scenes.
- No vendored upstream source, no new scene renderer, no new animation clock.
