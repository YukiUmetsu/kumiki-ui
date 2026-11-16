import { useEffect, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { CLOUD_GENERA } from "../../registry/nature/sky-data";
import type { CloudGenus } from "../../registry/nature/sky-data";
import { CloudFigure, SkySheet, WeatherScene } from "../../registry/nature/sky-react";
import type { Precipitation, WeatherInput } from "../../registry/nature/sky-physics";
import { weatherState } from "../../registry/nature/sky-physics";

const page = { display: "grid", gap: 16, alignContent: "start", padding: 24, minHeight: "100vh", background: "var(--km-surface-canvas, #f6f3f1)", color: "var(--km-text-primary, #242424)",
  font: "15px/1.5 var(--km-font-sans, system-ui, sans-serif)" } as const;
const label = { display: "grid", gap: 4, font: "600 13px var(--km-font-sans, system-ui, sans-serif)" } as const;
const field = { minHeight: 36, padding: "6px 8px", borderRadius: 7, border: "1px solid var(--km-border-strong, #797776)", background: "var(--km-surface-field, #fff)",
  color: "inherit", font: "14px var(--km-font-sans, system-ui, sans-serif)" } as const;
const row = { display: "flex", flexWrap: "wrap", gap: 12, alignItems: "end" } as const;

function SheetStory() {
  return <main style={page}><h1 style={{ margin: 0, font: "600 22px var(--km-font-sans, system-ui, sans-serif)" }}>Sky and weather (SKY1)</h1><SkySheet /></main>;
}

/** Pick the weather and watch it: rain and snow at their real fall speeds and slants, fog by the Koschmieder contrast. */
function WeatherLab() {
  const [precipitation, setP] = useState<Precipitation>("rain");
  const [intensity, setI] = useState<"light" | "moderate" | "heavy" | "violent">("moderate");
  const [wind, setWind] = useState(4), [sun, setSun] = useState(30), [cover, setCover] = useState(.8);
  const [genus, setGenus] = useState<CloudGenus | "auto">("auto"), [thunder, setThunder] = useState(false), [obscurity, setObs] = useState<"" | "fog" | "mist" | "haze">("");
  const [play, setPlay] = useState(true), [t, setT] = useState(0);
  useEffect(() => {
    if (!play || typeof requestAnimationFrame === "undefined") return;
    let raf = 0; const t0 = performance.now();
    const tick = (now: number) => { setT((now - t0) / 1000); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [play]);
  const input: WeatherInput = { precipitation, intensity, wind, sunElevation: sun, cover, thunder, obscurity: obscurity || undefined, clouds: genus === "auto" ? undefined : [genus] };
  const st = weatherState(input);
  return (
    <main style={page}>
      <div style={row}>
        <label style={label}>Precipitation
          <select style={field} value={precipitation} onChange={e => setP(e.target.value as Precipitation)}>{["none", "drizzle", "rain", "snow", "hail"].map(p => <option key={p}>{p}</option>)}</select>
        </label>
        <label style={label}>Intensity
          <select style={field} value={intensity} onChange={e => setI(e.target.value as typeof intensity)}>{["light", "moderate", "heavy", "violent"].map(p => <option key={p}>{p}</option>)}</select>
        </label>
        <label style={label}>Wind (Beaufort {wind}, {st.beaufort.name})<input type="range" min={0} max={12} value={wind} onChange={e => setWind(+e.target.value)} /></label>
        <label style={label}>Sun {sun}° ({st.sky.phase.label})<input type="range" min={-20} max={70} value={sun} onChange={e => setSun(+e.target.value)} /></label>
        <label style={label}>Cover {Math.round(cover * 8)}/8<input type="range" min={0} max={1} step={.125} value={cover} onChange={e => setCover(+e.target.value)} /></label>
        <label style={label}>Clouds
          <select style={field} value={genus} onChange={e => setGenus(e.target.value as CloudGenus | "auto")}><option value="auto">auto</option>{(Object.keys(CLOUD_GENERA) as CloudGenus[]).map(g => <option key={g}>{g}</option>)}</select>
        </label>
        <label style={label}>Obscurity
          <select style={field} value={obscurity} onChange={e => setObs(e.target.value as typeof obscurity)}>{["", "haze", "mist", "fog"].map(p => <option key={p} value={p}>{p || "none"}</option>)}</select>
        </label>
        <label style={{ ...label, display: "flex", gap: 6, alignItems: "center" }}><input type="checkbox" checked={thunder} onChange={e => setThunder(e.target.checked)} /> Thunder</label>
        <button type="button" style={field} onClick={() => setPlay(p => !p)}>{play ? "Pause" : "Play"}</button>
      </div>
      <div style={{ maxWidth: 960 }}><WeatherScene weather={st} time={t} flashAge={thunder ? t % 4 : undefined} width={960} height={540} /></div>
      <ul style={{ margin: 0, paddingLeft: 18 }}>{st.notes.map(n => <li key={n}>{n}</li>)}<li>Slant {st.slant.toFixed(0)}° from the vertical; visibility {st.visibility.toFixed(2)} km.</li></ul>
    </main>
  );
}

function Genera() {
  return (
    <main style={page}>
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))" }}>
        {(Object.keys(CLOUD_GENERA) as CloudGenus[]).flatMap(g => [1, 2].map(seed => <figure key={g + seed} style={{ margin: 0 }}><CloudFigure genus={g} options={{ seed, species: seed === 2 ? "congestus" : "mediocris" }} height={180} /><figcaption>{g} · seed {seed}</figcaption></figure>))}
      </div>
      <h2 style={{ margin: 0, font: "600 17px var(--km-font-sans, system-ui, sans-serif)" }}>As decks in perspective (bases on one plane, rows converging on the horizon)</h2>
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 380px), 1fr))" }}>
        {(Object.keys(CLOUD_GENERA) as CloudGenus[]).map(g => <figure key={g} style={{ margin: 0 }}><WeatherScene weather={{ clouds: [g], cover: .6, sunElevation: 35 }} width={480} height={270} label={`${g} deck`} /><figcaption>{g}</figcaption></figure>)}
      </div>
    </main>
  );
}

