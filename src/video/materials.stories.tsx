import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { MATERIALS } from "../../registry/materials/materials-data";
import { MaterialStudy, MaterialsSheet, WeatheringStrip } from "../../registry/materials/materials-react";
import type { SheetLook } from "../../registry/materials/materials-react";
import { findMaterial, lightness, toHex, toStandardMaterial, weathered, wetMaterial } from "../../registry/materials/materials-physics";
import { TEXTURE_CALIBRATION, textureStats } from "../../registry/materials/materials-texture";

const page = { display: "grid", gap: 16, alignContent: "start", padding: 24, minHeight: "100vh", background: "var(--km-surface-canvas, #f6f3f1)", color: "var(--km-text-primary, #242424)",
  font: "15px/1.5 var(--km-font-sans, system-ui, sans-serif)" } as const;
const label = { display: "grid", gap: 4, font: "600 13px var(--km-font-sans, system-ui, sans-serif)" } as const;
const field = { minHeight: 36, padding: "6px 8px", borderRadius: 7, border: "1px solid var(--km-border-strong, #797776)", background: "var(--km-surface-field, #fff)",
  color: "inherit", font: "14px var(--km-font-sans, system-ui, sans-serif)" } as const;
const row = { display: "flex", flexWrap: "wrap", gap: 12, alignItems: "end" } as const;
const cell = { padding: "4px 8px", borderBottom: "1px solid var(--km-border-subtle, #e2deda)", textAlign: "left", verticalAlign: "top" } as const;

function SheetStory() {
  const [look, setLook] = useState<SheetLook>("rendered");
  return (
    <main style={page}>
      <div style={row}>
        <h1 style={{ margin: 0, font: "600 22px var(--km-font-sans, system-ui, sans-serif)" }}>Materials (MATL1)</h1>
        <label style={label}>Look<select style={field} value={look} onChange={e => setLook(e.target.value as SheetLook)}><option value="rendered">Rendered textures</option><option value="flat">Flat balls (instant)</option></select></label>
      </div>
      <MaterialsSheet look={look} />
    </main>
  );
}

/** Pick a material; see it as a ball and a tile at its real scale; wet it, age it, move the light; read the parameters a renderer takes. */
function MaterialLab() {
  const [id, setId] = useState("wood-weathered"), [wet, setWet] = useState(0), [years, setYears] = useState(0), [env, setEnv] = useState("rural");
  const [az, setAz] = useState(135), [el, setEl] = useState(24), [seed, setSeed] = useState(7);
  const m = findMaterial(id)!, aged = m.weathering && years > 0 ? weathered(m.weathering, years, env) : undefined;
  const base = aged ? { ...m, albedo: aged.albedo, metal: aged.metal, roughness: { ...m.roughness, typical: aged.roughness } } : m;
  const w = wetMaterial(base, wet), params = toStandardMaterial({ ...base, albedo: w.albedo, roughness: { ...base.roughness, typical: w.roughness } });
  return (
    <main style={page}>
      <div style={row}>
        <label style={label}>Material
          <select style={field} value={id} onChange={e => { setId(e.target.value); setYears(0); }}>{MATERIALS.map(x => <option key={x.id} value={x.id}>{x.name}{x.ja ? ` ${x.ja}` : ""}</option>)}</select>
        </label>
        <label style={label}>Wet {Math.round(wet * 100)}%<input type="range" min={0} max={1} step={.05} value={wet} onChange={e => setWet(+e.target.value)} /></label>
        {m.weathering ? <label style={label}>Age {years} years<input type="range" min={0} max={40} step={.25} value={years} onChange={e => setYears(+e.target.value)} /></label> : null}
        {m.weathering === "copper" ? <label style={label}>Air<select style={field} value={env} onChange={e => setEnv(e.target.value)}>{["marine", "industrial", "rural"].map(x => <option key={x}>{x}</option>)}</select></label> : null}
        <label style={label}>Light from {az}°<input type="range" min={0} max={360} step={15} value={az} onChange={e => setAz(+e.target.value)} /></label>
        <label style={label}>Light height {el}°<input type="range" min={6} max={80} step={2} value={el} onChange={e => setEl(+e.target.value)} /></label>
        <label style={label}>Piece<input style={{ ...field, width: 72 }} type="number" min={1} max={99} value={seed} onChange={e => setSeed(Math.max(1, Math.min(99, +e.target.value || 1)))} /></label>
      </div>
      <div style={{ maxWidth: 760 }}><MaterialStudy id={id} size={340} wet={wet} record={aged ? base : undefined} seed={seed} lightAzimuth={az} lightElevation={el} /></div>
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        <li>{m.name} ({m.grade}): {m.source}.</li>
        {aged ? <li>Aged {years} years: {aged.label}.</li> : null}
        <li>Base colour {params.color}, metalness {params.metalness}, roughness {params.roughness.toFixed(2)}{params.ior ? `, IOR ${params.ior}` : ""}; lightness L* {lightness(w.albedo).toFixed(0)}.</li>
        {m.look.map(t => <li key={t}>{t}</li>)}
      </ul>
      {m.weathering ? <WeatheringStrip track={m.weathering} years={[0, .5, 1, 3, 10, 20, 30]} environment={m.weathering === "copper" ? env : undefined} /> : null}
      <code style={{ font: "13px ui-monospace, monospace" }}>{JSON.stringify(params)}</code>
      <span style={{ display: "inline-block", width: 40, height: 20, background: toHex(w.albedo) }} />
    </main>
  );
}

