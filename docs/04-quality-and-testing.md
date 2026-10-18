# 04 — Quality Gates, Visual QA and Testing

Premium must be **verified, not claimed**. Automated checks identify measurable defects; human review judges balance, visual personality and comprehension. Neither replaces the other. An aesthetic score cannot override a blocking bug.

## Release gates

| Gate | Mandatory result | Method |
|---|---|---|
| Build / public API | No TypeScript/build errors; props and exports match spec | Typecheck, build, smoke consumer |
| Behavior | Relevant state transitions, keyboard/pointer, disabled/loading, controlled state correct | Vitest + Testing Library; Playwright flows |
| Accessibility | WCAG 2.2 AA-oriented semantics, keyboard/focus, names, contrast, reduced motion | axe-core plus manual keyboard/zoom/screen-reader spot checks |
| Visual geometry | No unintended clipping, overlaps, out-of-bounds or surprising shifts | Bounding rect + rendered screenshots |
| Internationalization | English + Japanese; long strings and IME; correct wrapping | Localization stories and keyboard tests |
| Themes | Two unrelated anonymous palettes, light/dark, comfortable/compact | Storybook variants + visual review |
| Performance | No noticeable UI freeze, uncontrolled rerendering, avoidable expensive paint, massive dependency increase | Profiling and bundle diff |
| Distribution | Registry manifest valid; clean install succeeds; no unexpected files | Fixture consumer + file diff |
| Safety / legal | No secrets, privacy leaks, forbidden assets, unreviewed redistribution license | Static checks + manual review |

## Cinematic 2D/3D overlays: mandatory text-space gate

A cinematic label must **not** be accepted from source positions alone. Author reserved reading regions (with explicit safe margins) and measure actual text and subject bounds after the target font loads, at the delivered viewport size. Intersections between essential text nodes, clipped text, text behind models, and large generic cards masking essential action are **release-blocking defects**. Change composition, camera negative space or text density rather than relying on smaller fonts, hardcoded ellipses, hidden overflow or increasingly dark overlay cards. Keep narration/detail in an accessible adjacent lesson area when the scene cannot present it legibly.

At a minimum, test the beginning, middle and end of every shot, each transition midpoint, 16:9 and 9:16 outputs, long names, Japanese text, 200% text scaling, and an initial representative reduced-motion frame. Use real browser rendered geometry (`getBBox` for SVG, `getBoundingClientRect` for DOM/canvas overlays as applicable) with a declared pixel tolerance. Verify that text does not cover its filmed target. Pure numeric layout tests supplement but **do not replace** browser rendering tests. For the Network Journey benchmark, run `npx playwright test -c playwright.storybook.config.ts` and retain its screenshots/collision results; this test is not a claim that other scenes are accepted.

## Suggested test matrix (proportional to component)

- **Widths:** 320px, 768px, 1440px; add 1920px for wide compositions.
- **Display:** light/dark × 2 sample palettes; compact/comfortable where relevant; high-contrast settings when supported.
- **Text:** short, long, empty, CJK, URL without breaks, 200% text scaling and relevant 400% zoom/reflow.
- **Motion:** normal, reduced-motion, interrupted mid-transition.
- **Input:** mouse, keyboard, touch where relevant, composition/IME, assistive tech for complex controls.
- **States:** hover, focus, pressed, disabled, pending, selected, invalid, empty and retry as applicable.

Don't run the full Cartesian product on every PR. Use pairwise representative coverage for fast checks and a release/nightly matrix for exhaustive high-risk composites. Record coverage intentionally omitted and why.

## Geometry and visual defect detection

For relevant rendered elements, collect bounding boxes and computed styles in Playwright; verify safe region/scroll container bounds, text clipping, overflow, hit-area size and invalid collisions. Classify **intentional** layering (badges, menus, shadows, tooltips) instead of flagging every rectangle intersection as a bug. Text measurements require real fonts and browser rendering; source CSS alone is insufficient.

Make negative fixtures: overlapping labels; low-contrast icon; off-screen dialog; 10px critical label; clipped button; Japanese long title; spinner-induced width jump; popover behind dialog; broken reduced-motion animation. Each detector must catch at least its named fixture without excessive false alarms.

