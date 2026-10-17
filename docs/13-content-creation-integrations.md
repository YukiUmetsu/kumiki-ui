# 13 — Content Creation Engines, Licensing & Adapter Decisions

**Status:** proposed integration policy, not installed-package inventory. **Read:** [07 foundation](07-media-foundation.md), [08 motion](08-motion-graphics.md), [09 explainers](09-explainer-components.md), [10 characters/audio](10-character-audio.md), [11 rendering](11-rendering-quality.md), [12 infographics](12-infographic-system.md). **This is the sole library and license decision register.** As of **2026-10-17**; check exact published package/version, source files, transitive dependencies, platform and license before release. This document is engineering guidance, not legal advice.

## 1. Dependency doctrine

1. **Core is data-only:** tokens, authoring schemas, typed composition/timeline evaluator, primitive geometry and no engine dependency required for ordinary UI. Renderer-specific packages are separately installable registry adapters with explicit peers. No direct engine objects in scene JSON.
2. **Reuse engines; own semantics:** import layout, geometry, asset optimization, compositing and codecs where useful; Kumiki owns stable IDs, pedagogical structure, art direction, capability negotiation, frame evaluation and QA.
3. **Production output beats demos:** admit a dependency only after proof of headless/static/video export, deterministic random seek or pre-bake, font and alpha fidelity, stable error handling, acceptable footprint and legal redistribution.
4. **One clock:** animations are evaluated from `{frame, fps:{num,den}}`, not `requestAnimationFrame`, real-time mixers, `deltaTime`, audio playback, or live physics. Stateful systems bake caches with fixed seeds and solver/version metadata.
5. **No one-engine mandate:** choose per scene; compose offscreen passes under a defined alpha, working-color and timestamp policy. Preview/export must use documented feature parity or an explicit error.
6. **Security and rights:** reject runnable scripts, dynamic shader source, remote URLs and unapproved assets in untrusted scene data. Track rights for font, model, music, voice, texture, HDRI, shader and source data independently of library license.

## 2. Preferred stack — explicit adapter boundaries

### Implemented development adapter: camera preview (2026-10-17)

The user requested 3D camera moves and a dedicated storyboard camera page while deferring expanded
testing. `camera-rig-3d` authors plain numeric MG1 channels without importing an engine;
`camera-viewport-3d` is the isolated Three.js perspective rendering boundary. Direct Three.js is
used for this camera-only increment; adding the R3F reconciler and Drei helpers is deferred until
the reusable scene-graph/model components need them. The general preferred 3D stack below remains.

- Installed **three 0.186.1** and **@types/three 0.186.0**, exact development dependencies in this
  showcase, locked in `package-lock.json`. Registry adapter declares both package names; clean
  fixture tooling resolves the lockfile versions. Consumers should pin these versions too.
- Verified installed `node_modules/three/LICENSE` and `node_modules/@types/three/LICENSE`: MIT;
  retain upstream copyright/permission notices when redistributing. Three's installed package has
  no runtime dependencies. Type declarations have their own build-time dependency tree.
- Three.js is imported only by the adapter and a lazy-loaded 3D demo. 2D/UI registry items have no
  dependency on the adapter or Three.js. The camera math module remains engine-independent.
- WebGL2, sRGB output, ACES tone mapping, bounded pixel ratio, explicit near/far, deterministic
  absolute-frame object updates, context-loss recovery, consumer scene disposal. No animation loop,
  arbitrary shader strings, model downloads or external assets.
- Prototype qualification: TypeScript and production build only. GPU/visual/performance/export and
  clean-install qualification deferred. No full v2 scene serialization or video parity is claimed.
  The procedural sculpture is a demonstration of camera movement, not the MG2 production milestone.

The `exploded-view` development adapter reuses these pinned Three.js packages, including the bundled
`RoundedBoxGeometry` addon in its procedural demo. It adds no external engine/assets. Assembly
hierarchy and numeric tracks stay in a pure TS module; part factories, matrix conversion, geometric
raycasting and projection stay inside the optional Three.js boundary. Geometric occlusion is an
explicit preview policy, not a pixel-accurate alpha/depth-compositing qualification.

