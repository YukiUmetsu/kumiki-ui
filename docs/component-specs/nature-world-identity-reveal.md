# Nature-World Identity Reveal Scene

`nature-world-identity-reveal` glides a low camera through a dense jungle floor to a
caller-supplied mark that rises out of the foliage and catches the sun, then sets the
name and line. Supply a `SceneTemplateSpec<"nature-world-identity-reveal">`; the caller
owns playback and supplies `frame`.

**Two renderers.**

- **3D (primary).** The recipe provides `NatureWorldCanvas` (Three.js) through
  `NatureWorldRendererContext` whenever the spec has `scene3d`. The foundation stage never
  imports three. The real-time scene (`registry/video/stages/nature-world-3d.ts`) contains:
  - instanced CC0 scanned undergrowth (every mesh in each glTF is a variant, with seeded
    scale, yaw and tint)
  - procedural pleated fan palms and broad leaves with a painted vein texture
  - a bamboo grove and bark trunks
  - an HDRI for image-based light, plus a low warm back-sun with soft, alpha-tested leaf
    shadows and a frontal key on the mark
  - a leaf-translucency shader term and deterministic wind sway
  - additive sun shafts and pollen motes
  - post: depth-of-field from the depth buffer (alpha-tested leaves included), bloom, a warm
    grade and ACES tone mapping

  The camera, wind, motes and the mark are pure functions of the frame, and instances come
  from a seeded generator.
- **Depth planes (fallback).** Without `scene3d`, without the renderer slot, after a
  WebGL error, or under reduced motion, the 2.5D depth-plane walk described below renders
  (photographic plate, keyed cutouts, thin-lens focus pull, sun-shaft reveal).

**3D beats.** `cueFrames` are *dock* (the mark starts rising out of the foliage),
*reveal* (it has settled, turning so the sun runs across its face) and *resolve* (the
name). The glide ramps up within ~6 frames, holds a calm pace and eases to rest halfway
between *resolve* and the end, so the final composition holds still.

**`scene3d` inputs.**

| field | purpose |
|---|---|
| `undergrowth` | glTF plant models (each mesh is a variant) |
| `hdri` | equirectangular `.hdr` for image-based light and the soft background |
| `ground`, `bark` | ground (diffuse, normal, ARM) and trunk (diffuse, normal) textures |
| `sun` | `azimuth` (0 = behind the mark), `elevation` 2–60°, `warmth` 0–1, `intensity` 0.2–3 |
| `density`, `dof` | foliage density 0.3–2; depth-of-field strength 0–3 |
| `camera` | presets `"glide"` (default), `"low-glide"`, `"rise"` |
| `grade` | `saturation`, `warmth`, `exposure` |
| `leafTint`, `grove`, `seed`, `resolutionScale` | foliage tint, `"bamboo"`/`"trunks"`/`"none"`, scatter seed, drawing-buffer scale (default 1.5) |

The mark comes from `mark` (SVG, extruded with a bevel and a clearcoat PBR material) with
`material.color` / `material.thickness`. Name and tagline use the shared kinetic type.

**Depth-plane fallback.**

**Causal beat.** *Input:* a mid-ground hero plane (the palm in the demo), sharp, with the
clearing and its mark soft behind it. *Transform:* one dolly camera walks forward and
every depth plane follows from its z. The hero grows, slides out by its own edge and
dissolves at the lens, uncovering the path. Focus racks from the hero to the clearing,
which keeps approaching. The walk settles, then a sun shaft sweeps onto the mark.
*Output:* the mark held lit and grounded, with its optional wordmark and line.

**Beats.** `cueFrames` are *dock* (the walk settles), *reveal* (the shaft) and
*resolve* (the name).

- **Walk (0 → dock):** `dollyCameraAtFrame` ramps up over the first eight frames, holds a
  walking pace (speed ∝ 1 − s^2.2) and eases to rest at dock. The clearing plate is at
  `walk.environmentDepth`, so it visibly grows the whole way. A small bob and half-rate
  roll scale with speed.
- **Focus pull:** focus distance = lerp(`focus.from`, `focus.to`, eased rack) − z, where
  the rack runs over `focus.rack` (fractions of the walk). Every plane, including the
  far plate and the mark, is blurred by a thin-lens-like circle of confusion:
  `aperture × 3.2 × |1/focus − 1/distance|` em, capped at 2.4em. Near forms are therefore soft
  at the start and the hero is crisp; after the rack the clearing is crisp and anything
  still near is soft.
- **Pass:** a plane that grows past ~2.2× its frame-0 size dissolves by 3.6×
  (`passFade`), so nothing blooms into a frame-filling blur.
- **Reveal:** a soft volumetric shaft enters from the canopy (`light.x`), sweeps onto
  the mark and settles. The mark's exposure lifts, with rim light, a cast shadow, a short
  bloom and a light pool, and dust drifts in the shaft.
- **Resolve:** `name` rises word by word (`KineticWords`, `fitLongestWord`), then
  `tagline`.

