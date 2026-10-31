# Nature-World Identity Reveal Scene

`nature-world-identity-reveal` glides a low camera through a dense jungle floor to a
caller-supplied mark that rises out of the foliage and catches the sun, then sets the
name and line. Supply a `SceneTemplateSpec<"nature-world-identity-reveal">`; the caller
owns playback and supplies `frame`.

**Two renderers.**

- **3D (optional).** The recipe provides `NatureWorldCanvas` (Three.js) through
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

**Causal beat.** *Input:* a near foreground plane (the elephant-ear leaf in the demo),
sharp, with the plate and its mark soft behind it. *Transform:* one dolly camera walks
forward and every depth plane follows from its z. The near plane grows and slides out by
its own edge, uncovering the layer behind it. Where `focus` is authored, focus racks from
the near plane to the plate, which keeps approaching. The walk settles, then a sun shaft
sweeps onto the mark. *Output:* the mark held lit and grounded, with its optional wordmark
and line.

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

**Demo layout.** One supplied rainforest photograph is graded into the deep plate at depth 10.
Six AI-derived alpha cutouts matched to that same photograph sit in front of it: a mossy trunk
with epiphytes at 7.8, mirrored fern clusters at 6.4 (left) and 5.7 (right), a sapling at 5.0,
a foreground elephant-ear leaf at 3.8 and an overhead canopy branch at 2.8. The trunk and the
branch are rigid (`sway: 0`); the ferns sway 0.35–0.45 and the sapling 0.25. The walk covers
4.3 depth units with no truck or bob, so the leaf passes the lens first and uncovers the
sapling behind it.

**One photograph, one look.** Every plane derives from the same supplied photograph: the plate
is the cleaned frame, and each cutout is a reconstructed element re-lit and re-grained to match
it. Because the plate is complete behind every cutout, the push-in reveal always lands on
matching foliage rather than an inpainted seam.

**Honesty and limits.** This is 2.5D: separated, keyed photographic planes, not a
navigable 3D world. The cutouts are generative reconstructions of a supplied photograph, not
pixel extractions, and the light is a painted grade rather than an optical simulation. The
circle of confusion is a thin-lens-like model. Reduced motion renders the final camera and the
complete lockup immediately.

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
from `src/video/assets/nature3d` (a `staticDirs` entry), though no Storybook story currently
sets `scene3d`. The 2.5D demo's deep plate (`nature-jungle-clean-depth.png`) and its six depth
cutouts derive from a supplied rainforest photograph whose redistribution rights are
unverified, so all seven are local demo assets excluded from the installable pack; provenance
is recorded in `assets/THIRD_PARTY_ASSETS.json`. The evergreen mark and the name "Alderwick"
are original placeholders, not a brand. The forest preview's audio is credited below.

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

**2026-10-30: photographic depth planes replace the cutout corridor.** The palm, banana and
frond cutouts, the unused plate-composite pipeline (`build-nature-world-plate.py`,
`render-nature-plants.mjs`) and its intermediate renders were removed. The demo now uses one
supplied photograph with AI-derived depth cutouts; the sections below describe it.

## Current photographic demo — 2026-10-29

The original supplied JPEG remains unchanged in the repository. The current Storybook
shot uses two AI-derived assets: `nature-jungle-clean-depth.png` (1678×937, with the two
foreground elephant-ear leaves removed and the understory filled) and
`nature-elephant-ear-depth.png` (1024×1536, one reconstructed leaf with transparent alpha).
The edits retain the reference composition but are not exact pixel extraction.
They replace the prior single-plane demo; older implementation notes above describe the
optional grounded and Three.js paths, which remain available.

Set `content.treatment: "cinematic"` for the photographic title sequence. It uses
`environment`, `layers`, `walk`, `mark`, `name`, `tagline`, `light`, `haze` and `look`.
`scene3d`, grounded `placement`, material extrusion and `focus` are not used by this treatment.

One `dollyCameraAtFrame` drives the distant plate and every `NatureDepthLayer` using
`projectDepthPlane`. The demo travels 4.3 depth units toward a plate at depth 10 and a
leaf at depth 3.8. The plate grows from 1.035× to about 1.82×; the near leaf grows and
exits the frame by perspective rather than fading away. A distance-based softening
and slight stem-anchored flex support the near-lens passage. `walk.truck` and speed-linked
`walk.bob` add small lateral travel and footstep sway. Defaults are distance 4, background
depth 10, truck 0 and bob 0. `layers[].portrait` authors the tall composition.

