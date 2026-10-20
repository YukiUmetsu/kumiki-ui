# ProcessJourney (PJ1) — reusable visual route recipe

**Scope:** Pure visual composition, not a content-production workflow. The recipe builds on existing DiagramStage and CameraStage MG1 timelines. No independent renderer, playback clock, audio, video export or external API.

## Install and inspect

- Registry item: process-journey; prerequisites are diagram-stage and camera-stage (and their transitive registry dependencies).
- Discover: npm run catalog:find -- --query="process journey"
- API: npm run catalog:api -- --id=process-journey --export=createProcessJourney --format=json
- Storybook: **Motion → Process Journey**. Examples: Signal, Supply Chain and Cell Signaling, with 16:9 / 9:16 switching.

## Minimal usage

~~~tsx
import { createProcessJourney, evaluateProcessJourney } from "./components/motion/process-journey";
import { DiagramStage } from "./components/motion/diagram-stage-react";
import { CameraStage } from "./components/motion/camera-stage";

const plan = createProcessJourney({
  id: "generic-journey", subjectId: "subject-1", fps: { num: 30, den: 1 },
  durationFrames: 180,
  graph: {
    direction: "horizontal",
    nodes: [{ id: "a", label: "First" }, { id: "b", label: "Middle" }, { id: "c", label: "Last" }],
    edges: [{ id: "a-b", from: "a", to: "b" }, { id: "b-c", from: "b", to: "c" }],
  },
  layouts: [{ frame: 0, bounds: {
    a: { x: 50, y: 240, width: 170, height: 90 },
    b: { x: 385, y: 240, width: 170, height: 90 },
    c: { x: 720, y: 240, width: 170, height: 90 },
  } }],
  route: [
    { edgeId: "a-b", startFrame: 12, endFrame: 75 },
    { edgeId: "b-c", startFrame: 103, endFrame: 160 },
  ],
  camera: { viewport: { width: 960, height: 540 }, zoom: 1.15 },
});

// Any integer frame, any seek order:
const frame = 120;
const state = evaluateProcessJourney(plan, frame);
const subject = <circle data-process-journey-subject={state.subjectId}
  cx={state.position.x} cy={state.position.y} r={12} fill="currentColor" />;

// CameraStage applies the existing MG1 camera matrix to a DiagramStage SVG.
// The nested diagram exposes its geometry beyond its own artboard.
<CameraStage timeline={plan.cameraTimeline!} frame={frame}
  width={960} height={540} reducedMotion={false}>
  <DiagramStage graph={plan.graph} timeline={plan.diagramTimeline} frame={frame}
    width={960} height={540} ariaLabel="Three-stage process"
    focusedNodeIds={state.focusedNodeIds} reducedMotion={false}
    style={{ overflow: "visible", background: "transparent" }}
    overlay={subject} />
</CameraStage>;
~~~

The camera is **optional**. Without it, render DiagramStage directly with overlay={subject} and focusedNodeIds. Render the moving subject from state.position **once** as an overlay: do not also render separate DiagramStage packets, which would duplicate the subject and break apparent identity at intermediate handoffs.

## Input/output contracts

- **Use existing data:** graph is the infographic DiagramSpec, layouts are DiagramLayoutKeyframe[], and the diagram/camera outputs are existing MG1 MotionTimeline values. No second graph or motion schema.
- **Timing:** one end-exclusive durationFrames; each route leg uses existing edgeId with [startFrame,endFrame). Distinct connected legs need at least two intermediate handoff frames; final leg must end at least two frames before the composition ends. Optional pretravel waiting and final arrival use a stable subject ID. An edge is traversed at most once in PJ1; repeated edges require a later explicitly scoped feature.
- **Topology:** a leg can reverse only across an edge with directed:false. Adjacent legs must share exactly the same intermediate node. Static/dynamic layouts and edge ports are validated by the existing DiagramStage code.
- **State:** evaluateProcessJourney(plan, frame) returns ready, moving, handoff or arrived, subjectId, current node, active edge/progress when relevant, highlighted nodes and the existing diagram display list. During handoff the subject crosses through the node center rather than teleporting between ports. Positions/paths are evaluated at the actual frame, including graph reflow.
- **Camera:** optional viewport, zoom, integer leadFrames and sampleEveryFrames. Uses createCameraTimeline, not another camera runtime. Sampling is configurable; camera centering between keys is interpolated, so it is not a guarantee against clipping. Author adequate margins and use the existing framing/visibility contracts for critical subjects. The camera sample budget is capped at 3,000 keys.
- **Customizability:** Scene labels/geometry/theme, subject appearance, optional ports and camera profile stay consumer-owned. No reference to industry-specific objects in the registry code.
- **Performance:** camera keyframes are precomputed during composition authoring; the optional planner costs proportional to sampled frames and graph size. It is not intended to recompile inside React renders.
- **QA:** deterministic shuffled-frame seeks, stage transitions, mutable-input isolation, topology failures, two aspect ratios, camera sampling, existing SVG adapter and clean registry consumer compile.

This recipe communicates **illustrative travel**. It does not infer real latency, physical speed, throughput, operational success or a causal mechanism from the animation alone. For multiple simultaneous subjects, branching, parallel paths or elaborate stage-specific transformations, compose existing DiagramStage and MotionDirector primitives rather than extending PJ1 into a separate choreography engine.
