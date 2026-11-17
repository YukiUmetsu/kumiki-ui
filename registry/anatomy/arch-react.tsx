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
  const t = e.type, brick = t.id === "georgian-townhouse";
  return {
    wall: brick ? `url(#${ids.wall}-brick)` : `url(#${ids.wall})`, shade: "rgba(20,16,12,0.45)", roof: `url(#${ids.roof})`, "roof-line": shade(t.roofColour, -0.35), window: shade(t.trim, -0.2), glass: `url(#${ids.glass})`,
    frame: brick ? "#f1ece2" : shade(t.trim, 0.05), door: brick ? "#22303a" : t.id === "greek-temple" ? "#4d3b29" : `url(#${ids.wall}-grain)`, timber: `url(#${ids.wall}-grain)`, lattice: shade(t.trim, -0.35),
    column: `url(#${ids.wall}-col)`, ornament: t.id === "machiya" ? "#b39a68" : "#c9a23a", step: "#d9d2c3",
    // the keep's base shows only in the joints between its stones
    base: t.id === "castle-keep" ? "#4f483e" : "#8f8a80", bracket: shade(t.trim, 0.1), plaster: brick ? "#e7e1d3" : shade(t.wall, 0.45), beam: t.id === "greek-temple" ? "#ddd6c7" : shade(t.trim, -0.05), cloth: "#2c3a5a",
    cast: "rgba(30,26,40,0.3)", "tile-end": shade(t.roofColour, -0.18), stone: STONE, "brick-arch": "#a9563b", iron: "#1c1e21", straw: `url(#${ids.roof}-straw)`,
  };
}

/** A column's colour: marble on a Greek temple, vermilion lacquer elsewhere. */
const columnColour = (t: Elevation["type"]) => t.id === "greek-temple" ? "#e9e3d6" : "#9b3b28";

/** Ishigaki granite, warm grey-brown; each stone shaded by its own tone. */
const STONE = "#a39479";
const fillOf = (p: ElevationPart, pal: Record<PartRole, string>) => p.role === "stone" ? shade(STONE, (p.tone ?? 0) * 0.16) : pal[p.role];
const strokeOf = (p: ElevationPart) => p.role === "glass" || p.role === "shade" || p.role === "cast" ? "none" : p.role === "stone" ? "rgba(40,32,24,0.55)" : "rgba(30,24,18,0.35)";

