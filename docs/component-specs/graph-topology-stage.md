# GraphTopologyStage — walk through a network without redrawing it

**Status:** Implementing (first slice). Automated checks and agent screenshot review are recorded below. Human review is pending.
**Catalog phase:** Phase 4 (subject breadth), in [17 — Explainer Visual Components](../17-explainer-visual-components.md#4-high-value-expansion-components-p1). Subjects shown: neural networks (structure only), logistics, social networks.
**Scope (this slice):** Typed nodes and edges; a deterministic layered layout for acyclic hierarchies and a seeded, fixed-iteration force layout; identity-preserving transitions keyed by node and edge id; BFS/DFS traversal revealed in visit order; declared clusters drawn as hulls; weight-proportional strokes with a scale legend and optional exact weight labels.

Not in this slice: a general graph editor, automatic community detection, weighted or directed layout forces, curved or self-loop routing, arrowheads for undirected links, and any claim about a model's accuracy. Self-loops are reported and not drawn.

## Reuse and the gap it fills
- **Reused:**
  - **Text measurement:** `createCanvasMeasurer` and `MeasureText` (media-document). Labels are measured with the same family the view renders, and wrapped rather than truncated.
  - **Easing:** `evaluateEasing` (motion-track). Transitions use `ease-in-out`.
  - **Types:** `Diagnostic`, `RationalFps`, `Rect` and `Vec2` (motion-track).
- **Considered and not reused:**
  - **DiagramStage** (`createDiagramTimeline`, `evaluateDiagramStage`): it needs authored bounds for every node at every keyframe, so it cannot lay a network out. It throws on bad input instead of returning diagnostics, and it routes edges only from the sides of a box. Its path helpers were not needed because edges here are straight segments with a fixed parallel offset.
  - **DiagramSpec** (`registry/infographic/types.ts`): nodes there require a label and have no type, edges have no weight unit and no traversal semantics. Its shape would have forced a second model onto this one.
  - **Infographic chart renderer:** the weight scale is a small legend drawn by this component, not a data chart.
- **The gap:** the registry could draw a fixed diagram or a chart, but had no way to move the same nodes between layouts and states by identity, reveal a traversal in visit order, or refuse a network whose identities, endpoints or weights would mislead.

## Install and inspect
- Registry item: `graph-topology-stage` (`graph-topology-stage.ts`, `graph-topology-stage-react.tsx`).
- Storybook: **Visual / Graph Topology Stage**.
  - **Walkthrough:** three fictional domains, one component.
    - *Neural network, structure:* 3 inputs, 4 hidden and 2 outputs with layered layout, a visit order from Input 1, then the same nodes in a force layout. No weights, no training and no accuracy are shown.
    - *Logistics, delivery tour:* a depot network with fictional route lengths in km; a depth-first tour from the depot with exact labels.
    - *Social, groups and reach:* members A–H with declared groups "Group 1" and "Group 2"; H joins with a fade and a breadth-first walk from A.
    - Each runs 285–300 frames at 30 fps and is shown at 9:16 (1080×1920) and 16:9 (1920×1080).
  - **Refusals:** an unknown endpoint, a duplicate node id, identity lost on a relabel, an undeclared node, a negative route length, a node missing its cluster, a cycle in a layered layout, a traversal root that is not in the graph, and a self-loop as a warning-only case.

## Minimal usage
~~~tsx
const topology: GraphTopology = {
  id: "depot", nodes: [{ id: "depot", label: "Depot", type: "depot" }, { id: "a", label: "Stop A", type: "stop" }],
  edges: [{ id: "depot-a", from: "depot", to: "a", type: "route", weight: 4, directed: false }],
};
const spec: GraphStageSpec = { id: "tour", fps: { num: 30, den: 1 }, topologies: [topology], weightUnit: "km", beats: [
  { id: "network", topologyId: "depot", layout: "force", durationFrames: 60, caption: "Depot network" },
  { id: "tour", topologyId: "depot", layout: "force", durationFrames: 150, weightLabels: true,
    traversal: { algorithm: "dfs", root: "depot" }, caption: "Delivery tour" },
] };

<GraphTopologyStageView spec={spec} frame={frame} width={1080} height={1920} onDiagnostics={report} />
~~~

## Contract
- **Model:**
  - `GraphNode { id, label, type, cluster? }`. Identity is `id` plus `label` plus `type`.
  - `GraphEdge { id, from, to, type, weight?, directed? }`. `directed` defaults to `true`. Identity is `id` plus its endpoints.
  - `GraphTopology { id, nodes, edges, clusters? }`. When `clusters` is declared, every node must name one of them.
  - `GraphStageSpec { id, fps, topologies, beats, weightUnit?, moveFrames? }`.
- **Beats:** each beat names a topology and a layout (`layered` or `force`), and may add:
  - `appear` / `disappear`: node ids that fade in or out relative to the previous beat. A node that appears or disappears without being declared is an error.
  - `traversal { algorithm: "bfs" | "dfs", root }`: visited nodes and edges reveal in visit order, each visited node shows its visit number, and unvisited ones stay dim.
  - `groups`: neutral dashed hulls around each declared cluster, labelled above their top edge. Requires the topology to declare clusters.
  - `weightLabels`: show the exact weight of each weighted edge, as written in the data.
  - `caption`: at most two lines; longer captions are refused.
- **Transitions:** for beats after the first, node positions interpolate by id over `moveFrames` (default 24). Persisting nodes move; declared appearing nodes fade in at their new place; declared disappearing nodes fade out where they were. Edges fade by id.
- **Layouts (both deterministic):**
  - `layered`: longest-path layering from the sources; nodes within a layer are ordered by two barycentre sweeps with stable ties. A cycle is refused and the error names it (`graph-cycle-layered`). Undirected links are ordered from `from` to `to` and reported as a warning.
  - `force`: Fruchterman–Reingold with 300 fixed iterations, starting from positions seeded by the topology id (FNV-1a and mulberry32, no `Math.random`). The result is stretched into the box per axis, then node footprints (circle plus label) are separated deterministically. The same spec always gives the same positions.
  - Labels sit below nodes on portrait outputs and to the right on landscape outputs. Weight labels slide along their edge to the first clear position (7 candidates, deterministic).
- **Traversal:** `traverseGraph(topology, { algorithm, root })`. Directed links are followed from `from` to `to`; undirected links both ways. Neighbours are taken in edge declaration order. Nodes the traversal cannot reach are reported (`graph-traversal-unreached`, warning).
- **Weights:** stroke width is `weight × maxStrokePx / maxWeight`, computed over the whole spec so widths are comparable across beats. The legend shows the largest weight and half of it, with exact values and the unit as given. Edges without a weight use the base stroke.
- **Validation:** `validateGraphTopology(topology)` and `validateGraphStage(spec)` are pure and need no measurer.
  - **Errors:** `graph-node-duplicate`, `graph-edge-duplicate`, `graph-edge-unknown-endpoint`, `graph-weight-invalid` (negative or non-finite), `graph-cluster-missing`, `graph-cluster-unknown`, `graph-cluster-duplicate`, `graph-node-label-empty`, `graph-topology-duplicate`, `graph-topology-unknown`, `graph-beat-invalid`, `graph-groups-undeclared`, `graph-node-set-undeclared`, `graph-identity-lost`, `graph-declared-unknown`, `graph-root-unknown`, `graph-caption-overflow`, `graph-cycle-layered`, `graph-box-too-small`.
  - **Warnings:** `graph-self-loop` (not drawn), `graph-traversal-unreached`, `graph-beat-short` (fewer than six frames per visit), `graph-layered-undirected`, `graph-label-small`, `graph-label-overlap`, `graph-edge-label-overlap`, `graph-node-overlap`, `graph-label-outside`, `graph-legend-overflow`.
  - A spec with any error is refused as a whole: no layout is attempted, and the frame draws no nodes or edges.
- **Preparation and evaluation:** `prepareGraphStage(spec, { width, height, measure, family?, safe?, fontPx?, readablePx?, nodeRadiusPx?, baseStrokePx?, maxStrokePx? })` lays out every beat once. `evaluateGraphStage(prepared, frame)` returns the nodes, edges, cluster hulls, legend and a summary for the frame. It is pure, so seeks are exact.
- **Component:** `GraphTopologyStageView` owns no clock.
  - **Props:** `spec`, `frame`, `width` / `height`, `safe?` (default a 6% / 5% inset), `fontPx?` (default 3.4% of the short side), `family?`, `onDiagnostics`, plus forwarded `div` props and ref.
  - The font is measured with the real face and re-measured when web fonts load; the root reports `data-graph-topology-status` as `pending` until then.
  - Root attributes: `data-km-graph-topology`, `data-graph-topology-beat`, `data-graph-topology-status` (`ready`, `pending` or `error`). The SVG's `aria-label` carries the beat summary.
  - Colours come from `--km-graph-1` … `--km-graph-8` (node types), `--km-graph-group`, `--km-graph-edge`, with fallbacks.

## Limits
- The force layout is a heuristic. It is deterministic, not optimal: dense graphs in small outputs produce overlap warnings instead of a perfect picture. Stretching per axis distorts distances, so only topology is meaningful in the picture, not length.
- The layered layout needs an acyclic, directed graph. Feed-forward networks qualify; undirected or cyclic networks use the force layout.
- Edge arrows are drawn for directed links only; undirected links have no arrowhead.
- Self-loops are not drawn. A single link between two nodes is straight; parallel links are fanned out symmetrically.
- Label wrapping is by word and then by character. There is no hyphenation and no per-language line-breaking rules beyond that; CJK text wraps by character.
- Weights are shown as given. Nothing converts units, and nothing estimates real distances.
- Clusters must be declared. The stage never infers groups.
- Traversal is by the declared edge direction only. It is not shortest-path or delivery optimisation.
- Typed edits, animated arrows along links, and 3D topology are not implemented.

## Verification (2026-10-23)
- **Unit tests (temporary file):** `npx vitest run tests/tmp-graph-topology-stage.test.ts`, describe block `graph topology stage`, 8 cases, all passing. The main agent moves these into the shared suite.
  - **Validation:** duplicate ids, unknown endpoints, negative and non-finite weights, self-loop warnings, and missing or unknown clusters each carry a stable code.
  - **Layouts:** longest-path layers on an acyclic graph; a cycle is refused and named (`B → C → A → B`); the force layout returns identical positions on repeated runs and stays inside its box.
  - **Transitions:** identity holds across beats; undeclared node-set changes and identity loss are refused; declared appearing nodes fade in while persisting nodes move by id.
  - **Traversal:** BFS and DFS visit orders are exact; visit numbers reach the frame; unreached nodes stay dim and are reported.
  - **Weights and clusters:** strokes scale proportionally across the spec; exact labels appear only when asked; hulls appear for declared groups.
  - **Refusal:** a cycle in a layered layout gives an error status and draws no nodes or edges.
  - **Seek parity:** `inspectSeekParity` holds over a three-beat walkthrough with transition, traversal and weight labels.
- **Type check and lint:** `npx tsc --noEmit -p .` reports no errors in this slice's files (other slices in progress reported errors in their own files). `npx eslint` on the four files of this slice is clean.
- **Storybook (headless Chromium, Playwright):** 20 frames across the three domains, each in both outputs (40 stage renders). Every render reached `ready`. The console showed no errors or warnings.
  - The neural network reports one expected warning: two inputs cannot be reached from Input 1 in the signal beat, and they stay dim.
  - The depot and social domains report no diagnostics at the sampled frames.
- **Refusals story:** all nine expected codes appear, and every refused spec is marked as refused. No console errors.
- **Screenshot review (agent, not human):** the saved PNGs were read. Labels are legible, visit badges do not collide with labels, groups are neutral dashed hulls with top labels, and the weight legend shows exact values. Overlap problems found during review were fixed in the core, not hidden.
- **Human visual review:** pending. All network data is fictional; route lengths are invented and labelled as such; the neural network is structure only.
