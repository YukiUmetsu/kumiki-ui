import { useCallback, useMemo, useRef, useState } from "react";
import type { Object3D } from "three";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { HeroAssetViewer } from "../../registry/craft/hero-viewer";
import type { HeroView } from "../../registry/craft/hero-viewer";
import type { HeroAsset } from "../../registry/craft/hero-asset";
import type { HeroActionState } from "../../registry/craft/hero-action";
import { createPartRig } from "../../registry/craft/part-rig";
import type { PartPoses, PartRig } from "../../registry/craft/part-rig";
import { createHouse3D } from "../../registry/domains/home-3d";
import type { HouseAsset } from "../../registry/domains/home-3d";
import { createHomeEquipment3D } from "../../registry/domains/home-equipment-3d";
import { HOUSE_PRESETS } from "../../registry/domains/home-model";
import { compileMechanism, evaluateMechanism } from "../../registry/visual/mechanism-sequence";
import type { MechanismSpec } from "../../registry/visual/mechanism-sequence";
import { createMechanismRig } from "../../registry/visual/mechanism-sequence-three";
import type { MechanismRig } from "../../registry/visual/mechanism-sequence-three";
import { Button, Chip, Page, Panel, Row, Slider, ink, mono, useFramePlayer } from "./house-ui";

const DOLLHOUSE = /^roof$|^attic\.|^solar\.|^chimney$|^structure\.ceiling$|^hvac\.(supply|return)-duct$|^hvac\.registers$|^hvac\.air-handler$|^plumbing\./;
const declared = (id: string, label: string) => ({ id, label, motion: { type: "declared" as const } });

