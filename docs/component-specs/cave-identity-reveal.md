# Cave Identity Reveal Scene

`CaveIdentityRevealScene` moves past caller-supplied rock layers into a cave plate, then
reveals an editable identity. Install `cave-identity-reveal` with `scene-template-foundation`.
The adapter adds no package dependency; the shared foundation currently transitively
includes Three.js for other paths, although this variant creates no WebGL canvas.

The component reuses `SceneTemplateSpec<"nature-world-identity-reveal">` and selects the
cinematic treatment. Public props are `spec`, absolute `frame`, `reducedMotion`, forwarded
DOM props/ref, `className` and `style`. The caller owns artwork, photography, copy, asset
sizes and rights references. See the [shared contract](nature-world-identity-reveal.md).

## Depth and customization

Set `walk.environmentDepth` beyond every layer. `layers` supply image intrinsic sizes,
depth, initial center/height and portrait overrides. Use `sway: 0` for rock. One camera
projects every layer with `depth / (depth - camera.z)` so near rocks pass the lens faster.
No camera bob/truck by default. Reduced motion shows the completed, stationary composition.

`--km-environment-exposure`, `--km-environment-saturation` and `--km-depth-layer-exposure`
customize the grade; `--km-identity-font` and `--km-identity-ink` customize copy.
`material.color`/`thickness` control the fixed shallow emblem relief. The name, mark and
line occupy separate bounded flex regions.

## Current example

Storybook: **Video production / Scene Templates / Cave Identity Reveal**. One 14-second
story, authored in 16:9 and 9:16, with seeking, playback and reduced-motion controls.
`kmExport=1` enables native-size export; `portrait=1` selects 1080×1920.

The supplied cave JPEG stays unchanged. Five alpha plates are pre-rendered from verified
CC0 Poly Haven **Rock Face 01**, **Rock Face 02** and **Rock Moss Set 01**, using the real
source geometry and 2K diffuse, normal and roughness maps. Six planes use depths 2.8, 3.2,
4.1, 5.6, 7.4 and 7.9 in front of the plate at 10.5. The deeper left outcrop and low ledge
sustain parallax after the closest wall passes. Every plane has portrait placement.

The rejected generated rock textures and hanging flowstone image were removed. Current
stone has broad fractured faces, visible strata, matte roughness and reduced micro-normal
strength. A neutral luminance grade removes blue/red mineral casts while retaining only
subdued existing green. Low indirect light, exposure 0.94/0.61 (plate/rocks), haze 0.06
and vignette 0.64 keep the chamber dark. Scene light is neutral `#bdc8bb`.

Regenerate the plates with `node scripts/render-cave-rocks.mjs`. Source URLs/checksums are
pinned in `scripts/cave-rock-sources.json`; model downloads stay in ignored
`.review/cave-rock-source`. Only the PNGs enter the demo. Structural geometry/UV/map
checks are recorded in `artifacts/cave-cinematic/rock-source-evidence.json`.

The original aperture emblem is editable. The local `cave-logo.mp4` reference informed
the entrance/chamber/payoff progression; its pixels, soundtrack and branded board are
not imported. This is silent photographic 2.5D, not a navigable 3D cave or volumetric
simulation. The original photo's redistribution rights are unverified; rock renders are
CC0 with provenance in `assets/THIRD_PARTY_ASSETS.json`. Neither is bundled in this
component's source install. Human cinematic acceptance remains open.

The accepted forest source, shared runtime and forest MP4 remain unchanged.
