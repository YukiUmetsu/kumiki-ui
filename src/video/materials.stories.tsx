import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { MATERIALS } from "../../registry/materials/materials-data";
import { MaterialBall, MaterialsSheet, WeatheringStrip } from "../../registry/materials/materials-react";
import { findMaterial, lightness, toHex, toStandardMaterial, weathered, wetMaterial } from "../../registry/materials/materials-physics";

const page = { display: "grid", gap: 16, alignContent: "start", padding: 24, minHeight: "100vh", background: "var(--km-surface-canvas, #f6f3f1)", color: "var(--km-text-primary, #242424)",
  font: "15px/1.5 var(--km-font-sans, system-ui, sans-serif)" } as const;
const label = { display: "grid", gap: 4, font: "600 13px var(--km-font-sans, system-ui, sans-serif)" } as const;
const field = { minHeight: 36, padding: "6px 8px", borderRadius: 7, border: "1px solid var(--km-border-strong, #797776)", background: "var(--km-surface-field, #fff)",
  color: "inherit", font: "14px var(--km-font-sans, system-ui, sans-serif)" } as const;
const row = { display: "flex", flexWrap: "wrap", gap: 12, alignItems: "end" } as const;

function SheetStory() {
  return <main style={page}><h1 style={{ margin: 0, font: "600 22px var(--km-font-sans, system-ui, sans-serif)" }}>Materials (MATL1)</h1><MaterialsSheet /></main>;
}

/** Pick a material, wet it and age it; read the parameters a renderer takes. */
function MaterialLab() {
  const [id, setId] = useState("copper"), [wet, setWet] = useState(0), [years, setYears] = useState(0), [env, setEnv] = useState("rural");
  const m = findMaterial(id)!, aged = m.weathering ? weathered(m.weathering, years, env) : undefined;
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
      </div>
      <div style={{ display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
        <MaterialBall material={base} albedo={w.albedo} roughness={w.roughness} metal={base.metal} size={220} />
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li>{m.name} ({m.grade}): {m.source}.</li>
          {aged ? <li>Aged {years} years: {aged.label}.</li> : null}
          <li>Base colour {params.color}, metalness {params.metalness}, roughness {params.roughness.toFixed(2)}{params.ior ? `, IOR ${params.ior}` : ""}; lightness L* {lightness(w.albedo).toFixed(0)}.</li>
          {m.look.map(t => <li key={t}>{t}</li>)}
        </ul>
      </div>
      {m.weathering ? <WeatheringStrip track={m.weathering} years={[0, .5, 1, 3, 10, 20, 30]} environment={m.weathering === "copper" ? env : undefined} /> : null}
      <code style={{ font: "13px ui-monospace, monospace" }}>{JSON.stringify(params)}</code>
      <span style={{ display: "inline-block", width: 40, height: 20, background: toHex(w.albedo) }} />
    </main>
  );
}

const meta = { title: "Video production/Art Foundations/Materials", id: "video-materials", component: SheetStory, parameters: { layout: "fullscreen" } } satisfies Meta<typeof SheetStory>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Sheet: Story = { render: () => <SheetStory /> };
export const Lab: Story = { name: "Material lab", render: () => <MaterialLab /> };
