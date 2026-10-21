import { useCallback, useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { HeroAssetViewer } from "../../registry/craft/hero-viewer";
import type { HeroView } from "../../registry/craft/hero-viewer";
import type { HeroAsset } from "../../registry/craft/hero-asset";
import { createHouse3D } from "../../registry/domains/home-3d";
import { houseDimensions } from "../../registry/domains/home-dimensions";
import type { HouseDimensionSet } from "../../registry/domains/home-dimensions";
import { HOUSE_PRESETS, resolveHouseLayout } from "../../registry/domains/home-model";
import type { HousePresetName } from "../../registry/domains/home-model";
import { createHouseSection } from "../../registry/domains/home-section-2d";
import { HouseSection2D } from "../../registry/domains/home-section-2d-svg";
import { layoutDimensions, resolveDimensions } from "../../registry/visual/dimension-overlay";
import { DimensionOverlaySvg } from "../../registry/visual/dimension-overlay-react";
import type { MeasureUnits } from "../../registry/visual/measure-units";
import { createThreeCalloutProjector, heroViewCamera } from "../../registry/visual/semantic-callouts-three";
import { Button, Chip, Page, Panel, Row, Slider, ink, mono, useFramePlayer } from "./house-ui";

const W3 = 1280, H3 = 760, W2 = 1280;
type ViewId = "overview" | "roof" | "side" | "section";
const SETS: Record<ViewId, HouseDimensionSet[]> = {
  overview: ["overall", "window", "footprint", "scale"],
  roof: ["roof-layers", "pitch"],
  side: ["wall-layers", "foundation", "pitch"],
  section: ["roof-layers", "wall-layers", "foundation", "pitch"],
};

function DimensionDemo({ preset: initial }: { preset: HousePresetName }) {
  const [preset, setPreset] = useState<HousePresetName>(initial);
  const [viewId, setViewId] = useState<ViewId>("overview");
  const [units, setUnits] = useState<MeasureUnits>("metric");
  const [asset, setAsset] = useState<HeroAsset | null>(null);
  const spec = useMemo(() => ({ ...HOUSE_PRESETS[preset], interior: false }), [preset]);
  const layout = useMemo(() => resolveHouseLayout(spec), [spec]);
  const d = layout.dims;
  const views: Record<Exclude<ViewId, "section">, HeroView> = useMemo(() => ({
    overview: { azimuth: 30, elevation: 20, zoom: 1.25 },
    roof: { azimuth: 88, elevation: 4, zoom: 5.5, target: [d.width / 2 + d.rakeOverhang, d.roofTopAt(d.depth / 2 * .7), d.depth / 2 * .7] },
    side: { azimuth: 80, elevation: 6, zoom: 1.35, target: [d.width / 2, d.ridgeY * .42, d.depth / 4] },
  }), [d]);
  const specs = useMemo(() => houseDimensions(layout, SETS[viewId], { start: 8, stagger: 16, wallAt: viewId === "side" ? .985 : .2 }), [layout, viewId]);
  const resolved = useMemo(() => resolveDimensions(specs, { units }), [specs, units]);
  const duration = Math.max(60, ...specs.map(s => (s.frames?.start ?? 0) + (s.frames?.draw ?? 18))) + 40;
  const player = useFramePlayer(duration, { autoplay: true });
  const create = useCallback(() => createHouse3D(spec), [spec]);
  const section = useMemo(() => createHouseSection(layout, { cutX: -d.width / 2 * .35 }), [layout, d]);
  const H2 = Math.round(W2 * section.height / section.width);

  const projector = useMemo(() => {
    if (viewId === "section") {
      const k = W2 / section.width;
      return { project: (p: readonly number[]) => { const q = section.project([p[0], p[1], p[2]]); return { x: q[0] * k, y: q[1] * k, inView: true }; }, viewport: { width: W2, height: H2 } };
    }
    if (!asset) return null;
    const camera = heroViewCamera(asset, views[viewId], W3, H3);
    const proj = createThreeCalloutProjector({ camera, viewport: { width: W3, height: H3 }, root: asset.group, parts: asset.parts });
    return { project: proj.project, viewport: { width: W3, height: H3 } };
  }, [viewId, asset, views, section, H2]);
  const laid = useMemo(() => projector ? layoutDimensions(resolved.dimensions, { ...projector, frame: player.frame, fontSize: viewId === "section" ? 15 : 16 }) : null, [projector, resolved, player.frame, viewId]);
  const diagnostics = [...resolved.diagnostics, ...(laid?.diagnostics ?? [])];

  return <Page kicker="House Math · Measurement" title="DimensionOverlay"
    intro={<>Dimensions, layer thicknesses, areas, angles and scale references drawn from the asset's own meters, the same model the 3D build uses, never from pixels. Labels stay upright and readable, thin layers stack with leaders, and a strongly foreshortened dimension is flagged while still showing its true length.</>}>
    <Row label="House">{(["cottage", "ranch", "two-storey"] as HousePresetName[]).map(p => <Button key={p} active={preset === p} onClick={() => { setPreset(p); setAsset(null); }}>{p}</Button>)}</Row>
    <Row label="View">
      {(["overview", "roof", "side", "section"] as ViewId[]).map(v => <Button key={v} small active={viewId === v} onClick={() => { setViewId(v); player.restart(); }}>{v === "section" ? "2D section" : v}</Button>)}
      {(["metric", "imperial"] as const).map(u => <Button key={u} small active={units === u} onClick={() => setUnits(u)}>{u}</Button>)}
    </Row>
    <Row label="Draw-on">
      <Button small onClick={player.restart}>Replay</Button>
      <div style={{ minWidth: 340, flex: 1 }}><Slider label="Frame" value={player.frame} min={0} max={duration - 1} onChange={player.seek} /></div>
    </Row>
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 360px", gap: 14, alignItems: "start" }}>
      <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", border: `1px solid ${ink.line}` }}>
        {viewId === "section"
          ? <div style={{ width: "100%", aspectRatio: `${W2} / ${H2}`, position: "relative" }}><HouseSection2D section={section} theme="paper" style={{ position: "absolute", inset: 0 }} /></div>
          : <HeroAssetViewer key={`${preset}-${viewId}`} createAsset={create} width={W3} height={H3} {...views[viewId]} onAsset={setAsset} ariaLabel={`${preset} with dimensions`} />}
        {laid && projector ? <svg viewBox={`0 0 ${projector.viewport.width} ${projector.viewport.height}`} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} aria-hidden>
          <DimensionOverlaySvg dimensions={laid.dimensions} fontSize={viewId === "section" ? 15 : 16} colors={viewId === "section" ? { line: "#c2410c", extension: "rgba(194,65,12,.65)", plate: "rgba(255,255,255,.92)", text: "#1c1917", area: "rgba(194,65,12,.1)" } : undefined} />
        </svg> : null}
      </div>
      <Panel title="Measured values">
        <div style={{ fontFamily: mono, fontSize: 12, color: ink.sub, lineHeight: 1.6 }}>
          {resolved.dimensions.map(r => <div key={r.id}><span style={{ color: ink.text }}>{r.id}</span>{`: ${r.text ?? r.segments.map(s => `${s.label ? `${s.label} ` : ""}${s.text}`).join(" · ")}`}</div>)}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {laid?.dimensions.map(x => <Chip key={x.id} tone={x.status === "visible" ? ink.accent : ink.warn}>{`${x.id}: ${x.status}${x.status === "foreshortened" ? ` ${Math.round(x.foreshortening * 100)}%` : ""}`}</Chip>)}
        </div>
        {diagnostics.length ? <ul style={{ margin: 0, paddingLeft: 18, color: ink.sub, fontSize: 12.5 }}>{diagnostics.map((g, i) => <li key={i}><span style={{ fontFamily: mono, color: ink.dim }}>{g.code}</span> {g.message}</li>)}</ul> : null}
      </Panel>
    </div>
  </Page>;
}

const meta = {
  title: "House Math/Dimension Overlay", component: DimensionDemo, parameters: { layout: "fullscreen" },
  argTypes: { preset: { control: "inline-radio", options: ["cottage", "ranch", "two-storey"] } },
} satisfies Meta<typeof DimensionDemo>;
export default meta;
export const Dimensions: StoryObj<typeof meta> = { args: { preset: "cottage" } };
