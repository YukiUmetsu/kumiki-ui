# ST1 · Semantic Video Scene Templates

**Scope:** 24 additional visual recipes, alongside existing **ProcessJourney** (`process-journey`) and **FollowSubjectThroughSections** (`follow-subject-through-sections`) for a total catalog of 26 distinct intents. This implementation is a reusable 2D/2.5D editing and preview layer. It is not an AI asset generator, audio mixer, physics simulator, licensed media library or completed high-end 3D renderer.

## Source and installation

- `scene-template-foundation`: `registry/video/scene-templates.ts` (semantic types, validation, pure absolute-frame evaluator, asset inventory) + `registry/video/scene-templates-react.tsx` (responsive composition renderer).
- Each of the following is a separately installable source registry item depending on the shared foundation: `question-reveal`, `hidden-detail`, `before-after`, `side-by-side`, `cause-effect`, `scale-reveal`, `context-to-detail`, `layered-cutaway`, `build-and-connect`, `transform-and-track`, `time-evolution`, `data-story`, `consequence-chain`, `decision-branch`, `worked-example`, `demonstration`, `guided-inspection`, `character-discovery`, `evidence-reveal`, `environment-reveal`, `page-turn-story`, `orbit-world`, `timeline-journey` and `glass-data-reveal`.
- Code lives under `registry/video/recipes/<recipe-id>.tsx`. Each wrapper is a strongly typed component named `<PascalCase>Scene`, e.g. `EvidenceRevealScene`; callers cannot pass the wrong recipe's semantic payload.
- All components render through `SceneTemplateView`, without introducing a second timeline engine, animation loop or third-party runtime dependency. Hosts can compose these with existing MotionDirector, CharacterPresenter, DiagramStage, ChartStory, ProcessJourney and VideoExportStage when needed.

## Minimal example

```tsx
import { EvidenceRevealScene } from "./components/video/recipes/evidence-reveal";
import type { SceneTemplateSpec } from "./components/video/scene-templates";

const spec: SceneTemplateSpec<"evidence-reveal"> = {
  schemaVersion:1,recipeId:"evidence-reveal",recipeVersion:1,
  id:"source-reveal",fps:{num:30,den:1},durationFrames:120,width:1920,height:1080,
  content:{
    claim:"Claim exactly as written in source",
    source:"The actual document citation/date",
    evidence:{id:"scan-1",src:"/licensed/source-image.png",alt:"Relevant source image",
      licenseRef:"approved-source-license"},
    excerpt:"Relevant, context-preserving excerpt",
    region:{x:.25,y:.18,width:.45,height:.27},
  },
};

// The export/preview owner supplies an absolute frame. No internal timer.
const scene=<EvidenceRevealScene spec={spec} frame={75}/>;
```

The `schemaVersion`, `recipeId` and `recipeVersion` fields are mandatory. Inputs are serializable; functions, unsafe code and arbitrary React markup do not enter the saved spec. Optional normalized `safeInsets` reserves platform UI and caption space independently for 16:9 and 9:16; a 9:16 composition is re-laid out rather than cropped. `validateSceneTemplate` reports malformed or absent semantic data, and `evaluateSceneTemplate(spec,frame,reducedMotion)` returns a deterministic four-phase state: **establish, focus, reveal, resolve**, optionally anchored by three ascending absolute `cueFrames`. Each recipe's typed content determines its distinct actual visual composition and ordered focus items.

`sceneTemplateAssets(spec)` returns declared images with IDs, source URLs and optional license references. It does not infer licenses, verify empirical claims, or fill missing assets. Real production should integrate VideoExportStage with the scene's duration, FPS and dimensions, and include the required license data in the host's export asset manifest. Invalid sources must block export rather than silently substitute fabricated visuals.

## Recipe-specific visual contract

