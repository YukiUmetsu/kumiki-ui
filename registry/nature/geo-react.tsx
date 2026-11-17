/**
 * GEO1 React pieces: `TerrainView` (a landform rendered in a worker, cached, with a working state), `LandformProfile`
 * (a landform's silhouette with its slopes, for any style), `GeoSheet` (every landform, the angle of repose, snowlines
 * and treelines by latitude, ground-cover albedo and the rules of distance).
 */
import { forwardRef } from "react";
import type { CanvasHTMLAttributes } from "react";
import { RenderFrame } from "../anatomy/foundation-render-react";
import { SheetCard, sheetGrid, sheetList, sheetSmall } from "../anatomy/foundation-react";
import { ANGLE_OF_REPOSE, DISTANCE_NOTES, GROUND_COVERS, LANDFORMS, SNOWLINE_POINTS, TREELINE_POINTS } from "./geo-data";
import type { Landform } from "./geo-data";
import type { TerrainRenderOptions } from "./geo-render";
import { GEO_RENDER_POOL } from "./geo-render-pool";

export interface TerrainViewProps extends Omit<CanvasHTMLAttributes<HTMLCanvasElement>, "width" | "height"> { options: TerrainRenderOptions; label: string }
/** A landform rendered under SKY1's atmosphere (`renderTerrain`), in a worker, cached, with a quick preview first. */
export const TerrainView = forwardRef<HTMLCanvasElement, TerrainViewProps>(function TerrainView({ options, label, ...rest }, ref) {
  const W = options.width ?? 480, H = options.height ?? 270;
  return <RenderFrame ref={ref} width={W} height={H} label={label} placeholder="var(--km-surface-subtle, #9aa7b4)"
    job={{ pool: GEO_RENDER_POOL, kind: "terrain", args: options }}
    preview={{ pool: GEO_RENDER_POOL, kind: "terrain", args: { ...options, width: Math.round(W / 2), height: Math.round(H / 2), supersample: 1 } }} {...rest} />;
});

/** A landform's silhouette (its `profile`) with the slope range written on it. */
export function LandformProfile({ landform, width = 300, height = 110 }: { landform: Landform; width?: number; height?: number }) {
  const p = landform.profile, pad = 8, pts = p.map((v, i) => [pad + (i / (p.length - 1)) * (width - 2 * pad), height - pad - v * (height - 2 * pad - 14)] as const);
  const d = `M${pad} ${height - pad}L${pts.map(q => `${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join("L")}L${width - pad} ${height - pad}Z`;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" role="img" aria-label={`${landform.label}: profile, slopes ${landform.slope.min}–${landform.slope.max}°`} style={{ display: "block", maxWidth: width }}>
      <path d={d} fill="var(--kumiki-geo-land, #8a8174)" stroke="var(--km-text-primary, #2a211d)" strokeWidth={1.2} strokeLinejoin="round" />
      <text x={pad} y={14} style={{ font: "12px var(--km-font-sans, system-ui)", fill: "var(--km-text-muted, #4e4d4d)" }}>slopes {landform.slope.min}–{landform.slope.max}° · relief {landform.relief.min.toLocaleString("en")}–{landform.relief.max.toLocaleString("en")} m</text>
    </svg>
  );
}

/** Every landform with its profile and drawing notes, then the tables a drawing of land needs. */
export function GeoSheet() {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={sheetGrid}>
        {LANDFORMS.map(l => (
          <SheetCard key={l.id} title={l.label}>
            <LandformProfile landform={l} />
            <p style={{ ...sheetSmall, margin: 0 }}>{l.origin}</p>
            <ul style={{ ...sheetList, ...sheetSmall }}>{l.draw.map(x => <li key={x}>{x}</li>)}</ul>
            <span style={sheetSmall}>Slopes: {l.slope.source} ({l.slope.grade}).</span>
          </SheetCard>
        ))}
      </div>
      <div style={sheetGrid}>
        <SheetCard title="Angle of repose (loose material)">
          <ul style={{ ...sheetList, ...sheetSmall }}>{ANGLE_OF_REPOSE.map(a => <li key={a.material}><b>{a.material}</b>: {a.degrees.min}–{a.degrees.max}° (typical {a.degrees.typical}°) — {a.degrees.source}</li>)}</ul>
        </SheetCard>
        <SheetCard title="Snowline and treeline by latitude">
          <ul style={{ ...sheetList, ...sheetSmall }}>{SNOWLINE_POINTS.map(p => <li key={`s${p.latitude}`}>Snow, {p.latitude}°: {p.metres.toLocaleString("en")} m — {p.where}</li>)}</ul>
          <ul style={{ ...sheetList, ...sheetSmall }}>{TREELINE_POINTS.map(p => <li key={`t${p.latitude}`}>Trees, {p.latitude}°: {p.metres.toLocaleString("en")} m — {p.where}</li>)}</ul>
          <span style={sheetSmall}>Anchors reported by Wikipedia (Snow line; Tree line); between them, interpolated (estimated).</span>
        </SheetCard>
        <SheetCard title="Ground covers (albedo)">
          <ul style={{ ...sheetList, ...sheetSmall, listStyle: "none", paddingLeft: 0 }}>{GROUND_COVERS.map(g => <li key={g.id} style={{ display: "flex", gap: 8, alignItems: "center" }}><span aria-hidden="true" style={{ width: 22, height: 16, borderRadius: 3, background: g.colour, border: "1px solid #0002", flex: "none" }} /><span><b>{g.label}</b> {g.albedo.min}–{g.albedo.max} ({g.albedo.grade})</span></li>)}</ul>
        </SheetCard>
        <SheetCard title="Distance">
          <ul style={{ ...sheetList, ...sheetSmall }}>{DISTANCE_NOTES.map(n => <li key={n}>{n}</li>)}</ul>
        </SheetCard>
      </div>
    </div>
  );
}
