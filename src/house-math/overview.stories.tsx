import type { Meta, StoryObj } from "@storybook/react-vite";
import { Chip, Page, Panel, ink, mono } from "./house-ui";

/** Progress board for docs/16-house-math.md. Status is evidence-based: "done" means implemented,
 * typechecked, in Storybook and screenshot-reviewed by the agent — human visual review is still pending. */
type Status = "done" | "next" | "planned" | "later";
interface Item { id: string; name: string; priority: "P0" | "P1" | "P2" | "Kit"; what: string; status: Status; step: number; story?: string; registry?: string }

const ITEMS: Item[] = [
  { id: "kit", name: "Home Kit (model + 3D)", priority: "Kit", step: 1, status: "done", story: "house-math-home-kit-3d--explorer", registry: "domain-home-model · domain-home-3d",
    what: "Layered houses from a validated spec: every semantic part a separately animatable group; presets, conditions, palettes, actions." },
  { id: "rig", name: "Part Rig", priority: "Kit", step: 1, status: "done", story: "house-math-home-kit-3d--explorer", registry: "craft-part-rig",
    what: "Deterministic translate / pivot-rotate / scale / opacity / visibility for any named hierarchy, layered over asset actions." },
  { id: "V01", name: "InspectableAsset", priority: "P0", step: 1, status: "done", story: "house-math-inspectable-asset--three-fixtures", registry: "inspectable-asset · inspectable-asset-three",
    what: "One interface for parts, bounds, anchors, states and capabilities across 2D/3D; three unrelated fixtures." },
  { id: "V02", name: "SectionReveal", priority: "P0", step: 2, status: "done", story: "house-math-section-reveal--modes", registry: "section-reveal · section-reveal-three",
    what: "Isolate, ghost, sweeping and capped sections of intact assemblies (3D and SVG); explicit fallbacks and diagnostics." },
  { id: "V03", name: "SemanticCalloutLayer", priority: "P0", step: 2, status: "done", story: "house-math-semantic-callouts--follow-parts", registry: "semantic-callouts · semantic-callouts-three",
    what: "Measured labels and leaders on moving parts; visible / occluded / outside / unplaceable, protected regions and parts." },
  { id: "V04", name: "FlowPath", priority: "P0", step: 3, status: "done", story: "house-math-flow-path--systems", registry: "flow-path · flow-path-three",
    what: "Illustrative air, water, refrigerant, rain, power or money flow along authored routes in SVG and Three.js; pure per frame." },
  { id: "2D", name: "Home Kit 2D section", priority: "Kit", step: 3, status: "done", story: "house-math-home-kit-2d--section", registry: "domain-home-section-2d",
    what: "SVG cross-section from the same layout and part IDs, with flows, ghosting, poses and callouts." },
  { id: "INT", name: "Interiors & yards", priority: "Kit", step: 4, status: "done", story: "house-math-interior-plans--plans", registry: "domain-home-model · domain-home-3d · domain-home-floor-plan-2d · craft-walk-camera",
    what: "Customizable floor plans, furniture recipes and overrides, kitchens, baths, closets, lights, outlets, yards; walk mode, tours and animatable interior parts." },
  { id: "E01", name: "CostWaterfall", priority: "P0", step: 5, status: "done", story: "house-math-economic-charts--cost-waterfall", registry: "infographic-economic-charts", what: "Signed contributions, subtotals and exact totals with currency and provenance." },
  { id: "E02", name: "LifecycleCostTimeline", priority: "P0", step: 5, status: "done", story: "house-math-economic-charts--lifecycle-cost-timeline", registry: "infographic-economic-charts", what: "Recurring and one-off costs over a horizon; nominal/real/PV basis never mixed." },
  { id: "E03", name: "BreakEvenComparison", priority: "P0", step: 5, status: "done", story: "house-math-economic-charts--break-even-comparison", registry: "infographic-economic-charts", what: "Cumulative comparison with truthful crossover (multiple, none, near-equal) diagnostics." },
  { id: "E04", name: "ComparisonStage", priority: "P1", step: 6, status: "done", story: "house-math-comparison-stage--compare", registry: "comparison-stage", what: "Fair side-by-side objects at declared real or normalized scale." },
  { id: "V06", name: "AssetStateSequence", priority: "P1", step: 6, status: "done", story: "house-math-asset-state-sequence--states", registry: "asset-state-sequence · asset-state-sequence-three", what: "Frame-ranged state changes (new → aged → damaged) with explicit crossfade/cut." },
  { id: "E05", name: "ScenarioBand", priority: "P1", step: 6, status: "done", story: "house-math-economic-charts--scenario-band", registry: "infographic-economic-charts", what: "Low/base/high ranges labeled as non-probabilistic unless stated." },
  { id: "V07", name: "DimensionOverlay", priority: "P1", step: 7, status: "done", story: "house-math-dimension-overlay--dimensions", registry: "dimension-overlay · domain-home-dimensions", what: "Animated dimensions, thickness, distances, areas, angles and scale references from asset meters." },
  { id: "V08", name: "MechanismSequence", priority: "P1", step: 7, status: "done", story: "house-math-mechanism-sequence--mechanisms", registry: "mechanism-sequence · mechanism-sequence-three", what: "Frame-addressed operations on moving parts: compressors, fans, valves, appliances." },
  { id: "E06", name: "AnimatedMetric", priority: "P1", step: 7, status: "done", story: "house-math-animated-metric--metrics", registry: "animated-metric", what: "Count-ups and changing quantities with exact final values and stable formatting." },
  { id: "V09", name: "EnvironmentalEffects", priority: "P1", step: 7, status: "done", story: "house-math-environmental-effects--effects", registry: "environmental-effects · environmental-effects-three · domain-home-effects", what: "Seeded, bounded rain, leaks, dust, snow and condensation; always illustrative." },
  { id: "V05", name: "ScalarFieldOverlay", priority: "P1", step: 8, status: "next", what: "Supplied heat/moisture fields as calibrated bands — never simulated." },
  { id: "R01", name: "InspectThenQuantify", priority: "P1", step: 8, status: "next", what: "Overview → focus/cutaway → callout → linked chart recipe." },
  { id: "R02", name: "FailureCascade", priority: "P2", step: 8, status: "next", what: "User-authored cause → effect graph with state switches; no inferred causality." },
];
const TONE: Record<Status, string> = { done: "#6fd3a6", next: "#e7b15e", planned: "#7aa7e8", later: "#7d8a98" };
const LABEL: Record<Status, string> = { done: "Done", next: "Next · step 8", planned: "Planned", later: "Later" };

