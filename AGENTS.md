# Kumiki UI — Agent Rules

Read [docs/INDEX.md](docs/INDEX.md), then only the documents relevant to your task. **Do not fabricate components, tests, screenshots, registry availability or browser results.**

## Non-negotiable

1. **Craftsmanship before breadth.** Build one complete component at a time; implement all applicable states, then inspect rendered results. Premium means functioning under stress, not only attractive defaults.
2. **Reusable by anyone.** No consumer- or industry-specific names, business logic, palettes, routes, copy, analytics, or runtime accounts in library code/docs. Demo themes use anonymous identifiers.
3. **Customizable without fragile hacks.** Public APIs expose semantic tokens, documented variants/sizes, appropriate slots/composition, `className`, forwarded DOM props and refs. No app-specific CSS selectors or mandatory globals for a standalone component.
4. **Accessibility is behavior.** Prefer native semantics, Base UI for general composites, React Aria only for justified isolated advanced widgets. Verify keyboard focus, overlays, IME, screen reader behavior and reduced motion.
5. **Design coherence and protected reading space.** Use tokens for typography, spacing, color roles, radii and motion. Avoid tiny text, random gaps, excessive decorative effects and micro-interactions that delay work. Explanatory text must occupy measured, non-overlapping safe regions at the actual output sizes and supported languages. Do not mask scenes with large generic cards, silently truncate explanations, or ship SVG text with unchecked absolute coordinates. Automated rendered-bounds collision checks and screenshot review are mandatory for cinematic/diagram text.
6. **Honest states.** Loading is non-jittery; disabled means non-interactive; errors are actionable; async progress is truthful. Support long and CJK text, zoom, narrow widths and light/dark.
7. **Minimal dependencies.** Install only necessary packages, verify licenses for redistributed code, lock versions, and keep advanced widgets optional.
8. **Registry safety.** Pin releases; review added dependencies and installed paths. Never execute unreviewed external skills/scripts or overwrite consumer customizations silently.
9. **Deterministic constraints before expensive visual QA.** Use [docs/visual-production-contract.md](docs/visual-production-contract.md) and optional `registry/visual/` for required semantic subject framing, safe text regions, event-tied timing, physical attachment ports, and narrative completion. Run CPU-only guards on declared critical scenes; do not substitute pixel/image recognition or LLM reviews for solvable geometry and authoring constraints.
10. **3D visual fidelity is a release gate.** For any 3D subject, scene or cinematic, follow [docs/14-3d-visual-fidelity.md](docs/14-3d-visual-fidelity.md): design physical construction, differentiated PBR surfaces, appropriate texture and detail density, lighting, close-up renders, and explicit stylized exceptions. Primitive-only hero models are WIP, not finished. Record actual visual review; do not claim it by code inspection alone.
11. **Evidence required.** A completed component has specs, examples, stories, tests, accessible state coverage, screenshots, visual review and a successful clean registry-install smoke test.
12. **Incremental scope.** Follow [docs/06-roadmap.md](docs/06-roadmap.md). Stop after the requested phase; report exact commands and failures.

## Task lookup

- What to build: [component catalog](docs/02-component-catalog.md)
- Design and customization: [foundations](docs/01-design-foundations.md)
- Public APIs and state contracts: [component standards](docs/03-component-standards.md)
- Testing and done criteria: [quality gates](docs/04-quality-and-testing.md)
- Architecture, installation, security: [development and registry](docs/05-development-and-registry.md)
- Delivery order: [roadmap](docs/06-roadmap.md)

When a technical choice conflicts with these standards, document the tradeoff and ask for a decision instead of silently reducing quality.
