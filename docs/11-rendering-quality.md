# 11 — Scene Contract, Renderer Adapters & Production QA

**Purpose:** define the **single canonical serialization and export boundary** for all media components. This document owns timing, scene composition, adapter capabilities, determinism, asset policy and quality gates. The types below are **proposed v1**, not claims of an implemented API. Prototype and revise before freezing. See [07](07-media-foundation.md), [08](08-motion-graphics.md), [09](09-explainer-components.md), [10](10-character-audio.md).

## 1. Non-negotiable system invariants

1. **One document, many backends:** content, semantics, timing and assets are renderer-neutral; DOM components and canvas/scene-graph nodes need separate interpreters.
2. **Frame-addressable:** `renderAt(frame)` is pure given pinned inputs. Seeking directly to a frame cannot change output.
3. **Stable identity:** scene/layer IDs survive save/reload; `semanticId` identifies an educational object that persists across scene boundaries.
4. **Explicit fidelity:** missing fonts, effects, codecs, language shapers, character rigs and masks produce capability errors or **opted-in** documented fallbacks.
5. **No ambient dependencies:** normal React preview and image/thumbnail components do not require FFmpeg, Remotion, Motion Canvas, a GPU, ML inference or paid services.
6. **Preserve editability:** JSON stores layers, typed assets, semantic nodes, timing and constraints; export is a derivative, not the only master.
7. **Safe data:** compositions contain JSON data, never executable JS, URL fetch instructions or raw user prompts to run at render time.

## 2. Time, transforms and track evaluation

- `fps` is rational `{ num, den }`: 30 fps = `{30,1}`; ~29.97 = `{30000,1001}`. `frame` is a nonnegative integer in the composition timeline. Duration `N` covers `[startFrame, startFrame + N)`; a still at the last frame is `start + N - 1`.
- Imported speech/audio timestamps can retain original sample/timestamp precision; convert to frame boundaries **once** with a declared rounding mode (`nearest`, `floor`, `ceil`), avoiding incremental drift.
- Coordinates use artboard design pixels, top-left origin; transform order is explicit. `x`,`y` locate the layer origin in parent space, width/height are unrotated local bounds. Percent-based constraints are resolved **before** fixed-frame evaluation.
- A scene instance can be trimmed/placed multiple times, but its local time mapping is defined. Nested compositions form an **acyclic graph**; reject recursion and out-of-bounds source trims.
- Evaluation order: resolve assets/fonts → precomputed responsive layout → named cues → nested scene local time → layer animation/property conflicts → rig channels → camera/parent transforms → masks/effects → paint in explicit z-order → captions/overlays → audio mix/export. Cache expensive geometry/physics without making output order-dependent.
- At overlaps, a transition owns source/destination scene opacity and shared element handoff; **two active scenes do not implicitly double-paint the same semantic object**.

## 3. Proposed typed document (wire contract sketch)

Types intentionally exclude executable functions. Real implementation should use a runtime validator (e.g. Zod/JSON Schema), discriminated unions for each semantic component and round-trip/migration tests. `payload` is a versioned, per-`kind` JSON object validated by a **registered schema**, not arbitrary code.

