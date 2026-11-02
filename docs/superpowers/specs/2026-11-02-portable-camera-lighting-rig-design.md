# Portable Camera & Lighting Rig — Design

**Date:** 2026-11-02
**Status:** Approved by owner on 2026-11-02; initial implementation in the portable camera/lighting PR.
**Repository baseline:** `3985ca7` on `main` (2026-11-01).
**Intent:** A single reusable camera-and-lighting authoring contract, editable in Storybook but also consumable by Kumiki 3D/2.5D scenes, video export, ContentGen, and a future Blender bridge.

## Why

Camera zoom, height and look angle are currently repeated across Storybook stories. `CameraViewport3D` includes a preview-only zoom control, while `HeroAssetViewer` uses separate `azimuth`, `elevation`, `zoom`, `target`, `fov`, `exposure` and `studio` inputs. More advanced scenes author their own light rigs inside `createScene`. The user's adjustments should be reusable in any compatible situation, not lost in a Storybook session or tied to one viewer's props.

## Goals

1. Provide a **versioned, renderer-neutral JSON preset**, with no React, DOM, Storybook, Three.js, Blender or source-media dependency in its core types and validation.
2. Support camera zoom/distance, height, yaw (left/right), pitch (top/bottom), look-at target, roll and lens/projection choices; support exposure, light list, type, position/direction, color/temperature, intensity and shadow settings.
3. Offer a compact, keyboard-accessible **Storybook Camera & Lighting Inspector**, consistent across compatible scenes. Changes preview immediately; Reset, Copy JSON, Import JSON and Download JSON make the same presets portable.
4. Provide explicit adapters to existing `CameraViewport3D`, `HeroAssetViewer`/`HeroStudio`, and supported 2.5D renderers without creating another timeline or WebGL renderer. Leave the underlying scene's authored defaults intact until the consumer explicitly applies a preset.
5. Allow preset values to drive both preview and final exports through an existing absolute-frame scene evaluator. Other consumers, including ContentGen and Blender, can load the same JSON with an adapter.
6. Scale across differently sized assets through **subject-relative coordinates** while retaining an explicit world-space mode for surveyed scenes.

## Non-goals / anti-goals

- No second scene/document schema, camera clock, animation runtime or rendering engine; camera motion continues to use existing MG1/CC1 and the host's integer frame.
- No mandatory Storybook dependency in public registry packages or invisible global DOM/canvas mutations in production.
- No promise that Blender and Three.js render photometrically identical pixels: light types, tone mapping and material models differ.
- No fake 2.5D relighting of a baked photograph. Unsupported light/material controls must be shown as unavailable with an explanation, not silently accepted.
- No automatic mass migration of every story or replacement of scene-specific cinematic lights. The initial proof adopts representative scenes, then offers an incremental migration route.
- No arbitrary executable expressions, filesystem paths or URLs inside portable presets.

## Approaches considered

### A. Extend individual camera components (rejected)

Add more props and local controls to `CameraViewport3D` and `HeroAssetViewer`. It would be quick for a single story, but it perpetuates duplicated panels and incompatible settings; importing a Blender or ContentGen preset would still require bespoke conversion.

### B. Shared preset schema + renderer adapters (**selected by owner**)

Define a small portable format, pure validation/evaluation helpers, and opt-in adapters. Build the Storybook inspector as a consumer of that shared format. The initial change is larger but consumers can reuse the preset without copying UI code or assuming a specific renderer.

### C. Full cross-application scene editor (rejected)

An editor that owns the timeline, asset pipeline, scene graph and rendering would duplicate ContentGen, Blender, MG1 and the Storybook scene system. Too much complexity for reusable camera/light authoring.

## Canonical preset contract

Proposed concept (field names illustrative until the implementation plan checks the existing camera APIs):

```json
{
  "schemaVersion": 1,
  "id": "museum-hero",
  "camera": {
    "space": "subject-relative",
    "target": "subject:center",
    "azimuthDeg": 28,
    "elevationDeg": 18,
    "heightOffset": 0,
    "distanceFactor": 1.3,
    "rollDeg": 0,
    "projection": { "kind": "perspective", "fovDeg": 32 }
  },
  "lighting": {
    "exposure": 1,
    "lights": [
      { "id": "key", "type": "directional", "position": [1.2, 2.4, 2.8], "color": "#fff2df", "intensity": 1.6, "castShadow": true },
      { "id": "fill", "type": "directional", "position": [-2, 1.4, 1], "color": "#cbdcff", "intensity": 0.5, "castShadow": false }
    ]
  }
}
```

