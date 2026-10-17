# Component: Scene Storyboard (slice)

**Status:** Implementing — the storyboard data module and its `scene-storyboard` registry item are
present and installable; the installed-item evidence is recorded below, with the visual screenshot
review still **pending**.
**Catalog phase:** M1-A (docs/07 §6 motion slice) / docs/08 §12 **MG1**. Registry item
**`scene-storyboard`**. Note: docs/07 lists `scene-storyboard` under **M2** ("Frame-based document
and scene narrative metadata"); it ships here as part of the M1-A motion slice because the motion
evaluator and the golden fixtures needed a placeable shot plan.
**Why shared:** A storyboard records production decisions as declarative data — an ordered set of
shots that each teach one change, with the claim, visual objective, focus target, narration anchor,
on-screen labels and the identity handed to the next scene — so the same record can be validated,
serialized, reviewed and later compiled into scenes/clips/a motion timeline. Without it, editorial
intent lives only in prose and the timing/identity contract cannot be machine-checked. Alternatives
considered: keep the shot plan in the script (rejected — not validatable, no handoff identity); put
timing directly on the scene document (rejected — docs/11 owns scene timing, and the storyboard must
stay a reviewable layer above it).

**Source:** [`registry/motion/storyboard.ts`](../../registry/motion/storyboard.ts);
its wire helpers `serializeStoryboard` / `parseStoryboard` / `storyboardHash` live in
[`registry/motion/serialize.ts`](../../registry/motion/serialize.ts) (see [Motion Track](motion-track.md)).
`src/motion/storyboard-fixtures.ts` holds the typed fixtures; `src/motion/index.ts` re-exports them
for the showcase.

## Contract

- **Use / not use:** use to author, validate, serialize and project a shot plan onto a composition
  timeline (clips/cues/motion nodes). It is data + pure functions, not a React component and not an
  editor or an NLE (docs/07 §2 "Deferred"). Do not store functions, DOM nodes or timers, do not treat
  it as the canonical scene wire format (that is docs/11), and do not let a shot cover frames outside
  `[0, durationFrames)` — a board that does not tile exactly must not be placed as if complete.
- **Public API:** constants `STORYBOARD_SCHEMA_VERSION` (`1`); types `StoryboardExitHandoff`
  (`semanticId`, `targetSceneRef`), `StoryboardShot` (`id`, `sceneRef`, `startFrame`,
  `durationFrames`, `claim`, `visualObjective`, `focusTarget`, `narrationCue?`, `onScreenLabels`,
  `exitHandoff?`, `transitionIn?`, `staticFallback?`, `assets?`), `Storyboard` (`schemaVersion`, `id`,
  `title`, `fps`, `durationFrames`, `shots`, `cues?`, `identities?`), `StoryboardValidationOptions`
  (`knownCues?`, `knownIdentities?`, `labelFits?`), `StoryboardClip` (`id`, `sceneRef`,
  `startFrame`, `durationFrames`, `sourceStartFrame`); functions `createStoryboard`, `shotRange`,
  `shotAt`, `storyboardDuration`, `validateStoryboard`, `handoffChain`, `toStoryboardClips`,
  `toStoryboardCues`, `storyboardSummary`, `storyboardToTimelineNodes`. Wire:
  `serializeStoryboard(board, space = 2)`, `parseStoryboard(input) → { board | null, diagnostics }`,
  `storyboardHash` (FNV‑1a, 8 hex).
- **Composition / boundary:** `createStoryboard` copies its shots/cues/identities so later mutation
  cannot reach the caller, defaults `fps` through `normalizeFps` (→ `{30,1}`) and defaults
  `durationFrames` to the end of the last shot (`max(startFrame + durationFrames)`, `0` when empty).
  Findings (`Diagnostic`, docs/11 §4; `sceneId` defaults to the board id): **errors**
  `storyboard-empty`, `storyboard-duration-mismatch`, `storyboard-shot-id-duplicate`,
  `storyboard-shot-invalid-start`, `storyboard-shot-invalid-duration`, `storyboard-claim-missing`,
  `storyboard-objective-missing`, `storyboard-focus-missing`, `storyboard-labels-empty`,
  `storyboard-narration-cue-missing`, `storyboard-handoff-target-unknown`,
  `storyboard-handoff-identity-mismatch`, `storyboard-transition-invalid`,
  `storyboard-coverage-gap`, `storyboard-coverage-overlap`; **warnings** `storyboard-label-overflow`,
  `storyboard-shot-no-fallback`, `storyboard-transition-overlap`, `storyboard-identity-unused`.
  `parseStoryboard` adds `storyboard-parse-failed` / `storyboard-shape-invalid` and returns
  `board: null` when any error exists.
- **Semantics:** **determinism** — every function is pure; inputs are never mutated, no clock or
  randomness, and diagnostics are returned in a fixed order (board-level → shots in authored order →
  handoffs → coverage → identities). **End-exclusive time** — a shot covers
  `[startFrame, startFrame + durationFrames)`; `shotAt` returns the shot covering a frame (earliest
  in start order on overlap) and `shotAt(board, shotRange(shot).endFrame)` is the next shot or
  `null`. **Identity** — `semanticId` is the durable educational object (docs/08 §1.3);
  `handoffChain` resolves each `exitHandoff` to the **next** shot (in start order) whose `sceneRef`
  matches `targetSceneRef`, and `validateStoryboard` rejects a target no later shot provides or an
  identity not declared where the handoff resolves. **Never arbitrary JSON** — the record is plain
  JSON with no functions (asserted by the tests' "no functions anywhere" check). **Declared
  fallbacks** — every shot is expected to carry a `staticFallback` (a still/reduced-motion
  substitute); its absence is a warning.
- **Keyboard/focus:** not applicable — a data module with no interactive surface.
- **Visual states:** not applicable — state lives in the showcase that renders a board.
- **Customization:** `createStoryboard` accepts `fps`, `cues`, `identities` and an explicit
  `durationFrames`; `validateStoryboard` accepts cross-document knowledge (`knownCues`,
  `knownIdentities`, `labelFits`) so a board can be checked against a real audio lane, composition
  vocabulary or label box. `toStoryboardCues` merges declared cues with a `shot-<id>` start cue per
  shot and one cue per `narrationCue` (anchored at its shot's start), deduped first-wins and sorted
  by frame then id.
- **Dependencies:** no external runtime dependency — `storyboard.ts` imports only sibling motion
  modules; `serialize.ts` imports `storyboard.ts` for the wire helpers.
- **Limits:** `validateStoryboard` never throws and reads defensively, so untrusted parsed JSON is
  safe. `durationFrames` must **equal** the derived end of the last shot, or `storyboard-duration-mismatch`
  fires — a board cannot declare a longer or shorter timeline than its shots tile. Coverage is
  checked over `[0, durationFrames)` and reports both a gap and an overlap; shots are compared in
  start order with a non-finite start sorting last. `storyboardToTimelineNodes` emits **one `hold`
  per shot** (id `shot-<id>`, offset by its start frame) and **no tracks** — the storyboard says
  *where* a shot lives, never which properties a scene animates. `toStoryboardCues` gives a
  `narrationCue` a synthetic frame (the shot's start) until the audio lane resolves it to a real
  frame (docs/11 §2). `transitionIn.durationFrames` is validated as a positive integer and warned
  when it exceeds the shot length, but the transition's actual compositing is out of scope here.

## Acceptance evidence

- [x] **Behavior and keyboard tests executed; commands/results recorded** —
  `npx vitest run tests/motion-core.test.ts tests/motion-geometry.test.ts tests/motion-presets.test.ts
  tests/motion-serialize.test.ts tests/motion-storyboard.test.ts tests/motion-fixtures.test.ts`
  → **6 files, 257 tests passed**, including `tests/motion-storyboard.test.ts` (schema/fps defaults,
  derived vs explicit duration, deep-copy immutability, end-exclusive `shotRange`/`shotAt` boundaries,
  every positive fixture validating with zero diagnostics and tiling `[0, durationFrames)`, every
  negative fixture failing with exactly its documented codes, the two caller-supplied codes
  exercised directly, `handoffChain` resolution/ordering/unresolved targets,
  `toStoryboardClips`/`toStoryboardCues` ordering, `storyboardSummary`, `storyboardToTimelineNodes`
  holds-only, determinism and the "no functions anywhere" serialization check) and the storyboard
  example checks in `tests/motion-fixtures.test.ts`. The full suite is **118 files / 1370 tests
  passed** (`npx vitest run`). Typecheck and lint also passed: `npx tsc --noEmit` → exit 0 (no
  output); `npm run lint` → exit 0, **0 errors, 1 pre-existing warning** unrelated to motion
  (`tests/e2e/probe-overflow.spec.ts:64:3 Unused eslint-disable directive`). Keyboard tests are
  **not applicable**.
- [ ] **axe-core output and manual a11y checks recorded** — not applicable to a data-only slice: the
  only axe run is the Playwright gallery test *"has no axe violations in light and dark appearance"*
  (passed in both appearances, recorded under [Motion React](motion-react.md)), and **no dedicated
  motion a11y vitest suite exists**. Manual screen-reader checks were **not run**.
- [x] **Storybook states complete, including realistic and CJK/long content** —
  `npx storybook build --output-dir /tmp/kumiki-storybook-motion` completed successfully; the
  showcase's Storyboard section (asserted by the Playwright *storyboard* test) renders the positive
  fixtures and the diagnostics of a negative board.
- [ ] **Screenshots reviewed: light/dark, theme-a/theme-b, narrow/wide, density where applicable** —
  **not run.** Playwright asserts committed baselines (it passed); the images were not inspected here.
- [x] **No accidental overlap, clipping, contrast, focus or animation failures** — the Playwright
  motion-gallery run passed, including the *storyboard: positive fixtures validate cleanly and
  negative fixture shows diagnostics* test, scoped to the showcase page.
- [x] **Test registry install into fresh fixture passed** — `npm run registry:validate` →
  `registry:validate OK — 56 item(s) valid.`; `npm run registry:smoke` → `registry:smoke OK —
  56 item(s), 279 file(s) staged into an isolated directory.`; and
  `node scripts/registry-fixture.js --item=scene-storyboard` → `registry:fixture OK — 2 item(s),
  14 file(s) compiled in a temporary fixture (removed)` (exit 0; it runs `npm install`, so it needs
  network access). The 2 items are `scene-storyboard` plus `motion-track` (which also declares
  `storyboard.ts`; see [Motion Track](motion-track.md)).
- [x] **Dependencies/licenses reviewed; performance and bundle impact documented** — the item
  declares `dependencies: []` and `storyboard.ts` imports only sibling `./…` motion modules, so there
  is no new third-party licence surface. The demo app bundle was measured: `dist/assets/index-*.js`
  ≈ 1.14 MB minified (gzip ≈ 345 kB), with the pre-existing "chunks larger than 500 kB" Vite warning;
  no separate motion budget was set.
- [x] **Blockers resolved; known limitations named honestly** — no blocking issue in the checks run;
  the duration-mismatch rule, holds-only projection and the synthetic narration cue frame are named above.

The three example boards — [`typographic-30s.json`](../../examples/motion/typographic-30s.json) (16:9),
[`explainer-60s.json`](../../examples/motion/explainer-60s.json) (16:9) and
[`social-9x16.json`](../../examples/motion/social-9x16.json) (9:16) — are re-verified byte-for-byte by
`tests/motion-fixtures.test.ts` (serialize → parse round-trip, clean validation and exact clip tiling).

**Links to evidence:** `../../registry/motion/storyboard.ts`,
`../../registry/motion/serialize.ts`, `../../tests/motion-storyboard.test.ts`,
`../../tests/motion-fixtures.test.ts`, `../../src/motion/storyboard-fixtures.ts`,
`../../examples/motion/typographic-30s.json`, `../../examples/motion/explainer-60s.json`,
`../../examples/motion/social-9x16.json`.
