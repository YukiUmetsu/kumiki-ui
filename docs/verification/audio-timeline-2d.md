# Verification: Waveform and ClipTimeline2D (2026-10-21)

Component spec: [audio-timeline-2d.md](../component-specs/audio-timeline-2d.md). Status stays **Implementing** until a human reviews the screenshots.

## Commands and results

| Check | Command | Result |
|---|---|---|
| Typecheck | `npm run typecheck` | exit 0 |
| Lint (new files) | `npx eslint registry/visual/waveform.tsx registry/visual/clip-timeline.tsx src/visual/audio-trim.stories.tsx` | 0 errors, 0 warnings |
| Catalog | `npm run catalog:check` | OK: 300 entries, 584 verified stories |
| Catalog API | `npm run catalog:api -- --id=pack:audio-timeline-2d --format=json` | 10 exports resolved from source |
| Registry manifest | `npm run registry:validate` | OK, 130 items |
| Registry smoke | `npm run registry:smoke` | OK, 130 items, 1490 files staged |
| Catalog unit tests | `npx vitest run tests/component-catalog.test.tsx tests/catalog-api.test.mjs` | 6 passed |
| Search | `npm run catalog:find -- --query=waveform` / `trim` / `timeline` | finds `pack:audio-timeline-2d` for `waveform`; `trim` and `timeline` also match it |
| Storybook | index.json | five entries under `visual-audio-trim-timeline` |
| Render and geometry checks | one-off Playwright script against the running Storybook (not committed) | 10/10 passed |
| Standalone stories | one-off Playwright script for `visual-waveform--*` | 6/6 passed (96 bars per example; dimming only in the selection example; playhead only where requested) |

## Render and geometry checks (Chromium, 1.5x)

- Trim: every timeline's labels sit inside the viewBox and do not overlap; the accessible name states the kept range or "no trim".
- Dimmed regions appear only when the clip is trimmed (two in the trimmed timeline, none in the full one).
- Waveform: of 96 bars, 48 are full opacity inside a 2/12 to 8/12 selection, matching an independent calculation.
- Playhead at 4 s of 12 s sits at the same x in the waveform and the timeline.
- Edge cases (short trim 5–6 s, edge trim 0–1.5 s): labels stay separate and in bounds.
- Dark theme: labels inside bounds and not overlapping.
- Narrow column (260 units): labels inside bounds and not overlapping; no horizontal page overflow.
- No page errors.

Faults found during the checks and fixed before the final run:

1. Narrow timeline: ruler labels overlapped (seven labels in a 232-unit span). The ruler step now depends on the available width, with about 60 units per label and at most eight labels; steps 3, 4 and 6 were added for short widths.
2. The waveform was inset 10 units further than the timeline below it, so their edges did not line up. Both now use a 14-unit inset.

## Visual review

Screenshots (kept outside the repo, in the session scratchpad): `shots/audio-trim.png`, `shots/audio-edge.png`, `shots/audio-dark.png`. Reviewed by the assistant, not by a human. The edge-case screenshot shows In and Out moving outward when there is room and inward when there is not. The dimmed regions are heavier than ideal but still read as removed.

## Known gaps
- The validation throws (duration, trim order, playhead, peaks, progress, selection) were not exercised in a browser or unit test.
- The dimmed regions are a translucent overlay; their contrast depends on the track colour the host chooses.
- Label placement uses an estimated text width; the checks confirmed no overlap at the sizes shown, not at every font.
- No accessibility audit has been run.