References: [Three.js license](https://github.com/mrdoob/three.js/blob/dev/LICENSE),
[camera documentation](https://threejs.org/docs/#PerspectiveCamera),
[renderer documentation](https://threejs.org/docs/#WebGLRenderer).

| Capability | Library / repository | Reported license* | Integration decision |
|---|---|---|---|
| Declarative 3D | [Three.js](https://github.com/mrdoob/three.js), [React Three Fiber](https://github.com/pmndrs/react-three-fiber), [Drei](https://github.com/pmndrs/drei) | MIT | **P0 3D adapter**: world graph, PBR, cameras, GLB, lights, helpers; absent from 2D core |
| 3D postFX | [postprocessing](https://github.com/pmndrs/postprocessing), [react-postprocessing](https://github.com/pmndrs/react-postprocessing) | Zlib; MIT | Optional **WebGL2** effect stack; bloom/DoF/LUT only when motivated; separate WebGPU chain |
| 3D asset pipeline | [glTF-Transform](https://github.com/donmccurdy/glTF-Transform), [meshoptimizer](https://github.com/zeux/meshoptimizer) | MIT; MIT | Offline/import-time optimize/inspect GLB; preserve animation, materials, names and provenance |
| 2D scene animation | [Motion Canvas](https://github.com/motion-canvas/motion-canvas) | MIT | **P0 2D export candidate** for narration-led vector scenes; separate graph interpreter |
| GPU 2D | [PixiJS](https://github.com/pixijs/pixijs) | MIT | P1 dense sprite/particle/gradient scenes; test GPU/headless capture and alpha |
| Vector modeling | [Paper.js](https://github.com/paperjs/paper.js), [SVG.js](https://github.com/svgdotjs/svg.js) | MIT; MIT | P0 path geometry and transforms; don't add both unless the second unlocks proven requirements |
| Web motion | [Motion](https://github.com/motiondivision/motion), [Anime.js](https://github.com/juliangarnier/anime) | MIT; MIT | Optional authoring/preview utilities; **not** the canonical offline clock |
| Data geometry | [D3](https://github.com/d3/d3), [d3-sankey](https://github.com/d3/d3-sankey) | ISC | P0 scales/curves/layout geometry; output remains semantic |
| Graph layout | [ELK.js](https://github.com/kieler/elkjs) | EPL-2.0 OR GPL-3.0-or-later | Optional graph layout under **EPL-2.0** path; document obligations, pin algorithm/version |
| Charts | [ECharts](https://github.com/apache/echarts), [Observable Plot](https://github.com/observablehq/plot), [Vega](https://github.com/vega/vega) | Apache-2.0; ISC; BSD-3-Clause | Optional import/render bridges; do not own canonical chart schema |
| Diagram input | [Mermaid](https://github.com/mermaid-js/mermaid) | MIT | Import graph semantics, not raw SVG playback as editable nodes |
| Code typography | [Shiki](https://github.com/shikijs/shiki) | MIT | P0 syntax tokens with pinned grammar/theme, semantic code diff separate |
| Mathematics | [KaTeX](https://github.com/KaTeX/KaTeX) | MIT | P0 equations; term-ID correspondence and fixed export metrics |
| Sketch illustration | [Rough.js](https://github.com/rough-stuff/rough) | MIT | P1 seeded drawn style as optional art-direction adapter |
| 2D character | [Rive runtimes](https://github.com/rive-app/rive-runtime) | MIT (runtime) | P1 rig playback only; **editor, assets, authoring and redistribution rights separate** |
| 3D character | [three-vrm](https://github.com/pixiv/three-vrm) | MIT | P2 optional VRM animation; rig/model assets have separate usage permissions |
| Speech preprocessing | [Rhubarb Lip Sync](https://github.com/DanielSWolf/rhubarb-lip-sync) | MIT | P1 external audio→viseme cues, test languages; no recognizer in core |
| Audio choreography | [Tone.js](https://github.com/Tonejs/Tone.js) | MIT | P1 pre-baked SFX/musical cues; offline rendering required for export |
| Audio authoring | [wavesurfer.js](https://github.com/katspaugh/wavesurfer.js), [howler.js](https://github.com/goldfire/howler.js) | BSD-3-Clause; MIT | Editor waveform or preview playback only; not audio export engine |
| SVG raster | [resvg](https://github.com/linebender/resvg) | MIT OR Apache-2.0 | P0 deterministic still rasterization on supported SVG subset |
| Image operations | [Sharp](https://github.com/lovell/sharp) | Apache-2.0 (wrapper) | P0 resizing/compositing; inspect libvips/native dependency licenses separately |
| HTML-like stills | [Satori](https://github.com/vercel/satori) | MPL-2.0 | Optional static text/card layout to SVG; limited CSS, no timeline |
| Browser encode/mux | [Mediabunny](https://github.com/Vanilagy/mediabunny) + [WebCodecs](https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API) | MPL-2.0; browser API | **P1 export spike**: codec/alpha/audio/container feature detection; browser support governs availability |
| Browser render QA | [Playwright](https://github.com/microsoft/playwright) | Apache-2.0 | P0 pinned Chromium/OS/fonts/screenshots; no runtime dependency |

*Licenses are project-level references, not a guarantee for every bundled module, file or dependency. Verify package-specific SPDX metadata and notices. Sources: project license files and official repositories linked above. Do not conflate a free renderer with free imported assets or unrestricted codec distribution.*

### Qualified but not default / higher legal cost

| Technology | Policy |
|---|---|
| [Remotion](https://www.remotion.dev/docs/license/pricing) / `@remotion/three` | **Opt-in licensed video adapter.** Individuals and organizations up to three people may qualify for a free commercial tier; larger organizations and automated video tools have separate terms. Check current user/team/product eligibility before bundling. |
| [Theatre.js](https://github.com/theatre-js/theatre) | `@theatre/core` Apache-2.0; `@theatre/studio` AGPL-3.0. Core is a possible animation adapter; do not bundle, modify or host Studio without a separate compliance decision. |
| [GSAP](https://gsap.com/community/standard-license/) | Custom license despite free commercial use in many cases; restrictions may apply to competing visual animation builders. Do not introduce as required Kumiki dependency. |
| [FFmpeg](https://ffmpeg.org/legal.html) | Optional external encoder/renderer supplied by consumer. LGPL vs GPL depends on actual build and linked components; patent and redistribution concerns remain separate. |
| [Blender](https://www.blender.org/about/license/) | External GPL-licensed **authoring tool** for preparing glTF/GLB assets, not an embedded runtime. Ordinary exported original artworks are not automatically GPL solely because Blender produced them. |
| [Manim](https://github.com/ManimCommunity/manim) | Optional Python scientific-video exporter; do not duplicate native animation architecture to accommodate it. Verify individual bundled media assets. |

## 3. Runtime selection and capability matrix

| Requirement | Preferred path | Avoid / boundary |
|---|---|---|
| Editable diagrams, subtitles, vector titles | Native semantic geometry → SVG → resvg/Sharp | Rasterized text as canonical source |
| Path morphs, procedural vector explainers | Paper.js geometry → Motion Canvas adapter | Tying portable scene JSON to generator functions |
| High-density sprites, 2D particles | PixiJS offscreen RGBA; explicit budget | Thousands of SVG DOM nodes |
| 3D product/showcase, exploded geometry | Three.js + R3F + Drei + GLB; optional Postprocessing | Hand-rolled WebGL engine or live-clock-only `useFrame` |
| 3D procedural particles, instancing, shaders | Three.js instancing/registered shader presets | Arbitrary user-provided shader text in JSON |
| Animatable architecture/data charts | D3/ELK geometry + semantic objects + motion tracks | Screenshot-only diagram animations |
| Code/math instructional content | Shiki/KaTeX geometry + stable token/term IDs | Naive character-level DOM transitions |
| Rigs and character performers | Rive runtime / three-vrm + precomputed pose/viseme state | Importing a runtime's proprietary editor or unlicensed rig assets |
| Music/SFX and speech alignment | Tone.js/audio features + offline mix | Browser playback time as rendering clock |
| Still image output | SVG/resvg/Sharp | Full video engine for every thumbnail |
| Browser-native video mux | WebCodecs + Mediabunny if supported | Assuming MP4 implies H.264 encode, browser codec availability, or alpha support |
| Managed React video export | Licensed Remotion adapter | Making its license mandatory for all Kumiki consumers |

**GPU policy:** WebGL2 is the initial Three.js export baseline. WebGPU/TSL is a **separate optional backend** with its own shaders, postprocessing, capability report and quality fixtures. Do not assume WebGL2 EffectComposer effects port automatically. 2D/3D compositing must declare premultiplied alpha, color/transfer space, viewport and layer order. GPU/driver outputs need documented image tolerances, not bit-for-bit identity claims.

## 4. Adapter API and proof-of-capability

Use the canonical scene schema/adapter interfaces in [11](11-rendering-quality.md). Each optional adapter registers a name, pinned version/lockfile, compatible schema versions, capabilities (`svg-text`, `webgl2`, `pbr`, `rig-2d`, `alpha-matte`, `video-encode:h264`, etc.), peer dependencies, fallback policy and optional source-specific config. It **must not silently change** scene semantics or install itself as a dependency of standard UI.

**Adoption fixture (required before merging):**

1. **Composition:** two distinct reusable scenes using the adapter; at least one includes typography or labels over moving imagery. Import through canonical scene JSON and save/reload without losing semantics.
2. **Render:** direct seeks at first/middle/last/transition frames in shuffled order match forward playback on a pinned renderer, with numerical/property equality and golden-frame tolerances.
3. **Output:** complete output in one supported file format, plus still preview, with explicit color/alpha/FPS/audio policy; verify clean build without the optional dependency in an unrelated UI consumer.
4. **Failure:** missing codec/asset/font/GPU/capability, malformed content, license metadata and large assets return structured diagnostics rather than producing broken media.
5. **Cost:** measure peak RAM/VRAM, frame times, download size, cache hits, encode time, and asset size on named hardware/fixtures. Enforce budgets from measured baselines, not invented universal targets.
6. **Legal:** record version, SPDX evidence, upstream URL, copyright/NOTICE files, transitive/wasm/native licenses, modification status, platform restrictions, commercial-use terms and asset rights. Reject **unknown license** unless explicitly reviewed.

Use a dependency record in the repo for every merged adapter:

```ts
type AdapterDecision = {
  id: string; packageNames: string[]; versions: string[];
  upstream: string; licenses: string[]; evidence: string[];
  distribution: 'runtime' | 'dev-only' | 'external-tool';
  schemaVersions: number[]; capabilities: string[];
  outputs: string[]; headlessStatus: 'tested' | 'unsupported' | 'pending';
  compatibility: string[]; rightsRisks: string[];
  fixturePaths: string[]; measuredCosts?: Record<string, number>;
};
```

Keep the record machine-readable alongside adapter code; this table is the **architecture/policy**, not a substitute for the actual installed package manifest.

## 5. Deployment and commercial rights checklist

- **Distribution modes:** using tools internally to render paid videos, shipping Kumiki source, bundling adapters into a paid desktop app, and hosting a video-generation SaaS trigger **different license analyses**. Evaluate the actual product/distribution mode before release.
- **MIT/ISC/BSD/Apache/Zlib:** commercial-friendly, but preserve required copyright, license, attribution/NOTICE and modification information.
- **MPL-2.0:** file-level copyleft duties when distributing covered/modified source files; keep source access/notices as required. Do not call MPL equivalent to MIT.
- **EPL-2.0:** commercial use allowed subject to source/distribution obligations; record choice for dual-licensed ELK.js rather than silently assuming MIT.
- **GPL/AGPL and bespoke licenses:** require explicit legal/compliance approval for distribution or hosted integration; **AGPL network obligations** can apply when covered software is modified and provided over a network.
- **Fonts/models/HDRIs/music/stock:** separate asset rights and redistribution terms. Store provenance, asset hash, attribution, derivative/AI permissions when relevant and delivery rights. Do not ship third-party models merely because their viewer has an MIT license.
- **Video codecs:** library license, codec patent position, browser encoder availability, and container format are distinct. A valid export requires all applicable checks; failed codec preflight must not generate an invalid file.

## 6. Integration order (vertical slices only)

| Slice | Implement and prove | Do not implement yet |
|---|---|---|
| **E0: static** | D3 geometry + Shiki/KaTeX + SVG/resvg/Sharp; multilingual infographic/title export | PixiJS or 3D just for thumbnails |
| **E1: vector motion** | Paper.js + Motion Canvas bridge; reveal/morph/timing fixture + audio cue metadata | Parallel animation engines for identical geometry |
| **E2: 3D** | Three.js/R3F/Drei + glTF-Transform; WebGL2 PBR scene, camera, world labels and alpha overlay; v2 schema | WebGPU-first, physics engine, unlimited shaders |
| **E3: export** | Prototype WebCodecs/Mediabunny path, verify codec/audio/long-video tests; optional external FFmpeg or licensed Remotion | Claiming universal video codec support |
| **E4: depth** | PixiJS effects and Postprocessing where a measured reference clip benefits; Tone.js offline cues | Effects with no narrative/visual quality gain |
| **E5: characters** | Rive/VRM playback and Rhubarb cue adapter; multilingual fixture, sync and rights checks | Rig editor, automatic multilingual lip-sync claims |

**Three gold productions:** (1) 45-second 2D technical explainer; (2) 20-second cinematic 3D product film; (3) animated data infographic mixing screen-space labels and 3D geometry. Each needs actual video/stills, source JSON, metrics, rights manifest, adapter diagnostics, and 16:9/9:16 framing. **Stop** if a phase lacks a reproducible render or adds dependencies to core UI. 
