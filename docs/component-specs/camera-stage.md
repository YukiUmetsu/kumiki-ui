# Camera Stage

**Status:** development implementation. TypeScript compile passed; tests, browser inspection,
visual approval and clean registry installation are deferred at the user's request to prioritize
building components. Registry item: `camera-stage`; no new external packages.

## Contract

`CameraStage` renders SVG children in world coordinates through a frame-driven camera. `overlay`
is an SVG composition slot in fixed output coordinates for titles, captions and controls. Width
and height define output design pixels; the SVG scales without changing framing. Ref, className,
style and native SVG attributes/events are forwarded. No global stylesheet is required.

`createCameraTimeline({ id, cameraId?, fps, durationFrames, keyframes })` creates existing MG1
tracks for center, zoom and roll. Keyframes require an initial frame 0 and strictly increasing
integer frames within the duration. `cut: true` holds the previous pose until the cut frame;
ordinary segments use incoming easing (default `ease-in-out-cubic`). Repeating a pose creates a
hold. Object tracks can be combined with the generated timeline; keep track IDs unique.

`frameCameraSubject(bounds, viewport, { padding?, roll? })` fits the full subject, including roll,
inside a fractional safe inset (default 8%). Different aspect ratios get separately fitted poses;
the scene is not stretched. This inset is an authoring aid, not a platform safe-zone guarantee.

`evaluateCamera(timeline, frame, viewport, cameraId?)` returns the pose and world-to-output matrix
for renderer adapters or projected overlay anchors. The authoring pose uses roll **degrees**;
generated MG1 angle tracks use **radians**, with shortest-arc interpolation. Camera clockwise roll
rotates the scene counterclockwise. Zoom is positive output pixels per world unit.

```tsx
const output = { width: 1080, height: 1920 };
const wide = frameCameraSubject({ x: 0, y: 0, width: 1600, height: 900 }, output);
const close = frameCameraSubject({ x: 400, y: 200, width: 400, height: 400 }, output);
const timeline = createCameraTimeline({
  id: "scene-camera", fps: { num: 30, den: 1 }, durationFrames: 180,
  keyframes: [{ frame: 0, ...wide }, { frame: 90, ...close }, { frame: 179, ...close }],
});
// Imports: camera helpers from components/motion/camera; CameraStage from camera-stage.
<CameraStage timeline={timeline} frame={frame} {...output} ariaLabel="Scene description"
  overlay={<text x={80} y={120}>Fixed title</text>}>
  <circle cx={600} cy={400} r={160} fill="currentColor" />
</CameraStage>;
```

The component owns no clock; pass an integer frame or use the existing `MotionScrubber`. Reduced
motion samples the last authored frame unless explicitly overridden. Semantics are one named SVG
image; consumers supply a meaningful summary and transcript where needed. Missing/invalid camera
tracks throw actionable errors rather than drawing a misleading fallback.

Demo: first section of `/#/motion`; Storybook **Motion / React / Camera Choreography**. It includes
pan, approach/hold, cut, rolled framing, tracking, pullback and 1920×1080 / 1080×1920 / 1080×1080
outputs. It is a 2D camera; no parallax, occlusion, 3D perspective, audio or encoded video is claimed.