At 24 fps the 14-second demo uses cue frames [120, 156, 204]. The canopy light builds
before the emblem at frames 156–198, the name follows at 204–242, and the line at
228–262. Camera, atmosphere and grain settle at frame 288 for the final two-second hold.
All state derives from the absolute frame. Reduced motion renders the final camera and
complete lockup immediately, with the near leaf already passed.

The bounded flex lockup keeps mark, title, rule and tagline in separate regions. Long
Latin and CJK copy wraps. `--km-identity-font` and `--km-identity-ink` customize the family
and ink; the family prefers Newsreader with Georgia fallback. This is a silent 2.5D
composition, not a navigable scene or simulated leaf deformation.

The supplied image and derivatives have unverified underlying redistribution rights;
they are local demo assets and excluded from the installable component pack.
Verification: [photographic report](../verification/2026-10-29-nature-cinematic.md).
Human normal-speed acceptance remains open.


### Layered corridor revision

The demo now surrounds the foreground elephant-ear leaf with four additional projected
planes: an overhead leafy branch at depth 2.8, right fern cluster at 5.7, smaller mirrored
left fern cluster at 6.4, and a mossy trunk with attached epiphytes at 7.8. The distant
plate remains at depth 10. Each uses the same camera; pass speeds come from depth rather
than separate animation clocks. Portrait placements are explicitly authored.

`NatureDepthLayer.sway` optionally controls cinematic flex from 0 to 1 (default 1).
Set 0 for rigid objects; the demo trunk and overhead branch use 0. The ferns use 0.35–0.45.
All three added PNG assets are AI-generated photographic cutouts matched to the user's
reference, with alpha transparency and provenance in `THIRD_PARTY_ASSETS.json`.
They remain local demo assets with unverified underlying reference redistribution rights.


### Stable dolly and shallow identity relief

The demo now sets `walk.truck: 0` and `walk.bob: 0`; these are also the cinematic defaults.
The forward depth projection is unchanged, with no camera roll or lateral oscillation.
A sapling at depth 5 sits immediately behind the large foreground leaf at depth 3.8,
so the leaf passes first and uncovers connected smaller foliage. `nature-sapling-depth.png`
is an AI-generated photographic alpha cutout matched to the reference, documented in the
asset manifest under the same local-only rights restrictions.

The cinematic emblem now uses a shallow 2.5D relief: sixteen silhouette slices behind a
front face, perspective projection, shaded sidewall, warm ivory face and canopy-facing
rim. `material.color` and `material.thickness` customize the finish/depth. The turn moves
from −44° to −16° yaw and 12° to 6° pitch over 104 frames after the reveal cue, then holds.
Reduced motion shows the final orientation immediately. Optical fade/blur is outside the
perspective group so it does not flatten the individual relief planes. This is a layered
mask treatment, not a PBR mesh, physical bevel, or real 3D render. The name remains flat
in its protected text lane.


### Quiet identity and rainforest audio

The cinematic emblem is now stationary at −8° yaw with no pitch, scale-in, blur or swivel;
its opacity is lifted by the reveal cue. Shallow relief remains, with separate foreground
and text geometry. The mark wrapper explicitly owns positioning so its absolute mask
planes cannot escape into the name lane. Prior turning-logo notes above describe superseded
iterations.

The forest preview now plays `nature-jungle-ambience.wav`: a 14-second edit of ezwa's
public-domain [Walk in the rainforest](https://commons.wikimedia.org/wiki/File:Walk_in_the_rainforest.ogg),
recorded in Guadeloupe. The source identifies rainforest birds. Sound on/off, play, pause,
restart, seeking and reduced motion are handled by the shared Storybook shell; media is
kept outside the frame-only library renderer. An audio load or autoplay failure reports
an actionable error. The export receives the same WAV through `--audio`; scene capture
stays deterministic. The original source was mono; two output channels do not imply a
spatial field recording. Human audio acceptance remains open.

Photographic grade variables are `--km-environment-exposure`, `--km-environment-saturation`
and `--km-depth-layer-exposure`. See also the registered [cave variant](cave-identity-reveal.md).
