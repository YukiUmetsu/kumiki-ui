# Kumiki UI

**A customizable, accessible React component system for consistently exceptional interfaces.**

Kumiki (組木, Japanese joinery) is precise, composable craftsmanship. It does not impose one look: **share the quality of the interaction, not a fixed theme**. Every component should stay attractive and functional across different palettes, typography, densities, languages and layouts.

Kumiki is a **source-distributed registry** of components, patterns, media and motion primitives — not a runtime component package. Consumers install the source, own it, and restyle it with semantic tokens.

MotionDirector's [choreography compiler](docs/component-specs/motion-director.md)
coordinates existing MG1 tracks, cameras and VT1 transitions. In Storybook, open
**Motion → Motion Director → Reference Production** for a 54-second study with
36 independent subjects, six sequences, portrait framing and editable motion
controls. The optional 3D story reuses the existing camera viewport.

## Core concepts

### 1. Source-distributed registry

- Components are distributed as source through a GitHub-hosted **shadcn registry**. Applications install code into their own tree and customise it freely.
- The single source of truth lives under `registry/`, split into `registry/ui/`, `registry/patterns/`, `registry/media/`, `registry/motion/` and `registry/infographic/`.
- `registry.json` lists the installable items; `src/**` contains thin showcase aliases (for example `src/ui/button.tsx` re-exports `registry/ui/button`) so the published artifact is never forked.
- Installed copies **do not receive updates automatically**; pin releases and review diffs. See [docs/05](docs/05-development-and-registry.md).

### 2. Semantic design tokens and the `--km-*` contract

- Tokens are authored as **DTCG** in `foundations/tokens/kumiki.tokens.json`.
- `npm run tokens:build` generates `src/styles/tokens.css`; `src/styles/global.css` imports it and bridges the values into Tailwind's utility namespaces (keeping `var()` references so runtime switching works).
- Public names are contractually prefixed: CSS variables `--km-*`, scope attributes `data-km-*`. Installed component code depends on these variables, so consumers must load `tokens.css` (or an equivalent) before using it.

### 3. Appearance and density theming

Appearance and density are re-pointed at runtime by attributes on `<html>` (or any ancestor), so one set of components serves many contexts:

| Attribute | Values | Purpose |
|---|---|---|
| `data-km-appearance` | `light`, `dark` | Re-points semantic colour roles |
| `data-km-density` | `compact`, `spacious` | Adjusts spacing/control metrics |

Multiple themes are validated from the same DTCG pipeline (`npm run tokens:themes`, `npm run contrast:audit`).

### 4. Base UI as the accessible primitive layer

- General composites are built on **Base UI** (`@base-ui/react`) plus native HTML semantics.
- **React Aria** is reserved for clearly isolated, justified advanced widgets, and specialised optional packages (table, virtualiser, drag-and-drop) never leak into unrelated primitive installs.
- Accessibility is treated as behaviour: keyboard focus, overlays, IME, screen-reader output and reduced motion are verified in unit and browser tests.

### 5. The release contract

A polished default screenshot is not sufficient. Delivery is Storybook **plus** automated checks **plus** human review:

- `npm test` (Vitest + Testing Library, including Storybook browser tests via the Vitest addon)
- `npm run test:e2e` (Playwright: built showcase, axe-core, overflow/contrast/focus, screenshot baselines)
- `npm run registry:validate` / `npm run registry:smoke` / `npm run registry:fixture` (metadata, staged files, clean-consumer install)
- Storybook stories for every state, then an inspected visual review

### 6. Media, motion and infographic pipeline

The media tracks compile one **semantic source** through **layout** into **renderer-neutral primitives**, then render to DOM/SVG:

- **Media** composes a shared `media-document` schema/validator/exporters with editable, pin-able visual modules (16:9 / 9:16 artboards, frames, layers, guides).
- **Motion (MG1)** evaluates typed keyframe tracks, easing and springs into frame-addressable output, and serialises storyboards to a versioned format; renderers are pure functions of one integer frame.
- **Infographic** turns a semantic document into layouts (`editorial-grid`, `bento-grid`), information blocks, chart visualizers and parameterised templates, resolved to DOM, SVG or PNG.

Canonical code lives in `registry/`; `src/media`, `src/motion` and `src/infographic` are showcase aliases.

## What's possible

See the showcase app (`npm run dev`, then the route) or Storybook (`npm run storybook`) for every item below.

### Components — `src/ui` (32) · route `#/`

Accordion, Alert, Badge, Breadcrumbs, Button, Checkbox, Combobox, Command Palette, Dialog, Dropdown Menu, Field/Input, Form Summary, Icon Button, Input, Listbox, Popover, Progress, Radio Group, Searchable Results, Select, Separator, Sidebar, Skeleton, Slider, Split Pane, Surface Card, Switch, Table, Tabs, Textarea, Toast, Tooltip.

### Patterns — `src/patterns` (6) · route `#/patterns`

Data Details Workspace, Guided Form, Process Monitor, Resource Explorer, Search and Results, Settings Section.

### Media — `src/media` · route `#/media`

Media Document (shared schema/validator/exporters), Artboard, Editable Text, Media Frame, Layer Stack, Alignment Guides, Export Preview.

### Motion and storyboards — `registry/motion` · routes below

Typed keyframe tracks, easing, springs and stagger; sequence/parallel nesting; path trim and vector draw; mask reveal; shape morph; shared-element transitions; kinetic typography; versioned motion presets; scene storyboards; diagram stage (animated semantic graphs with attached connectors and data packets); progressive reveal; exploded view; visual transformation (MG1 recipes with explicit fallback); 2D camera choreography; optional Three.js 3D camera rig/viewport; SVG graphic composition.

