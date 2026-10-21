import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { HeroAssetViewer } from "../../registry/craft/hero-viewer";
import type { HeroAsset } from "../../registry/craft/hero-asset";
import type { HeroActionState } from "../../registry/craft/hero-action";
import { heroCatalogEntry } from "../../registry/domains/hero-catalog";
import { createHouse3D, inspectHouse3D } from "../../registry/domains/home-3d";
import type { HouseAsset } from "../../registry/domains/home-3d";
import { HOUSE_PRESETS } from "../../registry/domains/home-model";
import { inspectHeroAsset } from "../../registry/visual/inspectable-asset-three";
import type { InspectableAsset } from "../../registry/visual/inspectable-asset";
import { compileSectionReveal, evaluateSectionReveal } from "../../registry/visual/section-reveal";
import type { SectionPlane, SectionRevealMode, SectionRevealSpec } from "../../registry/visual/section-reveal";
import { createSectionRevealThree } from "../../registry/visual/section-reveal-three";
import type { SectionRevealThree } from "../../registry/visual/section-reveal-three";
import { Button, Chip, Page, Panel, Row, Slider, ink, mono, useFramePlayer } from "./house-ui";
import { FinanceObject2D } from "../../registry/domains/finance-object-2d";
import type { FinanceObjectKind } from "../../registry/domains/finance-object-model";
import { TechnologyObject2D } from "../../registry/domains/technology-object-2d";
import type { TechnologyObjectKind } from "../../registry/domains/technology-object-model";
import type { PartRef } from "../../registry/domains/illustration-2d";
import { inspectSvgParts } from "../../registry/visual/inspectable-asset-svg";
import { sectionRevealSvgOpacities } from "../../registry/visual/section-reveal-svg";

type Fixture = "cottage" | "two-storey" | "bank" | "laptop";
interface Preset { label: string; targets: string[]; context?: string[] }
const HOUSE_TARGETS: Preset[] = [
  { label: "Condenser", targets: ["hvac.condenser"], context: ["site.ground"] },
  { label: "HVAC system", targets: ["hvac"], context: ["site.ground", "foundation"] },
  { label: "Plumbing", targets: ["plumbing"], context: ["site.ground"] },
  { label: "Attic insulation", targets: ["attic.insulation", "roof.framing"] },
  { label: "Front wall layers", targets: ["wall.front"] },
  { label: "Foundation", targets: ["foundation"], context: [] },
];
const PLANES: Record<string, { label: string; plane: (a: InspectableAsset) => SectionPlane }> = {
  front: { label: "Front third (Z)", plane: a => ({ normal: [0, 0, 1], offset: a.getBounds("walls", 0).max[2] * .35 }) },
  middle: { label: "Mid-depth (Z = 0)", plane: () => ({ normal: [0, 0, 1], offset: 0 }) },
  side: { label: "Right third (X)", plane: a => ({ normal: [1, 0, 0], offset: a.getBounds("walls", 0).max[0] * .3 }) },
  level: { label: "Plan cut (Y = 1.6 m)", plane: a => ({ normal: [0, 1, 0], offset: (a.getBounds("structure.floor-1", 0).max[1]) + 1.35 }) },
};
const FIXTURES: Record<Fixture, { label: string; create: () => HeroAsset; inspect: (a: HeroAsset, pose: (f: number) => void) => InspectableAsset; targets: Preset[]; view: { azimuth: number; elevation: number } }> = {
  cottage: { label: "Cottage (crawlspace)", create: () => createHouse3D(HOUSE_PRESETS.cottage), inspect: (a, p) => inspectHouse3D(a as HouseAsset, p), targets: HOUSE_TARGETS, view: { azimuth: 30, elevation: 18 } },
  "two-storey": { label: "Two-storey (basement)", create: () => createHouse3D(HOUSE_PRESETS["two-storey"]), inspect: (a, p) => inspectHouse3D(a as HouseAsset, p), targets: HOUSE_TARGETS, view: { azimuth: 30, elevation: 16 } },
  bank: { label: "Bank (existing hero)", create: () => heroCatalogEntry("bank").create({ id: "section-bank" }), inspect: (a, p) => inspectHeroAsset(a, { poseAt: p }),
    targets: [{ label: "Doors", targets: ["bank-door-hinge-left", "bank-door-hinge-right"] }, { label: "Columns", targets: ["bank-fluted-column-1", "bank-fluted-column-2", "bank-fluted-column-3", "bank-fluted-column-4", "bank-fluted-column-5", "bank-fluted-column-6"] }],
    view: { azimuth: 28, elevation: 12 } },
  laptop: { label: "Laptop (existing hero)", create: () => heroCatalogEntry("laptop").create({ id: "section-laptop" }), inspect: (a, p) => inspectHeroAsset(a, { poseAt: p }),
    targets: [{ label: "Keyboard deck", targets: [] }], view: { azimuth: 30, elevation: 22 } },
};
const TOTAL = 96, REVEAL = { startFrame: 10, endFrame: 58 };

