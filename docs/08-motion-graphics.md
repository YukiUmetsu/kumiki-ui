# 08 — Professional 2D/3D Motion Graphics & Art Direction

**Status:** implementation specification; APIs below are illustrative, not shipped. **Purpose:** reusable, code-first visual components for premium static graphics, animated explainers, titles, diagrams, infographics, product reveals, and 2D/3D video scenes. **Read first:** [07 media foundation](07-media-foundation.md), [09 explainers](09-explainer-components.md), [10 character/audio](10-character-audio.md), [11 rendering/scene schema](11-rendering-quality.md), [12 infographics](12-infographic-system.md). **Ownership:** this file defines motion vocabulary, 3D component requirements, art direction, and adapter guidance. `11` owns serialized schemas, frame evaluation, export, and QA infrastructure; `07` owns the canonical registry inventory. Do not duplicate them.

## 1. Architectural invariants

1. **Kumiki is a component system, not a renderer or editor.** Publish independently installable, typed primitives, compositions, and motion presets. Scene documents contain declarative data; optional adapters translate them to browser/SVG/Canvas/Three.js/video backends. No executable shader source or functions inside untrusted scene JSON.
2. **One clock:** integer composition frames at rational FPS, end-exclusive clip ranges. `evaluate(frame, pinnedInputs)` yields the same semantic state in any seek order. Physics, particles, and skeletal animations require analytic time evaluation or deterministic baking. GPU pixels may vary between drivers; measure within declared tolerances on a pinned export stack.
3. **Identity before effects:** stable `id` for instances, `semanticId` across shots; preserve the object when its visual representation changes. A cut is preferable to a misleading morph.
4. **Separate 2D screen-space and 3D world-space:** 2D uses design pixels with top-left origin ([11]); 3D uses explicitly declared world units/axes. A camera/projection adapter maps world positions to screen anchors. Never treat pixels as meters or mix transform conventions implicitly.
5. **Premium = art direction, not an effect preset:** legibility, hierarchy, composition, material/lighting coherence, justified movement, and professional output fidelity. Decorative effects are opt-in and bounded.
6. **No heavyweight transitive dependencies:** no Three.js, 3D assets, FFmpeg, Remotion, or Motion Canvas in ordinary Kumiki UI or core 2D installation. Renderer-specific packages are optional peer dependencies loaded by adapters.

### Design grammar

| Principle | Operational rule | Reject |
|---|---|---|
| Staging | One dominant changing focal region per beat; supporting layers hold | Everything animates at once |
| Anticipation / follow-through | Bounded setup and secondary action; communicates mass or causality | Automatic bounce on every element |
| Overlap | Related motions overlap intentionally; establish key elements before details | Mechanical one-by-one reveals |
| Continuity | Preserve object identity, screen position, direction, camera logic | Teleporting objects between shots |
| Rhythm | `objective → establish → action → supporting action → readable hold → handoff` | Constant activity without rests |
| Spatial consistency | Camera, light, perspective, material scale follow one visual world | Inconsistent 3D perspective or lighting |
| Information integrity | Data/diagram relationships remain accurate during transitions | Beautiful but misleading transformations |

## 2. Canonical animation primitives

These descriptions must be renderer-neutral and type-safe; adapters implement the actual drawing.