**Coordinate rules:** right-handed Y-up canonical space; explicit units and finite bounds. `subject-relative` positions and height offset are interpreted against the chosen asset bounding sphere/box and semantic anchor, so a small book and a large statue preserve similar composition. `world` mode uses actual model/world coordinates without hidden auto-fit. The resolver must surface missing semantic targets and unsupported projection/light types.

**Normalization choice:** the asset bounding-sphere radius is the shared reference length (not raw mesh units or per-axis max extent); semantic targets are resolved before camera placement. Reject degenerate or missing bounds rather than inventing a scene size. Relative normalized light positions and camera offsets are multiplied by that radius. Store the resolved world pose in export diagnostics so a mismatch between host scenes can be inspected.

**Camera policy:** zoom changes dolly distance or orthographic scale; FOV remains a separate lens choice. Yaw/elevation orbit the target, camera height offsets the resulting pose, and look direction must remain separately controllable. Clamp dangerous polar, near/far and zoom ranges to avoid invalid matrices. Support explicit pose/quaternion adapters for existing CC1 without losing the authored orientation.

**Light policy:** `lights.length` is the light count; adding/removing lights is an explicit list edit. Each light has a stable ID, type, enabled flag, relative/world position or direction, color/temperature, intensity and shadow settings when supported. Keep image-based environment illumination and exposure distinct from physical emitters. An adapter declares supported capabilities and returns diagnostics for approximated/unavailable properties. The public contract cannot assume every renderer uses identical intensity units.

The adapter manages only a named/owned light group. In `replace-managed` mode (default when a preset is explicitly applied), it replaces the renderer's declared studio lights but preserves unrelated authored/in-scene lights and reports when those would stack. An explicit `augment` mode is available to deliberately add lights alongside the studio rig. The existing `HeroStudio` hemisphere/directional lights and HDR environment must be inventoried and switched/overridden coherently; no accidental double illumination. An environment policy distinguishes `keep`, `override` and `disable` rather than treating an HDRI as another point light. Require either `color` or `temperatureK` per light (not ambiguous simultaneous inputs); clip temperature to a documented useful range. Cap the initial inspector to 8 authored lights and at most 2 shadow casters unless the renderer provides an approved higher budget.

**Animated-camera composition:** adopting a static preset is explicit. For an existing MG1/CC1 animation, inspector adjustments default to reversible **preview offsets** applied after the authored frame pose; the user may deliberately choose `replace-shot` to set the full saved shot pose. The saved preset records the composition mode so export applies the exact intended behavior. A standalone `HeroAssetViewer` without an authored path uses `replace-shot` by default. Camera clip planes derive conservatively from resolved bounds, with an explicitly supported override for tightly layered scenes. No silent mutation of original keyframes.

**Animation:** optional frame-keyed camera/light overrides compile to the existing absolute-frame MG1/CC1 tracks; no `requestAnimationFrame`, new timebase or hidden additive animation. Initial UI may author static presets; timeline editing is an explicit follow-up, not silently implemented through stateful interpolation.

**Serialization:** stable IDs, ordered light records, migration/version checks, round-trip validation, canonical JSON output, and no executable expressions. An imported preset cannot change unrelated scene data. Asset references and semantic targets remain host-provided IDs rather than unvalidated paths.

## Adapters and ownership

| Boundary | Responsibility | Initial scope |
| --- | --- | --- |
| Pure registry core (`registry/motion/` or adjacent existing owner) | Types, validation, camera/light resolution, serialization, capabilities | Implement first, no renderer dependency |
| Three.js adapter (`registry/craft/` / existing camera boundary) | Apply camera transforms, Three light objects and controlled exposure; dispose created resources | `CameraViewport3D` and `HeroAssetViewer` proof |
| 2.5D adapter | Apply meaningful camera/parallax/exposure settings; report unsupported physical light controls | `image-relief-2-5d` + one depth-composite proof |
| Installable inspector pack (`registry/` + optional CSS) | Accessible, reusable React UI consuming the portable preset and capabilities, with no Storybook imports | One shared panel in Storybook or any compatible app |
| Storybook (`src/` and `.storybook/`) | Thin opt-in decorator/wrapper wiring the installable inspector to story adapters and preview state | No copied control panels |
| ContentGen | Own persistence, projects/jobs and user asset selection; pass preset to Kumiki preview/export | Documented portable JSON handoff, integration proof later |
| Kumiki-Blender | Map camera/light preset into Blender scene coordinates and supported light types | Separate later adapter with real Blender render proof |

Do not put a generic Blender or ContentGen service client in the source-distributed UI registry. Library packages remain independently installable and their dependencies explicitly registered.

## Storybook interaction design

**Layout:** a compact, collapsible inspector dock outside the rendered video safe frame where possible. Camera and Lighting sections; no permanent overlays across the actual composition. Existing playback/scrub controls remain accessible. A small Reset action restores authored defaults; Copy/Download/Import use the identical portable JSON. Avoid modal confirmations for reversible changes.

