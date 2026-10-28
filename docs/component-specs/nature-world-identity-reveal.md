# Nature-World Identity Reveal Scene

`nature-world-identity-reveal` walks the camera forward through a forest, past
near trunks and ferns, into a clearing. A sun shaft through the canopy then finds a
caller-supplied mark standing there. Supply a
`SceneTemplateSpec<"nature-world-identity-reveal">`; the caller owns playback and
supplies `frame`.

**Causal beat.** *Input:* a forest view framed by near forms, with a clearing beyond
and a mark standing in its shade. *Transform:* one dolly camera walks forward, and every
depth plane follows from its z. Near forms grow fast and leave by their own edge,
uncovering the view they hid. The walk settles, then a sun shaft sweeps across the
clearing and lands on the mark. *Output:* the mark held lit and grounded, with its
optional wordmark and line.

**Beats.** `cueFrames` are *dock* (the walk settles), *reveal* (the shaft) and
*resolve* (the name).

- **Walk (0 → dock):** `dollyCameraAtFrame` runs a velocity profile that ramps up
  over the first eight frames and decays to rest at dock, so the move starts at once
  and arrives eased. A small vertical bob and half-rate roll scale with speed and stop
  at rest. Haze between the clearing and the forest thins with progress.
- **Hold (dock → reveal):** the clearing is still; the mark is a quiet silhouette in
  shade.
- **Reveal:** one idea, not a stack of effects. A soft volumetric shaft enters from the canopy
  (`light.x`), sweeps across the clearing onto the mark, and settles. As it lands the
  mark's exposure lifts, a rim of key light and a cast shadow appear, a short bloom
  decays, and a pool of light sits on the grass. Dust drifts inside the shaft.
- **Resolve:** `name` rises word by word (`KineticWords`, fitted with
  `fitLongestWord`), then `tagline`.

**Depth planes (generic, in `environment-parallax.ts`).** `DepthPlane` is a frame-0
screen rectangle plus a depth. `projectDepthPlane(plane, camera, vanishing)` returns
its rectangle for any camera with scale = depth / (depth − z). Positions spread from
the vanishing point by the same factor, plus optional truck and rise. Planes the camera
has passed report `visible: false`. The stage places the vanishing point on the mark,
so the walk heads for it. Defocus grows as a plane nears the lens, since the camera is
focused on the clearing. These helpers are pure and reusable by other recipes.

**Inputs.** All visible copy is input. The mark is always caller artwork.

| field | purpose |
|---|---|
| `environment` | far plate (the clearing), with intrinsic size |
| `layers` | `{ image, depth, x, y, height, flip?, portrait? }` cutouts with alpha; `portrait` overrides placement for tall outputs |
| `mark` | identity artwork (SVG or PNG with alpha), intrinsic size required |
| `placement` | ground contact point in the plate and mark height (fraction of plate height) |
| `treatment` | `"grounded"` (default: contact and cast shadow, thickness, rim) or `"graphic"` |
| `material` | `{ kind: "solid" \| "artwork", color?, thickness? }`; `solid` fills the silhouette with a lit material |
| `foreground` | procedural near-lens forms: `"foliage"` (default), `"rock"` or `"none"` |
| `light` | shaft entry `x` at the top edge and `color` |
| `walk` | `distance` 0.5–3 (default 1.7), `truck` −0.5–0.5, `bob` 0–1 |
| `haze`, `look` | atmosphere and film finish |
| `name`, `tagline` | optional wordmark and line |

**Honesty and limits.** This is 2.5D: separated depth planes, not a navigable
3D world. The near-tree cutouts are hand-masked, and their edges are hidden by
deliberate defocus. A close, sharp foreground would need cleaner mattes or real
geometry. The mark is lit by compositing (masked layers for thickness, rim, shade and
cast shadow), not by a renderer. Reduced motion holds the start of the walk, cuts to
the arrival at dock, drops the near forms and grain drift, and cuts the light in on
the reveal beat.

**Verification performed.** Storybook frames were checked in 16:9 and 9:16 at the start,
mid-pass of the front tree, the uncovered view, arrival, mid-reveal and the final hold,
and in reduced motion. The rendered-bounds pass was run, and its only report was the
name's masked pre-roll on its first frame, which is clipped by its mask. Targeted tests cover the
walk (moving by frame 8, near plane gone before arrival), plane projection,
reveal timing and reduced motion. Human review at normal speed remains open.

Storybook: **Video production / Scene Templates / Nature World Identity Reveal**. Demo
media are CC0 photographs from Wikimedia Commons:
[Clearing in the New Forest](https://commons.wikimedia.org/wiki/File:Clearing_in_the_New_Forest.jpg)
(GothicGolem29), trunk and fern cutouts from
[Verdant mossy trees](https://commons.wikimedia.org/wiki/File:Verdant_mossy_trees_(Unsplash).jpg)
(Matthew Murphy), and a hemlock branch keyed from
[Mist in the middle of the woods](https://commons.wikimedia.org/wiki/File:Mist_in_the_middle_of_the_woods_(Unsplash).jpg)
(Gabriel Santiago). The evergreen mark and the name "Alderwick" are original
placeholders, not a brand. The demo has no audio.
