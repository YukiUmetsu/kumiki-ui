import { useCallback, useMemo, useRef, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box3, Box3Helper, BufferGeometry, Color, Float32BufferAttribute, Group, Points, PointsMaterial, Vector3 } from "three";
import { HeroAssetViewer } from "../../registry/craft/hero-viewer";
import type { HeroAsset } from "../../registry/craft/hero-asset";
import type { HeroActionState } from "../../registry/craft/hero-action";
import { heroCatalogEntry } from "../../registry/domains/hero-catalog";
import { createHouse3D, inspectHouse3D } from "../../registry/domains/home-3d";
import type { HouseAsset } from "../../registry/domains/home-3d";
import { HOUSE_PRESETS } from "../../registry/domains/home-model";
import { inspectHeroAsset } from "../../registry/visual/inspectable-asset-three";
import { validateInspectableDefinition } from "../../registry/visual/inspectable-asset";
import type { InspectableAsset } from "../../registry/visual/inspectable-asset";
import { Button, Chip, Page, Panel, Row, ink, mono } from "./house-ui";

type FixtureId = "house" | "bank" | "laptop";
const FIXTURES: Record<FixtureId, { label: string; note: string; create: () => HeroAsset; inspect: (a: HeroAsset) => InspectableAsset; view: { azimuth: number; elevation: number } }> = {
  house: { label: "House (home kit)", note: "Layout-backed metadata: roles, clippable layers, labeled anchors and flow ports.",
    create: () => createHouse3D({ ...HOUSE_PRESETS.cottage, site: false }), inspect: a => inspectHouse3D(a as HouseAsset), view: { azimuth: 32, elevation: 16 } },
  bank: { label: "Bank (existing hero)", note: "Unmodified HeroAsset: parts come straight from asset.parts.",
    create: () => heroCatalogEntry("bank").create({ id: "inspect-bank" }), inspect: a => inspectHeroAsset(a), view: { azimuth: 28, elevation: 12 } },
  laptop: { label: "Laptop (existing hero)", note: "Unmodified HeroAsset, millimeter-scale world units.",
    create: () => heroCatalogEntry("laptop").create({ id: "inspect-laptop" }), inspect: a => inspectHeroAsset(a), view: { azimuth: 30, elevation: 20 } },
};

const BROKEN = {
  id: "broken-fixture", dimension: 3 as const, revision: "r1",
  parts: [{ id: "body" }, { id: "body" }, { id: "lid", parentId: "hinge" }],
  anchors: [{ id: "lid.edge", partId: "lid-panel", kind: "label" as const }],
  capabilities: { sectioning: "clip" as const, explodable: false, canGhost: false, flowPorts: true, stateful: true },
};

