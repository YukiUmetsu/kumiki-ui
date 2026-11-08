# React Three Fiber: what it should change in our content

**Research:** 2026-11-08 · **Status:** Plan approved 2026-11-08. Nothing here is built yet. · **Builds on:** [25 — Three.js ecosystem research](25-threejs-ecosystem-quality-research.md), [14 — 3D visual fidelity](14-3d-visual-fidelity.md), [Fiber Stage](component-specs/fiber-stage.md), [30 — particles in practice](30-particles-in-practice.md)

## Where we are

Kumiki moved to React 19.3 so it could use React Three Fiber (R3F) 9.8. Three things use R3F today:

- `FiberStage`, which renders an R3F scene frame by frame for video export;
- `EnvironmentalEffectsFiber`, the particles;
- the nine particle moments.

The other 86 registry files that import `three` still drive Three.js directly. So far, R3F has bought us one new kind of content: particles. It has not yet improved how our 3D looks.

R3F does not draw better pixels by itself. It offers three things:

1. **Scenes made of parts.** A scene becomes a tree of reusable parts: a product, a light rig, a shadow, a callout. An agent puts them together, instead of writing imperative setup and teardown code each time.
2. **The pmndrs ecosystem.** That means drei, postprocessing, the GPU path tracer, Rapier physics and uikit. Each comes with a determinism and dependency cost, measured below.
3. **Loading through Suspense.** Models, textures and fonts finish loading before a frame counts as ready. This fits the frame handshake `FiberStage` already uses (`data-km-fiber-drawn`).

## The rule that decides everything: a frame must be a pure function of its number

