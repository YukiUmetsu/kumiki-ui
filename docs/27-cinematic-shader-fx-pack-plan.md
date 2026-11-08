# Cinematic Shader FX Pack — implementation plan

**Research:** 2026-11-06 · **Status:** Built, through the release gate. Human review is pending. See the [component spec](component-specs/shader-fx.md) and the [verification report](verification/2026-11-06-shader-fx.md).  
**Goal:** optional, reusable, frame-addressable cinematic shaders for premium explainers, not a second animation/rendering engine.

## Decision and existing foundations

**Start with [Paper Shaders](https://github.com/paper-design/shaders)** (`@paper-design/shaders`, Apache-2.0), using its vanilla canvas runtime in a separately installable registry item. Its `speed=0` plus explicit `frame` control is unusually well aligned with deterministic video capture. Pin an exact version and retain `LICENSE`/`NOTICE` on redistribution. Treat the React wrapper as optional, not required. [API](https://shaders.paper.design/liquid-metal) · [repository license](https://github.com/paper-design/shaders/blob/main/LICENSE).

Current Kumiki baseline: React 19.3 (moved from 18.3 on 2026-11-07), `motion` 14, Three.js 0.186.1/WebGLRenderer, MG1 absolute-frame motion, 29 semantic scene recipes in the film path, `hero-render` (AO/DOF/bloom/supersampling), `material-kit`/`surface-detail`, glass, masks, `flow-path`, weather and 2.5D compositing. **Reuse these:** no replacement composer, second timeline, duplicate weather system, generic animated-background catalog or new scene grammar. The canonical standards are [08](08-motion-graphics.md), [11](11-rendering-quality.md), [13](13-content-creation-integrations.md), [23](23-cinematic-quality-upgrade-plan.md) and [25](25-threejs-ecosystem-quality-research.md).

## Demonstrated in Storybook

Open **Video production → Shader FX** and **Video production → Film Stage**. Every story was opened in Chromium on 2026-11-07: each shader layer reached `ready`, with no page errors.

| Plan item | Story |
|---|---|
| M2: each preset with a meaningful subject | `Mesh Gradient Chapter Card`, `Liquid Metal Mark`, `God Rays Environment Reveal`, `Grain Gradient Evidence`, `Water On A Photograph`, `Halftone Print`. Each puts its title in a safe band at the foot of the frame |
| M2: `subtle`, `standard` and `hero` | `Treatments Side By Side` shows the three on one subject |
| M2: 16:9 and 9:16, light and dark, long and CJK text | `Portrait`, `Long Japanese On Light`, `Long English`, and the `portrait` and `light` controls on `Effects` |
| Reduced motion | `Reduced Motion` holds the first frame |
| M3: effects inside real film scenes, an environment reveal, an evidence reveal and a chapter bridge | Film Stage → `Shader Effects In A Film` plays `where-water-begins.film.json`. All six effects appear in its scenes, plus a `grain-gradient` shader cut. A button jumps to each, and the cut frame shows three layers at once |

**How to use each effect well** is in **Video production → Shader FX Craft**: six designed pieces, each beside its most common misuse, and an 18-second `Title Sequence` that uses all six, one per shot, with sound cues. The written guide, with graded sources, is in the [component spec](component-specs/shader-fx.md#using-each-effect-well). How studios and brands use each effect, and the patterns that repeat, are in [doc 29](29-shader-fx-in-practice.md). Its strongest finding, that the effect should resolve into the subject, led to keyframed controls (`keys`) and three pattern pieces.

The halftone print first failed review: its white dots ran through the caption. That story now uses a stronger band behind the words. Human review of the look is still pending.

## Findings from implementation

These were checked against the code of `@paper-design/shaders` 0.0.82, or by a real render. They change the plan below.

| Plan said | Found | Result |
|---|---|---|
| `speed=0` plus `frame` gives seek control | True. `frame` is in **milliseconds**: `u_time = frame * 0.001` | `shaderFxTimeMs` converts rational FPS to milliseconds |
| "`seed` must govern any randomness, or a preset is rejected" | Paper has no seed input. The shaders are pure functions of time | A seed picks a moment of the effect. No preset was rejected |
| `water` and `halftone-dots` take a `maskAssetId` | They are **image filters**, and need a source picture | `image` is required on them, as an `ImageAsset` with rights |
| `maskAssetId` for a silhouette | A local `ImageAsset` with `licenseRef` already carries rights, and the export manifest checks it | `image` replaces `maskAssetId` |
| Generic `params: Record` | A union by `effect` gives real schema errors | Each effect has typed `params` and limits |
| Render to an offscreen surface, and composite | The mount draws on a canvas in the page, and the browser composites it | No offscreen pass was needed. Overlay edges looked clean in review |
| not stated | `god-rays` and `grain-gradient` need a noise texture that loads asynchronously, and a texture that is still loading throws | The adapter decodes every image first |
| not stated | **WebGL refuses an SVG image**, Paper only logs it, and the shader stays blank | The adapter rasterizes SVG sources |
| not stated | Canvas pixel ratio defaults to 2 | The adapter fixes it at 1, so capture size is the output size |
| `layer: "transition"` | `FilmTransition` already owns transitions, so the effect belongs there and not in a scene | Built as `fx` on a transition. Its opacity is a held bell, and reduced motion drops it |
| "Static first-frame fallback only when selected by the caller" | Kept | A `fallback` prop. Without it, failure is visible and an export stops |

**About React Three Fiber and shadergradient.** The owner asked about adding these directly. The evidence supported deferring them at the time: `@react-three/fiber` 9.8 requires React 19, and Kumiki was on 18.3. **Kumiki moved to React 19.3 on 2026-11-07, which removes that blocker**, and React Three Fiber is being added as an optional, frame-driven stage. `@shadergradient/react` still imports R3F, so one background would pull in a second Three.js host. `mesh-gradient` covers the same look. **`liquid-glass-js`** stays deferred: several unrelated packages use that name, and the ones reviewed are UI filters on a live backdrop, not frame-addressed effects. **liquid-logo** needs no adoption: it is an app built on Paper Shaders, and `liquid-metal` is its effect.

## P0 scope: six polished presets

| Registered preset (proposed) | Visual use and controls | Existing scene composition |
|---|---|---|
| `mesh-gradient` | Restrained organic color drift; 2–5 color stops, swirl, grain, intensity | Opening, chapter bridge, `data-story` backdrop |
| `liquid-metal` | Liquid chrome constrained to a local SVG/transparent-image silhouette; tint, contour, distortion | Title/object identity reveal; not fake PBR metal on 3D geometry |
| `god-rays` | Volumetric-looking directional shafts; origin, angle, falloff, amount | `environment-reveal`, `guided-inspection` |
| `grain-gradient` | Subtle atmospheric grain and tonal fields; palette, grain, scale | Documentary/evidence treatment, not legibility-critical text |
| `water` | Ripples/refraction as a bounded 2D visual layer; scale, frequency, distortion | Water explanation and transitional overlays; not 3D fluid simulation |
| `halftone-dots` | Measured print/diagram transition with mask, size and color | `evidence-reveal`, `before-after` |

`mesh-gradient` was the first vertical slice. All six passed the seek gate and an agent's frame review. Human review is pending. Provide editorial presets `subtle`, `standard`, `hero` with conservative default intensities. No effect should animate merely to fill an empty shot.

### API and adapter contract

The built contract is in [`registry/video/shader-fx.ts`](../registry/video/shader-fx.ts). The rules below were the design, and the findings above record where they changed.

- Compile a validated `ShaderFxSpec` into an optional renderer adapter; do **not** serialize GLSL, functions, foreign scene objects, arbitrary uniforms or network URLs. Use explicit per-effect prop schemas, limits, semantic palette tokens and immutable IDs.
- For a requested composition frame, derive absolute rational-FPS time and map it to the upstream `frame` control with `speed=0`; **verify units and seek behavior for every preset in the pinned version**. Shader state must not depend on `requestAnimationFrame`, wall time or prior capture order. `seed` must govern any randomness or a preset is rejected.
- Render to an explicitly sized offscreen RGBA surface, resolve readiness before capture, and composite in declared layer order/color space/alpha mode. Verify premultiplied alpha, mask edges, sRGB/linear conversion, DPR, cropping and aspect ratios. Preserve protected text/caption regions and 3D-depth rules; no default full-screen foreground glow.
- Own context creation/disposal, resize, WebGL context-loss recovery, bounded pixel count and per-shot canvas reuse. Do not mount six independent persistent GPU contexts in a production composition. If the runtime cannot supply deterministic transparency or capture, use a documented pre-rendered PNG-sequence bridge or fail with a named capability diagnostic.
- Keep the component optional in registry dependency closure. Explicit fallback: static first-frame/approved still **only when selected by the caller**; otherwise fail visibly. Support reduced motion and high-contrast readability.

## Delivery sequence and acceptance

The delivery state is in the [verification report](verification/2026-11-06-shader-fx.md).

1. **M0 — qualification:** pin a candidate Paper Shaders version, transitive dependency/license inventory; render an isolated `mesh-gradient` in Storybook and the existing export path. Measure GPU memory, WebGL contexts, startup and frame-render cost. Stop if alpha/capture or arbitrary seek cannot be made reliable.
2. **M1 — one complete reusable effect:** typed spec, registry item + API, offscreen lifecycle, named errors, first example, test fixture and reference screenshot. No hard-coded brand/content data.
3. **M2 — six presets:** composable masks, authoring controls and three restrained art-direction treatments; Storybook scenes with meaningful foreground subjects, 16:9 and 9:16, long/CJK text and light/dark backgrounds. Avoid shipping visually weak presets just to reach six.
4. **M3 — production integration:** connect to existing scene/cut/film payloads and capture pipeline; export actual clips featuring `environment-reveal`, `evidence-reveal` and a chapter bridge. Test multiple effects and actual 2D/3D layers together.
5. **Release gate:** shuffled seeks `[80,4,80,160,4]` agree with isolated frame captures, including masks and layers; repeated renders match within pinned-browser/GPU tolerances. Verify alpha edges, zero text overlap/flicker, no context leaks, clean registry install, bundle budget, performance, 16:9/9:16 and human-reviewed stills/video. Run `typecheck`, `catalog:check`, `registry:validate`, `registry:smoke` and relevant Storybook/video checks; record real outcomes rather than assumed passes.

**Out of scope for this branch:** particle solvers, fluid simulation, 3D PBR replacements, WebGPU-only engines, React Three Fiber conversion, external timeline editors, asset downloads, ContentGen workflow edits and shipping all research libraries.

## Investigated free libraries with commercial-use licenses

Only **free source/runtime options whose published licenses permit commercial use** appear below. A permissive code license does **not** grant rights to included sample imagery, fonts, demo models, user-uploaded animations or separately licensed editor/services. For source-distributed Kumiki, preserve required notices and verify the *exact package plus transitive dependencies* before adoption. This is a research log; [13](13-content-creation-integrations.md) is the authoritative dependency/license register.

| Source (direct GitHub link) | Published license | Potential Kumiki pack/value | Decision |
|---|---|---|---|
| [paper-design/shaders](https://github.com/paper-design/shaders) | Apache-2.0 + NOTICE | Frame-seekable liquid metal, gradient, god rays, grain, water, halftone | **P0 primary** |
| [pmndrs/drei-vanilla](https://github.com/pmndrs/drei-vanilla) | MIT | Caustics, clouds, contact shadows, sparkles in native Three | P1 lighting adapter |
| [pmndrs/meshline](https://github.com/pmndrs/meshline) | MIT | Curved tapered 3D signal/energy ribbons; extend `flow-path` | P1 separate pack |
| [Alchemist0823/three.quarks](https://github.com/Alchemist0823/three.quarks) | MIT | Sparks, dust, mesh emitters, object assembly and trails | P1; fixed-step bake required |
| [artcodev/three-fluid-fx](https://github.com/artcodev/three-fluid-fx) | MIT | 2D fluid ink, refraction, organic reveal masks | P1; simulation bake required |
| [FarazzShaikh/THREE-CustomShaderMaterial](https://github.com/FarazzShaikh/THREE-CustomShaderMaterial) | MIT | PBR-compatible hologram, dissolve, material scan | P1; protect existing material quality |
| [pmndrs/postprocessing](https://github.com/pmndrs/postprocessing) | Zlib | Selective finishing/grade beyond existing AO, DOF and bloom | Conditional; avoid composer duplication |
| [pixijs/filters](https://github.com/pixijs/filters) | MIT | 2D glow, displacement, color-map, CRT/print treatments | P2; Pixi v8 needs filters v6 |
| [tsparticles/tsparticles](https://github.com/tsparticles/tsparticles) | MIT | Confetti, background particles, diagram accents | P2; overlap with existing particles |
| [wrennly/shabon-fx](https://github.com/wrennly/shabon-fx) | MIT | 24 WebGL2 background shaders: aurora, fire, circuits, DNA | Experimental; young project/time integration |
| [PSCactux/webgl-shader-lab](https://github.com/PSCactux/webgl-shader-lab) | MIT | Portal, raymarching, glass, GPGPU and terrain effect examples | Experimental; technique study |
| [tigerabrodi/webgpu-vfx](https://github.com/tigerabrodi/webgpu-vfx) | MIT | GPU fire, smoke, shockwave, ribbon VFX | Defer; separate WebGPU backend |
| [ruucm/shadergradient](https://github.com/ruucm/shadergradient) | MIT | R3F 3D animated gradient backgrounds | Optional; Paper overlap/R3F dependency |
| [dashersw/liquid-glass-js](https://github.com/dashersw/liquid-glass-js) | MIT | Liquid-glass interface refraction | Defer; immature and UI-first |
| [shuding/liquid-glass](https://github.com/shuding/liquid-glass) | MIT | Lightweight SVG glass/displacement idea | Reference for overlay treatment |
| [Amir-Abushanab/liquid-glass-js](https://github.com/Amir-Abushanab/liquid-glass-js) | MIT | SVG-first lens and refraction components | Reference; UI-first |
| [Glass-HQ/liquid-glass](https://github.com/Glass-HQ/liquid-glass) | MIT | Material-map glass with SVG compositing | Defer; React 19/WebGPU requirements |
| [shader-art/shader-art](https://github.com/shader-art/shader-art) | MIT | Host for registered GLSL shaders | Reference only; no raw scene GLSL |
| [pmndrs/react-three-fiber](https://github.com/pmndrs/react-three-fiber) | MIT | Declarative optional Three authoring scenes | Defer; native Three host exists |
| [pmndrs/gltfjsx](https://github.com/pmndrs/gltfjsx) | MIT | GLB → R3F authoring component | Optional Blender asset workflow |
| [magicuidesign/magicui](https://github.com/magicuidesign/magicui) | MIT (free OSS code) | Animated beams, kinetic text, counters and reveals | Reuse patterns in existing motion packs |
| [airbnb/lottie-web](https://github.com/airbnb/lottie-web) | MIT | Frame-seekable imported vector animation | P2 import adapter; asset rights separate |
| [rive-app/rive-wasm](https://github.com/rive-app/rive-wasm) | MIT (runtime only) | 2D rig playback and gestures | P2; external files/editor terms separate |
| [rough-stuff/rough](https://github.com/rough-stuff/rough) | MIT | Seeded hand-drawn engineering diagrams | P2 optional sketch treatment |
| [penwell-app/draw-on](https://github.com/penwell-app/draw-on) | MIT | Scrubbable SVG path, fill and label reveals | Study; existing draw-on capability |
| [dimforge/rapier](https://github.com/dimforge/rapier) | Apache-2.0 | Collisions/impacts baked to frame-indexed tracks | P2 physics pack, not this PR |
| [motion-canvas/motion-canvas](https://github.com/motion-canvas/motion-canvas) | MIT | Code-authored vector explainer choreography | Reference; avoid second video engine |
| [theatre-js/theatre — core](https://github.com/theatre-js/theatre/tree/main/packages/core) | Apache-2.0 (`@theatre/core` only) | Author-exported camera/object curves → MG1 | Optional future; no bundled Studio |
| [stas4000/luminous-lake](https://github.com/stas4000/luminous-lake) | MIT | Water/wave light and environment reference | Reference only; WebGPU-first demo |

**Decision principle:** Prefer one thoroughly finished, visually inspected, fully seekable effect over ten impressive demos that flicker, leak GPU resources, obscure narration or cannot export. Re-review each candidate's pinned release and code/asset licenses before committing any dependency.