const DEMOS: Record<string, { label: string; describe: string; create: () => HeroAsset; view: HeroView; hide?: RegExp; spec: MechanismSpec }> = {
  condenser: {
    label: "Condenser start-up", describe: "The contactor closes (status light), the fan spins up to its real 1,075 rpm, runs and coasts down. On screen the fan turns at 12% of that rate to avoid strobing at 30 fps, and the panel says so.",
    create: () => createHomeEquipment3D({ kind: "condenser" }), view: { azimuth: 210, elevation: 32, zoom: 1.15 },
    spec: { id: "condenser-start", joints: [
      { id: "unit.status-light", label: "Status light", motion: { type: "toggle" } },
      { id: "unit.fan", label: "Condenser fan", motion: { type: "spin", axis: [0, 1, 0], rpm: 1075, visualScale: .12, spinUp: 45, spinDown: 70 } },
    ], operations: [
      { id: "contactor", joint: "unit.status-light", at: 12, duration: 6, to: "on", label: "Thermostat calls for cooling: the contactor closes" },
      { id: "fan-up", joint: "unit.fan", after: "contactor", delay: 8, to: "on", label: "Fan spins up" },
      { id: "fan-down", joint: "unit.fan", after: "fan-up", delay: 90, to: "off", label: "Setpoint reached: the fan coasts down" },
      { id: "light-off", joint: "unit.status-light", after: "fan-down", duration: 6, to: "off", label: "Off" },
    ] },
  },
  tankless: {
    label: "Tankless heater valves", describe: "Quarter-turn isolation valves open in dependency order (gas, then cold supply, then hot outlet), then the display wakes. The shutdown reverses the order. Each handle is its own pivot with a declared motion.",
    create: () => createHomeEquipment3D({ kind: "tankless-water-heater" }), view: { azimuth: 18, elevation: 6, zoom: 2.3, target: [0, 1.2, .05] },
    spec: { id: "tankless-commission", joints: [
      declared("unit.valve-gas", "Gas valve"), declared("unit.valve-cold", "Cold supply valve"), declared("unit.valve-hot", "Hot outlet valve"),
      { id: "unit.display", label: "Display", motion: { type: "toggle" } },
    ], operations: [
      { id: "gas", joint: "unit.valve-gas", at: 15, duration: 18, to: "open", label: "Open the gas supply" },
      { id: "cold", joint: "unit.valve-cold", after: "gas", delay: 10, duration: 18, to: "open", label: "Open the cold water supply" },
      { id: "hot", joint: "unit.valve-hot", after: "cold", delay: 10, duration: 18, to: "open", label: "Open the hot outlet" },
      { id: "display", joint: "unit.display", after: "hot", delay: 8, duration: 10, to: "on", label: "Power on: the display wakes" },
      { id: "display-off", joint: "unit.display", after: "display", delay: 50, duration: 8, to: "off", label: "Shut down: display off" },
      { id: "hot-close", joint: "unit.valve-hot", after: "display-off", delay: 6, duration: 16, to: "close" },
      { id: "cold-close", joint: "unit.valve-cold", after: "hot-close", delay: 6, duration: 16, to: "close" },
      { id: "gas-close", joint: "unit.valve-gas", after: "cold-close", delay: 6, duration: 16, to: "close", label: "Gas closed last" },
    ] },
  },
  kitchen: {
    label: "Kitchen appliances", describe: "Declared door and drawer motions in a real house interior, chained with `after`: dishwasher, cabinet, fridge doors and freezer, oven, then everything closes in reverse.",
    create: () => createHouse3D(HOUSE_PRESETS.cottage), hide: DOLLHOUSE, view: { azimuth: 186, elevation: 46, zoom: 3.4, target: [2.6, .7, 2.6] },
    spec: { id: "kitchen-tour", joints: [
      declared("furnish.kitchen.dishwasher.door", "Dishwasher door"), declared("furnish.kitchen.base-cabinets-1.door", "Sink-base door"),
      declared("furnish.kitchen.fridge.door-left", "Fridge door (left)"), declared("furnish.kitchen.fridge.door-right", "Fridge door (right)"),
      declared("furnish.kitchen.fridge.freezer", "Freezer drawer"), declared("furnish.kitchen.range.oven-door", "Oven door"),
    ], operations: [
      { id: "dw", joint: "furnish.kitchen.dishwasher.door", at: 15, duration: 26, to: "open", label: "Dishwasher door drops open" },
      { id: "sink", joint: "furnish.kitchen.base-cabinets-1.door", after: "dw", duration: 20, to: "open", label: "Sink-base cabinet" },
      { id: "fl", joint: "furnish.kitchen.fridge.door-left", after: "sink", duration: 24, to: "open", label: "Fridge doors" },
      { id: "fr", joint: "furnish.kitchen.fridge.door-right", after: "sink", delay: 4, duration: 24, to: "open" },
      { id: "fz", joint: "furnish.kitchen.fridge.freezer", after: ["fl", "fr"], duration: 20, to: "open", label: "Freezer drawer slides out" },
      { id: "oven", joint: "furnish.kitchen.range.oven-door", after: "fz", duration: 24, to: "open", label: "Oven door" },
      { id: "close-oven", joint: "furnish.kitchen.range.oven-door", after: "oven", delay: 30, duration: 20, to: "close", label: "Everything closes in reverse" },
      { id: "close-fz", joint: "furnish.kitchen.fridge.freezer", after: "close-oven", duration: 16, to: "close" },
      { id: "close-fl", joint: "furnish.kitchen.fridge.door-left", after: "close-fz", duration: 20, to: "close" },
      { id: "close-fr", joint: "furnish.kitchen.fridge.door-right", after: "close-fz", duration: 20, to: "close" },
      { id: "close-sink", joint: "furnish.kitchen.base-cabinets-1.door", after: ["close-fl", "close-fr"], duration: 16, to: "close" },
      { id: "close-dw", joint: "furnish.kitchen.dishwasher.door", after: "close-sink", duration: 22, to: "close" },
    ] },
  },
};

