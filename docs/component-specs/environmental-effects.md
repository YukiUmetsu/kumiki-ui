# EnvironmentalEffects (V09) — illustrative weather, moisture and dust

**Scope:** Reusable effect layers for rain, storms, blizzards, snow, hail, splashes, accumulating snow cover, dust, drips, condensation and stains, placed in regions and on surfaces taken from an asset. They are **always illustrative**: intensity is a visual density, not rainfall, humidity or a leak rate, and every frame says so.

## Install and inspect
- Registry items:
  - `environmental-effects` (plan, evaluator, `EnvironmentalEffectsSvg`);
  - `environmental-effects-three` (`createEnvironmentalEffectsThree`);
  - `environmental-effects-fiber` (`EnvironmentalEffectsFiber`, a child of a [`FiberStage`](fiber-stage.md));
  - `domain-home-effects` (`houseEffects(layout, preset)`).
- Storybook: **House Math → Environmental Effects**, and **Video production → Particles** for the cinematic kinds.
  - In 3D: rain, a storm (gusting wind drives the rain nearly sideways), a blizzard, a snow day (roof and ground snow, then a snowman built ball by ball), hail, attic dust (roof lifted) and window condensation.
  - In 2D: a roof leak on the cross-section, with drips and a spreading ceiling stain, and the snow load on the section.
  - A reduced-motion toggle is included.

## Minimal usage
~~~ts
const plans = houseEffects(layout, "storm").map(compileEffect);
const fx = createEnvironmentalEffectsThree(plans); asset.group.add(fx.group);
// HeroAssetViewer onPose: (a, s) => { a.pose?.({ id: null, frame: 0 }); fx.update(s.frame, { reducedMotion }); }
<EnvironmentalEffectsSvg frames={plans.map(p => evaluateEffect(p, frame))} project={toSvg} unitScale={pxPerMeter} />;
~~~

## Contracts
- **Kinds and inputs.**
  - `rain`, `snow` and `dust` need a `region`. They wrap inside it, with `wind` drift.
  - `drips` need `sources` and a `floorY`. Drops form, swell, detach and fall.
  - `condensation` needs a `surface` (origin, `u`, `v`, size). Droplets nucleate, grow and occasionally run down.
  - `stain` needs a `surface`. It is a patch that spreads at a diminishing rate.
  - `hail` needs a `region` (and an optional `floorY`). Pellets fall fast, hop twice and settle, then recycle.
  - `splash` needs a ground `region`. It draws short-lived crowns where drops land.
  - **Cinematic kinds:**
    - `embers` need a `region`. Each rises over `life` frames, sways, shrinks, cools from white-hot to red and flickers out. Frames carry `heats`, which `heatColor()` maps to colour.
    - `sparks` need a `burst: { frame, origin, direction, spread, speed, gravity, drag, restitution, life }` and an optional `floorY`. One burst on one frame: each spark flies with drag and gravity in closed form, bounces once off the floor (the landing time is found by bisection on the exact path), streaks along its velocity, and cools as it dies.
    - `bokeh` needs a `region`. Large, faint discs that drift and breathe; put the region close to the camera.
    - `motes` need a `region` and usually a `beam: { origin, direction, angle }`. They drift and glint, and outside the beam's cone they all but vanish, as dust does out of the light.
    - `fireflies` need a `region`. They wander on smooth paths and blink in soft pulses, each on its own clock of `life` frames.
    - `assemble` needs `assemble: { targets, startFrame, endFrame, stagger, dissolve }`. One particle per target flies from a scattered point in `region` and holds; `dissolve` reverses it. `sampleShapeTargets(pixels, w, h, count)` reads targets from a silhouette.
    - `flow` needs `flow: { path, speed, spread }`. Particles stream along the path and fade at its ends. Density is approximate; label exact values.
  - `snow-cover` needs `cover: { surfaces, depth, buildFrames }`. Depth builds with an ease-out and persists; each surface is a noise-displaced sheet with tapered edges.
  - Options: `gust: { amount, period }` scales the wind with an exactly integrated cosine, so streaks lean with each gust and seeking stays exact; `streaks` draws snow with motion streaks; `scale` and `color` override size and color.
  - A missing input throws.