function InspectableDemo({ fixture: initial }: { fixture: FixtureId }) {
  const [fixture, setFixture] = useState<FixtureId>(initial);
  const [inspect, setInspect] = useState<InspectableAsset | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const overlay = useRef<{ group: Group; box: Box3Helper; dots: Points } | null>(null);
  const create = useCallback(() => FIXTURES[fixture].create(), [fixture]);
  const onAsset = useCallback((a: HeroAsset) => {
    const ins = FIXTURES[fixture].inspect(a);
    setInspect(ins);
    setSelected(ins.parts.find(p => /condenser$|door-leaf|screen|lid/.test(p.id))?.id ?? ins.parts[1]?.id ?? null);
    const group = new Group(); group.name = "inspection-overlay";
    const box = new Box3Helper(new Box3(), new Color(ink.accent));
    const dots = new Points(new BufferGeometry(), new PointsMaterial({ color: ink.warn, size: 10, sizeAttenuation: false, depthTest: false }));
    group.add(box, dots); a.group.add(group);
    overlay.current = { group, box, dots };
  }, [fixture]);
  const onPose = useCallback((a: HeroAsset, state: HeroActionState) => {
    a.pose?.(state);
    const o = overlay.current;
    if (!o || !inspect || !selected) return;
    const b = inspect.getBounds(selected, 0);
    o.box.box.set(new Vector3(...b.min), new Vector3(...b.max));
    const anchors = inspect.anchors.filter(x => x.partId === selected || inspect.subtree(selected).some(p => p.id === x.partId));
    const pos = anchors.flatMap(x => [...inspect.getAnchor(x.id, 0).position]);
    o.dots.geometry.dispose();
    o.dots.geometry = new BufferGeometry().setAttribute("position", new Float32BufferAttribute(pos, 3));
  }, [inspect, selected]);

  const part = inspect && selected ? inspect.getPart(selected) : null;
  const bounds = inspect && selected ? inspect.getBounds(selected, 0) : null;
  const size = bounds ? bounds.max.map((v, i) => v - bounds.min[i]) : null;
  const unit = inspect?.metersPerUnit ?? 1;
  const diagnostics = useMemo(() => validateInspectableDefinition(BROKEN), []);
  const parts = inspect?.parts ?? [];

  return <Page kicker="House Math · V01" title="InspectableAsset — one interface for every asset"
    intro={<>Parts, parent tree, measured per-frame bounds, anchors, states and capabilities through the same calls —
      for the new house and for existing hero assets that were not changed. Teal box = <code>getBounds(part, frame)</code>,
      amber points = <code>getAnchor(id, frame)</code>.</>}>
    <Row label="Fixture">{(Object.keys(FIXTURES) as FixtureId[]).map(k => <Button key={k} active={fixture === k} onClick={() => { setFixture(k); setInspect(null); }}>{FIXTURES[k].label}</Button>)}</Row>
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 360px", gap: 14 }}>
      <div style={{ display: "grid", gap: 14, alignContent: "start" }}>
        <div style={{ background: ink.panel, border: `1px solid ${ink.line}`, borderRadius: 14, overflow: "hidden" }}>
          <HeroAssetViewer key={fixture} createAsset={create} width={1280} height={720} {...FIXTURES[fixture].view}
            onAsset={onAsset} onPose={onPose} ariaLabel={`${FIXTURES[fixture].label} with inspection overlay`} />
        </div>
        <Panel title="Interface readout">
          <p style={{ margin: 0, color: ink.sub, fontSize: 14 }}>{FIXTURES[fixture].note}</p>
          {inspect ? <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Chip>{`id ${inspect.id}`}</Chip><Chip>{`${inspect.dimension}D`}</Chip><Chip>{`${inspect.parts.length} parts`}</Chip>
            <Chip>{`${inspect.anchors.length} anchors`}</Chip><Chip>{`states: ${inspect.listStates().slice(0, 4).join(", ") || "none"}${inspect.listStates().length > 4 ? "…" : ""}`}</Chip>
            <Chip tone={ink.accent}>{`sectioning: ${inspect.capabilities.sectioning}`}</Chip>
            {Object.entries(inspect.capabilities).filter(([k]) => k !== "sectioning").map(([k, v]) => <Chip key={k} tone={v ? ink.accent : undefined}>{`${k}: ${v ? "yes" : "no"}`}</Chip>)}
            <Chip>{`1 unit = ${unit >= 1 ? unit + " m" : Math.round(unit * 1000) + " mm"}`}</Chip>
          </div> : <p role="status" style={{ margin: 0, color: ink.dim }}>Building…</p>}
          {part && bounds && size ? <div style={{ fontFamily: mono, fontSize: 12.5, color: ink.text, lineHeight: 1.7 }}>
            <div>getPart(<span style={{ color: ink.accent }}>"{part.id}"</span>) → {part.label ?? part.id}{part.role ? ` · ${part.role}` : ""}{part.parentId ? ` · parent ${part.parentId}` : ""}</div>
            <div>getBounds(…, 0) → size {size.map(v => (v * unit).toFixed(2)).join(" × ")} m</div>
            <div>subtree → {inspect!.subtree(part.id).length} parts · children → {inspect!.children(part.id).length}</div>
          </div> : null}
        </Panel>
        <Panel title="Honest failure: a deliberately broken definition">
          <ul style={{ margin: 0, paddingLeft: 18, color: ink.sub, fontSize: 13.5, lineHeight: 1.6 }}>
            {diagnostics.map((d, i) => <li key={i}><code style={{ color: ink.warn }}>{d.code}</code> — {d.message}</li>)}
          </ul>
        </Panel>
      </div>
      <Panel title={`Parts · ${parts.length}`} style={{ maxHeight: 900, overflow: "auto" }}>
        {parts.map(p => <button key={p.id} type="button" onClick={() => setSelected(p.id)} aria-pressed={selected === p.id}
          style={{ textAlign: "left", background: selected === p.id ? "#1d2a33" : "transparent", border: "none", borderRadius: 6, padding: "4px 6px", cursor: "pointer", color: ink.text,
            paddingLeft: 6 + Math.max(0, (p.id.split(".").length - 1)) * 8 }}>
          <div style={{ fontSize: 13 }}>{p.label ?? p.id}</div>
          <div style={{ fontSize: 11, color: ink.dim, fontFamily: mono }}>{p.id}</div>
        </button>)}
      </Panel>
    </div>
  </Page>;
}

const meta = {
  title: "House Math/Inspectable Asset", component: InspectableDemo, parameters: { layout: "fullscreen" },
  argTypes: { fixture: { control: "select", options: Object.keys(FIXTURES) } },
} satisfies Meta<typeof InspectableDemo>;
export default meta;
export const ThreeFixtures: StoryObj<typeof meta> = { args: { fixture: "house" } };
