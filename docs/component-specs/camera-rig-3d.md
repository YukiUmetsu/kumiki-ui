# 3D Camera Rig and Viewport

**Status:** development implementation. The user prioritized building over tests; browser/GPU,
visual review, performance measurement and clean-install qualification remain deferred. This
camera-only increment is not a full v2 scene importer or video exporter.

## Components and use

- `camera-rig-3d`: pure TypeScript `createCameraRig3D` and `evaluateCameraRig3D`; depends on existing
  `motion-track`, with no Three.js import. Right-handed Y-up, author units. `target` is an XYZ tuple.
  `distance` is positive; `azimuth`, `elevation`, `roll` and `fov` are degrees. Azimuth is continuous
  (35→395 is a full orbit). Orbit angles interpolate before spherical-to-Cartesian projection,
  preserving the orbit instead of moving along a straight chord. Elevation excludes the poles.
- `camera-viewport-3d`: optional `CameraViewport3D`, with `timeline`, `frame`, `width`, `height`,
  `cameraId?`, `createScene`, lens clip planes, exposure, pixel ratio and a fixed `overlay` slot.
  Native div props and refs forward. A stable scene factory returns `{ scene, updateFrame?, dispose }`;
  the consumer releases their own geometry/material/texture resources. `updateFrame` must set poses
  from absolute frames. The viewport owns/disposes the renderer and observes resize. No render loop.

Camera keyframes start at frame 0, use unique ascending integer frames, and compile into existing
numeric MG1 tracks. `cut: true` holds the previous pose until the cut frame. Repeated poses form
holds. Distance animates a dolly, elevation a crane, target offsets a truck/look-at move, azimuth an
orbit, and roll the local camera bank. The adapter uses a perspective camera, sRGB output and ACES
tone mapping. Portrait adjusts vertical FOV to preserve horizontal subject coverage. This is an
explicit policy, not an automatic guarantee against every object's clipping/occlusion.

```tsx
import { createCameraRig3D } from "./camera-rig-3d";
import { CameraViewport3D } from "./camera-viewport-3d";

const rig = createCameraRig3D({
  id: "orbit", fps: { num: 30, den: 1 }, durationFrames: 180,
  keyframes: [
    { frame: 0, target: [0, 1, 0], distance: 10, azimuth: 30, elevation: 20 },
    { frame: 179, target: [0, 1, 0], distance: 7, azimuth: 160, elevation: 35 },
  ],
});
// createScene is a stable factory for your Three.Scene and resource disposer.
<CameraViewport3D timeline={rig} frame={frame} width={1920} height={1080}
  createScene={createScene} ariaLabel="A description of the subject and movement" />;
```

System reduced motion shows the last frame unless overridden. WebGL initialization, rendering and
context loss have visible actionable errors and retry. The canvas is one named image; consumers
provide an equivalent description/transcript. GPU pixels are not promised bit-identical between
devices. Near/far, exposure, finite channels and valid orbit/lens ranges are checked at the boundary.

## Storyboard page

`/#/storyboard/camera` has separate 2D/3D views, rational-frame playback/scrubbing, 16:9/9:16/1:1
outputs, and six selectable 3D shot beats using the existing `Storyboard` contract. The shot strip
seeks the shared clock; it does not create another timeline. The demo scene is original procedural
geometry with no downloaded model, font, texture or environment assets. Three.js loads lazily when
the 3D example mounts; ordinary UI and the 2D camera do not import it.

Dependency decision and license records: [document 13](../13-content-creation-integrations.md).
Not implemented here: GLB loading, depth-buffer composition, editable full scene serialization,
orthographic projection, encoded video, depth of field, motion blur or character rigs.

The assembly adapter now uses two additive viewport boundaries: `CameraScene3D.afterRender` receives
the current camera/frame/output dimensions after camera/world matrices update; `sceneRevision`
accepts a stable invalidation value for changed scene inputs while paused. Neither creates a clock.
See [Exploded View](exploded-view.md) for the consumer and ownership contract.

## Verification in this increment

`npm run typecheck` and `npm run build` exited 0. The optional lazy 3D demo chunk is **539.79 kB
minified / 135.79 kB gzip**; main showcase JS is **1,163.20 kB / 355.47 kB gzip**. Vite's >500 kB
chunk warning remains. Build output: `/tmp/kumiki-camera-3d-build.log`. No test suite, screenshots,
browser/GPU inspection or clean-install check was run, following the user's implementation priority.
