# Walk on Earth: Three.js Implementation Plan

**Goal:** Replace the flat travel montage with an actually rotating modeled globe and a stationary-in-world-location walking actor.
**Architecture:** Pure deterministic pose & world factory + React Three.js canvas wrapper; Storybook wires asset URLs and an existing export stage.
**Stack:** Three.js 0.186, React, Vitest, Storybook/Vite, GLTFLoader, Playwright Chromium.

## Task 1 — Behavioral contracts

- Add `tests/cinematic-walk-3d.test.ts` for deterministic world spin, stationary walker location, radial anchors, independent globe-child transforms, and biome visibility.
- Execute targeted Vitest and confirm RED.

## Task 2 — Scene implementation

- Add `registry/video/cinematic-walk-3d-scene.ts` for sphere shape, biome palette, scene props/attachment, absolute-frame pose.
- Add `registry/video/cinematic-walk-3d-react.tsx` for prop-driven `GLTFLoader` models, rigged walker, canvas, stable camera and direct frame render.
- Run tests to GREEN.

## Task 3 — Asset and Storybook integration

- Add 9 selected Kenney kit GLBs and 1 Poly Haven 1K ground texture; record specific provenance in `assets/THIRD_PARTY_ASSETS.json`.
- Update `src/video/cinematic-templates.stories.tsx` to mount the new scene for walk and list the exact CC0/MIT asset license references in its video export manifest.

## Task 4 — Verify and publish

- Storybook production build; inspect 0/120/240/359 screenshots, refine framing, export and probe real playable MP4; run relevant tests, typecheck and `hero:quality` with baseline diagnostics distinguished.
- Commit and push to `feat/scene-recipes-catalog-and-follow-subject`; provide Storybook launch instructions, video artifact, license summary, and remaining scene gaps.
