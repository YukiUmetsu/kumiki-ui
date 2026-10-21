# EnvironmentalEffects (V09) — illustrative weather, moisture and dust

**Scope:** Reusable effect layers for rain, storms, blizzards, snow, hail, splashes, accumulating snow cover, dust, drips, condensation and stains, placed in regions and on surfaces taken from an asset. They are **always illustrative**: intensity is a visual density, not rainfall, humidity or a leak rate, and every frame says so.

## Install and inspect
- Registry items:
  - `environmental-effects` (plan, evaluator, `EnvironmentalEffectsSvg`);
  - `environmental-effects-three` (`createEnvironmentalEffectsThree`);
  - `domain-home-effects` (`houseEffects(layout, preset)`).
- Storybook: **House Math → Environmental Effects**.
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

## Limitations
- No collision with geometry: rain passes through roofs (choose regions accordingly), and drips fall straight to `floorY`.
- No light scattering or wet-surface shading; pair with AssetStateSequence (e.g. a `damaged` build) for lasting material changes.
- The look of the effects needs human review at final output sizes.
