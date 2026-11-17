/**
 * ARCH1 React pieces: `BuildingElevation` (a measured front elevation, painted by part role, with a person for scale
 * and optional dimensions), `StreetElevation` (buildings side by side on one ground line, one scale) and `ArchSheet`
 * (the types and the tables: human scale, stairs, roof pitches, orders, Japanese modules).
 */
import { useId, useMemo } from "react";
import type { CSSProperties } from "react";
import { personOutline } from "./foundation-shapes";
import type { FPoint } from "./foundation-shapes";
import { SheetCard, sheetGrid, sheetList, sheetSmall } from "./foundation-react";
import { BLONDEL_STRIDE, BUILDING_TYPES, CLASSICAL_ORDERS, HUMAN_SCALE, INTERCOLUMNIATION, JAPANESE_MODULES, ROOF_PITCHES } from "./arch-data";
import { buildingElevation } from "./arch-construct";
import type { Elevation, ElevationPart, PartRole } from "./arch-construct";

const shade = (hex: string, k: number) => { const n = parseInt(hex.slice(1), 16), c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => Math.round(Math.min(255, Math.max(0, k > 0 ? v + (255 - v) * k : v * (1 + k))))); return `rgb(${c.join(",")})`; };

function palette(e: Elevation, ids: { glass: string; roof: string; wall: string }): Record<PartRole, string> {
  const t = e.type;
  return {
    wall: `url(#${ids.wall})`, shade: "rgba(20,16,12,0.45)", roof: `url(#${ids.roof})`, "roof-line": shade(t.roofColour, -0.35), window: shade(t.trim, -0.2), glass: `url(#${ids.glass})`,
    frame: t.id === "georgian-townhouse" ? "#f1ece2" : shade(t.trim, 0.05), door: t.id === "georgian-townhouse" ? "#22303a" : shade(t.trim, -0.15), timber: t.trim, lattice: shade(t.trim, -0.35),
    column: t.id === "greek-temple" ? "#e9e3d6" : "#9b3b28", step: "#d9d2c3", base: "#8f8a80", bracket: shade(t.trim, 0.1), plaster: shade(t.wall, 0.45), beam: t.id === "greek-temple" ? "#ddd6c7" : shade(t.trim, -0.05), cloth: "#2c3a5a",
  };
}

const pathOf = (p: ElevationPart) => `M${p.pts.map(q => `${q[0].toFixed(3)} ${(-q[1]).toFixed(3)}`).join("L")}${p.closed ? "Z" : ""}`;

export interface BuildingElevationProps { type: string; seed?: number; storeys?: number; bays?: number; dims?: boolean; person?: boolean; height?: number; label?: string; style?: CSSProperties }
/** A measured front elevation of a building type (metres), painted by part, with a person 1.75 m tall for scale. */
export function BuildingElevation({ type, seed = 1, storeys, bays, dims = false, person = true, height = 260, label, style }: BuildingElevationProps) {
  const e = useMemo(() => buildingElevation(type, { seed, storeys, bays }), [type, seed, storeys, bays]);
  return <ElevationSvg items={[{ e, x: 0 }]} dims={dims} person={person} height={height} label={label ?? `${e.type.label}, front elevation`} style={style} />;
}

export interface StreetElevationProps { types: readonly { type: string; seed?: number; storeys?: number; bays?: number }[]; height?: number; label: string; gap?: number }
/** Buildings side by side on one ground line at one scale (a street front). */
export function StreetElevation({ types, height = 240, label, gap = 0 }: StreetElevationProps) {
  const items = useMemo(() => {
    let x = 0;
    // spaced by their walls (town houses share party walls; eaves overlap, the later one in front)
    return types.map(t => { const e = buildingElevation(t.type, t); const w = e.width - 2 * Math.max(e.type.eaves.typical, 3.5); const it = { e, x: x + w / 2 }; x += w + gap; return it; });
  }, [types, gap]);
  return <ElevationSvg items={items} dims={false} person height={height} label={label} />;
}

