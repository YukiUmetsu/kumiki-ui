import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { HeroAssetViewer } from "../../registry/craft/hero-viewer";
import type { HeroAsset } from "../../registry/craft/hero-asset";
import type { HeroActionState } from "../../registry/craft/hero-action";
import { createPartRig } from "../../registry/craft/part-rig";
import type { PartPose3D, PartPoses, PartRig } from "../../registry/craft/part-rig";
import { useWalkCamera } from "../../registry/craft/walk-camera";
import { createHouse3D, inspectHouse3D } from "../../registry/domains/home-3d";
import type { HouseAsset } from "../../registry/domains/home-3d";
import { HOUSE_PALETTES, HOUSE_PRESETS, housePartSubtree, resolveHouseLayout } from "../../registry/domains/home-model";
import type { HouseCondition, HousePaletteName, HousePart, HousePresetName } from "../../registry/domains/home-model";
import { planHouseTour } from "../../registry/domains/home-interior-model";
import { houseWalkMap } from "../../registry/domains/home-walk";
import { compileSectionReveal, evaluateSectionReveal } from "../../registry/visual/section-reveal";
import { createSectionRevealThree } from "../../registry/visual/section-reveal-three";
import type { SectionRevealThree } from "../../registry/visual/section-reveal-three";
import { Button, Chip, Page, Panel, Row, Slider, ink, mono, useFramePlayer } from "./house-ui";

type Visibility = "show" | "ghost" | "hide";
type CameraMode = "orbit" | "walk" | "tour";
const roofish = (id: string) => /^roof(\.|$)|^attic\.|^solar\./.test(id);
const VIEWS: Record<string, { label: string; describe: string; modes: (parts: readonly HousePart[]) => Record<string, Visibility>; plan?: number; orbit?: { elevation: number } }> = {
  exterior: { label: "Exterior", describe: "Finished house and yards.", modes: () => ({}) },
  dollhouse: { label: "Dollhouse", describe: "Roof, attic and top ceiling removed: look down into the rooms.", orbit: { elevation: 52 },
    modes: parts => Object.fromEntries(parts.filter(p => roofish(p.id) || p.id === "structure.ceiling" || p.id === "chimney" || /\.registers$|^hvac\.(supply|return)-duct$/.test(p.id)).map(p => [p.id, "hide" as Visibility])) },
  plan1: { label: "Plan · ground", describe: "A capped section 1.3 m above the ground floor (SectionReveal).", plan: 0, orbit: { elevation: 62 }, modes: () => ({}) },
  plan2: { label: "Plan · upper", describe: "A capped section through the upper floor.", plan: 1, orbit: { elevation: 62 }, modes: () => ({}) },
  cutaway: { label: "Front cutaway", describe: "Front wall and front roof removed.", modes: () => ({
    "wall.front": "hide", "roof.shingles": "ghost", "roof.underlayment": "hide", "roof.decking": "hide", "roof.ridge-cap": "ghost", "trim": "ghost" }) },
  structure: { label: "Structure", describe: "Framing, decking and foundation only.", modes: parts => Object.fromEntries(parts
    .filter(p => /\.(siding|insulation|drywall)$|^roof\.(shingles|underlayment|ridge-cap|trim|gutters)$|^attic\.insulation$|^trim$|^opening\.|^structure\.ceiling$|^interior$|^electrical$/.test(p.id) && !/\.(sash|leaf|panels|glass)$/.test(p.id))
    .map(p => [p.id, "hide" as Visibility])) },
  systems: { label: "Systems", describe: "Envelope and interior ghosted: ducts, line set, water heater and pipes.", modes: parts => Object.fromEntries(parts
    .filter(p => /^wall\.[a-z]+$|^roof$|^trim$|^structure\.ceiling$|^attic\.insulation$|^chimney$|^site\.ground$|^foundation$|^interior$/.test(p.id))
    .map(p => [p.id, p.id.startsWith("roof") || p.id === "attic.insulation" ? "hide" as Visibility : "ghost" as Visibility])) },
};

