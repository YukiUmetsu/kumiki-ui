# FailureCascade (R02) — authored cause → effect → consequence

**Scope:** Shows a **user-authored** chain of defects, mechanisms, damage, consequences and repairs, revealed stage by stage, optionally linked to asset states and effects. Kumiki never infers that a causal claim is true: links are claims backed by the evidence the author cites.

## Install and inspect
- Registry item: `failure-cascade` (`compileFailureCascade`, `evaluateFailureCascade`, `FailureCascadeSvg`).
- Storybook: **House Math → Failure Cascade**, with four graphs:
  - a roof flashing leak, linked to the 3D house (the house moves through its supplied condition builds with AssetStateSequence, and storm rain plays during the leak stage);
  - HVAC filter neglect, with a branch;
  - a drainage-to-foundation chain;
  - an invalid graph, showing the diagnostics.

  A 9:16 layout is available.

## Minimal usage
~~~ts
const plan = compileFailureCascade({ id: "leak", title: "…", evidence: { photo: { label: "…", source: "…" } },
  availableStates: ["new", "aged", "damaged"], availableParts: layout.parts.map(p => p.id),
  nodes: [{ id: "flash", kind: "defect", label: "Flashing cracks", evidence: ["photo"], state: "aged" }, …],
  edges: [{ from: "flash", to: "water", evidence: ["photo"] }, …] });
evaluateFailureCascade(plan, frame); // { nodes, edges, state, focus, costs, revealed }
<FailureCascadeSvg plan={plan} frame={frame} width={1600} height={600} />;
~~~

## Contracts
- **Validation (errors).**
  - Duplicate ids, and edges to missing nodes.
  - Evidence ids not in `evidence`.
  - States not in `availableStates` and parts not in `availableParts` (checked when those lists are given).
  - Costs without a source, and inverted cost ranges.
  - Cycles, reported with the full cycle path. In that case no stage order is invented, and the footer shows the error instead of a total.
- **Unsupported claims (warnings).** Nodes or links without evidence are drawn dashed and labelled "no evidence cited".
- **No fabricated costs.** The footer sums only the **authored, sourced** costs of stages revealed so far, as a low–high range per currency, each with its own source. An unsourced cost is never displayed: the card says "cost hidden: no source".
- **Staging.** Nodes are staged by longest path from the roots, so a node appears only after everything that leads to it. Within a stage they are ordered by authored `order`. Each stage gets `framesPerStage`, and links draw in just before their target.
- **Linked assets.** Each frame reports `state` and `focus` from the newest revealed node that declares them. The story compiles them into an AssetStateSequence, crossfading between the house's supplied condition builds, and drives effects per stage.
- **Determinism.** Evaluation is pure per frame.

## Limitations
- The layout is layered (stages as columns, or rows in portrait) without crossing minimization; keep each stage to a few nodes.
- Card text is wrapped by the browser (`foreignObject`); for static SVG export, keep labels short.
