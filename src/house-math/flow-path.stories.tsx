import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { HeroAssetViewer } from "../../registry/craft/hero-viewer";
import type { HeroAsset } from "../../registry/craft/hero-asset";
import type { HeroActionState } from "../../registry/craft/hero-action";
import { createPartRig } from "../../registry/craft/part-rig";
import type { PartPoses, PartRig } from "../../registry/craft/part-rig";
import { createHouse3D } from "../../registry/domains/home-3d";
import type { HouseAsset } from "../../registry/domains/home-3d";
import { HOUSE_FLOW_COLORS, HOUSE_PRESETS, houseFlowSpecs, resolveHouseLayout } from "../../registry/domains/home-model";
import type { HouseMedium, HousePresetName } from "../../registry/domains/home-model";
import { createMotionPath } from "../../registry/motion/paths";
import { compileFlowPath, evaluateFlowPath } from "../../registry/visual/flow-path";
import type { FlowPathPlan, FlowStyle } from "../../registry/visual/flow-path";
import { FlowPathSvg } from "../../registry/visual/flow-path-react";
import { createFlowPathThree } from "../../registry/visual/flow-path-three";
import type { FlowPathThree } from "../../registry/visual/flow-path-three";
import { Button, Chip, Page, Panel, Row, font, ink, mono, useFramePlayer } from "./house-ui";

const STYLES: FlowStyle[] = ["arrows", "streaks", "particles", "ribbon", "pulse"];
const SYSTEMS: Record<string, { label: string; media: HouseMedium[]; view: { azimuth: number; elevation: number } }> = {
  hvac: { label: "Heating & cooling", media: ["supply-air", "return-air", "refrigerant"], view: { azimuth: 34, elevation: 30 } },
  plumbing: { label: "Water supply", media: ["cold-water", "hot-water"], view: { azimuth: -36, elevation: 26 } },
  rain: { label: "Roof drainage", media: ["rain"], view: { azimuth: 38, elevation: 18 } },
};
const TOTAL = 240;

function envelopePoses(system: string, parts: readonly { id: string }[]): PartPoses {
  const poses: Record<string, { opacity?: number; visible?: boolean }> = {};
  if (system === "rain") return { "roof.gutters": { opacity: .35 } };
  for (const p of parts) {
    if (/^wall\.[a-z]+$|^trim$|^structure\.ceiling$|^chimney$|^openings?/.test(p.id)) poses[p.id] = { opacity: .1 };
    if (/^roof\.(shingles|underlayment|decking|ridge-cap|trim|gutters|framing)$/.test(p.id) || p.id === "attic.insulation") poses[p.id] = { visible: false };
    if (p.id === "site.ground" || p.id === "foundation") poses[p.id] = { opacity: .35 };
    if (/^hvac\.(supply-duct|return-duct|lineset)$/.test(p.id)) poses[p.id] = { opacity: .3 };
    if (p.id === "plumbing.supply") poses[p.id] = { opacity: .45 };
    if (/^structure\.floor-\d$/.test(p.id)) poses[p.id] = { opacity: .22 };
    if (p.id === "solar.array") poses[p.id] = { visible: false };
  }
  return poses;
}