function Overview() {
  return <Page kicker="House Math" title="Reusable components for home & real-estate explainers"
    intro={<>Implementation of <code>docs/16-house-math.md</code> in small evidence-driven steps. Generic visual components stay
      house-agnostic; the home kit supplies source assets with stable semantic IDs, anchors and flow routes. Open any “done” item
      in the sidebar under <strong>House Math</strong>.</>}>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{(Object.keys(LABEL) as Status[]).map(s =>
      <Chip key={s} tone={TONE[s]}>{`${LABEL[s]} · ${ITEMS.filter(i => i.status === s).length}`}</Chip>)}</div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
      {ITEMS.map(item => <Panel key={item.id} style={{ borderColor: item.status === "done" ? TONE.done + "66" : ink.line }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: mono, fontSize: 12, color: ink.dim }}>{item.id} · {item.priority}</span>
          <Chip tone={TONE[item.status]}>{item.status === "next" ? LABEL[item.status] : `${LABEL[item.status]} · step ${item.step}`}</Chip>
        </div>
        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 620 }}>{item.name}</h3>
        <p style={{ margin: 0, color: ink.sub, fontSize: 14, lineHeight: 1.45 }}>{item.what}</p>
        {item.registry ? <div style={{ fontFamily: mono, fontSize: 11.5, color: ink.dim }}>{item.registry}</div> : null}
        {item.story ? <a href={`/?path=/story/${item.story}`} target="_top" style={{ color: ink.accent, fontSize: 13 }}>Open story →</a> : null}
      </Panel>)}
    </div>
    <Panel title="Evidence and honesty">
      <ul style={{ margin: 0, paddingLeft: 18, color: ink.sub, fontSize: 14, lineHeight: 1.6 }}>
        <li>“Done” = implemented, typechecked, linted, registered in the catalog, in Storybook and screenshot-reviewed by the agent at several views.</li>
        <li>Human visual review of the 3D house is still required before it can be marked hero-approved.</li>
        <li>House construction is illustrative; no structural, energy, pricing or code-compliance claims are made by these components.</li>
      </ul>
    </Panel>
  </Page>;
}

const meta = { title: "House Math/Overview", component: Overview, parameters: { layout: "fullscreen" } } satisfies Meta<typeof Overview>;
export default meta;
export const Progress: StoryObj<typeof meta> = {};
