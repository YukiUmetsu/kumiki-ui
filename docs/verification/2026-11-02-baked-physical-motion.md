# PM2 offline collision playback: verification

## Verified

- `npm run typecheck`: passed.
- `npx eslint` on changed TypeScript and Storybook code: passed.
- `npx vitest run tests/baked-physical-motion.test.ts tests/blender-asset-bridge.test.ts tests/physical-motion.test.ts tests/blender-revision.test.ts`: **35 tests passed** across 4 files, including 7 new pure/Three bake tests and the new real bridge composition test.
- `npm run registry:validate`: **222 items** valid.
- `npm run registry:smoke`: **222 items / 3,191 staged files**.
- `npm run catalog:check`: **392 entries / 836 verified stories**.
- `npm run build-storybook`: production build passed, including new `craft-blender-asset-bridge--baked-collision-playback` story.
- Isolated consumer fixtures passed for `blender-asset-bridge` (**12 packages / 36 files**), `baked-physical-motion-three` (**6 packages / 17 files**), and `baked-physical-motion` (**1 package / 2 files**). Dependencies installed and public API examples typechecked.
- Browser/WebGL runtime screenshot **not signed off**: headless Chromium is not installed in this environment and Playwright download failed. No photo-realism, material realism, screenshot or output MP4 claim is made.

## Quality gates for the next pass

1. Compare Blender rigid-body viewport frames 0, 15, first contact, peak rebound and rest against Kumiki Storybook frames of a true exported collision bake. Test at 30 and 60 fps, including out-of-order frame seeks.
2. Verify the exported Blender object's glTF local transform basis matches the semantic node, especially when parents are rotated, scaled or animated. Compare linked part constraints and rest silhouette.
3. Check a stack of several objects: interpenetration at first impact, object ownership, contact order, settled orientation, camera/framing and shading continuity. Review actual MP4 frames and sync contact SFX from fractional event timestamps.
4. Implement and validate a first-party `kumiki-blender` bake exporter; its output should carry source simulation fps, frame range, stable semantic part IDs, and contact metadata. The current Storybook bake is a transparent authored API fixture.