function MechanismDemo({ demo: initial }: { demo: string }) {
  const [key, setKey] = useState(initial);
  const demo = DEMOS[key];
  const plan = useMemo(() => compileMechanism(demo.spec), [demo]);
  const duration = plan.durationFrames + 30;
  const player = useFramePlayer(duration, { loop: true, autoplay: true });
  const mech = useRef<MechanismRig | null>(null);
  const hideRig = useRef<PartRig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const create = useCallback(() => demo.create(), [demo]);
  const hidden: PartPoses = useMemo(() => ({}), []);
  const onAsset = useCallback((a: HeroAsset) => {
    const parts = new Map<string, Object3D>([...a.parts, ...((a as HouseAsset).moving ?? new Map())]);
    try { mech.current = createMechanismRig(parts, plan); setError(null); } catch (e) { mech.current = null; setError((e as Error).message); }
    hideRig.current?.dispose();
    hideRig.current = demo.hide ? createPartRig(a.parts) : null;
    if (demo.hide) for (const id of a.parts.keys()) if (demo.hide.test(id)) (hidden as Record<string, { visible: boolean }>)[id] = { visible: false };
  }, [plan, demo, hidden]);
  const onPose = useCallback((a: HeroAsset, s: HeroActionState) => {
    const base = () => { a.pose?.({ id: null, frame: 0 }); mech.current?.apply(s.frame); };
    if (hideRig.current) hideRig.current.apply(hidden, base); else base();
  }, [hidden]);
  const f = evaluateMechanism(plan, player.frame);
  return <Page kicker="House Math · Mechanisms" title="MechanismSequence"
    intro={<>Coordinated operations on an assembly's moving parts: rotations, slides, declared door and drawer motions, continuous spins with spin-up and coast-down, and on/off toggles. Operations are chained with <code>after</code>. Cycles and unknown joints fail; limit violations and overlaps are reported. Spin phase is integrated exactly, so any frame seeks to the same pose.</>}>
    <Row label="Mechanism">{Object.entries(DEMOS).map(([k, v]) => <Button key={k} active={key === k} title={v.describe} onClick={() => { setKey(k); player.restart(); }}>{v.label}</Button>)}</Row>
    <p style={{ margin: 0, color: ink.sub }}>{demo.describe}</p>
    <Row label="Playback">
      <Button small active={player.playing} onClick={() => (player.playing ? player.pause() : player.resume())}>{player.playing ? "Pause" : "Play"}</Button>
      <div style={{ minWidth: 340, flex: 1 }}><Slider label="Frame" value={player.frame} min={0} max={duration - 1} onChange={player.seek} /></div>
    </Row>
    {error ? <p role="alert" style={{ color: ink.warn }}>{error}</p> : null}
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 380px", gap: 14, alignItems: "start" }}>
      <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", border: `1px solid ${ink.line}` }}>
        <HeroAssetViewer key={key} createAsset={create} width={1280} height={760} {...demo.view} action="mechanism" actionFrame={player.frame} onAsset={onAsset} onPose={onPose} ariaLabel={`${demo.label}: ${f.labels.join(", ") || "at rest"}`} />
        {f.labels.length ? <div style={{ position: "absolute", left: 16, bottom: 14, padding: "8px 12px", borderRadius: 8, background: "rgba(12,16,21,.8)", color: ink.text, fontSize: 15 }}>{f.labels.join(" · ")}</div> : null}
      </div>
      <Panel title="Operations">
        {plan.operations.map(o => <div key={o.id} style={{ fontSize: 12.5, fontFamily: mono, color: f.active.includes(o.id) ? ink.text : player.frame >= o.end ? ink.dim : ink.sub, borderLeft: `3px solid ${f.active.includes(o.id) ? ink.accent : ink.line}`, paddingLeft: 8 }}>
          {`${o.start}–${o.end}  ${o.id} → ${typeof o.to === "number" ? o.to : o.to}`}{o.after ? <span style={{ color: ink.dim }}>{`  after ${[o.after].flat().join(", ")}`}</span> : null}
        </div>)}
        <div style={{ fontFamily: mono, fontSize: 12, color: ink.sub, lineHeight: 1.6 }}>
          {Object.entries(f.joints).map(([id, j]) => <div key={id}>{`${plan.joints.get(id)?.label ?? id}: ${j.rpm !== undefined ? `${Math.round(j.rpm)} rpm (real)` : j.value.toFixed(2)}${j.moving ? " · moving" : ""}`}</div>)}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{plan.diagnostics.length ? plan.diagnostics.map((d, i) => <Chip key={i} tone={d.severity === "error" ? ink.warn : ink.dim}>{`${d.code}: ${d.message}`}</Chip>) : <Chip tone={ink.accent}>no diagnostics</Chip>}</div>
      </Panel>
    </div>
  </Page>;
}

const meta = {
  title: "Asset motion and states/Mechanism Sequence", id: "house-math-mechanism-sequence", component: MechanismDemo, parameters: { layout: "fullscreen" },
  argTypes: { demo: { control: "inline-radio", options: Object.keys(DEMOS) } },
} satisfies Meta<typeof MechanismDemo>;
export default meta;
export const Mechanisms: StoryObj<typeof meta> = { args: { demo: "condenser" } };
