/**
 * FOOD1 React pieces: `FoodView` (a cooked dish rendered from the cooking physics, in a worker, cached), `Steam` (steam
 * rising from hot food: a buoyant plume about 0.4 m/s that curls and thins within centimetres), `FoodSheet` (the
 * temperatures, doneness, gloss and dishes), and the storybook still lifes: `FoodStillLifeView` (one library food),
 * `FoodLibrary` (all 200, filtered), `FoodStyleGuide` and `FoodMoodStudy`.
 */
import { forwardRef, useEffect, useRef, useState } from "react";
import type { CanvasHTMLAttributes, CSSProperties, ReactNode } from "react";
import { RenderFrame } from "../anatomy/foundation-render-react";
import { SheetCard, sheetGrid, sheetList, sheetSmall } from "../anatomy/foundation-react";
import { fbm } from "../anatomy/foundation-raster";
import { COOKING_TEMPERATURES, DISHES, DONENESS, FOOD_GLOSS, STEAM } from "./food-data";
import type { FoodRenderOptions } from "./food-render";
import { FOOD_RENDER_POOL } from "./food-render-pool";
import { ERA_LABEL, FOOD_LIBRARY, GROUP_LABEL, REGION_LABEL, foodEntry } from "./food-library";
import type { FoodEntry, FoodEra, FoodGroup, FoodRegion, FoodState } from "./food-library";
import { MOODS } from "./food-stage";
import type { MoodId } from "./food-stage";
import { MFP } from "./food-surfaces";

export interface FoodViewProps extends Omit<CanvasHTMLAttributes<HTMLCanvasElement>, "width" | "height"> { options: FoodRenderOptions; label: string; onCaption?: (caption: string) => void }
/** A dish cooked by the physics and rendered (`renderFood`), in a worker, cached. */
export const FoodView = forwardRef<HTMLCanvasElement, FoodViewProps>(function FoodView({ options, label, onCaption, ...rest }, ref) {
  const W = options.width ?? 420, H = options.height ?? 300;
  return <RenderFrame ref={ref} width={W} height={H} label={label} placeholder="var(--km-surface-subtle, #3a3631)"
    job={{ pool: FOOD_RENDER_POOL, kind: "food", args: options }} onResult={onCaption ? r => onCaption(String(r.meta?.caption ?? "")) : undefined} {...rest} />;
});

export interface SteamProps { width?: number; height?: number; /** How hot (°C): steam shows from about 70 °C and thickens toward boiling. */ temperature?: number; /** A draught bending the plume, −1 … 1. */ draught?: number; label?: string }
/**
 * Steam over a bowl: puffs leave the surface invisible, whiten a centimetre or two up as the vapour condenses, rise
 * about 0.4 m/s (here 10 cm of bowl is about 140 px), curl with the air and thin out within about 15 cm. Reduced
 * motion: one still frame.
 */