```ts
// Proposed v1; exact syntax/fields subject to prototype validation.
type Frame = number; // integer >= 0; end-exclusive ranges
interface Fps { num: number; den: number } // positive integers
interface Rect { x: number; y: number; width: number; height: number }
interface Transform extends Rect {
  rotation?: number; scaleX?: number; scaleY?: number;
  anchorX?: number; anchorY?: number; depth?: number;
}
type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
type Easing = 'linear' | 'ease-in-cubic' | 'ease-out-cubic' |
  'ease-in-out-cubic' | { cubicBezier: [number, number, number, number] };
type ValueType = 'number' | 'angle' | 'vec2' | 'color' | 'opacity' |
  'transform' | 'path' | 'boolean';
interface Keyframe { frame: Frame; value: Json; easing?: Easing }
interface AnimationTrack {
  targetId: string; property: string; valueType: ValueType;
  keyframes: Keyframe[]; // local to containing scene; ordered
  blend?: 'override' | 'additive'; priority?: number;
}
interface Asset {
  uri: string; mediaType: string; sha256: string;
  width?: number; height?: number; durationSamples?: number;
  licenseId?: string; attribution?: string; language?: string;
  fontFamily?: string; fontWeight?: number; rightsNote?: string;
}
interface Layer {
  id: string; semanticId?: string; parentId?: string;
  kind: 'text' | 'image' | 'shape' | 'diagram' | 'code' |
    'chart' | 'math' | 'caption' | 'character' | 'group' | 'instance';
  transform: Transform; z: number; visible?: boolean; opacity?: number;
  assetRef?: string; clipRef?: string; effectRefs?: string[];
  payload: { version: number; data: Json }; // validate by kind
  summary?: string; // accessible semantic description
}
interface Cue { id: string; frame: Frame; durationFrames?: Frame; kind: string;
  targetId?: string; data?: Json }
interface Scene {
  id: string; durationFrames: Frame; layers: Layer[];
  animations: AnimationTrack[]; cues?: Cue[];
  camera?: { id: string; transform: Transform; targetId?: string }; // animatable by id
  layoutVariant?: string; storyboard?: { claim: string; objective: string };
}
interface Clip {
  id: string; sceneRef: string; startFrame: Frame;
  sourceStartFrame: Frame; durationFrames: Frame;
  transitionRef?: string; // explicit overlap/handoff contract
}
interface AudioClip {
  id: string; assetRef: string; startFrame: Frame; durationFrames: Frame;
  sourceStartSample?: number; gainDb?: number; fadeInFrames?: number;
  fadeOutFrames?: number; automationRef?: string;
}
interface AudioLane {
  id: string; role: 'narration' | 'music' | 'sfx' | 'other';
  clips: AudioClip[]; duckedByLaneId?: string;
}
interface Composition {
  schemaVersion: 1; id: string;
  canvas: { width: number; height: number; fps: Fps; background: string };
  durationFrames: Frame;
  themeRef?: string; motionProfileRef?: string;
  assets: Record<string, Asset>;
  scenes: Record<string, Scene>;
  subcompositions?: Record<string, Composition>; // optional reusable scene documents; DAG only
  clips: Clip[]; audio?: AudioLane[];
  transitions?: Record<string, { kind: string; data: Json }>;
  effects?: Record<string, { kind: string; data: Json }>;
  metadata?: { authoringTool?: string; seed?: number; aspectVariant?: string };
}
```

**Extension/versioning rules:** each registry `kind` has a documented payload schema, `requiredCapabilities`, defaults, static fallback and migrations. Top-level `schemaVersion` handles structural changes; individual kinds version their payloads. Unknown required kind/property → validation failure; optional decorative effect may be dropped **only** by explicit caller-selected policy. Normalize object order/IDs before hashing for deterministic cache keys.

**Open before freeze:** Exact `instance` payload bindings and nested asset namespace resolution, how color values encode color space, transform-origin convention, how scene transitions resolve overlapping shared elements, source audio time precision, serialized constraints and typed semantic graph nodes. Resolve with fixtures rather than adding unbounded `unknown` payloads.

## 4. Renderer and exporter contract

```ts
// Illustrative adapter interface; implementation may split preview/export APIs.
interface RendererCapabilities {
  version: string;
  features: string[]; // e.g. shape-morph, alpha-matte, svg-text,
                      // rig-2d, motion-blur, audio-mix, vector-export
  outputFormats: string[];
}
interface Diagnostic {
  code: string; severity: 'error' | 'warning'; message: string;
  sceneId?: string; layerId?: string; frame?: number;
  capability?: string; fallback?: string;
}
interface RenderOptions {
  allowFallbacks?: string[]; // explicit list, never blanket silent degrade
  quality?: 'preview' | 'final';
}
interface RendererAdapter {
  capabilities(): RendererCapabilities;
  validate(document: Composition, options: RenderOptions): Diagnostic[];
  renderFrame(document: Composition, frame: number, options: RenderOptions): Promise<unknown>;
  // Final export/audio muxing is optional: separate adapter capability.
}
```

