/**
 * ARCH1 storybook React pieces:
 *
 * - `StorybookPlate`: one library entry painted in a worker (`arch-paint.ts`), cached, with a quick preview first.
 * - `SurfaceStudy`, `ImperfectionStudy`: the style guide's material and age studies.
 * - `ArchLibraryGallery`: all 100 entries as cards, filtered by tradition, view, scale and text; choosing a card opens
 *   it large with its light and paint controls.
 * - `ArchStyleGuide`: what the plates are made of (surfaces at real size, light, age, paint), each shown rendered.
 *
 * Text is HTML in token colours (`--km-*`), so themes and dark mode restyle it; the plates are pictures with labels.
 */
import { useId, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { RenderFrame } from "./foundation-render-react";
import { SheetCard, sheetGrid, sheetList, sheetSmall } from "./foundation-react";
import { ARCH_LIBRARY, LIBRARY_GROUPS } from "./arch-library";
import type { LibraryEntry, LibraryGroup } from "./arch-library";
import { MOODS } from "./arch-paint";
import type { MoodId } from "./arch-paint";
import type { SurfaceSpec } from "./arch-surface";
import { ARCH_RENDER_POOL } from "./arch-paint-pool";

export interface StorybookPlateProps { id: string; width?: number; height?: number; mood?: MoodId; paint?: number; ink?: number; supersample?: number; label?: string; style?: CSSProperties }
/** A library entry painted as a storybook plate (in a worker, cached; a smaller preview first). */
export function StorybookPlate({ id, width = 640, height = 360, mood, paint, ink, supersample = 1, label, style }: StorybookPlateProps) {
  const e = ARCH_LIBRARY.find(x => x.id === id);
  const args = { id, width, height, supersample, mood, paint, ink };
  return <RenderFrame width={width} height={height} label={label ?? `${e?.label ?? id}, painted storybook plate`} placeholder="var(--km-surface-subtle, #d9d3c7)" style={style}
    job={{ pool: ARCH_RENDER_POOL, kind: "plate", args, affinity: id }}
    preview={{ pool: ARCH_RENDER_POOL, kind: "plate", args: { ...args, width: Math.round(width / 2), height: Math.round(height / 2), supersample: 1, draft: true } }} />;
}
/** A surface under raking light on a wall, a roof or the ground. */
export function SurfaceStudy({ surface, form = "wall", label, width = 320, height = 180 }: { surface: SurfaceSpec; form?: "wall" | "roof" | "ground"; label: string; width?: number; height?: number }) {
  const args = { study: "surface", surface, form, width, height, supersample: 2 };
  return <RenderFrame width={width} height={height} label={label} placeholder="var(--km-surface-subtle, #d9d3c7)" job={{ pool: ARCH_RENDER_POOL, kind: "study", args }} />;
}
/** Three houses: true, leaning and sagging. */
export function ImperfectionStudy({ lean, sag, label, width = 640, height = 360 }: { lean: number; sag: number; label: string; width?: number; height?: number }) {
  return <RenderFrame width={width} height={height} label={label} placeholder="var(--km-surface-subtle, #d9d3c7)" job={{ pool: ARCH_RENDER_POOL, kind: "study", args: { study: "imperfection", lean, sag, width, height } }} />;
}

// ---- Gallery -------------------------------------------------------------------------------------------------------------------

const chip: CSSProperties = { display: "inline-flex", alignItems: "center", minHeight: 32, padding: "4px 12px", borderRadius: 999, border: "1px solid var(--km-border-default, #a99c8c)",
  background: "var(--km-surface-default, #fff)", color: "var(--km-text-primary, #26211d)", font: "600 13px/1.2 var(--km-font-sans, system-ui, sans-serif)", cursor: "pointer" };
const chipOn: CSSProperties = { ...chip, background: "var(--km-text-primary, #26211d)", color: "var(--km-surface-default, #fff)", borderColor: "var(--km-text-primary, #26211d)" };
const tag: CSSProperties = { display: "inline-block", padding: "2px 8px", borderRadius: 999, background: "var(--km-surface-subtle, #f1ece4)", color: "var(--km-text-muted, #5b524b)", font: "12px/1.5 var(--km-font-sans, system-ui, sans-serif)" };
const field: CSSProperties = { display: "grid", gap: 4, font: "600 13px/1.3 var(--km-font-sans, system-ui, sans-serif)", color: "var(--km-text-primary, #26211d)" };
const input: CSSProperties = { minHeight: 36, padding: "4px 10px", borderRadius: 6, border: "1px solid var(--km-border-default, #a99c8c)", background: "var(--km-surface-default, #fff)", color: "inherit", font: "14px var(--km-font-sans, system-ui, sans-serif)" };

const VIEWS = ["exterior", "interior"] as const, SCALES = ["humble", "domestic", "civic", "monumental"] as const;

/** All entries, filterable; choosing one opens it large with light and paint controls. */
export function ArchLibraryGallery({ initial = "cotswold-cottage" }: { initial?: string }) {
  const uid = useId();
  const [group, setGroup] = useState<LibraryGroup | "all">("all"), [view, setView] = useState<string>("all"), [scale, setScale] = useState<string>("all"), [q, setQ] = useState("");
  const [open, setOpen] = useState(initial), [mood, setMood] = useState<MoodId | "own">("own"), [paint, setPaint] = useState(1);
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return ARCH_LIBRARY.filter(e => (group === "all" || e.group === group) && (view === "all" || e.view === view) && (scale === "all" || e.scale === scale)
      && (!s || [e.label, e.region, e.era, ...e.materials, ...e.story].some(t => t.toLowerCase().includes(s))));
  }, [group, view, scale, q]);
  const sel = ARCH_LIBRARY.find(e => e.id === open) ?? ARCH_LIBRARY[0];
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section aria-labelledby={`${uid}-sel`} style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))", alignItems: "start" }}>
        <div style={{ gridColumn: "span 2", minWidth: 0 }}>
          <StorybookPlate id={sel.id} width={960} height={540} supersample={2} mood={mood === "own" ? undefined : mood} paint={paint} />
        </div>
        <EntryText e={sel} headingId={`${uid}-sel`} large>
          <div style={{ display: "grid", gap: 10 }}>
            <label style={field}>Light
              <select style={input} value={mood} onChange={ev => setMood(ev.target.value as MoodId | "own")}>
                <option value="own">The entry's own ({sel.mood})</option>
                {(Object.keys(MOODS) as MoodId[]).map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </label>
            <label style={field}>Paint {Math.round(paint * 100)}% (0 = plain render)
              <input type="range" min={0} max={1} step={0.25} value={paint} onChange={ev => setPaint(Number(ev.target.value))} />
            </label>
          </div>
        </EntryText>
      </section>
      <div role="group" aria-label="Filter the library" style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "end" }}>
        <label style={field}>Tradition
          <select style={input} value={group} onChange={ev => setGroup(ev.target.value as LibraryGroup | "all")}>
            <option value="all">All ({ARCH_LIBRARY.length})</option>
            {LIBRARY_GROUPS.map(g => <option key={g.id} value={g.id}>{g.label} ({ARCH_LIBRARY.filter(e => e.group === g.id).length})</option>)}
          </select>
        </label>
        <div role="group" aria-label="View" style={{ display: "flex", gap: 6 }}>{["all", ...VIEWS].map(v => <button key={v} type="button" style={view === v ? chipOn : chip} aria-pressed={view === v} onClick={() => setView(v)}>{v}</button>)}</div>
        <div role="group" aria-label="Scale" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{["all", ...SCALES].map(v => <button key={v} type="button" style={scale === v ? chipOn : chip} aria-pressed={scale === v} onClick={() => setScale(v)}>{v}</button>)}</div>
        <label style={{ ...field, flex: "1 1 220px" }}>Search materials, places, details
          <input style={input} type="search" value={q} placeholder="slate, ivy, canal, lantern…" onChange={ev => setQ(ev.target.value)} />
        </label>
      </div>
      <p style={{ ...sheetSmall, margin: 0 }} aria-live="polite">{list.length} of {ARCH_LIBRARY.length} structures</p>
      <ul style={{ ...sheetGrid, listStyle: "none", margin: 0, padding: 0, gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 280px), 1fr))" }}>
        {list.map(e => (
          <li key={e.id} style={{ display: "grid", gap: 6, alignContent: "start", minWidth: 0 }}>
            <button type="button" onClick={() => { setOpen(e.id); setMood("own"); }} aria-pressed={open === e.id} aria-label={`Open ${e.label} large`}
              style={{ padding: 0, border: open === e.id ? "2px solid var(--km-text-primary, #26211d)" : "2px solid transparent", borderRadius: 8, background: "none", cursor: "pointer" }}>
              <StorybookPlate id={e.id} width={384} height={216} />
            </button>
            <EntryText e={e} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function EntryText({ e, large, headingId, children }: { e: LibraryEntry; large?: boolean; headingId?: string; children?: ReactNode }) {
  const H = large ? "h3" : "h4";
  return (
    <div style={{ display: "grid", gap: 6, minWidth: 0, color: "var(--km-text-primary, #26211d)", font: "14px/1.45 var(--km-font-sans, system-ui, sans-serif)" }}>
      <H id={headingId} style={{ margin: 0, font: `600 ${large ? 18 : 15}px/1.3 var(--km-font-sans, system-ui, sans-serif)`, overflowWrap: "anywhere" }}>{e.label}</H>
      <span style={sheetSmall}>{e.region} · {e.era} · {e.setting}, {e.view}, {e.scale}</span>
      <span style={{ ...sheetSmall, overflowWrap: "anywhere" }}><strong>Made of:</strong> {e.materials.join("; ")}</span>
      <span style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>{e.story.map(s => <span key={s} style={tag}>{s}</span>)}</span>
      {large ? <p style={{ ...sheetSmall, margin: 0 }}><strong>From the references:</strong> {e.note}</p> : null}
      {children}
    </div>
  );
}

// ---- Style guide ----------------------------------------------------------------------------------------------------------

const SURFACES: readonly { label: string; s: SurfaceSpec; form?: "wall" | "roof" | "ground"; note: string }[] = [
  { label: "Weathered oak frame with pegs", s: { kind: "timber-frame", colour: "#e8dcc2", colour2: "#4a3a2c", pattern: "close", storey: 2.6, sill: 0.9, spacing: 0.5, age: 0.6 }, note: "Studs as wide as the gaps (close studding), proud of the infill; oak pegs at the joints; grain along each member." },
  { label: "Rough limestone, mossy joints", s: { kind: "rubble", colour: "#b3a68c", moss: 0.8, age: 0.7 }, note: "Random rubble 0.15–0.4 m in 10–30 mm mortar; moss lives in the joints and on what faces up." },
  { label: "Cotswold coursed rubble", s: { kind: "coursed-rubble", colour: "#c9a66a", moss: 0.3, age: 0.6 }, note: "Thin honey-coloured beds of varied height, laid flat." },
  { label: "Granite ashlar", s: { kind: "ashlar", colour: "#9a958c", course: 0.4, age: 0.6, moss: 0.3 }, note: "Courses 0.25–0.45 m, joints 3–10 mm, worn arrises." },
  { label: "Flaking limewash over brick", s: { kind: "limewash", colour: "#efe8d8", flake: 0.55, under: "brick", age: 0.6 }, note: "Salt and damp push the coat off near the ground and where water runs; the brick shows through." },
  { label: "Brick in Flemish bond", s: { kind: "brick", colour: "#9b4f37", pattern: "flemish", age: 0.5 }, note: "215 × 65 mm units, 10 mm joints; headers and stretchers alternate; burnt headers chequer." },
  { label: "Handmade clay tiles", s: { kind: "plain-tile", colour: "#8f5038", age: 0.6, moss: 0.4 }, form: "roof", note: "A 100 mm gauge, each tile cambered and fired a little differently; moss in the laps." },
  { label: "Stone slates, diminishing", s: { kind: "stone-slate", colour: "#968668", moss: 0.6, age: 0.6, eave: 0.6, ridge: 2.3 }, form: "roof", note: "Largest at the eaves, smallest at the ridge." },
  { label: "Welsh slate", s: { kind: "slate", colour: "#4b5058" }, form: "roof", note: "Courses about 0.2 m deep, a faint sheen; wet, they mirror the sky." },
  { label: "Roman coppi", s: { kind: "pantile", colour: "#a85f3e", age: 0.6 }, form: "roof", note: "Covering tiles in ribs about 0.2 m apart over flat tiles; lichen on the crowns." },
  { label: "Patinated copper", s: { kind: "copper", age: 0.75 }, form: "roof", note: "Brown first, then green in streaks over 10–30 years; seams stay brown longest." },
  { label: "Straw thatch", s: { kind: "thatch", colour: "#ad8f58", age: 0.4, moss: 0.2 }, form: "roof", note: "Stalk ends stepping out of a thick coat; greys and greens as it ages." },
  { label: "Hand-laid cobbles", s: { kind: "cobbles", moss: 0.4 }, form: "ground", note: "Domed stones about 0.16 m, polished tops, dark grit and moss between." },
  { label: "Leaded lights", s: { kind: "leaded" }, note: "Diamond quarries about 0.1 × 0.15 m in 6 mm lead cames." },
  { label: "Zellige", s: { kind: "zellige", colour: "#2f6f73", colour2: "#efe7d3", unit: 0.09, pattern: "star" }, note: "Glazed cut-tile stars and crosses in grout, glossy." },
  { label: "Pisé (rammed earth)", s: { kind: "mudbrick", colour: "#b8805a" }, note: "Lifts about 0.7 m with a row of putlog holes." },
];

/** What the plates are made of: surfaces at real size, the lights, age, and the paint. */
export function ArchStyleGuide() {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={sheetGrid}>
        <SheetCard title="The rules of the plates" wide>
          <ul style={sheetList}>
            <li><strong>Perspective:</strong> a level camera at a person's eye with a shifted lens, so verticals stay vertical (two-point perspective), as architectural illustrators draw.</li>
            <li><strong>Structure first:</strong> doors about 2 m, storeys about 3 m, roofs at the pitch their covering needs (thatch and stone slate steep, Roman tile low); openings cut through walls with real reveals.</li>
            <li><strong>Materials at real size:</strong> courses, joints, tiles, studs and cobbles at the sizes builders use, fading to their average when finer than a pixel (no moiré).</li>
            <li><strong>Age:</strong> moss where it stays damp, grime that runs from ledges, limewash that flakes low down, copper that streaks green, soot on chimneys, ivy on the shady wall; ridges sag and old houses lean.</li>
            <li><strong>Light:</strong> warm sun and cool sky light; soft shadows; ambient occlusion in corners; dapples under trees; lamps, candles and fires by colour temperature (candle about 1850 K) with inverse-square falloff; sun shafts through windows; wet stone that mirrors the lamps.</li>
            <li><strong>Paint:</strong> washes that soften texture inside each shape, cool coloured shadows, the darkest darks in the openings, a thin broken sepia line on edges (never a heavy outline), pigment pooling and granulation, paper through the lights.</li>
          </ul>
        </SheetCard>
      </div>
      <h3 style={{ margin: 0, font: "600 17px var(--km-font-sans, system-ui)" }}>Surfaces at real size</h3>
      <ul style={{ ...sheetGrid, listStyle: "none", margin: 0, padding: 0, gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 240px), 1fr))" }}>
        {SURFACES.map(x => <li key={x.label} style={{ display: "grid", gap: 6, alignContent: "start" }}><SurfaceStudy surface={x.s} form={x.form} label={`${x.label}, rendered study`} /><strong style={{ font: "600 14px var(--km-font-sans, system-ui)" }}>{x.label}</strong><span style={sheetSmall}>{x.note}</span></li>)}
      </ul>
      <h3 style={{ margin: 0, font: "600 17px var(--km-font-sans, system-ui)" }}>One cottage in every light</h3>
      <ul style={{ ...sheetGrid, listStyle: "none", margin: 0, padding: 0, gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 280px), 1fr))" }}>
        {(["morning", "noon", "golden", "dusk", "night", "rain", "rain-night", "overcast", "winter"] as MoodId[]).map(m => <li key={m} style={{ display: "grid", gap: 4 }}><StorybookPlate id="cotswold-cottage" width={384} height={216} mood={m} label={`Cotswold cottage, ${m} light`} /><span style={sheetSmall}>{m}</span></li>)}
      </ul>
      <h3 style={{ margin: 0, font: "600 17px var(--km-font-sans, system-ui)" }}>Age: a lean and a sagging ridge</h3>
      <p style={{ ...sheetSmall, margin: 0, maxWidth: 820 }}>The middle and right houses lean forward (as Amsterdam canal houses were built to, a few centimetres per storey, and as settled piles lean them further) and their ridges sag; the brick house on the left stands true.</p>
      <div style={{ maxWidth: 960 }}><ImperfectionStudy lean={0.025} sag={0.25} label="Three houses: true, leaning with a sagging ridge, and leaning more" /></div>
      <h3 style={{ margin: 0, font: "600 17px var(--km-font-sans, system-ui)" }}>Paint: from render to watercolour</h3>
      <ul style={{ ...sheetGrid, listStyle: "none", margin: 0, padding: 0, gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 280px), 1fr))" }}>
        {[0, 0.5, 1].map(p => <li key={p} style={{ display: "grid", gap: 4 }}><StorybookPlate id="tudor-jettied-house" width={384} height={216} paint={p} label={`Tudor house, paint ${p * 100}%`} /><span style={sheetSmall}>paint {p * 100}%{p === 0 ? " (plain render)" : ""}</span></li>)}
      </ul>
    </div>
  );
}