| Primitive | Parameters | Required behavior |
|---|---|---|
| `tween` | Typed values, frame range, cubic/step easing | Pure interpolation; discrete cut at zero duration |
| `spring` | Mass/stiffness/damping or versioned preset | Closed-form or precomputed; stable at random-access frames |
| `stagger` | Ordered IDs, interval, direction, groups | Deterministic explicit order and overlaps |
| `sequence` / `parallel` | Child tracks, cue anchors, local time | Composable time scopes; no hidden delays |
| `hold` / `repeat` | Start/end, count, loop boundary | Explicit timing; no stateful playback dependency |
| `motion-path` | 2D/3D curve, parameterization, orient-to-tangent | Stable arc-length option, local/world conversion |
| `path-trim` | Path ID, normalized start/end, direction | Genuine vector stroke reveal, no source mutation |
| `shape-morph` | Path contours, correspondence/remap | Validate compatible topology, winding, holes; explicit fallback |
| `mask-reveal` | Clip/alpha/luma matte, transform, feather | Predictable compositing order; capability declaration |
| `transform-group` | Parent, pivot, children, local transforms | Matrix hierarchy, parent-before-child evaluation |
| `shared-element` | Semantic identity, source/target transform, handoff | Explicit two-shot visibility, continuity, collision policy |
| `property-track` | Target ID, typed property/keyframes, blend/priority | Duplicate writers error unless conflict resolution declared |
| `constraint` | Look-at, follow, distance/anchor, bounds | Resolved deterministically after authored transforms |
| `motion-preset` | Name/version + numeric parameters | Theme-overridable, no brand-specific hardcoding |

**Supported 2D values:** scalar, opacity, length, angle, vec2, affine transform, color (declared space), compatible gradients/paths, discrete text/visibility/asset changes. **3D additions:** vec3, quaternion/slerp rotation, scale3, transform matrix, material parameter, light intensity/color, camera lens/focus, morph-target weight, skeletal pose. Never interpolate arbitrary JSON or strings. Use shortest-arc rotation by default; provide full-turn mode. Animating font size must declare whether layout reflows or glyph geometry scales.

**Evaluation order:** asset/font resolution → responsive layout/geometry → named cue resolution → local timelines → authored tracks → rig/morph channels → constraints and parent transforms → camera/projection → effects/compositing → screen-space labels/captions. [11](11-rendering-quality.md) remains authoritative; propose any conflicting change there before implementation.

**Time rules:** named anchors (`querySpoken`, `objectLanded`) resolve to frames once. Keyframes are ordered and unique per property. Simulations use fixed seeds + a baked state/trajectory indexed by frame; do not advance `Math.random()`, physics, mixers, or shader time from wall-clock or `deltaTime` during frame export.

## 3. 2D motion graphics: reusable visual vocabulary

| Component | Capabilities | Quality guardrail |
|---|---|---|
| `kinetic-text` | Word/line/glyph-run reveal, tracking/weight axis, masked entrance, emphasis | Grapheme segmentation; stable measured baselines; CJK/RTL/ligatures |
| `vector-draw` | Bezier paths, trim/dash, arrow growth, topology-preserving morph | No fuzzy raster redraw of scalable vectors |
| `graphic-reveal` | Geometric masks, track mattes, wipes, cutouts, spotlight | Keep descenders, annotations, and essential data visible |
| `layout-transition` | Reflow, FLIP-like bounds interpolation, shared semantic anchors | No unexpected overlap; explicit responsive variant |
| `title-system` | Hero titles, lower thirds, section cards, title-to-diagram handoff | No arbitrary text-per-character cascade |
| `diagram-animation` | Node/edge entrance, data packets, graph layout morph, focused traversal | Preserve graph semantics, not just node pixels |
| `chart-animation` | Scale-aware bars, curves, annotations, ranked changes, state transitions | Interpolate valid data states; never fake axes |
| `graphic-emphasis` | Highlight strokes, zoom window, callout, annotation arrow | Reference real target bounds across frames |
| `procedural-2d` | Seeded patterns, particles, trails, noise, waveforms, generative lines | Deterministic state, budgeted density |

Use SVG/vector text where editability and geometry matter; use optional GPU 2D when particle density, shader effects, or repeated sprites justify it. Avoid inventing another chart, infographic, or diagram system: compose components from [09](09-explainer-components.md) and [12](12-infographic-system.md).

## 4. 3D: production component inventory

**3D is a first-class optional capability, not an implicit upgrade of every 2D item.** The scene exposes stable objects, cameras, lights, materials, and animation channels. All components have typed parameters, serializable state, explicit bounds, and a static fallback policy.

