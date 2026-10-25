# EquationTypeset — optional MathJax 4 adapter with stable term identities

**Status:** Implementing. Automated checks and agent render review are recorded below. **Human review is pending.** This is the adapter only; an `EquationStage` that lays out steps for each output is not built yet.
**Catalog phase:** P1.1 of [doc 20](../20-explainer-video-build-plan.md), narrowed to the typesetting adapter and term movement.
**Scope:** Typesets identified terms with MathJax 4 SVG output, reports each term's position from MathJax's own layout, and compiles term changes between two steps into `shared-element` movement.

## Public API (`registry/visual/equation-typeset.ts`)
- `equationTex(terms)`: builds `\cssId{id}{tex}` groups. Identities are validated first (letters, digits, `_`, `-`; unique).
- `typesetEquation(mathjax, terms, { display })`: returns `{ ok, svg, viewBox, terms, diagnostics }`. Never throws for bad input.
- `measureTermBounds(svg, ids)`: browser only. Returns each term's rendered box in viewBox units.
- `compileTermTransition(from, to, { handoff, enterAfter })`: matched terms become `shared-element` specs, entering and exiting terms are classified.
- `evaluateTermTransition(compiled, from, to, handoff, frame)`: pure per-frame state (`x`, `y`, `opacity`) for every term.
- MathJax is injected through the `MathJaxLike` interface and never imported by the adapter. Consumers who do not typeset equations install nothing.

## Reuse
- **Movement:** `shared-element` (`evaluateSharedElement`, cross-fade collision) and `easing` (`evaluateEasing`). No math morph animator and no clock were added.
- **Typesetting:** MathJax 4.1.3 (Apache-2.0), pinned exactly in `package.json`. Its font package (`@mathjax/mathjax-newcm-font`, Apache-2.0) is pulled in as its dependency. The package is about 50 MB; check that before choosing this adapter.

## Findings from the feasibility checks
1. **Term identity survives typesetting.** Each `\cssId` becomes a `<g id="…">` with a `translate(x,0)` transform. Nested groups accumulate their translates. Verified in Node (`tests/equation-typeset.test.ts`) and in Chromium.
2. **Rendering is deterministic per call apart from ids.** MathJax numbers its SVG `<defs>` per call (`MJX-1-…`, `MJX-2-…`). The drawing is identical; the tests normalise those counters.
3. **The one-file browser bundle is not usable under a bundler.** `tex-svg.js` always fetches a speech worker from a relative URL, and that request fails. The story loads `startup.js` through the component loader with only `input/tex` and `output/svg`. Consumers must serve the MathJax files (in development, Storybook serves `/node_modules/mathjax/`).
4. **Layout and browser boxes agree to a constant offset.** At three sampled frames the browser box (`getBoundingClientRect` of the term group) sat about 40 units to the right of the layout position. The offset is the same at every frame, so motion is consistent. Treat `TermLayout.x` as the group origin, not the ink edge.
5. **Glyph movement needs one drawing.** Cross-fading two typeset steps shows the same symbol twice mid-transition. The story instead moves the matched groups inside the final step's drawing and fades in only the new terms. `enterAfter: 0.6` keeps a new term from overlapping a term that is still moving.

## Acceptance evidence
| Check | Command | Result |
| --- | --- | --- |
| Typesetting, identities, determinism, invalid TeX, transitions, seek parity | `npx vitest run tests/equation-typeset.test.ts` | 9 of 9 passed |
| Storybook render, per-frame state, console | Playwright, frames 0 / 60 / 119 of **Visual / Equation Typeset** | Renders in Chromium; no console errors; highlight on the principal term at every frame |
| Registry manifest, clean install | `npm run registry:validate`, `npm run registry:smoke` | 156 items valid; 2073 files staged |
| Catalog parity | `npm run catalog:check` | OK, 326 entries |
| Type check and lint | `npx tsc --noEmit`, `npx eslint <changed files>` | No errors in the new files; lint clean |

Screenshots reviewed by the agent (not a human): frame 0 (start), frame 60 (principal mid-move, new label not yet visible), frame 119 (end). Human review is required at normal size.

## Known limits
- **9:16 is not legible yet.** The equation is scaled to the frame width, so in a 720×1280 output the type is small. Short-form layouts need per-output steps. That is the `EquationStage` work.
- **Exiting terms need the source drawing.** The story has none, so it does not render them. `compileTermTransition` reports them; a consumer must keep the source step visible for them.
- **Algebra is not checked.** The adapter moves symbols that the caller has already declared to correspond. It does not verify that the steps are equal.
- **Hosting.** The browser path needs the MathJax files at a URL. The story uses the Vite dev path.