function Flow3D({ preset: initial }: { preset: HousePresetName }) {
  const [preset, setPreset] = useState<HousePresetName>(initial);
  const [system, setSystem] = useState("hvac");
  const [style, setStyle] = useState<FlowStyle>("particles");
  const [reverse, setReverse] = useState(false);
  const player = useFramePlayer(TOTAL, { loop: true, autoplay: true });
  const layout = useMemo(() => resolveHouseLayout(HOUSE_PRESETS[preset]), [preset]);
  const flows = useMemo(() => houseFlowSpecs(layout, { media: SYSTEMS[system].media, style }), [layout, system, style]);
  const plans = useMemo(() => flows.map(f => ({ flow: f, plan: compileFlowPath({ ...f.spec,
    direction: reverse ? (f.spec.direction === "reverse" ? "forward" : "reverse") : f.spec.direction,
    jitter: style === "particles" ? { amount: Math.min(.05, f.medium === "rain" ? .2 : .05), seed: 11 } : undefined }) })), [flows, reverse, style]);
  const asset = useRef<HouseAsset | null>(null);
  const rig = useRef<PartRig | null>(null);
  const adapters = useRef<FlowPathThree[]>([]);
  const create = useCallback(() => createHouse3D(HOUSE_PRESETS[preset]), [preset]);
  const [ready, setReady] = useState(0);
  const onAsset = useCallback((a: HeroAsset) => {
    asset.current = a as HouseAsset;
    rig.current?.dispose(); rig.current = createPartRig(a.parts);
    setReady(r => r + 1);
  }, []);
  // (Re)create flow adapters whenever the flows change; they live inside the asset group.
  useEffect(() => {
    const a = asset.current;
    if (!a) return;
    const list = plans.map(({ flow }) => {
      const air = flow.medium.endsWith("air");
      const adapter = createFlowPathThree({ color: flow.color, style, size: flow.medium === "rain" ? .16 : air ? .2 : .13,
        trackRadius: air ? .045 : .024, trackOpacity: .32, capacity: 96, glow: 1 });
      a.group.add(adapter.object);
      return adapter;
    });
    adapters.current = list;
    return () => { for (const ad of list) { ad.object.removeFromParent(); ad.dispose(); } };
  }, [plans, style, ready]);
  useEffect(() => () => rig.current?.dispose(), []);
  const poses = useMemo(() => envelopePoses(system, layout.parts), [system, layout]);
  const onPose = useCallback((a: HeroAsset, s: HeroActionState) => {
    rig.current?.apply(poses, () => a.pose?.(s));
    plans.forEach(({ plan }, i) => adapters.current[i]?.update(evaluateFlowPath(plan, player.frame)));
  }, [poses, plans, player.frame]);
  const diag = plans.flatMap(({ plan }) => evaluateFlowPath(plan, player.frame).diagnostics).slice(0, 3);
  const media = [...new Set(flows.map(f => f.medium))];

  return <>
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 320px", gap: 14 }}>
      <div style={{ background: ink.panel, border: `1px solid ${ink.line}`, borderRadius: 14, overflow: "hidden" }}>
        <HeroAssetViewer key={preset} createAsset={create} width={1280} height={720} {...SYSTEMS[system].view} zoom={system === "rain" ? 1.25 : 1.15}
          action={system === "hvac" ? "condenser-run" : null} actionFrame={player.frame} onAsset={onAsset} onPose={onPose} ariaLabel={`${preset} ${SYSTEMS[system].label} flow`} />
      </div>
      <Panel title="Flows">
        {media.map(m => <div key={m} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
          <span style={{ width: 22, height: 6, borderRadius: 3, background: HOUSE_FLOW_COLORS[m] }} />{m}
          <span style={{ marginLeft: "auto", color: ink.dim, fontFamily: mono, fontSize: 11 }}>{flows.filter(f => f.medium === m).length} path{flows.filter(f => f.medium === m).length > 1 ? "s" : ""}</span>
        </div>)}
        <p style={{ margin: 0, fontSize: 12.5, color: ink.dim, lineHeight: 1.5 }}>Illustrative direction along the layout’s own duct and pipe routes. Speeds carry no physical meaning; no flow rates are shown.</p>
        {diag.length ? <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: ink.sub }}>{diag.map((d, i) => <li key={i}><code style={{ color: ink.warn }}>{d.code}</code> — {d.message}</li>)}</ul> : null}
      </Panel>
    </div>
    <Panel>
      <Row label="House">{(Object.keys(HOUSE_PRESETS) as HousePresetName[]).map(k => <Button key={k} active={preset === k} onClick={() => setPreset(k)}>{k}</Button>)}</Row>
      <Row label="System">{Object.entries(SYSTEMS).map(([k, v]) => <Button key={k} active={system === k} onClick={() => setSystem(k)}>{v.label}</Button>)}</Row>
      <Row label="Style">{STYLES.map(k => <Button key={k} active={style === k} onClick={() => setStyle(k)}>{k}</Button>)}</Row>
      <Row label="Direction"><Button active={!reverse} onClick={() => setReverse(false)}>As authored</Button><Button active={reverse} onClick={() => setReverse(true)}>Reversed</Button></Row>
      <Row label="Frame">
        <Button onClick={() => player.playing ? player.pause() : player.resume()}>{player.playing ? "Pause" : "Play"}</Button>
        <input type="range" aria-label="Frame" min={0} max={TOTAL - 1} value={player.frame} onChange={e => player.seek(Number(e.target.value))} style={{ flex: 1, minWidth: 200 }} />
        <span style={{ fontVariantNumeric: "tabular-nums", color: ink.sub, fontSize: 13, minWidth: 64 }}>{player.frame} / {TOTAL - 1}</span>
      </Row>
    </Panel>
  </>;
}

