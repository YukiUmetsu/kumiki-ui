# 05 — Architecture, Local Development, Registry and Licensing

Kumiki distributes **source**: consumers install components from a GitHub-hosted shadcn registry and can customize local copies. This avoids forcing every application to share a runtime package, but installed copies **do not receive bug fixes automatically**. Use pinned releases and reviewed updates.

## Technology decisions

| Area | Default | Add an alternative only when |
|---|---|---|
| Primitive behavior | Base UI and native HTML | A clearly isolated complex collection benefits from React Aria; existing Radix code is not a migration mandate |
| Styling | Tailwind CSS v4 + CSS variables | Plain CSS better solves a narrow requirement without breaking tokens |
| Tokens | DTCG JSON → validated CSS vars | Additional platform exports are needed |
| Motion | CSS first | Motion enables purposeful interruptible/layout animation |
| Variants | Small typed variants / CVA if useful | There is a real API need—not a combinatorial style system |
| Icons | Consistent accessible icon family (e.g. Lucide) | Consumers provide an alternative icon set |
| Component demos | Storybook | No alternative for v0.1 |
| Tests | Vitest, Testing Library, Playwright, axe-core | Specialized browser/runtime QA requires it |
| Distribution | GitHub shadcn registry | A runtime npm package solves a demonstrated synchronization need |

Specialized optional widgets may use React Aria Tree, TanStack Table, a virtualizer or drag-and-drop toolkit. **Do not add these dependencies to unrelated primitive installs.** Multiple focus/portal systems in nested widgets require explicit tests.

## Proposed repository (implemented incrementally)

```text
kumiki-ui/
  AGENTS.md  README.md  docs/
  foundations/       # token source, theme exports, generated CSS
  registry/          # standalone installable component source
    ui/button.tsx
    ui/input.tsx
    ui/dialog.tsx
  showcase/           # Storybook and fixtures
  tests/              # behavior, visuals, clean consumer
  scripts/            # token/registry validation and release tooling
  examples/           # non-production configuration samples
  skills/kumiki-ui/   # agent instructions
  templates/          # compact component spec
  registry.json       # ONLY when referenced items exist
```

Each component owns implementation, tests, stories and a minimal usage document. Keep public `registry/` code free of imports from showcase, test fixtures, private workspaces or application domains. `kebab-case` registry names; `PascalCase` exports; prefix variables `--km-` and scope attributes `data-km-`.

## Local development (once scaffold exists)

Use supported Node.js LTS, pnpm/Corepack, pinned lockfile and a current React/TypeScript/Vite stack. Bootstrap Storybook and testing with official current CLIs **after checking compatibility**. Expected script contracts (to implement, not claims of existing scripts):

```text
pnpm dev             # Storybook or local showcase
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
pnpm build
pnpm registry:validate
pnpm registry:smoke
```

Avoid redundant bundlers, snapshots and runtime dependencies. Cache package installs in CI but do not commit `node_modules`, builds, test videos or unbounded screenshot artifacts. Keep test fixtures deterministic; use fake user data and local assets. Do not auto-download huge media/AI dependencies—the design system doesn't need them.

## Registry and updates

The [example manifest](../examples/registry.example.json) is **not installable** until its `files.path` exists. Once the code exists, create root `registry.json` using the current [shadcn registry schema](https://ui.shadcn.com/docs/registry/registry-json), validate it, then install into a **clean independent fixture**. Test both default token theme and an intentionally different palette/density. Record installed file/dependency changes.

GitHub distribution supports tags/commits; pin a known version and review changes. Consumer overrides can diverge—**never bulk overwrite without a diff or migration plan**. Publish changelog, behavioral/breaking changes, token migrations and a clean-install test per release. Use the official [GitHub registry guide](https://ui.shadcn.com/docs/registry/github) for current commands rather than assuming snippets remain stable.

## Dependency and license hygiene

Before introducing code/assets, verify package version, maintainer, license text, transitive runtime size, browser compatibility, SSR behavior, commercial redistribution rights and update frequency. An “MIT” label on a README is insufficient when source or weights have extra restrictions. Keep a dependency/license register. Do not copy third-party components from differently licensed registries without permission; study interaction ideas and implement original code where needed. Never publish credentials, network secrets, user data or environment-specific endpoints.

Optional agent tooling (e.g. an official registry MCP) must be installed by the consumer/developer explicitly. No auto-executing unknown scripts in installable registry items.
