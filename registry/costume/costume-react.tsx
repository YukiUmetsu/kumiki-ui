/**
 * COSTUME1 React pieces: a garment or an outfit drawn as a construction on the scale person, a world-by-time matrix,
 * garment cards with their tags, and the reference sheet.
 */
import { useId } from "react";
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
  kente: "#d4a531", junihitoe: "#8e2f4a", sokutai: "#2b2a3a", hakama: "#7a7670", kamishimo: "#3f4a57", yukata: "#2f4f7a", furisode: "#b8324a", kimono: "#8fb0c4",
  kosode: "#6a4a3a", obi: "#c9a45a", cheongsam: "#9c2a33", crinoline: "#6f5a7e", bustle: "#4f6a5a", "robe-a-la-francaise": "#b9c7a5", "frock-coat": "#2c2c34",
  suit: "#3a3f4a", "zoot-suit": "#5a3d6a", kilt: "#3f5a46", dirndl: "#6b8a5a", lederhosen: "#6b4b30", sarafan: "#b03a32", sari: "#c0573a", lehenga: "#a3324a",
  poncho: "#9a5a3a", parka: "#8a7258", jeans: "#3a5a86", boubou: "#4a7aa0", agbada: "#6a5a8a", dashiki: "#c2803a", huipil: "#e8e0cc", deel: "#3a6a8a",
  haori: "#2e2b2c", hanbok: "#d98aa0", jeogori: "#e9c46a",
};
/** Obi, sashes and braces in a contrasting colour (estimated: a gold-ochre band reads on most grounds). */
const BAND = "#c9a45a";
/** Cords and ties: the obijime and goreum in a strong red, the haori-himo white, a tie dark (estimated). */
const CORDS: Record<string, string> = { haori: "#f2efe6", suit: "#2a2d3a", "frock-coat": "#2a2d3a", "zoot-suit": "#2a2d3a", kilt: "#c8c2b4", dirndl: "#f2efe6", corset: "#f2efe6", hakama: "#f2efe6", hanbok: "#7a2a4a", jeogori: "#7a2a4a" };
/** The lining colour that shows at kimono sleeve openings and hems (hakkake), and the layered edges of a jūnihitoe (estimated). */
const LINING: Record<string, string> = { junihitoe: "url(#kasane)" };
const hsl2hex = (h: number, s: number, l: number) => { const k = (n: number) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l), f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))); return `#${[f(0), f(8), f(4)].map(v => Math.round(v * 255).toString(16).padStart(2, "0")).join("")}`; };
const colourOf = (g: GarmentRecord) => COLOURS[g.id] ?? hsl2hex([...g.id].reduce((a, c) => a + c.charCodeAt(0), 0) % 360, .28, .46);
const mix = (a: string, b: string, t: number) => { const p = (h: string) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)), x = p(a), y = p(b); return `#${x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("")}`; };
const PERSON = smoothClosedPath(personOutline());

/** Woven and dyed patterns, in metres: a tartan sett, the fine stripes of hakama silk, kente's woven strips, scattered dyed motifs. */
function PatternDefs({ id, g, c }: { id: string; g: GarmentRecord; c: string }) {
  const k = garmentShape(g).pattern;
  if (k === "tartan") return (
    <pattern id={`${id}-pat`} patternUnits="userSpaceOnUse" width=".16" height=".16">
      <rect width=".16" height=".16" fill={c} />
      {[[0, .05, "#1f2c45", .55], [.09, .02, "#121417", .6], [.125, .006, "#b0303a", .9], [.03, .004, "#e8dcae", .7]].map(([o, w, col, op], i) => <g key={i} opacity={op as number}>
        <rect x={o as number} y={0} width={w as number} height=".16" fill={col as string} /><rect x={0} y={o as number} width=".16" height={w as number} fill={col as string} />
      </g>)}
    </pattern>);
  if (k === "stripes") return (
    <pattern id={`${id}-pat`} patternUnits="userSpaceOnUse" width=".014" height=".1"><rect width=".014" height=".1" fill={c} /><rect width=".0045" height=".1" fill={mix(c, "#000000", .55)} /><rect x=".008" width=".0015" height=".1" fill={mix(c, "#000000", .35)} /></pattern>);
  if (k === "kente") return (
    <pattern id={`${id}-pat`} patternUnits="userSpaceOnUse" width=".1" height=".12">
      <rect width=".1" height=".12" fill={c} />
      <rect x=".01" y=".005" width=".08" height=".035" fill="#2f6b3a" /><rect x=".02" y=".015" width=".06" height=".015" fill="#a8323a" />
      <rect x=".01" y=".065" width=".035" height=".045" fill="#1d1c1f" /><rect x=".055" y=".065" width=".035" height=".045" fill="#a8323a" />
      <rect x="0" width=".004" height=".12" fill="#1d1c1f" opacity=".6" />
    </pattern>);
  if (k === "scatter") {
    const flowers: [number, number, string, number][] = [[.04, .05, "#f3c6cf", .022], [.13, .12, "#f6f1e8", .018], [.07, .16, "#e8c86a", .014], [.16, .03, "#f3c6cf", .012]];
    return (
      <pattern id={`${id}-pat`} patternUnits="userSpaceOnUse" width=".2" height=".2">
        <rect width=".2" height=".2" fill={c} />
        {flowers.map(([x, y, col, r], i) => <g key={i}>{[0, 1, 2, 3, 4].map(p => <circle key={p} cx={x + Math.cos(p * 1.2566) * r * .55} cy={y + Math.sin(p * 1.2566) * r * .55} r={r * .5} fill={col} opacity=".9" />)}<circle cx={x} cy={y} r={r * .25} fill="#c9a45a" /></g>)}
        <path d="M.0 .1q.03 -.02 .06 0" stroke={mix(c, "#ffffff", .35)} strokeWidth=".003" fill="none" />
      </pattern>);
  }
  return null;
}