/** Japanese fired-clay tiles (kawara): every Japanese roof but thatch. */
const kawara = (t: Elevation["type"]) => t.region === "Japan" && t.roof !== "thatch-hip";

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
              <pattern id={ids.roof} width={t.roof === "thatch-hip" ? 0.6 : 0.3} height={t.roof === "thatch-hip" ? 0.25 : kawara(t) ? 0.27 : 0.35} patternUnits="userSpaceOnUse">
                <rect width="1" height="1" fill={t.roofColour} />
                {t.roof === "thatch-hip" ? <>
                    {/* straw laid down the slope in courses */}
                    <path d="M0.03 0 L0.036 0.25 M0.09 0 L0.084 0.25 M0.14 0 L0.146 0.25 M0.2 0 L0.195 0.25 M0.26 0 L0.266 0.25 M0.33 0 L0.324 0.25 M0.39 0 L0.396 0.25 M0.45 0 L0.444 0.25 M0.52 0 L0.526 0.25 M0.57 0 L0.565 0.25" stroke={shade(t.roofColour, -0.22)} strokeWidth={0.014} />
                    <path d="M0.06 0 L0.062 0.25 M0.17 0 L0.168 0.25 M0.3 0 L0.302 0.25 M0.42 0 L0.418 0.25 M0.55 0 L0.552 0.25" stroke={shade(t.roofColour, 0.18)} strokeWidth={0.01} />
                  </>
                  : kawara(t) ? <>
                    {/* S-section tiles in rows: a lit crest, a dark channel, the lap of each course a shallow wave */}
                    <rect x={0.03} width={0.09} height={0.27} fill={shade(t.roofColour, 0.2)} />
                    <rect x={0.18} width={0.07} height={0.27} fill={shade(t.roofColour, -0.28)} />
                    <path d="M0 0.255 Q0.075 0.215 0.15 0.255 Q0.225 0.285 0.3 0.255" stroke={shade(t.roofColour, -0.4)} strokeWidth={0.022} fill="none" />
                    {/* a keep's round-tile joints plastered white (Himeji) */}
                    {t.id === "castle-keep" ? <rect x={0.13} width={0.03} height={0.27} fill="#ecebe6" opacity={0.9} /> : null}
                  </>
                  : <path d="M0.15 0 V0.35 M0 0.33 H0.3" stroke={shade(t.roofColour, -0.3)} strokeWidth={0.035} />}
              </pattern>
              {/* a column lit from the left: its roundness */}
              <linearGradient id={`${ids.wall}-col`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor={shade(columnColour(t), -0.06)} /><stop offset="0.32" stopColor={shade(columnColour(t), 0.12)} /><stop offset="0.75" stopColor={shade(columnColour(t), -0.1)} /><stop offset="1" stopColor={shade(columnColour(t), -0.32)} /></linearGradient>
              {/* the cut edge of thatch at the eaves: straw ends, golden, in layers */}
              <pattern id={`${ids.roof}-straw`} width={0.12} height={0.27} patternUnits="userSpaceOnUse">
                <rect width="0.12" height="0.27" fill={shade(t.roofColour, 0.16)} />
                <path d="M0.02 0 V0.27 M0.055 0 V0.27 M0.09 0 V0.27" stroke={shade(t.roofColour, -0.12)} strokeWidth={0.012} />
                <path d="M0 0.26 H0.12" stroke={shade(t.roofColour, -0.28)} strokeWidth={0.02} />
              </pattern>
              <linearGradient id={ids.wall} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={shade(t.wall, -0.08)} /><stop offset="1" stopColor={shade(t.wall, 0.06)} /></linearGradient>
              {/* brick at its real size: 215 × 65 mm with 10 mm joints (courses 75 mm), Flemish bond (stretcher, header) */}
              <pattern id={`${ids.wall}-brick`} width={0.68} height={0.15} patternUnits="userSpaceOnUse">
                <rect width="0.68" height="0.15" fill={shade(t.wall, 0.25)} />
                {[[0, 0, 0.215], [0.225, 0, 0.1025], [0.3375, 0, 0.215], [0.5625, 0, 0.1025], [-0.05, 0.075, 0.1025], [0.0625, 0.075, 0.215], [0.2875, 0.075, 0.1025], [0.4, 0.075, 0.215], [0.625, 0.075, 0.1025]].map(([x, y, bw], k) =>
                  <rect key={k} x={x} y={y} width={bw} height={0.065} fill={shade(t.wall, [-0.06, 0.04, -0.02, 0.08, 0.02, -0.08, 0.06, 0, -0.04][k])} />)}
              </pattern>
              {/* timber with its grain running along it */}
              <pattern id={`${ids.wall}-grain`} width={0.6} height={0.05} patternUnits="userSpaceOnUse">
                <rect width="0.6" height="0.05" fill={t.trim} />
                <path d="M0 0.012 Q0.3 0.02 0.6 0.01 M0 0.034 Q0.25 0.026 0.6 0.038" stroke={shade(t.trim, 0.18)} strokeWidth={0.006} fill="none" />
              </pattern>
            </defs>
            <g filter={`url(#${uid}-tex)`}>
              {e.parts.map((p, i) => p.closed
                ? <path key={i} d={pathOf(p)} fill={fillOf(p, pal)} stroke={strokeOf(p)} strokeWidth={p.role === "stone" ? 0.03 : 0.02} />
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
