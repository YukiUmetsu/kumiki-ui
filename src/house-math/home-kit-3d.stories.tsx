import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { HeroAssetViewer } from "../../registry/craft/hero-viewer";
import type { HeroAsset } from "../../registry/craft/hero-asset";
import type { HeroActionState } from "../../registry/craft/hero-action";
import { createPartRig } from "../../registry/craft/part-rig";
import type { PartPoses, PartRig } from "../../registry/craft/part-rig";
import { createHouse3D } from "../../registry/domains/home-3d";
import type { HouseAsset } from "../../registry/domains/home-3d";
import { HOUSE_PALETTES, HOUSE_PRESETS, housePartSubtree, resolveHouseLayout } from "../../registry/domains/home-model";
import type { HouseCondition, HousePaletteName, HousePart, HousePresetName } from "../../registry/domains/home-model";
import { Button, Chip, Page, Panel, Row, Slider, ink, mono, useFramePlayer } from "./house-ui";

type Visibility = "show" | "ghost" | "hide";
const VIEWS: Record<string, { label: string; describe: string; modes: (parts: readonly HousePart[]) => Record<string, Visibility> }> = {
  exterior: { label: "Exterior", describe: "Finished house.", modes: () => ({}) },
  cutaway: { label: "Front cutaway", describe: "Front wall and front roof surfaces removed: framing, insulation, attic and floors stay.", modes: () => ({
    "wall.front": "hide", "roof.shingles": "ghost", "roof.underlayment": "hide", "roof.decking": "hide", "roof.ridge-cap": "ghost", "trim": "ghost" }) },
  structure: { label: "Structure", describe: "Only framing, decking and foundation: what carries the loads.", modes: parts => Object.fromEntries(parts
    .filter(p => /\.(siding|insulation|drywall)$|^roof\.(shingles|underlayment|ridge-cap|trim|gutters)$|^attic\.insulation$|^trim$|^opening\.|^structure\.ceiling$/.test(p.id) && !/\.(sash|leaf|panels|glass)$/.test(p.id))
    .map(p => [p.id, "hide" as Visibility])) },
  systems: { label: "Systems", describe: "Envelope ghosted: ducts, line set, water heater and pipes.", modes: parts => Object.fromEntries(parts
    .filter(p => /^wall\.[a-z]+$|^roof$|^trim$|^structure\.ceiling$|^attic\.insulation$|^chimney$|^site\.ground$|^foundation$/.test(p.id))
    .map(p => [p.id, p.id.startsWith("roof") || p.id === "attic.insulation" ? "hide" as Visibility : "ghost" as Visibility])) },
};