**Camera:** zoom with `−`/`+` buttons and slider, height slider with numeric value, yaw/pitch in degrees, FOV, target selection, Front/Back/Left/Right/Top/Three-quarter presets, Reset Camera. Keyboard sliders expose visible labels, values and limits. Direct drag orbit and wheel zoom are optional progressive enhancements, and must not conflict with video scrubbing.

**Lighting:** exposure/brightness slider, add/remove/reorder lights, type selector, enabled toggle, per-light color picker and intensity, X/Y/Z positioning, shadows when supported, Reset Lighting. Display an actionable capability message rather than inert controls for scenes that cannot physically relight images.

**Reuse:** story metadata opts in; host supplies a typed adapter/capability description and asset bounds. The shared inspector lives in an installable registry pack and can be mounted directly in an application outside Storybook; only its Storybook integration lives in `.storybook/`. Storybook may locally remember named presets to reduce repeated clicks, but explicit JSON export or application-controlled storage is the portable source of truth. Preview overrides are never silently applied to final MP4s. A production scene declares its preset reference, revision and composition mode so its render can be reproduced. When the shared inspector is active, suppress the existing viewport `zoomControls` to avoid two controls changing zoom independently.

**Responsive:** controls collapse to a side/bottom inspector on narrow viewports while keeping the canvas visible. Use existing Kumiki tokens and accessible form/slider primitives. The panel should be visually quiet, with restrained focus/hover transitions and no animation on every slider movement.

## Failure and edge cases

- Missing/invalid imported JSON: reject before changing the current scene and show field-specific errors.
- Unsupported light, projection or 2.5D relighting: explicit disabled state or warning; no silent misleading fallback.
- Missing target/zero bounds or unmatched named parts: keep last valid view and report repair guidance.
- GPU context loss or slow material compilation: reuse existing renderer's error/retry/readiness paths; never claim a captured frame is ready before actual draw.
- Reduced motion or static export: one exact final requested pose; no background animation.
- Light count/resource budget: enforce safe caps and report cost; cleanly dispose dynamically added lights/shadow maps.
- Absolute-frame replay and story switching: same input → same camera/light state, including random seek/reverse; no cross-story state leaks.

## Delivery slices and acceptance

1. **Core + pure tests:** validate/serialize/resolve, subject-relative fitting, stable IDs, unsupported capability diagnostics, import errors, frame-key parity. Compare the existing Hero and CameraViewport camera conventions explicitly.
2. **Reusable Storybook inspector:** prove both `CameraViewport3D` and `HeroAssetViewer` in landscape and portrait; controls actually alter WebGL pixels; reset/import/export round-trip; a second story picks up the same imported preset without copied UI implementation.
3. **Lighting adapter + 2.5D honesty:** add/remove/edit Three lights and exposures without destroying authored resources; test lighting visibility and cleanup. Use one 2.5D depth scene with supported controls and honest disabled physical relighting.
4. **Export proof:** save a preset, render representative first/mid/final frames through the existing frame export path, import on a clean story/application and verify camera/lighting state. Preserve explicit source/hash provenance and scene revision links.
5. **Cross-application adapters:** propose and validate separately with actual ContentGen and Blender consumers; do not mark this complete based on a TypeScript mock.

Required checks include TypeScript, targeted Vitest, catalog/registry validation and clean-consumer smoke, real Storybook browser interaction, GPU screenshots under multiple settings, 16:9 and 9:16 captures, keyboard accessibility, and actual MP4 review when export changes. Human visual signoff remains separate from structural tests.

## Open owner decision

The owner has selected **Approach B** and explicitly requires reuse beyond Storybook. This design assumes named local Storybook presets plus explicit JSON export/import, with host applications responsible for authoritative storage. It also assumes progressive integration rather than rewriting all stories at once. The concrete decisions about radius normalization, managed lights/environment, preview offsets versus `replace-shot`, color/temperature precedence and shadow limits are designer defaults, not user-specified requirements. Approval of this design precedes an implementation plan and product code.

**Source references:** `registry/motion/camera-viewport-3d.tsx`, `registry/craft/hero-viewer.tsx`, `registry/craft/hero-studio.ts`, `registry/motion/cinematic-camera-director.ts`, `registry/craft/image-relief.ts`, `registry/craft/depth-composite.ts`, `.storybook/preview.tsx`; [Storybook globals](https://storybook.js.org/docs/essentials/toolbars-and-globals), [controls](https://storybook.js.org/docs/essentials/controls) and [addon types](https://storybook.js.org/docs/addons/addon-types).