export function Steam({ width = 320, height = 300, temperature = 90, draught = 0.15, label = "Steam rising from a hot bowl" }: SteamProps) {
  const canvas = useRef<HTMLCanvasElement>(null), [reduce] = useState(() => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    const pxPerM = 1400, rise = STEAM.riseSpeed.typical * pxPerM, fade = STEAM.fadeHeight.typical * pxPerM, rim = height * 0.72, strength = Math.max(0, Math.min(1, (temperature - 65) / 30));
    type P = { x: number; y: number; age: number; r: number; seed: number };
    const ps: P[] = [];
    let raf = 0, last = 0, t = 0, rngS = 7;
    const rnd = () => { rngS = (rngS * 16807) % 2147483647; return rngS / 2147483647; };
    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "#16181b"; ctx.fillRect(0, 0, width, height);
      // the bowl: a dark ceramic ellipse with soup, lit from behind (steam shows best backlit against the dark)
      const g = ctx.createRadialGradient(width * 0.5, height * 0.15, 10, width * 0.5, height * 0.4, width * 0.8); g.addColorStop(0, "rgba(255,240,215,0.18)"); g.addColorStop(1, "rgba(0,0,0,0)"); ctx.fillStyle = g; ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "#2a2d31"; ctx.beginPath(); ctx.ellipse(width / 2, rim + 20, width * 0.38, 46, 0, 0, Math.PI); ctx.fill();
      ctx.fillStyle = "#8a5a2c"; ctx.beginPath(); ctx.ellipse(width / 2, rim, width * 0.36, 16, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#3b3f44"; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(width / 2, rim, width * 0.37, 18, 0, 0, Math.PI * 2); ctx.stroke();
      for (const p of ps) {
        const h = rim - p.y, appear = Math.min(1, h / 18), thin = Math.exp(-h / fade), a = 0.055 * strength * appear * thin;
        if (a < 0.003) continue;
        const gr = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r); gr.addColorStop(0, `rgba(235,238,242,${a})`); gr.addColorStop(1, "rgba(235,238,242,0)");
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      }
    };
    const step = (dt: number) => {
      t += dt;
      for (let k = 0; k < 3 * strength + 1; k++) ps.push({ x: width / 2 + (rnd() - 0.5) * width * 0.55, y: rim - 2, age: 0, r: 14 + rnd() * 10, seed: rnd() * 100 });
      for (const p of ps) {
        // buoyant rise, slowing as the puff mixes; curls from a moving noise field; the draught leans it
        const h = rim - p.y, slow = 1 / (1 + h / (fade * 1.5));
        p.y -= rise * slow * dt;
        p.x += (fbm(3, p.x / 60, (p.y + t * rise) / 60, 2) * 40 + draught * 60 * (h / fade)) * dt;
        p.r += 26 * dt; p.age += dt;
      }
      for (let i = ps.length - 1; i >= 0; i--) if (rim - ps[i].y > fade * 4 || ps[i].y < -40) ps.splice(i, 1);
    };
    if (reduce) { for (let k = 0; k < 160; k++) step(1 / 30); draw(); return; }
    const tick = (now: number) => { const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60; last = now; step(dt); draw(); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [width, height, temperature, draught, reduce]);
  return <canvas ref={canvas} width={width} height={height} role="img" aria-label={label} style={{ display: "block", maxWidth: "100%", borderRadius: 6 }} />;
}

/** The temperatures, doneness, gloss and dishes. */
export function FoodSheet() {
  const T = COOKING_TEMPERATURES;
  return (
    <div style={sheetGrid}>
      <SheetCard title="Where food changes (°C)">
        <ul style={{ ...sheetList, ...sheetSmall }}>{Object.entries(T).map(([k, v]) => <li key={k}><b>{k.replace(/([A-Z])/g, " $1").toLowerCase()}</b>: {v.min === v.max ? v.typical : `${v.min}–${v.max}`} °C — {v.source}</li>)}</ul>
      </SheetCard>
      <SheetCard title="Beef doneness (core after resting)">
        <ul style={{ ...sheetList, ...sheetSmall, listStyle: "none", paddingLeft: 0 }}>{DONENESS.map(d => <li key={d.id} style={{ display: "flex", gap: 8, alignItems: "center" }}><span aria-hidden="true" style={{ width: 22, height: 16, borderRadius: 3, background: d.colour, flex: "none" }} /><span><b>{d.label}</b> {d.core.min}–{d.core.max} °C: {d.look}</span></li>)}</ul>
      </SheetCard>
      <SheetCard title="Gloss">
        <ul style={{ ...sheetList, ...sheetSmall }}>{FOOD_GLOSS.map(g => <li key={g.what}><b>{g.what}</b>: roughness {g.roughness.min}–{g.roughness.max}. {g.note}</li>)}</ul>
      </SheetCard>
      <SheetCard title="Steam">
        <ul style={{ ...sheetList, ...sheetSmall }}>{STEAM.notes.map(n => <li key={n}>{n}</li>)}</ul>
      </SheetCard>
      {DISHES.map(d => <SheetCard key={d.id} title={`${d.label}${d.ja ? ` (${d.ja})` : ""}`}><span style={sheetSmall}>{d.size}</span><ul style={{ ...sheetList, ...sheetSmall }}>{d.look.map(l => <li key={l}>{l}</li>)}</ul></SheetCard>)}
    </div>
  );
}

// ---- Storybook still lifes (the 200-food library) ------------------------------------------------------------------------

