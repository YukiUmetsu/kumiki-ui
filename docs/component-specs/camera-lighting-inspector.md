# Portable Camera & Lighting Inspector (CL1)

Status: implementing; structural tests available, human GPU/visual signoff pending.

The same controlled camera/lighting preset drives `CameraViewport3D`, `HeroAssetViewer`, and compatible authored/exported scenes. Storybook is an example host, **not** the owner of the controls. No Storybook dependency is needed in a consuming React application.

## Install and reuse

Registry packs:

- `camera-lighting-preset`: pure TypeScript schema/validator/resolver; no React, Three.js or browser dependency.
- `camera-lighting-inspector`: React controlled panel, JSON import/export; depends on `camera-lighting-preset`.
- `camera-lighting-three`: Three.js adapter; depends on `camera-lighting-preset`.
- `camera-lighting-preview`: optional scoped React context so several viewers in one QA surface can share a temporary override without changing their authored props.
- `camera-viewport-3d` and `crafted-3d-hero`: optional viewers that now accept a preset prop and pull in the adapter.

Use the inspector directly in a Storybook story, standalone React editor, or ContentGen preview:

```tsx
import { useState } from "react";
import { CameraLightingInspector } from "./components/motion/camera-lighting-inspector";
import { DEFAULT_CAMERA_LIGHTING_PRESET } from "./components/motion/camera-lighting-preset";
import { CameraViewport3D } from "./components/motion/camera-viewport-3d";

function ShotSettings({ timeline, frame, createScene }) {
  const [preset, setPreset] = useState(DEFAULT_CAMERA_LIGHTING_PRESET);
  const bounds = { min: [-2, -1, -1], max: [2, 1, 1] } as const;
  return <>
    <CameraViewport3D timeline={timeline} frame={frame} cameraId="camera" cameraMode="pose"
      createScene={createScene} width={1920} height={1080}
      cameraLightingPreset={preset} cameraLightingBounds={bounds} />
    <CameraLightingInspector value={preset} onChange={setPreset} />
  </>;
}
```

In your application, keep `createScene`/`createAsset` identities stable with `useCallback` or equivalent. For a crafted asset, pass the same `cameraLightingPreset` to `<HeroAssetViewer>`; it obtains bounds automatically. Suppress the old viewport `zoomControls` when using the shared inspector—the viewer does that automatically.

The panel changes the *input data*. It does not touch WebGL internals, create a new renderer or mutate an MG1 track. This makes it useful wherever a controlled React panel can be displayed; a non-React host can use only the JSON schema and its own UI.

## Portable JSON

```json
{
  "schemaVersion": 1,
  "id": "museum-hero",
  "mode": "replace-shot",
  "camera": {
    "space": "subject-relative", "target": "subject:center",
    "azimuthDeg": 28, "elevationDeg": 18, "heightOffset": 0,
    "distanceFactor": 3, "rollDeg": 0,
    "projection": { "kind": "perspective", "fovDeg": 32 }
  },
  "lighting": {
    "exposure": 1, "environment": "disable", "mode": "replace-managed",
    "lights": [
      { "id": "key", "type": "directional", "enabled": true,
        "position": [1.2, 2.4, 2.8], "color": "#fff2df",
        "intensity": 2, "castShadow": true }
    ]
  }
}
```

Copy JSON or Download JSON from the panel, or programmatically call `serializeCameraLightingPreset(preset)`. In a new scene, call `validateCameraLightingPreset(JSON.parse(savedJson))` **before** applying it. Invalid input—including unknown versions, non-finite values, duplicate light IDs, more than 8 lights or more than 2 active shadow casters—rejects without mutating the live scene.

The `subject-relative` reference length is the subject bounding-sphere radius. Relative light positions and custom look-at targets use its center as the origin; a target of `[1, 0, 0]` aims one radius right of center. `world` space bypasses the radius factor. Provide trustworthy nonzero bounds; do not guess scale for an imported asset. Camera `distanceFactor` is a radial distance, and the UI presents its inverse as an intuitive zoom multiplier.

