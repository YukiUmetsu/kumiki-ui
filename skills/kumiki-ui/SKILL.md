---
name: kumiki-ui
description: Implement or review premium, accessible, themeable React components with tested interaction states and deterministic visual QA.
---

# Kumiki UI Skill

Use this skill for a new component, component modification, registry release or visual design review.

1. Read [AGENTS](../../AGENTS.md), the [catalog](../../docs/02-component-catalog.md) and the specific [component contract](../../docs/03-component-standards.md). Avoid reading every doc when a narrow task will do.
2. Search approved Kumiki components before creating new primitives. Respect the documented API and semantic tokens; keep copy and behaviors generic.
3. For each component, write a concise [spec](../../templates/component-spec.md): task, API, states, keyboard/focus, variants, customization, dependencies and acceptance tests.
4. Implement functional state and accessibility before visual polish. Use typography, composition, motion and themes from [foundations](../../docs/01-design-foundations.md).
5. Render real Storybook states and inspect screenshots; run tests and the [quality checklist](../../docs/04-quality-and-testing.md). Flag intentional overlaps explicitly.
6. Verify clean registry installation for distributable changes. Never claim success for checks you didn't run.
7. Report exact changes, commands/results, screenshots, dependencies/license impact and unresolved defects; stop after requested scope.

**Never:** hardcode a specific consuming application; substitute tiny low-contrast text for elegance; add generic glow/gradients by default; ship untested animation or overlays; hide essential information for minimalism; overwrite consumer customization without review.