function SectionRevealDemo({ fixture: initial }: { fixture: Fixture }) {
  const [fixture, setFixture] = useState<Fixture>(initial);
  const [mode, setMode] = useState<SectionRevealMode>("capped-section");
  const [targetIndex, setTargetIndex] = useState(0);
  const [planeKey, setPlaneKey] = useState("front");
  const [portrait, setPortrait] = useState(false);
  const param = (k: string) => { const v = Number(new URLSearchParams(window.location.search).get(k)); return Number.isFinite(v) && new URLSearchParams(window.location.search).has(k) ? v : undefined; };
  const [azimuth, setAzimuth] = useState<number | undefined>(param("kmAz")), [zoom, setZoom] = useState(param("kmZoom") ?? 1);
  const [inspect, setInspect] = useState<InspectableAsset | null>(null);
  const adapter = useRef<SectionRevealThree | null>(null);
  const player = useFramePlayer(TOTAL, { loop: false });
  const create = useCallback(() => FIXTURES[fixture].create(), [fixture]);
  const assetRef = useRef<HeroAsset | null>(null);
  const onAsset = useCallback((a: HeroAsset) => {
    adapter.current?.dispose();
    assetRef.current = a;
    adapter.current = createSectionRevealThree(a);
    setInspect(FIXTURES[fixture].inspect(a, () => a.pose?.({ id: null, frame: 0 })));
  }, [fixture]);
  useEffect(() => () => adapter.current?.dispose(), []);

  const presets = FIXTURES[fixture].targets;
  const preset = presets[Math.min(targetIndex, presets.length - 1)];
  const { plan, error } = useMemo(() => {
    if (!inspect) return { plan: null, error: null };
    const laptopTargets = fixture === "laptop" ? inspect.parts.filter(p => /key|deck|trackpad/i.test(p.id)).map(p => p.id).slice(0, 6) : [];
    const spec: SectionRevealSpec = {
      id: `${fixture}-${mode}`, mode, targets: laptopTargets.length ? laptopTargets : preset.targets, context: preset.context ?? [],
      plane: mode === "section" || mode === "capped-section" ? (inspect.parts.some(p => p.id === "walls") ? PLANES[planeKey].plane(inspect) : { normal: [0, 0, 1], offset: 0 }) : undefined,
      reveal: REVEAL,
    };
    try { return { plan: compileSectionReveal(spec, inspect), error: null }; } catch (e) { return { plan: null, error: (e as Error).message }; }
  }, [inspect, fixture, mode, preset, planeKey]);
  const state = useMemo(() => plan ? evaluateSectionReveal(plan, player.frame) : null, [plan, player.frame]);
  const onPose = useCallback((a: HeroAsset, s: HeroActionState) => {
    a.pose?.(s);
    if (state && adapter.current) adapter.current.apply(state);
  }, [state]);
  const counts = state ? [...state.parts.values()].reduce((acc, p) => {
    if (p.role === "target") acc.target++; else if (p.opacity <= .001) acc.removed++; else if (p.clip) acc.clipped++; else if (p.opacity < .999) acc.faded++;
    return acc;
  }, { target: 0, removed: 0, clipped: 0, faded: 0 }) : null;
  const width = portrait ? 720 : 1280, height = portrait ? 1280 : 720;

  return <Page kicker="House Math · V02" title="SectionReveal — look inside an intact assembly"
    intro={<>Renderer-neutral plan (<code>compileSectionReveal</code> → <code>evaluateSectionReveal(plan, frame)</code>) plus a Three.js adapter.
      Isolate and ghost work on any asset; a clipping <em>section</em> needs an asset that declares it. The bank and laptop below don’t, so they fall back
      to ghost with an explicit diagnostic. Nothing moves: compare with exploded views, which do.</>}>
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 340px", gap: 14 }}>
      <div style={{ display: "grid", gap: 12, alignContent: "start" }}>
        <div style={{ background: ink.panel, border: `1px solid ${ink.line}`, borderRadius: 14, overflow: "hidden", maxWidth: portrait ? 460 : undefined, justifySelf: portrait ? "center" : "stretch", width: "100%" }}>
          <HeroAssetViewer key={`${fixture}-${portrait}`} createAsset={create} width={width} height={height} {...FIXTURES[fixture].view}
            azimuth={azimuth ?? FIXTURES[fixture].view.azimuth} elevation={param("kmEl") ?? FIXTURES[fixture].view.elevation}
            zoom={(portrait ? .9 : 1) * zoom} onAsset={onAsset} onPose={onPose} ariaLabel={`${FIXTURES[fixture].label}, ${mode} reveal`} />
        </div>
        <Panel>
          <Row label="Asset">{(Object.keys(FIXTURES) as Fixture[]).map(k => <Button key={k} active={fixture === k} onClick={() => { setFixture(k); setTargetIndex(0); setInspect(null); }}>{FIXTURES[k].label}</Button>)}</Row>
          <Row label="Mode">{(["isolate", "ghost", "section", "capped-section"] as const).map(k => <Button key={k} active={mode === k} onClick={() => { setMode(k); player.restart(); }}>{k}</Button>)}</Row>
          <Row label="Target">{presets.map((p, i) => <Button key={p.label} active={i === targetIndex} onClick={() => { setTargetIndex(i); player.restart(); }}>{p.label}</Button>)}</Row>
          {mode === "section" || mode === "capped-section" ? <Row label="Plane">{Object.entries(PLANES).map(([k, p]) => <Button key={k} active={planeKey === k} onClick={() => { setPlaneKey(k); player.restart(); }}>{p.label}</Button>)}</Row> : null}
          <Row label="Frame">
            <Button onClick={() => player.playing ? player.pause() : player.resume()}>{player.playing ? "Pause" : "Play"}</Button>
            <input type="range" aria-label="Frame" min={0} max={TOTAL - 1} value={player.frame} onChange={e => player.seek(Number(e.target.value))} style={{ flex: 1, minWidth: 200 }} />
            <span style={{ fontVariantNumeric: "tabular-nums", color: ink.sub, fontSize: 13, minWidth: 110 }}>{player.frame} / {TOTAL - 1} · {Math.round((state?.amount ?? 0) * 100)}%</span>
          </Row>
          <Row label="Framing"><Button active={!portrait} onClick={() => setPortrait(false)}>16:9</Button><Button active={portrait} onClick={() => setPortrait(true)}>9:16</Button></Row>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 8 }}>
            <Slider label="Orbit" value={azimuth ?? FIXTURES[fixture].view.azimuth} min={-180} max={180} onChange={setAzimuth} format={v => `${v}°`} />
            <Slider label="Zoom" value={zoom} min={.7} max={5} step={.05} onChange={setZoom} format={v => `${v.toFixed(2)}×`} />
          </div>
        </Panel>
      </div>
      <div style={{ display: "grid", gap: 12, alignContent: "start" }}>
        <Panel title="Evaluated frame">
          {error ? <p role="alert" style={{ margin: 0, color: ink.warn }}>{error}</p> : null}
          {state && counts ? <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <Chip tone={ink.accent}>{`applied: ${state.mode}`}</Chip><Chip>{`${counts.target} target parts`}</Chip>
            <Chip>{`${counts.removed} removed`}</Chip><Chip>{`${counts.clipped} clipped`}</Chip><Chip>{`${counts.faded} faded`}</Chip>
            {adapter.current ? <Chip>{`${adapter.current.cappedMeshes} capped meshes`}</Chip> : null}
          </div> : <p role="status" style={{ margin: 0, color: ink.dim }}>Building…</p>}
          {state?.plane ? <div style={{ fontFamily: mono, fontSize: 12, color: ink.sub }}>plane n=[{state.plane.normal.map(v => v.toFixed(2)).join(", ")}] offset {state.plane.offset.toFixed(2)} m</div> : null}
        </Panel>
        <Panel title={`Diagnostics · ${state?.diagnostics.length ?? 0}`}>
          {state?.diagnostics.length ? <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: ink.sub, lineHeight: 1.5 }}>
            {dedupe(state.diagnostics.map(d => `${d.code}|${d.message}`)).slice(0, 8).map(d => { const [code, msg] = d.split("|"); return <li key={d}><code style={{ color: ink.warn }}>{code}</code> — {msg}</li>; })}
          </ul> : <p style={{ margin: 0, fontSize: 13, color: ink.dim }}>None at this frame.</p>}
        </Panel>
        <Panel title="Target parts">
          <div style={{ fontFamily: mono, fontSize: 11.5, color: ink.sub, lineHeight: 1.6, maxHeight: 260, overflow: "auto" }}>
            {state ? [...state.parts.values()].filter(p => p.role === "target").map(p => <div key={p.id}>{p.id}</div>) : null}
          </div>
        </Panel>
      </div>
    </div>
  </Page>;
}
const dedupe = (list: string[]) => [...new Set(list)];

