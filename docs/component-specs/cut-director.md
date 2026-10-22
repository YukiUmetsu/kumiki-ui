# CutDirector — frame-addressable shot plans with checked identity

**Status:** Implementing. Automated checks and agent screenshot review are recorded below. Human review is pending.
**Catalog phase:** P0, first slice of Phase 2 in [17 — Explainer Visual Components](../17-explainer-visual-components.md#3-highest-priority-component-contracts-p0).
**Scope:** Compiles a sequence of shots and the transitions between them into a 2D shot plan. Each shot has a scene, a duration, the subjects that must stay framed, and a start and end camera. Any frame resolves to the layers to draw: shot, scene, shot-local frame, camera matrix, opacity, wipe mask and whip blur. It checks semantic identity and framing at every boundary. It does not decode footage, mix audio, or move 3D cameras.

## Reuse and the gap it fills
- **Reused:**
  - Each shot's camera is an ordinary MG1 timeline from `createCameraTimeline`, evaluated with `evaluateCamera` (CameraStage's matrix convention).
  - Wipes are `evaluateMask` samples drawn by the existing `SvgMaskDefinition`.
  - Seek parity is checked with `inspectSeekParity`.
- **The gap:** CameraStage and CinematicCameraDirector move a camera inside one scene, and shared-element hands one identity across a representation change. Nothing sequenced several shots with typed transitions, verified match-cut alignment, or let a production turn every transition off.

## Install and inspect
- Registry item: `cut-director` (`cut-director.ts`, `cut-stage.tsx`). It depends on `camera-stage`, `mask-reveal` and `motion-react`.
- Storybook: **Motion → Cut Director**.
  - **Transitions:** six shots across two worlds, each arranged separately for 9:16 (a column) and 16:9 (a row):
    - establishing shot with a packet in flight;
    - punch-in on the server;
    - match cut on the server into a second world;
    - pull-back reveal;
    - whip pan to the database;
    - foreground wipe led by a rack panel;
    - dissolve to the summary.

    Controls cover output, transitions (`authored` or `cuts`), reduced motion, play and seek. The panel shows the layers and their local frames, the active transition and seek parity over 60 random frames.
  - **Identity errors:** four plans the compiler refuses, each with its reason.

## Minimal usage
~~~tsx
const compiled = compileCutPlan({
  id: "film", fps: { num: 30, den: 1 }, output: { width: 1080, height: 1920 }, scenes,
  shots: [
    { id: "wide", sceneId: "street", durationFrames: 90, subjectIds: ["car", "sign"], camera: { start: frameCameraSubject(wideBounds, output) } },
    { id: "close", sceneId: "street", durationFrames: 60, subjectIds: ["car"], camera: { start: frameCameraSubject(carBounds, output, { padding: 0.1 }) } },
  ],
  transitions: [{ kind: "punch-in", durationFrames: 16 }],
});
if (!compiled.ok) throw new Error(compiled.diagnostics.map(d => d.message).join("\n"));

<CutStage plan={compiled.plan} frame={frame} ariaLabel="…"
  renderScene={(sceneId, { localFrame }) => <World id={sceneId} frame={localFrame} />} />;
~~~

## Contract
- **Scenes:** `{ id, subjects: { [id]: worldRect } }`. A subject ID that appears in two scenes is the same semantic subject; that is what a match cut carries across.
- **Shots:** `{ id, sceneId, durationFrames, subjectIds, camera: { start, end?, easing? } }`, played back to back. `subjectIds` must be fully framed at the shot's first and last frame.
- **Transitions:** one between each pair of shots. Each takes a deterministic interval around the incoming shot's first frame.

  | Kind | Interval | Behaviour | Identity rule |
  | --- | --- | --- | --- |
  | `cut` | none | Instant change | Explicit, so anything may change |
  | `match-cut` | none | Instant change; `matchSubjectId` must land at the same screen centre (default 3% of the diagonal) and size (×0.8–1.25) | Subject must exist in both scenes |
  | `punch-in` | last N frames of the outgoing shot | Camera eases (log-zoom) to the incoming shot's first framing | Same scene only |
  | `hold` | last N frames of the outgoing shot | Freezes that shot's content and camera | Same scene only |
  | `whip` | N/2 either side | Camera pans one screen in `direction` with directional blur, cutting at peak speed | Explicit (hides a cut) |
  | `wipe` | first N frames of the incoming shot | Incoming shot revealed by a clip mask along `axis` over the frozen outgoing shot; an optional `foreground` occluder's centre leads the edge | Explicit |
  | `dissolve` | first N frames of the incoming shot | Opacity crossfade | Explicit |

  Timed transitions need at least 4 frames; cuts take none. A warning reports shots left with fewer than `minShotFrames` (12) untouched frames.
