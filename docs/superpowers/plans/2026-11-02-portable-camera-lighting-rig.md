# Portable Camera and Lighting Rig Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make camera/lighting presets portable between Storybook, Kumiki viewers and video export without per-story control code.

**Architecture:** A pure JSON contract resolves relative camera/light settings using explicit subject bounds. Optional Three.js adapters apply those resolved values to existing scene/viewer boundaries, and a reusable React inspector edits the exact same JSON. Storybook demonstrates the inspector through opt-in stories; future Blender and ContentGen adapters consume the same format in separate projects.

**Tech Stack:** TypeScript, React 18, Three.js 0.186, Storybook 10, Vitest, existing Kumiki MG1/CC1 and registry manifest.

**Spec:** `docs/superpowers/specs/2026-11-02-portable-camera-lighting-rig-design.md`

## Global Constraints

- No new camera clock, scene schema or renderer; honor existing integer-frame evaluation.
- Pure preset/validation module imports no React, Three, Storybook, DOM or Blender.
- Presets are explicitly applied; no hidden production globals. JSON import must validate before affecting a scene.
- Relighting a baked photograph is not supported; 2.5D cameras get the meaningful camera/exposure subset.
- The Storybook inspector is a reusable registry component, not an addon-only widget.
- The initial PR ships the pure core, Three and 2.5D-boundary compatibility, installable UI and real Storybook proof. Blender and ContentGen adapters are follow-ups.

## Review Focus

1. Invalid JSON, duplicate light IDs, non-finite values and impossible bounds reject atomically (Task 1 tests).
2. A preset on an animated shot must not silently delete or corrupt MG1 keyframes (Task 2 tests).
3. `HeroStudio` lights/environment must not double-stack when switching presets repeatedly (Task 2 tests).
4. Repeated story switching and rerenders must not leak Three light/shadow resources or scene state (Task 2/3 tests).
5. A 2.5D scene must make unsupported relighting visible rather than silently mutating original image pixels (Task 3 tests).

---

### Task 1: Versioned portable preset contract

**Files:**
- Create: `registry/motion/camera-lighting-preset.ts`
- Create: `tests/camera-lighting-preset.test.ts`

**Interfaces:**
- `CameraLightingPreset` JSON data with `schemaVersion`, `id`, camera (subject-relative/world space, spherical orbit, target, lens), lighting (exposure/environment policy, typed named lights), `mode` (`preview-offset` or `replace-shot`).
- `validateCameraLightingPreset(value: unknown): CameraLightingPreset` throws field-specific errors.
- `resolveCameraLightingPreset(preset, bounds, authoredPose?): ResolvedCameraLightingPreset` returns an absolute camera pose and resolved light positions; applies explicit composition mode.
- `serializeCameraLightingPreset(preset): string` returns a stable canonical JSON representation.
- `DEFAULT_CAMERA_LIGHTING_PRESET` is a safe importable starting point.

- [ ] **Step 1:** Write tests for valid round-trip; invalid schema/IDs/positions; >8 lights/>2 shadow casters; color vs Kelvin; subject-relative normalization; explicit world-space coordinates; replace vs preview offset; orthographic zoom; zero bounds rejection.
- [ ] **Step 2:** Run `npx vitest run tests/camera-lighting-preset.test.ts` and verify failures for missing exports.
- [ ] **Step 3:** Implement the pure types, validation, resolution and canonical serialization without renderer imports.
- [ ] **Step 4:** Run focused tests and TypeScript compilation; expect PASS.
- [ ] **Step 5:** Commit `feat: add portable camera lighting preset contract`.

### Task 2: Opt-in Three viewer adapter

**Files:**
- Create: `registry/craft/camera-lighting-three.ts`
- Modify: `registry/motion/camera-viewport-3d.tsx`
- Modify: `registry/craft/hero-viewer.tsx`
- Create: `tests/camera-lighting-three.test.ts`

