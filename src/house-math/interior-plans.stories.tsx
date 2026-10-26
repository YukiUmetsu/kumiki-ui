import { useCallback, useMemo, useRef, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { HeroAssetViewer } from "../../registry/craft/hero-viewer";
import type { HeroAsset } from "../../registry/craft/hero-asset";
import type { HeroActionState } from "../../registry/craft/hero-action";
import { createPartRig } from "../../registry/craft/part-rig";
import type { PartRig } from "../../registry/craft/part-rig";
import { createHouse3D } from "../../registry/domains/home-3d";
import { HouseFloorPlan2D } from "../../registry/domains/home-floor-plan-2d";
import type { FloorPlanSpec, InteriorSpec } from "../../registry/domains/home-interior-model";
import { HOUSE_PRESETS, resolveHouseLayout } from "../../registry/domains/home-model";
import type { HouseSpec } from "../../registry/domains/home-model";
import { Button, Chip, Page, Panel, Row, ink, mono } from "./house-ui";

/** An authored plan in fractions of the footprint: it scales to any house size. */
const STUDIO: FloorPlanSpec = {
  units: "fraction",
  rooms: [
    { id: "great-room", kind: "living", label: "Great room", rects: [{ x0: 0, z0: .42, x1: .62, z1: 1 }] },
    { id: "kitchen", kind: "kitchen", rects: [{ x0: .62, z0: .42, x1: 1, z1: 1 }] },
    { id: "walk-in", kind: "closet", label: "Walk-in closet", rects: [{ x0: 0, z0: 0, x1: .24, z1: .13 }] },
    { id: "suite", kind: "bedroom", label: "Suite", rects: [{ x0: .24, z0: 0, x1: .52, z1: .13 }, { x0: 0, z0: .13, x1: .52, z1: .42 }] },
    { id: "bath", kind: "bath", rects: [{ x0: .52, z0: 0, x1: .78, z1: .42 }] },
    { id: "laundry", kind: "utility", label: "Laundry", rects: [{ x0: .78, z0: 0, x1: 1, z1: .42 }] },
  ],
  connections: [
    { between: ["great-room", "kitchen"], kind: "open" },
    { between: ["great-room", "suite"], at: .85 },
    { between: ["suite", "walk-in"], kind: "bifold" },
    { between: ["kitchen", "bath"], at: .3 },
    { between: ["kitchen", "laundry"], at: .5 },
  ],
};

const TEMPLATES: Record<string, { label: string; describe: string; spec: HouseSpec; code: string }> = {
  auto: { label: "Auto · cottage", describe: "Default rule-based plan for the cottage footprint.", spec: HOUSE_PRESETS.cottage, code: `{ ...HOUSE_PRESETS.cottage }  // interior: "auto"` },
  "auto-2": { label: "Auto · two-storey", describe: "The same generator on a two-storey basement house: hall, stair and four bedrooms upstairs.", spec: HOUSE_PRESETS["two-storey"], code: `{ ...HOUSE_PRESETS["two-storey"] }` },
  studio: { label: "Authored · studio", describe: "A fully authored plan in footprint fractions with an L-shaped suite and a walk-in closet; walls come from shared room edges.",
    spec: { ...HOUSE_PRESETS.cottage, interior: { plan: STUDIO } }, code: `interior: { plan: ${JSON.stringify(STUDIO, null, 1).replace(/\n\s*/g, " ")} }` },
  edited: { label: "Edited auto · ranch", describe: "A function edits the generated ranch plan: bedroom 2 becomes an office and the bath opens with a cased opening.",
    spec: { ...HOUSE_PRESETS.ranch, interior: { plan: auto => ({ ...auto,
      rooms: auto.rooms.map(r => r.id === "bedroom-2" ? { ...r, kind: "office" as const, label: "Home office" } : r),
      connections: (auto.connections ?? []).map(c => c.between[1] === "bath-1" ? { ...c, kind: "opening" as const, width: .9 } : c) }) } },
    code: `interior: { plan: auto => ({ ...auto, rooms: auto.rooms.map(r => r.id === "bedroom-2" ? { ...r, kind: "office", label: "Home office" } : r),\n  connections: auto.connections.map(c => c.between[1] === "bath-1" ? { ...c, kind: "opening" } : c) }) }` },
  furnished: { label: "Furniture overrides", describe: "Auto cottage plan with per-room overrides: no TV, an extra reading chair and plant; bedroom 2 refurnished as a nursery-style study.",
    spec: { ...HOUSE_PRESETS.cottage, interior: { rooms: {
      living: { omit: ["tv", "tv-console"], items: [{ kind: "armchair", name: "reading-chair", at: [.16, .82], yaw: 45 }, { kind: "plant", name: "fig", at: [.95, .1] }] },
      "bedroom-2": { replace: true, label: "Study", items: [{ kind: "desk", at: [.5, .15], yaw: 0 }, { kind: "desk-chair", at: [.5, .32], yaw: 180 }, { kind: "bookshelf", at: [.92, .55], yaw: -90 }, { kind: "rug", at: [.5, .6], size: [1.8, .01, 1.3] }] },
    } } satisfies InteriorSpec },
    code: `interior: { rooms: {\n  living: { omit: ["tv", "tv-console"], items: [{ kind: "armchair", at: [.16, .82], yaw: 45 }, { kind: "plant", at: [.95, .1] }] },\n  "bedroom-2": { replace: true, label: "Study", items: [{ kind: "desk", at: [.5, .15] }, …] } } }` },
};

function InteriorPlans({ template: initial }: { template: string }) {
  const [template, setTemplate] = useState(initial);
  const [storey, setStorey] = useState(0);
  const [furniture, setFurniture] = useState(true), [devices, setDevices] = useState(false);
  const [theme, setTheme] = useState<"paper" | "midnight">("paper");
  const t = TEMPLATES[template];
  const { layout, error } = useMemo(() => { try { return { layout: resolveHouseLayout(t.spec), error: null }; } catch (e) { return { layout: null, error: (e as Error).message }; } }, [t]);
  const rig = useRef<PartRig | null>(null);
  const create = useCallback(() => createHouse3D(t.spec), [t]);
  const onAsset = useCallback((a: HeroAsset) => { rig.current?.dispose(); rig.current = createPartRig(a.parts); }, []);
  const hidden = useMemo(() => Object.fromEntries((layout?.parts ?? []).filter(p => /^roof$|^attic\.|^solar\.|^chimney$|^structure\.ceiling$|^hvac\.(supply|return)-duct$|^hvac\.registers$|^hvac\.air-handler$/.test(p.id)
    || (storey === 0 && layout!.dims.storeys > 1 && (p.id === "structure.floor-2" || (p.id.startsWith("room.") && layout!.interior?.rooms.find(r => `room.${r.id}` === p.id)?.storey === 1) || layout!.interior?.partitions.some(q => q.id === p.id && q.storey === 1))))
    .map(p => [p.id, { visible: false }])), [layout, storey]);
  const onPose = useCallback((a: HeroAsset, s: HeroActionState) => { rig.current?.apply(hidden, () => a.pose?.(s)); }, [hidden]);
  const rooms = layout?.interior?.rooms.filter(r => r.storey === storey) ?? [];

  return <Page kicker="House Math · Interiors" title="Customizable floor plans, furniture and yards"
    intro={<>Rooms are rectangles that tile the footprint (meters or fractions); walls, doors and closets are derived from shared edges and connections.
      The default generator is one option — author your own plan, edit the generated one with a function, or override furniture per room.
      The 2D plan and the 3D build come from the identical data.</>}>
    <Row label="Template">{Object.entries(TEMPLATES).map(([k, v]) => <Button key={k} active={template === k} onClick={() => { setTemplate(k); setStorey(0); }} title={v.describe}>{v.label}</Button>)}</Row>
    <p style={{ margin: 0, color: ink.sub }}>{t.describe}</p>
    {error ? <p role="alert" style={{ color: ink.warn }}>{error}</p> : null}
    {layout ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(520px, 1fr))", gap: 14 }}>
      <Panel title={`Floor plan · storey ${storey + 1}`}>
        <div style={{ borderRadius: 10, overflow: "hidden" }}><HouseFloorPlan2D layout={layout} storey={storey} theme={theme} furniture={furniture} devices={devices} /></div>
        <Row label="Show">
          {layout.dims.storeys > 1 ? Array.from({ length: layout.dims.storeys }, (_, s) => <Button key={s} small active={storey === s} onClick={() => setStorey(s)}>{`Floor ${s + 1}`}</Button>) : null}
          <Button small active={furniture} onClick={() => setFurniture(f => !f)}>Furniture</Button>
          <Button small active={devices} onClick={() => setDevices(d => !d)}>Lights & outlets</Button>
          <Button small active={theme === "midnight"} onClick={() => setTheme(x => x === "paper" ? "midnight" : "paper")}>Dark</Button>
        </Row>
      </Panel>
      <Panel title="Same plan in 3D (dollhouse)">
        <div style={{ borderRadius: 10, overflow: "hidden" }}>
          <HeroAssetViewer key={template} createAsset={create} width={1100} height={760} azimuth={18} elevation={58} zoom={1.25} onAsset={onAsset} onPose={onPose} ariaLabel={`${t.label} dollhouse`} />
        </div>
      </Panel>
    </div> : null}
    {layout?.interior ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: 14 }}>
      <Panel title="Spec">
        <pre style={{ margin: 0, fontFamily: mono, fontSize: 12, color: ink.sub, whiteSpace: "pre-wrap", maxHeight: 260, overflow: "auto" }}>{t.code}</pre>
      </Panel>
      <Panel title={`Rooms · ${rooms.length}`}>
        <div style={{ display: "grid", gap: 3, fontSize: 13 }}>
          {rooms.map(r => <div key={r.id} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <span>{r.label} <span style={{ color: ink.dim, fontFamily: mono, fontSize: 11 }}>room.{r.id}</span></span>
            <span style={{ color: ink.sub }}>{`${r.rects.reduce((s, q) => s + (q.x1 - q.x0) * (q.z1 - q.z0), 0).toFixed(1)} m² · ${layout.interior!.furnishings.filter(f => f.roomId === r.id).length} items`}</span>
          </div>)}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <Chip>{`${layout.interior.partitions.length} walls`}</Chip><Chip>{`${layout.interior.partitions.reduce((n, p) => n + p.doors.length, 0)} doors`}</Chip>
          <Chip>{`${layout.interior.electrical.length} devices`}</Chip><Chip>{`${layout.interior.yard.length} yard items`}</Chip>
          {layout.interior.diagnostics.length ? layout.interior.diagnostics.map((d, i) => <Chip key={i} tone={ink.warn}>{d.message}</Chip>) : <Chip tone={ink.accent}>no diagnostics</Chip>}
        </div>
      </Panel>
    </div> : null}
  </Page>;
}

const meta = {
  title: "Home/Interior Plans", id: "house-math-interior-plans", component: InteriorPlans, parameters: { layout: "fullscreen" },
  argTypes: { template: { control: "select", options: Object.keys(TEMPLATES) } },
} satisfies Meta<typeof InteriorPlans>;
export default meta;
export const Plans: StoryObj<typeof meta> = { args: { template: "auto" } };