/* --------------------------------------------------------------- 2D adapter */

const OBJECTS_2D: Array<{ pack: "finance" | "technology"; kind: string; target: string; label: string }> = [
  { pack: "technology", kind: "laptop", target: "screen", label: "Laptop → screen" },
  { pack: "finance", kind: "atm", target: "screen", label: "ATM → screen" },
  { pack: "technology", kind: "settings", target: "gear", label: "Settings → gears" },
];

function Reveal2DCard({ pack, kind, target, label, mode, frame }: (typeof OBJECTS_2D)[number] & { mode: "isolate" | "ghost"; frame: number }) {
  const ref = useRef<SVGSVGElement>(null);
  const [inspect, setInspect] = useState<InspectableAsset | null>(null);
  useEffect(() => { if (ref.current) setInspect(inspectSvgParts(ref.current, { id: `svg-${kind}` })); }, [kind]);
  const result = useMemo(() => {
    if (!inspect) return null;
    const targets = inspect.parts.filter(p => p.label === target).map(p => p.id);
    const plan = compileSectionReveal({ id: `2d-${kind}-${mode}`, mode, targets, reveal: REVEAL }, inspect);
    const state = evaluateSectionReveal(plan, frame);
    return { state, svg: sectionRevealSvgOpacities(state, inspect), targets };
  }, [inspect, kind, mode, target, frame]);
  const parts = useCallback((part: PartRef) => {
    const o = result?.svg.opacity.get(`${part.name}-${part.index}`);
    return o === undefined ? undefined : { opacity: o };
  }, [result]);
  const spec = { id: `reveal-${kind}`, kind };
  const common = { ref, width: 300, height: 250, parts, theme: "midnight" as const, reducedMotion: true };
  return <Panel title={label}>
    {pack === "finance" ? <FinanceObject2D {...common} spec={spec as { id: string; kind: FinanceObjectKind }} />
      : <TechnologyObject2D {...common} spec={spec as { id: string; kind: TechnologyObjectKind }} />}
    <div style={{ fontFamily: mono, fontSize: 11.5, color: ink.sub }}>
      {inspect ? `${inspect.parts.length} parts · targets ${result?.targets.join(", ") || "none"}` : "measuring…"}
    </div>
    {result?.svg.notes.length ? <div style={{ fontSize: 12, color: ink.warn }}>{result.svg.notes[0]}</div> : null}
  </Panel>;
}