/** Cumulus at size: species, the sun front, side and behind, and turrets over time (to compare with photographs). */
function CumulusStudy() {
  const cell = { margin: 0, display: "grid", gap: 4 } as const;
  return (
    <main style={page}>
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 420px), 1fr))" }}>
        {([["Mediocris, sun behind the viewer (30°)", { species: "mediocris", sunAzimuth: 30, seed: 3 }], ["Mediocris, sun to the side (90°)", { species: "mediocris", sunAzimuth: 90, seed: 3 }],
          ["Mediocris, backlit (160°): the silver lining", { species: "mediocris", sunAzimuth: 160, seed: 3 }], ["Congestus, sun 60°", { species: "congestus", sunAzimuth: 60, seed: 2 }],
          ["Humilis, sun 45°", { species: "humilis", sunAzimuth: 45, seed: 5 }], ["Congestus, sun from the right", { species: "congestus", sunAzimuth: 70, seed: 7, sun: 1 }]] as const).map(([t, o]) => (
          <figure key={t} style={cell}><CloudFigure genus="cumulus" options={o} height={320} label={t} /><figcaption>{t}</figcaption></figure>
        ))}
      </div>
      <h2 style={{ margin: 0, font: "600 17px var(--km-font-sans, system-ui, sans-serif)" }}>Turrets over time (congestus; 2 minutes apart)</h2>
      <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))" }}>
        {[0, 120, 240, 360].map(t => <figure key={t} style={cell}><CloudFigure genus="cumulus" options={{ species: "congestus", sunAzimuth: 60, seed: 2, time: t }} height={220} /><figcaption>{t / 60} min</figcaption></figure>)}
      </div>
    </main>
  );
}

const meta = { title: "Video production/Art Foundations/Sky and Weather", id: "video-sky-weather", component: SheetStory, parameters: { layout: "fullscreen" } } satisfies Meta<typeof SheetStory>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Sheet: Story = { render: () => <SheetStory /> };
export const Lab: Story = { name: "Weather lab", render: () => <WeatherLab /> };
export const Clouds: Story = { name: "Cloud genera", render: () => <Genera /> };
export const Cumulus: Story = { name: "Cumulus study", render: () => <CumulusStudy /> };