| Component | Inputs / responsibilities | Priority |
|---|---|---|
| `scene-3d` | World units, right-handed Y-up convention, background, renderer capabilities, asset namespace | P0 |
| `object-3d` / `group-3d` | Stable IDs, geometry/model ref, parent, position/quat/scale, visibility, layers | P0 |
| `geometry-3d` | Box, sphere, plane, cylinder, extrude, bevel, path/tube, procedural geometry | P0 |
| `model-3d` | glTF/GLB import, named mesh/rig/morph targets, material overrides, bounded load failure | P0 |
| `material-3d` | Unlit, toon, metallic-roughness PBR, transmissive/clearcoat where available | P0 |
| `lighting-rig` | Key/fill/rim, area-like studio look, environment/HDRI, shadow quality | P0 |
| `camera-rig-3d` | Perspective/orthographic, look-at, dolly, orbit, crane, track, cut, safe framing | P0 |
| `text-3d` | Screen-facing labels, SDF text on planes, optional extruded display titles | P1 |
| `product-stage` | Plinth/backdrop, grounding shadow, turntable, material reveal, detail shots | P1 |
| `exploded-view` | Assembly hierarchy, part offsets, labels/connectors, reversible reassembly | P1 |
| `path-3d` / `flow-3d` | Curves/tubes, animated flow, directional particles, graph navigation | P1 |
| `instance-field` | Repeated meshes with per-instance transforms/colors; LOD and batching | P1 |
| `particle-field-3d` | Emission/spawn, trails, velocity, deterministic seeded animation | P2 |
| `shader-surface` | Registered, parameterized materials: gradients, holographic, distort, dissolve | P2 |
| `volume-stage` | Fog, volumetric approximations, atmosphere; capability-dependent | P2 |
| `rig-animation-adapter` | glTF clips, skeleton/blend-shape evaluation at absolute time | P2; character semantics live in [10](10-character-audio.md) |

**Asset conventions:** make `.glb` the default interchange; support `.gltf` with validated referenced buffers/textures. External modeling and rigging belong in Blender or comparable tools; Kumiki loads and animates assets, not authoring meshes/UVs/rigs interactively. Reject missing meshes, incompatible extensions, malformed assets, unbounded polygon/texture sizes, and unsupported animation clips with targetable diagnostics. Optional DRACO/Meshopt geometry and KTX2 texture decoding are loader concerns; preserve hashes, provenance and commercial-use rights.

**Transforms:** document world unit scale, coordinate handedness, up axis, pivot, quaternion order, bounding box/sphere, parent mapping and camera projection. User-facing 3D components may offer convenient degrees; wire representations must explicitly declare angle units. `lookAt`/constraints require deterministic target resolution. No inferred screen-coordinate mapping for 3D objects.

### Visual techniques worth supporting

| Technique | Implementation approach | Editorial purpose |
|---|---|---|
| Layered/exploded systems | Part hierarchy + authored offsets + connected screen labels | Technical architecture, devices, assemblies |
| Geometry assembly | Groups of primitives appear/transform along stable paths | Explain how parts form a whole |
| Material transformation | Animate approved PBR parameters and reveal masks | Product finish, before/after, technical state |
| Camera inspection | Orbit/dolly/cut to named target and framing constraints | Reveal detail, scale and relationships |
| 3D infographic | Data-bound columns/points/paths with anchored 2D annotations | Convey spatial relationships, not fake extra dimension |
| 3D typography | SDF planes and optional extrusion with restrained lighting | Hero titles; not dense captions |
| Procedural structures | Curves, instancing, parametric surfaces, seeded fields | Networks, information flow, abstract transitions |
| Depth transitions | 2D foreground / 3D midground / image background with occlusion policy | Mixed-media motion design |
| Shader reveals | Precompiled dissolve, rim-light, fresnel, displacement presets | Selective emphasis, not ubiquitous glow |
| Rigged motion | Play/bake skeletal clips, morph targets, blend modes | Models and characters; see [10](10-character-audio.md) |