function SectionReveal2DDemo() {
  const [mode, setMode] = useState<"isolate" | "ghost">("ghost");
  const player = useFramePlayer(TOTAL, { loop: false });
  return <Page kicker="House Math · V02 · 2D" title="SectionReveal on 2D illustrations"
    intro={<>The same plan and evaluator drive SVG: <code>inspectSvgParts</code> reads tagged part groups, and
      <code> sectionRevealSvgOpacities</code> maps the evaluated frame to part opacities, keeping ancestors of a target opaque
      because SVG group opacity multiplies down the tree. Three unrelated domain objects, no asset changes.</>}>
    <Panel>
      <Row label="Mode">{(["isolate", "ghost"] as const).map(k => <Button key={k} active={mode === k} onClick={() => { setMode(k); player.restart(); }}>{k}</Button>)}</Row>
      <Row label="Frame">
        <Button onClick={() => player.playing ? player.pause() : player.resume()}>{player.playing ? "Pause" : "Play"}</Button>
        <input type="range" aria-label="Frame" min={0} max={TOTAL - 1} value={player.frame} onChange={e => player.seek(Number(e.target.value))} style={{ flex: 1, minWidth: 200 }} />
        <span style={{ fontVariantNumeric: "tabular-nums", color: ink.sub, fontSize: 13, minWidth: 64 }}>{player.frame} / {TOTAL - 1}</span>
      </Row>
    </Panel>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 12 }}>
      {OBJECTS_2D.map(o => <Reveal2DCard key={o.kind} {...o} mode={mode} frame={player.frame} />)}
    </div>
  </Page>;
}

const meta = {
  title: "House Math/Section Reveal", component: SectionRevealDemo, parameters: { layout: "fullscreen" },
  argTypes: { fixture: { control: "select", options: Object.keys(FIXTURES) } },
} satisfies Meta<typeof SectionRevealDemo>;
export default meta;
export const Modes: StoryObj<typeof meta> = { args: { fixture: "cottage" } };
export const TwoD: StoryObj<typeof meta> = { args: { fixture: "cottage" }, render: () => <SectionReveal2DDemo /> };
