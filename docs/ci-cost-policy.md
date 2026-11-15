# GitHub Actions budget — local-first verification

Updated: 2026-11-14.

Routine pushes and pull requests run one automatic workflow:
`.github/workflows/visual-contracts.yml`. It performs TypeScript checking and
runs **only top-level unit test files added or modified by that change**
(`tests/*.test.ts`, `tests/*.test.tsx`, `tests/*.test.mjs`). The diff
is compared with the PR base commit or the pre-push commit, not the latest
worktree timestamp. Source-only changes therefore run typecheck **without
an automatic unit regression suite**. This is an intentional cost trade-off;
do not interpret a green check as full validation.

All expensive browser, multi-aspect, 3D and FFmpeg workflows are preserved
as **manual-only** GitHub workflows, not triggered by PRs or pushes. Prefer
running those tests **locally** before opening or merging a production PR:

```bash
npm ci
npm run typecheck
npm run catalog:check
npm run registry:validate
npm test
npm run test:all
npm run registry:smoke
npx playwright install chromium
npx playwright test -c playwright.storybook.config.ts tests/e2e-storybook/crayon-smoke.spec.ts
npx playwright test -c playwright.storybook.config.ts tests/e2e-storybook/crayon-scene.spec.ts tests/e2e-storybook/crayon-storybook.spec.ts
npm run film:check -- examples/film/crayon-storybook.film.json
npm run film:render -- examples/film/crayon-storybook.film.json --frames=420 --only=landscape --out=dist/crayon-local-proof
npm run film:render -- examples/film/crayon-storybook.film.json --frames=420 --only=portrait --out=dist/crayon-local-proof
```

Use targeted `npx vitest run --project unit tests/<new-test>.test.tsx`
during development. Full local checks (including both film aspects,
normal-speed video inspection and clean consumer installation) are a
**pre-merge responsibility**; CI checks cannot establish artistic acceptance.
No existing test file is deleted or disabled for local runs. The manual
Actions jobs remain available for occasional reproducible evidence when
needed, but should not be treated as the default validation route.