Avoid physically implausible styling unless explicitly requested; polished stylization is a conscious art-direction choice, not a physics bug.

## 5. Cinematography, materials, and light

| System | Required controls | Guardrail |
|---|---|---|
| Camera | Perspective/orthographic, FOV or focal length, near/far, target, framing, path, cut/hand-off, focus plane | No clipped subject or unreadable annotations |
| Lighting | Key/fill/rim/ambient/env, intensity/color, falloff, shadow bias/resolution | Cohesive direction, no floating objects/shadow acne |
| Materials | PBR roughness/metalness, color, normal/emissive maps, alpha, optional transmission/clearcoat | Physically coherent defaults; overrides explicit |
| Environment | Background and HDRI references, ground/contact shadow, optional reflection probes | Assets pinned and licensed; stable exposure |
| Color | Linear-light shading, explicit output color space/tone mapping, alpha premultiplication | No gamma shifts between still/video/2D/3D |
| Lens/post | Antialiasing, DOF, bloom, motion blur, fog, LUT/color grade | Effects off or minimal by default; legibility wins |

**Lighting presets** should be parameterized rigs (`studio-soft`, `product-rim`, `editorial-flat`, `technical-unlit`, `cinematic-low-key`) with controllable light ratios, shadow softness, exposure and environment. A preset must not silently change model material values. **Materials should be visually validated under both neutral and target lighting.** Add exposure/color swatches to golden fixtures to catch tone-mapping mismatches.

**Camera choreography:** establish → approach → inspect → track → reframe → resolve. Distinguish object motion from camera motion. An orthographic camera is usually better for diagrams; perspective for product form/depth. Keep screen-space caption/callout layers readable through camera moves; a world-anchored label needs an explicit occlusion rule (`hide`, `pin-to-edge`, `bring-forward`, `leader-line`) and safe bounds.

## 6. Hybrid 2D + 3D composition

- Composite 3D frames into the existing artboard as a **declared viewport/layer**, not arbitrary DOM screenshots. Respect placement, crop, aspect ratio, alpha, depth, z-order, output scale and color profile; support transparent-background renders where available.
- Expose **3D world anchors** projected to screen coordinates for 2D labels, arrows, highlights and captions. Track visibility/occlusion, clipping and offscreen anchor behavior; permit anchored annotations to follow models across shots.
- Pass rendered color/alpha and optional depth/object-ID buffers where the adapter supports them. Without depth/mattes, do not pretend 2D overlays can be correctly occluded by 3D geometry.
- Mixed scenes may use nested compositions; 3D and 2D evaluate against the same frame and named cues. Allow a 3D viewport inside a bento infographic, a product reveal behind kinetic text, or a model that hands off to a flat diagram.
- Shared-element 2D↔3D transitions require an **authored correspondence** (same semantic object, source/target anchors, screen projection, handoff range). Mesh morphing and SVG-path morphing are different operations; default to mask/dissolve if correspondence is invalid.
- Rasterized 3D content is not automatically editable SVG. Preserve source scene JSON and model references; label output formats honestly.

## 7. Physics, procedural motion, and simulation

- Prefer **authored animation** over live simulation for precise explanations and deterministic export. Optional physics engines (e.g. Rapier) may bake a fixed-step simulation to frame-indexed transform data; never rely on unsynchronized render-frame stepping.
- Particle state derives from stable seed + absolute frame or a baked cache. Bound particle count, emission duration, motion-blur samples, and compute/memory usage. Instancing/batching must not change the visual meaning.
- Custom shader code stays in **registered, reviewed adapter modules**; scene JSON references shader IDs and validated numeric/textural uniforms only. Track WebGL/WebGPU portability; missing shaders return explicit capability errors or approved still fallback.
- Cache geometry, textures, font metrics, env maps and rendered passes; dispose GPU resources on unmount. Handle WebGL context loss and renderer initialization failure without crashing the rest of Kumiki.