export interface FoodStillLifeViewProps extends Omit<CanvasHTMLAttributes<HTMLCanvasElement>, "width" | "height"> {
  /** A `FOOD_LIBRARY` id. */
  id: string;
  mood?: MoodId; seed?: number; zoom?: number; elevation?: number;
  /** Output size, px (default 480 × 360) and samples per pixel along each axis (default 2). */
  width?: number; height?: number; supersample?: number;
  label?: string;
}
/** One library food as a storybook still life (`renderFoodStillLife`), rendered in a worker with a quick preview, cached. */
export const FoodStillLifeView = forwardRef<HTMLCanvasElement, FoodStillLifeViewProps>(function FoodStillLifeView({ id, mood, seed, zoom, elevation, width = 480, height = 360, supersample = 2, label, ...rest }, ref) {
  const e = foodEntry(id), args = { id, mood, seed, zoom, elevation };
  return <RenderFrame ref={ref} width={width} height={height} label={label ?? (e ? `${e.name}: ${e.look}` : id)} placeholder="var(--km-surface-subtle, #3a3631)"
    job={{ pool: FOOD_RENDER_POOL, kind: "still-life", args: { ...args, width, height, supersample } }}
    preview={{ pool: FOOD_RENDER_POOL, kind: "still-life", args: { ...args, width: Math.round(width / 3), height: Math.round(height / 3), supersample: 1 }, persist: false }} {...rest} />;
});

const field: CSSProperties = { display: "grid", gap: 4, font: "600 13px/1.3 var(--km-font-sans, system-ui, sans-serif)", color: "var(--km-text-primary, #242424)", minWidth: 0 };
const control: CSSProperties = { font: "14px/1.3 var(--km-font-sans, system-ui, sans-serif)", padding: "6px 8px", borderRadius: "var(--km-radius-md, 6px)", border: "1px solid var(--km-border-strong, #8a8580)", background: "var(--km-surface-default, #fff)", color: "inherit", minWidth: 0 };
const chip: CSSProperties = { display: "inline-block", padding: "1px 8px", borderRadius: 999, border: "1px solid var(--km-border-subtle, #cecac8)", font: "12px/1.6 var(--km-font-sans, system-ui, sans-serif)", color: "var(--km-text-muted, #4e4d4d)", whiteSpace: "nowrap" };
const MOOD_IDS = Object.keys(MOODS) as MoodId[];

type Filter = { q: string; group: FoodGroup | ""; region: FoodRegion | ""; state: FoodState | ""; era: FoodEra | "" };
const matches = (e: FoodEntry, f: Filter) => (!f.group || e.group === f.group) && (!f.region || e.region === f.region) && (!f.state || e.state === f.state) && (!f.era || e.era === f.era)
  && (!f.q || `${e.name} ${e.origin} ${e.look}`.toLowerCase().includes(f.q.trim().toLowerCase()));

/**
 * The storybook food library: every food in `FOOD_LIBRARY` as a still life, filtered by group, region, raw or cooked
 * state, era and words; choosing one opens it large with its light moods and the tells that make it read.
 */
