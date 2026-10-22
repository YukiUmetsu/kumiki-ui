# Verification: FileFormat2D and FormatConversion2D (2026-10-21)

Component spec: [file-format-2d.md](../component-specs/file-format-2d.md). Status stays **Implementing** until a human reviews the screenshots.

## Commands and results

| Check | Command | Result |
|---|---|---|
| Typecheck | `npm run typecheck` | exit 0 |
| Lint (new files) | `npx eslint registry/domains/file-format-2d.tsx src/visual/file-formats.stories.tsx` | 0 errors, 0 warnings |
| Catalog | `npm run catalog:check` | OK: 297 entries, 575 verified stories |
| Catalog API | `npm run catalog:api -- --id=pack:file-format-2d --format=json` | 8 exports resolved from source |
| Registry manifest | `npm run registry:validate` | OK, 127 items |
| Registry smoke | `npm run registry:smoke` | OK, 127 items, 1482 files staged |
| Catalog unit tests | `npx vitest run tests/component-catalog.test.tsx tests/catalog-api.test.mjs` | 6 passed |
| Render and geometry checks | one-off Playwright script against the running Storybook (not committed) | 4/4 passed |

## Render and geometry checks (Chromium, 1.5x)

Checked on all 22 drawings across the three stories (5 single kinds, 6 conversions in light and dark, plus the dark-theme copies):

- Every format badge renders on one line (`data-km-text-lines="1"`), with no overflow flag.
- Every badge text's bounding box sits inside its badge rectangle.
- Every sheet sits inside the protected art region (y 10–160).
- Every title sits inside the 240-unit viewBox with no overflow flag.
- No page errors.

Two faults surfaced during the checks and were fixed before the final run:

1. The `accent` prop was passed as a tone name; the toolkit requires a six-digit hex colour, so every drawing failed to render. The prop was removed.
2. The conversion badges overhung their rectangles, because the badge height scaled with the sheets but the text did not. The badge is now a fixed 22 units in every drawing.

The check script also initially read the wrong rectangle for each badge (a glyph rectangle from the same group). That was a bug in the check, corrected before the final run.

## Visual review

Screenshots (kept outside the repo, in the session scratchpad): `shots/files-kinds.png`, `shots/files-conversions.png`, `shots/files-dark.png`. Reviewed by the assistant, not by a human. Fixes made during review:

- The audio waveform was white on the paper sheet; it now uses the kind's tone.
- The document lines were too faint; their opacity is raised to 0.7.
- The data grid's top row was white; every cell now uses the kind's tone.
- The PDF and TXT labels were white on light blue-grey; the label colour is now chosen by measured contrast.
- The HEIC/JPG and PNG/WEBP labels were white on orange; they now use ink.

## Known gaps
- `normalizeFileFormat` and the kind check throw on invalid input, but the throw paths were **not exercised** in a browser or unit test in this session.
- The badge glyph and text positions depend on `FitText`'s font measurement. The checks ran against the fonts loaded in this environment only.
- No accessibility audit has been run; the drawings' accessible names come from the title only.
- Conversion drawings are smaller relative to the artboard than single files, so their badge text is also relatively smaller.