Our exports jump to any frame in any order, and the result must match every time. Remotion's R3F wrapper follows the same rule: it re-renders only through `advance()`, and its docs say animation should come from the current frame, not from R3F's `useFrame` ([Remotion ThreeCanvas](https://www.remotion.dev/docs/three-canvas), grade A).

**What the R3F source shows.** We read `@react-three/fiber` 9.8.2 in `node_modules` (grade A). With `frameloop="never"`, `advance(timestamp)` sets `clock.elapsedTime` to that timestamp. It sets `delta` to the gap since the previous advance. `FiberStage` calls `advance(seconds)`. So:

- **Safe when you jump around:** anything computed from `clock.elapsedTime` alone.
- **Not safe:** anything that adds up `delta`, keeps history, or calls `Math.random()` when it mounts. Jumping back, or rendering in a fresh browser, gives a different picture.

**What the drei source shows.** We downloaded drei 10.7.9 with `npm pack` and searched it on 2026-11-08 (grade A).

| Component | What it does over time | Safe for export? |
|---|---|---|
| `Environment`, `Lightformer` (static), `ContactShadows`, `Outlines`, `Caustics`, `Splat`, `RenderTexture`, `MeshPortalMaterial` | Renders each frame from the scene's current state | Yes |
| `MeshTransmissionMaterial`, `MeshDistortMaterial`, `MeshWobbleMaterial` | Read `clock.elapsedTime` | Yes |
| `Float` | Starts from `Math.random() * 10000` when it mounts | **No.** Each run floats differently. Needs a seeded wrapper |
| `Sparkles`, `Stars` | Random sizes and positions when they mount | **No,** unless every value is passed in. We already have seeded particles |
| `Cloud` | Random seed, adds up `delta` for rotation, and **downloads a texture from `rawcdn.githack.com`** | **No** |
| `CameraShake`, `Bounds` | Add up `delta` (shake decay, camera fit animation) | **No.** Use our own framing and camera code |
| `AccumulativeShadows` | Jitters its lights with `Math.random()` while it converges | Only if it converges fully before frame 0. Seeded jitter is better |
| `Trail` | Keeps a history of positions | **No** |
| `Environment preset="…"` | Downloads HDRIs from a CDN. drei's docs say "not meant to be used in production environments" ([drei Environment](https://drei.docs.pmnd.rs/staging/environment), grade A) | **No.** Use local CC0 HDRIs from Poly Haven or ambientCG ([ASSET_SOURCING](ASSET_SOURCING.md)) |

`useAnimations` (glTF characters) updates its mixer with `delta`. For export, it must call `mixer.setTime(seconds)` instead. `hero-gltf.ts` already owns an `AnimationMixer`, and should keep that job.

**Conclusion.** drei is built for interactive, real-time pages, not for video you can scrub. We can adopt it one component at a time, behind wrappers that pass seeds and time in. We cannot adopt it wholesale.

## Dependency cost

| Package | Licence | Notes |
|---|---|---|
| `@react-three/drei` 10.7.9 | MIT | **21 runtime dependencies,** including `@mediapipe/tasks-vision` (webcam face tracking), `hls.js` (video streaming), `stats-gl`, `detect-gpu`, `camera-controls` and its own `three-mesh-bvh@^0.8.3`. We pin 0.9.7, so consumers would get two copies |
| `@react-three/postprocessing` 3.2.2 | MIT | Needs `postprocessing@^6.36` (Zlib) and `n8ao`. Doc 25 deferred it: `hero-render` already owns GTAO, depth of field and bloom |
| `@react-three/gpu-pathtracer` | MIT | Last push July 2025 ([repo](https://github.com/pmndrs/react-three-gpu-pathtracer), grade B). Doc 25 records the upstream tracer moving to WebGPU. Check that conflict before adopting it |
| `@theatre/core` | Apache-2.0. The editor, `@theatre/studio`, is AGPL-3.0 and dev-only ([repo](https://github.com/theatre-js/theatre), grade A) | Keyframe authoring. It overlaps our camera composition, and it is a second timeline |

Kumiki is a registry consumers install from source, and rule 7 asks for minimal dependencies. **We recommend not adding drei as a registry dependency.** Port the few techniques we need into small Kumiki components, with MIT attribution where we adapt drei code: a Lightformer environment, accumulative shadows with seeded jitter, and outlines. Each port is a few hundred lines on top of Three.js addons we already ship. **Owner decision:** port these pieces, or accept drei and its dependency tree.

## What R3F should let us make, ranked by visible gain

How the industry uses this, in short. The most common premium 3D-web pattern is a high-quality product that guides you through a story: an Awwwards-listed powerbank site walks through features as you scroll, built with R3F and Blender ([Awwwards](https://www.awwwards.com/sites/dopo-powerbank), grade B). The 2026 trend reports agree that realistic light and material are now expected, and that glass and reflections give depth ([Design Sensory](https://designsensory.com/?p=23752), [Videobolt](https://blog.videobolt.net/post/top-motion-graphics-trends-2026), grade C: vendor opinion). One counterpoint: the Trionn studio chose plain Three.js over R3F to keep direct control of one shared render loop ([Codrops](https://tympanus.net/codrops/2026/07/15/the-architecture-behind-trionn-coordinating-gsap-three-js-lenis-and-web-audio/), grade B). `FiberStage` already owns the loop, so that concern is met for export.

| Rank | Content upgrade | R3F technique | Why it matters for Kumiki | Gap today |
|---|---|---|---|---|
| **P0** | **Studio-lit product shots** | Environment built from Lightformers (soft boxes and strips rendered into the environment map), or a local HDRI | Metal, glass and coated plastic look premium only when they reflect something. This is the single biggest cue in product films | Only 2 registry files use `PMREMGenerator`, and none use `RoomEnvironment`. Most hero scenes have no reflections to show |
| **P0** | **Grounded objects** | Contact shadows for moving subjects. Accumulative soft shadows, converged once, for still shots | Floating objects read as fake straight away | Only `page-turn-book` and `depth-composite` have a shadow catcher |
| **P1** | **Point at a part** | Outlines or edges on a named part, plus a decal label or a 3D-anchored annotation placed in measured safe regions | Explainers need "this part does X". Ties into `semantic-callouts-three` and the [visual production contract](visual-production-contract.md) | Callouts exist; part-level outlines do not |
| **P1** | **Two views in one frame** | drei `View`: several scissored viewports on one canvas that share models and materials ([drei View](https://drei.docs.pmnd.rs/portals/view), grade A; [three.js forum](https://discourse.threejs.org/t/canvases-vs-views/55858), grade B) | Before and after, assembled and exploded, two angles. Fits our comparison stage | `artboard.tsx` is the only scissor user |
| **P1** | **Screens that show live UI** | `RenderTexture` or a HUD scene on a device screen | Product demos mix 3D devices with UI motion ([GarageFarm](https://garagefarm.net/blog/16-animation-trends-to-watch-in-2025-key-insights), grade C) | `screen-content-3d` exists: compare before building anything |
| **P1** | **Light through water and glass** | `Caustics` | The water-drop and ice scenes. Caustics are the cue the shader fake lacked | Shader caustics only |
| **P1** | **Walk into a world** | `MeshPortalMaterial` | Chapter transitions: step into a device or a picture. Use rarely, one per film | None |
| **P2** | **Captured real places** | Gaussian splats: drei `Splat`, or Spark (MIT, by World Labs, reads PLY/SPZ/SPLAT; [Spark docs](https://sparkjs.dev/docs/overview/), grade A) | You said the 3D waterfall and ice cave looked fake. A real capture is real. Each capture needs licence review per [ASSET_SOURCING](ASSET_SOURCING.md) | None |
| **P2** | **Path-traced hero stills** | GPU path tracer, with fixed `samples` and `bounces` | Photoreal stills for thumbnails and posters | Deferred in doc 25 |
| **P3** | **Physics** | Rapier, **baked offline** into keyframes and never stepped during export | Falls, collisions, stacking | `baked-physical-motion` already covers this. Only add it for scenes too complex to bake by hand |

**Not recommended:**

- porting the 86 imperative Three.js files to R3F for its own sake;
- driving any animation from `useFrame`;
- a second post-processing composer next to `hero-render`;
- Theatre.js as a second timeline;
- CDN presets;
- drei's `Float`, `Cloud`, `CameraShake`, `Bounds` or `Trail` without seeded, time-driven wrappers.

## What the best R3F and Three.js work teaches us

Researched 2026-11-08. We looked at:

- the official R3F examples gallery, about 150 entries, counting tags;
- a 2026 roundup of eight leading Three.js sites;
- Awwwards case studies;
- Codrops tutorials;
- Maxime Heckel's shader write-ups;
- Three.js Journey's baking lessons;
- Bruno Simon's portfolio rebuild.

The source grades are in the list at the end.

| # | What they do | Where we saw it | What we take from it |
|---|---|---|---|
| 1 | **Commit to one hard idea, and budget everything around it** | The 2026 roundup's main conclusion ([Utsubo](https://www.utsubo.com/blog/best-threejs-websites-2026)) | One hero technique per shot. This matches our rule of one hero visual. A Studio Product Shot is a light, a shadow and one highlighted part, not every effect at once |
| 2 | **One well-lit hero object carries the piece** | Lusion's Oryzo (a single coaster, real material response, a camera on scroll), Hubtown's glowing monolith, an R3F powerbank tour, an R3F jewellery site where one ring guides you through the story | Confirms the first slice. The product's light and materials matter more than scene count |
| 3 | **Light is mostly baked or comes from the environment, not from real-time lamps** | Three.js Journey bakes Blender's ray-traced light into textures and uses no lights at run time. The pmndrs examples lean on environment maps, soft shadows and caustics | Two light paths. **Products:** a Lightformer environment. **Static sets** (the cave, the waterfall): bake light in Blender through our existing Blender asset bridge. This is the realism fix for sets, alongside splats |
| 4 | **The recurring R3F toolkit** | Tag counts in the official gallery: post effects (bloom, depth of field, AO) about 11; glass, transmission and refraction about 10; portals about 8; scroll stories about 7; reflections and environments about 6; HTML annotations about 6; physics about 5; soft shadows with caustics several | Our ranking already covers glass, reflections, shadows, caustics and portals. **Add 3D-anchored annotations,** placed by our measured safe-region rules rather than free-floating HTML |
| 5 | **Portals and transitions are R3F's signature move** | Eight gallery examples: enter-portals, pass-through portals, magic box, aquarium, view tracking | Promote `MeshPortalMaterial` to a planned chapter transition, still at most one per film |
| 6 | **A story is a sequence of beats: entrance, hold, exit** | Shopify Editions turns a changelog into staged moments. A 13-scene scroll story ([Creative Dev Jobs](https://www.creativedevjobs.com/blog/best-threejs-portfolio-examples-2025)). "glTF animations tied to scroll" | In video, the timeline does what scroll does on a page. Each 3D beat gets an entrance, a hold long enough to read, and an exit, tied to frames like our existing camera beats |
| 7 | **Cheat carefully, and polish the cheat** | Heckel's caustics: render the object's normals from the light, refract, use the area change for brightness, clamp, then blur with per-channel offsets that alternate direction so stripes disappear. He admits the plane sizing sometimes cuts the pattern off ([Heckel](https://blog.maximeheckel.com/posts/caustics-in-webgl)) | For the water drop: caustics from the drop's own normals, animated by a time uniform. That's safe, since it reads elapsed time. Add a test that the pattern isn't clipped at the plane's edge |
| 8 | **Keep fast-changing values out of React state** | Codrops' 2026 product-grid tutorial: values that change every frame bypass React's render cycle and live in refs. Awwwards' Mat Voyce case study: "earlier integration of performance testing would have streamlined the process" | `FiberStage` passes the frame through context, so every child re-renders each frame. For heavy scenes, add a frame-subscription hook that writes to refs. Measure render cost per frame on the first slice, not at the end |
| 9 | **A model becomes a component with named parts** | `gltfjsx` turns a glTF into JSX, with nodes by name. `--transform` adds Draco, WebP, deduplication and instancing ([gltfjsx](https://github.com/pmndrs/gltfjsx)) | Export `product-hero` to glTF, generate a typed component whose part names match our semantic part IDs, and point `PartHighlight` at them. `gltfjsx` is a dev-time CLI only. **Trap:** drei's `useGLTF` loads its Draco decoder from a CDN by default, so we host decoders locally |
| 10 | **Configurators swap materials part by part** | The shoe and t-shirt configurators | The explainer version is a variant comparison: the same product in two finishes, side by side in `CompareViews` |
| 11 | **Top studios don't need R3F** | Oryzo (Lusion) and Cartier (Immersive Garden) are plain Three.js. Trionn kept direct loop control | Quality comes from art direction, light and material, not the framework. Don't port working imperative scenes just to use R3F |
| 12 | **WebGPU is arriving through TSL** | Bruno Simon's rebuilt portfolio runs on WebGPU when available, thanks to TSL. IVRESS writes TSL once and falls back to WebGL | Not now: export stays on WebGL. Write new shaders so a later TSL port is easy, and keep them small and isolated |

**In video specifically:** Remotion ships an official R3F template, `create-video --three`. Its rule is ours: animation comes from the frame, never from `useFrame` ([Remotion templates](https://www.remotion.dev/templates/three)). We found no confirmed premium launch film made with R3F through Remotion, so the craft lessons above come from interactive work.

## Video recipes this enables (owner approved, 2026-11-08)

Each recipe uses one hero technique, and every beat has an entrance, a hold and an exit.

| # | Recipe | Upgrades | Hero technique | Status |
|---|---|---|---|---|
| 1 | **Product Hero Turn**: a slow turn under studio light, a hold on the best angle, then one claim | new | Studio environment and ground shadow | planned, slice 1 |
| 2 | **Part Spotlight**: push in, outline one named part, dim the rest, add a pinned label | `guided-inspection`, `hidden-detail` | Part highlight | planned, slice 1 |
| 3 | **Exploded View**: parts slide apart along their axes, then reassemble | `layered-cutaway`, `build-and-connect` | Named parts | planned |
| 4 | **Finish Compare**: two finishes or versions side by side, cameras in sync | `side-by-side`, `before-after` | Compare views | planned |
| 5 | **Two-Angle Proof**: one moment from two cameras | `side-by-side` | Compare views | planned |
| 6 | **Light Through It**: caustics from a drop, glass or a lens | `the-drop` | Caustics | planned |
| 7 | **Step Inside**: a screen or frame becomes a window into a second world | chapter bridge | Portal | planned |
| 8 | **Screen Comes Alive**: push into a device, the UI performs, pull back | `demonstration` | Render to texture | planned |
| 9 | **Physics Point**: objects fall, stack or tip, baked ahead of time | `data-story`, `cause-effect` | Baked physics | planned |
| 10 | **Many Into One**: particles gather into the product's silhouette, then become the model | `nature-world-identity-reveal` | Particles and model | planned |
| 11 | **Real-Light Flythrough**: a set lit by baked light, with the camera moving forward | `environment-reveal` | Baked lighting | planned |
| 12 | **Captured Place**: a flight through a captured real location | `environment-reveal` | Gaussian splats | research spike |

## Suggested first slice: Studio Product Shot

One complete R3F component, following rule 1 (one component at a time, with all its states):

1. **`StudioEnvironment`.** A Lightformer rig (key softbox, two strip lights, a rim ring) rendered once into a PMREM environment, or a local CC0 HDRI. It comes with named presets (`softbox`, `strip`, `rim`, `dark-stage`), an exposure setting, and ACES Filmic tone mapping to match our other stages (`hero-viewer`, `nature-world-3d`). AgX is offered as a comparison, never a silent change.
2. **`GroundShadow`.** Contact shadows for moving subjects, and accumulative shadows with **seeded** jitter that converge before frame 0 for stills.
3. **`PartHighlight`.** An outline on a named part, tied to the semantic part IDs the Blender asset bridge already resolves (`semanticParts`). It hands off to the existing callouts for text, so the text stays in measured safe regions.
4. **`CompareViews`.** Two or four `View` panes sharing one product, for before and after or for angles.
5. **Guide data and a catalog entry,** like `PARTICLE_GUIDE`: the job, when to use it, when to avoid it, settings and review notes. Storybook gets **3D → Studio Product Shot** with one story per technique and a "choose a look" story. It uses an existing product model (`assets/models/product-hero`, exported to glTF).

**Gates:**

- the same frame renders identically after jumping forward and back, and in two fresh browsers;
- frame 0 shows in full-page default Chromium with a valid canvas alpha (per our WebGL review lesson);
- `npm run hero:quality`;
- close-up renders under two light presets;
- a clean registry install;
- **your visual review.** Code checks do not certify that it looks premium.

**Machine budget:** small drafts only, one browser, `nice`. No 4K.

## Decisions (owner, 2026-11-08)

1. **drei:** port the few techniques we need, with MIT attribution. Don't add drei as a registry dependency.
2. **First slice:** Studio Product Shot.
3. **Path tracing and Gaussian splats** stay research spikes until the first slice is approved.

**Changes to the first slice from the research above:**

- the product arrives as a glTF with named parts (lesson 9), and Draco decoders are hosted locally;
- per-frame values go into refs, and render cost is measured from the start (lesson 8);
- each beat has an entrance, a hold and an exit (lesson 6);
- one hero technique per story (lesson 1).

## Sources

**Grade A: official docs, or source we read ourselves.**
- `@react-three/fiber` 9.8.2 source (the `advance` and clock code).
- drei 10.7.9 package source.
- [Remotion ThreeCanvas](https://www.remotion.dev/docs/three-canvas).
- [R3F v9 migration guide](https://r3f.docs.pmnd.rs/tutorials/v9-migration-guide).
- drei docs: [index](https://drei.docs.pmnd.rs/getting-started/introduction), [Environment](https://drei.docs.pmnd.rs/staging/environment), [AccumulativeShadows](https://drei.docs.pmnd.rs/staging/accumulative-shadows) and [View](https://drei.docs.pmnd.rs/portals/view).
- [postprocessing ToneMapping](https://pmndrs.github.io/postprocessing/docs/enums/ToneMapping.html).
- [Spark docs](https://sparkjs.dev/docs/overview/).
- [Theatre.js repo](https://github.com/theatre-js/theatre).
- npm registry metadata for drei and @react-three/postprocessing.

**Grade B: practitioners and curated galleries.**
- [R3F examples gallery](https://r3f.docs.pmnd.rs/getting-started/examples) (official, counted by tag).
- [Utsubo: best Three.js websites 2026](https://www.utsubo.com/blog/best-threejs-websites-2026) (a vendor's curated list).
- [Maxime Heckel: caustics](https://blog.maximeheckel.com/posts/caustics-in-webgl) and [refraction](https://blog.maximeheckel.com/posts/refraction-dispersion-and-other-shader-light-effects/).
- [Codrops: scroll-driven image tube](https://tympanus.net/codrops/2026/02/17/reactive-depth-building-a-scroll-driven-3d-image-tube-with-react-three-fiber/) (Feb 2026; the product-grid tutorial was read through a summary).
- [Awwwards: Mat Voyce case study](https://www.awwwards.com/case-study-mat-voyce-designing-a-digital-home-for-a-kinetic-creative.html) and [Bruno Simon's portfolio case study](https://www.awwwards.com/brunos-portfolio-case-study.html).
- [Three.js Journey: baking and exporting](https://threejs-journey.com/lessons/baking-and-exporting-the-scene) (paid lesson, read from excerpts).
- [gltfjsx](https://github.com/pmndrs/gltfjsx) and [Remotion R3F template](https://www.remotion.dev/templates/three).
- [Codrops on Trionn](https://tympanus.net/codrops/2026/07/15/the-architecture-behind-trionn-coordinating-gsap-three-js-lenis-and-web-audio/).
- [Awwwards powerbank](https://www.awwwards.com/sites/dopo-powerbank).
- [three.js forum: canvases vs views](https://discourse.threejs.org/t/canvases-vs-views/55858).
- [react-three-gpu-pathtracer repo](https://github.com/pmndrs/react-three-gpu-pathtracer).

**Grade C: vendor trend opinion.**
- [Creative Dev Jobs roundup](https://www.creativedevjobs.com/blog/best-threejs-portfolio-examples-2025).
- [Design Sensory](https://designsensory.com/?p=23752).
- [Videobolt](https://blog.videobolt.net/post/top-motion-graphics-trends-2026).
- [GarageFarm](https://garagefarm.net/blog/16-animation-trends-to-watch-in-2025-key-insights).
