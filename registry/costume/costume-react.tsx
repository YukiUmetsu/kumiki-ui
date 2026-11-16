/**
 * COSTUME1 React pieces: a garment or an outfit drawn as a construction on the scale person, a world-by-time matrix,
 * garment cards with their tags, and the reference sheet.
 */
import type { CSSProperties } from "react";
import { personOutline, smoothClosedPath } from "../anatomy/foundation-shapes";
import { MUTED, SheetCard, sheetGrid, sheetList, sheetSmall } from "../anatomy/foundation-react";
import type { GarmentRecord, Outfit } from "./costume-data";
import { COSTUME_SOURCES, GARMENTS, OUTFITS, REGIONS } from "./costume-data";
import { garmentTags, outfitGarments, regionWithin } from "./costume-query";
import { garmentShape } from "./costume-shapes";

/** A plain colour for each garment's construction (estimated from its description: white togas and thawbs, black abayas). */
const COLOURS: Record<string, string> = {
  toga: "#efe9dc", thawb: "#f1efe8", chiton: "#ece6d6", "habesha-kemis": "#f2efe6", abaya: "#26252a", chador: "#2a2a2f", gat: "#1d1c1f", keffiyeh: "#e6e0d6",
  kente: "#d4a531", junihitoe: "#8e2f4a", sokutai: "#2b2a3a", hakama: "#7c2a2a", kamishimo: "#3f4a57", yukata: "#2f4f7a", furisode: "#b8324a", kimono: "#4a5f7d",
  kosode: "#6a4a3a", obi: "#c9a45a", cheongsam: "#9c2a33", crinoline: "#6f5a7e", bustle: "#4f6a5a", "robe-a-la-francaise": "#b9c7a5", "frock-coat": "#2c2c34",
  suit: "#3a3f4a", "zoot-suit": "#5a3d6a", kilt: "#3f5a46", dirndl: "#6b8a5a", lederhosen: "#6b4b30", sarafan: "#b03a32", sari: "#c0573a", lehenga: "#a3324a",
  poncho: "#9a5a3a", parka: "#8a7258", jeans: "#3a5a86", boubou: "#4a7aa0", agbada: "#6a5a8a", dashiki: "#c2803a", huipil: "#e8e0cc", deel: "#3a6a8a",
};
/** Obi, sashes and braces in a contrasting colour (estimated: a gold-ochre band reads on most grounds). */
const BAND = "#c9a45a";
const colourOf = (g: GarmentRecord) => COLOURS[g.id] ?? `hsl(${[...g.id].reduce((a, c) => a + c.charCodeAt(0), 0) % 360} 28% 46%)`;
const PERSON = smoothClosedPath(personOutline());

/** One or more garments drawn in order on the scale person (front view, metres). */
export function CostumeFigure({ garments, label, height = 200 }: { garments: readonly GarmentRecord[]; label?: string; height?: number }) {
  return (
    <svg role="img" aria-label={label ?? garments.map(g => g.name).join(", ")} viewBox="-.85 -2.02 1.7 2.08" style={{ display: "block", width: "100%", height }} preserveAspectRatio="xMidYMax meet">
      <g transform="scale(1 -1)">
        <path d={PERSON} fill={MUTED} opacity=".22" />
        {garments.map(g => {
          const s = garmentShape(g), c = colourOf(g);
          return (
            <g key={g.id}>
              <path d={s.legs} fill={c} stroke="#00000033" strokeWidth={.006} />
              <path d={s.body} fill={c} stroke="#00000033" strokeWidth={.006} />
              <path d={s.sleeves} fill={c} stroke="#00000033" strokeWidth={.006} />
              <path d={s.details} fill={c} stroke="#00000044" strokeWidth={.005} />
              <path d={s.drape} fill={c} fillOpacity=".7" stroke="#ffffff" strokeOpacity=".6" strokeWidth={.006} />
              <path d={s.trim} fill="#f4f1ea" stroke="#00000044" strokeWidth={.005} />
              <path d={s.bands} fill={g.id === "obi" ? c : BAND} stroke="#00000044" strokeWidth={.005} />
              <path d={s.lines} fill="none" stroke="#00000040" strokeWidth={.005} />
            </g>
          );
        })}
      </g>
    </svg>
  );
}

const chip: CSSProperties = { display: "inline-block", padding: "1px 7px", margin: "0 4px 4px 0", borderRadius: 999, border: "1px solid var(--km-border-subtle, #cecac8)", font: "12px/1.6 var(--km-font-sans, system-ui, sans-serif)", color: "var(--km-text-muted, #4e4d4d)" };
const yearText = (y: number) => (y < 0 ? `${-y} BCE` : `${y}`);

/** A garment's card: its construction, names, period, tags, what it is and how to draw it. */
export function GarmentCard({ g }: { g: GarmentRecord }) {
  return (
    <SheetCard title={`${g.name}${g.local ? ` · ${g.local}` : ""}`}>
      <CostumeFigure garments={[g]} height={170} />
      <p style={{ ...sheetSmall, margin: 0 }}>{yearText(g.period.from)}–{g.period.to === null ? "today" : yearText(g.period.to)} ({g.period.grade}{g.period.note ? `: ${g.period.note}` : ""}). {g.description}</p>
      <ul style={{ ...sheetList, ...sheetSmall }}>{g.drawing.map(t => <li key={t}>{t}</li>)}</ul>
      <div>{garmentTags(g).map(t => <span key={t} style={chip}>{t}</span>)}</div>
      <p style={{ ...sheetSmall, margin: 0 }}><a href={g.source}>Source</a>{g.styles?.length ? ` · drawn in ${g.styles.map(s => `${s.style} (${s.pack}: ${s.id})`).join(", ")}` : ""}</p>
    </SheetCard>
  );
}