`preview-offset` keeps the host's authored frame pose as the base and adds yaw, pitch, height and distance offsets after each MG1/CC1 evaluation. Orthographic zoom adjusts the authored projection scale; MG1 roll, portrait-adjusted FOV and CC1 authored quaternion are preserved. Look-at target and lens choices stay authored (their inspector controls are disabled in this mode). `replace-shot` intentionally uses the saved static preset pose; neither mode changes existing keyframes. The renderer applies a preset on every frame in both preview and export if that caller supplies it—avoid applying UI-only changes invisibly to production jobs.

## Lighting capabilities and ownership

The Three adapter owns only `kumiki-camera-lighting-preset` scene objects. It reconciles lights by stable ID and reuses light instances during slider changes. It may hide only studio lights explicitly passed as `managedLights`; `HeroAssetViewer` declares the `HeroStudio` lights. Other authored lights remain untouched and may add to the result. `replace-managed` suppresses declared studio lights; `augment` retains them. `environment: keep` restores the host's original HDRI; `disable` removes it while the preset is active. Disposing the adapter restores studio visibility and original environment.

Physical-light intensity and Kelvin colors are approximations in Three.js, not guaranteed photometric matches with Blender. Avoid excessive shadow budgets and validate visually in the actual renderer.

For baked-image 2.5D scenes, use `cameraLightingPhysicalLights={false}` on `CameraViewport3D` and `<CameraLightingInspector capabilities={{ physicalLights: false }} />`. The UI disables unavailable physical-light controls and explains why. Camera pose and tone-mapping exposure still work, but neither can reconstruct physically correct hidden pixels, shadows or material properties from a photograph. Use true albedo/material data and explicit geometry for relighting.

## Storybook proof surfaces

In Storybook **Canvas**, any story using `HeroAssetViewer` or `CameraViewport3D` automatically displays a small **Camera & lighting QA** button (except stories with a dedicated inspector already). Click it to enable a neutral, authored-shot-relative preview preset; adjust camera zoom/height/yaw/pitch and lights; then **Hide controls** to inspect the full scene or **Disable QA** to restore the exact authored view. Reset returns to a neutral offset with no added lights. Opening or editing QA does not modify source timelines, component props, or production jobs. Captures taken *from an enabled QA preview* can include its camera/light overrides.

This also covers existing home/finance hero assets, craft materials/environments, everyday video objects, and 2.5D relief stories without a per-story copy of the inspector. The two baked-image scenes (`Image Relief`, `Depth Composite`) disable physical-light edits automatically. All other registered Three.js viewports are treated as physically relightable; scene authors must pass `cameraLightingPhysicalLights={false}` for baked imagery.

Quick QA targets: **3D asset toolkit → Material Laboratory**, **Natural Environments**, **2.5D Image Relief**, **2.5D Depth Composite**, **Home → Home Lab**, and **Video Production → Scene Templates → 3D Everyday Objects**.

For a `CameraViewport3D` with no explicit `cameraLightingBounds`, Storybook QA estimates temporary camera-relative bounds from the authored shot's focus and distance. Production presets still **require explicit authoritative bounds**. Explicit `cameraLightingPreset` props take precedence over the QA context; dedicated inspector stories own their settings. Non-3D stories, documentation pages, and rendering outside Storybook are unaffected.

**3D asset toolkit / Portable Camera & Lighting Inspector**:

- **Three Scene** — absolute-frame 3D camera and live light edits.
- **Crafted Hero** — existing SDF hero viewer and named studio-light replacement.
- **Baked Relief 2.5D** — image-relief geometry, camera/exposure enabled, physical-light editing visibly disabled.
- **Portrait Hero** — same UI and preset in a 9:16 capture.

The panel is rendered outside `data-km-video-capture` and therefore outside the shot's pixel capture. Import a saved JSON preset into another story to reuse the settings, but verify the destination's bounds and environmental policy first.

## Limitations and next work

- ContentGen preset persistence/job wiring is not included; it can consume the versioned JSON, but needs its own render parity checks.
- No animated light keyframe editor, path interpolation or automatic photograph-to-depth inference; existing MG1 animation stays authoritative.
- No guarantee of visual equivalence between WebGL preview and offline Blender render; exposure/light units require comparison screenshots.
- Human QA still needs actual GPU screenshot comparisons for camera positions, HDRI policy, shadow changes, 16:9 and 9:16 frames, and exported MP4s.
