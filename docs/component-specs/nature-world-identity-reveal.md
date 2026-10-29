# Nature-World Identity Reveal Scene

`nature-world-identity-reveal` walks the camera through a jungle toward a hero tree that
starts whole and in focus. The tree grows and passes the lens while focus racks to the
clearing beyond, then a sun shaft through the canopy finds a caller-supplied mark
standing there. Supply a `SceneTemplateSpec<"nature-world-identity-reveal">`; the caller
owns playback and supplies `frame`.

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

Storybook: **Video production / Scene Templates / Nature World Identity Reveal**. Demo
media are CC0 photographs from Wikimedia Commons:
[Punta-Tuna-Beach-Jungle](https://commons.wikimedia.org/wiki/File:Punta-Tuna-Beach-Jungle.jpg)
(BrickLightning, plate). The palm is keyed from [Single tree 2](https://commons.wikimedia.org/wiki/File:Single_tree_2.jpg)
(Guru_Ethic), the banana leaves from [Banana leaf 123](https://commons.wikimedia.org/wiki/File:Banana_leaf_123.jpg)
(Angelogwologeorge), and the frond from [Fern lighting](https://commons.wikimedia.org/wiki/File:Fern_lighting.jpg)
(Shyamal). The evergreen mark and the name "Alderwick" are original placeholders, not a
brand. The demo has no audio.

**Changes.** The 2026-10-29 jungle remake replaced the temperate clearing and moss/fern
cutouts. It added the thin-lens focus pull (`focus`), a longer walk range with a sustained
pace, a configurable `walk.environmentDepth`, `"tropical"` near forms and per-layer aerial
perspective. The coordinator's `passFade` pass dissolve is kept.