| Recipe | Semantic requirements | Actual ST1 view | Additional production work for cinematic fidelity |
|---|---|---|---|
| question-reveal | question, identified subject, answer | Question/answer title swap and subject visual | Answer-timed motion/audio |
| hidden-detail | original image, normalized ROI, detail, context | Context preserved with outlined focus region | Camera push, protected annotation |
| before-after | same subject ID, two labeled states, change list | Matched before/after media with changed-state reveal | Measured image alignment |
| side-by-side | exactly two alternatives, common criterion | Symmetric alternatives with neutral outcome | Shared data scales if numeric |
| cause-effect | initial, event, causal links, outcome | Labeled mechanism chain with outcome | Evidence/uncertainty proof |
| scale-reveal | two positive quantities, shared unit, scale mode | Ratio and proportional/explicitly illustrative bars | True physical scale if spatial |
| context-to-detail | context, normalized ROI, detail asset | ROI on original and separate close-up | Matched physical camera/mask |
| layered-cutaway | intact object, ordered layers, relationship | Distinct overlaid layer cards | 3D clipping/PBR/occlusion |
| build-and-connect | stable graph nodes and valid edges | Connected node geometry | Larger graph routing, labels |
| transform-and-track | source/destination entities, explicit mappings | Before/after entity slots | Shared-element position tracking |
| time-evolution | dated chronological milestones | Dated state strip | Time-accurate interpolation |
| data-story | values, unit, baseline, source and insight | Frame-addressed data bars | Independent insight validation |
| consequence-chain | event, downstream impacts, outcome | Ordered cascading consequence strip | Confidence and alternatives |
| decision-branch | decision, conditions, options, outcomes | Branch cards with conditional outcomes | Probabilistic paths if supplied |
| worked-example | starting case, steps, intermediates, result | Stepwise intermediate calculations | Independent calculation solver |
| demonstration | setup image, target, ordered actions, result | Setup and action-sequenced instructional view | Real click recording, status proof |
| guided-inspection | scene with named ordered ROIs | Focus one labeled region at a time | Sightline/camera follows |
| character-discovery | character, subject, attention, reaction, reveal | Presenter/subject layout and timed reveal | Character rig and viseme sync |
| evidence-reveal | claim, contextual source, evidence asset, excerpt | Source visual with highlight + source text | Source verification and dates |
| environment-reveal | environment, foreground, focal asset, title | Layer depth, foreground occlusion, final reveal | Volumetrics/3D lighting |
| page-turn-story | document title, ordered imaged pages | Perspective book layout and turn styling | Curved page mesh and material fidelity |
| orbit-world | sphere asset, geocoded anchors, placement mode | 2D globe preview with illustrative marker | True sphere occlusion, anchoring and geography |
| timeline-journey | dated media, spacing policy and chronology | Timeline traversal through ordered media | Actual elapsed spacing if selected |
| glass-data-reveal | background, typed panels, numeric values and unit | Translucent panels with blur and chart | Export-tested glass refraction |

**Important distinction:** having all 26 named/installed compositions is not equivalent to meeting the high-end visual benchmarks referenced by the user-supplied footage. ST1 supplies usable semantic views and accepts user assets; full fidelity, real cinematography, reliable measured safe areas, physical 3D, and production MP4 QA require separate proof. The library must not advertise photorealism or complete video generation based only on these examples.

## Acceptance and inspection

- Tests: typed inputs and invalid fields for every intent; stable IDs; deterministic shuffled seeks; four phase boundaries; asset manifest; reduced-motion; 16:9 and 9:16; no fabricated facts.
- Storybook: **Motion → Scene Templates**, one individually scrubbable story for each of the 24 new recipes, plus **Motion → Process Journey** and **Motion → Follow Subject Through Sections**.
- Run `npm run typecheck`, `npx vitest run --project=unit`, `npm run catalog:check`, `npm run registry:validate`, `npm run registry:smoke`, `npm run registry:fixture -- --item=question-reveal`, and `npm run build-storybook`. Repeat fixture compile for representative typed wrappers.
- Visual qualification requires real browser snapshots at first, transition, midpoint and final frames on both 16:9 and 9:16, realistic font lengths and large text, no clipping/occlusion, one continuous subject where required, plus normal-speed MP4 playback with captions and sound-off review.
- All Storybook scenes use generated, generic SVG illustrations and explicitly demonstrate *reusable layout and timing*, not original licensed documentary assets. For production, replace with documented, verified imagery.