**Depth planes and atmosphere.** Caller layers are frame-0 rectangles with a depth
(`projectDepthPlane` in `environment-parallax.ts`; scale = depth / (depth − z)). Each
layer also takes aerial perspective: a haze tint masked by the layer's own alpha, which
thins as the plane nears the lens, so a backlit silhouette sits in the air rather than
on top of it. A haze veil between the clearing and the forest thins with progress.

**Inputs.** All visible copy is input. The mark is always caller artwork.

| field | purpose |
|---|---|
| `environment` | the far plate, with intrinsic size |
| `layers` | `{ image, depth, x, y, height, flip?, portrait? }` alpha cutouts; must lie in front of the environment |
| `mark`, `placement` | identity artwork and its ground point / height in the plate |
| `treatment`, `material` | `"grounded"` (default) or `"graphic"`; `solid` or `artwork` finish |
| `foreground` | procedural near-lens forms: `"foliage"`, `"tropical"` (palm fronds), `"rock"` or `"none"` |
| `light` | shaft entry `x` and `color` |
| `walk` | `distance` 0.5–12 (default 1.7), `truck`, `bob`, `environmentDepth` (default 30, beyond the walk) |
| `focus` | `from` (default 6) and `to` (default the environment) focus depths, `rack` [start, end] fractions of the walk (default [0.4, 0.8]), `aperture` 0–3 (default 1; 0 = all sharp) |
| `haze`, `look` | atmosphere and film finish |
| `name`, `tagline` | optional wordmark and line |

**Demo layout.** The demo uses a jungle plate at depth 16 and a palm at depth 7.5, whole in frame
at frame 0 with its trunk running off the bottom. It adds a banana clump at 4.6, two fronds at
2.6 and 3.2 as soft near framing, and tropical near forms. The walk covers 6.5 over 168 frames,
with focus racking 7.5 → 16 between 40% and 80% of the walk at aperture 0.5.

**Honesty and limits.** This is 2.5D: separated, keyed photographic planes, not a
navigable 3D world. The palm is a backlit silhouette keyed from an evening-sky
photograph and placed in a daylight plate. Aerial-perspective tint and the
plate's bright opening make this plausible, but it is a composite. The circle of
confusion is a thin-lens-like model, not optical simulation. Reduced motion
holds the start of the walk with focus on the hero, cuts to the arrival (focus on the
clearing) at dock, drops near forms and grain drift, and cuts the light in on the reveal.

**Verification performed.** Storybook frames were checked in 16:9 and 9:16 at frame 0 (palm
fronds crisp and fully in frame), mid-approach, the pass, arrival, the mark reveal and the
final hold, plus reduced motion. The rendered-bounds check was clean on all of them.
Targeted tests cover the walk (moving by frame 8, near plane gone before arrival), plane
projection, the focus pull, reveal timing, reduced motion and validation. Human review at
normal speed remains open.

Storybook: **Video production / Scene Templates / Nature World Identity Reveal**. The 3D demo
uses Poly Haven CC0 assets: Calathea Orbifolia 01, Anthurium Botany 01 and Fern 02 (scans by
Rob Tuytel, models by Rico Cilliers), the Sunset Forest HDRI (Andreas Mischok), and the Forest
Leaves 02 and Bark Brown 02 textures (Rob Tuytel), about 12 MB in all. Storybook serves them
from `src/video/assets/nature3d` (a `staticDirs` entry). The fallback's media are CC0
photographs from Wikimedia Commons:
[Punta-Tuna-Beach-Jungle](https://commons.wikimedia.org/wiki/File:Punta-Tuna-Beach-Jungle.jpg)
(BrickLightning, plate). The palm is keyed from [Single tree 2](https://commons.wikimedia.org/wiki/File:Single_tree_2.jpg)
(Guru_Ethic), the banana leaves from [Banana leaf 123](https://commons.wikimedia.org/wiki/File:Banana_leaf_123.jpg)
(Angelogwologeorge), and the frond from [Fern lighting](https://commons.wikimedia.org/wiki/File:Fern_lighting.jpg)
(Shyamal). The evergreen mark and the name "Alderwick" are original placeholders, not a
brand. The demo has no audio.

**3D verification (2026-10-29).** Rendered in headless Chromium with SwiftShader (a GPU may
differ in shadow softness, anti-aliasing and speed). Frames at the start, mid-glide, the
mark's rise, its settle and the final hold were compared side by side with the nature-logo
reference in 16:9 and 9:16, over three iterations: scale and corridor, density and camera
height, light and the fan-palm lane. The rendered-bounds check on the name and line was clean. The
reference is a commercial template used only as visual reference; nothing from it is in the repository.

**Changes.** The 2026-10-29 jungle remake replaced the temperate clearing and moss/fern
cutouts. It added the thin-lens focus pull (`focus`), a longer walk range with a sustained
pace, a configurable `walk.environmentDepth`, `"tropical"` near forms and per-layer aerial
perspective. The coordinator's `passFade` pass dissolve is kept.
