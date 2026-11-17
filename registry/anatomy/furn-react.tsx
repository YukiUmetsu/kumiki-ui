/**
 * INTERIOR1 React pieces: `FurniturePlate` (one piece on the parchment studio cove), `RoomPlate` (a painted room),
 * `FurnitureSheet` (the body's measurements, clearances, bed sizes, the types with their checks and the period styles),
 * `FurnitureShowcase` (every piece by kind; choose one to see it large) and `RoomLibrary` (the painted rooms).
 * Text is HTML in token colours (`--km-*`); renders run in workers and are cached.
 */
import { useState } from "react";
import type { CSSProperties } from "react";
import { RenderFrame } from "./foundation-render-react";
import { SheetCard, sheetGrid, sheetList, sheetSmall } from "./foundation-react";
import { BED_SIZES, CLEARANCES, ERGONOMICS, FURNITURE_TYPES, INTERIOR_STYLES, checkFurniture } from "./furn-data";
import type { FurnitureKind } from "./furn-data";
import { ROOMS } from "./furn-library";
import { FURN_RENDER_POOL } from "./furn-paint-pool";

export function FurniturePlate({ id, width = 384, height = 216, paint = 0.5, supersample = 1 }: { id: string; width?: number; height?: number; paint?: number; supersample?: number }) {
  const t = FURNITURE_TYPES.find(x => x.id === id), args = { piece: id, width, height, paint, ink: 0.45, supersample };
  return <RenderFrame width={width} height={height} label={`${t?.label ?? id}, on a studio backdrop`} placeholder="var(--km-surface-subtle, #ece5d8)"
    job={{ pool: FURN_RENDER_POOL, kind: "piece", args, affinity: id }} preview={{ pool: FURN_RENDER_POOL, kind: "piece", args: { ...args, width: Math.round(width / 2), height: Math.round(height / 2), supersample: 1, draft: true } }} />;
}
export function RoomPlate({ id, width = 384, height = 216, paint = 1, supersample = 1 }: { id: string; width?: number; height?: number; paint?: number; supersample?: number }) {
  const r = ROOMS.find(x => x.id === id), args = { room: id, width, height, paint, supersample };
  return <RenderFrame width={width} height={height} label={`${r?.label ?? id}, painted room`} placeholder="var(--km-surface-subtle, #8a7a68)"
    job={{ pool: FURN_RENDER_POOL, kind: "room", args, affinity: id }} preview={{ pool: FURN_RENDER_POOL, kind: "room", args: { ...args, width: Math.round(width / 2), height: Math.round(height / 2), supersample: 1, draft: true } }} />;
}

const cm = (v: number) => `${Math.round(v * 100)} cm`;
const rangeText = (r: { min: number; typical: number; max: number; grade: string }) => `${cm(r.min)}–${cm(r.max)} (typical ${cm(r.typical)}; ${r.grade})`;
const label = (k: string) => k.replace(/([A-Z])/g, " $1").toLowerCase();

/** The measurements and the catalogue. */
export function FurnitureSheet() {
  return (
    <div style={sheetGrid}>
      <SheetCard title="Built round the body"><ul style={sheetList}>{Object.entries(ERGONOMICS).map(([k, r]) => <li key={k}><strong>{label(k)}:</strong> {k === "backTilt" ? `${r.min}–${r.max}°` : rangeText(r)}</li>)}</ul></SheetCard>
      <SheetCard title="Room to move"><ul style={sheetList}>{Object.entries(CLEARANCES).map(([k, r]) => <li key={k}><strong>{label(k)}:</strong> {rangeText(r)}</li>)}</ul>
        <h4 style={{ margin: "8px 0 0", font: "600 14px var(--km-font-sans, system-ui)" }}>Mattresses</h4><ul style={sheetList}>{BED_SIZES.map(b => <li key={b.name + b.where}>{b.name} ({b.where}): {cm(b.w)} × {cm(b.l)}</li>)}</ul></SheetCard>
      <SheetCard title="Period rooms" wide><ul style={sheetList}>{INTERIOR_STYLES.map(s => <li key={s.id}><strong>{s.label}</strong> ({s.region}, {s.period}): {s.walls}; {s.floor}; {s.light}. <span style={sheetSmall}>{s.notes}</span></li>)}</ul></SheetCard>
      {FURNITURE_TYPES.map(t => (
        <SheetCard key={t.id} title={t.label}>
          <span style={sheetSmall}>{t.region} · {t.period} · {cm(t.w)} × {cm(t.d)} × {cm(t.h)}{t.seat ? ` · seat ${cm(t.seat)}` : ""}</span>
          <span style={sheetSmall}><strong>Made of:</strong> {t.materials.join("; ")}</span>
          <ul style={sheetList}>{t.notes.map(n => <li key={n}>{n}</li>)}</ul>
          {checkFurniture(t).map(c => <span key={c.label} style={{ ...sheetSmall, color: c.ok ? "var(--km-text-muted, #4e4d4d)" : "var(--km-danger, #a02a1e)" }}>{c.ok ? "✓" : "✗"} {c.label}: {c.note}</span>)}
        </SheetCard>
      ))}
    </div>
  );
}

