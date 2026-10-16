# Documentation Index

Keep this index short. **Use one authoritative document per topic**; do not duplicate standards across files.

| Document | Read when |
|---|---|
| [01 — Design Foundations](01-design-foundations.md) | Defining premium quality, design tokens, typography, theming, motion and customization |
| [02 — Component Catalog](02-component-catalog.md) | Choosing what to build; **explicit v0.1 inventory**, dependencies, priorities and exclusions |
| [03 — Component Standards](03-component-standards.md) | Designing a component API, interaction behavior, edge cases and complete states |
| [04 — Quality & Testing](04-quality-and-testing.md) | Proving accessibility, rendering, performance and visual quality before release |
| [05 — Development & Registry](05-development-and-registry.md) | Choosing libraries, arranging code, running locally, distribution and licensing |
| [06 — Roadmap](06-roadmap.md) | Implementing phased deliverables with testable exit criteria |
| [07 — Content Graphics, Slides, Animation & Video](07-media-content-components.md) | Building editable visual content components (graphics, slides, animation, video) |

Additional resources: [agent instructions](../AGENTS.md), [OpenCode skill](../skills/kumiki-ui/SKILL.md), [component spec template](../templates/component-spec.md), [sample tokens](../examples/neutral.tokens.json), [registry manifest example](../examples/registry.example.json).

Implemented component specs (one per delivered component, written from the template): [Button](button-spec.md) · [Field/Input](field-spec.md) · [Dialog](dialog-spec.md).

**Default reading path for a new component:** 02 → 03 → 01 → 04 → 05. For a release: 04 → 05 → 07.