### Typical WCAG targets

- Normal text **at least 4.5:1** contrast; qualifying large text **3:1**; relevant non-text boundaries/indicators **3:1** (subject to criterion exceptions).
- WCAG 2.2 target-size minimum is **24 × 24 CSS px** with exceptions; prefer larger ~44px for touch-heavy targets where appropriate.
- Visible keyboard focus and logical navigation; status messaging not reliant solely on color, sound or animation.
- Real zoom/reflow behavior at supported dimensions; avoid horizontal scrolling of ordinary content.

An axe report **does not prove** WCAG conformance. Do manual keyboard tests for each composite, screen-reader spot checks for critical patterns, and browser/WebKit checks where relevant.

## Screenshot reliability

Pin Playwright, browsers, fonts, viewport, scale, locale, timezone, sample data, animations and clock. Keep approved image baselines scoped to environment; don't treat platform antialiasing differences as product bugs. Review any changed baseline instead of blindly updating snapshots. Include live Storybook links or render artifacts in PRs.

## Review checklist before release

1. **Visual hierarchy:** primary purpose visible, optical alignment precise, spacing neither cramped nor wasteful.
2. **Craftsmanship:** complete states, stable loading width, deliberate error and empty states, no confusing copy.
3. **Interaction:** focus after modal close, predictable shortcuts, cancellation/undo when appropriate, no hidden traps.
4. **Customization:** usable across themes/densities without internal overrides; documented tokens/slots.
5. **Evidence:** exact commands, passed/failed/incomplete status, screenshots, keyboard notes, bundle/license diff and known limitations.

Suggested CI: `format/lint → typecheck → unit/behavior → Storybook build/a11y → selected browser/visual → registry clean-install`. Heavy interaction/visual coverage runs before releases. **No release with an unresolved blocking issue.**

## Repository commands

The checks below exist as npm scripts; run them from the repository root. `npm run test:e2e` is the only one that needs the Playwright browser and a build, so it is not part of `npm test`.

| Command | Proves |
|---|---|
| `npm run typecheck` | `tsc --noEmit` over `src`, `tests`, `registry`, `.storybook` and the config files. |
| `npm run lint` | ESLint (including the React hooks rules) over the repository. |
| `npm test` | Vitest + Testing Library behavior/semantics tests (jsdom) and the jsdom axe pass. Contrast and geometry rules are disabled here because jsdom does not lay out or paint — they are covered by the browser run. |
| `npm run test:e2e` | Playwright against the **production build** of the showcase served by `vite preview`: axe in light and dark, horizontal overflow at 320/375/768/1440, 24×24 target size, input-boundary (3:1) and text (4.5:1) contrast, visible focus ring, dialog focus/scroll-lock/Escape behaviour, reduced motion, CJK input, and the committed screenshot baselines. |
| `npm run tokens:validate` / `npm run tokens:build` | The DTCG source is valid and `src/styles/tokens.css` is regenerated deterministically from it. |
| `npm run tokens:themes` / `npm run contrast:audit` | Every example theme is complete and generates light/dark/density CSS, and the WCAG contrast pairs (text ≥4.5:1, boundaries/focus ≥3:1) hold in **both** the canonical theme and each anonymous example theme. |
| `npm run registry:validate` / `npm run registry:smoke` | The manifest is a valid shadcn registry manifest, and each item's files can be staged in isolation. |
| `npm run registry:fixture` | The items are copied to their declared targets in a fresh temp app with their declared dependencies installed, and a consumer exercising the public APIs **compiles** (`tsc --noEmit`). Requires network access for `npm install`; the fixture is removed afterwards unless `--keep` is passed. |
| `npm run build-storybook` | The Storybook build for every story. |

Record the exact command and its raw result in the component spec's acceptance section. A check that was not executed is written as *not run*, never as passing.

**References:** [WCAG 2.2](https://www.w3.org/TR/WCAG22/), [ARIA APG](https://www.w3.org/WAI/ARIA/apg/), [Playwright snapshots](https://playwright.dev/docs/test-snapshots), [Storybook testing](https://storybook.js.org/docs/writing-tests).
