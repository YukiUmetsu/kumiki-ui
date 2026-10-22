# Verification: ZoneBoundary and Local vs Upload Flow (2026-10-21)

Component spec: [zone-boundary.md](../component-specs/zone-boundary.md). Status stays **Implementing** until a human reviews the screenshots.

## Commands and results

| Check | Command | Result |
|---|---|---|
| Typecheck | `npm run typecheck` | exit 0 |
| Lint (new files) | `npx eslint registry/visual/zone-boundary.tsx src/visual/local-upload-flow.stories.tsx` | 0 errors, 0 warnings |
| Catalog | `npm run catalog:check` | OK: 296 entries, 572 verified stories |
| Catalog API | `npm run catalog:api -- --id=pack:zone-boundary --format=json` | exports resolved from source |
| Registry manifest | `npm run registry:validate` | OK, 126 items |
| Registry smoke | `npm run registry:smoke` | OK, 126 items, 1479 files staged |
| Catalog unit tests | `npx vitest run tests/component-catalog.test.tsx tests/catalog-api.test.mjs` | 6 passed |
| Render and geometry checks | one-off Playwright script against the running Storybook (not committed) | 9/9 checks passed |
| Standalone stories | one-off Playwright script for `visual-zone-boundary--*` | 7/7 passed (after shortening the demo label from "Converter's server" to "Converter", which had been wider than its zone and was correctly flagged) |

Not run in this step: the full unit suite. Its state is recorded in [redaction-reveal.md](redaction-reveal.md) (101 failures in 25 files, not yet attributed).

## Render and geometry checks (Chromium)

- Local panel: packets sampled every 8 frames across the 240-frame timeline; 0 of 14 samples fell outside the device zone.
- Upload panel: packets leave the device zone, reach the converter's server zone, and a returning packet reaches the device again.
- At frame 0, zone label pills do not overlap any node, edge labels ("upload") do not overlap nodes or zone labels, and zone label text fits inside its pill. No zone is flagged `data-km-zone-overflow`.
- No page errors.

Geometry was checked on rendered `getBoundingClientRect` boxes, not on the authored coordinates. Packet positions were read from the `transform` attribute of each packet group.

## Visual review

Screenshots (kept outside the repo, in the session scratchpad): `shots/flow-compare-f45.png`, `shots/flow-compare-f110.png`, `shots/flow-dark-f110.png`. Reviewed by the assistant, not by a human. Points to check by eye: packet labels near the zone border, whether the "upload" label reads clearly against the arrow, and the dark-theme contrast of the outside (orange) zone label.

## Known gaps
- The label width is an `em` estimate; the bounding-box check covers the fonts loaded in this environment only.
- No accessibility audit has been run. The diagram's `ariaLabel` describes the boundary in words, but this has not been checked with a screen reader.
- The story is a composition on DiagramStage, not a separate registry item; its behaviour depends on DiagramStage's current API.