See [all 26 intents and mappings](../21-video-scene-templates.md) and [shared video production contract](../visual-production-contract.md).

## Cinematic customization extensions

The `environment-reveal` payload optionally accepts a two-pose normalized camera (`camera.from`, `camera.to`, each with `x/y` in 0–1 and zoom 0.75–2.5), a normalized `focalAnchor`, and a translucent `atmosphere` tint/opacity. `page-turn-story.paper` configures paper/ink colors and the shadow opacity; page transitions are tied to absolute composition frames. `orbit-world.camera` accepts latitude, longitude and bounded orbit degrees; `globeRadiusPercent` adjusts stage framing. `glass-data-reveal.material` accepts tint, opacity, blur in pixels, and border color. The reduced-motion treatment uses an opaque backing instead of relying on blur for meaning. These parameters remain **illustrative 2D/2.5D camera and material controls**; realistic curved paper, accurate earth meshes and physically based transparent glass still need specialized renderer adapters and captured visual evidence.


## Globe projection and land-data provenance

The `orbit-world` recipe now uses a **single frame-addressed orthographic camera** for route points, city markers, graticules and land coastlines. It interpolates between authored destinations on the shorter longitude arc, clips geometry behind the horizon, and draws the traveled route along a sampled great-circle arc. The camera is deterministic for random-access seeks and honors reduced motion. A supplied `content.camera` intentionally fixes the viewpoint for comparisons rather than following the itinerary.

In geographic mode, `content.globe` is optional: projected land outlines render without any decorative globe texture, so the exported media manifest does not need an unused license. In stylized mode, `content.globe` remains required and serves solely as a low-opacity decorative layer, not a georegistered basemap.

Land geometry is a bundled, simplified derivative of **Natural Earth 1:110m land polygons**, with the original public-domain dataset at:
- https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_land.geojson
- https://www.naturalearthdata.com/about/terms-of-use/

The coastline data is simplified to 0.25° tolerance, rounded to 0.01° and included under `registry/video/land-outline-110m.ts`. No remote map tiles, API keys or GPS/network access are required. This is a small-scale illustrative earth with accurate geographic projection; it is **not** a political boundary map, survey-grade coastline, textured WebGL planet, or source of country sovereignty claims. Consumers may use a 3D renderer via the host-owned asset slot for physical terrain, water, atmospheric scattering and texture fidelity. Geographic mode deliberately does not wrap a static decorative image around a rotating globe where it would misalign with actual projected cities.

## 26-component visual QA reel

Run the actual Storybook capture/export pipeline (Chromium, FFmpeg and FFprobe required):

```bash
npm ci
npx playwright install chromium
npm run build-storybook
KM_SCENE_SMOKE_FULL=1 KM_SCENE_OUTPUT_DIR=dist/scene-qa node scripts/scene-template-video-smoke.mjs
```

Outputs under `dist/scene-qa/`:

- **`kumiki-26-scene-qa-reel.mp4`**: chaptered, consistently sized and numbered visual QA montage.
- **26 individual `<recipe-id>.mp4` videos**: original component capture at their authored aspect ratios, not redrawn illustrations.
- **`QA-INDEX.md`** and **`QA-TIMINGS.json`**: per-recipe order, offset and clips.
- **`reel-segments/`**: labeled, normalized intermediates for diagnosing montage errors.