function HomeExplorer({ preset: initialPreset }: { preset: HousePresetName }) {
  const [preset, setPreset] = useState<HousePresetName>(initialPreset);
  const [condition, setCondition] = useState<HouseCondition>("new");
  const [palette, setPalette] = useState<HousePaletteName | "preset">("preset");
  const [modes, setModes] = useState<Record<string, Visibility>>({});
  const [view, setView] = useState("exterior");
  const [cameraMode, setCameraMode] = useState<CameraMode>("orbit");
  const [azimuth, setAzimuth] = useState(32), [elevation, setElevation] = useState(16), [zoom, setZoom] = useState(1);
  const [focus, setFocus] = useState<string | null>(null);
  const [action, setAction] = useState<string | null>(null);
  const [asset, setAsset] = useState<HouseAsset | null>(null);
  const [arrange, setArrange] = useState<Record<string, { dx: number; dz: number; rot: number }>>({});
  const [storey, setStorey] = useState(0);
  const rig = useRef<PartRig | null>(null);
  const section = useRef<SectionRevealThree | null>(null);
  const surface = useRef<HTMLDivElement>(null);

  const spec = useMemo(() => ({ ...HOUSE_PRESETS[preset], condition, ...(palette === "preset" ? {} : { palette }) }), [preset, condition, palette]);
  const layout = useMemo(() => resolveHouseLayout(spec), [spec]);
  const walkMap = useMemo(() => houseWalkMap(layout), [layout]);
  const tour = useMemo(() => layout.interior ? planHouseTour(layout.interior) : null, [layout]);
  const create = useCallback(() => createHouse3D(spec), [spec]);
  const pickPreset = (k: HousePresetName) => { setPreset(k); setModes({}); setView("exterior"); setFocus(null); setAction(null); setArrange({}); setCameraMode("orbit"); setStorey(0); };
  const onAsset = useCallback((a: HeroAsset) => {
    rig.current?.dispose(); section.current?.dispose();
    rig.current = createPartRig(a.parts);
    section.current = createSectionRevealThree(a);
    setAsset(a as HouseAsset);
  }, []);
  useEffect(() => () => { rig.current?.dispose(); section.current?.dispose(); }, []);

  const actionSpec = asset?.actions?.find(a => a.id === action);
  const player = useFramePlayer(actionSpec?.durationFrames ?? 1, { loop: actionSpec?.loop });
  const tourPlayer = useFramePlayer(tour?.durationFrames ?? 1, { loop: true });
  const entry = walkMap.entry();
  const walk = useWalkCamera({
    enabled: cameraMode === "walk", surface, initial: { x: entry.x, z: entry.z, yaw: 0, pitch: -.05, eye: 1.6 },
    blocked: (from, to) => walkMap.blocked(from, to, storey), floorAt: (x, z) => walkMap.floorAt(x, z, storey),
  });
  const here = cameraMode === "walk" ? walkMap.roomAt(walk.pose.x, walk.pose.z, storey) : undefined;

  // Plan views: a capped horizontal cut above the chosen floor.
  const planState = useMemo(() => {
    const v = VIEWS[view];
    if (v.plan === undefined || !asset || v.plan >= layout.dims.storeys) return null;
    const y = layout.dims.floorY + v.plan * layout.dims.storeyHeight + 1.3;
    const plan = compileSectionReveal({ id: `plan-${v.plan}`, mode: "capped-section", targets: [], plane: { normal: [0, 1, 0], offset: y }, reveal: { startFrame: 0, endFrame: 1 } }, inspectHouse3D(asset));
    return evaluateSectionReveal(plan, 1);
  }, [view, asset, layout]);

  const poses: PartPoses = useMemo(() => {
    const out: Record<string, PartPose3D | undefined> = {};
    for (const [id, mode] of Object.entries(modes)) if (layout.parts.some(p => p.id === id)) out[id] = mode === "hide" ? { visible: false } : mode === "ghost" ? { opacity: .16 } : undefined;
    for (const [id, a] of Object.entries(arrange)) out[id] = { ...out[id], translate: [a.dx, 0, a.dz], rotate: [0, a.rot, 0] };
    return out;
  }, [modes, layout, arrange]);
  const onPose = useCallback((a: HeroAsset, state: HeroActionState) => {
    section.current?.reset();
    if (rig.current) rig.current.apply(poses, () => a.pose?.(state)); else a.pose?.(state);
    if (planState) section.current?.apply(planState);
  }, [poses, planState]);

  const focusPart = focus ? layout.parts.find(p => p.id === focus) : undefined;
  const target = focusPart ? [0, 1, 2].map(i => (focusPart.bounds.min[i] + focusPart.bounds.max[i]) / 2) as [number, number, number] : undefined;
  const focusZoom = focusPart ? Math.min(9, Math.max(1, Math.hypot(...layout.bounds.max.map((v, i) => v - layout.bounds.min[i])) /
    Math.max(.5, Math.hypot(...focusPart.bounds.max.map((v, i) => v - focusPart.bounds.min[i]))) * .5)) : 1;
  const tourPose = cameraMode === "tour" && tour ? tour.sample(tourPlayer.frame) : null;
  const camera = cameraMode === "walk" ? walk.camera : tourPose ? { position: tourPose.position, target: tourPose.target } : undefined;
  const tourRoom = tourPose ? layout.interior?.rooms.find(r => r.id === tourPose.roomId) : undefined;

  const setMode = (id: string, mode: Visibility) => setModes(m => ({ ...m, [id]: mode }));
  const applyView = (key: string) => { setView(key); setModes(VIEWS[key].modes(layout.parts)); if (VIEWS[key].orbit) setElevation(VIEWS[key].orbit!.elevation); setCameraMode("orbit"); };
  const goRoom = (id: string) => { const v = walkMap.viewpoint(id); setStorey(v.storey); walk.teleport({ x: v.x, z: v.z, yaw: v.yaw }); setCameraMode("walk"); surface.current?.focus(); };
  const tree = useMemo(() => layout.parts.filter(p => p.parentId === "house").map(p => ({ part: p, children: housePartSubtree(layout, p.id).slice(1) })), [layout]);
  const arrangeable = focusPart?.role === "furnishing" ? focusPart.id : null;
  const arr = arrangeable ? arrange[arrangeable] ?? { dx: 0, dz: 0, rot: 0 } : null;
  const rooms = layout.interior?.rooms.filter(r => r.kind !== "closet") ?? [];
  const parentOf = useMemo(() => new Map(layout.parts.map(p => [p.id, p.parentId])), [layout]);
  const depthOf = (id: string) => { let d = 0; for (let p = parentOf.get(id); p; p = parentOf.get(p)) d++; return d; };

  return <Page kicker="House Math · Home kit" title="Explore a layered house — outside, inside and every system"
    intro={<>Orbit the house, <strong>walk</strong> through it (W A S D or arrows, Q/E turn, Shift run, drag to look), or play a doorway-to-doorway
      <strong> tour</strong>. Every room, wall layer, door, appliance, fixture and device is a separately animatable part: hide, ghost, frame, move it,
      or play the built-in actions. Floor plans, furniture and yards are all customizable data.</>}>
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 340px", gap: 14 }}>
      <div style={{ display: "grid", gap: 14, alignContent: "start" }}>
        <div ref={surface} tabIndex={0} aria-label="3D view (click to focus for keyboard walking)" style={{ position: "relative", background: ink.panel, border: `1px solid ${ink.line}`, borderRadius: 14, overflow: "hidden", cursor: cameraMode === "walk" ? "grab" : "default", touchAction: "none", outline: "none" }}>
          <HeroAssetViewer createAsset={create} width={1280} height={720} azimuth={azimuth} elevation={elevation}
            zoom={focusPart ? focusZoom * zoom : zoom} target={target} action={action} actionFrame={player.frame} camera={camera}
            onAsset={onAsset} onPose={onPose} ariaLabel={`${preset} house, ${cameraMode} camera`} />
          {cameraMode !== "orbit" ? <div style={{ position: "absolute", left: 14, top: 12, display: "flex", gap: 8, alignItems: "center" }}>
            <Chip tone={ink.accent}>{cameraMode === "walk" ? (here ? here.label : walkMap.floorAt(walk.pose.x, walk.pose.z, storey) > 0 ? "Inside" : "Outside") : tourRoom?.label ?? "Tour"}</Chip>
            {cameraMode === "walk" ? <Chip>{`Floor ${storey + 1}`}</Chip> : null}
          </div> : null}
        </div>
        <Panel>
          <Row label="Camera">{(["orbit", "walk", "tour"] as const).map(k => <Button key={k} active={cameraMode === k} onClick={() => {
            // Walking and touring happen in the complete house (no cut or hidden envelope).
            if (k !== "orbit") { setView("exterior"); setModes({}); setFocus(null); }
            setCameraMode(k); if (k === "tour") tourPlayer.restart(); if (k === "walk") surface.current?.focus();
          }}>{k === "orbit" ? "Orbit" : k === "walk" ? "Walk" : "Tour"}</Button>)}</Row>
          {cameraMode === "walk" ? <>
            <Row label="Go to">
              <Button small onClick={() => { const e = walkMap.entry(); setStorey(0); walk.teleport({ x: e.x, z: e.z, yaw: 0 }); surface.current?.focus(); }}>Front yard</Button>
              {rooms.map(r => <Button key={r.id} small onClick={() => goRoom(r.id)}>{r.label}</Button>)}
            </Row>
            {layout.dims.storeys > 1 ? <Row label="Floor">{Array.from({ length: layout.dims.storeys }, (_, s) => <Button key={s} small active={storey === s} onClick={() => setStorey(s)}>{`Floor ${s + 1}`}</Button>)}</Row> : null}
            <p style={{ margin: 0, fontSize: 12.5, color: ink.dim }}>Click the view so it receives keys. Walls block you; doorways and open plans don’t.</p>
          </> : null}
          {cameraMode === "tour" && tour ? <Row label="Tour">
            <Button onClick={() => tourPlayer.playing ? tourPlayer.pause() : tourPlayer.resume()}>{tourPlayer.playing ? "Pause" : "Play"}</Button>
            <input type="range" aria-label="Tour frame" min={0} max={tour.durationFrames - 1} value={tourPlayer.frame} onChange={e => tourPlayer.seek(Number(e.target.value))} style={{ flex: 1, minWidth: 200 }} />
            <span style={{ fontVariantNumeric: "tabular-nums", color: ink.sub, fontSize: 13, minWidth: 80 }}>{tourPlayer.frame} / {tour.durationFrames - 1}</span>
          </Row> : null}
          <Row label="Preset">{(Object.keys(HOUSE_PRESETS) as HousePresetName[]).map(k => <Button key={k} active={preset === k} onClick={() => pickPreset(k)}>{k}</Button>)}</Row>
          <Row label="Condition">{(["new", "aged", "damaged"] as const).map(k => <Button key={k} active={condition === k} onClick={() => setCondition(k)}>{k}</Button>)}</Row>
          <Row label="Palette"><Button active={palette === "preset"} onClick={() => setPalette("preset")}>preset</Button>
            {(Object.keys(HOUSE_PALETTES) as HousePaletteName[]).map(k => <Button key={k} active={palette === k} onClick={() => setPalette(k)}>
              <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, background: HOUSE_PALETTES[k].siding, marginRight: 6, verticalAlign: -1 }} />{k}</Button>)}</Row>
          <Row label="View">{Object.entries(VIEWS).filter(([, v]) => v.plan === undefined || v.plan < layout.dims.storeys).map(([k, v]) => <Button key={k} active={view === k} onClick={() => applyView(k)} title={v.describe}>{v.label}</Button>)}</Row>
          <Row label="Actions">
            <Button active={action === null} onClick={() => { setAction(null); player.pause(); }}>Rest</Button>
            {(asset?.actions ?? []).map(a => <Button key={a.id} active={action === a.id} title={a.meaning} onClick={() => { setAction(a.id); player.restart(); }}>{a.label}</Button>)}
          </Row>
          {actionSpec ? <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Button onClick={() => player.playing ? player.pause() : player.resume()}>{player.playing ? "Pause" : "Play"}</Button>
            <input type="range" aria-label="Action frame" min={0} max={actionSpec.durationFrames - 1} value={player.frame} style={{ flex: 1 }} onChange={e => player.seek(Number(e.target.value))} />
            <span style={{ fontVariantNumeric: "tabular-nums", color: ink.sub, fontSize: 13, minWidth: 64 }}>{player.frame} / {actionSpec.durationFrames - 1}</span>
          </div> : null}
          {cameraMode === "orbit" ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 8 }}>
            <Slider label="Orbit" value={azimuth} min={-180} max={180} onChange={setAzimuth} format={v => `${v}°`} />
            <Slider label="Elevation" value={elevation} min={-5} max={80} onChange={setElevation} format={v => `${v}°`} />
            <Slider label="Zoom" value={zoom} min={.7} max={3} step={.05} onChange={setZoom} format={v => `${v.toFixed(2)}×`} />
          </div> : null}
          {arrangeable && arr ? <Panel title={`Arrange · ${focusPart!.label}`} style={{ background: "#0f151c" }}>
            <Slider label="Move X" value={arr.dx} min={-2} max={2} step={.05} onChange={v => setArrange(a => ({ ...a, [arrangeable]: { ...arr, dx: v } }))} format={v => `${v.toFixed(2)} m`} />
            <Slider label="Move Z" value={arr.dz} min={-2} max={2} step={.05} onChange={v => setArrange(a => ({ ...a, [arrangeable]: { ...arr, dz: v } }))} format={v => `${v.toFixed(2)} m`} />
            <Slider label="Rotate" value={arr.rot} min={-180} max={180} onChange={v => setArrange(a => ({ ...a, [arrangeable]: { ...arr, rot: v } }))} format={v => `${v}°`} />
            <Row label=""><Button small onClick={() => setArrange(a => { const n = { ...a }; delete n[arrangeable]; return n; })}>Reset item</Button><Button small onClick={() => setArrange({})}>Reset all</Button></Row>
          </Panel> : null}
        </Panel>
      </div>
      <Panel title={`Parts · ${layout.parts.length}`} style={{ maxHeight: 1180, overflow: "auto" }}>
        <p style={{ margin: 0, fontSize: 12, color: ink.dim }}>Show · Ghost · Hide each part; ◎ frames it (furniture can then be moved).</p>
        {tree.map(({ part, children }) => <details key={part.id} open={part.id === "interior"} style={{ borderTop: `1px solid ${ink.line}`, paddingTop: 6 }}>
          <summary style={{ cursor: "pointer", listStyle: "none" }}><PartRow part={part} mode={modes[part.id] ?? "show"} focused={focus === part.id}
            onMode={m => setMode(part.id, m)} onFocus={() => { setCameraMode("orbit"); setFocus(f => f === part.id ? null : part.id); }} strong /></summary>
          <div style={{ display: "grid", gap: 2, paddingLeft: 6 }}>
            {children.map(c => <PartRow key={c.id} part={c} mode={modes[c.id] ?? "show"} focused={focus === c.id}
              depth={Math.min(4, depthOf(c.id) - 1)} onMode={m => setMode(c.id, m)} onFocus={() => { setCameraMode("orbit"); setFocus(f => f === c.id ? null : c.id); }} />)}
          </div>
        </details>)}
      </Panel>
    </div>
    <Panel title="Layout facts (from the renderer-neutral model)">
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Chip>{`${layout.dims.width} × ${layout.dims.depth} m`}</Chip><Chip>{`${layout.dims.storeys} storey${layout.dims.storeys > 1 ? "s" : ""}`}</Chip>
        <Chip>{`${layout.interior?.rooms.length ?? 0} rooms`}</Chip><Chip>{`${layout.interior?.furnishings.length ?? 0} furnishings`}</Chip>
        <Chip>{`${layout.interior?.electrical.length ?? 0} electrical devices`}</Chip><Chip>{`${layout.interior?.yard.length ?? 0} yard items`}</Chip>
        <Chip>{`${layout.routes.length} service routes`}</Chip><Chip tone={ink.accent}>1 unit = 1 m</Chip>
      </div>
      <p style={{ margin: 0, fontSize: 13, color: ink.dim }}>Illustrative construction and furnishing for explainers — not a structural, energy or code-compliance claim.</p>
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
  title: "Home/Home Kit 3D", id: "house-math-home-kit-3d", component: HomeExplorer, parameters: { layout: "fullscreen" },
  argTypes: { preset: { control: "select", options: Object.keys(HOUSE_PRESETS) } },
} satisfies Meta<typeof HomeExplorer>;
export default meta;
export const Explorer: StoryObj<typeof meta> = { args: { preset: "cottage" } };
