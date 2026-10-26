import { useCallback, useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { HeroAssetViewer } from "../../registry/craft/hero-viewer";
import type { HeroAsset } from "../../registry/craft/hero-asset";
import { createFinanceObjectHeroAsset } from "../../registry/domains/finance-object-3d";
import type { FinanceObjectKind } from "../../registry/domains/finance-object-model";
import { createHouse3D } from "../../registry/domains/home-3d";
import { createHomeEquipment3D, HOME_EQUIPMENT_LABELS } from "../../registry/domains/home-equipment-3d";
import type { HomeEquipmentKind } from "../../registry/domains/home-equipment-3d";
import { HouseFloorPlan2D } from "../../registry/domains/home-floor-plan-2d";
import { HOUSE_PRESETS, resolveHouseLayout } from "../../registry/domains/home-model";
import type { HouseLayout, HousePresetName, HouseSpec } from "../../registry/domains/home-model";
import { comparisonCamera, localSlot, planComparisonStage, subjectFromHero } from "../../registry/visual/comparison-stage";
import type { ComparisonDimension, ComparisonScale, ComparisonSlot, ComparisonSubject } from "../../registry/visual/comparison-stage";
import { ComparisonStageView } from "../../registry/visual/comparison-stage-react";
import { Button, Chip, Page, Panel, Row, ink, mono } from "./house-ui";

type Factory = { subject: ComparisonSubject; create?: () => HeroAsset; plan2d?: HouseLayout };
type SetId = "houses" | "equipment" | "finance" | "plans";

const HOUSES: HousePresetName[] = ["cottage", "ranch", "two-storey"];
const houseSpec = (p: HousePresetName): HouseSpec => ({ ...HOUSE_PRESETS[p], interior: false });

/** House envelope above grade, from the renderer-neutral layout (no build needed). */
function houseSubject(p: HousePresetName): Factory {
  const layout = resolveHouseLayout(houseSpec(p)), d = layout.dims;
  const w = d.width + d.rakeOverhang * 2, depth = d.depth + d.eaveOverhang * 2, h = d.ridgeY + .25;
  return {
    subject: { id: p, label: p === "two-storey" ? "Two-storey" : p[0].toUpperCase() + p.slice(1), caption: `${d.storeys} storey${d.storeys > 1 ? "s" : ""} · ${layout.spec.foundation ?? "slab"}`,
      size: [w, h, depth], hero: { bounds: { min: [-w / 2, 0, -depth / 2], max: [w / 2, h, depth / 2] }, metersPerUnit: 1 } },
    create: () => createHouse3D(houseSpec(p)),
  };
}
/** Hero assets measured once from their authored bounds × metersPerUnit, then rebuilt by the viewer. */
function measured(id: string, label: string, make: () => HeroAsset, caption?: string): Factory {
  const probe = make();
  const subject = subjectFromHero(id, label, probe, caption);
  probe.dispose();
  return { subject, create: make };
}
const EQUIPMENT: HomeEquipmentKind[] = ["tank-water-heater", "tankless-water-heater", "air-handler", "condenser"];
const EQUIPMENT_NOTES: Partial<Record<HomeEquipmentKind, string>> = { "tank-water-heater": "Floor-standing tank in a drain pan", "tankless-water-heater": "Wall-hung, 62 cm unit; height includes mount and vent", condenser: "On its pad, outdoors" };
const FINANCE: { kind: FinanceObjectKind; label: string }[] = [{ kind: "debit-card", label: "Payment card" }, { kind: "money-bag", label: "Money bag" }, { kind: "gold-bars", label: "Gold bar stack" }];

const SETS: Record<SetId, { label: string; describe: string; build: () => Factory[]; dimension: ComparisonDimension; views: Record<string, { azimuth: number; elevation: number }> }> = {
  houses: { label: "Houses (3D)", describe: "Three house presets from the same kit. Equal scale shows the real difference in height and width.", dimension: "height",
    build: () => HOUSES.map(houseSubject), views: { front: { azimuth: 0, elevation: 0 }, "three-quarter": { azimuth: 32, elevation: 12 } } },
  equipment: { label: "Equipment (3D)", describe: "Tank vs tankless water heaters next to an air handler and an outdoor condensing unit, all at true scale.", dimension: "height",
    build: () => EQUIPMENT.map(k => measured(k, HOME_EQUIPMENT_LABELS[k], () => createHomeEquipment3D({ kind: k }), EQUIPMENT_NOTES[k])), views: { front: { azimuth: 0, elevation: 0 }, "three-quarter": { azimuth: 28, elevation: 10 } } },
  finance: { label: "Non-home objects (3D)", describe: "Same component, different subject. A payment card next to a money bag and gold bars: at true scale the card is small, and the stage reports it instead of enlarging it.", dimension: "height",
    build: () => FINANCE.map(f => measured(f.kind, f.label, () => createFinanceObjectHeroAsset({ kind: f.kind, id: `cmp-${f.kind}` })!)), views: { front: { azimuth: 0, elevation: 0 }, "three-quarter": { azimuth: 24, elevation: 10 } } },
  plans: { label: "Floor plans (2D)", describe: "Footprints compared in plan view: 2D SVG content in the same stage, with a shared scale bar.", dimension: "footprint",
    build: () => HOUSES.map(p => { const l = resolveHouseLayout({ ...HOUSE_PRESETS[p] });
      return { subject: { id: p, label: p === "two-storey" ? "Two-storey (ground floor)" : p[0].toUpperCase() + p.slice(1), size: [l.dims.width, 0, l.dims.depth] as const, caption: "Exterior wall faces" }, plan2d: l }; }),
    views: { top: { azimuth: 0, elevation: 90 } } },
};

const STUDIO = { keyAzimuth: -38, environmentIntensity: .6 } as const;
/** Paper margin HouseFloorPlan2D draws around the footprint, in meters. */
const PLAN_PAD = .6;

function ComparisonDemo({ set: initialSet }: { set: SetId }) {
  const [setId, setSet] = useState<SetId>(initialSet);
  const [scale, setScale] = useState<ComparisonScale>("equal");
  const [aspect, setAspect] = useState<"16:9" | "9:16">("16:9");
  const [units, setUnits] = useState<"metric" | "imperial">("metric");
  const set = SETS[setId];
  const [viewKey, setViewKey] = useState(Object.keys(set.views)[0]);
  const view = set.views[viewKey] ?? Object.values(set.views)[0];
  const factories = useMemo(() => set.build(), [set]);
  const [W, H] = aspect === "16:9" ? [1600, 900] : [900, 1600];
  const plan = useMemo(() => planComparisonStage({ id: setId, subjects: factories.map(f => f.subject), scale, view, dimension: set.dimension, units }, { width: W, height: H }), [factories, scale, view, set.dimension, units, W, H, setId]);
  const residuals = useMemo(() => Object.fromEntries(plan.slots.map((s, i) => [s.id, factories[i].plan2d ? 0 : comparisonCamera(localSlot(s), factories[i].subject, view).residual])), [plan, factories, view]);
  const creators = useMemo(() => Object.fromEntries(factories.map(f => [f.subject.id, f.create])), [factories]);
  const renderSlot = useCallback((slot: ComparisonSlot) => {
    const f = factories.find(x => x.subject.id === slot.id)!;
    // The plan SVG adds PLAN_PAD meters of paper around the footprint; grow the box by the same real distance.
    const padPx = PLAN_PAD * slot.pxPerMeter;
    if (f.plan2d) return <div style={{ position: "absolute", left: slot.subjectRect.x - padPx, top: slot.subjectRect.y - padPx, width: slot.subjectRect.width + padPx * 2, height: slot.subjectRect.height + padPx * 2 }}>
      <HouseFloorPlan2D layout={f.plan2d} furniture labels={false} theme="paper" />
    </div>;
    const create = creators[slot.id]!;
    return <HeroAssetViewer key={`${setId}-${slot.id}`} createAsset={create} width={Math.round(slot.rect.width)} height={Math.round(slot.rect.height)} studio={STUDIO}
      camera={comparisonCamera(slot, f.subject, view)} ariaLabel={`${slot.label} at ${scale === "equal" ? "shared" : "fitted"} scale`} />;
  }, [factories, creators, view, setId, scale]);
  return <Page kicker="House Math · Comparison" title="ComparisonStage"
    intro={<>Fair side-by-side comparisons. With <b>equal</b> scale every slot uses one px per meter and subjects share a ground line. With <b>fit-each</b> scale the stage is captioned not to scale, with a scale bar and ratio badge per slot. 3D cameras are matched (same fov and angle, distance set by scale), so size is never silently exaggerated.</>}>
    <Row label="Subjects">{(Object.keys(SETS) as SetId[]).map(k => <Button key={k} active={setId === k} title={SETS[k].describe} onClick={() => { setSet(k); setViewKey(Object.keys(SETS[k].views)[0]); }}>{SETS[k].label}</Button>)}</Row>
    <p style={{ margin: 0, color: ink.sub }}>{set.describe}</p>
    <Row label="Scale">
      {(["equal", "fit-each"] as const).map(s => <Button key={s} small active={scale === s} onClick={() => setScale(s)}>{s}</Button>)}
      {Object.keys(set.views).map(v => <Button key={v} small active={viewKey === v} onClick={() => setViewKey(v)}>{v}</Button>)}
      {(["16:9", "9:16"] as const).map(a => <Button key={a} small active={aspect === a} onClick={() => setAspect(a)}>{a}</Button>)}
      {(["metric", "imperial"] as const).map(u => <Button key={u} small active={units === u} onClick={() => setUnits(u)}>{u}</Button>)}
    </Row>
    <div style={{ display: "grid", gridTemplateColumns: aspect === "16:9" ? "minmax(0,1fr)" : "minmax(0,520px) minmax(0,1fr)", gap: 14, alignItems: "start" }}>
      <div style={{ borderRadius: 10, overflow: "hidden", border: `1px solid ${ink.line}` }} data-km-ready="">
        <ComparisonStageView plan={plan} width={W} height={H} renderSlot={renderSlot} />
      </div>
      <Panel title="Plan">
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <Chip tone={plan.notToScale ? ink.warn : ink.accent}>{plan.notToScale ? "not to scale (declared)" : "equal scale"}</Chip>
          <Chip>{plan.pxPerMeter ? `${plan.pxPerMeter.toFixed(1)} px/m` : "per-slot px/m"}</Chip><Chip>{plan.layout}</Chip>
        </div>
        <div style={{ fontFamily: mono, fontSize: 12, color: ink.sub, lineHeight: 1.6 }}>
          {plan.slots.map(s => <div key={s.id}>{`${s.id}: ${s.extent.map(v => v.toFixed(2)).join(" × ")} m → ${s.pxPerMeter.toFixed(1)} px/m (×${s.relativeScale.toFixed(2)})${residuals[s.id] ? ` · perspective ±${(residuals[s.id] * 100).toFixed(1)}%` : ""}`}</div>)}
        </div>
        {plan.diagnostics.length ? <ul style={{ margin: 0, paddingLeft: 18, color: ink.sub, fontSize: 12.5 }}>{plan.diagnostics.map((d, i) => <li key={i}><span style={{ fontFamily: mono, color: d.severity === "error" ? ink.warn : ink.dim }}>{d.code}</span> {d.message}</li>)}</ul> : null}
      </Panel>
    </div>
  </Page>;
}

const meta = {
  title: "Asset motion and states/Comparison Stage", id: "house-math-comparison-stage", component: ComparisonDemo, parameters: { layout: "fullscreen" },
  argTypes: { set: { control: "inline-radio", options: Object.keys(SETS) } },
} satisfies Meta<typeof ComparisonDemo>;
export default meta;
export const Compare: StoryObj<typeof meta> = { args: { set: "houses" } };