**Interfaces:**
- `applyCameraLightingToThree(camera, scene, preset, bounds, authoredPose?, options?)` updates the current camera and a reusable, tagged light group; returns diagnostics and `dispose` cleanup. Camera only changes when an explicit preset is present.
- Viewports accept an optional `cameraLightingPreset` and explicit `cameraLightingBounds` when automatic asset bounds aren't authoritative; `HeroAssetViewer` uses its asset bounds.
- A `preview-offset` applies after each absolute-frame authored pose; `replace-shot` substitutes the resolved static pose without altering the MG1 track.

- [ ] **Step 1:** Test camera placement, stable light-list reconciliation, replacing managed studio lighting, preservation of unrelated authored lights, dispose and repeated apply, and animated camera preview offsets.
- [ ] **Step 2:** Run targeted tests and confirm expected failures.
- [ ] **Step 3:** Implement Three light/camera adapter and integrate only at the existing viewports' render boundaries. Preserve their ownership/disposal and readiness hooks; don't rebuild GPU resources on each slider drag.
- [ ] **Step 4:** Run focused tests, existing camera/viewer tests, and `npm run typecheck`; expect PASS.
- [ ] **Step 5:** Commit `feat: apply portable camera and lighting presets to 3d viewers`.

### Task 3: Reusable inspector and Storybook proof

**Files:**
- Create: `registry/motion/camera-lighting-inspector.tsx`
- Create: `src/craft/camera-lighting-inspector.stories.tsx`
- Create: `tests/camera-lighting-inspector.test.tsx`
- Modify: `.storybook/preview.tsx` only if a thin opt-in decorator provides a better ownership path than wrapping the two demo viewers.

**Interfaces:**
- `<CameraLightingInspector value onChange capabilities? onReset? />` is a controlled, accessible UI with camera position/orbit/zoom/lens, light count/color/intensity/position/shadows, reset, preset JSON import/export/copy and capabilities.
- It never reaches into a WebGL renderer; stories wire `value` into the viewer's new `cameraLightingPreset` prop.
- The same installable UI accepts a 2.5D capability descriptor that disables unsupported physical light edits with an explicit explanation.

- [ ] **Step 1:** Write React Testing Library checks for camera slider changes, adding/removing light IDs, valid/invalid import without partial update, reset, disabled physical-light controls for 2.5D, and keyboard labels.
- [ ] **Step 2:** Run focused tests and confirm failures.
- [ ] **Step 3:** Implement a compact, collapsible token-styled inspector with no new runtime dependency. Create Storybook stories for both viewer types and a 2.5D depth scene, using a single inspector implementation.
- [ ] **Step 4:** Run focused tests, Storybook build and real browser interaction/screenshots if browser available; report actual results.
- [ ] **Step 5:** Commit `feat: add reusable storybook camera lighting inspector`.

### Task 4: Registry, portability and release proof

**Files:**
- Modify: `registry.json`
- Modify: `registry/motion/index.ts` and `registry/craft/index.ts` as appropriate to existing module conventions.
- Create: `docs/component-specs/camera-lighting-inspector.md`
- Modify: `README.md` or `docs/INDEX.md` for discovery.
- Test: `tests/camera-lighting-preset.test.ts`, `tests/camera-lighting-three.test.ts`, `tests/camera-lighting-inspector.test.tsx`

**Interfaces:**
- Source-distributed registry items for the pure preset, optional Three adapter, and installable React inspector with explicit dependency closure.
- A documented copyable JSON example imported in another story/application and passed to the renderer; video exports use existing frame capture without overlay controls.

- [ ] **Step 1:** Register and document exact files/exports, install order, defaults, capabilities, limitation of 2.5D physical light controls, and cross-application JSON format.
- [ ] **Step 2:** Run `npm run catalog:check`, `npm run registry:validate`, `npm run registry:smoke`, targeted `registry:fixture`, typecheck, lint and relevant unit tests; fix failures.
- [ ] **Step 3:** Capture actual Storybook WebGL settings changes and an export proof if local tools are present; distinguish GPU/browser evidence from pure tests.
- [ ] **Step 4:** Commit `docs: register and qualify camera lighting inspector`.
- [ ] **Step 5:** Review changed files, push the feature branch and create a GitHub PR summarizing implementation, verified checks, known limitations and the next Blender/ContentGen work.