/** An outfit: its garments layered on the scale person. */
export function OutfitCard({ o }: { o: Outfit }) {
  const gs = outfitGarments(o);
  return (
    <figure style={{ margin: 0, display: "grid", gap: 4, width: 150 }}>
      <CostumeFigure garments={gs} height={180} label={`${o.name}: ${gs.map(g => g.name).join(", ")}`} />
      <figcaption style={{ ...sheetSmall, lineHeight: 1.35 }}><b>{o.name}</b>, {yearText(o.year)} · {o.countries.join(", ")}<br />{gs.map(g => g.name).join(" + ")}. {o.notes}</figcaption>
    </figure>
  );
}

const BINS: readonly [number, number, string][] = [[-3000, 0, "before 1 CE"], [0, 1000, "1–1000"], [1000, 1500, "1000–1500"], [1500, 1700, "1500–1700"], [1700, 1800, "1700s"], [1800, 1900, "1800s"], [1900, 3000, "1900–today"]];
// "europe" lists garments tagged for the whole continent; the sub-regions list their own.
const ROWS = ["eastern-asia", "south-eastern-asia", "southern-asia", "western-asia", "northern-africa", "sub-saharan-africa", "europe", "southern-europe", "western-europe", "northern-europe", "eastern-europe", "northern-america", "latin-america", "oceania"];

/** Regions down, time across: which garments were worn where and when. */
export function WorldTimeMatrix() {
  const cell: CSSProperties = { padding: 6, borderBottom: "1px solid var(--km-border-subtle, #e2deda)", verticalAlign: "top", font: "12px/1.4 var(--km-font-sans, system-ui, sans-serif)" };
  return (
    <div style={{ overflowX: "auto" }} tabIndex={0} aria-label="Garments by region and period, scrolls sideways on narrow screens">
      <table style={{ borderCollapse: "collapse", minWidth: 900, width: "100%" }}>
        <thead><tr><th style={{ ...cell, textAlign: "left" }}>Region</th>{BINS.map(b => <th key={b[2]} style={{ ...cell, textAlign: "left" }}>{b[2]}</th>)}</tr></thead>
        <tbody>
          {ROWS.map(r => (
            <tr key={r}>
              <th style={{ ...cell, textAlign: "left", fontWeight: 600 }}>{r === "europe" ? "Europe (across the continent)" : REGIONS.find(x => x.id === r)?.name}</th>
              {BINS.map(([a, b, k]) => {
                const list = GARMENTS.filter(g => g.region !== "world" && (r === "europe" ? g.region === "europe" : regionWithin(g.region, r)) && g.period.from < b && (g.period.to ?? 3000) >= a);
                return <td key={k} style={cell}>{list.map(g => g.name).join(", ")}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The COSTUME1 reference sheet. */
export function CostumeSheet() {
  const groups: [string, string[]][] = [["Japan", ["eastern-asia:JP"]], ["China, Korea and Mongolia", ["eastern-asia:CN", "eastern-asia:KR", "eastern-asia:MN"]], ["South and South-east Asia", ["southern-asia", "south-eastern-asia"]],
    ["Western Asia and North Africa", ["western-asia", "northern-africa"]], ["Europe", ["europe"]], ["Sub-Saharan Africa", ["sub-saharan-africa"]], ["Americas and Oceania", ["americas", "oceania", "world"]]];
  const inGroup = (g: GarmentRecord, keys: string[]) => keys.some(k => { const [r, c] = k.split(":"); return (r === "world" ? g.region === "world" : regionWithin(g.region, r)) && (!c || g.countries.includes(c)); });
  return (
    <div style={sheetGrid}>
      <SheetCard title="Who wore what, where and when" wide>
        <WorldTimeMatrix />
        <p style={{ ...sheetSmall, margin: 0 }}>Find by any mix of tags: <code>findGarments("region:eastern-asia year:1700 worn:women")</code>, <code>findOutfits("era:victorian")</code>. Regions follow the UN M49 tree, so a region finds everything inside it.</p>
      </SheetCard>
      <SheetCard title="Outfits" wide>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>{OUTFITS.map(o => <OutfitCard key={o.id} o={o} />)}</div>
      </SheetCard>
      {groups.map(([title, keys]) => (
        <SheetCard key={title} title={title} wide>
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))" }}>{GARMENTS.filter(g => inGroup(g, keys) && !(title !== "Japan" && g.countries.includes("JP") && keys[0] === "eastern-asia:JP")).filter((g, i, a) => a.findIndex(x => x.id === g.id) === i).map(g => <GarmentCard key={g.id} g={g} />)}</div>
        </SheetCard>
      ))}
      <SheetCard title="Sources" wide>
        <ul style={{ ...sheetList, ...sheetSmall }}>{COSTUME_SOURCES.map(s => <li key={s.url}><a href={s.url}>{s.title}</a></li>)}</ul>
        <p style={{ ...sheetSmall, margin: 0 }}>The silhouettes are constructions on ANAT1's measured person for painting over, estimated from each garment's description; they are not patterns.</p>
      </SheetCard>
    </div>
  );
}