export function FoodLibrary({ initial = "sourdough-boule" }: { initial?: string }) {
  const [f, setF] = useState<Filter>({ q: "", group: "", region: "", state: "", era: "" });
  const [sel, setSel] = useState(initial), [mood, setMood] = useState<MoodId | "">("");
  const list = FOOD_LIBRARY.filter(e => matches(e, f)), cur = foodEntry(sel) ?? FOOD_LIBRARY[0];
  const set = <K extends keyof Filter>(k: K) => (v: Filter[K]) => setF(p => ({ ...p, [k]: v }));
  const select = (label: string, value: string, onChange: (v: string) => void, options: readonly (readonly [string, string])[]) => (
    <label style={field}>{label}<select style={control} value={value} onChange={ev => onChange(ev.target.value)}><option value="">All</option>{options.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></label>
  );
  return (
    <div style={{ display: "grid", gap: "var(--km-space-3, 24px)", color: "var(--km-text-primary, #242424)", font: "14px/1.5 var(--km-font-sans, system-ui, sans-serif)" }}>
      <section aria-label={`${cur.name}, large`} style={{ display: "grid", gap: "var(--km-space-2, 16px)", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))", alignItems: "start" }}>
        <FoodStillLifeView id={cur.id} mood={mood || undefined} width={720} height={540} />
        <div style={{ display: "grid", gap: 10, alignContent: "start", minWidth: 0 }}>
          <h3 style={{ margin: 0, font: "600 22px/1.25 var(--km-font-serif, Georgia, serif)" }}>{cur.name}</h3>
          <p style={{ margin: 0 }}>{cur.look}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {[REGION_LABEL[cur.region], cur.origin, ERA_LABEL[cur.era], cur.state, GROUP_LABEL[cur.group], `${cur.vessel.replace(/-/g, " ")} on ${cur.table}`].map(t => <span key={t} style={chip}>{t}</span>)}
          </div>
          <fieldset style={{ border: 0, padding: 0, margin: 0, display: "grid", gap: 6 }}>
            <legend style={{ font: "600 13px/1.3 var(--km-font-sans, system-ui, sans-serif)", marginBottom: 4 }}>Light</legend>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {(["", ...MOOD_IDS] as const).map(m => (
                <label key={m || "own"} style={{ ...chip, cursor: "pointer", color: "inherit", background: mood === m ? "var(--km-surface-subtle, #efe9e0)" : "transparent" }}>
                  <input type="radio" name="food-mood" value={m} checked={mood === m} onChange={() => setMood(m)} style={{ marginRight: 6 }} />{m ? MOODS[m].label : `Its own (${MOODS[cur.mood].label.toLowerCase()})`}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      </section>
      <section aria-label="Filter the library" style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 170px), 1fr))", alignItems: "end" }}>
        <label style={field}>Search<input style={control} type="search" value={f.q} placeholder="glaze, Lisbon, steam…" onChange={ev => set("q")(ev.target.value)} /></label>
        {select("Group", f.group, v => set("group")(v as FoodGroup | ""), Object.entries(GROUP_LABEL))}
        {select("Region", f.region, v => set("region")(v as FoodRegion | ""), Object.entries(REGION_LABEL))}
        {select("Raw or cooked", f.state, v => set("state")(v as FoodState | ""), (["raw", "cooked", "baked", "fermented", "preserved", "prepared"] as const).map(s => [s, s[0].toUpperCase() + s.slice(1)] as const))}
        {select("Era", f.era, v => set("era")(v as FoodEra | ""), Object.entries(ERA_LABEL))}
      </section>
      <p role="status" style={{ margin: 0, ...sheetSmall }}>{list.length} of {FOOD_LIBRARY.length} foods{list.length ? "" : ": nothing matches these filters; clear one to see more."}</p>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 210px), 1fr))" }}>
        {list.map(e => (
          <li key={e.id} style={{ minWidth: 0 }}>
            <button type="button" aria-pressed={e.id === cur.id} onClick={() => { setSel(e.id); setMood(""); }}
              style={{ all: "unset", boxSizing: "border-box", display: "grid", gap: 6, width: "100%", cursor: "pointer", padding: 6, borderRadius: "var(--km-radius-lg, 10px)", border: `2px solid ${e.id === cur.id ? "var(--km-accent, #b4532a)" : "transparent"}`, outlineOffset: 2 }}>
              <FoodStillLifeView id={e.id} width={300} height={225} label={e.name} />
              <span style={{ font: "600 14px/1.3 var(--km-font-sans, system-ui, sans-serif)" }}>{e.name}</span>
              <span style={{ ...sheetSmall, overflowWrap: "anywhere" }}>{REGION_LABEL[e.region]} · {e.state} · {ERA_LABEL[e.era].toLowerCase()}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** One principle of the storybook style, shown on live renders. */
function Principle({ title, children, ids, zoom }: { title: string; children: ReactNode; ids: readonly string[]; zoom?: number }) {
  return (
    <section style={{ display: "grid", gap: 12 }}>
      <h3 style={{ margin: 0, font: "600 19px/1.3 var(--km-font-serif, Georgia, serif)" }}>{title}</h3>
      <div style={{ ...sheetSmall, color: "var(--km-text-primary, #242424)", maxWidth: "72ch" }}>{children}</div>
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 240px), 1fr))" }}>
        {ids.map(id => { const e = foodEntry(id); return e ? <figure key={id} style={{ margin: 0, display: "grid", gap: 4 }}><FoodStillLifeView id={id} zoom={zoom} width={360} height={270} /><figcaption style={sheetSmall}><b>{e.name}.</b> {e.look}</figcaption></figure> : null; })}
      </div>
    </section>
  );
}

/**
 * The storybook-realism style guide: the textures, light, colour, composition and construction rules every food in the
 * library follows, each shown on live renders, and the measured light-transport values behind them.
 */