| Route | Surface |
|---|---|
| `#/motion` | Motion gallery |
| `#/storyboard/camera` | 2D + 3D camera storyboard |
| `#/storyboard/reveal` | Progressive reveal |
| `#/storyboard/diagram` | Diagram stage |
| `#/storyboard/exploded` | Exploded view |
| `#/storyboard/transformation` | Visual transformation |

### Infographic — `registry/infographic` · route `#/infographic`

Semantic source → layout → renderer-neutral primitives → DOM/SVG/export. Includes:

- Layout engines `editorial-grid` and `bento-grid`, driven by ordered section kinds: text, statistic, process, comparison, timeline, hierarchy, chart, diagram, quote.
- Information blocks, chart visualizers and annotations.
- Six art directions (editorial, scientific, cinematic, minimal-technical, illustrated, sketch) and six output profiles (landscape, portrait, square, Pinterest vertical, article inline).
- Seven parameterised templates: `editorial-overview`, `bento-summary`, `process-journey`, `data-story`, `educational-carousel`, `visual-cheat-sheet`, `layered-architecture`.

Example sources live in `examples/infographic/`.

## Quickstart

```bash
npm install

# Tokens (DTCG source → generated CSS, themes, contrast)
npm run tokens:validate
npm run tokens:build
npm run tokens:themes
npm run contrast:audit

# Static checks and unit tests
npm run typecheck && npm run lint && npm test
npm run test:watch            # watch mode

# Browser / end-to-end checks (Playwright, axe, screenshots)
npm run test:e2e

# Production build and local preview
npm run build
npm run preview

# Registry metadata and clean-consumer install
npm run registry:validate
npm run registry:smoke
npm run registry:fixture      # optional: compile one item into a fresh consumer
```

### Run Storybook

```bash
npm run storybook         # storybook dev -p 6006
```

Then open **http://localhost:6006**. Storybook loads every `src/**/*.stories.tsx`, with the a11y and docs addons enabled, and sorts the sidebar by surface: **Components · Patterns · Media · Motion · Infographic · Pages**. The infographic group walks through layout engines, structure visualizers, charts, information blocks, templates, art directions and illustration; the motion group includes storyboard slices such as camera, progressive reveal, diagram stage, exploded view and visual transformation. For a deployable static build:

```bash
npm run build-storybook   # outputs to storybook-static/
```

### Run the showcase app

```bash
npm run dev               # Vite dev server (prints the local URL, default http://localhost:5173)
```

The app is a hash router over these surfaces:

| Route | Surface |
|---|---|
| `#/` (default) | Component gallery |
| `#/patterns` | Application patterns |
| `#/media` | Media compositions |
| `#/infographic` | Infographic gallery |
| `#/motion` | Motion gallery |
| `#/storyboard/*` | Storyboard slices (see the table above) |

## Repository map

| Path | Contents |
|---|---|
| `registry/ui`, `registry/patterns`, `registry/media`, `registry/motion`, `registry/infographic` | Canonical, installable component source |
| `registry.json` | Registry manifest of installable items |
| `src/ui`, `src/patterns`, `src/media`, `src/motion`, `src/infographic` | Showcase aliases re-exporting `registry/*` |
| `src/pages` | Showcase pages rendered by the hash router in `src/main.tsx` |
| `foundations/tokens` | DTCG token source |
| `src/styles` | Generated `tokens.css`, Tailwind bridge + base styles (`global.css`) |
| `docs` | Standards and specs — start at [`docs/INDEX.md`](docs/INDEX.md) |
| `tests` | Unit tests (`tests/*.test.ts(x)`) and Playwright specs + baselines (`tests/e2e`) |
| `scripts` | Token build/validate, contrast audit and registry tooling |
| `examples` | Non-production samples (tokens, themes, media, motion, infographic) |
| `templates`, `skills` | Component-spec template and agent skills |

## Status

- **General UI: delivered well beyond the initial foundation.** The Phase 0 scaffold (token pipeline, Vite + Tailwind + Storybook, Button, Field/Input, Dialog) has grown to **32 UI components and 6 patterns**. Specs are written per delivered slice under `docs/component-specs/`; not every component has a long-form spec yet.
- **Media, motion and infographic: in progress.** Media slice M0 (`media-document`, artboard, frame, editable text, layers, guides, export preview), the MG1 typed-motion engine, and infographic layout/renderer slices are implemented. The newest motion slices — `camera-stage`, `camera-rig-3d`, `progressive-reveal`, `storyboard-shots`, `diagram-stage`, `exploded-view` and `visual-transformation`, plus infographic work — are development implementations whose **expanded QA and visual acceptance are deferred, not passed**.
- **`registry.json` currently lists 64 installable items.**

This README does not assert any roadmap exit gate as passed. For the authoritative sequence, evidence and remaining gates, read [`docs/06-roadmap.md`](docs/06-roadmap.md) and the [motion V1 verification report](docs/verification/2026-10-17-motion-v1.md).

## Documentation

- [`docs/INDEX.md`](docs/INDEX.md) — short index of the standards and the full list of delivered component specs.
- [`docs/component-specs/`](docs/component-specs) — the long-form specs for delivered components, with their actual evidence and known limits.
- [`AGENTS.md`](AGENTS.md) — the non-negotiable engineering rules.
- [`templates/component-spec.md`](templates/component-spec.md) — the spec template every component follows.

**Definition of premium:** consistent hierarchy, readable content, precise composition, accessible and predictable interactions, graceful states and recovery, appropriate motion, and no visible rough edges.