| Integration | Appropriate role | Important constraint | Reference |
|---|---|---|---|
| React/browser | Authoring controls, lightweight preview, CSS-compatible stills | DOM/CSS cannot imply exact offline video parity | — |
| Motion Canvas | Procedural 2D scene and technical animation exporter | Generator/scene graph must interpret Kumiki semantics; no direct DOM reuse | https://motioncanvas.io/docs/ |
| Remotion | React-based programmable video renderer | Optional only; **review current project/automation/company licensing** | https://www.remotion.dev/docs/license |
| Satori | JSX-like static SVG cards/thumbnails | Limited HTML/CSS subset; static, not a video timeline | https://github.com/vercel/satori |
| resvg | SVG rasterization, useful with Rust workflows | Static SVG rasterizer; no general SVG animation | https://github.com/linebender/resvg |
| ELK.js | Deterministic graph layout with pinned version/settings | Lays out graphs; does not draw, animate or validate narration | https://github.com/kieler/elkjs |
| Rive | Optional runtime for externally authored interactive/character rigs | Runtime/export support and redistribution/license need review | https://rive.app/ |
| dotLottie Web | Optional playback for supplied Lottie assets | Player, not a universal compositor or video exporter | https://github.com/LottieFiles/dotlottie-web |
| Playwright | Browser screenshots, fixture capture and QA | Font/platform rendering differs unless environment pinned | https://playwright.dev/ |
| Video/Audio encoder | Encode/mux supported outputs from rendered frames/audio | Installed by consumer/adapter; codec patent/license/distribution policies are separate | — |

**Integration policy:** Before adopting an adapter, verify **current** license for code, packaged runtime, generated outputs and automation use; peer dependency versions, headless export, CPU/GPU needs, asset/font portability, audio support, costs, render determinism and redistribution. A permissive library license alone does not clear **music, fonts, images, voices or patented codec** obligations. Never put engine dependencies in the core registry dependency tree.

## 5. Asset manifest, fonts and security

**Preflight resolution:** resolve all local assets/fonts through a consumer-supplied resolver and approved roots; reject unsafe paths, redirects to untrusted hosts, data URI bombs, recursive SVG references, unsupported external SVG scripts, oversized resources and unexpected formats. Default **no network access**. Record hash (SHA-256), original dimensions, color profile, media type, license/attribution, source and retrieval policy. Assets referenced by hash; no embedding personal or proprietary file contents into reusable component code.

**Fonts:** package/reference explicitly licensed font files, track family/weight/axes and fallback chain; test CJK, emoji, RTL, ligatures, combining marks and vertical metrics. Browser and exporter must agree on shaping rules sufficiently to match target text boxes; if they cannot, refuse exact-fidelity export or render pinned glyph outlines as an **export-only** fallback while retaining editable text in source.

**Color:** declare composition/profile intent, alpha policy, gradients/blend space and output color mapping (e.g. sRGB still images, Rec.709 video where selected). Avoid relying on display-specific CSS gamut when exporting. Subsample/codec/profile differences mean pixel-perfect cross-engine equality may be impossible; use specified perceptual tolerances and semantic checks, not fake exact parity claims.

## 6. QA gates: actionable, measured, automatable

| Gate | Automatic signal | Required report/action |
|---|---|---|
| Overflow/crop | Layer/glyph extents vs artboard, masks and safe regions | Scene, layer, frame, pixels beyond bounds |
| Collision | Essential label/caption/focus geometry overlaps over time | IDs, overlap area, screenshot and intentional-overlap override |
| Legibility | Font metrics, small-width previews, contrast sampled over moving backgrounds | Failing frames and target delivery dimensions |
| Motion coherence | Transition handoff identity, jerky velocity/scale discontinuities, hidden end states | Discontinuity timestamp and related semantic IDs |
| Audio-sync | Speech cue vs visual event/segment spans, missing phonemes/visemes | Error in frames or milliseconds + confidence/source |
| Technical truth | Diagram labels/units, graph edges, formula term IDs, chart scale | Fail structurally where detectable; mandatory editorial review |
| Asset provenance | Unresolved reference, hash mismatch, unsupported/unknown rights | Block export or explicit acknowledged legal review |
| Rendering | Decode errors, unsupported adapter feature, nondeterminism | Structured diagnostic + declared fallback |
| Accessibility | Caption coverage, visual meaning text summary, reduced-motion state | Scene-level checklist and warnings |
| Delivery | Aspect/crop, color profile, audio clipping, output duration, frame count | Export profile and measured result |

**Frame coverage:** first, last, every keyframe, transition boundary, cue, representative tween points and suspected extrema; run targeted full-frame collision checks on short golden clips where affordable. Sampling **does not prove** all intermediate frames are safe. Every detection category needs a deliberately broken fixture. Errors must identify `sceneId`, `layerId`, `frame`, expected behavior, suggested repair and optional screenshot.

### Determinism and visual baselines