export function FoodStyleGuide() {
  const mfp = (k: keyof typeof MFP) => MFP[k].map(v => v.toFixed(1)).join(" / ");
  return (
    <div style={{ display: "grid", gap: "var(--km-space-4, 32px)", color: "var(--km-text-primary, #242424)", font: "14px/1.55 var(--km-font-sans, system-ui, sans-serif)" }}>
      <Principle title="1. Texture is earned up close" ids={["sourdough-slice", "french-onion", "sea-salt", "roast-chicken", "short-ribs", "truffles"]} zoom={1.9}>
        <ul style={sheetList}>
          <li><b>Crumb and crust</b>: irregular alveoli with glossy walls, a crust browned unevenly by Maillard (raised parts and edges first), blisters from a cold proof, flour packed into the scores.</li>
          <li><b>Melted cheese</b>: golden all over, scorched only on the tallest blisters, rendered fat glistening in micro-droplets.</li>
          <li><b>Salt and sugar</b>: faceted crystals with sharp glints that glow where the backlight passes through.</li>
          <li><b>Glazes</b>: a clear coat over a darker base, pooling in hollows; cocoa and flour as velvet (a grazing sheen, no gloss).</li>
          <li><b>Roast skin</b>: tight micro-blisters, golden to mahogany by heat exposure, pores where the feathers were.</li>
        </ul>
      </Principle>
      <Principle title="2. Light from behind, filled from the front" ids={["green-grapes", "honey", "pho", "red-apple"]}>
        <p style={{ margin: 0 }}>A low warm sun behind the food (food photographers' backlight) makes rims glow and steam show; a white card in front keeps the food from becoming a silhouette; a dim room lets the far table fall into warm haze. Shadows soften with distance from the object (the sun has a size), and contact occlusion grounds every piece.</p>
        <p style={{ margin: "8px 0 0" }}>Light under the skin spreads by each colour's measured mean free path (Jensen et al. 2001; mm, red / green / blue): apple {mfp("apple")}, whole milk {mfp("wholemilk")}, cream {mfp("cream")}, potato {mfp("potato")}, chicken {mfp("chicken")}, ketchup {mfp("ketchup")}.</p>
      </Principle>
      <Principle title="3. Raw against cooked" ids={["ribeye-raw", "steak-sliced", "salmon-fillet-raw", "seared-salmon"]}>
        <p style={{ margin: 0 }}>Raw food is wet, translucent and cool-toned; cooked food is opaque where the protein set, browned where it was hot and dry. The cut steak's colour comes from the cooking physics (`cookSteak`): crust, grey band, then pink to the centre for the sear time given.</p>
      </Principle>
      <Principle title="4. Every region, every era" ids={["injera", "tonkotsu-ramen", "tacos-al-pastor", "baklava", "pastel-de-nata", "figs"]}>
        <p style={{ margin: 0 }}>Ancient earthenware (porous terracotta, grog flecks), traditional wares (celadon, lacquer, blue-and-white porcelain, banana leaf), vintage enamel (black steel at the chips) and modern minimal stoneware. Each food is served the way its own cooks serve it.</p>
      </Principle>
      <Principle title="5. Construction before shading" ids={["pomegranate", "croissant", "pizza-margherita", "watermelon"]}>
        <p style={{ margin: 0 }}>Every shape is a measured silhouette (a lathe for anything round, a sweep for anything long, an extruded footprint for slabs and slices) with natural asymmetry, bruises and rough knife cuts from a seed. Textures are solid (cut from a 3D block), so they never stretch, and every value is deterministic for frame-exact replication.</p>
      </Principle>
      <SheetCard title="Light moods">
        <ul style={{ ...sheetList, ...sheetSmall }}>{MOOD_IDS.map(m => <li key={m}><b>{MOODS[m].label}</b>: sun from {MOODS[m].sun.azimuth}° at {MOODS[m].sun.elevation}°, {MOODS[m].sun.size}° wide; {MOODS[m].pool ? `a pool of light ${MOODS[m].pool} mm across` : "even light"}.</li>)}</ul>
      </SheetCard>
    </div>
  );
}

/** One food under every light mood. */
export function FoodMoodStudy({ id = "sourdough-boule" }: { id?: string }) {
  return (
    <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))" }}>
      {MOOD_IDS.map(m => <figure key={m} style={{ margin: 0, display: "grid", gap: 4 }}><FoodStillLifeView id={id} mood={m} width={400} height={300} /><figcaption style={sheetSmall}>{MOODS[m].label}</figcaption></figure>)}
    </div>
  );
}
