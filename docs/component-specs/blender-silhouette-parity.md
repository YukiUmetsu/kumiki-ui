# Blender ↔ Kumiki visual geometry QA

`HeroAssetViewer` now has an optional `visualQaMode="silhouette"`: white, unlit asset geometry on pure black, with studio meshes excluded. This mode never edits imported glTF materials. The normal, interactive Storybook camera/lighting inspector is unchanged.

## Run locally (not in CI)

1. Start Storybook with `npm run storybook`.
2. Install Playwright Chromium locally if necessary: `npx playwright install chromium`.
3. Inspect the plan: `node scripts/capture-blender-bridge-parity.mjs --dry-run`.
4. Capture into a **new** directory: `node scripts/capture-blender-bridge-parity.mjs --output /tmp/km-bridge-web`.
5. Generate native Blender PNGs from the *same plan* and compare with the `kumiki-blender bridge-parity` CLI. See `kumiki-blender/docs/BRIDGE_SILHOUETTE_PARITY.md` for the complete native and comparison commands.

The current reference fixture is **3D asset toolkit → Blender Asset Bridge → Rotational Impact → Real Blender Angular Impact**. Use `&kmSilhouette=1` in its Storybook iframe URL to see the geometry-only capture manually. The story imports `visual-parity-plan.json` as its default camera to keep both renderers aligned. The portable plan also pins the GLB SHA, action ID, dimensions, and frames 0, 10, 17, 50, 99.

### Extend to any imported asset

- Put the GLB and the parity plan beside each other (or specify `--model`). Reference the exact Storybook story ID in `story_id` and the baked action in `action_id`.
- Keep the camera preset `mode: "replace-shot"`, `camera.space: "world"`, perspective, and Y-up coordinates; use `validateCameraLightingPreset(plan.camera_preset)` for the normal/default camera.
- Mark the story root `data-km-parity-action={ACTION}`, the controlled range input `data-km-parity-seek`, and enable silhouette mode with `pixelRatio={1}` only for `kmSilhouette=1` capture requests.
- Capture/compare with the separate Python CLI. This checks silhouettes and camera/pose, not photographic material realism, lighting, environment, SFX, or physical validity.

Browser screenshots remain **manual local QA** and are intentionally omitted from GitHub Actions/FFmpeg CI. Every capture gets a hashed receipt; mismatched plans, GLBs, image dimensions, missing frames or empty masks fail rather than producing a misleading green result.