## 8. Rendering engines and adoption policy

**Use [13](13-content-creation-integrations.md) as the authoritative library/license matrix.** Select **Three.js + React Three Fiber** for optional scene-graph 3D, **Drei** for mature helpers, **glTF-Transform + meshoptimizer** for GLB preparation, and WebGL2-compatible **Postprocessing** for reviewed cinematic effects. For 2D, favor SVG/vector + **Paper.js** geometry; use **PixiJS** when sprites/particles or GPU effects exceed practical vector limits; **Motion Canvas** is an optional procedural explainer renderer. Do not ship all engines with every component.

**Selection rule:** choose by required geometry, editability, frame-addressable timing, transparent output, headless export, and maintained license. Do not run separate 2D/3D animation clocks. Bridge adapters with a resolved display list, camera projection, premultiplied-alpha policy, linear-light compositing where applicable, and explicit depth/occlusion of screen annotations.

**Renderer qualification:** test identical scene documents at shuffled frame positions; pin versions, fonts, GPU/browser stack; validate export parity and time-dependent shader controls. WebGPU + TSL is an explicit optional profile, not presumed equivalent to WebGL2 + EffectComposer. Remotion is an optional commercially licensed export route, not the default. Refer to [11](11-rendering-quality.md) for codec/export capability negotiation and [13](13-content-creation-integrations.md) for license gates.

## 9. Public authoring experience (illustrative)

The authoring API composes **semantic components**, while serialization uses validated per-kind payloads from [11](11-rendering-quality.md). Exact JSX syntax is not a wire contract.

```tsx
const shot = scene({ id: 'product-reveal', durationFrames: 150 }, [
  threeDViewport({ id: 'product', frame: [0, 0, 1920, 1080], alpha: true }, [
    lightingRig({ preset: 'studio-soft', intensity: 0.8 }),
    model3D({ id: 'device', semanticId: 'device', assetRef: 'device.glb',
      materialPreset: 'brushed-metal', rotation: [0, 0, 0] }),
    cameraRig3D({ id: 'cam', shot: 'dolly-in', targetId: 'device',
      fromFrame: 0, toFrame: 90 }),
  ]),
  kineticText({ id: 'headline', text: 'ENGINEERED TO CLARIFY',
    reveal: { kind: 'mask', startFrame: 35, durationFrames: 18 } }),
  screenAnnotation({ id: 'label', worldTarget: 'device/port',
    text: 'Precision connection', onOcclusion: 'pin-to-edge' }),
]);
```

**Required authoring features:** JSON/typed-prop round trip, configurable design tokens, preset override, asset replacement without remounting composition, per-component preview, named animation cues, 16:9/9:16 layout variants, static still, predictable missing-feature diagnostics. Do not create a full nonlinear editor unless consumers demonstrate demand.

## 10. Required schema/capability changes to coordinate with 07/11

**Do not silently mutate `11`'s v1 `Layer.transform`** (2D pixels) into a vec3. Before implementing P0 3D, implement and validate [11](11-rendering-quality.md)'s proposed v2 3D extension; it remains a proposal until fixtures, migrations and both adapters pass. Minimum extension requirements:

| Extension | Contract |
|---|---|
| `3d-viewport` layer | Screen-space placement, background/alpha, declared 3D scene reference, compositing order |
| `3d-scene` document/payload | World axis/units, camera, mesh/material/light IDs, object hierarchy, model refs |
| `3d-transform` | Vec3 position, quaternion rotation, scale3, pivot, local/world mode; distinct from 2D `Transform` |
| Typed animation tracks | `vec3`, `quat`, material/light/camera params, morph weights, named rig clips |
| Capability flags | `webgl2`, `webgpu`, `pbr`, `glb`, `depth-pass`, `gpu-particles`, `postfx:*`, `transparent-frame` |
| Asset manifest | GLB/GLTF, textures, HDRI, fonts and shader/preset identifiers, hashes, dependencies, licenses |
| Fallback and diagnostics | 3D required → explicit error if unsupported; optional decorative effects → caller-approved fallback + warning |

