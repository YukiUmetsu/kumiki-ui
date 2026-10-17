# Diagram Stage — moving graphs and data flow

**Status:** development implementation. Expanded tests, screenshots, browser inspection and clean
consumer installs remain deferred by the user's instruction to prioritize component building.

## Contract

`createDiagramTimeline({ id, graph, fps, durationFrames, layouts })` compiles layout keyframes into
the existing MG1 evaluator. The graph is the existing infographic `DiagramSpec`, not a second graph
schema. Each layout supplies a complete ID→Rect mapping. Node/edge IDs, endpoints, frame ordering,
finite positive bounds and FPS are validated with actionable errors. Layout keyframes support
incoming easing and explicit cuts. Node IDs persist while positions and sizes change.

`evaluateDiagramStage(graph, timeline, frame, { ports?, packets? })` resolves node bounds first,
attaches cubic routes to those bounds, and samples packets against the **current** routes using
the existing motion-path arc-length implementation. It also returns node-overlap pairs for QA.
No wall clock, playback state, randomness or live layout simulation is involved. Frames clamp to
the composition range. The display list is usable by another renderer without React.

`DiagramStage` renders that display list with `graph`, `timeline`, `frame`, `width`, `height`,
optional edge `ports`, packet list, `focusedNodeIds`, `theme`, `renderNode`, `renderPacket`, `overlay`
and required `ariaLabel`. It forwards SVG props, style, className and ref. Theme roles cover surface,
node fill, ink, muted ink, edges, accent, forward/reverse packets, typeface/size, radius and stroke.
Defaults reference semantic CSS variables with standalone literal fallbacks.

- **Ports:** side (`left/right/top/bottom`) plus fractional offset; optional curvature per edge.
  Default sides follow the graph's declared direction and stay fixed through reflow. They are
  deliberately not inferred from the nearest side on every frame, which causes connector jumps.
- **Packets:** stable `id`, `edgeId`, end-exclusive integer `range`, optional reverse direction and
  label. They occupy the exact source at the first frame and destination at the last visible frame.
  IDs/references/times are validated. Packet count/speed are illustrative unless the consumer binds
  them to measured data; this component does not infer throughput or causal meaning.
- **Slots:** custom nodes render inside a group already translated to the node's current top-left;
  custom packets render at their resolved center. Use local geometry in both slots. Overlays use
  output coordinates. Motion, layout and rendering stay separately replaceable.
- **Accessibility:** one named SVG image with a generated structural description of nodes/links.
  Graphical children are decorative; descriptions do not depend on color or motion. Reduced motion
  shows the final scene. The demo's external storyboard buttons are the keyboard navigation surface.

```tsx
const timeline = createDiagramTimeline({
  id: "flow", graph, fps: { num: 30, den: 1 }, durationFrames: 240,
  layouts: [{ frame: 0, bounds: initialBounds }, { frame: 180, bounds: expandedBounds }],
});
<DiagramStage graph={graph} timeline={timeline} frame={frame} width={1280} height={760}
  ariaLabel="Description of the process and its relationships"
  packets={[{ id: "item-1", edgeId: "source-target", range: { startFrame: 60, endFrame: 120 } }]}
  theme={{ radius: 24, packet: "#365d91" }} />;
```

## Example and limitations

`/#/storyboard/diagram`, also Storybook **Motion / React / Diagram Reflow**: six semantic nodes,
two branches, joins, forward and reverse packets, animated reflow, authored portrait/landscape
layouts and two anonymous themes. The same source IDs survive both layouts.

The consumer authors bounds; no general auto-layout/obstacle-avoiding router was invented. Curves
can cross unrelated nodes if the authored composition is crowded; overlap pairs are reported, not
silently corrected. Self-loops require a future authored route adapter. Default node labels use
wrapping HTML `foreignObject`; supply `renderNode` with SVG text/paths for renderers without that
capability. Consumers must size labels appropriately; cross-browser font/overflow parity is unverified.

Arc length is a fixed-sampling approximation. A packet follows the changing curve; this does not
promise constant world-space speed while the curve itself changes. No automatic journey handoff,
data simulation, 3D projection or encoded-video export is claimed. No external package added.
The registry depends on existing infographic source types and existing motion modules only.

Executed in this increment: `npm run typecheck` and `npm run build` passed. The existing Vite
chunk-size warning remains. Build log: `/tmp/kumiki-diagram-build.log`. No tests, screenshots,
visual/GPU inspection or clean registry installation were run.