function ElevationSvg({ items, dims, person, height, label, style }: { items: { e: Elevation; x: number }[]; dims: boolean; person: boolean; height: number; label: string; style?: CSSProperties }) {
  const uid = useId().replace(/:/g, "");
  const x0 = Math.min(...items.map(i => i.x - i.e.width / 2)) - 1.5, x1 = Math.max(...items.map(i => i.x + i.e.width / 2)) + (dims ? 7 : 1.5), top = Math.max(...items.map(i => i.e.height)) + 1;
  const vb = `${x0} ${-top} ${x1 - x0} ${top + 1.2}`, outline = personOutline();
  return (
    <svg viewBox={vb} height={height} width="100%" role="img" aria-label={label} preserveAspectRatio="xMidYMax meet" style={{ display: "block", maxWidth: "100%", background: "linear-gradient(#cfd9e2, #eef0ec)", borderRadius: 6, ...style }}>
      <defs>
        <filter id={`${uid}-tex`} x="0" y="0" width="1" height="1"><feTurbulence type="fractalNoise" baseFrequency="3.5" numOctaves="3" seed="4" result="n" /><feColorMatrix in="n" type="saturate" values="0" result="g" /><feComponentTransfer in="g" result="t"><feFuncA type="linear" slope="0.18" /></feComponentTransfer><feComposite in="t" in2="SourceGraphic" operator="in" result="tm" /><feBlend in="SourceGraphic" in2="tm" mode="multiply" /></filter>
      </defs>
      {items.map(({ e, x }, k) => {
        const ids = { glass: `${uid}-g${k}`, roof: `${uid}-r${k}`, wall: `${uid}-w${k}` }, pal = palette(e, ids), t = e.type;
        return (
          <g key={k} transform={`translate(${x} 0)`}>
            <defs>
              <linearGradient id={ids.glass} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#5d7183" /><stop offset="0.45" stopColor="#24313d" /><stop offset="0.55" stopColor="#3a4b5a" /><stop offset="1" stopColor="#161d24" /></linearGradient>
              <pattern id={ids.roof} width={t.roof === "thatch-hip" ? 0.6 : 0.3} height={t.roof === "thatch-hip" ? 0.25 : 0.35} patternUnits="userSpaceOnUse">
                <rect width="1" height="1" fill={t.roofColour} />
                {t.roof === "thatch-hip" ? <path d="M0 0.2 L0.6 0.15" stroke={shade(t.roofColour, -0.25)} strokeWidth={0.04} /> : <path d="M0.15 0 V0.35 M0 0.33 H0.3" stroke={shade(t.roofColour, -0.3)} strokeWidth={0.035} />}
              </pattern>
              <linearGradient id={ids.wall} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={shade(t.wall, -0.08)} /><stop offset="1" stopColor={shade(t.wall, 0.06)} /></linearGradient>
            </defs>
            <g filter={`url(#${uid}-tex)`}>
              {e.parts.map((p, i) => p.closed
                ? <path key={i} d={pathOf(p)} fill={pal[p.role]} stroke={p.role === "glass" || p.role === "shade" ? "none" : "rgba(30,24,18,0.35)"} strokeWidth={0.02} />
                : <path key={i} d={pathOf(p)} fill="none" stroke={pal[p.role]} strokeWidth={p.width ?? 0.06} strokeLinecap="round" strokeLinejoin="round" />)}
            </g>
            {dims ? e.dims.map((d, i) => (
              <g key={`d${i}`} stroke="#3a3530" strokeWidth={0.03} fill="none">
                <path d={`M${d.x} ${-d.y0} V${-d.y1} M${d.x - 0.15} ${-d.y0} H${d.x + 0.15} M${d.x - 0.15} ${-d.y1} H${d.x + 0.15}`} />
                <text x={d.x + 0.25} y={-(d.y0 + d.y1) / 2} style={{ font: "0.42px var(--km-font-sans, system-ui)", fill: "#3a3530", stroke: "none" }}>{d.label}</text>
              </g>
            )) : null}
          </g>
        );
      })}
      <rect x={x0} y={0} width={x1 - x0} height={1.2} fill="#8a8174" />
      {person ? <path d={`M${outline.map(([x, y]: FPoint) => `${(x0 + 1 + x).toFixed(3)} ${(-y).toFixed(3)}`).join("L")}Z`} fill="#3a3530" opacity={0.75} /> : null}
    </svg>
  );
}

/** The types and the tables a drawing of buildings needs. */
export function ArchSheet() {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={sheetGrid}>
        {BUILDING_TYPES.map(b => (
          <SheetCard key={b.id} title={`${b.label} — ${b.region}, ${b.period}`}>
            <BuildingElevation type={b.id} height={200} />
            <ul style={{ ...sheetList, ...sheetSmall }}>{b.notes.map(n => <li key={n}>{n}</li>)}</ul>
            <span style={sheetSmall}>Roof {b.pitch.min}–{b.pitch.max}°{b.curvedRoof ? ", curved" : ", straight"}; eaves {b.eaves.typical} m; storey {b.storeyHeight.typical} m. {b.sources.join("; ")}.</span>
          </SheetCard>
        ))}
      </div>
      <div style={sheetGrid}>
        <SheetCard title="The human scale">
          <ul style={{ ...sheetList, ...sheetSmall }}>{Object.entries(HUMAN_SCALE).map(([k, v]) => <li key={k}><b>{k.replace(/([A-Z])/g, " $1").toLowerCase()}</b>: {v.min}–{v.max} m (typical {v.typical}) — {v.source ?? v.grade}</li>)}
            <li><b>Blondel's rule</b>: 2 risers + 1 tread = {BLONDEL_STRIDE.min * 100}–{BLONDEL_STRIDE.max * 100} cm — {BLONDEL_STRIDE.source}</li></ul>
        </SheetCard>
        <SheetCard title="Roof pitch by covering">
          <ul style={{ ...sheetList, ...sheetSmall }}>{ROOF_PITCHES.map(p => <li key={p.covering}><b>{p.covering}</b>: {p.pitch.min}–{p.pitch.max}°. {p.note}</li>)}</ul>
        </SheetCard>
        <SheetCard title="Classical orders (column height in diameters)">
          <ul style={{ ...sheetList, ...sheetSmall }}>{CLASSICAL_ORDERS.map(o => <li key={o.id}><b>{o.label}</b>: {o.height.min === o.height.max ? o.height.typical : `${o.height.min}–${o.height.max}`}. {o.note}</li>)}
            <li><b>Spacing</b>: {INTERCOLUMNIATION.min}–{INTERCOLUMNIATION.max} diameters between columns — {INTERCOLUMNIATION.source}</li></ul>
        </SheetCard>
        <SheetCard title="Japanese modules">
          <ul style={{ ...sheetList, ...sheetSmall }}>{Object.entries(JAPANESE_MODULES).map(([k, v]) => <li key={k}><b>{k}</b>: {v.typical} m — {v.source}</li>)}</ul>
        </SheetCard>
      </div>
    </div>
  );
}