/* ------------------------------------------------------------------ 2D */

function useFlow2D(build: () => FlowPathPlan[], frame: number) {
  const plans = useMemo(build, []); // eslint-disable-line react-hooks/exhaustive-deps -- static demo paths
  return plans.map(p => evaluateFlowPath(p, frame));
}
function Box({ x, y, w, h, label, tone }: { x: number; y: number; w: number; h: number; label: string; tone: string }) {
  // Grow boxes around their center so 22px labels (≈14px on screen) keep generous padding.
  const gw = Math.max(w, label.length * 13 + 36), gh = Math.max(h, 46), gx = x + w / 2 - gw / 2, gy = y + h / 2 - gh / 2;
  return <g><rect x={gx} y={gy} width={gw} height={gh} rx={12} fill="#17212b" stroke={tone} strokeOpacity={.55} />
    <text x={x + w / 2} y={y + h / 2} textAnchor="middle" dominantBaseline="central" fill={ink.text} style={{ font: `600 22px ${font}` }}>{label}</text></g>;
}
function Schematics({ style, frame }: { style: FlowStyle; frame: number }) {
  const solar = useFlow2D(() => [
    compileFlowPath({ id: "sun-panel", path: [[70, 70], [190, 150]], style: "ribbon", speed: 60, spacing: 24, drawOnFrames: 30 }),
    compileFlowPath({ id: "panel-inverter", path: [[250, 190], [250, 250], [380, 250]], cornerRadius: 18, style, speed: 70, spacing: 26, drawOnFrames: 30, window: { startFrame: 20, endFrame: 100000 } }),
    compileFlowPath({ id: "inverter-meter", path: [[460, 250], [560, 250], [560, 150]], cornerRadius: 18, style, speed: 70, spacing: 26, drawOnFrames: 30, window: { startFrame: 40, endFrame: 100000 } }),
  ], frame);
  const belt = useFlow2D(() => [compileFlowPath({
    id: "conveyor", style: style === "ribbon" ? "ribbon" : "particles", speed: 55, spacing: 30, jitter: { amount: 3, seed: 5 },
    path: createMotionPath({ id: "loop", kind: "cubic", anchors: [
      { x: 60, y: 210, out: { x: 60, y: 90 } }, { x: 300, y: 90, in: { x: 180, y: 50 }, out: { x: 420, y: 130 } }, { x: 560, y: 210, in: { x: 560, y: 120 } }] }),
  })], frame);
  const cash = useFlow2D(() => [
    compileFlowPath({ id: "income", path: [[130, 80], [300, 80]], style: style === "particles" ? "streaks" : style, speed: 80, spacing: 34 }),
    compileFlowPath({ id: "saving", path: [[380, 105], [380, 150], [520, 150], [520, 190]], cornerRadius: 16, style: style === "particles" ? "streaks" : style, speed: 50, spacing: 34 }),
    compileFlowPath({ id: "spending", path: [[380, 105], [380, 150], [240, 150], [240, 190]], cornerRadius: 16, style: style === "particles" ? "streaks" : style, speed: 80, spacing: 34 }),
  ], frame);
  const card = (title: string, children: React.ReactNode) => <Panel title={title}><svg viewBox="0 0 620 300" style={{ width: "100%", height: "auto", background: "#0f161d", borderRadius: 10 }}>{children}</svg></Panel>;
  return <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 12 }}>
    {card("Solar power · ribbon + chosen style", <>
      <circle cx={60} cy={60} r={28} fill="#ffd24a" opacity={.9} />
      <Box x={170} y={150} w={160} h={40} label="PV array" tone="#ffd24a" /><Box x={380} y={230} w={80} h={40} label="Inverter" tone="#ffd24a" /><Box x={510} y={110} w={100} h={40} label="Meter" tone="#ffd24a" />
      {solar.map(f => <FlowPathSvg key={f.id} frame={f} color="#ffd24a" width={5} size={11} />)}
    </>)}
    {card("Conveyor · cubic MG1 MotionPath", <>
      <Box x={20} y={220} w={90} h={40} label="Intake" tone="#7cc4b4" /><Box x={510} y={220} w={100} h={40} label="Packing" tone="#7cc4b4" />
      {belt.map(f => <FlowPathSvg key={f.id} frame={f} color="#7cc4b4" width={10} size={13} trackOpacity={.18} />)}
    </>)}
    {card("Cash flow · streaks", <>
      <Box x={20} y={60} w={110} h={40} label="Income" tone="#6fd3a6" /><Box x={300} y={60} w={160} h={44} label="Account" tone="#6fd3a6" />
      <Box x={180} y={190} w={120} h={40} label="Spending" tone="#ee7480" /><Box x={460} y={190} w={120} h={40} label="Savings" tone="#6fd3a6" />
      {cash.map(f => <FlowPathSvg key={f.id} frame={f} color={f.id === "spending" ? "#ee7480" : "#6fd3a6"} width={5} size={11} />)}
    </>)}
  </div>;
}

