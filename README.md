# Kumiki UI

**A customizable, accessible React component system built for consistently exceptional interfaces.**

Kumiki (組木, Japanese joinery) represents precise, composable craftsmanship. Its goal is not to impose one aesthetic: **share the quality of the interaction, not a fixed theme**. Every component should remain attractive and functional in different palettes, typography, densities, languages, and layouts.

## Scope

- A **source-distributed shadcn registry**: applications install and own component code, without requiring a shared runtime library.
- **Semantic design tokens** for appearance, typography, spacing, elevation, motion and density, independent of component behavior.
- Accessible components built primarily on **Base UI**; complex, self-contained collections may use **React Aria** where justified.
- **Storybook + automated checks + human review** as the release contract. A screenshot that looks polished is not sufficient.
- Reusable interaction patterns, only after foundational components prove stable.

## Status

**Phase 0 of the [roadmap](docs/06-roadmap.md) is implemented and verified**: the DTCG token pipeline (`foundations/tokens` → `src/styles/tokens.css`), the Vite + Tailwind + Storybook scaffold, and the `Button`, `Field/Input` and `Dialog` components with tests, stories, browser checks and screenshots. The twelve components of Phase 1 are **not** implemented yet — see the [component catalog](docs/02-component-catalog.md) and the [roadmap](docs/06-roadmap.md).

```bash
npm install
npm run tokens:validate  # validate the DTCG source
npm run tokens:build     # regenerate src/styles/tokens.css from the DTCG source
npm run typecheck && npm run lint && npm test
npm run test:e2e         # Playwright: built showcase, axe, overflow/contrast/focus, baselines
npm run build && npm run build-storybook
npm run registry:validate && npm run registry:smoke
```

Component specs with their actual evidence: [Button](docs/button-spec.md),
[Field + Input](docs/field-spec.md), [Dialog](docs/dialog-spec.md).

The items under `registry/ui/` are self-contained modules, but they consume the `--km-*` CSS custom properties and the Tailwind theme bridge declared in `src/styles/tokens.css` and `src/styles/global.css`. An application that installs a component must load that stylesheet (or an equivalent) first.

## Start here

1. Read [AGENTS.md](AGENTS.md) and the [documentation index](docs/INDEX.md).
2. Review the **explicit initial component inventory** in [docs/02-component-catalog.md](docs/02-component-catalog.md).
3. Build the first vertical slice in [docs/06-roadmap.md](docs/06-roadmap.md).
4. Verify real rendered states and installation into a clean example app before expanding.

For an OpenCode session:

```bash
opencode
```

Suggested instruction: **“Read AGENTS.md and docs/INDEX.md, implement only Phase 0 in docs/06-roadmap.md, run the stated quality checks, and stop with a verified report.”** Any model may be used; Kumiki never depends on a particular one.

**Definition of premium:** consistent hierarchy, readable content, precise composition, accessible and predictable interactions, graceful states and recovery, appropriate motion, and no visible rough edges.