- **Evaluation:** `evaluateCutPlan(plan, frame, { transitions?, reducedMotion? })` returns `{ shotId, transition?, layers (bottom → top), foreground? }`. It is pure, so random seeks equal forward play.
  - `transitions: "cuts"` turns every transition into a hard cut at its boundary. The film keeps its length and each frame keeps its owning shot.
  - `reducedMotion` replaces punch-ins, whips and wipes with their `reducedMotion` fallback (default `cut`, or `dissolve`), and cameras hold each shot's final framing.
- **Diagnostics:**
  - plan and shot validity: `cut-plan-invalid`, `cut-shot-invalid`, `cut-camera-invalid`, `cut-transition-invalid`;
  - unknown scenes and subjects: `cut-scene-unknown`, `cut-subject-unknown`;
  - identity: `cut-identity-scene-change` (a continuous transition that changes scene);
  - match cuts: `cut-match-missing`, `cut-match-misaligned` (reports the pixel shift and scale);
  - framing: `cut-subject-unframed` (at shot edges, through the compiled camera);
  - timing: `cut-transition-too-long`, and the `cut-shot-too-short` warning.
- **CutStage:**
  - Draws each layer as a camera-transformed group, with clip masks, a directional blur filter and opacity.
  - `renderScene(sceneId, { shotId, localFrame, layer })` supplies the world SVG.
  - `renderForeground(subjectId, rect)` draws the wipe occluder in output coordinates.
  - `overlay` (a node, or a function of the frame state) is drawn in output coordinates.
  - The root reports `data-cut-shot`, `data-cut-transition` and `data-frame`. Reduced motion follows the user preference unless set explicitly.
  - It forwards SVG props and ref, has the semantics of one named image, and owns no clock.
- **Limits:**
  - 2D SVG worlds only. 3D shots, real footage (FrameAccurateClip) and audio sync (AudioVisualCue) are not covered.
  - Framing is checked at shot edges, not at every frame inside a camera move.
  - Match-cut alignment compares bounding boxes, not silhouettes.
  - A whip's offset is one screen width or height, and its blur peaks at 5% of the larger output dimension.
  - During wipes and dissolves the outgoing shot is frozen on its last frame.
  - A foreground occluder follows only horizontal wipes.

## Verification (2026-10-22)
- `npx vitest run tests/camera-stage.test.tsx`: four CutDirector cases next to the existing camera tests.
  - **Compile and seek:** a match cut lands pixel-identical; a punch-in arrives at the incoming framing; wipe layers and local frames are correct; seek parity holds with authored transitions, with cuts and with reduced motion.
  - **Disabling:** transitions turn into cuts cleanly; reduced-motion fallbacks apply and cameras hold.
  - **Refusals:** every identity, framing and timing error above is produced.
  - **CutStage:** it renders the layers, the clip mask and the occluder.
- Rendered in Storybook and reviewed by the agent: establishing shot, punch-in, both sides of the match cut, pull-back end, whip, wipe, dissolve (16:9), cuts mode and reduced motion. Seek parity held everywhere, identity checks passed and there were no console errors.
- Fixed after review:
  - Portrait wide shots were a thin strip because the worlds were laid out as rows; each orientation now has its own world layout.
  - Close-ups were loose.
  - The compiler caught a test fixture whose shot ended with a listed subject out of frame.
- **Human visual review:** pending.
