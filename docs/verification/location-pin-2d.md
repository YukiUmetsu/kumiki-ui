# Verification: LocationPin2D (2026-10-21)

Component spec: [location-pin-2d.md](../component-specs/location-pin-2d.md). Status stays **Implementing** until a human reviews the screenshots.

## Commands and results

| Check | Command | Result |
|---|---|---|
| Typecheck | `npm run typecheck` | exit 0 |
| Lint (new files) | `npx eslint registry/domains/location-pin-2d.tsx src/visual/location-pin.stories.tsx` | 0 errors, 0 warnings |
| Catalog | `npm run catalog:check` | OK: 298 entries, 577 verified stories |
| Catalog API | `npm run catalog:api -- --id=pack:location-pin-2d --format=json` | 5 exports resolved from source |
| Registry manifest | `npm run registry:validate` | OK, 128 items |
| Registry smoke | `npm run registry:smoke` | OK, 128 items, 1485 files staged |
| Catalog unit tests | `npx vitest run tests/component-catalog.test.tsx tests/catalog-api.test.mjs` | 6 passed |
| Render and geometry checks | one-off Playwright script against the running Storybook (not committed) | 3/3 passed |

## Render and geometry checks (Chromium, 1.5x)

Checked on the six drawings (three states in light and dark):

- Every caption renders on one line, with no overflow flag, and its text box sits inside its 22-unit pill.
- The pin stays inside the map and above the caption.
- The approximate state shows no pin.
- The stripped state shows its slash mark.
- The stripped caption reads "No location tag"; the tagged caption reads the supplied coordinates.
- No page errors.

Faults found during the checks and fixed before the final run:

1. The caption pill was 20 units, and the text's box overhung it by half a unit. The pill is now 22 units, matching the file badge.
2. In the dark theme the caption text used the light text token on the light pill, so it was nearly invisible. Caption text now uses the ink token.
3. The first check version matched the title band as a caption. It now skips text below the art region.

## Visual review

Screenshots (kept outside the repo, in the session scratchpad): `shots/location-states.png` (light) and `shots/location-dark.png` (dark). Reviewed by the assistant, not by a human. The pin was enlarged after the first review, because it read too small.

## Known gaps
- The stripped state's dashed ring is dim in the dark theme (documented in the spec).
- The street grid is abstract and fixed; it does not vary by location.
- The validation throws (latitude, longitude, lone coordinate, unknown state) were not exercised in a browser or unit test in this session.
- No accessibility audit has been run.