- Freeze asset hashes, font assets, viewport, FPS, token versions, layout version, renderer version, random seed and locale/timezone.
- Test shuffled seek order, repeated frames, parallel render order and restart/reload. Same engine/environment must yield equivalent output within a **published tolerance**; sample pixels and structural state, not just a video file hash.
- Keep golden image snapshots for representative transitions, dark/light theme and English/Japanese strings. Inspect full-resolution and thumbnails at typical mobile sizes.
- Ensure effects/cameras never conceal captions or critical labels during movement. Make detected collisions actionable with masks for intentionally layered designs.

## 7. Render and publish pipeline

```mermaid
flowchart LR
  S[Script / authored scene data] --> V[Schema + rights validation]
  V --> L[Asset resolve + text / diagram layout]
  L --> C[Capability negotiation]
  C --> P[Deterministic frame / audio cue evaluation]
  P --> F[Frame render or SVG export]
  P --> M[Audio mix adapter]
  F --> X[Optional encode / mux]
  M --> X
  X --> Q[Automated QA + editorial review]
  Q --> O[Deliverable + manifest + scene JSON]
```

**Reproducibility manifest** records document hash, schema version, content/asset hashes, fonts, tokens, layout engine settings, FPS, dimensions, renderer + adapter versions, export profile, color/audio settings, seeded effects, supported-feature decisions, warnings, elapsed frames and output artifact hashes. Encode **after** evaluating frames; do not use encoder wall-clock time to drive animation. Support incremental frame/scene caching keyed by dependencies, with correct invalidation on shared fonts/tokens and neighboring transition clips.

**Output profiles:** `still-svg`, `still-png`, `video-landscape`, `video-portrait`, `transparent-overlay`, `caption-data`. Format/container/codec specifics are adapter configuration; don't promise universal availability. An SVG export must preserve editability as far as its primitives allow, while the **canonical composition JSON always remains editable**.

## 8. Delivery sequence and acceptance gates

| Phase | Deliver | Passing evidence |
|---|---|---|
| R0 | JSON Schema/validator + fixture round-trip | Invalid IDs, cycles, bad times, NaN values and missing refs rejected |
| R1 | React preview and SVG/still export | 16:9, 9:16, 1:1 CJK/English fixtures; no heavyweight peer deps |
| R2 | Motion evaluator + scene handoff | Shuffled frame seeks match baseline; explicit capability errors |
| R3 | One complete video adapter | Frame duration, transitions and camera consistency; no hidden licenses |
| R4 | Audio/captions/character playback | Cue alignment and mixing under 10; multilingual caption fixtures |
| R5 | QA harness + reproducible manifest | Broken-fixture tests produce useful frame-level diagnostics |

**Definition of done for each media item:** typed props + versioned schema payload; one consumer example; Storybook or equivalent preview; export adapter capability note; source JSON fixture; golden frames; performance and failure tests; accessibility/static fallback; documented rights/dependency boundary; individually installable registry item. **No undocumented no-op fallbacks.**

## 9. CI checks and release discipline

- **Pull request:** lint/typecheck; schema validation and migrations; fixture round-trip; unit tests for interpolation/timeline; visual snapshot of changed items; deterministic seek tests; asset-reference scanner.
- **Nightly/golden:** render the three reference productions from [07](07-media-foundation.md), cross-check preview/export at key frames, verify audio/caption alignment and inspect mobile-width snapshots. Save QA HTML/JSON plus failing frame captures.
- **Before release:** clean install in a fresh consumer, no renderer dependency leakage; explicit version/changelog for changed scene contracts or tokens; inspect licenses/attribution; test reduced-motion and missing-asset behavior.
- **Performance:** measure frame render latency, peak memory, cache hit rate, full video wall time, frame failures and output size at defined hardware/resolution. Set budgets from measured reference fixtures; don't invent global FPS targets that low-powered devices cannot meet.

## 10. First end-to-end validation scenario

Generate a **60-second RAG explainer** from structured scene content, not hand-drawn one-off CSS: 6 shots; stable query/context identities; path-based data packets; equation or code cutaway; camera reframe; captions; 3 audio lanes; landscape + portrait framing. Export still, animated video and two thumbnails from the same semantic source. Required evidence: reproducible seek at arbitrary frames, no essential text cropped, speaker/caption/visual alignment, clear unsupported-feature diagnostics, editable source JSON and a render manifest. Only then expand the animation catalog.