function FlowPathDemo({ preset }: { preset: HousePresetName }) {
  const [style2d, setStyle2d] = useState<FlowStyle>("arrows");
  const player = useFramePlayer(TOTAL, { loop: true, autoplay: true });
  return <Page kicker="House Math · V04" title="FlowPath — illustrative flow along authored paths"
    intro={<>One grammar for 2D and 3D: <code>compileFlowPath</code> → <code>evaluateFlowPath(plan, frame)</code>, rendered by
      <code> FlowPathSvg</code> or <code>createFlowPathThree</code>. Frames are pure (random seeks equal playback), marker counts are capped,
      particle jitter is seeded per particle identity, and a “measured” magnitude without a source is flagged.</>}>
    <Flow3D preset={preset} />
    <Panel title="2D: three unrelated domains, same evaluator">
      <Row label="Style">{STYLES.map(k => <Button key={k} active={style2d === k} onClick={() => setStyle2d(k)}>{k}</Button>)}</Row>
      <div style={{ display: "flex", gap: 8 }}><Chip>{`frame ${player.frame}`}</Chip><Chip tone={ink.accent}>illustrative</Chip></div>
    </Panel>
    <Schematics style={style2d} frame={player.frame} />
  </Page>;
}

const meta = {
  title: "House Math/Flow Path", component: FlowPathDemo, parameters: { layout: "fullscreen" },
  argTypes: { preset: { control: "select", options: Object.keys(HOUSE_PRESETS) } },
} satisfies Meta<typeof FlowPathDemo>;
export default meta;
export const Systems: StoryObj<typeof meta> = { args: { preset: "cottage" } };
