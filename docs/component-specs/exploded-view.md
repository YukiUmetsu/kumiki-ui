# Exploded View 3D

**Status:** development implementation. Tests, screenshots, browser/GPU review and clean registry
installation are deferred under the user's instruction to prioritize building. This is the second
advanced component slice; it does not close the full MG2/MG3 production gates.

## Data and timing

`AssemblyPart3D` declares a stable ID, optional parent ID/label, assembled position/XYZ-degree
rotation/positive scale, separation offset, optional rotation offset and local annotation anchor.
`orderAssemblyParts` validates unique IDs, complete parent references, finite transform triples and
acyclic ancestry, returning a stable parent-before-child order.

Offsets explicitly use parent, assembled-local, or world space. Parent is the default. Local offsets
respect the assembled part's rotation and scale; world offsets transform through the current parent
world matrix. Nested children inherit parent movement and add their own offset. Rotation offsets
are authored local XYZ Euler deltas, not quaternion interpolation.

`createExplodedTimeline({ id, parts, fps, durationFrames, separate, reassemble?, staggerFrames?,
easing? })` compiles one ordinary MG1 numeric `separation` track per part. Frame ranges are
end-exclusive; default stagger is six frames and incoming easing is `ease-in-out-cubic`. Parts
separate in array order and reassemble in reverse array order. Ranges must leave at least two
motion frames per part after staggering; reassembly cannot precede separation completion. Omit
reassembly for a final exploded still. Existing custom tracks can also drive the same property.

## Renderer boundary and public API

`createExplodedAssembly(parts, createPart)` returns a root group, part objects, anchors, an absolute
`update(timeline, frame, separationScale?)` and disposer. It owns transform groups; the part factory
returns `{ object: Object3D, dispose }` and owns its mesh/material/texture resources. Frame updates
always reset authored transforms before applying separation. No offset accumulation or live physics.

`ExplodedView3D` accepts `parts`, assembly `timeline`, `cameraTimeline`, integer `frame`, `width`,
`height`, a stable `createPart` factory and optional `createEnvironment` factory. It also accepts
`separationScale` (0–3), annotation options/theme/render slot, overlay, and the existing viewport's
native props/ref, lens planes, exposure, pixel ratio and reduced-motion override. Camera and
assembly durations/rational FPS must match. Separation scale changes positional spacing only;
authored rotation deltas remain tied to the part's progress.

Factories may supply procedural geometry or loaded model subtrees. `createEnvironment(root)` returns
`{ scene, dispose }` for custom lights/background/floor; the wrapper adds the assembly root to it.
The default is transparent with neutral directional/hemisphere lights. Keep factory/part identities
stable to avoid resource recreation; treat parts as immutable and replace the array to change its
structure. No new packages or assets were added.

```tsx
const parts = [
  { id: "base", offset: [0, 0, 0] as const },
  { id: "cover", parentId: "base", label: "Cover", position: [0, 1, 0] as const,
    offset: [0, 2, 0] as const, anchor: [1, 0, 0] as const },
];
const timeline = createExplodedTimeline({
  id: "assembly", parts, fps: { num: 30, den: 1 }, durationFrames: 360,
  separate: { startFrame: 30, endFrame: 120 }, reassemble: { startFrame: 240, endFrame: 330 },
});
<ExplodedView3D parts={parts} timeline={timeline} cameraTimeline={cameraTimeline}
  createPart={createPart} frame={frame} width={1280} height={720}
  ariaLabel="An assembly separates and reassembles" annotationOptions={{ occlusion: "hide" }} />;
```

## Annotations

`projectAssemblyAnnotations` projects current part anchors using the current perspective camera.
Labels pack into bounded left/right columns, with optional per-part `labelSide`, configurable inset,
width, height and gap. It returns explicit visible/occluded/outside/overflow states. Excess labels
are reported as overflow rather than placed on top of each other. The SVG overlay exposes hidden
and overflow counts as data attributes. Offscreen/behind-camera anchors are hidden.

Occlusion is explicit: `hide` raycasts against other part objects; `show-through` draws projected
annotations regardless of intervening geometry. The labeled part's own object is excluded so a
surface/center anchor can identify that part. Tests use Three.js raycasting, not a depth buffer:
transparent material/alpha, shader displacement and unregistered environment occluders are not
pixel-accurate visibility. This does not claim depth-composited hybrid labels. See
[Raycaster](https://threejs.org/docs/pages/Raycaster.html) and
[Vector3](https://threejs.org/docs/pages/Vector3.html) for the underlying engine APIs.

Default label content uses wrapping HTML in `foreignObject`; customize `renderAnnotation` for pure
SVG or another treatment. The slot is translated to the packed label's top-left corner. Leader lines
remain attached to projected anchors; global line-crossing avoidance and measured font-fit are not
implemented. Consumers size labels and supply a complete accessible scene summary/transcript.
The canvas is one named image; annotation graphics are decorative. Reduced motion shows the final
authored state (assembled if the timeline reassembles).

## Demonstration and limits

`/#/storyboard/exploded` / Storybook **Motion / Exploded Assembly**: original seven-part procedural
assembly, nested transforms, local-axis pin separation, reversed staging, orbiting camera, packed
labels, occlusion switch, spacing control, two anonymous material themes and 16:9/9:16/1:1 outputs.
No external models/textures/environment assets. Extreme custom spacing still requires authored
camera framing. Full scene-v2 serialization, GLB loading, audio, encoder/export, depth compositing,
automatic disassembly direction inference and collision-free physical simulation remain out of scope.

The viewport gained `CameraScene3D.afterRender` (current camera/output context) and a stable
`sceneRevision` invalidation input. These allow projected labels and scene-input changes while paused
without another render clock or resource replacement.

Executed: `npm run typecheck`, `npm run build` and `git diff --check` passed. The existing Vite
chunk-size warning remains. Three.js/assembly previews stay in lazy-loaded chunks. Raw build log:
`/tmp/kumiki-exploded-build.log`. No tests, screenshots, browser/GPU review or registry-install
verification were run in this increment.
