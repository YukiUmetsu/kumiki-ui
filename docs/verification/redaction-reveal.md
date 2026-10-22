# Verification: RedactionReveal (2026-10-21)

Component spec: [redaction-reveal.md](../component-specs/redaction-reveal.md). Status stays **Implementing** until a human reviews the screenshots.

## Commands and results

| Check | Command | Result |
|---|---|---|
| Typecheck | `npm run typecheck` | exit 0 |
| Lint (new files) | `npx eslint registry/visual/redaction.ts registry/visual/redaction-react.tsx src/visual/redaction-reveal.stories.tsx` | 0 errors, 0 warnings |
| Catalog | `npm run catalog:check` | OK: 295 entries, 570 verified stories |
| Catalog API | `npm run catalog:api -- --id=pack:redaction-reveal --format=json` | exports resolved from source |
| Registry manifest | `npm run registry:validate` | OK, 125 items |
| Registry smoke | `npm run registry:smoke` | OK, 125 items, 1478 files staged |
| Story render and DOM checks | one-off Playwright script against the running Storybook (not committed) | 13/13 checks passed |
| Full unit suite | `npm run test` | **not clean**: 1962 passed, 101 failed in 25 files (see below) |

## Render and DOM checks (Chromium, 2x)

- Redacted mode: covered strings (IP, email, token) are absent from the DOM text; three bars with accessible names.
- Revealed mode: full text present; three highlights.
- Overlay-only mode: all three covered strings remain in the DOM; bar colour equals letter colour, so the text is hidden only visually.
- Readout in overlay mode lists all three as still in the page.
- Light and dark: bar colour equals the text colour (`currentColor` default) in both.
- Narrow 240 px card: text and bars stay inside the card's content box; no page overflow.
- Invalid ranges: `clamped`, `empty`, `not-integer` and `merged` diagnostics all reported.
- No page errors.

A first narrow-column render overflowed its card because the grid track sized to the bar's intrinsic width. Fixed with `minmax(0, 1fr)` in the story layout, then re-checked.

## Visual review

Screenshots (kept outside the repo): `scratchpad/shots/` in the session scratchpad, including `modes-redacted.png`, `modes-revealed.png`, `modes-overlay.png`, `side-by-side.png`, `samples-light.png`, `dark-theme.png`, `narrow.png`, `invalid-ranges.png`. These were reviewed by the assistant, not by a human reviewer. A human review of light and dark, CJK wrapping and the overlay warning is still required.

## Known gaps
- Full unit suite is not green. The run reported 101 failures in 25 files. I captured only one failing file name (`src/visual/semantic-composition.stories.tsx > Constructed Device`) because the output was truncated. Two of the failing story files (`semantic-composition`, `explainer-production`) pass when run alone, and the new story file passes. Whether the full-run failures predate this change is **not established**; a full run with a JSON reporter is needed to list them.
- Bar width is an `em` approximation of the covered text, not exact glyph widths.
- No automated accessibility audit (axe) has been run on the stories.
