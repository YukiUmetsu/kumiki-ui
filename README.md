# Kumiki UI

**Reusable building blocks for interfaces, illustrations, animated explainers, video scenes and 2.5D/3D visuals.**

Kumiki (組木, Japanese joinery) is a **source-distributed React + TypeScript registry**: choose existing parts, install their source, and combine them into a custom result. It includes accessible UI components, data visualizations, frame-addressable motion, cinematic scene recipes, characters, camera tools and optional Three.js graphics.

**Think of Kumiki as the visual construction toolkit.** Your app or content-production agent decides *what to say and show*; Kumiki supplies reusable ways to draw, animate, inspect and export it. Kumiki does **not** generate images, estimate depth, choose licensed footage or automatically produce a finished film from a prompt. [ContentGen](docs/13-content-creation-integrations.md) can orchestrate those upstream decisions.

**Start here:** [What you can build](#what-you-can-build) · [See it running](#see-it-running) · [Find the right component](#find-the-right-component) · [For coding agents](#for-coding-agents) · [Use components in a project](#use-components-in-a-project) · [Quality and status](#quality-and-status)

## What you can build

Pick the **result you want**, then use the catalog to find real installable packs. The IDs below exist in [`registry.json`](registry.json), not in a speculative roadmap.

| I want to… | Kumiki can provide | Start with these registered packs |
|---|---|---|
| **Build an app or dashboard** | Accessible controls, forms, dialogs, navigation, tables, search and complete application patterns | `button`, `dialog`, `table`, `search-and-results` |
| **Explain an idea visually** | Animated graphs, causal steps, process journeys, reveals, comparisons and measurable diagrams | `diagram-stage`, `process-journey`, `causal-system-stage`, `graph-topology-stage` |
| **Make an infographic** | Semantic layouts, charts, data stories, domain illustrations and exportable graphic compositions | `infographic-system`, `infographic-view`, `chart-story`, `domain-illustration-2d` |
| **Create an animated video scene** | Reusable scene templates, cuts, camera motion, animation tracks and precisely timed reveals | `scene-template-foundation`, `motion-director`, `camera-stage`, `cause-effect` |
| **Edit footage and prepare video export** | Frame-exact source clips, captions, narration/sound cues, composition and export adapters | `frame-accurate-clip`, `caption-performer`, `audio-visual-cue`, `video-export-stage` |
| **Animate a presenter or character** | Layered 2D/2.5D character rigs, expressions, mouth shapes, gestures, frame-addressable actions; optional 3D people | `character-presenter`, `character-performance`, `people-3d` |
| **Turn authored imagery into moving 2.5D** | Displaced photo geometry, image layers, cutout occlusion, projected soft shadows and Three.js camera moves | `image-relief-2-5d`, `depth-composite-2-5d`, `camera-viewport-3d` |
| **Build crafted 3D objects and environments** | PBR materials, lighting, physical details, sculpted hero assets, cameras and scene inspection | `crafted-3d`, `craft-detail-kit`, `crafted-3d-hero`, `camera-viewport-3d` |
| **Visualize a house or physical system** | House geometry, floor plans, sections, component inspection, measurements, environmental effects and cost explanations | `domain-home-3d`, `domain-home-floor-plan-2d`, `inspectable-asset`, `dimension-overlay` |
| **Show business/technology concepts** | Editable 2D/3D semantic objects and illustrations rather than AI-generated fake text or numbers | `domain-finance-objects-2d`, `domain-finance-objects-3d`, `domain-illustration-2d` |

**What this table means:** these are implemented registry entries, not promises of universally approved visuals. Some packs are still development implementations with **human visual review pending**, especially cinematic and 3D work. Check each pack's spec, Storybook example and review status before production use.

### Which visual route should I choose?

| Your source/goal | Usually choose | Why |
|---|---|---|
| Exact text, diagrams, amounts or a process | **2D SVG/DOM** (`diagram-stage`, `infographic-view`) | Data and lettering stay sharp, editable and correct |
| Great image, gentle camera move | **Single 2.5D relief** (`image-relief-2-5d`) | Creates modest image depth without constructing an entire 3D world |
| Image with separated foreground and clean background | **Layered 2.5D** (`depth-composite-2-5d`) | Masks, actual depth ordering and subtle projected shadows improve parallax |
| Orbit, cutaway, moving mechanism or close material inspection | **Actual 3D** (`crafted-3d`, `inspectable-asset`) | Geometry remains valid as the viewpoint or parts change |
| Real captured footage | **Clip-led scene** (`frame-accurate-clip`) | Keep the actual source and add camera reframing, captions and explanations |

For a video, the overall sequence is **approved script/data/visual assets → scene recipe → frame-addressable motion/camera/captions → render/export → visual QA**. ContentGen can plan the upstream assets; Kumiki implements the visuals and time-based composition.

For the full inventory grouped by purpose, see the [Component Catalog](docs/02-component-catalog.md). For proposed libraries that could improve the detail further, see the [Three.js visual-detail research](docs/25-threejs-ecosystem-quality-research.md); those external libraries are **not** installed merely because they appear in the research.

## See it running

Use **Node.js 24** and the repository lockfile. In the repository root:

```bash
npm install
npm run storybook
```

Open **http://localhost:6006**, then try these real Storybook stories (links work while Storybook is running locally):

| To understand… | Open in Storybook |
|---|---|
| Everything available | [Start here → Component Catalog → Browse](http://localhost:6006/?path=/story/discover-unified-component-catalog--browse) |
| Motion and subject choreography | [Motion engine → Motion Director → Reference Production](http://localhost:6006/?path=/story/motion-motion-director--reference-production) |
| Editable explainer scenes | [Video production → Scene Templates → Question Reveal](http://localhost:6006/?path=/story/video-production-scene-templates--question-reveal) |
| A photo with camera depth | [3D asset toolkit → 2.5D Image Relief → Camera Inspection](http://localhost:6006/?path=/story/craft-25d-image-relief--camera-inspection) |
| Layered foreground/background and shadows | [3D asset toolkit → 2.5D Depth Composite → Layered Jungle](http://localhost:6006/?path=/story/craft-25d-depth-composite--layered-jungle) |
| Small meaningful 3D construction details | [3D asset toolkit → Procedural Detail Kit → Field Instrument](http://localhost:6006/?path=/story/craft-3d-detail-kit--field-instrument) |

The image-relief and depth-composite demos illustrate their **APIs and motion**, not approved real-depth reconstruction. Their current Storybook builds passed, but GPU frame captures and human aesthetic acceptance are still outstanding.

For the browsable showcase application instead:

```bash
npm run dev
```

Open the URL printed by Vite (usually **http://localhost:5173**) and use `#/catalog`. Other routes include `#/media`, `#/infographic`, `#/motion`, `#/patterns` and `#/storyboard/*`.

## Find the right component

### Human workflow

1. **Browse by goal:** open the [catalog in the showcase](docs/component-specs/unified-component-catalog.md) or Storybook **Start here → Component Catalog**; filter by renderer and purpose.
2. **Inspect a preview:** open a real Storybook story, check its limits and whether human visual review has occurred.
3. **Read the spec:** most complex packs have a document under [`docs/component-specs/`](docs/component-specs), linked from the [documentation index](docs/INDEX.md).
4. **Install only what you need:** use the pack's registry ID and declared dependencies; customize the installed source in your own project.

### Terminal workflow — also works for agents

```bash
# Find candidates by intent (deterministic, offline, no AI model or GPU).
npm run catalog:find -- --query="diagram" --type=pack --format=json
npm run catalog:find -- --query="character" --type=pack --format=json
npm run catalog:find -- --query="relief" --type=pack --format=json

# Inspect one exact candidate and its dependency-first install order.
npm run catalog:find -- --id=pack:image-relief-2-5d --format=json

# Inspect real TypeScript exports, signatures, props and literal defaults.
npm run catalog:api -- --id=image-relief-2-5d --export=createImageReliefFromSources --format=json
npm run catalog:api -- --id=button --export=Button --format=json

# Validate the installed inventory; list every indexed item if needed.
npm run catalog:check
npm run catalog:find -- --all --format=json
```

`catalog:find` tells you **what exists**: source files, registry name, dependencies, preview and review metadata. `catalog:api` tells you **how to call it**, using the checked-in TypeScript source. **Do not invent props from a search result.** For complex behavior, inspect the linked source and spec as well.

The catalog indexes registered packs, domain objects and curated heroes. A named object is not necessarily its own installable component; use its `registryItem` and `installOrder` fields. A 3D hero being indexed does not establish visual approval.

## For coding agents

Read [`AGENTS.md`](AGENTS.md) and [`docs/INDEX.md`](docs/INDEX.md) first. Kumiki is deliberately discoverable **without embeddings, web access, screenshots or loading a 3D renderer**.

Use this repeatable selection process:

1. Translate the user's request into a **visual intent**: for example, “show a mechanism opening,” “animate a cause and effect,” or “make a forest image move in depth.”
2. Run `catalog:find` for that intent; list the most relevant real registry IDs and their renderer, dependency closure, specs and preview.
3. Choose the **smallest existing composition** that satisfies the scene. For example, use a 2D diagram for an exact process, an image-relief layer for a modest photo camera move, and real 3D only when the camera or construction requires it.
4. Run `catalog:api` on the chosen pack or export. Read the spec and source where the API or resource ownership is nontrivial.
5. Reuse the existing **absolute-frame motion system** and camera/export adapters. Do not create a second clock, Three.js renderer, generic diagram engine, or made-up registry item.
6. Verify with TypeScript, relevant tests, Storybook, `catalog:check` and a clean registry fixture. Report browser/human visual QA as **pending** unless actually performed.

**Copyable agent task template:**

```text
Goal: [the visual and why it helps the audience]
Output: [UI | infographic | scene | video] at [aspect/resolution]
Assets: [approved source images, depth/alpha, GLB, data, narration, rights]

1. Read AGENTS.md and the README capability map.
2. Search catalog:find by intent; report exact installed registry IDs.
3. Inspect catalog:api plus specs for the selected exports.
4. Compose existing packs before adding a new primitive.
5. Use exact frame numbers, semantic IDs, readable text and actual source data.
6. Run relevant checks and report visual review separately from code checks.
```

For developer-facing API details, see [Unified Component Catalog](docs/component-specs/unified-component-catalog.md). For the mandatory media and 3D quality constraints, see [visual-production-contract](docs/visual-production-contract.md) and [3D visual fidelity](docs/14-3d-visual-fidelity.md).

## Use components in a project

Kumiki distributes **source through a shadcn-compatible registry**; it is not an npm runtime package or a hosted video-generation API. `registry.json` contains the exact installable items and dependency links. Use a **pinned, published registry URL** for installation into an external app and review the diff; this README intentionally does not invent an unpublished `shadcn add` URL. Consumer-owned source does not update automatically.

Once a `button` source item is installed at its manifest target, you can use it like an ordinary React component:

```tsx
import { Button } from "./components/ui/button";

export function ContinueAction() {
  return <Button variant="primary" onClick={() => console.log("continue")}>Continue</Button>;
}
```

For a browser scene that already has approved color and corresponding depth image URLs, the `image-relief-2-5d` item offers a short 2.5D path:

```ts
import { createImageReliefFromSources } from "./components/craft/image-relief";

const relief = await createImageReliefFromSources(
  { schemaVersion: 1, id: "forest", width: 4.8, height: 2.7, depthScale: 0.15 },
  { colorSrc: "/assets/forest-color.png", depthSrc: "/assets/forest-depth.png" },
);
scene.add(relief.mesh);
// Move the existing Kumiki camera by absolute frame; when done: relief.dispose().
```

The second example assumes a browser, CORS-accessible assets with the **same framing**, and an existing Three.js `scene` and camera renderer. It does not generate a depth image; create/review one upstream (e.g., ComfyUI). For cutout foregrounds, cleaned backgrounds and projected shadows, choose [`depth-composite-2-5d`](docs/component-specs/depth-composite-2-5d.md). Do not put exact text or numbers inside generated imagery; render them separately.

### What happens under the hood

- **Canonical source** is under `registry/`; `src/**` contains stories and demo/showcase integrations. Consumers install selected source into their own tree.
- **Themes** use DTCG tokens (`foundations/tokens/kumiki.tokens.json`) compiled to CSS variables prefixed `--km-*`. `data-km-appearance="light|dark"` and `data-km-density="compact|spacious"` change semantic roles without altering component logic.
- **UI primitives** use native elements and Base UI for accessible behavior. Advanced packages remain optional.
- **Motion** uses typed MG1 tracks and reproducible **absolute-frame evaluation**; compositions combine with existing camera, clip, audio and export adapters.
- **2.5D/3D** uses optional Three.js source packs. Existing depth maps, meshes, textures and licensed assets are supplied and owned by the host; Blender work belongs to the separate `kumiki-blender` repository.

## Quality and status

**Available in the registry ≠ visually approved.** In particular, a successful typecheck, compiled Storybook or generated screenshot does not prove that a cinematic, asset or 3D scene is attractive at delivery resolution. Every ambitious video/3D shot still needs source review, close-up/whole-frame captures, 16:9 and 9:16 inspection, performance checks and human aesthetic approval.

| Stage | What to trust |
|---|---|
| `registry.json` / `catalog:find` | The item and its install dependencies exist in this checkout |
| `catalog:api` | The source exports, parameter types and documented/literal defaults |
| Tests / Storybook build | Specified software behavior and the ability to compile—not photographic quality |
| Per-component verification report | Only the checks actually recorded there; pending gates remain pending |
| Approved film/asset | Actual recorded render evidence **and** human visual acceptance |

The 2.5D image-relief, depth-composite and procedural detail-kit features are present on the **`feat/image-relief-2-5d` feature branch** and remain unapproved for final visual release. Research into CSG, real 3D labels and native scene generators is a plan, not integrated runtime functionality. The rest of the repository also contains a mix of established UI components and development-stage media/video components; read individual specs for their status.

### Local checks

```bash
npm run typecheck
npm run catalog:check
npm run catalog:api:check
npm run registry:validate
npm run registry:smoke
npm run registry:fixture -- --item=button  # clean consumer compile
npm test                                     # Vitest
npm run build-storybook
npm run test:e2e                             # requires installed Playwright browsers
```

For token/theme work: `npm run tokens:validate`, `npm run tokens:build`, `npm run tokens:themes`, `npm run contrast:audit`. For video recipes, `npm run scenes:test` runs the focused scene suite. Full browser/video review is a separate gate; it can require media dependencies and hardware-accelerated WebGL.

## Repository map

| Path | What it is for |
|---|---|
| [`registry.json`](registry.json) | Authoritative installable registry IDs, files, dependency links |
| [`registry/ui`](registry/ui), [`registry/patterns`](registry/patterns) | Accessible UI pieces and application patterns |
| [`registry/media`](registry/media), [`registry/infographic`](registry/infographic) | Artboards, graphic documents, charts and infographic systems |
| [`registry/motion`](registry/motion), [`registry/video`](registry/video) | Animation engines, scenes, camera/clip/export adapters |
| [`registry/character`](registry/character), [`registry/craft`](registry/craft), [`registry/domains`](registry/domains) | Character rigs, optional 2.5D/3D craftsmanship, semantic domain assets |
| [`src`](src) | Showcase app, Storybook previews, demo assets and gallery code |
| [`docs/02-component-catalog.md`](docs/02-component-catalog.md) | Human-readable complete registry inventory grouped by purpose |
| [`docs/INDEX.md`](docs/INDEX.md), [`docs/component-specs`](docs/component-specs) | Component contracts, limitations and verification evidence |
| [`AGENTS.md`](AGENTS.md), [`skills/kumiki-ui`](skills/kumiki-ui) | Agent engineering instructions and reusable skill |
| [`scripts`](scripts), [`tests`](tests) | Catalog tools, validation, consumer fixtures, behavior and visual tests |

## More documentation

- [Documentation index](docs/INDEX.md) — authoritative routing to specifications and verification reports.
- [Design foundations](docs/01-design-foundations.md) — tokens, typography, appearance, density, interaction and motion.
- [Full component catalog](docs/02-component-catalog.md) — grouped capability inventory, exact registry IDs.
- [Component standards](docs/03-component-standards.md) and [quality gates](docs/04-quality-and-testing.md) — contracts for completed work.
- [Development and registry](docs/05-development-and-registry.md) — source distribution, integration and licensing.
- [Explainer visual components](docs/17-explainer-visual-components.md) — how to choose meaningfully animated visual treatments.
- [Three.js-compatible detail research](docs/25-threejs-ecosystem-quality-research.md) — candidates for future non-Blender improvements.

**Kumiki's design goal:** precise, customizable composition and credible, purposeful motion—supported by inspectable source, honest QA status and reusable visual parts, rather than code generated from scratch for every shot.