function HomeKitExplorer({ preset: initialPreset }: { preset: HousePresetName }) {
  const [preset, setPreset] = useState<HousePresetName>(initialPreset);
  const [condition, setCondition] = useState<HouseCondition>("new");
  const [palette, setPalette] = useState<HousePaletteName | "preset">("preset");
  const [modes, setModes] = useState<Record<string, Visibility>>({});
  const [view, setView] = useState("exterior");
  const [azimuth, setAzimuth] = useState(32), [elevation, setElevation] = useState(16), [zoom, setZoom] = useState(1);
  const [focus, setFocus] = useState<string | null>(null);
  const [action, setAction] = useState<string | null>(null);
  const [asset, setAsset] = useState<HouseAsset | null>(null);
  const rig = useRef<PartRig | null>(null);

  const spec = useMemo(() => ({ ...HOUSE_PRESETS[preset], condition, ...(palette === "preset" ? {} : { palette }) }), [preset, condition, palette]);
  const layout = useMemo(() => resolveHouseLayout(spec), [spec]);
  const create = useCallback(() => createHouse3D(spec), [spec]);
  useEffect(() => { setModes({}); setView("exterior"); setFocus(null); setAction(null); }, [preset]);
  const onAsset = useCallback((a: HeroAsset) => {
    rig.current?.dispose();
    rig.current = createPartRig(a.parts);
    setAsset(a as HouseAsset);
  }, []);
  useEffect(() => () => rig.current?.dispose(), []);

  const spec_ = asset?.actions?.find(a => a.id === action);
  const player = useFramePlayer(spec_?.durationFrames ?? 1, { loop: spec_?.loop });
  const poses: PartPoses = useMemo(() => Object.fromEntries(Object.entries(modes).filter(([id]) => layout.parts.some(p => p.id === id))
    .map(([id, mode]) => [id, mode === "hide" ? { visible: false } : mode === "ghost" ? { opacity: .16 } : undefined])), [modes, layout]);
  const onPose = useCallback((a: HeroAsset, state: HeroActionState) => {
    if (rig.current) rig.current.apply(poses, () => a.pose?.(state)); else a.pose?.(state);
  }, [poses]);

  const focusPart = focus ? layout.parts.find(p => p.id === focus) : undefined;
  const target = focusPart ? [0, 1, 2].map(i => (focusPart.bounds.min[i] + focusPart.bounds.max[i]) / 2) as [number, number, number] : undefined;
  const focusZoom = focusPart ? Math.min(6, Math.max(1, Math.hypot(...layout.bounds.max.map((v, i) => v - layout.bounds.min[i])) /
    Math.max(.6, Math.hypot(...focusPart.bounds.max.map((v, i) => v - focusPart.bounds.min[i]))) * .55)) : 1;

  const setMode = (id: string, mode: Visibility) => setModes(m => ({ ...m, [id]: mode }));
  const applyView = (key: string) => { setView(key); setModes(VIEWS[key].modes(layout.parts)); };
  const tree = useMemo(() => {
    const top = layout.parts.filter(p => p.parentId === "house");
    return top.map(p => ({ part: p, children: housePartSubtree(layout, p.id).slice(1) }));
  }, [layout]);

  return <Page kicker="House Math · Home kit" title="Layered 3D house with separately animatable parts"
    intro={<>One renderer-neutral <code>HouseSpec</code> → validated layout → crafted 3D build. Every semantic part is its own named group:
      hide, ghost or focus any of them, play the built-in actions, or pose parts yourself with <code>createPartRig</code>.</>}>
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 340px", gap: 14 }}>
      <div style={{ display: "grid", gap: 14, alignContent: "start" }}>
        <div style={{ background: ink.panel, border: `1px solid ${ink.line}`, borderRadius: 14, overflow: "hidden" }}>
          <HeroAssetViewer createAsset={create} width={1280} height={720} azimuth={azimuth} elevation={elevation}
            zoom={focusPart ? focusZoom * zoom : zoom} target={target} action={action} actionFrame={player.frame}
            onAsset={onAsset} onPose={onPose} ariaLabel={`${preset} house, ${VIEWS[view].label.toLowerCase()} view`} />
        </div>
        <Panel>
          <Row label="Preset">{(Object.keys(HOUSE_PRESETS) as HousePresetName[]).map(k => <Button key={k} active={preset === k} onClick={() => setPreset(k)}>{k}</Button>)}</Row>
          <Row label="Condition">{(["new", "aged", "damaged"] as const).map(k => <Button key={k} active={condition === k} onClick={() => setCondition(k)}>{k}</Button>)}</Row>
          <Row label="Palette"><Button active={palette === "preset"} onClick={() => setPalette("preset")}>preset</Button>
            {(Object.keys(HOUSE_PALETTES) as HousePaletteName[]).map(k => <Button key={k} active={palette === k} onClick={() => setPalette(k)}>
              <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, background: HOUSE_PALETTES[k].siding, marginRight: 6, verticalAlign: -1 }} />{k}</Button>)}</Row>
          <Row label="View">{Object.entries(VIEWS).map(([k, v]) => <Button key={k} active={view === k} onClick={() => applyView(k)} title={v.describe}>{v.label}</Button>)}</Row>
          <Row label="Actions">
            <Button active={action === null} onClick={() => { setAction(null); player.pause(); }}>Rest</Button>
            {(asset?.actions ?? []).map(a => <Button key={a.id} active={action === a.id} title={a.meaning} onClick={() => { setAction(a.id); player.restart(); }}>{a.label}</Button>)}
          </Row>
          {spec_ ? <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Button onClick={() => player.playing ? player.pause() : player.resume()}>{player.playing ? "Pause" : "Play"}</Button>
            <input type="range" aria-label="Action frame" min={0} max={spec_.durationFrames - 1} value={player.frame} style={{ flex: 1 }} onChange={e => player.seek(Number(e.target.value))} />
            <span style={{ fontVariantNumeric: "tabular-nums", color: ink.sub, fontSize: 13, minWidth: 64 }}>{player.frame} / {spec_.durationFrames - 1}</span>
          </div> : null}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 8 }}>
            <Slider label="Orbit" value={azimuth} min={-180} max={180} onChange={setAzimuth} format={v => `${v}°`} />
            <Slider label="Elevation" value={elevation} min={-5} max={70} onChange={setElevation} format={v => `${v}°`} />
            <Slider label="Zoom" value={zoom} min={.7} max={3} step={.05} onChange={setZoom} format={v => `${v.toFixed(2)}×`} />
          </div>
        </Panel>
      </div>
      <Panel title={`Parts · ${layout.parts.length}`} style={{ maxHeight: 980, overflow: "auto" }}>
        <p style={{ margin: 0, fontSize: 12, color: ink.dim }}>Show · Ghost · Hide each semantic part; ◎ frames it.</p>
        {tree.map(({ part, children }) => <details key={part.id} open={part.id === "walls" || part.id === "roof"} style={{ borderTop: `1px solid ${ink.line}`, paddingTop: 6 }}>
          <summary style={{ cursor: "pointer", listStyle: "none" }}><PartRow part={part} mode={modes[part.id] ?? "show"} focused={focus === part.id}
            onMode={m => setMode(part.id, m)} onFocus={() => setFocus(f => f === part.id ? null : part.id)} strong /></summary>
          <div style={{ display: "grid", gap: 2, paddingLeft: 10 }}>
            {children.map(c => <PartRow key={c.id} part={c} mode={modes[c.id] ?? "show"} focused={focus === c.id}
              depth={c.id.split(".").length - part.id.split(".").length} onMode={m => setMode(c.id, m)} onFocus={() => setFocus(f => f === c.id ? null : c.id)} />)}
          </div>
        </details>)}
      </Panel>
    </div>
    <Panel title="Layout facts (from the renderer-neutral model)">
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Chip>{`${layout.dims.width} × ${layout.dims.depth} m`}</Chip><Chip>{`${layout.dims.storeys} storey${layout.dims.storeys > 1 ? "s" : ""}`}</Chip>
        <Chip>{`${Math.round(layout.dims.pitch * 180 / Math.PI)}° roof`}</Chip><Chip>{layout.spec.foundation ?? "slab"}</Chip>
        <Chip>{`${layout.openings.length} openings`}</Chip><Chip>{`${layout.anchors.length} anchors`}</Chip>
        <Chip>{`${layout.routes.length} service routes`}</Chip><Chip tone={ink.accent}>1 unit = 1 m</Chip>
      </div>
      <p style={{ margin: 0, fontSize: 13, color: ink.dim }}>Illustrative construction for explainers — not a structural, energy or code-compliance claim.</p>
    </Panel>
  </Page>;
}

