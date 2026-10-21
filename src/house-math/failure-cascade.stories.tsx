import { useCallback, useMemo, useRef, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { HeroAssetViewer } from "../../registry/craft/hero-viewer";
import type { HeroAsset } from "../../registry/craft/hero-asset";
import type { HeroActionState } from "../../registry/craft/hero-action";
import { createHouse3D } from "../../registry/domains/home-3d";
import { houseEffects } from "../../registry/domains/home-effects";
import { HOUSE_PRESETS, HOUSE_STATES, resolveHouseLayout } from "../../registry/domains/home-model";
import { compileAssetStateSequence } from "../../registry/visual/asset-state-sequence";
import { createAssetStateAsset } from "../../registry/visual/asset-state-sequence-three";
import { compileEffect } from "../../registry/visual/environmental-effects";
import { createEnvironmentalEffectsThree } from "../../registry/visual/environmental-effects-three";
import type { EnvironmentalEffectsThree } from "../../registry/visual/environmental-effects-three";
import { compileFailureCascade, evaluateFailureCascade } from "../../registry/visual/failure-cascade";
import type { FailureCascadeSpec } from "../../registry/visual/failure-cascade";
import { FailureCascadeSvg } from "../../registry/visual/failure-cascade-react";
import { Button, Chip, Page, Panel, Row, Slider, ink, mono, useFramePlayer } from "./house-ui";

// Illustrative cascades and costs for the story; evidence ids point at named story sources.
const HOUSE = { ...HOUSE_PRESETS.cottage, interior: false };
const L = resolveHouseLayout(HOUSE);
const PARTS = L.parts.map(p => p.id);
const EVIDENCE = {
  photo: { label: "Inspection photo, chimney flashing", source: "story fixture" },
  report: { label: "Roofer's inspection notes", source: "story fixture" },
  meter: { label: "Moisture readings at the decking", source: "story fixture" },
  ceiling: { label: "Photo of the ceiling stain", source: "story fixture" },
  quote: { label: "Contractor quote", source: "story fixture" },
  filter: { label: "Service log: filter not changed for 14 months", source: "story fixture" },
  tech: { label: "HVAC technician report", source: "story fixture" },
  bills: { label: "Utility bills, two winters", source: "story fixture" },
  grade: { label: "Survey of grading around the house", source: "story fixture" },
  engineer: { label: "Structural engineer letter", source: "story fixture" },
};

const CASCADES: Record<string, { label: string; describe: string; spec: FailureCascadeSpec; linked3d?: boolean }> = {
  roof: { label: "Roof flashing leak (linked 3D)", linked3d: true, describe: "Each stage switches the house to the condition build the author linked (new → aged → damaged), and storm rain plays during the stage where water gets in. The mold stage has no evidence, so it is drawn as an unsupported claim.",
    spec: { id: "roof-leak", title: "How a cracked flashing becomes a ceiling repair", evidence: EVIDENCE, availableStates: [...HOUSE_STATES], availableParts: PARTS, timing: { framesPerStage: 70, start: 10 },
      nodes: [
        { id: "flash", kind: "defect", label: "Step flashing at the chimney cracks", subject: "chimney", state: "aged", evidence: ["photo", "report"] },
        { id: "water", kind: "mechanism", label: "Wind-driven rain gets behind the flashing", subject: "roof.shingles", evidence: ["report"] },
        { id: "rot", kind: "damage", label: "Decking around the chimney stays wet and rots", subject: "roof.decking", state: "damaged", evidence: ["meter"], cost: { low: 1800, high: 3500, currency: "USD", source: "contractor quote (fixture)" } },
        { id: "stain", kind: "damage", label: "Ceiling stain and soft drywall below", evidence: ["ceiling"], cost: { low: 600, high: 1500, currency: "USD", source: "contractor quote (fixture)" } },
        { id: "mold", kind: "consequence", label: "Mold remediation if left for a season", cost: { low: 2000, high: 6000, currency: "USD", source: "remediation price list (fixture)" }, order: 1 },
        { id: "fix", kind: "repair", label: "Re-flash the chimney and replace the decking", state: "new", evidence: ["quote"], cost: { low: 900, high: 1600, currency: "USD", source: "contractor quote (fixture)" }, order: 0 },
      ],
      edges: [{ from: "flash", to: "water", label: "opens a path", evidence: ["report"] }, { from: "water", to: "rot", evidence: ["meter"] }, { from: "rot", to: "stain", label: "drips through", evidence: ["ceiling"] }, { from: "stain", to: "mold" }, { from: "stain", to: "fix", label: "repair", evidence: ["quote"] }] } },
  hvac: { label: "HVAC filter neglect", describe: "A branching chain: one defect leads to an equipment failure and, in parallel, to higher bills. Costs are summed only as each stage appears.",
    spec: { id: "hvac", title: "From a clogged filter to a failed compressor", evidence: EVIDENCE, timing: { framesPerStage: 60, start: 10 },
      nodes: [
        { id: "filter", kind: "defect", label: "Air filter clogged", evidence: ["filter"] },
        { id: "airflow", kind: "mechanism", label: "Airflow across the coil drops", evidence: ["tech"] },
        { id: "ice", kind: "damage", label: "Evaporator coil ices over", evidence: ["tech"], order: 0 },
        { id: "bills", kind: "consequence", label: "Longer run times, higher bills", evidence: ["bills"], cost: { low: 180, high: 360, currency: "USD", source: "utility bills, 12 months (fixture)" }, order: 1 },
        { id: "compressor", kind: "damage", label: "Compressor overheats and fails", evidence: ["tech"], cost: { low: 1500, high: 2800, currency: "USD", source: "HVAC quote (fixture)" } },
      ],
      edges: [{ from: "filter", to: "airflow", evidence: ["tech"] }, { from: "airflow", to: "ice", evidence: ["tech"] }, { from: "airflow", to: "bills", evidence: ["bills"] }, { from: "ice", to: "compressor", label: "liquid slugging", evidence: ["tech"] }] } },
  drainage: { label: "Drainage → foundation", describe: "Clogged gutters and poor grading lead to settlement, cracks and sticking doors, then a costed repair.",
    spec: { id: "drain", title: "When roof water is not carried away", evidence: EVIDENCE, timing: { framesPerStage: 60, start: 10 },
      nodes: [
        { id: "gutters", kind: "defect", label: "Gutters clogged; downspouts end at the wall", evidence: ["grade"] },
        { id: "pool", kind: "mechanism", label: "Water pools against the foundation", evidence: ["grade"] },
        { id: "settle", kind: "damage", label: "Soil softens and one corner settles", evidence: ["engineer"] },
        { id: "cracks", kind: "damage", label: "Stair-step cracks in the foundation", evidence: ["engineer"], order: 0 },
        { id: "doors", kind: "consequence", label: "Doors and windows start sticking", evidence: ["engineer"], order: 1 },
        { id: "pier", kind: "repair", label: "Regrade, extend downspouts, underpin the corner", evidence: ["quote"], cost: { low: 6500, high: 14000, currency: "USD", source: "foundation contractor quote (fixture)" } },
      ],
      edges: [{ from: "gutters", to: "pool" }, { from: "pool", to: "settle", evidence: ["engineer"] }, { from: "settle", to: "cracks" }, { from: "settle", to: "doors" }, { from: "cracks", to: "pier", label: "repair" }] } },
  invalid: { label: "Invalid graph (diagnostics)", describe: "A cycle, an unknown evidence id, an unknown asset state and a cost without a source: the cascade refuses to invent a stage order and lists every problem.",
    spec: { id: "bad", title: "A cascade that cannot be shown as authored", evidence: EVIDENCE, availableStates: [...HOUSE_STATES],
      nodes: [
        { id: "a", kind: "defect", label: "Loose shingle", evidence: ["photo"] },
        { id: "b", kind: "mechanism", label: "Leak", evidence: ["nonexistent"], state: "flooded" },
        { id: "c", kind: "damage", label: "Rot", cost: { low: 900, currency: "USD", source: "" } },
      ],
      edges: [{ from: "a", to: "b" }, { from: "b", to: "c" }, { from: "c", to: "a", label: "and back again?" }] } },
};

function CascadeDemo({ cascade: initial }: { cascade: string }) {
  const [key, setKey] = useState(initial);
  const [portrait, setPortrait] = useState(false);
  const cs = CASCADES[key];
  const plan = useMemo(() => compileFailureCascade(cs.spec), [cs]);
  const duration = Math.max(120, plan.durationFrames + 60);
  const player = useFramePlayer(duration, { loop: true, autoplay: true });
  const f = evaluateFailureCascade(plan, player.frame);
  // Linked 3D: an AssetStateSequence generated from the stages that declare a state, plus storm rain on the "water" stage.
  const fps = cs.spec.timing?.framesPerStage ?? 60, start = cs.spec.timing?.start ?? 0;
  const statePlan = useMemo(() => {
    if (!cs.linked3d || !plan.ok) return null;
    const steps = plan.stages.flatMap((ids, s) => ids.map(id => cs.spec.nodes.find(n => n.id === id)!).filter(n => n.state).map(n => ({ state: n.state!, at: start + s * fps, duration: 26, transition: "crossfade" as const, label: n.label })));
    return compileAssetStateSequence({ id: `${cs.spec.id}-states`, initial: "new", states: HOUSE_STATES.map(id => ({ id, kind: "variant" as const })), steps });
  }, [cs, plan, fps, start]);
  const waterStage = plan.stage.water ?? -1;
  const fx = useRef<EnvironmentalEffectsThree | null>(null);
  const create = useCallback(() => createAssetStateAsset({ id: "cascade-house", plan: statePlan!, variants: Object.fromEntries(HOUSE_STATES.map(s => [s, createHouse3D({ ...HOUSE, condition: s })])) }), [statePlan]);
  const onAsset = useCallback((a: HeroAsset) => {
    fx.current?.dispose();
    fx.current = createEnvironmentalEffectsThree(houseEffects(L, "storm", { start: start + waterStage * fps }).map(s => compileEffect({ ...s, frames: { start: start + waterStage * fps, end: start + (waterStage + 1.4) * fps, fadeIn: 15, fadeOut: 20 } })));
    a.group.add(fx.current.group);
  }, [start, waterStage, fps]);
  const onPose = useCallback((a: HeroAsset, s: HeroActionState) => { a.pose?.({ id: "sequence", frame: s.frame }); fx.current?.update(s.frame); }, []);
  const [W, H] = portrait ? [900, 1400] : [1600, 600];
  return <Page kicker="House Math · Recipes" title="FailureCascade"
    intro={<>A user-authored chain of defects, effects and consequences, revealed stage by stage. Links are claims backed by cited evidence, never inferred. Cycles, unknown states or parts, missing evidence and costs without a source are diagnosed, and the running cost sums only authored, sourced values of the stages shown so far. Linked asset states and effects follow the stages.</>}>
    <Row label="Cascade">{Object.entries(CASCADES).map(([k, v]) => <Button key={k} active={key === k} title={v.describe} onClick={() => { setKey(k); player.restart(); }}>{v.label}</Button>)}</Row>
    <p style={{ margin: 0, color: ink.sub }}>{cs.describe}</p>
    <Row label="Playback">
      <Button small active={player.playing} onClick={() => (player.playing ? player.pause() : player.resume())}>{player.playing ? "Pause" : "Play"}</Button>
      <Button small active={portrait} onClick={() => setPortrait(p => !p)}>9:16 layout</Button>
      <div style={{ minWidth: 320, flex: 1 }}><Slider label="Frame" value={player.frame} min={0} max={duration - 1} onChange={player.seek} /></div>
    </Row>
    <div style={{ display: "grid", gridTemplateColumns: cs.linked3d && statePlan && !portrait ? "minmax(0, 1.25fr) minmax(0, 1fr)" : portrait ? "minmax(0, 520px) minmax(0, 1fr)" : "minmax(0, 1fr)", gap: 14, alignItems: "start" }}>
      <div data-km-cascade-view="" style={{ borderRadius: 10, overflow: "hidden", border: `1px solid ${ink.line}` }}><FailureCascadeSvg plan={plan} frame={player.frame} width={W} height={H} /></div>
      {cs.linked3d && statePlan ? <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", border: `1px solid ${ink.line}` }}>
        <HeroAssetViewer key={key} createAsset={create} width={960} height={720} azimuth={-24} elevation={20} zoom={1.3} action="sequence" actionFrame={player.frame} onAsset={onAsset} onPose={onPose} ariaLabel="Linked house state" />
        <div style={{ position: "absolute", left: 12, bottom: 10, padding: "5px 9px", borderRadius: 8, background: "rgba(12,16,21,.8)", color: ink.text, fontSize: 13 }}>{`state: ${f.state ?? "new"}${f.focus ? ` · focus ${f.focus}` : ""}`}</div>
      </div> : null}
      {portrait || !cs.linked3d ? <Panel title="Diagnostics">{plan.diagnostics.length ? plan.diagnostics.map((d, i) => <div key={i} style={{ fontSize: 13, color: ink.sub }}><span style={{ fontFamily: mono, color: d.severity === "error" ? ink.warn : ink.dim }}>{d.code}</span> {d.message}</div>) : <Chip tone={ink.accent}>no diagnostics</Chip>}</Panel> : null}
    </div>
    {!portrait && cs.linked3d ? <Panel title="Diagnostics">{plan.diagnostics.map((d, i) => <div key={i} style={{ fontSize: 13, color: ink.sub }}><span style={{ fontFamily: mono, color: d.severity === "error" ? ink.warn : ink.dim }}>{d.code}</span> {d.message}</div>)}</Panel> : null}
  </Page>;
}

const meta = {
  title: "House Math/Failure Cascade", component: CascadeDemo, parameters: { layout: "fullscreen" },
  argTypes: { cascade: { control: "inline-radio", options: Object.keys(CASCADES) } },
} satisfies Meta<typeof CascadeDemo>;
export default meta;
export const Cascade: StoryObj<typeof meta> = { args: { cascade: "hvac" } };
/** The roof leak cascade linked to the 3D house (three condition builds). */
export const LinkedHouse: StoryObj<typeof meta> = { args: { cascade: "roof" } };
