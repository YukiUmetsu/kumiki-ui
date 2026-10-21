# SectionReveal (V02): look inside intact assemblies

**Scope:** Frame-addressed isolate, ghost and section views over any `InspectableAsset` ([V01](inspectable-asset.md)). `ExplodedView3D` moves parts apart, while SectionReveal never moves geometry. There is no renderer, clock or camera: one renderer-neutral plan, plus Three.js and SVG adapters.

## Install and inspect

- Registry items: `section-reveal` (neutral plan and SVG adapter) and `section-reveal-three`.
- Storybook: **House Math → Section Reveal**. *Modes* covers two houses, plus the unchanged bank and laptop, in four modes with target and plane presets, 16:9/9:16 and diagnostics. *Two D* covers three unrelated SVG illustrations.

## Minimal usage

~~~ts
const plan = compileSectionReveal({
  id: "front-cut", mode: "capped-section",
  targets: ["hvac"],                       // kept whole and unclipped
  plane: { normal: [0, 0, 1], offset: 1.2 }, // removes dot(n, p) > offset
  reveal: { startFrame: 10, endFrame: 58 },
}, inspectHouse3D(house));
const adapter = createSectionRevealThree(house);
// Per absolute frame, after the asset's own pose:
adapter.apply(evaluateSectionReveal(plan, frame));
~~~

## Contracts

- **Modes:**
  - `isolate`: everything except targets and `context` fades out.
  - `ghost`: everything else fades to `ghostOpacity` (default .14).
  - `section`: the plane sweeps in from just outside the asset (amount 0) to the authored offset (amount 1). Parts fully on the removed side disappear, straddling parts are clipped, and targets stay intact (`protectTargets`, default true).
  - `capped-section`: as `section`, and fills the cut faces of `clippable` parts.
- **Honest degradation.**
  - Asking for a section on an asset whose `capabilities.sectioning` is not `clip`/`preauthored-caps` reports `unsupported-mode` and uses `ghost`.
  - Caps on assets without pre-authored cut surfaces report `approximate-caps`.
  - Non-clippable parts that are cut report `uncapped-part`.
  - A plane that never crosses the asset reports `plane-misses-asset`.
  - A target with no geometry reports `empty-target`.
  - Unknown part IDs and invalid windows throw.
- **Deterministic:** `evaluateSectionReveal(plan, frame)` is pure. Part classification uses `getBounds(part, frame)`, so moving parts are judged at that frame. Bounds measure geometry regardless of current visibility, so a presentation layer cannot feed back into classification.
- **Three.js adapter:**
  - Each mesh belongs to its nearest named part; geometry no part owns follows `state.unowned`. Group visibility is never toggled, so a target nested in a faded assembly stays visible.
  - Clipping runs on material clones; shared materials are never mutated.
  - Caps use per-mesh stencil parity with the albedo of the real material (texture average × color). A multi-material mesh can name its interior material with `userData.sectionCapMaterial`. Requires `stencil: true` and `localClippingEnabled`; `HeroAssetViewer`, `CameraViewport3D` and the final-quality render target provide both.
- **SVG adapter:** `sectionRevealSvgOpacities(state, asset)` maps a frame to part opacities. SVG group opacity multiplies, so ancestors of targets stay opaque, each other branch fades once, and untagged art inside a kept ancestor is reported. 2D assets support isolate and ghost only.

## Limitations

- Caps assume closed, non-overlapping solids. Overlapping boxes (e.g. framing joints) can leave small cap gaps. Cut surfaces need human visual review.
- Pre-authored cut meshes (`preauthored-caps`) are not consumed yet: the mode is accepted, and caps still come from the stencil path.
- One plane per reveal. Compose two reveals for corner cuts.