const card: CSSProperties = { display: "grid", gap: 6, padding: 0, background: "none", color: "inherit", textAlign: "start", cursor: "pointer", borderRadius: 8 };
const KINDS: readonly { id: FurnitureKind; label: string }[] = [{ id: "seat", label: "Seating" }, { id: "table", label: "Tables and desks" }, { id: "storage", label: "Storage" }, { id: "bed", label: "Beds" }, { id: "light", label: "Lighting" }, { id: "fixture", label: "Fireplaces, stoves, clocks, screens" }];

/** Every piece on the studio cove, by kind; choose one to see it large. */
export function FurnitureShowcase({ initial = "ming-horseshoe" }: { initial?: string }) {
  const [open, setOpen] = useState(initial), [paint, setPaint] = useState(0.5), sel = FURNITURE_TYPES.find(t => t.id === open) ?? FURNITURE_TYPES[0];
  return (
    <div style={{ display: "grid", gap: 20 }}>
      <section aria-label="Selected piece" style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))", alignItems: "start" }}>
        <div style={{ gridColumn: "span 2", minWidth: 0 }}><FurniturePlate id={sel.id} width={960} height={540} supersample={2} paint={paint} /></div>
        <div style={{ display: "grid", gap: 6, font: "14px/1.45 var(--km-font-sans, system-ui)", color: "var(--km-text-primary, #26211d)" }}>
          <h3 style={{ margin: 0, font: "600 18px var(--km-font-sans, system-ui)" }}>{sel.label}</h3>
          <span style={sheetSmall}>{sel.region} · {sel.period} · {cm(sel.w)} × {cm(sel.d)} × {cm(sel.h)}</span>
          <span style={sheetSmall}><strong>Made of:</strong> {sel.materials.join("; ")}</span>
          <ul style={sheetList}>{sel.notes.map(n => <li key={n}>{n}</li>)}</ul>
          <code style={sheetSmall}>buildFurniture(b, "{sel.id}")</code>
          <label style={{ display: "grid", gap: 4, font: "600 13px var(--km-font-sans, system-ui)" }}>Paint {Math.round(paint * 100)}%<input type="range" min={0} max={1} step={0.25} value={paint} onChange={e => setPaint(Number(e.target.value))} /></label>
        </div>
      </section>
      {KINDS.map(k => (
        <section key={k.id} aria-labelledby={`furn-${k.id}`} style={{ display: "grid", gap: 10 }}>
          <h3 id={`furn-${k.id}`} style={{ margin: 0, font: "600 17px var(--km-font-sans, system-ui)" }}>{k.label}</h3>
          <ul style={{ ...sheetGrid, listStyle: "none", margin: 0, padding: 0, gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 240px), 1fr))" }}>
            {FURNITURE_TYPES.filter(t => t.kind === k.id).map(t => (
              <li key={t.id}><button type="button" aria-pressed={open === t.id} onClick={() => setOpen(t.id)} style={{ ...card, border: open === t.id ? "2px solid var(--km-text-primary, #26211d)" : "2px solid transparent" }}>
                <FurniturePlate id={t.id} /><span style={{ font: "600 15px/1.3 var(--km-font-sans, system-ui)", padding: "0 2px 2px" }}>{t.label}</span></button>
                <span style={sheetSmall}>{t.region} · {t.period}</span></li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/** The painted rooms; choose one to see it large. */
export function RoomLibrary({ initial = "scholar-studio" }: { initial?: string }) {
  const [open, setOpen] = useState(initial), sel = ROOMS.find(r => r.id === open) ?? ROOMS[0];
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section aria-label="Selected room" style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))", alignItems: "start" }}>
        <div style={{ gridColumn: "span 2", minWidth: 0 }}><RoomPlate id={sel.id} width={960} height={540} supersample={2} /></div>
        <div style={{ display: "grid", gap: 6 }}><h3 style={{ margin: 0, font: "600 18px var(--km-font-sans, system-ui)" }}>{sel.label}</h3><p style={{ ...sheetSmall, margin: 0 }}>{sel.note}</p></div>
      </section>
      <ul style={{ ...sheetGrid, listStyle: "none", margin: 0, padding: 0, gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 280px), 1fr))" }}>
        {ROOMS.map(r => <li key={r.id}><button type="button" aria-pressed={open === r.id} onClick={() => setOpen(r.id)} style={{ ...card, border: open === r.id ? "2px solid var(--km-text-primary, #26211d)" : "2px solid transparent" }}><RoomPlate id={r.id} /><span style={{ font: "600 15px/1.3 var(--km-font-sans, system-ui)", padding: "0 2px 2px" }}>{r.label}</span></button></li>)}
      </ul>
    </div>
  );
}
