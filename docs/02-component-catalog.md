# 02 — Component Catalog

This is the inventory of everything in the registry, grouped by what each piece is for. Each row names the registry item to install and says what it does, taken from `registry.json`.

**188 registry items in 20 groups.** Some items export several components: `field-input` provides Field and Input, for example. Many visuals come as a pair, a 2D SVG version and a `-three` Three.js version, such as `section-reveal` and `section-reveal-three`. The install name is the registry item name.

Find a component by intent with `npm run catalog:find -- --query="your intent" --format=json`, and read its exported props from source with `npm run catalog:api -- --id=NAME --format=json`. Storybook uses these same groups as its sidebar sections, and its **Start here** page searches and filters the whole catalog by name, purpose, group and renderer. Rules for adding a component live in [AGENTS.md](../AGENTS.md) and [03 — Component Standards](03-component-standards.md).

## Groups

- [Actions](#actions) (2): Buttons that start an action.
- [Form fields](#form-fields) (12): Entering, choosing and validating values.
- [Overlays and notifications](#overlays-and-notifications) (8): Content that appears above the page, and messages that arrive over it.
- [Navigation and layout](#navigation-and-layout) (8): Moving through a product and arranging its panels.
- [Status and feedback](#status-and-feedback) (4): Telling the user what is happening or what needs attention.
- [Data display](#data-display) (2): Showing collections of records.
- [Application patterns](#application-patterns) (6): Composed blocks built from the primitives above.
- [Media design surfaces](#media-design-surfaces) (12): Compositing layered still images and typography, with thumbnails and exports.
- [Infographics and charts](#infographics-and-charts) (7): Data-driven charts and number displays.
- [Annotation and measurement](#annotation-and-measurement) (6): Labels, dimensions and marks placed on a drawing or a 3D object.
- [Motion engine](#motion-engine) (18): Timing, tracks, paths and transitions that other visuals are built on.
- [Cameras](#cameras) (6): Camera choreography for 2D stages and 3D scenes.
- [3D asset toolkit](#3d-asset-toolkit) (15): Building and handling physical 3D objects.
- [Asset motion and states](#asset-motion-and-states) (14): Showing how a 2D or 3D object opens, changes, flows or behaves.
- [Explainer scenes](#explainer-scenes) (9): Diagrams, evidence and comparisons that explain an idea on screen.
- [Video production](#video-production) (49): Shaping, timing, captioning and exporting short-form and explainer video.
- [Illustration toolkit](#illustration-toolkit) (2): Shared vocabulary and drawing primitives for the domain packs.
- [Finance, business and technology](#finance-business-and-technology) (12): Finance, business and technology objects, vocabularies and metric visuals.
- [Home](#home) (6): A house as data, with plans, sections, dimensions and weather.
- [Privacy and files](#privacy-and-files) (3): Photos, documents, locations and file formats.

## Actions

Buttons that start an action.

| Component | Install name | What it does |
|---|---|---|
| Button | `button` | Accessible, tokenized button with variants, sizes, icon and non-jittery loading states. |
| Icon Button | `icon-button` | Square icon-only button with required accessible name, tokenized variants/sizes, stable loading state and focus ring. |

## Form fields

Entering, choosing and validating values.

| Component | Install name | What it does |
|---|---|---|
| Input | `input` | Bare text input plus a labeled Field with hint, error and automatic ARIA wiring. |
| Field + Input | `field-input` | Bare text input plus a labeled Field with hint, persistent description, error and automatic ARIA wiring. |
| Textarea | `textarea` | Multiline text input plus a labeled field with hint, error, optional auto-resize and a conditional character counter. |
| Search Field | `search-field` | Controlled, tokenized search input with an integrated clear control, optional submit/filter actions, loading and accessible feedback. |
| Select | `select` | Accessible single-selection select with a tokenized trigger, keyboard and ARIA navigation, disabled options and optional client-side search. |
| Combobox | `combobox` | Filterable single- or multiple-select combobox with chips, an honest loading state and full keyboard support. |
| Listbox | `listbox` | Standalone single- or multiple-select listbox with aria-activedescendant navigation, grouping, type-ahead and full keyboard support. |
| Checkbox | `checkbox` | Checkbox with checked, unchecked and indeterminate states, label click and native form submission. |
| Switch | `switch` | On/off switch for a single boolean setting with an accessible name, keyboard support and a moving thumb. |
| Radio Group | `radio-group` | Single-choice radio group with a required visible label per item, native input semantics and an invalid/error state. |
| Slider | `slider` | Single-value or range slider with a real value contract, a formatted readout and full keyboard support. |
| Form Summary | `form-summary` | Accessible summary of validation failures that links back to each field, with opt-in polite/assertive live-region roles. |

## Overlays and notifications

Content that appears above the page, and messages that arrive over it.

| Component | Install name | What it does |
|---|---|---|
| Dialog | `dialog` | Modal dialog with focus management, dismissal, scroll lock and portal rendering. |
| Sheet | `sheet` | Edge-aligned editable panel with configurable motion, a sticky footer and optional keyboard/pointer resizing. |
| Drawer | `drawer` | Edge panel with native swipe gestures, snap points, configurable motion and accessible dialog behavior. |
| Popover | `popover` | Trigger-anchored popup with focus management, Escape and outside-press dismissal, collision-aware placement and scrollable long content. |
| Tooltip | `tooltip` | Short hint on hover or focus of a single trigger, with collision-aware placement and Escape dismissal. |
| Dropdown Menu | `dropdown-menu` | Data-driven dropdown menu with keyboard/ARIA navigation, separators, disabled and destructive items and nested submenus. |
| Command Palette | `command-palette` | Keyboard-first modal command launcher that filters and runs commands. |
| Toast | `toast` | Severity-aware notification stack with deduplication, auto-dismiss, optional actions, dismiss-on-click and a polite/assertive live region. |

## Navigation and layout

Moving through a product and arranging its panels.

| Component | Install name | What it does |
|---|---|---|
| Tabs | `tabs` | Index-based tab set with roving keyboard focus, an honest selected state, orientation (and axis-swap) control, Escape-to-clear and scrollable overflow. |
| Breadcrumbs | `breadcrumbs` | Navigation trail landmark that marks the current page with aria-current and can collapse long trails to their ends. |
| Sidebar | `sidebar` | Collapsible application navigation rail whose parts share the collapsed state and keep every link's accessible name. |
| Stepper | `stepper` | Step-by-step workflow navigation, horizontal or vertical, with configurable states, animated completion marks, scrolling for long workflows and transition hooks for… |
| Accordion | `accordion` | Information-dense disclosure list with roving keyboard focus, measured-height panels and reduced-motion-safe animation. |
| Split Pane | `split-pane` | Two-panel layout with a pointer- and keyboard-operable divider whose panel sizes stay clamped to valid bounds. |
| Separator | `separator` | Tokenized horizontal or vertical rule, presentational by default with an opt-in semantic separator role. |
| Surface / Card | `surface-card` | Tokenized base surface with solid/outline/ghost variants, optional header/body/footer regions and an opt-in interactive whole-surface button mode; no nested-card sprawl. |

## Status and feedback

Telling the user what is happening or what needs attention.

| Component | Install name | What it does |
|---|---|---|
| Alert | `alert` | Inline notice for persistent messages with shape-distinct severity icons, an optional action and opt-in polite/assertive live-region roles. |
| Badge | `badge` | Compact status pill for labels and metadata whose variants never rely on colour alone to convey meaning. |
| Progress | `progress` | Determinate and indeterminate progress bar with a truthful percentage, accessible value announcements and an inert disabled state. |
| Skeleton | `skeleton` | Decorative loading placeholder with text, rectangle and circle silhouettes, reduced-motion safe and hidden from assistive technology. |

## Data display

Showing collections of records.

| Component | Install name | What it does |
|---|---|---|
| Table | `table` | Semantic table foundation with a scrollable container, an optional sticky header and controlled sortable columns. |
| Searchable Results | `searchable-results` | Controlled search field with a results list, query highlighting and honest loading, empty and load-more states. |

## Application patterns

Composed blocks built from the primitives above.

| Component | Install name | What it does |
|---|---|---|
| Search and Results | `search-and-results` | Search field, filter layer and honest results region composed from Searchable Results, Select, Checkbox, Badge and Alert, with dismissible filter chips and a `/` focus… |
| Settings Section | `settings-section` | Data-driven settings form with text, textarea, select, switch and checkbox fields, inline validation, dirty tracking and honest save, pending and error states. |
| Guided Form | `guided-form` | Multi-step form shell with per-step validation, an error summary that links back to fields, draft save and restore and a truthfully loading submit. |
| Process Monitor | `process-monitor` | Multi-stage task monitor pairing an ordered stage list, a truthful progress bar and a scrollable log with terminal cancel, retry and dismiss actions. |
| Resource Explorer | `resource-explorer` | Hierarchical tree browser with roving focus, type-ahead, inline rename and keyboard reorder actions as an accessible alternative to drag and drop. |
| Data Details Workspace | `data-details-workspace` | Sortable list-and-detail workspace that places the Table in a Split Pane and keeps the selected row visible while the divider moves or the layout stacks. |

## Media design surfaces

Compositing layered still images and typography, with thumbnails and exports.

| Component | Install name | What it does |
|---|---|---|
| Media Document | `media-document` | Renderer-neutral composition document: typed artboard, layers, fonts and assets, deterministic serialization and validation, locale-aware text layout, and… |
| Artboard | `artboard` | Fixed-size design surface with explicit dimensions, background, safe region, bleed and crop, publishing a shared design-space context for authoring-time zoom, pan and… |
| Editable Text | `editable-text` | Composable text layer with styled spans, measured glyph runs, a deterministic wrap/shrink/clip/fit policy, locale and bidirectional support, pinned font fallback and… |
| Media Frame | `media-frame` | Places a referenced image, video or vector inside a layer box with explicit fit, focal point, mask and crop, without ever mutating the source asset's intrinsic dimensions. |
| Layer Stack | `layer-stack` | Ordered layer composition with stable ids, grouping, visibility, locking, opacity, blending and rectangular clipping, plus an accessible layer tree for selection… |
| Alignment Guides | `alignment-guides` | Non-exporting authoring overlay for grid, guides, safe region, centre axes, live measurements and snap feedback, sharing the pure snapping model with the document. |
| Export Preview | `export-preview` | Preview, inspect and export a composition at its output size, with bleed and crop, small-format inspection, missing-font and missing-asset warnings and downloadable SVG… |
| Thumbnail Composition | `thumbnail-composition` | Five reusable intent-led still-image compositions compiled into editable MediaDocument layers with supplied imagery, headline, cue, palette and stable semantic IDs. |
| Thumbnail Art Direction | `thumbnail-art-direction` | Reusable editorial still composition with independently editable background photography, dominant hero cutouts, graphic props and expressive headline lines. |
| Thumbnail Variants | `thumbnail-variants` | Deterministic subject-sided and comparison thumbnail alternatives with unique IDs and independent, editable M0 layers. |
| Thumbnail Preflight | `thumbnail-preflight` | Objective opt-in thumbnail geometry, subject framing, safe-corner, text-size, collision and density diagnostics merged with existing media export checks. |
| Hero Still Bridge | `hero-still-bridge` | Optional browser-only capture of an already rendered 3D hero canvas into a licensed PNG ImageAsset; does not load Three.js into the media core. |

## Infographics and charts

Data-driven charts and number displays.

| Component | Install name | What it does |
|---|---|---|
| Infographic System | `infographic-system` | Dependency-free engine that turns a validated semantic InfographicSource into a renderer-neutral primitive layout: source schema, validation and content digests… |
| Infographic View | `infographic-view` | Deterministic DOM preview that draws a resolved infographic layout as accessible SVG, owning no layout, measurement or art direction so it cannot drift from the static… |
| Economic Charts | `infographic-economic-charts` | CostWaterfall, LifecycleCostTimeline, BreakEvenComparison and ScenarioBand on the infographic primitive engine: exact minor-unit reconciliation, declared currency basis… |
| Chart Story | `chart-story` | Story beats over the existing chart renderer: one constant value axis across scenarios, zero-based bars and areas, reveals, focus and comparisons addressed by data… |
| Animated Metric | `animated-metric` | Deterministic count-ups and changing quantities: currency, percent and unit formats with one precision per metric, interpolate only between known keyframes (MG1 easing)… |
| Scalar Field Overlay | `scalar-field` | Supplied scalar fields (temperature, moisture, pressure) as calibrated colors, contours and threshold bands on any planar surface: explicit unit, source and fixed or… |
| Scalar Field Overlay (Three.js) | `scalar-field-three` | The field as a translucent data texture on its 3D surface with contour lines, updated per frame and ignored by inspection tools. |

## Annotation and measurement

Labels, dimensions and marks placed on a drawing or a 3D object.

| Component | Install name | What it does |
|---|---|---|
| Dimension Overlay | `dimension-overlay` | Dimensions, thickness chains, areas, angles and person/bar scale references resolved from asset meters (InspectableAsset anchors and part bounds, or authored values with… |
| Measure Units | `measure-units` | Length, area and angle text from meters in metric or imperial: millimeters and sixteenth-inch fractions for thin layers, ft/in, m²/ft² and roof pitch (rise:12 with… |
| Semantic Callout Layer | `semantic-callouts` | Labels and leaders attached to moving semantic parts: per-frame anchors from InspectableAsset, measured CJK-safe wrapping, collision-free placement around protected… |
| Semantic Callouts (Three.js) | `semantic-callouts-three` | Exact HeroAssetViewer camera reconstruction, projection and depth-aware ray-cast occlusion for SemanticCalloutLayer. |
| Zone Boundary | `zone-boundary` | Labelled dashed zones for SVG diagram overlays, marking where data stays inside a device or leaves to a third party; labels are measured in place and flagged when wider… |
| Redaction Reveal | `redaction-reveal` | Inline text with character-range redactions drawn as bars (text removed from the DOM), highlights for review, or overlay-only demonstrations; pure normalisation clamps… |

## Motion engine

Timing, tracks, paths and transitions that other visuals are built on.

| Component | Install name | What it does |
|---|---|---|
| Motion Track | `motion-track` | Dependency-free motion kernel that evaluates a validated timeline of typed, keyframed tracks, sequences, staggers and constraints into renderer-neutral samples at an… |
| Motion Path | `motion-path` | Renderer-neutral motion paths that flatten anchors into an arc-length-parameterised polyline and expose point, tangent and angle sampling, bounds, SVG `d` serialization… |
| Motion Preset | `motion-preset` | Constructive motion preset catalog that expands a declarative preset instance into concrete timeline nodes for fade, rise, pop, slide, kinetic and exit intents, with… |
| Animated Text | `animated-text` | Deterministic kinetic-text builder that segments a string into grapheme, word or line tokens and staggers a materialized preset across them, returning an evaluable… |
| Mask Reveal | `mask-reveal` | Deterministic clip, alpha and luma matte resolver that sweeps a declaration rect along a chosen axis at a given progress, with feathering, stable compositing order and a… |
| Shape Morph | `shape-morph` | Contour shape morphing that validates compatibility, resamples rings deterministically and interpolates between two shapes, with explicit dissolve and cut fallbacks when… |
| Shared Element | `shared-element` | Durable cross-cut element handoff that interpolates transform and opacity across a declared handoff range under cross-fade, cut or hold-old collision policies, with… |
| Motion React | `motion-react` | Render stage, motion box, kinetic text, vector draw, shape morph, mask reveal and scrubber components plus evaluation hooks that are pure functions of an explicit frame… |
| Motion Director | `motion-director` | Declarative choreography compiler over MG1: dependency-checked timing, joined property channels, shots, VT1 handoffs, typed cue metadata, seven parameterized recipes and… |
| Motion Director React | `motion-director-react` | Clock-free MotionDirector render boundary, shared MG1 samples, reduced-motion final composition and typed narration, speech, SFX and music cue hooks. |
| Scene Storyboard | `scene-storyboard` | Serializable shot planner that orders shots across the composition timeline, validates continuity, handoffs, cues and coverage without throwing, and exposes clips, cues… |
| Progressive Reveal | `progressive-reveal` | Cue-addressable staged entrances and emphasis holds compiled to existing MG1 presets, with shared DOM and SVG composition slots. |
| Storyboard Shots | `storyboard-shots` | Shared active-shot explanation and keyboard-operable shot navigation for a frame-addressed storyboard. |
| Visual Transformation | `visual-transformation` | Semantic 2D scene transformations compiled to MG1 tracks, explicit strategy fallbacks, immutable interruption history, seven reusable recipes and a frame-driven SVG… |
| Semantic Motion Direction | `semantic-motion-direction` | Renderer-independent semantic scene contracts, intention-bound transfers, measured label placement and fast screenshot-free preflight. |
| Attention Editing Recipes | `attention-editing-recipes` | Reusable pure editing recipes and compositors: hook variants, typography, beat sync, velocity remaps, sourced evidence, exact numeric cascades, comparison, camera dives… |
| Process Journey | `process-journey` | Generic frame-addressable route recipe with stable traveling subject identity, visible stage handoffs, arrival state, focused nodes and optional MG1 follow-camera… |
| Diagram Stage | `diagram-stage` | Frame-addressable graph layouts with stable node/port identity, attached cubic connectors, arc-length data packets and customizable SVG rendering slots. |

## Cameras

Camera choreography for 2D stages and 3D scenes.

| Component | Install name | What it does |
|---|---|---|
| Camera Stage | `camera-stage` | Frame-addressable SVG camera with pan, zoom, roll, cuts, subject fitting and screen-space overlays, compiled to existing MG1 tracks. |
| 3D Camera Pose | `camera-pose-3d` | General quaternion and perspective/orthographic poses baked into existing MG1 channels; no engine import. |
| 3D Camera Rig | `camera-rig-3d` | Renderer-independent orbit, dolly, crane, tracking, lens and roll choreography compiled to existing MG1 tracks. |
| 3D Camera Viewport | `camera-viewport-3d` | Optional Three.js perspective viewport with absolute-frame camera evaluation, scene lifecycle, fixed overlays and WebGL recovery. |
| Cinematic Camera Director | `cinematic-camera-director` | Declarative semantic shots, world targets, bounded composition constraints and continuous quaternion handoffs compiled to MG1; optional Three.js preview. |
| Walk Camera | `craft-walk-camera` | First-person exploration hook: WASD/arrows, turn, run and drag-to-look with optional collision and floor callbacks, producing a plain camera pose for any viewer. |

## 3D asset toolkit

Building and handling physical 3D objects.

| Component | Install name | What it does |
|---|---|---|
| Crafted 3D Components | `crafted-3d` | Optional physically based material kit with deterministic surface microstructure, studio lights and a detailed modular hardware enclosure with semantic ports. |
| Procedural 3D Detail Kit | `craft-detail-kit` | Box-face construction details from a short spec: recessed screw sockets, vent plates with actual apertures, compression seams and instanced grip ribs. |
| Actual Solid Cutouts | `craft-solid-cutouts` | True CSG apertures and blind recesses within a host box, preserving wall thickness and visible interiors; powered by BVH-CSG with a bounded geometry budget. |
| Precise World-Space Text | `craft-text-label` | Exact SDF labels and signage on 3D objects with explicit licensed font URLs, sharp outlines and async readiness before frame capture. |
| Seeded 3D Scatter Placement | `craft-scatter-placement` | Reproducible surface/path/volume sampling, explicit separation constraints, material/geometry-preserving instancing and deterministic semantic transforms. |
| Procedural Background Environments | `craft-procedural-environments` | Native Three.js detailed facade geometry and tapered branch skeletons, plus seeded folded leaves and WebGL-compatible PBR material zones. |
| Image Relief 2.5D | `image-relief-2-5d` | Externally approved image + depth map → displaced 2.5D mesh, with bounded smoothing, silhouette mask, edge feathering and optional physical relighting. |
| Depth-Aware 2.5D Composite | `depth-composite-2-5d` | Back-to-front depth-relief image layers with alpha cutouts, real 3D occlusion and optional soft matte shadows conforming to a receiving relief; caller supplies clean plates and approved assets. |
| Crafted 3D Hero Toolkit | `crafted-3d-hero` | Domain-agnostic hero-asset toolkit: deterministic SDF sculpting with projected surface nets and baked cavity occlusion, shader micro-surface detail for UV-less meshes… |
| 3D Asset Quality Contracts | `crafted-3d-quality` | Deterministic, renderer-free checks for physical hero asset structure and manually reviewed photo evidence metadata. |
| Part Rig | `craft-part-rig` | Deterministic posing of separately animatable named parts in any Three.js hierarchy: translate, rotate about a pivot, scale, opacity (material clones, nested fades… |
| Inspectable Asset | `inspectable-asset` | Renderer-neutral adapter contract for 2D/3D assets: semantic part tree, frame-addressed bounds and anchors, states and declared capabilities, with structural… |
| Inspectable Asset (Three.js) | `inspectable-asset-three` | Inspect any HeroAsset through InspectableAsset: measured per-frame mesh bounds and anchors that follow moving parts. |
| Screen Surface | `screen-surface` | Binds browser or app content to an existing 3D device's display mesh: a canvas sized to the display's true aspect (never stretched), frame-addressed painting that… |
| People 3D | `people-3d` | Realistic rigged 3D people (casual adult, contractor) with a shared action vocabulary: idle, talk, walk (in place, with measured ground speed), wave, look around, think… |

## Asset motion and states

Showing how a 2D or 3D object opens, changes, flows or behaves.

| Component | Install name | What it does |
|---|---|---|
| Character Performance | `character-performance` | Serializable 2D/2.5D character rig specification, validated actions and deterministic per-frame animation sampling. |
| Exploded View 3D | `exploded-view` | Reversible hierarchical part separation with parent/local/world offsets, custom part/environment factories and camera-projected occlusion-aware annotations. |
| Section Reveal | `section-reveal` | Look inside intact assemblies without moving parts: isolate, ghost, sweeping section and capped section planned per absolute frame over any InspectableAsset, with… |
| Section Reveal (Three.js) | `section-reveal-three` | Applies SectionReveal frames to Three.js assets: per-mesh fades, world-space clipping planes on material clones and approximate stencil caps colored from real material… |
| Flow Path | `flow-path` | Illustrative directional flow along 2D/3D polylines or MG1 motion paths: arrows, streaks, particles, ribbon or pulse, pure per absolute frame with capped markers, seeded… |
| Flow Path (Three.js) | `flow-path-three` | Three.js FlowPath adapter: draw-on tube track, fixed-capacity instanced markers and a phase-driven ribbon. |
| Comparison Stage | `comparison-stage` | Fair side-by-side comparisons of 2D or 3D subjects: renderer-neutral slot layout from real-world extents with one shared px-per-meter and ground line (equal) or declared… |
| Asset State Sequence | `asset-state-sequence` | Frame-addressed transitions between an asset's supplied states: variant builds (e.g. |
| Asset State Sequence (Three.js) | `asset-state-sequence-three` | Composite HeroAsset over supplied variant builds with a single `sequence` action: overlay crossfades for same-shape variants, hashed-alpha dissolves for different… |
| Mechanism Sequence | `mechanism-sequence` | Frame-addressed operations on moving parts: rotate/slide with limits, declared part motions, continuous spins with spin-up/down integrated in closed form (real vs visual… |
| Mechanism Sequence (Three.js) | `mechanism-sequence-three` | Applies mechanism joint values to an asset's pivot objects over captured rest transforms: local-axis rotations, spins and slides, declared userData.motion, visibility or… |
| Environmental Effects | `environmental-effects` | Seeded, bounded, always-illustrative rain, storms (gusting wind integrated exactly), blizzards (streaking snow), snow, hail (fall, hop, settle), splashes, dust, drips… |
| Environmental Effects (Three.js) | `environmental-effects-three` | Fixed-size buffers for rain streaks, soft snow and dust points, instanced water droplets and noisy-edged stain decals, updated per frame and ignored by inspection and… |
| Inspect Then Quantify | `inspect-then-quantify` | Composition recipe: overview, camera push to a semantic target, reveal by the asset's own action, anchored annotation, then the scene yields to a linked chart with its… |

## Explainer scenes

Diagrams, evidence and comparisons that explain an idea on screen.

| Component | Install name | What it does |
|---|---|---|
| Causal System Stage | `causal-system-stage` | Signed causal diagrams with evidence classes, verb chips that state direction in words, do() interventions, counterfactual panels and feedback loops, laid out and… |
| Failure Cascade | `failure-cascade` | User-authored defect → effect → consequence graphs: validated ids, evidence, asset states and parts; cycle detection with the cycle path; unsupported-claim warnings… |
| Graph Topology Stage | `graph-topology-stage` | Typed nodes and edges with deterministic layered or seeded force layouts, identity-preserving transitions keyed by id, BFS/DFS traversal in visit order, declared… |
| Equation Typeset | `equation-typeset` | Optional MathJax 4 SVG typesetting adapter for equations with stable term identities: term positions from MathJax's own layout, browser-measured bounds, and term… |
| Code Stage | `code-stage` | Measured, pre-tokenized source code that reveals line by line, focuses a line range or one token occurrence, and edits between complete revisions with fixed line slots… |
| Evidence Stage | `evidence-stage` | Presents authorized photos, document excerpts and data tables with exact anchors (verified quotes, cell values, image regions), readable provenance and rights, focus… |
| Map Stage | `map-stage` | Caller-licensed GeoJSON-style geometry with mandatory attribution, equirectangular and orthographic projections fitted to the output, routes that draw by frame, pins… |
| Distribution Stage | `distribution-stage` | Distributions from samples, bins, pre-binned counts or a closed-form normal, with exact histogram counts, checked count/density axes, probability areas from the CDF or… |
| Scale Comparison Stage | `scale-comparison-stage` | Items of one dimension on one shared labelled linear or log scale, with exact rational unit conversions, a compare beat stating its ratio and rounding rule, and a… |

## Video production

Shaping, timing, captioning and exporting short-form and explainer video.

| Component | Install name | What it does |
|---|---|---|
| Interactive Branching Player | `interactive-branching-player` | Interactive video checkpoints, configurable response branches, scores and persistent viewer progress. |
| Character Presenter | `character-presenter` | React renderer of character-performance frames with per-part transforms, palette-driven layers and accessible labeling. |
| Semantic Scene Template Foundation | `scene-template-foundation` | Shared validated contracts, frame evaluator and responsive scene compositor for 24 new semantic recipe components. |
| Question Reveal Scene | `question-reveal` | Installable typed recipe preserving the question reveal intent; deterministic 4-phase composition and subject-specific inputs. |
| Hidden Detail Scene | `hidden-detail` | Installable typed recipe preserving the hidden detail intent; deterministic 4-phase composition and subject-specific inputs. |
| Before After Scene | `before-after` | Installable typed recipe preserving the before after intent; deterministic 4-phase composition and subject-specific inputs. |
| Side By Side Scene | `side-by-side` | Installable typed recipe preserving the side by side intent; deterministic 4-phase composition and subject-specific inputs. |
| Cause Effect Scene | `cause-effect` | Installable typed recipe preserving the cause effect intent; deterministic 4-phase composition and subject-specific inputs. |
| Scale Reveal Scene | `scale-reveal` | Installable typed recipe preserving the scale reveal intent; deterministic 4-phase composition and subject-specific inputs. |
| Context To Detail Scene | `context-to-detail` | Installable typed recipe preserving the context to detail intent; deterministic 4-phase composition and subject-specific inputs. |
| Layered Cutaway Scene | `layered-cutaway` | Installable typed recipe preserving the layered cutaway intent; deterministic 4-phase composition and subject-specific inputs. |
| Build And Connect Scene | `build-and-connect` | Installable typed recipe preserving the build and connect intent; deterministic 4-phase composition and subject-specific inputs. |
| Transform And Track Scene | `transform-and-track` | Installable typed recipe preserving the transform and track intent; deterministic 4-phase composition and subject-specific inputs. |
| Time Evolution Scene | `time-evolution` | Installable typed recipe preserving the time evolution intent; deterministic 4-phase composition and subject-specific inputs. |
| Data Story Scene | `data-story` | Installable typed recipe preserving the data story intent; deterministic 4-phase composition and subject-specific inputs. |
| Consequence Chain Scene | `consequence-chain` | Installable typed recipe preserving the consequence chain intent; deterministic 4-phase composition and subject-specific inputs. |
| Decision Branch Scene | `decision-branch` | Installable typed recipe preserving the decision branch intent; deterministic 4-phase composition and subject-specific inputs. |
| Worked Example Scene | `worked-example` | Installable typed recipe preserving the worked example intent; deterministic 4-phase composition and subject-specific inputs. |
| Demonstration Scene | `demonstration` | Installable typed recipe preserving the demonstration intent; deterministic 4-phase composition and subject-specific inputs. |
| Guided Inspection Scene | `guided-inspection` | Installable typed recipe preserving the guided inspection intent; deterministic 4-phase composition and subject-specific inputs. |
| Character Discovery Scene | `character-discovery` | Installable typed recipe preserving the character discovery intent; deterministic 4-phase composition and subject-specific inputs. |
| Evidence Reveal Scene | `evidence-reveal` | Installable typed recipe preserving the evidence reveal intent; deterministic 4-phase composition and subject-specific inputs. |
| Environment Reveal Scene | `environment-reveal` | Installable typed recipe preserving the environment reveal intent; deterministic 4-phase composition and subject-specific inputs. |
| Page Turn Story Scene | `page-turn-story` | Installable typed recipe preserving the page turn story intent; deterministic 4-phase composition and subject-specific inputs. |
| Orbit World Scene | `orbit-world` | Installable typed recipe preserving the orbit world intent; deterministic 4-phase composition and subject-specific inputs. |
| Timeline Journey Scene | `timeline-journey` | Installable typed recipe preserving the timeline journey intent; deterministic 4-phase composition and subject-specific inputs. |
| Glass Data Reveal Scene | `glass-data-reveal` | Installable typed recipe preserving the glass data reveal intent; deterministic 4-phase composition and subject-specific inputs. |
| Follow Subject Through Sections (FS1 Legacy) | `follow-subject-through-sections-fs1` | Original deterministic subject-path and layered scenery implementation retained for existing consumers. |
| Follow Subject Journey Scene | `follow-subject-through-sections` | Continuous subject across parallax worlds with motivated transitions and a contact landing. |
| Place-Shaped Image Reveal Scene | `place-shaped-image-reveal` | Real location silhouette filled with multiple sourced photographic plates. |
| Relief Map Expedition Scene | `relief-map-expedition` | A camera follows a route across sampled terrain, with spatial cues and elevation. |
| Nature World Identity Reveal Scene | `nature-world-identity-reveal` | Depth-layered camera move through foliage into a lit identity reveal. |
| Illustrated Book into Living World Scene | `illustrated-book-into-living-world` | Illustrated spreads transition into a photographic world. |
| Explainer Stage | `explainer-stage` | Measured essential text in safe regions around named protected subjects, with responsive portrait/landscape composition and explicit impossible-layout diagnostics. |
| Explainer Principles | `explainer-principles` | CPU-only preflight for explainer productions: declared shot purposes, identity continuity, frame-0 subjects, hook payoff, readable holds, independently authored outputs… |
| Explainer Production | `explainer-production` | Declarative CC1/MD1-linked explainer sequence with opt-in SD1/XP1 preflight, shared-frame preview, action contracts, explicit closing summary and deterministic capture… |
| Semantic Composition | `semantic-composition` | Compile MD1 event-linked actions, CC1 subject projection, critical visibility and measured explainer framing without duplicating camera or motion clocks. |
| Film Style Grammar | `film-style-grammar` | Versioned, data-only film-wide style grammars (Technical Drafting, Evidence Investigation, Connected Process World) that resolve prepared shot roles to existing native… |
| Short Hook Director | `short-hook-director` | Compiles action-first, unexpected-reveal, impact-statistic, transformation and evidence-question openings into an ordinary MotionDirector group plus a hook plan… |
| Short Safe Frame | `short-safe-frame` | Per-output reserved regions (app UI, caption lanes) for independently composed 9:16 and 16:9 frames: content area, CC1 and text-placement bridges, collision checks… |
| Caption Performer | `caption-performer` | Supplied timed captions at an absolute frame: optional aligned word highlighting, emphasis, speaker labels, CJK/RTL wrapping between aligned units, measured blocks… |
| Cut Director | `cut-director` | Compiles shots and cuts, match cuts, punch-ins, whip pans, masked or foreground wipes, dissolves and holds into a frame-addressable 2D shot plan over existing MG1… |
| Frame Accurate Clip | `frame-accurate-clip` | Deterministic footage: maps every output frame to an exact source frame (trim, rate, reverse, freezes, time remap, variable frame rate), reframes per output, and draws… |
| Audio Visual Cue | `audio-visual-cue` | Joins absolute-frame visual events to narration words, segments, music beats and sound effects: neutral word-timing format with parsers for WhisperX, OpenAI Whisper… |
| Freeze Frame Focus | `freeze-frame-focus` | Recipe that pauses footage or animation on an exact frame, pushes in on a tracked source-pixel annotation with a spotlight, explains it with measured callouts, then… |
| Waveform and Clip Trim Timeline | `audio-timeline-2d` | SVG waveform of caller-supplied peaks with a kept selection and playhead, and a clip timeline with a width-aware time ruler, trim handles, dimmed removed regions and… |
| Social Video Platform Presets | `video-platform-presets` | Versioned YouTube, Shorts, TikTok, Instagram, Facebook and LinkedIn export dimensions, timing and safe-area guidance. |
| Video Export Stage | `video-export-stage` | Frame-accurate export handshake for any 2D/3D Storybook explainer; shared manifest and capture surface for browser-to-MP4 export. |
| Interactive Branching Frames | `interactive-branching-frames` | Ten procedural SVG frames for the branching player (moss stone, marble colonnade, blossom branch, stone portico, leaf canopy, walnut lintel, forest grove, theater proscenium, adventure map, koi pond), drawn for the measured stage with text-safe ornament bands. |

## Illustration toolkit

Shared vocabulary and drawing primitives for the domain packs.

| Component | Install name | What it does |
|---|---|---|
| Domain Illustration Toolkit (2D) | `domain-illustration-2d` | Dependency-free SVG illustration kit: semantic color tokens, lit material gradients with useId-scoped defs, keyline and radius scales, plates, sheets, screens, coins… |
| Domain Object Vocabulary Contract | `domain-object-model` | Renderer-neutral kind-to-archetype vocabulary validation and absolute-frame reveal shared by domain object packs. |

## Finance, business and technology

Finance, business and technology objects, vocabularies and metric visuals.

| Component | Install name | What it does |
|---|---|---|
| Finance and Business Metric Data | `domain-metric-model` | Validated semantic data for trends, waterfall bridges and conversion funnels; zero-policy and exact accounting, shared by 2D and 3D. |
| Finance and Business 2D Visuals | `domain-metric-2d` | Frame-driven premium SVG finance and business visuals from one validated domain contract, with round axis ticks, proportional funnel flow bands and measured… |
| Finance and Business 3D Visuals | `domain-metric-3d` | Data-faithful Three.js chart geometry with real materials, CC1 camera framing, frame-driven reveals and readable HUD. |
| Finance and Business Object Vocabulary | `domain-finance-object-model` | Stable semantic identity for 61 named bank, payment, cash, loan, market and business objects grouped into 26 archetypes. |
| Finance and Business SVG Objects | `domain-finance-objects-2d` | Per-kind 2D SVG illustrations for 61 finance and business concepts (bank, card, ATM, documents, cash, markets and more) composed from the shared illustration toolkit… |
| Finance Hero 3D Assets | `domain-finance-hero-3d` | Crafted hero-tier finance assets: sculpted bull and bear (aged bronze or natural), banknotes and banded cash, proof coins, cast gold bars, money bag, payment cards and a… |
| Finance and Business 3D Objects | `domain-finance-objects-3d` | Finance and business 3D objects with CC1-framed exportable React viewer; kinds with crafted hero assets (bull/bear, cash, coins, gold, money bag, cards, bank) render… |
| Finance Object Reference Review | `domain-finance-object-review` | Reference URLs and review status for each finance/business 3D object; not an automatic photorealism claim. |
| Business Object Vocabulary | `domain-business-object-model` | Seventeen business operations concepts (org chart, team, meeting, presentation, KPI dashboard, target, milestone, deadline, workflow, checklist, idea, announcement… |
| Business SVG Objects | `domain-business-objects-2d` | Brand-free 2D SVG illustrations for every business kind, composed from the shared illustration toolkit with themeable tokens and an accessible frame. |
| Technology Object Vocabulary | `domain-technology-object-model` | Eighteen vendor-neutral technology concepts (server rack, router, database, storage disk, cloud, API connector, laptop, mobile phone, processor, AI model, security lock… |
| Technology SVG Objects | `domain-technology-objects-2d` | Vendor-neutral 2D SVG illustrations for every technology kind, composed from the shared illustration toolkit with themeable tokens and an accessible frame. |

## Home

A house as data, with plans, sections, dimensions and weather.

| Component | Install name | What it does |
|---|---|---|
| Home Model | `domain-home-model` | Renderer-neutral house spec, presets and validated layout plus customizable interiors: floor plans (rooms tiling the footprint, connections), derived walls and doors… |
| Home Kit 3D | `domain-home-3d` | Crafted layered 3D houses from a HouseSpec: envelope, structure and systems plus furnished interiors (partitions, interior doors, ~40 furniture/fixture kinds… |
| Home Dimensions | `domain-home-dimensions` | Measured DimensionOverlay specs for a HouseLayout from the same model the 3D build uses: envelope, wall and roof layer stacks, foundation depth, window opening, roof… |
| Home Effects | `domain-home-effects` | EnvironmentalEffects presets for a HouseLayout: rain, storm, blizzard, snow day (roof and ground cover on the real roof planes), hail, snowfall, a roof leak with a… |
| Home Kit 2D Section | `domain-home-section-2d` | SVG cross-section of a HouseLayout with the same semantic part IDs, anchors and service routes as the 3D build: layered walls and roof, foundations, soil, x-ray… |
| Home Floor Plan 2D | `domain-home-floor-plan-2d` | Architectural SVG floor plan of any storey from the same interior plan: walls, windows, door swings, bifolds, finishes, room labels with areas, furniture symbols and… |

## Privacy and files

Photos, documents, locations and file formats.

| Component | Install name | What it does |
|---|---|---|
| File Format Objects | `file-format-2d` | 2D file sheets with a validated, measured format badge (MOV, HEIC, WAV and similar) and a kind glyph, plus a conversion view from one format to another; badge labels… |
| Location Tag Drawings | `location-pin-2d` | 2D drawings of a photo or listing location tag: an exact pin, an approximate area, or a stripped tag, over an abstract street grid (no map data); coordinates are… |
| Document Page States | `document-page-2d` | 2D drawings of one document page in four stages: a scan with no text layer, a text layer added by OCR, a black box over text that is still present, and a flattened… |


### Cave identity variant

`cave-identity-reveal` exports `CaveIdentityRevealScene`: caller-supplied cave plate and rock depth layers, stable forward camera, quiet identity reveal and reduced motion. Uses `scene-template-foundation`; [API and example](component-specs/cave-identity-reveal.md).