- **Determinism and bounds.** Each particle is a closed-form function of (seed, index, frame), with no simulation state. Seeking any frame in any order gives identical output (verified), and memory is fixed by the budget, capped at 4,000 (`budget-capped`). The Three.js buffers are sized once.
- **Honesty.** Every plan raises an `illustrative` info diagnostic, and every frame carries `illustrative: true` and a caption (default "<Kind> (illustrative, not measured)"). Dust motes and SVG drops are drawn larger than life so they read on screen; this is stated in the code and docs.
- **Reduced motion.** The default `static` freezes rain, snow, dust and drips at a representative frame; `hide` removes them. Persistent results, such as stains and condensation growth, keep their state, so the meaning survives.
- **Rendering.**
  - Three.js: rain is line segments with per-vertex alpha, snow and dust are soft round points, drips and condensation are instanced glossy droplets (flattened onto the surface), and stains are a noisy-edged decal.
  - Everything is tagged `inspectIgnore`.
  - SVG: rain strokes, dots and droplets with a legible minimum size. A surface seen edge-on (a ceiling in a section) draws as a soaked band.
- **Snowman.** `buildSnowman()` (`home-snow-3d`, in `domain-home-3d`) is a lumpy three-ball snowman with coal, a carrot, twig arms and a scarf; `setBuilt(k)` builds it bottom-up.
- **House presets.** `houseSnowSurfaces(layout)` gives both roof slopes on the shingle plane, out to the rake and eave tails, plus the site ground. The leak drips from the underside of the decking (the rafter tops) onto the attic insulation and stains the ceiling below. Window condensation sits on the actual lower-sash glass plane of the window model. Regions come from the layout's dimensions.

## The particle catalog

`PARTICLE_GUIDE` (`particle-guide.ts`) holds, for each kind, its jobs, what to use it for, what to avoid, settings, a catalog sound, how film work uses it, review questions and a countable ceiling. `compileEffect` reads it and adds diagnostics: `particle-job` (error: a job the kind does not suit), `particle-soup`, `particle-unmotivated`, `particle-sparks-linger`, `particle-shape-thin`, `particle-too-fast` (warnings) and `particle-approximate` (info). Each kind and each moment is a catalog entry of type `effect`: `npm run catalog:find -- --type=effect --query="<what the shot needs>"`.

`particle-moments` holds seven ready-made moments, each a pure builder (specs, camera move, text frame, sound cues) and a React component on a `FiberStage`: `MotesInTheLight`, `EmbersRising`, `SparksOnImpact`, `LensBokeh`, `FirefliesAtDusk`, `AssembleIntoMark` and `ParticleFlow`. Pick one by the beat in **Video production → Particle Moments → Choose Particles**. How film and studios use each kind, with sources, is in [doc 30](../30-particles-in-practice.md).

## Making particles look filmed

See **Video production → Particles**, where each piece states its use, what to avoid and its settings. The rules that repeat:

- **Explain the particles.** Motes appear only in a beam of light, embers rise from heat, sparks come from an impact. Particles with no cause read as a filter.
- **Layer depth.** A few large, faint bokeh discs near the camera, the main particles in the middle, and a slow `CameraMove` so near particles slide past faster. That parallax is what reads as depth.
- **Sparse and slow.** Two hundred embers, thirty fireflies, one burst of sparks. Density and speed carry most of the effect, and less looks more expensive.
- **Physical behaviour.** Embers rise, shrink and cool; sparks arc down, bounce once and die within about a second; fireflies blink out of step.
- **Light blooms.** Glowing kinds add to what is behind them and draw a small hot core inside a soft halo, so they read as light rather than dots.
- **Lock events to sound.** A spark burst marks an exact frame; put the hit sound's peak and a short flash of light on it.
- **Tie it together.** A grain finish over the whole shot makes particles and background read as one piece.

Sources: particle-template practice favours sparse, slow motion, layered defocused foreground discs over sharp background dust, and motion blur for fast particles ([Apple Motion: particle systems](https://help.apple.com/motion/mac/5.0/help/English/en/motion/usermanual/chapter_14_section_3.html), [Daz: depth and particle effects](https://blog.daz3d.com/rendering-with-depth-and-particle-effects-in-daz-studio/), [AI Designer: bokeh dust drift](https://www.aidesigner.ai/backgrounds/particle-drift)). These are tool documentation and vendor guidance, of moderate and low weight; the settings in Storybook are this library's own, chosen by rendering and comparing.

## Limitations
- No collision with geometry: rain passes through roofs (choose regions accordingly), and drips fall straight to `floorY`.
- No light scattering or wet-surface shading; pair with AssetStateSequence (e.g. a `damaged` build) for lasting material changes.
- The look of the effects needs human review at final output sizes.
- No collisions between particles, and no fluid or smoke volumes. A stateful simulation (for example three.quarks emitters) would need a fixed-step bake to seek exactly, so it is not included; the closed-form kinds cover dust, embers, sparks, bokeh and fireflies without one.