/**
 * One or more garments drawn in order on the scale person (front view, metres). Each is filled, patterned if its look
 * is a pattern, shaded round the body (light from the upper left), then folded:
 * - fold shadows and ridges from the fabric's stiffness (`costume-drape`);
 * - collars, linings, cords, buttons and pleats.
 */
export function CostumeFigure({ garments, label, height = 200 }: { garments: readonly GarmentRecord[]; label?: string; height?: number }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  return (
    <svg role="img" aria-label={label ?? garments.map(g => g.name).join(", ")} viewBox="-.85 -2.02 1.7 2.08" style={{ display: "block", width: "100%", height }} preserveAspectRatio="xMidYMax meet">
      <defs>
        <linearGradient id={`${uid}-form`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity=".26" /><stop offset=".2" stopColor="#000" stopOpacity=".05" /><stop offset=".4" stopColor="#fff" stopOpacity=".08" />
          <stop offset=".62" stopColor="#000" stopOpacity="0" /><stop offset=".86" stopColor="#000" stopOpacity=".14" /><stop offset="1" stopColor="#000" stopOpacity=".32" />
        </linearGradient>
        <linearGradient id="kasane" x1="0" x2="1"><stop offset="0" stopColor="#5a7a3a" /><stop offset=".25" stopColor="#c9a45a" /><stop offset=".5" stopColor="#c45a6a" /><stop offset=".75" stopColor="#f2efe6" /><stop offset="1" stopColor="#6a3a6a" /></linearGradient>
        {garments.map(g => <PatternDefs key={g.id} id={`${uid}-${g.id}`} g={g} c={colourOf(g)} />)}
      </defs>
      <g transform="scale(1 -1)">
        <path d={PERSON} fill={MUTED} opacity=".22" />
        {garments.map(g => {
          const s = garmentShape(g), c = colourOf(g), fill = s.pattern !== "none" ? `url(#${uid}-${g.id}-pat)` : c;
          const shade = mix(c, "#000000", .42), ridge = mix(c, "#ffffff", .4), edge = "#00000033";
          return (
            <g key={g.id}>
              <path d={s.legs} fill={fill} stroke={edge} strokeWidth={.006} />
              <path d={s.body} fill={fill} stroke={edge} strokeWidth={.006} />
              <path d={s.sleeves} fill={fill} stroke={edge} strokeWidth={.006} />
              <path d={s.body + s.sleeves + s.legs} fill={`url(#${uid}-form)`} />
              <path d={s.foldShadow} fill={shade} opacity=".38" />
              <path d={s.foldRidges} fill="none" stroke={ridge} strokeWidth={.0045} opacity=".55" strokeLinecap="round" />
              <path d={s.lining} fill={LINING[g.id] ?? "#b8323a"} />
              <path d={s.underCollar} fill="#f4f1ea" stroke={edge} strokeWidth={.003} />
              <path d={s.collar} fill={mix(c, "#000000", .18)} stroke={edge} strokeWidth={.004} />
              <path d={s.details} fill={c} stroke="#00000044" strokeWidth={.005} />
              {/* The drape lies over the body: lit a little more, and casting a soft shadow along its lower edge. */}
              <path d={s.drape} fill="none" stroke="#000000" strokeOpacity=".16" strokeWidth={.02} transform="translate(.004 -.008)" />
              <path d={s.drape} fill={s.pattern !== "none" ? fill : mix(c, "#ffffff", .1)} stroke={shade} strokeOpacity=".5" strokeWidth={.004} />
              <path d={s.drapeFolds} fill="none" stroke={shade} strokeWidth={.006} opacity=".45" strokeLinecap="round" />
              <path d={s.trim} fill="#f4f1ea" stroke="#00000044" strokeWidth={.005} />
              <path d={s.bands} fill={g.id === "obi" ? c : BAND} stroke="#00000044" strokeWidth={.005} />
              <path d={s.cords} fill={CORDS[g.id] ?? "#b8323a"} stroke="#00000033" strokeWidth={.002} />
              <path d={s.pleats} fill="none" stroke={shade} strokeWidth={.006} opacity=".75" />
              <path d={s.buttons} fill="#1d1c1f" />
              <path d={s.lines} fill="none" stroke="#00000055" strokeWidth={.005} />
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
