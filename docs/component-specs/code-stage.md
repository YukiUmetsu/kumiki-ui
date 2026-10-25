# CodeStage — walk through code without changing it

**Status:** Implementing. Automated checks and agent screenshot review are recorded below. Human review is pending.
**Catalog phase:** Phase 4 (subject breadth), first slice, in [17 — Explainer Visual Components](../17-explainer-visual-components.md#4-high-value-expansion-components-p1). Subject: programming.
**Scope (this slice):** Measured source code, line by line; focus on a line range or on one token occurrence; the rest dims and nothing moves.

Edits between complete revisions and captured terminal output are described under **Edit and output (P1.2)** below. Typed, cursor-level edits are not in this slice. Terminal output is shown as captured text only, and the commands a stage displays are never executed.

## Reuse and the gap it fills
- **Reused:**
  - **Text measurement:** `createCanvasMeasurer` (media-document), so widths come from the real monospace face.
  - **Easing:** `evaluateEasing` (motion-track).
- **Not reused:** EditableText (its typed-edit model belongs to the later editing slice) and DiagramStage (it draws graphs, not listings). Optional Shiki is deliberately not used: it adds a runtime dependency, and tokenization is supplied by the caller and checked instead.
- **The gap:** the registry had no way to show source code that a video can walk through with stable line identity, exact focus, and no reflow.

## Install and inspect
- Registry item: `code-stage` (`code-stage.ts`, `code-stage-react.tsx`).
- Storybook: **Visual / Code Stage**.
  - **Walkthrough:** three fictional domains, one component: finance (compound growth, TypeScript), logistics (arrival time, TypeScript) and physics (landing distance, Python). Each runs about 13 seconds. Each is shown at 9:16 (1080×1920) and 16:9 (1920×1080).
  - **Refusals:** tokens that would change the code, a token occurrence the line lacks, a focus on a missing line, a reversed range, duplicate line ids, and code that cannot fit above the minimum size.

## Minimal usage
~~~tsx
const source = { id: "finance", language: "ts", lines: codeLines(text, "l"), tokens: { l1: [{ text: "function", kind: "keyword" }, …] } };
const spec: CodeStageSpec = { id: "growth", fps: { num: 30, den: 1 }, source, beats: [
  { id: "axes", kind: "establish", durationFrames: 45 },
  { id: "rule", kind: "focus", from: "l1", to: "l3", durationFrames: 75 },
  { id: "gain", kind: "token", lineId: "l6", token: "gain", durationFrames: 75 },
] };

<CodeStageView spec={spec} frame={frame} width={1080} height={1920} onDiagnostics={report} />
~~~

## Contract
- **Source:**
  - `lines: { id, text }[]` with stable ids. Beats and anchors refer to lines by id, never by number. `codeLines(text, prefix)` assigns ids `prefix1`, `prefix2`, …
  - `tokens: Record<lineId, { text, kind }[]>`, supplied by the caller. The texts of each line's tokens must concatenate exactly to its text (`code-stage-token-mismatch`). A line with no tokens is drawn plain, with a warning (`code-stage-tokens-missing`).
  - Token kinds are role names (`keyword`, `string`, `number`, `comment`, `function`, `plain`). The view colours them from `--km-code-*` tokens, with fallbacks.
- **Beats:**
  - `establish`: the whole listing, nothing focused.
  - `reveal { lineIds }`: lines appear one after another across the beat. Lines not yet revealed stay laid out but invisible, so nothing reflows. Once revealed, a line stays visible.
  - `focus { from, to }`: lines from `from` to `to` in source order stay bright; the rest dim to 30%, over `moveFrames` (default 18), and dim back in after the beat.
  - `token { lineId, token, occurrence? }`: the line stays bright and one occurrence of `token` (0-based, default first) is ringed.
- **Layout:**
  - `layoutCodeStage(spec, box, { measure, maxFontPx, minFontPx, readablePx?, family?, lineHeight?, weight? })` chooses the largest integer font size that fits the width (with the line-number gutter) and the height, capped at `maxFontPx`.
  - Lines are top-aligned and never shift. Each token's x comes from measuring its exact prefix, so token rings land on the real glyphs.
  - Lines are never truncated. Code that cannot fit above `minFontPx` is an error (`code-stage-font-small`).
  - Code that fits but is under `readablePx` (the view uses 3.2% of the short side) is a warning (`code-stage-text-small`).
- **Validation:** `validateCodeStage(spec, layout?)`.
  - **Errors:** `code-stage-token-mismatch`, `code-stage-token-missing`, `code-stage-line-unknown`, `code-stage-line-duplicate`, `code-stage-range-invalid`, `code-stage-beat-invalid`, `code-stage-font-small`.
  - **Warnings:** `code-stage-beat-short` (a focus shorter than two settle periods, so it cannot be read), `code-stage-tokens-missing`, `code-stage-text-small`.
- **Evaluation:** `evaluateCodeStage(spec, frame)` returns the beat, the local frame, a per-line opacity and the focus in effect with its strength. It is pure, so seeks are exact.
- **Component:** `CodeStageView` owns no clock.
  - **Props:** `spec`, `frame`, `width` / `height`, `safe?` (default a 6% / 5% inset), `maxFontPx?` (default 5% of the short side), `minFontPx?` (default 2.4%), `family?`, `onDiagnostics`, plus forwarded `div` props and ref.
  - The font is measured with the real face and re-measured when web fonts load; the root reports `data-code-stage-status` as `pending` until then.
  - Root attributes: `data-km-code-stage`, `data-code-stage-beat`, `data-code-stage-status`. Lines carry `data-code-line`.
- **Limits:**
  - Line widths set the font size. A 9:16 listing with long lines is small and uses only the top band. Shorter lines are the fix; wrapping would break line identity, so it is not offered.
  - Tokenization is the caller's job. Nothing here knows a language.
  - Typed, cursor-level edits are not implemented. Edits between revisions are shown as fades and changed-token marks, not as typing.
  - Rendering uses the browser's monospace stack unless `family` is passed. Pass the same family everywhere, or widths will not match.

## Verification (2026-10-23)
- `npx vitest run tests/visual-constraints.test.ts`: eight CodeStage cases, 28 tests in the file.
  - **Fit:** the largest font that fits the width and the height is chosen, capped at `maxFontPx`; the listing is never truncated.
  - **Refusals:** tiny boxes refuse with `code-stage-font-small`; the unsafe stories each raise their own error.
  - **Tokens:** ring positions land on the measured prefix of the chosen occurrence; a missing occurrence is refused.
  - **Readability:** a warning fires under `readablePx`, and not above it.
  - **Timing:** reveals are progressive and stay visible; focus dims the others, restores them after the beat, and the layout never moves.
  - **Seeks:** `inspectSeekParity` holds over the whole story.
- Storybook (headless): all three domains at frames 120, 200 and 280 reached `ready` with no code-stage diagnostics. The refusals story lists each expected error. No console errors.
- Fixed after review:
  - **Small type:** the first demo lines were 48 characters, so the 9:16 output's type was about 27 px (roughly 10 CSS px on a phone). The demo lines are now 40 characters or fewer, and the readability warning was added.
  - **Refusal case:** the "cannot fit" case passed because its box was too tall; it now uses a 150 px box that forces the error.
  - **Duplicate ids:** the duplicate-line refusal also reports a token mismatch on that line. Both are correct: the second line has no tokens of its own.
- **Human visual review:** pending. All code is fictional and written for this demo; the tokenizer is a demo helper, not part of the library.

## Edit and output (P1.2)
- **Revisions:** `revisions: CodeRevision[]` holds complete later versions of the listing, each with its own `lines` and `tokens`. An `edit { to }` beat changes the listing into revision `to`. Revisions are used in beat order, starting from the base `source`.
- **Identity and slots:** rows are a union of line identities across the revisions, merged with an LCS on ids. Each row keeps one fixed slot, so **nothing reflows**. A removed line fades out and an added line fades in. A line whose text changed keeps its row, and only its changed tokens are marked, by common prefix and suffix. A line that moved shows as a removed row and an added row with its own key (`id#revision`), so no motion is implied that the diff did not record.
- **Layout:** the font size is fitted across every revision and the reserved terminal panel, so the size never changes between revisions. The gutter numbers differ per revision and follow the lines on screen.
- **Output:** `output { lines: { kind, text }[], exitCode? }` reveals each line in order in a panel below the listing. Kinds are `command` (shown with `$ `), `stdout`, `stderr`, `status` and `label`. `exitCode` adds an `exit N` line: green for 0, red otherwise. The panel is titled "Captured output · not executed". Nothing is run.
- **New diagnostics:** errors `code-stage-revision-unknown`, `code-stage-revision-duplicate`, `code-stage-output-empty`, `code-stage-terminal-line-invalid`, `code-stage-terminal-clipped`; warning `code-stage-edit-empty`. Token mismatches in a revision are the existing `code-stage-token-mismatch`, with the revision named.
- **Compatibility:** a spec with no edit or output beat lays out and evaluates exactly as before. The existing walkthrough and refusals still report `ready` and the same codes.

### Verification (2026-10-25)
| Check | Command or method | Result |
| --- | --- | --- |
| Revisions, identity, slot stability, changed tokens, seek parity, terminal reveal, reserved panel, refusals | `npx vitest run tests/code-stage-edit.test.ts` | 12 of 12 passed |
| Existing CodeStage behaviour and story tests | `npx vitest run tests/visual-constraints.test.ts src/visual/code-stage.stories.tsx` | Pass (63 and 2 tests in the two files, including the earlier CodeStage cases) |
| Edit and output story, both outputs, frames 100 / 260 / 340 / 420 | Playwright read of `data-code-stage-status` and `data-code-stage-revision` | `ready` at every frame; revision changes `growth` → `fee` at the edit; no diagnostics; no console errors |
| Walkthrough and refusals (existing) | Playwright | Walkthrough `ready`, no diagnostics; refusals list the same expected codes |
| Screenshots reviewed by the agent (not a human) | `edit-f260-landscape`, `edit-f420-landscape`, `edit-f340-portrait`, `edit-f420-portrait` | Removed lines fade while kept lines hold their slots; gutter numbers follow the revision; `exit 1` in red and `exit 0` in green; the panel reads "not executed" |

### Limits and findings
- **Establish does not show the listing.** Base lines stay at opacity 0 until a `reveal` beat shows them, although the doc describes `establish` as showing the whole listing. The existing stories all reveal before focusing, so I did not change that behaviour; the edit story reveals first too. Treat it as a known gap to resolve in a separate pass.
- **Typing is not implemented.** A change is a fade and a mark, not a character-level edit.
- **One language in the edit fixture.** The edit story uses TypeScript only. The tokenizer contract is language-neutral, and the existing story covers Python.
- **Moves are not drawn as motion.** A moved line leaves one slot and appears in another, so the viewer sees it disappear and reappear.
- **Human visual review is pending.**