The GitHub **Scene recipe browser qualification** workflow runs the same full-capture path and uploads the files under the `scene-recipe-browser-evidence` artifact (14-day retention). It can be run locally when Actions is disabled.

This artifact **uses original code-generated fixtures** rather than downloading arbitrary third-party stock footage. No web asset is assumed commercially redistributable without checking the exact item's license. The reel is designed for **visual QA**, not a claim that 26 scenes have passed human premium-quality inspection. Inspect scene-specific first/mid/final frames, transitions, safe regions and both output aspects in Storybook. A 960×540 normalized montage cannot replace portrait/full-resolution inspection.

## Premium 3D and animated character QA (opt-in)

The scene foundation remains dependency-light and always provides its **2.5D fallback**. The following advanced demonstrations use existing Kumiki infrastructure and deliberately live in Storybook host code, not the installed scene foundation.

| Scene | GPU-independent export | Optional advanced capture | Actual renderer |
|---|---|---|---|
| Layered Cutaway | `motion-scene-template-capture--layered-cutaway` | `motion-scene-cutaway-3d--capture-3d` | Three.js solid assembly via `HeroAssetViewer`, real layer meshes, machined fasteners, studio lighting and frame-driven separation |
| Glass Data Reveal | `motion-scene-template-capture--glass-data-reveal` | `motion-scene-glass-3d--capture-3d` | Three.js `MeshPhysicalMaterial` with thickness, transmission, IOR, original reflective backing and separate panel flights |
| Character Discovery | `motion-scene-template-capture--character-discovery` | Same capture story | Kumiki `CharacterPresenter`, original **Cove** vector rig, action/expression/speech channels and absolute frame-seek |

### Render and review the two true-3D clips

Requires Chromium with WebGL, FFmpeg/FFprobe, the existing repo dependencies and built Storybook. The preview exporter can launch its local static server when pointed to the built Storybook directory.

```bash
npm ci
npx playwright install chromium
npm run build-storybook
npm run scenes:cutaway:3d
npm run scenes:glass:3d
npm run scenes:3d:browser
```

The resulting videos are `dist/scene-qa/true-3d-cutaway.mp4` and `dist/scene-qa/true-3d-glass.mp4`. The GPU test snapshots WebGL **canvas** pixels at five different exact frames for each scene, checking that the exported frame matches the requested frame and that the rendered pixels actually change. GPU access is required; absence is a test failure in this optional suite, **not a successful fallback to static artwork**.

Normal-speed QA must additionally inspect physical appearance, silhouette overlap, optical material fidelity, aliasing, lettering, safe areas, transitions and slow performance. The geometry is an **original illustrative material assembly**, not a fabricated reconstruction of a real product. Production work needs a source-specific 3D object/model plus verification of its rights and technical accuracy. Glass transmission is physically parameterized but not an assertion of measured optical correctness.

For the default all-26 reel, the 2.5D renderer is retained to keep the pipeline deterministic on non-GPU computers. The advanced clips are separate QA evidence, not silently substituted into the 26-recipe montage.

### Export-safe animated character

`src/components/video/scene-original-character.tsx` provides **Cove**, a new original vector puppet with 11 independent body/face parts, blinking eye variants, three mouth shapes, right-arm question and pointing gestures, expressive head motion and seeded idle channels. The identical renderer is used in both preview and video capture. This fixes the earlier problem where Storybook showed a real puppet while the exported Character Discovery video captured only a static illustration.

Pip v1.6 remains available in its separate character Storybook area, subject to user-provided artwork rights. It is **not** required or bundled by the 26-scene video QA export, and Cove's authored assets do not require third-party media licensing.

Video export readiness now has an opt-in exact-frame GPU contract: a `HeroAssetViewer` marked `data-km-frame-addressed` stamps `canvas[data-km-hero-frame]` only after drawing, and `VideoExportStage.seek(frame)` waits until the requested frame is displayed. This prevents stale 3D frames from being accepted by the capture handshake.