/** Measured against generated: tone spread of each calibrated texture beside the CC0 map it was calibrated to. */
function Calibration() {
  return (
    <main style={page}>
      <h1 style={{ margin: 0, font: "600 22px var(--km-font-sans, system-ui, sans-serif)" }}>Texture calibration</h1>
      <p style={{ margin: 0, maxWidth: 760 }}>Luminance at the 10th, 50th and 90th percentile over the mean, and how strongly the grain runs one way (structure-tensor coherence, 0 none, 1 all one way): measured from CC0 ambientCG colour maps and from the generated textures, each cell averaged over its area as a photograph's pixel is. Thatch is a trimmed (cut-end) roof; the map is a long-straw one, so its grain direction differs.</p>
      <div style={{ overflowX: "auto" }} tabIndex={0} aria-label="Measured and generated texture statistics">
        <table style={{ borderCollapse: "collapse", minWidth: 640, font: "13px/1.45 var(--km-font-sans, system-ui, sans-serif)" }}>
          <thead><tr><th style={cell}>Material</th><th style={cell}>Map</th><th style={cell}>Measured p10 / p50 / p90</th><th style={cell}>Generated</th><th style={cell}>Coherence measured · generated</th></tr></thead>
          <tbody>{Object.entries(TEXTURE_CALIBRATION).map(([mid, c]) => { const s = textureStats(mid, undefined, 64); return (
            <tr key={mid}><td style={cell}>{findMaterial(mid)?.name ?? mid}</td><td style={cell}>{c.map}</td><td style={cell}>{c.pct.map(v => v.toFixed(2)).join(" / ")}</td><td style={cell}>{s.pct.map(v => v.toFixed(2)).join(" / ")}</td><td style={cell}>{c.coherence.toFixed(2)} · {s.coherence.toFixed(2)}</td></tr>
          ); })}</tbody>
        </table>
      </div>
    </main>
  );
}

const meta = { title: "Video production/Art Foundations/Materials", id: "video-materials", component: SheetStory, parameters: { layout: "fullscreen" } } satisfies Meta<typeof SheetStory>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Sheet: Story = { render: () => <SheetStory /> };
export const Lab: Story = { name: "Material lab", render: () => <MaterialLab /> };
export const TextureCalibration: Story = { name: "Texture calibration", render: () => <Calibration /> };
