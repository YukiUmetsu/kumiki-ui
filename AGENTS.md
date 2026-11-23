# Kumiki UI — Agent Rules

Search first; read only what the search returns. Output is small by default.

| You need | Command |
|---|---|
| A component, scene, effect or film that exists | `npm run -s catalog:find -- --query="intent"` (one entry in full: `--id=ID`) |
| Exact exports, props, types, defaults | `npm run -s catalog:api -- --id=ID [--export=A,B]` (`--full` only for what that left out) |
| The doc, spec or skill for a task | `npm run -s docs:find -- --query="task"` |
| Part of a long doc | `npm run -s docs:sections -- path.md`, then read that line range |

Reuse registered packs and verified Storybook examples before you create a component. Do not infer props from search results. Run `npm run catalog:check` after changing registry metadata, semantic kinds or previews, and `npm run -s docs:check` after changing this file, a skill or a long doc. **Do not fabricate components, tests, screenshots, registry availability or browser results.**

## Token budget

- Do not read whole: `registry.json`, the README, `docs/INDEX.md`, `docs/02-component-catalog.md`, `docs/06-roadmap.md`, `docs/component-status.md`, any doc over 8 KB, a film's `report.json`, or one-line data and film JSON.
- Start a visual review with the contact sheet. Then open only the frames that need a closer look.
- Brief a subagent with exact paths, line ranges and what is already verified, never "explore the repo".
- Run the test files that your change touches, not whole suites.
- Every call sends the whole conversation again. Send independent calls together, join small shell steps, and start a new session for a new task.

## Non-negotiable

1. **Craftsmanship before breadth.** Build one complete component at a time with all applicable states, then inspect rendered results. Premium means functioning under stress, not only attractive defaults.
2. **Reusable by anyone.** No consumer- or industry-specific names, business logic, palettes, routes, copy, analytics or runtime accounts in library code or docs. Demo themes use anonymous identifiers.
3. **Customizable without hacks.** Public APIs expose semantic tokens, documented variants/sizes, slots/composition, `className`, forwarded DOM props and refs. No app-specific selectors or mandatory globals.
4. **Accessibility is behavior.** Prefer native semantics, then Base UI; React Aria only for justified isolated advanced widgets. Verify keyboard focus, overlays, IME, screen reader and reduced motion.
5. **Design coherence and protected reading space.** Use tokens for type, spacing, color roles, radii and motion. No tiny text, random gaps, excess effects or motion that delays work. Explanatory text sits in measured, non-overlapping safe regions at real output sizes and languages: no masking cards, silent truncation or unchecked SVG coordinates. Rendered-bounds collision checks and screenshot review are mandatory for cinematic/diagram text.
6. **Honest states.** Loading does not jitter; disabled is non-interactive; errors are actionable; progress is truthful. Support long and CJK text, zoom, narrow widths, light and dark.
7. **Minimal dependencies.** Only what is necessary; verify licenses of redistributed code, lock versions, keep advanced widgets optional.
8. **Registry safety.** Pin releases; review added dependencies and installed paths. Never run unreviewed external skills/scripts or silently overwrite consumer customizations.
9. **Deterministic constraints before visual QA.** Before any explainer apply [first-attempt lessons](docs/15-explainer-lessons.md) (one causal input→transform→output per beat, intentional camera, sparse captions, one story) and the [visual production contract](docs/visual-production-contract.md) with `registry/visual/`. Run CPU-only guards on declared critical scenes; do not use image recognition or LLM reviews for solvable geometry.
10. **3D visual fidelity is a release gate.** Follow [docs/14](docs/14-3d-visual-fidelity.md). Primitive-only hero models are WIP. Run the structural checks and `npm run hero:quality` with [its evidence rules](docs/verification/hero-quality-gate.md), and record actual human visual review: code checks, screenshots and LLM assessments do not certify photorealism.
11. **Evidence required.** A completed component has specs, examples, stories, tests, accessible states, screenshots, visual review and a clean registry-install smoke test.
12. **Incremental scope.** Follow the [roadmap](docs/06-roadmap.md) section for the task. Stop after the requested phase; report exact commands and failures.
13. **Coloured-pencil art.** Before any new coloured-pencil subject, study [CP-F1](docs/research/colour-pencil-foundation-2026-11-14.md) and use the `createPencilFoundationDrawing` contract: original named semantic silhouette and local geometry, actual reference observations, complete region-to-material mapping, opaque support on solids, form-aligned marks, tonal layers, reviewed frames. `createPencilPhotoStudy` is the route for owned, licensed or public-domain photos. Bare CP1/CP2 is legacy, not release-qualified. No new pencil Storybook folder: demos stay under `Video Production/Film Looks/Colour-pencil`. A passing test is not artist-level fidelity.
14. **Coloured-pencil portraits** are gated separately: the code-authored human face failed art review and stays quarantined as **unapproved experimental construction**. A replacement must pass every measure in the [ArtCraft v7 portrait gate](docs/research/colour-pencil-portrait-artcraft-v7-rebuild-gate.md): rights-verified source, 18 independently observed landmarks on source and actual render, five matched value planes, exact image SHA-256, `portrait_fidelity_gate.py`, independent 1×/3× review. CP-F1 alone does **not** authorize realism claims, promotion or rigging. No new Storybook folder.

When a technical choice conflicts with these rules, document the tradeoff and ask. Do not silently reduce quality.

## Before you draw, build or film a subject

Read `skills/kumiki-NAME/SKILL.md` first (under 2k tokens each; `content` is 4k). It names the spec and the measured data:
`content` films and videos (one JSON, then `film:check`, `film:review`, `film:render`) · `human-anatomy` people · `facial-expressions` · `makeup` · `costume` clothing · `motion` walking, running · `animal-anatomy` animals, birds, fish · `small-creatures` insects, spiders, snails · `plant-anatomy` trees, flowers, grass · `terrain` ground, mountains · `water` sea, rivers · `sky-weather` sky, clouds, rain · `fx` fire, smoke, light · `food` · `interiors` rooms, furniture · `architecture` buildings · `materials` surfaces · `ui` components.

To match a reference picture, or when ours looks worse than one: [reference-match](docs/reference-match.md).

Explainers and shorts: [explainer visual components](docs/17-explainer-visual-components.md), preflight with `inspectExplainerPrinciples`. Design: [foundations](docs/01-design-foundations.md). APIs and states: [component standards](docs/03-component-standards.md). Done criteria: [quality gates](docs/04-quality-and-testing.md). Installation: [development and registry](docs/05-development-and-registry.md).

**Third-party assets:** before complex 3D models, characters or environments from scratch, follow [ASSET_SOURCING](docs/ASSET_SOURCING.md). Prefer verified CC0 (Poly Haven, ambientCG, verified Kenney). Sketchfab, Poly Pizza, Quaternius, Mixamo and Fab need item-level license review: commercial use does not imply redistribution. Record provenance, credits and rights in the asset manifest. If the license is unclear, do not import. Imported assets must meet our art-direction, optimization and deterministic-animation standards.