function PartRow({ part, mode, onMode, onFocus, focused, depth = 0, strong }: { part: HousePart; mode: Visibility; onMode: (m: Visibility) => void; onFocus: () => void; focused: boolean; depth?: number; strong?: boolean }) {
  return <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 0", paddingLeft: depth * 8 }}>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 13, fontWeight: strong ? 600 : 450, color: mode === "hide" ? ink.dim : ink.text }}>{part.label}</div>
      <div style={{ fontSize: 11, color: ink.dim, fontFamily: mono, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{part.id}</div>
    </div>
    {(["show", "ghost", "hide"] as const).map(m => <Button key={m} small active={mode === m} onClick={() => onMode(m)} title={`${m} ${part.id}`}>{m[0].toUpperCase()}</Button>)}
    <Button small active={focused} onClick={onFocus} title={`Frame ${part.id}`}>◎</Button>
  </div>;
}

const meta = {
  title: "House Math/Home Kit 3D", component: HomeKitExplorer, parameters: { layout: "fullscreen" },
  argTypes: { preset: { control: "select", options: Object.keys(HOUSE_PRESETS) } },
} satisfies Meta<typeof HomeKitExplorer>;
export default meta;
export const Explorer: StoryObj<typeof meta> = { args: { preset: "cottage" } };