Use the versioned 3D viewport/scene payloads and schema migration rules in [11](11-rendering-quality.md). Never put raw Three.js instances, arbitrary functions, network fetches or executable shaders into portable scene data.

## 11. Production quality gates

Every component ships with **typed contract + validated payload + independently installable registry item + source scene fixture + Storybook/preview + export adapter example + negative tests + capability/license notes**. Tests must cover:

| Area | Verify |
|---|---|
| Determinism | Frames selected in shuffled order match ordered playback on pinned renderer; repeat under parallel export |
| Geometry | Pivot/parent transforms, camera projection, path normals, morph compatibility, object bounds |
| Assets | Broken GLB, missing textures/fonts, compressed assets, offline/no-network, rights metadata, fallback |
| 3D rendering | PBR material + shadows, alpha compositing, clipping planes, resolution/aspect, color management |
| Motion | No frame discontinuity at keyframes, loops, shared handoffs or camera cuts; declared fallback behaves correctly |
| Compositing | World-to-screen anchor position, 2D/3D occlusion, matte order, captions above/below intended layers |
| Legibility | Japanese/English/RTL fallback, title/label bounding boxes, caption safe regions, reduced-motion variant |
| Performance | Frame time, GPU memory, draw calls, triangle/texture budgets, context loss/disposal, peak export memory |
| Regression | Structural snapshots + selected-frame pixel diffs at fixed browser/GPU; tolerance documented |

**Golden reference productions (retain source, assets, expected frames, render report):**

1. **2D technical explainer, 30–60 seconds:** kinetic title → diagram reveal → camera/graphic focus → equation/code morph → conclusion; 16:9 and 9:16; captions remain readable.
2. **3D product film, 15–30 seconds:** GLB model, studio-lighting rig, turntable/dolly, two material states, exploded-view detail, grounded shadow, transparent overlay, title reveal.
3. **Hybrid infographic, 30–45 seconds:** data-bound 2D charts + 3D object, projected annotations, shared semantic handoff, narration cues, screen-space captions.

A production passes when it renders without manual patching at arbitrary frames; source documents remain editable; format variants are deliberately framed; failure diagnostics pinpoint IDs/frames; reference stills demonstrate **controlled premium art direction**, not just technical functionality. Compare with intentional design references through human review: automated QA cannot prove aesthetic quality.

## 12. Build sequence and stop conditions

| Slice | Implement | Stop condition |
|---|---|---|
| **MG1** | Typed 2D motion evaluator + masks/morph/shared elements + kinetic type | Complete deterministic 2D golden fixture |
| **MG2** | 3D schema extension + optional Three/R3F adapter + scene/model/material/light/camera | Branded-neutral 3D product still/turntable; 2D-only install unchanged |
| **MG3** | 2D↔3D composition, projected annotations, camera moves, GLB asset pipeline | Complete hybrid fixture with correct frame/alpha/label placement |
| **MG4** | PostFX, procedural geometry, optional particles, optional rig playback | Evidence-backed quality gain against frame/memory budgets |
| **MG5** | Remotion or other export adapter, multi-format golden tests, capabilities QA | Repeatable final video + still exports and explicit license review |

**Agent instruction:** inspect existing repository/components first; reuse documented scene, token, asset, registry and test conventions. Implement only the current slice; wire actual open-source libraries through isolated adapters. A 3D renderer, visual editor, procedural physics engine or duplicated infographic system is **not** a Kumiki primitive. Every added abstraction must enable at least two meaningfully different reference productions or remove measurable duplication. Prefer one excellent working component over ten placeholders.
